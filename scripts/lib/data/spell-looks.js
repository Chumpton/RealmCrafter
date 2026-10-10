// SPELL LOOKS (creator 2026-10-10: "some spells aren't as unique and punchy as fireball and frostbolt, update pass everything
// to look way cooler and juicier"; matte + cartoony, #12490). Every school gets the Fireball recipe: a solid toon core riding
// the bolt, three hard colour bands hugging it, a tail that steps through the school's colours, a streak ribbon, and an impact
// that pops a flat splash shape, a ring, and chunky bits that fall and bounce. Hunter shots fly as real arrows.
// class-cast-player.js reads boltLook(sp), IMPACTS[school], SLASH, HEAL_FX and BUFF_FX. Colour of the spell rides %r %g %b.
import { KT } from './vfx-tex.js';

const C3 = '<%r|1,%g|.5,%b|.2>';
const P = `sprite(${KT.puff},alpha)`;
// the three toon bands round the core: rim (dark), body (mid), core (light); same timing as Fireball's
const bands = (rim, body, core, s = 1) => `pop rim rate=?low:50|90 local on=sphere(${.32 * s}) life=.12..0.22 v=sdir()*.4 size=${.38 * s}..${.54 * s} col=${rim} a=1 sz=$size*(.6>1:.4>.2) r=${P}
pop body rate=?low:50|90 local on=sphere(${.24 * s}) life=.12..0.2 v=sdir()*.3 size=${.27 * s}..${.38 * s} col=${body} a=1 sz=$size*(.6>1:.4>.2) r=${P}
pop core rate=?low:25|50 local on=sphere(${.15 * s}) life=.1..0.16 size=${.15 * s}..${.22 * s} col=${core} a=1 sz=$size*(.7>1>.3) r=${P}`;
const streak = (len, w, col) => `pop streak n=1 local life=99 size=1 r=rib(${len},${w},${col},blend=alpha,material=scripts/mat-streak.js,params=core:.3;head:1)`;
const lamp = (col, i = 1.4) => `pop lamp n=1 local r=light(${col},${i},5)`;

