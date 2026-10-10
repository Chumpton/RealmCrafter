// WATCHER · W4 MERGE & STATUS (docs/board/proposals/WATCHER.md H3 + verdict, V4/V5/V6). Pure: no files, no clock; the caller passes now.
// applyEdits: the hallucination guard. readStatus/setStatus: the proposal's one `Status:` line. nextState: the gate's machine.
// watchedDoc: proposals/<NAME>.watched.md (one write per round, V5). logLine: one LOG.md line per verdict.
// WATCHERS-AAA L4 (docs/board/proposals/WATCHERS-AAA.md W6/W10/W11): pointsFor() is read at CALL time.
// Lane L6: AAA is the only path; the legacy (aaa false) branches are gone.
import { WATCH, pointsFor } from "./data/watcher.js";
import { normText, unwrap, elidedParts } from "./watcher-core.js";
const evn = (s) => unwrap(normText(norm(s))); // evidence matching also drops markdown (Claude #81); replace-text matching stays exact

const QUOTES = [[/[\u2018\u2019\u201A\u201B\u2032`]/g, "'"], [/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"'], [/[\u2013\u2014]/g, "-"], [/\u00A0/g, " "]];
export function norm(s) {
  let t = String(s ?? "");
  for (const [re, to] of QUOTES) t = t.replace(re, to);
  return t.replace(/\s+/g, " ").trim();
}
function count(hay, needle) { let n = 0, i = hay.indexOf(needle); while (i !== -1) { n++; i = hay.indexOf(needle, i + 1); } return n; }

// The creator's verbatim ask: the line starting "Creator ask" (markdown bullets/bold allowed before it), any unclosed "…" it opens,
// and the quoted block (> lines, after at most one blank line) that follows. Returns [start, end) char ranges.
const ASK_RE = /^[\s>*_\-]*Creator ask/i;
export function askRanges(text) {
  const lines = String(text).split("\n"), out = [];
  let off = 0; const starts = lines.map((l) => { const s = off; off += l.length + 1; return s; });
  for (let i = 0; i < lines.length; i++) {
    if (!ASK_RE.test(lines[i])) continue;
    let j = i, open = count(norm(lines[i]), '"') % 2 === 1;
    while (j + 1 < lines.length) {
      const nx = lines[j + 1];
      if (open) { j++; if (count(norm(nx), '"') % 2 === 1) open = false; continue; }
      if (/^\s*>/.test(nx)) { j++; continue; }
      if (/^\s*$/.test(nx) && j + 2 < lines.length && /^\s*>/.test(lines[j + 2])) { j += 2; continue; }
      break;
    }
    out.push([starts[i], starts[j] + lines[j].length]);
    i = j;
  }
  { // W1 TEMPLATE: the ask is a "## Ask (creator, verbatim)" section; its body up to the next heading is the creator's words
    for (let i = 0; i < lines.length; i++) {
      if (!ASK_HEAD_RE.test(lines[i])) continue;
      let j = i;
      while (j + 1 < lines.length && !/^#{1,6}\s/.test(lines[j + 1])) j++;
      while (j > i && /^\s*$/.test(lines[j])) j--;
      if (j > i) out.push([starts[i + 1], starts[j] + lines[j].length]);
      i = j;
    }
    out.sort((a, b) => a[0] - b[0]);
  }
  return out;
}
const ASK_HEAD_RE = /^#{1,6}\s+(?:Creator'?s? )?Ask\b[^\n]*\bverbatim\b/i;
const ADDED_HEAD = "## Added (not in the ask)";
// W10: "- <section>: <why> (watchers, cost <cost>)" at the end of the Added section (the heading made at the end when missing)
function addLine(text, line) {
  const lines = String(text).split("\n");
  const h = lines.findIndex((l) => /^##\s+Added \(not in the ask\)/i.test(l));
  if (h === -1) {
    while (lines.length && /^\s*$/.test(lines[lines.length - 1])) lines.pop();
    return [...lines, "", ADDED_HEAD, line, ""].join("\n");
  }
  let e = h;
  while (e + 1 < lines.length && !/^#{1,6}\s/.test(lines[e + 1])) e++;
  while (e > h && /^\s*$/.test(lines[e])) e--;
  lines.splice(e + 1, 0, line);
  return lines.join("\n");
}

// edits: [{ section, replace, with, why, evidence, by? }], applied in order to the running copy.
export function applyEdits(planText, edits, feedText) {
  let text = String(planText ?? "");
  const feed = evn(feedText), applied = [], rejected = []; // AAA only (lane L6): no edit count limit here or in the schema
  for (const edit of edits || []) {
    const rej = (reason) => rejected.push({ edit, reason });
    const rep = typeof edit?.replace === "string" ? edit.replace : "";
    const withT = typeof edit?.with === "string" ? edit.with : null;
    if (!rep.trim()) { rej("empty replace"); continue; }
    if (withT === null) { rej("no with text"); continue; }
    if (!(typeof edit?.cost === "string" && edit.cost.trim())) { rej("no cost named"); continue; } // W10: every edit names its cost
    const n = count(text, rep);
    if (n === 0) { rej("replace text not found verbatim in the plan"); continue; }
    if (n > 1) { rej(`replace text occurs ${n} times in the plan (must be exactly once)`); continue; }
    const ev = evn(edit.evidence);
    if (!ev) { rej("no evidence quote"); continue; }
    if (ev.split(/[^\p{L}\p{N}_]+/u).filter(Boolean).length < 4) { rej("evidence quote too short to prove anything (< 4 words)"); continue; } // Claude #81: words, not chars
    if (elidedParts(ev).some((x) => !feed.includes(x))) { rej("evidence quote not found verbatim in the fed text"); continue; } // S7: each "..." part
    const at = text.indexOf(rep), end = at + rep.length;
    if (askRanges(text).some(([a, b]) => at < b && end > a)) { rej("scope guard: the creator's words"); continue; }
    if (withT.split("\n").some((l) => ASK_RE.test(l) || ASK_HEAD_RE.test(l))) { rej("with text writes a Creator ask line"); continue; }
    text = text.slice(0, at) + withT + text.slice(end);
    if (edit.added === true) text = addLine(text, `- ${norm(edit.section) || "plan"}: ${norm(edit.why) || "no reason given"} (watchers, cost ${norm(edit.cost)})`);
    applied.push({ ...edit, before: rep, after: withT });
  }
  return { text, applied, rejected };
}

const statusRe = () => new RegExp(WATCH.statusRe);
export function readStatus(planText) {
  const lines = String(planText ?? "").split("\n").slice(0, 12);
  for (const l of lines) {
    const m = l.match(statusRe());
    if (m) return { state: m[1], score: m[2] != null ? Number(m[2]) : null, to: m[3] ?? null };
  }
  return null;
}
export function statusLine(state, score, to, of = 5) {
  return `Status: ${state}${score != null && score !== "" ? ` ${score}/${of ?? 5}` : ""}${to ? ` → ${to}` : ""}`;
}
export function setStatus(planText, state, score, to, of = 5) {
  if (!WATCH.states.includes(state)) throw new Error(`unknown watch state ${state}`);
  const lines = String(planText ?? "").split("\n"), line = statusLine(state, score, to, of), re = statusRe();
  for (let i = 0; i < Math.min(12, lines.length); i++) if (re.test(lines[i])) { lines[i] = line; return lines.join("\n"); }
  const h1 = lines.findIndex((l, i) => i < 12 && /^#\s/.test(l));
  lines.splice(h1 === -1 ? 0 : h1 + 1, 0, line);
  return lines.join("\n");
}

// ---- WATCHERS-AAA W6 scoring (WATCH.scores) ----------------------------------------------------------------------
export const SEAT_ORDER = ["mimir", "vor", "saga", "heimdall", "heimdall2"]; // HEIMDALL: his two sittings score like seats (lowest wins)
// the seats that spoke: mimir / vor / saga present; a fast-lane round with only `solo` is its one seat
export function seatsOf(verdicts) {
  const s = SEAT_ORDER.filter((w) => verdicts && verdicts[w] != null);
  return s.length ? s : verdicts?.solo != null ? ["solo"] : [];
}
const artOf = (verdicts, opts) => (opts?.art != null ? !!opts.art : verdicts?.saga != null);
const notJudged = (x) => x?.judged === false || /^not judged/i.test(String(x?.evidence ?? "")) || /^not judged/i.test(String(x?.why ?? ""));
// one seat's row for one point after the plain rules: { score 0-4, severity, capped, judged }
export function seatScore(x, id) {
  const S = WATCH.scores;
  if (!x) return { score: 0, severity: "blocker", capped: false, judged: true, missing: true };
  if (notJudged(x)) return { score: null, severity: null, capped: false, judged: false };
  let score = Number.isInteger(x.score) && x.score >= 0 && x.score <= 4 ? x.score : x.pass === true ? S.passAt : 0;
  let severity = x.severity === "note" ? "note" : "blocker", capped = false;
  // an unfound quote cannot carry a 3+ (FEEL takes a reason); the clerk's check marks it ok:false (or pass:false with a 3+ score)
  if (score >= S.passAt && id !== "FEEL" && (x.ok === false || x.pass === false || !norm(x.evidence))) { score = Math.min(score, S.unquotedCap); severity = "blocker"; capped = true; }
  if (score >= S.passAt) severity = null;
  return { score, severity, capped, judged: true };
}
function scoreAaa(verdicts, opts) {
  const S = WATCH.scores, pts = pointsFor({ art: artOf(verdicts, opts) }), seats = seatsOf(verdicts);
  const one = (v, id) => (v?.points || []).find((x) => x?.id === id);
  const points = pts.map((p) => {
    const by = {};
    for (const w of seats) by[w] = seatScore(one(verdicts[w], p.id), p.id);
    const judged = seats.filter((w) => by[w].judged);
    const score = judged.length ? Math.min(...judged.map((w) => by[w].score)) : S.passAt; // unjudged by all (art-only) = counts as 3, never a 4
    const low = judged.filter((w) => by[w].score < S.passAt);
    const blocking = score < S.passAt && (!low.length || low.some((w) => by[w].severity === "blocker"));
    const row = { id: p.id, score, pass: score >= S.passAt, blocking, note: score < S.passAt && !blocking };
    for (const w of seats) row[w] = by[w].judged ? by[w].score : null;
    return row;
  });
  const fails = points.filter((p) => p.blocking).map((p) => p.id), notes = points.filter((p) => p.note).map((p) => p.id);
  const fours = points.filter((p) => p.score === 4).length;
  const pointScores = Object.fromEntries(points.map((p) => [p.id, p.score]));
  return { score: points.filter((p) => p.pass).length, of: pts.length, fails, notes, fours, pointScores, watched: !fails.length && fours >= S.needFours, points, seats };
}
// Both reviewers must pass a point with a non-empty evidence quote (plain check around the verdict).
// aaa: the W6 rules (lowest seat per point, blockers hold, notes fold in, WATCHED needs needFours 4s); opts.art = SAGA's FEEL set.
export function scoreVerdicts(verdicts, opts = {}) {
  return scoreAaa(verdicts, opts);
}

const LIVE = ["SUBMITTED", "PREFLIGHT", "REVIEW"];
// row = board-bell.state.watch[name] | null. event: { type: "submit" } (writer's SUBMITTED seen: first, or a resubmit after RETURNED → round+1)
// | { type: "start" } SUBMITTED→PREFLIGHT | { type: "preflight", pass, fails } | { type: "review", verdicts } or { score, fails }
// | { type: "tick" } (wall-cap check only). Returns the SAME row object when nothing changes (V5: write state.watch on changes only).
export function nextState(row, event, now) {
  const t = event?.type, cur = row?.state;
  const put = (patch) => ({ ...row, ...patch, at: now });
  if (t === "submit") {
    if (!row || !cur) return { round: 1, state: "SUBMITTED", at: now, submittedAt: now, verdicts: {}, fails: [], hash: event.hash ?? null };
    // pre-flight bounces (0 seats, 0 jobs) keep the round: only a seated review spends one of maxRounds (Savi, 2026-09-30, HUGINN-SWEEP)
    if ((cur === "RETURNED" || cur === "CONTESTED") && row.preOnly) return put({ state: "SUBMITTED", pre: (row.pre || 0) + 1, preOnly: false, submittedAt: now, dispatchedAt: null, budgetWait: false, verdicts: {}, fails: [], hash: event.hash ?? row.hash ?? null });
    if (cur === "RETURNED") return put({ round: (row.round || 1) + 1, state: "SUBMITTED", submittedAt: now, dispatchedAt: null, budgetWait: false, verdicts: {}, fails: [], hash: event.hash ?? row.hash ?? null });
    return row;
  }
  if (!row || !LIVE.includes(cur)) return row;
  // V4: the gate never holds a plan more than maxWallMs past its DISPATCH (or its SUBMITTED if never queued), nor maxQueueMs while it
  // waits on the job budget (Claude #89).
  const queued = row.budgetWait && row.dispatchedAt == null;
  const start = row.dispatchedAt ?? row.submittedAt ?? now;
  if (now - start > (queued ? (WATCH.maxQueueMs ?? WATCH.maxWallMs) : WATCH.maxWallMs)) return put({ state: "CONTESTED", fails: event?.fails || row.fails || [], why: queued ? "queue" : "wall" });
  const last = (row.round || 1) >= WATCH.maxRounds;
  if (t === "start" && cur === "SUBMITTED") return put({ state: "PREFLIGHT" });
  if (t === "preflight" && cur === "PREFLIGHT") {
    if (event.pass) return put({ state: "REVIEW", fails: [] });
    const lastPre = (row.pre || 0) + 1 >= (WATCH.maxPreflights ?? 6); // endless pre-flight bounces still end
    return put({ state: lastPre ? "CONTESTED" : "RETURNED", preOnly: true, fails: event.fails || [] }); // a pre-flight fail spends no review round
  }
  if (t === "review" && cur === "REVIEW") {
    const art = event.art ?? (event.verdicts ? undefined : row.art);
    const s = event.verdicts ? scoreVerdicts(event.verdicts, { art }) : (() => {
      const of = event.of ?? pointsFor({ art: !!art }).length, fails = event.fails || [];
      return { score: event.score ?? 0, of, fails, notes: event.notes || [], watched: event.watched ?? (!fails.length && (event.score ?? 0) === of && (event.fours ?? 1) >= WATCH.scores.needFours) };
    })();
    const verdicts = event.verdicts ?? row.verdicts ?? {};
    if (s.watched) return put({ state: "WATCHED", score: s.score, of: s.of, verdicts, fails: [], notes: s.notes });
    return put({ state: last ? "CONTESTED" : "RETURNED", score: s.score, of: s.of, verdicts, fails: s.fails, notes: s.notes });
  }
  return row;
}

const cell = (s) => norm(s).replace(/\|/g, "\\|") || "—";
const fence = (s) => { const m = String(s).match(/`{3,}/g); return "`".repeat(Math.max(3, ...(m || []).map((x) => x.length + 1))); };
function diffBlock(a, i) {
  const body = [...String(a.before).split("\n").map((l) => "- " + l), ...String(a.after).split("\n").map((l) => "+ " + l)].join("\n");
  const f = fence(body);
  return `**E${i + 1}**${a.by ? ` (${WATCH.reviewers[a.by]?.name || a.by})` : ""} · ${cell(a.section)} · ${cell(a.why)}\nevidence: "${cell(a.evidence)}"\n${f}diff\n${body}\n${f}`;
}

// W8/W9/W11: one table per seat that spoke, walk + breaker lines, the cross-exam, and the CONTESTED "what would make me pass"
export function breakerOf(seats, round) {
  const sit = WATCH.breakerOrder.filter((w) => seats.includes(w));
  return sit.length ? sit[((round || 1) - 1) % sit.length] : null;
}
function tableAaa(who, v, pts) {
  const r = WATCH.reviewers[who] || { name: who, title: "" };
  const rows = pts.map((p) => {
    const x = (v?.points || []).find((q) => q?.id === p.id), s = seatScore(x, p.id);
    const sc = !x ? "— (no answer)" : !s.judged ? "not judged" : `${s.score}${s.capped ? " (capped: quote not found)" : ""}`;
    return `| ${p.id} | ${sc} | ${s.severity || "—"} | ${x ? cell(x.evidence) : "—"} | ${x ? cell(x.why) : "—"} |`;
  });
  return [`### ${r.name} · ${r.title}`, "", "| point | score | severity | evidence | why |", "|---|---|---|---|---|", ...rows].join("\n");
}
function watchedDocAaa(name, original, merged, verdicts, applied, rejected, round, opts) {
  const s = scoreVerdicts(verdicts, { art: opts.art }), pts = pointsFor({ art: artOf(verdicts, opts) });
  const state = s.watched ? "WATCHED" : (round || 1) >= WATCH.maxRounds ? "CONTESTED" : "RETURNED";
  const to = readStatus(original)?.to ?? null, seats = s.seats;
  const brk = opts.breaker ?? breakerOf(seats, round);
  const seatBlocks = [];
  for (const who of seats) {
    const v = verdicts[who];
    seatBlocks.push(tableAaa(who, v, pts), "", `walk: ${cell(v?.walk)}`);
    if (who === brk) seatBlocks.push(`breaker: ${cell(v?.breaker)}`);
    seatBlocks.push("");
  }
  const cross = Array.isArray(opts.cross) ? opts.cross.filter(Boolean) : [];
  const crossBlock = cross.length ? ["## Cross-exam", "", "| seat | point | held/flipped | old->new | why |", "|---|---|---|---|---|",
    ...cross.map((c) => { const who = c.seat ?? c.who; const nw = c.score ?? c.new; return `| ${WATCH.reviewers[who]?.name || cell(who)} | ${cell(c.id ?? c.point)} | ${c.hold === false || (c.hold == null && nw !== c.old) ? "flipped" : "held"} | ${c.old ?? "—"}->${nw ?? "—"} | ${cell(c.why)} |`; }), ""] : [];
  const passBlock = state === "CONTESTED" ? ["## What would make each seat pass", ...seats.map((w) => `- ${WATCH.reviewers[w]?.name || w}: ${cell(verdicts[w]?.toPass || (s.fails.length ? `open: ${s.fails.join(", ")}` : ""))}`), ""] : [];
  const out = [
    `# ${name} · watched (round ${round || 1} of ${WATCH.maxRounds})`,
    statusLine(state, s.score, to, s.of),
    `> Heimdall's gate. The original plan (docs/board/proposals/${name}.md) is never overwritten; this copy carries the verdicts and the applied edits.`,
    `> ${WATCH.honestLimit}`,
    "",
    `## Verdict: ${state} ${s.score}/${s.of}${s.fails.length ? ` · open: ${s.fails.join(", ")}` : ""}${s.notes.length ? ` · notes: ${s.notes.join(", ")}` : ""}`,
    "A point passes when every seat scores it 3+ (lowest seat counts); blockers hold, notes fold into the build; " + ((WATCH.scores?.needFours ?? 1) > 0 ? `WATCHED needs at least ${WATCH.scores?.needFours ?? 1} four(s).` : "WATCHED needs every point at 3+ and no blocker; a 4 is a badge."),
    `Scores: ${pts.map((p) => `${p.id} ${s.pointScores[p.id]}`).join(" · ")} · fours ${s.fours}${brk ? ` · breaker ${WATCH.reviewers[brk]?.name || brk}` : ""}`,
    "",
    ...seatBlocks,
    ...crossBlock,
    ...passBlock,
    `## Applied edits (${applied?.length || 0})`,
    ...(applied?.length ? applied.map(diffBlock) : ["none"]), "",
    `## REJECTED EDITS (${rejected?.length || 0})`,
    ...(rejected?.length ? rejected.map((r, i) => `- R${i + 1}${r.edit?.by ? ` (${WATCH.reviewers[r.edit.by]?.name || r.edit.by})` : ""}: ${r.reason} · replace "${cell(r.edit?.replace).slice(0, 160)}" · evidence "${cell(r.edit?.evidence).slice(0, 160)}"`) : ["none"]), "",
    "## Shadow check (V6): mark each applied edit",
    ...(applied?.length ? applied.map((a, i) => `- [ ] KEEP · [ ] UNDO · E${i + 1} ${cell(a.section)}: ${cell(a.why).slice(0, 140)}${a.cost != null ? ` · cost ${cell(a.cost)}` : ""}${a.added === true ? " · ADDED (not in the ask)" : ""}`) : ["nothing applied"]), "",
    "## Merged plan", "",
    String(merged ?? ""),
  ];
  return out.join("\n") + "\n";
}
// W10: proposals/<NAME>.v2.md, the merged rewrite round 2 reviews (written by the clerk after a RETURNED round)
export function v2Doc(name, mergedPlan, applied, round) {
  const secs = [...new Set((applied || []).filter((a) => a?.added === true).map((a) => norm(a.section) || "plan"))];
  const text = String(mergedPlan ?? "");
  const body = setStatus(text, "SUBMITTED", null, readStatus(text)?.to ?? null);
  return `Watchers added: ${secs.length ? secs.join(", ") : "nothing past the ask"}\n\n${body}`;
}

export function watchedDoc(name, original, merged, verdicts, applied, rejected, round, opts = {}) {
  return watchedDocAaa(name, original, merged, verdicts, applied, rejected, round, opts || {});
}

// One LOG.md line per verdict (V5). now (ms, from ctx.now()) optional.
export function logLine(name, round, state, fedChars, jobs, now, extra = {}) {
  const when = Number.isFinite(now) ? new Date(now).toISOString().slice(0, 16).replace("T", " ") + " UTC · " : "";
  const tail = `${extra?.breaker ? ` · breaker ${extra.breaker}` : ""}${extra?.cross != null ? ` · cross ${extra.cross}` : ""}`;
  return `- ${when}${name} · round ${round ?? 1} · ${state} · fed ${fedChars ?? 0} chars · ${jobs ?? 0} jobs${tail}`;
}

// WATCH-ARCHIVE A1 (creator "yes" 2026-09-30): a closed watch row, whole, as one line; parse keeps the LAST line per plan (a re-archive replaces).
export const ARCHIVE_HEAD = "# WATCHER ARCHIVE · closed watch rows, moved here from board-bell.state (never dropped). Line: <NAME> <json>. Written by watcher-clerk.js only.";
export function archiveLine(name, row) { return `${name} ${JSON.stringify(row ?? {})}`; }
export function parseArchive(text) {
  const out = {};
  for (const l of String(text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const m = /^([A-Za-z0-9._-]+) (\{.*\})\s*$/.exec(l); if (!m) continue;
    try { out[m[1]] = JSON.parse(m[2]); } catch { /* a broken line is skipped, never fatal */ }
  }
  return out;
}
// the whole file with these rows put in (one line per plan, sorted), so a re-archive replaces its line
export function archiveText(text, rows) {
  const all = { ...parseArchive(text), ...rows };
  return [ARCHIVE_HEAD, ...Object.keys(all).sort().map((n) => archiveLine(n, all[n]))].join("\n") + "\n";
}
