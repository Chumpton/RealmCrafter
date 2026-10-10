// Village life kit (Mellowbrook lived-in pass, 2026-10-05). params.kind:
//   line   : a clothesline between two posts, params.len (m, along +X), washing hung on it in linen colours
//   cord   : a split-log cord stacked against a wall, params.len, a chopping block with an axe beside it
//   trough : a hollowed log water trough on two trestles
//   hitch  : a hitching rail, two posts and a bar, params.len
//   stump  : a cut stump (params.r), a few chips; with params.log a felled log beside it
// Origin = feet, +X along, -Z = the front. Faces -Z.
import { TEX, frame, box, beam, cyl, lodLevel } from './yard-kit.js';
const wood = (c, t = 'oklch(0.72 0.05 62)') => { c.albedo(TEX.planks); c.color(t); c.roughness(0.92); c.metalness(0); };
const h = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const CLOTH = ['oklch(0.92 0.02 85)', 'oklch(0.7 0.08 30)', 'oklch(0.66 0.06 240)', 'oklch(0.82 0.06 95)', 'oklch(0.62 0.07 150)'];
const K = {
  line(c, p, L) {
    const len = p.len ?? 6, H = 2.3, s = p.seed ?? 1; wood(c, 'oklch(0.62 0.04 60)');
    for (const x of [0, len]) { cyl(c, [x, -0.2, 0], [x, H + 0.15, 0], 0.07, 0.06, 6); beam(c, [x, H, -0.25], [x, H, 0.25], 0.06, 0.06); }
    const n = 8, sag = 0.28, Y = (t) => H - 0.02 - sag * 4 * t * (1 - t);
    c.albedo(null); c.color('oklch(0.85 0.03 80)');
    for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n; beam(c, [a * len, Y(a), 0], [b * len, Y(b), 0], 0.02, 0.02); }
    if (L >= 4) return;
    const items = Math.max(2, Math.round(len / 1.1));
    for (let i = 0; i < items; i++) {
      const t = (i + 0.6) / (items + 0.2), w = 0.45 + h(i, s) * 0.4, d = 0.5 + h(i, s + 2) * 0.55, x = t * len, y = Y(t);
      c.albedo(TEX.linen ?? null); c.color(CLOTH[Math.floor(h(i, s + 4) * CLOTH.length)]);
      box(c, x, y - d, 0, w, d, 0.03, (h(i, s + 6) - 0.5) * 8);
    }
  },
  cord(c, p, L) {
    const len = p.len ?? 3, rows = 4, r = 0.13; c.albedo(null);
    for (let y = 0; y < rows; y++) for (let i = 0; i < Math.round(len / (r * 2.1)); i++) {
      c.color(h(i, y) > 0.5 ? 'oklch(0.66 0.06 60)' : 'oklch(0.58 0.06 55)');
      const x = r + i * r * 2.1 + (y % 2) * r;
      if (x > len) continue; cyl(c, [x, r + y * r * 1.8, -0.45], [x, r + y * r * 1.8, 0.45], r, r, L >= 3 ? 5 : 7);
    }
    wood(c, 'oklch(0.5 0.04 55)'); box(c, len / 2, rows * r * 1.8 + 0.05, 0, len + 0.3, 0.06, 1.2, 0); // a plank lid
    wood(c, 'oklch(0.64 0.06 62)'); cyl(c, [len + 0.9, 0, -0.6], [len + 0.9, 0.55, -0.6], 0.32, 0.3, 9); // chopping block
    if (L <= 2) { c.color('oklch(0.4 0.02 60)'); beam(c, [len + 0.9, 0.55, -0.6], [len + 1.25, 1.05, -0.5], 0.04, 0.04); c.color('oklch(0.45 0.01 250)'); box(c, len + 1.25, 1.0, -0.5, 0.06, 0.2, 0.18, 30); }
  },
  trough(c, p, L) {
    wood(c, 'oklch(0.58 0.05 58)'); for (const x of [-0.8, 0.8]) { beam(c, [x, 0, -0.35], [x, 0.55, 0], 0.08, 0.08); beam(c, [x, 0, 0.35], [x, 0.55, 0], 0.08, 0.08); }
    wood(c, 'oklch(0.66 0.05 60)'); box(c, 0, 0.5, 0.3, 2.4, 0.45, 0.08); box(c, 0, 0.5, -0.3, 2.4, 0.45, 0.08); box(c, 0, 0.45, 0, 2.4, 0.08, 0.68); box(c, 1.17, 0.5, 0, 0.08, 0.45, 0.6); box(c, -1.17, 0.5, 0, 0.08, 0.45, 0.6);
    c.albedo(null); c.color('oklch(0.55 0.07 210)'); c.roughness(0.15); box(c, 0, 0.53, 0, 2.25, 0.34, 0.52);
  },
  hitch(c, p, L) {
    const len = p.len ?? 2.6; wood(c, 'oklch(0.6 0.05 60)');
    for (const x of [0, len]) cyl(c, [x, -0.2, 0], [x, 1.15, 0], 0.08, 0.07, 6);
    beam(c, [-0.15, 1.05, 0], [len + 0.15, 1.05, 0], 0.09, 0.09);
    if (L <= 2) { c.albedo(null); c.color('oklch(0.82 0.04 75)'); beam(c, [len * 0.4, 1.05, 0], [len * 0.43, 0.6, 0.05], 0.025, 0.025); }
  },
  stump(c, p, L) {
    const r = p.r ?? 0.4; wood(c, 'oklch(0.55 0.05 55)'); cyl(c, [0, -0.1, 0], [0, 0.45, 0], r * 1.15, r, 8);
    c.albedo(null); c.color('oklch(0.8 0.06 75)'); cyl(c, [0, 0.45, 0], [0, 0.47, 0], r * 0.96, r * 0.96, 8);
    if (p.log) { wood(c, 'oklch(0.5 0.05 55)'); cyl(c, [0.9, r * 0.9, -0.4], [0.9 + (p.log ?? 4), r * 0.8, 0.6], r * 0.9, r * 0.75, 8); }
    if (L <= 2) { c.color('oklch(0.78 0.06 75)'); for (let i = 0; i < 6; i++) { const a = h(i, 3) * 6.28, d = 0.6 + h(i, 5) * 0.7; box(c, Math.cos(a) * d, 0, Math.sin(a) * d, 0.18, 0.04, 0.08, a * 57); } }
  },
};
export function geometry(ctx) { const L = lodLevel(ctx); frame(); ctx.flat?.(); (K[ctx.params.kind] || K.stump)(ctx, ctx.params, L); }
export function collider(ctx) {
  const p = ctx.params, k = p.kind; frame();
  if (k === 'cord') box(ctx, (p.len ?? 3) / 2 + 0.4, 0, 0, (p.len ?? 3) + 1.4, 0.9, 1.3, 0, { bottom: true });
  else if (k === 'trough') box(ctx, 0, 0, 0, 2.5, 0.9, 0.8, 0, { bottom: true });
  else if (k === 'stump') box(ctx, 0, 0, 0, (p.r ?? 0.4) * 2.2, 0.5, (p.r ?? 0.4) * 2.2, 0, { bottom: true });
  else if (k === 'hitch') box(ctx, (p.len ?? 2.6) / 2, 0, 0, (p.len ?? 2.6) + 0.3, 1.2, 0.25, 0, { bottom: true });
  else for (const x of [0, p.len ?? 6]) box(ctx, x, 0, 0, 0.2, 2.4, 0.2, 0, { bottom: true });
}
