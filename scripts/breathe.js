// A slow breath and weight shift for an NPC whose model has no rig yet (creator 2026-10-06, Bald Thug): the chest rises, the body sways.
import { animate } from 'builtin/tween'
export function onSpawn(ctx) {
  const s = ctx.self.scale, b = typeof s === 'number' ? s : (s?.y ?? 1)
  animate(ctx, ctx.self, { scale: [b, b * 1.015, b] }, { duration: 3.6, easing: 'easeInOutSine', loop: true })
}
