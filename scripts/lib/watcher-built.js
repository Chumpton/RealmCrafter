// WATCHERS-AAA W13 · POST-BUILD CHECK (lane L7). After a WATCHED plan is built ("Status: BUILT" in its first 12 lines), one seat
// (MÍMIR, or SAGA on an art plan) reads the files as they stand against the approved plan's slices and writes <NAME>.built.md.
// Pure: no ctx, no clock, no randomness. io = { read, exists, list }; now is passed in. AAA is the only path since lane L6.
import { WATCH, BUILT_SCHEMA } from "./data/watcher.js";

const PER_FILE_MAX = 6000;           // chars per built file in the feed
const WINDOW = 60;               // lines fed from a named function's definition
const BUG_CAP = 12, BUG_LEN = 200;
const STOP = new Set(["new", "read", "only", "evidence", "lines", "line", "file", "files", "and", "the"]);
const norm = (t) => String(t ?? "").replace(/\r\n?/g, "\n");
const squash = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const cell = (t) => squash(t).replace(/\|/g, "\\|") || "—";

// W13 trigger: aaa on, BUILT in the first 12 lines (the statusRe header, or a "Status: BUILT" line), no .built.md yet
export function isBuilt(planText) {
  const head = norm(planText).split("\n").slice(0, 12), re = new RegExp(WATCH.statusRe);
  for (const l of head) {
    if (/^\s*Status:\s*BUILT\b/.test(l)) return true;
    const m = l.match(re); if (m && m[1] === "BUILT") return true;
  }
  return false;
}
export function wantsBuilt(planText, builtExists) {
  return isBuilt(planText) && !builtExists;
}
export const builtPath = (name) => `${WATCH.proposalsDir}${name}${WATCH.builtSuffix}`;

