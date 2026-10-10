// The door shovel (lane W5, S8b). One script, two roles:
//  - on the shovel row by the main door (tag snow-shovel): E takes it off its peg (a session copy rides the presser's body,
//    this row hides), E again hangs it back; a holder who leaves gets it hung back. Mirrors rolf-guitar-borrow-core.js,
//    but the holder's mark is player.state.shovel (never state.holding: that one routes left click to the lyre/guitar hands).
//  - pushed onto the holder's body while held: hold left mouse (dig / strum) to scoop the snow in front into the blade (a
//    visible heap), release to throw it where you look: a packed pile you can stack into a wall or a fort. Snow off, or bare
//    ground: the iron edge just scrapes. Every field write is snow-field dab(); a dig session (quiet SNOW.shovel.sessionGapS)
//    ends with one emit('snow:dug', { x, z, load }) for the folk and JEV (lane W4) to hear; no llm here.
// Numbers: SNOW.shovel (scripts/lib/data/snow.js). The peg row does nothing but sleep until pressed.
import { heap as HEAP } from '../templates/snow-shovel.js';
import { SNOW } from './lib/data/snow.js';
import { depthAt, dab, inHall } from './lib/snow-field.js';
const SH = SNOW.shovel;
const isPlayer = (ctx) => (ctx.self.tags || []).includes('player');
const pos = (o) => o.worldFeetPosition ?? o.feetPosition;
const sound = (ctx, clip, at, vol = 1) => ctx.emit('playSound', { clip, position: at, volume: SH.sounds.volume * vol, maxDistance: SH.sounds.maxDistance }, { audience: { nearby: at, radius: SH.sounds.maxDistance } });
const here = (ctx, id) => !!id && (ctx.world.players || []).some((q) => q.id === id) && !!ctx.getObject(id);
const behaviors = (o) => { const b = o.behavior; return Array.isArray(b) ? [...b] : b ? [b] : []; };

// ---------- the row on the peg ----------
export const updateSchedule = { every: { seconds: 5 } };
function release(ctx, p) {
  const s = ctx.self.state;
  if (s.heldId && ctx.getObject(s.heldId)) ctx.destroy(s.heldId);
  if (p) {
    if (p.state && (!s.heldId || p.state.shovel === s.heldId)) p.state.shovel = null;
    const b = behaviors(p); if (b.includes('scripts/snow-shovel.js')) p.behavior = b.filter((x) => x !== 'scripts/snow-shovel.js');
  }
  s.holder = null; s.heldId = null; s.at = ctx.now();
  ctx.self.visible = true;
}
function take(ctx, p) {
  const s = ctx.self.state;
  const heldId = ctx.spawn(spawnKeepFlatCentre({
    parent: p.id, scope: 'session', tags: ['carried', 'snow-shovel-held'],
    primitive: ctx.self.primitive ?? { kind: 'scripted', script: 'scripts/gen/snow-shovel.js', params: { part: 'shovel' } }, material: { pbr: true },
    feetPosition: { ...SH.held.feet }, rotation: { ...SH.held.rotation }, visibleInFirstPerson: true, castShadow: true, physics: 'none',
    state: { from: ctx.self.id, kind: 'shovel', load: 0 },
    children: [{ ...HEAP, id: 'heap', feetPosition: { ...SH.heapAt.feet }, rotation: { ...SH.heapAt.rotation }, scale: 0.3, visible: false }],
  }));
  s.holder = p.id; s.heldId = heldId; s.at = ctx.now();
  ctx.self.visible = false;
  p.state.shovel = heldId;
  const b = behaviors(p); if (!b.includes('scripts/snow-shovel.js')) p.behavior = [...b, 'scripts/snow-shovel.js'];
  sound(ctx, SH.sounds.take, pos(ctx.self));
}
export const ears = {
  press: (ctx, { by } = {}) => {
    if (isPlayer(ctx)) return;
    const p = by && ctx.getObject(by); if (!p || !p.tags?.includes?.('player')) return;
    const s = ctx.self.state;
    if (ctx.now() - (s.at ?? 0) < SH.pressGapMs) return; // E from the hands and E on the row in one press: one act
    if (s.holder === by) { release(ctx, p); sound(ctx, SH.sounds.set, pos(ctx.self)); return; }
    if (s.holder && here(ctx, s.holder)) { ctx.emit('toast', { message: SH.lines.taken, duration: 3 }, { audience: { player: by } }); return; }
    if (s.holder) release(ctx, ctx.getObject(s.holder));
    if (p.state?.holding || p.state?.shovel) return; // hands full
    take(ctx, p);
  },
};

