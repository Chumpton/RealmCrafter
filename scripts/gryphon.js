import { avoid } from './lib/steer.js';
// Wynx's own behavior: her wings, legs, head and tail read how she moves; off her rider's back she follows her owner,
// trotting at your heels, running to catch up, and taking wing when you're off the ground or far away.
// Ridden, her rider's body carries her (scripts/lib/wynx-ride.js) and writes state.sp / fly / dash; she only animates.
import { raycast } from 'builtin/physics'
import { WYNX as W } from './lib/data/gryphon.js'
const RAD = Math.PI / 180
const S = new Map()
const M = (id) => { let m = S.get(id); if (!m) S.set(id, m = { ph: 0, flap: 0, fold: 1, sweep: 0, still: 0 }); return m }
const lerp = (a, b, t) => a + (b - a) * t
function groundAt(ctx, x, y, z, ignore, ref) {
  const hit = raycast(ctx, { x, y: y + 1.5, z }, { x: 0, y: -1, z: 0 }, { distance: 40, physicsOnly: true, ignoreEntities: ignore, excludeTags: ['player'] })
  const t = ctx.place.terrain?.heightAt?.(x, z)
  // (creator 2026-10-06) a roof or awning well above the ground, and not where you stand, is not her floor
  const h = hit && !(ref != null && t != null && hit.position.y - t > 1.5 && Math.abs(hit.position.y - ref) > 1.5) ? hit.position.y : -1e9
  return Math.max(h, t ?? -1e9, -0.4)
}
export function update(ctx, dt) {
  const me = ctx.self, s = me.state, m = M(me.id)
  const owner = s.owner ? ctx.getObject(s.owner) : null
  if (owner && W.noTap?.includes(owner.userId) && owner.state?.mount !== me.id) { S.delete(me.id); ctx.destroy(me.id); return } // (forge 2026-10-05) no Wynx for him: an old one sends itself away
  if (!owner || !ctx.place.players.some((p) => p.id === s.owner)) { // her owner left this place: she goes too
    m.lost = (m.lost ?? 0) + dt; if (m.lost > 5) { S.delete(me.id); ctx.destroy(me.id) } return
  }
  m.lost = 0
  if (s.ridden && owner.state?.mount !== me.id && (m.rcheck = (m.rcheck ?? 0) + dt) > 1) { m.rcheck = 0; s.ridden = false } // a rider who isn't on her
  let sp = 0, fly = false, dash = false
  if (s.ridden) { sp = (s.sp ?? 0) / 2; fly = !!s.fly; dash = !!s.dash }
  else { const f = brain(ctx, dt, me, owner, m); sp = f.sp; fly = f.fly; dash = !!f.glide }
  pose(ctx, dt, me, m, sp, fly, dash, !!s.ridden)
  sounds(ctx, me, m, sp, fly)
}
// ---- off her back (Campton 2026-10-09): one steering body for every move, so she glides instead of stepping.
// m.v is her velocity; every mode only picks a goal and a pace, steer() eases her toward it. Idle 10 s: a show
// (an orbit and a loop in front of you), then patrols, high soaring and standing watch. A double-tap (state.call)
// sends her flying to your side; your body hops on when she says she's here (state.call.here).
const I = W.idle
function steer(ctx, dt, me, m, gx, gy, gz, top, acc, fly, ignore, refY) {
  const p = me.feetPosition, v = m.v
  const dx = gx - p.x, dz = gz - p.z, d = Math.hypot(dx, dz)
  const want = Math.min(top, Math.max(0, d - 0.15) * 1.8) // arrive: eases in over the last metres
  let tx = d > 1e-3 ? dx / d * want : 0, tz = d > 1e-3 ? dz / d * want : 0
  if (!fly && !m.air) { const a = avoid(ctx, me, tx, tz, m.av ??= {}, { knee: 0.7, ignore: ignore ?? [] }); tx = a.vx; tz = a.vz } // walking: around things, back on a bump (creator 2026-10-10)
  const ex = tx - v.x, ez = tz - v.z, e = Math.hypot(ex, ez), cap = acc * dt
  if (e > cap) { v.x += ex / e * cap; v.z += ez / e * cap } else { v.x = tx; v.z = tz }
  const nx = p.x + v.x * dt, nz = p.z + v.z * dt
  const g = groundAt(ctx, nx, p.y, nz, ignore, refY)
  let y
  if (fly) { const ty = Math.max(gy, g + 1.5); v.y = lerp(v.y, Math.max(-14, Math.min(14, (ty - p.y) * 2.2)), Math.min(1, 4 * dt)); y = p.y + v.y * dt }
  else if (p.y > g + 0.25) { v.y = Math.max(v.y - 22 * dt, -10); y = Math.max(g, p.y + v.y * dt) } // gliding down to land
  else { v.y = 0; y = lerp(p.y, g, Math.min(1, 14 * dt)) }
  me.feetPosition = { x: nx, y, z: nz }
  m.air = fly || y > g + 1.2
  return { d, g, sp: Math.hypot(v.x, v.z) }
}
function face(me, m, dt, want, rate, pitch = 0, roll = 0) {
  const dd = ((want - m.yaw + 540) % 360) - 180
  m.yaw += Math.max(-rate * dt, Math.min(rate * dt, dd))
  m.pitch = lerp(m.pitch ?? 0, pitch, Math.min(1, 6 * dt)); m.roll = lerp(m.roll ?? 0, roll, Math.min(1, 4 * dt))
  const pr = Math.abs(m.pitch) > 0.3 || Math.abs(m.roll) > 0.3
  me.rotation = pr ? { yaw: m.yaw + (W.bodyYaw || 0), pitch: m.pitch * I.pitchSign, roll: m.roll * I.rollSign } : { yaw: m.yaw + (W.bodyYaw || 0) }
}
const headingOf = (vx, vz) => Math.atan2(-vx, -vz) / RAD
function brain(ctx, dt, me, owner, m) {
  const F = W.follow, s = me.state, p = me.feetPosition, now = ctx.now()
  m.v ??= { x: 0, y: 0, z: 0 }; m.yaw ??= ((typeof me.rotation === 'number' ? me.rotation : me.rotation?.yaw) ?? 0) - (W.bodyYaw || 0)
  const o = owner.worldFeetPosition ?? owner.feetPosition, ign = [me.id, owner.id]
  const og = groundAt(ctx, o.x, o.y, o.z, ign), ownerAir = o.y - og > F.airGap
  // how long you've stood still on the ground
  const lo = m.lastO, moved = lo ? Math.hypot(o.x - lo.x, o.z - lo.z, o.y - lo.y) : 0; m.lastO = { x: o.x, y: o.y, z: o.z }
  if (moved > 0.04 || ownerAir || s.goTo || s.call) { m.ostill = 0; if (m.idle) { m.idle = null; m.flyHold = m.air } } else m.ostill = (m.ostill ?? 0) + dt
  // your heading, smoothed, so her spot at your side never whips round with the camera
  const oyaw = owner.yaw ?? 0
  m.hy = m.hy == null ? oyaw : m.hy + Math.max(-120 * dt, Math.min(120 * dt, ((oyaw - m.hy + 540) % 360) - 180))
  const hy = m.hy * RAD, fx = -Math.sin(hy), fz = -Math.cos(hy) // your forward
  const dOwn = Math.hypot(o.x - p.x, o.z - p.z)
  // 1. called: she flies to your side and says so
  if (s.call && !s.call.here) {
    const sx = o.x + Math.cos(hy) * 2.2, sz = o.z - Math.sin(hy) * 2.2 // your right
    if (Math.hypot(sx - p.x, sz - p.z) > 6) { // creator 2026-10-10: called from afar, she is beside you at once, no flight to wait on
      me.feetPosition = { x: sx, y: ownerAir ? o.y : groundAt(ctx, sx, o.y + 2, sz, ign), z: sz }; m.v = { x: 0, y: 0, z: 0 }; m.air = ownerAir; m.yaw = oyaw; face(me, m, 1, oyaw, 999)
      ctx.emit('fx', { position: { x: sx, y: o.y + 1, z: sz }, script: `fx\npop puff burst=24 life=.5..0.9 v=sdir()*(1.5..3) size=.25..0.45 acc=drag(2.5) col=<.9,.85,1> a=.8>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)` })
      s.call = { ...s.call, here: true }; return { sp: 0, fly: ownerAir }
    }
    const d = Math.hypot(sx - p.x, sz - p.z), fly = ownerAir || d > 6 || m.air
    const r = steer(ctx, dt, me, m, sx, d > 6 ? Math.max(o.y, og) + Math.min(10, d * 0.25) : og, sz, F.fly * 1.15, 40, fly && d > 2.5, ign, og)
    face(me, m, dt, r.sp > 1 ? headingOf(m.v.x, m.v.z) : headingOf(o.x - p.x, o.z - p.z), 400)
    if (d < 2.6 && (ownerAir || p.y - r.g < 0.4)) s.call = { ...s.call, here: true }
    return { sp: r.sp, fly: m.air }
  }
  if (dOwn > F.warp && !s.goTo) { // far past sight: she swoops in beside you
    const tx = o.x - fx * F.gap + Math.cos(hy) * F.side, tz = o.z - fz * F.gap - Math.sin(hy) * F.side
    me.feetPosition = { x: tx, y: ownerAir ? o.y : groundAt(ctx, tx, o.y + 2, tz, ign), z: tz }; m.v = { x: 0, y: 0, z: 0 }; m.yaw = oyaw; face(me, m, 1, oyaw, 999)
    return { sp: 0, fly: ownerAir }
  }
  // 2. idle routine: you've stood still long enough
  if (!s.goTo && m.ostill > I.after) return idle(ctx, dt, me, m, o, og, fx, fz, hy, ign)
  // 3. follow: a spot behind and to your side, eased toward
  let tx = o.x - fx * F.gap + Math.cos(hy) * F.side, tz = o.z - fz * F.gap - Math.sin(hy) * F.side
  const go = s.goTo
  if (go && Math.hypot(o.x - go.x, o.z - go.z) > (F.leash ?? 250)) s.goTo = null
  else if (go) { tx = go.x; tz = go.z }
  const d = Math.hypot(tx - p.x, tz - p.z)
  if (d > F.overFly) m.flyHold = true; else if (d < 10 && !ownerAir) m.flyHold = m.flyHold && m.air && d > 4 ? m.flyHold : false
  const flying = (!go && ownerAir) || m.flyHold
  if (flying) m.rest = false; else if (d < 0.9 && Math.hypot(m.v.x, m.v.z) < 1) m.rest = true; else if (d > (F.rest ?? 3.5)) m.rest = false
  const top = flying ? F.fly : d < 7 ? F.walk : F.run
  const gy = flying ? (ownerAir && !go ? o.y : Math.max(og + 5, Math.min(Math.max(p.y, og + 8), og + 14))) : og
  const r = m.rest ? steer(ctx, dt, me, m, p.x, p.y, p.z, 0, 18, false, ign, og) : steer(ctx, dt, me, m, tx, gy, tz, top, flying ? 30 : 16, flying, ign, go ? go.y : ownerAir ? null : og)
  face(me, m, dt, r.sp > 0.8 ? headingOf(m.v.x, m.v.z) : headingOf(o.x - p.x, o.z - p.z), r.sp > 0.8 ? 300 : 70)
  if (!flying && r.sp < 0.05 && m.rest) m.still += dt; else m.still = 0
  return { sp: r.sp, fly: m.air }
}
// her idle repertoire. m.idle = { kind, t, ... }: one at a time, each ends itself and hands to the next
function nextIdle(ctx, m) {
  const k = m.shows ? I.cycle[Math.floor(ctx.random() * I.cycle.length)] : 'show'
  if (k === 'show') m.shows = (m.shows ?? 0) + 1
  m.idle = { kind: k, t: 0, ph: 'go' }
}
function idle(ctx, dt, me, m, o, og, fx, fz, hy, ign) {
  if (!m.idle) nextIdle(ctx, m)
  const q = m.idle, p = me.feetPosition; q.t += dt
  if (q.kind === 'show') {
    if (!q.C) { const c = { x: o.x + fx * I.show.ahead, z: o.z + fz * I.show.ahead }; q.C = { ...c, y: og + I.show.height }; q.a0 = Math.atan2(p.z - c.z, p.x - c.x); q.dir = ctx.random() < 0.5 ? 1 : -1 }
    const R = I.show.radius, C = q.C
    if (q.ph === 'go') { // climb to the circle's edge nearest her
      const sx = C.x + Math.cos(q.a0) * R, sz = C.z + Math.sin(q.a0) * R
      const r = steer(ctx, dt, me, m, sx, C.y, sz, 18, 26, true, ign)
      face(me, m, dt, r.sp > 1 ? headingOf(m.v.x, m.v.z) : m.yaw, 260, Math.max(-25, Math.min(25, m.v.y * 3)))
      if ((r.d < 2 && Math.abs(p.y - C.y) < 1.5) || q.t > 6) { q.ph = 'orbit'; q.t = 0; q.a0 = Math.atan2(p.z - C.z, p.x - C.x); ctx.emit('playSound', { clip: W.sounds.screech, position: p, volume: 0.6, pitch: 1.08, maxDistance: 70 }) }
      return { sp: r.sp, fly: true }
    }
    if (q.ph === 'orbit') { // one lap round the point in front of you, banked in
      const w = 2 * Math.PI / I.show.lap, a = q.a0 + q.dir * w * q.t
      const np = { x: C.x + Math.cos(a) * R, y: C.y + Math.sin(q.t * 1.7) * 0.6, z: C.z + Math.sin(a) * R }
      const tvx = -Math.sin(a) * q.dir * R * w, tvz = Math.cos(a) * q.dir * R * w
      m.v = { x: (np.x - p.x) / dt, y: (np.y - p.y) / dt, z: (np.z - p.z) / dt }; me.feetPosition = np; m.air = true
      face(me, m, dt, headingOf(tvx, tvz), 600, 0, I.show.bank * q.dir)
      if (q.t >= I.show.lap) { q.ph = 'loop'; q.t = 0; q.P = np; const L = Math.hypot(tvx, tvz); q.T = { x: tvx / L, z: tvz / L } }
      return { sp: R * w, fly: true }
    }
    if (q.ph === 'loop') { // a full vertical loop along her line
      const Rl = I.show.loopR, f = Math.min(1, q.t / I.show.loopTime), phi = f * 2 * Math.PI, ad = 1.2 + 2.4 * f // a little forward drift so it reads as a loop, not a wheel
      const np = { x: q.P.x + q.T.x * (Rl * Math.sin(phi) + ad), y: q.P.y + Rl * (1 - Math.cos(phi)), z: q.P.z + q.T.z * (Rl * Math.sin(phi) + ad) }
      m.v = { x: (np.x - p.x) / dt, y: (np.y - p.y) / dt, z: (np.z - p.z) / dt }; me.feetPosition = np; m.air = true
      m.yaw = headingOf(q.T.x, q.T.z); m.pitch = phi / RAD; m.roll = 0
      me.rotation = { yaw: m.yaw + (W.bodyYaw || 0), pitch: (m.pitch > 180 ? m.pitch - 360 : m.pitch) * I.pitchSign, roll: 0 }
      if (f >= 1) { m.pitch = 0; q.ph = 'home'; q.t = 0; ctx.emit('playSound', { clip: W.sounds.dash, position: np, volume: 0.5, maxDistance: 60 }) }
      return { sp: 12, fly: true, glide: f > 0.35 && f < 0.75 }
    }
    // home: glide down to your side and settle
    const hx = o.x + Math.cos(hy) * 3.5 - fx * 1.5, hz = o.z - Math.sin(hy) * 3.5 - fz * 1.5
    const dh = Math.hypot(hx - p.x, hz - p.z), r = steer(ctx, dt, me, m, hx, og, hz, 16, 20, dh > 3, ign, og)
    face(me, m, dt, r.sp > 0.8 ? headingOf(m.v.x, m.v.z) : headingOf(o.x - p.x, o.z - p.z), 240)
    if ((dh < 1 && !m.air && r.sp < 0.6) || q.t > 12) { if (!m.air) ctx.emit('playSound', { clip: W.sounds.land, position: p, volume: 0.6, maxDistance: 40 }); m.idle = { kind: 'watch', t: 0, until: 5 } }
    return { sp: r.sp, fly: m.air, glide: m.air && r.sp > 6 }
  }
  if (q.kind === 'patrol') { // a slow walk round you, stopping to look out
    const P = I.patrol
    if (q.a == null) { q.a = Math.atan2(p.z - o.z, p.x - o.x); q.dir = ctx.random() < 0.5 ? 1 : -1; q.wait = 0; q.legs = 0 }
    const gx = o.x + Math.cos(q.a) * P.radius, gz = o.z + Math.sin(q.a) * P.radius
    if (q.wait > 0) { q.wait -= dt; const r = steer(ctx, dt, me, m, p.x, og, p.z, 0, 8, false, ign, og); face(me, m, dt, headingOf(p.x - o.x, p.z - o.z) + Math.sin(q.t * 0.9) * 50, 40); return { sp: r.sp, fly: m.air } }
    const r = steer(ctx, dt, me, m, gx, og, gz, P.pace, 5, m.air && Math.hypot(gx - p.x, gz - p.z) > 6, ign, og)
    face(me, m, dt, r.sp > 0.3 ? headingOf(m.v.x, m.v.z) : m.yaw, 80)
    if (r.d < 0.8) { q.a += q.dir * P.step * RAD; q.legs++; if (ctx.random() < 0.45) q.wait = 1.5 + ctx.random() * 2.5 }
    if (q.t > P.time) nextIdle(ctx, m)
    return { sp: r.sp, fly: m.air }
  }
  if (q.kind === 'soar') { // up high, wide slow glide circles over you, then home
    const S = I.soar
    if (q.a == null) { q.a = Math.atan2(p.z - o.z, p.x - o.x); q.dir = ctx.random() < 0.5 ? 1 : -1 }
    if (q.t > S.time) { m.idle = { kind: 'show', t: 0, ph: 'home', C: { x: 0, y: 0, z: 0 } }; return { sp: 0, fly: true } }
    q.a += q.dir * (S.pace / S.radius) * dt
    const gx = o.x + Math.cos(q.a) * S.radius, gz = o.z + Math.sin(q.a) * S.radius
    const r = steer(ctx, dt, me, m, gx, og + S.height, gz, S.pace * 1.3, 10, true, ign)
    face(me, m, dt, r.sp > 1 ? headingOf(m.v.x, m.v.z) : m.yaw, 120, 0, 18 * q.dir)
    return { sp: r.sp, fly: true, glide: Math.abs(p.y - (og + S.height)) < 3 }
  }
  // watch: stands, looks about, then picks what's next
  const r = steer(ctx, dt, me, m, p.x, og, p.z, 0, 10, false, ign, og)
  if (q.look == null) q.look = m.yaw
  face(me, m, dt, q.look + Math.sin(q.t * 0.6) * 60, 45)
  if (q.t > (q.until ?? I.watch)) nextIdle(ctx, m)
  return { sp: r.sp, fly: m.air }
}
// the golden gryphon upload (2026-10-06) names its clips its own way; the old rig's names map onto them
// The upload's clips heave her body root (bone_08_key26) and her tail root (bone_07) apart: the tail root hangs off the
// rig's origin, not her body, so in Run it sinks 1.6 units away from her rump and the tail tears. Each clip plays under a
// pin: her body root at that clip's mean place, her tail root held at the Stand offset from it, so the tail rides her body.
// Ridden, the body root holds the Stand height in every clip, so the saddle never bobs or jumps under the rider.
const BODY = { Stand: [0, 0.6237, -0.1332], Walk: [0, 0.6216, -0.134], Run: [0, 2.1728, -0.5683], Fly_Flap: [0.0114, -1.3958, -0.1733], Fly_Glide: [0.0072, -1.4033, -0.1644] }
const TAIL = [0.0072, 1.5298, 1.2382] // bone_07 − bone_08_key26 in Stand, where the tail sits right
const pinFor = (clip, ridden) => {
  const b = ridden ? BODY.Stand : (BODY[clip] ?? BODY.Stand), t = [b[0] + TAIL[0], b[1] + TAIL[1], b[2] + TAIL[2]]
  return { name: 'pin-' + (ridden ? 'ride' : clip), tracks: [
    { bone: 'bone_08_key26', prop: 'position', times: [0, 1], values: [...b, ...b] },
    { bone: 'bone_07', prop: 'position', times: [0, 1], values: [...t, ...t] }] }
}
const FOLD = { name: 'wing-tuck', tracks: [ // shoulders swept back and down, elbows and wrists folded in (proofed on a standing copy)
  { bone: 'bone_16', prop: 'rotation', times: [0, 1], values: [0.2032, 0.6443, 0.2217, 0.7032, 0.2032, 0.6443, 0.2217, 0.7032] },
  { bone: 'bone_23', prop: 'rotation', times: [0, 1], values: [0, -0.866, 0, 0.5, 0, -0.866, 0, 0.5] },
  { bone: 'bone_36', prop: 'rotation', times: [0, 1], values: [0, 0.766, 0, 0.6428, 0, 0.766, 0, 0.6428] },
  { bone: 'bone_17', prop: 'rotation', times: [0, 1], values: [0.2032, -0.6443, -0.2217, 0.7032, 0.2032, -0.6443, -0.2217, 0.7032] },
  { bone: 'bone_24', prop: 'rotation', times: [0, 1], values: [0, 0.866, 0, 0.5, 0, 0.866, 0, 0.5] },
  { bone: 'bone_37', prop: 'rotation', times: [0, 1], values: [0, -0.766, 0, 0.6428, 0, -0.766, 0, 0.6428] }] }
