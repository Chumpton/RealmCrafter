// The guitar's one pitch function (lane 4, the sound). Rolf's play loop, a borrowing player's hands (guitar-play-core),
// Orm's session (npc-guitar) and the sound program (scripts/audio-skald-lyre.js) all ask here what an open string or a
// fretted note sounds like, so the guitar plays whatever it is tuned to RIGHT NOW: lore-skald-guitar.state.tuning
// = { name, midi: [6] } (written only by skald-core). Pure apart from guitarTuning(ctx), which reads that row.
import { tuningMidi, tuningName, HOME } from './data/guitar-tunings.js';
export const GUITAR_ID = 'lore-skald-guitar';
// the six open-string MIDI pitches for anything that names a tuning: a { name, midi } row, a guitar row handle,
// an id ('dropD'), six note names or six numbers; nothing = standard
export function openStrings(t) {
  if (t && typeof t === 'object' && !Array.isArray(t) && t.state && 'tuning' in t.state) t = t.state.tuning;
  return tuningMidi(t ?? HOME);
}
// the MIDI pitch string s (0 = lowest) sounds at fret f in tuning t
export function pitch(t, s, f = 0) { const m = openStrings(t); return m[Math.max(0, Math.min(5, s | 0))] + (Number(f) || 0); }
// the guitar's current tuning as the row holds it (live): { name, midi }
export function guitarTuning(ctx) {
  const g = (ctx.place?.objects && ctx.place.objects[GUITAR_ID]) || ctx.getObject?.(GUITAR_ID);
  const midi = openStrings(g?.state?.tuning);
  return { name: g?.state?.tuning?.name ?? tuningName(midi), midi };
}
// a turn in progress, as the sound reads it: lore-skald-guitar.state.turning = { string, from, to, startAt, secs? }
// → secs filled from RETUNE when the row leaves it out
export function turnSecs(turn, perSemi = 0.9, slide = 1.2) {
  if (!turn) return 0; if (Number.isFinite(turn.secs)) return turn.secs;
  return Math.max(slide, Math.abs((turn.to ?? 0) - (turn.from ?? 0)) * perSemi + slide * 0.5);
}
