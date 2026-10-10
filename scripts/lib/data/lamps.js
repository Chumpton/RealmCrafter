// LIGHTING lock-in · the lamp kit's ONE tuning table (W2). Numbers from LIGHTING-REVIEW.md §3; every lamp in the den reads its row.
// color/intensity/distance = the one fx light (r=light, no light: row); flickerHz/flickerAmp = flick() on that light and the flame core;
// flameY/flameSize = where the flame sits above the row's feet and how big it burns (m); spread = half extents [x, z] of the fire bed;
// rate = flame cards a second; embers/smoke/smoulder = optional populations (smoulder = coals held while UNLIT, no light).
export const LAMPS = {
  // Oct 5 forge 'pitch black outside': with the moon cut, fires and lanterns x1.6 intensity, x1.35 reach (indoor sconce/tallow untouched)
  hearth:      { color: '#ffa255', intensity: 35, distance: 16, shadow: true, flickerHz: 2,   flickerAmp: .15, flameY: .12, flameSize: .5,  spread: [.75, .14], rate: 46, embers: 4, smoke: .18, coals: 14, smoulder: 8 },
  campfire:    { exposed: true, color: '#ff9447', intensity: 48, distance: 24.3, shadow: true, flickerHz: 3,   flickerAmp: .2,  flameY: .14, flameSize: .42, spread: [.16, .16], rate: 34, embers: 4, smoke: .22, coals: 8,  smoulder: 5 },
  bonfire:     { exposed: true, color: '#ff9447', intensity: 96, distance: 37.8, shadow: true, flickerHz: 2.5, flickerAmp: .2,  flameY: .3,  flameSize: 1.0, spread: [.45, .45], rate: 48, embers: 9, smoke: .25, coals: 12, smoulder: 8 },
  torch:       { exposed: true, color: '#ffa05a', intensity: 54.4, distance: 27, shadow: true,  flickerHz: 5.5, flickerAmp: .12, flameY: 2.0, flameSize: .26, spread: [.04, .04], rate: 24, embers: 2, smoke: .2 },
  brazier:     { exposed: true, color: '#ffa860', intensity: 64, distance: 24.3, flickerHz: 5,   flickerAmp: .12, flameY: .96, flameSize: .32, spread: [.14, .14], rate: 28, embers: 3, smoke: .2,  coals: 7 },
  sconce:      { color: '#ffaa62', intensity: 4, distance: 8,  flickerHz: 3,   flickerAmp: .06, flameY: .3,  flameSize: .08, spread: [.004, .004], rate: 14 },
  tallowLamp:  { color: '#ff9a50', intensity: 2.6, distance: 8,  lightLift: 1.1, flickerHz: 3,   flickerAmp: .06, flameY: .085, flameSize: .06, spread: [.003, .003], rate: 12 },
  hornLantern: { color: '#ff9a50', intensity: 5.12, distance: 14.9,  lightLift: 1.7, flickerHz: 2,   flickerAmp: .05, flameY: .17, flameSize: .06, spread: [.003, .003], rate: 12 },
  lanternPost: { color: '#ff9a50', intensity: 22.4, distance: 20.2,  lightLift: .35, flickerHz: 2,   flickerAmp: .05, flameY: 1.72, flameSize: .06, spread: [.003, .003], rate: 12 }, // AUTOFILL v2: a horn lantern hung on a post, same light as hornLantern
  forge:       { color: '#ff7433', intensity: 40, distance: 16.2,  flickerHz: .6,  flickerAmp: .25, flameY: .8,  flameSize: .3,  spread: [.24, .18], rate: 26, embers: 5, smoke: .2,  coals: 10, smoulder: 6 }, // slow 0.6 Hz swell = the bellows
};
// W-POLISH 2026-10-04: brazier 1.6/8 -> 3.2/10: the cliff-stair cages lit only themselves at 23:00 (beach shot 96% black);
// an open iron basket throws a pool ~6-8 m across steps and rock. Same light count.
// LIGHT V2 2026-10-04 (creator: "eminating very weak light, it needs to be stronger but also more realistic"): every light ~10x
// (was torch 1.6/8, campfire 2.5/10, bonfire 4/18, hearth 3/14, brazier 4/15, forge 2.2/7, sconce/tallow .8/5, horn 1/6).
// pass 2 (night look): torch 18->10/16, sconce 6->4/8, horn 6->3.5/10 warmer: the wall/ground hot spot blew out at 0.3 m.
// lightLift (m): the light rides this far above the flame so a lantern on the grass spreads a soft pool, no white disc (same intensity).
// shadow: true = a steady shadow-casting point light child (60%) under the flickering fx light (40%). Ambient/moon untouched.
// exposed: true = an open flame under the sky: rain makes it sputter (smaller, unsteadier, 25% dimmer, more smoke); state.sheltered on a row opts out.
// Wind (place.state.wind.band) scales every flame's curl and the light's sway on a lamp without lightLift.
// LIGHT V2 phase 2, 2026-10-05 (creator: autofill lights "arent bright at all, very dark"; "go"): a probe light of 40 lit the forest
// ground fine, so the ground takes light and the rows were the weak link. torch 10/16 -> 34/20 + steady shadow child (fences and
// posts throw moving shade); lanternPost 3.2/11 -> 14/15. hornLantern (hand lanterns) untouched by his rule.
export const WEATHER_K = { rain: { at: .15, rate: .6, amp: 2.2, light: .75, smoke: .18 }, wind: { calm: .6, light: 1, breezy: 1.6, strong: 2.3, gale: 3 } };
export const LAMP_KINDS = Object.keys(LAMPS);
// PERF2 light lane, 2026-10-05: draw range per kind (m), set on the lamp template (templates/lamp.js); a row's own visibleRange wins.
// Indoor/behind-horn kinds whose pool is 8-15 m stop at 90-160 m; open fires and posts at 260 m; the bonfire is the far beacon read and keeps the fog's reach.
export const LAMP_RANGE = { sconce: 90, tallowLamp: 90, hornLantern: 160, hearth: 160, lanternPost: 260, torch: 260, brazier: 260, campfire: 260, forge: 260, bonfire: 1250 };
// PERF2: only the `nearest` shadow-kind glow lights nearest any player cast shadows (home-lamplight.js syncShadows, the weather controller's 2 s tick);
// a light already casting keeps it until another is `hysteresis` m nearer. Light, colour, intensity, flicker untouched. rescanMs = how often the lamp list is re-read.
export const SHADOW = { nearest: 4, hysteresis: 10, rescanMs: 30000 };
