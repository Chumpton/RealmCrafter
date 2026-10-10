import { ZONES as ZONE_ROWS } from './lib/data/zones.js';
import { teleportTo, flyTo, flightTick } from './travel-flight.js';
// BOARD-CLICK W7 (docs/board/proposals/BOARD-CLICK.md S2 + S6): every board in the den is aim + left click, on the player body.
// One pick per board-aim: the nearest board in reach that faces you, then board-kit hit() (one raycast that must meet THAT board),
// so the painter's layout (scripts/tex-board.js) is exactly what a click hits. By source (data/boards.js):
//   jev / rune  YES | NO | UNDO -> player.state.voteSend { n, id, vote, board, at } (camera-vote.js's words; vote-board-core judges it)
//               card body       -> pins the loupe (a 2.2x card drawn 3 cm off the face; its buttons are the targets while it stands)
//   judge       card -> player.state.judgeOpen (toggle, as judge-board-input.js did) · PREV / NEXT tab -> judge-board ears.page
//   huginn      card -> player.state.huginnOpen (toggle) · ISSUE / DISMISS -> huginn-board ears.mark (the creator's alone, judged there)
// Hover: every FEEL.aimRefreshMs, player.state.aim = { k: 'board', label: 'JEV 7 · YES', board, n, part } on change only; a local
// honey quad 1 cm over the hovered card / button; after BOARDS.loupe.dwellMs a local loupe; it fades 150 ms once the aim leaves.
// Also carried from the retired judge-/huginn-board-input.js: M map toggle, the HUD's ✕ (judgeClose / huginnClose), the HUD's
// ISSUE / DISMISS buttons (huginnIssue / huginnDismiss, payload n), 1-6 at the photo board, and walking off closes their windows.
import { isOn } from './lib/data/systems.js';
import { raycast } from 'builtin/physics';
import { rotate } from 'builtin/vec3';
import { BOARDS, boardById } from './lib/data/boards.js';
import { hit, cardLayout, layoutOf, toLocal } from './lib/board-kit.js';
import { FEEL } from './lib/data/home-feel.js';
import { VB as RUNE } from './lib/data/vote-board.js';
import { JB } from './lib/data/jev-board.js';

const HONEY = '#e8b96a', FADE_MS = 150, LIFT = 0.01, JUDGE = { near: 4.5, far: 6 }, HUGINN = { far: 7 };
const MAP_CLIP = 'cdn/moodboard-lowpoly-cozy/sfx-parchment-map-unroll.mp3';
const sc = (ctx, me) => ((ctx.session.boardIn ??= {})[me.id] ??= { at: 0, clickAt: 0, key: null, on: null, hov: null, hovAt: 0, quad: null,
  loupe: null, lp: null, lpOp: 0, pin: null, leftAt: 0, squashAt: 0, pickAt: -1, pick: null, input: null });
const busy = (s) => !!(s.holding || s.shovel || s.seatedOn || s.chessView?.on);

// ---- cards: the slot on the face -> the card row it shows
export function cardsOf(ctx, b) {
  const s = ctx.getObject(b.cardsRow)?.state ?? {};
  if (b.source === 'rune') { // vote-board-core's openCards: a sealed card leaves the face
    const seals = ctx.getObject('vote-board')?.state?.seals ?? {}, list = Array.isArray(s.cards) && s.cards.length ? s.cards : s.voteCards ?? [];
    return list.filter((c) => !(seals[c.id] && seals[c.id].hash === c.hash)).slice(0, RUNE.maxCards);
  }
  return Array.isArray(s.cards) ? s.cards : [];
}
export function cardAt(ctx, b, slot) {
  if (slot == null) return null;
  const cards = cardsOf(ctx, b);
  if (b.source === 'judge') return cards[(ctx.getObject(b.cardsRow)?.state?.off ?? 0) + slot - 1] ?? null;
  if (b.source === 'huginn') return cards.find((c) => +c.n === slot) ?? cards[slot - 1] ?? null;
  return cards.find((c) => +c.n === slot) ?? null; // jev / rune paint by n
}
const numOf = (b, c, slot) => (b.source === 'huginn' ? c?.h ?? c?.n ?? slot : c?.n ?? slot);

