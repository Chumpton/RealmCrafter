// GOAL4-S1 W5 · WOW-HUD: the micro menu (small brass squares) + the bag bar (4 bag slots + the backpack), bottom-right, clear of Spawn's right rail.
// microMenu(ctx, player, openWin) -> HTML string, never throws. Reads only WINDOWS/COMING and player.state.inv; writes nothing.
// Clicks call ui.js page globals only (hudToggle). Classes h4-rune / h4-key are styled by ui/hud/style.js (art lane).
import { BUILD, UI4, WINDOWS, COMING, isWin } from '../../scripts/lib/data/windows.js';
import { axeSvg } from '../../scripts/lib/skills-hud.js';
import { esc } from '../../scripts/lib/esc.js';
import { UIK } from '../../scripts/lib/data/ui-kit.js';
import { kitOn } from './skin.js';
// 3rd Person skin (Options → Interface style): kit icons on slot-empty frames, the row on micro-frame, kit bags; the OSRS path is untouched.
const KIT_MICRO = { character: 'icon-char', skills: 'icon-talents', spellbook: 'icon-spellbook', prayer: 'spell-holy-strike', quests: 'icon-quests', map: 'icon-collections', options: 'icon-settings', gamemenu: 'icon-help' };
const kimg = (n, cls = '') => `<img ${D}${cls ? ` class="${cls}"` : ''} src="${UIK[n]}" alt="" style="display:block;pointer-events:none;image-rendering:auto">`;
const KIT_CSS = () => `<style>
#hud-micro #hud-microbar.nh-tray{border:10px solid #8a6a32;border-image:var(--kit-ns) 32 / 10px stretch;background:linear-gradient(#2c3138,#1b1e23 60%,#15171b) padding-box;box-shadow:none;padding:1px 3px;gap:1px;image-rendering:auto}
#hud-micro #hud-bagbar.nh-tray{border:10px solid #8a6a32;border-image:var(--kit-ns) 32 / 10px stretch;background:linear-gradient(#2c3138,#1b1e23 60%,#15171b) padding-box;box-shadow:none;padding:1px 2px;gap:2px;image-rendering:auto}
#hud-micro #hud-microbar .h4-rune{width:30px!important;height:30px!important;background:linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box!important;border:1px solid transparent!important;border-radius:3px!important;box-shadow:none!important}
#hud-micro .h4-rune img{width:80%;height:80%;object-fit:contain;border-radius:2px}
#hud-micro #hud-microbar .h4-rune:hover{filter:brightness(1.25)}
#hud-micro #hud-microbar .h4-rune.on,#hud-micro #hud-bag.on{box-shadow:0 0 7px 1px rgba(240,207,138,.85)!important}
#hud-micro #hud-bagbar .h4-slot{width:30px!important;height:30px!important;background:linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box!important;border:1px solid transparent!important;box-shadow:none!important;border-radius:3px!important}
#hud-micro #hud-bagbar .h4-slot{transition:filter .15s}#hud-micro #hud-bagbar .h4-slot:hover,#hud-micro #hud-bag:hover{filter:brightness(1.3) drop-shadow(0 0 4px rgba(232,196,106,.7))}#hud-micro .h4-key{top:2px!important;left:2px!important;font-size:10px!important}
#hud-micro #hud-bagbar .h4-slot img{width:78%;height:78%;margin:11%;object-fit:contain;opacity:.4;filter:grayscale(.6)}
#hud-micro #hud-bag{width:40px!important;height:40px!important;background:linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box!important;border:1px solid transparent!important;border-radius:3px!important;box-shadow:none!important}
#hud-micro #hud-bag img{width:84%;height:84%;object-fit:contain}
#hud-micro .h4-key{background:none!important;color:#f2e6cf!important;font-family:Georgia,serif!important;text-shadow:1px 1px 0 #000,-1px -1px 0 #000!important;z-index:2}
#hud-micro #hud-bag-count{font-family:Georgia,serif;color:#f2e6cf;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000!important;z-index:2}
</style>`;

const C = { walnut: '#4f3828', honey: '#ba8950', linen: '#f2e6cf', moss: '#9baf84', ink: '#2a1d13', dark: '#3a2819' };
const INV_SLOTS = 28;
const RUNE = 34, BAG = 48;
const D = `data-v="${BUILD}"`;

// a page title attribute: only text from our own tables, still escaped

function filledOf(player) {
  const inv = player?.state?.inv;
  if (!Array.isArray(inv)) return 0;
  let n = 0;
  for (let i = 0; i < inv.length; i++) if (inv[i]) n++;
  return Number.isFinite(n) ? n : 0;
}

// a leather pouch in the palette: walnut body, honey stitching and drawstring knot, linen highlight-free (flat paint, no gloss)
const pouch = (lit) => `<svg ${D} width="34" height="34" viewBox="0 0 34 34" style="display:block" aria-hidden="true">`
  + `<path ${D} d="M10 9 L24 9 L22 13 Q30 17 29 25 Q28 31 17 31 Q6 31 5 25 Q4 17 12 13 Z" fill="${lit ? '#6b4a30' : '#5c3f29'}" stroke="${C.ink}" stroke-width="1.4" stroke-linejoin="round"/>`
  + `<path ${D} d="M11 13 Q17 15 23 13" fill="none" stroke="${C.honey}" stroke-width="1.6" stroke-linecap="round"/>`
  + `<path ${D} d="M8.5 22 Q17 25.5 25.5 22" fill="none" stroke="${C.honey}" stroke-width="1" stroke-dasharray="1.6 1.6" opacity=".85"/>`
  + `<path ${D} d="M10 9 Q17 6 24 9" fill="none" stroke="${C.dark}" stroke-width="1.6" stroke-linecap="round"/>`
  + `<circle ${D} cx="17" cy="14.2" r="1.9" fill="${C.honey}" stroke="${C.ink}" stroke-width=".8"/>`
  + `<path ${D} d="M16.2 15.8 L14.6 20 M17.8 15.8 L19.4 20" stroke="${C.honey}" stroke-width="1.1" stroke-linecap="round"/>`
  + `</svg>`;

