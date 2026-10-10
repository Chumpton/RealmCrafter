import { RUNE_SUPPLIES } from './runes.js';
// STARTER MONSTERS (S12): goblin, cow, chicken and the old bull, with OSRS's own stat blocks. Every tuned number lives here.
// Monster rows are tagged "enemy" so combat-player.js fights them like the dummy: it steps state.hp, this data says the rest.
// SITES are where the rows stand (creator 2026-10-04: chickens + cows by the post mill at 72,32, goblins scattered far out).
export const MON = {
  tick: 0.6, wake: 90, leash: 25, meleeRange: 1.9, stands: { chicken: 1.7, goblin: 2.0, cow: 2.2, bull: 2.8 }, reach: 0.8, // stands = how far (centre to centre, ~3-4 ft between bodies) an enemy keeps from you in a fight; reach = how much farther than that it can still swing
  // creator 2026-10-10 (classic mob AI doc): aggro scales with the level gap, grey mobs only notice you up close, roads soften aggro,
  // nearby hostiles answer a call for help, beasts flee at low hp and alert fresh packs, threat decays when you only kite, evade sprints home at 2x.
  ai: { aggroPerLevel: 0.6, aggroMin: 2, aggroMaxK: 1.8, greyGap: 8, greyAggro: 2, roadK: 0.6, assistR: 7, fleeAt: 0.18, fleeSec: 4, fleeSpeed: 1.25, threatSec: 12, ledgeY: 2.6, ledgeTicks: 3, evadeK: 2 },
  chaseSpeed: 2.6, fadeSec: 3.2, healIdleSec: 30, aggroHoldSec: 10, // aggroHoldSec: a hostile keeps after you this long once you leave its reach
  sounds: { // moodboard names that already exist in the den's tree
    cow: '/cdn/moodboard-lowpoly-cozy/sfx-cow-moo.mp3',
    hit: '/cdn/moodboard-lowpoly-cozy/sfx-straw-dummy-thud-hit.mp3',
    swing: '/cdn/moodboard-lowpoly-cozy/sfx-sword-swing-whoosh.mp3',
    alert: '/cdn/moodboard-lowpoly-cozy/sfx-creature-alert-snort.mp3',
  },
};
// level, hp, attack/strength/defence/magic levels, bonuses, attack speed (ticks), respawn (ticks), attack kind,
// wander = how far from home (or across the pen) it strolls, pace = m/s while strolling, rest = [min,max] seconds standing about
// How each kind swings (the wind-up fills the last 0.5 s of the nameplate's attack line; the lunge lands as the line completes).
// Each swing picks one variant at random: back = metres it rears away, lunge = metres it surges toward you, pitch / roll = degrees of lean, sq = body squash.
export const ATTACKS = {
  cow:     [{ n: 'butt', back: 0.3, lunge: 0.75, pitch: -12, roll: 0, sq: 0 }, { n: 'hook', back: 0.15, lunge: 0.55, pitch: -4, roll: 12, sq: 0 }, { n: 'stomp', back: 0.1, lunge: 0.4, pitch: 8, roll: 0, sq: 0.09 }],
  goblin:  [{ n: 'chop', back: 0.25, lunge: 0.6, pitch: -20, roll: 0, sq: 0 }, { n: 'jab', back: 0.4, lunge: 0.85, pitch: -6, roll: 0, sq: 0 }, { n: 'sweep', back: 0.15, lunge: 0.5, pitch: -3, roll: -16, sq: 0 }],
  chicken: [{ n: 'peck', back: 0.12, lunge: 0.45, pitch: 24, roll: 0, sq: 0 }, { n: 'flap', back: 0.2, lunge: 0.5, pitch: -14, roll: 10, sq: 0.06 }],
  bull:    [{ n: 'charge', back: 0.55, lunge: 1.05, pitch: -16, roll: 0, sq: 0.08 }, { n: 'gore', back: 0.35, lunge: 0.8, pitch: -9, roll: 14, sq: 0.05 }, { n: 'paw', back: 0.1, lunge: 0.6, pitch: 10, roll: 0, sq: 0.12 }],
};
export const MONSTERS = {
  goblin:  { name: 'Goblin',  level: 2, hp: 5, att: 1, str: 1, def: 1, magic: 1, atkBonus: -21, strBonus: -15, defBonus: -15, speed: 4, respawn: 35, kind: 'crush', wander: 4, pace: 0.7, rest: [3, 9], aggro: 5 }, // aggro: m; hostile, starts the fight inside it (creator Oct 5)
  cow:     { name: 'Cow',     level: 2, hp: 8, att: 1, str: 1, def: 1, magic: 1, atkBonus: -15, strBonus: -15, defBonus: -21, speed: 4, respawn: 45, kind: 'crush', wander: 0, pace: 0.5, rest: [5, 14] },
  chicken: { name: 'Chicken', level: 1, hp: 3, att: 1, str: 1, def: 1, magic: 1, atkBonus: -47, strBonus: -42, defBonus: -42, speed: 4, respawn: 25, kind: 'stab', wander: 0, pace: 1.0, rest: [1, 4] },
  // The old bull: combat level 15 by the OSRS formula (Att 8, Str 12, Def 9, HP 26), heavy bonuses so it is slow to kill and hits for up to 4.
  bull:    { name: 'Old bull', level: 15, hp: 26, att: 8, str: 12, def: 9, magic: 1, atkBonus: 20, strBonus: 45, defBonus: 20, speed: 5, respawn: 100, kind: 'crush', wander: 0, pace: 0.55, rest: [6, 16], scale: 1.35 },
};
// AUSTRLAND (al-foe lane, 2026-10-05): the continent's foes. leash = m from home before it gives up (evade-reset, full heal);
// stuck = ticks of no progress in a chase before it evades home; pack = kin within packR join the hunt; faint = the whimsical defeat
// (it keels over with a swirl of stars and "faints!" before the usual fade, loot and respawn). Bodies: scripts/gen/monster-goblin.js
// params (goblin-kin), arena-wolf, arena-troll, foe-toad. Rows stand in places/austrland/cells (tag al-foe).
Object.assign(MONSTERS, {
  'seed-bandit':     { name: 'Seed bandit',     level: 8,  hp: 12,  att: 8,  str: 7,  def: 6,  magic: 1,  atkBonus: 6,  strBonus: 5,  defBonus: 6,  speed: 4, respawn: 50,  kind: 'slash', wander: 4, pace: 0.8, rest: [3, 8], aggro: 7,  leash: 38, stuck: 8, faint: true, scale: 1.25 },
  'puddletoad':      { name: 'Puddletoad',      level: 11, hp: 15,  att: 10, str: 10, def: 9,  magic: 1,  atkBonus: 8,  strBonus: 8,  defBonus: 10, speed: 5, respawn: 45,  kind: 'crush', wander: 5, pace: 0.6, rest: [4, 10], aggro: 6, leash: 38, stuck: 8, faint: true },
  'raider':          { name: 'Raider',          level: 12, hp: 16,  att: 12, str: 11, def: 10, magic: 1,  atkBonus: 12, strBonus: 10, defBonus: 12, speed: 4, respawn: 50,  kind: 'stab',  wander: 4, pace: 0.8, rest: [3, 8], aggro: 9,  leash: 38, stuck: 8, faint: true, scale: 1.45 },
  'briar-wolf':      { name: 'Briar wolf',      level: 14, hp: 18,  att: 14, str: 13, def: 9,  magic: 1,  atkBonus: 14, strBonus: 12, defBonus: 8,  speed: 4, respawn: 45,  kind: 'stab',  wander: 6, pace: 1.0, rest: [2, 7], aggro: 10, leash: 38, stuck: 8, faint: true, pack: true, packR: 14, scale: 1.25 },
  'frost-troll':     { name: 'Frost troll',     level: 22, hp: 34,  att: 20, str: 22, def: 18, magic: 1,  atkBonus: 18, strBonus: 22, defBonus: 20, speed: 6, respawn: 80,  kind: 'crush', wander: 3, pace: 0.5, rest: [5, 12], aggro: 10, leash: 38, stuck: 8, faint: true },
  'raider-chief':    { name: 'Raider chief',    level: 28, hp: 45,  att: 28, str: 30, def: 24, magic: 1,  atkBonus: 30, strBonus: 32, defBonus: 28, speed: 5, respawn: 150, kind: 'slash', wander: 2, pace: 0.6, rest: [6, 14], aggro: 12, leash: 38, stuck: 8, faint: true, scale: 2.1 },
  'ash-cultist':     { name: 'Ash cultist',     level: 40, hp: 55,  att: 38, str: 36, def: 34, magic: 40, atkBonus: 34, strBonus: 30, defBonus: 36, speed: 5, respawn: 90,  kind: 'crush', wander: 3, pace: 0.6, rest: [4, 10], aggro: 10, leash: 38, stuck: 8, faint: true, scale: 1.6 },
  'ashfang-warlord': { name: 'Ashfang Warlord', level: 55, hp: 120, att: 55, str: 58, def: 50, magic: 30, atkBonus: 60, strBonus: 62, defBonus: 55, speed: 6, respawn: 300, kind: 'slash', wander: 0, pace: 0.5, rest: [6, 14], aggro: 12, leash: 38, stuck: 8, faint: true, scale: 2.8 },
});
Object.assign(MON.stands, { 'seed-bandit': 2.1, puddletoad: 2.0, raider: 2.4, 'briar-wolf': 2.2, 'frost-troll': 3.4, 'raider-chief': 3.2, 'ash-cultist': 2.4, 'ashfang-warlord': 4.2 });
Object.assign(ATTACKS, { 'seed-bandit': ATTACKS.goblin, raider: ATTACKS.goblin, 'raider-chief': ATTACKS.goblin, 'ash-cultist': ATTACKS.goblin, 'ashfang-warlord': ATTACKS.bull,
  puddletoad: ATTACKS.chicken, 'briar-wolf': ATTACKS.cow, 'frost-troll': ATTACKS.bull });
