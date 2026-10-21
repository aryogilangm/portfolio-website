# Design Reference — website-aryogilangm-v2

Sumber: Figma file `website-aryogilangm-v2` (page "asset" = components & tokens, page "design" = page layouts).
File ini jadi rujukan utama saat coding, supaya hasil di kode konsisten sama desain di Figma.

> Untuk spec detail tiap reusable component (state, variant, contoh markup) lihat [components.md](components.md) — file ini cuma kasih ringkasan singkatnya di bagian 2.

---

## 1. Design Tokens

### 1.1 Warna — Primitive (nilai mentah)

| Nama | Hex |
|---|---|
| neutral/10 | `#FFFFFF` |
| neutral/20 | `#F5F5F5` |
| neutral/30 | `#EDEDED` |
| neutral/40 | `#E0E0E0` |
| neutral/50 | `#C2C2C2` |
| neutral/60 | `#9E9E9E` |
| neutral/70 | `#757575` |
| neutral/80 | `#616161` |
| neutral/90 | `#404040` |
| neutral/100 | `#0A0A0A` |
| primary/Main | `#0030BF` |
| primary/Hover | `#00207F` |
| primary/Pressed | `#001247` |
| primary/Surface | `#E6EBFA` |
| primary/Border | `#CED7F2` |
| primary/Primary-Focused | `#D1DCF5` |

### 1.2 Warna — Semantic (dipakai langsung di komponen)

Ini yang jadi CSS variable nanti — namanya sudah jelas menjelaskan fungsinya:

| Token semantik | Mengacu ke | Hex |
|---|---|---|
| `main-bg-color` | neutral/10 | `#FFFFFF` |
| `main-paragraph-color` | neutral/70 | `#757575` |
| `main-text-color` | neutral/70 | `#757575` |
| `main-headline-color` | primary/Main | `#0030BF` |
| `main-subheadline-color` | neutral/100 | `#0A0A0A` |
| `main-stroke-color` | neutral/30 | `#EDEDED` |
| `stroke-subtle-color` | neutral/30 | `#EDEDED` |
| `card-title-color` | neutral/100 | `#0A0A0A` |
| `card-subtitle-color` | neutral/70 | `#757575` |
| `card-title-hover-color` | primary/Main | `#0030BF` |
| `navbar-bg-color` | neutral/10 | `#FFFFFF` |
| `navbar-menu-color` | neutral/100 | `#0A0A0A` |
| `navbar-title-color` | neutral/100 | `#0A0A0A` |
| `link-default-color` | neutral/70 | `#757575` |
| `link-hover-color` | primary/Main | `#0030BF` |
| `link-pressed-color` | primary/Main | `#0030BF` |
| `button-bg-color` | neutral/10 | `#FFFFFF` |
| `button-stroke-color` | neutral/30 | `#EDEDED` |
| `button-text-color` | neutral/70 | `#757575` |
| `button-text_pressed-color` | neutral/90 | `#404040` |
| `button_live-bg-color` | neutral/30 | `#EDEDED` |
| `button_live-text-color` | neutral/100 | `#0A0A0A` |

### 1.3 Spacing & Padding scale

Skala berbasis kelipatan 4px:

```
4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 78, 80, 84, 88, 92, 96, 100, 150, 200, 250, 300
```

Figma punya 2 grup terpisah tapi nilainya sama (`padding system/*` dan `spacing system/*`) — di kode cukup 1 set CSS variable, dipakai untuk padding maupun gap/margin.

### 1.4 Typography

| Style | Font | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| Header/18/Medium | Nohemi | 18px | 500 | 27px | 0.7px |
| Header/20/Medium | Geist | 20px | 500 | 30px | 1px |
| Paragraph/16/Regular | Geist | 16px | 400 | 24px | 0.7px |
| Paragraph/16/Medium | Geist | 16px | 500 | 24px | 0.7px |
| Paragraph/18/Regular | Geist | 18px | 400 | 27px | 0.7px |

