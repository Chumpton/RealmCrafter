// AUSTRLAND TRAVEL (al-travel lane): the Mist Gate at sea, the hideout portal, zone titles, the place's music bed and arrival horn.
// Positions come from GATES in ./austrland.js; this table holds only the travel lane's own numbers.
export const AT = {
  mainGate: 'al-mistgate',          // +main: the sea arch (GATES.seaGateMain), faces SW so you sail out of it toward home
  berthGate: 'al-berth',            // +austrland: its twin off Saltmere (GATES.berth), faces east toward the piers
  ringGate: 'portal-austrland',     // +main: the third arch on the Portal Ring, east side, facing the ring's centre
  hideoutGate: 'al-hideout-gate',   // +austrland: its twin at the hideout camp (GATES.hideoutPortal)
  mainGateYaw: 135,                 // GATES.seaGateMain.yaw (−45) faces out to sea; the arch is turned so arrivals face the isle
  ring: { x: -3.5, y: 28.48, z: 44, yaw: 90 },
  span: 40, height: 30, veil: { w: 33, h: 27, d: 2 },
  shipMoor: { dx: 14, yaw: -90 },   // a ship that sails in is moored this far past the berth gate along its facing (east)
  shipHomeAfter: 4,                 // s: a voyager left unmanned in Austrland sails herself home through the gate
  hideoutFlag: 'austrHideout',      // world.state key the west lane's banner sets
  refuse: "Your hideout isn't pitched yet — sail east past the volcano and raise your banner at the bluff above Saltmere.",
  sounds: {
    music: '/cdn/moodboard-painterly-fantasy/music-sweeping-norse-exploration-strings-harp-horns-open-meadows-loop.mp3',
    horn: '/cdn/moodboard-painterly-fantasy/sfx-norse-ox-horn-long-call-echoing-across-a-harbor.mp3',
    cross: '/cdn/moodboard-painterly-fantasy/sfx-portal-mist-whoosh-with-chiming-runes.mp3',
    mist: '/cdn/moodboard-painterly-fantasy/sfx-sea-mist-wind-whistling-through-standing-stones-loop.mp3',
    refuse: '/cdn/moodboard-painterly-fantasy/sfx-stone-gate-rune-fizzle-shut.mp3',
  },
  zones: {
    hearthvale: { name: 'Hearthvale', tier: '1-10' }, goldmere: { name: 'Goldmere', tier: '8-15' },
    mirkwood: { name: 'Mirkwood', tier: '15-25' }, thornvale: { name: 'Thornvale', tier: '25-35' },
    fenmoor: { name: 'Fenmoor', tier: '10-20' }, frostmark: { name: 'Frostmark', tier: '15-30' },
    emberreach: { name: 'Emberreach', tier: '15-25' }, badlands: { name: 'Grimmarr Badlands', tier: '25-40' },
    ashlands: { name: 'The Ashlands', tier: '40-60' },
  },
  wilds: { name: 'Austrland', tier: 'the open wilds' },
  bannerMs: 5200,
};
