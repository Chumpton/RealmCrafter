// GOAL4-S1 W4 (bar lane) · WOW-HUD: the double action bar, bottom-centre on the stone backplate (#nh-dock, ui.js).
// Bottom row = slots 0..9 (keys 1..0), top row = slots 10..19 (Shift+1..Shift+0, page keydown in ui.js; also clickable).
// A thin XP strip runs across the top of the plate: the tracked skill (Skills window pin), else Woodcutting.
// Contract: actionBar(ctx, player, ui, open, pick) -> HTML string, never throws. open = the open window ids (array). ui is norm()ed by ui.js.
// Read only: never writes state (s.fight stays combat-player's). Clicks call ui.js page globals only:
// hudToggle(id) (window, machine-local), hudPick(i) (slot picker), hudAssign(i, value) (the one uiSet path).
import { BUILD, UI4, WINDOWS, BAR_KEYS, BAR_N, isWin } from '../../scripts/lib/data/windows.js';
import { weaponOf, styleOf, attackTicks } from '../../scripts/lib/combat-core.js';
import { SKILL_LIST } from '../../scripts/lib/data/skills.js';
import { progress } from '../../scripts/lib/skills-core.js';
import { CB } from '../../scripts/lib/data/combat.js';
import { spellOfBar as spellOfBarAny, isOldSpell } from '../../scripts/lib/data/spellbook.js';
// L2 (2026-10-05): the six old spells are gone from the HUD; a slot still holding one draws empty
const spellOfBar = (v) => { const sp = spellOfBarAny(v); return sp && !isOldSpell(sp.id) ? sp : null; };
import { runeText } from '../../scripts/lib/data/spells.js';
import { missing } from '../../scripts/lib/magic-core.js';
import { spellIcon } from './panes.js';
import { levelOf } from '../../scripts/lib/skills-core.js';
import { esc } from '../../scripts/lib/esc.js';
import { UIK } from '../../scripts/lib/data/ui-kit.js';
import { kitOn } from './skin.js';
// 3rd Person skin (creator 2026-10-09, Options → Interface style): kit art only when kitOn(player); the OSRS path below is untouched.
const KIMG = (n) => `<img src="${UIK[n]}" alt="" style="position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);object-fit:cover;border-radius:2px;pointer-events:none;image-rendering:auto">`;
const KIT_CSS = `<style>
#hud-bar .h4-row{border:10px solid #8a6a32;border-image:var(--kit-ns) 32 / 10px stretch;background:linear-gradient(#2c3138,#1b1e23 60%,#15171b) padding-box;box-shadow:inset 0 1px 0 #ffffff14,0 4px 14px #000b;padding:3px 4px;image-rendering:auto}
#nh-dock #hud-bar .h4-slot,#hud-bar .h4-slot{background:linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box!important;border:1px solid transparent!important;border-radius:3px!important;box-shadow:none!important;image-rendering:auto}
#hud-bar .h4-slot:hover{filter:brightness(1.2)}
#nh-dock #hud-bar .h4-slot.on{box-shadow:0 0 7px 1px rgba(240,207,138,.85)!important}
#hud-bar .h4-slot>span[style*="inset:0"],#hud-bar #bar-attack{inset:3px!important;border-radius:2px;overflow:hidden}
#hud-bar .h4-sweep{inset:0!important}
#nh-dock #hud-bar .h4-key{background:none!important;font:700 9px/10px 'Cinzel',Georgia,serif!important;color:#f2e6cf!important;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000!important;top:3px!important;left:3px!important}
#nh-dock #hud-xp.kx{top:-17px!important;left:0!important;right:0!important;height:13px!important;background:linear-gradient(#2a2318,#15110b)!important;border:0!important;border-radius:3px!important;box-shadow:inset 0 0 0 1px #b8893c,inset 0 0 0 2px #1a140c!important;image-rendering:auto} /* creator 2026-10-09: plain, hotbar-wide */
#hud-xp.kx>.kx-in{position:absolute;left:3px;right:3px;top:3px;bottom:3px;background:#0d0816;border-radius:2px;overflow:hidden;pointer-events:none}
#hud-xp.kx>.kx-in>i{display:block;height:100%;background:url(${UIK['fill-xp']}) 0 0/100% 100%;box-shadow:0 0 6px rgba(170,90,255,.6);transition:width .35s ease-out}
#hud-xp.kx>.kx-in>b{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(5% - 1px),rgba(201,162,74,.28) calc(5% - 1px),rgba(201,162,74,.28) 5%)}
#nh-dock #hud-xp.kx>span{font:700 10px/1 'Cinzel',Georgia,serif!important;color:#f2e6cf!important;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000!important}
</style>`;

