import { starChat } from '../../scripts/lib/profanity.js';
import { osCanvasFeed, OS_INK } from './oschat-canvas.js';
import { osMmFeed, osMmView, mmZoomIndex, MMZ } from './osmm-canvas.js';
import { kitOn } from './skin.js'; // 3rd Person (gold kit) branches below; the OSRS path is untouched
import { UIK } from '../../scripts/lib/data/ui-kit.js';
import { ctxMenuCss } from './kit-ctxmenu.js';
import { zoneOf, liveZones } from '../../scripts/lib/data/zones.js';
import * as OSCV_K from './oschat-canvas.js';
import { osPanelFeed, PNL, tabX } from './ospanel-canvas.js';
import { osPane } from './ospane-canvas.js';
import skillsPane, { SKILL_ORDER } from './ospane-skills.js';
import combatPane from './ospane-combat.js';
import equipPane, { EQ_AT, EQ_BUTTONS } from './ospane-equip.js';
import { weaponOf, styleOf, stylesFor, spellOf } from '../../scripts/lib/combat-core.js';
import { xpFeed } from '../../scripts/lib/xp-fx.js';
import { chatStamp } from '../../scripts/lib/chat-log.js';
import { settingOf } from '../../scripts/lib/settings-core.js';
// OSRS SIDE PANEL + MINIMAP (creator 2026-10-06): rebuilt 1:1 from Campton's two reference shots.
// The stone frame, tab icons, slot silhouettes, the four equipment buttons, the dragon-ring minimap frame and the orbs are
// cut straight from his pictures (/tmp crops → /cdn uploads); everything live (items, stats, counts, map, needle, name) is drawn over them.
// Pure render helpers: read player.state, ctx.session, ctx.query; never write, never throw. Clicks reach ui.js page globals (osTab, osView, hudToggle).
import { EMOTES } from '../../scripts/lib/data/emotes.js';
import { SKILL_LIST, ITEMS } from '../../scripts/lib/data/skills.js';
import { levelOf } from '../../scripts/lib/skills-core.js';
import { CB } from '../../scripts/lib/data/combat.js';
import { invCell } from '../../scripts/lib/skills-hud.js';
import { cbLevelOf } from '../../scripts/lib/combat-hud.js';
import { ST } from '../../scripts/lib/data/stamina.js';
import { SLOT_NAMES } from '../../scripts/lib/data/equip.js';
import { quiverArrow } from '../../scripts/lib/fletch-core.js';
import { gearOf, defOf } from '../../scripts/lib/equip-core.js';
import { RUNES } from '../../scripts/lib/data/runes.js';
import { prayerLevel, prayerRow } from './prayer.js';
import prayerPane from './ospane-prayer.js';
import questPane from './ospane-quest.js';
import musicPane from './ospane-music.js';
import emotesPane from './ospane-emotes.js';
import { SONG_IDS, byId } from '../../scripts/lib/data/settings-registry.js';
import { QUESTS } from '../../scripts/lib/data/quests.js';
import { PRAYERS, PRAYER } from '../../scripts/lib/data/prayers.js';
import { normPrayer, secondsLeft, prayerMax } from '../../scripts/lib/prayer-core.js';
import { SPELLS_ALL, maxHitFor } from '../../scripts/lib/data/spells.js';
import { STAFF_RUNES } from '../../scripts/lib/data/runes.js';
import { missing, castsLeft } from '../../scripts/lib/magic-core.js';
import { barValueOf } from '../../scripts/lib/data/spellbook.js';
import { WOW } from './wow.js';
import { charSheet } from './charsheet.js';
import { backpack } from './backpack.js';
import { wallHour, partName } from '../../scripts/lib/real-clock.js';
import { esc } from '../../scripts/lib/esc.js';

export const OS_GRYPHONS = `<img class="osg l" src="/cdn/value.a83dbc9a5bd98217b073e9ac96af1dbeb2414ed78bba1155975fa00c2c01429c.png" alt=""><img class="osg r" src="/cdn/value.a83dbc9a5bd98217b073e9ac96af1dbeb2414ed78bba1155975fa00c2c01429c.png" alt="">`;
import { osScaleFeed } from './os-scale.js';
export const OS_SCALE = 1.2;
export const TOP_TABS = [
  { id: 'combat', title: 'Combat Options' }, { id: 'stats', title: 'Skills (K)' }, { id: 'quests', title: 'Quest List' },
  { id: 'inv', title: 'Inventory (B)' }, { id: 'equip', title: 'Worn Equipment (P)' }, { id: 'prayer', title: 'Prayer (I)' }, { id: 'magic', title: 'Magic (N)' },
];
// bottom row in the order and icons of the OSRS sheet: chat-channel (two helmeted smileys), friends, account (man and gear), logout, settings, emotes, music
export const BOT_TABS = [
  { id: 'clan', title: 'Chat-channel' }, { id: 'friends', title: 'Friends List' }, { id: 'acct', title: 'Account Management (character sheet)' },
  { id: 'logout', title: 'Game Menu (F10)' }, { id: 'settings', title: 'Settings (O)' }, { id: 'emotes', title: 'Emotes' }, { id: 'music', title: 'Music Player' },
];
const Y = '#ffff00', G = '#00ff80', SH = 'text-shadow:1px 1px 0 #000';

