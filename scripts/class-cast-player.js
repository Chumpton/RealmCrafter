// CLASS COMBAT caster (Campton, 2026-10-06). The player's side of the class kits in scripts/lib/data/class-spells.js.
// Owns player.state.combatMode / ccast / ccd / cgcd / cq. Never touches Zezima's OSRS state (ui.bar, spCd, supplies, runes).
// Lifecycle per Campton's pipeline doc: wind-up (cast loop + gather glow on the RightHand bone + rising hum) -> release (snap clip,
// muzzle flash, crack) -> flight (glowing core, school trail, light) -> impact (school burst, splat, punch) -> aura (burn or frost root).
// Hits are judged here, on the caster's machine, and stepped into the target (t.state.hp -= d), as combat-player.js does.
import { raycast } from 'builtin/physics';
import { selectCue } from './lib/stance.js'; // target-select cue by stance
import { animate } from 'builtin/tween';
import * as WS from '../templates/wow-spells.js'; // WOW MODE: the creator's WoW spell meshes, glow re-cut
import { rotate } from 'builtin/vec3';
import { levelOf } from './lib/skills-core.js';
import { splatSvg } from './lib/hitsplat.js';
import { castAnim, gatherAnim, spineOf, handOf, motionOf, holdOf, playMotion } from './lib/cast-anim.js';
import { KT } from './lib/data/vfx-tex.js';
import { FCT } from './lib/data/fct.js';
import { SIG_SELF, SIG_GROUND, SIG_DIRECT, SIG_HEAL, SIG_BUFF, SIG_WARD, SIG_STUN, SIG_BLEED, STUNNERS, BLEEDERS } from './lib/data/class-sigs.js'; // creator 2026-10-10: every class its own spell looks
import { boltLook, IMPACTS, SLASH, HEAL_FX, BUFF_FX, vivid } from './lib/data/spell-looks.js'; // creator 2026-10-10: every school as punchy as Fireball // Kenney CC0 particle shapes
import { tpMods, tpMaxHp, tpLevel, tpLevelOf, canLearn, TALENTS, ownPts, withPts, XP_PER_DMG_TP, XP_KILL_TP } from './lib/data/talents.js'; // 3rd person: level + talents, never OSRS skills
const tpL = (s) => Math.round((tpLevel(s) - 1) * 3.4); // character level 1-30 on the spell formula's 0-99 scale
import { KSFX, pick } from './lib/data/kenney-sfx.js';
import { gcdOf, CRIT, PROC, GCD_MS, QUEUE_MS, XP_PER_DMG, HP_XP_PER_DMG, SCHOOLS, SOUNDS, STATUS, MODES, isClassMode, classOf, kitBar, spellOfClass, maxHitOf, moddedOf, modMaxHit, barOf, gemFits, GEMS, GEM_XP, GEM_MAX, gemOf, animOf, FREE_SLOTS, vfxOf } from './lib/data/class-spells.js';

export const updateSchedule = { every: { seconds: 0.1 } };
const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const msg = (ctx, me, text) => ctx.emit('skillMsg', { text }, { to: me.id });
const rgb = (hex) => { const n = parseInt(String(hex).slice(1), 16); return vivid({ r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }); }; // creator 2026-10-10: more saturated
const sfx = (ctx, clip, at, volume = 0.7, pitch = 1) => ctx.emit('playSound', { clip, position: at, volume, pitch, maxDistance: 40 });

// ---- the school shapes (fx one-offs; colour rides as %r %g %b) ----
const C3 = '<%r|1,%g|.5,%b|.2>';
const FLASH = `pop flash burst=1 life=.22 size=1.2 col=${C3} a=1>0 sz=$size*(.4>1.5) r=sprite(${KT.puff},alpha)
pop glow burst=1 life=.4 r=light(${C3},3.1,7)
pop flare burst=1 life=.3 size=1.3 spin=-2..2 col=${C3} a=1>0 sz=$size*(.4>1.7) rot=$age*$spin r=sprite(${KT.flare},alpha)`;
const IMPACT = {
  fire: `fx
pop flame burst=18..26 on=sphere(.3) life=.4..0.8 v=up(2..3.5)+sdir()*(.6..1.4) size=.25..0.45 acc=curl(.6)+buoy(1.5)+drag(1.5) col=${C3} a=0>.1:1>.75:.8>0 sz=$size*(.6>1:.3>.2) rot=spin(.3) r=sprite(flame-wisp,alpha)
pop ember burst=14..20 life=.6..1.1 v=up(2..4)+sdir()*(1..2.5) size=.02..0.05 acc=grav()*.4+curl(.8)+drag(.6) col=${C3} a=1>0 r=sprite(ember,alpha,velocity,.03)
pop tongue burst=6..9 on=sphere(.2) life=.3..0.55 v=up(1.5..3)+sdir()*(.5..1) size=.5..0.8 col=${C3} a=1>0 sz=$size*(.5>1.1) r=sprite(${KT.flame},alpha)
pop splash burst=1 life=.35 size=2 rot=0..6.28 col=${C3} a=1>0 sz=$size*(.4>1.3) r=sprite(${KT.burst},alpha)
${FLASH}`,
  frost: `fx
pop shard burst=20..30 life=.5..0.9 v=sdir()*(3..5.5)+up(1) size=.05..0.09 acc=grav()*.8+drag(1.2) col=${C3} a=1>.7:1>0 floor=bounce(.3) r=sprite(stalk,alpha,velocity,.07)
pop mist burst=6..9 on=sphere(.4) life=.8..1.3 v=sdir()*(.3..0.8) size=.4..0.7 acc=drag(1.5) col=<.85,.93,1> a=0>.15:.5>.6:.3>0 sz=$size*(.6>1.7) rot=spin(.1) r=sprite(${KT.smoke},alpha)
pop glint burst=5..8 on=sphere(.5) life=.4..0.7 size=.3..0.5 spin=-3..3 col=${C3} a=1>0 sz=$size*(1>.2) rot=$age*$spin r=sprite(${KT.glint},alpha)
${FLASH}`,
  arcane: `fx
pop rune burst=26..34 on=disc(.7) life=.55..0.9 v=up(.4..1.1) size=.06..0.11 acc=vortex(9)+drag(1.2) col=${C3} a=1>.6:1>0 r=sprite(${KT.puff},alpha)
pop ring burst=1 life=.45 size=2.4 col=${C3} a=.9>0 sz=$size*(.2>1.2) r=sprite(${KT.ring},alpha)
pop runes burst=1 life=.7 size=2.2 col=${C3} a=1>0 sz=$size*(.6>1.2) rot=spin(.6) r=sprite(${KT.runes},alpha)
${FLASH}`,
  storm: `fx
pop arc burst=10..16 life=.08..0.18 v=sdir()*(8..14) size=.03..0.05 col=${C3} a=1>0 r=sprite(ember,alpha,velocity,.14)
pop spark burst=12..18 life=.25..0.5 v=sdir()*(3..6) size=.02..0.035 acc=grav()*.5+drag(1) col=${C3} a=(1>0)*flick(14,.5) r=sprite(ember,alpha,velocity,.04)
pop flash burst=1 life=.12 size=2.2 col=${C3} a=1>0 r=sprite(${KT.puff},alpha)
pop forks burst=2 life=.12..0.2 size=1.8..2.4 rot=0..6.28 col=${C3} a=(1>0)*flick(20,.6) r=sprite(${KT.forks},alpha)
pop glow burst=1 life=.18 r=light(${C3},7.7,10)`,
  shadow: `fx
pop murk burst=12..18 on=sphere(.35) life=.6..1.1 v=sdir()*(.5..1.2)+up(.4) size=.35..0.6 acc=curl(.8)+drag(1.5) col=<.06,.03,.1> a=0>.15:.85>.6:.5>0 sz=$size*(.6>1.6) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop wisp burst=14..20 on=sphere(.25) life=.4..0.8 v=sdir()*(1.5..3) size=.08..0.16 acc=curl(1.2)+drag(1.4) col=${C3} a=1>0 sz=$size*(1>.3) r=sprite(${KT.puff},alpha)
pop swirl burst=2 life=.5..0.7 size=1.4..1.9 spin=-4..-2 col=${C3} a=1>0 sz=$size*(.5>1.2) rot=$age*$spin r=sprite(${KT.swirl},alpha)
${FLASH}`,
  earth: `fx
pop rock burst=14..20 life=.7..1.1 v=up(3..5)+sdir()*(1.5..3) size=.08..0.16 acc=grav() col=${C3}*.55 a=1 floor=bounce(.25) r=sprite(stalk,alpha,velocity,.05)
pop dust burst=8..12 on=disc(.5) life=.9..1.5 v=up(.4..1)+sdir()*(.6..1.2) size=.45..0.8 acc=buoy(.2)+drag(1.4) col=<.55,.46,.34> a=0>.12:.45>.6:.25>0 sz=$size*(.6>1.9) rot=spin(.15) r=sprite(${KT.smoke},alpha)
${FLASH}`,
  steel: `fx
pop spark burst=20..30 life=.2..0.45 v=sdir()*(4..7) size=.02..0.04 acc=grav()*.6+drag(1) col=${C3} a=1>0 r=sprite(ember,alpha,velocity,.05)
pop flash burst=1 life=.12 size=.9 col=<1,.95,.85> a=1>0 sz=$size*(.5>1.3) r=sprite(${KT.puff},alpha)`,
};
// the AoE ring: the same school colour thrown flat across the radius
const AOE = `fx
pop sweep burst=60..80 on=disc(%rad|4) life=.5..0.9 v=up(1..3) size=.15..0.3 acc=drag(1.5)+buoy(.5) col=${C3} a=0>.1:1>.7:.7>0 sz=$size*(.5>1.4) r=sprite(${KT.puff},alpha)
pop dust burst=14..20 on=disc(%rad|4) life=.8..1.3 v=up(.3..0.9) size=.5..0.9 acc=drag(1.4) col=${C3}*.4+<.3,.3,.3> a=0>.12:.35>.6:.2>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)
pop circle burst=1 life=1.1 size=%rad|4 col=${C3} a=0>.12:1>.6:.8>0 sz=$size*2.1*(.85>1) rot=spin(.25) r=sprite(${KT.runes},alpha,ground)
pop shock burst=1 life=.5 size=%rad|4 col=${C3} a=1>0 sz=$size*2.4*(.2>1) r=sprite(${KT.ring},alpha,ground)`;
// flight: a glowing core that rides the bolt, a trail it leaves, and its light
const TRAIL = {
  fire: `pop tr rate=50 life=.25..0.45 v=up(.6)+sdir()*.3 size=.25..0.4 acc=buoy(1)+curl(.5) col=${C3} a=.9>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha)`,
  frost: `pop tr rate=40 life=.3..0.5 v=sdir()*.6 size=.03..0.06 acc=grav()*.3 col=${C3} a=1>0 r=sprite(stalk,alpha,velocity,.04)`,
  arcane: `pop tr rate=45 life=.3..0.5 v=sdir()*.4 size=.05..0.09 acc=vortex(6) col=${C3} a=1>0 r=sprite(${KT.puff},alpha)`,
  storm: `pop tr rate=60 life=.08..0.16 v=sdir()*(2..4) size=.02..0.03 col=${C3} a=1>0 r=sprite(ember,alpha,velocity,.08)
pop arc rate=14 local life=.06..0.12 size=.6..0.9 rot=0..6.28 col=${C3} a=1>0 r=sprite(${KT.bolt},alpha)`,
  shadow: `pop tr rate=30 life=.5..0.8 v=sdir()*.3 size=.3..0.5 acc=curl(.6)+drag(1) col=<.07,.03,.12> a=0>.15:.7>.6:.4>0 sz=$size*(.6>1.4) rot=0..6.28 r=sprite(${KT.smoke},alpha)`,
  earth: `pop tr rate=30 life=.4..0.6 v=sdir()*.5 size=.05..0.09 acc=grav() col=${C3}*.6 a=1 r=sprite(stalk,alpha,velocity,.04)`,
  steel: `pop tr rate=40 life=.15..0.3 v=sdir()*.5 size=.02..0.04 col=<1,.9,.7> a=1>0 r=sprite(ember,alpha,velocity,.05)`,
};
// creator 2026-10-10: "give fireball a much thicker tail" + "a black rock in it, the flame more orange": its own program (<= 8 pops),
// deep orange flame wrapped round a black rock (the rock is a mesh child of the bolt, see shoot()), a hot streak and smoke rolling off
// toon (creator 2026-10-10 "a thicker ball of fire around it initially, and a cartoony shader"): flat alpha puffs with hard edges,
// three bands (red rim, orange body, yellow core) hugging the black rock, the tail stepping yellow > orange > red > ember as it thins to a point
const ROCK_FX = `fx
pop rim rate=?low:60|110 local on=sphere(.34) life=.12..0.22 v=sdir()*.5 size=.42..0.6 col=<.85,.16,.04> a=1 sz=$size*(.6>1:.4>.2) r=sprite(${KT.puff},alpha)
pop body rate=?low:60|110 local on=sphere(.26) life=.12..0.2 v=sdir()*.4 size=.3..0.42 col=<1,.47,.06> a=1 sz=$size*(.6>1:.4>.2) r=sprite(${KT.puff},alpha)
pop core rate=?low:30|60 local on=sphere(.2) life=.1..0.16 size=.18..0.26 col=<1,.86,.3> a=1 sz=$size*(.7>1>.3) r=sprite(${KT.puff},alpha)
pop tail rate=?low:140|320 on=sphere(.16) life=.9..1.1 v=sdir()*.08 size=.6..0.75 acc=curl(.15)*.3 col=<1,.82,.25>>.12:<1,.47,.06>>.4:<.88,.2,.04>>.75:<.45,.08,.04> a=1>.85:1>0 sz=$size*(1>.65:.45>.02) r=sprite(${KT.puff},alpha)
pop ember rate=24 life=.4..0.8 v=sdir()*(1..2.2)+up(.6) size=.05..0.09 acc=grav()*.4+drag(.8) col=<1,.7,.15> a=1>0 r=sprite(${KT.puff},alpha)
pop smoke on=@tail?.12 inh=p;v:$v*.3 life=.6..1 size=.3..0.45 acc=buoy(.9)+drag(1) col=<.2,.17,.17> a=.9>.6:.9>0 sz=$size*(.8>1.6:.6>.1) r=sprite(${KT.puff},alpha)
pop streak n=1 local life=99 size=1 r=rib(1.2,.34,<1,.42,.06>,blend=alpha,material=scripts/mat-streak.js,params=core:.25;head:1)
pop lamp n=1 local r=light(<1,.45,.1>,2.4,7)`;
// Frostbolt, same toon idea, its own face (creator 2026-10-10 "same design concept for frostbolt but unique"): a jagged ice shard nose-first,
// hard puffs in white / ice cyan / deep blue around it, a tail that tumbles snowflake stars and leaves a cold mist hanging
const ICE_FX = `fx
pop rim rate=?low:50|90 local on=sphere(.32) life=.12..0.22 v=sdir()*.4 size=.36..0.52 col=<.06,.22,.8> a=1 sz=$size*(.6>1:.4>.2) r=sprite(${KT.puff},alpha)
pop body rate=?low:50|90 local on=sphere(.24) life=.12..0.2 v=sdir()*.3 size=.26..0.38 col=<.12,.45,1> a=1 sz=$size*(.6>1:.4>.2) r=sprite(${KT.puff},alpha)
pop core rate=?low:25|50 local on=sphere(.16) life=.1..0.16 size=.16..0.22 col=<.25,.6,1> a=1 sz=$size*(.7>1>.3) r=sprite(${KT.puff},alpha)
pop streak n=1 local life=99 size=1 r=rib(1.6,.46,<.08,.34,1>,blend=alpha,material=scripts/mat-streak.js,params=core:.3;head:1)
pop flake rate=?low:8|16 on=sphere(.3) life=.8..1.3 v=sdir()*(.4..1) size=.12..0.2 spin=-4..4 acc=grav()*.15+drag(1) col=<.45,.75,1> a=1>.7:1>0 rot=$age*$spin r=sprite(${KT.star},alpha)
pop lamp n=1 local r=light(<.3,.6,1>,2.1,7)`;
const ICE = { kind: 'icosahedron', radius: 0.24, detail: 0 }; // a white rock (creator: "a white rock in a gradually less blue streak")
const ICE_MAT = { color: 'oklch(0.93 0.04 235)', roughness: 0.6, emissive: 'oklch(0.75 0.1 235)', emissiveIntensity: 0.12, outline: true };
// a toon bolt's own program and the solid it carries; the shard is long along the flight (the bolt faces its target)
const CORE_BOLT = {
  Fireball: { fx: () => ROCK_FX, prim: () => ROCK, mat: () => ROCK_MAT, scale: null },
  Pyroblast: { fx: () => ROCK_FX, prim: () => ROCK, mat: () => ROCK_MAT, scale: null },
  Frostbolt: { fx: () => ICE_FX, prim: () => ICE, mat: () => ICE_MAT, scale: null },
};
const THICK = new Set(Object.keys(CORE_BOLT));
const ROCK = { kind: 'icosahedron', radius: 0.24, detail: 0 };
const ROCK_MAT = { color: 'oklch(0.16 0.01 40)', roughness: 0.95, emissive: 'oklch(0.55 0.2 45)', emissiveIntensity: 0.06, outline: true };
const boltFx = (school, name) => THICK.has(name) ? CORE_BOLT[name].fx() : `fx
pop core n=1 local size=.38 col=${C3} a=1 sz=$size*flick(9,.15) r=sprite(${KT.puff},alpha)
pop halo n=1 local size=.9 col=${C3} a=.6 r=sprite(${KT.orb},alpha)
pop spin n=1 local size=.75 col=${C3} a=.8 rot=spin(1.8) r=sprite(${KT.swirl},alpha)
pop lamp n=1 local r=light(${C3},1.8,6)
pop tr0 n=1 local life=99 size=1 r=rib(1.3,.3,${C3},blend=alpha,material=scripts/mat-streak.js,params=core:.3;head:1)
${TRAIL[school] ?? ''}`;
// wind-up: motes drawn into the hand, a glow that swells, riding the RightHand bone
const GATHER = `fx
pop mote rate=36 on=sphere(.55) life=.35..0.5 local size=.03..0.06 acc=attract(20)+drag(2) col=${C3} a=0>.3:1>1 r=sprite(ember,alpha,velocity,.03)
pop orb n=1 local size=.32 col=${C3} a=.9 sz=$size*flick(7,.12) r=sprite(${KT.puff},alpha)
pop swirl n=1 local size=.55 col=${C3} a=.75 sz=$size rot=spin(1.2) r=sprite(${KT.swirl},alpha)
pop lamp n=1 local r=light(${C3},1.8,4)`;
// auras: burn licks the body; freeze crusts the feet
const AURA = {
  burn: `fx
pop lick rate=22 on=disc(.35) life=.4..0.7 v=up(1.2..2) size=.15..0.28 acc=buoy(1.2)+curl(.5) col=${C3} a=0>.15:.9>.7:.6>0 sz=$size*(.7>.2) r=sprite(flame-wisp,alpha)`,
  freeze: `fx
pop crust n=14 local on=disc(.5) size=.12..0.22 col=${C3}+<.4,.45,.5> a=.85 r=sprite(stalk,alpha)
pop rime rate=8 on=disc(.5) life=.8..1.2 v=up(.2..0.5) size=.25..0.4 acc=drag(1) col=<.85,.93,1> a=0>.2:.3>.6:.15>0 r=sprite(smoke-puff,alpha)`,
};

