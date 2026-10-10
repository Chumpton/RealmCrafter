export const FEEL = {
  interactionReach: 2.2, aimCone: 38, seatReach: 1.6, seatCone: 50, seatReachFar: 2.3, seatConeFar: 10, // far: across a table, only when you look right at the seat
  seatFallback: { reach: 1.6, cone: 75 }, // last band, by heading alone: the free seat roughly ahead within reach still takes E (a screenless press, a steep look)
  standPush: { deadzone: 0.5, graceMs: 300 }, // seated: a stick/WASD push past deadzone stands you, once graceMs have passed since you sat
  aimGlow: 'oklch(0.80 0.13 66 / 0.2)', seatRing: { radius: 0.2, tube: 0.011, lift: 0.085, color: 'oklch(0.84 0.14 68)', opacity: 0.42, breathe: 1.07, breatheSec: 2.4 }, // lift clears the pelts/cushions on the bench top; the ring breathes like a coal
  aimMark: { dwellMs: 160, bigSize: 0.9, headLift: 1.1 }, // aim must hold dwellMs before anything lights; a thing bigger than bigSize (door, table, a person) gets an ember mote at the part you use, never a glow around its whole body
  seatOccupants: { tags: ['folk', 'lore'], radius: 0.8, below: 0.3, above: 0.9 }, // a seat point this near a seated body (feet within below/above of the seat's feet) is theirs
  seatVsPress: { metre: 1, bias: 0, people: ['folk'], pressReach: 2.2, seatSelf: 12 }, // people: tags weighed seat-vs-person; any other pressable within pressReach m wins unless the seat is aimed within seatSelf° and truer — // seat vs person: aim angle + metre·d each; the seat wins ties — looking at the seat is sitting, looking at the person is greeting
  aimRefreshMs: 90, touchRadius: 0.55, metreCost: 6, doorSpeed: 145, stepLength: 1.6,
  doorAngleTolerance: .01, doorAimSamples: [-0.9, -0.45, 0.45, 0.9], spanHitScore: -1, doorClearance: .38, doorBodyHeight: 1.9, doorRetrySeconds: .1, doorAuto: { radius: 2.1, closeDelay: 0.9, poll: 0.2 },
  doorOpen: '/cdn/moodboard-lowpoly-cozy/sfx-oak-door-iron-hinge-turn-latch-open.mp3',
  doorClose: '/cdn/moodboard-lowpoly-cozy/sfx-oak-door-latch-click-close.mp3',
  steps: {
    wood:'/cdn/moodboard-lowpoly-cozy/sfx-shoe-single-step-oak-floorboard.mp3',
    stone:'/cdn/moodboard-lowpoly-cozy/sfx-shoe-single-step-limestone-flagstone.mp3',
    grass:'/cdn/moodboard-lowpoly-cozy/sfx-shoe-single-step-grass-soil.mp3'
  },
  hearth:'/cdn/moodboard-lowpoly-cozy/sfx-small-wood-hearth-crackle-loop.mp3',
  outdoors:'/cdn/moodboard-lowpoly-cozy/sfx-lakeside-birch-leaves-breeze-distant-songbirds-loop.mp3',
  // The hall by ear (hall-murmur-* rows, scripts/hall-murmur.js): each row's state.kind picks its voice here; the core copies it onto the row's audio.
  // Night crickets / day birds are weather-core's (WEATHER.nightClip fades in as home-valley-air fades out with daylight).
  hall: {
    murmur: { clip:'/cdn/moodboard-lowpoly-cozy/sfx-norse-longhouse-indistinct-low-chatter-occasional-laugh-loop.mp3', gain:.12, maxDistance:14, refDistance:2.5, duck:true },
    eaves:  { clip:'/cdn/moodboard-lowpoly-cozy/sfx-wind-under-wooden-longhouse-eaves-soft-loop.mp3', gain:.07, maxDistance:10, refDistance:2 },
    // while Rolf plays, a listener within radius m of him drops out of the murmur rows (listeners split); if all nearby listeners are by him, gain x duckGain
    duck: { rolf:'lore-skald', radius:4, duckGain:.25, every:.5, wakeRadius:40, idleSleep:2 },
    // where the rows stand (world feet; spawned once by run_script from these numbers)
    sites: {
      'hall-murmur-s1': { kind:'murmur', at:[6.45, 25.0, -1.1] },   // south table west (furn-table-s1)
      'hall-murmur-s2': { kind:'murmur', at:[14.6, 25.0, -1.1] },   // south table east (furn-table-s2)
      'hall-murmur-n1': { kind:'murmur', at:[14.4, 25.0, 4.1] },    // north table, its east half (5.2 m from Rolf's seat)
      'hall-murmur-eaves-main': { kind:'eaves', at:[2.8, 26.4, -4.6] }, // under the eave over the main (south) door
      'hall-murmur-eaves-back': { kind:'eaves', at:[17.2, 26.4, 7.6] }  // under the eave over the back door
    }
  }
};