// ---------- the holder's hands ----------
function scratch(ctx) { return ((ctx.session.snowShovel ??= {})[ctx.self.id] ??= { digging: false, next: 0, load: 0, scoops: 0, scraped: false, sess: null }); }
function forward(me) {
  const r = me.rotation || {}, yaw = (typeof r === 'number' ? r : r.w != null ? 2 * Math.atan2(r.y, r.w) * 180 / Math.PI : r.yaw ?? 0) * Math.PI / 180;
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
function aimPoint(ctx, me) { // where you look, on the ground: the camera's pitch sets the throw's reach
  const f = pos(me);
  let dir = null;
  try { const v = ctx.view?.camera; if (v?.eye && v?.aim) { const d = { x: v.aim.x - v.eye.x, y: v.aim.y - v.eye.y, z: v.aim.z - v.eye.z }, l = Math.hypot(d.x, d.y, d.z) || 1; dir = { x: d.x / l, y: d.y / l, z: d.z / l }; } } catch (e) { dir = null; }
  if (!dir) {
    const cr = me.camera?.rotation; let yaw = null, pitch = null;
    if (cr && cr.w == null && cr.yaw != null) { yaw = cr.yaw; pitch = cr.pitch ?? 0; }
    const fw = forward(me);
    if (yaw == null) { yaw = Math.atan2(-fw.x, -fw.z) * 180 / Math.PI; pitch = -25; }
    const a = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
    dir = { x: -Math.sin(a) * Math.cos(p), y: Math.sin(p), z: -Math.cos(a) * Math.cos(p) };
  }
  const h = Math.hypot(dir.x, dir.z) || 1;
  const dist = dir.y < -0.02 ? Math.min(SH.throwMax, Math.max(SH.throwMin, SH.eye * h / -dir.y)) : SH.throwMax;
  return { x: f.x + dir.x / h * dist, z: f.z + dir.z / h * dist };
}
function showHeap(ctx, me, sc) {
  const H = ctx.getObject(me.state.shovel + '/heap'); if (!H) return;
  const k = sc.scoops / SH.maxScoops;
  if (!!H.visible !== sc.load > 0) H.visible = sc.load > 0;
  if (sc.load > 0) H.scale = { x: SH.heapAt.max * (0.45 + 0.55 * k), y: SH.heapAt.max * (0.3 + 0.7 * k), z: SH.heapAt.max * (0.45 + 0.55 * k) };
}
function scrape(ctx, me, sc) { if (sc.scraped) return; sc.scraped = true; sound(ctx, SH.sounds.scrape, pos(me), 0.8); }
function scoop(ctx, me, sc) {
  const sn = ctx.place.state.snow, f = pos(me), fw = forward(me), bite = Math.min(SH.bite, SH.reach);
  const x = f.x + fw.x * bite, z = f.z + fw.z * bite;
  if (!sn?.on || inHall(x, z) || inHall(f.x, f.z)) return scrape(ctx, me, sc);
  if (sc.scoops >= SH.maxScoops) return; // blade full: throw it
  const wet = sn.kind === 'wet' || (sn.wet ?? 0) > 0.5;
  const take = Math.min(depthAt(ctx, x, z), SH.scoop * (wet ? SH.wetMul : 1));
  if (!(take >= SH.minTake)) return scrape(ctx, me, sc);
  dab(ctx, x, z, -take, SH.radius, { pack: 0 });
  sc.load += take; sc.scoops += 1; sc.scraped = false;
  showHeap(ctx, me, sc);
  const at = { x, y: f.y + 0.1, z };
  sound(ctx, SH.sounds.scoop, at, 0.7 + 0.3 * ctx.random());
  if (me.isLocal !== false) ctx.emit('cameraPunch', { direction: { x: 0, y: -1, z: 0 }, intensity: SH.punch }, { audience: { player: me.id } });
  ctx.emit('squash', { target: me.state.shovel, axis: 'y', intensity: 0.05, duration: 0.15 });
}
function toss(ctx, me, sc) {
  const load = sc.load; sc.load = 0; sc.scoops = 0; sc.scraped = false; showHeap(ctx, me, sc);
  if (!(load > 0)) return;
  const t = aimPoint(ctx, me);
  if (inHall(t.x, t.z)) { ctx.emit('toast', { message: SH.lines.hall, duration: 2.5 }, { audience: { player: me.id } }); return; }
  ctx.emit('squash', { target: me.state.shovel, axis: 'z', intensity: 0.08, duration: 0.2 });
  ctx.after(SH.flight, 'shovelLand', { x: t.x, z: t.z, load });
}
const PUFF = `fx
pop puff burst=14..20 on=disc(%r|0.4) life=.6..1.1 v=up(.6..1.4)+sdir()*(.5..1.1) size=.14..0.26 acc=grav()*.25+drag(2.2) col=<.95,.97,1> a=0>.1:.8>.6:.4>0 sz=$size*(.6>1.8) rot=spin(.3) r=sprite(smoke-puff,alpha)
pop flecks burst=10..16 on=disc(%r|0.4) life=.4..0.8 v=up(1.2..2.2)+sdir()*(.6..1.2) size=.03..0.06 acc=grav()*.8+drag(.8) col=<1,1,1> a=1>.7:1>0 sz=$size floor=die r=sprite(soft-disc,alpha)`;
export function shovelLand(ctx, p) {
  if (!p || !(p.load > 0)) return;
  const me = ctx.self, sn = ctx.place.state.snow; if (!sn?.on || inHall(p.x, p.z)) return;
  const k = (SH.radius / SH.pileRadius) ** 2; // the blade's load spread over the pile's disc
  dab(ctx, p.x, p.z, p.load * k * 1.6, SH.pileRadius, { pack: SH.pilePack });
  const g = ctx.place.terrain?.heightAt?.(p.x, p.z) ?? pos(me).y, at = { x: p.x, y: g + depthAt(ctx, p.x, p.z) + 0.05, z: p.z };
  sound(ctx, SH.sounds.whump, at);
  ctx.emit('fx', { position: at, script: PUFF, params: { r: SH.pileRadius } }, { audience: { nearby: at, radius: SNOW.budget.fxRange } });
  const sc = scratch(ctx), S = (sc.sess ??= { n: 0, load: 0, x: 0, z: 0, token: 0 });
  S.n += 1; S.load += p.load; S.x = p.x; S.z = p.z; S.token += 1;
  ctx.after(SH.sessionGapS, 'shovelSessionEnd', { token: S.token });
}
export function shovelSessionEnd(ctx, p) {
  const sc = scratch(ctx), S = sc.sess; if (!S || S.token !== p?.token) return;
  sc.sess = null;
  ctx.emit('snow:dug', { x: +S.x.toFixed(2), z: +S.z.toFixed(2), load: +S.load.toFixed(3), throws: S.n, by: ctx.self.id });
}
export function onInput(ctx, input) {
  if (!isPlayer(ctx)) return;
  const me = ctx.self; if (!me.state?.shovel) return;
  const sc = scratch(ctx), P = input.pressed || {}, Hd = input.held || {}, R = input.released || {};
  if (P.interact) { ctx.emit('press', { by: me.id }, { to: SH.home }); return; }
  const down = !!(Hd.dig || Hd.strum);
  if ((P.dig || P.strum || down) && !sc.digging) { sc.digging = true; sc.next = 0; sc.scraped = false; }
  if (sc.digging && (R.dig || R.strum || !down)) { sc.digging = false; toss(ctx, me, sc); return; }
  if (sc.digging) { const now = ctx.now(); if (now >= sc.next) { sc.next = now + SH.every * 1000; scoop(ctx, me, sc); } } // held input rings each frame: the scoop cadence rides it, not the 5 s peg schedule
}
export function update(ctx, dt) {
  if (!isPlayer(ctx)) { const s = ctx.self.state; if (!s.holder) return ctx.sleep(); if (!here(ctx, s.holder)) release(ctx, ctx.getObject(s.holder)); return; }
  const me = ctx.self; if (!me.state?.shovel) return;
  // scooping runs in onInput (held input each frame); update only watches the peg row
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
