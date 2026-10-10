// Saltmere Harbor landform (2026-10-10). Gate terrace on the north cliff at the origin (y 14) looking south (-Z):
// the town steps down to a quay (y 2.2) at z≈-90, a cove of real sea (level 0) fills the south of the bowl,
// a headland carries the lighthouse to the south-east, the west cliff hides the smugglers' cave.
export const SEA = 0;
export const ROOMS = {
  terrace:    { x: 0,    z: 0,    r: 13, f: 10, h: 14 },
  docks:      { x: 0,    z: -90,  r: 30, f: 12, h: 2.2 },
  market:     { x: -55,  z: -80,  r: 20, f: 12, h: 2.8 },
  cave:       { x: -106, z: -66,  r: 14, f: 10, h: 3.4 },
  reef:       { x: -108, z: -126, r: 18, f: 10, h: 1.3 },
  lighthouse: { x: 118,  z: -164, r: 14, f: 8,  h: 12 },
  green:      { x: 52,   z: -64,  r: 14, f: 10, h: 4.5 },
};
const c01 = (v) => Math.min(1, Math.max(0, v));
const ss = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export function shoreZ(x) { return -100 - 34 * ss(55, 120, Math.abs(x)); }
function town(z) { return lerp(14, 2.2, ss(-8, -86, z)); }
function base(x, z, noise) {
  const s = z - shoreZ(x);
  let h;
  if (s > 14) h = town(z);
  else if (s >= 0) h = lerp(0.7, Math.max(2.2, town(z)), ss(0, 14, s));
  else { const d = -s; h = d < 22 ? 0.7 - d * 0.085 : Math.max(-10, -1.17 - (d - 22) * 0.16); }
  const n = noise.fbm2({ x, z, frequency: 1 / 70, octaves: 3, seed: 41 });
  // rim: west/east ridges and the cliff behind the terrace
  const land = c01((s + 10) / 20);
  const ax = Math.abs(x);
  h += (ss(118, 185, ax) * (30 + n * 10) + ss(14, 70, z) * (22 + n * 6)) * land;
  // west cliff face over the cave
  h += ss(-114, -128, x) * 16 * land * ss(-140, -100, z) * (1 - ss(-110, -125, z) * 0);
  // the headland
  const hd = Math.hypot(x - 116, (z + 160) * 0.8);
  h = Math.max(h, 12.2 * ss(52, 22, hd) + n * 1.2 * ss(52, 30, hd));
  // reef shoals offshore (west)
  const rd = Math.hypot(x + 132, z + 192);
  if (rd < 26) h = Math.max(h, lerp(-0.6, h, ss(8, 26, rd)));
  return h + n * 0.8 * land;
}
export function heightAt(ctx) {
  const { x, z, noise } = ctx;
  let h = base(x, z, noise);
  for (const r of Object.values(ROOMS)) {
    const d = Math.hypot(x - r.x, z - r.z);
    if (d < r.r + r.f) h = lerp(r.h, h, ss(r.r, r.r + r.f, d));
  }
  return h;
}
export function materialAt(ctx) {
  const { x, z, worldHeight: h, slope, noise } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 18, octaves: 3, seed: 7 });
  const rock = c01((slope - 0.24 + n * 0.08) * 5);
  const s = z - shoreZ(x);
  if (h < 0.4 + n * 0.5) return { mud: c01(0.6 + n), sand: c01(0.4 - n), rock: rock * 0.4 };
  if (h < 2.0 + n * 0.8 && s < 22) return { sand: 1 - rock, rock };
  const dq = Math.hypot(x - ROOMS.docks.x, (z - ROOMS.docks.z) * 1.4);
  if (dq < 26 + n * 4) return { cobble: 1 - rock, rock };
  const sea = c01((22 - s) / 14);
  return { ground: (1 - rock) * (1 - sea * 0.6), sand: (1 - rock) * sea * 0.6, rock };
}
