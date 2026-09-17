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

---

## 2. Reusable Components (dari page "asset")

> Ringkasan singkat — spec lengkap (state, contoh markup, catatan koreksi bug) ada di [components.md](components.md).

| Component | Variant/State | Catatan |
|---|---|---|
| `nav-bar` | `home` (putih+border), `detail-page` (transparent, tanpa border) | Teks "HOME" / "ALL WORKS", style Header/20/Medium, padding 16px vertikal 40px horizontal. `home` dipakai di halaman index (works.html), `detail-page` dipakai di semua halaman detail project. **TIDAK dipakai di halaman "home" (index.html)** |
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
- [ ] Cross-check dengan live Framer site untuk animasi/interaksi yang tidak kebaca dari Figma statis

---

*File ini akan terus di-update seiring proses extract & development berjalan.*
