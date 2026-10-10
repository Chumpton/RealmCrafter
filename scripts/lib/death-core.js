// S15 death: keep the DEATH.keep most valuable items (OSRS "keep 3"), the rest and all coins go to a gravestone. Pure.
import { valueOf } from './data/shop.js';
export function splitDeath(inv, coins, keep, equip0 = {}) { // pack AND worn gear compete for the kept slots (OSRS); the rest of both goes to the grave
  const { ammo, ...equip } = equip0 ?? {}; // equip.ammo is only the quiver pick (a supplies key), not an item
  const cand = [
    ...inv.map((it, i) => (it ? { src: 'inv', i, id: it.id, v: valueOf(it.id) } : null)),
    ...Object.entries(equip ?? {}).map(([slot, id], k) => ({ src: 'eq', slot, id, v: valueOf(id), i: 1000 + k })),
  ].filter(Boolean).sort((a, b) => b.v - a.v || a.i - b.i);
  const kept = cand.slice(0, keep), lost = cand.slice(keep);
  const keepInv = new Set(kept.filter((x) => x.src === 'inv').map((x) => x.i)), keepEq = new Set(kept.filter((x) => x.src === 'eq').map((x) => x.slot));
  return { inv: inv.map((it, i) => (it && keepInv.has(i) ? it : null)), equip: { ...Object.fromEntries(Object.entries(equip).filter(([s]) => keepEq.has(s))), ...(ammo ? { ammo } : {}) }, lost: lost.map((x) => x.id), coins: coins | 0 };
}
// the grave gives back what fits; the rest stays: { inv, items, coins, taken }
export function openGrave(inv, items, coins) {
  const next = inv.slice(), left = [];
  for (const id of items) { const i = next.indexOf(null); if (i < 0) left.push(id); else next[i] = { id }; }
  return { inv: next, items: left, coins, taken: items.length - left.length };
}
