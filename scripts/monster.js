// STARTER MONSTERS (S12): one brain per goblin / cow / chicken, in the room's own program, so everyone sees the same animal.
// Rows are tagged "enemy": combat-player.js fights them and steps state.hp. This file wanders, retaliates, leashes, dies and respawns.
// Hits on a player go to that player's own script as a "monsterHit" event (monster-player.js owns the hit and the death).
import { animate } from 'builtin/tween';
import { play } from 'builtin/anim';
import { mods as prayMods } from './lib/prayer-core.js';
import { MON, MONSTERS, DROPS, SITES, ENERGY, ATTACKS } from './lib/data/monsters.js';
import { SPECIES } from './lib/data/herd.js';
import { mSwing, featherDrop, rollTable } from './lib/monster-core.js';
import { levelOf } from './lib/skills-core.js';
import { combatLevel } from './lib/combat-core.js';
import { weaponOf, styleOf } from './lib/combat-core.js';
import { gearOf } from './lib/equip-core.js';
import { nextCorner } from './lib/chase-path.js';
import { busyElsewhere } from './lib/single-combat.js';
export const updateSchedule = { every: { seconds: MON.tick } };
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const yawTo = (a, b) => Math.atan2(-(b.x - a.x), -(b.z - a.z)) * 180 / Math.PI;
// creator 2026-10-10 ("animate and bone"): a rigged model (data row rig: true) plays its own Idle / Walk / Run / Attack / Death
const RIG = { idle: 'Idle', walk: 'Walk', run: 'Run', attack: 'Attack', death: 'Death' };
function rigClip(ctx, o, name, once) { const d = MONSTERS[o.state.kind]; if (!d?.rig) return false; const c = (d.rig === true ? RIG : d.rig)[name] ?? RIG[name];
  if (!once && o.mixer?.base?.clip === c) return true; o.mixer = { base: { clip: c, weight: 1, loop: once ? 'once' : 'loop', speed: name === 'walk' ? (d.walkSpeed ?? 1) : 1 } }; return true; }
