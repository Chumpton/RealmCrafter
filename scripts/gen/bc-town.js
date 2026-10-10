// The back-country castle town (bc-town): one generator, kinds by params.kind:
// wall (curtain, towers, gatehouse; the root), keep (walk-in hall), house, stall, props (clutter rows), paving.
// Frame: origin at the object's feet, -Z forward, +Y up. Ground offsets for the wall come in params (sampled once at spawn).
const T = { wall: 'cdn/texture-pale-weathered-granite-blocks.png', field: 'cdn/texture-rough-grey-fieldstone.png', plaster: 'cdn/texture-limewash-plaster.png',
  oak: 'cdn/texture-weathered-dark-oak-planks.png', shingle: 'cdn/texture-weathered-wooden-roof-shingles.png', slate: 'cdn/texture-blue-grey-slate-roof-tiles.png',
  cobble: 'cdn/texture-worn-cobblestone-paving.png', floor: 'cdn/texture-worn-honey-oak-floorboards.png', linen: 'cdn/texture-coarse-undyed-linen-sailcloth.png',
  straw: 'cdn/texture-golden-dry-straw.png', iron: 'cdn/texture-dark-wrought-iron.png', flag: 'cdn/texture-worn-limestone-flagstone-floor.png' };
let FR = { x: 0, y: 0, z: 0, c: 1, s: 0 };
function frame(x = 0, y = 0, z = 0, yaw = 0) { const r = yaw * Math.PI / 180; FR = { x, y, z, c: Math.cos(r), s: Math.sin(r) }; }
const W = (p) => [FR.x + p[0] * FR.c + p[2] * FR.s, FR.y + p[1], FR.z - p[0] * FR.s + p[2] * FR.c];
const R = (n) => [n[0] * FR.c + n[2] * FR.s, n[1], -n[0] * FR.s + n[2] * FR.c];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a) => mul(a, 1 / (len(a) || 1));
const crs = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
function face(ctx, a, b, c, d, n) {
  a = W(a); b = W(b); c = W(c); d = W(d);
  const cr = crs([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
  if (n) { n = R(n); if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { ctx.quad(...d, ...c, ...b, ...a); return; } }
  ctx.quad(...a, ...b, ...c, ...d);
}
function tface(ctx, a, b, c, n) {
  a = W(a); b = W(b); c = W(c);
  const cr = crs([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]);
  if (n) { n = R(n); if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { ctx.tri(...c, ...b, ...a); return; } }
  ctx.tri(...a, ...b, ...c);
}
function obox(ctx, c, A, B, D, bottom = false) {
  for (const [n, u, v] of [[A, B, D], [B, A, D], [D, A, B]]) for (const s of [1, -1]) {
    const nn = mul(n, s); if (!bottom && nn[1] < -0.5 * len(nn)) continue;
    const o = add(c, nn);
    face(ctx, add(add(o, u, -1), v, -1), add(add(o, u, 1), v, -1), add(add(o, u, 1), v, 1), add(add(o, u, -1), v, 1), nn);
  }
}
function box(ctx, x0, y0, z0, x1, y1, z1, bottom) { obox(ctx, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, 0, 0], [0, (y1 - y0) / 2, 0], [0, 0, (z1 - z0) / 2], bottom); }
// a beam between two points, square section
function beam(ctx, a, b, w, h = w) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = len(d), u = nrm(d);
  let side = crs(u, [0, 1, 0]); if (len(side) < 1e-3) side = [1, 0, 0]; side = nrm(side); const up = nrm(crs(side, u));
  obox(ctx, add(a, d, 0.5), mul(u, L / 2), mul(up, h / 2), mul(side, w / 2), true);
}
function cyl(ctx, x, y0, z, r0, r1, h, n = 8, cap = true) {
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.2832, b = (i + 1) / n * 6.2832, m = (a + b) / 2;
    face(ctx, [x + Math.cos(a) * r0, y0, z + Math.sin(a) * r0], [x + Math.cos(b) * r0, y0, z + Math.sin(b) * r0], [x + Math.cos(b) * r1, y0 + h, z + Math.sin(b) * r1], [x + Math.cos(a) * r1, y0 + h, z + Math.sin(a) * r1], [Math.cos(m), 0, Math.sin(m)]);
    if (cap && r1 > 0) tface(ctx, [x, y0 + h, z], [x + Math.cos(a) * r1, y0 + h, z + Math.sin(a) * r1], [x + Math.cos(b) * r1, y0 + h, z + Math.sin(b) * r1], [0, 1, 0]);
  }
}
function blob(ctx, c, r, n = 6, m = 4) { // low-poly ellipsoid
  const P = (i, j) => { const th = j / m * Math.PI, ph = i / n * 6.2832; return [c[0] + r[0] * Math.sin(th) * Math.cos(ph), c[1] + r[1] * Math.cos(th), c[2] + r[2] * Math.sin(th) * Math.sin(ph)]; };
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const a = P(i, j), b = P(i + 1, j), d = P(i + 1, j + 1), e = P(i, j + 1), mid = [(a[0] + d[0]) / 2 - c[0], (a[1] + d[1]) / 2 - c[1], (a[2] + d[2]) / 2 - c[2]];
    if (j === 0) tface(ctx, a, d, e, mid); else if (j === m - 1) tface(ctx, a, b, d, mid); else face(ctx, a, b, d, e, mid);
  }
}
function pyramid(ctx, cx, y0, cz, hw, hd, h) {
  const a = [cx - hw, y0, cz - hd], b = [cx + hw, y0, cz - hd], c = [cx + hw, y0, cz + hd], d = [cx - hw, y0, cz + hd], t = [cx, y0 + h, cz];
  tface(ctx, a, b, t, [0, hw, -h]); tface(ctx, b, c, t, [h, hw, 0]); tface(ctx, c, d, t, [0, hw, h]); tface(ctx, d, a, t, [-h, hw, 0]);
  face(ctx, a, b, c, d, [0, -1, 0]);
}
// a wall along x at z = zc with one round-headed opening: centre c, half-width a, springline ys, floor y0
function archWall(ctx, zc, s0, s1, y0, y1, t, c, a, ys, seg = 8, under = 0) {
  const ht = t / 2;
  if (c - a > s0) box(ctx, s0, y0 - under, zc - ht, c - a, y1, zc + ht);
  if (s1 > c + a) box(ctx, c + a, y0 - under, zc - ht, s1, y1, zc + ht);
  const H = y1 - ys, ca = Math.atan2(H, a) * 180 / Math.PI;
  const angs = []; for (let i = 0; i <= seg; i++) angs.push(i * 180 / seg); angs.push(ca, 180 - ca); angs.sort((p, q) => p - q);
  const arc = (d) => { const r = d * Math.PI / 180; return [c + Math.cos(r) * a, ys + Math.sin(r) * a]; };
  const out = (d) => { const r = d * Math.PI / 180, co = Math.cos(r), si = Math.sin(r); let k = Infinity; if (Math.abs(co) > 1e-6) k = a / Math.abs(co); if (si > 1e-6) k = Math.min(k, H / si); return [c + co * k, ys + si * k]; };
  for (let i = 0; i < angs.length - 1; i++) {
    const p = arc(angs[i]), q = arc(angs[i + 1]), P = out(angs[i]), Q = out(angs[i + 1]);
    for (const s of [-1, 1]) face(ctx, [p[0], p[1], zc + s * ht], [q[0], q[1], zc + s * ht], [Q[0], Q[1], zc + s * ht], [P[0], P[1], zc + s * ht], [0, 0, s]);
    const m = arc((angs[i] + angs[i + 1]) / 2);
    face(ctx, [p[0], p[1], zc - ht], [q[0], q[1], zc - ht], [q[0], q[1], zc + ht], [p[0], p[1], zc + ht], [c - m[0], ys - m[1], 0]);
  }
  face(ctx, [c - a, y1, zc - ht], [c + a, y1, zc - ht], [c + a, y1, zc + ht], [c - a, y1, zc + ht], [0, 1, 0]);
  // voussoir ring on both faces
  return arc;
}
function voussoirs(ctx, zc, c, a, ys, t, n = 9) {
  for (let i = 0; i < n; i++) {
    const r0 = i / n * Math.PI, r1 = (i + 1) / n * Math.PI, rm = (r0 + r1) / 2;
    for (const s of [-1, 1]) {
      const z = zc + s * (t / 2 + 0.08), u = [Math.cos(rm), Math.sin(rm), 0];
      obox(ctx, [c + Math.cos(rm) * (a + 0.35), ys + Math.sin(rm) * (a + 0.35), z], mul(u, 0.35), [-u[1] * (a + 0.35) * (r1 - r0) / 2 * 0.92, u[0] * (a + 0.35) * (r1 - r0) / 2 * 0.92, 0], [0, 0, 0.09]);
    }
  }
}
const paint = (ctx, tex, col, rough = 0.9, metal = 0) => { ctx.albedo(tex); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); ctx.emissive(null); };
const GLOW = 'oklch(0.62 0.14 62)';

