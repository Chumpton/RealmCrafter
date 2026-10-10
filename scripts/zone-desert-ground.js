// Sunscorch (zone-desert) landform. Gate terrace at the origin looking south (-Z) over a dune sea ringed by rim dunes.
// Rooms: nomad camp hub (0,-75), command tent rise (10,-235, 12 m up: the landmark from the gate), oasis hollow (-115,-130),
// dry canyon cut (88,-98 → 136,-272) through a sandstone plateau, opening into the boar ravine (135,-292),
// spider nest under the west mesas (-130,-265). Mesas are the trees (design-zones 4.5). Roads match config.yaml marks.
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, t = c01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}
const polyDist = (x, z, P) => { let d = 1e9; for (let i = 1; i < P.length; i++) d = Math.min(d, segDist(x, z, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1])); return d; };
// [x, z, height, flat radius, falloff]
export const ROOMS = [
  [0, -2, 4, 13, 16],        // arrival terrace
  [0, -75, 2.5, 30, 22],     // nomad camp (hub)
  [10, -238, 12, 20, 40],    // command tent rise
  [-130, -265, 3, 22, 18],   // spider nest
  [135, -292, -1, 24, 14],   // boar ravine
];
export const OASIS = { x: -115, z: -130, level: 0.6, radius: 24 };
export const CANYON = [[88, -98], [118, -128], [148, -160], [158, -200], [150, -240], [136, -272]];
export const ROADS = {
  main: [[0, -11], [0, -40], [1, -62], [3, -95], [6, -130], [6, -155], [4, -185], [8, -212], [10, -228]],
  oasis: [[-12, -82], [-45, -98], [-75, -114], [-90, -121]],
  canyon: [[18, -82], [50, -88], [72, -92], ...CANYON, [135, -285]],
  spider: [[3, -206], [-30, -224], [-70, -246], [-112, -260]],
};
// [x, z, radius, height]: flat-topped sandstone buttes (the "trees" of the desert)
export const MESAS = [
  [-58, -182, 17, 24], [70, -205, 13, 20], [-175, -60, 24, 30], [62, -22, 11, 14], [-48, -30, 9, 10],
  [-195, -205, 20, 28], [-165, -305, 16, 22], [-85, -330, 12, 18], [40, -330, 18, 24], [-150, -175, 9, 13],
];
export const SALT = [[-42, -142, 26], [78, -48, 22], [-60, -300, 30], [195, -330, 20]];
const ROADL = Object.values(ROADS);
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 160, octaves: 2, seed: seedOffset(1) });
  const crag = noise.ridged({ x, z, frequency: 1 / 40, octaves: 4, seed: seedOffset(2) }) / 1.875;
  const dune = noise.ridged({ x: x * 0.8 + z * 0.35, z: z * 1.2, frequency: 1 / 75, octaves: 3, seed: seedOffset(3) }) / 1.75;
  const warp = noise.fbm2({ x, z, frequency: 1 / 40, octaves: 2, seed: seedOffset(4) });
  const rd = Math.min(...ROADL.map((p) => polyDist(x, z, p)));
  let roomT = 0;
  for (const [cx, cz, , r, f] of ROOMS) roomT = Math.max(roomT, 1 - sstep(r, r + f, Math.hypot(x - cx, z - cz)));
  const open = sstep(4, 22, rd) * (1 - roomT);
  let h = 1.6 + roll * 2.2;
  h += open * (dune * 5.5 + warp * 1.6);
  h += sstep(5, 30, rd) * (1 - roomT) * Math.sin((x * 0.55 + z * 0.84 + warp * 9) * 2.1) * 0.09; // wind ripples
  // rim dunes and the wall behind the gate
  const e = Math.hypot(x / 235, (z + 150) / 255);
  h += sstep(0.82, 1.06, e) * (24 + crag * 16 + dune * 8);
  h += sstep(12, 40, z) * (14 + crag * 8);
  // the sandstone plateau the canyon cuts, open at its north mouth
  const dc = polyDist(x, z, CANYON);
  const mouth = sstep(14, 46, Math.hypot(x - 88, z + 98));
  const plate = (1 - sstep(30, 52, dc + warp * 6)) * mouth * (12 + crag * 3);
  h = Math.max(h, lerp(h, 2 + plate, Math.min(1, plate / 3)));
  const cut = 1 - sstep(5.5, 11 + crag * 2, dc);
  h = lerp(h, 0.8 + roll * 0.3, cut);
  // mesas: steep sides, flat tops, wobbled outline
  for (const [mx, mz, r, H] of MESAS) {
    const d = Math.hypot(x - mx, z - mz) + warp * 3.5;
    const t = 1 - sstep(r, r + 5 + crag * 3, d);
    if (t > 0) h = Math.max(h, lerp(h, H + crag * 1.5, t));
  }
  // salt pans: low and dead flat
  for (const [sx, sz, r] of SALT) { const t = 1 - sstep(r * 0.7, r + 10, Math.hypot(x - sx, z - sz)); if (t > 0) h = lerp(h, 1.1 + roll * 0.2, t * (1 - roomT)); }
  // oasis hollow: a grassy ring round a basin
  const od = Math.hypot(x - OASIS.x, z - OASIS.z);
  h = lerp(h, 1.5 + roll * 0.2, 1 - sstep(36, 52, od));
  h = lerp(h, -1.6, 1 - sstep(14, 27, od));
  for (const [cx, cz, H, r, f] of ROOMS) {
    const t = 1 - sstep(r, r + f, Math.hypot(x - cx, z - cz));
    if (t > 0) h = lerp(h, H + roll * 0.25, t);
  }
  return h;
}
export function materialAt(ctx) {
  const { x, z, worldHeight, slope, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 24, octaves: 3, seed: seedOffset(5) });
  const big = noise.fbm2({ x, z, frequency: 1 / 70, octaves: 2, seed: seedOffset(6) });
  const od = Math.hypot(x - OASIS.x, z - OASIS.z);
  if (od < 46 + n * 5) {
    if (worldHeight < 0.9 + n * 0.3) return { wetsand: 1 };
    const g = c01((40 + n * 6 - od) / 6);
    return { grass: g, sand: 1 - g };
  }
  const rock = c01((slope - 0.2 + n * 0.08) * 5);
  if (rock > 0.98) return { rock: 1 };
  const dc = polyDist(x, z, CANYON);
  if (dc < 9 + n * 3) return { gravel: 1 - rock * 0.9, rock: rock };
  for (const [sx, sz, r] of SALT) {
    const s = c01((r + n * 7 - Math.hypot(x - sx, z - sz)) / 7);
    if (s > 0) return { salt: s * (1 - rock), sand: (1 - s) * (1 - rock), rock };
  }
  const pave = c01((big - 0.32 + n * 0.12) * 6) * (worldHeight < 6 ? 1 : 0.3);
  return { sand: (1 - pave) * (1 - rock), pave: pave * (1 - rock), rock };
}