// drops: always = [id] (repeat an id for more), feathers = [[amount, weight of 128]], rare = [[id, chance 0..1]]. Ground loot + coins are S13.
export const DROPS = {
  chicken: { always: ['bones', 'raw-chicken'], feathers: [[5, 64], [15, 32], [0, 32]] },
  cow: { always: ['bones', 'raw-beef', 'cowhide'] },
  goblin: { always: ['bones'], energy: 1 / 25, table: [ // one roll out of 128 (OSRS goblin table, no clue scrolls or skulls); item = a pack slot, sup = stackable counts
    { w: 38 }, { w: 28, sup: { coins: 5 } }, { w: 15, item: 'hammer' }, { w: 6, sup: { 'water-rune': 6 } }, { w: 5, sup: { 'body-rune': 7 } },
    { w: 5, item: 'goblin-mail' }, { w: 4, item: 'bronze-spear' }, { w: 3, item: 'bronze-sq-shield' }, { w: 3, sup: { 'earth-rune': 4 } }, { w: 3, sup: { 'bronze-bolts': 8 } },
    { w: 3, item: 'chef-hat' }, { w: 3, sup: { coins: 9 } }, { w: 3, sup: { coins: 15 } }, { w: 2, sup: { coins: 20 } }, { w: 2, item: 'beer' }, { w: 2, item: 'goblin-book' },
    { w: 1, sup: { coins: 1 } }, { w: 1, item: 'brass-necklace' }, { w: 1, item: 'air-talisman' } ] },
  bull: { always: ['big-bones', 'raw-beef', 'cowhide', 'cowhide', 'cowhide'], rare: [['bullmace', 0.0015]] }, // 0.15% for the bull's-leg mace
};
Object.assign(DROPS, { // Austrland foes: existing items and stackables only, so every drop already has a pack slot and a name
  'seed-bandit': { always: ['bones'], energy: 1 / 20, table: [{ w: 40 }, { w: 40, sup: { coins: 12 } }, { w: 20, sup: { coins: 30 } }, { w: 10, sup: { 'nature-rune': 3 } }, { w: 8, item: 'beer' }, { w: 6, item: 'hammer' }, { w: 4, item: 'brass-necklace' }] },
  puddletoad: { always: ['bones'], table: [{ w: 70 }, { w: 30, sup: { 'water-rune': 8 } }, { w: 20, sup: { coins: 10 } }, { w: 8, sup: { 'nature-rune': 2 } }] },
  raider: { always: ['bones'], energy: 1 / 20, table: [{ w: 34 }, { w: 30, sup: { coins: 20 } }, { w: 14, sup: { coins: 45 } }, { w: 12, item: 'bronze-spear' }, { w: 10, item: 'goblin-mail' }, { w: 8, sup: { 'fire-rune': 10 } }, { w: 8, sup: { 'chaos-rune': 3 } }, { w: 6, item: 'bronze-sq-shield' }, { w: 6, sup: { 'bronze-bolts': 15 } }] },
  'briar-wolf': { always: ['bones'], table: [{ w: 90 }, { w: 24, sup: { coins: 15 } }, { w: 14, sup: { 'earth-rune': 10 } }] },
  'frost-troll': { always: ['big-bones'], energy: 1 / 12, table: [{ w: 40 }, { w: 30, sup: { coins: 60 } }, { w: 20, sup: { 'water-rune': 25 } }, { w: 16, sup: { 'cosmic-rune': 4 } }, { w: 12, item: 'hammer' }, { w: 10, sup: { 'law-rune': 3 } }] },
  'raider-chief': { always: ['big-bones'], energy: 1 / 4, rare: [['bullmace', 0.02]], table: [{ w: 20 }, { w: 40, sup: { coins: 150 } }, { w: 24, sup: { 'chaos-rune': 15 } }, { w: 20, sup: { 'death-rune': 6 } }, { w: 14, item: 'goblin-mail' }, { w: 10, item: 'brass-necklace' }] },
  'ash-cultist': { always: ['bones'], energy: 1 / 10, table: [{ w: 30 }, { w: 34, sup: { coins: 90 } }, { w: 24, sup: { 'fire-rune': 40 } }, { w: 18, sup: { 'death-rune': 5 } }, { w: 12, sup: { 'blood-rune': 3 } }, { w: 10, sup: { 'soul-rune': 2 } }] },
  'ashfang-warlord': { always: ['big-bones', 'big-bones'], energy: 1, rare: [['bullmace', 0.08]], table: [{ w: 40, sup: { coins: 600 } }, { w: 30, sup: { 'blood-rune': 25 } }, { w: 30, sup: { 'death-rune': 40 } }, { w: 20, sup: { 'wrath-rune': 10 } }, { w: 8, item: 'brass-necklace' }] },
});
// stackables ride player.state.supplies as counts, like feathers and bait
export const MON_SUPPLIES = { coins: 'coins', ...RUNE_SUPPLIES, 'bronze-bolts': 'bronze bolts' }; // the runes' names come from data/runes.js (all 14)
export const MON_ITEMS = {
  'hammer': { name: 'Hammer', color: '#8a8f96' }, 'goblin-mail': { name: 'Goblin mail', color: '#7d8a5a' }, 'bronze-spear': { name: 'Bronze spear', color: '#b87a3c' },
  'bronze-sq-shield': { name: 'Bronze sq shield', color: '#b87a3c' }, 'chef-hat': { name: "Chef's hat", color: '#f0ede6' }, 'beer': { name: 'Beer', color: '#c9902c' },
  'goblin-book': { name: 'Goblin book', color: '#6a4a3a' }, 'brass-necklace': { name: 'Brass necklace', color: '#c8a23a' }, 'air-talisman': { name: 'Air talisman', color: '#d8e4ee' },
  'bones': { name: 'Bones', color: '#e8e0c8' }, 'big-bones': { name: 'Big bones', color: '#f0e8cf' },
  'cowhide': { name: 'Cowhide', color: '#8a5a38' },
  'bullmace': { name: "Bull's leg mace", color: '#c9b48a', rare: true },
  'energy-1': { name: 'Energy potion (1)', color: '#e8c24a' }, 'energy-2': { name: 'Energy potion (2)', color: '#e8c24a' },
  'energy-3': { name: 'Energy potion (3)', color: '#e8c24a' }, 'energy-4': { name: 'Energy potion (4)', color: '#e8c24a' },
};
// Where each row stands. Ground measured 2026-10-04. Mill at 72,32; fields x54..92 z10..54; farm pens at 39.5,46.
// avoid = circles inside a pen that animals stroll around (hut, hill and well, hay, stable).
export const SITES = {
  chicken: { pen: { cx: 70, cz: 84, w: 36, d: 24 }, n: 18, // moved 16 m north off the summit trail (creator 2026-10-04); hut NW, stable on the west wall, knoll+well NE, hay; henyard troughs + roost
    avoid: [{ x: 58, z: 92, r: 3.2 }, { x: 80, z: 92, r: 5.6 }, { x: 54.4, z: 78, r: 3.4 }, { x: 58.3, z: 74.4, r: 1.4 }, { x: 86, z: 75.5, r: 1.5 }, { x: 66.7, z: 93.4, r: 1.3 }, { x: 77, z: 72.9, r: 1.1 }, { x: 62.5, z: 72.9, r: 1.2 }, { x: 86.4, z: 83, r: 1.3 }] },
  cow: { pen: { cx: -46, cz: 78, w: 46, d: 38 }, n: 15, bull: { x: -32, z: 82 }, avoid: [{ x: -46, z: 90, r: 5.5 }, { x: -38, z: 70, r: 2.4 }, { x: -41.4, z: 75.3, r: 3 }, { x: -37.5, z: 78, r: 1 }, { x: -56, z: 70, r: 1 }, { x: -53, z: 89, r: 1.6 }, { x: -35, z: 59.6, r: 1.6 }] }, // creator 2026-10-04: sheep get the east strip behind a split-rail divider at x=-22; avoid = shelter, rack, rock, salt lick, shade tree, troughs // its own big fenced pen on a levelled pad west of the village road (creator 2026-10-04), 15 cows + the old bull
  goblin: { area: { cx: 205, cz: 55, w: 44, d: 56 }, n: 8 },                     // sparse scatter ~130 m out on the ridge flat
};
export const LOOT = { ownerSec: 60, life: 120, lifeUntradeable: 180, untradeable: ['goblin-book'], reach: 6 }; // seconds; the owner alone sees a drop for ownerSec, it is gone at life
export const ENERGY = { perDose: 15, drops: [1, 2, 4] }; // 1 kill in 25 drops a potion of 1, 2 or 4 doses (equal odds); each dose restores 15 stamina
export const DEATH = { respawn: { x: 3.9, y: 24.2, z: -0.4 }, msg: 'Oh dear, you are dead!', keep: 3, graveSec: 900 }; // respawn = the world's default spawn point; keep = items that survive; the rest wait in a gravestone for graveSec
// AUSTRLAND DUNGEONS (al-dungeon lane, 2026-10-05): the Barrow of Hel's dead. Bodies: scripts/gen/arena-draugr.js (the king at scale 1.7).
// Rows stand in places/austr-barrow/cells (tag al-dungeon). Frost trolls of the Rimecave use the al-foe 'frost-troll' row above.
Object.assign(MONSTERS, {
  'draugr':      { name: 'Draugr',      level: 24, hp: 30, att: 22, str: 22, def: 20, magic: 1, atkBonus: 20, strBonus: 22, defBonus: 22, speed: 5, respawn: 60,  kind: 'slash', wander: 2, pace: 0.5, rest: [5, 12], aggro: 8,  leash: 30, stuck: 8, faint: true },
  'barrow-king': { name: 'Barrow King', level: 42, hp: 90, att: 40, str: 44, def: 38, magic: 1, atkBonus: 45, strBonus: 48, defBonus: 42, speed: 5, respawn: 240, kind: 'slash', wander: 0, pace: 0.4, rest: [6, 14], aggro: 10, leash: 24, stuck: 8, faint: true, scale: 1.7 },
});
Object.assign(MON.stands, { draugr: 2.2, 'barrow-king': 3.2 });
Object.assign(ATTACKS, { draugr: ATTACKS.goblin, 'barrow-king': ATTACKS.bull });
Object.assign(DROPS, {
  draugr: { always: ['bones'], energy: 1 / 16, table: [{ w: 40 }, { w: 30, sup: { coins: 40 } }, { w: 18, sup: { 'death-rune': 3 } }, { w: 14, sup: { 'earth-rune': 15 } }, { w: 10, item: 'bronze-sq-shield' }, { w: 6, item: 'brass-necklace' }] },
  'barrow-king': { always: ['big-bones', 'big-bones'], energy: 1 / 2, table: [{ w: 30, sup: { coins: 300 } }, { w: 25, sup: { 'death-rune': 15 } }, { w: 20, sup: { 'blood-rune': 6 } }, { w: 15, item: 'brass-necklace' }] },
});
// Sunreach Vale camps (creator 2026-10-10: "populate certain areas with camps of enemies")
Object.assign(MONSTERS, {
  'gnoll':        { name: 'Hollow gnoll',    level: 6,  hp: 10, att: 6,  str: 6,  def: 4,  magic: 1, atkBonus: 4,  strBonus: 4,  defBonus: 4,  speed: 4, respawn: 40,  kind: 'slash', wander: 4, pace: 0.8, rest: [3, 8], aggro: 8,  leash: 34, stuck: 8, faint: true },
  'gnoll-chief':  { name: 'Grakk the Hollow-Fang', level: 12, hp: 30, att: 12, str: 13, def: 10, magic: 1, atkBonus: 14, strBonus: 14, defBonus: 12, speed: 5, respawn: 120, kind: 'crush', wander: 1, pace: 0.6, rest: [5, 12], aggro: 10, leash: 30, stuck: 8, faint: true, scale: 1.3 },
  'vale-bandit':  { name: 'Ridge bandit',    level: 8,  hp: 12, att: 8,  str: 7,  def: 6,  magic: 1, atkBonus: 6,  strBonus: 6,  defBonus: 6,  speed: 4, respawn: 45,  kind: 'stab',  wander: 3, pace: 0.8, rest: [3, 8], aggro: 8,  leash: 34, stuck: 8, faint: true },
});
Object.assign(DROPS, {
  'gnoll': { always: ['bones'], table: [{ w: 50 }, { w: 30, sup: { coins: 10 } }, { w: 12, item: 'bronze-spear' }, { w: 8, sup: { 'earth-rune': 6 } }] },
  'gnoll-chief': { always: ['big-bones'], energy: 1 / 4, table: [{ w: 30, sup: { coins: 80 } }, { w: 20, item: 'goblin-mail' }, { w: 15, item: 'bronze-sq-shield' }, { w: 10, item: 'brass-necklace' }] },
  'vale-bandit': { always: ['bones'], energy: 1 / 20, table: [{ w: 40 }, { w: 34, sup: { coins: 18 } }, { w: 10, item: 'beer' }, { w: 8, sup: { 'chaos-rune': 2 } }, { w: 6, item: 'hammer' }] },
});
Object.assign(MON.stands, { gnoll: 2.2, 'gnoll-chief': 2.8, 'vale-bandit': 2.1 });
Object.assign(ATTACKS, { gnoll: ATTACKS.goblin, 'gnoll-chief': ATTACKS.bull, 'vale-bandit': ATTACKS.goblin });

