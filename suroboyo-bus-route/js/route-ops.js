// Operasi sunting garis tengah satu jalur untuk mode "Sunting rute" (js/route-edit.js). Semua dalam unit peta
// (ctx.scale = meter per unit). V = [{ x, y, stop? }]: titik sudut jalur dari awal ke ujung; titik dengan `stop`
// (indeks halte di jalur) adalah halte dan tidak pernah bergerak. Ruas selalu tetap kelipatan 45°.
import { unprojector } from './geo.js';

const RAD = Math.PI / 180;
const GRID_M = 10; // posisi bebas dibulatkan ke kelipatan ini
const MIN_PIECE_M = 20; // ruas hasil sunting tidak boleh lebih pendek dari ini
const TINY_M = 3; // titik yang lebih dekat dari ini ke tetangganya dibuang
const FREE_MIN_M = 6; // ruas terpendek pada mode bebas

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v) => Math.hypot(v.x, v.y);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const unit = (v) => {
  const l = len(v);
  return l > 1e-12 ? { x: v.x / l, y: v.y / l } : null;
};
const DIRS = [0, 1, 2, 3].map((i) => ({ x: Math.cos(i * 45 * RAD), y: Math.sin(i * 45 * RAD) })); // empat garis tanpa arah

export const isOcti = (v, tol = 0.8) => {
  const a = Math.abs(Math.atan2(v.y, v.x) / RAD) % 45;
  return Math.min(a, 45 - a) <= tol;
};

const snapGrid = (p, ctx) => {
  const step = GRID_M / ctx.scale;
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
};

// Titik sudut jalur dari legs (lat/lng) jalur itu. Ujung ruas adalah halte.
export function toVertices(line, project) {
  const V = [];
  line.legs.forEach((leg, i) => {
    leg.forEach(([lat, lng], j) => {
      if (j === 0 && i > 0) return; // ujung ruas sebelumnya sama dengan awal ruas ini
      V.push({ ...project(lat, lng) });
    });
    if (i === 0) V[0].stop = 0;
    V.at(-1).stop = i + 1;
  });
  return V;
}

// Kebalikannya: pecah V di titik halte menjadi `n` ruas [lat, lng].
export function toLegs(V, origin, scale, n) {
  const unproject = unprojector(origin, scale);
  const legs = Array.from({ length: n }, () => []);
  let k = 0;
  for (const p of V) {
    const { lat, lng } = unproject(p);
    const pt = [+lat.toFixed(6), +lng.toFixed(6)];
    if (p.stop !== undefined) {
      if (p.stop > 0) legs[p.stop - 1].push(pt);
      if (p.stop < n) { k = p.stop; legs[k].push(pt); }
    } else legs[k].push(pt);
  }
  return legs;
}

// Buang titik non-halte yang berimpit dengan tetangga atau lurus saja, di sekitar indeks lo..hi.
function clean(V, ctx, lo, hi) {
  const tiny = TINY_M / ctx.scale;
  let again = true;
  while (again) {
    again = false;
    for (let i = Math.max(1, lo); i <= Math.min(V.length - 2, hi); i++) {
      const p = V[i];
      if (p.stop !== undefined) continue;
      const d1 = sub(p, V[i - 1]);
      const d2 = sub(V[i + 1], p);
      const l1 = len(d1);
      const l2 = len(d2);
      const straight = l1 > 1e-9 && l2 > 1e-9 && Math.abs(cross(d1, d2)) / (l1 * l2) < 1e-3 && dot(d1, d2) > 0;
      if (l1 < tiny || l2 < tiny || straight) { V.splice(i, 1); hi -= 1; again = true; break; }
    }
  }
}

// Ruas yang menyentuh titik baru (`_n`) tidak boleh terlalu pendek. Bendera `_n` dibuang.
function finish(V, ctx, minM = MIN_PIECE_M) {
  const min = minM / ctx.scale;
  let ok = true;
  for (let i = 0; i < V.length - 1; i++) {
    if ((V[i]._n || V[i + 1]._n) && len(sub(V[i + 1], V[i])) < min) ok = false;
  }
  for (const p of V) delete p._n;
  return ok ? V : null;
}

