// S14: pure shop maths. Each returns { inv, supplies, msg } to write, or { err } (nothing changes).
import { SELL, STEP, MIN_BUY, REGEN_MS, BASE, SHOPS, stockOf, valueOf, sellable } from './data/shop.js';
import { RUNE_BY_ID } from './data/runes.js';
import { ITEMS } from './data/skills.js';
// STOCK (S14 plan section 23): world.state.shopStock = { 'shop:id': { n, at } }, n = copies on the shelf at time `at`. It drifts one a minute back to base on read, so no timer
// and no second writer: the trade that changes a shelf is the only write. A clock that went backwards (room restart) reads as a full reset to base.
export const baseOf = (shop, id) => (stockOf(shop).some((x) => x.id === id) ? BASE[id] ?? 5 : 0);
export function shelfMap(ws, shop, now) {
  const m = {}; for (const r of stockOf(shop)) if (!r.sup) m[r.id] = baseOf(shop, r.id);
  for (const [k, r] of Object.entries(ws?.shopStock ?? {})) {
    if (!k.startsWith(shop + ':')) continue;
    const id = k.slice(shop.length + 1), base = baseOf(shop, id), d = base - r.n, k2 = now >= r.at ? Math.floor((now - r.at) / REGEN_MS) : Infinity;
    m[id] = r.n + Math.sign(d) * Math.min(Math.abs(d), k2);
  }
  return m;
}
export function saveShelf(ws, shop, before, after, now) { // write only the shelves a trade changed (the rest keep their own drift timers)
  const up = {}; for (const id of Object.keys(after)) if (after[id] !== before[id]) up[shop + ':' + id] = { n: after[id], at: now };
  if (Object.keys(up).length) ws.shopStock = { ...ws.shopStock, ...up };
}
// what he asks for a row (130 % rows are priced by data/shop.js; this scales them 3 % per copy away from base, never under half) and what he pays (40 % less 3 % per copy over base, never under 10 %)
export const askPrice = (shop, row, stk) => (stk ? Math.max(1, Math.round(row.price * Math.max(0.5, 1 + STEP * (baseOf(shop, row.id) - (stk[row.id] ?? baseOf(shop, row.id)))))) : row.price);
export const sellPrice = (id, shop, stk) => Math.floor(valueOf(id) * Math.max(MIN_BUY, SELL - (stk ? STEP * Math.max(0, (stk[id] ?? baseOf(shop, id)) - baseOf(shop, id)) : 0)));
export function buy(inv, supplies, id, shop = 'general', n = 1, stk) { // stk (optional, shelfMap) = limited stock; the result carries the new one
  const row = stockOf(shop).find((x) => x.id === id); if (!row) return { err: 'The merchant does not sell that.' };
  if (row.sup) { // a stackable (runes): one supplies count, no pack slot
    const q = Math.max(1, n | 0), cost = row.price * q, have = supplies?.coins | 0; if (have < cost) return { err: "You don't have enough coins." };
    return { inv, supplies: { ...supplies, coins: have - cost, [id]: (supplies?.[id] | 0) + q }, msg: `You buy ${q} ${RUNE_BY_ID[id]?.name.toLowerCase() ?? id}${q === 1 ? '' : 's'} for ${cost} coin${cost === 1 ? '' : 's'}.` };
  }
  if (stk && !(stk[id] > 0)) return { err: 'The merchant is out of that.' };
  const price = askPrice(shop, row, stk), coins = supplies?.coins | 0; if (coins < price) return { err: "You don't have enough coins." };
  const i = inv.indexOf(null); if (i < 0) return { err: 'Your inventory is too full to hold any more.' };
  const next = inv.slice(); next[i] = { id };
  return { inv: next, supplies: { ...supplies, coins: coins - price }, stk: stk && { ...stk, [id]: stk[id] - 1 }, msg: `You buy a ${ITEMS[id].name.toLowerCase()} for ${price} coin${price === 1 ? '' : 's'}.` };
}
// sell stackable runes back to the rune shop at its buy-back rate
export function sellSupply(supplies, id, n = 1, shop = 'runes') {
  const r = RUNE_BY_ID[id], rate = SHOPS[shop]?.buyBack; if (!r || !rate) return { err: 'The merchant is not interested in that.' };
  const q = Math.min(Math.max(1, n | 0), supplies?.[id] | 0); if (q < 1) return { err: 'You have none to sell.' };
  const p = Math.floor(r.value * rate) * q;
  return { supplies: { ...supplies, [id]: (supplies[id] | 0) - q, coins: (supplies?.coins | 0) + p }, msg: `You sell ${q} ${r.name.toLowerCase()}${q === 1 ? '' : 's'} for ${p} coin${p === 1 ? '' : 's'}.` };
}
export function sell(inv, supplies, i, shop = 'general', stk) {
  const it = inv[i]; if (!it) return { err: 'Nothing there to sell.' };
  if (!sellable(it.id)) return { err: 'The merchant is not interested in that.' };
  const p = sellPrice(it.id, shop, stk), next = inv.slice(); next[i] = null;
  return { inv: next, supplies: { ...supplies, coins: (supplies?.coins | 0) + p }, stk: stk && { ...stk, [it.id]: (stk[it.id] ?? baseOf(shop, it.id)) + 1 }, msg: `You sell the ${ITEMS[it.id].name.toLowerCase()} for ${p} coin${p === 1 ? '' : 's'}.` };
}
