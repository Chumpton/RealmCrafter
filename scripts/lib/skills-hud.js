// SKILLS-WC S6: the skills HUD, drawn by ui.js. RuneScape stone-and-parchment, made Norse: walnut plates, parchment inner, gold numbers.
// skillsHud(ctx, player) -> HTML (memoised on what it reads); mountSkills/unmountSkills own the +xp drops and the level-up banner (uiEvent "xp").
// Reads only: player.state.skills / inv / chop / skillMsg / skillsOpen / skillDebugOpen, mead/fed (to sit above the tally). Never throws.
import { SK, SKILL_LIST, AXES, ACTIONS, ITEMS, GROVE_TREES } from './data/skills.js';
import { levelOf, progress, chance, treeOdds, actionOf, bestAxe } from './skills-core.js';
import { combatTab, cbTarget, cbLevelOf } from './combat-hud.js';
import { FISH, COOK, LOGS_FM, SUPPLY_NAMES } from './data/gather.js';
import { RUNE_SUPPLIES } from './data/runes.js';
import { catchChance, burnChance, lightChance } from './gather-core.js';
import { FL, RECIPES, BOWS, ARROWS, FLETCH_SUPPLY_NAMES } from './data/fletch.js';
import { canMake } from './fletch-core.js';
import { esc } from './esc.js';
import { makeMenu } from './make-hud.js';
import { bankMenu } from './bank-hud.js';
const SUP_NAMES = { ...SUPPLY_NAMES, ...FLETCH_SUPPLY_NAMES, ...Object.fromEntries(Object.entries(RUNE_SUPPLIES).map(([k, v]) => [k, v[0].toUpperCase() + v.slice(1)])) };

