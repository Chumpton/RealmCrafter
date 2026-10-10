// Rolf's lyre: the Trossingen / Sutton Hoo family (6th-7th c.). One piece of hollowed maple, 0.78 m tall, 0.20 m wide,
// a thin pinned soundboard, two arms round an open hand window under the yoke, six gut strings from a carved tailpiece
// over a low bridge to six pegs. A leather wrist loop hangs off the left arm (the lyre's -x).
// Frame: origin at the FOOT, strings on the FRONT (the -Z face). Every playable point is exported as LYRE_POINTS so the
// hands (scripts/lib/data/lyre-points.js re-exports it) aim at the very strings drawn here.
import { box, qd, rod, lodLevel } from './lore-kit.js';

export const DIM = {
  height: 0.78, width: 0.2, thick: 0.038,
  box: [0.0, 0.55],        // the hollow soundbox, foot to the window
  window: [0.56, 0.675],   // the hand window between the arms
  arm: 0.038,              // each arm's width beside the window
  board: 0.004,            // soundboard proud of the front
  bridge: { y: 0.13, h: 0.011 },
  tail: [0.025, 0.085],    // tailpiece, foot end
  pegY: 0.725,
  strings: [0.05, 0.03, 0.01, -0.01, -0.03, -0.05], // string_1 (+x) .. string_6
};
const T = DIM.thick / 2, FRONT = -T - DIM.board;
// where a string runs: tail -> bridge crest -> yoke (it falls back toward the yoke face above the bridge)
export function stringZ(y) {
  const zb = FRONT - DIM.bridge.h, zt = -T - 0.006;
  if (y <= DIM.bridge.y) return FRONT - 0.003 + (zb - (FRONT - 0.003)) * (y - DIM.tail[1]) / (DIM.bridge.y - DIM.tail[1]);
  return zb + (zt - zb) * (y - DIM.bridge.y) / (DIM.pegY - DIM.bridge.y);
}
export const PLUCK_Y = 0.24;

