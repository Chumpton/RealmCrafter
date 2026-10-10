import { nextCorner } from "./lib/chase-path.js";
// COMBAT (MMO prompt 3/6): the player's fight. Owns player.state.hp / fight / cbWeapon / cbStyle / cbSpell.
// Runs on the 0.6 s tick. Left-click an enemy (tag "enemy") to fight it; each swing is judged HERE, on the striker's
// machine, and stepped into the target's state (target.state.hp -= d). XP goes to skills-player.js (the one writer of skills).
import { raycast } from "builtin/physics";
import { animate } from "builtin/tween";
import { CB, SPELLS, DUMMY } from "./lib/data/combat.js";
import { levelOf } from "./lib/skills-core.js";
import { overhealCap } from "./lib/gather-core.js";
import { quiverArrow } from "./lib/fletch-core.js";
import { MONSTERS, MON } from "./lib/data/monsters.js";
import { levelHue, levelColor } from "./lib/menu-core.js";
import { spellFireball, spellPyroblast, spellFrostbolt, spellArcaneMissile, spellWrath, spellCurseOfAgony } from "../templates/wow-spells.js";
// the OSRS book keeps its rules; its bolts wear the creator's WoW spell meshes (templates/wow-spells.js, 2026-10-07)
const BOLT_MESH = { fire: spellFireball, water: spellFrostbolt, wind: spellArcaneMissile, earth: spellWrath };
// the meshes draw as flat square cards (2026-10-07 look): off until they blend
const boltMesh = (sp) => { if (!sp || !sp.wowMesh) return null; const m = sp.kind === "curse" ? spellCurseOfAgony : sp.elem === "fire" && (sp.tier === "wave" || sp.tier === "surge") ? spellPyroblast : BOLT_MESH[sp.elem]; return m ? { model: m.model, scale: m.scale[0] * 0.6 } : null; };
import { cbLevelOf } from "./lib/combat-hud.js";
const owns = (s, id) => s.equip?.weapon === id || (Array.isArray(s.inv) && s.inv.some((x) => x?.id === id));
// a bow is wielded only while it is in your pack and your Ranged level meets it; the reason when not
export function bowBlock(s, w, L) { if (!w.bow) return null; if (!owns(s, w.id)) return `You don't have a ${w.name.toLowerCase()}.`; if (L.ranged < w.wield) return `You need a Ranged level of ${w.wield} to wield the ${w.name.toLowerCase()}.`; return null; }
import { gearOf } from "./lib/equip-core.js";
import { splatSvg } from "./lib/hitsplat.js";
import { weaponOf, styleOf, spellOf, bestSpell, swingStats, swingXp, attackTicks, rangeOf } from "./lib/combat-core.js";
import { mods as prayMods } from "./lib/prayer-core.js";
import { castAnim } from "./lib/cast-anim.js";
import { missing, spend } from "./lib/magic-core.js";
import { spellById, maxHitFor } from "./lib/data/spells.js";
import { foeOn } from './lib/single-combat.js';
import { tpOn, tpMaxHp, XP_PER_DMG_TP } from './lib/data/talents.js';
import { selectCue, lineColor } from './lib/stance.js'; // target-select cue by stance

export const updateSchedule = { every: { seconds: 0.6 } };
const SK_IDS = ["attack", "strength", "defence", "hitpoints", "ranged", "magic"];
export const levels = (s) => { const L = Object.fromEntries(SK_IDS.map((k) => [k, levelOf(k === "hitpoints" ? (s.skills?.hitpoints ?? CB.hpStartTenths) : (s.skills?.[k] | 0))])); if (tpOn(s)) L.hitpoints = tpMaxHp(s); return L; }; // 3rd person: health comes from the character level + talents
const giveXp = (ctx, me, xp, dmg) => { if (tpOn(me.state)) { if (dmg > 0) ctx.emit('tpXp', { add: dmg * XP_PER_DMG_TP }, { to: me.id }); return; } if (xp && Object.keys(xp).length) ctx.emit("skillXp", { multi: xp }, { to: me.id }); };
const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function msg(ctx, me, text) { ctx.emit("skillMsg", { text }, { to: me.id }); }

function ensure(me) {
  const s = me.state, L = levels(s);
  if (typeof s.hp !== "number") s.hp = L.hitpoints;
  if (!s.cbWeapon) s.cbWeapon = "sword";
  if (!s.cbStyle) s.cbStyle = "accurate";
  if (!s.cbSpell) s.cbSpell = SPELLS[0].id;
  return L;
}
export function onSpawn(ctx) { if (!CB.on || ctx.self.isLocal === false) return; ensure(ctx.self); if (ctx.self.state.fight) ctx.self.state.fight = null; }

