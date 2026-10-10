// BONES (creator 2026-10-05): every bone buries, OSRS formula: a flat Prayer XP per bone, one bone per 2 game ticks (1.2 s).
// Values are the OSRS bury XP. Read by scripts/lib/menu-core.js (Bury row) and scripts/skills-player.js (the bury itself).
export const BURY = { lockMs: 1200, sound: '/cdn/moodboard-lowpoly-cozy/sfx-dig-hole-bury-bones-soil.mp3' };
export const BONES = {
  'bones':            { name: 'Bones',              xp: 4.5,  color: '#e8e0c8' },
  'burnt-bones':      { name: 'Burnt bones',        xp: 4.5,  color: '#4a3a2e' },
  'wolf-bones':       { name: 'Wolf bones',         xp: 4.5,  color: '#e0d8c2' },
  'bat-bones':        { name: 'Bat bones',          xp: 5.3,  color: '#d8cfb6' },
  'monkey-bones':     { name: 'Monkey bones',       xp: 5,    color: '#e4dac0' },
  'big-bones':        { name: 'Big bones',          xp: 15,   color: '#f0e8cf' },
  'jogre-bones':      { name: 'Jogre bones',        xp: 15,   color: '#dcd2b4' },
  'zogre-bones':      { name: 'Zogre bones',        xp: 22.5, color: '#b8c49a' },
  'shaikahan-bones':  { name: 'Shaikahan bones',    xp: 25,   color: '#e6dcc0' },
  'babydragon-bones': { name: 'Babydragon bones',   xp: 30,   color: '#efe6cc' },
  'wyrm-bones':       { name: 'Wyrm bones',         xp: 50,   color: '#d6cfc0' },
  'dragon-bones':     { name: 'Dragon bones',       xp: 72,   color: '#f4ecd2' },
  'wyvern-bones':     { name: 'Wyvern bones',       xp: 72,   color: '#c8d0d4' },
  'drake-bones':      { name: 'Drake bones',        xp: 80,   color: '#d8c8b0' },
  'fayrg-bones':      { name: 'Fayrg bones',        xp: 84,   color: '#c8bfa8' },
  'lava-dragon-bones':{ name: 'Lava dragon bones',  xp: 85,   color: '#e8b088' },
  'raurg-bones':      { name: 'Raurg bones',        xp: 96,   color: '#c4b89c' },
  'hydra-bones':      { name: 'Hydra bones',        xp: 110,  color: '#b8c8a8' },
  'dagannoth-bones':  { name: 'Dagannoth bones',    xp: 125,  color: '#d8d0b8' },
  'ourg-bones':       { name: 'Ourg bones',         xp: 140,  color: '#bcb098' },
  'superior-dragon-bones': { name: 'Superior dragon bones', xp: 150, color: '#fff4dc' },
};
export const BONE_ITEMS = Object.fromEntries(Object.entries(BONES).map(([id, b]) => [id, { name: b.name, color: b.color, bone: true }]));