// ---- input ----
export function onSpawn(ctx) { const s = ctx.self.state; if (ctx.self.isLocal === false) return; if (s.combatMode == null || ['wow', 'mage', 'warlock', 'shaman', 'warrior'].includes(s.combatMode)) s.combatMode = 'vmage'; /* 2026-10-09 campton: 3rd person combat is the default */ if (s.ccast) s.ccast = null; if (s.cq) s.cq = null; }
export function onInput(ctx, input) {
  const me = ctx.self; if (me.isLocal === false) return;
  const s = me.state, pr = input?.pressed ?? {}, d = input?.actionData ?? {};
  if (pr.combatMode) return setMode(ctx, me, String(d.combatMode?.mode ?? ''));
  if (pr.classGem) return gemAct(ctx, me, d.classGem ?? {});
  if (!isClassMode(s.combatMode)) return;
  if (pr.talent) return talentAct(ctx, me, d.talent ?? {});
  if (s.ccast && !tpMods(s).stride && Math.hypot(input.axes?.moveX ?? 0, input.axes?.moveZ ?? 0) > 0.1) return cancel(ctx, me, 'Moving interrupts the cast.');
  let id = null;
  if (pr.classCast) { const p = d.classCast ?? {}; id = p.id ?? (Number.isInteger(p.slot) ? barOf(s, s.combatMode)[p.slot] : null); }
  if (!id && !s.holding && s.bugOpen == null && !s.bugDraft) for (let k = 1; k <= 10; k++) if (pr['pluck' + k]) { id = barOf(s, s.combatMode)[k - 1]; break; }
  const sp = moddedOf(spellOfClass(id), s); if (!sp || sp.cls !== s.combatMode) return;
  press(ctx, me, sp, input);
}
function setMode(ctx, me, mode) {
  if (!MODES.some((m) => m.id === mode)) return;
  const s = me.state; if (s.ccast) cancel(ctx, me); s.cq = null;
  if ((s.combatMode ?? 'osrs') === mode) return;
  s.combatMode = mode;
  const m = MODES.find((x) => x.id === mode);
  sfx(ctx, SOUNDS.mode, here(me), 0.55);
  ctx.emit('fx', { position: { ...here(me), y: here(me).y + 0.1 }, script: AOE, params: { ...rgb(m.color), rad: 1.2 } });
  msg(ctx, me, mode === 'osrs' ? 'You return to the OSRS spellbook.' : `You take up the way of the ${m.name}. Your action bar changes.`);
}

