// S14: the Shop window, drawn by ui.js while player.state.shopAt is set. Click a wares row to buy, a pack slot to sell. Never throws.
import { SHOPS, stockOf } from './data/shop.js';
import { RUNE_BY_ID } from './data/runes.js';
import { ITEMS } from './data/skills.js';
import { normInv } from './skills-core.js';
import { sellPrice, askPrice, shelfMap } from './shop-core.js';
import { sellable } from './data/shop.js';
import { esc } from './esc.js';
const RAIL = 'calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px)';
const btn = 'cursor:pointer;display:flex;justify-content:space-between;padding:3px 6px;background:#3d2b1e;border:1px solid #241810;border-radius:3px;color:#f2e6cf;font:12px Georgia,serif;width:100%;margin-bottom:3px';
export function shopHud(ctx, player) {
  try {
    const s = player?.state; if (!s?.shopAt) return '';
    const coins = s.supplies?.coins | 0, inv = normInv(s.inv);
    const shop = SHOPS[s.shopAt.shop] ? s.shopAt.shop : 'general', nameOf = (id) => ITEMS[id]?.name ?? RUNE_BY_ID[id]?.name ?? id, stk = shop === 'runes' ? null : shelfMap(ctx.world?.state, shop, ctx.now?.() ?? 0);
    const qb = 'cursor:pointer;background:#5a3b22;border:1px solid #241810;border-radius:3px;color:#f2e6cf;font:11px Georgia,serif;padding:0 5px;white-space:nowrap';
    const qty = (act, key, n, label) => `<button onclick="sendAction('${act}',{${key},n:${n}})" style="${qb}">${label}</button>`;
    const ask = (r) => askPrice(shop, r, stk);
    const wares = stockOf(shop).map((r) => `<div style="display:flex;gap:3px;margin-bottom:3px"><button onclick="sendAction('shopBuy',{id:'${r.id}'})" oncontextmenu="event.preventDefault();sendAction('menuAt',{k:'buy',id:'${r.id}',x:event.clientX,y:event.clientY})" style="${btn};flex:1;width:auto;margin:0;${coins < ask(r) || (stk && !(stk[r.id] > 0)) ? 'opacity:.5' : ''}"><span>${esc(nameOf(r.id))}${r.sup ? ` <i style="opacity:.6">(${s.supplies?.[r.id] | 0})</i>` : stk ? ` <i style="opacity:.6">(${stk[r.id]})</i>` : ''}</span><span style="color:#ba8950">${ask(r)} gp</span></button>${(r.sup ? [10, 50, 100] : [5, 10]).map((n) => qty('shopBuy', `id:'${r.id}'`, n, 'x' + n)).join('')}</div>`).join('');
    const mine = shop === 'runes' ? Object.keys(RUNE_BY_ID).filter((id) => (s.supplies?.[id] | 0) > 0).map((id) => `<div style="display:flex;gap:3px;margin-bottom:3px"><button onclick="sendAction('shopSell',{id:'${id}',n:1})" style="${btn};flex:1;width:auto;margin:0"><span>${esc(RUNE_BY_ID[id].name)} (${s.supplies[id]})</span><span style="color:#9baf84">${Math.floor(RUNE_BY_ID[id].value * SHOPS.runes.buyBack)} gp</span></button>${qty('shopSell', `id:'${id}'`, 10, 'x10')}${qty('shopSell', `id:'${id}'`, 1000000, 'all')}</div>`).join('') : inv.map((it, i) => (it && sellable(it.id) ? `<button onclick="sendAction('shopSell',{i:${i}})" oncontextmenu="event.preventDefault();sendAction('menuAt',{k:'sell',i:${i},x:event.clientX,y:event.clientY})" style="${btn}"><span>${esc(ITEMS[it.id]?.name)}</span><span style="color:#9baf84">${sellPrice(it.id, shop, stk)} gp</span></button>` : '')).join('');
    return `<div id="shop-panel" data-modal style="position:fixed;right:${RAIL};top:50%;transform:translateY(-50%);width:260px;box-sizing:border-box;padding:10px 12px;max-height:calc(100vh - 48px);overflow-y:auto;background:#343c43;border:2px solid #4f3828;border-radius:6px;color:#f2e6cf;font-family:Georgia,serif;pointer-events:auto;z-index:7">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="letter-spacing:.14em;color:#ba8950;font-size:12px">${SHOPS[shop].title}</span><button onclick="sendAction('shopClose')" style="cursor:pointer;background:#5a3b22;color:#f2e6cf;border:0;border-radius:3px">✕</button></div>
      <div style="font-size:12px;margin-bottom:6px">You carry <b style="color:#ba8950">${coins}</b> coins</div>
      <div style="font-size:11px;opacity:.7;margin-bottom:3px">For sale</div>${wares}
      <div style="font-size:11px;opacity:.7;margin:6px 0 3px">Sell from your pack</div>${mine || '<div style="font-size:11px;opacity:.6">Nothing the merchant wants.</div>'}
    </div>`;
  } catch { return ''; }
}