// Sunreach wildlife (creator 2026-10-10: "roaming relevant zone enemy wildlife, animate and bone, wander paths, groups, solo enemies").
// rig: the model's own Idle/Walk/Run/Attack/Death (scripts/monster.js rigClip). pack: one bitten, the pack comes.
Object.assign(MONSTERS, {
  'vale-wolf':   { name: 'Vale prowler',     level: 5,  hp: 9,  att: 5,  str: 5,  def: 3,  magic: 1, atkBonus: 4,  strBonus: 3,  defBonus: 2,  speed: 4, respawn: 40, kind: 'stab',  wander: 7, pace: 1.1, rest: [2, 6],  aggro: 9,  leash: 40, stuck: 8, pack: true, packR: 14, rig: true },
  'vale-pup':    { name: 'Mangy pup',        level: 2,  hp: 5,  att: 2,  str: 2,  def: 1,  magic: 1, atkBonus: 1,  strBonus: 1,  defBonus: 1,  speed: 4, respawn: 30, kind: 'stab',  wander: 6, pace: 1.0, rest: [2, 6],  aggro: 0,  leash: 34, stuck: 8, pack: true, packR: 14, rig: true },
  'vale-boar':   { name: 'Stonetusk boar',   level: 7,  hp: 14, att: 7,  str: 8,  def: 6,  magic: 1, atkBonus: 6,  strBonus: 7,  defBonus: 6,  speed: 5, respawn: 45, kind: 'crush', wander: 8, pace: 0.9, rest: [3, 9],  aggro: 6,  leash: 40, stuck: 8, rig: true },
  'vale-bear':   { name: 'Old Honeypaw',     level: 11, hp: 32, att: 11, str: 12, def: 9,  magic: 1, atkBonus: 12, strBonus: 12, defBonus: 9,  speed: 6, respawn: 120, kind: 'crush', wander: 4, pace: 0.8, rest: [4, 10], aggro: 7,  leash: 46, stuck: 8, rig: true },
});
Object.assign(DROPS, {
  'vale-wolf': { always: ['bones'], table: [{ w: 70 }, { w: 20, sup: { coins: 8 } }, { w: 10, sup: { 'earth-rune': 5 } }] },
  'vale-pup':  { always: ['bones'], table: [{ w: 85 }, { w: 15, sup: { coins: 3 } }] },
  'vale-boar': { always: ['bones'], table: [{ w: 60 }, { w: 30, sup: { coins: 12 } }, { w: 10, item: 'bronze-spear' }] },
  'vale-bear': { always: ['big-bones'], energy: 1 / 3, table: [{ w: 40, sup: { coins: 60 } }, { w: 25, item: 'bronze-sq-shield' }, { w: 15, item: 'brass-necklace' }, { w: 20, sup: { 'earth-rune': 20 } }] },
});
Object.assign(MON.stands, { 'vale-wolf': 2.0, 'vale-pup': 1.7, 'vale-boar': 2.2, 'vale-bear': 2.8 });
Object.assign(ATTACKS, { 'vale-wolf': ATTACKS.cow, 'vale-pup': ATTACKS.chicken, 'vale-boar': ATTACKS.bull, 'vale-bear': ATTACKS.bull });
// the camps' gnolls and bandits wear rigged bodies now (Riverpaw gnoll, Hogger, Defias bandit): they walk instead of slide
Object.assign(MONSTERS.gnoll, { rig: true }); Object.assign(MONSTERS['gnoll-chief'], { rig: true }); Object.assign(MONSTERS['vale-bandit'], { rig: true });

