// First-person fights: an enemy keeps a personal-space distance and stays in front of you (never hugging, never behind). Pure.
// yaw is the player's facing in degrees (0 faces -Z, as the den's yaw everywhere); forward in (x, z) is (-sin yaw, -cos yaw).
const R = Math.PI / 180, wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export function yawOfRot(r) { // a yaw in degrees from a number, { yaw } or a quaternion; null when unknown
  if (typeof r === 'number') return r;
  if (r && typeof r.yaw === 'number' && r.w === undefined) return r.yaw;
  if (r && typeof r.w === 'number') return Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) / R;
  return null;
}
// m = monster x/z, p = player x/z. -> { x, z: where it should stand, dist, inView: inside the view cone, tooClose }
export function standPoint(m, p, yawDeg, stand, view = 55, keep = 25) {
  const dx = m.x - p.x, dz = m.z - p.z, dist = Math.hypot(dx, dz) || 1e-6, bear = Math.atan2(dz, dx);
  if (yawDeg == null) return { x: p.x + dx / dist * stand, z: p.z + dz / dist * stand, dist, inView: true, tooClose: dist < stand - 0.35 };
  const fwd = Math.atan2(-Math.cos(yawDeg * R), -Math.sin(yawDeg * R)), diff = wrap(bear - fwd), inView = Math.abs(diff) <= view * R;
  const ang = inView ? bear : fwd + Math.sign(diff || 1) * keep * R;
  return { x: p.x + Math.cos(ang) * stand, z: p.z + Math.sin(ang) * stand, dist, inView, tooClose: dist < stand - 0.35 };
}
// degrees from where you look to where `from` is: 0 straight ahead, +90 to your right, +-180 behind
export function relBearing(p, from, yawDeg) {
  const fwd = Math.atan2(-Math.cos(yawDeg * R), -Math.sin(yawDeg * R)), d = wrap(Math.atan2(from.z - p.z, from.x - p.x) - fwd);
  return Math.round(d / R);
}
