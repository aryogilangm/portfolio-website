// Menggeser halte yang dipakai beberapa jalur (halte transit): satu titik fisik di jalan, jadi posisinya di tiap jalur
// dihitung dari titik yang sama. Dipakai js/stop-edit.js dan lab/stops.
import { pointAt } from './geometry.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Titik di jalur (yang tergambar, sudah ber-offset lajur) terdekat dengan p -> jarak sepanjang garis tengah (unit peta).
// `range` = [min, maks] jarak yang boleh dicari. Wajib untuk halte yang diseret: jalur yang melewati jalan yang sama pulang-pergi
// (R5) punya dua lajur berdekatan, dan tanpa batas ini titik terdekat bisa jatuh di lajur lawan sehingga halte macet.
export function snapToRoute(route, p, range = null) {
  let best = null;
  for (let k = 0; k < route.points.length - 1; k++) {
    if (range && (route.cum[k + 1] < range[0] - 1e-6 || route.cum[k] > range[1] + 1e-6)) continue;
    const a = route.points[k];
    const b = route.points[k + 1];
    const span = route.cum[k + 1] - route.cum[k];
    if (span < 1e-6) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1) : 0;
    const d = Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
    if (!best || d < best.d) best = { d, along: route.cum[k] + t * span };
  }
  if (!best) return range ? clamp(range[0], range[0], range[1]) : 0;
  return range ? clamp(best.along, range[0], range[1]) : best.along;
}

// Semua (jalur, indeks) yang melewati halte `id`.
export const membersOf = (routes, id) => routes.flatMap((route) => {
  const i = route.stopIds.indexOf(id);
  return i < 0 ? [] : [{ route, i }];
});

// Semua kemunculan halte `id` di satu jalur (halte seberang di jalan pulang-pergi muncul dua kali).
export const occurrencesOf = (route, id) => route.stopIds.flatMap((s, i) => (s === id ? [i] : []));

// Halte di ujung jalur (terminal, tempat putar balik) tidak bisa digeser.
export const isTerminal = (members) => members.some((m) => m.i === 0 || m.i === m.route.stopIds.length - 1);

// Posisi baru semua anggota bila halte pertama (`members[0]`) ingin berada di jarak `want`. `bounds(route, i)` = [min, maks]
// jarak yang boleh. Bila jalur lain menahan (tetangganya terlalu dekat), titiknya mundur sampai semua jalur muat.
// Hasil: jarak sepanjang garis tengah untuk tiap anggota, urutannya sama dengan `members`.
export function resolveShared(members, want, bounds) {
  const lead = members[0];
  let d = want;
  for (let n = 0; n < 4; n++) {
    d = clamp(d, ...bounds(lead.route, lead.i));
    const p = pointAt(lead.route, d);
    let ok = true;
    for (const m of members.slice(1)) {
      const a = snapToRoute(m.route, p, bounds(m.route, m.i));
      const c = clamp(a, ...bounds(m.route, m.i));
      if (Math.abs(c - a) > 1e-6) {
        ok = false;
        d = snapToRoute(lead.route, pointAt(m.route, c), bounds(lead.route, lead.i));
      }
    }
    if (ok) break;
  }
  const p = pointAt(lead.route, d);
  return members.map((m, q) => (q === 0 ? d : clamp(snapToRoute(m.route, p, bounds(m.route, m.i)), ...bounds(m.route, m.i))));
}
