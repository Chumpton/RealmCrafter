import { MON_ITEMS } from './monsters.js';
import { EQUIP_ITEMS } from './equip.js';
import { SHOP_ITEMS } from './shop.js';
import { FLETCH_ITEMS } from './fletch.js';
import { GATHER_ITEMS } from './gather.js';
import { BONE_ITEMS } from './bones.js';
import { MINING_ITEMS } from './mining.js';
import { SMITH_ITEMS } from './smith.js';
import { CRAFT_ITEMS } from './craft.js';
// SKILLS-WC (creator GO 2026-10-01 over CONTESTED 1/7). Every tuned number for the skill system lives here.
export const SK = {
  on: true,            // off switch: false hides the grove, stops chopping, hides the Skills tab; saves are never touched
  v: 1,                // row version
  tickSec: 0.6,        // the global game tick
  invSlots: 28,
  maxTenths: 2000000000, // 200,000,000 XP
  xpMult: 1,           // one global XP multiplier for balancing (research doc phase 5); 1 = OSRS pace
  reach: 4.5,          // m from the trunk you can chop from
  moveStop: 0.3,       // m of movement that cancels the chop
  idleRefillMs: 3000,  // no attempt this long = the depletion clock refills
  grove: "grove",      // the manager row's id
};

export const SKILL_LIST = [
  { id: "woodcutting", name: "Woodcutting", icon: "🪓" },
  { id: "running", name: "Running", icon: "👟" },
  { id: "jumping", name: "Jumping", icon: "⤴" },
  { id: "attack", name: "Attack", icon: "⚔️" },
  { id: "strength", name: "Strength", icon: "💪" },
  { id: "defence", name: "Defence", icon: "🛡️" },
  { id: "hitpoints", name: "Hitpoints", icon: "❤️" },
  { id: "ranged", name: "Ranged", icon: "🏹" },
  { id: "magic", name: "Magic", icon: "✨" },
  { id: "fishing", name: "Fishing", icon: "🎣" },
  { id: "cooking", name: "Cooking", icon: "🍳" },
  { id: "firemaking", name: "Firemaking", icon: "🔥" },
  { id: "fletching", name: "Fletching", icon: "🪶" },
  { id: "prayer", name: "Prayer", icon: "🙏" },
  { id: "mining", name: "Mining", icon: "⛏️" },
  { id: "smithing", name: "Smithing", icon: "🔨" },
  { id: "crafting", name: "Crafting", icon: "🧵" },
];

// axes: low/high are on a Normal tree; color tints the head
export const AXES = [
  { id: "axe-bronze",  name: "Bronze axe",  levelReq: 1,  low: 64,  high: 200, color: "#b0743c" },
  { id: "axe-iron",    name: "Iron axe",    levelReq: 1,  low: 96,  high: 300, color: "#8a8784" },
  { id: "axe-steel",   name: "Steel axe",   levelReq: 6,  low: 128, high: 400, color: "#c3c7cc" },
  { id: "axe-black",   name: "Black axe",   levelReq: 11, low: 144, high: 450, color: "#2b2b30" },
  { id: "axe-mithril", name: "Mithril axe", levelReq: 21, low: 160, high: 500, color: "#4f66a8" },
  { id: "axe-adamant", name: "Adamant axe", levelReq: 31, low: 192, high: 600, color: "#4f8a5b" },
  { id: "axe-rune",    name: "Rune axe",    levelReq: 41, low: 224, high: 700, color: "#4fb3c4" },
  { id: "axe-dragon",  name: "Dragon axe",  levelReq: 61, low: 240, high: 750, color: "#c2332d" },
];

// one row per action: { id, skill, levelReq, xp, low, high, ticksPerAttempt, toolType, depletion, respawnSeconds, reward }
// low/high here are the tree's divisor applied to the axe's values (1 = Normal, 2 Oak … 32 Magic)
const tree = (kind, name, levelReq, xp, div, depletion) => ({
  id: `wc-${kind}`, skill: "woodcutting", kind, name, levelReq, xp, low: 1 / div, high: 1 / div,
  ticksPerAttempt: 4, toolType: "axe", depletion, respawnSeconds: [30, 60], reward: { item: `logs-${kind}`, qty: 1 },
});
export const ACTIONS = [
  tree("normal", "Tree",        1,  25,   1,  { kind: "one" }),
  tree("oak",    "Oak",         15, 37.5, 2,  { kind: "timer", seconds: 27 }),
  tree("willow", "Willow",      30, 67.5, 4,  { kind: "timer", seconds: 30 }),
  tree("maple",  "Maple",       45, 100,  8,  { kind: "timer", seconds: 60 }),
  tree("yew",    "Yew",         60, 175,  16, { kind: "timer", seconds: 114 }),
  tree("magic",  "Magic tree",  75, 250,  32, { kind: "timer", seconds: 234 }),
  tree("redwood", "Redwood",    90, 380,  64, { kind: "timer", seconds: 264 }), // the research doc's table (2026-10-01): Firemaking already burns redwood logs, so the grove grows them
];

