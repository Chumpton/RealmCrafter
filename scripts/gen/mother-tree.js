// The mother tree (creator ask 2026-10-04: "1 singular tall mother tree … and a bench or meditation spot"):
// params.item 'tree' (one ancient oak-ash, ~26 m, buttress roots, five great limbs, a layered crown), 'bench' (a split-log bench
// on two stones, moss on its back edge; sit points from den-seats: seat/width) or 'circle' (flat stones in a ring, a moss mat, a candle cairn).
// Origin at the ground, the bench faces −Z. Chunky low-poly, painted colours, no textures needed beyond bark/moss.
import { tube, ell, box, lathe } from './lore-kit.js';
import { LEAD, leaderAt } from '../lib/data/treehouse.js';
const R = (s) => { let t = s >>> 0 || 1; return () => ((t = (t * 1664525 + 1013904223) >>> 0) / 4294967296); };
const BARK = 'cdn/texture-ancient-oak-bark-deep-furrows.png', MOSS = 'cdn/texture-soft-green-moss.png';
function tree(ctx, L, rnd) {
  const seg = L <= 1 ? 12 : L <= 2 ? 9 : L <= 3 ? 7 : 5;
  ctx.albedo(BARK); ctx.color('oklch(0.62 0.03 60)'); ctx.roughness(0.95); ctx.flat?.();
  // the trunk: wide, leaning a breath, flaring into the ground
  const trunk = []; for (let i = 0; i <= 8; i++) { const t = i / 8, y = -0.4 + t * 13.5; const r = 1.55 - 0.55 * t + 1.3 * Math.pow(1 - t, 6); trunk.push({ p: [0.5 * Math.sin(t * 2.4), y, -0.3 * t * t], rx: r * (1 + 0.08 * Math.sin(i * 1.7)), ry: r }); }
  tube(ctx, trunk, seg + 4);
  // the central leader (treehouse ask: the house crowns the tree): up from the trunk's top through the crown to the deck, leaning a breath
  const lead = []; for (let i = 0; i <= 6; i++) { const y = LEAD.y0 + (LEAD.y1 - LEAD.y0) * i / 6, a = leaderAt(y); lead.push({ p: [a.x, y, a.z], rx: a.r * (1 + 0.06 * Math.sin(i * 2.3)), ry: a.r }); }
  tube(ctx, lead, seg + 1);
  // buttress roots: eight, running out and down into the turf
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2 + rnd() * 0.3, len = 3.4 + rnd() * 2.6, c = Math.cos(a), s = Math.sin(a);
    tube(ctx, [{ p: [c * 0.8, 2.4, s * 0.8], rx: 0.55, ry: 0.75 }, { p: [c * 1.9, 0.8, s * 1.9], rx: 0.45, ry: 0.5 }, { p: [c * len * 0.7, 0.15, s * len * 0.7], rx: 0.3, ry: 0.28 }, { p: [c * len, -0.35, s * len], rx: 0.08, ry: 0.08 }], seg);
  }
  // five great limbs, then their boughs
  const tips = [];
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2 + 0.4 + rnd() * 0.4, c = Math.cos(a), s = Math.sin(a), y0 = 9.5 + k * 0.9, out = 6 + rnd() * 2.5, up = 6.5 + rnd() * 3;
    const top = [c * out, y0 + up, s * out];
    tube(ctx, [{ p: [c * 0.4, y0 - 1, s * 0.4], rx: 0.85, ry: 0.85 }, { p: [c * out * 0.45, y0 + up * 0.35, s * out * 0.45], rx: 0.55, ry: 0.55 }, { p: [c * out * 0.8, y0 + up * 0.8, s * out * 0.8], rx: 0.35, ry: 0.35 }, { p: top, rx: 0.14, ry: 0.14 }], seg);
    tips.push(top);
    if (L <= 3) for (let b = 0; b < 2; b++) { const ab = a + (b ? 0.7 : -0.7), m = [c * out * 0.6, y0 + up * 0.5, s * out * 0.6]; const e = [m[0] + Math.cos(ab) * 3.5, m[1] + 2.5, m[2] + Math.sin(ab) * 3.5]; tube(ctx, [{ p: m, rx: 0.3, ry: 0.3 }, { p: e, rx: 0.08, ry: 0.08 }], Math.max(4, seg - 3)); tips.push(e); }
  }
  tips.push([0.6, 17, -0.6]);
  // the crown: chunky clumps over every tip and between, three greens, darker underneath
  ctx.albedo(null); ctx.roughness(0.85);
  const greens = ['oklch(0.47 0.11 135)', 'oklch(0.53 0.12 128)', 'oklch(0.6 0.12 122)'];
  const cs = L <= 2 ? 11 : L <= 3 ? 8 : 6, cr = L <= 2 ? 7 : L <= 3 ? 5 : 4;
  ctx.smooth?.();
  for (const t of tips) {
    const n = L <= 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const r = 3.2 + rnd() * 2.2, off = [t[0] + (rnd() - 0.5) * 3, t[1] + (rnd() - 0.2) * 2, t[2] + (rnd() - 0.5) * 3];
      off[1] = Math.min(off[1], 26.8 - r * 0.7); // no clump pokes up through the treehouse deck or roof
      ctx.color(greens[(i + Math.floor(rnd() * 3)) % 3]); ell(ctx, off, [r, r * 0.7, r], cs, cr);
    }
  }
  ctx.color(greens[2]); ell(ctx, [0.9, 23.6, -1.6], [7.8, 3.4, 7.8], cs + 2, cr); // the high dome, flattened into a nest: the treehouse deck (local y 28) sits on it, the cabin stands clear above
  if (L <= 3) { ctx.color(greens[1]); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; ell(ctx, [0.9 + Math.cos(a) * 4.6, 25.4, -1.6 + Math.sin(a) * 4.6], [2.4, 1.3, 2.4], cs - 2, cr - 2); } } // leaf tufts tucked up round the deck's rim
  ctx.color('oklch(0.42 0.1 140)'); ell(ctx, [0.3, 15.5, -0.2], [10.5, 3.2, 10.5], cs + 3, cr); // the shadowed underside skirt
  // moss collar at her feet
  ctx.albedo(MOSS); ctx.color('oklch(0.72 0.1 130)');
  lathe(ctx, 0, -0.3, 0, [[0, 0], [2.6, 0.02], [2.3, 0.45], [1.7, 0.9], [0, 0.9]], seg + 4);
}
function bench(ctx, L) {
  const w = 1.9;
  ctx.albedo('cdn/texture-weathered-split-log-oak.png'); ctx.color('oklch(0.66 0.04 65)'); ctx.roughness(0.95); ctx.flat?.();
  box(ctx, -w / 2, 0.36, -0.22, w / 2, 0.47, 0.22); // the split log seat, flat face up
  ctx.color('oklch(0.55 0.04 60)'); box(ctx, -w / 2 + 0.05, 0.28, -0.17, w / 2 - 0.05, 0.36, 0.17);
  ctx.albedo('cdn/texture-weathered-grey-limestone.png'); ctx.color('oklch(0.72 0.01 90)');
  for (const x of [-0.65, 0.65]) box(ctx, x - 0.2, 0, -0.2, x + 0.2, 0.3, 0.2); // two stones under it
  if (L <= 3) { ctx.albedo(MOSS); ctx.color('oklch(0.7 0.11 132)'); box(ctx, -w / 2 + 0.1, 0.47, 0.1, w / 2 - 0.4, 0.5, 0.22); }
}
function circle(ctx, L, rnd) {
  ctx.albedo(MOSS); ctx.color('oklch(0.66 0.1 132)'); ctx.roughness(1);
  lathe(ctx, 0, 0, 0, [[0, 0], [2.4, 0.02], [2.3, 0.06], [0, 0.07]], L <= 2 ? 20 : 10);
  ctx.albedo('cdn/texture-weathered-grey-limestone.png'); ctx.flat?.();
  const n = 9; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * 2.7, z = Math.sin(a) * 2.7, s = 0.32 + rnd() * 0.12; ctx.color(`oklch(${0.68 + rnd() * 0.08} 0.012 90)`); box(ctx, x - s, 0, z - s * 0.8, x + s, 0.16 + rnd() * 0.1, z + s * 0.8); }
  // a sitting stone at the centre and a small candle cairn
  ctx.color('oklch(0.74 0.01 90)'); box(ctx, -0.42, 0, -0.32, 0.42, 0.36, 0.32);
  ctx.color('oklch(0.6 0.012 90)'); box(ctx, 1.45, 0, -0.2, 1.8, 0.2, 0.15); box(ctx, 1.5, 0.2, -0.15, 1.75, 0.36, 0.1); box(ctx, 1.55, 0.36, -0.1, 1.7, 0.46, 0.05);
  ctx.albedo(null); ctx.color('oklch(0.93 0.03 90)'); box(ctx, 1.59, 0.46, -0.06, 1.66, 0.62, 0.01);
}
export function geometry(ctx) {
  const p = ctx.params || {}, L = ctx.lod ?? 1, rnd = R(ctx.seed ?? 7);
  if (p.item === 'bench') return bench(ctx, L);
  if (p.item === 'circle') return circle(ctx, L, rnd);
  if (p.item === 'mother') return mother(ctx, L, rnd);
  return tree(ctx, L, rnd);
}
export function collider(ctx) {
  const p = ctx.params || {};
  if (p.item === 'bench') { box(ctx, -0.95, 0, -0.22, 0.95, 0.47, 0.22); return; }
  if (p.item === 'circle') { box(ctx, -0.42, 0, -0.32, 0.42, 0.36, 0.32); return; }
  if (p.item === 'mother') { box(ctx, -1.55, -1, -1.75, 1.75, 4, 1.35); box(ctx, -1.2, 4, -1.4, 1.5, 9.5, 1.1); return; } // the trunk alone: the crown is air
  // stepped to the trunk's taper and lean, so the treehouse ladder (scripts/lib/data/treehouse.js) and its deck clear it
  box(ctx, -1.75, -0.4, -1.75, 1.85, 3, 1.75);
  box(ctx, -0.85, 3, -1.31, 1.65, 7.5, 1.19);
  box(ctx, -0.55, 7.5, -1.2, 1.45, 13.2, 0.8);
  // the leader, stepped up to the deck (half-extent 0.75 r: inside the bark, clear of the ladders)
  for (let y = 13.2; y < LEAD.y1 - 0.01; y += 2.6) { const y1 = Math.min(LEAD.y1, y + 2.6), a = leaderAt((y + y1) / 2), h = a.r * 0.75; box(ctx, a.x - h, y, a.z - h, a.x + h, y1, a.z + h); }
}