const CLIP = { Idle: 'Stand', Walk: 'Walk', Run: 'Run', Fly: 'Fly_Flap', Glide: 'Fly_Glide' }
function pose(ctx, dt, me, m, sp, fly, dash, ridden) { // the model's own clips (art/griffin/build.py): Idle, Walk, Run, Fly, Glide
  const WG = W.wings
  let clip, speed
  if (fly) { if (dash) { clip = 'Glide'; speed = 1 } else { clip = 'Fly'; speed = sp > 4 ? WG.cruise : WG.hover } }
  else if (sp < 0.4) { clip = 'Idle'; speed = 1 }
  else if (sp < (m.clip === 'Run' ? 7 : 9)) { clip = 'Walk'; speed = Math.max(0.6, Math.min(2.2, sp / 3)) }
  else { clip = 'Run'; speed = Math.max(0.8, Math.min(2.2, sp / 13)) }
  speed = Math.round(speed * 10) / 10
  if (m.clip !== clip || m.speed !== speed) { m.clip = clip; m.speed = speed; me.anim.body = { clip: CLIP[clip] ?? clip, loop: 'loop', weight: 1, speed } }
  const pk = ridden ? 'ride' : CLIP[clip]
  if (m.pinned !== pk) { m.pinned = pk; me.anim.pin = { clip: pinFor(CLIP[clip], ridden), loop: 'loop', weight: 1, blend: 'override' } }
  const tuck = false // (creator 2026-10-06) her own ground clips carry the wings: no override fold
  if (m.tuck !== tuck) { m.tuck = tuck; me.anim.fold = null }
  if (clip === 'Idle' && m.still > 0.5 && !m.idle) ctx.sleep(0.1) // resting: the clip plays on, look again soon
}
function sounds(ctx, me, m, sp, fly) {
  const want = fly ? W.sounds.flap : sp > 5 ? W.sounds.gallop : null, cur = me.audio?.clip ?? null
  if (want !== cur) me.audio = want ? { clip: want, gain: fly ? 0.45 : 0.4, loop: true, spatial: true, maxDistance: 40 } : null
}
