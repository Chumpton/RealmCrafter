// HEIMDALL-CONVERGE (creator GO 2026-10-02 "go"): a point HEIMDALL passed stays passed while the plan still carries the
// quote it passed on. Only open points are re-judged, so rounds converge instead of re-rolling every point.
// row.locked = { POINT: { q: quote, r: round } }, ≤ 6 rows of ≤ 240 chars (board-bell row budget).
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const PASS_AT = 3, QMAX = 240, MINQ = 12;
const holds = (text, q) => q && q.length >= MINQ && norm(text).includes(norm(q));
// before scoring: a locked point whose quote still stands reads as passed in every seat that judged it lower
export function lockApply(checked, locked, text) {
  if (!locked) return { checked, kept: [] };
  const kept = Object.keys(locked).filter((id) => holds(text, locked[id]?.q));
  if (!kept.length) return { checked, kept };
  const out = {};
  for (const [w, v] of Object.entries(checked)) {
    out[w] = { ...v, points: (v.points ?? []).map((p) => kept.includes(p.id) && !(p.score >= PASS_AT)
      ? { ...p, score: PASS_AT, pass: true, severity: null, quoted: true, evidence: locked[p.id].q, why: `locked: passed round ${locked[p.id].r}, its quote still stands (was ${p.score ?? 0}: ${String(p.why ?? "").slice(0, 160)})` }
      : p) };
  }
  return { checked: out, kept };
}
// after scoring: carry the locks whose quote still stands, add each point every judging seat passed with a quote
export function lockNext(prev, checked, text, round) {
  const next = {};
  for (const [id, l] of Object.entries(prev ?? {})) if (holds(text, l?.q)) next[id] = l;
  const seats = Object.values(checked);
  const ids = new Set(seats.flatMap((v) => (v.points ?? []).map((p) => p.id)));
  for (const id of ids) {
    if (next[id]) continue;
    const rows = seats.map((v) => (v.points ?? []).find((p) => p.id === id)).filter((p) => p && p.judged !== false);
    if (!rows.length || !rows.every((p) => p.score >= PASS_AT)) continue;
    const q = rows.map((p) => String(p.evidence ?? "").trim()).find((e) => e.length >= MINQ && holds(text, e.slice(0, QMAX)));
    if (q) next[id] = { q: q.slice(0, QMAX), r: round };
  }
  return Object.keys(next).length ? next : null;
}
