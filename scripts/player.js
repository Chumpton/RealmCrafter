// The player's own movement: WASD relative to the camera's aim, jump, gravity — on the
// character controller. A body is three writes: feetPosition puts it there, velocity asks the
// controller to take it there (held until the next write — it slides, steps and grounds), forces
// push until null. Numbers live in lib/data/player.yml; gravity is the PLACE's
// (places/<p>/config.yaml gravity:), so a district that declares its own pulls on you the
// moment you step in.
import PLAYER from './lib/data/player.yml'
import { ST, drainMul, jumpFeet, feetToM } from './lib/data/stamina.js'
import { tpOn } from './lib/data/talents.js' // 3rd person: no jumping/running skills, no stamina (creator 2026-10-10)
import { levelOf } from './lib/skills-core.js'
import { LADDERS } from './lib/data/ladders.js'
import { HORSE } from './lib/data/horse.js'
import { raycast } from 'builtin/physics'
import { WYNX } from './lib/data/gryphon.js'
import { isWynx, summonWynx, mountWynx, dismountWynx, wynxInput, wynxStep, wynxCallStep } from './lib/wynx-ride.js'
// flight: tap window ms, horizontal × stride, climb m/s, ease per s
const FLY = { tap: 300, mul: 3, up: 7, ease: 6, sound: '/cdn/moodboard-lowpoly-cozy/sfx-soft-wind-whoosh-lift.mp3' }

// Snow (lane W3): nothing of it loads, reads or writes until place.state.snow.on (the creator's Winter test switch).
// Then each stride dabs the field under the stepping foot (sink = depth*(1-pack)*SNOW.foot.sink, pack += foot.pack),
// leaves a boot-print decal, and the walk multiplier eases to SNOW.speed at the feet (times the gear's MOVE SPEED).
let SF = null, sfLoading = false
function snowStep(ctx, w, vx, vz, dt) {
  if (ctx.place.state.snow?.on !== true) { if (w.snowMul !== undefined) { w.snowMul = undefined; w.stepDist = 0 } return false }
  if (ctx.self.isLocal === false) return false
  if (!SF) {
    if (!sfLoading) { sfLoading = true; Promise.all([import('./lib/snow-field.js'), import('./lib/data/snow.js')]).then(([f, d]) => { SF = { f, S: d.SNOW } }).catch(() => { sfLoading = false }) }
    return false
  }
  const { f, S } = SF, W = S.w3, p = ctx.self.feetPosition
  if (f.pending()) f.flush(ctx)
  const sp = Math.hypot(vx, vz)
  if (w.snowMul === undefined) { w.snowMul = 1; w.stepDist = W.stride }
  if (!ctx.self.grounded || sp < 0.2) return f.pending() > 0
  w.stepDist = (w.stepDist ?? 0) + sp * dt
  if (w.stepDist < W.stride) return true
  w.stepDist = 0
  w.foot = -(w.foot ?? 1)
  const hx = vx / sp, hz = vz / sp, x = p.x - hz * W.side * w.foot, z = p.z + hx * W.side * w.foot
  if (f.inHall(x, z)) { w.snowMul = 1; return true }
  const depth = f.depthAt(ctx, x, z)
  let target = 1
  for (let i = 0; i < S.speed.length; i++) {
    const [d1, m1] = S.speed[i]
    if (depth <= d1) { if (i === 0) { target = m1; break } const [d0, m0] = S.speed[i - 1]; target = m0 + (m1 - m0) * (depth - d0) / (d1 - d0); break }
    target = m1
  }
  w.snowMul += (target - w.snowMul) * Math.min(1, W.speedEase * 4)
  if (depth < W.minDepth) return true
  const pack = f.packAt(ctx, x, z)
  if (f.inZone(x, z)) f.dab(ctx, x, z, -depth * (1 - pack) * S.foot.sink, S.foot.radius, { pack: S.foot.pack })
  const P = W.print, deep = Math.min(1, depth / 0.3)
  ctx.decal?.({ x, y: p.y + 0.02, z }, { x: 0, y: 1, z: 0 }, {
    texture: P.tex, size: [P.size[0], P.size[1]], rotation: Math.atan2(-hx, -hz) * 180 / Math.PI, lifetime: P.life, fade: P.fade,
    opacity: P.opacity + (P.deepOpacity - P.opacity) * deep * (1 - pack), audience: { nearby: { x, y: p.y, z }, radius: P.range },
  })
  return true
}

