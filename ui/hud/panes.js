// GOAL4-S1 S1b (Savi): the bodies of the three part-1 windows, drawn only while open. Pure: returns HTML, never writes.
// Window root id is win-<id> (kept id = the slide runs once), data-modal frees the cursor while it stands (engine).
import { WINDOWS, SLOTS, slotOf, BUILD, UI4 } from '../../scripts/lib/data/windows.js';
import { SKILL_LIST, ITEMS, SK } from '../../scripts/lib/data/skills.js';
import { levelOf } from '../../scripts/lib/skills-core.js';
import { CB, WEAPONS } from '../../scripts/lib/data/combat.js';
import { invCell } from '../../scripts/lib/skills-hud.js';
import { cbLevelOf, combatTab } from '../../scripts/lib/combat-hud.js';
import { ST } from '../../scripts/lib/data/stamina.js';
import { SLOT_NAMES } from '../../scripts/lib/data/equip.js';
import { quiverArrow } from '../../scripts/lib/fletch-core.js';
import { gearOf, defOf } from '../../scripts/lib/equip-core.js';
import { barValueOf } from '../../scripts/lib/data/spellbook.js';
import { top } from '../../scripts/lib/hiscore-core.js';
import { SPELLS_ALL, maxHitFor } from '../../scripts/lib/data/spells.js';
import { RUNES, STAFF_RUNES } from '../../scripts/lib/data/runes.js';
import { missing, castsLeft } from '../../scripts/lib/magic-core.js';
import { weaponOf } from '../../scripts/lib/combat-core.js';
import { prayerRow, prayerBody } from './prayer.js';
import { esc } from '../../scripts/lib/esc.js';
import { charSheet } from './charsheet.js';
import { backpack } from './backpack.js';
// windows keep clear of the frame (top-left, ~150 px tall with a tracked skill) and of the bar / micro-menu band (bottom 88 px)
const TOP = 'var(--spawn-safe-area-top,0px)', BAND = '88px + var(--spawn-safe-area-bottom,0px)';
const fit = (top) => `top:calc(${TOP} + ${top}px);max-height:calc(100vh - ${TOP} - ${top}px - ${BAND})`;
const POS = {
  left: `left:16px;${fit(164)}`,
  centre: `left:50%;${fit(120)};transform:translateX(-50%)`,
  right: `right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 24px);${fit(120)}`,
};
// WOW-HUD: the Backpack rides above the bag bar, the Character sheet on the left under the frame
const ANCHOR = {
  bags: `right:12px;bottom:calc(var(--spawn-safe-area-bottom,0px) + 52px)`,
  character: `left:16px;${fit(100)}`,
};
const DOCK = { left: '◧', centre: '▣', right: '◨' };
function skillsBody(s, ui, ctx) {
  const hs = top(ctx?.world?.state?.hiscores, 5);
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${SKILL_LIST.map((k) => {
    const lv = levelOf(k.id === 'hitpoints' ? (s.skills?.hitpoints ?? CB.hpStartTenths) : (s.skills?.[k.id] | 0));
    const on = ui.track === k.id;
    return `<button id="pin-${k.id}" class="h4-slot" title="${on ? 'Unpin' : 'Track'} ${esc(k.name)}" onclick="hudTrack('${on ? '' : k.id}')" style="width:auto;height:34px;display:flex;align-items:center;gap:6px;padding:0 8px;font-family:Georgia,serif;font-size:13px;color:#f2e6cf;${on ? 'border-color:#e2b86a;box-shadow:inset 0 0 0 1px #e2b86a' : ''}"><span style="width:18px;text-align:center">${k.icon}</span><span style="flex:1;text-align:left">${esc(k.name)}</span><b style="color:#ba8950">${lv}</b>${on ? '<span style="font-size:11px">📌</span>' : ''}</button>`;
  }).join('')}</div><div style="font-size:11px;opacity:.65;margin-top:8px;text-align:center">click a skill to track it on your frame</div>`
    + (hs.length ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(186,137,80,.35);font-size:11px"><div style="opacity:.65;margin-bottom:3px;letter-spacing:.1em">HISCORES · TOTAL LEVEL</div>${hs.map((r) => `<div style="display:flex;justify-content:space-between"><span>${r.rank}. ${esc(r.name)}</span><span style="color:#ba8950">${r.t} · ${r.x.toLocaleString('en-US')} xp</span></div>`).join('')}</div>` : '');
}
function bagsBody(s) {
  const inv = Array.isArray(s.inv) ? s.inv : [];
  const n = SK.invSlots ?? 28;
  let cells = '';
  for (let i = 0; i < n; i++) cells += invCell(s, i, 36);
  const coins = Math.max(0, (s.supplies?.coins ?? 0) | 0);
  return `<div style="display:grid;grid-template-columns:repeat(7,36px);gap:2px;justify-content:center">${cells}</div>`
    + `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:7px;padding-top:5px;border-top:1px solid rgba(186,137,80,.35);font-size:11px">`
    + `<span style="opacity:.7">${inv.filter(Boolean).length}/${n}</span><span id="bag-coins" class="nh-num" style="color:#e2b673">${coins.toLocaleString('en-US')} <i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#f6dc8a,#a8783c);vertical-align:-1px"></i></span></div>`;
}
const EQ_GLYPH = { head: '⛑', cape: '◫', neck: 'ᛟ', ammo: '➶', weapon: '⚔', body: '▣', shield: '◈', legs: '∏', hands: '✋', feet: '⌐', ring: '○' };
const EQ_L = ['head', 'cape', 'neck', 'weapon', 'body', 'legs'], EQ_R = ['ammo', 'shield', 'hands', 'feet', 'ring'];
function charBody(ctx, player) {
  const s = player?.state ?? {};
  const name = String(player?.displayName ?? '').slice(0, 32) || 'Wanderer';
  const url = typeof player?.portraitUrl === 'string' ? player.portraitUrl : '';
  const lv = (id) => levelOf(id === 'hitpoints' ? (s.skills?.hitpoints ?? CB.hpStartTenths) : (s.skills?.[id] | 0));
  const cb = Math.round(+cbLevelOf(s) || 3);
  const hpMax = lv('hitpoints'), hp = Math.round(Math.max(0, Math.min(hpMax, +(s.hp ?? hpMax) || 0)));
  const pry = prayerRow(s);
  const sh = ctx?.session?.stamHud, smax = ST?.max ?? 100, sv = Math.floor(Math.max(0, Math.min(smax, +(sh?.v ?? smax) || 0)));
  const eq = (slot) => { const id = s.equip?.[slot], d = id && defOf(id);
    if (slot === 'ammo') { const a = quiverArrow(s.supplies, id); // the quiver: click to ready the next arrow tier you carry
      return a ? `<div id="cw-eq-ammo" class="h4-slot on cw-eq" title="Ammo: ${esc(a.name)} arrows (click to change)" onclick="sendAction('ammoCycle',{})" style="cursor:pointer;font-size:9px;line-height:1.05;text-align:center;overflow:hidden;color:#f2e6cf">${esc(a.name)}<br>${s.supplies[a.arrows] | 0}</div>`
        : `<div id="cw-eq-ammo" class="h4-slot h4-empty cw-eq" title="Ammo: no arrows" style="cursor:default">${EQ_GLYPH.ammo}</div>`; }
    return d ? `<div id="cw-eq-${slot}" class="h4-slot on cw-eq" title="${esc(SLOT_NAMES[slot] + ': ' + d.name + ' (click to remove)')}" onclick="sendAction('unequip',{slot:'${slot}'})" oncontextmenu="event.preventDefault();sendAction('menuAt',{k:'eq',slot:'${slot}',x:event.clientX,y:event.clientY})" style="cursor:pointer;font-size:9px;line-height:1.05;text-align:center;overflow:hidden;color:#f2e6cf">${esc(d.name)}</div>`
      : `<div id="cw-eq-${slot}" class="h4-slot h4-empty cw-eq" title="${SLOT_NAMES[slot]}: empty" style="cursor:default">${EQ_GLYPH[slot]}</div>`; };
  const col = (list) => `<div style="display:flex;flex-direction:column;gap:3px">${list.map((a) => eq(a)).join('')}</div>`;
  const G = gearOf(s.equip, s.cbWeapon), sg = (n) => (n > 0 ? '+' + n : '' + n);
  const port = `<div style="position:relative;width:96px;height:96px;margin:0 auto;border-radius:50%;border:3px solid #ba8950;box-shadow:inset 0 0 0 2px #140c07,0 3px 8px rgba(0,0,0,.6);background:radial-gradient(circle at 50% 35%,#4b3624,#1c130c);overflow:hidden">`
    + `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:bold 44px/1 'Cinzel',Georgia,serif;color:#e2b673">${esc(Array.from(name)[0]?.toUpperCase() ?? '?')}</div>`
    + (url ? `<img id="cw-portrait" src="${esc(url)}" alt="" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : '') + `</div>`;
  const centre = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:6px;border-radius:4px;background:radial-gradient(90% 80% at 50% 40%,rgba(186,137,80,.16),rgba(20,12,6,.35));min-height:200px">${port}`
    + `<div style="font-size:15px;font-weight:bold;color:#f2e6cf;text-align:center">${esc(name)}</div>`
    + `<div style="font-size:12px;color:#e2b673">Level ${cb} · Wanderer of the Den</div></div>`;
  const st = (k, v) => `<div class="cw-stat"><span>${k}</span><b>${v}</b></div>`;
  const bon = `<div id="cw-bonus" style="display:grid;grid-template-columns:auto repeat(5,1fr);gap:1px 6px;margin-top:8px;padding-top:6px;border-top:1px solid rgba(186,137,80,.35);font-size:10px;text-align:center"><span></span>${['stab', 'slash', 'crush', 'magic', 'ranged'].map((k) => `<span style="opacity:.6">${k}</span>`).join('')}`
    + `<span style="text-align:left;opacity:.7">attack</span>${['stab', 'slash', 'crush', 'magic', 'ranged'].map((k) => `<b>${sg(G.atk[k])}</b>`).join('')}<span style="text-align:left;opacity:.7">defence</span>${['stab', 'slash', 'crush', 'magic', 'ranged'].map((k) => `<b>${sg(G.def[k])}</b>`).join('')}</div><div style="font-size:10px;margin-top:3px;text-align:left"><span style="opacity:.7">strength </span><b>${sg(G.str)}</b></div>`;
  return `<div id="cw-doll" style="display:flex;gap:6px;align-items:stretch">${col(EQ_L)}${centre}${col(EQ_R)}</div>` + bon
    + `<div id="cw-stats" style="display:grid;grid-template-columns:1fr 1fr;gap:0 14px;margin-top:8px;padding-top:6px;border-top:1px solid rgba(186,137,80,.35)">`
    + st('Attack', lv('attack')) + st('Hitpoints', `${hp}/${hpMax}`) + st('Strength', lv('strength')) + st('Prayer', `${pry.now}/${pry.max}`)
    + st('Defence', lv('defence')) + st('Stamina', `${sv}/${smax}`) + st('Ranged', lv('ranged')) + st('Magic', lv('magic')) + `</div>`
    + `<div id="cw-combat" style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(186,137,80,.35)">${combatTab(s, null)}</div>`; // creator 2026-10-05: the L window retired; its combat styles + Auto Retaliate live here
}
// SPELLBOOK (creator 2026-10-04): the standard book in level order. Drag a spell onto the bar, or pick a slot first and click.
export function spellIcon(sp, size, dim) {
  const face = sp.icon ? `<img src="${sp.icon}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none">`
    : `<span style="position:absolute;inset:3px;border-radius:50%;background:radial-gradient(circle at 38% 32%,${sp.color} 0,${sp.color}cc 38%,#140c07 100%);box-shadow:0 0 8px ${sp.color}88;pointer-events:none"></span><span style="position:relative;font:bold ${Math.round(size * 0.44)}px/1 Georgia,serif;color:#fff;text-shadow:0 1px 2px #000;pointer-events:none">${sp.glyph}</span>`;
  return `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;${dim ? 'filter:saturate(.35) brightness(.62);' : ''}">${face}</span>`;
}
function spellBody(s) { // the OSRS book (data/spells.js): level order, Home Teleport first; bright = castable, dim = level or runes short, padlock = not in the den yet
  const magic = levelOf(s.skills?.magic | 0), wid = weaponOf(s.cbWeapon).id;
  const cells = SPELLS_ALL.filter((sp) => sp.level != null).map((sp) => {
    const lock = sp.den !== 'yes', low = sp.level > magic, miss = lock ? [] : missing(sp, s.supplies, wid), dim = lock || low || miss.length > 0, v = barValueOf(sp.id);
    const free = STAFF_RUNES[wid] ?? [], cost = Object.entries(sp.runes ?? {}).map(([k, n]) => `${n} ${k}${free.includes(k) ? ' (staff)' : RUNES[k] ? ` (${s.supplies?.[RUNES[k].id] | 0})` : ''}`).join(', ');
    const tip = `${sp.name}${sp.level ? ` · Magic ${sp.level}` : ''}${sp.xp ? ` · ${sp.xp} xp` : ''}${sp.kind === 'attack' ? ` · max hit ${maxHitFor(sp, magic)}` : ''}${cost ? ` · ${cost}` : ''}${lock ? ` · locked: ${sp.lock ?? 'not yet'}` : low ? ' (level too low)' : miss.length ? ' (not enough runes)' : ' · drag to your bar' + (sp.kind === 'attack' ? ', right-click to autocast' : ', click to cast')}`;
    const n = lock || low ? Infinity : castsLeft(sp, s.supplies, wid);
    return `<button id="sb-${sp.id}" class="h4-slot" title="${esc(tip)}" ${lock ? '' : `draggable="true" ondragstart="hudDrag(event,'${v}',-1)"`} onclick="${lock ? '' : `hudBook('${sp.id}')`}" ${lock ? '' : `oncontextmenu="event.preventDefault();sendAction('menuAt',{k:'spell',id:'${sp.id}',x:event.clientX,y:event.clientY})"`} style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;${dim ? 'cursor:default;' : ''}${sp.kind === 'attack' && s.cbSpell === sp.id ? 'outline:2px solid #ba8950;outline-offset:-2px;' : ''}">${spellIcon(sp, 38, dim)}<b class="nh-num" style="position:absolute;left:2px;top:0;font-size:10px;line-height:1;color:${low ? '#ff9a84' : '#f2e6cf'};text-shadow:-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000">${sp.level || ''}</b>${lock ? '<span style="position:absolute;right:1px;bottom:0;font-size:11px;line-height:1;filter:drop-shadow(0 0 1px #000)">🔒</span>' : Number.isFinite(n) && n > 0 ? `<b class="nh-num" style="position:absolute;right:2px;bottom:0;font-size:10px;line-height:1;color:#9fd8ff;text-shadow:-1px 0 #000,1px 0 #000,0 -1px #000,0 1px #000">${n > 99 ? '99+' : n}</b>` : ''}</button>`;
  }).join('');
  return `<div style="max-height:min(520px,calc(100vh - var(--spawn-safe-area-top,0px) - var(--spawn-safe-area-bottom,0px) - 360px));min-height:120px;overflow-y:auto;overscroll-behavior:contain;padding-right:3px"><div style="display:grid;grid-template-columns:repeat(7,38px);gap:3px;justify-content:center">${cells}</div></div>`
    + `<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:7px;padding-top:5px;border-top:1px solid rgba(186,137,80,.35)"><span>✨ Magic ${magic}</span><span style="color:#9fd8ff">runes from your pack</span></div>`
    + `<div style="font-size:11px;opacity:.65;margin-top:4px;text-align:center">drag a spell onto your bar · the small number is how many casts your runes allow</div>`;
}
function menuBody() {
  const b = (label, js) => `<button class="h4-slot" onclick="${js}" style="width:100%;height:36px;margin-bottom:5px;font-family:Georgia,serif;font-size:14px;color:#f2e6cf;letter-spacing:.08em">${label}</button>`;
  return b('Skills (K)', "hudToggle('skills')") + b('Character (P)', "hudToggle('character')") + b('Backpack (B)', "hudToggle('bags')") + b('Options (O)', "hudToggle('gamemenu');sendAction('options')") + b('Back to the hall', "hudToggle('gamemenu')");
}
export function pane(player, ui, id, ctx) {
  try {
    if (!UI4.windows || !id || !WINDOWS[id]) return '';
    const w = WINDOWS[id], s = player?.state ?? {}, slot = slotOf(ui, id);
    const next = SLOTS[(SLOTS.indexOf(slot) + 1) % SLOTS.length];
    if (id === 'bags') return backpack(s, ANCHOR.bags); // creator 2026-10-09: the new backpack
    if (id === 'character') return charSheet(ctx, player, ANCHOR.character.replace(/max-height:[^;]*$/, '')); // creator 2026-10-09: his sheet art
    const body = id === 'skills' ? skillsBody(s, ui, ctx) : id === 'bags' ? bagsBody(s) : id === 'character' ? charBody(ctx, player) : id === 'spellbook' ? spellBody(s) : id === 'prayer' ? prayerBody(s) : menuBody();
    const anch = ANCHOR[id], at = anch ?? POS[slot];
    const keyName = w.key.length === 1 ? w.key.toUpperCase() : w.key;
    return `<div id="win-${id}" data-modal class="h4-plate h4-win" data-v="${BUILD}" data-slot="${slot}" style="position:fixed;${at};z-index:58;pointer-events:auto;padding:10px 12px">
      <div class="h4-title" style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="flex:1">${w.rune} ${esc(w.title.toUpperCase())} <span style="opacity:.5;font-size:11px">${esc(keyName)}</span></span>
      ${anch ? '' : `<button id="dock-${id}" class="h4-x" title="move to the ${next}" onclick="hudDock('${id}','${next}')">${DOCK[next]}</button>`}
      <button id="x-${id}" class="h4-x" title="close" onclick="hudToggle('${id}')">✕</button></div>${body}</div>`;
  } catch (e) { return ''; }
}
// OSRS side panel (ui/hud/osrs.js): the Magic tab reuses the book
export const spellBodyOS = (s) => spellBody(s);
