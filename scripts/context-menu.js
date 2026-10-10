import { lineColor } from './lib/stance.js'; // creator 2026-10-10: green friendlies, red enemies
// The right-click menu (OSRS style) for the first-person view. SOLE writer of player.state.ctxMenu.
// Right-click on a thing under the crosshair (menuOpen) or on a pack / shop slot (menuAt) builds its entry list; the page draws it (lib/menu-hud.js);
// a pick (menuPick) carries the entry out through the same doors a left-click or E uses. Entries that are plain world inputs run page-side.
import { VIEW } from './lib/data/view-settings.js';
import { raycast } from 'builtin/physics';
const HOVER_REACH = 160; // perf: the hover outline runs 10x a second; past 160 m nothing reads as hovered anyway
const PICK = 1000; // click reach, metres: everything you can see (creator 2026-10-06: "make it infinite range"); fog closes at ~1250
const walkUntil = (ctx, me, x, z) => ctx.now() + Math.max(15000, Math.hypot(x - here(me).x, z - here(me).z) / 2.2 * 1000 + 8000); // a long click-walk gets the time it needs at walking pace
import { MONSTERS } from './lib/data/monsters.js';
import { TALK } from './lib/data/dock-folk.js';
import { GROVE_TREES } from './lib/data/skills.js';
import { MENU } from './lib/data/menu.js';
import { SPOT_KINDS } from './lib/data/gather.js';
import { fishOf } from './lib/gather-core.js';
import { spotEntries, fireEntries, enemyEntries, npcEntries, graveEntries, treeEntries, lootEntries, gateEntries, invEntries, eqEntries, shopBuyEntries, shopSellEntries, spellEntries, withWalk, genericEntries, prettyName, hoverOf } from './lib/menu-core.js';
import { COL } from './lib/data/menu.js';
import { cbLevelOf } from './lib/combat-hud.js';
import { normInv } from './lib/skills-core.js';
import { shelfMap, askPrice, sellPrice } from './lib/shop-core.js';
import { stockOf } from './lib/data/shop.js';
const here = (o) => o.worldFeetPosition ?? o.feetPosition;
let nonce = 0;
function say(ctx, me, text) { ctx.emit('skillMsg', { text }, { to: me.id }); }
function describe(ctx, me, o) { // what a world object offers: { head, entries, id, tree? } or null
  const st = o.state ?? {}, mine = cbLevelOf(me.state);
  if (o.tags?.includes?.('enemy')) {
    const m = MONSTERS[st.kind], name = m?.name ?? 'Training dummy', lvl = m?.level ?? 1;
    const e = enemyEntries(name, lvl, mine, st.kind); if (st.down) e.shift();
    return { head: name, entries: e, id: o.id };
  }
  if (o.tags?.includes?.('wynx') && st.owner === me.id && !st.ridden) return { head: 'Wynx', entries: [{ verb: 'Command', t: 'wynxSel', target: 'Wynx', col: COL.npc }, { verb: 'Follow', t: 'wynxFollow', target: 'Wynx', col: COL.npc }], id: o.id, wynx: true };
  if (o.tags?.includes?.('loot')) return { head: st.name, entries: lootEntries(st.name, st.id), id: o.id, loot: true };
  if (o.tags?.includes?.('gravestone')) return { head: 'Gravestone', entries: graveEntries(st.owner === me.id, st.name), id: o.id };
  if (o.id === 'general-merchant') return { head: 'General Merchant', entries: npcEntries('general-merchant', 'General Merchant', 'Trade'), id: o.id };
  if (o.id === 'rune-merchant') return { head: 'Aubury', entries: npcEntries('rune-merchant', 'Aubury', 'Trade'), id: o.id };
  if (o.tags?.includes?.('npc') && st.verb && st.name) return { head: st.title ?? st.name, entries: npcEntries(o.id, st.name, st.verb), id: o.id }; // any npc row naming its verb (magic-tutor: Talk-to Mikasi)
  if (o.tags?.includes?.('dock-folk') && TALK[st.talk]) return { head: TALK[st.talk].name, entries: npcEntries(st.talk, TALK[st.talk].name, 'Talk-to'), id: o.id };
  if (o.tags?.includes?.('fishing-spot') && SPOT_KINDS[st.kind]) return { head: 'Fishing spot', entries: spotEntries(SPOT_KINDS[st.kind].fish.map((f) => fishOf(f)?.tool).filter(Boolean)), id: o.id };
  if (o.tags?.includes?.('cook-fire')) return { head: 'Fire', entries: fireEntries(), id: o.id };
  if (o.tags?.includes?.('quest-board')) return { head: 'Quest board', entries: [{ verb: 'Read', t: 'press', target: 'Quest board', col: COL.obj }, { verb: 'Examine', t: 'say', txt: 'Notices pinned fresh every day. Someone always needs a hand.', target: 'Quest board', col: COL.obj }], id: o.id };
  if (o.tags?.includes?.('gate')) return { head: 'Gate', entries: gateEntries(!!st.open), id: o.id };
  const tree = st.treeId && GROVE_TREES.find((t) => t.id === st.treeId);
  if (tree) { const nm = tree.kind && tree.kind !== 'normal' ? `${tree.kind[0].toUpperCase()}${tree.kind.slice(1)} tree` : 'Tree'; return { head: nm, entries: treeEntries(nm), id: o.id, tree: tree.id }; }
  return null;
}
// a ray against the drawn box of each walk-through giver near the eye (tag hover-pick); the nearest entry wins
function rayBox(ctx, o, d, maxT) {
  let best = null;
  // perf (2026-10-07): two small spheres, near the eye and where the ray landed, instead of one sphere up to 1 km wide (it held far cells on every hover)
  const NEAR = 60, rows = ctx.query({ tags: ['hover-pick'], center: o, radius: Math.min(maxT, NEAR) + 10 });
  if (maxT > NEAR) { const e = Math.min(maxT, PICK), seen = new Set(rows.map((r) => r.id)); for (const r of ctx.query({ tags: ['hover-pick'], center: { x: o.x + d.x * e, y: o.y + d.y * e, z: o.z + d.z * e }, radius: 15 })) if (!seen.has(r.id)) rows.push(r); }
  for (const row of rows) {
    const b = ctx.getObject(row.id)?.bounds; if (!b) continue;
    let t0 = 0, t1 = maxT, ok = true;
    for (const k of ['x', 'y', 'z']) {
      if (Math.abs(d[k]) < 1e-6) { if (o[k] < b.min[k] || o[k] > b.max[k]) { ok = false; break; } continue; }
      let a = (b.min[k] - o[k]) / d[k], c = (b.max[k] - o[k]) / d[k]; if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) { ok = false; break; }
    }
    if (ok && (!best || t0 < best.t)) best = { id: row.id, t: t0 };
  }
  return best;
}
// the ray under the crosshair: { d: what the thing offers (or null), ground: where the ray landed, id }; a thing nobody described still gets a plain Examine
function pickWorld(ctx, me, input, reach = PICK) { // reach: a click sees everything (PICK); the 10 Hz hover looks HOVER_REACH m
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== 'number' || typeof a.pointerOriginX !== 'number') return null;
  let eye = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }; const p = here(me);
  if (Math.hypot(eye.x - p.x, eye.z - p.z) > 30) eye = { x: p.x, y: p.y + 1.6, z: p.z }; // preserve the actual camera ray through the full 24 m third-person zoom; only a stray origin falls back to the body
  const dir = { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 };
  let r = raycast(ctx, eye, dir, { distance: reach, ignoreEntities: [me.id] });
  const soft = rayBox(ctx, eye, dir, r ? r.distance : reach); // walk-through givers (tag hover-pick: a trigger body the ray passes) are picked by their drawn box
  if (soft) r = { id: soft.id, distance: soft.t, position: r?.position ?? null };
  if (!r) return null;
  const ground = r.position && Number.isFinite(r.position.x) && Math.hypot(r.position.x - p.x, r.position.z - p.z) < MENU.walkMax ? { x: r.position.x, y: r.position.y, z: r.position.z } : null;
  let o = r.id ? ctx.getObject(r.id) : null, top = o;
  for (let i = 0; o && i < 4; i++) {
    const d = describe(ctx, me, o); if (d) return { d, ground, id: d.id };
    if (!o.parent?.id) break;
    o = ctx.getObject(o.parent.id); if (o) top = o;
  }
  if (top && top.id) { const name = prettyName(top.state?.name ?? top.id); return { d: { head: name, entries: genericEntries(top.id, name), id: top.id, generic: true }, ground, id: top.id }; }
  return ground ? { d: null, ground, id: null } : null;
}
function pickWorldHits(ctx, me, input) {
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== 'number' || typeof a.pointerOriginX !== 'number') return [];
  const p = here(me); let eye = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 };
  if (Math.hypot(eye.x - p.x, eye.z - p.z) > 30) eye = { x: p.x, y: p.y + 1.6, z: p.z };
  const dir = { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 };
  const hits = [...(raycast(ctx, eye, dir, { distance: PICK, multiple: true, ignoreEntities: [me.id] }) ?? [])];
  const soft = rayBox(ctx, eye, dir, PICK); if (soft) hits.push({ id: soft.id, distance: soft.t });
  const out = [], seen = new Set();
  for (const h of hits.sort((x, y) => x.distance - y.distance)) {
    let o = h.id ? ctx.getObject(h.id) : null, top = o, d = null;
    for (let i = 0; o && i < 4; i++) { d = describe(ctx, me, o); if (d) break; if (!o.parent?.id) break; o = ctx.getObject(o.parent.id); if (o) top = o; }
    if (!d && top?.id) { const name = prettyName(top.state?.name ?? top.id); d = { head: name, entries: genericEntries(top.id, name), id: top.id, generic: true }; }
    if (d && !seen.has(d.id)) { seen.add(d.id); out.push({ d, distance: h.distance }); }
  }
  return out;
}
// --- mouse-over (OSRS): the thing under the crosshair gets an outline and a line "Attack Chicken (level-1) / 2 more options" in state.hover; ~10x a second
const HOVER = new Map();
function hoverScan(ctx, me, input) {
  const now = ctx.now(), h = HOVER.get(me.id) ?? { at: 0, key: '', hl: 0 };
  if (now - h.at < 100) return; h.at = now; HOVER.set(me.id, h);
  const s = me.state; let info = null;
  if (!s.dead && !s.ctxMenu) { const t = pickWorld(ctx, me, input, HOVER_REACH); if (t?.d && !t.d.generic && t.d.entries.length) info = hoverOf(withWalk(t.d.entries, t.ground), t.id); }
  const key = info ? `${info.id}|${info.verb}|${info.more}` : '';
  if (key !== h.key) { if (h.lit && h.lit !== info?.id) { const aud = { audience: { player: me.id } }; if (h.lit === (s.fight?.target ?? s.lock)) ctx.emit('highlightSet', { target: h.lit, color: lineColor(ctx.getObject(h.lit), 0.55), style: 'outline', duration: 3600000 }, aud); else ctx.emit('highlightClear', { target: h.lit }, aud); } h.lit = null; h.key = key; h.hl = 0; s.hover = info; } // the outline holds for as long as you hover, and clears the moment you look away (creator 2026-10-05)
  if (info && now - h.hl > 300) {
    h.hl = now; h.lit = info.id; const e = info.lvl ? 25 + Math.max(0, Math.min(120, 60 - 6 * (info.lvl - cbLevelOf(s)))) : null;
    ctx.emit('highlightSet', { target: info.id, color: lineColor(ctx.getObject(info.id), 0.4), style: 'outline', duration: 0.55 }, { audience: { player: me.id } });
  }
}
// --- Wynx command (creator 2026-10-06): click her to select, then click a spot and she travels there and waits
const WSEL = new Map() // player id -> selected Wynx id (this machine's memory)
function wynxSelect(ctx, me, id) {
  WSEL.set(me.id, id)
  ctx.emit('highlightSet', { target: id, color: 'oklch(0.9 0.1 100 / 0.4)', style: 'outline', duration: 0 }, { audience: { player: me.id } })
  ctx.emit('playSound', { clip: '/cdn/moodboard-painterly-fantasy/sfx-gryphon-chirp-alert.mp3', position: here(me), volume: 0.5 }, { audience: { player: me.id } })
  say(ctx, me, 'Wynx is watching you. Click where she should go.')
}
function wynxClick(ctx, me, input) {
  const id = WSEL.get(me.id); if (!id) return false
  const w = ctx.getObject(id); WSEL.delete(me.id)
  if (!w || w.state?.ridden) return false
  ctx.emit('highlightClear', { target: id }, { audience: { player: me.id } })
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== 'number') return true
  const p = here(me); let eye = { x: a.pointerOriginX ?? p.x, y: a.pointerOriginY ?? p.y + 1.6, z: a.pointerOriginZ ?? p.z }
  if (Math.hypot(eye.x - p.x, eye.z - p.z) > 30) eye = { x: p.x, y: p.y + 1.6, z: p.z }
  const r = raycast(ctx, eye, { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 }, { distance: PICK, ignoreEntities: [me.id, id] })
  if (!r?.position) { say(ctx, me, 'Wynx tilts her head. Click on the ground.'); return true }
  if (r.id === id) { wynxSelect(ctx, me, id); return true }
  w.state.goTo = { x: r.position.x, y: r.position.y, z: r.position.z }
  ctx.emit('fx', { position: r.position, script: WYNX_MARK }, { audience: { player: me.id } })
  ctx.emit('playSound', { clip: '/cdn/moodboard-painterly-fantasy/sfx-gryphon-screech-short.mp3', position: here(w), volume: 0.6 }, { audience: { player: me.id } })
  say(ctx, me, 'Wynx takes off for the spot.')
  return true
}
const WYNX_MARK = `fx
pop ring burst=1 life=.9 size=1.6 col=<1,.92,.3> a=1>0 sz=$size*(.3>1.4) rot=0 r=sprite(soft-disc,add)
pop spark burst=12 life=.5..0.8 on=disc(.4) v=up(1.5..3) size=.06..0.1 acc=grav()*.6 col=hdr(2.5,2,.6) a=1>0 sz=$size r=sprite(ember,add)`
function open(ctx, me, m) { me.state.ctxMenu = { ...m, n: ++nonce, at: { ...here(me) } }; }
// the classic shoulder rig (camera-router.js pick): O → Camera style 1, or Auto for Campton
function classicRig(me) { const c = me.state?.settings?.camStyle ?? 0; return c === 1 || c === 0 }
function beginWorldAction(ctx, me, d, id) {
  const s = me.state, o = id ? ctx.getObject(id) : null;
  if (!d || !o) return false;
  if (d.entries?.some((e) => e.t === 'attack')) { ctx.emit('cbEngage', { target: id }, { to: me.id }); return true; }
  const e = d.entries?.[0]; if (!e || e.t === 'say' || e.t === 'wynxSel') return false;
  if (e.t === 'wynxFollow') { o.state.goTo = null; WSEL.delete(me.id); return true; }
  const p = here(me), q = here(o), dx = p.x - q.x, dz = p.z - q.z, dist = Math.hypot(dx, dz) || 1;
  const reach = e.t === 'chop' ? 3.2 : e.t === 'press' || e.t === 'fish' || e.t === 'cook' ? 2.4 : 2.2;
  s.pendingInteract = { target: id, action: e.t, tree: d.tree, tool: e.tool, until: walkUntil(ctx, me, q.x, q.z) };
  s.walkTo = { x: q.x + dx / dist * reach, z: q.z + dz / dist * reach, until: walkUntil(ctx, me, q.x, q.z) };
  return true;
}
function runPending(ctx, me) {
  const s = me.state, w = s.pendingInteract; if (!w) return;
  const o = ctx.getObject(w.target); if (!o || ctx.now() > w.until) { s.pendingInteract = null; return; }
  const p = here(me), q = here(o); if (Math.hypot(q.x - p.x, q.z - p.z) > 3.5) return;
  s.pendingInteract = null; s.walkTo = null;
  if (w.action === 'press') ctx.emit('press', { by: me.id }, { to: o.id });
  else if (w.action === 'bury') ctx.emit('buryLoot', { obj: o.id }, { to: me.id });
  else if (w.action === 'chop') ctx.emit('chopTree', { tree: w.tree }, { to: me.id });
  else if (w.action === 'fish') ctx.emit('fishSpot', { spot: o.id, tool: w.tool }, { to: me.id });
  else if (w.action === 'cook') ctx.emit('cookAt', { src: o.id }, { to: me.id });
}
// the hover is scanned on a 10 Hz clock from the last aim we heard, not only when input arrives: a still mouse sends nothing, so an
// input-only scan kept the outline on whatever it last passed over and let a held hover fade (creator 2026-10-05)
const AIM = new Map();
// where the cursor sat, as camera-space tangents (tx = right/forward, ty = up/forward) + the lens: the HUD turns them into pixels
function cursorSpot(ctx, me, a) {
  if (!a || a.pointerLocked || !Number.isFinite(a.pointerDirX)) return null;
  // the rig's own angles: the OSRS orbit (camera.js tpYaw/tpPitch, 40° lens), the classic orbit (cYaw/cPitch), else the engine's camYaw/camPitch
  const S = ctx.session, fovSet = Math.max(VIEW.fovMin, Math.min(VIEW.fovMax, Number.isFinite(me.state?.fov) ? me.state.fov : VIEW.fovDefault));
  const [y, p, fov] = S.tpCam && Number.isFinite(S.tpYaw) ? [S.tpYaw, S.tpPitch ?? -Math.PI / 4, TP_FOV] : S.cOrbit && Number.isFinite(S.cYaw) ? [S.cYaw, S.cPitch ?? 0, fovSet] : [a.camYaw, a.camPitch ?? 0, fovSet];
  if (!Number.isFinite(y)) return null;
  const cp = Math.cos(p), f = [-Math.sin(y) * cp, Math.sin(p), -Math.cos(y) * cp], r = [Math.cos(y), 0, -Math.sin(y)];
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], d = [a.pointerDirX, a.pointerDirY, a.pointerDirZ];
  const dot = (v) => v[0] * d[0] + v[1] * d[1] + v[2] * d[2], z = dot(f); if (!(z > 0.01)) return null;
  return { tx: dot(r) / z, ty: dot(u) / z, fov };
}
const TP_FOV = 40; // scripts/camera.js TP.fov
const RCLICK_MS = 350; // a right press released within this is a click; longer is a hold
export const updateSchedule = { every: { seconds: 0.1 } };
export function update(ctx) { const me = ctx.self; if (me.isLocal === false) return; runPending(ctx, me); const a = AIM.get(me.id); if (a) hoverScan(ctx, me, a); }
export function onInput(ctx, input) {
  const me = ctx.self, s = me.state, pr = input.pressed ?? {}, d = input.actionData ?? {};
  if (me.isLocal === false) return;
  if (s?.te?.open && me.isEditor) return; // TERRAIN EDITOR mode: right-drag looks, no menu
  AIM.set(me.id, { axes: { ...(input.axes ?? {}) } });
  hoverScan(ctx, me, input);
  if (pr.menuClose || (pr.closeAll && (input.held?.runHold || input.actionData?.closeAll))) s.ctxMenu = null; // Shift+Down closes the menu too
  if (pr.use && !s.holding && !s.ctxMenu && wynxClick(ctx, me, input)) { /* the click went to Wynx */ }
  else if (pr.use && !s.holding && !s.ctxMenu) {
    const t = pickWorld(ctx, me, input);
    // (Campton 2026-10-06 "give me my controls back") Forge's OSRS click-to-walk is the orbit rig's: on the classic rig a left
    // click (and his left-hold camera turn) never walks him
    if (ctx.session.thirdPerson && !classicRig(me)) {
      if (t?.d?.wynx) wynxSelect(ctx, me, t.id);
      else if (t?.d && beginWorldAction(ctx, me, t.d, t.id)) { /* OSRS default action: interact or auto-approach */ }
      else if (t?.ground) { s.pendingInteract = null; s.walkTo = { x: t.ground.x, z: t.ground.z, until: walkUntil(ctx, me, t.ground.x, t.ground.z) }; ctx.emit('fx', { position: { x: t.ground.x, y: t.ground.y ?? ctx.place.terrain.heightAt(t.ground.x, t.ground.z) + 0.03, z: t.ground.z }, script: WYNX_MARK }, { audience: { player: me.id } }); }
    } else if (t?.d?.loot) ctx.emit('lootTake', { obj: t.id }, { to: me.id });
  }
  // creator 2026-10-06: "make it just click right click once ... remove the need to hold right click": the menu opens on a CLICK
  // (press + release inside RCLICK_MS); a held right button (the camera turn) never opens it. A press on an open menu closes it.
  const S = ctx.session, rel = input.released ?? {};
  if (pr.menuOpen) { S.rPtr = cursorSpot(ctx, me, input.axes); S.rDownAt = ctx.now(); S.rClosed = !!s.ctxMenu; if (s.ctxMenu) s.ctxMenu = null; }
  const rClick = rel.menuOpen && S.rDownAt != null && !S.rClosed && ctx.now() - S.rDownAt <= RCLICK_MS;
  if (rel.menuOpen) S.rDownAt = null;
  if (rClick) {
    if (!s.holding) {
      const t = pickWorld(ctx, me, input), hits = pickWorldHits(ctx, me, input), entries = [];
      for (const h of hits) for (const e of h.d.entries ?? []) entries.push({ ...e, targetId: h.d.id, tree: h.d.tree, target: e.target ?? h.d.head });
      const withGround = withWalk(entries, t?.ground); if (withGround.length) open(ctx, me, { ...(t?.d ?? {}), head: t?.d?.head ?? 'Ground', entries: withGround, id: t?.id ?? undefined, worldMenu: true, ...(S.rPtr ?? {}) }); // nx/ny: where the cursor was on the click (creator 2026-10-06)
      else ctx.emit('uiEvent', { name: 'menuNothing', payload: {} }, { audience: { player: me.id } });
    }
  }
  if (pr.menuAt) { // a pack or shop slot: the page sent where the cursor is, so the menu opens under it
    const q = d.menuAt ?? {}, inv = normInv(me.state.inv), x = Number.isFinite(q.x) ? q.x | 0 : undefined, y = Number.isFinite(q.y) ? q.y | 0 : undefined;
    const it = inv[q.i | 0]; let entries = [];
    if (q.k === 'inv' && it) { entries = invEntries(q.i | 0, it.id, it.id.startsWith('axe-')); }
    if (q.k === 'sell' && it && s.shopAt) { const stk = s.shopAt.shop === 'runes' ? null : shelfMap(ctx.world.state, s.shopAt.shop, ctx.now()); entries = shopSellEntries(q.i | 0, it.id, sellPrice(it.id, s.shopAt.shop, stk)); }
    if (q.k === 'spell') { entries = spellEntries(String(q.id)); }
    if (q.k === 'eq' && s.equip?.[q.slot]) { entries = eqEntries(String(q.slot), s.equip[q.slot]); }
    if (q.k === 'buy' && s.shopAt) { const stk = s.shopAt.shop === 'runes' ? null : shelfMap(ctx.world.state, s.shopAt.shop, ctx.now()), row = stockOf(s.shopAt.shop).find((x) => x.id === q.id); entries = shopBuyEntries(String(q.id), s.shopAt.shop, row && askPrice(s.shopAt.shop, row, stk)); }
    if (entries.length) open(ctx, me, { head: entries[0].target, entries, x, y });
  }
  if (pr.menuPick) {
    const m = s.ctxMenu, e = m?.entries?.[d.menuPick?.i | 0]; s.ctxMenu = null; if (!m || !e || d.menuPick?.n !== m.n) return;
    const targetId = e.targetId ?? m.id, o = targetId ? ctx.getObject(targetId) : null;
    if (e.t === 'say') say(ctx, me, e.txt);
    else if (e.t === 'attack') { if (o && !o.state?.down) ctx.emit('cbEngage', { target: o.id }, { to: me.id }); else say(ctx, me, "It's already down."); }
    else if (['press', 'chop', 'fish', 'cook', 'bury'].includes(e.t) && o) beginWorldAction(ctx, me, { entries: [e], tree: e.tree ?? m.tree }, o.id);
    else if (e.t === 'walk') { if (Number.isFinite(e.x) && Number.isFinite(e.z)) s.walkTo = { x: e.x, z: e.z, until: walkUntil(ctx, me, e.x, e.z) }; }
    else if (e.t === 'wynxSel' && o) wynxSelect(ctx, me, o.id);
    else if (e.t === 'wynxFollow' && o) { o.state.goTo = null; WSEL.delete(me.id); ctx.emit('highlightClear', { target: o.id }, { audience: { player: me.id } }); say(ctx, me, 'Wynx comes back to your side.'); }
  }
}