// The keys' intent is this machine's alone: onInput writes it, update() reads it, nobody else does —
// and a value written to state rides the wire and the save on every tick it changes (the intent turns
// with the camera, so a running player would send a row a tick). ctx.session is the room-life scratch:
// never on the wire, gone with the room. One slot per body.
function walkOf(ctx) {
  const walks = (ctx.session.walk ??= {})
  return (walks[ctx.self.id] ??= {})
}

// an energy potion's doses (skills-player.js sends it): stamina back, capped at the bar
export const ears = {
  wynxRide: (ctx, p) => { // E beside your own Wynx (scripts/lib/player-feel-core.js): back on her
    if (ctx.self.isLocal === false) return
    const me = ctx.self, w = walkOf(ctx), h = p?.id ? ctx.getObject(p.id) : null
    if (!h || h.state?.owner !== me.id || me.state.mount || me.parent || ctx.now() - (w.wynxOffAt ?? 0) < 500) return
    mountWynx(ctx, w, h.id, !me.grounded); w.wynxOnAt = ctx.now()
    ctx.emit('playSound', { clip: WYNX.sounds.screech, position: me.worldFeetPosition ?? me.feetPosition, volume: 0.5, pitch: 1.2, maxDistance: 40 })
  },
  energy: (ctx, p) => { if (ctx.self.isLocal === false) return; const st = stamOf(ctx); st.v = Math.min(ST.max, st.v + Math.max(0, Math.min(100, p?.amount | 0))); stamHud(ctx, st) },
}
export function onSpawn(ctx) {
  // The body arrives dressed: in the model templates/player.js names, or — when the template names none — in the
  // card's avatar (the player's own character), bare. The avatar takes the clips this game plays here (add a seat's
  // Sit, an emote's name to the list); a model the template chose is left as the template spelled it.
  const worn = ctx.self.model?.id ?? ctx.self.model // a bare id, or { id, … } when the model carries parts or an offset
  if (ctx.self.avatarUrl && typeof worn === 'string' && worn.split('?')[0] === ctx.self.avatarUrl.split('?')[0]) {
    ctx.self.model = ctx.self.avatarUrl + '?animations=Idle,Walk,Run'
  }
}


// STAMINA (MMO prompt 2/6): this machine's own, in ctx.session like the walk intent — never on the wire.
// The HUD reads ctx.session.stamHud (written only when a shown number moves). XP goes to skills-player.js,
// the one writer of player.state.skills, as an emit to this body.
function stamOf(ctx) { const w = walkOf(ctx); return (w.stam ??= { v: ST.max, last: -1e9, forced: false, runAcc: 0, runT: 0, lastJumpXp: -1e9 }) }
const skLv = (ctx, k) => levelOf(ctx.self.state?.skills?.[k] | 0)
function stamHud(ctx, st) {
  const want = { v: Math.round(st.v * 10) / 10, run: !!(ctx.self.state?.runOn), forced: st.forced, running: !!st.running }
  const h = ctx.session.stamHud
  if (!h || Math.abs(h.v - want.v) >= 0.5 || h.run !== want.run || h.forced !== want.forced || h.running !== want.running || (want.v === ST.max && h.v !== ST.max)) ctx.session.stamHud = want
}
function giveXp(ctx, skill, tenths) { if (tenths > 0) ctx.emit('skillXp', { skill, tenths: Math.round(tenths) }, { to: ctx.self.id }) }

// The settings gear's MOVE SPEED (player.state.speed, 1..5 = 100%..500%) scales the stride and its ease alike.
function speedOf(ctx) { const m = ctx.self.state?.speed; return typeof m === 'number' && m >= 1 && m <= 5 ? m : 1 }

