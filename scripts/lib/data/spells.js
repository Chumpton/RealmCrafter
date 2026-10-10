// THE OSRS STANDARD SPELLBOOK, 80 spells (OSRS's 84 less Tele Block, Teleport to Boat, Teleport to Target and Summon Boat; OSRS-PLAN P0, research s30-35). ONE table: the cast core, the book window,
// the action bar and the tooltips read it; it replaces data/combat.js SPELLS + data/spellbook.js BOOK/extra/POWERS (deleted at the P3 flip).
// Costs are runes (data/runes.js keys), never mana. den: 'yes' = castable by level; 'locked' = shown with a padlock + `lock` reason.
// Ids follow the old format (lowercase, dashes).
const R = (s) => Object.fromEntries(s.split(',').map((p) => { const [n, k] = p.trim().split(' '); return [k, +n]; }));
const id = (name) => name.toLowerCase().replace(/[ '-]+/g, '-');
const row = (o) => ({ den: 'yes', ...o, id: id(o.name) });

// kind 'attack': [name, level, runes, xp, base max hit, tier, element, den, lock]; tier + element drive the tier rule (maxHitFor)
const ATTACK = [
  ['Wind Strike', 1, '1 air,1 mind', 5.5, 2, 'strike', 'wind'], ['Water Strike', 5, '1 air,1 water,1 mind', 7.5, 4, 'strike', 'water'],
  ['Earth Strike', 9, '1 air,2 earth,1 mind', 9.5, 6, 'strike', 'earth'], ['Fire Strike', 13, '2 air,3 fire,1 mind', 11.5, 8, 'strike', 'fire'],
  ['Wind Bolt', 17, '2 air,1 chaos', 13.5, 9, 'bolt', 'wind'], ['Water Bolt', 23, '2 air,2 water,1 chaos', 16.5, 10, 'bolt', 'water'],
  ['Earth Bolt', 29, '2 air,3 earth,1 chaos', 19.5, 11, 'bolt', 'earth'], ['Fire Bolt', 35, '3 air,4 fire,1 chaos', 22.5, 12, 'bolt', 'fire'],
  ['Crumble Undead', 39, '2 air,2 earth,1 chaos', 24.5, 15, null, 'earth', 'locked', 'undead only, and the den has no undead yet'],
  ['Wind Blast', 41, '3 air,1 death', 25.5, 13, 'blast', 'wind'], ['Water Blast', 47, '3 air,3 water,1 death', 28.5, 14, 'blast', 'water'],
  ['Iban Blast', 50, '5 fire,1 death', 30, 25, null, 'fire', 'locked', "needs Iban's staff"],
  ['Magic Dart', 50, '1 death,4 mind', 30, 15, null, null, 'locked', "needs Slayer and a Slayer's staff"],
  ['Earth Blast', 53, '3 air,4 earth,1 death', 31.5, 15, 'blast', 'earth'], ['Fire Blast', 59, '4 air,5 fire,1 death', 34.5, 16, 'blast', 'fire'],
  ['Saradomin Strike', 60, '4 air,2 fire,2 blood', 35, 20, null, null, 'locked', 'needs a god staff'],
  ['Claws of Guthix', 60, '4 air,1 fire,2 blood', 35, 20, null, null, 'locked', 'needs a god staff'],
  ['Flames of Zamorak', 60, '1 air,4 fire,2 blood', 35, 20, null, null, 'locked', 'needs a god staff'],
  ['Wind Wave', 62, '5 air,1 blood', 36, 17, 'wave', 'wind'], ['Water Wave', 65, '5 air,7 water,1 blood', 37.5, 18, 'wave', 'water'],
  ['Earth Wave', 70, '5 air,7 earth,1 blood', 40, 19, 'wave', 'earth'], ['Fire Wave', 75, '5 air,7 fire,1 blood', 42.5, 20, 'wave', 'fire'],
  ['Wind Surge', 81, '7 air,1 wrath', 44.5, 21, 'surge', 'wind'], ['Water Surge', 85, '7 air,10 water,1 wrath', 46.5, 22, 'surge', 'water'],
  ['Earth Surge', 90, '7 air,10 earth,1 wrath', 48.2, 23, 'surge', 'earth'], ['Fire Surge', 95, '7 air,10 fire,1 wrath', 50.5, 24, 'surge', 'fire'],
].map(([name, level, runes, xp, max, tier, elem, den, lock]) => row({ name, level, runes: R(runes), xp, max, tier, elem, kind: 'attack', ticks: 5, range: 10, den: den ?? 'yes', lock }));

// curses and binds (s33). effect: {drain:[stat, fraction]} (no stacking) or {bind:[ticks, maxTargets]}
const CURSE = [
  ['Confuse', 3, '3 water,2 earth,1 body', 13, { drain: ['attack', 0.05] }], ['Weaken', 11, '3 water,2 earth,1 body', 21, { drain: ['strength', 0.05] }],
  ['Curse', 19, '2 water,3 earth,1 body', 29, { drain: ['defence', 0.05] }], ['Bind', 20, '3 water,3 earth,2 nature', 30, { bind: [8, 1] }],
  ['Snare', 50, '4 water,4 earth,3 nature', 60, { bind: [16, 3] }], ['Vulnerability', 66, '5 water,5 earth,1 soul', 76, { drain: ['defence', 0.10] }],
  ['Enfeeble', 73, '8 water,8 earth,1 soul', 83, { drain: ['strength', 0.10] }], ['Entangle', 79, '5 water,5 earth,4 nature', 89, { bind: [24, 5] }],
  ['Stun', 80, '12 water,12 earth,1 soul', 90, { drain: ['attack', 0.10] }],
].map(([name, level, runes, xp, effect]) => row({ name, level, runes: R(runes), xp, effect, kind: 'curse', ticks: 5, range: 10 }));

// teleports (s34). land = a live data/travel.js spot id (no second travel table); null = no landing yet
const TELE = [
  ['Lumbridge Home Teleport', 0, '', 0, 'hall', 'yes', { home: true }], ['Minigame Teleport', 0, '', 0, null, 'locked', 'no minigames yet'],
  ['Varrock Teleport', 25, '3 air,1 fire,1 law', 35, 'harbor'], ['Lumbridge Teleport', 31, '3 air,1 earth,1 law', 41, 'hall'],
  ['Falador Teleport', 37, '3 air,1 water,1 law', 48, 'farm'], ['Teleport to House', 40, '1 air,1 earth,1 law', 30, 'hall'],
  ['Camelot Teleport', 45, '5 air,1 law', 55.5, 'green'], ['Kourend Castle Teleport', 48, '2 law,1 fire,1 water', 58, null, 'locked', 'no area for it yet'],
  ['Ardougne Teleport', 51, '2 law,2 water', 61, 'ravn'], ['Civitas illa Fortis Teleport', 54, '2 law,1 earth,1 fire', 64, null, 'locked', 'no area for it yet'],
  ['Watchtower Teleport', 58, '2 earth,2 law', 68, 'ring'], ['Trollheim Teleport', 61, '2 fire,2 law', 68, 'summit'],
  ['Ape Atoll Teleport', 64, '2 fire,2 water,2 law,1 banana', 74, 'isle'],
  ['Teleother Lumbridge', 74, '1 earth,1 law,1 soul', 84, 'hall', 'yes', { other: true }], ['Teleother Falador', 82, '1 water,1 law,1 soul', 92, 'farm', 'yes', { other: true }],
  ['Teleother Camelot', 90, '1 law,2 soul', 100, 'green', 'yes', { other: true }],
].map(([name, level, runes, xp, land, den = 'yes', x]) => row({ name, level, runes: runes ? R(runes) : {}, xp, land, kind: 'teleport', den, ...(typeof x === 'string' ? { lock: x } : x ?? {}) }));

// alchemy, bones, grab, superheat (s35). speed in ticks; null = not checked (OSRS-PLAN finding 23)
const UTIL = [
  ['Bones to Bananas', 15, '2 earth,2 water,1 nature', 25, { bones: 'banana' }], ['Low Level Alchemy', 21, '3 fire,1 nature', 31, { alch: 0.4 }],
  ['Telekinetic Grab', 33, '1 air,1 law', 43, { grab: 10 }, 3], ['Superheat Item', 43, '4 fire,1 nature', 53, { superheat: true }, null, 'locked', "needs the smith's ores"],
  ['High Level Alchemy', 55, '5 fire,1 nature', 65, { alch: 0.6 }, 5], ['Bones to Peaches', 60, '2 earth,4 water,2 nature', 35.5, { bones: 'peach' }],
].map(([name, level, runes, xp, effect, ticks = null, den = 'yes', lock]) => row({ name, level, runes: R(runes), xp, effect, ticks, kind: 'utility', den, lock }));

// enchants and orbs (s35): all locked until the den has Crafting, crossbows and obelisks
const ENCH = [
  ['Lvl-1 Enchant', 7, '1 water,1 cosmic', 17.5], ['Lvl-2 Enchant', 27, '3 air,1 cosmic', 37], ['Lvl-3 Enchant', 49, '5 fire,1 cosmic', 59], ['Lvl-4 Enchant', 57, '10 earth,1 cosmic', 67],
  ['Lvl-5 Enchant', 68, '15 earth,15 water,1 cosmic', 78], ['Lvl-6 Enchant', 87, '20 earth,20 fire,1 cosmic', 97], ['Lvl-7 Enchant', 93, '20 blood,20 soul,1 cosmic', 110],
].map(([name, level, runes, xp]) => row({ name, level, runes: R(runes), xp, kind: 'enchant', den: 'locked', lock: 'no Crafting yet' }));
const BOLTS = [
  ['Opal Bolt Enchant', 4, '2 air,1 cosmic', 9], ['Sapphire Bolt Enchant', 7, '1 water,1 mind,1 cosmic', 17.5], ['Jade Bolt Enchant', 14, '2 earth,1 cosmic', 19],
  ['Pearl Bolt Enchant', 24, '2 water,1 cosmic', 29], ['Emerald Bolt Enchant', 27, '3 air,1 nature,1 cosmic', 37], ['Red Topaz Bolt Enchant', 29, '2 fire,1 cosmic', 33],
  ['Ruby Bolt Enchant', 49, '5 fire,1 blood,1 cosmic', 59], ['Diamond Bolt Enchant', 57, '10 earth,2 law,1 cosmic', 67], ['Dragonstone Bolt Enchant', 68, '15 earth,1 soul,1 cosmic', 78],
  ['Onyx Bolt Enchant', 87, '20 fire,1 death,1 cosmic', 97],
].map(([name, level, runes, xp]) => row({ name, level, runes: R(runes), xp, kind: 'enchant', den: 'locked', lock: 'the den has no crossbows' }));
const ORBS = [
  ['Charge Water Orb', 56, '30 water,3 cosmic', 66], ['Charge Earth Orb', 60, '30 earth,3 cosmic', 70], ['Charge Fire Orb', 63, '30 fire,3 cosmic', 73], ['Charge Air Orb', 66, '30 air,3 cosmic', 76],
].map(([name, level, runes, xp]) => row({ name, level, runes: R(runes), xp, kind: 'orb', den: 'locked', lock: 'no obelisks yet' }));
const OTHER = [
  row({ name: 'Charge', level: 80, runes: R('3 air,3 fire,3 blood'), xp: 180, kind: 'buff', den: 'locked', lock: 'needs a god staff and cape' }),
  row({ name: 'Monster Inspect', level: null, runes: {}, xp: null, kind: 'utility', den: 'locked', lock: 'OSRS page not checked yet' }),
];

const ELEM = { wind: ['#d8f0e8', 'ᚹ'], water: ['#4f9bd8', 'ᛚ'], earth: ['#8a6a3c', 'ᛖ'], fire: ['#ff7a2a', 'ᚲ'] };
const KIND = { attack: ['#cfd8ff', 'ᛊ'], curse: ['#b07ad8', 'ᛉ'], teleport: ['#e2b673', 'ᚺ'], utility: ['#e0b04a', 'ᚨ'], enchant: ['#9ad0ff', 'ᛟ'], orb: ['#9ad0ff', 'ᛟ'], buff: ['#ff5ad0', 'ᛉ'] };
const RUNE_WORD = (r) => Object.entries(r ?? {}).map(([k, n]) => `${n} ${k}`).join(', ');
export const runeText = (sp) => RUNE_WORD(sp.runes) || 'no runes';
// what the bar and the book draw: colour, glyph, the shade length (s) and a one-line description
function dress(sp) {
  const [color, glyph] = (sp.elem && ELEM[sp.elem]) || KIND[sp.kind] || ['#cfd8ff', 'ᛊ'];
  const cd = sp.id === 'lumbridge-home-teleport' ? 1800 : sp.kind === 'attack' ? 3.0 : 1.8;
  const line = sp.den !== 'yes' ? (sp.lock ?? '') : sp.kind === 'attack' ? `max hit ${sp.max}` : sp.kind === 'teleport' ? (sp.land ? `to ${sp.land}` : '') : '';
  return { ...sp, color, glyph, cd, range: sp.range ?? 10, line };
}
export const SPELLS_ALL = [...ATTACK, ...CURSE, ...TELE, ...UTIL, ...ENCH, ...BOLTS, ...ORBS, ...OTHER]
  .map(dress).sort((a, b) => (a.level ?? 999) - (b.level ?? 999) || a.name.localeCompare(b.name));
// ids that older saves and bars hold, mapped to the OSRS book's ids (an unmapped old id drops off the bar)
export const ID_ALIAS = { 'home-teleport': 'lumbridge-home-teleport', 'low-alch': 'low-level-alchemy', 'high-alch': 'high-level-alchemy' };
export const spellById = (sid) => SPELLS_ALL.find((s) => s.id === (ID_ALIAS[sid] ?? sid)) ?? null;

// TIER RULE (s32/s36, since May 2024): wind, water and earth spells hit as hard as the highest spell of their tier you have unlocked; fire is always the top.
export function maxHitFor(spell, magicLevel) {
  if (spell.id === 'magic-dart') return Math.floor(magicLevel / 10) + 10;
  if (!spell.tier || spell.elem === 'fire') return spell.max;
  let best = spell.max;
  for (const s of ATTACK) if (s.tier === spell.tier && s.level <= magicLevel && s.max > best) best = s.max;
  return best;
}
