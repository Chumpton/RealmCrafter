// CHASE PATHS (creator 2026-10-04: "the player needs to automatically ... pathfind to the enemy ... the enemy needs to pathfind to the player too").
// One helper for both sides of a fight: a walkable route (builtin/nav findPath over colliders and terrain) re-asked at most every REASK ms
// per walker (the quarry moves), and the next corner to walk at. No route (ground still loading, cut off) = straight at it, as before.
import { findPath } from 'builtin/nav';
const REASK = 600, CACHE = new Map();
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function nextCorner(ctx, key, from, to, opts = {}) {
  const now = ctx.now(); let c = CACHE.get(key);
  if (!c || now - c.at > REASK || flat(c.to, to) > 1.2) {
    let pts = null;
    try { const r = findPath(ctx, from, to, { radius: opts.radius ?? 0.4, height: opts.height ?? 1.8 }); if (r && (r.ok || r.partial) && Array.isArray(r.points) && r.points.length) pts = r.points.map((p) => ({ x: p.x, y: p.y, z: p.z })); } catch { pts = null; }
    c = { at: now, to: { x: to.x, z: to.z }, pts: pts ?? [] }; CACHE.set(key, c);
    if (CACHE.size > 400) for (const k of CACHE.keys()) { CACHE.delete(k); if (CACHE.size < 300) break; }
  }
  while (c.pts.length && flat(c.pts[0], from) < (opts.reach ?? 0.6)) c.pts.shift(); // corners already reached
  return c.pts[0] ?? { x: to.x, y: to.y, z: to.z };
}
export function forget(key) { CACHE.delete(key); }