export const OS_CSS = `<style>
#osp,#osmm{font-family:'Trebuchet MS',Verdana,sans-serif;font-weight:bold;-webkit-font-smoothing:none}
#osp{position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 10px);bottom:calc(var(--spawn-safe-area-bottom,0px) + 6px);width:${PNL.W}px;height:${PNL.H}px;transform:scale(var(--ospk,${OS_SCALE}));transform-origin:bottom right;z-index:60;pointer-events:auto;color:#ff981f}
#ospc{position:absolute;left:0;top:0;width:${PNL.W}px;height:${PNL.H}px;image-rendering:pixelated;pointer-events:none}
#osp .ost{position:absolute;padding:0;margin:0;border:0;background:transparent;cursor:pointer;outline:none}
#osp-in{position:absolute;left:${PNL.body.x}px;top:${PNL.body.y}px;width:${PNL.body.w}px;height:${PNL.body.h}px;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#5c5040 #2a241c;font-size:11px;${SH}}
#osp-in{background:#3e3529}
#osp-in[data-tab="inv"]{overflow:hidden;scrollbar-gutter:auto;padding:0}
#osp-in:has(#ospn){overflow:hidden;padding:0;scrollbar-gutter:auto;border-radius:0}
#ospn{position:absolute;left:0;top:0;width:192px;height:262px;image-rendering:pixelated;pointer-events:none}
#osp-in .ohit{position:absolute;padding:0;margin:0;border:0;background:transparent;cursor:pointer;outline:none}
#osp-in .rune{width:25px;height:25px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#e8e6e0,#9a968c 70%,#5e5a52);box-shadow:0 0 0 1px #2a2620;display:flex;align-items:center;justify-content:center}
#osp-in .rune i{width:11px;height:11px;transform:rotate(45deg);box-shadow:0 0 3px rgba(0,0,0,.5)}
#osp-in .sbk{width:26px;height:24px;padding:0;margin:0;border:0;background-color:transparent;background-repeat:no-repeat;background-size:416px 120px;image-rendering:pixelated;cursor:pointer}
#osp-in[data-tab="magic"]{overflow-y:auto;overflow-x:hidden;scrollbar-gutter:auto;padding:0}
#osp-in .h4-slot{position:relative;background:transparent!important;border-color:transparent!important;box-shadow:none!important}
#osp-in .note{margin:10px 8px;color:#ff981f;font-size:11px;line-height:1.45;text-align:center}
#osp{border-radius:12px;overflow:hidden}
#osp-in{border-radius:7px;box-sizing:border-box;scrollbar-gutter:stable}
#osp-in *{box-sizing:border-box;max-width:100%}
#osp-in[data-tab=combat]{padding:2px 3px 4px 2px;overflow-x:hidden}
#osp-in[data-tab=combat] button,#osp-in[data-tab=combat] div{overflow-wrap:anywhere;min-width:0}
#osp-in[data-tab=combat] button,#osp-in[data-tab=combat] div[style*="background"]{border-radius:6px!important}
#osp-in[data-tab=combat] span[style*="font-size:13px"]{font-size:11px!important}
#osp-in[data-tab=combat] b[style*="font-size:16px"]{font-size:13px!important}
#osp-in .hdr{color:#ff981f;text-align:center;font-size:12px;margin:3px 0 6px}
#osmm{position:fixed;right:8px;top:calc(var(--spawn-safe-area-top,0px) + 6px);width:211px;height:171px;transform:scale(var(--ospk,${OS_SCALE}));transform-origin:top right;z-index:59;pointer-events:none}
#osmm .map{position:absolute;left:52px;top:8px;width:152px;height:152px;border-radius:50%;overflow:hidden;background-color:#2e4a2a;background-repeat:no-repeat}
#osmm canvas{position:absolute;left:0;top:0;width:211px;height:171px;image-rendering:pixelated}
#osmm .rose{position:absolute;left:0;top:0;width:152px;height:152px;opacity:.5}
#osmm .dot{position:absolute;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.7)}
#osmm .dot.foe{background:#ffff00}#osmm .dot.npc{background:#ffff00}#osmm .dot.pl{background:#ffffff}
#osmm .me{position:absolute;left:50%;top:50%;width:0;height:0;margin:-6px 0 0 -4px;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:11px solid #fff;filter:drop-shadow(0 0 1px #000);transform-origin:4px 7px}
#osmm .hit{position:absolute;border-radius:50%;pointer-events:auto;cursor:pointer;background:transparent;border:0;padding:0}
#osmm .hit:hover{background:rgba(255,255,255,.1)}
/* the hotbar, 1:1 after Campton's reference: dark stone plate, grey-brown slots, bronze gryphons cut from his picture */
#nh-dock{background:linear-gradient(180deg,#2e2a22,#1e1b15)!important;border:2px solid #4e4536!important;border-radius:4px!important;box-shadow:inset 0 0 0 1px #0e0c08,inset 0 1px 0 rgba(255,240,210,.08),0 3px 12px rgba(0,0,0,.6)!important}
#nh-dock::before,#nh-dock::after{display:none!important}
#nh-dock .osg{position:absolute;bottom:-10px;width:100px;height:128px;object-fit:contain;object-position:center bottom;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.7))}
#nh-dock .osg.l{left:-86px;transform:scaleX(-1)}#nh-dock .osg.r{right:-86px}
#nh-dock .h4-slot{border-radius:2px!important;border:1px solid #14110b!important;background:linear-gradient(180deg,#4a4337,#3b352b)!important;box-shadow:inset 0 0 0 1px rgba(255,240,210,.1),inset 0 2px 5px rgba(0,0,0,.35)!important}
#nh-dock .h4-slot:hover{background:linear-gradient(180deg,#5a5244,#463f33)!important;box-shadow:inset 0 0 0 1px rgba(255,236,190,.35)!important}
#nh-dock .h4-slot.on{box-shadow:inset 0 0 0 1px #d8c28a,0 0 6px rgba(216,194,138,.45)!important}
#nh-dock .h4-key,#nh-dock .h4-slot .h4-key{color:#ece2c8!important;font:700 10px/1 'Trebuchet MS',Verdana,sans-serif!important;text-shadow:1px 1px 0 #000!important}
#nh-dock #hud-xp{background:linear-gradient(#17140f,#221e17)!important;box-shadow:0 0 0 1px #4e4536,inset 0 1px 3px #000!important;border:1px solid #0a0806!important}
#nh-dock #hud-xp>span{font:700 10px/1 'Trebuchet MS',Verdana,sans-serif!important;color:#f2ead6!important}
/* creator 2026-10-06: no character unit frame top-left */
#hud-player{display:none!important}
/* creator 2026-10-06: admin windows open in the clear middle, never over the keybinds (left), side panel/minimap (right), chat or hotbar (bottom) */
@media (pointer:fine) and (min-width:1100px){
#den-systems,#jev-desk,#vote-ledger{left:300px!important;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 300px)!important;width:auto!important;max-width:720px;margin:0 auto!important;top:70px!important;bottom:auto!important;transform:none!important;max-height:calc(100vh - 290px)!important}
}
@media (pointer:coarse),(hover:none){#osp,#osmm{display:none}}
/* short windows: the shared size (ui/hud/os-scale.js --ospk, floored at 0.75) now fits these; the old max-height:760px scale(1) rule gave way to it */
</style>`;

// ---- the compass rose over the map, drawn after the reference: gold 8-point star, dark disc with a red ring, white/red inner star
const pt = (a, r) => `${(80 + Math.sin(a) * r).toFixed(1)},${(80 - Math.cos(a) * r).toFixed(1)}`;
const star = (n, ro, ri, off = 0) => { let p = []; for (let i = 0; i < n * 2; i++) p.push(pt(off + i * Math.PI / n, i % 2 ? ri : ro)); return p.join(' '); };
const ROSE = (() => {
  let inner = '';
  for (let i = 0; i < 8; i++) { // each inner point split in two halves: light and shade, north red
    const a = i * Math.PI / 4, ro = i % 2 ? 26 : 38, ri = 7;
    const L = pt(a - Math.PI / 8, ri), R = pt(a + Math.PI / 8, ri), tip = pt(a, ro);
    const lite = i === 0 ? '#b8322a' : i === 6 ? '#b8322a' : '#f2f0ea', dark = i === 0 ? '#7c1a16' : i === 2 ? '#7c1a16' : '#a8a49c';
    inner += `<polygon points="80,80 ${L} ${tip}" fill="${lite}" stroke="#1a1612" stroke-width=".8"/><polygon points="80,80 ${tip} ${R}" fill="${dark}" stroke="#1a1612" stroke-width=".8"/>`;
  }
  return `<svg class="rose" viewBox="0 0 160 160">`
    + `<polygon points="${star(8, 76, 50, Math.PI / 8)}" fill="#3a3530" stroke="#141110" stroke-width="2"/>`
    + `<polygon points="${star(4, 78, 46)}" fill="#c89a52" stroke="#3a2a14" stroke-width="1.6"/>`
    + `<polygon points="${star(4, 66, 40, Math.PI / 4)}" fill="#a87c3c" stroke="#3a2a14" stroke-width="1.4"/>`
    + `<circle cx="80" cy="80" r="49" fill="#c89a52" stroke="#3a2a14" stroke-width="1.4"/><circle cx="80" cy="80" r="45" fill="#33302c" stroke="#5a1a14" stroke-width="2.4"/>`
    + `<polygon points="${star(8, 22, 12, Math.PI / 8)}" fill="#8a1e18" opacity=".85"/>${inner}`
    + [0, 1, 2, 3].map((i) => { const [x, y] = pt(Math.PI / 4 + i * Math.PI / 2, 40).split(','); return `<circle cx="${x}" cy="${y}" r="1.6" fill="#d8b878"/>`; }).join('')
    + `</svg>`;
})();

