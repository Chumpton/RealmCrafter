import { STUDIO_LIBRARY } from './prefabs-library.js';
import { ELWYNN } from './prefabs-elwynn.js';
import { STORMWIND } from './prefabs-stormwind.js';
import { STUDIO_BUILDINGS } from './prefabs-buildings.js';

const folk = (params) => ({ primitive: { kind: 'scripted', script: 'scripts/gen/dock-folk.js', params }, castShadow: false, visibleRange: { max: 250 } });
const npc = (spec, extra = {}) => ({ ...spec, behavior: 'scripts/placed-npc.js', state: { wander: 6, ...extra } });
const vil = (kind) => ({ physics: 'static', castShadow: true, primitive: { kind: 'scripted', script: 'scripts/gen/mb-village.js', params: { kind } }, visibleRange: { max: 1200 } });
const shop = (kind) => ({ physics: 'static', castShadow: true, primitive: { kind: 'scripted', script: 'scripts/gen/ravn-trade.js', params: { kind } }, visibleRange: { max: 900 } });
const house = (p) => ({ physics: 'static', primitive: { kind: 'scripted', script: 'scripts/gen/bc-town.js', params: { chim: 1, d: 7, door: -1.8, flowers: true, kind: 'house', w: 8.5, stone: false, slate: false, ...p } }, visibleRange: { max: 700 } });
const plant = (params, solid = true, range = 400) => ({ ...(solid ? { physics: 'static', castShadow: true } : { castShadow: false }), material: { pbr: true, roughness: 0.95 }, primitive: { kind: 'scripted', script: 'scripts/gen/forest-plant.js', params }, visibleRange: { max: range } });
const life = (params, seed = 5001) => ({ physics: 'static', castShadow: true, primitive: { kind: 'scripted', script: 'scripts/gen/village-life.js', params, seed }, visibleRange: { max: 300 } });
const dress = (part) => ({ physics: 'static', castShadow: true, primitive: { kind: 'scripted', script: 'scripts/gen/edge-dress.js', params: { parts: [{ x: 0, y: 0, z: 0, ...part }] }, seed: 11 }, visibleRange: { max: 300 } });

export const CATS = [['building', '🏰', 'Buildings'], ['factions', '⚔️', 'Factions'], ['dungeon', '🗝️', 'Dungeons'], ['nature', '🌲', 'Nature'], ['furniture', '🪑', 'Furniture'], ['containers', '📦', 'Storage'], ['lighting', '🔥', 'Lighting'], ['banners', '🚩', 'Banners'], ['military', '🛡️', 'Military'], ['arcana', '🔮', 'Arcana'], ['props', '🏺', 'Props'], ['npc', '🧑', 'Characters']];

