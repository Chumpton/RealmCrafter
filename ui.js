import { cursorsHud } from './ui/hud/cursors.js';
import { settingOf } from './scripts/lib/settings-core.js';
import { isOldSpell } from './scripts/lib/data/spellbook.js'; // L2: an old spell left on a slot never casts from the HUD
import { keybindsHud } from './ui/hud/keybinds.js';
// The den's HUD: almost nothing. A horn tally of the mead you've poured at the cask, bottom-left, once you've poured one.
import { SYSTEMS as DEN_SYSTEMS } from './scripts/lib/data/systems.js';
import { moveAnything, mountMoveAnything, unmountMoveAnything } from './ui/hud/move-anything.js';
import { lightEditor } from './ui/hud/light-editor.js'; // LIGHT EDITOR (O → LIGHTS)
// perf (Oct 9 "takes forever to load"): the editor dock and build tab (and the 1 MB prefab catalog behind them) are
// fetched only on a builder's screen; a visitor's arrival never downloads them. Until they land the panels draw empty.
let EDH = null, edLoading = false;
function edLoad(player) { if (!EDH && !edLoading && player?.isEditor) { edLoading = true; Promise.all([import('./ui/hud/terrain-editor.js'), import('./ui/hud/build.js')]).then(([t, b]) => { EDH = { t, b }; }).catch(() => { edLoading = false; }); } return EDH; }
const terrainEditor = (player, ...r) => { const m = edLoad(player); return m ? m.t.terrainEditor(player, ...r) : ''; };
import { VIEW as V } from './scripts/lib/data/view-settings.js';
import { CHESS_SEAT } from './scripts/lib/data/chess-seat.js';
import { guitarTuning } from './scripts/lib/data/guitar-borrow.js';
import { TUNINGS as GTUNINGS } from './scripts/lib/data/guitar-tunings.js';
import { RAVEN_POST } from './scripts/lib/data/raven-post.js';
import { WX } from './scripts/lib/data/wx-desk.js'; import { clockLabel, preview as dayPreview } from './scripts/lib/real-clock.js'; // LAMP-CLOCK rev 2: the panel reads the real Pacific clock
import { VL } from './scripts/lib/data/vote-ledger.js';
import { SYSTEMS, PRESETS, CLOCK_PCT, FOCUS, pctOf, OC, LANE_SYSTEM } from './scripts/lib/data/jev-master.js'; // JEV-MASTER L5 · LIVE L4
import { ELI5, PENDING, FAILED } from './scripts/lib/data/jev-eli5.js'; // JEV-HOVER-ELI5-v2 L4
import { SWEEP as HSW } from './scripts/lib/data/huginn.js';
import { barValueOf as sbBarValue } from './scripts/lib/data/spellbook.js';
import { UI4, FIX4, WINDOWS, BAR_KEYS, SOUNDS as H4S, norm as h4norm, BUILD as H4B } from './scripts/lib/data/windows.js'; // GOAL4-S1
import { HUD_CSS, NH_CSS } from './ui/hud/style.js'; import { WOW_CSS, targetFrame as wowTarget, minimap as wowMinimap } from './ui/hud/wow.js'; import { talentWindow } from './ui/hud/talents.js'; import { framePlate } from './ui/hud/frames.js'; import { actionBar } from './ui/hud/actionbar.js'; import { modeSwitch, classBar } from './ui/hud/classbar.js'; import { classBook } from './ui/hud/classbook.js'; import { isClassMode, nextMode } from './scripts/lib/data/class-spells.js'; /* CLASS COMBAT (Campton) */ import { microMenu } from './ui/hud/micromenu.js'; import { pane } from './ui/hud/panes.js'; import { travelHud } from './ui/hud/travel.js'; import { stonesHud } from './ui/hud/stones.js'; import { bugHud } from './ui/hud/bugs.js'; // BUG TAGS // RAVEN ROADS
import { skillsHud, skillsPip, mountSkills, unmountSkills } from './scripts/lib/skills-hud.js'; import { shopHud } from './scripts/lib/shop-hud.js'; import { questHud } from './scripts/lib/quest-hud.js'; import { menuHud, installMenuSound } from './scripts/lib/menu-hud.js'; import { combatFxHud, installCombatFx } from './scripts/lib/combat-fx.js'; import { mountXp, unmountXp, xpSetup as xpSetupGrid } from './scripts/lib/xp-fx.js'; import { platesHud } from './scripts/lib/plates-hud.js'; import { staminaHud } from './scripts/lib/stamina-hud.js'; // SKILLS-WC S6 // HUGINN-SWEEP S7: dot colours, tier notches
import { esc } from './scripts/lib/esc.js';
import { installFct } from './ui/hud/fct.js'; // creator 2026-10-10: classic-WoW floating combat text
import { questBoardHud } from './ui/hud/quest-board.js'; // the Ravenholdt quest board's parchment (creator 2026-10-06)
import { austrZoneHud } from './ui/hud/austr-zone.js';
import { worldMapHud } from './ui/hud/worldmap.js';
import { adminMenu } from './ui/hud/admin.js';
import { shaderEditorHud } from './ui/hud/ed-post.js';
import './ui/hud/tooltip.js'; import './ui/hud/kit-skin.js'; import { kitOn } from './ui/hud/skin.js'; // creator 2026-10-09: the gold kit on windows + nameplates, 3rd Person style only
import { winStack } from './ui/hud/winmove.js'; // creator 2026-10-09: every window drags by a top bar and sizes from a corner
import { phoneHud, phToolsT, phAdmT, phEmoT } from './ui/hud/phone.js'; // creator Oct 9: the phone HUD
export function phTools() { phToolsT(); }
export function phAdm() { phAdmT(); }
export function phEmo() { phEmoT(); }
const buildTab = (bld) => (EDH ? EDH.b.buildTab(bld) : '');
import { OS_CSS, osPanel, osMinimap, osChat, OS_GRYPHONS } from './ui/hud/osrs.js';
import * as OSCV from './ui/hud/oschat-canvas.js'; // OSCHAT lane 2: setOsChatInput is lane 3's; a namespace read stays safe until it lands
import { installInvDrag } from './ui/hud/osinvdrag.js';
import { installOsChatTouch } from './ui/hud/oschat-touch.js'; // LANE 7 PHONE: tap the chat input row → keyboard
import { kitSettingsWin } from './ui/hud/kitsettings.js';
import { osSettingsModel, osSettingsWin, osDesk, osDeskSet } from './ui/hud/ossettings.js'; // O menu as the OSRS Settings window (creator 2026-10-06) // OSRS side panel + minimap (creator 2026-10-06) // AUSTRLAND zone titles (al-travel)
import { devbook } from './ui/hud/devbook.js';
import { wardrobeWin } from './ui/hud/wardrobe.js'; // O → Character → Wardrobe
import { keeperBody, keeperKey, KEEPER_CSS, keeperHud, kpPhotoSet, kpPhotoOn, kpFpsSet, kpFpsOn, mountThemes, unmountThemes, thmPick, thmSize, thmToggle } from './ui/hud/keeper.js'; // CAMPTON'S KEEPER (F7) + the theme wheel by the chat
export { thmPick, thmSize, thmToggle };
export function kpPhotoToggle() { kpPhotoSet(!kpPhotoOn()); }
export function kpFpsToggle() { kpFpsSet(!kpFpsOn()); }
export function kpDesk(tab, open) { osDeskSet(true); if (typeof sendAction !== 'function') return; if (!open) sendAction('options'); sendAction('optTab', { v: tab }); memoKey = null; }
const CHESS = { board: CHESS_SEAT.board, players: CHESS_SEAT.players, view: { material: CHESS_SEAT.material } }; // the HUD's slice of the chess contract: not the whole engine/motion table at arrival
const VIEW = { min: V.fovMin, max: V.fovMax, def: V.fovDefault, hintLeft: V.hintLeft, hintBottom: V.hintBottom, hintAboveTally: V.hintAboveTally };
// Touch (a phone, a tablet): the stick and chips own the bottom corners and Spawn's rail the right-middle band,
// so the gear and tally sit in one strip top-centre and the settings plate opens under it, centred.
const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const TOUCH_TOP = 'calc(var(--spawn-safe-area-top, 0px) + 12px)';
// Touch: one strip, top-centre — the gear and the tally side by side, clear of the stick pocket (left) and the rail (right).
// The plate opens under the strip, centred, never wider than the screen minus the rail on both sides.
const PLATE_W = 'min(300px, calc(100vw - 2 * (var(--spawn-chrome-reservation-right-inset, 50px) + 12px)))';
const TAP = 'min-height:44px;min-width:44px;box-sizing:border-box;touch-action:manipulation';
function gearButton() {
  return `<button id="den-gear" onclick="sendAction('options')" aria-label="settings" style="flex:none;width:44px;height:44px;padding:0;border-radius:10px;
    border:1px solid rgba(201,164,106,.6);background:rgba(40,26,16,.6);color:#f4e3c3;font-size:24px;line-height:44px;text-align:center;pointer-events:auto;touch-action:manipulation">⚙</button>`;
}
// W22 weather desk: THE SKY, the owner's hand on the den's shared weather (Auto = JEV's schedule). Everyone sees what it sets.
function wxDesk(v, touch) {
  if (!v.editor) return '';
  const F = v.wxForce ?? {}, btn = (on, label, act, extra = '') => `<button onclick="${act}" style="flex:1;${touch ? TAP + ';min-width:0;' : ''}padding:6px 0;border-radius:8px;border:1px solid rgba(201,164,106,.5);background:${on ? 'rgba(186,137,80,.85)' : 'rgba(90,60,35,.6)'};color:${on ? '#1e140c' : '#f4e3c3'};font-family:inherit;font-size:12px;cursor:pointer;${extra}">${label}</button>`;
  const head = (name, now) => `<div style="display:flex;justify-content:space-between;align-items:baseline;margin:10px 0 6px"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">${name}</span><span style="font-size:13px;color:#e7b457">${now}</span></div>`;
  const rAuto = typeof F.rain !== 'number', wAuto = typeof F.wind !== 'number', dAuto = typeof F.from !== 'number';
  const rainNow = Math.round((v.rain ?? 0) * 100), windNow = Math.round((v.wind ?? 0) * 10) / 10;
  const rainRow = `<div style="display:flex;gap:4px">${btn(rAuto, 'auto', "sendAction('setWx',{k:'rain',v:null})")}${WX.rainSteps.map((r, i) => btn(!rAuto && Math.abs(F.rain - r) < .01, WX.rainNames[i], `sendAction('setWx',{k:'rain',v:${r}})`)).join('')}</div>
    <input type="range" min="0" max="100" step="5" value="${rAuto ? rainNow : Math.round(F.rain * 100)}" style="width:100%;${touch ? 'height:40px;' : ''}accent-color:#5dada9;touch-action:none" onchange="sendAction('setWx',{k:'rain',v:this.value/100})">`;
  const wPct = wAuto ? Math.round(Math.min(1, (v.wind ?? 0) / WX.windMax) * 100) : Math.round(F.wind / WX.windMax * 100);
  const windRow = `<div style="display:flex;gap:4px">${btn(wAuto, 'auto', "sendAction('setWx',{k:'wind',v:null})")}${btn(!wAuto && F.wind === 0, 'still', "sendAction('setWx',{k:'wind',v:0})")}${btn(!wAuto && F.wind === 14, 'gale', "sendAction('setWx',{k:'wind',v:14})")}</div>
    <input type="range" min="0" max="100" step="5" value="${wPct}" style="width:100%;${touch ? 'height:40px;' : ''}accent-color:#5dada9;touch-action:none" onchange="sendAction('setWx',{k:'wind',v:this.value/100*${WX.windMax}})">`;
  const fromIdx = dAuto ? Math.round((((v.from ?? 0) % 360) + 360) % 360 / 45) % 8 : Math.round(F.from / 45) % 8;
  const dirRow = `<div style="display:flex;gap:4px;margin-top:4px">${btn(dAuto, 'auto', "sendAction('setWx',{k:'from',v:null})")}${btn(!dAuto, 'from ' + WX.compass[fromIdx] + ' ↻', `sendAction('setWx',{k:'from',v:${(fromIdx * 45 + 45) % 360}})`, 'flex:2')}</div>`;
  const steps = (k, vals, names) => { const auto = typeof F[k] !== 'number'; return `<div style="display:flex;gap:4px">${btn(auto, 'auto', `sendAction('setWx',{k:'${k}',v:null})`)}${vals.map((x, i) => btn(!auto && Math.abs(F[k] - x) < .01, names[i], `sendAction('setWx',{k:'${k}',v:${x}})`)).join('')}</div>`; };
  const cAuto = typeof F.cloud !== 'number', cloudNow = Math.round((v.cloud ?? 0) * 100);
  const cloudRow = steps('cloud', WX.cloudSteps, WX.cloudNames) + `<input type="range" min="0" max="100" step="5" value="${cAuto ? cloudNow : Math.round(F.cloud * 100)}" style="width:100%;${touch ? 'height:40px;' : ''}accent-color:#5dada9;touch-action:none" onchange="sendAction('setWx',{k:'cloud',v:this.value/100})">`;
  const stormRow = steps('storm', [0, 1], ['no bolts', 'bolts']);
  const tag = (k, names, vals) => typeof F[k] === 'number' ? names[vals.findIndex((x) => Math.abs(F[k] - x) < .01)] ?? '' : 'auto';
  const rest = `${head('CLOUDS', cloudNow + '%')}${cloudRow}${head('STORM', typeof F.storm === 'number' ? (F.storm ? 'bolts' : 'none') : 'auto')}${stormRow}${head('LAKE MIST', tag('mist', WX.mistNames, WX.mistSteps))}${steps('mist', WX.mistSteps, WX.mistNames)}${head('AURORA', Math.round((v.aurora ?? 0) * 100) + '% · night only')}${steps('aurora', WX.auroraSteps, WX.auroraNames)}${head('WINTER', F.winter === 1 ? 'on · test' : 'off')}<div style="display:flex;gap:4px">${btn(F.winter !== 1, 'off', "sendAction('setWx',{k:'winter',v:null})")}${btn(F.winter === 1, 'on · snow system', "sendAction('setWx',{k:'winter',v:1})", 'flex:2')}</div>${head('SNOW', Math.round((v.snow ?? 0) * 100) + '%')}${steps('snow', WX.snowSteps, WX.snowNames)}${head('GUSTS', tag('gust', WX.gustNames, WX.gustSteps))}${steps('gust', WX.gustSteps, WX.gustNames)}${head('BLOWING LEAVES', tag('leaves', WX.leafNames, WX.leafSteps))}${steps('leaves', WX.leafSteps, WX.leafNames)}${head('WIND WISPS', tag('wisps', WX.wispNames, WX.wispSteps))}${steps('wisps', WX.wispSteps, WX.wispNames)}${head('RAINBOW', tag('bow', WX.bowNames, WX.bowSteps) + (F.bow === 1 && (((v.hour ?? 12) % 24) < 6.3 || ((v.hour ?? 12) % 24) > 17.7) ? ' · needs sun' : ''))}${steps('bow', WX.bowSteps, WX.bowNames)}${head('FOG', tag('fog', WX.fogNames, WX.fogSteps))}${steps('fog', WX.fogSteps, WX.fogNames)}${head('HALL FOLK IN RAIN', tag('folk', WX.folkNames, WX.folkSteps))}${steps('folk', WX.folkSteps, WX.folkNames)}${head('VEÐR-STONE VOICE', tag('vedr', WX.vedrNames, WX.vedrSteps))}${steps('vedr', WX.vedrSteps, WX.vedrNames)}${head("CAT'S-PAWS", tag('paws', WX.pawNames, WX.pawSteps))}${steps('paws', WX.pawSteps, WX.pawNames)}${head('THUNDER SHAKE', tag('shake', WX.shakeNames, WX.shakeSteps))}${steps('shake', WX.shakeSteps, WX.shakeNames)}${head('TIME OF DAY', '<span id="tod-clock">' + (v.pv ? (v.pv.held ? 'HELD' : 'PREVIEW') : 'REAL') + ' · ' + (v.label ?? '') + '</span>')}${v.dev ? `<div style="display:flex;gap:4px">${WX.hours.map((x) => btn(false, x.name, `sendAction('wxHour',{h:${x.h}})`)).join('')}${btn(typeof F.hold === 'number', typeof F.hold === 'number' ? 'release' : 'hold', "sendAction('wxHold')")}</div><div style="display:flex;gap:4px;margin-top:4px">${btn(!v.pv, v.pv ? 'back to real time' : 'on real time', "sendAction('wxHour',{real:true})", 'flex:2')}</div><div style="font-size:11px;opacity:.6;margin-top:3px">build-room preview · the posted den always runs real Pacific time</div>` : '<div style="font-size:11px;opacity:.6">real Pacific time · sun of today at 47°N</div>'}<div style="display:flex;gap:4px;margin-top:6px">${btn(false, 'new forecast now (JEV)', "sendAction('wxNewArc')")}</div>${head('RAIN SOUND', tag('rainVol', WX.rainVolNames, WX.rainVolSteps))}${steps('rainVol', WX.rainVolSteps, WX.rainVolNames)}`;
  return `<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:14px;letter-spacing:.14em;color:#e7b457">THE SKY</span>
      <button onclick="sendAction('wxReset')" style="${touch ? TAP + ';' : ''}padding:4px 10px;border-radius:999px;border:1px solid rgba(201,164,106,.5);background:rgba(90,60,35,.6);color:#f4e3c3;font-family:inherit;font-size:11px;cursor:pointer">all natural</button></div>
    <div style="font-size:11px;opacity:.6;margin-top:2px">everyone in the den sees this · eases in over ${WX.easeS} s</div>
    ${head('PRESETS', '')}<div style="display:flex;flex-wrap:wrap;gap:4px">${WX.presets.map((p) => btn(false, p.name, `sendAction('wxPreset',{id:'${p.id}'})`, 'flex:1 1 30%')).join('')}</div>
    ${head('RAIN', rainNow + '%')}${rainRow}${head('WIND', windNow + ' m/s · ' + (v.band ?? ''))}${windRow}${dirRow}${rest}</div>`;
}
// O menu tabs (Sep 30 creator): GENERAL keeps the view, votes, JEV and the sky; SOUND holds every volume in the den.
function optTabs(tab, touch, editor) {
  const b = (id, label) => `<button id="opt-tab-${id}" onclick="sendAction('optTab',{v:'${id}'})" style="flex:1;${touch ? TAP + ';min-width:0;' : ''}padding:6px 0;border-radius:8px 8px 0 0;border:1px solid rgba(201,164,106,.6);border-bottom:none;background:${(tab ?? 'general') === id ? 'rgba(186,137,80,.85)' : 'rgba(90,60,35,.6)'};color:${(tab ?? 'general') === id ? '#1e140c' : '#f4e3c3'};font-family:inherit;font-size:12px;letter-spacing:.14em;cursor:pointer">${label}</button>`;
  return `<div style="display:flex;gap:4px;margin:-2px 0 12px;border-bottom:1px solid rgba(201,164,106,.6)">${b('general', 'GENERAL')}${b('sound', 'ᛋ SOUND')}${editor ? b('watch', 'ᚹ WATCHERS') : ''}${editor ? `<button id="opt-tab-lights" onclick="sendAction('le',{op:'open'})" style="flex:1;padding:6px 0;border-radius:8px 8px 0 0;border:1px solid rgba(201,164,106,.6);border-bottom:none;background:rgba(90,60,35,.6);color:#f4e3c3;font-family:inherit;font-size:12px;letter-spacing:.14em;cursor:pointer">ᚲ LIGHTS</button>` : ''}</div>`;
}
// WATCHERS-AAA L8 (docs/board/proposals/WATCHERS-AAA.md W14): the creator's graph of closed review rounds. Reads only
// world.state.watchQuality (the clerk's row, last 30 kept here), and only while this tab is open; pure HTML, no loop.
const WQ_COL = { W: '#9baf84', R: '#ba8950', C: '#b5563c' }, WQ_NAME = { W: 'watched', R: 'returned', C: 'contested' };
const wqEsc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function watchTab(q) {
  const head = `<div style="font-size:14px;letter-spacing:.14em;color:#e7b457;margin-bottom:4px">WATCHERS · plan quality</div>
    <div style="font-size:11px;opacity:.6;margin-bottom:10px">Each bar is one closed review round. Taller = more points passed. Green watched, honey returned, rust contested. Faded bars are from before the upgrade.</div>`;
  const rows = Array.isArray(q?.rows) ? q.rows.slice(-30) : [];
  if (!rows.length) return head + `<div id="wq-empty" style="padding:18px 8px;border-radius:8px;border:1px dashed rgba(201,164,106,.45);background:rgba(79,56,40,.35);color:#f2e6cf;font-size:12px;text-align:center;opacity:.8">No scored rounds yet. The first AAA round lands here.</div>`;
  let bugs = 0;
  const bars = rows.map((w) => {
    const of = +w.of > 0 ? +w.of : 1, s = Math.max(0, Math.min(of, +w.s || 0)), st = WQ_COL[w.st] ? w.st : 'R', f = +w.f || 0, b = +w.b || 0; bugs += b;
    return `<i title="${wqEsc(w.n)} · round ${wqEsc(w.r)} · ${WQ_NAME[st]} · ${s}/${of} · fours ${f} · bugs ${b}" style="height:${Math.max(3, Math.round(s / of * 100))}%;background:${WQ_COL[st]}${w.lg ? ';opacity:.45' : ''}${f >= 1 ? ';border-top:2px solid #f0c75e' : ''}"></i>`;
  }).join('');
  const key = (c, l) => `<span style="display:inline-flex;align-items:center;gap:3px"><i style="width:8px;height:8px;border-radius:2px;background:${c}"></i>${l}</span>`;
  const n1 = (v) => typeof v === 'number' && isFinite(v) ? v.toFixed(1) : null, a = n1(q.avg10), p = n1(q.prev10);
  const arrow = a && p ? (q.avg10 > q.prev10 ? '<span style="color:#9baf84">▲</span>' : q.avg10 < q.prev10 ? '<span style="color:#b5563c">▼</span>' : '<span style="opacity:.6">▬</span>') : '';
  return head + `<style>#wq-graph>i{flex:1;border-radius:2px 2px 0 0;box-sizing:border-box}</style><div id="wq-graph" style="display:flex;align-items:flex-end;gap:2px;height:96px;padding:6px 6px 0;border-radius:8px 8px 0 0;border:1px solid rgba(201,164,106,.5);border-bottom:2px solid #f2e6cf;background:linear-gradient(rgba(242,230,207,.08) 1px,transparent 1px) 0 6px/100% 22.5px,rgba(52,60,67,.55)">${bars}</div>
    <div style="display:flex;justify-content:space-between;font-size:9px;opacity:.5;margin:2px 0 8px"><span>older</span><span>newest</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:4px 10px;font-size:10px;opacity:.8">${key('#9baf84', 'watched')}${key('#ba8950', 'returned')}${key('#b5563c', 'contested')}<span style="opacity:.7">faded = before upgrade</span></div>
    ${a ? `<div id="wq-avg" style="margin-top:8px;font-size:12px;color:#f2e6cf">last 10: avg <b style="color:#e7b457">${a}</b>${p ? ` · previous 10: avg ${p} ${arrow}` : ''}</div>` : ''}
    <div id="wq-bugs" style="margin-top:4px;font-size:10px;opacity:.6">bugs found after build: ${bugs}</div>`;
}
const GAIN_ROWS = [['Master', 'MASTER', 'everything in the den'], ['Music', 'MUSIC', 'the songs'], ['SFX', 'SOUND EFFECTS', 'steps, doors, fire, instruments, hits'], ['Ambience', 'AMBIENT', 'rain, wind, birds, the lake'], ['Voice', 'VOICES', 'folk talking'], ['UI', 'MENUS', 'clicks and chimes']];
function soundTab(s, touch) {
  const G = s.gains ?? {};
  const rows = GAIN_ROWS.map(([k, name, sub]) => { const v = Math.round((typeof G[k] === 'number' ? G[k] : 1) * 100); return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">${name}</span><span id="gain-${k}-num" style="font-size:20px;color:#e7b457">${v}%</span></div>
      <input id="gain-${k}" type="range" min="0" max="200" step="5" value="${v}" ${s.canVol ? '' : 'disabled'} style="width:100%;${touch ? 'height:44px;' : ''}accent-color:#e7b457;touch-action:none"
        oninput="document.getElementById('gain-${k}-num').textContent=this.value+'%'" onchange="sendAction('setGain',{k:'${k}',v:+this.value})">
      <div style="font-size:10px;opacity:.55">${sub}</div></div>`; }).join('');
  return `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><span style="font-size:14px;letter-spacing:.14em;color:#e7b457">THE DEN'S MIX</span>
      <button onclick="sendAction('setGain',{k:'reset'})" ${s.canVol ? '' : 'disabled'} style="${touch ? TAP + ';' : ''}padding:4px 10px;border-radius:999px;border:1px solid rgba(201,164,106,.5);background:rgba(90,60,35,.6);color:#f4e3c3;font-family:inherit;font-size:11px;cursor:pointer">all 100%</button></div>
    <div style="font-size:11px;opacity:.6;margin-bottom:10px">${s.canVol ? 'everyone in the den hears this mix' : 'the den keeper sets this mix · your own volume is on the Spawn rail'}</div>
    ${rows}
    <div style="margin:4px 0 12px;padding:10px 0 0;border-top:1px solid rgba(201,164,106,.3)">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">🔔 EMOTE SOUNDS</span><span id="emotevol-num" style="font-size:20px;color:#e7b457">${s.emoteVol}%</span></div>
      <input id="emotevol-slider" type="range" min="0" max="200" step="5" value="${s.emoteVol}" style="width:100%;${touch ? 'height:44px;' : ''}accent-color:#e7b457;touch-action:none"
        oninput="document.getElementById('emotevol-num').textContent=this.value+'%'" onchange="sendAction('setEmoteVol',{v:+this.value})">
      <div style="font-size:10px;opacity:.55">yours alone · cheers, waves, laughs and every emote you hear</div></div>
    ${soundTabVoices(s, touch)}`;
}
function soundTabVoices(s, touch) {
  return `    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <span style="font-size:13px;letter-spacing:.12em;opacity:.8">ROLF PLAYS</span>
      <button id="rolf-switch" onclick="sendAction('rolfAlways')" style="${touch ? TAP + ';' : ''}padding:5px 12px;border-radius:999px;border:1px solid rgba(201,164,106,.6);background:${s.rolfAlways ? 'rgba(186,137,80,.85)' : 'rgba(90,60,35,.6)'};color:${s.rolfAlways ? '#1e140c' : '#f4e3c3'};font-family:inherit;font-size:13px;cursor:pointer">${s.rolfAlways ? '♪ always' : 'his own time'}</button></div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">ROLF'S GUITAR</span><span id="rolfvol-num" style="font-size:20px;color:#e7b457">${s.rolfVol ?? 25}%</span></div>
      <input id="rolfvol-slider" type="range" min="0" max="100" step="5" value="${s.rolfVol ?? 25}" ${s.canVol ? '' : 'disabled'} style="width:100%;${touch ? 'height:44px;' : ''}accent-color:#e7b457;touch-action:none"
        oninput="document.getElementById('rolfvol-num').textContent=this.value+'%'" onchange="sendAction('setRolfVol',{v:+this.value})">
      ${s.canVol ? '' : '<div style="font-size:11px;opacity:.6;margin-top:4px">the den keeper sets this</div>'}</div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">ULF'S LYRE</span><span style="display:flex;align-items:center;gap:8px"><span id="ulfvol-num" style="font-size:20px;color:#e7b457">${s.ulfVol ?? 100}%</span>
        <button id="ulf-switch" onclick="sendAction('ulfAlways')" style="${touch ? TAP + ';' : ''}padding:5px 12px;border-radius:999px;border:1px solid rgba(201,164,106,.6);background:${s.ulfAlways ? 'rgba(186,137,80,.85)' : 'rgba(90,60,35,.6)'};color:${s.ulfAlways ? '#1e140c' : '#f4e3c3'};font-family:inherit;font-size:13px;cursor:pointer">${s.ulfAlways ? '♪ always' : 'his own time'}</button></span></div>
      <input id="ulfvol-slider" type="range" min="0" max="100" step="5" value="${s.ulfVol ?? 100}" ${s.canVol ? '' : 'disabled'} style="width:100%;${touch ? 'height:44px;' : ''}accent-color:#e7b457;touch-action:none"
        oninput="document.getElementById('ulfvol-num').textContent=this.value+'%'" onchange="sendAction('setUlfVol',{v:+this.value})">
      ${s.canVol ? '' : '<div style="font-size:11px;opacity:.6;margin-top:4px">the den keeper sets this</div>'}</div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">ORM'S GUITAR</span><span style="display:flex;align-items:center;gap:8px"><span id="ormvol-num" style="font-size:20px;color:#e7b457">${s.ormVol ?? 100}%</span>
        <button id="orm-switch" onclick="sendAction('ormAlways')" style="${touch ? TAP + ';' : ''}padding:5px 12px;border-radius:999px;border:1px solid rgba(201,164,106,.6);background:${s.ormAlways ? 'rgba(186,137,80,.85)' : 'rgba(90,60,35,.6)'};color:${s.ormAlways ? '#1e140c' : '#f4e3c3'};font-family:inherit;font-size:13px;cursor:pointer">${s.ormAlways ? '♪ always' : 'his own time'}</button></span></div>
      <input id="ormvol-slider" type="range" min="0" max="100" step="5" value="${s.ormVol ?? 100}" ${s.canVol ? '' : 'disabled'} style="width:100%;${touch ? 'height:44px;' : ''}accent-color:#e7b457;touch-action:none"
        oninput="document.getElementById('ormvol-num').textContent=this.value+'%'" onchange="sendAction('setOrmVol',{v:+this.value})">
      <div style="font-size:11px;opacity:.6;margin-top:4px">he plays Rolf's guitar while Rolf rests</div></div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <div style="font-size:13px;letter-spacing:.12em;opacity:.8;margin-bottom:8px">SONG</div>
      <div style="display:flex;flex-direction:column;gap:6px">${[['auto', 'Auto-Cycle · 50/50 each dawn', s.turnTrack ? `now: ${s.turnTrack === 'duskwood' ? 'Track 2' : 'Track 1'} · lap ${s.turnN}${s.turnRolls ? ' · rolls ' + s.turnRolls : ''}` : 'rolls Track 1 or Track 2 at every dawn'], ['turning', 'Track 1 · Elwynn to Black Forest', 'the 6:00 day and night, the sky follows it'], ['duskwood', 'Track 2 · Meadows to Duskwood', 'meadows by day, duskwood by night, the sky follows it'], ['meadow', 'Meadow Song', 'the meadow, flute and horn'], ['hearth', 'Hearthsong', 'the first song, lyre and frame drum'], ['harmony', 'Harmony · Lumbridge', 'the Old School theme, 3:40, calm and steady'], ['forest', 'Forest Music', 'your forest score, a full hour before it loops']].map(([id, nm, sub]) => `<div style="display:flex;gap:6px"><button id="song-${id}" onclick="sendAction('setSong',{id:'${id}'})" ${s.canVol ? '' : 'disabled'} style="${touch ? TAP + ';' : ''}flex:1;text-align:left;padding:6px 12px;border-radius:8px;border:1px solid rgba(201,164,106,${s.song === id ? '.9' : '.35'});background:${s.song === id ? 'rgba(186,137,80,.85)' : 'rgba(40,28,18,.5)'};color:${s.song === id ? '#1e140c' : '#f4e3c3'};font-family:inherit;cursor:pointer"><div style="font-size:13px">${s.song === id ? '♪ ' : ''}${nm}</div><div style="font-size:10px;opacity:.7">${sub}</div></button>${id === 'turning' || id === 'duskwood' ? `<button id="preview-${id}" title="hear a 25 s tour, just you" onclick="sendAction('previewSong',{id:'${id}'})" style="${touch ? TAP + ';' : ''}padding:0 12px;border-radius:8px;border:1px solid rgba(201,164,106,.5);background:rgba(40,28,18,.5);color:#e7b457;font-family:inherit;cursor:pointer">▶</button>` : ''}</div>`).join('')}</div></div>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">HEARTHSONG VOLUME</span>
        <span style="display:flex;align-items:center;gap:8px"><span id="oldsong-num" style="font-size:20px;color:#e7b457;${s.oldOff ? 'opacity:.4' : ''}">${s.oldV}%</span>
        <button id="oldsong-off" onclick="sendAction('oldSongOff')" ${s.canVol ? '' : 'disabled'} style="${touch ? TAP + ';' : ''}padding:5px 12px;border-radius:999px;border:1px solid rgba(201,164,106,.6);background:${s.oldOff ? 'rgba(90,60,35,.6)' : 'rgba(186,137,80,.85)'};color:${s.oldOff ? '#f4e3c3' : '#1e140c'};font-family:inherit;font-size:13px;cursor:pointer">${s.oldOff ? 'off · turn on' : '♪ on · disable'}</button></span></div>
      <input id="oldsong-slider" type="range" min="0" max="100" step="5" value="${s.oldV}" ${s.canVol && !s.oldOff ? '' : 'disabled'} style="width:100%;${touch ? 'height:44px;' : ''}accent-color:#e7b457;touch-action:none;${s.oldOff ? 'opacity:.4' : ''}"
        oninput="document.getElementById('oldsong-num').textContent=this.value+'%'" onchange="sendAction('setOldSong',{v:+this.value})">
      ${s.canVol ? '' : '<div style="font-size:11px;opacity:.6;margin-top:4px">the den keeper sets this</div>'}</div>
`;
}
function generalTab(s, touch, fov, part) { // creator 2026-10-06: split into Player / Admin / World tabs on desktop
  const MA = `<button id="move-anything-open" onclick="sendAction('maToggle')" style="width:100%;margin:0 0 12px;${touch ? TAP + ';' : ''}padding:7px;border-radius:8px;border:1px solid rgba(201,164,106,.6);background:rgba(186,137,80,.85);color:#1e140c;font-family:inherit;font-size:13px;letter-spacing:.1em;cursor:pointer">✥ MOVE ANYTHING</button>`;
  const CF = `<div style="display:flex;justify-content:space-between;align-items:center;margin:0 0 12px"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">✱ CHAT FILTER</span><button id="chat-filter-switch" onclick="sendAction('chatFilter')" style="${touch ? TAP + ';' : ''}padding:5px 12px;border-radius:999px;border:1px solid rgba(201,164,106,.6);background:${s.chatFilter ? 'rgba(186,137,80,.85)' : 'rgba(90,60,35,.6)'};color:${s.chatFilter ? '#1e140c' : '#f4e3c3'};font-family:inherit;font-size:13px;cursor:pointer">${s.chatFilter ? 'on · strict' : 'off'}</button></div>`;
  const FOV = `    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px">
      <span style="font-size:13px;letter-spacing:.12em;opacity:.8">FIELD OF VIEW</span>
      <span id="fov-num" style="font-size:26px;color:#e7b457">${fov}°</span></div>
    <input id="fov-slider" type="range" min="${VIEW.min}" max="${VIEW.max}" step="1" value="${fov}" style="width:100%;${touch ? 'height:44px;' : ''}accent-color:#e7b457;touch-action:none"
      oninput="document.getElementById('fov-num').textContent=this.value+'°';sendAction('setFov',{v:+this.value})">
    <div style="display:flex;justify-content:space-between;font-size:11px;opacity:.6;margin-top:4px"><span>${VIEW.min}</span><span>${VIEW.max}</span></div>`;
  const SYS = `    ${s.canVol ? `<button id="den-systems-open" onclick="sendAction('sysWin')" style="width:100%;margin-top:12px;${touch ? TAP + ';' : ''}padding:7px;border-radius:8px;border:1px solid rgba(201,164,106,.6);background:rgba(186,137,80,.85);color:#1e140c;font-family:inherit;font-size:13px;letter-spacing:.1em;cursor:pointer">DEN SYSTEMS ▸</button>` : ''}
    ${s.canVol ? `<div style="display:flex;gap:8px;margin-top:8px"><button id="bug-tag-open" onclick="sendAction('bugTag',{},{relockPointer:true})" style="flex:1;${touch ? TAP + ';' : ''}padding:7px;border-radius:8px;border:1px solid rgba(201,164,106,.6);background:rgba(160,50,40,.8);color:#fff;font-family:inherit;font-size:13px;letter-spacing:.1em;cursor:pointer">🏷 TAG</button><button id="bug-journal-open" onclick="sendAction('bugJournal')" style="flex:1;${touch ? TAP + ';' : ''}padding:7px;border-radius:8px;border:1px solid rgba(201,164,106,.6);background:rgba(186,137,80,.85);color:#1e140c;font-family:inherit;font-size:13px;letter-spacing:.1em;cursor:pointer">📖 JOURNAL</button></div>` : ''}
    ${s.canVol ? myVotesButton(touch) : ''}`;
  const JEV = `    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">JEV WANDERS</span>
        <button id="jev-wander" onclick="sendAction('jevWander')" ${s.canVol ? '' : 'disabled'} style="${touch ? TAP + ';' : ''}padding:5px 12px;border-radius:999px;border:1px solid rgba(201,164,106,.6);background:${s.jevWander ? 'rgba(186,137,80,.85)' : 'rgba(90,60,35,.6)'};color:${s.jevWander ? '#1e140c' : '#f4e3c3'};font-family:inherit;font-size:13px;cursor:pointer">${s.jevWander ? 'on · keep him seated' : 'off · let him wander'}</button></div>
      ${s.canVol ? '' : '<div style="font-size:11px;opacity:.6;margin-top:4px">the den keeper sets this</div>'}</div>`;
  const SPD = `    <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><span style="font-size:13px;letter-spacing:.12em;opacity:.8">MOVE SPEED</span><span style="font-size:20px;color:#e7b457">${(s.speed ?? 1) * 100}%</span></div>
      <div style="display:flex;gap:6px">${[1, 2, 3, 4, 5].map((m) => `<button onclick="sendAction('setSpeed',{v:${m}})" style="flex:1;${touch ? TAP + ';min-width:0;' : ''}padding:6px 0;border-radius:8px;border:1px solid rgba(201,164,106,.5);background:${(s.speed ?? 1) === m ? 'rgba(186,137,80,.85)' : 'rgba(90,60,35,.6)'};color:${(s.speed ?? 1) === m ? '#1e140c' : '#f4e3c3'};font-family:inherit;font-size:13px;cursor:pointer">${m}×</button>`).join('')}</div></div>`;
  if (part === 'player') return `<div class="ds-card">${CF}${FOV}</div><div class="ds-card">${SPD}</div>`;
  if (part === 'admin') return `<div class="ds-card"><div class="ds-h">TOOLS</div>${MA}${SYS}</div><div class="ds-card">${JEV}</div>`;
  if (part === 'world') return `<div class="ds-card">${wxDesk(s, touch) || '<div style="opacity:.6">the den keeper sets the weather</div>'}</div>`;
  return MA + CF + FOV + SYS + JEV + SPD + wxDesk(s, touch);
}
// creator 2026-10-06: "make admin window appear left side of screen, a horizontal box with better tabs and more organization"
const DS_CSS = `<style>
#den-settings.wide{position:fixed;left:14px;top:56px;zoom:.8;width:min(600px,calc(100vw - 420px));min-height:min(420px,calc(100vh - 290px));max-height:calc(100vh - 290px);display:flex;flex-direction:column;box-sizing:border-box;padding:0;border-radius:10px;overflow:hidden;
 background:radial-gradient(120% 80% at 50% 20%,#2f383f,#1f262b 70%);border:2px solid #8f7543;box-shadow:inset 0 0 0 1px #12171a,inset 0 0 0 4px rgba(214,178,104,.18),0 10px 30px rgba(0,0,0,.65);color:#f3e6c8;font-family:Georgia,serif;pointer-events:auto;z-index:59}
#den-settings .ds-top{display:flex;align-items:center;gap:12px;padding:10px 12px;background:linear-gradient(#4a3424,#33241a);border-bottom:2px solid #8f7543;box-shadow:0 2px 0 #14100c}
#den-settings .ds-title{font-size:15px;letter-spacing:.24em;color:#e9c271;white-space:nowrap;text-shadow:0 1px 2px #000}
#den-settings .ds-tabs{display:flex;gap:6px;flex:1;flex-wrap:wrap}
#den-settings .ds-tab{display:flex;align-items:center;gap:7px;padding:7px 14px;border-radius:5px;background:linear-gradient(#4a545c,#353d44);border:1px solid #8a7444;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 0 2px #262d33,inset 0 0 0 3px rgba(214,178,104,.3);color:#d9d2c0;font:13px Georgia,serif;letter-spacing:.06em;cursor:pointer}
#den-settings .ds-tab:hover{border-color:#e9c271;color:#fff}
#den-settings .ds-tab.on{background:linear-gradient(#d9ad5e,#a87a36);color:#1d160c;border-color:#f3d48a;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),inset 0 0 0 2px #8a6328,0 0 10px rgba(233,194,113,.5)}
#den-settings .ds-tab i{font-style:normal;font-size:15px}
#den-settings .ds-x{width:34px;height:34px;border-radius:5px;background:linear-gradient(#4a545c,#353d44);border:1px solid #8a7444;box-shadow:inset 0 0 0 2px #262d33;color:#f3e6c8;font-size:17px;cursor:pointer}
#den-settings .ds-x:hover{background:#7c3428}
#den-settings .ds-body{flex:1;overflow-y:auto;padding:14px 16px;column-width:280px;column-gap:14px;scrollbar-width:thin;scrollbar-color:#b8924f transparent}
#den-settings .ds-card,#den-settings .ds-body>div:not(.bd):not(style){break-inside:avoid;margin:0 0 14px;padding:12px 14px;border-radius:8px;background:linear-gradient(#262e34,#1d2429);border:1px solid #6e5a35;box-shadow:inset 0 0 0 1px #12171a,inset 0 0 0 3px rgba(214,178,104,.14),0 2px 6px rgba(0,0,0,.4)}
#den-settings .ds-card>div:first-child{margin-top:0!important;padding-top:0!important;border-top:0!important}
#den-settings .ds-h{font-size:12px;letter-spacing:.2em;color:#e9c271;margin-bottom:8px;text-transform:uppercase}
#den-settings .ds-body button:not(.ds-tab):not(.bt):not(.bd-card){background:linear-gradient(#4a545c,#353d44)!important;border:1px solid #8a7444!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 2px #262d33,inset 0 0 0 3px rgba(214,178,104,.3)!important;color:#f3e6c8!important;border-radius:5px!important;letter-spacing:.1em}
#den-settings input[type=range]{accent-color:#d9ad5e}
#den-settings .ds-foot{display:flex;gap:8px;justify-content:flex-end;padding:9px 12px;border-top:2px solid #8f7543;background:linear-gradient(#232a2f,#1a1f23)}
#den-settings .ds-foot button{padding:7px 18px;border-radius:5px;background:linear-gradient(#4a545c,#353d44);border:1px solid #8a7444;box-shadow:inset 0 0 0 2px #262d33,inset 0 0 0 3px rgba(214,178,104,.3);color:#f3e6c8;font:13px Georgia,serif;cursor:pointer}
#den-settings .ds-foot button.go{background:linear-gradient(#d9ad5e,#a87a36);color:#1d160c;border-color:#f3d48a;box-shadow:inset 0 0 0 2px #8a6328}
#den-settings button{transition:filter .12s}#den-settings button:hover{filter:brightness(1.12)}
#tome-ui-container #den-settings.wide{background:radial-gradient(circle,#f3d692 0 1.3px,#a8783c 2px,transparent 2.8px) left 4px top 4px/10px 10px no-repeat,radial-gradient(circle,#f3d692 0 1.3px,#a8783c 2px,transparent 2.8px) right 4px top 4px/10px 10px no-repeat,radial-gradient(circle,#f3d692 0 1.3px,#a8783c 2px,transparent 2.8px) left 4px bottom 4px/10px 10px no-repeat,radial-gradient(circle,#f3d692 0 1.3px,#a8783c 2px,transparent 2.8px) right 4px bottom 4px/10px 10px no-repeat,radial-gradient(120% 80% at 50% 20%,#2f383f,#1f262b 70%)!important;border:2px solid #b8924f!important;border-radius:10px!important;box-shadow:inset 0 0 0 1px #12171a,inset 0 0 0 4px rgba(214,178,104,.18),0 10px 30px rgba(0,0,0,.65)!important;font-family:Georgia,serif!important}

/* creator 2026-10-06: the admin window sizes itself to the screen */
#den-settings .ds-bar{display:flex;align-items:center;gap:6px;height:30px;flex:none;padding:0 6px 0 12px;cursor:grab;user-select:none;touch-action:none;background:linear-gradient(#3a434b,#262d33);border-bottom:1px solid #8f7543}
#den-settings .ds-bar:active{cursor:grabbing}
#den-settings .ds-bar .ds-title{font:700 12px Georgia,serif;letter-spacing:.14em;color:#e9c271;pointer-events:none}
#den-settings .ds-bar-sp{flex:1;align-self:stretch;margin:6px 8px;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(233,194,113,.16) 3px 4px);border-radius:2px;pointer-events:none}
#den-settings .ds-wb{width:30px;height:22px;border-radius:4px;border:1px solid #6e5a35;background:linear-gradient(#4a545c,#353d44);color:#f3e6c8;font:13px Georgia;cursor:pointer;padding:0}
#den-settings .ds-wb.ds-wx:hover{background:linear-gradient(#c0463a,#8e2a22);border-color:#f0a090}
#den-settings .ds-top .ds-x{display:none}
#den-settings .ds-grip{position:absolute;left:0;bottom:0;width:22px;height:22px;cursor:nesw-resize;touch-action:none;z-index:5;border-bottom-left-radius:10px;
background:linear-gradient(45deg,transparent 0 30%,#e9c271 30% 36%,transparent 36% 48%,#e9c271 48% 54%,transparent 54% 66%,#e9c271 66% 72%,transparent 72%);opacity:.75}
#den-settings .ds-grip:hover{opacity:1;filter:drop-shadow(0 0 4px #e9c271)}
#den-settings.wide{position:fixed}
#den-settings.wide{width:clamp(460px,40vw,820px)!important;max-height:calc(100vh - 150px)!important;min-height:min(520px,calc(100vh - 150px))!important;transform-origin:top left}
#den-settings.wide .bd-grid{max-height:none!important;min-height:0!important;flex:1}
#den-settings.wide .bd{min-height:0}
@media (min-width:2200px){#den-settings.wide{zoom:1.22}}
@media (max-width:1500px),(max-height:900px){#den-settings.wide{zoom:.9}}
@media (max-width:1250px),(max-height:760px){#den-settings.wide{zoom:.8;width:clamp(420px,52vw,700px)!important}}
@media (max-height:640px){#den-settings.wide{zoom:.7}}
</style>`;
let kpCtx = null, kpPlayer = null; // CAMPTON'S DEN KEEPER: set by the render for adminWide
const KP_OWNER = 'pa_d69d1b1f0d7352adedf69f2ee39457a4';
function adminWide(s, fov) {
  const ed = !!s.canVol, kp = ed && kpPlayer?.userId === KP_OWNER, kt = kp ? kpPlayer?.state?.keeper?.tab : null, raw = kt && ['room', 'sky', 'marks', 'fun', 'pulse'].includes(kt) ? 'k-' + kt : (s.optTab ?? 'general');
  const tab = (!ed && ['watch', 'admin', 'world', 'build'].includes(raw)) ? 'general' : raw;
  const T = (id, icon, label) => `<button id="opt-tab-${id}" class="ds-tab${tab === id ? ' on' : ''}" onclick="${kp ? "sendAction('keeper',{op:'tab',v:null});" : ''}sendAction('optTab',{v:'${id}'})"><i>${icon}</i>${label}</button>`;
  const KT = (id, icon, label) => `<button id="opt-tab-k-${id}" class="ds-tab${tab === 'k-' + id ? ' on' : ''}" onclick="sendAction('keeper',{op:'tab',v:'${id}'})"><i>${icon}</i>${label}</button>`;
  const tabs = T('general', '🧭', 'Player') + T('sound', 'ᛋ', 'Sound') + (ed ? T('world', '☁', 'World') + `<button id="opt-tab-build" class="ds-tab" onclick="sendAction('te',{op:'open'})"><i>🏗</i>Build</button>` + T('admin', '⚒', 'Admin') + T('watch', 'ᚹ', 'Watchers')
    + `<button id="opt-tab-lights" class="ds-tab" onclick="sendAction('le',{op:'open'})"><i>💡</i>Lights</button>` : '')
    + (kp ? KT('room', '👥', 'Room') + KT('sky', '☀', 'Sky') + KT('marks', '📍', 'Marks') + KT('fun', '🎆', 'Fun') + KT('pulse', '📈', 'Pulse') : '');
  const body = tab.startsWith('k-') ? KEEPER_CSS() + keeperBody(kpCtx, kpPlayer, tab.slice(2)) : tab === 'build' ? buildTab(s.bld) : tab === 'sound' ? soundTab(s, false) : tab === 'watch' ? watchTab(s.wqg) : tab === 'admin' ? generalTab(s, false, fov, 'admin') : tab === 'world' ? generalTab(s, false, fov, 'world') : generalTab(s, false, fov, 'player');
  const B = admBox, box = B ? ` style="left:${B.x}px!important;top:${B.y}px!important;width:${B.w}px!important;height:${B.h}px!important;max-height:none!important;min-height:0!important;zoom:${B.z ?? 1}!important"` : '';
  return DS_CSS + `<div id="den-settings" class="wide" data-modal${box}>`
    + `<div class="ds-bar" onpointerdown="admGrab(event,'move')" onwheel="admWheel(event)" ondblclick="admReset()" title="Drag to move · wheel to size · double-click to reset"><span class="ds-title">ᛟ ${kp ? "CAMPTON'S DEN KEEPER" : 'DEN OPTIONS'}</span><span class="ds-bar-sp"></span>`
    + `<button class="ds-wb" title="Reset size and place" onclick="admReset()">⟲</button><button class="ds-wb ds-wx" title="Close (O)" onclick="sendAction('options',{},{relockPointer:true})">✕</button></div>`
    + `<div class="ds-top"><div class="ds-tabs">${tabs}</div></div>`
    + `<div class="ds-body">${body}</div>`
    + `<div class="ds-foot"><button onclick="sendAction('setFov',{v:${VIEW.def}})">Reset view</button><button onclick="osDeskOff()">Settings</button><button class="go" onclick="sendAction('options',{},{relockPointer:true})">Done</button></div>`
    + `<div class="ds-grip" onpointerdown="admGrab(event,'size')" title="Drag to resize"></div></div>`;
}
// creator 2026-10-06: the admin window moves by its title bar and sizes from its bottom-left grip, like a desktop window. Page-local, kept per browser.
let admBox = (() => { try { let v = JSON.parse(localStorage.getItem('den-adm-box') || 'null'); if (!(v && typeof v.x === 'number')) return null;
  if (!localStorage.getItem('den-adm-half')) { const z0 = v.z ?? 1, z = Math.max(0.7, Math.round(z0 * 0.8 * 100) / 100); v = { ...v, w: Math.max(380, Math.round(v.w * z0 * 0.5 / z)), h: Math.max(260, Math.round(v.h * z0 * 0.5 / z)), z }; localStorage.setItem('den-adm-half', '1'); localStorage.setItem('den-adm-box', JSON.stringify(v)); } // creator 2026-10-06: the O menu at half its size, once
  return v; } catch { return null; } })();
export function admWheel(e) { // the title bar's wheel sizes the whole window, text and all (0.6-1.6), kept like a drag
  const el = document.getElementById('den-settings'); if (!el) return; e.preventDefault(); e.stopPropagation();
  const z0 = parseFloat(getComputedStyle(el).zoom) || 1, r = el.getBoundingClientRect();
  const b = admBox ?? { x: Math.round(r.left / z0), y: Math.round(r.top / z0), w: Math.round(r.width / z0), h: Math.round(r.height / z0), z: z0 };
  const z = Math.max(0.6, Math.min(1.6, Math.round((b.z ?? 1) * (e.deltaY < 0 ? 1.05 : 1 / 1.05) * 100) / 100));
  admBox = { ...b, x: Math.round(b.x * (b.z ?? 1) / z), y: Math.round(b.y * (b.z ?? 1) / z), z };
  for (const [k, v] of [['left', admBox.x + 'px'], ['top', admBox.y + 'px'], ['width', admBox.w + 'px'], ['height', admBox.h + 'px'], ['max-height', 'none'], ['min-height', '0'], ['zoom', String(z)]]) el.style.setProperty(k, v, 'important');
  clearTimeout(admWheel._t); admWheel._t = setTimeout(admKeep, 300);
}
const admKeep = () => { try { admBox ? localStorage.setItem('den-adm-box', JSON.stringify(admBox)) : localStorage.removeItem('den-adm-box'); } catch {} };
export function admReset() { admBox = null; admKeep(); h4repaint(); }
export function admGrab(e, mode) { // the window stays exactly where it is dropped: no clamp, no snap, its screen zoom kept
  if (e.button !== 0 || (mode === 'move' && e.target.closest?.('button'))) return;
  const el = document.getElementById('den-settings'); if (!el) return;
  e.preventDefault(); e.stopPropagation();
  const z = parseFloat(getComputedStyle(el).zoom) || 1, r = el.getBoundingClientRect();
  const b0 = admBox ?? { x: Math.round(r.left / z), y: Math.round(r.top / z), w: Math.round(r.width / z), h: Math.round(r.height / z), z }, sx = e.clientX, sy = e.clientY;
  const put = (b) => { admBox = b; for (const [k, v] of [['left', b.x], ['top', b.y], ['width', b.w], ['height', b.h]]) el.style.setProperty(k, v + 'px', 'important');
    for (const [k, v] of [['max-height', 'none'], ['min-height', '0'], ['zoom', String(b.z ?? 1)]]) el.style.setProperty(k, v, 'important'); };
  put(b0); document.body.style.cursor = mode === 'move' ? 'grabbing' : 'nesw-resize';
  const k = b0.z ?? 1;
  const mv = (ev) => { const dx = (ev.clientX - sx) / k, dy = (ev.clientY - sy) / k;
    if (mode === 'move') put({ ...b0, x: Math.round(b0.x + dx), y: Math.round(b0.y + dy) });
    else { const w = Math.max(380, b0.w - dx), h = Math.max(260, b0.h + dy); put({ ...b0, x: Math.round(b0.x + b0.w - w), w: Math.round(w), h: Math.round(h) }); } };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.body.style.cursor = ''; admKeep(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}
function settings(player, ctx, real) {
  kpCtx = ctx; kpPlayer = real ?? null;
  if (real?.userId === KP_OWNER && real?.state?.keeper?.open && player?.state?.optionsOpen && !osDesk()) osDeskSet(true); // F7: straight to the keeper's desk
  const s = player?.state ?? {}, fov = s.fov ?? VIEW.def, touch = coarse();
  const hintBottom = ((s.mead ?? 0) || (s.fed ?? 0)) ? VIEW.hintAboveTally : VIEW.hintBottom;
  const hint = `<div style="position:fixed;left:${VIEW.hintLeft}px;bottom:${hintBottom}px;padding:4px 10px;border-radius:8px;background:rgba(40,26,16,.45);color:#f4e3c3;font-family:Georgia,serif;font-size:12px;letter-spacing:1px;opacity:.7;pointer-events:none">O · settings</div>`;
  if (!s.optionsOpen) { if (osDesk()) osDeskSet(false); return touch || UI4.frames ? '' : hint; } // NORSE-HUD: the O button sits in the hotbar dock
  if (!touch) return s.osm && !osDesk() ? kitSettingsWin(s.osm, osSetClose) /* 2026-10-09 campton: the tall menu in every style */ : adminWide(s, fov); // creator 2026-10-06: the OSRS Settings window; the keeper's desk (the wide admin window) opens from its Den keeper category
  const place = touch
    ? `left:50%;transform:translateX(-50%);top:calc(var(--spawn-safe-area-top, 0px) + 64px);width:${PLATE_W};box-sizing:border-box;max-height:calc(100vh - 80px);overflow-y:auto;`
    : `right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px);bottom:88px;width:280px;box-sizing:border-box;max-height:calc(100vh - 112px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(201,164,106,.6) transparent;`;
  return `<div id="den-settings" data-modal style="position:fixed;${place}padding:14px 18px 16px;border-radius:12px;
    background:rgba(40,26,16,.88);border:1px solid rgba(201,164,106,.6);box-shadow:4px 4px 0 rgba(20,12,6,.6);color:#f4e3c3;font-family:Georgia,serif;pointer-events:auto">
    ${optTabs(s.optTab === 'watch' && !s.canVol ? 'general' : s.optTab, touch, s.canVol)}
    ${s.optTab === 'sound' ? soundTab(s, touch) : s.optTab === 'watch' && s.canVol ? watchTab(s.wqg) : generalTab(s, touch, fov)}
    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="sendAction('setFov',{v:${VIEW.def}})" style="flex:1;${touch ? TAP + ';' : ''}padding:6px;border-radius:8px;border:1px solid rgba(201,164,106,.5);background:rgba(90,60,35,.6);color:#f4e3c3;font-family:inherit;cursor:pointer">reset</button>
      <button onclick="sendAction('options',{},{relockPointer:true})" style="flex:1;${touch ? TAP + ';' : ''}padding:6px;border-radius:8px;border:1px solid rgba(201,164,106,.5);background:rgba(186,137,80,.7);color:#1e140c;font-family:inherit;cursor:pointer">done</button></div>
  </div>`;
}
// The engine re-runs this render whenever the local player's row moves (its transform included) and on its own
// resources (cell stream, world config) — that grain is the engine's. So the render reads only the five things it draws
// (fed, mead, optionsOpen, fov, touch) and hands back the last string while they hold: a re-run costs five reads, no
// string is rebuilt, and the output stays byte-identical.
let memoKey = null, memoHtml = '';
// SKY BUTTONS (creator ask 2026-10-04): a sun and a moon, top centre, for the den's builders: the whole room's sky jumps to 08:00 or 21:00
// (view-settings.js wxHour → the weather controller's jumpHour, acted on within 2 s). Static html: costs nothing per frame.
function skyButtons(player, ctx) {
  if (!player?.isEditor) return ''; // creator 2026-10-07: the keeper's sky works in the posted den too
  const b = (h, glyph, tip, bg) => `<button onclick="sendAction('wxHour',{h:${h}})" title="${tip}" style="width:38px;height:34px;padding:0;border-radius:9px;border:1px solid rgba(201,164,106,.65);background:${bg};color:#f4e3c3;font-size:18px;line-height:32px;cursor:pointer;pointer-events:auto">${glyph}</button>`;
  return `<div style="position:fixed;top:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;pointer-events:none;z-index:5">`
    + b(8, '☀', 'jump to morning', 'linear-gradient(#8a6230,#5a3f22)') + b(21, '☾', 'jump to night', 'linear-gradient(#2c3550,#1a2034)') + `</div>`;
}
// SAILING (creator ask 2026-10-04): at a warship's helm, a carved plank bottom-centre: name, knots, a compass heading, the keys
function shipHud(player) {
  const c = player?.controlling, st = c?.state; if (!st || !(c.tags ?? []).includes?.('warship') && st.name == null) return '';
  const h = st.hdg ?? 0, pts = ['N','NE','E','SE','S','SW','W','NW'][Math.round(h / 45) % 8];
  return `<div style="position:fixed;left:50%;bottom:92px;transform:translateX(-50%);pointer-events:none;display:flex;gap:14px;align-items:center;padding:8px 18px;border-radius:10px;background:linear-gradient(#5a3f2b,#3e2b1d);border:2px solid #b98b4f;box-shadow:0 3px 10px #0008;color:#f2e6cf;font:600 14px/1.2 Georgia,serif;letter-spacing:.04em">`
    + `<span style="color:#e9c27a">${st.name ?? 'ship'}</span><span style="font-size:22px">${st.kn ?? 0}<small style="font-size:11px;opacity:.75"> kn</small></span>`
    + `<span style="display:inline-flex;align-items:center;gap:5px"><span style="display:inline-block;transform:rotate(${h}deg);color:#e9c27a">▲</span>${pts} ${h}°</span>`
    + `<span style="font-size:11px;opacity:.7">W/S sail · A/D steer · E let go</span></div>`;
}
let skyCtx = null; // topStrip has no ctx of its own: the render's, for the build-room-only sky buttons
export default function (ctx, player) {
  skyCtx = ctx;
  try { winStack(player, openWins.length); } catch (e) {} // creator 2026-10-09: a modal opening closes the tool windows behind it
  if (player?.isEditor && player?.state?.te?.open) return terrainEditor(player, player?.state?.bld, ctx.place?.atmosphere?.timeOfDay, ctx.world?.state?.bldGroups); // TERRAIN EDITOR mode: its own screen
  const s = player?.state, touch = coarse();
  const cv = !!s?.chessView?.on, g = cv ? chessGame(ctx) : null;
  const rolf = !!rolfRow(ctx)?.state?.always;
  const holding = !!s?.holding, guitar = s?.holdingKind === 'guitar';
  const tunRow = holding && guitar ? heldRow(ctx, s.holding) : null, tun = tunRow ? `${tunRow.name ?? ''}|${tunRow.label}|${tunRow.midi.join(',')}` : '';
  const key = `${s?.ravenScroll?.at ?? ''}|${holding}|${guitar}|${tun}|${rolf}|${s?.fed}|${s?.mead}|${!!s?.optionsOpen}|${s?.fov}|${s?.speed}|${s?.optTab}|${s?.optTab === 'build' ? JSON.stringify(s?.bld ?? {}) : ''}|${JSON.stringify(ctx.world?.audio?.gains ?? {})}|${ctx.place?.state?.rolfVol}|${ctx.place?.state?.oldSong?.v}|${ctx.place?.state?.song}|${ctx.place?.state?.ulfVol}|${!!ctx.place?.state?.ulfAlways}|${ctx.place?.state?.ormVol}|${!!ctx.place?.state?.ormAlways}|${ctx.place?.state?.oldSong?.off}|${ctx.place?.state?.jevWander !== false}|${!!player?.isEditor}|${touch}|${osDesk()}|${s?.optionsOpen ? JSON.stringify(s?.settings ?? {}) : ''}|${cv}|${g ? `${g.ply}|${g.history?.length}|${g.phase}|${g.turn}|${g.result}|${g.check}|${g.last?.score}` : ''}`;
  const ps = s?.optionsOpen && player?.isEditor ? ctx.place?.state : null, pw = ps?.wind, wxv = ps ? { editor: true, wxForce: ps.wxForce, rain: ps.weather?.rain, wind: pw?.speed, band: pw?.band, cloud: ps.weather?.cloud, aurora: ps.aurora, snow: ps.weather?.snow, from: pw ? pw.toward + 180 : 0, hour: ctx.place?.atmosphere?.timeOfDay, label: clockLabel(ctx), dev: ctx.world?.mode === 'dev', pv: dayPreview(ctx) } : {};
  const wxkey = ps ? `${JSON.stringify(ps.wxForce ?? {})}|${Math.round((wxv.rain ?? 0) * 100)}|${Math.round(wxv.wind ?? 0)}|${wxv.band}|${Math.round((wxv.from ?? 0) / 45)}|${Math.round((wxv.cloud ?? 0) * 20)}|${Math.round((wxv.aurora ?? 0) * 20)}|${Math.round((wxv.snow ?? 0) * 20)}|${wxv.label}|${wxv.dev ? 1 : 0}|${wxv.pv ? (wxv.pv.held ? 'h' : 'p') + wxv.pv.atMs : ''}` : '';
  const wq = wakeRow(ctx); let wkey = wq ? `${wq.escalate ? 1 : 0}|${wq.banner ?? ''}|${wq.ready ? 1 : 0}` : 'x';
  const swv = watchView(ctx, s); if (swv) wkey += '|' + swv.key;
  const L = player?.isEditor && s?.ledger?.open ? s.ledger : null; lastLedger = L; lastTouch = touch;
  wkey += L ? `|vl|${L.tab ?? ''}|${L.filter ?? ''}|${L.at ?? ''}|${ledgerStamp}` : '|vl0';
  const JD = player?.isEditor && s?.jevDesk?.open ? (ctx.world?.state?.jevMaster ?? {}) : null, jmeter = JD ? ctx.world?.state?.jevMeter?.now ?? {} : null;
  const jlive = JD ? ctx.world?.state?.jevLive ?? null : null, jnow = ctx.now?.() ?? 0; jeli = JD ? ctx.world?.state?.jevEli5 ?? {} : {};
  wkey += JD ? `|jd|${JD.at ?? 0}|${JSON.stringify(jmeter)}|${JSON.stringify(jlive)}|${JSON.stringify(jeli)}|${Math.floor(jnow / (JD.preset === 'oc' ? 1000 : 15000))}` : '|jd0';
  const jb = judgeView(ctx, s); wkey += jb ? '|jb|' + jb.key : '|jb0';
  const hb = huginnView(ctx, s, player); wkey += hb ? '|hb|' + hb.key : '|hb0';
  const hm = huginnMapView(ctx, s, player); wkey += hm ? '|hm|' + hm.key : '|hm0';
  const rt = reticleView(s, L); wkey += '|rt|' + (rt ? rt.key : '0');
  const wqg = s?.optionsOpen && s?.optTab === 'watch' && player?.isEditor ? ctx.world?.state?.watchQuality ?? null : null; // WATCHERS tab: read on open only
  wkey += wqg ? `|wqg|${wqg.at ?? ''}|${wqg.rows?.length ?? 0}|${wqg.avg10 ?? ''}|${wqg.prev10 ?? ''}|${(wqg.rows ?? []).reduce((a, r) => a + (r.b || 0), 0)}` : '|wqg0'; // bugs sum: a post-build count rewrites a row in place (same at, same length)
  const live = hm ? hmLivePin(ctx, player) : null, spl = (h) => live ? h.replace(HM_ME, live) : h;
  h4left = !touch && UI4.frames ? 288 : 14; // GOAL4-S1: the frame owns top-left; the wake chip and watch dot sit beside it
  const dock = !touch && !!UI4.frames; // NORSE-HUD: one skin, vitals top-left, utilities docked on the hotbar, dev in the top strip
  const skh = touch ? '' : skillsHud(ctx, player, dock) + staminaHud(ctx, player, dock) + plates(ctx, player) + shopHud(ctx, player) + questHud(ctx, player) + menuHud(ctx, player) + combatFxHud(ctx, player) + platesHud(ctx, player); // SKILLS-WC S6: its own memo, outside the den's · GOAL4-S1 plates join here
  const shp = shipHud(player) + (dock ? '' : skyButtons(player, ctx)); // the helm readout: outside the den memo, it moves every few ticks
  wkey += `|nh${dock ? 1 : 0}${nhDevOpen ? 1 : 0}`;
  const sysw = sysWindow(ctx, player, touch) + wardrobeWin(player, touch) + moveAnything(player) + lightEditor(player) + terrainEditor(player, player?.state?.bld) + bugHud(ctx, player) + devbook(ctx, player); // DEN SYSTEMS window: its own string, outside the den memo
  if (player?.userId === KP_OWNER && s?.optionsOpen) wkey += `|kp|${s?.keeper?.tab ?? ''}|${s?.keeper?.open ? 1 : 0}|${keeperKey(ctx, player)}`;
  const kb = (settingOf(player?.state, 'winMove') ? '' : '<style>.wn-drag,.wn-grip{display:none!important}</style>') + (touch ? '' : keeperHud(ctx, player) + adminMenu(player, admOpen, admSubOpen) + shaderEditorHud(ctx, player) + keybindsHud(player, player?.isEditor ? 54 : 16)) + worldMapHud(ctx, player, !!ctx.world?.state?.systems?.huginn) + questBoardHud(ctx, player); // creator 2026-10-06: the unit frame is gone, the list takes the top-left · creator 2026-10-05: the quiet key list, left side
  const phx = touch ? phoneHud(player) : '';
  const cur = touch ? '' : cursorsHud(player); // creator 2026-10-10: his painted cursor set
  if (key + '|' + wkey + '|' + wxkey === memoKey) return spl(memoHtml) + frostEdge(s?.snowFrost) + skh + phx + shp + travelHud(player, touch, ctx) + gondolaHud(s, touch) + austrZoneHud(ctx, player) + sysw + kb + cur;
  memoKey = key + '|' + wkey + '|' + wxkey;
  const view = { state: { fed: s?.fed, mead: s?.mead, optionsOpen: s?.optionsOpen && !L, fov: s?.fov, speed: s?.speed, optTab: s?.optTab ?? 'general', gains: ctx.world?.audio?.gains ?? {}, rolfVol: ctx.place?.state?.rolfVol, oldV: ctx.place?.state?.oldSong?.v ?? 100, song: ctx.place?.state?.song ?? 'auto', turnTrack: ctx.place?.state?.song === 'auto' || !ctx.place?.state?.song ? ctx.place?.state?.turn?.track : null, turnN: ctx.place?.state?.turn?.n ?? 0, turnRolls: ctx.place?.state?.turn?.rolls ?? '', ulfVol: ctx.place?.state?.ulfVol, ulfAlways: !!ctx.place?.state?.ulfAlways, ormVol: ctx.place?.state?.ormVol, ormAlways: !!ctx.place?.state?.ormAlways, oldOff: !!ctx.place?.state?.oldSong?.off, jevWander: ctx.place?.state?.jevWander !== false, osm: s?.optionsOpen && !L && !touch ? osSettingsModel(ctx, player, rolf) : null, canVol: !!player?.isEditor, emoteVol: typeof player?.state?.emoteVol === 'number' ? player.state.emoteVol : 100, chatFilter: player?.state?.chatFilter !== false, wqg, bld: s?.bld, rolfAlways: rolf, ...wxv } };
  memoHtml = !touch ? settings(view, ctx, player) + meadTally(view, false)
    : `<div id="den-strip" style="position:fixed;left:50%;transform:translateX(-50%);top:${TOUCH_TOP};display:flex;align-items:center;gap:8px;pointer-events:none">`
      + gearButton() + meadTally(view, true) + `</div>` + settings(view, ctx, player);
  if (cv) memoHtml += chessPanel(g, touch);
  if (holding && !touch) memoHtml += guitar ? guitarHint() : lyreHint();
  if (tunRow) memoHtml += tuningPlate(tunRow, touch);
  if (s?.ravenScroll) memoHtml += ravenScroll(s.ravenScroll);
  if (jb) memoHtml += judgePopup(jb);
  if (hb) memoHtml += huginnPopup(hb);
  if (hm) memoHtml += huginnMap(hm);
  if (rt && !touch) memoHtml += reticle(rt);
  if (!dock) memoHtml += wakeChip(wq);
  if (L) memoHtml += ledgerWindow(L, ledgerData, touch);
  if (JD) memoHtml += jevDeskWindow(JD, jmeter, touch, jlive, jnow);
  if (!dock && swv) memoHtml += watchDot(swv);
  if (dock) { nhLast = { player, wq, swv }; memoHtml += topStrip(player, wq, swv); }
  return spl(memoHtml) + frostEdge(s?.snowFrost) + skh + shp + travelHud(player, touch, ctx) + gondolaHud(s, touch) + austrZoneHud(ctx, player) + sysw + kb + cur;
}
// W8 snow: a faint frost edge on the screen while player.state.snowFrost (0..1, scripts/snow-sound.js) is up; melts by the hearth.
function frostEdge(f) { f = Math.round((+f || 0) * 10) / 10; return f < 0.1 ? '' : `<div style="position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 ${60 + f * 90}px ${8 + f * 26}px rgba(226,238,255,${(0.32 * f).toFixed(2)})"></div>`; }
const LOAF = `<svg width="18" height="14" viewBox="0 0 18 14" style="display:block"><path d="M2 12 C0 12 0 5 4 3 C7 1 11 1 14 3 C18 5 18 12 16 12 Z" fill="#e7b457" stroke="#5a3a1e" stroke-width="1.2"/><path d="M6 4.5 L7.5 7 M9.5 3.8 L11 6.4 M13 4.8 L14 7" stroke="#8a5a2b" stroke-width="1.2" stroke-linecap="round"/></svg>`;
function meadTally(player, touch) {
  const mead = player?.state?.mead ?? 0, fed = player?.state?.fed ?? 0;
  if (!mead && !fed) return '';
  const horns = Math.min(mead, 8), extra = mead - horns;
  const at = touch ? 'position:static' : 'position:fixed;left:18px;bottom:18px';
  const meadPart = mead ? `<span style="opacity:.8">mead</span>
    <span style="font-size:16px;color:#e7b457">${'◖'.repeat(horns)}</span>${extra ? `<span style="opacity:.8">+${extra}</span>` : ''}` : '';
  const fedPart = fed ? `${mead ? '<span style="opacity:.35">·</span>' : ''}<span style="display:flex;align-items:center;gap:5px">${LOAF}<span id="den-fed" style="font-size:16px;color:#e7b457">${fed}</span><span style="opacity:.8">fed</span></span>` : '';
  return `<div${!touch && UI4.frames ? ' class="nh-panel"' : ''} style="${at};display:flex;align-items:center;gap:8px;padding:6px 12px 6px 10px;border-radius:10px;white-space:nowrap;max-width:calc(100vw - 2 * var(--spawn-chrome-reservation-right-inset, 50px) - 80px);overflow:hidden;
    background:rgba(40,26,16,.55);border:1px solid rgba(201,164,106,.45);color:#f4e3c3;font-family:Georgia,serif;font-size:14px;letter-spacing:1px;pointer-events:none">
    ${meadPart}${fedPart}
    <span style="opacity:.6;font-size:12px">skál</span></div>`;
}

// The chess view's parchment (E on the north bench's board): whose move, who's winning, the last ten moves.
// Top-right, kept a rail's width off the right edge so it never meets Spawn's rail band; only while chessView.on.
function rolfRow(ctx) { try { return ctx.place?.objects?.['lore-skald'] ?? ctx.getObject?.('lore-skald'); } catch (e) { return null; } }
function chessGame(ctx) {
  const id = CHESS.board.id;
  try { return (ctx.place?.objects?.[id] ?? ctx.getObject?.(id))?.state?.chess ?? null; } catch (e) { return null; }
}
function chessPanel(g, touch) {
  const P = CHESS.players, gW = !g || g.whiteSeat !== 'high';
  const names = { w: gW ? P.gunnar.name : P.sigrid.name, b: gW ? P.sigrid.name : P.gunnar.name };
  let head = 'The pieces are being set out…';
  if (g) {
    if (g.phase === 'mate' || g.result) head = esc(g.result ?? `${names[g.turn === 'w' ? 'b' : 'w']} wins`);
    else head = `<b>${names[g.turn] ?? '—'}</b> to move <span style="opacity:.6">· ${g.turn === 'w' ? 'bone' : 'walnut'}</span>${g.check ? ' <b style="color:#9a2b1c">check!</b>' : ''}`;
  }
  // the eval: the last mover's engine score (centipawns, the mover's own view), turned to Gunnar's share of the bar
  let bar = '';
  const sc = g?.last?.score;
  let cp = null;
  if (typeof sc === 'number' && isFinite(sc)) {
    const by = String(g.last.by ?? '').toLowerCase();
    const moverGunnar = by ? (by.includes('gunnar') || by.includes('bearded') || by === 'low') : ((g.turn === 'w') !== gW);
    cp = moverGunnar ? sc : -sc;
  } else if (g?.fen) { // no engine score posted: the material balance off the FEN, from Gunnar's side
    const M = CHESS.view.material; let wb = 0;
    for (const c of String(g.fen).split(' ')[0]) { const v = M[c.toLowerCase()]; if (v) wb += c === c.toUpperCase() ? v : -v; }
    cp = gW ? wb : -wb;
  }
  if (cp != null) {
    const share = 1 / (1 + Math.exp(-cp / 250)), pct = Math.round(share * 100);
    const lead = Math.abs(cp) < 40 ? 'level' : `${cp > 0 ? P.gunnar.name : P.sigrid.name} ${Math.abs(cp) >= 900 ? 'winning' : 'ahead'} ${(Math.abs(cp) / 100).toFixed(1)}`;
    bar = `<div style="display:flex;justify-content:space-between;font-size:11px;letter-spacing:.06em;margin-top:8px;opacity:.75"><span>${P.gunnar.name}</span><span>${lead}</span><span>${P.sigrid.name}</span></div>
      <div style="height:5px;margin-top:3px;background:#5a3b22;border:1px solid #3b2716;overflow:hidden"><div id="chess-eval" style="height:100%;width:${pct}%;background:#f3e6c8;transition:width .8s ease"></div></div>`;
  }
  const h = g?.history ?? [], pairs = Math.ceil(h.length / 2), first = Math.max(0, pairs - 10);
  let rows = '';
  for (let i = first; i < pairs; i++) {
    const lastRow = i === pairs - 1;
    rows += `<div style="display:grid;grid-template-columns:26px 1fr 1fr;${lastRow ? 'font-weight:bold;' : 'opacity:.82;'}"><span style="opacity:.55">${i + 1}.</span><span>${esc(h[i * 2])}</span><span>${esc(h[i * 2 + 1] ?? '')}</span></div>`;
  }
  const words = g?.last?.words ? `<div style="margin-top:6px;font-style:italic;font-size:12px;line-height:1.3;opacity:.85">${esc(g.last.words)}</div>` : '';
  const at = touch ? 'top:calc(var(--spawn-safe-area-top, 0px) + 68px);' : 'top:24px;';
  return `<div id="chess-panel" style="position:fixed;${at}right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px);width:min(228px, 44vw);box-sizing:border-box;padding:10px 14px 12px;
    background:linear-gradient(170deg,#f4e7c9,#e6d2a6);border:2px solid #7a5230;border-radius:4px;box-shadow:4px 4px 0 rgba(20,12,6,.55);
    color:#3b2716;font-family:Georgia,serif;font-size:13px;pointer-events:none;max-height:calc(100vh - 48px);overflow:hidden">
    <div style="font-size:10px;letter-spacing:.18em;opacity:.6">THE NORTH BENCH</div>
    <div style="font-size:15px;margin-top:2px">${head}</div>${bar}${words}
    ${rows ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(90,59,34,.35);font-size:12.5px;line-height:1.45">${rows}</div>` : ''}
    <div style="margin-top:8px;font-size:10px;letter-spacing:.1em;opacity:.5">E · step back</div></div>`;
}

// Rolf's borrowed guitar in hand (desktop): the same strip, its own keys.
function guitarHint() {
  const k = (t) => `<b style="color:#e7b457;font-weight:normal">${t}</b>`;
  return `<div id="guitar-hint" style="position:fixed;left:50%;transform:translateX(-50%);bottom:84px;padding:6px 14px;border-radius:10px;background:rgba(40,26,16,.6);border:1px solid rgba(201,164,106,.45);
    color:#f4e3c3;font-family:Georgia,serif;font-size:13px;letter-spacing:.06em;white-space:nowrap;pointer-events:none">${k('1–6')} pluck · ${k('Z X C')} G C D chords · ${k('click')} strum · ${k('E')} give it back to Rolf</div>`;
}

// The borrowed guitar's tuning, one small line just above the hint while it's in hand (the row's state.tuning; standard if none).
function heldRow(ctx, heldId) {
  try { const C = ctx.getObject?.(heldId), row = ctx.getObject?.(C?.state?.from ?? 'lore-skald-guitar'); return guitarTuning(row); } catch (e) { return guitarTuning(null); }
}
// The tuning plate: a carved walnut board over the hint while the guitar is in hand. Eight tunings as brass-edged chips (the one
// it is in lit gold), the six open notes under them like pegs on a headstock. T steps through; a chip is a click when the cursor is free.
const SHORT = { standard: 'standard', dropD: 'drop D', doubleDropD: 'double drop D', openD: 'open D', openG: 'open G', dadgad: 'DADGAD', halfDown: '½ step down', lyreHome: 'lyre home' };
const noteName = (m) => ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'][((m % 12) + 12) % 12];
function tuningPlate(T, touch) {
  const chips = Object.keys(GTUNINGS).map((id) => {
    const on = id === T.name;
    return `<button id="gt-${id}" onclick="sendAction('guitarTune',{name:'${id}'})" style="font:inherit;font-size:12px;letter-spacing:.05em;padding:4px 9px;border-radius:6px;cursor:pointer;white-space:nowrap;
      ${on ? 'background:linear-gradient(#e9bd62,#b9853a);color:#2a1a0d;border:1px solid #f6dc9a;box-shadow:0 0 10px rgba(231,180,87,.45)' : 'background:rgba(24,15,9,.55);color:#f0dcb8;border:1px solid rgba(201,164,106,.5)'}">${SHORT[id] ?? id}</button>`;
  }).join('');
  const pegs = T.midi.map((m) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f1dca6,#a8793a 70%,#5a3a1e);color:#2a1a0d;font-size:11px;font-weight:bold;box-shadow:0 1px 0 #2a1a0d">${noteName(m)}</span>`).join('');
  return `<div id="guitar-tuning" style="position:fixed;left:50%;transform:translateX(-50%);bottom:${touch ? 'calc(var(--spawn-safe-area-bottom, 0px) + 160px)' : '122px'};
    max-width:calc(100vw - 2 * (var(--spawn-chrome-reservation-right-inset, 50px) + 24px));padding:10px 14px 11px;border-radius:14px;
    background:linear-gradient(170deg,#5b3d27,#3d2717 60%,#2c1c10);border:2px solid #1e130a;box-shadow:inset 0 0 0 1px rgba(233,189,98,.35),0 4px 0 rgba(0,0,0,.35);
    color:#f4e3c3;font-family:Georgia,serif;text-align:center;pointer-events:auto">
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px">
      <span style="font-size:10px;letter-spacing:.22em;opacity:.7">TUNING</span>
      <span style="display:flex;gap:5px;padding:3px 8px;border-radius:13px;background:rgba(0,0,0,.28)">${pegs}</span>
      ${touch ? '' : '<span style="font-size:10px;letter-spacing:.12em;opacity:.7"><b style="color:#e7b457;font-weight:normal">T</b> next</span>'}
    </div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:5px;max-width:470px">${chips}</div></div>`;
}

// The hall lyre in hand (desktop): how to play it, bottom-centre over the composer, gone when it's set down.
function lyreHint() {
  const k = (t) => `<b style="color:#e7b457;font-weight:normal">${t}</b>`;
  return `<div id="lyre-hint" style="position:fixed;left:50%;transform:translateX(-50%);bottom:84px;padding:6px 14px;border-radius:10px;background:rgba(40,26,16,.6);border:1px solid rgba(201,164,106,.45);
    color:#f4e3c3;font-family:Georgia,serif;font-size:13px;letter-spacing:.06em;white-space:nowrap;pointer-events:none">${k('1–6')} pluck · ${k('click')} strum · ${k('right-click')} strum up · ${k('E')} set it down</div>`;
}

// NORSE-HUD: the one thin top-centre strip: the den's name, the sky buttons (editors), the Savi-watch dot and a "⚙ dev" tab whose
// drawer holds the wake chip/banner and the F8 hint. The drawer's open state is this page's alone (nhDevOpen); every action is unchanged.
let nhDevOpen = false, nhLast = null;
function topStrip(player, wq, swv) {
  const ed = !!player?.isEditor, dev = ed && !!wq;
  if (!ed && !swv) return '';
  const hot = dev && (wq.escalate || wq.ready);
  const sky = ed ? skyButtons(player, skyCtx).replace(/^<div style="[^"]*">/, '<div class="nh-sky">') : '';
  const tab = dev ? `<button id="nh-devtab" type="button" class="nh-btn${nhDevOpen ? ' on' : ''}" onclick="nhDev()" title="${wq.escalate ? String(wq.banner ?? 'Savi missed 3 wakes').replace(/[<>&"]/g, '') : 'dev drawer: wake Savi (F8)'}">⚙ dev${hot ? '<span class="nh-dot"></span>' : ''}</button>` : '';
  const drawer = dev && nhDevOpen ? `<div id="nh-drawer" class="nh-panel">${wakeChip(wq)}<div class="nh-hint">F8 wakes Savi · G calls Savi to watch, G again cancels</div></div>` : '';
  return `<div id="nh-topwrap"><div id="nh-top" class="${hot ? 'hot' : ''}"><span class="nh-title" style="font-size:12px;border:0!important;box-shadow:none!important">ᚦ Mellowbrook</span>${sky}${swv ? watchDot(swv) : ''}${tab}</div>${drawer}</div>`;
}
export function nhDev() {
  nhDevOpen = !nhDevOpen; memoKey = null;
  try { const el = document.getElementById('nh-topwrap'); if (el && nhLast) el.outerHTML = topStrip(nhLast.player, nhLast.wq, nhLast.swv); } catch (e) {}
}
// WAKE QUEUE v2: the creator's own wake. A quiet chip top-left in the build room (F8), and a warm banner when Savi missed 3 wakes.
function wakeRow(ctx) {
  try { if (ctx.world?.mode && ctx.world.mode !== 'dev') return null; const b = ctx.place?.objects?.['board-bell'] ?? ctx.getObject?.('board-bell'); return b ? (b.state?.wakeQ ?? {}) : null; } catch (e) { return null; }
}
function wakeChip(q) {
  if (!q) return '';
  const chip = `<button id="wake-savi" onclick="sendAction('wakeSavi')" title="wake Savi (F8)" style="position:fixed;left:${h4left}px;top:calc(var(--spawn-safe-area-top, 0px) + 14px);padding:4px 10px;border-radius:8px;border:1px solid rgba(201,164,106,.45);background:rgba(40,26,16,.45);color:#f4e3c3;font-family:Georgia,serif;font-size:12px;letter-spacing:1px;opacity:${q.ready ? '.95' : '.6'};cursor:pointer;pointer-events:auto">F8 · wake savi${q.ready ? ' ·' : ''}</button>`;
  if (!q.escalate) return chip;
  const txt = String(q.banner ?? 'Savi missed 3 wakes · press F8').replace(/[<>&]/g, '');
  return chip + `<div id="wake-banner" style="position:fixed;left:50%;transform:translateX(-50%);top:calc(var(--spawn-safe-area-top, 0px) + 14px);max-width:min(560px,70vw);padding:10px 16px;border-radius:12px;background:rgba(40,26,16,.9);border:1px solid rgba(231,180,87,.8);box-shadow:4px 4px 0 rgba(20,12,6,.6);color:#f4e3c3;font-family:Georgia,serif;font-size:14px;display:flex;gap:12px;align-items:center;pointer-events:auto"><span style="color:#e7b457">ᚲ</span><span>${txt}</span><button onclick="sendAction('wakeSavi')" style="padding:5px 12px;border-radius:999px;border:1px solid rgba(201,164,106,.6);background:rgba(186,137,80,.85);color:#1e140c;font-family:inherit;cursor:pointer">wake her</button></div>`;
}

// D8 raven post: the birchbark scroll a raven unrolls on E (player.state.ravenScroll, set by scripts/raven-post.js); rolls itself up.
function ravenScroll(r) {
  const b = RAVEN_POST.birds[r.bird], t = b?.texts?.[r.i];
  if (!t) return '';
  const rod = 'height:14px;border-radius:7px;background:linear-gradient(#8a6a48,#4f3828 60%,#3a281c);box-shadow:0 2px 4px rgba(0,0,0,.4);margin:0 -10px';
  return `<div style="position:fixed;left:50%;top:44%;transform:translate(-50%,-50%);width:min(460px,82vw);pointer-events:none;font-family:Georgia,serif;animation:rvUnroll .6s ease-out">
<style>@keyframes rvUnroll{from{clip-path:inset(48% 0 48% 0);opacity:.2}to{clip-path:inset(0 0 0 0);opacity:1}}</style>
<div style="${rod}"></div>
<div style="background:linear-gradient(90deg,#e6d6b4,#f2e6cf 18%,#efe0c2 70%,#dcc8a2);padding:18px 26px 16px;color:#3a2a1e;box-shadow:inset 0 0 22px rgba(120,84,48,.35)">
<div style="text-align:center;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#7a5530">${esc(b.name)} · ${esc(b.title)}</div>
<div style="height:1px;background:#ba8950;margin:8px 30px 12px"></div>
${t.runes ? `<div style="text-align:center;font-size:22px;letter-spacing:.12em;color:#4f3828;margin-bottom:8px">${esc(t.runes)}</div>` : ''}
${t.lines.map((l) => `<div style="text-align:center;font-size:16px;line-height:1.5;font-style:italic">${esc(l)}</div>`).join('')}
${t.src ? `<div style="text-align:right;font-size:12px;color:#7a5530;margin-top:8px">— ${esc(t.src)}</div>` : ''}
</div>
<div style="${rod}"></div></div>`;
}

// SAVI-WATCH: the dot never lies (G-a). called = grey pulse (she hasn't looked yet), watching = red REC (capturing now), filing = grey.
function watchView(ctx, s) {
  const w = s?.saviWatch; if (!w || w.done) return null;
  const now = ctx.now?.() ?? 0; if (now >= w.until) return null;
  const sec = Math.max(0, Math.floor((now - w.at) / 1000));
  return { ...w, sec, key: `${w.n}|${w.phase}|${w.size}|${sec}` };
}
function watchDot(w) {
  const t = `${String(Math.floor(w.sec / 60)).padStart(2, '0')}:${String(w.sec % 60).padStart(2, '0')}`;
  const rec = w.phase === 'watching', col = rec ? '#e0392b' : '#9a9186';
  const word = rec ? 'SAVI WATCHING' : w.phase === 'filing' ? 'SAVI FILING' : 'SAVI CALLED';
  return `<style>@keyframes swPulse{0%,100%{opacity:1}50%{opacity:.25}}</style><div id="savi-watch" title="G again cancels" style="position:fixed;left:${h4left}px;top:calc(var(--spawn-safe-area-top, 0px) + 46px);display:flex;align-items:center;gap:7px;padding:4px 10px;border-radius:8px;background:rgba(40,26,16,.55);border:1px solid ${rec ? 'rgba(224,57,43,.6)' : 'rgba(201,164,106,.35)'};color:#f4e3c3;font-family:Georgia,serif;font-size:12px;letter-spacing:1px;pointer-events:none"><span style="width:10px;height:10px;border-radius:50%;background:${col};box-shadow:0 0 6px ${col};animation:swPulse 1.2s ease-in-out infinite"></span>${word} · ${w.size === 'full' ? 'FULL' : 'QUICK'} · ${t}</div>`;
}

// VOTE-LEDGER (docs/board/proposals/VOTE-LEDGER.md, L4 + L9b): MY VOTES, the creator's window on every vote he cast.
// V-a: the rows never ride player.state. view-settings.js emits them to this machine alone as uiEvent "voteLedger";
// the last payload lives here in module memory, player.state.ledger { open, tab, filter, at } says whether and how it shows.
// GOAL4-S1 (WATCHED 6/7 + creator GO): the WoW-style frame, part 1. openWin / h4pick are this machine's alone (never state, never sent).
// Window and bar keys are page keydown (onMount), not world actions. Every change the room keeps goes sendAction('uiSet') -> scripts/ui-binds.js.
let h4left = 14, openWin = null, openWins = [], h4pick = null, h4ctx = null, h4player = null;
function plates(ctx, player) {
  h4ctx = ctx; h4player = player;
  try {
    if (!UI4.windows && !UI4.frames) return '';
    const ui = h4norm(player?.state?.ui);
    openWins = openWins.filter((w) => WINDOWS[w]); openWin = openWins[openWins.length - 1] ?? null;
    return `<div id="h4-root" class="h4${kitOn(player) ? ' kit' : ''}" data-v="${H4B}">${HUD_CSS}<style>#hud-player,#hud-bar,#hud-micro{z-index:10!important}[id^=win-][data-modal]{z-index:20!important}#tome-ui-container :has(> [data-modal]) > :not([data-modal]){opacity:1!important}</style>${UI4.frames ? NH_CSS + WOW_CSS : ''}${framePlate(ctx, player, ui)}${UI4.frames ? wowTarget(ctx, player) + OS_CSS + osMinimap(ctx, player) + osChat(ctx, player, osChatTab, osChatNote, osMineOf(ctx, player)) : ''}${UI4.frames ? nhDock(ctx, player, ui) : actionBar(ctx, player, ui, openWins, h4pick) + microMenu(ctx, player, openWins)}${openWins.map((w) => pane(player, ui, w, ctx)).join('')}</div>`;
  } catch (e) { return ''; }
}
// NORSE-HUD: the hotbar, the skills pip, the settings button and the micro menu on one backplate, bottom-centre
function nhDock(ctx, player, ui) { // WOW-HUD: the compact two-row strip bottom-centre; the micro menu + bag bar stand alone bottom-right
  const cm = isClassMode(player?.state?.combatMode); // CLASS COMBAT (Campton 2026-10-06): the crest left of the bar; a class swaps Zezima's bar for its kit, his bar untouched
  return `${stonesHud(player, stWin && cm, Number(ctx?.now?.() ?? 0))}<div id="nh-dock">${kitOn(player) ? '' : OS_GRYPHONS}<div style="position:relative;display:flex;align-items:flex-end;gap:4px">${cm ? classBar(ctx, player) : actionBar(ctx, player, ui, openWins, h4pick)}</div></div><div id="ui-mode" style="left:${kitOn(player) ? 'var(--um-left,calc(500px * var(--ospk,1) + 14px))' : '536px'}">${modeSwitch(player, cbPick)}</div>${cm && cbBook ? classBook(ctx, player, cbTab, cbPickT) : ''}${tpWin && isClassMode(player?.state?.combatMode) ? talentWindow(player) : ''}${kitOn(player) && !ospOpen ? '' : osPanel(ctx, player, ui, osTabId, osViewId)}${(player?.state?.settings?.hudSkin ?? 1) === 1 ? microMenu(ctx, player, ospOpen ? [...openWins, ...Object.keys(OS_OF).filter((k) => OS_OF[k] === osTabId)] : openWins) : ''}`; // 3rd Person: the kit's micro menu + bags stand bottom-right
}
function h4repaint() { // a module-var change: repaint our own root in place, and drop the den memo so the next render agrees
  memoKey = null;
  try { const el = document.getElementById('h4-root'); if (el && h4player) el.outerHTML = plates(h4ctx, h4player); } catch (e) {}
}
let h4audio = null;
let offCombatFx = null, offFct = null;
function h4sound(k) {
  try {
    const def = H4S[k]; if (!def || typeof audio === 'undefined' || !audio?.context) return;
    const ac = audio.context, bus = audio.bus?.('UI');
    Promise.resolve(audio.buffer(def.clip)).then((buf) => { if (!buf) return; const src = ac.createBufferSource(), g = ac.createGain(); g.gain.value = def.volume; src.buffer = buf; src.connect(g); g.connect(bus ?? ac.destination); src.start(); }).catch(() => {});
  } catch (e) {}
}
// OSRS side panel: its tabs live in the panel; the old window keys (B K I N P) now pick the tab
let osTabId = 'inv', osViewId = null;
const OS_OF = { quests: 'quests', friends: 'friends', emotes: 'emotes', music: 'music', combat: 'combat', bags: 'inv', skills: 'stats', prayer: 'prayer', spellbook: 'magic', character: 'equip' };
export function xpSetup() { xpSetupGrid(); } // the XP orb's right-click: the skill grid
let ospOpen = (() => { try { return localStorage.getItem('den-osp-open') === '1'; } catch { return false; } })(); // creator 2026-10-09: 3rd Person side panel opens from the micro menu, hidden by default
function ospSet(v) { ospOpen = v; try { localStorage.setItem('den-osp-open', v ? '1' : '0'); } catch {} }
export function ospClose() { ospSet(false); h4repaint(); }
export function osTab(t) { if (!ospOpen && kitOn(h4player)) { ospSet(true); osTabId = t; osViewId = null; h4repaint(); return; } if (osTabId === t && !osViewId) return; osTabId = t; osViewId = null; h4sound('tick'); h4repaint(); }
export function osView(v) { osViewId = v; h4sound('tick'); h4repaint(); }
const osSetClose = () => { if (typeof sendAction === 'function') sendAction('options', {}, { relockPointer: true }); };
export function osDeskOff() { osDeskSet(false); h4repaint(); } // back from the keeper's desk to the Settings window
let osChatTab = 'all', osChatNote = '', admOpen = false, admSubOpen = null;
export function admToggle() { admOpen = !admOpen; if (!admOpen) admSubOpen = null; h4repaint(); }
try { globalThis.admToggle = admToggle; } catch (e) {}
export function admSub(k) { admSubOpen = admSubOpen === k ? null : k; h4repaint(); }
export function osChatPick(t) { osChatTab = t; osChatNote = ''; if ((t === 'clan' || t === 'chan') && typeof sendAction === 'function') sendAction('osHist', { scope: t === 'clan' ? 'guild' : 'party' }); // Clan = guild, Channel = party: pull Spawn's last 20
  h4sound('tick'); h4repaint(); }
export function osChatSay(n) { osChatNote = n; h4repaint(); }
// OSCHAT lane 2 (plan docs/board/OSCHAT-SPAWN-WIRE-PLAN-2026-10-07.md): a hidden real <input> takes the keys while typing, so WASD/digits never walk or cast
let osChatIn = null, osChatSentAt = -1e9;
const osChatMirror = (text, typing) => { try { if (typeof OSCV.setOsChatInput === 'function') OSCV.setOsChatInput(text, typing); } catch (e) {} };
export function osChatFocus() { const el = osChatIn ?? document.getElementById('os-chat-in'); if (!el) return false; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } osChatMirror(el.value, true); return true; }
function osChatKey(e) {
  const el = osChatIn; if (!el) return;
  const focused = document.activeElement === el;
  if (!focused) {
    if (e.key !== 'Enter' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const d = e.target?.ownerDocument ?? document, a = d.activeElement, tag = a?.tagName, tt = e.target?.tagName; // the key may come from the host page (the UI frame never hears it): its own focus decides
    if (tag === 'INPUT' || tag === 'TEXTAREA' || a?.isContentEditable || tt === 'INPUT' || tt === 'TEXTAREA' || e.target?.isContentEditable) return;
    e.preventDefault(); osChatFocus(); return;
  }
  if (e.key === 'Enter') {
    e.preventDefault(); if (e.repeat) return;
    const text = el.value.trim().slice(0, 80);
    if (text) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - osChatSentAt < 600) return; // one send per OSRS tick; the text stays for the next press
      osChatSentAt = now;
      if (typeof sendAction === 'function') sendAction('osSay', { tab: osChatTab, text });
      el.value = '';
    }
    el.blur(); return; // OSRS closes the row after a send; empty Enter just closes
  }
  if (e.key === 'Escape') { e.preventDefault(); el.value = ''; el.blur(); }
}
function mountOsChatIn() {
  let el = document.getElementById('os-chat-in');
  if (!el) {
    el = document.createElement('input'); el.id = 'os-chat-in'; el.type = 'text'; el.maxLength = 80;
    el.setAttribute('autocomplete', 'off'); el.setAttribute('autocorrect', 'off'); el.setAttribute('autocapitalize', 'off'); el.setAttribute('spellcheck', 'false'); el.setAttribute('aria-label', 'chat');
    el.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;padding:0;margin:0;font-size:16px;z-index:-1';
    document.body.appendChild(el);
  }
  osChatIn = el;
  const onIn = () => osChatMirror(el.value, true);
  const onBlur = () => osChatMirror(el.value, false);
  const onOwnKey = (e) => { if (e.key !== 'Enter' && e.key !== 'Escape') e.stopPropagation(); }; // typed keys stop at the box (keyup still flows, so a held W releases)
  el.addEventListener('input', onIn); el.addEventListener('blur', onBlur); el.addEventListener('keydown', onOwnKey);
  document.addEventListener('keydown', osChatKey, true);
  let host = null; try { const pd = window.parent && window.parent !== window ? window.parent.document : null; if (pd && pd !== document) { pd.addEventListener('keydown', osChatKey, true); host = pd; } } catch (e) {} // the game page holds the keyboard; the UI frame is same-origin
  let offOpen = null; try { offOpen = window.spawn?.on?.('event', (name) => { if (name === 'osChatOpen' && document.activeElement !== el) osChatFocus(); }); } catch (e) {} // the game page never forwards keys into this frame: a world-bound Enter (onInput -> uiEvent 'osChatOpen') opens the row
  return () => { document.removeEventListener('keydown', osChatKey, true); try { host?.removeEventListener('keydown', osChatKey, true); if (typeof offOpen === 'function') offOpen(); } catch (e) {} el.removeEventListener('input', onIn); el.removeEventListener('blur', onBlur); el.removeEventListener('keydown', onOwnKey); osChatIn = null; };
}
try { if (typeof window !== 'undefined') window.__osChatFocus = osChatFocus; } catch (e) {}
// the chat box's own lines (creator 2026-10-06): "You mine some copper." is this player's alone, so it rides a page-local ring, never the shared log
let osMine = [], osMsgN = null, osScroll = 0;
function osMineOf(ctx, player) {
  const m = player?.state?.skillMsg;
  if (m && m.n !== osMsgN) { if (osMsgN !== null && m.text) osMine = [...osMine, { k: 'game', t: String(m.text).slice(0, 200), at: (() => { try { return ctx.now(); } catch { const l = ctx?.place?.state?.chatLog; return (Array.isArray(l) && l.length ? l[l.length - 1].at : 0) + 1; } })() }].slice(-40); osMsgN = m.n; }
  if (osScroll) setTimeout(osRestore, 0); else setTimeout(osThumb, 0);
  return osMine;
}
// column-reverse: scrollTop 0 is the newest line, negative is history. The thumb sits at the bottom when you are at the newest
function osThumb() {
  const l = document.querySelector('#osch .log'), u = document.querySelector('#osch .sc u'); if (!l || !u) return;
  const room = l.scrollHeight - l.clientHeight, track = l.clientHeight - 32 + 6;
  const h = room > 0 ? Math.max(14, track * l.clientHeight / l.scrollHeight) : track;
  const f = room > 0 ? Math.min(1, Math.max(0, -l.scrollTop / room)) : 0;
  u.style.height = h + 'px'; u.style.bottom = (16 + f * (track - h)) + 'px';
}
function osRestore() { const l = document.querySelector('#osch .log'); if (l) l.scrollTop = osScroll; osThumb(); }
function osOnWheel(e) {
  const l = e.target?.closest?.('#osch')?.querySelector('.log'); if (!l) return;
  e.preventDefault(); e.stopPropagation();
  l.scrollTop += e.deltaY > 0 ? 48 : -48; osScroll = l.scrollTop; osThumb();
}
function osOnScroll(e) { if (e.target?.matches?.('#osch .log')) { osScroll = e.target.scrollTop; osThumb(); } }
export function osSheet() { winToggle('character'); }
export function hudToggle(id) {
  if (UI4.frames && OS_OF[id] && kitOn(h4player) && ospOpen && osTabId === OS_OF[id]) { ospClose(); return; } // a second press closes (3rd Person)
  if (UI4.frames && OS_OF[id]) { osTab(OS_OF[id]); return; }
  winToggle(id);
}
function winToggle(id) {
  if (!UI4.windows || !WINDOWS[id]) return;
  const was = openWins.includes(id); openWins = was ? openWins.filter((w) => w !== id) : [...openWins, id]; openWin = openWins[openWins.length - 1] ?? null; h4pick = null; // view only: nothing sent; data-modal's leaving relocks mouse-look (engine)
  h4sound(was ? 'close' : 'open'); h4repaint();
}
export function hudPick(i) { if (!UI4.frames) return; h4pick = h4pick === i ? null : i; h4repaint(); }
function uiSet(field, index, value) { if (!UI4.keys || typeof sendAction !== 'function') return; sendAction('uiSet', { field, index, value }); h4sound('tick'); }
export function hudAssign(i, v) { h4pick = null; uiSet('bar', i, v); h4repaint(); }
export function hudTrack(id) { uiSet('track', 0, id); }
// SPELLBOOK: drag a spell (from = -1) or a bar slot (from = its index) onto a slot; a slot-to-slot drop swaps the two
let h4drag = null, h4spellPick = null;
export function hudDrag(ev, v, from) { h4drag = { v, from }; try { ev.dataTransfer.setData('text/plain', v); ev.dataTransfer.effectAllowed = 'copyMove'; } catch (e) {} }
export function hudDrop(ev, i) { try { ev.preventDefault(); } catch (e) {} const d = h4drag; h4drag = null; if (!d || d.from === i) return; const bar = h4norm(h4player?.state?.ui).bar; if (d.from >= 0) uiSet('bar', d.from, bar[i] ?? ''); uiSet('bar', i, d.v); h4pick = null; h4repaint(); }
let cbPick = false; // CLASS COMBAT: the style picker open
// creator 2026-10-09: the crest beside the chat flips the whole game: 3rd Person interface + the WoW bar <-> the OSRS interface + the OSRS spellbook
// creator 2026-10-10: each click flicks OSRS -> Warrior -> Paladin -> Hunter -> Rogue -> Priest -> Shaman -> Mage -> Warlock -> Druid -> OSRS
export function hudFlip() { cbPick = false; const next = nextMode(h4player?.state?.combatMode ?? 'osrs'); if (typeof sendAction === 'function') { sendAction('setSetting', { id: 'hudSkin', v: next === 'osrs' ? 0 : 1 }); sendAction('combatMode', { mode: next }); } h4sound('tick'); h4repaint(); }
export function hudModeSkin(mode) { if (typeof sendAction === 'function') sendAction('setSetting', { id: 'hudSkin', v: mode === 'osrs' ? 0 : 1 }); }
export function hudModePick() { cbPick = !cbPick; h4sound('tick'); h4repaint(); }
export function hudMode(mode) { cbPick = false; hudModeSkin(mode); if (typeof sendAction === 'function') sendAction('combatMode', { mode }); h4repaint(); }
let tpWin = false; export function hudTalents() { tpWin = !tpWin; h4sound(tpWin ? 'open' : 'close'); h4repaint(); }
let cbBook = false, cbTab = 0, cbPickT = null; // CLASS CATALOG: page-local open / tab / socket picker
export function hudClassBook() { cbBook = !cbBook; cbPickT = null; h4sound('tick'); h4repaint(); }
export function hudClassTab(t) { cbTab = t; cbPickT = null; h4sound('tick'); h4repaint(); }
export function hudClassPick(id, i) { cbPickT = id ? { id, i } : null; h4sound('tick'); h4repaint(); }
export function hudClassGem(p) { if (p?.act === 'socket') cbPickT = null; if (typeof sendAction === 'function') sendAction('classGem', p); h4repaint(); }
let stWin = false; // PORTAL STONE window open (Campton 2026-10-10)
export function hudHearth() { if (typeof sendAction === 'function') sendAction('hearth'); h4sound('tick'); }
export function hudPortalWin() { stWin = !stWin; h4sound('tick'); h4repaint(); }
export function hudPortalGo(zone) { stWin = false; if (typeof sendAction === 'function') sendAction('stonePortal', { zone }); h4sound('tick'); h4repaint(); }
export function hudClassCast(slot) { if (typeof sendAction === 'function') sendAction('classCast', { slot }); }
export function hudCast(id) { if (typeof sendAction !== 'function') return; sendAction('cbCast', { id }); }
export function hudPickSpell(i) { h4spellPick = i; h4pick = null; if (!openWins.includes('spellbook')) hudToggle('spellbook'); else h4repaint(); }
export function hudBook(id) { if (h4spellPick != null) { const i = h4spellPick; h4spellPick = null; hudAssign(i, sbBarValue(id)); return; } hudCast(id); }
export function hudDock(id, slot) { uiSet('layout', id, slot); }
// GOAL4-S1-FIX F1d: one gate for K/B/F10, fed by the page key and the room relay; the second arrival of one press (other src, < 400 ms) drops
let h4last = null, offH4 = null;
function h4gate(id, src) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (h4last && h4last.id === id && h4last.src !== src && now - h4last.at < 400) return;
  h4last = { id, src, at: now }; hudToggle(id);
}
function h4key(e) {
  if (!UI4.windows || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target, tag = t?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
  const k = e.key?.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'ArrowDown' && e.shiftKey) { e.preventDefault?.(); if (openWins.length) { openWins = []; openWin = null; h4pick = null; h4sound('close'); h4repaint(); } if (typeof sendAction === 'function') sendAction('closeAll', { page: 1 }, { relockPointer: true }); return; } // Shift+Down: close every window (creator 2026-10-05)
  if (FIX4.esc && k === 'Escape' && openWin) { hudToggle(openWin); return; } // GOAL4-S1-FIX F1a: Escape shuts our window first; never preventDefault (Escape stays Spawn's)
  if (k === 'n' && isClassMode(h4player?.state?.combatMode)) { e.preventDefault?.(); hudTalents(); return; } // 3rd person: N is the talent tree, not the OSRS spellbook
  if (k === 'Escape' && stWin) { hudPortalWin(); return; }
  if (k === 'Escape' && tpWin) { hudTalents(); return; }
  if (k === 'l') { osTabId = osTabId === 'emotes' ? 'inv' : 'emotes'; osViewId = null; h4sound('tick'); h4repaint(); return; } // L: the Emotes tab (creator 2026-10-06)
  for (const w of Object.values(WINDOWS)) if (w.key === k) { if (FIX4.esc) e.preventDefault?.(); h4gate(w.id, 'key'); return; } // F1a: a consumed key (F10) never reaches the browser
  if (isClassMode(h4player?.state?.combatMode) && /^Digit[0-9]$/.test(e.code ?? '')) { if (e.altKey) { e.preventDefault?.(); const d = +e.code.slice(5); if (d === 1) { hudHearth(); return; } if (d === 2) { hudPortalWin(); return; } hudClassCast(20 + (d === 0 ? 9 : d - 1)); return; } if (e.shiftKey) { e.preventDefault?.(); const d = +e.code.slice(5); hudClassCast(10 + (d === 0 ? 9 : d - 1)); } return; } // CLASS COMBAT: digits are the kit's; the world's pluck binds cast 1-0, Shift+digit the top row
  const bi = BAR_KEYS.indexOf(k);
  if (bi >= 0 && FIX4.holdBar) { const hs = h4player?.state; if (hs?.holding && FIX4.instruments.includes(hs.holdingKind ?? 'lyre')) return; } // F1b: an instrument in hand keeps the digits as notes (no window, no preventDefault)
  if (bi >= 0 && UI4.frames) { const v = h4norm(h4player?.state?.ui).bar[bi]; if (bi >= 10 && typeof v === 'string' && v.startsWith('sp:') && !isOldSpell(v.slice(3))) { e.preventDefault?.(); hudCast(v.slice(3)); return; } if (v === 'campfire') { if (typeof sendAction === 'function') sendAction('campfire'); return; } if (WINDOWS[v]) { if (FIX4.esc) e.preventDefault?.(); hudToggle(v); } }
}
let ledgerData = null, ledgerStamp = 0, lastLedger = null, lastTouch = false, offLedger = null, offKeys = null;
export function onMount(container, player) {
  installMenuSound(); // right-click menu ticks
  try { installInvDrag(); } catch (e) {} // backpack: hold an item, drag it to another slot (invMove)
  try { if (!coarse()) mountThemes(); } catch (e) {}
  try { mountMoveAnything(container); } catch (e) {}
  try { offCombatFx = installCombatFx(container); } catch (e) {} // combat start / hit / kill / death juice
  try { offFct = installFct(container); } catch (e) {} // WoW floating combat text
  mountSkills(container); // SKILLS-WC S6: +xp drops, level-up banner
  mountXp(container, player); // OSRS XP counter, falling XP drops and XP globes
  try {
    offLedger = window.spawn?.on?.('event', (name, payload) => {
      if (name !== 'voteLedger' || !payload) return;
      ledgerData = payload; ledgerStamp++; memoKey = null;
      // the event may land after the render that opened the window: repaint just the window in place
      const el = document.getElementById('vote-ledger');
      if (el && lastLedger) el.outerHTML = ledgerWindow(lastLedger, ledgerData, lastTouch);
    });
    offH4 = window.spawn?.on?.('event', (name, payload) => { // F1d: the relay's ear, the only route from ui-binds.js
      if (name === 'h4closeAll') { if (openWins.length) { openWins = []; openWin = null; h4pick = null; h4sound('close'); h4repaint(); } return; }
      if (name !== 'h4win' || !payload || !WINDOWS[payload.id]) return; // every registered window (the old four-name list left N and I dead)
      h4gate(payload.id, 'relay');
    });
    const onKey = (e) => { if (e.key === 'Escape' && lastLedger && typeof sendAction === 'function') sendAction('voteLedger', { op: 'close' }); h4key(e); };
    document.addEventListener('keydown', onKey); document.addEventListener('wheel', osOnWheel, { passive: false, capture: true }); document.addEventListener('scroll', osOnScroll, true);
    let offOsChat = null; try { offOsChat = mountOsChatIn(); } catch (e) {}
    offKeys = () => { try { offOsChat?.(); } catch (e) {} document.removeEventListener('keydown', onKey); document.removeEventListener('wheel', osOnWheel, { capture: true }); document.removeEventListener('scroll', osOnScroll, true); };
    // a reload with the window still open: ask for the rows again (the payload never persisted)
    if (player?.isEditor && player?.state?.ledger?.open && typeof sendAction === 'function') sendAction('voteLedger', { op: 'open' });
    try { if (typeof osChatFocus === 'function') window.__osChatFocus = osChatFocus; installOsChatTouch(); } catch (e) {} // LANE 7 PHONE (guarded until lane 2's osChatFocus lands)
  } catch (e) { /* no page bridge: the window simply waits for its rows */ }
}
export function onDestroy() { try { unmountThemes(); kpFpsSet(false); kpPhotoSet(false); } catch (e) {} unmountMoveAnything(); unmountSkills(); unmountXp(); try { if (typeof offCombatFx === "function") offCombatFx(); } catch (e) {} try { if (typeof offLedger === 'function') offLedger(); if (typeof offH4 === 'function') offH4(); if (offKeys) offKeys(); } catch (e) {} offLedger = offKeys = offH4 = null; }
const VLC = { walnut: '#4f3828', linen: '#f2e6cf', honey: '#ba8950', ink: '#3a2a1e', dim: '#7a5530' };
function myVotesButton(touch) {
  return `<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(201,164,106,.3)">
      <button id="my-votes" onclick="sendAction('voteLedger',{op:'open'})" style="width:100%;${touch ? TAP + ';' : ''}padding:8px 0;border-radius:8px;border:1px solid rgba(201,164,106,.6);background:rgba(186,137,80,.85);color:#1e140c;font-family:inherit;font-size:13px;letter-spacing:.14em;cursor:pointer">ᚱ MY VOTES</button>
      <div style="font-size:11px;opacity:.6;margin-top:4px">every vote you cast, where it stands, ★ to build it sooner</div>
      <button id="jev-master" onclick="sendAction('jevMaster',{op:'open'})" style="width:100%;margin-top:10px;${touch ? TAP + ';' : ''}padding:8px 0;border-radius:8px;border:1px solid rgba(201,164,106,.6);background:rgba(79,56,40,.9);color:#f2e6cf;font-family:inherit;font-size:13px;letter-spacing:.14em;cursor:pointer">ᛃ JEV MASTER</button>
      <div style="font-size:11px;opacity:.6;margin-top:4px">how hard JEV thinks, and what he thinks about</div></div>`;
}
const LTABS = [['ideas', 'IDEAS'], ['merges', 'MERGES'], ['critical', 'CRITICAL'], ['all', 'ALL']];
const LCHIPS = ['PENDING', 'BUILDING', 'BUILT', 'DENIED', 'MERGED'];
function ledgerAgo(at) {
  const h = (Date.now() - (+at || 0)) / 3.6e6;
  return !(h >= 0) || !isFinite(h) ? '' : h < 1 ? 'asked under an hour ago' : `asked ${Math.round(h)} h ago`;
}
const VLCSS = `<style>#vote-ledger .vr{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid rgba(79,56,40,.12)}#vote-ledger .vr:nth-child(even){background:rgba(186,137,80,.09)}
#vote-ledger .vi{flex:none;width:44px;font-size:12px;color:#4f3828;font-weight:bold}#vote-ledger .vt{flex:1;min-width:0}#vote-ledger .vt>b{display:block;font-weight:normal;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vote-ledger .vs{display:block;font-size:11px;color:#7a5530;margin-top:1px}#vote-ledger .vv{flex:none;width:44px;font-size:11px;letter-spacing:.08em;color:#7a5530}#vote-ledger .vp{flex:none;padding:2px 8px;border-radius:999px;font-size:10px;letter-spacing:.1em;color:#f2e6cf}
#vote-ledger .vk{flex:none;width:34px;text-align:right;font-size:12px;color:#ba8950}#vote-ledger .vx{flex:none;width:28px;height:28px;padding:0;border:none;background:none;font-size:19px;line-height:1;color:rgba(79,56,40,.45);cursor:pointer}
#vote-ledger .vx.on{color:#d9a441;text-shadow:1px 1px 0 #4f3828}#vote-ledger .vx:disabled{opacity:.3;cursor:default}#vote-ledger.touch .vx{width:44px;height:44px}#vote-ledger .vx:hover:not(:disabled){color:#d9a441}</style>`;
const PILL_DARK = { BUILDING: 1, REVOTE: 1, BUILT: 1 };
function ledgerRow(r, pinsFull) {
  const pend = r.status === 'PENDING', sub = [];
  if (r.status === 'REVOTE' && !/vote again/i.test(r.note ?? '')) sub.push('<b style="color:#b0741c;font-weight:normal">vote again</b>');
  if (r.target) sub.push(`→ ${esc(r.target)}`);
  if (r.note) sub.push(r.status === 'REVOTE' ? `<i>${esc(r.note).replace(/vote again/i, '<b style="color:#b0741c;font-weight:normal;font-style:normal">vote again</b>')}</i>` : `<i>${esc(r.note)}</i>`);
  const star = pend ? `<button class="vx${r.pinned ? ' on' : ''}" onclick="sendAction('votePin',{id:'${esc(String(r.id ?? '').replace(/'/g, ''))}'})" ${!r.pinned && pinsFull ? 'disabled title="ten pins already"' : `title="${r.pinned ? 'unpin' : 'build this sooner'}"`}>${r.pinned ? '★' : '☆'}</button>` : '<span class="vx" style="cursor:default"></span>';
  return `<div class="vr"><span class="vi">${esc(r.id)}</span><span class="vt"><b>${esc(r.title)}</b>${sub.length ? `<span class="vs">${sub.join(' · ')}</span>` : ''}</span><span class="vv"${r.vote === 'NO' ? ' style="color:#8a5a4a"' : r.vote ? '' : ' style="opacity:.4"'}>${r.vote ? esc(r.vote) : '—'}</span><span class="vp" style="background:${VL.colors[r.status] ?? VLC.honey}${PILL_DARK[r.status] ? ';color:#1e140c' : ''}">${esc(r.status)}</span><span class="vk">${pend && r.rank != null ? '#' + r.rank : ''}</span>${star}</div>`;
}
function ledgerWindow(L, D, touch) {
  const tab = L.tab ?? 'all', filter = L.filter ?? null, kinds = VL.tabs?.[tab] ?? null;
  const btn = (on, label, act, extra = '') => `<button onclick="${act}" style="${touch ? TAP + ';' : ''}padding:4px 11px;border-radius:999px;border:1px solid ${on ? VLC.walnut : 'rgba(79,56,40,.35)'};background:${on ? VLC.walnut : 'transparent'};color:${on ? VLC.linen : VLC.walnut};font-family:inherit;font-size:11px;letter-spacing:.12em;cursor:pointer;${extra}">${label}</button>`;
  const place = touch ? `left:12px;top:calc(var(--spawn-safe-area-top, 0px) + 64px);width:calc(100vw - 12px - var(--spawn-chrome-reservation-right-inset, 50px) - 12px);max-height:calc(100vh - 80px);`
    : `left:clamp(24px, 10vw, 160px);top:50%;transform:translateY(-50%);width:min(640px, calc(100vw - clamp(24px, 10vw, 160px) - var(--spawn-chrome-reservation-right-inset, 50px) - 24px));max-height:calc(100vh - 48px);`;
  const t = D?.totals ?? {}, pins = D?.pins ?? [], pinsFull = pins.length >= (VL.pinCap ?? 10);
  const head = D ? `${t.waiting ?? 0} waiting · ${t.building ?? 0} building · ${t.pinned ?? pins.length} pinned · ${t.denied ?? 0} denied` : 'reading the board…';
  const jev = D?.jev?.picks?.length ? D.jev : null;
  const allStarred = jev ? jev.picks.every((p) => pins.includes(p.id)) : false;
  const jevStrip = jev ? `<div style="margin:0 0 10px;padding:9px 12px;border-radius:8px;background:rgba(186,137,80,.16);border:1px dashed rgba(186,137,80,.7)">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:12px;letter-spacing:.14em;color:${VLC.walnut}">ᛃ JEV SUGGESTS <span style="letter-spacing:.04em;color:${VLC.dim};font-size:11px">· ${esc(ledgerAgo(jev.at) || jev.day || '')}</span></span>
    ${btn(false, allStarred ? 'all five starred' : "★ star JEV's five", "sendAction('voteStarJev')", allStarred ? 'opacity:.5;' : `background:${VLC.honey};border-color:${VLC.walnut};color:#1e140c;`)}</div>
    ${jev.picks.slice(0, VL.jev?.picks ?? 5).map((p, i) => `<div style="display:flex;gap:8px;font-size:12px;line-height:1.45"><span style="flex:none;width:14px;color:${VLC.honey}">${i + 1}</span><b style="flex:none;width:40px;color:${VLC.walnut}">${esc(p.id)}</b><span style="flex:1;color:${VLC.ink};opacity:.85">${esc(p.why)}</span>${pins.includes(p.id) ? `<span style="color:#d9a441">★</span>` : ''}</div>`).join('')}</div>` : '';
  const rows = (D?.rows ?? []).filter((r) => (!kinds || kinds.includes(r.kind)) && (!filter || r.status === filter));
  const unp = (D?.unpinned ?? []).length ? `<div style="margin:0 0 8px;font-size:11px;color:${VLC.dim}">${D.unpinned.map((u) => `<div>unpinned: ${esc(u.id)} · ${esc(u.why)}</div>`).join('')}</div>` : '';
  const list = !D ? `<div style="padding:28px;text-align:center;font-style:italic;color:${VLC.dim}">reading the board…</div>`
    : rows.length ? rows.map((r) => ledgerRow(r, pinsFull)).join('') : `<div style="padding:28px;text-align:center;font-style:italic;color:${VLC.dim}">nothing here${filter ? ' under ' + esc(filter.toLowerCase()) : ''}</div>`;
  const more = D?.truncated ? `<div style="padding:6px 10px;font-size:11px;color:${VLC.dim}">showing ${rows.length} of ${D.count ?? '?'}</div>` : '';
  const dis = (D?.disagree ?? 0) > 0 ? `<div title="${esc((D.issues ?? []).join('\n'))}" style="margin-top:8px;font-size:11px;color:#8a5a4a">⚠ ${D.disagree} row${D.disagree === 1 ? '' : 's'} disagree${(D.issues ?? []).length ? ': ' + esc(D.issues[0]) : ''}</div>` : '';
  return VLCSS + `<div id="vote-ledger"${touch ? ' class="touch"' : ''} data-modal style="position:fixed;${place}box-sizing:border-box;display:flex;flex-direction:column;padding:6px;border-radius:12px;background:${VLC.walnut};
    box-shadow:0 0 0 2px #2c1e14,6px 6px 0 rgba(20,12,6,.55);font-family:Georgia,serif;pointer-events:auto;z-index:5">
  <div style="display:flex;flex-direction:column;min-height:0;flex:1;padding:14px 16px 12px;border-radius:8px;background:linear-gradient(180deg,#f6ecd8,${VLC.linen} 40%,#ecdcbc);color:${VLC.ink};box-shadow:inset 0 0 26px rgba(120,84,48,.28)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div><div style="font-size:18px;letter-spacing:.2em;color:${VLC.walnut}">ᚱ MY VOTES</div><div style="font-size:13px;color:${VLC.honey};margin-top:3px">${head}</div></div>
      <button onclick="sendAction('voteLedger',{op:'close'})" aria-label="close" title="close (Esc)" style="flex:none;${touch ? TAP + ';' : 'width:30px;height:30px;'}padding:0;border-radius:8px;border:1px solid rgba(79,56,40,.4);background:rgba(79,56,40,.08);color:${VLC.walnut};font-size:18px;line-height:1;cursor:pointer">×</button></div>
    <div style="height:1px;background:${VLC.honey};margin:10px 0 10px"></div>
    ${jevStrip}
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px">${LTABS.map(([k, n]) => btn(tab === k, n, `sendAction('voteLedger',{op:'tab',v:'${k}'})`)).join('')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">${LCHIPS.map((c) => btn(filter === c, `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${VL.colors[c]};margin-right:5px;vertical-align:1px"></span>${c}`, `sendAction('voteLedger',{op:'filter',v:${filter === c ? 'null' : `'${c}'`}})`)).join('')}</div>
    ${unp}
    <div style="flex:1;min-height:0;max-height:60vh;overflow-y:auto;overscroll-behavior:contain;border:1px solid rgba(79,56,40,.25);border-radius:6px;background:rgba(255,250,238,.45);scrollbar-width:thin;scrollbar-color:${VLC.honey} transparent">${list}${more}</div>
    ${dis}
  </div></div>`;
}

// JUDGE-BOARD (creator GO 2026-09-30): the window a number key opens at the yard's photo-judge board. Reads the board's state.cards.
function judgeView(ctx, s) {
  const n = s?.judgeOpen; if (n == null) return null;
  const b = ctx.place?.objects?.['judge-board']; const c = (b?.state?.cards ?? []).find((x) => x.n === n);
  return c ? { c, key: `${n}|${b.state.rev ?? 0}` } : null;
}
function judgePopup({ c }) {
  const e = (x) => String(x ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const row = (label, col, v) => v ? `<div style="margin-top:4px"><span style="color:${col};font-weight:bold;letter-spacing:.08em">${label}</span> ${e(v)}</div>` : '';
  const judges = c.judges?.length ? c.judges.map((j) => `<div style="padding:10px 12px;margin-top:8px;border-radius:8px;background:rgba(255,250,238,.55);border:1px solid rgba(79,56,40,.25)">
      <div style="display:flex;justify-content:space-between"><b>${e(j.seat)}</b><span style="color:#8a5a2a">${j.score}/10</span></div>
      ${row('LIKED', '#4f7a3a', j.liked)}${row("DIDN'T LIKE", '#9a3b2a', j.disliked)}${row('WANTS CHANGED', '#2f6f78', j.change)}</div>`).join('')
    : `<div style="margin-top:10px;color:#8a6a44;font-style:italic">no judge has looked at this one yet</div>`;
  return `<div data-modal style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,86vw);max-height:84vh;display:flex;flex-direction:column;padding:6px;border-radius:12px;background:#4f3828;box-shadow:0 0 0 2px #2c1e14,6px 6px 0 rgba(20,12,6,.55);font-family:Georgia,serif;pointer-events:auto;z-index:6">
    ${c.cluster ? '<style>@keyframes hgIn{from{opacity:0}to{opacity:1}}</style>' : ''}<div style="padding:14px 16px;border-radius:8px;background:linear-gradient(180deg,#f6ecd8,#f2e6cf 40%,#ecdcbc);color:#3a2618;overflow-y:auto;min-height:0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div><div style="font-size:13px;letter-spacing:.2em;color:#8a6a44">ᛗ PHOTO JUDGE · SHOT ${c.n} · ${e(c.status)}</div><div style="font-size:19px;margin-top:3px">${e(c.title)}</div></div>
        <button onclick="sendAction('judgeClose')" title="close (click ✕ or walk away)" style="flex:none;width:30px;height:30px;border-radius:8px;border:1px solid #8a6a44;background:#f6ecd8;color:#4f3828;cursor:pointer">✕</button>
      </div>
      <img src="${e(c.pic)}" style="display:block;width:100%;margin-top:10px;border-radius:6px;border:3px solid #8a6a44;image-rendering:pixelated"/>
      <div style="font-size:12px;color:#8a6a44;margin-top:6px">${e(c.ids)}</div>
      <div style="font-size:15px;margin-top:6px">${c.score == null ? '' : `average <b>${c.score}/10</b>`}</div>
      ${judges}
    </div></div>`;
}

// HUGINN-DRONE L5: the window a click on a raven-board card opens. Reads huginn-board.state.cards; ISSUE / DISMISS are the creator's.
const HOWNER = 'pa_28744a7fc0a3ce8b63c72a3c4cc2fcd9';
// HUGINN-FLIGHT F5/F6/F9: the live map on M. Fog of war lifts where he has flown (state.fog, 81×81 tiles of 10 m, saved every 15 s),
// heat squares where open findings cluster (state.heat, % of the hottest 50 m cell), his live dot and a trail this screen remembers,
// the wind arrow and the speed he actually makes, JEV's heading and why. North (−Z) is up.
const HM = { cx: 10, cz: 1.5, R: 402, FG: 81, FT: 10, cell: 50, px: 460,
  pins: true, saviNames: ['Savi'], saviId: 'pa_dada1d98dfc29cc17967483be490e757', maxPins: 12 }; // HUGINN-PINS (WATCHED 7/7 2026-10-01): live player + Savi pins
// HUGINN-PINS S1: yaw in degrees from a quaternion (0 = facing -Z, 90 = -X); rows rebuilt every repaint, nothing cached
const hmYaw = (q) => { if (typeof q === 'number') return q; if (!q || q.w == null) return q?.yaw ?? 0; return Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z)) * 180 / Math.PI; };
function hmPins(ctx, player) {
  if (!HM.pins) return [];
  const rows = [], seen = new Set(), add = (r, savi) => { const f = r?.feetPosition; if (!f || seen.has(r.id) || rows.length >= HM.maxPins) return; seen.add(r.id);
    rows.push({ id: r.id, x: f.x, z: f.z, yaw: hmYaw(r.rotation), savi, me: !!player && r.id === player.id, name: savi ? 'Savi' : String(r.displayName ?? 'player') }); };
  // Savi's body is a builder's helper, outside place.players: read her row by her userId (fallback to the name only when no id is set)
  let sv = null; try { sv = HM.saviId ? ctx.place?.objects?.['player/c_actor:' + HM.saviId] : null; } catch (e) { sv = null; }
  for (const r of ctx.place?.players ?? []) { if (r.id === player?.id) continue; const isS = HM.saviId ? r.userId === HM.saviId : HM.saviNames.includes(r.displayName); add(r, isS); }
  if (sv) add(sv, true);
  // the viewer's own pin is NOT here: hmLivePin draws it every frame outside the memo (creator: 'needs to be 100% real time')
  return rows;
}
const hmTrail = []; let hmFogKey = null, hmFogPath = '', hmFogPct = 0;
// HUGINN-OUTER S4: the view radius is the ring's: 402 m at home, 804 m once he is out (or roosting); every helper reads hmR
let hmR = HM.R; const hmFogMemo = {};
const hmX = (x) => (HM.px / 2 + (x - HM.cx) * HM.px / (2 * hmR)), hmZ = (z) => (HM.px / 2 + (z - HM.cz) * HM.px / (2 * hmR));
function hmFog(str, FG = HM.FG, FT = HM.FT, slot = 'in') {
  const mk = `${str}|${hmR}|${FT}`, m = hmFogMemo[slot]; if (m && m.k === mk) return m.d;
  const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', len = Math.ceil(FG * FG / 8), b = new Uint8Array(len);
  let j = 0; for (let i = 0; i < (str ?? '').length && j < len; i += 4) { const n = (B.indexOf(str[i]) << 18) | (B.indexOf(str[i + 1]) << 12) | (B.indexOf(str[i + 2]) << 6) | B.indexOf(str[i + 3]); b[j++] = n >> 16 & 255; if (j < len) b[j++] = n >> 8 & 255; if (j < len) b[j++] = n & 255; }
  const t = FT * HM.px / (2 * hmR), ox = HM.cx - FG * FT / 2, oz = HM.cz - FG * FT / 2; let d = '';
  for (let r = 0; r < FG; r++) { let run = -1;
    for (let c = 0; c <= FG; c++) { const k = r * FG + c, on = c < FG && (b[k >> 3] >> (k & 7) & 1);
      if (on && run < 0) run = c; else if (!on && run >= 0) { d += `M${(hmX(ox + run * FT)).toFixed(1)} ${(hmZ(oz + r * FT)).toFixed(1)}h${((c - run) * t).toFixed(1)}v${t.toFixed(1)}h-${((c - run) * t).toFixed(1)}z`; run = -1; } } }
  hmFogMemo[slot] = { k: mk, d }; return d;
}
function huginnMapView(ctx, s, player) {
  if (!s?.huginnMap) return null;
  let d = null; try { d = ctx.place?.objects?.['huginn-drone']; } catch (e) { d = null; }
  const st = d?.state ?? {}, p = d?.feetPosition; if (!p) return null;
  const last = hmTrail[hmTrail.length - 1];
  if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 4) { hmTrail.push({ x: p.x, z: p.z }); if (hmTrail.length > 160) hmTrail.shift(); }
  const w = ctx.place?.state?.wind ?? {};
  const now = ctx.now?.() ?? 0; // HUGINN-SWEEP S7: room ms, so the tier ring's age is measured on the writer's clock
  const pins = hmPins(ctx, player), pk = pins.map((q) => `${Math.round(q.x)},${Math.round(q.z)},${Math.round(q.yaw / 3)}`).join(';');
  return { p, st, w, now, pins, key: `${pk}|${Math.round(p.x)}|${Math.round(p.z)}|${st.fog?.length ?? 0}|${st.fogPct}|${JSON.stringify(st.heat ?? {})}|${st.spd}|${st.hunt?.cell ?? ''}|${st.leg?.until ?? 0}|${st.hidden ? 1 : 0}|${w.toward}|${w.speed}|${st.day ?? ''}|${st.tier ?? 0}|${st.tierAt ?? 0}|${JSON.stringify(st.dots ?? [])}|${JSON.stringify(st.pend ?? [])}|${st.front?.why ?? ''}|${st.second?.cell ?? ''}|${st.recap ?? ''}|${st.ring ?? 'inner'}|${st.ringAt ?? 0}|${st.fogO?.length ?? 0}|${st.fogOPct ?? 0}|${st.fogF?.length ?? 0}|${st.fogFPct ?? 0}|${st.outerLaps ?? 0}|${st.mop?.at ?? 0}|${st.mop?.k ?? 0}|${st.mop?.why ?? ''}|${st.mop?.pts?.length ?? 0}|${st.homeDone?.at ?? 0}` };
}
// HUGINN-SWEEP S7 helpers. A re-render rebuilds the map's DOM, so every animation is phased by clock (negative delay), never restarted.
const hmDotSeen = new Map(); // dot key -> local ms first drawn: the 200 ms fade-in plays once per dot, not per re-render
const hmCellTitle = (c) => { const m = /^x(-?\d+)z(-?\d+)$/.exec(c ?? ''); if (!m) return ''; const gx = +m[1], gz = +m[2];
  return `cell ${c} = ${Math.abs(gx)} ${gx < 0 ? 'west' : 'east'}, ${Math.abs(gz)} ${gz > 0 ? 'south' : 'north'} of the hall`; }; // map north is -z
function hmDots(dots, e) {
  const cols = HSW?.colors ?? {}, tn = Date.now(), pulse = -(tn % 2400), live = new Set(); let out = '';
  for (const d of Array.isArray(dots) ? dots : []) { if (!Array.isArray(d) || !isFinite(d[0]) || !isFinite(d[1])) continue;
    const t = Math.max(1, Math.min(4, Math.round(+d[2] || 4))), k = `${Math.round(d[0])}|${Math.round(d[1])}|${t}`; live.add(k);
    if (!hmDotSeen.has(k)) hmDotSeen.set(k, tn); const age = tn - hmDotSeen.get(k);
    const fade = age < 200 ? `animation:hmIn 200ms ease-out ${-age}ms both;` : '';
    out += `<g style="${fade}"><circle class="${t === 1 ? 'hmRed' : ''}" cx="${hmX(+d[0]).toFixed(1)}" cy="${hmZ(+d[1]).toFixed(1)}" r="3" fill="${cols[t] ?? '#9baf84'}" fill-opacity=".7" stroke="#1a120c" stroke-width="1" style="${t === 1 ? `animation:hmPulse 2400ms ease-in-out ${pulse}ms infinite` : ''}"><title>P${t} finding</title></circle></g>`; }
  for (const k of hmDotSeen.keys()) if (!live.has(k)) hmDotSeen.delete(k);
  return out;
}
// HUGINN-PINS S2: honey #e7b457 for players (the hall marker's honey), teal #5dada9 for Savi (the MOP-UP route's teal); 60° cone, 26 px, 8 % fill
// HUGINN-PINS live: the viewer's own pin + cone, rebuilt every render (the render runs each frame the camera moves), spliced into the memoised map.
const HM_ME = '<g id="hm-me"></g>';
let hmLiveSrc = '';
function hmLiveYaw(ctx, player) {
  const cf = ctx.session?.camFacing; // scripts/camera.js writes the presented facing (degrees) here every frame it turns
  if (cf && typeof cf.yaw === 'number') { hmLiveSrc = 'session'; return cf.yaw; }
  const cam = player?.camera, v = cam?.view;
  if (v && typeof v.yaw === 'number') { hmLiveSrc = 'cam.view'; return v.yaw * 180 / Math.PI; }
  if (cam?.rotation) { hmLiveSrc = 'cam.rot'; return hmYaw(cam.rotation); }
  const vc = ctx.view?.camera; if (vc?.eye && vc?.aim) { hmLiveSrc = 'view'; return Math.atan2(-(vc.aim.x - vc.eye.x), -(vc.aim.z - vc.eye.z)) * 180 / Math.PI; }
  if (ctx.self?.rotation) { hmLiveSrc = 'self'; return hmYaw(ctx.self.rotation); }
  hmLiveSrc = 'row'; return hmYaw(player?.rotation);
}
function hmLivePin(ctx, player) {
  if (!HM.pins || !player) return HM_ME;
  const f = ctx.self?.feetPosition ?? player.feetPosition; if (!f) return HM_ME;
  const q = { x: f.x, z: f.z, yaw: hmLiveYaw(ctx, player), me: true, savi: false, name: 'you' };
  const svg = hmPinSvg([q], (t) => t);
  return `<g id="hm-me">${svg.cones}${svg.dots}</g>`;
}
function hmPinSvg(pins, e) {
  const P = HM.px, c0 = P / 2, rimR = P / 2 - 6; let cones = '', dots = '';
  for (const q of pins) { let x = hmX(q.x), z = hmZ(q.z); const dx = x - c0, dz = z - c0, d = Math.hypot(dx, dz), off = d > rimR;
    if (off) { x = c0 + dx / d * rimR; z = c0 + dz / d * rimR; }
    const col = q.savi ? '#5dada9' : '#e7b457', a = q.yaw * Math.PI / 180, fx = -Math.sin(a), fz = -Math.cos(a), L = 26, h = Math.tan(Math.PI / 6);
    if (!off) { const lx = x + (fx - fz * h) * L, lz = z + (fz + fx * h) * L, rx = x + (fx + fz * h) * L, rz = z + (fz - fx * h) * L;
      cones += `<path d="M${x.toFixed(1)} ${z.toFixed(1)}L${lx.toFixed(1)} ${lz.toFixed(1)}Q${(x + fx * L * 1.12).toFixed(1)} ${(z + fz * L * 1.12).toFixed(1)} ${rx.toFixed(1)} ${rz.toFixed(1)}Z" fill="${col}" fill-opacity=".08"/><line x1="${x.toFixed(1)}" y1="${z.toFixed(1)}" x2="${(x + fx * L).toFixed(1)}" y2="${(z + fz * L).toFixed(1)}" stroke="${col}" stroke-opacity=".25" stroke-width="1"/>`; }
    dots += `<circle cx="${x.toFixed(1)}" cy="${z.toFixed(1)}" r="${q.me ? 5 : 4}" fill="${col}" stroke="#1a120c" stroke-width="1.5" opacity="${off ? .6 : 1}"><title>${e(q.me ? 'you' : q.name)}${off ? ' · off the map' : ''}</title></circle>`; }
  return { cones, dots };
}
function huginnMap({ p, st, w, now, pins }) {
  const e = (x) => String(x ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const far = st.ring === 'far', out = st.ring === 'outer' || st.ring === 'roost' || far; hmR = far ? 2012 : out ? 804 : HM.R; // HUGINN-FAR: 1.25 mi // HUGINN-OUTER S4
  const P = HM.px, cs = HM.cell * P / (2 * hmR), fog = hmFog(st.fog ?? '');
  const fogO = (out ? hmFog(st.fogO ?? '', 81, 20, 'out') : '') + (far ? hmFog(st.fogF ?? '', 101, 40, 'far') : '');
  const homeR = HM.R * P / (2 * hmR), ringAge = now - (st.ringAt ?? -1e12);
  const homeLine = out ? `<circle cx="${P / 2}" cy="${P / 2}" r="${homeR.toFixed(1)}" fill="none" stroke="#ba8950" stroke-opacity=".6" stroke-width="1.5"/>` : '';
  const sweepRing = out && st.ringAt && ringAge >= 0 && ringAge < 800 ? `<circle cx="${P / 2}" cy="${P / 2}" r="${homeR.toFixed(1)}" fill="none" stroke="#ffcf6a" stroke-width="3" style="transform-box:fill-box;transform-origin:center;animation:hmSweep 800ms cubic-bezier(0.2,0,0.4,1) ${-Math.round(ringAge)}ms both"/>` : '';
  const heat = Object.entries(st.heat ?? {}).map(([c, v]) => { const m = /^x(-?\d+)z(-?\d+)$/.exec(c); if (!m || c === 'x0z0') return ''; // the hall cell sits under the hall marker: a badge instead
    const x = hmX(HM.cx + (+m[1]) * HM.cell) - cs / 2, z = hmZ(HM.cz + (+m[2]) * HM.cell) - cs / 2, a = (0.18 + 0.5 * v / 100).toFixed(2), col = v >= 60 ? '232,70,40' : v >= 30 ? '240,160,50' : '240,215,90';
    return `<rect x="${x.toFixed(1)}" y="${z.toFixed(1)}" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}" rx="3" fill="rgba(${col},${a})" stroke="rgba(${col},.9)" stroke-width="${v >= 60 ? 1.5 : .6}"/>`; }).join('');
  const trail = hmTrail.map((q, i) => `${i ? 'L' : 'M'}${hmX(q.x).toFixed(1)} ${hmZ(q.z).toFixed(1)}`).join('');
  const x = hmX(p.x), z = hmZ(p.z), lh = st.leg?.h ?? 0, rad = lh * Math.PI / 180, hx = x - Math.sin(rad) * 60, hz = z - Math.cos(rad) * 60;
  const wt = (w.toward ?? 0) * Math.PI / 180, wl = 14 + Math.min(40, (w.speed ?? 0) * 4), wx = -Math.sin(wt), wz = -Math.cos(wt);
  const ls = st.lastSeen && st.hidden ? `<g transform="translate(${hmX(st.lastSeen.x).toFixed(1)} ${hmZ(st.lastSeen.z).toFixed(1)})"><circle r="9" fill="none" stroke="#7fe3ff" stroke-width="2" stroke-dasharray="3 3"/><text y="-12" text-anchor="middle" font-size="10" fill="#7fe3ff">last seen</text></g>` : '';
  const pct = +((st.ring === 'outer' ? st.fogOPct : far ? st.fogFPct : st.fogPct) ?? 0) || 0, sp = st.spd ?? 0, tier = st.tier ?? 0, day = st.day ?? Math.floor((now || 0) / 86400000); // integer room-day index (steer 1)
  const hallV = +(st.heat?.x0z0 ?? 0) || 0, badge = hallV > 0 ? `<g transform="translate(${(hmX(HM.cx) + 12).toFixed(1)} ${(hmZ(HM.cz) - 9).toFixed(1)})"><title>hall cell heat ${Math.round(hallV)}</title><rect x="-9" y="-6" width="18" height="12" rx="6" fill="#ba8950" stroke="#1a120c" stroke-width="1"/><text y="3.5" text-anchor="middle" font-size="9" fill="#1a120c" font-weight="bold">${Math.round(hallV)}</text></g>` : '';
  const pinSvg = hmPinSvg(pins ?? [], e);
  const dots = hmDots(st.dots ?? [], e), tierAge = now - (st.tierAt ?? -1e12);
  const ring = st.tierAt && tierAge >= 0 && tierAge < 600 ? `<circle cx="${x.toFixed(1)}" cy="${z.toFixed(1)}" r="10" fill="none" stroke="#ffcf6a" stroke-width="3" style="transform-box:fill-box;transform-origin:center;animation:hmRing 600ms ease-out ${-Math.round(tierAge)}ms both"/>` : '';
  const notches = (HSW?.tiers ?? [50, 60, 70, 80, 90, 100]).map((t) => `<i style="position:absolute;left:calc(${t}% - 1px);top:-2px;width:2px;height:12px;background:${pct >= t ? '#ffcf6a' : '#4f3828'};${pct >= t ? 'box-shadow:0 0 4px #ffcf6a' : ''}"></i>`).join('');
  const cell = (c, tail, col) => `<span title="${e(hmCellTitle(c))}" style="color:${col};cursor:help">${tail[0]} ${e(c)}${tail[1]}</span>`;
  const mopLeft = st.mop?.pts ? Math.max(0, st.mop.pts.length - (st.mop.k | 0)) : 0; // HUGINN-MOPUP S5
  const mopPath = mopLeft ? `<path d="M${x.toFixed(1)} ${z.toFixed(1)}${st.mop.pts.slice(st.mop.k | 0).map(([a, b]) => `L${hmX(a).toFixed(1)} ${hmZ(b).toFixed(1)}`).join('')}" fill="none" stroke="#5dada9" stroke-width="1.5" stroke-dasharray="3 4" opacity=".9"/>${st.mop.pts.slice(st.mop.k | 0).map(([a, b]) => `<circle cx="${hmX(a).toFixed(1)}" cy="${hmZ(b).toFixed(1)}" r="2" fill="#7fe3ff"/>`).join('')}` : '';
  const mode = st.mop && st.hunt ? cell(st.hunt.cell, ['MOP-UP · P1 CHECK', ' · then back on route'], '#ff8a5c') : st.mop ? `<span style="color:#7fe3ff">MOP-UP · ${mopLeft} speck${mopLeft === 1 ? '' : 's'} left · ${e(st.mop.why ?? '')}</span>` : st.hunt ? cell(st.hunt.cell, ['HUNTING', ' · max speed'], '#ff8a5c') : st.second?.cell ? cell(st.second.cell, ['SECOND PASS', ' · red'], '#d9573a')
    : st.front ? `<span style="color:#e7b457">FRONTIER · ${e(st.front.why ?? 'the dark edge')}</span>` : st.ring === 'roost' ? '<span style="color:#9baf84">ROOSTING · both rings full · red checks every 10 min</span>': st.hidden ? '<span style="color:#7fe3ff">inside something (noclip)</span>' : '<span style="color:#9baf84">patrolling</span>';
  return `<div id="huginn-map" style="position:fixed;left:24px;top:164px;max-height:calc(100vh - 252px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;width:${P + 28}px;padding:12px 14px;border-radius:12px;background:rgba(28,20,14,.9);border:2px solid #ba8950;color:#f2e6cf;font-family:Georgia,serif;pointer-events:auto;box-shadow:0 8px 30px rgba(0,0,0,.5)">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><div style="letter-spacing:.2em;font-size:13px;color:#e7b457">ᚺ HUGINN'S MAP · ${out ? '0.5' : '0.25'} MILE</div><button onclick="sendAction('huginnMap')" style="width:26px;height:26px;border-radius:6px;border:1px solid #ba8950;background:#3a2a1c;color:#f2e6cf;cursor:pointer">✕</button></div>
    <style>@keyframes hmPulse{0%,100%{opacity:.7;r:3px}50%{opacity:1;r:4px}}@keyframes hmIn{from{opacity:0}to{opacity:1}}@keyframes hmRing{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(3.2)}}@keyframes hmHome{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}8%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}14%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0}}@keyframes hmSweep{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(2)}}</style>
    <div id="hm-head" style="margin:4px 0 4px;font-size:20px;color:#f2e6cf;letter-spacing:.04em">${st.ring === 'outer' ? `OUTER RING · ${pct.toFixed(1)}% · tier ${tier}` : far ? `FAR RING · ${pct.toFixed(1)}% · to 1.25 mi` : st.ring === 'roost' ? `ROOST · lap ${e(st.outerLaps ?? 0)} · home 100%` : `DAY ${e(day)} · ${pct.toFixed(1)}% · tier ${tier}`}</div>
    ${(() => { const h = st.homeDone; if (!h || h.day !== day) return ''; const fm = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
      return `<div id="hm-home-line" style="font-size:12px;color:#e7b457;margin:-2px 0 4px">ᚺ home 100% in ${fm(h.min)} · best ${fm(h.best)}${h.rec ? ' · new record' : ''}</div>`; })()}
    ${(st.recap ?? '') ? `<div id="hm-recap" style="font-size:12px;font-style:italic;opacity:.8;margin:-2px 0 4px">${e(String(st.recap).slice(0, 160))}</div>` : ''}
    <div id="hm-bar" style="position:relative;height:8px;margin:2px 0 10px;border-radius:4px;background:#1a120c;border:1px solid #4f3828"><div style="width:${Math.min(100, pct)}%;height:100%;border-radius:4px;background:linear-gradient(90deg,#5dada9,#9baf84)"></div>${notches}</div>
    <div style="position:relative">${(() => { const h = st.homeDone, age = now - (h?.at ?? -1e12); if (!h || age < 0 || age > 8000) return ''; const fm = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
      return `<div id="hm-home" style="position:absolute;left:50%;top:50%;z-index:2;pointer-events:none;text-align:center;padding:12px 18px;border-radius:10px;background:rgba(28,20,14,.92);border:2px solid #ffcf6a;box-shadow:0 0 24px rgba(255,207,106,.55);white-space:nowrap;animation:hmHome 8000ms ease-out ${-Math.round(age)}ms both"><div style="font-size:26px;letter-spacing:.12em;color:#ffcf6a">HOME 100%</div><div style="font-size:14px;margin-top:4px">${fm(h.min)}${h.rec ? (h.prev != null ? ` · NEW RECORD · was ${fm(h.prev)}` : ' · first record') : ` · best ${fm(h.best)}`}</div></div>`; })()}
    <svg width="${P}" height="${P}" viewBox="0 0 ${P} ${P}" style="display:block">
      <defs><clipPath id="hmc"><circle cx="${P / 2}" cy="${P / 2}" r="${P / 2 - 1}"/></clipPath><radialGradient id="hmg"><stop offset="0" stop-color="#fff8d0"/><stop offset="1" stop-color="#ffcf6a" stop-opacity="0"/></radialGradient></defs>
      <g clip-path="url(#hmc)">
        <rect width="${P}" height="${P}" fill="#0d0f12"/>
        <path d="${fog}" fill="#5d7a5a" opacity=".85"/>
        ${fogO ? `<path d="${fogO}" fill="#5d7a5a" opacity=".85"/>` : ''}
        ${heat}
        ${pinSvg.cones}
        ${dots}
        ${(Array.isArray(st.pend) ? st.pend : []).filter((d) => Array.isArray(d) && isFinite(d[0]) && isFinite(d[1])).map((d) => `<circle cx="${hmX(+d[0]).toFixed(1)}" cy="${hmZ(+d[1]).toFixed(1)}" r="3" fill="none" stroke="${(HSW?.colors ?? {})[Math.max(1, Math.min(4, Math.round(+d[2] || 4)))] ?? '#9baf84'}" stroke-width="1.2" stroke-dasharray="2 2" opacity=".8"><title>waiting for a second look</title></circle>`).join('')}
        ${mopPath}
        <path d="${trail}" fill="none" stroke="url(#hmg)" stroke-width="0" />
        <path d="${trail}" fill="none" stroke="#ffd36e" stroke-width="2" stroke-opacity=".7" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="${x.toFixed(1)}" y1="${z.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hz.toFixed(1)}" stroke="#c9a0ff" stroke-width="1.5" stroke-dasharray="4 4" opacity=".9"/>
      </g>
      <circle cx="${P / 2}" cy="${P / 2}" r="${P / 2 - 1}" fill="none" stroke="#ba8950" stroke-width="2"/>
      <rect x="${(hmX(HM.cx) - 5).toFixed(1)}" y="${(hmZ(HM.cz) - 3).toFixed(1)}" width="10" height="6" fill="#e7b457"/><text x="${hmX(HM.cx).toFixed(1)}" y="${(hmZ(HM.cz) + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#e7b457">hall</text>
      ${homeLine}${sweepRing}
      ${badge}
      ${ls}
      ${ring}
      <circle cx="${x.toFixed(1)}" cy="${z.toFixed(1)}" r="${st.hunt ? 11 : 8}" fill="none" stroke="${st.hunt ? '#ff8a5c' : '#7fe3ff'}" stroke-width="2" opacity=".6"/>
      ${pinSvg.dots}
      <g id="hm-me"></g>
      <circle cx="${x.toFixed(1)}" cy="${z.toFixed(1)}" r="4.5" fill="${st.hidden ? '#7fe3ff' : '#fff'}" stroke="#1a120c" stroke-width="1.5"/>
      <g transform="translate(${P - 40} 40)"><circle r="30" fill="rgba(26,18,12,.8)" stroke="#4f3828"/><line x1="${(-wx * wl / 2).toFixed(1)}" y1="${(-wz * wl / 2).toFixed(1)}" x2="${(wx * wl / 2).toFixed(1)}" y2="${(wz * wl / 2).toFixed(1)}" stroke="#9fd8ff" stroke-width="3" stroke-linecap="round"/><circle cx="${(wx * wl / 2).toFixed(1)}" cy="${(wz * wl / 2).toFixed(1)}" r="3.5" fill="#9fd8ff"/><text y="44" text-anchor="middle" font-size="10" fill="#9fd8ff">wind ${(w.speed ?? 0).toFixed(1)} m/s</text></g>
      <text x="10" y="${P - 10}" font-size="11" fill="#f2e6cf" opacity=".6">N ↑</text>
    </svg></div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:14px"><span>${mode}</span><span>speed <b style="color:#ffd36e;font-size:17px">${sp}</b> m/s</span></div>
    <div style="margin-top:6px;font-size:13px;color:#c9a0ff">JEV · heading ${lh}° ${st.leg?.jev ? '' : '(wandering)'} · ride the wind ${Math.round((st.leg?.ride ?? 0.6) * 100)}%</div>
    ${st.leg?.why ? `<div style="font-size:13px;font-style:italic;opacity:.85;margin-top:2px">"${e(st.leg.why)}"</div>` : ''}
    <div style="display:flex;gap:10px;margin-top:8px;font-size:11px;opacity:.75"><span><span style="color:#5d7a5a">■</span> explored</span><span><span style="color:#e84628">■</span> hot</span><span><span style="color:#f0a032">■</span> warm</span><span><span style="color:#ffd36e">━</span> trail</span><span><span style="color:#c9a0ff">┅</span> JEV leg</span><span><span style="color:#9baf84">◌</span> second look</span><span>M closes</span></div>
  </div>`;
}
function huginnView(ctx, s, player) {
  const n = s?.huginnOpen; if (n == null) return null;
  const b = ctx.place?.objects?.['huginn-board']; const c = (b?.state?.cards ?? []).find((x) => x.n === n);
  const mine = player?.userId === HOWNER;
  return c ? { c, mine, key: `${n}|${b.state.rev ?? 0}|${mine ? 1 : 0}` } : null;
}
function huginnPopup({ c, mine }) {
  const e = (x) => String(x ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const TC = { 1: '#c8442e', 2: '#d99a3a', 3: '#6f9450', 4: '#6d7a84' };
  const TN = { 1: 'P1 · fix first: eats frames or ticks, breaks play, runs away, or pinned by you', 2: 'P2 · soon: a dense or heavy spot, a visible bug near the hall', 3: 'P3 · when there is time: hidden cost, a bug further out', 4: 'P4 · cosmetic, far away' };
  const ST = { found: 'found by HUGINN, waiting on the watchers', watched: 'verified by the watchers, in Savi\'s queue', fixing: 'Savi is fixing it', fixed: 'FIXED', rejected: 'false alarm' };
  const row = (label, col, v) => v ? `<div style="margin-top:10px"><div style="color:${col};font-weight:bold;letter-spacing:.12em;font-size:12px">${label}</div><div style="font-size:15px;margin-top:2px">${e(v)}</div></div>` : '';
  const btn = (act, label, on, col) => `<button onclick="sendAction('${act}',{n:${c.n}})" style="flex:1;padding:9px 0;border-radius:8px;border:2px solid ${col};background:${on ? col : '#f6ecd8'};color:${on ? '#fff8ec' : col};font:bold 14px Georgia,serif;letter-spacing:.12em;cursor:pointer">${label}</button>`;
  return `<div data-modal style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);${c.cluster ? 'animation:hgIn .3s ease-out;' : ''}width:min(620px,86vw);max-height:84vh;display:flex;flex-direction:column;padding:6px;border-radius:12px;background:#2e241c;box-shadow:0 0 0 2px #17100b,6px 6px 0 rgba(20,12,6,.55);font-family:Georgia,serif;pointer-events:auto;z-index:30">
    <div style="padding:14px 16px;border-radius:8px;background:linear-gradient(180deg,#f6ecd8,#f2e6cf 40%,#ecdcbc);color:#3a2618;overflow-y:auto;min-height:0">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>${c.cluster ? `<div style="font-size:13px;letter-spacing:.2em;color:#8a6a44">ᚺ HUGINN · ${e(c.h)} · ONE CAUSE <span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:4px;background:#4f3828;color:#f2e6cf;font-size:10px;letter-spacing:.05em">×${c.count}</span></div>` : ''}<div style="font-size:13px;letter-spacing:.2em;color:#8a6a44;${c.cluster ? 'display:none' : ''}">ᚺ HUGINN · REPORT H${c.h ?? c.n} · ${e(c.kind)} · pass ${c.pass}</div><div style="font-size:19px;margin-top:3px;word-break:break-word">${e(c.title ?? c.id)}</div><div style="font-size:12px;color:#8a6a44">cell ${e(c.cell)} · x ${c.x}, z ${c.z}</div></div>
        <button onclick="sendAction('huginnClose')" title="close (click ✕ or walk away)" style="flex:none;width:30px;height:30px;border-radius:8px;border:1px solid #8a6a44;background:#f6ecd8;color:#4f3828;cursor:pointer">✕</button>
      </div>
      <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:${TC[c.tier]};color:#fff8ec;font-size:14px">${c.pin ? '★ ISSUE · ' : ''}${TN[c.tier]}</div>
      <div style="margin-top:8px;font-size:14px"><b>${c.status === 'fixed' ? '✔ ' : ''}${ST[c.status] ?? e(c.status)}</b>${c.verdict ? ` · ${e(c.verdict)}` : ''}</div>
      ${c.cluster ? row('MEMBERS', '#4f3828', c.members) : ''}${row('WHAT HE FOUND', '#9a3b2a', c.ev)}${row('WHY IT MATTERS', '#8a5a2a', c.why)}${row('HIS FIX', '#2f6f78', c.fix)}${row('HOW TO CHECK', '#4f7a3a', c.see)}${row('NOTE', '#6d5236', c.note)}
      ${mine ? `<div style="display:flex;gap:10px;margin-top:14px">${btn('huginnIssue', c.pin ? '★ ISSUE PINNED' : 'ISSUE · MAKE IT #1', c.pin, '#c8442e')}${btn('huginnDismiss', c.status === 'rejected' ? 'DISMISSED' : 'DISMISS', c.status === 'rejected', '#6d7a84')}</div>` : ''}
    </div></div>`;
}

// RETICLE (creator GO 2026-09-30; BOARD-CLICK W8): the centre dot. Warm and named when the aim rests on something a left click takes
// (player.state.aim.label: on a board the exact card/button, "JEV 7 · YES", from board-input; no press-E hint anywhere,
// written only when the target changes); hidden while a menu, the ledger or a judge window has the mouse.
function reticleView(s, L) {
  if (!s || s.optionsOpen || L || s.judgeOpen != null || s.huginnOpen != null || s.chessView?.on || s.seatedOn) return null;
  const a = s.aim; return { hot: !!a?.k, label: a?.label ?? '', key: a?.k ? 'h|' + a.k : 'idle' };
}
function reticle({ hot, label }) {
  const e = (x) => String(x ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const d = hot ? 10 : 6;
  return `<div id="reticle" class="${hot ? 'hot' : ''}" style="position:fixed;left:50%;top:50%;width:0;height:0;pointer-events:none;z-index:4">
    <div style="position:absolute;left:${-d / 2}px;top:${-d / 2}px;width:${d}px;height:${d}px;border-radius:50%;box-sizing:border-box;background:${hot ? '#ba8950' : '#f2e6cf'};border:1px solid #4f3828;opacity:${hot ? 0.95 : 0.55};box-shadow:${hot ? '0 0 6px rgba(186,137,80,.8)' : 'none'};transition:all .12s"></div>
    ${hot && label ? `<div style="position:absolute;top:12px;left:0;transform:translateX(-50%);white-space:nowrap;font:13px Georgia,serif;color:#f2e6cf;text-shadow:0 1px 2px #1a120c,0 0 4px #1a120c;letter-spacing:.04em">${e(label)}</div>` : ''}
  </div>`;
}

// JEV-MASTER L5 (docs/board/proposals/JEV-MASTER.md): the desk window, MY VOTES style. Reads world.state.jevMaster + jevMeter; sends jevMaster ops.
const JTIDE = { perHour: 30 }, JBASE = { smart: 3 * 60e3, chat: 60e3, referee: 60e3, shelf: 5 * 60e3 };
function jevEvery(ms) { return !isFinite(ms) ? 'resting' : ms < 60e3 ? `every ${Math.round(ms / 1000)} s` : `every ${Math.round(ms / 6e3) / 10} min`; }
function jevRate(jm, x) {
  const p = pctOf(jm, x.id), f = p / CLOCK_PCT;
  if (p === 0) return 'resting';
  if (x.kind === 'share') return p >= 100 ? 'every ask' : `1 in ${Math.round(100 / p * 10) / 10} asks`;
  if (x.kind === 'chesscap') return 'up to ' + Math.floor(18 * p / 100) + ' thought moves / h';
  if (x.kind === 'cap') return `up to ${Math.round(JTIDE.perHour * f)} pitches / h`;
  if (JBASE[x.id]) return jevEvery(JBASE[x.id] / f);
  return f === 1 ? 'today\'s pace' : `${f > 1 ? '' : ''}${Math.round(f * 100) / 100}× today's pace`;
}
// JEV-HOVER-ELI5-v2 L4: every word on the desk carries data-eli (a key of ELI5 or of world.state.jevEli5) and its card's words as
// attributes. One delegated mouseover/mouseout on #jev-desk runs the 0.50 s ring (CSS) and the card (a fixed div outside the HUD tree,
// so a re-render never restarts or closes it). The hovered id lives in window.__eli, never in state.
let jeli = {}, jmeterNow = {};
const JLANES = { chess: 'chess', denIdeas: 'pitch-den', solo: 'pitch-solo', smart: 'smart-list', chat: 'chat-points', shelf: 'shelf-review', referee: 'vote-scribe', tide: 'ideas-jev', drone: 'huginn', hall: 'rolf-legs,rolf-songs,card-lean' };
function eliLive(id) {
  const lanes = id.startsWith('lane:') ? [id.slice(5)] : id.startsWith('sys:') ? (JLANES[id.slice(4)] ?? '').split(',').filter(Boolean) : null;
  if (!lanes) return '';
  const a = lanes.reduce((n, l) => n + (jmeterNow?.[l]?.a ?? 0), 0), s = lanes.reduce((n, l) => n + (jmeterNow?.[l]?.s ?? 0), 0), f = lanes.reduce((n, l) => n + (jmeterNow?.[l]?.f ?? 0), 0);
  return `this hour: ${a} ask${a === 1 ? '' : 's'}${s ? `, ${s} held back` : ''}${f ? `, ${f} missed` : ''}`;
}
function eli(id, over) {
  let c = over ?? ELI5[id], by = '', p = '';
  if (!c && id.startsWith('lane:')) { const r = jeli?.[id.slice(5)]; if (r?.what) { c = r; by = 'written by JEV'; } else if ((r?.fail ?? 0) >= 2) c = FAILED; else { c = { ...PENDING, name: id.slice(5) }; p = '1'; } }
  if (!c) return '';
  const a = (k, v) => v ? ` data-eli-${k}="${esc(v)}"` : '';
  return ` data-eli="${esc(id)}"${a('n', c.name)}${a('w', c.what)}${a('d', c.does)}${a('k', c.knob)}${a('l', over ? '' : eliLive(id))}${a('b', by)}${a('p', p)}`;
}
const ELI_CSS = `<style>@keyframes eliSpin{to{transform:rotate(360deg)}}
#jev-desk [data-eli]{position:relative}
.eli-spin{display:inline-block;width:10px;height:10px;margin-right:6px;border-radius:50%;border:1.5px solid rgba(186,137,80,.25);border-top-color:#ba8950;animation:eliSpin 1.6s linear infinite;vertical-align:-1px}</style>`;
const ELI_OVER = `var E=window.__eli||(window.__eli={});
if(E.v!==3){E.v=3;E.rg=function(){var R=E.ring;if(!R||!R.isConnected){R=document.createElement('div');R.id='eli-ring';R.style.cssText='position:fixed;z-index:61;width:22px;height:22px;border-radius:50%;pointer-events:none;opacity:0;left:-99px;top:-99px;-webkit-mask:radial-gradient(circle,transparent 7.5px,#000 8.5px);mask:radial-gradient(circle,transparent 7.5px,#000 8.5px)';document.documentElement.appendChild(R);E.ring=R}return R};
E.pin=function(){var R=E.rg();R.style.left=Math.round(E.x+16)+'px';R.style.top=Math.round(E.y+10)+'px';R.setAttribute('data-x',Math.round(E.x));R.setAttribute('data-y',Math.round(E.y))};
E.step=function(){var R=E.rg(),n=performance.now()-E.t0,k=Math.min(1,n/500),P=100*(0.5-0.5*Math.cos(Math.PI*k)),q=Math.min(1,n/140),s=1+2.70158*Math.pow(q-1,3)+1.70158*Math.pow(q-1,2);
R.style.background='conic-gradient(#ba8950 '+P.toFixed(1)+'%, rgba(242,230,207,.35) 0)';R.style.filter='drop-shadow(0 0 4px rgba(186,137,80,'+(0.25+0.45*P/100).toFixed(2)+'))';R.style.transform='scale('+s.toFixed(3)+')';R.style.opacity=String(Math.min(1,q*1.4));
if(k>=1){clearInterval(E.f);E.f=0;R.style.transition='transform .16s ease-out,opacity .16s ease-out';R.style.transform='scale(1.25)';R.style.opacity='0';E.show(E.el)}};
E.arm=function(){clearInterval(E.f);var R=E.rg();R.style.transition='none';R.style.transform='scale(0)';R.style.opacity='0';E.pin();E.t0=performance.now();E.f=setInterval(E.step,16);E.step()};
E.drop=function(){if(!E.f)return;clearInterval(E.f);E.f=0;var R=E.rg();R.style.transition='transform .1s ease-in,opacity .1s ease-in';R.style.transform='scale(.6)';R.style.opacity='0'};
E.place=function(el){var c=E.card;if(!c)return;var W=innerWidth,H=innerHeight,x,y;if(typeof E.x==='number'){x=E.x+28;if(x+250>W-66)x=E.x-254;y=E.y-8}else{var r=el.getBoundingClientRect();x=r.right+18;if(x+250>W-66)x=r.left-262;y=r.top-6}if(x<8)x=8;y=Math.max(8,Math.min(y,H-c.offsetHeight-8));c.style.left=x+'px';c.style.top=y+'px';if(typeof E.x==='number')c.style.transformOrigin=(E.x+27-x)+'px '+(E.y+21-y)+'px'};
E.show=function(el){if(!el||!el.isConnected)el=E.id?document.querySelector('#jev-desk [data-eli='+JSON.stringify(E.id)+']'):null;if(!el)return;
var c=E.card;if(!c||!c.isConnected){c=document.createElement('div');c.id='eli-card';c.style.cssText='position:fixed;z-index:60;width:250px;box-sizing:border-box;padding:9px 11px 8px;border-radius:8px;background:#f2e6cf;border:1px solid #4f3828;box-shadow:3px 3px 0 rgba(20,12,6,.45);font-family:Georgia,serif;color:#343c43;font-size:12px;line-height:1.35;pointer-events:none;opacity:0';document.documentElement.appendChild(c);E.card=c}
var g=function(k){return el.getAttribute('data-eli-'+k)||''};c.textContent='';
var row=function(txt,css){if(!txt)return null;var d=document.createElement('div');d.style.cssText=css;d.textContent=txt;c.appendChild(d);return d};
row(g('n').toUpperCase(),'font-size:11px;letter-spacing:.14em;color:#4f3828;margin-bottom:4px');
var w=row(g('w'),'margin-bottom:2px');if(w&&g('p')){var s=document.createElement('i');s.className='eli-spin';w.insertBefore(s,w.firstChild)}
row(g('d'),'margin-bottom:2px');row(g('k'),'color:#6b5a48');row(g('l'),'margin-top:5px;color:#8a8074;font-size:11px');row(g('b'),'margin-top:3px;color:#9a8f80;font-size:10px;font-style:italic');
E.place(el);if(!E.open){c.style.transition='none';c.style.opacity='0';c.style.transform='scale(.92)';void c.offsetWidth;c.style.transition='opacity .15s cubic-bezier(.33,1,.68,1),transform .15s cubic-bezier(.33,1,.68,1)';c.style.opacity='1';c.style.transform='none'}E.open=1;E.pend=!!g('p');
if(!E.i)E.i=setInterval(function(){if(!E.open)return;if(!document.getElementById('jev-desk')){E.hide();return}if(E.pend)E.show(null)},1000)};
E.hide=function(){E.drop();E.open=0;E.id=null;E.el=null;if(E.card){E.card.style.transition='opacity .08s';E.card.style.opacity='0'}}}
E.x=event.clientX;E.y=event.clientY;
var el=event.target.closest?event.target.closest('[data-eli]'):null;if(!el)return;var id=el.getAttribute('data-eli');
clearTimeout(E.c);if(E.id===id){E.el=el;return}
E.id=id;E.el=el;if(E.open){E.show(el)}else{E.arm()}`;
const ELI_OUT = `var E=window.__eli;if(!E)return;var el=event.target.closest?event.target.closest('[data-eli]'):null;if(!el)return;var to=event.relatedTarget;
if(to&&el.contains(to))return;var nx=to&&to.closest?to.closest('[data-eli]'):null;if(nx)return;
E.drop();E.id=null;E.el=null;clearTimeout(E.c);E.c=setTimeout(function(){if(!E.id&&E.hide)E.hide()},140)`;
const ELI_MOVE = `var E=window.__eli;if(!E)return;E.x=event.clientX;E.y=event.clientY;if(E.f&&E.pin)E.pin();if(E.open&&E.card&&E.el&&E.place)E.place(E.el)`;
const attrJs = (s) => s.replace(/\n/g, '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const ELI_HANDLERS = ` onmouseover="${attrJs(ELI_OVER)}" onmouseout="${attrJs(ELI_OUT)}" onmousemove="${attrJs(ELI_MOVE)}"`;
// JEV-MASTER-LIVE L4: the live graph (30 one-minute bars over mode bands) and the caller feed.
const JMODE = { saver: '#9baf84', perf: '#5dada9', high: '#ba8950', max: '#8a5a3a', oc: '#c2452d', custom: '#9a8f80' };
const JCLOCK = { chess: 'chess', 'pitch-den': 'denIdeas', 'pitch-solo': 'solo', 'smart-list': 'smart', 'chat-points': 'chat', 'shelf-review': 'shelf' };
function jevLiveBlock(jm, live, now) {
  const mi = Math.floor(now / 60e3), bins = new Map((live?.bins ?? []).map((b) => [b.m, b])), hist = jm.hist ?? [];
  const modeAt = (t) => { let m = hist.length ? null : (jm.preset ?? 'high'); for (const [at, id] of hist) if (at <= t) m = id; return m ?? (hist[0]?.[1] === 'oc' ? 'max' : jm.preset ?? 'high'); };
  let peak = 1, top = 0, sumT = 0; const col = [];
  for (let i = 0; i < 30; i++) { const m = mi - 29 + i, b = bins.get(m) ?? { t: 0, s: 0 }; col.push([m, b.t ?? 0, b.s ?? 0, b.top ?? '']); peak = Math.max(peak, (b.t ?? 0) + (b.s ?? 0)); top = Math.max(top, (b.t ?? 0) + (b.s ?? 0)); sumT += b.t ?? 0; }
  const W = 300, H = 64, bw = W / 30;
  const hm = (m) => { const d = new Date(m * 60e3); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const modeName = (id) => { const P = PRESETS.find((p) => p.id === id); return P ? `${P.label} ${P.pct}%` : 'a custom mix'; };
  let bands = '', bars = '', hot = '';
  col.forEach(([m, t, sk, tp], i) => {
    const mode = modeAt(m * 60e3 + 59999);
    bands += `<rect x="${(i * bw).toFixed(1)}" y="0" width="${(bw + .3).toFixed(1)}" height="${H}" fill="${JMODE[mode] ?? JMODE.custom}" opacity=".16"/>`;
    const ht = t / peak * (H - 6), hs = sk / peak * (H - 6);
    bars += `<rect x="${(i * bw + 1).toFixed(1)}" y="${(H - ht).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${ht.toFixed(1)}" fill="#4f3828"/>`;
    if (hs > 0) bars += `<rect x="${(i * bw + 1).toFixed(1)}" y="${(H - ht - hs).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${hs.toFixed(1)}" fill="#ba8950" opacity=".55"/>`;
    const card = t + sk ? { name: `${hm(m)}${i === 29 ? ' · this minute' : ''}`, what: `${t} ask${t === 1 ? '' : 's'}${sk ? `, ${sk} held back` : ''}.`, does: `Desk on ${modeName(mode)}.`, knob: tp ? `Busiest: ${ELI5['lane:' + tp]?.name ?? tp} (${tp}).` : '' }
      : { name: `${hm(m)}${i === 29 ? ' · this minute' : ''}`, what: 'JEV was resting.', does: `Desk on ${modeName(mode)}.` };
    hot += `<i style="flex:1;height:100%;display:block"${eli('bar:' + i, card)}></i>`;
  });
  const peakY = top ? Math.round(H - (top / peak) * (H - 6)) : null;
  const nowT = col[29][1], avg = sumT / 30;
  const usual = avg >= 1 ? `about ${Math.round(avg)} a minute` : avg > 0 ? `about 1 every ${Math.round(1 / avg)} min` : 'none lately';
  const ago = (at) => { const d = Math.max(0, Math.round((now - at) / 1000)); return d < 60 ? `${d}s` : `${Math.floor(d / 60)}m`; };
  const KIND = { a: ['asked', '#4f3828', 'ui:asked'], s: ['skipped', '#ba8950', 'ui:skipped'], f: ['missed', '#c2452d', 'ui:missed'] };
  const feed = (live?.feed ?? []).map(([at, lane, k]) => { const sys = LANE_SYSTEM[lane] ?? JCLOCK[lane], K = KIND[k] ?? KIND.a;
    return `<div style="display:flex;gap:8px;padding:2px 10px;font-size:11px;color:${VLC.ink}"><span${eli('ui:ago')} style="flex:none;width:30px;color:${VLC.dim}">${ago(at)}</span><b${eli('lane:' + lane)} style="flex:1;font-weight:normal;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(lane)}</b><span${eli(K[2])} style="flex:none;width:52px;color:${K[1]}">${K[0]}</span><span${eli(sys ? 'ui:desk-pct' : 'ui:off-desk')} style="flex:none;width:70px;text-align:right;color:${sys ? VLC.walnut : '#9a8f80'}">${sys ? `desk ${pctOf(jm, sys)}%` : 'not on the desk'}</span></div>`; }).join('');
  const legend = ['saver', 'perf', 'high', 'max', 'oc'].map((id) => `<span${eli('preset:' + id)} style="display:inline-flex;align-items:center;gap:3px"><i style="width:8px;height:8px;border-radius:2px;background:${JMODE[id]}"></i>${(PRESETS.find((p) => p.id === id)?.label ?? id).split(' ')[0]}</span>`).join('');
  return `<div style="padding:12px 10px 2px;display:flex;justify-content:space-between;font-size:12px;letter-spacing:.14em;color:${VLC.walnut}"><span${eli('ui:graph')}>LIVE CALLS · 30 MIN</span><span${eli('ui:now-avg')} style="letter-spacing:.04em">this minute: ${nowT} · usual: ${usual}</span></div>
      <div${eli('ui:graph-caption')} style="padding:0 10px 4px;font-size:11px;font-style:italic;color:${VLC.dim}">each bar is one minute. taller = JEV thought more that minute.</div>
      <div style="padding:0 10px"><div style="position:relative;height:64px"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;width:100%;height:64px;border-radius:6px;background:#fffaf0;border:1px solid rgba(79,56,40,.25);box-sizing:border-box">${bands}${bars}${peakY != null ? `<line x1="0" x2="${W}" y1="${peakY}" y2="${peakY}" stroke="#4f3828" stroke-width=".6" stroke-dasharray="3 3" opacity=".35"/>` : ''}</svg>
      ${peakY != null ? `<span${eli('ui:peak')} style="position:absolute;right:4px;top:${Math.max(0, peakY - 13)}px;font-size:9px;color:${VLC.walnut};opacity:.75;background:rgba(255,250,240,.8);padding:0 2px;border-radius:2px;z-index:2">${top} / min</span>` : ''}
      <div class="jd-bars" style="position:absolute;inset:0;display:flex">${hot}</div></div>
      <div style="display:flex;justify-content:space-between;padding:2px 0 0;font-size:10px;color:${VLC.dim}"><span${eli('ui:graph-caption')}>30 min ago</span><span${eli('ui:graph-caption')}>now</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:4px 10px;justify-content:flex-end;padding:3px 0 0;font-size:10px;color:${VLC.dim}"><span${eli('ui:legend')}>bar colour = the power mode the desk was on that minute:</span>${legend}</div>
      <div style="text-align:right;padding:2px 0 0;font-size:10px;color:${VLC.dim}"><span${eli('ui:pale')}>pale top = calls the desk held back to save power</span></div></div>
      <div${eli('ui:whos')} style="padding:8px 10px 2px;font-size:12px;letter-spacing:.14em;color:${VLC.walnut}">WHO'S CALLING</div>
      <div class="jev-feed">${feed || `<div style="padding:2px 10px;font-size:11px;color:${VLC.dim}">no calls yet, the feed fills on JEV's next ask</div>`}</div>`;
}
function jevDeskWindow(jm, meter, touch, live, now = 0) {
  jmeterNow = meter ?? {};
  const auto = jm.auto !== false, preset = jm.preset ?? 'high';
  const place = touch ? `left:12px;top:calc(var(--spawn-safe-area-top, 0px) + 64px);width:calc(100vw - 12px - var(--spawn-chrome-reservation-right-inset, 50px) - 12px);max-height:calc(100vh - 80px);`
    : `left:clamp(24px, 10vw, 160px);top:50%;transform:translateY(-50%);width:min(560px, calc(100vw - clamp(24px, 10vw, 160px) - var(--spawn-chrome-reservation-right-inset, 50px) - 24px));max-height:calc(100vh - 48px);`;
  const pill = (on, label, act, ea = '') => `<button${ea} onclick="${act}" style="${touch ? TAP + ';' : ''}flex:1;padding:6px 4px;border-radius:999px;border:1px solid ${on ? VLC.walnut : 'rgba(79,56,40,.35)'};background:${on ? VLC.walnut : 'transparent'};color:${on ? VLC.linen : VLC.walnut};font-family:inherit;font-size:11px;letter-spacing:.08em;cursor:pointer">${label}</button>`;
  const asks = Object.values(meter ?? {}).reduce((n, r) => n + (r?.a ?? 0), 0), fails = Object.values(meter ?? {}).reduce((n, r) => n + (r?.f ?? 0), 0), skips = Object.values(meter ?? {}).reduce((n, r) => n + (r?.s ?? 0), 0);
  const rows = SYSTEMS.map((x) => { const p = pctOf(jm, x.id); return `<div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid rgba(79,56,40,.12)">
      <b${eli('sys:' + x.id)} style="flex:none;width:112px;font-weight:normal;font-size:13px;color:${VLC.ink}">${x.label}</b>
      <input type="range" min="0" max="100" step="5" value="${p}" onchange="sendAction('jevMaster',{op:'pct',id:'${x.id}',v:+this.value})" style="flex:1;${touch ? 'height:44px;' : ''}accent-color:${VLC.honey}">
      <span${eli('ui:pct')} style="flex:none;width:38px;text-align:right;font-size:12px;color:${VLC.walnut}">${p}%</span>
      <span style="flex:none;width:118px;font-size:11px;color:${VLC.dim}"><span${eli('ui:pace')}>${jevRate(jm, x)}</span>${x.lanes ? `<br><span${eli('ui:lane-count')}>${x.lanes.reduce((n, l) => n + (meter?.[l]?.a ?? 0), 0)} asked · ${x.lanes.reduce((n, l) => n + (meter?.[l]?.s ?? 0), 0)} skipped</span>` : ''}</span></div>`; }).join('');
  const theme = auto ? '<i>auto: JEV follows your ★ pins and the plans being built</i>' : `theme: ${esc(jm.theme ?? '')}${(jm.theme ?? '').length >= FOCUS.themeRow ? '…' : ''}`;
  return `${ELI_CSS}<div id="jev-desk"${touch ? ' class="touch"' : ''}${touch ? '' : ELI_HANDLERS} data-modal style="position:fixed;${place}box-sizing:border-box;display:flex;flex-direction:column;padding:6px;border-radius:12px;background:${VLC.walnut};box-shadow:0 0 0 2px #2c1e14,6px 6px 0 rgba(20,12,6,.55);font-family:Georgia,serif;pointer-events:auto;z-index:5">
    <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px 8px;color:${VLC.linen}"><span${eli('ui:title')} style="font-size:15px;letter-spacing:.18em">ᛃ JEV MASTER</span>
      <button${eli('ui:close')} onclick="sendAction('jevMaster',{op:'close'})" style="${touch ? TAP + ';' : ''}border:none;background:none;color:${VLC.linen};font-size:20px;cursor:pointer">×</button></div>
    <div style="flex:1;overflow:auto;border-radius:8px;background:${VLC.linen};padding:10px 6px">
      <div style="display:flex;gap:6px;padding:0 4px 10px">${PRESETS.map((P) => pill(preset === P.id, `${P.label} ${P.pct}%`, `sendAction('jevMaster',{op:'preset',id:'${P.id}'})`, eli('preset:' + P.id))).join('')}</div>
      ${preset === 'custom' ? `<div style="padding:0 10px 6px;font-size:11px;color:${VLC.dim}"><span${eli('ui:custom')}>custom mix</span></div>` : ''}
      ${preset === 'oc' && typeof jm.ocUntil === 'number' ? (() => { const r = Math.max(0, Math.ceil((jm.ocUntil - now) / 1000)); return `<div${eli('ui:oc-banner')} style="margin:0 10px 8px;padding:5px 8px;border-radius:6px;background:#c2452d;color:#fff4e6;font-size:12px;letter-spacing:.12em;text-align:center">OVERCLOCK · ${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')} left · then Maximum · chess held at 100%</div>`; })() : ''}
      ${jevLiveBlock(jm, live, now)}
      ${rows}
      <div style="padding:12px 10px 4px;font-size:12px;letter-spacing:.14em;color:${VLC.walnut}"><span${eli('ui:focus')}>FOCUS</span></div>
      <div style="display:flex;gap:6px;padding:0 10px">
        <input id="jev-theme" maxlength="${FOCUS.themeMax}" placeholder="e.g. finish the longhouse roof and yard" onkeydown="event.stopPropagation();if(event.key==='Enter'){sendAction('jevMaster',{op:'theme',v:this.value})}" onkeyup="event.stopPropagation()" style="flex:1;min-width:0;padding:6px 8px;border-radius:6px;border:1px solid rgba(79,56,40,.4);background:#fffaf0;font-family:inherit;font-size:13px;color:${VLC.ink}">
        <button${eli('ui:set')} onclick="sendAction('jevMaster',{op:'theme',v:document.getElementById('jev-theme').value})" style="${touch ? TAP + ';' : ''}padding:6px 12px;border-radius:6px;border:1px solid ${VLC.walnut};background:${VLC.honey};color:#1e140c;font-family:inherit;font-size:12px;letter-spacing:.1em;cursor:pointer">SET</button>
        <button${eli('ui:auto')} onclick="sendAction('jevMaster',{op:'auto'})" style="${touch ? TAP + ';' : ''}padding:6px 12px;border-radius:6px;border:1px solid ${VLC.walnut};background:${auto ? VLC.walnut : 'transparent'};color:${auto ? VLC.linen : VLC.walnut};font-family:inherit;font-size:12px;letter-spacing:.1em;cursor:pointer">AUTO${auto ? ' ✓' : ''}</button></div>
      <div style="padding:6px 10px 0;font-size:12px;color:${VLC.ink};opacity:.85"><span${eli('ui:theme')}>${theme}</span></div>
      <div${eli('ui:footer')} style="padding:10px 10px 2px;font-size:11px;color:${VLC.dim}">this hour: ${asks} JEV asks · ${skips} skipped by the desk · ${fails} missed · the brief lives in docs/board/JEV-FOCUS.md</div>
    </div></div>`;
}

// DEN SYSTEMS (creator 2026-10-04): every system we built, paused by default; one switch each. O → DEN SYSTEMS ▸ opens it.
let sysKey = null, sysHtml = '';
function sysWindow(ctx, player, touch) {
  const s = player?.state;
  if (!s?.sysOpen || !player?.isEditor) return '';
  const on = ctx.world?.state?.systems ?? {}, key = JSON.stringify(on) + '|' + touch;
  if (key === sysKey) return sysHtml;
  sysKey = key;
  const rows = DEN_SYSTEMS.map((x) => { const v = on[x.id] === true; return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(201,164,106,.25)">
      <div style="min-width:0"><div style="font-size:14px">${x.label}</div><div style="font-size:11px;opacity:.6">${x.note}</div></div>
      <button id="sys-${x.id}" onclick="sendAction('sysToggle',{id:'${x.id}'})" style="flex:none;${touch ? 'min-height:44px;' : ''}padding:5px 12px;border-radius:999px;border:1px solid rgba(201,164,106,.6);background:${v ? 'rgba(120,170,100,.85)' : 'rgba(90,60,35,.6)'};color:${v ? '#10180c' : '#f4e3c3'};font-family:inherit;font-size:12px;cursor:pointer">${v ? 'on' : 'paused'}</button></div>`; }).join('');
  const any = DEN_SYSTEMS.some((x) => on[x.id] === true);
  sysHtml = `<div id="den-systems" data-modal style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:${touch ? '92vw' : '340px'};max-height:80vh;overflow-y:auto;box-sizing:border-box;padding:14px 18px 16px;border-radius:12px;background:rgba(40,26,16,.92);border:1px solid rgba(201,164,106,.6);box-shadow:4px 4px 0 rgba(20,12,6,.6);color:#f4e3c3;font-family:Georgia,serif;pointer-events:auto;z-index:50">
    <div style="position:sticky;top:-14px;z-index:1;margin:-14px -18px 6px;padding:12px 18px 8px;background:rgba(40,26,16,.98);border-bottom:1px solid rgba(201,164,106,.25);display:flex;justify-content:space-between;align-items:center"><span style="font-size:15px;letter-spacing:.14em;color:#e7b457">DEN SYSTEMS</span><span style="display:flex;align-items:center;gap:8px"><span style="font-size:11px;opacity:.6">${any ? 'some running' : 'all paused · bare bones'}</span><button id="den-systems-x" title="close (O)" onclick="sendAction('sysWin',{},{relockPointer:true})" style="width:${touch ? '44px' : '24px'};height:${touch ? '44px' : '24px'};padding:0;border-radius:6px;border:1px solid rgba(201,164,106,.7);background:rgba(20,12,6,.45);color:#f4e3c3;font:bold 13px/1 Georgia,serif;cursor:pointer">✕</button></span></div>
    ${rows}
    <button id="sys-raven-roads" onclick="sendAction('travelPanel')" style="width:100%;margin-top:10px;${touch ? 'min-height:44px;' : ''}padding:7px;border-radius:8px;border:1px solid rgba(201,164,106,.6);background:rgba(93,173,169,.35);color:#f4e3c3;font-family:inherit;font-size:13px;letter-spacing:.1em;cursor:pointer">ᚱ RAVEN ROADS ▸ <span style="font-size:11px;opacity:.7">dev travel</span></button>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button onclick="sendAction('sysToggle',{id:'*off'})" style="flex:1;padding:6px;border-radius:8px;border:1px solid rgba(201,164,106,.5);background:rgba(90,60,35,.6);color:#f4e3c3;font-family:inherit;cursor:pointer">pause all</button>
      <button onclick="sendAction('sysWin',{},{relockPointer:true})" style="flex:1;padding:6px;border-radius:8px;border:1px solid rgba(201,164,106,.5);background:rgba(186,137,80,.7);color:#1e140c;font-family:inherit;cursor:pointer">close</button></div>
  </div>`;
  return sysHtml;
}

// GONDOLA (scripts/gondola-rider.js writes player.state.gondolaHint on change): the lift's prompt beside a docked cabin, and the ride line.
function gondolaHud(s, touch) {
  const h = s?.gondolaHint; if (!h) return '';
  const t = touch ? h.replace(/^E · /, '') : h;
  return `<div id="gondola-hint" style="position:fixed;left:50%;transform:translateX(-50%);bottom:120px;padding:6px 16px;border-radius:10px;background:rgba(40,26,16,.62);border:1px solid rgba(201,164,106,.5);color:#f2e6cf;font:15px Georgia,serif;letter-spacing:.05em;pointer-events:none;text-shadow:0 1px 2px #1a120c">${t}</div>`;
}
