// Penempatan label halte (mode geografis), dihitung di browser dari ukuran yang sedang dipakai, jadi ikut berubah
// saat ukuran halte/label diatur di lab/tampilan dan otomatis benar untuk koridor baru.
// Label ditaruh `labelGap` piksel dari tepi penanda. Penanda tumbuh linear dengan zoom, teks lebih pelan (labelScale),
// jadi ukuran dalam piksel layar dihitung per zoom. Label yang bertabrakan di zoom jauh disembunyikan sampai zoom
// cukup dekat (`minZoom`).
import { MAP_BASE_ZOOM, style, labelScale } from './scale.js';

const ZOOMS = [0.15, 0.2, 0.27, 0.35, 0.45, 0.6, 0.8, 1.1, 1.5, 2, 2.5];
const DIR_VEC = { e: [1, 0], w: [-1, 0], n: [0, -1], s: [0, 1], ne: [0.7, -0.7], nw: [-0.7, -0.7], se: [0.7, 0.7], sw: [-0.7, 0.7] };
const DIR_PREF = ['n', 's', 'ne', 'se', 'nw', 'sw', 'e', 'w'];
const S = Math.SQRT1_2;
const OCTANTS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
// Sisi terluar lajur ± satu oktan: label tidak boleh pindah ke sisi dalam (antara dua jalur).
const nearOutward = (dir) => { const i = OCTANTS.indexOf(dir); return [dir, OCTANTS[(i + 1) % 8], OCTANTS[(i + 7) % 8]]; };

// Nama yang panjang dibagi dua baris di spasi terdekat ke tengah.
export const WRAP_AT = 16;
export function wrapLabel(name) {
  if (name.length <= WRAP_AT || !name.includes(' ')) return [name];
  let best = -1;
  for (let i = 0; i < name.length; i++) if (name[i] === ' ' && (best < 0 || Math.abs(i - name.length / 2) < Math.abs(best - name.length / 2))) best = i;
  return [name.slice(0, best), name.slice(best + 1)];
}

// Posisi label relatif ke pusat halte, dalam piksel layar pada zoom k. R = radius penanda pada zoom dasar (px).
export function labelPlacement(dir, k, R, name) {
  const m = k / MAP_BASE_ZOOM;
  const ls = labelScale(k);
  const lines = wrapLabel(name);
  const h = 14 * ls * (lines.length === 1 ? 1 : 1 + 0.9 * (lines.length - 1));
  const w = Math.max(...lines.map((l) => l.length)) * 6.4 * ls;
  const d = R * m + style.labelGap;
  let ax = 0;
  let ay = 0;
  let anchor = 'middle';
  if (dir === 'e') { ax = d; anchor = 'start'; }
  else if (dir === 'w') { ax = -d; anchor = 'end'; }
  else if (dir === 'n') ay = -(d + h / 2);
  else if (dir === 's') ay = d + h / 2;
  else {
    ax = (dir.includes('e') ? 1 : -1) * d * S;
    ay = (dir.includes('n') ? -1 : 1) * (d * S + h / 2);
    anchor = dir.includes('e') ? 'start' : 'end';
  }
  const x0 = anchor === 'start' ? ax : anchor === 'end' ? ax - w : ax - w / 2;
  return { ax, ay, anchor, m, ls, rect: { x0, x1: x0 + w, y0: ay - h / 2, y1: ay + h / 2 } };
}

