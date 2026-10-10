// MAGIC (OSRS-PLAN P2): the player's side of runes. Owns player.state.tutorAt only; runes ride state.supplies (skills-player.js shop, monster loot).
// The magic tutor NPC (Savi's row) emits `magicTutor` to the player on E; the rune shop NPC emits shopOpen { x, z, shop: 'runes' } (skills-player.js).
import { tutorGrant } from './lib/magic-core.js';
// THE FLIP (OSRS-PLAN P3), once per player (state.magicV): the mana pool is gone for good, and everyone starts with the tutor's air + mind runes
// (the staff of air pays the air; Wind Strike needs a mind rune). Waits for skills-player.js to set the pack up first.
export const updateSchedule = { every: { seconds: 1 } };
const waited = new Map();
export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false) return;
  const s = me.state; if (s.magicV >= 1) { ctx.sleep(600); return; }
  if (!s.supplies && (waited.get(me.id) | 0) < 5) { waited.set(me.id, (waited.get(me.id) | 0) + 1); return; }
  s.magicV = 1; delete s.mana; delete s.manaAt; delete s.charge; waited.delete(me.id);
  const r = tutorGrant(s.supplies ?? {}, ctx.now(), 0);
  if (!r.err) { s.supplies = r.supplies; ctx.emit('skillMsg', { text: 'You find some air and mind runes in your pack.' }, { to: me.id }); }
}
export const ears = {
  magicTutor: (ctx) => {
    const me = ctx.self; if (me.isLocal === false) return;
    const s = me.state, r = tutorGrant(s.supplies, ctx.now(), s.tutorAt | 0);
    if (r.err) return ctx.emit('skillMsg', { text: r.err }, { to: me.id });
    s.supplies = r.supplies; s.tutorAt = r.at; ctx.emit('skillMsg', { text: r.msg }, { to: me.id });
  },
};
