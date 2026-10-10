// HUGINN-SWEEP S2 (docs/board/proposals/HUGINN-SWEEP.md): the sweep's math. Pure: no ctx, no engine imports, only the data file.
// FLY.sweep false pins everything to today's flight: tier 0, FLY.fogReveal, HUG.speed, the wind untouched.
import { HUG, FLY, SWEEP } from './data/huginn.js';

const top = (a, t) => a[Math.max(0, Math.min(a.length - 1, t | 0))];

// fill % (0..100) → tier 0..6: one tier per threshold reached (49.9 → 0, 50 → 1, 100 → 6)
export function tierOf(pct) {
  if (!FLY.sweep || !(pct >= 0)) return 0;
  let t = 0; for (const at of SWEEP.tiers) if (pct >= at) t++;
  return t;
}
// m/s: HUG.speed × (1 + speedStep × tier), capped at tier 5 (tier 6 = sweep done, same 18 m/s)
export function speedOf(tier) {
  const t = FLY.sweep ? Math.max(0, Math.min(5, tier | 0)) : 0;
  return Math.round(HUG.speed * (1 + SWEEP.speedStep * t) * 100) / 100;
}
// m of fog revealed round him: 12 → 27 across tiers (tier 6 keeps 27)
export function revealOf(tier) { return FLY.sweep ? top(SWEEP.reveal, tier) : FLY.fogReveal; }
// float/sunk raycast checks per cell: 6 → 10 (sweep off: Infinity, today's scan has no per-cell cap)
export function checksOf(tier) { return FLY.sweep ? top(SWEEP.checks, tier) : Infinity; }
// the wind (and weather) factor, 0..1: multiply FLY.windPush by it. 1 − 0.18 × tier, never below 0
export function windOf(tier) { return FLY.sweep ? Math.max(0, 1 - SWEEP.windDrop * Math.max(0, tier | 0)) : 1; }

// the in-circle cells of the (2r+1)² block round (gx, gz), as cell names 'x3z-2': centre first, then ring 1, ring 2…, each ring clockwise from north
export function ringOf(gx, gz, r) {
  const out = [], R = Math.max(0, r | 0);
  for (let k = 0; k <= R; k++) {
    const ring = [];
    for (let b = -k; b <= k; b++) for (let a = -k; a <= k; a++) if (Math.max(Math.abs(a), Math.abs(b)) === k) ring.push([a, b]);
    ring.sort((p, q) => ((Math.atan2(p[0], -p[1]) + 2 * Math.PI) % (2 * Math.PI)) - ((Math.atan2(q[0], -q[1]) + 2 * Math.PI) % (2 * Math.PI)));
    for (const [a, b] of ring) { const x = gx + a, z = gz + b; if (Math.hypot(x * HUG.cell, z * HUG.cell) <= HUG.radius) out.push(`x${x}z${z}`); }
  }
  return out;
}

// the room clock's day index (ctx.now() is the room clock, not wall time): Math.floor(ms / 86400000)
export function dayOf(ms) { return Math.floor((Number(ms) || 0) / 86400000); }