const C = { walnut: '#4f3828', honey: '#ba8950', linen: '#f2e6cf', ink: '#2a1d13' };
const SZ = 38, GAP = 2, ROW = 10;
const ATTACK_TITLE = 'Attack: cooldown shows here; click enemies to fight';
const SWORDS = '⚔';
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// integer percent of the attack cooldown still to run; 0 = no sweep. Reads s.fight.cd, never writes it.
function sweepPct(s) {
  const cd = num(s?.fight?.cd);
  if (cd <= 0) return 0;
  const w = weaponOf(s.cbWeapon), ticks = num(attackTicks(w, styleOf(w, s.cbStyle))) || 1;
  return Math.max(1, Math.min(100, Math.ceil(cd / ticks * 100)));
}
// the XP strip: { name, level, pct, toNext }
function xpOf(s, track) {
  const k = SKILL_LIST.find((x) => x.id === track) ?? SKILL_LIST.find((x) => x.id === 'woodcutting') ?? SKILL_LIST[0];
  const p = progress(k.id === 'hitpoints' ? (s.skills?.hitpoints ?? CB.hpStartTenths) | 0 : (s.skills?.[k.id] | 0));
  const level = Math.round(num(p.level)), pct = level >= 99 ? 100 : Math.round(Math.max(0, Math.min(1, num(p.pct))) * 1000) / 10;
  return { name: k.name, icon: k.icon, level, pct, toNext: Math.ceil(num(p.toNext)) };
}

function picker(i) {
  const V = `data-v="${BUILD}"`;
  const row = (label, value) => `<div ${V} onclick="hudAssign(${i},'${value}')" onmouseover="this.style.background='rgba(186,137,80,.28)'" onmouseout="this.style.background=''" style="padding:4px 10px;cursor:pointer;white-space:nowrap;font-size:13px;line-height:1.3;color:${C.linen}">${esc(label)}</div>`;
  const left = (i % ROW) * (SZ + GAP), top = i >= ROW;
  return `<div ${V} id="bar-picker" class="h4-plate" style="position:absolute;left:${left}px;bottom:${top ? 2 * SZ + GAP + 8 : SZ + 8}px;min-width:110px;padding:4px 0;font-family:'Cinzel',Georgia,serif;color:${C.linen};z-index:6">`
    + row(`${SWORDS} Attack`, 'attack')
    + row('🔥 Campfire', 'campfire')
    + `<div ${V} onclick="hudPickSpell(${i})" onmouseover="this.style.background='rgba(186,137,80,.28)'" onmouseout="this.style.background=''" style="padding:4px 10px;cursor:pointer;white-space:nowrap;font-size:13px;line-height:1.3;color:#c9a0ff">✨ Choose a spell…</div>`
    + Object.values(WINDOWS).map((w) => row(`${w.rune} ${w.title}`, w.id)).join('')
    + row('Clear', '') + `</div>`;
}

