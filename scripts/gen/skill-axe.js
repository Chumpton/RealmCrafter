// SKILLS-WC S5: the held axe. params { color: head hex (AXES), metal: axe id }.
// Hand-grip space: origin where the fist closes, haft along +Y (0.7 m, 1/4 below the grip),
// the bearded head at the top, its edge facing -Z. Dragon: gold collar. ~200 tris.
const H0 = -0.175, H1 = 0.525; // haft ends
function hex(h) { const n = parseInt(String(h || "#888888").slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function css([r, g, b]) { return `rgb(${r | 0},${g | 0},${b | 0})`; }
function mix(c, t, k) { return c.map((v, i) => v + (t[i] - v) * k); }
function Q(ctx, a, b, c, d) { ctx.quad(...a, ...b, ...c, ...d); }
// a tapered n-gon tube along Y from (y0,r0) to (y1,r1), optional caps
function tube(ctx, n, y0, r0, y1, r1, cap0, cap1) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.2832, b = ((i + 1) / n) * 6.2832;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    Q(ctx, [ca * r0, y0, sa * r0], [ca * r1, y1, sa * r1], [cb * r1, y1, sb * r1], [cb * r0, y0, sb * r0]);
    if (cap1) ctx.tri(0, y1, 0, cb * r1, y1, sb * r1, ca * r1, y1, sa * r1);
    if (cap0) ctx.tri(0, y0, 0, ca * r0, y0, sa * r0, cb * r0, y0, sb * r0);
  }
}
export function geometry(ctx) {
  const { color = "#8a8784", metal = "" } = ctx.params;
  const lod = ctx.lod ?? 1, n = lod >= 3 ? 5 : 7, dragon = metal === "axe-dragon";
  const base = hex(color), lum = (base[0] + base[1] + base[2]) / 3;
  ctx.flat();
  // haft: ash, slight swell toward the butt, flared knob
  ctx.color("#ba8950"); ctx.roughness(0.85); ctx.metalness(0);
  tube(ctx, n, H0 + 0.03, 0.017, 0.12, 0.016, false, false);
  tube(ctx, n, 0.12, 0.016, H1, 0.0145, false, true);
  tube(ctx, n, H0, 0.024, H0 + 0.03, 0.017, true, false);
  // leather wrap at the grip, two raised turns
  ctx.color("#4f3828"); ctx.roughness(0.95);
  tube(ctx, n, -0.09, 0.0195, 0.11, 0.0195, true, true);
  if (lod <= 2) { tube(ctx, n, -0.02, 0.0215, 0.0, 0.0215, true, true); tube(ctx, n, 0.05, 0.0215, 0.07, 0.0215, true, true); }
  // collar under the head: gold on the dragon axe, dark iron on the rest
  ctx.color(dragon ? "#d9a63a" : "#343c43"); ctx.metalness(dragon ? 0.9 : 0.6); ctx.roughness(dragon ? 0.35 : 0.6);
  tube(ctx, n, 0.405, 0.021, 0.435, 0.021, true, true);
  // head: stations (z, top y, bottom y, half thickness) from the poll forward to the bevel
  const S = [
    [0.032, 0.512, 0.448, 0.015], [0.022, 0.522, 0.438, 0.022], [-0.022, 0.522, 0.438, 0.022],
    [-0.042, 0.508, 0.446, 0.011], [-0.08, 0.514, 0.418, 0.008], [-0.11, 0.53, 0.378, 0.0065], [-0.138, 0.552, 0.338, 0.005],
  ];
  ctx.color(css(base)); ctx.metalness(lum < 70 ? 0.5 : 0.75); ctx.roughness(0.42);
  for (let i = 0; i < S.length - 1; i++) {
    const [za, ta, ba, ha] = S[i], [zb, tb, bb, hb] = S[i + 1];
    Q(ctx, [ha, ba, za], [hb, bb, zb], [hb, tb, zb], [ha, ta, za]);      // +X face
    Q(ctx, [-ha, ta, za], [-hb, tb, zb], [-hb, bb, zb], [-ha, ba, za]);  // -X face
    Q(ctx, [ha, ta, za], [hb, tb, zb], [-hb, tb, zb], [-ha, ta, za]);    // top
    Q(ctx, [-ha, ba, za], [-hb, bb, zb], [hb, bb, zb], [ha, ba, za]);    // underside / beard
  }
  { const [z, t, b, h] = S[0]; Q(ctx, [-h, b, z], [h, b, z], [h, t, z], [-h, t, z]); } // poll
  // the bevelled edge: brighter, a convex arc from toe to beard heel, sharp
  const edge = mix(base, [255, 250, 240], lum < 70 ? 0.55 : 0.45);
  ctx.color(css(edge)); ctx.metalness(0.85); ctx.roughness(0.25);
  const [zl, tl, bl, hl] = S[S.length - 1], K = lod >= 3 ? 3 : 6;
  const inner = (k) => [zl, bl + (tl - bl) * (k / K)];
  const outer = (k) => { const u = k / K, y = bl - 0.012 + (tl - bl + 0.026) * u; return [zl - 0.016 - 0.014 * Math.sin(u * Math.PI), y]; };
  for (let k = 0; k < K; k++) {
    const [z0, y0] = inner(k), [z1, y1] = inner(k + 1), [e0z, e0y] = outer(k), [e1z, e1y] = outer(k + 1);
    Q(ctx, [hl, y0, z0], [hl, y1, z1], [0, e1y, e1z], [0, e0y, e0z]);
    Q(ctx, [-hl, y1, z1], [-hl, y0, z0], [0, e0y, e0z], [0, e1y, e1z]);
  }
  { const [z, y] = inner(K), [ez, ey] = outer(K); Q(ctx, [hl, y, z], [-hl, y, z], [0, ey, ez], [0, ey, ez]); }
  { const [z, y] = inner(0), [ez, ey] = outer(0); Q(ctx, [-hl, y, z], [hl, y, z], [0, ey, ez], [0, ey, ez]); }
  // dragon: gold inlay band across the cheek
  if (dragon && lod <= 2) {
    ctx.color("#d9a63a"); ctx.metalness(0.9); ctx.roughness(0.35);
    for (const s of [1, -1]) { const x = s * 0.0115; Q(ctx, [x, 0.45, -0.044], [x, 0.43, -0.075], [x, 0.5, -0.078], [x, 0.505, -0.046].map((v, i) => v)); }
  }
}
export function collider() { return null; }
