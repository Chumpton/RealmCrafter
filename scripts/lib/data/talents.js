// 3RD PERSON TALENTS (creator 2026-10-10: "scrub the OSRS combat system from the 3rd person mode and separate them
// (leveling skills, jumping etc) 3rd person is based on talents"). The class modes (combatMode mage/warlock/shaman/warrior/wow)
// run on ONE character level and a talent tree; OSRS skills, their xp and the skill-gated jump/run stay OSRS-only.
// Save: player.state.tp = { xp, pts: { <talentId>: rank } }. Nothing here touches player.state.skills.
import { isClassMode } from './class-spells.js';
export const tpOn = (s) => isClassMode(s?.combatMode);
export const TP_MAX = 30;
export const XP_PER_DMG_TP = 4, XP_KILL_TP = 25; // character xp: 4 per damage dealt, 25 per kill
export const xpToNext = (lv) => Math.round(60 * Math.pow(lv, 1.5)); // 60, 170, 312, 480 …
export function tpLevelOf(xp) { let lv = 1, x = Math.max(0, xp | 0); while (lv < TP_MAX && x >= xpToNext(lv)) { x -= xpToNext(lv); lv++; } return { lv, into: x, need: lv < TP_MAX ? xpToNext(lv) : 0 }; }
export const tpLevel = (s) => tpLevelOf(s?.tp?.xp ?? 0).lv;
export const tpPoints = (s) => tpLevel(s) - 1; // one talent point a level from 2
// creator 2026-10-10 "unique talents": each vanilla class keeps its own points (tp.by[class]); the old kits share tp.pts
export const ownPts = (s) => { const m = s?.combatMode; return /^v/.test(m ?? '') ? (s?.tp?.by?.[m] ?? (m === 'vmage' ? s?.tp?.pts : null) ?? {}) : (s?.tp?.pts ?? {}); };
export function withPts(s, pts) { const m = s?.combatMode, tp = s?.tp ?? {}; return /^v/.test(m ?? '') ? { ...tp, by: { ...(tp.by ?? {}), [m]: pts } } : { ...tp, pts }; }
export const spentOf = (s) => Object.values(ownPts(s)).reduce((a, b) => a + (b | 0), 0);
export const tpMaxHp = (s) => Math.round((10 + 3 * (tpLevel(s) - 1)) * (1 + 0.08 * rank(s, 'fortitude')));
export const rank = (s, id) => Math.min(TALENTS.find((t) => t.id === id)?.max ?? 0, ownPts(s)[id] | 0);

// the tree: four tiers, each opens at points spent (0 / 5 / 10 / 15); [row, col] place it on the panel
export const TIER_AT = [0, 5, 10, 15];
export const TALENTS = [
  { id: 'impact',      tier: 0, col: 0, max: 5, icon: '⚔', name: 'Impact',       desc: (r) => `+${4 * r}% damage.` },
  { id: 'swiftness',   tier: 0, col: 1, max: 3, icon: '⏱', name: 'Swiftness',    desc: (r) => `+${3 * r}% haste: a faster global cooldown and casts.` },
  { id: 'precision',   tier: 0, col: 2, max: 3, icon: '🎯', name: 'Precision',    desc: (r) => `+${2 * r}% critical strike chance.` },
  { id: 'quickening',  tier: 1, col: 0, max: 3, icon: '✦', name: 'Quickening',   desc: (r) => `Cast times ${8 * r}% shorter.` },
  { id: 'fortitude',   tier: 1, col: 1, max: 3, icon: '❤', name: 'Fortitude',    desc: (r) => `+${8 * r}% maximum health.` },
  { id: 'opportunist', tier: 1, col: 2, max: 2, icon: '✺', name: 'Opportunist',  desc: (r) => `+${5 * r}% chance a hit procs an instant cast.` },
  { id: 'momentum',    tier: 2, col: 0, max: 2, icon: '💥', name: 'Momentum',     desc: (r) => `Critical strikes deal +${10 * r}% more.` },
  { id: 'ironskin',    tier: 2, col: 1, max: 2, icon: '🛡', name: 'Iron Skin',    desc: (r) => `Defensive cooldown ${15 * r}% shorter, and it blocks ${10 * r}% more.` },
  { id: 'secondwind',  tier: 2, col: 2, max: 2, icon: '✋', name: 'Quick Hands',  desc: (r) => `Interrupt cooldown ${3 * r}s shorter.` },
  { id: 'spellstride', tier: 3, col: 0, max: 1, icon: '👣', name: 'Spellstride',  desc: () => 'Moving no longer breaks your casts.' },
  { id: 'apex',        tier: 3, col: 2, max: 1, icon: '👑', name: 'Apex',         desc: () => '+10% damage, and procs wait 15 s instead of 10.' },
];
// can this rank be bought now: a point free, the tier open, below max
export function canLearn(s, id) {
  const t = TALENTS.find((x) => x.id === id); if (!t || !tpOn(s)) return false;
  return rank(s, id) < t.max && spentOf(s) < tpPoints(s) && spentOf(s) >= TIER_AT[t.tier];
}
// what the talents do to a cast, folded into one row class-cast-player.js reads
export function tpMods(s) {
  const r = (id) => rank(s, id);
  return {
    dmg: 1 + 0.04 * r('impact') + 0.1 * r('apex'),
    haste: 3 * r('swiftness'),
    crit: 0.02 * r('precision'),
    critMul: 0.1 * r('momentum'),
    castMul: 1 - 0.08 * r('quickening'),
    proc: 0.05 * r('opportunist'),
    procMs: r('apex') ? 15000 : 10000,
    defCdMul: 1 - 0.15 * r('ironskin'), wardAdd: 0.1 * r('ironskin'),
    kickCdCut: 3000 * r('secondwind'),
    stride: r('spellstride') > 0,
  };
}

