// Tema suasana waktu: Early morning (05-09), Midday (09-15), Afternoon (15-18), Night (18-05), atau Auto.
// Auto SELALU berarti Early morning, bukan mengikuti jam perangkat — suasana lain (terutama Night) sengaja jadi
// kejutan yang baru ditemukan pengguna sendiri lewat tombol suasana. Pilihan ini TIDAK disimpan antar kunjungan
// (sengaja, bukan lupa): keluar dari halaman dan kembali lagi harus balik ke Early morning, bukan melanjutkan
// suasana terakhir — kejutannya baru kalau selalu mulai dari awal.
// Warna rute tiap suasana ada di data (network.json > meta.timeThemes, dibuat scripts/time-themes.mjs dari token koridor) dan
// dipasang sebagai variabel CSS per jalur (`--line-<id>-main`, `--line-<id>-bus`, ...). Warna latar, teks, dan kartu ada di
// css/style.css per `<html data-waktu="...">`. Ganti suasana cukup mengganti atribut dan variabel, tanpa membangun ulang peta.
const rootEl = () => document.documentElement;

export const THEMES = ['pagi', 'siang', 'sore', 'malam'];
export const MODES = ['auto', ...THEMES];
export const THEME_LABELS = { auto: 'Auto', pagi: 'Early morning', siang: 'Midday', sore: 'Afternoon', malam: 'Night' };

// Alat perbandingan (lab/warna): ?waktu=<suasana> memaksa suasana untuk sesi ini saja, ?warna=lama memakai palet koridor lama.
const params = new URLSearchParams(location.search);
export function storedMode() {
  const forced = params.get('waktu');
  if (MODES.includes(forced)) return forced;
  return 'auto';
}
let mode = 'auto';
export const getMode = () => mode;
export const getTheme = () => (mode === 'auto' ? 'pagi' : mode);

export const lineColor = (line) => `var(--line-${line.id}-main)`; // garis, cincin halte, badan bus
export const lineBus = (line) => `var(--line-${line.id}-bus)`; // isi bus (token bus-background = border koridor); di Night putih (lampu dalam bus menyala)
export const lineStop = (line) => `var(--line-${line.id}-stop)`; // bingkai cincin halte; di Night warna koridor asli (token stops-night)
export const lineBusStroke = (line) => `var(--line-${line.id}-busstroke)`; // bingkai bus; di Night memakai warna koridor asli (Midday)

let currentNet = null;
const names = ['main', 'surface', 'border', 'hover', 'pressed'];

function paletteOf(net, line, theme) {
  const c = net.meta.corridors?.[line.corridor];
  const set = net.meta.timeThemes?.[theme]?.corridors?.[line.corridor] ?? c;
  const main = set?.main ?? line.color;
  return Object.fromEntries(names.map((n) => [n, set?.[n] ?? main]));
}

// Pasang atribut suasana dan variabel warna semua jalur.
function paint() {
  const theme = getTheme();
  rootEl().dataset.waktu = theme;
  rootEl().dataset.mode = mode;
  rootEl().dataset.theme = theme === 'malam' ? 'dark' : 'light'; // untuk color-scheme dan alat lain
  if (!currentNet) return;
  for (const line of currentNet.lines) {
    const p = paletteOf(currentNet, line, theme);
    for (const n of names) rootEl().style.setProperty(`--line-${line.id}-${n}`, p[n]);
    const night = theme === 'malam';
    const base = currentNet.meta.corridors?.[line.corridor]?.main ?? p.main; // warna koridor asli (token Figma)
    rootEl().style.setProperty(`--line-${line.id}-stop`, night ? base : p.main);
    rootEl().style.setProperty(`--line-${line.id}-bus`, night ? '#FFFFFF' : p.border);
    rootEl().style.setProperty(`--line-${line.id}-busstroke`, night ? base : p.main);
  }
}

const listeners = new Set();
export const onTheme = (fn) => { listeners.add(fn); };
const notify = () => listeners.forEach((fn) => fn(getTheme(), mode));

export function initTheme(net) {
  currentNet = net;
  mode = storedMode();
  paint();
  if (params.get('warna') === 'lama') {
    fetch('data/palette-lama.json', { cache: 'no-store' }).then((r) => r.json()).then((old) => {
      net.meta.corridors = old.corridors;
      net.meta.timeThemes = old.timeThemes;
      paint();
    });
  }
}

