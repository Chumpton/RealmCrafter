// HEARTHSTONE + PORTAL STONE (Campton 2026-10-10): A1 hearths you home to the Lion's Pride, A2 opens the zone window.
export const STONES = {
  castMs: 3000,          // both stones channel 3 s; moving more than moveCancel metres breaks it
  moveCancel: 0.6,
  hearthCdMs: 30000,
  hearth: { place: 'main', anchor: 'hearth-inn', to: { x: -40.3, y: 0.3, z: 69.6 }, name: "Lion's Pride Inn" },
  icons: {
    hearth: '/cdn/value.1aefbf6ef5d52f6ef3ad35bda9f3432ea3a599c30aca4b9de86b378731fd954a.png',
    portal: '/cdn/value.e974c7c6f30e28ce05eb6378b370d05d06340b6277e1032e3fe1642bd5d7b030.png',
  },
  sound: '/cdn/moodboard-painterly-fantasy/sfx-portal-whoosh-chime.mp3',
};
// every zone the portal window lists; to = the zone's home gate
export const ZONES = [
  { id: 'main', name: 'Mellowbrook', line: 'home: the starting town', to: '+main#hearth-inn', color: '#e7b457' },
  { id: 'road', name: 'The Old Road', line: 'gorge bridge, bandit camps', to: '+zone-road#zhome-road', color: '#b08a5a' },
  { id: 'village', name: 'Thistledown', line: 'thatch cottages, the mill stream', to: '+zone-village#zhome-village', color: '#9baf84' },
  { id: 'spring', name: 'Verdant Glade', line: 'meadow, abbey and brook', to: '+zone-spring#zhome-spring', color: '#7fc97a' },
  { id: 'summer', name: 'Sunreach Vale', line: 'farms, Sunfair, Dust Hollow', to: '+zone-summer#zhome-summer', color: '#f0c25a' },
  { id: 'autumn', name: 'Emberwood', line: 'red and gold forest', to: '+zone-autumn#zhome-autumn', color: '#d9773a' },
  { id: 'winter', name: 'Frostpeak', line: 'high pass, Ironhold', to: '+zone-winter#zhome-winter', color: '#a9d4ec' },
  { id: 'swamp', name: 'Murkfen', line: 'bog and black water', to: '+zone-swamp#zhome-swamp', color: '#6f8f5a' },
  { id: 'city', name: 'City', line: 'cathedral square', to: '+zone-city#zhome-city', color: '#c9c1b0' },
  { id: 'harbor', name: 'Harbor', line: 'docks and sea', to: '+zone-harbor#zhome-harbor', color: '#5dada9' },
  { id: 'desert', name: 'Desert', line: 'dunes', to: '+zone-desert#zhome-desert', color: '#d8b77a' },
  { id: 'caves', name: 'Caves', line: 'under the hills', to: '+zone-caves#zhome-caves', color: '#8a8aa0' },
  { id: 'creatures', name: 'Creatures', line: 'the wild ones', to: '+zone-creatures#zhome-creatures', color: '#b98ad0' },
];
export const zoneById = (id) => ZONES.find((z) => z.id === id) ?? null;
