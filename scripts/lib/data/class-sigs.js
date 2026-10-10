// CLASS SIGNATURES (creator 2026-10-10: "spell pass all classes"): the Mage got its own read per spell; every other vanilla class
// gets the same treatment here. Matte, toon, alpha-blended cards (the creator's "less glowing, more cartoony"), saturated colours,
// one small lamp at most. class-cast-player.js merges these by spell name into its SELF_FX (round the caster), GROUND_FX (at the
// target's feet, also each pulse of a channel), DIRECT_FX (no missile: it happens ON the target) and the heal / buff / barrier looks.
import { KT } from './vfx-tex.js';
const C3 = '<%r|1,%g|.5,%b|.2>';
const lamp = (c, i = 6, d = 7, at = '<0,1,0>') => `pop lamp burst=1 life=.35 at=${at} r=light(${c},${i},${d})`;
const hoop = (c, s = 2.2, life = '.5') => `pop hoop burst=1 life=${life} at=<0,.08,0> size=%rad|6*${s} col=${c} a=1>0 sz=$size*(.1>1) r=sprite(${KT.hoop},alpha,ground)`;
const dust = (c = '<.55,.45,.32>') => `pop dust burst=14 on=disc(%rad|6*.7) life=.7..1.2 v=up(.4..1)+sdir()*.8 size=.6..1 acc=drag(1.4) col=${c} a=0>.15:.5>.6:.3>0 sz=$size*(.7>1.7) r=sprite(${KT.puff},alpha)`;
const chunks = (c, n = '12..16') => `pop chunk burst=${n} on=disc(%rad|6*.6) life=.6..1 v=up(3..5)+sdir()*(2..3) size=.12..0.24 spin=-8..8 acc=grav() col=${c} a=1 rot=$age*$spin floor=bounce(.3) r=sprite(${KT.puff},alpha)`;

