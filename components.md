# Component Guideline

Dokumentasi reusable component dari Figma (page "asset") dan cara pakainya di kode. Setiap kali butuh salah satu component ini, cek dulu file ini — jangan bikin style baru dari nol.

---

## 1. `work-card`

**Figma:** Component Set `work-card` (page asset)
**Dipakai di:** [index.html](index.html) (Selected Works, 4 card), [works.html](works.html) (All Works, 10 card)

### Anatomi
```
work-card (link, seluruh card bisa diklik)
├── thumbnail (gambar, rasio ~4:3, border-radius 4px)
├── Work Title  → warna neutral-100 (#0a0a0a), berubah jadi primary (#0030bf) saat hover
└── Subtitle    → warna neutral-70 (#757575)
```

### Aturan penting
- Thumbnail pakai **`border-radius: 4px`**. Ini sempat bolak-balik: awalnya dikasih 4px, lalu dihapus karena dikira main component-nya tidak rounded, lalu diminta dikembalikan ke 4px. Kalau ragu, cek langsung ke Figma component sebelum ubah.
- Title berubah warna ke primary saat hover (`card-title-hover-color`), subtitle warnanya tetap.
- Grid columns beda tergantung halaman:
  - Home (`selected-works`): max 2 kolom
  - Works.html (`all-works`): 1 (mobile) → 2 (tablet) → 3 (desktop)

### Implementasi (CSS classes)
`.work-card`, `.work-card__thumb`, `.work-card__title`, `.work-card__subtitle` — lihat [css/style.css](css/style.css).

```html
<a href="booksmart.html" class="work-card">
  <img class="work-card__thumb" src="..." alt="..." />
  <p class="work-card__title">Booksmart</p>
  <p class="work-card__subtitle">E-commerce Website</p>
</a>
```

---

## 2. `button`

**Figma:** Component Set `button` (page asset), 3 states: `Default`, `hover`, `state3` (pressed)
**Dipakai di:** tombol "All Works" di home

### Spec per state
| State | Background | Border | Text color |
|---|---|---|---|
| Default | `#ffffff` | 1px `#ededed` | `#757575` |
| Hover | `#ffffff` (sama seperti default) | 1px `#ededed` | `#757575` + `box-shadow: 0 10px 10px -4px rgba(0,0,0,0.1)` |
| Pressed | `#ffffff` | tidak ada border | `#0a0a0a` |

- `border-radius: 8px`, `padding: 8px 16px`
- Font: Geist 16px Regular

### Implementasi
`.button` — lihat [css/style.css](css/style.css).

```html
<a href="works.html" class="button">All Works</a>
```

---

## 3. `Link`

**Figma:** Component Set `Link` (page asset), size `Default` (16px) / `Large` (18px), state `default` / `hover` / `pressed`
**Dipakai di:** hyperlink inline di paragraf (about section, footer-detail email)

### Spec
| State | Warna | Underline |
|---|---|---|
| Default | `#757575` (neutral-70) | Ya |
| Hover | `#0030bf` (primary) | Ya |
| Pressed | `#0030bf` (sama seperti hover) | Ya |

- Size `Default` = 16px (dipakai untuk link inline di paragraf)
- Size `Large` = 18px (dipakai khusus untuk email link di `footer-detail`)

### Implementasi
`.link` untuk size Default, `.link--large` (modifier, tambahkan bareng `.link`) untuk size Large.

```html
<a href="https://booksmart.store/" class="link">Booksmart</a>
<a href="mailto:..." class="link link--large">agmaudyansa@gmail.com</a>
```

---

## 4. `nav-bar`

**Figma:** Component Set `nav-bar` (page asset), 2 variant: `home` (teks "HOME") / `detail-page` (teks "ALL WORKS")
**Dipakai di:** [works.html](works.html) (variant `home`), semua halaman detail project seperti [booksmart.html](booksmart.html) (variant `detail-page`)
**TIDAK dipakai di:** home (index.html) — sesuai instruksi sebelumnya, home tidak pakai navbar sama sekali.

