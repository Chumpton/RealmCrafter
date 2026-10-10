// The body of scripts/lyre-play.js (its thin door, scripts/lib/lazy-hooks.js): moved here so it stays out of the arrival set.
// Playing the hall lyre in your hands: 1–6 pluck its strings low to high, left click strums down, right click up.
// Each press writes one short burst of notes onto the held lyre's own voice (Rolf's synth), which every screen near
// it sounds at the room time the press was made; keep: true lets the last notes ring under the new ones.
import { HALL_LYRE as H } from './data/hall-lyre.js';
import { tuningMidi } from './data/lyre-tunings.js';
const TUNING = tuningMidi(null);
export function onInput(ctx, input) {
  const me = ctx.self, id = me.state?.holding; if (!id) return;
  const L = ctx.getObject(id); if (!L) { me.state.holding = null; return; }
  if (L.state?.kind === 'guitar') return; // Rolf's borrowed guitar plays through guitar-play.js
  const P = input.pressed || {}, notes = [];
  for (let i = 0; i < 6; i++) if (P['pluck' + (i + 1)]) notes.push(0, i, H.pluck.vel, H.pluck.ring, 0);
  const S = H.strum;
  if (P.strum) for (let i = 0; i < 6; i++) notes.push(i * S.spread, i, S.vel * (i ? 0.88 : 1), S.ring, 0);
  if (P.strumUp) for (let i = 5, k = 0; i >= 0; i--, k++) notes.push(k * S.spread, i, S.vel * (k ? 0.8 : 0.92), S.ring, 0);
  if (!notes.length) return;
  const now = ctx.now();
  L.audio = { kind: 'program', script: 'scripts/audio-skald-lyre.js', spatial: true, maxDistance: H.audio.maxDistance, gain: 1,
    params: { playing: true, keep: true, song: 'hand', startAt: now, sentAt: now, notes, tuning: TUNING, voice: 'lyre', stride: 5, latency: H.audio.latency, gain: 1 } };
  ctx.emit('squash', { target: id, axis: 'z', intensity: 0.04, duration: 0.12 });
}