// ---- around the caster (sp.self && sp.radius): params r g b rad dx dz ----
export const SIG_SELF = {
  'Whirlwind': `fx
pop arc burst=3 life=.35 at=<0,1,0> size=%rad|6*1.5 rot=0..6.28 col=<1,.92,.7> a=1>0 sz=$size*(.6>1.05) r=sprite(${KT.crescent},alpha,ground)
pop slash burst=2 life=.3 at=<0,1.1,0> size=%rad|6*1.3 rot=0..6.28 col=<.95,.85,.6> a=1>0 sz=$size*(.7>1) r=sprite(${KT.cleave},alpha)
pop wind burst=40 on=disc(1.2).c(.8) life=.35..0.6 v=vortex(9)+sdir()*(2..4)*<1,0,1> size=.3..0.55 acc=drag(2) col=<.85,.82,.75> a=.8>0 sz=$size*(.6>1.6) r=sprite(${KT.puff},alpha)
${dust()}
${chunks('<.5,.4,.28>', '10..14')}`,
  'Thunder Clap': `fx
pop wave burst=1 life=.45 at=<0,.08,0> size=%rad|8*2.2 col=<.55,.75,1> a=1>0 sz=$size*(.1>1) r=sprite(${KT.splat},alpha,ground)
${hoop('<.8,.9,1>', 2.3, '.4')}
pop zap burst=8 on=disc(%rad|8*.6).c(.6) life=.15..0.25 size=1.2..1.8 rot=0..6.28 col=<.6,.85,1> a=1>0 r=sprite(${KT.zap},alpha)
pop crack burst=1 life=1.4 at=<0,.05,0> size=3.2 col=<.15,.13,.12> a=.85>.7:.8>0 r=sprite(${KT.scorch2},alpha,ground)
${dust('<.6,.55,.5>')}
${chunks('<.45,.38,.3>')}
${lamp('<.6,.8,1>', 8, 10)}`,
  'Consecration': `fx
pop rune burst=1 life=1.6 at=<0,.06,0> size=%rad|8*2.1 col=<1,.82,.3> a=0>.1:1>.7:.9>0 rot=spin(.6) r=sprite(${KT.sigil},alpha,ground)
pop glow burst=1 life=1.6 at=<0,.05,0> size=%rad|8*2.2 col=<1,.9,.55> a=0>.1:.6>.7:.5>0 r=sprite(${KT.halo},alpha,ground)
pop mote burst=50 on=disc(%rad|8*.9) life=.9..1.5 v=up(1..2.2) size=.08..0.14 col=<1,.85,.35> a=0>.2:1>.7:1>0 r=sprite(${KT.holystar},alpha)
pop ray burst=14 on=disc(%rad|8*.8) life=.5..0.9 v=up(3..5) size=.12..0.2 col=<1,.9,.5> a=1>0 r=sprite(${KT.thread},alpha,velocity,.08)
${lamp('<1,.8,.35>', 7, 12)}`,
  'Holy Wrath': `fx
pop burst burst=1 life=.5 at=<0,1.2,0> size=%rad|10*1.6 col=<1,.88,.4> a=1>0 sz=$size*(.2>1) rot=0..6.28 r=sprite(${KT.rays},alpha)
${hoop('<1,.85,.4>', 2.2)}
pop star burst=40 at=<0,1.2,0> life=.5..0.9 v=sdir()*(7..12) size=.12..0.22 acc=drag(2.5) col=<1,.9,.45> a=1>0 r=sprite(${KT.holystar},alpha)
pop beam burst=10 on=disc(%rad|10*.7).c(5) life=.3..0.45 v=<0,-14,0> size=.2..0.3 col=<1,.92,.6> a=1>0 r=sprite(${KT.beam},alpha,velocity,.1)
${lamp('<1,.85,.45>', 10, 14, '<0,1.2,0>')}`,
  'Holy Nova': `fx
pop nova burst=1 life=.45 at=<0,1,0> size=%rad|10*1.5 col=<1,.92,.5> a=1>0 sz=$size*(.15>1) r=sprite(${KT.halo2},alpha)
${hoop('<1,.9,.5>', 2.2, '.45')}
pop sparkle burst=50 at=<0,1,0> life=.45..0.8 v=sdir()*(8..12) size=.1..0.18 acc=drag(3) col=<1,.95,.6> a=1>0 r=sprite(${KT.holystar},alpha)
pop leaf burst=16 on=disc(%rad|10*.6) life=.8..1.3 v=up(1..2) size=.18..0.3 acc=vortex(3)+drag(1) col=<.7,1,.55> a=0>.2:1>.7:.8>0 r=sprite(${KT.star},alpha)`,
  'Psychic Scream': `fx
pop scream burst=3 life=.6 at=<0,1.6,0> size=2..3 col=<.6,.25,.85> a=1>0 sz=$size*(.3>1.8) r=sprite(${KT.ring},alpha)
pop wail burst=40 at=<0,1.5,0> life=.5..0.9 v=sdir()*(6..10)*<1,.3,1> size=.4..0.7 acc=drag(2) col=<.35,.12,.5> a=.9>0 sz=$size*(.6>1.8) rot=0..6.28 r=sprite(${KT.smoke},alpha)
pop skull burst=6 on=disc(%rad|8*.5).c(1.4) life=.7..1 v=sdir()*3*<1,0,1>+up(.5) size=.5..0.7 col=<.75,.5,1> a=1>.6:.8>0 r=sprite(${KT.swirl},alpha)
${hoop('<.55,.25,.85>', 2.1, '.6')}`,
  'Hellfire': `fx
pop ring burst=1 life=1.2 at=<0,.06,0> size=%rad|8*2.1 col=<.95,.35,.05> a=0>.1:1>.7:.9>0 rot=spin(.8) r=sprite(${KT.sigil2},alpha,ground)
pop flame burst=80 on=disc(%rad|8*.9) life=.5..0.9 v=up(4..8) size=.5..0.9 col=<1,.55,.1>>.5:<.85,.25,.05>><.35,.1,.25> a=1>.6:.9>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.04)
pop fel burst=30 on=disc(%rad|8*.8) life=.6..1 v=up(2..4) size=.4..0.7 col=<.55,1,.15>>.6:<.2,.6,.05> a=1>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.04)
pop smoke burst=16 on=disc(%rad|8*.6) life=1.2..1.8 v=up(1..1.6) size=.9..1.3 acc=buoy(.5)+drag(.8) col=<.18,.1,.12> a=0>.2:.5>.6:.3>0 sz=$size*(.7>1.8) r=sprite(${KT.smoke},alpha)
${lamp('<1,.45,.1>', 9, 12)}`,
  'Howl of Terror': `fx
pop howl burst=4 life=.7 at=<0,1.5,0> size=2..3.5 col=<.45,.15,.65> a=1>0 sz=$size*(.3>2) r=sprite(${KT.ring},alpha)
pop shade burst=50 at=<0,1.4,0> life=.6..1.1 v=sdir()*(7..12)*<1,.25,1> size=.5..0.9 acc=drag(2) col=<.25,.08,.35> a=.9>0 sz=$size*(.6>2) rot=0..6.28 r=sprite(${KT.smoke},alpha)
pop wisp burst=12 on=disc(%rad|10*.4).c(1) life=.8..1.2 v=sdir()*(4..6)*<1,0,1>+up(1) size=.3..0.5 col=<.7,.4,1> a=1>0 r=sprite(${KT.swirl},alpha)
${hoop('<.5,.2,.8>', 2.2, '.7')}`,
  'Fire Nova Totem': `fx
pop totem burst=1 life=.9 at=<0,.06,0> size=1.4 col=<.9,.45,.12> a=1>.7:1>0 r=sprite(${KT.sigil},alpha,ground)
pop wave burst=1 life=.5 at=<0,.1,0> size=%rad|8*2.2 col=<1,.45,.08> a=1>0 sz=$size*(.1>1) r=sprite(${KT.splat},alpha,ground)
pop flame burst=70 on=disc(.6) life=.35..0.6 v=sdir()*(10..15)*<1,0,1>+up(1..2) size=.5..0.85 acc=drag(2.6) col=<1,.6,.12>><1,.3,.05> a=1>0 sz=$size*(.6>1.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop ember burst=30 on=disc(%rad|8*.6) life=.7..1.2 v=up(2..4)+sdir() size=.05..0.09 acc=grav()*.4 col=<1,.65,.2> a=1>0 r=sprite(${KT.glint},alpha,velocity,.02)
${lamp('<1,.5,.15>', 8, 12)}`,
  'Magma Totem': `fx
pop pool burst=1 life=1.6 at=<0,.05,0> size=%rad|8*1.8 col=<.95,.35,.05> a=0>.1:1>.7:.9>0 r=sprite(${KT.scorch},alpha,ground)
pop lava burst=40 on=disc(%rad|8*.8) life=.5..0.9 v=up(2..4)+sdir()*.6 size=.25..0.45 acc=grav()*.6 col=<1,.5,.08>><.7,.15,.03> a=1 sz=$size*(1>.5) floor=die r=sprite(${KT.puff},alpha)
pop lick burst=30 on=disc(%rad|8*.7) life=.4..0.7 v=up(2..3.5) size=.35..0.6 col=<1,.6,.15>><.85,.25,.05> a=1>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.04)
pop rock burst=8 on=disc(.5) life=.8..1.1 v=up(3..4)+sdir()*2 size=.14..0.22 spin=-6..6 acc=grav() col=<.25,.15,.12> a=1 rot=$age*$spin floor=bounce(.3) r=sprite(${KT.puff},alpha)
${lamp('<1,.45,.1>', 7, 10)}`,
  'Earthbind Totem': `fx
pop rune burst=1 life=1.4 at=<0,.06,0> size=%rad|10*2.1 col=<.7,.5,.25> a=0>.1:1>.7:.8>0 rot=spin(-.5) r=sprite(${KT.runes},alpha,ground)
${hoop('<.8,.6,.3>', 2.2, '.7')}
pop root burst=24 on=disc(%rad|10*.8) life=.6..1 v=up(1.5..3) size=.1..0.18 col=<.45,.32,.15> a=1>0 r=sprite(${KT.thread},alpha,velocity,.07)
${dust('<.55,.42,.25>')}
${chunks('<.4,.3,.18>', '8..12')}`,
  'Blade Flurry': `fx
pop cut burst=6 life=.25..0.35 at=<0,1.1,0> size=1.4..2.2 rot=0..6.28 col=<.95,.95,.85> a=1>0 sz=$size*(.6>1.1) r=sprite(${KT.slash},alpha)
pop arc burst=2 life=.3 at=<0,1,0> size=%rad|5*1.4 rot=0..6.28 col=<.9,.25,.2> a=1>0 sz=$size*(.6>1) r=sprite(${KT.crescent},alpha,ground)
pop glint burst=18 at=<0,1.1,0> life=.2..0.35 v=sdir()*(6..10) size=.06..0.1 col=<1,.95,.8> a=1>0 r=sprite(${KT.thread},alpha,velocity,.04)
pop blood burst=10 at=<0,1,0> life=.4..0.7 v=sdir()*(3..5)+up(1) size=.08..0.14 acc=grav() col=<.75,.08,.08> a=1 floor=die r=sprite(${KT.puff},alpha)`,
  'Swipe': `fx
pop claw burst=3 life=.3 at=<0,1,0> size=2.2..2.8 rot=-.3..0.3 col=<.95,.9,.8> a=1>0 sz=$size*(.6>1.1) r=sprite(${KT.slashv},alpha)
pop arc burst=1 life=.35 at=<0,.5,0> size=%rad|5*1.6 col=<.95,.75,.35> a=1>0 sz=$size*(.5>1) r=sprite(${KT.crescent},alpha,ground)
pop fur burst=16 at=<0,1,0> life=.5..0.8 v=<%dx|0,0,%dz|-1>*(4..6)+sdir()*2 size=.08..0.14 acc=grav()*.4+drag(1.5) col=<.55,.4,.25> a=1>0 r=sprite(${KT.puff},alpha)
${dust()}`,
  'Explosive Trap': `fx
pop pow burst=1 life=.35 at=<0,.6,0> size=%rad|5*1.8 rot=0..6.28 col=<1,.55,.1> a=1>.7:1>0 sz=$size*(.3>1.1) r=sprite(${KT.splat},alpha)
pop fire burst=50 on=disc(.5) life=.4..0.8 v=up(4..8)+sdir()*(3..5) size=.5..0.9 acc=drag(2) col=<1,.65,.15>>.5:<1,.3,.05>><.4,.15,.08> a=1>0 sz=$size*(.7>1.4) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.04)
pop smoke burst=14 on=disc(%rad|5*.5) life=1.2..1.8 v=up(1..2) size=.9..1.3 acc=buoy(.5)+drag(.9) col=<.2,.17,.15> a=0>.2:.6>.6:.3>0 sz=$size*(.7>1.8) r=sprite(${KT.smoke},alpha)
pop mark burst=1 life=2 at=<0,.05,0> size=%rad|5*1.5 col=<.14,.08,.05> a=.9>.7:.8>0 r=sprite(${KT.scorch},alpha,ground)
${chunks('<.35,.25,.18>')}
${lamp('<1,.5,.15>', 10, 12)}`,
  'Freezing Trap': `fx
pop snap burst=1 life=.5 at=<0,.08,0> size=%rad|4*2 col=<.45,.8,1> a=1>.6:.9>0 sz=$size*(.2>1:.35>1) r=sprite(${KT.spikes},alpha,ground)
${hoop('<.7,.9,1>', 2, '.45')}
pop shard burst=30 on=disc(.4) life=.4..0.7 v=up(3..5)+sdir()*(2..3) size=.1..0.18 acc=grav()*.6 col=<.6,.88,1> a=1>0 r=sprite(${KT.thread},alpha,velocity,.05)
pop mist burst=12 on=disc(%rad|4*.7) life=.9..1.4 v=up(.3..0.7) size=.6..1 acc=drag(1) col=<.65,.85,1> a=0>.2:.4>.6:.25>0 sz=$size*(.7>1.6) r=sprite(${KT.puff},alpha)`,
};

