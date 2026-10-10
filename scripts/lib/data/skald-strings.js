// How Rolf's guitar strings move (Claude; tuned by Savi wisp strings lane): numbers for scripts/lib/skald-strings.js. Metres, seconds.
// Per string s0 (low) .. s5 (high). The sway is a VISIBLE rate (a real string's 100-400 Hz would only read as noise at 60 fps): each
// pluck pulls the string the way the finger pushed it, lets go, overshoots once on the pull side, then rings down exponentially.
export const STRINGS = {
  amp: [0.0048, 0.0046, 0.0041, 0.0036, 0.0032, 0.0030],   // full-velocity (vel 1) swing at the string's widest point
  vel: { gamma: 1.6, floor: 0.04 },                        // swing = amp * (floor + (1-floor) * vel^gamma): vel .2 -> 11%, .5 -> 35%, .8 -> 71%, 1 -> 100%
  ring: [2.0, 1.7, 1.4, 1.05, 0.8, 0.65],                   // seconds to fall to 1/e: basses ring long, trebles damp fast
  hz: [8.5, 9.5, 10.5, 12, 13, 14],                         // visible sway rate
  asym: 0.3,                                                // first swing: an extra pull-side offset of this share of the push...
  asymT: 0.05,                                              // ...fading with this time constant, so swing 1 is ~1.3x and the return ~0.8x, then symmetric
  short: 0.5,                                               // a pluck whose sounding ring is under this (palm-muted/staccato) decays at ring * shortShare instead
  shortShare: 0.5,
  blur: 0.6,                                                // ghost spread per metre of envelope (each side = env * blur / 2): thin; the ghost reads by translucency
  blurMax: 0.0012,                                          // ghosts never sit further than 1.2 mm off the core
  carry: 0.3,                                               // share of a ringing swing that survives the next pluck on that string
  choke: 0.009,                                             // a mute kills the ring with this time constant: a hard swing is under the 0.05 mm write step in ~40 ms
  into: 0.35,                                               // share of the pull that goes into the top (+z) rather than across
  // the right hand's stroke per note (tl.stroke[n] = 'rest' | 'free', TASK 13): a rest stroke drives the string toward the top and lands on
  // the next string, a little firmer; a free stroke (the default, and every note today) pulls up and out as before
  stroke: { free: { into: 0.35, gain: 1.0 }, rest: { into: 0.6, gain: 1.1 } },
  max: 0.02,                                                // no bone ever moves further than this
  rest: 0.00015,                                            // below this every string counts as still
  // a string being retuned (lore-skald-guitar.state.turning = { string, from, to, startAt, dur }): it bows by how far its sliding pitch
  // is below the retune's highest pitch (~1 cm per semitone, capped at max), then after the peg click settles over `settle` s from a
  // `click` pluck (click x clickAmp[s]).
  tension: { mmPerSemi: 0.01, max: 0.02, axis: { x: 0.6, z: 0.4 }, settle: 0.6, click: 0.5, clickAmp: [0.0042, 0.0040, 0.0036, 0.0032, 0.0028, 0.0026] },
};