export function onInput(ctx, input) {
  if (ctx.self.state?.te?.open && ctx.self.isEditor) input = { ...input, axes: { ...input.axes, moveX: 0, moveZ: 0 }, held: {}, pressed: {} } // TERRAIN EDITOR mode: the fly camera takes the keys, the body stays parked
  // HORSE (creator ask 2026-10-04: "hitting Z to ride own horse in 3rd person mode"): Z calls your horse under you; she takes your input until Z again (scripts/den-horse.js)
  // Oct 4 rebuild ("fix horse from ground up"): the horse is the RIDER's: a child of your own body, spawned by your own
  // machine, so nothing crosses machines and no seat is handed over. Your body stays the thing that moves (walls still
  // stop you); it rides a saddle-height over the ground and sits; the camera goes third person (scripts/camera.js).
  if (input.pressed.horse && !input.held?.leCtrl && !ctx.self.state.holding && !ctx.session.guitarPlay?.[ctx.self.id]?.on) { toggleMount(ctx); return }
  // (Campton 2026-10-06 "give campton double tap gryphon back") a saved mount whose body is gone (a session gryphon dies on
  // a reload, player.state.mount survives) left him "riding" nothing, so double-tap never reached summonWynx: clear it after 1 s gone
  if (ctx.self.state.mount && !mountOf(ctx)) {
    const s = ctx.session, t = s.mountGoneAt ??= ctx.now()
    if (ctx.now() - t > 1000) { s.mountGoneAt = null; ctx.self.state.mount = null; if (ctx.self.parent && !ctx.getObject(ctx.self.parent.id)) ctx.self.parent = null }
  } else ctx.session.mountGoneAt = null
  if (ctx.self.state.mount) { if (isWynx(mountOf(ctx))) wynxInput(ctx, input, walkOf(ctx)); else rideInput(ctx, input); return }
  const mul = speedOf(ctx) * (walkOf(ctx).snowMul ?? 1)
  if (Math.hypot(input.axes.moveX ?? 0, input.axes.moveZ ?? 0) > 0.1) ctx.session.moveAt = ctx.now() // when you last steered yourself (combat-player.js leaves your swing timer alone)
  if (ctx.self.state.walkTo && !ctx.self.state.walkTo.assist && Math.hypot(input.axes.moveX ?? 0, input.axes.moveZ ?? 0) > 0.1) { ctx.self.state.walkTo = null; ctx.self.state.pendingInteract = null; ctx.self.state.walkCancel = ctx.now() } // manual movement cancels a click-to-walk and its queued interaction
  const facingSin = input.axes.aimYawSin ?? 0
  const facingCos = input.axes.aimYawCos ?? 1

  const moveX = input.axes.moveX ?? 0
  const moveZ = input.axes.moveZ ?? 0
  const mag = Math.hypot(moveX, moveZ)
  const nx = mag > 1 ? moveX / mag : moveX
  const nz = mag > 1 ? moveZ / mag : moveZ

  // Where the keys point, at walking speed — the INTENT update() eases the body toward every tick.
  // Written as intent, never straight into velocity: a key is a level (full or nothing) and a body
  // that jumps to 6 m/s the tick a key lands overshoots every tap; the ease makes a tap a nudge.
  const st = stamOf(ctx)
  if (input.pressed.runToggle) ctx.self.state.runOn = !ctx.self.state.runOn
  const wantRun = ST.on && (ctx.self.state.runOn || input.held.runHold) && !st.forced && st.v > 0 && Math.hypot(nx, nz) > 0.1
  st.running = !!wantRun
  const pace = wantRun ? ST.runSpeed : PLAYER.walkSpeed
  walkOf(ctx).moveIntent = {
    x: (facingCos * nx - facingSin * nz) * pace * mul,
    z: -(facingSin * nx + facingCos * nz) * pace * mul,
  }
  walkOf(ctx).keyIntent = { ...walkOf(ctx).moveIntent } // the keys alone: a fight's walk-in blends these, never its own last answer

  // FLY (creator ask 2026-10-04): a second space inside FLY.tap ms toggles flight. Airborne: no gravity, space rises,
  // C / Ctrl sinks, WASD flies at FLY.mul × the stride. Touching ground while sinking lands you. This machine's alone (session).
  const w = walkOf(ctx)
  if (input.pressed.jump) {
    const now = ctx.now()
    // (creator 2026-10-04) double-tap-space flight removed: god mode flies. (Campton 2026-10-05) double-tap space calls Wynx, the gryphon
    if (WYNX.noTap?.includes(ctx.self.userId)) { /* forge 2026-10-05: no double-tap gryphon for him */ }
    else if (now - (w.lastJumpTap ?? -1e9) < WYNX.tap) { w.lastJumpTap = -1e9; st.jump = null; if (summonWynx(ctx, w)) { w.wynxOnAt = now; return } }
    else w.lastJumpTap = now
  }
  w.climbJump = !!input.held.jump
  if (w.fly) w.fly = false // anyone mid-flight when it was removed lands
  if (w.fly) {
    w.moveIntent = { x: w.moveIntent.x * FLY.mul / (st.running ? 1 : 1), z: w.moveIntent.z * FLY.mul }
    w.flyY = (input.held.jump ? FLY.up : 0) - (input.held.flyDown ? FLY.up : 0)
    return
  }
  // The jump is your y; x and z stay what the body did last tick (y reads 0 on the ground).
  if (input.pressed.jump && ctx.self.grounded) {
    const v = ctx.self.velocity, g = Math.abs(ctx.place.gravity?.y ?? 24)
    let jumpV = PLAYER.jumpSpeed
    if (ST.on && !tpOn(ctx.self.state)) {
      const L = skLv(ctx, 'jumping'), cost = ST.jumpCost * drainMul(L), here = ctx.self.worldFeetPosition ?? ctx.self.feetPosition
      const full = st.v >= cost
      jumpV = Math.sqrt(2 * g * feetToM(full ? jumpFeet(L) : jumpFeet(1))) // a tiny level-1 hop when the bar can't pay
      if (full) { st.v -= cost; st.last = ctx.now() }
      st.jump = { x: here.x, y: here.y, z: here.z, xp: full, air: false }
    }
    ctx.self.velocity = { x: v.x, y: jumpV, z: v.z }
  }
}

