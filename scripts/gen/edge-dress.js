// Edge dressing (TASK edges, 2026-10-04): ONE generator for the seams between the den's set pieces: split-rail runs,
// a leaning hay wagon, straw bale stacks, a scarecrow, granite boulders, shrub and berry clumps. One row = one merged mesh:
// params.parts = [{ k, x, y, z, yaw, … }] local to the row's feet (y = sampled ground - row ground). Rows: edge-farm,
// edge-hill-pasture, edge-hill-rocks, edge-feather-hall, edge-feather-hamlet (scripts/lib/data/edges.js holds the layout).
import { TEX, IRON, frame, q, tri, obox, box, beam, cyl, lodLevel } from './yard-kit.js';
const LEAF = ['oklch(0.5 0.11 140)', 'oklch(0.44 0.1 150)', 'oklch(0.56 0.12 128)', 'oklch(0.48 0.09 118)'];
const HAY = 'oklch(0.9 0.08 85)', SPLIT = 'oklch(0.8 0.045 65)', GREYWOOD = 'oklch(0.78 0.02 70)';
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function wood(ctx, t = SPLIT) { ctx.albedo(TEX.wood); ctx.color(t); ctx.roughness(0.9); ctx.metalness(0); }
function paint(ctx, c, r = 0.9) { ctx.albedo(null); ctx.color(c); ctx.roughness(r); ctx.metalness(0); }
function hsh(i, j, s) { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }
// a lumpy lat-long blob in the current frame: c centre, r radii, jit = radius noise
function blob(ctx, c, r, seg, rings, jit = 0, s = 0) {
  const P = (i, j) => { const la = -Math.PI / 2 + i / rings * Math.PI, lo = (j % seg) / seg * Math.PI * 2, k = (i === 0 || i === rings) ? 1 : 1 + (hsh(i, j % seg, s) - 0.5) * 2 * jit;
    return [c[0] + Math.cos(la) * Math.cos(lo) * r[0] * k, c[1] + Math.sin(la) * r[1] * k, c[2] + Math.cos(la) * Math.sin(lo) * r[2] * k]; };
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = P(i, j), b = P(i, j + 1), cc = P(i + 1, j + 1), d = P(i + 1, j), m = [(a[0] + cc[0]) / 2, (a[1] + cc[1]) / 2, (a[2] + cc[2]) / 2];
    if (i === 0) tri(ctx, a, cc, d, sub(m, c)); else if (i === rings - 1) tri(ctx, a, b, cc, sub(m, c)); else q(ctx, a, b, cc, d, sub(m, c));
  }
}
const K = {
  // split rails through pts [[x,y,z]…] (local to the row): a post at every point, two riven rails per bay, ends lapped past the post
  rail(ctx, p, L) {
    const pts = p.pts, H = p.h ?? 1.05;
    for (let i = 0; i < pts.length; i++) {
      const [x, y, z] = pts[i], lean = (hsh(i, 1, 9) - 0.5) * 0.08;
      wood(ctx, GREYWOOD);
      if (L <= 3) cyl(ctx, [x, y - 0.25, z], [x + lean, y + H + 0.04, z + lean * 0.5], 0.075, 0.06, 6); else beam(ctx, [x, y - 0.2, z], [x, y + H, z], 0.12, 0.12);
      if (i === 0) continue;
      const [x0, y0, z0] = pts[i - 1], dx = x - x0, dz = z - z0, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
      wood(ctx, SPLIT);
      for (const [r, hgt] of [[0, 0.42], [1, 0.84]]) {
        if (L >= 5 && r === 0) continue;
        const sag = (hsh(i, r, 3) - 0.5) * 0.06, o = (r ? 0.05 : -0.05);
        beam(ctx, [x0 - ux * 0.12 - uz * o, y0 + hgt * H + sag, z0 - uz * 0.12 + ux * o], [x + ux * 0.12 - uz * o, y + hgt * H - sag, z + uz * 0.12 + ux * o], 0.09 + hsh(i, r, 5) * 0.03, 0.13);
      }
    }
  },
  // a hay wagon with its rear-left wheel off and leaning on the bed: the bed sags onto a log chock, the tongue rests on the ground
  wagon(ctx, p, L) {
    const roll = -9 * Math.PI / 180, pit = 5 * Math.PI / 180, pv = [0.75, 0, -1.3];
    const W = (v) => { let [x, y, z] = sub(v, pv); let y1 = y * Math.cos(pit) - z * Math.sin(pit), z1 = y * Math.sin(pit) + z * Math.cos(pit); y = y1; z = z1;
      const x1 = x * Math.cos(roll) - y * Math.sin(roll); y1 = x * Math.sin(roll) + y * Math.cos(roll); return [x1 + pv[0], y1 + pv[1], z + pv[2]]; };
    const Wv = (v) => sub(W(v), W([0, 0, 0]));
    const B = (c, hx, hy, hz) => obox(ctx, W(c), Wv([hx, 0, 0]), Wv([0, hy, 0]), Wv([0, 0, hz]), { bottom: true });
    wood(ctx, 'oklch(0.72 0.06 55)');
    B([0, 0.72, 0], 0.72, 0.05, 1.35);                                    // the bed
    for (const sx of [-1, 1]) B([sx * 0.7, 0.98, 0], 0.035, 0.22, 1.35);  // side boards
    B([0, 0.98, -1.33], 0.7, 0.22, 0.035); if (L <= 3) for (const sx of [-1, 1]) for (const zz of [-1.1, 0, 1.1]) B([sx * 0.74, 1.05, zz], 0.04, 0.3, 0.04); // stakes
    wood(ctx, 'oklch(0.66 0.05 55)');
    for (const zz of [-0.95, 0.95]) B([0, 0.55, zz], 0.8, 0.05, 0.06);   // axles
    beam(ctx, W([0, 0.6, -1.35]), W([0, 0.05, -3.0]), 0.08, 0.08);       // tongue, its tip down in the grass
    if (L <= 2) beam(ctx, W([-0.35, 0.3, -2.6]), W([0.35, 0.3, -2.6]), 0.05, 0.05);
    // wheels: three on, one off
    const wheel = (c, ax, r) => { wood(ctx, 'oklch(0.62 0.05 55)'); const n = L <= 2 ? 12 : 8, a = ax, [ux, uy, uz] = a;
      // rim as a ring of beams in the plane normal to ax
      const e1 = Math.abs(uy) > 0.9 ? [1, 0, 0] : [0, 1, 0], s1 = [uy * e1[2] - uz * e1[1], uz * e1[0] - ux * e1[2], ux * e1[1] - uy * e1[0]], m1 = Math.hypot(...s1), s = s1.map((v) => v / m1);
      const t = [uy * s[2] - uz * s[1], uz * s[0] - ux * s[2], ux * s[1] - uy * s[0]], at = (g, rr) => [c[0] + (s[0] * Math.cos(g) + t[0] * Math.sin(g)) * rr, c[1] + (s[1] * Math.cos(g) + t[1] * Math.sin(g)) * rr, c[2] + (s[2] * Math.cos(g) + t[2] * Math.sin(g)) * rr];
      for (let i = 0; i < n; i++) beam(ctx, at(i / n * 6.283, r), at((i + 1) / n * 6.283, r), 0.08, 0.07);
      if (L <= 3) for (let i = 0; i < 6; i++) beam(ctx, c, at(i / 6 * 6.283 + 0.2, r), 0.035, 0.035);
      paint(ctx, IRON, 0.6); cyl(ctx, c.map((v, k) => v - a[k] * 0.09), c.map((v, k) => v + a[k] * 0.09), 0.09, 0.09, 6); };
    for (const [x, z] of [[0.86, -0.95], [-0.86, -0.95], [0.86, 0.95]]) wheel(W([x, 0.48, z]), Wv([1, 0, 0]), 0.48);
    wheel([-1.18, 0.5, 1.15], [0.92, 0.39, 0], 0.48);                      // the loose wheel, leaned against the side
    wood(ctx, 'oklch(0.7 0.04 60)'); cyl(ctx, [-0.62, 0.0, 0.95], [-0.62, 0.32, 0.95], 0.16, 0.15, 7); // chock log under the bare axle
    // the hay load, heaped and slumped to the low side
    ctx.albedo(TEX.hay); ctx.color(HAY); ctx.roughness(1);
    blob(ctx, W([0.05, 1.05, 0.1]), [0.75, 0.45, 1.35], L <= 2 ? 9 : 6, L <= 2 ? 5 : 3, 0.12, 7);
    if (L <= 2) { blob(ctx, W([-0.5, 1.25, -0.6]), [0.4, 0.3, 0.45], 6, 3, 0.15, 8); blob(ctx, [-1.0, 0.12, 0.2], [0.45, 0.15, 0.55], 6, 3, 0.2, 9); }
    if (L <= 3) { wood(ctx, 'oklch(0.8 0.05 70)'); beam(ctx, W([0.4, 1.35, 0.6]), [1.35, 0.0, 1.9], 0.04, 0.04); paint(ctx, IRON, 0.5); for (const o of [-0.08, 0, 0.08]) beam(ctx, [1.35 + o, 0.0, 1.9], [1.42 + o, -0.05, 2.15], 0.015, 0.015); } // a hayfork stuck in the load, tines in the sod
  },
  // straw bales: rows of rectangular bales stepped into a stack, twine bands
  bales(ctx, p, L) {
    const rows = p.rows ?? [3, 2, 1], bw = 0.95, bh = 0.42, bd = 0.5;
    for (let r = 0; r < rows.length; r++) for (let i = 0; i < rows[r]; i++) {
      const x = (i - (rows[r] - 1) / 2) * (bw + 0.03) + (hsh(r, i, 2) - 0.5) * 0.08, y = r * bh, yaw = (hsh(r, i, 4) - 0.5) * 8;
      ctx.albedo(TEX.hay); ctx.color(HAY); ctx.roughness(1); box(ctx, x, y - (r ? 0 : 0.05), 0, bw, bh + (r ? 0 : 0.05), bd, yaw, { bottom: true });
      if (L <= 2) { paint(ctx, 'oklch(0.55 0.05 60)'); for (const o of [-0.25, 0.25]) box(ctx, x + o, y - 0.005, 0, 0.025, bh + 0.012, bd + 0.012, yaw); }
    }
    if (p.loose && L <= 2) { ctx.albedo(TEX.hay); ctx.color(HAY); box(ctx, (rows[0] / 2 + 0.4) * bw, 0, 0.35, bw, bh, bd, 70); }
  },
  scarecrow(ctx, p, L) {
    wood(ctx, GREYWOOD); cyl(ctx, [0, -0.3, 0], [0, 2.05, 0], 0.06, 0.05, 6); cyl(ctx, [-0.8, 1.55, 0], [0.8, 1.6, 0], 0.04, 0.04, 5);
    paint(ctx, 'oklch(0.55 0.08 35)'); obox(ctx, [0, 1.3, 0], [0.26, 0, 0], [0, 0.42, 0], [0, 0, 0.14], { bottom: true }); // the tunic
    paint(ctx, 'oklch(0.5 0.06 240)'); obox(ctx, [0, 1.55, 0], [0.62, 0, 0], [0, 0.09, 0], [0, 0, 0.1]); // sleeves along the bar
    paint(ctx, 'oklch(0.85 0.05 80)'); blob(ctx, [0, 1.98, 0], [0.18, 0.21, 0.17], L <= 2 ? 8 : 5, L <= 2 ? 5 : 3, 0.06, 3); // sack head
    ctx.albedo(TEX.hay); ctx.color(HAY); ctx.roughness(1);
    cyl(ctx, [0, 2.12, 0], [0, 2.15, 0], 0.36, 0.33, 9); cyl(ctx, [0, 2.15, 0], [0.02, 2.45, 0.01], 0.17, 0.03, 8); // straw hat
    if (L <= 2) { for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) beam(ctx, [sx * 0.62, 1.55, 0], [sx * (0.74 + i * 0.02), 1.4 - i * 0.03, (i - 1.5) * 0.06], 0.02, 0.02);
      for (let i = 0; i < 5; i++) beam(ctx, [(i - 2) * 0.08, 0.9, 0], [(i - 2) * 0.1, 0.72, (hsh(i, 0, 1) - 0.5) * 0.12], 0.02, 0.02);
      paint(ctx, 'oklch(0.25 0.02 60)'); for (const sx of [-1, 1]) blob(ctx, [sx * 0.06, 2.01, -0.165], [0.025, 0.025, 0.01], 4, 2); }
  },
  rock(ctx, p, L) {
    const r = p.r ?? 1, s = p.s ?? 0; ctx.albedo(TEX.granite); ctx.color(p.tint ?? 'oklch(0.9 0.01 90)'); ctx.roughness(0.95); ctx.metalness(0);
    blob(ctx, [0, r * (p.fy ?? 0.55) * 0.35, 0], [r * (p.fx ?? 1.15), r * (p.fy ?? 0.55), r], L <= 2 ? 8 : L <= 3 ? 6 : 5, L <= 2 ? 5 : 3, 0.16, s);
    if (L <= 2 && p.moss) { ctx.albedo(TEX.turf); ctx.color('oklch(0.85 0.06 135)'); blob(ctx, [r * 0.15, r * (p.fy ?? 0.55) * 1.05, -r * 0.1], [r * 0.55, r * 0.12, r * 0.45], 6, 2, 0.2, s + 1); }
  },
  shrub(ctx, p, L) {
    if (L >= 5) return; const n = L <= 2 ? (p.n ?? 4) : 2, sc = p.sc ?? 1;
    for (let i = 0; i < n; i++) { paint(ctx, LEAF[(i + (p.s ?? 0)) % 4], 0.95); const a = hsh(i, 2, p.s ?? 0) * 6.28, d = i ? 0.28 * sc : 0;
      blob(ctx, [Math.cos(a) * d, (0.24 + hsh(i, 3, p.s ?? 0) * 0.12) * sc, Math.sin(a) * d], [(0.36 + hsh(i, 4, 1) * 0.12) * sc, (0.27 + hsh(i, 5, 1) * 0.08) * sc, 0.36 * sc], L <= 2 ? 7 : 5, L <= 2 ? 4 : 3, 0.1, i); }
  },
  berry(ctx, p, L) {
    K.shrub(ctx, { ...p, n: 3, sc: p.sc ?? 1.1 }, L);
    if (L <= 2) { paint(ctx, p.fruit ?? 'oklch(0.52 0.19 25)', 0.5); for (let i = 0; i < 14; i++) { const a = hsh(i, 7, p.s ?? 0) * 6.28, e = 0.2 + hsh(i, 8, 1) * 0.9, sc = p.sc ?? 1.1;
      blob(ctx, [Math.cos(a) * 0.4 * sc * Math.cos(e), (0.3 + Math.sin(e) * 0.3) * sc, Math.sin(a) * 0.4 * sc * Math.cos(e)], [0.035, 0.035, 0.035], 4, 2); } }
  },
  // a grass tuft: crossed tapering blades, leaning out; p.h height, p.n blades (Oct 6 Ravnholt seams)
  tuft(ctx, p, L) {
    if (L >= 4) return; const n = L <= 2 ? (p.n ?? 7) : 3, h = p.h ?? 0.32, sd = p.s ?? 0;
    for (let i = 0; i < n; i++) { paint(ctx, LEAF[(i + sd) % 4], 0.95); const a = hsh(i, 9, sd) * 6.28, lean = 0.25 + hsh(i, 10, sd) * 0.35, w = 0.03 + hsh(i, 11, sd) * 0.02, hh = h * (0.6 + hsh(i, 12, sd) * 0.6);
      const ca = Math.cos(a), sa = Math.sin(a), b0 = [-sa * w, 0, ca * w], b1 = [sa * w, 0, -ca * w], tip = [ca * hh * lean, hh, sa * hh * lean];
      tri(ctx, b0, b1, tip, [ca, 0.4, sa]); tri(ctx, b1, b0, tip, [-ca, 0.4, -sa]); }
  },
};
export function geometry(ctx) {
  const L = lodLevel(ctx);
  for (const p of ctx.params?.parts ?? []) { frame(p.x ?? 0, p.y ?? 0, p.z ?? 0, p.yaw ?? 0); K[p.k]?.(ctx, p, L); }
  frame(); ctx.albedo(null);
}
// the shell: rail bays, the wagon, bale stacks, the scarecrow post and every boulder are boxes; shrubs are walked through
export function collider(ctx) {
  for (const p of ctx.params?.parts ?? []) {
    frame(p.x ?? 0, p.y ?? 0, p.z ?? 0, p.yaw ?? 0);
    if (p.k === 'rail') for (let i = 1; i < p.pts.length; i++) { const a = p.pts[i - 1], b = p.pts[i], H = p.h ?? 1.05, h = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2, (b[2] - a[2]) / 2], l = Math.hypot(h[0], h[2]);
      obox(ctx, [a[0] + h[0], a[1] + h[1] + H * 0.5, a[2] + h[2]], h, [0, H * 0.5, 0], [-h[2] / l * 0.07, 0, h[0] / l * 0.07], { bottom: true }); }
    else if (p.k === 'wagon') box(ctx, -0.1, 0, -0.2, 2.1, 1.5, 3.0, 0, { bottom: true });
    else if (p.k === 'bales') box(ctx, 0, 0, 0, (p.rows?.[0] ?? 3) * 0.98, (p.rows?.length ?? 3) * 0.42, 0.52, 0, { bottom: true });
    else if (p.k === 'scarecrow') box(ctx, 0, 0, 0, 0.14, 2.0, 0.14, 0, { bottom: true });
    else if (p.k === 'rock') { const r = p.r ?? 1; box(ctx, 0, 0, 0, r * (p.fx ?? 1.15) * 1.6, r * (p.fy ?? 0.55) * 1.25, r * 1.6, 0, { bottom: true }); }
  }
  frame();
}
