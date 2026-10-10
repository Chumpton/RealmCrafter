import { animate } from 'builtin/tween';
// The roast turns on its rod: one looping tween about the rod's axis (local Z), no per-tick script.
export function onSpawn(ctx) {
  const t = ctx.self.state.turnSeconds || 26;
  animate(ctx, ctx.self, { 'rotation.roll': [0, 120, 240, 360] }, { duration: t, easing: 'linear', loop: true });
}
