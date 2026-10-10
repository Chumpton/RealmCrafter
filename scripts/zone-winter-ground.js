// Frostpeak (zone-winter) landform, 2026-10-10. A high pass ~420 m across centred (0,-110), walled by crags.
// Gate on a 6 m terrace at the origin looking south down the pass road to the gryphon aerie on its 22 m crag (70,-175).
// Rooms: Ironhold outpost (-15,-60), Glimmermere frozen lake (-95,-140), Frostmaw bear den under the west cliff (-150,-210),
// the wolf ridge (110,-90), the woodcutters' line (40,-40).
const c01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
// creator 2026-10-10 "winterzone too eggshell, remember our principles": no egg-carton roll. Flat gameplay shelves stepped by
// sharp rock risers, knife ridges between rooms, POIs on pedestals (aerie, wolf ridge) and a hard crag wall round the bowl.
// [x, z, height, flat radius, falloff]: a short falloff is a cliff edge.
export const ROOMS = [
  [0, -2, 6, 13, 10],          // arrival terrace
  [-15, -60, 3, 26, 9],        // Ironhold outpost
  [40, -40, 4, 12, 8],         // woodcutters' line
  [-95, -140, -1.5, 30, 8],    // Glimmermere (flat ice sheet)
  [-150, -210, 4, 16, 9],      // Frostmaw den mouth
  [110, -90, 11, 16, 6],       // wolf ridge, on its shelf
  [70, -175, 22, 13, 9],       // the aerie crag, a pedestal
];
const ROADS = [[[0, -8], [-4, -35], [-6, -60], [5, -95], [25, -125], [45, -150], [58, -165]], [[-4, -30], [20, -36], [34, -40]], [[-20, -75], [-45, -100], [-70, -122]], [[-110, -165], [-128, -188], [-142, -202]], [[5, -95], [50, -95], [95, -92]]];
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; const t = c01(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const roadD = (x, z) => { let d = 1e9; for (const L of ROADS) for (let i = 1; i < L.length; i++) d = Math.min(d, segD(x, z, L[i - 1], L[i])); return d; };
const terrace = (v, step, lip) => { const k = Math.floor(v / step), fr = v / step - k; return (k + sstep(1 - lip, 1, fr)) * step; };
export function heightAt(ctx) {
  const { x, z, noise, seedOffset } = ctx;
  const roll = noise.fbm2({ x, z, frequency: 1 / 130, octaves: 2, seed: seedOffset(1) });
  const drift = noise.fbm2({ x, z, frequency: 1 / 16, octaves: 2, seed: seedOffset(3) });
  const crag = noise.ridged({ x, z, frequency: 1 / 45, octaves: 4, seed: seedOffset(2) }) / 1.875;
  const spine = noise.ridged({ x, z, frequency: 1 / 70, octaves: 3, seed: seedOffset(7) }) / 1.75;
  // the floor: broad flat shelves, 3.5 m steps with steep lips
  let h = terrace(2 + roll * 12, 5, 0.1) + drift * 0.3;
  // knife ridges: only the sharpest crest of the spine noise stands up, kept off the rooms and the roads
  let keep = sstep(5, 16, roadD(x, z));
  for (const [cx, cz, , r, f] of ROOMS) keep *= sstep(r + f, r + f + 14, Math.hypot(x - cx, z - cz));
  const crest = c01((spine - 0.8) / 0.2);
  h += crest * (16 + crag * 14) * keep;
  // the crag wall: a hard rim, not a soft bowl
  const e = Math.hypot(x / 210, (z + 110) / 210);
  h += sstep(0.78, 0.9, e) * (38 + crag * 34) + sstep(0.9, 1.05, e) * crag * 20;
  h += sstep(10, 30, z) * (16 + crag * 14);
  for (const [cx, cz, H, r, f] of ROOMS) {
    const d = Math.hypot(x - cx, z - cz), t = 1 - sstep(r, r + f, d);
    if (t > 0) h = lerp(h, H + (H < 0 ? 0 : drift * 0.2), t);
  }
  // pedestals break into rock faces round their flanks
  for (const [cx, cz, H, r, f] of ROOMS) { if (H < 9) continue; const d = Math.hypot(x - cx, z - cz); h += (1 - sstep(r + f, r + f + 18, d)) * sstep(r, r + 4, d) * crag * 5; }
  // the aerie ramp: a ledge that winds 300 degrees up the crag from the road's end (58,-165) to the top
  { const [cx, cz, H, r] = ROOMS[6], dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz);
    if (d > r - 1 && d < r + 6) { const a0 = Math.atan2(-165 - cz, 58 - cx); let a = Math.atan2(dz, dx) - a0; a = ((a % 6.2832) + 6.2832) % 6.2832; const fr = a / 5.236;
      if (fr <= 1) { const rampH = lerp(3, H, fr), w = sstep(r - 1, r + 0.5, d) * (1 - sstep(r + 4.5, r + 6, d)); h = lerp(h, rampH, w); } } }
  return h;
}
export function materialAt(ctx) {
  const { x, z, slope, worldHeight: y, noise, seedOffset } = ctx;
  const n = noise.fbm2({ x, z, frequency: 1 / 24, octaves: 3, seed: seedOffset(5) });
  const rock = c01((slope - 0.3 + n * 0.08) * 6);
  const lake = 1 - sstep(27, 31 + n * 3, Math.hypot(x + 95, z + 140));
  const rest = 1 - rock;
  // design pass 2026-10-10 (bible §3: 70 powder / 20 hard-pack ice / 10 crag): wind-scoured ice pans on the flat shelves, feathered by noise
  const pan = noise.fbm2({ x, z, frequency: 1 / 70, octaves: 3, seed: seedOffset(9) }) + n * 0.25;
  const flat = 1 - sstep(0.06, 0.16, slope);
  const ice = Math.max(lake, c01((pan - 0.22) * 3.5) * 0.85 * flat);
  return { rock, ice: rest * ice, ground: rest * (1 - ice) + 0.001 };
}