const BOLT_RAW = {
  shadow: `fx
${bands('<.14,.03,.24>', '<.4,.1,.66>', '<.76,.45,1>', 1.1)}
pop swirl n=1 local size=1.15 col=<.5,.18,.8> a=.9 rot=spin(-3) r=sprite(${KT.whirl},alpha)
pop tail rate=?low:90|190 on=sphere(.18) life=.6..0.9 v=sdir()*.15 size=.5..0.7 acc=curl(.6)*.6 col=<.5,.15,.8>>.2:<.28,.06,.45>>.6:<.07,.02,.1> a=1>.8:1>0 sz=$size*(1>.6:.5>.05) r=${P}
pop wisp rate=26 on=sphere(.3) life=.4..0.7 v=sdir()*(1..2) size=.06..0.1 acc=curl(1.5)+drag(1) col=<.78,.45,1> a=1>0 r=${P}
${streak(1.3, .4, '<.34,.08,.58>')}`,
  arcane: `fx
${bands('<.5,.08,.72>', '<.85,.35,1>', '<1,.82,1>')}
pop twinkle rate=36 local on=sphere(.5) life=.25..0.4 size=.12..0.2 spin=-6..6 col=<1,.7,1> a=1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop tail rate=?low:60|130 on=sphere(.14) life=.5..0.7 v=sdir()*.2 size=.32..0.45 col=<1,.75,1>>.25:<.8,.3,1>>.65:<.4,.08,.6> a=1>.8:1>0 sz=$size*(1>.6:.5>.05) r=${P}
pop sigil n=1 local size=.9 col=<.9,.5,1> a=.8 rot=spin(2.5) r=sprite(${KT.sigil2},alpha)
${streak(1.2, .3, '<.75,.3,1>')}`,
  storm: `fx
${bands('<.18,.3,.85>', '<.55,.72,1>', '<1,.97,.6>', .85)}
pop forks rate=14 local life=.06..0.12 size=1..1.4 rot=0..6.28 col=<1,.95,.45> a=1>0 r=sprite(${KT.forks},alpha)
pop arc rate=18 local life=.05..0.1 size=.7..1 rot=0..6.28 col=<.7,.85,1> a=1 r=sprite(${KT.bolt},alpha)
pop spark rate=60 life=.15..0.3 v=sdir()*(2..4) size=.02..0.035 acc=grav()*.4 col=<1,.95,.5> a=1>0 r=sprite(ember,alpha,velocity,.06)
${streak(1.8, .3, '<.6,.75,1>')}`,
  holy: `fx
${bands('<.92,.5,.06>', '<1,.78,.22>', '<1,.97,.75>')}
pop rays n=1 local size=1.4 col=<1,.85,.35> a=.85 rot=spin(1.6) r=sprite(${KT.rays},alpha)
pop tail rate=?low:50|110 on=sphere(.14) life=.5..0.8 v=sdir()*.2 size=.14..0.24 spin=-5..5 col=<1,.95,.6>>.3:<1,.75,.2>>.7:<.85,.45,.05> a=1>.7:1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop feather rate=14 on=sphere(.3) life=.8..1.2 v=sdir()*.4 size=.12..0.2 acc=grav()*.15+drag(1.5) col=<1,.96,.85> a=1>.7:1>0 r=${P}
${streak(1.3, .34, '<1,.75,.2>')}`,
  nature: `fx
${bands('<.08,.3,.06>', '<.28,.66,.14>', '<.75,1,.35>')}
pop vortex n=1 local size=1.1 col=<.4,.85,.2> a=.85 rot=spin(-2.5) r=sprite(${KT.vortex},alpha)
pop leaf rate=?low:14|28 on=sphere(.25) life=.8..1.2 v=sdir()*(.4..0.9) size=.14..0.22 spin=-6..6 acc=grav()*.25+drag(1.2) col=<.2,.6,.1>..<.55,.85,.2> a=1>.7:1>0 rot=$age*$spin r=${P}
pop spore rate=26 on=sphere(.3) life=.4..0.8 v=up(.4..0.8)+sdir()*.4 size=.04..0.07 col=<.85,1,.45> a=1>0 r=${P}
${streak(1.3, .32, '<.3,.7,.15>')}`,
  earth: `fx
${bands('<.3,.18,.08>', '<.6,.42,.2>', '<.9,.75,.4>')}
pop dust rate=?low:40|90 on=sphere(.14) life=.35..0.55 v=sdir()*.1 size=.3..0.42 col=<.62,.44,.22>>.4:<.42,.3,.18>><.26,.2,.14> a=1>.8:1>0 sz=$size*(1>.6:.5>.05) r=${P}
pop pebble rate=20 on=sphere(.25) life=.5..0.8 v=sdir()*(1..2) size=.06..0.11 acc=grav() col=<.35,.25,.16> a=1 floor=bounce(.3) r=${P}
${streak(1.1, .34, '<.65,.45,.2>')}`,
  arrow: `fx
pop glint n=1 local size=.35 col=${C3} a=1 rot=spin(4) r=sprite(${KT.star},alpha)
pop tr rate=?low:40|80 life=.25..0.4 v=sdir()*.15 size=.08..0.14 col=${C3} a=1>0 sz=$size*(1>.2) r=${P}
pop spark rate=24 life=.2..0.35 v=sdir()*(.6..1.4) size=.04..0.07 spin=-6..6 col=${C3} a=1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
${streak(1.6, .1, C3)}`,
};

