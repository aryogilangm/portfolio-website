import { MAP_BASE_ZOOM, LABEL_EVERY, style } from './scale.js';
import { outwardDir } from './labels.js';
import { lineColor, lineStop } from './theme.js';
import { layoutLabels, labelPlacement, defaultDir, wrapLabel } from './label-layout.js';

// Nama panjang dibagi dua baris (tspan), terpusat secara vertikal pada titik label.
function setLabelText(text, name) {
  const lines = wrapLabel(name);
  text.textContent = '';
  lines.forEach((line, i) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    t.setAttribute('x', 0);
    t.setAttribute('dy', i === 0 ? `${(-(lines.length - 1) * 0.55).toFixed(2)}em` : '1.1em');
    t.textContent = line;
    text.append(t);
  });
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

const LABEL = {
  e: { dx: 15, dy: 0, anchor: 'start' },
  w: { dx: -15, dy: 0, anchor: 'end' },
  n: { dx: 0, dy: -17, anchor: 'middle' },
  s: { dx: 0, dy: 17, anchor: 'middle' },
  ne: { dx: 11, dy: -13, anchor: 'start' },
  nw: { dx: -11, dy: -13, anchor: 'end' },
  se: { dx: 11, dy: 14, anchor: 'start' },
  sw: { dx: -11, dy: 14, anchor: 'end' },
};

// Tebal garis geografis dari gaya (px pada zoom dasar); `line.width` di data tetap menang.
const lineWidth = (r) => r.line.width ?? (r.line.type === 'wirawiri' ? style.wiraWidth : style.lineWidth);

