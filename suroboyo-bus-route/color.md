# Warna

Dokumentasi warna Peta Suroboyo Bus. Sumber nilainya:

- Warna koridor: `data/overrides.json` > `corridors` (token Figma `color/corridor-light/corridor-R<n>-route`, dst.).
- Palet per suasana waktu: `data/overrides.json` > `timeThemes`, dibuat `node scripts/time-themes.mjs` (jangan diedit tangan).
- Latar, teks, kartu, dan halte per suasana: `css/style.css` (`:root` dan `:root[data-waktu="..."]`).
- Pemasangan variabel warna garis: `js/theme.js` (`--line-<id>-main`, `-stop`, `-bus`, `-busstroke`).
- Lampu bus: `js/bus-lamp.js`.

Satu warna per koridor, dua arah sama. Jangan menaruh warna di file JS; token baru di Figma disalin ke `data/overrides.json`.

## Empat suasana waktu

Pilihan suasana ada di tombol jam/matahari/bulan di kontrol peta (Auto mengikuti jam perangkat) dan di `lab/tampilan`.

| Suasana | Jam | Latar (`--sky`) | `--bg` (cadangan) |
| --- | --- | --- | --- |
| Early morning | 05.00-09.00 | `linear-gradient(180deg, #D9E2F5, #EAE6F1 55%, #F8EAE2)` (Pale, bluer top) | `#EAE6F1` |
| Midday | 09.00-15.00 | `linear-gradient(180deg, #CFE3F5 0%, #E8F2FB 55%, #FFFFFF 100%)` (Sky to glare) | `#E8F2FB` |
| Afternoon | 15.00-18.00 | `linear-gradient(0deg, #EDB594 0%, #F4CBAA 25%, #F9E0C8 60%, #FBEBD6)` (Rust horizon, softer) | `#F9E0C8` |
| Night | 18.00-05.00 | `#040A1F` (datar) | `#040A1F` |

Alternatif gradien yang pernah dicoba (20 variasi per suasana) ada di `lab/gradasi/`.

## Warna koridor

Dipakai apa adanya di Early morning, Midday, dan Afternoon. Night memakai versi redup untuk garis (lihat bawah), tetapi warna asli ini tetap dipakai untuk bus dan halte di Night.

| Koridor | `main` (garis, bingkai bus, halte) | `surface` | `border` (isi bus) | `hover` | `pressed` |
| --- | --- | --- | --- | --- | --- |
| R1 | `#D21E28` | `#FAEBEC` | `#F5BABD` | `#AF1921` | `#460A0D` |
| R2 | `#067D9B` | `#E6F6FA` | `#AFD3DB` | `#056881` | `#022A34` |
| R4 | `#C08F49` | `#F4EBDF` | `#EADAC2` | `#A0773D` | `#403018` |
| R5 | `#E772A2` | `#FCEDF3` | `#F6CBDD` | `#C05F87` | `#743951` |

Kontras garis terhadap latar Midday (WCAG): R1 sekitar 5,3, R2 sekitar 4,8, R4 dan R5 sekitar 2,9. R4 dan R5 sengaja digelapkan sedikit dari token awal (`#D6A45E` dan `#F982B2`) supaya lebih terbaca.

### Night: garis diredupkan

Garis tidak dicerahkan, tetapi digelapkan seperti jalan malam (lightness dikali 0,7, dibatasi 0,38 sampai 0,56; kejenuhan dikali 0,85; kontras minimal 2:1). Skrip: `scripts/time-themes.mjs`.

| Koridor | `main` (garis) | `surface` | `border` | `hover` | `pressed` |
| --- | --- | --- | --- | --- | --- |
| R1 | `#8F0011` | `#140F20` | `#2B1421` | `#AB1920` | `#57161F` |
| R2 | `#064B5E` | `#051126` | `#061C31` | `#0F5F76` | `#073145` |
| R4 | `#7B5518` | `#0F1322` | `#232125` | `#90692F` | `#493825` |
| R5 | `#973B63` | `#131127` | `#2C1A33` | `#AE5077` | `#5B2A49` |

## Halte