export const PREFABS = [
  { id: 'buddha-statue', cat: 'props', label: 'Buddha Statue', dist: 3, spec: { model: '/cdn/model-buddha-statue-stone-seated-ijq3t9ti.glb', scale: 1.4, castShadow: true, receiveShadow: true, physics: { body: 'static', collider: 'box' }, visibleRange: { max: 300 } } }, // camptons_world upload, Oct 9
  { id: 'buddha-statue', cat: 'props', label: 'Buddha Statue', dist: 3, spec: { model: '/cdn/value.583068a42e38ab32f3c9a168394b688f36d2f8f19493a25c550976a746e97eaf.glb', scale: 1.4, castShadow: true, receiveShadow: true, physics: { body: 'static', collider: 'box' }, visibleRange: { max: 8000 } } }, // camptons_world upload, Oct 9 (UVs baked: the original's quantized texture transform drew as camo)
  { id: 'green-dragon', cat: 'npc', label: 'Green Dragon', dist: 14, spec: { model: { id: '/cdn/value.c5a5355ab68942ffc7cab2f878e26f352c6854377329ea8e67eb86535f1bee99.glb', offset: [0, 0, 0] }, scale: 6.4, castShadow: true, mixer: { body: { clip: 'Idle', loop: 'loop', weight: 1 } }, physics: { body: 'static', collider: 'box', trigger: true }, tags: ['npc', 'interactable', 'hover-pick'], behavior: 'scripts/eldertide-dragon.js', state: { name: 'Green Dragon', verb: 'Talk-to' }, visibleRange: { max: 400 } } },
  { id: 'old-king', cat: 'npc', label: 'Old King', dist: 3, spec: { model: { id: '/cdn/value.ef6da08e9cfd6e9570041245da6ff7fd9916dec11b4b64cd56a1c4edb03d929a.glb', forward: '+z' }, castShadow: true, mixer: { pose: { clip: 'cdn/clip-idle-loop.glb', loop: 'loop', weight: 5 } }, physics: { body: 'static', collider: 'capsule' }, state: { name: 'Old King Osric' }, tags: ['folk', 'villager', 'npc', 'interactable'], visibleRange: { max: 60 } } },
  { id: 'bald-thug', cat: 'npc', label: 'Bald Thug', dist: 3, spec: { model: { id: '/cdn/value.2dd6a89334e3c044c0deaa12a2c8834089cb768a018e4286453c41e1d7216421.glb' }, castShadow: true, mixer: { pose: { clip: 'cdn/clip-idle-loop.glb', loop: 'loop', weight: 5 } }, physics: { body: 'static', collider: 'capsule' }, behavior: 'scripts/breathe.js', state: { name: 'Bald Thug', verb: 'Talk-to' }, tags: ['folk', 'npc', 'interactable'], visibleRange: { max: 80 } } },
  { id: 'ogre', cat: 'npc', label: 'Ogre', dist: 3, spec: npc({ model: '/cdn/value.73ee71bfd6820592552b0680b22aceec96f7d532a7e55b10886978293a15287a.glb', castShadow: true, visibleRange: { max: 250 } }, { clips: { idle: 'Idle', walk: 'Walk', look: 'LookAround' } }) },
  { id: 'dark-viking', cat: 'npc', label: 'Dark Viking', dist: 3, spec: npc({ model: '/cdn/value.8576500d32536056c958540ce0ace83276294b2e7b943154fad2b4503638b957.glb', castShadow: true, visibleRange: { max: 250 } }, { clips: { idle: 'Idle', walk: 'Walk', look: 'LookAround' } }) },
  { id: 'farmhand', cat: 'npc', label: 'Farmhand', dist: 3, spec: npc(folk({ apron: true, hair: '#7a4a2a', rolled: true, sex: 'm', trousers: '#5a4636', tunic: '#b89a62' })) },
  { id: 'villager', cat: 'npc', label: 'Villager', dist: 3, spec: npc(folk({ braids: true, hair: '#c9a15a', head: 'kerchief', sex: 'f', trousers: '#4f3828', tunic: '#9baf84' }), { sex: 'f' }) },
  { id: 'elder', cat: 'npc', label: 'Elder', dist: 3, spec: npc(folk({ beard: true, cloak: '#8a6a45', head: 'hood', sex: 'm', tool: 'staff', trousers: '#4f3828', tunic: '#6b7f5a' }), { wander: 3 }) },
  { id: 'maid', cat: 'npc', label: 'Townswoman', dist: 3, spec: npc(folk({ apron: true, hair: '#8a4a2a', sex: 'f', trousers: '#5a4636', tunic: '#c7b48a' }), { sex: 'f' }) },
  { id: 'cottage', cat: 'building', label: 'Cottage', dist: 14, spec: house({ plaster: 'oklch(0.93 0.04 70)', roof: 'oklch(0.7 0.08 90)', shutter: 'oklch(0.55 0.1 230)', seed: 401 }) },
  { id: 'stonehouse', cat: 'building', label: 'Stone house', dist: 14, spec: house({ plaster: 'oklch(0.86 0.06 40)', roof: 'oklch(0.58 0.08 55)', shutter: 'oklch(0.45 0.1 250)', slate: true, stone: true, w: 9, seed: 402 }) },
  { id: 'smithy', cat: 'building', label: 'Smithy', dist: 16, spec: vil('smithy') },
  { id: 'tailor', cat: 'building', label: 'Tailor', dist: 16, spec: vil('tailor') },
  { id: 'church', cat: 'building', label: 'Chapel', dist: 20, spec: vil('church') },
  { id: 'watch', cat: 'building', label: 'Watchtower', dist: 12, spec: vil('watch') },
  { id: 'bakery', cat: 'building', label: 'Bakery', dist: 14, spec: shop('bakery') },
  { id: 'herbalist', cat: 'building', label: 'Herbalist', dist: 14, spec: shop('herbalist') },
  { id: 'tannery', cat: 'building', label: 'Tannery', dist: 14, spec: shop('tannery') },
  { id: 'oak', cat: 'foliage', label: 'Oak', dist: 7, spec: plant({ kind: 'broadleaf', height: 11, radius: 3.6 }) },
  { id: 'sapling', cat: 'foliage', label: 'Sapling', dist: 5, spec: plant({ kind: 'sapling', height: 5.5 }) },
  { id: 'birch', cat: 'foliage', label: 'Birch', dist: 5, spec: { template: 'templates/hillside-flora.js#birchMid' } },
  { id: 'shrub', cat: 'foliage', label: 'Shrub', dist: 3, spec: plant({ kind: 'shrub', height: 1.2 }, false, 220) },
  { id: 'fern', cat: 'foliage', label: 'Fern', dist: 3, spec: plant({ kind: 'fern' }, false, 120) },
  { id: 'reeds', cat: 'foliage', label: 'Reeds', dist: 3, spec: plant({ kind: 'reed' }, false, 150) },
  { id: 'flowers', cat: 'foliage', label: 'Wildflowers', dist: 3, spec: { castShadow: false, material: { pbr: true }, primitive: { kind: 'scripted', script: 'scripts/gen/home-garden-planting.js', params: { kind: 'meadow', flowers: 10, rx: 1.15, rz: 0.6, tufts: 28 }, seed: 24 }, visibleRange: { max: 150 } } },
  { id: 'log', cat: 'foliage', label: 'Fallen log', dist: 4, spec: plant({ kind: 'log', length: 5, radius: 0.35 }) },
  { id: 'rock', cat: 'foliage', label: 'Mossy rock', dist: 4, spec: dress({ k: 'rock', moss: true, r: 1.1, s: 11 }) },
  { id: 'trough', cat: 'prop', label: 'Trough', dist: 3, spec: life({ kind: 'trough' }) },
  { id: 'hitch', cat: 'prop', label: 'Hitch rail', dist: 3, spec: life({ kind: 'hitch', len: 3 }) },
  { id: 'stump', cat: 'prop', label: 'Stump', dist: 3, spec: life({ kind: 'stump', r: 0.5 }) },
  { id: 'cord', cat: 'prop', label: 'Woodpile', dist: 3, spec: life({ kind: 'cord', len: 3 }) },
  { id: 'line', cat: 'prop', label: 'Clothesline', dist: 4, spec: life({ kind: 'line', len: 8, seed: 4 }) },
  { id: 'wagon', cat: 'prop', label: 'Wagon', dist: 5, spec: dress({ k: 'wagon' }) },
  { id: 'bales', cat: 'prop', label: 'Hay bales', dist: 4, spec: dress({ k: 'bales', rows: [2, 1] }) },
  { id: 'scarecrow', cat: 'prop', label: 'Scarecrow', dist: 3, spec: dress({ k: 'scarecrow' }) },
  { id: 'torch', cat: 'prop', label: 'Torch', dist: 3, spec: { template: 'templates/lamp.js#torch' } },
  { id: 'campfire', cat: 'prop', label: 'Campfire', dist: 4, spec: { template: 'templates/lamp.js#campfire' } },
];