**Font families:** Nohemi (untuk nama/judul kecil seperti "Hi, I'm Aryo"), Geist (untuk semua body text & nav).

### 1.5 Dark mode (mode "Dark" di collection `tokens`)

Cuma token semantik yang berganti; primitive tetap. Di Figma primitive juga bertambah: `neutral/110` = `#0a0a0a` (yang dulu disebut `neutral/100`), `neutral/100` sekarang `#111110`, plus grup `primary-dark/*` (main `#3e7bf9`, surface `#0e162c`, border `#192544`, hover `#9bbdff`, pressed `#bbd5ff`, focused `#15203c`). Di CSS: `--neutral-110`, `--neutral-100`, `--primary-dark-*`.

| Token semantik | Light | Dark |
|---|---|---|
| `main-bg` / `navbar-bg` / `button-bg` | neutral/10 | neutral/100 (`#111110`) |
| `main-paragraph` / `main-text` / `link-default` / `button-text` | neutral/70 | neutral/50 (`#c2c2c2`) |
| `main-headline` | primary/main | primary-dark/main (`#3e7bf9`) |
| `main-subheadline` / `card-title` / `navbar-menu` / `navbar-title` | neutral/110 | neutral/10 (putih) |
| `card-subtitle` | neutral/70 | neutral/70 |
| `stroke-main` / `stroke-subtle` / `button-stroke` | neutral/30 | neutral/80 (`#616161`) |
| `card-title-hover` / `link-hover` / `link-pressed` | primary/main | primary-dark/main |
| `button-text_pressed` | neutral/90 | neutral/60 |
| `list_content-*` | idle-closed neutral/110 · idle-expand neutral/60 · active-expand neutral/110 · tab-idle-closed primary/main | neutral/10 · neutral/60 · neutral/10 · neutral/10 |
| `button_live-bg` / `-text` | neutral/30 · neutral/110 | **neutral/90 · neutral/10** (BEDA dari Figma: di Figma Dark-nya neutral/30 + neutral/10, kontras ~1.2:1 jadi tidak terbaca — nilai Figma-nya perlu disesuaikan) |
| `asset-bg` (baru, background aset/frame interaktif) | `#f0f0f0` | `#f0f0f0` (sama di kedua tema, karena aset dipakai bersama) |
| `tab_switcher-bg` / `-button-bg` / `-text-active` / `-text-idle` | neutral/10 · neutral/110 · neutral/10 · neutral/70 | neutral/100 · neutral/10 · neutral/110 · neutral/30 |

Di kode: blok `:root[data-theme="dark"]` di [css/style.css](css/style.css) me-remap CSS variable semantik di atas. Tema di-set lewat `data-theme` di `<html>` (script inline di `<head>` baca `localStorage["theme"]`, **default light**, bukan ikut sistem). Toggle-nya ada di navbar, lihat [components.md](components.md) bagian `nav-bar`. Rollout: baru `index.html` dan `works.html`; halaman detail project belum (tetap light).

---

## 2. Reusable Components (dari page "asset")

> Ringkasan singkat — spec lengkap (state, contoh markup, catatan koreksi bug) ada di [components.md](components.md).

| Component | Variant/State | Catatan |
|---|---|---|
| `nav-bar` | `home-page` (tanpa teks, toggle tema saja), `all-works` (teks "HOME" + toggle), `detail-page` (teks "ALL WORKS", transparent) | Style Header/20/Medium, padding 16px vertikal 40px horizontal. Semua varian punya toggle tema (segmented-button, sun/moon) di kanan. `home-page` dipakai di index.html, `all-works` di works.html, `detail-page` di halaman detail project (toggle belum dipasang di sana) |
| `button` | default | radius 8px, padding 8px 16px, bg putih, border `#ededed`, teks abu |
| `Link` | size (Default/Large) × state (default/hover/pressed) | underline, warna berubah abu → biru saat hover/pressed |
| `work-card` | — | Gambar (rectangle) + Work Title + Subtitle, dipakai di grid project |
| `footer-main` | — | Jam realtime + lokasi ("in Surabaya") + copyright, dipakai di halaman list |
| `footer-detail` | `dekstop`, `tab`, `mobile` | Email + social links (Linkedin/Dribbble/Upwork) + copyright, dipakai di halaman detail project |

