import { normalizeEntry } from './validate.js';
import { projector } from './geo.js';

export const gridOf = (net) => net.meta.grid ?? 48;
const LINE_SPACING = 8;
const CORNER_RADIUS = 12;
const DEFAULT_WIDTH = { koridor: 9, wirawiri: 6 };

const edgeKey = (a, b) => [a, b].sort().join('|');
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// Titik belok antara a dan b supaya jalur hanya lurus atau 45°.
function bendPoints(a, b, mode) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  if (adx === 0 || ady === 0 || adx === ady) return [];
  const diag = Math.min(adx, ady);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const corner = mode === 'diag-first'
    ? { x: a.x + sx * diag, y: a.y + sy * diag }
    : { x: b.x - sx * diag, y: b.y - sy * diag };
  return [corner];
}

const flip = (mode) => (mode === 'diag-first' ? 'straight-first' : 'diag-first');

// Bentuk ruas selalu dihitung dari halte ber-id lebih kecil ke yang lebih besar, apa pun arah rute
// melewatinya. Dengan begitu dua rute (atau dua arah rute loop) yang berbagi ruas tergambar identik.
function edgeShape(anchors, reversed) {
  const seq = reversed ? [...anchors].reverse() : anchors;
  const pts = [seq[0].p];
  for (let i = 1; i < seq.length; i++) {
    const owner = reversed ? seq[i - 1] : seq[i]; // anchor yang membawa pilihan bend ruas ini
    const mode = reversed
      ? (owner.bend ? flip(owner.bend) : 'straight-first')
      : (owner.bend ?? 'straight-first');
    pts.push(...bendPoints(seq[i - 1].p, seq[i].p, mode), seq[i].p);
  }
  return pts;
}

// Pecah satu rute menjadi ruas antar-halte (dalam koordinat grid).
function edgesOf(line, stops) {
  const edges = [];
  let current = null;
  const entries = line.stops.map(normalizeEntry);
  // Rute loop menutup sendiri: halte terakhir tersambung kembali ke halte pertama.
  if (line.loop) entries.push({ stop: entries[0].stop });
  for (const entry of entries) {
    const bend = entry.bend ?? line.bend;
    if (entry.stop !== undefined) {
      const p = { x: stops[entry.stop].x, y: stops[entry.stop].y };
      if (current) {
        current.anchors.push({ p, bend });
        current.to = entry.stop;
        current.reversed = current.from > current.to;
        current.pts = edgeShape(current.anchors, current.reversed);
        edges.push(current);
      }
      current = { from: entry.stop, to: null, anchors: [{ p }] };
    } else {
      current.anchors.push({ p: { x: entry.wp[0], y: entry.wp[1] }, bend });
    }
  }
  return edges;
}

function dedupe(pts) {
  return pts.filter((p, i) => i === 0 || dist(pts[i - 1], p) > 0.01);
}

// Geser polyline tegak lurus sejauh d (dengan miter) supaya rute yang berbagi ruas tidak menumpuk.
function offsetPolyline(pts, d) {
  if (!d) return pts;
  const normals = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.hypot(dx, dy);
    normals.push({ x: -dy / len, y: dx / len });
  }
  return pts.map((p, i) => {
    const a = normals[i - 1];
    const b = normals[i];
    let n;
    let scale = 1;
    if (!a) n = b;
    else if (!b) n = a;
    else {
      const sx = a.x + b.x;
      const sy = a.y + b.y;
      const l = Math.hypot(sx, sy);
      if (l < 1e-6) n = b; // putar balik 180°: tidak ada sudut tengah
      else {
        n = { x: sx / l, y: sy / l };
        scale = 1 / Math.max(0.5, n.x * a.x + n.y * a.y);
      }
    }
    return { x: p.x + n.x * d * scale, y: p.y + n.y * d * scale };
  });
}

