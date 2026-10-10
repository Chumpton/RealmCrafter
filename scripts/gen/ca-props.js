// Deepdelve (zone-caves) scripted props, low-poly like sv-props. params.kind:
// deck {w,d} timbered ledge floor + rails · crib {len,h} stacked-log retaining face · lamp oil-lamp post (glass at y 2.35, z -0.55)
// rails {len} mine track along -Z · hopper ore bin on trestle · spoil {r,h} gravel heap · shroom {n,hue} glowing mushroom patch
// stalag {n,h} floor stalagmite family · overhang {len,wid,thick} wall-top mass jutting along -Z with stalactites
// web {r} spider web in the XY plane, origin at its centre · cocoon wrapped prey · candles kobold candle cluster · boulder {r}
const ROCK = 'cdn/texture-terrain-wow-classic-hand-painted-grey-rock-strata-broad-brushstrokes-cool-purple-crevices-warm-sunlit-tops.png';
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const crs = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function q4(ctx, a, b, c, d, n) { if (dot(crs(sub(b, a), sub(c, a)), n) < 0) [b, d] = [d, b]; ctx.quad(...a, ...b, ...c, ...d); }
function t3(ctx, a, b, c, n) { if (dot(crs(sub(b, a), sub(c, a)), n) < 0) [b, c] = [c, b]; ctx.tri(...a, ...b, ...c); }
function box(ctx, x0, y0, z0, x1, y1, z1) {
  const P = (x, y, z) => [x, y, z];
  q4(ctx, P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0), [0, 0, -1]);
  q4(ctx, P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), [0, 0, 1]);
  q4(ctx, P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), [-1, 0, 0]);
  q4(ctx, P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1), [1, 0, 0]);
  q4(ctx, P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), [0, 1, 0]);
  q4(ctx, P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), [0, -1, 0]);
}
// a rotated thin bar from a to b, square section s
function bar(ctx, a, b, s) {
  const d = sub(b, a), L = Math.hypot(...d) || 1, f = d.map((v) => v / L);
  let up = Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const r = crs(f, up), rl = Math.hypot(...r); const R = r.map((v) => (v / rl) * s), U = crs(f, R.map((v) => v / s)).map((v) => v * s);
  const c = (p, i, j) => [p[0] + R[0] * i + U[0] * j, p[1] + R[1] * i + U[1] * j, p[2] + R[2] * i + U[2] * j];
  const A = [c(a, -1, -1), c(a, 1, -1), c(a, 1, 1), c(a, -1, 1)], B = [c(b, -1, -1), c(b, 1, -1), c(b, 1, 1), c(b, -1, 1)];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4, m = [(A[i][0] + A[j][0]) / 2 - a[0], (A[i][1] + A[j][1]) / 2 - a[1], (A[i][2] + A[j][2]) / 2 - a[2]]; q4(ctx, A[i], A[j], B[j], B[i], m); }
}
// a jittered low-poly lump; dir +1 a cone up, -1 a cone down when tip given
function lump(ctx, cx, cy, cz, rx, ry, rz, seg = 7, rings = 4, jit = 0.18) {
  const pts = [];
  for (let i = 0; i <= rings; i++) { const row = [], th = (i / rings) * Math.PI;
    for (let j = 0; j < seg; j++) { const ph = (j / seg) * Math.PI * 2 + i * 0.4, k = i === 0 || i === rings ? 1 : 1 + (ctx.random() - 0.5) * 2 * jit;
      row.push([cx + Math.sin(th) * Math.cos(ph) * rx * k, cy + Math.cos(th) * ry * (i === 0 || i === rings ? 1 : k), cz + Math.sin(th) * Math.sin(ph) * rz * k]); }
    pts.push(row); }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const j2 = (j + 1) % seg, a = pts[i][j], b = pts[i][j2], c = pts[i + 1][j2], d = pts[i + 1][j];
    const m = [(a[0] + c[0]) / 2 - cx, (a[1] + c[1]) / 2 - cy, (a[2] + c[2]) / 2 - cz];
    if (i === 0) t3(ctx, a, c, d, m); else if (i === rings - 1) t3(ctx, a, b, c, m); else q4(ctx, a, b, c, d, m); }
}
function cone(ctx, cx, cy, cz, r, h, seg = 6) { // h > 0 points up, h < 0 hangs down
  const tip = [cx + (ctx.random() - 0.5) * r * 0.5, cy + h, cz + (ctx.random() - 0.5) * r * 0.5], ring = [];
  for (let j = 0; j < seg; j++) { const a = (j / seg) * Math.PI * 2 + ctx.random() * 0.3, k = 0.8 + ctx.random() * 0.4; ring.push([cx + Math.cos(a) * r * k, cy, cz + Math.sin(a) * r * k]); }
  for (let j = 0; j < seg; j++) { const a = ring[j], b = ring[(j + 1) % seg]; t3(ctx, a, b, tip, [(a[0] + b[0]) / 2 - cx, 0, (a[2] + b[2]) / 2 - cz]); }
  for (let j = 1; j < seg - 1; j++) t3(ctx, ring[0], ring[j], ring[j + 1], [0, -Math.sign(h), 0]);
}
const rockPaint = (ctx, l = 0.9) => { ctx.albedo(ROCK); ctx.color(`oklch(${l} 0.01 280)`); ctx.roughness(0.95); ctx.metalness(0); };
const wood = (ctx, l = 0.45) => { ctx.albedo(null); ctx.color(`oklch(${l} 0.05 60)`); ctx.roughness(0.9); ctx.metalness(0); };
const iron = (ctx) => { ctx.albedo(null); ctx.color('oklch(0.3 0.01 260)'); ctx.roughness(0.55); ctx.metalness(0.7); };
const G = {
  deck(ctx, p) {
    const w = p.w ?? 16, d = p.d ?? 12, gap = p.gap ?? 7; ctx.flat();
    for (let x = -w / 2, i = 0; x < w / 2 - 0.1; x += 0.32, i++) { wood(ctx, 0.5 + (i % 3) * 0.04); box(ctx, x, 0, -d / 2, x + 0.29, 0.14, d / 2); }
    wood(ctx, 0.36); box(ctx, -w / 2 - 0.15, -0.5, -d / 2 - 0.2, w / 2 + 0.15, 0.16, -d / 2); box(ctx, -w / 2 - 0.15, -0.5, d / 2, w / 2 + 0.15, 0.16, d / 2 + 0.2);
    if (ctx.lod > 2) return;
    for (const sx of [-1, 1]) { const x = (sx * w) / 2;
      for (let z = -d / 2; z <= d / 2 + 0.01; z += d / 3) box(ctx, x - 0.12, -0.6, z - 0.12, x + 0.12, 1.15, z + 0.12);
      box(ctx, x - 0.07, 1.0, -d / 2, x + 0.07, 1.12, d / 2); box(ctx, x - 0.05, 0.55, -d / 2, x + 0.05, 0.63, d / 2); }
    for (const sx of [-1, 1]) { const x0 = sx > 0 ? gap / 2 : -w / 2, x1 = sx > 0 ? w / 2 : -gap / 2; // front rail either side of the stair gap
      box(ctx, x0, 1.0, -d / 2 - 0.07, x1, 1.12, -d / 2 + 0.07); box(ctx, (sx * gap) / 2 - 0.12, -0.6, -d / 2 - 0.12, (sx * gap) / 2 + 0.12, 1.3, -d / 2 + 0.12); }
  },
  crib(ctx, p) {
    const L = p.len ?? 10, H = p.h ?? 5; ctx.flat();
    for (let y = 0, i = 0; y < H; y += 0.42, i++) { wood(ctx, 0.36 + (i % 2) * 0.05); box(ctx, -L / 2 + (i % 2) * 0.2, y, -0.2, L / 2 - (i % 2) * 0.2, y + 0.38, 0.2); }
    wood(ctx, 0.3); for (let x = -L / 2; x <= L / 2 + 0.01; x += 2.5) box(ctx, x - 0.15, -0.5, -0.4, x + 0.15, H + 0.3, -0.2);
  },
  lamp(ctx, p) {
    ctx.flat(); wood(ctx, 0.38); box(ctx, -0.09, 0, -0.09, 0.09, 2.95, 0.09); box(ctx, -0.05, 2.7, -0.7, 0.05, 2.8, 0.05);
    bar(ctx, [0, 2.4, 0], [0, 2.72, -0.4], 0.035);
    rockPaint(ctx, 0.8); if (ctx.lod < 3) { lump(ctx, 0.2, 0.1, 0.15, 0.25, 0.18, 0.2, 5, 3); lump(ctx, -0.2, 0.08, -0.12, 0.2, 0.14, 0.2, 5, 3); }
    iron(ctx); box(ctx, -0.14, 2.12, -0.69, 0.14, 2.17, -0.41); box(ctx, -0.12, 2.52, -0.67, 0.12, 2.6, -0.43); bar(ctx, [0, 2.6, -0.55], [0, 2.72, -0.55], 0.012);
    if (ctx.lod < 3) for (const [x, z] of [[-0.13, -0.68], [0.13, -0.68], [-0.13, -0.42], [0.13, -0.42]]) box(ctx, x - 0.012, 2.17, z - 0.012, x + 0.012, 2.52, z + 0.012);
    ctx.albedo(null); ctx.color('oklch(0.9 0.12 65)'); ctx.emissive(4.5, 1.9, 0.45); box(ctx, -0.1, 2.17, -0.65, 0.1, 2.52, -0.45); ctx.emissive(null);
  },
  rails(ctx, p) {
    const L = p.len ?? 6; ctx.flat();
    for (let z = 0, i = 0; z > -L; z -= 0.75, i++) { wood(ctx, 0.34 + (i % 3) * 0.03); box(ctx, -0.9, 0, z - 0.25, 0.9, 0.12, z); }
    iron(ctx); for (const x of [-0.55, 0.55]) { box(ctx, x - 0.04, 0.12, -L, x + 0.04, 0.22, 0); if (ctx.lod < 3) box(ctx, x - 0.07, 0.12, -L, x + 0.07, 0.15, 0); }
  },
  hopper(ctx) {
    ctx.flat(); wood(ctx, 0.4);
    for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) box(ctx, x - 0.18, 0, z - 0.18, x + 0.18, 5.2, z + 0.18);
    for (const y of [1.6, 3.2]) { box(ctx, -1.9, y, -1.95, 1.9, y + 0.2, -1.7); box(ctx, -1.9, y, 1.7, 1.9, y + 0.2, 1.95); }
    bar(ctx, [-1.8, 0.3, -1.8], [1.8, 3.1, -1.8], 0.08); bar(ctx, [-1.8, 0.3, 1.8], [1.8, 3.1, 1.8], 0.08);
    wood(ctx, 0.5); for (let y = 3.6; y < 5.6; y += 0.32) { box(ctx, -2.1, y, -2.1, 2.1, y + 0.28, -1.9); box(ctx, -2.1, y, 1.9, 2.1, y + 0.28, 2.1); box(ctx, -2.1, y, -2.1, -1.9, y + 0.28, 2.1); box(ctx, 1.9, y, -2.1, 2.1, y + 0.28, 2.1); }
    box(ctx, -2.1, 3.45, -2.1, 2.1, 3.6, 2.1);
    wood(ctx, 0.44); q4(ctx, [-0.6, 3.5, -2], [0.6, 3.5, -2], [0.6, 1.6, -4.6], [-0.6, 1.6, -4.6], [0, 1, -0.6]);
    box(ctx, -0.7, 1.6, -4.6, -0.6, 3.7, -2); box(ctx, 0.6, 1.6, -4.6, 0.7, 3.7, -2);
    ctx.color('oklch(0.42 0.01 270)'); ctx.albedo(ROCK); lump(ctx, 0, 5.5, 0, 1.9, 0.7, 1.9, 8, 3, 0.3);
  },
  spoil(ctx, p) {
    const r = p.r ?? 4, h = p.h ?? 2; ctx.flat(); rockPaint(ctx, p.l ?? 0.72); lump(ctx, 0, 0, 0, r, h, r * 0.85, 9, 5, 0.12);
    if (ctx.lod < 3) for (let i = 0; i < 7; i++) { const a = ctx.random() * 6.28, d = r * (0.8 + ctx.random() * 0.35), s = 0.2 + ctx.random() * 0.35; lump(ctx, Math.cos(a) * d, s * 0.4, Math.sin(a) * d * 0.85, s, s * 0.7, s, 5, 3); }
  },
  boulder(ctx, p) { const r = p.r ?? 2; ctx.flat(); rockPaint(ctx, p.l ?? 0.8); lump(ctx, 0, r * 0.45, 0, r, r * 0.75, r * 0.85, 8, 5, 0.22); },
  shroom(ctx, p) {
    const n = p.n ?? 6, hue = p.hue ?? 200, glow = hue > 250 ? [1.4, 0.5, 2.6] : hue > 150 ? [0.35, 1.9, 2.3] : [1.6, 2.2, 0.4]; ctx.smooth();
    for (let i = 0; i < n; i++) { const a = ctx.random() * 6.28, d = Math.sqrt(ctx.random()) * (p.r ?? 1.2), x = Math.cos(a) * d, z = Math.sin(a) * d, h = (0.25 + ctx.random() * 0.9) * (p.s ?? 1), cr = h * (0.45 + ctx.random() * 0.3);
      ctx.albedo(null); ctx.color('oklch(0.86 0.03 90)'); ctx.emissive(null); ctx.roughness(0.7);
      lump(ctx, x, h / 2, z, cr * 0.18, h / 2, cr * 0.18, 5, 2, 0.05);
      ctx.color(`oklch(0.8 0.14 ${hue})`); ctx.emissive(glow[0] * 0.6, glow[1] * 0.6, glow[2] * 0.6); lump(ctx, x, h, z, cr, cr * 0.42, cr, 7, 3, 0.08); ctx.emissive(null); }
  },
  stalag(ctx, p) {
    const n = p.n ?? 5, H = p.h ?? 5; ctx.flat(); rockPaint(ctx, 0.82);
    for (let i = 0; i < n; i++) { const a = ctx.random() * 6.28, d = i === 0 ? 0 : 0.6 + ctx.random() * H * 0.35, h = H * (i === 0 ? 1 : 0.25 + ctx.random() * 0.55), r = h * (0.17 + ctx.random() * 0.06);
      cone(ctx, Math.cos(a) * d, -0.2, Math.sin(a) * d, r, h, 7); }
    lump(ctx, 0, 0, 0, H * 0.3, H * 0.1, H * 0.28, 7, 3);
  },
  overhang(ctx, p) {
    const L = p.len ?? 30, W = p.wid ?? 24, T = p.thick ?? 9; ctx.flat(); rockPaint(ctx, 0.6);
    lump(ctx, 0, 0, -L * 0.45, W / 2, T / 2, L * 0.55, 9, 5, 0.2);
    lump(ctx, W * 0.2, -T * 0.25, -L * 0.75, W * 0.3, T * 0.4, L * 0.3, 7, 4, 0.25);
    for (let i = 0; i < (ctx.lod < 3 ? 16 : 6); i++) { const x = (ctx.random() - 0.5) * W * 0.8, z = -L * (0.15 + ctx.random() * 0.85), h = 5 + ctx.random() * (p.drop ?? 18), r = h * (0.12 + ctx.random() * 0.08);
      cone(ctx, x, -T * 0.25, z, r, -h, 6); }
  },
  web(ctx, p) {
    const r = p.r ?? 2, sp = 9; ctx.albedo(null); ctx.color('oklch(0.94 0.01 250)', 0.6); ctx.emissive(0.25, 0.28, 0.32); ctx.flat();
    const pt = (a, d) => [Math.cos(a) * d, Math.sin(a) * d, 0], th = 0.018;
    for (let i = 0; i < sp; i++) { const a = (i / sp) * 6.28 + 0.2; bar(ctx, [0, 0, 0], pt(a, r * (0.9 + ((i * 37) % 10) / 50)), th); }
    for (let k = 1; k <= 5; k++) for (let i = 0; i < sp; i++) { const a0 = (i / sp) * 6.28 + 0.2, a1 = ((i + 1) / sp) * 6.28 + 0.2, d = (r * k) / 5.6; bar(ctx, pt(a0, d), pt(a1, d * 1.03), th * 0.8); }
    ctx.emissive(null);
  },
  cocoon(ctx, p) { const s = p.s ?? 1; ctx.smooth(); ctx.albedo(null); ctx.color('oklch(0.9 0.015 90)'); ctx.roughness(0.95); lump(ctx, 0, 0.35 * s, 0, 0.32 * s, 0.9 * s, 0.32 * s, 7, 6, 0.1); bar(ctx, [0, 1.2 * s, 0], [0, 3.2 * s, 0], 0.012); },
  candles(ctx, p) {
    const n = p.n ?? 5; ctx.flat();
    for (let i = 0; i < n; i++) { const a = ctx.random() * 6.28, d = ctx.random() * 0.35, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.12 + ctx.random() * 0.25;
      ctx.albedo(null); ctx.color('oklch(0.92 0.04 90)'); ctx.emissive(null); box(ctx, x - 0.035, 0, z - 0.035, x + 0.035, h, z + 0.035);
      ctx.color('oklch(0.9 0.15 70)'); ctx.emissive(5, 2.4, 0.5); lump(ctx, x, h + 0.04, z, 0.025, 0.045, 0.025, 4, 2, 0); }
    ctx.emissive(null);
  },
};
export function geometry(ctx) { const p = ctx.params ?? {}; (G[p.kind] ?? G.boulder)(ctx, p); }
export function collider(ctx) {
  const p = ctx.params ?? {}, k = p.kind;
  if (k === 'deck') return { kind: 'box', width: p.w ?? 16, height: 0.14, depth: p.d ?? 12, center: [0, 0.07, 0] };
  if (k === 'lamp') return { kind: 'box', width: 0.3, height: 3, depth: 0.3, center: [0, 1.5, 0] };
  if (k === 'hopper') return { kind: 'box', width: 4.2, height: 6, depth: 4.2, center: [0, 3, 0] };
  if (k === 'crib') return { kind: 'box', width: p.len ?? 10, height: p.h ?? 5, depth: 0.5, center: [0, (p.h ?? 5) / 2, -0.1] };
  if (k === 'boulder') { const r = p.r ?? 2; return { kind: 'box', width: r * 1.7, height: r * 1.2, depth: r * 1.5, center: [0, r * 0.45, 0] }; }
  if (k === 'stalag') { const H = p.h ?? 5; return { kind: 'box', width: H * 0.4, height: H, depth: H * 0.4, center: [0, H / 2, 0] }; }
  if (k === 'spoil') { const r = p.r ?? 4, h = p.h ?? 2; return { kind: 'box', width: r * 1.4, height: h * 0.8, depth: r * 1.2, center: [0, h * 0.4, 0] }; }
  return null;
}
