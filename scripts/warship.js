// A warship you sail: a kinematic hull (the deck carries whoever stands on it). The helmsman's machine sails her:
// hull.controller = the player who took the wheel, so onInput and update() run there. W/S trims the sail
// (ahead / backing oars), A/D the rudder (the wheel turns with it), E lets go. With no one at the helm she loses way and lies still.
// Any size: the hull's scale s (the great drakkars are 2.1) scales her length, draft and footing, turns her slower (÷ √s) and
// a little faster. The crew are her children: the rowers pull with the way she has on (clip speed ∝ |v|), still at rest; the
// lookout sweeps the sea. This one update drives them all: a clip write when the stroke band changes, state.stroke every few ticks.
// Numbers: scripts/lib/data/warship.js. Children: <id>/helm (the wheel), <id>/sail, <id>/bow, <id>/wake, <id>/look, <id>/row-N.
import { raycast } from 'builtin/physics';
import { play, stop } from 'builtin/anim';
import { WS, CREW, rowClip, LOOK_CLIP, VOYAGE } from './lib/data/warship.js';
const mem = {};
const M = (id) => (mem[id] ??= { thr: 0, steer: 0, v: 0, roll: 0, hudAt: 0, band: -1, wh: 0, whW: 0, rowQ: -1, ph: 0, tk: 0 });
const RAD = Math.PI / 180;
const CLIPS = { 1: rowClip(1), [-1]: rowClip(-1) };
const toWorld = (p, yaw, l) => { const c = Math.cos(yaw * RAD), s = Math.sin(yaw * RAD); return { x: p.x + l.x * c + l.z * s, y: (p.y ?? 0) + l.y, z: p.z - l.x * s + l.z * c }; };
const yawOf = (h) => { const r = h.rotation; if (typeof r === 'number') return r; if (r && 'w' in r) return Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) / RAD; return r?.yaw ?? 0; };
export const scaleOf = (h) => { const s = h?.scale; const v = typeof s === 'number' ? s : s?.x; return v > 0 ? v : 1; };
const sl = (l, s) => ({ x: l.x * s, y: l.y * s, z: l.z * s });
const standAt = (s) => ({ x: WS.stand.x, y: WS.stand.y, z: WS.helm.z + WS.stand.back / s }); // hull-local: the wheel's aft side, a stride back
const SPRAY = `fx
pop spray rate=%r|0 on=disc(.5) life=.5..0.9 v=up(1.2..2.4)+sdir()*(.8..1.8) size=.1..0.22 acc=grav()*.9+drag(1.2) col=<.93,.97,.99> a=.85>.6:.6>0 sz=$size*(.6>1.7) r=sprite(smoke-puff,alpha)
pop foam rate=%f|0 on=disc(.9) life=3..5 v=<0,0,0> size=.5..0.9 col=<.9,.95,.96> a=0>.1:.4>.6:.25>0 sz=$size*(.8>2.4) r=sprite(soft-disc,alpha)`;

function child(ctx, k) { return ctx.getObject(`${ctx.self.id}/${k}`); }
function setSail(ctx, up) {
  const s = ctx.self.state; if (!!s.sailSet === up) return; s.sailSet = up;
  const sail = child(ctx, 'sail'); if (sail) { sail.primitive = { ...sail.primitive, params: { ...(sail.primitive?.params ?? {}), mode: up ? 'set' : 'furled' } }; spawnKeepFlatCentre(sail); }
  ctx.emit('playSound', { clip: up ? WS.sounds.unfurl : WS.sounds.furl, position: toWorld(ctx.self.feetPosition, yawOf(ctx.self), sl({ x: 0, y: 5, z: .5 }, scaleOf(ctx.self))), volume: .55, maxDistance: 40 });
}
function setWash(ctx, v) {
  const a = Math.abs(v), band = a < .6 ? 0 : a < 3 ? 1 : a < 5.5 ? 2 : 3; const m = M(ctx.self.id); if (band === m.band) return; m.band = band;
  const r = [0, 10, 28, 50][band], f = [0, 3, 8, 14][band];
  for (const k of ['bow', 'wake']) { const o = child(ctx, k); if (o) o.fx = band ? { script: SPRAY, params: { r: k === 'bow' ? r : r * .3, f } } : null; }
  ctx.self.audio = band ? { clip: WS.sounds.rush, loop: true, gain: [0, .12, .2, .28][band], spatial: true, maxDistance: 45 } : null;
}
// the crew's stroke: q = clip speed (0 = shipped oars, still); written only when the band moves
function setRow(ctx, q) {
  const m = M(ctx.self.id); if (q === m.rowQ) return; m.rowQ = q;
  const n = ctx.self.state.rowers ?? 0;
  for (let i = 1; i <= n; i++) {
    const r = child(ctx, 'row-' + i); if (!r) continue;
    if (q > 0) play(ctx, r, CLIPS[(r.state?.side ?? 1) >= 0 ? 1 : -1], { channel: 'row', loop: true, speed: q, blendIn: .4 });
    else stop(ctx, r, 'row');
  }
}
function setWheel(ctx, dt) {
  const m = M(ctx.self.id); m.wh += (-m.steer * WS.wheel - m.wh) * Math.min(1, WS.wheelRate * dt);
  if (Math.abs(m.wh - m.whW) < 2 && !(m.steer === 0 && Math.abs(m.wh) < 2 && m.whW !== 0)) return;
  if (m.steer === 0 && Math.abs(m.wh) < 2) m.wh = 0;
  const h = child(ctx, 'helm'); if (h?.bones?.wheel) { h.bones.wheel.roll = Math.round(m.wh); m.whW = m.wh; }
}

