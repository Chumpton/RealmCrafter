// STARTER MONSTERS (S12): the monster's side of OSRS's formulas. Pure numbers in, numbers out.
import { hitChance } from './combat-core.js';
export const mMaxHit = (m) => Math.floor(0.5 + (m.str + 9) * (m.strBonus + 64) / 640);
export const mAttackRoll = (m) => (m.att + 9) * (m.atkBonus + 64);
export const mDefenceRoll = (m) => (m.def + 9) * (m.defBonus + 64);
// the player's defence roll against it: (Defence + stance + 8) * (armour defence vs its attack kind + 64)
export const pDefenceRoll = (defLevel, stance, armour) => (defLevel + (stance | 0) + 8) * ((armour | 0) + 64);
export const mHitChance = (m, defLevel, stance = 0, armour = 0) => hitChance(mAttackRoll(m), pDefenceRoll(defLevel, stance, armour));
// one swing: returns damage (0 on a miss); r1, r2 are uniform randoms in [0,1)
export const mSwing = (m, defLevel, stance, armour, r1, r2) => (r1 < mHitChance(m, defLevel, stance, armour) ? Math.floor(r2 * (mMaxHit(m) + 1)) : 0);
// chicken feathers: weights out of 128 (5: 64, 15: 32, none: 32); r in [0,1)
export const featherDrop = (table, r) => { let k = r * 128; for (const [n, w] of table) { if (k < w) return n; k -= w; } return 0; };
// one roll on a weighted table (weights out of their sum); r in [0,1). Returns the entry
export const rollTable = (table, r) => { const total = table.reduce((a, e) => a + e.w, 0); let k = r * total; for (const e of table) { if (k < e.w) return e; k -= e.w; } return table[table.length - 1]; };
