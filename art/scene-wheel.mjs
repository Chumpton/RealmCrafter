const { PREFABS: P } = await import('/workspace/world/scripts/lib/data/prefabs.js');
const ok = (p) => p.spec && p.spec.model && p.cat !== 'npc' && !/^sm_|^bld-/.test(p.id) === false ? true : p.spec && p.spec.model && p.cat !== 'npc';
const pick = (re, n, ex) => { const l = P.filter((p) => ok(p) && re.test(p.id + ' ' + p.label) && !(ex && ex.test(p.id + ' ' + p.label))); const seen = new Set(), out = []; for (const p of l) { const k = p.spec.model; if (seen.has(k)) continue; seen.add(k); out.push(p); } return out.slice(0, n); };
const Z = {
  spring:  { big: pick(/blossom|windblossom|elw-chapel|sapling|elw-lakehouse/i, 6), small: pick(/flower|bird|holy-spring|bunch|wreath/i, 22, /dead/i) },
  summer:  { big: pick(/haystack|hay-wagon|haywagon|elw-barn|elw-silo|palm|may-pole/i, 8), small: pick(/corn|hay-bail|summer-fest|bales|stook|melon|bonfire-small/i, 22, /dead|corner/i) },
  autumn:  { big: pick(/fallen-tree|fallen_log|elw-farmhouse|scarecrow/i, 7), small: pick(/pumpkin|mushroom|log|leaf/i, 22, /cave|den|diseased|light|spore/i) },
  winter:  { big: pick(/snow-(inn|hovel|blacksmith|tavern|stable)|elw-pine|forest_pine|fir0/i, 8), small: pick(/firewood|campfire|furbolg-tent-snow|pine_stump|sapling_dense|sled|ice/i, 18, /cave|den|tunnel|observatory|fishing/i) },
  city:    { big: pick(/capital_cathedral_264|capital_watchtower|guard_tower_284|capital_fountain|statue_(archmage|paladin|ranger|warrior)|elw-herogate/i, 8), small: pick(/streetlamp|lamppost|market_stall|produce_tub|bank_sign|elw-bench|elw-banner|elw-stall/i, 18) },
  village: { big: pick(/^sm_(arch|bld)_village_(chapel|house|inn|blacksmith|shed|stable)|forest_farmhouse|elw-inn$|elw-townhouse/i, 7), small: pick(/wood_fence|scarecrow|flatbed_cart|winnowing|inn_bench|inn_sign|elw-wagon|well|village_boy|farmer/i, 20, /gate_open/i) },
  road:    { big: pick(/wagon|bridge|caravan|cart/i, 5, /mine|hay|flatbed/i), small: pick(/sign|milestone|crate|barrel|lantern|road/i, 24, /first-aid|fireworks|bank|inn_sign/i) },
  harbor:  { big: pick(/dock|pier|ship|boat/i, 6, /dockfolk|folk/i), small: pick(/anchor|rope|net|fish|crate|barrel|buoy|lobster/i, 22, /fireworks|first-aid/i) },
};
for (const [k, v] of Object.entries(Z)) console.log(k, v.big.length, v.small.length, v.big.map((p) => p.id).join(','));
const C = { x: -20, z: -90 }, R = 64, keys = Object.keys(Z), rows = [];
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
keys.forEach((k, i) => {
  const a0 = (i / keys.length) * Math.PI * 2, span = Math.PI * 2 / keys.length;
  const put = (p, r, j, n) => { const t = a0 + span * (0.12 + 0.76 * ((j + 0.5) / n)) + (rnd() - 0.5) * 0.05; const x = C.x + Math.sin(t) * r, z = C.z + Math.cos(t) * r; const s = { ...p.spec }; delete s.feetPosition; rows.push({ id: `wheel-${k}-${rows.length}`, ...s, feetPosition: { x: +x.toFixed(2), z: +z.toFixed(2), y: { terrain: 0 } }, rotation: { yaw: Math.round(t * 180 / Math.PI + 180 + (rnd() - 0.5) * 30) }, tags: ['scene-wheel', 'wheel-' + k], state: { prefab: p.id } }); };
  v = Z[k];
  v.big.forEach((p, j) => put(p, 46 + (j % 2) * 9, j, v.big.length));
  v.small.forEach((p, j) => put(p, 16 + (j % 3) * 8 + rnd() * 4, j, v.small.length));
});
var v;
(await import('fs')).writeFileSync('/tmp/wheel.json', JSON.stringify(rows));
console.log('rows', rows.length);