// each class's tree wears its own names and painted icons over the same eleven nodes (order = TALENTS: impact, swiftness, precision,
// quickening, fortitude, opportunist, momentum, ironskin, secondwind, spellstride, apex); [name, icon cell on the class sheet]
const TREE = {
  vwarrior: [['Deep Wounds', 2], ['Flurry', 5], ['Cruelty', 4], ['Improved Heroic Strike', 0], ['Toughness', 11], ['Sudden Death', 3], ['Impale', 1], ['Shield Specialization', 15], ['Improved Pummel', 9], ['Sweeping Strikes', 7], ['Death Wish', 12]],
  vpaladin: [['Divine Strength', 9], ['Benediction', 2], ['Conviction', 0], ['Divine Intellect', 1], ['Toughness', 13], ['Illumination', 5], ['Vengeance', 10], ['Guardian\'s Favor', 15], ['Improved Hammer', 3], ['Blessed Footing', 6], ['Repentance', 14]],
  vhunter: [['Lethal Shots', 1], ['Swift Aspect', 6], ['Mortal Shots', 0], ['Improved Aimed Shot', 3], ['Endurance Training', 13], ['Trueshot Aura', 2], ['Killer Instinct', 8], ['Deflection', 15], ['Improved Concussion', 5], ['Hunter vs. Wild', 9], ['Bestial Wrath', 13]],
  vrogue: [['Malice', 0], ['Lightning Reflexes', 13], ['Precision', 2], ['Improved Sinister Strike', 6], ['Endurance', 15], ['Relentless Strikes', 1], ['Lethality', 4], ['Deflection', 7], ['Improved Kick', 9], ['Camouflage', 5], ['Cold Blood', 14]],
  vpriest: [['Spiritual Guidance', 4], ['Meditation', 7], ['Shadow Focus', 1], ['Improved Smite', 0], ['Inner Fire', 13], ['Shadow Weaving', 2], ['Holy Specialization', 6], ['Improved Shield', 13], ['Silent Resolve', 15], ['Spirit of Redemption', 11], ['Shadowform', 3]],
  vshaman: [['Concussion', 0], ['Elemental Focus', 13], ['Call of Thunder', 1], ['Tidal Mastery', 8], ['Toughness', 15], ['Elemental Mastery', 6], ['Elemental Fury', 3], ['Ancestral Healing', 9], ['Improved Earth Shock', 2], ['Ghost Wolf', 13], ['Stormstrike', 5]],
  vmage: [['Fire Power', 0], ['Arcane Mind', 15], ['Critical Mass', 3], ['Improved Fireball', 5], ['Ice Shards', 15], ['Clearcasting', 2], ['Ignite', 9], ['Improved Ice Barrier', 6], ['Improved Counterspell', 13], ['Arcane Concentration', 14], ['Combustion', 11]],
  vwarlock: [['Bane', 0], ['Demonic Speed', 7], ['Devastation', 11], ['Improved Shadow Bolt', 4], ['Demonic Embrace', 15], ['Nightfall', 2], ['Ruin', 12], ['Soul Link', 14], ['Improved Fear', 10], ['Shadow Mastery', 3], ['Conflagrate', 13]],
  vdruid: [['Moonfury', 2], ['Feline Swiftness', 14], ['Sharpened Claws', 6], ['Improved Wrath', 0], ['Thick Hide', 15], ['Omen of Clarity', 10], ['Predatory Strikes', 7], ['Natural Shapeshifter', 9], ['Feral Charge', 11], ['Nature\'s Grace', 1], ['Moonkin Form', 4]],
};
export function talentsOf(mode) {
  const t = TREE[mode]; if (!t) return TALENTS;
  return TALENTS.map((x, i) => ({ ...x, name: t[i]?.[0] ?? x.name, cell: t[i]?.[1] }));
}
