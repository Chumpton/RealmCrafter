// Frostpeak scripted props (the bible's Frostpeak pieces we don't own as models), low-poly like sv-props.js.
// kind = "sled" (frozen pack sled: runners, plank deck, lashed crates and furs, snow on the load; front -Z),
// "eave" (two stone piers under a rock slab, 0.5-2 m icicles hanging off its lips, snow on top; 3 m wide),
// "spar" (dead frosted pine snag, ~6 m, broken stubs, snow collar), "cairn" (stacked road cairn with a marker pole and cloth).
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const add = (...v) => v.reduce((s, a) => [s[0] + a[0], s[1] + a[1], s[2] + a[2]], [0, 0, 0]);
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
// basis for a box: yaw about Y then tilt (roll about the box's own Z, pitch about X), all radians
function basis(yaw = 0, pitch = 0, roll = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  let X = [cr, sr, 0], Y = [-sr, cr, 0], Z = [0, 0, 1];
  const P = (v) => [v[0], v[1] * cp - v[2] * sp, v[1] * sp + v[2] * cp];
  X = P(X); Y = P(Y); Z = P(Z);
  const W = (v) => [v[0] * cy + v[2] * sy, v[1], -v[0] * sy + v[2] * cy];
  return [W(X), W(Y), W(Z)];
}
// oriented box: centre c, half sizes hx,hy,hz, basis B; faces CCW from outside
function obox(ctx, c, hx, hy, hz, B = basis()) {
  const ex = mul(B[0], hx), ey = mul(B[1], hy), ez = mul(B[2], hz);
  const face = (n, u, v) => { const o = add(c, n); const p = (a, b) => add(o, mul(u, a), mul(v, b)); ctx.quad(...p(-1, -1), ...p(1, -1), ...p(1, 1), ...p(-1, 1)); };
  face(ex, ey, ez); face(mul(ex, -1), ez, ey); face(ey, ez, ex); face(mul(ey, -1), ex, ez); face(ez, ex, ey); face(mul(ez, -1), ey, ex);
}
// a tapered tube a -> b, radius r0 -> r1 (r1 0 = a cone), n sides, capped
function rod(ctx, a, b, r0, r1 = r0, n = 6) {
  const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = nrm(crs(d, up)), v = crs(u, d);
  const P = (c, r, i) => { const t = (i / n) * Math.PI * 2; return add(c, mul(u, Math.cos(t) * r), mul(v, Math.sin(t) * r)); };
  for (let i = 0; i < n; i++) {
    const a0 = P(a, r0, i), a1 = P(a, r0, i + 1), b0 = P(b, r1, i), b1 = P(b, r1, i + 1);
    ctx.quad(...a0, ...a1, ...b1, ...b0);
    ctx.tri(...a, ...a1, ...a0); if (r1 > 0) ctx.tri(...b, ...b0, ...b1);
  }
}
const WOOD = "cdn/texture-weathered-oak-planks.png", STONE = "cdn/texture-rough-grey-fieldstone.png", GRANITE = "cdn/texture-weathered-grey-granite.png";
const IRON = "cdn/texture-dark-wrought-iron.png", FUR = "cdn/texture-shaggy-brown-fur-pelt.png", BARK = "cdn/texture-ancient-oak-bark-deep-furrows.png";
function snow(ctx) { ctx.albedo(null); ctx.color("oklch(0.97 0.012 240)"); ctx.roughness(0.95); ctx.metalness(0); ctx.emissive(null); }
function ice(ctx) { ctx.albedo(null); ctx.color("oklch(0.9 0.06 222)"); ctx.roughness(0.12); ctx.metalness(0); ctx.emissive("oklch(0.32 0.06 225)"); }

