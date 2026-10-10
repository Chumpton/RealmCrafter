// Logic & spawning tools (editor Logic tab): kinds, colours, icons and the tuned numbers. One row = one kind.
export const VOLS = {
  audio:  { icon: '🔊', label: 'Audio zone',   col: '#3b82f6', size: [12, 6, 12] },
  event:  { icon: '🚩', label: 'Event trigger', col: '#facc15', size: [4, 3, 4] },
  safe:   { icon: '🛡', label: 'Safe zone',    col: '#22c55e', size: [16, 8, 16] },
  pvp:    { icon: '⚔', label: 'PvP zone',     col: '#ef4444', size: [16, 8, 16] },
  hazard: { icon: '☠', label: 'Hazard',       col: '#a855f7', size: [6, 2, 6] },
};
export const NODES = {
  spawn:   { icon: '⛳', label: 'Player spawn', col: '#22d3ee' },
  respawn: { icon: '✚', label: 'Respawn point', col: '#2dd4bf' },
  patrol:  { icon: '🧭', label: 'Patrol path',  col: '#fb923c' },
  camp:    { icon: '⛺', label: 'Mob camp',     col: '#b45309' },
};
export const CLIPS = ['wind', 'cave-reverb-drip', 'tavern-music', 'crickets', 'river'];
export const clipUrl = (n) => `/cdn/moodboard-lowpoly-cozy/sfx-${n}.mp3`;
export const HAZ = { lava: { icon: '🔥', col: '#ff6a2b' }, poison: { icon: '🧪', col: '#7ee03a' }, cold: { icon: '❄', col: '#9fd8ff' } };
// camp composition: the game's own enemies (scripts/monster.js + scripts/lib/data/monsters.js), drawn by their own generators
export const MOBS = {
  goblin:  { icon: '👺', gen: 'scripts/gen/monster-goblin.js', params: { skin: 'green' } },
  cow:     { icon: '🐄', gen: 'scripts/gen/monster-cow.js', params: {} },
  chicken: { icon: '🐔', gen: 'scripts/gen/monster-chicken.js', params: {} },
  gnoll: { icon: '🐺', model: '/cdn/value.8984ca4def144cd69b6cf4508f6c0bd31c497f1ae7b5b3fb837e6c30b87839b5.glb', scale: 1.03 },
  'gnoll-chief': { icon: '👑', model: '/cdn/value.02bcb1c8e5520876cf6e35c401631afff2bc3b4a6bdab4f131ecfcf80abfdb92.glb', scale: 1.32 },
  'vale-bandit': { icon: '🗡', model: '/cdn/value.6bbde9919c388fd21b1496bb768eaaf6f8d313a4204447d70731ffaad021c3bc.glb', scale: 0.97 },
  // Murkfen
  'fen-murloc': { icon: '🐟', model: '/cdn/value.4dd187c7279b7567d3264ba479242e4ca672e1dbbf6a6d87ba1484a1074c6f54.glb', scale: 1 },
  'fen-tidehunter': { icon: '🔱', model: '/cdn/value.8a0886966bf7f23fc9082344e00eb7b345feaba396b2ad12b72499178f95a0c1.glb', scale: 1.1 },
  'fen-gnoll': { icon: '🐺', model: '/cdn/value.8984ca4def144cd69b6cf4508f6c0bd31c497f1ae7b5b3fb837e6c30b87839b5.glb', scale: 1.05 },
  'fen-shaman': { icon: '🔮', model: '/cdn/value.3b7eda03eb14ebc512621ea6811b9446f0eef20fe4e086ebbd343789d8daf0aa.glb', scale: 1.05 },
  'fen-chief': { icon: '👑', model: '/cdn/value.02bcb1c8e5520876cf6e35c401631afff2bc3b4a6bdab4f131ecfcf80abfdb92.glb', scale: 1.35 },
  'fen-spider': { icon: '🕷', model: '/cdn/value.ee6584605048af5122f67f9a807ee7b1528848fd4c85c0be34936ce483d73cd7.glb', scale: 1 },
  // Emberwood
  'ember-wolf': { icon: '🐺', model: '/cdn/value.d1c23cadca470ac6e32b376140d0c7a754e0814d829254df86c1b3589d4f2c5f.glb', scale: 0.53 },
  'ember-alpha': { icon: '👑', model: '/cdn/value.d1c23cadca470ac6e32b376140d0c7a754e0814d829254df86c1b3589d4f2c5f.glb', scale: 0.72 },
  'ember-boar': { icon: '🐗', model: '/cdn/value.7658bbcc7d40ca7f552343b3cdaab8d78f9f92057c7472c5bc70d07fc05b17e2.glb', scale: 0.62 },
  'ember-spider': { icon: '🕷', model: '/cdn/value.ee6584605048af5122f67f9a807ee7b1528848fd4c85c0be34936ce483d73cd7.glb', scale: 1 },
  'ember-widow': { icon: '🕸', model: '/cdn/value.ee6584605048af5122f67f9a807ee7b1528848fd4c85c0be34936ce483d73cd7.glb', scale: 1.6 },
  'ember-bear': { icon: '🐻', model: '/cdn/value.8e09b0b853ca9252869c3dafde21015bb536b283eb99b31df9860d013c9a7309.glb', scale: 0.8 },
  // Frostpeak
  'frost-wolf': { icon: '🐺', model: '/cdn/value.d1c23cadca470ac6e32b376140d0c7a754e0814d829254df86c1b3589d4f2c5f.glb', scale: 0.55 },
  'frost-howler': { icon: '👑', model: '/cdn/value.d1c23cadca470ac6e32b376140d0c7a754e0814d829254df86c1b3589d4f2c5f.glb', scale: 0.75 },
  'frost-bear': { icon: '🐻', model: '/cdn/value.8e09b0b853ca9252869c3dafde21015bb536b283eb99b31df9860d013c9a7309.glb', scale: 0.9 },
  'frost-matron': { icon: '👑', model: '/cdn/value.8e09b0b853ca9252869c3dafde21015bb536b283eb99b31df9860d013c9a7309.glb', scale: 1.3 },
  // Verdant Glade
  // Thistledown
  'td-gnoll': { icon: '🐺', model: '/cdn/value.8984ca4def144cd69b6cf4508f6c0bd31c497f1ae7b5b3fb837e6c30b87839b5.glb', scale: 0.98 },
  'td-brute': { icon: '🪓', model: '/cdn/value.8984ca4def144cd69b6cf4508f6c0bd31c497f1ae7b5b3fb837e6c30b87839b5.glb', scale: 1.15 },
  'td-chief': { icon: '👑', model: '/cdn/value.02bcb1c8e5520876cf6e35c401631afff2bc3b4a6bdab4f131ecfcf80abfdb92.glb', scale: 1.3 },
  'td-boar': { icon: '🐗', model: '/cdn/value.7658bbcc7d40ca7f552343b3cdaab8d78f9f92057c7472c5bc70d07fc05b17e2.glb', scale: 0.6 },
  // The Old Road
  'or-bandit': { icon: '🗡', model: '/cdn/value.6bbde9919c388fd21b1496bb768eaaf6f8d313a4204447d70731ffaad021c3bc.glb', scale: 0.97 },
  'or-cutter': { icon: '🗡', model: '/cdn/value.6bbde9919c388fd21b1496bb768eaaf6f8d313a4204447d70731ffaad021c3bc.glb', scale: 1.06 },
  'or-boss': { icon: '👑', model: '/cdn/value.6bbde9919c388fd21b1496bb768eaaf6f8d313a4204447d70731ffaad021c3bc.glb', scale: 1.22 },
  'or-wolf': { icon: '🐺', model: '/cdn/value.d1c23cadca470ac6e32b376140d0c7a754e0814d829254df86c1b3589d4f2c5f.glb', scale: 0.48 },
  'glade-wolf': { icon: '🐺', model: '/cdn/value.d1c23cadca470ac6e32b376140d0c7a754e0814d829254df86c1b3589d4f2c5f.glb', scale: 0.42 },
  'glade-mother': { icon: '👑', model: '/cdn/value.d1c23cadca470ac6e32b376140d0c7a754e0814d829254df86c1b3589d4f2c5f.glb', scale: 0.62 },
  'glade-deer': { icon: '🦌', model: '/cdn/value.bafa80d4565b81731b60c47c29e77969d1ee2670a2ec6c12b6f18c00fa6ca9ad.glb', scale: 1.19 },
};
export const EDL = { listRadius: 220, listMax: 40, wake: 120, tetherMax: 60, respawnMax: 600, patrolSpeed: 1.6, sizeMax: 80 };
export function inBox(v, p) { // v: { feetPosition, yaw, sx, sy, sz, w, h, d }; p: world point
  const f = v.feetPosition, a = -(v.yaw || 0) * Math.PI / 180, dx = p.x - f.x, dz = p.z - f.z;
  const lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a), ly = p.y - f.y;
  return Math.abs(lx) <= v.w * v.sx / 2 && Math.abs(lz) <= v.d * v.sz / 2 && ly >= -0.5 && ly <= v.h * v.sy;
}

