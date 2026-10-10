// Climbable ladders: the player's own update (scripts/player.js climbStep) reads this list. A new ladder = one row here.
// foot/top are world points on the ladder's rung line; out = the horizontal unit pointing away from what it leans on.
// The mother tree's four flights (ground → landing → landing → deck hatch → crow's nest) come from TH.flights.
import { TH, flightLine } from './treehouse.js';
const R = Math.PI / 180;
function toWorld(o, yaw, l) { const c = Math.cos(yaw * R), s = Math.sin(yaw * R); return { x: o.x + l[0] * c + l[2] * s, y: o.y + l[1], z: o.z - l[0] * s + l[2] * c }; }
export const LADDERS = TH.flights.map((f) => {
  const L = flightLine(f), o = toWorld({ x: 0, y: 0, z: 0 }, TH.yaw, L.out);
  return { id: f.id, foot: toWorld(TH.origin, TH.yaw, L.foot), top: toWorld(TH.origin, TH.yaw, L.top), out: { x: o.x, z: o.z }, reach: 0.95, side: 0.6, stand: 0.45, speed: 3, hopIn: 2.6, hopUp: 4.2 };
});
