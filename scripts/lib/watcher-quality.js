// WATCHER QUALITY · the ledger (WATCHERS-AAA W14, lane L6). Pure: no ctx, no clock, no randomness; io = { read, exists, list }, now passed in.
// QUALITY.md: one row per closed round (sole writer watcher-clerk.js via this file); world.state.watchQuality = qualitySummary(parseQuality(text)).
// CHECKLIST.md: post-build bugs the HARDENED pre-mortem reads. CALIBRATION.md: planted-bug plans and whether the seats caught them.
// Nothing here runs unless the clerk calls it. Lane L6 retired the aaa gate; the legacy column stays: it marks the backfilled old-gate rows.
import { WATCH, pointsFor } from "./data/watcher.js";

export const QUALITY_HEAD = "# WATCHER QUALITY · one row per closed round (W14). Writer: watcher-clerk.js via watcher-quality.js.";
export const QUALITY_COLS = ["name", "round", "state", "score/of", "fours", "notes", "cross", "breaker", "bugs", "ff", "legacy", "at"];
export const CHECKLIST_HEAD = "# WATCHER CHECKLIST · post-build bugs the pre-mortem (HARDENED) reads (W14). One line each: - [<plan>] <bug>. Writer: watcher-clerk.js via watcher-quality.js; newest last, capped at 60.";
export const CHECKLIST_CAP = 60;
export const CALIBRATION_HEAD = "# WATCHER CALIBRATION · planted-bug plans (W14). Writer: watcher-clerk.js via watcher-quality.js.";
export const CALIBRATION_COLS = ["plan", "caught", "at"];
export const CALIBRATION_DIR = "docs/board/watcher/calibration/";
const CLOSED = ["WATCHED", "CONTESTED"]; // a plan's last word; RETURNED is a round, not a close

const cell = (v) => String(v ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const tableHead = (cols) => `| ${cols.join(" | ")} |\n|${cols.map(() => "---").join("|")}|`;
const countOf = (v) => (Array.isArray(v) ? v.length : v == null || v === "" ? "" : v);
const num = (v) => { const n = Number(v); return v === "" || v == null || !Number.isFinite(n) ? null : n; };
const idOf = (f) => String(typeof f === "object" && f ? f.id ?? "" : f ?? "").split(":")[0].trim().toUpperCase();
const round2 = (x) => Math.round(x * 100) / 100;

// ---- QUALITY.md
// row: the clerk's closed watch row ({ round, state, score, of?, fours?, notes?, fails, cross?, breaker? }); extra overrides any of them
// plus { art, bugs, falseFail, legacy }. score = points at passAt+ (aaa) or the old pass count; of = N (pointsFor at call time).
export function qualityLine(name, row = {}, now = "", extra = {}) {
  const r = { ...row, ...extra };
  const of = r.of ?? pointsFor({ art: !!r.art }).length;
  const score = r.score ?? (r.state === "WATCHED" ? of : "");
  const vals = [name, r.round ?? "", r.state ?? "", `${score}/${of}`, countOf(r.fours), countOf(r.notes), countOf(r.cross), r.breaker ?? "",
    countOf(r.bugs), r.falseFail === true ? "1" : r.falseFail === false ? "0" : "", r.legacy ? "1" : "", now === "" || now == null ? "" : Math.round(Number(now))];
  return `| ${vals.map(cell).join(" | ")} |`;
}
export function appendQuality(text, line) {
  let t = String(text ?? "");
  if (!t.trim()) t = `${QUALITY_HEAD}\n\n${tableHead(QUALITY_COLS)}\n`;
  else if (!/^\|\s*name\s*\|/m.test(t)) t = t.replace(/\n*$/, "\n\n") + tableHead(QUALITY_COLS) + "\n";
  return t.replace(/\n*$/, "\n") + line + "\n";
}
function tableRows(text, first) {
  const out = []; let cols = null;
  for (const raw of String(text ?? "").split("\n")) {
    const l = raw.trim(); if (!l.startsWith("|")) { continue; }
    const cells = l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (cells[0].toLowerCase() === first) { cols = cells.map((c) => c.toLowerCase()); continue; }
    if (!cols || cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const o = {}; cols.forEach((c, i) => { o[c] = cells[i] ?? ""; }); out.push(o);
  }
  return out;
}
export function parseQuality(text) {
  return tableRows(text, "name").map((o) => {
    const [s, f] = String(o["score/of"] ?? "").split("/");
    return { name: o.name, round: num(o.round), state: o.state, score: num(s), of: num(f), fours: num(o.fours), notes: num(o.notes),
      cross: num(o.cross), breaker: o.breaker || null, bugs: num(o.bugs) ?? 0, ff: o.ff === "1" || /^(y|yes|true)$/i.test(o.ff ?? ""), ffKnown: String(o.ff ?? "").trim() !== "",
      legacy: o.legacy === "1" || /^(y|yes|true|legacy)$/i.test(o.legacy ?? ""), at: num(o.at) };
  });
}
const ratio = (rs) => { const v = rs.filter((x) => x.s != null && x.of); return v.length ? round2(v.reduce((a, x) => a + x.s / x.of, 0) / v.length) : null; };
// compact rows for world.state.watchQuality (the O-menu graph); 30 rows stay under 2500 chars of JSON
export function qualitySummary(rows, keep = WATCH.qualityKeep) {
  const all = (rows ?? []).map((q) => ({ n: String(q.name ?? "").slice(0, 22), r: q.round ?? 0, st: String(q.state ?? "?")[0] || "?", s: q.score, of: q.of, f: q.fours ?? 0, b: q.bugs ?? 0, lg: q.legacy ? 1 : 0 }));
  const last = all.slice(-keep);
  const at = rows?.length ? rows[rows.length - 1].at ?? null : null;
  return { rows: last, at, avg10: ratio(all.slice(-10)), prev10: ratio(all.slice(-20, -10)) };
}

// ---- CHECKLIST.md
const normBug = (b) => String(b ?? "").replace(/\s+/g, " ").trim();
export function checklistLines(text) {
  return String(text ?? "").split("\n").filter((l) => /^- \[[^\]]*\]\s/.test(l)).map((l) => l.slice(2).trim());
}
export function addChecklist(text, bugs = [], name = "?") {
  const t = String(text ?? "");
  const head = t.split("\n").filter((l) => !/^- \[[^\]]*\]\s/.test(l)).join("\n").replace(/\n*$/, "") || CHECKLIST_HEAD;
  const lines = checklistLines(t), key = (l) => normBug(l.replace(/^\[[^\]]*\]\s*/, "")).toLowerCase();
  const seen = new Set(lines.map(key));
  for (const b of bugs ?? []) { const n = normBug(b); if (!n) continue; const l = `[${cell(name)}] ${n}`; if (seen.has(key(l))) continue; seen.add(key(l)); lines.push(l); }
  return `${head}\n\n${lines.slice(-CHECKLIST_CAP).map((l) => `- ${l}`).join("\n")}\n`;
}

