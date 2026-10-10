// Sunreach Vale small props: kind = "brazier" (iron standing brazier, fire bowl at 1.15 m),
// "spit" (camp cooking spit: forked posts, iron rod, a roast), "milestone" (weathered road stone, face -Z).
const V = (x, y, z) => [x, y, z];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// a tube from a to b, radius r0 -> r1, n sides, capped
function rod(ctx, a, b, r0, r1 = r0, n = 7) {
  const d = nrm(sub(b, a)), up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = nrm(crs(d, up)), v = crs(u, d);
  const P = (c, r, i) => { const t = (i / n) * Math.PI * 2, cs = Math.cos(t) * r, sn = Math.sin(t) * r; return [c[0] + u[0] * cs + v[0] * sn, c[1] + u[1] * cs + v[1] * sn, c[2] + u[2] * cs + v[2] * sn]; };
  for (let i = 0; i < n; i++) {
    const a0 = P(a, r0, i), a1 = P(a, r0, i + 1), b0 = P(b, r1, i), b1 = P(b, r1, i + 1);
    ctx.quad(...a0, ...a1, ...b1, ...b0);
    ctx.tri(...a, ...a1, ...a0); ctx.tri(...b, ...b0, ...b1);
  }
}
// a box with a small chamfer on its top edges
function block(ctx, cx, y0, cz, w, h, d, ch = 0.03) {
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h, yc = y1 - ch;
  ctx.quad(x0, y0, z0, x1, y0, z0, x1, yc, z0, x0, yc, z0);
  ctx.quad(x1, y0, z1, x0, y0, z1, x0, yc, z1, x1, yc, z1);
  ctx.quad(x0, y0, z1, x0, y0, z0, x0, yc, z0, x0, yc, z1);
  ctx.quad(x1, y0, z0, x1, y0, z1, x1, yc, z1, x1, yc, z0);
  ctx.quad(x0, yc, z0, x1, yc, z0, x1 - ch, y1, z0 + ch, x0 + ch, y1, z0 + ch);
  ctx.quad(x1, yc, z1, x0, yc, z1, x0 + ch, y1, z1 - ch, x1 - ch, y1, z1 - ch);
  ctx.quad(x0, yc, z1, x0, yc, z0, x0 + ch, y1, z0 + ch, x0 + ch, y1, z1 - ch);
  ctx.quad(x1, yc, z0, x1, yc, z1, x1 - ch, y1, z1 - ch, x1 - ch, y1, z0 + ch);
  ctx.quad(x0 + ch, y1, z0 + ch, x1 - ch, y1, z0 + ch, x1 - ch, y1, z1 - ch, x0 + ch, y1, z1 - ch);
}
// an open bowl: lathe of (r, y) points
function bowl(ctx, prof, n = 12) {
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * Math.PI * 2, t1 = ((i + 1) / n) * Math.PI * 2;
    for (let k = 0; k < prof.length - 1; k++) {
      const [ra, ya] = prof[k], [rb, yb] = prof[k + 1];
      ctx.quad(Math.cos(t0) * ra, ya, Math.sin(t0) * ra, Math.cos(t1) * ra, ya, Math.sin(t1) * ra, Math.cos(t1) * rb, yb, Math.sin(t1) * rb, Math.cos(t0) * rb, yb, Math.sin(t0) * rb);
    }
  }
}
function brazier(ctx) {
  const lo = ctx.lod ?? 1;
  ctx.flat(); ctx.color("oklch(0.30 0.012 60)"); ctx.metalness(0.7); ctx.roughness(0.55);
  // three splayed legs with feet, a mid ring
  for (let i = 0; i < 3; i++) {
    const t = (i / 3) * Math.PI * 2 + 0.5, c = Math.cos(t), s = Math.sin(t);
    rod(ctx, V(c * 0.42, 0, s * 0.42), V(c * 0.2, 1.0, s * 0.2), 0.035, 0.03, lo > 2 ? 4 : 6);
    if (lo < 3) rod(ctx, V(c * 0.42, 0, s * 0.42), V(c * 0.5, 0.03, s * 0.5), 0.05, 0.04, 5);
    const t2 = t + (Math.PI * 2) / 3;
    rod(ctx, V(c * 0.31, 0.5, s * 0.31), V(Math.cos(t2) * 0.31, 0.5, Math.sin(t2) * 0.31), 0.018, 0.018, 4);
  }
  rod(ctx, V(0, 0.95, 0), V(0, 1.02, 0), 0.12, 0.2, 10);
  // the fire bowl with a rolled lip and coals
  bowl(ctx, [[0.2, 1.0], [0.36, 1.06], [0.44, 1.18], [0.47, 1.2], [0.42, 1.2], [0.38, 1.14], [0.12, 1.06]], lo > 2 ? 8 : 14);
  if (lo < 3) for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; rod(ctx, V(Math.cos(t) * 0.45, 1.19, Math.sin(t) * 0.45), V(Math.cos(t) * 0.48, 1.3, Math.sin(t) * 0.48), 0.02, 0.008, 4); }
  ctx.metalness(0); ctx.roughness(0.9); ctx.color("oklch(0.25 0.03 40)"); ctx.emissive("oklch(0.62 0.2 40)");
  bowl(ctx, [[0.0, 1.13], [0.39, 1.15]], 10);
  ctx.emissive(null);
}
function spit(ctx) {
  ctx.flat(); ctx.color("oklch(0.48 0.06 60)"); ctx.roughness(0.95);
  for (const x of [-0.9, 0.9]) {
    rod(ctx, V(x, 0, -0.18), V(x, 1.05, 0), 0.04, 0.035, 6); rod(ctx, V(x, 0, 0.18), V(x, 1.05, 0), 0.04, 0.035, 6);
    rod(ctx, V(x, 1.0, 0), V(x, 1.2, -0.08), 0.03, 0.02, 5); rod(ctx, V(x, 1.0, 0), V(x, 1.2, 0.08), 0.03, 0.02, 5);
  }
  ctx.color("oklch(0.32 0.01 60)"); ctx.metalness(0.6); ctx.roughness(0.5);
  rod(ctx, V(-1.1, 1.04, 0), V(1.1, 1.04, 0), 0.015, 0.015, 5);
  rod(ctx, V(1.1, 1.04, 0), V(1.1, 0.88, 0), 0.015, 0.015, 4); rod(ctx, V(1.1, 0.88, 0), V(1.22, 0.88, 0), 0.015, 0.015, 4);
  // the roast: a browned haunch on the rod
  ctx.metalness(0); ctx.smooth(); ctx.color("oklch(0.45 0.1 45)"); ctx.roughness(0.6);
  rod(ctx, V(-0.32, 1.04, 0), V(0.0, 1.03, 0), 0.07, 0.16, 9); rod(ctx, V(0.0, 1.03, 0), V(0.3, 1.04, 0), 0.16, 0.06, 9);
  ctx.color("oklch(0.9 0.02 80)"); rod(ctx, V(0.3, 1.04, 0), V(0.42, 1.04, 0), 0.025, 0.03, 6);
}
function milestone(ctx) {
  ctx.flat(); ctx.albedo("cdn/texture-terrain-wow-hand-painted-worn-limestone-flagstones.png"); ctx.color("oklch(0.92 0.02 85)"); ctx.roughness(0.9);
  block(ctx, 0, -0.2, 0, 0.62, 0.3, 0.46, 0.04);  // footing, sunk a little
  block(ctx, 0, 0.1, 0, 0.42, 0.78, 0.3, 0.06);   // shaft
  // rounded cap
  const n = 8, r = 0.21;
  for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI; const p = (a) => [Math.cos(a) * r, 0.88 + Math.sin(a) * r * 0.7];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    ctx.quad(x0, y0, -0.15, x1, y1, -0.15, x1, y1, 0.15, x0, y0, 0.15);
    ctx.tri(0, 0.88, -0.15, x1, y1, -0.15, x0, y0, -0.15); ctx.tri(0, 0.88, 0.15, x0, y0, 0.15, x1, y1, 0.15); }
  ctx.albedo(null);
}

