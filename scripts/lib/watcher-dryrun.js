// WATCH-DRYRUN (docs/board/proposals/WATCH-DRYRUN.md, WATCHED 5/5; creator #1 priority 2026-09-30).
// dryRun(name, text, io, opts) -> { pass, faults, feed }: the faults a round would lose on, found before SUBMITTED. Pure: no ctx, no job, no writes.
// D1 ENTRY path/lanes/claims (precheck) · D2 QUOTES a fact quote must be in the feed · D3 CUT a named file must be fed · D4 ONE HOME one setting, one store.
import { precheck, parseClaims, namedPaths } from "./watcher-precheck.js";
import { buildFeed, normText } from "./watcher-core.js";

const CLAIMS = "docs/board/CLAIMS.md";
const FACT_HEAD = /stands|why|budget|fix|measure|evidence/i;   // sections whose quotes are facts a seat checks against the files
const SKIP_LINE = /creator|verbatim|DISPUTE|ask\b/i;            // the creator's words and disputes quote chat or the plan, not a file
const QUOTE_RE = /`([^`\n]+)`|"([^"\n]+)"/g;
const words = (t) => String(t).split(/[^\p{L}\p{N}_]+/u).filter(Boolean).length;

function sections(text) {
  const out = []; let head = "";
  for (const line of text.split("\n")) { const h = line.match(/^#{2,3}\s+(.*)/); if (h) head = h[1]; else out.push({ head, line }); }
  return out;
}
export function factQuotes(text) {
  const out = [];
  for (const { head, line } of sections(text)) {
    if (!FACT_HEAD.test(head) || SKIP_LINE.test(line)) continue;
    QUOTE_RE.lastIndex = 0; let m;
    while ((m = QUOTE_RE.exec(line))) {
      const q = (m[1] ?? m[2]).replace(/^line \d+\s*/i, "").trim();
      if (words(q) >= 4) out.push(q);
    }
  }
  return [...new Set(out)];
}
export function filesLinePaths(text) {
  const line = text.split("\n").find((l) => /^Files this plan changes/i.test(l)) ?? "";
  return namedPaths(line).filter((p) => !p.isNew).map((p) => p.path.replace(/\/$/, ""));
}
export function stateHomes(text) {
  const homes = new Map();
  for (const line of text.split("\n")) {
    if (!/\blives? in\b|\bwrites?\b(?! nothing)/i.test(line) || /DISPUTE|not in\b/i.test(line)) continue;
    for (const m of line.matchAll(/\b([\w-]+)\.state\.([\w]+)/g)) {
      const store = m[1] === "self" ? "self" : m[1], key = m[2];
      if (!homes.has(key)) homes.set(key, new Set());
      homes.get(key).add(store);
    }
  }
  return homes;
}
export function dryRun(name, text, io, opts = {}) {
  const faults = [];
  if (!opts.skipEntry) {
    const pc = precheck(text, io, { claims: parseClaims(io.read(CLAIMS) ?? ""), self: `docs/board/proposals/${name}.md` });
    faults.push(...pc.faults);
  }
  const feed = opts.feed ?? buildFeed(text, io, name);
  const hay = normText(feed.text).toLowerCase();
  for (const q of factQuotes(text)) if (!hay.includes(normText(q).toLowerCase())) faults.push({ kind: "quote", detail: `quote not in feed: ${q.slice(0, 90)}` });
  const fed = new Set(feed.parts.map((p) => p.src));
  for (const p of filesLinePaths(text)) if (io.read(p) != null && ![...fed].some((s) => s === p || s.startsWith(p + " "))) faults.push({ kind: "cut", detail: `named file not fed: ${p} (cap namedCapChars)` });
  for (const [key, stores] of stateHomes(text)) if (stores.size > 1) faults.push({ kind: "home", detail: `two homes for ${key}: ${[...stores].map((s) => s + ".state").join(" and ")}` });
  return { pass: faults.length === 0, faults, feed };
}
