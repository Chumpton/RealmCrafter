// A small Norse cow, chunky low-poly: deep body with a dropped belly, long head with a pale muzzle, short upswept horns,
// an udder, a tasselled tail, jointed legs with dark hooves. Faces −Z. params.coat: red | dun | black.
import { frame, cyl, lathe } from './yard-kit.js';
import { loft, flap, eyes } from './herd-kit.js';
export function skeleton() {
  return { root: { pivot: [0, .95, 0] }, neck: { parent: 'root', pivot: [0, 1.1, -.72] }, tail: { parent: 'root', pivot: [0, 1.12, .9] },
    legFL: { parent: 'root', pivot: [-.2, .84, -.55] }, legFR: { parent: 'root', pivot: [.2, .84, -.55] },
    legBL: { parent: 'root', pivot: [-.2, .84, .58] }, legBR: { parent: 'root', pivot: [.2, .84, .58] } };
}
const COATS = { red: ['oklch(0.52 0.1 45)', 'oklch(0.32 0.05 40)', 'oklch(0.82 0.03 60)'], dun: ['oklch(0.74 0.06 75)', 'oklch(0.45 0.04 60)', 'oklch(0.88 0.02 80)'],
  black: ['oklch(0.3 0.015 50)', 'oklch(0.2 0.01 50)', 'oklch(0.7 0.02 40)'] };
export function geometry(ctx) {
  frame(); const L = ctx.lod, [body, dark, pale] = COATS[ctx.params.coat] || COATS.red, seg = L <= 1 ? 10 : L <= 2 ? 8 : L <= 3 ? 6 : 4;
  ctx.albedo(null); ctx.roughness(.9); ctx.metalness(0); ctx.flat();
  ctx.bone('root'); ctx.color(body);
  loft(ctx, [[0, 1.0, -.86, .18, .2], [0, 1.0, -.74, .3, .33], [0, .97, -.42, .36, .4], [0, .96, .08, .37, .4], [0, 1.0, .5, .34, .36], [0, 1.05, .78, .27, .27], [0, 1.06, .9, .13, .14]], seg);
  if (L <= 3) { ctx.color('oklch(0.78 0.05 20)'); lathe(ctx, [0, .5, .44], [[0, 0], [.08, .03], [.12, .1], [.11, .17], [0, .2]], L <= 2 ? 6 : 4); }
  ctx.bone('neck'); ctx.color(body);
  loft(ctx, [[0, 1.02, -.7, .22, .28], [0, 1.1, -.92, .16, .21], [0, 1.14, -1.06, .14, .17], [0, 1.1, -1.18, .13, .15], [0, 1.0, -1.32, .11, .12], [0, .94, -1.4, .1, .09]], seg);
  ctx.color(pale); loft(ctx, [[0, .93, -1.39, .1, .085], [0, .91, -1.45, .095, .075], [0, .9, -1.5, .08, .06]], L <= 2 ? 6 : 4);
  if (L <= 3) {
    ctx.color('oklch(0.84 0.03 85)'); for (const s of [-1, 1]) { cyl(ctx, [s * .09, 1.24, -1.08], [s * .22, 1.3, -1.05], .035, .025, 5); cyl(ctx, [s * .22, 1.3, -1.05], [s * .27, 1.41, -1.11], .025, .007, 5); }
    ctx.color(dark); for (const s of [-1, 1]) flap(ctx, [s * .12, 1.2, -1.12], [s * .3, 1.17, -1.1], [s * .13, 1.14, -1.19], [0, 1, 0]);
    if (L <= 2) eyes(ctx, .128, 1.12, -1.2, .02);
  }
  for (const [b, x, z] of [['legFL', -.2, -.55], ['legFR', .2, -.55], ['legBL', -.2, .58], ['legBR', .2, .58]]) {
    ctx.bone(b); ctx.color(body); cyl(ctx, [x, .86, z], [x, .45, z + (z > 0 ? .04 : 0)], .085, .062, L <= 2 ? 6 : 4);
    ctx.color(L <= 3 ? dark : body); cyl(ctx, [x, .45, z + (z > 0 ? .04 : 0)], [x, .1, z], .062, .055, L <= 2 ? 6 : 4);
    ctx.color('oklch(0.2 0.015 50)'); cyl(ctx, [x, .1, z], [x, 0, z - .01], .058, .07, 4);
  }
  if (L <= 4) { ctx.bone('tail'); ctx.color(body); cyl(ctx, [0, 1.1, .9], [0, .62, .98], .028, .02, 4); ctx.color(dark); cyl(ctx, [0, .64, .98], [0, .42, 1.0], .055, .012, 5); }
  ctx.bone(null);
}
export function collider() { return null; }