// ---- ground dressing ----
function cobbles(ctx) { // a scatter of broken flagstones, each an irregular bevelled slab, sunk a little
  ctx.flat(); ctx.albedo("cdn/texture-terrain-wow-hand-painted-worn-limestone-flagstones.png"); ctx.roughness(0.9);
  const n = ctx.params.n ?? 7, R = ctx.params.r ?? 1.6;
  for (let i = 0; i < n; i++) {
    const a = ctx.random() * 6.283, d = Math.sqrt(ctx.random()) * R, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const sz = 0.18 + ctx.random() * 0.28, h = 0.05 + ctx.random() * 0.05, tilt = (ctx.random() - 0.5) * 0.06, sides = 5 + Math.floor(ctx.random() * 3), rot = ctx.random() * 6.283;
    ctx.color(`oklch(${(0.86 + ctx.random() * 0.1).toFixed(2)} 0.02 ${70 + Math.floor(ctx.random() * 30)})`);
    const top = [], bot = [];
    for (let k = 0; k < sides; k++) { const t = rot + (k / sides) * 6.283, r = sz * (0.7 + ctx.random() * 0.45);
      const x = cx + Math.cos(t) * r, z = cz + Math.sin(t) * r; top.push([x * 0.92 + cx * 0.08, h + (x - cx) * tilt, z * 0.92 + cz * 0.08]); bot.push([x, -0.04, z]); }
    for (let k = 1; k < sides - 1; k++) ctx.tri(...top[0], ...top[k + 1], ...top[k]);
    for (let k = 0; k < sides; k++) { const k2 = (k + 1) % sides; ctx.quad(...bot[k], ...bot[k2], ...top[k2], ...top[k]); }
  }
  ctx.albedo(null);
}
function tuft(ctx, x, z, h, w, blades, hue) { // crossed blade cards bending outward
  for (let b = 0; b < blades; b++) {
    const t = ctx.random() * 6.283, lean = 0.15 + ctx.random() * 0.25, hh = h * (0.6 + ctx.random() * 0.5), c = Math.cos(t), s = Math.sin(t);
    const px = -s * w, pz = c * w, tx = x + c * lean * hh, tz = z + s * lean * hh;
    ctx.color(`oklch(${(0.5 + ctx.random() * 0.14).toFixed(2)} ${(0.1 + ctx.random() * 0.04).toFixed(2)} ${hue + Math.floor(ctx.random() * 20)})`);
    ctx.quad(x - px, 0, z - pz, x + px, 0, z + pz, x + c * lean * hh * 0.5 + px * 0.5, hh * 0.55, z + s * lean * hh * 0.5 + pz * 0.5, x + c * lean * hh * 0.5 - px * 0.5, hh * 0.55, z + s * lean * hh * 0.5 - pz * 0.5);
    ctx.tri(x + c * lean * hh * 0.5 - px * 0.5, hh * 0.55, z + s * lean * hh * 0.5 - pz * 0.5, x + c * lean * hh * 0.5 + px * 0.5, hh * 0.55, z + s * lean * hh * 0.5 + pz * 0.5, tx, hh, tz);
  }
}
function weeds(ctx) {
  ctx.flat(); ctx.roughness(0.95);
  const n = ctx.params.n ?? 5, R = ctx.params.r ?? 0.8;
  for (let i = 0; i < n; i++) { const a = ctx.random() * 6.283, d = Math.sqrt(ctx.random()) * R;
    tuft(ctx, Math.cos(a) * d, Math.sin(a) * d, 0.3 + ctx.random() * 0.35, 0.035, 7 + Math.floor(ctx.random() * 5), 118); }
  // a few little yellow heads
  ctx.color("oklch(0.85 0.15 95)"); ctx.emissive(null);
  for (let i = 0; i < 3; i++) { const a = ctx.random() * 6.283, d = ctx.random() * R, x = Math.cos(a) * d, z = Math.sin(a) * d, y = 0.35 + ctx.random() * 0.15;
    ctx.quad(x - 0.04, y, z, x + 0.04, y, z, x + 0.04, y + 0.06, z, x - 0.04, y + 0.06, z); ctx.quad(x, y, z - 0.04, x, y, z + 0.04, x, y + 0.06, z + 0.04, x, y + 0.06, z - 0.04); }
}
function reeds(ctx) { // a clump of tall reeds with a few brown cattail heads
  ctx.flat(); ctx.roughness(0.9);
  const n = ctx.params.n ?? 4, R = ctx.params.r ?? 0.9;
  for (let i = 0; i < n; i++) { const a = ctx.random() * 6.283, d = Math.sqrt(ctx.random()) * R, x = Math.cos(a) * d, z = Math.sin(a) * d;
    tuft(ctx, x, z, 1.1 + ctx.random() * 0.7, 0.03, 9, 105);
    for (let k = 0; k < 2; k++) { const ox = x + (ctx.random() - 0.5) * 0.3, oz = z + (ctx.random() - 0.5) * 0.3, h = 1.3 + ctx.random() * 0.6;
      ctx.color("oklch(0.55 0.09 115)"); rod(ctx, V(ox, 0, oz), V(ox + 0.05, h, oz), 0.012, 0.008, 4);
      ctx.color("oklch(0.36 0.06 50)"); rod(ctx, V(ox + 0.04, h - 0.32, oz), V(ox + 0.05, h - 0.06, oz), 0.035, 0.03, 6);
      ctx.color("oklch(0.55 0.09 115)"); rod(ctx, V(ox + 0.05, h - 0.06, oz), V(ox + 0.05, h + 0.12, oz), 0.008, 0.003, 3); }
  }
}
function pier(ctx) { // origin at the shore end, deck top at y = deck, runs along -Z for len metres
  const len = ctx.params.len ?? 9, w = ctx.params.w ?? 2.2, deck = ctx.params.deck ?? 0.15, depth = ctx.params.depth ?? 2.4;
  ctx.flat(); ctx.albedo("cdn/texture-weathered-oak-planks.png"); ctx.roughness(0.92);
  const pl = 0.24;
  for (let z = 0; z > -len + 0.01; z -= pl + 0.02) { const z1 = Math.max(-len, z - pl), j = (ctx.random() - 0.5) * 0.04;
    ctx.color(`oklch(${(0.82 + ctx.random() * 0.12).toFixed(2)} 0.03 70)`); block(ctx, j, deck - 0.06, (z + z1) / 2, w + (ctx.random() - 0.5) * 0.1, 0.06, Math.abs(z1 - z), 0.012); }
  ctx.color("oklch(0.7 0.04 65)");
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) block(ctx, x, deck - 0.24, -len / 2, 0.16, 0.18, len, 0.02); // stringers
  for (let z = -0.4; z > -len; z -= 2.2) for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) rod(ctx, V(x, -depth, z), V(x, deck + (z < -len + 2.5 ? 0.9 : 0.12), z), 0.1, 0.09, 7);
  // the end posts carry a rope rail
  ctx.albedo(null); ctx.color("oklch(0.78 0.05 85)"); ctx.roughness(1);
  for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) { let pz = -0.4; for (let z = -2.6; z > -len; z -= 2.2) { if (z < -len + 2.5) rod(ctx, V(x, deck + 0.8, pz), V(x, deck + 0.8, z), 0.02, 0.02, 4); pz = z; } }
}
function farmgate(ctx) { // two posts 2.6 m apart, a braced leaf swung half open; opening along X
  ctx.flat(); ctx.albedo("cdn/texture-weathered-oak-planks.png"); ctx.roughness(0.92); ctx.color("oklch(0.82 0.04 70)");
  for (const x of [-1.35, 1.35]) { block(ctx, x, -0.3, 0, 0.18, 1.85, 0.18, 0.03); }
  const a = 0.7, c = Math.cos(a), s = Math.sin(a), L = 2.5; // hinged at x = -1.25, swung inward (+z)
  const P = (u, y) => [-1.25 + u * c, y, u * s];
  const bar = (u0, y0, u1, y1, t = 0.07) => { const A = P(u0, y0), B = P(u1, y1); rod(ctx, A, B, t, t, 4); };
  for (const y of [0.3, 0.75, 1.2]) bar(0, y, L, y, 0.05);
  bar(0, 0.2, 0, 1.3, 0.06); bar(L, 0.2, L, 1.3, 0.06); bar(0.05, 0.3, L - 0.05, 1.2, 0.045);
  ctx.albedo(null); ctx.color("oklch(0.3 0.01 60)"); ctx.metalness(0.6);
  for (const y of [0.35, 1.15]) bar(-0.05, y, 0.25, y, 0.03);
}

