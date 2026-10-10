// creator 2026-10-09: "replace character viewer with this assett": the Character window (P) drawn on Campton's sheet art
// (/cdn/image-u4pbwl2ns.webp, 502 x 645). Every slot, field and tab is placed in % of that picture, so the window scales as one piece.
// Pure: returns HTML. Slots read player.state.equip; a click on a worn piece takes it off (the same 'unequip' action as before).
import { levelOf } from '../../scripts/lib/skills-core.js';
import { CB } from '../../scripts/lib/data/combat.js';
import { SLOT_NAMES } from '../../scripts/lib/data/equip.js';
import { gearOf, defOf } from '../../scripts/lib/equip-core.js';
import { weaponOf, maxHitOf, hitChance } from '../../scripts/lib/combat-core.js';
import { cbLevelOf, combatTab } from '../../scripts/lib/combat-hud.js';
import { esc } from '../../scripts/lib/esc.js';
const ART = '/cdn/image-u4pbwl2ns.webp', W = 502, H = 645;
const pct = (x, y, w, h) => `left:${(x / W * 100).toFixed(2)}%;top:${(y / H * 100).toFixed(2)}%;width:${(w / W * 100).toFixed(2)}%;height:${(h / H * 100).toFixed(2)}%`;
// the art's slot boxes (measured on the sheet): 8 down each side, 5 small inside right, 3 along the bottom
const SIDE_Y = [104, 162, 220, 278, 336, 394, 452, 510];
const LEFT = ['head', 'neck', 'cape', 'body', null, null, null, null];
const RIGHT = ['hands', 'legs', 'feet', 'ring', null, null, null, null];
const BOTTOM = ['weapon', 'shield', 'ammo'];
const SMALL_Y = [110, 152, 194, 236, 278];
const TABS = [['Character', 32, 76, null], ['Reputation', 117, 88, null], ['Skills', 209, 50, "hudToggle('skills')"], ['Honor', 263, 58, null], ['Currency', 325, 80, "hudToggle('bags')"], ['Statistics', 409, 76, null]];
const CSS = `<style>
body:has(#h4-root) #win-character#win-character.cs{position:fixed;z-index:58;pointer-events:auto;padding:0!important;max-height:none!important;width:min(440px,calc((100vh - 150px) * ${(W / H).toFixed(4)}))!important;aspect-ratio:${W}/${H};background:url('${ART}') center/100% 100% no-repeat!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;animation:none!important;font-family:Georgia,'Cinzel',serif;color:#f2e6cf;filter:drop-shadow(0 10px 22px rgba(0,0,0,.6))}
body:has(#h4-root) #win-character#win-character.cs::before,body:has(#h4-root) #win-character#win-character.cs::after{display:none!important}
body:has(#h4-root) #win-character#win-character.cs .a{position:absolute;box-sizing:border-box}
body:has(#h4-root) #win-character#win-character.cs .sl{border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:clamp(8px,1.9vh,11px);line-height:1.05;text-align:center;color:#f2e6cf;text-shadow:0 1px 2px #000}
body:has(#h4-root) #win-character#win-character.cs .sl.on{cursor:pointer;background:radial-gradient(circle at 50% 40%,rgba(226,182,115,.38),rgba(20,14,8,.55));box-shadow:inset 0 0 0 1px rgba(240,213,142,.7)}
body:has(#h4-root) #win-character#win-character.cs .sl.on:hover{box-shadow:inset 0 0 0 2px #f0d58e,0 0 10px rgba(240,200,110,.55)}
body:has(#h4-root) #win-character#win-character.cs .pt{border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%,#4b3624,#1c130c);font:bold 34px/1 Georgia,serif;color:#e2b673}
body:has(#h4-root) #win-character#win-character.cs .pt img{width:100%;height:100%;object-fit:cover}
body:has(#h4-root) #win-character#win-character.cs .nm{display:flex;align-items:center;gap:10px;padding:0 10px;font-size:15px;font-weight:bold;white-space:nowrap;overflow:hidden}
body:has(#h4-root) #win-character#win-character.cs .nm small{font-size:12px;font-weight:normal;color:#e2b673}
body:has(#h4-root) #win-character#win-character.cs .cx{display:flex;align-items:center;justify-content:center;cursor:pointer;color:#f0d58e;font-size:13px}
body:has(#h4-root) #win-character#win-character.cs .cx:hover{color:#fff}
body:has(#h4-root) #win-character#win-character.cs .ctr{overflow:auto;padding:6px 8px;font-size:12px}
body:has(#h4-root) #win-character#win-character.cs .st{display:flex;flex-direction:column;justify-content:space-between;padding:1px 0;font-size:clamp(9px,2vh,13px)}
body:has(#h4-root) #win-character#win-character.cs .st div{display:flex;justify-content:space-between;gap:4px;white-space:nowrap}
body:has(#h4-root) #win-character#win-character.cs .v{display:flex;align-items:center;padding:0 3px 0 14px;background:#1b1f25;border-radius:2px;font-size:clamp(9px,1.9vh,12.5px);font-weight:bold;color:#f2e6cf;white-space:nowrap}
body:has(#h4-root) #win-character#win-character.cs .st b{background:#191d23;padding:0 3px;border-radius:2px}
body:has(#h4-root) #win-character#win-character.cs .st b{color:#f2e6cf;font-weight:bold}
body:has(#h4-root) #win-character#win-character.cs .tb{cursor:pointer;border-radius:3px}
body:has(#h4-root) #win-character#win-character.cs .tb:hover{background:rgba(240,213,142,.15)}
body:has(#h4-root) #win-character#win-character.cs .tb.off{cursor:default}
body:has(#h4-root) #win-character#win-character.cs .tb.off:hover{background:none}
</style>`;
function slot(s, k, x, y, w, h) {
  if (!k) return `<div class="a sl" style="${pct(x, y, w, h)}"></div>`;
  const id = s.equip?.[k], d = id && defOf(id);
  if (!d) return `<div id="cw-eq-${k}" class="a sl" title="${esc(SLOT_NAMES[k] ?? k)}: empty" style="${pct(x, y, w, h)}"></div>`;
  return `<div id="cw-eq-${k}" class="a sl on" title="${esc((SLOT_NAMES[k] ?? k) + ': ' + d.name + ' (click to remove)')}" onclick="sendAction('unequip',{slot:'${k}'})" oncontextmenu="event.preventDefault();sendAction('menuAt',{k:'eq',slot:'${k}',x:event.clientX,y:event.clientY})" style="${pct(x, y, w, h)}">${esc(d.name)}</div>`;
}
export function charSheet(ctx, player, at) {
  const s = player?.state ?? {};
  const name = String(player?.displayName ?? '').slice(0, 32) || 'Wanderer';
  const url = typeof player?.portraitUrl === 'string' ? player.portraitUrl : '';
  const lv = (id) => levelOf(id === 'hitpoints' ? (s.skills?.hitpoints ?? CB.hpStartTenths) : (s.skills?.[id] | 0));
  const cb = Math.round(+cbLevelOf(s) || 3);
  const G = gearOf(s.equip, s.cbWeapon), wp = weaponOf(s.cbWeapon ?? s.equip?.weapon);
  const melee = ['stab', 'slash', 'crush'], defs = ['stab', 'slash', 'crush', 'magic', 'ranged'];
  const armor = Math.max(0, defs.reduce((a, k) => a + (G.def?.[k] | 0), 0));
  const defLv = lv('defence'), atkLv = lv('attack'), strLv = lv('strength');
  const atkPow = Math.max(...melee.map((k) => G.atk?.[k] | 0));
  const maxHit = maxHitOf(strLv + 8, G.str | 0);
  const A = (atkLv + 8) * (atkPow + 64), D = (1 + 8) * 64; // against a level-1 foe with no armour
  const hit = Math.round(hitChance(A, D) * 100);
  const dodge = Math.round(5 + defLv * 0.1), parry = s.equip?.weapon ? Math.round(5 + defLv * 0.1) : 0, block = s.equip?.shield ? Math.round(5 + defLv * 0.15) : 0;
  const spd = ((wp?.speed ?? 4) * 0.6).toFixed(1);
  const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  const port = `<div class="a pt" style="${pct(12, 6, 84, 84)}">${url ? `<img id="cw-portrait" src="${esc(url)}" alt="" onerror="this.remove()">` : esc(Array.from(name)[0]?.toUpperCase() ?? '?')}</div>`;
  let h = CSS + `<div id="win-character" data-modal class="cs" style="${at}">` + port
    + `<div class="a nm" style="${pct(110, 22, 340, 26)}">${esc(name)}<small>Level ${cb}</small></div>`
    + `<div id="x-character" class="a cx" title="close (P)" onclick="hudToggle('character')" style="${pct(466, 20, 22, 24)}">✕</div>`;
  SIDE_Y.forEach((y, i) => { h += slot(s, LEFT[i], 30, y, 50, 50) + slot(s, RIGHT[i], 431, y, 50, 50); });
  SMALL_Y.forEach((y) => { h += `<div class="a sl" style="${pct(378, y, 34, 34)}"></div>`; });
  BOTTOM.forEach((k, i) => { h += slot(s, k, 166 + i * 62, 372, 54, 54); });
  // the middle: your portrait, large and soft, where the art leaves room for the figure
  h += `<div class="a ctr" style="${pct(96, 108, 274, 256)};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;pointer-events:none">`
    + (url ? `<img src="${esc(url)}" alt="" onerror="this.remove()" style="width:62%;aspect-ratio:1;object-fit:cover;border-radius:50%;opacity:.9;box-shadow:0 0 0 2px #8a6a32,0 0 24px rgba(0,0,0,.7)">` : `<div style="font:bold 72px/1 Georgia,serif;color:rgba(226,182,115,.35)">${esc(Array.from(name)[0]?.toUpperCase() ?? '?')}</div>`)
    + `<div style="font-size:12px;color:#c9bfa8">Combat level ${cb} · ${esc(wp?.name ?? 'Fists')}</div></div>`;
  // the numbers: each one over the art's own blank (rows at y 463..539, right edges x 246 and 410)
  const RY = [455, 474, 493, 512, 531];
  const val = (id, v, i, right) => `<b id="${id}" class="a v" style="right:${((W - right) / W * 100).toFixed(2)}%;top:${(RY[i] / H * 100).toFixed(2)}%;height:${(18 / H * 100).toFixed(2)}%">${v}</b>`;
  [armor, `${defLv} / 99`, dodge + '%', parry + '%', block + '%'].forEach((v, i) => { h += val('cw-d' + i, v, i, 247); });
  [`0 - ${maxHit}`, spd + 's', atkPow, hit + '%', '0%'].forEach((v, i) => { h += val('cw-m' + i, v, i, 412); });
  for (const [t, x, w, act] of TABS) h += `<div class="a tb${act || t === 'Character' ? '' : ' off'}" title="${esc(t)}${act || t === 'Character' ? '' : ' (soon)'}" ${act ? `onclick="${act}"` : ''} style="${pct(x, 600, w, 32)}"></div>`;
  return h + `</div>`;
}
