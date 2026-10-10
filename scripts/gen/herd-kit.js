// The herd's animal modelling helpers on top of yard-kit: lofted ellipse rings (wool lumps by jitter), flaps, eyes.
import { q, tri } from './yard-kit.js';
const TAU = Math.PI * 2;
// rings: [cx,cy,cz,rx,ry] in z order (either way); jit roughens the radius per vertex (wool, bristle); closed ends
export function loft(ctx, rings, seg, jit = 0) {
  const P = rings.map(([cx, cy, cz, rx, ry]) => { const a = []; for (let i = 0; i < seg; i++) { const g = i / seg * TAU, k = jit ? 1 + (ctx.random() - .5) * jit : 1; a.push([cx + Math.sin(g) * rx * k, cy + Math.cos(g) * ry * k, cz]); } return a; });
  for (let k = 0; k < P.length - 1; k++) for (let i = 0; i < seg; i++) { const j = (i + 1) % seg, g = (i + .5) / seg * TAU; q(ctx, P[k][i], P[k][j], P[k + 1][j], P[k + 1][i], [Math.sin(g), Math.cos(g), 0]); }
  const sg = Math.sign(rings[0][2] - rings[1][2]) || -1, f = P[0], b = P[P.length - 1];
  for (let i = 1; i < seg - 1; i++) { tri(ctx, f[0], f[i], f[i + 1], [0, 0, sg]); tri(ctx, b[0], b[i], b[i + 1], [0, 0, -sg]); }
}
export function flap(ctx, a, b, c, n) { tri(ctx, a, b, c, n); tri(ctx, a, b, c, [-n[0], -n[1], -n[2]]); } // an ear: both faces
export function eyes(ctx, x, y, z, s = .02) { // a dark triangle each side, facing out
  ctx.color('oklch(0.18 0.02 60)');
  for (const k of [-1, 1]) tri(ctx, [k * x, y + s, z], [k * x, y - s * .6, z - s * 1.2], [k * x, y - s * .6, z + s * 1.2], [k, 0, 0]);
}
