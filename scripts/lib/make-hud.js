// The make window (furnace / anvil; Crafting joins later), drawn by skills-hud.js while player.state.smenu is set. Never throws.
// Rows come from make-core.js recipesAt(); buttons send smith { r, n } and smithClose (make-play.js).
import { ITEMS } from './data/skills.js';
import { levelOf } from './skills-core.js';
import { recipesAt, canMake, countOf } from './make-core.js';
import { esc } from './esc.js';
const GOLD = '#ba8950', INK = '#2a1d13', PARCH = '#f2e6cf', WALNUT = '#4f3828', FONT = 'Georgia,serif';
const TITLE = { furnace: ['🔥', 'WHAT WOULD YOU LIKE TO SMELT?'], anvil: ['🔨', 'WHAT WOULD YOU LIKE TO MAKE?'], craft: ['🧵', 'WHAT WOULD YOU LIKE TO CRAFT?'], tanner: ['🐄', 'TANNER: WHICH LEATHER?'] };
export function makeMenu(s) {
  try {
    const st = s.smenu?.st, inv = s.inv ?? [], [ic, head] = TITLE[st] ?? ['', 'MAKE'];
    const rows = recipesAt(st, ITEMS).map((r) => {
      const L = r.skill ? levelOf(s.skills?.[r.skill] | 0) : 99, can = r.coins ? Math.min(canMake(r, inv), Math.floor((s.supplies?.coins | 0) / r.coins)) : canMake(r, inv), lock = L < r.level, ok = can > 0 && !lock;
      const b = (n, t) => `<button class="skbtn" ${ok ? '' : 'disabled'} onclick="sendAction('smith',{r:'${r.id}',n:${n}})" style="padding:2px 7px;font-size:11px;${ok ? '' : 'opacity:.4;cursor:default'}">${t}</button>`;
      const needs = Object.entries(r.use).map(([id, n]) => `${n} ${esc((ITEMS[id]?.name ?? id).toLowerCase())}`).join(' + ');
      return `<div class="skin" style="display:flex;align-items:center;gap:6px;padding:5px 6px;margin-bottom:4px;${lock ? 'opacity:.5' : ''}">
        <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:bold">${esc(r.name)}</div><div style="font-size:10px;opacity:.75">lvl ${r.level} · ${r.xp ? r.xp + ' xp · ' : ''}${needs}${r.coins ? ` · ${r.coins} gp each` : ''}${r.chance ? ` · ${Math.round(r.chance * 100)} % holds` : ''} · ${lock ? `need ${r.skill ?? ''} ${r.level}` : `can make ${can}`}</div></div>
        ${b(1, '1')}${b(5, '5')}${b(999, 'All')}</div>`;
    }).join('') || `<div style="font-size:12px;opacity:.7;padding:6px">Nothing to make here yet.</div>`;
    const has = (id) => countOf(inv, id) ? '✓' : '✗ (the general store sells one)';
    const tool = st === 'anvil' ? ` · hammer ${has('hammer')}` : st === 'craft' ? ` · needle ${has('needle')} · thread ${has('thread')}` : '';
    return `<div id="mk-menu" data-modal class="skp" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:400px;max-height:70vh;overflow-y:auto;box-sizing:border-box;padding:10px 12px;pointer-events:auto;z-index:8">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:12px;letter-spacing:.16em;color:${GOLD}">${ic} ${head}</span><button class="skbtn" onclick="sendAction('smithClose',{},{relockPointer:true})" style="padding:2px 7px;font-size:11px">✕</button></div>${rows}
      <div style="font-size:10px;opacity:.7;margin-top:4px">${{ furnace: 'Click a furnace with ore in your pack.', anvil: 'Click an anvil with bars in your pack', craft: 'Click a needle or a hide in your pack. One thread lasts 5 items.', tanner: 'Cowhides from cows. You pay in coins.' }[st] ?? ''}${tool}</div></div>`;
  } catch { return ''; }
}