// the solids each bolt carries (toon outline, matte): one or more parts, all centred on the bolt; the bolt's -Z faces the target
const M = (color, extra = {}) => ({ color, roughness: 0.9, outline: true, ...extra });
const tumble = true;
const PARTS = {
  shadow: [{ prim: { kind: 'dodecahedron', radius: 0.2, detail: 0 }, mat: M('oklch(0.2 0.06 300)'), tumble }],
  arcane: [{ prim: { kind: 'octahedron', radius: 0.22, detail: 0 }, mat: M('oklch(0.86 0.12 320)', { emissive: 'oklch(0.7 0.18 320)', emissiveIntensity: 0.1 }), tumble }],
  storm: [{ prim: { kind: 'octahedron', radius: 0.17, detail: 0 }, mat: M('oklch(0.95 0.13 100)', { emissive: 'oklch(0.85 0.15 100)', emissiveIntensity: 0.12 }), tumble }],
  holy: [{ prim: { kind: 'icosahedron', radius: 0.2, detail: 0 }, mat: M('oklch(0.9 0.14 90)', { emissive: 'oklch(0.8 0.15 85)', emissiveIntensity: 0.1 }), tumble }],
  nature: [{ prim: { kind: 'octahedron', radius: 0.2, detail: 0 }, mat: M('oklch(0.58 0.16 140)'), scale: { x: 0.75, y: 1.5, z: 0.75 }, rot: { yaw: 0, pitch: 90, roll: 0 } }],
  earth: [{ prim: { kind: 'dodecahedron', radius: 0.24, detail: 0 }, mat: M('oklch(0.42 0.06 60)'), tumble }],
  arrow: [
    { prim: { kind: 'cylinder', radiusTop: 0.022, radiusBottom: 0.022, height: 0.95, radialSegments: 5 }, mat: M('oklch(0.48 0.07 60)'), rot: { yaw: 0, pitch: 90, roll: 0 } },
    { prim: { kind: 'cone', radius: 0.06, height: 0.17, radialSegments: 4 }, mat: M('oklch(0.75 0.01 250)'), rot: { yaw: 0, pitch: -90, roll: 0 }, z: -0.52 },
    { prim: { kind: 'box', width: 0.16, height: 0.01, depth: 0.2 }, mat: M('oklch(0.92 0.02 90)'), z: 0.4 },
    { prim: { kind: 'box', width: 0.01, height: 0.16, depth: 0.2 }, mat: M('oklch(0.92 0.02 90)'), z: 0.4 },
  ],
  hammer: [
    { prim: { kind: 'box', width: 0.34, height: 0.2, depth: 0.2 }, mat: M('oklch(0.82 0.13 88)'), spin: true },
    { prim: { kind: 'cylinder', radiusTop: 0.03, radiusBottom: 0.03, height: 0.5, radialSegments: 5 }, mat: M('oklch(0.45 0.07 55)'), y: -0.3, spin: true },
  ],
};
// which look a ranged spell wears; null = the caller's own (Fireball rock, Frostbolt shard)
const HUNT = new Set(['Auto Shot', 'Aimed Shot', 'Arcane Shot', 'Concussive Shot', 'Silencing Shot', 'Serpent Sting', 'Scatter Shot', 'Multi-Shot', 'Volley']);
export function boltLook(sp) {
  if (!sp) return null;
  if (HUNT.has(sp.name) || sp.cls === 'vhunter') return { fx: BOLT_FX.arrow, parts: PARTS.arrow, speedMul: 1.6 };
  if (sp.name === 'Hammer of Justice' || sp.name === 'Hammer of Wrath') return { fx: BOLT_FX.holy, parts: PARTS.hammer };
  const fx = BOLT_FX[sp.school]; if (!fx) return null;
  return { fx, parts: PARTS[sp.school] };
}

