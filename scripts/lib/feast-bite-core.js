// feast-bite's body — scripts/feast-bite.js (the dish rows' behavior) loads this by import() on first need, so it stays out of
// the arrival set. E takes a bite: sound, crumbs, +1 fed on the presser; the dish shrinks a step and refills over ~60 s.
const BITE = {
  bread: '/cdn/moodboard-lowpoly-cozy/sfx-bite-crunchy-bread.mp3',
  meat: '/cdn/moodboard-lowpoly-cozy/sfx-bite-juicy-meat.mp3',
};
const KIND = { bread: 'bread', cheese: 'bread', fruit: 'bread', fish: 'meat', stew: 'meat', roast: 'meat', meat: 'meat' };
const CRUMB = { bread: [0.78, 0.58, 0.32], meat: [0.55, 0.3, 0.18] };
const T = { step: 0.18, floor: 0.46, refillSeconds: 60, debounceMs: 550, pop: '#e8c27a' };
const crumbs = (c) => `fx
pop crumb burst=10..14 life=.45..0.8 v=up(.9..1.6)+sdir()*(.35..0.7) size=.012..0.024 spin=-9..9 acc=grav()+drag(.8) col=<${c[0]},${c[1]},${c[2]}>*(.8..1.15) a=1>.75:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(stalk,alpha,velocity,.02)
pop puff burst=2 life=.35..0.55 v=up(.2..0.4) size=.05..0.08 acc=buoy(.2)+drag(1.5) col=<.9,.85,.76> a=0>.25:.2>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const kindOf = (s) => KIND[s.primitive?.params?.item] || 'bread';
export function onSpawn(ctx) { ctx.on('press', (ctx, p) => bite(ctx, p && p.by)); }
export function bite(ctx, by) {
  const s = ctx.self, now = ctx.now();
  if (now < (s.state.readyAt ?? 0)) return false;
  s.state.readyAt = now + T.debounceMs;
  const level = s.state.level ?? 1;
  s.state.level = Math.max(T.floor, level - T.step);
  s.state.bites = (s.state.bites ?? 0) + 1;
  s.scale = s.state.level;
  const pl = (ctx.place.players || []).find((q) => q.id === by);
  if (pl) { pl.state.fed = (pl.state.fed ?? 0) + 1; pl.state.fedAt = now; ctx.emit('heal', { amount: 3 }, { to: pl.id }); } // COMBAT: a feast bite heals 3
  const kind = kindOf(s), f = s.worldFeetPosition || s.feetPosition, at = { x: f.x, y: f.y + 0.06, z: f.z };
  ctx.emit('playSound', { clip: BITE[kind], position: at, volume: 0.75, pitch: 0.94 + ctx.random() * 0.12, maxDistance: 10 });
  ctx.emit('fx', { position: at, script: crumbs(CRUMB[kind]) });
  ctx.emit('damageNumber', { position: { x: f.x, y: f.y + 0.55, z: f.z }, text: '+1 fed', color: T.pop, size: 0.8, lifetime: 1.2 });
  return true;
}
export function update(ctx, dt) {
  const s = ctx.self, level = s.state.level ?? 1;
  if (level >= 1) { if (s.scale?.x !== undefined && Math.abs(s.scale.x - 1) > 0.001) s.scale = 1; ctx.sleep(); return; }
  const next = Math.min(1, level + (1 - T.floor) * dt / T.refillSeconds);
  s.state.level = next; s.scale = next;
}