function mountOf(ctx) { const id = ctx.self.state.mount; return id ? ctx.getObject(id) : null }
function toggleMount(ctx) {
  const me = ctx.self, here = me.worldFeetPosition ?? me.feetPosition
  if (me.state.mount && isWynx(mountOf(ctx))) { dismountWynx(ctx, walkOf(ctx)); return } // Z on Wynx: off her back, she stays
  if (me.state.mount) {
    const h = mountOf(ctx); if (h) ctx.destroy(h.id)
    me.state.mount = null
    me.velocity = { x: 0, y: -2, z: 0 }
    ctx.emit('playSound', { clip: HORSE.sounds.snort, position: here, volume: 0.6, pitch: 0.9, maxDistance: 20 })
    return
  }
  if (me.parent) return // aboard a ship or seated: no horse here
  if (WYNX.noTap?.includes(me.userId)) { if (me.state.wynx) me.state.wynx = null; return } // (forge 2026-10-05) Z summons no mount for him; Z still gets him off one
  const w = walkOf(ctx); w.fly = false; me.state.walkTo = null
  const yaw0 = me.yaw ?? 0
  const id = ctx.spawn({ template: 'templates/den-horse.js#denHorse', scope: 'session', interpolation: null, feetPosition: { x: here.x, y: here.y, z: here.z }, rotation: { yaw: yaw0 }, state: { kind: 'ride', owner: me.id } })
  me.state.mount = id
  w.ride = { vy: 0, air: 0, yaw: me.yaw ?? 0 }
  ctx.emit('playSound', { clip: HORSE.sounds.neigh, position: here, volume: 0.7, maxDistance: 40 })
  ctx.emit('toast', { message: 'WASD ride · Shift gallop · space jump · Z get off', duration: 3 }, { audience: { player: me.id } })
}
function rideInput(ctx, input) {
  const w = walkOf(ctx), O = HORSE.ride, mx = input.axes.moveX ?? 0, mz = input.axes.moveZ ?? 0, m = Math.hypot(mx, mz)
  const nx = m > 1 ? mx / m : mx, nz = m > 1 ? mz / m : mz, s = input.axes.aimYawSin ?? 0, c = input.axes.aimYawCos ?? 1
  const pace = (input.held.runHold || ctx.self.state.runOn) ? O.gallop : O.walk
  w.moveIntent = { x: (c * nx - s * nz) * pace, z: -(s * nx + c * nz) * pace }
  const r = w.ride ??= { vy: 0, air: 0 }
  if (input.pressed.jump && r.air <= 0) { r.vy = O.jump; r.air = 1 }
}
// Mounted: the body glides at saddle height over whatever is underfoot, faces where it goes, and the horse's legs read its speed.
function rideStep(ctx, dt) {
  const me = ctx.self, w = walkOf(ctx), O = HORSE.ride, r = w.ride ??= { vy: 0, air: 0 }
  const h = mountOf(ctx)
  if (!h) { me.state.mount = null; return } // the horse is gone (a reload, a crossing): back on foot
  const v = me.velocity, it = w.moveIntent ?? { x: 0, z: 0 }, k = Math.min(1, O.ease * dt)
  const fin = (n) => (Number.isFinite(n) ? n : 0) // a NaN intent or velocity (a fresh mount, dt 0) must never reach the horse's state
  const vx = fin(fin(v.x) + (fin(it.x) - fin(v.x)) * k), vz = fin(fin(v.z) + (fin(it.z) - fin(v.z)) * k)
  const p = me.worldFeetPosition ?? me.feetPosition
  const hit = raycast(ctx, { x: p.x, y: p.y + 0.5, z: p.z }, { x: 0, y: -1, z: 0 }, { distance: 6, physicsOnly: true, ignoreEntities: [me.id, h.id] })
  const t = ctx.place.terrain?.heightAt?.(p.x, p.z)
  const ground = Math.max(hit ? hit.position.y : -1e9, t ?? -1e9, -0.6)
  const seatY = (ground > -1e8 ? ground : p.y - HORSE.seat.y) + HORSE.seat.y
  let vy
  if (r.air > 0) { r.vy -= 22 * dt; vy = r.vy; if (p.y + vy * dt <= seatY && r.vy < 0) { r.air = 0; r.vy = 0; vy = (seatY - p.y) * O.lift } }
  else vy = Math.max(-25, Math.min(25, (seatY - p.y) * O.lift))
  me.velocity = { x: vx, y: vy, z: vz }
  const sp = Math.hypot(vx, vz)
  if (sp > 0.4) { // turn toward the way she runs, capped
    const want = Math.atan2(-vx, -vz) * 180 / Math.PI, cur = me.yaw ?? want, d = ((want - cur + 540) % 360) - 180
    const step = Math.max(-O.turn * dt, Math.min(O.turn * dt, d)); me.yaw = cur + step
  }
  const kn = Math.round((Number.isFinite(sp) ? sp : 0) * 2); if (h.state.sp !== kn) h.state.sp = kn // her legs read this (scripts/den-horse.js)
  // she stands under the saddle where the body will be, facing the way it faces
  const yaw = (me.yaw ?? 0) - (PLAYER.modelYaw || 0)
  h.feetPosition = { x: p.x + vx * dt, y: p.y + vy * dt - HORSE.seat.y, z: p.z + vz * dt }; h.rotation = { yaw }
}