// Murkfen (zone-swamp, creator 2026-10-10: "deep level of detail pass" on the swamp zone). Level 9-14, one notch above Sunreach.
Object.assign(MONSTERS, {
  'fen-murloc':    { name: 'Mire murloc',       level: 9,  hp: 13, att: 9,  str: 8,  def: 6,  magic: 1, atkBonus: 7,  strBonus: 6,  defBonus: 5,  speed: 4, respawn: 40, kind: 'stab',  wander: 5, pace: 1.0, rest: [2, 6], aggro: 8,  leash: 34, stuck: 8, pack: true, packR: 12, rig: true },
  'fen-tidehunter':{ name: 'Blackwater tidehunter', level: 11, hp: 18, att: 11, str: 10, def: 8, magic: 1, atkBonus: 9, strBonus: 9, defBonus: 7, speed: 4, respawn: 50, kind: 'slash', wander: 3, pace: 0.9, rest: [3, 8], aggro: 9,  leash: 34, stuck: 8, pack: true, packR: 12, rig: true },
  'fen-gnoll':     { name: 'Mirefang gnoll',    level: 10, hp: 15, att: 10, str: 10, def: 7,  magic: 1, atkBonus: 8,  strBonus: 8,  defBonus: 6,  speed: 4, respawn: 45, kind: 'slash', wander: 3, pace: 0.8, rest: [3, 8], aggro: 8,  leash: 34, stuck: 8, faint: true, rig: true },
  'fen-shaman':    { name: 'Mirefang mystic',   level: 11, hp: 13, att: 8,  str: 7,  def: 6,  magic: 12, atkBonus: 6, strBonus: 6,  defBonus: 5,  speed: 4, respawn: 50, kind: 'crush', wander: 2, pace: 0.7, rest: [4, 9], aggro: 9,  leash: 30, stuck: 8, faint: true, rig: true },
  'fen-chief':     { name: 'Gorrak Bogjaw',     level: 14, hp: 40, att: 14, str: 15, def: 11, magic: 1, atkBonus: 15, strBonus: 15, defBonus: 12, speed: 5, respawn: 150, kind: 'crush', wander: 1, pace: 0.6, rest: [5, 12], aggro: 10, leash: 30, stuck: 8, faint: true, rig: true, scale: 1.3 },
  'fen-spider':    { name: 'Moss-back weaver',  level: 10, hp: 14, att: 10, str: 9,  def: 6,  magic: 1, atkBonus: 8,  strBonus: 7,  defBonus: 5,  speed: 5, respawn: 45, kind: 'stab',  wander: 6, pace: 1.0, rest: [2, 7], aggro: 8,  leash: 40, stuck: 8, rig: true },
});
Object.assign(DROPS, {
  'fen-murloc':     { always: ['bones'], table: [{ w: 55 }, { w: 30, sup: { coins: 14 } }, { w: 15, item: 'raw-trout' }] },
  'fen-tidehunter': { always: ['bones'], table: [{ w: 45 }, { w: 35, sup: { coins: 22 } }, { w: 10, item: 'bronze-spear' }, { w: 10, sup: { 'water-rune': 8 } }] },
  'fen-gnoll':      { always: ['bones'], table: [{ w: 50 }, { w: 30, sup: { coins: 16 } }, { w: 12, item: 'bronze-spear' }, { w: 8, sup: { 'earth-rune': 8 } }] },
  'fen-shaman':     { always: ['bones'], table: [{ w: 40 }, { w: 30, sup: { coins: 18 } }, { w: 30, sup: { 'chaos-rune': 3 } }] },
  'fen-chief':      { always: ['big-bones'], energy: 1 / 4, table: [{ w: 30, sup: { coins: 120 } }, { w: 20, item: 'goblin-mail' }, { w: 15, item: 'bronze-sq-shield' }, { w: 10, item: 'brass-necklace' }] },
  'fen-spider':     { always: ['bones'], table: [{ w: 70 }, { w: 30, sup: { coins: 10 } }] },
});
Object.assign(MON.stands, { 'fen-murloc': 1.7, 'fen-tidehunter': 1.9, 'fen-gnoll': 2.2, 'fen-shaman': 2.2, 'fen-chief': 2.8, 'fen-spider': 1.6 });
Object.assign(ATTACKS, { 'fen-murloc': ATTACKS.goblin, 'fen-tidehunter': ATTACKS.goblin, 'fen-gnoll': ATTACKS.goblin, 'fen-shaman': ATTACKS.goblin, 'fen-chief': ATTACKS.bull, 'fen-spider': ATTACKS.cow });

