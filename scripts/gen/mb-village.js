// Mellowbrook village landmarks (Campton 2026-10-05: "interfaith church, watchtower, wizard tower, smithing district,
// clothing district ... larger buildings ... a massive mother oak to the back right as a communal gathering").
// One generator, params.kind: church | watch | wizard | smithy | tailor | hall | oak. Origin = feet centre; the front faces -Z.
import { TEX, IRON, q, tri, box, beam, cyl, lathe, roof, lodLevel } from './yard-kit.js';
const PLASTER = 'oklch(0.93 0.03 85)', OAK = 'oklch(0.52 0.07 60)', DARKW = 'oklch(0.38 0.05 55)';
const mat = (c, tex, col, rough = 0.9, metal = 0, em = null) => { c.albedo(tex); c.color(col); c.roughness(rough); c.metalness(metal); c.emissive(em); };
const wood = (c, col = OAK) => mat(c, TEX.planks, col);
const stone = (c, l = 0.88) => mat(c, TEX.stone, `oklch(${l} 0.012 80)`);
const plaster = (c) => mat(c, null, PLASTER, 0.95);
const shingle = (c, col = 'oklch(0.55 0.06 40)') => mat(c, TEX.shingle, col);
const glow = (c, col) => mat(c, null, col, 0.4, 0, col);
const iron = (c) => mat(c, null, IRON, 0.5, 0.6);

function gable(c, x0, x1, z0, z1, y, rise, over = 0.5, col) { // a pitched roof along x, ridge at z mid
  const zm = (z0 + z1) / 2; shingle(c, col);
  roof(c, [x0 - over, y - 0.3, z0 - over], [x0 - over, y + rise, zm], (x1 - x0) + 2 * over, 0.25);
  roof(c, [x0 - over, y - 0.3, z1 + over], [x0 - over, y + rise, zm], (x1 - x0) + 2 * over, 0.25);
  // gable ends
  plaster(c); for (const x of [x0, x1]) tri(c, [x, y, z0], [x, y, z1], [x, y + rise, zm], [x < (x0 + x1) / 2 ? -1 : 1, 0, 0]);
  wood(c, DARKW); beam(c, [x0 - over, y + rise + 0.1, zm], [x1 + over, y + rise + 0.1, zm], 0.3, 0.3);
}
function halfTimber(c, x0, x1, z0, z1, y0, h, L) { // plaster walls with dark timber framing
  plaster(c); box(c, (x0 + x1) / 2, y0, (z0 + z1) / 2, x1 - x0, h, z1 - z0);
  if (L >= 3) return;
  wood(c, DARKW);
  for (const z of [z0 - 0.06, z1 + 0.06]) { for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.max(2, Math.round((x1 - x0) / 2.4))) beam(c, [x, y0, z], [x, y0 + h, z], 0.22, 0.12); beam(c, [x0, y0 + h * 0.5, z], [x1, y0 + h * 0.5, z], 0.2, 0.12); beam(c, [x0, y0 + h - 0.1, z], [x1, y0 + h - 0.1, z], 0.24, 0.12); }
  for (const x of [x0 - 0.06, x1 + 0.06]) { for (let z = z0; z <= z1 + 0.01; z += (z1 - z0) / 2) beam(c, [x, y0, z], [x, y0 + h, z], 0.12, 0.22); beam(c, [x, y0 + h * 0.5, z0], [x, y0 + h * 0.5, z1], 0.12, 0.2); }
}
function windowsZ(c, x0, x1, z, y, n, w, h, col = 'oklch(0.85 0.1 75)') {
  for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / n; glow(c, col); box(c, x, y, z, w, h, 0.08); wood(c, DARKW); box(c, x, y - 0.12, z + Math.sign(z || 1) * 0.05, w + 0.3, 0.12, 0.25); }
}
function door(c, x, z, w, h, face = -1) { wood(c, 'oklch(0.42 0.07 50)'); box(c, x, 0, z + face * 0.05, w, h, 0.12); iron(c); box(c, x, h * 0.3, z + face * 0.12, w * 0.9, 0.08, 0.05); box(c, x, h * 0.7, z + face * 0.12, w * 0.9, 0.08, 0.05); stone(c, 0.8); box(c, x, -0.2, z + face * 0.7, w + 1, 0.25, 1.2); }

