// W8 snow sound + breath (S6, S7), on every player body, acting only on this machine's own player.
// Snow off (place.state.snow.on !== true, the natural cycle): one state read every 4 s, nothing else; the helpers load
// by import() on the first snowy tick, so none of this is in the arrival set. Numbers: SNOW.w8 + SNOW.gain (scripts/lib/data/snow.js).
// On: crunch steps by depthAt/packAt at the feet (powder squeak / packed crunch / slush splat), a soft hush bed as depth
// rises, a blizzard wind bed while kind==='blizzard' (both through the hall walls, audio-hall-ear), the first-snow sting once
// per winter (a playSound on the Music bus: the meadow song keeps playing), breath fog outdoors below 0 C, and
// player.state.snowFrost (ui.js frostEdge) that builds outside and melts by the hearth.
import { SNOW } from './lib/data/snow.js';
const W = SNOW.w8;
let L = null, loading = null, beds = {}, dist = 0, breathAt = 0, frost = 0, sentFrost = 0;
const libs = () => { if (!L && !loading) loading = Promise.all([import('./lib/snow-field.js'), import('./lib/data/hall-acoustics.js'), import('./lib/data/longhouse.js')]).then(([f, a, h]) => { L = { f, a, hearth: h.HALL.hearth }; }).catch(() => { loading = null; }); return L; };
export const updateSchedule = { every: { seconds: 0.1 } };

function bed(ctx, name, gain) {
  const id = beds[name];
  if (gain <= 0.005) { if (id) { try { ctx.destroy(id); } catch (e) {} delete beds[name]; } return; }
  const audio = L.a.earAudio(W.clips[name], 'out', { gain: +gain.toFixed(3), loop: true, bus: 'Ambience' });
  const o = id && ctx.getObject(id);
  if (!o) beds[name] = ctx.spawn({ audience: 'local', scope: 'session', feetPosition: ctx.self.feetPosition, audio });
  else if (Math.abs((o.audio?.gain ?? 0) - audio.gain) > 0.01) o.audio = audio;
}
function quiet(ctx) {
  for (const k of Object.keys(beds)) { try { ctx.destroy(beds[k]); } catch (e) {} }
  beds = {}; dist = 0; frost = 0;
  sentFrost = 0; if (ctx.self.state.snowFrost) ctx.self.state.snowFrost = 0;
}

export function update(ctx, dt) {
  const me = ctx.self, s = ctx.place.state.snow;
  if (!me.isLocal) { ctx.sleep(30); return; }
  if (!s?.on) { if (sentFrost || me.state.snowFrost || Object.keys(beds).length) quiet(ctx); ctx.sleep(4); return; }
  if (!libs()) return;
  const p = me.feetPosition, v = me.velocity || { x: 0, z: 0 }, temp = s.temp ?? 0, now = ctx.now();
  const depth = L.f.depthAt(ctx, p.x, p.z), inside = L.a.hallK(p.x, p.y + 1.5, p.z) >= 0.5;
  // steps: one per stride of ground covered, only on snow
  if (me.grounded && depth > W.minDepth && !me.parent) {
    dist += Math.hypot(v.x, v.z) * dt;
    if (dist >= W.stride) {
      dist = 0;
      const pack = L.f.packAt(ctx, p.x, p.z);
      const kind = temp > W.slushTemp || (s.wet ?? 0) > W.slushWet || s.kind === 'sleet' ? 'slush' : pack > W.packed ? 'packed' : 'powder';
      const at = { x: p.x, y: p.y + 0.05, z: p.z };
      ctx.emit('playSound', { clip: W.clips[kind], position: at, volume: SNOW.gain.crunch * Math.min(1, 0.55 + depth * 2), pitch: 0.9 + ctx.random() * 0.2, maxDistance: W.stepRange }, { audience: { nearby: at, radius: W.stepRange } });
    }
  } else dist = Math.min(dist, W.stride * 0.5);
  // beds: the hush grows with the mean depth, the blizzard howls with the fall
  bed(ctx, 'hush', s.kind === 'blizzard' ? 0 : SNOW.gain.hush * Math.min(1, (s.depth ?? 0) / W.hushDepth));
  bed(ctx, 'blizzard', s.kind === 'blizzard' ? SNOW.gain.blizzard * (0.4 + 0.6 * Math.min(1, s.fall ?? 1)) : 0);
  // first snow of the winter: a quiet swell, once
  const fs = s.firstSnowAt;
  if (fs && me.state.snowFirstSeen !== fs) {
    me.state.snowFirstSeen = fs;
    if (now - fs < W.stingWindowMs) ctx.emit('playSound', { clip: W.clips.sting, volume: W.stingVol, bus: 'Music' }, { audience: { player: me.id } });
  }
  // warmth: frost builds outdoors in the cold, melts in the hall, fast within hearthWarm m of the fire
  const H = L.hearth, hd = Math.hypot(Math.max(H.x0 - p.x, 0, p.x - H.x1), Math.max(H.z0 - p.z, 0, p.z - H.z1));
  const cold = temp < 0 && !inside ? Math.min(1, 0.35 - temp / 8) : 0;
  if (cold > 0) frost += (cold - frost) * Math.min(1, W.frostUp * dt);
  else frost = Math.max(0, frost - (inside && hd < W.hearthWarm ? W.frostHearth : W.frostDown) * dt);
  const fr = Math.round(frost * 10) / 10;
  if (fr !== sentFrost) { sentFrost = fr; me.state.snowFrost = fr; }
  // breath: every ~3 s while cold, lingering indoors with the frost, gone by the fire
  const a = inside ? (temp < 0 ? frost * 0.7 * Math.min(1, hd / W.hearthWarm) : 0) : cold;
  if (a > W.breathMin && now >= breathAt) {
    breathAt = now + (W.breathEvery - 0.4 + ctx.random() * 0.8) * 1000;
    const r = me.rotation, yaw = ((typeof r === 'number' ? r : r?.yaw) ?? 0) * Math.PI / 180, dx = -Math.sin(yaw), dz = -Math.cos(yaw);
    const at = { x: p.x + dx * 0.22, y: p.y + 1.58, z: p.z + dz * 0.22 };
    ctx.emit('fx', { position: at, script: 'scripts/snow-breath.fx.js', params: { a: +a.toFixed(2), dx: +dx.toFixed(2), dz: +dz.toFixed(2) } }, { audience: { nearby: at, radius: SNOW.budget.fxRange } });
  }
}
export function onDestroy(ctx) { if (ctx.self.isLocal) for (const k of Object.keys(beds)) { try { ctx.destroy(beds[k]); } catch (e) {} } }
