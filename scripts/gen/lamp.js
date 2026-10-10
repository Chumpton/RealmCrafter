// LIGHTING lock-in · the lamp holders (W2), one geometry per params.kind: chunky low-poly, iron blackened, wood weathered.
// The flame is never here: it is the row's fx (scripts/lamp.js). Origin at the feet, front -Z. Levels: 1-2 full, 3 drops trim,
// 4 the big forms, 5 one hull of a few faces.
const T = {
  iron: 'cdn/texture-dark-wrought-iron.png', oak: 'cdn/texture-weathered-split-log-oak.png', bark: 'cdn/texture-ancient-oak-bark-deep-furrows.png',
  char: 'cdn/texture-charred-burnt-wood.png', stone: 'cdn/texture-weathered-grey-granite.png', field: 'cdn/texture-rough-grey-fieldstone.png',
  ash: 'cdn/texture-grey-wood-ash-bed-with-cinders.png', soap: 'cdn/texture-weathered-grey-limestone.png',
};
const paint = (c, tex, col, rough = .88, metal = 0) => { c.albedo(tex); c.color(col); c.roughness(rough); c.metalness(metal); };
const iron = (c) => paint(c, T.iron, 'oklch(0.92 0.005 250)', .62, .5);
const oak = (c) => paint(c, T.oak, 'oklch(0.93 0.02 75)');
const bark = (c) => paint(c, T.bark, 'oklch(0.95 0.02 70)');
const char = (c) => paint(c, T.char, 'oklch(0.95 0.01 50)', .95);
const stone = (c) => paint(c, T.stone, 'oklch(0.95 0.008 240)', .92);
const field = (c) => paint(c, T.field, 'oklch(0.95 0.01 80)', .92);
const ash = (c) => paint(c, T.ash, 'oklch(0.95 0.005 60)', .97);
const flat = (c, col, rough = .8) => paint(c, null, col, rough);
// --- primitives (every face CCW from outside) ---
const D2R = Math.PI / 180;
function rot(p, r) {
  let [x, y, z] = p; const { yaw = 0, pitch = 0, roll = 0 } = r || {};
  if (roll) { const a = roll * D2R, c = Math.cos(a), s = Math.sin(a); [x, y] = [x * c - y * s, x * s + y * c]; }
  if (pitch) { const a = pitch * D2R, c = Math.cos(a), s = Math.sin(a); [y, z] = [y * c - z * s, y * s + z * c]; }
  if (yaw) { const a = yaw * D2R, c = Math.cos(a), s = Math.sin(a); [x, z] = [x * c + z * s, -x * s + z * c]; }
  return [x, y, z];
}
const FACES = [[1, 3, 7, 5], [0, 4, 6, 2], [2, 6, 7, 3], [0, 1, 5, 4], [4, 5, 7, 6], [0, 2, 3, 1]];
// a box by centre and half extents; top < 1 tapers the upper face (a stone, a hearth block)
export function box(c, ctr, h, r, top = 1, skipBottom = false) {
  const P = [];
  for (let i = 0; i < 8; i++) { const up = (i >> 1) & 1, k = up ? top : 1; const q = rot([((i & 1) ? 1 : -1) * h[0] * k, (up ? 1 : -1) * h[1], ((i >> 2) & 1 ? 1 : -1) * h[2] * k], r); P.push([q[0] + ctr[0], q[1] + ctr[1], q[2] + ctr[2]]); }
  FACES.forEach((f, fi) => { if (skipBottom && fi === 3) return; c.quad(...P[f[0]], ...P[f[1]], ...P[f[2]], ...P[f[3]]); });
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// a frustum from a to b, n sides; caps: true | 'top' | 'bottom' | false
export function prism(c, a, b, ra, rb, n = 6, caps = true, phase = 0) {
  const d = nrm(sub(b, a)), u = nrm(crs(Math.abs(d[1]) < .9 ? [0, 1, 0] : [1, 0, 0], d)), v = crs(d, u);
  const pt = (o, r, k) => { const t = phase * D2R + k / n * 2 * Math.PI, cs = Math.cos(t) * r, sn = Math.sin(t) * r; return [o[0] + u[0] * cs + v[0] * sn, o[1] + u[1] * cs + v[1] * sn, o[2] + u[2] * cs + v[2] * sn]; };
  for (let k = 0; k < n; k++) {
    const B0 = pt(a, ra, k), B1 = pt(a, ra, k + 1), T0 = pt(b, rb, k), T1 = pt(b, rb, k + 1);
    c.quad(...B0, ...B1, ...T1, ...T0);
    if ((caps === true || caps === 'top') && rb > 1e-4) c.tri(...b, ...T0, ...T1);
    if ((caps === true || caps === 'bottom') && ra > 1e-4) c.tri(...a, ...B1, ...B0);
  }
}
// a split-and-burnt log: bark from a, charred over the last `burnt` of its length
function log(c, a, b, r, n, burnt = .3, L = 1) {
  const m = lerp3(a, b, 1 - burnt);
  bark(c); prism(c, a, m, r, r * .95, n, 'bottom');
  char(c); prism(c, m, b, r * .95, r * .7, n, 'top');
}
// a ring of fieldstones
function stones(c, R, count, size, rnd, L, rough = field) {
  rough(c);
  for (let i = 0; i < count; i++) {
    const a = (i + rnd() * .3) / count * 2 * Math.PI, s = size * (.8 + rnd() * .45), rr = R + (rnd() - .5) * size * .4;
    box(c, [Math.cos(a) * rr, s * .42, Math.sin(a) * rr], [s * .62, s * .48, s * (.45 + rnd() * .2)], { yaw: -a / D2R + (rnd() - .5) * 30, pitch: (rnd() - .5) * 14, roll: (rnd() - .5) * 14 }, .68, L >= 3);
  }
}
const KINDS = {
  torch(c, L) {
    if (L >= 5) { oak(c); prism(c, [0, 0, 0], [0, 1.98, 0], .07, .07, 4, 'top'); return; }
    if (L <= 3) { const r = () => c.random(); for (let i = 0; i < 3; i++) { const a = i * 2.1 + r(); field(c); box(c, [Math.cos(a) * .13, .05, Math.sin(a) * .13], [.08, .06, .06], { yaw: a / D2R, roll: 10 }, .7, true); } }
    oak(c); prism(c, [0, 0, 0], [0, 1.74, 0], .068, .056, L <= 2 ? 6 : 5, 'top', 15);
    iron(c);
    if (L <= 3) for (const y of [1.18, 1.6]) prism(c, [0, y, 0], [0, y + .045, 0], .072, .066, 6, true, 15);
    prism(c, [0, 1.7, 0], [0, 1.8, 0], .058, .09, 6, true, 15);
    if (L <= 2) for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .4; prism(c, [Math.cos(a) * .07, 1.78, Math.sin(a) * .07], [Math.cos(a) * .1, 1.96, Math.sin(a) * .1], .009, .007, 4); }
    paint(c, T.char, 'oklch(0.9 0.03 55)', .95); prism(c, [0, 1.78, 0], [0, 1.99, 0], .066, .078, 6, true);
    if (L <= 2) { flat(c, 'oklch(0.62 0.05 70)', .95); for (const y of [1.83, 1.91]) prism(c, [0, y, 0], [0, y + .022, 0], .082, .082, 6, false); }
  },
  brazier(c, L) {
    iron(c);
    if (L >= 5) { prism(c, [0, 0, 0], [0, 1, 0], .12, .33, 4); return; }
    for (let i = 0; i < 3; i++) { const a = i / 3 * 2 * Math.PI + .5, cs = Math.cos(a), sn = Math.sin(a);
      prism(c, [cs * .17, .74, sn * .17], [cs * .3, 0, sn * .3], .024, .03, 4);
      if (L <= 3) box(c, [cs * .31, .015, sn * .31], [.05, .015, .035], { yaw: -a / D2R }); }
    prism(c, [0, .68, 0], [0, .76, 0], .12, .2, 8, true);
    prism(c, [0, .97, 0], [0, 1.02, 0], .33, .34, L <= 3 ? 10 : 6, false);
    const st = L <= 2 ? 8 : L <= 3 ? 6 : 4;
    for (let i = 0; i < st; i++) { const a = i / st * 2 * Math.PI, cs = Math.cos(a), sn = Math.sin(a); prism(c, [cs * .19, .74, sn * .19], [cs * .335, 1.0, sn * .335], .014, .014, 4); }
    if (L <= 2) { prism(c, [0, .84, 0], [0, .87, 0], .26, .265, 10, false); prism(c, [0, .36, 0], [0, .385, 0], .225, .225, 8, false); }
    if (L <= 3) { paint(c, T.char, 'oklch(0.85 0.01 40)', .95); prism(c, [0, .76, 0], [0, .93, 0], .19, .07, 7, 'top');
      const r = () => c.random(); for (let i = 0; i < 6; i++) { const a = i + r(); box(c, [Math.cos(a) * .12, .9, Math.sin(a) * .12], [.045, .03, .035], { yaw: r() * 90, roll: 20 }, .7); } }
  },
  campfire(c, L) {
    if (L >= 5) { field(c); prism(c, [0, 0, 0], [0, .2, 0], .62, .5, 6, 'top'); return; }
    ash(c); prism(c, [0, 0, 0], [0, .03, 0], .52, .48, L <= 3 ? 10 : 6, 'top');
    stones(c, .6, L <= 3 ? 9 : 6, .2, () => c.random(), L);
    const nl = L <= 2 ? 5 : 4;
    for (let i = 0; i < nl; i++) { const a = i / nl * 2 * Math.PI + .3; log(c, [Math.cos(a) * .44, .05, Math.sin(a) * .44], [Math.cos(a) * .05, .36, Math.sin(a) * .05], .05, L <= 2 ? 6 : 4, .35); }
    if (L <= 2) { bark(c); prism(c, [.62, .04, -.5], [.95, .05, -.38], .045, .04, 5); prism(c, [.7, .04, -.62], [1.02, .05, -.56], .04, .04, 5); }
  },
  bonfire(c, L) {
    if (L >= 5) { bark(c); prism(c, [0, 0, 0], [0, 1.8, 0], 1.2, .05, 5, false); return; }
    ash(c); prism(c, [0, 0, 0], [0, .04, 0], 1.18, 1.1, L <= 3 ? 12 : 8, 'top');
    stones(c, 1.32, L <= 3 ? 15 : 9, .32, () => c.random(), L);
    const nl = L <= 2 ? 11 : L <= 3 ? 8 : 6;
    for (let i = 0; i < nl; i++) { const a = i / nl * 2 * Math.PI, rr = .95 + (i % 2) * .1; log(c, [Math.cos(a) * rr, .06, Math.sin(a) * rr], [Math.cos(a + .25) * .1, 1.75 + (i % 3) * .08, Math.sin(a + .25) * .1], .095, L <= 2 ? 6 : 5, .45); }
    if (L <= 3) { log(c, [-.85, .1, -.3], [.85, .12, -.2], .1, 6, .2); log(c, [-.3, .1, .85], [-.2, .12, -.85], .1, 6, .2); }
  },
  sconce(c, L) {
    iron(c);
    if (L >= 5) { box(c, [0, .16, .13], [.06, .16, .12]); return; }
    box(c, [0, .16, .24], [.06, .16, .012]);
    if (L <= 3) { box(c, [0, .33, .24], [.03, .03, .01], { roll: 45 }); box(c, [0, -.01, .24], [.03, .03, .01], { roll: 45 }); }
    if (L <= 2) { flat(c, 'oklch(0.3 0.01 250)', .5); c.metalness(.7); for (const y of [.05, .27]) box(c, [0, y, .225], [.012, .012, .006]); iron(c); }
    prism(c, [0, .12, .23], [0, .15, .06], .012, .012, 4, false, 45); prism(c, [0, .15, .06], [0, .19, 0], .012, .012, 4, false, 45);
    if (L <= 3) prism(c, [0, .26, .23], [0, .165, .05], .009, .009, 4, false, 45);
    prism(c, [0, .185, 0], [0, .21, 0], .055, .07, 8, true);
    flat(c, 'oklch(0.9 0.04 88)', .7); prism(c, [0, .21, 0], [0, .275, 0], .021, .019, 6, 'top');
    if (L <= 2) { flat(c, 'oklch(0.2 0.01 50)', .9); prism(c, [0, .275, 0], [0, .292, 0], .003, .002, 3, false); }
  },
  tallowLamp(c, L) {
    paint(c, T.soap, 'oklch(0.9 0.02 165)', .7);
    if (L >= 5) { prism(c, [0, 0, 0], [0, .05, 0], .07, .095, 5); return; }
    prism(c, [0, 0, 0], [0, .05, 0], .068, .095, L <= 3 ? 9 : 6, 'bottom');
    prism(c, [0, .05, 0], [0, .036, 0], .095, .08, L <= 3 ? 9 : 6, false);
    if (L <= 3) { box(c, [0, .044, -.098], [.022, .007, .03]); box(c, [0, .03, .1], [.018, .012, .022]); }
    flat(c, 'oklch(0.9 0.05 92)', .55); prism(c, [0, .03, 0], [0, .037, 0], .082, .082, L <= 3 ? 9 : 6, 'top');
    if (L <= 2) { flat(c, 'oklch(0.2 0.01 50)', .9); prism(c, [0, .037, 0], [0, .07, 0], .004, .003, 3, false); }
  },
  hornLantern(c, L) {
    iron(c);
    if (L >= 5) { box(c, [0, .22, 0], [.1, .22, .1]); return; }
    box(c, [0, .015, 0], [.105, .015, .105]); box(c, [0, .33, 0], [.105, .012, .105]);
    prism(c, [0, .342, 0], [0, .43, 0], .148, .02, 4, false, 45);
    if (L <= 4) for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(c, [x * .095, .175, z * .095], [.01, .15, .01]);
    if (L <= 3) { const n = 8, R = .04, cy = .47; for (let i = 0; i < n; i++) { const a0 = i / n * 2 * Math.PI, a1 = (i + 1) / n * 2 * Math.PI; prism(c, [Math.cos(a0) * R, cy + Math.sin(a0) * R, 0], [Math.cos(a1) * R, cy + Math.sin(a1) * R, 0], .006, .006, 4, false); } }
    if (L <= 2) for (const [x, z, w, d] of [[0, -.097, .09, .004], [0, .097, .09, .004], [-.097, 0, .004, .09], [.097, 0, .004, .09]]) box(c, [x, .175, z], [w, .006, d]);
    if (L <= 3) { flat(c, 'oklch(0.92 0.04 88)', .7); prism(c, [0, .03, 0], [0, .135, 0], .02, .018, 6, 'top'); }
    if (L <= 2) { flat(c, 'oklch(0.2 0.01 50)', .9); prism(c, [0, .135, 0], [0, .15, 0], .003, .002, 3, false); }
    c.albedo(null); c.color('oklch(0.6 0.12 62)', .62); c.roughness(.7); c.metalness(0);
    const y0 = .03, y1 = .318, e = .088;
    c.quad(-e, y0, -e, e, y0, -e, e, y1, -e, -e, y1, -e); c.quad(e, y0, e, -e, y0, e, -e, y1, e, e, y1, e);
    c.quad(-e, y0, e, -e, y0, -e, -e, y1, -e, -e, y1, e); c.quad(e, y0, -e, e, y0, e, e, y1, e, e, y1, -e);
    c.color('oklch(1 0 0)', 1);
  },
  // AUTOFILL v2 #12: a horn lantern hung from an oak post's arm (no lantern ever sits on the grass). The lantern hangs over the origin;
  // the post stands 0.42 m behind it (+Z). Flame at y 1.72 (lamps.js lanternPost.flameY).
  lanternPost(c, L) {
    const Y = 1.55;
    oak(c); prism(c, [0, 0, .42], [0, 2.28, .42], .075, .062, L <= 2 ? 6 : 5, 'top', 10);
    if (L >= 5) { iron(c); box(c, [0, Y + .2, 0], [.1, .2, .1]); return; }
    prism(c, [0, 2.16, .48], [0, 2.16, -.06], .045, .04, 5, true, 45); // the arm
    if (L <= 3) { prism(c, [0, 1.86, .42], [0, 2.12, .1], .03, .028, 4, false, 45); field(c); for (let i = 0; i < 4; i++) { const a = i * 1.6 + .3; box(c, [Math.cos(a) * .16, .05, .42 + Math.sin(a) * .16], [.09, .06, .07], { yaw: a / D2R, roll: 8 }, .7, true); } }
    iron(c); prism(c, [0, 2.14, 0], [0, Y + .43, 0], .008, .008, 4, false); // the hook
    box(c, [0, Y + .015, 0], [.105, .015, .105]); box(c, [0, Y + .33, 0], [.105, .012, .105]);
    prism(c, [0, Y + .342, 0], [0, Y + .43, 0], .148, .02, 4, false, 45);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(c, [x * .095, Y + .175, z * .095], [.01, .15, .01]);
    if (L <= 3) { flat(c, 'oklch(0.92 0.04 88)', .7); prism(c, [0, Y + .03, 0], [0, Y + .135, 0], .02, .018, 6, 'top'); }
    c.albedo(null); c.color('oklch(0.6 0.12 62)', .62); c.roughness(.7); c.metalness(0);
    const y0 = Y + .03, y1 = Y + .318, e = .088;
    c.quad(-e, y0, -e, e, y0, -e, e, y1, -e, -e, y1, -e); c.quad(e, y0, e, -e, y0, e, -e, y1, e, e, y1, e);
    c.quad(-e, y0, e, -e, y0, -e, -e, y1, -e, -e, y1, e); c.quad(e, y0, -e, e, y0, e, e, y1, e, e, y1, -e);
    c.color('oklch(1 0 0)', 1);
  },
  forge(c, L) {
    stone(c);
    if (L >= 5) { box(c, [0, .45, 0], [.62, .45, .48]); return; }
    box(c, [0, .36, 0], [.6, .36, .45], null, .96, true);
    if (L <= 4) box(c, [0, 1.0, .38], [.6, .28, .08], null, .88);
    if (L <= 3) { const r = () => c.random(); for (const [x, z, hx, hz] of [[0, -.39, .6, .06], [-.54, 0, .06, .33], [.54, 0, .06, .33]]) box(c, [x + (r() - .5) * .02, .76, z], [hx, .045, hz], { yaw: (r() - .5) * 2 }, .9); }
    ash(c); box(c, [0, .73, 0], [.48, .02, .33]);
    paint(c, T.char, 'oklch(0.85 0.01 40)', .95); prism(c, [0, .74, .02], [0, .82, .02], .26, .12, 7, 'top');
    if (L <= 3) { flat(c, 'oklch(0.66 0.09 45)', .9); prism(c, [0, .8, .32], [0, .8, .16], .045, .04, 6, 'top'); }
    if (L <= 3) {
      oak(c); box(c, [.92, .24, .05], [.2, .24, .25], null, 1, true);
      box(c, [.92, .5, .08], [.17, .015, .3]); box(c, [.92, .66, .08], [.17, .015, .3], { pitch: -6 });
      flat(c, 'oklch(0.48 0.06 50)', .9); box(c, [.92, .58, .12], [.15, .065, .24], null, .9);
      iron(c); prism(c, [.92, .58, -.2], [.62, .74, -.1], .03, .02, 5);
      if (L <= 2) { oak(c); prism(c, [.92, .67, .36], [.92, 1.0, .62], .02, .018, 5); }
    }
  },
  hearth(c, L) {
    if (L >= 5) { field(c); box(c, [0, .1, 0], [1.2, .1, .5]); return; }
    ash(c); box(c, [0, .02, 0], [1.06, .025, .36]);
    if (L >= 4) { field(c); for (const [x, z, hx, hz] of [[0, -.46, 1.2, .1], [0, .46, 1.2, .1], [-1.12, 0, .1, .36], [1.12, 0, .1, .36]]) box(c, [x, .1, z], [hx, .1, hz], null, .8, true); }
    else {
      field(c); const r = () => c.random(), pts = [];
      for (let x = -1.05; x <= 1.06; x += .3) pts.push([x, -.46, 0], [x + .1, .46, 0]);
      for (const z of [-.18, .18]) pts.push([-1.14, z, 90], [1.14, z, 90]);
      for (const [x, z, yaw] of pts) { const s = .17 + r() * .05; box(c, [x, s * .45, z], [s * .78, s * .5, s * .5], { yaw: yaw + (r() - .5) * 18, roll: (r() - .5) * 10 }, .7, true); }
    }
    const nl = L <= 3 ? 3 : 2;
    for (let i = 0; i < nl; i++) { const z = (i - (nl - 1) / 2) * .16; log(c, [-.72, .07, z + .04], [.62, .08 + i % 2 * .03, z - .03], .065, L <= 2 ? 6 : 5, .5); }
    if (L <= 2) { bark(c); prism(c, [-.3, .05, .22], [.1, .16, -.2], .035, .03, 5); prism(c, [.25, .05, -.24], [.4, .15, .2], .035, .03, 5); }
  },
};
export function geometry(ctx) {
  ctx.flat(); const L = ctx.lod || 1, k = ctx.params?.kind;
  (KINDS[k] || KINDS.torch)(ctx, L);
  ctx.albedo(null); ctx.metalness(0);
}
export function collider(ctx) {
  const k = ctx.params?.kind;
  if (k === 'torch') return { kind: 'box', width: .22, height: 2, depth: .22 };
  if (k === 'brazier') return { kind: 'box', width: .7, height: 1.02, depth: .7 };
  if (k === 'lanternPost') { box(ctx, [0, 1.14, .42], [.07, 1.14, .07]); return; }
  if (k === 'campfire') return { kind: 'box', width: 1.4, height: .3, depth: 1.4 };
  if (k === 'bonfire') return { kind: 'box', width: 2.8, height: 1.6, depth: 2.8 };
  if (k === 'forge') { box(ctx, [0, .45, 0], [.6, .45, .45]); box(ctx, [.92, .37, .05], [.2, .37, .3]); return; }
  if (k === 'hearth') { for (const [x, z, hx, hz] of [[0, -.46, 1.2, .1], [0, .46, 1.2, .1], [-1.12, 0, .1, .36], [1.12, 0, .1, .36]]) box(ctx, [x, .1, z], [hx, .1, hz]); return; }
  return null;
}