// fogBits: Uint8Array, bit k = j·n + i set = seen; n tiles a side of `tile` m; origin {x, z} = the grid's min corner; from {x, z} = where he is.
// Dark in-circle tiles are grouped 4-connected; each cluster scores size ÷ distance (distance floored at one tile).
// → { x, z, size, dist, score, top } for the best cluster (x, z = the centre of its dark tile nearest its centroid, so the target is
//   always dark; the EDGE: the cluster's dark tile nearest `from`), top = the best 3 as { x, z, size, dist, score }; null when nothing in the circle is dark.
// HUGINN-OUTER S2: mask (i, j) => bool replaces the home-circle test when given (the outer ring passes its own); no mask = today exactly.
export function frontier(fogBits, n, tile, origin, from, mask) {
  const N = n * n, seen = new Uint8Array(N), cx = HUG.center.x, cz = HUG.center.z, R = HUG.radius;
  const dark = (k) => !(fogBits[k >> 3] >> (k & 7) & 1);
  const inC = typeof mask === 'function' ? mask : (i, j) => Math.hypot(origin.x + (i + 0.5) * tile - cx, origin.z + (j + 0.5) * tile - cz) <= R;
  const cl = [], stack = [];
  for (let k0 = 0; k0 < N; k0++) {
    if (seen[k0]) continue; seen[k0] = 1;
    const i0 = k0 % n, j0 = (k0 / n) | 0; if (!dark(k0) || !inC(i0, j0)) continue;
    const ks = []; stack.push(k0); let si = 0, sj = 0;
    while (stack.length) {
      const k = stack.pop(), i = k % n, j = (k / n) | 0; ks.push(k); si += i; sj += j;
      const nb = [i > 0 ? k - 1 : -1, i < n - 1 ? k + 1 : -1, j > 0 ? k - n : -1, j < n - 1 ? k + n : -1];
      for (const q of nb) { if (q < 0 || seen[q]) continue; const qi = q % n, qj = (q / n) | 0; if (dark(q) && inC(qi, qj)) { seen[q] = 1; stack.push(q); } }
    }
    let bk = ks[0], bd = 1e18; // EDGE variant (replay decision): the cluster's dark tile nearest him
    for (const k of ks) { const d = (origin.x + (k % n + 0.5) * tile - from.x) ** 2 + (origin.z + (((k / n) | 0) + 0.5) * tile - from.z) ** 2; if (d < bd) { bd = d; bk = k; } }
    const x = origin.x + (bk % n + 0.5) * tile, z = origin.z + (((bk / n) | 0) + 0.5) * tile;
    const dist = Math.hypot(x - from.x, z - from.z), score = ks.length / Math.max(tile, dist);
    cl.push({ x, z, size: ks.length, dist: Math.round(dist * 10) / 10, score });
  }
  if (!cl.length) return null;
  cl.sort((a, b) => b.score - a.score);
  return { ...cl[0], top: cl.slice(0, 3) };
}

// HUGINN-OUTER S2: the 50 m cells with rMin < dist <= rMax from center, lawnmower order (alternate rows reversed), named like the home cells
export function ringCells(rMin, rMax, cell, center) {
  const n = Math.ceil(rMax / cell), out = [];
  for (let gz = -n; gz <= n; gz++) {
    const row = [];
    for (let gx = -n; gx <= n; gx++) { const d = Math.hypot(gx * cell, gz * cell); if (d > rMin && d <= rMax) row.push({ gx, gz, x: center.x + gx * cell, z: center.z + gz * cell, name: `x${gx}z${gz}` }); }
    if ((gz + n) % 2) row.reverse();
    out.push(...row);
  }
  return out;
}

