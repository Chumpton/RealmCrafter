// CLASSIC CAMERA (Campton 2026-10-06: "give campton the original camera settings and make it a toggle in O and make forges changes not effect campton").
// This is scripts/camera.js exactly as it stood at seq 12408, before the OSRS orbit rewrite (seq 14096). scripts/camera-router.js picks it or
// scripts/camera.js per player (O → Controls → Camera style); edits to scripts/camera.js never reach this file.
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
// V (viewToggle): third person on foot, over the shoulder; again for first person. Remembered on this machine.
const TP = { min: 1.6, max: 900, zoomStep: 0.006, dist: 18.6, /* Campton 2026-10-09: his own distance is everyone's default (was 5) */ up: 0.35, side: 0.45, ease: 10, minPitch: -60, maxPitch: 45 }

const RAD_TO_DEG = 180 / Math.PI
// Campton 2026-10-06: "allow left click hold turn camera": on-foot third person owns its orbit (script orientation, cursor free); holding left OR right turns it
const HOLD_SENS = 3

export function finiteNumber(value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback
}
function orbitOn(ctx) {
  const S = ctx.session
  if (S.cOrbit) return
  const v = ctx.self.view
  S.cYaw = finiteNumber(v?.yaw, finiteNumber(S.cYaw, 0)); S.cPitch = finiteNumber(v?.pitch, finiteNumber(S.cPitch, -0.2))
  ctx.self.orientation = { source: 'script' }; ctx.self.pointerLock = false; S.cOrbit = true
}
function orbitOff(ctx, lock) {
  const S = ctx.session
  if (!S.cOrbit) return
  ctx.self.state.yaw = finiteNumber(S.cYaw, 0); ctx.self.state.pitch = finiteNumber(S.cPitch, 0)
  ctx.self.orientation = { source: 'look' }; ctx.self.pointerLock = lock; S.cOrbit = false
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
  if (input?.pressed?.viewToggle) {
    ctx.session.thirdPerson = !ctx.session.thirdPerson
    // WoW: in third person the cursor is free (click enemies, the bar, the world) and a held drag turns the view; first person relocks
    if (ctx.session.thirdPerson) orbitOn(ctx)
    else { orbitOff(ctx, true); ctx.self.pointerLock = true; ctx.session.tpCam = false; ctx.self.hideLocalPlayer = true }
  }
  if (ctx.session.cOrbit && (input?.held?.tpDrag || input?.held?.camHoldL || input?.held?.camHoldR)) {
    const S = ctx.session, lx = input?.axes?.lookX ?? 0, ly = input?.axes?.lookY ?? 0
    if (lx || ly) {
      S.cYaw = finiteNumber(S.cYaw, 0) - lx * HOLD_SENS
      S.cPitch = Math.max(TP.minPitch / RAD_TO_DEG, Math.min(TP.maxPitch / RAD_TO_DEG, finiteNumber(S.cPitch, 0) - ly * HOLD_SENS))
    }
  }
  const wr = input?.axes?.camZoom ?? 0, wz = Math.abs(wr) > 3 ? wr / 100 : wr // one wheel notch = 1, whether the axis arrives as notches or as pixels
  if (wz) ctx.session.zoomAt = ctx.now()
  if (ctx.session.shipCam && wz) { const z = ctx.session.shipZoom ?? 1; ctx.session.shipZoom = Math.max(WS.cam.zoomMin, Math.min(WS.cam.zoomMax, z * Math.exp(wz * 0.32))) } // aboard: the wheel zooms the ship view
  else if (ctx.session.thirdPerson && wz) { const z = ctx.session.tpZoom ?? TP.dist, cap = Math.max(2, z * 0.6), step = Math.max(-cap, Math.min(cap, wz * 0.35 * Math.max(2, z))); ctx.session.tpZoom = Math.max(TP.min, Math.min(TP.max, z + step)) }
  if (lean && ctx.session.mapLean) lean.onInput(ctx, input)
  if (chess && ctx.session.chessZoom) chess.onInput(ctx, input)
}