// ---------------- curtain wall + towers + gatehouse (the root) ----------------
function wall(ctx, p, col) {
  const L = ctx.lod ?? 1, V = p.verts, G = p.g, GM = p.gm, TOP = p.top ?? 10, TH = 2.8, n = V.length;
  const fine = L <= 2, mid = L <= 3;
  if (!col) paint(ctx, T.wall, 'oklch(0.93 0.015 85)');
  frame();
  for (let i = 0; i < n - 1; i++) {
    const P = V[i], Q = V[i + 1]; const dx = Q[0] - P[0], dz = Q[1] - P[1], Ls = Math.hypot(dx, dz), u = [dx / Ls, 0, dz / Ls];
    const m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2]; let nn = [u[2], 0, -u[0]]; if (nn[0] * m[0] + nn[2] * m[1] < 0) nn = mul(nn, -1);
    const yb = Math.min(G[i], G[i + 1], GM[i]) - 2.5, Lh = Ls / 2 + 1.2;
    obox(ctx, [m[0], (TOP + yb) / 2, m[1]], mul(u, Lh), [0, (TOP - yb) / 2, 0], mul(nn, TH / 2), col);
    const oc = add([m[0], 0, m[1]], nn, TH / 2 - 0.35);
    obox(ctx, [oc[0], TOP + 0.6, oc[2]], mul(u, Lh), [0, 0.6, 0], mul(nn, 0.38), col);
    if (col) continue;
    if (mid) { // corbel band, batter, inner lip, merlons
      const bc = add([m[0], 0, m[1]], nn, TH / 2 + 0.12);
      obox(ctx, [bc[0], TOP - 0.3, bc[2]], mul(u, Lh), [0, 0.3, 0], mul(nn, 0.2));
      const bb = add([m[0], 0, m[1]], nn, TH / 2 + 0.2);
      obox(ctx, [bb[0], yb + 2.2, bb[2]], mul(u, Lh), [0, 2.0, 0], mul(nn, 0.3));
      const ic = add([m[0], 0, m[1]], nn, -TH / 2 + 0.18);
      obox(ctx, [ic[0], TOP + 0.25, ic[2]], mul(u, Lh), [0, 0.25, 0], mul(nn, 0.18));
      const k = Math.floor(Ls / 2.4);
      for (let j = 0; j < k; j++) { const s = -Ls / 2 + (j + 0.5) * Ls / k, c = add(oc, u, s); obox(ctx, [c[0], TOP + 1.85, c[2]], mul(u, 0.6), [0, 0.65, 0], mul(nn, 0.38)); }
    }
  }
  // towers on every vertex but the gate pair
  for (let i = 1; i < n - 1; i++) {
    const P = V[i], o = nrm([P[0], 0, P[1]]), s = [o[2], 0, -o[0]], yb = G[i] - 2.5, ht = 15.5, hw = 4.2;
    if (!col) paint(ctx, T.wall, 'oklch(0.91 0.016 80)');
    obox(ctx, [P[0], (ht + yb) / 2, P[1]], mul(o, hw), [0, (ht - yb) / 2, 0], mul(s, hw), col);
    if (col) continue;
    const roofed = p.roofs && p.roofs.includes(i);
    if (mid) {
      obox(ctx, [P[0], yb + 2.4, P[1]], mul(o, hw + 0.35), [0, 2.2, 0], mul(s, hw + 0.35));
      obox(ctx, [P[0], ht + 0.35, P[1]], mul(o, hw + 0.4), [0, 0.35, 0], mul(s, hw + 0.4));
    }
    if (roofed) {
      paint(ctx, T.slate, 'oklch(0.9 0.02 250)', 0.8);
      const yaw = Math.atan2(o[0], o[2]) * 180 / Math.PI; frame(P[0], 0, P[1], yaw);
      pyramid(ctx, 0, ht + 0.7, 0, hw + 0.7, hw + 0.7, 6.5);
      frame();
    } else if (mid) {
      for (const a of [-1, 0, 1]) for (const b of [-1, 1]) for (const sw of [0, 1]) {
        const ax = sw ? s : o, bx = sw ? o : s, c = add(add([P[0], 0, P[1]], bx, b * (hw + 0.1)), ax, a * (hw - 0.6));
        obox(ctx, [c[0], ht + 1.35, c[2]], mul(ax, 0.6), [0, 0.65, 0], mul(bx, 0.32));
      }
    }
    if (fine) { // arrow slits
      ctx.albedo(null); ctx.color('oklch(0.18 0.02 60)');
      for (const y of [6, 11]) { const c = add([P[0], 0, P[1]], o, hw + 0.02); obox(ctx, [c[0], y, c[2]], mul(s, 0.16), [0, 0.9, 0], mul(o, 0.05)); }
      ctx.albedo(T.wall);
    }
  }
  // gatehouse: two towers and the arched block, gate on -Z at (0, -53)
  const gz = p.gate[1], gy = p.ggy ?? 0;
  frame(0, 0, gz, 0);
  if (!col) paint(ctx, T.wall, 'oklch(0.93 0.016 82)');
  for (const sx of [-1, 1]) {
    box(ctx, sx * 4, gy - 4, -4.8, sx * 12.4, 16.5, 4.8, col);
    if (!col && mid) {
      box(ctx, sx * 3.8, gy - 4, -5.2, sx * 12.8, gy + 2.2, 5.2);
      box(ctx, sx * 3.7, 16.5, -5.3, sx * 12.9, 17.2, 5.3);
      for (const z of [-5.0, 5.0]) for (let k = 0; k < 4; k++) { const x = sx * (4.6 + k * 2.4 + 0.6); box(ctx, x - 0.6, 17.2, z - 0.32, x + 0.6, 18.5, z + 0.32); }
      for (let k = 0; k < 4; k++) { const z = -4.2 + k * 2.8; box(ctx, sx * 12.6 - 0.32, 17.2, z - 0.6, sx * 12.6 + 0.32, 18.5, z + 0.6); }
    }
  }
  if (col) {
    for (const sx of [-1, 1]) box(ctx, sx * 3.5, gy - 4, -4.5, sx * 4.05, 16.5, 4.5, true);
    box(ctx, -4, 7.9, -4.5, 4, 16.5, 4.5, true);
    box(ctx, -4, gy - 4, -4.5, 4, 0, 4.5, true);
    frame(); return;
  }
  archWall(ctx, 0, -4, 4, 0, 16.5, 9, 0, 3.5, 4.5, L <= 2 ? 10 : 6);
  box(ctx, -4, gy - 4, -4.5, 4, 0, 4.5);
  paint(ctx, T.cobble, 'oklch(0.9 0.01 80)'); box(ctx, -3.5, 0, -6, 3.5, 0.06, 4.5);
  paint(ctx, T.wall, 'oklch(0.86 0.02 75)');
  if (mid) { voussoirs(ctx, 0, 0, 3.5, 4.5, 9); for (const z of [-4.8, 4.8]) for (let k = 0; k < 3; k++) { const x = -2.6 + k * 2.6; box(ctx, x - 0.6, 17.2, z - 0.32, x + 0.6, 18.5, z + 0.32); } box(ctx, -4, 16.5, -5.0, 4, 17.2, 5.0); }
  if (fine) { // portcullis teeth under the arch, doors swung back, a shield over the arch
    paint(ctx, T.iron, 'oklch(0.75 0.01 250)', 0.5, 0.6);
    for (let x = -3.1; x <= 3.11; x += 0.62) { const top = 4.5 + Math.sqrt(Math.max(0, 12.25 - x * x)); box(ctx, x - 0.06, Math.min(top, 6.4) - 0.2, -3.0, x + 0.06, top, -2.86); }
    box(ctx, -3.3, 6.2, -3.0, 3.3, 6.35, -2.86);
    paint(ctx, T.oak, 'oklch(0.86 0.05 60)');
    for (const sx of [-1, 1]) { box(ctx, sx * 3.25, 0.05, 4.55, sx * 3.45, 5.6, 8.0); paint(ctx, T.iron, 'oklch(0.7 0.01 250)', 0.5, 0.6); for (const y of [1, 4.2]) box(ctx, sx * 3.2, y, 4.6, sx * 3.25, y + 0.18, 7.9); paint(ctx, T.oak, 'oklch(0.86 0.05 60)'); }
    ctx.albedo(null); ctx.color('oklch(0.48 0.17 28)'); box(ctx, -1.1, 9.4, -5.0, 1.1, 12.2, -4.85); ctx.color('oklch(0.82 0.13 85)'); box(ctx, -0.25, 9.8, -5.08, 0.25, 11.8, -4.98); box(ctx, -0.8, 10.6, -5.08, 0.8, 11.0, -4.98);
  }
  frame();
}

