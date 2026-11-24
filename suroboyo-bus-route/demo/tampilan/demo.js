// Case-study demo of the display tool (lab/tampilan): same controls, but nothing is ever saved.
// Draggable rows change sizes on the map (iframe, same page) live; Reset goes back to the values the map started with.
import { STYLE_DEFAULTS, APPLIED_KEYS } from '/suroboyo-bus-route/js/scale.js';

const GROUPS = [
  ['Route lines', [
    ['lineWidth', 'Corridor width', 2, 16, 0.5],
    ['laneGap', 'Lane gap', 2, 24, 0.5],
    ['corridorGap', 'Corridor gap', 0, 12, 0.5],
    ['cornerRadius', 'Corner radius', 0, 12, 0.25],
  ]],
  ['Stops', [
    ['stopSize', 'Size', 4, 32, 0.5],
    ['transitSize', 'Transit stop size', 1, 24, 0.25],
    ['stopBorder', 'Border', 1, 8, 0.25],
  ]],
  ['Bus and labels', [
    ['busSize', 'Bus size', 2, 12, 0.5],
    ['busStroke', 'Bus stroke', 0, 4, 0.1],
    ['busRadius', 'Bus radius', 0, 6, 0.1],
    ['labelSize', 'Label size', 0.6, 1.8, 0.05],
    ['labelGap', 'Label gap', 0, 12, 0.5],
  ]],
];

// Standalone: the map is the iframe on this page. With ?embed (the case-study article) this page is only the panel,
// and it drives the live map iframe in the article around it.
const embedded = new URLSearchParams(location.search).has('embed');
const frame = embedded ? parent.document.querySelector('[data-live-map="tools"]') : document.querySelector('#map');
const groupsEl = document.querySelector('#groups');
const status = document.querySelector('#status');
const values = { ...STYLE_DEFAULTS };
let initial = { ...STYLE_DEFAULTS }; // replaced by the values the map is really using once it has loaded
let editApi = null; // the map's stop and route editor, set once the map has loaded
const rows = new Map();
const fmt = (v) => (Number.isInteger(v) ? v.toFixed(1) : `${+v.toFixed(2)}`);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function push() {
  frame.contentWindow?.__peta?.setStyle({ ...values });
  status.textContent = 'Nothing is saved.';
}

function paint(key) {
  const { el, fill, val, min, max } = rows.get(key);
  fill.style.width = `${((values[key] - min) / (max - min)) * 100}%`;
  val.textContent = fmt(values[key]);
  el.setAttribute('aria-valuenow', values[key]);
}

function set(key, v) {
  const { min, max, step } = rows.get(key);
  values[key] = clamp(Math.round(v / step) * step, min, max);
  paint(key);
  push();
}

function makeRow([key, label, min, max, step]) {
  const el = document.createElement('div');
  el.className = 'dk';
  const live = APPLIED_KEYS.includes(key);
  el.tabIndex = live ? 0 : -1;
  el.classList.toggle('off', !live);
  if (!live) { el.title = 'Not used on the main map yet'; el.setAttribute('aria-disabled', 'true'); }
  el.setAttribute('role', 'slider');
  el.setAttribute('aria-label', label);
  el.setAttribute('aria-valuemin', min);
  el.setAttribute('aria-valuemax', max);
  const fill = Object.assign(document.createElement('div'), { className: 'fill' });
  const name = Object.assign(document.createElement('span'), { textContent: live ? label : `${label} · not used yet` });
  const val = Object.assign(document.createElement('span'), { className: 'val' });
  el.append(fill, name, val);
  rows.set(key, { el, fill, val, min, max, step });

  const fromX = (e) => {
    const r = el.getBoundingClientRect();
    set(key, min + clamp((e.clientX - r.left) / r.width, 0, 1) * (max - min));
  };
  el.addEventListener('pointerdown', (e) => {
    if (!live) return;
    el.setPointerCapture(e.pointerId);
    fromX(e);
  });
  el.addEventListener('pointermove', (e) => { if (live && el.hasPointerCapture(e.pointerId)) fromX(e); });
  el.addEventListener('dblclick', () => live && set(key, initial[key] ?? STYLE_DEFAULTS[key]));
  el.addEventListener('keydown', (e) => {
    if (!live) return;
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    set(key, values[key] + dir * step * (e.shiftKey ? 5 : 1));
  });
  return el;
}

for (const [title, defs] of GROUPS) {
  const group = document.createElement('div');
  group.className = 'group';
  const head = document.createElement('button');
  head.type = 'button';
  head.innerHTML = `${title}<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5l4 4 4-4"/></svg>`;
  head.addEventListener('click', () => {
    group.classList.toggle('closed');
    head.setAttribute('aria-expanded', !group.classList.contains('closed'));
  });
  head.setAttribute('aria-expanded', 'true');
  const items = document.createElement('div');
  items.className = 'items';
  items.append(...defs.map(makeRow));
  group.append(head, items);
  groupsEl.append(group);
}

function showAll() { for (const key of rows.keys()) paint(key); }
showAll();

// Tunggu peta di iframe siap, lalu ambil ukuran yang sedang dipakai (termasuk yang sudah disimpan).
const wait = setInterval(() => {
  const p = frame.contentWindow?.__peta;
  if (!p) return;
  clearInterval(wait);
  bindStops(p.edit);
  editApi = p.edit;
  initial = { ...p.style };
  Object.assign(values, initial);
  syncTime();
  showAll();
  status.textContent = 'Ready. Nothing is saved.';
}, 100);

