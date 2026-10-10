// The generic "make" engine for pack-slot recipes (Smithing now, Crafting next). Pure: slots and rows in, slots out. No ctx.
// A recipe row is { id, skill?, station, level, xp, use: {itemId: n}, make: {itemId: n}, tool?, chance?, coins?, thread? } (data/smith.js, data/craft.js).
import { SMELT, FORGE } from './data/smith.js';
import { CRAFT, TAN } from './data/craft.js';
const ALL = [...SMELT, ...FORGE, ...CRAFT, ...TAN];
export const countOf = (inv, id) => (inv ?? []).reduce((n, x) => n + (x?.id === id ? 1 : 0), 0);
export const recipeById = (id) => ALL.find((r) => r.id === id) ?? null;
// the rows a station offers, for the items the game knows (items = ITEMS)
export const recipesAt = (station, items) => ALL.filter((r) => r.station === station && Object.keys(r.make).every((k) => items[k]));
// how many times in a row the pack can feed r (0 when the tool is missing)
export function canMake(r, inv) {
  if ([].concat(r.tool ?? []).some((t) => !countOf(inv, t))) return 0; // tool: one id or a list (needle + thread)
  return Math.min(...Object.entries(r.use).map(([id, n]) => Math.floor(countOf(inv, id) / n)));
}
// one action: eat the inputs, give the outputs. { inv } (a new array) or { err }. fail = true when the chance roll lost: inputs go, outputs do not.
export function make(r, inv, fail = false) {
  if (canMake(r, inv) <= 0) return { err: 'missing' };
  const next = inv.slice();
  for (const [id, n] of Object.entries(r.use)) for (let k = 0; k < n; k++) next[next.findIndex((x) => x?.id === id)] = null;
  if (!fail) for (const [id, n] of Object.entries(r.make)) for (let k = 0; k < n; k++) { const i = next.indexOf(null); if (i < 0) return { err: 'full' }; next[i] = { id }; }
  return { inv: next };
}
// does r hold this time? roll is a 0..1 random the caller supplies (keeps this pure)
export const holds = (r, roll) => r.chance == null || roll < r.chance;