// ---------------- the keep: a walk-in hall ----------------
function keep(ctx, p, col) {
  const L = ctx.lod ?? 1, fine = L <= 2, mid = L <= 3, hw = 11, hd = 9, H = 17, t = 1.6, ys = 3.6, a = 2.3, TH = 23.5;
  frame();
  if (!col) paint(ctx, T.wall, 'oklch(0.94 0.014 80)');
  if (col) {
    box(ctx, -hw, -2, -hd, -a, H, -hd + t, true); box(ctx, a, -2, -hd, hw, H, -hd + t, true); box(ctx, -a, ys + a, -hd, a, H, -hd + t, true);
    box(ctx, -hw, -2, hd - t, hw, H, hd, true); box(ctx, -hw, -2, -hd, -hw + t, H, hd, true); box(ctx, hw - t, -2, -hd, hw, H, hd, true);
    box(ctx, -hw, 7.5, -hd, hw, 8.0, hd, true); box(ctx, -hw, H - 0.6, -hd, hw, H, hd, true); box(ctx, -hw, -0.6, -hd, hw, 0.05, hd, true);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(ctx, sx * hw - 3, -2, sz * hd - 3, sx * hw + 3, TH, sz * hd + 3, true);
    return;
  }
  archWall(ctx, -hd + t / 2, -hw, hw, 0, H, t, 0, a, ys, L <= 2 ? 10 : 6, 2);
  box(ctx, -hw, -2, hd - t, hw, H, hd); box(ctx, -hw, -2, -hd + t, -hw + t, H, hd - t); box(ctx, hw - t, -2, -hd + t, hw, H, hd - t);
  box(ctx, -hw + t, H - 0.6, -hd + t, hw - t, H, hd - t);
  if (mid) {
    voussoirs(ctx, -hd + t / 2, 0, a, ys, t, 9);
    // batter, string course, parapet + merlons
    for (const [x0, x1] of [[-hw - 0.4, -a - 0.5], [a + 0.5, hw + 0.4]]) box(ctx, x0, -2, -hd - 0.4, x1, 1.2, -hd + 0.2);
    box(ctx, -hw - 0.4, -2, hd - 0.2, hw + 0.4, 1.2, hd + 0.4); for (const sx of [-1, 1]) box(ctx, sx * hw - 0.4, -2, -hd, sx * hw + 0.4, 1.2, hd);
    box(ctx, -hw - 0.3, 8.0, -hd - 0.3, hw + 0.3, 8.4, hd + 0.3);
    box(ctx, -hw - 0.35, H, -hd - 0.35, hw + 0.35, H + 0.8, -hd + 0.35); box(ctx, -hw - 0.35, H, hd - 0.35, hw + 0.35, H + 0.8, hd + 0.35);
    for (const sx of [-1, 1]) box(ctx, sx * hw - 0.35, H, -hd, sx * hw + 0.35, H + 0.8, hd);
    for (let k = 0; k < 6; k++) { const x = -7 + k * 2.8; for (const z of [-hd, hd]) box(ctx, x - 0.6, H + 0.8, z - 0.35, x + 0.6, H + 2, z + 0.35); }
    for (let k = 0; k < 4; k++) { const z = -4.5 + k * 3; for (const x of [-hw, hw]) box(ctx, x - 0.35, H + 0.8, z - 0.6, x + 0.35, H + 2, z + 0.6); }
  }
  // corner turrets
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    paint(ctx, T.wall, 'oklch(0.92 0.016 78)');
    const cx = sx * hw, cz = sz * hd; box(ctx, cx - 3, -2, cz - 3, cx + 3, TH, cz + 3);
    if (mid) { box(ctx, cx - 3.4, TH - 0.6, cz - 3.4, cx + 3.4, TH + 0.2, cz + 3.4); box(ctx, cx - 3.4, -2, cz - 3.4, cx + 3.4, 1.4, cz + 3.4); }
    if (sz < 0) { paint(ctx, T.slate, 'oklch(0.9 0.02 250)', 0.8); pyramid(ctx, cx, TH + 0.2, cz, 3.9, 3.9, 6.2); }
    else if (mid) for (const a2 of [-2.2, 0, 2.2]) { box(ctx, cx + a2 - 0.55, TH + 0.2, cz - 3.4, cx + a2 + 0.55, TH + 1.4, cz - 2.8); box(ctx, cx + a2 - 0.55, TH + 0.2, cz + 2.8, cx + a2 + 0.55, TH + 1.4, cz + 3.4); box(ctx, cx - 3.4, TH + 0.2, cz + a2 - 0.55, cx - 2.8, TH + 1.4, cz + a2 + 0.55); box(ctx, cx + 2.8, TH + 0.2, cz + a2 - 0.55, cx + 3.4, TH + 1.4, cz + a2 + 0.55); }
  }
  if (L >= 4) return;
  // windows: dark reveals with warm glass
  const win = (x, y, z, nx, nz, w = 0.7, h = 1.6) => {
    ctx.albedo(null); ctx.color('oklch(0.2 0.02 60)'); obox(ctx, [x, y, z], nx ? [0, 0, w / 2 + 0.15] : [w / 2 + 0.15, 0, 0], [0, h / 2 + 0.15, 0], [nx * 0.06, 0, nz * 0.06]);
    ctx.color('oklch(0.55 0.1 65)'); ctx.emissive(GLOW); obox(ctx, [x + nx * 0.04, y - 0.1, z + nz * 0.04], nx ? [0, 0, w / 2] : [w / 2, 0, 0], [0, h / 2 - 0.1, 0], [nx * 0.04, 0, nz * 0.04]); ctx.emissive(null);
  };
  for (const x of [-5.5, 5.5]) win(x, 11.5, -hd - 0.02, 0, -1, 0.9, 2.0);
  for (const x of [-6, 6]) win(x, 2.6, -hd - 0.02, 0, -1, 0.5, 1.1);
  win(0, 12, -hd - 0.02, 0, -1, 1.2, 2.4);
  for (const sx of [-1, 1]) for (const z of [-3, 3]) win(sx * (hw + 0.02), 11.5, z, sx, 0, 0.8, 1.9);
  for (const x of [-5, 0, 5]) win(x, 11.5, hd + 0.02, 0, 1, 0.8, 1.9);
  // the hall inside
  paint(ctx, T.floor, 'oklch(0.92 0.04 70)'); box(ctx, -hw + t, -0.3, -hd + t, hw - t, 0.05, hd - t);
  box(ctx, -hw + t, 7.5, -hd + t, hw - t, 7.8, hd - t);
  paint(ctx, T.oak, 'oklch(0.75 0.05 55)');
  for (let x = -7.5; x <= 7.6; x += 3) box(ctx, x - 0.2, 7.1, -hd + t, x + 0.2, 7.5, hd - t);
  // hearth on the back wall
  paint(ctx, T.field, 'oklch(0.9 0.015 70)');
  const hz = hd - t;
  box(ctx, -2.4, 0, hz - 1.1, -1.7, 1.8, hz); box(ctx, 1.7, 0, hz - 1.1, 2.4, 1.8, hz); box(ctx, -2.6, 1.8, hz - 1.3, 2.6, 2.4, hz);
  obox(ctx, [0, 3.4, hz - 0.6], [2.2, 0, 0], [0, 1.0, 0], [0, 0, 0.6]); box(ctx, -1.2, 4.4, hz - 0.8, 1.2, 7.5, hz);
  box(ctx, -2.4, 0, hz - 1.6, 2.4, 0.2, hz - 1.0);
  ctx.albedo(null); ctx.color('oklch(0.16 0.01 40)'); box(ctx, -1.7, 0.02, hz - 0.05, 1.7, 1.8, hz - 0.01);
  ctx.color('oklch(0.4 0.12 40)'); ctx.emissive('oklch(0.65 0.2 40)'); box(ctx, -1.1, 0.05, hz - 0.9, 1.1, 0.22, hz - 0.2); ctx.emissive(null);
  // long table, benches, high seat
  paint(ctx, T.oak, 'oklch(0.86 0.05 65)');
  box(ctx, -1.0, 0.76, -5.5, 1.0, 0.86, 3.2);
  for (const z of [-5, 2.7]) for (const x of [-0.8, 0.8]) box(ctx, x - 0.08, 0, z - 0.08, x + 0.08, 0.76, z + 0.08);
  for (const sx of [-1, 1]) { box(ctx, sx * 1.55 - 0.25, 0.42, -5.3, sx * 1.55 + 0.25, 0.5, 3.0); for (const z of [-5, 2.7]) box(ctx, sx * 1.55 - 0.05, 0, z - 0.05, sx * 1.55 + 0.05, 0.42, z + 0.05); }
  box(ctx, -0.7, 0, 4.0, 0.7, 0.55, 5.0); box(ctx, -0.7, 0.55, 4.8, 0.7, 2.6, 5.0); box(ctx, -0.8, 0.55, 4.0, -0.7, 1.1, 5.0); box(ctx, 0.7, 0.55, 4.0, 0.8, 1.1, 5.0);
  if (fine) {
    ctx.albedo(null);
    // tableware
    for (let k = 0; k < 6; k++) { const z = -4.8 + k * 1.3; ctx.color('oklch(0.6 0.08 60)'); cyl(ctx, -0.5, 0.86, z, 0.14, 0.14, 0.03, 6); cyl(ctx, 0.5, 0.86, z + 0.5, 0.14, 0.14, 0.03, 6); ctx.color('oklch(0.55 0.06 50)'); cyl(ctx, 0.25, 0.86, z, 0.05, 0.06, 0.16, 6); }
    ctx.color('oklch(0.7 0.13 55)'); blob(ctx, [0, 1.0, -1], [0.35, 0.16, 0.25], 6, 3);
    // banners and shields on the side walls
    for (const sx of [-1, 1]) for (const z of [-4, 2]) {
      const x = sx * (hw - t - 0.03);
      ctx.color(sx < 0 ? 'oklch(0.5 0.17 28)' : 'oklch(0.45 0.12 255)'); obox(ctx, [x, 4.8, z], [0, 0, 0.8], [0, 1.9, 0], [0.03, 0, 0]);
      ctx.color('oklch(0.8 0.13 85)'); obox(ctx, [x - sx * 0.04, 5.2, z], [0, 0, 0.18], [0, 1.2, 0], [0.02, 0, 0]);
      ctx.color('oklch(0.5 0.08 60)'); obox(ctx, [x, 6.95, z], [0, 0, 1.0], [0, 0.06, 0], [0.08, 0, 0]);
    }
    for (const sx of [-1, 1]) for (const z of [-6, -1, 5]) { ctx.color(z === -1 ? 'oklch(0.55 0.14 145)' : 'oklch(0.62 0.12 60)'); frame(sx * (hw - t - 0.08), 2.9, z, sx * 90); cyl(ctx, 0, 0, 0, 0.55, 0.55, 0.06, 8); frame(); }
    ctx.color('oklch(0.62 0.1 35)'); box(ctx, -1.6, 0.05, -7.2, 1.6, 0.07, -5.8); // rug by the door
  }
}

