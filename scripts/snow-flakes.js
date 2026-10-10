// W7 falling snow driver on the invisible row 'snow-flakes'. Asleep (no work) while place.state.snow?.on is not true.
// When on: (1) mirrors snow.kind / place.state.wind / first-snow onto the hearth-weather-snow row's fx params (kind, dx, dz,
// speed, first), only when they change, so the flakes fall by kind even before weather-core passes them; (2) on a gust,
// near a player, sheds snow clumps off covered trees (plop fx + a soft thud when it lands). Numbers: SNOW.flakes.
import { SNOW } from './lib/data/snow.js';
import { depthAt, inHall } from './lib/snow-field.js';
const F = SNOW.flakes, CL = F.clump;
export const updateSchedule = { every: { seconds: 1 } };
let trees = null, lastGust = 0, shed = [], cool = {};
function wantParams(ctx, s) {
  const w = ctx.place.state.wind, y = (w?.toward ?? 0) * Math.PI / 180, q = (v) => Math.round(v * 10) / 10;
  const age = s.firstSnowAt ? ctx.now() - s.firstSnowAt : Infinity;
  const first = age >= 0 && age < F.first.ms ? Math.ceil((1 - age / F.first.ms) * F.first.steps) / F.first.steps : 0;
  return { kind: s.kind || 'powder', dx: w ? q(-Math.sin(y)) : 0, dz: w ? q(-Math.cos(y)) : 0,
    speed: Math.round((w?.speed ?? 0) / F.windStep) * F.windStep, first: Math.round(first * 100) / 100 };
}
function findTrees(ctx) {
  const out = [];
  for (const r of ctx.query({ tags: ['garden-tree'], radius: 600 })) {
    const o = ctx.getObject(r.id), pr = o?.primitive?.params || {};
    if (!o || o.parent) continue; // a child's feetPosition is local (the portal birches): skip
    out.push({ id: r.id, x: r.feetPosition.x, y: r.feetPosition.y, z: r.feetPosition.z, h: pr.height ?? 7, r: pr.spread ?? 2.5 });
  }
  for (const [x, z, h, r] of CL.trees) out.push({ id: `t${x},${z}`, x, z, y: ctx.place.terrain.heightAt(x, z) ?? 24, h, r });
  return out;
}
export function update(ctx) {
  const s = ctx.place.state.snow;
  if (!s?.on) { trees = null; ctx.sleep(F.offSleep); return; }
  const row = ctx.getObject('hearth-weather-snow');
  if (row?.fx) {
    const want = wantParams(ctx, s), cur = row.fx.params || {};
    if (Object.keys(want).some((k) => cur[k] !== want[k])) row.fx.params = { ...cur, ...want };
  }
  const w = ctx.place.state.wind, g = w?.gust ?? 0, rising = g >= CL.gustAt && lastGust < CL.gustAt;
  lastGust = g;
  if (!rising) return;
  const now = ctx.now();
  shed = shed.filter((t) => now - t < 60000);
  if (shed.length >= CL.perMin) return;
  if (!trees) trees = findTrees(ctx);
  const players = ctx.place.players, y = (w.toward ?? 0) * Math.PI / 180, dx = -Math.sin(y), dz = -Math.cos(y);
  const near = trees.filter((t) => !(now < (cool[t.id] ?? 0)) && !inHall(t.x, t.z) && depthAt(ctx, t.x, t.z) >= CL.minDepth &&
    players.some((p) => Math.hypot(p.feetPosition.x - t.x, p.feetPosition.z - t.z) < CL.range));
  for (let i = 0; i < CL.perGust && near.length && shed.length < CL.perMin; i++) {
    const t = near.splice(Math.floor(ctx.random() * near.length), 1)[0], ang = ctx.random() * 6.283, rr = t.r * (.3 + .5 * ctx.random());
    const hy = t.h * (CL.crown[0] + (CL.crown[1] - CL.crown[0]) * ctx.random());
    const pos = { x: t.x + Math.cos(ang) * rr, y: t.y + hy, z: t.z + Math.sin(ang) * rr };
    const amount = Math.min(1, .4 + depthAt(ctx, t.x, t.z) * 4);
    ctx.emit('fx', { position: pos, script: 'scripts/effects-snow-clump.fx.js', params: { amount, dx, dz } }, { audience: { nearby: pos, radius: CL.range } });
    ctx.after(Math.sqrt(2 * hy / CL.g), 'thud', { x: pos.x, y: t.y, z: pos.z, v: CL.volume * (.6 + .4 * amount) });
    cool[t.id] = now + CL.treeCooldownMs; shed.push(now);
  }
}
export function thud(ctx, p) {
  if (!ctx.place.state.snow?.on) return;
  ctx.emit('playSound', { clip: CL.clip, position: { x: p.x, y: p.y, z: p.z }, volume: p.v, pitch: .85 + .3 * ctx.random(), maxDistance: CL.maxDistance },
    { audience: { nearby: p, radius: CL.maxDistance } });
}
