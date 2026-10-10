// ASSET BROWSER window (creator 2026-10-09): the editor's build cards as a 5-column scrolling window, each slot a tiny spinning 3D copy.
// player.state.ab = { cat, q, hue, sort:'color'|'name', row } is the window's own state (build-tool's save() never clobbers it).
// The layout numbers below are shared: ui/hud/terrain-editor.js draws the slots with them, scripts/build-tool.js stands the 3D copies in them.
import { PREFABS } from './data/prefabs.js';
import { PCOL } from './data/prefab-colors.js';
export const AB = { left: 64, bottom: 8, rail: 44, pad: 8, cols: 5, rows: 4, slot: 76, gap: 6, head: 66, sb: 12, label: 14 };
AB.gridW = AB.cols * AB.slot + (AB.cols - 1) * AB.gap; AB.gridH = AB.rows * AB.slot + (AB.rows - 1) * AB.gap;
AB.w = AB.rail + AB.pad + AB.gridW + AB.pad + AB.sb + AB.pad; AB.h = AB.head + AB.gridH + AB.pad * 2;
// colour buckets, in display order (a rainbow, then the earths, then the neutrals)
export const HUES = [['red', '#c4473a'], ['orange', '#d7843a'], ['yellow', '#d9c04a'], ['green', '#5f9a48'], ['teal', '#3f9a8f'], ['blue', '#4a74c0'], ['purple', '#7f58b8'], ['pink', '#c96a9e'], ['brown', '#7a5536'], ['tan', '#c2a77c'], ['grey', '#8a8a8e'], ['white', '#e8e6e0'], ['black', '#2a2a2e']];
const has = (p, re) => re.test(String(p.label ?? p.id).toLowerCase());
const T = { tree: /\b(tree|oak|pine|birch|willow|palm|spruce|fir|maple|elm|ash|cedar|cypress|redwood|sapling|canopy|trunk|stump)\b/, plant: /(bush|shrub|fern|flower|grass|reed|plant|mushroom|fung|vine|ivy|hedge|crop|pumpkin|cabbage|wheat|corn|leaf|lily|cactus|moss|bloom|rose|herb|weed|bramble|thorn)/, rock: /(rock|stone|boulder|cliff|pebble|crag|ore|crystal|monolith|menhir)/,
  wall: /(wall|fence|gate|palisade|bridge|stair|step|pillar|column|arch|railing|rampart|tower base|beam|post|plank|floor|roof)/, craft: /(anvil|hammer|axe|saw|tool|forge|workbench|wheel|cart|wagon|bucket|sack|rope|ladder|pick|shovel|scythe|loom|spinning|grind|mill|barrow|net|trap)/,
  food: /(bread|food|fish|meat|apple|cheese|pie|plate|bowl|cup|bottle|jug|mug|tankard|wine|ale|fruit|veg|carrot|potato|onion|egg|ham|sausage|cake|kettle|pot|pan|cauldron|tray)/, paper: /(book|scroll|paper|map|letter|note|tome|quill|ink|parchment|page|sign|board|poster)/, beast: /(dragon|wolf|bear|spider|cat|horse|deer|boar|pig|chicken|cow|frog|rabbit|rat|sheep|goat|dog|bird|crow|raven|owl|fish|snake|bat|griffin|gryphon|beast|creature|kobold|murloc|gnoll|troll|ogre)/ };
