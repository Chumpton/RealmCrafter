// A horse you ride. Two kinds share this script (scripts/lib/data/horse.js):
//  trail: the mare at the summit trailhead. E mounts; she gallops the summit-trail mark to the peak and lets you off by the
//         lookout, then trots home after a while. E (or Z) on the way jumps off.
//  own:   called with Z under the player (scripts/player.js). WASD rides, Shift-free: W gallops, space jumps, Z or E gets off and she's gone.
// The rider is parented to the horse (the gait sits him), and the camera goes third person while his parent is a horse (scripts/camera.js).
import { HORSE } from './lib/data/horse.js';
import { raycast } from 'builtin/physics';
const RAD = Math.PI / 180;
const S = new Map(); // per-horse working memory on the simulating machine
const M = (id) => { let m = S.get(id); if (!m) S.set(id, m = { v: 0, vy: 0, i: 0, phase: 0, air: 0 }); return m; };
const fwd = (yaw) => ({ x: -Math.sin(yaw * RAD), z: -Math.cos(yaw * RAD) });
const fin = (v) => typeof v === 'number' && Number.isFinite(v);
const yawOf = (o) => { const r = o.rotation; if (fin(r)) return r; if (fin(r?.yaw)) return r.yaw; if (r && fin(r.w)) return Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.z * r.z)) / RAD; return 0; };
const groundAt = (ctx, x, z) => { const h = ctx.place.terrain?.heightAt?.(x, z); return h == null ? null : Math.max(h, 0.4 + (h < 0 ? 0 : 0)); };

