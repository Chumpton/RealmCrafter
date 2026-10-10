// The body of scripts/hall-lyre.js (its thin door, scripts/lib/lazy-hooks.js): moved here so it stays out of the arrival set.
// The hall lyre on its post. E takes it up (a copy rides the player's chest, this one hides), E again sets it back.
// Whoever holds it plays it through scripts/lyre-play.js; a holder who leaves puts it back on the post by itself.
// Now and then a seated feast folk plays it (scripts/lib/npc-lyre.js); a player's E mid-tune takes it over.
// Force one: emit('npcLyre', { by?: 'folk-ulf', song?: 'krummi' }).
import { HALL_LYRE as H } from './data/hall-lyre.js';
import * as NPC from './npc-lyre.js';
export const updateSchedule = { every: { seconds: 0.1 } }; // fast only while a folk plays; otherwise it sleeps 1 s
function heard(ctx, clip) { ctx.emit('playSound', { clip, position: ctx.self.worldFeetPosition ?? ctx.self.feetPosition, volume: 0.45, maxDistance: 10 }); }
// a holder counts while they are a player in the world: a departed body's row can outlive its player (a helper's body stays)
const here = (ctx, id) => !!id && (ctx.world.players || []).some((q) => q.id === id) && !!ctx.getObject(id);
function putBack(ctx, p) {
  const s = ctx.self.state;
  if (s.heldId && ctx.getObject(s.heldId)) ctx.destroy(s.heldId);
  if (p && p.state?.holding) p.state.holding = null;
  s.holder = null; s.heldId = null; ctx.self.visible = true;
  heard(ctx, H.sounds.set);
}
function take(ctx, p) {
  const s = ctx.self.state;
  const heldId = ctx.spawn({
    parent: p.id, scope: 'session', tags: ['carried', 'hall-lyre-held'],
    primitive: { kind: 'scripted', script: 'scripts/gen/lore-lyre.js' },
    feetPosition: H.held.feet, rotation: H.held.rotation,
    visibleInFirstPerson: true, castShadow: true, state: { from: ctx.self.id },
  });
  s.holder = p.id; s.heldId = heldId; ctx.self.visible = false;
  p.state.holding = heldId;
  heard(ctx, H.sounds.take);
}
export const ears = {
  press: (ctx, { by }) => {
    const p = by && ctx.getObject(by); if (!p || !p.tags?.includes?.('player')) return; // folk toasts and chess cheers press too
    const s = ctx.self.state;
    if (s.holder === by) return putBack(ctx, p);
    if (p.state?.holding && p.state.holding !== s.heldId) return; // hands full of another instrument (Rolf's guitar): its E is its own, never a lyre pickup too
    if (s.holder && here(ctx, s.holder)) { ctx.emit('toast', { message: 'someone is playing it', duration: 1.6 }, { audience: { player: by } }); return; }
    if (s.npc) NPC.stop(ctx, 'player'); // the folk hands it over: tune stops, lyre home, then the normal pickup
    take(ctx, p);
  },
  npcLyre: (ctx, p = {}) => { ctx.self.state.npcForce = { by: p.by ?? null, song: p.song ?? null }; NPC.warm(); },
};
export function npcStrum(ctx) { NPC.strum(ctx); }
export function npcEnd(ctx, p) { if (ctx.self.state.npc?.token === p?.token) NPC.stop(ctx, 'done'); }
export function update(ctx) {
  const s = ctx.self.state;
  if (!s.holder) { if (!s.npc && !ctx.self.visible) ctx.self.visible = true; NPC.tick(ctx); if (!ctx.self.state.npc) ctx.sleep(1); return; }
  if (s.npc) NPC.stop(ctx, 'player');
  if (!here(ctx, s.holder) || !s.heldId || !ctx.getObject(s.heldId)) putBack(ctx, ctx.getObject(s.holder));
  ctx.sleep(1);
}
