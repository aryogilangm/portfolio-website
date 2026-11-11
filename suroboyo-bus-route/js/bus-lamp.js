// Lampu bus untuk tema Night: lingkar cahaya di sekeliling badan dan sorot lampu ke depan (+x). Tampil lewat CSS hanya saat
// <html data-waktu="malam">. Beberapa gaya sorot untuk dibandingkan (lab/lampu); gaya dipilih lewat ?lampu=<nama> atau LAMP_DEFAULT.
//  awal : iterasi pertama (gradasi Figma pemilik, corong dengan tepi tegas dan blur tipis)
//  a    : lampu "sebaran": corong lebar dengan jatuh cahaya radial dari ujung depan bus, halus ke segala sisi
//  b    : lampu "berlapis": tiga corong bertumpuk (lebar redup, tengah, inti terang) dengan gradasi bertahap dan blur lebih besar
//  c    : lampu "hangat": satu corong dengan tepi samping memudar (mask) dan putih sedikit hangat, ditambah genangan cahaya di depan
const NS = 'http://www.w3.org/2000/svg';
export const LAMP_DEFAULT = 'a';
export const HALO_DEFAULT = '1';
export const HALOS = ['now', '1', '2', '3'];
export const LAMPS = ['awal', 'a', 'b', 'c'];

const el = (tag, attrs = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
// Gradasi bertahap: alfa jatuh dengan pangkat p (mendekati cara cahaya memudar), bukan garis lurus yang tampak "berpita".
const eased = (a0, p, n = 14) => Array.from({ length: n + 1 }, (_, i) => [i / n, a0 * (1 - i / n) ** p]);
const bell = (p, n = 14) => Array.from({ length: n + 1 }, (_, i) => [i / n, Math.sin((Math.PI * i) / n) ** p]);
function linear(id, stops, color, { vertical = false } = {}) {
  const g = el('linearGradient', vertical ? { id, x1: 0, y1: 0, x2: 0, y2: 1 } : { id, x1: 0, y1: 0, x2: 1, y2: 0 });
  for (const [o, a] of stops) g.append(el('stop', { offset: o, 'stop-color': color, 'stop-opacity': a.toFixed(3) }));
  return g;
}
const blurFilter = (id, sd) => {
  const f = el('filter', { id, x: '-30%', y: '-40%', width: '160%', height: '180%' });
  f.append(el('feGaussianBlur', { stdDeviation: sd }));
  return f;
};

function haloMask() {
  const m = el('mask', { id: 'halo-rad', maskContentUnits: 'objectBoundingBox' });
  const g = el('radialGradient', { id: 'halo-rad-grad', cx: 0.5, cy: 0.5, r: 0.5 });
  for (const [o, a] of eased(1, 1.8)) g.append(el('stop', { offset: o, 'stop-color': '#FFFFFF', 'stop-opacity': a.toFixed(3) }));
  m.append(el('rect', { x: 0, y: 0, width: 1, height: 1, fill: 'url(#halo-rad-grad)' }), g);
  return m;
}

export function lampDefs(layer) {
  const defs = el('defs');
  const awal = el('linearGradient', { id: 'lamp-awal', x1: 0, y1: 0, x2: 1, y2: 0 });
  for (const [o, c, a] of [[0, '#FFFFFF', 0.9], [0.07, '#FFFFFF', 0.9], [0.29, '#FFFFFF', 0.55], [0.5, '#030A20', 0.1], [0.9, '#030A20', 0.05], [1, '#030A20', 0]]) {
    awal.append(el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }));
  }
  const rad = el('radialGradient', { id: 'lamp-rad', cx: 0, cy: 0.5, r: 1 });
  for (const [o, a] of eased(0.8, 2.2)) rad.append(el('stop', { offset: o, 'stop-color': '#FFFFFF', 'stop-opacity': a.toFixed(3) }));
  const poolRad = el('radialGradient', { id: 'lamp-pool', cx: 0.5, cy: 0.5, r: 0.5 });
  for (const [o, a] of eased(0.3, 2) ) poolRad.append(el('stop', { offset: o, 'stop-color': '#FFF1CF', 'stop-opacity': a.toFixed(3) }));
  const mask = el('mask', { id: 'lamp-edge', maskContentUnits: 'objectBoundingBox' });
  const mr = el('rect', { x: 0, y: 0, width: 1, height: 1, fill: 'url(#lamp-edge-grad)' });
  mask.append(mr);
  defs.append(
    awal, blurFilter('lamp-blur-awal', 0.9), rad, poolRad,
    linear('lamp-b', eased(1, 2.2), '#FFFFFF'),
    linear('lamp-c', eased(0.85, 1.7), '#FFF4D6'),
    linear('lamp-edge-grad', bell(1.4).map(([o, a]) => [o, a]), '#FFFFFF', { vertical: true }),
    mask,
    blurFilter('lamp-blur-06', 0.6), blurFilter('lamp-blur-15', 1.5), haloMask(), blurFilter('lamp-blur-07', 0.7), blurFilter('lamp-blur-11', 1.1), blurFilter('lamp-blur-12', 1.2), blurFilter('lamp-blur-20', 2),
  );
  layer.append(defs);
}