// a press: queue it inside the window, refuse it outside, else start the wind-up or release at once
function press(ctx, me, sp, input) {
  const s = me.state, now = ctx.now();
  if (s.dead || s.hp <= 0) return;
  if (sp.ogcd) return offGcd(ctx, me, sp, input, now); // creator 2026-10-10: interrupts and defensives live outside the GCD
  const procd = sp.kind === 'cast' && (s.cproc?.until ?? 0) > now; // a proc makes this cast instant
  const cdLeft = Math.max((s.ccd?.[sp.id] ?? 0) - now, (s.cgcd ?? 0) - now, s.ccast ? s.ccast.end - now : 0);
  if (cdLeft > 0) {
    if (cdLeft <= QUEUE_MS) { s.cq = { id: sp.id, at: now }; ctx.after(cdLeft / 1000 + 0.005, 'classQueue'); } // the spell queue: it fires the frame the clock frees, no gap
    else if (!s.ccast && (s.ccd?.[sp.id] ?? 0) - now > QUEUE_MS) msg(ctx, me, `${sp.name} is not ready yet.`);
    return;
  }
  let tgt = null;
  if (!sp.self) {
    tgt = aimTarget(ctx, me, input, sp.range);
    if (!tgt) { sfx(ctx, pick(KSFX.error, ctx.random()), here(me), 0.4); return msg(ctx, me, outOfRange(ctx, me) ? 'Out of range.' : sp.melee ? 'You need to be next to an enemy.' : 'There is nothing in range to cast that on.'); }
    const why = canHit(ctx, me, tgt); if (why) { sfx(ctx, pick(KSFX.error, ctx.random()), here(me), 0.4); s.cq = null; return msg(ctx, me, why); }
    selectCue(ctx, me, s.lock, tgt); s.lock = tgt.id; s.cmb = true;
  }
  const M = tpMods(s), haste = (+(s.haste ?? 0) || 0) + M.haste;
  const g = gcdOf({ haste }, sp.cls); s.cgcd = now + g; s.cgcdMs = g; s.cq = null;
  if (sp.cast > 0 && !procd) return windUp(ctx, me, { ...sp, cast: Math.max(300, Math.round(sp.cast * M.castMul / (1 + haste / 100))) }, tgt, now);
  if (procd) { s.cproc = null; ctx.emit('uiEvent', { name: 'procUsed', payload: { id: sp.id } }, { audience: { player: me.id } }); }
  release(ctx, me, sp, tgt?.id ?? null);
}
// WoW positional rules: the target must be in front of you (a 180° arc) and in sight; a press never turns you around for free
function canHit(ctx, me, t) {
  const p = here(me), tp = t.bounds?.center ?? { ...here(t), y: here(t).y + 1 }, dx = tp.x - p.x, dz = tp.z - p.z, d = Math.hypot(dx, dz);
  if (d > 1.2) { const f = rotate(me.rotation ?? 0, { x: 0, y: 0, z: -1 }); if (f.x * dx + f.z * dz < 0) return 'You are facing the wrong way!'; }
  const eye = { x: p.x, y: p.y + 1.6, z: p.z }, v = { x: tp.x - eye.x, y: tp.y - eye.y, z: tp.z - eye.z }, L = Math.hypot(v.x, v.y, v.z);
  if (L > 1.5) {
    const r = raycast(ctx, eye, { x: v.x / L, y: v.y / L, z: v.z / L }, { distance: L, ignoreEntities: [me.id], physicsOnly: true, bodies: 'static' });
    if (r && r.distance < L - 1.2) { let o = r.id ? ctx.getObject(r.id) : null, mine = false; for (let i = 0; o && i < 4; i++) { if (o.id === t.id) { mine = true; break; } o = o.parent?.id ? ctx.getObject(o.parent.id) : null; } if (!mine) return 'Target not in line of sight.'; }
  }
  return null;
}
function outOfRange(ctx, me) { const id = me.state.fight?.target ?? me.state.lock, o = id ? ctx.getObject(id) : null; return !!(o && !o.state?.down && o.tags?.includes?.('enemy')); }
// off the GCD: no global clock, no queue, never stops the cast in flight
const WARD_FX = `fx
pop shell n=36 on=sphere(1.05).c(1) life=.5..0.9 v=sdir()*.15 size=.06..0.12 col=<.55,.85,1> a=0>.7:.6>0 sz=$size r=sprite(${KT.puff},alpha)
pop glow n=1 at=disc(.1).c(1) r=light(<.5,.8,1>,1,5)`;
function offGcd(ctx, me, sp, input, now) {
  const s = me.state, left = (s.ccd?.[sp.id] ?? 0) - now;
  if (left > 0) { sfx(ctx, pick(KSFX.error, ctx.random()), here(me), 0.3); return msg(ctx, me, `${sp.name} is not ready yet (${Math.ceil(left / 1000)}s).`); }
  const aud = { audience: { player: me.id } }, p = here(me);
  if (sp.kind === 'defensive') {
    const M = tpMods(s); s.ccd = { ...pruneCd(s.ccd, now), [sp.id]: now + Math.round(sp.cd * M.defCdMul) }; s.wardUntil = now + sp.ward.ms; s.wardPct = Math.min(0.9, sp.ward.pct + M.wardAdd);
    if (sp.name === 'Ice Block') { s.wardPct = 1; iceBlock(ctx, me, sp.ward.ms / 1000); } // spec: complete immunity while encased
    else auraSpawn(ctx, { parent: me.id, feetPosition: { x: 0, y: 0, z: 0 }, audience: 'near', castShadow: false, lifetime: sp.ward.ms / 1000, fx: { script: WARD_FX } });
    sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-protective-ward-shield-hum.mp3', p, 0.7);
    ctx.emit('screenFlash', { color: '#9fd8ff', duration: 0.18, intensity: 0.25 }, aud);
    ctx.emit('uiEvent', { name: 'ward', payload: { ms: sp.ward.ms } }, aud);
    return msg(ctx, me, `${sp.name}: ${Math.round(s.wardPct * 100)}% less damage for ${sp.ward.ms / 1000}s.`);
  }
  const t = aimTarget(ctx, me, input, sp.range);
  if (!t) { sfx(ctx, pick(KSFX.error, ctx.random()), p, 0.4); return msg(ctx, me, outOfRange(ctx, me) ? 'Out of range.' : 'There is nothing in range to interrupt.'); }
  const why = canHit(ctx, me, t); if (why) { sfx(ctx, pick(KSFX.error, ctx.random()), p, 0.4); return msg(ctx, me, why); }
  s.ccd = { ...pruneCd(s.ccd, now), [sp.id]: now + Math.max(3000, sp.cd - tpMods(s).kickCdCut) }; selectCue(ctx, me, s.lock, t); s.lock = t.id; s.cmb = true;
  const was = !!t.state.cast; t.state.cast = null; t.state.dazedUntil = now + 2000; t.state.boundUntil = Math.max(t.state.boundUntil ?? 0, now + 2000);
  const tp = t.bounds?.center ?? { ...here(t), y: here(t).y + 1.2 };
  ctx.emit('fx', { position: tp, script: IMPACT[sp.school] ?? IMPACT.arcane, params: rgb(sp.color) });
  if (sp.name === 'Counterspell') { const f = rotate(me.rotation ?? 0, { x: 0, y: 0, z: -1 }); ctx.emit('fx', { position: { x: p.x + f.x * 0.5, y: p.y + 1.4, z: p.z + f.z * 0.5 }, script: NEEDLES, params: { dx: tp.x - p.x, dy: tp.y + 0.4 - p.y - 1.4, dz: tp.z - p.z } }); }
  sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-spell-interrupt-kick-snap.mp3', tp, 0.85);
  ctx.emit('damageNumber', { position: { ...tp, y: tp.y + 1.2 }, text: was ? 'INTERRUPTED' : 'DAZED', color: '#ffd36a', size: 0.85, lifetime: 1.1 });
  { const MO = motionOf(sp); if (MO) playMotion(me, MO); else castAnim(me, 1.6, sp); }
  const dmg = Math.max(1, Math.round(maxHitOf(sp, tpL(s)) * tpMods(s).dmg * (0.5 + 0.5 * ctx.random())));
  tpXp(ctx, me, dmg * XP_PER_DMG_TP + (hit(ctx, me, t, dmg, false, sp.color, false, sp.melee ? 'phys' : sp.school) ? XP_KILL_TP : 0));
  ctx.emit('cameraPunch', { direction: { x: 0, y: -1, z: 0 }, intensity: 0.12 }, aud);
}
function aimTarget(ctx, me, input, range) {
  const s = me.state, p = here(me), a = input?.axes ?? {};
  if (typeof a.pointerDirX === 'number' && typeof a.pointerOriginX === 'number') {
    let eye = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }; if (flat(eye, p) > 18) eye = { x: p.x, y: p.y + 1.6, z: p.z };
    const r = raycast(ctx, eye, { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 }, { distance: range + 18, ignoreEntities: [me.id] });
    let o = r?.id ? ctx.getObject(r.id) : null;
    for (let i = 0; o && i < 3; i++) { if (o.tags?.includes?.('enemy') && !o.state?.down) return flat(p, here(o)) <= range ? o : null; o = o.parent?.id ? ctx.getObject(o.parent.id) : null; }
  }
  const lock = s.fight?.target ?? s.lock, lo = lock ? ctx.getObject(lock) : null;
  if (lo && !lo.state?.down && lo.tags?.includes?.('enemy') && flat(p, here(lo)) <= range) return lo; // creator 2026-10-10: attacks land on enemies only, never a selected friendly
  let best = null, bd = range;
  for (const r of ctx.query({ tags: ['enemy'], center: p, radius: range }) ?? []) { if (r.state?.down) continue; const dd = flat(p, r.feetPosition); if (dd < bd) { bd = dd; best = r; } }
  return best ? ctx.getObject(best.id) : null;
}

// ---- phase 1: wind-up ----
function windUp(ctx, me, sp, tgt, now) {
  const s = me.state;
  s.ccast = { id: sp.id, target: tgt?.id ?? null, start: now, end: now + sp.cast };
  ctx.after(sp.cast / 1000, 'classCastEnd', { start: now }); // released on the exact frame the bar fills, not the next 0.1 s tick
  if (tgt) me.rotation = { lookAt: here(tgt) };
  me.anim.chan = null; me.anim.chan = holdOf(sp) ? holdOf(sp) : !sp.melee && gatherAnim(me, sp) ? gatherAnim(me, sp) : sp.melee
    ? { clip: 'cdn/clip-attack.glb', loop: 'once', mask: spineOf(me), weight: 1, speed: 0.55 }
    : { clip: sp.kind === 'aoe' ? 'cdn/clip-magic-spell-casting-loop.glb' : 'cdn/clip-spell-casting-loop.glb', loop: 'loop', mask: spineOf(me), weight: 1 };
  // precast kit on BOTH hands (spec: ATTACH_TO_BOTH_HANDS), the orb ramping to full over the cast time (RAMP_EMITTER_WITH_CAST_TIME)
  const gp = { ...rgb(sp.color), ramp: 1000 / Math.max(300, sp.cast) };
  for (const [id, bone] of [['cgather', handOf(me, 'Right')], ['cgatherL', handOf(me, 'Left')]]) if (!sp.melee || id === 'cgather')
    ctx.spawn({ id, parent: me.id, attachment: { bone }, feetPosition: { x: 0, y: 0, z: 0 }, scope: 'session', audience: 'near', lifetime: sp.cast / 1000 + 0.15,
      fx: { script: GATHER, params: gp } });
  ctx.emit('playSound', { clip: SOUNDS.windup, position: here(me), volume: 0.5, pitch: 1.6 / Math.max(0.8, sp.cast / 1000) * 0.8, maxDistance: 30 });
}
function cancel(ctx, me, why) {
  const s = me.state; s.ccast = null; s.cgcd = 0; me.anim.chan = null;
  dropGather(ctx, me);
  if (why) msg(ctx, me, why);
}

