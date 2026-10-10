// Crown District (zone-city) landform (2026-10-10). Arrival dais at the origin looking south (-Z) down a 8 m
// processional avenue to the cathedral on its raised precinct. A ~420 m bowl centred (0,-110), city-wall ring at r 200,
// ridges rising behind it. A canal (z -110, x -172..-24) cut 2.4 m into the paving. Every pad feathers, never a step.
export const CENTER = { x: 0, z: -110 }, WALL_R = 200;
export const ROOMS = { // x, z, radius, height
  arrival: [0, -2, 11, 1.2], cathedral: [0, -150, 30, 0], market: [-80, -55, 30, 0], statues: [80, -60, 30, 0],
  canal: [-95, -124, 26, 0], tavern: [92, -150, 28, 0], barracks: [-95, -205, 30, 0],
};
export const CANAL = { z: -110, x0: -172, x1: -24, half: 4.2, bed: -2.4 };
export const PRECINCT = { z0: -168, z1: -186, h: 4.5, halfW: 58, back: -275 };
const c01 = (v) => Math.min(1, Math.max(0, v));
const ss = (v) => { v = c01(v); return v * v * (3 - 2 * v); };
export function canalDepth(x, z) { // 0 dry → 1 full channel; quay feathers 1.4 m
  const ex = Math.max(CANAL.x0 - x, x - CANAL.x1, 0), dz = Math.abs(z - CANAL.z);
  const d = Math.hypot(ex, Math.max(0, dz - CANAL.half + 1.4));
  return ex > 0 ? 1 - ss(Math.hypot(ex, Math.max(0, dz - (CANAL.half - 1.4))) / 1.4) : 1 - ss((dz - (CANAL.half - 1.4)) / 1.4);
}
export function precinct(x, z) {
  const across = 1 - ss((Math.abs(x) - PRECINCT.halfW) / 14), back = 1 - ss((PRECINCT.back - z) / 14);
  return PRECINCT.h * ss((PRECINCT.z0 - z) / (PRECINCT.z0 - PRECINCT.z1)) * across * back;
}
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const d = Math.hypot(x - CENTER.x, z - CENTER.z);
  const ridgeT = ss((d - 212) / 70);
  const crest = noise.ridged({ x, z, frequency: 1 / 140, octaves: 4, seed: seedOffset(1) }) * 14 + noise.fbm2({ x, z, frequency: 1 / 60, octaves: 3, seed: seedOffset(2) }) * 4;
  let h = ridgeT * (26 + crest) + noise.fbm2({ x, z, frequency: 1 / 45, octaves: 2, seed: seedOffset(3) }) * 0.08 * (1 - ridgeT);
  const a = ROOMS.arrival, da = Math.hypot(x - a[0], z - a[1]);
  h += a[3] * (1 - ss((da - a[2]) / 10));
  h = Math.max(h, precinct(x, z) * (1 - ridgeT));
  const cd = canalDepth(x, z);
  if (cd > 0) h = h * (1 - cd) + CANAL.bed * cd;
  return h;
}
export function materialAt(ctx) {
  const { x, z, worldHeight, slope, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 9, octaves: 2, seed: seedOffset(5) });
  const d = Math.hypot(x - CENTER.x, z - CENTER.z);
  if (d > 206 + n * 6) { const rock = c01((slope - 0.18 + n * 0.1) * 4); return { rock, grass: 1 - rock }; }
  if (canalDepth(x, z) > 0.25) return { wowCobbleMoss: 1 };
  if (Math.abs(z - CANAL.z) < CANAL.half + 1.6 + n * 0.5 && x > CANAL.x0 - 2 && x < CANAL.x1 + 2) return { wowFlagWorn: 1 }; // quay flags
  const da = Math.hypot(x, z + 2); if (da < 12 + n * 1.5) return { wowFlagWorn: 1 }; // arrival dais
  if (precinct(x, z) > 0.4 + n * 0.3) return { wowFlagWorn: 1 }; // cathedral precinct
  if (Math.hypot(x - 80, z + 60) < 26 + n * 2) { const lawn = Math.hypot(x - 80, z + 60) > 14 && Math.abs(Math.atan2(z + 60, x - 80) % 1.5708) > 0.3; return lawn ? { grass: 1 } : { wowFlagWorn: 1 }; }
  // drains: gutters along the avenue and patches of wet cobble near grates (~10%)
  const gut = Math.abs(Math.abs(x) - 4.6) < 0.45 && z < -10 && z > -165;
  const wetP = noise.fbm2({ x, z, frequency: 1 / 22, octaves: 2, seed: seedOffset(7) });
  if (gut || wetP > 0.42) return { wowCobbleWet: 1 };
  if (Math.abs(x) < 4.2 && z < -8 && z > -168) return { wowFlagWorn: 1 }; // processional avenue: raised flags
  return { wowCobble: 1 };
}