function pickEnemy(ctx, input) {
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== "number" || typeof a.pointerOriginX !== "number") return null;
  let eye = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }; const me = here(ctx.self); if (Math.hypot(eye.x - me.x, eye.z - me.z) > 45) eye = { x: me.x, y: me.y + 1.6, z: me.z }; // first person: the eye on the body; third person: the orbit camera up to 16 m back; a stray origin falls back to the body
  const r = raycast(ctx, eye, { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 }, { distance: 46, ignoreEntities: [ctx.self.id] });
  if (!r?.id) return null;
  let o = ctx.getObject(r.id);
  for (let i = 0; o && i < 3; i++) { if (o.tags?.includes?.("enemy")) return o; o = o.parent?.id ? ctx.getObject(o.parent.id) : null; }
  return null;
}
// creator 2026-10-10: "allow to select / hover over any NPC": a click on a townsfolk, merchant or quest giver selects it (ring, glow, frame), never a fight
export const NPC_TAGS = ["pet", "wynx", "gryphon", "helper", "player", "npc", "folk", "villager", "merchant", "vendor", "shopkeeper", "questgiver", "interactable", "dock-folk", "bc-town-folk", "crk-folk", "meadow-folk", "isle-folk", "bc-works-folk", "fall-folk"];
function pickNpc(ctx, input) {
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== "number" || typeof a.pointerOriginX !== "number") return null;
  let eye = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }; const me = here(ctx.self); if (Math.hypot(eye.x - me.x, eye.z - me.z) > 45) eye = { x: me.x, y: me.y + 1.6, z: me.z };
  const r = raycast(ctx, eye, { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 }, { distance: 46, ignoreEntities: [ctx.self.id], hits: "both" }); // creator 2026-10-10: models with no collider (zone creatures) pick too
  let o = r?.id ? ctx.getObject(r.id) : null;
  for (let i = 0; o && i < 4; i++) { const t = o.tags ?? []; if (!t.includes("nameplate") && NPC_TAGS.some((k) => t.includes(k))) return o; o = o.parent?.id ? ctx.getObject(o.parent.id) : null; }
  return null;
}