// The catapult's flight (scripts/catapult.js writes state.fling): the body rides a parabola from the bucket to its
// landing on the room clock, steered by velocity so the controller still collides; the keys wait until it lands.
function flingStep(ctx, dt) {
  const F = ctx.self.state.fling, now = ctx.now(); if (now < F.t0) { ctx.self.feetPosition = { ...F.from }; ctx.self.velocity = { x: 0, y: 0, z: 0 }; return true } // in the bucket: held on its floor
  const at = (u) => { u = Math.min(1, Math.max(0, u)); return { x: F.from.x + (F.to.x - F.from.x) * u, z: F.from.z + (F.to.z - F.from.z) * u, y: F.from.y + (F.to.y - F.from.y) * u + 4 * F.apex * u * (1 - u) } }
  const u = (now - F.t0) / (F.dur * 1000), p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition
  if (u >= 1 || (u > 0.6 && ctx.self.grounded)) {
    ctx.self.state.fling = null; ctx.self.velocity = { x: 0, y: -2, z: 0 }; walkOf(ctx).moveIntent = { x: 0, z: 0 }
    ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-heavy-body-landing-thud-dirt.mp3', position: p, volume: 0.9 })
    ctx.emit('fx', { position: p, script: `fx
pop dust burst=22..30 on=disc(.5) life=.6..1.1 v=up(.4..1)+sdir()*(1.5..3) size=.25..0.4 acc=buoy(.3)+drag(2) col=<.6,.53,.42> a=0>.4:.35>.7:.15>0 sz=$size*(.6>2) rot=spin(.3) r=sprite(smoke-puff,alpha)` })
    ctx.emit('screenShake', { intensity: 0.5, duration: 0.3 }, { audience: { player: ctx.self.id } })
    ctx.emit('toast', { message: 'welcome to the longhouse', duration: 2 }, { audience: { player: ctx.self.id } })
    return true
  }
  const q = at(u + dt / F.dur), k = 1 / Math.max(dt, 1 / 60)
  ctx.self.velocity = { x: (q.x - p.x) * k, y: (q.y - p.y) * k, z: (q.z - p.z) * k }
  return true
}
export function update(ctx, dt) {
  if (ctx.self.state.fling && !ctx.self.parent && !ctx.self.state.mount) return void flingStep(ctx, dt)
  { const wc = walkOf(ctx); if (wc.wynxCall && !ctx.self.state.mount) wynxCallStep(ctx, wc) } // a called Wynx: on her back when she lands beside you
  if (ctx.self.state.mount) { const mt = mountOf(ctx); if (isWynx(mt)) return wynxStep(ctx, dt, walkOf(ctx), PLAYER.modelYaw || 0); if (!ctx.self.parent) return rideStep(ctx, dt) } // on Wynx you're her child (WoW-style) and the step moves her
  // Seated (attached to a hull, a mount): the seat carries the body — the legs rest.
  if (ctx.self.parent) return
  // What the body did last tick; y reads 0 on the ground.
  const v = ctx.self.velocity
  // The stride: ease the ground velocity toward the keys' intent — acceleration while the keys point
  // the way the body already moves, deceleration back to rest when none is down or the keys reverse
  // (both m/s², lib/data/player.yml). One capped step per tick, so a held key reaches walkSpeed in
  // walkSpeed / acceleration seconds and a release stops in walkSpeed / deceleration; a body stopped
  // by a wall reads 0 and pushes again from there.
  const w = walkOf(ctx)
  const lv = ctx.self.state.levitate // the Levitate emote (creator 2026-10-06): float 1.3 m up with a slow bob; a move key ends it and you drift down
  if (lv) {
    const it = w.moveIntent ?? { x: 0, z: 0 }
    if (Math.hypot(it.x, it.z) > 0.1 || w.fly) ctx.self.state.levitate = null
    else { const f = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, rise = Math.min(1, (ctx.now() - lv.at) / 1800), ty = lv.y + 1.3 * rise + Math.sin(ctx.now() / 700) * .1 * rise
      ctx.self.velocity = { x: 0, y: (ty - f.y) * 4, z: 0 }; return }
  }
  if (w.fly) {
    const it = w.moveIntent ?? { x: 0, z: 0 }, k = Math.min(1, FLY.ease * dt), vy = w.flyY ?? 0
    if (ctx.self.grounded && vy < 0) { w.fly = false; ctx.emit('toast', { message: 'landed', duration: 1.2 }, { audience: { player: ctx.self.id } }) }
    else { ctx.self.velocity = { x: v.x + (it.x - v.x) * k, y: v.y + (vy - v.y) * k, z: v.z + (it.z - v.z) * k }; return }
  }
  if (climbStep(ctx, w, v)) return
  const wt = ctx.self.state.walkTo // right-click menu "Walk here": stroll to the spot at walking pace, stop when there, when a key is pressed, or after a while
  if (wt) {
    const f = ctx.self.worldFeetPosition ?? ctx.self.feetPosition, ex = wt.x - f.x, ez = wt.z - f.z, d = Math.hypot(ex, ez)
    if (d < 0.7 || ctx.now() > wt.until) { ctx.self.state.walkTo = null; w.moveIntent = { x: 0, z: 0 } }
    else if (wt.assist) { // a fight's walk-in: the route at your own pace (run if run is on), your keys bend it, never break it
      const run = ST.on && ctx.self.state.runOn && !stamOf(ctx).forced && stamOf(ctx).v > 0, pc = (run ? ST.runSpeed : PLAYER.walkSpeed) * speedOf(ctx)
      const k = w.keyIntent ?? { x: 0, z: 0 }, km = Math.hypot(k.x, k.z), mx = ex / d * pc + (km > 0.1 ? k.x * 0.6 : 0), mz = ez / d * pc + (km > 0.1 ? k.z * 0.6 : 0), mm = Math.hypot(mx, mz) || 1
      stamOf(ctx).running = run; w.moveIntent = { x: mx / mm * pc, z: mz / mm * pc }
    }
    else { // a click-to-move: runs when the run orb is lit (and stamina holds), walks when it is off
      const run = ST.on && ctx.self.state.runOn && !stamOf(ctx).forced && stamOf(ctx).v > 0
      const pc = (run ? ST.runSpeed : PLAYER.walkSpeed * (wt.pace > 0 ? Math.min(2, wt.pace) : 1)) * speedOf(ctx)
      stamOf(ctx).running = run; w.moveIntent = { x: ex / d * pc, z: ez / d * pc } }
  }
  const intent = w.moveIntent ?? { x: 0, z: 0 }
  const along = intent.x * v.x + intent.z * v.z > 0 || (v.x === 0 && v.z === 0 && (intent.x !== 0 || intent.z !== 0))
  const step = (along ? PLAYER.acceleration : PLAYER.deceleration) * speedOf(ctx) * dt
  const dx = intent.x - v.x
  const dz = intent.z - v.z
  const gap = Math.hypot(dx, dz)
  const k = gap > step ? step / gap : 1
  const vx = v.x + dx * k
  const vz = v.z + dz * k
  // Gravity is yours: the held velocity walks the body; bend its y every tick.
  ctx.self.velocity = { x: vx, y: v.y + ctx.place.gravity.y * dt, z: vz }
  const snowBusy = snowStep(ctx, walkOf(ctx), vx, vz, dt)
  // Standing on the ground with no word to walk: nothing changes until something moves the body or a key
  // is pressed — both wake this update (a row of the body written, or onInput running).
  const restful = staminaStep(ctx, dt)
  if (ctx.self.grounded && vx === 0 && vz === 0 && intent.x === 0 && intent.z === 0 && !snowBusy && restful) ctx.sleep()
}

