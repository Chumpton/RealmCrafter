// A first-person camera on the declared `look` contract (templates/camera.js#camera:
// orientation.source "look"): the engine integrates the mouse at display rate with the rig's
// sensitivity / minPitch / maxPitch and owns the presented facing — read it back as ctx.self.view.
// The rig owns the EYE: every tick the camera sits at the controlled entity's eyes (scaled with the
// body) and faces where the view looks, so the camera's own row stays honest for everything that
// reads it (the audio listener, god-mode entry at the play camera). Numbers live in
// lib/data/camera.yml.
// Hiding your own body is THIS rig's decision (ctx.self.hideLocalPlayer — the rig's layer, which
// dies with the rig), never a flag on the camera def: a rewrite to an orbit rig shows the body again
// with nothing to un-set.
// The chess view (E on the north bench's board, scripts/lib/chess-view.js): while this player's
// state.chessView.on (lane: scripts/lib/camera-chess.js, loaded after standing), the eye leaves the head on a gentle arc to a vantage over the board, the lens
// narrows, and the look is the rig's (written yaw/pitch) with the hand free ±CHESS.view.lookLimit°.
// The boards have no zoom view (BOARD-CLICK D5): aim + left click and the HUD loupe (scripts/board-input.js).
import CAMERA from './lib/data/camera.yml'
import { VIEW } from './lib/data/view-settings.js'
import { stood, ready } from './lib/lazy-hooks.js'
import { HORSE } from './lib/data/horse.js'
import { WS } from './lib/data/warship.js'
import { raycast } from 'builtin/physics'
import { cullTick, cullRelease } from './lib/camera-cull.js' // perf C1: zoom-tied far clip + selective roofs, this screen only
// V (viewToggle): on foot, a rigid OSRS-style spherical orbit around the player's centre.
// Script orientation lets middle-drag own the orbit angles; no spring arm, camera collision, or follow easing.
const TP = { min: 2.5, max: 24, zoomStep: 0.5, dist: 6, fov: 40, keySpeed: 1.8, mouseRadiansPerPixel: 0.0018, minPitch: -89.5 * Math.PI / 180, maxPitch: -25 * Math.PI / 180 }

const RAD_TO_DEG = 180 / Math.PI
const wrapRadians = (a) => Math.atan2(Math.sin(a), Math.cos(a))

function suspendThirdPerson(ctx) {
  const S = ctx.session
  if (!S.thirdPerson || S.tpByMount || S.tpSuspended) return
  cullRelease(ctx)
  if (ctx.player && S.tpFaded) { ctx.player.faded = {}; S.tpFaded = '' }
  ctx.self.state.yaw = finiteNumber(S.tpYaw, 0)
  ctx.self.state.pitch = finiteNumber(S.tpPitch, -Math.PI / 4)
  ctx.self.orientation = { source: 'look' }
  ctx.self.pointerLock = true
  S.tpSuspended = true
}

function resumeThirdPerson(ctx) {
  const S = ctx.session
  if (!S.tpSuspended) return
  const v = ctx.self.view
  if (v) {
    S.tpYaw = v.yaw
    S.tpPitch = Math.max(TP.minPitch, Math.min(TP.maxPitch, v.pitch))
  }
  ctx.self.orientation = { source: 'script' }
  ctx.self.pointerLock = false
  S.tpSuspended = false
}

export function finiteNumber(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback
}

// the chess lane loads by import() once the player stands, so its bytes are not in the arrival set
let chess = null, chessLoading = false
function loadChess() {
  if (chess || chessLoading) return chess
  chessLoading = true
  import('./lib/camera-chess.js').then((m) => { chess = m }).catch(() => { chessLoading = false })
  return chess
}

// the lichen-map stone's lean (scripts/lib/camera-lean.js), loaded on first need
let lean = null, leanLoading = false
function loadLean() {
  if (lean || leanLoading) return lean
  leanLoading = true
  import('./lib/camera-lean.js').then((m) => { lean = m }).catch(() => { leanLoading = false })
  return lean
}