Icon library ada di section "Icon - Bootstrap" (koleksi besar, ~2173 icon — export sesuai kebutuhan saja, jangan semua).

---

## 3. Struktur Halaman (dari page "design")

### Daftar section/halaman yang terdeteksi:
- **home** ✅ sudah di-extract detail (lihat bawah)
- **index** — kemungkinan halaman daftar semua project (belum di-extract)
- **Booksmart**, **Bookdrop**, **Employee Self Service**, **Personnel Management**, **CRM**, **Mobile App**, **Atopia Space**, **Kasatmata**, **ZNTRAL** — 9 halaman detail project (belum di-extract, tapi kemungkinan pakai layout sama)

### 3.1 Halaman "home" — struktur & konten

Layout: `headline` → `selected-works` (grid 4 work-card + tombol "All Works") → `footer-main`

**Headline:**
- Title: "Hi, I'm Aryo" (warna primary/Main)
- Paragraf 1: "I'm a Surabaya-based UI/UX and Product Designer with 5+ years of experience designing for SaaS, ERP, HRIS, and e-commerce platforms across Southeast Asia and beyond."
- Paragraf 2: "I've designed for Booksmart, an e-commerce platform, and Bookdrop, its internal order management system. My work has also spanned an ERP for ZNTRAL, HRIS modules for Werk, and a VR curation platform for Atopia Space."
- Paragraf 3: "I specialize in the parts of a product most people don't see, complex logic, edge cases, multi-step workflows, and I'm currently expanding into Framer to bring designs closer to production myself."
- Paragraf 4: "You can reach me via aryo.maudyansa@gmail.com or LinkedIn."

**Selected Works (4 project card):**
1. Booksmart — E-commerce Website
2. Bookdrop — E-commerce Back-Office & OMS
3. Werk: Employee Self Service (ESS) — B2B HRIS Platform
4. Werk Mobile Apps — HRIS Companion App

**Footer:** jam realtime + "in Surabaya" + "©2026"

### 3.2 Responsive breakpoints (dari frame "home")

| Breakpoint | Width | Container padding (kiri-kanan) |
|---|---|---|
| Desktop | 1440px | 300px |
| Tablet | 810px | 100px |
| Mobile | 390px | 40px |

### 3.3 Spacing khusus halaman "home" (`.container`, beda dari halaman lain)

Ditemukan lewat full spacing re-audit setelah user merapikan variable binding di Figma — beberapa angka di halaman home ternyata BEDA dari yang tadinya diasumsikan sama dengan pattern umum:

| Elemen | Nilai benar (semua breakpoint kecuali disebutkan) | Implementasi lama (salah) |
|---|---|---|
| `.container` padding-bottom, mobile only | 64px | 80px (ikut nilai desktop/tablet) |
| `.headline` margin-bottom | 40px | 64px |
| `.about__text` margin-top (judul → paragraf) | 24px | 16px |
| `.about__text` gap (antar paragraf) | 16px | 24px |
| `.selected-works__title` margin-bottom | 24px | 32px |
| `.works` margin-bottom (grid → tombol "All Works") | 24px | 32px |

**Catatan penting:** `.selected-works__title` dan `.works` juga dipakai di `works.html` (via class yang sama), dan DI SANA nilai 32px memang benar (sudah dicek terpisah, cocok dengan Figma works-container). Jadi fix-nya BUKAN mengubah default class-nya, melainkan nambahin override `.container .selected-works__title` / `.container .works` yang cuma berlaku di dalam `.container` (home) — karena `.container` cuma dipakai di `index.html`, sementara `works.html` pakai `.works-container` yang terpisah. Lihat [components.md](components.md) untuk detail CSS-nya.

