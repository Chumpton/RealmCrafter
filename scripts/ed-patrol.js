// A patrol path node: walks its assigned NPC round the waypoint loop. NPCs with their own wander brain (monster.js,
// placed-npc.js) are steered by moving their home to the next waypoint; anything else is walked directly.
import { EDL } from './lib/data/ed-logic.js';
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function update(ctx, dt) {
  const s = ctx.self.state, pts = s.pts ?? [], n = s.npc && ctx.getObject(s.npc);
  if (!n || pts.length < 2) { ctx.sleep(4); return; }
  const f = n.worldFeetPosition ?? n.feetPosition;
  if (!ctx.place.players.some((p) => p.feetPosition && flat(p.feetPosition, f) < EDL.wake)) { ctx.sleep(5); return; }
  const i = (s.i | 0) % pts.length, t = { x: pts[i][0], y: pts[i][1], z: pts[i][2] };
  const beh = [].concat(n.behavior ?? []).map(String).join(' '), brain = /monster\.js|placed-npc\.js/.test(beh);
  const d = flat(f, t);
  if (d < (brain ? 2.5 + (+n.state.wander || 0) : 0.6)) { s.i = (i + 1) % pts.length; return; }
  if (brain) { const h = n.state.home; if (!h || flat(h, t) > 0.5) n.state.home = { x: t.x, y: t.y, z: t.z }; ctx.sleep(0.5); return; }
  const step = Math.min(d, EDL.patrolSpeed * dt), ux = (t.x - f.x) / d, uz = (t.z - f.z) / d;
  const x = f.x + ux * step, z = f.z + uz * step;
  n.feetPosition = { x, y: ctx.place.terrain.heightAt(x, z) ?? f.y, z };
  n.rotation = { yaw: Math.atan2(-ux, -uz) * 180 / Math.PI };
}
