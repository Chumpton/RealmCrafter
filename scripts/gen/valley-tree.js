import { mesher, ramp, hex } from "./tree-kit.js";
// The valley's evergreens (campton's evergreen spec on forge's forest): one instanced system, params unchanged:
//   crown fir | pine, height (m), radius (m, widest skirt), seed via the scatter. valley-tree-far.js re-exports this geometry.
// Trunk to 92% with a lobed flare (1.1); 5-6 stacked skirts (first at 17% fir / 12% pine), radius (1-t)^0.9 ±12%;
// each skirt = 12 points alternating long/short (0.68), long tips droop R*0.22, the tier tilts its own way 6-14%;
// normals swell from a pivot under each tier so skirts light as soft cones; a dark underside #14281c.
// Levels: 1 full · 2 no mid ring · 3 four tiers, 8 points · 4 three tiers, no underside · 5 two tiers, ≤ 40 tris.
const TAU = Math.PI * 2;
const GRAD = ["#183424", "#2b5235", "#4a7a3f", "#86a957"];
const UNDER = hex("#14281c");
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const hash = (s, i, k) => { const x = Math.sin(s * 127.1 + i * 311.7 + k * 74.7) * 43758.5453; return x - Math.floor(x); };
export function geometry(ctx) {
  const lod = ctx.lod ?? 1, h = Number(ctx.params.height ?? 10), r = Number(ctx.params.radius ?? 2.6);
  const pine = ctx.params.crown === "pine", s = ctx.random() * 1000, m = mesher(ctx);
  // the trunk's gentle bow: tier centres ride it
  const ba = hash(s, 0, 1) * TAU, bend = h * 0.012;
  const at = (y) => { const b = Math.sin(Math.min(1, y / h) * Math.PI) * bend; return [Math.cos(ba) * b, Math.sin(ba) * b]; };
  const top = h * 0.92;
  {
    ctx.albedo("scripts/tex-valley-bark.js"); ctx.roughness(0.95); ctx.smooth(); ctx.color(pine ? "#7a5e48" : "#6a5444");
    const steps = lod === 1 ? 4 : lod === 2 ? 2 : 1, sides = lod === 1 ? 7 : lod === 2 ? 5 : lod === 3 ? 4 : 3, pts = [], rad = [];
    for (let i = 0; i <= steps; i++) { const y = top * i / steps, c = at(y); pts.push([c[0], y, c[1]]); rad.push(h * (0.024 - 0.018 * i / steps)); }
    m.tube(pts, rad, sides, hash(s, 0, 2) * TAU, lod <= 2 ? 1.1 : 0);
  }
  ctx.albedo("scripts/tex-valley-canopy.js"); ctx.roughness(0.92);
  const T = lod >= 5 ? 2 : lod === 4 ? 3 : lod === 3 ? 4 : pine ? 5 : 6;
  const N = lod >= 4 ? 6 : lod === 3 ? 8 : 12, mid = lod === 1, under = lod <= 3;
  const f = pine ? 0.12 : 0.17, last = pine ? 0.74 : 0.78, gap = h * (last - f) / Math.max(1, T - 1);
  for (let i = 0; i < T; i++) {
    const y0 = h * f + gap * i, tt = (y0 - h * f) / (h - h * f);
    const R = r * Math.pow(1 - tt, 0.9) * (1 + (hash(s, i, 3) * 2 - 1) * 0.12);
    const apex = i === T - 1 ? h : Math.min(h, y0 + gap * (pine ? 1.9 : 2.2));
    const [cx, cz] = at(y0), ta = hash(s, i, 4) * TAU, k = 0.06 + hash(s, i, 5) * 0.08, ph = hash(s, i, 6) * TAU;
    const tilt = (x, z) => k * ((x - cx) * Math.cos(ta) + (z - cz) * Math.sin(ta));
    const pivot = [cx, y0 - R * 0.55, cz];
    const nf = (p) => norm([p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]]);
    const sk = [], md = [];
    for (let j = 0; j < N; j++) {
      const a = j / N * TAU + ph, lng = j % 2 === 0, rr = R * (lng ? 1 : 0.68) * (0.94 + hash(s, i * 31 + j, 7) * 0.12);
      const x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr;
      sk.push([x, y0 - (lng ? R * 0.22 : 0) + tilt(x, z), z]);
      if (mid) { const mr = rr * 0.6, mx = cx + Math.cos(a) * mr, mz = cz + Math.sin(a) * mr; md.push([mx, y0 + (apex - y0) * 0.4 - (lng ? R * 0.05 : 0) + tilt(mx, mz), mz]); }
    }
    const A = [cx + Math.cos(ta) * R * 0.04, apex, cz + Math.sin(ta) * R * 0.04], nA = [0, 1, 0];
    const shade = (p, n) => ramp(GRAD, 0.06 + 0.5 * (p[1] / h) + 0.42 * Math.max(0, n[1]) + (hash(s, i, 8) - 0.5) * 0.08);
    const face = (a, b, c) => { const p = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]; ctx.color(...shade(p, nf(p))); };
    for (let j = 0; j < N; j++) {
      const q = (j + 1) % N, up = mid ? md : null;
      if (up) {
        face(sk[q], sk[j], up[j]); m.quad(sk[q], sk[j], up[j], up[q], nf(sk[q]), nf(sk[j]), nf(up[j]), nf(up[q]));
        face(A, up[q], up[j]); m.tri(A, up[q], up[j], nA, nf(up[q]), nf(up[j]));
      } else { face(A, sk[q], sk[j]); m.tri(A, sk[q], sk[j], nA, nf(sk[q]), nf(sk[j])); }
    }
    if (under) {
      const U = [cx, y0 + (apex - y0) * 0.16, cz], dn = (p) => norm([(p[0] - cx) * 0.35 / R, -1, (p[2] - cz) * 0.35 / R]);
      ctx.color(...UNDER);
      for (let j = 0; j < N; j++) { const q = (j + 1) % N; m.tri(U, sk[j], sk[q], [0, -1, 0], dn(sk[j]), dn(sk[q])); }
    }
  }
  return m.done();
}
export function collider(ctx) { const h = Number(ctx.params.height ?? 10); return { kind: "box", width: h * 0.048, height: h * 0.68, depth: h * 0.048 }; }
