const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeOut = (u) => 1 - (1 - u) ** 3;

export function createPanZoom(svg, viewport, { minK = 0.2, maxK = 5, onChange } = {}) {
  let x = 0;
  let y = 0;
  let k = 1;
  let tween = null;
  let touched = false;

  const apply = () => {
    viewport.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
    onChange?.(k);
  };
  const local = (e) => {
    const r = svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const zoomAt = (cx, cy, nk) => {
    nk = clamp(nk, minK, maxK);
    x = cx - (cx - x) * (nk / k);
    y = cy - (cy - y) * (nk / k);
    k = nk;
    apply();
  };

  function animateTo(target) {
    cancelAnimationFrame(tween);
    const from = { x, y, k };
    const start = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - start) / 220);
      const e = easeOut(u);
      x = from.x + (target.x - from.x) * e;
      y = from.y + (target.y - from.y) * e;
      k = from.k + (target.k - from.k) * e;
      apply();
      if (u < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  }

  function zoomBy(factor) {
    touched = true;
    const r = svg.getBoundingClientRect();
    const cx = r.width / 2;
    const cy = r.height / 2;
    const nk = clamp(k * factor, minK, maxK);
    animateTo({ k: nk, x: cx - (cx - x) * (nk / k), y: cy - (cy - y) * (nk / k) });
  }

  function fitTarget({ top = 40, right = 40, bottom = 40, left = 40 } = {}) {
    const r = svg.getBoundingClientRect();
    const b = viewport.getBBox();
    const w = r.width - left - right;
    const h = r.height - top - bottom;
    const nk = clamp(Math.min(w / b.width, h / b.height), minK, 1.6);
    return {
      k: nk,
      x: left + (w - b.width * nk) / 2 - b.x * nk,
      y: top + (h - b.height * nk) / 2 - b.y * nk,
    };
  }

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    touched = true;
    cancelAnimationFrame(tween);
    const p = local(e);
    zoomAt(p.x, p.y, k * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
  }, { passive: false });

  const pointers = new Map();
  let panning = false;
  let suppressClick = false;
  let pinch = null;

  svg.addEventListener('pointerdown', (e) => {
    touched = true;
    cancelAnimationFrame(tween);
    const p = local(e);
    pointers.set(e.pointerId, { ...p, startX: p.x, startY: p.y });
    if (pointers.size === 2) {
      svg.setPointerCapture(e.pointerId);
      panning = true;
      pinch = null;
    }
  });

  svg.addEventListener('pointermove', (e) => {
    const ptr = pointers.get(e.pointerId);
    if (!ptr) return;
    const p = local(e);
    const dx = p.x - ptr.x;
    const dy = p.y - ptr.y;
    ptr.x = p.x;
    ptr.y = p.y;

    if (pointers.size === 1) {
      if (!panning && Math.hypot(p.x - ptr.startX, p.y - ptr.startY) > 4) {
        panning = true;
        svg.setPointerCapture(e.pointerId);
        svg.classList.add('grabbing');
      }
      if (panning) {
        x += dx;
        y += dy;
        apply();
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (pinch) {
        x += c.x - pinch.c.x;
        y += c.y - pinch.c.y;
        zoomAt(c.x, c.y, k * (d / pinch.d));
      }
      pinch = { d, c };
    }
  });

  const end = (e) => {
    pointers.delete(e.pointerId);
    pinch = null;
    if (pointers.size === 0) {
      if (panning) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
      }
      panning = false;
      svg.classList.remove('grabbing');
    }
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  // Setelah drag, jangan anggap lepasnya jari sebagai klik (mis. menutup panel halte).
  svg.addEventListener('click', (e) => {
    if (suppressClick) e.stopPropagation();
  }, true);

  return {
    view: () => ({ x, y, k }),
    setView(v) { cancelAnimationFrame(tween); ({ x, y, k } = v); apply(); },
    zoomIn: () => zoomBy(1.4),
    zoomOut: () => zoomBy(1 / 1.4),
    get touched() {
      return touched;
    },
    fit(pad, { animate = true } = {}) {
      touched = false;
      const r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const target = fitTarget(pad);
      if (animate) animateTo(target);
      else {
        ({ x, y, k } = target);
        apply();
      }
    },
  };
}
