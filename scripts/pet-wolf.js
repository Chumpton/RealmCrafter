// Jeffery, Campton's wolf (2x since 2026-10-09). Follow: a loose spot well behind you, beside Wynx when she walks with you
// (Campton 2026-10-09: "follow at a greater distance, like around or following wynx"). You still for 10 s: he roams a
// circle out in front of you, trots and sprints between spots, and stops often to sniff. Steered velocity: no stutter.
import { avoid } from './lib/steer.js'; // go around things, turn back on a bump (creator 2026-10-10)
const D = Math.PI / 180;
const AV = {};
// (Campton 2026-10-10: "when flying, have jeffery turn into a bird using one of our models") Wynx in the air = Jeffery a bird
// at your wing, a puff of feathers each way; she lands, he drops to the ground a wolf again.
const BIRD = { model: '/cdn/value.ec9ec29fc3a552ce9b38c993db2bcae14b65b332dd08b1b6bde8db5c6eceae3d.glb', fit: { minExtents: { x: -0.8, y: 0, z: -0.7 }, maxExtents: { x: 0.8, y: 0.7, z: 0.7 } }, side: 3.5, back: 2.5, up: 1.2, acc: 30 };
const POOF = `fx
pop feathers burst=18..26 life=.8..1.4 v=sdir()*(1.5..3)+up(.6) size=.06..0.12 spin=-8..8 acc=grav()*.25+drag(2.2) col=<.62,.42,.26>><.9,.88,.84> a=1>.7:1>0 sz=$size rot=$age*$spin r=sprite(soft-disc,alpha)
pop puff burst=6 life=.4..0.7 v=sdir()*(.6..1.2) size=.3..0.5 acc=drag(2) col=<.95,.93,.9> a=0>.2:.5>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
function birdForm(ctx, me, owner, o, p, dt, now) {
  const fly = owner.state?.wynxSeat === 'fly' && !!owner.state?.mount;
  if (fly !== !!me.state.bird) {
    me.state.bird = fly; M.clip = ''; M.v = { x: 0, z: 0 }; M.vy = 0;
    if (fly) { me.state.wolf = { model: me.model, scale: me.scale }; me.mixer = null; me.model = BIRD.model; me.layout = BIRD.fit; me.scale = 1; }
    else { const w = me.state.wolf ?? {}; me.layout = null; me.model = w.model ?? me.model; me.scale = w.scale ?? 0.68; me.mixer = { base: { clip: 'Idle', weight: 1, loop: 'loop' } }; }
    ctx.emit('fx', { position: { x: p.x, y: p.y + 0.6, z: p.z }, script: POOF });
  }
  if (!fly) return false;
  // a spot off your right wing, a touch above, bobbing; he flaps (rolls) as he banks
  const oy = (owner.yaw ?? 0) * D, fx = -Math.sin(oy), fz = -Math.cos(oy), rx = Math.cos(oy), rz = -Math.sin(oy);
  const bob = Math.sin(now / 260) * 0.35;
  const tx = o.x + rx * BIRD.side - fx * BIRD.back, ty = o.y + BIRD.up + bob, tz = o.z + rz * BIRD.side - fz * BIRD.back;
  if (Math.hypot(tx - p.x, ty - p.y, tz - p.z) > 40) { me.feetPosition = { x: tx, y: ty, z: tz }; return true; }
  const k = Math.min(1, BIRD.acc * dt * 0.12), wx = (tx - p.x) * 4, wy = (ty - p.y) * 4, wz = (tz - p.z) * 4;
  M.v.x += (wx - M.v.x) * k; M.v.z += (wz - M.v.z) * k; M.vy += (wy - M.vy) * k;
  me.velocity = { x: M.v.x, y: M.vy, z: M.v.z };
  const sp = Math.hypot(M.v.x, M.v.z), want = sp > 1 ? Math.atan2(-M.v.x, -M.v.z) / D : owner.yaw ?? 0;
  if (M.yaw == null) M.yaw = want; const d = ((want - M.yaw + 540) % 360) - 180; M.yaw += Math.max(-300 * dt, Math.min(300 * dt, d));
  me.rotation = { yaw: M.yaw, pitch: Math.max(-20, Math.min(20, -M.vy * 3)), roll: Math.sin(now / 110) * 14 - d * 0.4 };
  return true;
}
const SNIFF = '/cdn/moodboard-lowpoly-cozy/sfx-small-dog-sniffing-ground.mp3';
const T = { gap: 6, side: 2.5, nearWynx: 3, wynxRange: 18, idleAfter: 10, roamAhead: 7, roamR: 9, trot: 3.2, run: 7.5, sprint: 10, acc: 14, sniff: 0.55 };
const M = { mode: 'follow', goal: null, until: 0, clip: '', last: null, still: 0, vy: 0, v: { x: 0, z: 0 }, hy: null, yaw: null };
function play(ctx, c, speed = 1) { const k = c + speed.toFixed(1); if (M.clip === k) return; M.clip = k; ctx.self.mixer = { base: { clip: c, weight: 1, loop: 'loop', speed } }; }
function turn(me, want, rate, dt, pitch = 0) {
  if (M.yaw == null) M.yaw = (typeof me.rotation === 'number' ? me.rotation : me.rotation?.yaw) ?? want;
  const d = ((want - M.yaw + 540) % 360) - 180; M.yaw += Math.max(-rate * dt, Math.min(rate * dt, d));
  me.rotation = { yaw: M.yaw, pitch };
}
export function update(ctx, dt) {
  const me = ctx.self, owner = ctx.place.players.find((p) => p.id === me.state.owner);
  if (!owner) { if (!me.state.goneAt) me.state.goneAt = ctx.now(); else if (ctx.now() - me.state.goneAt > 5000) ctx.destroy(me.id); return; }
  const o = owner.worldFeetPosition ?? owner.feetPosition, p = me.feetPosition, now = ctx.now();
  if (birdForm(ctx, me, owner, o, p, dt, now)) return;
  const dOwn = Math.hypot(o.x - p.x, o.z - p.z);
  if (dOwn > 45 || Math.abs(o.y - p.y) > 12) { me.feetPosition = { x: o.x + 2, y: o.y + 0.3, z: o.z + 2 }; M.v = { x: 0, z: 0 }; M.mode = 'follow'; return; }
  const moved = M.last ? Math.hypot(o.x - M.last.x, o.z - M.last.z) : 0; M.last = { x: o.x, z: o.z };
  if (moved > 0.03 || owner.state?.mount) { M.still = 0; if (M.mode !== 'follow') { M.mode = 'follow'; M.goal = null } } else M.still += dt;
  // your heading, smoothed so his spot never whips round with the camera
  const oy = owner.yaw ?? 0; M.hy = M.hy == null ? oy : M.hy + Math.max(-90 * dt, Math.min(90 * dt, ((oy - M.hy + 540) % 360) - 180));
  const hr = M.hy * D, fx = -Math.sin(hr), fz = -Math.cos(hr), rx = Math.cos(hr), rz = -Math.sin(hr);
  let tx = p.x, tz = p.z, top = 0, pitch = 0, face = null;
  if (M.mode === 'follow') {
    // Wynx walking with you: he pads along at her far side; else a loose spot back-left of you
    const wid = owner.state?.wynx, w = wid && !owner.state?.mount ? ctx.getObject(wid) : null, wp = w && (w.worldFeetPosition ?? w.feetPosition);
    if (wp && Math.hypot(wp.x - o.x, wp.z - o.z) < T.wynxRange && Math.abs(wp.y - o.y) < 2) { tx = wp.x + rx * T.nearWynx - fx * 1.5; tz = wp.z + rz * T.nearWynx - fz * 1.5 }
    else { tx = o.x - fx * T.gap - rx * T.side; tz = o.z - fz * T.gap - rz * T.side }
    const d = Math.hypot(tx - p.x, tz - p.z)
    top = d < 1.2 ? 0 : d > 14 ? T.sprint : d > 5 ? T.run : T.trot
    if (M.still > T.idleAfter) { M.mode = 'roam'; M.goal = null }
  }
  if (M.mode === 'roam') {
    if (!M.goal) { // a spot inside a circle out in front of you
      const cx = o.x + fx * T.roamAhead, cz = o.z + fz * T.roamAhead, a = ctx.random() * 6.283, r = Math.sqrt(ctx.random()) * T.roamR;
      M.goal = { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, sp: ctx.random() < 0.35 ? T.run : T.trot }
    }
    tx = M.goal.x; tz = M.goal.z; top = M.goal.sp
    if (Math.hypot(tx - p.x, tz - p.z) < 0.7) {
      if (ctx.random() < T.sniff) { M.mode = 'sniff'; M.until = now + 1800 + ctx.random() * 2800; if (owner.isLocal !== false) ctx.emit('playSound', { clip: SNIFF, position: p, volume: 0.4, maxDistance: 14 }) }
      else if (ctx.random() < 0.3) { M.mode = 'look'; M.until = now + 1200 + ctx.random() * 1500 }
      M.goal = null
    }
  }
  if (M.mode === 'sniff') { tx = p.x; tz = p.z; top = 0; pitch = -16 - Math.sin(now / 90) * 3; if (now > M.until) M.mode = 'roam' }
  if (M.mode === 'look') { tx = p.x; tz = p.z; top = 0; face = Math.atan2(-(o.x - p.x), -(o.z - p.z)) / D; if (now > M.until) M.mode = 'roam' }
  // steer: ease his velocity toward the goal's, arriving soft
  const gx = tx - p.x, gz = tz - p.z, gd = Math.hypot(gx, gz), want = Math.min(top, Math.max(0, gd - 0.2) * 2);
  let vx = gd > 1e-3 ? gx / gd * want : 0, vz = gd > 1e-3 ? gz / gd * want : 0;
  { const a = avoid(ctx, me, vx, vz, AV, { ignore: [owner.id, owner.state?.wynx].filter(Boolean) }); vx = a.vx; vz = a.vz; if (a.blocked && M.mode === 'roam' && ctx.random() < 0.02) M.goal = null; }
  const ex = vx - M.v.x, ez = vz - M.v.z, e = Math.hypot(ex, ez), cap = T.acc * dt;
  if (e > cap) { M.v.x += ex / e * cap; M.v.z += ez / e * cap } else { M.v.x = vx; M.v.z = vz }
  M.vy = me.grounded ? -1 : Math.max(-30, M.vy - 25 * dt);
  me.velocity = { x: M.v.x, y: M.vy, z: M.v.z };
  const sp = Math.hypot(M.v.x, M.v.z);
  if (sp > 0.4) turn(me, Math.atan2(-M.v.x, -M.v.z) / D, 360, dt);
  else turn(me, face ?? (M.mode === 'follow' ? Math.atan2(-(o.x - p.x), -(o.z - p.z)) / D : M.yaw ?? 0), 120, dt, pitch);
  if (sp > 5.2) play(ctx, 'Run', sp > 8.5 ? 1.35 : 1.1);
  else if (sp > 0.4) play(ctx, 'Walk', Math.min(1.6, sp / 2.4 + 0.4));
  else play(ctx, 'Idle', M.mode === 'sniff' ? 1.8 : 1);
}
