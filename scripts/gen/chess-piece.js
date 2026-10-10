// Norse chess pieces — one family. params { kind: k|q|b|n|r|p, side: w (bone) | b (walnut) }.
// Feet at y 0, front −Z, metres, sized to 0.07 m squares (scripts/lib/data/chess.js). Heights: k .075 jarl on a throne,
// q .068 hooded seeress with staff, b .058 shieldmaiden, n .052 horse head, r .048 longship, p .04 spearman. Bases ≤ .052.
// lod 1–2: the carved piece (lod 2 fewer sides); lod 3+: a per-kind silhouette, ≤ 40 tris (small pieces reach lod 3 within a metre).
const PAL = {
  w: { L: 0.9, C: 0.03, H: 85, amp: 0.016, rough: 0.55, dark: 'oklch(0.5 0.05 62)', accent: 'oklch(0.72 0.075 45)' },
  b: { L: 0.34, C: 0.05, H: 50, amp: 0.028, rough: 0.5, dark: 'oklch(0.19 0.03 45)', accent: 'oklch(0.53 0.085 45)' },
};
let C, P, fixed = null, SEG = 16, ESEG = 12, ERING = 8, TSEG = 8;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// paint: the side's colour with a faint banded grain, or a fixed tone for carved accents
function paint(m) {
  if (fixed) return;
  const t = m[1] * 650 + Math.sin(m[0] * 420 + m[2] * 90) * 1.8 + Math.sin(m[2] * 380) * 1.1;
  const L = P.L + P.amp * Math.sin(t) + P.amp * 0.4 * Math.sin(t * 2.7 + 1);
  C.color(`oklch(${L.toFixed(3)} ${P.C} ${P.H})`);
}
function tone(t) { fixed = t ? P[t] : null; if (fixed) C.color(fixed); }
function face(a, b, c, d, dir) {
  const m = d ? mul(add(add(a, b), add(c, d)), 0.25) : mul(add(add(a, b), c), 1 / 3);
  paint(m);
  const flip = dot(crs(sub(b, a), sub(c, a)), dir) < 0;
  if (d) flip ? C.quad(...a, ...d, ...c, ...b) : C.quad(...a, ...b, ...c, ...d);
  else flip ? C.tri(...a, ...c, ...b) : C.tri(...a, ...b, ...c);
}
const fr = (a, b, c, d, ref) => face(a, b, c, d, sub(d ? mul(add(add(a, b), add(c, d)), 0.25) : mul(add(add(a, b), c), 1 / 3), ref));
// solid of revolution: prof [[r, y]…] bottom centre round the outside to the top; o origin; optional axis frame and arc
function lathe(o, prof, seg = SEG, f = {}) {
  const X = f.X || [1, 0, 0], Y = f.Y || [0, 1, 0], Z = f.Z || [0, 0, 1], a0 = f.a0 || 0, arc = f.arc || Math.PI * 2;
  const p = (r, y, t) => add(o, add(mul(Y, y), add(mul(X, Math.cos(t) * r), mul(Z, Math.sin(t) * r))));
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1], dr = r1 - r0, dy = y1 - y0;
    for (let s = 0; s < seg; s++) {
      const t0 = a0 + (s / seg) * arc, t1 = a0 + ((s + 1) / seg) * arc, tm = (t0 + t1) / 2;
      const dir = add(mul(Y, -dr), add(mul(X, Math.cos(tm) * dy), mul(Z, Math.sin(tm) * dy)));
      if (r0 < 1e-6) face(p(0, y0, 0), p(r1, y1, t0), p(r1, y1, t1), null, dir);
      else if (r1 < 1e-6) face(p(r0, y0, t0), p(r0, y0, t1), p(0, y1, 0), null, dir);
      else face(p(r0, y0, t0), p(r0, y0, t1), p(r1, y1, t1), p(r1, y1, t0), dir);
    }
  }
}
// elliptic tube along a spine, frame carried along (no twist); pts [{p, rx, ry}], rx sideways
function tube(pts, seg = TSEG) {
  const n = pts.length, rings = [];
  let S = null;
  for (let i = 0; i < n; i++) {
    const T = nrm(sub(pts[Math.min(n - 1, i + 1)].p, pts[Math.max(0, i - 1)].p));
    if (!S) { S = crs(T, [0, 1, 0]); if (Math.hypot(...S) < 1e-4) S = [1, 0, 0]; }
    S = nrm(sub(S, mul(T, dot(S, T))));
    const U = crs(S, T), { p, rx, ry } = pts[i], ring = [];
    for (let s = 0; s < seg; s++) { const t = (s / seg) * Math.PI * 2; ring.push(add(p, add(mul(S, Math.cos(t) * rx), mul(U, Math.sin(t) * ry)))); }
    rings.push({ ring, T, p });
  }
  for (let i = 0; i < n - 1; i++) {
    const A = rings[i], B = rings[i + 1], m = mul(add(A.p, B.p), 0.5);
    for (let s = 0; s < seg; s++) { const s1 = (s + 1) % seg; fr(A.ring[s], A.ring[s1], B.ring[s1], B.ring[s], m); }
  }
  for (const [k, sg] of [[0, -1], [n - 1, 1]]) {
    if (pts[k].rx < 1e-5) continue;
    const R = rings[k];
    for (let s = 0; s < seg; s++) face(R.p, R.ring[s], R.ring[(s + 1) % seg], null, mul(R.T, sg));
  }
}
const rod = (a, b, r, r2 = r, seg = Math.max(5, TSEG - 2)) => tube([{ p: a, rx: r, ry: r }, { p: b, rx: r2, ry: r2 }], seg);
function ell(c, r, seg = ESEG, rings = ERING) {
  const Pt = (i, j) => { const la = -Math.PI / 2 + (i / rings) * Math.PI, lo = (j / seg) * Math.PI * 2; return [c[0] + Math.cos(la) * Math.cos(lo) * r[0], c[1] + Math.sin(la) * r[1], c[2] + Math.cos(la) * Math.sin(lo) * r[2]]; };
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const a = Pt(i, j), b = Pt(i, j + 1), cc = Pt(i + 1, j + 1), d = Pt(i + 1, j);
    if (i === 0) face(a, cc, d, null, sub(cc, c)); else if (i === rings - 1) face(a, b, cc, null, sub(a, c)); else fr(a, b, cc, d, c);
  }
}
function box(x0, y0, z0, x1, y1, z1, bottom = true) {
  C.flat();
  const Q = (i) => [i & 1 ? x1 : x0, i & 2 ? y1 : y0, i & 4 ? z1 : z0];
  face(Q(0), Q(1), Q(3), Q(2), [0, 0, -1]); face(Q(4), Q(5), Q(7), Q(6), [0, 0, 1]);
  face(Q(0), Q(2), Q(6), Q(4), [-1, 0, 0]); face(Q(1), Q(3), Q(7), Q(5), [1, 0, 0]);
  if (bottom) face(Q(0), Q(1), Q(5), Q(4), [0, -1, 0]);
  face(Q(2), Q(3), Q(7), Q(6), [0, 1, 0]);
  C.smooth();
}
function base(R, h = 0.008) {
  lathe([0, 0, 0], [[0, 0], [R, 0], [R, h * 0.42], [R - 0.0011, h * 0.58], [R - 0.0006, h * 0.72], [R - 0.0024, h], [0, h]], SEG + 4);
}
const arm = (a, b, c, r = 0.0021) => tube([{ p: a, rx: r, ry: r }, { p: b, rx: r * 0.9, ry: r * 0.9 }, { p: c, rx: r * 0.8, ry: r * 0.8 }], Math.max(5, TSEG - 2));