// ---------- the interfaith church: a fieldstone nave, a bell tower crowned by an open sun ring (every faith's light) ----------
function church(c, col, L) {
  const W = 12, D = 24, H = 9;
  if (col) { box(c, 0, 0, 0, W, H, D); box(c, 0, 0, -D / 2 - 3, 6, 22, 6); return; }
  stone(c); box(c, 0, -0.6, 0, W + 1, 0.8, D + 1); box(c, 0, 0, 0, W, H, D);
  for (const s of [-1, 1]) for (let z = -D / 2 + 2; z <= D / 2 - 1; z += 5) { stone(c, 0.82); box(c, s * (W / 2 + 0.5), 0, z, 1, H * 0.75, 1.2); }
  // long roof, dark slate
  gable(c, -W / 2, W / 2, -D / 2, D / 2, H, 0, 0, null); // placeholder: rebuilt along z below
  shingle(c, 'oklch(0.45 0.03 250)');
  roof(c, [-W / 2 - 0.6, H - 0.3, -D / 2 - 0.4], [0, H + 6, -D / 2 - 0.4], 0, 0); // no-op guard
  roof(c, [-W / 2 - 0.6, H - 0.3, 0], [0, H + 6, 0], D + 1, 0.3); roof(c, [W / 2 + 0.6, H - 0.3, 0], [0, H + 6, 0], D + 1, 0.3);
  stone(c); tri(c, [-W / 2, H, D / 2], [W / 2, H, D / 2], [0, H + 6, D / 2], [0, 0, 1]);
  // stained glass: tall lancets in many colours along both sides, a rose window over the apse end
  const hues = [25, 85, 145, 200, 260, 320];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const z = -D / 2 + 4 + i * 5.2; glow(c, `oklch(0.72 0.14 ${hues[(i + (s > 0 ? 3 : 0)) % 6]})`); box(c, s * (W / 2 + 0.05), 2.5, z, 0.08, 4.4, 1.3); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; glow(c, `oklch(0.74 0.15 ${hues[i]})`); box(c, Math.cos(a) * 1.3, H + 1.6 + Math.sin(a) * 1.3, D / 2 + 0.06, 1.0, 1.0, 0.08); }
  glow(c, 'oklch(0.9 0.1 90)'); box(c, 0, H + 1.1, D / 2 + 0.07, 1.0, 1.0, 0.08);
  // the bell tower at the front, the door under it
  const tz = -D / 2 - 3; stone(c, 0.9); box(c, 0, 0, tz, 6.4, 20, 6.4);
  stone(c, 0.82); box(c, 0, 20, tz, 7.2, 0.6, 7.2);
  for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { stone(c, 0.9); box(c, dx * 2.8, 20.6, tz + dz * 2.8, 0.8, 4.4, 0.8); }
  stone(c, 0.82); box(c, 0, 25, tz, 7.2, 0.6, 7.2);
  mat(c, null, 'oklch(0.6 0.1 75)', 0.4, 0.8); cyl(c, [0, 20.6, tz], [0, 21.8, tz], 0.6, 1.1, 12); // the bell
  shingle(c, 'oklch(0.45 0.03 250)'); lathe(c, [0, 25.6, tz], [[4.2, 0], [0.2, 8.5], [0, 8.6]], 4, { phase: Math.PI / 4 });
  // the sun ring on the spire: a hoop of gold, no single faith's sign
  mat(c, null, 'oklch(0.8 0.14 85)', 0.3, 0.9, 'oklch(0.5 0.1 85)');
  for (let i = 0; i < 16; i++) { const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2; beam(c, [Math.cos(a0) * 1.2, 35.6 + Math.sin(a0) * 1.2, tz], [Math.cos(a1) * 1.2, 35.6 + Math.sin(a1) * 1.2, tz], 0.18, 0.18); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; beam(c, [Math.cos(a) * 1.4, 35.6 + Math.sin(a) * 1.4, tz], [Math.cos(a) * 1.9, 35.6 + Math.sin(a) * 1.9, tz], 0.12, 0.12); }
  door(c, 0, tz - 3.2, 2.4, 3.8);
  glow(c, 'oklch(0.75 0.13 200)'); box(c, 0, 12, tz - 3.25, 1.0, 3, 0.08);
  // benches and a little yard wall out front
  wood(c); for (const s of [-1, 1]) { box(c, s * 4.5, 0.42, tz - 6, 2.4, 0.08, 0.5); box(c, s * 4.5 - 1, 0, tz - 6, 0.12, 0.42, 0.4); box(c, s * 4.5 + 1, 0, tz - 6, 0.12, 0.42, 0.4); }
}

