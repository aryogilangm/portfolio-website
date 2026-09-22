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
- **`.footer-detail__bar` padding horizontal & jarak ke atas — TIDAK ikut skala `--gutter` (300/100/40) seperti elemen lain**, melainkan nilai fixed sendiri: padding kiri-kanan **20px mobile → 40px tablet & desktop**, jarak dari section Email di atasnya (`margin-top`) **24px mobile → 32px tablet & desktop**. Ini kebalik/salah sebelumnya (pakai `var(--gutter)` buat padding jadi 300px di desktop — bar-nya jadi ketarik terlalu sempit — dan `margin-top` di-flat 40px semua breakpoint) — ketemu & dikoreksi lewat full spacing re-audit setelah user merapikan variable binding di Figma.

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
│   ├── detail-block (judul besar masalah + paragraf, TANPA gambar) — gap 12px
│   ├── gambar besar (opsional, langsung setelah intro)
│   ├── detail-block detail-block--media (sub-judul + paragraf + gambar) — bisa berulang beberapa kali
│   │   ├── detail-block__text (sub-judul + paragraf, gap 4px)
│   │   └── gambar / .detail-image-grid — gap dari __text ke gambar: 16px mobile, 24px tablet+
│   └── detail-subgroup (kalau 1 topik butuh >1 gambar berurutan, gap lebih rapat: 40px vs 56px antar block biasa)
├── detail-section (sama seperti di atas) ← card berikutnya
├── ...
└── detail-section detail-section--outro (TANPA border, padding-top 48px) ← selalu "Outcome" di akhir
```

### Aturan penting
- **Setiap "card" (`detail-section`) punya border** (`border-bottom: 1px solid #ededed`) — KECUALI section terakhir ("Outcome") yang memang tidak ada stroke-nya di Figma.
- Section pertama (hero) dan terakhir (outcome) pakai padding-top lebih kecil (48px di SEMUA breakpoint, modifier `.detail-section--tight` / `.detail-section--outro`). Section di tengah: **64px di mobile**, **80px di tablet & desktop** (≥768px) — awalnya disamain 80px di semua breakpoint, sudah dikoreksi setelah dicek ulang data mobile di Figma.
- Gap antar `detail-block` dalam 1 `detail-section`: **40px di mobile, 56px di tablet & desktop** (≥768px). Gap di dalam `detail-subgroup` (beberapa gambar untuk 1 topik yang sama): **40px** di semua breakpoint.
  - **Bug yang sempat kejadian:** awalnya di-flat 56px di semua breakpoint (termasuk mobile). Ketemu setelah user merapikan binding variable di Figma dan minta full re-audit — ternyata gap mobile-nya memang beda (40px), bukan ikut skala 56px yang sama seperti tablet/desktop. Dikoreksi dengan nambahin override `gap: var(--space-56)` di breakpoint tablet (≥768px), base-nya (mobile) jadi 40px.
- **`.detail-block` itu sebenarnya dua konteks gap yang beda di Figma, sempat digabung jadi satu (bug):**
  - Figma **`section-headline`** (h2/h3 + paragraf, TANPA gambar mengikuti — dipakai untuk intro tiap `detail-section` dan block "Outcome"): title-ke-paragraf gap-nya **12px** di semua breakpoint. Ini pakai `.detail-block` polos (tanpa modifier), children-nya `<h2>`/`<h3>` + `<p>` langsung, TIDAK perlu wrapper tambahan karena cuma 1 nilai gap yang dibutuhkan.
  - Figma **`section-detail`** (`headline` h3+paragraf yang lalu diikuti gambar/grid) — title-ke-paragraf gap-nya CUMA **4px** (jauh lebih rapat dari 12px di atas), TAPI dari teks itu ke gambar pertamanya gap-nya **16px mobile / 24px tablet+**. Dua nilai gap yang beda ini nggak bisa direpresentasikan dengan 1 flex container gap tunggal, makanya butuh wrapper: `<div class="detail-block__text">` (isinya h3+p, gap 4px) sebagai child PERTAMA dari `<div class="detail-block detail-block--media">`, baru diikuti gambar/`.detail-image-grid` sebagai sibling-nya (gap 16/24px dari `.detail-block--media` sendiri).
  - **Bug yang sempat kejadian:** sebelum dipisah, `.detail-block` dipakai flat buat KEDUA kasus dengan 1 gap value (16px), jadi title-ke-paragraf DAN paragraf-ke-gambar kepaksa sama padahal Figma-nya beda (4px vs 16/24px). Ketemu & dikoreksi setelah user kasih contoh screenshot spesifik + minta re-check ke Figma. Perbaikannya jalan lewat script Python (regex line-anchored, BUKAN `.*?` dengan `re.DOTALL` — sempat kena bug regex "melompat" ke `.detail-block` sibling berikutnya karena capture group non-greedy tetap bisa backtrack-extend melewati batas div kalau tidak dibatasi ke 1 baris) yang jalan di 7 halaman case-study sekaligus (Booksmart, Bookdrop, Werk ESS, Werk Personnel Management, Werk CRM, Werk Mobile App, Atopia Space) — Kasatmata & ZNTRAL tidak kena karena pola "gallery"-nya beda (lihat bagian bawah).
  - Pola yang sama (title 4px → gambar) juga berlaku di `.detail-image-grid__text` (teks yang jadi cell pertama grid) — sebelumnya `gap:8px`, sudah dikoreksi ke `gap:4px`.
  - **Pengecualian:** kadang sebuah `content-section` di Figma langsung dibuka dengan sebuah blok bergambar (tanpa `section-headline` non-gambar terpisah di depannya) — blok itu SECARA FUNGSIONAL jadi headline section tersebut, jadi title-ke-paragraf-nya tetap **12px** (bukan 4px) meskipun strukturnya sama-sama `.detail-block detail-block--media`. Ditemukan di Bookdrop, block "Restructuring the Product Architecture" (section pembuka `content-section_5`, langsung diikuti gambar, tidak ada intro h2 terpisah). Implementasinya: tambahin modifier `.detail-block__text--section-headline` (gap 12px) di `.detail-block__text`-nya, spesifik untuk instance ini saja — JANGAN diterapkan ke semua block bergambar lain, karena default-nya tetap 4px. Kalau ketemu pola serupa di halaman lain, cross-check dulu ke Figma apakah block itu memang berfungsi sebagai section-headline (section-nya tidak punya intro h2 terpisah) sebelum pakai modifier ini.
