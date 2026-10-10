// Mining (OSRS wiki, fetched 2026-10-05). Every tuned number lives here; imports nothing.
// Success per attempt is OSRS's skilling formula: P(L) = (1 + floor(low*(99-L)/98 + high*(L-1)/98 + 0.5)) / 256, clamped to 0..1.
// low/high are fitted to the wiki's published chances (copper 39.45 % at 1, 88.28 % at 50; iron 38 % / 137 %; coal 16.4 / 23 / 31.25 / 39.5 %).
// Mithril, adamant and runite lows are derived from three published points each and are good to 1/256.
// The pickaxe sets how often you swing (ticks), never the chance. A rock always empties on a successful ore, then regrows.
export const MN = {
  on: true,
  reach: 3.2,      // m from a rock you can mine from
  moveStop: 0.3,   // m of walking that cancels the swing
  pickPerp: 1.3,   // m a click ray may miss a rock by
};

// rocks: one row per ore. respawn in seconds (copper/tin 4 ticks, iron 9, coal 50, mithril 200, adamant 400, runite 1200 ticks)
export const ROCKS = [
  { id: 'copper',  name: 'Copper rock',  ore: 'ore-copper',  level: 1,  xp: 17.5, low: 100, high: 350, respawn: 2.4,  color: '#b8693a' },
  { id: 'tin',     name: 'Tin rock',     ore: 'ore-tin',     level: 1,  xp: 17.5, low: 100, high: 350, respawn: 2.4,  color: '#a7adb3' },
  { id: 'iron',    name: 'Iron rock',    ore: 'ore-iron',    level: 15, xp: 35,   low: 96,  high: 350, respawn: 5.4,  color: '#6e4a3a' },
  { id: 'coal',    name: 'Coal rock',    ore: 'ore-coal',    level: 30, xp: 50,   low: 16,  high: 100, respawn: 30,   color: '#2f2f33' },
  { id: 'mithril', name: 'Mithril rock', ore: 'ore-mithril', level: 55, xp: 80,   low: 4,   high: 50,  respawn: 120,  color: '#4f66a8' },
  { id: 'adamant', name: 'Adamantite rock', ore: 'ore-adamant', level: 70, xp: 95, low: 2,  high: 25,  respawn: 240,  color: '#4f8a5b' },
  { id: 'runite',  name: 'Runite rock',  ore: 'ore-runite',  level: 85, xp: 125,  low: 1,   high: 18,  respawn: 720,  color: '#4fb3c4' },
];

// pickaxes: level to use, ticks per swing (0.6 s tick; the dragon pick is 3 ticks with a 1-in-6 two-tick swing, taken as 3)
export const PICKS = [
  { id: 'pick-bronze',  name: 'Bronze pickaxe',  level: 1,  ticks: 8, color: '#b0743c' },
  { id: 'pick-iron',    name: 'Iron pickaxe',    level: 1,  ticks: 7, color: '#8a8784' },
  { id: 'pick-steel',   name: 'Steel pickaxe',   level: 6,  ticks: 6, color: '#c3c7cc' },
  { id: 'pick-black',   name: 'Black pickaxe',   level: 11, ticks: 5, color: '#2b2b30' },
  { id: 'pick-mithril', name: 'Mithril pickaxe', level: 21, ticks: 5, color: '#4f66a8' },
  { id: 'pick-adamant', name: 'Adamant pickaxe', level: 31, ticks: 4, color: '#4f8a5b' },
  { id: 'pick-rune',    name: 'Rune pickaxe',    level: 41, ticks: 3, color: '#4fb3c4' },
  { id: 'pick-dragon',  name: 'Dragon pickaxe',  level: 61, ticks: 3, color: '#a8312c' },
];

// pack items this skill adds (merged into ITEMS in data/skills.js)
export const MINING_ITEMS = {
  ...Object.fromEntries(ROCKS.map((r) => [r.ore, { name: `${r.id === 'adamant' ? 'Adamantite' : r.id[0].toUpperCase() + r.id.slice(1)} ore`, color: r.color, glyph: 'o' }])),
  ...Object.fromEntries(PICKS.map((p) => [p.id, { name: p.name, color: p.color, glyph: 'P', pick: p.id }])),
};
