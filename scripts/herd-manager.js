// The herder: one behavior on herd-pens steps every animal in state.animals (rows tagged herd, state.species).
// Each animal: idle | graze | walk | lie (pigs). Targets are drawn only inside the species' pen rectangle inset by its
// radius, a straight walk between two points of a rectangle never leaves it, and a walk that would cross an avoid circle is
// refused: no animal can leave its pen. Rare calls only near a player. Nobody within HERD.wakeRadius: it sleeps.
import { play } from 'builtin/anim';
import { animate } from 'builtin/tween';
import { ORIGIN, PENS, SPECIES, HERD } from './lib/data/herd.js';
export const updateSchedule = { every: { seconds: HERD.tick } };
const TAKEN = []; // reused per tick (ponytail-debt: holds {x,z} refs from rows; no per-animal allocation beyond tween args)
function nearestD(ctx, x, z) { let d = Infinity; for (const p of ctx.place.players) { const f = p.feetPosition; if (!f) continue; const e = Math.hypot(f.x - x, f.z - z); if (e < d) d = e; } return d; }
function segHits(ax, az, bx, bz, c, r) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2)); return Math.hypot(ax + dx * t - c.x, az + dz * t - c.z) < r; }
function ok(P, r, fx, fz, x, z, own) { // local coords
  if (x < P.x0 + r || x > P.x1 - r || z < P.z0 + r || z > P.z1 - r) return false;
  for (const o of P.avoid) if (segHits(fx, fz, x, z, o, o.r + r * .5)) return false;
  for (const t of TAKEN) if (t !== own && Math.hypot(t.x - x, t.z - z) < r * 1.7) return false;
  return true;
}
function pick(ctx, sp, P, fx, fz, own, inWallow) {
  for (let i = 0; i < 10; i++) {
    let x, z;
    if (inWallow && P.wallow) { const a = ctx.random() * 6.283, k = Math.sqrt(ctx.random()) * .6; x = P.wallow.x + Math.cos(a) * P.wallow.rx * k; z = P.wallow.z + Math.sin(a) * P.wallow.rz * k; }
    else { const d = sp.step[0] + ctx.random() * (sp.step[1] - sp.step[0]), a = ctx.random() * 6.283; x = fx + Math.cos(a) * d; z = fz + Math.sin(a) * d; }
    if (ok(P, sp.r, fx, fz, x, z, own)) return { x, z };
  }
  return null;
}
export function update(ctx) {
  const self = ctx.self, ids = self.state.animals || [];
  if (nearestD(ctx, ORIGIN.x, ORIGIN.z) > HERD.wakeRadius) { ctx.sleep(HERD.sleepSeconds); return; }
  const now = ctx.now(), dt = HERD.tick;
  TAKEN.length = 0;
  for (const id of ids) { const o = ctx.getObject(id); if (o) TAKEN.push(o.state.to || { x: o.feetPosition.x - ORIGIN.x, z: o.feetPosition.z - ORIGIN.z }); }
  for (const id of ids) {
    const g = ctx.getObject(id); if (!g) continue;
    const s = g.state, sp = SPECIES[s.species]; if (!sp) continue;
    const P = PENS[sp.pen], f = g.feetPosition, lx = f.x - ORIGIN.x, lz = f.z - ORIGIN.z;
    if (ctx.random() < HERD.callChance * sp.callRate * dt && nearestD(ctx, f.x, f.z) < HERD.callRadius)
      ctx.emit('playSound', { clip: sp.calls[0], position: { x: f.x, y: f.y + sp.callY, z: f.z }, volume: HERD.callVolume, maxDistance: HERD.callRange, pitch: .85 + ctx.random() * .3 });
    if (now < (s.until || 0)) continue;
    const own = s.to || null;
    if (s.mode === 'walk' || ctx.random() < HERD.restChance) { // rest where it stands
      const wet = P.wallow && Math.hypot((lx - P.wallow.x) / P.wallow.rx, (lz - P.wallow.z) / P.wallow.rz) < 1;
      const lie = s.species === 'pig' && (wet || lz > -2.3 && lx > 2.6) && ctx.random() < sp.lieChance;
      const graze = !lie && ctx.random() < HERD.grazeChance, mode = lie ? 'lie' : graze ? 'graze' : 'idle';
      s.mode = mode; s.until = now + (HERD.restMs[0] + ctx.random() * (HERD.restMs[1] - HERD.restMs[0])) * sp.restScale * (lie ? 2 : 1);
      play(ctx, g, sp.clips[mode], { channel: 'body', loop: true, blendIn: .5, speed: .85 + ctx.random() * .3 });
      continue;
    }
    const wantWet = s.species === 'pig' && ctx.random() < sp.wallowChance;
    const t = pick(ctx, sp, P, lx, lz, own, wantWet);
    if (!t) { s.until = now + HERD.retryMs; continue; }
    const wx = t.x + ORIGIN.x, wz = t.z + ORIGIN.z, d = Math.hypot(t.x - lx, t.z - lz), y = ctx.place.terrain.heightAt(wx, wz) ?? f.y, dur = d / sp.speed;
    const r = g.rotation, cur = Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) * 180 / Math.PI, want = Math.atan2(-(t.x - lx), -(t.z - lz)) * 180 / Math.PI;
    const turn = ((want - cur + 540) % 360) - 180, tt = Math.min(1.4, .3 + Math.abs(turn) / 160);
    animate(ctx, g.id, { 'rotation.yaw': (turn >= 0 ? '+=' : '-=') + Math.abs(turn).toFixed(1) }, { duration: tt, easing: 'easeInOutSine' });
    animate(ctx, g.id, { 'feetPosition.x': wx, 'feetPosition.y': y, 'feetPosition.z': wz }, { duration: dur, delay: tt * .6, easing: 'easeInOutSine' });
    s.to = t; s.mode = 'walk'; s.until = now + (dur + tt * .6) * 1000;
    const i = TAKEN.indexOf(own); if (i >= 0) TAKEN[i] = t; else TAKEN.push(t);
    play(ctx, g, sp.clips.walk, { channel: 'body', loop: true, blendIn: .3, speed: sp.walkClip });
  }
}
