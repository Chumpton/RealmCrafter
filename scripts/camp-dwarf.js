// Bruni Emberbeard, the camp's dwarf (creator 2026-10-10: a name, an idle, a quest !). His model carries no rig, so his idle is
// tweens on his own dots: a slow breath (scale), a weight shift (roll), and now and then he turns to look at whoever is near,
// then back to the fire. Talk-to (context menu press) opens Straw and Steel through quest-player.js; the ! is that file's.
import { animate } from 'builtin/tween';
import { QUEST_OF_NPC } from './lib/data/quests.js';
export function onSpawn(ctx) {
  const o = ctx.self, s = o.state; if (s.baseYaw == null) s.baseYaw = o.rotation?.yaw ?? 0;
  const sc = typeof o.scale === 'number' ? o.scale : 1;
  animate(ctx, o, { 'scale.y': [sc, sc * 1.022, sc], 'scale.x': [sc, sc * 1.012, sc] }, { duration: 3.4, easing: 'easeInOutSine', loop: true });
  animate(ctx, o, { 'rotation.roll': [-1.6, 1.6, -1.6] }, { duration: 7.5, easing: 'easeInOutSine', loop: true });
  ctx.after(4 + ctx.random() * 4, 'glance');
}
export function glance(ctx) {
  const o = ctx.self, f = o.feetPosition, s = o.state;
  const p = ctx.place.players.filter((q) => q.feetPosition && Math.hypot(q.feetPosition.x - f.x, q.feetPosition.z - f.z) < 9)[0];
  const to = p ? Math.atan2(-(p.feetPosition.x - f.x), -(p.feetPosition.z - f.z)) * 180 / Math.PI : s.baseYaw + (ctx.random() < 0.5 ? -25 : 25);
  let d = ((to - (o.rotation?.yaw ?? s.baseYaw)) % 360 + 540) % 360 - 180; d = Math.max(-70, Math.min(70, d));
  animate(ctx, o, { 'rotation.yaw': (d >= 0 ? '+=' : '-=') + Math.abs(d).toFixed(1) }, { duration: 0.9, easing: 'easeInOutSine' });
  ctx.after(3 + ctx.random() * 3, 'settle');
}
export function settle(ctx) {
  const o = ctx.self, s = o.state; let d = ((s.baseYaw - (o.rotation?.yaw ?? s.baseYaw)) % 360 + 540) % 360 - 180;
  animate(ctx, o, { 'rotation.yaw': (d >= 0 ? '+=' : '-=') + Math.abs(d).toFixed(1) }, { duration: 1.2, easing: 'easeInOutSine' });
  ctx.after(6 + ctx.random() * 6, 'glance');
}
export const ears = {
  press: (ctx, { by }) => {
    const qid = QUEST_OF_NPC['camp-dwarf'], who = ctx.getObject(by);
    if (qid && who && who.state?.quests?.[qid] !== 'done') { ctx.emit('questTalk', { npc: 'camp-dwarf' }, { to: by }); return; }
    ctx.emit('toast', { message: 'Bruni: "Fire\'s warm, stew\'s hot, road\'s dangerous. Two out of three ain\'t bad."', duration: 4 }, { audience: { player: by } });
  },
};
