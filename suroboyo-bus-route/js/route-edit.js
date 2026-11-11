// Mode sunting rute (dipakai lab/tampilan): satu jalur dipilih, lalu sudutnya bisa diseret dan ruasnya digeser ke samping
// seperti mengatur flow chart. Saat diseret hanya bayangan putus-putus yang bergerak; begitu dilepas, bentuk baru dikirim lewat
// `commit(idJalur, legs)` dan peta dibangun ulang. Halte tidak pernah bergerak. Logika geometri ada di route-ops.js.
import { projector } from './geo.js';
import { toVertices, toLegs, slideClamped, slideFree, moveCorner, deleteCorner, insertPoint } from './route-ops.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SNAP_PX = 16; // jarak tempel sudut ke titik rapi (px layar)
const SEG_MIN_PX = 40; // ruas yang lebih pendek dari ini tidak diberi pegangan geser

const svgEl = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

export function createRouteEditor({ svg, viewport, state, commit, info }) {
  const layer = svgEl('g', { id: 'layer-edit' });
  viewport.append(layer);
  let enabled = false;
  let lineId = null;
  let k = 1;
  let handles = []; // { g, x, y, rot?, len? }
  let drag = null;
  let ctx = null;
  let V = [];
  let off = [];
  let others = []; // titik sudut dan halte semua jalur, untuk menempel sejajar
  const snap = { lock: false, octi: true, align: true, grid: true }; // lock: kunci ruas ke 45° (mati = bentuk bebas); sisanya snapping. Alt mematikan snapping selama menyeret

  const pt = svg.createSVGPoint();
  const toMap = (e) => {
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(viewport.getScreenCTM().inverse());
  };

  function layoutHandles() {
    for (const h of handles) {
      const s = (1 / k).toFixed(4);
      h.g.setAttribute('transform', `translate(${h.x.toFixed(2)} ${h.y.toFixed(2)}) scale(${s})${h.rot === undefined ? '' : ` rotate(${h.rot.toFixed(1)})`}`);
      if (h.len !== undefined) h.g.style.display = h.len * k >= SEG_MIN_PX ? '' : 'none';
    }
  }

  // Titik sudut jalur digambar di jalurnya yang sebenarnya (sudah bergeser lajur), bukan di garis tengah.
  function disp(i) {
    return { x: V[i].x + off[i].x, y: V[i].y + off[i].y };
  }

  function draw() {
    layer.replaceChildren();
    handles = [];
    V = [];
    const { routes, net } = state();
    const route = routes.find((r) => r.id === lineId);
    // Rute dim: hanya jalur yang dipilih tampil penuh.
    svg.classList.toggle('route-editing', enabled);
    for (const p of svg.querySelectorAll('#layer-lines path.line')) p.classList.toggle('faded', enabled && p.dataset.id !== lineId);
    if (!enabled || !route) return;
    ctx = { scale: net.meta.scale };
    const project = projector(net.meta.origin, net.meta.scale);
    others = net.lines.flatMap((l) => l.legs.flat().map(([lat, lng]) => project(lat, lng)))
      .filter((p, i, all) => !all.slice(Math.max(0, i - 30), i).some((q) => Math.abs(q.x - p.x) < 0.3 && Math.abs(q.y - p.y) < 0.3));
    V = toVertices(route.line, project);
    off = V.map((p) => {
      let best = null;
      route.center.forEach((c, q) => {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (!best || d < best.d) best = { d, q };
      });
      return best && best.d < 2 ? { x: route.points[best.q].x - route.center[best.q].x, y: route.points[best.q].y - route.center[best.q].y } : { x: 0, y: 0 };
    });
    const color = route.line.color;
    // Batang geser di tengah tiap ruas.
    for (let i = 0; i < V.length - 1; i++) {
      const a = disp(i);
      const b = disp(i + 1);
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L < 1e-6) continue;
      const rot = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      const g = svgEl('g', { class: 'rh rh-seg', 'data-i': i });
      g.append(svgEl('rect', { x: -14, y: -9, width: 28, height: 18, rx: 9, class: 'rh-hit' }), svgEl('rect', { x: -9, y: -3, width: 18, height: 6, rx: 3, class: 'rh-bar', style: `--c:${color}` }));
      g.style.cursor = cursorFor(rot + 90);
      layer.append(g);
      handles.push({ g, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, rot, len: L });
    }
    // Sudut (bukan halte).
    V.forEach((p, i) => {
      if (p.stop !== undefined) return;
      const q = disp(i);
      const g = svgEl('g', { class: 'rh rh-corner', 'data-i': i });
      g.append(svgEl('circle', { r: 12, class: 'rh-hit' }), svgEl('circle', { r: 6, class: 'rh-dot', style: `--c:${color}` }));
      layer.append(g);
      handles.push({ g, x: q.x, y: q.y });
    });
    layoutHandles();
  }

  const cursorFor = (deg) => {
    const a = ((Math.round(deg / 45) * 45) % 180 + 180) % 180;
    return { 0: 'ew-resize', 45: 'nwse-resize', 90: 'ns-resize', 135: 'nesw-resize' }[a];
  };

  function preview(W, o, guides = []) {
    drag.ghost?.remove();
    drag.ghost = svgEl('g');
    // Garis bantu snapping (lurus atau 45° lewat titik yang dijadikan acuan), digeser lajur seperti jalurnya.
    for (const { P, u } of guides) {
      const R = 1e5;
      drag.ghost.append(svgEl('line', { class: 'rh-guide', x1: P.x + o.x - u.x * R, y1: P.y + o.y - u.y * R, x2: P.x + o.x + u.x * R, y2: P.y + o.y + u.y * R }));
    }
    drag.ghost.append(svgEl('polyline', { class: 'rh-preview', points: W.map((p) => `${(p.x + o.x).toFixed(2)},${(p.y + o.y).toFixed(2)}`).join(' ') }));
    layer.prepend(drag.ghost);
  }

  layer.addEventListener('pointerdown', (e) => {
    if (!enabled || e.button !== 0) return;
    const g = e.target.closest('.rh');
    if (!g) return;
    e.stopPropagation(); // jangan ikut menggeser peta
    e.preventDefault();
    let i = Number(g.dataset.i);
    g.setPointerCapture(e.pointerId);
    g.classList.add('drag');
    const start = toMap(e);
    let mode = g.classList.contains('rh-corner') ? 'corner' : 'seg';
    let W0 = V;
    let o = off[i];
    if (mode === 'seg' && !snap.lock) {
      if (e.shiftKey) mode = 'free'; // Shift: geser seluruh ruas ke arah mana pun
      else {
        // Bentuk bebas: tarik tekukan baru dari tengah ruas.
        mode = 'corner';
        o = { x: (off[i].x + off[i + 1].x) / 2, y: (off[i].y + off[i + 1].y) / 2 };
        W0 = insertPoint(V, i, { x: (V[i].x + V[i + 1].x) / 2, y: (V[i].y + V[i + 1].y) / 2 });
        i += 1;
      }
    }
    drag = { g, i, mode, pointerId: e.pointerId, start, V: W0, W: null, off: o };
    info(mode === 'corner' ? 'Drag the corner. Hold Alt to turn snapping off.' : mode === 'free' ? 'Move the whole segment anywhere.' : 'Drag the bar sideways to slide the segment (45° lock).');
  });

  layer.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = toMap(e);
    let W;
    const free = e.altKey; // Alt: semua snapping mati
    const out = {};
    const cut = (...idx) => others.filter((o) => !idx.some((j) => Math.hypot(drag.V[j].x - o.x, drag.V[j].y - o.y) < 0.5));
    if (drag.mode === 'corner') {
      const q = { x: p.x - drag.off.x, y: p.y - drag.off.y };
      W = moveCorner(drag.V, drag.i, q, ctx, { radius: free ? 0 : SNAP_PX / k, octi: snap.octi, align: snap.align, points: cut(drag.i), grid: snap.grid && !free, free: !snap.lock, out });
    } else if (drag.mode === 'free') {
      const step = snap.grid && !free ? 10 / ctx.scale : 0;
      const r = (v) => (step ? Math.round(v / step) * step : v);
      W = slideFree(drag.V, drag.i, { x: r(p.x - drag.start.x), y: r(p.y - drag.start.y) }, ctx);
    } else {
      const a = drag.V[drag.i];
      const b = drag.V[drag.i + 1];
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const t = ((p.x - drag.start.x) * -(b.y - a.y) + (p.y - drag.start.y) * (b.x - a.x)) / l;
      W = slideClamped(drag.V, drag.i, t, ctx, { radius: free ? 0 : SNAP_PX / k, align: snap.align, points: cut(drag.i, drag.i + 1), grid: snap.grid && !free, out });
    }
    if (!W) return; // posisi tidak valid: bayangan tetap di posisi valid terakhir
    drag.W = W;
    preview(W, drag.off, out.guides);
    const meters = Math.round(W.reduce((s, q, n) => s + (n ? Math.hypot(q.x - W[n - 1].x, q.y - W[n - 1].y) : 0), 0) * ctx.scale);
    info(`Line length ${meters.toLocaleString('en-US')} m`);
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    d.ghost?.remove();
    d.g.classList.remove('drag');
    d.g.releasePointerCapture?.(e.pointerId);
    if (!d.W) { info(''); return; }
    const { net, routes } = state();
    const line = routes.find((r) => r.id === lineId).line;
    commit(lineId, toLegs(d.W, net.meta.origin, net.meta.scale, line.legs.length));
  };
  layer.addEventListener('pointerup', end);
  layer.addEventListener('pointercancel', end);

  // Klik dua kali pada sudut: hapus sudut itu.
  layer.addEventListener('dblclick', (e) => {
    const g = e.target.closest('.rh-corner');
    if (!enabled || !g) return;
    e.stopPropagation();
    const W = deleteCorner(V, Number(g.dataset.i), ctx, { free: !snap.lock });
    if (!W) { info('This corner cannot be deleted'); return; }
    const { net, routes } = state();
    commit(lineId, toLegs(W, net.meta.origin, net.meta.scale, routes.find((r) => r.id === lineId).line.legs.length));
  });

  // Klik sebuah garis di peta untuk memilih jalur yang disunting.
  svg.addEventListener('click', (e) => {
    const path = e.target.closest?.('#layer-lines path.line');
    if (!enabled || !path || !path.dataset.id) return;
    api.setLine(path.dataset.id);
  });

  const api = {
    get enabled() { return enabled; },
    get line() { return lineId; },
    snap,
    setEnabled(on, firstLine) {
      enabled = on;
      if (on && !lineId) lineId = firstLine;
      if (!on) info('');
      draw();
    },
    setLine(id) {
      lineId = id;
      draw();
      state().onLine?.(id);
    },
    // Dipanggil setelah peta dibangun ulang (jalur dan lapisan baru) dan saat zoom berubah.
    refresh() {
      viewport.append(layer);
      draw();
    },
    setZoom(kk) {
      k = kk;
      layoutHandles();
    },
  };
  return api;
}
