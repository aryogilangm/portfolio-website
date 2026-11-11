import { MAP_BASE_ZOOM, style } from './scale.js';
import { lineBus, lineBusStroke } from './theme.js';
import { lampDefs, makeLamp, LAMP_DEFAULT, LAMPS, HALO_DEFAULT, HALOS } from './bus-lamp.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ---------- Aturan animasi bus (ilustratif, bukan lokasi nyata) ----------
// Tiap rute satu arah (mis. Kejawan Putih Tambak -> UNESA) punya BUSES_PER_ROUTE bus yang berjalan beriringan dengan jarak
// STOP_GAP halte. Bus berhenti DWELL detik di tiap halte, memulai dengan pelan (ease-in), berjalan dengan kecepatan stabil,
// lalu melambat lagi (ease-out) sampai berhenti di halte berikutnya.
const BUSES_PER_ROUTE = 3;
const STOP_GAP = 4; // jarak antar bus dalam satu rute, dalam jumlah halte
const DWELL_DEFAULT = 1.5; // detik berhenti di halte (meta.animation.dwell menimpa)
const SPEED_DEFAULT = 100; // unit peta per detik di kecepatan stabil (meta.animation.speed menimpa)
const RAMP = 0.55; // detik untuk berakselerasi dari berhenti sampai kecepatan stabil (dan sebaliknya)
const HEADING_PX = 6; // px (zoom dasar): jendela untuk membaca arah jalan di titik bus
const TURN_RATE = 14; // 1/detik: seberapa cepat arah bus menyusul arah jalan (tikungan dan putar balik dilalui dengan berputar halus, tidak berkedip)
const NEAR_UNITS = 25;

const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Jarak yang ditempuh (0..len) pada detik ke-tau dari satu perjalanan T detik: kecepatan naik halus (kosinus) selama RAMP,
// stabil, lalu turun halus selama RAMP. T = len / kecepatan + RAMP.
function travelled(tau, T, len, ramp) {
  if (tau <= 0) return 0;
  if (tau >= T) return len;
  const v = len / (T - ramp);
  const rise = (t) => v * (t / 2 - (ramp / (2 * Math.PI)) * Math.sin((Math.PI * t) / ramp));
  if (tau <= 0) return 0;
  if (tau >= T) return len;
  if (tau < ramp) return rise(tau);
  if (tau > T - ramp) return len - rise(T - tau);
  return v * (ramp / 2 + (tau - ramp));
}

// ---------- Rantai jalur ----------
// Jalur yang berakhir di halte tempat jalur lain berangkat (id halte sama) disambung, begitu juga jalur putar balik yang ujungnya
// dekat awal jalur berikutnya. Bus tidak pernah hilang: ia terus ke jalur berikutnya dan akhirnya kembali ke awal.
function buildChains(routes) {
  const succ = new Map();
  for (const r of routes) {
    const last = r.stopIds.at(-1);
    let next = routes.find((o) => o !== r && o.line.corridor === r.line.corridor && o.stopIds[0] === last);
    if (!next && r.line.turn) {
      const end = r.center.at(-1);
      next = routes.find((o) => o !== r && o.line.corridor === r.line.corridor && dist2(end, o.center[0]) < NEAR_UNITS);
    }
    if (next) succ.set(r, next);
  }
  const chains = [];
  const seen = new Set();
  for (const r of routes) {
    if (seen.has(r) || !succ.has(r)) continue;
    const chain = [r];
    seen.add(r);
    for (let n = succ.get(r); n && !seen.has(n); n = succ.get(n)) { chain.push(n); seen.add(n); }
    chains.push(chain);
  }
  return chains;
}

// Cincin halte ujung bersama digambar di titik awal jalur berikutnya. Apakah titik itu ada di belakang ujung jalur sebelumnya
// (menurut arah datang)? Bila ya, bus berhenti di titik itu pada jalur sebelumnya, sebelum ujungnya, bukan di ujung.
function ringBehind(prev, next) {
  const iE = prev.stopIdx.at(-1);
  const e = prev.points[iE];
  let j = iE - 1;
  while (j > 0 && dist2(prev.points[j], e) < 1e-6) j--;
  const ring = next.points[next.stopIdx[0]];
  return (ring.x - e.x) * (e.x - prev.points[j].x) + (ring.y - e.y) * (e.y - prev.points[j].y) < -1e-6;
}

