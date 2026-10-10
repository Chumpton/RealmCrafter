// THE VOTE REFEREE (VOTE-SYSTEM, creator's go 2026-09-28). Pure functions over the board's text: no ctx, no writes,
// so scripts/board-jev.js runs it live and docs/board/referee/dryrun.mjs replays it in node on the same code.
import { sha256 } from "./sha256.js";

const SEAL = /^- ← (Savi|Claude) SEAL J(\d+)(?:\.(\d+))?: ([0-9a-f]{12})\b/;
const VOTE = /^- ← (Savi|Claude) VOTE J(\d+)(?:\.(\d+))?: ([0-2](?:,[0-2]){9}) = (\d+) \| (.*?)(?: \| read ([E0-9, ]+?))? \| salt (\S{4,16}?)(?=\s|$)/;
const IDEA = /^- ← JEV IDEA J(\d+)\b(.*)$/;
const STAT = /^STATUS J(\d+): ([A-Z][A-Z ]*[A-Z])/;

// P4 (JEV-CHURN): the board's J-lines alone, every other line blanked so line numbers (forged-line findings) stay exact.
export const jLines = (text) => String(text ?? "").split("\n").map((l) => (/J\d/.test(l) ? l : "")).join("\n");

export function parseBoard(text) {
  const ideas = new Map(), get = (n) => { if (!ideas.has(n)) ideas.set(n, { id: `J${n}`, n, text: "", seals: [], votes: [], status: [], firstAt: null }); return ideas.get(n); };
  const lines = String(text ?? "").split("\n");
  lines.forEach((l, i) => {
    let m;
    if ((m = IDEA.exec(l))) { const x = get(+m[1]); x.text = x.text || l; x.line = i + 1; }
    else if ((m = SEAL.exec(l))) get(+m[2]).seals.push({ who: m[1], round: +(m[3] ?? 1), hash: m[4], line: i + 1 });
    else if ((m = VOTE.exec(l))) get(+m[2]).votes.push({ who: m[1], round: +(m[3] ?? 1), scores: m[4].split(",").map(Number), total: +m[5], reason: m[6], read: m[7] ? m[7].split(/[ ,]+/).filter(Boolean) : null, salt: m[8], line: i + 1, raw: l });
    else if ((m = STAT.exec(l))) get(+m[1]).status.push({ word: m[2], raw: l, line: i + 1 });
  });
  return { ideas, lines };
}

// a reveal proves its seal when sha256 of the sealed line (with or without the "J<n>[.r]:" prefix) starts with the seal
export function sealOk(idea, v) {
  const s = idea.seals.find((x) => x.who === v.who && x.round === v.round); if (!s) return { ok: false, why: "no seal" };
  const body = `${v.scores.join(",")}|${v.total}|${v.reason}|${v.salt}`, tag = v.round > 1 ? `J${idea.n}.${v.round}:` : `J${idea.n}:`;
  for (const c of [tag + body, body]) if (sha256(c).slice(0, 12) === s.hash) return { ok: true };
  return { ok: false, why: "reveal does not match seal" };
}

// evidence sheet: the items a voter should read before scoring (JEV, mechanical). exists(path) and board text decide MISSING marks.
export function evidenceSheet(idea, text, exists, findings) {
  const items = [], t = idea.text;
  const files = (/files:?\s+([^|·]+)/i.exec(t)?.[1] ?? "").split(/[, ]+/).map((f) => f.trim()).filter((f) => /\.(js|yml|md|mjs|py)$/.test(f));
  for (const f of files) { const p = exists(f); items.push({ kind: "file", ref: p ?? f, missing: !p }); }
  const rel = [...new Set([...(t.match(/\b(TASK \d+|B-?[A-Z]{0,2}\d+(?:-\d+)?|C\d+|J\d+|POSE-[A-Z0-9]+)\b/g) ?? [])])].filter((r) => r !== idea.id).slice(0, 6);
  for (const r of rel) { const st = [...text.matchAll(new RegExp(`^STATUS ${r.replace(" ", " ")}: .*$`, "gm"))].pop()?.[0]; items.push({ kind: "status", ref: r, quote: st ?? null, missing: !st }); }
  const why = /(?:why now|evidence):?\s*"([^"]{8,200})/i.exec(t)?.[1];
  if (why) { const probe = why.replace(/\.\.\.|…/g, "").slice(0, 40); items.push({ kind: "quote", ref: "why-now", quote: why, missing: !text.includes(probe) }); }
  const words = new Set((t.toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? []).filter((w) => !/^(files|owner|relates|risk|size|goal|done|which|there|their|would|should)$/.test(w)));
  const fl = String(findings ?? "").split("\n").filter((l) => /^\s*[-*\d]/.test(l)).map((l) => ({ l, hit: [...words].filter((w) => l.toLowerCase().includes(w)).length })).filter((x) => x.hit >= 3).sort((a, b) => b.hit - a.hit).slice(0, 3);
  for (const f of fl) items.push({ kind: "finding", ref: "FINDINGS.md", quote: f.l.trim().slice(0, 200), missing: false });
  items.push({ kind: "rules", ref: "design.md ## CHEATSHEET · JEV IDEAS (the ten fixed rules)", missing: false });
  return items.map((x, i) => ({ id: `E${i + 1}`, ...x }));
}
export function sheetText(idea, items) {
  return `# Evidence sheet ${idea.id} · built by JEV's referee (board-jev.js). Read these, then list what you read in your vote: "| read E1,E2,… | salt …"\n` +
    `<!-- idea: ${idea.text.replace(/-->/g, "")} -->\n\n` + items.map((x) => `- ${x.id} [${x.kind}] ${x.ref}${x.missing ? " · MISSING (says something about the idea)" : ""}${x.quote ? `\n  > ${x.quote}` : ""}`).join("\n") + "\n";
}