// ---------------- a town house: stone ground storey, jettied timber upper, gable roof ----------------
function house(ctx, p, col) {
  const L = ctx.lod ?? 1, fine = L <= 2, mid = L <= 3, w = p.w ?? 9, d = p.d ?? 7, hw = w / 2, hd = d / 2, stone = !!p.stone;
  const g1 = 4.4, g2 = 7.8, jet = stone ? 0 : 0.4, ehd = hd + jet, ry = g2 + (ehd + 0.55) * 1.0, ey = g2 - 0.55 * 1.0;
  frame();
  if (col) { box(ctx, -hw, -1.5, -hd, hw, g2, hd, true); return; }
  paint(ctx, T.field, 'oklch(0.92 0.015 75)');
  box(ctx, -hw - 0.25, -1.5, -hd - 0.25, hw + 0.25, 0.35, hd + 0.25);
  box(ctx, -hw, 0.35, -hd, hw, g1, hd);
  if (stone) box(ctx, -hw, g1, -hd, hw, g2, hd);
  else { paint(ctx, T.plaster, p.plaster ?? 'oklch(0.97 0.025 85)'); box(ctx, -hw - 0.05, g1 + 0.25, -ehd, hw + 0.05, g2, ehd); }
  // gables
  paint(ctx, stone ? T.field : T.plaster, stone ? 'oklch(0.92 0.015 75)' : (p.plaster ?? 'oklch(0.97 0.025 85)'));
  for (const sx of [-1, 1]) tface(ctx, [sx * (hw + 0.05), g2, -ehd], [sx * (hw + 0.05), g2, ehd], [sx * (hw + 0.05), ry - 0.15, 0], [sx, 0, 0]);
  // roof
  paint(ctx, p.slate ? T.slate : T.shingle, p.roof ?? 'oklch(0.9 0.06 50)', 0.85);
  const ro = hw + 0.75;
  for (const sz of [-1, 1]) {
    const dz = sz * (ehd + 0.55), dy = ey - ry, sv = [0, dy, dz], nn = nrm([0, Math.abs(dz), -dy * Math.sign(dz) * -1 * -1]);
    const n2 = nrm([0, Math.abs(dz), sz * (ry - ey)]);
    obox(ctx, add([0, ry, 0], sv, 0.5), [ro, 0, 0], mul(sv, 0.5), mul(n2, 0.13), true);
    if (mid) for (let k = 1; k <= 6; k++) { const c = add(add([0, ry, 0], sv, k / 6.6), n2, 0.16); obox(ctx, c, [ro, 0, 0], mul(sv, 0.03), mul(n2, 0.05)); }
  }
  paint(ctx, T.oak, 'oklch(0.7 0.05 50)'); box(ctx, -ro, ry - 0.05, -0.18, ro, ry + 0.22, 0.18);
  if (mid) for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(ctx, [sx * ro, ry - 0.05, 0], [sx * ro, ey - 0.05, sz * (ehd + 0.55)], 0.16, 0.26);
  // chimney
  if (p.chim) { paint(ctx, T.field, 'oklch(0.88 0.015 70)'); const cx = p.chim * (hw - 0.8); box(ctx, cx - 0.55, g1, 0.1, cx + 0.55, ry + 1.4, 1.2); if (mid) box(ctx, cx - 0.7, ry + 1.4, -0.05, cx + 0.7, ry + 1.65, 1.35); }
  if (L >= 4) return;
  // jetty and timber frame
  if (!stone) {
    paint(ctx, T.oak, p.timber ?? 'oklch(0.62 0.05 50)');
    box(ctx, -hw - 0.1, g1, -ehd - 0.04, hw + 0.1, g1 + 0.3, ehd + 0.04);
    if (mid) {
      for (const sz of [-1, 1]) {
        const z = sz * (ehd + 0.04);
        for (let x = -hw + 0.4; x <= hw - 0.39; x += 0.8) box(ctx, x - 0.08, g1 - 0.15, sz > 0 ? hd : z, x + 0.08, g1, sz > 0 ? z : -hd);
        const xs = [-hw, -hw / 3, hw / 3, hw];
        for (const x of xs) box(ctx, x - 0.12, g1 + 0.3, z - 0.07, x + 0.12, g2, z + 0.07);
        box(ctx, -hw, g2 - 0.25, z - 0.07, hw, g2, z + 0.07); box(ctx, -hw, 5.95, z - 0.06, hw, 6.12, z + 0.06);
        if (fine) for (let i = 0; i < 3; i++) { const x0 = xs[i], x1 = xs[i + 1]; beam(ctx, [x0 + 0.1, g1 + 0.35, z], [(x0 + x1) / 2, 5.95, z], 0.14, 0.12); beam(ctx, [x1 - 0.1, g1 + 0.35, z], [(x0 + x1) / 2, 5.95, z], 0.14, 0.12); }
      }
      for (const sx of [-1, 1]) { const x = sx * (hw + 0.07); for (const z of [-ehd + 0.1, 0, ehd - 0.1]) box(ctx, x - 0.07, g1 + 0.3, z - 0.12, x + 0.07, g2, z + 0.12); box(ctx, x - 0.07, 5.95, -ehd, x + 0.07, 6.12, ehd); if (fine) beam(ctx, [x, g2, -ehd + 0.1], [x, ry - 0.3, 0], 0.12, 0.12), beam(ctx, [x, g2, ehd - 0.1], [x, ry - 0.3, 0], 0.12, 0.12), box(ctx, x - 0.06, g2, -0.1, x + 0.06, ry - 0.3, 0.1); }
    }
  } else if (mid) { paint(ctx, T.field, 'oklch(0.86 0.02 70)'); box(ctx, -hw - 0.12, g1 - 0.15, -hd - 0.12, hw + 0.12, g1 + 0.15, hd + 0.12); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(ctx, sx * hw - 0.35, 0.35, sz * hd - 0.35, sx * hw + 0.35, g2, sz * hd + 0.35); }
  // door (front, -Z)
  const dx = p.door ?? -w / 5, fz = -hd;
  paint(ctx, T.field, 'oklch(0.8 0.02 70)');
  box(ctx, dx - 1.3, 0.35, fz - 0.18, dx - 1.0, 3.9, fz + 0.02); box(ctx, dx + 1.0, 0.35, fz - 0.18, dx + 1.3, 3.9, fz + 0.02); box(ctx, dx - 1.4, 3.9, fz - 0.2, dx + 1.4, 4.3, fz + 0.02);
  box(ctx, dx - 1.3, 0, fz - 0.9, dx + 1.3, 0.35, fz);
  paint(ctx, T.oak, p.doorc ?? 'oklch(0.72 0.08 50)'); box(ctx, dx - 1.0, 0.35, fz - 0.07, dx + 1.0, 3.9, fz + 0.01);
  if (fine) { paint(ctx, T.iron, 'oklch(0.6 0.01 250)', 0.5, 0.6); for (const y of [1.1, 2.9]) box(ctx, dx - 0.95, y, fz - 0.1, dx + 0.6, y + 0.12, fz - 0.06); cyl(ctx, dx + 0.65, 1.8, fz - 0.14, 0.08, 0.08, 0.05, 6); }
  // windows
  const win = (x, y, z, sz, ww, hh) => {
    paint(ctx, T.oak, 'oklch(0.6 0.05 50)'); box(ctx, x - ww / 2 - 0.12, y - 0.12, z - 0.08 * -sz - 0.04, x + ww / 2 + 0.12, y + hh + 0.12, z + 0.04 * sz);
    ctx.albedo(null); ctx.color('oklch(0.5 0.09 65)'); ctx.emissive(GLOW); box(ctx, x - ww / 2, y, sz < 0 ? z - 0.1 : z + 0.06, x + ww / 2, y + hh, sz < 0 ? z - 0.06 : z + 0.1); ctx.emissive(null);
    if (mid) { ctx.albedo(T.oak); ctx.color(p.shutter ?? 'oklch(0.62 0.1 240)'); for (const s of [-1, 1]) box(ctx, x + s * (ww / 2 + 0.14), y, sz < 0 ? z - 0.12 : z + 0.06, x + s * (ww / 2 + 0.14 + ww / 2), y + hh, sz < 0 ? z - 0.06 : z + 0.12); }
    if (fine && p.flowers) { ctx.albedo(T.oak); ctx.color('oklch(0.6 0.06 55)'); box(ctx, x - ww / 2 - 0.1, y - 0.35, sz < 0 ? z - 0.45 : z, x + ww / 2 + 0.1, y - 0.05, sz < 0 ? z : z + 0.45); ctx.albedo(null); for (let k = 0; k < 5; k++) { ctx.color(['oklch(0.62 0.2 15)', 'oklch(0.85 0.15 95)', 'oklch(0.6 0.16 300)', 'oklch(0.95 0.02 90)', 'oklch(0.55 0.15 140)'][(k + (p.seed | 0)) % 5]); blob(ctx, [x - ww / 2 + (k + 0.5) * ww / 5, y + 0.02, z + sz * 0.22], [0.13, 0.13, 0.13], 5, 3); } }
  };
  win(-dx, 1.5, -hd, -1, 1.1, 1.3);
  for (const x of [-w / 4, w / 4]) { win(x, 5.1, -ehd, -1, 1.0, 1.25); win(x, 5.1, ehd, 1, 1.0, 1.25); }
  win(0, 1.6, hd, 1, 1.0, 1.2);
  if (fine) { // a lantern bracket and a sign over the door
    paint(ctx, T.iron, 'oklch(0.55 0.01 250)', 0.5, 0.5); box(ctx, dx + 1.5, 3.5, fz - 0.7, dx + 1.56, 3.56, fz); box(ctx, dx + 1.38, 3.0, fz - 0.78, dx + 1.68, 3.45, fz - 0.48);
    ctx.albedo(null); ctx.color('oklch(0.75 0.12 70)'); ctx.emissive(GLOW); box(ctx, dx + 1.42, 3.05, fz - 0.74, dx + 1.64, 3.4, fz - 0.52); ctx.emissive(null);
  }
}

