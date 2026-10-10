// Rolf's guitar tunings: the one table the guitar's sound, the retune beat and the borrow cores read (same shape as lyre-tunings.js).
// Six open strings, index 0 = lowest (E2 in standard) .. 5 = highest (E4). The guitar lives in standard; a song names its
// tuning as song.guitarTuning (an id here); the lyre's song.tuning is its own and is only read here when it is a guitar id
// or six notes. The guitar's current tuning lives on lore-skald-guitar.state.tuning = { name, midi } (skald-core writes it).
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(name) { // 'E2' → 40, 'Bb3' → 58, 'F#3' → 54
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(String(name).trim()); if (!m) return null;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
export const HOME = 'standard';
export const TUNINGS = {
  standard:    { text: 'standard: E A D G B E, the Spanish guitar as Tárrega left it; every key within reach', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  dropD:       { text: 'drop D: the sixth string down to D, a dark bass that rolls under D-minor and D-major pieces', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  doubleDropD: { text: 'double drop D: both E strings to D, the bass and the top ring the same drone like a soleá', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'D4'] },
  openD:       { text: 'open D: D A D F# A D, the open strings are a D-major chord; bright, rung like a bell', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
  openG:       { text: 'open G: D G D G B D, a G-major chord open, rustic and warm, the village-dance voice', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  dadgad:      { text: 'DADGAD: no third in the open strings, a modal ring that sits between major and minor', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  halfDown:    { text: 'half step down: every string a semitone flat, a softer, darker colour, slack and velvety', notes: ['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'] },
  lyreHome:    { text: 'lyre home: G A B D E G, the old lyre pentatonic voiced on guitar strings, each within five of standard', notes: ['G2', 'A2', 'B2', 'D3', 'E4', 'G4'] },
};
for (const t of Object.values(TUNINGS)) t.midi = t.notes.map(midi);
// the six MIDI pitches for a tuning id, six note names, six numbers, a { name, midi } row, or a song carrying .guitarTuning / .tuning
export function tuningMidi(t) {
  if (t && typeof t === 'object' && !Array.isArray(t)) {
    const cand = [t.guitarTuning, t.midi, t.name, t.tuning, t.choices?.guitarTuning];
    t = cand.find((c) => (typeof c === 'string' && TUNINGS[c]) || (Array.isArray(c) && c.length === 6)) ?? null;
  }
  if (Array.isArray(t) && t.length === 6) { const m = t.map((x) => (typeof x === 'number' ? x : midi(x))); if (m.every((x) => Number.isFinite(x))) return m; }
  if (typeof t === 'string' && TUNINGS[t]) return TUNINGS[t].midi.slice();
  return TUNINGS[HOME].midi.slice();
}
// the tuning id for six MIDI pitches, or null when it is none of the table
export function tuningName(m) {
  if (!Array.isArray(m) || m.length !== 6) return null;
  for (const [id, t] of Object.entries(TUNINGS)) if (t.midi.every((x, i) => x === Number(m[i]))) return id;
  return null;
}
// which strings move between two tunings, and how far (semitones, + tightens). A string already at its target is skipped.
// Each step also carries its pacing (W8): dur = seconds the tuner turns (the pitch glide, the knob's strokes), gap = seconds
// after it (the check nudge + the hand's travel to the next tuner). dur = slide/2 + perSemi*|semis|; when a whole pass would
// run past RETUNE.budget the turns shrink evenly (never under minTurn), so six strings stay under ~18 s with the lead-in.
export function retune(from, to) {
  const a = tuningMidi(from), b = tuningMidi(to), out = [];
  for (let i = 0; i < 6; i++) if (a[i] !== b[i]) out.push({ string: i, from: a[i], to: b[i], semis: b[i] - a[i] });
  const R = RETUNE, gap = r3(R.check + 0.5);
  let sum = 0; for (const st of out) { st.dur = R.slide * 0.5 + R.perSemi * Math.abs(st.semis); st.gap = gap; sum += st.dur + gap; }
  const turnSum = sum - gap * out.length, room = R.budget - gap * out.length, k = sum > R.budget && turnSum > 0 ? Math.max(0, room) / turnSum : 1;
  for (const st of out) st.dur = r3(Math.max(R.minTurn, st.dur * k));
  return out;
}
const r3 = (v) => Math.round(v * 1000) / 1000;
// seconds: perSemi per semitone of peg turn, slide = the pitch glide's floor (the sound's turnSecs; dur's base is slide/2),
// check = the test-pluck spacing and the nudge window (gap = check + 0.5 covers nudge .47 s + the hand's .6 s travel),
// lead = the neck drawn in first, budget = the most one pass of turns + gaps may take, minTurn = the shortest turn.
// maxTurn semitones before a string would go through standard first: 7 covers every pair in this table (lyreHome's B3->E4
// is +5, openD/dadgad->lyreHome's A3->E4 is +7), so a retune is always one direct pass, never two.
// Per string: 1 semi 1.9 s, 3 semis 2.5 s, 5 semis 3.1 s, 7 semis 3.7 s; doubleDropD->lyreHome (5 strings) 14.9 s of turns.
// (Before core reads st.dur/st.gap its own formula dur = perSemi*|semis|, per string dur+check+0.5 gives 1.4..3.2 s.)
export const RETUNE = { perSemi: 0.3, slide: 1.2, check: 1.1, lead: 0.6, maxTurn: 7, budget: 15.5, minTurn: 0.8 };
