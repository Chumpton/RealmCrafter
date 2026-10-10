// The right-click menu's pure side: what entries a thing offers. An entry: { verb, target?, col?, lvl?, a?, d?, t?, ... }.
//   a/d = a world input the page sends itself (invUse, invDrop, cbWeapon, shopBuy, shopSell); t = a kind context-menu.js carries out (attack, press, chop, say).
// The first entry is the thing a plain left-click would do. "Cancel" is added by the page, last.
import { COL, EXAMINE, TREE_EXAMINE, EXAMINE_PREFIX, GATE_EXAMINE } from './data/menu.js';
import { stockOf } from './data/shop.js';
import { RUNE_BY_ID } from './data/runes.js';
import { sellable } from './data/shop.js';
import { sellPrice } from './shop-core.js';
import { FOOD } from './data/combat.js';
import { ITEMS } from './data/skills.js';
import { BONES } from './data/bones.js';
import { isEquippable, slotOf, defOf } from './equip-core.js';
import { SPELLS_ALL } from './data/spells.js';
export const levelHue = (mine, theirs) => Math.max(0, Math.min(120, 60 - 6 * ((theirs | 0) - (mine | 0)))); // 0 red .. 60 yellow .. 120 green
export function levelColor(mine, theirs) { // OSRS: green below you, yellow level, red above; 10 levels either way is the full swing
  return `hsl(${levelHue(mine, theirs)},100%,50%)`;
}
const say = (txt) => ({ verb: 'Examine', t: 'say', txt });
export function enemyEntries(name, level, mine, kind) {
  const t = { target: name, col: COL.foe, lvl: { n: level, col: levelColor(mine, level) } };
  return [{ verb: 'Attack', t: 'attack', ...t }, { ...say(EXAMINE[kind] ?? `It's a ${name.toLowerCase()}.`), target: name, col: COL.foe }];
}
export function npcEntries(kind, name, press) { return [{ verb: press, t: 'press', target: name, col: COL.npc }, { ...say(EXAMINE[kind] ?? `It's ${name}.`), target: name, col: COL.npc }]; }
export function graveEntries(owner, name) {
  const mine = owner ? [{ verb: 'Loot', t: 'press', target: 'Gravestone', col: COL.obj }] : [];
  return [...mine, { ...say(owner ? EXAMINE.gravestone : `Here lies ${name}'s gear.`), target: 'Gravestone', col: COL.obj }];
}
export function lootEntries(name, id) { return [{ verb: 'Take', t: 'press', target: name, col: COL.item }, ...(BONES[id] ? [{ verb: 'Bury', t: 'bury', target: name, col: COL.item }] : []), { ...say(`Someone dropped ${name}.`), target: name, col: COL.item }]; }
const TOOL_VERB = { 'small-net': 'Net', 'fishing-rod': 'Bait', 'fly-rod': 'Lure', 'lobster-pot': 'Cage', harpoon: 'Harpoon' };
// a fishing spot: one verb per tool its fish need (OSRS: Net, Bait, Lure, Cage, Harpoon), then Examine
export function spotEntries(tools) { const t = { target: 'Fishing spot', col: COL.obj }; return [...[...new Set(tools)].map((tool) => ({ verb: TOOL_VERB[tool] ?? 'Fish', t: 'fish', tool, ...t })), { ...say('Fish are rising in the water here.'), ...t }]; }
export function fireEntries() { const t = { target: 'Fire', col: COL.obj }; return [{ verb: 'Cook', t: 'cook', ...t }, { ...say('A crackling fire. Raw food can be cooked on it.'), ...t }]; }
export function treeEntries(name) { return [{ verb: 'Chop down', t: 'chop', target: name, col: COL.obj }, { ...say(TREE_EXAMINE), target: name, col: COL.obj }]; }
export function invEntries(i, id, isAxe) {
  const def = ITEMS[id]; if (!def) return [];
  const t = { target: def.name, col: COL.item };
  const wearable = isEquippable(id) ? { verb: slotOf(id) === 'weapon' ? 'Wield' : 'Wear', a: 'equip', d: { i }, ...t } : null;
  const first = wearable ?? (BONES[id] ? { verb: 'Bury', a: 'invBury', d: { i }, ...t } : /^energy-/.test(id) ? { verb: 'Drink', a: 'invUse', d: { i }, ...t } : FOOD[id] ? { verb: 'Eat', a: 'invUse', d: { i }, ...t } : def.bow ? { verb: 'Wield', a: 'cbWeapon', d: { id }, ...t } : { verb: 'Use', a: 'invUse', d: { i }, ...t });
  const rows = [first];
  if (first.verb !== 'Use' && !wearable) rows.push({ verb: 'Use', a: 'invUse', d: { i }, ...t });
  if (!isAxe) rows.push({ verb: 'Drop', a: 'invDrop', d: { i }, ...t });
  rows.push({ ...say(EXAMINE[id] ?? `It's a ${def.name.toLowerCase()}.`), ...t });
  return rows;
}
export function shopBuyEntries(id, shop = 'general', price) {
  const def = ITEMS[id] ?? RUNE_BY_ID[id], row = stockOf(shop).find((x) => x.id === id); if (!def || !row) return [];
  const t = { target: def.name, col: COL.item }, ns = row.sup ? [1, 10, 50, 100] : [1, 5, 10];
  return [...ns.map((n) => ({ verb: `Buy ${n}`, a: 'shopBuy', d: { id, n }, ...t })),
    { verb: 'Value', t: 'say', txt: `${def.name}: costs ${price ?? row.price} coin${(price ?? row.price) === 1 ? '' : 's'}.`, ...t }, { ...say(EXAMINE[id] ?? `It's a ${def.name.toLowerCase()}.`), ...t }];
}
// a spellbook cell: Cast (not for attack spells: they need a target, aim and press the bar), Autocast (attack spells), Examine
export function spellEntries(id) {
  const sp = SPELLS_ALL.find((x) => x.id === id); if (!sp || sp.den !== 'yes') return [];
  const t = { target: sp.name, col: COL.item }, atk = sp.kind === 'attack';
  return [...(atk ? [{ verb: 'Autocast', a: 'cbSpell', d: { id }, ...t }] : [{ verb: 'Cast', a: 'cbCast', d: { id }, ...t }]), { ...say(`${sp.name}: Magic ${sp.level}${sp.xp ? `, ${sp.xp} xp` : ''}.`), ...t }];
}
export function shopSellEntries(i, id, pay = sellPrice(id)) {
  const def = ITEMS[id]; if (!def || !sellable(id)) return [];
  const t = { target: def.name, col: COL.item };
  return [{ verb: 'Sell', a: 'shopSell', d: { i }, ...t }, { verb: 'Value', t: 'say', txt: `${def.name}: the merchant pays ${pay} coin${pay === 1 ? '' : 's'}.`, ...t }, { ...say(EXAMINE[id] ?? `It's a ${def.name.toLowerCase()}.`), ...t }];
}