// ---------- the timber watchtower ----------
function watch(c, col, L) {
  const S = 4.4, H = 13;
  if (col) { box(c, 0, H, 0, S + 1.4, 0.3, S + 1.4); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(c, x * S / 2, 0, z * S / 2, 0.5, H, 0.5); return; }
  stone(c, 0.8); for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(c, x * (S / 2 + 0.3), -0.4, z * (S / 2 + 0.3), 1.2, 1.0, 1.2);
  wood(c, 'oklch(0.48 0.06 55)');
  const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [x, z]);
  for (const [x, z] of P) cyl(c, [x * (S / 2 + 0.3), 0, z * (S / 2 + 0.3)], [x * S / 2, H + 3.2, z * S / 2], 0.28, 0.22, 8);
  for (let k = 0; k < 3; k++) { const y0 = k * 4.2 + 0.6, y1 = y0 + 4.2; for (let i = 0; i < 4; i++) { const a = P[i], b = P[(i + 1) % 4], r = S / 2 + 0.3 - (y0 / H) * 0.3; beam(c, [a[0] * r, y0, a[1] * r], [b[0] * r, y1, b[1] * r], 0.16, 0.16); beam(c, [a[0] * r, y0 + 4.2, a[1] * r], [b[0] * r, y0 + 4.2, b[1] * r], 0.2, 0.2); } }
  wood(c); box(c, 0, H, 0, S + 1.6, 0.3, S + 1.6);
  for (let i = 0; i < 4; i++) { const a = P[i], b = P[(i + 1) % 4], r = S / 2 + 0.8; beam(c, [a[0] * r, H + 1.1, a[1] * r], [b[0] * r, H + 1.1, b[1] * r], 0.12, 0.14); for (let t = 0; t <= 1; t += 0.2) beam(c, [(a[0] + (b[0] - a[0]) * t) * r, H + 0.3, (a[1] + (b[1] - a[1]) * t) * r], [(a[0] + (b[0] - a[0]) * t) * r, H + 1.1, (a[1] + (b[1] - a[1]) * t) * r], 0.08, 0.08); }
  shingle(c, 'oklch(0.5 0.06 35)'); lathe(c, [0, H + 3.2, 0], [[S / 2 + 1.6, 0], [0, 3.4]], 4, { phase: Math.PI / 4 });
  // ladder up the front, a lantern and a pennant
  wood(c, DARKW); for (const s of [-0.35, 0.35]) beam(c, [s, 0, -S / 2 - 1.2], [s, H, -S / 2 - 0.3], 0.08, 0.1);
  for (let y = 0.4; y < H; y += 0.45) { const t = y / H; box(c, 0, y, -S / 2 - 1.2 + t * 0.9, 0.7, 0.05, 0.06); }
  glow(c, 'oklch(0.86 0.13 70)'); box(c, 0, H + 2, 0, 0.35, 0.45, 0.35);
  mat(c, null, 'oklch(0.55 0.15 25)', 0.8); beam(c, [0, H + 6.6, 0], [0, H + 9, 0], 0.06, 0.06); tri(c, [0, H + 9, 0], [0, H + 8.2, 0], [1.6, H + 8.6, 0], [0, 0, -1]); tri(c, [0, H + 9, 0], [1.6, H + 8.6, 0], [0, H + 8.2, 0], [0, 0, 1]);
}

