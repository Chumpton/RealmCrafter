// Rolf's fingering (Savi wisp, fingering lane): which finger plays each note. Pure, deterministic, once per voicing (not per pluck).
// fingerTimeline(tl, voicing, style) writes, per note k (tl.notes stride 5, note k = index/5):
//   tl.rf[k] / voicing[k].rf : 'p' | 'i' | 'm' | 'a'  right finger (strums: the one finger that brushes the sweep, flagged tl.sweep[k] = 1)
//   tl.lf[k] / voicing[k].lf : 0 open, 1 index .. 4 pinky  left finger; voicing[k].hand = the solved position (index fret), .finger = lf,
//                              voicing[k].hand0 keeps the voicer's own hand. Frets and strings are never changed: sound and strings keep theirs.
// Right hand: a Viterbi over pluck groups (notes within 30 ms, a mute's strings) with classical costs: p on the bass strings 0-2,
// i-m alternation on the trebles (no finger twice running inside 0.45 s), a on the top string / the melody's top note, no awkward
// crossings (ascending strings with a lower finger), fingers in a group distinct and ordered p<i<m<a by string.
// Left hand: a Viterbi over fretted groups on hand position 1..7 (the voicer's TOP_HAND): one finger per fret (finger = fret - pos + 1),
// shifts cost base + per fret, cheaper across open strings / rests, a guide finger (same finger sliding on the same string) is cheaper
// still; chord ties at one fret take ascending fingers by string; a one-fret stretch is allowed and costed; never two strings on one finger
// except an index barre when a shape cannot fit.
// style = { rh: 'classical'|'arpeggio'|'flamenco', lh: 'position'|'guide'|'reach' } — JEV picks these once per composed song
// (skald-composer fingerChoices); absent = classical/position. The solver alone is complete: a JEV timeout still gets full rf/lf.
export const FINGER_STYLES = {
  rh: {
    classical: { text: 'Tarrega school: thumb on the basses, index and middle alternating the melody, ring finger on the top notes' },
    arpeggio: { text: 'each finger owns its string: thumb basses, index, middle, ring up the trebles, like a harp; strums brushed by the thumb' },
    flamenco: { text: 'Andalusian: the thumb carries the melody through the middle strings, fanned rasgueado strums' },
  },
  lh: {
    position: { text: 'stays in one hand position as long as it can, shifting rarely' },
    guide: { text: 'sings along the neck: slides a guide finger on one string to change position' },
    reach: { text: 'stretches a finger out of the box rather than moving the hand' },
  },
};
const RH = {
  classical: { pMid: 2.5, pHigh: 6, home: 0.35, aOff: 1.2, aTop: 0.1, lowFing: 3, rep: 3, repP: 0, cross: 1.2, down: 'i', up: 'i', soft: 'p' },
  arpeggio: { pMid: 4, pHigh: 7, home: 1.6, aOff: 0.4, aTop: 0, lowFing: 5, rep: 0.5, repP: 0, cross: 0.6, down: 'p', up: 'i', soft: 'p' },
  flamenco: { pMid: 0.4, pHigh: 3, home: 0.5, aOff: 1.5, aTop: 0.3, lowFing: 3.5, rep: 2, repP: 0.4, cross: 1, down: 'm', up: 'i', soft: 'p' },
};
const LH = {
  position: { base: 3, per: 0.6, guide: 0.8, stretch: 2.5, free: 0.35, home: 0.15 },
  guide: { base: 1.6, per: 0.5, guide: 1.6, stretch: 2.5, free: 0.35, home: 0.1 },
  reach: { base: 3.5, per: 0.8, guide: 0.8, stretch: 1.0, free: 0.4, home: 0.15 },
};
const FING = ['p', 'i', 'm', 'a'], TOP_POS = 7, GROUP = 0.03, REP_DT = 0.45;
// every increasing choice of n fingers out of p,i,m,a (n 1..4), as index arrays: the group's strings take them low to high
const COMBOS = [[], [], [], [], []];
for (let m = 1; m < 16; m++) { const c = []; for (let b = 0; b < 4; b++) if (m & (1 << b)) c.push(b); COMBOS[c.length].push(c); }
export const fallbackRf = (s) => (s <= 2 ? 'p' : s === 3 ? 'i' : s === 4 ? 'm' : 'a');

function rhUnary(f, s, top, R) {
  if (f === 0) return s <= 2 ? 0 : s === 3 ? R.pMid : R.pHigh;
  let c = s <= 1 ? R.lowFing + 2 : s === 2 ? R.lowFing : 0;
  c += R.home * Math.abs(s - (f + 2));                       // i home string 3, m 4, a 5
  if (f === 3) c += top || s === 5 ? R.aTop : R.aOff;
  return c;
}
// fingers for a group at position p (index on fret p): each note on its box finger (fret - p + 1, 1..4). Two notes at one fret:
  // at the index fret the index bars them (barre); above it the tie squeezes onto the next free finger, ascending by string
  // (the A-major shape), costed stretch. Fingers rise with frets. null = the group does not fit this position.