// a low arched timber footbridge: span L along Z, deck width W, apex rise H; origin at mid-span, ends at y = 0
const archY = (z, L, H) => H * (1 - (2 * z / L) ** 2);
function bridge(ctx) {
  const L = ctx.params.len ?? 14, W = ctx.params.w ?? 4, H = ctx.params.rise ?? 0.9, n = 28;
  ctx.flat(); ctx.albedo("cdn/texture-weathered-oak-planks.png"); ctx.roughness(0.9);
  // planks across the arc, each a little uneven
  for (let i = 0; i < n; i++) { const z0 = -L / 2 + (i / n) * L, z1 = z0 + L / n - 0.03, y0 = archY(z0, L, H), y1 = archY(z1, L, H), w = W / 2 + (ctx.random() - 0.5) * 0.12;
    ctx.color(`oklch(${(0.8 + ctx.random() * 0.14).toFixed(2)} 0.035 68)`);
    ctx.quad(-w, y0, z0, w, y0, z0, w, y1, z1, -w, y1, z1); ctx.quad(w, y0 - 0.08, z0, -w, y0 - 0.08, z0, -w, y1 - 0.08, z1, w, y1 - 0.08, z1);
    ctx.quad(-w, y0 - 0.08, z0, w, y0 - 0.08, z0, w, y0, z0, -w, y0, z0); ctx.quad(w, y1 - 0.08, z1, -w, y1 - 0.08, z1, -w, y1, z1, w, y1, z1); }
  // two curved stringer beams under the deck edges
  ctx.color("oklch(0.66 0.04 62)");
  for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) for (let i = 0; i < 14; i++) { const za = -L / 2 + (i / 14) * L, zb = za + L / 14;
    rod(ctx, V(x, archY(za, L, H) - 0.25, za), V(x, archY(zb, L, H) - 0.25, zb), 0.16, 0.16, 6); }
  // trestle legs at the banks and quarter spans, sunk into the bed
  for (const z of [-L / 2 + 1.2, -L / 4, L / 4, L / 2 - 1.2]) for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) rod(ctx, V(x, -2.2, z), V(x, archY(z, L, H) - 0.3, z), 0.13, 0.12, 7);
  for (const z of [-L / 4, L / 4]) rod(ctx, V(-W / 2 + 0.2, -1.2, z), V(W / 2 - 0.2, archY(z, L, H) - 0.4, z), 0.07, 0.07, 5);
  // railings: posts every ~1.75 m and a top rail following the arc
  for (const x of [-W / 2 + 0.06, W / 2 - 0.06]) {
    for (let i = 0; i <= 8; i++) { const z = -L / 2 + 0.3 + (i / 8) * (L - 0.6), y = archY(z, L, H); block(ctx, x, y - 0.05, z, 0.12, (i === 0 || i === 8) ? 1.2 : 1.0, 0.12, 0.02); }
    for (let i = 0; i < 12; i++) { const za = -L / 2 + 0.3 + (i / 12) * (L - 0.6), zb = za + (L - 0.6) / 12;
      rod(ctx, V(x, archY(za, L, H) + 0.95, za), V(x, archY(zb, L, H) + 0.95, zb), 0.05, 0.05, 5);
      rod(ctx, V(x, archY(za, L, H) + 0.5, za), V(x, archY(zb, L, H) + 0.5, zb), 0.035, 0.035, 4); }
  }
  ctx.albedo(null);
}

