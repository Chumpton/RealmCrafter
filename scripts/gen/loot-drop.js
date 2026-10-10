// A small thing lying on the ground (S13 loot): params { kind: bone|coins|hide|meat|feathers|rune|potion|box, color }. About 0.3 m, readable from a few metres.
import { TEX, frame, box, beam, cyl } from './yard-kit.js';
const mat = (c, tex, col, m = 0) => { c.albedo(tex); c.color(col); c.roughness(0.7); c.metalness(m); };
export function geometry(ctx) {
  const c = ctx, p = ctx.params || {}, col = p.color || '#c8c0a8'; frame(); c.flat();
  switch (p.kind) {
    case 'bone':
      mat(c, TEX.granite, 'oklch(0.93 0.02 90)'); beam(c, [-0.17, 0.05, -0.1], [0.17, 0.05, 0.1], 0.045, 0.045); beam(c, [-0.17, 0.09, 0.1], [0.17, 0.09, -0.1], 0.045, 0.045);
      for (const [x, z] of [[-0.17, -0.1], [0.17, 0.1], [-0.17, 0.1], [0.17, -0.1]]) cyl(c, [x, 0.03, z], [x, 0.1, z], 0.035, 0.035, 6); break;
    case 'coins':
      mat(c, TEX.soot, 'oklch(0.8 0.15 88)', 0.9); for (let k = 0; k < 5; k++) cyl(c, [0.03 * (k % 2), 0.02 + k * 0.022, 0.02 * k], [0.03 * (k % 2), 0.036 + k * 0.022, 0.02 * k], 0.08, 0.08, 9);
      cyl(c, [0.14, 0.01, -0.08], [0.14, 0.03, -0.08], 0.07, 0.07, 9); break;
    case 'hide':
      mat(c, TEX.hide, col); box(c, 0, 0.02, 0, 0.5, 0.05, 0.4); box(c, 0.06, 0.07, 0.04, 0.34, 0.04, 0.26); break;
    case 'meat':
      mat(c, TEX.hide, 'oklch(0.6 0.16 25)'); box(c, 0, 0.04, 0, 0.26, 0.14, 0.18); mat(c, TEX.granite, 'oklch(0.93 0.02 90)'); beam(c, [0.12, 0.1, 0], [0.3, 0.13, 0.04], 0.045, 0.045); break;
    case 'feathers':
      mat(c, TEX.weave, 'oklch(0.95 0.01 90)'); for (let k = 0; k < 4; k++) beam(c, [-0.12 + k * 0.07, 0.02, -0.12], [-0.08 + k * 0.08, 0.04 + k * 0.01, 0.14], 0.07, 0.012); break;
    case 'rune':
      mat(c, TEX.granite, col, 0.2); box(c, 0, 0.03, 0, 0.17, 0.17, 0.17); mat(c, TEX.soot, 'oklch(0.97 0.05 220)', 0); box(c, 0, 0.1, 0, 0.09, 0.02, 0.09); break;
    case 'potion':
      mat(c, TEX.granite, col, 0.1); cyl(c, [0, 0.0, 0], [0, 0.17, 0], 0.07, 0.07, 8); cyl(c, [0, 0.17, 0], [0, 0.26, 0], 0.03, 0.03, 8);
      mat(c, TEX.wood, 'oklch(0.6 0.06 60)'); cyl(c, [0, 0.26, 0], [0, 0.3, 0], 0.035, 0.035, 8); break;
    default:
      mat(c, TEX.wood, col); box(c, 0, 0, 0, 0.26, 0.2, 0.2); mat(c, TEX.granite, 'oklch(0.9 0.03 80)'); box(c, 0, 0.2, 0, 0.28, 0.03, 0.22);
  }
}
// the hitbox hugs each kind's own shape, so two drops side by side never claim each other's hover (creator 2026-10-05)
const HIT = { bone: [0.4, 0.15, 0.26], coins: [0.3, 0.14, 0.24], hide: [0.48, 0.1, 0.38], meat: [0.36, 0.16, 0.2], feathers: [0.3, 0.08, 0.28], rune: [0.18, 0.2, 0.18], potion: [0.15, 0.3, 0.15] };
export function collider(ctx) { const [w, h, d] = HIT[ctx.params?.kind] ?? [0.28, 0.23, 0.22]; frame(); box(ctx, 0, 0, 0, w, h, d, 0, { bottom: true }); frame(); }