// ---- at the target's feet (ground-targeted AoE, and every pulse of a ground channel): params r g b rad ----
export const SIG_GROUND = {
  'Volley': `fx
pop arrow burst=26 on=disc(%rad|7*.9).c(9) life=.45..0.6 v=<0,-20,0>+sdir()*.8 size=.08..0.12 col=<.9,.82,.6> a=1 r=sprite(${KT.thread},alpha,velocity,.09) floor=die
pop thud on=@arrow life=.3..0.5 v=up(.5..1)+sdir() size=.2..0.35 col=<.6,.5,.35> a=.8>0 sz=$size*(.6>1.4) r=sprite(${KT.puff},alpha)
${hoop('<.9,.8,.5>', 2.1, '.6')}`,
  'Rain of Fire': `fx
pop rock burst=10 on=disc(%rad|7*.8).c(10) life=.55..0.7 v=<2,-17,1>+sdir()*.5 size=.45..0.7 col=<1,.55,.12> a=1 r=sprite(${KT.flame},alpha,velocity,.06) floor=die
pop boom on=@rock life=.35..0.6 v=up(1..3)+sdir()*2 size=.5..0.8 col=<1,.5,.1>><.5,.15,.05> a=1>0 sz=$size*(.6>1.5) rot=0..6.28 r=sprite(${KT.flame},alpha)
pop smoke on=@rock life=1..1.5 v=up(.8..1.4) size=.6..1 acc=buoy(.4)+drag(1) col=<.2,.16,.15> a=0>.2:.5>.6:.3>0 sz=$size*(.7>1.8) r=sprite(${KT.smoke},alpha)
pop circle burst=1 life=1.4 at=<0,.06,0> size=%rad|7*2.1 col=<.95,.35,.08> a=0>.1:.8>.7:.7>0 rot=spin(.4) r=sprite(${KT.sigil2},alpha,ground)
${lamp('<1,.45,.12>', 7, 12)}`,
  'Hurricane': `fx
pop funnel burst=40 on=disc(%rad|7*.8).c(.5) life=.8..1.2 v=vortex(8)+up(2..4) size=.4..0.8 acc=attract(2) col=<.75,.85,.7> a=0>.2:.8>.7:.6>0 sz=$size*(.6>1.6) rot=0..6.28 r=sprite(${KT.puff},alpha)
pop leaf burst=30 on=disc(%rad|7*.9).c(1.5) life=.9..1.4 v=vortex(10)+up(1..2) size=.12..0.2 spin=-8..8 col=<.45,.75,.25>><.8,.6,.2> a=1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop zap burst=3 on=disc(%rad|7*.6).c(3) life=.12..0.2 size=2..3 rot=-.3..0.3 col=<.65,.9,1> a=1>0 r=sprite(${KT.bolt},alpha)
${hoop('<.6,.85,.6>', 2.1, '.7')}`,
  'Searing Totem': `fx
pop totem burst=1 life=1 at=<0,.06,0> size=%rad|3*2 col=<1,.5,.12> a=1>.7:1>0 rot=spin(.5) r=sprite(${KT.sigil},alpha,ground)
pop jet burst=24 on=disc(.25) life=.35..0.6 v=up(5..8) size=.35..0.6 col=<1,.7,.2>><1,.35,.06> a=1>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop ember burst=20 on=disc(%rad|3*.6) life=.7..1.1 v=up(2..4)+sdir() size=.05..0.08 acc=grav()*.4 col=<1,.65,.2> a=1>0 r=sprite(${KT.glint},alpha,velocity,.02)
${lamp('<1,.5,.15>', 6, 8)}`,
};