// ---- phase 2-3: release and flight ----
function release(ctx, me, sp, targetId, echoMul = 1) {
  const s = me.state, now = ctx.now(), p = here(me);
  s.ccast = null; me.anim.chan = null; dropGather(ctx, me);
  if (sp.cd) s.ccd = { ...pruneCd(s.ccd, now), [sp.id]: now + sp.cd };
  if (sp.echo) ctx.after(0.3, 'classEcho', { spell: sp.id, target: targetId });
  const t = targetId ? ctx.getObject(targetId) : null;
  if (!sp.self && (!t || t.state?.down || flat(p, here(t)) > sp.range + 3)) { sfx(ctx, pick(KSFX.error, ctx.random()), p, 0.4); return msg(ctx, me, 'Your target is gone.'); }
  if (t) me.rotation = { lookAt: here(t) };
  const col = rgb(sp.color), fwd = rotate(me.rotation ?? 0, { x: 0, y: 0, z: -1 });
  const hand = { x: p.x + fwd.x * 0.45, y: p.y + 1.35, z: p.z + fwd.z * 0.45 };
  const A = animOf(sp);
  const MO = motionOf(sp); // creator 2026-10-10: every spell its own body motion (scripts/lib/cast-anim.js BY_NAME)
  if (MO) { playMotion(me, MO); if (sp.melee || sp.self) sfx(ctx, pick(KSFX.swing, ctx.random()), p, 0.7, 0.9 + ctx.random() * 0.2); else { sfx(ctx, SOUNDS.release, hand, 0.6, 0.95 + ctx.random() * 0.1); ctx.emit('fx', { position: hand, script: `fx\n${FLASH}`, params: col }); } }
  else if (sp.melee || (sp.self && ['warrior', 'vwarrior', 'vrogue'].includes(sp.cls))) { me.anim.atk = null; me.anim.atk = { clip: A.clip, loop: 'once', mask: spineOf(me), weight: 1, speed: A.speed }; sfx(ctx, pick(KSFX.swing, ctx.random()), p, 0.7, 0.9 + ctx.random() * 0.2); }
  else if (sp.cls === 'warrior') { me.anim.atk = null; me.anim.atk = { clip: A.clip, loop: 'once', mask: spineOf(me), weight: 1, speed: A.speed }; sfx(ctx, pick(KSFX.swing, ctx.random()), p, 0.7); }
  else { castAnim(me, A.speed, sp); sfx(ctx, SOUNDS.release, hand, 0.6, 0.95 + ctx.random() * 0.1); ctx.emit('fx', { position: hand, script: `fx\n${FLASH}`, params: col }); }
  const L = tpL(s); // 3rd person: the character level, not the OSRS magic/strength skill
  if (sp.special) return special(ctx, me, sp, t, p, fwd);
  if (sp.self && SELF_FX[sp.name]) ctx.emit('fx', { position: { ...p, y: p.y + 0.05 }, script: SELF_FX[sp.name], params: { ...col, rad: sp.radius, dx: fwd.x, dz: fwd.z } });
  if (sp.self) panColumn(ctx, sp.name, { ...p, y: p.y + 0.02 }, sp.radius, col);
  if (sp.self) { // the warrior's AoE: around himself, now
    if (!SELF_FX[sp.name]) ctx.emit('fx', { position: { ...p, y: p.y + 0.1 }, script: AOE, params: { ...col, rad: sp.radius } });
    ctx.emit('shockwave', { position: p, speed: 14, thickness: 0.6, intensity: 0.5 });
    return ctx.after(0.18, 'classLand', { spell: sp.id, target: null, at: { x: p.x, y: p.y + 1, z: p.z }, L, mul: echoMul });
  }
  if ((sp.cls === 'warrior' || sp.melee) && !s.fight) ctx.emit('cbEngage', { target: t.id }, { to: me.id }); // a warrior's strike starts his auto-attack (its own swing timer, combat-player.js)
  const tp = here(t), at = { x: tp.x, y: tp.y + 1.1, z: tp.z };
  if (sp.melee) return ctx.after(0.22, 'classLand', { spell: sp.id, target: t.id, at, L, mul: echoMul });
  if (sp.name === 'Blizzard') ctx.spawn({ feetPosition: { x: tp.x, y: tp.y + 7, z: tp.z }, audience: 'near', castShadow: false, lifetime: sp.pulses * sp.every + 0.6, fx: { script: BLIZZ_CLOUD, params: { rad: sp.radius } } });
  if (sp.pulses) { castAnim(me, A.speed, sp); for (let i = 0; i < sp.pulses; i++) ctx.after(i * sp.every + 0.02, 'classPulse', { spell: sp.id, target: t.id, at, L, mul: echoMul }); return; }
  if (GROUND.has(sp.name)) { const g = { x: tp.x, y: tp.y + 0.05, z: tp.z }; ctx.emit('fx', { position: g, script: GROUND_FX[sp.name], params: { ...col, rad: sp.radius } }); panColumn(ctx, sp.name, g, sp.radius, col); return ctx.after(0.35, 'classLand', { spell: sp.id, target: t.id, at, L, mul: echoMul }); }
  if (SIG_DIRECT[sp.name] && !DIRECT_FX[sp.name]) { const d = SIG_DIRECT[sp.name], g = { x: tp.x, y: tp.y + 0.03, z: tp.z }; ctx.emit('fx', { position: d.ground ? g : at, script: d.fx, params: col }); return ctx.after(d.ground ? 0.14 : 0.06, 'classLand', { spell: sp.id, target: t.id, at, L, mul: echoMul }); }
  if (DIRECT_FX[sp.name]) { const g = { x: tp.x, y: tp.y + 0.03, z: tp.z }; ctx.emit('fx', { position: sp.name === 'Scorch' ? g : at, script: DIRECT_FX[sp.name], params: col }); return ctx.after(sp.name === 'Scorch' ? 0.12 : 0.05, 'classLand', { spell: sp.id, target: t.id, at, L, mul: echoMul }); }
  if (sp.name === 'Blizzard') ctx.spawn({ feetPosition: { x: tp.x, y: tp.y + 7, z: tp.z }, audience: 'near', castShadow: false, lifetime: sp.pulses * sp.every + 0.6, fx: { script: BLIZZ_CLOUD, params: { rad: sp.radius } } });
  const fly = shoot(ctx, sp, hand, at, col);
  ctx.after(fly, 'classLand', { spell: sp.id, target: t.id, at, L, mul: echoMul });
  if (sp.extra) { // GMP: the extra bolts fan to the nearest other enemies; with none near they fly wide and spend themselves
    const others = (ctx.query({ tags: ['enemy'], center: tp, radius: 8 }) ?? []).filter((r) => r.id !== t.id && !r.state?.down && flat(p, r.feetPosition) <= sp.range + 3).slice(0, sp.extra);
    for (let i = 0; i < sp.extra; i++) {
      const o = others[i] ? ctx.getObject(others[i].id) : null;
      if (o) { const op = here(o), oat = { x: op.x, y: op.y + 1.1, z: op.z }; ctx.after(shoot(ctx, sp, hand, oat, col), 'classLand', { spell: sp.id, target: o.id, at: oat, L, mul: echoMul }); }
      else { const side = rotate(me.rotation ?? 0, { x: i ? 1 : -1, y: 0, z: 0 }); shoot(ctx, sp, hand, { x: at.x + side.x * 2.5, y: at.y, z: at.z + side.z * 2.5 }, col); }
    }
  }
}
// ---- VANILLA BOOK (class-spells.js BOOKS): ground spells, channels and the four verbs no bolt carries ----
const GROUND = new Set(['Flamestrike', 'Blizzard']);
const GROUND_FX = {
  'Flamestrike': `fx
pop sigil burst=1 life=1.1 size=%rad|5*2.2 col=${C3} a=0>.1:1>.7:.8>0 sz=$size*(.6>1) r=sprite(${KT.sigil},alpha,ground)
pop pillar burst=60 on=disc(%rad|5*.8) life=.45..0.85 v=up(6..11) size=.6..1.1 col=<1.00,0.42,0.10>>.5:<1.00,0.27,0.05>><0.80,0.15,0.03> a=1>.6:.9>0 sz=$size*(1>.25) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.04)
pop embers burst=30 on=disc(%rad|5) life=.8..1.4 v=up(3..6)+sdir()*1.5 size=.05..0.09 acc=grav()*.4+drag(.6) col=<1.00,0.50,0.15> a=1>0 r=sprite(ember,alpha,velocity,.02)
pop lamp burst=1 life=.9 at=disc(.1).c(1.5) r=light(<1,.5,.2>,14.0,14)`,
  'Blizzard': `fx
pop hoop burst=1 life=1.4 size=%rad|7*2.1 col=<.45,.75,1> a=0>.1:.7>.7:.6>0 r=sprite(${KT.hoop},alpha,ground)
pop shard burst=34 on=disc(%rad|7*.9).c(7) life=.42..0.55 v=<0,-15,0>+sdir()*.6 size=.12..0.2 col=<.55,.82,1> a=1 r=sprite(${KT.thread},alpha,velocity,.06) floor=die
pop burst on=@shard life=.3..0.5 v=up(.5..1.2)+sdir()*1.2 size=.18..0.3 col=<.5,.75,1> a=.8>0 sz=$size*(.6>1.4) r=sprite(${KT.puff},alpha)
pop snow burst=40 on=disc(%rad|7).c(3) life=1..1.6 v=<0,-2.5,0>+sdir()*.5 size=.06..0.12 acc=curl(.6) col=<.85,.93,1> a=0>.2:.9>.8:.9>0 r=sprite(${KT.puff},alpha)`,
};
// PANNING COLUMN (creator 2026-10-10, WoW's ground circles: "low-poly cylinders whose texture coordinates are panned
// continuously along Y"): an open cylinder wearing scripts/mat-pan.js, born, swelling and gone on the shader clock
const PAN = {
  'Flamestrike': { rad: 1, h: 6.5, life: 1.6, col: [3.2, 1.2, 0.25], speed: 2.4, twist: 0.3, freq: 2.5, taper: 0.85 },
  'Frost Nova': { rad: 1, h: 1.4, life: 0.9, col: [0.35, 0.9, 2.4], speed: -1.2, twist: 0, freq: 4, taper: 1.15 },
  'Arcane Explosion': { rad: 1, h: 1.8, life: 0.7, col: null, speed: 2, twist: 1.2, freq: 3, taper: 1.2 },
  'Blast Wave': { rad: 1, h: 1.6, life: 0.8, col: [3, 1.1, 0.2], speed: 2.6, twist: 0, freq: 3, taper: 1.2 },
};
function panColumn(ctx, name, at, radius, col) {
  const k = PAN[name]; if (!k) return;
  const r = (radius ?? 5) * k.rad, c = k.col ?? [col.r * 2.4, col.g * 2.4, col.b * 2.4];
  ctx.spawn({ feetPosition: at, lifetime: k.life + 0.1, audience: 'near', castShadow: false, receiveShadow: false,
    primitive: { kind: 'cylinder', radiusTop: r * k.taper, radiusBottom: r, height: k.h, radialSegments: 28, openEnded: true },
    material: { kind: 'scripted', script: 'scripts/mat-pan.js', params: { r: c[0], g: c[1], b: c[2], speed: k.speed, twist: k.twist, freq: k.freq, glow: 1.2, t0: (ctx.now() / 1000) % 3600, life: k.life } } });
}
const SELF_FX = {
  'Frost Nova': `fx
pop spikes burst=1 life=.6 size=%rad|8*2.2 col=<.45,.78,1> a=1>.6:.9>0 sz=$size*(.2>1:.35>1) r=sprite(${KT.spikes},alpha,ground)
pop hoop burst=1 life=.45 size=%rad|8*2.2 col=<.7,.9,1> a=1>0 sz=$size*(.1>1) r=sprite(${KT.hoop},alpha,ground)
pop shard burst=40 on=disc(.6) life=.35..0.6 v=sdir()*(9..14)*<1,0,1>+up(1..2) size=.12..0.22 acc=drag(3) col=<.6,.85,1> a=1>0 r=sprite(${KT.thread},alpha,velocity,.05)
pop mist burst=16 on=disc(%rad|8*.8) life=.8..1.3 v=up(.3..0.7) size=.6..1 acc=drag(1) col=<.6,.8,1> a=0>.2:.35>.6:.25>0 sz=$size*(.7>1.6) r=sprite(${KT.puff},alpha)`,
  'Cone of Cold': `fx
pop frost burst=70 at=<0,1.2,0> life=.3..0.55 v=(<%dx|0,0,%dz|-1>*(14..20)+sdir()*4)*<1,.35,1> size=.25..0.5 acc=drag(2.5) col=<.6,.85,1> a=1>.6:.8>0 sz=$size*(.5>1.8) rot=0..6.28 r=sprite(${KT.puff},alpha)
pop shard burst=26 at=<0,1.2,0> life=.3..0.45 v=(<%dx|0,0,%dz|-1>*(16..24)+sdir()*3)*<1,.3,1> size=.08..0.14 col=<.8,.95,1> a=1>0 r=sprite(${KT.thread},alpha,velocity,.06)`,
  'Arcane Explosion': `fx
pop rays burst=1 life=.4 size=%rad|9*1.6 col=${C3} a=1>0 sz=$size*(.3>1) rot=0..6.28 r=sprite(${KT.rays},alpha)
pop hoop burst=1 life=.5 at=<0,.1,0> size=%rad|9*2.2 col=${C3} a=1>0 sz=$size*(.1>1) r=sprite(${KT.hoop},alpha,ground)
pop mote burst=50 at=<0,1,0> life=.4..0.7 v=sdir()*(6..10) size=.07..0.13 acc=drag(3) col=${C3} a=1>0 r=sprite(${KT.star},alpha)`,
  'Blast Wave': `fx
pop wave burst=1 life=.55 at=<0,.1,0> size=%rad|9*2.2 col=<1.00,0.40,0.10> a=1>0 sz=$size*(.1>1) r=sprite(${KT.splat},alpha,ground)
pop flame burst=60 on=disc(.8) life=.35..0.6 v=sdir()*(10..15)*<1,0,1>+up(1..2.5) size=.5..0.9 acc=drag(2.6) col=<1.00,0.41,0.09>><1.00,0.25,0.05> a=1>0 sz=$size*(.6>1.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop smoke burst=14 on=disc(%rad|9*.6) life=1..1.6 v=up(.6..1.2) size=.8..1.3 acc=buoy(.5)+drag(1) col=<.25,.2,.18> a=0>.2:.4>.6:.25>0 sz=$size*(.7>1.8) r=sprite(${KT.smoke},alpha)`,
};
Object.assign(SELF_FX, SIG_SELF); Object.assign(GROUND_FX, SIG_GROUND); for (const k of Object.keys(SIG_GROUND)) GROUND.add(k);
const POLY_FX = `fx
pop sigil burst=1 life=1 size=2.4 col=${C3} a=0>.15:1>.7:.8>0 rot=spin(1.5) r=sprite(${KT.sigil2},alpha,ground)
pop puff burst=22 on=sphere(.5).c(.8) life=.5..0.8 v=sdir()*(1.5..3) size=.3..0.5 acc=drag(2.5) col=<1,.75,.9> a=1>0 sz=$size*(.6>1.5) r=sprite(${KT.puff},alpha)
pop star burst=10 on=sphere(.6).c(1) life=.4..0.7 v=up(1..2) size=.15..0.25 col=${C3} a=1>0 r=sprite(${KT.star},alpha)
pop poof burst=26 on=sphere(.6).c(.8) life=.6..1.1 v=sdir()*(1..2.4)+up(.4) size=.6..1 acc=drag(2.2) col=<.97,.96,.94> a=1>.6:.9>0 sz=$size*(.6>1.6) rot=0..6.28 r=sprite(${KT.puff},alpha)`;
const BLINK_FX = `fx
pop flash burst=1 life=.3 at=<0,1,0> size=2.2 col=${C3} a=1>0 sz=$size*(.3>1.2) r=sprite(${KT.spark4},alpha)
pop mote burst=36 on=sphere(.4).c(1) life=.35..0.6 v=sdir()*(2..4) size=.06..0.12 acc=drag(3) col=${C3} a=1>0 r=sprite(${KT.star},alpha)`;
const EVO_FX = `fx
pop sigil n=1 local size=2.6 col=${C3} a=.9 rot=spin(.8) r=sprite(${KT.sigil},alpha,ground)
pop mote rate=30 on=disc(1.6).c(.1) life=.8..1.2 local v=up(1.5..2.5) size=.05..0.1 acc=attract(3) col=${C3} a=0>.2:1>.7:1>0 r=sprite(${KT.star},alpha)
pop whirl n=1 local at=<0,1.1,0> size=1.4 col=${C3} a=.6 rot=spin(2) r=sprite(${KT.whirl},alpha)
pop beam rate=14 on=disc(.9).c(4.5) life=.35..0.5 v=<0,-9,0> size=.12..0.2 col=${C3} a=1>0 r=sprite(${KT.thread},alpha,velocity,.09)
pop lamp n=1 local at=<0,1.2,0> r=light(${C3},1.4,6)`;
const BARRIER_FX = `fx
pop shell n=40 local on=sphere(1.05).c(1) life=.5..0.9 v=sdir()*.12 size=.08..0.16 col=<.6,.88,1> a=0>.7:.6>0 r=sprite(${KT.puff},alpha)
pop facet n=6 local on=sphere(1).c(1.1) life=.8..1.2 size=.2..0.35 col=<.75,.93,1> a=0>.6:.5>0 rot=0..6.28 r=sprite(${KT.spark4},alpha)
pop rune n=1 local at=<0,1.1,0> size=2.6 col=<.55,.85,1> a=.85 rot=spin(1.6) r=sprite(${KT.sigil2},alpha,ground)
pop lamp n=1 local at=<0,1.1,0> r=light(<.5,.8,1>,1,5)`;
const SHEEP = '/cdn/value.9f7ebc8207e06ffe4ac5f2108af73896256c4c19e228aa7a5256ec1567fd54e8.glb'; // the project's Forest Sheep
function special(ctx, me, sp, t, p, fwd) {
  const s = me.state, now = ctx.now(), col = rgb(sp.color), aud = { audience: { player: me.id } };
  if (!motionOf(sp)) castAnim(me, 1.6, sp); // a dash keeps its own roll
  if (sp.special === 'blink') {
    const eye = { x: p.x, y: p.y + 1, z: p.z }, hit = raycast(ctx, eye, { x: fwd.x, y: 0, z: fwd.z }, { distance: sp.dist, ignoreEntities: [me.id], physicsOnly: true, bodies: 'static' });
    const d = hit ? Math.max(0, hit.distance - 0.7) : sp.dist, x = p.x + fwd.x * d, z = p.z + fwd.z * d;
    const y = ctx.place.terrain?.heightAt?.(x, z) ?? p.y;
    ctx.emit('fx', { position: p, script: BLINK_FX, params: col });
    me.feetPosition = { x, y: Math.max(y, p.y - 2) + 0.05, z };
    ctx.emit('fx', { position: { x, y: y + 0.05, z }, script: BLINK_FX, params: col });
    sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-blink-teleport-arcane-pop.mp3', p, 0.75);
    if ((s.boundUntil ?? 0) > now) s.boundUntil = 0;
    return;
  }
  if (sp.special === 'heal') { // creator 2026-10-10 vanilla classes: Holy Light, Healing Touch, Renew… a share of max health back, now
    const max = tpMaxHp(s), before = s.hp ?? max; s.hp = Math.min(max, before + Math.max(1, Math.round(max * sp.heal)));
    ctx.emit('fx', { position: { ...p, y: p.y + 0.05 }, script: SIG_HEAL[sp.name] ?? HEAL_FX, params: col });
    sfx(ctx, SCHOOLS[sp.school]?.sound, p, 0.5, 1.5);
    ctx.emit('uiEvent', { name: 'fct', payload: { t: me.id, v: s.hp - before, s: 'heal', c: false } }, { audience: { nearby: p, radius: FCT.radius } });
    return;
  }
  if (sp.special === 'buff') { // Battle Shout, Blessing of Kings, Bestial Wrath…: hits land harder for a while
    s.cbuff = { until: now + sp.buff.ms, mul: sp.buff.mul, name: sp.name };
    ctx.emit('fx', { position: { ...p, y: p.y + 0.05 }, script: SIG_BUFF[sp.name] ?? BUFF_FX, params: col });
    ctx.emit('shockwave', { position: p, speed: 10, thickness: 0.4, intensity: 0.3 });
    sfx(ctx, SOUNDS.mode, p, 0.6, 1.2);
    return msg(ctx, me, `${sp.name}: +${Math.round((sp.buff.mul - 1) * 100)}% damage for ${sp.buff.ms / 1000}s.`);
  }
  if (sp.special === 'barrier') {
    s.wardUntil = now + sp.ward.ms; s.wardPct = sp.ward.pct;
    auraSpawn(ctx, { parent: me.id, feetPosition: { x: 0, y: 0, z: 0 }, audience: 'near', castShadow: false, lifetime: sp.ward.ms / 1000, fx: { script: SIG_WARD[sp.name] ? `fx\n${SIG_WARD[sp.name].fx}` : BARRIER_FX } });
    auraSpawn(ctx, { parent: me.id, feetPosition: { x: 0, y: 0.15, z: 0 }, audience: 'near', castShadow: false, lifetime: sp.ward.ms / 1000, primitive: { kind: 'sphere', radius: 1.15, widthSegments: 10, heightSegments: 7 }, material: { color: SIG_WARD[sp.name]?.tint ?? 'oklch(0.8 0.13 230)', opacity: 0.32, transparent: true, roughness: 0.15, flatShading: true, outline: true } });
    sfx(ctx, (SCHOOLS[sp.school] ?? SCHOOLS.frost)?.sound, p, 0.6, 1.4); ctx.emit('uiEvent', { name: 'ward', payload: { ms: sp.ward.ms } }, aud);
    return msg(ctx, me, `${sp.name}: ${Math.round(sp.ward.pct * 100)}% less damage for ${sp.ward.ms / 1000}s.`);
  }
  if (sp.special === 'evocate') {
    auraSpawn(ctx, { parent: me.id, feetPosition: { x: 0, y: 0.05, z: 0 }, audience: 'near', castShadow: false, lifetime: sp.pulses * sp.every, fx: { script: EVO_FX, params: col } });
    me.anim.chan = null; me.anim.chan = { clip: 'cdn/clip-magic-spell-casting-loop.glb', loop: 'loop', mask: spineOf(me), weight: 1 };
    s.evoAt = { x: p.x, z: p.z, until: now + sp.pulses * sp.every * 1000 };
    for (let i = 1; i <= sp.pulses; i++) ctx.after(i * sp.every, 'classEvoTick', { last: i === sp.pulses });
    return msg(ctx, me, 'You channel Evocation. Stand still to keep it.');
  }
  if (sp.special === 'poly' && t) {
    debuff(ctx, t, sp, sp.holdMs, now, 'cc'); t.state.sheepUntil = now + sp.holdMs; t.state.boundUntil = Math.max(t.state.boundUntil ?? 0, now + sp.holdMs); t.state.cast = null;
    const tp = here(t);
    ctx.emit('fx', { position: { x: tp.x, y: tp.y + 0.05, z: tp.z }, script: POLY_FX, params: col });
    if (!t.state.preModel && t.model) t.state.preModel = t.model?.id ?? t.model; // the creature becomes the project's Forest Sheep
    t.model = SHEEP; ctx.after(sp.holdMs / 1000, 'classUnsheep', { target: t.id });
    sfx(ctx, '/cdn/moodboard-lowpoly-cozy/sfx-sheep-bleat.mp3', tp, 0.9);
    ctx.emit('damageNumber', { position: { ...tp, y: tp.y + 2 }, text: 'POLYMORPHED', color: sp.color, size: 0.8, lifetime: 1.2 });
  }
}
export function classUnsheep(ctx, { target }) {
  const t = ctx.getObject(target); if (!t) return;
  if ((t.state.sheepUntil ?? 0) > ctx.now() + 50) return ctx.after((t.state.sheepUntil - ctx.now()) / 1000, 'classUnsheep', { target });
  if (t.state.preModel) { t.model = t.state.preModel; delete t.state.preModel; }
  t.state.boundUntil = 0; ctx.emit('fx', { position: here(t), script: POLY_FX, params: rgb('#c48bff') });
}
export function classEvoTick(ctx, { last }) {
  const me = ctx.self, s = me.state, e = s.evoAt; if (!e) return;
  const p = here(me);
  if (Math.hypot(p.x - e.x, p.z - e.z) > 0.6 || s.dead) { s.evoAt = null; me.anim.chan = null; return msg(ctx, me, 'Evocation is broken.'); }
  const max = tpMaxHp(s), gain = Math.max(1, Math.round(max * 0.12)), before = s.hp ?? max;
  s.hp = Math.min(max, before + gain);
  if (s.hp > before) ctx.emit('uiEvent', { name: 'fct', payload: { t: me.id, v: s.hp - before, s: 'heal', c: false } }, { audience: { nearby: p, radius: FCT.radius } });
  if (last) { s.evoAt = null; me.anim.chan = null; }
}
// a channel's tick: Arcane Missiles sends one more bolt, Blizzard drops one more volley on the same ground
export function classPulse(ctx, { spell, target, at, L, mul }) {
  const me = ctx.self, sp = moddedOf(spellOfClass(spell), me.state); if (!sp || me.state.dead) return;
  const t = target ? ctx.getObject(target) : null, col = rgb(sp.color);
  if (sp.radius) { ctx.emit('fx', { position: { x: at.x, y: at.y - 1.05, z: at.z }, script: GROUND_FX[sp.name] ?? AOE, params: { ...col, rad: sp.radius } }); return ctx.after(0.45, 'classLand', { spell, target, at, L, mul }); }
  if (!t || t.state?.down) return;
  const p = here(me), fwd = rotate(me.rotation ?? 0, { x: 0, y: 0, z: -1 }), tp = here(t), to = { x: tp.x, y: tp.y + 1.1, z: tp.z };
  me.rotation = { lookAt: tp };
  const hand = { x: p.x + fwd.x * 0.45, y: p.y + 1.35, z: p.z + fwd.z * 0.45 };
  ctx.emit('fx', { position: hand, script: `fx\n${FLASH}`, params: col }); sfx(ctx, SOUNDS.release, hand, 0.35, 1.3 + ctx.random() * 0.2);
  ctx.after(shoot(ctx, sp, hand, to, col), 'classLand', { spell, target, at: to, L, mul });
}
// WOW MODE meshes by spell name (class-spells.js 'wow' kit). Bolts fly them; AoEs stand theirs on the ground for a beat.
const WOW_BOLT = { 'Fireball': WS.spellFireball, 'Pyroblast': WS.spellPyroblast, 'Frostbolt': WS.spellFrostbolt, 'Arcane Missiles': WS.spellArcaneMissile,
  'Lightning Bolt': WS.spellLightningBolt, 'Wrath': WS.spellWrath, 'Moonfire': WS.spellMoonfire, 'Flame Shock': WS.spellFlameShock,
  'Earth Shock': WS.spellEarthShock, 'Chain Lightning': WS.spellChainLightning, 'Cone of Cold': WS.spellConeOfCold };
