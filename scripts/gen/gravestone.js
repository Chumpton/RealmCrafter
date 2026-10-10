// A small gravestone (S15): a rounded stone slab on a low plinth with a cross cut in it and a mound of earth in front.
import { TEX, frame, box, cyl, tri } from './yard-kit.js';
const stone = (c, t = 'oklch(0.78 0.01 250)') => { c.albedo(TEX.granite); c.color(t); c.roughness(0.9); c.metalness(0); };
export function geometry(ctx) {
  const c = ctx; frame(); c.flat(); stone(c, 'oklch(0.7 0.01 250)');
  box(c, 0, 0, 0, 0.9, 0.12, 0.45); box(c, 0, 0.12, 0.05, 0.7, 0.7, 0.14);
  tri(c, [-0.35, 0.82, -0.02], [0.35, 0.82, -0.02], [0, 1.1, -0.02], [0, 0, -1]); tri(c, [-0.35, 0.82, 0.12], [0.35, 0.82, 0.12], [0, 1.1, 0.12], [0, 0, 1]);
  stone(c, 'oklch(0.5 0.01 250)'); box(c, 0, 0.5, -0.03, 0.06, 0.4, 0.02); box(c, 0, 0.62, -0.03, 0.26, 0.06, 0.02); // the cross
  c.albedo(TEX.earth); c.color('oklch(0.55 0.05 60)'); box(c, 0, 0, -0.6, 0.7, 0.14, 1.0); // the mound
}
export function collider(ctx) { frame(); box(ctx, 0, 0, 0, 0.9, 1.1, 0.5, 0, { bottom: true }); frame(); }
