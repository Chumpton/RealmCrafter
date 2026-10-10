// CLASS COMBAT (Campton, 2026-10-06): a second spell system beside Zezima's OSRS book, switched by the crest left of the action bar.
// Mode 'osrs' = Zezima's system untouched (his bar, his runes, his book). Any other mode swaps the bar for that class's kit below.
// One table: the class bar (ui/hud/classbar.js), the caster (scripts/class-cast-player.js) and the tooltips read it. Every tuned number lives here.
// Per Campton's pipeline doc: 1.2 s global cooldown, a 400 ms queue window, wind-up -> release -> flight -> impact -> aura, a shape per school.

export const GCD_MS = 1500;      // the global cooldown every press starts (creator 2026-10-10: WoW pacing, 1.5 s casters, 1.0 s melee)
// the heartbeat: casters 1.5 s, the warrior 1.0 s; haste (player.state.haste, %) speeds it, never under 0.75 s
export const gcdOf = (s, cls) => Math.max(750, Math.round((['warrior', 'vwarrior', 'vrogue'].includes(cls) ? 1000 : 1500) / (1 + Math.max(0, +(s?.haste ?? 0) || 0) / 100)));
export const CRIT = { chance: 0.15, mul: 1.5 };  // a crit: half again the hit, a bigger number, a jolt
// procs (Spell Activation Overlay): a landed hit may make the next Cast-kind spell instant
export const PROC = { chance: 0.2, ms: 10000, names: { mage: 'Hot Streak', warlock: 'Backlash', shaman: 'Lava Surge', warrior: 'Sudden Death', wow: 'Hot Streak', vmage: 'Clearcasting' } };
// range bands in metres (WoW yards x 0.9): 5 yd melee, 20 yd midrange, 40 yd ranged
export const BANDS = { melee: 4.5, mid: 18, ranged: 36 };
export const QUEUE_MS = 400;     // a press this close to the end of a cast or the GCD waits and fires on its own
export const XP_PER_DMG = 40;    // tenths of xp per damage in the class's skill (OSRS combat is 4 xp per damage)
export const HP_XP_PER_DMG = 13; // tenths of hitpoints xp per damage

// the four kinds every element carries; numbers agree with OSRS monsters (goblin 5 hp, bull 26, wolf 18)
// mult x (2 + level/8) is the max hit: at Magic 1 an instant hits up to 2, a hardcast 4, a cooldown 5; at 50: 8, 18, 21
export const KINDS = {
  instant:  { label: 'Instant',  badge: 'I',   mult: 1.0, cast: 0,    cd: 0,     range: 18 },
  cast:     { label: 'Cast',     badge: 'C',   mult: 2.2, cast: 1800, cd: 0,     range: 36 },
  cooldown: { label: 'Cooldown', badge: 'CD',  mult: 2.6, cast: 0,    cd: 12000, range: 18 },
  aoe:      { label: 'AoE',      badge: 'AoE', mult: 0.9, cast: 1200, cd: 8000,  range: 18, radius: 4 },
  // off the GCD (oGCD): fire mid-rotation, even mid-cast, without stalling it
  interrupt: { label: 'Interrupt', badge: 'INT', mult: 0.5, cast: 0, cd: 15000, range: 18, ogcd: true },
  defensive: { label: 'Defensive', badge: 'DEF', mult: 0,   cast: 0, cd: 45000, range: 0, self: true, ogcd: true, ward: { pct: 0.5, ms: 6000 } },
};
// the warrior is melee: short reach, a quick wind-up, the AoE around himself; his Thunder cooldown is a thrown hammer
const MELEE = { instant: { range: 4.5 }, cast: { cast: 1000, range: 4.5 }, cooldown: { range: 4.5 }, aoe: { cast: 0, range: 0, radius: 5, self: true } };

// school = the visual family (shape of its fx, its impact sound); status = the aura its cooldown leaves
export const SCHOOLS = {
  fire:   { sound: '/cdn/moodboard-painterly-fantasy/sfx-fire-spell-impact-whoomp.mp3', status: 'burn' },
  frost:  { sound: '/cdn/moodboard-painterly-fantasy/sfx-frost-spell-shatter-impact.mp3', status: 'freeze' },
  arcane: { sound: '/cdn/moodboard-painterly-fantasy/sfx-arcane-spell-impact-chime-burst.mp3', status: 'freeze' },
  storm:  { sound: '/cdn/moodboard-painterly-fantasy/sfx-lightning-spell-crack-impact.mp3', status: 'freeze' },
  shadow: { sound: '/cdn/moodboard-painterly-fantasy/sfx-shadow-spell-impact-dark-whoosh.mp3', status: 'burn' },
  earth:  { sound: '/cdn/moodboard-painterly-fantasy/sfx-earth-spell-rock-crash-impact.mp3', status: 'freeze' },
  steel:  { sound: '/cdn/moodboard-painterly-fantasy/sfx-sword-heavy-strike-impact.mp3', status: 'burn' },
  holy:   { sound: '/cdn/moodboard-painterly-fantasy/sfx-arcane-spell-impact-chime-burst.mp3', status: 'freeze' },
  nature: { sound: '/cdn/moodboard-painterly-fantasy/sfx-earth-spell-rock-crash-impact.mp3', status: 'burn' },
};
export const SOUNDS = {
  windup: '/cdn/moodboard-painterly-fantasy/sfx-spell-charge-rising-hum.mp3',
  release: '/cdn/moodboard-painterly-fantasy/sfx-spell-release-snap-crack.mp3',
  swing: '/cdn/moodboard-lowpoly-cozy/sfx-sword-swing-whoosh.mp3',
  fizzle: '/cdn/moodboard-lowpoly-cozy/sfx-spell-fizzle-fail.mp3',
  mode: '/cdn/moodboard-painterly-fantasy/sfx-class-stance-switch-shimmer.mp3',
};
// status auras: burn = 3 more hits of 25% over 3 s; freeze = rooted (monster.js reads boundUntil)
export const STATUS = { burn: { ticks: 3, every: 1, frac: 0.25 }, freeze: { rootMs: 2500 } };