export function onInput(ctx, input) {
  if (!CB.on) return;
  const me = ctx.self, s = me.state, pr = input.pressed ?? {}, d = input.actionData ?? {};
  ensure(me);
  if (s.fight && !s.fight.approach && Math.hypot(input.axes?.moveX ?? 0, input.axes?.moveZ ?? 0) > 0.1) resetSwing(ctx, me); // any movement input restarts the weapon timer (creator); nothing else changes
  if (pr.cbWeapon) { const w = weaponOf(d.cbWeapon?.id), why = bowBlock(s, w, levels(s)); if (why) return msg(ctx, me, why); s.cbWeapon = w.id; s.cbStyle = styleOf(w, s.cbStyle).id; if (s.fight) s.fight = { ...s.fight, cd: Math.max(s.fight.cd | 0, 1) }; }
  if (pr.cbAutoRet) { s.autoRet = s.autoRet === false; ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-ui-target-select-tick.mp3', volume: 0.4 }, { audience: { player: me.id } }); } // OSRS Auto Retaliate (creator Oct 5): unset = on
  if (pr.cbStyle) s.cbStyle = styleOf(weaponOf(s.cbWeapon), d.cbStyle?.id).id;
  if (pr.cbSpell) { const sp = spellOf(d.cbSpell?.id); if (sp.level <= levels(s).magic) s.cbSpell = sp.id; else msg(ctx, me, `You need a Magic level of ${sp.level} to cast ${sp.name}.`); }
  if (pr.cbTab) s.skTab = d.cbTab?.tab === 'combat' ? 'combat' : 'skills';
  if (pr.cbHurt && me.isEditor) { s.hp = Math.max(1, s.hp - 5); burst(ctx, me, 5); }
  if (pr.cbHeal && me.isEditor) { const L = levels(s); s.hp = L.hitpoints; }
  // WoW targeting (creator 2026-10-04): a left click on an enemy locks it as your target (frame, circle, spells aim at it);
  // a second click on the same target, F, or the bar's Attack starts the fight
  const lePh = s.le?.phase; if ((pr.use && (lePh === 'autofill' || lePh === 'tag' || lePh === 'scanning' || s.bugTag)) || s.bugOpen != null || s.bugDraft) return; // the Light Editor's ring and the bug tags own the click and the digits // the Light Editor owns the left click while its ring is out
  if (pr.use) { const e = pickEnemy(ctx, input); if (e) { if (s.lock === e.id || s.fight?.target === e.id) engage(ctx, me, e); else selectTarget(ctx, me, e); } else { const n = pickNpc(ctx, input); if (n && s.lock !== n.id) selectTarget(ctx, me, n); else if (!n) ctx.session.offClickAt = ctx.now(); } }
  // creator 2026-10-10: a click that lands on nothing lets the target go; only a quick click (a held drag is the camera turning)
  if (input.released?.use && ctx.session.offClickAt && ctx.now() - ctx.session.offClickAt < 280 && (s.lock || s.fight) && !(s.fight || (s.cmb && ctx.getObject(s.lock)?.tags?.includes?.("enemy")))) { /* creator 2026-10-10: in combat the enemy stays selected; an off-click lets go only out of combat */ if (s.lock) ctx.emit("highlightClear", { target: s.lock }, { audience: { player: me.id } }); s.fight = null; s.walkTo = null; s.lock = null; }
  if (input.released?.use) ctx.session.offClickAt = 0;
  if (pr.cbAttack) engage(ctx, me, pickEnemy(ctx, input) ?? (s.lock && !s.fight ? ctx.getObject(s.lock) : null) ?? nearestEnemy(ctx, me, input));
  // the digit keys are the world's pluck1..pluck10 binds (the page never hears them under pointer lock): read the bar slot here
  if (pr.cbCycle) cycle(ctx, me);
  if (pr.cbStop && s.fight) { s.fight = null; s.lock = null; msg(ctx, me, "You stop fighting."); }
  else if (pr.cbStop && s.lock) { ctx.emit("highlightClear", { target: s.lock }, { audience: { player: me.id } }); s.lock = null; }
}
const hl = (mine, lvl) => `oklch(0.82 0.17 ${25 + levelHue(mine, lvl)})`;
// what a swing rolls against: the target's (drained) defence and its bonuses
const enemyOf = (t) => ({ defence: drained(t.state.defence ?? 1, t.state.drain?.defence), magic: t.state.magic ?? 1, defBonus: t.state.defBonus ?? 0, rangedDefBonus: t.state.rangedDefBonus ?? 0, magicDefBonus: t.state.magicDefBonus ?? 0 });
function infoOf(o, mine) { const m = MONSTERS[o.state?.kind], lvl = m?.level ?? 1; return { id: o.id, name: m?.name ?? "Training dummy", lvl, col: levelColor(mine, lvl) }; }
// --- lock-on helpers: F = aimed enemy or the nearest one in front, Q = next enemy in range, V = stand down
function foes(ctx, me) {
  const p = here(me); return (ctx.query?.({ tags: ["enemy"], center: p, radius: CB.leash }) ?? []).filter((o) => !o.state?.down && o.visible !== false).map((o) => ({ o, d: flat(p, here(o)) })).sort((a, b) => a.d - b.d);
}
function nearestEnemy(ctx, me, input) {
  const a = input?.axes ?? {}, fx = a.pointerDirX, fz = a.pointerDirZ, p = here(me);
  for (const { o } of foes(ctx, me)) { const q = here(o), dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1; if (typeof fx !== "number" || (dx * fx + dz * fz) / l / (Math.hypot(fx, fz) || 1) > 0.5) return o; }
  return null;
}
function cycle(ctx, me) {
  const list = foes(ctx, me).map((x) => x.o); if (!list.length) return msg(ctx, me, "There is nothing to fight nearby.");
  const cur = list.findIndex((o) => o.id === (me.state.fight?.target ?? me.state.lock));
  engage(ctx, me, list[(cur + 1) % list.length]);
}
// a first left click: target it without swinging (stops auto-attack on the old one)
function selectTarget(ctx, me, e) {
  if (e.state?.down) return;
  const aud = { audience: { player: me.id } };
  if (me.state.lock && me.state.lock !== e.id) ctx.emit("highlightClear", { target: me.state.lock }, aud);
  const prev = me.state.lock;
  me.state.fight = null; me.state.cmb = false; me.state.lock = e.id;
  ctx.emit("highlightSet", { target: e.id, color: lineColor(e, 0.45), style: "outline", duration: 3600000 }, aud);
  selectCue(ctx, me, prev, e); // blade snap / leather tap, once per new lock
}
// a left-click on an enemy, or "Attack" in the right-click menu (context-menu.js -> cbEngage)
function engage(ctx, me, e) {
  if (!e || !(e.tags ?? []).includes("enemy")) return; // a selected friend is never a fight
  if (e.state?.down) return msg(ctx, me, "It's already down.");
  if (me.state.dead) return;
  const by = e.state?.engaged; // single combat: a monster fights one player at a time
  if (by && by !== me.id && ctx.place.players.some((q) => q.id === by && q.state?.fight?.target === e.id)) return msg(ctx, me, "Someone else is fighting that.");
  if (me.state.fight?.target !== e.id && foeOn(ctx, me, e.id)) return msg(ctx, me, "I'm already under attack.");
  const fresh = me.state.fight?.target !== e.id;
  if (fresh && me.state.lock && me.state.lock !== e.id) ctx.emit("highlightClear", { target: me.state.lock }, { audience: { player: me.id } });
  if (!fresh) return; // already fighting it: a second click must not reset your swing timer
  const w0 = weaponOf(me.state.cbWeapon), melee = w0.kind === "melee", now0 = ctx.now();
  selectCue(ctx, me, me.state.lock, e);
  me.state.fight = { target: e.id, cd: 0, approach: melee, t0: now0, bestD: 999, bestT: now0 }; me.state.lock = e.id; me.state.cmb = true;
  const aud = { audience: { player: me.id } }, info = infoOf(e, cbLevelOf(me.state)), p = here(me), q = here(e);
  ctx.emit("highlightSet", { target: e.id, color: lineColor(e, 0.55), style: "outline", duration: 3600000 }, aud);
  ctx.emit("uiEvent", { name: "combatStart", payload: { name: info.name, level: info.lvl } }, aud);
  ctx.emit("screenFlash", { color: "oklch(0.7 0.2 40)", duration: 0.18, intensity: 0.22 }, aud);
  ctx.emit("cameraPunch", { direction: { x: q.x - p.x, y: 0, z: q.z - p.z }, intensity: 0.3 }, aud);
  ctx.emit("shockwave", { position: { x: q.x, y: q.y + 0.1, z: q.z }, speed: 5, thickness: 0.35, intensity: 0.35, scale: 1.1 }, aud);
  if (melee) approach(ctx);
}
// --- melee reach (creator 2026-10-04): you cannot hit from ten feet away. Starting a fight walks you to the enemy while it walks to you (monster.js),
// and when you are both in reach you swing first (you started it); the enemy waits out a full swing. Fast loop: 10x a second until contact.
const CHASE = 10, lastContact = new Map(); // the enemy keeps after you; with nobody in reach for 10 s the fight lapses
const tickAt = new Map(); // player id -> ms of the last scheduled combat tick (the swing timer stays on the tick grid)
export function approach(ctx) {
  const me = ctx.self, s = me.state, f = s.fight; if (!f?.approach || me.isLocal === false) return;
  const t = ctx.getObject(f.target), now = ctx.now();
  if (!t || t.state?.down || s.dead) { s.fight = null; s.walkTo = null; return; }
  // (creator 2026-10-04) a movement key no longer cancels the walk-in: your keys steer alongside the path (player.js assist), the route keeps going
  const w = weaponOf(s.cbWeapon), st = styleOf(w, s.cbStyle), p = here(me), tp = here(t), dist = flat(p, tp);
  if (w.kind !== "melee") { s.fight = { ...f, approach: false, walking: false }; s.walkTo = null; return; }
  const stop = Math.min(rangeOf(w, st) - 0.1, (MON.stands[t.state?.kind] ?? 2.0) + 0.3);
  if (dist <= stop + 0.05) { s.walkTo = null; if (f.re) { s.fight = { ...f, approach: false, walking: false }; return; } return contact(ctx, me, t, f); } // contact is made once per fight: walking back in (re) only resumes it
  const prog = dist < (f.bestD ?? 999) - 0.2;
  if (now - (f.t0 ?? now) > 14000 || now - (f.bestT ?? now) > 3500) { s.fight = null; s.walkTo = null; s.lock = null; return msg(ctx, me, "I can't reach that."); }
  const k = (dist - stop) / dist, goal = { x: p.x + (tp.x - p.x) * k, y: tp.y, z: p.z + (tp.z - p.z) * k };
  const c = nextCorner(ctx, "pl:" + me.id, p, goal, { radius: 0.4 }); // a real walkable route (no dash): your own walk or run pace, re-asked as it moves
  s.walkTo = { x: c.x, z: c.z, until: now + 1500, assist: true, fight: true };
  s.fight = { ...f, walking: true, bestD: prog ? dist : f.bestD, bestT: prog ? now : f.bestT };
  ctx.after(0.1, "approach");
}
function contact(ctx, me, t, f) { // (creator Oct 5) you started it, so you swing first the moment you are in reach; it waits out a full swing
  const d = MONSTERS[t.state?.kind]; me.state.fight = { target: f.target, cd: 0 };
  ctx.emit("uiEvent", { name: "contact", payload: { first: "you" } }, { audience: { player: me.id } });
  if (d) t.state.cd = d.speed; swingNow(ctx, me);
}
function swingNow(ctx, me) { // an off-tick swing right now (the clock keeps the next one a true weapon period away)
  manual = true; try { update(ctx); } finally { manual = false; }
}
// the exact moment the weapon is ready again: take the swing if you are still in a fight and in reach
const lastReset = new Map(), resetTimer = new Map();
function resetSwing(ctx, me) { // the weapon timer starts again from empty (throttled to ~8 a second while a key is held)
  const now = ctx.now(), f = me.state.fight, w = weaponOf(me.state.cbWeapon), st = styleOf(w, me.state.cbStyle); if (!f || now - (lastReset.get(me.id) ?? 0) < 120) return;
  lastReset.set(me.id, now); const ticks = attackTicks(w, st), per = ticks * 600;
  me.state.fight = { ...f, cd: ticks, nextAt: now + per }; const old = resetTimer.get(me.id); if (old != null) ctx.cancel(old); resetTimer.set(me.id, ctx.after(per / 1000, "swingDue")); // one pending wake per held key, not eight a second
  ctx.emit("uiEvent", { name: "swing", payload: { ms: per, ticks, w: w.name } }, { audience: { player: me.id } });
}
export function swingDue(ctx) { if (ctx.self.isLocal === false || !ctx.self.state.fight) return; manual = true; try { update(ctx); } finally { manual = false; } }
let manual = false;

// a curse or bind leaves a % drain on the monster's stat (read by monster.js and the enemy line below); a stat already drained cannot be drained again
const drained = (lv, pct) => Math.max(1, Math.floor(lv * (1 - (pct || 0))));
// ONE SPELLBOOK CAST (scripts/spellbook-player.js sends cbCastAt): an attack spell or a curse/bind on a target, judged with the autocast swing's own formulas.
// Every attack spell and curse takes 5 ticks (s36); the runes go even on a splash; the projectile lands in land() / curseLand().
function castAt(ctx, me, p) {
  const s = me.state, sp = spellById(p?.spell), t = ctx.getObject(p?.target), now = ctx.now();
  if (!sp || sp.den !== "yes" || (sp.kind !== "attack" && sp.kind !== "curse") || !t || t.state?.down || s.dead) return;
  const L = levels(s), w = weaponOf(s.cbWeapon), pos = here(me), tp = here(t), dist = flat(pos, tp);
  if (L.magic < sp.level) return msg(ctx, me, `You need a Magic level of ${sp.level} to cast ${sp.name}.`);
  if (now < (s.castAt ?? 0)) return;
  if (dist > sp.range + 0.6) return msg(ctx, me, "Your target is too far away.");
  if (sp.kind === "curse" && sp.effect?.drain && t.state.drain?.[sp.effect.drain[0]]) return msg(ctx, me, "Your opponent is already weakened."); // curses do not stack, and the runes stay in your pack
  if (missing(sp, s.supplies, w.id).length) { ctx.emit("playSound", { clip: CB.sounds.nomana, position: pos, volume: 0.6 }); return msg(ctx, me, "You do not have enough runes to cast this spell."); }
  s.supplies = spend(s.supplies, sp, w.id); s.castAt = now + 5 * 600;
  const enemy = enemyOf(t), mods = prayMods(s.prayer);
  const S = swingStats(L, { kind: "magic" }, { boost: {} }, enemy, "wind-strike", undefined, gearOf(s.equip, w.id), mods); // accuracy never depends on which spell (s36)
  const hit = ctx.random() < S.chance, max = Math.floor(maxHitFor(sp, L.magic) * (1 + (mods.magDmg || 0)));
  const dmg = sp.kind === "attack" && hit ? Math.max(1, Math.floor(ctx.random() * (max + 1))) : 0;
  const xp = sp.kind === "attack" ? swingXp({ kind: "magic" }, null, dmg, sp) : { magic: Math.round(sp.xp * 10) };
  selectCue(ctx, me, s.lock, t);   s.lock = t.id; s.cmb = true; t.state.engaged = t.state.engaged ?? me.id;
  castAnim(me, 1.6);
  ctx.emit("playSound", { clip: CB.sounds.spell, position: pos, volume: 0.6, pitch: 0.95 + ctx.random() * 0.1 });
  const from = { x: pos.x, y: pos.y + 1.4, z: pos.z }, at = { x: tp.x, y: tp.y + 1.2, z: tp.z }, fly = Math.min(0.9, 0.15 + dist / 22);
  const mesh = boltMesh(sp);
  const id = ctx.spawn(mesh ? { feetPosition: from, lifetime: fly + 0.1, audience: "near", pivot: "center", rotation: { lookAt: at, include: ["yaw", "pitch"] }, model: mesh.model, scale: mesh.scale, castShadow: false }
    : { feetPosition: from, lifetime: fly + 0.1, audience: "near", pivot: "center", primitive: { kind: "sphere", radius: 0.14 }, material: { color: sp.color, emissive: sp.color, emissiveIntensity: 3 } });
  animate(ctx, ctx.getObject(id), { "feetPosition.x": at.x, "feetPosition.y": at.y, "feetPosition.z": at.z }, { duration: fly, easing: "linear" });
  if (sp.kind === "attack") ctx.after(fly, "land", { target: t.id, dmg, hit, at, xp, col: sp.color, max });
  else ctx.after(fly, "curseLand", { target: t.id, spell: sp.id, hit, at, xp });
}
export function curseLand(ctx, { target, spell, hit, at, xp }) {
  const me = ctx.self, t = ctx.getObject(target), sp = spellById(spell); if (!t || !sp || t.state?.down) return;
  const now = ctx.now(), e = sp.effect ?? {}; let text = "Resist", col = "#9fb8ff";
  if (hit && e.drain) { const [stat, pct] = e.drain; if (t.state.drain?.[stat]) { text = "Already weakened"; } else { t.state.drain = { ...(t.state.drain ?? {}), [stat]: pct }; text = `${stat} -${Math.round(pct * 100)}%`; col = sp.color; } }
  else if (hit && e.bind) { // Snare hits up to 3, Entangle up to 5: the target and the nearest others within 2.5 m
    const tp = here(t), near = (e.bind[1] > 1 ? (ctx.query({ tags: ["enemy"], center: tp, radius: 2.5 }) ?? []) : []).filter((o) => o.id !== t.id && !o.state?.down).slice(0, e.bind[1] - 1);
    for (const o of [t, ...near.map((o) => ctx.getObject(o.id)).filter(Boolean)]) { o.state.boundUntil = now + e.bind[0] * 600; o.state.hitAt = now; }
    text = "ROOTED"; col = sp.color;
  }
  t.state.hitAt = now; if (!t.state.engaged) t.state.engaged = me.id;
  ctx.emit("damageNumber", { position: { x: at.x, y: at.y + 0.3, z: at.z }, text, color: col, size: 0.95, lifetime: 1.2 });
  giveXp(ctx, me, xp, dmg);
}
export const ears = {
  cbCastAt: (ctx, p) => { if (ctx.self.isLocal !== false) castAt(ctx, ctx.self, p); },
  cbEngage: (ctx, p) => { if (ctx.self.isLocal !== false && p?.target) engage(ctx, ctx.self, ctx.getObject(p.target)); },
  heal: (ctx, p) => {
    const me = ctx.self; if (me.isLocal === false) return;
    const L = ensure(me), before = me.state.hp, amt = Math.max(0, p?.amount | 0);
    const cap = p?.over ? Math.max(before, overhealCap(L.hitpoints)) : Math.max(before, L.hitpoints);
    me.state.hp = Math.min(cap, before + amt);
    if (p?.food) msg(ctx, me, before >= L.hitpoints ? `You eat the ${p.food.toLowerCase()}. It's tasty.` : `You eat the ${p.food.toLowerCase()}. It heals some health.`);
    if (me.state.fight) { const now = ctx.now(), nextAt = Math.max(me.state.fight.nextAt ?? 0, now + 1800), cd = Math.ceil((nextAt - now) / 600); me.state.fight = { ...me.state.fight, cd, nextAt }; me.state.swing = { ...(me.state.swing ?? {}), n: (me.state.swing?.n | 0) + 1, ms: nextAt - now, delayed: true }; ctx.after((nextAt - now) / 1000, "swingDue"); ctx.emit("uiEvent", { name: "swing", payload: { ms: nextAt - now, ticks: Math.ceil((nextAt - now) / 600), w: me.state.swing?.w, delayed: true } }, { audience: { player: me.id } }); } // eating: your next swing waits at least 3 ticks, and the bar shows it
    ctx.emit("playSound", { clip: CB.sounds.eat, position: here(me), volume: 0.6 });
    if (me.state.hp > before) ctx.emit("damageNumber", { position: { ...here(me), y: here(me).y + 1.9 }, text: `+${me.state.hp - before}`, color: "#7fd06a", size: 0.8, lifetime: 1 });
  },
};

function burst(ctx, me, n) { ctx.emit("damageNumber", { position: { ...here(me), y: here(me).y + 1.9 }, text: `-${n}`, color: "#ff3b2f", size: 1.1 }); }

const ARROW_FX = `fx
pop trail rate=60 life=.15 size=.03 col=<1,.9,.7> a=.6>0 r=sprite(soft-disc,add)`;
export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false || !CB.on) return;
  const s = me.state, L = ensure(me), now = ctx.now(); if (!manual) tickAt.set(me.id, now);
  // hp: 1 per 60 s; hp clamps to a lowered Hitpoints level
  if (s.hp > overhealCap(L.hitpoints)) s.hp = overhealCap(L.hitpoints);
  if (s.hp > L.hitpoints) { if (!s.hpAt) s.hpAt = now; else if (now - s.hpAt >= CB.regenHpSec * 1000) { s.hp -= 1; s.hpAt = now; } } // an overheal fades 1 per 60 s
  else if (s.hp < L.hitpoints) { if (!s.hpAt) s.hpAt = now; else if (now - s.hpAt >= CB.regenHpSec * 1000 / (s.prayer?.on?.includes("rapid-heal") ? 2 : 1)) { s.hp += 1; s.hpAt = now; } } else if (s.hpAt) s.hpAt = 0;
  const f = s.fight;
  s.lowHp = s.hp > 0 && s.hp / Math.max(1, L.hitpoints) < 0.25;
  if (!f && s.cmb) { const lk = s.lock ? ctx.getObject(s.lock) : null; if (lk && !lk.state?.down && lk.tags?.includes?.("enemy") && flat(here(me), here(lk)) <= 45 && (lk.state?.engaged === me.id || ctx.now() - (s.ccastAt ?? 0) < 6000 || (s.cgcd ?? 0) > ctx.now() - 6000)) return; /* creator 2026-10-10: a live enemy you are fighting stays selected */ s.cmb = false; if (s.lock) ctx.emit("highlightClear", { target: s.lock }, { audience: { player: me.id } }); s.lock = null; ctx.emit("uiEvent", { name: "combatOff", payload: {} }, { audience: { player: me.id } }); }
  if (!f && s.lock) { const lo = ctx.getObject(s.lock); if (!lo || lo.state?.down || flat(here(me), here(lo)) > 45) s.lock = null; else return; } // a selected target lets go when it falls or you walk off
  if (!f) { if (s.hp === L.hitpoints) ctx.sleep(30); return; }
  const t = ctx.getObject(f.target), p = here(me);
  if (!t || t.state?.down) { s.fight = null; return; }
  const tp = here(t), dist = flat(p, tp);
  if (dist > CB.leash) { s.fight = null; return msg(ctx, me, "You stop fighting."); }
  const w = weaponOf(s.cbWeapon), st = styleOf(w, s.cbStyle);
  const reachNow = Math.max(rangeOf(w, st), (MON.stands[t.state?.kind] ?? 2.2) + 0.3) + 0.6; // walking away does NOT end the fight: the enemy keeps coming. It lapses only after CHASE s with nobody in reach.
  if (dist <= reachNow || f.approach) lastContact.set(me.id, now); else if (now - (lastContact.get(me.id) ?? now) > CHASE * 1000) { s.fight = null; msg(ctx, me, "You lose it."); return; }
  const left = (f.nextAt ?? 0) - now; // the swing timer is a CLOCK TIME (nextAt): only a swing, eating or a new fight moves it, never input, ticks or distance
  if (left > 0) { const cdv = Math.ceil(left / 600); if (cdv !== f.cd) s.fight = { ...f, cd: cdv }; return; }
  const cd = 0;
  if (f.approach) return; // still walking in: approach() runs the first strike
  if (dist > rangeOf(w, st) + 0.6) {
    if (w.kind === "melee") { // out of reach by a little: walk back in, unless you are steering yourself (WASD): then you keep your own course and the swing timer is untouched
            const now2 = ctx.now(); s.fight = { ...f, approach: true, re: true, walking: false, t0: now2, bestD: 999, bestT: now2 }; approach(ctx); return;
    }
    if (cd === 0 || !f.far) { s.fight = { ...f, cd: 0, far: true }; if (!f.far) msg(ctx, me, "You're out of range."); } return;
  }
  const sp = w.kind === "magic" ? spellOf(s.cbSpell) : null;
  const ar = w.kind === "ranged" ? quiverArrow(s.supplies, s.equip?.ammo) : null;
  if (w.kind === "ranged") { const why = bowBlock(s, w, L); if (why) { s.fight = null; return msg(ctx, me, why); } if (!ar) { s.fight = null; return msg(ctx, me, "There is no ammo left in your quiver. Fletch arrows or open the chests in the combat yard."); } ctx.emit("useArrow", { tier: ar.tier }, { to: me.id }); }
  if (sp && sp.level > L.magic) { s.cbSpell = bestSpell(L.magic).id; return; }
  if (sp && missing(sp, s.supplies, w.id).length) { s.fight = null; ctx.emit("playSound", { clip: CB.sounds.nomana, position: p, volume: 0.6 }); return msg(ctx, me, "You do not have enough runes to cast this spell."); }
  if (sp) s.supplies = spend(s.supplies, sp, w.id); // a splash still uses the runes (OSRS-PLAN s36)
  const enemy = enemyOf(t);
  const S = swingStats(L, w, st, enemy, s.cbSpell, ar?.str, gearOf(s.equip, w.id), prayMods(s.prayer));
  const hit = ctx.random() < S.chance, dmg = hit ? Math.max(1, Math.floor(ctx.random() * (S.maxHit + 1))) : 0; // OSRS: an accurate player hit rolls 0..max but a 0 becomes 1 (wiki: Successful hit)
  { const per = attackTicks(w, st) * 600; s.fight = { target: f.target, cd: attackTicks(w, st), nextAt: ctx.now() + per }; ctx.after(per / 1000, "swingDue"); } // the next swing lands exactly when the bar completes
  s.swing = { n: (s.swing?.n | 0) + 1, ms: attackTicks(w, st) * 600, ticks: attackTicks(w, st), w: w.name }; ctx.emit("uiEvent", { name: "swing", payload: { ms: attackTicks(w, st) * 600, ticks: attackTicks(w, st), w: w.name } }, { audience: { player: me.id } }); // the weapon timer bar restarts here and fills over one swing (lib/combat-fx.js)
  const at = { x: tp.x, y: tp.y + 1.2, z: tp.z };
  // the swing itself
  if (w.kind === "melee") {
    me.anim.atk = null; me.anim.atk = { clip: "cdn/clip-attack.glb", loop: "once", mask: { from: "Spine" }, weight: 1 };
    ctx.emit("playSound", { clip: CB.sounds.swing, position: p, volume: 0.6, pitch: 0.9 + ctx.random() * 0.2 });
    ctx.after(0.3, "land", { target: t.id, dmg, hit, at, xp: swingXp(w, st, dmg, sp), col: null, max: S.maxHit });
  } else {
    const from = { x: p.x, y: p.y + 1.4, z: p.z }, fly = Math.min(0.9, 0.15 + dist / 22);
    ctx.emit("playSound", { clip: w.kind === "ranged" ? CB.sounds.bow : CB.sounds.spell, position: p, volume: 0.6, pitch: 0.95 + ctx.random() * 0.1 });
    const mesh = w.kind === "ranged" ? null : boltMesh(sp);
    const id = ctx.spawn({ feetPosition: from, lifetime: fly + 0.1, audience: "near", rotation: { lookAt: at, include: ["yaw", "pitch"] }, pivot: "center",
      ...(mesh ? { model: mesh.model, scale: mesh.scale, castShadow: false } : {}),
      ...(mesh ? {} : { primitive: w.kind === "ranged" ? { kind: "cylinder", radiusTop: 0.012, radiusBottom: 0.012, height: 0.7 } : { kind: "sphere", radius: 0.14 },
        scale: w.kind === "ranged" ? { x: 1, y: 1, z: 1 } : 1,
        material: w.kind === "ranged" ? { color: "oklch(0.55 0.06 60)" } : { color: sp.color, emissive: sp.color, emissiveIntensity: 3 } }),
      fx: { script: w.kind === "ranged" ? ARROW_FX : `fx\npop t rate=80 life=.3 size=.12 col=hdr(2,2,2)*<${hex(sp.color)}> a=.8>0 sz=$size*(1>.2) r=sprite(soft-disc,add)` } });
    if (w.kind === "ranged") { const o = ctx.getObject(id); if (o) o.rotation = { lookAt: at, include: ["yaw", "pitch"] }; }
    animate(ctx, ctx.getObject(id), { "feetPosition.x": at.x, "feetPosition.y": at.y, "feetPosition.z": at.z }, { duration: fly, easing: "linear" });
    ctx.after(fly, "land", { target: t.id, dmg, hit, at, xp: swingXp(w, st, dmg, sp), col: sp?.color ?? null, max: S.maxHit });
  }
}
const hex = (h) => { const n = parseInt(h.slice(1), 16); return `${((n >> 16) & 255) / 255},${((n >> 8) & 255) / 255},${(n & 255) / 255}`; };

