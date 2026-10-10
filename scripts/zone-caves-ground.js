// Deepdelve (zone-caves) landform: a cavern bowl ~390 m across, ringed by 60-90 m sheer walls.
// Arrival: a timbered ledge 6 m up at the origin under the north wall, looking south (-Z) down the haul road
// to the crystal grotto. Rooms (flat, playable) in ROOMS; the lake basin is a lake mark in config.yaml.
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, t = c01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}
export const BOWL = { x: 0, z: -185, rx: 196, rz: 200 };
// [x, z, height, flat radius, falloff]
export const ROOMS = [
  [0, -2, 6, 11, 12],        // arrival ledge (timbered)
  [-42, -44, 1.5, 24, 16],   // mine entrance camp (hub)
  [88, -96, 1, 24, 16],      // cart tracks and spoil heaps
  [-118, -138, 3, 26, 16],   // kobold warren
  [10, -205, 0.5, 30, 18],   // crystal grotto (landmark)
  [108, -238, 4, 24, 14],    // spider gallery
  [-84, -262, -0.2, 40, 14], // underground lake shore (the water fills its middle)
];
export const LAKE = { x: -84, z: -262, r: 30, level: -1.2 };
// rock spurs: crags breaking up the floor between rooms [ax, az, bx, bz, height, half-width]
const SPURS = [
  [-120, -40, -95, -75, 16, 14],
  [140, -150, 120, -175, 18, 14],
  [-30, -150, -45, -135, 9, 9],
  [55, -150, 70, -175, 10, 10],
  [-150, -210, -130, -190, 14, 14],
  [50, -300, 90, -300, 12, 12],
  [150, -40, 130, -60, 14, 14],
];
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 55, octaves: 3, seed: seedOffset(1) });
  const crag = noise.ridged({ x, z, frequency: 1 / 38, octaves: 4, seed: seedOffset(2) }) / 1.875;
  let h = 1 + roll * 1.6 + crag * 0.8;
  // the cavern wall: a sheer ring, 60-90 m, its face broken by strata
  const e = Math.hypot((x - BOWL.x) / BOWL.rx, (z - BOWL.z) / BOWL.rz);
  h += sstep(0.9, 1.0, e) * (62 + crag * 28) + sstep(1.0, 1.1, e) * 10;
  h += sstep(9, 22, z) * (66 + crag * 20); // the wall behind the ledge
  for (const [ax, az, bx, bz, H, w] of SPURS) {
    const d = segDist(x, z, ax, az, bx, bz);
    if (d < w) h += H * Math.pow(1 - d / w, 1.3) * (0.7 + crag * 0.6);
  }
  for (const [cx, cz, H, r, f] of ROOMS) {
    const d = Math.hypot(x - cx, z - cz);
    const t = 1 - sstep(r, r + f, d);
    if (t > 0) h = lerp(h, H + roll * 0.25, t);
  }
  // the lake basin: a bowl under still water, shelving from its shore
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z);
  h = lerp(h, -5, 1 - sstep(LAKE.r - 14, LAKE.r + 2, ld));
  return h;
}
// tailings: where spoil is dumped (the cart yard, the hub, the warren's diggings)
const TAIL = [[88, -96, 34], [-42, -44, 22], [-118, -138, 22], [30, -60, 14]];
export function materialAt(ctx) {
  const { x, z, slope, worldHeight, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 24, octaves: 3, seed: seedOffset(5) });
  const m = noise.fbm2({ x, z, frequency: 1 / 60, octaves: 2, seed: seedOffset(7) });
  const cliff = c01((slope - 0.22 + n * 0.08) * 5);
  // gravel tailings: ~25% of the floor, feathered patches round the diggings plus noise drifts
  let tail = c01((m - 0.12) * 3);
  for (const [cx, cz, r] of TAIL) tail = Math.max(tail, 1 - sstep(r * 0.6, r + n * 6, Math.hypot(x - cx, z - cz)));
  // wet slicks: ~15%, low hollows, the lake shore, calcite runoff under the walls
  const ld = Math.hypot(x - LAKE.x, z - LAKE.z);
  let wet = Math.max(c01((-m - 0.28) * 3.5), 1 - sstep(LAKE.r, LAKE.r + 10 + n * 4, ld), c01((0.6 - worldHeight) * 0.6) * 0.5);
  wet *= 1 - cliff; tail *= (1 - cliff) * (1 - wet);
  const floor = Math.max(0, 1 - cliff - wet - tail);
  return { rock: cliff + floor * 0.35, ground: floor * 0.65, gravel: tail, wet };
}