// [element name, school, glyph, color, [instant, cast, cooldown, aoe] names]
const C = {
  mage: { name: 'Mage', crest: '🔮', skill: 'magic', color: '#7fb6ff', line: 'Robes and ruin. Long casts, huge hits.', els: [
    ['Fire', 'fire', '🔥', '#ff7a2a', ['Scorch', 'Fireball', 'Pyroblast', 'Flamestrike']],
    ['Frost', 'frost', '❄', '#8fd8ff', ['Ice Lance', 'Frostbolt', 'Glacial Spike', 'Blizzard']],
    ['Arcane', 'arcane', '✷', '#c48bff', ['Arcane Missiles', 'Arcane Blast', 'Arcane Surge', 'Arcane Explosion']],
    ['Lightning', 'storm', '⚡', '#fff27a', ['Spark', 'Lightning Bolt', 'Static Overload', 'Chain Storm']],
  ] },
  warlock: { name: 'Warlock', crest: '💀', skill: 'magic', color: '#9a6bff', line: 'Pacts with the dark. Everything burns slow.', els: [
    ['Shadow', 'shadow', '☾', '#8a5cff', ['Corruption', 'Shadow Bolt', 'Shadowfury', 'Rain of Shadow']],
    ['Fel', 'fire', '☠', '#7dff4a', ['Fel Flame', 'Chaos Bolt', 'Immolate', 'Hellfire']],
    ['Blood', 'shadow', '🩸', '#e0304a', ['Blood Lash', 'Blood Rite', 'Haemorrhage', 'Crimson Tide']],
    ['Void', 'arcane', '◉', '#6b5bff', ['Void Spike', 'Void Lance', 'Rift', 'Collapse']],
  ] },
  shaman: { name: 'Shaman', crest: '🪶', skill: 'magic', color: '#4fc3a1', line: 'The four elements, called by name.', els: [
    ['Fire', 'fire', '🔥', '#ff8c3a', ['Flame Shock', 'Lava Burst', 'Searing Totem', 'Fire Nova']],
    ['Water', 'frost', '💧', '#3fa9ff', ['Frost Shock', 'Tidal Bolt', 'Riptide', 'Crashing Wave']],
    ['Earth', 'earth', '⛰', '#c49a5a', ['Earth Shock', 'Stone Bolt', 'Earthbind', 'Earthquake']],
    ['Air', 'storm', '🌀', '#d9f5ff', ['Wind Lash', 'Lightning Bolt', 'Thunderstorm', 'Chain Lightning']],
  ] },
  warrior: { name: 'Warrior', crest: '🛡', skill: 'strength', color: '#d8a560', line: 'Steel and nerve. Get close.', els: [
    ['Steel', 'steel', '⚔', '#dfe4ea', ['Slam', 'Mortal Strike', 'Execute', 'Whirlwind']],
    ['Fury', 'steel', '💢', '#ff5a2a', ['Bloodthirst', 'Raging Blow', 'Rampage', 'Cleave']],
    ['Thunder', 'storm', '⚡', '#ffe066', ['Thunder Strike', 'Storm Hammer', 'Storm Bolt', 'Thunder Clap']],
    ['Earth', 'earth', '⛰', '#a8854f', ['Shield Bash', 'Sunder', 'Shockwave', 'Earthshatter']],
  ] },
  // VANILLA CLASSES (creator 2026-10-10: "complete all spells that original vanilla wow had but in our style"): each its own book below
  vwarrior: { name: 'Warrior', crest: '⚔', skill: 'strength', color: '#c79c6e', line: 'Arms, Fury, Protection. Rage and steel.', book: true, els: [
    ['Arms', 'steel', '⚔', '#d8b07a', []], ['Fury', 'steel', '💢', '#ff5a2a', []], ['Protection', 'earth', '🛡', '#a8854f', []] ] },
  vpaladin: { name: 'Paladin', crest: '✚', skill: 'magic', color: '#f58cba', line: 'Holy, Protection, Retribution. The Light in plate.', book: true, els: [
    ['Holy', 'holy', '✚', '#ffe27a', []], ['Protection', 'holy', '🛡', '#f5c96a', []], ['Retribution', 'holy', '⚖', '#f58cba', []] ] },
  vhunter: { name: 'Hunter', crest: '🏹', skill: 'ranged', color: '#abd473', line: 'Beast Mastery, Marksmanship, Survival.', book: true, els: [
    ['Marksmanship', 'arcane', '🏹', '#c8e08a', []], ['Beast Mastery', 'nature', '🐺', '#abd473', []], ['Survival', 'nature', '🪤', '#8fbf5a', []] ] },
  vrogue: { name: 'Rogue', crest: '🗡', skill: 'strength', color: '#fff569', line: 'Assassination, Combat, Subtlety.', book: true, els: [
    ['Assassination', 'nature', '☠', '#9be05a', []], ['Combat', 'steel', '🗡', '#fff569', []], ['Subtlety', 'shadow', '☾', '#8a7aff', []] ] },
  vpriest: { name: 'Priest', crest: '☀', skill: 'magic', color: '#f0f0f0', line: 'Discipline, Holy, Shadow.', book: true, els: [
    ['Discipline', 'arcane', '✦', '#cfe8ff', []], ['Holy', 'holy', '☀', '#ffe9a0', []], ['Shadow', 'shadow', '☾', '#9a6bff', []] ] },
  vshaman: { name: 'Shaman', crest: '🌀', skill: 'magic', color: '#2e8bff', line: 'Elemental, Enhancement, Restoration.', book: true, els: [
    ['Elemental', 'storm', '⚡', '#8fc8ff', []], ['Enhancement', 'earth', '⛰', '#d0a060', []], ['Restoration', 'frost', '💧', '#3fa9ff', []] ] },
  vmage: { name: 'Mage', crest: '🧙', skill: 'magic', color: '#69ccf0', line: 'Arcane, Fire, Frost. Fireball to Evocation.', book: true, els: [
    ['Fire', 'fire', '🔥', '#ff7a2a', []], ['Frost', 'frost', '❄', '#8fd8ff', []], ['Arcane', 'arcane', '✷', '#c48bff', []] ] },
  vwarlock: { name: 'Warlock', crest: '💀', skill: 'magic', color: '#9482c9', line: 'Affliction, Demonology, Destruction.', book: true, els: [
    ['Affliction', 'shadow', '☠', '#8a5cff', []], ['Demonology', 'shadow', '😈', '#b07aff', []], ['Destruction', 'fire', '🔥', '#7dff4a', []] ] },
  vdruid: { name: 'Druid', crest: '🍃', skill: 'magic', color: '#ff7d0a', line: 'Balance, Feral, Restoration.', book: true, els: [
    ['Balance', 'arcane', '🌙', '#b8a0ff', []], ['Feral', 'steel', '🐾', '#ff7d0a', []], ['Restoration', 'nature', '🍃', '#7fe08a', []] ] },
  // WOW MODE (Campton, 2026-10-07: "separate into WoW mode within the hotbar"): the classic spells from his bender/wow-spells files,
  // one kit on the crest beside the OSRS book; it rides this same caster, so the OSRS bar stays exactly as Zezima built it.
  wow: { name: 'WoW', crest: '🦅', skill: 'magic', color: '#f5c542', line: 'Classic World of Warcraft spells, one bar.', els: [
    ['Fire', 'fire', '🔥', '#ff7a2a', ['Flame Shock', 'Fireball', 'Pyroblast', 'Flamestrike']],
    ['Frost', 'frost', '❄', '#8fd8ff', ['Cone of Cold', 'Frostbolt', 'Frost Nova', 'Blizzard']],
    ['Arcane', 'arcane', '✷', '#c48bff', ['Moonfire', 'Wrath', 'Arcane Missiles', 'Arcane Explosion']],
    ['Storm', 'storm', '⚡', '#fff27a', ['Earth Shock', 'Lightning Bolt', 'Chain Lightning', 'Thunder Clap']],
  ] },
};
const KIND_IDS = ['instant', 'cast', 'cooldown', 'aoe'];
export const MODES = [{ id: 'osrs', name: 'OSRS', crest: '📖', color: '#ba8950', line: "Zezima's OSRS spellbook and runes, as he built it." },
  ...Object.entries(C).filter(([id, c]) => c.book).map(([id, c]) => ({ id, name: c.name, crest: c.crest, color: c.color, line: c.line }))];
