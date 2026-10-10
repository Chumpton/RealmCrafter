// Borrowing Rolf's guitar (lane 3): every tuned number for scripts/rolf-guitar-borrow.js (the row's side) and
// scripts/guitar-play.js (the holder's hands). While Rolf is neither playing nor tuning, E on his guitar lends it;
// E again sets it back at his stool; if he starts a song, he takes it back.
// Tuning (lane 7): whoever borrows it (a player, Orm) plays it in the tuning it is in right now: lore-skald-guitar.state.tuning
// = { name, midi } (skald-core writes it; nobody here does; missing = standard). A put-back leaves it as it is.
import { TUNINGS, tuningName } from './guitar-tunings.js';
import { openStrings } from '../guitar-pitch.js'; // the guitar's one pitch function (lane 4)
export const GUITAR_BORROW = {
  id: 'lore-skald-guitar', stringsRow: 'lore-skald-guitar/lore-skald-guitar-strings', rolf: 'lore-skald',
  // the carried copy's meshes (the same glbs Rolf's rows wear); a row may override with state.model / state.stringsModel
  model: { id: '/cdn/value.fe07cb3dd32590d8f64033fc7acbd79b35ec6f37499bbd58bc1331f7162224dc.glb', forward: '-z' },
  stringsModel: { id: '/cdn/value.951e98dcc28e806fce8ba3292b8cb174ac49547f62f30c0484164f36b6a75f10.glb', forward: '-z' },
  // held across the player's chest, riding the chest bone: tail at the right hip, neck up to the left, strings out front.
  // bone: logical name (rig-names.js resolves it); null = the body frame, as the hall lyre rides (fallback below)
  held: {
    bone: 'Spine2', feet: { x: -0.2, y: -0.32, z: 0.22 }, rotation: { pitch: 6, yaw: 180, roll: 62 },
    body: { feet: { x: 0.2, y: 0.9, z: -0.26 }, rotation: { pitch: 6, yaw: -10, roll: 62 } },
  },
  tuning: [40, 45, 50, 55, 59, 64],            // standard E A D G B E, string 0 = low E: only the fallback when the row has none
  // chord keys: the left hand's shape. frets per string low→high, null = not played. The last chord stays held for 1–6 and clicks.
  chords: {
    chordG: { name: 'G', frets: [3, 2, 0, 0, 0, 3] },
    chordC: { name: 'C', frets: [null, 3, 2, 0, 1, 0] },
    chordD: { name: 'D', frets: [null, null, 0, 2, 3, 2] },
  },
  // the same three keys re-fingered per tuning so Z X C still sound G, C, D (a tuning id missing here plays the standard shapes,
  // so halfDown sounds each a semitone flat, as a real slackened guitar does)
  chordsByTuning: {
    dropD:       { chordG: [5, 2, 0, 0, 0, 3],       chordC: [null, 3, 2, 0, 1, 0], chordD: [0, null, 0, 2, 3, 2] },
    doubleDropD: { chordG: [5, 2, 0, 0, 0, 5],       chordC: [null, 3, 2, 0, 1, 2], chordD: [0, 0, 0, 2, 3, 0] },
    openD:       { chordG: [5, 5, 5, 5, 5, 5],       chordC: [null, 3, 2, 1, 3, 2], chordD: [0, 0, 0, 0, 0, 0] },
    openG:       { chordG: [0, 0, 0, 0, 0, 0],       chordC: [5, 5, 5, 5, 5, 5],    chordD: [7, 7, 7, 7, 7, 7] },
    dadgad:      { chordG: [5, null, 0, 0, 2, 5],    chordC: [null, 3, 2, 0, 3, 0], chordD: [0, 0, 4, 2, 0, 0] },
    lyreHome:    { chordG: [0, 2, 0, 0, 3, 0],       chordC: [null, 3, null, 2, 0, 0], chordD: [null, 0, 3, 4, 2, 2] },
  },
  pluck: { vel: 0.85, ring: 2.2 },
  strum: { spread: 0.022, vel: 0.78, ring: 1.9, upVel: 0.7 },
  audio: { script: 'scripts/audio-skald-lyre.js', voice: 'nylon', maxDistance: 24, latency: 0.03, gain: 1 },
  squash: { intensity: 0.03, duration: 0.12 },
  strings: { keepSec: 3, maxNotes: 36 },       // the moving-strings history the holder's screen keeps (skald-strings.js swings)
  check: 1,                                    // seconds between the row's checks on Rolf and the holder
  sounds: { take: 'cdn/moodboard-painterly-fantasy/sfx-acoustic-guitar-lifted-from-stand.mp3', set: 'cdn/moodboard-painterly-fantasy/sfx-acoustic-guitar-set-down-on-wood.mp3', volume: 0.45, maxDistance: 10 },
  lines: { back: 'Rolf takes his guitar back', busy: 'Rolf is playing it', taken: 'someone is playing it' },
  toastSec: 1.6,
  lineRadius: 30,                              // who hears "Rolf takes his guitar back"
};

// the tuning a guitar row is in now: { name (id or null), midi [6], label (the HUD's short name) }
export function guitarTuning(row) {
  const t = row?.state?.tuning, m = openStrings(t);
  const name = (t?.name && TUNINGS[t.name] && TUNINGS[t.name].midi.every((x, i) => x === m[i])) ? t.name : tuningName(m);
  const label = name ? TUNINGS[name].text.split(':')[0] : 'retuned';
  return { name, midi: m, label };
}
// the frets a chord key holds in a tuning id (per-tuning shape, else the standard one)
export function chordFrets(key, name) { return GUITAR_BORROW.chordsByTuning[name]?.[key] ?? GUITAR_BORROW.chords[key]?.frets ?? null; }