// ---- ON the target, no missile (at: chest; ground: true = its feet): params r g b ----
const onBody = (c, tex, extra) => `fx
pop pow burst=1 life=.3 size=2.6 rot=0..6.28 col=${c} a=1>.7:1>0 sz=$size*(.3>1.1) r=sprite(${tex},alpha)
${extra}`;
export const SIG_DIRECT = {
  'Judgement': { fx: onBody('<1,.85,.35>', KT.holystar, `pop hammer burst=1 life=.4 at=<0,2.4,0> size=1.8 col=<1,.9,.5> a=1>0 v=<0,-6,0> r=sprite(${KT.cross ?? KT.holystar},alpha)
pop ray burst=12 on=disc(.4).c(3) life=.2..0.3 v=<0,-14,0> size=.15..0.25 col=<1,.92,.55> a=1>0 r=sprite(${KT.beam},alpha,velocity,.1)
pop star burst=24 life=.4..0.7 v=sdir()*(4..7) size=.1..0.18 acc=drag(2.5) col=<1,.9,.45> a=1>0 r=sprite(${KT.holystar},alpha)
${lamp('<1,.85,.4>', 8, 8)}`) },
  'Exorcism': { fx: onBody('<1,.9,.5>', KT.halo2, `pop pillar burst=30 on=disc(.5).c(-1) life=.35..0.55 v=up(6..10) size=.2..0.35 col=<1,.95,.65> a=1>0 r=sprite(${KT.beam},alpha,velocity,.1)
pop spirit burst=10 life=.6..1 v=up(2..3)+sdir() size=.4..0.6 acc=drag(1.5) col=<.85,.8,.95> a=.9>0 sz=$size*(.6>1.5) r=sprite(${KT.smoke},alpha)
${lamp('<1,.9,.6>', 9, 9)}`) },
  'Holy Shock': { fx: onBody('<1,.85,.4>', KT.halo, `pop shock burst=16 life=.25..0.4 v=sdir()*(6..10) size=.12..0.2 col=<1,.95,.6> a=1>0 r=sprite(${KT.thread},alpha,velocity,.05)
pop star burst=16 life=.4..0.7 v=sdir()*(2..4)+up(1) size=.1..0.18 col=<1,.85,.35> a=1>0 r=sprite(${KT.holystar},alpha)`) },
  'Smite': { fx: onBody('<1,.82,.3>', KT.holystar, `pop ray burst=10 on=disc(.3).c(2.5) life=.18..0.28 v=<0,-12,0> size=.18..0.28 col=<1,.92,.6> a=1>0 r=sprite(${KT.beam},alpha,velocity,.1)
pop spark burst=20 life=.3..0.5 v=sdir()*(4..7) size=.07..0.12 acc=drag(2.5) col=<1,.9,.45> a=1>0 r=sprite(${KT.star},alpha)
${lamp('<1,.85,.4>', 7, 7)}`) },
  'Holy Fire': { ground: true, fx: `fx
pop column burst=40 on=disc(.45) life=.4..0.7 v=up(5..9) size=.5..0.85 col=<1,.92,.55>>.5:<1,.7,.2>><.9,.4,.08> a=1>.6:.9>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop halo burst=1 life=.6 at=<0,.06,0> size=2.4 col=<1,.85,.4> a=1>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)
pop star burst=20 on=disc(.4).c(1) life=.5..0.9 v=up(2..4)+sdir() size=.1..0.16 col=<1,.92,.5> a=1>0 r=sprite(${KT.holystar},alpha)
${lamp('<1,.8,.35>', 8, 8)}` },
  'Mind Blast': { fx: onBody('<.65,.25,.95>', KT.swirl, `pop brain burst=1 life=.45 at=<0,.6,0> size=2.2 col=<.4,.1,.6> a=1>0 sz=$size*(.2>1.3) rot=0..6.28 r=sprite(${KT.ring},alpha)
pop shard burst=26 life=.3..0.55 v=sdir()*(5..9) size=.3..0.55 acc=drag(2.5) col=<.45,.12,.65> a=.9>0 sz=$size*(.6>1.4) rot=0..6.28 r=sprite(${KT.smoke},alpha)
pop mote burst=16 life=.4..0.7 v=sdir()*(3..5) size=.08..0.14 col=<.85,.55,1> a=1>0 r=sprite(${KT.star},alpha)`) },
  'Shadow Word: Pain': { fx: `fx
pop curse burst=1 life=.8 at=<0,.4,0> size=1.6 col=<.5,.15,.75> a=0>.15:1>.7:.8>0 rot=spin(1.5) r=sprite(${KT.sigil2},alpha)
pop wisp burst=18 on=sphere(.4) life=.7..1.1 v=up(.8..1.6)+sdir()*.5 size=.3..0.5 acc=vortex(3) col=<.3,.08,.45> a=0>.2:.9>.6:.6>0 sz=$size*(.6>1.4) r=sprite(${KT.smoke},alpha)` },
  'Devouring Plague': { fx: `fx
pop cloud burst=20 on=sphere(.5) life=.8..1.3 v=sdir()*(1..2)+up(.5) size=.5..0.8 acc=drag(1.5) col=<.25,.35,.12>><.3,.1,.35> a=0>.2:.9>.6:.6>0 sz=$size*(.6>1.6) rot=0..6.28 r=sprite(${KT.smoke},alpha)
pop fly burst=16 on=sphere(.6) life=.8..1.2 v=sdir()*(2..3) size=.05..0.08 acc=curl(2) col=<.15,.12,.1> a=1>0 r=sprite(${KT.puff},alpha)
pop pow burst=1 life=.4 size=2 rot=0..6.28 col=<.5,.2,.6> a=1>0 sz=$size*(.3>1.1) r=sprite(${KT.splat},alpha)` },
  'Corruption': { fx: `fx
pop rot burst=1 life=.7 at=<0,.3,0> size=1.8 col=<.35,.1,.5> a=0>.15:1>.6:.8>0 rot=spin(-1.2) r=sprite(${KT.vortex},alpha)
pop ooze burst=20 on=sphere(.5) life=.7..1.1 v=sdir()*(.6..1.2)+up(.4) size=.3..0.5 acc=vortex(-3) col=<.25,.05,.35> a=0>.2:.9>.6:.6>0 sz=$size*(.6>1.5) r=sprite(${KT.smoke},alpha)
pop drip burst=10 on=sphere(.4) life=.5..0.8 v=up(.5)+sdir()*.5 size=.07..0.12 acc=grav()*.5 col=<.55,.2,.75> a=1>0 r=sprite(${KT.puff},alpha)` },
  'Curse of Agony': { fx: `fx
pop skull burst=1 life=.9 at=<0,1.3,0> size=1.2 col=<.65,.3,.85> a=0>.15:1>.7:.9>0 sz=$size*(.6>1) r=sprite(${KT.swirl},alpha)
pop ring burst=1 life=.6 size=1.8 col=<.45,.12,.6> a=1>0 sz=$size*(.2>1.2) r=sprite(${KT.ring},alpha)
pop wisp burst=14 on=sphere(.5) life=.6..1 v=up(1..1.6) size=.3..0.5 col=<.3,.08,.4> a=.8>0 sz=$size*(.6>1.4) r=sprite(${KT.smoke},alpha)` },
  'Siphon Life': { fx: `fx
pop leech burst=20 on=sphere(.5) life=.6..0.9 v=sdir()*(1..2)+up(1) size=.1..0.18 acc=vortex(4) col=<.35,.85,.25>><.45,.15,.55> a=1>0 r=sprite(${KT.star},alpha)
pop curse burst=1 life=.7 at=<0,.3,0> size=1.6 col=<.3,.6,.2> a=0>.15:1>.6:.8>0 rot=spin(1) r=sprite(${KT.sigil2},alpha)` },
  'Immolate': { ground: true, fx: `fx
pop column burst=50 on=disc(.5) life=.45..0.8 v=up(5..9) size=.5..0.9 col=<1,.7,.2>>.4:<1,.38,.06>><.6,.12,.04> a=1>.6:.9>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop ring burst=1 life=.5 at=<0,.06,0> size=2.4 col=<1,.5,.1> a=1>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)
pop mark burst=1 life=2 at=<0,.05,0> size=1.8 col=<.16,.08,.05> a=.9>.7:.8>0 r=sprite(${KT.scorch},alpha,ground)
pop smoke burst=10 on=disc(.4).c(1.5) life=1..1.5 v=up(1..1.8) size=.6..0.9 acc=buoy(.4)+drag(1) col=<.2,.15,.13> a=0>.2:.5>.6:.3>0 sz=$size*(.7>1.8) r=sprite(${KT.smoke},alpha)
${lamp('<1,.5,.12>', 8, 8)}` },
  'Conflagrate': { fx: onBody('<1,.45,.08>', KT.splat, `pop flame burst=40 on=sphere(.4) life=.35..0.65 v=sdir()*(6..10)+up(2) size=.5..0.85 acc=drag(2.5) col=<1,.6,.12>><.8,.2,.04> a=1>0 sz=$size*(.7>1.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop fel burst=14 on=sphere(.3) life=.4..0.7 v=sdir()*(4..6) size=.3..0.5 col=<.6,1,.2> a=1>0 r=sprite(${KT.flame},alpha,velocity,.04)
${lamp('<1,.5,.12>', 10, 9)}`) },
  'Shadowburn': { fx: onBody('<.45,.12,.65>', KT.splat, `pop flame burst=30 on=sphere(.4) life=.35..0.6 v=sdir()*(5..8)+up(1) size=.45..0.8 acc=drag(2.5) col=<.55,.2,.8>><.2,.05,.3> a=1>0 sz=$size*(.7>1.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop smoke burst=12 life=.8..1.2 v=up(1..2)+sdir() size=.5..0.8 acc=drag(1.4) col=<.12,.05,.15> a=.8>0 sz=$size*(.6>1.6) r=sprite(${KT.smoke},alpha)`) },
  'Fear': { fx: `fx
pop eye burst=1 life=.9 at=<0,1.3,0> size=1.4 col=<.7,.4,1> a=0>.15:1>.7:.9>0 sz=$size*(.6>1.1) r=sprite(${KT.swirl},alpha)
pop shade burst=24 on=sphere(.6) life=.7..1.1 v=sdir()*(1..2)+up(.6) size=.4..0.7 acc=vortex(4) col=<.25,.07,.35> a=0>.2:.9>.6:.6>0 sz=$size*(.6>1.6) r=sprite(${KT.smoke},alpha)` },
  'Earth Shock': { fx: onBody('<.8,.6,.3>', KT.splat, `pop rock burst=16 on=sphere(.3) life=.6..1 v=up(2..4)+sdir()*(3..5) size=.14..0.24 spin=-8..8 acc=grav() col=<.5,.38,.22> a=1 rot=$age*$spin floor=bounce(.3) r=sprite(${KT.puff},alpha)
pop dust burst=12 life=.6..1 v=sdir()*(2..3) size=.5..0.8 acc=drag(1.6) col=<.6,.5,.35> a=.7>0 sz=$size*(.6>1.6) r=sprite(${KT.puff},alpha)
pop zap burst=2 life=.15 size=1.6 rot=0..6.28 col=<.95,.8,.4> a=1>0 r=sprite(${KT.zap},alpha)`) },
  'Frost Shock': { fx: onBody('<.5,.8,1>', KT.spikes, `pop shard burst=24 on=sphere(.3) life=.4..0.7 v=sdir()*(5..8) size=.1..0.18 acc=drag(2) col=<.6,.88,1> a=1>0 r=sprite(${KT.thread},alpha,velocity,.05)
pop mist burst=12 life=.7..1.1 v=sdir()*1.5+up(.5) size=.5..0.8 acc=drag(1.4) col=<.65,.85,1> a=.7>0 sz=$size*(.6>1.6) r=sprite(${KT.puff},alpha)`) },
  'Flame Shock': { fx: onBody('<1,.5,.1>', KT.splat, `pop flame burst=30 on=sphere(.35) life=.35..0.6 v=sdir()*(4..7)+up(1.5) size=.45..0.75 acc=drag(2.5) col=<1,.65,.15>><.9,.25,.04> a=1>0 sz=$size*(.7>1.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop ember burst=16 life=.6..1 v=sdir()*(3..5)+up(1) size=.05..0.08 acc=grav()*.5 col=<1,.65,.2> a=1>0 r=sprite(${KT.glint},alpha,velocity,.02)
${lamp('<1,.5,.12>', 7, 7)}`) },
  'Moonfire': { ground: true, fx: `fx
pop beam burst=1 life=.5 at=<0,3,0> size=6 col=<.75,.6,1> a=1>.6:.9>0 sz=$size*(1>.8) r=sprite(${KT.beam},alpha)
pop ray burst=24 on=disc(.35).c(6) life=.3..0.4 v=<0,-18,0> size=.2..0.3 col=<.85,.75,1> a=1>0 r=sprite(${KT.thread},alpha,velocity,.1)
pop pool burst=1 life=.7 at=<0,.06,0> size=2.2 col=<.7,.55,1> a=1>0 sz=$size*(.2>1) r=sprite(${KT.halo},alpha,ground)
pop star burst=18 on=disc(.4).c(1) life=.5..0.9 v=up(1..3)+sdir() size=.1..0.16 col=<.9,.8,1> a=1>0 r=sprite(${KT.star},alpha)
${lamp('<.75,.6,1>', 8, 8)}` },
  'Starfire': { ground: true, fx: `fx
pop star burst=1 life=.45 at=<0,1,0> size=3 rot=0..6.28 col=<.95,.8,1> a=1>0 sz=$size*(.3>1.2) r=sprite(${KT.spark4},alpha)
pop fall burst=14 on=disc(.5).c(7) life=.3..0.4 v=<0,-22,0> size=.25..0.4 col=<.8,.65,1> a=1 r=sprite(${KT.star},alpha,velocity,.08)
pop ring burst=1 life=.5 at=<0,.06,0> size=3 col=<.7,.5,1> a=1>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)
pop dust burst=24 on=disc(.5) life=.6..1 v=up(1..3)+sdir()*(2..3) size=.1..0.18 acc=drag(2) col=<.85,.7,1> a=1>0 r=sprite(${KT.star},alpha)
${lamp('<.8,.6,1>', 10, 10)}` },
  'Insect Swarm': { fx: `fx
pop bug burst=40 on=sphere(.7) life=.9..1.4 v=sdir()*(1..2) size=.04..0.07 acc=curl(3)+attract(2) col=<.2,.18,.08> a=1>0 r=sprite(${KT.puff},alpha)
pop haze burst=10 on=sphere(.5) life=.8..1.2 v=up(.3) size=.6..0.9 col=<.45,.55,.2> a=0>.2:.5>.6:.3>0 sz=$size*(.7>1.5) r=sprite(${KT.smoke},alpha)` },
  'Entangling Roots': { ground: true, fx: `fx
pop root burst=30 on=disc(.6) life=.6..1 v=up(1.5..3)+sdir()*.4 size=.1..0.18 acc=vortex(4) col=<.4,.28,.12>><.3,.55,.15> a=1>0 r=sprite(${KT.thread},alpha,velocity,.08)
pop leaf burst=20 on=disc(.5).c(.6) life=.8..1.3 v=up(1..2)+sdir() size=.12..0.2 spin=-6..6 acc=grav()*.2+drag(1) col=<.35,.75,.2> a=1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop ring burst=1 life=1 at=<0,.06,0> size=2 col=<.45,.7,.2> a=1>.6:.8>0 rot=spin(.6) r=sprite(${KT.runes},alpha,ground)` },
  'Death Coil': null, 'Hammer of Wrath': null,
};
for (const k of Object.keys(SIG_DIRECT)) if (!SIG_DIRECT[k]) delete SIG_DIRECT[k]; // these two fly (a coil, a hammer): bolts keep them

