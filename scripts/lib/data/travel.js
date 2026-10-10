// RAVEN ROADS: builders' dev travel (ADMIN → Raven Roads; creator 2026-10-05: players use OSRS teleports only). Every spot the panel offers; y is read from the ground at arrival (+lift).
export const TRAVEL = {
  key: null, // was 'u'; unbound 2026-10-05
  lift: 0.4,
  cooldownMs: 2500,
  sound: '/cdn/moodboard-lowpoly-cozy/sfx-rune-teleport-whoosh.mp3',
  spots: [
    { id: 'hall', icon: '🏠',    rune: 'ᚺ', name: 'Longhouse',      line: 'the hearth and the hall',        x: 3.9,  y: 24.04, z: -0.4, fixedY: true, yaw: 0 },
    { id: 'green', icon: '🌳',   rune: 'ᚷ', name: 'Mother Tree',    line: 'the great tree and the hamlet',  x: -33,  z: 6 },
    { id: 'ring', icon: '🌀',    rune: 'ᛟ', name: 'Portal Ring',    line: 'the Void, Yggdrasil, Redwoods',  x: -9,   y: 28.32, z: 41, fixedY: true },
    { id: 'farm', icon: '🌾',    rune: 'ᛃ', name: 'Farm & Mill',    line: 'wheat, the mill and the pens',   x: 62,   z: 28.3 },
    { id: 'harbor', icon: '⚓',  rune: 'ᛚ', name: 'Harbor',         line: 'piers, warships and the beach',  x: -2,   z: -60 },
    { id: 'ravn', icon: '🏘️',    rune: 'ᚱ', name: 'Ravenholdt',      line: 'the village up the long road',   x: -40,  z: 170 },
    { id: 'isle', icon: '🏝️',    rune: 'ᛁ', name: 'Holmvik Isle',   line: 'the island village, way out',    x: 10,   z: -605 },
    { id: 'redwoods', icon: '🍂', rune: 'ᛉ', name: 'Redwoods',       line: 'the autumn forest and mother oaks', x: 294, z: -91 },
    { id: 'summit', icon: '⛰️',  rune: 'ᛞ', name: 'Summit',         line: 'the lookout on the high peak',   x: 503,  z: 313 },
  ],
};
export const spotById = (id) => TRAVEL.spots.find((s) => s.id === id) ?? null;