export function renderMap(net, routes, stopToLines, positions, { lines: linesLayer, stops: stopsLayer }, { onSelectStop, onSelectLine }) {
  const geo = net.meta.projection === 'geo';
  const byId = new Map(routes.map((r) => [r.id, r]));

  // Rute yang lebih tipis digambar belakangan supaya tetap terlihat di atas koridor.
  const pathEls = new Map();
  for (const r of [...routes].sort((a, b) => b.width - a.width)) {
    const path = svgEl('path', {
      d: r.path,
      class: 'line',
      'data-id': r.id,
      fill: 'none',
      // Mode geografis: ukuran dirancang dalam piksel pada zoom dasar, jadi ikut membesar saat di-zoom.
      'stroke-width': geo ? lineWidth(r) / MAP_BASE_ZOOM : r.width,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    path.style.setProperty('--c', lineColor(r.line)); // warna garis dari variabel tema (css: .line { stroke: var(--c) })
    // Klik garis = cara kedua untuk menyorot koridornya (selain lewat legenda), sama seperti klik halte.
    if (onSelectLine) {
      path.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectLine(r.line.corridor ?? r.line.id);
      });
    }
    linesLayer.append(path);
    pathEls.set(r.id, path);
  }

  // Label tetap tampil untuk dua halte pertama, dua halte terakhir, dan tiap kelipatan LABEL_EVERY di tiap jalur (urutan 4, 8, ...).
  // Halte lain baru menampilkan namanya saat di-hover, difokus, atau dipilih.
  const permanent = new Set();
  for (const r of routes) {
    const n = r.stopIds.length;
    r.stopIds.forEach((id, i) => { if (i < 2 || i >= n - 2 || (i + 1) % LABEL_EVERY === 0) permanent.add(id); });
  }
  // Halte dengan `quietLabel: <id halte seberang>`: labelnya hanya tampil saat di-hover, dan label tetapnya dipindah ke halte seberang
  // yang bernama sama (mis. Terminal Benowo atas -> Terminal Benowo bawah).
  for (const [id, s] of Object.entries(net.stops)) {
    if (!s.quietLabel) continue;
    permanent.delete(id);
    if (net.stops[s.quietLabel]) permanent.add(s.quietLabel);
  }

  // Label di lapisan sendiri paling atas supaya label yang sedang di-hover tidak tertutup halte atau bus lain.
  const labelsLayer = svgEl('g', { id: 'layer-labels', 'pointer-events': 'none' });
  stopsLayer.parentNode.append(labelsLayer);

  const stopEls = new Map();
  const markers = [];
  const labelEls = [];
  for (const [id, lineIds] of stopToLines) {
    const s = net.stops[id];
    const { x, y } = positions.get(id);
    // Halte transit: dilayani koridor berbeda (bukan hanya dua arah koridor yang sama). Penandanya kapsul putih berbingkai
    // gelap yang menjembatani jalur-jalur yang berdampingan; halte biasa berupa cincin berwarna koridor.
    // Satu lajur per kemunculan: halte yang dilewati dua kali oleh jalur yang sama (pulang-pergi di cabang) punya dua lajur.
    const lanes = lineIds.flatMap((lid) => {
      const route = byId.get(lid);
      return route.stopIds.flatMap((sid, k) => (sid === id ? [{ route, idx: route.stopIdx[k] }] : []));
    });
    const transit = new Set(lineIds.map((l) => byId.get(l).line.corridor ?? byId.get(l).line.color)).size > 1;
    const interchange = lineIds.length > 1;
    const g = svgEl('g', {
      class: `stop${transit ? ' transit' : ''}`,
      'data-id': id,
      transform: `translate(${x} ${y})`,
      tabindex: 0,
      role: 'button',
      'aria-label': `${s.name}, ${lineIds.map((l) => byId.get(l).line.name).join(', ')}${transit ? ', halte transit' : ''}`,
    });
    const shape = svgEl('g', { class: 'stop-shape' });
    const hit = svgEl('rect', { class: 'stop-hit', fill: 'transparent' });
    const ring = svgEl('rect', { class: 'stop-ring', 'stroke-width': 3 });
    if (!transit) ring.style.setProperty('--c', lineStop(byId.get(lineIds[0]).line));
    // Halte transit: kapsul putih dengan satu lingkaran berwarna per jalur (urutan dan letaknya mengikuti lajur jalurnya).
    const body = svgEl('g', { class: 'stop-body' });
    body.append(ring);
    const dots = transit ? lanes.map((l) => { const d = svgEl('circle', { class: 'stop-dot' }); d.style.fill = lineStop(l.route.line); return d; }) : [];
    body.append(...dots);
    shape.append(hit, body);
    g.append(shape);
    // Mode geografis: halte di satu jalur diberi label di sisi terluar lajurnya; halte bersama bebas memilih arah.
    // Arah akhir dan minZoom dihitung ulang oleh placeLabels() (label-layout.js). Mode skematik lama: dari data.
    let must = null;
    const neighbors = [];
    for (const lid of lineIds) {
      const route = byId.get(lid);
      const at = route.stopIds.indexOf(id);
      const here = route.points[route.stopIdx[at]];
      for (const j of [at - 1, at + 1]) {
        const o = route.points[route.stopIdx[j]];
        if (o) neighbors.push([o.x - here.x, o.y - here.y]);
      }
      if (lineIds.length === 1) {
        const u = route.unit?.[route.stopIdx[at]];
        must = (u && outwardDir(u.x, u.y)) || null;
      }
    }
    // labelDir: arah label dikunci tepat (tanpa geser satu oktan), mengalahkan arah otomatis dari lajur.
    if (s.labelDir) must = s.labelDir;
    const legacy = LABEL[s.label ?? 'e'];
    const text = svgEl('text', { class: 'stop-label', x: 0, y: 0, 'text-anchor': legacy.anchor });
    setLabelText(text, s.name);
    const anim = svgEl('g', { class: 'label-anim' });
    const pos = svgEl('g', { class: 'label-pos' });
    anim.append(text);
    pos.append(anim);
    labelsLayer.append(pos);
    const label = { id, name: s.name, text, anim, pos, legacy, perm: permanent.has(id), minZoom: 0, dir: s.label ?? 'e', must, fixed: Boolean(s.labelDir), neighbors, interchange, p: positions.get(id), reach: 0 };
    labelEls.push(label);
    markers.push({ id, g, shape, hit, ring, dots, lanes, transit, label, override: null, apex: s.marker === 'apex' });

    // Hover hanya untuk mouse (sentuhan memakai ketuk = pilih). Fokus papan ketik: tampil langsung, tanpa animasi.
    g.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') anim.classList.add('on'); });
    g.addEventListener('pointerleave', () => anim.classList.remove('on'));
    g.addEventListener('focus', () => { if (g.matches(':focus-visible')) anim.classList.add('on', 'kbd'); });
    g.addEventListener('blur', () => anim.classList.remove('on', 'kbd'));

    g.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelectStop(id);
    });
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectStop(id);
      }
    });
    stopsLayer.append(g);
    stopEls.set(id, g);
  }

  const labelById = new Map(labelEls.map((l) => [l.id, l]));
  let lastK = 0;

  // Ukuran (px pada zoom dasar) dari `style`: tebal garis, jarak lajur, penanda. Dipanggil sekali saat mulai dan
  // lagi oleh lab/tampilan setiap slider bergerak.
  function applyStyle() {
    if (!geo) return;
    for (const r of routes) {
      const path = pathEls.get(r.id);
      path.setAttribute('stroke-width', (lineWidth(r) / MAP_BASE_ZOOM).toFixed(3));
      r.layout(style.laneGap / 2 / MAP_BASE_ZOOM, (lineWidth(r) + style.corridorGap) / MAP_BASE_ZOOM);
      path.setAttribute('d', roundedD(r.points, style.cornerRadius / MAP_BASE_ZOOM));
    }
    placeMarkers();
  }

  // Penanda: lingkaran di satu jalur, atau kapsul yang menjembatani titik halte di jalur-jalur yang berdampingan (dua arah
  // di ujung koridor, atau koridor berbeda di halte transit). Pusat kapsul menjadi posisi halte dan label.
  function placeMarkers() {
    const base = 1 / MAP_BASE_ZOOM;
    for (const m of markers) {
      let pts = m.override ? [m.override] : m.lanes.map((l) => l.route.points[l.idx]);
      let pair = false;
      // Halte ujung yang diberi `marker: 'apex'`: di puncak lengkung putar balik tiap jalur yang berakhir di sana (satu cincin,
      // atau kapsul lurus yang menjembatani puncak-puncak itu bila beberapa koridor berakhir di sini).
      if (m.apex && !m.override) {
        const tips = m.lanes.filter((l) => l.route.line.turn && l.route.line.cap !== 'square' && l.idx === l.route.stopIdx.at(-1))
          .map((l) => l.route.points[l.idx + 1 + Math.round((l.route.points.length - l.idx - 3) / 2)]);
        if (tips.length) pts = tips;
      } else if (!m.transit && !m.override && m.lanes.length > 1) {
        // Halte bersama dua arah satu koridor. Di ujung jalur (terminal) satu cincin di lajur jalur yang berangkat dari sana, di
        // lajur seberang yang tampil halte sebelumnya. Di tengah jalur (halte seberang jalan bernama sama) satu cincin di tiap
        // lajur, masing-masing di jalurnya, bukan di tengah-tengah.
        const terminal = m.lanes.some((l) => l.idx === l.route.stopIdx[0] || l.idx === l.route.stopIdx.at(-1))
          && !m.lanes.every((l) => l.route === m.lanes[0].route); // dua kali lewat di jalur yang sama: tetap satu cincin per lajur
        if (terminal) {
          const lane = m.lanes.find((l) => l.idx === l.route.stopIdx[0]) ?? m.lanes[0];
          pts = [lane.route.points[lane.idx]];
        } else pair = true;
      }
      // Jalur yang di halte itu berpisah jauh (bukan berdampingan) tidak dijembatani: hanya titik dekat jalur pertama.
      const reach = (style.laneGap + 3 * (lineWidth(m.lanes[0].route) + style.corridorGap)) / MAP_BASE_ZOOM;
      // Kemunculan lain di jalur yang sama (halte seberang pulang-pergi) selalu digambar, sejauh apa pun letaknya.
      const sameRoute = m.lanes.length > 1 && m.lanes.every((l) => l.route === m.lanes[0].route);
      const spread = sameRoute && pair && pts.some((p) => Math.hypot(p.x - pts[0].x, p.y - pts[0].y) > reach);
      if (!spread) pts = pts.filter((p) => Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= reach);
      let a = pts[0];
      let b = pts[0];
      let far = 0;
      for (const p of pts) for (const q of pts) {
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d > far) { far = d; a = p; b = q; }
      }
      // Kapsul halte transit selalu tegak lurus arah jalan (lurus, tidak miring walau lajur-lajurnya bergeser di sudut).
      let normal = null;
      if (m.transit && !m.apex && !m.override && pts.length > 1) {
        const lead = m.lanes[0];
        const c = lead.route.center;
        const i0 = Math.max(0, lead.idx - 1);
        const i1 = Math.min(c.length - 1, lead.idx + 1);
        let tx = c[i1].x - c[i0].x;
        let ty = c[i1].y - c[i0].y;
        for (let k = 1; Math.hypot(tx, ty) < 1e-6 && k < 4; k++) { tx = c[Math.min(c.length - 1, lead.idx + k)].x - c[Math.max(0, lead.idx - k)].x; ty = c[Math.min(c.length - 1, lead.idx + k)].y - c[Math.max(0, lead.idx - k)].y; }
        const l = Math.hypot(tx, ty) || 1;
        normal = { x: ty / l, y: -tx / l };
        const proj = pts.map((p) => p.x * normal.x + p.y * normal.y);
        const lo = Math.min(...proj);
        const hi = Math.max(...proj);
        const mean = { x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length, y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length };
        const shift = (lo + hi) / 2 - (mean.x * normal.x + mean.y * normal.y);
        a = { x: mean.x + normal.x * (shift - (hi - lo) / 2), y: mean.y + normal.y * (shift - (hi - lo) / 2) };
        b = { x: mean.x + normal.x * (shift + (hi - lo) / 2), y: mean.y + normal.y * (shift + (hi - lo) / 2) };
        far = hi - lo;
      }
      // Halte biasa tidak dijembatani; hanya halte transit yang kapsul.
      if (!m.transit) far = 0;
      const len = far * MAP_BASE_ZOOM; // px pada zoom dasar
      const size = m.transit ? style.transitSize : style.stopSize;
      const border = style.stopBorder;
      // Kapsul transit: lingkaran berdiameter `size`, bantalan 0,3 kali diameter (rasio desain Figma: lingkaran 20, kapsul 32).
      const r = m.transit ? size * 0.8 : Math.max(0.5, (size - border) / 2);
      const cx = spread ? pts[0].x : (a.x + b.x) / 2;
      const cy = spread ? pts[0].y : (a.y + b.y) / 2;
      const angle = len > 0.01 ? (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI : 0;
      const w = len + 2 * r;
      m.g.setAttribute('transform', `translate(${cx.toFixed(2)} ${cy.toFixed(2)}) scale(${base.toFixed(4)})`);
      m.shape.setAttribute('transform', `rotate(${angle.toFixed(2)})`);
      m.ring.setAttribute('x', (-w / 2).toFixed(3));
      m.ring.setAttribute('y', (-r).toFixed(3));
      m.ring.setAttribute('width', w.toFixed(3));
      m.ring.setAttribute('height', (2 * r).toFixed(3));
      m.ring.setAttribute('rx', r.toFixed(3));
      m.ring.setAttribute('stroke-width', border);
      const pad = Math.max(0, 12 - r - border / 2); // area sentuh minimal radius 12 px
      m.hit.setAttribute('x', (-w / 2 - pad).toFixed(3));
      m.hit.setAttribute('y', (-r - pad).toFixed(3));
      m.hit.setAttribute('width', (w + 2 * pad).toFixed(3));
      m.hit.setAttribute('height', (2 * (r + pad)).toFixed(3));
      m.hit.setAttribute('rx', (r + pad).toFixed(3));
      // Satu cincin per lajur (halte seberang jalan di tengah jalur): diletakkan relatif terhadap pusat.
      m.extra ??= [];
      const rings = pair ? pts : [];
      while (m.extra.length < Math.max(0, rings.length - 1)) {
        const x = m.ring.cloneNode();
        m.shape.append(x);
        m.extra.push(x);
      }
      if (rings.length > 1) {
        m.shape.setAttribute('transform', '');
        [m.ring, ...m.extra].forEach((x, q) => {
          const p = rings[q];
          x.style.display = p ? '' : 'none';
          if (!p) return;
          x.setAttribute('x', (((p.x - cx) * MAP_BASE_ZOOM) - r).toFixed(3));
          x.setAttribute('y', (((p.y - cy) * MAP_BASE_ZOOM) - r).toFixed(3));
          x.setAttribute('width', (2 * r).toFixed(3));
          x.setAttribute('height', (2 * r).toFixed(3));
          x.setAttribute('rx', r.toFixed(3));
          x.setAttribute('stroke-width', border);
        });
        const span = Math.hypot(rings[0].x - rings.at(-1).x, rings[0].y - rings.at(-1).y) * MAP_BASE_ZOOM;
        if (spread) {
          // Cincin berjauhan: tiap cincin punya area sentuh sendiri (bukan satu kotak panjang yang menutupi halte lain).
          m.extraHit ??= [];
          while (m.extraHit.length < rings.length - 1) { const h = m.hit.cloneNode(); m.shape.append(h); m.extraHit.push(h); }
          [m.hit, ...m.extraHit].forEach((h, q) => {
            const p = rings[q];
            h.style.display = p ? '' : 'none';
            if (!p) return;
            h.setAttribute('x', (((p.x - cx) * MAP_BASE_ZOOM) - 12).toFixed(3));
            h.setAttribute('y', (((p.y - cy) * MAP_BASE_ZOOM) - 12).toFixed(3));
            h.setAttribute('width', '24');
            h.setAttribute('height', '24');
            h.setAttribute('rx', '12');
          });
        } else {
          m.extraHit?.forEach((h) => { h.style.display = 'none'; });
          m.hit.style.display = '';
          m.hit.setAttribute('x', (-span / 2 - 12).toFixed(3));
          m.hit.setAttribute('y', '-12');
          m.hit.setAttribute('width', (span + 24).toFixed(3));
          m.hit.setAttribute('height', '24');
          m.hit.setAttribute('rx', '12');
        }
      } else m.extra.forEach((x) => { x.style.display = 'none'; });
      // Lingkaran jalur di dalam kapsul transit: satu per lajur, di posisi lajurnya sepanjang sumbu kapsul.
      if (m.transit) {
        const ux = Math.cos((angle * Math.PI) / 180);
        const uy = Math.sin((angle * Math.PI) / 180);
        const tipOf = (l) => (m.apex && l.route.line.turn && l.route.line.cap !== 'square' && l.idx === l.route.stopIdx.at(-1)
          ? l.route.points[l.idx + 1 + Math.round((l.route.points.length - l.idx - 3) / 2)]
          : l.route.points[l.idx]);
        m.lanes.forEach((l, q) => {
          const dot = m.dots[q];
          const p = tipOf(l);
          const shown = !m.override && pts.includes(p);
          dot.style.display = shown ? '' : 'none';
          if (!shown) return;
          dot.setAttribute('cx', ((((p.x - cx) * ux + (p.y - cy) * uy)) * MAP_BASE_ZOOM).toFixed(3));
          dot.setAttribute('cy', '0');
          dot.setAttribute('r', (size / 2).toFixed(3));
        });
      }
      m.label.p = { x: cx, y: cy };
      m.label.reach = size / 2 + len / 2;
    }
  }

  // Jalur dengan belokan tajam yang diberi radius kecil (`cornerRadius` px pada zoom dasar) dan sambungan bulat.
  // U-turn di terminal sudah berupa titik rapat, jadi tetap mulus.
  function roundedD(P, rho) {
    const f = (v) => v.toFixed(2);
    let distinct = P.filter((p, i) => i === 0 || Math.hypot(p.x - P[i - 1].x, p.y - P[i - 1].y) > 1e-6);
    // Titik yang hanya menyambung ruas lurus (mis. titik sisipan halte yang digeser) dibuang: kalau tidak, ruas lurus terpotong
    // pendek-pendek dan radius belokan di dekatnya ikut terbatas oleh panjang potongan itu (sudut jadi tajam).
    distinct = distinct.filter((p, i) => {
      if (i === 0 || i === distinct.length - 1) return true;
      const u = distinct[i - 1];
      const v = distinct[i + 1];
      const l1 = Math.hypot(p.x - u.x, p.y - u.y);
      const l2 = Math.hypot(v.x - p.x, v.y - p.y);
      return ((p.x - u.x) * (v.x - p.x) + (p.y - u.y) * (v.y - p.y)) / (l1 * l2) < 0.99995;
    });
    // Dua belokan berurutan yang searah dan hanya dipisah ruas pendek (kurang dari 1,2 kali radius), mis. persimpangan putar balik
    // datar R5 dengan jalan diagonal, digabung jadi satu belokan di perpotongan garisnya supaya radiusnya penuh dan terlihat mulus.
    const unit = (u, v) => { const l = Math.hypot(v.x - u.x, v.y - u.y) || 1; return { x: (v.x - u.x) / l, y: (v.y - u.y) / l }; };
    const cross = (u, v) => u.x * v.y - u.y * v.x;
    for (let i = 1; i < distinct.length - 2; i++) {
      const b = distinct[i];
      const c = distinct[i + 1];
      const gapLen = Math.hypot(c.x - b.x, c.y - b.y);
      if (gapLen >= rho * 1.2) continue;
      const a = distinct[i - 1];
      const e = distinct[i + 2];
      // Titik rapat berderet (setengah lingkaran putar balik) adalah satu lengkung, bukan belokan terpisah: jangan digabung,
      // kalau tidak lengkungnya miring dan tidak simetris.
      if (Math.hypot(b.x - a.x, b.y - a.y) < rho * 1.2 || Math.hypot(e.x - c.x, e.y - c.y) < rho * 1.2) continue;
      const d1 = unit(a, b);
      const d2 = unit(b, c);
      const d3 = unit(c, e);
      // Zig-zag (berlawanan arah) hanya digabung bila sangat pendek (kait kecil sisa lajur), selain itu dibiarkan.
      if (cross(d1, d2) * cross(d2, d3) <= 1e-9 && gapLen >= rho * 0.5) continue;
      const den = cross(d1, d3);
      if (Math.abs(den) < 1e-6) continue;
      const t = cross({ x: e.x - a.x, y: e.y - a.y }, d3) / den;
      const X = { x: a.x + d1.x * t, y: a.y + d1.y * t };
      if (t <= 0 || Math.hypot(X.x - b.x, X.y - b.y) > rho * 3 || Math.hypot(X.x - c.x, X.y - c.y) > rho * 3) continue;
      distinct.splice(i, 2, X);
      i--;
    }
    let d = `M${f(distinct[0].x)} ${f(distinct[0].y)}`;
    for (let i = 1; i < distinct.length - 1; i++) {
      const a = distinct[i - 1];
      const b = distinct[i];
      const c = distinct[i + 1];
      const l1 = Math.hypot(b.x - a.x, b.y - a.y);
      const l2 = Math.hypot(c.x - b.x, c.y - b.y);
      const d1 = { x: (b.x - a.x) / l1, y: (b.y - a.y) / l1 };
      const d2 = { x: (c.x - b.x) / l2, y: (c.y - b.y) / l2 };
      const r = Math.min(rho, l1 / 2, l2 / 2);
      if (r < 0.01 || d1.x * d2.x + d1.y * d2.y > 0.9995) { d += `L${f(b.x)} ${f(b.y)}`; continue; }
      d += `L${f(b.x - d1.x * r)} ${f(b.y - d1.y * r)}Q${f(b.x)} ${f(b.y)} ${f(b.x + d2.x * r)} ${f(b.y + d2.y * r)}`;
    }
    const last = distinct.at(-1);
    return `${d}L${f(last.x)} ${f(last.y)}`;
  }
  applyStyle();

  // Arah label dan minZoom dihitung dari ukuran yang sedang dipakai; dipanggil saat mulai dan tiap ukuran diubah.
  function placeLabels() {
    if (!geo) return;
    const R = style.stopSize / 2;
    const ends = new Set(routes.flatMap((r) => [r.stopIds[0], r.stopIds.at(-1)]));
    const info = (l) => ({ id: l.id, name: l.name, p: l.p, R: l.reach || R, dir: l.must, exact: l.fixed, neighbors: l.neighbors });
    const result = layoutLabels(labelEls.filter((l) => l.perm).map(info), ends,
      routes.map((r) => ({ pts: r.points, half: lineWidth(r) / 2 })));
    for (const l of labelEls) {
      const r = result.get(l.id);
      l.dir = r ? r.dir : defaultDir(info(l));
      l.minZoom = r ? r.minZoom : 0;
      l.text.setAttribute('text-anchor', labelPlacement(l.dir, 1, l.reach || R, l.name).anchor);
      l.anim.dataset.dir = l.dir;
    }
  }
  placeLabels();

  function applyLabels() {
    const k = lastK || 1;
    const base = 1 / MAP_BASE_ZOOM;
    for (const l of labelEls) {
      const at = `translate(${l.p.x.toFixed(2)} ${l.p.y.toFixed(2)})`;
      if (geo) {
        const pl = labelPlacement(l.dir, k, l.reach || style.stopSize / 2, l.name);
        l.pos.setAttribute('transform', `${at} scale(${base.toFixed(4)}) translate(${(pl.ax / pl.m).toFixed(3)} ${(pl.ay / pl.m).toFixed(3)}) scale(${(pl.ls / pl.m).toFixed(4)})`);
      } else {
        l.pos.setAttribute('transform', `${at} scale(${(1 / k).toFixed(4)}) translate(${l.legacy.dx} ${l.legacy.dy})`);
      }
      l.anim.classList.toggle('perm-on', l.perm && l.minZoom <= k);
    }
  }

  return {
    // Mode geografis: penanda ikut skala peta (satu skala tetap di atas), hanya label yang diatur per zoom.
    // Mode skematik: label berukuran tetap di layar.
    setZoom(k) {
      if (k === lastK) return;
      lastK = k;
      applyLabels();
    },
    // Geser satu halte (penanda dan labelnya) ke titik pt sementara, dipakai mode geser halte (js/stop-edit.js).
    moveStop(id, pt) {
      markers.find((m) => m.id === id).override = pt;
      placeMarkers();
      applyLabels();
    },
    labels: () => labelEls.map((l) => ({ id: l.id, dir: l.dir, minZoom: l.minZoom, must: l.must, p: { x: l.p.x, y: l.p.y } })),
    restyle() {
      applyStyle();
      placeLabels();
      applyLabels();
    },
    applyActive(active) {
      for (const [id, path] of pathEls) {
        path.classList.toggle('dim', !active.has(id));
      }
      for (const [id, g] of stopEls) {
        const on = stopToLines.get(id).some((l) => active.has(l));
        g.classList.toggle('dim', !on);
        labelById.get(id).pos.classList.toggle('dim', !on);
        g.setAttribute('tabindex', on ? 0 : -1);
      }
    },
    setSelected(id) {
      for (const [sid, g] of stopEls) {
        g.classList.toggle('selected', sid === id);
        labelById.get(sid).anim.classList.toggle('on', sid === id);
      }
    },
  };
}