### Spec per variant
| Variant | Teks | Link tujuan | Background | Border |
|---|---|---|---|---|
| `home` | "HOME" | `index.html` | `#ffffff` | border-bottom 1px `#ededed` |
| `detail-page` | "ALL WORKS" | `works.html` | transparent (tanpa fill) | tidak ada |

Sempat salah diimplementasikan — awalnya SEMUA navbar (termasuk yang harusnya variant `detail-page`) dikasih background putih + border, padahal main component `detail-page` di Figma itu transparent tanpa stroke sama sekali. Sudah dikoreksi lewat modifier class `.navbar--transparent`.

- Padding: **fixed 40px kiri-kanan, 16px atas-bawah di SEMUA breakpoint** (tidak scale seperti container lain — ini juga sempat salah pakai `--gutter` yang scale 300/100/40, sudah dikoreksi)
- Teks: Geist 20px Medium, warna `#0a0a0a`

### Perilaku tambahan (di luar Figma static design, permintaan custom)
Navbar **sticky** di atas, otomatis:
- **Hilang** (translateY(-100%)) saat scroll ke bawah
- **Muncul lagi** saat scroll ke atas
- Transisi: `transform 1s ease` (awalnya pakai efek spring/bounce sesuai spec asli, tapi bounce-nya diminta dihilangkan)

### Implementasi
`.navbar`, `.navbar__inner`, `.navbar__title`. Modifier `.navbar--transparent` untuk variant `detail-page`. Class `.navbar--hidden` ditoggle oleh JS di [js/main.js](js/main.js).

```html
<!-- variant home, dipakai di works.html -->
<nav class="navbar">
  <div class="navbar__inner">
    <a href="index.html" class="navbar__title">HOME</a>
  </div>
</nav>

<!-- variant detail-page, dipakai di semua halaman detail project -->
<nav class="navbar navbar--transparent">
  <div class="navbar__inner">
    <a href="works.html" class="navbar__title">ALL WORKS</a>
  </div>
</nav>
```

---

## 5. `footer-main`

**Figma:** Component `footer-main` (page asset)
**Dipakai di:** home (index.html), works.html

### Spec
- Outer bar: background `#ffffff`, border-top 1px `#ededed`, padding vertikal 24px + padding horizontal **scale sesuai breakpoint** (300px desktop / 100px tablet / 40px mobile — sama seperti `--gutter` di container lain)
- Konten dalam (jam + lokasi, dan copyright): **max-width 840px, Hug (tanpa padding tambahan)**, center, layout horizontal `space-between`
- Isi: `[jam live] in Surabaya` di kiri, `©2026` di kanan

### Catatan penting (pernah salah, sudah diperbaiki)
Awalnya padding horizontal breakpoint (300/100/40) ditaruh di elemen yang SAMA dengan `max-width: 840px` → ruang konten kepepet drastis dan bikin teksnya wrap ke 2 baris. Fix-nya: padding breakpoint di elemen **luar** (`.footer-main`), sementara `max-width: 840px` + `margin: auto` tanpa padding tambahan ada di elemen **dalam** (`.footer-main__inner`).

### Implementasi
`.footer-main`, `.footer-main__inner` — lihat [css/style.css](css/style.css).

```html
<footer class="footer-main">
  <div class="footer-main__inner">
    <p class="paragraph"><span id="live-clock">...</span> in Surabaya</p>
    <p class="paragraph">&copy;2026</p>
  </div>
</footer>
```

Jam diisi otomatis oleh `updateClock()` di [js/main.js](js/main.js), pakai timezone Asia/Jakarta.

---

## 6. `footer-detail`

**Figma:** Component Set `footer-detail` (page asset), 3 variant: `dekstop` / `tab` / `mobile`
**Dipakai di:** semua halaman detail project (mis. [booksmart.html](booksmart.html))

### Anatomi
```
footer-detail
├── Email label + Link besar (size Large, 18px) → agmaudyansa@gmail.com
└── bar: Linkedin, Dribbble, Upwork, lalu ©2026
```

