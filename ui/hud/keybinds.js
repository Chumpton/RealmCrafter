// KEYBINDS (creator 2026-10-05: "create a keybind little 20% opacity visible text UI box"): a quiet key list, desktop only,
// left side under the vitals frame. Never takes a click (pointer-events none). Keys mirror world.config.yaml inputs.
import { settingOf } from '../../scripts/lib/settings-core.js';
const PLAY = [
  ['WASD', 'move'], ['Space', 'jump'], ['Shift', 'run (hold)'], ['R', 'run toggle'], ['E', 'interact'],
  ['LMB', 'use'], ['RMB', 'menu'], ['F', 'attack'], ['Q', 'next target'], ['H', 'stop'],
  ['K', 'skills'], ['B', 'bags'], ['P', 'character'], ['N', 'spellbook'], ['I', 'prayer'],
  ['M', 'map'], ['V', 'view'], ['Z', 'horse'], ['O', 'options'], ['G', 'savi watch'], ['U', 'hide this list'], ['Shift+↓', 'close all windows'],
];
const EDIT = [['F6', 'move anything'], ['Y', 'light arm'], ['J', 'light drop'], ['F8', 'wake savi']];
// creator 2026-10-06: the reference's style: dark green slate, iron corner studs, glowing gold keys, cream actions
const STONE = '/cdn/value.0efa3bc51ce2d36ed284d6ae39f682962d7dbf987ab5067c07c355a189366796.png';
const KCSS = `<style>
#keybinds{position:fixed;left:14px;pointer-events:none;z-index:5;box-sizing:border-box;min-width:220px;padding:10px 16px 10px 14px;border-radius:5px;
 background:linear-gradient(rgba(10,14,10,.35),rgba(10,14,10,.5)),url('${STONE}') center/260px;border:3px solid #1a1712;
 box-shadow:inset 0 0 0 1px #5a5040,inset 0 0 18px rgba(0,0,0,.75),0 4px 12px rgba(0,0,0,.6);font-family:Georgia,'Times New Roman',serif;font-size:15.5px;line-height:1.6}
#keybinds .st{position:absolute;width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#b8ad98,#5b5244 55%,#1e1a14);box-shadow:0 0 0 1px #0c0a07}
#keybinds .st.a{left:3px;top:3px}#keybinds .st.b{right:3px;top:3px}#keybinds .st.c{left:3px;bottom:3px}#keybinds .st.d{right:3px;bottom:3px}
#keybinds .r{display:flex;white-space:nowrap}
#keybinds .r b{display:inline-block;min-width:68px;color:#ffcf6e;font-weight:700;text-shadow:0 0 4px rgba(255,190,80,.9),0 0 10px rgba(255,160,50,.45),1px 1px 0 #000}
#keybinds .r span{color:#efe6d2;text-shadow:1px 1px 1px #000}
#keybinds .sep{margin:5px -4px 4px;height:2px;background:linear-gradient(90deg,transparent,#8a7a5a 15%,#c9b07a 50%,#8a7a5a 85%,transparent);box-shadow:0 1px 0 #000}
</style>`;
const row = ([k, a]) => `<div class="r"><b>${k}</b><span>${a}</span></div>`;
// a left-slot window (Skills K, Character P) stands at left:16px (and the Raven Roads travel panel) over this box: the list steps aside while one is open
const YIELD = `<style>html:has(.h4-win[data-slot=left]) #keybinds,html:has(.h4-win[data-slot=left]) #keybinds-hint,html:has(#travel-panel) #keybinds,html:has(#travel-panel) #keybinds-hint,html:has(#den-settings) #keybinds,html:has(#adm-menu) #keybinds,html:has(#wmap) #keybinds{visibility:hidden}</style>`;
let cacheKey = null, cacheHtml = '';
export function keybindsHud(player, top) {
  if (settingOf(player?.state, 'keylist') === false) return ''; // O menu → Controls → Show the key list
  if (!player?.state?.kbShow) return ''; // creator 2026-10-09: no corner pill; U or O → Controls → Key list opens it // creator: a hint that U opens the list, in the stone style
  const ed = !!player?.isEditor, key = `${ed}|${top}`;
  if (key === cacheKey) return cacheHtml;
  cacheKey = key;
  cacheHtml = YIELD + KCSS + `<div id="keybinds" style="top:${top}px"><i class="st a"></i><i class="st b"></i><i class="st c"></i><i class="st d"></i>${PLAY.map(row).join('')}${ed ? `<div class="sep"></div>${EDIT.map(row).join('')}` : ''}</div>`;
  return cacheHtml;
}
