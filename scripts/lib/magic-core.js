// MAGIC runes (OSRS-PLAN P2, research s31/s37): pure. Costs are rune counts from data/spells.js; runes ride player.state.supplies as <name>-rune counts.
// An elemental staff counts as unlimited runes of its element (STAFF_RUNES). Used by spellbook-player.js and combat-player.js casts.
import { RUNES, STAFF_RUNES, TUTOR } from './data/runes.js';
// the rune costs a cast actually pays: [[rune, need]], staff runes and unknown names left out
const paid = (spell, weaponId) => { const free = STAFF_RUNES[weaponId] ?? []; return Object.entries(spell.runes ?? {}).filter(([k]) => RUNES[k] && !free.includes(k)); };
// what a cast is short of: [{ rune, need, have }] (empty = castable). Non-rune costs (the banana) are checked by their own spell code.
export function missing(spell, supplies, weaponId) {
  const out = [];
  for (const [k, need] of paid(spell, weaponId)) { const have = supplies?.[RUNES[k].id] | 0; if (have < need) out.push({ rune: k, need, have }); }
  return out;
}
// the supplies after a cast (a splash still spends them); staff runes are never spent
export function spend(supplies, spell, weaponId) {
  const next = { ...(supplies ?? {}) };
  for (const [k, need] of paid(spell, weaponId)) next[RUNES[k].id] = Math.max(0, (next[RUNES[k].id] | 0) - need);
  return next;
}
// how many casts the runes allow (for the book's small number); Infinity when only staff runes are needed
export function castsLeft(spell, supplies, weaponId) {
  let n = Infinity;
  for (const [k, need] of paid(spell, weaponId)) if (need > 0) n = Math.min(n, Math.floor((supplies?.[RUNES[k].id] | 0) / need));
  return n;
}
// the magic tutor (Mikasi): 30 air + 30 mind every 30 minutes, only if you hold none of those runes. last = ms of the previous grant (0 = never)
export function tutorGrant(supplies, now, last) {
  const ids = Object.keys(TUTOR.runes).map((k) => RUNES[k].id);
  if (TUTOR.onlyIfNone && ids.some((id) => (supplies?.[id] | 0) > 0)) return { err: 'The tutor says: use what you have first.' };
  if (last && now - last < TUTOR.everySec * 1000) return { err: `The tutor says: come back in ${Math.ceil((TUTOR.everySec * 1000 - (now - last)) / 60000)} minutes.` };
  const next = { ...(supplies ?? {}) }; for (const [k, n] of Object.entries(TUTOR.runes)) next[RUNES[k].id] = (next[RUNES[k].id] | 0) + n;
  return { supplies: next, at: now, msg: 'The tutor gives you some air and mind runes.' };
}