const cowClip = (ctx, o, name) => { if (rigClip(ctx, o, name === 'walk' && o.state.engaged ? 'run' : name)) return; if (o.state.kind === 'cow' || o.state.kind === 'bull') play(ctx, o, SPECIES.cow.clips[name], { channel: 'body', loop: true, blendIn: 0.3, speed: name === 'walk' ? 1.4 : 1 }); };
const AI = MON.ai;
const CB = ['attack', 'strength', 'defence', 'hitpoints', 'prayer', 'ranged', 'magic'];
const pLevel = (p) => { const sk = p.state?.skills ?? {}; return combatLevel(Object.fromEntries(CB.map((k) => [k, levelOf(k === 'hitpoints' ? (sk.hitpoints ?? 11540) : (sk[k] | 0))]))); };
function aggroFor(ctx, d, p) { // the level gap sizes the radius; a grey mob barely looks up; the road is the safe corridor
  const gap = (d.level | 0) - pLevel(p); if (gap <= -AI.greyGap) return AI.greyAggro;
  let r = Math.min(d.aggro * AI.aggroMaxK, Math.max(AI.aggroMin, d.aggro + gap * AI.aggroPerLevel));
  const m = ctx.place.terrain?.materialAt?.(p.feetPosition.x, p.feetPosition.z); if (typeof m === 'string' && /gravel|road|cobble|flag|path/i.test(m)) r *= AI.roadK;
  return r;
}
function callHelp(ctx, o, pid, until) { // a fight draws in every hostile close by, and the pack of its own kind farther out
  const d = MONSTERS[o.state.kind];
  for (const r of ctx.query({ tags: ['enemy'], center: o.feetPosition, radius: Math.max(AI.assistR, d.pack ? (d.packR ?? 12) : 0) })) {
    if (r.id === o.id || r.state?.down || r.state?.chase || (r.state?.evadeUntil ?? 0) > ctx.now()) continue; const rd = MONSTERS[r.state?.kind]; if (!rd?.aggro) continue;
    const dd = Math.hypot(r.feetPosition.x - o.feetPosition.x, r.feetPosition.z - o.feetPosition.z);
    if (dd <= AI.assistR || (d.pack && r.state.kind === o.state.kind)) r.state.chase = { pid, until };
  }
}
function goEvade(ctx, o, s) { s.evadeUntil = ctx.now() + 8000; s.hp = s.maxHp; s.drain = null; s.engaged = null; s.chase = null; s.dest = null; s.flee = null; s.fled = false; s.ledgeN = 0; evade(ctx, o); }
const groundAt = (ctx, x, z, fallback) => ctx.place.terrain?.heightAt?.(x, z) ?? fallback;
function fighters(ctx, o) { // players whose fight is aimed at this monster, nearest first
  const f = o.feetPosition, out = [];
  const now = ctx.now(), ch = o.state.chase; // the player's fight at it, or a player who just walked away from it (chased for a while)
  for (const p of ctx.place.players) { if ((p.state?.fight?.target === o.id || (ch && ch.pid === p.id && now < ch.until && !busyElsewhere(ctx, p, o.id))) && p.feetPosition && flat(p.feetPosition, f) < (MONSTERS[o.state.kind]?.leash ?? MON.leash) + 10) out.push(p); } // single combat: it won't pile onto a player already fighting another
  return out.sort((a, b) => flat(a.feetPosition, f) - flat(b.feetPosition, f));
}
export function onSpawn(ctx) {
  const o = ctx.self, s = o.state, d = MONSTERS[s.kind]; if (!d) return;
  Object.assign(s, { name: d.name, maxHp: d.hp, hp: d.hp, defence: d.def, magic: d.magic, defBonus: d.defBonus, rangedDefBonus: d.defBonus, magicDefBonus: d.defBonus, down: false, cd: 0, until: 0 });
  s.home = { x: o.feetPosition.x, z: o.feetPosition.z }; rigClip(ctx, o, 'idle');
  const site = SITES[s.kind === 'bull' ? 'cow' : s.kind]; s.pen = site?.pen ?? null; s.avoid = site?.avoid ?? null; s.dest = null;
}
export function update(ctx) {
  const o = ctx.self, s = o.state, d = MONSTERS[s.kind]; if (!d || s.down) return;
  if (!s.home) onSpawn(ctx);
  const f = o.feetPosition, now = ctx.now();
  if (s.hp <= 0) return die(ctx, o, d);
  if ((s.sheepUntil ?? 0) > now) return; // Polymorph (class-cast-player.js): a sheep wanders nowhere and bites no one
  if (d.leash && (s.evadeUntil ?? 0) > now) { s.hp = s.maxHp; s.engaged = null; s.chase = null; if (flat(f, s.home) > 0.6) return walk(ctx, o, s.home, MON.chaseSpeed * AI.evadeK); s.evadeUntil = 0; } // evading home: untouchable, heals, ignores you
  if (s.lastHp == null || s.hp > s.lastHp) s.lastHp = s.hp; else if (s.hp < s.lastHp) { s.lastHp = s.hp; s.hurtAt = now; }
  if (s.flee) { // low hp: it bolts away from you, shouting to any fresh pack it runs past, then turns back
    if (now > s.flee.until) s.flee = null;
    else { const away = { x: f.x + s.flee.dx * 6, z: f.z + s.flee.dz * 6 }; if (s.engaged) callHelp(ctx, o, s.engaged, now + MON.aggroHoldSec * 1000); return walk(ctx, o, away, MON.chaseSpeed * AI.fleeSpeed); }
  }
  const fs = fighters(ctx, o);
  let near = Infinity; for (const p of ctx.place.players) { if (p.feetPosition) near = Math.min(near, flat(p.feetPosition, f)); }
  if (!fs.length && near > MON.wake && s.hp >= s.maxHp) { ctx.sleep(5); return; }
  if (!fs.length && d.aggro && near <= d.aggro * AI.aggroMaxK) { // (creator Oct 5) hostile kinds start the fight themselves when you walk into their radius; (Oct 10) the radius follows the level gap
    let pick = null, pd = Infinity; for (const p of ctx.place.players) { const pf0 = p.feetPosition; if (!pf0 || p.state?.dead || busyElsewhere(ctx, p, o.id)) continue; const dd = flat(pf0, f); if (dd <= aggroFor(ctx, d, p) && dd < pd) { pd = dd; pick = p; } }
    if (pick) { s.chase = { pid: pick.id, until: now + MON.aggroHoldSec * 1000 }; s.hurtAt = now; fs.push(pick); callHelp(ctx, o, pick.id, s.chase.until); } // a pack hunts together, neighbours answer the call
  }
  const pen = s.pen, out = pen ? Math.max(Math.abs(f.x - pen.cx) - pen.w / 2, Math.abs(f.z - pen.cz) - pen.d / 2) > MON.leash * 0.2 : flat(f, s.home) > (d.leash ?? MON.leash);
  if (out && d.leash) { goEvade(ctx, o, s); return walk(ctx, o, s.home, MON.chaseSpeed * AI.evadeK); }
  if (out) { s.hp = s.maxHp; s.drain = null; s.engaged = null; s.chase = null; s.dest = null; return walk(ctx, o, pen ? { x: pen.cx, z: pen.cz } : s.home, 1.8); } // the leash: give up and go home
  if (fs.length) { // single combat: the first fighter keeps it
    if (!s.engaged || !fs.some((p) => p.id === s.engaged)) { s.engaged = fs[0].id; s.hurtAt = now; s.fled = false; callHelp(ctx, o, s.engaged, now + MON.aggroHoldSec * 1000); }
    const p = fs.find((q) => q.id === s.engaged), pf = p.feetPosition, dist = flat(f, pf);
    s.hitAt = now; if (s.chase?.pid === p.id && dist < MON.leash) s.chase.until = now + MON.aggroHoldSec * 1000; // still on you: it keeps after you
    if (s.onIt !== s.engaged) { s.onIt = s.engaged; return onIt(ctx, o, pf); } // the "on it" beat: it notices you before it comes
    if ((s.kbUntil ?? 0) > now) return; // still sliding from a blast
    if (!s.fled && d.flee !== false && (d.respawn ?? 0) < 100 && d.aggro && s.hp > 0 && s.hp <= s.maxHp * AI.fleeAt) { // bosses stand their ground
      s.fled = true; const L = Math.max(0.1, dist); s.flee = { until: now + AI.fleeSec * 1000, dx: (f.x - pf.x) / L, dz: (f.z - pf.z) / L };
      ctx.emit('damageNumber', { position: { x: f.x, y: f.y + (o.bounds?.size?.y ?? 1.5) + 0.3, z: f.z }, text: 'flees in terror!', color: '#ffd27a', lifetime: 1.4 }); return;
    }
    if (d.leash && now - (s.hurtAt ?? now) > AI.threatSec * 1000 && dist > (MON.stands[s.kind] ?? 2.2) + MON.reach) { goEvade(ctx, o, s); return walk(ctx, o, s.home, MON.chaseSpeed * AI.evadeK); } // pure kiting: threat drops
    if (d.leash && (pf.y ?? 0) - groundAt(ctx, pf.x, pf.z, pf.y ?? 0) > AI.ledgeY && dist > (MON.stands[s.kind] ?? 2.2) + MON.reach) { s.ledgeN = (s.ledgeN | 0) + 1; if (s.ledgeN >= AI.ledgeTicks) { goEvade(ctx, o, s); return walk(ctx, o, s.home, MON.chaseSpeed * AI.evadeK); } } else s.ledgeN = 0; // you're up on a roof or ledge it can't reach
    const stand = MON.stands[s.kind] ?? 2.2; // (creator 2026-10-04) no stand-off dance: it walks a real route to you and stops at its reach
    if (d.stuck && dist > stand + MON.reach) { const lp = s.lastF; s.stuckN = lp && flat(lp, f) < 0.12 ? (s.stuckN | 0) + 1 : 0; s.lastF = { x: f.x, z: f.z }; if (s.stuckN >= Math.min(d.stuck, 4)) { s.stuckN = 0; goEvade(ctx, o, s); return walk(ctx, o, s.home, MON.chaseSpeed * AI.evadeK); } } // can't reach you: evade-reset
    if (dist > stand + MON.reach) { s.cd = Math.max(s.cd, 1); const k = (dist - stand) / dist, goal = { x: f.x + (pf.x - f.x) * k, y: pf.y, z: f.z + (pf.z - f.z) * k }; return walk(ctx, o, nextCorner(ctx, 'mon:' + o.id, f, goal, { radius: 0.6, reach: 0.5 }), MON.chaseSpeed); }
    if (dist < stand * 0.6) { s.cd = Math.max(s.cd, 1); const k = stand / Math.max(dist, 0.05); return walk(ctx, o, { x: pf.x + (f.x - pf.x) * k, z: pf.z + (f.z - pf.z) * k }, MON.chaseSpeed * 0.6); } // ran into each other: it gives a step back to its reach, no circling
    o.rotation = { yaw: yawTo(f, pf) }; if (o.mixer?.base?.clip !== 'Attack' || ctx.now() - (s.atkAt ?? 0) > 900) cowClip(ctx, o, 'idle');
    if (p.state.fight?.target === o.id && p.state.fight?.approach) { s.cd = Math.max(s.cd, 1); return; } // (creator Oct 5) you started it and are still walking in: your opening swing lands first, then it fights back
    if (--s.cd > 0) { if (s.cd === 1) windUp(ctx, o, s, f, pf, dist, p.id); return; } // one tick before the swing: rear back (the nameplate line is nearly full)
    swing(ctx, o, s, d, f, pf, dist, p, now);
    return;
  }
  s.engaged = null; s.onIt = null; s.cd = 0; s.atkAt = 0;
  if (s.hp < s.maxHp && now - (s.hitAt ?? 0) > MON.healIdleSec * 1000) { s.hp = s.maxHp; s.drain = null; }
  if (now < s.until) return;
  if (s.dest && flat(f, s.dest) > 0.4) return walk(ctx, o, s.dest, d.pace);
  s.dest = null;
  if (ctx.random() < (s.patrol ? 0.12 : s.camp ? 0.7 : 0.45)) { s.until = now + (d.rest[0] + ctx.random() * (d.rest[1] - d.rest[0])) * 1000; cowClip(ctx, o, 'idle'); return; }
  s.dest = pickDest(ctx, s, d); walk(ctx, o, s.dest, d.pace);
}
// a stroll target: anywhere across the pen (clear of the avoid circles), or a short walk round home
function pickDest(ctx, s, d) {
  if (s.route?.length) { s.ri = ((s.ri ?? -1) + 1) % s.route.length; const w = s.route[s.ri]; s.home = { x: w[0], z: w[1] }; return { x: w[0] + (ctx.random() - 0.5) * 3, z: w[1] + (ctx.random() - 0.5) * 3 }; } // a roamer walks its trail point to point; home follows it so the leash holds anywhere along it
  if (s.patrol) { s.pa = ((s.pa ?? ctx.random() * 6.28) + 0.75) % 6.2832; return { x: s.home.x + Math.cos(s.pa) * s.patrol, z: s.home.z + Math.sin(s.pa) * s.patrol }; } // a sentry walks its loop round home
  const P = s.pen;
  for (let i = 0; i < 8; i++) {
    const x = P ? P.cx + (ctx.random() - 0.5) * (P.w - 2.4) : s.home.x + (ctx.random() - 0.5) * 2 * d.wander * (s.camp ? 0.4 : 1), z = P ? P.cz + (ctx.random() - 0.5) * (P.d - 2.4) : s.home.z + (ctx.random() - 0.5) * 2 * d.wander * (s.camp ? 0.4 : 1);
    if (!s.avoid || s.avoid.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + 0.6)) return { x, z };
  }
  return { x: s.home.x, z: s.home.z };
}
// ON IT: snap to face, a startled hop with a squash, a red "!" over the head, a snort; a short beat before the charge
function onIt(ctx, o, pf) {
  const f = o.feetPosition, s = o.state, top = (o.bounds?.size?.y ?? 1.2);
  o.rotation = { yaw: yawTo(f, pf) };
  animate(ctx, o.id, { 'feetPosition.y': [f.y, f.y + 0.35, f.y] }, { duration: 0.32, easing: 'easeOutQuad' });
  ctx.emit('squash', { target: o.id, axis: 'y', intensity: 0.22, duration: 0.3 });
  ctx.emit('damageNumber', { position: { x: f.x, y: f.y + top + 0.35, z: f.z }, text: '!', color: '#ff3b2f', size: 2.2, lifetime: 0.9 });
  ctx.emit('playSound', { clip: o.state.kind === 'cow' || o.state.kind === 'bull' ? MON.sounds.cow : MON.sounds.alert, position: f, volume: 0.8, pitch: 1.05 + ctx.random() * 0.2, maxDistance: 30 });
  s.cd = Math.max(s.cd, 2); s.until = ctx.now() + 500;
}
// one swing at a player (shared by the tick and by the first-strike roll)
function swing(ctx, o, s, d, f, pf, dist, p, now) {
  s.cd = d.speed; s.atkAt = now; s.atkMs = d.speed * MON.tick * 1000; // the swing clock the nameplate fills along its edge
    const sk = p.state.skills ?? {}, w = weaponOf(p.state.cbWeapon), st = styleOf(w, p.state.cbStyle);
    const dr = s.drain, dd = dr ? { ...d, att: Math.max(1, Math.floor(d.att * (1 - (dr.attack || 0)))), str: Math.max(1, Math.floor(d.str * (1 - (dr.strength || 0)))) } : d; // a curse's % drain (spellbook, OSRS-PLAN P3)
    let dmg = mSwing(dd, Math.floor(levelOf(sk.defence | 0) * prayMods(p.state.prayer).def), st.boost?.defence ?? 0, gearOf(p.state.equip, p.state.cbWeapon).def[d.kind] | 0, ctx.random(), ctx.random());
    lunge(ctx, o, s, f, pf, dist);
    ctx.after(0.12, 'strike', { to: p.id, dmg, name: d.name, from: { x: f.x, z: f.z }, mon: o.id, style: d.kind === 'magic' || d.kind === 'ranged' ? d.kind : 'melee' }); // the hit lands as the lunge connects
}
// --- a swing you can read: rear back as the line fills, surge as it completes, settle. Varied per kind (data ATTACKS), eased tweens only.
function windUp(ctx, o, s, f, pf, dist, pid) {
  const set = ATTACKS[s.kind]; if (!set) return;
  const v = set[Math.floor(ctx.random() * set.length)], ux = (pf.x - f.x) / dist, uz = (pf.z - f.z) / dist;
  s.swv = v; s.base = { x: f.x, z: f.z };
  animate(ctx, o.id, { 'feetPosition.x': f.x - ux * v.back, 'feetPosition.z': f.z - uz * v.back, 'rotation.pitch': -v.pitch * 0.6, 'rotation.roll': v.roll * 0.5 }, { duration: 0.5, easing: 'easeOutQuad' });
  ctx.emit('uiEvent', { name: 'windup', payload: { ms: 600 } }, { audience: { player: pid } });
}
function lunge(ctx, o, s, f, pf, dist) {
  const v = s.swv ?? (ATTACKS[s.kind] ?? [{ back: 0, lunge: 0.5, pitch: 0, roll: 0, sq: 0 }])[0], ux = (pf.x - f.x) / dist, uz = (pf.z - f.z) / dist, b0 = s.base ?? { x: f.x, z: f.z };
  animate(ctx, o.id, { 'feetPosition.x': b0.x + ux * v.lunge, 'feetPosition.z': b0.z + uz * v.lunge, 'rotation.pitch': v.pitch, 'rotation.roll': -v.roll }, { duration: 0.12, easing: 'easeInQuad' });
  rigClip(ctx, o, 'attack', true);
  if (v.sq) ctx.emit('squash', { target: o.id, axis: 'y', intensity: v.sq, duration: 0.2 });
  ctx.emit('playSound', { clip: MON.sounds.swing, position: { x: f.x, y: f.y + 0.8, z: f.z }, volume: 0.55, pitch: s.kind === 'bull' ? 0.55 : s.kind === 'chicken' ? 1.3 : 0.8 + ctx.random() * 0.15, maxDistance: 30 });
  ctx.after(0.16, 'settle', { x: b0.x, z: b0.z });
  s.swv = null;
}
export function settle(ctx, p) { const o = ctx.self; if (o.state?.down) return; animate(ctx, o.id, { 'feetPosition.x': p.x, 'feetPosition.z': p.z, 'rotation.pitch': 0, 'rotation.roll': 0 }, { duration: 0.32, easing: 'easeOutQuad' }); }
export function strike(ctx, p) { if (!ctx.self.state?.down) ctx.emit('monsterHit', { dmg: p.dmg, name: p.name, from: p.from, mon: p.mon ?? ctx.self.id, style: p.style }, { to: p.to }); }
function walk(ctx, o, t, speed) {
  const s = o.state, f = o.feetPosition, dist = flat(f, t); if (dist < 0.15) return;
  if ((s.kbUntil ?? 0) > ctx.now()) return; // a fireball's shove owns the feet for a beat
  if ((s.boundUntil ?? 0) > ctx.now()) return; // Bind / Snare / Entangle (spellbook-player.js)
  const step = Math.min(dist, speed * MON.tick * (s.engaged ? 1 : 2.5)), k = step / dist, x = f.x + (t.x - f.x) * k, z = f.z + (t.z - f.z) * k;
  const dur = step / speed;
  o.rotation = { yaw: yawTo(f, t) };
  animate(ctx, o.id, { 'feetPosition.x': x, 'feetPosition.y': groundAt(ctx, x, z, f.y), 'feetPosition.z': z }, { duration: dur, easing: 'linear' });
  s.until = ctx.now() + dur * 1000; cowClip(ctx, o, 'walk');
}
function die(ctx, o, d) {
  const s = o.state; s.down = true; s.hp = 0;
  ctx.emit('playSound', { clip: MON.sounds.hit, position: o.feetPosition, volume: 0.9, pitch: 0.7, maxDistance: 25 });
  if (rigClip(ctx, o, 'death', true)) {}
  else if (d.faint) { animate(ctx, o.id, { 'rotation.yaw': [o.rotation?.yaw ?? 0, (o.rotation?.yaw ?? 0) + 540], 'rotation.roll': [0, 0, 20, 96, 88] }, { duration: 1.4, easing: 'easeInOutSine' }); ctx.emit('damageNumber', { position: { x: o.feetPosition.x, y: o.feetPosition.y + (o.bounds?.size?.y ?? 1.5) + 0.3, z: o.feetPosition.z }, text: 'faints!', color: '#fff2b0', lifetime: 1.8 }); ctx.emit('fx', { position: { x: o.feetPosition.x, y: o.feetPosition.y + (o.bounds?.size?.y ?? 1.5), z: o.feetPosition.z }, script: FAINT_FX }); } // the whimsical defeat: a dizzy spin, a keel-over, a halo of stars
  else animate(ctx, o.id, { 'rotation.roll': [0, -8, 92, 86, 88] }, { duration: 1.3, easing: 'easeInOutSine' }); // a stagger back, the slump, a settle
  animate(ctx, o.id, { 'material.dissolve': [0, 1] }, { duration: 0.6, delay: MON.fadeSec - 0.6 }); // then a quick fade, never a pop
  const killer = s.engaged ?? fighters(ctx, o)[0]?.id ?? null, at = { x: o.feetPosition.x, y: o.feetPosition.y + 0.9, z: o.feetPosition.z };
  ctx.emit('fx', { position: at, script: DEATH_FX });
  ctx.emit('shockwave', { position: at, speed: 5, thickness: 0.4, intensity: 0.4, scale: 1 });
  if (killer) {
    const aud = { audience: { player: killer } };
    ctx.emit('uiEvent', { name: 'kill', payload: { name: d.name, level: d.level } }, aud);
    ctx.emit('hitstop', { duration: 0.08 }, aud);
    ctx.emit('slowMo', { scale: 0.3, duration: 0.45, easing: true }, aud);
    ctx.emit('screenFlash', { color: 'oklch(0.9 0.13 90)', duration: 0.3, intensity: 0.25 }, aud);
    const drop = DROPS[s.kind], items = [...drop.always]; let rare = false;
    for (const [id, p] of drop.rare ?? []) if (ctx.random() < p) { items.push(id); rare = true; }
    const sup = {}; if (drop.table) { const e = rollTable(drop.table, ctx.random()); if (e.item) items.push(e.item); if (e.sup) Object.assign(sup, e.sup); }
    if (drop.energy && ctx.random() < drop.energy) items.push('energy-' + ENERGY.drops[Math.floor(ctx.random() * ENERGY.drops.length)]);
    ctx.emit('monsterLoot', { kind: s.kind, lvl: d.level | 0, at: { x: o.feetPosition.x, z: o.feetPosition.z }, items, sup, rare, feathers: drop.feathers ? featherDrop(drop.feathers, ctx.random()) : 0 }, { to: killer });
  }
  s.engaged = null; s.chase = null;
  ctx.after(MON.fadeSec, 'vanish');
  ctx.after(d.respawn * MON.tick, 'respawn');
}
function evade(ctx, o) { const f = o.feetPosition; ctx.emit('damageNumber', { position: { x: f.x, y: f.y + (o.bounds?.size?.y ?? 1.5) + 0.3, z: f.z }, text: 'Evade', color: '#cfd8e0', lifetime: 1.2 }); }
const FAINT_FX = `fx
pop stars burst=7 life=1.4..1.8 v=<0,.3,0> spin=2.6..3.2 rad=.35..0.5 pos=<cos($age*$spin+$i)*$rad,sin($age*7)*.05,sin($age*$spin+$i)*$rad> size=.09..0.13 col=hdr(3,2.6,.9) a=0>.1:1>.8:1>0 sz=$size r=sprite(sparkle,add)`;
const DEATH_FX = `fx
pop dust burst=14 life=.6..1.1 v=sdir()*(1..2.4)+up(.5..1.5) size=.12..0.24 acc=buoy(.3)+drag(1.2) col=<.7,.62,.5> a=0>.5:.3>.6:.2>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)
pop spark burst=22 life=.5..1 v=sdir()*(2..4)+up(2..4) size=.04..0.09 acc=grav()*.7+drag(1) col=hdr(3,2.4,.8)>hdr(1.6,.9,.2) a=1>.7:1>0 sz=$size r=sprite(ember,add)`;
// gone means gone: hidden AND no longer in the world. The kinematic body kept its collider where it fell, so a dead cow blocked the spot invisibly; it now waits far below the ground until it respawns.
export function vanish(ctx) { const o = ctx.self, f = o.feetPosition; o.visible = false; o.state.restY = f.y; o.feetPosition = { x: f.x, y: f.y - 400, z: f.z }; }
export function respawn(ctx) {
  const o = ctx.self, s = o.state, h = s.home; if (!h) return;
  o.rotation = { yaw: ctx.random() * 360 };
  o.feetPosition = { x: h.x, y: groundAt(ctx, h.x, h.z, s.restY ?? o.feetPosition.y), z: h.z };
  s.hp = s.maxHp; s.down = false; s.cd = 0; s.until = 0; o.visible = true; rigClip(ctx, o, 'idle'); o.material = { ...(o.material ?? {}), dissolve: 0 };
}