// ---------- the wizard tower: a leaning round stone tower, a starry slate hat, a floating crystal ----------
function wizard(c, col, L) {
  // params.tall stretches the shaft alone (1 = the original); the hat, crystal and balcony ride up with it
  // 2026-10-07 Campton: "use wow texture mapping over this to make it more detailed" — hand-painted block courses,
  // string courses, buttress ribs, framed windows, slate hat with a gilt band. Silhouette and proportions kept.
  const t = Math.max(1, (c.params && c.params.tall) || 1), up = 20 * (t - 1), bal = 14 * t, H = 20 * t;
  if (col) { cyl(c, [0, 0, 0], [0, H, 0], 4, 3.4, 10); return; }
  const BLK = 'cdn/texture-wow-handpainted-limestone-blocks.png', SLATE = 'cdn/texture-wow-handpainted-purple-slate-roof-tiles.png';
  const rAt = (y) => 4.3 - (y / H) * 0.8; // the shaft's taper
  // shaft in courses: alternating warm/cool painted bands so the stone reads hand-laid, never one flat grey
  const n = Math.max(4, Math.round(H / 3.2));
  for (let k = 0; k < n; k++) { const y0 = 1.2 + (H - 1.2) * k / n, y1 = 1.2 + (H - 1.2) * (k + 1) / n;
    mat(c, BLK, k % 2 ? 'oklch(0.86 0.025 75)' : 'oklch(0.8 0.03 60)', 0.92);
    lathe(c, [0, 0, 0], [[rAt(y0), y0], [rAt(y1), y1]], 14); }
  // plinth: a heavy battered foot of darker stone, then a moulded cap
  mat(c, BLK, 'oklch(0.62 0.02 70)', 0.95); lathe(c, [0, -0.6, 0], [[5.3, 0], [5.0, 1.0], [4.6, 1.8]], 14);
  mat(c, BLK, 'oklch(0.72 0.02 70)', 0.9); lathe(c, [0, 1.1, 0], [[4.75, 0], [4.75, 0.35], [4.4, 0.5]], 14);
  // string courses: proud carved bands every few courses, the WoW tower's horizontal rhythm
  if (L < 3) { mat(c, BLK, 'oklch(0.7 0.02 70)', 0.9);
    for (let y = 6 * t; y < H - 1; y += 6 * t) { if (Math.abs(y - bal) < 1.5) continue; const r = rAt(y); lathe(c, [0, y, 0], [[r, 0], [r + 0.35, 0.15], [r + 0.35, 0.5], [r, 0.65]], 14); }
    // buttress ribs: four tapering stone ribs climbing to the balcony
    mat(c, BLK, 'oklch(0.68 0.02 70)', 0.93);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
      for (let s = 0; s < 4; s++) { const y0 = 1.2 + s * (bal - 1.2) / 4, y1 = 1.2 + (s + 1) * (bal - 1.2) / 4, r0 = rAt(y0), w = 1.0 - s * 0.18;
        box(c, ca * (r0 + w * 0.35), y0, sa * (r0 + w * 0.35), 0.9 - s * 0.12, y1 - y0, w + 0.2); } } }
  // the head: a corbelled machicolation ring under the hat
  mat(c, BLK, 'oklch(0.66 0.02 70)', 0.9); lathe(c, [0, H, 0], [[3.5, 0], [4.7, 0.7], [4.7, 1.5], [3.7, 1.7]], 14);
  if (L < 3) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; box(c, Math.cos(a) * 4.1, H - 0.6, Math.sin(a) * 4.1, 0.45, 0.75, 0.45); }
  // the hat: painted slate, a gilt band at its brim, a second band mid-way
  mat(c, SLATE, 'oklch(0.55 0.13 295)', 0.75);
  lathe(c, [0.3, 21.6 + up, 0.2], [[5.0, 0], [3.4, 2.4], [2.0, 5], [1.0, 7.4], [0.5, 9.2], [0.2, 10.4], [0, 11]], 14);
  mat(c, null, 'oklch(0.74 0.12 85)', 0.35, 0.8); lathe(c, [0.3, 21.5 + up, 0.2], [[5.15, 0], [5.15, 0.35], [4.9, 0.45]], 14);
  lathe(c, [0.3, 21.6 + up + 4.8, 0.2], [[2.15, 0], [2.15, 0.25], [2.0, 0.3]], 14);
  glow(c, 'oklch(0.85 0.12 95)'); for (let i = 0; i < 9; i++) { const a = i * 2.4, y = 22 + (i * 1.1) % 8, r = 4.45 - (y - 21.6) * 0.42; box(c, Math.cos(a) * r, y + up, Math.sin(a) * r, 0.22, 0.22, 0.22); }
  // windows spiral up the shaft: glowing glass in a carved stone frame, sill and pointed lintel
  const nw = Math.round(7 * t);
  for (let i = 0; i < nw; i++) { const a = i * 1.7 + 0.3, y = 3 + i * 2.4, r = rAt(y) + 0.02, ca = Math.cos(a), sa = Math.sin(a), yaw = -a + Math.PI / 2;
    glow(c, i % 2 ? 'oklch(0.75 0.15 300)' : 'oklch(0.86 0.13 80)'); box(c, ca * r, y, sa * r, 0.6, 1.4, 0.6);
    if (L < 3) { mat(c, BLK, 'oklch(0.66 0.02 70)', 0.9);
      const tx = -sa, tz = ca, o = r + 0.12;
      box(c, ca * o + tx * 0.48, y - 0.1, sa * o + tz * 0.48, 0.22, 1.7, 0.22); box(c, ca * o - tx * 0.48, y - 0.1, sa * o - tz * 0.48, 0.22, 1.7, 0.22);
      box(c, ca * (o + 0.05), y - 0.28, sa * (o + 0.05), 1.3, 0.2, 0.3); box(c, ca * o, y + 1.45, sa * o, 1.2, 0.3, 0.26); box(c, ca * o, y + 1.75, sa * o, 0.5, 0.25, 0.24); } }
  // the balcony: a stone ring on corbels with a wooden rail
  mat(c, BLK, 'oklch(0.7 0.02 70)', 0.9); lathe(c, [0, bal - 0.4, 0], [[rAt(bal), 0], [5.5, 0.4], [5.5, 0.65], [3.8, 0.65]], 14);
  if (L < 3) for (let i = 0; i < 14; i++) { const a = (i + 0.5) / 14 * Math.PI * 2; box(c, Math.cos(a) * (rAt(bal) + 0.45), bal - 1.3, Math.sin(a) * (rAt(bal) + 0.45), 0.4, 0.9, 0.4); }
  wood(c, DARKW); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; beam(c, [Math.cos(a) * 5.2, bal + 0.2, Math.sin(a) * 5.2], [Math.cos(a) * 5.2, bal + 1.2, Math.sin(a) * 5.2], 0.1, 0.1); }
  lathe(c, [0, bal + 1.15, 0], [[5.1, 0], [5.35, 0], [5.35, 0.14], [5.1, 0.14]], 14);
  // the door in a stepped stone portal
  if (L < 3) { mat(c, BLK, 'oklch(0.64 0.02 70)', 0.92); box(c, -1.25, 0, -4.55, 0.5, 3.3, 0.6); box(c, 1.25, 0, -4.55, 0.5, 3.3, 0.6); box(c, 0, 3.0, -4.6, 3.0, 0.55, 0.65); box(c, 0, -0.2, -5.0, 3.2, 0.22, 1.1); }
  door(c, 0, -4.4, 1.6, 2.8);
  glow(c, 'oklch(0.8 0.16 220)'); lathe(c, [0.6, 33.6 + up, 0.4], [[0, 0], [0.9, 1.2], [0, 3]], 6);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; glow(c, 'oklch(0.8 0.15 300)'); box(c, Math.cos(a) * 2.2 + 0.6, 34.4 + i * 0.4 + up, Math.sin(a) * 2.2 + 0.4, 0.4, 0.4, 0.4); }
  // a lean-to study with a telescope
  halfTimber(c, 3.4, 8.4, -2, 2, 0, 3.2, L); gable(c, 3.4, 8.4, -2, 2, 3.2, 1.6, 0.4, 'oklch(0.36 0.12 290)');
  mat(c, null, 'oklch(0.62 0.1 75)', 0.3, 0.9); cyl(c, [1.5, bal + 1.6, -3.4], [3.6, bal + 3.6, -5.4], 0.18, 0.28, 8);
}

