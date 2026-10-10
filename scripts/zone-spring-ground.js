// Verdant Glade (zone-spring) landform, 2026-10-10. Rolling spring meadows ~400 m across centred (0,-110), soft wooded hills around.
// Gate terrace at the origin; the road runs south past Northvale Abbey (-10,-55) to the fountain-tree hollow (60,-160).
// The Brightrun brook (config mark) crosses east-west near z -100. Rooms: lambing meadow (-85,-95), shrine ruin (85,-70),
// wolf den dell (-70,-195), apiary orchard (40,-40).
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
export const BROOK = [[-200, -70], [-150, -88], [-100, -110], [-55, -104], [-20, -98], [0, -100], [30, -110], [70, -118], [120, -108], [200, -125]];
export const ROOMS = [
  [0, -2, 2, 12, 14],          // arrival terrace
  [-10, -55, 4, 26, 18],       // Northvale Abbey rise
  [40, -40, 2.5, 16, 14],      // apiary orchard
  [-85, -150, 1, 26, 16],      // lambing meadow (south of the brook)
  [85, -70, 6, 14, 14],        // shrine ruin knoll
  [-70, -205, 0.5, 18, 14],    // wolf den dell
  [60, -165, -1, 20, 20],      // fountain-tree hollow
];
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = c01(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const brookD = (x, z) => { let d = 1e9; for (let i = 1; i < BROOK.length; i++) d = Math.min(d, segD(x, z, BROOK[i - 1], BROOK[i])); return d; };
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 70, octaves: 3, seed: seedOffset(1) });
  const fine = noise.fbm2({ x, z, frequency: 1 / 18, octaves: 2, seed: seedOffset(3) });
  const ridge = noise.ridged({ x, z, frequency: 1 / 60, octaves: 3, seed: seedOffset(2) }) / 1.75;
  let h = 1.5 + roll * 6 + fine * 0.5;
  const e = Math.hypot(x / 210, (z + 110) / 210);
  h += sstep(0.72, 1.05, e) * (18 + ridge * 18);
  h += sstep(10, 40, z) * (8 + ridge * 6);
  // the brook valley sinks the meadow gently toward the water
  const bd = brookD(x, z);
  h = lerp(h, Math.min(h, 0.3), 1 - sstep(4, 30, bd));
  for (const [cx, cz, H, r, f] of ROOMS) {
    const d = Math.hypot(x - cx, z - cz), t = 1 - sstep(r, r + f, d);
    if (t > 0) h = lerp(h, H + fine * 0.3, t);
  }
  return h;
}
export function materialAt(ctx) {
  const { x, z, slope, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 22, octaves: 3, seed: seedOffset(5) });
  const rock = c01((slope - 0.4 + n * 0.1) * 5);
  const loam = (1 - sstep(4, 9 + n * 3, brookD(x, z))) * (1 - rock);
  const rest = (1 - rock) * (1 - loam);
  const fl = c01((n - 0.05) * 3.2) * rest;
  return { rock, loam, flowers: fl, ground: rest - fl + 0.001 };
}
