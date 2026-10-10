// Emberwood props the bible names that the kit lacks (2026-10-10, Campton's master bible, Emberwood):
// kind = "ciderpress" (oak screw press over a staved tub, apple heap, bucket; front −Z),
// "fungilog" (rotting fallen log with orange shelf fungi and moss, along X),
// "leafpile" (a raked leaf-burn heap, crimson/ochre/gold, a few sticks; its smoke is the row's fx).
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function rod(ctx, a, b, r0, r1 = r0, n = 7, caps = true) {
  const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = nrm(crs(d, up)), v = crs(u, d);
  const P = (c, r, i) => { const t = (i / n) * Math.PI * 2, cs = Math.cos(t) * r, sn = Math.sin(t) * r; return [c[0] + u[0] * cs + v[0] * sn, c[1] + u[1] * cs + v[1] * sn, c[2] + u[2] * cs + v[2] * sn]; };
  for (let i = 0; i < n; i++) {
    const a0 = P(a, r0, i), a1 = P(a, r0, i + 1), b0 = P(b, r1, i), b1 = P(b, r1, i + 1);
    ctx.quad(...a0, ...a1, ...b1, ...b0);
    if (caps) { ctx.tri(...a, ...a1, ...a0); ctx.tri(...b, ...b0, ...b1); }
  }
}
function block(ctx, cx, y0, cz, w, h, d) {
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
  ctx.quad(x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0);
  ctx.quad(x1, y0, z1, x0, y0, z1, x0, y1, z1, x1, y1, z1);
  ctx.quad(x0, y0, z1, x0, y0, z0, x0, y1, z0, x0, y1, z1);
  ctx.quad(x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0);
  ctx.quad(x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1);
}
// a jittered dome (lumpy mound), radius r, height h
function dome(ctx, cx, cz, r, h, seg, rings, jit, colors) {
  const pt = (i, k) => {
    const t = (i % seg) / seg * Math.PI * 2, f = k / rings, rr = r * Math.cos(f * Math.PI / 2), y = h * Math.sin(f * Math.PI / 2);
    const j = k === rings ? 0 : 1 + (ctx.noise.perlin2 ? ctx.noise.perlin2(Math.cos(t) * 3 + cx, Math.sin(t) * 3 + k) * jit : 0);
    return [cx + Math.cos(t) * rr * j, y * (k === 0 ? 0 : j), cz + Math.sin(t) * rr * j];
  };
  for (let k = 0; k < rings; k++) for (let i = 0; i < seg; i++) {
    ctx.color(colors[(i * 7 + k * 3) % colors.length]);
    const a = pt(i, k), b = pt(i + 1, k), c = pt(i + 1, k + 1), d = pt(i, k + 1);
    ctx.quad(...a, ...d, ...c, ...b);
  }
}
const OAK = "oklch(0.47 0.07 55)", OAKD = "oklch(0.36 0.06 50)", IRON = "oklch(0.3 0.01 60)";
function ciderpress(ctx) {
  const lo = ctx.lod ?? 1, n = lo > 2 ? 8 : 14;
  ctx.flat(); ctx.roughness(0.85);
  ctx.color(OAKD); block(ctx, 0, 0, 0, 1.9, 0.18, 1.3);            // sledge base
  ctx.color(OAK); block(ctx, -0.8, 0.18, 0, 0.2, 2.1, 0.24); block(ctx, 0.8, 0.18, 0, 0.2, 2.1, 0.24); // uprights
  block(ctx, 0, 2.05, 0, 1.95, 0.24, 0.3);                           // crossbeam
  // staved tub with iron hoops
  for (let i = 0; i < n; i++) {
    const t0 = i / n * Math.PI * 2, t1 = (i + 0.92) / n * Math.PI * 2, r = 0.48;
    ctx.color(i % 2 ? OAK : "oklch(0.5 0.07 60)");
    ctx.quad(Math.cos(t0) * r, 0.18, Math.sin(t0) * r, Math.cos(t1) * r, 0.18, Math.sin(t1) * r, Math.cos(t1) * r, 0.86, Math.sin(t1) * r, Math.cos(t0) * r, 0.86, Math.sin(t0) * r);
  }
  ctx.color(IRON); ctx.metalness(0.6);
  for (const y of lo > 2 ? [0.5] : [0.32, 0.72]) rod(ctx, [0, y, 0], [0, y + 0.05, 0], 0.495, 0.495, n, false);
  rod(ctx, [0, 0.95, 0], [0, 2.05, 0], 0.06, 0.06, 6);               // the screw
  if (lo < 3) for (let y = 1.0; y < 2.0; y += 0.12) rod(ctx, [0, y, 0], [0, y + 0.04, 0], 0.08, 0.08, 6, false);
  ctx.metalness(0); ctx.color(OAK);
  rod(ctx, [-0.7, 1.55, 0.05], [0.7, 1.55, -0.05], 0.045, 0.045, 6); // turning bar
  rod(ctx, [0, 0.82, 0], [0, 0.95, 0], 0.42, 0.42, n);               // press plate
  ctx.color("oklch(0.62 0.12 75)"); rod(ctx, [0, 0.8, 0], [0, 0.81, 0], 0.45, 0.45, n, true); // pomace top
  ctx.color(OAKD); block(ctx, 0, 0.3, -0.6, 0.16, 0.08, 0.3);       // spout
  // bucket under the spout
  ctx.color(OAK); rod(ctx, [0, 0.18, -0.82], [0, 0.48, -0.82], 0.17, 0.2, 8);
  ctx.color("oklch(0.68 0.14 70)"); rod(ctx, [0, 0.44, -0.82], [0, 0.45, -0.82], 0.185, 0.185, 8);
  // apple heap and loose apples
  if (lo < 4) {
    const AP = ["oklch(0.55 0.19 28)", "oklch(0.62 0.18 40)", "oklch(0.7 0.15 95)"];
    for (let i = 0; i < (lo > 2 ? 6 : 16); i++) {
      const a = ctx.random() * 6.28, rr = ctx.random() * 0.35, x = 1.25 + Math.cos(a) * rr, z = 0.25 + Math.sin(a) * rr, y = 0.07 + (0.35 - rr) * 0.6;
      ctx.color(AP[i % 3]); rod(ctx, [x, y - 0.06, z], [x, y + 0.06, z], 0.07, 0.06, 6);
    }
    ctx.color(OAKD); block(ctx, 1.25, 0, -0.45, 0.6, 0.35, 0.45);    // apple crate
    ctx.color(AP[0]); block(ctx, 1.25, 0.35, -0.45, 0.5, 0.06, 0.36);
  }
}
function fungilog(ctx) {
  const lo = ctx.lod ?? 1, L = ctx.params.len ?? 3.6, R = ctx.params.r ?? 0.36, n = lo > 2 ? 7 : 11;
  ctx.flat(); ctx.roughness(0.95);
  ctx.color("oklch(0.34 0.04 45)");
  rod(ctx, [-L / 2, R * 0.9, 0], [L / 2, R * 0.85, 0.05], R, R * 0.88, n, false);
  ctx.color("oklch(0.62 0.07 65)"); // splintered pale ends
  rod(ctx, [-L / 2 - 0.02, R * 0.9, 0], [-L / 2, R * 0.9, 0], R * 0.85, R, n, true);
  rod(ctx, [L / 2, R * 0.85, 0.05], [L / 2 + 0.02, R * 0.85, 0.05], R * 0.88, R * 0.7, n, true);
  if (lo < 3) { ctx.color("oklch(0.52 0.1 125)"); for (let i = 0; i < 4; i++) { const x = -L / 2 + 0.4 + i * L / 4.5; block(ctx, x, R * 1.6, 0, 0.5 + ctx.random() * 0.3, 0.08, R * 0.9); } }
  if (lo < 4) {
    const SH = ["oklch(0.68 0.17 50)", "oklch(0.74 0.15 70)", "oklch(0.6 0.17 40)"];
    for (let i = 0; i < (lo > 2 ? 4 : 9); i++) {
      const x = -L / 2 + 0.3 + ctx.random() * (L - 0.6), side = i % 2 ? 1 : -1, y = R * (0.6 + ctx.random() * 0.7), w = 0.16 + ctx.random() * 0.14;
      ctx.color(SH[i % 3]);
      rod(ctx, [x, y, side * R * 0.9], [x, y + 0.05, side * R * 0.9], w, w * 0.8, 7, true); // a shelf bracket
    }
  }
}
function leafpile(ctx) {
  const lo = ctx.lod ?? 1;
  ctx.flat(); ctx.roughness(1);
  dome(ctx, 0, 0, 1.25, 0.75, lo > 2 ? 7 : 13, lo > 2 ? 2 : 4, 0.22, ["oklch(0.52 0.17 33)", "oklch(0.66 0.15 62)", "oklch(0.74 0.14 85)", "oklch(0.45 0.12 40)"]);
  if (lo < 3) {
    ctx.color("oklch(0.25 0.03 40)"); dome(ctx, 0.15, 0.1, 0.45, 0.82, 7, 2, 0.15, ["oklch(0.22 0.02 40)", "oklch(0.3 0.04 45)"]); // the charred crown
    ctx.color("oklch(0.4 0.05 55)");
    for (let i = 0; i < 4; i++) { const a = i * 1.7; rod(ctx, [Math.cos(a) * 1.5, 0.05, Math.sin(a) * 1.5], [Math.cos(a) * 0.6, 0.5, Math.sin(a) * 0.6], 0.03, 0.025, 5); }
    ctx.color("oklch(0.3 0.03 45)"); ctx.emissive("oklch(0.55 0.2 40)"); dome(ctx, 0.15, 0.1, 0.25, 0.86, 5, 1, 0, ["oklch(0.3 0.03 45)"]); ctx.emissive(null);
  }
}
export function geometry(ctx) {
  const k = ctx.params.kind;
  if (k === "ciderpress") ciderpress(ctx); else if (k === "fungilog") fungilog(ctx); else leafpile(ctx);
}
export function collider(ctx) {
  const k = ctx.params.kind;
  if (k === "ciderpress") return { kind: "box", width: 1.9, height: 2.3, depth: 1.3, center: [0, 1.15, 0] };
  if (k === "fungilog") { const L = ctx.params.len ?? 3.6, R = ctx.params.r ?? 0.36; return { kind: "box", width: L, height: R * 1.8, depth: R * 2, center: [0, R * 0.9, 0] }; }
  return { kind: "box", width: 2.2, height: 0.7, depth: 2.2, center: [0, 0.35, 0] };
}