---

## 4. Yang Masih Perlu Disiapkan / Dikerjakan

> **Aset gambar dipakai sama untuk light dan dark:** satu set di `assets/images/<folder>/` (bukan `light/` dan `dark/` terpisah). Background aset `#F0F0F0` di kedua tema (`--color-asset-bg`). Kalau suatu halaman butuh aset per tema, rencananya dicoba dulu di halaman Werk (belum ada).


- [x] Extract detail section **index** → sudah jadi `works.html` (All Works), grid 1/2/3 kolom
- [x] Extract detail project **Booksmart** → sudah jadi `booksmart.html`, jadi template pola untuk project lainnya (lihat [components.md](components.md) bagian 7 "Detail Page Content Structure")
- [x] Extract detail project **Bookdrop** → sudah jadi `bookdrop.html` lengkap dengan 17 gambar. Tidak ada badge "Watch live" (internal tool, bukan public site)
- [x] Extract detail project **Werk: ESS** → sudah jadi `werk-ess.html` lengkap dengan 10 gambar (folder: `assets/images/ess-detail-page/`). Struktur pakai semua variasi grid (1/2/4 gambar)
- [x] Extract detail project **Werk: Personnel Management** → sudah jadi `werk-personnel-management.html` lengkap dengan 10 gambar (folder: `assets/images/personnel-detail-page/`). Termasuk pola baru: 2 gambar full-width bertumpuk berurutan tanpa grid
- [x] Extract detail project **Werk: CRM** → sudah jadi `werk-crm.html` lengkap dengan 5 gambar (folder: `assets/images/crm-detail-page/`). Sempat ketemu bug konten di Figma (paragraf Outcome copy-paste dari Personnel Management) — sudah dilaporkan ke user dan diperbaiki sebelum di-extract
- [x] Extract detail project **Werk: Mobile App** → sudah jadi `werk-mobile-apps.html` lengkap dengan 6 gambar (folder: `assets/images/mobile-apps-detail-page/`)
- [x] Extract detail project **Atopia Space** → sudah jadi `atopia-space.html`, struktur lengkap.
  - **Update (re-extract):** user merapikan ulang frame di Figma — rename semua layer gambar jadi penomoran sekuensial baru (lebih gampang buat upload), hapus 1 pasang gambar yang dianggap tidak perlu (grid di bawah "Proximity vs. Manual Interaction Triggers" dihapus total, sekarang cuma 1 gambar tunggal di section itu), dan grid 2 kolom yang tadinya asimetris (~500:316, `.detail-image-grid--wide-narrow`) dikembalikan ke rata 50:50 biasa (`.detail-image-grid` tanpa modifier). Struktur HTML & nama file sudah disesuaikan dengan Figma yang baru. Total gambar sekarang 11 (turun dari 13).
  - Upload ke `assets/images/atopia-space-detail-page/` dengan nama (sesuai nama layer Figma yang baru, urut sesuai halaman):
    - `img-1` — Contextual Modals & Inline Trimming (tunggal)
    - `img-2` — Proximity vs. Manual Interaction Triggers (tunggal, tidak ada grid lagi)
    - `img-3_1` — Unified Asset Library & Inline Verification (tunggal)
    - `img-3_2` / `img-3_3` — Unified Asset Library & Inline Verification, grid 2 kolom rata
    - `img-4` — Simplifying 3D Acoustics (tunggal)
    - `img-5_1` — Progressive POI Configuration (tunggal)
    - `img-5_2` / `img-5_3` — Progressive POI Configuration, grid 2 kolom rata (bukan asimetris lagi)
    - `img-6_1` / `img-6_2` — Rich Metadata & Asset Stacking, grid 2 kolom rata