| | Early morning, Midday, Afternoon | Night |
| --- | --- | --- |
| Halte biasa: isi cincin (`--stop-ring-fill`) | `#FFFFFF` | `#2D3345` |
| Halte biasa: bingkai cincin | warna koridor asli (`main`) | warna koridor asli (`main`, bukan versi redup) |
| Halte transit: isi kapsul (`--stop-fill`) | `#FFFFFF` | `#2D3345` |
| Halte transit: bingkai kapsul (`--stop-stroke`) | `#757575` (token Figma `transit-stop-stroke`, `neutral/70`) | `#B8BCCC` |
| Halte transit: lingkaran per jalur | warna koridor asli (`main`) | warna koridor asli (`main`) |

Hover atau halte terpilih: bingkai berganti ke `--accent` suasana itu.

## Bus

| | Early morning, Midday, Afternoon | Night |
| --- | --- | --- |
| Bingkai (stroke) | `main` koridor | `main` koridor asli (token Midday) |
| Isi kotak tengah | `border` koridor (token `bus-<koridor>-background`) | `#FFFFFF` (lampu dalam bus menyala) |

### Lampu bus (hanya di Night)

Kode: `js/bus-lamp.js` (varian dan perbandingannya di `lab/lampu/`; dipilih dengan `?lampu=` dan `?halo=`).

- **Sorot ke depan** (gaya `a`, "Radial falloff"): corong lebar dengan jatuh cahaya radial dari ujung depan bus, putih `#FFFFFF`, alfa 0,8 di pangkal turun mengikuti pangkat 2,2 sampai transparan, blur 1,1.
- **Halo** (gaya `1`, "Tight"): kotak membulat tipis melebar 1 px di sekeliling badan, warna `main` koridor, opasitas 0,75, blur 0,6.

## UI (kartu, teks, kontrol)

| Variabel | Midday | Early morning | Afternoon | Night |
| --- | --- | --- | --- | --- |
| `--ink` (teks) | `#1D1F23` | `#243542` | `#3B2A28` | `#F2F5FB` |
| `--muted` | `#6B7078` | `#5F7482` | `#86614F` | `#96A4BE` |
| `--card` | `#FFFFFF` | `#F6FBFD` | `#FCF8F4` | `#0B1530` |
| `--border` | `rgb(0 0 0 / 0.1)` | `rgb(36 53 66 / 0.14)` | `rgb(90 45 20 / 0.17)` | `rgb(255 255 255 / 0.12)` |
| `--hover` | `rgb(0 0 0 / 0.05)` | `rgb(36 53 66 / 0.06)` | `rgb(90 45 20 / 0.07)` | `rgb(255 255 255 / 0.07)` |
| `--accent` | `#2563EB` | `#2F8FB0` | `#D9733A` | `#6B9BFF` |

## Token Figma yang terkait

Koleksi `primitive` dan `token` di file Figma.

- `color/R1..R5/main|surface|border|hover|pressed`: palet koridor (R4 dan R5 sudah sinkron dengan nilai di atas).
- `color/corridor-light/corridor-R<n>-route`: warna garis.
- `color/bus-light/bus-R<n>-background` dan `-stroke`: isi dan bingkai bus.
- `color/transit-stop-light/transit-stop-bg` (`neutral/10`) dan `transit-stop-stroke` (`neutral/70`, `#757575`).
- `color/stops-night/stop-R<n>-stroke` (warna koridor asli) dan `stop-R<n>-bg` (`neutral/90`): token halte Night versi lama. Peta sekarang memakai `#2D3345` untuk isi halte di Night (nilai dari pemilik), jadi token `stop-R<n>-bg` di Figma perlu disamakan.
- Varian lama `color/R*/dark/*`, `corridor-dark`, dan `bus-dark` sudah tidak dipakai peta.

## Catatan

- Kontras garis di atas latar terang: R4 dan R5 hanya sekitar 2,9:1 (garis grafis, bukan teks). Kalau terasa kurang terbaca di layar terang, tebalkan garis atau gelapkan token R4 dan R5 di Figma untuk semua suasana.
- Wira-Wiri (W): token warna ada di Figma, belum dipakai di peta.
- Lampu kota di Night belum dibuat.