### Spec
- Border-top 1px `#ededed`, padding-top 40px
- Section Email: center, max-width 840
- Section bar (social links + copyright): **1 baris horizontal tunggal, di-center sebagai grup, gap 32px antar item** — desktop & tablet.
  - Ini sempat salah diimplementasikan pakai `gap: 40px` dan `flex-wrap: wrap` tanpa grouping yang jelas, hasilnya kadang malah kelihatan seperti grid/wrap acak. Sudah dikoreksi: gap yang benar 32px (bukan 40px), dan link di-grouping dalam `.footer-detail__links` supaya perilaku wrap di breakpoint kecil bisa dikontrol eksplisit.
  - **Mobile:** BUKAN 1 baris — 3 link (Linkedin/Dribbble/Upwork) di baris atas (center, gap 32px), lalu `©2026` di baris terpisah di bawahnya (gap 24px, center).
  - **Tablet & Desktop:** ke-4 item (3 link + copyright) satu baris horizontal, center, gap 32px rata — dicapai dengan `.footer-detail__links` di-set `display: contents` di breakpoint ≥768px, supaya link-link itu jadi direct flex child dari `.footer-detail__bar` dan menyatu dalam 1 row bareng copyright.

### Implementasi
`.footer-detail`, `.footer-detail__email`, `.footer-detail__label`, `.footer-detail__bar`, `.footer-detail__links` (wrapper khusus 3 link, supaya breakpoint mobile bisa misahin dari copyright) — lihat [css/style.css](css/style.css).

```html
<footer class="footer-detail">
  <div class="footer-detail__email">
    <p class="paragraph footer-detail__label">Email</p>
    <a href="mailto:..." class="link link--large">agmaudyansa@gmail.com</a>
  </div>
  <div class="footer-detail__bar">
    <div class="footer-detail__links">
      <a href="..." class="paragraph link">Linkedin</a>
      <a href="..." class="paragraph link">Dribbble</a>
      <a href="..." class="paragraph link">Upwork</a>
    </div>
    <p class="paragraph">&copy;2026</p>
  </div>
</footer>
```

---

## 7. Detail Page Content Structure (pola berulang, bukan 1 component Figma)

**Bukan named component** di page "asset", tapi pola struktur frame yang konsisten dipakai di setiap halaman detail project (contoh: [booksmart.html](booksmart.html)). Ini ditemukan dari penamaan frame `content-section_1/2/3/4` dan `section-headline`/`section-detail` di Figma.

### Anatomi 1 halaman detail project
```
detail-page (max-width 1440, center)
├── detail-section (border-bottom, padding 48px top / 80px bottom / gutter kiri-kanan)
│   └── hero: judul project + badge "Watch live" (opsional, hanya kalau live site ada) + 2 paragraf intro
├── detail-section (border-bottom, padding 80px vertikal)      ← 1 "card" per topik masalah
│   ├── detail-block (judul besar masalah + paragraf, TANPA gambar)
│   ├── gambar besar (opsional, langsung setelah intro)
│   ├── detail-block (sub-judul + paragraf + gambar) — bisa berulang beberapa kali
│   └── detail-subgroup (kalau 1 topik butuh >1 gambar berurutan, gap lebih rapat: 40px vs 56px antar block biasa)
├── detail-section (sama seperti di atas) ← card berikutnya
├── ...
└── detail-section detail-section--outro (TANPA border, padding-top 48px) ← selalu "Outcome" di akhir
```

