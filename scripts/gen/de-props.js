// Sunscorch (zone-desert) scripted props, low-poly flat-shaded like sv-props. params.kind:
// "rock" (sandstone boulder family: params.s size, params.f flatness), "arch" (sandstone arch, params.span clear width, params.h),
// "ribcage" (bleached beast ribs + skull), "bones" (small bone pile), "palm" (params.h), "reeds", "web" (params.s),
// "cocoon", "awning" (striped shade cloth on 4 posts, 3.6 m clear), "jug", "cactus" (saguaro, params.h), "totem" (centaur pole).
const ROCKTEX = "cdn/texture-terrain-wow-classic-hand-painted-grey-rock-strata-broad-brushstrokes-cool-purple-crevices-warm-sunlit-tops.png";
const BONE = "oklch(0.92 0.025 85)";
function tri(ctx, a, b, c, o) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const mx = (a[0] + b[0] + c[0]) / 3 - o[0], my = (a[1] + b[1] + c[1]) / 3 - o[1], mz = (a[2] + b[2] + c[2]) / 3 - o[2];
  if (nx * mx + ny * my + nz * mz < 0) ctx.tri(...a, ...c, ...b); else ctx.tri(...a, ...b, ...c);
}
const quad = (ctx, a, b, c, d, o) => { tri(ctx, a, b, c, o); tri(ctx, a, c, d, o); };
function box(ctx, cx, cy, cz, w, h, d, yaw = 0) {
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
  const X = w / 2, Z = d / 2, v = [P(-X, 0, -Z), P(X, 0, -Z), P(X, 0, Z), P(-X, 0, Z), P(-X, h, -Z), P(X, h, -Z), P(X, h, Z), P(-X, h, Z)], o = [cx, cy + h / 2, cz];
  for (const f of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]) quad(ctx, v[f[0]], v[f[1]], v[f[2]], v[f[3]], o);
}
// a tapered tube between two points (n sides)
function tube(ctx, a, b, r0, r1, n = 6, caps = true) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1, t = d.map((v) => v / L);
  const up = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]]; const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]];
  const ring = (p, r) => Array.from({ length: n }, (_, i) => { const q = (i / n) * 6.2832, cs = Math.cos(q) * r, sn = Math.sin(q) * r; return [p[0] + u[0] * cs + w[0] * sn, p[1] + u[1] * cs + w[1] * sn, p[2] + u[2] * cs + w[2] * sn]; });
  const A = ring(a, r0), B = ring(b, r1), o = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; quad(ctx, A[i], A[j], B[j], B[i], o); }
  if (caps) for (let i = 1; i < n - 1; i++) { tri(ctx, A[0], A[i], A[i + 1], o); tri(ctx, B[0], B[i], B[i + 1], o); }
}
// a jittered low-poly blob, flattened under y = cy + floor
function blob(ctx, cx, cy, cz, rx, ry, rz, seg = 7, jit = 0.18, floor = -1e9, band = null) {
  const rows = seg, cols = seg + 2, V = [];
  for (let i = 0; i <= rows; i++) { const row = []; const th = (i / rows) * Math.PI;
    for (let j = 0; j < cols; j++) { const ph = (j / cols) * 6.2832, k = i === 0 || i === rows ? 1 : 1 + (ctx.random() - 0.5) * 2 * jit;
      row.push([cx + Math.sin(th) * Math.cos(ph) * rx * k, Math.max(cy + floor, cy + Math.cos(th) * ry * k), cz + Math.sin(th) * Math.sin(ph) * rz * k]); }
    V.push(row); }
  const o = [cx, cy, cz];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const jj = (j + 1) % cols;
    if (band) ctx.color(band((V[i][j][1] + V[i + 1][j][1]) / 2 - cy));
    if (i === 0) tri(ctx, V[0][j], V[1][j], V[1][jj], o); else if (i === rows - 1) tri(ctx, V[i][j], V[i + 1][j], V[i][jj], o);
    else quad(ctx, V[i][j], V[i][jj], V[i + 1][jj], V[i + 1][j], o); }
}
const strata = (s) => (dy) => { const k = Math.floor((dy / s) * 4 + 8) % 3; return ["oklch(0.97 0.035 62)", "oklch(0.93 0.05 50)", "oklch(0.98 0.03 75)"][k]; };
function lathe(ctx, prof, n = 10) { // prof: [[r, y], ...]
  const o = [0, prof.reduce((a, p) => a + p[1], 0) / prof.length, 0];
  for (let i = 0; i < prof.length - 1; i++) for (let j = 0; j < n; j++) {
    const a0 = (j / n) * 6.2832, a1 = ((j + 1) / n) * 6.2832, [r0, y0] = prof[i], [r1, y1] = prof[i + 1];
    quad(ctx, [Math.cos(a0) * r0, y0, Math.sin(a0) * r0], [Math.cos(a1) * r0, y0, Math.sin(a1) * r0], [Math.cos(a1) * r1, y1, Math.sin(a1) * r1], [Math.cos(a0) * r1, y1, Math.sin(a0) * r1], o);
  }
}
export function geometry(ctx) {
  const p = ctx.params ?? {}, kind = p.kind ?? "rock", lod = ctx.lod ?? 1;
  ctx.flat(); ctx.roughness(0.95);
  if (kind === "rock") {
    const s = p.s ?? 3, f = p.f ?? 0.7, seg = lod >= 4 ? 4 : lod >= 3 ? 5 : 7;
    ctx.albedo(ROCKTEX);
    blob(ctx, 0, s * 0.35 * f, 0, s * 1.15, s * f, s, seg, 0.2, -s * 0.35 * f, strata(s));
    if (lod <= 2 && s > 2) { blob(ctx, s * 0.9, s * 0.1, s * 0.5, s * 0.45, s * 0.35, s * 0.4, 5, 0.25, -s * 0.1, strata(s)); blob(ctx, -s * 0.7, s * 0.05, -s * 0.8, s * 0.3, s * 0.22, s * 0.3, 4, 0.25, -s * 0.05, strata(s)); }
    return;
  }
  if (kind === "arch") {
    const span = p.span ?? 12, h = p.h ?? 14, t = 3.2, seg = lod >= 3 ? 5 : 6;
    ctx.albedo(ROCKTEX);
    for (const sx of [-1, 1]) { // legs: stacked blobs, wider at the foot
      for (let k = 0; k < 4; k++) { const y = k * h * 0.22, r = t * (1.25 - k * 0.1); blob(ctx, sx * (span / 2 + r * 0.8), y + r * 0.5, 0, r, h * 0.16, r * 0.9, seg, 0.16, -r * 0.5, strata(4)); }
    }
    const N = lod >= 3 ? 7 : 11; // the span: blobs along a half-ellipse over the opening
    for (let i = 0; i <= N; i++) { const a = Math.PI * (i / N), x = Math.cos(a) * (span / 2 + t * 0.9), y = h * 0.75 + Math.sin(a) * h * 0.28;
      blob(ctx, x, y, 0, t * 1.0, t * 0.75, t * 0.85, seg, 0.18, -1e9, strata(4)); }
    return;
  }
  if (kind === "ribcage") {
    const L = p.L ?? 9, H = p.H ?? 3.6; ctx.color(BONE); ctx.roughness(0.8);
    const sp = (u) => [0, 0.4 + Math.sin(u * Math.PI) * 0.8 + 0.3, -L / 2 + u * L]; // spine sagging on the sand
    const NS = lod >= 3 ? 5 : 10;
    for (let i = 0; i < NS; i++) tube(ctx, sp(i / NS), sp((i + 1) / NS), 0.28, 0.24, 6);
    const NR = lod >= 3 ? 5 : 9;
    for (let r = 0; r < NR; r++) { const u = 0.15 + (r / (NR - 1)) * 0.7, base = sp(u), hh = H * (0.7 + Math.sin(u * Math.PI) * 0.35), w = 1.6 + Math.sin(u * Math.PI) * 1.4;
      for (const sx of [-1, 1]) { const pts = [];
        for (let k = 0; k <= 5; k++) { const q = k / 5; pts.push([sx * Math.sin(q * 2.0) * w, base[1] + hh * Math.sin(q * 1.9) * 0.9 - q * q * base[1] * 0.9, base[2] + q * 0.6 * (r % 2 ? 1 : -1) * 0.3]); }
        pts[0] = base; if (r === 2 && sx > 0) continue; // one rib broken off
        for (let k = 0; k < 5; k++) tube(ctx, pts[k], pts[k + 1], 0.16 - k * 0.018, 0.14 - k * 0.018, 5, false); } }
    blob(ctx, 0, 0.6, L / 2 + 1.1, 0.9, 0.7, 1.3, 6, 0.1); // skull
    ctx.color("oklch(0.35 0.03 60)"); box(ctx, -0.35, 0.75, L / 2 + 1.7, 0.25, 0.25, 0.2); box(ctx, 0.35, 0.75, L / 2 + 1.7, 0.25, 0.25, 0.2);
    ctx.color(BONE); tube(ctx, [0.6, 1.0, L / 2 + 0.8], [1.6, 2.2, L / 2 + 0.2], 0.2, 0.05, 5); tube(ctx, [-0.6, 1.0, L / 2 + 0.8], [-1.6, 2.2, L / 2 + 0.2], 0.2, 0.05, 5);
    return;
  }
  if (kind === "bones") {
    ctx.color(BONE); const n = lod >= 3 ? 4 : 9;
    for (let i = 0; i < n; i++) { const a = ctx.random() * 6.28, r = ctx.random() * 0.7, l = 0.4 + ctx.random() * 0.6, b = ctx.random() * 6.28;
      const c = [Math.cos(a) * r, 0.07, Math.sin(a) * r]; tube(ctx, [c[0] - Math.cos(b) * l / 2, 0.06, c[2] - Math.sin(b) * l / 2], [c[0] + Math.cos(b) * l / 2, 0.09, c[2] + Math.sin(b) * l / 2], 0.06, 0.05, 5);
      if (lod <= 2) { blob(ctx, c[0] - Math.cos(b) * l / 2, 0.07, c[2] - Math.sin(b) * l / 2, 0.09, 0.08, 0.09, 3, 0.1); } }
    blob(ctx, 0.2, 0.18, -0.1, 0.24, 0.2, 0.3, 5, 0.08, -0.15);
    return;
  }
  if (kind === "palm") {
    const h = p.h ?? 7, lean = p.lean ?? 0.18, N = lod >= 3 ? 4 : 8; let prev = [0, 0, 0];
    ctx.color("oklch(0.62 0.06 65)");
    for (let i = 1; i <= N; i++) { const q = i / N, cur = [Math.sin(q * 1.3) * h * lean, q * h, 0]; tube(ctx, prev, cur, 0.26 - q * 0.08 + (i % 2) * 0.03, 0.22 - q * 0.08, 6, i === N); prev = cur; }
    const top = prev, F = lod >= 3 ? 6 : 9;
    for (let f = 0; f < F; f++) { const a = (f / F) * 6.2832 + 0.3, len = 3.4 + ((f * 37) % 10) / 10, seg = lod >= 3 ? 3 : 5;
      ctx.color(f % 2 ? "oklch(0.58 0.13 135)" : "oklch(0.52 0.12 140)");
      let pa = top; for (let k = 1; k <= seg; k++) { const q = k / seg, r = q * len, y = top[1] + Math.sin(q * 1.6) * 0.9 - q * q * 1.9, c = [top[0] + Math.cos(a) * r, y, top[2] + Math.sin(a) * r], w = 0.55 * Math.sin(q * 3.0 + 0.2) + 0.05;
        const sx = -Math.sin(a) * w, sz = Math.cos(a) * w, pw = k === 1 ? 0.08 : 0.55 * Math.sin((k - 1) / seg * 3.0 + 0.2) + 0.05, px = -Math.sin(a) * pw, pz = Math.cos(a) * pw;
        quad(ctx, [pa[0] - px, pa[1], pa[2] - pz], [pa[0] + px, pa[1], pa[2] + pz], [c[0] + sx, c[1] - 0.12, c[2] + sz], [c[0] - sx, c[1] - 0.12, c[2] - sz], [top[0], top[1] - 3, top[2]]); pa = c; } }
    ctx.color("oklch(0.45 0.07 60)"); for (let k = 0; k < 3; k++) blob(ctx, top[0] + Math.cos(k * 2.1) * 0.25, top[1] - 0.25, top[2] + Math.sin(k * 2.1) * 0.25, 0.16, 0.16, 0.16, 3, 0.05);
    return;
  }
  if (kind === "reeds") {
    const n = lod >= 3 ? 7 : 16;
    for (let i = 0; i < n; i++) { const a = ctx.random() * 6.28, r = ctx.random() * 0.9, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 1.1 + ctx.random() * 1.1, b = ctx.random() * 6.28, lx = Math.cos(b) * 0.3, lz = Math.sin(b) * 0.3;
      ctx.color(i % 3 ? "oklch(0.6 0.11 125)" : "oklch(0.7 0.1 95)");
      tri(ctx, [x - 0.04, 0, z], [x + 0.04, 0, z + 0.02], [x + lx, h, z + lz], [x, h / 2, z + 1]);
      if (i % 4 === 0) { ctx.color("oklch(0.4 0.06 50)"); tube(ctx, [x + lx * 0.8, h * 0.8, z + lz * 0.8], [x + lx * 0.9, h * 0.95, z + lz * 0.9], 0.04, 0.04, 4); } }
    return;
  }
  if (kind === "web") {
    const s = p.s ?? 3, sp = lod >= 3 ? 6 : 10, rings = lod >= 3 ? 3 : 6, w = 0.025 * s; ctx.color("oklch(0.97 0.01 90)", 0.75); ctx.emissive("oklch(0.35 0.01 90)");
    const P = (a, r) => [Math.cos(a) * r * 1.1, s * 0.5 + Math.sin(a) * r, 0];
    const strand = (A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w; ctx.quad(A[0] - nx, A[1] - ny, 0, B[0] - nx, B[1] - ny, 0, B[0] + nx, B[1] + ny, 0, A[0] + nx, A[1] + ny, 0); };
    for (let i = 0; i < sp; i++) strand(P((i / sp) * 6.28, 0), P((i / sp) * 6.28, s * 0.5));
    for (let k = 1; k <= rings; k++) for (let i = 0; i < sp; i++) { const r = (k / rings) * s * 0.48; strand(P((i / sp) * 6.28, r * (0.92 + (i % 2) * 0.08)), P(((i + 1) / sp) * 6.28, r * (0.92 + ((i + 1) % 2) * 0.08))); }
    ctx.emissive(null);
    return;
  }
  if (kind === "cocoon") { ctx.color("oklch(0.93 0.015 90)"); blob(ctx, 0, 0.7, 0, 0.42, 0.7, 0.4, lod >= 3 ? 4 : 6, 0.14, -0.6); ctx.color("oklch(0.85 0.02 90)"); tube(ctx, [0, 1.3, 0], [0.05, 2.6, 0.1], 0.03, 0.02, 4); return; }
  if (kind === "awning") {
    const w = p.w ?? 5, d = p.d ?? 4, h = p.h ?? 3.7; ctx.color("oklch(0.55 0.07 60)");
    for (const [sx, sz, hh] of [[-1, -1, h], [1, -1, h], [-1, 1, h - 0.6], [1, 1, h - 0.6]]) box(ctx, sx * w / 2, 0, sz * d / 2, 0.14, hh + 0.1, 0.14);
    const N = lod >= 3 ? 3 : 8, M = 4;
    for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
      ctx.color(i % 2 ? "oklch(0.86 0.07 85)" : "oklch(0.58 0.15 35)");
      const Y = (u, v) => h - v * 0.6 - Math.sin(u * Math.PI) * 0.35 * Math.sin(v * Math.PI) - 0.05 + 0.15, X = (u) => -w / 2 + u * w, Zv = (v) => -d / 2 + v * d;
      const u0 = i / N, u1 = (i + 1) / N, v0 = j / M, v1 = (j + 1) / M;
      quad(ctx, [X(u0), Y(u0, v0), Zv(v0)], [X(u1), Y(u1, v0), Zv(v0)], [X(u1), Y(u1, v1), Zv(v1)], [X(u0), Y(u0, v1), Zv(v1)], [0, 0, 0]); }
    ctx.color("oklch(0.58 0.15 35)"); for (let i = 0; i < 6; i++) { const x = -w / 2 + (i + 0.5) * w / 6; tri(ctx, [x - w / 12, h + 0.1, -d / 2], [x + w / 12, h + 0.1, -d / 2], [x, h - 0.35, -d / 2 - 0.02], [0, h, 0]); }
    return;
  }
  if (kind === "jug") { ctx.color(p.c ?? "oklch(0.62 0.12 45)"); ctx.roughness(0.85); lathe(ctx, [[0.0, 0], [0.18, 0.02], [0.26, 0.18], [0.27, 0.34], [0.18, 0.5], [0.09, 0.58], [0.1, 0.68], [0.07, 0.7]], lod >= 3 ? 6 : 10); return; }
  if (kind === "cactus") {
    const h = p.h ?? 4, r = 0.32 * (h / 4), n = lod >= 3 ? 6 : 9; ctx.color("oklch(0.58 0.1 140)");
    tube(ctx, [0, 0, 0], [0, h, 0], r, r * 0.85, n); blob(ctx, 0, h, 0, r * 0.85, r * 0.6, r * 0.85, 4, 0.02);
    for (const [sx, y0, up] of [[1, h * 0.38, h * 0.32], [-1, h * 0.55, h * 0.22]]) { const ex = sx * r * 2.6;
      tube(ctx, [0, y0, 0], [ex, y0 + 0.15, 0], r * 0.6, r * 0.6, n - 2); tube(ctx, [ex, y0, 0], [ex, y0 + up, 0], r * 0.62, r * 0.55, n - 2); blob(ctx, ex, y0 + up, 0, r * 0.55, r * 0.4, r * 0.55, 3, 0.02); }
    if (lod <= 2) { ctx.color("oklch(0.85 0.12 20)"); blob(ctx, 0, h + r * 0.5, 0, 0.12, 0.08, 0.12, 3, 0.05); }
    return;
  }
  if (kind === "totem") {
    const h = p.h ?? 5; ctx.color("oklch(0.5 0.07 55)"); tube(ctx, [0, 0, 0], [0, h, 0], 0.22, 0.18, 7);
    ctx.color("oklch(0.58 0.15 35)"); box(ctx, -0.9, h * 0.8, -0.05, 1.8, 0.14, 0.1); ctx.color(BONE); blob(ctx, 0, h + 0.25, 0, 0.35, 0.3, 0.42, 5, 0.08);
    tube(ctx, [0.25, h + 0.35, 0], [0.8, h + 0.9, -0.1], 0.08, 0.02, 4); tube(ctx, [-0.25, h + 0.35, 0], [-0.8, h + 0.9, -0.1], 0.08, 0.02, 4);
    ctx.color("oklch(0.86 0.07 85)"); for (const sx of [-1, 1]) quad(ctx, [sx * 0.85, h * 0.8, 0], [sx * 0.6, h * 0.8, 0], [sx * 0.62, h * 0.8 - 1.1, 0.02], [sx * 0.8, h * 0.8 - 1.0, 0.02], [0, h, 1]);
    return;
  }
}
export function collider(ctx) {
  const p = ctx.params ?? {}, kind = p.kind ?? "rock";
  if (kind === "rock") { const s = p.s ?? 3, f = p.f ?? 0.7; return { kind: "box", width: s * 1.9, height: s * f * 1.2, depth: s * 1.6, center: [0, s * f * 0.6, 0] }; }
  if (kind === "arch") { const span = p.span ?? 12, h = p.h ?? 14, t = 3.2; for (const sx of [-1, 1]) box(ctx, sx * (span / 2 + t * 1.2), 0, 0, t * 2, h * 0.8, t * 1.8); box(ctx, 0, h * 0.72, 0, span + t * 4, h * 0.32, t * 1.6); return; }
  if (kind === "palm" || kind === "cactus" || kind === "totem") return { kind: "box", width: 0.6, height: (p.h ?? 4), depth: 0.6, center: [0, (p.h ?? 4) / 2, 0] };
  if (kind === "awning") { const w = p.w ?? 5, d = p.d ?? 4; for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(ctx, sx * w / 2, 0, sz * d / 2, 0.2, 3, 0.2); return; }
  return null;
}
