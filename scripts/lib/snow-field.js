// Snow depth per cell (lane W3). Signatures fixed: W4 drifts, W5 shovel, W6 melt, W8 crunch import these.
// Storage: two place fields on the engine grid (0.25 m cells, 64-cell chunks, raw int16 x 0.01):
//   snow:depth = OFFSET in metres from the place mean (place.state.snow.depth, W1's), so the storm's fall and melt move
//                every cell together and a dab only carves or banks the difference.
//   snow:pack  = 0..1, how trodden the cell is (a footprint sinks by depth*(1-pack)*SNOW.foot.sink).
// dab() only QUEUES; the queue is spent at SNOW.budget.dabsPerSec, applied per flush into each touched chunk once
// (one chunk write per chunk per flush, at most SNOW.w3.chunksPerFlush). Snow off: depthAt/packAt return 0 at the top,
// dab drops, nothing is read or written. Inside the hall: never any snow, never a write. Outside the zone: the mean.
import { SNOW } from './data/snow.js';
const W = SNOW.w3;
export function inZone(x, z) { const Z = SNOW.zone; return Math.abs(x - Z.cx) <= Z.half && Math.abs(z - Z.cz) <= Z.half; }
export function inHall(x, z) { const H = SNOW.hall; return x >= H.x0 && x <= H.x1 && z >= H.z0 && z <= H.z1; }
const on = (ctx) => ctx.place.state.snow?.on === true;
import { clamp } from 'builtin/math';
export function depthAt(ctx, x, z) {
  const s = ctx.place.state.snow; if (!s?.on || inHall(x, z)) return 0;
  const mean = s.depth ?? 0; if (!inZone(x, z)) return mean;
  if (Q.length) flush(ctx);
  return clamp(mean + (ctx.readField('snow:depth', x, z) || 0), 0, SNOW.maxDepth);
}
export function packAt(ctx, x, z) {
  if (!on(ctx) || inHall(x, z) || !inZone(x, z)) return 0;
  return clamp(ctx.readField('snow:pack', x, z) || 0, 0, 1);
}
// deltaM: metres added (+ banks, - carves) at the centre, full inside radius*(1-edge), easing to 0 half a cell past radius.
// opts.pack: added to the cell's pack (0..1), same falloff. opts.set: pack becomes this value instead.
const Q = []; let tokens = SNOW.budget.dabsPerSec, lastAt = 0, flushAt = 0;
export function dab(ctx, x, z, deltaM, radiusM, opts) {
  if (!on(ctx) || !inZone(x, z)) return false;
  const r = Math.max(0.13, radiusM || SNOW.foot.radius);
  if (x + r >= SNOW.hall.x0 && x - r <= SNOW.hall.x1 && z + r >= SNOW.hall.z0 && z - r <= SNOW.hall.z1 && inHall(x, z)) return false;
  if (Q.length >= W.queueMax) Q.shift(); // oldest gives way: a new step is worth more than a stale one
  Q.push({ x, z, d: deltaM || 0, r, p: opts?.pack ?? 0, set: opts?.set });
  flush(ctx);
  return true;
}
export function pending() { return Q.length; }
// Spends the queue. Called by dab/depthAt; the player's update calls it while snow is on so a queue never stalls.
export function flush(ctx) {
  if (!Q.length || !on(ctx)) { if (!on(ctx)) Q.length = 0; return 0; }
  const now = ctx.now();
  tokens = Math.min(SNOW.budget.dabsPerSec, tokens + ((now - (lastAt || now)) / 1000) * SNOW.budget.dabsPerSec);
  lastAt = now;
  if (now < flushAt || tokens < 1) return 0;
  flushAt = now + W.flushMs;
  const fd = ctx.place.fields?.['snow:depth'], fp = ctx.place.fields?.['snow:pack']; if (!fd || !fp) { Q.length = 0; return 0; }
  const g = fd.grid, cs = g.cellSize, n = g.chunkCells, span = cs * n, q = g.quant;
  const mean = ctx.place.state.snow.depth ?? 0;
  const lo = Math.max(-32000, Math.ceil(-mean / q)), hi = Math.min(32000, Math.floor((SNOW.maxDepth - mean) / q));
  const work = new Map(); let used = 0;
  const chunk = (key) => {
    let w = work.get(key); if (w) return w;
    if (work.size >= W.chunksPerFlush) return null;
    const cd = fd.runtime[key], cp = fp.runtime[key];
    w = { d: cd?.cells ? Int16Array.from(cd.cells) : new Int16Array(n * n), p: cp?.cells ? Int16Array.from(cp.cells) : new Int16Array(n * n) };
    work.set(key, w); return w;
  };
  while (Q.length && tokens >= 1) {
    const a = Q[0], R = a.r + cs * 0.5, x0 = Math.floor((a.x - R) / cs), x1 = Math.floor((a.x + R) / cs), z0 = Math.floor((a.z - R) / cs), z1 = Math.floor((a.z + R) / cs);
    const keys = new Set(); for (const gx of [x0, x1]) for (const gz of [z0, z1]) keys.add(Math.floor(gx / n) + ',' + Math.floor(gz / n));
    if ([...keys].some((k) => !chunk(k))) break; // over the chunk cap: this one waits for the next flush
    Q.shift(); tokens -= 1; used++;
    const inner = a.r * (1 - W.edge);
    for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
      const px = (gx + 0.5) * cs, pz = (gz + 0.5) * cs, dist = Math.hypot(px - a.x, pz - a.z);
      if (dist >= R || inHall(px, pz)) continue;
      const t = dist <= inner ? 1 : 1 - (dist - inner) / (R - inner), wgt = t * t * (3 - 2 * t);
      const w = work.get(Math.floor(gx / n) + ',' + Math.floor(gz / n)), i = (gz - Math.floor(gz / n) * n) * n + (gx - Math.floor(gx / n) * n);
      if (a.d) w.d[i] = clamp(Math.round(w.d[i] + (a.d * wgt) / q), lo, hi);
      if (a.set != null) w.p[i] = Math.round(clamp(w.p[i] * (1 - wgt) + (a.set / q) * wgt, 0, 1 / q));
      else if (a.p) w.p[i] = Math.round(clamp(w.p[i] + (a.p * wgt) / q, 0, 1 / q));
    }
  }
  for (const [key, w] of work) { fd.runtime[key] = { ...g, cells: Array.from(w.d) }; fp.runtime[key] = { ...fp.grid, cells: Array.from(w.p) }; }
  return used;
}