export function onInput(ctx, input) {
  const S = ctx.session
  if (input?.pressed?.viewToggle && !S.shipCam && !S.horseCam && !S.tpByMount) {
    S.thirdPerson = !S.thirdPerson
    if (S.thirdPerson) {
      const v = ctx.self.view, yaw = finiteNumber(v?.yaw, finiteNumber(ctx.self.state?.yaw, 0))
      const pitch = finiteNumber(v?.pitch, -Math.PI / 4)
      S.tpYaw = yaw
      S.tpPitch = Math.max(TP.minPitch, Math.min(TP.maxPitch, Math.min(pitch, -Math.PI / 4)))
      S.tpZoom = Math.max(TP.min, Math.min(TP.max, finiteNumber(S.tpZoom, TP.dist)))
      S.tpOrbitX = 0; S.tpOrbitY = 0
      ctx.self.orientation = { source: 'script' }
      ctx.self.pointerLock = false
      ctx.self.hideLocalPlayer = false
    } else {
      ctx.self.state.yaw = finiteNumber(S.tpYaw, 0)
      ctx.self.state.pitch = finiteNumber(S.tpPitch, -Math.PI / 4)
      ctx.self.orientation = { source: 'look' }
      ctx.self.pointerLock = true
      ctx.self.hideLocalPlayer = true
      S.tpCam = false
      if (ctx.player && S.tpFaded) { ctx.player.faded = {}; S.tpFaded = '' }
      cullRelease(ctx)
    }
  }
  const wr = input?.axes?.camZoom ?? 0, wz = Math.abs(wr) > 3 ? wr / 100 : wr // one wheel notch = 1, whether the axis arrives as notches or as pixels
  if (wz) ctx.session.zoomAt = ctx.now()
  if (ctx.session.shipCam && wz) { const z = ctx.session.shipZoom ?? 1; ctx.session.shipZoom = Math.max(WS.cam.zoomMin, Math.min(WS.cam.zoomMax, z * Math.exp(wz * 0.32))) } // aboard: the wheel zooms the ship view
  else if (S.thirdPerson && !S.tpSuspended && wz) { const z = S.tpZoom ?? TP.dist, notches = Math.max(1, Math.round(Math.abs(wz) * 2)); S.tpZoom = Math.max(TP.min, Math.min(TP.max, z - Math.sign(wz) * notches * TP.zoomStep)) } // wheel up (+) moves in by discrete steps
  if (S.thirdPerson && !S.tpSuspended) {
    S.tpOrbitX = input?.axes?.camOrbitX ?? 0
    S.tpOrbitY = input?.axes?.camOrbitY ?? 0
    if (input?.held?.tpDrag || input?.held?.camHoldR) {
      // Script orientation + free cursor receives the engine look axes in radians
      // already scaled by the player's sensitivity (base 0.0006 rad/pixel).
      const dx = input.axes?.lookX ?? 0, dy = input.axes?.lookY ?? 0
      S.tpYaw = wrapRadians((S.tpYaw ?? 0) - dx * 3)
      S.tpPitch = Math.max(TP.minPitch, Math.min(TP.maxPitch, (S.tpPitch ?? -Math.PI / 4) - dy * 3))
    }
  }
  if (lean && ctx.session.mapLean) lean.onInput(ctx, input)
  if (chess && ctx.session.chessZoom) chess.onInput(ctx, input)
}

