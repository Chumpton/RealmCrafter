// The feast family: one geometry script (scripts/gen/feast-food.js), params.item picks the piece. A row names its item.
const GEN = 'scripts/gen/feast-food.js';
const STEAM = `fx
pop steam rate=?mobile:1.2|2.2 on=disc(.12).c(.07) life=1.6..2.6 v=up(.12..0.22) size=.05..0.09 acc=buoy(.12)+curl(.3)*.25+drag(.6) col=<.96,.94,.9> a=0>.15:.12>.7:.06>0 sz=$size*(.6>2.6) rot=spin(.2) r=sprite(smoke-puff,alpha)`;
const DRIPS = `fx
pop drip rate=?mobile:2|3 on=disc(.22).c(.7) life=.28..0.36 v=<0,-.3,0> size=.012..0.02 acc=grav() col=hdr(2.6,1.3,.35) a=1 sz=$size r=sprite(ember,add,velocity,.02)
pop spark rate=?mobile:1.5|2.5 on=disc(.2).c(.3) life=.3..0.6 v=up(.6..1.1)+sdir()*.3 size=.01..0.018 acc=grav()*.5+drag(1) col=hdr(4,2,.5)>hdr(1.5,.4,.1) a=(1>0)*flick(10,.4) r=sprite(ember,add,velocity,.02)
pop haze rate=1 on=disc(.22).c(.85) life=1.5..2.2 v=up(.25..0.4) size=.12..0.2 acc=buoy(.3)+curl(.3)*.4+drag(1) col=<.8,.72,.62> a=0>.1:.08>.7:.05>0 sz=$size*(.6>2.2) rot=spin(.2) r=sprite(smoke-puff,alpha)`;
const prim = (item, extra = {}) => ({ kind: 'scripted', script: GEN, params: { item, ...extra } });
export const food = { tags: ['feast', 'feast-food'], physics: 'none', castShadow: false, receiveShadow: true, visibleRange: { max: 30 }, material: { pbr: true }, primitive: prim('mug') };
export const stew = { ...food, tags: ['feast', 'feast-food', 'feast-steam'], primitive: prim('stew'), fx: { script: STEAM } };
export const spitFrame = { tags: ['feast', 'feast-spit'], physics: 'none', castShadow: true, visibleRange: { max: 60 }, material: { pbr: true }, primitive: prim('spit-frame'),
  audio: { clip: '/cdn/moodboard-lowpoly-cozy/sfx-meat-sizzle-roast-loop.mp3', gain: 0.1, loop: true, spatial: true, maxDistance: 12 }, fx: { script: DRIPS } };
export const spitRoast = { tags: ['feast', 'feast-roast'], physics: 'none', castShadow: true, visibleRange: { max: 60 }, material: { pbr: true }, primitive: prim('spit-roast'), behavior: 'scripts/feast-spit.js', state: { turnSeconds: 26 } };
export const cask = { tags: ['feast', 'feast-cask', 'interactable'], physics: 'static', castShadow: true, visibleRange: { max: 60 }, material: { pbr: true }, primitive: prim('cask'), behavior: 'scripts/feast-cask.js', state: { pours: 0 } };
export const brewing = { tags: ['feast', 'feast-brewing'], physics: 'static', castShadow: true, visibleRange: { max: 60 }, material: { pbr: true }, primitive: prim('brewing') };
