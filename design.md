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

---

## 4. Yang Masih Perlu Disiapkan / Dikerjakan

- [x] Extract detail section **index** → sudah jadi `works.html` (All Works), grid 1/2/3 kolom
- [x] Extract detail project **Booksmart** → sudah jadi `booksmart.html`, jadi template pola untuk project lainnya (lihat [components.md](components.md) bagian 7 "Detail Page Content Structure")
- [x] Extract detail project **Bookdrop** → sudah jadi `bookdrop.html` lengkap dengan 17 gambar. Tidak ada badge "Watch live" (internal tool, bukan public site)
- [x] Extract detail project **Werk: ESS** → sudah jadi `werk-ess.html` lengkap dengan 10 gambar (folder: `assets/images/ess-detail-page/`). Struktur pakai semua variasi grid (1/2/4 gambar)
- [x] Extract detail project **Werk: Personnel Management** → sudah jadi `werk-personnel-management.html` lengkap dengan 10 gambar (folder: `assets/images/personnel-detail-page/`). Termasuk pola baru: 2 gambar full-width bertumpuk berurutan tanpa grid
- [ ] Extract 5 halaman detail project sisanya (CRM, Mobile Apps, Atopia Space, Kasatmata, ZNTRAL) — pakai pola yang sama, tinggal sesuaikan jumlah section & gambar per project
- [x] **Booksmart Corporate Landing Page** — TIDAK butuh halaman detail sendiri. Card-nya di `works.html` langsung link keluar ke `https://booksmart.store/corporate-site/` (buka tab baru), sama seperti badge "Watch live" di project lain
- [x] Export sisa thumbnail di halaman All Works (10/10 sudah lengkap)
- [x] Upload & pasang 10 gambar konten Booksmart (img-1 s.d. img-8, termasuk img-7_1/2/3)
- [ ] Export icon yang benar-benar dipakai dari "Icon - Bootstrap"
- [ ] Cross-check dengan live Framer site untuk animasi/interaksi yang tidak kebaca dari Figma statis

---

*File ini akan terus di-update seiring proses extract & development berjalan.*