export function update(ctx, dt) {
  // The eye sits inside the body, so the body is not drawn for its owner (everyone else still sees it).
  if (ctx.self.hideLocalPlayer !== true && !ctx.session.horseCam && !ctx.session.shipCam && !ctx.session.tpCam) ctx.self.hideLocalPlayer = true

  // The player's chosen field of view (the O settings plate); third person uses OSRS's narrow lens.
  const saved = ctx.player?.state?.fov ?? ctx.self.target?.state?.fov
  const want = Math.max(VIEW.fovMin, Math.min(VIEW.fovMax, finiteNumber(saved, VIEW.fovDefault)))
  const lens = ctx.session.thirdPerson && !ctx.session.tpSuspended ? TP.fov : want

  const target = ctx.self.target
  if (!target) { if (ctx.self.fov !== want) { ctx.self.fov = want; ctx.self.state.fovShown = want } return }

  // Seated (the body rides a seat: its parent is the chair or the couch), the eye drops to a sitter's and the feet are read
  // in the world, since a rider's own feet are the seat's.
  const eyeHeight = finiteNumber(CAMERA.eyeHeight, 1.6) * finiteNumber(target.effectiveScale.y, 1) * (target.parent && !target.state?.mount ? 0.72 : 1)
  const pos = target.worldFeetPosition ?? target.feetPosition
  const ey = pos.y + eyeHeight

  stood(ctx) // the rig has a body: this machine's boot lanes open from now (scripts/lib/data/boot-order.js)
  if (ctx.player?.state?.chessView?.on || ctx.session.chessZoom || ready(ctx, 'late')) loadChess() // warms the chess lane once the late lane opens
  if (chess && (ctx.session.chessZoom || ctx.player?.state?.chessView?.on) && chess.chessZoom(ctx, dt, pos, ey, want)) return
  if (ctx.player?.state?.mapView?.on || ctx.session.mapLean) loadLean()
  if (lean && (ctx.session.mapLean || ctx.player?.state?.mapView?.on) && lean.leanZoom(ctx, dt, pos, ey, want)) return

  // Compared against the lens itself (not a remembered copy), written only when it changes.
  if (ctx.self.fov !== lens) ctx.self.fov = lens
  if (ctx.self.state.fovShown !== want) ctx.self.state.fovShown = want

  // On horseback (scripts/den-horse.js): third person. The eye swings behind and above the rider along where the mouse looks,
  // eased, and the body is drawn again; off the horse the rig is first person as before.
  const mount = target.parent ? ctx.getObject(target.parent.id ?? target.parent) : null
  // Aboard a warship (at her wheel, or standing on her deck): the same eased third person, WIDE, behind the stern and high,
  // the mouse orbiting the ship (numbers: scripts/lib/data/warship.js WS.cam, × the hull's scale). Ashore, first person again.
  const ship = (target.tags || []).includes('warship') ? target : mount && (mount.tags || []).includes('warship') ? mount : null
  if (ship) {
    suspendThirdPerson(ctx)
    if (ctx.self.hideLocalPlayer !== false) ctx.self.hideLocalPlayer = false
    const C = WS.cam, sc0 = ship.scale, sc = (typeof sc0 === 'number' ? sc0 : sc0?.x) || 1, v = ctx.self.view
    const yaw = v ? v.yaw : (ship.rotation?.yaw ?? 0) / RAD_TO_DEG, pitch = v ? v.pitch * RAD_TO_DEG : -18
    const pr = Math.max(C.minPitch, Math.min(C.maxPitch, pitch)) / RAD_TO_DEG, cp = Math.cos(pr)
    const pilot = ship.controller === target.id; let zk = ctx.session.shipZoom ?? 1
    if (pilot !== ctx.session.shipPilot) { ctx.session.shipPilot = pilot; ctx.session.shipZoom = zk = 1 }
    const hp = ship.worldFeetPosition ?? ship.feetPosition, dist = C.dist * sc * zk * (pilot ? C.pilot : 1), up = C.up * Math.pow(sc, 0.6), lu = C.lookUp * sc
    const want3 = { x: hp.x + Math.sin(yaw) * cp * dist, y: hp.y + up * (pilot ? C.pilot * zk : 1) - Math.sin(pr) * dist * 0.5, z: hp.z + Math.cos(yaw) * cp * dist }
    const g = ctx.place?.terrain?.heightAt?.(want3.x, want3.z)
    if (g != null && want3.y < g + 2) want3.y = g + 2
    const cur3 = ctx.self.feetPosition, k = Math.min(1, C.ease * dt)
    ctx.self.feetPosition = cur3 && ctx.session.shipCam ? { x: cur3.x + (want3.x - cur3.x) * k, y: cur3.y + (want3.y - cur3.y) * k, z: cur3.z + (want3.z - cur3.z) * k } : want3
    ctx.session.shipCam = true
    const e = ctx.self.feetPosition, dx = hp.x - e.x, dy = hp.y + lu - e.y, dz = hp.z - e.z
    ctx.self.rotation = { yaw: Math.atan2(-dx, -dz) * RAD_TO_DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) * RAD_TO_DEG }
    ctx.session.camFacing = { id: ctx.self.id, yaw: yaw * RAD_TO_DEG, pitch }
    return
  }
  if (ctx.session.shipCam) { ctx.session.shipCam = false; ctx.self.hideLocalPlayer = true; resumeThirdPerson(ctx) }
  if (mount && (mount.tags || []).includes('den-horse')) {
    suspendThirdPerson(ctx)
    if (ctx.self.hideLocalPlayer !== false) ctx.self.hideLocalPlayer = false
    const C = HORSE.cam, v = ctx.self.view, yaw = v ? v.yaw * RAD_TO_DEG : 0, pitch = v ? v.pitch * RAD_TO_DEG : -10
    const r = yaw / RAD_TO_DEG, pr = Math.max(-40, Math.min(-6, pitch)) / RAD_TO_DEG, cp = Math.cos(pr) // the eye stays above and behind the rider, whatever the mouse pitch
    const hp = mount.worldFeetPosition ?? mount.feetPosition
    const want3 = { x: hp.x + Math.sin(r) * cp * C.dist, y: hp.y + C.up + C.lookUp - Math.sin(pr) * C.dist, z: hp.z + Math.cos(r) * cp * C.dist }
    const g = ctx.place?.terrain?.heightAt?.(want3.x, want3.z)
    if (g != null && want3.y < g + 1.2) want3.y = g + 1.2
    const gm = ctx.place?.terrain?.heightAt?.((want3.x + hp.x) / 2, (want3.z + hp.z) / 2) // a rise between eye and horse: lift over it
    if (gm != null && want3.y < gm + 1.6) want3.y = gm + 1.6
    const cur3 = ctx.self.feetPosition, k = Math.min(1, C.ease * dt)
    ctx.self.feetPosition = cur3 && ctx.session.horseCam ? { x: cur3.x + (want3.x - cur3.x) * k, y: cur3.y + (want3.y - cur3.y) * k, z: cur3.z + (want3.z - cur3.z) * k } : want3
    ctx.session.horseCam = true
    if (v) { // aim at the rider's shoulders, so the horse stays framed whatever the mouse does
      const e = ctx.self.feetPosition, dx = hp.x - e.x, dy = hp.y + C.up - e.y, dz = hp.z - e.z
      const ay = Math.atan2(-dx, -dz) * RAD_TO_DEG, ap = Math.atan2(dy, Math.hypot(dx, dz)) * RAD_TO_DEG
      ctx.self.rotation = { yaw: ay, pitch: ap }; ctx.session.camFacing = { id: ctx.self.id, yaw, pitch }
    }
    return
  }
  if (ctx.session.horseCam) { ctx.session.horseCam = false; ctx.self.hideLocalPlayer = true; resumeThirdPerson(ctx) }

  // Wynx seating uses the same visible-body third-person camera.
  const riding = !!target.state?.mount && (!target.parent || (target.parent.id ?? target.parent) === target.state.mount) // Wynx seats her rider as her child
  if (riding && !ctx.session.thirdPerson) {
    const v = ctx.self.view
    ctx.session.thirdPerson = true; ctx.session.tpByMount = true
    ctx.session.tpYaw = finiteNumber(v?.yaw, 0); ctx.session.tpPitch = Math.max(TP.minPitch, Math.min(TP.maxPitch, finiteNumber(v?.pitch, -Math.PI / 4)))
    ctx.session.tpZoom = Math.max(9, ctx.session.tpZoom ?? TP.dist)
    ctx.self.orientation = { source: 'script' }; ctx.self.pointerLock = false
  }
  if (!riding && ctx.session.tpByMount) {
    ctx.session.tpByMount = false; ctx.session.thirdPerson = false
    ctx.self.state.yaw = finiteNumber(ctx.session.tpYaw, 0); ctx.self.state.pitch = finiteNumber(ctx.session.tpPitch, -Math.PI / 4)
    ctx.self.orientation = { source: 'look' }; ctx.self.pointerLock = true
    ctx.session.tpCam = false; ctx.self.hideLocalPlayer = true
  }
  if (ctx.session.thirdPerson) {
    if (ctx.self.orientation?.source !== 'script') ctx.self.orientation = { source: 'script' }
    if (ctx.self.pointerLock !== false) ctx.self.pointerLock = false
    if (ctx.self.hideLocalPlayer !== false) ctx.self.hideLocalPlayer = false
    const S = ctx.session
    const yaw = wrapRadians((S.tpYaw ?? 0) + (S.tpOrbitX ?? 0) * TP.keySpeed * dt)
    const pitch = Math.max(TP.minPitch, Math.min(TP.maxPitch, (S.tpPitch ?? -Math.PI / 4) + (S.tpOrbitY ?? 0) * TP.keySpeed * dt))
    S.tpYaw = yaw; S.tpPitch = pitch
    const scale = finiteNumber(target.effectiveScale?.y, 1)
    const pivot = { x: pos.x, y: pos.y + 0.9 * scale, z: pos.z }
    const radius = Math.max(TP.min, Math.min(TP.max, finiteNumber(S.tpZoom, TP.dist))), cp = Math.cos(pitch)
    const eye = { x: pivot.x + Math.sin(yaw) * cp * radius, y: pivot.y - Math.sin(pitch) * radius, z: pivot.z + Math.cos(yaw) * cp * radius }
    ctx.self.feetPosition = eye // rigid follow: no interpolation, wall pull-in, or terrain lift
    ctx.self.rotation = { lookAt: pivot, include: ['yaw', 'pitch'] }
    cullTick(ctx, eye, pivot, yaw, pitch, radius, target)
    // Hide roofs, walls, and other geometry that actually blocks the pivot-to-eye sightline.
    if (ctx.player && (S.tpFadeAt ?? 0) < ctx.now()) {
      S.tpFadeAt = ctx.now() + 250
      const ray = { x: (pivot.x - eye.x) / radius, y: (pivot.y - eye.y) / radius, z: (pivot.z - eye.z) / radius }
      const blockers = raycast(ctx, eye, ray, { distance: radius, ignoreEntities: [target.id], multiple: true, hits: 'geometry' })
      const overhead = raycast(ctx, pivot, { x: 0, y: 1, z: 0 }, { distance: 12, ignoreEntities: [target.id], multiple: true, hits: 'geometry' })
      const faded = {}
      for (const h of [...[].concat(blockers ?? []), ...[].concat(overhead ?? [])]) if (h?.id) faded[h.id] = 0
      const key = Object.keys(faded).sort().join(',')
      if (key !== S.tpFaded) { S.tpFaded = key; ctx.player.faded = faded }
    }
    ctx.session.tpCam = true
    return
  }
  if (ctx.session.tpCam) {
    ctx.session.tpCam = false; ctx.self.hideLocalPlayer = true
    cullRelease(ctx)
    if (ctx.player && ctx.session.tpFaded) { ctx.player.faded = {}; ctx.session.tpFaded = '' }
  }

  // Standing still, the eye and facing hold: a write only when a number moved, so an idle rig sends no row.
  // A bury (skills-player.js writes state.buryAt): first person can't see the body hunch, so the eye itself dips to the dirt and back (creator 2026-10-05)
  const bt = (ctx.now() - (target.state?.buryAt ?? -1e9)) / 1000, fy = bt >= 0 && bt < 1.1 ? ey - 0.8 * Math.sin(Math.PI * bt / 1.1) : ey
  const cur = ctx.self.feetPosition
  if (!cur || cur.x !== pos.x || cur.y !== fy || cur.z !== pos.z) ctx.self.feetPosition = { x: pos.x, y: fy, z: pos.z }

  // The presented facing (radians) as the one rotation grammar (degrees) — undefined before the first frame.
  const view = ctx.self.view
  if (view) {
    const yaw = view.yaw * RAD_TO_DEG, pitch = view.pitch * RAD_TO_DEG, last = ctx.session.camFacing
    if (!last || last.id !== ctx.self.id || last.yaw !== yaw || last.pitch !== pitch) {
      ctx.self.rotation = { yaw, pitch }
      ctx.session.camFacing = { id: ctx.self.id, yaw, pitch }
    }
  }
}

// the router hands the eye to the classic rig: nothing of this rig's view layer (far clip, fog, hidden roofs) may follow it
export function release(ctx) { cullRelease(ctx) }
