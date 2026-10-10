// A palette NPC (admin Build tab): idles, looks around, strolls a few metres from home and back. One tween + one clip per leg,
// nothing per tick: update() sleeps between legs. state: { wander (m), home {x,y,z}, sex, clips? {idle,walk,look} = the model's own }.
import { animate } from 'builtin/tween';
const CLIP = { idle: 'cdn/clip-idle-loop.glb', look: 'cdn/clip-looking-around-loop.glb', walk: 'cdn/clip-walk-loop.glb', talk: 'cdn/clip-talk-loop.glb' };
const FEM = { idle: 'cdn/clip-idle-female-loop.glb', walk: 'cdn/clip-walk-female-loop.glb', talk: 'cdn/clip-talk-female-loop.glb' };
const clip = (self, k, speed = 1) => { self.anim.body = { clip: self.state?.clips?.[k] || (self.state?.sex === 'f' && FEM[k]) || CLIP[k], loop: 'loop', weight: 1, speed }; };
export function onSpawn(ctx) { const s = ctx.self.state; if (!s.home) s.home = { ...ctx.self.feetPosition }; clip(ctx.self, 'idle'); ctx.after(1 + ctx.random() * 3, 'leg'); }
export function leg(ctx) {
  const self = ctx.self, s = self.state, h = s.home ?? self.feetPosition, r = +s.wander || 0, f = self.feetPosition;
  if (s.frozen || r <= 0) { clip(self, ctx.random() < 0.3 ? 'look' : 'idle'); ctx.after(6, 'leg'); return; }
  const roll = ctx.random();
  if (roll < 0.35) { clip(self, roll < 0.15 ? 'look' : roll < 0.25 ? 'talk' : 'idle'); ctx.after(3 + ctx.random() * 5, 'leg'); return; }
  const a = ctx.random() * Math.PI * 2, d = r * Math.sqrt(ctx.random());
  const x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d, y = ctx.place.terrain?.heightAt?.(x, z) ?? h.y;
  const dist = Math.hypot(x - f.x, z - f.z); if (dist < 0.6) { ctx.after(2, 'leg'); return; }
  const t = dist / 1.15, yaw = Math.atan2(-(x - f.x), -(z - f.z)) * 180 / Math.PI;
  self.rotation = { yaw }; clip(self, 'walk', 0.9);
  animate(ctx, self, { 'feetPosition.x': x, 'feetPosition.y': y, 'feetPosition.z': z }, { duration: t, easing: 'linear' });
  ctx.after(t, 'stop');
}
export function stop(ctx) { clip(ctx.self, 'idle'); ctx.after(2 + ctx.random() * 4, 'leg'); }
