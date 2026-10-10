// Smithing (OSRS wiki, fetched 2026-10-05): smelt ore into bars at a furnace, hammer bars into gear at an anvil. Imports nothing.
// Recipe row (shared with the generic make engine, make-core.js): { id, skill, station, level, xp, use: {item: n}, make: {item: n}, tool?, chance? }
export const SM = {
  on: true,
  ticks: 4,        // 0.6 s ticks per smelt or hammer strike
  reach: 4,        // m from the furnace / anvil you can work from
};

// tiers: the bar, the base level of its gear, XP per bar, and the ore (+ coal) one bar eats. Iron only holds 50 % of the time.
export const TIERS = [
  { id: 'bronze',  start: 0,  xpBar: 12.5, smelt: { level: 1,  xp: 6.2,  use: { 'ore-copper': 1, 'ore-tin': 1 } } },
  { id: 'iron',    start: 15, xpBar: 25,   smelt: { level: 15, xp: 12.5, use: { 'ore-iron': 1 }, chance: 0.5 } },
  { id: 'steel',   start: 30, xpBar: 37.5, smelt: { level: 30, xp: 17.5, use: { 'ore-iron': 1, 'ore-coal': 2 } } },
  { id: 'mithril', start: 50, xpBar: 50,   smelt: { level: 50, xp: 30,   use: { 'ore-mithril': 1, 'ore-coal': 4 } } },
  { id: 'adamant', start: 70, xpBar: 62.5, smelt: { level: 70, xp: 37.5, use: { 'ore-adamant': 1, 'ore-coal': 6 } } },
  { id: 'rune',    start: 85, xpBar: 75,   smelt: { level: 85, xp: 50,   use: { 'ore-runite': 1, 'ore-coal': 8 } } },
];
export const BAR = (tier) => (tier === 'rune' ? 'bar-rune' : `bar-${tier}`);
export const SMITH_ITEMS = Object.fromEntries(TIERS.map((t) => [BAR(t.id), { name: `${t.id[0].toUpperCase() + t.id.slice(1)} bar`, color: { bronze: '#b0743c', iron: '#8a8784', steel: '#c3c7cc', mithril: '#4f66a8', adamant: '#4f8a5b', rune: '#4fb3c4' }[t.id], glyph: 'b' }]));

// anvil gear: [type, bars, level above the tier's start, id builder]. level = min(99, max(1, start + offset)); XP = bars x the tier's XP per bar.
const ID = {
  dagger: (t) => `${t}-dagger`, axe: (t) => `axe-${t}`, mace: (t) => `${t}-mace`, medhelm: (t) => `${t}-med-helm`, sword: (t) => `${t}-sword`,
  scimitar: (t) => `${t}-scimitar`, longsword: (t) => `${t}-longsword`, fullhelm: (t) => `${t}-full-helm`, sqshield: (t) => `${t}-sq-shield`,
  warhammer: (t) => `${t}-warhammer`, battleaxe: (t) => `${t}-battleaxe`, chainbody: (t) => `${t}-chainbody`, kiteshield: (t) => `${t}-kiteshield`,
  platelegs: (t) => `${t}-platelegs`, twohand: (t) => `${t}-2h-sword`, platebody: (t) => `${t}-platebody`,
};
export const GEAR = [
  ['dagger', 1, 0], ['axe', 1, 1], ['mace', 1, 2], ['medhelm', 1, 3], ['sword', 1, 4], ['scimitar', 2, 5], ['longsword', 2, 6], ['fullhelm', 2, 7],
  ['sqshield', 2, 8], ['warhammer', 3, 9], ['battleaxe', 3, 10], ['chainbody', 3, 11], ['kiteshield', 3, 12], ['twohand', 3, 14], ['platelegs', 3, 16], ['platebody', 5, 18],
];
const NICE = { dagger: 'dagger', axe: 'axe', mace: 'mace', medhelm: 'med helm', sword: 'sword', scimitar: 'scimitar', longsword: 'longsword', fullhelm: 'full helm', sqshield: 'sq shield', warhammer: 'warhammer', battleaxe: 'battleaxe', chainbody: 'chainbody', kiteshield: 'kiteshield', platelegs: 'platelegs', twohand: '2h sword', platebody: 'platebody' };
export const SMELT = TIERS.map((t) => ({ id: `smelt-${t.id}`, skill: 'smithing', station: 'furnace', name: `${t.id[0].toUpperCase() + t.id.slice(1)} bar`, level: t.smelt.level, xp: t.smelt.xp, use: t.smelt.use, make: { [BAR(t.id)]: 1 }, chance: t.smelt.chance }));
// every OSRS anvil row; the window only offers the ones whose item exists in ITEMS (grows as equipment gains stats)
export const FORGE = TIERS.flatMap((t) => GEAR.map(([type, bars, off]) => ({
  id: `forge-${ID[type](t.id)}`, skill: 'smithing', station: 'anvil', tool: 'hammer', type, tier: t.id, name: `${t.id[0].toUpperCase() + t.id.slice(1)} ${NICE[type]}`,
  level: Math.min(99, Math.max(1, t.start + off)), xp: t.xpBar * bars, use: { [BAR(t.id)]: bars }, make: { [ID[type](t.id)]: 1 },
})));
