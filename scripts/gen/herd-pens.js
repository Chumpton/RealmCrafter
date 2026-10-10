// The livestock pens: split-rail fences on ground-matched posts making a sheep fold, a pig sty (mud wallow, low turf
// shelter on a straw bed, slop trough) and a cattle paddock (water trough, slatted hay rack), gates swung ajar, two lanterns.
// Drawn from scripts/lib/data/herd.js LAYOUT (pen-local metres about ORIGIN). params: oz/ox = ORIGIN − this row's feet,
// hg = ground offsets on LAYOUT.grid (sampled once at spawn, so no groundY read here and the levels survive).
import { TEX, IRON, frame, q, tri, box, beam, cyl, lathe } from './yard-kit.js';
import { loft } from './herd-kit.js';
import { LAYOUT } from '../lib/data/herd.js';
const G = LAYOUT.grid;
let HG = null;
function gy(x, z) { // bilinear ground offset at pen-local x,z
  if (!HG) return 0;
  const fx = Math.max(0, Math.min(G.gw - 1.001, (x - G.gx0) / G.gs)), fz = Math.max(0, Math.min(G.gh - 1.001, (z - G.gz0) / G.gs));
  const i = Math.floor(fx), k = Math.floor(fz), u = fx - i, v = fz - k, h = (a, b) => HG[a + b * G.gw] ?? 0;
  return (h(i, k) * (1 - u) + h(i + 1, k) * u) * (1 - v) + (h(i, k + 1) * (1 - u) + h(i + 1, k + 1) * u) * v;
}
const WOOD = 'oklch(0.94 0.02 75)', GREY = 'oklch(0.9 0.012 80)';
function spans(f) { // solid intervals [s,e] along the segment, gaps cut out
  const L = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]); const out = []; let s = 0;
  for (const g of (f.gaps || []).slice().sort((p, r) => p.at - r.at)) { out.push([s, g.at - g.w / 2]); s = g.at + g.w / 2; }
  out.push([s, L]); return { L, out };
}
function posts(s, e) { const n = Math.max(1, Math.ceil((e - s) / 2.1)), p = []; for (let i = 0; i <= n; i++) p.push(s + (e - s) * i / n); return p; }
function fence(ctx, f, L5) {
  const { L, out } = spans(f), dx = (f.b[0] - f.a[0]) / L, dz = (f.b[1] - f.a[1]) / L, at = (t) => [f.a[0] + dx * t, f.a[1] + dz * t];
  const lod = ctx.lod, rails = lod >= 5 ? [f.rails[Math.floor(f.rails.length / 2)]] : f.rails;
  for (const [s, e] of out) {
    const P = posts(s, e);
    ctx.albedo(TEX.bark); ctx.color(GREY);
    for (let i = 0; i < P.length; i++) {
      const [x, z] = at(P[i]), g = gy(x, z), r = ctx.random(), lean = (r - .5) * .05, end = i === 0 || i === P.length - 1, rad = end ? .085 : .07;
      cyl(ctx, [x, g - .15, z], [x + lean, g + f.H + .1 + r * .08, z + lean * .5], rad, rad * .9, lod >= 4 ? 4 : 7, { phase: r * 3 });
    }
    ctx.albedo(TEX.wood); ctx.color(WOOD);
    for (let i = 0; i < P.length - 1; i++) {
      const t0 = Math.max(s, P[i] - .12), t1 = Math.min(e, P[i + 1] + .12), [x0, z0] = at(t0), [x1, z1] = at(t1), g0 = gy(x0, z0), g1 = gy(x1, z1);
      for (const h of rails) { const j = (ctx.random() - .5) * .05; beam(ctx, [x0, g0 + h + j, z0], [x1, g1 + h - j, z1], .085, .06 + ctx.random() * .025); }
    }
  }
  for (const g of f.gaps || []) gate(ctx, f, at, g);
}
function gate(ctx, f, at, g) { // a braced board gate hung on the left post, swung ~25° toward g.swing
  const [hx, hz] = at(g.at - g.w / 2), y = gy(hx, hz), L = g.w - .12, dx = (f.b[0] - f.a[0]), dz = (f.b[1] - f.a[1]), l = Math.hypot(dx, dz);
  const a = 25 * Math.PI / 180, ux = dx / l, uz = dz / l, sx = g.swing[0], sz = g.swing[1];
  const vx = ux * Math.cos(a) + sx * Math.sin(a), vz = uz * Math.cos(a) + sz * Math.sin(a), p = (t, h) => [hx + vx * (t + .08), y + h, hz + vz * (t + .08)];
  ctx.albedo(TEX.wood); ctx.color('oklch(0.92 0.025 70)');
  const H = f.H - .12;
  for (const h of [.3, H * .62, H]) beam(ctx, p(0, h), p(L, h), .05, .11);
  beam(ctx, p(.03, .2), p(.03, H + .06), .09, .07); beam(ctx, p(L - .03, .2), p(L - .03, H + .06), .09, .07);
  if (ctx.lod <= 3) { beam(ctx, p(.08, .32), p(L - .08, H - .04), .045, .09); ctx.albedo(null); ctx.color(IRON); ctx.metalness(.6);
    for (const h of [.34, H - .04]) beam(ctx, [hx, y + h, hz], p(.25, h), .03, .05); ctx.metalness(0); }
}
function heap(ctx, c, rx, rz, h, seg) { // a lumpy hay heap
  ctx.albedo(TEX.hay); ctx.color('oklch(0.95 0.04 90)');
  lathe(ctx, c, [[rx * 1.02, -.05], [rx, .05], [rx * .88, h * .45], [rx * .55, h * .85], [rx * .18, h], [0, h * 1.02]], seg, { jitter: .18 });
}
function lantern(ctx, l) {
  const g = gy(l.x, l.z), top = g + 2.25, ax = l.x + l.arm[0] * .55, az = l.z + l.arm[1] * .55;
  ctx.albedo(TEX.bark); ctx.color(GREY); cyl(ctx, [l.x, g - .2, l.z], [l.x, top + .1, l.z], .08, .07, ctx.lod >= 4 ? 4 : 7);
  ctx.albedo(TEX.wood); ctx.color(WOOD); beam(ctx, [l.x, top, l.z], [ax + l.arm[0] * .06, top, az + l.arm[1] * .06], .06, .07);
  if (ctx.lod <= 4) beam(ctx, [l.x, top - .45, l.z], [l.x + l.arm[0] * .35, top - .03, l.z + l.arm[1] * .35], .045, .05);
  ctx.albedo(null); ctx.color(IRON); ctx.metalness(.5); ctx.roughness(.6);
  const y0 = top - .58;
  if (ctx.lod <= 3) beam(ctx, [ax, top, az], [ax, y0 + .4, az], .015, .015);
  box(ctx, ax, y0, az, .22, .03, .22); box(ctx, ax, y0 + .3, az, .24, .04, .24);
  cyl(ctx, [ax, y0 + .34, az], [ax, y0 + .43, az], .1, .02, 5);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) beam(ctx, [ax + sx * .1, y0 + .03, az + sz * .1], [ax + sx * .1, y0 + .3, az + sz * .1], .02, .02);
  ctx.metalness(0); ctx.color('oklch(0.92 0.08 80)'); ctx.emissive(3.2, 1.9, .75); box(ctx, ax, y0 + .03, az, .17, .27, .17, 0, { bottom: true }); ctx.emissive(null); ctx.roughness(.9);
}
function shelter(ctx, s) { // the pigs' low lean-to: plank back and ends, turf roof, straw bed
  const lod = ctx.lod, g = (x, z) => gy(x, z), fh = s.front, bh = s.back;
  ctx.albedo(TEX.bark); ctx.color(GREY);
  for (const [x, z, h] of [[s.x0, s.z0, fh], [s.x1, s.z0, fh], [s.x0, s.z1, bh], [s.x1, s.z1, bh]]) cyl(ctx, [x, g(x, z) - .1, z], [x, g(x, z) + h, z], .08, .07, lod >= 4 ? 4 : 7);
  ctx.albedo(TEX.planks); ctx.color('oklch(0.93 0.02 70)');
  const wall = (a, b, ha, hb, n) => { const ga = g(a[0], a[1]), gb = g(b[0], b[1]); q(ctx, [a[0], ga - .05, a[1]], [b[0], gb - .05, b[1]], [b[0], gb + hb, b[1]], [a[0], ga + ha, a[1]], n); };
  wall([s.x0, s.z1 - .03], [s.x1, s.z1 - .03], bh, bh, [0, 0, 1]); wall([s.x0, s.z1 - .03], [s.x1, s.z1 - .03], bh, bh, [0, 0, -1]);
  for (const x of [s.x0 + .02, s.x1 - .02]) { const zm = s.z0 + (s.z1 - s.z0) * .35; for (const n of [[-1, 0, 0], [1, 0, 0]]) wall([x, zm], [x, s.z1], fh + (bh - fh) * .35, bh, n); }
  const ry = (z) => fh + (bh - fh) * (z - s.z0) / (s.z1 - s.z0), e = .35, za = s.z0 - e, zb = s.z1 + .2, xa = s.x0 - .25, xb = s.x1 + .25;
  const Y = (x, z) => Math.max(g(s.x0, s.z0), g(s.x1, s.z1)) + ry(z) + .06;
  ctx.albedo(TEX.planks); ctx.color('oklch(0.9 0.02 70)'); q(ctx, [xa, Y(xa, za), za], [xb, Y(xb, za), za], [xb, Y(xb, zb), zb], [xa, Y(xa, zb), zb], [0, -1, 0]);
  ctx.albedo(TEX.turf); ctx.color('oklch(0.93 0.05 125)'); const t = .14;
  q(ctx, [xa, Y(xa, za) + t, za], [xb, Y(xb, za) + t, za], [xb, Y(xb, zb) + t, zb], [xa, Y(xa, zb) + t, zb], [0, 1, 0]);
  q(ctx, [xa, Y(xa, za), za], [xb, Y(xb, za), za], [xb, Y(xb, za) + t, za], [xa, Y(xa, za) + t, za], [0, 0, -1]);
  for (const [x, n] of [[xa, -1], [xb, 1]]) q(ctx, [x, Y(x, za), za], [x, Y(x, zb), zb], [x, Y(x, zb) + t, zb], [x, Y(x, za) + t, za], [n, 0, 0]);
  q(ctx, [xa, Y(xa, zb), zb], [xb, Y(xb, zb), zb], [xb, Y(xb, zb) + t, zb], [xa, Y(xa, zb) + t, zb], [0, 0, 1]);
  if (lod <= 2) { ctx.color('oklch(0.9 0.07 130)'); for (let x = xa + .1; x < xb; x += .22) { const z = za, y = Y(x, z) + t * .4, r = ctx.random() * .1; tri(ctx, [x, y, z - .01], [x + .14, y, z - .01], [x + .07, y - .14 - r, z - .02], [0, 0, -1]); } }
  ctx.albedo(TEX.wood); ctx.color(WOOD); beam(ctx, [xa + .1, Y(0, s.z0) - .06, s.z0], [xb - .1, Y(0, s.z0) - .06, s.z0], .12, .12);
  if (lod <= 3) { ctx.albedo(TEX.hay); ctx.color('oklch(0.95 0.04 90)'); // the straw bed
    const N = 5; for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const x0 = s.x0 + .1 + (s.x1 - s.x0 - .2) * i / N, x1 = s.x0 + .1 + (s.x1 - s.x0 - .2) * (i + 1) / N, z0 = s.z0 - .25 + (s.z1 - s.z0 + .2) * k / 3, z1 = s.z0 - .25 + (s.z1 - s.z0 + .2) * (k + 1) / 3;
      const h = () => .05 + ctx.random() * .05; q(ctx, [x0, g(x0, z0) + h(), z0], [x1, g(x1, z0) + h(), z0], [x1, g(x1, z1) + h(), z1], [x0, g(x0, z1) + h(), z1], [0, 1, 0]); } }
}
function wallow(ctx, w, floor) {
  const seg = ctx.lod <= 2 ? 18 : ctx.lod <= 3 ? 12 : 8, ring = (k, dy) => { const a = []; for (let i = 0; i < seg; i++) { const t = i / seg * Math.PI * 2, wob = 1 + Math.sin(t * 3 + 1) * .08, x = w.x + Math.cos(t) * w.rx * k * wob, z = w.z + Math.sin(t) * w.rz * k * wob; a.push([x, gy(x, z) + dy, z]); } return a; };
  const outer = ring(1.25, .045), inner = ring(1, .055), c = [w.x, gy(w.x, w.z) + .05, w.z];
  ctx.albedo(TEX.earth); ctx.color('oklch(0.9 0.03 60)'); ctx.roughness(.8);
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; q(ctx, outer[i], outer[j], inner[j], inner[i], [0, 1, 0]); }
  ctx.albedo(null); ctx.color('oklch(0.34 0.045 55)'); ctx.roughness(.22);
  for (let i = 0; i < seg; i++) tri(ctx, c, inner[i], inner[(i + 1) % seg], [0, 1, 0]);
  ctx.roughness(.9);
}
function floorPatch(ctx, x0, x1, z0, z1, dy) { // trampled earth following the ground grid
  ctx.albedo(TEX.earth); ctx.color('oklch(0.92 0.03 70)');
  const st = ctx.lod <= 2 ? 1 : ctx.lod <= 3 ? 2 : 3;
  for (let x = x0; x < x1 - 1e-3; x += st) for (let z = z0; z < z1 - 1e-3; z += st) { const xb = Math.min(x1, x + st), zb = Math.min(z1, z + st);
    q(ctx, [x, gy(x, z) + dy, z], [xb, gy(xb, z) + dy, z], [xb, gy(xb, zb) + dy, zb], [x, gy(x, zb) + dy, zb], [0, 1, 0]); }
}
function waterTrough(ctx, t) {
  const g = gy(t.x, t.z), L = t.len, W = .55, H = .5;
  ctx.albedo(TEX.planks); ctx.color('oklch(0.92 0.02 70)'); box(ctx, t.x, g - .05, t.z, L, H + .05, W);
  ctx.albedo(TEX.wood); ctx.color(WOOD);
  beam(ctx, [t.x - L / 2 - .04, g + H + .03, t.z - W / 2], [t.x + L / 2 + .04, g + H + .03, t.z - W / 2], .07, .06);
  beam(ctx, [t.x - L / 2 - .04, g + H + .03, t.z + W / 2], [t.x + L / 2 + .04, g + H + .03, t.z + W / 2], .07, .06);
  for (const s of [-1, 1]) beam(ctx, [t.x + s * L / 2, g + H + .03, t.z - W / 2], [t.x + s * L / 2, g + H + .03, t.z + W / 2], .07, .06);
  ctx.albedo(null); ctx.color('oklch(0.62 0.075 195)'); ctx.roughness(.08);
  q(ctx, [t.x - L / 2 + .04, g + H + .01, t.z - W / 2 + .04], [t.x + L / 2 - .04, g + H + .01, t.z - W / 2 + .04], [t.x + L / 2 - .04, g + H + .01, t.z + W / 2 - .04], [t.x - L / 2 + .04, g + H + .01, t.z + W / 2 - .04], [0, 1, 0]);
  ctx.roughness(.9);
  if (ctx.lod <= 3) { ctx.color(IRON); ctx.metalness(.6); for (const s of [-.6, .6]) box(ctx, t.x + s * L / 2, g + .08, t.z, .03, .36, W + .02); ctx.metalness(0); }
}
function hayRack(ctx, r) { // two A-frame trestles, a slatted V hopper, hay heaped in it; runs along x
  const g = gy(r.x, r.z), L = r.len, lod = ctx.lod;
  ctx.albedo(TEX.wood); ctx.color(WOOD);
  for (const s of [-1, 1]) { const x = r.x + s * (L / 2 - .05);
    beam(ctx, [x, g - .1, r.z - .5], [x, g + 1.45, r.z - .05], .08, .08); beam(ctx, [x, g - .1, r.z + .5], [x, g + 1.45, r.z + .05], .08, .08);
    beam(ctx, [x, g + .55, r.z - .4], [x, g + .55, r.z + .4], .07, .07); }
  beam(ctx, [r.x - L / 2, g + .55, r.z], [r.x + L / 2, g + .55, r.z], .08, .08);
  for (const s of [-1, 1]) beam(ctx, [r.x - L / 2, g + 1.3, r.z + s * .45], [r.x + L / 2, g + 1.3, r.z + s * .45], .07, .07);
  const n = lod <= 2 ? 9 : lod <= 3 ? 5 : 3;
  for (let i = 1; i < n; i++) { const x = r.x - L / 2 + L * i / n; for (const s of [-1, 1]) beam(ctx, [x, g + .58, r.z + s * .05], [x, g + 1.31, r.z + s * .44], .04, .03); }
  ctx.albedo(TEX.hay); ctx.color('oklch(0.95 0.04 90)');
  frame(r.x + OX, g + .7, r.z + OZ, 90);
  loft(ctx, [[0, .0, -L / 2 + .1, .08, .08], [0, .25, -L / 2 + .3, .34, .35], [0, .32, 0, .4, .45], [0, .25, L / 2 - .3, .34, .35], [0, 0, L / 2 - .1, .08, .08]], lod <= 2 ? 9 : 6, lod <= 2 ? .25 : .1);
  frame(OX, 0, OZ);
  if (lod <= 3) heap(ctx, [r.x + .3, g, r.z - .7], .45, .3, .3, 7); // spilled under the rack
}
function pigTrough(ctx, t) {
  const g = gy(t.x, t.z);
  ctx.albedo(TEX.wood); ctx.color('oklch(0.88 0.03 65)'); box(ctx, t.x, g - .03, t.z, .45, .28, t.len, 0);
  ctx.albedo(null); ctx.color('oklch(0.6 0.05 85)'); ctx.roughness(.4);
  q(ctx, [t.x - .17, g + .22, t.z - t.len / 2 + .05], [t.x + .17, g + .22, t.z - t.len / 2 + .05], [t.x + .17, g + .22, t.z + t.len / 2 - .05], [t.x - .17, g + .22, t.z + t.len / 2 - .05], [0, 1, 0]); ctx.roughness(.9);
}
function smalls(ctx) {
  const b = LAYOUT.bucket, s = LAYOUT.stool, gb = gy(b.x, b.z), gs = gy(s.x, s.z);
  ctx.albedo(TEX.wood); ctx.color(WOOD); lathe(ctx, [b.x, gb, b.z], [[0, 0], [.13, 0], [.16, .3], [.15, .31], [.13, .03], [0, .03]], 9);
  ctx.albedo(null); ctx.color(IRON); for (const h of [.06, .24]) lathe(ctx, [b.x, gb + h, b.z], [[.135 + h * .1, 0], [.14 + h * .1, .025]], 9);
  ctx.albedo(TEX.wood); ctx.color(WOOD); cyl(ctx, [s.x, gs + .4, s.z], [s.x, gs + .45, s.z], .17, .17, 9);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; cyl(ctx, [s.x + Math.cos(a) * .1, gs + .41, s.z + Math.sin(a) * .1], [s.x + Math.cos(a) * .19, gs - .02, s.z + Math.sin(a) * .19], .025, .02, 5); }
}
let OX = 0, OZ = 0;
export function geometry(ctx) {
  const p = ctx.params || {}; HG = p.hg || null; OX = p.ox || 0; OZ = p.oz || 0; frame(OX, 0, OZ);
  ctx.flat(); ctx.roughness(.9); ctx.metalness(0);
  const lod = ctx.lod;
  if (lod <= 4) { floorPatch(ctx, 0.15, 5.85, -7.35, -0.15, .035); wallow(ctx, LAYOUT.wallow); }
  for (const f of LAYOUT.fences) fence(ctx, f);
  shelter(ctx, LAYOUT.shelter);
  waterTrough(ctx, LAYOUT.waterTrough);
  hayRack(ctx, LAYOUT.hayRack);
  if (lod <= 4) { heap(ctx, [LAYOUT.hay.x, gy(LAYOUT.hay.x, LAYOUT.hay.z), LAYOUT.hay.z], .75, .65, .85, lod <= 2 ? 11 : 7); pigTrough(ctx, LAYOUT.pigTrough); }
  for (const l of LAYOUT.lamps) lantern(ctx, l);
  if (lod <= 2) smalls(ctx);
  frame();
}
export function collider(ctx) { // fence sheets between posts (gaps open), shelter walls, troughs, rack, heap: what a body touches
  const p = ctx.params || {}; HG = p.hg || null; OX = p.ox || 0; OZ = p.oz || 0; frame(OX, 0, OZ);
  for (const f of LAYOUT.fences) { const { L, out } = spans(f), dx = (f.b[0] - f.a[0]) / L, dz = (f.b[1] - f.a[1]) / L, n = [dz, 0, -dx];
    for (const [s, e] of out) { const P = posts(s, e); for (let i = 0; i < P.length - 1; i++) { const x0 = f.a[0] + dx * P[i], z0 = f.a[1] + dz * P[i], x1 = f.a[0] + dx * P[i + 1], z1 = f.a[1] + dz * P[i + 1];
      q(ctx, [x0, gy(x0, z0) - .3, z0], [x1, gy(x1, z1) - .3, z1], [x1, gy(x1, z1) + f.H + .1, z1], [x0, gy(x0, z0) + f.H + .1, z0], n); } } }
  const s = LAYOUT.shelter, cb = (x, z, w, h, d) => box(ctx, x, gy(x, z) - .2, z, w, h + .2, d, 0, { bottom: true });
  cb((s.x0 + s.x1) / 2, s.z1 - .03, s.x1 - s.x0, s.back, .1); for (const x of [s.x0, s.x1]) cb(x, (s.z0 + s.z1) / 2 + .4, .12, s.back, (s.z1 - s.z0) * .6);
  const w = LAYOUT.waterTrough; cb(w.x, w.z, w.len + .1, .55, .62);
  const r = LAYOUT.hayRack; cb(r.x, r.z, r.len, 1.4, 1);
  const t = LAYOUT.pigTrough; cb(t.x, t.z, .45, .25, t.len);
  const h = LAYOUT.hay; cb(h.x, h.z, 1.2, .6, 1.2);
  for (const l of LAYOUT.lamps) cb(l.x, l.z, .16, 2.3, .16);
  frame();
}