let mk = null, mh = '';
// open: the open window ids (array). The micro row: Character (P), Skills (K), Skill log (L, the skills panel's sendAction), Quests + Map (part 2, greyed),
// Settings (O, sendAction 'options'), Game Menu (F10). Then the bag bar: four bag slots (empty sockets until bags exist) and the backpack (B).
export function microMenu(ctx, player, open) {
  try {
    if (!UI4.frames) return '';
    const raw = Array.isArray(open) ? open : [open], ow = raw.filter(isWin), lit = (id) => raw.includes(id); // raw also carries the 3rd Person side panel's tab (ui.js)
    const filled = filledOf(player), opt = !!player?.state?.optionsOpen, log = !!player?.state?.skillsOpen;
    const kit = kitOn(player);
    const key = `${kit ? 'K' : ''}${raw.join(',')}|${filled}|${opt}|${log}`;
    if (key === mk) return mh;
    const sq = `width:${RUNE}px;height:${RUNE}px;padding:0;display:flex;align-items:center;justify-content:center;font-family:'Cinzel',Georgia,serif;font-size:17px;line-height:1;cursor:pointer;color:${C.linen}`;
    const btn = (id, title, k, face, js, lit) => `<button ${D} class="h4-rune${lit ? ' on' : ''}" type="button" id="${id}" title="${esc(`${title} (${k})`)}" onclick="${js}" style="${sq}">`
      + `<span ${D} class="h4-key">${esc(k)}</span><span ${D} style="pointer-events:none">${face}</span></button>`;
    const win = (id) => { const w = WINDOWS[id]; return w ? btn(`micro-${id}`, w.title, String(w.key).toUpperCase(), kit && KIT_MICRO[id] ? kimg(KIT_MICRO[id]) : esc(w.rune), `hudToggle('${id}')`, ow.includes(id) || (kit && lit(id))) : ''; };
    const LIVE = { quests: { title: 'Quest List', k: 'J', icon: 'icon-quests' }, map: { id: 'friends', title: 'Friends List', k: 'F', icon: 'icon-social' } }; // creator 2026-10-09: no dead grey tiles in 3rd Person
    const live = (c) => { const L = LIVE[c.id], id = L.id || c.id; return btn(`micro-${id}`, L.title, L.k, kimg(L.icon), `hudToggle('${id}')`, lit(id)); };
    const coming = (c) => `<button ${D} class="h4-rune" type="button" id="micro-${esc(c.id)}" title="${esc(c.title)}" disabled aria-disabled="true" style="${sq};cursor:default;opacity:.42;filter:grayscale(1)"><span ${D} style="pointer-events:none">${kit && KIT_MICRO[c.id] ? kimg(KIT_MICRO[c.id]) : esc(c.rune)}</span></button>`;
    let h = (kit ? KIT_CSS() : '') + `<div ${D} id="hud-microbar" class="nh-tray">`
      + win('character') + win('skills') + win('spellbook') + win('prayer')
      + COMING.map((c) => (kit && LIVE[c.id] ? live(c) : coming(c))).join('')
      + btn('nh-opt', 'Settings', 'O', kit ? kimg('icon-settings') : '⚙', "sendAction('options')", opt)
      + win('gamemenu') + `</div>`;
    let bags = '';
    for (let b = 3; b >= 0; b--) bags += `<div ${D} class="h4-slot h4-empty" id="bagslot-${b}" title="${kit ? 'Empty bag slot' : `Bag slot ${b + 1}: empty`}" style="width:30px;height:30px;cursor:default">${kit && UIK['bag-' + b] ? kimg('bag-' + b) : ''}</div>`;
    const bagLit = ow.includes('bags') || (kit && lit('bags')), bw = WINDOWS.bags;
    h += `<div ${D} id="hud-bagbar" class="nh-tray">${bags}`
      + `<button ${D} class="h4-rune${bagLit ? ' on' : ''}" type="button" id="hud-bag" title="${esc(`${bw.title} (${String(bw.key).toUpperCase()})`)}" onclick="hudToggle('bags')" style="position:relative;width:${BAG}px;height:${BAG}px;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer">`
      + `<span ${D} class="h4-key">${esc(String(bw.key).toUpperCase())}</span>` + (kit ? kimg('bag-pack') : pouch(bagLit))
      + `<span ${D} id="hud-bag-count" class="nh-num" style="position:absolute;right:2px;bottom:1px;font-size:10px;line-height:1;color:${filled >= INV_SLOTS ? '#f0b07a' : C.linen};text-shadow:0 1px 0 ${C.ink};pointer-events:none">${filled}/${INV_SLOTS}</span>`
      + `</button></div>`;
    mh = `<div ${D} id="hud-micro">${h}</div>`;
    mk = key;
    return mh;
  } catch (e) { return ''; }
}