// a weathered stone arch that frames the portal slab: opening OW x OH, depth D, voussoirs with faint glowing runes on both faces
function runearch(ctx) {
  const OW = ctx.params.ow ?? 3.6, OH = ctx.params.oh ?? 4.1, D = ctx.params.d ?? 1.0, T = 0.9; // T = stone band thickness
  const R = OW / 2, springY = OH - R;
  ctx.flat(); ctx.albedo("cdn/texture-terrain-wow-hand-painted-worn-limestone-flagstones.png"); ctx.roughness(0.92);
  const stone = () => ctx.color(`oklch(${(0.72 + ctx.random() * 0.1).toFixed(2)} 0.02 ${70 + Math.floor(ctx.random() * 25)})`);
  // plinths
  for (const sx of [-1, 1]) { stone(); block(ctx, sx * (R + T / 2), 0, 0, T + 0.3, 0.45, D + 0.3, 0.06); }
  // jamb courses, each block a little proud or sunk
  const courses = 5;
  for (const sx of [-1, 1]) for (let i = 0; i < courses; i++) { const y0 = 0.45 + (i / courses) * (springY - 0.45), h = (springY - 0.45) / courses - 0.04; stone();
    block(ctx, sx * (R + T / 2) + (ctx.random() - 0.5) * 0.06, y0, (ctx.random() - 0.5) * 0.04, T + (ctx.random() - 0.5) * 0.08, h, D, 0.05); }
  // voussoirs around the half-circle
  const n = 11; const ring = [];
  for (let i = 0; i < n; i++) { const a0 = Math.PI - (i / n) * Math.PI + 0.012, a1 = Math.PI - ((i + 1) / n) * Math.PI - 0.012;
    const ri = R, ro = R + T * (i === 5 ? 1.25 : 1), dz = D / 2 + (i === 5 ? 0.08 : 0);
    const P = (a, r, z) => [Math.cos(a) * r, springY + Math.sin(a) * r, z];
    const q = [P(a0, ri, -dz), P(a1, ri, -dz), P(a1, ro, -dz), P(a0, ro, -dz)], b = [P(a0, ri, dz), P(a1, ri, dz), P(a1, ro, dz), P(a0, ro, dz)];
    stone();
    ctx.quad(...q[0], ...q[3], ...q[2], ...q[1]); ctx.quad(...b[0], ...b[1], ...b[2], ...b[3]);
    ctx.quad(...q[0], ...q[1], ...b[1], ...b[0]); ctx.quad(...q[3], ...b[3], ...b[2], ...q[2]);
    ctx.quad(...q[0], ...b[0], ...b[3], ...q[3]); ctx.quad(...q[1], ...q[2], ...b[2], ...b[1]);
    ring.push([(a0 + a1) / 2, (ri + ro) / 2, dz]); }
  // moss in the low joints
  ctx.albedo(null); ctx.color("oklch(0.5 0.09 125)"); ctx.roughness(1);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) block(ctx, sx * (R + T / 2) + (ctx.random() - 0.5) * 0.5, 0.42 + i * 0.6, D / 2 + 0.01, 0.35, 0.05, 0.03, 0.01);
  // runes: small angular glyph strokes, faint warm-white glow, on each voussoir and up each jamb, both faces
  ctx.color("oklch(0.92 0.08 85)"); ctx.emissive("oklch(0.85 0.12 80)", 1.6);
  const glyph = (cx, cy, z, s, ang, face) => { const c = Math.cos(ang), si = Math.sin(ang), w = 0.022, zz = z + face * 0.012;
    const strokes = [[[-0.5, -0.6], [-0.5, 0.6]], [[-0.5, 0.6], [0.4, 0.1]], [[0.4, 0.1], [-0.5, -0.1]], [[0.1, -0.6], [0.5, -0.2]]].slice(0, 2 + Math.floor(ctx.random() * 3));
    for (const [[ax, ay], [bx, by]] of strokes) { const X = (x, y) => cx + (x * c - y * si) * s, Y = (x, y) => cy + (x * si + y * c) * s;
      const x0 = X(ax, ay), y0 = Y(ax, ay), x1 = X(bx, by), y1 = Y(bx, by), l = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / l * w, ny = (x1 - x0) / l * w;
      if (face > 0) ctx.quad(x0 - nx, y0 - ny, zz, x1 - nx, y1 - ny, zz, x1 + nx, y1 + ny, zz, x0 + nx, y0 + ny, zz);
      else ctx.quad(x0 - nx, y0 - ny, zz, x0 + nx, y0 + ny, zz, x1 + nx, y1 + ny, zz, x1 - nx, y1 - ny, zz); } };
  for (const face of [-1, 1]) {
    for (const [a, r, dz] of ring) glyph(Math.cos(a) * r, springY + Math.sin(a) * r, face * dz, 0.17, a - Math.PI / 2, face);
    for (const sx of [-1, 1]) for (let i = 0; i < courses; i++) glyph(sx * (R + T / 2), 0.45 + (i + 0.5) * (springY - 0.45) / courses, face * D / 2, 0.15, 0, face);
  }
  ctx.emissive(null);
}
// a spiked barricade: crossed sharpened stakes on a log, lashed; runs along X, ~3 m
function barricade(ctx) {
  const L = ctx.params.len ?? 3; ctx.flat(); ctx.albedo("cdn/texture-weathered-oak-planks.png"); ctx.roughness(0.95);
  ctx.color("oklch(0.62 0.04 60)"); rod(ctx, V(-L / 2, 0.55, 0), V(L / 2, 0.55, 0), 0.13, 0.12, 7);
  const n = Math.round(L / 0.5);
  for (let i = 0; i < n; i++) { const x = -L / 2 + 0.25 + i * (L - 0.5) / (n - 1), side = i % 2 ? 1 : -1, len = 1.7 + ctx.random() * 0.4, lean = 0.75 + ctx.random() * 0.15;
    ctx.color(`oklch(${(0.6 + ctx.random() * 0.1).toFixed(2)} 0.045 62)`);
    const base = V(x + (ctx.random() - 0.5) * 0.1, 0, side * 0.55), tip = V(x + (ctx.random() - 0.5) * 0.2, len * lean, -side * 0.55 * 0.9);
    const mid = V(base[0] + (tip[0] - base[0]) * 0.82, base[1] + (tip[1] - base[1]) * 0.82, base[2] + (tip[2] - base[2]) * 0.82);
    rod(ctx, base, mid, 0.07, 0.065, 6); ctx.color("oklch(0.78 0.05 75)"); rod(ctx, mid, tip, 0.065, 0.004, 6); }
  ctx.albedo(null); ctx.color("oklch(0.72 0.06 80)"); for (let i = 0; i < n; i += 2) { const x = -L / 2 + 0.25 + i * (L - 0.5) / (n - 1); rod(ctx, V(x - 0.1, 0.55, -0.15), V(x + 0.1, 0.62, 0.15), 0.03, 0.03, 4); }
}
function hive(ctx) { // a painted wooden bee box: stand, two stacked supers, a pitched lid; bees are implied by the entrance slot
  ctx.flat(); ctx.roughness(0.85);
  const tint = ['oklch(0.86 0.06 90)', 'oklch(0.78 0.07 230)', 'oklch(0.82 0.08 60)'][Math.floor(ctx.random() * 3)];
  ctx.color('oklch(0.42 0.05 55)'); for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) block(ctx, x, 0, z, 0.06, 0.3, 0.06, 0.005);
  ctx.color('oklch(0.5 0.05 60)'); block(ctx, 0, 0.3, 0, 0.58, 0.05, 0.58, 0.01);
  ctx.color(tint); block(ctx, 0, 0.35, 0, 0.5, 0.26, 0.5, 0.01); block(ctx, 0, 0.62, 0, 0.5, 0.24, 0.5, 0.01);
  ctx.color('oklch(0.2 0.02 60)'); ctx.quad(-0.12, 0.37, -0.252, 0.12, 0.37, -0.252, 0.12, 0.41, -0.252, -0.12, 0.41, -0.252);
  ctx.color('oklch(0.55 0.04 40)'); const y = 0.86, h = 0.14, w = 0.31;
  ctx.quad(-w, y, -w, w, y, -w, w, y + h, 0, -w, y + h, 0); ctx.quad(w, y, w, -w, y, w, -w, y + h, 0, w, y + h, 0);
  ctx.tri(-w, y, w, -w, y, -w, -w, y + h, 0); ctx.tri(w, y, -w, w, y, w, w, y + h, 0);
}
function blanket(ctx) { // a gingham picnic cloth with a basket, a loaf and two cups: someone just stepped away
  ctx.flat(); ctx.roughness(0.95); const W = 1.8, D = 1.4, n = 6, pal = ctx.params.pal === 'blue' ? ['oklch(0.62 0.13 250)', 'oklch(0.96 0.01 90)', 'oklch(0.8 0.07 250)'] : ['oklch(0.58 0.17 25)', 'oklch(0.96 0.01 90)', 'oklch(0.78 0.09 25)'];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const a = i % 2, b = j % 2; ctx.color(a && b ? pal[0] : !a && !b ? pal[1] : pal[2]);
    const x0 = -W / 2 + i * W / n, x1 = x0 + W / n, z0 = -D / 2 + j * D / n, z1 = z0 + D / n, y = 0.02 + ((i * 7 + j * 3) % 5) * 0.002;
    ctx.quad(x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z0); }
  ctx.color('oklch(0.6 0.08 70)'); block(ctx, 0.45, 0.02, -0.25, 0.42, 0.26, 0.3, 0.02); ctx.color('oklch(0.5 0.07 65)'); rod(ctx, V(0.27, 0.28, -0.25), V(0.45, 0.46, -0.25), 0.015); rod(ctx, V(0.45, 0.46, -0.25), V(0.63, 0.28, -0.25), 0.015);
  ctx.color('oklch(0.7 0.1 70)'); rod(ctx, V(-0.4, 0.07, 0.15), V(-0.05, 0.07, 0.22), 0.06, 0.055, 8);
  ctx.color('oklch(0.93 0.01 90)'); rod(ctx, V(-0.2, 0.02, -0.25), V(-0.2, 0.11, -0.25), 0.035, 0.04, 8); ctx.color('oklch(0.8 0.06 230)'); rod(ctx, V(0.05, 0.02, 0.3), V(0.05, 0.11, 0.3), 0.035, 0.04, 8);
}
function sunshade(ctx) { // a striped market parasol on a pole, 2.6 m tall, 8 alternating panels
  ctx.flat(); ctx.roughness(0.9); const R = ctx.params.r ?? 1.6, H = 2.6, pal = ctx.params.pal === 'blue' ? ['oklch(0.6 0.14 250)', 'oklch(0.96 0.01 90)'] : ['oklch(0.58 0.17 28)', 'oklch(0.86 0.13 88)'];
  ctx.color('oklch(0.45 0.05 60)'); rod(ctx, V(0, 0, 0), V(0, H + 0.15, 0), 0.04, 0.035); ctx.color('oklch(0.4 0.03 60)'); rod(ctx, V(0, 0, 0), V(0, 0.1, 0), 0.22, 0.2, 10);
  const n = 8; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; ctx.color(pal[i % 2]);
    const p0 = [Math.cos(a0) * R, H - 0.45, Math.sin(a0) * R], p1 = [Math.cos(a1) * R, H - 0.45, Math.sin(a1) * R];
    ctx.tri(0, H, 0, ...p1, ...p0); ctx.tri(0, H - 0.02, 0, ...p0, ...p1);
    const q0 = [p0[0] * 1.02, H - 0.62, p0[2] * 1.02], q1 = [p1[0] * 1.02, H - 0.62, p1[2] * 1.02]; ctx.quad(...p0, ...p1, ...q1, ...q0); ctx.quad(...p1, ...p0, ...q0, ...q1); }
}
function wildflowers(ctx) { // a meadow drift: grass tufts carrying red poppies, yellow buttercups, white daisies and clover pink; r metres across
  ctx.flat(); ctx.roughness(0.9);
  const L = Math.max(1, ctx.lod ?? 1), R = ctx.params.r ?? 2.2, n = Math.round((ctx.params.n ?? R * R * 9) / (L * L)), mix = ctx.params.mix ?? [0.34, 0.33, 0.23, 0.1];
  const HEAD = ["oklch(0.58 0.21 28)", "oklch(0.86 0.16 95)", "oklch(0.96 0.02 95)", "oklch(0.74 0.12 350)"];
  for (let i = 0; i < Math.round(n / 4); i++) { const a = ctx.random() * 6.283, d = Math.sqrt(ctx.random()) * R; tuft(ctx, Math.cos(a) * d, Math.sin(a) * d, 0.22 + ctx.random() * 0.2, 0.03, 5, 125); }
  for (let i = 0; i < n; i++) {
    const a = ctx.random() * 6.283, d = Math.sqrt(ctx.random()) * R, x = Math.cos(a) * d, z = Math.sin(a) * d;
    let r = ctx.random(), k = 0; while (k < 3 && r > mix[k]) { r -= mix[k]; k++; }
    const h = (k === 0 ? 0.42 : k === 2 ? 0.3 : 0.26) + ctx.random() * 0.18, lean = (ctx.random() - 0.5) * 0.12;
    ctx.color("oklch(0.52 0.12 128)"); rod(ctx, V(x, 0, z), V(x + lean, h, z + lean * 0.6), 0.008, 0.006, 3);
    const cx = x + lean, cz = z + lean * 0.6, s = k === 0 ? 0.075 : k === 2 ? 0.06 : 0.045;
    ctx.color(HEAD[k]); // a five-petal star facing up, two-sided
    for (let p = 0; p < 5; p++) { const t = p * 1.2566 + i, t2 = t + 0.63, t3 = t - 0.63;
      const tip = V(cx + Math.cos(t) * s, h + 0.012, cz + Math.sin(t) * s), l = V(cx + Math.cos(t2) * s * 0.4, h, cz + Math.sin(t2) * s * 0.4), r2 = V(cx + Math.cos(t3) * s * 0.4, h, cz + Math.sin(t3) * s * 0.4), c = V(cx, h, cz);
      ctx.tri(...c, ...tip, ...l); ctx.tri(...c, ...l, ...tip); ctx.tri(...c, ...r2, ...tip); ctx.tri(...c, ...tip, ...r2); }
    if (k !== 1) { ctx.color(k === 0 ? "oklch(0.2 0.03 60)" : "oklch(0.84 0.16 85)"); const e = s * 0.28; ctx.quad(cx - e, h + 0.015, cz - e, cx + e, h + 0.015, cz - e, cx + e, h + 0.015, cz + e, cx - e, h + 0.015, cz + e); }
  }
}

