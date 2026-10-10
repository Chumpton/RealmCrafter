// MAP TRAVEL (creator 2026-10-09): from the M map a zone offers Teleport (a black blink, body set on safe ground at the
// zone centre) or Gryphon flight: Wynx (scripts/lib/wynx-ride.js, the same mount double-tap space summons) carries her
// rider along a smooth route that climbs ~40 m over the terrain sampled along it, then lands at the zone. The ride itself
// is wynxStep's: this autopilot only writes the intent a rider's keys would (w.moveIntent, w.wynx.up), so the flight is
// the one Wynx system, camera and all. Runs on the rider's machine; route memory lives in the shared walk slot (w.route).
import { raycast } from 'builtin/physics';
import { summonWynx, dismountWynx, isWynx } from './lib/wynx-ride.js';
import { WYNX as W } from './lib/data/gryphon.js';
import { MAP_TRAVEL as T } from './lib/data/zones.js';

const walk = (ctx) => ((ctx.session.walk ??= {})[ctx.self.id] ??= {}); // scripts/player.js walkOf: the same slot wynxStep reads
const toast = (ctx, text) => ctx.emit('uiEvent', { name: 'toast', payload: { text } }, { audience: { player: ctx.self.id } });
const here = (me) => me.worldFeetPosition ?? me.feetPosition;

// a dry, level, open spot nearest the zone centre (rings outward); a roof or canopy over the column is skipped
export function safeSpot(ctx, x, z) {
  const H = (a, b) => ctx.place.terrain?.heightAt?.(a, b);
  for (let ring = 0; ring <= T.safeRings; ring++) {
    const n = ring ? 8 + ring * 2 : 1;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + ring * 0.37, r = ring * T.safeStep, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      const h = H(px, pz); if (h == null || h < T.dryAbove) continue;
      const nb = [H(px + 2, pz), H(px - 2, pz), H(px, pz + 2), H(px, pz - 2)];
      if (nb.some((v) => v == null || Math.abs(v - h) > T.maxStep)) continue;
      const hit = raycast(ctx, { x: px, y: h + 40, z: pz }, { x: 0, y: -1, z: 0 }, { distance: 60, physicsOnly: true, excludeTags: ['player', 'wynx'], ignoreEntities: [ctx.self.id] });
      if (hit && hit.position.y > h + 1.2) continue;
      return { x: px, y: Math.max(h, hit?.position.y ?? h) + 0.15, z: pz };
    }
  }
  return { x, y: (H(x, z) ?? 0) + 1.5, z };
}

export function teleportTo(ctx, me, q) {
  const w = walk(ctx);
  if (me.state.mount) { if (isWynx(ctx.getObject(me.state.mount))) { w.route = null; dismountWynx(ctx, w); } else { toast(ctx, 'Get off your mount first'); return false; } }
  else if (me.parent) { toast(ctx, 'Stand up first'); return false; }
  const to = safeSpot(ctx, q.x, q.z), f = here(me);
  me.state.tpBack = { x: f.x, y: f.y, z: f.z }; // Raven Roads' BACK reads it
  ctx.emit('screenFlash', { color: '#05060a', duration: T.fade, intensity: 1 }, { audience: { player: me.id } });
  me.velocity = { x: 0, y: 0, z: 0 };
  me.feetPosition = to;
  me.state.mapFly = null; me.state.worldMap = false;
  toast(ctx, `Teleported to ${q.name}`);
  return true;
}

