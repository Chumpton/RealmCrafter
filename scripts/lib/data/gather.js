// MMO prompt 4/6: Fishing, Cooking, Firemaking. Every tuned number for the three skills lives here.
// Same data-driven pattern as Woodcutting: one row per action. Imports nothing (skills.js and combat.js read it).
export const GA = {
  on: true,
  fishTicks: 5, cookTicks: 4, fireTicks: 4,     // 0.6 s ticks per attempt
  fishReach: 6.5,        // m from the spot you can fish from (it sits ~2.5 m out in the water)
  cookReach: 2.2,        // m from a fire
  spotMoveSec: [180, 360], // spots move every 3-6 minutes, never deplete
  fireSec: [60, 119], // OSRS: 60-119 s for every log (research doc) ashSec: 60,
  stepTile: 1,           // m, the "tile" a firemaker steps west
  supplyTop: { bait: 200, feathers: 200, sbait: 60 },
  pickPerp: { spot: 1.8, fire: 0.9, crate: 1.1 }, pickDist: 16,
};

// fish: { id, name, level, xp, tool, supply }
export const FISH = [
  { id: "shrimp",     name: "Shrimps",    level: 1,  xp: 10,  tool: "small-net" },
  { id: "sardine",    name: "Sardine",    level: 5,  xp: 20,  tool: "fishing-rod", supply: "bait" },
  { id: "herring",    name: "Herring",    level: 10, xp: 30,  tool: "fishing-rod", supply: "bait" },
  { id: "anchovies",  name: "Anchovies",  level: 15, xp: 40,  tool: "small-net" },
  { id: "trout",      name: "Trout",      level: 20, xp: 50,  tool: "fly-rod", supply: "feathers" },
  { id: "pike",       name: "Pike",       level: 25, xp: 60,  tool: "fishing-rod", supply: "bait" },
  { id: "salmon",     name: "Salmon",     level: 30, xp: 70,  tool: "fly-rod", supply: "feathers" },
  { id: "tuna",       name: "Tuna",       level: 35, xp: 80,  tool: "harpoon" },
  { id: "lobster",    name: "Lobster",    level: 40, xp: 90,  tool: "lobster-pot" },
  { id: "swordfish",  name: "Swordfish",  level: 50, xp: 100, tool: "harpoon" },
  { id: "monkfish",   name: "Monkfish",   level: 62, xp: 120, tool: "small-net" },
  { id: "shark",      name: "Shark",      level: 76, xp: 110, tool: "harpoon" },
  { id: "anglerfish", name: "Anglerfish", level: 82, xp: 120, tool: "fishing-rod", supply: "sbait" },
];
// a spot holds several fish
export const SPOT_KINDS = {
  "net-bait":     { label: "Net · Bait",     fish: ["shrimp", "sardine", "herring", "anchovies"] },
  "lure-bait":    { label: "Lure · Bait",    fish: ["trout", "pike", "salmon"] },
  "cage-harpoon": { label: "Cage · Harpoon", fish: ["tuna", "lobster", "swordfish"] },
  "deep":         { label: "Deep sea",       fish: ["monkfish", "shark", "anglerfish"] },
};
// meat from the starter pens (S11/S12): cooked like fish, never caught at a spot
export const MEAT = [{ id: "chicken", name: "Chicken" }, { id: "beef", name: "Beef" }];
// cooking, OSRS's exact rule: P(cook) = min(1, (1 + floor(low*(99-L)/98 + high*(L-1)/98 + 0.5)) / 256), one low/high pair per heat source
// (fire = a player's fire, hearth = the long hearth, which cooks like the Lumbridge range). Burnt food gives no XP.
export const cookP = (level, lo, hi) => { const L = Math.max(1, Math.min(99, level)); return Math.min(1, (1 + Math.floor(lo * (99 - L) / 98 + hi * (L - 1) / 98 + 0.5)) / 256); };
// rows: [id, level, xp, heals, fireLow, fireHigh, hearthLow, hearthHigh, canOverheal]
export const COOK = [
  ["chicken", 1, 30, 3, 128, 512, 138, 532], ["beef", 1, 30, 3, 128, 512, 138, 532],
  ["shrimp", 1, 30, 3, 128, 512, 138, 532], ["sardine", 1, 40, 4, 118, 492, 128, 512], ["anchovies", 1, 30, 1, 128, 512, 138, 532], ["herring", 5, 50, 5, 108, 472, 118, 492],
  ["trout", 15, 70, 7, 88, 432, 98, 452], ["pike", 20, 80, 8, 78, 412, 88, 432], ["salmon", 25, 90, 9, 68, 392, 78, 402], ["tuna", 30, 100, 10, 58, 372, 58, 372],
  ["lobster", 40, 120, 12, 38, 332, 38, 332], ["swordfish", 45, 140, 14, 18, 292, 30, 310], ["monkfish", 62, 150, 16, 11, 275, 13, 280], ["shark", 80, 210, 20, 1, 202, 1, 232],
  ["anglerfish", 84, 230, 22, 1, 200, 1, 220, true],
].map(([id, level, xp, heal, fl, fh, hl, hh, over]) => {
  let stopBurn = 0; for (let L = level; L <= 99; L++) if (cookP(L, fl, fh) >= 1) { stopBurn = L; break; } // first level that never burns on a fire (0 = never)
  return { id, level, xp, heal, fire: [fl, fh], hearth: [hl, hh], stopBurn, over: !!over };
});
// firemaking: { log kind, level, xp }
export const LOGS_FM = [
  ["normal", 1, 40], ["oak", 15, 60], ["willow", 30, 90], ["maple", 45, 135], ["yew", 60, 202.5], ["magic", 75, 303.8], ["redwood", 90, 350],
].map(([kind, level, xp]) => ({ kind, id: `logs-${kind}`, level, xp }));

