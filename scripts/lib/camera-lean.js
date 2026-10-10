// The lichen-map lean: while player.state.mapView is on, this machine's eye lifts over the stone and looks down at the map,
// holds HOLD seconds, then eases home. A step, a jump or E ends it early. Loaded by scripts/camera.js on first need.
const IN = 0.9, OUT = 0.7, HOLD = 3.2, UP = 1.15, BACK = 0.55, FOV = 52, RAD = 180 / Math.PI;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function slot(ctx) { return (ctx.session.mapLean ??= { t: 0, on: false, at: 0, cvAt: null, feet0: null, yaw0: 0, pitch0: 0, S: null }); }
function close(ctx, z) { z.on = false; const p = ctx.player; if (p?.state?.mapView?.on) p.state.mapView = { on: false, at: ctx.now() }; }
export function onInput(ctx, input) {
  const z = ctx.session.mapLean; if (!z || !(z.on || ctx.player?.state?.mapView?.on)) return;
  const a = input.axes || {};
  if (Math.abs(a.moveX ?? 0) + Math.abs(a.moveZ ?? 0) > 0.25 || input.pressed?.jump) return close(ctx, z);
  if (z.on && input.pressed?.interact && ctx.now() - z.at > 400) close(ctx, z);
}
export function leanZoom(ctx, dt, pos, ey, baseFov) {
  const z = slot(ctx), mv = ctx.player?.state?.mapView, now = ctx.now(), view = ctx.self.view;
  if (mv?.on && mv.at !== z.cvAt && !z.on && view) {
    z.on = true; z.cvAt = mv.at; z.at = now; z.S = mv.stone; z.feet0 = { x: pos.x, z: pos.z }; z.yaw0 = view.yaw; z.pitch0 = view.pitch;
  }
  if (z.on && (!mv?.on || now - z.at > (IN + HOLD) * 1000 || Math.hypot(pos.x - z.feet0.x, pos.z - z.feet0.z) > 0.3)) close(ctx, z);
  if (!z.S) return false;
  z.t = Math.max(0, Math.min(1, z.t + (z.on ? dt / IN : -dt / OUT)));
  if (z.t <= 0 && !z.on) { z.S = null; ctx.self.fov = baseFov; ctx.session.camFacing = null; return false; }
  const e = ease(z.t), S = z.S, dx = pos.x - S.x, dz = pos.z - S.z, dn = Math.hypot(dx, dz) || 1;
  const P1 = { x: S.x + dx / dn * BACK, y: S.y + UP, z: S.z + dz / dn * BACK };
  const eye = { x: pos.x + (P1.x - pos.x) * e, y: ey + (P1.y - ey) * e + Math.sin(e * Math.PI) * 0.12, z: pos.z + (P1.z - pos.z) * e };
  const cp = Math.cos(z.pitch0), A0 = { x: pos.x - Math.sin(z.yaw0) * cp * 1.5, y: ey + Math.sin(z.pitch0) * 1.5, z: pos.z - Math.cos(z.yaw0) * cp * 1.5 };
  const aim = { x: A0.x + (S.x - A0.x) * e, y: A0.y + (S.y - A0.y) * e, z: A0.z + (S.z - A0.z) * e };
  const ax = aim.x - eye.x, ay = aim.y - eye.y, az = aim.z - eye.z, yaw = Math.atan2(-ax, -az), pitch = Math.atan2(ay, Math.hypot(ax, az));
  ctx.self.state.yaw = yaw; ctx.self.state.pitch = pitch;
  ctx.self.feetPosition = eye; ctx.self.rotation = { yaw: yaw * RAD, pitch: pitch * RAD };
  const fov = baseFov + (FOV - baseFov) * e; if (ctx.self.fov !== fov) ctx.self.fov = fov;
  return true;
}
