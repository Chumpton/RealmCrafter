// Orm plays Rolf's guitar (driven from scripts/rolf-guitar-borrow.js; numbers in lib/data/npc-guitar.js). After every few of
// Rolf's rests, if no player holds the guitar and Rolf is neither playing, tuning nor lifting, Orm wakes, sits up at the bench's
// front, takes a copy of the guitar onto his lap (the row and its strings hide), plays one short songbook tune in the nylon
// voice while his right arm strokes on the tune's hits and the copy's strings swing, then hands it back. Rolf starting a song
// or a player's E ends it at once: copy gone, row visible, holder null, Orm back to his own spot and pose.
// State on the guitar row: holder = Orm's id and npc = { by, heldId, strings, song, seed, startAt, endAt, token, prev, k, at, dir }.
// Orm carries state.lyre = true while playing (folk-life-core's skip for idle swaps, toasts and notices) and state.guitar = true.
// h = { busy, show(ctx, on), heard(ctx, clip), toast(ctx, message) } from the row's behavior.
import { NPC_GUITAR as N } from './data/npc-guitar.js';
import { GUITAR_BORROW as G, guitarTuning } from './data/guitar-borrow.js';
import { tuningMidi } from './data/lyre-tunings.js';
import { voiceNotes } from './skald-voicing.js';
import { stringsAt } from './skald-strings.js';
import { add, rotate } from 'builtin/vec3';
let TL = null, loading = false;
export function warm() { if (!TL && !loading) { loading = true; import('./skald-timeline.js').then((m) => { TL = m; }, () => { loading = false; }); } return !!TL; }
const span = (ctx, [a, b]) => a + ctx.random() * (b - a);
const rollEvery = (ctx) => Math.round(span(ctx, N.restsEvery));
const r3 = (v) => ({ x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) });
const plainModel = (m) => (m == null ? null : typeof m === 'string' ? m : m.id ? { id: m.id, forward: m.forward ?? '-z' } : null);
// a GUITAR-frame point to world, through where the lap copy sits in Orm's seated frame
function handPt(a) {
  const body = add(N.guitar.feet, rotate(N.guitar.rotation, { x: a[0], y: a[1], z: a[2] }));
  return r3(add(N.seat.feet, rotate(N.seat.yaw, body)));
}
const mem = new Map(); // token -> { tl, voicing, hits }: module memory, rebuilt from { song, seed } after a reload
function tune(n) {
  let m = mem.get(n.token);
  if (!m && TL) {
    const tl = TL.compile(n.song, n.seed, { tempoScale: N.tempo, lead: N.lead });
    m = { tl, voicing: voiceNotes(tl.notes, tuningMidi(TL.songById(n.song)), n.guitar ?? null), hits: tl.hits.map((x) => x[0]) };
    mem.set(n.token, m);
  }
  return m;
}
function settled(ctx) { // Rolf's own lift-down (guitar back to its stand) has finished
  const r = ctx.getObject(ctx.self.state.owner ?? G.rolf)?.state, L = r?.lifting;
  return !L || (L.dir === -1 && ctx.now() > (L.at ?? 0) + (L.sec ?? 0) * 1000 + N.settleMs);
}
// a real rest: Rolf idle and out of his set (setEnd cleared; with state.always he never rests), not a breath between songs
function resting(ctx, h) {
  const r = ctx.getObject(ctx.self.state.owner ?? G.rolf)?.state;
  return !h.busy && !!r && !r.always && !r.setEnd;
}
// player-first claim: the id of a free-handed player near the guitar and turned toward it (their body's heading; the aim
// itself lives on their machine), or anyone standing right at it. Orm leaves it to them.
const yawOf = (r) => (r == null ? null : typeof r === 'number' ? r : typeof r.yaw === 'number' ? r.yaw : typeof r.w === 'number' ? 2 * Math.atan2(r.y ?? 0, r.w) * 180 / Math.PI : null);
export function claimant(ctx) {
  const C = N.claim, g = ctx.self.worldFeetPosition ?? ctx.self.feetPosition; if (!C || !g) return null;
  for (const p of ctx.world.players || []) {
    const q = p.worldFeetPosition ?? p.feetPosition; if (!q || p.state?.holding) continue;
    const dx = g.x - q.x, dz = g.z - q.z, d = Math.hypot(dx, dz); if (d > C.reach) continue;
    const y = yawOf(p.rotation); if (d <= C.touch || y == null) return p.id;
    const t = y * Math.PI / 180, cos = (-Math.sin(t) * dx - Math.cos(t) * dz) / d;
    if (Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI <= C.cone) return p.id;
  }
  return null;
}
const dlog = (ctx, what, data) => { if (ctx.self.state.npcLog) ctx.log('npc-guitar ' + what, data); }; // dev probe, off unless state.npcLog
// true = started; a string = why not
export function start(ctx, h, opt = {}) {
  const s = ctx.self.state;
  if (s.npc) return 'already playing';
  if (s.holder && ctx.getObject(s.holder)) return 'a player holds it';
  if (!resting(ctx, h) || !settled(ctx)) return 'rolf is busy';
  const claim = claimant(ctx); s.npcClaim = claim; if (claim) return 'a player is reaching for it';
  if (!warm()) return 'loading';
  const F = ctx.getObject(N.npc); if (!F) return 'no orm';
  const fs = F.state || {};
  if (fs.lyre || fs.work) return 'orm is busy';
  if (!opt.force && fs.toasting) return 'orm is toasting';
  const pool = opt.song ? [opt.song] : N.songs;
  let tl = null, song = null, seed = 0;
  for (let k = 0; k < 6; k++) {
    const id = pool[Math.floor(ctx.random() * pool.length)], sd = 1 + Math.floor(ctx.random() * 9999);
    const c = TL.compile(id, sd, { tempoScale: N.tempo, lead: N.lead });
    if ((opt.song || c.length <= N.maxLength) && (!tl || c.length < tl.length)) { tl = c; song = TL.songById(id); seed = sd; }
    if (tl && !opt.force) break;
  }
  if (!tl) return 'no short song';
  const now = ctx.now(), token = now, P = F.anim?.pose;
  const gt = guitarTuning(ctx.self).midi; // Orm frets the song on the guitar as it is tuned now (never retunes it)
  const prev = {
    feet: { ...(F.feetPosition || {}) }, rotation: F.rotation,
    pose: P?.clip ? { clip: P.clip, weight: P.weight ?? 5, loop: P.loop ?? 'loop', ...(P.speed ? { speed: P.speed } : {}), blendIn: 1 } : null,
  };
  F.feetPosition = { ...N.seat.feet }; F.rotation = { yaw: N.seat.yaw };
  F.anim.pose = { clip: N.pose.clip, weight: N.pose.weight, loop: 'loop', blendIn: N.pose.blendIn };
  const heldId = ctx.spawn({
    parent: F.id, tags: ['rolf-guitar-held', 'npc-guitar'], physics: 'none', castShadow: true,
    ...(N.guitar.bone ? { attachment: { bone: N.guitar.bone } } : {}),
    model: s.model ?? plainModel(ctx.self.model) ?? G.model, feetPosition: N.guitar.feet, rotation: N.guitar.rotation,
    lifetime: tl.length + N.tail + N.lifeSpare, state: { from: ctx.self.id, kind: 'guitar', npc: F.id, strings: null },
  });
  const sm = s.stringsModel ?? plainModel(ctx.getObject(s.stringsId ?? G.stringsRow)?.model) ?? G.stringsModel;
  const stId = sm ? ctx.spawn({ parent: heldId, tags: ['npc-guitar'], physics: 'none', model: sm, feetPosition: { x: 0, y: 0, z: 0 }, lifetime: tl.length + N.tail + N.lifeSpare }) : null; // HUGINN H102/H103: same lifetime as the guitar, else it outlives it as a root at (0,0,0)
  const C = ctx.getObject(heldId);
  if (C) {
    C.state.strings = stId;
    const A = G.audio;
    C.audio = { kind: 'program', script: A.script, spatial: true, maxDistance: N.audio.maxDistance, gain: 1,
      params: { playing: true, song: 'orm-' + song.id, startAt: now, sentAt: now, notes: tl.notes, tuning: tuningMidi(song), voice: A.voice, stride: tl.stride === 6 ? 6 : 5, latency: N.audio.latency, gain: N.audio.gain * ormGain(ctx) } };
  }
  s.holder = F.id; s.heldId = heldId;
  s.npc = { by: F.id, heldId, strings: stId, song: song.id, seed, guitar: gt, startAt: now, endAt: now + (tl.length + N.tail) * 1000, token, prev, k: 0, at: 0, dir: 0, forced: !!opt.force };
  h.show(ctx, false);
  F.state.lyre = true; F.state.guitar = true;
  const Hd = N.hands;
  F.ik = { ...(F.ik || {}), leftArm: { target: handPt(Hd.left), weight: Hd.weight, blendIn: Hd.blendIn }, rightArm: { target: handPt(Hd.down), weight: Hd.weight, blendIn: Hd.blendIn } };
  mem.set(token, { tl, voicing: voiceNotes(tl.notes, tuningMidi(song), gt), hits: tl.hits.map((x) => x[0]) });
  ctx.after(tl.length + N.tail, 'npcGuitarEnd', { token });
  h.heard(ctx, G.sounds.take);
  dlog(ctx, 'start', { song: song.id, seed, len: tl.length, hits: tl.hits.length });
  return true;
}
// the right arm strokes on each hit the tune passes; the copy's strings swing (every N.fast s while Orm plays)
export function strum(ctx) {
  const n = ctx.self.state.npc; if (!n) return;
  const F = ctx.getObject(n.by); if (!F) return;
  const el = (ctx.now() - n.startAt) / 1000, m = tune(n), t = m?.hits, playEnd = (n.endAt - n.startAt) / 1000 - N.tail;
  if (m && n.strings) {
    const St = ctx.getObject(n.strings);
    if (St) {
      const S = stringsAt(m.tl, m.voicing, el);
      if (S.still) { if (St.bones) St.bones = null; }
      else { const b = {}, R = N.stringsRound; for (const key in S.bones) { const v = S.bones[key]; b[key] = { x: Math.round(v.x * R) / R, y: 0, z: Math.round(v.z * R) / R }; } St.bones = b; }
    }
  }
  let k;
  if (t && t.length) { k = 0; while (k < t.length && t[k] <= el) k++; }
  else k = Math.floor(el / N.hands.fallbackGap);
  if (k === (n.k ?? 0) || el > playEnd) return;
  if (el - (n.at ?? 0) < N.hands.minGap && k > 0) { n.k = k; return; }
  n.k = k; n.at = +el.toFixed(2); n.dir = n.dir ? 0 : 1;
  if (F.ik?.rightArm) F.ik = { ...F.ik, rightArm: { ...F.ik.rightArm, target: handPt(n.dir ? N.hands.up : N.hands.down) } };
}
// the guitar home, Orm back to himself, the row's session cleared. reason: 'done' | 'player' | 'rolf' | 'lost'
export function stop(ctx, h, reason = 'done') {
  const s = ctx.self.state, n = s.npc; if (!n) return false;
  for (const id of [n.strings, n.heldId]) if (id && ctx.getObject(id)) ctx.destroy(id); // HUGINN H102/H103: the strings are this row's spawn, not the guitar's: destroy both
  const F = ctx.getObject(n.by);
  if (F) {
    delete F.state.lyre; delete F.state.guitar;
    const ik = F.ik || {}, off = (a) => ({ target: a?.target ?? { yaw: 0 }, weight: 0, blendOut: N.hands.blendOut });
    F.ik = { ...ik, leftArm: off(ik.leftArm), rightArm: off(ik.rightArm) };
    if (n.prev?.pose) F.anim.pose = n.prev.pose;
    if (n.prev?.feet && Number.isFinite(n.prev.feet.x)) F.feetPosition = n.prev.feet;
    if (n.prev?.rotation) F.rotation = n.prev.rotation;
  }
  mem.delete(n.token);
  s.npcLast = { by: n.by, song: n.song, reason, at: ctx.now() };
  s.npc = null; s.holder = null; s.heldId = null;
  s.npcRests = 0; s.npcEvery = rollEvery(ctx); s.npcTryAt = null; // the count starts over: one tune per chosen rest
  if (ctx.place.state.ormAlways) s.npcTryAt = ctx.now() + ORM_ALWAYS_GAP * 1000; // O menu 'always': a breath, then the next tune
  h.show(ctx, true);
  if (reason === 'rolf') h.toast(ctx, G.lines.back);
  if (reason !== 'player') h.heard(ctx, G.sounds.set);
  dlog(ctx, 'stop', { reason });
  return true;
}
// every update: count Rolf's rests (busy -> idle), so the schedule knows "every few rests"
export function watchRests(ctx, h) {
  const s = ctx.self.state, was = !!s.npcRolfBusy, busy = !resting(ctx, h);
  if (was === busy) return;
  s.npcRolfBusy = busy;
  if (was && !busy) { s.npcRests = (s.npcRests ?? 0) + 1; s.npcTryAt = ctx.now() + span(ctx, N.restDelay) * 1000; }
}
// during a session: end it on time, yield to Rolf (always: he needs his guitar), or stroke
export function tick(ctx, h) {
  const s = ctx.self.state, n = s.npc;
  if (!ctx.getObject(n.by) || !ctx.getObject(n.heldId)) return stop(ctx, h, 'lost');
  if (ctx.now() > n.endAt + N.lostGrace * 1000) return stop(ctx, h, 'done');
  if (h.busy) return stop(ctx, h, 'rolf');
  strum(ctx);
}
// no session, nobody holding it: a forced session as soon as Rolf rests, or the rest-count schedule
export function idle(ctx, h) {
  const s = ctx.self.state, now = ctx.now();
  if (s.npcEvery == null) s.npcEvery = rollEvery(ctx);
  if (s.npcForce) {
    warm();
    if (now - (s.npcForce.at ?? now) > N.forceWait * 1000) { s.npcForce = null; s.npcTry = 'force expired'; return; }
    const r = start(ctx, h, { force: true, song: s.npcForce.song });
    if (r === true) { s.npcForce = null; s.npcTry = 'forced'; }
    else if (r !== 'loading' && r !== 'rolf is busy' && r !== 'a player is reaching for it') { s.npcForce = null; s.npcTry = r; }
    else if (s.npcTry !== 'waiting: ' + r) s.npcTry = 'waiting: ' + r;
    return;
  }
  const always = !!ctx.place.state.ormAlways; // O menu: Orm plays whenever Rolf rests, not every few rests
  if (always && !s.npcTryAt) s.npcTryAt = now + ORM_ALWAYS_GAP * 1000;
  if ((!always && (s.npcRests ?? 0) < s.npcEvery) || !resting(ctx, h) || !s.npcTryAt || now < s.npcTryAt) return;
  warm();
  const r = start(ctx, h);
  s.npcTry = r === true ? 'started' : r;
  if (r === true) { s.npcRests = 0; s.npcEvery = rollEvery(ctx); s.npcTryAt = null; }
  else s.npcTryAt = now + (r === 'loading' ? N.retryLoading : r === 'a player is reaching for it' ? N.claim.retry : N.retry) * 1000;
}

// O menu (creator 2026-09-29): place.state.ormVol 0..100 % of his loudness (absent = full); ormAlways = a new tune ORM_ALWAYS_GAP s after the last while Rolf rests
function ormGain(ctx) { const v = ctx.place.state.ormVol; return typeof v === 'number' ? Math.max(0, Math.min(100, v)) / 100 : 1; }
const ORM_ALWAYS_GAP = 4;