- [x] Extract detail project **Kasatmata** → sudah jadi `kasatmata.html`, tapi strukturnya BEDA dari project lain: cuma hero (judul + 2 paragraf) lalu 1 section berisi 6 gambar berurutan TANPA sub-judul/paragraf per gambar (murni showcase visual, bukan studi kasus). Tidak ada section "Outcome" di akhir. Tidak ada badge "Watch live". Upload ke `assets/images/kasatmata-detail-page/` dengan nama sesuai layer Figma:
  - `img-1` — tunggal
  - `img-2_1` / `img-2_2` — grid 2 kolom rata
  - `img-3`, `img-4`, `img-5`, `img-6` — masing-masing tunggal
  - **Spacing khusus (beda dari pola project studi-kasus lainnya):** karena tidak ada judul/paragraf per gambar, gap antar item DAN gap kolom grid-nya scale sendiri per breakpoint (bukan pakai gap block 56px yang biasa) — lihat detail lengkapnya di [components.md](components.md) bagian 7, varian "gallery". Grid 2 kolomnya juga TETAP 2 kolom sampai mobile (tidak stack ke 1 kolom seperti grid biasa).
- [x] Extract detail project **ZNTRAL** → sudah jadi `zntral.html`. Pola sama seperti Kasatmata (images-only "gallery" variant, tanpa "Outcome", tanpa badge "Watch live"), 5 gambar-slot: 2 tunggal berurutan di atas, grid 2 kolom, 1 tunggal, grid 2 kolom (7 file total). Upload ke `assets/images/zntral-detail-page/` dengan nama:
  - `img-1` — tunggal (gambar tambahan paling atas — TIDAK ada di frame Figma asli, ditambahkan langsung di kode atas permintaan user, jadi tidak match nama layer Figma persis)
  - `img-2` — tunggal (ini yang di Figma bernama `img-1`)
  - `img-3_1` / `img-3_2` — grid 2 kolom rata (di Figma bernama `img-2_1` / `img-2_2`)
  - `img-4` — tunggal (di Figma bernama `img-3`)
  - `img-5_1` / `img-5_2` — grid 2 kolom rata (di Figma bernama `img-4_1` / `img-4_2`)
  - **Beda dari Kasatmata:** gap item di section desktop-nya 24px (bukan 40px seperti Kasatmata) — sama persis dengan gap kolom grid-nya. Makanya pakai modifier class tambahan `.detail-section--gallery-24` di samping `.detail-section--gallery` (lihat [components.md](components.md) bagian 7).
- [x] **Booksmart Corporate Landing Page** — TIDAK butuh halaman detail sendiri. Card-nya di `works.html` langsung link keluar ke `https://booksmart.store/corporate-site/` (buka tab baru), sama seperti badge "Watch live" di project lain
- [x] Export sisa thumbnail di halaman All Works (10/10 sudah lengkap)
- [x] Upload & pasang 10 gambar konten Booksmart (img-1 s.d. img-8, termasuk img-7_1/2/3)
- [ ] Export icon yang benar-benar dipakai dari "Icon - Bootstrap"
- [x] Cross-check dengan live Framer site untuk animasi/interaksi yang tidak kebaca dari Figma statis → dicek langsung (trace DOM mutation, bukan cuma visual): site Framer live-nya ternyata TIDAK punya animasi page-transition (instant swap, tanpa fade/slide apapun). Jadi transisi di bawah ini didesain dari nol lewat eksplorasi prototype, bukan hasil contek dari Framer.

---

## 5. Page Transition — Quiet Fade

Dieksplorasi lewat 4 kandidat prototype (Quiet Fade, Fade + Slide, Directional Slide, Overlay Wipe) yang dibandingkan langsung side-by-side. **Quiet Fade** yang dipilih final.

