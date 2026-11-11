import { validateNetwork } from './validate.js';
import { buildRoutes, stopLines, stopPositions } from './geometry.js';
import { renderMap } from './render.js';
import { createBuses } from './buses.js';
import { createPanZoom } from './panzoom.js';
import { createLegend } from './legend.js';
import { MIN_ZOOM, MAX_ZOOM, style, applyStyle } from './scale.js';
import { createStopEditor } from './stop-edit.js';
import { createRouteEditor } from './route-edit.js';
import { applyRouteEdits } from './route-ops.js';
import { initTheme, setMode, getMode, getTheme, onTheme, lineColor, MODES, THEME_LABELS, EASINGS, getTransitionMs, setTransitionMs, getTransitionEase, setTransitionEase, STYLES, getTransitionStyle, setTransitionStyle } from './theme.js';

const $ = (sel) => document.querySelector(sel);

function showBanner(message, items = []) {
  const banner = $('#banner');
  banner.replaceChildren(message);
  if (items.length) {
    const ul = document.createElement('ul');
    for (const item of items) ul.append(Object.assign(document.createElement('li'), { textContent: item }));
    banner.append(ul);
  }
  banner.hidden = false;
}

function readActiveFromUrl(allIds) {
  const param = new URLSearchParams(location.search).get('lines');
  if (param === null) return new Set(allIds);
  return new Set(param.split(',').filter((id) => allIds.includes(id)));
}

function writeActiveToUrl(active, allIds) {
  const url = new URL(location.href);
  if (active.size === allIds.length) url.searchParams.delete('lines');
  else url.searchParams.set('lines', [...active].join(','));
  history.replaceState(null, '', url);
}

// Absolut (bukan relatif ke halaman) supaya tetap benar saat halaman ini diakses lewat rewrite URL cantik
// (/experiments/suroboyo-bus-route-map), yang tidak berada di folder fisik yang sama dengan data/ dan js/ ini.
const DATA_BASE = '/suroboyo-bus-route/data';

