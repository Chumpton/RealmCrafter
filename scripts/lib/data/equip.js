// S3/S11 equipment (plan sections 24 and 29): OSRS's 11 slots and the weapons / shields you own, with OSRS's own numbers.
// Weapons: speed in ticks, atk = attack bonus per attack type, str = strength bonus, styles = what the weapon offers (attack type + stance).
// Shields / armour: def = defence bonus per attack type. A monster's hit rolls your defence against ITS attack type.
import { METAL } from './equip-metal.js';
export const SLOTS = ['head', 'cape', 'neck', 'ammo', 'weapon', 'body', 'shield', 'legs', 'hands', 'feet', 'ring'];
export const SLOT_NAMES = { head: 'Head', cape: 'Cape', neck: 'Neck', ammo: 'Ammo', weapon: 'Weapon', body: 'Body', shield: 'Shield', legs: 'Legs', hands: 'Hands', feet: 'Feet', ring: 'Ring' };

// stance -> what the style gives (plan section 9): a level bonus and the XP split per point of damage
export const STANCE = {
  accurate: { boost: { attack: 3 }, xp: { attack: 4 } },
  aggressive: { boost: { strength: 3 }, xp: { strength: 4 } },
  defensive: { boost: { defence: 3 }, xp: { defence: 4 } },
  controlled: { boost: { attack: 1, strength: 1, defence: 1 }, xp: { attack: 4 / 3, strength: 4 / 3, defence: 4 / 3 } },
};
const S = (id, name, type, stance) => ({ id, name, type, stance, ...STANCE[stance] });
export const STYLE_SETS = {
  unarmed: [S('punch', 'Punch', 'crush', 'accurate'), S('kick', 'Kick', 'crush', 'aggressive'), S('block', 'Block', 'crush', 'defensive')],
  sword: [S('stab', 'Stab', 'stab', 'accurate'), S('lunge', 'Lunge', 'stab', 'aggressive'), S('slash', 'Slash', 'slash', 'aggressive'), S('block', 'Block', 'stab', 'defensive')],
  longsword: [S('chop', 'Chop', 'slash', 'accurate'), S('slash', 'Slash', 'slash', 'aggressive'), S('lunge', 'Lunge', 'stab', 'controlled'), S('block', 'Block', 'slash', 'defensive')],
  battleaxe: [S('chop', 'Chop', 'slash', 'accurate'), S('hack', 'Hack', 'slash', 'aggressive'), S('smash', 'Smash', 'crush', 'aggressive'), S('block', 'Block', 'slash', 'defensive')],
  twohand: [S('chop', 'Chop', 'slash', 'accurate'), S('slash', 'Slash', 'slash', 'aggressive'), S('smash', 'Smash', 'crush', 'aggressive'), S('block', 'Block', 'slash', 'defensive')],
  spear: [S('lunge', 'Lunge', 'stab', 'controlled'), S('swipe', 'Swipe', 'slash', 'controlled'), S('pound', 'Pound', 'crush', 'controlled'), S('block', 'Block', 'stab', 'defensive')],
  mace: [S('pound', 'Pound', 'crush', 'accurate'), S('pummel', 'Pummel', 'crush', 'aggressive'), S('spike', 'Spike', 'stab', 'controlled'), S('block', 'Block', 'crush', 'defensive')],
  hammer: [S('pound', 'Pound', 'crush', 'accurate'), S('pummel', 'Pummel', 'crush', 'aggressive'), S('block', 'Block', 'crush', 'defensive')],
  staff: [S('bash', 'Bash', 'crush', 'accurate'), S('pound', 'Pound', 'crush', 'aggressive'), S('focus', 'Focus', 'crush', 'defensive')],
};
const z = { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 };
const W = (name, set, speed, atk, str, extra = {}) => ({ slot: 'weapon', name, kind: 'melee', set, speed, range: 2.4 + (speed >= 6 ? 0.2 : 0), atk: { ...z, ...atk }, def: { ...z }, str, ...extra });
const A = (slot, name, def, extra = {}) => ({ slot, name, def: { ...z, ...def }, atk: { ...z, ...(extra.atk ?? {}) }, str: 0, ...extra });
export const EQUIP = {
  'bronze-sword': W('Bronze sword', 'sword', 4, { stab: 4, slash: 3, crush: -2 }, 5, { color: '#b87a3c' }),
  'iron-sword': W('Iron sword', 'sword', 4, { stab: 6, slash: 4, crush: -2 }, 7, { color: '#8a9096' }),
  'iron-longsword': W('Iron longsword', 'longsword', 5, { stab: 6, slash: 8, crush: -2 }, 10, { color: '#8a9096' }),
  'iron-battleaxe': W('Iron battleaxe', 'battleaxe', 6, { stab: -2, slash: 8, crush: 5 }, 13, { color: '#8a9096' }),
  'iron-2h-sword': W('Iron 2h sword', 'twohand', 7, { stab: -4, slash: 13, crush: 10 }, 14, { color: '#8a9096', twoHanded: true }),
  'bronze-spear': W('Bronze spear', 'spear', 4, { stab: 5, slash: 5, crush: 5 }, 6, { color: '#b87a3c' }),
  'bullmace': W("Bull's leg mace", 'mace', 4, { crush: 9 }, 17, { color: '#c9b48a' }),
  'staff-air': W('Staff of air', 'staff', 5, { magic: 10 }, 3, { kind: 'magic', range: 15, color: '#d8e4ee' }),
  'wooden-shield': A('shield', 'Wooden shield', { stab: 4, slash: 5, crush: 3, ranged: 4 }, { color: '#8a5a38' }),
  'bronze-sq-shield': A('shield', 'Bronze sq shield', { stab: 5, slash: 6, crush: 4, ranged: 5 }, { atk: { magic: -6 }, color: '#b87a3c' }),
  'chef-hat': A('head', "Chef's hat", {}, { color: '#f0ede6' }),
  'brass-necklace': A('neck', 'Brass necklace', {}, { color: '#c8a23a' }),
  // Crafting (research section 27): leather. req = skill levels to wear it
  'leather-gloves': A('hands', 'Leather gloves', { slash: 1, crush: 2 }, { color: '#9a6a3c' }),
  'leather-boots': A('feet', 'Leather boots', { slash: 1, crush: 1 }, { color: '#9a6a3c' }),
  'leather-cowl': A('head', 'Leather cowl', { stab: 2, slash: 3, crush: 4, magic: 2, ranged: 3 }, { atk: { ranged: 1 }, color: '#9a6a3c' }),
  'leather-vambraces': A('hands', 'Leather vambraces', { stab: 2, slash: 2, crush: 1 }, { atk: { ranged: 4 }, color: '#9a6a3c' }),
  'leather-body': A('body', 'Leather body', { stab: 8, slash: 9, crush: 10, magic: 4, ranged: 9 }, { atk: { ranged: 2, magic: -2 }, color: '#9a6a3c' }),
  'leather-chaps': A('legs', 'Leather chaps', { stab: 2, slash: 2, crush: 1 }, { atk: { ranged: 4 }, color: '#9a6a3c' }),
  'hard-leather-body': A('body', 'Hard leather body', { stab: 12, slash: 15, crush: 18, magic: 6, ranged: 15 }, { atk: { ranged: 8, magic: -4 }, req: { defence: 10 }, color: '#6e4a2a' }),
  'coif': A('head', 'Coif', { stab: 4, slash: 6, crush: 8, magic: 4, ranged: 4 }, { atk: { ranged: 2, magic: -1 }, req: { ranged: 20 }, color: '#6e4a2a' }),
};
// the smithed metal sets (data/equip-metal.js, from the OSRS wiki): one row each, an id defined above is kept
const TIER_COLOR = { bronze: '#b87a3c', iron: '#8a9096', steel: '#c3c7cc', mithril: '#4f66a8', adamant: '#4f8a5b', rune: '#4fb3c4' };
const five = ([stab, slash, crush, magic, ranged]) => ({ stab, slash, crush, magic, ranged });
for (const [id, [slot, name, speed, set, a, d, str, lvl]] of Object.entries(METAL)) {
  if (EQUIP[id]) continue;
  const color = TIER_COLOR[id.split('-')[0]];
  EQUIP[id] = slot === 'weapon' ? W(name, set, speed, five(a), str, { color, def: five(d), req: { attack: lvl }, ...(set === 'twohand' ? { twoHanded: true } : {}) }) : A(slot, name, five(d), { atk: five(a), req: { defence: lvl }, color });
}
// the items the pack needs a name and colour for (merged into ITEMS in data/skills.js)
export const EQUIP_ITEMS = Object.fromEntries(Object.entries(EQUIP).filter(([id]) => !['bullmace', 'bronze-spear', 'bronze-sq-shield', 'chef-hat', 'brass-necklace'].includes(id)).map(([id, e]) => [id, { name: e.name, color: e.color ?? '#8a9096' }]));
// every player starts with these (OSRS's Tutorial Island kit + a staff, plan section 29); old players also receive their old weapons once
export const START_KIT = { equip: { weapon: 'bronze-sword', shield: 'wooden-shield' }, pack: ['staff-air'] };
export const MIGRATE = ['iron-sword', 'iron-longsword', 'iron-battleaxe', 'iron-2h-sword'];
// old saves and the arena rack name weapons the way the first combat build did
export const WEAPON_ALIAS = { sword: 'iron-sword', longsword: 'iron-longsword', battleaxe: 'iron-battleaxe', twohander: 'iron-2h-sword', staff: 'staff-air' };