// Deepdelve (zone-caves) camp mobs: the caves mound's own kobolds and mine spider.
Object.assign(MOBS, {
  'dd-kobold': { icon: '🕯', model: '/cdn/value.c63d5e8e954f0f44fd20e7b9307777a850c9a5cb1507459eb30e0d9d4794f096.glb', scale: 0.8025 },
  'dd-goldtooth': { icon: '👑', model: '/cdn/value.dea275f2b076a4002c37b77cb901840ea54d07d0061877e5750924e8715ae0c5.glb', scale: 0.9877 },
  'dd-spider': { icon: '🕷', model: '/cdn/value.58ccab821a337b273e9bc71e5a6b7a3434d4314b551e2d52df58fd405d130b94.glb', scale: 0.3618 },
});

// Crown District (zone-city) camp mobs: Defias-rigged cutpurses in the back alleys.
Object.assign(MOBS, {
  'ci-cutpurse': { icon: '🗡', model: '/cdn/value.6bbde9919c388fd21b1496bb768eaaf6f8d313a4204447d70731ffaad021c3bc.glb', scale: 0.92 },
  'ci-thug': { icon: '🗡', model: '/cdn/value.6bbde9919c388fd21b1496bb768eaaf6f8d313a4204447d70731ffaad021c3bc.glb', scale: 1.04 },
  'ci-boss': { icon: '👑', model: '/cdn/value.6bbde9919c388fd21b1496bb768eaaf6f8d313a4204447d70731ffaad021c3bc.glb', scale: 1.2 },
});
// Sunscorch (zone-desert): the mound's own beasts
Object.assign(MOBS, {
  'de-viper': { icon: '🐍', model: '/cdn/value.da334528ef8e59f443672d17fcd1f51077323b07ca4acb66b4aba06b9990865d.glb', scale: 0.7 },
  'de-spider': { icon: '🕷', model: '/cdn/value.a09cc59d6981e06133a69d4ff4ddb3b781f4ebe18f1ac624a81524813e5e2ada.glb', scale: 1 },
  'de-brood': { icon: '🕸', model: '/cdn/value.a09cc59d6981e06133a69d4ff4ddb3b781f4ebe18f1ac624a81524813e5e2ada.glb', scale: 1.5 },
  'de-boar': { icon: '🐗', model: '/cdn/value.7db5a05cf7d31ea9c40014eb2268ada6fc08012db31e67f9ae09b7140e95b9d6.glb', scale: 1 },
  'de-tusker': { icon: '👑', model: '/cdn/value.7db5a05cf7d31ea9c40014eb2268ada6fc08012db31e67f9ae09b7140e95b9d6.glb', scale: 1.4 },
});