// Lingkar cahaya di sekeliling badan bus. Elemen "tints" diwarnai warna koridor (lihat buses.js paintBus).
//  now : kotak membulat melebar 2 px, blur sedang (yang sekarang)
//  1   : ketat: tipis dan lebih terang, menempel di badan
//  2   : mekar: elips dengan jatuh cahaya radial yang luas dan sangat halus
//  3   : dua lapis: inti putih hangat tipis dan selubung warna koridor yang lebih lebar
function makeHalo(style, smooth) {
  const g = el('g', { class: 'bus-halo' });
  const tints = [];
  const rect = (attrs, tint = true) => { const r = el('rect', attrs); g.append(r); if (tint) tints.push(r); return r; };
  let size;
  if (style === '1') {
    const r = rect({ opacity: 0.75, filter: 'url(#lamp-blur-06)' });
    size = (l, h, rx, set) => set(r, -l / 2 - 1, -h / 2 - 1, l + 2, h + 2, rx + 1);
  } else if (style === '2') {
    const e = el('ellipse', { opacity: 0.95, mask: 'url(#halo-rad)' });
    g.append(e); tints.push(e);
    size = (l, h) => { e.setAttribute('cx', 0); e.setAttribute('cy', 0); e.setAttribute('rx', l / 2 + h * 1.9); e.setAttribute('ry', h / 2 + h * 1.9); };
  } else if (style === '3') {
    const outer = rect({ opacity: 0.32, filter: 'url(#lamp-blur-15)' });
    const core = rect({ opacity: 0.45, fill: '#FFF1CF', filter: 'url(#lamp-blur-06)' }, false);
    size = (l, h, rx, set) => { set(outer, -l / 2 - 4, -h / 2 - 4, l + 8, h + 8, rx + 4); set(core, -l / 2 - 0.8, -h / 2 - 0.8, l + 1.6, h + 1.6, rx + 0.8); };
  } else {
    const r = rect({ opacity: smooth ? 0.26 : 0.22 });
    if (smooth) r.setAttribute('filter', 'url(#lamp-blur-11)');
    const pad = smooth ? 2 : 1.6;
    size = (l, h, rx, set) => set(r, -l / 2 - pad, -h / 2 - pad, l + 2 * pad, h + 2 * pad, rx + pad);
  }
  return { g, tints, size };
}

let seq = 0;
const trapezoid = (a, near, far, len, h) => `${a},${(-h * near) / 2} ${a + len},${(-h * far) / 2} ${a + len},${(h * far) / 2} ${a},${(h * near) / 2}`;

// Membangun lampu di dalam grup g (di belakang badan bus). Mengembalikan { halo, size(l, h, rx) }.
export function makeLamp(g, variant, haloStyle = HALO_DEFAULT) {
  const lamp = el('g', { class: 'bus-lamp' });
  const halo = makeHalo(haloStyle, variant !== 'awal');
  let build;

  if (variant === 'a') {
    const cone = el('polygon', { fill: 'url(#lamp-rad)', filter: 'url(#lamp-blur-11)' });
    lamp.append(cone);
    build = (l, h) => cone.setAttribute('points', trapezoid(l / 2, 0.75, 3.6, l * 2.4, h));
  } else if (variant === 'b') {
    const layers = [[3.0, 3.8, 0.8, 0.2, 'lamp-blur-20'], [2.2, 2.7, 0.75, 0.32, 'lamp-blur-12'], [1.5, 1.4, 0.65, 0.55, 'lamp-blur-07']].map(([len, far, near, op, blur]) => {
      const p = el('polygon', { fill: 'url(#lamp-b)', opacity: op, filter: `url(#${blur})` });
      lamp.append(p);
      return { p, len, far, near };
    });
    build = (l, h) => {
      for (const { p, len, far, near } of layers) p.setAttribute('points', trapezoid(l / 2, near, far, l * len, h));
    };
  } else if (variant === 'c') {
    const cone = el('polygon', { fill: 'url(#lamp-c)', mask: 'url(#lamp-edge)', filter: 'url(#lamp-blur-07)' });
    const pool = el('ellipse', { fill: 'url(#lamp-pool)' });
    lamp.append(pool, cone);
    build = (l, h) => {
      const len = l * 2.6;
      cone.setAttribute('points', trapezoid(l / 2, 0.8, 3.4, len, h));
      pool.setAttribute('cx', l / 2 + len * 0.62); pool.setAttribute('cy', 0); pool.setAttribute('rx', len * 0.55); pool.setAttribute('ry', h * 1.5);
    };
  } else {
    const beam = el('polygon', { fill: 'url(#lamp-awal)', filter: 'url(#lamp-blur-awal)' });
    lamp.append(beam);
    build = (l, h) => beam.setAttribute('points', trapezoid(l / 2, 0.7, 2.8, l * 2.4, h));
  }
  lamp.append(halo.g);
  g.append(lamp);
  return {
    tints: halo.tints,
    size(l, h, rx, set) {
      build(l, h);
      halo.size(l, h, rx, set);
    },
  };
}
