// Rolf's composer (Claude): new lyre songs on the fly, in the skald-songs format, so the existing compile() drives both the
// sound and his hands from one timeline. Pure: no ctx, no clock — every choice and every random roll comes from `seed`,
// so every screen that composes (seed, choices) gets the same song.
//   options(seed)          → the questions JEV answers: { mode, form, peak, ending: [{ id, text }], tempo: { lo, hi, text } }
//   compose(seed, choices) → a song { id, name, mood, bpm, beatsPerBar, swing, form, sections } (60–120 s once played)
//   check(song)            → { ok, length: [shortest, longest] seconds, reasons } — the queue gate
//   randomChoices(seed)    → the fallback answers (when JEV is slow, fails, or a song fails check)
// The lyre: six strings in the home tuning G3 A3 B3 D4 E4 G4 (lib/data/lyre-tunings.js). A "mode" is which string feels
// like home on that tuning; every composed song is tagged tuning: 'home'. Hand rule: two right-hand moves never sit closer than the hand can travel.
import { HOME, tuningMidi as lyreMidi } from './data/lyre-tunings.js';
import { TUNINGS as GT, HOME as G_HOME, tuningMidi as guitarMidi } from './data/guitar-tunings.js';
import { voiceNote } from './skald-voicing.js';   // read-only: the fretting judge the gate asks
import { FINGER_STYLES } from './skald-fingering.js';   // fingering lane (Savi wisp): the styles JEV picks once per song
// The guitar (Rolf plays it now): every composed song also names song.guitarTuning, an id in lib/data/guitar-tunings.js; the
// pitches stay the lyre's (song.tuning 'home'), the guitar tuning only moves where they are fretted and what the open strings ring.
// About half the songs stay in standard; never the same non-standard tuning twice in a row. JEV's odds pick among the rest.
export const GUITAR = { standard: 0.5, spanish: { arpeggio: 0.75, arpVel: 0.5, rasgueo: 0.16, fall: 0.7 } };
// Spanish scales (Claude): a guitar song's six notes are no longer the lyre's pentatonic. Each mood takes a Spanish mode on the key
// its guitar tuning rings in, six scale steps laid out so the mode's home string (MODES[mode].home) IS the tonic, so every melody
// rule above still lands home: lament = Phrygian (the flamenco cadence, F to E), saga = Phrygian dominant (the raised third of the
// saeta), warm = Aeolian (the Andalusian minor, Am G F E), bright = Ionian (the jota's major). lyreHome keeps the old G A B D E G.
// The creator's Spanish chord chart (2026-09-28, /cdn/image-u9dukwzx2.webp, relayed by Savi), for B-S5 (after the backlog). Guitar strings
// s0 = low E .. s5 = high e in standard tuning; fret per string, null = not played, 0 = open. Data only: nothing reads it yet.
export const SPANISH_CHORDS = {
  C: [null, 3, 2, 0, 1, 0], Cmaj7: [null, 3, 2, 0, 0, 0], C7: [null, 3, 2, 3, 1, 0], A7: [null, 0, 2, 0, 2, 0], Dm: [null, null, 0, 2, 3, 1],
  G7: [3, 2, 0, 0, 0, 1], F: [1, 3, 3, 2, 1, 1], Fm: [1, 3, 3, 1, 1, 1], Em: [0, 2, 2, 0, 0, 0], Am: [null, 0, 2, 2, 1, 0],
};
const SPANISH = {
  scales: { dorian: [0, 2, 3, 5, 7, 9, 10], lament: [0, 1, 3, 5, 7, 8, 10], saga: [0, 1, 4, 5, 7, 8, 10], warm: [0, 2, 3, 5, 7, 8, 10], bright: [0, 2, 4, 5, 7, 9, 11] },
  key: { standard: 4, dropD: 2, doubleDropD: 2, openD: 2, openG: 7, dadgad: 2, halfDown: 3 },   // pitch class the tuning rings in (E, D, G, Eb)
  tonicNear: 57,                                                                                 // the tonic sits in the octave nearest A3
};
function spanishSet(modeId, guitarTuning) {
  const pc = SPANISH.key[guitarTuning], sc = SPANISH.scales[modeId];
  if (guitarTuning === 'lyreHome') return guitarMidi('lyreHome');   // the old lyre voice: every string open, as the lyre played it
  if (pc == null || !sc) return HOME;
  const home = MODES[modeId]?.home ?? 0; let tonic = pc; while (tonic + 12 <= SPANISH.tonicNear + 6) tonic += 12;
  const deg = (d) => { const o = Math.floor(d / 7); return tonic + 12 * o + sc[((d % 7) + 7) % 7]; };
  return [0, 1, 2, 3, 4, 5].map((i) => deg(i - home));                                          // index `home` = the tonic
}
// pure: one tuning id from JEV's odds (or none: even odds), a uniform u in 0..1, and the song before's tuning
export function pickGuitarTuning(probs, u, prev) {
  if (u < GUITAR.standard) return G_HOME;
  const ids = Object.keys(GT).filter((id) => id !== G_HOME && id !== prev);
  const w = ids.map((id) => Math.max(0, +(probs?.[id]) || 0)), tot = w.reduce((a, b) => a + b, 0);
  let x = ((u - GUITAR.standard) / (1 - GUITAR.standard)) * (tot || ids.length);
  for (let i = 0; i < ids.length; i++) if ((x -= tot ? w[i] : 1) <= 0) return ids[i];
  return ids[ids.length - 1];
}
const r3 = (v) => Math.round(v * 1000) / 1000;
function rng(seed) { let a = (Math.floor(seed) >>> 0) ^ 0x9e3779b9 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const clampS = (s) => Math.max(0, Math.min(5, s));

// ---- the questions ----
// Home tuning (lib/data/lyre-tunings.js TUNINGS.home): strings 0..5 = G3 A3 B3 D4 E4 G4. home/fifth/drone are string indexes;
// chords are strings that sound together (no more than four).
const MODES = {
  bright: { text: 'D at home: bright, open, a hall song for full cups', home: 3, top: 5, fifth: 1, drone: 3, chords: [[1, 3, 4], [1, 3], [3, 5]], mood: ['bright', 'bold', 'glad'], bpm: [84, 138] },
  lament: { text: 'E at home: a minor lament, night and rain, the long dark', home: 4, top: 5, fifth: 2, drone: 2, chords: [[2, 4, 5], [0, 2, 4], [2, 4]], mood: ['grieving', 'dark', 'lonely'], bpm: [56, 92] },
  warm: { text: 'G at home: warm and homely, a hearth song, gentle', home: 0, top: 5, fifth: 3, drone: 0, chords: [[0, 2, 3], [0, 3, 5], [2, 3, 5]], mood: ['warm', 'gentle', 'homely'], bpm: [66, 116] },
  saga: { text: 'A at home: open and unresolved, a saga, the sea and the old gods', home: 1, top: 4, fifth: 4, drone: 1, chords: [[1, 3, 4], [1, 4], [0, 1, 4]], mood: ['solemn', 'wandering', 'ancient'], bpm: [58, 100] },
};
const FORMS = {
  song: { text: 'a song: the theme twice, a turn away, the theme again (A A B A)', roles: ['A', 'A2', 'B', 'A'] },
  rondo: { text: 'a rondo: the theme keeps coming home between two journeys (A B A C A)', roles: ['A', 'B', 'A2', 'C', 'A'] },
  journey: { text: 'a journey: always moving on, never quite the same (A B C D)', roles: ['A', 'B', 'C', 'D'] },
  lay: { text: 'a lay: a theme and its variations, each one further out (A A2 A3 B A)', roles: ['A', 'A2', 'A3', 'B', 'A'] },
  dance: { text: 'a dance: paired phrases for feet to follow (A A B B A)', roles: ['A', 'A2', 'B', 'B2', 'A'] },
  chant: { text: 'a chant: a drone, a line, the line again lower (I A A2 B A)', roles: ['I', 'A', 'A2', 'B', 'A'] },
};
const PEAKS = {
  early: { text: 'the height comes early, then the song settles' },
  middle: { text: 'the height in the middle, climbing to it and coming down' },
  late: { text: 'the height comes late, the song building all the way' },
};
const ENDINGS = {
  fade: { text: 'fades away on a thinning drone' },
  strum: { text: 'ends on a strong full strum' },
  home: { text: 'ends quietly on the opening phrase, played once more' },
  knock: { text: 'ends on muted beats and a single low string' },
};
// the body's FEEL while playing (TASK 13: shoulders, elbow swing, sway, wrist ease; numbers in data/guitar-moods.js). Not a JEV question:
// the song ask already has "what mood" (mode) and "how lively" (tempo), and a second mood answer could contradict them (a lament played
// "driving"). So the feel follows from those answers, and a song can still carry an explicit choices.feel.
export const FEELS = { relaxed: 'at ease, loose shoulders, a small sway', driving: 'leaning in, firm and rhythmic', tender: 'gentle, close to the guitar, slow easing' };
export const FEEL_NUDGE = Object.entries(FEELS).map(([id, text]) => ({ id, text }));
export const GAZE_MODES = [{ id: 'board', text: 'mostly watching his fretting hand' }, { id: 'listeners', text: 'mostly looking out at the listeners' }, { id: 'closed', text: 'eyes mostly closed, lost in it' }];
function feelAllowed(choices, song) {
  const tempo = choices?.tempo ?? 0.5, mode = choices?.mode ?? song?.mood;
  if (mode === 'lament') return ['relaxed', 'tender'];
  if (mode === 'bright' && tempo >= 0.65) return ['relaxed', 'driving'];
  return Object.keys(FEELS);
}
export function feelOf(choices, song) {
  const ok = feelAllowed(choices, song);
  if (FEELS[choices?.feel] && ok.includes(choices.feel)) return choices.feel;          // an explicit feel still has to fit the music
  const tempo = choices?.tempo ?? 0.5, mode = choices?.mode ?? song?.mood;
  const derived = tempo >= 0.65 && mode !== 'lament' ? 'driving' : mode === 'lament' || tempo <= 0.3 ? 'tender' : 'relaxed';
  if (FEELS[choices?.feelNudge] && ok.includes(choices.feelNudge)) return choices.feelNudge;   // JEV's nudge, when the music allows it
  return derived;
}
export function options(seed) {
  const list = (o) => Object.entries(o).map(([id, v]) => ({ id, text: v.text }));
  return { mode: list(MODES), form: list(FORMS), peak: list(PEAKS), ending: list(ENDINGS),
    guitarTuning: Object.entries(GT).filter(([id]) => id !== G_HOME).map(([id, v]) => ({ id, text: v.text })),   // standard is the house half, not asked
    tempo: { lo: 0, hi: 1, text: 'how lively: 0 slow and heavy, 1 quick and bright' } };
}
// ---- fingering (Savi wisp): JEV picks how Rolf's hands play the song, once, in the same compose ask; skald-fingering.js solves every note
const fcrit = (o) => Object.fromEntries(Object.entries(o).map(([id, v]) => [id, v.text]));
export function fingerQuestions(persona = '') {
  return { fingerRh: { type: 'choice', instructions: `${persona} On the guitar, how does your right hand pluck this song?`, criteria: fcrit(FINGER_STYLES.rh) },
    fingerLh: { type: 'choice', instructions: `${persona} How does your left hand travel the neck in this song?`, criteria: fcrit(FINGER_STYLES.lh) } };
}
const sample = (probs, u, ids) => { const e = Object.entries(probs ?? {}).filter(([k, v]) => v > 0 && ids.includes(k)), tot = e.reduce((a, [, v]) => a + v, 0);
  if (!tot) return null; let r = u * tot; for (const [k, v] of e) if ((r -= v) <= 0) return k; return e[e.length - 1][0]; };
export function fingerChoices(answers, u1, u2) {   // JEV's odds sampled (never the top answer); a missing answer stays with the dice
  const o = {}, rh = sample(answers?.fingerRh?.probabilities, u1, Object.keys(FINGER_STYLES.rh)), lh = sample(answers?.fingerLh?.probabilities, u2, Object.keys(FINGER_STYLES.lh));
  if (rh) o.fingerRh = rh; if (lh) o.fingerLh = lh; return o;
}
export const fingerStyle = (c) => ({ rh: FINGER_STYLES.rh[c?.fingerRh] ? c.fingerRh : 'classical', lh: FINGER_STYLES.lh[c?.fingerLh] ? c.fingerLh : 'position' });
export function randomChoices(seed, prevGuitar = null) {
  const r = rng(seed * 31 + 7);
  const c = { mode: pick(r, Object.keys(MODES)), form: pick(r, Object.keys(FORMS)), peak: pick(r, Object.keys(PEAKS)), ending: pick(r, Object.keys(ENDINGS)), tempo: r3(r()) };
  c.guitarTuning = pickGuitarTuning(null, rng(seed * 17 + 3)(), prevGuitar);   // its own stream: the older answers keep their dice
  { const f = rng(seed * 23 + 11); c.fingerRh = pick(f, Object.keys(FINGER_STYLES.rh)); c.fingerLh = pick(f, Object.keys(FINGER_STYLES.lh)); }   // fingering: its own stream too
  return c;
}

// ---- titles ----
const T_THE = ['Raven', 'Wolf', 'Fjord', 'Winter', 'Hearth', 'Longship', 'Ash', 'Barrow', 'Tide', 'Frost', 'Mead', 'Storm', 'Stone', 'Spear', 'Well', 'Hall', 'Sea', 'Mountain', 'Oak', 'Salmon'];
const T_ADJ = { bright: ['Bright', 'Golden', 'High', 'Glad'], lament: ['Long', 'Cold', 'Grey', 'Last'], warm: ['Old', 'Gentle', 'Warm', 'Quiet'], saga: ['Deep', 'Far', 'Hidden', 'Ancient'] };
const T_PAT = [(r, m) => `The ${pick(r, T_THE)}'s ${pick(r, T_ADJ[m])} ${pick(r, ['Night', 'Road', 'Song', 'Watch', 'Crossing', 'Return'])}`,
  (r, m) => `Song of the ${pick(r, T_ADJ[m])} ${pick(r, ['Ford', 'Shore', 'Field', 'Howe', 'Hall', 'Water'])}`,
  (r, m) => `The ${pick(r, T_ADJ[m])} ${pick(r, T_THE)}`,
  (r) => `${pick(r, ['Under', 'Over', 'Beyond', 'Beneath'])} the ${pick(r, T_THE)}`];

// ---- phrases ----
// a motif: 2 bars of (beat, string) on the eighth grid, walking the strings from home, ending on home or the fifth
function motif(r, M, beats) {
  const out = []; let s = clampS(M.home + pick(r, M.home >= 4 ? [0, -1, -2] : [0, 1, 2])), t = 0;   // start near home, inside the six strings
  const durs = beats === 3 ? [[1, 1, 1], [1.5, 0.5, 1], [2, 1], [1, 0.5, 0.5, 1]] : beats === 6 ? [[1.5, 1.5, 1.5, 1.5], [1, 0.5, 1.5, 1, 0.5, 1.5], [3, 1.5, 1.5]] : [[1, 1, 1, 1], [1.5, 0.5, 1, 1], [2, 1, 1], [1, 1, 2], [0.5, 0.5, 1, 2]];
  for (let bar = 0; bar < 2; bar++) {
    const rhythm = pick(r, durs);
    for (const d of rhythm) {
      out.push([t, s]);
      const step = pick(r, [-1, 1, 1, -1, 2, -2, 0]);
      s = clampS(s + step);
      t += d;
    }
  }
  out[out.length - 1][1] = r() < 0.6 ? M.home : M.fifth;   // cadence
  if (out.length >= 4 && r() < GUITAR.spanish.fall) {        // the Spanish fall: the line steps down string by string into it
    const end = out[out.length - 1][1];
    out[out.length - 2][1] = clampS(end + 1); out[out.length - 3][1] = clampS(end + 2);
  }
  return out;
}
const vary = {
  up: (m) => m.map(([t, s]) => [t, clampS(s + 1)]),
  down: (m) => m.map(([t, s]) => [t, clampS(s - 1)]),
  invert: (m, M) => m.map(([t, s], i) => [t, i === m.length - 1 ? s : clampS(2 * m[0][1] - s)]),
  dot: (m) => m.map(([t, s], i) => [i % 2 && t % 1 === 0 ? t + 0.5 : t, s]),
};
// one section: `bars` bars of a texture under/around the motif; events never share an instant, and never crowd the hand
function section(r, M, beats, mot, role, bars, level, spb) {
  const ev = [], taken = new Set(), gap = Math.max(0.5, Math.ceil((0.16 / spb) * 2) / 2);   // eighth grid, no two hand moves closer than ~0.16 s
  const put = (b, kind, strs, vel, ring) => {
    b = Math.round(b * 2) / 2;
    for (const u of taken) if (Math.abs(u - b) < gap - 1e-6) return false;
    taken.add(b); ev.push(ring != null ? [b, kind, strs, r3(vel), ring] : [b, kind, strs, r3(vel)]); return true;
  };
  const loud = 0.62 + 0.3 * level, len = bars * beats, chord = () => pick(r, M.chords);
  // rasgueado (Spanish guitar): the strong bar's chord fanned full (four strings, the drone under it) and hard, the fingers
  // flicking back up an eighth later when the hand rule leaves room; a timeline strum is one stroke, so the fan is down + up
  const rasgueo = (b, ch, v) => {
    const full = [...new Set([M.drone, ...ch, M.home])].sort((a, c) => a - c).slice(0, 4);
    if (put(b, 's', full, Math.min(1, v + GUITAR.spanish.rasgueo), 1.8)) put(b + 0.5, 'u', full.slice(-3), Math.min(1, v * 0.85));
  };
  // the frame first (strums, drones, mutes), then the melody fills around it
  for (let bar = 0; bar < bars; bar++) {
    const b0 = bar * beats;
    if (role === 'I') { if (bar % 2 === 0) put(b0, 'p', M.drone, 0.55, 3); }
    else if ((role.startsWith('B') || role === 'D') && bar % 2 === 0) rasgueo(b0, chord(), loud);   // strong bar: the rasgueado
    else if (role.startsWith('B') || role === 'D') { put(b0, 's', chord(), loud); if (beats >= 4 && r() < 0.5) put(b0 + beats / 2, 'u', chord(), loud * 0.75); }
    else if (role === 'C') { put(b0 + (beats >= 4 ? 1 : 0.5), 'm', [0, 1, 2].slice(0, 2 + (bar % 2)), loud * 0.7); }
    else if (role === 'P') { if (bar % 2 === 0) rasgueo(b0, chord(), loud + 0.05); else put(b0, 's', chord(), Math.min(1, loud + 0.12)); put(b0 + (beats === 3 ? 2 : beats / 2), 'u', chord(), loud * 0.8); }
    else if (bar % 2 === 0) put(b0, 'p', M.drone, loud * 0.7, 2.4);   // the mode's drone string under the theme
  }
  if (role === 'I') return { ev: ev.sort((a, b) => a[0] - b[0]), len };
  // melody: the motif laid over the bars (repeated every 2 bars), shifted for contrast sections
  let m = mot;
  if (role === 'A2') m = vary.dot(mot); else if (role === 'A3') m = vary.up(vary.dot(mot)); else if (role === 'B' || role === 'B2') m = vary.invert(mot, M);
  else if (role === 'C') m = vary.down(mot); else if (role === 'D') m = vary.up(mot); else if (role === 'P') m = vary.up(mot);
  const mv = role === 'P' ? Math.min(1, loud + 0.1) : loud;
  for (let rep = 0; rep * 2 * beats < len; rep++) {
    for (const [t, s] of m) { const b = rep * 2 * beats + t; if (b >= len) break; put(b, 'p', s, mv * (t % 1 === 0 ? 1 : 0.8)); }
  }
  // arpeggios (Spanish guitar): under the theme, the bar's chord broken low to high and back (p i m a m i) on the free eighths
  if (role === 'A' || role === 'A2' || role === 'A3') for (let bar = 0; bar < bars; bar++) {
    if (r() > GUITAR.spanish.arpeggio) continue;
    const ch = [...new Set([M.drone, ...chord()])].sort((a, c) => a - c), fig = [...ch, ...ch.slice(1, -1).reverse()];
    let k = 0;
    for (let q = 0.5; q < beats; q += 0.5) { const b = bar * beats + q; if (b >= len) break; if (put(b, 'p', fig[k % fig.length], loud * GUITAR.spanish.arpVel, 1.4)) k++; }
  }
  return { ev: ev.sort((a, b) => a[0] - b[0]), len };
}

// ---- the song ----
const LEAD = 0.6, TAIL = 2.5, DRIFT = 0.06, MIN_S = 60, MAX_S = 120;
function seconds(song, bpm = song.bpm) {
  const spb = 60 / bpm; let t = LEAD;
  for (const name of song.form) { const ev = song.sections[name] || []; const last = ev.reduce((m, e) => Math.max(m, e[0]), 0); t += (Math.floor(last / song.beatsPerBar) + 1) * song.beatsPerBar * spb; }
  return t + TAIL;
}
export function compose(seed, choices = {}) {
  const r = rng(seed), C = { ...randomChoices(seed), ...choices };
  const modeId = MODES[C.mode] ? C.mode : 'warm', M = MODES[modeId];
  const formId = FORMS[C.form] ? C.form : 'song', peak = PEAKS[C.peak] ? C.peak : 'middle', ending = ENDINGS[C.ending] ? C.ending : 'fade';
  const tempo = Math.max(0, Math.min(1, +C.tempo || 0));
  let bpm = Math.round(M.bpm[0] + (M.bpm[1] - M.bpm[0]) * tempo);
  const beats = bpm >= 120 && r() < 0.5 ? 6 : modeId === 'lament' || r() < 0.45 ? 3 : 4;
  if (beats === 6) bpm = Math.round(bpm * 1.5);                         // six to the bar: the eighth-note pulse carries it
  const roles = [...FORMS[formId].roles];
  const pi = peak === 'early' ? 1 : peak === 'late' ? roles.length - 1 : Math.floor(roles.length / 2);
  roles.splice(pi, 0, 'P');                                             // the height of the song
  const mot = motif(r, M, beats);
  const mood = `${pick(r, M.mood)} ${tempo < 0.35 ? 'slow' : tempo > 0.7 ? 'quick' : ''} ${formId}`.replace(/\s+/g, ' ').trim();
  const name = pick(r, T_PAT)(r, modeId);
  const guitarTuning = GT[C.guitarTuning] ? C.guitarTuning : G_HOME;
  const song = { id: `jev-${Math.floor(seed)}`, name, mood, mode: modeId, tuning: spanishSet(C.dorian && modeId === 'warm' ? 'dorian' : modeId, guitarTuning), guitarTuning, bpm, beatsPerBar: beats, swing: modeId === 'bright' && beats !== 3 ? 0.08 : 0, form: [], sections: {} };
  const build = (barsPer) => {
    song.form = []; song.sections = {};
    const spb = 60 / bpm;
    roles.forEach((role, i) => {
      const level = 0.35 + 0.65 * (1 - Math.abs(i - pi) / Math.max(1, roles.length));
      const key = song.sections[role] ? role : role;
      if (!song.sections[key]) song.sections[key] = section(r, M, beats, mot, role, role === 'I' ? 2 : barsPer, level, spb).ev;
      song.form.push(key);
    });
    // the ending, as its own last section
    const end = [], b = beats;
    if (ending === 'strum') { end.push([0, 's', M.chords[0], 0.9, 2.6]); }
    else if (ending === 'home') { mot.slice(0, 4).forEach(([t, s], k) => end.push([t, 'p', s, r3(0.6 - k * 0.05)])); end.push([mot[3] ? Math.ceil(mot[3][0] + 1) : 2 * b, 'p', M.home, 0.5, 3]); }
    else if (ending === 'knock') { for (let k = 0; k < b; k++) end.push([k, 'm', [0, 1], 0.5]); end.push([b, 'p', 0, 0.6, 3.2]); }
    else { end.push([0, 'p', M.home, 0.5, 3], [b, 'p', M.drone === M.home ? 0 : M.drone, 0.4, 3.2]); }
    const g = Math.max(0.5, Math.ceil((0.16 / (60 / bpm)) * 2) / 2); let lastB = -9;   // the same hand rule as the sections
    song.sections.E = end.sort((x, y) => x[0] - y[0]).filter((e) => { if (e[0] - lastB < g - 1e-6) return false; lastB = e[0]; return true; }); song.form.push('E');
  };
  // fit: 60–120 s even with ±6% tempo drift (the player's), by bars per section, then tempo
  let barsPer = 4; build(barsPer);
  const inWindow = () => seconds(song, bpm * (1 + DRIFT)) >= MIN_S && seconds(song, bpm * (1 - DRIFT)) <= MAX_S;
  for (let k = 0; k < 12 && !inWindow(); k++) {
    const mid = seconds(song);
    if (mid < MIN_S / (1 - DRIFT) + 4) { if (barsPer < 8) barsPer += 2; else bpm = Math.max(48, Math.round(bpm * 0.9)); }
    else { if (barsPer > 2) barsPer -= 2; else bpm = Math.round(bpm * 1.12); }
    song.bpm = bpm; build(barsPer);
  }
  song.bpm = bpm;
  percussion(r, song, modeId);
  song.fingering = fingerStyle(C);   // how his hands play it (skald-fingering.js solves each note)
  return song;
}
// the body of the guitar as a drum (Claude): a thud (d: the thumb's heel by the bridge) on the downbeats of the height and where a
// section turns, taps (k: fingertips on the top, golpe) on the off-beats of the height in bright and warm songs. Only where the right
// hand is free by the same hand rule as the notes, so nothing collides with a string it must sound.
const PERC = { thud: 0.75, tap: 0.55, tapModes: ['bright', 'warm'], turnThud: 0.6 };
function percussion(r, song, modeId) {
  const b = song.beatsPerBar, g = Math.max(0.5, Math.ceil((0.16 / (60 / song.bpm)) * 2) / 2), done = new Set();
  const free = (ev, t) => !ev.some((e) => Math.abs(e[0] - t) < g - 1e-6);
  const add = (ev, t, kind, vel) => {   // a thud is the palm's heel landing as the thumb plucks: it may share its beat with a note
    if (kind === 'd' ? !ev.some((e) => e[1] === 'd' && Math.abs(e[0] - t) < 1e-6) : free(ev, t)) ev.push([t, kind, [], vel]);
  };
  song.form.forEach((key, i) => {
    if (done.has(key) || key === 'E' || key === 'I') return; done.add(key);
    const ev = song.sections[key], last = ev.reduce((m, e) => Math.max(m, e[0]), 0), bars = Math.floor(last / b) + 1;
    if (key === 'P') for (let k = 0; k < bars; k++) {
      add(ev, k * b, 'd', PERC.thud);
      if (PERC.tapModes.includes(modeId)) for (let q = 1; q < b; q += 2) if (r() < 0.6) add(ev, k * b + q + (b === 3 ? 0 : 0.5), 'k', PERC.tap);
    } else if (i > 0 && r() < PERC.turnThud) add(ev, 0, 'd', PERC.thud * 0.8);
    ev.sort((x, y) => x[0] - y[0] || (x[1] === 'd') - (y[1] === 'd'));
  });
}

// ---- the gate ----
export function check(song) {
  const reasons = [];
  if (!song || typeof song !== 'object') return { ok: false, length: [0, 0], reasons: ['no song'] };
  if (!(song.bpm >= 40 && song.bpm <= 240)) reasons.push(`bpm ${song.bpm}`);
  if (![2, 3, 4, 6].includes(song.beatsPerBar)) reasons.push(`beatsPerBar ${song.beatsPerBar}`);
  if (!Array.isArray(song.form) || !song.form.length) reasons.push('no form');
  const spbFast = 60 / (song.bpm * (1 + DRIFT));
  for (const name of song.form || []) {
    const ev = song.sections?.[name];
    if (!Array.isArray(ev) || !ev.length) { reasons.push(`section ${name} empty`); continue; }
    let last = -1;
    for (const e of ev) {
      const [beat, kind, strs, vel, ring] = e, list = Array.isArray(strs) ? strs : [strs];
      if (!(beat >= 0)) reasons.push(`${name}: beat ${beat}`);
      if (!['p', 's', 'u', 'm', 'k', 'd'].includes(kind)) reasons.push(`${name}: kind ${kind}`);
      const perc = kind === 'k' || kind === 'd';                                                    // a tap or thud sounds no string
      if (perc ? list.length : !list.length || list.some((s) => !Number.isInteger(s) || s < 0 || s > 5)) reasons.push(`${name}: strings ${JSON.stringify(strs)}`);
      if (kind === 'p' && list.length !== 1) reasons.push(`${name}: pluck of ${list.length} strings`);
      if ((kind === 's' || kind === 'u') && list.length > 4) reasons.push(`${name}: strum of ${list.length}`);
      if (vel != null && !(vel > 0 && vel <= 1)) reasons.push(`${name}: vel ${vel}`);
      if (ring != null && !(ring > 0 && ring <= 4)) reasons.push(`${name}: ring ${ring}`);
      if (beat < last) reasons.push(`${name}: out of order at ${beat}`);
      if (kind === 'd') continue;                                                                   // the palm's heel: not the plucking hand's move
      if (last >= 0 && (beat - last) * spbFast < 0.15 - 1e-6) reasons.push(`${name}: hand can't make ${r3((beat - last) * spbFast)} s at beat ${beat}`);
      last = beat;
    }
  }
  if (song.guitarTuning != null && !GT[song.guitarTuning]) reasons.push(`guitarTuning ${song.guitarTuning}`);
  { const T = lyreMidi(song.tuning ?? HOME), G = guitarMidi(song.guitarTuning ?? G_HOME);   // every string's pitch must fret in the guitar's tuning
    const bad = T.filter((p) => !voiceNote(p, 1, G)); if (bad.length) reasons.push(`unplayable in ${song.guitarTuning}: ${bad.join(' ')}`); }
  const length = [r3(seconds(song, song.bpm * (1 + DRIFT))), r3(seconds(song, song.bpm * (1 - DRIFT)))];
  if (length[0] < MIN_S || length[1] > MAX_S) reasons.push(`length ${length[0]}–${length[1]} s`);
  return { ok: reasons.length === 0, length, reasons: reasons.slice(0, 8) };
}

// ---- the performance map (tl.expr) ----
// Built from a compiled timeline, so it fits composed and written songs alike and uses the real (drifted) tempo.
// Times are seconds from the song's start, the same clock as tl.hits. Shape (Savi's contract):
// { bars: [{ t, intensity }], phrases: [{ start, end, breathAt }], accents: [t], cadences: [{ t, final }],
//   peak: { start, end }, mood, beatsPerBar }
const MOOD_WORDS = [[/lament|grie|lonel|dark|lull|cradle|slow lament/i, 'lament'], [/saga|chant|ancient|solemn|wander/i, 'saga'], [/dance|fast|leap|bright|bold|glad|row/i, 'bright']];
export function expressionOf(song, tl) {
  const spb = tl.spb, bpb = song.beatsPerBar || 3, lead = tl.lead ?? 0.6, notes = tl.notes || [], hits = tl.hits || [];
  const bars = [], sections = [];
  let t = lead;
  for (const name of song.form || []) {
    const ev = song.sections?.[name] || [], last = ev.reduce((m, e) => Math.max(m, e[0]), 0), n = Math.floor(last / bpb) + 1;
    sections.push({ name, start: t, end: t + n * bpb * spb, bars: n });
    for (let k = 0; k < n; k++) bars.push({ t: r3(t + k * bpb * spb), e: 0 });
    t += n * bpb * spb;
  }
  // energy per bar: the sum of vel² of its notes, smoothed, scaled 0.2..1
  let bi = 0;
  for (let i = 0; i + 4 < notes.length + 1; i += 5) {
    const nt = notes[i]; while (bi + 1 < bars.length && bars[bi + 1].t <= nt) bi++;
    if (bars[bi]) bars[bi].e += (notes[i + 2] || 0) ** 2 * (notes[i + 4] ? 0.4 : 1);
  }
  const sm = bars.map((b, i) => 0.25 * (bars[i - 1]?.e ?? b.e) + 0.5 * b.e + 0.25 * (bars[i + 1]?.e ?? b.e));
  const mx = Math.max(1e-6, ...sm);
  const out = { bars: bars.map((b, i) => ({ t: b.t, intensity: r3(0.2 + 0.8 * sm[i] / mx) })), phrases: [], accents: [], cadences: [], peak: null, mood: 'warm', beatsPerBar: bpb };
  // the height: a composed song's P section, else the loudest two bars (four in 2)
  const P = sections.find((x) => x.name === 'P');
  if (P) out.peak = { start: r3(P.start), end: r3(P.end) };
  else { const w = bpb <= 2 ? 4 : 2; let best = 0, at = 0; for (let i = 0; i + w <= sm.length; i++) { const v = sm.slice(i, i + w).reduce((a, b) => a + b, 0); if (v > best) { best = v; at = i; } } out.peak = { start: out.bars[at]?.t ?? lead, end: r3((out.bars[at + w]?.t) ?? t) }; }
  // phrases: each section cut into two-bar breaths (four in 2), each from its first hand move to its last
  const per = bpb <= 2 ? 4 : 2;
  for (const S of sections) for (let k = 0; k < S.bars; k += per) {
    const a = S.start + k * bpb * spb, b = Math.min(S.end, a + per * bpb * spb), hs = hits.filter((h) => h[0] >= a - 0.05 && h[0] < b - 0.05); // the player's ±9 ms wobble may land a note just before its bar
    if (!hs.length) continue;
    const start = hs[0][0], end = hs[hs.length - 1][0];
    out.phrases.push({ start: r3(start), end: r3(end), breathAt: r3(Math.max(0, start - Math.min(0.6, Math.max(0.25, spb * 0.75)))) });
  }
  out.phrases.forEach((p, i) => out.cadences.push({ t: p.end, final: i === out.phrases.length - 1 }));
  // accents: every strum, and plucks sounding at vel ≥ 0.85
  const loud = new Set(); for (let i = 0; i + 4 < notes.length + 1; i += 5) if (notes[i + 2] >= 0.85) loud.add(Math.round(notes[i] * 100));
  for (const h of hits) if (h[1] === 's' || h[1] === 'u' || loud.has(Math.round(h[0] * 100))) out.accents.push(h[0]);
  out.mood = MODES[song.mode] ? song.mode : (MOOD_WORDS.find(([re]) => re.test(`${song.mood || ''} ${song.name || ''}`))?.[1] ?? 'warm');
  return out;
}