let mmAt = 0, mmRows = [];
// ---- the live minimap's data (creator 2026-10-09): one scan ≤ 4 Hz, rows [x, z, kind, name] for osmm-canvas.js osMmView (both skins)
const MM_FOLK = ['npc', 'folk', 'villager', 'merchant', 'vendor', 'shopkeeper', 'questgiver', 'bc-town-folk', 'crk-folk', 'meadow-folk', 'dock-folk', 'isle-folk', 'bc-works-folk', 'fall-folk'];
const MM_SHOP = new Set(['merchant', 'vendor', 'shopkeeper', 'shop', 'market-stall']);
const mmName = (r) => { const n = r.state?.name ?? r.state?.displayName ?? r.state?.title; if (typeof n === 'string' && n) return n.slice(0, 40); const b = String(r.id ?? '').split('/').pop().replace(/[-_]\d+$/, '').replace(/[-_]+/g, ' '); return b ? b[0].toUpperCase() + b.slice(1) : ''; };
const mmMain = (ctx) => { const pl = ctx.place?.id ?? ctx.self?.place ?? 'main'; return !pl || pl === 'main'; };
function mmScan(ctx, player, f, reach) {
  mmAt = Date.now(); const out = [], seen = new Set();
  const q = (o) => { try { return ctx.query?.({ center: f, radius: reach, ...o }) ?? []; } catch (e) { return []; } };
  for (const r of q({ tags: ['enemy'] })) if (r.feetPosition && !r.state?.down) { seen.add(r.id); out.push([r.feetPosition.x, r.feetPosition.z, 'foe', mmName(r)]); }
  for (const r of q({ anyTags: MM_FOLK, excludeTags: ['nameplate'] })) {
    if (!r.feetPosition || seen.has(r.id) || r.state?.down) continue; seen.add(r.id); const t = r.tags ?? [];
    const kind = t.includes('questgiver') ? 'quest' : t.includes('bank') || t.includes('banker') ? 'bank' : t.some((x) => MM_SHOP.has(x)) ? 'shop' : 'npc';
    out.push([r.feetPosition.x, r.feetPosition.z, kind, mmName(r)]);
  }
  for (const r of q({ tags: ['quest-mark'] })) if (r.feetPosition) out.push([r.feetPosition.x, r.feetPosition.z, 'quest', r.state?.name ?? 'Quest']);
  for (const p of ctx.place?.players ?? []) if (p.id !== player?.id && p.feetPosition) out.push([p.feetPosition.x, p.feetPosition.z, 'pl', p.displayName ?? 'Player']);
  if (mmMain(ctx)) { try { for (const z of liveZones(ctx.world?.state) ?? []) if (Number.isFinite(z?.x) && Number.isFinite(z?.z) && Math.hypot(z.x - f.x, z.z - f.z) < reach + 10) out.push([z.x, z.z, 'zone', z.name ?? '']); } catch (e) {} }
  mmRows = out;
}
// the live map canvas fills the map circle; +/- zoom: classic sits on the stone frame right of the hole, kit sits on the ring's lower lip
const MMV_CSS = `<style>#osmm canvas#osmmv{position:absolute;left:0;top:0;width:100%;height:100%;image-rendering:auto;pointer-events:auto;cursor:pointer;border-radius:50%}
#osmm .mmz{position:absolute;width:14px;height:14px;padding:0;border:1px solid #000;border-radius:2px;background:#4a4337;box-shadow:inset 0 0 0 1px #6b604c;color:#ff981f;font:bold 12px/11px 'Trebuchet MS',Verdana,sans-serif;text-shadow:1px 1px 0 #000;pointer-events:auto;cursor:pointer}
#osmm .mmz:hover{background:#5a5244}#osmm .mmz[disabled]{color:#6b604c;cursor:default}
#osmm.kmm .mmz{width:20px;height:20px;border-radius:50%;border:1px solid #b8893c;background:radial-gradient(#2a2f33,#111417);box-shadow:0 0 0 1px #000,0 2px 4px rgba(0,0,0,.6);color:#e8c46a;font:16px/17px Georgia,serif}
#osmm.kmm .mmz:hover{filter:brightness(1.3)}#osmm.kmm .mmz[disabled]{color:#5a4a2a}</style>`;
function mmZoomBtns(zi, skin) {
  const top = MMZ.length - 1, [x, y1, y2] = skin === 'kit' ? [OC + HX - HR - 14, HY + HR - 24, HY + HR - 2] : [193, 34, 50];
  const b = (d, t, y, dis) => `<button class="mmz" data-mmz="${d}" title="${t}"${dis ? ' disabled' : ''} style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${d > 0 ? '+' : '\u2212'}</button>`;
  return b(1, 'Zoom in (mouse wheel)', y1, zi >= top) + b(-1, 'Zoom out (mouse wheel)', y2, zi <= 0);
}
export function osMinimap(ctx, player) {
  try {
    const f = ctx.self?.feetPosition ?? player?.feetPosition; if (!f) return '';
    const s = player?.state ?? {}, M = WOW.map, S = 152, half = S / 2, k = 1;
    const px = M.ox + (f.x - M.x0) / M.mpp, py = M.oy + (f.z - M.z0) / M.mpp;
    const yaw = ctx.session?.camFacing?.yaw ?? 0;
    const now = Date.now();
    const kit = kitOn(player), zi = mmZoomIndex(player?.userId ?? player?.id, s.settings?.mmZoom), reach = Math.min(240, (kit ? HR : half) / (MMZ[zi] ?? 1) * M.mpp);
    if (now - mmAt > 250) mmScan(ctx, player, f, reach); // ≤ 4 Hz: positions refresh four times a second, the map turns every repaint
    if (typeof document !== 'undefined') osMmView({ f: { x: f.x, z: f.z }, yaw, face: null, rows: mmRows, M, main: mmMain(ctx), r: kit ? HR : half, kit, pid: player?.userId ?? player?.id, zi, walk: mmMain(ctx), walkTo: s.walkTo && !s.walkTo.assist ? s.walkTo : null });
    // the orbs: hp, prayer, run energy, combat
    const hpMax = levelOf(s.skills?.hitpoints ?? CB.hpStartTenths), hp = Math.round(Math.max(0, Math.min(hpMax, +(s.hp ?? hpMax) || 0)));
    const pry = prayerRow(s);
    const sh = ctx.session?.stamHud, smax = ST?.max ?? 100, sv = Math.floor(Math.max(0, Math.min(smax, +(sh?.v ?? smax) || 0)));
    const runPct = Math.round(sv / smax * 100), cb = Math.round(+cbLevelOf(s) || 3);
    const col = (p) => (p > 0.75 ? G : p > 0.5 ? '#c8ff00' : p > 0.25 ? '#ffb000' : '#ff3020');
    const hr = wallHour(ctx); const clock = typeof hr === 'number' && isFinite(hr) ? `${String(Math.floor(hr)).padStart(2, '0')}:${String(Math.floor((hr % 1) * 60)).padStart(2, '0')} ${partName(hr) ?? ''}` : '';
    if (typeof document !== 'undefined') { osMmFeed({ hp, hpMax, pray: pry.now, prayMax: pry.max, run: runPct, runOn: !!s.runOn, spec: 100, yaw }); xpFeed(s.settings); }
    const hit = (t, fn, x, y, w, ctxm) => `<button class="hit" title="${esc(t)}" onclick="${fn}"${ctxm ? ` oncontextmenu="${ctxm};return false"` : ''} style="left:${x}px;top:${y}px;width:${w}px;height:${w}px"></button>`;
    const xpOn = !!s.settings?.xpCounter;
    if (kit) return kitMinimap(ctx, player, { f, M, px, py, yaw, hp, hpMax, pry, runPct, runOn: !!s.runOn, clock, xpOn, zi });
    return `<div id="osmm">`
      + MMV_CSS + `<div class="map" title="${esc(clock)}"><canvas id="osmmv" width="304" height="304"></canvas></div>`
      + `<canvas id="osmmc" width="211" height="171"></canvas>` + mmZoomBtns(zi, 'os')
      + hit(`XP counter: click to turn ${xpOn ? 'off' : 'on'}, right-click to choose the skill`, `sendAction('setSetting',{id:'xpCounter',v:${!xpOn}})`, 1, 27, 25, 'xpSetup()') + hit(`Hitpoints ${hp}/${hpMax}`, "osTab('equip')", 25, 48, 30) + hit(`Prayer ${pry.now}/${pry.max} (I)`, "osTab('prayer')", 25, 82, 30)
      + hit(`Run energy ${runPct}%: click to ${s.runOn ? 'walk' : 'run'} (R)`, "sendAction('runToggle',{},{relockPointer:true})", 35, 114, 30)
      + hit('Special attack: no special weapon in hand (Combat Options)', "osTab('combat')", 57, 139, 30) + hit('Raven Roads (world travel)', "sendAction('travelPanel')", 177, 124, 30)
      + `</div>`;
  } catch (e) { return ''; }
}

