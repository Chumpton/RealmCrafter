// hall-murmur's body (scripts/hall-murmur.js loads it). The row's audio follows FEEL.hall[state.kind]; a murmur bed
// splits its listeners while Rolf plays: anyone within duck.radius of him drops out of it (everyone else hears it full);
// when every nearby listener is by Rolf the whole row plays at duckGain.
import { FEEL } from './data/home-feel.js';
import { earAudio } from './data/hall-acoustics.js';
const H = FEEL.hall;
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
function voice(ctx, gain, listeners) {
  const cfg = H[ctx.self.state.kind] || H.murmur, a = ctx.self.audio || {};
  const side = cfg.side || (ctx.self.state.kind === 'eaves' ? 'out' : 'in'); // A2: chatter lives in the hall, the eaves wind outside
  const want = earAudio(cfg.clip, side, { gain: Math.round(gain * 1000) / 1000, loop: true, spatial: true, maxDistance: cfg.maxDistance, refDistance: cfg.refDistance, bus: 'Ambience' });
  if (listeners) want.listeners = listeners;
  const keys = ['kind', 'script', 'params', 'clip', 'gain', 'loop', 'spatial', 'maxDistance', 'refDistance', 'bus', 'listeners'];
  if (keys.some((k) => !same(a[k], want[k]))) ctx.self.audio = want;
}
function duck(ctx) {
  const cfg = H[ctx.self.state.kind] || H.murmur, D = H.duck, me = ctx.self.feetPosition;
  const players = ctx.place.players;
  const around = players.filter((p) => Math.hypot(p.feetPosition.x - me.x, p.feetPosition.z - me.z) < D.wakeRadius);
  if (!around.length) { ctx.sleep(D.idleSleep); return; }
  const rolf = ctx.getObject(D.rolf), r = rolf?.state?.playing && (rolf.worldFeetPosition || rolf.feetPosition);
  const near = r ? around.filter((p) => Math.hypot(p.feetPosition.x - r.x, p.feetPosition.z - r.z) < D.radius) : [];
  // one voice per row: when some listeners are by Rolf, the row plays for the rest; when all are, it plays for all at the ducked gain
  if (!near.length) voice(ctx, cfg.gain);
  else if (near.length === around.length) voice(ctx, cfg.gain * D.duckGain);
  else voice(ctx, cfg.gain, players.filter((p) => !near.includes(p)).map((p) => p.id));
}
export function onSpawn(ctx) { voice(ctx, (H[ctx.self.state.kind] || H.murmur).gain); }
export function update(ctx) {
  const cfg = H[ctx.self.state.kind] || H.murmur;
  if (!cfg.duck) { voice(ctx, cfg.gain); ctx.sleep(); return; }
  duck(ctx);
}
