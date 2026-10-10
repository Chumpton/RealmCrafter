// S13 ground loot, pure: what a kill leaves on the ground, and what picking one up does. (plan: loot lies where the monster died;
// only the top damage dealer sees it for 60 s, then everyone; gone at 2 min, 3 min for untradeable items.)
import { MON_ITEMS, MON_SUPPLIES, LOOT } from './data/monsters.js';
import { ITEMS } from './data/skills.js';
import { GA } from './data/gather.js';
const KIND = { bones: 'bone', 'big-bones': 'bone', cowhide: 'hide', 'raw-chicken': 'meat', 'raw-beef': 'meat' };
const kindOf = (key, id) => (key === 'sup' ? (id === 'coins' ? 'coins' : id === 'feathers' ? 'feathers' : 'rune') : KIND[id] ?? (/^energy-/.test(id) ? 'potion' : 'box'));
export function lootList(p) { // -> [{ key: 'item' | 'sup', id, n, name, kind, color, life }]
  const out = [];
  for (const id of p.items ?? []) if (MON_ITEMS[id] || ITEMS[id]) out.push({ key: 'item', id, n: 1, name: (ITEMS[id] ?? MON_ITEMS[id]).name, kind: kindOf('item', id), color: (ITEMS[id] ?? MON_ITEMS[id]).color ?? '#c8c0a8', life: LOOT.untradeable.includes(id) ? LOOT.lifeUntradeable : LOOT.life });
  const f = Math.max(0, Math.min(15, p.feathers | 0)); if (f) out.push({ key: 'sup', id: 'feathers', n: f, name: `${f} feathers`, kind: 'feathers', color: '#f2eee0', life: LOOT.life });
  for (const [k, n] of Object.entries(p.sup ?? {})) { if (!MON_SUPPLIES[k]) continue; const v = Math.max(0, Math.min(100, n | 0)); if (v) out.push({ key: 'sup', id: k, n: v, name: k === 'coins' ? `${v} coin${v === 1 ? '' : 's'}` : `${v} ${MON_SUPPLIES[k]}`, kind: kindOf('sup', k), color: k === 'coins' ? '#e8c04a' : '#9ab0d8', life: LOOT.life }); }
  return out;
}
// pick one up: { inv, supplies, msg } or { err }
export function takeLoot(inv, supplies, e) {
  if (e.key === 'item') {
    const i = inv.indexOf(null); if (i < 0) return { err: 'Your inventory is too full to hold any more.' };
    const next = inv.slice(); next[i] = { id: e.id }; return { inv: next, supplies, msg: `You pick up the ${e.name.toLowerCase()}.` };
  }
  const have = supplies?.[e.id] | 0, cap = e.id === 'feathers' ? GA.supplyTop.feathers : Infinity;
  return { inv, supplies: { ...(supplies ?? {}), [e.id]: Math.min(cap, have + e.n) }, msg: e.id === 'coins' ? `You pick up ${e.n} coin${e.n === 1 ? '' : 's'}.` : `You pick up ${e.name}.` };
}
