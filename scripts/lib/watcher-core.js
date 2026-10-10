// WATCHER · W3 REVIEWERS (docs/board/proposals/WATCHER.md, V1-V8 binding).
// Pure: no ctx, no clock, no randomness. io = { read(path) -> text|null, exists(path) -> bool, list() -> string[] }.
// buildFeed -> what MÍMIR and VÖR read; reviewerRequest -> llm:generate args (model/system/message/schema only, V1);
// checkVerdict -> plain-code guard on one answer; combine -> both-must-pass verdict.
import { EVIDENCE } from "./data/watcher.js";
import { WATCH, pointsFor, verdictSchema, CROSS_SCHEMA } from "./data/watcher.js";
// WATCHERS-AAA (L2): every aaa path reads pointsFor/verdictSchema at call time; aaa false = today's gate byte for byte (W3 quotes excepted).

const IDS = () => pointsFor().map((p) => p.id); // read now (pointsFor is the one point list)
const EXT = "js|mjs|md|yml|yaml|json|scene|glb|txt";
const FILE_RE = new RegExp(`(?<![\\w./-])((?:[\\w.-]+\\/)*[\\w.-]+\\.(?:${EXT}))(?![\\w])`, "g");
const FILE_ONE = new RegExp(FILE_RE.source);
const KEBAB_RE = /(?<![\w/.-])([a-z][a-z0-9]*(?:-[a-z0-9]+)+)(?![\w/.-])/g;
const TICK_RE = /`([^`\n]{3,60})`/g;
const MIN_WORDS = 4;     // a quote under 4 words proves nothing ("the" matches anything). Claude #81: no char floor, the creator's
                         // own "maximize all 8 wisps" (21 chars) is real evidence
const FEED_ONLY = ["GROUNDED", "SOUND"]; // Claude #74/#81: facts and costs must quote the fed files, never the plan itself;
                                         // CONTRACTED judges the plan's own contract table, so it may quote the plan (GROUNDED checks the files)
// a quote wrapped in its own quote marks (reviewers quote the creator's ask that way) matches without them (Claude #83, DEDUPE round 2)
export const unwrap = (t) => String(t).replace(/^["']+\s*/, "").replace(/\s*["']+$/, "").replace(/(…|\.\.\.)\s*$/, "").trim();
// WATCHER-SPEED S7: a quote joined with "..." or an ellipsis is several real quotes; each part must be found. Parts under 3 words are glue.
export const elidedParts = (ev) => String(ev).split(/\s*(?:…|\.\.\.)\s*/).map((x) => unwrap(normText(x))).filter(Boolean); // a part that starts "- " after an ellipsis is normalized like line one (JEV-MASTER r3)
const wordsIn = (t) => String(t).split(/[^\p{L}\p{N}_]+/u).filter(Boolean).length;
// W3 QUOTES: pieces split on "..." / "…"; a piece of >= quotePieceMin chars (after normText) must be found, shorter pieces are glue.
// Found = the exact normalized run (today's rule) OR the same words in the same order with punctuation/markup ignored at word
// boundaries (a backticked `#eli-ring` quoted as '#eli-ring', a "## Not verified" heading quoted "Not verified:"). A dot or hyphen
// inside a token stays (DENI.everyMs is still not everyMs), and matches only on whole words.
const PIECE_MIN = () => WATCH.quotePieceMin ?? 12;
const loose = (t) => ` ${String(t).toLowerCase().replace(/[^\p{L}\p{N}.\-]+/gu, " ").replace(/(?<![\p{L}\p{N}])[.\-]+|[.\-]+(?![\p{L}\p{N}])/gu, " ").replace(/\s+/g, " ").trim()} `;
const haystack = (t) => { const n = normText(t).toLowerCase(); return { n, l: loose(n) }; };
const found1 = (piece, h) => h.n.includes(piece) || (loose(piece).trim() !== "" && h.l.includes(loose(piece)));
// WATCH-FIX 2026-10-01 (creator: "avoid that happening"): a seat that splices two real runs at a colon/semicolon without "..."
// (SAGA, HUGINN-V3 r3: "HUGINN-V3 stamp: reveal 32 m ...") quoted the file, not the air; every spliced run of >= PIECE_MIN must still be found.
const foundIn = (piece, h) => found1(piece, h) || (() => { const sub = String(piece).split(/\s*[:;]\s+/).filter((x) => x.length >= PIECE_MIN()); return sub.length > 1 && sub.every((x) => found1(x, h)); })();
// null = the quote holds; else the reason code: "short" (under MIN_WORDS), "missing" (a real piece not found), "circular" (FEED_ONLY, no piece in the feed)
function quoteFault(id, evidence, hay, feedHay) {
  const ev = unwrap(normText(String(evidence ?? "").replace(/(…|\.\.\.)\s*$/, ""))).toLowerCase();
  if (wordsIn(ev) < MIN_WORDS) return "short";
  const real = elidedParts(ev).filter((x) => x.length >= PIECE_MIN());
  if (!real.length || real.some((x) => !foundIn(x, hay))) return "missing";
  if (feedHay != null && FEED_ONLY.includes(id) && !real.some((x) => foundIn(x, feedHay))) return "circular";
  return null;
}