### Kenapa Quiet Fade
User eksplisit minta gaya "simple, clean, professional" — bukan yang "meriah". Overlay Wipe (panel warna penuh + monogram) dan Directional Slide (dua layar geser horizontal) ditolak karena kesan "berpindah ruang"-nya terlalu terasa/dramatis untuk portfolio ini. Fade + Slide (crossfade + sedikit geser vertikal) sempat jadi kandidat kuat kedua, tapi Quiet Fade menang karena benar-benar "tidak kentara" — cocok dengan preferensi user.

### Spec
- **Exit** (halaman lama): `opacity 1 → 0`, 160ms, `ease-in`
- **Enter** (halaman baru): `opacity 0 → 1`, 220ms, `ease-out`, delay 60ms (supaya sedikit overlap dengan exit, biar terasa nyambung bukan dua kejadian terpisah)
- Cuma animate `opacity` — tidak ada transform/gerakan sama sekali (`emil-animations`: animate hanya `transform`/`opacity`, dan exit ~20-30% lebih cepat dari enter — 160/220 = 27% lebih cepat, sesuai aturan)
- Menghormati `prefers-reduced-motion`: kalau aktif, transisi di-skip total (langsung swap, tanpa fade)

### Implementasi
Berlaku **site-wide** secara otomatis (bukan cuma home ↔ works) karena logic-nya ditaruh di [js/main.js](js/main.js) yang sudah di-include semua halaman:
- **Enter**: CSS `@keyframes page-fade-in` di [css/style.css](css/style.css), jalan otomatis tiap `<body>` di-load.
- **Exit**: `js/main.js` intercept klik ke semua `<a>` internal (same-origin, bukan `target="_blank"`, bukan anchor `#hash` di halaman yang sama), `preventDefault()`, tambah class `.is-leaving` (trigger CSS transition fade-out), baru `location.href` dieksekusi via `setTimeout` 160ms (nunggu exit selesai). Link eksternal (mailto, social media, `Booksmart Corporate Landing Page` yang buka tab baru) otomatis di-skip, jalan normal tanpa fade.