// ---------------- market stall ----------------
function stall(ctx, p, col) {
  const L = ctx.lod ?? 1, fine = L <= 2;
  frame();
  if (col) { box(ctx, -1.5, 0, -0.5, 1.5, 0.95, 0.5, true); return; }
  paint(ctx, T.oak, 'oklch(0.82 0.05 60)');
  for (const x of [-1.45, 1.45]) { box(ctx, x - 0.07, 0, -0.75, x + 0.07, 2.5, -0.61); box(ctx, x - 0.07, 0, 0.61, x + 0.07, 2.9, 0.75); }
  box(ctx, -1.55, 0.85, -0.6, 1.55, 0.97, 0.6); box(ctx, -1.5, 0, -0.55, 1.5, 0.85, -0.48);
  // striped awning, sloped toward the front (-Z)
  const n = 7;
  for (let i = 0; i < n; i++) {
    ctx.albedo(T.linen); ctx.color(i % 2 ? 'oklch(0.97 0.01 90)' : (p.color ?? 'oklch(0.62 0.17 28)'));
    const x0 = -1.75 + i * 3.5 / n, x1 = x0 + 3.5 / n;
    face(ctx, [x0, 2.45, -1.15], [x1, 2.45, -1.15], [x1, 2.95, 0.85], [x0, 2.95, 0.85], [0, 1, -0.25]);
    face(ctx, [x0, 2.45, -1.15], [x1, 2.45, -1.15], [x1, 2.15, -1.15], [x0, 2.15, -1.15], [0, 0, -1]);
  }
  if (L >= 4) return;
  const goods = p.goods ?? 'apples';
  ctx.albedo(T.oak); ctx.color('oklch(0.75 0.05 60)');
  for (const x of [-0.9, 0, 0.9]) box(ctx, x - 0.4, 0.97, -0.35, x + 0.4, 1.15, 0.3);
  ctx.albedo(null);
  if (fine) for (let k = 0; k < 18; k++) {
    const x = -1.2 + (k % 6) * 0.48 + ((k * 7) % 3) * 0.04, z = -0.25 + Math.floor(k / 6) * 0.22, kind = goods === 'mixed' ? ['apples', 'cabbage', 'bread'][Math.floor(k / 2) % 3] : goods;
    if (kind === 'apples') { ctx.color(k % 3 ? 'oklch(0.6 0.19 30)' : 'oklch(0.75 0.17 125)'); blob(ctx, [x, 1.23, z], [0.09, 0.09, 0.09], 5, 3); blob(ctx, [x + 0.15, 1.23, z + 0.05], [0.09, 0.09, 0.09], 5, 3); }
    else if (kind === 'cabbage') { ctx.color('oklch(0.72 0.15 135)'); blob(ctx, [x, 1.27, z], [0.15, 0.13, 0.15], 6, 3); }
    else if (kind === 'bread') { ctx.color('oklch(0.72 0.12 70)'); blob(ctx, [x, 1.22, z], [0.17, 0.08, 0.1], 6, 3); }
    else if (kind === 'fish') { ctx.color('oklch(0.75 0.03 230)'); blob(ctx, [x, 1.19, z], [0.2, 0.05, 0.06], 6, 3); }
    else { ctx.color(['oklch(0.55 0.15 255)', 'oklch(0.6 0.16 25)', 'oklch(0.8 0.12 90)'][k % 3]); box(ctx, x - 0.2, 1.15, z - 0.08, x + 0.2, 1.3, z + 0.08); }
  }
  // crates and a basket under/beside
  ctx.albedo(T.oak); ctx.color('oklch(0.8 0.06 65)'); box(ctx, 1.75, 0, -0.4, 2.35, 0.55, 0.2); box(ctx, 1.8, 0.55, -0.35, 2.3, 1.0, 0.15);
  ctx.albedo(null); ctx.color('oklch(0.6 0.19 30)'); if (fine) for (let k = 0; k < 4; k++) blob(ctx, [1.9 + (k % 2) * 0.22, 1.05, -0.25 + Math.floor(k / 2) * 0.22], [0.09, 0.09, 0.09], 5, 3);
}