// --- what every world thing shares: Walk here (under the crosshair) and a plain Examine for anything
export const walkEntry = (x, z) => ({ verb: 'Walk here', t: 'walk', x: +x.toFixed(2), z: +z.toFixed(2) });
export function withWalk(entries, ground) { // primary actions, Walk here, then Examine (the last entry)
  if (!ground) return entries;
  const i = entries.length && entries[entries.length - 1].verb === 'Examine' ? entries.length - 1 : entries.length;
  return [...entries.slice(0, i), walkEntry(ground.x, ground.z), ...entries.slice(i)];
}
export function gateEntries(open) { return [{ verb: open ? 'Close' : 'Open', t: 'press', target: 'Gate', col: COL.obj }, { ...say(GATE_EXAMINE), target: 'Gate', col: COL.obj }]; }
export function prettyName(id) { // "pen-prop-hay-3" -> "Pen prop hay"
  const t = String(id ?? '').replace(/^[^|]*\|/, '').replace(/[-_/]?\d+$/, '').replace(/[-_]+/g, ' ').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : 'Object';
}
export function genericEntries(id, name) {
  const hit = EXAMINE_PREFIX.find(([p]) => String(id ?? '').startsWith(p));
  const text = hit ? hit[1] : `It's ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name.toLowerCase()}.`;
  return [{ ...say(text), target: name, col: COL.obj }];
}
// the mouse-over line under the crosshair: the first entry, and how many more the menu has (Cancel not counted)
export function hoverOf(entries, id) {
  const e = entries[0]; if (!e) return null;
  return { id, verb: e.verb, target: e.target ?? '', col: e.col ?? '#ffffff', lvl: e.lvl ? e.lvl.n | 0 : 0, lcol: e.lvl?.col ?? '', more: entries.length - 1 };
}
export function eqEntries(slot, id) { // right-click on a worn item in the Character window
  const d = defOf(id); if (!d) return [];
  const t = { target: d.name, col: COL.item };
  return [{ verb: 'Remove', a: 'unequip', d: { slot }, ...t }, { ...say(EXAMINE[id] ?? `It's ${/^[aeiou]/i.test(d.name) ? 'an' : 'a'} ${d.name.toLowerCase()}.`), ...t }];
}