- **Kalau ada grid gambar** (2, 3, atau 5 gambar untuk 1 sub-judul — sudah ketemu semua variasinya di Booksmart & Bookdrop) — judul dan paragraf-nya **ikut jadi bagian dari grid** (mengisi cell kiri-atas), BUKAN ditulis terpisah di atas grid. Ini sempat salah diimplementasikan (teks di luar grid, cell kiri-atas dibiarkan kosong) sebelum dikoreksi berdasarkan screenshot & re-check Figma.
- Grid gambar **tidak butuh class posisi manual** — cukup `.detail-image-grid` diisi berurutan: `.detail-image-grid__text` (kalau ada) sebagai child PERTAMA, lalu sejumlah `<img class="detail-image">` sesuai kebutuhan. CSS Grid auto-placement otomatis mengisi kolom kanan lalu turun baris demi baris, persis urutan di Figma. Pola yang sama juga dipakai untuk "2 gambar sejajar tanpa teks" (tinggal isi 2 `<img>` saja, tanpa `__text`).
- **Grid gambar cuma 2 kolom di tablet & desktop (≥768px).** Di mobile, grid jadi **1 kolom vertikal** (gambar stack ke bawah, full-width) supaya tetap enak dibaca — ini juga sempat kelewatan (awalnya grid 2 kolom dipaksakan sampai ke mobile, bikin gambar jadi kecil dan sempit) sebelum dikoreksi.
- **Gambar di dalam grid TIDAK di-crop/di-stretch** — untuk `<img>` yang sudah beneran diisi sumber gambar, pakai `aspect-ratio: auto` (bukan rasio tetap seperti `.detail-image` biasa), jadi tiap gambar tampil di proporsi aslinya sesuai file yang di-upload. Baris grid otomatis menyesuaikan tinggi ke gambar yang paling tinggi di baris itu (perilaku default CSS Grid, tidak perlu diatur manual). Ini sempat salah — awalnya grid images dipaksa rasio 408:492 seragam via `object-fit: cover`, hasilnya banyak gambar ke-crop/stretch tidak sesuai aslinya — sudah dikoreksi berdasarkan perbandingan screenshot desktop/tab vs mobile dari Figma.
- **Placeholder (`<div class="detail-image">`, sebelum gambar asli di-upload) tetap pakai rasio fallback 408:492** — beda dari `<img>` yang boleh `aspect-ratio: auto`. Sebab: div kosong nggak punya ukuran intrinsik buat dijadiin acuan rasio, jadi kalau dipaksa `auto` dia collapse jadi tinggi 0 (invisible). CSS-nya beda selector: `.detail-image-grid img.detail-image` (auto) vs `.detail-image-grid div.detail-image` (fallback 408:492) — begitu placeholder diganti jadi `<img>`, otomatis dapet behaviour yang benar tanpa perlu ubah CSS.
- Gambar pakai `border-radius: 6px` (beda dengan `work-card` yang 4px — jangan disamakan).
- **Kadang 1 sub-judul punya beberapa gambar full-width yang cuma di-stack vertikal (bukan grid)** — ditemukan di Werk: Personnel Management ("Progressive Disclosure via Dual-Axis Navigation" punya 2 gambar full-width berurutan). Ini beda dari grid: tinggal taruh beberapa `<img class="detail-image">` berurutan sebagai sibling dari `.detail-block__text` di dalam `.detail-block detail-block--media` (bukan di dalam `.detail-image-grid`), masing-masing full-width 840:491 seperti gambar tunggal biasa — gap antar gambar-nya ikut nilai `.detail-block--media` yang sama (16px mobile / 24px tablet+).
- **Grid 2 kolom kadang lebarnya TIDAK sama** (sempat ditemukan di Atopia Space, rasio ~500:316, bukan 50:50) — pakai modifier class `.detail-image-grid--wide-narrow` di elemen `.detail-image-grid` yang sama (`<div class="detail-image-grid detail-image-grid--wide-narrow">`). Di mobile tetap stack 1 kolom seperti grid biasa, cuma di tablet+ kolomnya jadi timpang.
  - **Bug yang sempat kejadian:** pertama kali diimplementasikan pakai unit `fr` (`grid-template-columns: 500fr 316fr`), tapi entah kenapa di browser hasilnya malah rata 50:50 — sudah dites beberapa kombinasi `fr` (termasuk yang sederhana seperti `1fr 2fr`) dan semuanya ke-resolve sama rata, kemungkinan besar karena grid item-nya (placeholder `<div>` kosong) nggak punya ukuran intrinsik buat jadi basis distribusi `fr`. Fix-nya: pakai **persentase** (`61.27% 38.73%`, dari 500/816 dan 316/816) — persentase resolve dengan benar terlepas dari isi grid item-nya kosong atau tidak.
  - **Update:** user akhirnya revisi desainnya di Figma dan mengembalikan grid ini ke rata 50:50 biasa, jadi saat ini `.detail-image-grid--wide-narrow` TIDAK dipakai di halaman manapun. Class & CSS-nya tetap dipertahankan (tidak dihapus) karena kemungkinan dipakai lagi di project berikutnya (Kasatmata/ZNTRAL) kalau ada layout serupa.