// ---------------- clutter rows: [type, x, z, yaw, scale] ----------------
function props(ctx, p, col) {
  const L = ctx.lod ?? 1, fine = L <= 2;
  if (col) return null;
  for (const [type, x, z, yaw = 0, s = 1] of p.items ?? []) {
    frame(x, 0, z, yaw);
    if (L >= 4 && !['tree', 'cart', 'hay'].includes(type)) continue;
    if (type === 'barrel') { paint(ctx, T.oak, 'oklch(0.78 0.06 60)'); cyl(ctx, 0, 0, 0, 0.38 * s, 0.44 * s, 0.5 * s, 8, false); cyl(ctx, 0, 0.5 * s, 0, 0.44 * s, 0.38 * s, 0.5 * s, 8); if (fine) { paint(ctx, T.iron, 'oklch(0.55 0.01 250)', 0.5, 0.5); cyl(ctx, 0, 0.15 * s, 0, 0.42 * s, 0.43 * s, 0.06, 8, false); cyl(ctx, 0, 0.82 * s, 0, 0.42 * s, 0.4 * s, 0.06, 8, false); } }
    else if (type === 'crate') { paint(ctx, T.oak, 'oklch(0.84 0.06 70)'); box(ctx, -0.4 * s, 0, -0.4 * s, 0.4 * s, 0.8 * s, 0.4 * s); if (fine) { ctx.color('oklch(0.65 0.06 60)'); for (const zz of [-1, 1]) beam(ctx, [-0.38 * s, 0.05, zz * 0.41 * s], [0.38 * s, 0.75 * s, zz * 0.41 * s], 0.08, 0.03); } }
    else if (type === 'sacks') { paint(ctx, null, 'oklch(0.8 0.05 80)'); for (let k = 0; k < 3; k++) blob(ctx, [(k - 1) * 0.45, 0.3, (k % 2) * 0.2], [0.25, 0.32, 0.22], 6, 3); blob(ctx, [0, 0.75, 0.1], [0.24, 0.28, 0.2], 6, 3); }
    else if (type === 'hay') { paint(ctx, T.straw, 'oklch(0.95 0.06 90)'); box(ctx, -0.6, 0, -0.4, 0.6, 0.6, 0.4); box(ctx, -0.3, 0.6, -0.35, 0.7, 1.15, 0.35); }
    else if (type === 'bench') { paint(ctx, T.oak, 'oklch(0.82 0.05 60)'); box(ctx, -1.0, 0.42, -0.2, 1.0, 0.5, 0.2); for (const xx of [-0.8, 0.8]) box(ctx, xx - 0.06, 0, -0.15, xx + 0.06, 0.42, 0.15); }
    else if (type === 'tub') { paint(ctx, T.oak, 'oklch(0.7 0.06 55)'); cyl(ctx, 0, 0, 0, 0.4, 0.45, 0.5, 8); paint(ctx, null, 'oklch(0.55 0.14 140)'); blob(ctx, [0, 0.65, 0], [0.42, 0.3, 0.42], 6, 3); if (fine) for (let k = 0; k < 6; k++) { ctx.color(['oklch(0.65 0.2 15)', 'oklch(0.88 0.15 95)', 'oklch(0.62 0.15 300)'][k % 3]); blob(ctx, [Math.cos(k) * 0.28, 0.85, Math.sin(k) * 0.28], [0.1, 0.1, 0.1], 5, 3); } }
    else if (type === 'woodpile') { paint(ctx, T.oak, 'oklch(0.75 0.07 60)'); for (let r = 0; r < 3; r++) for (let k = 0; k < 5 - r; k++) { frame(x, 0, z, yaw); const xx = -0.9 + k * 0.38 + r * 0.19; beam(ctx, [xx, 0.17 + r * 0.31, -0.6], [xx, 0.17 + r * 0.31, 0.6], 0.3, 0.3); } }
    else if (type === 'cart') { paint(ctx, T.oak, 'oklch(0.8 0.06 60)'); box(ctx, -0.8, 0.7, -1.3, 0.8, 0.85, 1.1); for (const sx of [-1, 1]) box(ctx, sx * 0.8 - 0.05, 0.85, -1.3, sx * 0.8 + 0.05, 1.25, 1.1); box(ctx, -0.8, 0.85, 1.05, 0.8, 1.25, 1.1); for (const sx of [-1, 1]) beam(ctx, [sx * 0.45, 0.75, -1.3], [sx * 0.3, 0.55, -2.9], 0.08); paint(ctx, T.oak, 'oklch(0.6 0.05 55)'); for (const sx of [-1, 1]) { frame(x, 0, z, yaw); const W2 = W([sx * 0.95, 0.6, 0.1]); frame(W2[0], W2[1], W2[2], yaw + 90); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832, b = (i + 1) / 10 * 6.2832; beam(ctx, [Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0], [Math.cos(b) * 0.6, Math.sin(b) * 0.6, 0], 0.08, 0.1); } beam(ctx, [-0.6, 0, 0], [0.6, 0, 0], 0.06); beam(ctx, [0, -0.6, 0], [0, 0.6, 0], 0.06); frame(x, 0, z, yaw); } if (p.cartload !== false) { paint(ctx, T.straw, 'oklch(0.95 0.06 90)'); box(ctx, -0.7, 0.85, -1.2, 0.7, 1.55, 0.6); } }
    else if (type === 'tree') { paint(ctx, T.oak, 'oklch(0.6 0.05 50)'); cyl(ctx, 0, 0, 0, 0.28 * s, 0.18 * s, 3.2 * s, 6); paint(ctx, null, s > 1.1 ? 'oklch(0.66 0.15 135)' : 'oklch(0.6 0.14 140)', 0.95); ctx.flat(); blob(ctx, [0, 4.0 * s, 0], [2.0 * s, 1.7 * s, 2.0 * s], 7, 4); blob(ctx, [0.9 * s, 3.3 * s, 0.6 * s], [1.3 * s, 1.1 * s, 1.3 * s], 6, 3); blob(ctx, [-0.8 * s, 3.5 * s, -0.5 * s], [1.3 * s, 1.1 * s, 1.3 * s], 6, 3); if (fine && p.fruit) { ctx.color('oklch(0.72 0.17 55)'); for (let k = 0; k < 9; k++) blob(ctx, [Math.cos(k * 2.4) * 1.7 * s, (3.4 + (k % 3) * 0.6) * s, Math.sin(k * 2.4) * 1.7 * s], [0.13, 0.13, 0.13], 4, 2); } }
    else if (type === 'brazier') { paint(ctx, T.iron, 'oklch(0.5 0.01 250)', 0.5, 0.6); for (let i = 0; i < 3; i++) { const a = i * 2.094; beam(ctx, [Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35], [Math.cos(a) * 0.25, 1.0, Math.sin(a) * 0.25], 0.06); } cyl(ctx, 0, 1.0, 0, 0.25, 0.45, 0.35, 8, false); if (fine) { ctx.albedo(null); ctx.color('oklch(0.4 0.12 40)'); ctx.emissive('oklch(0.7 0.19 45)'); cyl(ctx, 0, 1.25, 0, 0.38, 0.3, 0.06, 8); ctx.emissive(null); } }
    else if (type === 'anvil') { paint(ctx, T.oak, 'oklch(0.6 0.05 50)'); cyl(ctx, 0, 0, 0, 0.35, 0.35, 0.6, 8); paint(ctx, T.iron, 'oklch(0.45 0.01 250)', 0.4, 0.8); box(ctx, -0.35, 0.6, -0.15, 0.3, 0.85, 0.15); box(ctx, 0.3, 0.7, -0.08, 0.6, 0.85, 0.08); }
    else if (type === 'casks') { paint(ctx, T.oak, 'oklch(0.75 0.06 60)'); for (const [xx, yy] of [[-0.45, 0.4], [0.45, 0.4], [0, 1.15]]) { frame(x, 0, z, yaw); const c = W([xx, yy, 0]); frame(c[0], c[1], c[2], yaw); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832, b = (i + 1) / 8 * 6.2832; face(ctx, [Math.cos(a) * 0.4, Math.sin(a) * 0.4, -0.55], [Math.cos(b) * 0.4, Math.sin(b) * 0.4, -0.55], [Math.cos(b) * 0.4, Math.sin(b) * 0.4, 0.55], [Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.55], [Math.cos(a), Math.sin(a), 0]); tface(ctx, [0, 0, -0.55], [Math.cos(a) * 0.4, Math.sin(a) * 0.4, -0.55], [Math.cos(b) * 0.4, Math.sin(b) * 0.4, -0.55], [0, 0, -1]); } } }
    else if (type === 'banner') { paint(ctx, T.oak, 'oklch(0.6 0.05 50)'); cyl(ctx, 0, 0, 0, 0.08, 0.06, 6 * s, 6); ctx.albedo(T.linen); ctx.color(p.bcolor ?? 'oklch(0.55 0.18 28)'); face(ctx, [0.08, 5.8 * s, 0], [1.9 * s, 5.8 * s, 0], [1.9 * s, 3.4 * s, 0.1], [0.08, 3.4 * s, 0], [0, 0, -1]); ctx.color('oklch(0.82 0.13 85)'); face(ctx, [0.6 * s, 5.3 * s, -0.02], [1.35 * s, 5.3 * s, -0.02], [1.35 * s, 3.9 * s, 0.08], [0.6 * s, 3.9 * s, 0.08], [0, 0, -1]); }
    else if (type === 'flag') { paint(ctx, T.oak, 'oklch(0.55 0.05 50)'); cyl(ctx, 0, 0, 0, 0.1, 0.07, 7, 6); ctx.albedo(T.linen); ctx.color('oklch(0.55 0.18 28)'); face(ctx, [0.1, 6.9, 0], [2.6, 6.6, 0.2], [2.6, 5.0, 0.2], [0.1, 5.3, 0], [0, 0, -1]); ctx.color('oklch(0.82 0.13 85)'); face(ctx, [0.8, 6.4, 0.03], [1.9, 6.3, 0.15], [1.9, 5.6, 0.15], [0.8, 5.75, 0.03], [0, 0, -1]); }
  }
  frame();
}

