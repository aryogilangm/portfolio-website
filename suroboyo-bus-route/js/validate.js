// Dipakai di browser (js/main.js) dan di Node (scripts/validate.mjs).
export const LABEL_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
export const BENDS = ['straight-first', 'diag-first'];

export function normalizeEntry(entry) {
  if (typeof entry === 'string') return { stop: entry };
  if (Array.isArray(entry)) return { wp: entry };
  return entry;
}

export function validateNetwork(net) {
  const errors = [];
  const warnings = [];
  if (!net || typeof net !== 'object') {
    return { errors: ['network.json bukan objek JSON yang valid'], warnings };
  }

  const types = net.meta?.types ?? {};
  const systems = net.meta?.systems ?? {};
  const geo = net.meta?.projection === 'geo';
  if (geo && !(Number.isFinite(net.meta.origin?.lat) && Number.isFinite(net.meta.origin?.lng))) {
    errors.push('meta.origin harus berisi {lat, lng} pada mode geografis');
  }
  if (net.meta?.grid !== undefined && !(net.meta.grid > 0)) errors.push('meta.grid harus angka positif');
  const stops = net.stops ?? {};
  const lines = net.lines ?? [];

  const seenPos = new Map();
  for (const [id, s] of Object.entries(stops)) {
    if (!s.name) errors.push(`Halte "${id}": "name" wajib diisi`);
    if (geo) {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) errors.push(`Halte "${id}": "lat" dan "lng" harus angka`);
    } else if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) {
      errors.push(`Halte "${id}": "x" dan "y" harus angka`);
    } else {
      if (!Number.isInteger(s.x) || !Number.isInteger(s.y)) {
        warnings.push(`Halte "${id}": sebaiknya x,y bilangan bulat agar rapi di grid`);
      }
      const key = `${s.x},${s.y}`;
      if (seenPos.has(key)) warnings.push(`Halte "${id}" dan "${seenPos.get(key)}" berada di posisi yang sama (${key})`);
      else seenPos.set(key, id);
    }
    if (s.quietLabel !== undefined && !net.stops[s.quietLabel]) errors.push(`Halte "${id}": quietLabel harus id halte yang ada`);
    if (s.marker !== undefined && s.marker !== 'apex') errors.push(`Halte "${id}": marker harus "apex"`);
    if (s.minZoom !== undefined && !(s.minZoom > 0)) errors.push(`Halte "${id}": minZoom harus angka positif`);
    if (s.labelDir !== undefined && !LABEL_DIRS.includes(s.labelDir)) errors.push(`Halte "${id}": labelDir "${s.labelDir}" harus salah satu dari ${LABEL_DIRS.join(', ')}`);
    if (s.label && !LABEL_DIRS.includes(s.label)) {
      errors.push(`Halte "${id}": label "${s.label}" harus salah satu dari ${LABEL_DIRS.join(', ')}`);
    }
  }

  const lineIds = new Set();
  const usedStops = new Set();
  lines.forEach((line, i) => {
    const tag = `Rute "${line.id ?? `#${i + 1}`}"`;
    if (!line.id) errors.push(`Rute ke-${i + 1}: "id" wajib diisi`);
    else if (lineIds.has(line.id)) errors.push(`${tag}: id duplikat`);
    lineIds.add(line.id);
    if (!line.name) errors.push(`${tag}: "name" wajib diisi`);
    if (!/^#[0-9a-f]{6}$/i.test(line.color ?? '')) errors.push(`${tag}: "color" harus berformat #rrggbb`);
    if (!(line.type in types)) errors.push(`${tag}: type "${line.type}" tidak ada di meta.types`);
    if (line.bend && !BENDS.includes(line.bend)) errors.push(`${tag}: bend harus salah satu dari ${BENDS.join(', ')}`);
    if (line.system && !(line.system in systems)) errors.push(`${tag}: system "${line.system}" tidak ada di meta.systems`);
    if (line.loop !== undefined && typeof line.loop !== 'boolean') errors.push(`${tag}: "loop" harus true atau false`);
    if (line.oneway !== undefined && typeof line.oneway !== 'boolean') errors.push(`${tag}: "oneway" harus true atau false`);
    if (line.slotMode !== undefined && line.slotMode !== 'adaptive') errors.push(`${tag}: "slotMode" harus "adaptive"`);
    if (line.uturn !== undefined && line.uturn !== 'square' && line.uturn !== 'flat') errors.push(`${tag}: "uturn" harus "square" atau "flat"`);
    if (line.cap !== undefined && line.cap !== 'square') errors.push(`${tag}: "cap" harus "square"`);
    if (line.turn !== undefined && typeof line.turn !== 'boolean') errors.push(`${tag}: "turn" harus true atau false`);

    if (geo) {
      for (const k of ['tailStart', 'tailEnd', 'uturnRound']) {
        if (line[k] !== undefined && (!Array.isArray(line[k]) || line[k].some((p) => !Array.isArray(p) || p.length !== 2 || p.some((v) => !Number.isFinite(v))))) errors.push(`${tag}: "${k}" harus daftar [lat, lng]`);
      }
      const legs = line.legs;
      const stopCount = (line.stops ?? []).length;
      if (!Array.isArray(legs) || legs.length !== stopCount - 1) {
        errors.push(`${tag}: "legs" harus berisi ${stopCount - 1} ruas (satu per pasang halte berurutan), jalankan npm run build:data`);
      } else if (legs.some((leg) => !Array.isArray(leg) || leg.length < 2 || leg.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)))) {
        errors.push(`${tag}: setiap ruas di "legs" harus berisi minimal 2 titik [lat, lng]`);
      }
    }

    const entries = (line.stops ?? []).map(normalizeEntry);
    if (line.loop && entries.length > 1 && entries[0].stop === entries.at(-1).stop) {
      errors.push(`${tag}: rute loop menutup sendiri, jangan ulangi halte pertama di akhir`);
    }
    if (entries.filter((e) => e.stop !== undefined).length < 2) errors.push(`${tag}: minimal 2 halte`);
    if (entries.length && (entries[0].stop === undefined || entries.at(-1).stop === undefined)) {
      errors.push(`${tag}: entri pertama dan terakhir harus halte, bukan titik belok`);
    }

    let prevStop = null;
    for (const e of entries) {
      if (e.stop !== undefined) {
        if (!stops[e.stop]) errors.push(`${tag}: halte "${e.stop}" tidak ditemukan di "stops"`);
        else usedStops.add(e.stop);
        if (e.stop === prevStop) errors.push(`${tag}: halte "${e.stop}" muncul dua kali berurutan`);
        if (e.bend && !BENDS.includes(e.bend)) errors.push(`${tag}: bend "${e.bend}" tidak dikenal`);
        prevStop = e.stop;
      } else if (e.wp) {
        if (e.wp.length !== 2 || !e.wp.every(Number.isFinite)) errors.push(`${tag}: titik belok harus [x, y]`);
        prevStop = null;
      } else {
        errors.push(`${tag}: entri tidak dikenali ${JSON.stringify(e)}`);
      }
    }
  });

  for (const id of Object.keys(stops)) {
    if (!usedStops.has(id)) warnings.push(`Halte "${id}" tidak dipakai rute mana pun`);
  }
  return { errors, warnings };
}
