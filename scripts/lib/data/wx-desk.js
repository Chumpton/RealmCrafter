// W22 weather desk: the owner's hand on the sky. place.state.wxForce = { rain?: 0..1, wind?: m/s, from?: yaw } (a key missing = Auto, JEV's schedule).
export const WX = {
  easeS: 20,            // a forced value eases in (and back to the natural weather) over this many seconds: no snaps
  windMax: 20,          // the wind slider's 100% in m/s (gale starts at 14)
  rainSteps: [0, 0.15, 0.4, 0.7, 1],   // the rain buttons: off, drizzle, rain, heavy, downpour
  rainNames: ['off', 'drizzle', 'rain', 'heavy', 'downpour'],
  cloudSteps: [0, 0.5, 1], cloudNames: ['clear', 'broken', 'overcast'],   // W22 slice 2: cloud cover (rain still pulls cover up under it)
  mistSteps: [0, 0.5, 1], mistNames: ['off', 'veil', 'thick'],             // lake mist: 0.5 = veil, 1 = thick
  auroraSteps: [0, 0.5, 1], auroraNames: ['off', 'soft', 'full'],          // the northern lights: only at night, whatever is forced
  gustSteps: [0, 0.5, 1], gustNames: ['steady', 'gusty', 'squalls'],        // W22 slice 3: how hard the wind gusts (0 = none)
  leafSteps: [0, 0.3, 0.7, 1], leafNames: ['off', 'few', 'many', 'flurry'],  // blowing leaves round you (natural = the wind band's share)
  wispSteps: [0, 0.3, 0.7, 1], wispNames: ['off', 'few', 'many', 'lots'],    // the painted wind wisps
  rainVolSteps: [0, 0.5, 1, 1.5], rainVolNames: ['mute', 'soft', 'natural', 'loud'], // rain sound level x the natural beds (drops unchanged)
  snowSteps: [0, 0.3, 0.65, 1], snowNames: ['off', 'flurries', 'snow', 'blizzard'], // W22 slice 4: snowfall (cover follows it)
  snowCloudMin: 0.6,
  // one tap sets the whole sky; every key it leaves out goes back to auto
  presets: [
    { id: 'calm', name: 'calm day', F: { rain: 0, snow: 0, wind: 1.5, gust: 0, cloud: 0.15, storm: 0, mist: 0 } },
    { id: 'drizzle', name: 'grey drizzle', F: { rain: 0.15, snow: 0, wind: 3, gust: 0.3, cloud: 0.9, storm: 0 } },
    { id: 'storm', name: 'thunderstorm', F: { rain: 1, snow: 0, wind: 14, gust: 1, cloud: 1, storm: 1, leaves: 1 } },
    { id: 'snow', name: 'first snow', F: { rain: 0, snow: 0.6, wind: 2, gust: 0, cloud: 0.8, storm: 0, leaves: 0 } },
    { id: 'mist', name: 'misty lake', F: { rain: 0, snow: 0, wind: 0.5, gust: 0, cloud: 0.5, storm: 0, mist: 1 } },
    { id: 'lights', name: 'northern lights', F: { rain: 0, snow: 0, wind: 1, gust: 0, cloud: 0, storm: 0, aurora: 1 } },
  ],
  fogSteps: [1.8, 1, 0.5, 0.25], fogNames: ['clear', 'normal', 'hazy', 'thick'], // W22 slice 6: fog distance multiplier, eased (auto = the weather's own)
  folkSteps: [0, 1], folkNames: ['off', 'on'],   // hall folk react when rain starts (auto = on)
  vedrSteps: [0, 1], vedrNames: ['plain', 'JEV'], // Veðr-stone reads JEV's own words or the plain forecast line (auto = JEV)
  bowSteps: [0, 1], bowNames: ['off', 'now'],     // W9: rainbow (auto = JEV after rain in low sun; now = up at once)
  pawSteps: [0, 0.5, 1], pawNames: ['off', 'ripples', 'racing'],   // W22 slice 5: cat's-paws on the lake (auto = gusts make them)
  shakeSteps: [0, 1], shakeNames: ['off', 'on'],                    // a close thunder crack shakes the screen (auto = on)
  hours: [{ h: 6.3, name: 'dawn' }, { h: 12, name: 'noon' }, { h: 18.2, name: 'dusk' }, { h: 23, name: 'midnight' }], // jump the sun (a jump, not a glide)
  storm: { cloudMin: 0.8 },   // bolts on: the sky darkens to at least this cover
  compass: ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE'], // yaw 0 = north, 45° steps counter-clockwise (engine yaw)
};