function slot(i, v, open, firstAttack, pct, fb, kit) {
  const V = `data-v="${BUILD}"`;
  const dnd = `ondragover="event.preventDefault()" ondrop="hudDrop(event,${i})"` + (v ? ` draggable="true" ondragstart="hudDrag(event,'${v}',${i})"` : '');
  const kl = i >= ROW ? 's' + String(BAR_KEYS[i] ?? '').slice(-1) : String(BAR_KEYS[i] ?? '');
  const key = `<span ${V} class="h4-key">${esc(kl)}</span>`;
  const drop = `<button ${V} class="h4-x" title="Change slot" onclick="event.stopPropagation();hudPick(${i})" style="position:absolute;right:1px;bottom:1px;width:13px;height:13px;padding:0;font-size:9px;line-height:11px;cursor:pointer;z-index:2">▾</button>`;
  const base = `position:relative;width:${SZ}px;height:${SZ}px;box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;font-family:'Cinzel',Georgia,serif;color:${C.linen}`;
  if (isWin(v)) {
    const w = WINDOWS[v], on = open.includes(v);
    return `<div ${V} id="bar-${i}" ${dnd} class="h4-slot${on ? ' on' : ''}" title="${esc(w.title)}" onclick="hudToggle('${w.id}')" style="${base}">`
      + `<span ${V} style="font-size:22px;line-height:1;pointer-events:none;color:${on ? C.honey : C.linen};text-shadow:1px 1px 0 ${C.ink}">${esc(w.rune)}</span>${key}${drop}</div>`;
  }
  const sp = spellOfBar(v);
  if (sp) {
    const timed = sp.kind === 'attack' || sp.kind === 'curse', dur = timed ? 3000 : sp.cd * 1000; // an attack spell or curse takes 5 ticks (combat-player.js castAt)
    const left = Math.max(0, timed ? num(fb?.castAt) - num(fb?.now) : num(fb?.cd?.[sp.id]) - num(fb?.now));
    const shade = left > 0 ? `<i ${V} style="position:absolute;left:0;right:0;bottom:0;height:100%;background:rgba(20,12,6,.72);pointer-events:none;animation:h4fbcd ${dur}ms linear ${left - dur}ms forwards"></i>` : '';
    const dim = num(fb?.magic) < sp.level || (fb?.short ?? []).includes(sp.id);
    return `<div ${V} id="bar-${i}" ${dnd} class="h4-slot" title="${esc(sp.name)}: ${runeText(sp)}${sp.line ? ' · ' + esc(sp.line) : ''}" onclick="hudCast('${sp.id}')" style="${base}">${spellIcon(sp, SZ, dim)}${fb?.dist > (sp.range ?? 20) ? `<i ${V} class="wow-oor"></i>` : ''}${shade}${key}${drop}</div>`;
  }
  if (v === 'campfire') { // creator 2026-10-06: pitch a campfire with benches (scripts/campfire-player.js)
    return `<div ${V} id="bar-${i}" ${dnd} class="h4-slot" title="Campfire: a fire and log benches ahead of you; burns out after 20 s with nobody sitting" onclick="sendAction('campfire')" style="${base}">`
      + (kit ? KIMG('spell-axe-fire') : `<span ${V} style="font-size:21px;line-height:1;pointer-events:none;filter:drop-shadow(1px 1px 0 ${C.ink})">🔥</span>`) + `${key}${drop}</div>`;
  }
  if (v === 'attack') {
    const sweep = firstAttack && pct > 0
      ? `<i ${V} class="h4-sweep sweep" style="position:absolute;inset:0;pointer-events:none;background:conic-gradient(rgba(20,12,6,.72) 0 ${pct}%, transparent ${pct}% 100%)"></i>` : '';
    // slot ids stay bar-0..bar-19; the first attack slot's face is #bar-attack, so `#bar-attack .sweep` reads the sweep
    const face = `<div ${V}${firstAttack ? ' id="bar-attack"' : ''} style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">`
      + (kit ? KIMG('spell-blue-sword') : `<span ${V} style="font-size:20px;line-height:1;color:${C.linen};text-shadow:1px 1px 0 ${C.ink}">${SWORDS}</span>`) + `${sweep}</div>`;
    return `<div ${V} id="bar-${i}" ${dnd} class="h4-slot${firstAttack ? '' : ' slot-attack'}" title="${ATTACK_TITLE}" style="${base}">${face}${key}${drop}</div>`;
  }
  return `<div ${V} id="bar-${i}" ${dnd} class="h4-slot h4-empty" title="Empty: click to choose" onclick="hudPick(${i})" style="${base}">${key}</div>`;
}