const WOW_GROUND = { 'Flamestrike': WS.spellFlamestrike, 'Blizzard': WS.spellBlizzard, 'Arcane Explosion': WS.spellArcaneExplosion,
  'Thunder Clap': WS.spellWhirlwind, 'Frost Nova': WS.spellIceBarrier };
// one bolt from a to b: the glowing core rides a tween; returns its flight time
function shoot(ctx, sp, from, to, col) {
  const V = vfxOf(sp); // the spell's own missile speed (Fireball 28 m/s, Pyroblast 15, Lightning Bolt 35)
  let fly = Math.min(2.6, 0.05 + Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) / V.speed);
  const rock = THICK.has(sp.name);
  const wm = sp.cls === 'wow' && !rock ? WOW_BOLT[sp.name] : null; // WOW MODE: the real mesh rides the bolt, nose to target, fx trail kept
  const look = !rock && !wm ? boltLook(sp) : null; // every other school: its own toon solid + banded fx (scripts/lib/data/spell-looks.js)
  const flyT = look?.speedMul ? fly / look.speedMul : fly; if (flyT !== fly) fly = flyT;
  const bolt = ctx.spawn({ feetPosition: from, lifetime: fly + 0.2, audience: 'near', castShadow: false, fx: { script: look ? look.fx : boltFx(sp.school, sp.name), params: col },
    ...(V.scale !== 1 && !wm ? { scale: V.scale } : {}), ...(rock || look ? { rotation: { lookAt: to, include: ['yaw', 'pitch'] } } : {}), ...(wm ? { model: wm.model, scale: wm.scale[0] * 0.55 * V.scale, rotation: { lookAt: to, include: ['yaw', 'pitch'] } } : {}) });
  if (rock && bolt) {
    const cb = CORE_BOLT[sp.name], pr = cb.prim(), sc = cb.scale;
    ctx.spawn({ parent: bolt, feetPosition: { x: 0, y: -pr.radius * (sc ? sc.y : 1) * V.scale, z: 0 }, primitive: pr, material: cb.mat(), audience: 'near', castShadow: false, lifetime: fly + 0.2,
      ...(sc ? { scale: sc } : { rotation: { yaw: ctx.random() * 360, pitch: ctx.random() * 360, roll: 0 } }) });
  }
  if (look && bolt) for (const pt of look.parts ?? []) {
    const kid = ctx.spawn({ parent: bolt, feetPosition: { x: 0, y: pt.y ?? 0, z: pt.z ?? 0 }, pivot: 'center', primitive: pt.prim, material: pt.mat, audience: 'near', castShadow: false, lifetime: fly + 0.2,
      scale: pt.scale ? { x: pt.scale.x * 1.3, y: pt.scale.y * 1.3, z: pt.scale.z * 1.3 } : 1.3, rotation: pt.rot ?? (pt.tumble ? { yaw: ctx.random() * 360, pitch: ctx.random() * 360, roll: 0 } : { yaw: 0, pitch: 0, roll: 0 }) });
    const ko = (pt.tumble || pt.spin) && kid ? ctx.getObject(kid) : null;
    if (ko) animate(ctx, ko, pt.spin ? { 'rotation.pitch': '-=' + Math.round(fly * 900) } : { 'rotation.yaw': '+=' + Math.round(fly * 720), 'rotation.pitch': '+=' + Math.round(fly * 540) }, { duration: fly, easing: 'linear' });
  }
  const b = bolt && ctx.getObject(bolt);
  if (b && sp.name === 'Arcane Missiles') { // spec: darts that weave in corkscrew paths: three bends, each to a different side
    const dx = to.x - from.x, dz = to.z - from.z, dl = Math.hypot(dx, dz) || 1, sx = -dz / dl, sz = dx / dl, w = 0.9 + ctx.random() * 0.5, sg = ctx.random() < 0.5 ? 1 : -1;
    const pts = [0.33, 0.66, 1].map((f, i) => { const o = f < 1 ? sg * (i % 2 ? -w : w) : 0, up = f < 1 ? (i ? -0.35 : 0.55) : 0; return { x: from.x + dx * f + sx * o, y: from.y + (to.y - from.y) * f + up, z: from.z + dz * f + sz * o }; });
    pts.forEach((q, i) => animate(ctx, b, { 'feetPosition.x': q.x, 'feetPosition.y': q.y, 'feetPosition.z': q.z }, { duration: fly / 3, delay: i * fly / 3, easing: 'easeInOutSine' }));
  } else if (b) animate(ctx, b, { 'feetPosition.x': to.x, 'feetPosition.y': to.y, 'feetPosition.z': to.z }, { duration: fly, easing: 'linear' });
  return fly;
}
// Spell Echo: the same spell again, free, 10% less damage
export function classEcho(ctx, { spell, target }) {
  const me = ctx.self, sp = moddedOf(spellOfClass(spell), me.state); if (!sp) return;
  release(ctx, me, { ...sp, cd: 0, echo: false }, target, 0.9);
}
const dropGather = (ctx, me) => { for (const k of ['/cgather', '/cgatherL']) if (ctx.getObject(me.id + k)) ctx.destroy(me.id + k); };
const pruneCd = (cd, now) => Object.fromEntries(Object.entries(cd ?? {}).filter(([, v]) => v > now));