// ---- learning + calibration
// true when the last WATCH.learnAfterClean non-legacy closed plans carry no false fail (ff)
export function learnReady(rows) {
  // only plans whose closing row MEASURED false fails (ff "0" or "1") count: an empty ff column is no evidence of a clean record
  const all = (rows ?? []).filter((q) => !q.legacy);
  const closed = all.filter((q) => q.ffKnown && CLOSED.includes(String(q.state ?? "").toUpperCase()));
  const lastByPlan = new Map(); for (const q of closed) { lastByPlan.delete(q.name); lastByPlan.set(q.name, q); } // one per plan, newest wins
  const plans = [...lastByPlan.values()].slice(-WATCH.learnAfterClean);
  if (plans.length < WATCH.learnAfterClean) return false;
  return !all.some((q) => q.ff && plans.some((p) => p.name === q.name)); // a false fail in ANY round of those plans (often a RETURNED one)
}
export function calibrationDue(roundCount) {
  return roundCount > 0 && roundCount % WATCH.calibrateEvery === 0;
}
export function plantedOf(text) {
  const l = String(text ?? "").split("\n").find((x) => /^Planted:/.test(x.trim()));
  return l ? l.trim().replace(/^Planted:\s*/, "").split(/;\s+/).map((x) => x.trim()).filter(Boolean) : [];
}
// the plan the seats read: the Planted: line removed (the answer key never reaches a seat)
export function calibrationPlanText(text) {
  return String(text ?? "").split("\n").filter((x) => !/^Planted:/.test(x.trim())).join("\n");
}
export function listCalibration(io) {
  let all = []; try { all = io?.list ? io.list() || [] : []; } catch { all = []; }
  return all.filter((p) => p.startsWith(CALIBRATION_DIR) && /\/CAL-[^/]*\.md$/.test(p)).sort()
    .map((path) => ({ name: path.slice(CALIBRATION_DIR.length).replace(/\.md$/, ""), path, planted: plantedOf(io.read(path)) }))
    .filter((c) => c.planted.length);
}
// combined: the round's combine() answer or its closed row. caught = not watched AND a blocking fail id is a planted point id
export function calibrationCaught(combined, planted) {
  const c = combined ?? {};
  const blocking = c.blocking ?? c.blockers ?? c.fail ?? c.fails ?? [];
  const watched = c.state ? c.state === "WATCHED" : c.watched != null ? !!c.watched : !blocking.length;
  if (watched) return false;
  const want = new Set((planted ?? []).map(idOf).filter(Boolean));
  return blocking.map(idOf).some((id) => want.has(id));
}
export function appendCalibration(text, name, caught, now) {
  let t = String(text ?? "");
  if (!t.trim()) t = `${CALIBRATION_HEAD}\n\n${tableHead(CALIBRATION_COLS)}\n`;
  else if (!/^\|\s*plan\s*\|/m.test(t)) t = t.replace(/\n*$/, "\n\n") + tableHead(CALIBRATION_COLS) + "\n";
  return t.replace(/\n*$/, "\n") + `| ${cell(name)} | ${caught ? "yes" : "no"} | ${now == null || now === "" ? "" : Math.round(Number(now))} |\n`;
}
export function calibrationRate(text) {
  const rows = tableRows(text, "plan"), caught = rows.filter((r) => r.caught === "yes").length;
  return { runs: rows.length, caught, rate: rows.length ? round2(caught / rows.length) : null };
}