export const isClassMode = (m) => !!C[m];
export const classOf = (m) => C[m] ?? null;
// creator 2026-10-10: the crest flicks OSRS -> the nine vanilla classes -> OSRS
export const CLASS_CYCLE = ['osrs', 'vwarrior', 'vpaladin', 'vhunter', 'vrogue', 'vpriest', 'vshaman', 'vmage', 'vwarlock', 'vdruid'];
export const nextMode = (m) => CLASS_CYCLE[(CLASS_CYCLE.indexOf(m) + 1) % CLASS_CYCLE.length];

// every class spell, id = <class>-<element>-<kind>
export const CLASS_SPELLS = {};
for (const [cid, c] of Object.entries(C)) if (!c.book) c.els.forEach(([el, school, glyph, color, names], ei) => KIND_IDS.forEach((k, ki) => {
  const base = { ...KINDS[k], ...(cid === 'warrior' ? MELEE[k] : {}) };
  if (cid === 'warrior' && k === 'cooldown' && el === 'Thunder') base.range = 14; // Storm Bolt: a hammer thrown
  const id = `${cid}-${el.toLowerCase()}-${k}`;
  CLASS_SPELLS[id] = { id, cls: cid, el, school, glyph, color, kind: k, name: names[ki], skill: c.skill, melee: cid === 'warrior' && base.range > 0 && base.range < 5, ...base,
    status: k === 'cooldown' ? SCHOOLS[school].status : null };
}));
// each kit's two off-GCD tools: [interrupt, defensive], the school their flash wears
const UTIL = { mage: ['Counterspell', 'Ice Block', 'arcane'], warlock: ['Spell Lock', 'Unending Resolve', 'shadow'], shaman: ['Wind Shear', 'Astral Shift', 'storm'],
  warrior: ['Pummel', 'Shield Wall', 'steel'], wow: ['Counterspell', 'Ice Block', 'arcane'] };
