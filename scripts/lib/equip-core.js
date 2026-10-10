// Equipment, pure: what a worn set adds up to, and the moves (wear, take off) between the pack and the 11 slots.
import { EQUIP, SLOTS, SLOT_NAMES, START_KIT, MIGRATE } from './data/equip.js';
import { BOWS } from './data/fletch.js';
import { ITEMS } from './data/skills.js';
const BOW = Object.fromEntries(BOWS.map((b) => [b.id, { slot: 'weapon', name: b.name, kind: 'ranged', twoHanded: true, wield: b.wield, atk: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: b.atk }, def: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 }, str: 0 }]));
export const defOf = (id) => EQUIP[id] ?? BOW[id] ?? null;
export const isEquippable = (id) => !!defOf(id);
export const slotOf = (id) => defOf(id)?.slot ?? null;
const sum = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] | 0)]));
const ZERO = { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 };
// every worn item added up; the weapon can be named separately (the arena rack hands you one for a while)
export function gearOf(equip, weaponId) {
  let atk = { ...ZERO }, def = { ...ZERO }, str = 0;
  const ids = SLOTS.map((s) => (s === 'weapon' ? weaponId ?? equip?.weapon : equip?.[s])).filter(Boolean);
  for (const id of ids) { const d = defOf(id); if (!d) continue; atk = sum(atk, d.atk); def = sum(def, d.def); str += d.str | 0; }
  return { atk, def, str };
}
const free = (inv) => inv.filter((x) => !x).length;
// wear the item in pack slot i: { inv, equip, msg } or { err }. A two-handed weapon pushes the shield into the pack and a shield pushes a two-hander out.
export function wear(inv, equip, i, rangedLevel = 99, lv = null) { // lv(skill) = a level, for an item's req
  const it = inv[i], d = it && defOf(it.id); if (!d) return { err: 'You can\'t wear that.' };
  if (d.kind === 'ranged' && rangedLevel < d.wield) return { err: `You need a Ranged level of ${d.wield} to use the ${d.name.toLowerCase()}.` };
  if (d.req && lv) for (const [k, n] of Object.entries(d.req)) if (lv(k) < n) return { err: `You need a ${k[0].toUpperCase() + k.slice(1)} level of ${n} to wear the ${d.name.toLowerCase()}.` };
  const eq = { ...(equip ?? {}) }, next = inv.slice(), old = eq[d.slot];
  const bump = []; // ids that must go back to the pack besides the swapped one
  if (d.slot === 'weapon' && d.twoHanded && eq.shield) { bump.push(eq.shield); delete eq.shield; }
  if (d.slot === 'shield' && eq.weapon && defOf(eq.weapon)?.twoHanded) { bump.push(eq.weapon); delete eq.weapon; }
  const need = bump.length + (old ? 0 : 0); // the swapped item takes the slot we free
  if (free(next) + (old ? 0 : 1) < need) return { err: 'You don\'t have enough room in your pack.' };
  eq[d.slot] = it.id; next[i] = old ? { id: old } : null;
  for (const id of bump) next[next.indexOf(null)] = { id };
  return { inv: next, equip: eq, msg: `You ${d.slot === 'weapon' ? 'wield' : 'wear'} the ${d.name.toLowerCase()}.` };
}
export function takeOff(inv, equip, slot) {
  const id = equip?.[slot]; if (!id) return { err: 'Nothing there.' };
  const i = inv.indexOf(null); if (i < 0) return { err: 'You don\'t have enough room in your pack.' };
  const next = inv.slice(), eq = { ...equip }; next[i] = { id }; delete eq[slot];
  return { inv: next, equip: eq, msg: `You remove the ${(defOf(id)?.name ?? ITEMS[id]?.name ?? 'item').toLowerCase()}.` };
}
// first visit: the kit, and for players who already had the old weapons, those too (no bank yet, so the pack)
export function startKit(inv, equip, old) {
  const next = inv.slice(), eq = { ...(equip ?? {}) };
  for (const [s, id] of Object.entries(START_KIT.equip)) if (!eq[s]) eq[s] = id;
  for (const id of [...START_KIT.pack, ...(old ? MIGRATE : [])]) { const k = next.indexOf(null); if (k >= 0 && !next.some((x) => x?.id === id)) next[k] = { id }; }
  return { inv: next, equip: eq };
}
export { SLOTS, SLOT_NAMES };