// Frostbolt's mark (creator 2026-10-10, "yes" to a frost crack that shatters): a toon frost patch on the ground under the hit,
// a ring of ice spikes punching up out of it, and ~1 s later the spikes burst into tumbling shards and snow
const SHATTER = `fx
pop shard burst=18..26 on=disc(.7) life=.6..1 v=up(2.5..4.5)+sdir()*(1.5..3) size=.1..0.2 spin=-8..8 acc=grav() col=<.35,.65,1> a=1 rot=$age*$spin floor=bounce(.3) r=sprite(${KT.puff},alpha)
pop snow burst=14 on=disc(.8) life=.7..1.2 v=up(.6..1.4)+sdir()*.6 size=.25..0.45 acc=drag(1.4)+grav()*.1 col=<.35,.6,1> a=.8>0 sz=$size*(.7>1.6) r=sprite(${KT.puff},alpha)
pop glint burst=6 on=disc(.6).c(.4) life=.25..0.4 size=.3..0.5 col=<.5,.8,1> a=1>0 r=sprite(${KT.star},alpha)`;
const ICE_SPIKE_MAT = { color: 'oklch(0.88 0.07 220)', roughness: 0.2, emissive: 'oklch(0.72 0.12 225)', emissiveIntensity: 0.16, outline: true };
function frostMark(ctx, g) {
  const kids = [{ primitive: { kind: 'cylinder', radiusTop: 1.1, radiusBottom: 1.1, height: 0.03, radialSegments: 10 }, feetPosition: { x: 0, y: 0.01, z: 0 },
    material: { color: 'oklch(0.86 0.08 220)', emissive: 'oklch(0.7 0.12 225)', emissiveIntensity: 0.12, opacity: 0.8, transparent: true, outline: true } }];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * 360 + ctx.random() * 30, r = 0.35 + ctx.random() * 0.4, h = 0.5 + ctx.random() * 0.5, rad = a * Math.PI / 180;
    kids.push({ primitive: { kind: 'cone', radius: 0.12 + ctx.random() * 0.06, height: h, radialSegments: 5 }, material: ICE_SPIKE_MAT,
      feetPosition: { x: Math.cos(rad) * r, y: 0, z: Math.sin(rad) * r }, rotation: { yaw: -a, pitch: 0, roll: -18 - ctx.random() * 14 } });
  }
  ctx.spawn({ feetPosition: g, audience: 'near', castShadow: false, lifetime: 1.05, children: kids });
  ctx.after(1, 'classShatter', g);
}
export function classShatter(ctx, g) { ctx.emit('fx', { position: { x: g.x, y: g.y + 0.2, z: g.z }, script: SHATTER }); sfx(ctx, SCHOOLS.frost?.sound, g, 0.6, 1.35); }

// ---- MAGE SIGNATURES (creator 2026-10-10, his classic Mage spec: each spell its own read) ----
const DIRECT_FX = { // no travelling missile: the spell happens ON the target
  'Fire Blast': `fx
pop pow burst=1 life=.28 size=3.2 rot=0..6.28 col=<1,.5,.08> a=1>.7:1>0 sz=$size*(.3>1.1) r=sprite(${KT.splat},alpha)
pop core burst=1 life=.18 size=1.8 col=<1,.85,.3> a=1>0 sz=$size*(.4>1) r=sprite(${KT.puff},alpha)
pop flame burst=30 on=sphere(.3) life=.3..0.55 v=sdir()*(5..9) size=.4..0.7 acc=drag(3) col=<1,.45,.05>><.9,.2,.02> a=1>0 sz=$size*(.7>1.2) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop ember burst=24 on=sphere(.3) life=.6..1.1 v=sdir()*(3..6)+up(1) size=.05..0.09 acc=grav()*.5+drag(.8) col=<1,.6,.15> a=1>0 r=sprite(ember,alpha,velocity,.02)
pop lamp burst=1 life=.3 r=light(<1,.5,.15>,10,8)`,
  'Scorch': `fx
pop column burst=40 on=disc(.45) life=.35..0.6 v=up(5..9) size=.5..0.9 col=<1,.82,.25>>.5:<1,.48,.08>><.85,.2,.03> a=1>.6:.9>0 sz=$size*(1>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.05)
pop ring burst=1 life=.35 size=2.4 col=<1,.6,.12> a=1>0 sz=$size*(.2>1) r=sprite(${KT.hoop},alpha,ground)
pop mark burst=1 life=1.6 size=1.8 col=<.18,.08,.04> a=.9>.7:.8>0 r=sprite(${KT.scorch},alpha,ground)
pop ember burst=20 on=disc(.4) life=.7..1.2 v=up(3..5)+sdir() size=.05..0.08 acc=grav()*.4 col=<1,.6,.15> a=1>0 r=sprite(ember,alpha,velocity,.02)
pop lamp burst=1 life=.4 at=<0,1,0> r=light(<1,.55,.15>,8,7)`,
};
const BLIZZ_CLOUD = `fx
pop cloud n=14 local on=disc(%rad|7*.75) life=1.2..2 size=2.2..3.2 acc=curl(.3) col=<.32,.38,.5> a=0>.2:.85>.75:.85>0 sz=$size*(.8>1.1) rot=spin(.2) r=sprite(${KT.smoke},alpha)
pop under n=6 local on=disc(%rad|7*.6) life=1.5..2 at=<0,-.4,0> size=2.6..3.4 col=<.55,.65,.82> a=0>.2:.5>.8:.5>0 rot=spin(.15) r=sprite(${KT.puff},alpha)
pop flake rate=60 local on=disc(%rad|7*.9) life=2..2.6 v=<0,-3,0>+sdir()*.4 size=.06..0.11 acc=curl(.5) col=<.9,.96,1> a=1 floor=die r=sprite(${KT.puff},alpha)`;
const NEEDLES = `fx
pop needle burst=7 life=.16..0.22 v=<%dx|0,%dy|0,%dz|-1>*(5.5..6.5)+sdir()*.6 size=.07..0.1 col=<.85,.8,1> a=1 r=sprite(${KT.thread},alpha,velocity,.06)
pop glint burst=1 life=.18 size=.9 col=<.8,.6,1> a=1>0 r=sprite(${KT.spark4},alpha)`;
const EMBER_BED = `fx
pop lick rate=26 on=disc(%rad|5*.85) life=.4..0.8 v=up(1.5..3) size=.35..0.6 col=<1,.55,.1>>.5:<.95,.3,.04>><.6,.12,.03> a=0>.15:1>.6:.8>0 sz=$size*(.8>.3) rot=0..6.28 r=sprite(${KT.flame},alpha,velocity,.04)
pop smoke rate=5 on=disc(%rad|5*.7) life=1.4..2 v=up(1..1.6) size=.8..1.2 acc=buoy(.4)+drag(.8) col=<.18,.15,.14> a=0>.2:.35>.6:.25>0 sz=$size*(.7>1.8) r=sprite(${KT.smoke},alpha)
pop ember rate=14 on=disc(%rad|5) life=.8..1.4 v=up(1.5..3) size=.04..0.07 acc=curl(.6) col=<1,.6,.15> a=1>0 r=sprite(ember,alpha,velocity,.02)`;
const ICE_BLOCK_MAT = { color: 'oklch(0.86 0.09 225)', opacity: 0.78, transparent: true, roughness: 0.12, flatShading: true, emissive: 'oklch(0.6 0.12 230)', emissiveIntensity: 0.12, outline: true };
function iceFeet(ctx, t, secs) { // spec: Frost Nova leaves ice blocks round the trapped enemy's feet
  const kids = [];
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + ctx.random(), r = 0.3 + ctx.random() * 0.15; kids.push({ primitive: { kind: 'box', width: 0.42, height: 0.35 + ctx.random() * 0.3, depth: 0.38 }, material: ICE_BLOCK_MAT, feetPosition: { x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r }, rotation: { yaw: ctx.random() * 90, pitch: ctx.random() * 16 - 8, roll: ctx.random() * 16 - 8 } }); }
  ctx.spawn({ feetPosition: here(t), audience: 'near', castShadow: false, lifetime: Math.min(8, secs), children: kids });
  ctx.after(Math.min(8, secs), 'classShatter', here(t));
}
function iceBlock(ctx, me, secs) { // spec: an opaque faceted block of solid ice round the mage
  auraSpawn(ctx, { parent: me.id, feetPosition: { x: 0, y: 0, z: 0 }, audience: 'near', castShadow: false, lifetime: secs,
    primitive: { kind: 'cylinder', radiusTop: 0.62, radiusBottom: 0.72, height: 2.15, radialSegments: 6 }, material: { ...ICE_BLOCK_MAT, opacity: 0.88 } });
  ctx.emit('fx', { position: here(me), script: SHATTER });
  ctx.after(secs, 'classShatter', here(me));
}
function mageSig(ctx, me, sp, t0, at, col) {
  const g = t0 ? here(t0) : { x: at.x, y: at.y - 1.1, z: at.z }, aud = { audience: { player: me.id } };
  if (sp.name === 'Pyroblast') { // a deep, concussive blast
    ctx.emit('fx', { position: at, script: DIRECT_FX['Fire Blast'], params: col });
    ctx.emit('shockwave', { position: at, speed: 16, thickness: 0.8, intensity: 0.8 });
    ctx.emit('screenShake', { intensity: 0.3, duration: 0.35 }, aud);
    ctx.emit('decal', { position: { x: g.x, y: g.y + 0.02, z: g.z }, normal: { x: 0, y: 1, z: 0 }, texture: KT.scorch, size: 2.6, lifetime: 8, fade: 2 });
    sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-deep-fire-explosion-boom.mp3', at, 0.8);
  }
  if (sp.name === 'Fireball') ctx.emit('decal', { position: { x: g.x, y: g.y + 0.02, z: g.z }, normal: { x: 0, y: 1, z: 0 }, texture: KT.scorch2, size: 1.3, lifetime: 5, fade: 1.5 });
  if (sp.name === 'Flamestrike') { // the cracked, scorched floor that keeps burning for a while
    ctx.emit('decal', { position: { x: at.x, y: g.y + 0.02, z: at.z }, normal: { x: 0, y: 1, z: 0 }, texture: KT.scorch, size: sp.radius * 2.2, lifetime: 8, fade: 2 });
    ctx.spawn({ feetPosition: { x: at.x, y: g.y + 0.05, z: at.z }, audience: 'near', castShadow: false, lifetime: 7, fx: { script: EMBER_BED, params: { rad: sp.radius } } });
  }
}