const C = { slate: '#343c43', walnut: '#4f3828', parch: '#f2e6cf', gold: '#ba8950', moss: '#9baf84', teal: '#5dada9', ink: '#2a1d13' };
const FONT = 'Georgia,serif';
const RAIL = 'calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px)';
const fmt = (tenths) => ((tenths | 0) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
export const axeSvg = (w = 18, head = C.gold) => `<svg width="${w}" height="${w}" viewBox="0 0 20 20" style="display:block"><path d="M5 18 L14 5" stroke="#6b4a2c" stroke-width="2.4" stroke-linecap="round"/><path d="M11.5 2.5 C15 1.5 18.5 4 18 8 C16.5 7.6 14.6 8 13.4 9.2 L10.6 5.6 C11.6 4.8 11.9 3.6 11.5 2.5 Z" fill="${head}" stroke="${C.ink}" stroke-width="1"/></svg>`;
const STYLE = `<style>
.skp{background:${C.slate};border:2px solid ${C.walnut};box-shadow:0 0 0 1px #1c1410,4px 4px 0 rgba(20,12,6,.6);border-radius:6px;color:${C.parch};font-family:${FONT}}
.skin{background:${C.parch};color:${C.ink};border:1px solid ${C.walnut};border-radius:3px}
.skbar{height:5px;background:#5a3b22;border:1px solid #3b2716;overflow:hidden}.skbar>i{display:block;height:100%;background:${C.gold}}
.skbtn{font-family:${FONT};font-size:12px;cursor:pointer;border:1px solid ${C.walnut};border-radius:4px;background:${C.gold};color:${C.ink};padding:4px 8px}
@keyframes skMsg{0%{opacity:0;transform:translate(-50%,6px)}6%{opacity:1;transform:translate(-50%,0)}88%{opacity:1}100%{opacity:0}}
@keyframes skSpin{to{transform:rotate(360deg)}}
</style>`;

function lv(s) { return levelOf(s?.skills?.woodcutting | 0); }
let memoK = null, memoH = '', firstN = null;

export function skillsHud(ctx, player, docked) { // NORSE-HUD: docked = the pip rides the hotbar dock (skillsPip), not bottom-left
  try {
    if (!SK.on) return '';
    const s = player?.state ?? {}, ed = !!player?.isEditor;
    const n = s.skillMsg?.n ?? 0; if (firstN === null) firstN = n; // a reload never replays the last message
    const tgt = ed && s.skillsOpen && s.skillDebugOpen ? debugTarget(ctx, player) : null;
    const ctg = s.skillsOpen && s.skTab === 'combat' ? cbTarget(ctx, player) : null;
    const key = `${JSON.stringify(s.skills ?? null)}|${s.skTab ?? ''}|${s.cbWeapon}|${s.cbStyle}|${s.autoRet !== false}|${s.cbSpell}|${s.skTab === 'combat' ? Object.entries(s.supplies ?? {}).filter(([k]) => k.endsWith('-rune')).map(([, v]) => v).join(',') : ''}|${ctg ? ctg.id + ':' + ctg.state?.hp + ':' + ctg.fighting : ''}|${JSON.stringify(s.inv ?? null)}|${!!s.skillsOpen}|${!!s.skillDebugOpen}|${s.chop?.tree ?? ''}|${s.act?.k ?? ''}|${JSON.stringify(s.supplies ?? null)}|${n}|${ed}|${tgt?.id ?? ''}|${!!(s.mead || s.fed)}|${!!s.optionsOpen}|${JSON.stringify(s.fmenu ?? null)}|${JSON.stringify(s.smenu ?? null)}|${s.bankAt ? JSON.stringify(s.bank ?? null) : ''}|${!!s.bankAt}|${!!docked}`;
    if (key === memoK) return memoH;
    memoK = key;
    memoH = STYLE + '' + /* creator 2026-10-05: the L pip retired */ (s.skillsOpen ? panel(s, ed, tgt, ctg) : '') + (s.chop && !s.optionsOpen ? chopping() : '') + (s.act && !s.chop && !s.optionsOpen ? acting(s.act.k) : '') + (n !== firstN && s.skillMsg?.text ? msgLine(s.skillMsg) : '') + (s.fmenu && !s.optionsOpen ? fletchMenu(s) : '') + (s.smenu && !s.optionsOpen ? makeMenu(s) : '') + (s.bankAt && !s.optionsOpen ? bankMenu(s) : '');
    return memoH;
  } catch (e) { return ''; }
}

// NORSE-HUD: the same pip (same id, same click), docked beside the hotbar as a .nh-btn with its L badge
let pk = null, ph = '';
export function skillsPip(player) {
  try {
    if (!SK.on) return '';
    const t = player?.state?.skills?.woodcutting | 0;
    if (t === pk) return ph; pk = t;
    const p = progress(t);
    return (ph = `<button id="sk-pip" class="nh-btn" type="button" onclick="sendAction('skillsPanel')" title="Skills (L)" style="height:44px;padding:0 9px 0 7px;display:flex;align-items:center;gap:6px">
    <span class="nh-key">L</span><span style="display:block;margin-top:4px">${axeSvg(18)}</span>
    <span style="display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:30px"><span style="display:flex;align-items:baseline;gap:3px"><span style="font:600 9px/1 system-ui,'Inter',sans-serif;letter-spacing:.08em;opacity:.75">WC</span><span id="sk-lv-${p.level}" class="nh-num" style="font-size:17px;line-height:1;color:#e2b673">${p.level}</span></span>
      <span class="nh-bar" style="display:block;width:34px;height:3px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(p.pct * 100)}%;background:#ba8950"></i></span></span></button>`);
  } catch (e) { return ''; }
}
// 1. the pip, bottom-left above the mead tally and the O hint
function pip(s) {
  const t = s.skills?.woodcutting | 0, p = progress(t), bottom = (s.mead || s.fed) ? 94 : 50;
  return `<div id="sk-pip" class="skp" onclick="sendAction('skillsPanel')" title="Skills (L)" style="position:fixed;left:18px;bottom:${bottom}px;display:flex;align-items:center;gap:7px;padding:5px 9px 6px 7px;cursor:pointer;pointer-events:auto;z-index:5">
    <div class="skin" style="padding:2px;border-radius:4px">${axeSvg(18)}</div>
    <div style="min-width:46px"><div style="display:flex;align-items:baseline;gap:4px"><span style="font-size:10px;letter-spacing:.1em;opacity:.75">WC</span><span id="sk-lv-${p.level}" style="font-size:18px;line-height:1;color:${C.gold};font-weight:bold">${p.level}</span><span style="font-size:10px;opacity:.55">L</span></div>
      <div class="skbar" style="height:3px;margin-top:3px"><i style="width:${Math.round(p.pct * 100)}%"></i></div></div></div>`;
}

// 2. the Skills panel: 3-column grid, 28-slot inventory, editor debug
function panel(s, ed, tgt, ctg) {
  const cards = SKILL_LIST.map((k) => {
    const t = s.skills?.[k.id] | 0, p = progress(t);
    return `<div class="skin" style="padding:5px 5px 6px;min-height:84px;box-sizing:border-box">
      <div style="display:flex;align-items:center;gap:4px">${k.id === 'woodcutting' ? axeSvg(16) : `<span>${esc(k.icon)}</span>`}<span style="font-size:15px;font-weight:bold;color:${C.walnut}">${p.level}<span style="font-size:11px;opacity:.6">/99</span></span></div>
      <div style="font-size:11px;font-weight:bold;margin-top:2px">${esc(k.name)}</div>
      <div style="font-size:10px;opacity:.75">XP ${fmt(t)}</div>
      <div style="font-size:10px;opacity:.75">${p.level >= 99 ? 'max' : `next ${p.toNext.toLocaleString('en-US', { maximumFractionDigits: 1 })}`}</div>
      <div class="skbar" style="margin-top:3px"><i style="width:${Math.round(p.pct * 100)}%"></i></div></div>`;
  });
  while (cards.length < 3) cards.push(`<div class="skin" style="min-height:84px;opacity:.35;display:flex;align-items:center;justify-content:center;font-size:20px;color:${C.walnut}">ᛉ</div>`);
  const inv = Array.isArray(s.inv) ? s.inv : [], slots = [];
  for (let i = 0; i < (SK.invSlots || 28); i++) {
    const it = inv[i], def = it?.id ? ITEMS[it.id] : null;
    const hint = def ? (def.food ? ` · click to eat (+${def.food})` : def.raw ? ' · click to cook at a fire' : it.id.startsWith('logs-') ? ' · click to light (tinderbox)' : it.id === 'tinderbox' ? ' · click to light logs' : it.id === 'knife' ? ' · click to fletch' : def.unstrung ? ' · click to string' : def.bow ? ' · click to wield' : '') + (def.tool === 'axe' ? '' : ' · right-click to drop') : '';
    slots.push(def ? `<div title="${esc(def.name + hint)}" onclick="${`event.shiftKey?sendAction('invDrop',{i:${i}}):sendAction('invUse',{i:${i}})`}" ${def.tool === 'axe' ? '' : `oncontextmenu="event.preventDefault();sendAction('menuAt',{k:'inv',i:${i},x:event.clientX,y:event.clientY})"`} style="cursor:pointer;height:32px;background:#3d2b1e;border:1px solid #241810;border-radius:3px;display:flex;align-items:center;justify-content:center">
        ${def.tool === 'axe' ? axeSvg(20, def.color) : def.bow || def.unstrung ? bowSvg(def, it.id === s.cbWeapon) : def.raw || def.cooked || def.burnt ? fishSvg(def) : `<div style="width:20px;height:14px;border-radius:${def.tool ? 3 : 7}px;background:${esc(def.color)};border:1px solid ${C.ink};font-size:10px;line-height:14px;text-align:center;color:${C.parch};font-weight:bold">${esc(def.glyph ?? def.name[0] ?? '?')}</div>`}</div>`
      : `<div style="height:32px;background:#3d2b1e;border:1px solid #241810;border-radius:3px;opacity:.55"></div>`);
  }
  const used = inv.filter((x) => x?.id).length, logs = inv.filter((x) => x?.id?.startsWith?.('logs-')).length;
  return `<div id="sk-panel" data-modal class="skp" style="position:fixed;right:${RAIL};top:50%;transform:translateY(-50%);width:300px;box-sizing:border-box;padding:10px 12px 12px;max-height:calc(100vh - 48px);overflow-y:auto;scrollbar-width:thin;pointer-events:auto;z-index:6">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="display:flex;gap:4px">${['skills', 'combat'].map((t) => { const on = (s.skTab === 'combat') === (t === 'combat'); return `<button id="sk-tab-${t}" class="skbtn" onclick="sendAction('cbTab',{tab:'${t}'})" style="padding:2px 7px;font-size:11px;letter-spacing:.12em;background:${on ? C.gold : '#5a3b22'};color:${on ? C.ink : C.parch}">${t === 'skills' ? 'ᛋ SKILLS' : '⚔ COMBAT'}</button>`; }).join('')}</span><span style="font-size:11px;opacity:.85">Cb <b style="color:${C.gold}">${cbLevelOf(s)}</b></span>
      <span style="display:flex;gap:6px">${ed ? `<button id="sk-dbg-tog" class="skbtn" onclick="sendAction('skillDebug')" style="background:${s.skillDebugOpen ? C.gold : '#5a3b22'};color:${s.skillDebugOpen ? C.ink : C.parch};padding:2px 6px;font-size:11px">🪓 debug</button>` : ''}
      <button id="sk-close" class="skbtn" onclick="sendAction('skillsPanel',{},{relockPointer:true})" style="padding:2px 7px;font-size:11px">✕</button></span></div>
    ${s.skTab === 'combat' ? combatTab(s, ctg) : `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px">${cards.join('')}</div>`}
    <div style="height:10px"></div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px"><span style="font-size:12px;letter-spacing:.16em;color:${C.gold}">ᛒ PACK</span><span style="font-size:11px;opacity:.7">${used}/${SK.invSlots || 28}</span></div>
    <div id="sk-coins" style="font-size:12px;margin:-2px 0 5px;color:${C.gold}">● ${(s.supplies?.coins | 0).toLocaleString('en-US')} coins</div>
    ${s.supplies && Object.entries(s.supplies).some(([k, v]) => v > 0 && k !== 'coins') ? `<div style="font-size:10px;opacity:.8;margin:-2px 0 5px">${Object.entries(s.supplies).filter(([k, v]) => v > 0 && k !== 'coins').map(([k, v]) => `${esc(SUP_NAMES[k] ?? k)} ${v}`).join(' · ')}</div>` : ''}
    <div id="sk-inv" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">${slots.join('')}</div>
    <button id="sk-drop" class="skbtn" onclick="sendAction('invDropLogs')" ${logs ? '' : 'disabled'} style="width:100%;margin-top:8px;${logs ? '' : 'opacity:.45;cursor:default'}">Drop all logs${logs ? ` (${logs})` : ''}</button>
    ${ed && s.skillDebugOpen ? debug(s, tgt) : ''}
  </div>`;
}

// 7. editor debug: set level, grant xp, give axe, live success % per tree kind
function debugTarget(ctx, player) {
  try {
    const s = player?.state;
    if (s?.chop?.tree) { const t = GROVE_TREES.find((g) => g.id === s.chop.tree); if (t) return { ...t, chopping: true }; }
    const p = player?.worldFeetPosition ?? player?.feetPosition; if (!p || typeof p.x !== 'number') return null;
    let best = null, bd = 6;
    for (const t of GROVE_TREES) { const d = Math.hypot(t.x - p.x, t.z - p.z); if (d < bd) { bd = d; best = t; } }
    return best;
  } catch (e) { return null; }
}
function debug(s, tgt) {
  const L = lv(s), axe = bestAxe(s.inv, L);
  const rows = ACTIONS.filter((a) => a.skill === 'woodcutting').map((a) => {
    const pct = axe && L >= a.levelReq ? (chance(...Object.values(treeOdds(a, axe)), L) * 100).toFixed(1) + '%' : L < a.levelReq ? 'lvl' : '—';
    const hot = tgt && actionOf(tgt.kind)?.id === a.id;
    return `<tr style="${hot ? `background:${C.gold};color:${C.ink};font-weight:bold` : ''}"><td style="padding:1px 4px">${esc(a.name)}</td><td style="text-align:center">${a.levelReq}</td><td style="text-align:right;padding-right:4px">${pct}</td></tr>`;
  }).join('');
  const inp = `width:52px;font-family:${FONT};font-size:12px;padding:3px 4px;border:1px solid ${C.walnut};border-radius:3px;background:${C.parch};color:${C.ink}`;
  return `<div id="sk-debug" style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(186,137,80,.45);font-size:12px">
    <div style="font-size:11px;letter-spacing:.16em;color:${C.gold};margin-bottom:6px">🪓 DEBUG · editors only</div>
    <div style="display:flex;gap:5px;align-items:center;margin-bottom:5px"><select id="sk-dbg-sk" style="${inp};width:auto">${SKILL_LIST.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}</select><input id="sk-dbg-lv" type="number" min="1" max="99" value="${L}" style="${inp}"><button class="skbtn" onclick="sendAction('skillDebugSet',{skill:document.getElementById('sk-dbg-sk').value,level:+document.getElementById('sk-dbg-lv').value||1})">Set</button></div>
    <div style="display:flex;gap:5px;align-items:center;margin-bottom:5px"><span style="width:38px">HP</span><button class="skbtn" onclick="sendAction('cbHurt')">Hurt me 5</button><button class="skbtn" onclick="sendAction('cbHeal')">Full heal</button></div>
    <div style="display:flex;gap:5px;align-items:center;margin-bottom:5px"><span style="width:38px">XP</span><input id="sk-dbg-xp" type="number" min="0" value="1000" style="${inp}"><button class="skbtn" onclick="sendAction('skillDebugXp',{skill:document.getElementById('sk-dbg-sk').value,xp:+document.getElementById('sk-dbg-xp').value||0})">Grant</button></div>
    <div style="display:flex;gap:5px;align-items:center;margin-bottom:8px"><span style="width:38px">Axe</span><select id="sk-dbg-axe" style="${inp};width:auto;flex:1">${AXES.map((a) => `<option value="${a.id}">${esc(a.name)} (${a.levelReq})</option>`).join('')}</select><button class="skbtn" onclick="sendAction('skillDebugAxe',{axe:document.getElementById('sk-dbg-axe').value})">Give</button></div>
    <div style="display:flex;gap:5px;align-items:center;margin-bottom:5px"><span style="width:38px">Kit</span><button class="skbtn" onclick="sendAction('skillDebugKit')">All tools + bait</button><button class="skbtn" onclick="sendAction('skillDebugFletch')">Fletch kit</button><select id="sk-dbg-it" style="${inp};width:auto;flex:1">${['logs-normal', 'logs-oak', 'logs-willow', 'logs-maple', 'logs-yew', 'logs-magic', 'logs-redwood', ...FISH.map((f) => 'raw-' + f.id)].map((id) => `<option value="${id}">${esc(ITEMS[id]?.name ?? id)}</option>`).join('')}</select><button class="skbtn" onclick="sendAction('skillDebugItem',{id:document.getElementById('sk-dbg-it').value,n:5})">+5</button></div>
    ${gatherDebug(s)}
    <div style="font-size:11px;opacity:.8;margin-bottom:3px">${tgt ? `${tgt.chopping ? 'chopping' : 'nearest'}: <b style="color:${C.gold}">${esc(actionOf(tgt.kind)?.name ?? tgt.kind)}</b> (${esc(tgt.id)})` : 'no tree within 6 m'} · axe: ${axe ? esc(axe.name) : 'none'}</div>
    <table class="skin" style="width:100%;border-collapse:collapse;font-size:11px"><tr style="opacity:.65"><td style="padding:1px 4px">kind</td><td style="text-align:center">req</td><td style="text-align:right;padding-right:4px">your %</td></tr>${rows}</table>
  </div>`;
}

function gatherDebug(s) {
  const F = levelOf(s.skills?.fishing | 0), K = levelOf(s.skills?.cooking | 0), M = levelOf(s.skills?.firemaking | 0);
  const pc = (x) => (x * 100).toFixed(1) + '%';
  const th = (a, b, c, d) => `<tr style="opacity:.65"><td style="padding:1px 4px">${a}</td><td style="text-align:center">${b}</td><td style="text-align:right">${c}</td>${d ? `<td style="text-align:right;padding-right:4px">${d}</td>` : ''}</tr>`;
  const fish = FISH.map((f) => `<tr style="${F < f.level ? 'opacity:.45' : ''}"><td style="padding:1px 4px">${esc(f.name)}</td><td style="text-align:center">${f.level}</td><td style="text-align:right;padding-right:4px">${F < f.level ? 'lvl' : pc(catchChance(F, f.level))}</td></tr>`).join('');
  const cook = COOK.map((c) => `<tr style="${K < c.level ? 'opacity:.45' : ''}"><td style="padding:1px 4px">${esc(c.id)}</td><td style="text-align:center">${c.level}</td><td style="text-align:right">${K < c.level ? 'lvl' : pc(burnChance(K, c, false))}</td><td style="text-align:right;padding-right:4px">${K < c.level ? '' : pc(burnChance(K, c, true))}</td></tr>`).join('');
  const fire = LOGS_FM.map((l) => `<tr style="${M < l.level ? 'opacity:.45' : ''}"><td style="padding:1px 4px">${esc(l.kind)}</td><td style="text-align:center">${l.level}</td><td style="text-align:right;padding-right:4px">${M < l.level ? 'lvl' : pc(lightChance(M, l.level))}</td></tr>`).join('');
  const tb = (title, head, rows) => `<div style="font-size:11px;opacity:.8;margin:6px 0 3px">${title}</div><table class="skin" style="width:100%;border-collapse:collapse;font-size:11px">${head}${rows}</table>`;
  return tb(`🎣 Fishing ${F} · catch %`, th('fish', 'req', 'catch'), fish) + tb(`🍳 Cooking ${K} · burn %`, th('food', 'req', 'fire', 'hearth'), cook) + tb(`🔥 Firemaking ${M} · light %`, th('logs', 'req', 'light'), fire) + fletchDebug(s) + '<div style="height:6px"></div>';
}
function fletchDebug(s) {
  const L = levelOf(s.skills?.fletching | 0), R = levelOf(s.skills?.ranged | 0);
  const row = (a, b, c, d, dim) => `<tr style="${dim ? 'opacity:.45' : ''}"><td style="padding:1px 4px">${esc(a)}</td><td style="text-align:center">${b}</td><td style="text-align:right">${c}</td><td style="text-align:right;padding-right:4px">${d}</td></tr>`;
  const head = (a, b, c, d) => `<tr style="opacity:.65"><td style="padding:1px 4px">${a}</td><td style="text-align:center">${b}</td><td style="text-align:right">${c}</td><td style="text-align:right;padding-right:4px">${d}</td></tr>`;
  const rec = RECIPES.filter((r) => !r.id.startsWith('string-')).map((r) => row(r.name, r.level, r.per === 'each' ? `${r.xp}/ea` : r.xp, canMake(r, s.inv, s.supplies), L < r.level)).join('');
  const bows = BOWS.map((b) => row(b.name, b.wield, `${b.speed}t`, `${b.range} m`, R < b.wield)).join('');
  const arr = ARROWS.map((a) => row(a.name, a.level, a.str, s.supplies?.[a.arrows] | 0, L < a.level)).join('');
  const tb = (title, h, rows) => `<div style="font-size:11px;opacity:.8;margin:6px 0 3px">${title}</div><table class="skin" style="width:100%;border-collapse:collapse;font-size:11px">${h}${rows}</table>`;
  return tb(`🪶 Fletching ${L} · always succeeds, ${FL.ticks} ticks`, head('recipe', 'req', 'xp', 'can'), rec) + tb(`🏹 Bows · Ranged ${R} to wield`, head('bow', 'rng', 'speed', 'reach'), bows) + tb('Arrows · ranged strength', head('arrow', 'fl', 'str', 'have'), arr);
}
const bowSvg = (d, on) => `<svg width="22" height="22" viewBox="0 0 22 22" style="display:block${on ? `;filter:drop-shadow(0 0 3px ${C.gold})` : ''}"><path d="M6 2 C16 6 16 16 6 20" fill="none" stroke="${esc(d.color)}" stroke-width="2.6" stroke-linecap="round"/><path d="M6 2 C16 6 16 16 6 20" fill="none" stroke="#2a1d13" stroke-width="0.6" opacity=".5"/>${d.unstrung ? '' : '<path d="M6 2 L6 20" stroke="#efe6d2" stroke-width="0.9"/>'}</svg>`;
// the make-X menu: knife on logs. Rows grouped by what they eat; 1 / 5 / All / X.
function fletchMenu(s) {
  const L = levelOf(s.skills?.fletching | 0), inv = s.inv ?? [], focus = s.fmenu?.focus ?? 'arrows';
  const groups = [...new Set(inv.filter((x) => x?.id?.startsWith?.('logs-') && RECIPES.some((r) => r.group === x.id)).map((x) => x.id)), 'arrows', 'string'];
  const g = groups.includes(focus) ? focus : groups[0];
  const tab = (id) => { const on = id === g, name = id === 'arrows' ? 'Arrows' : id === 'string' ? 'String bows' : ITEMS[id]?.name ?? id; return `<button class="skbtn" onclick="sendAction('fletchMenu',{focus:'${id}'})" style="padding:3px 7px;font-size:11px;background:${on ? C.gold : '#5a3b22'};color:${on ? C.ink : C.parch}">${esc(name)}</button>`; };
  const rows = RECIPES.filter((r) => r.group === g).map((r) => {
    const can = canMake(r, inv, s.supplies), lock = L < r.level, ok = can > 0 && !lock;
    const b = (n, t) => `<button class="skbtn" ${ok ? '' : 'disabled'} onclick="sendAction('fletch',{r:'${r.id}',n:${n}})" style="padding:2px 7px;font-size:11px;${ok ? '' : 'opacity:.4;cursor:default'}">${t}</button>`;
    const xp = r.per === 'each' ? `${r.xp} xp each` : `${r.xp} xp`;
    return `<div class="skin" style="display:flex;align-items:center;gap:6px;padding:5px 6px;margin-bottom:4px;${lock ? 'opacity:.5' : ''}">
      <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:bold">${esc(r.name)}${r.make?.n ? ` ×${r.make.n}` : ''}</div><div style="font-size:10px;opacity:.75">lvl ${r.level} · ${xp} · ${lock ? `need Fletching ${r.level}` : `can make ${can}`}</div></div>
      ${b(1, '1')}${b(5, '5')}${b(999, 'All')}<input id="fx-${r.id}" type="number" min="1" max="999" value="10" style="width:38px;font:11px ${FONT};padding:2px;border:1px solid ${C.walnut};border-radius:3px;background:${C.parch};color:${C.ink}" ${ok ? '' : 'disabled'}><button class="skbtn" ${ok ? '' : 'disabled'} onclick="sendAction('fletch',{r:'${r.id}',n:+document.getElementById('fx-${r.id}').value||1})" style="padding:2px 6px;font-size:11px;${ok ? '' : 'opacity:.4;cursor:default'}">X</button></div>`;
  }).join('') || `<div style="font-size:12px;opacity:.7;padding:6px">Nothing to make here.</div>`;
  return `<div id="fl-menu" data-modal class="skp" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:380px;max-height:70vh;overflow-y:auto;box-sizing:border-box;padding:10px 12px;pointer-events:auto;z-index:8">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:12px;letter-spacing:.16em;color:${C.gold}">🪶 WHAT WOULD YOU LIKE TO MAKE?</span><button class="skbtn" onclick="sendAction('fletchClose',{},{relockPointer:true})" style="padding:2px 7px;font-size:11px">✕</button></div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${groups.map(tab).join('')}</div>${rows}
    <div style="font-size:10px;opacity:.7;margin-top:4px">Feathers ${s.supplies?.feathers | 0} · Bow strings ${s.supplies?.strings | 0} · Shafts ${s.supplies?.shafts | 0} · Headless ${s.supplies?.headless | 0}</div></div>`;
}

// 6. chopping, over the reticle
const fishSvg = (d) => `<svg width="24" height="16" viewBox="0 0 24 16" style="display:block"><path d="M3 8 C7 2 15 2 19 8 C15 14 7 14 3 8 Z" fill="${esc(d.color)}" stroke="#2a1d13" stroke-width="1"/><path d="M19 8 L23 4 L23 12 Z" fill="${esc(d.color)}" stroke="#2a1d13" stroke-width="1"/>${d.raw ? '' : d.burnt ? '' : '<path d="M8 6 L12 10 M11 5 L15 9" stroke="#7a4a22" stroke-width="1.2"/>'}<circle cx="7" cy="7" r="1" fill="#2a1d13"/></svg>`;
const ACT = { fish: ['🎣', 'Fishing…'], cook: ['🍳', 'Cooking…'], fire: ['🔥', 'Lighting the logs…'], fletch: ['🪶', 'Fletching…'], mine: ['⛏️', 'Mining…'], smith: ['🔨', 'Smithing…'] };
function acting(k) {
  const [ic, t] = ACT[k] ?? ['', ''];
  return `<div id="sk-act" style="position:fixed;left:50%;top:calc(50% - 44px);transform:translateX(-50%);display:flex;align-items:center;gap:6px;pointer-events:none;font:13px ${FONT};color:${C.parch};text-shadow:0 1px 2px #1a120c,0 0 4px #1a120c;letter-spacing:.05em;z-index:4"><span>${ic}</span>${t}</div>`;
}
function chopping() {
  return `<div id="sk-chop" style="position:fixed;left:50%;top:calc(50% - 44px);transform:translateX(-50%);display:flex;align-items:center;gap:6px;pointer-events:none;font:13px ${FONT};color:${C.parch};text-shadow:0 1px 2px #1a120c,0 0 4px #1a120c;letter-spacing:.05em;z-index:4">
    <span style="display:inline-block;animation:skSpin 1.2s linear infinite">${axeSvg(16)}</span>Woodcutting…</div>`;
}
// 5. the game message, RuneScape chat style, keyed by n so it replays
function msgLine(m) {
  return `<div id="sk-msg-${m.n | 0}" class="skin" style="position:fixed;left:50%;bottom:118px;transform:translateX(-50%);max-width:min(560px,calc(100vw - 2 * ${RAIL}));padding:4px 14px;font:14px ${FONT};color:#1e3a8a;color:${C.ink};box-shadow:0 0 0 2px ${C.walnut},3px 3px 0 rgba(20,12,6,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;opacity:0;animation:skMsg 4s ease forwards;z-index:4">${esc(m.text)}</div>`;
}

// 3 + 4. the +xp drops and the level-up banner: page-side, from uiEvent "xp"
let offXp = null, layer = null;
const MSTYLE = `@keyframes skDrop{0%{opacity:0;transform:translateY(8px)}15%{opacity:1;transform:translateY(0)}70%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
@keyframes skBan{0%{opacity:0;transform:translate(-50%,-12px) scale(.96)}8%{opacity:1;transform:translate(-50%,0) scale(1)}88%{opacity:1}100%{opacity:0;transform:translate(-50%,-8px)}}
@keyframes skFw{0%{opacity:1;transform:translate(0,0) scale(.4)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}`;
export function mountSkills(container) {
  try {
    unmountSkills();
    const doc = container?.ownerDocument ?? document;
    layer = doc.createElement('div'); layer.id = 'sk-layer'; layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:7';
    layer.innerHTML = `<style>${MSTYLE}</style><div id="sk-drops" style="position:absolute;bottom:150px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px"></div>`;
    (container ?? doc.body).appendChild(layer);
    offXp = window.spawn?.on?.('event', (name, p) => { if (name === 'xp' && p) { try { onXp(p); } catch (e) {} } });
  } catch (e) {}
}
export function unmountSkills() { try { if (typeof offXp === 'function') offXp(); layer?.remove?.(); } catch (e) {} offXp = null; layer = null; }
function onXp(p) {
  if (!layer) return;
  const drops = layer.querySelector('#sk-drops'), t = p.xpTenths | 0;
  if (drops && t > 0 && false) { // WOW: the +XP now floats off the character (skills-player.js)
    const d = document.createElement('div');
    d.style.cssText = `display:flex;align-items:center;gap:5px;font:800 20px Arial,sans-serif;color:#d9a6ff;text-shadow:0 0 8px rgba(160,80,255,.9),1px 1px 0 #000,0 0 3px #000;animation:skDrop 1.4s ease-out forwards`;
    d.innerHTML = `${p.skill === 'woodcutting' || !p.skill ? axeSvg(16) : `<span>${esc(SKILL_LIST.find((k) => k.id === p.skill)?.icon ?? '')}</span>`}<span>+${fmt(t)} XP</span>`;
    drops.appendChild(d); setTimeout(() => d.remove(), 1450);
    while (drops.children.length > 6) drops.firstChild.remove();
  }
  const up = Array.isArray(p.up) ? p.up : [];
  if (!up.length) return;
  const skill = SKILL_LIST.find((k) => k.id === p.skill)?.name ?? 'Woodcutting', top = up[up.length - 1]?.level ?? p.level;
  const lines = up.flatMap((u) => Array.isArray(u?.unlocks) ? u.unlocks : []);
  layer.querySelector('#sk-ban')?.remove();
  const b = document.createElement('div'); b.id = 'sk-ban';
  const sparks = Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2, r = 60 + (i % 3) * 24, col = [C.gold, C.teal, C.moss, '#e7b457'][i % 4];
    return `<i style="position:absolute;left:50%;top:0;width:6px;height:6px;border-radius:50%;background:${col};box-shadow:0 0 6px ${col};--dx:${Math.round(Math.cos(a) * r * 1.8)}px;--dy:${Math.round(Math.sin(a) * r)}px;animation:skFw .9s ${(i % 3) * 0.12}s ease-out both"></i>`; }).join('');
  b.style.cssText = `position:absolute;left:50%;top:calc(var(--spawn-safe-area-top, 0px) + 180px);width:min(520px,calc(100vw - 2 * ${RAIL}));box-sizing:border-box;animation:skBan 4s ease forwards`;
  b.innerHTML = `<div style="position:relative">${sparks}</div><div style="background:${C.slate};border:2px solid ${C.walnut};border-radius:6px;padding:5px;box-shadow:4px 4px 0 rgba(20,12,6,.6)">
    <div style="background:${C.parch};color:${C.ink};border:1px solid ${C.walnut};border-radius:3px;padding:10px 16px;font:15px ${FONT};text-align:center;line-height:1.4">
      <div style="display:flex;justify-content:center;margin-bottom:4px">${p.skill === 'woodcutting' ? axeSvg(26) : `<span style="font-size:24px">${esc(SKILL_LIST.find((k) => k.id === p.skill)?.icon ?? '')}</span>`}</div>
      Congratulations, you just advanced a ${esc(skill)} level.<br>Your ${esc(skill)} level is now <b style="color:${C.walnut};font-size:18px">${top | 0}</b>.
      ${lines.map((l) => `<div style="margin-top:4px;color:#3e5a2e;font-size:13px">${esc(l)}</div>`).join('')}</div></div>`;
  layer.appendChild(b); setTimeout(() => { if (b.parentNode) b.remove(); }, 4100);
}
// WOW-HUD: one pack cell exactly as the panel's inventory draws it (same icons, same click = invUse / cbWeapon, right-click = invDrop), sized for the Backpack window
export function invCell(s, i, size = 36) {
  try {
    const inv = Array.isArray(s?.inv) ? s.inv : [], it = inv[i], def = it?.id ? ITEMS[it.id] : null;
    const box = `position:relative;width:${size}px;height:${size}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center`;
    if (!def) return `<div id="bag-${i}" class="h4-slot" title="empty" style="${box};opacity:.7"></div>`;
    const hint = (def.food ? ` · click to eat (+${def.food})` : def.raw ? ' · click to cook at a fire' : it.id.startsWith('logs-') ? ' · click to light (tinderbox)' : it.id === 'tinderbox' ? ' · click to light logs' : it.id === 'knife' ? ' · click to fletch' : def.unstrung ? ' · click to string' : def.bow ? ' · click to wield' : '') + (def.tool === 'axe' ? '' : ' · right-click to drop');
    const q = (it.qty | 0) > 1 ? `<b class="nh-num" style="position:absolute;right:2px;bottom:1px;font-size:10px;line-height:1;color:${C.parch};text-shadow:0 1px 0 #000">${it.qty | 0}</b>` : '';
    const icon = def.tool === 'axe' ? axeSvg(Math.round(size * .6), def.color) : def.bow || def.unstrung ? bowSvg(def, it.id === s.cbWeapon) : def.raw || def.cooked || def.burnt ? fishSvg(def)
      : `<div style="width:22px;height:16px;border-radius:${def.tool ? 3 : 8}px;background:${esc(def.color)};border:1px solid ${C.ink};font-size:10px;line-height:16px;text-align:center;color:${C.parch};font-weight:bold">${esc(def.glyph ?? def.name[0] ?? '?')}</div>`;
    return `<div id="bag-${i}" class="h4-slot${it.id === s.cbWeapon ? ' on' : ''}" title="${esc(def.name + hint)}" onclick="${`event.shiftKey?sendAction('invDrop',{i:${i}}):sendAction('invUse',{i:${i}})`}" ${def.tool === 'axe' ? '' : `oncontextmenu="event.preventDefault();sendAction('menuAt',{k:'inv',i:${i},x:event.clientX,y:event.clientY})"`} style="${box};cursor:pointer">${icon}${q}</div>`;
  } catch (e) { return ''; }
}