for (const [cid, [kick, wall, school]] of Object.entries(UTIL)) {
  const c = C[cid]; if (!c) continue;
  CLASS_SPELLS[`${cid}-util-interrupt`] = { id: `${cid}-util-interrupt`, cls: cid, el: 'Utility', school, glyph: '✋', color: '#ffd36a', kind: 'interrupt', name: kick, skill: c.skill, ...KINDS.interrupt,
    ...(cid === 'warrior' ? { range: BANDS.melee } : {}), melee: cid === 'warrior', status: null };
  CLASS_SPELLS[`${cid}-util-defensive`] = { id: `${cid}-util-defensive`, cls: cid, el: 'Utility', school, glyph: '🛡', color: '#9fd8ff', kind: 'defensive', name: wall, skill: c.skill, ...KINDS.defensive, melee: false, status: null };
}
// VANILLA BOOKS: one row per spell, its own numbers (vanilla cast times; damage on our OSRS scale via mult). kind = its bar badge.
// self = around the caster, cone = degrees in front, pulses/every = a channel's ticks, special = a verb class-cast-player.js owns
// (blink, poly, evocate, barrier). slot = its place on the bar (0-7 keys 1-8, 10-17 Shift+1-8; 8, 9 = interrupt, defensive).
const F = ['Fire', 'fire', '🔥', '#ff7a2a'], R = ['Frost', 'frost', '❄', '#8fd8ff'], A = ['Arcane', 'arcane', '✷', '#c48bff'];
// a class's three trees as [el, school, glyph, color], read off C so the tabs and the rows agree
const T = (cid) => C[cid].els.map(([el, school, glyph, color]) => [el, school, glyph, color]);
const M = { range: 4.5, melee: true }; // a melee blow
const SELF = { range: 0, self: true }; // around / on the caster
// the creator 2026-10-10 "every spell in the game": each book is 16 rows, in the order its icon sheet was painted (cell = row index)
const ROWS = {
  vwarrior: (([a, f, p]) => [
    [a, 'Heroic Strike', 'instant', { ...M, mult: 1.4 }], [a, 'Mortal Strike', 'cooldown', { ...M, mult: 2.4, cd: 6000 }],
    [a, 'Rend', 'instant', { ...M, mult: 0.8, status: 'burn' }], [a, 'Overpower', 'instant', { ...M, mult: 1.6, cd: 5000 }],
    [f, 'Execute', 'cooldown', { ...M, mult: 3.0, cd: 10000 }], [f, 'Whirlwind', 'aoe', { ...SELF, mult: 1.4, radius: 6, cd: 10000 }],
    [p, 'Thunder Clap', 'aoe', { ...SELF, mult: 0.9, radius: 8, cd: 6000, chillMs: 3000 }], [f, 'Cleave', 'instant', { ...M, mult: 1.2, splash: 4 }],
    [a, 'Charge', 'instant', { ...SELF, mult: 0, cd: 15000, special: 'blink', dist: 14 }], [a, 'Hamstring', 'instant', { ...M, mult: 0.6, chillMs: 4000 }],
    [p, 'Shield Slam', 'cooldown', { ...M, mult: 2.0, cd: 6000 }], [p, 'Sunder Armor', 'instant', { ...M, mult: 0.9 }],
    [f, 'Bloodthirst', 'cooldown', { ...M, mult: 2.2, cd: 6000 }], [f, 'Battle Shout', 'cooldown', { ...SELF, mult: 0, cd: 30000, special: 'buff', buff: { mul: 1.15, ms: 20000 } }],
    [f, 'Intercept', 'instant', { ...SELF, mult: 0, cd: 25000, special: 'blink', dist: 16 }], [p, 'Retaliation', 'defensive', { ...SELF, mult: 0, cd: 60000, special: 'barrier', ward: { pct: 0.5, ms: 10000 } }],
  ])(T('vwarrior')),
  vpaladin: (([h, p, r]) => [
    [r, 'Judgement', 'instant', { mult: 1.8, range: 10, cd: 8000 }], [h, 'Holy Light', 'cast', { ...SELF, cast: 2500, mult: 0, special: 'heal', heal: 0.45 }],
    [h, 'Flash of Light', 'cast', { ...SELF, cast: 1500, mult: 0, special: 'heal', heal: 0.2 }], [p, 'Hammer of Justice', 'instant', { mult: 0.4, range: 10, cd: 30000, rootMs: 6000 }],
    [h, 'Exorcism', 'instant', { mult: 2.0, range: 30, cd: 15000 }], [h, 'Holy Shock', 'instant', { mult: 1.7, range: 20, cd: 15000 }],
    [p, 'Consecration', 'aoe', { ...SELF, mult: 1.3, radius: 8, cd: 8000 }], [h, 'Holy Wrath', 'aoe', { ...SELF, cast: 2000, mult: 1.6, radius: 10, cd: 30000 }],
    [r, 'Seal of Command', 'cooldown', { ...SELF, mult: 0, cd: 30000, special: 'buff', buff: { mul: 1.2, ms: 30000 } }], [r, 'Holy Strike', 'instant', { ...M, mult: 1.5 }],
    [r, 'Hammer of Wrath', 'cooldown', { cast: 1000, mult: 2.6, range: 30, cd: 6000 }], [h, 'Lay on Hands', 'cooldown', { ...SELF, mult: 0, cd: 120000, special: 'heal', heal: 1 }],
    [p, 'Blessing of Kings', 'cooldown', { ...SELF, mult: 0, cd: 60000, special: 'buff', buff: { mul: 1.1, ms: 60000 } }], [p, 'Divine Protection', 'defensive', { ...SELF, mult: 0, cd: 60000, special: 'barrier', ward: { pct: 0.5, ms: 8000 } }],
    [r, 'Retribution Aura', 'cooldown', { ...SELF, mult: 0, cd: 30000, special: 'buff', buff: { mul: 1.1, ms: 45000 } }], [p, 'Divine Shield', 'defensive', { ...SELF, mult: 0, cd: 120000, special: 'barrier', ward: { pct: 1, ms: 8000 } }],
  ])(T('vpaladin')),
  vhunter: (([m, b, s]) => [
    [m, 'Auto Shot', 'instant', { mult: 1.0, range: 35 }], [m, 'Aimed Shot', 'cooldown', { cast: 3000, mult: 3.0, range: 35, cd: 6000 }],
    [m, 'Arcane Shot', 'instant', { mult: 1.4, range: 35, cd: 6000 }], [m, 'Multi-Shot', 'aoe', { mult: 1.2, range: 35, radius: 4, cd: 10000 }],
    [b, 'Serpent Sting', 'instant', { mult: 0.8, range: 35, status: 'burn' }], [m, 'Concussive Shot', 'instant', { mult: 0.5, range: 35, cd: 12000, chillMs: 4000 }],
    [m, 'Volley', 'aoe', { mult: 0.6, range: 35, radius: 7, pulses: 4, every: 1 }], [s, 'Explosive Trap', 'aoe', { ...SELF, mult: 1.6, radius: 5, cd: 15000, status: 'burn' }],
    [s, 'Raptor Strike', 'instant', { ...M, mult: 1.6, cd: 6000 }], [s, 'Wing Clip', 'instant', { ...M, mult: 0.6, chillMs: 5000 }],
    [s, 'Mongoose Bite', 'instant', { ...M, mult: 1.8, cd: 5000 }], [m, "Hunter's Mark", 'cooldown', { ...SELF, mult: 0, cd: 30000, special: 'buff', buff: { mul: 1.12, ms: 30000 } }],
    [s, 'Scatter Shot', 'instant', { mult: 0.3, range: 15, cd: 30000, rootMs: 4000 }], [b, 'Bestial Wrath', 'cooldown', { ...SELF, mult: 0, cd: 120000, special: 'buff', buff: { mul: 1.3, ms: 15000 } }],
    [s, 'Freezing Trap', 'aoe', { ...SELF, mult: 0.1, radius: 4, cd: 15000, rootMs: 10000 }], [s, 'Feign Death', 'defensive', { ...SELF, mult: 0, cd: 30000, special: 'barrier', ward: { pct: 0.9, ms: 4000 } }],
  ])(T('vhunter')),
  vrogue: (([a, c, s]) => [
    [c, 'Sinister Strike', 'instant', { ...M, mult: 1.4 }], [a, 'Eviscerate', 'cooldown', { ...M, mult: 2.6, cd: 8000 }],
    [c, 'Backstab', 'instant', { ...M, mult: 2.0, cd: 4000 }], [c, 'Gouge', 'instant', { ...M, mult: 0.4, cd: 10000, rootMs: 4000 }],
    [a, 'Rupture', 'instant', { ...M, mult: 0.9, status: 'burn' }], [s, 'Ambush', 'cooldown', { ...M, mult: 3.2, cd: 20000 }],
    [c, 'Blade Flurry', 'aoe', { ...SELF, mult: 1.3, radius: 5, cd: 20000 }], [c, 'Riposte', 'instant', { ...M, mult: 1.5, cd: 6000 }],
    [a, 'Kidney Shot', 'instant', { ...M, mult: 0.5, cd: 20000, rootMs: 6000 }], [s, 'Cheap Shot', 'instant', { ...M, mult: 0.4, cd: 15000, rootMs: 4000 }],
    [a, 'Garrote', 'instant', { ...M, mult: 1.0, cd: 10000, status: 'burn' }], [s, 'Hemorrhage', 'instant', { ...M, mult: 1.6 }],
    [s, 'Blind', 'instant', { mult: 0, range: 10, cd: 60000, rootMs: 10000 }], [c, 'Sprint', 'instant', { ...SELF, mult: 0, cd: 30000, special: 'blink', dist: 16 }],
    [a, 'Deadly Poison', 'cooldown', { ...SELF, mult: 0, cd: 30000, special: 'buff', buff: { mul: 1.15, ms: 30000 } }], [c, 'Evasion', 'defensive', { ...SELF, mult: 0, cd: 120000, special: 'barrier', ward: { pct: 0.5, ms: 15000 } }],
  ])(T('vrogue')),
  vpriest: (([d, h, s]) => [
    [h, 'Smite', 'cast', { cast: 2500, mult: 2.0, range: 30 }], [s, 'Mind Blast', 'cooldown', { cast: 1500, mult: 2.2, range: 30, cd: 8000 }],
    [s, 'Shadow Word: Pain', 'instant', { mult: 0.9, range: 30, status: 'burn' }], [s, 'Mind Flay', 'cast', { cast: 0, mult: 0.8, range: 20, pulses: 3, every: 1, chillMs: 1000 }],
    [h, 'Holy Fire', 'cast', { cast: 3500, mult: 2.6, range: 30, status: 'burn' }], [s, 'Devouring Plague', 'cooldown', { mult: 1.2, range: 30, cd: 30000, status: 'burn' }],
    [h, 'Holy Nova', 'aoe', { ...SELF, mult: 0.9, radius: 10 }], [s, 'Psychic Scream', 'aoe', { ...SELF, mult: 0.1, radius: 8, cd: 30000, rootMs: 8000 }],
    [h, 'Greater Heal', 'cast', { ...SELF, cast: 3000, mult: 0, special: 'heal', heal: 0.6 }], [h, 'Flash Heal', 'cast', { ...SELF, cast: 1500, mult: 0, special: 'heal', heal: 0.25 }],
    [h, 'Renew', 'instant', { ...SELF, mult: 0, special: 'heal', heal: 0.2 }], [h, 'Prayer of Healing', 'cast', { ...SELF, cast: 3000, mult: 0, special: 'heal', heal: 0.45 }],
    [s, 'Vampiric Embrace', 'cooldown', { ...SELF, mult: 0, cd: 30000, special: 'buff', buff: { mul: 1.15, ms: 30000 } }], [d, 'Power Word: Shield', 'defensive', { ...SELF, mult: 0, cd: 15000, special: 'barrier', ward: { pct: 0.6, ms: 12000 } }],
    [d, 'Starshards', 'cooldown', { cast: 0, mult: 0.7, range: 30, cd: 30000, pulses: 5, every: 0.6 }], [d, 'Fade', 'defensive', { ...SELF, mult: 0, cd: 30000, special: 'barrier', ward: { pct: 0.3, ms: 6000 } }],
  ])(T('vpriest')),
  vshaman: (([e, n, r]) => [
    [e, 'Lightning Bolt', 'cast', { cast: 2500, mult: 2.2, range: 30 }], [e, 'Chain Lightning', 'cooldown', { cast: 2000, mult: 2.0, range: 30, radius: 5, cd: 6000 }],
    [n, 'Earth Shock', 'instant', { mult: 1.6, range: 20, cd: 6000 }], [e, 'Flame Shock', 'instant', { mult: 1.0, range: 20, cd: 6000, status: 'burn', school: 'fire' }],
    [r, 'Frost Shock', 'instant', { mult: 1.2, range: 20, cd: 6000, chillMs: 5000 }], [n, 'Stormstrike', 'cooldown', { ...M, mult: 2.2, cd: 12000 }],
    [e, 'Fire Nova Totem', 'aoe', { ...SELF, mult: 1.4, radius: 8, cd: 15000, school: 'fire' }], [e, 'Magma Totem', 'aoe', { ...SELF, mult: 1.0, radius: 8, status: 'burn', school: 'fire' }],
    [r, 'Healing Wave', 'cast', { ...SELF, cast: 2500, mult: 0, special: 'heal', heal: 0.5 }], [r, 'Lesser Healing Wave', 'cast', { ...SELF, cast: 1500, mult: 0, special: 'heal', heal: 0.25 }],
    [r, 'Chain Heal', 'cast', { ...SELF, cast: 2500, mult: 0, special: 'heal', heal: 0.4 }], [e, 'Searing Totem', 'aoe', { mult: 1.2, range: 20, radius: 3, status: 'burn', school: 'fire' }],
    [n, 'Earthbind Totem', 'aoe', { ...SELF, mult: 0.1, radius: 10, cd: 15000, rootMs: 5000 }], [n, 'Ghost Wolf', 'instant', { ...SELF, mult: 0, cd: 10000, special: 'blink', dist: 18 }],
    [n, 'Windfury Weapon', 'cooldown', { ...SELF, mult: 0, cd: 30000, special: 'buff', buff: { mul: 1.2, ms: 30000 } }], [n, 'Stoneskin Totem', 'defensive', { ...SELF, mult: 0, cd: 30000, special: 'barrier', ward: { pct: 0.3, ms: 15000 } }],
  ])(T('vshaman')),
  vwarlock: (([a, d, x]) => [
    [a, 'Shadow Bolt', 'cast', { cast: 3000, mult: 2.4, range: 30 }], [x, 'Immolate', 'cast', { cast: 2000, mult: 1.2, range: 30, status: 'burn' }],
    [a, 'Corruption', 'instant', { mult: 0.9, range: 30, status: 'burn' }], [a, 'Curse of Agony', 'instant', { mult: 0.8, range: 30, status: 'burn' }],
    [x, 'Searing Pain', 'cast', { cast: 1500, mult: 1.3, range: 30 }], [x, 'Soul Fire', 'cooldown', { cast: 6000, mult: 4.2, range: 30, cd: 30000 }],
    [d, 'Hellfire', 'aoe', { ...SELF, mult: 1.4, radius: 8, cd: 10000, school: 'fire' }], [x, 'Rain of Fire', 'aoe', { mult: 0.7, range: 30, radius: 7, pulses: 4, every: 1.5, school: 'fire' }],
    [a, 'Drain Life', 'cast', { cast: 0, mult: 0.6, range: 20, pulses: 5, every: 1 }], [a, 'Death Coil', 'instant', { mult: 1.8, range: 20, cd: 30000, rootMs: 3000 }],
    [a, 'Fear', 'cast', { cast: 1500, mult: 0.1, range: 20, rootMs: 8000 }], [x, 'Shadowburn', 'instant', { mult: 2.0, range: 20, cd: 15000 }],
    [x, 'Conflagrate', 'instant', { mult: 2.2, range: 30, cd: 10000 }], [a, 'Siphon Life', 'instant', { mult: 0.8, range: 30, status: 'burn', school: 'nature' }],
    [a, 'Howl of Terror', 'aoe', { ...SELF, mult: 0.1, radius: 10, cd: 40000, rootMs: 6000 }], [d, 'Shadow Ward', 'defensive', { ...SELF, mult: 0, cd: 30000, special: 'barrier', ward: { pct: 0.4, ms: 10000 } }],
  ])(T('vwarlock')),
  vdruid: (([b, f, r]) => [
    [b, 'Wrath', 'cast', { cast: 2000, mult: 1.6, range: 30, school: 'nature' }], [b, 'Starfire', 'cooldown', { cast: 3500, mult: 2.8, range: 30, cd: 0 }],
    [b, 'Moonfire', 'instant', { mult: 1.0, range: 30, status: 'burn' }], [b, 'Insect Swarm', 'instant', { mult: 0.8, range: 30, status: 'burn', school: 'nature' }],
    [b, 'Entangling Roots', 'cast', { cast: 1500, mult: 0.3, range: 30, rootMs: 8000, school: 'nature' }], [b, 'Hurricane', 'aoe', { mult: 0.7, range: 30, radius: 7, pulses: 4, every: 1, chillMs: 1500, school: 'nature' }],
    [f, 'Swipe', 'aoe', { ...SELF, mult: 1.2, radius: 5, cone: 120 }], [f, 'Maul', 'instant', { ...M, mult: 1.8 }],
    [r, 'Healing Touch', 'cast', { ...SELF, cast: 3000, mult: 0, special: 'heal', heal: 0.55 }], [r, 'Regrowth', 'cast', { ...SELF, cast: 2000, mult: 0, special: 'heal', heal: 0.35 }],
    [r, 'Rejuvenation', 'instant', { ...SELF, mult: 0, special: 'heal', heal: 0.2 }], [f, 'Claw', 'instant', { ...M, mult: 1.4 }],
    [f, 'Ferocious Bite', 'cooldown', { ...M, mult: 2.6, cd: 8000 }], [f, 'Rake', 'instant', { ...M, mult: 0.9, status: 'burn' }],
    [f, 'Dash', 'instant', { ...SELF, mult: 0, cd: 30000, special: 'blink', dist: 16 }], [r, 'Barkskin', 'defensive', { ...SELF, mult: 0, cd: 60000, special: 'barrier', ward: { pct: 0.3, ms: 12000 } }],
  ])(T('vdruid')),
};
const SLOT_OF = (i) => (i < 8 ? i : i + 2); // rows 0-7 on keys 1-8, rows 8-15 on Shift+1-8
export const BOOKS = {
  vmage: [
    [0, F, 'Fireball', 'cast', { cast: 3000, mult: 2.4, range: 36, status: 'burn' }],
    [1, R, 'Frostbolt', 'cast', { cast: 2500, mult: 2.0, range: 36, chillMs: 3000 }],
    [2, A, 'Arcane Missiles', 'cast', { cast: 0, mult: 0.75, range: 30, pulses: 5, every: 0.6 }],
    [3, F, 'Fire Blast', 'instant', { mult: 1.5, range: 20, cd: 8000 }],
    [4, F, 'Scorch', 'cast', { cast: 1500, mult: 1.3, range: 27 }],
    [5, F, 'Pyroblast', 'cooldown', { cast: 6000, mult: 4.2, range: 36, cd: 0, status: 'burn' }],
    [6, R, 'Frost Nova', 'aoe', { cast: 0, mult: 0.6, range: 0, radius: 8, self: true, cd: 25000, rootMs: 6000 }],
    [7, R, 'Cone of Cold', 'aoe', { cast: 0, mult: 1.2, range: 0, radius: 9, self: true, cone: 70, cd: 10000, chillMs: 2500 }],
    [10, A, 'Arcane Explosion', 'aoe', { cast: 0, mult: 0.9, range: 0, radius: 9, self: true, cd: 0 }],
    [11, F, 'Flamestrike', 'aoe', { cast: 3000, mult: 1.8, range: 30, radius: 5, cd: 0, status: 'burn' }],
    [12, R, 'Blizzard', 'aoe', { cast: 0, mult: 0.4, range: 30, radius: 7, cd: 0, pulses: 8, every: 1, chillMs: 1600 }], // creator spec 2026-10-10: an 8 s channel, damage every second
    [13, F, 'Blast Wave', 'aoe', { cast: 0, mult: 1.6, range: 0, radius: 9, self: true, cd: 45000, rootMs: 2000 }],
    [14, A, 'Polymorph', 'cast', { cast: 1500, mult: 0, range: 27, special: 'poly', holdMs: 10000 }],
    [15, A, 'Blink', 'instant', { mult: 0, range: 0, self: true, cd: 15000, special: 'blink', dist: 14 }],
    [16, A, 'Evocation', 'cooldown', { cast: 0, mult: 0, range: 0, self: true, cd: 90000, special: 'evocate', pulses: 8, every: 1 }],
    [17, R, 'Ice Barrier', 'defensive', { mult: 0, range: 0, self: true, cd: 30000, ogcd: false, special: 'barrier', ward: { pct: 0.4, ms: 10000 } }],
  ],
};
for (const [cid, rows] of Object.entries(ROWS)) BOOKS[cid] = rows.map(([el, name, kind, o], i) => [SLOT_OF(i), el, name, kind, o]);
// each book's two off-GCD tools (keys 9, 0): [interrupt, defensive, school]
const VUTIL = { vwarrior: ['Pummel', 'Shield Wall', 'steel'], vpaladin: ['Rebuke', 'Blessing of Protection', 'holy'], vhunter: ['Silencing Shot', 'Deterrence', 'arcane'],
  vrogue: ['Kick', 'Vanish', 'shadow'], vpriest: ['Silence', 'Desperate Prayer', 'shadow'], vshaman: ['Earth Shock Interrupt', 'Nature\'s Swiftness', 'earth'],
  vmage: ['Counterspell', 'Ice Block', 'arcane'], vwarlock: ['Spell Lock', 'Soul Link', 'shadow'], vdruid: ['Bash', 'Frenzied Regeneration', 'nature'] };