// ---------------- paving: the square, the street to the gate, the path to the keep ----------------
function paving(ctx, p, col) {
  if (col) return null;
  const L = ctx.lod ?? 1;
  frame();
  paint(ctx, T.cobble, 'oklch(0.94 0.01 80)', 0.95);
  const [sx, sz] = p.square ?? [0, -20], r = p.r ?? 14, n = 28;
  for (let i = 0; i < n; i++) { const a = i / n * 6.2832, b = (i + 1) / n * 6.2832; tface(ctx, [sx, 0.07, sz], [sx + Math.cos(b) * r, 0.07, sz + Math.sin(b) * r], [sx + Math.cos(a) * r, 0.07, sz + Math.sin(a) * r], [0, 1, 0]); }
  for (const [x0, z0, x1, z1] of p.strips ?? []) face(ctx, [x0, 0.06, z0], [x1, 0.06, z0], [x1, 0.06, z1], [x0, 0.06, z1], [0, 1, 0]);
  if (L <= 2) { paint(ctx, T.flag, 'oklch(0.85 0.015 80)'); for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832; frame(sx + Math.cos(a) * r, 0, sz + Math.sin(a) * r, -a * 180 / Math.PI); box(ctx, -0.25, 0, -1.0, 0.25, 0.16, 1.0); } frame(); }
}

const KINDS = { wall, keep, house, stall, props, paving };
export function geometry(ctx) { ctx.flat(); const k = KINDS[ctx.params.kind ?? 'wall']; k(ctx, ctx.params, false); frame(); }
export function collider(ctx) { const k = KINDS[ctx.params.kind ?? 'wall']; const r = k(ctx, ctx.params, true); frame(); return r; }
