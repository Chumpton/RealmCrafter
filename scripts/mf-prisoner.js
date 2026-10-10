// Murkfen (creator 2026-10-10 "yup keep going"): Gorrak Bogjaw's caged prisoner. While Gorrak stands the cage is locked;
// the moment he is down the cage opens to a press, the prisoner thanks his rescuer (once per player: coins + a hint)
// and limps out. When Gorrak respawns the bogjaws drag a fresh prisoner back in. state: { name, cage (cage id) }.
import { animate } from 'builtin/tween';
export const updateSchedule = { every: { seconds: 1 } };
const REWARD = 150;
function chiefDown(ctx) {
  const c = ctx.query({ tags: ['monster'], center: ctx.self.feetPosition, radius: 40 }).find((q) => q.state?.kind === 'fen-chief');
  return !c || !!c.state?.down;
}
export function onSpawn(ctx) { const s = ctx.self.state; if (!s.home) s.home = { ...ctx.self.feetPosition }; }
export function update(ctx) {
  const s = ctx.self.state, down = chiefDown(ctx);
  if (down && !s.open) {
    s.open = true;
    const door = ctx.getObject(s.door); if (door) animate(ctx, door, { 'rotation.yaw': '+=110' }, { duration: 0.8, easing: 'easeOutCubic' });
    ctx.emit('playSound', { clip: '/cdn/moodboard-gothic-horror/sfx-rusty-iron-cage-door-creak-open.mp3', position: ctx.self.feetPosition, volume: 0.8, maxDistance: 30 });
    ctx.emit('highlightSet', { target: ctx.self.id, color: '#ffd200', style: 'pulse', duration: 3 });
  } else if (!down && s.open) {
    s.open = false; s.freed = false;
    const door = ctx.getObject(s.door); if (door) animate(ctx, door, { 'rotation.yaw': '-=110' }, { duration: 0.6 });
    ctx.self.feetPosition = { ...s.home }; ctx.self.visible = true; ctx.self.material = { ...(ctx.self.material ?? {}), dissolve: 0 };
  }
}
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state, who = ctx.getObject(by), say = (t) => ctx.emit('toast', { message: `${s.name}: "${t}"`, duration: 4.5 }, { audience: { player: by } });
    if (!s.open) { say("Shh! He's right there. Gorrak keeps the key on his belt. Put him down and I'm out."); return; }
    if (who && !who.state?.fenPrisonerFreed) {
      who.state.fenPrisonerFreed = true;
      who.state.supplies = { ...(who.state.supplies ?? {}), coins: ((who.state.supplies?.coins) | 0) + REWARD };
      const p = ctx.self.feetPosition;
      ctx.emit('damageNumber', { position: { x: p.x, y: p.y + 2.3, z: p.z }, text: `+${REWARD} coins`, color: '#ffd200', size: 1.1, lifetime: 1.8 }, { audience: { player: by } });
      ctx.emit('skillMsg', { text: `You free ${s.name}. He presses ${REWARD} coins into your hand.` }, { to: by });
    }
    if (s.freed) { say("Already out, friend. Mind the boards."); return; }
    s.freed = true;
    say("Free! Bless you. Old Wenna's hut is east across the bog, tell her Tobin's alive. I'll not forget this.");
    const h = s.home;
    animate(ctx, ctx.self, { 'feetPosition.x': h.x + 6, 'feetPosition.z': h.z + 5 }, { duration: 3.5, easing: 'easeInOutSine' });
    animate(ctx, ctx.self, { 'material.dissolve': [0, 1] }, { duration: 0.8, delay: 3.4 });
  },
};