const fresh = (p) => ({ x: p.x, y: p.y, _n: true });

// Titik sudut pengganti bila A -> B bukan kelipatan 45°: satu titik siku supaya dua potongnya 45°-an. `first`/`last` =
// arah yang diinginkan untuk potongan pertama/terakhir (menyambung mulus dengan ruas di sebelahnya).
function elbow(A, B, first = null, last = null) {
  const w = sub(B, A);
  if (isOcti(w)) return [];
  const m = Math.min(Math.abs(w.x), Math.abs(w.y));
  const diag = { x: Math.sign(w.x) * m, y: Math.sign(w.y) * m };
  const straight = sub(w, diag);
  const diagFirst = { x: A.x + diag.x, y: A.y + diag.y };
  const straightFirst = { x: A.x + straight.x, y: A.y + straight.y };
  const aligned = (a, b) => { const u = unit(a); return u && dot(u, b) > 0.99; };
  let pick = straightFirst;
  if (first && aligned(diag, first)) pick = diagFirst;
  else if (first && aligned(straight, first)) pick = straightFirst;
  else if (last && aligned(straight, last)) pick = diagFirst;
  else if (last && aligned(diag, last)) pick = straightFirst;
  return [fresh(pick)];
}

// Geser ruas k (V[k] -> V[k+1]) tegak lurus sejauh t (unit peta). Ujung ruas yang bukan halte meluncur di garis tetangganya,
// jadi ruas tetangga memanjang atau memendek; ujung halte tetap dan diberi tekukan baru. Hasil null bila tidak valid.
export function slideSegment(V0, k, t, ctx) {
  if (Math.abs(t) < 1e-9) return V0;
  const V = V0.map((p) => ({ ...p }));
  const A = V[k];
  const B = V[k + 1];
  const d = unit(sub(B, A));
  if (!d) return null;
  const off = { x: -d.y * t, y: d.x * t };
  const min = MIN_PIECE_M / ctx.scale;
  const end = (e, nb) => {
    const P = V[e];
    if (P.stop !== undefined || !V[nb]) return null;
    const m = unit(sub(P, V[nb]));
    if (!m || Math.abs(cross(d, m)) < 0.3) return null;
    const moved = { x: P.x + off.x, y: P.y + off.y };
    const u = cross(sub(moved, V[nb]), d) / cross(m, d);
    return u < min ? 'bad' : fresh({ x: V[nb].x + m.x * u, y: V[nb].y + m.y * u });
  };
  const a = end(k, k - 1);
  const b = end(k + 1, k + 2);
  if (a === 'bad' || b === 'bad') return null;
  const out = V.slice(0, k);
  if (a) out.push(a);
  else out.push(A, fresh({ x: A.x + off.x, y: A.y + off.y }));
  if (b) out.push(b);
  else out.push(fresh({ x: B.x + off.x, y: B.y + off.y }), B);
  out.push(...V.slice(k + 2));
  const i = out.findIndex((p) => p._n);
  clean(out, ctx, i - 2, i + 6);
  return finish(out, ctx);
}

// Seperti slideSegment, tetapi t ditempelkan dulu (sejajar dengan titik lain bila `align`, atau ke grid bila `grid`) dan
// bila terlalu jauh dikurangi per kotak grid sampai valid. `points` = titik lain di peta; `radius` = jarak tempel (unit peta).
// `out.guides` diisi garis bantu yang kena.
export function slideClamped(V, k, t, ctx, { radius = 0, points = [], align = false, grid = true, out = {} } = {}) {
  const step = GRID_M / ctx.scale;
  out.guides = [];
  let snapped = grid ? Math.round(t / step) * step : t;
  const A = V[k];
  const d = unit(sub(V[k + 1], A));
  if (align && radius && d) {
    const n = { x: -d.y, y: d.x };
    let best = null;
    for (const P of points) {
      const tt = dot(sub(P, A), n);
      const gap = Math.abs(tt - t);
      if (gap <= radius && (!best || gap < best.gap)) best = { gap, tt, P };
    }
    if (best) { snapped = best.tt; out.guides = [{ P: best.P, u: d }]; }
  }
  for (let s = snapped; Math.abs(s) >= step / 2; s -= Math.sign(s) * step) {
    const res = slideSegment(V, k, s, ctx);
    if (res) { if (s !== snapped) out.guides = []; return res; }
  }
  out.guides = [];
  return V;
}