// the plan's "## Slices" section (heading to the next "## "); none = empty
export function slicesOf(planText) {
  const lines = norm(planText).split("\n"), i = lines.findIndex((l) => /^#{1,3}\s*Slices\b/i.test(l));
  if (i < 0) return "";
  let j = i + 1; while (j < lines.length && !/^#{1,2}\s/.test(lines[j])) j++;
  return lines.slice(i, j).join("\n").trim();
}

// the files on the "Files this plan changes" / "New files" lines: [{ path, ranges: [[lo, hi]], names: [] }]
export function builtFiles(planText) {
  const out = [], seen = new Map();
  for (const l of norm(planText).split("\n")) {
    if (!/^\s*(Files this plan changes|New files)\b/i.test(l)) continue;
    const body = l.replace(/^[^:]*:/, "");
    for (const seg of body.split(/\s+·\s+|;\s+/)) {
      const pm = seg.match(/`?([\w@.\-]+(?:\/[\w@.\-]+)+\.[A-Za-z0-9]+|[\w\-]+(?:\.[\w\-]+)*\.(?:js|mjs|md|yml|yaml|json|scene))`?/);
      if (!pm) continue;
      const path = pm[1].replace(/[.,]+$/, ""), rest = seg.slice(pm.index + pm[0].length);
      const ranges = [];
      for (const r of rest.matchAll(/(?:^:|\blines?\s+)((?:\d+(?:\s*-\s*\d+)?(?:\s*,\s*)?)+)/g))
        for (const p of r[1].split(",")) { const m = p.match(/(\d+)(?:\s*-\s*(\d+))?/); if (m) ranges.push([+m[1], +(m[2] ?? m[1])]); }
      const names = [];
      for (const g of rest.matchAll(/\(([^)]*)\)/g))
        for (const w of g[1].split(/[,\s]+/)) if (/^[A-Za-z_$][\w$]*$/.test(w) && !STOP.has(w.toLowerCase()) && w.length > 2) names.push(w);
      const f = seen.get(path) ?? { path, ranges: [], names: [] };
      if (!seen.has(path)) { seen.set(path, f); out.push(f); }
      f.ranges.push(...ranges); f.names.push(...names);
    }
  }
  return out;
}

// one file's feed body: named functions, then named ranges, then the head, up to PER_FILE chars
function fileBody(text, f, idents = [], PER_FILE = PER_FILE_MAX) {
  const lines = norm(text).split("\n"), picked = [], taken = new Set();
  const take = (lo, hi, label) => {
    lo = Math.max(1, lo); hi = Math.min(lines.length, hi); if (hi < lo) return;
    const key = `${lo}-${hi}`; if (taken.has(key)) return; taken.add(key);
    picked.push(`-- ${label} (lines ${lo}-${hi}) --\n${lines.slice(lo - 1, hi).join("\n")}`);
  };
  for (const n of f.names) {
    const re = new RegExp(`(?:\\bfunction\\s+|\\b(?:const|let|var|class)\\s+|^\\s*)${n.replace(/\$/g, "\\$")}\\b\\s*[=(:{]`);
    const at = lines.findIndex((l) => re.test(l));
    if (at >= 0) take(at + 1, at + WINDOW, n);
  }
  // the plan's own names where they sit TODAY (a plan's line ranges are from before the build and drift): first hit ±8 lines
  for (const id of idents) {
    if (picked.join("\n").length > PER_FILE * 0.8) break;
    const at = lines.findIndex((l) => l.includes(id));
    if (at >= 0 && ![...taken].some((k) => { const [lo, hi] = k.split("-").map(Number); return at + 1 >= lo && at + 1 <= hi; })) take(at - 7, at + 9, id);
  }
  for (const [lo, hi] of f.ranges) take(lo, hi, "range");
  let body = picked.join("\n");
  if (body.length < PER_FILE) body += `${body ? "\n" : ""}-- head --\n${lines.join("\n")}`;
  return body.length > PER_FILE ? body.slice(0, PER_FILE) + "\n…(cut)" : body;
}

export function builtFeed(planText, io, name) {
  const parts = [], chunks = [], cap = WATCH.feedCapChars;
  let total = 0;
  const add = (src, body, keep = 0) => {
    const piece = `=== ${src} ===\n${body}\n`;
    const room = cap - keep - total; if (room <= 40) return false;
    const t = piece.length > room ? piece.slice(0, room - 8) + "\n…(cut)\n" : piece;
    chunks.push(t); total += t.length; parts.push({ src, chars: t.length }); return true;
  };
  add(`${WATCH.proposalsDir}${name ?? "plan"}.md (approved slices)`, slicesOf(planText) || "(no ## Slices section)");
  const idents = [...new Set([...norm(slicesOf(planText) + "\n" + planText).matchAll(/`([A-Za-z_$][\w$.]{3,40})`|\b([a-z]+[A-Z][\w$]{2,30})\b/g)].map((m) => (m[1] ?? m[2]).split(".").pop()).filter((w) => w.length > 3 && !STOP.has(w.toLowerCase())))].slice(0, 60);
  // REVIEW-CAPS (Oct 1): every built file gets a fair share of the feed; before this the first four files ate 24k and the new files never reached the reviewer
  // HEIMDALL-PRE P3: a plan that promised live numbers is audited on them: its PERF.md lines (then the newest) are cut first and keep their room
  let perfBody = null;
  if (WATCH.preBuild !== false && afterOf(planText) && io?.read) { const perf = io.read("docs/board/PERF.md"); if (perf != null) { const pl = perf.split("\n"), tag = String(name ?? "").replace(/^[A-Z]+-/, ""), mine = pl.filter((l) => l.includes(String(name)) || (tag && new RegExp(`\\b${tag}\\b`).test(l))); perfBody = [...mine.slice(-12), "…", ...pl.slice(-8)].join("\n").slice(0, 4000); } }
  const reserve = perfBody ? perfBody.length + 120 : 0;
  const files = builtFiles(planText), share = Math.max(1200, Math.min(PER_FILE_MAX, Math.floor((cap - total - reserve) / Math.max(1, files.length)) - 60));
  for (const f of files) {
    const has = io?.exists ? io.exists(f.path) : true, text = has && io?.read ? io.read(f.path) : null;
    if (!add(f.path, text == null ? "(missing: this file does not exist in the tree as built)" : fileBody(text, f, idents, share), reserve)) break;
  }
  if (perfBody) add("docs/board/PERF.md (live numbers the build promised: this plan's lines, then the newest)", perfBody);
  const text = chunks.join("");
  return { text, chars: text.length, parts };
}

// HEIMDALL-PRE P3: the plan's "## Measured after build" section, or ""
export function afterOf(planText) {
  const m = String(planText ?? "").match(/^##+\s*measured after build[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im);
  return m ? m[1].trim() : "";
}
// llm:generate args for the one post-build seat
export function builtRequest(name, planText, feed, opts = {}) {
  const seatId = WATCH.heimdall?.on && WATCH.reviewers.heimdall ? "heimdall" : opts.art ? "saga" : "mimir", seat = WATCH.reviewers[seatId]; // HEIMDALL audits every build
  const system = [
    `You are ${seat.name}, ${seat.title}, the den's post-build check. A plan the watchers approved has been BUILT.`,
    "Read the files AS THEY STAND (fed below) against the approved plan's slices. For EACH slice: did its done-when hold in the files?",
    "held = true only when the fed files show it; evidence = a quote copied character for character from a fed file (never the plan); why = one line.",
    "A slice whose file is missing or whose done-when the files cannot show is held = false.",
    "drift: anything built differently from the plan, or changed outside it, one line each.",
    "bugs: real defects you can see in the fed code (a crash path, a stale read, an unguarded state write), one line each; these feed the pre-mortem checklist.",
    ...(WATCH.preBuild !== false && afterOf(planText) ? [`The plan promised live numbers under "## Measured after build". Report them as one more slice named "AFTER": held = true only when docs/board/PERF.md (fed) carries every promised number inside its limit, quoted; a number missing or over its limit is held = false with the number in why. A held = false AFTER is a broken promise: the plan's flag or undo comes next.`] : []),
    opts.art ? "You also judge feel: juice, polish and readability as the plan named them." : "",
    "Be exact and terse. No praise.",
  ].filter(Boolean).join("\n");
  const message = `PLAN: ${name}\n\nFULL APPROVED PLAN:\n${String(planText ?? "").slice(0, 12000)}\n\nFED FILES (current):\n${feed?.text ?? ""}`;
  return { model: WATCH.model, system, message, schema: BUILT_SCHEMA };
}

const wellFormed = (a) => a && typeof a === "object" && !Array.isArray(a) && Array.isArray(a.slices);

export function builtBugs(answer) {
  if (!wellFormed(answer) || !Array.isArray(answer.bugs)) return [];
  const out = [], seen = new Set();
  for (const b of answer.bugs) {
    if (typeof b !== "string") continue;
    let s = squash(b).replace(/^[-*•]\s*/, "");
    if (!s) continue;
    if (s.length > BUG_LEN) s = s.slice(0, BUG_LEN - 1) + "…";
    const k = s.toLowerCase(); if (seen.has(k)) continue; seen.add(k);
    out.push(s); if (out.length >= BUG_CAP) break;
  }
  return out;
}

// the .built.md text. feedText (optional): a held slice whose evidence is not in the feed verbatim is marked unquoted
export function builtDoc(name, answer, now, feedText) {
  const when = Number.isFinite(now) ? `room t+${Math.round(now / 60000)} min` : ""; // ctx.now() is the room clock, not a calendar date
  const head = [`# ${name} · post-build check`, `Written ${when} against the approved plan ${WATCH.proposalsDir}${name}.md.`, ""];
  if (!wellFormed(answer)) return [...head, "**malformed answer**: the seat's reply was not an object with slices; nothing judged. Bugs: none fed.", ""].join("\n");
  const hay = feedText != null ? squash(feedText) : null;
  const rows = answer.slices.filter((s) => s && typeof s === "object").map((s) => {
    let held = s.held === true ? "yes" : "no";
    if (held === "yes" && hay != null && !(squash(s.evidence).length && hay.includes(squash(s.evidence)))) held = "yes (unquoted)";
    return `| ${cell(s.slice)} | ${held} | ${cell(s.evidence)} | ${cell(s.why)} |`;
  });
  const nHeld = answer.slices.filter((s) => s?.held === true).length;
  const drift = (Array.isArray(answer.drift) ? answer.drift : []).filter((d) => typeof d === "string" && squash(d)).slice(0, 12).map((d) => `- ${squash(d)}`);
  const bugs = builtBugs(answer).map((b) => `- ${b}`);
  return [...head, `Held ${nHeld}/${answer.slices.length} slices.`, "",
    "| slice | held | evidence | why |", "|---|---|---|---|", ...(rows.length ? rows : ["| — | — | — | no slices judged |"]), "",
    "## Drift", ...(drift.length ? drift : ["- none"]), "",
    "## Bugs (fed to CHECKLIST.md)", ...(bugs.length ? bugs : ["- none"]), ""].join("\n");
}
