// the upper-body cast clip on a player, restarted (null first, so a repeat cast replays it); speed varies per spell.
// creator 2026-10-10 port kit (savi_spell_animation_map.json): a body on the human rig plays its own six casting clips,
// ReadySpell* while the spell gathers, SpellCast* on release, ChannelCast* for a long gather; Directed for a bolt, Omni for a burst.
import { SAVI_MODEL } from './data/savi-form.js';
const NATIVE = new Set([SAVI_MODEL.model.id,
  '/cdn/value.baa614043ec7331f85c82e3eaabd272fee21d87d712f05be70e2d8fb0402fa8a.glb',
  '/cdn/value.3d5ab422e22ba6ca505613c5cb26803af78b69fb005f7dcdf51b9f5bfd650307.glb', // her previous body
  '/cdn/value.e42cb1146dd54d3345b5e02393d7453f345b50620dfd8b15143d8f6e85b6ba2b.glb', // Human Female 049
  '/cdn/value.d2b99592bda7e82403abd6dc010e19f55f5fcf0366f22d5ba252813509bea380.glb']); // Human Male 050
export function nativeRig(me) { const m = me.model; const id = typeof m === 'string' ? m : m?.id; return !!id && NATIVE.has(id.split('?')[0]); }
// creator 2026-10-10 "add the animations to my model as well, for male human casting": the kit's male casting clips,
// retargeted in Blender onto a Mixamo skeleton (art/savi-body/retarget-male-cast.py), play on every other humanoid body, upper body only.
const LIB = { ReadySpellDirected: 'cdn/clip-human-ready-spell-directed-aa8ac80b-loop.glb', ReadySpellOmni: 'cdn/clip-human-ready-spell-omni-4cc0861b-loop.glb',
  ChannelCastDirected: 'cdn/clip-human-channel-cast-directed-9805c789-loop.glb', ChannelCastOmni: 'cdn/clip-human-channel-cast-omni-46e8725f-loop.glb',
  SpellCastDirected: 'cdn/clip-human-spell-cast-directed-14286459.glb', SpellCastOmni: 'cdn/clip-human-spell-cast-omni-ed56ae30.glb' };
// a Mixamo body names its spine 'mixamorig:Spine'; a mask on plain 'Spine' finds no bone there and the engine drops the whole channel
import { CAMPTON_MODEL } from './data/campton-form.js';
const MIXAMO = new Set([CAMPTON_MODEL.model.id]);
const idOf = (me) => { const m = me.model; return (typeof m === 'string' ? m : m?.id ?? '').split('?')[0]; };
export const spineOf = (me) => ({ from: MIXAMO.has(idOf(me)) ? 'mixamorig:Spine' : 'Spine' });
// the hand bones by the same rig test: a glow on plain 'RightHand' finds nothing on a Mixamo body
export const handOf = (me, side) => (MIXAMO.has(idOf(me)) ? 'mixamorig:' : '') + side + 'Hand';
import { vfxOf } from './data/class-spells.js';
// the pose family per spell (creator's spec table): directed bolt, omni burst, or a channel loop
const omniOf = (sp) => !!sp && vfxOf(sp).pose.includes('omni');
const chanOf = (sp) => !!sp && vfxOf(sp).pose.startsWith('channel');
// on release
export function castAnim(me, speed, sp) {
  me.anim.cast = null;
  if (nativeRig(me)) { me.anim.chan = null; me.anim.cast = { clip: omniOf(sp) ? 'SpellCastOmni' : 'SpellCastDirected', loop: 'once', weight: 1, speed: Math.min(1.6, speed * 0.75) }; return; }
  if (sp) { me.anim.chan = null; me.anim.cast = { clip: LIB[omniOf(sp) ? 'SpellCastOmni' : 'SpellCastDirected'], loop: 'once', mask: spineOf(me), weight: 1, speed: Math.min(1.6, speed * 0.75) }; return; }
  me.anim.cast = { clip: 'cdn/clip-cast.glb', loop: 'once', mask: spineOf(me), weight: 1, speed };
}
// while the spell gathers
export function gatherAnim(me, sp) {
  const omni = omniOf(sp), long = chanOf(sp) || (sp?.cast ?? 0) >= 2500;
  const name = long ? (omni ? 'ChannelCastOmni' : 'ChannelCastDirected') : (omni ? 'ReadySpellOmni' : 'ReadySpellDirected');
  return nativeRig(me) ? { clip: name, loop: 'loop', weight: 1 } : { clip: LIB[name], loop: 'loop', mask: spineOf(me), weight: 1 };
}

