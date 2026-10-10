// Thistledown (zone-village) landform, 2026-10-10. Bible §5: Goldshire / Southshore warmth at early evening.
// The principles (creator: "remember our principles for all zones"): flat gameplay rooms, broad shelves stepped by
// rock lips instead of egg-carton roll, knife ridges between rooms, POIs on pedestals, a hard ridge bowl round it all.
// Gate terrace at the origin looks south down the lane to the green; the mill stream crosses near z -118.
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// [x, z, height, flat radius, falloff]
export const ROOMS = [
  [0, -2, 5, 12, 10],          // arrival terrace
  [0, -70, 2, 36, 12],         // the village green
  [88, -78, 1.2, 30, 12],      // Brackwater farm
  [-82, -74, 3.5, 24, 10],     // the orchard shelf
  [-48, -158, 13, 15, 8],      // chapel knoll (pedestal)
  [62, -152, 1.5, 20, 10],     // the squash fields
  [96, -196, 6, 18, 7],        // Snarlmane's gnoll camp, on its shelf
  [-120, -170, 4, 16, 9],      // the old quarry hollow (boars)
];
export const STREAM = [[-210, -110], [-150, -116], [-90, -122], [-40, -118], [0, -118], [40, -124], [90, -128], [150, -122], [210, -134]];
const ROADS = [[[0, -8], [0, -50]], [[0, -92], [0, -118], [14, -150], [40, -176], [70, -190]], [[18, -70], [60, -76]], [[-22, -68], [-62, -72]], [[-8, -108], [-30, -136], [-36, -146]], [[60, -76], [64, -134]]];
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = c01(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineD = (L, x, z) => { let d = 1e9; for (let i = 1; i < L.length; i++) d = Math.min(d, segD(x, z, L[i - 1], L[i])); return d; };
const roadD = (x, z) => { let d = 1e9; for (const L of ROADS) d = Math.min(d, lineD(L, x, z)); return d; };
const terrace = (v, step, lip) => { const k = Math.floor(v / step), fr = v / step - k; return (k + sstep(1 - lip, 1, fr)) * step; };
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 120, octaves: 2, seed: seedOffset(1) });
  const drift = noise.fbm2({ x, z, frequency: 1 / 18, octaves: 2, seed: seedOffset(3) });
  const crag = noise.ridged({ x, z, frequency: 1 / 45, octaves: 4, seed: seedOffset(2) }) / 1.875;
  const spine = noise.ridged({ x, z, frequency: 1 / 75, octaves: 3, seed: seedOffset(7) }) / 1.75;
  let h = Math.max(1.4, terrace(4.5 + roll * 8, 3.5, 0.12)) + drift * 0.3;              // broad shelves with short steep lips
  let keep = sstep(6, 18, roadD(x, z)) * sstep(8, 20, lineD(STREAM, x, z));
  for (const [cx, cz, , r, f] of ROOMS) keep *= sstep(r + f, r + f + 14, Math.hypot(x - cx, z - cz));
  h += c01((spine - 0.8) / 0.2) * (11 + crag * 9) * keep;                // knife ridges between the rooms
  const e = Math.hypot(x / 215, (z + 110) / 215);
  h += sstep(0.78, 0.9, e) * (30 + crag * 26) + sstep(0.9, 1.05, e) * crag * 16; // the bowl's ridge wall
  h += sstep(10, 30, z) * (14 + crag * 12);
  for (const [cx, cz, H, r, f] of ROOMS) { const d = Math.hypot(x - cx, z - cz), t = 1 - sstep(r, r + f, d); if (t > 0) h = lerp(h, H + drift * 0.15, t); }
  // the stream valley: a soft trough the river mark cuts into
  const sd = lineD(STREAM, x, z); h = lerp(h, 0.4, 1 - sstep(5, 16, sd));
  // the chapel ramp: a ledge winding 270 degrees up the knoll from the lane's end
  { const [cx, cz, H, r] = ROOMS[4], dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
    if (d > r - 1 && d < r + 6) { const a0 = Math.atan2(-146 - cz, -36 - cx); let a = Math.atan2(dz, dx) - a0; a = ((a % 6.2832) + 6.2832) % 6.2832; const fr = a / 4.712;
      if (fr <= 1) { const w = sstep(r - 1, r + 0.5, d) * (1 - sstep(r + 4.5, r + 6, d)); h = lerp(h, lerp(2.5, H, fr), w); } } }
  // pedestal flanks break into rock
  for (const [cx, cz, H, r, f] of ROOMS) { if (H < 6) continue; const d = Math.hypot(x - cx, z - cz); h += (1 - sstep(r + f, r + f + 16, d)) * sstep(r, r + 4, d) * crag * 4; }
  return h;
}
const FIELDS = [[48, -142, 30, 20], [84, -112, 16, 10], [-8, -40, 10, 6]]; // tilled plots: [cx, cz, w, d]
export function materialAt(ctx) {
  const { x, z, slope, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 22, octaves: 3, seed: seedOffset(5) });
  const rock = c01((slope - 0.32 + n * 0.08) * 6), rest = 1 - rock;
  let soil = 0; for (const [cx, cz, w, d] of FIELDS) soil = Math.max(soil, 1 - sstep(-1.5, 1.5 + n * 1.5, Math.max(Math.abs(x - cx) - w / 2, Math.abs(z - cz) - d / 2)));
  // trampled dirt round doorways and fences: the green's ring, the farmyard, the camp
  const tr = Math.max(c01(1 - Math.abs(Math.hypot(x, z + 70) - 24) / 7) * c01(0.6 + n), 1 - sstep(10, 22 + n * 6, Math.hypot(x - 92, z + 72)), 1 - sstep(8, 18 + n * 5, Math.hypot(x - 96, z + 196)));
  const loam = c01(1 - sstep(4, 9, lineD(STREAM, x, z)));
  const dirt = c01(tr * 0.85 + loam) * (1 - soil);
  const g = Math.max(0, 1 - soil - dirt);
  return { rock, soil: rest * soil, dirt: rest * dirt, ground: rest * g * 0.88 + 0.001, clover: rest * g * 0.12 * c01(0.5 + n * 2) };
}
