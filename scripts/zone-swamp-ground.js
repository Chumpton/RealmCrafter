// Murkfen (zone-swamp) landform. Blackwater stands at y -1.2 (the sea mark in config.yaml); hummocks ride just above it.
// Gate at the origin facing south (-Z). Rooms: Hag's Rest hub (-40,-55), drowned graveyard (55,-95), Riverpaw Hollow (-115,-140),
// the murloc bog (120,-30), the Black Mere (-10,-130) crossed by the boardwalk, and the sunken chapel isle (0,-190): the landmark.
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export const WATER = -1.2;
// [x, z, height, flat radius, falloff]
export const ROOMS = [
  [0, -2, 0, 12, 12],        // arrival hummock
  [-40, -55, 0.1, 20, 12],   // Hag's Rest
  [55, -95, -0.75, 22, 10],  // drowned graveyard: barely above the water, puddled
  [-115, -140, 0.2, 20, 12], // Riverpaw Hollow
  [120, -30, -0.6, 18, 10],  // murloc bog
  [0, -190, 0.3, 15, 8],     // sunken chapel isle
];
// deep pools [x, z, radius, floor]
const POOLS = [
  [-10, -128, 42, -4.2],     // the Black Mere
  [120, -30, 9, -3],         // the bog's eye
  [85, -150, 22, -3.4],
  [-80, -95, 14, -3],
  [40, -30, 12, -2.8],
  [-60, -190, 18, -3.4],
];
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 38, octaves: 3, seed: seedOffset(1) });
  const fine = noise.fbm2({ x, z, frequency: 1 / 9, octaves: 2, seed: seedOffset(3) });
  const crag = noise.ridged({ x, z, frequency: 1 / 50, octaves: 4, seed: seedOffset(2) }) / 1.875;
  // hummocks and channels: about half the low ground stands in water
  let h = -0.9 + roll * 1.5 + fine * 0.25;
  if (roll < -0.15) h -= (-0.15 - roll) * 4;
  for (const [cx, cz, r, f] of POOLS) { const d = Math.hypot(x - cx, z - cz); h = lerp(h, Math.min(h, f + fine * 0.4), 1 - sstep(r * 0.45, r, d)); }
  // the rim: wooded banks climbing out of the fen
  const e = Math.hypot(x / 215, (z + 95) / 215);
  h += sstep(0.82, 1.05, e) * (16 + crag * 18);
  h += sstep(14, 40, z) * (10 + crag * 8);
  for (const [cx, cz, H, r, f] of ROOMS) {
    const d = Math.hypot(x - cx, z - cz), t = 1 - sstep(r, r + f, d);
    if (t > 0) h = lerp(h, H + fine * 0.15, t);
  }
  return h;
}
export function materialAt(ctx) {
  const { x, z, slope, worldHeight: y, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 22, octaves: 3, seed: seedOffset(5) });
  const m = noise.fbm2({ x, z, frequency: 1 / 11, octaves: 2, seed: seedOffset(6) });
  const rock = c01((slope - 0.3 + n * 0.08) * 5);
  // black muck at the waterline, rotting mulch in drifts, moss on the dry crowns
  const muck = 1 - sstep(WATER + 0.15, WATER + 0.75 + n * 0.3, y);
  const moss = sstep(-0.35, 0.6, y + n * 0.6) * (1 - rock);
  const mulch = c01((m - 0.1) * 3) * (1 - muck) * (1 - rock) * 0.8;
  const rest = Math.max(0, 1 - rock - muck);
  return { rock, muck: muck * (1 - rock), moss: rest * moss * (1 - mulch), mulch: rest * mulch, ground: rest * (1 - moss) * (1 - mulch) + 0.001 };
}
