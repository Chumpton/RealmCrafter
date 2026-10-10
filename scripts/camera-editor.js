// TERRAIN EDITOR CAMERA (creator 2026-10-07: "it should be its own distinct mode"). While player.state.te.open the router
// hands this machine's eye here: cursor free (the brush follows it), right-drag looks, WASD flies, Space up, C/Ctrl down,
// Shift ×4, wheel dollies. The body stays parked where it stood (scripts/player.js zeroes its keys in this mode).
const SENS = 3, BASE = 24;
const D = Math.PI / 180;
function E(ctx) {
  const S = ctx.session;
  if (!S.edCam) {
    const f = ctx.self.feetPosition ?? ctx.self.target?.feetPosition ?? { x: 0, y: 40, z: 0 }, v = ctx.self.view;
    S.edCam = { x: f.x, y: f.y + 6, z: f.z, yaw: v?.yaw ?? 0, pitch: Math.min(-0.35, v?.pitch ?? -0.5), mx: 0, mz: 0, my: 0, fast: false, dolly: 0 };
  }
  return S.edCam;
}
export function enter(ctx) { ctx.session.edCam = null; E(ctx); ctx.self.orientation = { source: 'script' }; ctx.self.pointerLock = false; }
export function onInput(ctx, input) {
  const c = E(ctx), h = input.held ?? {}, a = input.axes ?? {};
  if (h.camHoldR || h.tpDrag) { c.yaw -= (a.lookX ?? 0) * SENS; c.pitch = Math.max(-1.47, Math.min(1.2, c.pitch - (a.lookY ?? 0) * SENS)); }
  c.mx = a.moveX ?? 0; c.mz = a.moveZ ?? 0; c.my = (h.jump ? 1 : 0) - (h.flyDown && !h.leCtrl ? 1 : 0); c.fast = !!h.runHold;
  if (a.camZoom) c.dolly += a.camZoom;
}
export function update(ctx, dt) {
  const c = E(ctx), self = ctx.self;
  const fl = ctx.player?.state?.ol?.fly; if (fl && fl.at !== c.flyAt) { c.flyAt = fl.at; if (c.seen) Object.assign(c, { x: fl.x, y: fl.y, z: fl.z, yaw: fl.yaw, pitch: fl.pitch }); } c.seen = true; // Outliner ⌖ fly to
  self.orientation = { source: 'script' }; self.pointerLock = false; self.hideLocalPlayer = false;
  const sp = (ctx.player?.state?.te?.fly ?? BASE) * (c.fast ? 4 : 1) * dt;
  const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), cp = Math.cos(c.pitch), spt = Math.sin(c.pitch);
  // forward follows the look (pitch included), so W flies where you look; right stays level
  const fx = -sy * cp, fy = spt, fz = -cy * cp, rx = cy, rz = -sy;
  c.x += (fx * c.mz + rx * c.mx) * sp; c.z += (fz * c.mz + rz * c.mx) * sp; c.y += (fy * c.mz + c.my) * sp;
  if (c.dolly) { const st = c.dolly * 6 * (c.fast ? 4 : 1); c.x += fx * st; c.y += fy * st; c.z += fz * st; c.dolly = 0; }
  const g = ctx.place?.terrain?.heightAt?.(c.x, c.z); if (typeof g === 'number' && c.y < g + 1.2) c.y = g + 1.2;
  self.feetPosition = { x: c.x, y: c.y, z: c.z };
  self.rotation = { yaw: c.yaw / D, pitch: c.pitch / D };
}