// Titik "rapi" untuk sudut i: pada garis 45° dari tetangga sebelum/sesudahnya (`octi`, terutama perpotongannya sehingga
// kedua ruas lurus) dan/atau sejajar dengan titik lain (`points`: garis lurus atau 45° lewat titik itu, terutama bila
// memotong garis 45° tetangga). Mengembalikan { p, guides } atau null.
function cornerSnap(A, B, q, radius, ctx, { octi, points }) {
  const min = MIN_PIECE_M / ctx.scale;
  const cands = [];
  const base = octi ? [...DIRS.map((u) => ({ P: A, u })), ...DIRS.map((u) => ({ P: B, u }))] : [];
  const guides = points.flatMap((P) => DIRS.map((u) => ({ P, u, g: true })));
  const proj = ({ P, u }) => { const s = dot(sub(q, P), u); return { x: P.x + u.x * s, y: P.y + u.y * s }; };
  const meet = (x, y) => {
    const den = cross(x.u, y.u);
    if (Math.abs(den) < 1e-6) return null;
    const s = cross(sub(y.P, x.P), y.u) / den;
    return { x: x.P.x + x.u.x * s, y: x.P.y + x.u.y * s };
  };
  for (const L of base) cands.push({ p: proj(L), pen: radius * 0.5, g: [] });
  for (const x of base) for (const y of base) if (x.P !== y.P) { const p = meet(x, y); if (p) cands.push({ p, pen: 0, g: [] }); }
  for (const G of guides) {
    if (len(sub(proj(G), q)) > radius) continue; // hanya garis bantu yang dekat
    cands.push({ p: proj(G), pen: radius * 0.6, g: [G] });
    for (const L of base) { const p = meet(G, L); if (p) cands.push({ p, pen: radius * 0.2, g: [G] }); }
  }
  // Sejajar sekaligus dengan satu titik secara tegak dan satu titik lain secara datar.
  const near = (axis) => {
    let best = null;
    for (const P of points) {
      const gap = Math.abs(P[axis] - q[axis]);
      if (gap <= radius && (!best || gap < best.gap)) best = { gap, P };
    }
    return best;
  };
  const nx = near('x');
  const ny = near('y');
  if (nx && ny) cands.push({ p: { x: nx.P.x, y: ny.P.y }, pen: radius * 0.1, g: [{ P: nx.P, u: { x: 0, y: 1 } }, { P: ny.P, u: { x: 1, y: 0 } }] });
  let best = null;
  for (const c of cands) {
    if (len(sub(c.p, A)) < min || len(sub(c.p, B)) < min) continue;
    const dd = len(sub(c.p, q));
    if (dd > radius) continue;
    if (!best || dd + c.pen < best.score) best = { p: c.p, guides: c.g, score: dd + c.pen };
  }
  return best;
}

// Pindahkan sudut i ke q. `radius` (unit peta) > 0 menempelkannya ke titik rapi terdekat (garis 45° tetangga bila `octi`,
// sejajar dengan `points` bila `align`), kalau tidak ke grid bila `grid`; ruas yang tidak 45° diberi siku, kecuali `free`
// (bentuk bebas: sudut apa pun). `out.guides` = garis bantu.
export function moveCorner(V0, i, q, ctx, { radius = 0, octi = true, align = false, points = [], grid = true, free = false, out = {} } = {}) {
  if (i <= 0 || i >= V0.length - 1 || V0[i].stop !== undefined) return null;
  const V = V0.map((p) => ({ ...p }));
  const hit = radius && (octi || align) ? cornerSnap(V[i - 1], V[i + 1], q, radius, ctx, { octi, points: align ? points : [] }) : null;
  out.guides = hit?.guides ?? [];
  const Q = hit?.p ?? (grid ? snapGrid(q, ctx) : q);
  V[i] = fresh(Q);
  if (free) { clean(V, ctx, i - 2, i + 2); return finish(V, ctx, FREE_MIN_M); }
  const into = i >= 2 ? unit(sub(V[i - 1], V[i - 2])) : null;
  const outOf = i + 2 < V.length ? unit(sub(V[i + 2], V[i + 1])) : null;
  const eNext = elbow(V[i], V[i + 1], null, outOf);
  const ePrev = elbow(V[i - 1], V[i], into, null);
  V.splice(i + 1, 0, ...eNext);
  V.splice(i, 0, ...ePrev);
  clean(V, ctx, i - 2, i + 4);
  return finish(V, ctx);
}

