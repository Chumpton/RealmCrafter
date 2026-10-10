// The hotbar campfire (creator 2026-10-06): every tuned number in one place.
export const CAMPFIRE = {
  ahead: 3.2,        // metres in front of you the fire lands
  benches: 4,        // log benches in a ring
  ring: 2.7,         // bench distance from the fire
  idleMs: 20000,     // nobody seated this long -> it burns out
  cooldownMs: 3000,  // between two pitches by one player
};
export const CAMPFIRE_FX = `fx
pop coals n=8 on=disc(.25) size=.06..0.14 tint=<2.4,.9,.25>..<1.1,.3,.08> sz=$size*flick(.5,.12) col=$tint*flick(.8,.3) a=.9 r=sprite(soft-disc,add)
pop flame rate=flick(.45,.2)*60 on=disc(.22) life=.5..0.9 v=up(1.5)+cone(22)*(.3..0.8) size=.2..0.4 acc=curl(.5)*1.2+buoy(2.2)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=4 on=disc(.22) life=.7..1.4 v=up(2.2)+cone(30)*(.4..1.2) size=.02..0.05 acc=curl(.8)+grav()*.45+drag(.5) sz=$size*(1>.7:.8>.3) col=hdr(5,2.8,.8)>.6:hdr(2.4,.8,.15)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.22 inh=p;v:$v*.4 life=1.8..3 size=.16..0.26 acc=buoy(.9)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.2) col=<.3,.28,.26>><.15,.15,.16> a=0>.25:.3>.7:.2>0 rot=spin(.15) r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(.22).c(.45) glo=fire()*(#flame/40)~ r=light(<1,.55,.24>,$glo*30,12)`;
export const PUFF_FX = `fx
pop smoke burst=18..26 on=disc(.5) life=1.2..2.2 v=up(1..2)+sdir()*.5 size=.3..0.5 acc=buoy(.6)+drag(1.2) sz=$size*(.6>2.4) col=<.35,.33,.3> a=0>.4:.35>.7:.2>0 rot=spin(.2) r=sprite(smoke-puff,alpha)
pop sparks burst=10 on=disc(.3) life=.4..0.9 v=up(2..3.5)+sdir()*1 size=.02..0.04 acc=grav()*.6 col=hdr(4,2,.5) a=1>0 r=sprite(ember,add,velocity,.02)`;