// WOW SKIN: metres from you to your locked / fought target (0 when none), for the out-of-range red on spell slots
function tgtDist(ctx, player, s) {
  try { const id = s.fight?.target ?? s.lock; if (!id) return 0; const t = ctx.getObject?.(id)?.feetPosition, f = ctx.self?.feetPosition ?? player?.feetPosition;
    return t && f ? Math.hypot(t.x - f.x, t.z - f.z) : 0; } catch (e) { return 0; }
}
let mk = null, mh = '';
export function actionBar(ctx, player, ui, open, pick) {
  try {
    if (!UI4.frames) return '';
    const s = player?.state ?? {};
    const bar = Array.isArray(ui?.bar) ? ui.bar : [];
    const vals = []; for (let i = 0; i < BAR_N; i++) vals.push(typeof bar[i] === 'string' ? bar[i] : '');
    const ow = (Array.isArray(open) ? open : [open]).filter(isWin);
    const pk = Number.isInteger(pick) && pick >= 0 && pick < BAR_N ? pick : -1;
    const first = vals.indexOf('attack');
    const pct = first >= 0 ? sweepPct(s) : 0;
    const xp = xpOf(s, ui?.track || s.lastXp);
    const fb = { now: num(ctx?.now?.() ?? Date.now()), cd: s.spCd ?? {}, castAt: num(s.castAt), magic: levelOf(s.skills?.magic | 0), dist: tgtDist(ctx, player, s), short: vals.filter((v) => v.startsWith('sp:')).map((v) => spellOfBar(v)).filter((sp) => sp?.runes && missing(sp, s.supplies, weaponOf(s.cbWeapon).id).length).map((sp) => sp.id) }, hasSp = vals.some((v) => v.startsWith('sp:')), fbKey = (hasSp ? `|${JSON.stringify(fb.cd)}|${fb.castAt}|${fb.short.join()}|${fb.magic}` : '');
    const kit = kitOn(player);
    const key = `${kit ? 'K' : ''}${fb.dist > 20 ? 'o' : ''}|${vals.join(',')}|${ow.join(',')}|${pk}|${pct}|${xp.name}|${xp.level}|${xp.pct}|${s.exp}|${s.expMax}|${fbKey}`;
    if (key === mk) return mh;
    const V = `data-v="${BUILD}"`;
    const row = (from) => { let r = `<div ${V} class="h4-row" style="display:flex;gap:${GAP}px">`; for (let i = from; i < from + ROW; i++) r += slot(i, vals[i], ow, i === first, pct, fb, kit); return r + `</div>`; };
    const xNow = Math.max(0, Math.floor(+s.exp || 0)), xMax = Math.max(1, Math.floor(+s.expMax || 1000)), xPct = Math.min(100, xNow / xMax * 100); // creator 2026-10-09: 0 / 1000 xp
    const tip = `${xNow.toLocaleString('en-US')} / ${xMax.toLocaleString('en-US')} XP`;
    let h = kit
      ? `${KIT_CSS}<div ${V} id="hud-xp" class="nh-bar kx" title="${esc(tip)}"><span ${V} class="kx-in"><i ${V} style="width:${xPct}%"></i><b ${V}></b></span><span ${V} class="nh-num">${esc(tip)}</span></div>`
      : `<div ${V} id="hud-xp" class="nh-bar" title="${esc(tip)}"><i ${V} style="width:${xPct}%"></i><b ${V}></b><span ${V} class="nh-num">${esc(tip)}</span></div>`;
    h += `<div ${V} id="hud-bar" style="position:relative;display:flex;flex-direction:column;gap:${GAP}px;pointer-events:auto">${row(ROW)}${row(0)}`;
    if (pk >= 0) h += picker(pk);
    h += `</div>`;
    mk = key; mh = h;
    return mh;
  } catch (e) { return ''; }
}
