// PHONE HUD (creator Oct 9, "ultimate mobile design"): touch screens only.
// top-left: the tool rail (☰ opens it): hide props, admin, teleport, map for builders; character for everyone.
// bottom, between the d-pad and the USE/JUMP chips: the skill hotbar (2×3 on a portrait phone, one row on landscape).
// bottom-right above the chips: the emote button and its fan.
// Open/closed is this screen's alone (module vars + a class flip), never sent.
import { ITEMS } from './admin.js';
import { EMOTES } from '../../scripts/lib/data/emotes.js';
import { spellOfBar } from '../../scripts/lib/data/spellbook.js';
import { esc } from '../../scripts/lib/esc.js';

export const PH = { tools: false, adm: false, emo: false };
const OWNER = 'pa_d69d1b1f0d7352adedf69f2ee39457a4';
const CSS = `<style>
#ph{--wal:#2e2216;--hon:#ba8950;--lin:#f2e6cf;--ink:#140c07;font-family:Georgia,serif;color:var(--lin)}
#ph .pb{width:46px;height:46px;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:0;border:2px solid var(--hon);border-radius:8px;background:linear-gradient(#4a3a26,#2e2216);box-shadow:inset 0 0 0 1px var(--ink),0 3px 6px rgba(0,0,0,.45);color:var(--lin);font:20px/1 Georgia,serif;pointer-events:auto;touch-action:manipulation}
#ph .pb small{font:600 8px/1 system-ui,sans-serif;letter-spacing:.04em;margin-top:2px;color:#e2b673}
#ph .pb:active,#ph .pb.on{background:linear-gradient(#ba8950,#8a6234);color:var(--ink)}
#ph-tools{position:fixed;left:calc(var(--spawn-safe-area-left,0px) + 10px);top:calc(var(--spawn-safe-area-top,0px) + 50px);display:flex;flex-direction:column;gap:6px;z-index:62}
#ph-tools .more{display:none;flex-direction:column;gap:6px}#ph-tools.open .more{display:flex}
#ph-adm{position:fixed;left:calc(var(--spawn-safe-area-left,0px) + 64px);top:calc(var(--spawn-safe-area-top,0px) + 50px);display:none;flex-direction:column;gap:2px;padding:6px;max-height:70vh;overflow-y:auto;width:min(240px,calc(100vw - 140px));border:2px solid var(--hon);border-radius:8px;background:rgba(24,18,11,.97);box-shadow:inset 0 0 0 1px var(--ink),0 8px 20px rgba(0,0,0,.6);pointer-events:auto;z-index:62}
#ph-adm.open{display:flex}
#ph-adm button{display:flex;align-items:center;gap:10px;min-height:42px;padding:6px 10px;border:0;border-radius:5px;background:none;color:var(--lin);font:15px Georgia,serif;text-align:left}
#ph-adm button:active{background:rgba(186,137,80,.3)}#ph-adm i{width:22px;font-style:normal;text-align:center;color:#ffcf6e}
#ph-bar{position:fixed;left:calc(50% + 6px);transform:translateX(-50%);bottom:calc(var(--spawn-safe-area-bottom,0px) + 14px);display:grid;grid-template-columns:repeat(2,36px);gap:4px;z-index:61;pointer-events:none}
#ph-bar .pb{width:36px;height:40px;font-size:17px;border-radius:7px}
#ph-bar .pb.empty{opacity:.35}
@media (orientation:landscape){#ph-bar{grid-template-columns:repeat(6,44px)}#ph-bar .pb{width:44px;height:44px}}
#ph-emo{position:fixed;right:14px;bottom:calc(var(--spawn-safe-area-bottom,0px) + 178px);z-index:61}
#ph-fan{position:fixed;right:68px;bottom:calc(var(--spawn-safe-area-bottom,0px) + 140px);display:none;grid-template-columns:repeat(4,48px);gap:5px;padding:6px;border:2px solid var(--hon);border-radius:8px;background:rgba(24,18,11,.95);pointer-events:auto;z-index:62}
#ph-fan.open{display:grid}#ph-fan .pb{width:48px;height:48px;font-size:19px}
@media (orientation:landscape){#ph-emo{bottom:calc(var(--spawn-safe-area-bottom,0px) + 150px);right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 16px)}#ph-fan{right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 70px);bottom:calc(var(--spawn-safe-area-bottom,0px) + 110px)}}
</style>`;
const btn = (icon, label, js, extra = '') => `<button class="pb${extra}" onclick="${js}">${icon}<small>${label}</small></button>`;
function slot(v) {
  const sp = spellOfBar(v);
  if (sp) return btn(esc(sp.icon ?? '✦'), esc(String(sp.name ?? '').slice(0, 7)), `hudCast('${sp.id}')`);
  if (v === 'campfire') return btn('🔥', 'FIRE', "sendAction('campfire')");
  return '';
}
export function phoneHud(player) {
  if (!player) return '';
  const ed = !!player.isEditor, s = player.state ?? {};
  const tools = `<div id="ph-tools" class="${PH.tools ? 'open' : ''}">${btn(PH.tools ? '✖️' : '🧰', 'TOOLS', 'phTools()')}<div class="more">`
    + btn('🧍', 'CHAR', "sendAction('wardrobe')")
    + (ed ? btn('◐', 'PROPS', "sendAction('propsHide')") + btn('ᚱ', 'TRAVEL', "sendAction('travelPanel')") + btn('🗺', 'MAP', "sendAction('huginnMap')") + btn('⚒', 'ADMIN', 'phAdm()', PH.adm ? ' on' : '') : '')
    + `</div></div>`;
  const adm = ed ? `<div id="ph-adm" class="${PH.adm && PH.tools ? 'open' : ''}" data-modal>${ITEMS.filter((r) => r[1] !== 'Keeper' || player.userId === OWNER).map(([ic, lab, , act]) => `<button onclick="phAdm();${act}"><i>${ic}</i>${lab}</button>`).join('')}</div>` : '';
  const bar = (Array.isArray(s.ui?.bar) ? s.ui.bar : []).map(slot).filter(Boolean);
  if (!bar.some((h) => h.includes("'campfire'"))) bar.push(slot('campfire'));
  bar.push(btn('⚔', 'SKILLS', "sendAction('skillsPanel')"));
  const cells = bar.slice(0, 6); while (cells.length < 6) cells.push(`<button class="pb empty" disabled></button>`);
  const fan = `<div id="ph-fan" class="${PH.emo ? 'open' : ''}">${EMOTES.map((e) => btn(e.icon ?? '☺', esc(e.name).slice(0, 6), `phEmo();sendAction('emote',{id:'${e.id}'})`)).join('')}</div>`;
  return CSS + `<div id="ph">${tools}${adm}<div id="ph-bar">${cells.join('')}</div><div id="ph-emo">${btn('😊', 'EMOTE', 'phEmo()', PH.emo ? ' on' : '')}</div>${fan}</div>`;
}
const flip = (id, on) => { try { document.getElementById(id)?.classList.toggle('open', on); } catch (e) {} };
export function phToolsT() { PH.tools = !PH.tools; if (!PH.tools) PH.adm = false; flip('ph-tools', PH.tools); flip('ph-adm', PH.adm && PH.tools); }
export function phAdmT() { PH.adm = !PH.adm; flip('ph-adm', PH.adm && PH.tools); }
export function phEmoT() { PH.emo = !PH.emo; flip('ph-fan', PH.emo); }
