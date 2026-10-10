// THE 21 PRAYERS (OSRS-PLAN P0, research s26). Data + the clash rule only; points, drain ticks and the window come in P1.
// drain = the prayer's drain effect per 0.6 s tick; one point lasts 0.6 x resistance / totalDrain s (resistance 60 + 2 x prayer bonus).
// boost = effective-level multipliers applied BEFORE the stance bonus: floor(level x boost) + stance + 8.
//   atk/str/def = melee; rng = ranged attack AND strength; mag = magic attack; magDmg = +% spell damage.
// tags: two prayers that share a tag clash; ranged/magic offence prayers also clash with melee atk/str ones and each other (clashes()).
export const PRAYER = { resistance: 60, tickSec: 0.6, resBonusPer: 2, protectItemKeeps: 4 };
export const PRAYERS = [
  { id: 'thick-skin',        name: 'Thick Skin',          level: 1,  drain: 1,  boost: { def: 1.05 }, tags: ['def'] },
  { id: 'burst-of-strength', name: 'Burst of Strength',   level: 4,  drain: 1,  boost: { str: 1.05 }, tags: ['str'] },
  { id: 'clarity-of-thought',name: 'Clarity of Thought',  level: 7,  drain: 1,  boost: { atk: 1.05 }, tags: ['atk'] },
  { id: 'sharp-eye',         name: 'Sharp Eye',           level: 8,  drain: 1,  boost: { rng: 1.05 }, tags: ['rng'] },
  { id: 'mystic-will',       name: 'Mystic Will',         level: 9,  drain: 1,  boost: { mag: 1.05, def: 1.05 }, tags: ['mag', 'def'] },
  { id: 'rock-skin',         name: 'Rock Skin',           level: 10, drain: 6,  boost: { def: 1.10 }, tags: ['def'] },
  { id: 'superhuman-strength', name: 'Superhuman Strength', level: 13, drain: 6, boost: { str: 1.10 }, tags: ['str'] },
  { id: 'improved-reflexes', name: 'Improved Reflexes',   level: 16, drain: 6,  boost: { atk: 1.10 }, tags: ['atk'] },
  { id: 'rapid-restore',     name: 'Rapid Restore',       level: 19, drain: 1,  fx: 'restore', note: 'no effect yet: nothing lowers your stats' },
  { id: 'rapid-heal',        name: 'Rapid Heal',          level: 22, drain: 2,  fx: 'heal' },
  { id: 'protect-item',      name: 'Protect Item',        level: 25, drain: 2,  fx: 'keep' },
  { id: 'hawk-eye',          name: 'Hawk Eye',            level: 26, drain: 6,  boost: { rng: 1.10 }, tags: ['rng'] },
  { id: 'mystic-lore',       name: 'Mystic Lore',         level: 27, drain: 6,  boost: { mag: 1.10, def: 1.10, magDmg: 0.01 }, tags: ['mag', 'def'] },
  { id: 'steel-skin',        name: 'Steel Skin',          level: 28, drain: 12, boost: { def: 1.15 }, tags: ['def'] },
  { id: 'ultimate-strength', name: 'Ultimate Strength',   level: 31, drain: 12, boost: { str: 1.15 }, tags: ['str'] },
  { id: 'incredible-reflexes', name: 'Incredible Reflexes', level: 34, drain: 12, boost: { atk: 1.15 }, tags: ['atk'] },
  { id: 'protect-from-magic',   name: 'Protect from Magic',    level: 37, drain: 12, protect: 'magic',  tags: ['prot'], note: 'no effect yet: no magic monsters' },
  { id: 'protect-from-missiles',name: 'Protect from Missiles', level: 40, drain: 12, protect: 'ranged', tags: ['prot'], note: 'no effect yet: no ranged monsters' },
  { id: 'protect-from-melee',   name: 'Protect from Melee',    level: 43, drain: 12, protect: 'melee',  tags: ['prot'] },
  { id: 'eagle-eye',         name: 'Eagle Eye',           level: 44, drain: 12, boost: { rng: 1.15 }, tags: ['rng'] },
  { id: 'mystic-might',      name: 'Mystic Might',        level: 45, drain: 12, boost: { mag: 1.15, def: 1.15, magDmg: 0.02 }, tags: ['mag', 'def'] },
];
export const prayerById = (id) => PRAYERS.find((p) => p.id === id) ?? null;
const OFF = ['atk', 'str', 'rng', 'mag'];
// do two different prayers switch each other off?
export function clashes(a, b) {
  if (!a || !b || a.id === b.id) return false;
  const ta = a.tags ?? [], tb = b.tags ?? [];
  if (ta.some((t) => tb.includes(t))) return true;
  const wide = (t) => t.includes('rng') || t.includes('mag');
  return (wide(ta) && tb.some((t) => OFF.includes(t))) || (wide(tb) && ta.some((t) => OFF.includes(t)));
}
// seconds one prayer point lasts for a drain total and a prayer bonus (s26 table check)
export const pointSeconds = (totalDrain, bonus = 0) => totalDrain > 0 ? PRAYER.tickSec * (PRAYER.resistance + PRAYER.resBonusPer * bonus) / totalDrain : Infinity;
