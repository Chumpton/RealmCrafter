// Orm borrows Rolf's guitar in his rests (scripts/lib/npc-guitar.js, driven from scripts/rolf-guitar-borrow.js). Every tuned
// number for that lives here. Seat points are world metres; guitar feet/rotation are in Orm's own (seated) frame, metres and
// degrees (yaw 0 faces -z, +x his right); hand points are in the GUITAR frame (lib/data/guitar-points.js: tail on the
// soundboard, neck +y, strings -z, +x the low-string side).
export const NPC_GUITAR = {
  npc: 'folk-orm',
  // when: after every 2-4 of Rolf's rests (a rest = Rolf going from playing/tuning/lifting to idle), a few seconds into it
  restsEvery: [2, 4], restDelay: [6, 14], retry: 8, retryLoading: 1,
  forceWait: 600,                 // emit('npcGuitar', {}) waits up to this long (s) for Rolf to rest, then gives up
  fast: 0.1,                      // the row's update period during a session (strokes, strings); otherwise it sleeps GUITAR_BORROW.check
  // what: short songbook tunes only (compiled seconds), compiled with skald-timeline as Rolf's are
  songs: ['hrafnar', 'krummi', 'halling', 'vogguvisa'], maxLength: 62, tempo: 0.94, lead: 1.4, tail: 2.2, lostGrace: 3, lifeSpare: 20,
  // player-first: a player within reach of the guitar (feet to feet, metres) whose heading is within cone (deg) of it, or
  // anyone inside touch, keeps Orm from starting; he looks again after retry seconds. E during his session still takes it at once.
  claim: { reach: 3, cone: 50, touch: 0.9, retry: 2 },
  settleMs: 300,                  // after Rolf's lift-down ends, this long before Orm reaches for it
  // where Orm sits to play: the bench's front, clear of the lyre post (10.28, 4.60) and Ulf (12.1, 5.1); his own spot comes back after
  seat: { feet: { x: 11.2, y: 24.0, z: 5.1 }, yaw: 0 },
  pose: { clip: 'cdn/clip-sit-loop.glb', weight: 5, blendIn: 0.6 },
  // the guitar on his right thigh, neck up to his left, strings out front (bone: null = his body frame, as the lyre guest)
  guitar: { bone: null, feet: { x: 0.36, y: 0.6, z: -0.27 }, rotation: { pitch: 0, yaw: -12, roll: 62 } },
  hands: {
    left: [-0.07, 0.72, -0.03],   // wrist under the neck near fret 2
    down: [0.0, 0.29, -0.1], up: [0.11, 0.32, -0.1], // the strumming wrist over the soundhole, low side (+x) is up
    weight: 1, blendIn: 0.5, blendOut: 0.7, minGap: 0.12, fallbackGap: 0.5,
  },
  audio: { gain: 0.8, maxDistance: 24, latency: 0.06 },
  stringsRound: 10000,            // string bone offsets rounded to 0.1 mm before the write
};