// Hapus sudut i; dua tetangganya disambung langsung (dengan siku bila perlu).
export function deleteCorner(V0, i, ctx, { free = false } = {}) {
  if (i <= 0 || i >= V0.length - 1 || V0[i].stop !== undefined) return null;
  const V = V0.map((p) => ({ ...p }));
  V.splice(i, 1);
  if (free) return V;
  const into = i >= 2 ? unit(sub(V[i - 1], V[i - 2])) : null;
  const outOf = i + 1 < V.length ? unit(sub(V[i + 1], V[i])) : null;
  V.splice(i, 0, ...elbow(V[i - 1], V[i], into, outOf));
  clean(V, ctx, i - 2, i + 3);
  return finish(V, ctx);
}

// Sisipkan sudut baru di titik p (unit peta) pada ruas k; dipakai untuk menarik tekukan dari tengah ruas.
export function insertPoint(V0, k, p) {
  const V = V0.map((q) => ({ ...q }));
  V.splice(k + 1, 0, { x: p.x, y: p.y });
  return V;
}

// Bentuk bebas: geser seluruh ruas k sejauh `delta` ke arah mana pun. Ujung yang halte tetap dan disambung ke ruas yang bergeser.
export function slideFree(V0, k, delta, ctx) {
  const V = V0.map((p) => ({ ...p }));
  const A = V[k];
  const B = V[k + 1];
  const mv = (p) => fresh({ x: p.x + delta.x, y: p.y + delta.y });
  const out = V.slice(0, k);
  out.push(...(A.stop !== undefined ? [A, mv(A)] : [mv(A)]));
  out.push(...(B.stop !== undefined ? [mv(B), B] : [mv(B)]));
  out.push(...V.slice(k + 2));
  clean(out, ctx, k - 1, k + 5);
  return finish(out, ctx, FREE_MIN_M);
}

// Terapkan hasil sunting (data/route-edits.json) ke net: { idJalur: { "a>b": [[lat, lng], ...] } }. Ujung ruas dipaksa sama
// dengan data sekarang supaya sambungan antar ruas dan posisi halte tidak berubah. Mengembalikan sunting yang dipakai.
export function applyRouteEdits(net, edits = {}) {
  const used = {};
  const TOL = 0.001; // derajat (~110 m): ujung yang lebih jauh berarti data sudah berubah
  for (const [lineId, legs] of Object.entries(edits)) {
    const line = net.lines.find((l) => l.id === lineId);
    if (!line) { console.warn(`route-edits: jalur "${lineId}" tidak ada, diabaikan`); continue; }
    for (const [key, pts] of Object.entries(legs)) {
      const i = line.stops.findIndex((id, q) => `${id}>${line.stops[q + 1]}` === key);
      const leg = line.legs[i];
      if (i < 0 || !leg || !Array.isArray(pts) || pts.length < 2) { console.warn(`route-edits: ruas "${key}" di ${lineId} tidak ada, diabaikan`); continue; }
      const near = (p, q) => Math.abs(p[0] - q[0]) < TOL && Math.abs(p[1] - q[1]) < TOL;
      if (!near(pts[0], leg[0]) || !near(pts.at(-1), leg.at(-1))) { console.warn(`route-edits: ujung ruas "${key}" di ${lineId} berubah, diabaikan`); continue; }
      line.legs[i] = [leg[0], ...pts.slice(1, -1), leg.at(-1)];
      (used[lineId] ??= {})[key] = pts;
    }
  }
  return used;
}
