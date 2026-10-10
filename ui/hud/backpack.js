// creator 2026-10-09: "change bags with these as reference but tighter and less blank space and a money counter bottom bar"
// (refs /cdn/image-u08tuji5y.webp, /cdn/image-u3jhj444y.webp). Drawn in CSS: slate plate, gold header plaque with the round crest,
// red close, a search line that dims what doesn't match, 7 x 4 gold-rimmed slots edge to edge, coins on the bottom bar. Pure HTML.
import { invCell } from '../../scripts/lib/skills-hud.js';
import { SK } from '../../scripts/lib/data/skills.js';
import { esc } from '../../scripts/lib/esc.js';
const P = 'body:has(#h4-root) #win-bags#win-bags.bp';
const CSS = `<style>
${P}{position:fixed;z-index:58;pointer-events:auto;width:auto!important;max-height:none!important;overflow:visible!important;padding:34px 10px 10px!important;border:0!important;border-radius:8px!important;border-image:none!important;
  background:linear-gradient(#262b33,#181c21)!important;box-shadow:inset 0 0 0 1px #4a4232,inset 0 0 0 3px #101317,inset 0 0 0 4px #6b5730,0 10px 26px rgba(0,0,0,.65)!important;animation:none!important;font-family:Georgia,'Cinzel',serif;color:#f2e6cf}
${P}::before,${P}::after{display:none!important}
${P} .bp-crest{position:absolute;left:-14px;top:-16px;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#2a3038,#0f1215);box-shadow:0 0 0 3px #8a5a3a,0 0 0 5px #2a1a10,0 3px 8px #000;display:flex;align-items:center;justify-content:center;font-size:22px}
${P} .bp-hd{position:absolute;left:30px;right:30px;top:6px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:3px;background:linear-gradient(#2c323b,#1b1f25);box-shadow:inset 0 0 0 1px #c9a24a,inset 0 0 0 2px #15181c;font:700 15px/1 'Cinzel',Georgia,serif;letter-spacing:.04em;color:#f0d58e;text-shadow:0 1px 2px #000}
${P} .bp-x{position:absolute;right:6px;top:5px;width:24px;height:24px;padding:0!important;border-radius:3px!important;border:0!important;cursor:pointer;background:linear-gradient(#a3281c,#5e120b)!important;box-shadow:inset 0 0 0 1px #e8c46a,inset 0 0 0 2px #3a0a06!important;color:#f0d58e!important;font:900 13px/24px Georgia,serif}
${P} .bp-x:hover{filter:brightness(1.2)}
${P} .bp-q{display:flex;align-items:center;gap:6px;height:22px;margin:0 0 6px;padding:0 7px;border-radius:3px;background:#101317;box-shadow:inset 0 0 0 1px #3d4450,inset 0 2px 4px #000}
${P} .bp-q i{font-style:normal;color:#8a93a0;font-size:12px}
${P} .bp-q input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#e6dcc8;font:13px Georgia,serif}
${P} .bp-q input::placeholder{color:#6f7782}
${P} .bp-g{display:grid;grid-template-columns:repeat(7,40px);gap:3px;padding:4px;border-radius:3px;background:#0e1114;box-shadow:inset 0 0 0 1px #8a6a32,0 0 0 1px #000}
${P} .bp-g .h4-slot{width:40px!important;height:40px!important;opacity:1!important;border:0!important;border-radius:4px!important;background:radial-gradient(circle at 50% 40%,#2b313a,#171a1f)!important;box-shadow:inset 0 0 0 1px #c9a24a,inset 0 0 0 2px #1a140c,inset 0 3px 6px rgba(0,0,0,.6)!important}
${P} .bp-g .h4-slot[title]:not([title="empty"]):hover{box-shadow:inset 0 0 0 2px #f0d58e,0 0 8px rgba(240,200,110,.5)!important}
${P} .bp-g .h4-slot.on{box-shadow:inset 0 0 0 2px #f0d58e,0 0 7px rgba(240,207,138,.8)!important}
${P} .bp-g .h4-slot.dim{opacity:.25!important}
${P} .bp-ft{display:flex;align-items:center;justify-content:space-between;height:24px;margin-top:6px;padding:0 8px;border-radius:3px;background:linear-gradient(#232830,#15181c);box-shadow:inset 0 0 0 1px #8a6a32,inset 0 0 0 2px #0e1114;font-size:12px}
${P} .bp-ft span{color:#a59c8a}
${P} .bp-ft b{display:flex;align-items:center;gap:5px;color:#f0d58e;font-weight:bold}
${P} .bp-ft b i{display:inline-block;width:11px;height:11px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3c4,#e8b94a 45%,#8a5a12);box-shadow:0 0 0 1px #3a2408}
</style>`;
export function backpack(s, at) {
  const inv = Array.isArray(s.inv) ? s.inv : [], n = SK.invSlots ?? 28;
  let cells = ''; for (let i = 0; i < n; i++) cells += invCell(s, i, 40);
  const coins = Math.max(0, (s.supplies?.coins ?? 0) | 0);
  const filt = "var q=this.value.toLowerCase();this.closest('.bp').querySelectorAll('.bp-g .h4-slot').forEach(function(c){var t=(c.title||'').toLowerCase();c.classList.toggle('dim',!!q&&(t==='empty'||t.indexOf(q)<0))})";
  return CSS + `<div id="win-bags" data-modal class="bp" style="${at}">`
    + `<div class="bp-crest">🎒</div><div class="bp-hd">Backpack</div><button id="x-bags" class="bp-x" title="close (B)" onclick="hudToggle('bags')">✕</button>`
    + `<label class="bp-q"><i>⌕</i><input id="bp-search" type="text" placeholder="Search" oninput="${filt}" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()"></label>`
    + `<div class="bp-g">${cells}</div>`
    + `<div class="bp-ft"><span>${inv.filter(Boolean).length} / ${n}</span><b id="bag-coins" title="Coins">${coins.toLocaleString('en-US')} <i></i></b></div></div>`;
}
