// Arah label halte di mode geografis: sisi terluar dari lajur halte itu (sisi kiri arah jalan jalurnya), supaya label
// tidak menimpa jalur sendiri, jalur arah berlawanan, atau halte yang berseberangan. Dipakai peta (js/render.js) dan
// skrip build (untuk menghitung minZoom label dengan arah yang sama).
const OCTANTS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];

// (ux, uy) = vektor lajur (kiri arah jalan) dalam koordinat layar (y ke bawah).
export function outwardDir(ux, uy) {
  if (Math.hypot(ux, uy) < 1e-6) return null;
  const i = Math.round(Math.atan2(uy, ux) / (Math.PI / 4));
  return OCTANTS[((i % 8) + 8) % 8];
}

// Dari arah jalan (hx, hy) di halte itu.
export const outwardDirFromHeading = (hx, hy) => outwardDir(hy, -hx);