// Beastwild (zone-creatures) camp mobs: the creatures mound's own beasts.
Object.assign(MOBS, {
  'bw-boar': { icon: '🐗', model: '/cdn/value.f381b3973a4a25ce600478ad0bac5434818a7fc855fc052a0ee400a05d5ef061.glb', scale: 1 },
  'bw-princess': { icon: '👑', model: '/cdn/value.e61a45c7a19ea0bef0d07ac06faa70f278eeb357d6d64949f4d7ec716543ffbb.glb', scale: 1.15 },
  'bw-gnoll': { icon: '🐺', model: '/cdn/value.8984ca4def144cd69b6cf4508f6c0bd31c497f1ae7b5b3fb837e6c30b87839b5.glb', scale: 1.08 },
  'bw-hogger': { icon: '👑', model: '/cdn/value.02bcb1c8e5520876cf6e35c401631afff2bc3b4a6bdab4f131ecfcf80abfdb92.glb', scale: 1.5 },
  'bw-golem': { icon: '🌾', model: { id: '/cdn/value.64bd44beb03cdcf99a39c585c17686a2c8f97cbe7494bc82467f21d79df48117.glb', materials: { Mat_0: { texture: 'cdn/texture-weathered-straw-and-burlap.png', color: 'oklch(0.78 0.08 85)', roughness: 0.95 } } }, scale: 0.8 },
  'bw-fang': { icon: '🕷', model: '/cdn/value.fc141205035af2ec6e251e73cdeea4b78828c3e69cbae5be5e04b12fbe3cbce0.glb', scale: 0.75 },
  'bw-spider': { icon: '🕷', model: '/cdn/value.ee6584605048af5122f67f9a807ee7b1528848fd4c85c0be34936ce483d73cd7.glb', scale: 1.1 },
  'bw-kobold': { icon: '🕯', model: '/cdn/value.71586417e4a4ecd1b3d6e64086806ea2bad6a3a5f991809301a5cb7d9d8ee704.glb', scale: 1 },
  'bw-ogre': { icon: '👹', model: '/cdn/value.73ee71bfd6820592552b0680b22aceec96f7d532a7e55b10886978293a15287a.glb', scale: 1 },
  'bw-dragon': { icon: '🐉', model: '/cdn/value.c5a5355ab68942ffc7cab2f878e26f352c6854377329ea8e67eb86535f1bee99.glb', scale: 6.4 },
});
