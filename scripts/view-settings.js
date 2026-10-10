import { SYSTEMS as DEN_SYSTEMS } from './lib/data/systems.js';
import { SONGS } from './lib/data/turning-day.js';
import { applySetting } from './lib/settings-core.js';
import { flipKeeper } from './lib/devbook-access.js';
// The player's own view settings. O opens / closes the settings plate; the slider's setFov lands here.
// player.state.fov is this player's save, so their FoV follows them into every room.
// The saved FoV is also written onto this player's camera layer (player.camera.fov) whenever the two
// differ — on the slider, on arrival, after a rejoin — so the lens and the save never disagree.
import { VIEW } from './lib/data/view-settings.js';
import { WX } from './lib/data/wx-desk.js';
import { WAKE } from './lib/data/wake.js';
import { VL } from './lib/data/vote-ledger.js';
import { readTexts, parseLedger, parsePriority, renderPriority } from './lib/vote-ledger.js';
import { SYSTEMS, PRESETS, DEFAULT_PCT, FOCUS, OC, ocFuse } from './lib/data/jev-master.js'; // JEV-MASTER L4 · LIVE L3 (OC, ocFuse)
import { buildBrief, writeBrief } from './lib/jev-focus.js';
const SKALD_ID = 'lore-skald'; // the settings plate's Rolf switch: one shared row, everyone in the den hears the same Rolf
export const updateSchedule = { every: { seconds: VIEW.syncSeconds } };
// VOTE-LEDGER L3+L5 (docs/board/proposals/VOTE-LEDGER.md): MY VOTES, the creator's alone (isEditor + WAKE.owner; the actor is ctx.self, never a payload).
// V-a: player.state.ledger = { open, tab, filter, at } only; the rows ride one uiEvent to his own client on open, tab, filter, ★ and "star JEV's five".
const PIN_ID = /^(?:[DS]\d+|M[DS]\d+)$/;
const isCreator = (ctx) => !!ctx.self.isEditor && ctx.self.userId === WAKE.owner;
const okTab = (t) => (typeof t === 'string' && Object.prototype.hasOwnProperty.call(VL.tabs, t) ? t : null);
const okFilter = (f) => (typeof f === 'string' && VL.statuses.includes(f) ? f : null);
function ledgerSend(ctx, texts, note) {
  const L0 = ctx.self.state.ledger ?? {};
  const tab = okTab(L0.tab) ?? 'all', filter = okFilter(L0.filter);
  const L = parseLedger(texts, { now: ctx.now(), tab: tab === 'all' ? null : tab, filter, max: VL.rowsMax });
  const P = parsePriority(texts.priority);
  const payload = { rows: L.rows, totals: L.totals, disagree: L.disagree, pins: P.pins, unpinned: P.unpinned, jev: P.jev, at: ctx.now(), tab, filter, count: L.count, truncated: L.truncated, note: note ?? null };
  ctx.emit('uiEvent', { name: 'voteLedger', payload }, { audience: { player: ctx.self.id } });
  return payload;
}
function pendingIds(texts) { return new Set(parseLedger(texts, { max: Infinity }).rows.filter((r) => r.status === 'PENDING').map((r) => r.id)); }
function writePriority(ctx, texts, P, pins) {
  const next = renderPriority({ ...P, pins });
  if (next !== texts.priority) { ctx.files.write(VL.files.priority, next); texts.priority = next; }
}
function voteLedgerInput(ctx, input) {
  const s = ctx.self.state;
  const vl = input.actionData?.voteLedger, pin = input.actionData?.votePin, star = input.pressed?.voteStarJev;
  if (!(vl || pin || star) || !isCreator(ctx)) return;
  const cur = s.ledger ?? {};
  const op = vl?.op;
  if (op === 'close') { s.ledger = { open: false, tab: okTab(cur.tab) ?? 'all', filter: okFilter(cur.filter), at: ctx.now() }; return; }
  if (op === 'open' || op === 'tab' || op === 'filter') {
    const tab = op === 'tab' ? okTab(vl.v) ?? 'all' : op === 'open' && okTab(vl.v) ? vl.v : okTab(cur.tab) ?? 'all';
    const filter = op === 'filter' ? okFilter(vl.v) : op === 'tab' ? okFilter(cur.filter) : okFilter(cur.filter);
    s.ledger = { open: true, tab, filter, at: ctx.now() };
    if (!pin && !star) { ledgerSend(ctx, readTexts(ctx)); return; }
  }
  const texts = readTexts(ctx), P = parsePriority(texts.priority);
  let pins = [...P.pins], note = null;
  if (pin) {
    const id = typeof pin.id === 'string' ? pin.id.trim().toUpperCase() : '';
    if (!PIN_ID.test(id)) note = 'no such card';
    else if (pins.includes(id)) { pins = pins.filter((x) => x !== id); note = `${id} unpinned`; }
    else if (!pendingIds(texts).has(id)) note = `${id} is not pending: only a waiting build takes a ★`;
    else if (pins.length >= VL.pinCap) note = `${VL.pinCap} pins already: unpin one first (a wall of stars is no priority)`;
    else { pins.push(id); note = `${id} pinned #${pins.length}`; }
  } else if (star) {
    const pend = pendingIds(texts), added = [], skipped = [];
    for (const p of P.jev?.picks ?? []) {
      if (pins.includes(p.id)) continue;
      if (!pend.has(p.id)) skipped.push(`${p.id} not pending`);
      else if (pins.length >= VL.pinCap) skipped.push(`${p.id} over the ${VL.pinCap}-pin cap`);
      else { pins.push(p.id); added.push(p.id); }
    }
    note = !P.jev ? 'JEV has not suggested yet' : `starred ${added.length ? added.join(', ') : 'none new'}${skipped.length ? ' · skipped ' + skipped.join(', ') : ''}`;
  }
  writePriority(ctx, texts, P, pins); // one ctx.files.write (one commit) when the pins changed, none when refused
  if (!s.ledger?.open) s.ledger = { open: true, tab: okTab(cur.tab) ?? 'all', filter: okFilter(cur.filter), at: ctx.now() };
  ledgerSend(ctx, texts, note);
}
// JEV-MASTER L4 (docs/board/proposals/JEV-MASTER.md): the desk. The owner alone writes world.state.jevMaster; the window's open flag is his own player.state.jevDesk.
const SYS_IDS = SYSTEMS.map((x) => x.id);
function jevMasterInput(ctx, input) {
  const a = input.actionData?.jevMaster; if (!a || typeof a !== 'object' || !isCreator(ctx)) return;
  const s = ctx.self.state;
  if (a.op === 'open') { s.jevDesk = { open: true }; return; }
  if (a.op === 'close') { s.jevDesk = { open: false }; return; }
  const cur = ctx.world.state.jevMaster ?? {};
  const pct = Object.fromEntries(SYS_IDS.map((id) => [id, typeof cur.pct?.[id] === 'number' ? cur.pct[id] : DEFAULT_PCT]));
  let preset = cur.preset ?? 'high', theme = cur.theme ?? null, auto = cur.auto !== false, typed;
  if (a.op === 'pct' && SYS_IDS.includes(a.id) && typeof a.v === 'number' && isFinite(a.v)) { pct[a.id] = Math.max(0, Math.min(100, Math.round(a.v / 5) * 5)); preset = 'custom'; }
  else if (a.op === 'preset') { const P = PRESETS.find((x) => x.id === a.id); if (!P) return; for (const id of SYS_IDS) pct[id] = P.id === 'oc' && id === 'chess' ? 100 : P.pct; preset = P.id; } // LIVE L3: Overclock holds chess at 100
  else if (a.op === 'theme' && typeof a.v === 'string') { typed = a.v.replace(/[\r\n]+/g, ' ').trim().slice(0, FOCUS.themeMax); if (!typed) return; theme = typed.slice(0, FOCUS.themeRow); auto = false; }
  else if (a.op === 'auto') { auto = true; theme = null; }
  else return;
  const at = ctx.now(), next = { pct, preset, theme, auto, at };
  // JEV-MASTER-LIVE L3: mode history (≤ 8) on a preset press; Overclock arms a fuse, any other press disarms it
  let hist = Array.isArray(cur.hist) ? cur.hist : [];
  if (a.op === 'preset') hist = [...hist, [at, preset]].slice(-8);
  else if (a.op === 'pct' && cur.preset !== 'custom') hist = [...hist, [at, 'custom']].slice(-8);
  next.hist = hist;
  if (a.op === 'preset' && preset === 'oc') next.ocUntil = at + OC.minutes * 60e3;
  else if (a.op !== 'theme' && a.op !== 'auto' && cur.preset === 'oc' && preset !== 'oc') delete next.ocUntil;
  else if (preset === 'oc' && typeof cur.ocUntil === 'number') next.ocUntil = cur.ocUntil;
  ctx.world.state.jevMaster = next;
  if (a.op === 'theme' || a.op === 'auto') writeBrief(ctx, buildBrief(ctx, next, auto ? null : typed)); // the brief shows the new theme at once; board-jev refreshes it after
}
function clampFov(v) { return Math.max(VIEW.fovMin, Math.min(VIEW.fovMax, Math.round(v))); }
function syncLens(ctx) {
  const f = ctx.self.state.fov;
  if (typeof f !== 'number' || !isFinite(f)) return;
  const cam = ctx.self.camera;
  if (cam && cam.fov !== f) cam.fov = f;
}
export function onSpawn(ctx) { if (ctx.self.state.maOn) ctx.self.state.maOn = false; } // a join never opens in Move Anything
export function onInput(ctx, input) {
  const s = ctx.self.state;
  if (input.pressed.options && s.sysOpen) { s.sysOpen = false; } else if (input.pressed.options) { s.optionsOpen = !s.optionsOpen; if (!s.optionsOpen && s.ledger?.open) s.ledger = { ...s.ledger, open: false, at: ctx.now() }; if (!s.optionsOpen && s.jevDesk?.open) s.jevDesk = { open: false }; } // O closing closes MY VOTES too
  if (input.pressed.maToggle) { s.maOn = !s.maOn; } // creator 2026-10-06: the O menu stays open in Move Anything so it can be moved and sized // MOVE ANYTHING unlock mode
  if (input.pressed.maOff && s.maOn) s.maOn = false; // ` finishes Move Anything
  if (input.pressed.maReset) s.moveAny = {};
  const ma = input.actionData?.maSet; // MOVE ANYTHING: one HUD element's offset + scale, this player's own layout
  if (ma && typeof ma.id === 'string' && /^[a-z][a-z0-9_-]{0,39}$/i.test(ma.id) && [ma.x, ma.y, ma.s].every((n) => typeof n === 'number' && isFinite(n))) {
    const m = { ...(s.moveAny ?? {}) }, x = Math.max(-4000, Math.min(4000, Math.round(ma.x))), y = Math.max(-4000, Math.min(4000, Math.round(ma.y))), sc = Math.max(0.5, Math.min(2, Math.round(ma.s * 100) / 100));
    if (x === 0 && y === 0 && sc === 1) delete m[ma.id]; else if (m[ma.id] || Object.keys(m).length < 60) m[ma.id] = [x, y, sc];
    s.moveAny = m;
  }
  const mh = input.actionData?.maHide; // MOVE ANYTHING: hide/show one HUD piece (ghosted at 15% while unlocked)
  if (mh && typeof mh.id === 'string' && /^[a-z][a-z0-9_-]{0,39}$/i.test(mh.id) && !/^(ma-|move-anything)|options/i.test(mh.id)) {
    const h = { ...(s.maHidden ?? {}) }; if (mh.hide) { if (Object.keys(h).length < 60) h[mh.id] = 1; } else delete h[mh.id]; s.maHidden = h;
  }
  const mv = input.actionData?.maHover; // the piece whose ring is full (the HUD tells us); X toggles its hide
  if (mv && typeof mv.id === 'string') s.maHov = mv.id;
  if (input.pressed.maHideKey && s.maOn && s.maHov && /^[a-z][a-z0-9_-]{0,39}$/i.test(s.maHov) && !/^(ma-|move-anything)|options/i.test(s.maHov)) {
    const h = { ...(s.maHidden ?? {}) }; if (h[s.maHov]) delete h[s.maHov]; else if (Object.keys(h).length < 60) h[s.maHov] = 1; s.maHidden = h;
  }
  if (!s.maOn && s.maHov) s.maHov = '';
  if (input.pressed.maShowAll) s.maHidden = {};
  if (input.pressed.closeAll && (input.held?.runHold || input.actionData?.closeAll)) { s.optionsOpen = false; s.sysOpen = false; if (s.ledger?.open) s.ledger = { ...s.ledger, open: false, at: ctx.now() }; if (s.jevDesk?.open) s.jevDesk = { open: false }; if (s.bugOpen != null) s.bugOpen = null; if (s.bugDraft != null) s.bugDraft = null; s.bugTag = false; if (s.travelOpen) s.travelOpen = false; if (s.shopAt) s.shopAt = null; if (s.skillsOpen) s.skillsOpen = false; if (s.skillDebugOpen) s.skillDebugOpen = false; if (s.questWin) s.questWin = null; } // Shift+Down (page key in ui.js): every server-side window shut at once
  if (input.pressed.sysWin) s.sysOpen = !s.sysOpen; // DEN SYSTEMS window (O → DEN SYSTEMS ▸)
  const st = input.actionData?.sysToggle; // DEN SYSTEMS: a builder flips one system; '*off' pauses every one
  if (st && ctx.self.isEditor && typeof st.id === 'string') {
    const cur = { ...(ctx.world.state.systems ?? {}) };
    if (st.id === '*off') { for (const k in cur) cur[k] = false; } else if (DEN_SYSTEMS.some((x) => x.id === st.id)) cur[st.id] = cur[st.id] !== true;
    ctx.world.state.systems = cur;
  }
  voteLedgerInput(ctx, input);
  jevMasterInput(ctx, input);
  if (input.pressed.ormAlways) ctx.place.state.ormAlways = !ctx.place.state.ormAlways; // O menu: Orm plays Rolf's guitar in every rest / on his own time
  if (input.pressed.ulfAlways) ctx.place.state.ulfAlways = !ctx.place.state.ulfAlways; // O menu: Ulf plays the hall lyre always / on his own time
  for (const [act, key] of [['devbookSee', 'visitorsSee'], ['devbookReact', 'visitorsReact']]) if (input.pressed[act]) { const n = flipKeeper(ctx.world.state, key, ctx.self.isEditor); if (n) ctx.world.state.devbook = n; } // O → Chat: Dev Tracker keeper rows
  if (input.pressed.jevWander && ctx.self.isEditor) ctx.place.state.jevWander = ctx.place.state.jevWander === false; // O menu: JEV wanders from Hugsæti (absent = on, WANDER.on)
  if (input.pressed.rolfAlways) { const r = ctx.getObject(SKALD_ID); if (r) r.state.always = !r.state.always; }
  const wx = input.actionData?.setWx; // W22 weather desk: only a builder (the den's owner) steers the shared sky
  if (wx && ctx.self.isEditor && ['rain', 'wind', 'from', 'cloud', 'storm', 'mist', 'aurora', 'gust', 'leaves', 'wisps', 'rainVol', 'snow', 'paws', 'shake', 'fog', 'folk', 'vedr', 'bow', 'winter'].includes(wx.k)) {
    const F = { ...(ctx.place.state.wxForce ?? {}) };
    if (wx.k === 'all' || wx.v === null || typeof wx.v !== 'number' || !isFinite(wx.v)) delete F[wx.k];
    else F[wx.k] = wx.k === 'storm' || wx.k === 'shake' || wx.k === 'folk' || wx.k === 'vedr' || wx.k === 'winter' ? (wx.v ? 1 : 0) : ['rain', 'cloud', 'mist', 'aurora', 'gust', 'leaves', 'wisps', 'snow', 'paws', 'bow'].includes(wx.k) ? Math.max(0, Math.min(1, wx.v)) : wx.k === 'rainVol' ? Math.max(0, Math.min(1.5, wx.v)) : wx.k === 'fog' ? Math.max(0.2, Math.min(2, wx.v)) : wx.k === 'wind' ? Math.max(0, Math.min(WX.windMax, wx.v)) : ((Math.round(wx.v / 45) * 45) % 360 + 360) % 360;
    ctx.place.state.wxForce = F;
  }
  if (input.pressed.wxReset && ctx.self.isEditor) ctx.place.state.wxForce = {};
  if (ctx.self.isEditor) { // W22 slice 5: the sun's clock and the forecast live on the weather controller; it acts on its next 2 s tick
    const wc = ctx.getObject('home-weather-controller'), hr = input.actionData?.wxHour;
    const live = false; // creator 2026-10-07: the keeper's hour dial and hold work in the posted den too // LAMP-CLOCK rev 2: the posted den always runs the real Pacific day; jump/hold are build-room previews
    if (wc && hr && hr.real) { wc.state.goReal = true; ctx.place.state.dayPreview = null; } // op 'real': sendAction('wxHour', { real: true }) clears every preview
    if (wc && !live && hr && typeof hr.h === 'number' && isFinite(hr.h)) wc.state.jumpHour = ((hr.h % 24) + 24) % 24;
    if (wc && !live && input.pressed.wxHold) { const F = { ...(ctx.place.state.wxForce ?? {}) }; if (typeof F.hold === 'number') delete F.hold; else F.hold = Math.round((ctx.place.atmosphere?.timeOfDay ?? 12) * 10) / 10; ctx.place.state.wxForce = F; }
    if (wc && input.pressed.wxNewArc) wc.state.newArc = true;
  }
  const pr = input.actionData?.wxPreset, P = pr && WX.presets.find((x) => x.id === pr.id); // W22 slice 4: one tap sets the whole sky
  if (P && ctx.self.isEditor) ctx.place.state.wxForce = { ...P.F, ...(typeof ctx.place.state.wxForce?.rainVol === 'number' ? { rainVol: ctx.place.state.wxForce.rainVol } : {}), ...(typeof ctx.place.state.wxForce?.hold === 'number' ? { hold: ctx.place.state.wxForce.hold } : {}), ...(ctx.place.state.wxForce?.winter === 1 ? { winter: 1 } : {}) }; // SNOW W1: a preset keeps the Winter test switch
  if (input.pressed?.chatFilter) ctx.self.state.chatFilter = ctx.self.state.chatFilter === false; // O → Player: strict chat filter, each player's own
  const ev = input.actionData?.setEmoteVol; // O menu: emote sounds, each player's own ear (anyone, not just the keeper)
  if (ev && typeof ev.v === 'number' && isFinite(ev.v)) { const v = Math.max(0, Math.min(200, Math.round(ev.v / 5) * 5)); if (ctx.self.state.emoteVol !== v) ctx.self.state.emoteVol = v; }
  const rv = input.actionData?.setRolfVol; // O menu: Rolf's guitar, shared by the room, the den keeper's hand
  if (rv && typeof rv.v === 'number' && isFinite(rv.v) && ctx.self.isEditor) { const v = Math.max(0, Math.min(100, Math.round(rv.v / 5) * 5)); if (ctx.place.state.rolfVol !== v) ctx.place.state.rolfVol = v; }
  // O menu: the den's first song (den-music-norse, the lyre + frame drum loop): volume 0..100 % of its 0.16 gain + an off switch, room-shared, the den keeper's hand
  const os = input.actionData?.setOldSong, osOff = input.pressed?.oldSongOff;
  if ((os && typeof os.v === 'number' && isFinite(os.v) || osOff) && ctx.self.isEditor) {
    const cur = ctx.place.state.oldSong ?? { v: 100, off: false };
    const next = { v: os ? Math.max(0, Math.min(100, Math.round(os.v / 5) * 5)) : cur.v, off: osOff ? !cur.off : cur.off };
    ctx.place.state.oldSong = next;
  } // Hearthsong's volume; places/main/sim.js plays it on the jukebox when it is the picked song (TURNING-DAY)
  const ot = input.actionData?.optTab; // O menu tabs: GENERAL / SOUND / WATCHERS (editors only), this player's own
  const otv = ['watch', 'admin', 'world', 'build'].includes(ot?.v) && !ctx.self.isEditor ? 'general' : ot?.v; // creator 2026-10-06: World + Admin tabs // WATCHERS-AAA L8: a non-editor asking for WATCHERS lands on GENERAL
  if (ot && ['general', 'sound', 'watch', 'world', 'admin', 'build'].includes(otv) && s.optTab !== otv) s.optTab = otv;
  const gn = input.actionData?.setGain; // O menu SOUND: the den's mix (world.config audio.gains), the den keeper's hand, everyone hears it
  if (gn && ctx.self.isEditor) {
    const K = ['Master', 'Music', 'SFX', 'Ambience', 'Voice', 'UI'], cur = ctx.world.audio?.gains ?? {};
    let next = null;
    if (gn.k === 'reset') next = Object.fromEntries(K.map((k) => [k, 1]));
    else if (K.includes(gn.k) && typeof gn.v === 'number' && isFinite(gn.v)) { const g = Math.max(0, Math.min(200, Math.round(gn.v / 5) * 5)) / 100; if (cur[gn.k] !== g) next = { ...Object.fromEntries(K.map((k) => [k, typeof cur[k] === 'number' ? cur[k] : 1])), [gn.k]: g }; }
    if (next) ctx.world.audio = { ...(ctx.world.audio ?? {}), gains: next };
  }
  const sg = input.actionData?.setSong; // O menu SONG: the den's one song, room-shared, the den keeper's hand
  if (sg && ['auto', 'turning', 'duskwood', 'meadow', 'hearth', 'harmony', 'forest'].includes(sg.id) && ctx.self.isEditor && ctx.place.state.song !== sg.id) ctx.place.state.song = sg.id;
  const pv = input.actionData?.previewSong; // DUSKWOOD: a 25 s tour of a track (day, dusk, twilight, night, dawn), to the presser alone
  if (pv && SONGS[pv.id]?.tour) ctx.emit('playSound', { clip: SONGS[pv.id].tour, volume: 0.8 }, { audience: { player: ctx.self.id } });
  const uv = input.actionData?.setUlfVol; // O menu: Ulf's lyre (the hall lyre when a feast folk plays it), room-shared, the den keeper's hand
  if (uv && typeof uv.v === 'number' && isFinite(uv.v) && ctx.self.isEditor) {
    const v = Math.max(0, Math.min(100, Math.round(uv.v / 5) * 5));
    if (ctx.place.state.ulfVol !== v) { ctx.place.state.ulfVol = v; for (const r of ctx.query({ tags: ['npc-lyre'] })) { const o = ctx.getObject(r.id); if (o?.audio) o.audio = { ...o.audio, gain: v / 100 }; } }
  }
  const ov = input.actionData?.setOrmVol; // O menu: Orm on Rolf's guitar, room-shared, the den keeper's hand
  if (ov && typeof ov.v === 'number' && isFinite(ov.v) && ctx.self.isEditor) {
    const v = Math.max(0, Math.min(100, Math.round(ov.v / 5) * 5));
    if (ctx.place.state.ormVol !== v) { ctx.place.state.ormVol = v; for (const r of ctx.query({ tags: ['rolf-guitar-held'] })) { const o = ctx.getObject(r.id); if (o?.audio?.params && String(o.audio.params.song ?? '').startsWith('orm-')) o.audio = { ...o.audio, params: { ...o.audio.params, gain: 0.8 * v / 100 } }; } }
  }
  const ss = input.actionData?.setSetting; if (ss && typeof ss.id === 'string') applySetting(ctx.self.state, ss.id, ss.v); // O menu (OSRS Settings window): the player-saved rows of lib/data/settings-registry.js
  const sp = input.actionData?.setSpeed;
  if (sp && typeof sp.v === 'number') { const v = Math.max(1, Math.min(5, Math.round(sp.v))); if (s.speed !== v) s.speed = v; }
  const d = input.actionData?.setFov;
  if (d && typeof d.v === 'number' && isFinite(d.v)) {
    const v = clampFov(d.v);
    if (s.fov !== v) { s.fov = v; syncLens(ctx); }
  }
}
export function update(ctx) {
  syncLens(ctx);
  if (!isCreator(ctx)) return; // JEV-MASTER-LIVE L3: the Overclock fuse, on the owner's player only
  const j = ctx.world.state.jevMaster, n = ocFuse(j, ctx.now());
  if (n !== j) { const { ocUntil, ...rest } = n; ctx.world.state.jevMaster = rest; }
}
