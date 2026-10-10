// Scene zones v3 (creator 2026-10-10): each zone is a little Buddha garden: a raised mound with one hero piece on top,
// Mounds are terrain flatten marks zs-<theme> (height 2.6, radius 7, falloff 10) like buddhaRise; swamp uses elw-gnolltent + darkshore trees (lost-tree-huts and plagueland trees render magenta: missing textures).
// Ground rule (creator 2026-10-10): mounds wear only existing grass (terrain grass webp), mossy cobblestone (city, harbor) or packed dirt (road, desert, caves); no themed ground colours.
// a flower ring down its slope, and a concentric border ring (mini forest / houses / city props) around it; the Buddha is the ring's north node.
const { PREFABS: P } = await import('/workspace/world/scripts/lib/data/prefabs.js');
const byId = Object.fromEntries(P.map((p) => [p.id, p]));
const env = P.filter((p) => p.spec?.model);
const BAD = /hanging|warning|ember|cloak|planter-box|wall|cornice|molding|portal|tunnel|interior|floor|ceiling|terrain|cliff|banner|bridge|gate|stump-|-log0/;
const rx = (re, n, ex) => { const out = [], seen = new Set(); for (const p of env) { const t = p.id; if (!re.test(t) || BAD.test(t) || (ex && ex.test(t)) || seen.has(JSON.stringify(p.spec.model))) continue; seen.add(JSON.stringify(p.spec.model)); out.push(p.id); if (out.length >= n) break; } return out; };
const ids = (...l) => l.filter((i) => byId[i]?.spec?.model);
const Z = {
 spring:  { hero: ids('elw-chapel', 'elw-abbey'), ring: rx(/highland-lake-tree0|hyjal-tree|elw-oak|forest_tree_083|emerald-dream-fountain-tree/, 6), acc: rx(/highland-lake-shrub|berry-bush|elw-bush|forest_bush/, 5), fill: ids('elw-rock', 'elw-log', 'elw-stump', 'elw-bench'), light: ids('elw-lantern'), flower: rx(/flower|bush01/, 4), kind: 'forest', ground: 'oklch(0.66 0.13 135)', cre: ['sw-deer', 'sw-rabbit', 'sw-squirrel', 'sw-cat'] },
 summer:  { hero: ids('sm_prop_pavilion_tent_large_200', 'elw-barn'), ring: rx(/durotar-palm|azr-tree0[1-4]/, 6), acc: ids('elw-haystack', 'elw-pumpkins', 'elw-wheelbarrow', 'elw-sack'), fill: ids('elw-haystack', 'elw-barrel', 'elw-crate', 'elw-table'), light: ids('sm_prop_capital_brazier_109', 'elw-lantern'), flower: rx(/durotar-bush|berry-bush/, 4), kind: 'forest', ground: 'oklch(0.72 0.12 105)', cre: ['sw-cow', 'sw-pig', 'sw-chicken', 'sw-prairiedog'] },
 autumn:  { hero: ids('elw-farmhouse'), ring: rx(/kalidar-tree0|darkshore-tree0[1-4]|deadwind-pass-mid-tree/, 6), acc: rx(/kalidar-bush/, 3).concat(ids('elw-pumpkins', 'elw-scarecrow')), fill: ids('elw-log', 'elw-stump', 'elw-rock', 'elw-pumpkins'), light: ids('elw-lantern'), flower: rx(/kalidar-bush|mushroom/, 4), kind: 'forest', ground: 'oklch(0.6 0.11 70)', cre: ['sw-timberWolf', 'sw-stonetuskBoar', 'sw-forestSpider'] },
 winter:  { hero: ids('dwarven-tinkerer-architecture-dwarven-snow-tower', 'dwarven-tinkerer-architecture-dwarven-snow-stable'), ring: ids('elw-pine', 'sm_env_forest_pine_078', 'sm_env_forest_pine_tall_077', 'sm_env_forest_pine_small_076').concat(rx(/aerie-tree0/, 3)), acc: rx(/aerie-peaks-bush|pine_sapling/, 3).concat(ids('elw-firewood')), fill: ids('elw-firewood', 'elw-rock', 'elw-log', 'elw-campfire'), light: ids('sm_prop_capital_brazier_109'), flower: rx(/aerie-peaks-bush/, 2), kind: 'forest', ground: 'oklch(0.93 0.015 240)', cre: ['sw-forestBear', 'sw-mangyWolf', 'sk_char_gryphon_white_048'] },
 city:    { hero: ids('sm_arch_capital_cathedral_264', 'bld-capital-cathedral-264'), ring: ids('sm_prop_capital_statue_archmage_129', 'sm_prop_capital_vendor_awning_134', 'sm_prop_capital_statue_paladin_130', 'sm_prop_capital_gypsy_wagon_120', 'sm_prop_capital_statue_ranger_131', 'sm_prop_capital_fountain_116', 'sm_prop_capital_statue_warrior_132'), acc: ids('sm_prop_capital_park_bench_125', 'sm_prop_capital_grand_planter_118', 'sm_prop_capital_mailbox_124', 'sm_prop_capital_tavern_ale_keg_133'), fill: ids('sm_prop_capital_bench_108', 'sm_prop_capital_grand_planter_118'), light: ids('sm_env_capital_streetlamp_068', 'sm_env_capital_streetlamp_tall_067'), flower: rx(/forest_bush_low|flower/, 3), kind: 'city', ground: 'oklch(0.74 0.01 250)', cre: ['sw-swRoyalGuard', 'sk_char_capital_city_noble_004', 'sk_char_capital_shopkeeper_012', 'sk_char_capital_city_child_003'] },
 village: { hero: ids('elw-inn', 'elw-townhall'), ring: ids('elw-farmhouse', 'elw-oak', 'elw-smithy', 'elw-stables', 'elw-oak', 'elw-silo', 'elw-barn', 'elw-oak'), acc: ids('elw-fence', 'elw-haystack', 'elw-scarecrow', 'elw-stall', 'elw-wheelbarrow'), fill: ids('elw-barrel', 'elw-crate', 'elw-firewood'), light: ids('elw-lantern'), flower: rx(/flower|elw-bush/, 3), kind: 'village', ground: 'oklch(0.66 0.11 125)', cre: ['sw-peasant', 'sw-milkmaid', 'sw-sheep', 'sw-horse'] },
 road:    { hero: ids('elw-guardtower'), ring: rx(/canopyless-tree|highland-lake-tree0[5-9]/, 5).concat(ids('elw-wagon', 'elw-haywagon')), acc: ids('elw-signpost', 'elw-wheelbarrow', 'elw-sack', 'elw-meetingstone'), fill: ids('elw-crate', 'elw-barrel', 'elw-rock'), light: ids('elw-lantern'), flower: rx(/darkshore-bush|highland-lake-shrub/, 3), kind: 'forest', ground: 'oklch(0.62 0.07 75)', cre: ['sk_char_capital_pack_mule_009', 'sw-defiasBandit', 'sk_char_bandit_001'] },
 harbor:  { hero: rx(/transports-ships/, 1), ring: rx(/durotar-palm|coral-tree/, 6), acc: ids('sm_prop_capital_canal_rowboat_111', 'elw-crate', 'elw-barrel', 'sm_prop_capital_canal_lamp_110'), fill: ids('elw-barrel', 'elw-crate', 'elw-sack'), light: ids('sm_prop_capital_canal_lamp_110'), flower: rx(/darkshore-bush/, 2), kind: 'forest', ground: 'oklch(0.78 0.06 80)', cre: ['sw-murlocCoastrunner', 'sw-murlocForager', 'sw-murlocTidehunter'] },
 caves:   { hero: ids('elw-mine'), ring: rx(/maraudon-spore-tree|maraudon-transition-tree|stone-tree0/, 6), acc: rx(/crystal/, 3).concat(ids('elw-minecart')), fill: ids('elw-rock', 'elw-minecart', 'elw-crate'), light: ids('sm_prop_capital_brazier_109'), flower: rx(/mushroom/, 3), kind: 'forest', ground: 'oklch(0.5 0.03 60)', cre: ['sw-koboldVermin', 'sw-koboldGoldtooth', 'sw-mineSpider'] },
 desert:  { hero: ids('monuments-world-architecture-centaur-tent-command', 'elw-tent'), ring: rx(/cactus|durotar-tree0[5-8]/, 4).concat(rx(/centaur-tent0|nomadic.*tent/, 3)), acc: rx(/durotar-bush/, 3).concat(ids('elw-sack')), fill: ids('elw-rock', 'elw-sack', 'elw-crate'), light: ids('sm_prop_capital_brazier_109'), flower: rx(/durotar-bush/, 2), kind: 'forest', ground: 'oklch(0.8 0.08 85)', cre: ['sw-snake', 'sk_char_giant_boar_040', 'sk_char_giant_cave_spider_041'] },
 swamp:   { hero: rx(/swamp.*hut|witch|lost-tree-huts01/, 1).concat(ids('elw-cauldron')), ring: rx(/swamp-sorrow-tree|swamp-sorrow-canopy|plagueland-tree0/, 6), acc: rx(/plaguelandwestern-bush/, 3).concat(ids('elw-tombstone')), fill: ids('elw-tombstone', 'elw-log', 'elw-stump', 'elw-cauldron'), light: ids('elw-lantern'), flower: rx(/plaguelandwestern-bush|mushroom/, 3), kind: 'forest', ground: 'oklch(0.48 0.07 130)', cre: ['sw-frog', 'sw-riverpawGnoll', 'sw-riverpawShaman', 'sw-rat'] },
 creatures: { hero: ids('sk_char_capital_statue_gryphon_rider_013', 'sw-statueKurdran'), ring: rx(/hyjal-tree|aerie-tree0[1-3]/, 6), acc: rx(/berry-bush|highland-lake-shrub/, 3), fill: ids('elw-rock', 'elw-log', 'elw-campfire'), light: ids('elw-lantern'), flower: rx(/flower|berry-bush/, 3), kind: 'forest', ground: 'oklch(0.66 0.12 130)', cre: ['sw-hogger', 'sw-harvestGolem', 'sw-motherFang', 'sw-princessBoar', 'sk_char_gnoll_chieftain_042', 'sk_char_kobold_leader_052', 'sk_char_gryphon_047', 'ogre', 'green-dragon', 'sk_char_tusked_boar_060'] },
};
const HOSTILE = /wolf|boar|spider|kobold|murloc|gnoll|bandit|defias|hogger|golem|reaper|fang|ogre|dragon|snake|bear|rat/i;
const BUDDHA = { x: -18.5, z: 51.4 }, R = 100, C = { x: BUDDHA.x, z: BUDDHA.z - R }, TH0 = 37 * Math.PI / 180;
const M = { top: 7, foot: 15, h: 2.4 }; // the mound: flat top radius, foot radius, height
const yOn = (r) => r <= M.top ? M.h : r >= M.foot ? 0 : M.h * (1 - (t => t * t * (3 - 2 * t))((r - M.top) / (M.foot - M.top)));
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rows = [], zones = [], keys = Object.keys(Z);
// the cap each role is fitted to: [footprint m, height m]
const FIT = { hero: [14, 15], ring: [6, 9], house: [7, 7], acc: [2.2, 2], fill: [1.8, 1.4], light: [1, 3.4], flower: [1.3, 1.1], creature: [2.6, 2.4], bigcreature: [6, 5] };
keys.forEach((k, i) => {
  const z = Z[k], a = TH0 + i * (2 * Math.PI - 2 * TH0) / (keys.length - 1);
  const zc = { x: C.x + Math.sin(a) * R, z: C.z + Math.cos(a) * R }, front = Math.atan2(C.x - zc.x, C.z - zc.z);
  zones.push({ k, x: +zc.x.toFixed(2), z: +zc.z.toFixed(2), front, ground: z.ground });
  const put = (id, r, t, role, fit, extra = {}) => { const p = byId[id]; if (!p) return; const s = { ...p.spec }; delete s.feetPosition; delete s.behavior; delete s.visibleRange; delete s.tags; delete s.state;
    const x = zc.x + Math.sin(t) * r, zz = zc.z + Math.cos(t) * r, out = Math.atan2(x - zc.x, zz - zc.z) * 180 / Math.PI;
    const yaw = role === 'hero' ? front * 180 / Math.PI : role === 'creature' ? front * 180 / Math.PI + (rnd() - .5) * 60 : fit === 'house' ? out + 180 : rnd() * 360;
    rows.push({ id: `zs-${k}-${rows.length}`, ...s, ...extra, feetPosition: { x: +x.toFixed(2), y: +yOn(r).toFixed(2), z: +zz.toFixed(2) }, rotation: { yaw: Math.round(yaw) }, tags: ['zone-set', 'zs-' + k, 'zs-' + role, ...(extra.tags ?? [])], state: { ...(extra.state ?? {}), prefab: id, role, fit } }); };
  // 1 hero on the mound top, facing the ring's middle
  put(z.hero[0], 0, front, 'hero', 'hero');
  // 2 flower drifts down the slope, two rings, gapped at the front for the walk-up
  for (let j = 0; j < 22; j++) { const t = front + 0.5 + (j / 21) * (Math.PI * 2 - 1.0); put(z.flower[j % z.flower.length], 8.5 + (j % 2) * 3 + rnd(), t, 'flower', 'flower'); }
  // 3 the border ring: 13 slots round the zone, the front two left open as its entrance; ring pieces alternate with accents
  const SL = 14;
  for (let j = 1; j < SL - 1; j++) { const t = front + (j / SL) * Math.PI * 2;
    const id = z.ring[(j - 1) % z.ring.length], isHouse = z.kind === 'village' && !/oak/.test(id) || z.kind === 'city';
    put(id, 20 + rnd() * 1.5, t + (rnd() - .5) * .08, 'ring', isHouse ? 'house' : 'ring');
    put(z.acc[(j - 1) % z.acc.length], 17, t + Math.PI / SL, 'acc', 'acc'); }
  // 4 a little life at the mound's foot: fill pieces in a loose inner ring
  for (let j = 0; j < 6; j++) put(z.fill[j % z.fill.length], 15.5 + rnd(), front + 0.9 + j * 0.85, 'fill', 'fill');
  // 5 lamps flanking the entrance and the path up
  for (const s of [-1, 1]) { put(z.light[0], 18, front + s * 0.28, 'light', 'light'); put(z.light[z.light.length - 1], 9.5, front + s * 0.45, 'light', 'light'); }
  // 6 creatures out front between the mound and the border
  const cs = z.cre.filter((c) => byId[c]); cs.forEach((c, j) => { const big = /dragon|gryphon|ogre|golem|hogger/i.test(c);
    const t = k === 'creatures' ? front + 0.6 + (j / cs.length) * (Math.PI * 2 - 1.2) : front + (j - (cs.length - 1) / 2) * 0.32;
    put(c, k === 'creatures' ? 16.5 : 13 + rnd() * 2, t, 'creature', big ? 'bigcreature' : 'creature', { physics: { body: 'static', collider: 'box' }, tags: ['npc'], state: { name: byId[c].spec?.state?.name ?? byId[c].label, stance: HOSTILE.test(c) ? 'hostile' : 'friendly' } }); });
});
const fs = await import('fs');
fs.writeFileSync('/workspace/world/scripts/lib/data/zone-sets.json', JSON.stringify({ zones, rows, M, FIT }));
const cnt = {}; for (const r of rows) cnt[r.tags[1]] = (cnt[r.tags[1]] || 0) + 1; console.log(JSON.stringify(cnt), rows.length);
for (const k of keys) console.log(k, Z[k].hero[0], '|', Z[k].ring.join(','));
console.log(zones.map((z) => z.k + ':' + Math.round(z.x) + ',' + Math.round(z.z)).join(' '));
