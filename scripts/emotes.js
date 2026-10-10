// Emotes (creator 2026-10-06): a tile in the Emotes tab sends 'emote' {id}; the body plays the clip on its own 'emote' channel
// and the sound rings for everyone near. Moving (or another emote) lets go; a timed one lets go by itself. Data: scripts/lib/data/emotes.js
import { EMOTE_BY, HANDS } from './lib/data/emotes.js';
import { GUITAR_BORROW as G } from './lib/data/guitar-borrow.js';
import { rig } from './lib/rig-names.js';
import { animate } from 'builtin/tween';
const SPARKS = `fx
pop spark burst=26..34 life=.4..0.9 v=up(2..4)+sdir()*(1.5..3) size=.03..0.06 acc=grav()*.8+drag(.6) col=hdr(5,2.6,.7)>hdr(2,.6,.1) a=1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop flash burst=1 life=.25 at=point() r=light(<1,.6,.3>,40,6)`;
// the Metal emote's guitar: Rolf's guitar mesh across the chest, the track playing from it, gone when the emote ends
function dropProp(ctx) { const id = ctx.self.id + '/emote-prop'; if (ctx.getObject(id)) ctx.destroy(id) }
// hand props (creator 2026-10-06): a cigarette in the left hand, a pint in the right. Each arm lifts on its own clock (a drag, a sip),
// drops back to your side, and lifts again; the legs keep whatever they were doing: standing idle, the floor Sit, a bench.
const CIG_SMOKE = `fx
pop wisp rate=7 on=point() life=1.6..2.6 v=up(.25..0.4)+sdir()*.05 size=.025..0.04 acc=curl(.6)*.35+buoy(.25)+drag(1) sz=$size*(1>5) col=<.82,.82,.84> a=0>.35:.4>.6:.2>0 rot=spin(.4) r=sprite(smoke-puff,alpha)
pop ember n=1 at=point() glo=flick(1.3,.45) sz=.018*(.8+$glo*.6) col=hdr(5,1.6,.35)*(.6+$glo) a=1 r=sprite(soft-disc,add)
pop glow n=1 at=point() glo=flick(1.3,.45) r=light(<1,.45,.15>,$glo*1.2+.3,1.2)`;
const EXHALE = `fx
pop breath burst=9..13 life=1.2..2 v=%dir|0,0,-1*(.5..0.9)+up(.1..0.25)+sdir()*.12 size=.05..0.09 acc=curl(.5)*.4+buoy(.3)+drag(1.8) sz=$size*(1>4.5) col=<.86,.86,.88> a=0>.4:.12>.5:.3>0 rot=spin(.3) r=sprite(smoke-puff,alpha)`;
const PROP = {
  cig: (bone) => ({ ...(bone ? { attachment: { bone }, feetPosition: { x: -0.02, y: 0.09, z: 0.03 }, rotation: { roll: -90 } } : { feetPosition: { x: -0.25, y: 1.0, z: -0.2 }, rotation: { pitch: 90 } }),
    primitive: { kind: 'cylinder', radiusTop: 0.0055, radiusBottom: 0.0055, height: 0.05, radialSegments: 6 }, material: { color: 'oklch(0.96 0.005 90)', roughness: 0.85 }, pivot: 'center',
    children: [
      { id: 'filter', feetPosition: { x: 0, y: -0.025, z: 0 }, primitive: { kind: 'cylinder', radiusTop: 0.0058, radiusBottom: 0.0058, height: 0.02, radialSegments: 6 }, material: { color: 'oklch(0.72 0.09 65)', roughness: 0.8 } },
      { id: 'tip', feetPosition: { x: 0, y: 0.05, z: 0 }, primitive: { kind: 'cylinder', radiusTop: 0.005, radiusBottom: 0.0055, height: 0.006, radialSegments: 6 }, material: { color: 'oklch(0.35 0.05 40)', emissive: 'oklch(0.7 0.22 40)', emissiveIntensity: 2.5 }, fx: { script: CIG_SMOKE } },
    ] }),
  // a dimpled-less pub pint: thick glass base, amber beer, a cream head standing proud of the rim
  pint: (bone) => ({ ...(bone ? { attachment: { bone }, feetPosition: { x: 0.02, y: 0.05, z: 0.05 }, rotation: { roll: 90 } } : { feetPosition: { x: 0.28, y: 0.85, z: -0.1 } }),
    primitive: { kind: 'cylinder', radiusTop: 0.042, radiusBottom: 0.034, height: 0.15, radialSegments: 12 }, material: { color: 'oklch(0.95 0.01 200 / 0.28)', roughness: 0.05, metalness: 0, transparent: true },
    children: [
      { id: 'beer', feetPosition: { x: 0, y: 0.012, z: 0 }, primitive: { kind: 'cylinder', radiusTop: 0.038, radiusBottom: 0.031, height: 0.115, radialSegments: 12 }, material: { color: 'oklch(0.66 0.15 70)', emissive: 'oklch(0.5 0.12 65)', emissiveIntensity: 0.25, roughness: 0.2 } },
      { id: 'head', feetPosition: { x: 0, y: 0.127, z: 0 }, primitive: { kind: 'cylinder', radiusTop: 0.041, radiusBottom: 0.039, height: 0.028, radialSegments: 12 }, material: { color: 'oklch(0.96 0.03 90)', roughness: 0.95 } },
    ] }),
}
const handId = (k) => 'emote-' + k
function dropHand(ctx, k) { const me = ctx.self, id = me.id + '/' + handId(k); me.anim['hand_' + k] = null; if (ctx.getObject(id)) ctx.destroy(id); delete hands[k] }
function dropHands(ctx) { for (const k of Object.keys(HANDS)) dropHand(ctx, k) }
const hands = {} // k -> { liftAt, downAt }: this machine's own clock for each held prop (the arm pose itself is the body's anim, everyone sees it)
function takeHand(ctx, k) {
  const me = ctx.self, H = HANDS[k], bone = rig(ctx, me.id)?.map?.[H.bone] ?? null
  if (!ctx.getObject(me.id + '/' + handId(k))) ctx.spawn({ id: handId(k), parent: me.id, tags: ['carried'], scope: 'session', audience: 'near', ...PROP[k](bone) })
  hands[k] = { liftAt: ctx.now() + H.firstMs, downAt: 0 }
}
function stepHands(ctx) {
  const me = ctx.self, now = ctx.now()
  for (const [k, h] of Object.entries(hands)) {
    const H = HANDS[k]
    if (!h.downAt && now >= h.liftAt) { me.anim['hand_' + k] = { clip: H.clip, loop: 'loop', weight: 1, mask: { from: H.mask }, blend: 'override' }; h.downAt = now + H.liftMs }
    else if (h.downAt && now >= h.downAt) {
      me.anim['hand_' + k] = null; h.downAt = 0; h.liftAt = now + H.rest[0] + ctx.random() * (H.rest[1] - H.rest[0])
      if (H.exhale) { // the drag comes out as the arm drops
        const p = me.worldFeetPosition ?? me.feetPosition, yaw = (typeof me.rotation === 'number' ? me.rotation : me.rotation?.yaw ?? 0) * Math.PI / 180
        const dir = { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) }, hgt = me.state.seatedOn || me.anim?.emote?.clip === EMOTE_BY.sit?.clip ? 1.15 : 1.6
        ctx.emit('fx', { position: { x: p.x + dir.x * 0.12, y: p.y + hgt, z: p.z + dir.z * 0.12 }, script: EXHALE, params: { dir } }, { audience: { nearby: p, radius: 30 } })
      }
    }
  }
}
function giveProp(ctx, e) {
  const me = ctx.self, H = G.held, bone = rig(ctx, me.id)?.map?.spine2 ?? rig(ctx, me.id)?.map?.chest ?? null
  ctx.spawn({ id: 'emote-prop', parent: me.id, tags: ['carried'], scope: 'session', audience: 'near', lifetime: e.ms / 1000 + 0.5,
    model: G.model, ...(bone ? { attachment: { bone }, feetPosition: H.feet, rotation: H.rotation } : { feetPosition: H.body.feet, rotation: H.body.rotation }),
    audio: e.music ? { clip: e.music, gain: 0.55, loop: false, spatial: true, maxDistance: 35 } : undefined })
}
const PUFF = `fx
pop puff burst=10..14 life=.8..1.4 v=<0,.2,.6>+sdir()*(.3..0.7) size=.18..0.3 acc=buoy(.4)+drag(1.6) col=<.62,.7,.32> a=0>.45:.4>.7:.2>0 sz=$size*(.6>2.2) rot=spin(.3) r=sprite(smoke-puff,alpha)`;