// ---------- Jalur tempuh bus ----------
// Satu polyline tertutup dari titik jalur yang tergambar (bukan garis tengah), jadi bus melewati lengkung putar balik dan tikungan
// tajam dengan jarak sungguhan (dulu jaraknya nol dan bus meloncat). `rests` = titik berhenti (halte) berurutan sepanjang rantai.
function buildTrack(chain, stops) {
  const pts = [];
  const cum = [];
  const rests = []; // { s }
  const starts = []; // s awal tiap jalur di rantai
  const baseRest = []; // indeks `rests` tempat tiap jalur berangkat
  let closeStraight = false; // jalur pertama berangkat dari halte bersama tanpa lengkung dengan jalur terakhir
  const push = (p) => {
    const q = pts.at(-1);
    if (q && dist2(q, p) < 1e-6) return cum.length - 1;
    cum.push(q ? cum.at(-1) + dist2(q, p) : 0);
    pts.push({ x: p.x, y: p.y });
    return pts.length - 1;
  };
  chain.forEach((r, ci) => {
    const prev = chain[(ci - 1 + chain.length) % chain.length];
    const next = chain[(ci + 1) % chain.length];
    const n = r.stopIds.length;
    const first = r.stopIdx[0];
    const last = r.stopIdx[n - 1];
    const end = r.line.turn ? r.points.length - 1 : last; // lengkung putar balik dilewati; ekor garis (tail) tidak
    const sharedPrev = prev !== r && prev.stopIds.at(-1) === r.stopIds[0];
    const sharedNext = next !== r && next.stopIds[0] === r.stopIds[n - 1];
    const apexOf = (id) => stops?.[id]?.marker === 'apex';
    // Halte bersama tanpa lengkung putar balik (mis. Tunjungan, Terminal Benowo di R5): bus berhenti sekali di ujung jalur sebelumnya
    // lalu langsung lanjut. Titik awal jalur ini dilewati supaya selisih kecil posisi dua halte tidak membuat bus mundur sedikit.
    const straightPrev = sharedPrev && !apexOf(prev.stopIds.at(-1)) && !prev.line.turn && ringBehind(prev, r);
    if (ci === 0) closeStraight = straightPrev;
    let startK = first;
    if (straightPrev && pts.length > 1) {
      // Lewati titik awal yang letaknya di belakang ujung jalur sebelumnya (menurut arah datang), supaya bus tidak mundur.
      const e = pts.at(-1);
      const d = { x: e.x - pts.at(-2).x, y: e.y - pts.at(-2).y };
      while (startK < end && (r.points[startK].x - e.x) * d.x + (r.points[startK].y - e.y) * d.y < 1e-6) startK++;
    }
    const at = new Map();
    for (let k = startK; k <= end; k++) at.set(k, push(r.points[k]));
    starts.push(cum[at.get(startK)]);
    const sOf = (k) => cum[at.get(k)];
    // Halte ujung bersama: bila ditandai apex, bus berhenti sekali di puncak lengkung (atau di ujung jalur bila tanpa lengkung);
    // bila tidak, bus berhenti di halte awal jalur berikutnya. Setelah berhenti ia langsung lanjut ke jalur berikutnya.
    const mergedAtPrev = sharedPrev && (apexOf(prev.stopIds.at(-1)) || straightPrev);
    r.stopIds.forEach((id, i) => {
      if (i === 0) {
        if (mergedAtPrev) { baseRest.push(ci === 0 ? -1 : rests.length - 1); return; }
        baseRest.push(rests.length);
        rests.push({ s: sOf(first) });
        return;
      }
      if (i === n - 1 && sharedNext) {
        if (apexOf(id)) {
          // Puncak lengkung: titik yang sama dengan tempat cincin halte digambar (render.js), supaya bus berhenti tepat di cincin.
          const tip = last + 1 + Math.round((r.points.length - last - 3) / 2);
          rests.push({ s: r.line.turn && r.line.cap !== 'square' && at.has(tip) ? sOf(tip) : sOf(last) });
        }
        else if (!r.line.turn && ringBehind(r, next)) {
          // Berhenti tepat di cincin halte (di jalur ini, sebelum ujungnya), bukan di ujung jalur.
          const pi = at.get(last);
          const ring = next.points[next.stopIdx[0]];
          const a = pts[pi - 1];
          const b = pts[pi];
          const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2 || 1;
          const u = Math.max(0, Math.min(1, ((ring.x - a.x) * (b.x - a.x) + (ring.y - a.y) * (b.y - a.y)) / len2));
          rests.push({ s: cum[pi - 1] + u * (cum[pi] - cum[pi - 1]) });
        }
        return;
      }
      rests.push({ s: sOf(r.stopIdx[i]) });
    });
  });
  // Penutup rantai: ujung terakhir menyambung ke titik awal pertama. Titik awal yang letaknya di belakang ujung terakhir dibuang
  // (menurut arah datang), jadi bus tidak mundur sedikit di halte bersama (mis. Terminal Benowo).
  if (closeStraight && pts.length > 2) {
    const e = pts.at(-1);
    const d = { x: e.x - pts.at(-2).x, y: e.y - pts.at(-2).y };
    let k = 0;
    while (k < pts.length - 2 && (pts[k].x - e.x) * d.x + (pts[k].y - e.y) * d.y < 1e-6) k++;
    if (k > 0) {
      const shift = cum[k];
      pts.splice(0, k);
      cum.splice(0, k);
      for (let i = 0; i < cum.length; i++) cum[i] -= shift;
      rests.forEach((q) => { q.s -= shift; });
      starts.forEach((q, i) => { starts[i] = Math.max(0, q - shift); });
    }
  }
  const closeLen = dist2(pts.at(-1), pts[0]);
  const L = cum.at(-1) + closeLen;
  // Rantai yang jalur pertamanya berangkat dari halte bersama yang dibuat di akhir jalur terakhir: indeks dasarnya halte itu.
  if (baseRest[0] === -1) baseRest[0] = rests.length - 1;
  return { pts, cum, L, closeLen, rests, starts, baseRest };
}