// Emberwood (zone-autumn, 2026-10-10). Level 12-17, a notch above Murkfen.
Object.assign(MONSTERS, {
  'ember-wolf':   { name: 'Rustfur timber wolf', level: 12, hp: 18, att: 12, str: 11, def: 8,  magic: 1, atkBonus: 10, strBonus: 9,  defBonus: 7,  speed: 4, respawn: 45, kind: 'stab',  wander: 6, pace: 1.1, rest: [2, 6], aggro: 9,  leash: 40, stuck: 8, pack: true, packR: 14, rig: true },
  'ember-alpha':  { name: 'Greymane',            level: 16, hp: 46, att: 16, str: 16, def: 12, magic: 1, atkBonus: 16, strBonus: 16, defBonus: 12, speed: 5, respawn: 150, kind: 'stab', wander: 2, pace: 0.9, rest: [4, 10], aggro: 10, leash: 34, stuck: 8, pack: true, packR: 16, rig: true, scale: 1.35 },
  'ember-boar':   { name: 'Bristleback rooter',  level: 13, hp: 20, att: 12, str: 13, def: 10, magic: 1, atkBonus: 11, strBonus: 12, defBonus: 9,  speed: 5, respawn: 45, kind: 'crush', wander: 7, pace: 0.9, rest: [3, 9], aggro: 6,  leash: 40, stuck: 8, rig: true },
  'ember-spider': { name: 'Ashveil lurker',      level: 14, hp: 19, att: 13, str: 12, def: 9,  magic: 1, atkBonus: 12, strBonus: 11, defBonus: 8,  speed: 5, respawn: 45, kind: 'stab',  wander: 4, pace: 1.0, rest: [2, 7], aggro: 9,  leash: 36, stuck: 8, pack: true, packR: 12, rig: true },
  'ember-widow':  { name: 'Mother Ashveil',      level: 17, hp: 52, att: 17, str: 17, def: 13, magic: 1, atkBonus: 17, strBonus: 17, defBonus: 13, speed: 5, respawn: 180, kind: 'stab', wander: 1, pace: 0.7, rest: [5, 12], aggro: 10, leash: 30, stuck: 8, rig: true, scale: 1.6 },
  'ember-bear':   { name: 'Old Rustcoat',        level: 15, hp: 40, att: 15, str: 16, def: 12, magic: 1, atkBonus: 15, strBonus: 16, defBonus: 12, speed: 6, respawn: 150, kind: 'crush', wander: 4, pace: 0.8, rest: [4, 10], aggro: 7, leash: 46, stuck: 8, rig: true },
});
Object.assign(DROPS, {
  'ember-wolf':   { always: ['bones'], table: [{ w: 55 }, { w: 30, sup: { coins: 20 } }, { w: 15, sup: { 'earth-rune': 10 } }] },
  'ember-alpha':  { always: ['big-bones'], energy: 1 / 4, table: [{ w: 35, sup: { coins: 150 } }, { w: 25, item: 'bronze-sq-shield' }, { w: 20, item: 'brass-necklace' }, { w: 20, sup: { 'law-rune': 4 } }] },
  'ember-boar':   { always: ['bones'], table: [{ w: 50 }, { w: 35, sup: { coins: 24 } }, { w: 15, item: 'bronze-spear' }] },
  'ember-spider': { always: ['bones'], table: [{ w: 60 }, { w: 30, sup: { coins: 18 } }, { w: 10, sup: { 'chaos-rune': 4 } }] },
  'ember-widow':  { always: ['big-bones'], energy: 1 / 4, table: [{ w: 35, sup: { coins: 180 } }, { w: 25, item: 'goblin-mail' }, { w: 20, sup: { 'chaos-rune': 20 } }, { w: 20, item: 'brass-necklace' }] },
  'ember-bear':   { always: ['big-bones'], energy: 1 / 3, table: [{ w: 40, sup: { coins: 120 } }, { w: 30, item: 'bronze-sq-shield' }, { w: 30, sup: { 'earth-rune': 30 } }] },
});
Object.assign(MON.stands, { 'ember-wolf': 2.0, 'ember-alpha': 2.6, 'ember-boar': 2.2, 'ember-spider': 1.6, 'ember-widow': 2.4, 'ember-bear': 2.8 });
Object.assign(ATTACKS, { 'ember-wolf': ATTACKS.cow, 'ember-alpha': ATTACKS.bull, 'ember-boar': ATTACKS.bull, 'ember-spider': ATTACKS.cow, 'ember-widow': ATTACKS.bull, 'ember-bear': ATTACKS.bull });

// Frostpeak (zone-winter, 2026-10-10). Level 16-22.
Object.assign(MONSTERS, {
  'frost-wolf':   { name: 'Mangy snow wolf',  level: 16, hp: 24, att: 16, str: 15, def: 11, magic: 1, atkBonus: 14, strBonus: 13, defBonus: 10, speed: 4, respawn: 45, kind: 'stab',  wander: 6, pace: 1.1, rest: [2, 6], aggro: 9, leash: 40, stuck: 8, pack: true, packR: 14, rig: true },
  'frost-bear':   { name: 'Frostmaw bear',    level: 19, hp: 38, att: 18, str: 20, def: 15, magic: 1, atkBonus: 18, strBonus: 19, defBonus: 14, speed: 5, respawn: 60, kind: 'crush', wander: 5, pace: 0.8, rest: [4, 10], aggro: 7, leash: 40, stuck: 8, rig: true },
  'frost-matron': { name: 'Old Frostmaw',     level: 22, hp: 80, att: 22, str: 24, def: 18, magic: 1, atkBonus: 22, strBonus: 23, defBonus: 18, speed: 5, respawn: 180, kind: 'crush', wander: 1, pace: 0.7, rest: [5, 12], aggro: 9, leash: 30, stuck: 8, rig: true },
  'frost-howler': { name: 'Whitefang',        level: 20, hp: 50, att: 20, str: 20, def: 15, magic: 1, atkBonus: 20, strBonus: 20, defBonus: 15, speed: 5, respawn: 150, kind: 'stab', wander: 2, pace: 0.9, rest: [4, 10], aggro: 10, leash: 34, stuck: 8, pack: true, packR: 16, rig: true },
});
Object.assign(DROPS, {
  'frost-wolf':   { always: ['bones'], table: [{ w: 55 }, { w: 30, sup: { coins: 30 } }, { w: 15, sup: { 'water-rune': 12 } }] },
  'frost-bear':   { always: ['big-bones'], table: [{ w: 50 }, { w: 35, sup: { coins: 45 } }, { w: 15, item: 'bronze-sq-shield' }] },
  'frost-matron': { always: ['big-bones'], energy: 1 / 4, table: [{ w: 35, sup: { coins: 260 } }, { w: 25, item: 'goblin-mail' }, { w: 20, item: 'brass-necklace' }, { w: 20, sup: { 'law-rune': 8 } }] },
  'frost-howler': { always: ['big-bones'], energy: 1 / 4, table: [{ w: 40, sup: { coins: 200 } }, { w: 30, sup: { 'water-rune': 40 } }, { w: 30, item: 'brass-necklace' }] },
});
Object.assign(MON.stands, { 'frost-wolf': 2.0, 'frost-bear': 2.8, 'frost-matron': 3.4, 'frost-howler': 2.6 });
Object.assign(ATTACKS, { 'frost-wolf': ATTACKS.cow, 'frost-bear': ATTACKS.bull, 'frost-matron': ATTACKS.bull, 'frost-howler': ATTACKS.bull });