async function main() {
  let net;
  try {
    const res = await fetch(`${DATA_BASE}/network.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    net = await res.json();
  } catch (err) {
    showBanner(`Gagal memuat data/network.json (${err.message}). Jalankan lewat server lokal, bukan file://`);
    return;
  }

  const { errors, warnings } = validateNetwork(net);
  warnings.forEach((w) => console.warn(w));
  if (errors.length) {
    showBanner('Data rute bermasalah:', errors);
    return;
  }
  if (net.meta.sample) showBanner('Ini data contoh, bukan rute resmi Suroboyo Bus.');

  document.title = `Peta ${net.meta.title}`;
  initTheme(net);
  // Tombol suasana waktu: 4 tombol pilih langsung (bukan siklus). Tak ada tombol "Auto" di kontrol tengah-bawah
  // (sesuai Figma) — bawaannya SELALU Early morning (lihat theme.js) sampai salah satu tombol ini diklik; tak
  // ada yang menyala saat mode masih 'auto', karena pengguna belum memilih sendiri.
  const themeBtns = [...document.querySelectorAll('#theme-group .ctrl-btn[data-waktu]')];
  const syncTheme = () => {
    const m = getMode();
    for (const btn of themeBtns) {
      const on = btn.dataset.waktu === m;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    }
  };
  for (const btn of themeBtns) btn.addEventListener('click', () => { setMode(btn.dataset.waktu); syncTheme(); });
  onTheme(syncTheme);
  syncTheme();
  // Posisi halte hasil geseran (lab/stops), per data: data/stop-positions.json[meta.title].
  let moves = {};
  try {
    const res = await fetch(`${DATA_BASE}/stop-positions.json`);
    if (res.ok) moves = (await res.json())[net.meta.title] ?? {};
  } catch { /* tanpa geseran */ }
  // Bentuk rute hasil sunting (lab/tampilan > Sunting rute), per data: data/route-edits.json[meta.title]. `pristine` = bentuk
  // dari data/network.json sebelum sunting, untuk menentukan ruas mana yang berubah.
  const pristine = net.lines.map((l) => structuredClone(l.legs));
  let edits = {};
  try {
    const res = await fetch(`${DATA_BASE}/route-edits.json`);
    if (res.ok) edits = applyRouteEdits(net, (await res.json())[net.meta.title] ?? {});
  } catch { /* tanpa sunting */ }
  // Ukuran garis dan halte yang disimpan lab/tampilan (opsional).
  try {
    const res = await fetch(`${DATA_BASE}/map-style.json`);
    if (res.ok) applyStyle(await res.json());
  } catch { /* ukuran bawaan */ }
  let routes;
  let stopToLines;
  let map;
  let buses;
  let zoomK = 1;
  let legend; // dibuat setelah build() pertama; onSelectLine (dipakai build()) hanya memanggilnya saat diklik
  const svg = $('#map');
  const viewport = $('#viewport');
  const info = $('#stop-info');
  let selected = null;
  let routeEditor = null;

  // Bangun jalur, halte, dan bus dari data + geseran halte. Dipanggil sekali saat mulai dan lagi tiap geseran halte selesai.
  function build() {
    routes = buildRoutes(net, moves);
    stopToLines = stopLines(routes);
    for (const sel of ['#layer-lines', '#layer-stops', '#layer-buses']) $(sel).replaceChildren();
    $('#layer-labels')?.remove();
    map = renderMap(
      net,
      routes,
      stopToLines,
      stopPositions(net, routes),
      { lines: $('#layer-lines'), stops: $('#layer-stops') },
      { onSelectStop: selectStop, onSelectLine: (code) => legend?.toggleCorridor(code) },
    );
    buses = createBuses(routes, $('#layer-buses'), { ...net.meta.animation, stops: net.stops });
    map.setZoom(zoomK);
  }
  build();
  const allIds = routes.map((r) => r.id);
  const panzoom = createPanZoom(svg, viewport, {
    minK: MIN_ZOOM,
    maxK: MAX_ZOOM,
    onChange: (k) => {
      zoomK = k;
      map.setZoom(k);
      routeEditor?.setZoom(k);
    },
  });

  // Mode geser halte dan sunting rute untuk lab/tampilan (halaman yang sama di iframe). Riwayat untuk urungkan; "tersimpan" =
  // isi data/stop-positions.json dan data/route-edits.json saat ini.
  const history = [];
  const snapshot = () => structuredClone({ moves, edits });
  const current = () => JSON.stringify({ moves, edits });
  let saved = current();
  let savedMoves = JSON.stringify(moves);
  let savedEdits = JSON.stringify(edits);
  let editNote = '';
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn());
  function rebuild() {
    build();
    map.applyActive(active);
    buses.applyActive(active);
    map.setSelected(selected);
    buses.place(clock);
    routeEditor?.refresh();
    notify();
  }
  // Pulihkan bentuk rute dari data asli + `edits`.
  function restore(state) {
    moves = state.moves;
    net.lines.forEach((l, i) => { l.legs = structuredClone(pristine[i]); });
    edits = applyRouteEdits(net, state.edits);
    rebuild();
  }
  const stopEditor = createStopEditor({
    svg,
    viewport,
    layer: $('#layer-stops'),
    state: () => ({ routes, map, stopToLines, net }),
    scale: net.meta.scale,
    info: (text) => { editNote = text; notify(); },
    commit: (stopId, entries) => {
      history.push(snapshot());
      for (const [lineId, meters] of entries) (moves[lineId] ??= {})[stopId] = meters;
      rebuild();
    },
  });
  routeEditor = createRouteEditor({
    svg,
    viewport,
    state: () => ({ routes, net, onLine: notify }),
    info: (text) => { editNote = text; notify(); },
    commit: (lineId, legs) => {
      history.push(snapshot());
      const i = net.lines.findIndex((l) => l.id === lineId);
      const line = net.lines[i];
      line.legs = legs;
      const changed = {};
      legs.forEach((leg, j) => {
        if (JSON.stringify(leg) !== JSON.stringify(pristine[i][j])) changed[`${line.stops[j]}>${line.stops[j + 1]}`] = leg;
      });
      if (Object.keys(changed).length) edits[lineId] = changed;
      else delete edits[lineId];
      rebuild();
    },
  });
  routeEditor.setZoom(zoomK);

  const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error ?? res.status);
    return out;
  };

  // Pegangan untuk lab/tampilan: ubah ukuran langsung tanpa memuat ulang, atur mode geser halte dan sunting rute.
  // Hanya dipasang di localhost (sama seperti lapse-dev.js) — endpoint /__save-* yang dipanggilnya tidak ada
  // di hosting statis produksi, dan surface edit/drag ini memang tidak untuk pengunjung biasa.
  if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__peta = {
    style,
    view: () => panzoom.view(),
    setView: (v) => panzoom.setView(v),
    labels: () => map.labels(),
    setStyle: (patch) => { applyStyle(patch); map.restyle(); buses.restyle(); },
    // Suasana waktu untuk lab/tampilan: mode ('auto' atau salah satu suasana) dan suasana yang sedang tampil.
    modes: () => MODES.map((id) => ({ id, label: THEME_LABELS[id] })),
    mode: getMode,
    theme: getTheme,
    setMode: (m) => { setMode(m); syncTheme(); },
    // Kecepatan dan kurva transisi pindah suasana (lab/tampilan, lab/transisi).
    transitionMs: getTransitionMs,
    setTransitionMs,
    ease: getTransitionEase,
    setEase: setTransitionEase,
    transitions: () => Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label, note: s.note, ms: s.ms })),
    transition: getTransitionStyle,
    setTransition: setTransitionStyle,
    easings: () => Object.entries(EASINGS).map(([id, e]) => ({ id, label: e.label })),
    // Kontrol animasi bus untuk lab/tampilan: putar/jeda, dan mulai ulang (semua bus kembali ke halte awal jalurnya lalu jalan).
    playing: () => playing,
    setPlaying: (on) => { playing = Boolean(on); syncPlay(); },
    restart: () => { clock = 0; buses.place(clock); playing = true; syncPlay(); },
    edit: {
      // Satu mode pada satu waktu: 'halte', 'rute', atau null.
      setMode: (mode) => {
        stopEditor.setEnabled(mode === 'halte');
        routeEditor.setEnabled(mode === 'rute', routes[0].id);
        notify();
      },
      setLine: (id) => routeEditor.setLine(id),
      setSnap: (key, on) => { routeEditor.snap[key] = on; notify(); },
      lines: () => routes.map((r) => ({ id: r.id, name: r.line.name, color: r.line.color })),
      state: () => ({
        mode: stopEditor.enabled ? 'halte' : routeEditor.enabled ? 'rute' : null,
        line: routeEditor.line,
        snap: { ...routeEditor.snap },
        dirty: current() !== saved,
        canUndo: history.length > 0,
        note: editNote,
      }),
      undo: () => { const prev = history.pop(); if (prev) restore(prev); },
      revert: () => { if (current() === saved) return; history.push(snapshot()); restore({ moves: JSON.parse(savedMoves), edits: JSON.parse(savedEdits) }); },
      async save() {
        const paths = [];
        if (JSON.stringify(moves) !== savedMoves) paths.push((await post('/__save-positions', { key: net.meta.title, moves })).path);
        if (JSON.stringify(edits) !== savedEdits) paths.push((await post('/__save-routes', { key: net.meta.title, edits })).path);
        savedMoves = JSON.stringify(moves);
        savedEdits = JSON.stringify(edits);
        saved = current();
        notify();
        return { path: paths.join(' dan ') };
      },
      onChange: (fn) => listeners.add(fn),
    },
  };

  let active = readActiveFromUrl(allIds);
  legend = createLegend($('#legend'), net, routes, stopToLines, { onChange: setActive });

  function setActive(next) {
    active = next;
    map.applyActive(active);
    buses.applyActive(active);
    legend.sync(active);
    writeActiveToUrl(active, allIds);
    if (selected && !stopToLines.get(selected).some((l) => active.has(l))) selectStop(null);
  }

  function selectStop(id) {
    selected = id === selected ? null : id;
    map.setSelected(selected);
    if (!selected) {
      info.hidden = true;
      return;
    }
    const stop = net.stops[selected];
    const chips = stopToLines.get(selected).map((lineId) => {
      const r = routes.find((x) => x.id === lineId);
      const chip = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'swatch';
      dot.style.setProperty('--c', lineColor(r.line));
      chip.append(dot, r.line.name);
      return chip;
    });
    info.querySelector('h2').textContent = stop.name;
    info.querySelector('ul').replaceChildren(...chips);
    const own = new Set(stopToLines.get(selected).map((lineId) => routes.find((x) => x.id === lineId).line.corridor));
    const elsewhere = (stop.transfers ?? []).filter((c) => !own.has(c));
    const text = [stop.note, elsewhere.length ? `Pindah ke: ${elsewhere.join(', ')}` : ''].filter(Boolean).join('\n');
    const note = info.querySelector('p');
    note.textContent = text;
    note.hidden = !text;
    info.hidden = false;
  }

  svg.addEventListener('click', () => selectStop(null));
  info.querySelector('button').addEventListener('click', () => selectStop(null));

  const fitPad = () => {
    const small = innerWidth < 640;
    // Di mobile legenda adalah sheet atas-permintaan (lihat setupMobileLegendSheet), bukan panel yang selalu
    // mengambil tempat — jadi proteksi bawahnya dihitung dari bar .controls (selalu tampil), bukan dari tinggi
    // #legend (yang kalau dipakai akan menghitung sheet 76dvh seolah selalu makan tempat, padahal tersembunyi).
    const bottom = small
      ? innerHeight - $('.controls').getBoundingClientRect().top + 16
      : $('#legend').getBoundingClientRect().height + 40;
    return { top: small ? 70 : 60, right: 60, bottom, left: small ? 30 : 60 };
  };
  setActive(active);
  panzoom.fit(fitPad(), { animate: false });
  // Ukuran layar bisa belum final saat load (pane tersembunyi, rotasi HP): fit ulang selama belum disentuh.
  new ResizeObserver(() => {
    if (!panzoom.touched) panzoom.fit(fitPad(), { animate: false });
  }).observe(svg);
  $('#zoom-in').addEventListener('click', panzoom.zoomIn);
  $('#zoom-out').addEventListener('click', panzoom.zoomOut);
  $('#zoom-fit').addEventListener('click', () => panzoom.fit(fitPad()));

  // Legenda di mobile (<640px): sheet modal dipicu tombol "list" di .controls, bukan panel mengambang permanen
  // seperti dekstop/tab (lihat Figma "maps-mobile-menu reveal"). #legend sendiri dibuat inert saat tersembunyi
  // di mobile supaya checkbox/tombol di dalamnya tak ikut ke-tab padahal tak terlihat (lihat syncInert); saat
  // sheet terbuka, giliran peta/nav/kontrol di baliknya yang di-inert supaya fokus tak bisa lolos ke sana.
  (function setupMobileLegendSheet() {
    const toggle = $('#legend-toggle');
    const closeBtn = $('#legend-close');
    const scrim = $('#legend-scrim');
    const legendEl = $('#legend');
    const inertTargets = [svg, $('.page-nav'), $('.controls')];
    let lastFocused = null;

    function syncInert() {
      legendEl.inert = innerWidth < 640 && document.documentElement.dataset.legend !== 'open';
    }
    function openSheet() {
      lastFocused = document.activeElement;
      document.documentElement.dataset.legend = 'open';
      legendEl.setAttribute('role', 'dialog');
      legendEl.setAttribute('aria-modal', 'true');
      toggle.setAttribute('aria-expanded', 'true');
      syncInert();
      for (const el of inertTargets) el.inert = true;
      // rAF: browser menunda langkah "lepas fokus" miliknya sendiri (dipicu elemen yang baru jadi inert di
      // atas) sampai akhir task ini — focus() yang dipanggil di task yang sama bisa kalah ketimpa itu.
      requestAnimationFrame(() => closeBtn.focus());
      document.addEventListener('keydown', onKeydown);
    }
    function closeSheet() {
      delete document.documentElement.dataset.legend;
      legendEl.removeAttribute('role');
      legendEl.removeAttribute('aria-modal');
      toggle.setAttribute('aria-expanded', 'false');
      syncInert();
      for (const el of inertTargets) el.inert = false;
      document.removeEventListener('keydown', onKeydown);
      requestAnimationFrame(() => (lastFocused ?? toggle).focus());
    }
    function onKeydown(e) { if (e.key === 'Escape') closeSheet(); }

    toggle.addEventListener('click', openSheet);
    closeBtn.addEventListener('click', closeSheet);
    scrim.addEventListener('click', closeSheet);
    addEventListener('resize', syncInert);
    syncInert();
  })();

  // Animasi bus: tanpa tombol jeda di halaman produksi (dihapus dari .controls) — berjalan terus kecuali
  // prefers-reduced-motion, atau dijeda lewat window.__peta.setPlaying() (lab/tampilan).
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let clock = 0;
  let last = performance.now();
  const syncPlay = () => {}; // tak ada tombol di halaman ini untuk disinkronkan; __peta.setPlaying/restart tetap aman memanggil ini
  buses.place(clock);
  // Selama transisi suasana bus dijeda sebentar (tanpa mengubah tombol jeda): gambar lama diam, jadi bus yang bergerak tampak dua.
  (function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (playing) {
      clock += dt;
      buses.place(clock);
    }
    requestAnimationFrame(frame);
  })(last);
}

main();
