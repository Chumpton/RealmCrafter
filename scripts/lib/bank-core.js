// The bank (OSRS-style): player.state.bank = { itemId: count }. Pure: pack slots + the bank map in, new ones out. No ctx.
// Pack items are one slot each; the bank stacks every item by id. Coins, runes and arrows live in supplies and never touch the bank.
export const BANK_TYPES = 800; // distinct items the bank holds (OSRS: 800 slots)
const slotsOf = (inv, id) => inv.reduce((a, x, i) => (x?.id === id ? [...a, i] : a), []);
export const bankCount = (bank, id) => bank?.[id] | 0;
export const bankTotal = (bank) => Object.values(bank ?? {}).reduce((n, v) => n + v, 0);
// put up to n copies of the item in slot i (every copy of that id in the pack counts) into the bank
export function deposit(inv, bank, i, n = 1) {
  const it = inv[i]; if (!it) return { err: 'Nothing there to deposit.' };
  const b = { ...(bank ?? {}) }; if (!(it.id in b) && Object.keys(b).length >= BANK_TYPES) return { err: 'Your bank is full.' };
  const take = slotsOf(inv, it.id).slice(0, Math.max(1, n | 0)), next = inv.slice();
  for (const k of take) next[k] = null;
  b[it.id] = (b[it.id] | 0) + take.length;
  return { inv: next, bank: b, n: take.length, id: it.id };
}
// empty the whole pack into the bank; items that do not fit stay in the pack
export function depositAll(inv, bank) {
  let cur = { inv, bank, n: 0 };
  for (let i = 0; i < inv.length; i++) { if (!cur.inv[i]) continue; const r = deposit(cur.inv, cur.bank, i, 1); if (r.err) continue; cur = { inv: r.inv, bank: r.bank, n: cur.n + r.n }; }
  return cur.n ? cur : { err: 'You have nothing to deposit.' };
}
// take up to n copies of an item out, one per free pack slot
export function withdraw(inv, bank, id, n = 1) {
  const have = bankCount(bank, id); if (have < 1) return { err: 'The bank has none of that.' };
  const free = inv.reduce((a, x, i) => (x ? a : [...a, i]), []); if (!free.length) return { err: 'Your inventory is full.' };
  const q = Math.min(Math.max(1, n | 0), have, free.length), next = inv.slice(), b = { ...bank };
  for (let k = 0; k < q; k++) next[free[k]] = { id };
  if (have - q > 0) b[id] = have - q; else delete b[id];
  return { inv: next, bank: b, n: q, id };
}
