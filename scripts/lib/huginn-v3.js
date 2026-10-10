// HUGINN-V3 (docs/board/proposals/HUGINN-V3.md, CONTESTED 4/7 → ruled GO-READY, creator go 2026-10-01): the pure parts of v3,
// tested by scripts/lib/huginn-v3.test.mjs. No ctx here: second look, least-recently-checked, doubles, clusters, file ids, the write guard, JEV's score.
import { V3 } from './data/huginn.js';

// S6: a cheap stable hash of an ask's input (skip the ask when it repeats)
export function hashOf(v) { const s = JSON.stringify(v ?? null); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

// S3: the second look. see() answers true when this sighting confirms (a later pass, or the same pass ≥ gapMs later: a mop recheck)
export function makePending(max = V3.pendingMax, ttl = V3.pendingPasses, gapMs = V3.secondGapMs) {
  const m = new Map(); // key → { pass, at, x, z, tier }
  return {
    m,
    see(key, pass, at, x, z, tier) {
      const e = m.get(key);
      if (e && (pass > e.pass || at - e.at >= gapMs)) { m.delete(key); return true; }
      if (e) { e.last = pass; return false; }
      if (m.size >= max) m.delete(m.keys().next().value); // the oldest goes first
      m.set(key, { pass, last: pass, at, x, z, tier }); return false;
    },
    prune(pass) { for (const [k, e] of m) if (pass - e.last > ttl) m.delete(k); },
    dots(n = V3.pendingDots) { const out = []; for (const e of m.values()) { if (out.length >= n) break; out.push([Math.round(e.x), Math.round(e.z), e.tier]); } return out; },
    clear() { m.clear(); },
  };
}

// S4: least-recently-checked first. lastChk id → pass; ties keep today's rotation order (pass*m + j). Evicts the oldest past max.
export function pickChecks(cands, m, pass, lastChk, max = V3.lastChkMax) {
  const k = cands.length; if (!k || m <= 0) return [];
  const off = ((pass * m) % k + k) % k;
  const ix = cands.map((r, j) => ({ r, j, t: lastChk.get(r.id) ?? -1, o: (j - off + k) % k }));
  ix.sort((a, b) => a.t - b.t || a.o - b.o);
  const out = ix.slice(0, Math.min(m, k)).map((e) => e.r);
  for (const r of out) { lastChk.delete(r.id); lastChk.set(r.id, pass); }
  while (lastChk.size > max) lastChk.delete(lastChk.keys().next().value);
  return out;
}

// S2 DOUBLE: same drawn thing within 2 cm of another, same yaw. key on a 2 cm grid; returns [first, dupe] pairs
export const drawnKind = (r) => { const md = r.model; if (md) return 'm:' + (typeof md === 'string' ? md : md.id ?? ''); const p = r.primitive; return p ? 'p:' + (p.kind ?? '') + ':' + (p.script ?? '') : null; };
export function doublesOf(rows, tol = V3.doubleM) {
  const seen = new Map(), out = [];
  for (const r of rows) { const d = drawnKind(r), fp = r.fp; if (!d || !fp) continue;
    const yaw = Math.round(+(r.yaw ?? 0)) ;
    const key = `${d}|${Math.round(fp.x / tol)}|${Math.round(fp.y / tol)}|${Math.round(fp.z / tol)}|${yaw}`;
    const a = seen.get(key); if (a) out.push([a, r]); else seen.set(key, r); }
  return out;
}

// S5: code pre-groups open findings by kind + id prefix (yard-torch-3 → yard-torch); groups of ≥ 3 go to JEV for one cause
export const prefixOf = (id) => String(id ?? '').replace(/^cell-/, '').replace(/[-_/]?\d+$/, '').replace(/[-_/]$/, '') || String(id);
export function groupsOf(findings, min = V3.clusterMin) {
  const g = new Map();
  for (const f of findings) { const k = f.kind + '|' + prefixOf(f.id); if (!g.has(k)) g.set(k, []); g.get(k).push(f); }
  return [...g.entries()].filter(([, v]) => v.length >= min).map(([k, v]) => ({ key: k, kind: v[0].kind, prefix: k.split('|')[1], hs: v.map((f) => 'H' + f.n) }));
}

// S7: ids never repeat. Returns the seq to continue from and renumbers the second copy of any duplicated H number
export function fixIds(findings, seq) {
  let n = Math.max(seq | 0, ...findings.map((f) => f.n | 0), 0); const seen = new Set(), moved = [];
  for (const f of findings) { if (seen.has(f.n)) { const was = f.n; f.n = ++n; f.note = `renumbered from H${was}`; f.dMoved = true; moved.push([was, f.n]); } seen.add(f.n); }
  return { seq: n, moved };
}
// S7: refuse a write that drops more than `max` open lines at once (a trim to maxLines is allowed: it is not a bad read)
export function guardDrop(beforeOpen, afterOpen, afterAll, maxLines, max = V3.dropMax) { return !(beforeOpen - afterOpen > max && afterAll < maxLines); }
export const openCount = (text, parse, OPEN) => text.split('\n').reduce((n, l) => { const g = parse(l); return n + (g && OPEN.has(g.status) ? 1 : 0); }, 0);

// S6: JEV's score. A window is 3 min of fog gain with or without a JEV flight pick steering. Days compare the two means.
export function dayVerdict(rows) { // rows: [{ jev: bool, gain }] with gain set
  const a = rows.filter((r) => r.jev && r.gain != null), b = rows.filter((r) => !r.jev && r.gain != null);
  if (a.length < V3.scoreMin || b.length < V3.scoreMin) return null; // not enough of either: no verdict
  const ma = a.reduce((n, r) => n + r.gain, 0) / a.length, mb = b.reduce((n, r) => n + r.gain, 0) / b.length;
  return { jev: Math.round(ma * 100) / 100, code: Math.round(mb * 100) / 100, won: ma >= mb, n: a.length + b.length };
}
// three lost days running: flight asks go to the code alone
export const shouldGround = (days) => days.length >= V3.loseDays && days.slice(-V3.loseDays).every((d) => d && d.won === false);
// the stall doctor's approach point: 20 m out from the speck on the bearing JEV named (0 = north/-Z, clockwise seen from above)
export function approachOf(pt, bearing, d = V3.stallApproachM) { const b = bearing * Math.PI / 180; return [pt[0] + Math.sin(b) * d, pt[1] - Math.cos(b) * d]; }