function roundedPath(pts) {
  const f = (n) => Math.round(n * 100) / 100;
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const l1 = dist(a, b);
    const l2 = dist(b, c);
    const r = Math.min(CORNER_RADIUS, l1 / 2, l2 / 2);
    const p1 = { x: b.x + ((a.x - b.x) / l1) * r, y: b.y + ((a.y - b.y) / l1) * r };
    const p2 = { x: b.x + ((c.x - b.x) / l2) * r, y: b.y + ((c.y - b.y) / l2) * r };
    d += ` L${f(p1.x)} ${f(p1.y)} Q${f(b.x)} ${f(b.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  const last = pts.at(-1);
  return `${d} L${f(last.x)} ${f(last.y)}`;
}

// Hasil: satu "route" per rute dengan polyline piksel, jarak tiap halte, dan path SVG.
export function buildRoutes(net, moves = {}) {
  return net.meta.projection === 'geo' ? buildGeoRoutes(net, moves) : buildSchematicRoutes(net);
}

// Peta geografis: bentuk jalan dari line.legs (lat/lng) sebagai garis tengah. Tiap jalur digeser ke kiri arah
// jalannya (lalu lintas Indonesia di sisi kiri) sejauh GEO_LANE_PX piksel layar, jadi dua arah di jalan yang sama
// tergambar berdampingan dengan jarak tetap berapa pun zoomnya. `layout(px)` menghitung ulang posisi untuk offset itu.
export const GEO_LANE_PX = 4;
const GEO_LINE_WIDTH = { koridor: 8, wirawiri: 5 };
const TURN_STEPS = 10;
const TURN_STRAIGHT = 3; // lurus melewati halte sebelum berputar, dalam kelipatan jarak lajur dasar (sama untuk semua slot, jadi lengkung bersarang)

// Vektor offset untuk putar balik: lurus sedikit melewati titik, setengah lingkaran, lalu kembali ke lajur arah
// berlawanan. `side` = vektor lajur sebelum berbalik, `t` = arah jalan.
function capUnits(side, t, straight = TURN_STRAIGHT) {
  const out = [];
  for (let k = 0; k <= TURN_STEPS; k++) {
    const phi = (Math.PI * k) / TURN_STEPS;
    out.push({ x: side.x * Math.cos(phi) + t.x * Math.sin(phi), y: side.y * Math.cos(phi) + t.y * Math.sin(phi), ax: t.x * straight, ay: t.y * straight });
  }
  out.push({ x: -side.x, y: -side.y, ax: 0, ay: 0 });
  return out;
}

// Putar balik persegi ("lurus lalu belok"): lurus sedikit melewati titik, menyeberang ke lajur arah berlawanan, lalu kembali.
const SQUARE_STRAIGHT = 2.5; // dalam kelipatan jarak lajur dasar
function squareCapUnits(side, t, straight = SQUARE_STRAIGHT) {
  return [
    { x: side.x, y: side.y, ax: t.x * straight, ay: t.y * straight },
    { x: -side.x, y: -side.y, ax: t.x * straight, ay: t.y * straight },
    { x: -side.x, y: -side.y, ax: 0, ay: 0 },
  ];
}

// Jalur yang berbalik arah 180° di tengah (mis. terminal di tengah rute) diberi putar balik membulat,
// bukan ujung datar. Mengembalikan peta indeks lama -> indeks baru.
// mode: "square" = ujung persegi, "flat" = persegi tanpa ruas lurus (langsung menyeberang, mis. R5 sebelum diagonal).
// roundAt: titik balik tertentu yang tetap dibulatkan walau mode-nya persegi/datar (line.uturnRound).
function insertUturns(center, unit, mode = false, roundAt = []) {
  const c2 = [];
  const u2 = [];
  const map = [];
  center.forEach((p, i) => {
    map[i] = c2.length;
    const a = center[i - 1];
    const b = center[i + 1];
    let reversal = false;
    let t;
    if (a && b) {
      const l1 = dist(a, p);
      const l2 = dist(p, b);
      reversal = ((p.x - a.x) * (b.x - p.x) + (p.y - a.y) * (b.y - p.y)) / (l1 * l2) < -0.98;
      t = { x: (p.x - a.x) / l1, y: (p.y - a.y) / l1 };
    }
    if (!reversal) {
      c2.push(p);
      u2.push(unit[i]);
      return;
    }
    const inLane = { x: t.y, y: -t.x }; // kiri arah masuk (vektor satuan; miter di titik balik tidak bisa dipakai)
    c2.push(p);
    u2.push(inLane);
    const round = roundAt.some((q) => dist(p, q) < 1);
    for (const u of (round || !mode ? capUnits(inLane, t) : mode === "flat" ? squareCapUnits(inLane, t, 0) : squareCapUnits(inLane, t))) {
      c2.push({ ...p });
      u2.push(u);
    }
  });
  return { center: c2, unit: u2, map };
}

// Kunci geseran sebuah kemunculan halte di jalur: id untuk kemunculan pertama, "id@2", "id@3"... untuk berikutnya (halte yang
// dilewati lebih dari sekali di jalur yang sama, mis. halte seberang di jalan pulang-pergi).
export function stopKey(stops, i) {
  const id = stops[i];
  let n = 1;
  for (let k = 0; k < i; k++) if (stops[k] === id) n++;
  return n === 1 ? id : id + '@' + n;
}

// Geser halte sepanjang garis tengah: `distances` = { idHalte: jarak dari awal jalur (unit peta) }. Titik baru disisipkan
// di jarak itu (offset dan arah diinterpolasi) dan menjadi titik halte. Mengembalikan indeks halte yang baru.
function moveStops(center, unit, stopIdx, stops, distances) {
  const todo = stops.map((id, i) => ({ i, d: distances[stopKey(stops, i)] })).filter((m) => Number.isFinite(m.d)).sort((a, b) => b.d - a.d);
  for (const { i, d } of todo) {
    const cum = [0];
    for (let k = 1; k < center.length; k++) cum.push(cum[k - 1] + dist(center[k - 1], center[k]));
    const target = Math.min(Math.max(d, 0), cum.at(-1));
    let j = 0;
    while (j < center.length - 2 && cum[j + 1] <= target) j++;
    const span = cum[j + 1] - cum[j];
    const t = span > 1e-9 ? (target - cum[j]) / span : 0;
    if (t < 1e-6) { stopIdx[i] = j; continue; }
    if (t > 1 - 1e-6) { stopIdx[i] = j + 1; continue; }
    const lerp = (a, b) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    center.splice(j + 1, 0, lerp(center[j], center[j + 1]));
    unit.splice(j + 1, 0, lerp(unit[j], unit[j + 1]));
    for (let q = 0; q < stopIdx.length; q++) if (stopIdx[q] > j) stopIdx[q] += 1;
    stopIdx[i] = j + 1;
  }
}

// Jalur dari koridor berbeda yang satu arah di jalan yang sama berbagi garis tengah; jalur yang indeksnya lebih besar
// digeser satu "slot" (selebar garis) lebih ke kiri supaya keduanya terlihat berdampingan.
const SLOT_EPS = 0.8; // unit peta: titik sedekat ini dari garis tengah jalur lain dianggap satu jalan

function tangentAt(c, i) {
  for (let j = i; j < c.length - 1; j++) {
    const l = dist(c[j], c[j + 1]);
    if (l > 1e-6) return { x: (c[j + 1].x - c[j].x) / l, y: (c[j + 1].y - c[j].y) / l };
  }
  for (let j = i; j > 0; j--) {
    const l = dist(c[j - 1], c[j]);
    if (l > 1e-6) return { x: (c[j].x - c[j - 1].x) / l, y: (c[j].y - c[j - 1].y) / l };
  }
  return { x: 1, y: 0 };
}

// Indeks ruas garis tengah c yang dilewati titik p searah dengan t (dekat dan sejajar), atau -1.
function alongIndex(c, p, t) {
  for (let k = 0; k < c.length - 1; k++) {
    const a = c[k];
    const b = c[k + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 < 1e-9) continue;
    const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    if (Math.hypot(p.x - a.x - dx * u, p.y - a.y - dy * u) > SLOT_EPS) continue;
    if ((dx * t.x + dy * t.y) / Math.sqrt(l2) >= 0.7) return k;
  }
  return -1;
}

// Slot jalur: urutan lajur berdampingan di jalan yang dipakai bersama jalur lain yang searah. Slot dihitung per ruas (ruas =
// bagian garis tengah antara dua titik); bergantinya slot hanya terjadi di sudut, di mana lajur kedua ruas dipotongkan bersih
// (lihat layout), jadi tidak ada geseran miring di tengah jalan.
//  - jalur biasa: satu slot tetap di seluruh jalur (terkecil yang tidak dipakai jalur lebih awal di mana pun), supaya jalur
//    yang lurus terus tidak membelok saat jalur lain bergabung atau pergi;
//  - jalur `slotMode: "adaptive"` (koridor yang menumpang di jalan jalur lain): di ruas yang dibagi ia ada di luar semua jalur
//    yang sudah ada, di ruas yang tidak dibagi ia rapat di lajurnya sendiri. Slot tetap sama sepanjang ruas lurus (sampai
//    sudut berikutnya), supaya tidak bertumpuk atau bergeser saat jalur lain pergi di tengah jalan lurus.
const mex = (used) => {
  let n = 0;
  while (used.has(n)) n++;
  return n;
};
function laneSlots(pre) {
  const slots = [];
  pre.forEach((r, a) => {
    const c = r.center;
    const n = c.length;
    const seg = []; // slot tiap ruas i (titik i -> i+1); null bila ruas sepanjang nol
    const used = [];
    for (let i = 0; i < n - 1; i++) {
      const len = dist(c[i], c[i + 1]);
      if (len < 1e-6) { seg.push(null); used.push(new Set()); continue; }
      const mid = { x: (c[i].x + c[i + 1].x) / 2, y: (c[i].y + c[i + 1].y) / 2 };
      const t = { x: (c[i + 1].x - c[i].x) / len, y: (c[i + 1].y - c[i].y) / len };
      const u = new Set();
      for (let b = 0; b < a; b++) {
        // Jalur satu koridor di jalan yang sama searah (mis. R5 awal dan akhir yang saling menumpang di ekor garis) memakai lajur
        // yang sama, bukan berdampingan.
        if (pre[b].line.corridor && pre[b].line.corridor === r.line.corridor) continue;
        const k = alongIndex(pre[b].center, mid, t);
        if (k >= 0) u.add(slots[b][k]);
      }
      used.push(u);
      seg.push(u.size ? Math.max(...u) + 1 : 0);
    }
    let out;
    if (r.line.slotMode === 'adaptive') {
      // ruas lurus berurutan (tanpa sudut) berbagi satu slot: yang terbesar di antaranya
      out = seg.slice();
      let i = 0;
      while (i < n - 1) {
        if (seg[i] === null) { i++; continue; }
        let j = i;
        const d0 = { x: c[i + 1].x - c[i].x, y: c[i + 1].y - c[i].y };
        let top = seg[i];
        for (let k = i + 1; k < n - 1; k++) {
          if (seg[k] === null) { j = k; continue; }
          const dk = { x: c[k + 1].x - c[k].x, y: c[k + 1].y - c[k].y };
          const cos = (d0.x * dk.x + d0.y * dk.y) / (Math.hypot(d0.x, d0.y) * Math.hypot(dk.x, dk.y));
          if (cos < 0.9995) break;
          top = Math.max(top, seg[k]);
          j = k;
        }
        for (let k = i; k <= j; k++) if (seg[k] !== null) out[k] = top;
        i = j + 1;
      }
    } else {
      const top = mex(new Set(used.flatMap((u) => [...u])));
      out = seg.map((v) => (v === null ? null : top));
    }
    // ruas sepanjang nol mengikuti ruas sebelumnya (atau sesudahnya)
    for (let i = 0; i < out.length; i++) if (out[i] === null) out[i] = out[i - 1] ?? out.find((v) => v !== null) ?? 0;
    out.push(out.at(-1) ?? 0);
    slots.push(out);
  });
  return slots;
}

function buildGeoRoutes(net, moves = {}) {
  const project = projector(net.meta.origin, net.meta.scale);
  const pre = net.lines.map((line) => {
    const center = [];
    const stopIdx = [];
    const push = (p) => {
      if (!center.length || dist(center.at(-1), p) > 0.01) center.push(p);
      return center.length - 1;
    };
    // Ekor garis (opsional): jalur yang diperpanjang sebelum halte pertama / sesudah halte terakhir, supaya halte ujung bisa
    // digeser ke sepanjang ekor itu (tanpa ekor, halte ujung hanya bisa bergerak ke arah dalam).
    (line.tailStart ?? []).forEach(([lat, lng]) => push(project(lat, lng)));
    line.legs.forEach((leg) => {
      const idx = leg.map(([lat, lng]) => push(project(lat, lng)));
      stopIdx.push(idx[0]);
    });
    stopIdx.push(center.length - 1);
    (line.tailEnd ?? []).forEach(([lat, lng]) => push(project(lat, lng)));

    // Vektor offset per titik (satu satuan = satu piksel layar ke kiri arah jalan).
    let unit = offsetPolyline(center, -1).map((q, i) => ({ x: q.x - center[i].x, y: q.y - center[i].y }));
    const { center: c2, unit: u2, map } = insertUturns(center, unit, line.uturn ?? false, (line.uturnRound ?? []).map(([lat, lng]) => project(lat, lng)));
    center.splice(0, center.length, ...c2);
    unit = u2;
    const stopIdxFinal = stopIdx.map((i) => map[i]);
    const lineMoves = moves[line.id] ?? {};
    if (Object.keys(lineMoves).length) {
      const units = Object.fromEntries(Object.entries(lineMoves).map(([id, m]) => [id, m / net.meta.scale]));
      moveStops(center, unit, stopIdxFinal, line.stops, units);
    }
    return { line, center, unit, stopIdx: stopIdxFinal };
  });

  const slots = laneSlots(pre);
  return pre.map((r0, ri) => {
    const { line } = r0;
    const { center, unit, stopIdx: stopIdxFinal } = r0;
    const slot = slots[ri].slice();
    const cum = [0];
    for (let k = 1; k < center.length; k++) cum.push(cum[k - 1] + dist(center[k - 1], center[k]));
    const length = cum.at(-1);

    // Putar balik di ujung jalur: setengah lingkaran dari lajur jalur ini ke lajur arah berlawanan.
    if (line.turn) {
      const last = center.at(-1);
      const prev = center.at(-2);
      const l = dist(prev, last) || 1;
      const t = { x: (last.x - prev.x) / l, y: (last.y - prev.y) / l };
      for (const u of (line.cap === 'square' ? squareCapUnits : capUnits)(unit.at(-1), t)) {
        center.push({ ...last });
        unit.push(u);
        slot.push(slot.at(-1));
        cum.push(length);
      }
    }

    const f = (n) => Math.round(n * 10) / 10;
    const route = {
      id: line.id,
      line,
      geo: true,
      width: line.width ?? GEO_LINE_WIDTH[line.type] ?? 3,
      center,
      unit,
      slot,
      points: center.map((p) => ({ ...p })),
      cum,
      length,
      stopIds: line.stops,
      stopIdx: stopIdxFinal,
      stopDist: stopIdxFinal.map((k) => cum[k]),
      path: '',
      // px: jarak lajur dari garis tengah; pitch: lebar satu slot (jalur koridor lain di jalan yang sama).
      layout(px, pitch = 0) {
        const n = center.length;
        const leftOf = (a, b) => {
          const l = dist(a, b);
          return l < 1e-6 ? null : { x: (b.y - a.y) / l, y: -(b.x - a.x) / l };
        };
        center.forEach((c, i) => {
          const sIn = i > 0 ? slot[i - 1] : slot[i];
          const dOut = px + slot[i] * pitch;
          const dIn = px + sIn * pitch;
          if (sIn !== slot[i] && i > 0 && i < n - 1) {
            // Slot berganti di sudut ini: lajur ruas sebelum dan sesudahnya dipotongkan (tanpa geseran miring).
            let p0 = i - 1;
            while (p0 > 0 && dist(center[p0], c) < 1e-6) p0--;
            let p1 = i + 1;
            while (p1 < n - 1 && dist(center[p1], c) < 1e-6) p1++;
            const na = leftOf(center[p0], c);
            const nb = leftOf(c, center[p1]);
            const det = na && nb ? na.x * nb.y - na.y * nb.x : 0;
            if (Math.abs(det) > 0.05) {
              this.points[i].x = c.x + (dIn * nb.y - dOut * na.y) / det;
              this.points[i].y = c.y + (na.x * dOut - nb.x * dIn) / det;
              return;
            }
          }
          this.points[i].x = c.x + unit[i].x * dOut + (unit[i].ax ?? 0) * px;
          this.points[i].y = c.y + unit[i].y * dOut + (unit[i].ay ?? 0) * px;
        });
        collapsePinch(center, this.points);
        this.path = `M${this.points.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L')}`;
      },
    };
    route.layout(GEO_LANE_PX);
    return route;
  });
}

