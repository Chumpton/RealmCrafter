// COMBAT (MMO prompt 3/6): pure OSRS combat math. No ctx, no state: numbers in, numbers out.
import { WEAPONS, STYLES, SPELLS, ARROW, HP_XP_PER_DMG, BOW_ALIAS } from "./data/combat.js";
import { WEAPON_ALIAS } from "./data/equip.js";
import { maxHitFor } from "./data/spells.js";
export const weaponOf = (id) => WEAPONS.find((w) => w.id === (BOW_ALIAS[id] ?? WEAPON_ALIAS[id] ?? id)) ?? WEAPONS[0];
export const stylesFor = (w) => w.styles ?? STYLES[w.kind];
export const styleOf = (w, id) => stylesFor(w).find((s) => s.id === id) ?? stylesFor(w).find((s) => s.stance === id) ?? stylesFor(w)[0]; // an id, or a stance word from an old save
export const spellOf = (id) => SPELLS.find((s) => s.id === id) ?? SPELLS[0];
export const bestSpell = (magicL) => [...SPELLS].reverse().find((s) => s.level <= magicL) ?? SPELLS[0];

export const eff = (level, bonus) => level + (bonus | 0) + 8;
export const maxHitOf = (effStr, strBonus) => Math.floor(0.5 + effStr * (strBonus + 64) / 640);
export const roll = (effLv, bonus) => effLv * (bonus + 64);
export function hitChance(A, D) { return A > D ? 1 - (D + 2) / (2 * (A + 1)) : A / (2 * (D + 1)); }
export const playerMagicDefLevel = (magicL, defL) => Math.floor(0.7 * magicL + 0.3 * defL);
export function combatLevel(L) {
  const base = 0.25 * (L.defence + L.hitpoints + Math.floor((L.prayer | 0) / 2)); // OSRS: half the Prayer level counts
  return Math.floor(base + Math.max(0.325 * (L.attack + L.strength), 0.325 * Math.floor(1.5 * L.ranged), 0.325 * Math.floor(1.5 * L.magic)));
}
export const attackTicks = (w, st) => Math.max(1, w.speed + (st.speed | 0));
export const rangeOf = (w, st) => w.range + (st.range | 0);

// the whole numbers for one swing: { maxHit, A, D, chance, kind, spell? }. L = player levels; enemy = { defence, magic, defBonus, rangedDefBonus, magicDefBonus }
// gear = the worn bonuses (equip-core gearOf): { atk: {stab, slash, crush, magic, ranged}, str }. Without it the weapon alone counts.
// mods = the active prayers' stat multipliers (prayer-core mods()): floor(level x boost) comes BEFORE the stance bonus
export function swingStats(L, weapon, style, enemy, spellId, arrowStr = ARROW.rangedStr, gear = null, mods = null) {
  const b = style.boost ?? {}, m = mods ?? {}, pl = (lv, k) => Math.floor(lv * (m[k] ?? 1));
  if (weapon.kind === "melee") {
    const atk = gear ? gear.atk[style.type ?? "crush"] : (weapon.bonus?.[style.type ?? "crush"] ?? weapon.atk), str = gear ? gear.str : weapon.str;
    const A = roll(eff(pl(L.attack, "atk"), b.attack), atk), D = roll(enemy.defence + 9, enemy.defBonus | 0);
    return { kind: "melee", maxHit: maxHitOf(eff(pl(L.strength, "str"), b.strength), str), A, D, chance: hitChance(A, D) };
  }
  if (weapon.kind === "ranged") {
    const e = eff(pl(L.ranged, "rng"), b.ranged), A = roll(e, gear ? gear.atk.ranged : weapon.atk), D = roll(enemy.defence + 9, enemy.rangedDefBonus | 0);
    return { kind: "ranged", maxHit: maxHitOf(e, arrowStr), A, D, chance: hitChance(A, D) };
  }
  const sp = spellOf(spellId), A = roll(pl(L.magic, "mag") + 8, gear ? gear.atk.magic : weapon.atk), D = roll((enemy.magic ?? 1) + 9, enemy.magicDefBonus | 0);
  return { kind: "magic", spell: sp, maxHit: Math.floor(maxHitFor(sp, L.magic) * (1 + (m.magDmg || 0))), A, D, chance: hitChance(A, D) };
}

// XP for one swing's damage, in tenths per skill. Magic pays its base on a miss too.
export function swingXp(weapon, style, dmg, spell) {
  const out = {}, add = (k, xp) => { const t = Math.floor(xp * 10); if (t > 0) out[k] = (out[k] | 0) + t; };
  if (weapon.kind === "magic") { add("magic", spell.xp + (style?.xp?.magic ?? 2) * dmg); if (style?.xp?.defence) add("defence", style.xp.defence * dmg); }
  else for (const [k, per] of Object.entries(style.xp)) add(k, per * dmg);
  add("hitpoints", HP_XP_PER_DMG * dmg);
  return out;
}