// ---- the face frame: face-local (u, v, lift) -> world, and the rotation a plane needs to face out of it
function facePoint(o, b, u, v, out) {
  const f = b.face, feet = o.worldFeetPosition ?? o.feetPosition;
  const w = rotate(o.rotation ?? 0, { x: f.w / 2 - u * f.w, y: f.y0 + f.h - v * f.h, z: f.z - out });
  return { x: feet.x + w.x, y: feet.y + w.y, z: feet.z + w.z };
}
function faceRot(r) { // a plane faces +Z; the face looks down local -Z: the row's rotation then a half turn
  if (r && typeof r.w === 'number') return { x: -r.z, y: r.w, z: r.x, w: -r.y };
  return { yaw: (typeof r === 'number' ? r : r?.yaw ?? 0) + 180 };
}
function loupeRect(b, slot) {
  const c = layoutOf(b)?.cells?.[slot - 1]?.card; if (!c) return null;
  const k = BOARDS.loupe.scale, w = Math.min(1, (c.u1 - c.u0) * k), h = Math.min(1, (c.v1 - c.v0) * k);
  const cu = Math.min(1 - w / 2, Math.max(w / 2, (c.u0 + c.u1) / 2)), cv = Math.min(1 - h / 2, Math.max(h / 2, (c.v0 + c.v1) / 2));
  return { u0: cu - w / 2, v0: cv - h / 2, u1: cu + w / 2, v1: cv + h / 2 };
}

// ---- the pick: nearest board in reach, in front of it, then the kit's hit (the ray must meet that board)
function nearBoard(ctx, me, input) {
  const a = input?.axes ?? {}, eye = typeof a.pointerOriginX === 'number' ? { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 } : me.worldFeetPosition ?? me.feetPosition;
  let best = null, bd = BOARDS.reach + 1.5;
  for (const b of BOARDS.list) {
    const o = ctx.getObject(b.id); if (!o) continue;
    const f = o.worldFeetPosition ?? o.feetPosition, d = Math.hypot(eye.x - f.x, eye.z - f.z);
    if (d >= bd) continue;
    const l = toLocal(o.rotation ?? 0, { x: eye.x - f.x, y: eye.y - f.y, z: eye.z - f.z });
    if (l.z > b.face.z) continue; // behind the board
    best = b; bd = d;
  }
  return best;
}
// boardAimed(ctx, me, input) -> { b, h, on } | null: on = the ray met the board (even between cards); h = the kit's hit or null.
// Memoised per tick, so player-feel-core's clickIsE and this script share one raycast.
export function boardAimed(ctx, me, input) {
  const s = sc(ctx, me), now = ctx.now();
  if (s.pickAt === now && s.pickIn === input) return s.pick;
  s.pickAt = now; s.pickIn = input; s.pick = null;
  const b = nearBoard(ctx, me, input); if (!b) return null;
  const rec = {}, lp = s.lp && s.lp.board === b.id ? { n: s.lp.slot, rect: s.lp.rect } : undefined;
  const h = hit(ctx, b, input, { loupe: lp, ignore: [me.id], raycast: (c, o, d, op) => (rec.r = raycast(c, o, d, op)) });
  const id = String(rec.r?.id ?? ''), on = id === b.id || id.startsWith(b.id + '/');
  if (!on) return null;
  if (h && h.n != null && b.source !== 'judge' && !cardAt(ctx, b, h.n)) h.part = null; // an empty slot
  s.pick = { b, h: h && (h.tab || h.part) ? h : null, on };
  return s.pick;
}