function normalizeCategory(p) {
  if (['foliage', 'oak', 'sapling', 'birch', 'shrub', 'fern', 'reeds', 'flowers', 'log', 'rock'].includes(p.cat)) return 'nature';
  if (p.cat === 'beasts' || p.cat === 'critters' || p.cat === 'npc') return 'npc';
  if (p.cat === 'studio') return 'building';
  if (p.cat === 'elwynn') {
    const l = (p.label || '').toLowerCase();
    if (l.includes('oak') || l.includes('pine') || l.includes('bush') || l.includes('boulder') || l.includes('trellis')) return 'nature';
    if (l.includes('tombstone') || l.includes('wagon') || l.includes('firewood') || l.includes('tent')) return 'props';
    if (l.includes('bench') || l.includes('table') || l.includes('chair')) return 'furniture';
    if (l.includes('campfire')) return 'lighting';
    return 'building';
  }
  if (p.cat === 'stormwind') return 'npc';
  if (p.cat === 'prop') {
    if (p.id === 'torch' || p.id === 'campfire') return 'lighting';
    return 'props';
  }
  return p.cat;
}

for (const p of PREFABS) { p.cat = normalizeCategory(p); }
const legacyPacks = [...ELWYNN, ...STORMWIND, ...STUDIO_BUILDINGS].map(p => ({ ...p, cat: normalizeCategory(p) }));
PREFABS.push(...legacyPacks, ...STUDIO_LIBRARY);

for (const p of PREFABS) {
  if (p.spec && typeof p.spec.model === 'string' && !p.spec.model.startsWith('/') && p.spec.model.startsWith('cdn/')) {
    p.spec.model = '/' + p.spec.model;
  }
}

export const PREFAB = Object.fromEntries(PREFABS.map((p) => [p.id, p]));