// building purpose groups, first match wins (order matters: a ruined tower is a ruin, an inn bench is furniture-ish but stays with inns)
const BLD = [
  ['ruin', /(ruin|wreck|destroyed|collapsed|busted|abandoned|crashed)/],
  ['bridge', /(bridge|dock|pier|footbridge|boat house|landing)/],
  ['inns', /(\binn\b|tavern|lion's pride|ale barrel)/],
  ['faith', /(abbey|chapel|cathedral|church|shrine|altar|mausoleum|ziggurat|spire|mage ?tower|azora|prie dieu|pew|basin|world tree|portal)/],
  ['keep', /(castle|keep|barracks|guard ?tower|watchtower|stockade|prison|turret|fortress|stromguard|pv ?p|ctf|battlement|tank|oubliette|tower)/],
  ['farm', /(farm|barn|silo|stable|haystack|pumpkin|scarecrow|vineyard|shed|aviary|roost|pen\b|mill)/],
  ['trade', /(smith|anvil|forge|tailor|bakery|herbal|tannery|market|stall|guild|mine\b|goldmine|lumber|scaffold|refinery|excavation|oil|slaughter|town ?hall|meeting)/],
  ['homes', /(house|cottage|home|hut|townhouse|two story|manor|longhouse|dwelling|tent)/],
];
const bldCache = new Map();
function bldIs(p, g) {
  if (p.cat !== 'building' || has(p, T.wall) && !/(bridge|dock|pier|gate)/.test(String(p.label ?? p.id).toLowerCase())) return false;
  let k = bldCache.get(p.id);
  if (k === undefined) { const l = String(p.label ?? p.id).toLowerCase(); k = (BLD.find(([, re]) => re.test(l)) ?? ['other'])[0]; bldCache.set(p.id, k); }
  return k === g;
}
// [id, icon, label, test]
export const ABCATS = [
  ['all', '✦', 'Everything', () => true],
  ['trees', '🌳', 'Trees', (p) => p.cat === 'nature' && has(p, T.tree)],
  ['plants', '🌿', 'Plants & flowers', (p) => p.cat === 'nature' && !has(p, T.tree) && has(p, T.plant)],
  ['rocks', '🪨', 'Rocks & stone', (p) => p.cat === 'nature' && !has(p, T.tree) && !has(p, T.plant) && has(p, T.rock)],
  ['ground', '🍂', 'Other nature', (p) => p.cat === 'nature' && !has(p, T.tree) && !has(p, T.plant) && !has(p, T.rock)],
  // buildings by purpose (creator 2026-10-10): a card lands in the first group whose words it carries; the rest are Other buildings
  ['b-homes', '🏠', 'Homes & houses', (p) => bldIs(p, 'homes')],
  ['b-inns', '🍺', 'Inns & taverns', (p) => bldIs(p, 'inns')],
  ['b-trade', '⚒️', 'Trade & craft', (p) => bldIs(p, 'trade')],
  ['b-farm', '🌾', 'Farm & stable', (p) => bldIs(p, 'farm')],
  ['b-faith', '⛪', 'Faith & arcane', (p) => bldIs(p, 'faith')],
  ['b-keep', '🏰', 'Keeps & military', (p) => bldIs(p, 'keep')],
  ['b-bridge', '🌉', 'Bridges & docks', (p) => bldIs(p, 'bridge')],
  ['b-ruin', '🏚️', 'Ruins & wrecks', (p) => bldIs(p, 'ruin')],
  ['buildings', '🏘️', 'Other buildings', (p) => bldIs(p, 'other')],
  ['walls', '🧱', 'Walls, fences & bridges', (p) => (p.cat === 'building' || p.cat === 'props') && has(p, T.wall)],
  ['factions', '⚔️', 'Factions', (p) => p.cat === 'factions'],
  ['military', '🛡️', 'Military', (p) => p.cat === 'military'],
  ['dungeon', '🗝️', 'Dungeons', (p) => p.cat === 'dungeon'],
  ['furniture', '🪑', 'Furniture', (p) => p.cat === 'furniture'],
  ['containers', '📦', 'Storage', (p) => p.cat === 'containers'],
  ['lighting', '🔥', 'Lighting', (p) => p.cat === 'lighting'],
  ['banners', '🚩', 'Banners', (p) => p.cat === 'banners'],
  ['arcana', '🔮', 'Arcana', (p) => p.cat === 'arcana'],
  ['craft', '⚒️', 'Tools & crafts', (p) => p.cat === 'props' && !has(p, T.wall) && has(p, T.craft)],
  ['food', '🍞', 'Food & kitchen', (p) => p.cat === 'props' && !has(p, T.wall) && !has(p, T.craft) && has(p, T.food)],
  ['paper', '📜', 'Books & signs', (p) => p.cat === 'props' && !has(p, T.wall) && !has(p, T.craft) && !has(p, T.food) && has(p, T.paper)],
  ['decor', '🏺', 'Other props', (p) => p.cat === 'props' && !has(p, T.wall) && !has(p, T.craft) && !has(p, T.food) && !has(p, T.paper)],
  ['beasts', '🐺', 'Creatures', (p) => p.cat === 'npc' && has(p, T.beast)],
  ['folk', '🧑', 'Characters', (p) => p.cat === 'npc' && !has(p, T.beast)],
];
export function colorOf(id) { const v = PCOL[id]; if (!v) return [10, 50]; const [b, l] = v.split(','); return [+b, +l]; }
let memoKey = null, memoList = null, catCount = null;
export function counts() { if (catCount) return catCount; catCount = {}; for (const [id, , , t] of ABCATS) catCount[id] = PREFABS.filter(t).length; return catCount; }
// the cards the window shows, filtered and arranged: by colour (bucket, then light to dark) or by name
export function abList(ab = {}) {
  const key = `${ab.cat ?? 'all'}|${ab.q ?? ''}|${ab.hue ?? -1}|${ab.sort ?? 'color'}`; if (key === memoKey) return memoList;
  const cat = ABCATS.find((c) => c[0] === (ab.cat ?? 'all')) ?? ABCATS[0], qq = String(ab.q ?? '').toLowerCase().trim(), hue = ab.hue ?? -1;
  let L = PREFABS.filter((p) => cat[3](p) && (!qq || String(p.label).toLowerCase().includes(qq) || String(p.id).toLowerCase().includes(qq)) && (hue < 0 || colorOf(p.id)[0] === hue));
  if ((ab.sort ?? 'color') === 'color') L = L.map((p) => [p, colorOf(p.id)]).sort((a, b) => a[1][0] - b[1][0] || b[1][1] - a[1][1] || String(a[0].label).localeCompare(String(b[0].label))).map((x) => x[0]);
  else L = L.slice().sort((a, b) => String(a.label).localeCompare(String(b.label)));
  memoKey = key; memoList = L; return L;
}
// the window's live shape (creator 2026-10-09: drag it, stretch it): ab.x/ab.y = its left/bottom in px, ab.cols/ab.rows = how many slots it holds
export const LIM = { cols: [3, 10], rows: [2, 8] };
export function geo(ab = {}) {
  const cl = (v, [a, b], d) => Math.min(b, Math.max(a, Math.round(+v || d)));
  const cols = cl(ab.cols, LIM.cols, AB.cols), rows = cl(ab.rows, LIM.rows, AB.rows);
  const gridW = cols * AB.slot + (cols - 1) * AB.gap, gridH = rows * AB.slot + (rows - 1) * AB.gap;
  return { cols, rows, gridW, gridH, left: Math.max(0, +ab.x >= 0 ? +ab.x : AB.left), bottom: Math.max(0, +ab.y >= 0 ? +ab.y : AB.bottom), w: AB.rail + AB.pad + gridW + AB.pad + AB.sb + AB.pad, h: AB.head + gridH + AB.pad * 2 };
}
export const maxRow = (n, g = geo()) => Math.max(0, Math.ceil(n / g.cols) - g.rows);
// pixel centre of slot i (0..cols*rows-1) on a W×H screen, for the 3D copy
export function slotCenter(i, W, H, g = geo()) {
  const c = i % g.cols, r = Math.floor(i / g.cols), top = H - g.bottom - g.h;
  return { x: g.left + 1 + AB.rail + AB.pad + c * (AB.slot + AB.gap) + AB.slot / 2, y: top + 1 + AB.head + AB.pad + r * (AB.slot + AB.gap) + (AB.slot - AB.label) / 2 };
}
