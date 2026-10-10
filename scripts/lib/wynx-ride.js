// Riding Wynx (creator ask 2026-10-05). The RIDER's body is the thing that moves, like the Z horse (scripts/player.js):
// it glides at saddle height, walls still stop it, and Wynx stands under the saddle each tick. Off her back she follows
// her owner on her own (scripts/gryphon.js). All of this runs on the rider's machine; working memory lives in w.wynx.
import { raycast } from 'builtin/physics'
import { WYNX as W, WYNX_FX } from './data/gryphon.js'
const RAD = Math.PI / 180
export const isWynx = (h) => !!h && (h.tags || []).includes('wynx')
const here = (me) => me.worldFeetPosition ?? me.feetPosition
const toast = (ctx, message, duration = 2.2) => ctx.emit('toast', { message, duration }, { audience: { player: ctx.self.id } })

// double-tap space: she comes to you (spawned the first time) and you're on her back
export function summonWynx(ctx, w) {
  const me = ctx.self
  if (me.state.mount || me.parent || me.state.holding) return false
  const p = here(me), yaw = me.yaw ?? 0
  let h = me.state.wynx ? ctx.getObject(me.state.wynx) : null
  // (Campton 2026-10-09) she has to come to you: away (or not yet here), she flies in and you hop on when she lands at your side
  const hp0 = h ? (h.worldFeetPosition ?? h.feetPosition) : null
  if (!h || Math.hypot(hp0.x - p.x, hp0.z - p.z) > 4 || Math.abs(hp0.y - p.y) > 2.5) {
    if (!h) { const C = W.call.from, yr = yaw * RAD
      const id = ctx.spawn({ template: 'templates/gryphon.js#gryphon', scope: 'session', interpolation: { teleportThreshold: 60 }, feetPosition: { x: p.x + Math.sin(yr) * C.back, y: p.y + C.up, z: p.z + Math.cos(yr) * C.back }, rotation: { yaw: yaw + (W.bodyYaw || 0) }, state: { owner: me.id, ridden: false, call: { at: ctx.now() } } })
      me.state.wynx = id; h = ctx.getObject(id)
    } else { h.state.call = { at: ctx.now() }; h.state.goTo = null }
    w.wynxCall = ctx.now()
    ctx.emit('playSound', { clip: W.sounds.screech, position: hp0 ?? p, volume: 0.9, maxDistance: 120 })
    toast(ctx, 'Wynx is coming…', 2)
    return true
  }
  if (!h) {
    const id = ctx.spawn({ template: 'templates/gryphon.js#gryphon', scope: 'session', interpolation: { teleportThreshold: 60 }, /* (Campton 2026-10-09 'jaggedy') null drew her tick-to-tick steps raw; smoothed now */ feetPosition: { x: p.x, y: p.y, z: p.z }, rotation: { yaw: yaw + (W.bodyYaw || 0) }, state: { owner: me.id, ridden: true } })
    me.state.wynx = id; h = ctx.getObject(id)
  } else { h.feetPosition = { x: p.x, y: p.y, z: p.z }; h.rotation = { yaw: yaw + (W.bodyYaw || 0) } }
  mountWynx(ctx, w, me.state.wynx, !me.grounded)
  ctx.emit('playSound', { clip: W.sounds.screech, position: p, volume: 0.8, maxDistance: 70 })
  ctx.emit('fx', { position: { x: p.x, y: p.y + 1.2, z: p.z }, script: WYNX_FX })
  toast(ctx, 'Wynx! WASD · space jump, space again to fly · C down · hold Shift sprint · E get off', 4)
  return true
}
export function mountWynx(ctx, w, id, airborne) {
  const me = ctx.self, h = ctx.getObject(id); if (!h) return
  const hp = h.worldFeetPosition ?? h.feetPosition
  me.state.walkTo = null; w.fly = false
  me.state.mount = id; h.state.ridden = true
  if (h.parent) h.parent = null
  const hy = ((typeof h.rotation === 'number' ? h.rotation : h.rotation?.yaw) ?? ((me.yaw ?? 0) + (W.bodyYaw || 0))) - (W.bodyYaw || 0)
  w.wynx = { vy: 0, vx: 0, vz: 0, yaw: hy, air: airborne ? 1 : 0, fly: !!(airborne || h.state.fly), dashUntil: 0, dashCd: 0, up: 0 }
  h.feetPosition = { x: hp.x, y: hp.y, z: hp.z }
  me.velocity = { x: 0, y: 0, z: 0 }
  seatRider(me, h)
}
// WoW's way: the mount is the body that moves and the rider is her child, seated at the saddle. Every machine draws the
// rider from her own drawn pose, so the two can never drift apart, lead or lag, idle or flying.
function seatRider(me, h, fly = !!h.state?.fly) {
  const k = 1 / (h.scale?.y ?? h.scale ?? 1) // her scale reaches her children: the rider keeps his own size
  if ((me.parent?.id ?? me.parent) !== h.id) me.parent = h.id
  if (Math.abs((me.scale?.y ?? me.scale ?? 1) - k) > 1e-3) me.scale = k
  const s = fly ? W.seat.fly : W.seat.stand // her local units (her model faces +Z): stand = Stand clip back, fly = hips-pinned glide back
  me.feetPosition = { x: 0, y: s.y, z: s.fwd }
  me.rotation = { yaw: W.bodyYaw || 0 }
  me.state.wynxSeat = fly ? 'fly' : 'stand'
}
export function dismountWynx(ctx, w) {
  const me = ctx.self, h = me.state.mount ? ctx.getObject(me.state.mount) : null, p = here(me), yaw = (me.yaw ?? 0) * RAD
  const ry = h ? (w.wynx?.yaw ?? ((me.yaw ?? 0))) : (me.yaw ?? 0)
  me.state.mount = null; w.wynxOffAt = ctx.now()
  if (me.parent) { me.parent = null; me.scale = 1 }
  me.yaw = ry
  if (h) { h.state.ridden = false; h.state.dash = false; h.state.sp = 0; h.state.fly = false } // off her back she stands free where she is
  const off = { x: p.x + Math.cos(yaw) * W.stepOff, z: p.z - Math.sin(yaw) * W.stepOff }
  const g = ctx.place.terrain?.heightAt?.(off.x, off.z)
  me.feetPosition = { x: off.x, y: Math.max(g ?? -1e9, p.y - 1) + 0.1, z: off.z }
  me.velocity = { x: 0, y: -2, z: 0 }
}
export function wynxInput(ctx, input, w) {
  const me = ctx.self, r = w.wynx ??= { vy: 0, air: 0, fly: false, dashUntil: 0, dashCd: 0, up: 0 }, now = ctx.now()
  if (input.pressed.interact && now - (w.wynxOnAt ?? 0) > 350) { dismountWynx(ctx, w); return }
  const mx = input.axes.moveX ?? 0, mz = input.axes.moveZ ?? 0, m = Math.hypot(mx, mz)
  const nx = m > 1 ? mx / m : mx, nz = m > 1 ? mz / m : mz, s = input.axes.aimYawSin ?? 0, c = input.axes.aimYawCos ?? 1
  const pace = r.fly ? W.fly : W.run
  w.moveIntent = { x: (c * nx - s * nz) * pace, z: -(s * nx + c * nz) * pace }
  r.sprint = !!input.held.runHold // Shift held: a steady sprint, both on the ground and in the air
  if (r.sprint && !r.wasSprint) ctx.emit('playSound', { clip: W.sounds.dash, position: here(me), volume: 0.5, pitch: r.fly ? 1 : 1.15, maxDistance: 30 })
  r.wasSprint = r.sprint
  if (r.sprint) { const k = (r.fly ? W.sprint.air : W.sprint.ground) / pace; w.moveIntent = { x: w.moveIntent.x * k, z: w.moveIntent.z * k } }
  if (input.pressed.jump) {
    if (r.fly) { /* held space climbs */ }
    else if (r.air <= 0) { r.vy = W.jump; r.air = 1 }
    else { r.fly = true; r.vy = Math.max(r.vy, 2); ctx.emit('playSound', { clip: W.sounds.screech, position: here(me), volume: 0.55, pitch: 1.1, maxDistance: 60 }) } // space in the air: wings out
  }
  r.up = (input.held.jump ? 1 : 0) - (input.held.flyDown ? 1 : 0)
}
// each tick while riding: SHE moves (her rider rides along as her child); all on the rider's machine, working memory in w.wynx
export function wynxStep(ctx, dt, w, modelYaw = 0) {
  const me = ctx.self, h = me.state.mount ? ctx.getObject(me.state.mount) : null
  if (!h) { me.state.mount = null; if (me.parent) { me.parent = null; me.scale = 1 } return }
  if ((me.parent?.id ?? me.parent) !== h.id) seatRider(me, h)
  if (h.interpolation === null) h.interpolation = { teleportThreshold: 60 } // an older Wynx spawned unsmoothed
  const r = w.wynx ??= { vy: 0, vx: 0, vz: 0, yaw: me.yaw ?? 0, air: 0, fly: false, up: 0 }
  const p = h.feetPosition, dashing = !!r.sprint && Math.hypot(w.moveIntent?.x ?? 0, w.moveIntent?.z ?? 0) > 1
  const it = w.moveIntent ?? { x: 0, z: 0 }
  const k = Math.min(1, (Math.hypot(it.x, it.z) > Math.hypot(r.vx, r.vz) + 2 ? W.sprint.ease : W.ease) * dt)
  let vx = r.vx + (it.x - r.vx) * k, vz = r.vz + (it.z - r.vz) * k
  // a wall at chest height stops her
  const sp0 = Math.hypot(vx, vz)
  if (sp0 > 0.3) {
    const dir = { x: vx / sp0, y: 0, z: vz / sp0 }
    const wall = raycast(ctx, { x: p.x, y: p.y + 1.4, z: p.z }, dir, { distance: 1.8 + sp0 * dt, physicsOnly: true, bodies: 'all', excludeTags: ['player'], ignoreEntities: [me.id, h.id] })
    if (wall && Math.abs(wall.normal?.y ?? 0) < 0.6) { const n = wall.normal ?? { x: -dir.x, z: -dir.z }, d = vx * n.x + vz * n.z; if (d < 0) { vx -= d * n.x; vz -= d * n.z } } // slide along it
  }
  const hit = raycast(ctx, { x: p.x, y: p.y + 1.5, z: p.z }, { x: 0, y: -1, z: 0 }, { distance: 10, physicsOnly: true, excludeTags: ['player'], ignoreEntities: [me.id, h.id] })
  const t = ctx.place.terrain?.heightAt?.(p.x, p.z)
  const ground = Math.max(hit ? hit.position.y : -1e9, t ?? -1e9, -0.4)
  let vy
  if (r.fly) {
    vy = r.vy + (r.up * W.climb - r.vy) * Math.min(1, 5 * dt)
    if (p.y + vy * dt <= ground + 0.08 && r.up <= 0) { // touched down
      r.fly = false; r.air = 0; vy = (ground - p.y) * W.lift
      ctx.emit('playSound', { clip: W.sounds.land, position: p, volume: 0.7, maxDistance: 40 })
    }
    if (p.y > W.ceiling && vy > 0) vy = 0
  } else if (r.air > 0) {
    vy = r.vy - W.grav * dt
    if (p.y + vy * dt <= ground && vy < 0) { r.air = 0; vy = (ground - p.y) * W.lift }
  } else {
    vy = Math.max(-25, Math.min(25, (ground - p.y) * W.lift))
    if (ground - p.y < -1.5) { r.air = 1; vy = 0 } // ran off a ledge: fall (space opens the wings)
  }
  r.vx = vx; r.vz = vz; r.vy = vy
  const sp = Math.hypot(vx, vz)
  let turn = 0
  if (sp > 0.4) {
    const want = Math.atan2(-vx, -vz) / RAD, d = ((want - r.yaw + 540) % 360) - 180
    turn = Math.max(-W.turn * dt, Math.min(W.turn * dt, d)); r.yaw += turn
  }
  const flip = W.bodyYaw ? -1 : 1, yaw = r.yaw + (W.bodyYaw || 0)
  r.bank = (r.bank ?? 0) + ((r.fly ? Math.max(-35, Math.min(35, turn / Math.max(dt, 1e-3) * 0.12)) : 0) - (r.bank ?? 0)) * Math.min(1, 6 * dt)
  const pitch = r.fly ? Math.max(-25, Math.min(25, vy * 2 - sp * 0.25)) : 0
  const moved = sp > 0.01 || Math.abs(vy) > 0.01
  if (moved) h.feetPosition = { x: p.x + vx * dt, y: p.y + vy * dt, z: p.z + vz * dt }
  const tl = W.tilt ?? 1
  if (moved || turn) h.rotation = r.fly && tl ? { yaw, pitch: pitch * flip * tl, roll: r.bank * flip * tl } : { yaw }
  const s = h.state, kn = Math.round(sp * 2)
  if (s.sp !== kn) s.sp = kn
  if (!!s.fly !== r.fly) s.fly = r.fly
  if (me.state.wynxSeat !== (r.fly ? 'fly' : 'stand')) seatRider(me, h, r.fly) // the saddle moves with her pose, once per change
  if (!!s.dash !== dashing) s.dash = dashing
}

// each tick on foot while she's been called: on when she says she's at your side (or after W.call.giveUp s, wherever she is)
export function wynxCallStep(ctx, w) {
  const me = ctx.self, h = me.state.wynx ? ctx.getObject(me.state.wynx) : null, now = ctx.now()
  if (!h || me.state.mount) { w.wynxCall = null; return }
  const late = now - w.wynxCall > W.call.giveUp * 1000
  if (!h.state.call?.here && !late) return
  w.wynxCall = null; h.state.call = null
  if (me.parent || me.state.holding) return
  if (late) { const p = here(me); h.feetPosition = { x: p.x, y: p.y, z: p.z } }
  mountWynx(ctx, w, h.id, !me.grounded); w.wynxOnAt = now
  const p = here(me)
  ctx.emit('fx', { position: { x: p.x, y: p.y + 1.2, z: p.z }, script: WYNX_FX })
  toast(ctx, 'Wynx! WASD · space jump, space again to fly · C down · hold Shift sprint · E get off', 4)
}
