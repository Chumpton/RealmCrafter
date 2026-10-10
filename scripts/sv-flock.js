// Sunreach birds (creator 2026-10-10: "birds and atmos effects"): this pivot spins forever on one tween; its child gulls ride
// the circle at their own radius and bob on their own tween. No per-tick work: two tweens per bird, everyone sees the same sky.
import { animate } from 'builtin/tween';
const GULL = '/cdn/value.ec9ec29fc3a552ce9b38c993db2bcae14b65b332dd08b1b6bde8db5c6eceae3d.glb';
const FIT = { minExtents: { x: -0.7, y: 0, z: -0.6 }, maxExtents: { x: 0.7, y: 0.6, z: 0.6 } };
export function onSpawn(ctx) {
  const o = ctx.self, s = o.state, n = s.n ?? 5, r = s.r ?? 26, dir = s.dir ?? 1;
  s.kids = (s.kids ?? []).filter((id) => ctx.getObject(id));
  if (!s.kids.length) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + ctx.random() * 0.4, rr = r + (ctx.random() - 0.5) * 8, y = (ctx.random() - 0.5) * 6;
      const id = ctx.spawn({ parent: o.id, model: s.model ?? GULL, layout: s.fit ?? FIT, scale: (s.scale ?? 1) * (0.9 + ctx.random() * 0.4), castShadow: false, visibleRange: { max: 400 },
        feetPosition: { x: Math.cos(a) * rr, y, z: Math.sin(a) * rr }, rotation: { yaw: -a * 57.3 + (dir > 0 ? 180 : 0), roll: dir * 18 }, tags: ['sv-bird'] });
      s.kids.push(id);
    }
  }
  const per = s.period ?? 38;
  animate(ctx, o, { 'rotation.yaw': dir > 0 ? [0, -360] : [0, 360] }, { duration: per, easing: 'linear', loop: true });
  for (const id of s.kids) { const k = ctx.getObject(id); if (!k) continue; const y = k.feetPosition.y;
    animate(ctx, k, { 'feetPosition.y': [y, y + 1.5 + ctx.random() * 1.5, y] }, { duration: 3 + ctx.random() * 3, easing: 'easeInOutSine', loop: true });
    animate(ctx, k, { 'rotation.roll': [dir * 10, dir * 28, dir * 10] }, { duration: 1.4 + ctx.random(), easing: 'easeInOutSine', loop: true }); }
}
