import { GATHER_FOOD } from './gather.js';
import { ARROWS, BOWS } from "./fletch.js";
import { EQUIP, STYLE_SETS } from "./equip.js";
import { SPELLS_ALL } from "./spells.js";
// COMBAT (MMO prompt 3/6, 2026-10-01). Every tuned number for combat lives here.
export const CB = {
  on: true,
  tickSec: 0.6,
  hpStartTenths: 11540,      // Hitpoints starts at level 10
  regenHpSec: 60,            // 1 HP per 60 s
  leash: 25,                 // m: a target farther than this drops the fight
  sounds: {
    swing: "/cdn/moodboard-lowpoly-cozy/sfx-sword-swing-whoosh.mp3",
    hit: "/cdn/moodboard-lowpoly-cozy/sfx-straw-dummy-thud-hit.mp3",
    bow: "/cdn/moodboard-lowpoly-cozy/sfx-bow-release-twang.mp3",
    spell: "/cdn/moodboard-lowpoly-cozy/sfx-magic-spell-cast-whoosh.mp3",
    eat: "/cdn/moodboard-lowpoly-cozy/sfx-eat-food-crunch.mp3",
    nomana: "/cdn/moodboard-lowpoly-cozy/sfx-spell-fizzle-fail.mp3",
  },
};

// weapons, built from the equipment table (data/equip.js, OSRS's numbers): speed in ticks; range in m; bonus = attack bonus per attack type; str = strength bonus.
// melee weapons carry their own styles (an attack type each); ranged and magic use STYLES below. bow:true = ranged weapon that needs its Ranged level.
const FISTS = { id: "unarmed", name: "Fists", kind: "melee", speed: 4, range: 2.4, atk: 0, str: 0, set: "unarmed", styles: STYLE_SETS.unarmed, bonus: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 } };
export const WEAPONS = [
  FISTS,
  ...Object.entries(EQUIP).filter(([, e]) => e.slot === "weapon").map(([id, e]) => ({ id, name: e.name, kind: e.kind, speed: e.speed, range: e.range, atk: e.kind === "magic" ? e.atk.magic : 0, str: e.str, set: e.set, styles: e.kind === "melee" ? STYLE_SETS[e.set] : undefined, bonus: e.atk, twoHanded: !!e.twoHanded })),
  // the bows are Fletching's (data/fletch.js): shortbows every 4 ticks, longbows every 6 with +3 m reach; wield needs the Ranged level; all two-handed
  ...BOWS.map((b) => ({ id: b.id, name: b.name, kind: "ranged", speed: b.speed, range: b.range, atk: b.atk, str: 0, wield: b.wield, bow: true, twoHanded: true, bonus: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: b.atk } })),
];
export const ARROW = { id: "arrows-bronze", name: "Bronze arrows", rangedStr: ARROWS[0].str }; // the fallback; a shot uses your best arrows (fletch-core bestArrow)
export const BOW_ALIAS = { shortbow: "bow-oak-short", longbow: "bow-oak-long" }; // pre-Fletching saves

// styles: bonus to effective levels; xp = per damage, in XP (tenths are taken at the end)
export const STYLES = {
  melee: [
    { id: "accurate",   name: "Accurate",   boost: { attack: 3 },   xp: { attack: 4 } },
    { id: "aggressive", name: "Aggressive", boost: { strength: 3 }, xp: { strength: 4 } },
    { id: "defensive",  name: "Defensive",  boost: { defence: 3 },  xp: { defence: 4 } },
    { id: "controlled", name: "Controlled", boost: { attack: 1, strength: 1, defence: 1 }, xp: { attack: 4 / 3, strength: 4 / 3, defence: 4 / 3 } },
  ],
  ranged: [
    { id: "accurate",  name: "Accurate",  boost: { ranged: 3 }, xp: { ranged: 4 } },
    { id: "rapid",     name: "Rapid",     boost: {}, xp: { ranged: 4 }, speed: -1 },
    { id: "longrange", name: "Longrange", boost: { defence: 3 }, xp: { ranged: 2, defence: 2 }, range: 3 }, // +2 tiles ≈ +3 m
  ],
  magic: [
    { id: "autocast", name: "Autocast", boost: {}, xp: {} },
    { id: "defensive-autocast", name: "Defensive autocast", boost: {}, xp: { magic: 4 / 3, defence: 1 } }, // OSRS s36: 1.33 Magic + 1 Defence per damage (+ the spell's base XP, + 1.33 HP)
  ],
};
export const HP_XP_PER_DMG = 4 / 3;

// the autocast list: every OSRS attack spell the den can cast (Strike to Surge), straight from data/spells.js; costs are runes, never mana
export const SPELLS = SPELLS_ALL.filter((s) => s.kind === "attack" && s.den === "yes").map((s) => ({ id: s.id, name: s.name, level: s.level, maxHit: s.max, max: s.max, xp: s.xp, color: s.color, runes: s.runes, tier: s.tier, elem: s.elem }));

export const FOOD = { ...GATHER_FOOD, "bread": { name: "Bread", heal: 5, color: "#d9a85a" }, "banana": { name: "Banana", heal: 2, color: "#f0d64a" }, "peach": { name: "Peach", heal: 8, color: "#f2a07a" } }; // cooked fish from data/gather.js (trout heals 7)

// the training dummy: an enemy that never fights back
export const DUMMY = { hp: 60, defence: 1, magic: 1, defBonus: 0, magicDefBonus: 0, rangedDefBonus: 0, resetSec: 4, healIdleSec: 8 };