### Aturan penting
- **Setiap "card" (`detail-section`) punya border** (`border-bottom: 1px solid #ededed`) — KECUALI section terakhir ("Outcome") yang memang tidak ada stroke-nya di Figma.
- Section pertama (hero) dan terakhir (outcome) pakai padding-top lebih kecil (48px di SEMUA breakpoint, modifier `.detail-section--tight` / `.detail-section--outro`). Section di tengah: **64px di mobile**, **80px di tablet & desktop** (≥768px) — awalnya disamain 80px di semua breakpoint, sudah dikoreksi setelah dicek ulang data mobile di Figma.
- Gap antar `detail-block` dalam 1 `detail-section`: **56px**. Gap di dalam `detail-subgroup` (beberapa gambar untuk 1 topik yang sama): **40px**.
- **Kalau ada grid gambar** (2, 3, atau 5 gambar untuk 1 sub-judul — sudah ketemu semua variasinya di Booksmart & Bookdrop) — judul dan paragraf-nya **ikut jadi bagian dari grid** (mengisi cell kiri-atas), BUKAN ditulis terpisah di atas grid. Ini sempat salah diimplementasikan (teks di luar grid, cell kiri-atas dibiarkan kosong) sebelum dikoreksi berdasarkan screenshot & re-check Figma.
- Grid gambar **tidak butuh class posisi manual** — cukup `.detail-image-grid` diisi berurutan: `.detail-image-grid__text` (kalau ada) sebagai child PERTAMA, lalu sejumlah `<img class="detail-image">` sesuai kebutuhan. CSS Grid auto-placement otomatis mengisi kolom kanan lalu turun baris demi baris, persis urutan di Figma. Pola yang sama juga dipakai untuk "2 gambar sejajar tanpa teks" (tinggal isi 2 `<img>` saja, tanpa `__text`).
- **Grid gambar cuma 2 kolom di tablet & desktop (≥768px).** Di mobile, grid jadi **1 kolom vertikal** (gambar stack ke bawah, full-width) supaya tetap enak dibaca — ini juga sempat kelewatan (awalnya grid 2 kolom dipaksakan sampai ke mobile, bikin gambar jadi kecil dan sempit) sebelum dikoreksi.
- **Gambar di dalam grid TIDAK di-crop/di-stretch** — untuk `<img>` yang sudah beneran diisi sumber gambar, pakai `aspect-ratio: auto` (bukan rasio tetap seperti `.detail-image` biasa), jadi tiap gambar tampil di proporsi aslinya sesuai file yang di-upload. Baris grid otomatis menyesuaikan tinggi ke gambar yang paling tinggi di baris itu (perilaku default CSS Grid, tidak perlu diatur manual). Ini sempat salah — awalnya grid images dipaksa rasio 408:492 seragam via `object-fit: cover`, hasilnya banyak gambar ke-crop/stretch tidak sesuai aslinya — sudah dikoreksi berdasarkan perbandingan screenshot desktop/tab vs mobile dari Figma.
- **Placeholder (`<div class="detail-image">`, sebelum gambar asli di-upload) tetap pakai rasio fallback 408:492** — beda dari `<img>` yang boleh `aspect-ratio: auto`. Sebab: div kosong nggak punya ukuran intrinsik buat dijadiin acuan rasio, jadi kalau dipaksa `auto` dia collapse jadi tinggi 0 (invisible). CSS-nya beda selector: `.detail-image-grid img.detail-image` (auto) vs `.detail-image-grid div.detail-image` (fallback 408:492) — begitu placeholder diganti jadi `<img>`, otomatis dapet behaviour yang benar tanpa perlu ubah CSS.
- Gambar pakai `border-radius: 6px` (beda dengan `work-card` yang 4px — jangan disamakan).
- **Kadang 1 sub-judul punya beberapa gambar full-width yang cuma di-stack vertikal (bukan grid)** — ditemukan di Werk: Personnel Management ("Progressive Disclosure via Dual-Axis Navigation" punya 2 gambar full-width berurutan). Ini beda dari grid: tinggal taruh beberapa `<img class="detail-image">` berurutan langsung di dalam `.detail-block` (bukan di dalam `.detail-image-grid`), masing-masing full-width 840:491 seperti gambar tunggal biasa.
- **Grid 2 kolom kadang lebarnya TIDAK sama** (ditemukan di Atopia Space, rasio ~500:316, bukan 50:50) — pakai modifier class `.detail-image-grid--wide-narrow` di elemen `.detail-image-grid` yang sama (`<div class="detail-image-grid detail-image-grid--wide-narrow">`). Di mobile tetap stack 1 kolom seperti grid biasa, cuma di tablet+ kolomnya jadi timpang.
  - **Bug yang sempat kejadian:** pertama kali diimplementasikan pakai unit `fr` (`grid-template-columns: 500fr 316fr`), tapi entah kenapa di browser hasilnya malah rata 50:50 — sudah dites beberapa kombinasi `fr` (termasuk yang sederhana seperti `1fr 2fr`) dan semuanya ke-resolve sama rata, kemungkinan besar karena grid item-nya (placeholder `<div>` kosong) nggak punya ukuran intrinsik buat jadi basis distribusi `fr`. Fix-nya: pakai **persentase** (`61.27% 38.73%`, dari 500/816 dan 316/816) — persentase resolve dengan benar terlepas dari isi grid item-nya kosong atau tidak.