// ── auto-voyage (VOYAGE rows): s.vy = { ph: rest|out|sea|pivot|back, leg, due } written on phase changes only ──
const wrapA = (a) => ((a % 360) + 540) % 360 - 180;
function steerHand(ctx, on) { const h = child(ctx, 'steer'); if (h && h.visible !== on) h.visible = on; }
function vyPts(V) { return [...V.route, V.lane]; }
function nearestLeg(V, p) { const pts = vyPts(V); let b = 0, bd = 1e9; pts.forEach((q, i) => { const d = Math.hypot(q[0] - p.x, q[1] - p.z); if (d < bd) { bd = d; b = i; } }); return b; }
function castOff(ctx) { const s = ctx.self.state; s.vy = { ph: 'out', leg: 0 }; setSail(ctx, false); steerHand(ctx, true); }
function moor(ctx, V) {
  const s = ctx.self.state, m = M(ctx.self.id); m.v = 0; m.yaw = s.home.yaw; m.steer = 0;
  ctx.self.feetPosition = { x: s.home.x, y: 0, z: s.home.z }; ctx.self.rotation = { yaw: s.home.yaw, pitch: 0, roll: 0 };
  setSail(ctx, false); setWash(ctx, 0); setRow(ctx, 0); s.kn = 0;
  s.vy = { ph: 'rest', due: ctx.now() + V.rest * 1000 };
}
function autoStep(ctx, dt, V, sc, vmax) {
  const self = ctx.self, s = self.state, m = M(self.id), vy = s.vy, p = self.feetPosition, home = s.home;
  const lane = { x: V.lane[0], z: V.lane[1] };
  let vT = VOYAGE.harbor, yawT = home.yaw, slide = null, sail = false;
  if (vy.ph === 'out') {
    const d = Math.hypot(lane.x - p.x, lane.z - p.z); slide = lane;
    if (d < 1) { s.vy = { ph: 'sea', leg: 0 }; }
  } else if (vy.ph === 'sea') {
    const pts = vyPts(V), last = vy.leg >= pts.length - 1, g = pts[Math.min(vy.leg, pts.length - 1)];
    const dx = g[0] - p.x, dz = g[1] - p.z, d = Math.hypot(dx, dz);
    yawT = Math.atan2(-dx, -dz) / RAD;
    const off = Math.hypot(p.x - lane.x, p.z - lane.z) > VOYAGE.slowR, sharp = Math.abs(wrapA(yawT - m.yaw)) > 70;
    sail = off && !last; vT = sail && !sharp ? vmax * VOYAGE.sea : VOYAGE.harbor;
    if (last) { vT = Math.min(vT, Math.max(.8, d * .12)); const ahead = -Math.sin(m.yaw * RAD) * dx - Math.cos(m.yaw * RAD) * dz; if (d < 3 || (d < 14 && ahead < 0)) s.vy = { ph: 'pivot' }; }
    else if (d < VOYAGE.arrive) s.vy = { ph: 'sea', leg: vy.leg + 1 };
  } else if (vy.ph === 'pivot') {
    vT = 0; slide = lane;
    if (Math.abs(wrapA(home.yaw - m.yaw)) < .5 && Math.hypot(lane.x - p.x, lane.z - p.z) < .6) s.vy = { ph: 'back' };
  } else if (vy.ph === 'back') {
    const d = Math.hypot(home.x - p.x, home.z - p.z); slide = home; vT = -Math.min(VOYAGE.back, Math.max(.35, d * .15));
    if (d < .3) return moor(ctx, V);
  }
  setSail(ctx, sail);
  // speed and heading, eased; the wheel shows the turn
  const dv = vT - m.v, rate = (Math.abs(vT) > Math.abs(m.v) ? WS.accel : WS.decel) * dt; m.v += Math.abs(dv) > rate ? Math.sign(dv) * rate : dv;
  const turn = (vy.ph === 'sea' ? VOYAGE.turn / Math.sqrt(sc) : VOYAGE.pivot) * dt, diff = wrapA(yawT - m.yaw);
  m.yaw += Math.max(-turn, Math.min(turn, diff));
  m.steer = Math.max(-1, Math.min(1, -diff / 25));
  let nx, nz;
  if (slide) { // the harbor legs slide along a straight line (oars crab her), holding the berth's heading
    const dx = slide.x - p.x, dz = slide.z - p.z, d = Math.hypot(dx, dz), sp = vy.ph === 'pivot' ? Math.min(1, d) : Math.abs(m.v), st = Math.min(d, sp * dt);
    nx = p.x + (d ? dx / d * st : 0); nz = p.z + (d ? dz / d * st : 0);
  } else { const r = m.yaw * RAD; nx = p.x - Math.sin(r) * m.v * dt; nz = p.z - Math.cos(r) * m.v * dt; }
  const t = ctx.now() / 1000, sway = Math.min(1, Math.abs(m.v) / 3 + .35);
  m.roll += (Math.max(-WS.maxLean, Math.min(WS.maxLean, -diff * .05 * Math.abs(m.v) * WS.lean)) - m.roll) * Math.min(1, 2 * dt);
  self.feetPosition = { x: nx, y: WS.bob * sc * Math.sin(t * 1.1 + nx * .1) * sway, z: nz };
  self.rotation = { yaw: m.yaw, pitch: WS.pitch * Math.sin(t * .8) * sway, roll: m.roll + .6 * Math.sin(t * .6) * sway };
  const work = vy.ph === 'pivot' ? 1.2 : Math.abs(m.v);
  setWash(ctx, m.v);
  const q = s.sailSet || work < .3 ? 0 : Math.max(.5, Math.min(1.3, Math.round(work / VOYAGE.harbor * 10) / 10));
  setRow(ctx, q);
  if (q > 0) { m.ph += dt * q / CREW.cycle; if (++m.tk % WS.crewEvery === 0) s.stroke = Math.round(m.ph * 100) / 100; }
  if (t - m.hudAt > 1 / WS.hud) { m.hudAt = t; const kn = Math.round(Math.abs(m.v) * 1.94); if (s.kn !== kn) s.kn = kn; }
}

