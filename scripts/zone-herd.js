// The zone creatures' keeper (creator 2026-10-10: "general pathing"): one manager steps every walking creature in the
// twelve scene zones. Each strolls a few metres around the spot it was placed on, pauses, looks about, steers around props
// with scripts/lib/steer.js (bends round a blocker, turns back on a bump), and stops to face a player who walks up.
// Creatures whose model has no Walk clip (herd-clips.yml) stay put. Their working memory is this script's, not state.
import { avoid } from './lib/steer.js';
import H from './lib/data/herd-clips.yml';
const T = H.tune, M = new Map(); // id -> { home, goal, until, clip, av, yaw }
export const updateSchedule = { every: T.every };
const D = Math.PI / 180;
function clip(o, m, name) { if (!name || m.clip === name) return; m.clip = name; o.mixer = { base: { clip: name, weight: 1, loop: 'loop', speed: 1 } }; }
export function update(ctx, dt) {
  const players = ctx.place.players, now = ctx.now();
  for (const r of ctx.query({ tags: ['zs-creature'], center: ctx.self.feetPosition, radius: 400 })) {
    const o = ctx.getObject(r.id); if (!o) continue;
    const mdl = typeof o.model === 'string' ? o.model : o.model?.id, C = H.clips[mdl]; if (!C || o.state?.down) continue;
    let m = M.get(r.id);
    if (!m) { const f = o.state?.home ?? o.feetPosition; m = { home: { x: f.x, z: f.z }, goal: null, until: now + ctx.random() * 4000, clip: '', av: {}, yaw: (typeof o.rotation === 'number' ? o.rotation : o.rotation?.yaw) ?? 0 }; M.set(r.id, m); if (o.physics?.body === 'static') o.physics = { body: 'kinematic', collider: 'box' }; }
    const p = o.feetPosition;
    let near = null, nd = T.playerNear; for (const pl of players) { const d = Math.hypot(pl.feetPosition.x - p.x, pl.feetPosition.z - p.z); if (d < nd) { nd = d; near = pl; } }
    if (near) { m.goal = null; m.until = now + 1500; clip(o, m, C.idle); const want = Math.atan2(-(near.feetPosition.x - p.x), -(near.feetPosition.z - p.z)) / D; m.yaw += Math.max(-120 * dt, Math.min(120 * dt, ((want - m.yaw + 540) % 360) - 180)); o.rotation = { yaw: m.yaw }; continue; }
    if (!m.goal) {
      if (now < m.until) { clip(o, m, C.look && ctx.random() < 0.01 ? C.look : m.clip || C.idle); continue; }
      const a = ctx.random() * 6.283, rr = 1.5 + ctx.random() * (T.roam - 1.5); m.goal = { x: m.home.x + Math.cos(a) * rr, z: m.home.z + Math.sin(a) * rr, give: now + 9000 };
    }
    const gx = m.goal.x - p.x, gz = m.goal.z - p.z, gd = Math.hypot(gx, gz);
    if (gd < 0.4 || now > m.goal.give || Math.hypot(p.x - m.home.x, p.z - m.home.z) > T.roam + 2.5) { // there, gave up, or strayed off its mound: rest, then a fresh spot (inside the ring pulls it home)
      if (Math.hypot(p.x - m.home.x, p.z - m.home.z) > T.roam + 2.5) { m.goal = { x: m.home.x, z: m.home.z, give: now + 12000 }; } else { m.goal = null; m.until = now + (T.pauseMin + ctx.random() * (T.pauseMax - T.pauseMin)) * 1000; clip(o, m, C.idle); continue; }
    }
    let vx = gx / gd * T.walk, vz = gz / gd * T.walk;
    const a = avoid(ctx, o, vx, vz, m.av, { knee: 0.4, look: 0.9 }); vx = a.vx; vz = a.vz;
    const nx = p.x + vx * dt, nz = p.z + vz * dt, ny = ctx.place.terrain.heightAt(nx, nz) ?? p.y;
    o.feetPosition = { x: nx, y: ny, z: nz };
    const want = Math.atan2(-vx, -vz) / D; m.yaw += Math.max(-200 * dt, Math.min(200 * dt, ((want - m.yaw + 540) % 360) - 180)); o.rotation = { yaw: m.yaw };
    clip(o, m, C.walk);
  }
}