// Drain, regen, the forced walk, and both skills' XP, measured from where the body really went
// (a run into a wall reads ~0 m/s and earns nothing). Returns true when nothing is left to do.
function staminaStep(ctx, dt) {
  if (!ST.on || dt <= 0) return true
  if (tpOn(ctx.self.state)) { const s0 = stamOf(ctx); s0.v = ST.max; s0.forced = false; s0.jump = null; return true } // 3rd person: run and jump freely
  const st = stamOf(ctx), now = ctx.now(), p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition
  const lp = st.lastP; st.lastP = { x: p.x, y: p.y, z: p.z }
  const moved = lp ? Math.hypot(p.x - lp.x, p.z - lp.z) / dt : 0
  const runL = skLv(ctx, 'running')
  if (st.running && moved > 0.3) {
    st.v = Math.max(0, st.v - ST.runDrain * drainMul(runL) * dt); st.last = now
    if (moved >= ST.runXpFrac * ST.runSpeed * speedOf(ctx) * (walkOf(ctx).snowMul ?? 1) && moved < ST.runSpeed * speedOf(ctx) * 3) {
      st.runAcc += (ST.runXp[0] + ST.runXp[1] * runL) * 10 * dt; st.runT += dt
      if (st.runT >= 1) { giveXp(ctx, 'running', Math.floor(st.runAcc)); st.runAcc -= Math.floor(st.runAcc); st.runT = 0 }
    }
    if (st.v <= 0) { st.forced = true; st.running = false }
  } else if (now - st.last >= ST.regenDelayMs && st.v < ST.max) {
    st.v = Math.min(ST.max, st.v + (moved > 0.3 ? ST.regenWalk : ST.regenStill) * dt)
  }
  if (st.forced && st.v >= ST.forcedUntil) st.forced = false
  // a jump lands: valid = far enough or high enough, and past the gap since the last paying one
  const j = st.jump
  if (j) {
    if (!ctx.self.grounded) j.air = true
    else if (j.air) {
      st.jump = null
      const far = Math.hypot(p.x - j.x, p.z - j.z) >= ST.jumpMinDist, up = p.y - j.y >= ST.jumpMinRise
      if (j.xp && (far || up) && now - st.lastJumpXp >= ST.jumpXpGapMs) { st.lastJumpXp = now; giveXp(ctx, 'jumping', (ST.jumpXp[0] + ST.jumpXp[1] * skLv(ctx, 'jumping')) * 10) }
    }
  }
  stamHud(ctx, st)
  return st.v >= ST.max && !st.forced && !st.jump
}