const fbuf = [0, 0, 0, 0, 0, 0];
function shape(voicing, ks, p, stretch) {
    const m = ks.length;
    for (let j = 0; j < m; j++) { const b = voicing[ks[j]].fret - p + 1; if (b < 1 || b > 4) return null; }
    let best = null, bc = Infinity;
    const rec = (j, c) => {
      if (c >= bc) return;
      if (j === m) { bc = c; best = fbuf.slice(0, m); return; }
      const fr = voicing[ks[j]].fret, box = fr - p + 1;
      let tie = false; for (let i = 0; i < m; i++) if (i !== j && voicing[ks[i]].fret === fr) tie = true;
      for (let x = 1; x <= 4; x++) {
        if (x !== box && (!tie || Math.abs(x - box) > 1)) continue;
        let ok = true;
        for (let i = 0; i < j && ok; i++) {
          const fi = voicing[ks[i]].fret;       // ks run by fret, then string: fi <= fr
          if (fbuf[i] === x) ok = x === 1 && box === 1 && fi === fr;          // only the index bars, only on its own fret
          else if (fbuf[i] > x) ok = false;                                   // fingers rise with fret (and with string in a tie)
        }
        if (ok) { fbuf[j] = x; rec(j + 1, c + (x !== box ? stretch : 0) + (x === 1 && box === 1 && tie ? 0.4 : 0)); }
      }
    };
    rec(0, 0);
    return best ? { f: best, c: bc } : null;
}
// a chord's fretted notes (sorted by fret, then string) that one hand at some position 1..TOP_POS holds with distinct fingers
function fretSort(voicing, ks) { return ks.filter((k) => voicing[k].fret > 0).sort((x, y) => voicing[x].fret - voicing[y].fret || voicing[x].string - voicing[y].string); }
function holdable(voicing, ks) { const fr = fretSort(voicing, ks); if (!fr.length) return true; for (let p = 1; p <= TOP_POS; p++) if (shape(voicing, fr, p, 0)) return true; return false; }
// the left hand's chords: sounding notes (onset order) chained within GROUP; a new shape starts where a string sounds again
// (re-plucking cuts the earlier note) or where the next note would leave no one-hand shape (the voicer split it there too)
export function leftChords(notes, voicing, lord) {
  const out = [];
  for (let a = 0; a < lord.length;) {
    let b = a + 1, mask = 1 << voicing[lord[a]].string, split = null;
    while (b < lord.length && notes[lord[b] * 5] - notes[lord[b - 1] * 5] <= GROUP) {
      if (mask & (1 << voicing[lord[b]].string)) { split = 'restrung'; break; }
      if (!holdable(voicing, lord.slice(a, b + 1))) { split = 'reshaped'; break; }
      mask |= 1 << voicing[lord[b++]].string;
    }
    out.push({ all: lord.slice(a, b), split: split && lord[b] }); a = b;
  }
  return out;
}
export function fingerTimeline(tl, voicing, style) {
  const notes = tl?.notes; if (!notes) return null;
  const n = notes.length / 5, R = RH[style?.rh] ?? RH.classical, L = LH[style?.lh] ?? LH.position;
  const rf = new Array(n).fill(null), lf = new Array(n).fill(0), sweep = new Array(n).fill(0);
  const order = Array.from({ length: n }, (_, k) => k).sort((a, b) => notes[a * 5] - notes[b * 5] || a - b);
  const str = (k) => (voicing?.[k] && voicing[k].string != null ? voicing[k].string : notes[k * 5 + 1]);
  // which right-hand move each sounding note belongs to (a grace note 60 ms before its hit joins it)
  const psu = (tl.hits ?? []).filter((h) => h[1] === 'p' || h[1] === 's' || h[1] === 'u').sort((a, b) => a[0] - b[0]);
  let hp = -1;
  const groups = [];            // { ks: [note k], t, sweep: 'down'|'up'|null }
  let cur = null;
  for (const k of order) {
    const t = notes[k * 5], kind = notes[k * 5 + 4];
    if (kind >= 2) continue;
    let type = 'p', hit = -1;
    if (kind === 0) {
      while (hp + 1 < psu.length && psu[hp + 1][0] <= t + 0.065) hp++;
      if (hp >= 0 && t >= psu[hp][0] - 0.07 && t <= psu[hp][0] + 0.12) { type = psu[hp][1]; hit = hp; }
    } else type = 'm';
    if (type === 's' || type === 'u') {
      if (!cur || cur.hit !== hit || !cur.sweep) { cur = { ks: [], t, sweep: type, hit }; groups.push(cur); }
    } else if (!cur || cur.sweep || t - cur.t > GROUP) { cur = { ks: [], t, sweep: null, hit }; groups.push(cur); }
    cur.ks.push(k);
  }
  // ---- right hand ----
  const plucks = groups.filter((g) => !g.sweep);
  for (const g of groups) if (g.sweep) {
    const vel = notes[g.ks[0] * 5 + 2], f = g.sweep === 'u' ? R.up : vel < 0.55 ? R.soft : R.down;
    for (const k of g.ks) { rf[k] = f; sweep[k] = 1; }
  }
  if (plucks.length) {
    // melody top: a single note higher than its neighbours within 0.5 s
    const tops = plucks.map((g, gi) => {
      if (g.ks.length !== 1) return false; const s = str(g.ks[0]);
      const pv = plucks[gi - 1], nx = plucks[gi + 1];
      const hi = (o) => !o || Math.abs(o.t - g.t) > 0.5 || Math.max(...o.ks.map(str)) <= s;
      return s >= 3 && hi(pv) && hi(nx);
    });
    let prevCost = null, prevStates = null; const back = [];
    plucks.forEach((g, gi) => {
      const ks = g.ks.slice().sort((a, b) => str(a) - str(b) || notes[a * 5] - notes[b * 5]); g.sorted = ks;
      const states = COMBOS[Math.min(4, ks.length)], cost = new Array(states.length), from = new Array(states.length);
      states.forEach((c, si) => {
        let u = 0; for (let j = 0; j < c.length; j++) u += rhUnary(c[j], str(ks[j]), tops[gi], R);
        let best = 0, bi = -1;
        if (prevStates) {
          best = Infinity; const pg = plucks[gi - 1], dt = g.t - pg.t;
          prevStates.forEach((pc, pi) => {
            let tc = prevCost[pi];
            if (dt < REP_DT) for (const f of c) if (pc.includes(f)) tc += f === 0 ? R.repP : R.rep;
            if (c.length === 1 && pc.length === 1 && dt < 0.6) {             // string crossing
              const s0 = str(pg.sorted[pg.sorted.length - 1]), s1 = str(ks[0]);
              if ((s1 > s0 && c[0] < pc[0] && c[0] > 0) || (s1 < s0 && c[0] > pc[0] && pc[0] > 0)) tc += R.cross;
            }
            if (tc < best) { best = tc; bi = pi; }
          });
        }
        cost[si] = u + best; from[si] = bi;
      });
      back.push(from); prevCost = cost; prevStates = states;
    });
    let si = prevCost.indexOf(Math.min(...prevCost));
    for (let gi = plucks.length - 1; gi >= 0; gi--) {
      const g = plucks[gi], c = COMBOS[Math.min(4, g.sorted.length)][si];
      g.sorted.forEach((k, j) => { rf[k] = FING[c[Math.min(j, c.length - 1)]]; });
      si = back[gi][si];
    }
  }
  // percussion: a tap wants the ring finger, a thud the thumb — any finger not already sounding within 30 ms
  for (const k of order) {
    const kind = notes[k * 5 + 4]; if (kind < 2) continue;
    const t = notes[k * 5], busy = new Set();
    for (let j = 0; j < n; j++) if (j !== k && rf[j] && !sweep[j] && Math.abs(notes[j * 5] - t) <= GROUP) busy.add(rf[j]);
    const pref = kind === 2 ? ['a', 'm', 'i', 'p'] : ['p', 'a', 'm', 'i'];
    rf[k] = pref.find((f) => !busy.has(f)) ?? pref[0];
  }
  // ---- left hand (W2: strict one-finger-per-fret) ----
  // chords for the left hand: sounding notes whose onsets chain within GROUP (a pluck group or a strum's whole sweep) = one shape
  const lord = order.filter((k) => voicing?.[k] && !voicing[k].perc && notes[k * 5 + 4] < 2);
  const lgroups = [];
  for (const { all } of leftChords(notes, voicing, lord)) {
    const fr = fretSort(voicing, all);
    if (fr.length) lgroups.push({ ks: fr, t: notes[all[0] * 5], end: notes[all[all.length - 1] * 5] });
    else if (lgroups.length) lgroups[lgroups.length - 1].openAfter = true;
  }
  if (lgroups.length) {
    let prev = null; const back = [], shapes = [];
    lgroups.forEach((g, gi) => {
      const h0 = voicing[g.ks[0]].hand ?? 1, cost = new Array(TOP_POS + 1).fill(Infinity), from = new Array(TOP_POS + 1).fill(-1), sh = new Array(TOP_POS + 1).fill(null);
      let any = false;
      for (let p = 1; p <= TOP_POS; p++) if ((sh[p] = shape(voicing, g.ks, p, L.stretch))) any = true;
      if (!any) {                                  // the voicer left an unshapeable chord: index on the lowest note, the rest capped (logged by checkFingering)
        const p = Math.max(1, Math.min(TOP_POS, voicing[g.ks[0]].fret)), f = g.ks.map((k) => Math.max(1, Math.min(4, voicing[k].fret - p + 1)));
        sh[p] = { f, c: 50 };
      }
      for (let p = 1; p <= TOP_POS; p++) {
        const s = sh[p]; if (!s) continue;
        const u = s.c + L.home * Math.abs(p - h0);
        if (!prev) { cost[p] = u; continue; }
        const pg = lgroups[gi - 1], free = pg.openAfter || g.t - pg.end > 0.5 ? L.free : 1;
        for (let q = 1; q <= TOP_POS; q++) {
          if (prev.cost[q] === Infinity) continue;
          let tc = prev.cost[q];
          if (q !== p) {
            let m = (L.base + L.per * Math.abs(p - q)) * free;
            const pf = prev.sh[q].f; let guide = false;
            g.ks.forEach((k, j) => pg.ks.forEach((pk, pj) => { if (voicing[k].string === voicing[pk].string && s.f[j] === pf[pj]) guide = true; }));
            if (guide) m = Math.max(0.3, m - L.guide);
            tc += m;
          } else if (g.t - pg.end < 0.2) {                             // same finger jumping strings fast
            g.ks.forEach((k, j) => pg.ks.forEach((pk, pj) => { if (s.f[j] === prev.sh[q].f[pj] && voicing[k].string !== voicing[pk].string && voicing[k].fret !== voicing[pk].fret) tc += 0.8; }));
          }
          if (tc < cost[p]) { cost[p] = tc; from[p] = q; }
        }
        cost[p] += u;
      }
      back.push(from); shapes.push(sh); prev = { cost, sh };
    });
    let p = prev.cost.indexOf(Math.min(...prev.cost.slice(1)), 1);
    for (let gi = lgroups.length - 1; gi >= 0; gi--) {
      const g = lgroups[gi], s = shapes[gi][p];
      g.ks.forEach((k, j) => {
        const v = voicing[k]; if (v.hand0 == null) v.hand0 = v.hand; v.hand = p; v.finger = s.f[j]; lf[k] = s.f[j];
        v.squeeze = s.f[j] !== v.fret - p + 1;
        v.barre = s.f[j] === 1 && g.ks.some((o, i) => i !== j && s.f[i] === 1 && voicing[o].fret === v.fret);
      });
      p = back[gi][p];
    }
  }
  // hold: a fretted finger stays down while its note rings (t + ring), lifting at the first later note that needs it off:
  // that string sounding again (another fret, or open), the hand shifting, or the same finger wanted on another string/fret
  // (an index barre on the same fret keeps it). tl.hold[k] / voicing[k].hold = the lift time in song seconds (0 = open/perc).
  const hold = new Array(n).fill(0);
  for (let oi = 0; oi < lord.length; oi++) {
    const k = lord[oi], v = voicing[k]; if (!v.fret || !lf[k]) continue;
    const t = notes[k * 5]; let end = t + notes[k * 5 + 3];
    for (let oj = oi + 1; oj < lord.length; oj++) {
      const j = lord[oj], tj = notes[j * 5]; if (tj >= end) break; if (tj <= t + GROUP) continue;
      const w = voicing[j];
      if (w.string === v.string || (w.fret && w.hand !== v.hand) || (w.fret && lf[j] === lf[k] && !(lf[k] === 1 && w.fret === v.fret))) { end = tj; break; }
    }
    hold[k] = end;
  }
  for (let k = 0; k < n; k++) {
    if (!rf[k]) rf[k] = fallbackRf(str(k));
    const v = voicing?.[k]; if (v) { v.rf = rf[k]; v.lf = lf[k]; v.hold = hold[k]; if (!v.fret) { v.finger = 0; v.barre = false; v.squeeze = false; } }
  }
  tl.rf = rf; tl.lf = lf; tl.hold = hold; tl.barre = voicing ? Array.from({ length: n }, (_, k) => !!voicing[k]?.barre) : []; tl.sweep = sweep; tl.fingering = { rh: style?.rh && RH[style.rh] ? style.rh : 'classical', lh: style?.lh && LH[style.lh] ? style.lh : 'position' };
  return tl;
}