// ---------- smithy: an open forge shed, stone hearth and chimney, anvils, a quench trough, racks of blades ----------
function smithy(c, col, L) {
  const W = 10, D = 7, H = 3.8;
  if (col) { box(c, 3, 0, 1.5, 3.6, 7, 3); box(c, -3.2, 0, 0, 3.6, H, 6); return; }
  stone(c, 0.8); box(c, 0, -0.4, 0, W + 1, 0.5, D + 1);
  wood(c, 'oklch(0.45 0.06 55)'); for (const x of [-W / 2, 0, W / 2]) for (const z of [-D / 2, D / 2]) box(c, x, 0, z, 0.35, H, 0.35);
  shingle(c, 'oklch(0.42 0.05 40)'); roof(c, [-W / 2 - 0.6, H - 0.2, -D / 2 - 0.8], [-W / 2 - 0.6, H + 2.2, 0], W + 1.2, 0.25); roof(c, [-W / 2 - 0.6, H - 0.2, D / 2 + 0.8], [-W / 2 - 0.6, H + 2.2, 0], W + 1.2, 0.25);
  // the hearth and chimney
  stone(c, 0.7); box(c, 3, 0, 1.5, 3.4, 1.1, 2.6); box(c, 3, 1.1, 2.4, 3.4, 1.4, 0.8); mat(c, TEX.soot, 'oklch(0.5 0.01 60)'); box(c, 3, 2.5, 2.1, 2.4, 1.2, 1.6); box(c, 3, 3.7, 2.1, 1.4, 4.6, 1.2);
  glow(c, 'oklch(0.72 0.19 45)'); box(c, 3, 1.1, 1.3, 2.2, 0.12, 1.6);
  // bellows, anvils, trough
  mat(c, TEX.hide, 'oklch(0.6 0.06 55)'); box(c, 5.1, 0.8, 1.4, 0.9, 0.4, 1.3);
  iron(c); for (const [x, z] of [[0.6, -0.6], [-1.6, 0.8]]) { box(c, x, 0.55, z, 0.95, 0.3, 0.36); box(c, x - 0.6, 0.65, z, 0.4, 0.12, 0.2); wood(c, DARKW); box(c, x, 0, z, 0.55, 0.55, 0.55); iron(c); }
  wood(c, DARKW); box(c, 0.8, 0, 2.6, 2, 0.6, 0.7); mat(c, null, 'oklch(0.45 0.05 230)', 0.2); box(c, 0.8, 0.55, 2.6, 1.8, 0.04, 0.5);
  // the weapon rack and a wall of tools, the side store
  wood(c); box(c, -4.5, 0, -2.6, 0.12, 1.7, 0.12); box(c, -2.2, 0, -2.6, 0.12, 1.7, 0.12); box(c, -3.35, 1.5, -2.6, 2.4, 0.1, 0.16);
  iron(c); for (let i = 0; i < 6; i++) beam(c, [-4.2 + i * 0.36, 0.1, -2.5], [-4.2 + i * 0.36, 1.45, -2.65], 0.07, 0.025);
  halfTimber(c, -5, -1.4, 0.2, 3.5, 0, H - 0.2, L);
  // ingots, a coal heap, a barrel
  mat(c, null, 'oklch(0.68 0.12 60)', 0.35, 0.9); for (let i = 0; i < 6; i++) box(c, -0.9 + (i % 3) * 0.32, 0.02 + Math.floor(i / 3) * 0.1, -3.1, 0.28, 0.1, 0.12);
  mat(c, null, 'oklch(0.2 0.01 60)', 1); lathe(c, [5.6, 0, -2], [[1.1, 0], [0.6, 0.6], [0, 0.85]], 7);
  wood(c, OAK); cyl(c, [-5.8, 0, -2.6], [-5.8, 1.1, -2.6], 0.45, 0.45, 10);
  mat(c, null, 'oklch(0.6 0.1 70)', 0.4, 0.8); box(c, 0, H + 0.2, -D / 2 - 0.9, 1.6, 0.9, 0.08); // the hanging sign
}