// LADDERS (scripts/lib/data/ladders.js): inside a ladder's reach, keys into it (or space held) climb at L.speed, keys away
// climb down, nothing held clings; past the top the body hops in onto the landing. Returns true while it owns the velocity.
function climbStep(ctx, w, v) {
  const p = ctx.self.worldFeetPosition ?? ctx.self.feetPosition
  for (const L of LADDERS) {
    const span = L.top.y - L.foot.y, t = (p.y - L.foot.y) / span
    if (t < -0.05 || t > 1.02) continue
    const cx = L.foot.x + (L.top.x - L.foot.x) * Math.max(0, t), cz = L.foot.z + (L.top.z - L.foot.z) * Math.max(0, t)
    const rx = p.x - cx, rz = p.z - cz, out = rx * L.out.x + rz * L.out.z, side = Math.abs(rx * -L.out.z + rz * L.out.x)
    if (out < -0.2 || out > L.reach || side > L.side) continue
    const it = w.moveIntent ?? { x: 0, z: 0 }, im = Math.hypot(it.x, it.z), into = im > 0.1 ? -(it.x * L.out.x + it.z * L.out.z) / im : 0
    const up = into > 0.5 || w.climbJump, down = into < -0.5 && !ctx.self.grounded && t > 0.03 // at a foot there is nothing to climb down to: a walker crossing a landing past the next flight is not grabbed
    if (!up && !down && (ctx.self.grounded || t >= 0.99 || t < 0.03)) return false
    if (t >= 0.99 && up) { ctx.self.velocity = { x: -L.out.x * L.hopIn, y: L.hopUp, z: -L.out.z * L.hopIn }; return true }
    const pull = (L.stand - out) * 4 // hold the body a hand off the rungs
    ctx.self.velocity = { x: L.out.x * pull, y: up ? L.speed : down ? -L.speed : 0, z: L.out.z * pull }
    return true
  }
  return false
}