// Verdant Glade (zone-spring, 2026-10-10). Starter level 2-6.
Object.assign(MONSTERS, {
  'glade-wolf':  { name: 'Young greyback wolf', level: 3, hp: 8,  att: 3, str: 3, def: 2, magic: 1, atkBonus: 2, strBonus: 2, defBonus: 1, speed: 4, respawn: 30, kind: 'stab', wander: 6, pace: 1.1, rest: [2, 6], aggro: 6, leash: 36, stuck: 8, pack: true, packR: 12, rig: true },
  'glade-mother':{ name: 'Mother Greyback',     level: 6, hp: 26, att: 6, str: 6, def: 5, magic: 1, atkBonus: 6, strBonus: 6, defBonus: 5, speed: 5, respawn: 120, kind: 'stab', wander: 2, pace: 0.9, rest: [4, 10], aggro: 8, leash: 30, stuck: 8, pack: true, packR: 14, rig: true },
  'glade-deer':  { name: 'Spring stag',         level: 2, hp: 10, att: 1, str: 2, def: 1, magic: 1, atkBonus: 0, strBonus: 1, defBonus: 0, speed: 5, respawn: 30, kind: 'crush', wander: 9, pace: 0.8, rest: [4, 12], aggro: 0, leash: 30, stuck: 8 },
});
Object.assign(DROPS, {
  'glade-wolf':   { always: ['bones'], table: [{ w: 60 }, { w: 30, sup: { coins: 6 } }, { w: 10, sup: { 'air-rune': 6 } }] },
  'glade-mother': { always: ['big-bones'], energy: 1 / 4, table: [{ w: 40, sup: { coins: 60 } }, { w: 30, item: 'bronze-sq-shield' }, { w: 30, sup: { 'mind-rune': 10 } }] },
  'glade-deer':   { always: ['bones'], table: [{ w: 80 }, { w: 20, sup: { coins: 3 } }] },
});
Object.assign(MON.stands, { 'glade-wolf': 1.7, 'glade-mother': 2.4, 'glade-deer': 2.4 });
Object.assign(ATTACKS, { 'glade-wolf': ATTACKS.cow, 'glade-mother': ATTACKS.bull, 'glade-deer': ATTACKS.cow });

// Thistledown (zone-village, 2026-10-10). Level 6-12: between Verdant Glade and Sunreach.
Object.assign(MONSTERS, {
  'td-gnoll':  { name: 'Snarlmane scavenger', level: 8,  hp: 12, att: 8,  str: 8,  def: 6, magic: 1, atkBonus: 6, strBonus: 6, defBonus: 5, speed: 4, respawn: 35, kind: 'slash', wander: 4, pace: 0.85, rest: [3, 8], aggro: 8, leash: 34, stuck: 8, faint: true, rig: true },
  'td-brute':  { name: 'Snarlmane brute',     level: 10, hp: 18, att: 10, str: 11, def: 8, magic: 1, atkBonus: 8, strBonus: 9, defBonus: 7, speed: 5, respawn: 45, kind: 'crush', wander: 3, pace: 0.8, rest: [3, 8], aggro: 8, leash: 34, stuck: 8, faint: true, rig: true },
  'td-chief':  { name: 'Snarlmane the Squash-Thief', level: 12, hp: 40, att: 12, str: 13, def: 10, magic: 1, atkBonus: 11, strBonus: 11, defBonus: 9, speed: 5, respawn: 120, kind: 'slash', wander: 1, pace: 0.7, rest: [4, 10], aggro: 10, leash: 30, stuck: 8, rig: true },
  'td-boar':   { name: 'Field rooter',        level: 7,  hp: 13, att: 7,  str: 7,  def: 5, magic: 1, atkBonus: 5, strBonus: 6, defBonus: 5, speed: 5, respawn: 35, kind: 'crush', wander: 7, pace: 0.9, rest: [3, 9], aggro: 5, leash: 38, stuck: 8, rig: true },
});
Object.assign(DROPS, {
  'td-gnoll': { always: ['bones'], table: [{ w: 50 }, { w: 30, sup: { coins: 12 } }, { w: 12, item: 'bronze-spear' }, { w: 8, sup: { 'earth-rune': 6 } }] },
  'td-brute': { always: ['bones'], table: [{ w: 45 }, { w: 35, sup: { coins: 20 } }, { w: 20, item: 'bronze-sq-shield' }] },
  'td-chief': { always: ['big-bones'], energy: 1 / 4, table: [{ w: 40, sup: { coins: 120 } }, { w: 30, item: 'bronze-sq-shield' }, { w: 30, sup: { 'mind-rune': 15 } }] },
  'td-boar':  { always: ['bones'], table: [{ w: 60 }, { w: 30, sup: { coins: 10 } }, { w: 10, item: 'bronze-spear' }] },
});
Object.assign(MON.stands, { 'td-gnoll': 2.0, 'td-brute': 2.2, 'td-chief': 2.6, 'td-boar': 2.2 });
Object.assign(ATTACKS, { 'td-gnoll': ATTACKS.gnoll, 'td-brute': ATTACKS.gnoll, 'td-chief': ATTACKS['gnoll-chief'], 'td-boar': ATTACKS['ember-boar'] });

// The Old Road (zone-road, 2026-10-10). Level 9-14: Blackhand's highwaymen and the roadside wolves.
Object.assign(MONSTERS, {
  'or-bandit':  { name: 'Blackhand highwayman', level: 10, hp: 15, att: 10, str: 9,  def: 8,  magic: 1, atkBonus: 8,  strBonus: 7,  defBonus: 7,  speed: 4, respawn: 40,  kind: 'stab',  wander: 3, pace: 0.8, rest: [3, 8], aggro: 8,  leash: 34, stuck: 8, faint: true, rig: true },
  'or-cutter':  { name: 'Blackhand cutthroat',  level: 12, hp: 20, att: 12, str: 12, def: 9,  magic: 1, atkBonus: 10, strBonus: 10, defBonus: 8,  speed: 4, respawn: 50,  kind: 'slash', wander: 2, pace: 0.8, rest: [3, 8], aggro: 9,  leash: 34, stuck: 8, faint: true, rig: true },
  'or-boss':    { name: 'Gerrick Blackhand',    level: 14, hp: 48, att: 14, str: 15, def: 12, magic: 1, atkBonus: 12, strBonus: 13, defBonus: 11, speed: 5, respawn: 150, kind: 'slash', wander: 1, pace: 0.7, rest: [4, 10], aggro: 10, leash: 28, stuck: 8, rig: true },
  'or-wolf':    { name: 'Roadside prowler',     level: 9,  hp: 13, att: 9,  str: 8,  def: 6,  magic: 1, atkBonus: 6,  strBonus: 6,  defBonus: 5,  speed: 5, respawn: 35,  kind: 'stab',  wander: 7, pace: 0.9, rest: [3, 9], aggro: 7,  leash: 40, stuck: 8, pack: true, packR: 12, rig: true },
});
Object.assign(DROPS, {
  'or-bandit': { always: ['bones'], table: [{ w: 45 }, { w: 35, sup: { coins: 18 } }, { w: 10, item: 'beer' }, { w: 10, item: 'bronze-spear' }] },
  'or-cutter': { always: ['bones'], table: [{ w: 40 }, { w: 40, sup: { coins: 26 } }, { w: 20, item: 'bronze-sq-shield' }] },
  'or-boss':   { always: ['big-bones'], energy: 1 / 4, table: [{ w: 40, sup: { coins: 160 } }, { w: 30, item: 'brass-necklace' }, { w: 30, sup: { 'chaos-rune': 8 } }] },
  'or-wolf':   { always: ['bones'], table: [{ w: 70 }, { w: 30, sup: { coins: 6 } }] },
});
Object.assign(MON.stands, { 'or-bandit': 2.1, 'or-cutter': 2.2, 'or-boss': 2.6, 'or-wolf': 1.8 });
Object.assign(ATTACKS, { 'or-bandit': ATTACKS['vale-bandit'], 'or-cutter': ATTACKS['vale-bandit'], 'or-boss': ATTACKS['vale-bandit'], 'or-wolf': ATTACKS['glade-wolf'] });

