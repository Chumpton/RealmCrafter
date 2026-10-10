// Rolf's moving guitar strings (Claude; tuned by Savi wisp strings lane). Pure: stringsAt(tl, voicing, t) -> bone offsets for
// art/strings/guitar_strings.glb. Each string is a damped swing with momentum: every note adds its push to the swing already there
// (a ringing string is pushed again, not restarted), the push scales with velocity on a gentle curve, the first swing overshoots on
// the pull side then settles exponentially at the string's own ring time, a mute chokes it dead in ~40 ms, and a fretted note bends
// only the span between the finger and the saddle. Offsets are in the guitar's frame (metres): +x toward the low-string side, +z into
// the top. Bones per string s: s{s}_a/b/c (the solid string at u = 0.25/0.5/0.75 from the saddle), s{s}_gAa.. and s{s}_gBa.. (the two
// see-through ghosts, a thin spread either side while it rings). The returned object is reused call to call: callers copy it at once.
import { STRINGS as S } from './data/skald-strings.js';
const US = [0.25, 0.5, 0.75], ABC = 'abc', cache = new WeakMap(), cl = (v) => Math.max(-S.max, Math.min(S.max, v));
const velGain = (v) => { const V = S.vel, x = Math.max(0, Math.min(1, v)); return V.floor + (1 - V.floor) * Math.pow(x, V.gamma); };
// stroke direction across the strings: fingers pull up toward the palm (+x), the thumb and a down-strum push down (-x), an up-strum +x
const dirOf = (kind, s) => (kind === 'u' ? 1 : kind === 's' ? -1 : s <= 2 ? -1 : 1);
function events(tl, voicing) {
  let E = cache.get(tl); if (E && E.v === voicing) return E.list;
  const list = [[], [], [], [], [], []], hits = tl.hits || [];
  for (let i = 0, n = 0; i < tl.notes.length; i += 5, n++) {
    if (tl.notes[i + 4] >= 2) continue;                                          // taps and thuds hit the wood, not a string
    const t = tl.notes[i], s = tl.notes[i + 1], vel = tl.notes[i + 2], ring = tl.notes[i + 3], mute = tl.notes[i + 4] === 1;
    const h = hits.find((x) => Math.abs(x[0] - t) < 0.08 && x[2]?.includes(s)), str = voicing?.[n]?.string ?? s;
    const tau = !mute && ring > 0 && ring < S.short ? Math.max(S.choke, Math.min(S.ring[str], ring * S.shortShare)) : S.ring[str];
    const st = S.stroke[tl.stroke?.[n] === 'rest' || tl.stroke?.[n] === 1 ? 'rest' : 'free'];      // tl.stroke[n]: the right hand's stroke (TASK 13)
    list[str].push({ t, push: S.amp[str] * velGain(vel) * st.gain, tau, mute, dir: dirOf(h?.[1] ?? 'p', s), fret: voicing?.[n]?.fret ?? 0, into: st.into });
  }
  for (const l of list) l.sort((a, b) => a.t - b.t);
  cache.set(tl, { v: voicing, list }); return list;
}
// one string's swing at time t, run forward as a damped phasor (re, im) plus a fast-fading pull-side bias (the asymmetric first
// swing): each push first damps what's ringing (the fingertip meets the moving string: S.carry of it survives) then adds its own
// pull; a mute switches the decay to the choke until the next push. Results land in SW (no allocation per call).
const SW = { x: 0, env: 0, dir: 1, fret: 0, into: 0 };
function swing(ev, s, t) {
  const w = 2 * Math.PI * S.hz[s]; let re = 0, im = 0, tau = S.ring[s], at = 0, dir = 1, fret = 0, into = S.stroke.free.into, bias = 0, bAt = 0, bTau = S.asymT;
  let lo = 0, hi = ev.length;                                                    // skip what has long rung out: start 8 ring-times back (O(log n))
  const from = t - 8 * S.ring[s]; while (lo < hi) { const m = (lo + hi) >> 1; if (ev[m].t < from) lo = m + 1; else hi = m; }
  if (lo > 0) at = ev[lo]?.t ?? t;
  for (let i = lo; i <= ev.length; i++) {
    const e = ev[i], until = e && e.t <= t ? e.t : t, dt = until - at;
    if (dt > 0) { const k = Math.exp(-dt / tau), c = Math.cos(w * dt), sn = Math.sin(w * dt), r2 = k * (re * c - im * sn); im = k * (re * sn + im * c); re = r2; }
    at = until;
    if (!e || e.t > t) break;
    if (e.mute) { tau = S.choke; bias *= Math.exp(-(at - bAt) / bTau); bAt = at; bTau = S.choke; continue; }
    bias = bias * Math.exp(-(at - bAt) / bTau) * S.carry + S.asym * e.push; bAt = at; bTau = Math.min(S.asymT, e.tau);
    tau = e.tau; re = re * S.carry + e.push; im *= S.carry; dir = e.dir; fret = e.fret; into = e.into;
  }
  const b = bias * Math.exp(-(t - bAt) / bTau);
  SW.x = re + b; SW.env = Math.hypot(re, im) + Math.abs(b); SW.dir = dir; SW.fret = fret; SW.into = into; return SW;
}
const shape = (u, fret) => { const uf = Math.pow(2, -fret / 12); return u < uf ? Math.sin(Math.PI * u / uf) : 0; };  // fret n: the nut-side part is held still
// the retune's bow on one string at nowMs (0 when that string isn't being turned or has settled)
function tensionOf(turning, s, nowMs) {
  const T = S.tension; if (!T || !turning || turning.string !== s || !Number.isFinite(nowMs)) return 0;
  const el = (nowMs - turning.startAt) / 1000, dur = Math.max(0.05, turning.dur || 1);
  if (el < 0) return 0;
  if (el < dur) { const cur = turning.from + (turning.to - turning.from) * (el / dur); return Math.min(T.max, T.mmPerSemi * (Math.max(turning.from, turning.to) - cur)); }
  const a = el - dur; if (a > T.settle * 3) return 0;                                   // after the click: a small pluck that settles
  return T.click * (T.clickAmp?.[s] ?? S.amp[s]) * Math.exp(-a / T.settle) * Math.cos(2 * Math.PI * S.hz[s] * a);
}
const OUT = { still: true, bones: {} }, B = OUT.bones;
const put = (k, x, z) => { const o = B[k] || (B[k] = { x: 0, y: 0, z: 0 }); o.x = cl(x); o.y = 0; o.z = cl(z); };
// opts (optional): { turning, nowMs } from the guitar row, so a string being retuned visibly slackens or draws taut
export function stringsAt(tl, voicing, t, opts) {
  const ev = events(tl, voicing); OUT.still = true;
  for (let s = 0; s < 6; s++) {
    const { x, env, dir, fret, into } = swing(ev[s], s, t), bow = tensionOf(opts?.turning, s, opts?.nowMs);
    if (bow) {
      OUT.still = false; const A = S.tension.axis;
      for (let k = 0; k < 3; k++) { const sh0 = Math.sin(Math.PI * US[k]), sh = shape(US[k], fret), c = ABC[k];
        const bx = bow * sh0 * A.x + x * sh * dir, bz = bow * sh0 * A.z + Math.abs(x) * sh * into;
        put(`s${s}_${c}`, bx, bz); put(`s${s}_gA${c}`, bx, bz); put(`s${s}_gB${c}`, bx, bz); }
      continue;
    }
    if (env > S.rest) OUT.still = false;
    const g0 = Math.min(S.blurMax, env * S.blur * 0.5);
    for (let k = 0; k < 3; k++) {
      const sh = shape(US[k], fret), c = ABC[k], g = g0 * sh, cx = x * sh * dir, cz = Math.abs(x) * sh * into;
      put(`s${s}_${c}`, cx, cz); put(`s${s}_gA${c}`, cx + g, cz); put(`s${s}_gB${c}`, cx - g, cz);
    }
  }
  return OUT;
}
