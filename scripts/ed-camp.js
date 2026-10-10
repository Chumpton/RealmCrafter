// A mob camp node: keeps its composition alive, inside its tether, and brings the fallen back after its cooldown.
// One manager per camp; sleeps when nobody is within EDL.wake metres.
import { MOBS, EDL } from './lib/data/ed-logic.js';
export const updateSchedule = { every: { seconds: 1 } };
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function update(ctx) {
  const o = ctx.self, s = o.state, c = o.feetPosition;
  if (!ctx.place.players.some((p) => p.feetPosition && flat(p.feetPosition, c) < (s.wake ?? EDL.wake))) { ctx.sleep(5); return; }
  const tether = Math.max(3, Math.min(EDL.tetherMax, s.tether ?? 12)), now = ctx.now();
  const mobs = (s.mobs ?? []).filter((m) => ctx.getObject(m.id));
  const want = []; for (const [k, n] of Object.entries(s.comp ?? {})) if (MOBS[k]) for (let i = 0; i < Math.min(8, n | 0); i++) want.push(k);
  const have = {}; for (const m of mobs) have[m.k] = (have[m.k] | 0) + 1;
  const keep = [], used = {};
  for (const m of mobs) { used[m.k] = (used[m.k] | 0) + 1; if (used[m.k] <= want.filter((k) => k === m.k).length) keep.push(m); else ctx.destroy(m.id); }
  for (const k of new Set(want)) for (let i = have[k] | 0; i < want.filter((x) => x === k).length; i++) {
    const a = ctx.random() * 6.283, r = ctx.random() * tether * 0.5, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
    const id = ctx.spawn({ tags: ['enemy', 'monster', k, 'ed-camp-mob'], behavior: 'scripts/monster.js', physics: 'kinematic', castShadow: true, visibleRange: { max: 90 },
      feetPosition: { x, z, y: { terrain: 0 } }, rotation: { yaw: ctx.random() * 360 }, ...(MOBS[k].model ? { model: MOBS[k].model, scale: MOBS[k].scale ?? 1 } : { primitive: { kind: 'scripted', script: MOBS[k].gen, params: MOBS[k].params, seed: 1 + (keep.length % 3) } }), state: { kind: k, camp: o.id } });
    if (id) keep.push({ id, k });
  }
  for (const m of keep) {
    const g = ctx.getObject(m.id); if (!g) continue; const ms = g.state, f = g.feetPosition;
    if (ms.down) { if (!m.at) m.at = now; else if (now - m.at > Math.max(5, s.respawn ?? 30) * 1000 && ms.home) {
      g.feetPosition = { x: ms.home.x, y: ctx.place.terrain.heightAt(ms.home.x, ms.home.z) ?? c.y, z: ms.home.z };
      Object.assign(ms, { hp: ms.maxHp, down: false, cd: 0, until: 0, engaged: null, chase: null }); g.visible = true; g.material = { ...(g.material ?? {}), dissolve: 0 }; if (g.mixer?.base) g.mixer = { base: { clip: 'Idle', weight: 1, loop: 'loop', speed: 1 } }; m.at = 0; }
      continue; }
    m.at = 0;
    if (f && flat(f, c) > tether) { ms.engaged = null; ms.chase = null; ms.dest = null; if (!ms.home || flat(ms.home, c) > tether) ms.home = { x: c.x, z: c.z }; }
  }
  s.mobs = keep;
}