export function onSpawn(ctx) {
  const s = ctx.self.state, p = ctx.self.feetPosition;
  if (!s.home) s.home = { x: p.x, z: p.z, yaw: yawOf(ctx.self) };
  const m = M(ctx.self.id); m.v = 0; m.yaw = yawOf(ctx.self); m.band = -1; m.rowQ = -1;
  if (!ctx.self.controller) { s.sailSet = true; setSail(ctx, false); s.helm = null; s.kn = 0; }
  const look = child(ctx, 'look'); if (look && !look.anim?.look) play(ctx, look, LOOK_CLIP, { channel: 'look', loop: true, speed: .8 + (ctx.random() * .4) });
}
export function onControlBegin(ctx, player) {
  const s = ctx.self.state, m = M(ctx.self.id), sc = scaleOf(ctx.self); m.yaw = yawOf(ctx.self); m.v = (s.kn ?? 0) / 1.94;
  if (s.homeTimer) { ctx.cancel(s.homeTimer); s.homeTimer = null; }
  if (VOYAGE.ships[ctx.self.id]) { s.vy = { ph: 'held' }; steerHand(ctx, false); }
  M(ctx.self.id).takenAt = ctx.now(); s.helm = player.id; s.helmName = player.displayName ?? 'someone';
  player.parent = ctx.self.id; player.feetPosition = standAt(sc); player.rotation = { yaw: 0 };
  if (sc !== 1) player.scale = 1 / sc; // a great hull's scale would ride onto the body: undone at the rail
  ctx.emit('playSound', { clip: WS.sounds.helm, position: toWorld(ctx.self.feetPosition, m.yaw, sl(standAt(sc), sc)), volume: .5, maxDistance: 15 });
  ctx.emit('toast', { message: `${s.name ?? 'the ship'} is yours · W/S sail · A/D steer · E let go`, duration: 3 }, { audience: { player: player.id } });
}
export function onControlEnd(ctx, player) {
  const s = ctx.self.state, m = M(ctx.self.id), sc = scaleOf(ctx.self); m.thr = 0; m.steer = 0; s.helm = null; s.helmName = null;
  setSail(ctx, false);
  const V = VOYAGE.ships[ctx.self.id], p = ctx.self.feetPosition;
  if (V && s.home) { // a voyager picks her voyage back up: home if she is near it, else the nearest waypoint
    s.vy = Math.hypot(p.x - s.home.x, p.z - s.home.z) < 25 ? { ph: 'back' } : { ph: 'sea', leg: nearestLeg(V, p) }; steerHand(ctx, true);
  } else { if (s.homeTimer) ctx.cancel(s.homeTimer); s.homeTimer = ctx.after(WS.homeAfter, 'homeward'); }
  const body = ctx.getObject(player.id);
  if (body && (body.parent?.id ?? body.parent) === ctx.self.id) { body.parent = null; body.feetPosition = toWorld(ctx.self.feetPosition, yawOf(ctx.self), sl(WS.stepOff, sc)); }
  if (body && sc !== 1) body.scale = 1;
}
// left unmanned long enough, she is found back at her berth (sail furled, still)
export function homeward(ctx) {
  const s = ctx.self.state; s.homeTimer = null; if (ctx.self.controller || !s.home) return;
  const m = M(ctx.self.id); m.v = 0; m.yaw = s.home.yaw; m.band = -1; setWash(ctx, 0); setRow(ctx, 0);
  ctx.self.feetPosition = { x: s.home.x, y: 0, z: s.home.z }; ctx.self.rotation = { yaw: s.home.yaw, pitch: 0, roll: 0 }; s.kn = 0;
}
export function onInput(ctx, input) {
  const m = M(ctx.self.id);
  m.thr = Math.max(-1, Math.min(1, input.axes.moveZ ?? 0)); m.steer = Math.max(-1, Math.min(1, input.axes.moveX ?? 0));
  if (m.thr > .1) setSail(ctx, true);
  if ((input.pressed.interact || input.pressed.use) && ctx.now() - (m.takenAt ?? 0) > 700) ctx.self.controller = null; // the E that took the helm never lets it go
}
export function update(ctx, dt) {
  const self = ctx.self, s = self.state, m = M(self.id), driven = !!self.controller, sc = scaleOf(self);
  const half = WS.half * sc, draft = WS.draft * sc, vmax = WS.max * (1 + WS.maxPerScale * (sc - 1));
  m.yaw ??= yawOf(self);
  const V = !driven && VOYAGE.ships[self.id];
  if (V && s.home) { // a voyager: asleep at her berth until due, else her own pilot
    const vy = s.vy ?? (s.vy = { ph: 'rest', due: ctx.now() + V.first * 1000 });
    if (vy.ph === 'held' || !vy.ph) { // a row with no phase (a stray write) never sails blind: rest at the berth or rejoin the route
      const p = self.feetPosition, atHome = Math.hypot(p.x - s.home.x, p.z - s.home.z) < 2;
      s.vy = atHome && !vy.ph ? { ph: 'rest', due: vy.due ?? ctx.now() } : { ph: 'sea', leg: nearestLeg(V, p) };
      if (s.vy.ph === 'sea') { setSail(ctx, false); steerHand(ctx, true); }
      return;
    }
    if (vy.ph === 'rest') { const due = vy.due ?? 0; if (ctx.now() < due) { if (m.v) { moor(ctx, V); s.vy = { ph: 'rest', due }; } return ctx.sleep(Math.min(60, (due - ctx.now()) / 1000)); } castOff(ctx); }
    setWheel(ctx, dt); return autoStep(ctx, dt, V, sc, vmax);
  }
  if (!driven) { m.thr = 0; m.steer = 0; }
  setWheel(ctx, dt);
  const target = m.thr >= 0 ? m.thr * vmax : m.thr * WS.rev;
  const gaining = Math.abs(target) > Math.abs(m.v) && Math.sign(target || 1) === Math.sign(m.v || target);
  const rate = (gaining ? WS.accel : WS.decel) * dt, d = target - m.v;
  m.v += Math.abs(d) > rate ? Math.sign(d) * rate : d;
  if (!driven && Math.abs(m.v) < .05) {
    m.v = 0; setWash(ctx, 0); setRow(ctx, 0);
    const p = self.feetPosition; self.feetPosition = { x: p.x, y: 0, z: p.z }; self.rotation = { yaw: m.yaw, pitch: 0, roll: 0 };
    if (s.kn) s.kn = 0; s.yaw = Math.round(m.yaw); if (m.whW === 0) ctx.sleep(); return;
  }
  const bite = Math.max(WS.turnMin, Math.min(1, Math.abs(m.v) / WS.turnFull)) * (m.v < -.05 ? -1 : 1);
  m.yaw -= m.steer * WS.turn / Math.sqrt(sc) * bite * dt;
  const r = m.yaw * RAD, fx = -Math.sin(r), fz = -Math.cos(r), dir = m.v >= 0 ? 1 : -1, p = self.feetPosition;
  let step = m.v * dt;
  // what's ahead: ground too shallow under the bow, or a pier, a rock, another hull
  const reach = half + .6 + Math.abs(step);
  const tip = { x: p.x + fx * dir * reach, z: p.z + fz * dir * reach };
  const ground = ctx.place.terrain?.heightAt?.(tip.x, tip.z);
  const hit = raycast(ctx, { x: p.x, y: .6, z: p.z }, { x: fx * dir, y: 0, z: fz * dir }, { distance: reach, physicsOnly: true, bodies: 'all', excludeTags: ['player'], ignoreEntities: [self.id] });
  if ((ground != null && ground > -draft) || hit) {
    if (Math.abs(m.v) > 1.2) { ctx.emit('playSound', { clip: WS.sounds.bump, position: { x: tip.x, y: .5, z: tip.z }, volume: Math.min(1, Math.abs(m.v) / 5), maxDistance: 40 }); if (self.controller) ctx.emit('screenShake', { intensity: Math.min(.5, Math.abs(m.v) / 12), duration: .35 }, { audience: { player: self.controller } }); }
    m.v = -m.v * .15; step = 0;
  }
  const t = ctx.now() / 1000, sway = Math.min(1, Math.abs(m.v) / 3 + .35);
  m.roll += (Math.max(-WS.maxLean, Math.min(WS.maxLean, m.steer * m.v * WS.lean)) - m.roll) * Math.min(1, 2 * dt);
  self.feetPosition = { x: p.x + fx * step, y: WS.bob * sc * Math.sin(t * 1.1 + p.x * .1) * sway, z: p.z + fz * step };
  self.rotation = { yaw: m.yaw, pitch: WS.pitch * Math.sin(t * .8) * sway, roll: m.roll + .6 * Math.sin(t * .6) * sway };
  setWash(ctx, m.v);
  // the crew: the stroke quickens with the way she has on; stilled oars below a crawl
  const av = Math.abs(m.v), q = av < .4 ? 0 : Math.max(.4, Math.min(1.4, Math.round(av / vmax * 13) / 10));
  setRow(ctx, q);
  if (q > 0) { m.ph += dt * q / CREW.cycle; if (++m.tk % WS.crewEvery === 0) s.stroke = Math.round(m.ph * 100) / 100; }
  if (t - m.hudAt > 1 / WS.hud) { m.hudAt = t; const kn = Math.round(av * 1.94); if (s.kn !== kn) s.kn = kn; const hd = (Math.round(((-m.yaw % 360) + 360) % 360)); if (Math.abs((s.hdg ?? 0) - hd) >= 3) s.hdg = hd; }
}


/** A plane, circle, ring or torus stands by its centre here: "center" for those four kinds, nothing for any other. */
function spawnFlatCentre(primitive) {
  const kind = typeof primitive === "string" ? primitive : primitive != null ? primitive.kind : undefined;
  return kind === "plane" || kind === "circle" || kind === "ring" || kind === "torus" ? "center" : undefined;
}

/** A part whose shape is decided as the line runs stands the same way: anchor and pivot "center" on a plane, circle, ring or torus that names neither. */
function spawnKeepFlatCentre(part) {
  if (part != null && spawnFlatCentre(part.primitive) !== undefined) {
    if (part.anchor == null) part.anchor = "center";
    if (part.pivot == null) part.pivot = "center";
  }
  return part;
}

/** Writes a part's primitive and keeps it standing the same way when the new shape is a plane, circle, ring or torus: the value written. */
function spawnSetPrimitive(part, primitive) {
  part.primitive = primitive;
  spawnKeepFlatCentre(part);
  return primitive;
}
