// THE OLD SPELLS ARE GONE (creator 2026-10-05: "we only want to use the magic book from OSRS"; lane L1 deleted them server-side).
// The player's spellbook is data/spells.js (the OSRS spells, runes only). What stays here: the bar-value helpers, and the six old ids
// so scripts/ui-binds.js (barMagicV migration) and spellbook-player.js still drop them from saved bars.
import { spellById } from './spells.js';
const OLD_IDS = ['fireball', 'chain-lightning', 'gravity-vortex', 'freeze-pulse', 'dive-bomb', 'stone-pillar'];
export const isOldSpell = (id) => OLD_IDS.includes(id);
// any castable thing by id: an OSRS spell
export const bookById = (id) => spellById(id);
// what a bar slot holds for a spell
export const barValueOf = (id) => 'sp:' + id;
export const spellOfBar = (v) => (typeof v === 'string' && v.startsWith('sp:') ? bookById(v.slice(3)) : null);
