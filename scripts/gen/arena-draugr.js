// A draugr: a gaunt undead viking, hunched, rotted mail over grey-blue skin, a dented iron helm, frost-lit eyes,
// a notched axe in the right hand and a split round shield on the left. Faces -Z, feet at y=0, ~1.85 m.
import { frame } from './yard-kit.js';
import { frust, bx, vloft, spike, cylZ, glowEyes, hex } from './arena-kit.js';
export function skeleton() {
  return { root: { pivot: [0, 0.95, 0] }, spine: { parent: 'root', pivot: [0, 1.0, 0] }, head: { parent: 'spine', pivot: [0, 1.55, -0.04] },
    armL: { parent: 'spine', pivot: [-0.3, 1.45, 0] }, armR: { parent: 'spine', pivot: [0.3, 1.45, 0] },
    legL: { parent: 'root', pivot: [-0.12, 0.95, 0] }, legR: { parent: 'root', pivot: [0.12, 0.95, 0] } };
}
const SKIN = 'oklch(0.62 0.04 220)', MAIL = 'oklch(0.48 0.015 240)', CLOTH = 'oklch(0.42 0.05 40)', IRON = 'oklch(0.4 0.01 250)', WOOD = 'oklch(0.45 0.06 60)';
export function geometry(ctx) {
  frame(); ctx.flat(); const lod = ctx.lod || 1; ctx.roughness(.85);
  for (const s of [-1, 1]) {
    ctx.bone(s < 0 ? 'legL' : 'legR'); const x = s * .12;
    ctx.color(CLOTH); frust(ctx, [x, .12, 0, .075, .08], [x, .95, 0, .1, .1]);
    ctx.color('oklch(0.32 0.03 50)'); bx(ctx, x - .08, 0, -.14, x + .08, .16, .09);
    if (lod <= 2) { ctx.color('oklch(0.6 0.02 80)'); for (const y of [.3, .45, .6]) bx(ctx, x - .085, y, -.09, x + .085, y + .035, .09); }
  }
  ctx.bone('spine');
  ctx.color(MAIL); frust(ctx, [0, .9, 0, .2, .13], [0, 1.2, -.02, .19, .12]); frust(ctx, [0, 1.2, -.02, .19, .12], [0, 1.5, -.02, .27, .15]);
  ctx.color(CLOTH); frust(ctx, [0, .78, 0, .22, .15], [0, .95, 0, .2, .14]);
  ctx.color('oklch(0.3 0.03 50)'); bx(ctx, -.215, .95, -.15, .215, 1.02, .15);
  if (lod <= 2) { ctx.color('oklch(0.55 0.08 80)'); bx(ctx, -.05, .94, -.16, .05, 1.03, -.145); ctx.color('oklch(0.82 0.02 90)'); for (const y of [1.25, 1.33, 1.41]) bx(ctx, -.12, y, -.165, .12, y + .03, -.13); }
  ctx.color(SKIN); frust(ctx, [0, 1.48, -.02, .07, .07], [0, 1.58, -.03, .06, .06]);
  ctx.bone('head');
  ctx.color(SKIN); vloft(ctx, [[0, 1.56, -.05, .1, .11], [0, 1.66, -.06, .12, .13], [0, 1.78, -.05, .11, .12], [0, 1.82, -.04, .07, .08]], lod >= 3 ? 5 : 8, lod <= 2 ? .12 : 0);
  ctx.color('oklch(0.82 0.01 90)'); frust(ctx, [0, 1.5, -.1, .06, .05], [0, 1.6, -.12, .09, .06]);
  ctx.color(IRON); ctx.metalness(.5); vloft(ctx, [[0, 1.74, -.05, .135, .145], [0, 1.82, -.05, .125, .135], [0, 1.9, -.05, .05, .06]], lod >= 3 ? 5 : 8);
  bx(ctx, -.02, 1.6, -.2, .02, 1.78, -.17); ctx.metalness(0);
  if (lod <= 3) { glowEyes(ctx, .045, 1.69, -.175, .022, [1.4, 2.6, 4]); ctx.color('oklch(0.8 0.02 230)'); for (const s of [-1, 1]) spike(ctx, [s * .1, 1.55, -.12], [s * .02, -.18, -.02], .03, 3); }
  for (const s of [-1, 1]) {
    ctx.bone(s < 0 ? 'armL' : 'armR'); const x = s * .3;
    ctx.color(MAIL); frust(ctx, [x, 1.2, 0, .07, .07], [x, 1.48, 0, .08, .08]);
    ctx.color(SKIN); frust(ctx, [x, .82, 0, .045, .05], [x, 1.2, 0, .055, .055]); bx(ctx, x - .05, .74, -.05, x + .05, .84, .05);
    if (s > 0) { ctx.color(WOOD); bx(ctx, x - .025, .5, -.03, x + .025, 1.1, .03); ctx.color(IRON); ctx.metalness(.55); hex(ctx, [[x - .02, .92, -.04], [x + .02, .92, -.04], [x + .02, .92, -.26], [x - .02, .92, -.26], [x - .02, 1.08, -.03], [x + .02, 1.08, -.03], [x + .02, 1.14, -.3], [x - .02, 1.14, -.3]]); ctx.metalness(0); }
    else { ctx.color('oklch(0.5 0.06 60)'); cylZ(ctx, [x - .1, 1.0, -.04], .36, .025, lod >= 3 ? 7 : 12); ctx.color(IRON); ctx.metalness(.5); cylZ(ctx, [x - .1, 1.0, -.08], .08, .02, 6); ctx.metalness(0);
      if (lod <= 2) { ctx.color('oklch(0.5 0.12 25)'); bx(ctx, x - .13, .66, -.07, x - .07, 1.34, -.066); } }
  }
  ctx.bone(null);
}
