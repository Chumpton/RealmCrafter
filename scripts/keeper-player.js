// CAMPTON'S KEEPER (creator 2026-10-06): the server hand behind ui/hud/keeper.js. Every op checks it is Campton.
// state.keeper = { open, tab } is his own row; marks ride state.keeperMarks. Room rows: place.state.keeperMoon.
import { KEEPER as K, isKeeper } from './lib/data/keeper.js';
const BLOOM = `fx
pop star burst=110..140 life=1.4..2.2 v=sdir()*(7..10) acc=grav()*.35+drag(1.3) size=.08..0.14 tint=hdr(%r|4,%g|1,%b|1.5)..hdr(4,3.6,1.2) col=$tint a=1>.7:1>0 sz=$size*(1>.3) r=sprite(ember,add,velocity,.05)
pop sparkle on=@star?.4 life=.4..0.8 v=sdir()*.2 size=.04..0.07 col=hdr(5,5,4) a=(1>0)*flick(14,.6) r=sprite(soft-disc,add)
pop flash burst=1 life=.5 at=point() r=light(<1,.8,.6>,600,60)`;
const RISE = `fx
pop ring burst=40 on=disc(.8) life=.8..1.2 v=up(1.5..3) size=.04..0.08 col=hdr(2,2.6,4) a=1>0 r=sprite(ember,add)`;
const HUES = [[4, 1, 1.5], [1, 2.2, 4], [1.2, 4, 1.4], [4, 3, .6], [3.4, 1, 4], [4, 1.8, .4]];
export const updateSchedule = { every: { seconds: 1 } };
const toast = (ctx, msg, who) => ctx.emit('toast', { message: msg, duration: 2.2 }, { audience: { player: who ?? ctx.self.id } });
const pos = (me) => me.worldFeetPosition ?? me.feetPosition;
export function onInput(ctx, input) {
  const me = ctx.self;
  if (input.pressed?.options && me.state.keeper?.open && isKeeper(me)) me.state.keeper = { ...me.state.keeper, open: false }; // O closes the window: the keeper flag rests with it
  if (!input.pressed?.keeper) return;
  if (!isKeeper(me)) return;
  const a = input.actionData?.keeper ?? {}, k = me.state.keeper ?? { open: false, tab: 'tools' };
  const op = a.op ?? 'toggle';
  // creator 2026-10-06: his keeper IS the Den Keeper window (ui.js adminWide); F7 opens it on the keeper's desk, his own tabs ride beside Build
  if (op === 'toggle') { const on = !(k.open && me.state.optionsOpen); me.state.keeper = { ...k, open: on }; me.state.optionsOpen = on; if (on && !['world', 'build', 'admin', 'watch', 'general', 'sound'].includes(me.state.optTab)) me.state.optTab = 'build'; return; }
  if (op === 'close') { me.state.keeper = { ...k, open: false }; me.state.optionsOpen = false; return; }
  if (op === 'tab') { me.state.keeper = { ...k, open: true, tab: typeof a.v === 'string' ? a.v : null }; return; }
  const p = pos(me);
  if (op === 'gather') { // everyone to the keeper, fanned in front (travel.js's summon row: their own body makes the jump)
    const others = ctx.place.players.filter((q) => q.id !== me.id && (!a.id || q.id === a.id));
    others.forEach((q, i) => { const ang = (i / Math.max(1, others.length)) * Math.PI * 2; q.state.summon = { x: p.x + Math.cos(ang) * 2.4, y: p.y, z: p.z + Math.sin(ang) * 2.4, at: ctx.now() + i, by: me.displayName }; });
    ctx.emit('fx', { position: p, script: RISE });
    return toast(ctx, others.length ? `brought ${others.length === 1 ? others[0].displayName : others.length + ' travellers'}` : 'nobody else is here');
  }
  if (op === 'goto' && a.id) { const q = ctx.place.players.find((x) => x.id === a.id); if (!q) return toast(ctx, 'they left'); const f = q.feetPosition; me.feetPosition = { x: f.x + 1.5, y: f.y + 0.3, z: f.z + 1.5 }; me.velocity = { x: 0, y: 0, z: 0 }; return; }
  if (op === 'home') { const d = ctx.place.defaultSpawnPoint ?? { x: 0, z: 0 }; const y = ctx.place.terrain?.heightAt?.(d.x, d.z) ?? 0; me.feetPosition = { x: d.x, y: y + K.homeY, z: d.z }; me.velocity = { x: 0, y: 0, z: 0 }; return; }
  if (op === 'mark') { const m = (me.state.keeperMarks ?? []).slice(0, K.marks - 1); const n = String(a.n ?? '').trim().slice(0, 18) || `spot ${m.length + 1}`; me.state.keeperMarks = [{ n, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) }, ...m]; return toast(ctx, `marked ${n}`); }
  if (op === 'markGo') { const m = (me.state.keeperMarks ?? [])[a.i]; if (m) { me.feetPosition = { x: m.x, y: m.y + 0.2, z: m.z }; me.velocity = { x: 0, y: 0, z: 0 }; } return; }
  if (op === 'markDel') { const m = [...(me.state.keeperMarks ?? [])]; m.splice(a.i, 1); me.state.keeperMarks = m; return; }
  if (op === 'say') { const t = String(a.text ?? '').replace(/\s+/g, ' ').trim().slice(0, K.sayMax); if (!t) return;
    for (const q of ctx.place.players) { ctx.emit('toast', { message: `ᛟ ${me.displayName}: ${t}`, duration: K.sayMs }, { audience: { player: q.id } }); ctx.emit('playSound', { clip: K.horn, volume: 0.6 }, { audience: { player: q.id } }); }
    return; }
  if (op === 'moon') { const on = !ctx.place.state.keeperMoon; ctx.place.state.keeperMoon = on; ctx.place.gravity = { x: 0, y: on ? -24 * K.moon : -24, z: 0 }; return toast(ctx, on ? 'moon gravity on for everyone' : 'gravity back to normal'); }
  if (op === 'show') { // a fireworks show over the keeper: volleys on the body's own clock
    if (me.state.keeperShow && ctx.now() - me.state.keeperShow < K.showBursts * K.showGap * 1000 + 2000) return toast(ctx, 'show already going');
    me.state.keeperShow = ctx.now();
    for (let i = 0; i < K.showBursts; i++) ctx.after(i * K.showGap + 1, 'keeperBurst', { x: p.x + (ctx.random() - 0.5) * 30, y: p.y + 20 + ctx.random() * 14, z: p.z + (ctx.random() - 0.5) * 30, c: HUES[i % HUES.length] });
    ctx.emit('playSound', { clip: K.launch, position: p, volume: 0.8 }, { audience: { nearby: p, radius: 120 } });
    return;
  }
}
export function keeperBurst(ctx, b) {
  const at = { x: b.x, y: b.y, z: b.z };
  ctx.emit('fx', { position: at, script: BLOOM, params: { r: b.c[0], g: b.c[1], b: b.c[2] } }, { audience: { nearby: at, radius: 200 } });
  ctx.emit('playSound', { clip: K.boom, position: at, volume: 0.9, maxDistance: 200 }, { audience: { nearby: at, radius: 200 } });
}
export function update(ctx) { ctx.sleep?.(3600); } // all work is in onInput and its timers
