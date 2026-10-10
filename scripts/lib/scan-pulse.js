// SCAN PULSE · pure spec builders for the Light Editor Autofill scan (Death Stranding quiet: thin, pale, low alpha).
// scripts/light-editor.js spawns each with audience 'local', scope 'session'. Numbers live in ./data/scan-pulse.js.
//   ring.fx = { script: ringBreath(rM) }                       aiming ring breathes while phase 'autofill'
//   id = ctx.spawn(sweepSpec(c, rM, s)); animate(ctx, id, ...sweepTween(s))   the wavefront
//   ctx.spawn(blipSpec(pos, cls))  at distance / rM * sweepS    each surveyed thing as the wave reaches it
//   ctx.spawn(doneSpec(c, rM))                                  the settle when the read lands
import { SP } from './data/scan-pulse.js';
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const n2 = (v) => +(+v).toFixed(3);
const rg = (r) => `${n2(r[0])}..${n2(r[1])}`;
const TAU = 6.2832;
const SESSION = { audience: 'local', scope: 'session', castShadow: false, receiveShadow: false };

// the aiming ring's breathing shimmer: motes resting on the circumference + a faint ground band, one shared 1.4 s breath
export function ringBreath(rM) {
  const B = SP.breath, r = n2(Math.max(0.3, rM)), circ = TAU * r, w = n2(TAU / B.periodS);
  const motes = Math.round(cl(circ * B.motePerM, B.moteMin, B.moteMax)), glow = Math.round(cl(circ * B.glowPerM, B.glowMin, B.glowMax));
  const breathe = `(${B.alphaFloor}+${n2(1 - B.alphaFloor)}*(.5+.5*(time()*${w}).sin))`;
  return `fx
pop glint n=${motes} on=arc(${r}) life=${rg(B.life)} v=up(${rg(B.rise)}) size=${rg(B.moteSize)} col=${SP.pale} a=(0>.25:1>.7:1>0)*${breathe}*${B.alphaMax}*flick(3,.25) sz=$size r=sprite(mote,add)
pop band n=${glow} on=arc(${r}).c(.04) life=${rg([B.periodS * 1.2, B.periodS * 2])} size=${rg(B.glowSize)} col=${SP.pale} a=(0>.3:1>.7:1>0)*${breathe}*${B.glowAlpha} sz=$size r=sprite(soft-disc,add,ground)`;
}

// the wavefront: a thin flat ring, grown by the caller's tween; motes stand up behind it at fixed radius steps, timed to the easing
export function sweepSpec(center, rM, sweepS) {
  const W = SP.sweep, r = Math.max(0.3, rM), s = Math.max(0.2, sweepS);
  const band = cl(r * W.band, W.bandMinM, W.bandMaxM), inner = Math.max(r * (1 - W.band), r - band);
  const pops = W.moteSteps.slice(0, 7).map((f, i) => { // easeOutCubic reaches radius share f at t = 1 - (1-f)^(1/3)
    const t = n2((1 - Math.cbrt(1 - f)) * s), rf = n2(r * f), n = Math.round(cl(TAU * rf * W.motePerM, W.moteMin, W.moteMax));
    return `pop m${i} burst=${n} delay=${t} on=arc(${rf}) life=${rg(W.moteLife)} v=up(${rg(W.moteRise)}) size=${rg(W.moteSize)} acc=drag(1.5) col=${SP.pale} a=(0>.15:1>1:0)*${W.moteAlpha} sz=$size r=sprite(mote,add)`;
  });
  return { ...SESSION, tags: ['le-ring', 'le-sweep'], lifetime: n2(s + W.tail),
    feetPosition: { x: center.x, y: (center.y ?? 0) + W.lift, z: center.z }, rotation: { pitch: -90 }, scale: W.scaleFrom,
    primitive: { kind: 'ring', innerRadius: n2(inner), outerRadius: n2(r), thetaSegments: W.segments }, anchor: 'center', pivot: 'center',
    material: { color: SP.paleHex, emissive: SP.paleHex, emissiveIntensity: W.emissive, transparent: true, opacity: W.opacity, depthWrite: false, side: 'double' },
    children: [{ ...SESSION, tags: ['le-ring'], fx: { script: `fx\n${pops.join('\n')}` } }] };
}
export function sweepTween(sweepS) {
  const W = SP.sweep;
  return [{ scale: [W.scaleFrom, 1], 'material.opacity': [W.opacity, 0] }, { duration: Math.round(Math.max(0.2, sweepS) * 1000), easing: W.easing }];
}

// one surveyed thing read: a thin pale pillar that stands and fades, a few motes off its foot, coloured by what it is
export function blipSpec(pos, cls) {
  const B = SP.blip, col = B.colors[cls] ?? B.colors.other, h = B.height;
  return { ...SESSION, tags: ['le-ring', 'le-blip'], lifetime: B.life, feetPosition: { x: pos.x, y: (pos.y ?? 0) + B.lift, z: pos.z },
    fx: { script: `fx
pop pillar burst=1 at=point().c(${n2(h / 2)}) life=${B.life} size=${B.width} col=${col} a=(0>.12:1>.45:.6>1:0)*${B.alpha} sz=$size r=sprite(soft-disc,add,axis,${n2(h)},0,axis=<0,1,0>)
pop foot burst=1 life=${B.life} size=.9 col=${col} a=(0>.1:1>1:0)*${n2(B.alpha * 0.5)} sz=$size*(.4>1) r=sprite(soft-disc,add,ground)
pop rise burst=${Math.round((B.motes[0] + B.motes[1]) / 2)} on=disc(.25) life=${n2(B.life * 0.6)}..${B.life} v=up(.6..1.4) size=.03..0.05 col=${col} a=(1>0)*${B.moteAlpha} sz=$size r=sprite(mote,add)` } };
}

// the read landed: the whole circumference glows once and lets go, motes lift off it
export function doneSpec(center, rM) {
  const D = SP.done, r = n2(Math.max(0.3, rM)), circ = TAU * r, n = Math.round(cl(circ * D.perM, D.min, D.max));
  return { ...SESSION, tags: ['le-ring', 'le-done'], lifetime: D.life, feetPosition: { x: center.x, y: (center.y ?? 0) + 0.05, z: center.z },
    fx: { script: `fx
pop settle burst=${n} on=arc(${r}).c(.04) life=${n2(D.life * 0.7)}..${D.life} size=${rg(D.size)} col=${SP.pale} a=(0>.2:1>1:0)*${D.alpha} sz=$size*(.8>1.3) r=sprite(soft-disc,add,ground)
pop lift burst=${Math.round(n / 2)} on=arc(${r}) life=${n2(D.life * 0.6)}..${D.life} v=up(${rg(D.rise)}) acc=drag(1.2) size=.03..0.06 col=${SP.pale} a=(0>.1:1>1:0)*${D.moteAlpha} sz=$size r=sprite(mote,add)` } };
}