- **Kalau nama frame gambar di Figma bentrok/dipakai berulang** (beberapa gambar beda pakai nama sama persis, misal 2 layer `img-1` untuk 2 gambar berbeda) — jangan asumsikan file akan otomatis unik. Tanyakan ke user dulu: mereka rename manual di Figma, ATAU kita yang kasih penomoran baru berurutan sesuai urutan baca halaman (lebih cepat, tapi harus dikasih tabel mapping yang jelas biar user tahu file mana untuk konten yang mana). Ini kejadian di Atopia Space — lihat catatan lengkapnya di `design.md`.
- Kalau project tidak punya live site publik (contoh: Bookdrop, tool internal), **badge "Watch live" di-skip sepenuhnya** — cukup judul project tanpa badge di sebelahnya.
- **Varian "images-only" / "gallery"** (ditemukan di Kasatmata, kemungkinan juga ZNTRAL): project ini cuma menampilkan galeri gambar, bukan studi kasus dengan sub-judul & paragraf per section. Strukturnya jadi lebih sederhana:
  ```
  detail-page
  ├── detail-section detail-section--tight (hero: judul + paragraf saja, sama seperti biasa)
  └── detail-section detail-section--gallery (SATU section berisi semua gambar berurutan, TANPA section terpisah per topik, TANPA "Outcome")
      ├── <img class="detail-image" ...>                                    ← gambar tunggal, langsung child .detail-section (skip .detail-block, karena tidak ada judul/paragraf untuk dibungkus)
      ├── <div class="detail-image-grid detail-image-grid--gallery"> ... </div>   ← grid gambar (2/3/dst)
      └── ...
  ```
  - **Modifier `.detail-section--gallery`:** karena tidak ada judul/paragraf per gambar yang butuh gap 56px standar, gap antar item di section ini lebih rapat: **16px mobile → 24px tablet & desktop** (satu nilai flat dari tablet ke atas, bukan naik lagi di desktop). Dipakai identik di Kasatmata & ZNTRAL — tidak butuh modifier tambahan per-project lagi (lihat catatan di bawah).
  - **Modifier `.detail-image-grid--gallery`:** grid 2 kolomnya TETAP 2 kolom sampai ke mobile (beda dari `.detail-image-grid` biasa yang stack ke 1 kolom di mobile) — gap kolomnya **16px mobile → 24px tablet & desktop**.
  - **Update (setelah full spacing re-audit):** awalnya Kasatmata terbaca punya gap 40px sendiri di desktop (beda dari ZNTRAL yang 24px), jadi sempat ada modifier tambahan `.detail-section--gallery-24` khusus ZNTRAL. Setelah user merapikan binding variable di Figma dan minta re-check total, ternyata Kasatmata desktop-nya JUGA 24px (bacaan 40px sebelumnya adalah dari frame yang belum di-bind ke variable dengan benar). Modifier `--gallery-24` sudah dihapus — sekarang `.detail-section--gallery` sendiri sudah 24px di desktop, dipakai sama persis oleh kedua project.
  - **Bug spesifisitas CSS yang sempat kejadian:** `.detail-section--gallery` dan `.detail-image-grid--gallery` awalnya ditulis sebagai selector class tunggal, spesifisitas-nya SAMA dengan `.detail-section`/`.detail-image-grid` biasa. Begitu breakpoint tablet `.detail-section` (plain) juga diberi `gap` eksplisit (buat fix bug gap-mobile di atas), urutan di file jadi menentukan siapa menang — bukan modifier-nya. Fix: semua selector varian gallery ditulis compound (`.detail-section.detail-section--gallery`, `.detail-image-grid.detail-image-grid--gallery`) supaya spesifisitasnya PASTI lebih tinggi, tidak tergantung urutan di file lagi.
  - Ini pola spacing yang beda sendiri dari section-section studi kasus, jadi selalu cross-check langsung ke Figma per breakpoint (jangan asumsikan ikut skala gap yang sama seperti project lain).

- **Bug yang sempat kejadian: border-bottom tiap section "berhenti di tengah" di monitor lebar** (>1440px, misal 1920/2560). Penyebabnya: `.detail-page` awalnya dikasih `max-width: 1440px; margin: 0 auto`, jadi SELURUH section (termasuk background & border-bottom-nya) ikut kepotong di 1440px, nyisain area putih polos tanpa section chrome di kanan-kirinya kalau layar lebih lebar dari itu. Padahal `navbar` dan `footer-detail` (yang berada DI LUAR `.detail-page`) sudah full-width dengan benar — jadi kelihatan seperti section-nya doang yang "nanggung". Paling kentara di halaman yang gambarnya penuh selebar section kayak Kasatmata.
  - **Fix:** `.detail-page` dihapus `max-width`/`margin`-nya (jadi full-width beneran, background+border tiap `.detail-section` reach ujung layar). Supaya konten (teks 840px) tetap kecap di lebar yang sama persis kayak Figma dan nggak ikut melebar di layar ultra-wide, `.detail-section` di breakpoint desktop (≥1280px) pakai `padding-left/right: max(var(--gutter), calc((100% - 840px) / 2))` — di ≤1440px hasilnya sama kayak sebelumnya (`--gutter` 300px), tapi begitu viewport lebih lebar dari 1440px, padding-nya otomatis nambah biar 840px kontennya tetap center, sementara background/border section-nya tetap full-bleed sampai ujung layar.

### Implementasi
`.detail-page`, `.detail-section`, `.detail-section--tight`, `.detail-section--outro`, `.detail-subgroup`, `.detail-block`, `.detail-block--media`, `.detail-block__text`, `.detail-title`, `.detail-hero`, `.watch-live`, `.detail-image`, `.detail-image-grid`, `.detail-image-grid__text` — semua di [css/style.css](css/style.css).

