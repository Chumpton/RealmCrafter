// D20: a thin skin of ice along the lake edge. params: pts [[x,z]] = the measured waterline (world, lake to −Z),
// w = how far it reaches out over the water (m), t = thickness (m), y = its top, land = how far it tucks under the sand.
// Origin = world origin (the snow-melt root stands at 0,0,0). collider = the top sheet (the row's physics toggles it).
const hash = (x) => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function strip(p) {
  const { pts = [], w = 2, t = 0.04, y = 0.025, land = 1.5 } = p, out = [];
  if (pts.length < 2 || w <= 0) return out;
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) for (let s = 0; s < 2; s++) {
    const f = s / 2; dense.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]);
  }
  dense.push(pts[pts.length - 1]);
  const N = dense.length;
  dense.forEach((q, i) => {
    const a = dense[Math.max(0, i - 1)], b = dense[Math.min(N - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const nx = -tz, nz = tx; // landward (+Z side)
    const taper = Math.min(1, i / 4, (N - 1 - i) / 4);
    const e = w * (0.6 + 0.3 * Math.sin(q[0] * 0.21 + 0.8) + 0.25 * hash(q[0])) * (0.25 + 0.75 * taper);
    out.push({ i: [q[0] + nx * land, y, q[1] + nz * land], o: [q[0] - nx * e, y, q[1] - nz * e], ob: [q[0] - nx * e, y - t, q[1] - nz * e] });
  });
  return out;
}
function quadUp(c, a, b, d, e) { // wound so the face looks up (+Y)
  const ny = (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]);
  if (ny >= 0) c.quad(...a, ...b, ...d, ...e); else c.quad(...e, ...d, ...b, ...a);
}
export function geometry(c) {
  const S = strip(c.params), lod = c.lod || 1; if (S.length < 2) return;
  const k = lod >= 4 ? 2 : 1;
  c.flat(); c.roughness(0.07); c.metalness(0);
  c.albedo('cdn/texture-thin-clear-lake-ice-with-fine-white-cracks.png');
  c.color('oklch(0.94 0.025 215)', 0.62);
  for (let j = 0; j + k < S.length; j += k) quadUp(c, S[j].i, S[j + k].i, S[j + k].o, S[j].o);
  if (lod <= 3) { // the broken outer rim shows the thickness
    c.albedo(null); c.color('oklch(0.97 0.02 210)', 0.85);
    for (let j = 0; j + k < S.length; j += k) c.quad(...S[j].o, ...S[j + k].o, ...S[j + k].ob, ...S[j].ob);
  }
}
export function collider(c) {
  const S = strip(c.params); if (S.length < 2) return null;
  for (let j = 0; j + 2 < S.length; j += 2) quadUp(c, S[j].i, S[j + 2].i, S[j + 2].o, S[j].o);
}
