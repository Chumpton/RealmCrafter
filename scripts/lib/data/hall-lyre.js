// The hall lyre: the one leaning on the roof post behind Rolf's stool, for anyone to take up and play.
export const HALL_LYRE = {
  id: 'hall-lyre',
  // held in front of the player's chest, body frame (yaw 0 faces -z), strings away from them as Rolf holds his
  held: { feet: { x: 0.14, y: 0.72, z: -0.3 }, rotation: { pitch: 8, yaw: 0, roll: 22 } },
  // one pluck and one strum, in Rolf's synth voice (scripts/audio-skald-lyre.js), so both lyres sound alike
  pluck: { vel: 0.85, ring: 1.6 },
  strum: { spread: 0.016, vel: 0.8, ring: 1.3 },
  audio: { maxDistance: 24, latency: 0.03 },
  sounds: { take: 'cdn/moodboard-painterly-fantasy/sfx-wooden-lyre-lifted.mp3', set: 'cdn/moodboard-painterly-fantasy/sfx-wooden-lyre-set-down-on-wood.mp3' },
};
