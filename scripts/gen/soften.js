// softened(geometryFn): wraps a plant generator so its foliage lights as one soft mass.
// Every tri/quad still goes straight to the real ctx (albedo, colour, roughness order untouched); the wrapper only
// records each triangle and its colour, then returns per-vertex normals: green-dominant faces get a normal pushed out
// from the foliage's mass centre (ellipsoidal, so a wide low patch reads as a dome), every other face keeps its crisp face normal.
// A generator that already returns its own normals passes through unchanged. Plants only: never lamps, fire, UI or NPCs.
const K = { radial: 0.72 }; // share of the mass-centre normal on a green face; the rest is its own facet
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
function isGreen(args) {
  if (!args.length) return false;
  const a = args[0];
  if (typeof a === "number") { const g = args[1] ?? 0, b = args[2] ?? 0; return g > a && g > b; }
  if (typeof a !== "string") return false;
  const s = a.trim();
  if (s[0] === "#" && s.length >= 7) { const n = parseInt(s.slice(1, 7), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return g >= r && g > b; }
  const m = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/i.exec(s);
  if (m) { const c = Number(m[2]), h = Number(m[3]); return c > 0.025 && h >= 95 && h <= 175; }
  return false;
}
export function softened(geometryFn) {
  return function geometry(ctx) {
    const tris = [], oTri = ctx.tri, oQuad = ctx.quad, oColor = ctx.color;
    let green = false, inQuad = false;
    const rec = (a, b, c) => tris.push({ v: [a, b, c], g: green });
    try {
      ctx.color = function (...args) { green = isGreen(args); return oColor.apply(ctx, args); };
      ctx.tri = function (...f) { if (!inQuad) rec([f[0], f[1], f[2]], [f[3], f[4], f[5]], [f[6], f[7], f[8]]); return oTri.apply(ctx, f); };
      ctx.quad = function (...f) {
        const a = [f[0], f[1], f[2]], b = [f[3], f[4], f[5]], c = [f[6], f[7], f[8]], d = [f[9], f[10], f[11]];
        rec(a, b, c); rec(a, c, d);
        inQuad = true; try { return oQuad.apply(ctx, f); } finally { inQuad = false; }
      };
      var out = geometryFn(ctx);
    } finally { ctx.tri = oTri; ctx.quad = oQuad; ctx.color = oColor; }
    if (out && out.normals) return out;
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], sum = [0, 0, 0], n = 0;
    for (const t of tris) if (t.g) for (const p of t.v) { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); sum[i] += p[i]; } n++; }
    const centre = n ? [sum[0] / n, Math.min(sum[1] / n, lo[1] + (hi[1] - lo[1]) * 0.4), sum[2] / n] : [0, 0, 0];
    const half = n ? [Math.max(0.05, (hi[0] - lo[0]) / 2), Math.max(0.05, (hi[1] - lo[1]) / 2), Math.max(0.05, (hi[2] - lo[2]) / 2)] : [1, 1, 1];
    const N = [];
    for (const t of tris) {
      const fn = norm(cross(sub(t.v[1], t.v[0]), sub(t.v[2], t.v[0])));
      if (!t.g || !n) { N.push(...fn, ...fn, ...fn); continue; }
      for (const p of t.v) {
        const r = norm([(p[0] - centre[0]) / half[0], (p[1] - centre[1]) / half[1], (p[2] - centre[2]) / half[2]]);
        N.push(...norm([r[0] * K.radial + fn[0] * (1 - K.radial), r[1] * K.radial + fn[1] * (1 - K.radial), r[2] * K.radial + fn[2] * (1 - K.radial)]));
      }
    }
    return { ...(out || {}), normals: N };
  };
}