// ---- the local marks: honey quad + loupe (audience local, no collider)
function kill(ctx, id) { if (id && ctx.getObject(id)) ctx.destroy(id); }
function placeQuad(ctx, s, o, b, r, out) {
  const p = facePoint(o, b, (r.u0 + r.u1) / 2, (r.v0 + r.v1) / 2, out), scale = { x: (r.u1 - r.u0) * b.face.w, y: (r.v1 - r.v0) * b.face.h, z: 1 };
  const q = s.quad && ctx.getObject(s.quad);
  if (q) { q.feetPosition = p; q.rotation = faceRot(o.rotation); q.scale = scale; s.quadScale = scale; return; }
  s.quad = ctx.spawn({ audience: 'local', tags: ['board-hover'], primitive: { kind: 'plane', width: 1, height: 1 }, anchor: 'center', pivot: 'center', feetPosition: p, rotation: faceRot(o.rotation), scale,
    castShadow: false, receiveShadow: false, material: { color: HONEY, emissive: HONEY, emissiveIntensity: 0.35, transparent: true, opacity: 0.26, depthWrite: false } });
  s.quadScale = scale;
}
function openLoupe(ctx, s, o, b, slot, card) {
  const rect = loupeRect(b, slot); if (!rect) return;
  kill(ctx, s.loupe);
  const d = encodeURIComponent(JSON.stringify([{ n: card.n, id: card.id, title: card.title, body: card.body, chips: card.chips, pic: card.pic, mine: card.mine }]));
  const tex = `scripts/tex-board.js?board=${b.id}&loupe=1&card=${card.n}&flip=false&d=${d}`;
  s.loupe = ctx.spawn({ audience: 'local', tags: ['board-loupe'], primitive: { kind: 'plane', width: 1, height: 1 }, anchor: 'center', pivot: 'center',
    feetPosition: facePoint(o, b, (rect.u0 + rect.u1) / 2, (rect.v0 + rect.v1) / 2, BOARDS.loupe.out), rotation: faceRot(o.rotation),
    scale: { x: (rect.u1 - rect.u0) * b.face.w, y: (rect.v1 - rect.v0) * b.face.h, z: 1 }, castShadow: false, receiveShadow: false,
    material: { texture: tex, color: '#ffffff', roughness: 0.85, transparent: true, opacity: 1 } });
  s.lp = { board: b.id, slot, rect, id: card.id }; s.lpOp = 1;
}
function closeLoupe(ctx, s) { kill(ctx, s.loupe); s.loupe = null; s.lp = null; s.pin = null; s.lpOp = 0; }
function setAim(me, a) {
  const cur = me.state.aim;
  if (!a) { if (cur?.k === 'board') me.state.aim = null; return; }
  if (cur?.k === 'board' && cur.label === a.label && cur.board === a.board && cur.n === a.n && cur.part === a.part) return;
  me.state.aim = a;
}