### Rejected
- **Overlay Wipe** — panel `primary-main` (#0030bf) full-screen + monogram "AG", 600ms total (340ms masuk ease-out / 260ms keluar ease-in). Paling "branded"/dramatis dari 4 kandidat, tapi kepanjangan & kurang "clean" buat karakter portfolio ini.
- **Directional Slide** — dua layar geser horizontal bersamaan (360ms, ease-in-out), tanpa fade. Motion-nya benar secara teknis (paired-timing, easing sesuai kaidah "layout shift" bukan "enter/exit"), tapi tetap lebih "terasa" dibanding fade-based options.
- **Fade + Slide** — crossfade + translateY 24px. Sempat jadi kandidat, sampai di-tune juga (opacity & slide dipisah jadi 2 animasi independen, slide delay 250ms supaya fade kebaca dulu baru posisi bergeser — feedback dari rekaman Lapse). Akhirnya tetap kalah dari Quiet Fade karena user lebih suka yang benar-benar tanpa gerakan.

---

## 6. Theme Transition (`theme-transition`)

Animasi pergantian light ↔ dark. **Ini pakem untuk semua halaman** — halaman mana pun yang punya toggle tema otomatis memakainya (tidak ada opt-out per halaman).

### Spec
- **Efek:** "swipe" layar penuh. Tema baru tersingkap lewat `clip-path` di atas tampilan tema lama (View Transitions API).
- **Arah:** light → dark menyapu **kiri → kanan**; dark → light menyapu **kanan → kiri**.
- **Durasi & easing:** 600ms, `cubic-bezier(0.32, 0.72, 0, 1)` (strong ease-out).
- **Pill toggle:** geser antar ikon 600ms, `cubic-bezier(0.25, 1, 0.5, 1)` (soft out). Warna ikon pakai durasi & kurva yang sama. Toggle punya layer transisi sendiri (`view-transition-name: theme-toggle`) supaya tetap terlihat di atas sapuan.
- Pilihan ini hasil membandingkan variasi lewat picker sementara: durasi wipe 500/550/600, toggle 200–600, tiga easing, dua arah. Yang dipilih: wipe 600, toggle 600, soft out, strong out untuk page, arah L→R / R→L. Catatan: karena kurva wipe (strong out) dan pill (soft out) beda, keduanya tidak persis selesai bersamaan.
- **Fallback:** tanpa dukungan View Transitions, atau `prefers-reduced-motion: reduce`, tema berganti seketika (tanpa animasi apa pun).

### Cara memanggil
```js
themeTransition("dark");   // atau "light"
```
Fungsi global `themeTransition(theme)` di [js/main.js](js/main.js): set `data-theme`, simpan ke `localStorage`, sinkronkan `aria-pressed` semua `[data-theme-option]`, lalu jalankan animasinya. Tidak ngapa-ngapain kalau tema yang diminta sudah aktif.

### Memasang di halaman baru
1. `<head>`: script inline yang set `document.documentElement.dataset.theme` dari `localStorage` (default `"light"`) — salin dari [index.html](index.html), jangan dihilangkan supaya tidak ada flash tema salah.
2. Navbar: markup `.theme-toggle` dengan 2 `button[data-theme-option="light|dark"]` (salin dari `index.html`).
3. `js/main.js` sudah meng-hook klik tombolnya (`initThemeToggle()`).

### Teknis
- CSS: aturan `::view-transition-old/new(root)` (matikan cross-fade bawaan browser) dan `theme-toggle` di [css/style.css](css/style.css). Animasi `clip-path` sendiri dijalankan lewat WAAPI di `themeTransition()` (`pseudoElement: "::view-transition-new(root)"`).
- Tidak ada `transition` warna di elemen halaman, jadi pergantian tema tidak memicu ratusan transisi warna sekaligus.

---

## 7. Figur artikel hardcode (`.fig`)

Lima figur di [article-agentic-ai.html](article-agentic-ai.html) dulunya PNG (`article-agentic_AI/img-1..5.png`), sekarang dibangun ulang dari frame Figma `img-1..5` (840×491) sebagai HTML/CSS supaya ikut tema. PNG lama masih ada di folder tapi tidak dipakai.

- **Skala:** semua elemen diposisikan dalam satuan Figma lewat `--u = 100cqw / 840`, jadi figur menskala utuh di semua breakpoint. Markup: `.fig > .fig__canvas > .fig__at` (posisi `--x --y --w --h`). Tiap figur `role="img"` dengan `aria-label` dari alt lama.
- **Bagian raster** (screenshot layer panel, terminal Claude Code) diexport dari Figma di 3x: `layers-before.png`, `layers-after.png`, `layers-structure.png`, `claude-code-terminal.png`. Kartu Booksmart di img-3 memakai `home/thumbnail-booksmart.png`.
- **Token `--fig-*`:** frame light `#ffffff` (terminal `#fbfaf6`), dark `#1E1F23`. Chip/pill dark `#2c2d33`, teks `#ffffff` / `#c2c2c2`, panah `primary-dark/main`, dan swatch diberi outline putih 12%. Nilai dark selain frame adalah turunan (bukan variable Figma).
- **Font:** Aptos Mono (font Figma) tidak ada di web, jadi diganti monospace sistem (`ui-monospace`, SF Mono, Menlo). Lebar chip di img-2 bisa sedikit beda dari Figma.
- **Demo interaktif "Being an Orchestrator":** frame `#1E1F23` di dark tanpa stroke; switcher Before/After memakai token `tab_switcher-*` (desain segmented-button baru); list of content memakai token `list_content-*` yang sama dengan `.content-nav`.

---

*File ini akan terus di-update seiring proses extract & development berjalan.*
