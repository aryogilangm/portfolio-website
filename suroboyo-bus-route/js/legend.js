// lineStop(), bukan lineColor(): di Night, lineColor() memberi warna garis yang diredupkan (demi peta), sedangkan
// swatch/titik di legenda ini elemen UI kecil yang perlu tetap terbaca — sama seperti .stop-ring di peta sendiri.
import { lineStop } from './theme.js';

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c != null));
  return node;
}

const MAX_HIGHLIGHT = 2;
const REDUCE_MOTION = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Legenda: daftar koridor (dasar, selalu tampil, selalu di PALING ATAS tumpukan) + satu kartu per koridor yang
// dihighlight (maks. 2, lihat MAX_HIGHLIGHT), tampil DI BAWAH legenda dasar, urut sesuai urutan dipilih. Tanpa
// highlight = semua rute aktif (perilaku lama). Klik baris koridor (atau garis rutenya di peta, lihat
// onSelectLine di main.js) menambah/mencabut highlight; klik "x" di kartu koridor mencabutnya. Koridor ketiga
// yang diklik saat sudah ada 2 highlight diabaikan (tidak menggantikan yang terlama) — baris-nya otomatis
// nonaktif/redup di legenda dasar sampai pengguna mencabut salah satu dulu lewat "x".
export function createLegend(root, net, routes, stopToLines, { onChange }) {
  root.querySelector('.legend-title').textContent = net.meta.title;
  const rowsEl = root.querySelector('#legend-rows');
  const selectedEl = root.querySelector('#legend-selected');
  // Hanya terlihat di mobile (lihat CSS): heading di atas kartu koridor yang dihighlight, disembunyikan total
  // saat tak ada yang dihighlight, bentuk tunggal/jamak mengikuti jumlahnya.
  const selectedTitleEl = root.querySelector('.legend-selected-title');

  const codeOf = (c) => [c[0], Number.parseInt(c.slice(1), 10) || 0];
  const byCorridor = new Map();
  for (const r of routes) {
    const key = r.line.corridor ?? r.line.id;
    if (!byCorridor.has(key)) byCorridor.set(key, { system: r.line.system, routes: [] });
    byCorridor.get(key).routes.push(r);
  }
  const corridors = [...byCorridor.keys()].sort((a, b) => {
    const [la, na] = codeOf(a);
    const [lb, nb] = codeOf(b);
    return la === lb ? na - nb : la < lb ? 1 : -1; // R lebih dulu dari W; nomor naik
  });

  // Daftar halte unik per koridor, urut sesuai rute arah pertamanya (dua arah sama secara fisik, hanya terbalik).
  function stopsOf(code) {
    const [first] = byCorridor.get(code).routes;
    const seen = new Set();
    const ids = [];
    for (const id of first.stopIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }

  // Checkbox custom (ikon + state) mengikuti component "CheckBox" di Figma (node 281:14401): kotak 18px, radius
  // 2px, cek SVG persis dari export node 281:14406 (viewBox 0 0 13 13).
  const checkIconSvg = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 13 13');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path d="M10.5001 3.41211L4.7251 9.18711L2.1001 6.56211" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
    return svg;
  };

  const rowEls = new Map();
  for (const code of corridors) {
    const { routes: rs } = byCorridor.get(code);
    const input = h('input', { type: 'checkbox' });
    const box = h('span', { class: 'legend-row__box' }, checkIconSvg());
    const row = h(
      'label',
      { class: 'legend-row' },
      h('span', { class: 'swatch', style: `--c:${lineStop(rs[0].line)}` }),
      h('span', { class: 'legend-row__label' }, `Corridor ${code}`),
      input,
      box,
    );
    input.addEventListener('change', () => toggle(code));
    rowsEl.append(row);
    rowEls.set(code, { label: row, input });
  }

  let highlighted = [];

  function toggle(code) {
    if (highlighted.includes(code)) {
      highlighted = highlighted.filter((c) => c !== code);
    } else if (highlighted.length < MAX_HIGHLIGHT) {
      highlighted = [...highlighted, code];
    } else {
      return; // sudah 2 koridor dihighlight: abaikan sampai salah satu dicabut
    }
    syncRows();
    syncCards();
    onChange(computeActive());
  }

  function computeActive() {
    if (!highlighted.length) return new Set(routes.map((r) => r.id));
    return new Set(highlighted.flatMap((code) => byCorridor.get(code).routes.map((r) => r.id)));
  }

  function renderCard(code) {
    const { routes: rs } = byCorridor.get(code);
    const c = lineStop(rs[0].line);
    const stopIds = stopsOf(code);
    const transferCount = stopIds.filter((id) => (stopToLines.get(id) ?? []).some((lineId) => !rs.some((r) => r.id === lineId))).length;

    const list = h('div', { class: 'legend-card__stops' });
    for (const id of stopIds) {
      const stop = net.stops[id];
      const others = [...new Set((stopToLines.get(id) ?? [])
        .map((lineId) => routes.find((r) => r.id === lineId)?.line.corridor)
        .filter((cor) => cor && cor !== code))];
      list.append(h(
        'div',
        { class: 'stop-row', style: `--c:${c}` },
        h('span', { class: 'stop-row__rail' }, h('span', { class: 'stop-row__dot' })),
        h(
          'span',
          { class: 'stop-row__body' },
          h('span', { class: 'stop-row__name' }, stop?.name ?? id),
          others.length ? h('span', { class: 'stop-row__transfers' }, others.join(', ')) : null,
        ),
      ));
    }

    const close = h(
      'button',
      { type: 'button', class: 'legend-card__close', 'aria-label': `Hapus highlight koridor ${code}` },
      (() => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = '<path d="M6 6l12 12M18 6L6 18"/>';
        return svg;
      })(),
    );
    close.addEventListener('click', () => toggle(code));

    return h(
      'div',
      { class: 'legend-card', style: `--c:${c}` },
      h(
        'div',
        { class: 'legend-card__head' },
        h('span', { class: 'legend-card__name' }, h('span', { class: 'swatch' }), `Corridor ${code}`),
        close,
      ),
      h(
        'p',
        { class: 'legend-card__stats' },
        `${stopIds.length} stops`,
        h('span', { class: 'dot' }),
        `${transferCount} transit stops`,
      ),
      h('hr', { class: 'legend-card__divider' }),
      list,
    );
  }

  function syncRows() {
    for (const [code, { label, input }] of rowEls) {
      const on = highlighted.includes(code);
      input.checked = on;
      const disabled = !on && highlighted.length >= MAX_HIGHLIGHT;
      input.disabled = disabled;
      label.classList.toggle('is-disabled', disabled);
    }
  }

  // Kartu koridor dianimasikan masuk/keluar satu per satu (bukan replaceChildren mentah) supaya transisinya
  // benar-benar berjalan. `highlighted` hanya bertambah di akhir (push) atau berkurang (filter), jadi urutan
  // DOM-nya otomatis tetap benar tanpa perlu menyusun ulang elemen yang sudah ada.
  const cardEls = new Map();
  function syncCards() {
    for (const [code, el] of [...cardEls]) {
      if (!highlighted.includes(code)) {
        cardEls.delete(code);
        leaveCard(el);
      }
    }
    for (const code of highlighted) {
      if (!cardEls.has(code)) {
        const el = renderCard(code);
        cardEls.set(code, el);
        enterCard(el);
      }
    }
    if (selectedTitleEl) {
      selectedTitleEl.textContent = highlighted.length > 1 ? 'Active Corridors' : 'Active Corridor';
      selectedTitleEl.hidden = highlighted.length === 0;
    }
  }

  function enterCard(el) {
    selectedEl.append(el);
    if (REDUCE_MOTION()) return;
    el.classList.add('legend-card--enter');
    // Dua rAF: paksa browser commit state "sebelum" dulu, baru lepas kelasnya di frame berikutnya supaya
    // transisi ke posisi akhir benar-benar terpicu (menghapusnya di frame yang sama tidak akan dianimasikan).
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('legend-card--enter')));
  }

  function leaveCard(el) {
    if (REDUCE_MOTION()) { el.remove(); return; }
    el.classList.add('legend-card--leave');
    const done = () => el.remove();
    el.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 250); // jaring pengaman kalau transitionend tak pernah terpicu
  }

  let initialized = false;
  return {
    // Dipanggil oleh main.js tiap kali `active` berubah. Hanya dipakai sekali, untuk membaca `?lines=` di URL
    // saat memuat (lab/berbagi tautan); sesudahnya legenda sendiri yang menjadi sumber kebenaran lewat toggle().
    sync(active) {
      if (initialized) return;
      initialized = true;
      if (active.size < routes.length) {
        for (const code of corridors) {
          if (highlighted.length >= MAX_HIGHLIGHT) break;
          const ids = byCorridor.get(code).routes.map((r) => r.id);
          if (ids.every((id) => active.has(id))) highlighted.push(code);
        }
      }
      syncRows();
      syncCards();
    },
    // Dipanggil dari klik garis rute di peta (main.js) — jalur kedua untuk highlight koridor, selain lewat baris
    // legenda. Sama persis dengan toggle() internal; satu-satunya sumber kebenaran untuk `highlighted`.
    toggleCorridor: toggle,
  };
}