// ---- hover: runs from onInput and update, paced by FEEL.aimRefreshMs; the fade and the squash run every call
function hover(ctx, me, input, force) {
  const s = sc(ctx, me), now = ctx.now();
  if (busy(me.state)) { if (s.on || s.quad || s.loupe) { kill(ctx, s.quad); s.quad = null; closeLoupe(ctx, s); s.on = null; s.key = null; setAim(me, null); } return; }
  if (force || now - s.at >= FEEL.aimRefreshMs) {
    s.at = now;
    const p = input ? boardAimed(ctx, me, input) : null, h = p?.h, b = p?.b;
    s.on = p?.on ? b.id : null;
    const card = h?.n != null ? cardAt(ctx, b, h.n) : null;
    const key = p ? `${b.id}:${h?.tab ?? ''}:${h?.n ?? ''}:${h?.part ?? ''}` : null;
    if (key !== s.key) {
      s.key = key;
      if (!p) setAim(me, null);
      else setAim(me, { k: 'board', label: h?.tab ? `${b.name} · ${h.tab}` : card ? `${b.name} ${numOf(b, card, h.n)}${h.part && h.part !== 'body' ? ' · ' + h.part : ''}` : b.name,
        board: b.id, n: h?.n ?? null, part: h?.tab ?? h?.part ?? null });
      const o = p && ctx.getObject(b.id), inLoupe = !!(s.lp && s.lp.board === b?.id && h?.n === s.lp.slot && s.loupe);
      let r = null, out = LIFT;
      if (o && h?.tab) r = layoutOf(b).tabs.find((t) => t.name === h.tab)?.rect;
      else if (o && card) {
        if (inLoupe) { const L = cardLayout(s.lp.rect, b.buttons); r = h.part === 'body' ? L.body : L.buttons.find((x) => x.name === h.part)?.rect; out = BOARDS.loupe.out + LIFT; }
        else { const c = layoutOf(b).cells[h.n - 1]; r = h.part === 'body' ? c?.card : c?.buttons.find((x) => x.name === h.part)?.rect ?? c?.card; }
      }
      if (r) placeQuad(ctx, s, o, b, r, out); else { kill(ctx, s.quad); s.quad = null; }
      const hk = card ? `${b.id}:${h.n}` : null;
      if (hk !== s.hov) { s.hov = hk; s.hovAt = now; }
    }
    // the loupe: a card rested on 350 ms opens it; it stands while the aim stays on it (or its board, pinned)
    const o = b && ctx.getObject(b.id);
    if (card && o && !(s.lp && s.lp.board === b.id && s.lp.slot === h.n) && now - s.hovAt >= BOARDS.loupe.dwellMs) openLoupe(ctx, s, o, b, h.n, card);
    const keep = s.lp && p && s.lp.board === b.id && (s.pin === s.lp.id || h?.n === s.lp.slot);
    if (s.lp && !keep) { if (!s.leftAt) s.leftAt = now; } else s.leftAt = 0;
  }
  if (s.leftAt && s.loupe) { // fade out over 150 ms once the aim leaves
    const t = (now - s.leftAt) / FADE_MS, l = ctx.getObject(s.loupe);
    if (t >= 1 || !l) { closeLoupe(ctx, s); s.leftAt = 0; s.key = null; }
    else { const op = Math.max(0, 1 - t); if (Math.abs(op - s.lpOp) > 0.05) { s.lpOp = op; l.material = { ...(l.material ?? {}), transparent: true, opacity: op }; } }
  }
  if (s.squashAt && s.quad) { // the card gives under the click: 0.9 -> 1 over 180 ms
    const t = (now - s.squashAt) / 180, q = ctx.getObject(s.quad), k = t >= 1 ? 1 : 0.9 + 0.1 * t;
    if (q && s.quadScale) q.scale = { x: s.quadScale.x * k, y: s.quadScale.y * k, z: 1 };
    if (t >= 1) s.squashAt = 0;
  }
}

// ---- the click
export function clickBoard(ctx, me, input) {
  const s = sc(ctx, me), now = ctx.now();
  if (now - s.clickAt < BOARDS.debounceMs) return { done: 'debounce' };
  const p = boardAimed(ctx, me, input); if (!p) return null;
  s.clickAt = now;
  const { b, h } = p; if (!h) return { done: 'nothing' };
  const o = ctx.getObject(b.id), feel = () => ctx.emit('haptic', { kind: 'soft' }, { audience: { player: me.id } });
  if (h.tab) { if (b.source === 'judge') { ctx.emit('page', { dir: h.tab === 'PREV' ? -1 : 1, by: me.id }, { to: b.id }); feel(); } return { done: 'tab', tab: h.tab }; }
  const c = cardAt(ctx, b, h.n); if (!c) return { done: 'empty' };
  if (b.source === 'jev' || b.source === 'rune') {
    if (h.part === 'YES' || h.part === 'NO' || h.part === 'UNDO') {
      me.state.voteSend = { n: c.n, id: c.id, vote: h.part, board: b.source === 'jev' ? JB.id : null, at: now };
      ctx.emit('playSound', { clip: RUNE.sounds.seal, position: facePoint(o, b, h.u, h.v, 0), volume: 0.55 });
      s.squashAt = now; feel();
      return { done: 'vote', vote: h.part, id: c.id, n: c.n };
    }
    if (s.pin === c.id) { s.pin = null; return { done: 'unpin' }; }
    if (!(s.lp && s.lp.id === c.id)) openLoupe(ctx, s, o, b, h.n, c);
    s.pin = c.id; s.leftAt = 0; feel();
    return { done: 'pin', id: c.id };
  }
  if (b.source === 'judge') { me.state.judgeOpen = me.state.judgeOpen === c.n ? null : c.n; feel(); return { done: 'judge', n: c.n }; }
  if (b.source === 'huginn') {
    if (h.part === 'ISSUE' || h.part === 'DISMISS') { ctx.emit('mark', { n: c.n, id: c.id, kind: h.part === 'ISSUE' ? 'pin' : 'dismiss', by: me.id }, { to: b.id }); s.squashAt = now; feel(); return { done: 'mark', part: h.part, id: c.id }; }
    if (me.state.judgeOpen == null) me.state.huginnOpen = me.state.huginnOpen !== c.n ? c.n : null;
    feel(); return { done: 'huginn', n: c.n };
  }
  return null;
}