// ---- polish: false fails, post-build bugs, bounded ledgers
const disputeIds = (text) => new Set([...String(text ?? "").matchAll(/^\s*[-*]?\s*DISPUTE\s+([A-Z]+)\b/gm)].map((m) => m[1].toUpperCase()));
// a false fail: a point the last round held that this plan DISPUTEs and this round no longer holds (the seats overturned their own fail)
// round 1 = measured clean (false); the ids of prior/fails may be "ID" or "ID: detail"
export function falseFailOf(planText, prior = [], fails = [], round = 1) {
  if (!(round > 1) || !(prior ?? []).length) return false;
  const disputed = disputeIds(planText), still = new Set((fails ?? []).map(idOf));
  return (prior ?? []).map(idOf).some((id) => id && disputed.has(id) && !still.has(id));
}
// the post-build bug count lands on the plan's newest QUALITY row (its bar in the graph); no row = one BUILT row (drawn as no bar)
export function withBugs(text, name, bugs, now = "", opts = {}) {
  const n = Math.max(0, Math.round(Number(bugs) || 0));
  const lines = String(text ?? "").split("\n");
  let cols = null, hit = -1;
  lines.forEach((l, i) => {
    const t = l.trim(); if (!t.startsWith("|")) return;
    const cells = t.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    if (cells[0].toLowerCase() === "name") { cols = cells.map((c) => c.toLowerCase()); return; }
    if (cols && cells[0] === cell(name)) hit = i;
  });
  const bi = cols ? cols.indexOf("bugs") : -1;
  if (hit >= 0 && bi >= 0) {
    const cells = lines[hit].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    cells[bi] = String(n);
    lines[hit] = `| ${cells.join(" | ")} |`;
    return lines.join("\n");
  }
  return appendQuality(text, qualityLine(name, { state: "BUILT", score: "", of: opts.of ?? pointsFor({ art: !!opts.art }).length }, now, { bugs: n }));
}
export const LEDGER_KEEP = 200, LEDGER_SLACK = 50;
export const archivePathOf = (path) => String(path).replace(/\.md$/, "-ARCHIVE.md");
const ARCH_RE = /^<!-- archived rounds: (\d+) -->$/m;
export const archivedRounds = (text) => Number(String(text ?? "").match(ARCH_RE)?.[1] ?? 0);
const isRound = (q) => !q.legacy && String(q.state ?? "").toUpperCase() !== "BUILT";
// every scored round the gate ever closed (archived ones included): the calibration cadence counts this, never the file's length
export function roundCount(text) { return archivedRounds(text) + parseQuality(text).filter(isRound).length; }
// past keep + slack table rows, the oldest move out (down to keep): { text, moved: [row lines] }; QUALITY keeps a count of moved rounds
export function trimLedger(text, first, keep = LEDGER_KEEP, slack = LEDGER_SLACK) {
  const lines = String(text ?? "").split("\n");
  let cols = false; const idx = [];
  lines.forEach((l, i) => {
    const t = l.trim(); if (!t.startsWith("|")) return;
    const c0 = t.replace(/^\|/, "").split("|")[0].trim().toLowerCase();
    if (c0 === first) { cols = true; return; }
    if (cols && !/^\|[\s|:-]+\|$/.test(t)) idx.push(i);
  });
  if (idx.length <= keep + slack) return { text: String(text ?? ""), moved: [] };
  const cut = new Set(idx.slice(0, idx.length - keep)), moved = idx.slice(0, idx.length - keep).map((i) => lines[i]);
  let out = lines.filter((_, i) => !cut.has(i)).join("\n");
  if (first === "name") {
    const n = archivedRounds(out) + parseQuality(`| ${QUALITY_COLS.join(" | ")} |\n${moved.join("\n")}`).filter(isRound).length;
    out = ARCH_RE.test(out) ? out.replace(ARCH_RE, `<!-- archived rounds: ${n} -->`) : out.replace(/^(.*\n)/, `$1<!-- archived rounds: ${n} -->\n`);
  }
  return { text: out, moved };
}
// the archive: header once, moved rows appended
export function archiveLedger(archiveText, head, cols, moved) {
  let t = String(archiveText ?? "");
  if (!t.trim()) t = `${head} (archive: rows moved out of the live ledger)\n\n${tableHead(cols)}\n`;
  return t.replace(/\n*$/, "\n") + moved.join("\n") + "\n";
}