// ---- the panel bodies
// 4 rows of three, the reference's 37 px slots and dark connectors; y local to the interior (abs y − 52)
const RUNE_BY_ID = Object.fromEntries(Object.values(RUNES).map((r) => [r.id, r]));
function supIcon(id) {
  const r = RUNE_BY_ID[id];
  if (r) return `<div class="rune"><i style="background:${esc(r.color)}"></i></div>`;
  if (id === 'coins') return `<div style="width:22px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff2a0,#d8a828 55%,#8a6410);box-shadow:4px -3px 0 -1px #c89820,0 0 0 1px #3a2a08"></div>`;
  if (/arrow/.test(id)) return `<svg width="26" height="26" viewBox="0 0 26 26"><path d="M4 22 L20 6" stroke="#8a6438" stroke-width="2.4"/><path d="M20 6 l-6 1 l5 5 z" fill="#c8c8c8" stroke="#222" stroke-width=".6"/><path d="M4 22 l-1 -4 l4 1 z M6 20 l-1 -4 l4 1 z" fill="#e8e0d0"/></svg>`;
  const d = ITEMS[id]; return `<div style="width:22px;height:16px;border-radius:5px;background:${esc(d?.color ?? '#888')};border:1px solid #1a1612;font-size:10px;line-height:16px;text-align:center;color:#fff">${esc(d?.glyph ?? (d?.name ?? id)[0] ?? '?')}</div>`;
}
function equipBody(s) { // the OSRS Worn Equipment window (ospane-equip.js)
  const slots = Object.entries(EQ_AT).map(([slot, [x, y]]) => {
    const id = s.equip?.[slot], d = id && defOf(id), nm = SLOT_NAMES[slot] ?? slot;
    if (slot === 'ammo') {
      const a = quiverArrow(s.supplies, id);
      return a ? { slot, x, y, title: `Ammo: ${a.name} arrows (click to change)`, js: "sendAction('ammoCycle',{})", item: { color: '#9a7a4a', glyph: '➶' }, count: s.supplies[a.arrows] | 0 } : { slot, x, y, title: 'Ammo: no arrows', js: '' };
    }
    return d ? { slot, x, y, title: `${nm}: ${d.name} (click to remove)`, js: `sendAction('unequip',{slot:'${slot}'})`, ctx: `event.preventDefault();sendAction('menuAt',{k:'eq',slot:'${slot}',x:event.clientX,y:event.clientY})`, item: { color: d.color, glyph: (d.glyph ?? d.name?.[0] ?? '?').slice(0, 2) } }
      : { slot, x, y, title: `${nm}: empty`, js: '' };
  });
  const B = [['Equipment Stats', "osView('stats')"], ['Supplies: runes, coins, arrows', "osView('supplies')"], ['Character sheet (portrait, bonuses, combat)', 'osSheet()'], ['Call your Wynx', "osView('wynx')"]];
  return osPane(equipPane, { slots, buttons: EQ_BUTTONS.map((b, i) => ({ ...b, title: B[i][0], js: B[i][1] })) });
}
function suppliesBody(s) { // the money-bag button: what the den keeps outside the backpack
  const sup = Object.entries(s.supplies ?? {}).filter(([, n]) => (n | 0) > 0);
  const rows = sup.map(([id, n]) => `<div style="display:flex;align-items:center;gap:6px;padding:2px 6px">${supIcon(id)}<span style="flex:1">${esc(RUNE_BY_ID[id]?.name ?? ITEMS[id]?.name ?? (id === 'coins' ? 'Coins' : id))}</span><span style="color:${Y}">${(n | 0).toLocaleString('en-US')}</span></div>`).join('');
  return `<div class="hdr">Supplies</div>${rows || '<div class="note" style="margin-top:20px">no runes, coins or arrows carried</div>'}<div style="padding:8px 6px"><button onclick="osView(null)" style="font:bold 11px 'Trebuchet MS';color:#ff981f;background:#3e362a;border:1px solid #1a1612;padding:3px 12px;cursor:pointer">Back</button></div>`;
}
function eqStatsBody(s) {
  const G2 = gearOf(s.equip, s.cbWeapon), sg = (n) => (n > 0 ? '+' + n : '' + n), K = ['stab', 'slash', 'crush', 'magic', 'ranged'];
  const row = (lab, v) => `<div style="display:flex;justify-content:space-between;padding:1px 6px"><span>${lab}</span><span style="color:${Y}">${v}</span></div>`;
  return `<div class="hdr">Equipment Stats</div><div style="color:#ff981f;padding:0 6px">Attack bonus</div>${K.map((k) => row(k[0].toUpperCase() + k.slice(1), sg(G2.atk[k]))).join('')}`
    + `<div style="color:#ff981f;padding:4px 6px 0">Defence bonus</div>${K.map((k) => row(k[0].toUpperCase() + k.slice(1), sg(G2.def[k]))).join('')}`
    + `<div style="color:#ff981f;padding:4px 6px 0">Other bonuses</div>${row('Melee strength', sg(G2.str))}`
    + `<div style="text-align:center;margin-top:8px"><button onclick="osView(null)" style="font:bold 11px 'Trebuchet MS';color:#ff981f;background:#3e362a;border:1px solid #1a1612;padding:3px 12px;cursor:pointer">Back</button></div>`;
}
function statsBody(s, ui) { // the OSRS Skills window (ospane-skills.js): the den's skills in OSRS reading order, cells are click-to-track
  let total = 0;
  const byId = Object.fromEntries(SKILL_LIST.map((k) => [k.id, k]));
  const cells = [...SKILL_ORDER, ...SKILL_LIST.map((k) => k.id).filter((id) => !SKILL_ORDER.includes(id))].filter((id) => byId[id]).map((id) => {
    const lv = levelOf(id === 'hitpoints' ? (s.skills?.hitpoints ?? CB.hpStartTenths) : (s.skills?.[id] | 0)); total += lv;
    return { id, name: byId[id].name, lv, base: lv, on: ui?.track === id };
  });
  return osPane(skillsPane, { cells: cells.slice(0, 18), total });
}
const CAT = { unarmed: 'Unarmed', sword: 'Stab Sword', longsword: 'Slash Sword', battleaxe: 'Axe', twohand: '2h Sword', spear: 'Spear', mace: 'Blunt', hammer: 'Blunt', staff: 'Staff' };
function combatBody(s) { // the OSRS Combat Options window (ospane-combat.js)
  const w = weaponOf(s.cbWeapon), st = styleOf(w, s.cbStyle);
  return osPane(combatPane, { name: w.name, lvl: Math.round(+cbLevelOf(s) || 3), autoRet: s.autoRet !== false, category: CAT[w.set] ?? (w.kind === 'ranged' ? 'Bow' : w.kind === 'magic' ? 'Staff' : 'Weapon'),
    spell: w.kind === 'magic' ? spellOf(s.cbSpell)?.name ?? 'none' : '', styles: stylesFor(w).map((x) => ({ id: x.id, name: x.name, on: x.id === st.id })) });
}
const SPELL_SHEET = '/cdn/value.fb5307528b642eaa44c4b19399e147d16c83b6804d7e34084e7ca19d6e03b174.png'; // 16 slots of 26 x 24 per row, in SPELLS_ALL order (level != null); icons cut from the creator's standard-spellbook screenshot (~/spawn/art/osrs-ui/panel/build_spells.py)
function spellBookBody(s) { // the standard spellbook on the OSRS panel: 7 columns of 26 x 24 slots holding the real icons; greyed = level or runes short or not in the den yet
  const magic = levelOf(s.skills?.magic | 0), wid = weaponOf(s.cbWeapon).id, free = STAFF_RUNES[wid] ?? [];
  const cells = SPELLS_ALL.filter((sp) => sp.level != null).map((sp, k) => {
    const lock = sp.den !== 'yes', low = sp.level > magic, miss = lock ? [] : missing(sp, s.supplies, wid), dim = lock || low || miss.length > 0, v = barValueOf(sp.id);
    const cost = Object.entries(sp.runes ?? {}).map(([k2, n]) => `${n} ${k2}${free.includes(k2) ? ' (staff)' : RUNES[k2] ? ` (${s.supplies?.[RUNES[k2].id] | 0})` : ''}`).join(', ');
    const tip = `${sp.name}${sp.level ? ` · Magic ${sp.level}` : ''}${sp.xp ? ` · ${sp.xp} xp` : ''}${sp.kind === 'attack' ? ` · max hit ${maxHitFor(sp, magic)}` : ''}${cost ? ` · ${cost}` : ''}${lock ? ` · locked: ${sp.lock ?? 'not yet'}` : low ? ' (level too low)' : miss.length ? ' (not enough runes)' : ' · drag to your bar' + (sp.kind === 'attack' ? ', right-click to autocast' : ', click to cast')}`;
    const pos = `-${(k % 16) * 26}px -${Math.floor(k / 16) * 24}px`;
    return `<button id="sb-${sp.id}" class="sbk" title="${esc(tip)}" ${lock ? '' : `draggable="true" ondragstart="hudDrag(event,'${v}',-1)"`} onclick="${lock ? '' : `hudBook('${sp.id}')`}" ${lock ? '' : `oncontextmenu="event.preventDefault();sendAction('menuAt',{k:'spell',id:'${sp.id}',x:event.clientX,y:event.clientY})"`} style="background-image:url('${SPELL_SHEET}');background-position:${pos};${dim ? 'filter:grayscale(.85) brightness(.6);cursor:default;' : ''}${sp.kind === 'attack' && s.cbSpell === sp.id ? 'box-shadow:inset 0 0 0 1px #ff981f;' : ''}"></button>`;
  }).join('');
  return `<div style="display:grid;grid-template-columns:repeat(7,26px);padding:1px 0 0 2px">${cells}</div>`;
}