// Deepdelve (zone-caves, creator 2026-10-10: "all the portal zones design pass right"). Level 7-12 kobolds and mine spiders.
Object.assign(MONSTERS, {
  'dd-kobold':    { name: 'Kobold vermin',     level: 7,  hp: 11, att: 7,  str: 6,  def: 5,  magic: 1, atkBonus: 5,  strBonus: 5,  defBonus: 4,  speed: 4, respawn: 35, kind: 'stab',  wander: 3, pace: 0.9, rest: [2, 7], aggro: 7,  leash: 30, stuck: 8, faint: true, rig: true },
  'dd-goldtooth': { name: 'Goldtooth',         level: 11, hp: 32, att: 11, str: 12, def: 9,  magic: 1, atkBonus: 12, strBonus: 12, defBonus: 9,  speed: 5, respawn: 120, kind: 'crush', wander: 1, pace: 0.6, rest: [5, 12], aggro: 9,  leash: 26, stuck: 8, faint: true, rig: true },
  'dd-spider':    { name: 'Mine spider',       level: 9,  hp: 13, att: 9,  str: 8,  def: 6,  magic: 1, atkBonus: 7,  strBonus: 7,  defBonus: 5,  speed: 5, respawn: 40, kind: 'stab',  wander: 5, pace: 1.0, rest: [2, 6], aggro: 8,  leash: 34, stuck: 8, rig: true },
});
Object.assign(DROPS, {
  'dd-kobold':    { always: ['bones'], table: [{ w: 50 }, { w: 30, sup: { coins: 12 } }, { w: 12, item: 'hammer' }, { w: 8, sup: { 'earth-rune': 6 } }] },
  'dd-goldtooth': { always: ['bones'], energy: 1 / 4, table: [{ w: 40, sup: { coins: 150 } }, { w: 30, item: 'brass-necklace' }, { w: 30, sup: { 'earth-rune': 30 } }] },
  'dd-spider':    { always: ['bones'], table: [{ w: 60 }, { w: 30, sup: { coins: 14 } }, { w: 10, sup: { 'water-rune': 6 } }] },
});
Object.assign(MON.stands, { 'dd-kobold': 1.6, 'dd-goldtooth': 2.0, 'dd-spider': 1.4 });
Object.assign(ATTACKS, { 'dd-kobold': ATTACKS.goblin, 'dd-goldtooth': ATTACKS.bull, 'dd-spider': ATTACKS.cow });

// Crown District (zone-city, creator 2026-10-10: "all the portal zones design pass right"). Level 9-14 cutpurses in the back alleys.
Object.assign(MONSTERS, {
  'ci-cutpurse': { name: 'Gutter cutpurse',  level: 9,  hp: 13, att: 9,  str: 8,  def: 6,  magic: 1, atkBonus: 7,  strBonus: 6,  defBonus: 6,  speed: 5, respawn: 40, kind: 'stab',  wander: 3, pace: 0.9, rest: [3, 8], aggro: 7, leash: 30, stuck: 8, faint: true, rig: true },
  'ci-thug':     { name: 'Canal thug',       level: 11, hp: 17, att: 11, str: 11, def: 8,  magic: 1, atkBonus: 9,  strBonus: 9,  defBonus: 8,  speed: 4, respawn: 45, kind: 'crush', wander: 3, pace: 0.8, rest: [3, 8], aggro: 8, leash: 30, stuck: 8, faint: true, rig: true },
  'ci-boss':     { name: 'Silkfinger Vane',  level: 14, hp: 40, att: 14, str: 14, def: 11, magic: 1, atkBonus: 14, strBonus: 13, defBonus: 10, speed: 5, respawn: 150, kind: 'stab', wander: 1, pace: 0.6, rest: [5, 12], aggro: 9, leash: 24, stuck: 8, faint: true, rig: true },
});
Object.assign(DROPS, {
  'ci-cutpurse': { always: ['bones'], table: [{ w: 40 }, { w: 40, sup: { coins: 20 } }, { w: 12, item: 'beer' }, { w: 8, item: 'brass-necklace' }] },
  'ci-thug':     { always: ['bones'], table: [{ w: 45 }, { w: 35, sup: { coins: 24 } }, { w: 12, item: 'hammer' }, { w: 8, sup: { 'chaos-rune': 3 } }] },
  'ci-boss':     { always: ['bones'], energy: 1 / 4, table: [{ w: 50, sup: { coins: 200 } }, { w: 30, item: 'brass-necklace' }, { w: 20, sup: { 'chaos-rune': 15 } }] },
});
Object.assign(MON.stands, { 'ci-cutpurse': 2.1, 'ci-thug': 2.2, 'ci-boss': 2.6 });
Object.assign(ATTACKS, { 'ci-cutpurse': ATTACKS['vale-bandit'], 'ci-thug': ATTACKS['vale-bandit'], 'ci-boss': ATTACKS['vale-bandit'] });

// Sunscorch (zone-desert, creator 2026-10-10: "all the portal zones design pass right"). Level 12-17: dry canyon vipers,
// the Dunewidow nest under the west mesas, the Bristleback boars of the ravine.
Object.assign(MONSTERS, {
  'de-viper':  { name: 'Sandscale viper',    level: 12, hp: 16, att: 12, str: 11, def: 8,  magic: 1, atkBonus: 10, strBonus: 9,  defBonus: 7,  speed: 4, respawn: 40, kind: 'stab',  wander: 5, pace: 0.9, rest: [2, 6], aggro: 8,  leash: 36, stuck: 8, rig: true },
  'de-spider': { name: 'Dunewidow',          level: 13, hp: 18, att: 13, str: 12, def: 9,  magic: 1, atkBonus: 11, strBonus: 10, defBonus: 8,  speed: 5, respawn: 45, kind: 'stab',  wander: 5, pace: 1.0, rest: [2, 7], aggro: 9,  leash: 38, stuck: 8, pack: true, packR: 12, rig: true },
  'de-brood':  { name: 'Brood-Queen Skarra', level: 16, hp: 48, att: 16, str: 16, def: 13, magic: 1, atkBonus: 16, strBonus: 16, defBonus: 13, speed: 5, respawn: 150, kind: 'stab', wander: 1, pace: 0.6, rest: [5, 12], aggro: 10, leash: 30, stuck: 8, rig: true, scale: 1.5 },
  'de-boar':   { name: 'Bristleback boar',   level: 13, hp: 20, att: 12, str: 13, def: 10, magic: 1, atkBonus: 10, strBonus: 12, defBonus: 9,  speed: 5, respawn: 45, kind: 'crush', wander: 6, pace: 1.0, rest: [2, 7], aggro: 8,  leash: 40, stuck: 8, pack: true, packR: 12, rig: true },
  'de-tusker': { name: 'Old Gristletusk',    level: 17, hp: 52, att: 17, str: 18, def: 14, magic: 1, atkBonus: 17, strBonus: 18, defBonus: 14, speed: 5, respawn: 150, kind: 'crush', wander: 1, pace: 0.6, rest: [5, 12], aggro: 10, leash: 30, stuck: 8, rig: true, scale: 1.4 },
});
Object.assign(DROPS, {
  'de-viper':  { always: ['bones'], table: [{ w: 55 }, { w: 30, sup: { coins: 18 } }, { w: 15, sup: { 'earth-rune': 8 } }] },
  'de-spider': { always: ['bones'], table: [{ w: 60 }, { w: 30, sup: { coins: 16 } }, { w: 10, sup: { 'chaos-rune': 2 } }] },
  'de-brood':  { always: ['big-bones'], energy: 1 / 4, table: [{ w: 30, sup: { coins: 150 } }, { w: 20, sup: { 'law-rune': 3 } }, { w: 10, item: 'brass-necklace' }] },
  'de-boar':   { always: ['bones'], table: [{ w: 55 }, { w: 30, sup: { coins: 18 } }, { w: 15, item: 'raw-trout' }] },
  'de-tusker': { always: ['big-bones'], energy: 1 / 4, table: [{ w: 30, sup: { coins: 160 } }, { w: 20, item: 'bronze-sq-shield' }, { w: 10, sup: { 'cosmic-rune': 4 } }] },
});
Object.assign(MON.stands, { 'de-viper': 1.0, 'de-spider': 1.6, 'de-brood': 2.4, 'de-boar': 1.6, 'de-tusker': 2.2 });
Object.assign(ATTACKS, { 'de-viper': ATTACKS.goblin, 'de-spider': ATTACKS.cow, 'de-brood': ATTACKS.bull, 'de-boar': ATTACKS.cow, 'de-tusker': ATTACKS.bull });