const HIT_FX = `fx
pop straw burst=10..16 life=.5..0.9 v=sdir()*(1.5..3)+up(1..2) size=.04..0.08 spin=-8..8 acc=grav()*.9+drag(.8) col=<.9,.78,.45> a=1>.7:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(stalk,alpha,velocity,.02)`;
// OSRS hitsplat: a red burst with the damage in white for a hit, a blue burst with 0 for a miss; it pops, rises a little and fades. Seen by everyone near.
const splatSvgOf = (dmg, big) => splatSvg(dmg, `width='${big ? 0.3 : 0.22}m' billboard='full'`);
function splat(ctx, at, dmg, big) {
  const x = at.x + (ctx.random() - 0.5) * 0.5, z = at.z + (ctx.random() - 0.5) * 0.5, id = ctx.spawn({ feetPosition: { x, y: at.y + 0.1, z }, audience: "near", castShadow: false, lifetime: 1.15, vector: splatSvgOf(dmg, big) });
  if (id) animate(ctx, id, { "feetPosition.y": at.y + 0.75 }, { duration: 1.0, easing: "easeOutQuad" });
}
export function land(ctx, { target, dmg, hit, at, xp, col, max }) {
  const me = ctx.self, t = ctx.getObject(target);
  if (t && !t.state?.down && Number.isFinite(dmg)) { if (typeof t.state.hp === "number") t.state.hp -= dmg; else t.state.hp = (t.state.maxHp ?? DUMMY.hp ?? 60) - dmg; t.state.hitAt = ctx.now(); if (t?.tags?.includes?.('training-dummy') && me.state.quests?.['straw-and-steel'] === 'active') me.state.qc = { ...(me.state.qc ?? {}), dummyHits: ((me.state.qc?.dummyHits) | 0) + 1 }; } // Bruni's quest counts the strike; a target whose hp has not reached this machine yet starts from its max, never NaN
  const big = dmg > 0 && max >= 3 && dmg >= Math.ceil(max * 0.8), aud = { audience: { player: me.id } };
  { const b = t?.bounds; if (b) at = { x: b.center.x, y: b.min.y + b.size.y * 0.8, z: b.center.z }; } // off the body as it stands now
  splat(ctx, at, dmg, big);
  ctx.emit("uiEvent", { name: "hitDealt", payload: { dmg, big } }, aud);
  if (dmg > 0) {
    ctx.emit("hitstop", { duration: big ? 0.07 : 0.035 }, aud);
    ctx.emit("cameraPunch", { direction: { x: 0, y: -1, z: 0 }, intensity: big ? 0.35 : 0.14 }, aud);
    if (big) ctx.emit("screenShake", { intensity: 0.12, duration: 0.2 }, aud);
    if (t) ctx.emit("flash", { target: t.id, color: "#ffffff", duration: 0.1, intensity: 1.5 });
    ctx.emit("playSound", { clip: CB.sounds.hit, position: at, volume: 0.8, pitch: 0.9 + ctx.random() * 0.25 });
    ctx.emit("fx", { position: at, script: HIT_FX });
    if (t) { ctx.emit("squash", { target: t.id, axis: "y", intensity: 0.12, duration: 0.18 }); ctx.emit("shake", { target: t.id, intensity: 0.05, duration: 0.2 }); }
  }
  if (col && t) ctx.emit("flash", { target: t.id, color: col, duration: 0.15 });
  giveXp(ctx, me, xp, dmg);
}

