// The chess view's camera lane, split off scripts/camera.js so it is not in the arrival set: camera.js imports this
// module after the player stands (and again on the first chessView press), then calls chessZoom / onInput through it.
import { CHESS } from './data/chess.js'
import { boardCentre, easeInOutCubic, lookAngles, setGlow, spawnGlow, vantage } from './chess-view.js'

const RAD_TO_DEG = 180 / Math.PI
const LOOK_SENS = 2

function zoomSlot(ctx) {
  return (ctx.session.chessZoom ??= { t: 0, on: false, V: null, yaw0: 0, pitch0: 0, yo: 0, po: 0, enterAt: 0, feet0: null, glow: null, glowAt: 0, glowShown: 0 })
}

function closeView(ctx, z) {
  z.on = false
  const p = ctx.player
  if (p?.state?.chessView?.on) p.state.chessView = { on: false, at: ctx.now() }
}

export function onInput(ctx, input) {
  const z = ctx.session.chessZoom
  // the view counts as open from the press itself, not only once the eye has flown in: a stick push or a jump in the
  // frames before the rig enters (lane still warming, no presented view yet) must still hand the body back
  if (!z || !(z.on || ctx.player?.state?.chessView?.on)) return
  const a = input.axes || {}
  if (Math.abs(a.moveX ?? 0) + Math.abs(a.moveZ ?? 0) > 0.25 || input.pressed?.jump) { closeView(ctx, z); return }
  if (!z.on) return // E before the eye enters is the board's own toggle (scripts/lib/chess-view.js press)
  if (input.pressed?.interact && ctx.now() - z.enterAt > 400) { closeView(ctx, z); return }
  const lim = CHESS.view.lookLimit / RAD_TO_DEG
  if (a.lookX) z.yo = Math.max(-lim, Math.min(lim, z.yo - a.lookX * LOOK_SENS))
  if (a.lookY) z.po = Math.max(-lim, Math.min(lim, z.po - a.lookY * LOOK_SENS))
}