function sled(ctx) {
  const lod = ctx.lod ?? 1;
  ctx.flat(); ctx.albedo(WOOD); ctx.color("oklch(0.92 0.03 70)"); ctx.roughness(0.85); ctx.metalness(0);
  for (const sx of [-0.42, 0.42]) {
    obox(ctx, [sx, 0.04, 0.1], 0.05, 0.04, 1.0);                                   // runner
    obox(ctx, [sx, 0.13, -0.98], 0.05, 0.04, 0.14, basis(0, 0.7, 0));              // upcurve
    obox(ctx, [sx, 0.27, -1.08], 0.05, 0.04, 0.1, basis(0, 1.35, 0));
    for (const z of [-0.75, -0.2, 0.35, 0.9]) obox(ctx, [sx, 0.21, z], 0.035, 0.13, 0.035); // stanchions
  }
  for (let i = 0; i < 5; i++) obox(ctx, [-0.42 + i * 0.21, 0.37, 0.1], 0.095, 0.025, 1.0); // deck planks
  obox(ctx, [0, 0.36, -0.98], 0.5, 0.03, 0.04);                                       // front bar
  for (const sx of [-0.42, 0.42]) obox(ctx, [sx, 0.72, 1.05], 0.03, 0.34, 0.03, basis(0, -0.18, 0)); // handles
  obox(ctx, [0, 1.04, 1.11], 0.47, 0.03, 0.03);
  // load: two crates and a fur bundle, lashed
  ctx.color("oklch(0.85 0.04 65)");
  obox(ctx, [-0.18, 0.66, 0.45], 0.26, 0.26, 0.28, basis(0.08));
  obox(ctx, [0.22, 0.6, -0.15], 0.22, 0.2, 0.24, basis(-0.12));
  ctx.albedo(FUR); ctx.color("oklch(0.9 0.03 60)");
  rod(ctx, [-0.35, 0.55, -0.55], [0.35, 0.55, -0.55], 0.17, 0.17, lod > 2 ? 5 : 8);
  if (lod < 3) {
    ctx.albedo(IRON); ctx.color("oklch(0.85 0 0)"); ctx.roughness(0.6);
    obox(ctx, [-0.18, 0.66, 0.45], 0.275, 0.27, 0.02, basis(0.08));
    obox(ctx, [0, 0.6, -0.55], 0.02, 0.19, 0.19);
    // snow on the load and the deck ends
    snow(ctx);
    obox(ctx, [-0.18, 0.95, 0.45], 0.27, 0.035, 0.29, basis(0.08));
    obox(ctx, [0.22, 0.82, -0.15], 0.21, 0.03, 0.23, basis(-0.12));
    obox(ctx, [0.05, 0.41, 0.98], 0.4, 0.02, 0.12);
    // frost beard on the runner tips
    ice(ctx); for (const sx of [-0.42, 0.42]) rod(ctx, [sx, 0.3, -1.12], [sx, 0.12, -1.13], 0.03, 0, 4);
  }
}
function eave(ctx) {
  const lod = ctx.lod ?? 1, R = () => ctx.random();
  ctx.flat(); ctx.albedo(GRANITE); ctx.color("oklch(0.9 0.012 250)"); ctx.roughness(0.9); ctx.metalness(0);
  obox(ctx, [-1.05, 1.3, 0.05], 0.42, 1.3, 0.5, basis(0.2, 0.03, -0.04));       // piers, a little out of true
  obox(ctx, [1.1, 1.25, -0.05], 0.38, 1.25, 0.46, basis(-0.25, -0.02, 0.05));
  obox(ctx, [0.02, 2.78, 0], 1.65, 0.26, 0.85, basis(0.05, 0.04, 0.03));       // the slab
  if (lod < 4) { ctx.albedo(STONE); obox(ctx, [-1.0, 0.18, -0.55], 0.45, 0.2, 0.3, basis(0.6)); obox(ctx, [0.9, 0.14, 0.6], 0.35, 0.15, 0.28, basis(-0.4)); }
  snow(ctx);
  obox(ctx, [0.02, 3.08, 0.02], 1.6, 0.06, 0.8, basis(0.05, 0.04, 0.03));
  if (lod < 3) { obox(ctx, [0.6, 3.17, 0.1], 0.7, 0.05, 0.5, basis(0.25)); obox(ctx, [-1.05, 0.06, -0.15], 0.75, 0.06, 0.75, basis(0.3)); }
  // icicles off both long lips: long ones in the middle, 0.5-2 m
  ice(ctx);
  const n = lod >= 4 ? 4 : lod === 3 ? 7 : 13;
  for (const side of [-1, 1]) for (let i = 0; i < n; i++) {
    const x = -1.4 + (2.8 * (i + 0.5)) / n + (R() - 0.5) * 0.12;
    const mid = 1 - Math.abs(x) / 1.6, L = (0.5 + mid * 1.3) * (0.6 + R() * 0.5) * (side > 0 ? 1 : 0.7);
    const top = 2.53 + x * 0.03, z = side * 0.8 + side * (R() * 0.04);
    rod(ctx, [x, top, z], [x + (R() - 0.5) * 0.05, top - L, z], 0.05 + mid * 0.05, 0, 5);
  }
}
function spar(ctx) {
  const lod = ctx.lod ?? 1, R = () => ctx.random(), H = ctx.params.h ?? 6;
  ctx.flat(); ctx.albedo(BARK); ctx.color("oklch(0.82 0.015 240)"); ctx.roughness(0.95); ctx.metalness(0);
  const lean = [0.25, H, 0.12];
  rod(ctx, [0, -0.2, 0], lean, 0.24, 0.04, lod > 2 ? 5 : 7);
  if (lod < 4) for (let i = 0; i < 9; i++) {
    const t = 0.25 + (i / 9) * 0.65, a = i * 2.4 + R(), p = mul(lean, t), L = (1 - t) * 1.6 + 0.3;
    rod(ctx, p, add(p, [Math.cos(a) * L, -0.25 - R() * 0.3, Math.sin(a) * L]), 0.06 * (1 - t) + 0.02, 0.01, 4);
  }
  snow(ctx);
  rod(ctx, [0, -0.05, 0], [0, 0.3, 0], 0.75, 0.22, 7);                       // drift collar
  if (lod < 3) { ice(ctx); ctx.color("oklch(0.95 0.03 225)"); for (let i = 0; i < 4; i++) { const p = mul(lean, 0.35 + i * 0.15); rod(ctx, add(p, [0.1, 0, 0]), add(p, [0.1, -0.35, 0.02]), 0.03, 0, 4); } }
}
function cairn(ctx) {
  const lod = ctx.lod ?? 1;
  ctx.flat(); ctx.albedo(STONE); ctx.color("oklch(0.88 0.01 250)"); ctx.roughness(0.9); ctx.metalness(0);
  const st = [[0.42, 0.16, 0], [0.36, 0.14, 0.5], [0.3, 0.13, 1.1], [0.24, 0.12, 0.3], [0.17, 0.1, 1.6]];
  let y = 0;
  for (const [r, h, a] of st) { obox(ctx, [0.02 * Math.sin(a * 3), y + h, 0.02 * Math.cos(a * 3)], r, h, r * 0.85, basis(a, 0, 0.06 * Math.sin(a))); y += h * 2 - 0.02; }
  snow(ctx); obox(ctx, [0, y + 0.03, 0], 0.15, 0.04, 0.13, basis(1.6));
  if (lod < 3) obox(ctx, [0.3, 0.05, 0.1], 0.5, 0.05, 0.42, basis(0.4));
  ctx.albedo(WOOD); ctx.color("oklch(0.75 0.03 60)"); ctx.roughness(0.85);
  rod(ctx, [0, y - 0.1, 0], [0.04, y + 1.3, 0], 0.035, 0.025, 5);
  ctx.albedo(null); ctx.color("oklch(0.55 0.13 250)"); ctx.roughness(0.9);
  obox(ctx, [0.2, y + 1.1, 0], 0.17, 0.1, 0.008, basis(0, 0, -0.15));
}
export function geometry(ctx) {
  const k = ctx.params.kind;
  ({ sled, eave, spar, cairn }[k] ?? cairn)(ctx);
}
export function collider(ctx) {
  const k = ctx.params.kind;
  if (k === "sled") return { kind: "box", width: 1.0, height: 1.0, depth: 2.3, center: [0, 0.5, 0] };
  if (k === "spar") return { kind: "box", width: 0.45, height: ctx.params.h ?? 6, depth: 0.45, center: [0.12, (ctx.params.h ?? 6) / 2, 0.06] };
  if (k === "cairn") return { kind: "box", width: 0.85, height: 1.3, depth: 0.75, center: [0, 0.65, 0] };
  // eave: two piers and the slab; walkers pass under it
  obox(ctx, [-1.05, 1.3, 0.05], 0.42, 1.3, 0.5, basis(0.2));
  obox(ctx, [1.1, 1.25, -0.05], 0.38, 1.25, 0.46, basis(-0.25));
  obox(ctx, [0.02, 2.78, 0], 1.65, 0.3, 0.85);
}
