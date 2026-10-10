// The camp's training dummy (creator 2026-10-10: "make the training dummy work"). Tagged enemy, so combat-player.js and
// class-cast-player.js swing at it and step state.hp. It never fights back: a hit rocks it on its post, straw flies;
// at 0 hp it keels over, lies a beat, rights itself whole. Left alone it heals. Numbers: scripts/lib/data/combat.js DUMMY.
import { animate } from 'builtin/tween';
import { DUMMY } from './lib/data/combat.js';
export const updateSchedule = { every: { seconds: 0.2 } };
const THUD = '/cdn/moodboard-lowpoly-cozy/sfx-straw-dummy-thud-hit.mp3';
const TOPPLE = '/cdn/moodboard-lowpoly-cozy/sfx-wooden-post-creak-fall-thump.mp3';
const STRAW = `fx
pop straw burst=40..55 life=1..1.8 v=sdir()*(1.5..3.5)+up(2..3.5) size=.05..0.1 spin=-8..8 acc=grav()*.8+drag(.9) col=<.92,.76,.38> a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(stalk,alpha,velocity,.02)
pop dust burst=8 life=.8..1.3 on=disc(.6) v=up(.3..0.7)+sdir()*.4 size=.4..0.7 acc=buoy(.2)+drag(1.4) col=<.6,.53,.4> a=0>.3:.3>.7:.12>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
function full(s) { Object.assign(s, { name: 'Training Dummy', stance: 'neutral', maxHp: DUMMY.hp, hp: DUMMY.hp, defence: DUMMY.defence, magic: DUMMY.magic, defBonus: DUMMY.defBonus, magicDefBonus: DUMMY.magicDefBonus, rangedDefBonus: DUMMY.rangedDefBonus, down: false, engaged: null }); }
export function onSpawn(ctx) { const s = ctx.self.state; if (typeof s.hp !== 'number' || s.down) full(s); ctx.self.state.seen = s.hp; }
export function update(ctx) {
  const o = ctx.self, s = o.state, now = ctx.now();
  if (s.down) return;
  if (typeof s.hp !== 'number') full(s);
  if (s.hp < (s.seen ?? s.hp)) { // struck: it rocks back on its post and settles
    const lean = 4 + Math.min(10, (s.seen - s.hp) * 0.8), side = ctx.random() < 0.5 ? -1 : 1;
    animate(ctx, o, { 'rotation.pitch': [0, -lean, lean * 0.45, -lean * 0.15, 0], 'rotation.roll': [0, side * lean * 0.4, 0] }, { duration: 0.7, easing: 'easeOutQuad' });
  }
  s.seen = s.hp;
  if (s.hp <= 0) { // down it goes
    s.down = true; s.hp = 0; s.engaged = null;
    const p = { x: o.feetPosition.x, y: o.feetPosition.y + 1.2, z: o.feetPosition.z };
    animate(ctx, o, { 'rotation.pitch': [0, -8, -78] }, { duration: 0.6, easing: 'easeInQuad' });
    ctx.emit('fx', { position: p, script: STRAW }); ctx.emit('playSound', { clip: TOPPLE, position: p, volume: 0.8 });
    ctx.after(DUMMY.resetSec, 'rise'); return;
  }
  if (s.hp < s.maxHp && now - (s.hitAt ?? 0) > DUMMY.healIdleSec * 1000) { full(s); s.seen = s.hp; }
  if (s.hp >= s.maxHp && !s.engaged) ctx.sleep(1);
}
export function rise(ctx) {
  const o = ctx.self, s = o.state;
  animate(ctx, o, { 'rotation.pitch': [-78, 6, -2, 0] }, { duration: 0.9, easing: 'easeOutQuad' });
  ctx.emit('playSound', { clip: THUD, position: o.feetPosition, volume: 0.5, pitch: 0.7 });
  full(s); s.seen = s.hp;
}
