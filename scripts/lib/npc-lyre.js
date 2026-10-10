// The hall lyre's NPC musician (driven from scripts/hall-lyre.js; numbers in lib/data/npc-lyre.js). Now and then a seated
// feast folk takes the lyre off its post (the post copy hides, a copy rides the folk's lap), plays one short songbook tune
// through Rolf's lyre sound program in the lyre voice while the right hand strokes the strings on the tune's hits, then sets
// it back. Never while a player holds it; a player's E mid-tune stops the tune, the lyre goes home, then the normal pickup.
// State: hall-lyre.state.npc = { by, heldId, song, startAt, endAt, token, prevPose, dir } while it plays; npcNextAt = next try.
// The folk row carries state.lyre = true while playing (folk-life-core skips idle swaps, toasts and notices then).
import { NPC_LYRE as N } from './data/npc-lyre.js';
import { tuningMidi } from './data/lyre-tunings.js';
import { rotate } from 'builtin/vec3';
let TL = null, loading = false;
export function warm() { if (!TL && !loading) { loading = true; import('./skald-timeline.js').then((m) => { TL = m; }, () => { loading = false; }); } return !!TL; }
const span = (ctx, [a, b]) => a + ctx.random() * (b - a);
export function scheduleNext(ctx, first) { ctx.self.state.npcNextAt = ctx.now() + span(ctx, first ? N.firstDelay : N.every) * 1000; }
function world(F, local) {
  const f = F.worldFeetPosition || F.feetPosition, sc = typeof F.scale === 'number' ? F.scale : (F.scale?.y ?? 1);
  const v = rotate(F.rotation ?? 0, { x: local.x * sc, y: local.y * sc, z: local.z * sc });
  return { x: +(f.x + v.x).toFixed(3), y: +(f.y + v.y).toFixed(3), z: +(f.z + v.z).toFixed(3) };
}
function pickFolk(ctx, want) {
  for (const id of want ? [want] : N.npcs) {
    const F = ctx.getObject(id); if (!F) continue;
    const s = F.state || {};
    if (!want && (s.toasting || s.work || s.lyre || String(F.anim?.pose?.clip ?? '').includes('sleep'))) continue;
    return F;
  }
  return null;
}
function rolfBusy(ctx) { const r = ctx.getObject(N.rolf)?.state; return !!(r && (r.playing || r.fussing)); }
// true = started; a string = why not
export function start(ctx, opt = {}) {
  const s = ctx.self.state;
  if (s.npc) return 'already playing';
  if (s.holder && ctx.getObject(s.holder)) return 'a player holds it';
  if (!opt.force && rolfBusy(ctx)) return 'rolf is busy';
  if (!warm()) return 'loading';
  const F = pickFolk(ctx, opt.by); if (!F) return 'no folk free';
  const pool = opt.song ? [opt.song] : N.songs;
  let tl = null, song = null;
  for (let k = 0; k < 6 && !tl; k++) {
    const id = pool[Math.floor(ctx.random() * pool.length)], seed = 1 + Math.floor(ctx.random() * 9999);
    const c = TL.compile(id, seed, { tempoScale: N.tempo, lead: N.lead });
    if (opt.song || c.length <= N.maxLength) { tl = c; song = TL.songById(id); }
  }
  if (!tl) return 'no short song';
  const now = ctx.now(), L = N.lyre;
  const heldId = ctx.spawn({
    parent: F.id, tags: ['hall-lyre-held', 'npc-lyre'], physics: 'none', castShadow: true,
    ...(L.bone ? { attachment: { bone: L.bone } } : {}),
    primitive: { kind: 'scripted', script: 'scripts/gen/lore-lyre.js' }, feetPosition: L.feet, rotation: L.rotation,
    lifetime: tl.length + N.tail + 20, state: { from: ctx.self.id, npc: F.id },
  });
  const H = ctx.getObject(heldId);
  if (H) H.audio = { kind: 'program', script: 'scripts/audio-skald-lyre.js', spatial: true, maxDistance: N.audio.maxDistance, gain: ulfGain(ctx), // O menu: place.state.ulfVol 0..100 %
   
    params: { playing: true, song: 'npc-' + song.id, startAt: now, sentAt: now, notes: tl.notes, tuning: tuningMidi(song), voice: 'lyre', stride: tl.stride === 6 ? 6 : 5, latency: N.audio.latency, gain: N.audio.gain } };
  const token = now;
  s.npc = { by: F.id, heldId, song: song.id, startAt: now, endAt: now + (tl.length + N.tail) * 1000, token, prevPose: F.anim?.pose ?? null, dir: 0, hits: tl.hits.length };
  ctx.self.visible = false;
  F.state.lyre = true;
  if (N.pose) F.anim.pose = { clip: N.pose, weight: F.anim?.pose?.weight ?? 5, loop: 'loop', blendIn: 0.6 };
  const Hd = N.hands;
  F.ik = { ...(F.ik || {}), leftArm: { target: world(F, Hd.left), weight: Hd.weight, blendIn: Hd.blendIn }, rightArm: { target: world(F, Hd.down), weight: Hd.weight, blendIn: Hd.blendIn } };
  hits.set(token, tl.hits.map((h) => h[0]));
  ctx.after(tl.length + N.tail, 'npcEnd', { token });
  return true;
}
const hits = new Map(); // token → hit times (s), module memory: a lost map only stops the wiggle, never the tune
// the right hand strokes on each hit the tune passes (hall-lyre's update runs every 0.1 s while a folk plays); writes only on a stroke
export function strum(ctx) {
  const n = ctx.self.state.npc; if (!n) return;
  const F = ctx.getObject(n.by); if (!F) return;
  const el = (ctx.now() - n.startAt) / 1000, t = hits.get(n.token);
  let k;
  if (t && t.length) { k = 0; while (k < t.length && t[k] <= el) k++; }
  else k = Math.floor(el / N.hands.fallbackGap); // a lost hit list (module reload) keeps a steady stroke
  if (k === (n.k ?? 0) || el > (n.endAt - n.startAt) / 1000 - N.tail) return;
  const last = n.at ?? 0; if (el - last < N.hands.minGap && k > 0) { n.k = k; return; }
  n.k = k; n.at = +el.toFixed(2); n.dir = n.dir ? 0 : 1;
  if (F.ik?.rightArm) F.ik = { ...F.ik, rightArm: { ...F.ik.rightArm, target: world(F, n.dir ? N.hands.up : N.hands.down) } };
}
// the lyre home, the folk back to itself, the row's session cleared. reason: 'done' | 'player' | 'rolf' | 'lost'
export function stop(ctx, reason = 'done') {
  const s = ctx.self.state, n = s.npc; if (!n) return false;
  const F = ctx.getObject(n.by);
  if (n.heldId && ctx.getObject(n.heldId)) ctx.destroy(n.heldId);
  if (F) {
    delete F.state.lyre;
    const ik = F.ik || {}, Hd = N.hands, off = (a) => ({ target: a?.target ?? { yaw: 0 }, weight: 0, blendOut: Hd.blendOut });
    F.ik = { ...ik, leftArm: off(ik.leftArm), rightArm: off(ik.rightArm) };
    if (n.prevPose) F.anim.pose = n.prevPose;
  }
  hits.delete(n.token);
  s.npcLast = { by: n.by, song: n.song, reason, at: ctx.now() };
  s.npc = null; ctx.self.visible = true;
  if (ctx.place.state.ulfAlways) s.npcNextAt = ctx.now() + ALWAYS_GAP * 1000; else scheduleNext(ctx);
  return true;
}
// hall-lyre's 1 s update while no player holds it: end a session that ran out, yield to Rolf, or try a new one on time
export function tick(ctx) {
  const s = ctx.self.state, now = ctx.now();
  warm();
  if (s.npc) {
    if (!ctx.getObject(s.npc.by) || !ctx.getObject(s.npc.heldId)) return stop(ctx, 'lost');
    if (now > s.npc.endAt + 3000) return stop(ctx, 'done');
    if (N.yieldToRolf && !s.npc.forced && ctx.getObject(N.rolf)?.state?.playing) return stop(ctx, 'rolf');
    return strum(ctx);
  }
  if (s.npcForce && TL) { const f = s.npcForce; s.npcForce = null; const r = start(ctx, { ...f, force: true }); if (r === true) s.npc.forced = true; s.npcTry = r === true ? 'forced' : r; return; }
  if (ctx.place.state.ulfAlways) { // O menu 'always': Ulf keeps the lyre going, a short breath between tunes, Rolf or not
    if (s.npcNextAt != null && now < s.npcNextAt && s.npcNextAt - now <= ALWAYS_GAP * 1000) return;
    const r = start(ctx, { by: 'folk-ulf', force: true }); if (r === true) s.npc.forced = true; s.npcTry = r === true ? 'always' : r;
    if (r !== true) s.npcNextAt = now + ALWAYS_GAP * 1000; return;
  }
  if (s.npcNextAt == null || s.npcNextAt - now > N.every[1] * 1000) return scheduleNext(ctx, true);
  if (now < s.npcNextAt) return;
  const r = start(ctx); s.npcTry = r === true ? 'started' : r;
  if (r !== true) s.npcNextAt = now + N.retry * 1000;
}

function ulfGain(ctx) { const v = ctx.place.state.ulfVol; return typeof v === 'number' ? Math.max(0, Math.min(100, v)) / 100 : 1; }
const ALWAYS_GAP = 4; // seconds between tunes while Ulf plays always