// Titik di jalur tempuh pada jarak s (tertutup), dengan arah yang dirata-ratakan di sekitar s.
function trackPoint(track, s) {
  const { pts, cum, L } = track;
  const m = ((s % L) + L) % L;
  const sEnd = cum.at(-1);
  if (m >= sEnd) {
    const a = pts.at(-1);
    const b = pts[0];
    const t = L - sEnd > 1e-9 ? (m - sEnd) / (L - sEnd) : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  let lo = 0;
  let hi = cum.length - 2;
  if (hi < 0) return { ...pts[0] };
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cum[mid] <= m) lo = mid;
    else hi = mid - 1;
  }
  const a = pts[lo];
  const b = pts[lo + 1];
  const t = (m - cum[lo]) / (cum[lo + 1] - cum[lo] || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function poseAt(track, s, w) {
  const p = trackPoint(track, s);
  const a = trackPoint(track, s - w);
  const b = trackPoint(track, s + w);
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 1e-6) { dx = b.x - p.x; dy = b.y - p.y; }
  return { x: p.x, y: p.y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

// Jalur (di rantai) yang sedang dilewati pada jarak s: dipakai untuk warna dan sorotan koridor.
function routeAt(track, chain, s) {
  const m = ((s % track.L) + track.L) % track.L;
  let ci = 0;
  for (let k = 0; k < track.starts.length; k++) if (m >= track.starts[k] - 1e-9) ci = k;
  return chain[ci];
}

// ---------- Jadwal satu rantai ----------
function buildTimeline(track, speed, dwell) {
  const K = track.rests.length;
  const events = []; // { t0 (mulai berhenti), t1 (mulai jalan), t2 (tiba), s0, s1 (jarak tempuh mutlak, naik terus) }
  let t = 0;
  for (let k = 0; k < K; k++) {
    const s0 = track.rests[k].s;
    let s1 = track.rests[(k + 1) % K].s;
    if (s1 <= s0 + 1e-9) s1 += track.L; // melewati penutup rantai
    const len = s1 - s0;
    const ramp = Math.min(RAMP, (len / speed) * 0.5);
    const T = len < 1e-6 ? 0 : len / speed + ramp;
    events.push({ t0: t, t1: t + dwell, t2: t + dwell + T, s0, len, T, ramp });
    t += dwell + T;
  }
  return { events, cycle: t };
}

function stateAt(timeline, time) {
  const { events, cycle } = timeline;
  const t = ((time % cycle) + cycle) % cycle;
  let lo = 0;
  let hi = events.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (events[mid].t0 <= t) lo = mid;
    else hi = mid - 1;
  }
  const e = events[lo];
  if (t < e.t1) return e.s0;
  return e.s0 + travelled(t - e.t1, e.T, e.len, e.ramp);
}

function buildUnit(chain, { speed, dwell, stops }) {
  const track = buildTrack(chain, stops);
  const timeline = buildTimeline(track, speed, dwell);
  return { chain, track, timeline };
}

export function createBuses(routes, layer, { speed = SPEED_DEFAULT, dwell = DWELL_DEFAULT, stops } = {}) {
  const opts = { speed, dwell, stops };
  const buses = [];
  let active = null;
  const chains = buildChains(routes);
  const chained = new Set(chains.flat());
  const groups = [...chains, ...routes.filter((r) => !chained.has(r)).map((r) => [r])];
  let units = groups.map((chain) => buildUnit(chain, opts));

  // Tiap jalur satu arah mendapat BUSES_PER_ROUTE bus, berjarak STOP_GAP halte, mulai dari halte awal jalur itu.
  lampDefs(layer);
  const lampParam = new URLSearchParams(location.search).get('lampu');
  const lampStyle = LAMPS.includes(lampParam) ? lampParam : LAMP_DEFAULT;
  const haloParam = new URLSearchParams(location.search).get('halo');
  const haloStyle = HALOS.includes(haloParam) ? haloParam : HALO_DEFAULT;
  const phaseOf = (unit, ci, j) => {
    const { rests } = unit.track;
    const k = (unit.track.baseRest[ci] + j * STOP_GAP) % rests.length;
    return unit.timeline.events[k].t0;
  };
  units.forEach((unit, ui) => {
    unit.chain.forEach((route, ci) => {
      for (let j = 0; j < BUSES_PER_ROUTE; j++) {
        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'bus');
        // Badan bus (desain Figma): bingkai warna koridor (stroke) dengan isi warna border koridor (background).
        const outer = document.createElementNS(SVG_NS, 'rect');
        const inner = document.createElementNS(SVG_NS, 'rect');
        const bus = { ui, ci, j, route, g, outer, inner };
        bus.lamp = makeLamp(g, lampStyle, haloStyle); // di belakang badan; hanya tampil di Night
        g.append(outer, inner);
        layer.append(g);
        paintBus(bus);
        buses.push(bus);
      }
    });
  });

  function paintBus(b) {
    b.outer.style.fill = lineBusStroke(b.route.line);
    b.inner.style.fill = lineBus(b.route.line);
    for (const t of b.lamp.tints) t.style.fill = lineBusStroke(b.route.line);
  }
  function sizeBodies() {
    for (const b of buses) {
      const w = b.route.geo ? style.busSize : b.route.width;
      const h = w + 2; // lebar badan (melintang jalan)
      const l = (w + 1) * 2; // panjang badan (searah jalan)
      const k = Math.min(style.busStroke, h / 2 - 0.1); // tebal bingkai (alat lab/tampilan)
      const rx = Math.min(style.busRadius, h / 2); // radius sudut luar
      const set = (el, x, y, width, height, rx) => {
        el.setAttribute('x', x.toFixed(3));
        el.setAttribute('y', y.toFixed(3));
        el.setAttribute('width', width.toFixed(3));
        el.setAttribute('height', height.toFixed(3));
        el.setAttribute('rx', rx.toFixed(3));
      };
      set(b.outer, -l / 2, -h / 2, l, h, rx);
      set(b.inner, -l / 2 + k, -h / 2 + k, l - 2 * k, h - 2 * k, Math.max(0, rx - k));
      b.lamp.size(l, h, rx, set);
    }
  }
  sizeBodies();

  let lastTime = 0;
  function place(time) {
    const dt = time - lastTime;
    lastTime = time;
    const follow = dt > 0 && dt < 0.25 ? 1 - Math.exp(-TURN_RATE * dt) : 1; // lompatan waktu (jeda, ganti gaya): langsung ke arah jalan
    for (const b of buses) {
      const unit = units[b.ui];
      const s = stateAt(unit.timeline, time + phaseOf(unit, b.ci, b.j));
      const route = routeAt(unit.track, unit.chain, s);
      if (route !== b.route) { b.route = route; paintBus(b); }
      if (active) b.g.classList.toggle('off', !active.has(route.id));
      const geo = route.geo;
      const w = geo ? HEADING_PX / MAP_BASE_ZOOM : 12;
      const pose = poseAt(unit.track, s, w);
      const { x, y } = pose;
      let angle = pose.angle;
      if (b.angle !== undefined && follow < 1) {
        const diff = ((((pose.angle - b.angle) % 360) + 540) % 360) - 180; // selisih terpendek, -180..180
        angle = b.angle + diff * follow;
      }
      b.angle = ((((angle + 180) % 360) + 360) % 360) - 180; // tetap dalam -180..180
      angle = b.angle;
      const scale = geo ? ` scale(${(1 / MAP_BASE_ZOOM).toFixed(4)})` : '';
      b.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})${scale}`);
    }
  }

  return {
    place,
    // Gaya garis berubah (lebar, jarak lajur): titik jalur ikut berubah, jadi jalur tempuh dan jadwal dibangun ulang.
    restyle() {
      units = groups.map((chain) => buildUnit(chain, opts));
      sizeBodies();
      place(lastTime);
    },
    applyActive(a) {
      active = a;
      for (const b of buses) b.g.classList.toggle('off', !a.has(b.route.id));
    },
  };
}