// ---- creator 2026-10-10 "add animations to all spells": one body motion per vanilla spell ----
// Quaternius Universal Animation Library (CC0, the creator's upload) carved into clips, plus the platform's own.
// full: true = the whole body plays it (a roll, a kneel); otherwise upper body only, so the legs keep walking.
const U = {
  sword: 'cdn/clip-ual-sword-attack-a9378985.glb', jab: 'cdn/clip-ual-punch-jab-c2c255b4.glb', cross: 'cdn/clip-ual-punch-cross-a64bf554.glb',
  roll: 'cdn/clip-ual-roll-20473bc5.glb', shoot: 'cdn/clip-ual-pistol-shoot-62ebef40.glb', aim: 'cdn/clip-ual-pistol-aim-neutral-c454111a-loop.glb',
  aimUp: 'cdn/clip-ual-pistol-aim-up-5dbdc41f-loop.glb', kneel: 'cdn/clip-ual-interact-dc5533be.glb', zap: 'cdn/clip-ual-spell-simple-shoot-ab8c99fd.glb',
  slam: 'cdn/clip-chopping-wood-with-an-axe-loop.glb', kick: 'cdn/clip-kick.glb', throw: 'cdn/clip-throw.glb', block: 'cdn/clip-block-loop.glb',
  shout: 'cdn/clip-victory.glb', die: 'cdn/clip-die.glb', pickup: 'cdn/clip-pickup.glb', attack: 'cdn/clip-attack.glb',
};
const M = (clip, speed = 1.3, full = false) => ({ clip: U[clip], speed, full });
const BY_NAME = {
  // warrior
  'Heroic Strike': M('sword', 1.35), 'Mortal Strike': M('sword', 1.05), 'Rend': M('sword', 1.5), 'Overpower': M('sword', 1.6), 'Execute': M('slam', 2.0),
  'Whirlwind': M('sword', 1.0, true), 'Thunder Clap': M('slam', 2.2), 'Cleave': M('sword', 1.2), 'Pummel': M('jab', 1.5), 'Shield Wall': M('block', 1.2),
  'Charge': M('attack', 1.2, true), 'Hamstring': M('sword', 1.6), 'Shield Slam': M('cross', 1.25), 'Sunder Armor': M('cross', 1.4), 'Bloodthirst': M('sword', 1.3),
  'Battle Shout': M('shout', 1.4), 'Intercept': M('attack', 1.2, true), 'Retaliation': M('block', 1.2),
  // paladin
  'Hammer of Justice': M('throw', 1.4), 'Hammer of Wrath': M('throw', 1.3), 'Holy Strike': M('sword', 1.3), 'Consecration': M('slam', 2.0),
  'Lay on Hands': M('kneel', 1.3, true), 'Divine Shield': M('block', 1.0), 'Divine Protection': M('block', 1.2),
  // hunter
  'Auto Shot': M('shoot', 1.5), 'Aimed Shot': M('shoot', 1.1), 'Arcane Shot': M('shoot', 1.4), 'Multi-Shot': M('shoot', 1.2), 'Serpent Sting': M('shoot', 1.4),
  'Concussive Shot': M('shoot', 1.3), 'Volley': M('shoot', 1.0), 'Silencing Shot': M('shoot', 1.5), 'Scatter Shot': M('shoot', 1.5),
  'Explosive Trap': M('pickup', 1.5, true), 'Freezing Trap': M('pickup', 1.5, true), 'Raptor Strike': M('sword', 1.4), 'Wing Clip': M('sword', 1.6),
  'Mongoose Bite': M('jab', 1.5), "Hunter's Mark": M('zap', 1.3), 'Bestial Wrath': M('shout', 1.3), 'Deterrence': M('block', 1.2), 'Feign Death': M('die', 1.4, true),
  // rogue
  'Sinister Strike': M('sword', 1.6), 'Eviscerate': M('sword', 1.3), 'Backstab': M('jab', 1.4), 'Gouge': M('cross', 1.5), 'Rupture': M('sword', 1.5),
  'Ambush': M('sword', 1.15), 'Blade Flurry': M('sword', 1.8, true), 'Riposte': M('sword', 1.7), 'Kick': M('kick', 1.4, true), 'Vanish': M('roll', 1.3, true),
  'Kidney Shot': M('jab', 1.5), 'Cheap Shot': M('cross', 1.5), 'Garrote': M('jab', 1.3), 'Hemorrhage': M('sword', 1.5), 'Blind': M('throw', 1.6),
  'Sprint': M('roll', 1.3, true), 'Deadly Poison': M('pickup', 1.6), 'Evasion': M('block', 1.3),
  // shaman
  'Stormstrike': M('sword', 1.25), 'Fire Nova Totem': M('pickup', 1.6, true), 'Magma Totem': M('pickup', 1.6, true), 'Searing Totem': M('pickup', 1.6, true),
  'Earthbind Totem': M('pickup', 1.6, true), 'Stoneskin Totem': M('pickup', 1.6, true), 'Ghost Wolf': M('roll', 1.3, true), 'Windfury Weapon': M('shout', 1.4),
  'Earth Shock': M('zap', 1.4), 'Flame Shock': M('zap', 1.4), 'Frost Shock': M('zap', 1.4), 'Earth Shock Interrupt': M('zap', 1.5),
  // mage / warlock / priest / druid instants: the quick one-hand flick
  'Fire Blast': M('zap', 1.5), 'Corruption': M('zap', 1.4), 'Curse of Agony': M('zap', 1.4), 'Death Coil': M('zap', 1.3), 'Shadowburn': M('zap', 1.5),
  'Conflagrate': M('zap', 1.5), 'Siphon Life': M('zap', 1.4), 'Shadow Word: Pain': M('zap', 1.4), 'Moonfire': M('zap', 1.5), 'Insect Swarm': M('zap', 1.4),
  'Counterspell': M('zap', 1.6), 'Spell Lock': M('zap', 1.6), 'Silence': M('zap', 1.6), 'Judgement': M('zap', 1.4), 'Exorcism': M('zap', 1.3), 'Holy Shock': M('zap', 1.5),
  // druid feral
  'Maul': M('cross', 1.3), 'Claw': M('jab', 1.5), 'Rake': M('cross', 1.5), 'Ferocious Bite': M('cross', 1.15), 'Bash': M('cross', 1.4), 'Swipe': M('sword', 1.3, true),
  'Dash': M('roll', 1.3, true), 'Barkskin': M('block', 1.2), 'Frenzied Regeneration': M('shout', 1.3),
};
// the release motion for a spell, or null = the caster's own SpellCast* clip (castAnim)
export function motionOf(sp) {
  if (!sp) return null;
  const m = BY_NAME[sp.name];
  if (m) return m;
  if (sp.melee) return M('sword', 1.35);
  return null;
}
// what the body holds while the bar fills, or null = the caster's Ready/Channel clip (gatherAnim)
export function holdOf(sp) {
  if (!sp) return null;
  if (sp.cls === 'vhunter' && !sp.self && !sp.melee) return { clip: sp.name === 'Volley' ? U.aimUp : U.aim, loop: 'loop', weight: 1 };
  if (sp.melee || (sp.self && ['vwarrior', 'vrogue'].includes(sp.cls))) return { clip: U.block, loop: 'loop', weight: 1 };
  return null;
}
// play it: a full-body motion owns the legs too; an upper-body one masks at the spine
export function playMotion(me, m) {
  me.anim.atk = null; me.anim.cast = null; me.anim.chan = null;
  me.anim.atk = m.full ? { clip: m.clip, loop: 'once', weight: 1, speed: m.speed } : { clip: m.clip, loop: 'once', mask: spineOf(me), weight: 1, speed: m.speed };
}