// ---- heals, buffs and wards by name (special: heal | buff | barrier): params r g b ----
const fromSky = (c, n = 20) => `pop beam burst=1 life=.7 at=<0,3,0> size=6.5 col=${c} a=0>.1:1>.6:.9>0 r=sprite(${KT.beam},alpha)
pop ray burst=${n} on=disc(.5).c(6) life=.3..0.45 v=<0,-16,0> size=.15..0.25 col=${c} a=1>0 r=sprite(${KT.thread},alpha,velocity,.1)`;
export const SIG_HEAL = {
  'Holy Light': `fx
${fromSky('<1,.9,.55>', 24)}
pop halo burst=1 life=1 at=<0,.06,0> size=2.6 col=<1,.85,.4> a=0>.1:1>.6:.9>0 rot=spin(.5) r=sprite(${KT.halo},alpha,ground)
pop star burst=30 on=disc(.7) life=.8..1.3 v=up(1..2) size=.1..0.18 col=<1,.9,.5> a=0>.2:1>.7:1>0 r=sprite(${KT.holystar},alpha)
${lamp('<1,.85,.45>', 7, 8, '<0,1.5,0>')}`,
  'Flash of Light': `fx
pop flash burst=1 life=.35 at=<0,1.1,0> size=2.4 col=<1,.92,.6> a=1>0 sz=$size*(.3>1.2) r=sprite(${KT.spark4},alpha)
pop star burst=24 at=<0,1.1,0> life=.4..0.7 v=sdir()*(3..5) size=.08..0.14 acc=drag(2) col=<1,.9,.5> a=1>0 r=sprite(${KT.holystar},alpha)
pop halo burst=1 life=.5 at=<0,.06,0> size=2 col=<1,.85,.45> a=1>0 sz=$size*(.3>1) r=sprite(${KT.hoop},alpha,ground)`,
  'Lay on Hands': `fx
${fromSky('<1,.95,.7>', 40)}
pop rays burst=1 life=1.2 at=<0,1.2,0> size=4 col=<1,.88,.45> a=0>.1:1>.6:.9>0 rot=spin(.4) r=sprite(${KT.rays},alpha)
pop wing burst=2 life=1.2 at=<0,1.4,0> size=2.6 col=<1,.95,.75> a=0>.15:.9>.7:.8>0 r=sprite(${KT.halo2},alpha)
pop star burst=50 on=disc(1) life=1..1.6 v=up(1..2.5) size=.12..0.2 col=<1,.9,.5> a=0>.2:1>.7:1>0 r=sprite(${KT.holystar},alpha)
${lamp('<1,.9,.55>', 12, 10, '<0,1.5,0>')}`,
  'Greater Heal': `fx
${fromSky('<1,.95,.75>', 26)}
pop halo burst=1 life=1 at=<0,2.3,0> size=1.2 col=<1,.9,.5> a=0>.15:1>.7:.9>0 rot=spin(1) r=sprite(${KT.halo2},alpha)
pop star burst=36 on=disc(.8) life=.9..1.4 v=up(1..2) size=.1..0.18 acc=vortex(3) col=<1,.95,.65> a=0>.2:1>.7:1>0 r=sprite(${KT.holystar},alpha)`,
  'Flash Heal': `fx
pop flash burst=1 life=.3 at=<0,1.1,0> size=2.2 col=<1,1,.8> a=1>0 sz=$size*(.3>1.2) r=sprite(${KT.spark4},alpha)
pop star burst=26 at=<0,1.1,0> life=.4..0.7 v=sdir()*(3..5) size=.08..0.14 acc=drag(2) col=<1,.95,.7> a=1>0 r=sprite(${KT.holystar},alpha)`,
  'Renew': `fx
pop swirl burst=30 on=disc(.6) life=1..1.5 v=up(.8..1.4) size=.1..0.16 acc=vortex(5) col=<1,.92,.55> a=0>.2:1>.7:1>0 r=sprite(${KT.holystar},alpha)
pop ring burst=1 life=1 at=<0,.06,0> size=1.8 col=<1,.88,.45> a=0>.1:.8>.7:.6>0 rot=spin(1) r=sprite(${KT.sigil},alpha,ground)`,
  'Prayer of Healing': `fx
${fromSky('<1,.92,.6>', 30)}
pop ring burst=1 life=1.2 at=<0,.06,0> size=5 col=<1,.85,.4> a=0>.1:1>.6:.9>0 rot=spin(.4) r=sprite(${KT.sigil2},alpha,ground)
pop star burst=40 on=disc(2) life=.9..1.4 v=up(1..2) size=.1..0.18 col=<1,.9,.5> a=0>.2:1>.7:1>0 r=sprite(${KT.holystar},alpha)`,
  'Healing Wave': `fx
pop wave burst=1 life=.8 at=<0,1,0> size=2.6 col=<.35,.8,1> a=0>.1:1>.6:.9>0 rot=spin(1.5) r=sprite(${KT.whirl},alpha)
pop drop burst=30 on=sphere(.7).c(1) life=.6..1 v=sdir()*1.5+up(1) size=.1..0.18 acc=grav()*.3 col=<.45,.85,1> a=1>0 r=sprite(${KT.puff},alpha)
pop ring burst=1 life=.6 at=<0,.06,0> size=2.4 col=<.4,.85,1> a=1>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)`,
  'Lesser Healing Wave': `fx
pop wave burst=1 life=.5 at=<0,1,0> size=2 col=<.4,.85,1> a=1>0 rot=spin(2) r=sprite(${KT.whirl},alpha)
pop drop burst=18 on=sphere(.6).c(1) life=.5..0.8 v=sdir()*1.5+up(1) size=.08..0.14 acc=grav()*.3 col=<.5,.9,1> a=1>0 r=sprite(${KT.puff},alpha)`,
  'Chain Heal': `fx
pop zap burst=4 at=<0,1.2,0> life=.15..0.25 size=1.4..2 rot=0..6.28 col=<.4,.95,.8> a=1>0 r=sprite(${KT.zap2},alpha)
pop drop burst=24 on=sphere(.6).c(1) life=.6..1 v=sdir()*2+up(1) size=.1..0.16 col=<.5,1,.85> a=1>0 r=sprite(${KT.puff},alpha)
pop ring burst=1 life=.6 at=<0,.06,0> size=2.4 col=<.4,.95,.8> a=1>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)`,
  'Healing Touch': `fx
pop bloom burst=1 life=1 at=<0,.06,0> size=2.6 col=<.45,.9,.35> a=0>.1:1>.6:.9>0 rot=spin(.6) r=sprite(${KT.sigil},alpha,ground)
pop leaf burst=30 on=disc(.9) life=1..1.5 v=up(1..2) size=.14..0.22 spin=-5..5 acc=vortex(4)+drag(1) col=<.4,.85,.3>><.7,1,.45> a=0>.2:1>.7:.8>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop glow burst=1 life=.8 at=<0,1.2,0> size=2 col=<.6,1,.5> a=0>.2:.8>.6:.6>0 r=sprite(${KT.halo2},alpha)`,
  'Regrowth': `fx
pop leaf burst=26 on=disc(.7) life=.9..1.4 v=up(1..1.8) size=.12..0.2 spin=-5..5 acc=vortex(5) col=<.45,.9,.3> a=0>.2:1>.7:.8>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop ring burst=1 life=.8 at=<0,.06,0> size=2 col=<.5,.9,.35> a=1>0 sz=$size*(.3>1) r=sprite(${KT.hoop},alpha,ground)`,
  'Rejuvenation': `fx
pop petal burst=24 on=disc(.6) life=1..1.6 v=up(.6..1.2) size=.1..0.16 spin=-4..4 acc=vortex(4) col=<.9,.6,.85>><.6,.95,.5> a=0>.2:1>.7:1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop ring burst=1 life=1 at=<0,.06,0> size=1.8 col=<.6,.9,.45> a=0>.1:.8>.7:.6>0 rot=spin(.8) r=sprite(${KT.runes},alpha,ground)`,
};
export const SIG_BUFF = {
  'Battle Shout': `fx
pop shout burst=3 life=.5 at=<0,1.7,0> size=1.6..2.6 col=<1,.55,.2> a=1>0 sz=$size*(.3>1.6) r=sprite(${KT.ring},alpha)
pop wave burst=1 life=.5 at=<0,.08,0> size=6 col=<1,.6,.25> a=1>0 sz=$size*(.1>1) r=sprite(${KT.splat},alpha,ground)
${dust()}`,
  'Blessing of Kings': `fx
pop crown burst=1 life=1.4 at=<0,2.5,0> size=1.1 col=<1,.85,.35> a=0>.15:1>.7:.9>0 rot=spin(1) r=sprite(${KT.halo2},alpha)
${fromSky('<1,.88,.5>', 18)}
pop star burst=24 on=disc(.6) life=.8..1.2 v=up(1..2) size=.1..0.16 col=<1,.9,.5> a=0>.2:1>.7:1>0 r=sprite(${KT.holystar},alpha)`,
  'Seal of Command': `fx
pop seal burst=1 life=1.2 at=<0,1.2,0> size=1.8 col=<1,.8,.35> a=0>.15:1>.7:.9>0 rot=spin(1.5) r=sprite(${KT.sigil2},alpha)
pop star burst=20 at=<0,1.2,0> life=.5..0.8 v=sdir()*(2..4) size=.1..0.16 col=<1,.88,.45> a=1>0 r=sprite(${KT.holystar},alpha)`,
  'Retribution Aura': `fx
pop aura burst=1 life=1.4 at=<0,.06,0> size=4 col=<1,.45,.25> a=0>.1:1>.6:.9>0 rot=spin(.6) r=sprite(${KT.sigil},alpha,ground)
pop spike burst=24 on=disc(1.5) life=.6..1 v=up(2..3) size=.1..0.16 col=<1,.6,.3> a=1>0 r=sprite(${KT.thread},alpha,velocity,.06)`,
  "Hunter's Mark": `fx
pop mark burst=1 life=1.2 at=<0,2.4,0> size=1 col=<.95,.35,.2> a=0>.15:1>.7:.9>0 r=sprite(${KT.runes},alpha)
pop ring burst=1 life=.6 at=<0,.06,0> size=2.6 col=<.95,.45,.2> a=1>0 sz=$size*(.3>1) r=sprite(${KT.hoop},alpha,ground)`,
  'Bestial Wrath': `fx
pop roar burst=3 life=.5 at=<0,1.4,0> size=1.6..2.8 col=<1,.35,.15> a=1>0 sz=$size*(.3>1.7) r=sprite(${KT.ring},alpha)
pop rage burst=30 on=disc(.8) life=.6..1 v=up(2..3.5) size=.4..0.7 col=<.9,.2,.1>><.4,.05,.05> a=1>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.04)
${lamp('<1,.35,.15>', 6, 7)}`,
  'Deadly Poison': `fx
pop drip burst=24 on=disc(.5).c(1.1) life=.6..1 v=up(.5)+sdir()*.6 size=.07..0.12 acc=grav()*.5 col=<.35,.9,.2> a=1>0 floor=die r=sprite(${KT.puff},alpha)
pop fume burst=12 on=disc(.6).c(.8) life=.9..1.3 v=up(.8) size=.4..0.6 col=<.3,.6,.15> a=0>.2:.6>.6:.3>0 sz=$size*(.7>1.5) r=sprite(${KT.smoke},alpha)`,
  'Vampiric Embrace': `fx
pop bat burst=12 on=sphere(.8).c(1.2) life=.8..1.2 v=vortex(6)+up(.6) size=.25..0.4 col=<.25,.05,.3> a=1>0 r=sprite(${KT.swirl},alpha)
pop shade burst=16 on=disc(.8) life=.9..1.3 v=up(1) size=.5..0.8 col=<.35,.08,.45> a=0>.2:.7>.6:.4>0 sz=$size*(.7>1.5) r=sprite(${KT.smoke},alpha)`,
  'Windfury Weapon': `fx
pop gust burst=30 on=disc(1).c(1) life=.6..1 v=vortex(9)+up(.6) size=.3..0.5 col=<.75,.9,1> a=.9>0 sz=$size*(.6>1.6) r=sprite(${KT.puff},alpha)
pop whirl burst=1 life=.9 at=<0,1.1,0> size=2.2 col=<.65,.85,1> a=0>.15:.9>.6:.7>0 rot=spin(3) r=sprite(${KT.whirl},alpha)`,
};
// wards: the shell's tint (oklch) and its own sparkle
export const SIG_WARD = {
  'Power Word: Shield': { tint: 'oklch(0.86 0.13 90)', fx: `pop rune n=1 local at=<0,1.1,0> size=2.6 col=<1,.85,.4> a=.85 rot=spin(1.2) r=sprite(${KT.sigil2},alpha,ground)` },
  'Divine Shield': { tint: 'oklch(0.9 0.14 92)', fx: `pop ray n=10 local on=sphere(1.1).c(1.1) life=.5..0.9 v=sdir()*.2 size=.2..0.35 col=<1,.9,.5> a=0>.7:.6>0 r=sprite(${KT.holystar},alpha)` },
  'Divine Protection': { tint: 'oklch(0.86 0.12 88)', fx: `pop ray n=8 local on=sphere(1.1).c(1.1) life=.5..0.9 size=.18..0.3 col=<1,.88,.5> a=0>.7:.6>0 r=sprite(${KT.holystar},alpha)` },
  'Retaliation': { tint: 'oklch(0.7 0.16 35)', fx: `pop blade n=8 local on=sphere(1.1).c(1.1) life=.5..0.8 size=.25..0.4 rot=0..6.28 col=<1,.5,.3> a=0>.7:.6>0 r=sprite(${KT.slash},alpha)` },
  'Evasion': { tint: 'oklch(0.55 0.05 280)', fx: `pop blur n=12 local on=sphere(1).c(1) life=.4..0.7 size=.4..0.6 col=<.35,.3,.45> a=0>.5:.4>0 r=sprite(${KT.smoke},alpha)` },
  'Feign Death': { tint: 'oklch(0.5 0.04 140)', fx: `pop ghost n=6 local on=sphere(.8).c(1) life=.8..1.2 v=up(.3) size=.4..0.6 col=<.6,.65,.6> a=0>.4:.3>0 r=sprite(${KT.smoke},alpha)` },
  'Shadow Ward': { tint: 'oklch(0.45 0.15 305)', fx: `pop shade n=12 local on=sphere(1.05).c(1) life=.5..0.9 size=.2..0.35 col=<.5,.2,.7> a=0>.7:.6>0 r=sprite(${KT.swirl},alpha)` },
  'Fade': { tint: 'oklch(0.6 0.04 280)', fx: `pop mist n=10 local on=sphere(1).c(1) life=.6..1 size=.4..0.6 col=<.6,.55,.7> a=0>.4:.3>0 r=sprite(${KT.smoke},alpha)` },
  'Stoneskin Totem': { tint: 'oklch(0.6 0.07 70)', fx: `pop stone n=10 local on=sphere(1.05).c(1) life=.6..1 size=.15..0.25 col=<.6,.5,.35> a=0>.8:.7>0 r=sprite(${KT.puff},alpha)` },
  'Barkskin': { tint: 'oklch(0.5 0.08 65)', fx: `pop bark n=10 local on=sphere(1.05).c(1) life=.6..1 size=.2..0.3 rot=0..6.28 col=<.45,.32,.18> a=0>.8:.7>0 r=sprite(${KT.splat},alpha)` },
};