const slug = (n) => n.toLowerCase().replace(/[^a-z]+/g, '-');
for (const [cid, rows] of Object.entries(BOOKS)) for (const [slot, [el, school, glyph, color], name, kind, o] of rows) {
  const id = `${cid}-${slug(name)}`;
  const cell = rows.findIndex((r) => r[2] === name);
  CLASS_SPELLS[id] = { id, cls: cid, el, school, glyph, color, kind, name, skill: C[cid].skill, melee: false, ...KINDS[kind], ogcd: false, ...o, slot, cell,
    status: o.status ?? (o.rootMs ? 'freeze' : null) };
}
for (const [cid, [kick, wall, school]] of Object.entries(VUTIL)) {
  const c = C[cid]; if (!c) continue; const melee = ['vwarrior', 'vrogue', 'vdruid'].includes(cid);
  CLASS_SPELLS[`${cid}-util-interrupt`] = { id: `${cid}-util-interrupt`, cls: cid, el: 'Utility', school, glyph: '✋', color: '#ffd36a', kind: 'interrupt', name: kick, skill: c.skill, ...KINDS.interrupt,
    ...(melee ? { range: BANDS.melee } : {}), melee, status: null };
  CLASS_SPELLS[`${cid}-util-defensive`] = { id: `${cid}-util-defensive`, cls: cid, el: 'Utility', school, glyph: '🛡', color: '#9fd8ff', kind: 'defensive', name: wall, skill: c.skill, ...KINDS.defensive, melee: false, status: null };
}
// a catalog tab's spells: a book class lists its rows of that element, the others their four kinds
export const tabSpells = (mode, t) => { const c = C[mode]; if (!c) return []; const el = c.els[t]?.[0];
  return c.book ? (BOOKS[mode] ?? []).filter((r) => r[1][0] === el).map((r) => `${mode}-${slug(r[2])}`) : KIND_IDS.map((k) => `${mode}-${String(el).toLowerCase()}-${k}`); };