// the chess view's pose, or false when the eye is its own again
export function chessZoom(ctx, dt, pos, ey, baseFov) {
  const z = zoomSlot(ctx), V = CHESS.view, now = ctx.now(), view = ctx.self.view
  const cv = ctx.player?.state?.chessView, want = !!cv?.on && cv.at !== z.cvAt // a closed view reopens only on a fresh press
  // the body leaving the bench closes the view whether or not the eye has flown in yet: a step (> 0.3 m) or a jump (> 0.15 m up)
  // measured from where the body stood at the press, so neither depends on the rig seeing the input
  if (cv?.on) {
    if (z.pressAt !== cv.at) { z.pressAt = cv.at; z.p0 = { x: pos.x, y: pos.y, z: pos.z } }
    else if (z.p0 && (Math.hypot(pos.x - z.p0.x, pos.z - z.p0.z) > 0.3 || pos.y - z.p0.y > 0.15)) closeView(ctx, z)
  }
  if (z.on && cv?.on && cv.at === z.cvAt) { /* standing in */ } else if (z.on && !cv?.on) z.on = false
  if (want && !z.on && z.t === 0 && view) { // enter: remember where the look was, fix the vantage from where you stand
    z.on = true; z.cvAt = cv.at; z.enterAt = now; z.yo = 0; z.po = 0
    z.yaw0 = view.yaw; z.pitch0 = view.pitch; z.feet0 = { x: pos.x, z: pos.z }; z.V = vantage(pos)
    if (z.glow) { ctx.destroy?.(z.glow); z.glow = null }
    ctx.emit('playSound', { clip: CHESS.sounds.zoomIn, position: { x: pos.x, y: ey, z: pos.z }, volume: 0.45, maxDistance: 6 }, { audience: { player: ctx.player.id } })
    ctx.log('chess-view: camera enters', { player: ctx.player.id, vantage: z.V })
  } else if (want && !z.on && z.t > 0) { z.on = true; z.cvAt = cv.at } // re-pressed on the way out: turn back in from here
  if (z.on && z.feet0 && Math.hypot(pos.x - z.feet0.x, pos.z - z.feet0.z) > 0.3) closeView(ctx, z) // walked off
  if (!z.V) return false

  z.t = Math.max(0, Math.min(1, z.t + (z.on ? dt / V.duration : -dt / V.out)))
  // the glow: up once the ease is nearly home, gently down and gone the moment you pull out
  if (z.on && z.t >= V.glowAfter && !z.glow) { z.glow = spawnGlow(ctx); z.glowAt = now; z.glowShown = 0 }
  if (z.glow) {
    const goal = z.on ? V.glowIntensity * Math.min(1, (now - z.glowAt) / (V.glowFade * 1000)) : Math.max(0, z.glowShown - dt * V.glowIntensity / 0.3)
    if (goal !== z.glowShown) { z.glowShown = goal; setGlow(ctx, z.glow, goal) }
    if (!z.on && goal <= 0) { ctx.destroy?.(z.glow); z.glow = null }
  }
  if (z.t <= 0 && !z.on) { // home: the eye is the head's again, the look the mouse's
    z.V = null; z.yo = 0; z.po = 0
    ctx.self.fov = baseFov
    ctx.session.camFacing = null
    ctx.log('chess-view: camera home', { player: ctx.player?.id })
    return false
  }

  const e = easeInOutCubic(z.t), C = boardCentre(), P0 = { x: pos.x, y: ey, z: pos.z }, P1 = z.V
  // a gentle arc: a quadratic curve whose middle rises and swings out behind the vantage, so the eye lifts, then settles over the board
  const K = { x: (P0.x + P1.x) / 2 + z.V.sx * 0.15, y: Math.max(P0.y, P1.y) + V.arc, z: (P0.z + P1.z) / 2 + z.V.sz * 0.15 }
  const u = 1 - e, eye = { x: u * u * P0.x + 2 * u * e * K.x + e * e * P1.x, y: u * u * P0.y + 2 * u * e * K.y + e * e * P1.y, z: u * u * P0.z + 2 * u * e * K.z + e * e * P1.z }
  // it breathes: an ease-out drift of CHESS.view.drift toward the board from the first frame, and a slow 3 mm rise and fall
  const since = (now - z.enterAt) / 1000, dr = V.drift * (1 - Math.exp(-since / 2.4)) * e
  const tx = C.x - P1.x, ty = C.y - P1.y, tz = C.z - P1.z, tn = Math.hypot(tx, ty, tz) || 1
  eye.x += tx / tn * dr; eye.y += ty / tn * dr + Math.sin(since * Math.PI / 3) * 0.003 * e; eye.z += tz / tn * dr
  // the aim slides from where you looked to the board's heart, a touch ahead of the eye
  const ea = easeInOutCubic(Math.min(1, z.t * 1.08)), cp = Math.cos(z.pitch0)
  const A0 = { x: P0.x - Math.sin(z.yaw0) * cp * 1.5, y: P0.y + Math.sin(z.pitch0) * 1.5, z: P0.z - Math.cos(z.yaw0) * cp * 1.5 }
  const aim = { x: A0.x + (C.x - A0.x) * ea, y: A0.y + (C.y - A0.y) * ea, z: A0.z + (C.z - A0.z) * ea }
  const ang = lookAngles(eye, aim), yaw = ang.yaw + z.yo * e, pitch = ang.pitch + z.po * e
  const s = ctx.self.state
  s.yaw = yaw; s.pitch = pitch // written: the look is the rig's while the view stands
  ctx.self.feetPosition = eye
  ctx.self.rotation = { yaw: yaw * RAD_TO_DEG, pitch: pitch * RAD_TO_DEG }
  const fov = baseFov + (V.fov - baseFov) * e
  if (ctx.self.fov !== fov) ctx.self.fov = fov
  if (!z.logged && z.t >= 1) { z.logged = true; ctx.log('chess-view: camera zoomed', { eye, fov }) }
  if (z.t < 1) z.logged = false
  return true
}

