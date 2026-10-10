// Ravenholdt trade yards: an open timber workshop beside each shop that says its trade from across the square.
// Local frame: origin = middle of the yard at ground level, open front −Z (toward the square), back +Z.
// params.kind: bakery | herbalist | provisions | tannery | cooper | weaver
import { TEX as YT, IRON, frame, q, tri, box, beam, cyl, lathe, roof, stones, lodLevel } from './yard-kit.js';
const WOOD = 'oklch(0.9 0.03 70)', DARKW = 'oklch(0.78 0.03 60)';

function shed(ctx, w, d, hb, hf, L, tex = YT.shingle, tint = 'oklch(0.88 0.04 120)') {
  ctx.albedo(YT.wood); ctx.color(DARKW); ctx.roughness(.95);
  for (const [x, z, h] of [[-w/2, -d/2, hf], [w/2, -d/2, hf], [-w/2, d/2, hb], [w/2, d/2, hb]]) beam(ctx, [x, 0, z], [x, h, z], .16, .16);
  beam(ctx, [-w/2 - .2, hf, -d/2], [w/2 + .2, hf, -d/2], .14, .2);
  beam(ctx, [-w/2 - .2, hb, d/2], [w/2 + .2, hb, d/2], .14, .2);
  if (L <= 2) for (const x of [-w/2, w/2]) { beam(ctx, [x, hf - .6, -d/2], [x + (x < 0 ? .5 : -.5), hf - .05, -d/2], .1, .1); }
  ctx.albedo(tex); ctx.color(tint); ctx.roughness(1);
  roof(ctx, [0, hb + .1, d/2 + .3], [0, hf + .05, -d/2 - .45], w + .7, .1);
  // back wall of planks, open front
  ctx.albedo(YT.planks); ctx.color('oklch(0.86 0.025 70)');
  box(ctx, 0, 0, d/2 + .05, w, hb, .08);
}
function barrel(ctx, x, y, z, r = .3, h = .8, L = 1, lie = false) {
  const A = lie ? [x - h/2, y + r, z] : [x, y, z], M = lie ? [x, y + r, z] : [x, y + h/2, z], B = lie ? [x + h/2, y + r, z] : [x, y + h, z];
  ctx.albedo(YT.wood); ctx.color('oklch(0.86 0.05 65)');
  cyl(ctx, A, M, r * .86, r, L <= 2 ? 12 : 7); cyl(ctx, M, B, r, r * .86, L <= 2 ? 12 : 7);
  if (L <= 2) { ctx.albedo(null); ctx.color(IRON); ctx.metalness(.5);
    for (const t of [.12, .88]) { const p = (a, b) => a + (b - a) * t; const c = [p(A[0], B[0]), p(A[1], B[1]), p(A[2], B[2])];
      const e = lie ? [.02, 0, 0] : [0, .02, 0]; cyl(ctx, [c[0] - e[0], c[1] - e[1], c[2]], [c[0] + e[0], c[1] + e[1], c[2]], r * .9 + .015, r * .9 + .015, 12, { caps: false }); }
    ctx.metalness(0); }
}
function crate(ctx, x, y, z, s = .55, yaw = 0, L = 1) {
  ctx.albedo(YT.wood); ctx.color('oklch(0.9 0.05 75)'); box(ctx, x, y, z, s, s, s, yaw);
  if (L <= 2) { ctx.color(DARKW); box(ctx, x, y + s * .45, z, s + .02, .06, s + .02, yaw); box(ctx, x, y + s * .1, z, s + .02, .06, s + .02, yaw); }
}
function sack(ctx, x, y, z, c = 'oklch(0.85 0.04 85)', s = 1) {
  ctx.albedo(YT.weave); ctx.color(c);
  lathe(ctx, [x, y, z], [[.18*s, 0], [.23*s, .15*s], [.2*s, .38*s], [.1*s, .48*s], [.05*s, .52*s], [.08*s, .58*s], [0, .6*s]], 9);
}
function table(ctx, x, z, w, d, h = .9, yaw = 0) {
  ctx.albedo(YT.wood); ctx.color(WOOD);
  box(ctx, x, h - .07, z, w, .07, d, yaw);
  const r = yaw * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lx = a * (w/2 - .08), lz = b * (d/2 - .08); box(ctx, x + c * lx + s * lz, 0, z - s * lx + c * lz, .08, h - .07, .08); }
}