// Apakah ruas (x1,y1)-(x2,y2) memotong kotak r (Liang-Barsky).
function segHitsRect(x1, y1, x2, y2, r) {
  if (Math.max(x1, x2) < r.x0 || Math.min(x1, x2) > r.x1 || Math.max(y1, y2) < r.y0 || Math.min(y1, y2) > r.y1) return false;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [[-dx, x1 - r.x0], [dx, r.x1 - x1], [-dy, y1 - r.y0], [dy, r.y1 - y1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

// Arah label untuk halte yang labelnya hanya muncul saat di-hover: sisi terluar lajur, atau arah yang paling jauh dari ruas tetangga.
const sortDirs = (s) => [...DIR_PREF].sort((a, b) => Math.round(badness(s, a) * 2) - Math.round(badness(s, b) * 2));
function badness(s, d) {
  return Math.max(0, ...s.neighbors.map(([vx, vy]) => {
    const l = Math.hypot(vx, vy) || 1;
    const [dx, dy] = DIR_VEC[d];
    return Math.abs((vx * dx + vy * dy) / (l * Math.hypot(dx, dy)));
  }));
}
export const defaultDir = (s) => s.dir ?? sortDirs(s)[0];

const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

// stops: [{ id, name, p: {x, y} (satuan peta), R, dir (arah wajib atau null), neighbors: [[vx, vy]] }]
// routes: [{ pts: [{x, y}] (satuan peta), half }] — label tidak boleh menimpa garis rute (half = setengah tebal, px dasar).
// Hasil: Map id -> { dir, minZoom }.
export function layoutLabels(stops, endIds, routes = []) {
  const segs = routes.flatMap((r) => r.pts.slice(1).map((q, i) => ({ a: r.pts[i], b: q, half: r.half })).filter((g) => Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y) > 1e-6));
  const ends = stops.filter((s) => endIds.has(s.id));
  const rest = stops.filter((s) => !endIds.has(s.id));
  const bits = Math.ceil(Math.log2(rest.length || 1));
  const rev = (n) => parseInt(n.toString(2).padStart(bits, '0').split('').reverse().join('') || '0', 2);
  const order = [...ends, ...rest.map((s, i) => ({ s, k: rev(i) })).sort((a, b) => a.k - b.k).map((x) => x.s)];

  const placed = [];
  const result = new Map();
  const rectOf = (s, dir, k) => {
    const pl = labelPlacement(dir, k, s.R, s.name);
    const { x0, x1, y0, y1 } = pl.rect;
    return { x0: s.p.x * k + x0, x1: s.p.x * k + x1, y0: s.p.y * k + y0, y1: s.p.y * k + y1 };
  };
  const clashes = (s, dir, k, lines = true) => {
    const r = rectOf(s, dir, k);
    const m = k / MAP_BASE_ZOOM;
    if (lines && segs.some((g) => segHitsRect(g.a.x * k, g.a.y * k, g.b.x * k, g.b.y * k, { x0: r.x0 - g.half * m, x1: r.x1 + g.half * m, y0: r.y0 - g.half * m, y1: r.y1 + g.half * m }))) return true;
    if (placed.some((p) => p.minZoom <= k && hit(r, rectOf(p.s, p.dir, k)))) return true;
    return stops.some((o) => o !== s && hit(r, { x0: o.p.x * k - o.R * m - 1, x1: o.p.x * k + o.R * m + 1, y0: o.p.y * k - o.R * m - 1, y1: o.p.y * k + o.R * m + 1 }));
  };

  for (const s of order) {
    const sorted = sortDirs(s);
    // Satu arah muat mulai zoom z bila tidak bertabrakan di z dan semua zoom yang lebih dekat (label lain yang
    // sudah ditempatkan makin banyak terlihat di zoom dekat). Dicari dari zoom terdekat ke jauh.
    const fitsFrom = (dir, lines = true) => {
      let z = null;
      for (let i = ZOOMS.length - 1; i >= 0 && !clashes(s, dir, ZOOMS[i], lines); i--) z = ZOOMS[i];
      return z;
    };
    let chosen = null;
    // Arah wajib (sisi terluar lajur) dicoba dulu; baru kalau tidak pernah muat, arah lain.
    const allowed = s.dir ? (s.exact ? [s.dir] : nearOutward(s.dir)) : sorted;
    for (const dirs of s.dir ? [[s.dir], allowed] : [sorted]) {
      for (const dir of dirs) {
        const z = fitsFrom(dir);
        if (z !== null && (!chosen || z < chosen.minZoom)) chosen = { s, dir, minZoom: z };
      }
      if (chosen) break;
    }
    // Penanda ujung jalur wajib terlihat di semua zoom: bila tak ada tempat yang muat sejak zoom terjauh, pilih arah dengan
    // paling sedikit tabrakan dengan penanda lain (garis boleh dekat) dan tampilkan tetap.
    if (endIds.has(s.id) && (!chosen || chosen.minZoom > ZOOMS[0])) {
      const cost = (dir) => ZOOMS.filter((k) => clashes(s, dir, k, false)).length;
      const dir = [...(s.dir ? (s.exact ? [s.dir] : nearOutward(s.dir)) : sorted)].sort((x, y) => cost(x) - cost(y))[0];
      chosen = { s, dir, minZoom: ZOOMS[0] };
    }
    chosen ??= { s, dir: s.dir ?? sorted[0], minZoom: s.exact ? ZOOMS.at(-1) : Infinity }; // tidak pernah muat: tersembunyi (arah terkunci: tampil di zoom terdekat)
    placed.push(chosen);
    result.set(s.id, { dir: chosen.dir, minZoom: chosen.minZoom <= ZOOMS[0] ? 0 : chosen.minZoom });
  }
  return result;
}
