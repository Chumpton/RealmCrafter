// The body of scripts/guitar-play.js (its thin door, scripts/lib/lazy-hooks.js): moved here so it stays out of the arrival set.
// Playing Rolf's borrowed guitar (lane 3; the player's behavior beside lyre-play.js): 1–6 pluck low E to high E, Z X C take
// the G, C, D shapes and strum them, left click strums down and right click up in the shape held. Each press writes a burst
// of notes onto the copy's own voice (Rolf's program, nylon), every screen near it sounds them at the press's room time;
// the copy's strings swing on this screen's clock (skald-strings.js, the same swing as Rolf's).
import { GUITAR_BORROW as G, guitarTuning, chordFrets } from './data/guitar-borrow.js';
import { stringsAt } from './skald-strings.js';
import { rig } from './rig-names.js';
import { pitch } from './guitar-pitch.js';
import { TUNINGS } from './data/guitar-tunings.js';
const TUNE_ORDER = Object.keys(TUNINGS);
const PEG = '/cdn/moodboard-lowpoly-cozy/sfx-wooden-guitar-peg-turn-creak.mp3';
const CHORDS = Object.keys(G.chords);
function scratch(ctx) { const s = (ctx.session.guitarPlay ??= {}); return (s[ctx.self.id] ??= { chord: null, ev: [], tl: null, base: 0, on: false, held: null }); }
function heldGuitar(ctx) {
  const id = ctx.self.state?.holding; if (!id) return null;
  const L = ctx.getObject(id); return L && L.state?.kind === 'guitar' ? L : null;
}
export function onInput(ctx, input) {
  const L = heldGuitar(ctx); if (!L) return;
  const P = input.pressed || {}, sc = scratch(ctx), notes = [], hits = [];
  if (sc.held !== L.id) { sc.held = L.id; sc.chord = null; sc.ev = []; }
  // the guitar plays in the tuning it is in now (the row's state.tuning, read never written); shapes re-fingered per tuning
  const row = ctx.getObject(L.state?.from ?? G.id);
  // the holder retunes it (the tuning plate in ui.js, or T to step): the row keeps it, so whoever picks it up next, Rolf too, finds it as left
  let tunedTo = null;
  if (row && (P.guitarTune || P.tuneNext)) {
    const cur = guitarTuning(row).name, want = P.guitarTune ? input.actionData?.guitarTune?.name : TUNE_ORDER[(TUNE_ORDER.indexOf(cur) + 1) % TUNE_ORDER.length];
    if (want && TUNINGS[want] && want !== cur) {
      row.state.turning = null; row.state.tuning = { name: want, midi: TUNINGS[want].midi.slice() }; tunedTo = want; sc.chord = null;
      ctx.emit('playSound', { clip: PEG, position: L.worldFeetPosition ?? ctx.self.feetPosition, volume: 0.5, maxDistance: 12 });
    }
  }
  const T = guitarTuning(row), tun = T.midi;
  const fretOf = (i) => (sc.chord ? (chordFrets(sc.chord, T.name) ?? [])[i] : 0);
  const add = (t, i, vel, ring, fret) => notes.push(t, i, vel, ring, 0, pitch(tun, i, fret ?? 0));
  for (let i = 0; i < 6; i++) if (P['pluck' + (i + 1)]) { const f = fretOf(i); add(0, i, G.pluck.vel, G.pluck.ring, f ?? 0); hits.push({ t: 0, s: i, fret: f ?? 0, dir: i <= 2 ? -1 : 1 }); }
  let down = !!P.strum, up = !!P.strumUp;
  for (const k of CHORDS) if (P[k]) { sc.chord = k; down = true; }
  const S = G.strum;
  const strum = (order, vel, dir) => { let k = 0; for (const i of order) { const f = fretOf(i); if (f == null) continue; add(k * S.spread, i, vel * (k ? 0.9 : 1), S.ring, f); hits.push({ t: k * S.spread, s: i, fret: f, dir }); k++; } };
  if (down) strum([0, 1, 2, 3, 4, 5], S.vel, -1);
  if (tunedTo) { let k = 0; for (let i = 0; i < 6; i++) { add(0.12 + k * 0.16, i, G.pluck.vel * 0.8, G.pluck.ring, 0); hits.push({ t: 0.12 + k * 0.16, s: i, fret: 0, dir: 1 }); k++; } } // a slow open-string roll: the new tuning, heard
  if (up) strum([5, 4, 3, 2, 1, 0], S.upVel, 1);
  if (!notes.length) return;
  const now = ctx.now(), A = G.audio;
  L.audio = { kind: 'program', script: A.script, spatial: true, maxDistance: A.maxDistance, gain: 1,
    params: { playing: true, keep: true, song: 'hand', startAt: now, sentAt: now, notes, tuning: tun, voice: A.voice, stride: 6, latency: A.latency, gain: A.gain } };
  ctx.emit('squash', { target: L.id, axis: 'z', intensity: G.squash.intensity, duration: G.squash.duration });
  // the strings' history, in seconds from a base on the room clock
  if (!sc.ev.length) sc.base = now;
  for (const h of hits) sc.ev.push({ t: (now - sc.base) / 1000 + h.t, s: h.s, fret: h.fret, dir: h.dir, vel: h.dir === 1 && up ? S.upVel : G.pluck.vel });
  if (sc.ev.length > G.strings.maxNotes) sc.ev.splice(0, sc.ev.length - G.strings.maxNotes);
  sc.tl = null; sc.on = true;
}
// The copy is spawned by the guitar row's owner, whose realm can't read this body's bone names, so it guesses the old
// rig's 'Spine02'. The holder's own machine can read them: once per copy, seat it on this rig's real chest bone, or,
// on a rig with no spine at all, on the body frame (the hall lyre's way). Without this it hangs at the body root: low.
function seat(ctx) {
  const id = ctx.self.state?.holding, S = (ctx.session.guitarSeat ??= {}); if (!id || S[id]) return;
  const L = heldGuitar(ctx); if (!L) return;
  const r = rig(ctx, ctx.self.id); if (!r.map) return; // not readable yet: ask next frame
  const H = G.held, want = r.map['spine2'] ?? r.map['spine1'] ?? r.map['chest'] ?? r.map['upperchest'] ?? null;
  S[id] = true;
  if (want) { if (L.attachment?.bone !== want) { L.attachment = { bone: want }; L.feetPosition = { ...H.feet }; L.rotation = { ...H.rotation }; } }
  else { L.attachment = null; L.feetPosition = { ...H.body.feet }; L.rotation = { ...H.body.rotation }; }
  ctx.log('guitar seat', { bone: want, had: L.attachment?.bone ?? null });
}
export function update(ctx) {
  seat(ctx);
  const sc = ctx.session.guitarPlay?.[ctx.self.id]; if (!sc || !sc.on) return;
  const L = heldGuitar(ctx), St = L?.state?.strings ? ctx.getObject(L.state.strings) : null;
  if (!L || !St) { sc.on = false; sc.ev = []; return; }
  const t = (ctx.now() - sc.base) / 1000;
  while (sc.ev.length && t - sc.ev[0].t > G.strings.keepSec) { sc.ev.shift(); sc.tl = null; }
  if (!sc.ev.length) { St.bones = null; sc.on = false; return; }
  if (!sc.tl) { // a small timeline in the shape skald-strings.js reads: notes stride 5, hits [t, kind, [strings]], voicing per note
    const notes = [], hits = [], voicing = [];
    for (const e of sc.ev) { notes.push(e.t, e.s, e.vel, 1, 0); hits.push([e.t, e.dir === 1 ? 'u' : 's', [e.s]]); voicing.push({ string: e.s, fret: e.fret }); }
    sc.tl = { notes, hits, voicing };
  }
  const R = stringsAt(sc.tl, sc.tl.voicing, t);
  if (R.still) { St.bones = null; sc.on = false; sc.ev = []; return; }
  const b = {}; for (const k in R.bones) { const v = R.bones[k]; b[k] = { x: Math.round(v.x * 1e4) / 1e4, y: 0, z: Math.round(v.z * 1e4) / 1e4 }; }
  St.bones = b;
}
