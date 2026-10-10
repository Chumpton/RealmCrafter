// The body of scripts/rolf-guitar-borrow.js (its thin door, scripts/lib/lazy-hooks.js): moved here so it stays out of the arrival set.
// Rolf's guitar, lent out (lane 3). While Rolf is neither playing nor tuning, E on the guitar leaning at his stool puts a
// session copy in the presser's arms (this row and its strings hide); E again sets it back at his stool. The holder plays it
// through scripts/guitar-play.js. If Rolf starts a set while it is lent, he takes it back ("Rolf takes his guitar back").
// Any NPC's instrument lends the same way: row state.owner (the NPC), .stringsId, .rest override the Rolf defaults.
// Mirrors scripts/hall-lyre.js: state.holder / heldId here, player.state.holding (+ holdingKind 'guitar') on the holder.
// In Rolf's rests Orm now and then plays it (scripts/lib/npc-guitar.js): holder = Orm, state.npc = the session; a player's E
// or Rolf starting a song ends it. Force one: emit('npcGuitar', { song? }) (waits for Rolf to rest).
import { GUITAR_BORROW as G } from './data/guitar-borrow.js';
import { PLAY } from './data/skald-play.js';
import { boneName, rig } from './rig-names.js';
import * as NPC from './npc-guitar.js';
import { NPC_GUITAR } from './data/npc-guitar.js';
export const updateSchedule = { every: { seconds: NPC_GUITAR.fast } }; // fast only while Orm plays; otherwise it sleeps G.check
const plainModel = (m) => (m == null ? null : typeof m === 'string' ? m : m.id ? { id: m.id, forward: m.forward ?? '-z' } : null);
function heard(ctx, clip) { ctx.emit('playSound', { clip, position: ctx.self.worldFeetPosition ?? ctx.self.feetPosition, volume: G.sounds.volume, maxDistance: G.sounds.maxDistance }); }
function rolfBusy(ctx) {
  const r = ctx.getObject(ctx.self.state.owner ?? G.rolf)?.state; if (!r) return false;
  return !!(r.playing || r.fussing || r.wantsGuitar || (r.lifting && r.lifting.dir === 1));
}
function show(ctx, on) {
  ctx.self.visible = on;
  const St = ctx.getObject(ctx.self.state.stringsId ?? G.stringsRow); if (St && St.visible !== on) St.visible = on;
}
function release(ctx, p) {
  const s = ctx.self.state;
  if (s.heldId && ctx.getObject(s.heldId)) ctx.destroy(s.heldId);
  if (p && p.state && p.state.holding && (!s.heldId || p.state.holding === s.heldId)) { p.state.holding = null; p.state.holdingKind = null; }
  s.holder = null; s.heldId = null;
}
function putBack(ctx, p) { // E again, or the holder left: back on its stand at the stool
  release(ctx, p);
  if (!rolfBusy(ctx)) { const R = ctx.self.state.rest ?? (ctx.self.id === G.id ? PLAY.guitar?.rest : null); if (R) { ctx.self.feetPosition = { ...R.feet }; ctx.self.rotation = { ...R.rotation }; } }
  show(ctx, true);
  heard(ctx, G.sounds.set);
}
function takeBack(ctx, p) { // Rolf wants to play: gracefully, the copy goes and his own guitar is there for his hands
  release(ctx, p);
  show(ctx, true);
  ctx.emit('toast', { message: G.lines.back, duration: 3 }, { audience: { nearby: ctx.self.worldFeetPosition ?? ctx.self.feetPosition, radius: G.lineRadius } });
  heard(ctx, G.sounds.set);
}
function take(ctx, p) {
  const s = ctx.self.state, H = G.held;
  // only a bone this realm can actually read on the holder's rig: an unread rig (server realm answers []) or a rig without it
  // gets the body frame, never boneName's old-rig guess (a missing bone hangs the copy at the body root). The holder's
  // machine re-seats it on the real chest bone (guitar-play-core.js seat()).
  let bone = null;
  if (H.bone) { try { const r = rig(ctx, p.id), b = r.map ? boneName(ctx, p.id, H.bone) : null; bone = b && r.names?.includes(b) ? b : null; } catch (e) { bone = null; } }
  const pose = bone ? { attachment: { bone }, feetPosition: H.feet, rotation: H.rotation } : { feetPosition: H.body.feet, rotation: H.body.rotation };
  const heldId = ctx.spawn({
    parent: p.id, scope: 'session', tags: ['carried', 'rolf-guitar-held'], model: ctx.self.state.model ?? plainModel(ctx.self.model) ?? G.model,
    ...pose, visibleInFirstPerson: true, castShadow: true, state: { from: ctx.self.id, kind: 'guitar', strings: null },
  });
  const sm = ctx.self.state.stringsModel ?? plainModel(ctx.getObject(ctx.self.state.stringsId ?? G.stringsRow)?.model) ?? G.stringsModel;
  if (sm) {
    const stId = ctx.spawn({ parent: heldId, scope: 'session', tags: ['carried'], model: sm, feetPosition: { x: 0, y: 0, z: 0 }, visibleInFirstPerson: true });
    const C = ctx.getObject(heldId); if (C) C.state.strings = stId;
  }
  s.holder = p.id; s.heldId = heldId; show(ctx, false);
  p.state.holding = heldId; p.state.holdingKind = 'guitar';
  heard(ctx, G.sounds.take);
}
// a holder counts while they are a player in the world: a departed body's row can outlive its player
const here = (ctx, id) => !!id && (ctx.world.players || []).some((q) => q.id === id) && !!ctx.getObject(id);
const toast = (ctx, by, message) => ctx.emit('toast', { message, duration: G.toastSec }, { audience: { player: by } });
const hooks = (ctx, busy) => ({ busy, show, heard, toast: (c, message) => c.emit('toast', { message, duration: 3 }, { audience: { nearby: c.self.worldFeetPosition ?? c.self.feetPosition, radius: G.lineRadius } }) });
export const ears = {
  press: (ctx, { by } = {}) => {
    const p = by && ctx.getObject(by); if (!p || !p.tags?.includes?.('player')) return;
    const s = ctx.self.state;
    if (s.holder === by) return putBack(ctx, p);
    if (rolfBusy(ctx)) return toast(ctx, by, G.lines.busy);
    if (p.state?.holding) return;
    if (s.npc) NPC.stop(ctx, hooks(ctx, false), 'player'); // Orm hands it over: tune stops, copy gone, then the normal pickup
    if (s.holder && here(ctx, s.holder)) return toast(ctx, by, G.lines.taken); // hands full (the hall lyre): E already routes back to that
    take(ctx, p);
  },
  npcGuitar: (ctx, p = {}) => { ctx.self.state.npcForce = { at: ctx.now(), song: p.song ?? null }; NPC.warm(); },
};
export function npcGuitarEnd(ctx, p) { if (ctx.self.state.npc?.token === p?.token) NPC.stop(ctx, hooks(ctx, rolfBusy(ctx)), 'done'); }
export function update(ctx) {
  const s = ctx.self.state, busy = rolfBusy(ctx), h = hooks(ctx, busy);
  NPC.watchRests(ctx, h);
  // only a free guitar at rest takes the aim (or Orm's, which E takes over): while Rolf plays, E on him stays his
  const want = !busy && (!s.holder || !!s.npc), tags = ctx.self.tags || [], has = tags.includes('interactable');
  if (want !== has) ctx.self.tags = want ? [...tags, 'interactable'] : tags.filter((t) => t !== 'interactable');
  if (s.npc) { NPC.tick(ctx, h); if (!ctx.self.state.npc) ctx.sleep(G.check); return; }
  if (!s.holder) { if (!ctx.self.visible) show(ctx, true); NPC.idle(ctx, h); if (!ctx.self.state.npc) ctx.sleep(G.check); return; }
  const p = ctx.getObject(s.holder);
  if (busy) { takeBack(ctx, p); ctx.sleep(G.check); return; }
  if (!p || !here(ctx, s.holder) || !s.heldId || !ctx.getObject(s.heldId)) putBack(ctx, p);
  ctx.sleep(G.check);
}
