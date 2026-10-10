// Where a gondola cabin hangs at a moment: the same answer on every machine (ctx.now() is the room's clock).
// Cycle: up the +lane rope (travel) → swing across at the top (swing) → dock B → down the −lane rope → swing at A → dock A.
import { GONDOLA as G } from './data/gondolas.js';
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const glide = (k) => { const s = k * k * (3 - 2 * k); return s * 0.3 + k * 0.7; }; // a gentle pull-away and arrival
export function lineGeo(L) {
  const [dx, dy, dz] = L.to, H = Math.hypot(dx, dz), ux = dx / H, uz = dz / H, nx = -dz / H, nz = dx / H;
  const tA = G.dockIn / H, tB = 1 - tA, w = G.ease / H;
  const rope = (t) => dy * t - L.sag * 4 * t * (1 - t) + G.hook; // the cable's own curve (mc-city cable), relative to a.y
  return { dx, dy, dz, H, ux, uz, nx, nz, tA, tB, w, eA: rope(tA) - G.hook, eB: rope(tB) - (dy + G.hook), rope,
    yaw: (Math.atan2(-dx, -dz) * 180) / Math.PI };
}
export const cycle = () => 2 * (G.travel + G.swing + G.dock);
// pose: { x, y, z (the hook = the cabin's feet), yaw, phase, at: 'a' | 'b' | null (at a station), side }
export function pose(L, i, n, nowMs, geo = lineGeo(L)) {
  const C = cycle(), T = G.travel, W = G.swing, D = G.dock;
  let s = ((nowMs / 1000 + (i * C) / n) % C + C) % C, t, off, phase, at = null;
  if (s < T) { t = geo.tA + (geo.tB - geo.tA) * glide(s / T); off = G.lane; phase = 'up'; }
  else if ((s -= T) < W) { t = geo.tB; off = G.lane * Math.cos((Math.PI * s) / W); phase = 'swing'; at = 'b'; }
  else if ((s -= W) < D) { t = geo.tB; off = -G.lane; phase = 'dock'; at = 'b'; }
  else if ((s -= D) < T) { t = geo.tB - (geo.tB - geo.tA) * glide(s / T); off = -G.lane; phase = 'down'; }
  else if ((s -= T) < W) { t = geo.tA; off = -G.lane * Math.cos((Math.PI * s) / W); phase = 'swing'; at = 'a'; }
  else { t = geo.tA; off = G.lane; phase = 'dock'; at = 'a'; }
  // on the rope's sag curve, eased down to the platform's height at each dock
  const y = geo.rope(t) - geo.eA * (1 - ss(geo.tA, geo.tA + geo.w, t)) - geo.eB * ss(geo.tB - geo.w, geo.tB, t);
  return { x: L.a.x + geo.dx * t + geo.nx * off, y: L.a.y + y, z: L.a.z + geo.dz * t + geo.nz * off, yaw: geo.yaw, phase, at, side: Math.sign(off) || 1 };
}
// where a rider is set down at a station: behind the cabin, on its own side of the bull-wheel post, on the platform
export function dropPoint(L, at, side, geo = lineGeo(L)) {
  const fx = at === 'a' ? geo.ux : -geo.ux, fz = at === 'a' ? geo.uz : -geo.uz;
  const S = at === 'a' ? L.a : { x: L.a.x + geo.dx, y: L.a.y + geo.dy, z: L.a.z + geo.dz };
  return { x: S.x - fx * 1.4 + geo.nx * G.lane * side, y: S.y + 0.65, z: S.z - fz * 1.4 + geo.nz * G.lane * side };
}