// ── HUGINN-MOPUP S2 (docs/board/proposals/HUGINN-MOPUP.md): the last specks, one route through them ──
// every 4-connected dark cluster in the mask (or home circle) → { x, z, size }, x/z = the centre of its dark tile nearest the centroid (always dark)
export function specks(fogBits, n, tile, origin, mask) {
  const N = n * n, seen = new Uint8Array(N), cx = HUG.center.x, cz = HUG.center.z, R = HUG.radius;
  const dark = (k) => !(fogBits[k >> 3] >> (k & 7) & 1);
  const inC = typeof mask === 'function' ? mask : (i, j) => Math.hypot(origin.x + (i + 0.5) * tile - cx, origin.z + (j + 0.5) * tile - cz) <= R;
  const out = [], stack = [];
  for (let k0 = 0; k0 < N; k0++) {
    if (seen[k0]) continue; seen[k0] = 1;
    if (!dark(k0) || !inC(k0 % n, (k0 / n) | 0)) continue;
    const ks = []; stack.push(k0); let si = 0, sj = 0;
    while (stack.length) {
      const k = stack.pop(), i = k % n, j = (k / n) | 0; ks.push(k); si += i; sj += j;
      const nb = [i > 0 ? k - 1 : -1, i < n - 1 ? k + 1 : -1, j > 0 ? k - n : -1, j < n - 1 ? k + n : -1];
      for (const q of nb) { if (q < 0 || seen[q]) continue; if (dark(q) && inC(q % n, (q / n) | 0)) { seen[q] = 1; stack.push(q); } }
    }
    const mi = si / ks.length, mj = sj / ks.length; let bk = ks[0], bd = 1e18;
    for (const k of ks) { const d = (k % n - mi) ** 2 + (((k / n) | 0) - mj) ** 2; if (d < bd) { bd = d; bk = k; } }
    out.push({ x: origin.x + (bk % n + 0.5) * tile, z: origin.z + (((bk / n) | 0) + 0.5) * tile, size: ks.length });
  }
  return out;
}
// nearest-first from `from`, then 2-opt (open path, start fixed at `from`) → the same points, reordered. Never drops one.
export function route(points, from) {
  const left = points.slice(), o = []; let cur = from;
  while (left.length) { let bi = 0, bd = 1e18; for (let i = 0; i < left.length; i++) { const d = (cur.x - left[i].x) ** 2 + (cur.z - left[i].z) ** 2; if (d < bd) { bd = d; bi = i; } } cur = left.splice(bi, 1)[0]; o.push(cur); }
  const D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), P = [from, ...o];
  let imp = true, it = 0;
  while (imp && it++ < 40) { imp = false;
    for (let i = 0; i < P.length - 2; i++) for (let k = i + 2; k < P.length; k++) {
      const a = P[i], b = P[i + 1], c = P[k], d = P[k + 1];
      const before = D(a, b) + (d ? D(c, d) : 0), after = D(a, c) + (d ? D(b, d) : 0);
      if (after + 1e-6 < before) { const seg = P.slice(i + 1, k + 1).reverse(); P.splice(i + 1, k - i, ...seg); imp = true; }
    } }
  return P.slice(1);
}
export function routeLen(pts, from) { let L = 0, c = from; for (const p of pts) { L += Math.hypot(p.x - c.x, p.z - c.z); c = p; } return L; }
// rotate a route to start at the speck nearest the middle of compass `side` (N = -Z, E = +X), flown cw or ccw (seen from above) round the hall
const SIDE = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
export function steer(pts, side, dir, center = HUG.center) {
  if (!(side in SIDE) || (dir !== 'cw' && dir !== 'ccw') || !pts.length) return null;
  const brg = (p) => (Math.atan2(p.x - center.x, -(p.z - center.z)) * 180 / Math.PI + 360) % 360; // compass bearing, 0 = N, 90 = E
  const want = SIDE[side], off = (p) => { const d = Math.abs(brg(p) - want) % 360; return d > 180 ? 360 - d : d; };
  let s0 = 0, bo = 1e9; for (let i = 0; i < pts.length; i++) { const o = off(pts[i]); if (o < bo) { bo = o; s0 = i; } }
  const start = pts[s0], rest = pts.filter((_, i) => i !== s0);
  if (!rest.length) return [start];
  // the first hop leans the way JEV said: of the 3 nearest, the one whose bearing turns most in `dir`
  const near = rest.map((q) => [q, Math.hypot(q.x - start.x, q.z - start.z)]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([q]) => q);
  const turn = (q) => { const d = ((brg(q) - brg(start)) + 540) % 360 - 180; return dir === 'cw' ? d : -d; };
  const hop = near.sort((a, b) => turn(b) - turn(a))[0];
  return [start, hop, ...route(rest.filter((q) => q !== hop), hop)]; // shortest from there (nearest-first + 2-opt)
}
// the mop's next target: skips points already lit. → { k, pt } or null when the route is done
export function mopNext(mop, darkAtFn) {
  let k = mop.k | 0; while (k < mop.pts.length && !darkAtFn(mop.pts[k][0], mop.pts[k][1])) k++;
  return k < mop.pts.length ? { k, pt: mop.pts[k] } : null;
}