// the HUD windows' own keys and walk-off, carried from judge-board-input.js / huginn-board-input.js
function windows(ctx, me, input) {
  const pr = input.pressed ?? {}, s = me.state, here = me.worldFeetPosition ?? me.feetPosition;
  const dist = (id) => { const o = ctx.getObject(id), f = o && (o.worldFeetPosition ?? o.feetPosition); return f ? Math.hypot(here.x - f.x, here.z - f.z) : Infinity; };
  if (pr.judgeClose) s.judgeOpen = null;
  const closeAll = pr.closeAll && (input.held?.runHold || input.actionData?.closeAll);
  if (pr.huginnClose || closeAll) s.huginnOpen = null;
  if (closeAll) { if (s.huginnMap) s.huginnMap = false; if (s.judgeOpen != null) s.judgeOpen = null; }
  for (const act of ['huginnIssue', 'huginnDismiss']) if (pr[act]) {
    const n = input.actionData?.[act]?.n, c = cardAt(ctx, boardById('huginn-board'), n);
    if (c) ctx.emit('mark', { n: c.n, id: c.id, kind: act === 'huginnIssue' ? 'pin' : 'dismiss', by: me.id }, { to: 'huginn-board' });
  }
  if (s.judgeOpen != null || pr.pluck1 || pr.pluck2 || pr.pluck3 || pr.pluck4 || pr.pluck5 || pr.pluck6) {
    const d = dist('judge-board');
    if (d > JUDGE.far) { if (s.judgeOpen != null) s.judgeOpen = null; }
    else if (d <= JUDGE.near) for (let k = 1; k <= 6; k++) if (pr['pluck' + k]) { const c = cardAt(ctx, boardById('judge-board'), k); if (c) s.judgeOpen = s.judgeOpen === c.n ? null : c.n; break; }
  }
  if (s.huginnOpen != null && dist('huginn-board') > HUGINN.far) s.huginnOpen = null;
}

