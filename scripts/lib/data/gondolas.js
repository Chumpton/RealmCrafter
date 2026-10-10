// Farm-mountain gondola lines (scripts/gondola.js moves the cabins, scripts/gondola-rider.js carries players).
// a = the low station's feet (= the cable row's feet), to = offset to the high station (= cable params.to), sag = cable params.sag.
// A new line is one row here + its cabin rows (behavior scripts/gondola.js, state { line, i }).
export const GONDOLA = {
  hook: 5.2,        // cable height above a station's feet (mc-city cable/station)
  floor: -4.6,      // cabin floor top below its hook (mc-city cabin)
  lane: 1.3,        // the two ropes sit ±lane off the line (mc-city cable)
  dockIn: 2.0,      // a docked cabin hangs this far out from the station centre, clear of the bull-wheel post
  ease: 15,         // m over which the hook eases from the dock height onto the rope's sag curve
  travel: 30, swing: 2, dock: 6, // seconds: one way, the turn round the bull wheel, the stop at the platform
  board: 3.2,       // E within this many m (flat) of a cabin at a station boards it
  label: 'E · ride the lift',
  creak: '/cdn/moodboard-lowpoly-cozy/sfx-gondola-creak.mp3',
  boardSound: '/cdn/moodboard-painterly-fantasy/sfx-carriage-door-wood-creak.mp3',
  lines: {
    west: { a: { x: -376.4, y: 46.96613249295205, z: 459.9 }, to: [-93.60000000000002, 105.39181962422961, 45.10000000000002], sag: 6,
      cabins: ['mc-gondola-west-cabin-0', 'mc-gondola-west-cabin-1', 'mc-gondola-west-cabin-2'] },
    peak: { a: { x: -473.18114668611366, y: 336.4818170276934, z: 645.087825146534 }, to: [-166.81885331388634, 118.51248530559496, -225.087825146534], sag: 10,
      cabins: ['mc-gondola-peak-cabin-0', 'mc-gondola-peak-cabin-1', 'mc-gondola-peak-cabin-2'] },
  },
};