// ---- impacts: a flat splash shape and a ring pop first, then the school's own bits ----
const pow = (col, tex = KT.splat, s = 1.6) => `pop pow burst=1 life=.3 size=${s} rot=0..6.28 col=${col} a=1>.75:1>0 sz=$size*(.3>1.05:.5>1.2) r=sprite(${tex},alpha)
pop hoop burst=1 life=.35 size=${s * 1.4} col=${col} a=1>0 sz=$size*(.15>1) r=sprite(${KT.hoop},alpha)`;
const chunks = (col, n = '10..14', s = '.12..0.22') => `pop chunk burst=${n} on=sphere(.2) life=.6..1 v=up(2..3.5)+sdir()*(2..3.5) size=${s} spin=-8..8 acc=grav() col=${col} a=1 rot=$age*$spin floor=bounce(.35) r=${P}`;
const IMPACT_RAW = {
  shadow: `fx
${pow('<.45,.12,.72>')}
${chunks('<.32,.08,.5>')}
pop murk burst=10..14 on=sphere(.35) life=.6..1 v=sdir()*(.6..1.4)+up(.4) size=.4..0.65 acc=curl(.8)+drag(1.6) col=<.1,.03,.16> a=.95>.6:.9>0 sz=$size*(.6>1.6) r=${P}
pop swirl burst=1 life=.55 size=1.9 col=<.6,.25,.9> a=1>0 sz=$size*(.4>1.2) rot=spin(-4) r=sprite(${KT.whirl},alpha)
pop wisp burst=14..20 on=sphere(.25) life=.4..0.8 v=sdir()*(2..3.5) size=.06..0.12 acc=curl(1.5)+drag(1.4) col=<.8,.5,1> a=1>0 r=${P}
pop lamp burst=1 life=.3 r=light(<.6,.25,1>,2.5,7)`,
  arcane: `fx
${pow('<.85,.35,1>', KT.spikes)}
pop star burst=16..22 on=sphere(.2) life=.45..0.8 v=sdir()*(3..5) size=.16..0.28 spin=-8..8 acc=drag(2.5) col=<1,.7,1>..<.75,.35,1> a=1>.7:1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop runes burst=1 life=.7 size=2.2 col=<.85,.4,1> a=1>0 sz=$size*(.6>1.2) rot=spin(.8) r=sprite(${KT.sigil2},alpha)
pop shard burst=10..14 on=sphere(.2) life=.4..0.7 v=sdir()*(2..4)+up(1) size=.08..0.14 acc=grav()*.6 col=<1,.8,1> a=1 floor=bounce(.3) r=${P}
pop lamp burst=1 life=.3 r=light(<.9,.4,1>,2.5,7)`,
  storm: `fx
${pow('<1,.95,.45>', KT.rays, 2)}
pop forks burst=3 life=.1..0.22 size=1.8..2.6 rot=0..6.28 col=<1,.95,.5> a=(1>0)*flick(20,.6) r=sprite(${KT.forks},alpha)
pop arc burst=12..16 life=.08..0.18 v=sdir()*(8..14) size=.03..0.05 col=<.75,.88,1> a=1>0 r=sprite(ember,alpha,velocity,.14)
pop spark burst=16..22 life=.3..0.6 v=sdir()*(3..6)+up(1) size=.03..0.05 acc=grav()*.6 col=<1,.95,.55> a=(1>0)*flick(14,.5) floor=bounce(.4) r=sprite(ember,alpha,velocity,.04)
pop lamp burst=1 life=.18 r=light(<.8,.9,1>,4,10)`,
  earth: `fx
${pow('<.6,.42,.2>')}
${chunks('<.38,.27,.17>..<.55,.4,.25>', '14..20', '.14..0.28')}
pop dust burst=10..14 on=disc(.5) life=.9..1.5 v=up(.5..1.2)+sdir()*(.8..1.4) size=.5..0.85 acc=buoy(.2)+drag(1.4) col=<.6,.5,.36> a=.9>.5:.8>0 sz=$size*(.6>1.9) r=${P}`,
  steel: `fx
pop slash burst=1 life=.22 size=1.9 rot=-.6..0.6 col=<1,.97,.9> a=1>.6:1>0 sz=$size*(.6>1.1) r=sprite(${KT.crescent},alpha)
pop slash2 burst=1 life=.26 size=1.5 rot=2.2..3.4 col=${C3} a=1>.5:1>0 sz=$size*(.5>1.1) r=sprite(${KT.crescent},alpha)
pop pow burst=1 life=.18 size=1 col=<1,.95,.8> a=1>0 sz=$size*(.3>1.2) r=sprite(${KT.spark4},alpha)
pop spark burst=22..30 life=.2..0.45 v=sdir()*(4..8) size=.025..0.045 acc=grav()*.8+drag(1) col=<1,.85,.45> a=1>0 floor=bounce(.4) r=sprite(ember,alpha,velocity,.05)
${chunks('<.8,.12,.1>', '6..10', '.06..0.12')}`,
  holy: `fx
${pow('<1,.8,.3>', KT.rays, 2)}
pop star burst=14..20 on=sphere(.25) life=.6..1 v=up(1.5..3)+sdir()*(1.5..2.5) size=.16..0.26 spin=-6..6 acc=drag(2) col=<1,.95,.6>..<1,.75,.2> a=1>.7:1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop feather burst=10..14 on=sphere(.3) life=1..1.5 v=sdir()*(1..2)+up(1) size=.14..0.22 acc=grav()*.15+drag(2) col=<1,.97,.88> a=1>.7:1>0 r=${P}
pop lamp burst=1 life=.3 r=light(<1,.8,.35>,2.5,7)`,
  nature: `fx
${pow('<.35,.75,.15>')}
pop leaf burst=16..22 on=sphere(.25) life=.8..1.3 v=up(1.5..3)+sdir()*(1.5..3) size=.14..0.24 spin=-8..8 acc=grav()*.35+drag(1.4) col=<.2,.6,.1>..<.6,.88,.2> a=1>.7:1>0 rot=$age*$spin r=${P}
pop spore burst=12..16 on=sphere(.4) life=.7..1.1 v=up(.6..1.2)+sdir()*.6 size=.05..0.09 col=<.85,1,.45> a=1>0 r=${P}
pop vortex burst=1 life=.6 size=1.8 col=<.4,.85,.2> a=1>0 sz=$size*(.4>1.2) rot=spin(-3) r=sprite(${KT.vortex},alpha)
pop lamp burst=1 life=.3 r=light(<.5,1,.3>,2,6)`,
};
// every melee blow also carries a crescent in its school colour, so a rogue's poison cut or a paladin's strike reads as a cut
const SLASH_RAW = `fx
pop slash burst=1 life=.22 size=1.8 rot=-.7..0.7 col=${C3} a=1>.6:1>0 sz=$size*(.6>1.1) r=sprite(${KT.crescent},alpha)
pop spark burst=10..14 life=.2..0.4 v=sdir()*(3..6) size=.025..0.04 acc=grav()*.8 col=${C3} a=1>0 r=sprite(ember,alpha,velocity,.05)`;
// a heal: a ring on the ground, stars and crosses rising round the body, a soft column of light
const HEAL_RAW = `fx
pop hoop burst=1 life=.7 size=2.4 col=${C3} a=1>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)
pop sigil burst=1 life=1 size=2 col=${C3} a=0>.15:1>.7:.8>0 rot=spin(1.2) r=sprite(${KT.sigil},alpha,ground)
pop rise burst=26..34 on=disc(.7) life=.8..1.3 v=up(1.5..3) size=.14..0.24 spin=-4..4 acc=drag(1.2) col=${C3} a=0>.1:1>.7:1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop puff burst=12 on=disc(.5).c(.3) life=.6..0.9 v=up(1..2) size=.3..0.45 col=${C3} a=1>.6:1>0 sz=$size*(.6>1.2:.6>.2) r=${P}
pop col burst=8 on=disc(.25) life=.6..0.9 v=up(3..4.5) size=.12..0.2 col=${C3} a=1>0 r=sprite(${KT.streak},alpha,velocity,.18)
pop lamp burst=1 life=.6 at=<0,1.2,0> r=light(${C3},1.5,5)`;
// a shout / blessing / buff: a burst of rays at the chest, a ring kicked outward and chevrons climbing
const BUFF_RAW = `fx
pop rays burst=1 life=.45 at=<0,1.2,0> size=2.6 col=${C3} a=1>0 sz=$size*(.3>1.1) rot=0..6.28 r=sprite(${KT.rays},alpha)
pop hoop burst=1 life=.55 size=4.4 col=${C3} a=1>0 sz=$size*(.1>1) r=sprite(${KT.hoop},alpha,ground)
pop chevron burst=10..14 on=disc(.6) life=.7..1.1 v=up(2..3.2) size=.22..0.32 col=${C3} a=1>.7:1>0 r=sprite(${KT.spark4},alpha)
pop dust burst=12 on=disc(1) life=.6..1 v=sdir()*(2..3)*<1,0,1>+up(.3) size=.35..0.55 acc=drag(2) col=${C3}*.5+<.3,.3,.3> a=.9>.5:.8>0 sz=$size*(.6>1.6) r=${P}
pop lamp burst=1 life=.5 at=<0,1.2,0> r=light(${C3},1.6,6)`;


