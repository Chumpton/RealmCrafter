// Rolf's lyre as a sound program: six plucked gut strings synthesised on this machine (Karplus-Strong, so every string
// is exactly in tune), played from the note list lore-skald.js publishes with the song's start on the room clock.
// Every screen schedules the same notes against the same clock, so a late arrival joins mid-bar.
import { HALL } from './lib/data/hall-acoustics.js';
import { openStrings, turnSecs } from './lib/guitar-pitch.js'; // the guitar's one pitch function (shared with Rolf, the borrow and Orm)
import { RETUNE as GRETUNE } from './lib/data/guitar-tunings.js';
const MIDI = [50, 52, 55, 57, 59, 62]; // the old D tuning, used only when a row names none (lib/data/lyre-tunings.js is the table)
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// pluckBuffer's in-place loop averages a sample with the NEXT old one, so its period is N-0.5 samples (N rounded): off by up to
// 23 cents (G5), mostly sharp, pitch by pitch (measured: period exactly N-0.5 at 44.1 and 48 kHz). The cents that put each buffer back on its pitch, as the source's detune (it multiplies any playbackRate).
const ksFix = (sr, f) => { const N = Math.max(2, Math.round(sr / f)); return 1200 * Math.log2((N - 0.5) * f / sr); };
// two instruments, one program. lyre: gut on a small maple box, short and bright. nylon: a classical guitar,
// round flesh attack, long sustain, the air cavity's thump near 100 Hz and the top plate near 200 Hz.
const VOICES = {
  lyre:  { secs: 3.2, decay: [0.9962, 0.9972], soft: [3, 0], body: [[230, 1.1, 5]], top: 3600, mute: 0.94 },
  nylon: { secs: 4.6, decay: [0.9981, 0.9986], soft: [4, 1], body: [[102, 2.2, 6], [205, 1.4, 4], [420, 1.8, -2]], top: 4200, mute: 0.9 },
};
function pluckBuffer(ac, f, secs, seed, damp, tone = 1, v = VOICES.lyre) {
  const sr = ac.sampleRate, len = Math.floor(sr * secs), buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / f)), ring = new Float32Array(N);
  let s = seed >>> 0 || 7; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296) * 2 - 1; };
  for (let i = 0; i < N; i++) ring[i] = rnd() * (1 - i / N * 0.4);
  // the excitation IS the finger: the thumb's flesh smooths the burst (fewer highs), a fingertip near the bridge keeps it
  // raw and cuts the harmonics a pluck point would null (a comb at the pluck position).
  const passes = v.soft[tone ? 1 : 0];
  for (let k = 0; k < passes; k++) { let prev = ring[N - 1]; for (let i = 0; i < N; i++) { const c = ring[i]; ring[i] = 0.5 * (c + prev); prev = c; } }
  const at = Math.max(1, Math.round(N * (tone ? 0.12 : 0.28))), src = ring.slice();
  for (let i = 0; i < N; i++) ring[i] = src[i] - 0.7 * src[(i + at) % N];
  let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(ring[i])); for (let i = 0; i < N; i++) ring[i] /= peak || 1;
  const decay = damp ?? v.decay[tone ? 0 : 1]; let prev = 0; // flesh-plucked strings ring a touch longer and softer
  for (let i = 0; i < len; i++) {
    const j = i % N, cur = ring[j], nxt = ring[(j + 1) % N];
    ring[j] = decay * (0.5 * (cur + nxt)); d[i] = cur * 0.8 + prev * 0.2; prev = cur;
  }
  return buf;
}
// the hall: a short lime-plaster-and-timber tail, made once per machine
function hallImpulse(ac, secs, seed) {
  const sr = ac.sampleRate, len = Math.floor(sr * secs), b = ac.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let s = (seed + ch * 7919) >>> 0, lp = 0;
    for (let i = 0; i < len; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; const n = (s >>> 0) / 4294967296 * 2 - 1; const t = i / sr;
      lp += (n - lp) * (0.35 - 0.25 * (t / secs)); d[i] = lp * Math.exp(-t * 4.2) * (t < 0.012 ? t / 0.012 : 1); } // highs die first: wood and thatch
  }
  return b;
}
// one buffer set per pitch, made on first need and kept: a retune costs only the strings that changed
const CACHE = {};
function bank(ac, voice) {
  const v = VOICES[voice] || VOICES.lyre, k = ac.sampleRate + ':' + (VOICES[voice] ? voice : 'lyre'); if (CACHE[k]) return CACHE[k];
  const B = { by: {}, hall: hallImpulse(ac, 1.6, 4242), v };
  B.note = (m, i) => { // the voice of pitch m sitting on string slot i (the slot seeds its grain, so strings never sound cloned)
    const key = m + ':' + i; if (B.by[key]) return B.by[key];
    return (B.by[key] = {
      fix: ksFix(ac.sampleRate, hz(m)), // cents: every buffer below shares one period, so one correction
      pl: [0, 1].map((tone) => [0, 1].map((alt) => pluckBuffer(ac, hz(m), v.secs, 101 + i * 17 + alt * 991 + tone * 53 + m * 7, null, tone, v))), // [tone][variant]
      mute: pluckBuffer(ac, hz(m), 0.25, 301 + i * 13 + m, v.mute, 1, v),
      hum: pluckBuffer(ac, hz(m), 3.5, 701 + i * 29 + m, 0.9985, 0, v), // a string ringing from the air, not a finger
    });
  };
  return (CACHE[k] = B);
}
// which open strings answer which: any pair an octave, a fifth or a fourth apart shares overtones
function sympathy(tun) {
  const AMT = { 12: 0.9, 7: 0.5, 5: 0.35, 19: 0.3 }, out = {};
  for (let a = 0; a < 6; a++) { out[a] = []; for (let b = 0; b < 6; b++) { const d = Math.abs(tun[a] - tun[b]); if (a !== b && AMT[d]) out[a].push([b, AMT[d]]); } }
  return out;
}
export function setup({ ctx: ac, out, now, params }) {
  const voice = (params && params.voice) || 'lyre', V = bank(ac, voice);
  let tun = MIDI.slice(), S = [], SYMP = {};
  function tuneTo(t) { // six pitches from the row (the song's tuning); strings keep their slot, pitch comes from the table
    const raw = Array.isArray(t) && t.length === 6 && t.every((x) => Number.isFinite(x)) ? t : null;
    const next = raw ?? (voice === 'nylon' ? openStrings(t) : MIDI); // the guitar names its tuning any way (id, names, { name, midi }); default standard
    if (S.length && next.join() === tun.join()) return;
    tun = next.slice(); S = tun.map((m, i) => V.note(m, i)); SYMP = sympathy(tun);
  }
  tuneTo(params && params.tuning);
  // the sound box: warm, a little wooden body around 230 Hz, no harsh top
  const modes = V.v.body.map(([f, q, g]) => { const b = ac.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = f; b.Q.value = q; b.gain.value = g; return b; });
  for (let i = 1; i < modes.length; i++) modes[i - 1].connect(modes[i]);
  const body = modes[0], bodyOut = modes[modes.length - 1];
  const top = ac.createBiquadFilter(); top.type = 'lowpass'; top.frequency.value = V.v.top; top.Q.value = 0.5;
  const master = ac.createGain(); master.gain.value = 1.15;
  // the walls: everything leaves through one lowpass whose cutoff is where this screen's ear stands (hall, doorway, outside)
  const wall = ac.createBiquadFilter(); wall.type = 'lowpass'; wall.frequency.value = HALL.inCut; wall.Q.value = 0.4; wall.connect(out);
  bodyOut.connect(top); top.connect(master); master.connect(wall);
  const verb = ac.createConvolver(); verb.buffer = V.hall; const wet = ac.createGain(); wet.gain.value = HALL.inWet; // the longhouse around him
  top.connect(verb); verb.connect(wet); wet.connect(wall);
  const dryGain = master.gain.value, L = ac.listener, H = HALL;
  const inBox = (x, y, z) => x > H.inside.x[0] && x < H.inside.x[1] && z > H.inside.z[0] && z < H.inside.z[1] && y > H.inside.y[0] && y < H.inside.y[1];
  let lastZone = -1;
  function listen() {
    if (!L.positionX) return;
    const x = L.positionX.value, y = L.positionY.value, z = L.positionZ.value;
    let k; // 1 = in the hall, 0 = round the outside of a wall; between = the doorway's crossfade
    if (inBox(x, y, z)) k = 1;
    else { let d = 1e9; for (const o of H.doors) d = Math.min(d, Math.hypot(x - o.x, z - o.z)); k = d < H.fade ? 0.5 * (1 - d / H.fade) : 0; } // in the opening itself = half inside
    const door = Math.max(0, 1 - Math.abs(k - 0.5) * 2); // 1 exactly on the threshold
    const cut = k >= 0.5 ? H.doorCut + (H.inCut - H.doorCut) * (k - 0.5) * 2 : H.wallCut + (H.doorCut - H.wallCut) * k * 2;
    const g = k >= 0.5 ? H.doorGain + (H.inGain - H.doorGain) * (k - 0.5) * 2 : H.wallGain + (H.doorGain - H.wallGain) * k * 2;
    const zone = Math.round(k * 20); if (zone === lastZone) return; lastZone = zone;
    const t = ac.currentTime;
    wall.frequency.setTargetAtTime(cut, t, 0.15); master.gain.setTargetAtTime(dryGain * g, t, 0.15);
    wet.gain.setTargetAtTime(k >= 0.5 ? H.inWet : H.outWet * (0.6 + 0.4 * door), t, 0.2);
  }
  listen(); const poll = setInterval(listen, H.pollMs);
  let live = [], songKey = null;
  // the clock: setup's `now` is this page's audio time (seconds), not the room's, so the first startAt this voice hears
  // is taken as "now" on the audio clock; later times (the fuss, a restart) are measured from it. A song reaches every
  // screen within a beat of Rolf starting it, so the first pluck lands with his hand.
  let skew = null, runs = 0;
  const roomNow = () => ac.currentTime * 1000 - (skew ?? 0);
  function anchor(sentAt) { // sentAt: the room time Rolf wrote the row. The clock only ever moves forward to meet it:
    if (skew === null || roomNow() < sentAt) skew = ac.currentTime * 1000 - sentAt; // a fresh write arriving 'early' means we were behind
  }
  function stopAll() { const t = ac.currentTime; for (const n of live) { try { n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0, t, 0.05); n.src.stop(t + 0.3); } catch (e) {} } live = []; }
  function schedule(p) {
    if (!p.keep) stopAll(); // keep: a hand-played lyre (scripts/lyre-play.js) lets the last notes ring under the next press
    const notes = p.notes || [], startAt = p.startAt || 0, lat = p.latency ?? 0.08, gain = p.gain ?? 1;
    anchor(p.sentAt ?? startAt);
    const offset = (roomNow() - startAt) / 1000 - lat; // seconds into the song right now
    const t0 = ac.currentTime; let queued = 0; runs++;
    const W = p.stride === 6 ? 6 : 5; // stride 6: the sixth field is the pitch that sounds (a fretted note on string s)
    for (let i = 0; i + W - 1 < notes.length; i += W) {
      const at = notes[i] - offset; if (at < -0.05) continue;
      const s = notes[i + 1], vel = notes[i + 2], ring = notes[i + 3], kind = notes[i + 4];
      const when = t0 + Math.max(0, at);
      if (kind === 2 || kind === 3) { knock(when, kind === 2 ? 480 + s * 40 : 110, Math.floor(notes[i] * 1000) + i, (0.4 + 0.6 * vel) * gain); queued++; continue; } // 2 a fingertip tap on the top, 3 the thumb's thud by the bridge
      const m = W === 6 && Number.isFinite(notes[i + 5]) ? notes[i + 5] : tun[s];
      const Vs = m === tun[s] ? S[s] : V.note(m, s);
      const thumb = s <= 2, alt = (i / W) % 2; // thumb on the low three, fingers on the high: the composer's fingering
      const src = ac.createBufferSource(); src.buffer = kind ? Vs.mute : Vs.pl[thumb ? 0 : 1][alt]; src.detune.value = Vs.fix;
      src.playbackRate.value = 1 + ((i * 37) % 7 - 3) * 0.0006; // a breath of detune, gut strings never sit dead still
      const g = ac.createGain(); const peak = (0.3 + 0.7 * vel) * (thumb ? 0.8 : 0.85) * gain; queued++; // makeup: soft notes still carry, loud ones don't clip
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(peak, when + 0.004);
      g.gain.setTargetAtTime(0, when + ring, 0.09); // the left hand damps it
      src.connect(g); g.connect(body); src.start(when); src.stop(when + ring + 0.6);
      live.push({ src, g });
      src.onended = () => { live = live.filter((n) => n.src !== src); };
      if (!kind && vel > 0.5) for (const [o, amt] of SYMP[s] || []) { // the open strings that share its overtones hum along, quiet and slow
        const h = ac.createBufferSource(); h.buffer = S[o].hum; h.detune.value = S[o].fix; const hg = ac.createGain(), hp = peak * amt * 0.09;
        hg.gain.setValueAtTime(0, when); hg.gain.linearRampToValueAtTime(hp, when + 0.18); hg.gain.setTargetAtTime(0, when + ring + 0.4, 0.5);
        h.connect(hg); hg.connect(body); h.start(when); h.stop(when + ring + 2.5); live.push({ src: h, g: hg });
        h.onended = () => { live = live.filter((n) => n.src !== h); };
      }
    }
    if (p.peak) hum(p.peak, notes, offset, t0, W);
    console.log('[lyre] schedule', { song: p.song, run: runs, offset: Math.round(offset * 10) / 10, queued, of: notes.length / W, voice, ctx: ac.state });
  }
  // through the height of the song he hums under the strings: a closed-mouth voice an octave below the melody, a breath, never a tune of its own
  function hum(peak, notes, offset, t0, W = 5) {
    const g = ac.createGain(), vowel = ac.createBiquadFilter(), nasal = ac.createBiquadFilter();
    vowel.type = 'lowpass'; vowel.frequency.value = 520; vowel.Q.value = 0.8; nasal.type = 'peaking'; nasal.frequency.value = 260; nasal.gain.value = 6;
    const osc = ac.createOscillator(); osc.type = 'triangle';
    const a = t0 + Math.max(0, peak.start - offset), b = t0 + Math.max(0, peak.end - offset); if (b - a < 1) return;
    let first = true;
    for (let i = 0; i + W - 1 < notes.length; i += W) {
      const at = notes[i]; if (at < peak.start || at > peak.end || notes[i + 4]) continue;
      const when = t0 + Math.max(0, at - offset), f = hz(W === 6 && Number.isFinite(notes[i + 5]) ? notes[i + 5] : tun[notes[i + 1]]) / 2;
      if (first) { osc.frequency.setValueAtTime(f, a); first = false; } else osc.frequency.setTargetAtTime(f, when, 0.06); // glides, the way a voice follows
    }
    if (first) return;
    g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(0.055, a + 1.2); g.gain.setValueAtTime(0.055, Math.max(a + 1.2, b - 1.2)); g.gain.linearRampToValueAtTime(0, b + 0.4);
    osc.connect(nasal); nasal.connect(vowel); vowel.connect(g); g.connect(top);
    osc.start(a); osc.stop(b + 0.5); live.push({ src: osc, g });
    osc.onended = () => { live = live.filter((n) => n.src !== osc); };
  }
  // the fuss after a song: pegs creak, a string slides into tune, knuckles knock the maple. Each knock is its own
  // little resonance (two wooden modes, their own Q, decay and brightness from the knock's seed), never the same twice.
  const noise = (secs, seed) => { const len = Math.max(1, Math.floor(ac.sampleRate * secs)), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); let s = seed >>> 0 || 9; for (let i = 0; i < len; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = ((s >>> 0) / 4294967296 * 2 - 1) * (1 - i / len); } return b; };
  function knock(when, hz, seed, level) {
    let s = seed >>> 0 || 3; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    const src = ac.createBufferSource(); src.buffer = noise(0.004 + rnd() * 0.008, seed);
    const vel = level ?? (0.35 + rnd() * 0.45), bright = ac.createBiquadFilter(); bright.type = 'lowpass'; bright.frequency.value = 1400 + rnd() * 2600;
    src.connect(bright);
    const modes = [[hz, 6 + rnd() * 14, 1], [hz * (2.05 + rnd() * 0.9), 4 + rnd() * 10, 0.25 + rnd() * 0.4], [hz * (0.5 + rnd() * 0.12), 3 + rnd() * 5, rnd() * 0.35]];
    const decay = 0.04 + rnd() * 0.12;
    for (const [f, q, amp] of modes) {
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = ac.createGain(); g.gain.setValueAtTime(vel * amp * 2.2, when); g.gain.setTargetAtTime(0, when + 0.004, decay * (f < hz ? 1.6 : 1));
      bright.connect(bp); bp.connect(g); g.connect(master);
    }
    src.start(when); src.stop(when + 0.05);
  }
  function creak(when, seed) {
    let s = seed >>> 0 || 5; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    const n = 3 + Math.floor(rnd() * 4);
    for (let k = 0; k < n; k++) {
      const at = when + k * (0.04 + rnd() * 0.05), src = ac.createBufferSource(); src.buffer = noise(0.003, seed + k);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + rnd() * 1500; bp.Q.value = 8;
      const g = ac.createGain(); g.gain.value = 0.18 + rnd() * 0.15;
      src.connect(bp); bp.connect(g); g.connect(master); src.start(at); src.stop(at + 0.02);
    }
  }
  // a guitar tuner turned: the worm gear's small bright ticks, not a wooden peg's creak
  function click(when, seed) {
    let s = seed >>> 0 || 7; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    const n = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const at = when + k * (0.06 + rnd() * 0.04), src = ac.createBufferSource(); src.buffer = noise(0.002, seed + k * 13);
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200 + rnd() * 1600; bp.Q.value = 14;
      const g = ac.createGain(); g.gain.value = 0.1 + rnd() * 0.08;
      src.connect(bp); bp.connect(g); g.connect(master); src.start(at); src.stop(at + 0.015);
    }
  }
  function slide(when, str, from) {
    const src = ac.createBufferSource(); src.buffer = S[str].pl[1][0]; src.detune.value = S[str].fix;
    src.playbackRate.setValueAtTime(from, when); src.playbackRate.linearRampToValueAtTime(1, when + 0.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.32, when + 0.004); g.gain.setTargetAtTime(0, when + 0.9, 0.2);
    src.connect(g); g.connect(body); src.start(when); src.stop(when + 1.8);
    live.push({ src, g });
  }
  // a peg turned while the string rings: the old pitch bends to the new in small nudges (the peg sticks, then gives)
  function retuneSlide(when, str, from, to) {
    const src = ac.createBufferSource(), nb = V.note(to, str); src.buffer = nb.pl[1][0]; src.detune.value = nb.fix;
    const r0 = Math.pow(2, (from - to) / 12), secs = 1.4, nudges = 4;
    src.playbackRate.setValueAtTime(r0, when);
    for (let k = 1; k <= nudges; k++) { const at = when + 0.15 + (secs - 0.15) * k / nudges; src.playbackRate.setValueAtTime(r0 + (1 - r0) * (k - 1) / nudges, at - 0.18); src.playbackRate.linearRampToValueAtTime(r0 + (1 - r0) * k / nudges, at); creak(at - 0.18, Math.floor(at * 997) + str); }
    const g = ac.createGain(); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(0.34, when + 0.004); g.gain.setTargetAtTime(0.12, when + 0.3, 0.5); g.gain.setTargetAtTime(0, when + secs + 0.3, 0.25);
    src.connect(g); g.connect(body); src.start(when); src.stop(when + secs + 1.6);
    live.push({ src, g });
  }
  // a peg's first bite: one short wooden click (the tuner's post seating in the maple head), low and dry
  function pegClick(when, seed) {
    let s = seed >>> 0 || 11; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    const src = ac.createBufferSource(); src.buffer = noise(0.003, seed);
    for (const [f, q, amp, dec] of [[1650 + rnd() * 500, 9, 0.5, 0.018], [3900 + rnd() * 900, 12, 0.22, 0.009], [620 + rnd() * 120, 5, 0.3, 0.03]]) {
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = ac.createGain(); g.gain.setValueAtTime(amp, when); g.gain.setTargetAtTime(0, when + 0.002, dec);
      src.connect(bp); bp.connect(g); g.connect(master);
    }
    src.start(when); src.stop(when + 0.08);
  }
  // the pitch a turning string is at, u = 0..1 of the turn: eased toward 'to', past it by a quarter-tone-ish, then settled
  function turnPitch(from, to, u) {
    const d = to - from, os = Math.sign(d) * Math.min(0.35, 0.08 + Math.abs(d) * 0.06); // overshoot, semitones past 'to'
    if (u <= 0) return from; if (u >= 1) return to;
    if (u < 0.72) { const k = u / 0.72, e = 1 - Math.pow(1 - k, 2.2); return from + (d + os) * e; } // turning: fast then slowing
    const k = (u - 0.72) / 0.28; return to + os * Math.pow(1 - k, 1.6); // backing off onto the note
  }
  // a string being tuned: a peg click at the turn's start, test plucks that ring while the pitch glides from->to
  // (the rate automated along turnPitch), and a last check pluck true on the new note
  let turnKey = null;
  function turning(p) {
    const tr = p.turning, key = tr ? `${tr.startAt}|${tr.string}|${tr.to}` : null;
    if (key === turnKey) return; turnKey = key; if (!tr || !S.length) return;
    const str = Math.max(0, Math.min(5, tr.string | 0)), from = Number(tr.from), to = Number(tr.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    const secs = turnSecs(tr, GRETUNE.perSemi, GRETUNE.slide), check = GRETUNE.check;
    anchor(p.sentAt ?? tr.startAt); const off = (roomNow() - tr.startAt) / 1000 - (p.latency ?? 0.08), t0 = ac.currentTime;
    const at = (t) => t0 + Math.max(0, t - off), past = (t) => t - off < -0.05;
    if (!past(0)) pegClick(at(0), Math.floor(tr.startAt) % 100000 + str);
    const nb = V.note(to, str), base = (m) => Math.pow(2, (m - to) / 12);
    const plucks = []; for (let t = 0.12; t < secs - 0.2; t += Math.max(0.45, check)) plucks.push(t); plucks.push(secs + 0.05); // test plucks, then the check
    plucks.forEach((pt, k) => {
      if (past(pt)) return;
      const when = at(pt), last = k === plucks.length - 1, ring = last ? 1.6 : Math.min(1.1, Math.max(0.5, check * 1.6));
      const src = ac.createBufferSource(); src.buffer = nb.pl[1][k % 2]; src.detune.value = nb.fix;
      const steps = 12; src.playbackRate.setValueAtTime(base(turnPitch(from, to, pt / secs)), when);
      if (!last) for (let j = 1; j <= steps; j++) { const tt = pt + ring * j / steps; src.playbackRate.linearRampToValueAtTime(base(turnPitch(from, to, tt / secs)), at(tt)); }
      const g = ac.createGain(), pk = last ? 0.3 : 0.24 - 0.02 * Math.min(3, k);
      g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(pk, when + 0.004); g.gain.setTargetAtTime(0, when + ring, 0.15);
      src.connect(g); g.connect(body); src.start(when); src.stop(when + ring + 0.8);
      live.push({ src, g }); src.onended = () => { live = live.filter((n) => n.src !== src); };
    });
  }
  let fussKey = null;
  function fuss(p) {
    const f = p.fuss, key = f ? String(f.startAt) : null;
    if (key === fussKey) return; fussKey = key; if (!f) return;
    anchor(p.sentAt ?? f.startAt); const offset = (roomNow() - f.startAt) / 1000 - (p.latency ?? 0.08), t0 = ac.currentTime;
    for (const [t, kind, a, b, c] of f.ev) {
      const at = t - offset; if (at < -0.05) continue;
      const when = t0 + Math.max(0, at);
      if (kind === 'turn') turning({ turning: { string: a, from: b, to: c, startAt: f.startAt + t * 1000 }, sentAt: p.sentAt, latency: p.latency }); else if (kind === 'tap') knock(when, b, c); else if (kind === 'peg') (p.voice === 'nylon' ? click : creak)(when, Math.floor(t * 1000) + a); else if (kind === 'test') slide(when, a, b); else if (kind === 'retune') retuneSlide(when, a, b, c);
    }
  }
  function apply(p) {
    if (p && p.tuning) tuneTo(p.tuning);
    const key = p && p.playing ? `${p.song}|${p.startAt}` : null;
    fuss(p || {}); turning(p || {}); // p.turning mirrors lore-skald-guitar.state.turning while a peg turns
    if (key && key === songKey && p.sentAt && roomNow() < p.sentAt - 250) { schedule(p); return; } // a fresher room time: this voice was behind (joined late), re-aim once
    if (key === songKey) return; songKey = key;
    if (key) schedule(p); else if (!(p && (p.fuss || p.turning))) stopAll();
  }
  apply(params || {});
  return { update(p) { apply(p || {}); }, dispose() { clearInterval(poll); stopAll(); try { master.disconnect(); } catch (e) {} } };
}
