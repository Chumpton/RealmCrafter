// Wildflowers round the Buddha's rise (creator ask: "spread wildflowers in the area").
// One scatter template per kind: params.kind daisy | yellowDaisy | poppy | bluebell | heather | buttercup.
// Origin at the ground, 0.15–0.45 m tall; sway is the height fraction so the wind bends heads, never roots.
const KIND = {
  daisy:       { h: [0.2, 0.3],  heads: [2, 3], petal: 'oklch(0.97 0.012 95)', eye: 'oklch(0.83 0.16 85)', n: 10, pr: 0.05, cup: 0.12 },
  yellowDaisy: { h: [0.22, 0.32], heads: [2, 3], petal: 'oklch(0.86 0.16 88)', eye: 'oklch(0.42 0.08 55)', n: 11, pr: 0.055, cup: 0.18 },
  poppy:       { h: [0.34, 0.45], heads: [1, 2], petal: 'oklch(0.6 0.22 29)', eye: 'oklch(0.24 0.03 300)', n: 4, pr: 0.07, cup: 0.75 },
  buttercup:   { h: [0.18, 0.28], heads: [2, 4], petal: 'oklch(0.87 0.17 96)', eye: 'oklch(0.7 0.14 120)', n: 5, pr: 0.03, cup: 0.9 },
  bluebell:    { h: [0.22, 0.32], petal: 'oklch(0.58 0.16 278)' },
  heather:     { h: [0.16, 0.26], petal: 'oklch(0.62 0.15 330)' },
};
const STEM = 'oklch(0.55 0.13 135)', LEAF = 'oklch(0.5 0.12 140)';
const lerp = (a, b, t) => a + (b - a) * t;
// a two-sided card between a and b, w wide at a, w2 at b, turned about Y by ang
function card(ctx, a, b, w, w2, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  ctx.quad(a[0] - c * w, a[1], a[2] - s * w, a[0] + c * w, a[1], a[2] + s * w, b[0] + c * w2, b[1], b[2] + s * w2, b[0] - c * w2, b[1], b[2] - s * w2);
}
function stem(ctx, pts, w, L) {
  ctx.color(STEM);
  for (let i = 0; i < pts.length - 1; i++) {
    card(ctx, pts[i], pts[i + 1], w, w * 0.8, 0);
    if (L <= 2) card(ctx, pts[i], pts[i + 1], w, w * 0.8, Math.PI / 2);
  }
}
function leaf(ctx, base, ang, len, w, lift) {
  ctx.color(LEAF);
  const dx = Math.cos(ang), dz = Math.sin(ang), px = -dz, pz = dx;
  const mid = [base[0] + dx * len * 0.5, base[1] + len * lift * 0.6, base[2] + dz * len * 0.5];
  const tip = [base[0] + dx * len, base[1] + len * lift, base[2] + dz * len];
  ctx.tri(base[0], base[1], base[2], mid[0] + px * w, mid[1], mid[2] + pz * w, tip[0], tip[1], tip[2]);
  ctx.tri(base[0], base[1], base[2], tip[0], tip[1], tip[2], mid[0] - px * w, mid[1], mid[2] - pz * w);
}
// a flat-to-cupped ring of petals round an eye at c
function head(ctx, k, c, scale, L, rnd) {
  const n = L >= 3 ? Math.max(4, Math.ceil(k.n / 2)) : k.n, r = k.pr * scale, a0 = rnd() * 6.28;
  ctx.color(k.petal);
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), half = (Math.PI / n) * (k.n <= 5 ? 1.15 : 0.7);
    const w = Math.tan(half) * r * 0.55, px = -sa, pz = ca, up = r * k.cup;
    const base = [c[0] + ca * r * 0.15, c[1], c[2] + sa * r * 0.15];
    const tip = [c[0] + ca * r, c[1] + up, c[2] + sa * r];
    const m = [c[0] + ca * r * 0.6, c[1] + up * 0.45, c[2] + sa * r * 0.6];
    ctx.quad(base[0], base[1], base[2], m[0] + px * w, m[1], m[2] + pz * w, tip[0], tip[1], tip[2], m[0] - px * w, m[1], m[2] - pz * w);
  }
  ctx.color(k.eye);
  const e = r * 0.28, top = [c[0], c[1] + e * 0.7, c[2]];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, b = ((i + 1) / 5) * Math.PI * 2;
    ctx.tri(c[0] + Math.cos(a) * e, c[1] + 0.003, c[2] + Math.sin(a) * e, top[0], top[1], top[2], c[0] + Math.cos(b) * e, c[1] + 0.003, c[2] + Math.sin(b) * e);
  }
}
function bell(ctx, p, len, r, col) {
  ctx.color(col);
  const n = 5, bot = p[1] - len;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, b = ((i + 1) / n) * Math.PI * 2;
    const flare = r * 1.35;
    ctx.tri(p[0], p[1], p[2], p[0] + Math.cos(a) * r, bot + len * 0.25, p[2] + Math.sin(a) * r, p[0] + Math.cos(b) * r, bot + len * 0.25, p[2] + Math.sin(b) * r);
    ctx.quad(p[0] + Math.cos(a) * r, bot + len * 0.25, p[2] + Math.sin(a) * r, p[0] + Math.cos(a) * flare, bot, p[2] + Math.sin(a) * flare,
      p[0] + Math.cos(b) * flare, bot, p[2] + Math.sin(b) * flare, p[0] + Math.cos(b) * r, bot + len * 0.25, p[2] + Math.sin(b) * r);
  }
}
export function geometry(ctx) {
  if (ctx.params?.patch) return patch(ctx);
  return clump(ctx, ctx.params?.kind || 'daisy');
}
// a drift: params.patch = { r, n, kinds: [[kind, weight]…], gx, gz, scale: [a, b] }: n clumps over a disc of radius r, seated on a
// ground plane of slope gx, gz (dy per metre, measured where it is placed) so a drift on the hill's flank hugs it.
function patch(ctx) {
  const P = ctx.params.patch, L = ctx.lod ?? 1, rnd = () => ctx.random();
  const kinds = P.kinds || [['daisy', 1]], tot = kinds.reduce((a, k) => a + k[1], 0);
  const n = Math.round((P.n || 60) * (L >= 5 ? 0.15 : L >= 4 ? 0.25 : L >= 3 ? 0.5 : 1)), sc = P.scale || [2, 2.6];
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.283, rr = P.r * Math.sqrt(rnd()), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    let w = rnd() * tot, kind = kinds[0][0]; for (const k of kinds) { if ((w -= k[1]) <= 0) { kind = k[0]; break; } }
    const s = sc[0] + rnd() * (sc[1] - sc[0]), y = (P.gx || 0) * x + (P.gz || 0) * z - 0.02, yaw = rnd() * 6.283, c = Math.cos(yaw), si = Math.sin(yaw);
    const T = (X, Y, Z) => [x + (X * c - Z * si) * s, y + Y * s, z + (X * si + Z * c) * s];
    const o = { color: (v) => ctx.color(v), flat: () => ctx.flat(), roughness: (v) => ctx.roughness(v), random: () => ctx.random() };
    o.tri = (...v) => { const A = T(v[0], v[1], v[2]), B = T(v[3], v[4], v[5]), C = T(v[6], v[7], v[8]); ctx.tri(...A, ...B, ...C); };
    o.quad = (...v) => { const A = T(v[0], v[1], v[2]), B = T(v[3], v[4], v[5]), C = T(v[6], v[7], v[8]), D = T(v[9], v[10], v[11]); ctx.quad(...A, ...B, ...C, ...D); };
    o.lod = Math.min(5, L + (rr > P.r * 0.6 ? 1 : 0));
    clump(o, kind);
  }
}
function clump(ctx, kind) {
  const L = ctx.lod ?? 1, k = KIND[kind] || KIND.daisy, rnd = () => ctx.random();
  ctx.flat(); ctx.roughness(kind === 'buttercup' ? 0.35 : 0.8);
  if (L >= 5) { // the far hull: one coloured cross
    ctx.color(k.petal); const h = k.h[1];
    card(ctx, [0, 0, 0], [0, h, 0], 0.04, 0.09, 0); card(ctx, [0, 0, 0], [0, h, 0], 0.04, 0.09, Math.PI / 2);
    return;
  }
  if (kind === 'bluebell') {
    const stems = L >= 3 ? 1 : 2;
    for (let s = 0; s < stems; s++) {
      const h = lerp(k.h[0], k.h[1], rnd()), ang = rnd() * 6.28, ox = (s ? 0.05 : 0) * Math.cos(ang), oz = (s ? 0.05 : 0) * Math.sin(ang);
      const dx = Math.cos(ang), dz = Math.sin(ang), pts = [];
      for (let i = 0; i <= 4; i++) { const t = i / 4, bend = t * t * 0.09; pts.push([ox + dx * bend, h * Math.sin(t * 1.35) / Math.sin(1.35), oz + dz * bend]); }
      stem(ctx, pts, 0.005, L);
      const bells = L >= 3 ? 2 : 4;
      for (let b = 0; b < bells; b++) { const t = 0.55 + (b / bells) * 0.45, i = Math.min(3, Math.floor(t * 4)); const p = pts[i + 1]; bell(ctx, [p[0] + dx * 0.012, p[1] - 0.008 - b * 0.004, p[2] + dz * 0.012], 0.032, 0.012, b % 2 ? 'oklch(0.62 0.15 285)' : k.petal); }
    }
    for (let i = 0; i < (L >= 3 ? 2 : 4); i++) leaf(ctx, [0, 0, 0], rnd() * 6.28, 0.16 + rnd() * 0.08, 0.012, 0.9);
    return;
  }
  if (kind === 'heather') {
    const stems = L >= 3 ? 3 : 6;
    for (let s = 0; s < stems; s++) {
      const a = rnd() * 6.28, h = lerp(k.h[0], k.h[1], rnd()), lean = 0.04 + rnd() * 0.06;
      const top = [Math.cos(a) * lean, h, Math.sin(a) * lean];
      ctx.color('oklch(0.42 0.07 140)'); card(ctx, [0, 0, 0], top, 0.006, 0.003, a);
      const tufts = L >= 3 ? 3 : 6;
      for (let t = 0; t < tufts; t++) {
        const f = 0.45 + (t / tufts) * 0.55, p = [top[0] * f, h * f, top[2] * f], r = 0.016 * (1.2 - f * 0.4);
        ctx.color(t % 3 === 0 ? 'oklch(0.7 0.13 335)' : k.petal);
        card(ctx, [p[0], p[1] - r, p[2]], [p[0], p[1] + r, p[2]], r, r * 0.4, a + t);
        if (L <= 2) card(ctx, [p[0], p[1] - r, p[2]], [p[0], p[1] + r, p[2]], r, r * 0.4, a + t + 1.57);
      }
    }
    ctx.color('oklch(0.4 0.08 150)');
    for (let i = 0; i < (L >= 3 ? 2 : 4); i++) leaf(ctx, [0, 0.01, 0], rnd() * 6.28, 0.09, 0.025, 0.4);
    return;
  }
  // daisies, poppies, buttercups: stems with a head each
  const heads = L >= 3 ? 1 : Math.round(lerp(k.heads[0], k.heads[1], rnd()));
  for (let s = 0; s < heads; s++) {
    const a = rnd() * 6.28, h = lerp(k.h[0], k.h[1], rnd()) * (s ? 0.85 : 1), lean = (s ? 0.05 : 0.015) + rnd() * 0.03;
    const top = [Math.cos(a) * lean, h, Math.sin(a) * lean], mid = [top[0] * 0.4 + 0.01, h * 0.55, top[2] * 0.4];
    stem(ctx, [[0, 0, 0], mid, top], 0.004, L);
    head(ctx, k, top, kind === 'poppy' ? 1 : 0.9 + rnd() * 0.25, L, rnd);
    if (kind === 'poppy' && s === 0 && L <= 2) { // a nodding bud
      const bp = [mid[0] - 0.03, mid[1] + 0.1, mid[2]]; stem(ctx, [mid, bp], 0.003, L);
      ctx.color('oklch(0.5 0.12 135)'); card(ctx, [bp[0], bp[1] - 0.025, bp[2]], [bp[0], bp[1] + 0.005, bp[2]], 0.009, 0.004, 0); card(ctx, [bp[0], bp[1] - 0.025, bp[2]], [bp[0], bp[1] + 0.005, bp[2]], 0.009, 0.004, 1.57);
    }
  }
  const leaves = L >= 3 ? 2 : kind === 'buttercup' ? 5 : 3;
  for (let i = 0; i < leaves; i++) leaf(ctx, [0, 0.005, 0], rnd() * 6.28, kind === 'poppy' ? 0.12 : 0.08, kind === 'buttercup' ? 0.03 : 0.018, 0.45);
}
export function collider() { return null; }