```html
<!-- text-only block (section-headline pattern, TANPA gambar mengikuti) -->
<section class="detail-section">
  <div class="detail-block">
    <h2 class="detail-title">Judul masalah</h2>
    <p class="paragraph">...</p>
  </div>

  <!-- sub-judul + paragraf + gambar: WAJIB pakai .detail-block--media +
       .detail-block__text supaya title→paragraf (4px) dan teks→gambar
       (16/24px) bisa punya gap yang beda -->
  <div class="detail-block detail-block--media">
    <div class="detail-block__text">
      <h3 class="detail-title">Sub-judul</h3>
      <p class="paragraph">...</p>
    </div>
    <img class="detail-image" src="..." alt="..." />
  </div>
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

## 8. `content-nav` ("List of content") — WIP, baru di-implementasi di [bookdrop.html](bookdrop.html)

**Awalnya bukan dari Figma** (dicontek dari live Framer site, referensi screenshot user), tapi user sudah nambahin variable warna ke Figma buat komponen ini — jadi sekarang token warnanya resmi ada di sana (collection "tokens"): `color/list_content-idle_closed-color`, `color/list_content-tab_idle_closed-color`, `color/list_content-idle_expand-color`, `color/list_content-active_expand-color`. Belum dipasang ke halaman detail lain, masih data dummy/manual per halaman (belum ada mekanisme generate otomatis dari isi section).

### Spec (dari user, dikonfirmasi cocok sama Figma variable)
| State | Font | Warna | CSS var |
|---|---|---|---|
| Idle (tertutup), desktop — `.content-nav__label` | 14px / Regular (400) | `list_content-idle_main-color` → neutral-100 `#0a0a0a` | `--color-list-content-idle-closed` |
| Idle (tertutup), mobile/tablet pill — `.content-nav__label` | 14px / Regular (400) | `list_content-tab_idle_closed-color` → alias ke `primary/main` `#0030bf` (SAMA dengan `--primary-main`, warna link/headline yang udah ada di project) | `--color-list-content-tab-idle-closed` |
| Expanded, item idle (tidak di-hover) — `.content-nav__link` | 14px / Regular (400) | `list_content-idle_expand-color` → neutral-60 `#9e9e9e` | `--color-list-content-idle-expand` |
| Expanded, item active (di-hover / section aktif) — `.content-nav__link:hover`, `.content-nav__link.is-active` | 14px / Regular (400) | `list_content-active_expand-color` → neutral-100 `#0a0a0a` | `--color-list-content-active-expand` |

**Update:** awalnya idle-closed & active-expand dicoba pakai weight Medium (500), tapi setelah dibikinin perbandingan side-by-side (artifact, 2 opsi: all-Medium vs all-Regular), user pilih **all-Regular** — jadi ketiga state sekarang sama-sama 14px/Regular, cuma warnanya yang berubah antar state (bukan weight-nya). Nama CSS variable (`--color-list-content-idle-closed`, dst.) tetap dipertahankan apa adanya biarpun token Figma-nya sempat disebut user dengan nama sedikit beda (`idle_main` vs `idle_closed`) — merujuk ke variable Figma yang sama, cuma beda cara nyebutnya.

**Catatan verifikasi:** tool automation browser di sesi ini cuma bisa "teleport" cursor ke satu titik per panggilan, jadi nggak bisa mensimulasikan gerakan mouse kontinu dari label turun ke salah satu link (yang mana cara kerja asli reveal-on-hover ini butuh gerakan kontinu, sama seperti pola dropdown-menu pada umumnya). Warna & weight idle-closed dan idle-expand sudah dicek langsung lewat `getComputedStyle` (akurat walau elemen sedang tersembunyi, karena computed style nggak bergantung visibility). Rule `:hover` buat active-expand sudah dicek langsung di raw CSS rule (`document.styleSheets`) buat mastiin var-nya kepasang benar — bukan lewat simulasi hover manual, karena keterbatasan tool di atas.

### Perilaku
- **Default state:** cuma nampilin teks "List of content".
- **Hover/focus:** teks label itu fade-out, digantikan daftar section (nama tiap `<h2>` utama di halaman itu) yang fade-in + scale-in (dari `scale(0.95)` ke `scale(1)`, 150ms ease-out) **dari titik tengah yang SAMA** dengan posisi label — bukan expand ke bawah dari atas kayak dropdown biasa. List-nya juga di-vertical-center sendiri (`top:50%` + `translateY(-50%)` relatif ke `.content-nav`), jadi begitu ke-reveal dia "membesar" simetris ke atas DAN ke bawah dari titik itu, bukan cuma nambah tinggi ke bawah doang.
  - **Revisi:** awalnya list di-`top:0` (nempel di titik yang sama dengan atas label doang), efeknya expand ke bawah dari atas — user nggak suka karena kesannya "List of content" jadi bagian PALING ATAS, bukan tetap jadi titik tengah/fokus. Dikoreksi ke `top:50%; transform: translateY(-50%) scale(...)` biar titik tengah list = titik tengah label, list "tumbuh" merata ke dua arah dari situ.
- Posisi desktop (≥1280px): **fixed, center-left** — `left: 24px` (var `--space-24`), `top: 50%` + `translateY(-50%)`. Di bawah 1280px komponennya ganti wujud total jadi tap-to-expand pill bottom-center — lihat subsection "Mobile & tablet" di bawah.
- Klik salah satu link scroll ke section terkait via native anchor (`href="#id-section"`) — setiap `<section class="detail-section">` di halaman perlu dikasih `id` yang cocok.
- Respect `prefers-reduced-motion: reduce` — transition di-nonaktifkan (langsung snap ke state akhir, nggak ada animasi sama sekali).

