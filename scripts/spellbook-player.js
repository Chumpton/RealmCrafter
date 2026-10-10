// SPELLBOOK casts (creator 2026-10-04). A bar slot "sp:<id>" fires on its digit (pluck1..10, the world's digit binds) or a click
// (sendAction cbCast { id }); the book's own buttons send the same. Judged here, on the caster's machine, stepped into the target's state.
// Owns: s.spCd (ready stamps). Writes supplies (runes) by spend only; inv/coins only for alchemy and bones. Attack spells and curses are judged in combat-player.js (cbCastAt).
// The six archived old powers (fireball, chain, vortex, frost, dive bomb, pillar) were deleted 2026-10-05 (lane L1). Data: scripts/lib/data/spells.js.
import { raycast } from 'builtin/physics';
import { bookById, spellOfBar, isOldSpell } from './lib/data/spellbook.js';
import { spellById } from './lib/data/spells.js';
import { missing, spend } from './lib/magic-core.js';
import { castAnim } from './lib/cast-anim.js';
import { weaponOf } from './lib/combat-core.js';
import { levelOf } from './lib/skills-core.js';
import { spotById, TRAVEL } from './lib/data/travel.js';
import { valueOf, sellable } from './lib/data/shop.js';
const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const msg = (ctx, me, text) => ctx.emit('skillMsg', { text }, { to: me.id });
const BOLT = `fx
pop core n=1 size=.42 col=%c|<1,.6,.2>*3 a=1 sz=$size*flick(10,.2) r=sprite(soft-disc,add)
pop trail rate=70 on=sphere(.12) life=.2..0.4 v=sdir()*.4 size=.18..0.3 acc=drag(2) sz=$size*(1>.1) col=%c|<1,.6,.2>*2 a=.9>0 r=sprite(soft-disc,add)
pop glow n=1 r=light(%c|<1,.6,.2>,10,6)`;
const HIT = `fx
pop burst burst=18..26 life=.3..0.6 v=sdir()*(2..5)+up(1) size=.12..0.25 acc=drag(3) sz=$size*(1>.2) col=%c|<1,.6,.2>*3 a=1>0 r=sprite(soft-disc,add)
pop ring burst=1 life=.35 size=1.4 sz=$size*(.3>1.4) col=%c|<1,.6,.2>*2 a=.8>0 r=sprite(soft-disc,add)
pop glow burst=1 life=.4 r=light(%c|<1,.6,.2>,(1>0)*25,6)`;
const rgb = (hex) => { const n = parseInt(String(hex).slice(1), 16); return { x: ((n >> 16) & 255) / 255, y: ((n >> 8) & 255) / 255, z: (n & 255) / 255 }; }; // an fx param vec3
function aimTarget(ctx, me, input, range) {
  const s = me.state, p = here(me), a = input?.axes ?? {};
  if (typeof a.pointerDirX === 'number' && typeof a.pointerOriginX === 'number') {
    let eye = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }; if (flat(eye, p) > 18) eye = { x: p.x, y: p.y + 1.6, z: p.z };
    const r = raycast(ctx, eye, { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 }, { distance: range, ignoreEntities: [me.id] });
    let o = r?.id ? ctx.getObject(r.id) : null;
    for (let i = 0; o && i < 3; i++) { if (o.tags?.includes?.('enemy') && !o.state?.down) return o; o = o.parent?.id ? ctx.getObject(o.parent.id) : null; }
  }
  const lock = s.fight?.target ?? s.lock; const lo = lock ? ctx.getObject(lock) : null;
  if (lo && !lo.state?.down && flat(p, here(lo)) <= range) return lo;
  let best = null, bd = range;
  for (const r of ctx.query({ tags: ['enemy'], center: p, radius: range }) ?? []) { if (r.state?.down) continue; const d = flat(p, r.feetPosition); if (d < bd) { bd = d; best = r; } }
  return best ? ctx.getObject(best.id) : null;
}
const CLASS_MODES = ['mage', 'warlock', 'shaman', 'warrior', 'wow', 'vwarrior', 'vpaladin', 'vhunter', 'vrogue', 'vpriest', 'vshaman', 'vmage', 'vwarlock', 'vdruid']; // CLASS COMBAT (Campton): a class kit owns the digits; this book's bar sleeps
export function onInput(ctx, input) {
  const me = ctx.self; if (me.isLocal === false) return;
  const pr = input?.pressed ?? {}, s = me.state;
  if (s.bugOpen != null || s.bugDraft) return; // the bug journal owns 1-9 while it is open
  let id = pr.cbCast ? input.actionData?.cbCast?.id : null;
  if (!id && !s.holding && !CLASS_MODES.includes(s.combatMode) && Array.isArray(s.ui?.bar)) for (let k = 1; k <= 10; k++) if (pr['pluck' + k]) { const sp = spellOfBar(s.ui.bar[k - 1]); if (sp) { id = sp.id; break; } }
  if (id) cast(ctx, me, bookById(String(id)), input);
}
function cast(ctx, me, sp, input) {
  if (!sp || isOldSpell(sp.id)) return; // the six archived powers are gone (2026-10-05): a stale bar slot does nothing
  castOsrs(ctx, me, sp, input);
}
const hasItem = (s, id) => (Array.isArray(s.inv) ? s.inv : []).some((x) => x?.id === id);
function takeItem(s, id) { const inv = Array.isArray(s.inv) ? s.inv.slice() : [], i = inv.findIndex((x) => x?.id === id); if (i >= 0) { inv[i] = null; s.inv = inv; } }
// THE OSRS BOOK (OSRS-PLAN P3): costs are runes from the Pack (magic-core.js), an elemental staff pays its own rune. Attack spells and curses go to combat-player.js (cbCastAt).
function castOsrs(ctx, me, sp, input) {
  const s = me.state, now = ctx.now(), magic = levelOf(s.skills?.magic | 0), wid = weaponOf(s.cbWeapon).id;
  if (s.dead) return;
  if (sp.den !== 'yes') return msg(ctx, me, `You can't cast ${sp.name}${sp.lock ? ': ' + sp.lock : ''}.`);
  if (magic < sp.level) return msg(ctx, me, `You need a Magic level of ${sp.level} to cast ${sp.name}.`);
  if (sp.other) return msg(ctx, me, `${sp.name} needs another player to accept it: not ready yet.`);
  const cd = { ...(s.spCd ?? {}) };
  if (sp.id === 'lumbridge-home-teleport') return homeStart(ctx, me, sp, cd, now);
  if ((cd[sp.id] ?? 0) > now || (cd._gcd ?? 0) > now) return;
  if (missing(sp, s.supplies, wid).length || (sp.runes?.banana && !hasItem(s, 'banana'))) {
    ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-spell-fizzle-no-mana.mp3', position: here(me), volume: 0.5 });
    return msg(ctx, me, `You do not have enough runes to cast ${sp.name}.`);
  }
  if (sp.kind === 'attack' || sp.kind === 'curse') {
    const tgt = aimTarget(ctx, me, input, sp.range ?? 10); if (!tgt) return msg(ctx, me, 'There is nothing to cast that on.');
    return ctx.emit('cbCastAt', { spell: sp.id, target: tgt.id }, { to: me.id }); // combat-player.js spends the runes and judges the cast
  }
  if (sp.kind === 'teleport') return runeTeleport(ctx, me, sp, cd, now, wid);
  if (sp.kind === 'utility') {
    const ok = sp.effect?.alch ? alch(ctx, me, sp) : sp.effect?.bones ? bones(ctx, me, sp) : sp.effect?.grab ? grab(ctx, me, sp) : false; if (!ok) return;
    s.supplies = spend(s.supplies, sp, wid); cd._gcd = now + 1800; s.spCd = cd;
    ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-spell-cast-shimmer.mp3', position: here(me), volume: 0.6 });
    if (sp.xp) ctx.emit('skillXp', { multi: { magic: Math.round(sp.xp * 10) } }, { to: me.id });
  }
}
// RUNE TELEPORTS (s34, cast time not checked: 3 ticks until it is): runes spent at the start, then you land on the spell's travel spot
function runeTeleport(ctx, me, sp, cd, now, wid) {
  const s = me.state; if (me.controlling) return msg(ctx, me, 'Dismount first.');
  s.supplies = spend(s.supplies, sp, wid); if (sp.runes?.banana) takeItem(s, 'banana');
  cd._gcd = now + 2400; s.spCd = cd; // OSRS casting speed 4 ticks; you land after 3 (1.8 s)
  castAnim(me, 0.8);
  ctx.emit('fx', { position: here(me), script: HIT, params: { c: rgb(sp.color) } });
  ctx.after(1.8, 'teleDone', { id: sp.id });
}
export function teleDone(ctx, { id }) {
  const me = ctx.self, sp = spellById(id); if (!sp || me.state.dead || me.controlling) return;
  teleport(ctx, me, sp); if (sp.xp) ctx.emit('skillXp', { multi: { magic: Math.round(sp.xp * 10) } }, { to: me.id });
}
// HOME TELEPORT (OSRS-PLAN P1b, research s34): a 24-tick cast (14.4 s), 30-min recharge counted from the arrival, never started in combat, cancelled when attacked.
const HOME = { castSec: 14.4, tickSec: 0.3, calmSec: 6 };
function homeStart(ctx, me, sp, cd, now) {
  const s = me.state;
  if ((cd[sp.id] ?? 0) > now) return msg(ctx, me, s.homeCast && now < s.homeCast.until ? 'You are already casting Home Teleport.' : `Home Teleport is recharging: ${Math.ceil((cd[sp.id] - now) / 60000)} min left.`);
  if (me.controlling) return msg(ctx, me, 'Dismount first.');
  if (s.fight || now - (s.hurtAt ?? -1e9) < HOME.calmSec * 1000) return msg(ctx, me, "You can't cast Home Teleport while in combat.");
  s.homeCast = { at: now, until: now + HOME.castSec * 1000 };
  cd[sp.id] = s.homeCast.until; s.spCd = cd; // greys the icon while casting; an interrupt clears it
  castAnim(me, 0.4);
  ctx.emit('fx', { position: here(me), script: HIT, params: { c: rgb(sp.color) } });
  msg(ctx, me, 'You begin casting Home Teleport.');
  ctx.after(HOME.tickSec, 'homeTick');
}
export function homeTick(ctx) {
  const me = ctx.self, s = me.state, hc = s.homeCast, now = ctx.now(); if (!hc) return;
  const sp = spellById('lumbridge-home-teleport'), cd = { ...(s.spCd ?? {}) };
  if (s.dead || me.controlling || (s.hurtAt ?? 0) >= hc.at) { delete s.homeCast; delete cd[sp.id]; s.spCd = cd; return msg(ctx, me, 'Your Home Teleport is interrupted.'); }
  if (now < hc.until) return ctx.after(HOME.tickSec, 'homeTick');
  delete s.homeCast; cd[sp.id] = now + sp.cd * 1000; s.spCd = cd;
  teleport(ctx, me, sp); msg(ctx, me, 'You arrive at the longhouse hearth.');
}
function teleport(ctx, me, sp) {
  const spot = spotById(sp.land); if (!spot) return;
  const from = here(me), gy = spot.fixedY ? spot.y : (ctx.place.terrain?.heightAt?.(spot.x, spot.z) ?? spot.y ?? 30) + TRAVEL.lift, to = { x: spot.x, y: gy, z: spot.z }, c = rgb(sp.color);
  ctx.emit('fx', { position: from, script: HIT, params: { c } });
  me.velocity = { x: 0, y: 0, z: 0 }; me.feetPosition = to; me.state.fight = null;
  ctx.emit('fx', { position: to, script: HIT, params: { c } });
  ctx.emit('playSound', { clip: TRAVEL.sound, position: to, volume: 0.7, pitch: 1.1 });
  ctx.emit('screenFlash', { color: sp.color, duration: 0.35, intensity: 0.35 }, { audience: { player: me.id } });
}
// ALCHEMY (s35): one item at a time, floor(value x 0.4 / 0.6) coins; anything worth 1,000+ asks for a second cast within 5 s
function alch(ctx, me, sp) {
  const s = me.state, inv = Array.isArray(s.inv) ? s.inv.slice() : [], now = ctx.now();
  const i = inv.findIndex((x) => x?.id && sellable(x.id) && valueOf(x.id) > 0 && !String(x.id).startsWith('axe-') && x.id !== 'tinderbox');
  if (i < 0) { msg(ctx, me, 'You have nothing worth turning to gold.'); return false; }
  const name = inv[i].id, val = valueOf(name);
  if (val >= 1000 && !(s.alchWarn?.id === name && now - s.alchWarn.at < 5000)) { s.alchWarn = { id: name, at: now }; msg(ctx, me, `Your ${name.replace(/-/g, ' ')} is worth ${val} coins: cast again to turn it to gold.`); return false; }
  const coins = Math.max(0, Math.floor(val * sp.effect.alch));
  if ((inv[i].qty | 0) > 1) inv[i] = { ...inv[i], qty: (inv[i].qty | 0) - 1 }; else inv[i] = null;
  s.inv = inv; s.supplies = { ...(s.supplies ?? {}), coins: ((s.supplies?.coins) | 0) + coins }; delete s.alchWarn;
  ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-coins-clink.mp3', position: here(me), volume: 0.6 });
  msg(ctx, me, `Your ${name.replace(/-/g, ' ')} turns into ${coins} coins.`); return true;
}
// TELEKINETIC GRAB (s35): the nearest drop within 10 m comes to your pack (monster-player.js lootTake with grab: the longer reach)
function grab(ctx, me, sp) {
  const p = here(me); let best = null, bd = sp.effect.grab;
  for (const o of ctx.query({ tags: ['loot'], center: p, radius: bd }) ?? []) { const q = o.worldFeetPosition ?? o.feetPosition; const d = q ? flat(p, q) : bd; if (d < bd) { bd = d; best = o; } }
  if (!best) { msg(ctx, me, 'There is nothing to grab.'); return false; }
  ctx.emit('fx', { position: best.worldFeetPosition ?? best.feetPosition, script: HIT, params: { c: rgb(sp.color) } });
  ctx.emit('lootTake', { obj: best.id, grab: true }, { to: me.id }); return true;
}
// BONES TO BANANAS / PEACHES (s35): every normal bone in the Pack
function bones(ctx, me, sp) {
  const s = me.state, inv = Array.isArray(s.inv) ? s.inv.slice() : [], to = sp.effect.bones; let n = 0;
  for (let i = 0; i < inv.length; i++) if (inv[i]?.id === 'bones') { inv[i] = { id: to }; n++; }
  if (!n) { msg(ctx, me, "You aren't holding any bones."); return false; }
  s.inv = inv; msg(ctx, me, `${n} bone${n > 1 ? 's turn' : ' turns'} into ${to}${n > 1 ? 's' : ''}.`); return true;
}