function musicBody(ctx, player) { // the OSRS Music Player window (ospane-music.js): the den's one song, picked by the den keeper
  const cur = ctx?.place?.state?.song ?? 'auto', names = byId('song')?.opts ?? SONG_IDS, songs = SONG_IDS.map((id, i) => ({ id, name: names[i] ?? id, on: id === cur }));
  const tracks = SONG_IDS.filter((id) => id !== 'auto'), next = tracks[(tracks.indexOf(cur) + 1) % tracks.length];
  return osPane(musicPane, { songs, cur: songs.find((x) => x.on)?.name ?? 'Auto-Cycle', auto: cur === 'auto', keeper: !!player?.isEditor, next });
}
function questBody(s) { // the OSRS Quest List window (ospane-quest.js): the den's own quests, coloured by state
  const qs = s.quests ?? {}, ids = Object.keys(QUESTS);
  return osPane(questPane, { done: ids.filter((id) => qs[id] === 'done').length, total: ids.length,
    quests: ids.map((id) => ({ id, title: QUESTS[id].title, st: qs[id] === 'done' ? 'done' : qs[id] === 'active' ? 'active' : 'none',
      tip: `${QUESTS[id].title} (${qs[id] === 'done' ? 'complete' : qs[id] === 'active' ? 'in progress' : 'not started'}): ${QUESTS[id].objective}` })) });
}
function prayerBodyOS(s) { // the OSRS Prayer window (ospane-prayer.js)
  const lv = prayerLevel(s), st = normPrayer(s.prayer, lv), max = prayerMax(lv), left = secondsLeft(st);
  return osPane(prayerPane, { pts: st.pts, max, left: Number.isFinite(left) ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} of prayer left` : 'no prayer on',
    prayers: PRAYERS.map((p) => ({ id: p.id, name: p.name, on: st.on.includes(p.id), lock: p.level > lv,
      tip: `${p.name} (Prayer ${p.level})${p.note ? ': ' + p.note : ''} · one point lasts ${Math.round(PRAYER.tickSec * PRAYER.resistance / p.drain)} s${p.level > lv ? ' · locked' : ''}` })) });
}
function invBody(s) { // the OSRS inventory: 4 x 7 cells of 42 x 36, no slot boxes
  let cells = '';
  for (let i = 0; i < 28; i++) cells += `<div data-slot="${i}" style="width:42px;height:36px;display:flex;align-items:center;justify-content:center">${invCell(s, i, 34)}</div>`;
  return `<div style="display:grid;grid-template-columns:repeat(4,42px);grid-auto-rows:36px;padding:9px 0 0 16px">${cells}</div>`;
}
const NOTE = {
  friends: 'Friends List<br><span style="color:#fff">Friends live on Spawn\'s rail: open Chat on the right edge, then invite +.<br><br>Ignore: mute or block anyone from their ring: hold Tab, aim at them, press E.</span>',
  clan: 'Chat-channel<br><span style="color:#fff">Clan and group chat live on Spawn\'s rail: open Chat on the right edge.</span>',
  wynx: 'Call your Wynx<br><span style="color:#fff">Double-tap Space to whistle her down. E beside her climbs on.</span><br><br><button onclick="osView(null)" style="font:bold 11px \'Trebuchet MS\';color:#ff981f;background:#3e362a;border:1px solid #1a1612;padding:3px 12px;cursor:pointer">Back</button>',
};
function emotesBody() { // L or the tab: click a tile, the body plays it with its sound. creator 2026-10-06: back to the named text tiles (the figure pane, ospane-emotes.js, is kept unused)
  const t = EMOTES.map((e) => `<button title="${e.name}" onclick="sendAction('emote',{id:'${e.id}'})" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:46px;padding:0;background:#3e362a;border:1px solid #1c1812;border-radius:3px;box-shadow:inset 0 0 0 1px #5a4d3a;cursor:pointer;color:#ff981f;font:11px 'RuneScape Small','Trebuchet MS',sans-serif;text-shadow:1px 1px 0 #000"><span style="font-size:19px;line-height:20px">${e.icon ?? ''}</span>${e.name}</button>`).join('');
  return `<div class="hdr">Emotes <span style="color:#9a8f80;font-size:10px">(L)</span></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:3px;max-height:250px;overflow-y:auto">${t}</div>`;
}
export function osPanel(ctx, player, ui, tab, view) {
  try {
    const s = player?.state ?? {};
    const body = view === 'stats' ? eqStatsBody(s) : view === 'supplies' ? suppliesBody(s) : view === 'wynx' ? `<div class="note">${NOTE.wynx}</div>`
      : tab === 'emotes' ? emotesBody() : tab === 'inv' ? invBody(s) : tab === 'equip' ? equipBody(s) : tab === 'stats' ? statsBody(s, ui) : tab === 'music' ? musicBody(ctx, player) : tab === 'quests' ? questBody(s) : tab === 'prayer' ? prayerBodyOS(s)
      : tab === 'magic' ? spellBookBody(s) : tab === 'combat' ? combatBody(s)
      : NOTE[tab] ? `<div class="note">${NOTE[tab]}</div>` : '';
    // 3rd Person (creator 2026-10-09): the pack and the character sheet are whole windows of their own, standing where the panel stood
    const AT = 'right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px);bottom:calc(var(--spawn-safe-area-bottom,0px) + 100px)';
    if (kitOn(player) && !view && tab === 'inv') return backpack(s, AT);
    if (kitOn(player) && !view && tab === 'equip') return charSheet(ctx, player, AT);
    const tb = (t, i, row, js) => { const [x0, x1] = tabX(i + 1); return `<button class="ost" id="ost-${t.id}" title="${esc(t.title)}" onclick="${js}" style="left:${x0}px;top:${row === 'bot' ? PNL.botY : PNL.topY}px;width:${x1 - x0}px;height:${PNL.rowH}px"></button>`; };
    const bottomJs = { acct: 'osSheet()', logout: "hudToggle('gamemenu')", settings: "sendAction('options')" };
    const ti = TOP_TABS.findIndex((t) => t.id === tab), bi = BOT_TABS.findIndex((t) => t.id === tab);
    if (typeof document !== 'undefined') osPanelFeed(ti >= 0 ? { row: 'top', k: ti + 1 } : bi >= 0 ? { row: 'bot', k: bi + 1 } : { k: 0 });
    return `<div id="osp"><canvas id="ospc" width="${PNL.W}" height="${PNL.H}"></canvas>${TOP_TABS.map((t, i) => tb(t, i, 'top', `osTab('${t.id}')`)).join('')}`
      + BOT_TABS.map((t, i) => tb(t, i, 'bot', bottomJs[t.id] ?? `osTab('${t.id}')`)).join('')
      + `<div id="osp-in" data-tab="${esc(tab)}">${body}</div></div>`;
  } catch (e) { return ''; }
}

// ---- the chat box, bottom left (creator 2026-10-06): the reference's parchment log and stone tabs. Spawn's composer (Enter) still types;
// the box paints what the den heard (place.state.chatLog). Tabs filter it; Private and Clan are Spawn's own, so they point there.
const CHAT_TABS = [['all', 'All'], ['game', 'Game'], ['pub', 'Public'], ['priv', 'Private'], ['chan', 'Channel'], ['clan', 'Clan'], ['trade', 'Trade']];
const CHAT_NOTE = {
  priv: 'Private messages live in Spawn\'s chat: open Chat on the right rail, then Messages.',
  chan: 'Channel is your Spawn party: open Chat on the right rail, then Party.',
  clan: 'Clan chat is your Spawn guild: open Chat on the right rail, then Guild.',
  report: 'To report someone: hold Tab, aim at them, press E, then Report. Spawn\'s team reviews it.',
};
// 1:1 with the OSRS chatbox (creator 2026-10-06, /cdn/image-u688on3tq.webp): 519x173, flat parchment, square stone frame, 8 stone buttons
export const OS_CHAT_CSS = `<style>
#osch{position:fixed;left:8px;bottom:calc(var(--spawn-safe-area-bottom,0px) + 8px);width:519px;height:165px;z-index:58;font:16px/16px 'RuneScape UF','RuneScape Plain 12','Runescape Chat',Tahoma,Verdana,sans-serif;-webkit-font-smoothing:none;font-smooth:never;pointer-events:auto;user-select:none}
#osch .pa{position:absolute;left:0;top:0;width:519px;height:142px;box-sizing:border-box;background:#d6c9a6 linear-gradient(180deg,rgba(255,250,230,.18),rgba(120,100,60,.08));border:1px solid #625849;box-shadow:inset 0 0 0 1px #8f8268,inset 0 0 0 2px #b7a885}
#osch .pa::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.35;background:radial-gradient(ellipse at 30% 40%,rgba(255,250,235,.5),transparent 60%),radial-gradient(ellipse at 80% 70%,rgba(150,125,85,.35),transparent 55%)}
#osch .log{position:absolute;left:6px;top:4px;right:24px;bottom:23px;overflow-y:auto;display:flex;flex-direction:column-reverse;scrollbar-width:none;color:#000;text-shadow:none}
#osch .log::-webkit-scrollbar{display:none}
#osch .ln{white-space:pre-wrap;word-break:break-word;padding:0 1px;min-height:16px}
#osch .ln .pub{color:#0000ff}#osch .ln .tr{color:#800080}#osch .ln.sv{color:#7f0000}#osch .ln .sn{color:#0000ff}#osch .ln.gm{color:#000}#osch .ln.nt{color:#7f0000}
#osch .bar{position:absolute;left:4px;right:22px;bottom:3px;height:17px;border-top:1px solid #807660;color:#000;padding:1px 2px 0;overflow:hidden;white-space:nowrap;cursor:text}
#osch .bar i{color:#0000ff;font-style:normal}
#osch .sc{position:absolute;right:3px;top:3px;bottom:3px;width:16px;background:#4a4134;box-shadow:inset 0 0 0 1px #2c261d}
#osch .sc b{position:absolute;left:0;right:0;height:16px;background:linear-gradient(#5c5242,#40382c);box-shadow:inset 0 0 0 1px #2c261d,inset 1px 1px 0 #786a52;color:#c9bc9a;font:8px/16px Verdana,sans-serif;text-align:center;cursor:pointer}
#osch .sc i{position:absolute;left:1px;right:1px;top:16px;bottom:16px;background:#3a3329}
#osch .sc u{position:absolute;left:1px;right:1px;bottom:16px;height:40%;min-height:14px;background:linear-gradient(90deg,#5f5545,#6d6250 50%,#544a3b);box-shadow:inset 0 0 0 1px #2c261d}
#osch .tabs{position:absolute;left:0;top:142px;width:519px;height:31px;box-sizing:border-box;display:flex;gap:3px;padding:3px 4px 2px;background:#3e3529;border:1px solid #1e1a14;border-top:0}
#osch .tb{flex:0 0 56px;height:26px;border:0;padding:0;cursor:pointer;border-radius:3px;background:linear-gradient(#5a5040,#423a2e 55%,#382f24);box-shadow:inset 0 0 0 1px #17130e,inset 1px 1px 0 #75674f,inset -1px -1px 0 #2a241b;color:#fff;font:11px/11px 'RuneScape Small','RuneScape UF',Tahoma,Verdana,sans-serif;text-shadow:1px 1px 0 #000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
#osch .tb.all{flex-basis:56px;font-size:13px}
#osch .tb small{font-size:11px;line-height:11px;color:#00ff00}
#osch .tb small.off{color:#ff0000}
#osch .tb.on{background:linear-gradient(#73654c,#584b37 55%,#4a3f2f);box-shadow:inset 0 0 0 1px #17130e,inset 1px 1px 0 #a08c66}
#osch .tb:hover:not(.on){filter:brightness(1.18)}
#osch .rep{margin-left:auto;flex:0 0 78px;background:linear-gradient(#9a2a22,#7a1c16 55%,#661410);box-shadow:inset 0 0 0 1px #2a0806,inset 1px 1px 0 #c0463e;font-size:13px}
#osch canvas{display:block;width:519px;height:165px;image-rendering:pixelated;cursor:default}
@media (pointer:coarse),(hover:none){#osch{display:none}}
@media (max-width:1100px){#osch{transform:scale(.8);transform-origin:bottom left}}
</style>`;
// creator 2026-10-06: every name in the chat box shows each word capitalised, OSRS-style (forge_wizard_34 → Forge_Wizard_34); display only, the Spawn name itself is untouched
const EVERY_TAB = new Set(['camptons_world', 'zezima', 'forge_wizard_34']); // speakers whose lines show in every chat tab
const capName = (n) => String(n ?? '').replace(/(^|[\s_\-.])([a-z])/g, (m, a, c) => a + c.toUpperCase());
const NOTE_AT = {}; // this machine's session: when each tab note first showed (a reload/login starts it fresh)
export function osChat(ctx, player, tab = 'all', note = '', mine = []) {
  try {
    const F = player?.state?.chatFilter !== false ? starChat : (x) => x; // O → Player: strict 2007 filter, this viewer's own copy
    const log = Array.isArray(ctx.place?.state?.chatLog) ? ctx.place.state.chatLog : [];
    const base0 = { all: () => true, game: (r) => r.k === 'game' || r.k === 'savi', pub: (r) => r.k === 'pub' || r.k === 'savi' || r.k === 'bot', trade: (r) => r.k === 'trade' }[tab] ?? (() => false);
    const everyTab = (r) => (r.k === 'pub' || r.k === 'trade') && EVERY_TAB.has(String(r.n ?? '').toLowerCase()); // creator 2026-10-06: Campton's lines land in every tab (Public, Private, Channel, Clan, Trade, Game)
    const show0 = (r) => everyTab(r) || base0(r);
    const botsOn = settingOf(player?.state, 'barrensChat') !== false, show = (r) => (r.k === 'bot' && !botsOn ? false : show0(r)); // Barrens chatter: All + Public; O → Chat 'barrensChat' off hides it for this viewer
    const nk = note || tab, msg = note ? CHAT_NOTE[note] : CHAT_NOTE[tab];
    if (msg && NOTE_AT[nk] == null) NOTE_AT[nk] = typeof ctx.now === 'function' ? ctx.now() : 0; // creator 2026-10-06: a tab's note shows once per login, where it first appeared, not after every line
    const I = OS_INK, ps = player?.state, tsOn = settingOf(ps, 'chatTime') === 1, pubCol = settingOf(ps, 'colPublic') === 1 ? I.black : I.blue, trCol = settingOf(ps, 'colTrade') === 1 ? '#800080' : I.trade; // O menu → Chat
    const ts = (r) => (tsOn && r.w ? chatStamp(r.w) : '');
    const nowMs = typeof ctx.now === 'function' ? ctx.now() : 0, seen = new Set((Array.isArray(mine) ? mine : []).map((r) => r && r.k + '|' + r.at + '|' + r.t)); // chat wire lane 6: this player's own sent private lines + a refused-send notice
    const own = (Array.isArray(ps?.osMine) ? ps.osMine : []).filter((r) => r && r.k === 'pm' && !seen.has('pm|' + r.at + '|' + r.t));
    const hist = ps?.osHist && typeof ps.osHist === 'object' ? [...(Array.isArray(ps.osHist.guild) ? ps.osHist.guild : []), ...(Array.isArray(ps.osHist.party) ? ps.osHist.party : [])].filter((r) => r && (r.k === 'clan' || r.k === 'chan')) : []; // Clan/Channel tabs: Spawn's guild/party lines (scripts/os-chat-history.js)
    mine = [...(Array.isArray(mine) ? mine : []), ...own, ...hist];
    const errRow = ps?.osSayErr && ps.osSayErr.t && nowMs - (ps.osSayErr.at ?? 0) <= 8000 ? { k: 'game', t: String(ps.osSayErr.t) } : null;
    const src = [/* 2026-10-09 campton: no RuneScape welcome line */ ...(mine.length ? mine.reduce((acc, m) => { const at = m?.at ?? 0; let i = acc.length; while (i > 0 && (acc[i - 1].at ?? 0) > at) i--; acc.splice(i, 0, m); return acc; }, [...log]) : log)] /* OSRS order (creator 2026-10-07): the log is never re-sorted; own rows slot in by time */;
    if (msg) { const nAt = NOTE_AT[nk]; let i = src.length; while (i > 1 && (src[i - 1].at ?? 0) > nAt) i--; src.splice(i, 0, { k: 'note', t: msg, at: nAt }); }
    const rows = src.filter((r) => r.k === 'note' || (r.k === 'pm' ? tab === 'all' || tab === 'priv' : r.k === 'clan' || r.k === 'chan' ? tab === r.k : show(r))).slice(-60).map((r) =>
      r.k === 'note' ? [[r.t, I.black]]
      : r.k === 'clan' || r.k === 'chan' ? [[ts(r) + '[' + (r.k === 'clan' ? 'Clan' : 'Channel') + '] ' + capName(r.n) + ': ', I.black], [r.t, '#7f0000']]
      : r.k === 'pm' ? [[ts(r) + 'To ' + capName(r.n) + ': ', I.black], [r.t, I.priv ?? '#00ffff']]
      : r.k === 'game' ? [[ts(r) + r.t, I.black]]
      : r.k === 'savi' ? [[ts(r) + capName(r.n || 'Savi') + ': ', I.black], [r.t, I.savi]]
      : r.k === 'bot' ? [[ts(r) + capName(r.n) + ': ', I.bot], [F(r.t), pubCol]]
      : Object.assign([[ts(r) + capName(r.n) + ': ', I.black], [F(r.t), r.k === 'trade' ? trCol : pubCol]], r.art ? { art: true } : {}));
    if (errRow) { rows.push([[errRow.t, I.black]]); if (rows.length > 60) rows.shift(); }
    if (kitOn(player)) { osScaleFeed(settingOf(ps, 'uiScale') | 0); return kitChat(rows, tab, capName(player?.displayName), settingOf(ps, 'chatBg')); }
    if (typeof document !== 'undefined') osCanvasFeed(rows, tab, capName(player?.displayName), (id) => { try { osChatPick(id); } catch (e) {} }, () => { try { osChatSay('report'); } catch (e) {} });
    const us = settingOf(ps, 'uiScale') | 0, uf = settingOf(ps, 'uiFilter') | 0; // O menu → Display: the interface size and how its pixels are scaled
    osScaleFeed(us); // the shared size for every OSRS window: Auto fits the window and refits live
    const SS = '#osch{transform:scale(var(--ospk,1));transform-origin:bottom left}' + (uf ? '#osch canvas{image-rendering:auto}' : '');
    return OS_CHAT_CSS + (SS ? `<style>${SS}</style>` : '') + '<div id="osch"><canvas id="oscv" width="519" height="165"></canvas></div>';
  } catch (e) { return ''; }
}

// ======== 3rd Person (gold kit, creator 2026-10-09): chat and minimap re-themed in the dark slate + beveled gold of the action bar.
// Same data, same actions as the OSRS path above: the chat's lines become live DOM text (crisp serif, 1px black stroke), its tabs call
// osChatPick/osChatSay, its .log and .sc u are the ones ui.js already scrolls (wheel, osThumb, osRestore).
const KT = "font-family:Georgia,'Times New Roman',serif;-webkit-font-smoothing:antialiased;-webkit-text-stroke:.35px #000;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000";
const KIT_INK = { '#000000': '#e6e6e6', '#0000ff': '#aaaaff', '#7f0000': '#ff4040', '#800080': '#dda0dd', '#00ffff': '#40c040' }; // WoW: say white, party blue, yell red, whisper pink, guild green
const kesc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const K = 'body:has(#h4-root.kit)';
const KIT_CHAT_CSS = `<style>
${K} #osch.kch{width:500px;height:214px;font:14px/18px Georgia,serif;-webkit-font-smoothing:antialiased;color:#f2e6cf}
${K} #osch.kch .ktabs{position:absolute;left:14px;right:14px;top:0;height:24px;display:flex;gap:1px;align-items:flex-end}
${K} #osch.kch .ktb{flex:0 0 58px;height:22px;border:0;padding:2px 0 0;cursor:pointer;background:url('${UIK['chat-tab-off']}') center/100% 100% no-repeat;color:#f2e6cf;font:13px/18px Georgia,serif;${KT}}
${K} #osch.kch .ktb.on{flex-basis:62px;height:24px;background-image:url('${UIK['chat-tab-on']}');color:#e8c46a;z-index:1}
${K} #osch.kch .ktb:hover:not(.on){filter:brightness(1.25)}
${K} #osch.kch .ktb.krep{margin-left:auto;flex-basis:62px;background-image:url('${UIK['chat-tab-dim']}');color:#ff9a86}
${K} #osch.kch .kpa{position:absolute;left:0;right:0;top:22px;bottom:36px;background:url('${UIK['chat-frame']}') center/100% 100% no-repeat}
${K} #osch.kch .log{left:20px;top:14px;right:40px;bottom:14px;color:#f2e6cf;${KT}}
${K} #osch.kch .kl{white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:18px;min-height:18px;flex:none}
${K} #osch.kch .kl b{font-weight:normal;color:#e8c46a}
${K} #osch.kch .sc{right:14px;top:12px;bottom:12px;width:20px;background:linear-gradient(90deg,#14171a,#252a2f 50%,#14171a);box-shadow:inset 0 0 0 1px #000,0 0 0 1px #8a6a32}
${K} #osch.kch .sc b{height:16px;background:url('${UIK['chat-scroll']}') top/20px auto no-repeat;box-shadow:none;color:transparent}
${K} #osch.kch .sc b.dn{bottom:0;background-position:bottom}
${K} #osch.kch .kpa::before{content:'';position:absolute;left:12px;top:10px;right:12px;bottom:10px;border-radius:3px;background:rgba(12,14,18,var(--kcbg,.72));box-shadow:inset 0 0 0 1px rgba(58,50,36,.9),inset 0 2px 8px rgba(0,0,0,.6);pointer-events:none}
${K} #osch.kch .sc u{left:2px;right:2px;border-radius:3px;background:linear-gradient(90deg,#8a6a32,#f0d48a 45%,#b8893c);box-shadow:inset 0 0 0 1px #3a2a12}
${K} #osch.kch .kin{position:absolute;left:4px;right:4px;bottom:0;height:34px;border-radius:4px;background:linear-gradient(#3a3226,#241e16);box-shadow:inset 0 0 0 1px #8a6a32,inset 0 0 0 2px #1a140c;cursor:text} /* 2026-10-09 campton: no lock icon */
${K} #osch.kch .kin span{position:absolute;left:6px;right:12px;top:6px;bottom:6px;padding:0 8px;background:#15181b;border-radius:2px;white-space:nowrap;overflow:hidden;font:14px/22px Georgia,serif;color:#9cc8ff;${KT}}
${K} #osch.kch .kin span b{font-weight:normal;color:#e8c46a}
</style>`;
function kitChat(rows, tab, who, bg) {
  const tabs = OSCV_K.OS_CANVAS_TABS.map(([id, n]) => `<button id="kct-${id}" class="ktb${id === tab ? ' on' : ''}" onclick="osChatPick('${id}')">${n}</button>`).join('') + `<button id="kct-rep" class="ktb krep" onclick="osChatSay('report')">Report</button>`;
  const lines = rows.slice().reverse().map((r) => `<div class="kl">${r.map(([t, c], i) => { const col = KIT_INK[String(c).toLowerCase()] ?? c; return i === 0 && r.length > 1 ? `<b>${kesc(t)}</b>` : `<span style="color:${col}">${kesc(t)}</span>`; }).join('')}</div>`).join('');
  const inTxt = typeof OSCV_K.kitInputText === 'function' ? OSCV_K.kitInputText() : 'Press Enter to Chat...';
  const up = "const l=this.closest('#osch').querySelector('.log');l.scrollTop-=", tail = ';event.stopPropagation()';
  return OS_CHAT_CSS + KIT_CHAT_CSS + ctxMenuCss + `<style>#osch{transform:scale(var(--ospk,1));transform-origin:bottom left}</style>`
    + `<div id="osch" class="kch" style="--kcbg:${(Math.max(50, Math.min(100, +bg || 72)) / 100).toFixed(2)}"><div class="ktabs">${tabs}</div><div class="kpa"><div class="log">${lines}</div>`
    + `<div class="sc"><b class="up" title="Scroll up" onclick="${up}54${tail}"></b><u></u><b class="dn" title="Scroll down" onclick="${up}-54${tail}"></b></div></div>`
    + `<div class="kin"><span><i id="osch-kin" style="font-style:normal">${kesc(inTxt)}</i></span></div></div>`;
}
// the minimap: the same map picture clipped to a circle in mm-ring's hole (hole centre 216,174, r 110 of 420x401; drawn at .62),
// the live zone name on mm-ribbon, the N diamond turning with the camera like the OSRS compass, and the OSRS buttons as kit nodes/orbs
const RS = 0.62, RW = 420 * RS, RH = 401 * RS, HX = 216.5 * RS, HY = 174.5 * RS, HR = 110 * RS, OC = 46;
const KIT_MM_CSS = `<style>
${K} #osmm.kmm{width:${(RW + OC).toFixed(0)}px;height:${(RH + 4).toFixed(0)}px;font-family:Georgia,serif;-webkit-font-smoothing:antialiased}
${K} #osmm.kmm .kring{position:absolute;left:${OC}px;top:0;width:${RW.toFixed(1)}px;height:${RH.toFixed(1)}px}
${K} #osmm.kmm .map{left:${(HX - HR).toFixed(1)}px;top:${(HY - HR).toFixed(1)}px;width:${(HR * 2).toFixed(1)}px;height:${(HR * 2).toFixed(1)}px;box-shadow:inset 0 0 14px rgba(0,0,0,.7);pointer-events:auto}
${K} #osmm.kmm .kimg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
${K} #osmm.kmm .krib{position:absolute;left:${(108 * RS - 5).toFixed(1)}px;top:-3px;width:${(203 * RS + 10).toFixed(1)}px;height:33px;background:url('${UIK['mm-ribbon']}') center/100% 100% no-repeat;text-align:center;font:13px/30px Georgia,serif;color:#e8c46a;white-space:nowrap;overflow:hidden;${KT}}
${K} #osmm.kmm .kn{position:absolute;width:34px;height:32px;margin:-16px 0 0 -17px;background:url('${UIK['mm-n']}') center/100% 100% no-repeat;filter:drop-shadow(0 2px 2px #000)}
${K} #osmm.kmm .knode{position:absolute;border:0;padding:0;background:center/100% 100% no-repeat;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 2px 2px #000)}
${K} #osmm.kmm .knode:hover{filter:brightness(1.25) drop-shadow(0 2px 2px #000)}
${K} #osmm.kmm .kclk{cursor:default;pointer-events:auto;text-align:center;font:12px/12px Georgia,serif;color:#f2e6cf;${KT}}
${K} #osmm.kmm .kclk em{position:absolute;left:-6px;right:-6px;bottom:-12px;font-style:normal}
${K} #osmm.kmm .korb{position:absolute;left:4px;width:36px;height:36px;border-radius:50%;border:0;padding:0;overflow:hidden;pointer-events:auto;cursor:pointer;background:#111417;box-shadow:0 0 0 2px #000,0 0 0 4px #b8893c,0 0 0 5px #3a2a12,0 3px 6px 5px rgba(0,0,0,.45)}
${K} #osmm.kmm .korb i{position:absolute;left:0;right:0;bottom:0;opacity:.85}
${K} #osmm.kmm .korb span{position:relative;font:14px/36px Georgia,serif;color:#f2e6cf;${KT}}
${K} #osmm.kmm .korb:hover{filter:brightness(1.2)}
${K} #osmm.kmm .kimg{image-rendering:auto;-webkit-user-drag:none}
${K} #osmm.kmm .kcd{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;display:flex;align-items:center;justify-content:center;pointer-events:none;font:700 15px/1 Marcellus,Georgia,serif!important;color:#f0d48a;text-shadow:0 1px 0 #000,0 0 3px #000,0 2px 4px rgba(0,0,0,.9);-webkit-text-stroke:0!important}
${K} #osmm.kmm .korb span,${K} #osmm.kmm .kclk em,${K} #osmm.kmm .krib{-webkit-text-stroke:0!important;text-shadow:0 1px 0 #000,0 0 2px #000,1px 2px 3px rgba(0,0,0,.95)!important;font-variant-numeric:tabular-nums}
${K} #osmm.kmm .korb span{display:block;width:100%;text-align:center;font:700 14px/36px Marcellus,Georgia,serif!important;color:#fff}
${K} #osmm.kmm .kclk em{font:700 12px/12px Marcellus,Georgia,serif!important;color:#f5e2b3;text-align:center}
${K} #osmm.kmm .krib{font:700 13px/30px Marcellus,Georgia,serif!important;color:#f0d48a!important}
${K} #osmm.kmm .mmz{display:flex;align-items:center;justify-content:center;padding:0;font:700 16px/1 Arial,sans-serif!important;-webkit-text-stroke:0}
</style>`;
function kitMinimap(ctx, player, o) {
  const { f, M, px, py, yaw, hp, hpMax, pry, runPct, runOn, clock, xpOn } = o;
  const pl = ctx.place?.id ?? ctx.self?.place ?? 'main';
  let zone = '';
  try { zone = pl === 'main' || !pl ? zoneOf(f.x, f.z, liveZones(ctx.world?.state))?.name ?? '' : String(pl).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); } catch (e) {}
  const a = (-(yaw || 0)) * Math.PI / 180, nr = HR + 9, nx = HX + Math.sin(a) * nr, ny = HY - Math.cos(a) * nr;
  const orb = (t, js, y, pct, col, v) => `<button class="korb" title="${kesc(t)}" onclick="${js}" style="top:${y}px"><i style="height:${Math.max(0, Math.min(100, pct)).toFixed(0)}%;background:linear-gradient(${col},#000a)"></i><span>${v}</span></button>`;
  const node = (cls, img, t, js, x, y, w, h, ctxm) => `<button class="knode ${cls}" title="${kesc(t)}" onclick="${js}"${ctxm ? ` oncontextmenu="${ctxm};return false"` : ''} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background-image:url('${UIK[img]}')"></button>`;
  const hh = clock ? clock.split(' ')[0] : '';
  return KIT_MM_CSS + `<div id="osmm" class="kmm">`
    + MMV_CSS + `<div class="kring"><div class="map" title="${kesc(clock)}"><canvas id="osmmv" width="273" height="273"></canvas></div>`
    + `<img class="kimg" src="${UIK['mm-ring2'] ?? UIK['mm-ring']}" alt=""><b class="kcd" style="left:${(42.5 * RS).toFixed(1)}px;top:${(180 * RS).toFixed(1)}px">W</b><b class="kcd" style="left:${(382.5 * RS).toFixed(1)}px;top:${(180 * RS).toFixed(1)}px">E</b>`
    + `<div class="krib">${kesc(zone || 'Mellowbrook')}</div>`
    + `<i class="kn" style="left:${nx.toFixed(1)}px;top:${ny.toFixed(1)}px;transform:rotate(${(-(yaw || 0)).toFixed(1)}deg)"></i>`
    + (clock ? `<div class="knode kclk" title="${kesc(clock)}" style="left:${(RW - 54).toFixed(0)}px;top:2px;width:52px;height:42px;background-image:url('${UIK['mm-clock']}')"><em>${kesc(hh)}</em></div>` : '')
    + `</div>` + mmZoomBtns(o.zi, 'kit') + `</div>`;
}