// --- Westfall farmstead (creator 2026-10-10, the pumpkin-plot pass) ---
function zigrail(ctx) { // a weathered zigzag split-rail run L metres along X: panels alternate +-z, a post at each crook, three split rails per panel
  const L = ctx.params.len ?? 8, n = Math.max(2, Math.round(L / 2.4)), A = 0.32; ctx.flat(); ctx.albedo("cdn/texture-weathered-oak-planks.png"); ctx.roughness(0.95);
  const pt = (i) => V(-L / 2 + (i / n) * L, 0, (i % 2 ? A : -A));
  for (let i = 0; i <= n; i++) { const p = pt(i), h = 1.15 + ctx.random() * 0.12, lean = (ctx.random() - 0.5) * 0.08;
    ctx.color(`oklch(${(0.5 + ctx.random() * 0.06).toFixed(2)} 0.03 62)`); rod(ctx, V(p[0], -0.1, p[2]), V(p[0] + lean, h, p[2] + lean), 0.07, 0.06, 6); }
  for (let i = 0; i < n; i++) { const a = pt(i), b = pt(i + 1);
    for (let r = 0; r < 3; r++) { const y = 0.32 + r * 0.33 + (ctx.random() - 0.5) * 0.06, sag = (ctx.random() - 0.5) * 0.05;
      ctx.color(`oklch(${(0.56 + ctx.random() * 0.1).toFixed(2)} 0.035 ${60 + Math.floor(ctx.random() * 12)})`);
      rod(ctx, V(a[0] - 0.12, y, a[2] * 1.05), V(b[0] + 0.12, y + sag, b[2] * 1.05), 0.055, 0.05, 5); } }
}
function vines(ctx) { // a pumpkin vine mat: broad lobed leaves lying on the soil, curling tendrils between; r metres across
  ctx.flat(); ctx.roughness(0.85);
  const L = Math.max(1, ctx.lod ?? 1), R = ctx.params.r ?? 1.6, n = Math.round((ctx.params.n ?? R * R * 6) / L);
  for (let i = 0; i < n; i++) { const a = ctx.random() * 6.283, d = Math.sqrt(ctx.random()) * R, x = Math.cos(a) * d, z = Math.sin(a) * d;
    const s = 0.16 + ctx.random() * 0.14, yaw = ctx.random() * 6.283, tilt = 0.05 + ctx.random() * 0.2, y0 = 0.03 + ctx.random() * 0.06;
    ctx.color(`oklch(${(0.36 + ctx.random() * 0.12).toFixed(2)} ${(0.09 + ctx.random() * 0.04).toFixed(2)} ${130 + Math.floor(ctx.random() * 18)})`);
    const P = (u, v) => { const c = Math.cos(yaw), sn = Math.sin(yaw); return V(x + u * c - v * sn, y0 + v * tilt + Math.abs(u) * 0.12, z + u * sn + v * c); };
    const lobes = [[0, 1], [0.7, 0.75], [0.95, 0.15], [0.55, -0.5], [-0.55, -0.5], [-0.95, 0.15], [-0.7, 0.75]];
    const c0 = P(0, 0); for (let k = 0; k < lobes.length; k++) { const p1 = lobes[k], p2 = lobes[(k + 1) % lobes.length], mid = [(p1[0] + p2[0]) * 0.38, (p1[1] + p2[1]) * 0.38];
      const A1 = P(p1[0] * s, p1[1] * s), M = P(mid[0] * s, mid[1] * s), A2 = P(p2[0] * s, p2[1] * s);
      ctx.tri(...c0, ...A1, ...M); ctx.tri(...c0, ...M, ...A1); ctx.tri(...c0, ...M, ...A2); ctx.tri(...c0, ...A2, ...M); }
    ctx.color("oklch(0.55 0.11 125)"); rod(ctx, V(x, 0, z), c0, 0.012, 0.01, 3); }
  ctx.color("oklch(0.5 0.1 120)"); // the vine itself, and tendril curls
  for (let i = 0; i < Math.round(n / 3); i++) { let a = ctx.random() * 6.283, x = (ctx.random() - 0.5) * R, z = (ctx.random() - 0.5) * R, pv = V(x, 0.04, z);
    for (let k = 0; k < 4; k++) { a += (ctx.random() - 0.5) * 1.2; const nv = V(pv[0] + Math.cos(a) * 0.3, 0.04, pv[2] + Math.sin(a) * 0.3); rod(ctx, pv, nv, 0.02, 0.018, 4); pv = nv; }
    let t0 = ctx.random() * 6; const cx = pv[0], cz = pv[2]; let q = V(cx, 0.05, cz);
    for (let k = 1; k <= 10; k++) { const t = t0 + k * 0.9, r = 0.09 * (1 - k / 12), nq = V(cx + Math.cos(t) * r, 0.05 + k * 0.022, cz + Math.sin(t) * r); rod(ctx, q, nq, 0.006, 0.005, 3); q = nq; } }
}
function firering(ctx) { // nine fieldstones in a ring round a fire, R metres
  ctx.flat(); ctx.roughness(0.95); const R = ctx.params.r ?? 0.75, n = 9;
  for (let i = 0; i < n; i++) { const t = (i / n) * 6.283 + ctx.random() * 0.2, w = 0.28 + ctx.random() * 0.12, h = 0.16 + ctx.random() * 0.1;
    ctx.color(`oklch(${(0.5 + ctx.random() * 0.15).toFixed(2)} 0.01 ${70 + Math.floor(ctx.random() * 40)})`);
    const cx = Math.cos(t) * R, cz = Math.sin(t) * R, c = Math.cos(t), sn = Math.sin(t), q = (u, v, y) => V(cx + u * c - v * sn, y, cz + u * sn + v * c);
    const a = w / 2, b = w * 0.36, k = 0.05; // a squat lump: bottom ring, a chamfered top
    const lo = [q(-b, -a, -0.04), q(b, -a, -0.04), q(b, a, -0.04), q(-b, a, -0.04)], hi = [q(-b + k, -a + k, h), q(b - k, -a + k, h * 0.85), q(b - k, a - k, h * 0.9), q(-b + k, a - k, h)];
    for (let j = 0; j < 4; j++) { const j2 = (j + 1) % 4; ctx.quad(...lo[j], ...lo[j2], ...hi[j2], ...hi[j]); } ctx.quad(...hi[0], ...hi[1], ...hi[2], ...hi[3]);
    ctx.color("oklch(0.25 0.01 60)"); ctx.quad(...q(-b * 0.6, -a * 0.6, h + 0.005), ...q(-b * 0.6, a * 0.6, h + 0.005), ...q(-b * 0.2, a * 0.5, h + 0.005), ...q(-b * 0.2, -a * 0.5, h + 0.005)); } // soot on the fire side
  ctx.color("oklch(0.2 0.01 50)"); for (let i = 0; i < 8; i++) { const t = (i / 8) * 6.283; ctx.tri(0, 0.012, 0, Math.cos(t + 0.39) * R * 0.85, 0.012, Math.sin(t + 0.39) * R * 0.85, Math.cos(t) * R * 0.85, 0.012, Math.sin(t) * R * 0.85); } // the ash bed
}
function lanternpost(ctx) { // a farm signpost: post, an arm with an iron lantern hung on a chain, a weathered board pointing down the road (+X)
  ctx.flat(); ctx.roughness(0.9); ctx.albedo("cdn/texture-weathered-oak-planks.png");
  ctx.color("oklch(0.5 0.035 60)"); rod(ctx, V(0, -0.2, 0), V(0.02, 2.6, 0), 0.09, 0.08, 7);
  rod(ctx, V(0, 2.35, 0), V(0.95, 2.4, 0), 0.05, 0.045, 6); rod(ctx, V(0.05, 1.95, 0), V(0.5, 2.37, 0), 0.03, 0.03, 5);
  ctx.color("oklch(0.68 0.05 70)"); block(ctx, 0.42, 1.38, 0.1, 0.95, 0.3, 0.05, 0.015); // the sign board
  ctx.albedo(null); ctx.color("oklch(0.3 0.02 60)"); for (const x of [0.12, 0.72]) rod(ctx, V(x, 1.52, 0.13), V(x, 1.53, 0.13), 0.02, 0.02, 4);
  ctx.color("oklch(0.25 0.01 250)"); ctx.metalness(0.6); rod(ctx, V(0.9, 2.38, 0), V(0.9, 2.05, 0), 0.008, 0.008, 3); // chain
  rod(ctx, V(0.9, 2.05, 0), V(0.9, 2.02, 0), 0.11, 0.11, 4); rod(ctx, V(0.9, 1.72, 0), V(0.9, 1.68, 0), 0.12, 0.12, 4); // lid, base
  for (const [dx, dz] of [[-0.08, -0.08], [0.08, -0.08], [0.08, 0.08], [-0.08, 0.08]]) rod(ctx, V(0.9 + dx, 1.7, dz), V(0.9 + dx, 2.03, dz), 0.012, 0.012, 3);
  ctx.metalness(0); ctx.color("oklch(0.92 0.12 80)"); ctx.emissive("oklch(0.85 0.16 70)", 3); block(ctx, 0.9, 1.72, 0, 0.14, 0.3, 0.14, 0.01); ctx.emissive(null);
}
export function geometry(ctx) {
  const k = ctx.params.kind;
  ({ runearch, barricade, bridge, brazier, spit, milestone, cobbles, weeds, reeds, pier, farmgate, hive, blanket, sunshade, wildflowers, zigrail, vines, firering, lanternpost }[k] ?? milestone)(ctx);
}
export function collider(ctx) {
  const k = ctx.params.kind;
  if (k === 'brazier') return { kind: 'box', width: 0.8, height: 1.2, depth: 0.8, center: [0, 0.6, 0] };
  if (k === 'spit') return { kind: 'box', width: 2.0, height: 1.1, depth: 0.3, center: [0, 0.55, 0] };
  if (k === 'cobbles' || k === 'weeds' || k === 'reeds' || k === 'blanket' || k === 'wildflowers' || k === 'vines' || k === 'firering') return null;
  if (k === 'zigrail') return { kind: 'box', width: ctx.params.len ?? 8, height: 1.2, depth: 0.8, center: [0, 0.6, 0] };
  if (k === 'lanternpost') return { kind: 'box', width: 0.25, height: 2.6, depth: 0.25, center: [0, 1.3, 0] };
  if (k === 'hive') return { kind: 'box', width: 0.6, height: 1, depth: 0.6, center: [0, 0.5, 0] };
  if (k === 'sunshade') return { kind: 'box', width: 0.3, height: 2.6, depth: 0.3, center: [0, 1.3, 0] };
  if (k === 'runearch') { const OW = ctx.params.ow ?? 3.6, D = (ctx.params.d ?? 1) + 0.3, T = 0.9, H = (ctx.params.oh ?? 4.1) + T, R = OW / 2;
    for (const sx of [-1, 1]) { const a = sx * R, b = sx * (R + T + 0.15), lo = Math.min(a, b), hi = Math.max(a, b), z = D / 2;
      ctx.quad(lo,0,-z, hi,0,-z, hi,H,-z, lo,H,-z); ctx.quad(hi,0,z, lo,0,z, lo,H,z, hi,H,z); ctx.quad(lo,0,z, lo,0,-z, lo,H,-z, lo,H,z); ctx.quad(hi,0,-z, hi,0,z, hi,H,z, hi,H,-z); }
    return; }
  if (k === 'barricade') return { kind: 'box', width: ctx.params.len ?? 3, height: 1.4, depth: 1.1, center: [0, 0.7, 0] };
  if (k === 'bridge') { // the walking deck as up-facing strips, the rails as two-sided walls
    const L = ctx.params.len ?? 14, W = ctx.params.w ?? 4, H = ctx.params.rise ?? 0.9, n = 14, w = W / 2 - 0.12;
    for (let i = 0; i < n; i++) { const z0 = -L / 2 + (i / n) * L, z1 = z0 + L / n, y0 = archY(z0, L, H), y1 = archY(z1, L, H);
      ctx.quad(-w, y0, z0, -w, y1, z1, w, y1, z1, w, y0, z0);
      for (const x of [-w, w]) { ctx.quad(x, y0, z0, x, y0 + 1.1, z0, x, y1 + 1.1, z1, x, y1, z1); } }
    return; }
  if (k === 'pier') { const len = ctx.params.len ?? 9, w = ctx.params.w ?? 2.2, deck = ctx.params.deck ?? 0.15; return { kind: 'box', width: w, height: 0.3, depth: len, center: [0, deck - 0.15, -len / 2] }; }
  if (k === 'farmgate') { const x0 = -1.44, x1 = 1.44, h = 1.6, t = 0.1; // two posts only: the leaf stands open, a body walks in
    for (const cx of [-1.35, 1.35]) { const a = cx - 0.1, b = cx + 0.1; ctx.quad(a,0,-t, b,0,-t, b,h,-t, a,h,-t); ctx.quad(b,0,t, a,0,t, a,h,t, b,h,t); ctx.quad(a,0,t, a,0,-t, a,h,-t, a,h,t); ctx.quad(b,0,-t, b,0,t, b,h,t, b,h,-t); }
    return; }
  return { kind: 'box', width: 0.45, height: 1.05, depth: 0.32, center: [0, 0.5, 0] };
}