export const TOOLS = [
  { id: "small-net", name: "Small fishing net", color: "#c9b48a", glyph: "N" },
  { id: "fishing-rod", name: "Fishing rod", color: "#8a6a44", glyph: "R" },
  { id: "fly-rod", name: "Fly fishing rod", color: "#6f8a54", glyph: "F" },
  { id: "harpoon", name: "Harpoon", color: "#9aa3ab", glyph: "H" },
  { id: "lobster-pot", name: "Lobster pot", color: "#a0603a", glyph: "L" },
  { id: "tinderbox", name: "Tinderbox", color: "#5a4a3c", glyph: "T" },
];
export const SUPPLY_NAMES = { bait: "Fishing bait", feathers: "Feathers", sbait: "Special bait" };

const FISH_COL = { chicken: "#e6b89a", beef: "#b8453a", shrimp: "#e8907a", sardine: "#9fb3c0", herring: "#a9b8a8", anchovies: "#8fa0b8", trout: "#c98a5a", pike: "#8a9a5a", salmon: "#e08a6a", tuna: "#6a7fa0", lobster: "#c8503a", swordfish: "#7a96b0", monkfish: "#9a8a6a", shark: "#8a96a0", anglerfish: "#6a5a7a" };
const cookOf = (id) => COOK.find((c) => c.id === id);
export const GATHER_ITEMS = {
  ...Object.fromEntries(TOOLS.map((t) => [t.id, { name: t.name, color: t.color, glyph: t.glyph, tool: t.id === "tinderbox" ? "tinderbox" : "fish" }])),
  ...Object.fromEntries([...FISH, ...MEAT].map((f) => [`raw-${f.id}`, { name: `Raw ${f.name.toLowerCase()}`, color: FISH_COL[f.id], raw: f.id }])),
  ...Object.fromEntries([...FISH, ...MEAT].map((f) => [f.id, { name: f.name, color: FISH_COL[f.id], food: cookOf(f.id)?.heal ?? 1, cooked: true }])),
  ...Object.fromEntries([...FISH, ...MEAT].map((f) => [`burnt-${f.id}`, { name: `Burnt ${f.name.toLowerCase()}`, color: "#2b2420", burnt: true }])),
  "logs-redwood": { name: "Redwood logs", color: "#8a3a2a" },
};
export const GATHER_FOOD = Object.fromEntries(COOK.map((c) => [c.id, { name: [...FISH, ...MEAT].find((f) => f.id === c.id).name, heal: c.heal, over: c.over, color: FISH_COL[c.id] }]));

// where spots may stand: the beach line (z measured 2.5 m out from the waterline at placement) and beside the jetty
export const SPOT_SITES = {
  shore: [[-34, -80.5], [-28, -78.5], [-22, -76.5], [-16, -74.5], [-4, -73.5], [2, -74.5], [8, -75.5], [14, -76.5]],
  jetty: [[-15.2, -79], [-15.2, -84.5], [-8, -79], [-8, -84.5], [-11.6, -89]],
};
// cooking ranges: placed rows that cook like a range (stopBurn - 5), with their reach
export const RANGES = { "hall-hearth": { reach: 3.4, name: "the long hearth" } };

const S = "/cdn/moodboard-lowpoly-cozy/";
export const GSOUNDS = {
  cast: S + "sfx-fishing-line-cast-splash.mp3", catch: S + "sfx-fish-caught-wet-flop.mp3",
  sizzle: S + "sfx-fish-frying-sizzle.mp3", burn: S + "sfx-food-burnt-hiss-crackle.mp3",
  strike: S + "sfx-tinderbox-flint-strike.mp3", ignite: S + "sfx-campfire-ignite-whoosh.mp3",
  crackle: S + "sfx-campfire-crackle-loop.mp3", crate: S + "sfx-wooden-crate-rummage.mp3",
};
