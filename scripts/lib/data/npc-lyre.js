// A feast folk takes the hall lyre off its post now and then and plays one short songbook tune (scripts/lib/npc-lyre.js).
// Every tuned number for that lives here. Body-frame points are metres in the NPC's own frame (yaw 0 faces -z, +x its right),
// scaled by the row's scale; rotations are degrees.
export const NPC_LYRE = {
  // who may play: the first awake, seated folk found (a row whose pose clip says 'sleep' is skipped)
  npcs: ['folk-ulf', 'folk-orm'],
  // when: the first try a few minutes after the room wakes, then every 4-8 minutes; a failed try (player holds it, Rolf mid-song) retries
  firstDelay: [90, 200], every: [240, 480], retry: 30,
  // what: short songs only (compiled length in seconds), compiled with skald-timeline as Rolf's are
  songs: ['hrafnar', 'krummi', 'halling', 'vogguvisa'], maxLength: 62, tempo: 1, lead: 0.9, tail: 2.2,
  // Rolf must not be mid-song or tuning when it starts (forced sessions skip this); yield: stop early if he starts a song
  rolf: 'lore-skald', yieldToRolf: true,
  audio: { gain: 0.85, maxDistance: 24, latency: 0.06 },
  // the lyre in the lap, strings away, top leaning back to the chest and left (parented to the body; bone: attach to a hand bone instead)
  lyre: { bone: null, feet: { x: -0.06, y: 0.5, z: -0.34 }, rotation: { pitch: 16, yaw: 0, roll: 14 } },
  // the hold: the NPC's own seated clip under arm IK; left hand through the window, right hand strokes the strings on each hit
  pose: 'cdn/clip-sit-loop.glb',
  hands: {
    left: { x: -0.2, y: 1.06, z: -0.2 },
    down: { x: -0.05, y: 0.8, z: -0.36 }, up: { x: -0.2, y: 0.84, z: -0.34 },
    weight: 1, blendIn: 0.5, blendOut: 0.7, minGap: 0.17, fallbackGap: 0.6,
  },
};
