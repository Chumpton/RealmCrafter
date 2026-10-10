// The hotbar campfire's own clock (creator 2026-10-06): once a second it asks whether anyone sits on one of its benches;
// CAMPFIRE.idleMs with nobody seated and it goes out in a puff, benches and all.
import { CAMPFIRE, PUFF_FX } from "./lib/data/campfire.js";
export const updateSchedule = { every: { seconds: 1 } };
export function update(ctx) {
  const me = ctx.self, st = me.state, now = ctx.now(), benches = Array.isArray(st.benches) ? st.benches : [];
  if (!st.lastSat) { st.lastSat = now; return; }
  const seated = ctx.place.players.some((p) => p.state?.seatedOn && benches.includes(p.state.seatedOn));
  if (seated) { if (now - st.lastSat > 900) st.lastSat = now; return; }
  if (now - st.lastSat < CAMPFIRE.idleMs) return;
  const p = me.feetPosition;
  ctx.emit("fx", { position: { x: p.x, y: p.y + 0.3, z: p.z }, script: PUFF_FX });
  ctx.emit("playSound", { clip: "cdn/moodboard-lowpoly-cozy/sfx-campfire-hiss-out.mp3", position: p, volume: 0.6 });
  for (const b of benches) if (ctx.getObject(b)) ctx.destroy(b);
  ctx.destroy(me.id);
}