// the route: a gentle quadratic bow from here to the zone, sampled every T.step m; altitude = terrain max nearby + clearance,
// smoothed, under a take-off and landing ramp, never below the ground under it
function route(ctx, S, E) {
  const H = (a, b) => Math.max(0, ctx.place.terrain?.heightAt?.(a, b) ?? 0);
  const dx = E.x - S.x, dz = E.z - S.z, D = Math.max(1, Math.hypot(dx, dz)), bow = Math.min(D * T.bow, T.bowMax);
  const C = { x: (S.x + E.x) / 2 - dz / D * bow, z: (S.z + E.z) / 2 + dx / D * bow };
  const n = Math.max(4, Math.ceil(D / T.step)), P = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; P.push({ x: a * S.x + b * C.x + c * E.x, z: a * S.z + b * C.z + c * E.z }); }
  const g = P.map((p) => Math.max(H(p.x, p.z), H(p.x + 12, p.z), H(p.x - 12, p.z), H(p.x, p.z + 12), H(p.x, p.z - 12)));
  const win = Math.ceil(T.look / T.step);
  let cr = g.map((_, i) => { let m = 0; for (let j = Math.max(0, i - win); j <= Math.min(n, i + win); j++) m = Math.max(m, g[j]); return m + T.clear; });
  for (let pass = 0; pass < 2; pass++) cr = cr.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 2); j <= Math.min(n, i + 2); j++) { s += cr[j]; c++; } return Math.max(s / c, g[i] + T.clear * 0.75); });
  let len = 0;
  P.forEach((p, i) => { if (i) len += Math.hypot(p.x - P[i - 1].x, p.z - P[i - 1].z); p.s = len; });
  P.forEach((p, i) => { const ramp = Math.min(S.y + 2 + p.s * T.climbK, E.y + (len - p.s) * T.descK); p.y = Math.max(Math.min(cr[i], ramp), H(p.x, p.z) + 3); });
  P[0].y = Math.max(P[0].y, S.y); P[n].y = E.y;
  return { pts: P, len };
}
function at(R, s) {
  const P = R.pts; s = Math.max(0, Math.min(R.len, s));
  let i = R.i ?? 0; while (i < P.length - 2 && P[i + 1].s < s) i++; while (i > 0 && P[i].s > s) i--; R.i = i;
  const a = P[i], b = P[i + 1] ?? a, t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

export function flyTo(ctx, me, q) {
  const w = walk(ctx);
  let h = me.state.mount ? ctx.getObject(me.state.mount) : null;
  if (h && !isWynx(h)) { toast(ctx, 'Get off your mount first'); return false; }
  if (!h) {
    if (me.parent) { toast(ctx, 'Stand up first'); return false; }
    if (!summonWynx(ctx, w)) { toast(ctx, 'Wynx cannot reach you here'); return false; }
    w.wynxOnAt = ctx.now(); h = ctx.getObject(me.state.mount);
  }
  if (!h) return false;
  const S = h.worldFeetPosition ?? h.feetPosition, E = safeSpot(ctx, q.x, q.z), r = route(ctx, S, E);
  const speed = Math.max(T.speed, r.len / T.maxSeconds);
  w.route = { ...r, s: 0, i: 0, speed, end: E, to: q.name };
  if (w.wynx) { w.wynx.fly = true; w.wynx.air = 1; w.wynx.vy = Math.max(w.wynx.vy ?? 0, 6); }
  me.state.mapFly = { to: q.name, at: ctx.now(), secs: Math.round(r.len / speed) };
  me.state.worldMap = false;
  ctx.emit('playSound', { clip: W.sounds.screech, position: S, volume: 0.8, maxDistance: 80 });
  toast(ctx, `Wynx takes you to ${q.name} · E to leap off`);
  return true;
}

// each tick on the rider's machine (board-input onInput with dt 0, update with dt): steer Wynx along the route
export function flightTick(ctx, dt) {
  const me = ctx.self, w = (ctx.session.walk ?? {})[me.id], R = w?.route;
  if (!R) { if (me.state.mapFly && dt) me.state.mapFly = null; return; }
  const h = me.state.mount ? ctx.getObject(me.state.mount) : null, r = w.wynx;
  if (!h || !isWynx(h) || !r) { w.route = null; me.state.mapFly = null; return; } // leapt off (E) or she is gone
  const p = h.worldFeetPosition ?? h.feetPosition;
  if (dt) { const lag = Math.hypot(at(R, R.s).x - p.x, at(R, R.s).z - p.z); R.s = Math.min(R.len, R.s + R.speed * dt * (lag > 30 ? 0.3 : 1)); }
  const lead = R.speed * T.leadS, tg = at(R, R.s + lead), hd = Math.hypot(R.end.x - p.x, R.end.z - p.z);
  const done = R.s >= R.len - 0.5 && (hd < 3 || p.y - R.end.y < 0.6);
  if (done || (!r.fly && R.s > R.len * 0.8 && hd < 25)) {
    w.moveIntent = { x: 0, z: 0 }; r.up = 0; r.vx = 0; r.vz = 0; w.route = null; me.state.mapFly = null;
    ctx.emit('playSound', { clip: W.sounds.land, position: p, volume: 0.7, maxDistance: 40 });
    dismountWynx(ctx, w); toast(ctx, `Landed at ${R.to}`);
    return;
  }
  const k = 1 / T.leadS;
  let vx = (tg.x - p.x) * k, vz = (tg.z - p.z) * k; const hs = Math.hypot(vx, vz), cap = R.speed * 1.35;
  if (hs > cap) { vx *= cap / hs; vz *= cap / hs; }
  w.moveIntent = { x: vx, z: vz };
  r.fly = true; r.air = 1; r.sprint = false;
  r.up = Math.max(-3, Math.min(3, (tg.y - p.y) * k / W.climb));
}
