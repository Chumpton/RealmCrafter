// A farm-mountain gondola cabin: state { line, i }. Hangs from the rope by the shared clock (scripts/lib/gondola-path.js),
// so every machine and every rider agrees where it is. A kinematic box (mc-city cabin, params.ride): riders are parented inside.
import { GONDOLA as G } from './lib/data/gondolas.js';
import { pose, lineGeo } from './lib/gondola-path.js';
export const updateSchedule = { every: 2 };
const GEO = {};
export function update(ctx) {
  const s = ctx.self.state, L = s && G.lines[s.line];
  if (!L) return ctx.sleep(5);
  const p = pose(L, s.i ?? 0, L.cabins.length, ctx.now(), (GEO[s.line] ??= lineGeo(L)));
  ctx.self.feetPosition = { x: p.x, y: p.y, z: p.z };
  if (s.yaw !== p.yaw) { ctx.self.rotation = { yaw: p.yaw }; s.yaw = p.yaw; }
}
// E aimed at a cabin rings here too (player-feel-core): boarding itself is the rider's own act (scripts/gondola-rider.js)
export const ears = { press: () => {} };
