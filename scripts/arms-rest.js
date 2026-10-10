// Arms back at the sides: a one-shot swing or cast clip ("once") holds its last frame forever, arms out front.
// This clears each one a beat after it starts, and drops a stale sit when the body is standing on its own feet.
// Campton (creator, 2026-10-06) carries his crystal staff in the right hand, foot on the ground.
const HOLD = { atk: 1100, cast: 1500 } // ms each clip is given before the arms come back down
const STAFF = { owner: 'pa_d69d1b1f0d7352adedf69f2ee39457a4', model: '/cdn/model-magic-staff-blue-crystal-1v7hqh4p.glb',
  // stood on the ground out in front of his right side (body frame: +X right, -Z forward), the right hand reaching to grip it (creator 2026-10-06)
  at: { x: 0.2, y: 0, z: -0.24 }, rot: { yaw: 0, pitch: -4, roll: -5 }, grip: { x: 0, y: 1.08, z: 0 } }
const WEAR = false // creator 2026-10-06: "remove camptons crown and staff for now": flip to true to bring both back
export const updateSchedule = { every: { seconds: 0.25 } }
const seen = new Map()
export function onSpawn(ctx) {
  const me = ctx.self; if (me.isLocal === false) return
  if (WEAR && me.userId === STAFF.owner) { giveStaff(ctx, me); giveCrown(ctx, me) }
}
// his king's crown (creator 2026-10-06): scripts/gen/kings-crown.js riding the Head bone
const CROWN = { at: { x: 0, y: 0.125, z: 0.015 }, rot: { yaw: 0, pitch: 0, roll: 0 }, scale: 0.8 } // seated on the crown of the head, not floating (creator 2026-10-06)
function giveCrown(ctx, me) {
  ctx.spawn({ id: 'crown', scale: CROWN.scale, parent: me.id, tags: ['worn-crown', 'carried'], attachment: { bone: 'Head' }, scope: 'session', audience: 'near',
    primitive: { kind: 'scripted', script: 'scripts/gen/kings-crown.js' }, feetPosition: CROWN.at, rotation: CROWN.rot })
}
function giveStaff(ctx, me) {
  ctx.spawn({ id: 'staff', parent: me.id, tags: ['held-staff', 'carried'], scope: 'session', audience: 'near',
    visibleInFirstPerson: true, model: STAFF.model, layout: { maxExtents: { y: 1.6 } }, feetPosition: STAFF.at, rotation: STAFF.rot })
}
export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false) return
  const now = ctx.now(), a = me.anim ?? {}
  for (const ch of ['atk', 'cast']) {
    const v = a[ch]; if (!v) { seen.delete(ch); continue }
    const key = ch + ':' + (me.mixer?.[ch]?.startTick ?? JSON.stringify(v))
    if (seen.get(ch)?.key !== key) seen.set(ch, { key, at: now })
    else if (now - seen.get(ch).at > HOLD[ch]) { me.anim[ch] = null; seen.delete(ch) }
  }
  if (!WEAR) { for (const k of ['crown', 'staff']) if (ctx.getObject(me.id + '/' + k)) ctx.destroy(me.id + '/' + k) }
  else if (me.userId === STAFF.owner) holdStaff(ctx, me)
  if (a.sit && !me.parent && !me.state.mount && !me.state.gaitSeated && !me.state.seat) me.anim.sit = null
}

// the hand grasps the planted staff; let go while riding, sitting, swinging or casting, and the staff hides while he rides
let gripOn = null
function holdStaff(ctx, me) {
  const st = ctx.getObject(me.id + '/staff'); if (!st) return
  const a = me.anim ?? {}, riding = !!(me.state.mount || me.parent || me.state.seat || me.state.gaitSeated)
  const on = !riding && !a.sit && !a.atk && !a.cast && !a.emote
  if (st.visible === riding) st.visible = !riding
  if (on === gripOn) return
  gripOn = on
  const b = { ...(me.bones ?? {}) }
  b.RightHand = on ? { reach: { to: { object: st.id, offset: STAFF.grip }, weight: 1, blendIn: 0.25, blendOut: 0.2 } } : { reach: null }
  me.bones = b
}
