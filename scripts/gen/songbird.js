// A small songbird, ~0.2 m long before scale. Origin at the feet, beak toward -Z.
// params: body, wing, belly, head, beak (oklch strings). Bones: root, head, wingL, wingR, tail.
export function skeleton() {
  return {
    root: { pivot: [0, 0.1, 0] },
    head: { parent: "root", pivot: [0, 0.135, -0.05] },
    wingL: { parent: "root", pivot: [-0.034, 0.118, -0.005] },
    wingR: { parent: "root", pivot: [0.034, 0.118, -0.005] },
    tail: { parent: "root", pivot: [0, 0.102, 0.06] },
  };
}

function ellipsoid(ctx, c, r, segU = 10, segV = 8, squash) {
  const P = (i, j) => {
    const th = (Math.PI * i) / segV, ph = (2 * Math.PI * j) / segU;
    let x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
    if (squash) [x, y, z] = squash(x, y, z);
    return [c[0] + x * r[0], c[1] + y * r[1], c[2] + z * r[2]];
  };
  for (let i = 0; i < segV; i++) for (let j = 0; j < segU; j++) {
    const a = P(i, j), b = P(i + 1, j), cc = P(i + 1, j + 1), d = P(i, j + 1);
    ctx.quad(...a, ...d, ...cc, ...b);
  }
}
function sheet(ctx, pts, y0, t) { // a thin double-sided plate from an outline in xz at height y0
  const n = pts.length;
  for (let k = 1; k < n - 1; k++) {
    const a = pts[0], b = pts[k], c = pts[k + 1];
    ctx.tri(a[0], a[1] + y0 + t, a[2], b[0], b[1] + y0 + t, b[2], c[0], c[1] + y0 + t, c[2]);
    ctx.tri(a[0], a[1] + y0 + t, a[2], c[0], c[1] + y0 + t, c[2], b[0], b[1] + y0 + t, b[2]);
    ctx.tri(a[0], a[1] + y0 - t, a[2], c[0], c[1] + y0 - t, c[2], b[0], b[1] + y0 - t, b[2]);
    ctx.tri(a[0], a[1] + y0 - t, a[2], b[0], b[1] + y0 - t, b[2], c[0], c[1] + y0 - t, c[2]);
  }
}
function cone(ctx, base, tip, r, seg = 6) {
  for (let j = 0; j < seg; j++) {
    const a0 = (2 * Math.PI * j) / seg, a1 = (2 * Math.PI * (j + 1)) / seg;
    const p0 = [base[0] + Math.cos(a0) * r, base[1] + Math.sin(a0) * r * 0.8, base[2]];
    const p1 = [base[0] + Math.cos(a1) * r, base[1] + Math.sin(a1) * r * 0.8, base[2]];
    ctx.tri(...p0, ...tip, ...p1); ctx.tri(...p0, ...p1, ...tip);
  }
}
function stick(ctx, a, b, w) {
  const h = w / 2;
  for (const [dx, dz] of [[h, 0], [0, h]]) {
    ctx.quad(a[0] - dx, a[1], a[2] - dz, b[0] - dx, b[1], b[2] - dz, b[0] + dx, b[1], b[2] + dz, a[0] + dx, a[1], a[2] + dz);
    ctx.quad(a[0] + dx, a[1], a[2] + dz, b[0] + dx, b[1], b[2] + dz, b[0] - dx, b[1], b[2] - dz, a[0] - dx, a[1], a[2] - dz);
  }
}

export function geometry(ctx) {
  const p = ctx.params || {};
  const BODY = p.body || "oklch(0.6 0.2 25)", WING = p.wing || "oklch(0.25 0.03 260)", BELLY = p.belly || BODY;
  const HEAD = p.head || BODY, BEAK = p.beak || "oklch(0.75 0.13 75)";
  const low = (ctx.lod || 1) >= 3;
  ctx.smooth(); ctx.roughness(0.8);
  ctx.bone("root");
  ctx.color(BODY);
  ellipsoid(ctx, [0, 0.1, 0.005], [0.038, 0.04, 0.068], low ? 6 : 12, low ? 5 : 9);
  ctx.color(BELLY);
  ellipsoid(ctx, [0, 0.09, -0.014], [0.035, 0.033, 0.05], low ? 6 : 10, low ? 5 : 8);
  ctx.color("oklch(0.55 0.1 55)");
  ctx.flat();
  stick(ctx, [-0.014, 0.068, 0.004], [-0.014, 0.0, -0.002], 0.006);
  stick(ctx, [0.014, 0.068, 0.004], [0.014, 0.0, -0.002], 0.006);
  if (!low) for (const s of [-1, 1]) { // toes
    stick(ctx, [s * 0.014, 0.003, -0.002], [s * 0.014, 0.003, -0.022], 0.005);
    stick(ctx, [s * 0.014, 0.003, -0.002], [s * 0.014, 0.003, 0.014], 0.005);
  }
  ctx.smooth();
  ctx.bone("head");
  ctx.color(HEAD);
  ellipsoid(ctx, [0, 0.147, -0.056], [0.031, 0.031, 0.033], low ? 6 : 10, low ? 5 : 8);
  ctx.flat(); ctx.color(BEAK); ctx.roughness(0.5);
  cone(ctx, [0, 0.143, -0.084], [0, 0.139, -0.112], 0.011);
  ctx.smooth(); ctx.color("oklch(0.12 0.01 260)"); ctx.roughness(0.2);
  if (!low) for (const s of [-1, 1]) ellipsoid(ctx, [s * 0.025, 0.153, -0.068], [0.007, 0.008, 0.007], 6, 4);
  ctx.roughness(0.8); ctx.flat();
  ctx.bone("tail");
  ctx.color(WING);
  sheet(ctx, [[0, 0, 0.055], [-0.016, 0.004, 0.06], [-0.03, 0.016, 0.135], [0, 0.02, 0.125], [0.03, 0.016, 0.135], [0.016, 0.004, 0.06]], 0.1, 0.003);
  for (const [s, b] of [[-1, "wingL"], [1, "wingR"]]) {
    ctx.bone(b);
    ctx.color(WING);
    const o = [[s * 0.03, 0, -0.03], [s * 0.1, 0, -0.035], [s * 0.165, 0.004, -0.012], [s * 0.18, 0.006, 0.03], [s * 0.12, 0.002, 0.05], [s * 0.06, 0, 0.045], [s * 0.03, 0, 0.035]];
    sheet(ctx, s < 0 ? o : o.slice().reverse(), 0.118, 0.004);
    if (!low) { // a pale wing bar
      ctx.color(BELLY);
      sheet(ctx, [[s * 0.06, 0, -0.02], [s * 0.12, 0, -0.02], [s * 0.12, 0, -0.008], [s * 0.06, 0, -0.008]], 0.1236, 0.0008);
    }
  }
}
export function collider() { return null; }
