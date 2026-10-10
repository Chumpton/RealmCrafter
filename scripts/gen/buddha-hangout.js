// The hangout under the Buddha's mother tree (creator ask 2026-10-09). One file, one piece per params.item:
// 'bench' (carved backed bench, seat 0.45 m, faces −Z), 'log' (a split-log seat), 'firepit' (a ring of limestone round a
// bed of ash), 'blanket', 'cup', 'basket', 'cushion', 'lantern' (origin at the hook, hangs down 1.35 m), 'stone' (a stepping stone).
import { tube, ell, box, lathe, qd } from './lore-kit.js';
const WOOD = 'cdn/texture-weathered-split-log-oak.png', STONE = 'cdn/texture-weathered-grey-limestone.png', MOSS = 'cdn/texture-soft-green-moss.png';
function bench(ctx, L) {
  const w = 1.8;
  ctx.albedo(WOOD); ctx.roughness(0.9); ctx.flat();
  ctx.color('oklch(0.8 0.06 60)');
  // seat: three planks with gaps, a rounded front lip
  for (let i = 0; i < 3; i++) { const z0 = -0.24 + i * 0.165; box(ctx, -w / 2, 0.39, z0, w / 2, 0.45, z0 + 0.15); }
  // legs: four chunky carved posts, the back pair running up into the back frame
  ctx.color('oklch(0.68 0.06 55)');
  for (const x of [-w / 2 + 0.08, w / 2 - 0.22]) {
    box(ctx, x, 0, -0.24, x + 0.14, 0.39, -0.12);
    tube(ctx, [{ p: [x + 0.07, 0, 0.2], rx: 0.07, ry: 0.07 }, { p: [x + 0.07, 0.45, 0.22], rx: 0.07, ry: 0.07 }, { p: [x + 0.07, 0.98, 0.32], rx: 0.065, ry: 0.065 }], L <= 2 ? 6 : 4);
    box(ctx, x, 0.3, -0.22, x + 0.14, 0.39, 0.22); // side rail under the seat
    if (L <= 2) box(ctx, x + 0.01, 0.6, -0.2, x + 0.13, 0.66, 0.2), box(ctx, x + 0.02, 0.45, -0.2, x + 0.12, 0.6, -0.14); // armrest and its post
  }
  // the back: a top rail and three carved slats
  ctx.color('oklch(0.74 0.06 58)');
  const back = (y0, y1, z0, z1, x0, x1) => qd(ctx, [x0, y0, z0], [x1, y0, z0], [x1, y1, z1], [x0, y1, z1], [0, 0.25, -1]);
  box(ctx, -w / 2 + 0.05, 0.86, 0.26, w / 2 - 0.05, 0.98, 0.34);
  for (let i = 0; i < 3; i++) { const x = -0.6 + i * 0.6; box(ctx, x - 0.18, 0.5, 0.24, x + 0.18, 0.86, 0.29); }
  if (L <= 2) { ctx.color('oklch(0.6 0.08 50)'); box(ctx, -w / 2 + 0.05, 0.98, 0.28, w / 2 - 0.05, 1.01, 0.33); } // darker cap edge
  if (L <= 3) { ctx.albedo(MOSS); ctx.color('oklch(0.72 0.12 130)'); box(ctx, w / 2 - 0.5, 0.98, 0.27, w / 2 - 0.08, 1.02, 0.33); }
}
function log(ctx, L) {
  ctx.albedo(WOOD); ctx.color('oklch(0.74 0.05 60)'); ctx.roughness(0.95); ctx.flat();
  // a half log on its round, flat face up at 0.45
  const seg = L <= 2 ? 10 : 6, r = 0.3, hw = 0.95;
  for (let s = 0; s < seg; s++) {
    const a0 = Math.PI + (s / seg) * Math.PI, a1 = Math.PI + ((s + 1) / seg) * Math.PI;
    const P = (x, a) => [x, 0.45 + Math.sin(a) * r * 1.5, Math.cos(a) * r];
    qd(ctx, P(-hw, a0), P(hw, a0), P(hw, a1), P(-hw, a1), [0, Math.sin((a0 + a1) / 2), Math.cos((a0 + a1) / 2)]);
    qd(ctx, [-hw, 0.45, 0], P(-hw, a0), P(-hw, a1), [-hw, 0.45, 0], [-1, 0, 0]);
    qd(ctx, [hw, 0.45, 0], P(hw, a0), P(hw, a1), [hw, 0.45, 0], [1, 0, 0]);
  }
  ctx.color('oklch(0.86 0.05 70)'); box(ctx, -hw, 0.44, -r, hw, 0.46, r);
  ctx.albedo(STONE); ctx.color('oklch(0.8 0.01 90)'); for (const x of [-0.6, 0.6]) box(ctx, x - 0.18, 0, -0.2, x + 0.18, 0.06, 0.2);
}
function firepit(ctx, L, rnd) {
  ctx.albedo(STONE); ctx.flat(); ctx.roughness(0.95);
  const n = L <= 2 ? 11 : 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, R = 0.62, s = 0.17 + rnd() * 0.05, h = 0.2 + rnd() * 0.1;
    ctx.color(`oklch(${0.72 + rnd() * 0.1} 0.012 ${80 + rnd() * 30})`); ctx.smooth();
    ell(ctx, [Math.cos(a) * R, h * 0.4, Math.sin(a) * R], [s * 1.2, h * 0.75, s], L <= 2 ? 7 : 5, L <= 2 ? 4 : 3); ctx.flat();
  }
  ctx.albedo(null); ctx.color('oklch(0.3 0.01 60)'); ctx.roughness(1);
  lathe(ctx, 0, 0, 0, [[0, 0.02], [0.55, 0.02], [0.5, 0.06], [0, 0.07]], 12); // ash bed
  ctx.color('oklch(0.42 0.06 50)');
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; tube(ctx, [{ p: [Math.cos(a) * 0.42, 0.08, Math.sin(a) * 0.42], rx: 0.055, ry: 0.055 }, { p: [Math.cos(a) * 0.05, 0.3, Math.sin(a) * 0.05], rx: 0.045, ry: 0.045 }], 5); }
  ctx.emissive(2.2, 0.7, 0.15); ctx.color('oklch(0.6 0.18 40)');
  for (let i = 0; i < 6; i++) { const a = rnd() * 6.28, r = rnd() * 0.3; ell(ctx, [Math.cos(a) * r, 0.08, Math.sin(a) * r], [0.07, 0.035, 0.06], 5, 3); }
  ctx.emissive(null);
}
function blanket(ctx, L, rnd) {
  ctx.albedo(null); ctx.flat(); ctx.roughness(1);
  const W = 1.7, D = 1.3, cells = 6;
  for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
    const x0 = -W / 2 + (i * W) / cells, x1 = x0 + W / cells, z0 = -D / 2 + (j * D) / cells, z1 = z0 + D / cells;
    const c = (i + j) % 2 ? 'oklch(0.94 0.03 85)' : (i % 2 ? 'oklch(0.58 0.17 28)' : 'oklch(0.66 0.15 32)');
    ctx.color(c);
    const y = (x, z) => 0.025 + 0.012 * Math.sin(x * 7 + z * 5);
    qd(ctx, [x0, y(x0, z0), z0], [x1, y(x1, z0), z0], [x1, y(x1, z1), z1], [x0, y(x0, z1), z1], [0, 1, 0]);
  }
  ctx.color('oklch(0.55 0.15 28)'); // folded hem sides
  qd(ctx, [-W / 2, 0, -D / 2], [W / 2, 0, -D / 2], [W / 2, 0.03, -D / 2], [-W / 2, 0.03, -D / 2], [0, 0, -1]);
  qd(ctx, [-W / 2, 0, D / 2], [W / 2, 0, D / 2], [W / 2, 0.03, D / 2], [-W / 2, 0.03, D / 2], [0, 0, 1]);
  qd(ctx, [-W / 2, 0, -D / 2], [-W / 2, 0, D / 2], [-W / 2, 0.03, D / 2], [-W / 2, 0.03, -D / 2], [-1, 0, 0]);
  qd(ctx, [W / 2, 0, -D / 2], [W / 2, 0, D / 2], [W / 2, 0.03, D / 2], [W / 2, 0.03, -D / 2], [1, 0, 0]);
}
function cup(ctx, L) {
  ctx.albedo(null); ctx.smooth(); ctx.roughness(0.4); ctx.color('oklch(0.72 0.1 220)');
  lathe(ctx, 0, 0, 0, [[0, 0], [0.04, 0], [0.048, 0.06], [0.05, 0.1], [0.042, 0.1], [0.04, 0.03], [0, 0.03]], 12);
  ctx.color('oklch(0.4 0.06 60)'); lathe(ctx, 0, 0, 0, [[0, 0.075], [0.044, 0.075], [0, 0.076]], 10); // tea
  ctx.color('oklch(0.72 0.1 220)'); tube(ctx, [{ p: [0.045, 0.08, 0], rx: 0.008, ry: 0.008 }, { p: [0.075, 0.06, 0], rx: 0.008, ry: 0.008 }, { p: [0.047, 0.03, 0], rx: 0.008, ry: 0.008 }], 5);
}
function basket(ctx, L) {
  ctx.albedo(null); ctx.flat(); ctx.roughness(1);
  for (let b = 0; b < 4; b++) { ctx.color(b % 2 ? 'oklch(0.72 0.09 72)' : 'oklch(0.64 0.09 66)'); const y0 = b * 0.055; box(ctx, -0.24 - b * 0.006, y0, -0.16 - b * 0.006, 0.24 + b * 0.006, y0 + 0.055, 0.16 + b * 0.006); }
  ctx.color('oklch(0.93 0.03 90)'); box(ctx, -0.2, 0.2, -0.13, 0.2, 0.24, 0.13); // a cloth tucked in
  ctx.color('oklch(0.6 0.17 30)'); ell(ctx, [0.09, 0.26, 0.02], [0.05, 0.05, 0.05], 7, 4); ell(ctx, [-0.05, 0.255, -0.04], [0.048, 0.045, 0.048], 7, 4);
  ctx.color('oklch(0.64 0.09 66)'); ctx.smooth();
  const pts = []; for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI; pts.push({ p: [-Math.cos(a) * 0.2, 0.22 + Math.sin(a) * 0.2, 0], rx: 0.014, ry: 0.014 }); }
  tube(ctx, pts, 5);
}
function cushion(ctx, L, p) {
  ctx.albedo(null); ctx.smooth(); ctx.roughness(1); ctx.color(p.color || 'oklch(0.62 0.13 300)');
  ell(ctx, [0, 0.07, 0], [0.24, 0.07, 0.24], 12, 6);
  ctx.color('oklch(0.85 0.12 85)'); ell(ctx, [0, 0.135, 0], [0.03, 0.012, 0.03], 6, 3);
}
function lantern(ctx, L) {
  ctx.albedo(null); ctx.flat(); ctx.metalness(0.6); ctx.roughness(0.45); ctx.color('oklch(0.42 0.04 60)');
  for (let i = 0; i < 7; i++) { const y = -0.12 * i - 0.05; tube(ctx, [{ p: [0, y, 0], rx: 0.012, ry: 0.035 }, { p: [0, y - 0.1, 0], rx: 0.012, ry: 0.035 }], 4); } // chain
  ctx.color('oklch(0.5 0.06 65)');
  lathe(ctx, 0, -1.4, 0, [[0, 0], [0.13, 0], [0.13, 0.04], [0, 0.04]], 6, Math.PI / 6);
  lathe(ctx, 0, -1.4, 0, [[0.0, 0.36], [0.17, 0.33], [0.06, 0.45], [0.03, 0.5], [0, 0.5]], 6, Math.PI / 6); // hood
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; tube(ctx, [{ p: [Math.cos(a) * 0.12, -1.36, Math.sin(a) * 0.12], rx: 0.012, ry: 0.012 }, { p: [Math.cos(a) * 0.13, -1.06, Math.sin(a) * 0.13], rx: 0.012, ry: 0.012 }], 4); }
  ctx.metalness(0); ctx.roughness(0.2); ctx.color('oklch(0.95 0.1 80)'); ctx.emissive(3.4, 2.1, 0.75);
  lathe(ctx, 0, -1.36, 0, [[0, 0], [0.11, 0], [0.11, 0.3], [0, 0.3]], 6, Math.PI / 6); // the glowing pane
  ctx.emissive(null);
}
function stone(ctx, L, rnd) {
  ctx.albedo(STONE); ctx.flat(); ctx.roughness(0.95); ctx.color(`oklch(${0.78 + rnd() * 0.08} 0.012 ${70 + rnd() * 40})`);
  const n = 7, prof = [];
  const R = [], rx = 0.32 + rnd() * 0.1, rz = 0.26 + rnd() * 0.08;
  for (let i = 0; i < n; i++) R.push(0.85 + rnd() * 0.3);
  // a low irregular slab: top polygon, sloped sides
  const top = [], bot = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; top.push([Math.cos(a) * rx * R[i] * 0.88, 0.07, Math.sin(a) * rz * R[i] * 0.88]); bot.push([Math.cos(a) * rx * R[i], -0.05, Math.sin(a) * rz * R[i]]); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; qd(ctx, bot[i], bot[j], top[j], top[i], [top[i][0] + top[j][0], 0.3, top[i][2] + top[j][2]]); ctx.tri(0, 0.08, 0, ...top[j], ...top[i]); }
  if (L <= 2 && rnd() < 0.6) { ctx.albedo(MOSS); ctx.color('oklch(0.72 0.12 130)'); const t = top[0]; box(ctx, t[0] * 0.9 - 0.06, 0.06, t[2] - 0.05, t[0] * 0.9 + 0.04, 0.085, t[2] + 0.06); }
}
export function geometry(ctx) {
  const L = ctx.lod ?? 1, p = ctx.params || {}, rnd = () => ctx.random();
  const f = { bench, log, firepit, blanket, cup, basket, lantern, stone }[p.item];
  if (p.item === 'cushion') return cushion(ctx, L, p);
  return (f || bench)(ctx, L, rnd);
}
export function collider(ctx) {
  const p = ctx.params || {};
  if (p.item === 'bench') { box(ctx, -0.9, 0, -0.25, 0.9, 0.45, 0.22); box(ctx, -0.9, 0.45, 0.22, 0.9, 1.0, 0.35); return; }
  if (p.item === 'log') { box(ctx, -0.95, 0, -0.3, 0.95, 0.45, 0.3); return; }
  if (p.item === 'firepit') { box(ctx, -0.8, 0, -0.8, 0.8, 0.22, 0.8); return; }
  return null;
}
