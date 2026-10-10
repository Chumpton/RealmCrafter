// The bank window, drawn by skills-hud.js while player.state.bankAt is set. Left: what the bank holds (withdraw 1 / 5 / 10 / All). Right: your pack grouped by item (deposit 1 / All).
// Buttons send bankWithdraw { id, n }, bankDeposit { i, n }, bankDepositAll, bankClose (lib/bank-play.js). Never throws.
import { ITEMS } from './data/skills.js';
import { esc } from './esc.js';
const GOLD = '#ba8950', FONT = 'Georgia,serif';
const nm = (id) => ITEMS[id]?.name ?? id;
export function bankMenu(s) {
  try {
    const bank = Object.entries(s.bank ?? {}).sort((a, b) => nm(a[0]).localeCompare(nm(b[0])));
    const inv = s.inv ?? [], groups = [];
    inv.forEach((x, i) => { if (!x) return; const g = groups.find((q) => q.id === x.id); if (g) g.n++; else groups.push({ id: x.id, i, n: 1 }); });
    const b = (act, d, t) => `<button class="skbtn" onclick="sendAction('${act}',${d})" style="padding:1px 6px;font-size:11px">${t}</button>`;
    const row = (label, count, btns) => `<div class="skin" style="display:flex;align-items:center;gap:4px;padding:3px 6px;margin-bottom:3px"><div style="flex:1;min-width:0;font-size:12px">${esc(label)} <span style="opacity:.65">×${count}</span></div>${btns}</div>`;
    const left = bank.map(([id, n]) => row(nm(id), n, [1, 5, 10].map((q) => b('bankWithdraw', `{id:'${esc(id)}',n:${q}}`, q)).join('') + b('bankWithdraw', `{id:'${esc(id)}',n:100000}`, 'All'))).join('') || '<div style="font-size:12px;opacity:.7;padding:6px">The bank is empty.</div>';
    const right = groups.map((g) => row(nm(g.id), g.n, b('bankDeposit', `{i:${g.i},n:1}`, '1') + b('bankDeposit', `{i:${g.i},n:100000}`, 'All'))).join('') || '<div style="font-size:12px;opacity:.7;padding:6px">Your pack is empty.</div>';
    const used = inv.filter(Boolean).length;
    return `<div id="bk-menu" data-modal class="skp" style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:560px;max-width:92vw;max-height:72vh;box-sizing:border-box;padding:10px 12px;pointer-events:auto;z-index:8;font-family:${FONT}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:12px;letter-spacing:.16em;color:${GOLD}">🏦 THE BANK</span><span><button class="skbtn" onclick="sendAction('bankDepositAll',{})" style="padding:2px 7px;font-size:11px">Deposit all</button> <button class="skbtn" onclick="sendAction('bankClose',{},{relockPointer:true})" style="padding:2px 7px;font-size:11px">✕</button></span></div>
      <div style="display:flex;gap:10px"><div style="flex:1;min-width:0;max-height:56vh;overflow-y:auto"><div style="font-size:11px;opacity:.7;margin-bottom:3px">In the bank (${bank.length})</div>${left}</div>
      <div style="flex:1;min-width:0;max-height:56vh;overflow-y:auto"><div style="font-size:11px;opacity:.7;margin-bottom:3px">Your pack (${used}/28)</div>${right}</div></div></div>`;
  } catch { return ''; }
}
