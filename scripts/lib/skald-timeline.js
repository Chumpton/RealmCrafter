// Turns one song from lib/data/skald-songs.js into a flat note timeline, the same on every machine for one seed.
// Output: { notes: [t, string, vel, ring, kind, ...] flat (kind 0 pluck, 1 mute, 2 tap, 3 thud), hits: [[t, kind, strings[]]...], length }
// hits are the right hand's moves (one per event: a strum is one hit across several strings); notes are what sounds.
import { SONGS } from './data/skald-songs.js';
import { expressionOf } from './skald-composer.js';
export { SONGS };
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
export function songById(id) { return SONGS.find((s) => s.id === id) || SONGS[0]; }
export function compile(songId, seed, opts = {}) {
  const song = typeof songId === 'object' && songId ? songId : songById(songId), r = rng(seed * 7919 + 13); // a composed song arrives whole
  const tempo = song.bpm * (1 + (r() - 0.5) * 0.12) * (opts.tempoScale ?? 1);
  const spb = 60 / tempo, swing = Math.max(0, (song.swing ?? 0) + (r() - 0.5) * 0.06);
  const notes = [], hits = [];
  let t = opts.lead ?? 0.6;
  const form = song.form || ['A'];
  form.forEach((name, fi) => {
    const ev = song.sections[name] || [];
    const lastBeat = ev.reduce((m, e) => Math.max(m, e[0]), 0);
    const bars = Math.floor(lastBeat / song.beatsPerBar) + 1, secBeats = bars * song.beatsPerBar;
    const soft = fi === form.length - 1 && form.length > 2 && r() < 0.35 ? 0.78 : 1;
    for (const e of ev) {
      const [beat, kind, strs, vel0, ring0] = e;
      const frac = beat % 1, sw = Math.abs(frac - 0.5) < 0.01 ? swing * spb : 0;
      const at = t + beat * spb + sw + (r() - 0.5) * 0.018;
      const vel = Math.max(0.2, Math.min(1, (vel0 ?? 0.8) * soft * (0.92 + r() * 0.16)));
      const list = Array.isArray(strs) ? strs : [strs];
      if (kind === 'p') {
        const s = list[0];
        if (r() < 0.12 && s > 0) notes.push(at - 0.06, s - 1, vel * 0.5, 0.25, 0);
        notes.push(at, s, vel, ring0 ?? 1.6, 0);
      } else if (kind === 'k' || kind === 'd') {                  // the body as a drum: 2 a fingertip tap on the top, 3 the thumb's thud by the bridge
        notes.push(at, kind === 'k' ? 5 : 0, vel, 0.05, kind === 'k' ? 2 : 3);
      } else if (kind === 'm') {
        list.forEach((s, i) => notes.push(at + i * 0.006, s, vel * 0.7, ring0 ?? 0.08, 1));
      } else {
        const spread = 0.012 + r() * 0.016, order = kind === 'u' ? [...list].reverse() : list;
        order.forEach((s, i) => notes.push(at + i * spread, s, vel * (i === 0 ? 1 : 0.85), ring0 ?? 1.2, 0));
      }
      hits.push([Math.round(at * 1000) / 1000, kind, list]);
    }
    t += secBeats * spb;
  });
  for (let i = 0; i < notes.length; i++) notes[i] = Math.round(notes[i] * 1000) / 1000;
  const tl = { id: song.id, name: song.name, notes, hits, length: t + 2.5, spb, beatsPerBar: song.beatsPerBar, lead: opts.lead ?? 0.6 };
  tl.expr = expressionOf(song, tl); // how Rolf performs it (Claude): bars, phrases, accents, cadences, peak, mood
  return tl;
}