export const normText = (t) => String(t ?? "")
  .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"').replace(/[\u2018\u2019\u201A]/g, "'")
  .replace(/(^|\n)[ \t]*(?:>[ \t]*)*(?:[-+]|\d+\.)[ \t]+/g, "$1").replace(/`+|\*\*|\|/g, " ") // Claude #81: markdown is noise for
  .replace(/\s+/g, " ").trim();                                                                  // matching, on BOTH sides

// ---- names the plan cites --------------------------------------------------------------
function resolve(tok, io, all) {
  const t = tok.replace(/^\.?\//, "");
  if (io.exists(t)) return [t];
  const hits = all.filter((p) => p === t || p.endsWith("/" + t));
  return hits.slice(0, 2);
}
function rangesAfter(s, from) { // ":120-140", ":120", " line 120", " lines 69, 241, 344", " lines 120-140"
  const tail = s.slice(from, from + 60), out = [];
  let m = /^:(\d+)(?:\s*[-–]\s*(\d+))?/.exec(tail);
  if (m) { out.push([+m[1], m[2] ? +m[2] : +m[1]]); return out; }
  m = /^[^.\n]{0,20}?\blines?\s+((?:\d+(?:\s*[-–]\s*\d+)?)(?:\s*(?:,|and)\s*\d+(?:\s*[-–]\s*\d+)?)*)/i.exec(tail);
  if (m) for (const r of m[1].split(/\s*(?:,|and)\s*/)) { const [a, b] = r.split(/\s*[-–]\s*/).map(Number); if (a) out.push([a, b || a]); }
  return out;
}
export function namedRefs(planText, io) {
  const all = io.list(), files = new Map(), ids = new Set(), base = new Set();
  const s = String(planText ?? "");
  for (const m of s.matchAll(FILE_RE)) {
    const paths = resolve(m[1], io, all);
    base.add(m[1].split("/").pop());
    for (const p of paths) {
      if (!files.has(p)) files.set(p, []);
      files.get(p).push(...rangesAfter(s, m.index + m[0].length));
    }
  }
  for (const m of s.matchAll(TICK_RE)) if (/^[\w.#:/-]+$/.test(m[1]) && !FILE_ONE.test(m[1])) ids.add(m[1]);
  for (const m of s.matchAll(KEBAB_RE)) if (m[1].length >= 6) ids.add(m[1]);
  return { files, ids: [...ids], bases: [...base] };
}

// ---- the feed (V2 order, caps from WATCH) ----------------------------------------------
export function buildFeed(planText, io, name, opts = {}) {
  return buildFeedAaa(planText, io, name, opts);
}
// the text a verdict's evidence may quote: the plan plus the feed (both were in the reviewer's message)
export const fedText = (planText, feed) => `${planText ?? ""}\n${feed?.text ?? feed ?? ""}`;

// ---- the two seats ---------------------------------------------------------------------
// WATCHER-KIN W2 (Claude K-b): the paths on the plan's "Files this plan changes" line; fast when 1..maxFiles, all under the docs prefix
export function filesLine(planText) {
  const line = String(planText ?? "").replace(/\r\n?/g, "\n").split("\n").find((l) => /^\s*Files this plan changes/i.test(l)) ?? "";
  return [...new Set([...line.matchAll(new RegExp(FILE_RE.source, "g"))].map((m) => m[1]))];
}
export function isFastLane(planText) {
  const f = WATCH.fastLane;
  if (!f?.on) return false;
  const paths = filesLine(planText);
  return paths.length > 0 && paths.length <= f.maxFiles && paths.every((p) => p.startsWith(f.prefix));
}
export function reviewerRequest(who, planText, feed, round = 1, priorFails = [], opts = {}) {
  const seat = WATCH.reviewers[who];
  if (!seat) throw new Error(`watcher-core: unknown reviewer ${who}`);
  return reviewerRequestAaa(who, seat, planText, feed, round, priorFails, opts);
}

// ---- plain-code checks -----------------------------------------------------------------
// Claude #86 (DEDUPE round 3, VÖR "malformed" with keys points/edits): the model sometimes returns `points` as a JSON string or as an
// object keyed by point id. Both carry a real answer; coerce them to the array shape, and name the shape when it still fails.
export function coercePoints(pts) {
  let x = pts;
  if (typeof x === "string") { try { x = JSON.parse(x); } catch { return null; } }
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") return Object.entries(x).map(([id, p]) => (p && typeof p === "object" ? { id, ...p, id: p.id ?? id } : p));
  return null;
}
const FAULT_WHY = { short: `PASS without real evidence (quote under ${MIN_WORDS} words)`, missing: "evidence not found verbatim in the fed text", circular: "circular evidence: quotes the plan, not a fed file" };
export function checkVerdict(v, feedText, opts = {}) {
  return checkVerdictAaa(v, feedText, opts);
}
export function combine(mimirChecked, vorChecked, opts = {}) {
  const judged = opts.artOnly ? WATCH.artOnlyPoints : IDS();
  const get = (c, id) => c?.points?.find((p) => p.id === id);
  const pass = [], fail = [];
  for (const id of judged) (get(mimirChecked, id)?.pass === true && get(vorChecked, id)?.pass === true ? pass : fail).push(id);
  return { pass, fail, score: pass.length, of: judged.length };
}

// =========================================================================================
// WATCHERS-AAA (docs/board/proposals/WATCHERS-AAA.md, lane L2). The only path since lane L6 (D4b): buildFeed, reviewerRequest
// and checkVerdict above hand straight to these. Every point list and schema here is pointsFor/verdictSchema called NOW.
// =========================================================================================
const PASS_AT = () => WATCH.scores?.passAt ?? 3;
const CAP = () => WATCH.scores?.unquotedCap ?? 2;
const idsFor = (art) => pointsFor({ art: !!art }).map((p) => p.id);
const clampScore = (x) => Math.max(0, Math.min(4, Math.round(x)));

// W7: SAGA sits when a path on the "Files this plan changes" / "New files" lines matches a WATCH.art.triggers regex
const PATH_TOKEN = /[\w.\/-]+/g;
export function isArtPlan(planText) {
  const trig = (WATCH.art?.triggers ?? []).map((r) => new RegExp(r));
  const lines = String(planText ?? "").replace(/\r\n?/g, "\n").split("\n").filter((l) => /^\s*(?:[-*>]\s*)?(?:\*\*)?(?:Files this plan changes|New files)/i.test(l));
  for (const l of lines) for (const m of l.replace(/^[^:]*:/, " ").matchAll(PATH_TOKEN)) {
    const p = m[0].replace(/^\.?\//, "").replace(/[.,;:]+$/, "");
    if (p.length > 2 && trig.some((r) => r.test(p))) return true;
  }
  return false;
}

// W5: the seat's "## <NAME>" block from WATCH.personasFile ("" when the file or block is missing)
export function personaFor(who, io) {
  const name = WATCH.reviewers?.[who]?.name, file = WATCH.personasFile;
  if (!name || !file) return "";
  const t = io?.read?.(file);
  if (t == null) return "";
  const lines = String(t).replace(/\r\n?/g, "\n").split("\n");
  const at = lines.findIndex((l) => l.trim() === `## ${name}`);
  if (at < 0) return "";
  let end = lines.length;
  for (let i = at + 1; i < lines.length; i++) if (/^#{1,2}\s/.test(lines[i])) { end = i; break; }
  return lines.slice(at, end).join("\n").trim();
}

// ---- W12: feed by function -------------------------------------------------------------------
const IDENT = "[A-Za-z_$][\\w$]{2,}";
// the function names the plan cites: name(  ·  `name`  ·  function name
export function namedFunctions(planText) {
  const s = String(planText ?? ""), out = new Set();
  for (const m of s.matchAll(new RegExp(`(?<![\\w$.])(${IDENT})\\(`, "g"))) out.add(m[1]);
  for (const m of s.matchAll(new RegExp("`(" + IDENT + ")(?:\\(\\))?`", "g"))) out.add(m[1]);
  for (const m of s.matchAll(new RegExp(`\\bfunction\\s+(${IDENT})`, "g"))) out.add(m[1]);
  return [...out];
}
// [from, to] 1-based line spans of the named functions this file defines (to its closing brace at column 0, or 80 lines)
function functionSpans(text, names) {
  const lines = String(text).split("\n"), spans = [];
  for (const n of names) {
    const re = new RegExp(`^(?:export\\s+)?(?:(?:async\\s+)?function\\s*\\*?\\s*${n.replace(/\$/g, "\\$")}\\b|(?:const|let|var)\\s+${n.replace(/\$/g, "\\$")}\\s*=)`);
    const at = lines.findIndex((l) => re.test(l));
    if (at < 0) continue;
    let end = Math.min(lines.length, at + 80);
    if (!/[;)}\]]\s*(?:\/\/.*)?$/.test(lines[at]) || /[{([]\s*(?:\/\/.*)?$/.test(lines[at])) { // one-liners end where they start
      for (let i = at + 1; i < Math.min(lines.length, at + 80); i++) if (/^[}\])]/.test(lines[i])) { end = i + 1; break; }
    } else end = at + 1;
    spans.push([at + 1, end, n]);
  }
  return spans.slice(0, 8);
}
// HEIMDALL-J2: the lines of a named file that hold a quote the plan makes of it (4+ words), each with 1 line either side; <= 8 spans
const _low = new Map(); let _pq = null, _pqText = null; // one plan's quotes, normalised once (buildFeed calls this per named file)
function planQuotes(planText) { // exactly watcher-dryrun factQuotes (same heads, skips, quote forms, 4-word floor), then normalised
  if (_pqText === planText) return _pq; // callers only read it: no copy
  const qs = new Set(); let head = "";
  for (const line of String(planText ?? "").split("\n")) {
    const h = line.match(/^#{2,3}\s+(.*)/); if (h) { head = h[1]; continue; }
    if (!/stands|why|budget|fix|measure|evidence/i.test(head) || /creator|verbatim|DISPUTE|ask\b/i.test(line)) continue;
    for (const m of line.matchAll(/`([^`\n]+)`|"([^"\n]+)"/g)) {
      const raw = (m[1] ?? m[2]).replace(/^line \d+\s*/i, "").trim();
      if (String(raw).split(/[^\p{L}\p{N}_]+/u).filter(Boolean).length < 4) continue;
      const q = normText(raw).trim().toLowerCase(); if (q) qs.add(q); // uncapped like factQuotes (was 32: a long plan lost quotes the dryrun checked); quoteSpans still caps at 8 spans
    }
  }
  _pq = qs; _pqText = planText; return qs;
}
export const planQuotesOf = (planText) => [...planQuotes(planText)]; // for the J2 test: must equal factQuotes normalised
export function quoteSpans(text, planText) {
  const qs = planQuotes(planText);
  if (!qs.size) return [];
  const out = [];
  let low = _low.get(text); if (low === undefined) { low = text.toLowerCase(); if (_low.size >= 24) _low.clear(); _low.set(text, low); } // a file is lowered once across plans
  let starts = null; // line starts, built only when a quote's words are all in this file
  const startsOf = () => { if (!starts) { starts = [0]; for (let k = low.indexOf("\n"); k >= 0; k = low.indexOf("\n", k + 1)) starts.push(k + 1); } return starts; };
  const lineOf = (pos) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= pos) lo = m; else hi = m - 1; } return lo; };
  for (const q of qs) {
    if (out.length >= 8) break;
    const words = q.split(/[^a-z0-9_]+/).filter((w) => w.length >= 3).sort((x, y) => y.length - x.length);
    if (!words.length || !words.every((w) => low.includes(w))) continue; // a quote of another file: one pass, no line work
    const key = words[0]; startsOf();
    for (let pos = low.indexOf(key), n = 0; pos >= 0 && n < 200; pos = low.indexOf(key, pos + key.length), n++) {
      const i = lineOf(pos), end = (starts[i + 1] ?? low.length + 1) - 1, raw = low.slice(starts[i], end);
      if (!words.every((w) => raw.includes(w))) continue; // every word on this line before the full normalise
      if (normText(text.slice(starts[i], end)).toLowerCase().includes(q)) { out.push([Math.max(1, i), Math.min(starts.length, i + 2), "quoted"]); break; }
    }
  }
  return out;
}
// the must-feed body of one named file (its ranges + functions) and the fuller body it would like
function namedBody(text, ranges, fnSpans, pad = 20) {
  const lines = text.split("\n"), seen = new Set();
  let must = "";
  const spans = [
    ...ranges.map(([a, b]) => (a === b ? [Math.max(1, a - pad), a + pad, null] : [Math.min(a, b), Math.max(a, b), null])),
    ...fnSpans,
  ];
  for (const [a, b, n] of spans) {
    const lo = Math.max(1, a), hi = Math.min(lines.length, b);
    if (lo > hi) continue;
    const key = lo + "-" + hi; if (seen.has(key)) continue; seen.add(key);
    must += `-- lines ${lo}-${hi}${n ? ` (${n})` : ""} --\n${lines.slice(lo - 1, hi).join("\n")}\n`;
  }
  const full = must ? `${must}-- head --\n${text.slice(0, WATCH.rangedHeadChars ?? 1500)}` : `-- head --\n${text}`;
  return { must, full };
}

// W5 + W12 + W14: aaa feed. Order: art feed (opts.art), CHECKLIST lines, ANCHOR heads, then today's order (named files,
// ref excerpt, PROTECTED, RULINGS, matching findings). feedCapChars stays the total; namedCapChars stays the named-file total.
const MIN_NAMED = 1200;
function namedItem(p, { must, full }) {
  const over = `### ${p}\n\n\n`.length, want = Math.min(WATCH.perFileCapChars, full.length) + over;
  return { full, want, floor: Math.min(want, Math.min(WATCH.perFileCapChars, Math.max(MIN_NAMED, must.length)) + over) };
}
function buildFeedAaa(planText, io, name, opts = {}) {
  const refs = namedRefs(planText, io), parts = [];
  let text = "";
  const add = (src, body) => {
    if (!body) return 0;
    const room = WATCH.feedCapChars - text.length;
    if (room <= 0) return 0;
    const chunk = `### ${src}\n${String(body).trim()}\n\n`.slice(0, room);
    text += chunk; parts.push({ src, chars: chunk.length });
    return chunk.length;
  };
  const pre = new Set();
  if (opts.art) for (const p of WATCH.art?.feed ?? []) { const t = io.read(p); if (t != null) { add(`${p} (art feed)`, t.slice(0, WATCH.perFileCapChars)); pre.add(p); } }
  if (WATCH.checklistFile) {
    const cl = (io.read(WATCH.checklistFile) ?? "").split("\n").filter((l) => /^\s*-\s+\S/.test(l));
    // Savi 2026-09-30: the checklist grows every build; past checklistCapChars it keeps its NEWEST lines, so it can never crowd the plan's named files out
    const cap = WATCH.checklistCapChars ?? 6000; let keep = [], n = 0;
    for (let i = cl.length - 1; i >= 0 && n + cl[i].length + 1 <= cap; i--) { keep.unshift(cl[i]); n += cl[i].length + 1; }
    if (keep.length) { add(`${WATCH.checklistFile} (post-build bugs, newest ${keep.length} of ${cl.length}: check each under HARDENED)`, keep.join("\n")); pre.add(WATCH.checklistFile); }
  }
  for (const [n, nm] of Object.entries(WATCH.scores?.anchors ?? {})) {
    const p = `docs/board/proposals/${nm}.md`, t = io.read(p);
    if (t != null) add(`ANCHOR score ${n}: ${p} (calibration: a plan that scored ${n})`, t.slice(0, 1200));
  }
  // named files: every one gets at least its ranges/functions (or 1200 chars); slices shrink to fit namedCapChars
  const fnNames = namedFunctions(planText), items = [];
  for (const [p, ranges] of refs.files) {
    if (p === WATCH.findingsFile || p === WATCH.rulingsFile || pre.has(p)) continue;
    const t = io.read(p); if (t == null) continue;
    const fs = [...functionSpans(t, fnNames), ...(WATCH.feedQuotes !== false ? quoteSpans(t, planText) : [])];
    items.push({ p, t, ranges, fs, ...namedItem(p, namedBody(t, ranges, fs)), give: 0 });
  }
  // HEIMDALL-FEED-TIGHT (2026-10-02): when the floors overflow, a single named line keeps ±6 lines, not ±20, before any file is cut whole
  if (items.reduce((a, x) => a + x.floor, 0) > Math.max(0, Math.min(WATCH.namedCapChars ?? Math.round(WATCH.feedCapChars * 0.65), WATCH.feedCapChars - text.length)))
    for (const x of items) Object.assign(x, namedItem(x.p, namedBody(x.t, x.ranges, x.fs, 6)));
  const namedCap = WATCH.namedCapChars ?? Math.round(WATCH.feedCapChars * 0.65);
  const budget = Math.max(0, Math.min(namedCap, WATCH.feedCapChars - text.length));
  const sumWant = items.reduce((a, x) => a + x.want, 0), sumFloor = items.reduce((a, x) => a + x.floor, 0);
  if (sumWant <= budget) for (const x of items) x.give = x.want;
  else if (sumFloor <= budget) {
    const extra = budget - sumFloor, gap = sumWant - sumFloor;
    for (const x of items) x.give = x.floor + Math.floor(extra * (x.want - x.floor) / gap);
  } else { let left = budget; for (const x of items) { x.give = x.floor <= left ? x.floor : 0; left -= x.give; } }
  for (const x of items) {
    if (x.give <= 0) { parts.push({ src: `cut: ${x.p} (named file not fed)`, chars: 0 }); continue; }
    add(x.p, x.full.slice(0, Math.max(0, x.give - `### ${x.p}\n\n\n`.length)));
  }
  if (name && WATCH.refDir) { const r = io.read(`${WATCH.refDir}${name}.md`); if (r) add(`${WATCH.refDir}${name}.md (engine-reference excerpt)`, r.slice(0, WATCH.refCapChars ?? 8000)); }
  const fl = (io.read(WATCH.findingsFile) ?? "").split("\n").filter((l) => l.trim());
  add(`${WATCH.findingsFile} (PROTECTED lines)`, fl.filter((l) => l.includes("PROTECTED")).join("\n"));
  add(WATCH.rulingsFile, io.read(WATCH.rulingsFile) ?? "");
  const needles = [...new Set([...refs.bases, ...[...refs.files.keys()], ...refs.ids])].filter((n) => n.length >= 4);
  add(`${WATCH.findingsFile} (lines naming the plan's files/ids)`, fl.filter((l) => !l.includes("PROTECTED") && /^\s*-/.test(l) && needles.some((n) => l.includes(n))).join("\n"));
  return { text, chars: text.length, parts };
}

// ---- W4/W5/W6/W8: the aaa seat request -----------------------------------------------------
function reviewerRequestAaa(who, seat, planText, feed, round, priorFails, opts) {
  const art = !!opts.art, pts = pointsFor({ art }), ids = pts.map((p) => p.id);
  const judged = opts.artOnly ? [...WATCH.artOnlyPoints, ...(art ? ["FEEL"] : [])] : ids;
  const n = pts.length, seats = seat.solo ? 1 : art ? 3 : 2;
  const points = pts.map((p) => `- ${p.id}${judged.includes(p.id) ? "" : " (not judged: art-only plan)"}${seat.leads.includes(p.id) ? " [YOU LEAD]" : ""}: ${p.text}`).join("\n");
  const system = [
    ...(opts.persona ? [String(opts.persona).trim(), ""] : []),
    seat.solo ? `You are ${seat.name}, ${seat.title}: the single gatekeeper at Heimdall's gate for a small docs-only plan of Mellowbrook's board, judging as both the engineer and the systems designer.`
      : `You are ${seat.name}, ${seat.title}, one of ${seats} independent gatekeepers at Heimdall's gate for Mellowbrook's board plans. You shape plans to studio grade, not just pass or fail them.`,
    `You lead ${seat.leads.join(" and ")}: judge those hardest, but score all ${n} points.`,
    `The ${n} points:\n${points}`,
    `Score every point 0-4 against these levels (pass = score >= ${PASS_AT()}):\n${(WATCH.scores?.levels ?? []).join("\n")}`,
    "Write walk FIRST: the player's first 10 seconds after this ships, step by step, as the plan makes them. Then score the points.",
    "Rules (plain code enforces them after you answer):",
    "1. Evidence is a quote copied character for character from the PLAN or FED FILES text in the message. Never paraphrase, never quote from memory. You may join two or three exact quotes with \"...\" only if each part is copied exactly. A part is one unbroken run of the text: never put \"...\" or {...} inside a part, never add an object name the text does not have at that spot (quote everyMs: 10 * 60e3, not DENI.everyMs: 10 * 60e3), never change a capital or a comma.",
    "1b. For SOUND, quote the docs/board/PERF.md line (or the fed code line) you compared each of the plan's budget numbers against; you may join it to the plan's number as \"<PERF.md quote> ... <plan quote>\".",
    `2. A score of ${PASS_AT()} or more needs a verbatim quote of at least ${MIN_WORDS} words; without it the score is capped at ${CAP()} as a blocker. GROUNDED and SOUND must quote the FED FILES, not the plan (a path or state key marked (new) needs no grounding, so ground the claims it makes about EXISTING files and keys); FAITHFUL may quote the ask, CONTRACTED, PROVABLE and HARDENED may quote the plan.${ids.includes("FEEL") ? " FEEL is judged on a reason: a why that names what the player sees, hears and feels is its evidence." : ""}`,
    `3. A score under ${PASS_AT()}: why names the exact gap and what would close it; evidence quotes the plan text at fault (or is empty if the gap is an absence).`,
    "4. severity: blocker holds the plan, note folds into the build. Mark blocker only for a gap a builder cannot close alone.",
    "5. Never edit the creator's verbatim ask block (the quoted ask). It is read-only to you.",
    "6. An edit only replaces exact text copied from the plan (replace), with new text (with), and quotes a FED FILE (never the plan) as its evidence. An edit whose replace or evidence is not found verbatim is rejected.",
    "7. Every edit carries why and cost; added=true when it goes past the ask; polish never beats the creator's words or docs/board/PERF.md.",
    "8. Nothing outside the fed text exists for you: an API, file, id or number not in it is ungrounded. The ANCHOR parts of the fed files are calibration: plans that scored 1, 3 and 4.",
    ...(WATCH.preBuild === false ? [] : [
      "9b. BEFORE THE BUILD (HEIMDALL-PRE): this plan is not built. Evidence comes in three tiers. TODAY: what the fed files say now; GROUNDED judges these claims strictly. BENCH: a box or prototype measurement, labelled as one, with a stated limit. AFTER: a live number the build must take, listed under \"## Measured after build\" with its limit and the readOnly check that takes it. For the cost of code not yet built, BENCH plus AFTER is full evidence for a 3. Never score a point under 3 for lacking live, in-world or bell numbers of unbuilt code, and never because its not-verified list honestly names them: the post-build audit checks AFTER against its limit.",
      "9c. A plan that starts with \"Slice of: <PLAN>\" answers only for its own slice: FAITHFUL maps the ask clauses it claims, and the rest only needs a Deferred line with a reason.",
    ]),
    ...(who === "saga" ? ["9. You are the Art & Feel Director: judge FEEL against aesthetic.yml and ART-RULES.md (fed first), and name one real-game moment the plan's feel is measured against, and the gap to it."] : []),
    ...(opts.breaker ? [`You are this round's BREAKER: besides scoring, write breaker as the single worst way this plan breaks in play (the worst case only, concrete: who does what, what they see). The other seat${seats > 2 ? "s" : ""} leave${seats > 2 ? "" : "s"} breaker empty.`] : ["You are not this round's breaker: leave breaker empty."]),
    ...(opts.artOnly ? [`This is an art-only plan: only ${judged.join(" and ")} are judged. Answer the others score 4, pass: true, severity "note", evidence "", why "not judged: art-only".`] : []),
    `toPass: one line, exactly what would make you score every point ${PASS_AT()} or more.`,
    `Honest limit, true of you: ${WATCH.honestLimit}`,
    `Answer only with JSON matching the schema: exactly ${n} points, one per id, and at most ${WATCH.maxEdits ?? 24} edits (the ones that matter most; the rest go in toPass). Be brief: every why and evidence under 300 characters, every with under 600. A long answer is cut off and counts as no answer.`,
  ].join("\n");
  const fails = (priorFails ?? []).map((f) => (typeof f === "string" ? `- ${f}` : `- ${f.id}: ${f.why ?? ""}`)).join("\n");
  const message = [
    `ROUND ${round} of ${WATCH.maxRounds}.${opts.breaker ? " You are the breaker this round." : ""}`,
    ...(round > 1 && fails ? [`The previous round held these points; check each was fixed, and answer any DISPUTE line in the plan:\n${fails}`] : []),
    ...(opts.locked?.length ? [`LOCKED (passed in an earlier round, and the text they passed on still stands): ${opts.locked.join(", ")}. Do not re-judge them and raise no new demands on them; score them ${PASS_AT()} with their quote. Judge the open points only, against what the previous round asked: a demand the previous round never made is a note, not a blocker.`] : []),
    `=== PLAN ===\n${planText ?? ""}`,
    `=== FED FILES (${feed?.chars ?? 0} chars: ${(feed?.parts ?? []).map((p) => p.src).join("; ")}) ===\n${feed?.text ?? ""}`,
  ].join("\n\n");
  return { model: WATCH.model, system, message, schema: verdictSchema({ art }) };
}
// W8: the round's breaker among the seats sitting, in WATCH.breakerOrder
export function breakerFor(round, seats) {
  const order = (WATCH.breakerOrder ?? []).filter((s) => (seats ?? []).includes(s));
  return order.length ? order[(Math.max(1, round) - 1) % order.length] : null;
}


// HEIMDALL-PRE P2: a blocker that only asks for a live number of unbuilt code (or, on a declared slice, for the rest of the ask) becomes a note; any TODAY fault in the same reason keeps it a blocker
export function preBuildSoft(id, why, sliceMode) {
  if (WATCH.preBuild === false) return false;
  const w = String(why ?? "");
  if (!w.trim() || EVIDENCE.hardRe.test(w)) return false;
  if (EVIDENCE.softRe.test(w) && ["GROUNDED", "SOUND", "PROVABLE", "HARDENED"].includes(id)) return true;
  if (sliceMode && id === "FAITHFUL" && EVIDENCE.sliceSoftRe.test(w)) return true;
  return false;
}
const softDown = (r, sliceMode) => (r.score < PASS_AT() && r.severity === "blocker" && r.ok !== false && preBuildSoft(r.id, r.why, sliceMode)
  ? { ...r, severity: "note", why: `pre-build note (HEIMDALL-PRE: checked after the build): ${r.why}`, preBuild: true } : r);

// ---- W6: the aaa plain-code check ------------------------------------------------------------
const str = (x) => (typeof x === "string" ? x : x == null ? "" : String(x));
function checkVerdictAaa(v, feedText, opts = {}) {
  const art = !!opts.art, ids = idsFor(art);
  const passThrough = (o) => ({ walk: str(o?.walk), breaker: str(o?.breaker), toPass: str(o?.toPass) });
  const fail = (why) => ({ points: ids.map((id) => ({ id, pass: false, score: 0, severity: "blocker", evidence: "", why, ok: false, quoted: false })), malformed: true, ...passThrough(v && typeof v === "object" ? v : null) });
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail("malformed verdict: not an object");
  const pts = coercePoints(v.points);
  if (!pts) return fail(`malformed verdict: points is ${v.points === undefined ? "missing" : typeof v.points}`);
  const byId = new Map();
  for (const p of pts) {
    const scored = typeof p?.score === "number" && Number.isFinite(p.score);
    if (!p || typeof p !== "object" || !ids.includes(p.id) || byId.has(p.id) || (typeof p.pass !== "boolean" && !scored)) return fail("malformed verdict: bad, duplicate or unknown point");
    byId.set(p.id, p);
  }
  if (byId.size !== ids.length) return fail("malformed verdict: missing point");
  const judged = opts.artOnly ? [...WATCH.artOnlyPoints, ...(art ? ["FEEL"] : [])] : ids;
  const hay = haystack(feedText?.text ?? feedText);
  const feedHay = opts.feedOnly != null ? haystack(opts.feedOnly) : null;
  const sliceMode = opts.sliceMode ?? EVIDENCE.sliceRe.test(str(opts.planText ?? feedText?.text ?? feedText));
  const points = ids.map((id) => {
    const p = byId.get(id), evidence = str(p.evidence), why = str(p.why);
    if (!judged.includes(id)) return { id, pass: true, score: null, severity: "note", evidence, why: "not judged: art-only", ok: true, judged: false, quoted: true };
    let score = typeof p.score === "number" && Number.isFinite(p.score) ? clampScore(p.score) : p.pass ? 3 : 1;
    let severity = p.severity === "blocker" || p.severity === "note" ? p.severity : score < PASS_AT() ? "blocker" : "note";
    let ok = true, outWhy = why;
    // FEEL: a reason is evidence (an empty why is none); every other point: the quote rules (W3)
    const fault = id === "FEEL" ? (why.trim() ? null : "short") : quoteFault(id, evidence, hay, feedHay);
    if (score >= PASS_AT() && fault) {
      score = Math.min(score, CAP()); severity = "blocker"; ok = false;
      outWhy = `${id === "FEEL" ? "FEEL scored without a reason" : FAULT_WHY[fault]}: capped at ${CAP()} (${why})`;
    }
    return softDown({ id, pass: score >= PASS_AT(), score, severity, evidence, why: outWhy, ok, quoted: !fault }, sliceMode);
  });
  return { points, malformed: false, ...passThrough(v) };
}

// ---- W6/W9: seats combined ---------------------------------------------------------------------
// checkedBySeat = { mimir: checked, vor: checked, saga?: checked } (a seat that did not sit is absent or null)
export function combineSeats(checkedBySeat, opts = {}) {
  const art = !!opts.art, ids = opts.artOnly ? idsFor(art).filter((id) => WATCH.artOnlyPoints.includes(id) || id === "FEEL") : idsFor(art);
  const seats = Object.entries(checkedBySeat ?? {}).filter(([, c]) => c && Array.isArray(c.points));
  const pass = [], fail = [], notes = [], splits = [], pointScores = {};
  let fours = 0;
  for (const id of ids) {
    const rows = seats.map(([, c]) => c.points.find((p) => p.id === id)).filter((r) => r && r.judged !== false && typeof r.score === "number");
    if (!rows.length) { pointScores[id] = 0; fail.push(id); continue; } // nobody judged it: it holds
    const min = Math.min(...rows.map((r) => r.score));
    pointScores[id] = min;
    if (rows.some((r) => r.score >= PASS_AT()) && rows.some((r) => r.score < PASS_AT())) splits.push(id);
    if (min >= PASS_AT()) { pass.push(id); if (min === 4) fours++; }
    else if (rows.some((r) => r.score < PASS_AT() && r.severity !== "note")) fail.push(id);
    else notes.push(id);
  }
  return { pass, fail, notes, score: pass.length, of: ids.length, fours, pointScores, splits, watched: fail.length === 0 && fours >= (WATCH.scores?.needFours ?? 1) };
}

// ---- W9: cross-exam ----------------------------------------------------------------------------
const rowLine = (name, r) => `- ${name}: score ${r?.score ?? "?"}${r?.score < PASS_AT() ? ` (${r?.severity ?? "blocker"})` : ""} · evidence "${str(r?.evidence)}" · why "${str(r?.why)}"`;
export function crossRequest(who, planText, feed, checkedBySeat, splitIds, opts = {}) {
  const seat = WATCH.reviewers[who];
  if (!seat) throw new Error(`watcher-core: unknown reviewer ${who}`);
  const pts = pointsFor({ art: !!opts.art }), mine = checkedBySeat?.[who]?.points ?? [];
  const blocks = (splitIds ?? []).map((id) => {
    const p = pts.find((x) => x.id === id);
    const others = Object.entries(checkedBySeat ?? {}).filter(([s, c]) => s !== who && c?.points).map(([s, c]) => rowLine(WATCH.reviewers[s]?.name ?? s, c.points.find((r) => r.id === id)));
    return `## ${id}: ${p?.text ?? ""}\nYOUR ROW:\n${rowLine(seat.name, mine.find((r) => r.id === id))}\nTHE OTHER SEATS:\n${others.join("\n")}`;
  });
  const system = [
    ...(opts.persona ? [String(opts.persona).trim(), ""] : []),
    `You are ${seat.name}, ${seat.title}. The blind vote is done and the seats split across ${PASS_AT()} on the points below.`,
    "Cross-exam: read the other seats' rows for these points only, then for each point either hold your score (hold: true, same score) or flip it (hold: false, your new score 0-4). Flip only when their row shows a fact you missed; never flip to agree.",
    `Score against these levels:\n${(WATCH.scores?.levels ?? []).join("\n")}`,
    `A score of ${PASS_AT()} or more still needs your own original evidence to have been a verbatim quote (FEEL excepted); if it was not, a flip up is capped at ${CAP()}.`,
    "why: one sentence naming the fact that decided you, under 300 characters.",
    `Answer only with JSON matching the schema: one row per point id (${(splitIds ?? []).join(", ")}).`,
  ].join("\n");
  const message = [
    `CROSS-EXAM, ${(splitIds ?? []).length} split point${(splitIds ?? []).length === 1 ? "" : "s"}.`,
    blocks.join("\n\n"),
    `=== PLAN ===\n${planText ?? ""}`,
    `=== FED FILES (${feed?.chars ?? 0} chars: ${(feed?.parts ?? []).map((p) => p.src).join("; ")}) ===\n${feed?.text ?? ""}`,
  ].join("\n\n");
  return { model: WATCH.model, system, message, schema: CROSS_SCHEMA };
}
// a new checkedBySeat: `who`'s rows flipped where the answer says hold false (CROSS_SCHEMA "hold"; "held" accepted too)
export function applyCross(checkedBySeat, who, answer) {
  const out = { ...(checkedBySeat ?? {}) }, c = out[who];
  if (!c?.points) return out;
  const rows = Array.isArray(answer?.points) ? answer.points : coercePoints(answer?.points) ?? [];
  const flips = new Map();
  for (const a of rows) { const hold = a?.hold ?? a?.held; if (a && hold === false && typeof a.score === "number" && Number.isFinite(a.score)) flips.set(a.id, a); }
  out[who] = { ...c, points: c.points.map((r) => {
    const a = flips.get(r.id);
    if (!a || r.judged === false) return r;
    let score = clampScore(a.score), severity = score < PASS_AT() ? "blocker" : "note", why = `cross: ${str(a.why)} (was ${r.score})`, ok = r.ok;
    if (score >= PASS_AT() && r.id !== "FEEL" && !r.quoted) { score = Math.min(score, CAP()); severity = "blocker"; ok = false; why = `cross flip capped at ${CAP()}: original evidence not found verbatim (${str(a.why)})`; }
    return softDown({ ...r, score, pass: score >= PASS_AT(), severity, why, ok, cross: true }, EVIDENCE.sliceRe.test(str(answer?.planText)));
  }) };
  return out;
}
