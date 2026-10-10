// MMO prompt 5/6: Fletching + its link to Ranged. Every tuned number lives here. Imports nothing (skills.js, combat.js read it).
// Stackables (shafts, headless, feathers, strings, tips, arrows) ride player.state.supplies as counts; bows are pack slots.
export const FL = {
  on: true,
  ticks: 3,             // 0.6 s ticks per action; always succeeds
  batch: 15,            // shafts per log, headless / arrows per action
  chestSec: 60,         // a supply chest refills for you this long after you empty it
  chestGive: { feathers: 60, strings: 6, tips: 30 },
  starter: { bow: "bow-normal-short", arrows: 30 }, // a plain shortbow and 30 bronze arrows once, so Ranged works before you fletch
};

// woods: [kind, label, sb level, sb xp, lb level, lb xp, Ranged to wield, bow attack bonus]
const WOOD = [
  ["normal", "",        5, 5,    10, 10,   1,  8],
  ["oak",    "Oak ",    20, 16.5, 25, 25,  5,  14],
  ["willow", "Willow ", 35, 33.3, 40, 41.5, 20, 20],
  ["maple",  "Maple ",  50, 50,   55, 58.3, 30, 29],
  ["yew",    "Yew ",    65, 67.5, 70, 75,  40, 47],
  ["magic",  "Magic ",  80, 83.3, 85, 91.5, 50, 69],
];
export const BOW_SHAPE = { short: { speed: 4, range: 10 }, long: { speed: 6, range: 13 } }; // longbows +3 m reach
export const BOWS = WOOD.flatMap(([wood, label, sl, sx, ll, lx, wield, atk]) => [
  { id: `bow-${wood}-short`, wood, shape: "short", name: `${label}shortbow`.replace(/^s/, "S"), level: sl, xp: sx, wield, atk },
  { id: `bow-${wood}-long`,  wood, shape: "long",  name: `${label}longbow`.replace(/^l/, "L"), level: ll, xp: lx, wield, atk },
]).map((b) => ({ ...b, ...BOW_SHAPE[b.shape], log: `logs-${b.wood}`, unstrung: `u-${b.id}` }));

// arrows: [tier, level, xp per arrow, ranged strength, colour]
export const ARROWS = [
  ["bronze", 1, 1.3, 7, "#b0743c"], ["iron", 15, 2.5, 10, "#8a8784"], ["steel", 30, 5, 16, "#c3c7cc"],
  ["mithril", 45, 7.5, 22, "#4f66a8"], ["adamant", 60, 10, 31, "#4f8a5b"], ["rune", 75, 12.5, 49, "#4fb3c4"],
].map(([tier, level, xp, str, color]) => ({ tier, level, xp, str, color, tips: `tips-${tier}`, arrows: `arrows-${tier}`, name: tier[0].toUpperCase() + tier.slice(1) }));

// recipes: one row each. use = what it eats, make = what it gives; inv = a pack slot, sup = a supplies count.
// per: "unit" = xp once per action, "each" = xp per item made (batch up to FL.batch)
export const RECIPES = [
  { id: "shafts", name: "Arrow shafts", group: "logs-normal", level: 1, xp: 5, per: "unit", use: { inv: "logs-normal" }, make: { sup: "shafts", n: 15 } },
  ...BOWS.map((b) => ({ id: `cut-${b.id}`, name: `${b.name} (u)`, group: b.log, level: b.level, xp: b.xp, per: "unit", use: { inv: b.log }, make: { inv: b.unstrung } })),
  { id: "headless", name: "Headless arrows", group: "arrows", level: 1, xp: 1, per: "each", use: { sup: ["shafts", "feathers"] }, make: { sup: "headless" } },
  ...ARROWS.map((a) => ({ id: `arrows-${a.tier}`, name: `${a.name} arrows`, group: "arrows", level: a.level, xp: a.xp, per: "each", use: { sup: ["headless", a.tips] }, make: { sup: a.arrows } })),
  ...BOWS.map((b) => ({ id: `string-${b.id}`, name: b.name, group: "string", level: b.level, xp: b.xp, per: "unit", use: { inv: b.unstrung, sup: ["strings"] }, make: { inv: b.id } })),
];

export const FLETCH_SUPPLY_NAMES = {
  shafts: "Arrow shafts", headless: "Headless arrows", strings: "Bow strings",
  ...Object.fromEntries(ARROWS.flatMap((a) => [[a.tips, `${a.name} arrowtips`], [a.arrows, `${a.name} arrows`]])),
};
const WOODCOL = { normal: "#a87a4a", oak: "#9a6b3c", willow: "#8f8a52", maple: "#b0582e", yew: "#6e4a2e", magic: "#5dada9" };
export const FLETCH_ITEMS = {
  knife: { name: "Knife", color: "#9aa3ab", glyph: "K", tool: "knife" },
  ...Object.fromEntries(BOWS.flatMap((b) => [
    [b.id, { name: b.name, color: WOODCOL[b.wood], bow: b.id }],
    [b.unstrung, { name: `${b.name} (u)`, color: WOODCOL[b.wood], unstrung: b.id }],
  ])),
};
// supply chests in the yard: one row each, what it holds
export const CHESTS = [
  { id: "chest-feathers", give: "feathers", name: "Feather chest", at: { x: 13.2, z: 26.4 }, yaw: 60 },
  { id: "chest-strings",  give: "strings",  name: "Bowyer's chest", at: { x: 14.4, z: 30.6 }, yaw: 80 },
  { id: "chest-tips",     give: "tips",     name: "Smith's chest", at: { x: 16.8, z: 33.8 }, yaw: 110 },
];
const S = "/cdn/moodboard-lowpoly-cozy/";
export const FSOUNDS = { whittle: S + "sfx-knife-whittling-wood.mp3", string: S + "sfx-bowstring-stretch-twang.mp3", fletch: S + "sfx-arrow-feather-fletching.mp3", chest: S + "sfx-wooden-chest-creak-open.mp3" };
