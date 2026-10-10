// A quest giver (creator 2026-10-10): breathes, glances at whoever comes close, and on Talk-to opens the quest that
// QUEST_OF_NPC names for this object's id. state: { name, idle (the line once the quest is done) }. The ! is quest-player.js's.
import { animate } from 'builtin/tween';
import { QUEST_OF_NPC } from './lib/data/quests.js';
export function onSpawn(ctx) {
  const o = ctx.self, s = o.state; if (s.baseYaw == null) s.baseYaw = o.rotation?.yaw ?? 0;
  const sc = typeof o.scale === 'number' ? o.scale : 1;
  animate(ctx, o, { 'scale.y': [sc, sc * 1.02, sc] }, { duration: 3.6, easing: 'easeInOutSine', loop: true });
  ctx.after(4 + ctx.random() * 4, 'glance');
}
export function glance(ctx) {
  const o = ctx.self, f = o.feetPosition, s = o.state;
  const p = ctx.place.players.find((q) => q.feetPosition && Math.hypot(q.feetPosition.x - f.x, q.feetPosition.z - f.z) < 10);
  const to = p ? Math.atan2(-(p.feetPosition.x - f.x), -(p.feetPosition.z - f.z)) * 180 / Math.PI : s.baseYaw + (ctx.random() < 0.5 ? -20 : 20);
  let d = ((to - (o.rotation?.yaw ?? s.baseYaw)) % 360 + 540) % 360 - 180; d = Math.max(-80, Math.min(80, d));
  animate(ctx, o, { 'rotation.yaw': (d >= 0 ? '+=' : '-=') + Math.abs(d).toFixed(1) }, { duration: 0.9, easing: 'easeInOutSine' });
  ctx.after(3 + ctx.random() * 3, 'settle');
}
export function settle(ctx) {
  const o = ctx.self, s = o.state; const d = ((s.baseYaw - (o.rotation?.yaw ?? s.baseYaw)) % 360 + 540) % 360 - 180;
  animate(ctx, o, { 'rotation.yaw': (d >= 0 ? '+=' : '-=') + Math.abs(d).toFixed(1) }, { duration: 1.2, easing: 'easeInOutSine' });
  ctx.after(6 + ctx.random() * 6, 'glance');
}
export const ears = {
  press: (ctx, { by }) => {
    const qid = QUEST_OF_NPC[ctx.self.id], who = ctx.getObject(by);
    if (qid && who && who.state?.quests?.[qid] !== 'done') { ctx.emit('questTalk', { npc: ctx.self.id }, { to: by }); return; }
    ctx.emit('toast', { message: `${ctx.self.state.name}: "${ctx.self.state.idle ?? 'Safe roads, traveller.'}"`, duration: 4 }, { audience: { player: by } });
  },
};