// ---- PASS 2 (creator 2026-10-10: "more saturated colors, bigger spell effects, and do another detail pass") ----
// every literal colour pushed away from its grey by SAT, every size grown by GROW, and a detail layer added per kind;
// the spell's own colour (%r %g %b) is saturated where it is made (class-cast-player.js rgb()).
export const SAT = 1.55, GROW = 1.4;
const n3 = (x) => Math.round(Math.max(0, Math.min(1, x)) * 1000) / 1000;
export function vivid({ r, g, b }, k = SAT) { const l = r * 0.3 + g * 0.59 + b * 0.11; return { r: n3(l + (r - l) * k), g: n3(l + (g - l) * k), b: n3(l + (b - l) * k) }; }
const satVec = (txt) => txt.replace(/<(\d*\.?\d+),(\d*\.?\d+),(\d*\.?\d+)>/g, (m, a, b, c) => { const v = vivid({ r: +a, g: +b, b: +c }); return `<${v.r},${v.g},${v.b}>`; });
const grow = (txt) => txt
  .replace(/size=(\d*\.?\d+)\.\.(\d*\.?\d+)/g, (m, a, b) => `size=${n3(a * GROW)}..${n3(b * GROW)}`)
  .replace(/size=(\d*\.?\d+)(?![.\d])/g, (m, a) => (a === '1' ? m : `size=${Math.round(a * GROW * 1000) / 1000}`))
  .replace(/rib\((\d*\.?\d+),(\d*\.?\d+),/g, (m, l, w) => `rib(${n3(l * 1.25)},${n3(w * GROW)},`);
// an effect holds at most 8 populations: the detail layers fill what room is left, first-listed first
const MAXPOP = 8;
const pops = (t) => t.split(/\n(?=pop )/).filter((l) => l.startsWith('pop '));
const punch = (txt, extra = '') => {
  const head = txt.split(/\n(?=pop )/)[0].startsWith('pop ') ? '' : txt.split(/\n(?=pop )/)[0];
  const base = pops(satVec(grow(txt))), add = extra ? pops(satVec(extra)) : [];
  const all = [...base, ...add.slice(0, Math.max(0, MAXPOP - base.length))].slice(0, MAXPOP);
  return (head ? satVec(grow(head)) + '\n' : 'fx\n') + all.join('\n');
};
// detail layers
const BOLT_DETAIL = {
  shadow: `pop drip rate=18 on=sphere(.25) life=.5..0.8 v=<0,-1,0>*(.4..0.9) size=.08..0.12 acc=grav()*.5 col=<.25,.05,.4> a=1>0 r=${P}
pop ring rate=4 local life=.35 size=1.4 col=<.55,.15,.85> a=.9>0 sz=$size*(.3>1) r=sprite(${KT.hoop},alpha)`,
  arcane: `pop orbit n=3 local on=sphere(.42).c(.42) size=.2 spin=-9..9 col=<1,.55,1> a=1 rot=$age*$spin r=sprite(${KT.star},alpha)
pop ring rate=5 local life=.3 size=1.2 col=<.9,.4,1> a=.9>0 sz=$size*(.3>1) r=sprite(${KT.hoop},alpha)`,
  storm: `pop crackle rate=10 local life=.05..0.09 size=2..2.6 rot=0..6.28 col=<.55,.8,1> a=1 r=sprite(${KT.forks},alpha)`,
  holy: `pop halo n=1 local size=1.1 col=<1,.85,.3> a=.8 rot=spin(-1) r=sprite(${KT.hoop},alpha)
pop mote rate=30 on=sphere(.35) life=.4..0.7 v=up(.5..1) size=.04..0.07 col=<1,.95,.5> a=1>0 r=${P}`,
  nature: `pop thorn rate=12 on=sphere(.3) life=.3..0.5 v=sdir()*(1.5..2.5) size=.08..0.12 col=<.25,.5,.05> a=1 r=sprite(stalk,alpha,velocity,.05)
pop bloom n=1 local size=.7 col=<1,.55,.75> a=.9 rot=spin(3) r=sprite(${KT.spark4},alpha)`,
  earth: `pop crumb rate=30 on=sphere(.22) life=.6..1 v=sdir()*(.6..1.2) size=.05..0.09 acc=grav() col=<.5,.33,.15> a=1 floor=bounce(.3) r=${P}`,
  arrow: `pop wind rate=6 local life=.25 size=.7 col=<1,1,1> a=.6>0 sz=$size*(.4>1) r=sprite(${KT.hoop},alpha)`,
};
const IMPACT_DETAIL = (col) => `pop sparkle burst=10..14 delay=.12 on=sphere(.7) life=.4..0.8 size=.12..0.2 spin=-6..6 col=${col} a=0>.2:1>1:0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop ring2 burst=1 delay=.08 life=.45 size=2.8 col=${col} a=.9>0 sz=$size*(.1>1) r=sprite(${KT.hoop},alpha)
pop floorhoop burst=1 at=<0,-.9,0> life=.6 size=3.2 col=${col} a=1>0 sz=$size*(.1>1) r=sprite(${KT.hoop},alpha,ground)`;
const IMPACT_COL = { shadow: '<.6,.2,.95>', arcane: '<.95,.45,1>', storm: '<.6,.85,1>', earth: '<.75,.5,.2>', steel: '<1,.9,.6>', holy: '<1,.8,.25>', nature: '<.45,.9,.2>' };
export const BOLT_FX = Object.fromEntries(Object.entries(BOLT_RAW).map(([k, v]) => [k, punch(v, BOLT_DETAIL[k])]));
export const IMPACTS = Object.fromEntries(Object.entries(IMPACT_RAW).map(([k, v]) => [k, punch(v, IMPACT_DETAIL(IMPACT_COL[k] ?? C3))]));
export const SLASH = punch(SLASH_RAW, `pop slash2 burst=1 delay=.05 life=.2 size=1.5 rot=2.4..3.6 col=${C3} a=1>.5:1>0 sz=$size*(.5>1.1) r=sprite(${KT.crescent},alpha)`);
export const HEAL_FX = punch(HEAL_RAW, `pop leaf burst=10 on=disc(1) life=1..1.5 v=up(.8..1.6) size=.14..0.22 spin=-4..4 acc=vortex(4)+drag(1) col=${C3} a=0>.15:1>.7:1>0 rot=$age*$spin r=${P}
pop hoop2 burst=1 delay=.25 life=.6 size=3 col=${C3} a=.9>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)`);
export const BUFF_FX = punch(BUFF_RAW, `pop sigil burst=1 life=1 size=3 col=${C3} a=0>.1:1>.7:.8>0 rot=spin(2) r=sprite(${KT.sigil2},alpha,ground)
pop hoop2 burst=1 delay=.15 life=.5 at=<0,1.2,0> size=3 col=${C3} a=1>0 sz=$size*(.1>1) r=sprite(${KT.hoop},alpha)`);
