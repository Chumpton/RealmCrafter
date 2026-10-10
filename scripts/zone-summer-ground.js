// Summer zone landform. Gate terrace at the origin looking south (-Z) over a valley ringed by ridges.
// Rooms (flat, playable): farm (-90,-110), fair (60,-60), outpost shelf (130,-170), dust hollow (110,-260),
// pond basin (-70,-230), and the Azora mesa (0,-300): the landmark you see from the gate.
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, t = c01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}
// [x, z, height, flat radius, falloff]
const ROOMS = [
  [0, -2, 6, 22, 22],       // arrival terrace
  [-90, -110, 2, 42, 26],   // harvest farm
  [60, -60, 3, 30, 22],     // sunfair meadow
  [130, -170, 14, 26, 16],  // ridge outpost shelf
  [110, -262, 2.5, 30, 18], // dust hollow (prairie arena)
  [0, -300, 28, 24, 14],    // azora mesa
];
// [ax, az, bx, bz, height, half-width]
const RIDGES = [
  [-185, -150, -122, -168, 20, 22],
  [-72, -176, -38, -160, 14, 16],
  [40, -128, 78, -212, 22, 18],
  [150, -55, 195, -135, 24, 24],
  [-150, -40, -95, -30, 16, 20],
  [60, -330, 150, -320, 20, 22],
];
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 70, octaves: 3, seed: seedOffset(1) });
  const crag = noise.ridged({ x, z, frequency: 1 / 45, octaves: 4, seed: seedOffset(2) }) / 1.875;
  let h = 2 + roll * 2.4;
  // outer rim: the valley is a bowl, ridges climbing to ~45 m
  const e = Math.hypot(x / 235, (z + 175) / 255);
  h += sstep(0.8, 1.02, e) * (28 + crag * 22);
  // the wall behind the gate
  h += sstep(14, 44, z) * (18 + crag * 10);
  for (const [ax, az, bx, bz, H, w] of RIDGES) {
    const d = segDist(x, z, ax, az, bx, bz);
    if (d < w) h += H * Math.pow(1 - d / w, 1.4) * (0.7 + crag * 0.6);
  }
  // pond basin
  const pd = Math.hypot(x + 70, z + 230);
  h = lerp(h, -1.5, 1 - sstep(16, 40, pd));
  for (const [cx, cz, H, r, f] of ROOMS) {
    const d = Math.hypot(x - cx, z - cz);
    const t = 1 - sstep(r, r + f, d);
    if (t > 0) h = lerp(h, H + roll * 0.3, t);
  }
  return h;
}
// the creek's line (matches the river mark in config.yaml): its banks wear sand
const CREEK = [[64, -146], [40, -158], [25, -165], [12, -170], [4, -172], [-6, -178], [-20, -190], [-35, -204], [-46, -213], [-54, -221]];
export function materialAt(ctx) {
  const { x, z, slope, worldHeight, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 28, octaves: 3, seed: seedOffset(5) });
  const rock = c01((slope - 0.3 + n * 0.08) * 5);
  // sand only where water meets land: the pond shore, the creek banks, and the dry wash of Dust Hollow
  const pd = Math.hypot(x + 70, z + 230);
  let cd = 1e9;
  if (x > -70 && x < 80 && z < -130 && z > -235) for (let i = 1; i < CREEK.length; i++) cd = Math.min(cd, segDist(x, z, CREEK[i - 1][0], CREEK[i - 1][1], CREEK[i][0], CREEK[i][1]));
  const hd = Math.hypot(x - 110, z + 262);
  const sand = Math.max(1 - sstep(30, 34 + n * 3, pd), 1 - sstep(3.5, 5.5 + n * 1.5, cd), (1 - sstep(14, 22 + n * 5, hd)) * 0.9) * (1 - rock);
  const wheat = (x > -125 && x < -88 && z > -150 && z < -122) ? 1 : 0;
  const sd = Math.max(-78 - x, x + 58, -138 - z, z + 112) + n * 2.2; // creator 2026-10-10: the plot's edge feathers soil into grass over ~3 m, ragged, never a stair-step
  const soil = 1 - sstep(-1.5, 1.5, sd);
  // wildflowers bloom on the sunlit crests: high ground and noise-picked drifts
  const fn = noise.fbm2({ x, z, frequency: 1 / 18, octaves: 2, seed: seedOffset(9) });
  const flowers = c01((fn - 0.15) * 4) * c01((worldHeight - 4) / 6) * (1 - c01((slope - 0.18) * 6));
  const rest = Math.max(0, 1 - rock - sand - wheat - soil);
  // two greens: deep emerald in the low valley, golden-green on the rolls; ~80% of the vale is grass
  const gold = c01(0.35 + n * 0.6 + (worldHeight - 6) / 40);
  return { rock, sand, wheat: wheat * (1 - rock), soil: soil * (1 - rock), flowers: rest * flowers, ground: rest * (1 - flowers) * gold, grass: rest * (1 - flowers) * (1 - gold) };
}