### Kenapa strukturnya begini (teknis)
Label (`.content-nav__label`) tetap normal di alur dokumen (nentuin tinggi `.content-nav` buat titik pusat `translateY(-50%)` si parent), sementara daftar (`.content-nav__list`) di-`position: absolute` supaya nggak nambah tinggi parent-nya. Ini penting: kalau list dibiarkan ikut alur normal, parent-nya jadi lebih tinggi pas di-hover, dan `translateY(-50%)` milik PARENT bakal RECALCULATE dari tinggi baru itu → titik tengahnya kelihatan "loncat" pas hover. Dengan list di-absolute, tinggi parent tetap konstan (cuma setinggi label).

List-nya sendiri di-posisikan `top:50%; transform: translateY(-50%) scale(...)` (BUKAN `top:0`) — jadi titik tengah vertikal LIST itu sendiri nempel pas di titik tengah `.content-nav` (yang sama dengan titik tengah label). Sudah dicek lewat `getBoundingClientRect()`: titik tengah label dan titik tengah list expanded selisihnya persis 0px. Efeknya, list kelihatan "tumbuh dari tengah" ke dua arah (atas & bawah), bukan cuma nambah ke bawah doang seperti dropdown pada umumnya.

### Implementasi
`.content-nav`, `.content-nav__label`, `.content-nav__list`, `.content-nav__link` — semua di [css/style.css](css/style.css).

```html
<nav class="content-nav" aria-label="Section navigation">
  <button type="button" class="content-nav__label" aria-expanded="false">List of content</button>
  <ul class="content-nav__list">
    <li><a href="#section-id" class="content-nav__link">Nama Section</a></li>
    <!-- ...ulangi per section -->
  </ul>
</nav>
```

`.content-nav__label` sengaja berupa `<button>` (bukan `<p>`) sejak komponen ini didukung di mobile/tablet — di desktop dia tetap cuma teks polos berkat CSS reset (`appearance:none; background:none; border:none`), tapi jadi elemen yang beneran bisa di-tap & accessible-focusable buat breakpoint yang nggak punya hover.

Taruh `<nav class="content-nav">` di mana saja di `<body>` (posisinya `fixed`, jadi tidak terikat urutan DOM) — tapi tiap `<section class="detail-section">` yang mau dituju WAJIB dikasih `id` yang match dengan `href` link-nya.

Klik link-nya scroll ke section terkait dengan **smooth scroll**, bukan langsung loncat — ini global lewat `html { scroll-behavior: smooth; }` di [css/style.css](css/style.css) (dekat `* {}` reset di atas), jadi berlaku buat SEMUA anchor `href="#id"` di seluruh site (bukan cuma content-nav) dan semua breakpoint sekaligus, tanpa JS tambahan. Di-reset ke `scroll-behavior: auto` di dalam `@media (prefers-reduced-motion: reduce)`.

### Scroll-spy ("selected" state)
Link section yang lagi keliatan di viewport otomatis dikasih class `.is-active` — `.content-nav__link.is-active { color: var(--color-list-content-active-expand); }`, ini SATU-SATUNYA rule warna "active" yang berlaku universal (semua breakpoint). Di desktop, `:hover`/`:focus-visible` juga dikasih warna yang sama tapi itu rule TERPISAH yang cuma hidup di dalam `@media (min-width: 1280px)` — dipisah biar nggak ketarik ke breakpoint mobile/tablet yang nggak punya hover sama sekali.

Logic-nya di `initContentNav()` ([js/main.js](js/main.js)): pakai `IntersectionObserver` dengan `rootMargin: "-20% 0px -70% 0px"` — jadi section dianggap "aktif" begitu dia masuk ke pita tipis di sekitar 20%–30% dari atas viewport (bukan begitu section itu MULAI kelihatan, supaya nggak keburu ganti pas section berikutnya baru nongol dikit di bawah). Function ini otomatis skip kalau halaman nggak punya `.content-nav` (guard clause di baris pertama), jadi aman ditaruh global di `main.js` walau cuma jalan efektif di halaman yang punya komponen ini.

### Bug yang sempat kejadian: animasi close "flicker" (beda rasa sama animasi open)
User rekam video nunjukin animasi pas mouse ENTER (buka) mulus, tapi pas mouse LEAVE (nutup) kelihatan beda/patah-patah, padahal kode `transition`-nya sama persis buat dua arah. Setelah ditelusuri, penyebabnya BUKAN di durasi/easing, tapi di **gap kosong antar `<li>`**: `.content-nav__list` pakai `gap: 12px` (flexbox gap), dan gap itu bukan bagian dari box element manapun — jadi begitu cursor user turun ngelewatin salah satu gap tersebut (misal pas mau ngarah ke link di bawahnya), cursor sempat berada di titik yang TIDAK ke-hover-test oleh elemen apapun di dalam `.content-nav`, bikin `:hover` state-nya kepututs sesaat → list mendadak mulai nutup → lalu cursor lanjut turun masuk ke link berikutnya → kebuka lagi. Hasilnya: bukan 1 animasi close yang mulus, tapi beberapa animasi close-open kecil yang numpuk, keliatan "flicker"/beda dari animasi open (yang cuma 1 kali trigger, dari label).

**Fix:** `gap` di `.content-nav__list` dihapus total (`gap:0`), diganti `padding: 6px 0` (var `--space-6`, baru ditambahin ke scale spacing) di `.content-nav__link` — total visual spacing antar link tetap 12px (6px+6px dari 2 link yang bersebelahan), tapi sekarang SEMUA piksel di antara dua link itu masuk hit-area salah satu `<a>`-nya (nggak ada celah kosong lagi). Cursor yang bergerak turun ngelewatin list nggak akan pernah keluar dari hit-area `.content-nav`, jadi hover state-nya tetap utuh dari awal buka sampai user beneran keluar dari area list-nya — animasi open dan close jadi konsisten satu kali trigger yang mulus, bukan flicker berkali-kali.