export const spellOfClass = (id) => CLASS_SPELLS[id] ?? null;

// the kit's bar: 20 slots like the OSRS bar. Bottom row (keys 1-8) = elements 1 and 2, top row (Shift+1-8) = elements 3 and 4.
export function kitBar(mode) {
  const c = C[mode]; const bar = Array(20).fill('');
  if (!c) return bar;
  if (c.book) { for (const [slot, , name] of BOOKS[mode] ?? []) bar[slot] = `${mode}-${slug(name)}`; bar[8] = `${mode}-util-interrupt`; bar[9] = `${mode}-util-defensive`; return bar; }
  c.els.forEach(([el], ei) => KIND_IDS.forEach((k, ki) => { bar[(ei >= 2 ? 10 : 0) + (ei % 2) * 4 + ki] = `${mode}-${el.toLowerCase()}-${k}`; }));
  bar[8] = `${mode}-util-interrupt`; bar[9] = `${mode}-util-defensive`; // keys 9 and 0: the off-GCD tools
  return bar;
}
export const maxHitOf = (sp, level) => Math.max(1, Math.round(sp.mult * (2 + level / 8)));
export const tipOf = (sp, level) => `${sp.name} · ${sp.el} ${KINDS[sp.kind].label}` + (sp.cast ? ` · ${(sp.cast / 1000).toFixed(1)}s cast` : ' · instant')
  + (sp.ogcd ? ' · off the GCD' : '') + (sp.cd ? ` · ${sp.cd / 1000}s cooldown` : '') + (sp.radius ? ` · ${sp.radius}m area` : '') + (sp.status ? ` · ${sp.status === 'burn' ? 'burns' : 'roots'}` : '') + (sp.kind === 'interrupt' ? ' · stops a cast, dazes 2s' : sp.kind === 'defensive' ? ` · ${Math.round(sp.ward.pct * 100)}% less damage for ${sp.ward.ms / 1000}s` : ` · max hit ${maxHitOf(sp, level)}`);