- **Kalau nama frame gambar di Figma bentrok/dipakai berulang** (beberapa gambar beda pakai nama sama persis, misal 2 layer `img-1` untuk 2 gambar berbeda) — jangan asumsikan file akan otomatis unik. Tanyakan ke user dulu: mereka rename manual di Figma, ATAU kita yang kasih penomoran baru berurutan sesuai urutan baca halaman (lebih cepat, tapi harus dikasih tabel mapping yang jelas biar user tahu file mana untuk konten yang mana). Ini kejadian di Atopia Space — lihat catatan lengkapnya di `design.md`.
- Kalau project tidak punya live site publik (contoh: Bookdrop, tool internal), **badge "Watch live" di-skip sepenuhnya** — cukup judul project tanpa badge di sebelahnya.

### Implementasi
`.detail-page`, `.detail-section`, `.detail-section--tight`, `.detail-section--outro`, `.detail-subgroup`, `.detail-block`, `.detail-title`, `.detail-hero`, `.watch-live`, `.detail-image`, `.detail-image-grid`, `.detail-image-grid__text` — semua di [css/style.css](css/style.css).

```html
<section class="detail-section">
  <div class="detail-block">
    <h2 class="detail-title">Judul masalah</h2>
    <p class="paragraph">...</p>
  </div>
  <img class="detail-image" src="..." alt="..." />
</section>

<!-- grid gambar dengan teks di cell kiri-atas (jumlah gambar bebas, tinggal tambah <img>) -->
<div class="detail-image-grid">
  <div class="detail-image-grid__text">
    <h3 class="detail-title">Sub-judul</h3>
    <p class="paragraph">...</p>
  </div>
  <img class="detail-image" src="..." alt="..." />
  <img class="detail-image" src="..." alt="..." />
  <img class="detail-image" src="..." alt="..." />
</div>

<!-- grid gambar tanpa teks (misal 2 gambar sejajar) -->
<div class="detail-image-grid">
  <img class="detail-image" src="..." alt="..." />
  <img class="detail-image" src="..." alt="..." />
</div>
```

### Asset gambar
Setiap project punya folder sendiri di `assets/images/<nama-project>-detail-page/`, dengan nama file **sama persis dengan nama frame gambar di Figma** (`img-1.png`, `img-2.png`, dst, atau `img-7_1.png` untuk gambar dalam grid). Konvensi ini sengaja disamakan supaya tinggal cocokkan nama, tidak perlu tebak-tebak urutan gambar.

---

## Ringkasan token warna yang dipakai lintas component

Semua warna di atas berasal dari `design.md` (design tokens). Yang paling sering dipakai:

| Token | Hex | Dipakai untuk |
|---|---|---|
| `primary-main` | `#0030bf` | hover/pressed pada Link, title warna project |
| `neutral-70` | `#757575` | teks default/secondary (paragraph, button text, link default) |
| `neutral-100` | `#0a0a0a` | teks judul/dark (work-card title, nav-bar text, section title) |
| `neutral-30` | `#ededed` | border/stroke tipis (button, navbar, footer, work-card placeholder) |
| `neutral-10` | `#ffffff` | background |
