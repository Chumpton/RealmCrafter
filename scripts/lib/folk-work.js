// The folk rows' work (state.work: 'crank' | 'feed'), split off the scripts/folk-life.js door so it is not in the
// arrival set: the door forwards startWork and the work timers here once this module is in.
import { animate } from 'builtin/tween';
import { FOLK } from './data/folk-life.js';
import { boneName, axisSign } from './rig-names.js';
const K = { W: FOLK.work, L: FOLK.look, boneName, axisSign };
const span = (ctx, [a, b]) => a + ctx.random() * (b - a);
function bend(ctx, k, deg, dur) { // spine lean, merged into the shared bones bag
  const id = ctx.self.id, kf = {};
  for (const [logical, share] of [['Spine', 0.5], ['Spine1', 0.5]]) {
    const b = k.boneName(ctx, id, logical);
    if (!ctx.self.bones[b]) ctx.self.bones[b] = { yaw: 0, pitch: 0, roll: 0 };
    kf[`bones.${b}.pitch`] = +(deg * share * k.axisSign(ctx, id, logical, 'pitch')).toFixed(1);
  }
  animate(ctx, id, kf, { duration: dur, easing: 'easeInOutSine' });
}
function arm(ctx, target, weight, blend) {
  const ik = ctx.self.ik || {};
  ctx.self.ik = { ...ik, rightArm: weight ? { target, weight, blendIn: blend } : { target: ik.rightArm?.target ?? target, weight: 0, blendOut: blend } };
}
export function startWork(ctx) {
  const s = ctx.self.state, k = K;
  if (!s.work || s.workOn || !k || !k.W[s.work]) return;
  const W = k.W[s.work], token = s.workToken = (s.workToken ?? 0) + 1;
  s.workOn = true; s.workPause = false;
  if (s.work === 'crank') {
    ctx.self.anim.pose = { clip: W.clip, weight: s.weight ?? 5, loop: 'loop', blendIn: 1.1, speed: s.speed ?? 1 };
    bend(ctx, k, W.lean, 1.2);
    ctx.after(0.4, 'crank', { token });
    ctx.after(span(ctx, W.firstBreak), 'workBreak', { token });
  } else if (s.work === 'feed') ctx.after(span(ctx, W.first), 'feed', { token });
}
const CRANK_PREV = new Map();
// One crank step: read the roast's roll, aim the hand where the handle will be one step on, tween there.
export function crank(ctx, { token } = {}) {
  const s = ctx.self.state, k = K;
  if (token !== s.workToken) return;
  if (!k) { ctx.after(0.5, 'crank', { token }); return; }
  const C = k.W.crank, r = ctx.getObject(C.roast);
  if (s.toasting || s.workPause || !r) { ctx.after(0.5, 'crank', { token }); return; }
  const q = r.rotation || { z: 0, w: 1 }, now = ctx.now();
  const th = 2 * Math.atan2(q.z, q.w) * 180 / Math.PI;
  const T = r.state?.turnSeconds || 26;
  // round 12: the last crank angle lives in this machine's memory, not a state row written every step (only crankDir, which folk read, is state)
  const prev = CRANK_PREV.get(ctx.self.id);
  if (prev) { const d = ((th - prev.th + 540) % 360) - 180; if (Math.abs(d) > 0.2) { const dir = d > 0 ? 1 : -1; if (s.crankDir !== dir) s.crankDir = dir; } }
  CRANK_PREV.set(ctx.self.id, { th: +th.toFixed(2), at: now });
  if (s.crankPrev !== undefined) delete s.crankPrev;
  const ahead = (th + (s.crankDir ?? 0) * 360 / T * C.step) * Math.PI / 180;
  const tgt = { x: +(C.axis.x - C.radius * Math.sin(ahead)).toFixed(3), y: +(C.axis.y + C.radius * Math.cos(ahead)).toFixed(3), z: C.axis.z };
  const cur = ctx.self.ik?.rightArm;
  if (!cur || cur.weight !== C.weight) arm(ctx, tgt, C.weight, C.blendIn);
  else animate(ctx, ctx.self.id, { 'ik.rightArm.target.x': tgt.x, 'ik.rightArm.target.y': tgt.y, 'ik.rightArm.target.z': tgt.z }, { duration: C.step, easing: 'linear' });
  ctx.after(C.step, 'crank', { token });
}
// He straightens, glances down the hall, says his line; then back to the crank.
export function workBreak(ctx, { token } = {}) {
  const s = ctx.self.state, k = K;
  if (token !== s.workToken || !k) return;
  const C = k.W.crank;
  if (s.toasting) { ctx.after(6, 'workBreak', { token }); return; }
  s.workPause = true;
  arm(ctx, null, 0, 0.6);
  bend(ctx, k, 0, 0.9);
  ctx.self.anim.pose = { clip: C.breakClip, weight: s.weight ?? 5, loop: 'loop', blendIn: 0.9, speed: s.speed ?? 1 };
  const id = ctx.self.id, kf = {};
  for (const [logical, share] of Object.entries(k.L.split)) { const b = k.boneName(ctx, id, logical); if (!ctx.self.bones[b]) ctx.self.bones[b] = { yaw: 0, pitch: 0, roll: 0 }; kf[`bones.${b}.yaw`] = +(C.glance * share * k.axisSign(ctx, id, logical, 'yaw')).toFixed(1); }
  animate(ctx, id, kf, { duration: 0.9, easing: 'easeInOutSine', delay: 0.4 });
  const v = s.voice || [];
  if (v.length) {
    s.line = ((s.line ?? -1) + 1) % v.length;
    const f = ctx.self.worldFeetPosition || ctx.self.feetPosition;
    ctx.emit('playSound', { clip: v[s.line], position: { x: f.x, y: f.y + 1.5, z: f.z }, volume: 0.9, maxDistance: 14, delay: 0.8 });
  }
  s.talking = true; s.jawToken = (s.jawToken ?? 0) + 1; s.jawMode = 'talk';
  ctx.after(0.9, 'jaw', { token: s.jawToken, open: true, until: 0 });
  s.breakAt = ctx.now();
  ctx.after(span(ctx, C.breakFor), 'workResume', { token });
}
export function workResume(ctx, { token } = {}) {
  const s = ctx.self.state, k = K;
  if (token !== s.workToken || !k) return;
  const C = k.W.crank;
  s.talking = false;
  ctx.self.anim.pose = { clip: C.clip, weight: s.weight ?? 5, loop: 'loop', blendIn: 1.1, speed: s.speed ?? 1 };
  bend(ctx, k, C.lean, 1.1);
  s.workPause = false;
  ctx.after(span(ctx, C.breakEvery), 'workBreak', { token });
}
// Ingrid's stick: lean in, reach to the fire's edge, sparks as it lands, sit back.
export function feed(ctx, { token } = {}) {
  const s = ctx.self.state, k = K;
  if (token !== s.workToken) return;
  if (!k) { ctx.after(1, 'feed', { token }); return; }
  const F = k.W.feed;
  ctx.after(span(ctx, F.every), 'feed', { token });
  if (s.toasting) return;
  s.feedAt = ctx.now();
  bend(ctx, k, F.lean, F.leanIn);
  arm(ctx, F.reach, 1, F.reachIn);
  ctx.after(F.sparkAt, 'feedSpark', { token });
  ctx.after(F.holdFor, 'feedEnd', { token });
}
export function feedSpark(ctx, { token } = {}) {
  const s = ctx.self.state, k = K;
  if (token !== s.workToken || !k) return;
  const F = k.W.feed;
  ctx.emit('fx', { position: F.fire, script: F.fx });
  ctx.emit('playSound', { clip: F.sound, position: F.fire, volume: 0.55, maxDistance: 12 });
}
export function feedEnd(ctx, { token } = {}) {
  const s = ctx.self.state, k = K;
  if (token !== s.workToken || !k) return;
  const F = k.W.feed;
  if (!s.toasting) arm(ctx, null, 0, F.release);
  bend(ctx, k, 0, F.release + 0.3);
}