function jarl() {
  base(0.026);
  // the throne: seat, back, corner posts with knob finials, a cut band across the back
  box(-0.017, 0.008, -0.013, 0.017, 0.028, 0.016);
  box(-0.017, 0.028, 0.011, 0.017, 0.055, 0.016);
  for (const x of [-0.0158, 0.0158]) { rod([x, 0.028, 0.0135], [x, 0.06, 0.0135], 0.0026); ell([x, 0.0612, 0.0135], [0.0034, 0.0034, 0.0034]); ell([x, 0.0292, -0.0115], [0.0026, 0.0024, 0.0026]); }
  tone('dark'); box(-0.0162, 0.047, 0.0104, 0.0162, 0.0495, 0.0112); box(-0.0162, 0.0325, -0.0134, 0.0162, 0.034, -0.0126); tone(null);
  // seated body: robe over the knees, torso, arms resting on the sword across the lap
  box(-0.0095, 0.008, -0.0165, 0.0095, 0.029, -0.0095);
  box(-0.0095, 0.027, -0.0165, 0.0095, 0.036, 0.004);
  lathe([0, 0, 0.003], [[0, 0.027], [0.0112, 0.027], [0.0116, 0.036], [0.0098, 0.046], [0.0068, 0.052], [0, 0.0535]]);
  for (const sx of [-1, 1]) { arm([sx * 0.0095, 0.047, 0.002], [sx * 0.0118, 0.039, -0.004], [sx * 0.0075, 0.0375, -0.0125]); ell([sx * 0.0068, 0.0375, -0.0132], [0.0022, 0.0019, 0.0022]); }
  tone('accent'); rod([-0.015, 0.0385, -0.0148], [0.015, 0.0385, -0.0148], 0.0011); box(0.0078, 0.0366, -0.0158, 0.0088, 0.0404, -0.0138); tone(null);
  // head, beard, crown band with six points
  ell([0, 0.0592, 0.002], [0.0064, 0.0072, 0.0064]);
  tube([{ p: [0, 0.0565, -0.0035], rx: 0.0048, ry: 0.0032 }, { p: [0, 0.051, -0.006], rx: 0.0036, ry: 0.0024 }, { p: [0, 0.0465, -0.0068], rx: 0.0008, ry: 0.0006 }]);
  tone('accent');
  lathe([0, 0, 0.002], [[0.0052, 0.0626], [0.0074, 0.0626], [0.0076, 0.068], [0, 0.068]]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 2, pt = (r, y, t) => [Math.cos(t) * r, y, 0.002 + Math.sin(t) * r];
    const L = pt(0.0075, 0.0678, a - 0.3), R = pt(0.0075, 0.0678, a + 0.3), I = pt(0.0058, 0.0678, a), T = pt(0.007, 0.075, a);
    face(L, R, T, null, [Math.cos(a), 0.2, Math.sin(a)]); face(L, I, T, null, [-Math.cos(a), 0, -Math.sin(a)]); face(I, R, T, null, [-Math.cos(a), 0, -Math.sin(a)]);
  }
  tone(null);
}
function seeress() {
  base(0.025);
  lathe([0, 0, 0], [[0, 0.008], [0.0172, 0.008], [0.0168, 0.012], [0.0134, 0.022], [0.0104, 0.036], [0.0094, 0.045], [0.0104, 0.0488], [0.007, 0.052], [0, 0.053]]);
  tone('dark'); lathe([0, 0, 0], [[0.0171, 0.0102], [0.0175, 0.0106], [0.0171, 0.011]], SEG); tone(null);
  ell([0, 0.056, -0.0005], [0.0062, 0.007, 0.0062]);
  // hood, open at the face, peaked behind
  lathe([0, 0, 0.0012], [[0.0093, 0.0478], [0.0095, 0.054], [0.0087, 0.059], [0.0067, 0.063], [0.0036, 0.0658], [0, 0.0668]], SEG, { a0: -Math.PI / 2 + 0.72, arc: Math.PI * 2 - 1.44 });
  // staff with a caged knob, right hand on it, left hand across the waist
  rod([0.0138, 0.008, -0.0042], [0.0138, 0.0636, -0.0042], 0.0011);
  tone('accent'); ell([0.0138, 0.0655, -0.0042], [0.0023, 0.0024, 0.0023]); lathe([0.0138, 0.0612, -0.0042], [[0, 0], [0.0016, 0.0008], [0.0017, 0.002], [0, 0.0024]], 8); tone(null);
  arm([0.0088, 0.0475, 0], [0.0122, 0.0395, -0.0035], [0.0135, 0.0425, -0.0042]); ell([0.0136, 0.0425, -0.0042], [0.0019, 0.0021, 0.0019]);
  arm([-0.0088, 0.0475, 0], [-0.0108, 0.0395, -0.004], [-0.0015, 0.0375, -0.0095]); ell([-0.0012, 0.0375, -0.0099], [0.0019, 0.0017, 0.0019]);
}
function shieldmaiden() {
  base(0.023);
  lathe([0, 0, 0], [[0, 0.008], [0.0155, 0.008], [0.0146, 0.012], [0.0116, 0.022], [0.0086, 0.034], [0.008, 0.04], [0.009, 0.043], [0.006, 0.046], [0, 0.047]]);
  ell([0, 0.0505, 0], [0.0055, 0.006, 0.0055]);
  // braid down the back, a knot on top
  const br = []; for (let i = 0; i < 6; i++) br.push({ p: [((i % 2) - 0.5) * 0.0012, 0.0515 - i * 0.0024, 0.0052 + i * 0.0006], rx: 0.0019 - i * 0.0001, ry: 0.0017 });
  tube(br, 6);
  ell([0, 0.0555, 0.0016], [0.0028, 0.0026, 0.0028]);
  tone('accent'); lathe([0, 0, 0], [[0.0054, 0.0508], [0.0058, 0.0512], [0.0056, 0.0534], [0.0052, 0.0536]], SEG); tone(null);
  // round shield on her left, boss and rim ring; sword raised in the right hand
  const SH = { X: [1, 0, 0], Y: [0, 0, -1], Z: [0, 1, 0] };
  lathe([-0.0042, 0.03, -0.0094], [[0, 0], [0.0116, 0], [0.0119, 0.0012], [0.0113, 0.0021], [0, 0.0023]], SEG, SH);
  tone('accent'); lathe([-0.0042, 0.03, -0.0094], [[0.0097, 0.0024], [0.0112, 0.0022], [0.0112, 0.0025], [0.0097, 0.0027]], SEG, SH); tone(null);
  ell([-0.0042, 0.03, -0.0118], [0.0028, 0.0028, 0.0018]);
  arm([0.0085, 0.042, 0], [0.0122, 0.0355, -0.003], [0.0122, 0.0345, -0.0065]); ell([0.0122, 0.0348, -0.0068], [0.0018, 0.0019, 0.0018]);
  tone('accent'); box(0.0104, 0.0362, -0.0074, 0.014, 0.0372, -0.0062); tone(null);
  tube([{ p: [0.0122, 0.0372, -0.0068], rx: 0.0012, ry: 0.0005 }, { p: [0.0126, 0.052, -0.0078], rx: 0.001, ry: 0.0004 }, { p: [0.0127, 0.0548, -0.008], rx: 0.0001, ry: 0.0001 }], 4);
}
function horse() {
  base(0.023);
  lathe([0, 0, 0.006], [[0.0126, 0.0078], [0.0122, 0.0108], [0.0106, 0.0138], [0, 0.015]]);
  tube([
    { p: [0, 0.009, 0.006], rx: 0.0105, ry: 0.0095 }, { p: [0, 0.02, 0.0058], rx: 0.0095, ry: 0.0092 },
    { p: [0, 0.031, 0.0038], rx: 0.0081, ry: 0.0086 }, { p: [0, 0.0395, 0.0006], rx: 0.0073, ry: 0.0078 },
    { p: [0, 0.0438, -0.0042], rx: 0.0068, ry: 0.0071 }, { p: [0, 0.041, -0.0118], rx: 0.0058, ry: 0.0062 },
    { p: [0, 0.0362, -0.0188], rx: 0.0049, ry: 0.0053 }, { p: [0, 0.0333, -0.0226], rx: 0.0042, ry: 0.0042 },
  ], TSEG + 2);
  ell([0, 0.0335, -0.0132], [0.0052, 0.0052, 0.008]);
  for (const sx of [-1, 1]) {
    rod([sx * 0.0031, 0.0465, 0.0008], [sx * 0.0037, 0.0522, 0.003], 0.0019, 0.0003, 5);
    tone('dark'); ell([sx * 0.0058, 0.0412, -0.0086], [0.0012, 0.0012, 0.0014], 6, 4); ell([sx * 0.0026, 0.0342, -0.0252], [0.0009, 0.001, 0.0008], 6, 4); tone(null);
  }
  // braided mane: knots alternating down the crest, a forelock
  const mane = [[0.0466, 0.0038], [0.0425, 0.0078], [0.0381, 0.0104], [0.0336, 0.0124], [0.029, 0.0138], [0.0244, 0.0149], [0.0198, 0.0156], [0.0154, 0.016], [0.0112, 0.0163]];
  tone('accent'); mane.forEach(([y, z], i) => ell([((i % 2) - 0.5) * 0.0016, y, z + 0.0008], [0.0026, 0.0024, 0.0021], 8, 5)); tone(null);
  ell([0, 0.0472, -0.0032], [0.0024, 0.002, 0.0028], 8, 5);
}
function longship() {
  base(0.024, 0.007);
  // hull lofted bow (−Z) to stern: U sections, gunwale rising to both ends
  const N = 14, M = 8, sect = [];
  const W = (t) => Math.max(0.0007, 0.0118 * Math.pow(Math.sin(Math.PI * t), 0.75)), G = (t) => 0.0185 + 0.0068 * Math.pow(2 * t - 1, 4), K = (t) => 0.0078 + 0.0036 * Math.pow(2 * t - 1, 2);
  for (let k = 0; k <= N; k++) {
    const t = k / N, z = -0.027 + 0.054 * t, w = W(t), g = G(t), kl = K(t), ring = [];
    for (let j = 0; j <= M; j++) { const ph = -Math.PI / 2 + (j / M) * Math.PI; ring.push([w * Math.sin(ph), g - (g - kl) * Math.cos(ph), z]); }
    sect.push({ ring, c: [0, (g + kl) / 2, z] });
  }
  for (let k = 0; k < N; k++) {
    const A = sect[k], B = sect[k + 1], m = mul(add(A.c, B.c), 0.5), n = A.ring.length;
    for (let j = 0; j < n; j++) { const j1 = (j + 1) % n; fr(A.ring[j], A.ring[j1], B.ring[j1], B.ring[j], m); }
  }
  for (const [k, dz] of [[0, -1], [N, 1]]) { const S = sect[k]; for (let j = 0; j < S.ring.length; j++) face(S.c, S.ring[j], S.ring[(j + 1) % S.ring.length], null, [0, 0, dz]); }
  // shields hung along both gunwales
  for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) {
    const t = 0.28 + i * 0.11, z = -0.027 + 0.054 * t;
    tone(i % 2 ? 'accent' : null);
    lathe([sx * (W(t) - 0.0002), G(t) - 0.0024, z], [[0, 0], [0.0027, 0], [0.0027, 0.0006], [0, 0.0009]], 8, { X: [0, 0, 1], Y: [sx, 0, 0], Z: [0, 1, 0] });
  }
  tone(null);
  // dragon prow and curled stern
  tube([{ p: [0, 0.023, -0.0262], rx: 0.0021, ry: 0.0021 }, { p: [0, 0.0295, -0.0302], rx: 0.0019, ry: 0.0019 }, { p: [0, 0.0355, -0.031], rx: 0.0017, ry: 0.0017 }, { p: [0, 0.0398, -0.0288], rx: 0.0017, ry: 0.0017 }], 6);
  ell([0, 0.0408, -0.0312], [0.0021, 0.0023, 0.0037], 8, 6);
  rod([-0.0009, 0.0418, -0.0292], [-0.0015, 0.0448, -0.026], 0.0007, 0.0002, 4); rod([0.0009, 0.0418, -0.0292], [0.0015, 0.0448, -0.026], 0.0007, 0.0002, 4);
  tube([{ p: [0, 0.023, 0.0262], rx: 0.0019, ry: 0.0019 }, { p: [0, 0.0295, 0.0302], rx: 0.0017, ry: 0.0017 }, { p: [0, 0.0345, 0.0292], rx: 0.0014, ry: 0.0014 }, { p: [0, 0.0362, 0.0258], rx: 0.0011, ry: 0.0011 }, { p: [0, 0.0342, 0.0238], rx: 0.0008, ry: 0.0008 }], 6);
  // mast, yard, a bellied sail in stripes
  rod([0, 0.016, 0.003], [0, 0.0468, 0.003], 0.0011); ell([0, 0.0472, 0.003], [0.0012, 0.0008, 0.0012], 6, 4);
  rod([-0.0185, 0.0446, 0.0018], [0.0185, 0.0446, 0.0018], 0.0008);
  for (let i = 0; i < 6; i++) {
    const x0 = -0.017 + i * (0.034 / 6), zc = 0.0012 - 0.0036 * Math.sin((Math.PI * (i + 0.5)) / 6);
    tone(i % 2 ? 'accent' : null); box(x0, 0.0215, zc - 0.0004, x0 + 0.034 / 6, 0.0442, zc + 0.0004); 
  }
  tone(null);
}
function spearman() {
  base(0.019, 0.007);
  lathe([0, 0, 0], [[0, 0.007], [0.0125, 0.007], [0.0116, 0.0098], [0.0086, 0.018], [0.0073, 0.025], [0.0079, 0.0272], [0.0052, 0.029], [0, 0.0296]]);
  tone('dark'); lathe([0, 0, 0], [[0.0079, 0.0205], [0.0082, 0.021], [0.008, 0.0222], [0.0077, 0.0225]], SEG); tone(null);
  ell([0, 0.0316, 0], [0.0045, 0.0048, 0.0045]);
  // conical helm with a nasal guard
  lathe([0, 0, 0], [[0.0043, 0.0306], [0.0051, 0.0314], [0.0051, 0.0328], [0.0037, 0.0354], [0.0013, 0.0373], [0, 0.0378]]);
  box(-0.0006, 0.0284, -0.0053, 0.0006, 0.0318, -0.0043);
  // spear upright in the right hand, leaf blade
  rod([0.0088, 0.007, -0.003], [0.0088, 0.0348, -0.003], 0.00075);
  tone('accent'); lathe([0.0088, 0, -0.003], [[0, 0.0342], [0.0015, 0.0358], [0.0012, 0.0378], [0, 0.0399]], 5); tone(null);
  arm([0.0066, 0.0262, 0], [0.0092, 0.0215, -0.0012], [0.0088, 0.0212, -0.0028], 0.0017); ell([0.0088, 0.0212, -0.003], [0.0016, 0.0017, 0.0016]);
  arm([-0.0066, 0.0262, 0], [-0.0086, 0.02, -0.0005], [-0.006, 0.0165, -0.0045], 0.0017);
}
// far (lod 3+): each kind its own silhouette in ≤ 40 tris — square/pentagon lathes, open-bottom boxes, oriented slabs
const Q4 = { a0: Math.PI / 4 };
function obox(c, X, Y, Z) { // oriented box, half-axis vectors, no underside — 10 tris
  const v = (i, j, k) => add(c, add(mul(X, i), add(mul(Y, j), mul(Z, k))));
  const F = (a, b2, cc, d) => fr(a, b2, cc, d, c);
  F(v(-1, -1, -1), v(1, -1, -1), v(1, 1, -1), v(-1, 1, -1)); F(v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1));
  F(v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)); F(v(1, -1, -1), v(1, -1, 1), v(1, 1, 1), v(1, 1, -1));
  F(v(-1, 1, -1), v(1, 1, -1), v(1, 1, 1), v(-1, 1, 1));
}
const ob = (x0, y0, z0, x1, y1, z1) => obox([(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [(x1 - x0) / 2, 0, 0], [0, (y1 - y0) / 2, 0], [0, 0, (z1 - z0) / 2]);
const LOW = {
  // jarl: squat body flaring to a flat crown, throne back behind the shoulders — 38
  k() { lathe([0, 0, 0], [[0.025, 0], [0.013, 0.05], [0.0095, 0.062], [0.012, 0.075], [0, 0.075]], 4, Q4); ob(-0.015, 0.006, 0.008, 0.015, 0.052, 0.015); },
  // seeress: hooded cone, staff standing proud of the head — 38
  q() { lathe([0, 0, 0], [[0.023, 0], [0.015, 0.01], [0.0085, 0.05], [0, 0.064]], 4, Q4); ob(0.0125, 0.004, -0.0065, 0.0155, 0.068, -0.0035); },
  // shieldmaiden: slim body, round shield on her left front — 39
  b() { lathe([0, 0, 0], [[0.021, 0], [0.014, 0.008], [0.008, 0.042], [0.0058, 0.046], [0, 0.058]], 5);
    const c = [-0.0105, 0.027, -0.009], X = [0.7071, 0, -0.7071], r = 0.0115, h = []; for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; h.push(add(c, add(mul(X, Math.cos(t) * r), [0, Math.sin(t) * r, 0]))); }
    tone('accent'); for (let i = 1; i < 5; i++) face(h[0], h[i], h[i + 1], null, [-0.7071, 0, -0.7071]); tone(null); },
  // horse: round base, arched neck, head reaching forward and down, one ear — 36
  n() { lathe([0, 0, 0], [[0.023, 0], [0.017, 0.009], [0, 0.009]], 5);
    obox([0, 0.024, 0.004], [0.0058, 0, 0], mul(nrm([0, 1, -0.35]), 0.0165), mul(nrm([0, 0.35, 1]), 0.0075));
    obox([0, 0.04, -0.008], [0.0048, 0, 0], mul(nrm([0, 1, -0.45]), 0.0062), mul(nrm([0, -0.45, -1]), 0.0125));
    face([0, 0.046, 0.002], [0, 0.046, -0.004], [0, 0.052, 0.001], null, [1, 0, 0]); },
  // longship: plinth, hull, curling prow and stern, broad sail — 32
  r() { ob(-0.013, 0, -0.023, 0.013, 0.004, 0.023); ob(-0.009, 0.004, -0.019, 0.009, 0.015, 0.019);
    face([0, 0.012, -0.019], [0, 0.015, -0.013], [0, 0.034, -0.026], null, [1, 0, 0]); face([0, 0.012, 0.019], [0, 0.015, 0.013], [0, 0.03, 0.024], null, [1, 0, 0]);
    tone('accent'); ob(-0.017, 0.018, -0.0015, 0.017, 0.044, 0.0015); tone(null); },
  // spearman: stout body under a pointed helm, spear past the helm — 38
  p() { lathe([0, 0, 0], [[0.019, 0], [0.012, 0.007], [0.007, 0.029], [0.0056, 0.031], [0, 0.038]], 4, Q4); ob(0.0078, 0.004, -0.0042, 0.0098, 0.04, -0.0022); },
};
const BUILD = { k: jarl, q: seeress, b: shieldmaiden, n: horse, r: longship, p: spearman };
export function geometry(ctx) {
  const kind = BUILD[ctx.params.kind] ? ctx.params.kind : 'p', side = ctx.params.side === 'b' ? 'b' : 'w';
  C = ctx; P = PAL[side]; fixed = null;
  ctx.roughness(P.rough);
  if (ctx.lod >= 3) {
    ctx.flat(); tone(null); fixed = `oklch(${P.L} ${P.C} ${P.H})`; ctx.color(fixed);
    LOW[kind]();
    fixed = null;
    return;
  }
  const hi = ctx.lod <= 1;
  SEG = hi ? 16 : 10; ESEG = hi ? 12 : 8; ERING = hi ? 8 : 5; TSEG = hi ? 8 : 6;
  ctx.smooth();
  BUILD[kind]();
  fixed = null;
}
export function collider() { return null; }