// Di sisi dalam belokan, lajur yang jauh dari garis tengah "terjepit": halte atau titik lain yang lebih dekat ke sudut daripada
// jarak lajur ikut terseret ke seberang sudut, sehingga ruas lajur terbalik arah dan membentuk tonjolan. Ruas yang terbalik
// diciutkan ke satu titik, yaitu perpotongan lajur sebelum dan sesudahnya, jadi sudutnya tetap bersih dan bisa dibulatkan.
function collapsePinch(center, pts) {
  const n = center.length;
  const rev = (i) => {
    const cx = center[i + 1].x - center[i].x;
    const cy = center[i + 1].y - center[i].y;
    if (Math.hypot(cx, cy) < 1e-6) return false;
    return (pts[i + 1].x - pts[i].x) * cx + (pts[i + 1].y - pts[i].y) * cy < -1e-6;
  };
  for (let i = 0; i < n - 1; i++) {
    if (!rev(i)) continue;
    let j = i;
    while (j < n - 1 && rev(j)) j++; // titik i..j berada di ruas yang terbalik
    const before = i - 1;
    const after = j + 1;
    if (before < 0 || after >= n) { i = j; continue; }
    const d1 = { x: center[i].x - center[before].x, y: center[i].y - center[before].y };
    const d2 = { x: center[after].x - center[j].x, y: center[after].y - center[j].y };
    const det = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(det) < 1e-9) { i = j; continue; }
    const t = ((pts[after].x - pts[before].x) * d2.y - (pts[after].y - pts[before].y) * d2.x) / det;
    const X = { x: pts[before].x + d1.x * t, y: pts[before].y + d1.y * t };
    for (let q = i; q <= j; q++) { pts[q].x = X.x; pts[q].y = X.y; }
    i = j;
  }
}