const BUILD = {
  bakery(ctx, L) {
    shed(ctx, 3.4, 2.6, 2.7, 2.3, L);
    // the oven: a stone plinth, a clay dome, a glowing arched mouth and its own stack
    stones(ctx, 1.9, 0, .2, 2.2, .8, 2.2, { lod: L, course: .27 });
    ctx.albedo('cdn/texture-rough-grey-fieldstone.png'); ctx.color('oklch(0.86 0.06 50)');
    lathe(ctx, [1.9, .8, .2], [[1, 0], [.98, .25], [.85, .6], [.55, .88], [0, 1]], 16);
    ctx.albedo(null); ctx.color('oklch(0.3 0.05 40)'); ctx.emissive(2.4, .9, .25);
    box(ctx, 1.9, .82, -.79, .5, .42, .05);
    ctx.emissive(null);
    ctx.albedo('cdn/texture-rough-grey-fieldstone.png'); ctx.color('oklch(0.82 0.02 70)');
    box(ctx, 2.5, .8, .8, .45, 3.4, .45);
    if (L <= 3) { ctx.color('oklch(0.6 0.02 60)'); box(ctx, 2.5, 4.15, .8, .55, .12, .55); }
    // bread table under the roof
    table(ctx, -.4, -.3, 2.2, .8);
    if (L <= 2) { ctx.albedo(null); ctx.roughness(.9);
      for (let i = 0; i < 9; i++) { ctx.color(i % 3 ? 'oklch(0.62 0.11 60)' : 'oklch(0.52 0.1 50)');
        lathe(ctx, [-1.3 + (i % 5) * .42, .9, -.5 + Math.floor(i / 5) * .38], [[0, 0], [.14, .01], [.15, .05], [.1, .1], [0, .12]], 8); } }
    // peel, flour, firewood
    ctx.albedo(YT.wood); ctx.color(WOOD); beam(ctx, [.85, 0, -1], [1.0, 2.1, -1.1], .05, .05);
    if (L <= 2) box(ctx, 1.02, 2.1, -1.12, .3, .03, .34);
    sack(ctx, -1.3, 0, .8); sack(ctx, -.8, 0, .9, 'oklch(0.9 0.02 90)'); sack(ctx, -1.05, .5, .85, 'oklch(0.88 0.03 85)', .9);
    ctx.albedo(YT.bark); ctx.color('oklch(0.8 0.04 60)');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) cyl(ctx, [3.15, .12 + r * .22, -.8 + i * .24 + r * .12], [3.75, .12 + r * .22, -.8 + i * .24 + r * .12], .11, .11, 6);
  },
  herbalist(ctx, L) {
    shed(ctx, 3.6, 2.4, 2.8, 2.35, L, YT.turf, 'oklch(0.9 0.05 130)');
    // drying bundles from the front beam
    if (L <= 3) for (let i = 0; i < 9; i++) { const x = -1.6 + i * .4, hue = [130, 140, 300, 95, 145][i % 5];
      ctx.albedo(null); ctx.color('oklch(0.6 0.03 70)'); beam(ctx, [x, 2.3, -1.2], [x, 2.0, -1.2], .02, .02);
      ctx.color(`oklch(${hue === 300 ? .55 : .5} ${hue === 300 ? .12 : .09} ${hue})`); lathe(ctx, [x, 1.55, -1.2], [[0, 0], [.13, .1], [.11, .3], [.04, .45], [0, .46]], 7); }
    // stepped shelf of clay pots and jars
    ctx.albedo(YT.wood); ctx.color(WOOD);
    for (let s = 0; s < 3; s++) box(ctx, 0, .4 + s * .5, .9 - s * .2, 3, .05, .45);
    for (const x of [-1.6, 1.6]) box(ctx, x, 0, .75, .07, 1.45, .8);
    ctx.albedo(null);
    for (let s = 0; s < 3; s++) for (let i = 0; i < 6; i++) { const x = -1.25 + i * .5 + (s % 2) * .2;
      ctx.color(['oklch(0.62 0.12 45)', 'oklch(0.55 0.1 220)', 'oklch(0.7 0.08 80)', 'oklch(0.5 0.1 150)'][(i + s) % 4]);
      if (L <= 2 || i % 2 === 0) lathe(ctx, [x, .45 + s * .5, .9 - s * .2], [[.07, 0], [.11, .08], [.1, .2], [.05, .26], [.06, .3], [0, .3]], 8); }
    // cauldron on a tripod and a raised herb bed out front
    ctx.color(IRON); ctx.metalness(.4);
    lathe(ctx, [-1.0, .3, -.6], [[0, 0], [.3, .05], [.38, .25], [.36, .45], [.34, .47]], 12, {}); ctx.metalness(0);
    ctx.color('oklch(0.55 0.13 140)'); ctx.emissive(.05, .25, .05); cyl(ctx, [-1.0, .72, -.6], [-1.0, .73, -.6], .32, .32, 12); ctx.emissive(null);
    ctx.albedo(YT.wood); ctx.color(DARKW);
    for (const a of [0, 120, 240]) { const r = a * Math.PI / 180; beam(ctx, [-1 + Math.cos(r) * .6, 0, -.6 + Math.sin(r) * .6], [-1, 1.4, -.6], .05, .05); }
    ctx.color(WOOD); box(ctx, 1.1, 0, -1.9, 2.2, .4, .9);
    ctx.albedo(YT.earth); ctx.color('oklch(0.75 0.04 60)'); box(ctx, 1.1, .38, -1.9, 2.05, .04, .75);
    ctx.albedo(null);
    if (L <= 2) for (let i = 0; i < 10; i++) { const x = .25 + (i % 5) * .42, z = -2.1 + Math.floor(i / 5) * .4;
      ctx.color('oklch(0.55 0.12 140)'); lathe(ctx, [x, .42, z], [[0, 0], [.14, .1], [.12, .22], [0, .3]], 6);
      if (i % 2) { ctx.color(['oklch(0.7 0.16 300)', 'oklch(0.85 0.15 90)'][i % 4 === 1 ? 0 : 1]); lathe(ctx, [x, .66, z], [[0, 0], [.06, .03], [0, .07]], 6); } }
  },
  provisions(ctx, L) {
    // striped awning on poles over a long counter
    ctx.albedo(YT.wood); ctx.color(DARKW);
    for (const x of [-1.9, 1.9]) { beam(ctx, [x, 0, -1.3], [x, 2.3, -1.3], .12, .12); beam(ctx, [x, 0, 1], [x, 2.8, 1], .12, .12); }
    ctx.albedo(null); ctx.roughness(.95);
    for (let i = 0; i < 8; i++) { const x0 = -2.1 + i * .525; ctx.color(i % 2 ? 'oklch(0.9 0.03 90)' : 'oklch(0.55 0.15 245)');
      q(ctx, [x0, 2.82, 1.05], [x0 + .525, 2.82, 1.05], [x0 + .525, 2.25, -1.55], [x0, 2.25, -1.55], [0, 1, -.2]);
      if (L <= 2) q(ctx, [x0, 2.25, -1.55], [x0 + .525, 2.25, -1.55], [x0 + .525, 2.0, -1.6], [x0, 2.0, -1.6], [0, 0, -1]); }
    ctx.albedo(YT.planks); ctx.color('oklch(0.86 0.025 70)'); box(ctx, 0, 0, 1.05, 3.8, 2.75, .08);
    ctx.albedo(YT.wood); ctx.color(WOOD); box(ctx, 0, 0, -.9, 3.4, .95, .6);
    ctx.color(DARKW); box(ctx, 0, .95, -.9, 3.6, .06, .75);
    // on the counter: rope coils, salt pots, oil jugs
    ctx.albedo(null);
    for (let i = 0; i < 3; i++) { ctx.color('oklch(0.72 0.06 80)'); const x = -1.3 + i * .35; cyl(ctx, [x, 1.01, -.9], [x, 1.13, -.9], .15, .15, 10); }
    for (let i = 0; i < 4; i++) { ctx.color(i % 2 ? 'oklch(0.6 0.1 50)' : 'oklch(0.5 0.08 230)'); lathe(ctx, [.2 + i * .35, 1.01, -.95], [[.08, 0], [.12, .1], [.11, .24], [.04, .3], [.05, .36], [0, .36]], 8); }
    // shelves of goods on the back wall
    ctx.albedo(YT.wood); ctx.color(WOOD); for (const y of [.9, 1.5, 2.1]) box(ctx, 0, y, .82, 3.4, .05, .4);
    ctx.albedo(null);
    if (L <= 2) for (const y of [.95, 1.55, 2.15]) for (let i = 0; i < 9; i++) { ctx.color(['oklch(0.6 0.1 60)', 'oklch(0.85 0.03 90)', 'oklch(0.55 0.12 30)', 'oklch(0.5 0.06 150)'][(i + y * 10) % 4]); box(ctx, -1.5 + i * .37, y, .82, .24, .22 + (i % 3) * .06, .24); }
    for (const [x, z, s] of [[-2.6, -.6, .6], [-2.6, .1, .6], [-2.6, -.25, .5]]) crate(ctx, x, s === .5 ? .6 : 0, z, s, 8, L);
    barrel(ctx, 2.6, 0, -.6, .3, .8, L); barrel(ctx, 2.6, 0, .2, .3, .8, L);
    sack(ctx, 2.2, 0, -1.6, 'oklch(0.92 0.01 90)');
  },
  tannery(ctx, L) {
    // three stretching frames with hides laced in, two soaking vats, a fleshing beam
    for (let i = 0; i < 3; i++) { const x = -2 + i * 1.6, z = .6;
      ctx.albedo(YT.wood); ctx.color(DARKW);
      beam(ctx, [x - .7, 0, z], [x - .7, 2.1, z], .1, .1); beam(ctx, [x + .7, 0, z], [x + .7, 2.1, z], .1, .1);
      beam(ctx, [x - .8, 2.0, z], [x + .8, 2.0, z], .1, .1); beam(ctx, [x - .8, .35, z], [x + .8, .35, z], .1, .1);
      ctx.albedo(YT.hide); ctx.color(['oklch(0.86 0.06 60)', 'oklch(0.75 0.07 50)', 'oklch(0.92 0.04 75)'][i]);
      const P = [[x - .5, .55], [x - .3, .5], [x + .3, .5], [x + .5, .55], [x + .6, 1.1], [x + .45, 1.85], [x - .45, 1.85], [x - .6, 1.1]];
      for (let k = 1; k < P.length - 1; k++) { tri(ctx, [P[0][0], P[0][1], z - .02], [P[k][0], P[k][1], z - .02], [P[k + 1][0], P[k + 1][1], z - .02], [0, 0, -1]); }
      if (L <= 2) { ctx.albedo(null); ctx.color('oklch(0.5 0.03 70)'); for (const [px, py] of P) beam(ctx, [px, py, z - .01], [Math.max(x - .7, Math.min(x + .7, px + (px - x) * .4)), Math.max(.35, Math.min(2.0, py + (py - 1.2) * .4)), z - .01], .015, .015); }
    }
    for (const [x, c] of [[-1.3, 'oklch(0.45 0.06 70)'], [.4, 'oklch(0.4 0.07 45)']]) {
      ctx.albedo(YT.wood); ctx.color('oklch(0.82 0.05 60)'); cyl(ctx, [x, 0, -1.2], [x, .75, -1.2], .6, .65, 14, { capB: false });
      ctx.albedo(null); ctx.color(c); ctx.roughness(.3); cyl(ctx, [x, .66, -1.2], [x, .67, -1.2], .6, .6, 14); ctx.roughness(.95);
      if (L <= 2) { ctx.color(IRON); cyl(ctx, [x, .5, -1.2], [x, .55, -1.2], .64, .64, 14, { caps: false }); }
    }
    ctx.albedo(YT.wood); ctx.color(WOOD); beam(ctx, [1.6, .2, -1.6], [2.6, 1.0, -.8], .3, .3);
    beam(ctx, [2.3, 0, -1.0], [2.3, .75, -1.0], .08, .08); beam(ctx, [1.8, 0, -1.4], [1.8, .4, -1.4], .08, .08);
    ctx.albedo(YT.hide); ctx.color('oklch(0.8 0.06 55)'); box(ctx, 2.6, 0, .2, .9, .25, .7, 15); box(ctx, 2.6, .25, .2, .85, .2, .65, -10);
  },
  cooper(ctx, L) {
    shed(ctx, 3.6, 2.6, 2.8, 2.35, L);
    // finished casks in a pyramid, staves stacked, hoops leaning, a shaving horse and a hooping fire
    for (let i = 0; i < 4; i++) barrel(ctx, -1.6 + i * .66, 0, .7, .3, .8, L, true);
    for (let i = 0; i < 3; i++) barrel(ctx, -1.27 + i * .66, .52, .7, .3, .8, L, true);
    for (let i = 0; i < 2; i++) barrel(ctx, -.94 + i * .66, 1.04, .7, .3, .8, L, true);
    barrel(ctx, 1.6, 0, .6, .34, .95, L); barrel(ctx, 2.6, 0, -.2, .3, .8, L); barrel(ctx, 2.7, 0, .6, .26, .7, L);
    ctx.albedo(YT.wood); ctx.color('oklch(0.92 0.05 80)');
    if (L <= 3) for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) box(ctx, 1.0 + i * .12, r * .05, -.3, .1, .045, .9);
    ctx.albedo(null); ctx.color(IRON); ctx.metalness(.5);
    if (L <= 2) for (let i = 0; i < 4; i++) { const r = .32 - i * .02; const z0 = 1.18 + i * .03; cyl(ctx, [-2.4, r + .02, z0], [-2.4, r + .02, z0 + .02], r, r, 14, { caps: false }); }
    ctx.metalness(0);
    ctx.albedo(YT.wood); ctx.color(WOOD); beam(ctx, [-.9, .55, -1.5], [.5, .75, -1.5], .25, .1);
    for (const x of [-.7, .3]) beam(ctx, [x, 0, -1.5], [x, .6, -1.5], .07, .07);
    beam(ctx, [.1, .75, -1.5], [.2, 1.1, -1.5], .12, .12);
    // half-built cask: open staves in a ring over a fire basket
    if (L <= 2) { ctx.color('oklch(0.85 0.05 70)'); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; beam(ctx, [2.0 + Math.cos(a) * .3, .25, -1.7 + Math.sin(a) * .3], [2.0 + Math.cos(a) * .36, 1.0, -1.7 + Math.sin(a) * .36], .1, .03); } }
    ctx.albedo(null); ctx.color(IRON); cyl(ctx, [2, 0, -1.7], [2, .25, -1.7], .25, .3, 10, { capB: false });
    ctx.color('oklch(0.3 0.05 40)'); ctx.emissive(2.2, .7, .15); cyl(ctx, [2, .2, -1.7], [2, .21, -1.7], .27, .27, 10); ctx.emissive(null);
  },
  weaver(ctx, L) {
    // a big floor loom under a small roof, dye vats in three colours, cloth drying on a line
    shed(ctx, 2.6, 2.2, 2.7, 2.3, L);
    ctx.albedo(YT.wood); ctx.color(WOOD);
    for (const [x, z] of [[-.9, -.6], [.9, -.6], [-.9, .6], [.9, .6]]) beam(ctx, [x, 0, z], [x, 1.7, z], .1, .1);
    for (const z of [-.6, .6]) beam(ctx, [-1, 1.7, z], [1, 1.7, z], .1, .1);
    cyl(ctx, [-.85, .8, -.6], [.85, .8, -.6], .07, .07, 8); cyl(ctx, [-.85, .9, .6], [.85, .9, .6], .12, .12, 8);
    ctx.albedo(null);
    if (L <= 2) for (let i = 0; i < 20; i++) { const x = -.76 + i * .08; ctx.color(i % 4 < 2 ? 'oklch(0.55 0.15 25)' : 'oklch(0.85 0.04 90)'); beam(ctx, [x, .8, -.58], [x, .95, .58], .015, .015); }
    ctx.color('oklch(0.55 0.15 25)'); box(ctx, 0, .99, .45, 1.6, .1, .3);
    for (const [x, c] of [[-2.2, 'oklch(0.45 0.15 260)'], [-2.2, 'oklch(0.55 0.18 25)'], [-2.2, 'oklch(0.8 0.15 90)']].map((v, i) => [v[0], v[1], -1.0 + i * .9])) {}
    [['oklch(0.45 0.15 260)', -1.2], ['oklch(0.55 0.18 25)', -.3], ['oklch(0.8 0.15 90)', .6]].forEach(([c, z]) => {
      ctx.albedo(YT.wood); ctx.color('oklch(0.82 0.05 60)'); cyl(ctx, [-2.2, 0, z], [-2.2, .6, z], .38, .42, 12, { capB: false });
      ctx.albedo(null); ctx.color(c); ctx.roughness(.3); cyl(ctx, [-2.2, .52, z], [-2.2, .53, z], .38, .38, 12); ctx.roughness(.95); });
    ctx.albedo(YT.wood); ctx.color(DARKW); beam(ctx, [2, 0, -1.4], [2, 2.0, -1.4], .08, .08); beam(ctx, [2, 0, .8], [2, 2.0, .8], .08, .08);
    ctx.albedo(null); ctx.color('oklch(0.6 0.02 70)'); beam(ctx, [2, 1.95, -1.4], [2, 1.95, .8], .02, .02);
    [['oklch(0.5 0.15 260)', -1.1], ['oklch(0.6 0.17 25)', -.4], ['oklch(0.82 0.14 95)', .3]].forEach(([c, z]) => { ctx.color(c); q(ctx, [2, 1.95, z - .3], [2, 1.95, z + .3], [2, 1.0, z + .3], [2, 1.05, z - .3], [1, 0, 0]); });
  },
};

export function geometry(ctx) {
  frame(); const L = lodLevel(ctx), k = ctx.params?.kind || 'provisions';
  if (L >= 4) { ctx.albedo(YT.wood); ctx.color(DARKW); box(ctx, 0, 0, .3, 3.6, L >= 5 ? 2.4 : 2.7, 2.2);
    if (k === 'bakery') { ctx.albedo('cdn/texture-rough-grey-fieldstone.png'); ctx.color('oklch(0.82 0.02 70)'); box(ctx, 2.5, 0, .8, .5, 4.2, .5); }
    return; }
  (BUILD[k] || BUILD.provisions)(ctx, L);
}
export function collider() {
  return { kind: 'box', width: 3.4, height: 1.2, depth: 1.6 };
}
