// One HUGINN.md line ⇄ a finding. Shared by scripts/huginn.js (the writer) and scripts/huginn-board.js (the reader).
// H14 · P2 · FLOAT · yard-torch-3 · x2z-1 (110,-48) · gap 0.82 m · pass 7 · SEE look | status: found | fix: … | why: … | verdict: … | rep: R3 | note: …
export const TAILS = ['status', 'fix', 'why', 'verdict', 'rep', 'note'];
export function parseLine(l) {
  const [head, ...tail] = l.split(' | '); const h = head.split(' · ');
  if (h.length < 8 || !/^H\d+$/.test(h[0])) return null;
  const m = /^(\S+) \((-?\d+),(-?\d+)\)$/.exec(h[4]) ?? [];
  const f = { n: +h[0].slice(1), tier: +h[1].slice(1) || 4, kind: h[2], id: h[3], cell: m[1] ?? h[4], x: +(m[2] ?? 0), z: +(m[3] ?? 0), ev: h[5], pass: +(h[6].replace('pass ', '')) || 0, see: h[7].replace('SEE ', '') };
  for (const t of tail) { const i = t.indexOf(': '); if (i > 0 && TAILS.includes(t.slice(0, i))) f[t.slice(0, i)] = t.slice(i + 2); }
  f.status ??= 'found'; f.key = f.kind + ':' + f.id;
  return f;
}

// HUGINN-V3 S5 (watched 2026-10-01): one CLUSTER line per root cause JEV named; member lines keep their own rows.
// C2 · 9 FLOAT · yard-torch · cause: … | fix: … | members: H3 H7 H9
export function clusterLine(c) { return `C${c.c} · ${c.count} ${c.kind} · ${c.prefix} · cause: ${String(c.cause ?? '').replace(/\|/g, '/')} | fix: ${String(c.fix ?? '').replace(/\|/g, '/')} | members: ${(c.hs ?? []).join(' ')}`; }
export function parseCluster(l) {
  const m = /^C(\d+) · (\d+) (\S+) · (\S*) · cause: (.*?) \| fix: (.*?) \| members: (.*)$/.exec(l); if (!m) return null;
  return { c: +m[1], count: +m[2], kind: m[3], prefix: m[4], cause: m[5], fix: m[6], hs: m[7].split(/\s+/).filter(Boolean), key: 'CLUSTER:' + m[3] + '|' + m[4] };
}