// ---------- tailor: a shopfront with a striped awning, cloth on drying lines, dye vats in every colour, a loom ----------
function tailor(c, col, L) {
  if (col) { box(c, 0, 0, 1, 8, 5, 6); return; }
  stone(c, 0.82); box(c, 0, -0.4, 1, 8.6, 0.5, 6.6);
  halfTimber(c, -4, 4, -2, 4, 0, 5, L); gable(c, -4, 4, -2, 4, 5, 2.4, 0.5, 'oklch(0.5 0.08 30)');
  windowsZ(c, -3, 3, -2.06, 1.2, 3, 1.4, 1.5);
  door(c, 2.8, -2, 1.3, 2.4);
  // awning stripes
  const AW = ['oklch(0.62 0.15 25)', 'oklch(0.93 0.03 90)'];
  for (let i = 0; i < 8; i++) { mat(c, null, AW[i % 2], 0.9); q(c, [-4 + i, 3.2, -2.1], [-3 + i, 3.2, -2.1], [-3 + i, 2.4, -4], [-4 + i, 2.4, -4], [0, 1, -0.4]); }
  wood(c, DARKW); for (const x of [-4, 4]) beam(c, [x, 0, -4], [x, 2.45, -4], 0.12, 0.12);
  // drying lines of cloth
  wood(c, DARKW); for (const z of [-7, -9.5]) { beam(c, [-5, 0, z], [-5, 2.6, z], 0.12, 0.12); beam(c, [5, 0, z], [5, 2.6, z], 0.12, 0.12); mat(c, null, 'oklch(0.85 0.02 80)', 1); beam(c, [-5, 2.5, z], [5, 2.5, z], 0.02, 0.02); }
  const CL = [15, 60, 95, 150, 205, 250, 300, 340];
  for (let i = 0; i < 8; i++) { const z = i < 4 ? -7 : -9.5, x = -4 + (i % 4) * 2.2, h = 1 + (i % 3) * 0.25; mat(c, null, `oklch(${0.55 + (i % 3) * 0.08} 0.13 ${CL[i]})`, 1); q(c, [x, 2.5, z], [x + 1.6, 2.5, z], [x + 1.6, 2.5 - h, z], [x, 2.5 - h, z], [0, 0, -1]); q(c, [x, 2.5, z], [x, 2.5 - h, z], [x + 1.6, 2.5 - h, z], [x + 1.6, 2.5, z], [0, 0, 1]); }
  // dye vats
  for (let i = 0; i < 4; i++) { const x = -5.6 + i * 1.5 + 11.2 * 0; wood(c, OAK); cyl(c, [x + 8.6, 0, 1 + i * 1.3 - 1.6], [x + 8.6, 0.8, 1 + i * 1.3 - 1.6], 0.55, 0.6, 10); mat(c, null, `oklch(0.5 0.16 ${[20, 140, 250, 300][i]})`, 0.2); cyl(c, [x + 8.6, 0.72, 1 + i * 1.3 - 1.6], [x + 8.6, 0.74, 1 + i * 1.3 - 1.6], 0.5, 0.5, 10); }
  // a loom on the porch
  wood(c, OAK); box(c, -2.5, 0, -3.2, 0.1, 1.5, 0.1); box(c, -0.9, 0, -3.2, 0.1, 1.5, 0.1); beam(c, [-2.5, 1.45, -3.2], [-0.9, 1.45, -3.2], 0.1, 0.1); beam(c, [-2.5, 0.7, -3.2], [-0.9, 0.7, -3.2], 0.1, 0.1);
  mat(c, null, 'oklch(0.6 0.12 250)', 1); q(c, [-2.4, 1.4, -3.2], [-1.0, 1.4, -3.2], [-1.0, 0.75, -3.2], [-2.4, 0.75, -3.2], [0, 0, -1]);
  mat(c, null, 'oklch(0.6 0.1 70)', 0.4, 0.8); box(c, 0, 3.8, -4.1, 1.4, 0.8, 0.08);
}

