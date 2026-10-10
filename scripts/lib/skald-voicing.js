// Rolf's fretting (Claude): which guitar string and fret sounds each note. Pure. Songs stay in pitches (a string index into the
// song's own tuning); the guitar stays in the home tuning (G A B D E G, lib/data/lyre-tunings.js) and frets whatever the song's
// tuning would have retuned. Open strings first; a fretted note keeps the hand where it is when a finger can reach it (one
// finger per fret: index on the hand's fret, pinky three above), else the index moves to it. Frets 0-12 (index up to 9); the two highest strings
// start at fret 3 (frets 1-2 up there are past his reach, art/rolfhands/solve.py).
import { tuningMidi } from './data/lyre-tunings.js';
import { tuningMidi as guitarMidi } from './data/guitar-tunings.js';
const HOME_MIDI = guitarMidi('standard');   // the guitar lives in standard E A D G B E (guitar-tunings.js HOME)
const MAXF = 10;
// VOICE.highMin: the lowest fret the two highest strings (s4, s5) may use. 3 is a relic of the old engine IK's reach (FINDINGS);
// the creator's chord chart needs frets 1-2 there. THE FLIP is this one number, 3 -> 1, once Savi's s4/s5 fret-1 pins land
// (C10: art/rolfhands/chords_test.mjs already checks the chart at 1). Read at call time, so a test can set it.
export const VOICE = { highMin: 3 };
// the index goes no higher than fret 5 (POSE-V2, 2026-09-28: at the current seat a natural left hand clears the guitar up to position 5;
// at 6-7 the forearm meets the upper bout); the pinky reaches 8. Exported so the fingering and the pose data read the same number.
export const TOP_HAND = 5;
// every (string, fret) that can sound this pitch within the hand's reach, lowest string first: the TASK 13 phrase optimizer's candidates
export function voiceOptions(pitch, G = HOME_MIDI) {
  const out = [];
  for (let s = 0; s < 6; s++) {
    const f = pitch - G[s];
    if (f < 0 || f > MAXF || (s >= 4 && f > 0 && f < VOICE.highMin)) continue;
    out.push({ string: s, fret: f });
  }
  return out;
}
// one note: { string, fret, finger (0 open, 1 index .. 4 pinky), hand (the index's fret) } or null if no string can sound it
export function voiceNote(pitch, hand = 1, G = HOME_MIDI) {
  const o = voiceOptions(pitch, G); if (!o.length) return null;
  const open = o.find((c) => c.fret === 0); if (open) return { ...open, finger: 0, hand };
  const reach = o.filter((c) => c.fret >= hand && c.fret <= hand + 3);
  const pick = (reach.length ? reach : o).reduce((a, b) => (Math.abs(b.fret - hand) < Math.abs(a.fret - hand) ? b : a));
  const h = pick.fret >= hand && pick.fret <= hand + 3 ? hand : Math.min(pick.fret, TOP_HAND);
  return { ...pick, finger: pick.fret - h + 1, hand: h };
}
// the options a hand at position h (index on fret h, pinky on h+3) can fret for a pitch
function inWindow(pitch, h, G = HOME_MIDI) {
  const out = [];
  for (let s = 0; s < 6; s++) { const f = pitch - G[s]; if (f >= h && f <= h + 3 && f <= MAXF && !(s >= 4 && f < VOICE.highMin)) out.push({ string: s, fret: f }); }
  return out;
}
const CLIMB = { gap: 1.1, stay: 0.4, positions: [3, 5], minShare: 0.5 };   // a phrase = notes with no gap > 1.1 s; 40% of phrases stay open
const hash = (x) => { let h = Math.floor(x * 1000) | 0; h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// a compiled timeline's notes ([t, string, vel, ring, kind, ...] flat, strings indexed into the song's tuning) -> one voicing per note.
// Each phrase picks where the hand sits: first position (open strings, as before) or up the neck at 3/5/7 where at least half the
// phrase can be fretted, the rest still open; same pitches, only where they are played. Deterministic per song.
// guitar: the tuning the GUITAR is in (guitar.state.tuning: { name, midi } / six MIDI numbers / a tuning id); default the old home
export function voiceNotes(notes, tuning, guitar) {
  const G = Array.isArray(guitar?.midi) ? guitar.midi : guitar ? guitarMidi(guitar) : HOME_MIDI, T = tuningMidi(tuning), out = new Array(notes.length / 5), idx = [];
  for (let i = 0; i < notes.length; i += 5) if (notes[i + 4] < 2) idx.push(i); else out[i / 5] = { string: notes[i + 1], fret: 0, finger: 0, hand: 1, perc: true };
  const phrases = []; let cur = [];
  for (const i of idx) { if (cur.length && notes[i] - notes[cur[cur.length - 1]] > CLIMB.gap) { phrases.push(cur); cur = []; } cur.push(i); }
  if (cur.length) phrases.push(cur);
  let hand = 1;
  for (const ph of phrases) {
    let pos = 1;
    if (hash(notes[ph[0]]) >= CLIMB.stay) {
      const fit = CLIMB.positions.filter((h) => ph.filter((i) => inWindow(T[notes[i + 1]], h, G).length).length / ph.length >= CLIMB.minShare);
      if (fit.length) pos = fit[Math.floor(hash(notes[ph[0]] + 0.37) * fit.length)];   // any position the phrase fits, so the hand travels
    }
    for (const i of ph) {
      const pitch = T[notes[i + 1]], w = pos > 1 ? inWindow(pitch, pos, G) : [];
      if (w.length) { const c = w.reduce((a, b) => (b.fret < a.fret ? b : a)); out[i / 5] = { ...c, finger: c.fret - pos + 1, hand: pos }; hand = pos; continue; }
      const v = voiceNote(pitch, hand, G); if (v && v.fret) hand = v.hand; out[i / 5] = v;
    }
  }
  hold(notes, T, G, idx, out);
  chords(notes, T, G, idx, out);
  return out;
}
// The creator's rule (2026-09-28): the left hand moves only when the music needs it, and a shift lands where it can be prepared: on a
// rest or an open string. So between two such points (an open-string note, or a gap of HOLD.rest s) the fretted notes form one run,
// and the run is played from ONE hand position when any position 1..TOP_HAND can fret all of it (the one nearest the last hand wins;
// strings kept where they already fit). A run no single position covers is cut into as few one-position segments as it can be.
export const HOLD = { rest: 0.3 };
function hold(notes, T, G, idx, out) {
  const ord = idx.filter((i) => out[i / 5]).sort((a, b) => notes[a] - notes[b] || a - b);
  let hand = 1, run = [], lastT = -9;
  const fits = (fr, h) => fr.every((i) => inWindow(T[notes[i + 1]], h, G).length);
  const place = (fr) => {                        // one position for all of fr, nearest the last hand; false if none covers it
    let best = null, bc = Infinity;
    for (let h = 1; h <= TOP_HAND; h++) {
      if (!fits(fr, h)) continue;
      let c = Math.abs(h - hand); for (const i of fr) if (!inWindow(T[notes[i + 1]], h, G).some((x) => x.string === out[i / 5].string)) c += 0.1;
      if (c < bc) { bc = c; best = h; }
    }
    if (best == null) return false;
    for (const i of fr) {
      const o = out[i / 5], w = inWindow(T[notes[i + 1]], best, G), c = w.find((x) => x.string === o.string) ?? w[0];
      o.string = c.string; o.fret = c.fret; o.hand = best; o.finger = c.fret - best + 1;
    }
    hand = best; return true;
  };
  const flush = () => {
    const fr = run.filter((i) => out[i / 5].fret); run = [];
    if (!fr.length || place(fr)) return;
    // no one position covers the run: as few shifts as possible, each segment as long as one position can hold it
    for (let a = 0; a < fr.length;) {
      let b = a + 1; while (b < fr.length && [...Array(TOP_HAND)].some((_, k) => fits(fr.slice(a, b + 1), k + 1))) b++;
      if (!place(fr.slice(a, b))) hand = out[fr[b - 1] / 5].hand;
      a = b;
    }
  };
  for (const i of ord) {
    const o = out[i / 5];
    if (notes[i] - lastT >= HOLD.rest) flush();
    lastT = notes[i];
    if (!o.fret) { flush(); continue; }            // an open string: the hand is free to move here
    run.push(i);
  }
  flush();
}
// W2: notes that sound together (onsets chained within CHORD s: a pluck group or a strum's sweep) must be one left-hand shape:
// every note on its own string, the fretted ones inside one box (index on fret h, pinky on h+3, h 1..TOP_HAND). A chord that breaks
// that is re-strung (same pitches, other strings) to the cheapest shape near the hand; hand/finger are then the box's.
export const CHORD = 0.03;
function shapeOf(c) {            // c: [{ string, fret }] -> the box range [lo, hi] of index frets, or null
  let mask = 0, lo = 99, hi = 0;
  for (const x of c) { if (mask & (1 << x.string)) return null; mask |= 1 << x.string; if (x.fret) { lo = Math.min(lo, x.fret); hi = Math.max(hi, x.fret); } }
  if (!hi) return [1, TOP_HAND];
  const a = Math.max(1, hi - 3), b = Math.min(lo, TOP_HAND);
  return a <= b ? [a, b] : null;
}
function chords(notes, T, G, idx, out) {
  const ord = idx.filter((i) => out[i / 5]).sort((a, b) => notes[a] - notes[b] || a - b);
  let hand = 1;
  for (let a = 0; a < ord.length;) {
    let b = a + 1; while (b < ord.length && notes[ord[b]] - notes[ord[b - 1]] <= CHORD) b++;
    const chain = ord.slice(a, b).map((i) => i / 5); a = b;
    // a chain no one hand shape can hold (four pitches that only three strings reach inside a box) is played as consecutive
    // shapes: the longest playable run, then the next (the later note re-sounds a string, the hand re-forms between onsets)
    for (let c0 = 0; c0 < chain.length;) {
      let c1 = chain.length;
      while (c1 > c0 + 1 && !solve(chain.slice(c0, c1), true)) c1--;
      solve(chain.slice(c0, c1), false); c0 = c1;
    }
  }
  function solve(g, dry) {
    let cur = g.map((k) => out[k]), r = shapeOf(cur);
    if (!r) {                     // re-string: every choice of strings for these pitches, cheapest box near the hand
      const opts = g.map((k, j) => { const o = voiceOptions(T[notes[k * 5 + 1]], G); return o.length ? o : [cur[j]]; });
      let best = null, bc = Infinity; const pick = new Array(g.length);
      const rec = (j) => {
        if (j === g.length) {
          const rr = shapeOf(pick); if (!rr) return;
          const h = Math.max(rr[0], Math.min(rr[1], hand));
          let c = Math.abs(h - hand) * 0.5; for (let q = 0; q < g.length; q++) c += (pick[q].fret ? 0.25 : 0) + (pick[q].string !== cur[q].string ? 0.5 : 0);
          if (c < bc) { bc = c; best = pick.slice(); }
          return;
        }
        for (const o of opts[j]) { pick[j] = o; rec(j + 1); }
      };
      rec(0);
      if (!best) return g.length === 1 ? (dry || null) : null;   // a lone note always stands as the voicer had it
      cur = best; r = shapeOf(cur);
    }
    if (dry) return true;
    const h = Math.max(r[0], Math.min(r[1], hand));
    g.forEach((k, j) => { const c = cur[j], o = out[k]; o.string = c.string; o.fret = c.fret; o.hand = c.fret ? h : o.hand; o.finger = c.fret ? c.fret - h + 1 : 0; });
    if (cur.some((c) => c.fret)) hand = h;
    return true;
  }
}
