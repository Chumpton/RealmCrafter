// Rig-name translator: data tables name bones logically (Spine, Spine1, Spine2, Neck, Head, RightArm, RightForeArm,
// LeftArm, LeftForeArm, Hips — and the old aliases neck, Spine01, Spine02 they were written with); boneName() answers
// the real name on whichever rig the row wears today (old 24-bone rig: Spine01/neck; Rolf's Mixamo rig: mixamorig:Spine1/Neck).
// Read once per row per model from getObjectBoneNames, cached in module memory. A rig that can't be read yet
// (server realm answering []) falls back to the old names and is asked again next time.
const ALIAS = { neck: 'Neck', spine01: 'Spine1', spine02: 'Spine2' };
const OLD = { Spine1: 'Spine01', Spine2: 'Spine02', Neck: 'neck' }; // fallback: today's rig names
// Per-rig axis signs (multiply a table's degrees). Measured: the Mixamo head pitches/turns the same way as the old rig.
export const AXIS_SIGN = {
  old:    { default: { pitch: 1, yaw: 1, roll: 1 } },
  mixamo: { default: { pitch: 1, yaw: 1, roll: 1 },   // per-bone override: Head: { pitch: -1 }
            LeftEyelid: { pitch: 1 }, RightEyelid: { pitch: 1 } }, // measured on Rolf's GLB: +pitch closes (lid rest ≈ 99° about X)
};
const norm = (n) => String(n).replace(/^.*:/, '').toLowerCase().replace(/0(\d)$/, '$1');
const logicalOf = (l) => ALIAS[String(l).toLowerCase()] ?? l;
const cache = new Map(); // id → { key, family, map: norm → real }
function modelKey(ctx, id) { const m = ctx.getObject(id)?.model; return typeof m === 'string' ? m : m?.id ?? ''; }
export function rig(ctx, id) {
  const key = modelKey(ctx, id), hit = cache.get(id);
  if (hit && hit.key === key) return hit;
  let names = []; try { names = ctx.getObjectBoneNames(id) || []; } catch (e) { names = []; }
  if (!names.length) return { key, family: 'old', map: null }; // not readable yet: old names, not cached
  const map = {}; for (const n of names) { const k = norm(n); if (!(k in map)) map[k] = n; }
  const r = { key, family: names.some((n) => n.startsWith('mixamorig:')) ? 'mixamo' : 'old', map, names };
  cache.set(id, r);
  return r;
}
export function boneName(ctx, id, logical) {
  const L = logicalOf(logical), r = rig(ctx, id);
  if (!r.map) return OLD[L] ?? logical;
  return r.map[norm(L)] ?? logical;
}
export function axisSign(ctx, id, logical, axis) {
  const t = AXIS_SIGN[rig(ctx, id).family] ?? AXIS_SIGN.old, L = logicalOf(logical);
  return t[L]?.[axis] ?? t.default?.[axis] ?? 1;
}
// A pose { logical: { axis: deg } } → tween keyframes on real bone addresses, signs applied.
export function poseAddresses(ctx, id, pose) {
  const kf = {};
  for (const [bone, axes] of Object.entries(pose)) {
    const real = boneName(ctx, id, bone);
    for (const [ax, v] of Object.entries(axes)) {
      const s = axisSign(ctx, id, bone, ax);
      kf[`bones.${real}.${ax}`] = Array.isArray(v) ? v.map((x) => x * s) : v * s;
    }
  }
  return kf;
}
