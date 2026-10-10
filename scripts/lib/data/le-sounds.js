// LIGHT EDITOR · AUTOFILL sounds (the scan's voice). Clips are conjured by name; every tuned number lives here.
// volume 0..1 for emit("playSound"); pitchJitter = ± random pitch spread; blip also climbs pitch per blip (blipStep, blipMax).
export const LE_SOUNDS = {
  arm:    { clip: '/cdn/moodboard-lowpoly-cozy/sfx-wooden-latch-click-with-resonant-drone-swell.mp3', volume: 0.35, pitchJitter: 0.03 },
  sweep:  { clip: '/cdn/moodboard-lowpoly-cozy/sfx-breathy-rising-sonar-whoosh-airy-sweep-two-seconds.mp3', volume: 0.25, pitchJitter: 0.02 },
  blip:   { clip: '/cdn/moodboard-lowpoly-cozy/sfx-single-dry-wooden-knock-tick-v2.mp3', volume: 0.2, pitchJitter: 0.04, blipStep: 0.025, blipMax: 1.6 },
  done:   { clip: '/cdn/moodboard-lowpoly-cozy/sfx-bronze-bowl-struck-resonant-chime-ring.mp3', volume: 0.4, pitchJitter: 0.02 },
  ignite: { clip: '/cdn/moodboard-lowpoly-cozy/sfx-several-pitch-torches-catching-fire-whoomp-crackle.mp3', volume: 0.45, pitchJitter: 0.05 },
  undo:   { clip: '/cdn/moodboard-lowpoly-cozy/sfx-embers-doused-water-hiss-sizzle-snuffed.mp3', volume: 0.4, pitchJitter: 0.04 },
};