// ---- phase 4-5: impact and aura ----
export function classLand(ctx, { spell, target, at, L, mul = 1, hitIds = null }) {
  const me = ctx.self, sp = moddedOf(spellOfClass(spell), me.state); if (!sp) return;
  const TM = tpMods(me.state), col = rgb(sp.color), now = ctx.now(), bf = (me.state.cbuff?.until ?? 0) > now ? me.state.cbuff.mul : 1, max = Math.max(1, Math.round(modMaxHit(sp, L | 0) * mul * TM.dmg * bf));
  const t0 = target ? ctx.getObject(target) : null; if (t0?.bounds) { const bb = t0.bounds; at = { x: bb.center.x, y: bb.min.y + bb.size.y * 0.7, z: bb.center.z }; }
  ctx.emit('fx', { position: at, script: (THICK.has(sp.name) ? IMPACT[sp.school] : IMPACTS[sp.school] ?? IMPACT[sp.school]) ?? IMPACT.arcane, params: col });
  if (sp.melee && sp.school !== 'steel') ctx.emit('fx', { position: at, script: SLASH, params: col });
  sfx(ctx, SCHOOLS[sp.school]?.sound, at, 0.8, 0.92 + ctx.random() * 0.16);
  if (sp.name === 'Frostbolt') { const gx = t0 ? here(t0) : null, gy = gx?.y ?? ctx.place.terrain?.heightAt?.(at.x, at.z) ?? at.y - 1.1; frostMark(ctx, { x: gx?.x ?? at.x, y: gy, z: gx?.z ?? at.z }); }
  mageSig(ctx, me, sp, t0, at, col);
  const wg = sp.cls === 'wow' ? WOW_GROUND[sp.name] : null;
  if (wg) { const g = sp.self ? here(me) : at; ctx.spawn({ feetPosition: { x: g.x, y: (sp.self ? g.y : g.y - 1.1) + 0.05, z: g.z }, model: wg.model, scale: wg.scale[0] * (sp.radius ?? 4) / 2.5, audience: 'near', castShadow: false, lifetime: 1.6 }); }
  let victims = [];
  if (sp.radius) {
    const c = sp.self ? here(me) : at;
    if (!sp.self) { ctx.emit('fx', { position: { x: at.x, y: at.y - 1, z: at.z }, script: AOE, params: { ...col, rad: sp.radius } }); ctx.emit('shockwave', { position: at, speed: 12, thickness: 0.5, intensity: 0.4 }); }
    const fw = rotate(me.rotation ?? 0, { x: 0, y: 0, z: -1 }), cosH = sp.cone ? Math.cos(sp.cone / 2 * Math.PI / 180) : -2;
    const inCone = (r) => { if (!sp.cone) return true; const dx = r.feetPosition.x - c.x, dz = r.feetPosition.z - c.z, d = Math.hypot(dx, dz) || 1; return (fw.x * dx + fw.z * dz) / d >= cosH; };
    victims = (ctx.query({ tags: ['enemy'], center: c, radius: sp.radius }) ?? []).filter((r) => !r.state?.down && inCone(r)).slice(0, 8).map((r) => ctx.getObject(r.id)).filter(Boolean);
  } else if (t0 && !t0.state?.down) {
    victims = [t0];
    if (sp.splash) { // Melee Splash: the blow carries to everything near the one struck
      ctx.emit('fx', { position: { x: at.x, y: at.y - 1, z: at.z }, script: AOE, params: { ...col, rad: sp.splash } });
      for (const r of ctx.query({ tags: ['enemy'], center: here(t0), radius: sp.splash }) ?? []) if (r.id !== t0.id && !r.state?.down) { const o = ctx.getObject(r.id); if (o) victims.push(o); }
      victims = victims.slice(0, 6);
    }
  }
  let total = 0, bigAny = false, critAny = false, kills = 0;
  for (const t of victims) {
    let dmg = Math.max(1, Math.round(max * (0.35 + 0.65 * ctx.random())));
    const crit = ctx.random() < (me.state.crit ?? CRIT.chance) + TM.crit; if (crit) dmg = Math.ceil(dmg * (CRIT.mul + TM.critMul));
    if (sp.cold) dmg += 1 + Math.floor(ctx.random() * 2);
    if (sp.shock) dmg += Math.floor(ctx.random() * 4);
    if ((t.state.shockUntil ?? 0) > now) dmg = Math.ceil(dmg * 1.2);
    const big = crit || (dmg >= Math.ceil(max * 0.8) && max >= 3);
    if (hit(ctx, me, t, dmg, big, sp.color, crit, sp.melee ? 'phys' : sp.school)) kills++; critAny = critAny || crit; total += dmg; bigAny = bigAny || big;
    if (sp.status) applyStatus(ctx, me, t, sp, dmg, now);
    if (sp.name === 'Frost Nova' || sp.name === 'Frostbolt' || sp.name === 'Cone of Cold' || sp.name === 'Blizzard') ctx.emit('flash', { target: t.id, color: '#6fc4ff', duration: sp.name === 'Frost Nova' ? 1.2 : 0.7 });
    if (sp.name === 'Frost Nova') iceFeet(ctx, t, (sp.rootMs ?? 6000) / 1000);
    if (STUNNERS.has(sp.name)) { const hp0 = here(t), hb = t.bounds; ctx.spawn({ feetPosition: { x: hp0.x, y: (hb ? hb.max.y : hp0.y + 1.9) + 0.25, z: hp0.z }, audience: 'near', castShadow: false, lifetime: Math.min(6, (sp.rootMs ?? 2000) / 1000), fx: { script: SIG_STUN } }); }
    if (BLEEDERS.has(sp.name)) ctx.emit('fx', { position: { ...here(t), y: here(t).y + 1.1 }, script: SIG_BLEED });
    if (sp.cold) { chill(ctx, t, now); debuff(ctx, t, sp, 1200, now, 'slow'); }
    if (sp.chillMs) { chill(ctx, t, now, sp.chillMs); debuff(ctx, t, sp, sp.chillMs, now, 'slow'); }
    if (STUNNERS.has(sp.name)) debuff(ctx, t, sp, Math.min(6000, sp.rootMs ?? 2000), now, 'stun');
    if (BLEEDERS.has(sp.name)) debuff(ctx, t, sp, 9000, now, 'bleed');
    if (sp.name === 'Frost Nova') debuff(ctx, t, sp, sp.rootMs ?? 6000, now, 'root');
    if (sp.shock) { t.state.shockUntil = now + 4000; debuff(ctx, t, sp, 4000, now, 'shock'); }
    if (sp.prolif && sp.status) for (const r of ctx.query({ tags: ['enemy'], center: here(t), radius: sp.prolif }) ?? []) {
      if (r.id === t.id || r.state?.down) continue; const o = ctx.getObject(r.id); if (o) applyStatus(ctx, me, o, sp, Math.max(1, Math.round(dmg * 0.5)), now);
    }
  }
  if (sp.chains && t0 && !sp.radius) { // Chain: the bolt leaps on to the nearest enemy it has not struck
    const seen = [...(hitIds ?? []), t0.id];
    if (seen.length <= sp.chains) {
      const nx = (ctx.query({ tags: ['enemy'], center: here(t0), radius: 12 }) ?? []).find((r) => !seen.includes(r.id) && !r.state?.down);
      if (nx) { const np = nx.feetPosition, nat = { x: np.x, y: np.y + 1.1, z: np.z }; ctx.after(shoot(ctx, sp, at, nat, col), 'classLand', { spell, target: nx.id, at: nat, L, mul, hitIds: seen }); }
    }
  }
  if (total > 0) gemXp(ctx, me, sp, total);
  const aud = { audience: { player: me.id } };
  if (total > 0) {
    ctx.emit('hitstop', { duration: bigAny ? 0.07 : 0.035 }, aud);
    ctx.emit('cameraPunch', { direction: { x: 0, y: -1, z: 0 }, intensity: bigAny ? 0.35 : 0.14 }, aud);
    if (bigAny || sp.radius) ctx.emit('screenShake', { intensity: sp.radius ? 0.14 : 0.1, duration: 0.2 }, aud);
    ctx.emit('uiEvent', { name: 'hitDealt', payload: { dmg: total, big: bigAny, crit: critAny } }, aud);
    if (critAny) { ctx.emit('screenShake', { intensity: 0.16, duration: 0.18 }, aud); sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-critical-hit-heavy-crunch.mp3', at, 0.75); }
    const ms = me.state; // a proc: the next Cast-kind spell goes instant (the Spell Activation Overlay lights)
    if (!sp.radius && !sp.ogcd && (ms.cproc?.until ?? 0) <= now && ctx.random() < PROC.chance + TM.proc) {
      ms.cproc = { until: now + TM.procMs, name: PROC.names[sp.cls] ?? 'Proc' };
      sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-proc-activation-bright-chime.mp3', here(me), 0.7);
      ctx.emit('uiEvent', { name: 'proc', payload: { name: ms.cproc.name } }, aud);
      ctx.emit('damageNumber', { position: { ...here(me), y: here(me).y + 2.3 }, text: ms.cproc.name.toUpperCase() + '!', color: '#ffcf4a', size: 0.8, lifetime: 1.2 }, aud);
    }
    tpXp(ctx, me, total * XP_PER_DMG_TP + kills * XP_KILL_TP); // character xp, never OSRS skill xp
  }
}
function hit(ctx, me, t, dmg, big, color, crit = false, school = 'phys') {
  if (t.tags?.includes?.('player') && t.state?.zone === 'safe') return; // editor Safe zone
  const before = typeof t.state.hp === 'number' ? t.state.hp : (t.state.maxHp ?? 10);
  if (typeof t.state.hp === 'number') t.state.hp -= dmg; else t.state.hp = (t.state.maxHp ?? 10) - dmg;
  const killed = before > 0 && before - dmg <= 0 && !t.tags?.includes?.('training-dummy');
  if ((t.state.sheepUntil ?? 0) > ctx.now()) { t.state.sheepUntil = 0; ccText(ctx, t, 'broken'); if (Array.isArray(t.state.debuffs)) t.state.debuffs = t.state.debuffs.filter((a) => a?.k !== 'cc'); t.state.boundUntil = 0; if (t.state.preModel) { t.model = t.state.preModel; delete t.state.preModel; } } // a blow wakes the sheep
  t.state.hitAt = ctx.now(); if (!t.state.engaged) t.state.engaged = me.id; if (t.tags?.includes?.('training-dummy') && me.state.quests?.['straw-and-steel'] === 'active') me.state.qc = { ...(me.state.qc ?? {}), dummyHits: ((me.state.qc?.dummyHits) | 0) + 1 }; /* Bruni's quest */
  const b = t.bounds, at = b ? { x: b.center.x, y: b.min.y + b.size.y * 0.8, z: b.center.z } : { ...here(t), y: here(t).y + 1.2 };
  ctx.emit('uiEvent', { name: 'fct', payload: { t: t.id, v: dmg, s: school, c: !!crit, h: +((b ? b.max.y : here(t).y + 1.9) - here(t).y + 0.5).toFixed(2) } }, { audience: { nearby: at, radius: FCT.radius } }); // classic-WoW combat text (ui/hud/fct.js)
  { const mat = t.tags?.includes?.('training-dummy') ? KSFX.soft : school === 'phys' ? (crit ? KSFX.plate : KSFX.flesh) : null; // the body under the blow: straw thuds, flesh punches, a crit rings plate
    if (mat) ctx.emit('playSound', { clip: pick(mat, ctx.random()), position: at, volume: big ? 0.75 : 0.55, pitch: 0.92 + ctx.random() * 0.16, maxDistance: 35 }); }
  ctx.emit('flash', { target: t.id, color, duration: 0.15 });
  ctx.emit('squash', { target: t.id, axis: 'y', intensity: big ? 0.18 : 0.12, duration: 0.18 });
  return killed;
}
// creator 2026-10-10: every lasting thing a spell leaves on an enemy rides its plate as that spell's icon with a draining timer (plates-hud.js reads t.state.debuffs)
function debuff(ctx, t, sp, ms, now = ctx.now(), kind = '') {
  if (!t || !sp || !(ms > 0) || !t.tags?.includes?.('enemy') && !t.tags?.includes?.('training-dummy')) return;
  const id = sp.id + (kind ? ':' + kind : ''), cell = sp.cell ?? -1;
  const keep = (Array.isArray(t.state.debuffs) ? t.state.debuffs : []).filter((a) => a && a.until > now && a.id !== id);
  const prev = (t.state.debuffs ?? []).find?.((a) => a && a.id === id && a.until > now);
  keep.push({ id, n: sp.name, cls: sp.cls, cell, col: sp.color, k: kind, at: now, until: now + ms, ms, x: prev && sp.stack ? Math.min(sp.stack, (prev.x ?? 1) + 1) : 1 });
  t.state.debuffs = keep.slice(-6);
  if (!prev) ccText(ctx, t, ccLabel(sp, kind)); // a fresh effect says its name over the target, like a hit's number
}
// CC / effect combat text (creator 2026-10-10): the state a spell leaves, in classic-WoW words and the effect's own colour
const CC_TEXT = { slow: ['Slowed', '#80C0FF'], root: ['Rooted', '#9be07a'], frozen: ['Frozen', '#bfeaff'], stun: ['Stunned', '#FFD100'], cc: ['Polymorphed', '#FF80FF'],
  bleed: ['Bleeding', '#ff4a4a'], burn: ['Burning', '#FF6022'], dot: ['Afflicted', '#B070B0'], shock: ['Shocked', '#fff27a'], broken: ['Polymorph broken', '#c8c8c8'] };
function ccLabel(sp, kind) {
  const sc = String(sp.school ?? sp.el ?? '').toLowerCase();
  if (kind === 'root') return /frost|ice|water/.test(sc) || /frost|ice/i.test(sp.name) ? 'frozen' : 'root';
  if (kind === 'dot') return /fire|flame/.test(sc) || /fire|immolat|pyro|flame/i.test(sp.name) ? 'burn' : 'dot';
  if (kind === 'cc') return 'cc';
  return CC_TEXT[kind] ? kind : null;
}
function ccText(ctx, t, key) {
  const row = key && CC_TEXT[key]; if (!row || !t) return;
  const b = t.bounds, top = b ? b.max.y : here(t).y + 1.9, at = { ...here(t), y: top };
  ctx.emit('uiEvent', { name: 'fct', payload: { t: t.id, v: row[0], s: 'status', col: row[1], h: +(top - here(t).y + 0.5).toFixed(2) } }, { audience: { nearby: at, radius: FCT.radius } });
}
// an aura riding a body (ward, evocation, freeze, burn): a second hand removes it when its time is up, so one that slips off its
// parent never stays glowing on the grass (creator 2026-10-10: an evocation sigil stuck by the dummy)
function auraSpawn(ctx, spec) {
  const id = ctx.spawn(spec);
  if (id && spec.lifetime > 0) ctx.after(spec.lifetime + 0.4, 'classFxEnd', { id });
  return id;
}
export function classFxEnd(ctx, { id } = {}) { try { if (id && ctx.getObject(id)) ctx.destroy(id); } catch (e) {} }
function chill(ctx, t, now, ms = 1200) {
  t.state.boundUntil = Math.max(t.state.boundUntil ?? 0, now + ms);
  auraSpawn(ctx, { parent: t.id, feetPosition: { x: 0, y: 0.05, z: 0 }, audience: 'near', lifetime: ms / 1000, fx: { script: AURA.freeze, params: rgb('#8fd8ff') } });
}
// the spell's own gem level: the damage it deals is its xp; GEM_XP x level to the next; a level-up is a chime and a gold line
function gemXp(ctx, me, sp, dmg) {
  const s = me.state, g = gemOf(s, sp.id); if (g.lv >= GEM_MAX) return;
  let lv = g.lv, xp = g.xp + dmg, up = false;
  while (lv < GEM_MAX && xp >= GEM_XP * lv) { xp -= GEM_XP * lv; lv++; up = true; }
  s.cgem = { ...(s.cgem ?? {}), [sp.id]: { lv, xp } };
  if (up) { sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-level-up-golden-fanfare.mp3', here(me), 0.5); msg(ctx, me, `${sp.name} reaches gem level ${lv}.`);
    ctx.emit('fx', { position: { ...here(me), y: here(me).y + 0.1 }, script: AOE, params: { ...rgb('#ffd100'), rad: 1 } }); }
}
// the catalog's writes: link a support gem, fill a free bar slot, clear it
function gemAct(ctx, me, d) {
  const s = me.state, sp = spellOfClass(d.id);
  if (d.act === 'socket' && sp && Number.isInteger(d.i) && d.i >= 0 && d.i < 3) {
    const g = d.gem ?? null; if (g && (!GEMS[g] || !gemFits(g, sp))) return;
    const cur = [...(s.csock?.[sp.id] ?? [null, null, null])]; if (g && cur.includes(g) && cur[d.i] !== g) return msg(ctx, me, 'That support is already linked.');
    cur[d.i] = g; s.csock = { ...(s.csock ?? {}), [sp.id]: cur };
    sfx(ctx, g ? '/cdn/moodboard-painterly-fantasy/sfx-gem-socket-click-chime.mp3' : SOUNDS.fizzle, here(me), 0.5);
  } else if (d.act === 'bar' && sp && isClassMode(sp.cls)) {
    const own = { ...(s.cbar?.[sp.cls] ?? {}) }, kit = kitBar(sp.cls);
    if (kit.includes(sp.id) && !Object.values(own).includes(sp.id)) return msg(ctx, me, `${sp.name} is already on your bar.`);
    let slot = Number.isInteger(d.slot) && FREE_SLOTS.includes(d.slot) ? d.slot : FREE_SLOTS.find((i) => !own[i] && !kit[i]) ?? FREE_SLOTS.find((i) => !own[i]); // the kit's interrupt/defensive keep 9 and 0
    if (slot == null) slot = FREE_SLOTS[0];
    own[slot] = sp.id; s.cbar = { ...(s.cbar ?? {}), [sp.cls]: own };
    msg(ctx, me, `${sp.name} goes on your bar.`);
  } else if (d.act === 'unbar' && isClassMode(d.mode) && FREE_SLOTS.includes(d.slot)) {
    const own = { ...(s.cbar?.[d.mode] ?? {}) }; delete own[d.slot]; s.cbar = { ...(s.cbar ?? {}), [d.mode]: own };
  }
}
function applyStatus(ctx, me, t, sp, dmg, now) {
  const col = rgb(sp.color);
  if (sp.status === 'freeze') {
    const rms = sp.rootMs ?? STATUS.freeze.rootMs; t.state.boundUntil = Math.max(t.state.boundUntil ?? 0, now + rms); debuff(ctx, t, sp, rms, now, 'root');
    auraSpawn(ctx, { parent: t.id, feetPosition: { x: 0, y: 0.05, z: 0 }, audience: 'near', lifetime: rms / 1000, fx: { script: AURA.freeze, params: col } });
    ctx.emit('damageNumber', { position: { ...here(t), y: here(t).y + 2.1 }, text: 'ROOTED', color: sp.color, size: 0.8, lifetime: 1 });
  } else {
    debuff(ctx, t, sp, STATUS.burn.ticks * STATUS.burn.every * 1000 + 300, now, 'dot');
    auraSpawn(ctx, { parent: t.id, feetPosition: { x: 0, y: 0.3, z: 0 }, audience: 'near', lifetime: STATUS.burn.ticks * STATUS.burn.every + 0.3, fx: { script: AURA.burn, params: col } });
    ctx.after(STATUS.burn.every, 'classBurn', { target: t.id, dmg: Math.max(1, Math.round(dmg * STATUS.burn.frac)), left: STATUS.burn.ticks, color: sp.color, skill: sp.skill });
  }
}
export function classBurn(ctx, { target, dmg, left, color, skill }) {
  const t = ctx.getObject(target); if (!t || t.state?.down || left <= 0) return;
  const k = hit(ctx, ctx.self, t, dmg, false, color);
  tpXp(ctx, ctx.self, dmg * XP_PER_DMG_TP + (k ? XP_KILL_TP : 0));
  if (left > 1) ctx.after(STATUS.burn.every, 'classBurn', { target, dmg, left: left - 1, color, skill });
}

export const ears = { tpXp: (ctx, p) => { if (ctx.self.isLocal !== false) tpXp(ctx, ctx.self, +p?.add || 0); } }; // combat-player's auto-attack swings in a class mode
// ---- 3rd person progression: one character level, talent points to spend ----
function tpXp(ctx, me, add) {
  if (!(add > 0)) return; const s = me.state, was = tpLevelOf(s.tp?.xp ?? 0).lv;
  s.tp = { ...(s.tp ?? {}), xp: Math.round((s.tp?.xp ?? 0) + add) };
  const now = tpLevelOf(s.tp.xp).lv; if (now <= was) return;
  const p = here(me), aud = { audience: { player: me.id } };
  sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-level-up-golden-fanfare.mp3', p, 0.7);
  ctx.emit('fx', { position: { ...p, y: p.y + 0.1 }, script: AOE, params: { ...rgb('#ffd100'), rad: 1.6 } });
  ctx.emit('damageNumber', { position: { ...p, y: p.y + 2.4 }, text: `LEVEL ${now}!`, color: '#ffd100', size: 1.1, lifetime: 1.8 });
  ctx.emit('uiEvent', { name: 'tpLevel', payload: { lv: now } }, aud);
  msg(ctx, me, `You reach level ${now}. A talent point waits (N).`);
}
function talentAct(ctx, me, d) {
  const s = me.state;
  if (d.reset) { s.tp = withPts(s, {}); sfx(ctx, SOUNDS.mode, here(me), 0.5); return msg(ctx, me, 'Your talents are unlearned. The points wait to be spent again.'); }
  const t = TALENTS.find((x) => x.id === d.id); if (!t) return;
  if (!canLearn(s, t.id)) { sfx(ctx, pick(KSFX.error, ctx.random()), here(me), 0.3); return; }
  { const own = ownPts(s); s.tp = withPts(s, { ...own, [t.id]: (own[t.id] | 0) + 1 }); }
  sfx(ctx, '/cdn/moodboard-painterly-fantasy/sfx-gem-socket-click-chime.mp3', here(me), 0.55);
}
// the exact-frame hooks: a wind-up's end and a queued press, scheduled to the millisecond (update() still sweeps as a backstop)
export function classCastEnd(ctx, { start } = {}) {
  const me = ctx.self; if (me.isLocal === false) return; const s = me.state;
  if (!s.ccast || s.ccast.start !== start) return;
  const sp = moddedOf(spellOfClass(s.ccast.id), s); if (sp) release(ctx, me, sp, s.ccast.target); else s.ccast = null;
  fireQueue(ctx, me);
}
export function classQueue(ctx) { const me = ctx.self; if (me.isLocal === false) return; fireQueue(ctx, me); }
function fireQueue(ctx, me) {
  const s = me.state, now = ctx.now(); if (!s.cq) return;
  if (now - s.cq.at > QUEUE_MS + 1500) { s.cq = null; return; }
  const sp = moddedOf(spellOfClass(s.cq.id), s), ready = !s.ccast && (s.cgcd ?? 0) <= now + 5 && (s.ccd?.[s.cq.id] ?? 0) <= now + 5;
  if (sp && ready) { s.cgcd = Math.min(s.cgcd ?? 0, now); press(ctx, me, sp, null); }
}
// ---- the clock: finish wind-ups, fire the queued press ----
export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false) return;
  const s = me.state, now = ctx.now();
  if (!isClassMode(s.combatMode)) { if (s.ccast) cancel(ctx, me); ctx.sleep(2); return; }
  if (s.ccast && now >= s.ccast.end) { const sp = moddedOf(spellOfClass(s.ccast.id), s); if (sp) release(ctx, me, sp, s.ccast.target); else s.ccast = null; }
  if (s.cq) {
    if (now - s.cq.at > QUEUE_MS + 1500) s.cq = null;
    else { const sp = moddedOf(spellOfClass(s.cq.id), s), ready = !s.ccast && (s.cgcd ?? 0) <= now && (s.ccd?.[s.cq.id] ?? 0) <= now; if (sp && ready) press(ctx, me, sp, null); }
  }
  if (!s.ccast && !s.cq) ctx.sleep(1);
}