// Beastwild (zone-creatures, 2026-10-10: "all the portal zones design pass right"). The boss preserve, level 18-30.
Object.assign(MONSTERS, {
  'bw-boar':     { name: 'Tusked jungle boar', level: 18, hp: 30, att: 17, str: 18, def: 13, magic: 1, atkBonus: 16, strBonus: 17, defBonus: 12, speed: 5, respawn: 45, kind: 'crush', wander: 7, pace: 1.0, rest: [2, 7], aggro: 7, leash: 40, stuck: 8, pack: true, packR: 12 },
  'bw-princess': { name: 'Princess',           level: 22, hp: 70, att: 22, str: 23, def: 17, magic: 1, atkBonus: 22, strBonus: 23, defBonus: 17, speed: 5, respawn: 150, kind: 'crush', wander: 1, pace: 0.7, rest: [5, 12], aggro: 9, leash: 30, stuck: 8 },
  'bw-gnoll':    { name: 'Riverpaw mauler',    level: 19, hp: 30, att: 18, str: 18, def: 13, magic: 1, atkBonus: 17, strBonus: 17, defBonus: 12, speed: 4, respawn: 45, kind: 'slash', wander: 3, pace: 0.8, rest: [3, 8], aggro: 8, leash: 34, stuck: 8, faint: true, rig: true },
  'bw-hogger':   { name: 'Hogger',             level: 24, hp: 95, att: 24, str: 26, def: 19, magic: 1, atkBonus: 24, strBonus: 26, defBonus: 19, speed: 5, respawn: 180, kind: 'crush', wander: 1, pace: 0.6, rest: [5, 12], aggro: 10, leash: 28, stuck: 8, faint: true, rig: true },
  'bw-golem':    { name: 'Harvest Watcher',    level: 21, hp: 45, att: 20, str: 21, def: 18, magic: 1, atkBonus: 19, strBonus: 20, defBonus: 18, speed: 3, respawn: 60, kind: 'crush', wander: 4, pace: 0.6, rest: [4, 10], aggro: 7, leash: 36, stuck: 8 },
  'bw-fang':     { name: 'Mother Fang',        level: 23, hp: 80, att: 23, str: 22, def: 17, magic: 1, atkBonus: 23, strBonus: 22, defBonus: 17, speed: 5, respawn: 150, kind: 'stab', wander: 1, pace: 0.7, rest: [4, 10], aggro: 10, leash: 28, stuck: 8 },
  'bw-spider':   { name: 'Fanglair creeper',   level: 19, hp: 26, att: 19, str: 17, def: 12, magic: 1, atkBonus: 18, strBonus: 16, defBonus: 11, speed: 5, respawn: 45, kind: 'stab', wander: 4, pace: 1.0, rest: [2, 7], aggro: 9, leash: 36, stuck: 8, pack: true, packR: 12 },
  'bw-kobold':   { name: 'Kobold bone-picker', level: 18, hp: 24, att: 17, str: 16, def: 12, magic: 1, atkBonus: 16, strBonus: 15, defBonus: 11, speed: 4, respawn: 40, kind: 'stab', wander: 3, pace: 0.9, rest: [3, 8], aggro: 8, leash: 32, stuck: 8, faint: true },
  'bw-ogre':     { name: 'Grumm the Mound-Ogre', level: 26, hp: 120, att: 26, str: 29, def: 21, magic: 1, atkBonus: 26, strBonus: 29, defBonus: 21, speed: 4, respawn: 200, kind: 'crush', wander: 1, pace: 0.5, rest: [6, 14], aggro: 9, leash: 26, stuck: 8 },
  'bw-dragon':   { name: 'Verdantha, the Green Wyrm', level: 30, hp: 220, att: 30, str: 32, def: 26, magic: 30, atkBonus: 32, strBonus: 34, defBonus: 26, speed: 4, respawn: 420, kind: 'slash', wander: 0, pace: 0.4, rest: [6, 14], aggro: 14, leash: 22, stuck: 8 },
});
Object.assign(DROPS, {
  'bw-boar':     { always: ['big-bones'], table: [{ w: 55 }, { w: 30, sup: { coins: 40 } }, { w: 15, item: 'raw-trout' }] },
  'bw-princess': { always: ['big-bones'], energy: 1 / 4, table: [{ w: 40, sup: { coins: 240 } }, { w: 30, item: 'bronze-sq-shield' }, { w: 30, sup: { 'law-rune': 6 } }] },
  'bw-gnoll':    { always: ['bones'], table: [{ w: 50 }, { w: 30, sup: { coins: 38 } }, { w: 12, item: 'bronze-spear' }, { w: 8, sup: { 'earth-rune': 14 } }] },
  'bw-hogger':   { always: ['big-bones'], energy: 1 / 4, table: [{ w: 35, sup: { coins: 320 } }, { w: 25, item: 'goblin-mail' }, { w: 20, item: 'brass-necklace' }, { w: 20, sup: { 'law-rune': 10 } }] },
  'bw-golem':    { always: [], table: [{ w: 50, sup: { coins: 44 } }, { w: 30, item: 'hammer' }, { w: 20, sup: { 'earth-rune': 18 } }] },
  'bw-fang':     { always: ['big-bones'], energy: 1 / 4, table: [{ w: 40, sup: { coins: 280 } }, { w: 30, sup: { 'chaos-rune': 16 } }, { w: 30, item: 'brass-necklace' }] },
  'bw-spider':   { always: ['bones'], table: [{ w: 60 }, { w: 30, sup: { coins: 30 } }, { w: 10, sup: { 'chaos-rune': 4 } }] },
  'bw-kobold':   { always: ['bones'], table: [{ w: 50 }, { w: 35, sup: { coins: 32 } }, { w: 15, sup: { 'water-rune': 14 } }] },
  'bw-ogre':     { always: ['big-bones', 'big-bones'], energy: 1 / 2, table: [{ w: 40, sup: { coins: 420 } }, { w: 30, item: 'goblin-mail' }, { w: 30, sup: { 'death-rune': 8 } }] },
  'bw-dragon':   { always: ['big-bones', 'big-bones'], energy: 1, table: [{ w: 40, sup: { coins: 900 } }, { w: 30, sup: { 'death-rune': 30 } }, { w: 30, sup: { 'blood-rune': 20 } }, { w: 10, item: 'brass-necklace' }] },
});
Object.assign(MON.stands, { 'bw-boar': 1.8, 'bw-princess': 2.4, 'bw-gnoll': 2.2, 'bw-hogger': 3.0, 'bw-golem': 2.8, 'bw-fang': 2.4, 'bw-spider': 1.6, 'bw-kobold': 1.8, 'bw-ogre': 4.0, 'bw-dragon': 7.5 });
Object.assign(ATTACKS, { 'bw-boar': ATTACKS.cow, 'bw-princess': ATTACKS.bull, 'bw-gnoll': ATTACKS.goblin, 'bw-hogger': ATTACKS.bull, 'bw-golem': ATTACKS.bull, 'bw-fang': ATTACKS.cow, 'bw-spider': ATTACKS.cow, 'bw-kobold': ATTACKS.goblin, 'bw-ogre': ATTACKS.bull, 'bw-dragon': ATTACKS.bull });
