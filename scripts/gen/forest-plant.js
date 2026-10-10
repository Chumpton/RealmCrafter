import { cap } from "./valley-mesh.js";
import { mesher, ramp, spine } from "./tree-kit.js";
// The forest's plant kit (from @camptons_world/the-first-den, 2026-10-05), one script. Feet at the ground, +Y up.
// params: kind = giant | pine | broadleaf | sapling | shrub | fern | reed | log
//   broadleaf: height (16-32, default 26), radius (4.4-7, default 6), leaf ("spring" = lighter deciduous)
//   sapling: height (6-8) · shrub: height (1.1-1.3), berry (bool), berryColor · fern: size (frond length, 0.9)
//   reed: height (1.4) · log: length (6), radius (0.35). ctx.lod 3-4 drops sides, segments and bumps.
const TAU = Math.PI * 2;
// a lumpy low-poly ball, flat-shaded: a lat-long sphere with seeded radial noise
function blob(ctx, cx, cy, cz, rx, ry, rz, seg, colors) {
  const lat = Math.max(3, seg - 2), pts = [];
  for (let i = 0; i <= lat; i++) {
    const row = [], phi = i / lat * Math.PI;
    for (let j = 0; j < seg; j++) {
      const th = j / seg * TAU + (i % 2) * (Math.PI / seg), k = (i === 0 || i === lat) ? 1 : 0.82 + ctx.random() * 0.34;
      row.push([cx + Math.sin(phi) * Math.cos(th) * rx * k, cy + Math.cos(phi) * ry * (i === lat ? 0.7 : 1) * k, cz + Math.sin(phi) * Math.sin(th) * rz * k]);
    }
    pts.push(row);
  }
  for (let i = 0; i < lat; i++) {
    ctx.color(colors[Math.min(colors.length - 1, Math.floor((1 - i / lat) * colors.length * 0.999))]);
    for (let j = 0; j < seg; j++) { const a = pts[i][j], b = pts[i][(j + 1) % seg], c = pts[i + 1][(j + 1) % seg], d = pts[i + 1][j]; ctx.quad(...a, ...b, ...c, ...d); }
  }
}
function bark(ctx) { ctx.albedo("scripts/tex-valley-bark.js"); ctx.roughness(0.95); ctx.smooth(); }
const kinds = {
  broadleaf(ctx, lod) {
    // a bent trunk with a root flare forks into heavy limbs, each carrying one of 3-5 pillowy canopy masses;
    // windows of sky between the masses; deep shade green underneath to sunlit lime on top
    const h = Number(ctx.params.height ?? 26), r = Number(ctx.params.radius ?? 6), m = mesher(ctx);
    const spring = ctx.params.leaf === "spring";
    // autumn palettes (2026-10-06, the mountain in fall): shade to sunlit top
    const FALL = { orange: ["#9a4416", "#d86a24", "#f5933a", "#ffc766"], gold: ["#8a6414", "#cc9a20", "#f0c43e", "#ffe78a"], rust: ["#7c2a14", "#b84622", "#e2683a", "#f9a25e"], late: ["#56661e", "#86a02c", "#bccb46", "#eae87a"] }; // creator 2026-10-07: redridge-bright autumn
    const GRAD = FALL[ctx.params.leaf] ?? (spring ? ["#2f4a22", "#4d7a32", "#78a744", "#b4d36a"] : ["#1f3a24", "#34603a", "#5a8c45", "#9cc160"]);
    const n = lod >= 4 ? 5 : lod >= 3 ? 6 : 9, seg = lod >= 4 ? 6 : lod >= 3 ? 8 : 11, tr = h * 0.03;
    const fork = h * ((FALL[ctx.params.leaf] ? 0.28 : 0.42) + ctx.random() * 0.08); // fall crowns sit low, redridge-style
    bark(ctx); ctx.color(FALL[ctx.params.leaf] ? "#3e2f26" : spring ? "#8d7a63" : "#6e5a48");
    const trunk = spine(ctx, [0, 0, 0], [0, fork, 0], h * 0.04, lod >= 4 ? 2 : 5);
    m.tube(trunk, trunk.map((_, i) => tr * (1.5 - i / (trunk.length - 1) * 0.65)), n, ctx.random() * 6, lod >= 4 ? 0 : 0.9);
    const top = trunk[trunk.length - 1], masses = lod >= 4 ? 3 : 3 + Math.floor(ctx.random() * 3);
    const crownLo = fork + r * 0.1, crownHi = h;
    const centers = [];
    for (let i = 0; i < masses; i++) {
      const lead = i === 0, th = i / masses * Math.PI * 2 + ctx.random() * 0.9, d = lead ? r * 0.1 : r * (0.4 + ctx.random() * 0.22);
      const s = lead ? r * 0.66 : r * (0.48 + ctx.random() * 0.14);
      const y = lead ? h - s * 0.8 : fork + (h - fork) * (0.35 + ctx.random() * 0.3);
      centers.push({ c: [top[0] + Math.cos(th) * d, y, top[2] + Math.sin(th) * d], s });
    }
    if (lod < 4) for (const { c, s } of centers) { // heavy limb from the fork into the mass's heart
      const mid = [(top[0] + c[0]) * 0.5 + (ctx.random() - 0.5) * r * 0.2, top[1] + (c[1] - top[1]) * 0.45, (top[2] + c[2]) * 0.5];
      m.tube([top, mid, [c[0], c[1] - s * 0.2, c[2]]], [tr * 0.75, tr * 0.5, tr * 0.25], lod >= 3 ? 4 : 6);
    }
    ctx.albedo("scripts/tex-valley-canopy.js"); ctx.roughness(0.9);
    const col = (p, nn) => ramp(GRAD, ((p[1] - crownLo) / (crownHi - crownLo)) * 0.8 + nn[1] * 0.25 + 0.05);
    for (const { c, s } of centers) {
      const pivot = [c[0], c[1] - s * 0.25, c[2]];
      m.puff(c, s, s * 0.74, s, seg, pivot, col);
      const bumps = lod >= 4 ? 0 : lod >= 3 ? 2 : 4;
      for (let b = 0; b < bumps; b++) { const a = ctx.random() * Math.PI * 2, e = 0.3 + ctx.random() * 0.5, bs = s * (0.52 + ctx.random() * 0.16);
        m.puff([c[0] + Math.cos(a) * Math.cos(e) * s * 0.7, c[1] + Math.sin(e) * s * 0.45, c[2] + Math.sin(a) * Math.cos(e) * s * 0.7], bs, bs * 0.78, bs, Math.max(6, seg - 3), pivot, col); }
    }
    return m.done();
  },
  giant(ctx, lod) {
    // WoW-scale canopy tree (#forest pass 2026-10-08): a tall clear trunk on buttress roots, heavy arching limbs and one
    // broad flattened crown of overlapping pillows. Every canopy normal points out from ONE crown pivot, so the whole crown
    // lights as a single painterly dome; shade stops are lifted and cool (purple/moss bounce), never black. Hanging leaf
    // tongues soften the rim. params: height (28-36, default 30), radius (crown, 9-13, default 11), leaf (orange|gold|rust|late|green)
    const h = Number(ctx.params.height ?? 30), r = Number(ctx.params.radius ?? 11), m = mesher(ctx);
    const PAL = { orange: ["#7d4a52", "#c46a34", "#f0913c", "#ffcf78"], gold: ["#76664a", "#c49a30", "#f0c443", "#ffeb96"], rust: ["#74404c", "#b24c2c", "#e06b3e", "#f9aa68"], late: ["#56664c", "#82a032", "#bccb48", "#eeea84"], green: ["#3d5a50", "#4d7d44", "#78a84c", "#bcd874"] };
    const GRAD = PAL[ctx.params.leaf] ?? PAL.green;
    const far = lod >= 4, n = far ? 5 : lod >= 3 ? 7 : 10, seg = far ? 6 : lod >= 3 ? 8 : 11, tr = h * 0.038;
    const fork = h * (0.44 + ctx.random() * 0.08); // the canopy starts well over a rider's head
    bark(ctx); ctx.color("#a08a74"); ctx.emissive("oklch(0.16 0.025 300)"); // lifted bark: shade reads violet-brown, not black
    const trunk = spine(ctx, [0, 0, 0], [0, fork, 0], h * 0.035, far ? 2 : 6);
    m.tube(trunk, trunk.map((_, i) => tr * (1.55 - i / (trunk.length - 1) * 0.7)), n, ctx.random() * 6, far ? 0 : 1.1);
    if (!far) { ctx.color("#9aa078"); // buttress roots, mossy, diving into the soil
      const roots = lod >= 3 ? 4 : 6, ph = ctx.random() * TAU;
      for (let i = 0; i < roots; i++) { const a = ph + i / roots * TAU + (ctx.random() - 0.5) * 0.5, L = tr * (2.6 + ctx.random() * 1.6), ca = Math.cos(a), sa = Math.sin(a);
        m.tube([[ca * tr * 0.5, tr * 1.6, sa * tr * 0.5], [ca * tr * 1.3, tr * 0.7, sa * tr * 1.3], [ca * L * 0.7, tr * 0.15, sa * L * 0.7], [ca * L, -tr * 0.5, sa * L]], [tr * 0.55, tr * 0.42, tr * 0.24, tr * 0.08], lod >= 3 ? 4 : 6); }
    }
    ctx.color("#a08a74");
    const top = trunk[trunk.length - 1], CH = h - fork;
    const pivot = [top[0], fork + CH * 0.15, top[2]];
    const centers = [{ c: [top[0], h - r * 0.36, top[2]], s: r * 0.56 }];
    const ring = far ? 4 : 5 + Math.floor(ctx.random() * 3), ph2 = ctx.random() * TAU;
    for (let i = 0; i < ring; i++) { const th = ph2 + i / ring * TAU + (ctx.random() - 0.5) * 0.5, d = r * (0.56 + ctx.random() * 0.2);
      centers.push({ c: [top[0] + Math.cos(th) * d, fork + CH * (0.4 + ctx.random() * 0.22), top[2] + Math.sin(th) * d], s: r * (0.4 + ctx.random() * 0.1) }); }
    if (lod < 4) for (const { c, s } of centers.slice(1)) { // arching limbs: out, up, then under the pillow's heart
      const lo = [top[0] + (c[0] - top[0]) * 0.08, fork - CH * 0.05 - ctx.random() * h * 0.06, top[2] + (c[2] - top[2]) * 0.08];
      const mid = [top[0] + (c[0] - top[0]) * 0.55, (lo[1] + c[1]) * 0.5 + CH * 0.1, top[2] + (c[2] - top[2]) * 0.55];
      m.tube([lo, mid, [c[0], c[1] - s * 0.3, c[2]]], [tr * 0.62, tr * 0.36, tr * 0.14], lod >= 3 ? 4 : 6);
    }
    ctx.emissive(null); ctx.albedo("scripts/tex-valley-canopy.js"); ctx.roughness(0.92);
    const lo = fork, hi = h;
    const col = (p, nn) => ramp(GRAD, ((p[1] - lo) / (hi - lo)) * 0.62 + nn[1] * 0.3 + 0.12);
    for (const { c, s } of centers) {
      m.puff(c, s, s * 0.6, s, seg, pivot, col);
      const bumps = far ? 0 : lod >= 3 ? 2 : 4;
      for (let b = 0; b < bumps; b++) { const a = ctx.random() * TAU, e = 0.15 + ctx.random() * 0.6, bs = s * (0.5 + ctx.random() * 0.16);
        m.puff([c[0] + Math.cos(a) * Math.cos(e) * s * 0.72, c[1] + Math.sin(e) * s * 0.38, c[2] + Math.sin(a) * Math.cos(e) * s * 0.72], bs, bs * 0.66, bs, Math.max(6, seg - 3), pivot, col); }
    }
    if (lod < 3) for (const { c, s } of centers.slice(1)) { // hanging leaf tongues along the rim: a soft, ragged underside edge
      const k = 11, dir = Math.atan2(c[2] - top[2], c[0] - top[0]);
      for (let i = 0; i < k; i++) { const a = dir + (i / (k - 1) - 0.5) * 2.6 + (ctx.random() - 0.5) * 0.25, w = s * (0.1 + ctx.random() * 0.1), L = s * (0.1 + ctx.random() * 0.22), rr = s * (0.7 + ctx.random() * 0.16);
        const bx = c[0] + Math.cos(a) * rr, bz = c[2] + Math.sin(a) * rr, by = c[1] - s * (0.12 + ctx.random() * 0.12), tx = -Math.sin(a) * w, tz = Math.cos(a) * w;
        const tip = [bx + Math.cos(a) * L * 0.25, by - L, bz + Math.sin(a) * L * 0.25], A = [bx - tx, by, bz - tz], B = [bx + tx, by, bz + tz];
        const nn = (p) => { const d = [p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]], l = Math.hypot(...d) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
        ctx.color(...ramp(GRAD, 0.3 + ctx.random() * 0.15)); m.tri(A, tip, B, nn(A), nn(tip), nn(B)); }
    }
    return m.done();
  },
  pine(ctx, lod) {
    // painted WoW pine (2026-10-08, western forest): a tall clear trunk on a root flare, then 5-8 drooping tiers. Each tier is
    // a ragged star skirt whose tips hang below its collar; tiers shrink toward a leaning spire. Normals blend out from the
    // spine axis and up, so a tier lights as one soft volume (no hard facets). Shade is a lifted teal-moss, never black.
    const h = Number(ctx.params.height ?? 30), r = Number(ctx.params.radius ?? 6.5), m = mesher(ctx);
    const PAL = { pine: ["#173a36", "#22594a", "#2f7a52", "#6aa86a"], blue: ["#1f3a40", "#2f5a55", "#4f8270", "#9cc0a0"], fall: ["#2a3a2a", "#3f5a35", "#6b8a3f", "#b7b35a"] };
    const G = PAL[ctx.params.leaf] ?? PAL.pine;
    const clear = h * (0.2 + ctx.random() * 0.08), tr = h * 0.022, n = lod >= 4 ? 5 : lod >= 3 ? 6 : 8;
    bark(ctx); ctx.color("#5a4636");
    const tk = spine(ctx, [0, 0, 0], [0, h * 0.97, 0], h * 0.015, lod >= 4 ? 2 : 6);
    m.tube(tk, tk.map((_, i) => tr * (1.45 - i / (tk.length - 1) * 1.25)), n, ctx.random() * 6, lod >= 4 ? 0 : 1.1);
    const axis = (y) => { const t = Math.max(0, Math.min(1, y / (h * 0.97))) * (tk.length - 1), i = Math.min(tk.length - 2, Math.floor(t)), f = t - i, a = tk[i], b = tk[i + 1]; return [a[0] + (b[0] - a[0]) * f, y, a[2] + (b[2] - a[2]) * f]; };
    ctx.albedo("scripts/tex-valley-canopy.js"); ctx.roughness(0.9);
    const tiers = lod >= 4 ? 4 : lod >= 3 ? 5 : 6 + Math.floor(ctx.random() * 3), pts = lod >= 4 ? 6 : lod >= 3 ? 7 : 9;
    for (let k = 0; k < tiers; k++) {
      const u = k / (tiers - 1 || 1); // 0 = bottom tier
      const yTop = clear + (h - clear) * (0.18 + u * 0.8), rr = r * (1 - u * 0.78) * (0.9 + ctx.random() * 0.2);
      const drop = rr * (0.55 + ctx.random() * 0.15), yTip = yTop - drop - (h - clear) * 0.06;
      const c = axis(yTop), cb = axis(yTip + drop * 0.35), rot = ctx.random() * TAU;
      const collar = rr * 0.18, ring = [], tips = [];
      for (let j = 0; j < pts * 2; j++) {
        const th = rot + j / (pts * 2) * TAU, tip = j % 2 === 0, d = tip ? rr * (0.88 + ctx.random() * 0.24) : rr * (0.5 + ctx.random() * 0.12);
        const y = tip ? yTip + (ctx.random() - 0.5) * drop * 0.25 : yTip + drop * 0.42;
        tips.push([c[0] + Math.cos(th) * d, y, c[2] + Math.sin(th) * d]);
        ring.push([c[0] + Math.cos(th) * collar, yTop - drop * 0.08, c[2] + Math.sin(th) * collar]);
      }
      const nrm = (p) => { const dx = p[0] - c[0], dz = p[2] - c[2], l = Math.hypot(dx, dz) || 1; const v = [dx / l * 0.75, 0.66, dz / l * 0.75], L = Math.hypot(v[0], v[1], v[2]); return [v[0] / L, v[1] / L, v[2] / L]; };
      const shadeT = (p, up) => Math.min(1, 0.12 + u * 0.5 + (p[1] - yTip) / (drop + 0.01) * 0.3 + up);
      const apex = [c[0], yTop + rr * 0.12, c[2]], na = [0, 1, 0];
      for (let j = 0; j < tips.length; j++) {
        const j1 = (j + 1) % tips.length, a = ring[j], b = ring[j1], t0 = tips[j], t1 = tips[j1];
        ctx.color(...ramp(G, shadeT(t0, 0.18)));
        m.quad(a, t0, t1, b, nrm(a), nrm(t0), nrm(t1), nrm(b));
        ctx.color(...ramp(G, shadeT(apex, 0.3)));
        m.tri(apex, a, b, na, nrm(a), nrm(b));
        if (lod < 3) { // underside: a darker lifted skirt so tiers read from below without going black
          const under = [cb[0], yTip + drop * 0.5, cb[2]], nu = [0, -0.4, 0];
          ctx.color(...ramp(G, 0.08)); m.tri(under, t1, t0, nu, nrm(t1), nrm(t0));
        }
      }
    }
    // the spire
    const sp = axis(h * 0.94), sh = h * 0.1, sr = r * 0.12;
    ctx.color(...ramp(G, 0.85));
    for (let j = 0; j < 5; j++) { const a0 = j / 5 * TAU, a1 = (j + 1) / 5 * TAU;
      m.tri([sp[0], h * 1.03, sp[2]], [sp[0] + Math.cos(a1) * sr, sp[1] - sh * 0.3, sp[2] + Math.sin(a1) * sr], [sp[0] + Math.cos(a0) * sr, sp[1] - sh * 0.3, sp[2] + Math.sin(a0) * sr], [0, 1, 0], [Math.cos(a1), 0.5, Math.sin(a1)], [Math.cos(a0), 0.5, Math.sin(a0)]); }
    return m.done();
  },
  sapling(ctx, lod) {
    const h = Number(ctx.params.height ?? 6), seg = lod >= 3 ? 6 : 9, m = mesher(ctx);
    bark(ctx); ctx.color("#7a6450");
    const tk = spine(ctx, [0, 0, 0], [0.1, h * 0.7, 0], h * 0.03, 3);
    m.tube(tk, tk.map((_, i) => 0.08 - i * 0.015), 5, 0, 0.6);
    ctx.albedo("scripts/tex-valley-canopy.js");
    const G = ["#24422a", "#3d6a3c", "#64944a", "#a2c564"], c = lod >= 4 ? 1 : 3;
    const piv = [0.1, h * 0.68, 0], col = (p, nn) => ramp(G, (p[1] - h * 0.45) / (h * 0.5) * 0.7 + nn[1] * 0.25 + 0.05);
    for (let i = 0; i < c; i++) { const th = i / c * TAU + ctx.random(), d = i ? h * 0.1 : 0, y = h * (0.66 + (i ? ctx.random() * 0.12 : 0.12)), s = h * (0.17 + ctx.random() * 0.05);
      m.puff([0.1 + Math.cos(th) * d, y, Math.sin(th) * d], s, s * 0.8, s, seg, piv, col); }
    return m.done();
  },
  shrub(ctx, lod) {
    const h = Number(ctx.params.height ?? 1.3), seg = lod >= 3 ? 6 : 9, c = lod >= 3 ? 2 : 4, m = mesher(ctx);
    ctx.albedo("scripts/tex-valley-canopy.js"); ctx.roughness(0.95);
    const G = ctx.params.berry ? ["#1d3622", "#2f5530", "#4b7a3c", "#79a04f"] : ["#21402a", "#36643a", "#5c8f48", "#98bf5e"];
    const piv = [0, h * 0.25, 0], col = (p, nn) => ramp(G, p[1] / h * 0.6 + nn[1] * 0.3 + 0.1);
    for (let i = 0; i < c; i++) { const th = i / c * TAU + ctx.random(), d = i ? h * 0.32 : 0, s = h * (0.42 + ctx.random() * 0.14);
      m.puff([Math.cos(th) * d, s * 0.68, Math.sin(th) * d], s, s * 0.8, s, seg, piv, col); }
    if (ctx.params.berry && lod < 3) { const bc = ctx.params.berryColor || "#c02a3e"; ctx.albedo(null); ctx.color(bc);
      for (let i = 0; i < 12; i++) { const th = ctx.random() * TAU, e = ctx.random() * 1.2, R = h * 0.6; const x = Math.cos(th) * Math.cos(e) * R, y = h * 0.4 + Math.sin(e) * R * 0.7, z = Math.sin(th) * Math.cos(e) * R;
        m.puff([x, y, z], 0.04, 0.04, 0.04, 4, [x, y, z], () => [0.75, 0.16, 0.24]); } }
    return m.done();
  },
  fern(ctx, lod) {
    const L0 = Number(ctx.params.size ?? 0.9), fronds = lod >= 3 ? 5 : 10, segs = lod >= 3 ? 3 : 6;
    ctx.flat(); ctx.roughness(0.9); ctx.albedo(null);
    for (let f = 0; f < fronds; f++) {
      const a = f / fronds * TAU + ctx.random() * 0.4, L = L0 * (0.75 + ctx.random() * 0.4), side = [-Math.sin(a), 0, Math.cos(a)];
      let p = [0, 0.02, 0];
      for (let s = 1; s <= segs; s++) {
        const k = s / segs, q = [Math.cos(a) * L * k, 0.02 + Math.sin(k * 2.3) * 0.6 * L, Math.sin(a) * L * k], lw = 0.2 * L0 * (1 - k * 0.75);
        ctx.color(s % 2 ? "#4a8a3a" : "#5c9c43");
        ctx.quad(...p, p[0] + side[0] * lw, p[1] - 0.02, p[2] + side[2] * lw, q[0] + side[0] * lw * 0.6, q[1] - 0.03, q[2] + side[2] * lw * 0.6, ...q);
        ctx.color(s % 2 ? "#3f7a33" : "#548f3e");
        ctx.quad(...p, ...q, q[0] - side[0] * lw * 0.6, q[1] - 0.03, q[2] - side[2] * lw * 0.6, p[0] - side[0] * lw, p[1] - 0.02, p[2] - side[2] * lw);
        p = q;
      }
    }
  },
  reed(ctx, lod) {
    const h = Number(ctx.params.height ?? 1.4), c = lod >= 3 ? 6 : 14;
    ctx.flat(); ctx.roughness(0.9); ctx.albedo(null);
    for (let i = 0; i < c; i++) {
      const th = ctx.random() * TAU, d = ctx.random() * 0.25, x = Math.cos(th) * d, z = Math.sin(th) * d, hh = h * (0.6 + ctx.random() * 0.5), lx = Math.cos(th) * hh * 0.15, lz = Math.sin(th) * hh * 0.15, w = 0.02;
      ctx.color(i % 3 ? "#6f9a48" : "#8aa856");
      ctx.quad(x - w, 0, z, x + w, 0, z, x + lx + w * 0.2, hh, z + lz, x + lx - w * 0.2, hh, z + lz);
      if (i % 4 === 0) { const t = [x + lx * 0.85, hh * 0.82, z + lz * 0.85]; blob(ctx, t[0], t[1], t[2], 0.03, 0.09, 0.03, 4, ["#6b4a2e"]); }
    }
  },
  log(ctx, lod) {
    const L = Number(ctx.params.length ?? 6), r = Number(ctx.params.radius ?? 0.35), n = lod >= 3 ? 6 : 9;
    bark(ctx); ctx.color("#7d6d5b");
    const rings = []; for (let i = 0; i <= 4; i++) { const x = -L / 2 + L * i / 4, rr = r * (1 - i * 0.06); const p = []; for (let j = 0; j < n; j++) { const a = j / n * TAU; p.push([x, r + Math.sin(a) * rr, Math.cos(a) * rr]); } rings.push(p); }
    for (let i = 0; i < 4; i++) for (let j = 0; j < n; j++) { const jj = (j + 1) % n; ctx.quad(...rings[i][j], ...rings[i + 1][j], ...rings[i + 1][jj], ...rings[i][jj]); }
    ctx.albedo(null); ctx.color("#c8a77a"); ctx.flat(); cap(ctx, rings[0], false); cap(ctx, rings[4], true);
    ctx.color("#5f8a3a"); ctx.roughness(1);
    if (lod < 3) for (let i = 0; i < 5; i++) { const x = -L / 2 + L * (0.1 + ctx.random() * 0.8); blob(ctx, x, r * 1.85, (ctx.random() - 0.5) * r * 0.6, r * 0.5, r * 0.18, r * 0.4, 5, ["#4f7d33", "#6a9a42"]); }
  },
};
export function geometry(ctx) {
  const lod = Number(ctx.lod ?? 1);
  return (kinds[ctx.params.kind] || kinds.shrub)(ctx, lod);
}
export function collider(ctx) {
  const k = ctx.params.kind;
  if (k === "giant") { const h = Number(ctx.params.height ?? 30); return { kind: "box", width: h * 0.075, height: h * 0.44, depth: h * 0.075 }; }
  if (k === "pine") { const h = Number(ctx.params.height ?? 30); return { kind: "box", width: h * 0.045, height: h * 0.4, depth: h * 0.045 }; }
  if (k === "broadleaf") { const h = Number(ctx.params.height ?? 26); return { kind: "box", width: h * 0.06, height: h * 0.5, depth: h * 0.06 }; }
  if (k === "log") { const L = Number(ctx.params.length ?? 6), r = Number(ctx.params.radius ?? 0.35); return { kind: "box", width: L, height: r * 2, depth: r * 2 }; }
  return null;
}