// If the map never comes up, say why instead of staying empty (most often the page was opened without the server).
setTimeout(() => {
  if (!peta()) status.textContent = 'The map did not load. Open this page through the project server (npm start), not as a file.';
}, 6000);

// Reset undoes everything the visitor changed: the slider values, and any moved stops or reshaped routes.
document.querySelector('#reset').addEventListener('click', () => {
  Object.assign(values, initial);
  showAll();
  push();
  if (editApi?.state().dirty) editApi.revert();
  status.textContent = 'Back to the original map.';
});

// ---------- geser halte dan sunting rute ----------
// Logika ada di peta (js/stop-edit.js, js/route-edit.js); di sini hanya tombol dan keterangan. Simpan menulis
// data/stop-positions.json dan data/route-edits.json.
function bindStops(edit) {
  const stopToggle = document.querySelector('#edit-toggle');
  const routeToggle = document.querySelector('#route-toggle');
  const lineList = document.querySelector('#route-lines');
  const snapBox = document.querySelector('#route-snap');
  const pill = (btn, on) => {
    btn.setAttribute('aria-pressed', on);
    btn.querySelector('.pill').textContent = on ? 'On' : 'Off';
  };
  lineList.replaceChildren(...edit.lines().map((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.id = l.id;
    b.innerHTML = '<i></i><span></span>';
    b.querySelector('i').style.setProperty('--c', l.color);
    b.querySelector('span').textContent = l.name;
    b.addEventListener('click', () => edit.setLine(l.id));
    return b;
  }));
  const sync = () => {
    const s = edit.state();
    pill(stopToggle, s.mode === 'halte');
    pill(routeToggle, s.mode === 'rute');
    lineList.hidden = s.mode !== 'rute';
    snapBox.hidden = s.mode !== 'rute';
    for (const c of snapBox.querySelectorAll('input')) c.checked = s.snap[c.dataset.snap];
    for (const b of lineList.children) b.setAttribute('aria-checked', b.dataset.id === s.line);
  };
  for (const c of snapBox.querySelectorAll('input')) c.addEventListener('change', () => edit.setSnap(c.dataset.snap, c.checked));
  edit.onChange(sync);
  stopToggle.addEventListener('click', () => edit.setMode(edit.state().mode === 'halte' ? null : 'halte'));
  routeToggle.addEventListener('click', () => edit.setMode(edit.state().mode === 'rute' ? null : 'rute'));
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && edit.state().canUndo) { e.preventDefault(); edit.undo(); }
  });
  sync();
}

// ---------- animasi bus: putar/jeda dan mulai ulang ----------
const playBtn = document.querySelector('#bus-play');
const peta = () => frame.contentWindow?.__peta;
function syncPlaying() {
  const p = peta();
  if (!p) return;
  const on = p.playing();
  playBtn.setAttribute('aria-pressed', String(on));
  playBtn.textContent = on ? 'Pause' : 'Play';
}
playBtn.addEventListener('click', () => { const p = peta(); if (p) { p.setPlaying(!p.playing()); syncPlaying(); } });
document.querySelector('#bus-restart').addEventListener('click', () => { peta()?.restart(); syncPlaying(); });
setInterval(syncPlaying, 400); // tombol putar di peta ikut tersinkron

// ---------- suasana waktu: Auto / Early morning / Midday / Afternoon / Night ----------
const RANGES = { auto: 'Follows the device clock', pagi: '05.00-09.00', siang: '09.00-15.00', sore: '15.00-18.00', malam: '18.00-05.00' };
const timeEl = document.querySelector('#time-switch');
const timeNote = document.querySelector('#time-note');
function syncTime() {
  const p = peta();
  if (!p) return;
  if (!timeEl.children.length) {
    for (const m of p.modes()) {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: m.label });
      b.dataset.mode = m.id;
      b.addEventListener('click', () => { p.setMode(m.id); syncTime(); });
      timeEl.append(b);
    }
  }
  const mode = p.mode();
  for (const b of timeEl.children) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  const shown = p.modes().find((m) => m.id === p.theme())?.label;
  timeNote.textContent = mode === 'auto' ? `Now: ${shown} (${RANGES[p.theme()]})` : RANGES[mode];
}
// Kecepatan dan kurva transisi pindah suasana.
const MS_STEPS = [100, 200, 300, 400, 500, 600, 700, 800];
const msEl = document.querySelector('#ms-switch');
const easeEl = document.querySelector('#ease-switch');
function syncTr() {
  const p = peta();
  if (!p?.transitionMs) return;
  if (!msEl.children.length) {
    for (const ms of MS_STEPS) {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: `${ms}` });
      b.dataset.ms = ms;
      b.addEventListener('click', () => { p.setTransitionMs(ms); syncTr(); });
      msEl.append(b);
    }
    for (const e of p.easings()) {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: e.label });
      b.dataset.id = e.id;
      b.addEventListener('click', () => { p.setEase(e.id); syncTr(); });
      easeEl.append(b);
    }
  }
  for (const b of msEl.children) b.setAttribute('aria-pressed', String(Number(b.dataset.ms) === p.transitionMs()));
  for (const b of easeEl.children) b.setAttribute('aria-pressed', String(b.dataset.id === p.ease()));
}
setInterval(() => { syncTime(); syncTr(); }, 500);
