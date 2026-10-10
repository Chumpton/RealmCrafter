// A small farm chicken for the starter pens (S12): plump body, small head with beak, comb and wattle, fanned tail, thin legs. Faces -Z.
// params.coat: white | brown. Origin at the feet; about 0.45 m tall.
import { frame, cyl, lathe, box } from './yard-kit.js';
import { loft, flap, eyes } from './herd-kit.js';
const COATS = { white: ['oklch(0.93 0.01 85)', 'oklch(0.78 0.02 80)'], brown: ['oklch(0.55 0.09 55)', 'oklch(0.36 0.06 50)'] };
export function geometry(ctx) {
  frame(); const L = ctx.lod, [body, dark] = COATS[ctx.params.coat] || COATS.white, seg = L <= 1 ? 8 : L <= 3 ? 6 : 4;
  ctx.albedo(null); ctx.roughness(0.95); ctx.metalness(0); ctx.flat();
  ctx.color(body);
  loft(ctx, [[0, 0.24, -0.16, 0.05, 0.06], [0, 0.26, -0.08, 0.12, 0.13], [0, 0.26, 0.06, 0.15, 0.15], [0, 0.28, 0.2, 0.12, 0.13], [0, 0.33, 0.3, 0.05, 0.07]], seg); // body
  lathe(ctx, [0, 0, -0.18], [[0, 0.3], [0.05, 0.33], [0.06, 0.4], [0.05, 0.46], [0, 0.48]], seg); // neck and head
  ctx.color('oklch(0.8 0.14 75)'); flap(ctx, [0, 0.42, -0.23], [0, 0.4, -0.31], [0, 0.38, -0.23], [1, 0, 0]); // beak
  ctx.color('oklch(0.55 0.2 25)'); flap(ctx, [0, 0.49, -0.2], [0, 0.55, -0.17], [0, 0.48, -0.13], [1, 0, 0]); // comb
  if (L <= 3) { flap(ctx, [0, 0.38, -0.24], [0, 0.33, -0.23], [0, 0.37, -0.2], [1, 0, 0]); eyes(ctx, 0.05, 0.43, -0.2, 0.012); } // wattle, eyes
  ctx.color(dark);
  for (const s of [-1, 1]) flap(ctx, [s * 0.14, 0.3, -0.05], [s * 0.17, 0.26, 0.12], [s * 0.1, 0.22, 0.2], [s, 0.4, 0]); // wings
  for (const x of [-0.07, 0.07, 0, 0.03]) flap(ctx, [0, 0.3, 0.26], [x * 2, 0.5 + Math.abs(x), 0.4], [x * 1.5, 0.3, 0.3], [1, 0, 0]); // tail fan
  ctx.color('oklch(0.75 0.13 80)');
  for (const x of [-0.05, 0.05]) { cyl(ctx, [x, 0.17, 0.02], [x, 0.01, 0.02], 0.012, 0.01, 4); for (const dz of [-0.05, 0, 0.03]) cyl(ctx, [x, 0.01, 0.02], [x * 1.4, 0, 0.02 + dz - 0.03], 0.008, 0.006, 3); }
}
export function collider(ctx) { frame(); box(ctx, 0, 0, 0.05, 0.36, 0.5, 0.55, 0, { bottom: true }); frame(); }
