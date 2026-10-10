// Creature helpers for the Proving Void's monsters (draugr, frost wolf, troll), on top of yard-kit's oriented emit.
import { q, tri } from './yard-kit.js';
const TAU = Math.PI * 2;
// a vertical loft: rings [cx, cy, cz, rx, rz] in rising y order, closed ends; jit roughens the radius per vertex
export function vloft(ctx, rings, seg, jit = 0) {
  const P = rings.map(([cx, cy, cz, rx, rz]) => { const a = []; for (let i = 0; i < seg; i++) { const g = i / seg * TAU, k = jit ? 1 + (ctx.random() - .5) * jit : 1; a.push([cx + Math.sin(g) * rx * k, cy, cz + Math.cos(g) * rz * k]); } return a; });
  for (let k = 0; k < P.length - 1; k++) for (let i = 0; i < seg; i++) { const j = (i + 1) % seg, g = (i + .5) / seg * TAU; q(ctx, P[k][i], P[k][j], P[k + 1][j], P[k + 1][i], [Math.sin(g), 0, Math.cos(g)]); }
  const f = P[0], b = P[P.length - 1];
  for (let i = 1; i < seg - 1; i++) { tri(ctx, f[0], f[i], f[i + 1], [0, -1, 0]); tri(ctx, b[0], b[i], b[i + 1], [0, 1, 0]); }
}
// a jagged spike from a base centre along dir (ice crystal, horn, tusk)
export function spike(ctx, base, dir, r, seg = 4) {
  const tip = [base[0] + dir[0], base[1] + dir[1], base[2] + dir[2]], ring = [];
  const n = Math.hypot(...dir), u = dir.map((v) => v / n);
  const ax = Math.abs(u[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
  const s = [u[1] * ax[2] - u[2] * ax[1], u[2] * ax[0] - u[0] * ax[2], u[0] * ax[1] - u[1] * ax[0]], sl = Math.hypot(...s); for (let i = 0; i < 3; i++) s[i] /= sl;
  const t = [u[1] * s[2] - u[2] * s[1], u[2] * s[0] - u[0] * s[2], u[0] * s[1] - u[1] * s[0]];
  for (let i = 0; i < seg; i++) { const g = i / seg * TAU; ring.push([0, 1, 2].map((k) => base[k] + (s[k] * Math.cos(g) + t[k] * Math.sin(g)) * r)); }
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg, g = (i + .5) / seg * TAU; tri(ctx, ring[i], ring[j], tip, [0, 1, 2].map((k) => s[k] * Math.cos(g) + t[k] * Math.sin(g) + u[k] * .3)); }
}
export const glowEyes = (ctx, x, y, z, r, hdr) => { ctx.emissive(...hdr); ctx.color('oklch(0.95 0.05 230)'); for (const k of [-1, 1]) tri(ctx, [k * x - r, y + r * .5, z], [k * x + r, y + r * .5, z], [k * x, y - r * .6, z], [0, 0, -1]); ctx.emissive(null); };
// any convex 8-corner cell: v = 4 "bottom" corners then the 4 matching "top" corners; each face wound outward from the centre
const FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
export function hex(ctx, v, skip = -1) {
  const c = [0, 1, 2].map((k) => v.reduce((a, p) => a + p[k], 0) / 8);
  FACES.forEach((f, i) => { if (i === skip) return; const fc = [0, 1, 2].map((k) => (v[f[0]][k] + v[f[1]][k] + v[f[2]][k] + v[f[3]][k]) / 4); q(ctx, v[f[0]], v[f[1]], v[f[2]], v[f[3]], [fc[0] - c[0], fc[1] - c[1], fc[2] - c[2]]); });
}
// a vertical frustum: b / t = [cx, cy, cz, halfW, halfD]
export const frust = (ctx, b, t) => { const [x, y, z, w, d] = b, [X, Y, Z, W, D] = t; hex(ctx, [[x - w, y, z - d], [x + w, y, z - d], [x + w, y, z + d], [x - w, y, z + d], [X - W, Y, Z - D], [X + W, Y, Z - D], [X + W, Y, Z + D], [X - W, Y, Z + D]]); };
// a frustum along z: f / b = [cx, cy, cz, halfW, halfH]
export const zfr = (ctx, f, b) => { const [x, y, z, w, h] = f, [X, Y, Z, W, H] = b; hex(ctx, [[x - w, y - h, z], [x + w, y - h, z], [X + W, Y - H, Z], [X - W, Y - H, Z], [x - w, y + h, z], [x + w, y + h, z], [X + W, Y + H, Z], [X - W, Y + H, Z]]); };
export const bx = (ctx, x0, y0, z0, x1, y1, z1) => hex(ctx, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]);
// a disc along z (a round shield): centre c, radius r, half-thickness t
export function cylZ(ctx, c, r, t, seg) {
  const F = [], B = [];
  for (let i = 0; i < seg; i++) { const g = i / seg * TAU; F.push([c[0] + Math.cos(g) * r, c[1] + Math.sin(g) * r, c[2] - t]); B.push([c[0] + Math.cos(g) * r, c[1] + Math.sin(g) * r, c[2] + t]); }
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg, g = (i + .5) / seg * TAU; q(ctx, F[i], F[j], B[j], B[i], [Math.cos(g), Math.sin(g), 0]); }
  for (let i = 1; i < seg - 1; i++) { tri(ctx, F[0], F[i], F[i + 1], [0, 0, -1]); tri(ctx, B[0], B[i], B[i + 1], [0, 0, 1]); }
}
// a carved glowing stroke on a face of normal (0,0,nz) at depth z
export function stroke(ctx, x0, y0, x1, y1, w, z, nz = -1) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, px = -dy / l * w, py = dx / l * w;
  q(ctx, [x0 - px, y0 - py, z], [x1 - px, y1 - py, z], [x1 + px, y1 + py, z], [x0 + px, y0 + py, z], [0, 0, nz]);
}
const GLYPHS = [[[0, -1, 0, 1], [0, .2, -.5, 1], [0, .2, .5, 1]], [[0, -1, 0, 1], [0, 1, -.5, .4], [0, 1, .5, .4]], [[0, -1, 0, 1], [0, .3, .5, .8], [0, -.1, .5, .4]], [[0, -1, 0, 1], [0, 1, .5, .5], [.5, .5, 0, 0], [0, 0, .5, -.6]]];
export function rune(ctx, x, y, z, s, g, nz = -1, hdr = [1.1, 2.2, 3.6]) {
  ctx.emissive(...hdr); ctx.color('oklch(0.96 0.04 230)');
  for (const [a, b, c, d] of GLYPHS[g % GLYPHS.length]) stroke(ctx, x + a * s * .5, y + b * s, x + c * s * .5, y + d * s, .018 * s / .16, z, nz);
  ctx.emissive(null);
}