// a flat outline (xy, convex, CCW from the front) extruded from z0 (front) to z1 (back)
function slab(ctx, pts, z0, z1) {
  const n = pts.length;
  for (let i = 1; i < n - 1; i++) {
    ctx.tri(pts[0][0], pts[0][1], z0, pts[i + 1][0], pts[i + 1][1], z0, pts[i][0], pts[i][1], z0);
    ctx.tri(pts[0][0], pts[0][1], z1, pts[i][0], pts[i][1], z1, pts[i + 1][0], pts[i + 1][1], z1);
  }
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], nx = b[1] - a[1], ny = -(b[0] - a[0]);
    qd(ctx, [a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], [nx, ny, 0]);
  }
}
// a rounded rectangle-ish outline: bottom y0 half-width w0, top y1 half-width w1, corner radii rb (bottom) rt (top)
function outline(y0, y1, w0, w1, rb, rt, seg) {
  const p = [];
  const arc = (cx, cy, r, a0, a1) => { for (let i = 0; i <= seg; i++) { const a = a0 + (a1 - a0) * i / seg; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  if (rb > 0) { arc(-w0 + rb, y0 + rb, rb, Math.PI, Math.PI * 1.5); arc(w0 - rb, y0 + rb, rb, Math.PI * 1.5, Math.PI * 2); } else { p.push([-w0, y0], [w0, y0]); }
  if (rt > 0) { arc(w1 - rt, y1 - rt, rt, 0, Math.PI / 2); arc(-w1 + rt, y1 - rt, rt, Math.PI / 2, Math.PI); } else { p.push([w1, y1], [-w1, y1]); }
  return p;
}

export function geometry(ctx) {
  const L = lodLevel(ctx), W = DIM.width / 2, seg = L <= 2 ? 5 : 2;
  const MAPLE = 'scripts/tex-furnishing-wood.js?species=oak', DARK = 'scripts/tex-furnishing-wood.js?species=walnut';
  // the body: soundbox, the two arms, the yoke; oiled maple gone honey-dark with age
  ctx.albedo(MAPLE); ctx.color('oklch(0.72 0.05 55)'); ctx.roughness(0.55);
  if (L >= 4) { slab(ctx, outline(0, DIM.height, W * 0.96, W, 0.03, 0.035, 1), -T, T); return; }
  const [wy0, wy1] = DIM.window, aw = DIM.arm;
  slab(ctx, outline(0, wy0, W * 0.96, W * 0.995, 0.035, 0, seg), -T, T);                  // the hollowed box, foot rounded
  slab(ctx, [[-W, wy0], [-W + aw, wy0], [-W + aw, wy1], [-W, wy1]], -T, T);           // left arm
  slab(ctx, [[W - aw, wy0], [W, wy0], [W, wy1], [W - aw, wy1]], -T, T);               // right arm
  slab(ctx, outline(wy1, DIM.height, W, W * 0.97, 0, 0.04, seg), -T * 1.05, T * 1.05); // the yoke, shoulders rounded
  // the soundboard, paler and pinned: inset from the rim
  ctx.color('oklch(0.84 0.04 70)'); ctx.roughness(0.5);
  slab(ctx, outline(0.012, wy0 - 0.006, W * 0.96 - 0.012, W - 0.012, 0.025, 0, seg), FRONT, -T);
  // hand-rubbed pale wear where the right hand rests below the strings and the left grips the arm
  if (L <= 2) {
    ctx.color('oklch(0.9 0.035 78)');
    slab(ctx, [[W * 0.35, 0.16], [W * 0.9, 0.16], [W * 0.9, 0.27], [W * 0.35, 0.27]], FRONT - 0.0004, FRONT);
  }
  // tailpiece, bridge, pegs: dark wood
  ctx.albedo(DARK); ctx.color('oklch(0.8 0.03 60)'); ctx.roughness(0.45);
  const [ty0, ty1] = DIM.tail;
  slab(ctx, [[-0.04, ty0], [0.04, ty0], [0.065, ty1], [-0.065, ty1]], FRONT - 0.006, FRONT);          // tailpiece
  const by = DIM.bridge.y, bh = DIM.bridge.h;
  qd(ctx, [-0.068, by - 0.008, FRONT], [0.068, by - 0.008, FRONT], [0.062, by, FRONT - bh], [-0.062, by, FRONT - bh], [0, -1, -1]);
  qd(ctx, [-0.062, by, FRONT - bh], [0.062, by, FRONT - bh], [0.068, by + 0.008, FRONT], [-0.068, by + 0.008, FRONT], [0, 1, -1]);
  const pside = L <= 2 ? 8 : 5;
  for (const x of DIM.strings) {
    rod(ctx, [x, DIM.pegY, -T * 1.05 - 0.009], [x, DIM.pegY, -T * 1.05], 0.0045, pside);            // pin on the front
    if (L <= 3) { rod(ctx, [x, DIM.pegY, T * 1.05], [x, DIM.pegY, T * 1.05 + 0.02], 0.007, pside, 0.005); box(ctx, x - 0.009, DIM.pegY - 0.005, T * 1.05 + 0.02, x + 0.009, DIM.pegY + 0.005, T * 1.05 + 0.03); } // turning head behind
  }
  // carving: a cut knot band down each arm and across the yoke (darker incised lines), and a rim line round the box
  if (L <= 2) {
    ctx.albedo(null); ctx.color('oklch(0.3 0.04 55)'); ctx.roughness(0.9);
    const z = -T - 0.0006;
    for (const sx of [-1, 1]) {
      const cx = sx * (W - aw / 2), n = 6, h = (wy1 - wy0) / n;
      for (let i = 0; i < n; i++) {
        const y = wy0 + i * h, d = aw * 0.32;
        qd(ctx, [cx - d, y, z], [cx - d + 0.004, y, z], [cx + d + 0.004, y + h, z], [cx + d, y + h, z], [0, 0, -1]);
        qd(ctx, [cx + d, y, z], [cx + d + 0.004, y, z], [cx - d + 0.004, y + h, z], [cx - d, y + h, z], [0, 0, -1]);
      }
    }
    const yz = -T * 1.05 - 0.0006;
    for (let i = 0; i < 9; i++) { const x0 = -W * 0.8 + i * W * 0.2; qd(ctx, [x0, 0.748, yz], [x0 + W * 0.1, 0.762, yz], [x0 + W * 0.1 + 0.003, 0.762, yz], [x0 + 0.003, 0.748, yz], [0, 0, -1]); qd(ctx, [x0 + W * 0.1, 0.762, yz], [x0 + W * 0.2, 0.748, yz], [x0 + W * 0.2 + 0.003, 0.748, yz], [x0 + W * 0.1 + 0.003, 0.762, yz], [0, 0, -1]); }
    // bronze pins down the soundboard edge
    ctx.color('oklch(0.62 0.09 70)'); ctx.metalness(0.8); ctx.roughness(0.35);
    for (let i = 0; i < 7; i++) for (const sx of [-1, 1]) { const y = 0.06 + i * 0.075, x = sx * (W * 0.96 - 0.02); box(ctx, x - 0.003, y - 0.003, FRONT - 0.001, x + 0.003, y + 0.003, FRONT); }
    ctx.metalness(0);
  }
  // six gut strings, tail to bridge to peg, the pale gold of old gut (params.strings === false: the local moving string set draws them)
  if (L <= 3 && ctx.params?.strings !== false) {
    ctx.albedo(null); ctx.color('oklch(0.88 0.06 85)'); ctx.roughness(0.4);
    const r = L <= 2 ? 0.0011 : 0.0016, s = L <= 2 ? 4 : 3;
    for (const x of DIM.strings) {
      const a = [x * 0.8, ty1 - 0.005, stringZ(ty1)], b = [x * 0.98, by, FRONT - bh - 0.001], c = [x, DIM.pegY - 0.004, -T * 1.05 - 0.006];
      rod(ctx, a, b, r, s); rod(ctx, b, c, r, s);
    }
  }
  // the leather wrist loop off the left arm, hanging slack
  if (L <= 3) {
    ctx.albedo(null); ctx.color('oklch(0.36 0.05 45)'); ctx.roughness(0.85);
    const ax = -W, y0 = 0.64, pts = [];
    for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; pts.push([ax - Math.sin(a) * 0.045, y0 - 0.01 - Math.sin(a) * 0.06 + (i / 8) * -0.05, 0]); }
    for (let i = 0; i < pts.length - 1; i++) rod(ctx, pts[i], pts[i + 1], 0.005, L <= 2 ? 5 : 3);
  }
}
export function collider() { return null; }
