// Proyeksi lat/lng -> unit peta (1 unit = `scale` meter). Dipakai peta (browser) dan skrip build (Node).
const RAD = Math.PI / 180;

export const DEFAULT_SCALE = 5;

export function projector({ lat: lat0, lng: lng0 }, scale = DEFAULT_SCALE) {
  const kx = 111320 * Math.cos(lat0 * RAD);
  const ky = 110574;
  return (lat, lng) => ({ x: ((lng - lng0) * kx) / scale, y: (-(lat - lat0) * ky) / scale });
}

// Kebalikan projector: unit peta -> lat/lng.
export function unprojector({ lat: lat0, lng: lng0 }, scale = DEFAULT_SCALE) {
  const kx = 111320 * Math.cos(lat0 * RAD);
  const ky = 110574;
  return ({ x, y }) => ({ lat: lat0 - (y * scale) / ky, lng: lng0 + (x * scale) / kx });
}