// ---------- Transisi saat berpindah suasana ----------
// View Transitions: gambar lama tetap di bawah, gambar baru muncul di atasnya (mask/clip-path/opacity, tergantung gaya di STYLES).
// Hanya pseudo-elemen yang dianimasikan, tidak ada warna per elemen. Gaya, durasi, dan kurva bisa diatur (lab/transisi, ?gaya=, ?ms=, ?ease=).
export const EASINGS = {
  out: { label: 'Strong ease-out', css: 'cubic-bezier(0.32, 0.72, 0, 1)' },
  inout: { label: 'Smooth ease-in-out', css: 'cubic-bezier(0.65, 0, 0.35, 1)' },
};

// Gaya transisi. Penyebab pusing sebelumnya: di tepi lembut, teks/aset lama dan baru bertumpuk (berbayang) dan tepinya bergerak.
// Gaya di bawah menghindarinya dengan cara berbeda: tepi tegas (tidak ada pita campuran), tanpa gerak tepi (cross-fade),
// lewat warna datar (dip), atau mengganti aset di titik tengah saat latar sedang memudar (layers).
//   radial: lingkaran dari tengah bawah (feather > 0 = tepi lembut) | wipe: clip-path bertepi tegas | fade: cross-fade
//   dip: lama memudar ke warna latar baru lalu baru muncul | layers: latar memudar, peta dan kartu diganti di titik tengah
export const STYLES = {
  soft: { label: 'Soft radial', note: 'Previous default: soft-edged circle', ms: 700, kind: 'radial', feather: 0.1 },
  radial: { label: 'Crisp radial', note: 'Circle with a hard edge, no blended band', ms: 600, kind: 'radial', feather: 0 },
  horizon: { label: 'Horizon rise', note: 'Hard edge rising from the bottom, like a horizon', ms: 600, kind: 'wipe', dir: 'up' },
  sun: { label: 'Sun path', note: 'Hard edge sweeping with the direction of time (left to right forward, right to left backward)', ms: 600, kind: 'wipe', dir: 'sun' },
  diag: { label: 'Diagonal 45°', note: 'Hard 45° edge from bottom-left, like the map lines', ms: 600, kind: 'wipe', dir: 'diag' },
  curtain: { label: 'Curtain', note: 'Hard edges opening from the centre line outward', ms: 600, kind: 'wipe', dir: 'curtain' },
  fade: { label: 'Quick fade', note: 'Plain cross-fade, no moving edge', ms: 220, kind: 'fade' },
  slow: { label: 'Slow fade', note: 'Cross-fade, colours drift (previous default)', ms: 400, kind: 'fade' },
  dip: { label: 'Dip', note: 'Old look fades to the new background colour, then the new look fades in; nothing overlaps', ms: 420, kind: 'dip' },
  tween: { label: 'Tween', note: 'No snapshots: every colour slides in place (like the Tokyo reference); only the sky cross-fades', ms: 600, kind: 'tween' },
  tokyo: { label: 'Tokyo', note: 'Like the Tokyo map: no snapshots, colours slide in place (UI + map), buses keep running; only the sky cross-fades', ms: 600, kind: 'tween', scope: 'tokyo' },
  chrome: { label: 'Tokyo, UI only', note: 'Cards, buttons and text slide in place; line, stop and bus colours switch instantly (cheapest, tests whether map repaint causes jank)', ms: 600, kind: 'tween', scope: 'chrome' },
  glide: { label: 'Glide', note: 'Background fades slowly; map and cards cross-fade quickly at the midpoint', ms: 700, kind: 'layers', assetMs: 220 },
  cut: { label: 'Cut at midpoint', note: 'Background fades; map and cards switch in one frame at the midpoint', ms: 600, kind: 'layers', assetMs: 0 },
};
const STYLE_KEY = 'peta-transisi-gaya';
let trStyle = (() => {
  const q = params.get('gaya');
  if (q in STYLES) return q;
  try { const s = localStorage.getItem(STYLE_KEY); if (s in STYLES) return s; } catch { /* bawaan */ }
  return 'tokyo';
})();
export const getTransitionStyle = () => trStyle;
const MS_KEY = 'peta-transisi-ms';
const EASE_KEY = 'peta-transisi-kurva';
let trMs = (() => {
  const q = Number(params.get('ms'));
  if (q >= 0 && params.has('ms')) return q;
  try { const s = Number(localStorage.getItem(MS_KEY)); if (s > 0) return s; } catch { /* bawaan */ }
  return STYLES[trStyle].ms;
})();
// Memilih gaya juga memasang durasi bawaannya (bisa diubah lagi lewat setTransitionMs).
export function setTransitionStyle(name) {
  if (!(name in STYLES)) return;
  trStyle = name;
  trMs = STYLES[name].ms;
  try { localStorage.setItem(STYLE_KEY, name); localStorage.setItem(MS_KEY, String(trMs)); } catch { /* tidak disimpan */ }
}
let trEase = (() => {
  const q = params.get('ease');
  if (q in EASINGS) return q;
  try { const s = localStorage.getItem(EASE_KEY); if (s in EASINGS) return s; } catch { /* bawaan */ }
  return 'inout';
})();
export const getTransitionMs = () => trMs;
export const getTransitionEase = () => trEase;
export function setTransitionMs(ms) {
  trMs = Math.max(0, Number(ms) || 0);
  try { localStorage.setItem(MS_KEY, String(trMs)); } catch { /* tidak disimpan */ }
}
export function setTransitionEase(name) {
  if (!(name in EASINGS)) return;
  trEase = name;
  try { localStorage.setItem(EASE_KEY, name); } catch { /* tidak disimpan */ }
}