// ---- SUPPORT GEMS + GEM LEVELS (Campton, 2026-10-06, from his WoW/PoE spell catalog) ----
// Every class spell is a skill gem with 3 linked sockets (player.state.csock[id]) and its own level 1-20 (player.state.cgem[id] = { lv, xp }).
// A gem level is +12% max hit; xp is the damage that spell deals, GEM_XP x level to the next. The PoE flats are scaled to OSRS hits
// (a Magic 1 instant hits 2, so "+18-28 cold" becomes +1-2). Nothing here costs mana: the class kits have none.
export const GEM_GROWTH = 0.12, GEM_MAX = 20, GEM_XP = 30;
export const GEMS = {
  gmp:       { name: 'Greater Multiple Projectiles', short: 'GMP',    color: '#30e060', icon: '🔱', fits: { bolt: true },  desc: '+2 bolts fan out to the nearest other enemies. 20% less damage each.' },
  fc:        { name: 'Faster Casting',               short: 'FC',     color: '#4090ff', icon: '⚡', fits: { cast: true },  desc: '30% shorter cast time.' },
  echo:      { name: 'Spell Echo',                   short: 'Echo',   color: '#4090ff', icon: '💫', fits: { spell: true }, desc: 'The spell fires a second time, 10% less damage.' },
  chain:     { name: 'Chain',                        short: 'Chain',  color: '#30e060', icon: '⛓', fits: { bolt: true },  desc: 'The bolt jumps to 1 more enemy within 12 m.' },
  cold:      { name: 'Added Cold Damage',            short: 'Cold',   color: '#4090ff', icon: '❄', fits: { any: true },   desc: '+1 to 2 cold damage. Hits chill: rooted 1.2 s.' },
  lightning: { name: 'Added Lightning Damage',       short: 'Light',  color: '#4090ff', icon: '⚡', fits: { any: true },   desc: '+0 to 3 lightning damage. A shocked enemy takes 20% more for 4 s.' },
  prolif:    { name: 'Ignite Proliferation',         short: 'Prolif', color: '#ff4020', icon: '🔥', fits: { status: true }, desc: 'Burns and roots spread to every enemy within 4 m.' },
  empower:   { name: 'Empower',                      short: 'Emp',    color: '#ff4020', icon: '💎', fits: { any: true },   desc: '+2 gem levels to the linked spell.' },
  fa:        { name: 'Faster Attacks',               short: 'FA',     color: '#30e060', icon: '⚔', fits: { melee: true }, desc: '35% faster: shorter wind-up and cooldown.' },
  splash:    { name: 'Melee Splash',                 short: 'Splash', color: '#ff4020', icon: '🌊', fits: { melee: true }, desc: 'A single-target melee hit strikes everything within 3.5 m of it.' },
};
// which gems a spell takes: bolt = a ranged single-target projectile, spell = not melee, cast = has a wind-up, status = leaves an aura
export function gemFits(gid, sp) {
  const f = GEMS[gid]?.fits; if (!f || !sp) return false;
  const bolt = !sp.melee && !sp.radius && !sp.self;
  return !!(f.any || (f.bolt && bolt) || (f.spell && !sp.melee && !sp.self) || (f.cast && sp.cast > 0 && !sp.melee) || (f.status && sp.status) || (f.melee && (sp.melee || sp.self)));
}
export const gemOf = (s, id) => s?.cgem?.[id] ?? { lv: 1, xp: 0 };
export const socketsOf = (s, id) => { const a = s?.csock?.[id]; return Array.isArray(a) ? [a[0] ?? null, a[1] ?? null, a[2] ?? null] : [null, null, null]; };
// the spell as cast: the gem's level and its linked supports folded in. dmgMul scales max hit; extra is the extra bolt count; etc.
export function moddedOf(sp, s) {
  if (!sp) return null;
  const links = socketsOf(s, sp.id).filter((g) => g && gemFits(g, sp)), has = (g) => links.includes(g);
  const lv = Math.min(GEM_MAX + 2, gemOf(s, sp.id).lv + (has('empower') ? 2 : 0));
  let cast = sp.cast, cd = sp.cd, dmgMul = 1 + (lv - 1) * GEM_GROWTH;
  if (has('fc') && cast) cast = Math.round(cast * 0.7);
  if (has('fa')) { cast = Math.round(cast * 0.65); cd = Math.round(cd * 0.65); }
  const extra = has('gmp') ? 2 : 0; if (extra) dmgMul *= 0.8;
  return { ...sp, lv, cast, cd, dmgMul, extra, echo: has('echo'), chains: has('chain') ? 1 : 0, cold: has('cold'), shock: has('lightning'),
    prolif: has('prolif') ? 4 : 0, splash: has('splash') && sp.melee && !sp.radius ? 3.5 : 0, links };
}
export const modMaxHit = (m, level) => Math.max(1, Math.round(maxHitOf(m, level) * (m.dmgMul ?? 1)));
// the upper-body clip each spell plays on release, named for the catalog (class-cast-player.js plays the clip)
export function animOf(sp) {
  if (sp.self) return { name: 'Ground Slam', clip: 'cdn/clip-chopping-wood-with-an-axe-loop.glb', speed: 2.2 };
  if (sp.melee && sp.kind === 'cooldown') return { name: 'Overhead Cleave', clip: 'cdn/clip-chopping-wood-with-an-axe-loop.glb', speed: 2.0 };
  if (sp.melee) return { name: 'Weapon Slash', clip: 'cdn/clip-attack.glb', speed: 1.3 };
  if (sp.cls === 'warrior') return { name: 'Hammer Throw', clip: 'cdn/clip-throw.glb', speed: 1.4 };
  if (sp.kind === 'aoe') return { name: 'Sky Summon', clip: 'cdn/clip-cast.glb', speed: 1.6 };
  if (sp.kind === 'cooldown') return { name: 'Heavy Release', clip: 'cdn/clip-cast.glb', speed: 1.4 };
  if (sp.kind === 'cast') return { name: 'Two-Handed Release', clip: 'cdn/clip-cast.glb', speed: 1.7 };
  return { name: 'Finger Snap', clip: 'cdn/clip-cast.glb', speed: 2.4 };
}
// the bar as played: the kit, with the player's own picks in the 4 free slots (8, 9, 18, 19) per class (player.state.cbar[mode])
export const FREE_SLOTS = [8, 9, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]; // 20-29: the side bar (creator 2026-10-09)
export function barOf(s, mode) {
  const bar = kitBar(mode), own = s?.cbar?.[mode] ?? {};
  for (const i of FREE_SLOTS) { const id = own[i]; if (id && CLASS_SPELLS[id]?.cls === mode) bar[i] = id; }
  return bar;
}