export function update(ctx, dt) {
  // 2026-10-09 campton: "made 3rd person view the default": every visit opens over the shoulder; V still drops into first person
  if (!ctx.session.tpDefaulted) { ctx.session.tpDefaulted = true; if (!ctx.session.thirdPerson) { ctx.session.thirdPerson = true; orbitOn(ctx); ctx.session.cPitch = -0.231 } } // negative = the eye above the head looking down (+ sank it into the grass)
  // The eye sits inside the body, so the body is not drawn for its owner (everyone else still sees it).
  if (ctx.self.hideLocalPlayer !== true && !ctx.session.horseCam && !ctx.session.shipCam && !ctx.session.tpCam) ctx.self.hideLocalPlayer = true

  // The player's chosen field of view (the O settings plate).
  const saved = ctx.player?.state?.fov ?? ctx.self.target?.state?.fov
  const want = Math.max(VIEW.fovMin, Math.min(VIEW.fovMax, finiteNumber(saved, VIEW.fovDefault)))

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
  if (ctx.self.fov !== want) { ctx.self.fov = want; ctx.self.state.fovShown = want }

  // On horseback (scripts/den-horse.js): third person. The eye swings behind and above the rider along where the mouse looks,
  // eased, and the body is drawn again; off the horse the rig is first person as before.
  const mount = target.parent ? ctx.getObject(target.parent.id ?? target.parent) : null
  // Aboard a warship (at her wheel, or standing on her deck): the same eased third person, WIDE, behind the stern and high,
  // the mouse orbiting the ship (numbers: scripts/lib/data/warship.js WS.cam, × the hull's scale). Ashore, first person again.
  const ship = (target.tags || []).includes('warship') ? target : mount && (mount.tags || []).includes('warship') ? mount : null
  if (ship) {
    orbitOff(ctx, true)
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
  if (ctx.session.shipCam) { ctx.session.shipCam = false; ctx.self.hideLocalPlayer = true }
  if (mount && (mount.tags || []).includes('den-horse')) {
    orbitOff(ctx, true)
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
  if (ctx.session.horseCam) { ctx.session.horseCam = false; ctx.self.hideLocalPlayer = true }

  // Third person on foot (V): the eye eases behind the right shoulder along the mouse look, pulled in before any wall.
  const riding = !!target.state?.mount && (!target.parent || (target.parent.id ?? target.parent) === target.state.mount) // Wynx seats her rider as her child
  if (riding && !ctx.session.thirdPerson) { ctx.session.thirdPerson = true; ctx.session.tpByMount = true; orbitOn(ctx); if ((ctx.session.tpZoom ?? TP.dist) < 9) ctx.session.tpZoom = 9 }
  if (!riding && ctx.session.tpByMount) { ctx.session.tpByMount = false; ctx.session.thirdPerson = false; orbitOff(ctx, true); ctx.self.pointerLock = true; ctx.session.tpCam = false; ctx.self.hideLocalPlayer = true }
  if (ctx.session.thirdPerson) {
    orbitOn(ctx)
    if (ctx.self.pointerLock !== false) ctx.self.pointerLock = false
    if (ctx.self.hideLocalPlayer !== false) ctx.self.hideLocalPlayer = false
    const yaw = finiteNumber(ctx.session.cYaw, 0), pr = Math.max(TP.minPitch, Math.min(TP.maxPitch, finiteNumber(ctx.session.cPitch, 0) * RAD_TO_DEG)) / RAD_TO_DEG, cp = Math.cos(pr)
    const head = { x: pos.x + Math.cos(yaw) * TP.side, y: ey + TP.up, z: pos.z - Math.sin(yaw) * TP.side }
    const dir = { x: Math.sin(yaw) * cp, y: -Math.sin(pr), z: Math.cos(yaw) * cp }
    const want = ctx.session.tpZoom ?? TP.dist
    const hit = raycast(ctx, head, dir, { distance: Math.min(want, 190), ignoreEntities: riding ? [target.id, target.state.mount] : [target.id], excludeTags: ['player', 'wynx', 'den-horse'], physicsOnly: true }) // (Campton 2026-10-09 'janky camera, flying') the ray used to strike Wynx under the rider and snap the eye in and out
    const d = hit && want < 190 ? Math.max(0.4, hit.distance - 0.3) : want
    const want3 = { x: head.x + dir.x * d, y: head.y + dir.y * d, z: head.z + dir.z * d }
    const g = ctx.place?.terrain?.heightAt?.(want3.x, want3.z)
    if (g != null && want3.y < g + 0.3) want3.y = g + 0.3
    const cur3 = ctx.self.feetPosition, k = Math.min(1, TP.ease * dt)
    ctx.self.feetPosition = cur3 && ctx.session.tpCam ? { x: cur3.x + (want3.x - cur3.x) * k, y: cur3.y + (want3.y - cur3.y) * k, z: cur3.z + (want3.z - cur3.z) * k } : want3
    ctx.session.tpCam = true
    const yd = yaw * RAD_TO_DEG, pd = pr * RAD_TO_DEG
    ctx.self.rotation = { yaw: yd, pitch: pd }; ctx.session.camFacing = { id: ctx.self.id, yaw: yd, pitch: pd }
    return
  }
  if (ctx.session.tpCam) { ctx.session.tpCam = false; ctx.self.hideLocalPlayer = true }
  orbitOff(ctx, true)

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
