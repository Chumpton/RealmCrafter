// Stylized-ARPG tree kit (from @camptons_world/the-first-den, 2026-10-05): every face carries its own lighting normal,
// so canopies light as soft pillows (normals pushed out from each mass's centre) and trunks as round wood, while the mesh stays low-poly.
// Usage: const m = mesher(ctx); ... m.tri / m.tube / m.puff ...; return m.done();
// perf (2026-10-07, L4): same output bit for bit (tests/gen-hash): trig computed once per ring/row, normals once per
// vertex, hex stops parsed once, no argument spreads; every float is the same expression in the same order.
const TAU = Math.PI * 2;
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
const HEX = new Map(); // ramp's private parse cache: hex(h) is pure, ramp only reads the triple
const hexc = (h) => { let v = HEX.get(h); if (!v) { v = hex(h); HEX.set(h, v); } return v; };
export function ramp(stops, t) { // stops: hex[], t 0..1 → [r,g,b]
  t = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1); const i = Math.floor(t), f = t - i, a = hexc(stops[i]), b = hexc(stops[i + 1]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
export function mesher(ctx) {
  const N = [];
  const tri = (a, b, c, na, nb, nc) => {
    ctx.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    N.push(na[0], na[1], na[2], nb[0], nb[1], nb[2], nc[0], nc[1], nc[2]);
  };
  const quad = (a, b, c, d, na, nb, nc, nd) => { tri(a, b, c, na, nb, nc); tri(a, c, d, na, nc, nd); };
  const m = {
    tri, quad,
    // a bent tube through pts with radii; ring normals point out from the spine; flare = lobed root skirt on ring 0
    tube(pts, radii, n, phase = 0, flare = 0) {
      let prevRing = null, prevNs = null;
      const last = pts.length - 1;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], d = norm(sub(pts[Math.min(i + 1, last)], pts[Math.max(i - 1, 0)]));
        const u = norm(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])); const w = cross(d, u);
        const ring = new Array(n), ns = new Array(n), fl = i === 0 && flare, ri = radii[i], dy = fl ? 0.05 : 0;
        for (let j = 0; j < n; j++) {
          const a = j / n * TAU + phase, lobe = fl ? 1 + flare * Math.max(0, Math.sin(a * 5 + phase * 3)) ** 2 : 1;
          const ca = Math.cos(a), sa = Math.sin(a);
          const dir = [u[0] * ca + w[0] * sa, u[1] * ca + w[1] * sa, u[2] * ca + w[2] * sa];
          const r = ri * lobe;
          ring[j] = [p[0] + dir[0] * r, p[1] + dir[1] * r - dy, p[2] + dir[2] * r];
          ns[j] = fl ? norm([dir[0], 0.6, dir[2]]) : dir;
        }
        if (prevRing) for (let j = 0; j < n; j++) { const k = (j + 1) % n; quad(prevRing[k], prevRing[j], ring[j], ring[k], prevNs[k], prevNs[j], ns[j], ns[k]); }
        prevRing = ring; prevNs = ns;
      }
    },
    // a lumpy pillow: lat-long ball, normals from `pivot` (the mass's centre) so overlapping puffs light as one cloud
    puff(c, rx, ry, rz, seg, pivot, colorAt) {
      const lat = Math.max(3, Math.round(seg * 0.7)), P = new Array(lat + 1), Q = new Array(lat + 1);
      const c0 = c[0], c1 = c[1], c2 = c[2], p0 = pivot[0], p1 = pivot[1], p2 = pivot[2];
      const cosE = new Array(seg), sinE = new Array(seg), cosO = new Array(seg), sinO = new Array(seg), off = Math.PI / seg;
      for (let j = 0; j < seg; j++) { const te = j / seg * TAU + 0 * Math.PI / seg, to = j / seg * TAU + 1 * Math.PI / seg; cosE[j] = Math.cos(te); sinE[j] = Math.sin(te); cosO[j] = Math.cos(to); sinO[j] = Math.sin(to); }
      for (let i = 0; i <= lat; i++) {
        const row = new Array(seg), nrow = new Array(seg), phi = i / lat * Math.PI, sp = Math.sin(phi), cp = Math.cos(phi);
        const odd = i % 2, CO = odd ? cosO : cosE, SI = odd ? sinO : sinE, pole = i === 0 || i === lat, yk = i === lat ? 0.75 : 1;
        for (let j = 0; j < seg; j++) {
          const k = pole ? 1 : 0.9 + ctx.random() * 0.18;
          const v = [c0 + sp * CO[j] * rx * k, c1 + cp * ry * yk * k, c2 + sp * SI[j] * rz * k];
          row[j] = v;
          const dx = v[0] - p0, dy = v[1] - p1, dz = v[2] - p2, l = Math.hypot(dx, dy, dz) || 1;
          nrow[j] = [dx / l, dy / l, dz / l];
        }
        P[i] = row; Q[i] = nrow;
      }
      for (let i = 0; i < lat; i++) {
        const R0 = P[i], R1 = P[i + 1], N0 = Q[i], N1 = Q[i + 1];
        for (let j = 0; j < seg; j++) {
          const j1 = (j + 1) % seg, a = R0[j], b = R0[j1], cc = R1[j1], d = R1[j];
          const mid = [(a[0] + cc[0]) / 2, (a[1] + cc[1]) / 2, (a[2] + cc[2]) / 2];
          const mx = mid[0] - p0, my = mid[1] - p1, mz = mid[2] - p2, ml = Math.hypot(mx, my, mz) || 1;
          const col = colorAt(mid, [mx / ml, my / ml, mz / ml]);
          ctx.color(...col);
          quad(a, b, cc, d, N0[j], N0[j1], N1[j1], N1[j]);
        }
      }
    },
    done() { return { normals: N }; },
  };
  return m;
}
// a gently bent spine from base to top: a sin(t*pi) bow in a seeded direction, sampled in `steps`
export function spine(ctx, base, top, bend, steps) {
  const a = ctx.random() * TAU, bx = Math.cos(a) * bend, bz = Math.sin(a) * bend, pts = [];
  for (let i = 0; i <= steps; i++) { const t = i / steps, s = Math.sin(t * Math.PI); pts.push([base[0] + (top[0] - base[0]) * t + bx * s, base[1] + (top[1] - base[1]) * t, base[2] + (top[2] - base[2]) * t + bz * s]); }
  return pts;
}