### Revisi mekanisme reveal — dicontek dari referensi live site
User kasih referensi [muhraufan.com/work/tiket-discover-full.html](https://muhraufan.com/work/tiket-discover-full.html) (section rail di kiri layar) dan minta animasi expand-nya dipelajari & diterapkan. Struktur & CSS reference itu diperiksa langsung (bukan cuma dilihat visual) lewat `document.styleSheets` di browser. Intinya: reference itu nggak pakai trik `scale()` kayak implementasi saya sebelumnya — dia animate `height` tiap item dari kecil ke penuh (280ms, `cubic-bezier(0.2, 0, 0, 1)`), dan karena parent-nya juga `top:50% + translateY(-50%)`, si parent otomatis re-center TIAP FRAME selama height berubah (posisi vertikal recalculate live, bukan cuma di awal/akhir) — hasilnya "tumbuh dari tengah" yang jauh lebih organik dibanding cuma scale satu blok sekaligus. Dia juga staggered: tiap item text-nya fade-in dengan delay berjenjang 18ms per item (item ke-2 delay 18ms, ke-3 36ms, dst).

**Diterapkan ke `.content-nav`, disesuaikan** (tetap pertahankan "List of content" sebagai teks closed-state, BUKAN niru bar/dash reference karena itu beda desain):
- `.content-nav__list` transform `scale(0.95→1)` DIHAPUS, diganti tiap `<li>` sendiri yang animate `max-height: 0 → 60px` (280ms, `cubic-bezier(0.2,0,0,1)` — cocok sama easing reference). `.content-nav__list`-nya sendiri tetap `top:50% + translateY(-50%)` tapi TANPA scale lagi — sekarang re-center-nya murni dari height beneran berubah (reflow), bukan trik visual.
- `.content-nav__link` opacity fade tetap ada (240ms), tapi sekarang punya **staggered delay per item** (18/36/54/72/90ms) persis kayak reference — kesannya jadi "cascading" pas kebuka, bukan semua muncul barengan sekaligus.
- `max-height:60px` (bukan angka pas 1 baris) sengaja dikasih ruang lebih karena beberapa link judulnya panjang & wrap ke 2 baris (misal "Transforming the Dashboard into a Strategic Command Center") — `max-height` yang lebih generous ini aman karena dikombinasi sama opacity fade, jadi item 1-baris kelihatan udah penuh duluan sebelum max-height-nya abis, sementara item 2-baris tetap kebagian ruang cukup.
- **Catatan penyimpangan dari best-practice animasi** ("animate transform/opacity aja, jangan height/width"): di sini sengaja dilanggar, karena efek "tumbuh dari tengah" yang diminta user SPESIFIK butuh reflow beneran (biar `top:50%+translateY(-50%)` re-center secara live) — nggak ada cara replicate itu murni pakai transform/opacity doang. Skala elemennya kecil (list sidebar 220px, 6 baris teks) jadi dampak performa reflow-nya nggak signifikan; exception ini dipertimbangkan & disengaja, bukan kealpaan. Sitenya sendiri (referensi) juga pakai teknik yang sama persis untuk alasan yang sama.
- Verifikasi: dicek lewat `getBoundingClientRect()` real-hover (bukan paksa inline style — inline style sempat ke-override sama script dev-tool dari sesi lain yang aktif di folder yang sama, jadi verifikasi dipindah ke real `:hover` trigger) — titik tengah label closed vs titik tengah list yang udah expand penuh (282px, termasuk item yang wrap 2 baris) selisihnya 0px persis. Delay stagger per link juga dicek `getComputedStyle().transitionDelay` — hasilnya match 0/18/36/54/72/90ms sesuai rencana.

### Mobile & tablet (<1280px) — tap-to-expand, bukan hover
Di bawah 1280px nggak ada hover, jadi interaksinya diganti total: `.content-nav__label` (sekarang `<button>`) di-fixed di `bottom: 24px`, horizontal-center (`left:50%; transform:translateX(-50%)`), dibungkus jadi kartu putih pill — `padding: 8px 16px` (var `--space-8 --space-16`), `border-radius: 8px`, border `--color-stroke`, `box-shadow: 0 10px 10px -4px rgba(0,0,0,.1)` (reuse visual language dari component [`button`](#2-button) yang udah ada), teks warna `--color-list-content-tab-idle-closed` (token baru, alias ke `--primary-main` — beda dari warna idle-closed versi desktop yang neutral-100).

Referensi behavior-nya dari live site Framer milik user sendiri ([aryogilangm.framer.website/booksmart](https://aryogilangm.framer.website/booksmart), diperiksa langsung DOM/CSS-nya lewat `document.styleSheets` + `getBoundingClientRect()`, bukan cuma ditonton): tombol pill fixed di bottom-center, di-tap memunculkan card yang tumbuh KE ATAS (anchor bawahnya tetap diam, cuma tinggi card yang nambah) berisi daftar section, item yang lagi aktif dibedain warnanya dari yang idle. Punya kita sekarang match persis pola ini — tombol pill-nya HILANG total (`display:none`) begitu di-tap, cuma card list yang keliatan, tanpa header "List of content" di atasnya (revisi dari draft pertama yang sempat nyisain label jadi header — user minta dibuang, langsung ke list aja).

- **Struktur:** `.content-nav.is-expanded` — class ini yang di-toggle oleh JS (`initContentNav()` di [js/main.js](js/main.js)), bukan `:hover`. Saat `.is-expanded` aktif, `.content-nav__label` di-`display:none` (bukan cuma disamarkan), jadi `.content-nav__list` otomatis jadi satu-satunya child yang keliatan → radius-nya `8px` di semua sudut (bukan cuma bawah kayak draft pertama, karena sekarang dia berdiri sendiri, nggak nyambung ke header manapun).
- **Animasi buka/tutup — "cascade pop + soft bounce":** dipilih dari 3 opsi yang dibikin perbandingan interaktif dulu (live A/B, bukan cuma dijelasin) — Opsi 1 "precise grow" (`grid-template-rows: 0fr→1fr`) dan Opsi 2 "plain pop" (transform doang, tanpa stagger item) DIBUANG, yang dipilih user adalah versi bounce.
  - **Container (`.content-nav__list`):** transform+opacity SEPENUHNYA, TIDAK ADA animasi height/max-height sama sekali (beda dari draft-draft sebelumnya) — `transform-origin: bottom center`, dari `translateY(6px) scale(0.9)` opacity 0 ke `translateY(0) scale(1)` opacity 1. Buka pakai `cubic-bezier(0.34, 1.56, 0.64, 1)` (kurva back-out/spring ringan — overshoot dikit lalu settle, ngasih kesan "mendarat" yang hidup), 320ms. Tutup SENGAJA beda kurva &amp; lebih cepat: `cubic-bezier(0.2,0,0,1)` (linear/tenang, TANPA bounce), 160ms — bounce cuma buat entrance, exit harus tetap tenang &amp; lebih cepat (aturan "exit lebih pelan dari enter" dibalik jadi "exit jangan pakai efek yang sama kayak enter").
  - **Per-item cascade:** tiap `<li>` (via `.content-nav__list li:nth-child(N) .content-nav__link`, POLA YANG SAMA kayak desktop — bukan `.content-nav__link:nth-child(N)` yang keliru karena tiap link itu satu-satunya child dari `<li>`-nya sendiri) fade+slide `translateY(6px)→0`, delay 18ms per item (0/18/36/54/72/90ms), 220ms `cubic-bezier(0.2,0,0,1)`. Beda dari desktop yang stagger-nya jadi bagian dari "grow" fisik list-nya, di sini stagger murni buat kesan hidup di atas container yang udah transform-only.
  - **Bug yang sempat kejadian pas bikin versi perbandingan:** panel yang lagi `position:absolute` otomatis stack DI ATAS tombol trigger yang `position:static` (aturan default CSS stacking), jadi begitu expanded, tombol jadi ketutup fisik &amp; nggak bisa di-tap lagi buat toggle balik. Di komponen aslinya ini nggak kejadian karena tombolnya emang udah `display:none` pas expanded (lihat poin di atas), TAPI muncul bug SEBALIKNYA: karena container sekarang transform-only (bukan `max-height:0` yang bikin box-nya kepotong ~0px), pas keadaan CLOSED, box `.content-nav__list` tetap full-size (cuma di-scale/opacity-in kan invisible), otomatis nutupin tombol di baliknya juga — makanya `.content-nav__list` dikasih `pointer-events: none` selagi closed (di-`auto`-in lagi cuma pas `.is-expanded`), biar klik ke tombol tetap tembus.
- **3 cara nutup** (semua di `initContentNav()`): (1) tap salah satu link → navigasi ke section DAN otomatis nutup card; (2) tap di luar `.content-nav` saat kebuka → nutup; (3) **scroll halaman** (event `scroll` di `window`, `{passive:true}`) → nutup — ini penting justru KARENA tombol togglenya sendiri hilang saat expanded, jadi user butuh cara lain buat "kabur" dari card selain nge-tap salah satu link; scroll adalah gesture paling natural buat itu. Tambahan: `Escape` → nutup + kembaliin focus ke tombol toggle (aksesibilitas keyboard).
- Warna item di dalam list ikut token yang SAMA dengan desktop (`--color-list-content-idle-expand` buat idle, `--color-list-content-active-expand` buat `.is-active`) — cuma trigger-nya beda (scroll-spy tetap jalan, cuma nggak ada `:hover` karena nggak ada mouse).
- **Kenapa markup HTML-nya sama persis dengan desktop:** CSS-nya yang discope per-breakpoint (`@media (max-width: 1279.98px)` vs `@media (min-width: 1280px)`), bukan markup terpisah — satu `<nav class="content-nav">` otomatis "berubah wujud" total di breakpoint yang beda, nggak perlu dua versi HTML atau JS conditional berdasarkan lebar layar.

**Bug yang sempat kejadian: pill kepanjangan, nggak "hug" kayak di Framer.** Penyebabnya: `.content-nav` (parent fixed) dikasih `width: min(280px, ...)` LANGSUNG di base rule-nya (buat kasih lebar card list pas expand), terus `.content-nav__label` di-`width:100%` biar ngisi parent — akibatnya pill closed-state ikut kepaksa selebar 280px juga (teks pendek "List of content" jadi ngambang di tengah kotak lebar, bukan pas nge-pas kayak Framer yang `hug`/`fit content`).

**Fix:** `.content-nav` sekarang nggak punya `width` sama sekali (auto → shrink-to-fit, otomatis hug ke child yang lagi in-flow). `.content-nav__label` dikasih `width: max-content` (hug teksnya sendiri, ~126px buat "List of content"). Lebar 280px dipindah ke `.content-nav__list` doang, TAPI list-nya di-`position: absolute` — kalau dibiarkan tetap in-flow (normal, ikut alur dokumen), lebar 280px-nya bakal tetap "bocor" ke perhitungan shrink-to-fit parent walaupun lagi disembunyiin via `max-height:0;overflow:hidden` (dua hal itu cuma motong tinggi, bukan ngeluarin elemennya dari perhitungan lebar). Dengan `position:absolute`, list keluar total dari flow, jadi sama sekali nggak mempengaruhi lebar pill pas closed. List di-posisikan `left:50%; bottom:0; transform:translateX(-50%)` — self-centering, dan tetap growth dari titik anchor bawah yang sama persis kayak sebelumnya, terlepas dari lebar `.content-nav` sendiri.

### Status rollout
Sudah dipasang di semua halaman detail case-study (Bookdrop, Atopia Space, Booksmart, semua Werk) kecuali ZNTRAL & Kasatmata (gallery gambar doang, nggak ada section case-study buat di-navigate), dan di halaman artikel ([article-agentic-ai.html](article-agentic-ai.html), lihat section 9). Markup-nya selalu sama: copy `<nav class="content-nav">` + sesuaikan daftar section & `id`-nya per halaman — CSS & JS generic, `initContentNav()` otomatis nyocokin `href` ke `id` section apa pun yang ada di markup.

---

## 9. Article page (`article-agentic-ai.html`) — beda dari detail-page case-study

**Kenapa halaman baru, bukan pola `detail-page` yang sudah ada:** case-study (Bookdrop, dkk) itu produk UI-heavy — tiap section punya heading singkat + 1 paragraf + gambar besar, dengan gap antar-block yang lega (40/56px, lihat `.detail-section`/`.detail-block`). Article ini tulisan panjang (personal essay soal proses belajar Claude Code buat bikin situs ini sendiri) — rhythm-nya harus lebih rapat & konsisten kayak artikel beneran, bukan spasi lega ala case-study. Dicek di Figma: gap antar SEMUA direct child section (judul→paragraf, paragraf→paragraf, paragraf→gambar) itu flat 24px di semua breakpoint, beda total dari detail-page punya.

**Link masuknya:** section baru **"Experiments"** di home page ([index.html](index.html)), di antara `.headline` dan `.selected-works` — daftar tulisan/eksperimen yang akan nambah dari waktu ke waktu (`.experiments__list` isinya array `.experiment-card`, masing-masing cuma judul + deskripsi pendek, TANPA thumbnail gambar — beda dari `.work-card` yang selalu ada gambar). Dinamain "Experiments" (bukan "Articles"/"Blog") biar nggak generik — sesuai istilah user sendiri.

### Reuse dari sistem `detail-page` yang sudah ada
Ternyata strukturnya SANGAT mirip case-study (section dengan border-bottom + padding gutter-responsif + judul + isi), cuma beda rhythm-nya doang — jadi hampir semua class DIPAKAI ULANG, bukan bikin sistem paralel baru:
- `.detail-page`, `.detail-section` (+ `--tight` buat hero, `--outro` buat "Outcome") — reuse APA ADANYA buat bg/border/padding/breakpoint gutter (40→100→300px, `--gutter` var yang sama persis).
- **Satu-satunya tambahan:** `.detail-section.detail-section--article { gap: var(--space-24); }` — override gap-nya doang (compound class, pola yang sama kayak `.detail-section--gallery`), padding/border/breakpoint-nya tetap warisan dari `.detail-section`.
- `.title` (headline biru "A Designer's First Attempt at Directing Agentic AI") dan `.detail-title` (judul tiap section: "Figma as the Foundation. Still.", dst) — reuse langsung, size/warna-nya di Figma cocok 1:1 sama token yang sudah ada.
- `.paragraph` — reuse langsung buat semua body text.
- `.navbar` — TAPI TANPA modifier `--transparent` (beda dari case-study yang transparan di atas hero image) karena halaman ini nggak punya hero image, nav-nya solid putih dari awal. Teksnya juga beda: `HOME` (link ke `index.html`), bukan `ALL WORKS` (link ke `works.html`) — reuse class `.navbar__title` yang sama, cuma teks & href-nya beda.
- `.content-nav` — reuse 100% apa adanya (lihat section 8), daftar section-nya cuma disesuaikan sama section artikel ini (Overview, Figma as the Foundation. Still., First Encounter with Agentic AI, Being an Orchestrator. Not a Coder., Outcome).
- `.footer-detail` — reuse 100% apa adanya, sama persis kayak semua halaman detail.

### Class baru yang ditambahin
- **`.caption`** (12px/Regular, warna sama kayak `.paragraph`) — teks kecil di bawah gambar, belum ada di sistem lama karena case-study nggak punya caption gambar.
- **`.article-figure`** — wrapper flex-column gap 12px buat `<img class="detail-image">` + `<p class="caption">`. Gambar-nya reuse class `.detail-image` yang sudah ada (aspect-ratio 840/491 pas banget sama rasio file PNG yang di-export user, 1260×737).
- **`.article-figure__placeholder`** — kotak dashed-border kosong, dipakai buat slot gambar/interactive yang belum jadi (lihat di bawah).

### Gambar: full export dari Figma, bukan dibangun ulang
Semua gambar (`assets/images/article-agentic_AI/img-1.png` s.d. `img-5.png`) itu FULL COMPOSITE export dari Figma — termasuk yang aslinya diagram custom di Figma (panah pemetaan warna, grid swatch token) dan yang before/after 2-gambar-berdampingan, semuanya sudah di-flatten jadi satu file PNG per section sama user. Jadi nggak perlu rebuild diagram-nya pakai HTML/CSS — tinggal `<img>` biasa persis kayak screenshot case-study lain.

### Belum selesai
Satu slot gambar di section "Being an Orchestrator. Not a Coder." masih placeholder (`.article-figure__placeholder`, teks "Interactive before/after demo — coming soon") — rencananya bakal jadi demo interaktif before/after dari iterasi animasi `content-nav` (draft awal yang user nggak suka sampai versi final yang dipakai sekarang), terinspirasi dari [muhraufan.com/work/tiket-discover.html](https://muhraufan.com/work/tiket-discover.html). Sengaja belum dibangun — user eksplisit minta extract struktur dulu, interactive-nya dikerjain bareng nanti.

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