// ---------- the guild hall: a big two-storey half-timbered market hall with an open arcade below ----------
function hall(c, col, L) {
  const W = 20, D = 11;
  if (col) { box(c, 0, 0, 0, W, 9, D); return; }
  stone(c, 0.84); box(c, 0, -0.5, 0, W + 1, 0.6, D + 1);
  stone(c, 0.9); for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 5) for (const z of [-D / 2, D / 2]) box(c, x, 0, z, 0.8, 4, 0.8);
  stone(c, 0.88); box(c, 0, 0, 1.5, W - 2, 4, D - 5);
  halfTimber(c, -W / 2 - 0.4, W / 2 + 0.4, -D / 2 - 0.4, D / 2 + 0.4, 4, 4.6, L);
  windowsZ(c, -W / 2 + 1, W / 2 - 1, -D / 2 - 0.47, 5.4, 6, 1.2, 1.8);
  windowsZ(c, -W / 2 + 1, W / 2 - 1, D / 2 + 0.47, 5.4, 6, 1.2, 1.8);
  gable(c, -W / 2 - 0.4, W / 2 + 0.4, -D / 2 - 0.4, D / 2 + 0.4, 8.6, 4.2, 0.7, 'oklch(0.5 0.08 35)');
  // a cupola with a weathervane, dormers
  wood(c); box(c, 0, 12.6, 0, 2.2, 1.8, 2.2); glow(c, 'oklch(0.85 0.1 75)'); box(c, 0, 13, -1.12, 1.2, 0.9, 0.06);
  shingle(c, 'oklch(0.5 0.08 35)'); lathe(c, [0, 14.4, 0], [[1.8, 0], [0, 1.8]], 4, { phase: Math.PI / 4 });
  iron(c); beam(c, [0, 16.2, 0], [0, 17.4, 0], 0.05, 0.05); beam(c, [-0.6, 17.2, 0], [0.6, 17.2, 0], 0.04, 0.3);
  // market goods under the arcade
  for (let i = 0; i < 4; i++) { const x = -7.5 + i * 5; wood(c); box(c, x, 0, -3.6, 2.6, 0.9, 1); mat(c, null, `oklch(0.66 0.12 ${[30, 90, 130, 60][i]})`, 0.9); for (let k = 0; k < 5; k++) box(c, x - 1 + k * 0.5, 0.9, -3.6, 0.35, 0.25, 0.6); }
  mat(c, null, 'oklch(0.55 0.13 25)', 0.9); for (const x of [-6, 0, 6]) q(c, [x - 0.9, 8.2, -D / 2 - 0.5], [x + 0.9, 8.2, -D / 2 - 0.5], [x + 0.9, 5, -D / 2 - 0.5], [x - 0.9, 5, -D / 2 - 0.5], [0, 0, -1]); // banners
}

