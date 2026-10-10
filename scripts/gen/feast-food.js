// The feast family: every food, vessel and brewing thing of the longhouse's table, spit, cask and brewing corner.
// One file, params.item picks the piece; identical params share one instanced mesh. Origins sit at the resting surface.
// Far detail: geometry branches on ctx.lod (1 full … 4-5 silhouette + base colour); colliders never branch.
import { mesh, paint, lathe, bevel } from './den-furniture-mesh.js';
import { far, mid } from './far-lod.js';
const D = Math.PI / 180;
const MEAD = 'oklch(0.74 0.15 72)', CRUST = 'cdn/texture-baked-bread-crust.png', PORK = 'cdn/texture-roast-pork-crackling-skin.png';

// ---------- the kit ----------
function col(m, c, rough = 0.6, emis = null, metal = 0) { const k = m.ctx; k.albedo(null); k.color(c); k.roughness(rough); k.metalness(metal); k.emissive(emis); }
function tex(m, ref, tint = '#ffffff', rough = 0.6, emis = null) { const k = m.ctx; k.albedo(ref); k.color(tint); k.roughness(rough); k.metalness(0); k.emissive(emis); }
// a placed frame: roll about Z, then yaw about Y, then scale and move
function xf(m, x = 0, y = 0, z = 0, yaw = 0, roll = 0, s = 1) {
  const cy = Math.cos(yaw * D), sy = Math.sin(yaw * D), cr = Math.cos(roll * D), sr = Math.sin(roll * D);
  const R = (v) => { const a = v[0] * cr - v[1] * sr, b = v[0] * sr + v[1] * cr, c = v[2]; return [a * cy + c * sy, b, -a * sy + c * cy]; };
  const T = (p) => { const r = R(p); return [r[0] * s + x, r[1] * s + y, r[2] * s + z]; };
  return { ctx: m.ctx, tri: (a, b, c, n, uv) => m.tri(T(a), T(b), T(c), R(n), uv), face: (pts, n, g) => m.face(pts.map(T), R(n), g) };
}
function blob(m, c, r, seg, rings, f) {
  const P = (i, j) => { const th = (j / rings) * Math.PI, ph = (i / seg) * Math.PI * 2, k = f ? f(ph, th) : 1;
    return [c[0] + Math.sin(th) * Math.cos(ph) * r[0] * k, c[1] + Math.cos(th) * r[1] * k, c[2] + Math.sin(th) * Math.sin(ph) * r[2] * k]; };
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a = P(i, j), b = P(i + 1, j), d = P(i + 1, j + 1), e = P(i, j + 1);
    const n = [(a[0] + d[0]) / 2 - c[0], (a[1] + d[1]) / 2 - c[1], (a[2] + d[2]) / 2 - c[2]];
    m.tri(a, b, d, n); m.tri(a, d, e, n);
  }
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
// a board between two points: w across, t thick
function slabAlong(m, a, b, w, t, up = [0, 1, 0]) {
  const ax = norm(sub(b, a)); let e = cross(ax, up); if (Math.hypot(...e) < 1e-4) e = cross(ax, [1, 0, 0]); e = norm(e); const f = norm(cross(e, ax));
  const P = (p, se, sf) => [p[0] + e[0] * se * w / 2 + f[0] * sf * t / 2, p[1] + e[1] * se * w / 2 + f[1] * sf * t / 2, p[2] + e[2] * se * w / 2 + f[2] * sf * t / 2];
  const A = [P(a, -1, -1), P(a, 1, -1), P(a, 1, 1), P(a, -1, 1)], B = [P(b, -1, -1), P(b, 1, -1), P(b, 1, 1), P(b, -1, 1)];
  m.face([A[0], A[1], B[1], B[0]], f.map((v) => -v)); m.face([A[3], A[2], B[2], B[3]], f);
  m.face([A[0], A[3], B[3], B[0]], e.map((v) => -v)); m.face([A[1], A[2], B[2], B[1]], e);
  m.face(A, ax.map((v) => -v)); m.face(B, ax);
}
function prism(m, pts, y0, y1, top, side) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  if (side) side();
  for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length];
    m.face([[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], [(a[0] + b[0]) / 2 - cx, 0, (a[1] + b[1]) / 2 - cz]); }
  if (top) top();
  m.face(pts.map((p) => [p[0], y1, p[1]]), [0, 1, 0]); m.face(pts.map((p) => [p[0], y0, p[1]]), [0, -1, 0]);
}
function tube(m, pts, radii, n, colors) {
  const rings = pts.map((p, i) => { const t = norm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
    let e = norm(cross(t, [0, 1, 0])); const f = norm(cross(e, t));
    return Array.from({ length: n }, (_, k) => { const q = (k / n) * Math.PI * 2; return [p[0] + radii[i] * (e[0] * Math.cos(q) + f[0] * Math.sin(q)), p[1] + radii[i] * (e[1] * Math.cos(q) + f[1] * Math.sin(q)), p[2] + radii[i] * (e[2] * Math.cos(q) + f[2] * Math.sin(q))]; }); });
  for (let j = 0; j < rings.length - 1; j++) { if (colors) colors(j / (rings.length - 2));
    for (let k = 0; k < n; k++) { const a = rings[j][k], b = rings[j][(k + 1) % n], c = rings[j + 1][(k + 1) % n], d = rings[j + 1][k];
      const mid = [(pts[j][0] + pts[j + 1][0]) / 2, (pts[j][1] + pts[j + 1][1]) / 2, (pts[j][2] + pts[j + 1][2]) / 2];
      const nn = sub([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], mid); m.tri(a, b, c, nn); m.tri(a, c, d, nn); } }
  return rings;
}
function seg(q, hi) { return q <= 1 ? hi : q === 2 ? Math.max(6, Math.round(hi * 0.75)) : q === 3 ? Math.max(6, Math.round(hi * 0.5)) : 5; }