// SPELL VISUAL KITS (creator 2026-10-10, his vanilla spell-visual spec): per spell name, the missile's speed (m/s), the pose
// family (directed bolt, omni burst, channel loop) and the missile's size. Our own effects; only the timing and poses follow the spec.
// A name not here takes its school's speed and the kind's pose (aoe/self/defensive = omni).
export const VFX = {
  'Fireball': { speed: 28, pose: 'directed' }, 'Frostbolt': { speed: 24, pose: 'directed' }, 'Pyroblast': { speed: 15, pose: 'directed', scale: 2.2 },
  'Arcane Missiles': { speed: 20, pose: 'channel' }, 'Blizzard': { pose: 'channel-omni' }, 'Cone of Cold': { pose: 'directed' },
  'Frost Nova': { pose: 'omni' }, 'Flamestrike': { pose: 'omni' }, 'Scorch': { pose: 'directed', speed: 40 },
  'Shadow Bolt': { speed: 20, pose: 'directed' }, 'Immolate': { speed: 24, pose: 'directed' }, 'Corruption': { pose: 'directed', speed: 30 },
  'Hellfire': { pose: 'channel-omni' }, 'Rain of Shadow': { pose: 'channel-omni' }, 'Chaos Bolt': { speed: 15, pose: 'directed', scale: 1.8 },
  'Lightning Bolt': { speed: 35, pose: 'directed' }, 'Chain Lightning': { speed: 35, pose: 'directed' }, 'Earth Shock': { pose: 'directed', speed: 40 },
  'Frost Shock': { speed: 28, pose: 'directed' }, 'Flame Shock': { speed: 28, pose: 'directed' }, 'Wrath': { speed: 25, pose: 'directed' },
  'Moonfire': { pose: 'directed', speed: 40 }, 'Thunder Clap': { pose: 'omni' }, 'Arcane Explosion': { pose: 'omni' }, 'Fire Nova': { pose: 'omni' },
  'Earthquake': { pose: 'channel-omni' }, 'Fire Blast': { pose: 'directed', speed: 45 }, 'Blast Wave': { pose: 'omni' }, 'Polymorph': { pose: 'omni' },
  'Blink': { pose: 'omni' }, 'Evocation': { pose: 'channel-omni' }, 'Ice Barrier': { pose: 'omni' }, 'Thunderstorm': { pose: 'omni' },
};
export const SCHOOL_SPEED = { fire: 26, frost: 24, arcane: 22, storm: 35, shadow: 20, earth: 22, steel: 30, holy: 30, nature: 24 };
export const vfxOf = (sp) => {
  const v = VFX[sp?.name] ?? {};
  const pose = v.pose ?? (sp && (sp.kind === 'aoe' || sp.self || sp.kind === 'defensive' || sp.radius) ? 'omni' : 'directed');
  return { speed: v.speed ?? SCHOOL_SPEED[sp?.school] ?? 24, pose, scale: v.scale ?? 1 };
};

// ICON SHEETS (creator 2026-10-10 "unique toolbars, their own icons"): one painted 4x4 sheet per vanilla class, cell = book row index
export const ICON_SHEETS = {
  vwarrior: '/cdn/value.012c9fbc3a74b5dfe06ffa2303aeb914265d9109a2cfc46f12ac85035f361a55.png',
  vpaladin: '/cdn/value.1b65dd90c7bd497bf7caf6029493b5e0dc16c71e43a691c9d50ecfb37f856d17.png',
  vhunter: '/cdn/value.accb614be1b65cbfbc7c6102c967f5f10ecab40944f5660e13d46418380493e9.png',
  vrogue: '/cdn/value.dbc991c81ce17b569107c8e3730dbc75f32383a804dd535a950e995978bfce2a.png',
  vpriest: '/cdn/value.9af0a14813fd915fef2edef2496bf002dc0bbde8740a210595367eb663d6c5b1.png',
  vshaman: '/cdn/value.f69fba44b16c31b8c201f9a9bd7e9932a610fc91d7be870c41549e57c83a95e6.png',
  vmage: '/cdn/value.e76740c50e4f76cf4a3d0b9c662e1e4aa36364fb31b98ceec634d063c1033827.png',
  vwarlock: '/cdn/value.c707c3aa3f47f54c249936363ab737f71d555949564c5d6d832926a800db5c0f.png',
  vdruid: '/cdn/value.67f099a396574e6997d0a0d49a40fbbaa8c0de522e5f8c1c26d3426b6e786159.png',
};
// the off-GCD tools borrow a cell of their own sheet: [interrupt, defensive]
const UTIL_CELL = { vwarrior: [7, 15], vpaladin: [3, 15], vhunter: [5, 15], vrogue: [3, 15], vpriest: [7, 13], vshaman: [2, 15], vmage: [2, 15], vwarlock: [9, 15], vdruid: [7, 15] };
export function cellStyle(cls, cell) {
  const u = ICON_SHEETS[cls]; if (!u || !(cell >= 0)) return '';
  return `background:url(${u}) ${(cell % 4) * 33.3333}% ${Math.floor(cell / 4) * 33.3333}% / 400% 400% no-repeat`;
}
export function iconStyle(sp) {
  if (!sp || !ICON_SHEETS[sp.cls]) return '';
  const cell = sp.cell ?? (sp.kind === 'interrupt' ? UTIL_CELL[sp.cls]?.[0] : sp.kind === 'defensive' ? UTIL_CELL[sp.cls]?.[1] : -1);
  return cellStyle(sp.cls, cell);
}