// ---------- the mother oak: a vast spreading oak, roots heaving out of a raised earth ring, benches and lanterns under it ----------
function oak(c, col, L) {
  if (col) { cyl(c, [0, 0, 0], [0, 9, 0], 3.2, 2.4, 10); return; }
  const r = mulberry(1977), bark = () => mat(c, TEX.bark, 'oklch(0.62 0.04 60)'), RG = c.params?.ring ?? 16;
  // the earth ring and a low stone kerb with a gap toward the village (-Z)
  mat(c, TEX.turf, 'oklch(0.8 0.06 125)'); lathe(c, [0, -0.4, 0], [[RG, 0], [RG - 1, 0.55], [3.5, 0.75]], 28);
  stone(c, 0.82); for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; if (Math.abs(((a + Math.PI / 2) % (Math.PI * 2)) - Math.PI) < 0.35) continue; box(c, Math.cos(a) * (RG - 0.4), -0.3, Math.sin(a) * (RG - 0.4), RG * 0.22, 0.75, 0.7, -a * 180 / Math.PI + 90); }
  bark();
  lathe(c, [0, 0, 0], [[4.4, 0], [3.4, 1.2], [2.7, 3], [2.4, 6], [2.6, 8.5], [2.0, 10]], 14, { jitter: 0.12 });
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + r() * 0.3, l = 5 + r() * 3; cyl(c, [Math.cos(a) * 2, 0.9, Math.sin(a) * 2], [Math.cos(a) * l, -0.2, Math.sin(a) * l], 0.9, 0.25, 6); }
  const tips = [];
  for (let i = 0; i < 7; i++) { // great limbs, each forking once
    const a = i / 7 * Math.PI * 2 + r() * 0.4, y0 = 7 + r() * 2.5, el = 0.35 + r() * 0.35, len = 9 + r() * 4;
    const p0 = [Math.cos(a) * 1.4, y0, Math.sin(a) * 1.4], p1 = [Math.cos(a) * len * 0.75, y0 + len * el, Math.sin(a) * len * 0.75];
    cyl(c, p0, p1, 1.2, 0.6, 8);
    for (const da of [-0.5, 0.45]) { const b = a + da, p2 = [p1[0] + Math.cos(b) * 5, p1[1] + 2 + r() * 2.5, p1[2] + Math.sin(b) * 5]; cyl(c, p1, p2, 0.6, 0.25, 6); tips.push(p2); }
    tips.push(p1);
  }
  tips.push([0, 19, 0], [2, 21, -1], [-2, 20, 2]);
  // the crown: clustered leaf masses, autumn gold creeping into the green
  const leaf = ['oklch(0.55 0.12 135)', 'oklch(0.6 0.13 125)', 'oklch(0.66 0.14 105)', 'oklch(0.7 0.15 85)'];
  for (let i = 0; i < tips.length; i++) { const t = tips[i], s = 3.8 + r() * 2.4; mat(c, null, leaf[i % 4], 0.85); lathe(c, [t[0], t[1] - s * 0.55, t[2]], [[0.1, 0], [s * 0.85, s * 0.35], [s, s * 0.75], [s * 0.7, s * 1.2], [0, s * 1.45]], L >= 3 ? 6 : 9, { phase: r() * 3, jitter: 0.2 }); }
  // a ring bench around the trunk and lanterns hung from the limbs
  wood(c); for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2, R = 6.2; q(c, [Math.cos(a0) * R, 0.75, Math.sin(a0) * R], [Math.cos(a1) * R, 0.75, Math.sin(a1) * R], [Math.cos(a1) * (R + 0.6), 0.75, Math.sin(a1) * (R + 0.6)], [Math.cos(a0) * (R + 0.6), 0.75, Math.sin(a0) * (R + 0.6)], [0, 1, 0]); box(c, Math.cos(a0) * (R + 0.3), 0.3, Math.sin(a0) * (R + 0.3), 0.3, 0.45, 0.3); }
  for (let i = 0; i < 8; i++) { const t = tips[i * 2 % tips.length], x = t[0] * 0.7, z = t[2] * 0.7, y = Math.max(4.5, t[1] * 0.55); mat(c, null, 'oklch(0.3 0.01 60)', 0.8); beam(c, [x, y + 1.4, z], [x, y + 0.4, z], 0.03, 0.03); glow(c, 'oklch(0.86 0.14 70)'); box(c, x, y, z, 0.35, 0.45, 0.35); }
  // ribbons tied to the lowest limb: wishes
  for (let i = 0; i < 10; i++) { const a = i * 0.63, x = Math.cos(a) * 5, z = Math.sin(a) * 5; mat(c, null, `oklch(0.65 0.15 ${i * 36})`, 1); q(c, [x, 7.5, z], [x + 0.12, 7.5, z], [x + 0.12, 6.2 - (i % 3) * 0.3, z], [x, 6.2 - (i % 3) * 0.3, z], [Math.cos(a), 0, Math.sin(a)]); }
}
function well(c, col, L) { // Thistledown's village well: a fieldstone drum, two posts, a little shingle roof, the windlass and its bucket
  if (col) { cyl(c, [0, 0, 0], [0, 1.0, 0], 1.35, 1.35, 10); return; }
  stone(c, 0.8); lathe(c, [0, 0, 0], [[1.45, 0], [1.4, 0.9], [1.5, 0.95], [1.5, 1.08], [1.1, 1.08], [1.05, 0.2]], 14, { jitter: 0.05 });
  mat(c, null, 'oklch(0.32 0.05 220)', 0.2); lathe(c, [0, 0.55, 0], [[0.01, 0], [1.05, 0]], 14);
  wood(c, DARKW); for (const x of [-1.25, 1.25]) beam(c, [x, 0.9, 0], [x, 2.6, 0], 0.18, 0.18);
  beam(c, [-1.4, 2.0, 0], [1.4, 2.0, 0], 0.14, 0.14); wood(c); cyl(c, [-1.1, 2.0, 0], [1.1, 2.0, 0], 0.16, 0.16, 8);
  beam(c, [1.4, 2.0, 0], [1.4, 1.65, 0.3], 0.06, 0.06);
  mat(c, null, 'oklch(0.75 0.05 80)', 1); beam(c, [0.2, 2.0, 0], [0.2, 1.25, 0], 0.03, 0.03);
  wood(c, 'oklch(0.48 0.06 55)'); cyl(c, [0.2, 0.95, 0], [0.2, 1.25, 0], 0.18, 0.2, 8);
  gable(c, -1.6, 1.6, -1.0, 1.0, 2.6, 0.9, 0.25, 'oklch(0.52 0.07 45)');
  mat(c, TEX.turf, 'oklch(0.7 0.06 120)'); for (let i = 0; i < 6; i++) { const a = i * 1.05; box(c, Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6, 0.3, 0.12, 0.3, a * 57); }
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const KINDS = { church, watch, wizard, smithy, tailor, hall, oak, well };
function build(c, col) { const k = KINDS[c.params?.kind] ?? hall; k(c, col, lodLevel(c)); }
export function geometry(ctx) { build(ctx, false); }
export function collider(ctx) { build(ctx, true); }