// compendium (creator 2026-10-10): stuns leave yellow stars spinning over the head; bleeds drip dark red from the chest
export const SIG_STUN = `fx
pop star n=5 local at=<0,0,0> on=disc(.35) life=99 size=.16..0.22 v=vortex(4) col=<1,.88,.3> a=1 rot=spin(3) r=sprite(${KT.star},alpha)
pop ring n=1 local life=99 size=.9 col=<1,.85,.35> a=.6 rot=spin(2) r=sprite(${KT.hoop},alpha,ground)`;
export const SIG_BLEED = `fx
pop drop burst=16 on=sphere(.25) life=.6..1 v=sdir()*(1.5..3)+up(.5) size=.07..0.12 acc=grav() col=<.6,.04,.04> a=1 floor=stick r=sprite(${KT.puff},alpha)
pop mist burst=6 on=sphere(.2) life=.4..0.6 v=sdir()*1 size=.25..0.4 col=<.5,.05,.05> a=.7>0 sz=$size*(.6>1.4) r=sprite(${KT.puff},alpha)`;
export const STUNNERS = new Set(['Hammer of Justice', 'Kidney Shot', 'Cheap Shot', 'Gouge', 'Scatter Shot', 'Death Coil', 'Charge', 'Intercept', 'Concussive Shot']);
export const BLEEDERS = new Set(['Rend', 'Rupture', 'Garrote', 'Hemorrhage', 'Rake', 'Execute', 'Eviscerate', 'Mortal Strike', 'Ferocious Bite', 'Maul', 'Claw', 'Backstab', 'Ambush']);
// Searing Pain (compendium): a bolt of red-orange fire erupting from the floor up through the target
SIG_DIRECT['Searing Pain'] = { ground: true, fx: `fx
pop column burst=36 on=disc(.35) life=.3..0.55 v=up(7..11) size=.45..0.75 col=<1,.55,.12>>.5:<.95,.25,.05>><.5,.08,.03> a=1>.6:.9>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop ring burst=1 life=.35 at=<0,.06,0> size=2 col=<1,.4,.08> a=1>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)
pop ember burst=16 on=disc(.3) life=.6..1 v=up(3..5)+sdir() size=.05..0.08 acc=grav()*.4 col=<1,.55,.15> a=1>0 r=sprite(${KT.glint},alpha,velocity,.02)
pop lamp burst=1 life=.3 at=<0,1,0> r=light(<1,.45,.12>,7,7)` };
Object.assign(SIG_WARD, {
  'Shield Wall': { tint: 'oklch(0.75 0.03 240)', fx: `pop shield n=4 local on=disc(1).c(1.1) life=.8..1.2 size=.7..0.9 col=<.8,.85,.95> a=0>.7:.6>0 r=sprite(${KT.halo2},alpha)` },
  'Blessing of Protection': { tint: 'oklch(0.88 0.13 90)', fx: `pop crest n=1 local at=<0,1.2,-.6> size=1.2 col=<1,.85,.4> a=.8 r=sprite(${KT.holystar},alpha)` },
  'Deterrence': { tint: 'oklch(0.7 0.12 140)', fx: `pop gust n=12 local on=sphere(1).c(1) life=.5..0.8 v=vortex(4) size=.25..0.4 col=<.6,.9,.5> a=0>.6:.5>0 r=sprite(${KT.puff},alpha)` },
  'Vanish': { tint: 'oklch(0.3 0.02 280)', fx: `pop smoke n=14 local on=sphere(.9).c(1) life=.6..1 size=.5..0.8 col=<.15,.14,.18> a=0>.6:.5>0 r=sprite(${KT.smoke},alpha)` },
  'Soul Link': { tint: 'oklch(0.55 0.18 320)', fx: `pop link n=8 local on=sphere(1.05).c(1) life=.6..1 size=.2..0.3 col=<.85,.3,.7> a=0>.7:.6>0 r=sprite(${KT.swirl},alpha)` },
});
Object.assign(SIG_HEAL, { 'Desperate Prayer': SIG_HEAL['Flash Heal'], 'Frenzied Regeneration': SIG_HEAL['Regrowth'] });
