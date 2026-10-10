// Variety layer (creator 2026-10-10 "increase the variety of props again like trees and stuff"): per zone, a loose band r 11–19 of mixed trees, bushes, rocks, logs from wider pools.
const { PREFABS: P } = await import('/workspace/world/scripts/lib/data/prefabs.js');
const D = JSON.parse((await import('fs')).readFileSync('/workspace/world/scripts/lib/data/zone-sets.json', 'utf8'));
const env = P.filter((p) => p.spec?.model);
const NO = /plagueland|lost-tree-huts|hanging|wall|portal|interior|floor|terrain|cliff|bridge|gate|banner/;
const pool = (re, n) => { const o = [], seen = new Set(); for (const p of env) { if (!re.test(p.id) || NO.test(p.id)) continue; const k = JSON.stringify(p.spec.model); if (seen.has(k)) continue; seen.add(k); o.push(p.id); if (o.length >= n) break; } return o; };
const V = {
 spring: [pool(/highland-lake-tree|elwynn.*tree|hyjal-tree|forest_tree|elw-oak/, 8), pool(/highland-lake-shrub|elw-bush|forest_bush|fern/, 6), pool(/elw-rock|elw-log|elw-stump|mossy.*rock|boulder/, 6)],
 summer: [pool(/azr-tree|durotar-palm|barrens-tree|elw-oak/, 8), pool(/berry-bush|durotar-bush|haystack|wheat/, 6), pool(/elw-rock|elw-stump|elw-barrel|elw-crate/, 6)],
 autumn: [pool(/darkshore-tree|deadwind|kalidar-tree|duskwood-tree|redridge.*tree/, 8), pool(/kalidar-bush|mushroom|pumpkin/, 6), pool(/elw-log|elw-stump|elw-rock|boulder/, 6)],
 winter: [pool(/pine|aerie-tree|winterspring|dun-morogh/, 8), pool(/aerie-peaks-bush|sapling|snow.*bush/, 6), pool(/elw-rock|elw-firewood|elw-log|boulder/, 6)],
 city: [pool(/capital.*(planter|lamp|streetlamp|bench|barrel|keg|crate|mailbox|statue)/, 10), pool(/forest_bush_low|elw-bush/, 4), pool(/elw-barrel|elw-crate|elw-sack/, 4)],
 village: [pool(/elw-oak|highland-lake-tree|forest_tree/, 6), pool(/elw-bush|elw-haystack|elw-fence|elw-pumpkins/, 6), pool(/elw-barrel|elw-crate|elw-firewood|elw-wheelbarrow|elw-sack/, 6)],
 road: [pool(/canopyless-tree|highland-lake-tree|elw-oak/, 7), pool(/darkshore-bush|highland-lake-shrub|elw-bush/, 5), pool(/elw-rock|elw-crate|elw-signpost|elw-log/, 6)],
 harbor: [pool(/durotar-palm|coral-tree|azr-tree/, 6), pool(/darkshore-bush|coral|shell/, 5), pool(/elw-barrel|elw-crate|elw-sack|rowboat/, 6)],
 caves: [pool(/maraudon|stone-tree|burnt-stone/, 7), pool(/crystal|mushroom/, 6), pool(/elw-rock|elw-minecart|boulder|elw-crate/, 6)],
 desert: [pool(/cactus|durotar-tree|barrens-tree/, 7), pool(/durotar-bush|tumbleweed/, 5), pool(/elw-rock|boulder|elw-sack|skull|bone/, 6)],
 swamp: [pool(/darkshore-tree|swamp-sorrow|duskwood-tree|deadwind/, 7), pool(/mushroom|lilypad|reed|darkshore-bush/, 6), pool(/elw-tombstone|elw-log|elw-stump|elw-rock/, 6)],
 creatures: [pool(/hyjal-tree|aerie-tree|highland-lake-tree/, 7), pool(/berry-bush|highland-lake-shrub|elw-bush/, 5), pool(/elw-rock|elw-log|elw-stump/, 5)],
};
const byId = Object.fromEntries(P.map((p) => [p.id, p]));
let seed = 31; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rows = [];
for (const z of D.zones) { const [T, B, R] = V[z.k]; const plan = [[T, 14, 'vtree', [5, 8]], [B, 14, 'vbush', [1.8, 1.4]], [R, 12, 'vprop', [1.6, 1.2]]];
  let j = 0;
  for (const [ids, n, role, fit] of plan) for (let i = 0; i < n && ids.length; i++) {
    const t = z.front + 0.55 + rnd() * (Math.PI * 2 - 1.1), r = role === 'vtree' ? 15.5 + rnd() * 3.5 : 11 + rnd() * 8;
    const id = ids[(i + Math.floor(rnd() * ids.length)) % ids.length], s = { ...byId[id].spec }; delete s.feetPosition; delete s.behavior; delete s.tags; delete s.state; delete s.visibleRange;
    rows.push({ id: `zs-${z.k}-v${j++}`, ...s, feetPosition: { x: +(z.x + Math.sin(t) * r).toFixed(2), z: +(z.z + Math.cos(t) * r).toFixed(2) }, rotation: { yaw: Math.round(rnd() * 360) }, tags: ['zone-set', 'zs-' + z.k, 'zs-' + role], state: { prefab: id, role, fit: role, cap: [fit[0] * (0.75 + rnd() * 0.5), fit[1] * (0.75 + rnd() * 0.5)] } }); } }
(await import('fs')).writeFileSync('/workspace/world/scripts/lib/data/zone-variety.json', JSON.stringify(rows));
const c = {}; for (const z of D.zones) c[z.k] = V[z.k].map((a) => a.length).join('/'); console.log(rows.length, JSON.stringify(c));
