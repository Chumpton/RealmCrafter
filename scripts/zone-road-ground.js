// The Old Road (zone-road) landform, 2026-10-10. Bible §6: a forgotten trade route through wooded country.
// One long road is the zone's spine: gate terrace → tower checkpoint → meeting-stone crossroads → wagon ambush cut
// → gorge bridge → waystation → the sealed far gate. Rooms sit flat on shelves; knife ridges and a bowl wall hold it in.
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// [x, z, height, flat radius, falloff]
export const ROOMS = [
  [0, -2, 5.5, 12, 22],         // 0 arrival terrace
  [0, -56, 3, 26, 12],         // 1 the tower checkpoint (hub, quest)
  [-46, -122, 2.5, 24, 12],    // 2 meeting-stone crossroads
  [26, -176, 1.5, 18, 8],      // 3 broken-wagon ambush, in the cut
  [62, -262, 2.5, 26, 18],     // 4 the waystation
  [-100, -206, 8, 22, 8],      // 5 Blackhand's bandit camp, on its wooded shelf
  [100, -110, 4, 18, 10],      // 6 wolf dell
  [20, -322, 3, 14, 22],       // 7 the sealed far gate
];
export const ROAD = [[0, -8], [0, -30], [2, -56], [-14, -86], [-40, -112], [-46, -124], [-30, -146], [6, -166], [26, -178], [30, -200], [32, -222], [44, -244], [62, -260], [52, -290], [20, -318]];
export const GORGE = [[-230, -214], [-150, -220], [-80, -224], [-20, -218], [32, -212], [90, -206], [160, -214], [230, -206]];
const SPURS = [[[-46, -124], [-70, -150], [-88, -180], [-100, -200]], [[-14, -86], [40, -100], [100, -110]]];
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = c01(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineD = (L, x, z) => { let d = 1e9; for (let i = 1; i < L.length; i++) d = Math.min(d, segD(x, z, L[i - 1], L[i])); return d; };
const roadD = (x, z) => Math.min(lineD(ROAD, x, z), ...SPURS.map((L) => lineD(L, x, z)));
const terrace = (v, step, lip) => { const k = Math.floor(v / step), fr = v / step - k; return (k + sstep(1 - lip, 1, fr)) * step; };
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 110, octaves: 2, seed: seedOffset(1) });
  const drift = noise.fbm2({ x, z, frequency: 1 / 18, octaves: 2, seed: seedOffset(3) });
  const crag = noise.ridged({ x, z, frequency: 1 / 40, octaves: 4, seed: seedOffset(2) }) / 1.875;
  const spine = noise.ridged({ x, z, frequency: 1 / 70, octaves: 3, seed: seedOffset(7) }) / 1.75;
  const rd = roadD(x, z);
  const base = 5 + roll * 9;
  let h = Math.max(2, lerp(terrace(base, 3.5, 0.14), base, 1 - sstep(6, 16, rd))) + drift * 0.3; // the road melts the shelf lips it crosses
  let keep = sstep(7, 20, rd) * sstep(10, 22, lineD(GORGE, x, z));
  for (const [cx, cz, , r, f] of ROOMS) keep *= sstep(r + f, r + f + 12, Math.hypot(x - cx, z - cz));
  h += c01((spine - 0.78) / 0.22) * (12 + crag * 10) * keep;              // wooded knife ridges the road threads between
  // the ambush cut: two high banks pinch the road at the wagon
  { const d = Math.hypot(x - 26, z + 176); h += (1 - sstep(30, 46, d)) * sstep(9, 16, rd) * (9 + crag * 6); }
  const e = Math.hypot(x / 200, (z + 160) / 205);
  h += sstep(0.8, 0.92, e) * (32 + crag * 26) + sstep(0.92, 1.05, e) * crag * 16;   // the bowl's ridge wall
  h += sstep(10, 30, z) * (16 + crag * 12);
  for (const [cx, cz, H, r, f] of ROOMS) { const d = Math.hypot(x - cx, z - cz), t = 1 - sstep(r, r + f, d); if (t > 0) h = lerp(h, H + drift * 0.15, t); }
  // the road itself settles a touch below its verges: a worn trade route
  h -= (1 - sstep(2, 5, rd)) * 0.25;
  // the gorge: steep walls down to a stony creek; the bridge spans it at x≈32
  const gd = lineD(GORGE, x, z);
  h = lerp(h, -4 + crag * 0.6, 1 - sstep(3, 6.5, gd));
  // the bandit shelf ramp: a narrow switchback from the spur road
  { const [cx, cz, H, r] = ROOMS[5], d = Math.hypot(x - cx, z - cz); if (d > r - 1 && d < r + 16) { const sd = lineD(SPURS[0], x, z); if (sd < 4) h = lerp(h, lerp(H, 2.5, sstep(r, r + 16, d)), 1 - sstep(2.5, 4, sd)); } }
  for (const [cx, cz, H, r, f] of ROOMS) { if (H < 6) continue; const d = Math.hypot(x - cx, z - cz); h += (1 - sstep(r + f, r + f + 16, d)) * sstep(r, r + 4, d) * crag * 4 * sstep(4, 8, lineD(SPURS[0], x, z)); }
  return h;
}
export function materialAt(ctx) {
  const { x, z, slope, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 20, octaves: 3, seed: seedOffset(5) });
  const rock = c01((slope - 0.32 + n * 0.08) * 6), rest = 1 - rock;
  const rd = lineD(ROAD, x, z);
  // broken paving down the spine, giving way to twin ruts where the old stones are gone
  const paveZone = c01(0.5 + noise.fbm2({ x, z, frequency: 1 / 60, octaves: 2, seed: seedOffset(9) }) * 1.6);
  const onRoad = 1 - sstep(2.6, 4 + n, rd);
  const pave = onRoad * paveZone * c01(0.55 + n * 1.4);
  const rut = onRoad * (1 - pave * 0.9) * (1 - sstep(0.3, 0.7, Math.abs(rd - 1.1)) * 0.9 + 0.1);
  const spur = 1 - sstep(1.6, 2.8 + n, Math.min(...SPURS.map((L) => lineD(L, x, z))));
  const ditch = (1 - sstep(4, 6.5, rd)) * sstep(3.5, 4.5, rd) * c01(0.4 + n * 2);
  const yard = Math.max(1 - sstep(14, 24 + n * 6, Math.hypot(x, z + 56)), 1 - sstep(14, 24 + n * 6, Math.hypot(x - 62, z + 262)), 1 - sstep(10, 20 + n * 5, Math.hypot(x + 100, z + 206)));
  const creek = 1 - sstep(3, 7, lineD(GORGE, x, z));
  const gravel = c01(pave + ditch * 0.7 + creek);
  const dirt = c01(rut + spur + yard * 0.6) * (1 - gravel);
  const g = Math.max(0, 1 - gravel - dirt);
  return { rock, gravel: rest * gravel, dirt: rest * dirt, ground: rest * g * 0.9 + 0.001, clover: rest * g * 0.1 * c01(0.5 + n * 2) };
}
