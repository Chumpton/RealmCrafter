// Crafting (OSRS wiki + docs/board/OSRS-RESEARCH.md section 27): tan hides at a tanner, sew leather gear with a needle and thread. Imports nothing.
// Recipe rows share make-core.js with Smithing. Spinning flax into bow strings waits for a flax patch and a spinning wheel in the world.
export const CR = {
  on: true,
  ticks: 3,        // 0.6 s ticks per item sewn
  threadPer: 5,    // one thread is used up for every 5 items sewn (the needle never breaks)
};
export const CRAFT_ITEMS = {
  needle: { name: 'Needle', color: '#b9bec4', glyph: 'n' }, thread: { name: 'Thread', color: '#d8cfc0', glyph: 't' },
  leather: { name: 'Leather', color: '#9a6a3c' }, 'hard-leather': { name: 'Hard leather', color: '#6e4a2a' },
};
// [item id, name, Crafting level, XP, hide used]
const LEATHER = [
  ['leather-gloves', 'Leather gloves', 1, 13.8], ['leather-boots', 'Leather boots', 7, 16.25], ['leather-cowl', 'Leather cowl', 9, 18.5], ['leather-vambraces', 'Leather vambraces', 11, 22],
  ['leather-body', 'Leather body', 14, 25], ['leather-chaps', 'Leather chaps', 18, 27], ['hard-leather-body', 'Hard leather body', 28, 35, 'hard-leather'], ['coif', 'Coif', 38, 37],
];
// station 'craft' = no object, you sew from your pack (click the needle or a hide)
export const CRAFT = LEATHER.map(([id, name, level, xp, hide = 'leather']) => ({ id: `craft-${id}`, skill: 'crafting', station: 'craft', tool: ['needle', 'thread'], thread: true, name, level, xp, use: { [hide]: 1 }, make: { [id]: 1 } }));
// the tanner (Ellis's prices): coins per hide, no skill, no XP
export const TAN = [
  { id: 'tan-leather', station: 'tanner', name: 'Leather', level: 1, xp: 0, coins: 1, use: { cowhide: 1 }, make: { leather: 1 } },
  { id: 'tan-hard-leather', station: 'tanner', name: 'Hard leather', level: 1, xp: 0, coins: 3, use: { cowhide: 1 }, make: { 'hard-leather': 1 } },
];