export function onInput(ctx, input) {
  // M is HUGINN's map: it rides the HUGINN switch, not the paused board (creator Oct 5: "M doesnt open HUGINN map")
  { // creator 2026-10-06: M is the parchment map of Mellowbrook for everyone; HUGINN's map opens from a button on it (editors, HUGINN on)
    const pr = input.pressed ?? {}, me = ctx.self, at = me.worldFeetPosition ?? me.feetPosition;
    if (pr.huginnMap) {
      if (input.actionData?.huginnMap?.huginn && isOn(ctx, 'huginn')) { me.state.huginnMap = !me.state.huginnMap; me.state.worldMap = false; }
      else { me.state.worldMap = !me.state.worldMap; if (me.state.huginnMap) me.state.huginnMap = false; }
      ctx.emit('playSound', { clip: MAP_CLIP, position: at, volume: 0.45 });
    }
    if (pr.closeAll && (input.held?.runHold || input.actionData?.closeAll) && me.state.worldMap) me.state.worldMap = false;
    if (pr.mapZone) mapZone(ctx, me, input.actionData?.mapZone ?? {});
    flightTick(ctx, 0); // a map flight's autopilot speaks after the rider's own keys (scripts/travel-flight.js)
  }
  if (!isOn(ctx, 'board')) return; // DEN SYSTEMS gate
  const me = ctx.self, s = sc(ctx, me);
  s.input = input;
  windows(ctx, me, input);
  if (input.pressed?.use && !busy(me.state)) {
    const r = clickBoard(ctx, me, input);
    if (r?.done && r.done !== 'debounce') { s.key = null; hover(ctx, me, input, true); return; }
    if (!r && me.state.judgeOpen != null) me.state.judgeOpen = null; // a click off the boards closes the photo window, as before
  }
  hover(ctx, me, input, false);
}
export function update(ctx, dt) {
  const me = ctx.self; if (me.isLocal === false) return;
  flightTick(ctx, dt ?? 0);
  const s = ctx.session.boardIn?.[me.id]; if (!s || (!s.on && !s.quad && !s.loupe && !s.hov)) return;
  hover(ctx, me, s.input, false);
}

// The painted map's zones (creator 2026-10-09: select and rename zones). Selection and pick mode are the viewer's own
// (player.state.mapUi); the zone list is the room's (world.state.mapZones, copied from ZONES on the first edit).
const MAP_FR = { x0: -720, z0: -720, w: 2436, h: 1872 };
function mapZone(ctx, me, d) {
  const ui = { ...(me.state.mapUi ?? {}) }, ws = ctx.world.state;
  const list = () => (Array.isArray(ws.mapZones) && ws.mapZones.length ? ws.mapZones : ZONE_ROWS).map((q) => ({ name: q.name, x: q.x, z: q.z }));
  const ed = !!me.isEditor, at = me.worldFeetPosition ?? me.feetPosition;
  const blip = (clip) => ctx.emit('playSound', { clip, position: at, volume: 0.35 });
  if (d.op === 'sel') { ui.sel = ui.sel === d.i ? null : d.i; ui.mode = null; blip(MAP_CLIP); }
  else if (d.op === 'mode' && ed) ui.mode = ui.mode === d.mode ? null : d.mode;
  else if (d.op === 'click') {
    const x = Math.round(MAP_FR.x0 + d.u * MAP_FR.w), z = Math.round(MAP_FR.z0 + d.v * MAP_FR.h);
    if (ed && ui.mode === 'move' && Number.isInteger(ui.sel)) { const L = list(); if (L[ui.sel]) { L[ui.sel] = { ...L[ui.sel], x, z }; ws.mapZones = L; } ui.mode = null; blip(MAP_CLIP); }
    else if (ed && ui.mode === 'add') { const L = list(); L.push({ name: 'New Zone ' + (L.length + 1), x, z }); ws.mapZones = L; ui.sel = L.length - 1; ui.mode = null; blip(MAP_CLIP); }
    else { ui.sel = null; ui.mode = null; }
  }
  else if (d.op === 'rename' && ed) { const L = list(), n = String(d.name ?? '').replace(/[<>]/g, '').trim().slice(0, 32); if (L[d.i] && n) { L[d.i] = { ...L[d.i], name: n }; ws.mapZones = L; blip(MAP_CLIP); } }
  else if (d.op === 'del' && ed) { const L = list(); if (L.length > 1 && L[d.i]) { L.splice(d.i, 1); ws.mapZones = L; } ui.sel = null; ui.mode = null; }
  else if (d.op === 'reset' && ed) { delete ws.mapZones; ui.sel = null; ui.mode = null; }
  else if (d.op === 'tp') {
    const q = list()[d.i]; if (q && teleportTo(ctx, me, q)) ui.sel = null; // creator 2026-10-09: everyone may travel from the map
  }
  else if (d.op === 'fly') { const q = list()[d.i]; if (q && flyTo(ctx, me, q)) ui.sel = null; }
  me.state.mapUi = ui;
}
