// Mode geser halte (dipakai lab/tampilan): halte bisa diseret, tapi hanya sepanjang jalurnya sendiri (tidak bebas).
// Saat diseret, hanya penanda yang bergerak; begitu dilepas, posisi (jarak sepanjang garis tengah, meter) dikirim lewat
// `commit` dan peta dibangun ulang. Halte yang dipakai beberapa jalur (transit) ikut bergerak di semua jalurnya; halte di ujung
// jalur juga bisa digeser (ke arah dalam, atau ke ekor garis `tailStart`/`tailEnd` bila ada). Panah kiri/kanan menggeser 10 m (Shift 50 m).
import { pointAt, stopKey } from './geometry.js';
import { snapToRoute, membersOf, resolveShared, occurrencesOf } from './stop-link.js';

const NUDGE_M = 10;
const MIN_GAP_M = 3; // jarak minimal antar dua halte berurutan
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createStopEditor({ svg, viewport, layer, state, scale, commit, info }) {
  let enabled = false;
  let drag = null;
  let suppressClick = false;
  const pt = svg.createSVGPoint();
  const toMap = (e) => {
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(viewport.getScreenCTM().inverse());
  };

  // Halte tidak boleh keluar jalur atau melewati halte tetangganya.
  const bounds = (route, i) => {
    const gap = MIN_GAP_M / scale;
    const lo = i > 0 ? route.stopDist[i - 1] + gap : 0;
    const hi = i < route.stopDist.length - 1 ? route.stopDist[i + 1] - gap : route.length;
    return [lo, Math.max(lo, hi)];
  };

  function target(g, p = null) {
    const { routes, net } = state();
    const id = g.dataset.id;
    const name = net.stops[id].name;
    const members = membersOf(routes, id);
    // Halte yang dilewati dua kali di jalur yang sama: yang digeser adalah kemunculan yang paling dekat dengan penunjuk, sendirian.
    const lead = members[0];
    const occ = occurrencesOf(lead.route, id);
    if (p && occ.length > 1) {
      const near = occ.reduce((best, i) => {
        const q = lead.route.points[lead.route.stopIdx[i]];
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        return !best || d < best.d ? { i, d } : best;
      }, null).i;
      if (near !== lead.i) return { id, key: stopKey(lead.route.stopIds, near), name, members: [{ route: lead.route, i: near }], route: lead.route, i: near };
    }
    return { id, key: stopKey(lead.route.stopIds, lead.i), name, members, route: lead.route, i: lead.i };
  }

  const boundsOf = (route, i) => bounds(route, i);
  const describe = (t, along) => info(`${t.name} · ${t.members.map((m) => m.route.line.name).join(' + ')} · ${Math.round(along * scale)} m from line start`);

  // Halte yang bertumpuk (dua cincin di titik yang sama) tidak bisa dipilih satu per satu bila selalu yang di atas yang terpegang.
  // Ambil cincin terdekat dengan penunjuk; bila beberapa sama dekat, bergantian (klik berikutnya memegang yang lain).
  let lastPick = null;
  function pickStop(e) {
    const hit = e.target.closest('.stop');
    if (!hit) return null;
    const near = [];
    for (const g of layer.querySelectorAll('.stop')) {
      for (const r of g.querySelectorAll('.stop-ring')) {
        if (r.style.display === 'none') continue;
        const b = r.getBoundingClientRect();
        const d = Math.hypot(b.x + b.width / 2 - e.clientX, b.y + b.height / 2 - e.clientY);
        if (d <= Math.max(10, b.width / 2 + 3)) { near.push({ g, d }); break; }
      }
    }
    if (near.length < 2) return hit;
    near.sort((p, q) => p.d - q.d);
    const tied = near.filter((n) => n.d - near[0].d < 2);
    const pick = tied.length > 1 ? tied[(Math.max(0, tied.findIndex((n) => n.g === lastPick)) + (lastPick && tied.some((n) => n.g === lastPick) ? 1 : 0)) % tied.length].g : near[0].g;
    lastPick = pick;
    return pick;
  }

  layer.addEventListener('pointerdown', (e) => {
    if (!enabled || e.button !== 0) return;
    const g = pickStop(e);
    if (!g) return;
    e.stopPropagation(); // jangan ikut menggeser peta
    const t = target(g, toMap(e));
    if (!t) return;
    g.setPointerCapture(e.pointerId);
    drag = { ...t, g, pointerId: e.pointerId, start: t.route.stopDist[t.i], along: t.route.stopDist[t.i] };
    g.classList.add('dragging');
    describe(t, drag.along);
  });

  layer.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.along = resolveShared(drag.members, snapToRoute(drag.route, toMap(e), boundsOf(drag.route, drag.i)), boundsOf)[0];
    state().map.moveStop(drag.id, pointAt(drag.route, drag.along));
    describe(drag, drag.along);
  });

  const end = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    d.g.classList.remove('dragging');
    d.g.releasePointerCapture?.(e.pointerId);
    if (Math.abs(d.along - d.start) < 1e-6) return;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    const all = resolveShared(d.members, d.along, boundsOf);
    commit(d.key, d.members.map((m, q) => [m.route.id, Math.round(all[q] * scale * 10) / 10]));
  };
  layer.addEventListener('pointerup', end);
  layer.addEventListener('pointercancel', end);

  // Setelah menyeret, jangan ikut memilih halte (panel info).
  layer.addEventListener('click', (e) => {
    if (suppressClick) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  layer.addEventListener('keydown', (e) => {
    if (!enabled || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const g = e.target.closest?.('.stop');
    if (!g) return;
    e.preventDefault();
    const t = target(g);
    if (!t) return;
    const cur = t.route.stopDist[t.i];
    const want = cur + (e.shiftKey ? 5 : 1) * (NUDGE_M / scale) * (e.key === 'ArrowRight' ? 1 : -1);
    const all = resolveShared(t.members, want, boundsOf);
    if (Math.abs(all[0] - cur) < 1e-6) return;
    commit(t.key, t.members.map((m, q) => [m.route.id, Math.round(all[q] * scale * 10) / 10]));
    describe(t, all[0]);
  });

  return {
    setEnabled(on) {
      enabled = on;
      svg.classList.toggle('editing', on);
      if (!on) info('');
    },
    get enabled() { return enabled; },
  };
}