// ---------- vessels and foods ----------
function trencher(m, q, w = 0.3, d = 0.22) {
  paint(m, 'walnut', '#fff4e6');
  const r = d / 2; lathe(m, [[0, r * 0.9], [0.006, r], [0.02, r * 0.97], [0.017, r * 0.8]], seg(q, 16), 0, 0, { xScale: w / d });
}
function board(m, w, d, t = 0.025, sp = 'oak') { paint(m, sp, '#fff6ea'); bevel(m, 0, 0, 0, w, t, d, 0.006); }
function mug(m, q, full = true) {
  const r = 0.042, h = 0.11, n = seg(q, 14);
  paint(m, 'oak', '#fff1dc');
  lathe(m, [[0, r * 0.94], [0.005, r], [h, r * 0.9]], n, 0, 0, {});
  if (q <= 3) { paint(m, 'iron'); lathe(m, [[0.018, r * 1.02], [0.03, r * 1.02]], n, 0, 0, { caps: false }); lathe(m, [[h - 0.03, r * 0.94], [h - 0.018, r * 0.93]], n, 0, 0, { caps: false }); }
  paint(m, 'oak', '#fff1dc');
  if (q <= 3) tube(m, [[r * 0.9, 0.085, 0], [r + 0.03, 0.08, 0], [r + 0.034, 0.05, 0], [r + 0.02, 0.028, 0], [r * 0.95, 0.025, 0]], [0.008, 0.009, 0.009, 0.009, 0.008], 5);
  if (q <= 2) lathe(m, [[h, r * 0.9], [h + 0.004, r * 0.9], [h + 0.004, r * 0.9 - 0.006]], n, 0, 0, { caps: false });
  if (full) { col(m, MEAD, 0.12, 'oklch(0.3 0.08 70)'); m.face(Array.from({ length: n }, (_, i) => [Math.cos(i / n * 6.283) * (r * 0.9 - 0.004), h + 0.002, Math.sin(i / n * 6.283) * (r * 0.9 - 0.004)]), [0, 1, 0]); }
}
function loaf(m, q, r = 0.08, h = 0.07) {
  tex(m, CRUST, '#fff0dc', 0.8);
  m.ctx.smooth(); lathe(m, [[0, r * 0.9], [h * 0.15, r], [h * 0.5, r * 0.92], [h * 0.8, r * 0.62], [h, r * 0.22], [h * 1.02, 0]], seg(q, 12), 0, 0, {}); m.ctx.flat();
  if (q <= 2) { col(m, 'oklch(0.86 0.06 85)', 0.9); for (const o of [-0.35, 0, 0.35]) m.face([[-r * 0.5, h * 0.93, o * r - 0.006], [r * 0.5, h * 0.93, o * r - 0.006 + 0.004], [r * 0.5, h * 0.93, o * r + 0.006], [-r * 0.5, h * 0.93, o * r + 0.004]].map((p) => [p[0], h * (1 - (p[0] * p[0] + p[2] * p[2]) / (r * r) * 0.55) + 0.003, p[2]]), [0, 1, 0]); }
}
function flatbread(m, q, r = 0.1) { tex(m, CRUST, '#fff6ea', 0.85); lathe(m, [[0, r * 0.97], [0.007, r], [0.013, r * 0.9]], seg(q, 12), 0, 0, {}); }
function crumbs(m, q, n, spread, rng) {
  if (q > 2) return; col(m, 'oklch(0.72 0.1 70)', 0.9);
  for (let i = 0; i < n; i++) { const x = (rng() - 0.5) * spread[0], z = (rng() - 0.5) * spread[1], s = 0.004 + rng() * 0.006; m.tri([x - s, 0.001, z], [x + s, 0.001, z + s * 0.4], [x, 0.001 + s, z - s * 0.3], [0, 1, 0]); m.tri([x - s, 0.001, z], [x, 0.001 + s, z - s * 0.3], [x, 0.001, z - s], [0, 1, -1]); }
}
function meat(m, q) { // a roast slice with its fat cap
  col(m, 'oklch(0.52 0.11 40)', 0.4);
  const pts = [[-0.06, -0.03], [0.05, -0.04], [0.07, 0.01], [0.03, 0.045], [-0.05, 0.035]];
  prism(m, pts, 0, 0.028, () => col(m, 'oklch(0.66 0.1 45)', 0.35), null);
  if (q <= 2) { col(m, 'oklch(0.86 0.05 80)', 0.3); prism(m, [[-0.06, -0.03], [0.05, -0.04], [0.05, -0.05], [-0.06, -0.042]], 0, 0.03); }
}
function fish(m, q, len = 0.3) {
  const n = seg(q, 8), s = [[0, 0.012], [0.08, 0.032], [0.3, 0.042], [0.62, 0.03], [0.86, 0.013], [0.92, 0.008]];
  const pts = s.map(([u]) => [-len / 2 + u * len, 0.036, 0]), rad = s.map(([, r]) => r * len / 0.3);
  tube(m, pts, rad, n, (t) => col(m, t < 0.2 ? 'oklch(0.5 0.11 55)' : t < 0.6 ? 'oklch(0.66 0.13 70)' : 'oklch(0.58 0.12 62)', 0.3));
  col(m, 'oklch(0.48 0.1 55)', 0.5); const tx = -len / 2 + 0.92 * len;
  m.face([[tx, 0.036, 0], [tx + 0.07 * len / 0.3, 0.07, 0], [tx + 0.05 * len / 0.3, 0.036, 0], [tx + 0.07 * len / 0.3, 0.004, 0]], [0, 0, 1]);
  if (q <= 2) { col(m, 'oklch(0.2 0.02 60)', 0.2); const ex = -len / 2 + 0.04 * len; m.face([[ex, 0.044, 0.011], [ex + 0.008, 0.049, 0.01], [ex + 0.008, 0.041, 0.01]], [0, 0, 1]); m.face([[ex, 0.044, -0.011], [ex + 0.008, 0.049, -0.01], [ex + 0.008, 0.041, -0.01]], [0, 0, -1]);
    col(m, 'oklch(0.58 0.12 62)', 0.4); m.face([[-0.02, 0.07, 0], [0.05, 0.068, 0], [0.03, 0.085, 0]], [0, 0, 1]); }
}
function cheeseWheel(m, q, r = 0.1, h = 0.07, cut = 50) {
  const n = seg(q, 16), pts = [[0, 0]];
  for (let i = 0; i <= n; i++) { const a = (cut + (360 - cut) * i / n) * D; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  prism(m, pts, 0, h, () => col(m, 'oklch(0.94 0.08 95)', 0.75), () => col(m, 'oklch(0.8 0.12 80)', 0.6));
  // the cut faces are pale paste: re-emit the two inner faces over the rind colour
  col(m, 'oklch(0.94 0.08 95)', 0.75); const p1 = pts[1], p2 = pts[pts.length - 1];
  m.face([[0.001, 0, 0.001], [p1[0], 0.0005, p1[1]], [p1[0], h - 0.0005, p1[1]], [0.001, h - 0.0005, 0.001]].map((p) => [p[0] + Math.cos((cut / 2 - 90) * D) * 0.001, p[1], p[2] + Math.sin((cut / 2 - 90) * D) * 0.001]), [Math.cos((cut / 2 - 90) * D) * -1, 0, Math.sin((cut / 2 - 90) * D) * -1]);
  if (q <= 3) { col(m, 'oklch(0.94 0.08 95)', 0.75); m.face([[0, 0.001, 0], [p2[0], 0.001, p2[1]], [p2[0], h - 0.001, p2[1]], [0, h - 0.001, 0]], [Math.sin(0), 0, -1]); }
}
function wedge(m, r = 0.09, h = 0.06, a0 = 0, a1 = 40) {
  const pts = [[0, 0], [Math.cos(a0 * D) * r, Math.sin(a0 * D) * r], [Math.cos(((a0 + a1) / 2) * D) * r * 1.01, Math.sin(((a0 + a1) / 2) * D) * r * 1.01], [Math.cos(a1 * D) * r, Math.sin(a1 * D) * r]];
  prism(m, pts, 0, h, () => col(m, 'oklch(0.94 0.08 95)', 0.75), () => col(m, 'oklch(0.9 0.1 90)', 0.7));
}
function bowl(m, q, r = 0.07, h = 0.05, fill = 'stew') {
  const n = seg(q, 14); paint(m, 'walnut', '#fff4e6');
  lathe(m, [[0, r * 0.5], [0.004, r * 0.55], [h * 0.4, r * 0.88], [h, r]], n, 0, 0, {});
  if (q <= 2) lathe(m, [[h, r], [h + 0.005, r * 0.98], [h + 0.005, r * 0.9]], n, 0, 0, { caps: false });
  if (fill === 'stew') {
    col(m, 'oklch(0.5 0.09 55)', 0.25, 'oklch(0.14 0.03 50)'); m.face(Array.from({ length: n }, (_, i) => [Math.cos(i / n * 6.283) * r * 0.93, h - 0.003, Math.sin(i / n * 6.283) * r * 0.93]), [0, 1, 0]);
    if (q <= 2) { const bits = [['oklch(0.7 0.16 50)', 0.03, 0.01], ['oklch(0.42 0.08 40)', -0.02, 0.025], ['oklch(0.9 0.05 95)', 0.005, -0.03], ['oklch(0.62 0.13 130)', -0.03, -0.015], ['oklch(0.42 0.08 40)', 0.035, -0.02]];
      for (const [c, x, z] of bits) { col(m, c, 0.4); blob(m, [x, h - 0.002, z], [0.011, 0.007, 0.01], 5, 3); } }
  } else if (fill === 'berries') {
    col(m, 'oklch(0.3 0.08 300)', 0.3); m.face(Array.from({ length: n }, (_, i) => [Math.cos(i / n * 6.283) * r * 0.92, h - 0.006, Math.sin(i / n * 6.283) * r * 0.92]), [0, 1, 0]);
    if (q <= 3) { const rng = mulberry(7); for (let i = 0; i < (q <= 1 ? 22 : 10); i++) { const a = rng() * 6.283, d = Math.sqrt(rng()) * r * 0.82; col(m, i % 4 === 0 ? 'oklch(0.48 0.18 20)' : 'oklch(0.34 0.1 285)', 0.25); blob(m, [Math.cos(a) * d, h - 0.002 + rng() * 0.006, Math.sin(a) * d], [0.009, 0.009, 0.009], 5, 3); } }
  }
}
function spoon(m, q) { paint(m, 'oak', '#fff4e4'); blob(m, [0.07, 0.008, 0], [0.024, 0.008, 0.017], seg(q, 8), 3); if (q <= 3) tube(m, [[0.048, 0.01, 0], [-0.02, 0.012, 0], [-0.08, 0.018, 0]], [0.005, 0.005, 0.006], 5); }
function knife(m, q) {
  col(m, 'oklch(0.72 0.01 250)', 0.3, null, 0.8); m.face([[0, 0.004, -0.012], [0.13, 0.004, -0.004], [0.14, 0.004, 0.006], [0, 0.004, 0.009]], [0, 1, 0]);
  if (q <= 3) { paint(m, 'walnut', '#fff0e0'); slabAlong(m, [-0.08, 0.009, 0], [0, 0.009, 0], 0.018, 0.014); }
}
function apple(m, q, c = 'oklch(0.55 0.18 25)') {
  col(m, c, 0.4); m.ctx.smooth(); lathe(m, [[0, 0.01], [0.006, 0.026], [0.022, 0.036], [0.045, 0.033], [0.058, 0.02], [0.062, 0.008], [0.054, 0]], seg(q, 10), 0, 0, {}); m.ctx.flat();
  if (q <= 2) { col(m, 'oklch(0.4 0.06 60)', 0.8); slabAlong(m, [0, 0.052, 0], [0.004, 0.072, 0.002], 0.004, 0.004); }
}
function onion(m, q) {
  col(m, 'oklch(0.72 0.11 70)', 0.7); m.ctx.smooth(); lathe(m, [[0, 0.004], [0.005, 0.02], [0.02, 0.034], [0.04, 0.028], [0.058, 0.01], [0.074, 0.002]], seg(q, 10), 0, 0, {}); m.ctx.flat();
}
function bone(m, q, len = 0.14) {
  col(m, 'oklch(0.92 0.03 85)', 0.6); tube(m, [[-len / 2, 0.012, 0], [0, 0.011, 0], [len / 2, 0.012, 0]], [0.009, 0.007, 0.009], 6);
  if (q <= 3) for (const x of [-len / 2, len / 2]) { blob(m, [x, 0.013, 0.008], [0.012, 0.011, 0.011], 6, 4); blob(m, [x, 0.013, -0.008], [0.011, 0.01, 0.01], 6, 4); }
}
function horn(m, q, stand = true) {
  const n = seg(q, 10), N = q <= 2 ? 10 : 5, pts = [], rad = [];
  for (let i = 0; i <= N; i++) { const t = i / N; pts.push([-0.15 + 0.3 * t, 0.085 + 0.07 * t * t, 0.045 * Math.sin(Math.PI * t)]); rad.push(0.005 + 0.032 * Math.pow(t, 1.2)); }
  const rings = tube(m, pts, rad, n, (t) => col(m, t < 0.2 ? 'oklch(0.3 0.04 50)' : t < 0.55 ? 'oklch(0.62 0.07 65)' : 'oklch(0.86 0.05 80)', 0.3));
  col(m, 'oklch(0.36 0.07 60)', 0.2); m.face(rings[rings.length - 1], [1, 0.4, 0]);
  if (q <= 3) { col(m, 'oklch(0.85 0.02 90)', 0.25, null, 0.9); const p = pts[N]; tube(m, [[p[0] - 0.012, p[1] - 0.005, p[2]], [p[0] + 0.002, p[1] + 0.001, p[2]]], [rad[N] * 1.05, rad[N] * 1.07], n); }
  if (!stand) return;
  paint(m, 'walnut', '#fff0e0'); // the stand: a foot board and two notched uprights
  bevel(m, 0, 0, 0.005, 0.26, 0.012, 0.07, 0.004);
  for (const t of [0.25, 0.8]) { const i = Math.round(t * N), p = pts[i], top = p[1] - rad[i] * 0.7;
    bevel(m, p[0], 0.012, p[2], 0.016, top - 0.012, 0.03, 0.003);
    if (q <= 2) { bevel(m, p[0], top - 0.004, p[2] - rad[i] - 0.004, 0.016, rad[i] * 0.9, 0.008, 0.002); bevel(m, p[0], top - 0.004, p[2] + rad[i] + 0.004, 0.016, rad[i] * 0.9, 0.008, 0.002); } }
}
function candle(m, q) {
  paint(m, 'iron'); lathe(m, [[0, 0.03], [0.006, 0.042], [0.012, 0.04], [0.009, 0.034]], seg(q, 12), 0, 0, {});
  col(m, 'oklch(0.93 0.03 90)', 0.5); m.ctx.smooth(); lathe(m, [[0.009, 0.026], [0.03, 0.02], [0.05, 0.018], [0.058, 0.015], [0.061, 0.004]], seg(q, 10), 0, 0, {}); m.ctx.flat();
  if (q <= 2) for (const a of [30, 150, 260]) { const c = Math.cos(a * D), s = Math.sin(a * D); blob(m, [c * 0.02, 0.03, s * 0.02], [0.004, 0.02, 0.004], 5, 3); }
  col(m, 'oklch(0.18 0.02 50)', 0.9); slabAlong(m, [0, 0.058, 0], [0, 0.07, 0], 0.002, 0.002);
  const k = m.ctx; k.albedo(null); k.color('#ffd28a'); k.emissive(3.2, 1.7, 0.55); lathe(m, [[0.066, 0.001], [0.072, 0.006], [0.08, 0.007], [0.09, 0.004], [0.1, 0]], 6, 0, 0, {}); k.emissive(null);
}
function puddle(m, q, pts, y = 0.0015) { col(m, MEAD, 0.05, 'oklch(0.22 0.06 70)'); m.face(pts.map((p) => [p[0], y, p[1]]), [0, 1, 0]); }
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- compositions (a table piece: origin on the table top; +Z faces the diner) ----------
const ITEMS = {
  setting(m, q, p) {
    const v = p.v || 0, rng = mulberry(11 + v);
    trencher(xf(m, -0.02, 0, 0.12, v * 17 - 10), q);
    if (v === 0) { meat(xf(m, -0.04, 0.02, 0.13, 25), q); loaf(xf(m, 0.04, 0.02, 0.1, 0, 0, 0.55), q); }
    else if (v === 1) { fish(xf(m, -0.03, 0.02, 0.12, -15, 0, 0.7), q); flatbread(xf(m, -0.2, 0, 0.04, 0, 0, 0.9), q); }
    else { bowl(xf(m, -0.02, 0.018, 0.12, 0, 0, 0.9), q, 0.07, 0.05, 'stew'); loaf(xf(m, -0.2, 0, 0.02, 40, 0, 0.6), q); }
    mug(xf(m, 0.2, 0, 0.06), q);
    spoon(xf(m, 0.13, 0, 0.2, 80 + v * 20), q);
    if (v !== 2) knife(xf(m, -0.19, 0, 0.19, 100 - v * 30), q);
    crumbs(m, q, 14, [0.4, 0.3], rng);
  },
  mug(m, q) { mug(m, q); },
  spilled(m, q) {
    mug(xf(m, 0, 0.042, 0, 30, 90), q, false);
    puddle(m, q, [[-0.07, 0.02], [-0.02, -0.04], [0.06, -0.06], [0.16, -0.03], [0.22, 0.02], [0.18, 0.06], [0.08, 0.05], [0.02, 0.08], [-0.05, 0.06]].map(([x, z]) => [x * 1.2 + 0.05, z * 1.2 - 0.02]));
  },
  bread(m, q) {
    board(xf(m, 0, 0, 0, 8), 0.5, 0.32, 0.03);
    loaf(xf(m, -0.1, 0.03, 0.02), q, 0.085, 0.075); loaf(xf(m, 0.1, 0.03, -0.04, 30, 0, 0.8), q);
    for (let i = 0; i < 3; i++) flatbread(xf(m, 0.12, 0.03 + i * 0.013, 0.08, i * 40, 0, 0.8), q);
    knife(xf(m, 0.02, 0.03, 0.12, 170), q); crumbs(xf(m, 0, 0.03, 0), q, 20, [0.45, 0.28], mulberry(3)); crumbs(m, q, 10, [0.65, 0.45], mulberry(4));
  },
  fish(m, q) {
    board(xf(m, 0, 0, 0, -4), 0.6, 0.24, 0.028, 'walnut');
    fish(xf(m, -0.02, 0.028, -0.04, 6), q, 0.36); fish(xf(m, 0.04, 0.028, 0.05, 186), q, 0.32);
    onion(xf(m, 0.25, 0.028, -0.05, 0, 0, 0.8), q); knife(xf(m, -0.33, 0, 0.12, 60), q);
  },
  cheese(m, q) {
    paint(m, 'oak', '#fff6ea'); lathe(m, [[0, 0.16], [0.026, 0.16], [0.03, 0.15]], seg(q, 16), 0, 0, {});
    cheeseWheel(xf(m, -0.02, 0.03, 0.01, 10), q); wedge(xf(m, 0.1, 0.03, 0.05, -20), 0.08, 0.06, 0, 35); wedge(xf(m, 0.2, 0, -0.08, 60), 0.07, 0.055, 0, 30);
    knife(xf(m, 0.05, 0.03, -0.11, 20), q); apple(xf(m, -0.22, 0, 0.06), q, 'oklch(0.7 0.16 120)');
  },
  stew(m, q) {
    for (const [x, z, r] of [[-0.13, 0.02, 0], [0.04, -0.05, 60], [0.18, 0.06, 130]]) { bowl(xf(m, x, 0, z, r), q); spoon(xf(m, x + 0.02, 0.05, z + 0.03, r + 30, -8), q); }
    loaf(xf(m, -0.02, 0, 0.14, 0, 0, 0.7), q); crumbs(m, q, 10, [0.5, 0.3], mulberry(9));
  },
  fruit(m, q) {
    bowl(m, q, 0.12, 0.05, 'none');
    const A = [[0, 0.04, 0, 'oklch(0.55 0.18 25)'], [0.055, 0.04, 0.03, 'oklch(0.72 0.16 115)'], [-0.05, 0.04, 0.035, 'oklch(0.58 0.17 35)'], [0.02, 0.04, -0.06, 'oklch(0.55 0.18 25)'], [-0.04, 0.07, -0.02, 'oklch(0.66 0.17 60)']];
    for (const [x, y, z, c] of A) apple(xf(m, x, y, z, x * 900), q, c);
    onion(xf(m, 0.2, 0, 0.05), q); onion(xf(m, 0.24, 0.022, -0.04, 50, 70, 0.9), q); onion(xf(m, -0.19, 0, 0.1, 0, 0, 0.85), q);
    bowl(xf(m, -0.22, 0, -0.08), q, 0.06, 0.04, 'berries');
    apple(xf(m, 0.12, 0.034, 0.14, 0, 80), q, 'oklch(0.55 0.18 25)'); // lying on its side: lifted by its radius so it rests on the board
  },
  horn(m, q, p) { horn(m, q, p.stand !== false); }, // stand: false = the horn alone, held in a hand
  candle(m, q) { candle(m, q); if (q <= 2) puddle(xf(m, 0, 0.0005, 0), q, [[-0.05, 0.02], [0.02, -0.05], [0.06, 0], [0.01, 0.05]].map(([x, z]) => [x, z])); },
  bones(m, q) {
    trencher(xf(m, 0, 0, 0, 30, 0, 0.9), q);
    bone(xf(m, -0.03, 0.018, 0.02, 20), q); bone(xf(m, 0.05, 0.018, -0.03, 110, 0, 0.8), q); bone(xf(m, 0.19, 0, 0.1, 70, 0, 0.9), q);
    crumbs(m, q, 8, [0.4, 0.3], mulberry(5));
  },
  // ---------- the spit (origin on the floor under the rod) ----------
  'spit-frame'(m, q) {
    const h = 0.9;
    for (const z of [-0.92, 0.92]) {
      paint(m, 'iron');
      slabAlong(m, [0, 0.02, z], [0, h - 0.07, z], 0.036, 0.036, [1, 0, 0]);
      slabAlong(m, [0, h - 0.08, z], [-0.07, h + 0.05, z], 0.03, 0.028, [0, 0, 1]); slabAlong(m, [0, h - 0.08, z], [0.07, h + 0.05, z], 0.03, 0.028, [0, 0, 1]);
      for (const a of [0, 120, 240]) { const c = Math.cos(a * D), s = Math.sin(a * D); slabAlong(m, [0, 0.2, z], [c * 0.2, 0.004, z + s * 0.2], 0.028, 0.024); }
      if (q <= 2) { slabAlong(m, [-0.03, 0.19, z], [0.03, 0.19, z], 0.05, 0.05); col(m, 'oklch(0.22 0.02 40)', 0.95); slabAlong(m, [0, 0.4, z], [0, 0.55, z], 0.04, 0.04, [1, 0, 0]); } // soot on the iron above the coals
    }
    paint(m, 'iron'); lathe(m, [[0.25, 0.3], [0.26, 0.32], [0.3, 0.33], [0.29, 0.29]], seg(q, 16), 0, 0, { zScale: 1.6, xScale: 0.7 });
    col(m, 'oklch(0.76 0.14 70)', 0.08, 'oklch(0.42 0.12 60)'); m.face(Array.from({ length: seg(q, 16) }, (_, i) => [Math.cos(i / seg(q, 16) * 6.283) * 0.29 * 0.7, 0.285, Math.sin(i / seg(q, 16) * 6.283) * 0.29 * 1.6]), [0, 1, 0]);
  },
  // origin on the rod axis; the rod runs along Z and this whole row turns about it
  'spit-roast'(m, q) {
    paint(m, 'iron'); slabAlong(m, [0, 0, -1.05], [0, 0, 1.05], 0.022, 0.022, [1, 0, 0]);
    slabAlong(m, [0, 0, 1.05], [0, 0.16, 1.05], 0.02, 0.02, [1, 0, 0]); slabAlong(m, [0, 0.16, 1.03], [0, 0.16, 1.14], 0.028, 0.028, [1, 0, 0]);
    for (const z of [-0.5, 0.5]) { slabAlong(m, [0, 0, z], [0, 0, z * 0.84], 0.07, 0.012, [1, 0, 0]); if (q <= 2) { slabAlong(m, [0.02, 0, z * 0.95], [0.03, 0.02, z * 0.7], 0.008, 0.008); slabAlong(m, [-0.02, 0, z * 0.95], [-0.03, -0.02, z * 0.7], 0.008, 0.008); } }
    const n = seg(q, 14), rings = seg(q, 10);
    tex(m, PORK, '#fff1e4', 0.28, 'oklch(0.2 0.06 40)'); m.ctx.smooth();
    blob(m, [0, 0, 0.02], [0.2, 0.19, 0.42], n, rings, (ph, th) => 1 + 0.06 * Math.sin(ph * 3 + th * 4) * (q <= 2 ? 1 : 0) - 0.12 * Math.pow(Math.cos(th), 8));
    blob(m, [0, 0.01, -0.45], [0.12, 0.12, 0.13], Math.max(5, n - 4), Math.max(4, rings - 3)); // head
    if (q <= 3) {
      blob(m, [0, -0.01, -0.58], [0.06, 0.055, 0.07], 6, 4); // snout
      for (const s of [-1, 1]) { blob(m, [0.07 * s, 0.1, -0.44], [0.045, 0.02, 0.05], 5, 3); // ears
        blob(m, [0.12 * s, -0.12, 0.28], [0.06, 0.05, 0.12], 6, 4); blob(m, [0.12 * s, -0.12, -0.2], [0.05, 0.045, 0.1], 6, 4); } // trussed legs
      m.ctx.flat(); col(m, 'oklch(0.56 0.19 28)', 0.35); m.ctx.smooth(); blob(m, [0, -0.01, -0.66], [0.04, 0.04, 0.04], 6, 4); // apple in its mouth
    }
    m.ctx.flat();
    if (q <= 2) { col(m, 'oklch(0.32 0.05 40)', 0.5); for (const z of [-0.2, 0.05, 0.3]) tube(m, Array.from({ length: 9 }, (_, i) => { const a = i / 8 * 6.283; return [Math.cos(a) * 0.205, Math.sin(a) * 0.195, z]; }), Array(9).fill(0.006), 4); } // twine
  },
  // ---------- the mead cask (origin on the floor, tap toward +Z into the hall) ----------
  cask(m, q) {
    const L = 0.9, cy = 0.8, n = seg(q, 20);
    for (const z of [-0.28, 0.28]) { paint(m, 'oak', '#fff2e0');
      slabAlong(m, [-0.36, 0.0, z], [-0.26, 0.5, z], 0.09, 0.08, [0, 0, 1]); slabAlong(m, [0.36, 0.0, z], [0.26, 0.5, z], 0.09, 0.08, [0, 0, 1]);
      bevel(m, 0, 0.38, z, 0.7, 0.07, 0.1, 0.01);
      if (q <= 2) { bevel(m, -0.3, 0.44, z, 0.14, 0.1, 0.1, 0.01); bevel(m, 0.3, 0.44, z, 0.14, 0.1, 0.1, 0.01); } }
    paint(m, 'oak', '#fff2e0'); bevel(m, 0.3, 0.1, 0, 0.05, 0.05, 0.64, 0.008); bevel(m, -0.3, 0.1, 0, 0.05, 0.05, 0.64, 0.008);
    const B = xf(m, 0, cy, -L / 2, 90, 90);
    paint(m, 'oak', '#fff2e0'); m.ctx.smooth();
    lathe(B, [[0, 0.34], [0.1, 0.38], [0.25, 0.41], [0.45, 0.42], [0.65, 0.41], [0.8, 0.38], [0.9, 0.34]], n, 0, 0, { caps: false }); m.ctx.flat();
    paint(m, 'walnut', '#fff2e0'); lathe(B, [[0.02, 0.325], [0.88, 0.325]], n, 0, 0, {});
    paint(m, 'iron'); for (const [a, b] of [[0.04, 0.08], [0.2, 0.24], [0.66, 0.7], [0.82, 0.86]]) { const r = (y) => 0.34 + 0.08 * Math.sin(Math.PI * y / 0.9) + 0.008; lathe(B, [[a, r(a)], [b, r(b)]], n, 0, 0, { caps: false }); }
    paint(m, 'oak', '#fff2e0'); // spigot and key
    tube(m, [[0, cy - 0.18, L / 2 - 0.05], [0, cy - 0.18, L / 2 + 0.1], [0, cy - 0.24, L / 2 + 0.14]], [0.03, 0.026, 0.02], seg(q, 8));
    if (q <= 3) { slabAlong(m, [0, cy - 0.18, L / 2 + 0.06], [0, cy - 0.08, L / 2 + 0.06], 0.02, 0.02, [0, 0, 1]); bevel(m, 0, cy - 0.08, L / 2 + 0.06, 0.07, 0.025, 0.02, 0.004); }
    col(m, MEAD, 0.08, 'oklch(0.35 0.1 70)'); if (q <= 2) blob(m, [0, cy - 0.255, L / 2 + 0.14], [0.008, 0.014, 0.008], 5, 3);
    paint(m, 'walnut', '#fff2e0'); lathe(m, [[0, 0.07], [0.004, 0.09], [0.03, 0.1], [0.026, 0.09]], seg(q, 12), 0, L / 2 + 0.14, {}); // drip bowl
    col(m, MEAD, 0.06, 'oklch(0.3 0.08 70)'); lathe(m, [[0.02, 0.085], [0.021, 0]], seg(q, 12), 0, L / 2 + 0.14, { caps: false });
    // the ladle hanging from the front cradle
    paint(m, 'oak', '#fff2e0'); tube(m, [[0.42, 0.62, 0.36], [0.44, 0.45, 0.37], [0.47, 0.3, 0.38]], [0.009, 0.01, 0.011], 5);
    blob(m, [0.48, 0.25, 0.38], [0.055, 0.045, 0.055], seg(q, 8), 4, (ph, th) => (th < Math.PI / 2 ? 0.25 : 1));
    if (q <= 2) { paint(m, 'walnut'); slabAlong(m, [0.36, 0.62, 0.36], [0.45, 0.62, 0.36], 0.02, 0.02); }
    mug(xf(m, -0.2, 0, 0.5, 20), q, false);
  },
  // ---------- the brewing corner (origin on the floor, the wall toward +Z) ----------
  brewing(m, q) {
    const n = seg(q, 18), bx = -0.4, bz = 0.15;
    paint(m, 'oak', '#fff2e0'); m.ctx.smooth(); lathe(m, [[0, 0.3], [0.2, 0.33], [0.4, 0.34], [0.6, 0.33], [0.8, 0.3]], n, bx, bz, { caps: false }); m.ctx.flat();
    paint(m, 'iron'); for (const [a, r] of [[0.07, 0.31], [0.27, 0.338], [0.55, 0.338], [0.72, 0.31]]) lathe(m, [[a, r + 0.007], [a + 0.035, r + 0.007]], n, bx, bz, { caps: false });
    const clothRing = (k, i) => { const a = (i / n) * Math.PI * 2; const r = [0, 0.16, 0.3, 0.335, 0.34 + 0.02 * Math.sin(a * 5)][k], y = [0.815, 0.812, 0.805, 0.76, 0.64 + 0.035 * Math.sin(a * 3 + 1)][k]; return [bx + Math.cos(a) * r, y, bz + Math.sin(a) * r]; };
    paint(m, 'cream', '#fffaf0'); m.ctx.smooth();
    for (let k = 0; k < 4; k++) for (let i = 0; i < n; i++) { const a = clothRing(k, i), b = clothRing(k, i + 1), c = clothRing(k + 1, i + 1), d = clothRing(k + 1, i); const mid = [(a[0] + c[0]) / 2 - bx, 0.5, (a[2] + c[2]) / 2 - bz]; m.tri(a, b, c, mid); m.tri(a, c, d, mid); }
    m.ctx.flat(); col(m, 'oklch(0.62 0.07 70)', 0.9); lathe(m, [[0.745, 0.338], [0.765, 0.338]], n, bx, bz, { caps: false });
    // the paddle leaning on the rim
    paint(m, 'oak', '#fff2e0'); slabAlong(m, [0.0, 0.3, -0.21], [-0.18, 1.03, -0.05], 0.035, 0.03); slabAlong(m, [0.05, 0.0, -0.26], [0.0, 0.32, -0.21], 0.11, 0.018);
    // the low bench and what stands on it
    paint(m, 'walnut', '#fff2e0'); bevel(m, 0.375, 0.36, 0.28, 0.78, 0.045, 0.44, 0.01); bevel(m, 0.06, 0, 0.28, 0.08, 0.36, 0.36, 0.01); bevel(m, 0.69, 0, 0.28, 0.08, 0.36, 0.36, 0.01);
    const pot = (x, y, z, s, glaze) => { col(m, glaze, 0.45); m.ctx.smooth(); lathe(m, [[0, 0.05 * s], [0.01 * s, 0.07 * s], [0.07 * s, 0.085 * s], [0.13 * s, 0.07 * s], [0.155 * s, 0.05 * s], [0.17 * s, 0.056 * s]].map(([a, b]) => [y + a, b]), seg(q, 12), x, z, {}); m.ctx.flat();
      col(m, 'oklch(0.8 0.15 85)', 0.35); lathe(m, [[y + 0.155 * s, 0.062 * s], [y + 0.185 * s, 0.06 * s], [y + 0.19 * s, 0.05 * s]], seg(q, 12), x, z, {});
      if (q <= 2) { col(m, 'oklch(0.66 0.06 75)', 0.9); lathe(m, [[y + 0.147 * s, 0.058 * s], [y + 0.155 * s, 0.058 * s]], seg(q, 12), x, z, { caps: false }); col(m, 'oklch(0.76 0.16 80)', 0.25); blob(m, [x + 0.055 * s, y + 0.15 * s, z], [0.008, 0.02 * s, 0.008], 4, 3); } };
    pot(0.13, 0.405, 0.2, 1, 'oklch(0.58 0.11 45)'); pot(0.28, 0.405, 0.36, 0.8, 'oklch(0.86 0.04 80)'); pot(0.3, 0, -0.32, 1.5, 'oklch(0.52 0.1 40)'); pot(0.5, 0, -0.38, 1.1, 'oklch(0.64 0.1 50)');
    board(xf(m, 0.55, 0.405, 0.24, 12), 0.26, 0.2, 0.02);
    const comb = xf(m, 0.55, 0.425, 0.24, 12); tex(m, 'cdn/texture-honeycomb-beeswax-cells.png', '#fff4d8', 0.25, 'oklch(0.18 0.06 75)');
    prism(comb, [[-0.1, -0.06], [0.07, -0.07], [0.1, 0.0], [0.08, 0.06], [-0.09, 0.07]], 0, 0.035);
    if (q <= 2) puddle(xf(m, 0.55, 0.426, 0.24, 12), q, [[0.1, -0.02], [0.12, 0.04], [0.09, 0.08], [0.05, 0.07]], 0);
    // herb rail with bundles drying
    paint(m, 'walnut', '#fff2e0'); for (const x of [-0.15, 0.75]) bevel(m, x, 0, 0.66, 0.05, 1.38, 0.05, 0.008); bevel(m, 0.3, 1.3, 0.66, 1.0, 0.05, 0.05, 0.008);
    for (const [x, c, l] of [[0.0, 'oklch(0.68 0.08 125)', 0.34], [0.2, 'oklch(0.6 0.07 140)', 0.3], [0.4, 'oklch(0.72 0.06 105)', 0.36], [0.6, 'oklch(0.55 0.11 20)', 0.28]]) {
      col(m, 'oklch(0.66 0.06 75)', 0.9); slabAlong(m, [x, 1.3, 0.66], [x, 1.2, 0.66], 0.006, 0.006, [1, 0, 0]);
      col(m, c, 0.85); lathe(m, [[1.2 - l, 0.0], [1.2 - l + 0.05, 0.05], [1.2 - l * 0.4, 0.045], [1.19, 0.018], [1.21, 0.02]], seg(q, 8), x, 0.66, {});
      if (q <= 2) { col(m, 'oklch(0.66 0.06 75)', 0.9); lathe(m, [[1.15, 0.024], [1.17, 0.024]], 6, x, 0.66, { caps: false }); } }
  },
};

export function geometry(ctx) {
  const m = mesh(ctx), lod = ctx.lod || 1, p = ctx.params || {};
  const f = ITEMS[p.item] || ITEMS.mug;
  // far detail: lod 1 full; lod 2 draws tier 3 (~55%), lod 3 tier 4 (~25%); lod 4–5 the block silhouette (a dish a disc of blocks, base colours kept)
  if (lod >= 4) { far(ctx, m, null, (fk) => { const mm = mesh(fk); f(mm, 3, p); return mm.uvs; }); return m.finish(); }
  if (lod >= 2) { mid(ctx, m, (t) => (fk) => { const mm = mesh(fk); f(mm, t, p); return mm.uvs; }, lod); ctx.emissive(null); return m.finish(); }
  f(m, 1, p);
  ctx.emissive(null);
  return m.finish();
}
function colBox(ctx, x0, y0, z0, x1, y1, z1) {
  ctx.quad(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1); ctx.quad(x1, y0, z0, x0, y0, z0, x0, y1, z0, x1, y1, z0);
  ctx.quad(x1, y0, z1, x1, y0, z0, x1, y1, z0, x1, y1, z1); ctx.quad(x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0);
  ctx.quad(x0, y1, z1, x1, y1, z1, x1, y1, z0, x0, y1, z0); ctx.quad(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1);
}
export function collider(ctx) {
  const item = ctx.params?.item;
  if (item === 'cask') { colBox(ctx, -0.44, 0, -0.46, 0.44, 1.22, 0.62); return; }
  if (item === 'brewing') { colBox(ctx, -0.75, 0, -0.2, -0.05, 0.82, 0.5); colBox(ctx, -0.02, 0, 0.06, 0.77, 0.41, 0.5); return; }
  return null;
}