export const ITEMS = {
  "logs-normal": { name: "Logs", color: "#a87a4a" }, "logs-oak": { name: "Oak logs", color: "#9a6b3c" },
  "logs-willow": { name: "Willow logs", color: "#8f8a52" }, "logs-maple": { name: "Maple logs", color: "#b0582e" },
  "logs-yew": { name: "Yew logs", color: "#6e4a2e" }, "logs-magic": { name: "Magic logs", color: "#5dada9" }, "logs-redwood": { name: "Redwood logs", color: "#8a3a2a" },
  ...GATHER_ITEMS,
  ...FLETCH_ITEMS,
  ...BONE_ITEMS,
  ...MINING_ITEMS,
  ...SMITH_ITEMS,
  ...CRAFT_ITEMS,
  ...MON_ITEMS,
  ...EQUIP_ITEMS,
  ...SHOP_ITEMS,
  "trout": { name: "Trout", color: "#c98a5a", food: 7, cooked: true }, "bread": { name: "Bread", color: "#d9a85a", food: 5 }, "banana": { name: "Banana", color: "#f0d64a", food: 2 }, "peach": { name: "Peach", color: "#f2a07a", food: 8 }, // OSRS heals (banana 2, peach 8) are from memory, not checked
  ...Object.fromEntries(AXES.map((a) => [a.id, { name: a.name, color: a.color, tool: "axe" }])),
};

// the grove: 18 trees around (36, 26), ground measured ~24.2
export const GROVE_TREES = [
  ["t-n1", "normal", 27, 20], ["t-n2", "normal", 30, 17], ["t-n3", "normal", 25, 25], ["t-n4", "normal", 31, 23], ["t-n5", "normal", 28, 29], ["t-n6", "normal", 33, 19],
  ["t-o1", "oak", 36, 22], ["t-o2", "oak", 34, 28], ["t-o3", "oak", 39, 18], ["t-o4", "oak", 31, 33],
  ["t-w1", "willow", 41, 25], ["t-w2", "willow", 38, 32], ["t-w3", "willow", 44, 21],
  ["t-m1", "maple", 42, 30], ["t-m2", "maple", 46, 26],
  ["t-y1", "yew", 47, 33], ["t-y2", "yew", 49, 22],
  ["t-g1", "magic", 44, 37],
  ["t-r1", "redwood", 52, 30],
  // the logging camp on the mountain above the sawmill (2026-10-06): a working stand, normals by the skid road, the old growth higher up
  ["lc-n1", "normal", 268, 392], ["lc-n2", "normal", 273, 384], ["lc-n3", "normal", 264, 412], ["lc-n4", "normal", 276, 420],
  ["lc-o1", "oak", 283, 396], ["lc-o2", "oak", 286, 412], ["lc-o3", "oak", 280, 380],
  ["lc-w1", "willow", 291, 424], ["lc-w2", "willow", 294, 388],
  ["lc-m1", "maple", 298, 404], ["lc-m2", "maple", 302, 418],
  ["lc-y1", "yew", 306, 396], ["lc-y2", "yew", 309, 431],
].map(([id, kind, x, z]) => ({ id, kind, x, z }));

export const SOUNDS = {
  chop: "/cdn/moodboard-lowpoly-cozy/sfx-axe-chop-wood.mp3",
  fall: "/cdn/moodboard-lowpoly-cozy/sfx-tree-creak-fall.mp3",
  log: "/cdn/moodboard-lowpoly-cozy/sfx-log-pickup-pop.mp3",
  level: "/cdn/moodboard-lowpoly-cozy/sfx-level-up-horn-fanfare.mp3",
  full: "/cdn/moodboard-lowpoly-cozy/sfx-inventory-full-thud.mp3",
};