// ---- tricks (creator 2026-10-06): fire breath, a firework, a party popper, a pie in a friend's face, levitation
const NEAR = (p) => ({ audience: { nearby: p, radius: 45 } })
const FIRE_BREATH = `fx
pop flame rate=90 win=.35;2.1 on=point() life=.35..0.6 v=%dir|0,0,-1*(5..7)+sdir()*.6+up(.3) size=.12..0.22 acc=curl(.8)*1.2+buoy(1.5)+drag(1.4) sz=$size*(.4>2.6) col=hdr(5,3.4,1.2)>.3:hdr(3.4,1.3,.25)>.7:hdr(1.2,.3,.05) a=0>.1:1>.7:.7>0 rot=spin(.4) r=sprite(flame-wisp,add)
pop smoke on=@flame?.25 inh=p;v:$v*.3 life=1..1.8 size=.2..0.35 acc=buoy(.8)+drag(1) sz=$size*(.7>2.6) col=<.25,.23,.22> a=0>.3:.3>.7:.2>0 r=sprite(smoke-puff,alpha)
pop glow n=1 win=.35;2.1 at=point() r=light(<1,.5,.15>,22,9)`
const ROCKET = `fx
pop rocket burst=1 life=1.1 v=up(24)+sdir()*.8 acc=drag(.6) size=.12 col=hdr(5,3,1.2) a=1 r=sprite(ember,add,velocity,.06)
pop trail on=@rocket rate=60 life=.5..0.8 v=sdir()*.3 size=.05..0.09 acc=grav()*.2+drag(1) col=hdr(3,1.6,.5)>hdr(.6,.3,.1) a=1>0 r=sprite(ember,add)
pop smoke on=@rocket rate=25 life=1..1.6 size=.12..0.2 acc=buoy(.2)+drag(1) sz=$size*(1>3) col=<.6,.58,.55> a=0>.3:.2>0 r=sprite(smoke-puff,alpha)`
const BLOOM = `fx
pop star burst=110..140 life=1.4..2.2 v=sdir()*(7..10) acc=grav()*.35+drag(1.3) size=.08..0.14 tint=hdr(%r|4,%g|1,%b|1.5)..hdr(4,3.6,1.2) col=$tint a=1>.7:1>0 sz=$size*(1>.3) r=sprite(ember,add,velocity,.05)
pop sparkle on=@star?.4 life=.4..0.8 v=sdir()*.2 size=.04..0.07 col=hdr(5,5,4) a=(1>0)*flick(14,.6) r=sprite(soft-disc,add)
pop flash burst=1 life=.5 at=point() r=light(<1,.8,.6>,600,60)`
const CONFETTI = `fx
pop bit burst=70..90 life=1.6..2.6 v=%dir|0,0,-1*(3..5)+up(3..5)+sdir()*1.4 acc=grav()*.35+drag(2.2)+curl(.8)*.6 size=.035..0.06 tint=<1,.25,.4>..<.3,.7,1> col=$tint*1.4 spin=-14..14 rot=$age*$spin a=1>.8:1>0 floor=stick r=sprite(soft-disc,alpha)
pop streamer burst=10 life=1.4..2 v=%dir|0,0,-1*(2..3.5)+up(3..4.5)+sdir()*.8 acc=grav()*.4+drag(2) size=.02 col=<1,.85,.3>..<.4,1,.6> r=rib(.5,.02,$col)
pop pop burst=1 life=.2 at=point() r=light(<1,.85,.6>,30,5)`
const SPLAT = `fx
pop cream burst=30..40 life=.5..1 v=sdir()*(1.5..3)+up(1) acc=grav()*.9+drag(1) size=.05..0.11 col=<.98,.95,.85>..<.95,.82,.6> a=1>0 floor=stick r=sprite(soft-disc,alpha)
pop crust burst=8..12 life=.6..1.1 v=sdir()*(2..3)+up(1.5) acc=grav() size=.04..0.07 col=<.8,.55,.25> spin=-10..10 rot=$age*$spin a=1>0 floor=stick r=sprite(soft-disc,alpha)`
const LEVITATE = `fx
pop rune n=1 at=point() glo=flick(.6,.2) sz=1.3 col=hdr(.6,1.4,3)*$glo a=.55 rot=$age*.4 r=sprite(soft-disc,add)
pop mote rate=14 on=disc(.6) life=1.2..2 v=up(.4..0.9) size=.02..0.04 acc=curl(.5)*.3 col=hdr(1.5,2.6,4) a=0>.2:1>.7:1>0 r=sprite(ember,add)
pop glow n=1 at=point() r=light(<.5,.75,1>,3,4)`
function yawDir(me) { const y = (typeof me.rotation === 'number' ? me.rotation : me.rotation?.yaw ?? 0) * Math.PI / 180; return { x: -Math.sin(y), y: 0, z: -Math.cos(y) } }
function trick(ctx, e) {
  const me = ctx.self, p = me.worldFeetPosition ?? me.feetPosition, d = yawDir(me)
  if (e.trick === 'firebreath') {
    ctx.emit('fx', { position: { x: p.x + d.x * .25, y: p.y + 1.55, z: p.z + d.z * .25 }, script: FIRE_BREATH, params: { dir: d } }, NEAR(p))
    ctx.emit('screenShake', { intensity: .25, duration: 1.6 }, { audience: { player: me.id } })
  } else if (e.trick === 'firework') {
    const at = { x: p.x + d.x * 1.5, y: p.y + .3, z: p.z + d.z * 1.5 }
    ctx.emit('fx', { position: at, script: ROCKET }, NEAR(p))
    const hue = [[4, 1, 1.5], [1, 2.2, 4], [1.2, 4, 1.4], [4, 3, .6], [3.4, 1, 4]][Math.floor(ctx.random() * 5)]
    ctx.after(1.1, 'fireworkBloom', { x: at.x, y: at.y + 21, z: at.z, c: hue })
  } else if (e.trick === 'popper') {
    ctx.emit('fx', { position: { x: p.x + d.x * .4, y: p.y + 1.35, z: p.z + d.z * .4 }, script: CONFETTI, params: { dir: d } }, NEAR(p))
  } else if (e.trick === 'pie') {
    let best = null, bd = 9 // the nearest friend within 9 m, else the pie lands 6 m ahead
    for (const q of ctx.place.players) { if (q.id === me.id || !q.feetPosition) continue; const f = q.feetPosition, dd = Math.hypot(f.x - p.x, f.z - p.z); if (dd < bd) { bd = dd; best = q } }
    const from = { x: p.x + d.x * .4, y: p.y + 1.6, z: p.z + d.z * .4 }, to = best ? { x: best.feetPosition.x, y: best.feetPosition.y + 1.6, z: best.feetPosition.z } : { x: p.x + d.x * 6, y: p.y + .05, z: p.z + d.z * 6 }
    const id = ctx.spawn({ tags: ['pie'], lifetime: 2, feetPosition: from, scope: 'session', castShadow: true,
      primitive: { kind: 'cylinder', radiusTop: .13, radiusBottom: .1, height: .06, radialSegments: 14 }, material: { color: 'oklch(0.7 0.11 65)', roughness: .8 },
      children: [{ id: 'cream', feetPosition: { x: 0, y: .06, z: 0 }, primitive: { kind: 'sphere', radius: .12, widthSegments: 12, heightSegments: 6 }, scale: { x: 1, y: .45, z: 1 }, material: { color: 'oklch(0.97 0.02 90)', roughness: .9 } }] })
    const T = .55, mid = (from.y + to.y) / 2 + 1.1
    animate(ctx, id, { 'feetPosition.x': [from.x, to.x], 'feetPosition.z': [from.z, to.z], 'feetPosition.y': [from.y, mid, to.y], 'rotation.pitch': [0, 360] }, { duration: T, easing: 'linear' })
    ctx.after(T, 'pieSplat', { id, to, who: best?.id ?? null, by: me.displayName ?? 'someone' })
  } else if (e.trick === 'levitate') {
    me.state.levitate = { y: p.y, at: ctx.now() }
    me.fx = { script: LEVITATE }
  }
}
export function fireworkBloom(ctx, a) {
  const at = { x: a.x, y: a.y, z: a.z }
  ctx.emit('fx', { position: at, script: BLOOM, params: { r: a.c[0], g: a.c[1], b: a.c[2] } }, { audience: { nearby: at, radius: 160 } })
  ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-emote-firework-burst-boom-crackle.mp3', position: at, volume: .9, maxDistance: 160 })
}
export function pieSplat(ctx, a) {
  if (ctx.getObject(a.id)) ctx.destroy(a.id)
  ctx.emit('fx', { position: a.to, script: SPLAT }, { audience: { nearby: a.to, radius: 40 } })
  ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-emote-cream-pie-splat.mp3', position: a.to, volume: .9 })
  if (a.who) {
    ctx.emit('screenFlash', { color: 'oklch(0.97 0.03 90)', duration: 1.4, intensity: .9 }, { audience: { player: a.who } })
    ctx.emit('damageNumber', { position: { ...a.to, y: a.to.y + .5 }, text: 'PIED!', color: 'oklch(0.95 0.06 90)', size: 1.2 }, { audience: { nearby: a.to, radius: 30 } })
    const t = ctx.getObject(a.who); if (t) ctx.emit('squash', { target: a.who, axis: 'y', intensity: .25, duration: .35 })
  }
}
function endTrick(ctx) { const me = ctx.self; if (me.state.levitate) { me.state.levitate = null; me.fx = null } }
let until = 0
export const updateSchedule = { every: { seconds: 0.2 } }
export function onInput(ctx, input) {
  if (!input.pressed?.emote) return
  const me = ctx.self, e = EMOTE_BY[input.actionData?.emote?.id]; if (!e) return
  if (e.hand) { // a held prop: toggles on (press again to put it away); the body keeps its pose, a looping emote like Sit stays
    if (hands[e.hand]) { dropHand(ctx, e.hand); return }
    const keep = [EMOTE_BY.sit?.clip, EMOTE_BY.levitate?.clip] // creator 2026-10-06: a smoke or a pint while sitting or levitating keeps the pose
    if (me.anim?.emote && !keep.includes(me.anim.emote.clip)) { me.anim.emote = null; dropProp(ctx) }
    takeHand(ctx, e.hand)
  } else {
    if (e.trick !== 'levitate') dropHands(ctx) // the float keeps whatever is in your hands
    endTrick(ctx); me.anim.emote = null; dropProp(ctx)
    if (e.prop) giveProp(ctx, e)
    me.anim.emote = { clip: e.clip, loop: e.loop, weight: 1, blend: 'override' }
  }
  if (!e.hand) until = e.ms ? ctx.now() + e.ms : Infinity
  const p = me.feetPosition
  if (e.prop) ctx.emit('fx', { position: { x: p.x, y: p.y + 1.1, z: p.z }, script: SPARKS }, { audience: { nearby: p, radius: 30 } })
  if (e.sfx) for (const l of ctx.place.players) { // each listener hears it at their own EMOTE SOUNDS level (player.state.emoteVol, 0-200 %)
    const lp = l.feetPosition, ev = typeof l.state?.emoteVol === 'number' ? l.state.emoteVol : 100
    if (!lp || ev <= 0 || Math.hypot(lp.x - p.x, lp.z - p.z) > 30) continue
    ctx.emit('playSound', { clip: e.sfx, position: { x: p.x, y: p.y + 1.2, z: p.z }, volume: 0.8 * ev / 100, maxDistance: 25 }, { audience: { player: l.id } })
  }
  if (e.trick) trick(ctx, e)
  if (e.puff) ctx.emit('fx', { position: { x: p.x, y: p.y + 0.8, z: p.z }, script: PUFF }, { audience: { nearby: p, radius: 30 } })
  ctx.emit('stat', { name: 'emote_' + e.id })
}
export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false) return
  const v = me.velocity ?? { x: 0, z: 0 }, moving = !me.state.seatedOn && Math.hypot(v.x, v.z) > 0.6
  if (Object.keys(hands).length) { // held props go away when you walk off or ride; on a bench they stay until E stands you up
    if (moving || me.state.mount) dropHands(ctx); else stepHands(ctx)
  }
  if (!me.state.levitate && me.fx?.script === LEVITATE) me.fx = null // player.js ended the float (a move key)
  if (!me.anim?.emote) { if (me.state.levitate) endTrick(ctx); return }
  if (ctx.now() > until || moving || me.state.mount) { me.anim.emote = null; dropProp(ctx); endTrick(ctx) }
}
