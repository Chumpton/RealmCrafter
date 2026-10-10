// CAMERA ROUTER (Campton 2026-10-06: "give campton the original camera settings and make it a toggle in O and make forges changes not effect campton").
// Picks this machine's camera per player: O → Controls → Camera style (player.state.settings.camStyle):
//   0 Auto      → Campton gets the classic shoulder cam (scripts/camera-classic.js), everyone else the current scripts/camera.js
//   1 Classic   → scripts/camera-classic.js (frozen; edits to camera.js never reach it)
//   2 OSRS orbit→ scripts/camera.js (Forge's rig, keeps every change made to it)
import * as ORBIT from './camera.js'
import * as CLASSIC from './camera-classic.js'
import * as EDITOR from './camera-editor.js' // the terrain editor's own fly eye (player.state.te.open)
const CAMPTON = 'pa_d69d1b1f0d7352adedf69f2ee39457a4'
function pick(ctx) {
  if (ctx.player?.isEditor && ctx.player?.state?.te?.open) return 'editor'
  const s = ctx.player?.state?.settings?.camStyle ?? 0
  if (s === 1) return 'classic'
  if (s === 2) return 'orbit'
  return 'classic' // 2026-10-09 campton: third person is the world's default view, for everyone
}
function rig(ctx) {
  const want = pick(ctx), S = ctx.session
  if (S.camRig !== want) {
    if (S.camRig) { // a switch mid-visit: hand the eye back clean so neither rig inherits the other's half-state
      if (S.camRig === 'orbit') ORBIT.release?.(ctx) // perf C1: the orbit rig's far clip / fog / roof layer stays with it
      if (ctx.player && S.tpFaded) { ctx.player.faded = {}; S.tpFaded = '' }
      S.thirdPerson = false; S.tpCam = false; S.tpByMount = false; S.tpSuspended = false; S.horseCam = false; S.shipCam = false
      ctx.self.orientation = { source: 'look' }; ctx.self.pointerLock = true; ctx.self.hideLocalPlayer = true
    }
    S.camRig = want
    if (want === 'editor') EDITOR.enter(ctx)
  }
  return want === 'editor' ? EDITOR : want === 'classic' ? CLASSIC : ORBIT
}
export function onInput(ctx, input) { return rig(ctx).onInput?.(ctx, input) }
export function update(ctx, dt) { return rig(ctx).update?.(ctx, dt) }