// ── item 'mother': the Buddha's mother tree (creator ask 2026-10-09: "a mother tree behind him with a hangout area").
// ~25 m tall, crown ~27 m across, a 3 m buttressed trunk. Front −Z faces the Buddha's back and the hangout;
// two low limbs reach forward to hold the hangout's lanterns at LANTERN_HOOKS (local), kept in step with
// scripts/lib/data/buddha-garden.json.
export const LANTERN_HOOKS = [[-3.3, 5.2, -6.0], [3.3, 5.3, -5.8]];
export const SEED_LIGHTS = [[-4.6, 9.6, -3.2], [5.2, 10.1, 2.6]];
const LEAF_DARK = 'oklch(0.36 0.09 150)', LEAF_MID = 'oklch(0.5 0.13 138)', LEAF_LIT = 'oklch(0.66 0.15 125)', LEAF_SUN = 'oklch(0.78 0.15 112)';
// a lumpy crown clump: bands darker under, sunlit on top
function clump(ctx, c, r, L, rnd) {
  const seg = L <= 1 ? 12 : L <= 2 ? 9 : L <= 3 ? 7 : 5, rings = L <= 1 ? 8 : L <= 2 ? 6 : 4;
  const ph = rnd() * 6.28, ph2 = rnd() * 6.28;
  const P = (i, j) => {
    const la = -Math.PI / 2 + (i / rings) * Math.PI, lo = (j / seg) * Math.PI * 2;
    const k = 1 + (i > 0 && i < rings ? 0.13 * Math.sin(lo * 3 + ph) * Math.cos(la * 2) + 0.08 * Math.sin(lo * 5 + ph2 + la * 3) : 0);
    const flat = la < 0 ? 0.75 : 1; // flatter underneath, like a cloud of leaves
    return [c[0] + Math.cos(la) * Math.cos(lo) * r[0] * k, c[1] + Math.sin(la) * r[1] * k * flat, c[2] + Math.cos(la) * Math.sin(lo) * r[2] * k];
  };
  for (let i = 0; i < rings; i++) {
    const lat = (i + 0.5) / rings; // 0 bottom → 1 top
    ctx.color(lat < 0.3 ? LEAF_DARK : lat < 0.55 ? LEAF_MID : lat < 0.8 ? LEAF_LIT : LEAF_SUN);
    for (let j = 0; j < seg; j++) {
      const a = P(i, j), b = P(i, j + 1), cc = P(i + 1, j + 1), d = P(i + 1, j);
      // outward winding: lat bands run bottom→top, longitude counter-clockwise from above
      if (i === 0) ctx.tri(a[0], a[1], a[2], cc[0], cc[1], cc[2], d[0], d[1], d[2]);
      else if (i === rings - 1) ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], d[0], d[1], d[2]);
      else ctx.quad(a[0], a[1], a[2], d[0], d[1], d[2], cc[0], cc[1], cc[2], b[0], b[1], b[2]);
    }
  }
}
// a hanging moss strand: crossed tapering ribbons that kink as they fall
function moss(ctx, p, len, rnd) {
  const n = 4, pts = [p];
  for (let i = 1; i <= n; i++) pts.push([p[0] + (rnd() - 0.5) * 0.25, p[1] - (len * i) / n, p[2] + (rnd() - 0.5) * 0.25]);
  for (let i = 0; i < n; i++) {
    const w0 = 0.16 * (1 - i / n) + 0.03, w1 = 0.16 * (1 - (i + 1) / n) + 0.02, a = pts[i], b = pts[i + 1];
    ctx.color(i < 2 ? 'oklch(0.58 0.11 132)' : 'oklch(0.7 0.12 120)');
    for (const ang of [0.4, 2.0]) { const cx = Math.cos(ang), sz = Math.sin(ang); ctx.quad(a[0] - cx * w0, a[1], a[2] - sz * w0, a[0] + cx * w0, a[1], a[2] + sz * w0, b[0] + cx * w1, b[1], b[2] + sz * w1, b[0] - cx * w1, b[1], b[2] - sz * w1); }
  }
}
function mother(ctx, L, rnd) {
  const seg = L <= 1 ? 14 : L <= 2 ? 10 : L <= 3 ? 7 : 5;
  ctx.albedo(BARK); ctx.color('oklch(0.86 0.035 60)'); ctx.roughness(0.95); ctx.smooth();
  // the trunk: a gnarled, twisting column flaring into the turf
  const trunk = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, y = -1 + t * 10.5, r = 1.3 - 0.4 * t + 1.25 * Math.pow(1 - t, 6);
    trunk.push({ p: [0.35 * Math.sin(t * 3.1), y, -0.25 + 0.3 * Math.cos(t * 2.3)], rx: r * (1 + 0.1 * Math.sin(i * 1.9)), ry: r * (1 + 0.08 * Math.cos(i * 2.6)) });
  }
  tube(ctx, trunk, seg + 4);
  // buttress fins and the surface roots they run into: short in front (the hangout's north bench), long elsewhere
  const front = -Math.PI / 2;
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.2 + rnd() * 0.25, c = Math.cos(a), s = Math.sin(a);
    const facing = Math.cos(a - front), len = facing > 0.6 ? 2.4 + rnd() * 0.3 : 4.5 + rnd() * 2.8;
    tube(ctx, [{ p: [c * 0.7, 3.4, s * 0.7], rx: 0.4, ry: 0.9 }, { p: [c * 1.7, 1.2, s * 1.7], rx: 0.42, ry: 0.75 }, { p: [c * len * 0.6, 0.15, s * len * 0.6], rx: 0.32, ry: 0.36 }, { p: [c * len, -0.25, s * len], rx: 0.1, ry: 0.1 }], seg);
    if (facing <= 0.6 && L <= 3) { // a root snaking off across the ground
      const b = a + (rnd() - 0.5) * 0.6, e = len * (1.5 + rnd() * 0.4);
      tube(ctx, [{ p: [c * len * 0.7, 0.05, s * len * 0.7], rx: 0.26, ry: 0.22 }, { p: [Math.cos(b) * len * 1.1, 0.02, Math.sin(b) * len * 1.1], rx: 0.2, ry: 0.15 }, { p: [Math.cos(b) * e, -0.2, Math.sin(b) * e], rx: 0.05, ry: 0.05 }], Math.max(5, seg - 4));
    }
  }
  // great limbs: six, crooked, rising out to the crown; each splits into two boughs
  const tips = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.5 + rnd() * 0.3, c = Math.cos(a), s = Math.sin(a), y0 = 7.2 + (k % 3) * 0.9, out = 7 + rnd() * 2, up = 6 + rnd() * 2.5;
    const kink = (rnd() - 0.5) * 1.6, kx = -s * kink, kz = c * kink;
    const m1 = [c * out * 0.35 + kx, y0 + up * 0.25, s * out * 0.35 + kz], m2 = [c * out * 0.7 - kx * 0.5, y0 + up * 0.7, s * out * 0.7 - kz * 0.5], top = [c * out, y0 + up, s * out];
    tube(ctx, [{ p: [c * 0.3, y0 - 1.6, s * 0.3], rx: 0.9, ry: 0.9 }, { p: m1, rx: 0.62, ry: 0.62 }, { p: m2, rx: 0.4, ry: 0.4 }, { p: top, rx: 0.16, ry: 0.16 }], seg);
    tips.push(top);
    if (L <= 3) for (const sd of [-1, 1]) {
      const ab = a + sd * 0.75, e = [m2[0] + Math.cos(ab) * 3.6, m2[1] + 1.4 + rnd(), m2[2] + Math.sin(ab) * 3.6];
      tube(ctx, [{ p: m2, rx: 0.28, ry: 0.28 }, { p: e, rx: 0.07, ry: 0.07 }], Math.max(4, seg - 5)); tips.push(e);
    }
  }
  // two low limbs reaching forward over the hangout, the lanterns' hooks
  for (const h of LANTERN_HOOKS) {
    const sx = Math.sign(h[0]);
    tube(ctx, [{ p: [sx * 0.6, 4.0, -0.7], rx: 0.48, ry: 0.48 }, { p: [h[0] * 0.55, h[1] + 0.9, h[2] * 0.5], rx: 0.3, ry: 0.3 }, { p: [h[0], h[1] + 0.15, h[2]], rx: 0.17, ry: 0.17 }, { p: [h[0] * 1.15, h[1] + 0.55, h[2] * 1.15], rx: 0.06, ry: 0.06 }], Math.max(5, seg - 4));
  }
  // the crown: a lower skirt, a middle ring, a core and a sunlit cap
  ctx.albedo(null); ctx.roughness(0.85); ctx.smooth();
  const lvl = L >= 5 ? [[0, 15.5, 0, 12, 6, 12]] : [];
  if (L < 5) {
    const ring = (n, rad, y, rs, ry, off) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + off, rr = rad * (0.9 + rnd() * 0.2), s = rs * (0.85 + rnd() * 0.3); lvl.push([Math.cos(a) * rr, y + (rnd() - 0.5) * 1.2, Math.sin(a) * rr, s, ry * (0.85 + rnd() * 0.3), s]); } };
    ring(L <= 2 ? 10 : 7, 8.8, 12.4, 4.4, 2.7, 0.1);
    ring(L <= 2 ? 8 : 6, 5.6, 16.4, 4.6, 3.0, 0.5);
    ring(L <= 2 ? 4 : 3, 2.4, 19.8, 4.2, 2.9, 1.1);
    lvl.push([0.3, 22.6, -0.2, 3.8, 2.4, 3.8]);
    lvl.push([0, 11.6, 0, 7.5, 2.2, 7.5]); // the shadowed underside that closes the crown over the limbs
    if (L <= 2) for (const t of [LANTERN_HOOKS[0], LANTERN_HOOKS[1]]) lvl.push([t[0] * 1.2, t[1] + 1.5, t[2] * 1.2, 1.6, 1.0, 1.6]);
  }
  for (const c of lvl) clump(ctx, [c[0], c[1], c[2]], [c[3], c[4], c[5]], L, rnd);
  if (L >= 3) return;
  // hanging moss off the skirt and the limbs
  ctx.flat(); ctx.roughness(1);
  const strands = L <= 1 ? 40 : 18;
  for (let i = 0; i < strands; i++) { const a = rnd() * 6.28, rr = 4 + rnd() * 7.5; moss(ctx, [Math.cos(a) * rr, 10.6 - rr * 0.08 + rnd() * 0.6, Math.sin(a) * rr], 1.2 + rnd() * 2.2, rnd); }
  for (const h of LANTERN_HOOKS) for (let i = 0; i < 3; i++) moss(ctx, [h[0] * (0.5 + i * 0.18), h[1] + 0.7 - i * 0.2, h[2] * (0.5 + i * 0.18)], 0.6 + rnd() * 0.6, rnd);
  // seed-lights: small glowing orbs on threads under the crown, clustered round the two lamps
  const orbs = [];
  for (const s of SEED_LIGHTS) for (let i = 0; i < 5; i++) orbs.push([s[0] + (rnd() - 0.5) * 3, s[1] + (rnd() - 0.5) * 1.2, s[2] + (rnd() - 0.5) * 3]);
  for (let i = 0; i < 8; i++) { const a = rnd() * 6.28, rr = 3 + rnd() * 6; orbs.push([Math.cos(a) * rr, 9.4 + rnd() * 1.6, Math.sin(a) * rr]); }
  for (const o of orbs) {
    ctx.emissive(null); ctx.color('oklch(0.75 0.06 90)');
    const top = 11.2; ctx.quad(o[0] - 0.008, o[1], o[2], o[0] + 0.008, o[1], o[2], o[0] + 0.008, top, o[2], o[0] - 0.008, top, o[2]);
    ctx.color('oklch(0.95 0.12 85)'); ctx.emissive(3.2, 2.2, 0.8); ctx.smooth();
    ell(ctx, o, [0.13, 0.15, 0.13], 8, 5); ctx.flat();
  }
  ctx.emissive(null);
}