// Lapisan bernama untuk gaya 'layers' (css/style.css memberi view-transition-name yang sama): peta, kontrol, legenda, kartu halte, banner.
const LAYER_NAMES = ['v-map', 'v-controls', 'v-legend', 'v-info', 'v-banner'];

function animateSwap(update, target = getTheme()) {
  const root = rootEl();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduce || trMs <= 0) { update(); return; }
  const st = STYLES[trStyle];
  if (st.kind === 'tween') {
    // Tanpa View Transitions: tiap elemen menggeser warnanya sendiri lewat transisi CSS (css/style.css, [data-tween]), jadi teks tidak
    // pernah berbayang. Gradien latar tidak bisa digeser CSS, jadi latar lama ditaruh di lapisan sementara yang memudar.
    const cs = getComputedStyle(document.body);
    const ghost = document.createElement('div');
    ghost.style.cssText = `position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:${cs.backgroundImage};background-color:${cs.backgroundColor}`;
    document.body.prepend(ghost);
    const easing = EASINGS[trEase].css;
    root.style.setProperty('--tw-ms', `${trMs}ms`);
    root.style.setProperty('--tw-ease', easing);
    root.dataset.tween = st.scope ?? '';
    // Lampu bus (filter blur, 290 buah) hanya dirender selama transisi bila Night terlibat di salah satu sisi.
    if (getTheme() === 'malam' || target === 'malam') root.dataset.tweenNight = '';
    document.dispatchEvent(new CustomEvent('peta:swap', { detail: { phase: 'start' } }));
    void root.offsetWidth; // paksa gaya [data-tween] terhitung dulu, supaya lampu bus bisa memudar (display none -> block) alih-alih muncul tiba-tiba
    update();
    ghost.animate({ opacity: [1, 0] }, { duration: trMs, easing, fill: 'forwards' }).finished.finally(() => {
      ghost.remove();
      delete root.dataset.tween;
      delete root.dataset.tweenNight;
      root.style.removeProperty('--tw-ms');
      root.style.removeProperty('--tw-ease');
      document.dispatchEvent(new CustomEvent('peta:swap', { detail: { phase: 'end' } }));
    });
    return;
  }
  const { innerWidth: W, innerHeight: H } = window;
  const o = { x: W / 2, y: H }; // radial: selalu dari tengah bawah halaman (tempat tombol suasana nanti diletakkan)
  const R = Math.hypot(Math.max(o.x, W - o.x), Math.max(o.y, H - o.y));
  const f = st.kind === 'radial' ? st.feather : 0;
  const idxFrom = THEMES.indexOf(getTheme());
  root.dataset.vt = f ? 'soft' : st.kind === 'dip' || st.kind === 'layers' ? st.kind : 'hard';
  root.style.setProperty('--vt-solid', `${(1 - f) * 100}%`);
  // Bus dijeda selama transisi: gambar lama diam sedangkan gambar baru hidup, jadi bus yang bergerak akan tampak dua.
  document.dispatchEvent(new CustomEvent('peta:swap', { detail: { phase: 'start' } }));
  const vt = document.startViewTransition(update);
  const anims = [];
  vt.ready.then(() => {
    const easing = EASINGS[trEase].css;
    const run = (pseudo, keyframes, extra = {}) => anims.push(root.animate(keyframes, { duration: trMs, easing, fill: 'both', pseudoElement: pseudo, ...extra }));
    const NEW = '::view-transition-new(root)';
    const OLD = '::view-transition-old(root)';
    if (st.kind === 'radial') {
      if (!f) return run(NEW, { clipPath: [`circle(0px at ${o.x}px ${o.y}px)`, `circle(${R}px at ${o.x}px ${o.y}px)`] });
      // Bagian padat mask = (1 - f) jari-jari gambar mask, jadi ukuran akhirnya dibuat supaya bagian padat menutupi sudut terjauh.
      const S = (2 * R / (1 - f)) * 1.02;
      return run(NEW, {
        maskSize: ['0px 0px', `${S}px ${S}px`],
        maskPosition: [`${o.x}px ${o.y}px`, `${o.x - S / 2}px ${o.y - S / 2}px`], // pusat mask tetap di titik asal
      });
    }
    if (st.kind === 'wipe') {
      let clip;
      if (st.dir === 'up') clip = ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'];
      else if (st.dir === 'curtain') clip = ['inset(0% 50% 0% 50%)', 'inset(0% 0% 0% 0%)'];
      else if (st.dir === 'sun') {
        // Searah waktu (pagi -> siang -> sore -> malam) dari kiri ke kanan, mundur dari kanan ke kiri.
        const forward = (THEMES.indexOf(getTheme()) - idxFrom + THEMES.length) % THEMES.length <= THEMES.length / 2;
        clip = forward ? ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'] : ['inset(0% 0% 0% 100%)', 'inset(0% 0% 0% 0%)'];
      } else {
        // Diagonal 45° dari pojok kiri bawah: segitiga {x >= 0, y <= H, x + H - y <= d}; d = 0 sampai melewati pojok kanan atas.
        const d = (W + H) * 1.01;
        clip = [`polygon(0px ${H}px, 0px ${H}px, 0px ${H}px)`, `polygon(0px ${H}px, ${d}px ${H}px, 0px ${H - d}px)`];
      }
      return run(NEW, { clipPath: clip });
    }
    if (st.kind === 'fade') return run(NEW, { opacity: [0, 1] });
    if (st.kind === 'dip') {
      run(OLD, { opacity: [1, 0, 0], offset: [0, 0.5, 1] });
      return run(NEW, { opacity: [0, 0, 1], offset: [0, 0.5, 1] });
    }
    // layers: latar (root) memudar selama trMs; peta dan kartu (lapisan bernama) diganti di titik tengah, saat latar paling netral.
    run(NEW, { opacity: [0, 1] });
    const half = trMs / 2;
    const dur = Math.max(st.assetMs, 1);
    const opts = { duration: dur, delay: half - st.assetMs / 2, easing: 'linear' };
    for (const n of LAYER_NAMES) {
      run(`::view-transition-new(${n})`, { opacity: [0, 1] }, opts);
      run(`::view-transition-old(${n})`, { opacity: [1, 0] }, opts);
    }
  });
  // Animasi pada pseudo-elemen tetap menempel di dokumen setelah selesai (fill: both); dibatalkan supaya tidak terbawa ke transisi berikutnya.
  vt.finished.finally(() => {
    for (const a of anims) a.cancel();
    delete root.dataset.vt;
    root.style.removeProperty('--vt-solid');
    document.dispatchEvent(new CustomEvent('peta:swap', { detail: { phase: 'end' } }));
  });
}

// Dipanggil saat tombol suasana diklik. Hanya mengubah `mode` di memori (tidak disimpan ke localStorage —
// lihat komentar di atas) supaya kunjungan berikutnya selalu mulai dari Auto (Early morning) lagi.
export function setMode(next) {
  mode = MODES.includes(next) ? next : 'auto';
  animateSwap(() => { paint(); notify(); }, mode === 'auto' ? 'pagi' : mode);
}