// one voter's verdict on one round. legacy = votes cast before receipts existed (conf not enforced), under the bar given.
export function judgeVote(idea, v, R, { sheetIds, legacy, bar }) {
  const out = { who: v.who, total: v.total, valid: true, why: [] };
  if (v.scores.length !== R.rules) { out.valid = false; out.why.push("not 10 scores"); }
  if (v.scores.reduce((a, b) => a + b, 0) !== v.total) { out.valid = false; out.why.push("total ≠ sum"); }
  const seal = sealOk(idea, v); if (!seal.ok) { out.valid = false; out.why.push(seal.why); }
  const veto0 = R.vetoes.filter((k) => v.scores[k - 1] === 0);
  if (legacy) out.conf = null; else { const read = new Set((v.read ?? []).filter((x) => sheetIds.has(x))); out.conf = sheetIds.size ? Math.round((100 * read.size) / sheetIds.size) : 0; }
  out.agree = out.valid && v.total >= bar && !veto0.length && (legacy || out.conf >= R.conf);
  if (veto0.length) out.why.push(`veto 0 on rule ${veto0.join(",")}`); if (!legacy && out.conf < R.conf) out.why.push(`conf ${out.conf} < ${R.conf}`); if (v.total < bar) out.why.push(`${v.total} < ${bar}`);
  return out;
}

// the idea's outcome: APPROVED · FAILED · SPLIT (re-pitch as J<n>.2) · WAITING (a vote or a seal is missing) · OPEN (nothing yet)
export function judgeIdea(idea, R, { now, sheetIds = new Set(), legacy = false, bar = R.bar, sealedAt = {} }) {
  const rounds = [...new Set([1, ...idea.seals.map((s) => s.round), ...idea.votes.map((v) => v.round)])].sort((a, b) => a - b);
  const round = rounds[rounds.length - 1];
  const vs = R.voters.map((w) => idea.votes.filter((v) => v.who === w && v.round === round).pop()).filter(Boolean);
  const seals = R.voters.filter((w) => idea.seals.some((s) => s.who === w && s.round === round));
  const verdicts = vs.map((v) => judgeVote(idea, v, R, { sheetIds, legacy, bar }));
  const base = { id: idea.id, round, seals: seals.length, verdicts };
  const invalid = verdicts.filter((x) => !x.valid);
  if (verdicts.length < R.voters.length || invalid.length) {
    const t0 = sealedAt[`${idea.id}.${round}`]; const stale = t0 != null && now - t0 > R.waitMs;
    return { ...base, outcome: seals.length || verdicts.length ? "WAITING" : "OPEN", missing: R.voters.filter((w) => !verdicts.some((x) => x.who === w && x.valid)), reopen: stale, invalid: invalid.map((x) => `${x.who}: ${x.why.join("; ")}`) };
  }
  const yes = verdicts.filter((x) => x.agree).length;
  if (yes === R.voters.length) return { ...base, outcome: "APPROVED" };
  if (yes === 0) return { ...base, outcome: "FAILED" };
  if (round <= R.repitch) return { ...base, outcome: "SPLIT", next: `${idea.id}.${round + 1}` };
  return { ...base, outcome: "FAILED", why: "second split on a JEV idea: JEV never breaks ties on its own ideas (ties fall to NO)" };
}

// H1 / Claude's fix 1: a STATUS J<n>: APPROVED|FAILED line counts only if the referee wrote it (its hash is in the log) or it predates the referee (legacy).
export const statusHash = (raw) => sha256(raw.trim()).slice(0, 16);
export function forgedStatus(parsed, refLog, legacy) {
  const out = []; for (const x of parsed.ideas.values()) for (const s of x.status) if (/^(APPROVED|FAILED)$/.test(s.word)) { const h = statusHash(s.raw); if (!refLog.has(h) && !legacy.has(h)) out.push({ id: x.id, line: s.line, raw: s.raw, hash: h }); }
  return out;
}
export function refLine(res) {
  const w = res.verdicts.map((v) => `${v.who} ${v.total}${v.conf != null ? `/c${v.conf}` : ""}${v.agree ? " agree" : " disagree"}`).join(", ");
  if (res.outcome === "APPROVED") return `STATUS ${res.id}: APPROVED (JEV REF r${res.round}: ${w})`;
  if (res.outcome === "FAILED") return `STATUS ${res.id}: FAILED (JEV REF r${res.round}: ${w}${res.why ? `; ${res.why}` : ""})`;
  if (res.outcome === "SPLIT") return `STATUS ${res.id}: SPLIT (JEV REF r${res.round}: ${w}; one re-pitch: seal and vote as ${res.next})`;
  if (res.outcome === "WAITING") return `STATUS ${res.id}: WAITING (JEV REF r${res.round}: missing ${res.missing.join(" + ")}${res.reopen ? "; past 24 h, re-opens when they're back" : ""}${res.invalid?.length ? `; void: ${res.invalid.join(" / ")}` : ""})`;
  return null;
}
