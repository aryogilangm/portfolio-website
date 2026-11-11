// Ukuran peta geografis/skematik. Semua ukuran (tebal garis, jarak lajur, penanda, bus) dirancang dalam piksel
// pada zoom MAP_BASE_ZOOM, lalu ikut membesar dan mengecil bersama peta seperti gambar biasa. Label tumbuh lebih
// pelan (akar dari zoom relatif) supaya tetap terbaca di zoom jauh dan tidak raksasa di zoom dekat.
// Nilai bisa diatur lewat lab/tampilan dan disimpan di data/map-style.json.
export const MAP_BASE_ZOOM = 0.3;
export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 2.5;
// Nama halte yang selalu tampil: pertama, terakhir, dan tiap kelipatan ini di tiap jalur (1, 4, 8, ...). Sisanya saat hover.
export const LABEL_EVERY = 4;
// Jalur koridor berbeda yang satu arah di jalan yang sama digambar berdampingan; jarak antar garisnya (corridorGap) ada di style.

export const STYLE_DEFAULTS = {
  lineWidth: 8, // tebal garis koridor
  wiraWidth: 5, // tebal garis Wira-Wiri
  laneGap: 10, // jarak dua arah, pusat ke pusat
  corridorGap: 1, // celah antar koridor berbeda yang berdampingan di jalan yang sama (px)
  cornerRadius: 2, // radius belokan (px)
  stopSize: 16, // diameter luar halte biasa
  stopBorder: 3, // tebal tepi halte
  transitSize: 16, // diameter lingkaran jalur di halte transit (px); kapsulnya 1,6 kali ini
  busSize: 5, // setengah tinggi badan bus
  busStroke: 0.7, // tebal bingkai bus (px)
  busRadius: 0.7, // radius sudut luar bus (px)
  labelSize: 1, // pengali ukuran label
  labelGap: 3, // jarak label dari tepi halte (px)
};
// Hanya nilai ini yang dibaca dari alat lab/tampilan; sisanya tetap bawaan sampai desainnya dibuat.
export const APPLIED_KEYS = ['lineWidth', 'laneGap', 'corridorGap', 'cornerRadius', 'stopSize', 'stopBorder', 'transitSize', 'busSize', 'busStroke', 'busRadius', 'labelSize', 'labelGap'];
export const style = { ...STYLE_DEFAULTS };
export const applyStyle = (patch) => {
  for (const k of APPLIED_KEYS) if (Number.isFinite(patch?.[k])) style[k] = patch[k];
  // Berkas lama: transitScale (kali ukuran halte biasa) diganti transitSize (px).
  if (!Number.isFinite(patch?.transitSize) && Number.isFinite(patch?.transitScale)) style.transitSize = style.stopSize * patch.transitScale;
  return style;
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Skala layar teks label pada zoom k (1 = 12px).
export const labelScale = (k) => clamp(Math.sqrt(k / MAP_BASE_ZOOM), 0.9, 3.2) * style.labelSize;
