// Emberwood (zone-autumn) landform, creator 2026-10-10 "great detail in all zones with equal care".
// A ridge-ringed valley ~430 m across centred (0,-110). The gate stands on a 6 m arrival terrace at the origin looking south
// down the main road to the Emberheart, a giant red tree on its hill (0,-205). Rooms: Thornby woodcutters (65,-45),
// the Hollins farmstead gone to seed (-70,-75), the boar wallow (100,-130), Ashveil spider hollow (-105,-160),
// Greymane's den on the rise (55,-185). The Emberrun creek crosses the valley east-west; the road bridges it at (0,-120).
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// [x, z, height, flat radius, falloff]
export const ROOMS = [
  [0, -2, 6, 13, 16],        // arrival terrace
  [65, -45, 3, 20, 14],      // Thornby woodcutters' camp
  [-70, -75, 1.5, 24, 14],   // Hollins farmstead
  [100, -130, -0.4, 18, 12], // boar wallow
  [-105, -160, -1.6, 20, 12],// Ashveil hollow (sunken, under the darkest canopy)
  [55, -185, 5.5, 14, 14],   // Greymane's den on the rise
  [0, -205, 9, 16, 22],      // the Emberheart hill
];
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 70, octaves: 3, seed: seedOffset(1) });
  const fine = noise.fbm2({ x, z, frequency: 1 / 14, octaves: 2, seed: seedOffset(3) });
  const crag = noise.ridged({ x, z, frequency: 1 / 55, octaves: 4, seed: seedOffset(2) }) / 1.875;
  let h = roll * 4 + fine * 0.4;
  // the rim: forested ridges all round, higher in the south behind the Emberheart
  const e = Math.hypot(x / 220, (z + 110) / 220);
  h += sstep(0.78, 1.05, e) * (22 + crag * 22 + sstep(-150, -260, z) * 10);
  h += sstep(10, 40, z) * (12 + crag * 10);
  for (const [cx, cz, H, r, f] of ROOMS) {
    const d = Math.hypot(x - cx, z - cz), t = 1 - sstep(r, r + f, d);
    if (t > 0) h = lerp(h, H + fine * 0.2, t);
  }
  return h;
}
export function materialAt(ctx) {
  const { x, z, slope, worldHeight: y, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 26, octaves: 3, seed: seedOffset(5) });
  const m = noise.fbm2({ x, z, frequency: 1 / 13, octaves: 2, seed: seedOffset(6) });
  const rock = c01((slope - 0.32 + n * 0.08) * 5);
  const rest = 1 - rock;
  // leaf litter drifts in the hollows and under the groves; dry fescue on sunlit crests; the redridge leaf-grass carries the rest
  const litter = c01((0.5 - y * 0.25 + m * 1.2 - 0.2)) * 0.9;
  const dry = sstep(4, 10, y + n * 3) * (1 - litter);
  const hollow = 1 - sstep(70, 90, Math.hypot(x + 105, z + 160) * 3.5 - 0); // Ashveil floor: all litter
  const plot = 1 - sstep(10, 14, Math.max(Math.abs(x + 58), Math.abs(z + 92) * 1.3) + n * 3); // the Hollins pumpkin plot
  const L = Math.max(litter, hollow);
  return {
    rock,
    soil: rest * plot,
    leafLitter: rest * (1 - plot) * L,
    dryGrass: rest * (1 - plot) * (1 - L) * dry,
    ground: rest * (1 - plot) * (1 - L) * (1 - dry) + 0.001,
  };
}
