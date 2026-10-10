import { FEEL } from './data/home-feel.js';
// E acts on what you are LOOKING at: the candidate inside reach whose centre sits nearest your aim, inside a cone.
// A thing's centre is its drawn bounds' centre (a door counts from the middle of its leaf, never its hinge).
export function aimForward(input) {
  const a = input?.axes || {}, s = a.aimYawSin ?? 0, c = a.aimYawCos ?? 1;
  const f = { x: -s, z: -c };
  // the camera's own ray, when the engine hands it over: the aim then has a pitch — looking down at a dish is the dish,
  // looking past it at the bench behind is the bench
  // an empty ray (all zeros: no pointer yet, a scripted body) is no ray — its 3-D angle would read 90° and void every aim
  if (typeof a.pointerDirX === 'number' && typeof a.pointerOriginX === 'number' && Math.hypot(a.pointerDirX, a.pointerDirY ?? 0, a.pointerDirZ ?? 0) > 0.5) {
    f.eye = { x: a.pointerOriginX, y: a.pointerOriginY, z: a.pointerOriginZ };
    f.dir = { x: a.pointerDirX, y: a.pointerDirY, z: a.pointerDirZ };
  }
  return f;
}
// score: the angle off your aim in degrees, plus a little per metre so the nearer of two equally-aimed things wins
export function aimScore(p, fwd, q, reach, cone, touch = FEEL.touchRadius) {
  const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
  if (d > reach) return null;
  if (d < touch) return d * FEEL.metreCost; // standing on it: it is the one you mean
  let cos = (dx * fwd.x + dz * fwd.z) / d;
  if (fwd.eye && typeof q.y === 'number') { // the angle between the camera's ray and the thing, in three dimensions
    const vx = q.x - fwd.eye.x, vy = q.y - fwd.eye.y, vz = q.z - fwd.eye.z, n = Math.hypot(vx, vy, vz) || 1;
    cos = (vx * fwd.dir.x + vy * fwd.dir.y + vz * fwd.dir.z) / n;
  }
  const ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
  return ang > cone ? null : ang + d * FEEL.metreCost;
}
// the bare angle off your aim, degrees (no distance cost): a seat and a person weigh their aims against each other with it
export function aimAngle(p, fwd, q) {
  const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1e-6;
  let cos = (dx * fwd.x + dz * fwd.z) / d;
  if (fwd.eye && typeof q.y === 'number') {
    const vx = q.x - fwd.eye.x, vy = q.y - fwd.eye.y, vz = q.z - fwd.eye.z, n = Math.hypot(vx, vy, vz) || 1;
    cos = (vx * fwd.dir.x + vy * fwd.dir.y + vz * fwd.dir.z) / n;
  }
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}
// where a thing can be aimed at: its drawn middle; a hinged door also its doorway's middle, so an open door still takes E
function pointsOf(ctx, o) {
  const h = ctx.getObject(o.id), st = h?.state || {}, out = [];
  const leaf = st.leafId ? ctx.getObject(st.leafId) : null, b = (leaf || h)?.bounds;
  if (b) out.push(b.center);
  // a leaf is a wide thing: its whole span takes the aim, hinge edge to latch edge, not only its middle
  const ob = leaf && b?.obb;
  if (ob) {
    const [ax, half] = ob.halfExtents.x >= ob.halfExtents.z ? [ob.axes.x, ob.halfExtents.x] : [ob.axes.z, ob.halfExtents.z];
    for (const k of FEEL.doorAimSamples) out.push({ x: b.center.x + ax.x * half * k, y: b.center.y, z: b.center.z + ax.z * half * k });
  }
  if (typeof st.closedYaw === 'number' && st.openingWidth) {
    const f = h.worldFeetPosition || o.feetPosition, t = st.closedYaw * Math.PI / 180, r = st.openingWidth / 2;
    for (const k of [0, ...FEEL.doorAimSamples]) out.push({ x: f.x - Math.cos(t) * r * (1 + k), y: f.y + 1.1, z: f.z + Math.sin(t) * r * (1 + k) });
  }
  if (!out.length) out.push(o.worldFeetPosition || o.feetPosition);
  return out;
}
// a door's wide spans: its leaf (hinge edge to latch edge) and its doorway, as 2-D segments on the floor plan
function spansOf(ctx, o) {
  const h = ctx.getObject(o.id), st = h?.state || {}, out = [];
  const leaf = st.leafId ? ctx.getObject(st.leafId) : null, b = leaf?.bounds, ob = b?.obb;
  if (ob) {
    const [ax, half] = ob.halfExtents.x >= ob.halfExtents.z ? [ob.axes.x, ob.halfExtents.x] : [ob.axes.z, ob.halfExtents.z];
    out.push([{ x: b.center.x - ax.x * half, z: b.center.z - ax.z * half }, { x: b.center.x + ax.x * half, z: b.center.z + ax.z * half }]);
  }
  if (typeof st.closedYaw === 'number' && st.openingWidth) {
    const f = h.worldFeetPosition || o.feetPosition, t = st.closedYaw * Math.PI / 180, w = st.openingWidth;
    out.push([{ x: f.x, z: f.z }, { x: f.x - Math.cos(t) * w, z: f.z + Math.sin(t) * w }]);
  }
  return out;
}
// how far along your aim it crosses a span, or null: aiming anywhere across a leaf or its doorway IS aiming at that door
export function rayHitsSpan(p, fwd, a, b, reach) {
  const ex = b.x - a.x, ez = b.z - a.z, den = fwd.x * ez - fwd.z * ex;
  if (Math.abs(den) < 1e-6) return null;
  const wx = a.x - p.x, wz = a.z - p.z, t = (wx * ez - wz * ex) / den, u = (wx * fwd.z - wz * fwd.x) / den;
  return t >= 0 && t <= reach && u >= -0.02 && u <= 1.02 ? t : null;
}
export function aimedInteractable(ctx, player, input) {
  const p = player.worldFeetPosition || player.feetPosition;
  if (!p) return null;
  const fwd = aimForward(input);
  let best = null;
  for (const o of ctx.query({ tags: ['interactable'], radius: FEEL.interactionReach + 1.5, center: p })) {
    for (const q of pointsOf(ctx, o)) {
      const score = q && aimScore(p, fwd, q, FEEL.interactionReach, FEEL.aimCone);
      if (score != null && (!best || score < best.score)) best = { o, score, q };
    }
    for (const [a, b] of spansOf(ctx, o)) {
      const t = rayHitsSpan(p, fwd, a, b, FEEL.interactionReach);
      const score = t != null && FEEL.spanHitScore + t * 0.1; // nearer of two crossed doors wins
      if (t != null && (!best || score < best.score)) best = { o, score, span: true };
    }
  }
  if (best && !best.span && best.q) { best.ang = aimAngle(p, fwd, best.q); best.d = Math.hypot(best.q.x - p.x, best.q.z - p.z); }
  return best;
}
