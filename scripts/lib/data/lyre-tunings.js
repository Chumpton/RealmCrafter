// Rolf's lyre tunings: the one table the sound, the composer, the songbook and the retune beat all read.
// Six open strings, index 0 = lowest (G3 in the home tuning) .. 5 = highest. A lyre has no neck: each string sounds
// only its own pitch, so a scale is chosen by tuning. A song names its tuning (song.tuning = an id here, or six note
// names); a song that names none is still in the old D tuning until it is re-transcribed.
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(name) { // 'G3' → 55, 'Bb3' → 58, 'F#4' → 66
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(String(name).trim()); if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const HOME = 'home';
export const TUNINGS = {
  home:   { text: 'home: G A B D E G, the open pentatonic; G warm, A saga, D bright, E minor lament', notes: ['G3', 'A3', 'B3', 'D4', 'E4', 'G4'] },
  fourth: { text: 'B up to C: G A C D E G, no third, open and old (dorian and mixolydian tunes)', notes: ['G3', 'A3', 'C4', 'D4', 'E4', 'G4'] },
  minor:  { text: 'B down to Bb: G A Bb D E G, G minor with a raised sixth (dorian on G)', notes: ['G3', 'A3', 'Bb3', 'D4', 'E4', 'G4'] },
  dorianD:{ text: 'D dorian hexachord: D E F G A C over the low G, for Drømde mik en drøm', notes: ['G3', 'A3', 'C4', 'D4', 'E4', 'F4'] },
  legacy: { text: 'the old D tuning: D E G A B D (songs not yet re-transcribed)', notes: ['D3', 'E3', 'G3', 'A3', 'B3', 'D4'] },
};
for (const t of Object.values(TUNINGS)) t.midi = t.notes.map(midi);
// the six MIDI pitches for a tuning id, six note names, six numbers, or a song that carries one
export function tuningMidi(t) {
  if (t && typeof t === 'object' && !Array.isArray(t)) t = t.tuning ?? t.choices?.tuning ?? null;
  if (Array.isArray(t) && t.length === 6) { const m = t.map((x) => (typeof x === 'number' ? x : midi(x))); if (m.every((x) => Number.isFinite(x))) return m; }
  if (typeof t === 'string' && TUNINGS[t]) return TUNINGS[t].midi.slice();
  return TUNINGS.legacy.midi.slice();
}
// which strings move between two tunings, and how far (semitones, + tightens)
export function retune(from, to) {
  const a = tuningMidi(from), b = tuningMidi(to), out = [];
  for (let i = 0; i < 6; i++) if (a[i] !== b[i]) out.push({ string: i, from: a[i], to: b[i], semis: b[i] - a[i] });
  return out;
}
export const RETUNE = { perString: 2.4, slide: 1.4, check: 0.5, lead: 0.6, maxSemis: 3 }; // seconds; a string turned further than maxSemis is restrung, not asked