export function onSpawn(ctx) {
  const s = ctx.self.state;
  if (s.kind === 'own' && s.owner) { ctx.self.controller = s.owner; }
}
export const ears = {
  press: (ctx, { by }) => {
    const self = ctx.self; if (self.state.kind === 'ride') return; // someone's own horse: theirs
    if (self.controller && self.controller !== by && !riderHere(ctx, self)) { self.controller = null; homeward(ctx); } // her rider left mid-ride: she's free again
    if (self.controller && self.controller !== by) { ctx.emit('toast', { message: 'someone is riding her', duration: 1.6 }, { audience: { player: by } }); return; }
    if (self.state.kind === 'trail' && self.state.atTop) { ctx.emit('toast', { message: 'she is resting a moment', duration: 1.6 }, { audience: { player: by } }); return; }
    self.state.route = 0; self.controller = by;
  },
};
// the controller still stands in this place and sits on her
function riderHere(ctx, self) { const r = ctx.place.players.find((p) => p.id === self.controller); return !!r && (r.parent?.id ?? r.parent) === self.id; }
export function onControlBegin(ctx, player) {
  const self = ctx.self, m = M(self.id);
  player.parent = self.id; player.feetPosition = { ...HORSE.seat }; player.rotation = { yaw: 0 };
  player.state.riding = self.id;
  m.v = 0; m.i = 0; m.mounted = ctx.now();
  ctx.emit('playSound', { clip: HORSE.sounds.snort, position: self.feetPosition, volume: 0.7, maxDistance: 20 });
  if (self.state.kind === 'trail') { self.state.riding = true; ctx.emit('toast', { message: 'hold on. to the summit!', duration: 2 }, { audience: { player: player.id } }); }
  else ctx.emit('toast', { message: 'W gallop · A/D turn · space jump · Z get off', duration: 3 }, { audience: { player: player.id } });
  return true;
}
export function onControlEnd(ctx, player) {
  const self = ctx.self, m = M(self.id), yaw = yawOf(self), f = fwd(yaw), p = self.feetPosition;
  const body = player?.id ? ctx.getObject(player.id) ?? player : player;
  const sx = HORSE.stepOff.x, sz = HORSE.stepOff.z;
  const off = { x: p.x + Math.cos(yaw * RAD) * sx + Math.sin(yaw * RAD) * sz, z: p.z - Math.sin(yaw * RAD) * sx + Math.cos(yaw * RAD) * sz };
  if (body && (body.parent?.id ?? body.parent) === self.id) {
    body.parent = null;
    const g = ctx.place.terrain?.heightAt?.(off.x, off.z) ?? p.y;
    body.feetPosition = { x: off.x, y: Math.max(g, p.y) + 0.1, z: off.z };
    body.rotation = { yaw };
  }
  if (body?.state) delete body.state.riding;
  m.v = 0; self.audio = null; setGait(ctx, 0, 0);
  if (self.state.kind === 'own') { ctx.destroy(self.id); S.delete(self.id); return; }
  self.state.riding = false;
  if (!self.state.atTop) homeward(ctx); // jumped off on the way: she goes back to the trailhead
}
export function homeward(ctx) {
  const s = ctx.self.state, h = s.home; if (!h || ctx.self.controller) return;
  ctx.self.feetPosition = { x: h.x, y: h.y, z: h.z }; ctx.self.rotation = { yaw: h.yaw };
  s.atTop = false; M(ctx.self.id).i = 0; setGait(ctx, 0, 0);
}
export function onInput(ctx, input) {
  if (ctx.self.state.kind === 'ride') return;
  const m = M(ctx.self.id);
  if ((input.pressed.interact || input.pressed.use || input.pressed.horse) && ctx.now() - (m.mounted ?? 0) > 400) { ctx.self.controller = null; return; }
  m.thr = Math.max(-1, Math.min(1, input.axes.moveZ ?? 0)); m.steer = Math.max(-1, Math.min(1, input.axes.moveX ?? 0));
  if (input.pressed.jump && m.air <= 0) { m.vy = HORSE.own.jump; m.air = 1; }
}
// the gait: the rigged warhorse plays a baked clip picked by ground speed v (art/den-horse/build.py); clip names and
// native speeds (m/s at playback 1: stride ÷ cycle) below. Written only when the clip or the speed bucket changes: the
// clip runs on the client, so she keeps breathing on Idle while this script sleeps.
const CLIPS = { Idle: 0, Walk: 2.0, Trot: 2.6 / 0.6, Gallop: 3.6 / 0.5 };
function setGait(ctx, ph, amt, v = 0) {
  const b = ctx.self.bones;
  if (!b || !b.legFL) {
    const body = ctx.self.children?.find?.((c) => String(c.id).endsWith('/body')) ?? ctx.getObject(ctx.self.id + '/body'); if (!body) return;
    const m = M(ctx.self.id), sp = Math.abs(v ?? 0);
    const clip = sp < 0.2 ? 'Idle' : sp < 3.5 ? 'Walk' : sp < 9 ? 'Trot' : 'Gallop';
    const speed = clip === 'Idle' ? 1 : Math.round(Math.max(0.6, Math.min(1.8, sp / CLIPS[clip])) * 10) / 10;
    const key = clip + speed;
    if (m.clipKey !== key) {
      if (!m.clipKey) { body.rotation = { yaw: 0 }; body.feetPosition = { x: 0, y: 0, z: 0 }; } // clear the old rock/bob pose once
      m.clipKey = key; body.anim.base = { clip, loop: 'loop', speed };
    }
    const air = (m.air ?? 0) > 0;
    if (air !== !!m.jumpOn) { m.jumpOn = air; body.anim.act = air ? { clip: 'Jump', loop: 'once', weight: 4 } : null; }
    return;
  }
  const sw = 34 * amt, s1 = Math.sin(ph), s2 = Math.sin(ph + 0.9);
  b.legFL = { pitch: sw * s1 }; b.legFR = { pitch: sw * Math.sin(ph + 0.5) };
  b.legBL = { pitch: -sw * s2 }; b.legBR = { pitch: -sw * Math.sin(ph + 1.4) };
  b.neck = { pitch: -6 * amt * Math.sin(ph * 1) - 4 * amt }; b.tail = { pitch: 18 * amt + 6 * amt * Math.sin(ph) };
  b.body = { pitch: 2.5 * amt * Math.sin(ph) };
}
function hoofbeats(ctx, v) {
  const want = v > 2 ? HORSE.sounds.gallop : null, cur = ctx.self.audio?.clip ?? null;
  if (want !== cur) ctx.self.audio = want ? { clip: want, gain: 0.5, loop: true, spatial: true, maxDistance: 35 } : null;
}
export function update(ctx, dt) {
  const self = ctx.self, s = self.state, m = M(self.id);
  if (s.kind === 'ride') { // the rider's own horse: her body moves with his; she only gallops on the spot of it
    const sp = (s.sp ?? 0) / 2; m.phase += (sp / HORSE.stride) * Math.PI * 2 * dt;
    if (sp > 0.2 || m.moving) { m.moving = sp > 0.2; setGait(ctx, m.phase, Math.min(1, sp / 6), sp); hoofbeats(ctx, sp); }
    else { if (!m.clipKey) setGait(ctx, 0, 0, 0); ctx.sleep(0.25); }
    return;
  }
  if (!self.controller) {
    if (m.v !== 0 || m.moving || !m.clipKey) { m.v = 0; m.moving = false; setGait(ctx, 0, 0); hoofbeats(ctx, 0); }
    ctx.sleep(); return;
  }
  if ((m.chk = (m.chk ?? 0) + dt) > 2) { m.chk = 0; if (!riderHere(ctx, self)) { self.controller = null; return; } } // a rider who vanished lets go
  if (s.kind === 'trail') return trail(ctx, dt, m);
  const O = HORSE.own, p = self.feetPosition;
  let yaw = fin(m.yaw) ? m.yaw : yawOf(self);
  const target = m.thr > 0.1 ? O.walk + (O.gallop - O.walk) * m.thr : m.thr < -0.1 ? -O.back : 0;
  const rate = (Math.abs(target) > Math.abs(m.v) ? O.accel : O.decel) * dt, d = target - m.v;
  m.v += Math.abs(d) > rate ? Math.sign(d) * rate : d;
  yaw -= m.steer * O.turn * dt * (Math.abs(m.v) > 0.5 ? 1 : 0.7);
  const f = fwd(yaw); let step = m.v * dt;
  // a wall at chest height stops her
  if (Math.abs(step) > 0) {
    const dir = { x: f.x * Math.sign(step), y: 0, z: f.z * Math.sign(step) };
    const hit = raycast(ctx, { x: p.x, y: p.y + HORSE.probe.y, z: p.z }, dir, { distance: HORSE.probe.reach + Math.abs(step), physicsOnly: true, bodies: 'all', excludeTags: ['player'], ignoreEntities: [self.id] });
    if (hit && !hit.terrain && !String(hit.id ?? '').includes('terrain') && Math.abs(hit.normal?.y ?? 0) < 0.6) { step = 0; m.v = 0; }
  }
  const nx = p.x + f.x * step, nz = p.z + f.z * step;
  const g = ctx.place.terrain?.heightAt?.(nx, nz) ?? p.y;
  if (g - p.y > 1.4 && m.air <= 0) { // too steep a step up
    moveTo(ctx, p.x, p.y, p.z, yaw, m, dt); return;
  }
  let y = p.y;
  if (m.air > 0 || y > g + 0.05) { m.vy -= O.grav * dt; y += m.vy * dt; if (y <= g) { y = g; m.vy = 0; m.air = 0; } else m.air = 1; }
  else { y = g; m.vy = 0; }
  if (g < -0.6 && m.air <= 0) y = Math.max(y, -0.6); // wading, not drowning
  moveTo(ctx, nx, y, nz, yaw, m, dt);
}
function moveTo(ctx, x, y, z, yaw, m, dt) {
  const self = ctx.self; m.yaw = yaw;
  self.feetPosition = { x, y, z }; self.rotation = { yaw };
  const sp = Math.abs(m.v); m.moving = sp > 0.2;
  m.phase += (sp / HORSE.stride) * Math.PI * 2 * dt;
  setGait(ctx, m.phase, Math.min(1, sp / 6), sp); hoofbeats(ctx, sp);
  if (self.state.kind === 'own') self.state.kn = Math.round(sp * 3.6);
}
function trail(ctx, dt, m) {
  const self = ctx.self, s = self.state, T = HORSE.trail;
  const route = s.route === 1 ? 1 : 0, mark = route === 1 ? 'village-road' : T.mark; // Bjorn's choice (scripts/stablemaster.js)
  if (m.route !== route) { m.route = route; m.pts = null; }
  const pts = m.pts ??= (ctx.place.terrain?.marks?.[mark]?.points ?? []).map(([x, z]) => ({ x, z }));
  if (pts.length < 2) { self.controller = null; return; }
  m.v = Math.min(T.speed, m.v + 12 * dt);
  let left = m.v * dt, p = self.feetPosition, x = p.x, z = p.z;
  while (left > 0 && m.i < pts.length) {
    const t = pts[m.i], dx = t.x - x, dz = t.z - z, d = Math.hypot(dx, dz);
    if (d <= left) { x = t.x; z = t.z; left -= d; m.i++; } else { x += dx / d * left; z += dz / d * left; left = 0; }
  }
  if (m.i >= pts.length) { // the summit: let the rider off by the lookout
    s.atTop = true; m.v = 0;
    const end = route === 1 ? pts[pts.length - 1] : T.dismount, g = ctx.place.terrain?.heightAt?.(end.x, end.z) ?? p.y;
    self.feetPosition = { x: end.x, y: g, z: end.z };
    ctx.emit('playSound', { clip: HORSE.sounds.neigh, position: self.feetPosition, volume: 0.9, maxDistance: 60 });
    ctx.emit('toast', { message: route === 1 ? 'the village. mind the gate' : 'the summit. look out over the sea', duration: 3 }, { audience: { player: self.controller } });
    self.controller = null;
    ctx.after(T.homeAfter, 'homeward');
    return;
  }
  const look = pts[Math.min(m.i, pts.length - 1)];
  const want = Math.atan2(-(look.x - x), -(look.z - z)) / RAD;
  let yaw = m.yaw ?? yawOf(self), dy = ((want - yaw + 540) % 360) - 180;
  yaw += Math.max(-T.turn * dt, Math.min(T.turn * dt, dy));
  const g = ctx.place.terrain?.heightAt?.(x, z) ?? p.y;
  moveTo(ctx, x, g, z, yaw, m, dt);
}