// Posisi tiap halte (unit peta). Mode geografis: titik di jalur pertama yang melewatinya.
export function stopPositions(net, routes) {
  const positions = new Map();
  if (net.meta.projection === 'geo') {
    for (const r of routes) r.stopIds.forEach((id, i) => positions.has(id) || positions.set(id, r.points[r.stopIdx[i]]));
  } else {
    const grid = gridOf(net);
    for (const [id, s] of Object.entries(net.stops)) positions.set(id, { x: s.x * grid, y: s.y * grid });
  }
  return positions;
}

function buildSchematicRoutes(net) {
  const GRID = gridOf(net);
  const lineEdges = net.lines.map((line) => edgesOf(line, net.stops));
  const sharing = new Map();
  net.lines.forEach((line, i) => {
    for (const edge of lineEdges[i]) {
      edge.key = edgeKey(edge.from, edge.to);
      if (!sharing.has(edge.key)) sharing.set(edge.key, []);
      // Rute loop melewati ruas yang sama dua kali (dua arah): cukup digambar sekali.
      if (!sharing.get(edge.key).includes(line.id)) sharing.get(edge.key).push(line.id);
    }
  });

  return net.lines.map((line, i) => {
    const points = [];
    const stopIdx = [];
    const stopIds = [];
    const push = (p) => {
      if (!points.length || dist(points.at(-1), p) > 0.01) points.push(p);
      return points.length - 1;
    };

    lineEdges[i].forEach((edge, ei) => {
      const sharers = sharing.get(edge.key);
      const offset = (sharers.indexOf(line.id) - (sharers.length - 1) / 2) * LINE_SPACING;
      // Titik ruas sudah dalam arah kanonik, jadi offset dua rute berlawanan arah tetap berdampingan.
      let px = dedupe(edge.pts.map((p) => ({ x: p.x * GRID, y: p.y * GRID })));
      px = offsetPolyline(px, offset);
      if (edge.reversed) px.reverse();

      const first = px.map(push);
      if (ei === 0) {
        stopIdx.push(first[0]);
        stopIds.push(edge.from);
      }
      stopIdx.push(first.at(-1));
      stopIds.push(edge.to);
    });

    const cum = [0];
    for (let k = 1; k < points.length; k++) cum.push(cum[k - 1] + dist(points[k - 1], points[k]));

    return {
      id: line.id,
      line,
      width: line.width ?? DEFAULT_WIDTH[line.type] ?? 8,
      points,
      cum,
      length: cum.at(-1),
      stopIds,
      stopIdx,
      stopDist: stopIdx.map((k) => cum[k]),
      path: roundedPath(points),
    };
  });
}

// Peta halte -> daftar id rute yang melewatinya.
export function stopLines(routes) {
  const map = new Map();
  for (const r of routes) {
    for (const id of new Set(r.stopIds)) {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(r.id);
    }
  }
  return map;
}

export function pointAt(route, d) {
  const { cum, points } = route;
  let lo = 0;
  let hi = cum.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid - 1;
  }
  const a = points[lo];
  const b = points[lo + 1];
  const t = (d - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
  };
}
