// Beastwild (zone-creatures) landform, 2026-10-10. A primeval jungle bowl ~420 m centred (0,-110), walled by mossy crags.
// Gate on a 6 m terrace at the origin, the road drops to the gryphon-rider statue plaza (0,-55), the hub.
// Rooms off the hub: Hogger's camp (-80,-60) · Harvest Golem field (80,-60) · Princess's wallow (60,-130) ·
// Mother Fang's lair under the west cliff (-130,-150) · the ogre mound (-50,-190) · the dragon's crag (60,-215), a 24 m pedestal.
// The Roarwater river crosses east-west near z -100; the south road bridges it at x 4.
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// [x, z, height, flat radius, falloff]
export const ROOMS = [
  [0, -2, 6, 13, 10],         // arrival terrace
  [0, -55, 3, 22, 10],        // statue plaza
  [-80, -60, 4.5, 18, 9],     // Hogger's camp
  [80, -60, 2.5, 26, 10],     // Harvest Golem field
  [60, -135, 0.6, 15, 9],     // Princess's wallow
  [-130, -150, 3, 16, 8],     // Mother Fang's lair
  [-50, -190, 9, 14, 7],      // ogre mound, a pedestal
  [60, -215, 24, 14, 14],     // the dragon's crag
];
export const RIVER = [[-215, -96], [-150, -104], [-90, -98], [-40, -104], [4, -100], [50, -96], [110, -102], [215, -94]];
export const ROADS = [
  [[0, -8], [0, -33]],
  [[-20, -56], [-45, -58], [-66, -60]],
  [[20, -56], [45, -58], [60, -60]],
  [[2, -77], [4, -100], [18, -125], [40, -160], [50, -194]],
  [[-12, -74], [-30, -110], [-70, -145], [-115, -150]],
  [[-30, -110], [-40, -150], [-48, -176]],
  [[18, -125], [44, -132]],
];
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = c01(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const polyD = (x, z, L) => { let d = 1e9; for (let i = 1; i < L.length; i++) d = Math.min(d, segD(x, z, L[i - 1], L[i])); return d; };
const roadD = (x, z) => { let d = 1e9; for (const L of ROADS) d = Math.min(d, polyD(x, z, L)); return d; };
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 110, octaves: 2, seed: seedOffset(1) });
  const fine = noise.fbm2({ x, z, frequency: 1 / 18, octaves: 2, seed: seedOffset(3) });
  const crag = noise.ridged({ x, z, frequency: 1 / 95, octaves: 3, seed: seedOffset(2) }) / 1.75;
  const knoll = noise.fbm2({ x, z, frequency: 1 / 55, octaves: 2, seed: seedOffset(7) });
  // the jungle floor: broad rises and hollows, never egg-carton
  let h = 3 + roll * 7 + fine * 0.5;
  // rock spines between rooms, kept off roads, rooms and the river
  let keep = sstep(6, 18, roadD(x, z)) * sstep(10, 22, polyD(x, z, RIVER));
  for (const [cx, cz, , r, f] of ROOMS) keep *= sstep(r + f, r + f + 14, Math.hypot(x - cx, z - cz));
  h += sstep(0.25, 0.6, knoll) * (7 + crag * 6) * keep; // broad mossy knolls, never needles
  // the crag wall round the bowl
  const e = Math.hypot(x / 215, (z + 110) / 215);
  h += sstep(0.76, 0.95, e) * (30 + crag * 18) + sstep(0.95, 1.08, e) * crag * 10;
  h += sstep(10, 30, z) * (14 + crag * 12);
  for (const [cx, cz, H, r, f] of ROOMS) {
    const d = Math.hypot(x - cx, z - cz), t = 1 - sstep(r, r + f, d);
    if (t > 0) h = lerp(h, H + fine * 0.15, t);
  }
  for (const [cx, cz, H, r, f] of ROOMS) { if (H < 8) continue; const d = Math.hypot(x - cx, z - cz); h += (1 - sstep(r + f, r + f + 16, d)) * sstep(r, r + 4, d) * crag * 5; }
  // ramps: a ledge winding up each pedestal from its road end
  const ramp = (ri, sx, sz, startH, sweep) => { const [cx, cz, H, r] = ROOMS[ri], dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
    if (d > r - 1 && d < r + 6) { const a0 = Math.atan2(sz - cz, sx - cx); let a = Math.atan2(dz, dx) - a0; a = ((a % 6.2832) + 6.2832) % 6.2832; const fr = a / sweep;
      if (fr <= 1) { const w = sstep(r - 1, r + 0.5, d) * (1 - sstep(r + 4.5, r + 6, d)); h = lerp(h, lerp(startH, H, fr), w); } } };
  ramp(7, 50, -194, 3, 5.236);
  ramp(6, -48, -176, 3, 3.6);
  // the river carves its bed
  const rd = polyD(x, z, RIVER);
  if (rd < 16) h = lerp(h, 0.4 + fine * 0.2, 1 - sstep(5, 16, rd)); // low banks; the river mark cuts the channel
  return h;
}
export function materialAt(ctx) {
  const { x, z, slope, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 22, octaves: 3, seed: seedOffset(5) });
  const rock = c01((slope - 0.32 + n * 0.08) * 6);
  const rest = 1 - rock;
  const scorch = 1 - sstep(20, 34 + n * 6, Math.hypot(x - 60, z + 215));
  const mud = Math.max(1 - sstep(12, 18 + n * 3, Math.hypot(x - 60, z + 135)), 1 - sstep(5, 9, polyD(x, z, RIVER)));
  const clay = c01((n - 0.25) * 3) * 0.6;
  return { rock, scorch: rest * scorch, mud: rest * (1 - scorch) * mud, clay: rest * (1 - scorch) * (1 - mud) * clay, ground: rest * (1 - scorch) * (1 - mud) * (1 - clay) + 0.001 };
}
