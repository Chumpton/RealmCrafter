// BUILD QUEUE core (pure: no ctx). parseApproved + rank → rows; render → BUILD-QUEUE.md. board-jev.js calls it when a source changes.
import { BQ } from "./data/build-queue.js";
import { MERGE } from "./data/merge-gate.js"; // MERGE-GATE-v2 M5
import { notDupes, isNotDupe } from "./idea-index.js";

const DAY = 86400e3;
const low = (s) => String(s ?? "").toLowerCase();
// the zone whose keyword appears EARLIEST in "where:" ("South yard, … against the longhouse's wall" is the yard, not the hall)
function zoneOf(where) { const w = low(where); let best = null, at = Infinity;
  for (const [z, words] of BQ.zones) for (const k of words) { const i = w.search(new RegExp("\\b" + k.replace(/ /g, "\\s+"))); if (i >= 0 && i < at) { at = i; best = z; } }
  return best ?? "YARD"; }
// the approved-board blocks → { id, title, status, who, size, where, zone, creatorYes, approvedAt (ms|null), text }
export function parseApproved(text) {
  const out = [];
  for (const b of String(text ?? "").split(/\n(?=## [DS]\d+ )/).slice(1)) {
    const h = /^## ([DS]\d+) · (.*?) · ([A-Z][^\n]*)$/m.exec(b); if (!h) continue;
    const st = h[3].trim(), status = /^DONE/.test(st) ? "DONE" : /^IN PROGRESS/.test(st) ? "BUILDING" : "TODO";
    const who = /^IN PROGRESS\s*\(([^)]*)\)/.exec(st)?.[1] ?? null;
    const size = /size:\s*([SML])\b/.exec(b)?.[1] ?? "S", where = /where:\s*([^\n]*)/.exec(b)?.[1] ?? "";
    const votes = /^- votes:(.*)$/m.exec(b)?.[1] ?? "", ap = /^- approved:\s*(\d{4}-\d\d-\d\d \d\d:\d\d) UTC/m.exec(b)?.[1];
    out.push({ id: h[1], title: h[2].replace(/^[DS]\d+\s+/, "").trim(), status, who, size, where: where.trim(), zone: zoneOf(where),
      creatorYes: /\bcreator\s+YES\b/i.test(votes), approvedAt: ap ? Date.parse(ap.replace(" ", "T") + ":00Z") : null });
  }
  return out;
}
// rows (TODO + BUILDING only, deduped) scored and sorted; each row carries score, urgency, days and its top reasons
// VOTE-LEDGER L6: pins = the creator's ★ ids top first (PRIORITY.md). A pinned open row goes first in pin order, scores +S.pinned, why "★ you pinned".
// pins = [] (the default) leaves the order, scores and why byte-identical to before.
export function rank(rows, { shelfText = "", now = 0, pins = [] } = {}) {
  const pinAt = new Map(); for (const id of pins ?? []) if (!pinAt.has(id)) pinAt.set(id, pinAt.size);
  const S = BQ.score, seen = new Set(), open = rows.filter((r) => r.status !== "DONE" && !seen.has(r.id) && seen.add(r.id));
  const perZone = {}; for (const r of open) perZone[r.zone] = (perZone[r.zone] ?? 0) + 1;
  const shelved = new Set([...String(shelfText).matchAll(/^## ([DS]\d+) /gm)].map((m) => m[1]));
  const ranked = open.map((r) => {
    const parts = [];
    if (r.creatorYes) parts.push([S.creatorYes, "you voted YES"]);
    parts.push([S.size[r.size] ?? 0, `size ${r.size}`]);
    const days = r.approvedAt && now > 1.6e12 ? Math.max(0, (now - r.approvedAt) / DAY) : null;
    if (days != null && days >= 0.5) parts.push([Math.min(S.dayCap, Math.round(days * S.perDay)), `${Math.round(days)} d waiting`]);
    if (BQ.standing.some((k) => low(r.where).includes(k) || low(r.title).includes(k))) parts.push([S.plugsIn, "uses what stands"]);
    if (perZone[r.zone] > 1) parts.push([S.cluster, `${perZone[r.zone]} in ${r.zone.toLowerCase()}`]);
    if (shelved.has(r.id)) parts.push([S.shelf, "waits on a system"]);
    const pinned = pinAt.has(r.id);
    const score = parts.reduce((a, [v]) => a + v, 0) + (pinned ? (S.pinned ?? 100) : 0);
    const why0 = parts.filter(([v]) => v !== 0).sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])).slice(0, 2).map(([, t]) => t).join(" · ");
    const why = pinned ? ["★ you pinned", why0].filter(Boolean).join(" · ") : why0;
    return { ...r, score, days, why, urgency: score >= BQ.urgency.high ? "HIGH" : score >= BQ.urgency.mid ? "MID" : "LOW", ...(pinned ? { pinned: true } : {}) };
  });
  // JEV-LOAD L7 (backlog drain): BUILDING first (it is in hand), then TODO by size (BQ.order.size: S, M, L), creator YES first within a size,
  // oldest approval first (undated = approved before 29 Sep = oldest), then score, then id. The score still rides each row as its urgency.
  const sz = (r) => { const i = BQ.order.size.indexOf(r.size); return i < 0 ? BQ.order.size.length : i; };
  const pa = (r) => pinAt.has(r.id) ? pinAt.get(r.id) : Infinity, pinCmp = (a, b) => { const x = pa(a), y = pa(b); return x === y ? 0 : x < y ? -1 : 1; };
  return ranked.sort((a, b) => pinCmp(a, b) || (b.status === "BUILDING") - (a.status === "BUILDING") || sz(a) - sz(b) || (b.creatorYes - a.creatorYes) ||
    (a.approvedAt ?? 0) - (b.approvedAt ?? 0) || b.score - a.score || a.id.localeCompare(b.id, "en", { numeric: true }));
}
// VOTE-LEDGER V-c: pins that are no longer open leave PRIORITY.md. rankedRows = rank() output (open rows); allRows = parseApproved rows
// (both boards). Optional { queueText }: BUILD-QUEUE.md, whose '## Merged' seals / MERGED→ rows mark merged ids.
// → { keep: [ids in pin order], gone: [{ id, why: "built" | "merged" | "denied" | "not pending" }] }
export function prunePins(pins, rankedRows = [], allRows = [], { queueText = "" } = {}) {
  const open = new Map((rankedRows ?? []).map((r) => [r.id, r])), all = new Map(), merged = new Set();
  for (const r of allRows ?? []) if (!all.has(r.id) || r.status === "DONE") all.set(r.id, r);
  for (const m of mergesOf(queueText)) m.gone.forEach((g) => merged.add(g));
  for (const m of String(queueText ?? "").matchAll(/^\d+\. \[([DS]\d+)\] .* · MERGED→/gm)) merged.add(m[1]);
  const isMerged = (r) => /^MERGED/.test(String(r?.status ?? "")) || !!r?.target;
  const keep = [], gone = [], seen = new Set();
  for (const id of pins ?? []) {
    if (seen.has(id)) continue; seen.add(id);
    const o = open.get(id), a = all.get(id);
    if (o && (o.status === "TODO" || o.status === "BUILDING") && !merged.has(id) && !isMerged(o)) { keep.push(id); continue; }
    const why = merged.has(id) || isMerged(o) || isMerged(a) ? "merged" : a?.status === "DONE" || a?.status === "BUILT" ? "built"
      : /^(DENIED|DROPPED|NO)$/.test(String(a?.status ?? o?.status ?? "")) ? "denied" : "not pending";
    gone.push({ id, why });
  }
  return { keep, gone };
}
export function ago(ms, now) {
  if (!ms || !(now > 1.6e12)) return "approved before 29 Sep";
  const m = Math.max(0, Math.round((now - ms) / 60e3));
  return m < 60 ? `approved ${m} min ago` : m < 48 * 60 ? `approved ${Math.round(m / 60)} h ago` : `approved ${Math.round(m / 1440)} d ago`;
}
export function render(ranked, now, stamp) {
  const head = `# BUILD QUEUE · approved JEV ideas, in the order they get built\n<!-- Rebuilt in code by board-jev.js whenever DEN-APPROVED / SOLO-APPROVED / SHELF change (docs/board/proposals/BUILD-QUEUE.md). Do not edit by hand: change an idea's header status on its approved board. Rule: 1 in 3 build lanes takes the top TODO row. -->\n${stamp} · ${ranked.length} waiting · ${ranked.filter((r) => r.status === "BUILDING").length} building\n`;
  const rows = ranked.map((r, i) => `${i + 1}. [${r.id}] ${r.pinned ? "★ " : ""}${r.title} · ${r.size} · ${r.zone} · ${r.urgency} (${r.score}) · ${r.status === "BUILDING" ? "BUILDING" + (r.who ? " (" + r.who + ")" : "") : "TODO"} · ${ago(r.approvedAt, now)}\n   why: ${r.why || "—"} · where: ${r.where.slice(0, 120)}`);
  // JEV-LOAD L7: same-thing approvals, still open, waiting on the creator's merge-or-keep (never merged here)
  const open = new Set(ranked.map((r) => r.id)), groups = (BQ.overlaps ?? []).filter((g) => g.ids.filter((id) => open.has(id)).length > 1);
  const over = groups.length ? `\n## Overlaps · ${groups.length} groups waiting on your merge or keep (CREATOR-VOTE.md)\n` + groups.map((g) => `- ${g.ids.join(" + ")}: ${g.what}`).join("\n") + "\n" : "";
  return head + "\n" + rows.join("\n") + "\n" + over;
}

// ---- DEDUPE-v2 D5 (docs/board/proposals/DEDUPE-v2.md): ONE merge-or-keep card per true-duplicate group. Pure: text in, rows/text out.
// Groups come from IDEA-INDEX.md '## Groups' ('<key>: D64, D66'); pairs under '## Not duplicates' ('NOT-DUPE D64 D66') never become a card.
// A card id is "M" + the group's first id (MD56); YES on the rune board = MERGE (a line under '## Merged' here, the merged-away rows read
// MERGED→<keep> so no lane builds them twice), NO = KEEP (NOT-DUPE lines into KEEP_FILE for idea-index.js to carry into IDEA-INDEX.md).
export const KEEP_FILE = "docs/board/inbox/SAVI.md";
export const MERGED_HEAD = "## Merged · the creator's MERGE seals (rune board): the first id is the one build";
const IDRE = /\b[DS]\d+\b/g;
const idsIn = (s) => [...new Set(String(s ?? "").match(IDRE) ?? [])];
function sectionLines(text, name) {
  const part = String(text ?? "").split(/\n(?=## )/).map((p) => p.replace(/^\n+/, "")).find((p) => p.startsWith("## " + name));
  return part ? part.split("\n").slice(1) : [];
}
// '## Groups' → [{ ids, key }] (a leading "- " is allowed; a line with < 2 ids is not a group)
export function parseGroups(indexText) {
  const out = [];
  for (const l of sectionLines(indexText, "Groups")) {
    const m = /^\s*(?:-\s*)?([a-z0-9][a-z0-9-]*@[a-z0-9][a-z0-9-]*)\s*:\s*(.+)$/i.exec(l); if (!m) continue;
    const ids = idsIn(m[2]); if (ids.length >= 2) out.push({ ids, key: m[1].toLowerCase() });
  }
  return out;
}
// the NOT-DUPE memory is idea-index.js's (notDupes / isNotDupe); this core only reads it
export { notDupes as notDupePairs };
// the queue's merges: [{ keep, gone: [ids], key }] from '## Merged' lines '- D56 ⇐ D36, D12 · key · when'
export function mergesOf(queueText) {
  return sectionLines(queueText, "Merged").map((l) => /^- ([DS]\d+) ⇐ ([^·]+?)(?: · ([^·]*?))?(?: · (.*?))?\s*$/.exec(l)).filter(Boolean)
    .map((m) => ({ keep: m[1], gone: idsIn(m[2]).filter((x) => x !== m[1]), key: (m[3] ?? "").trim().replace(/^-$/, ""), ...(m[4] ? { at: m[4].trim() } : {}) }));
}
// groups still open: ids TODO in the queue (not merged away), 2+ of them, and not every pair a NOT-DUPE
export function openGroups({ groups, queueText, notDupe = new Set() }) {
  const todo = new Set([...String(queueText ?? "").matchAll(/^\d+\. \[([DS]\d+)\] .* · TODO · /gm)].map((m) => m[1]));
  const out = [], used = new Set();
  for (const g of groups ?? []) {
    const live = g.ids.filter((id) => todo.has(id) && !used.has(id)); if (live.length < 2) continue;
    let dupe = false; for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (!isNotDupe(notDupe, live[i], live[j])) dupe = true;
    if (!dupe) continue;
    live.forEach((id) => used.add(id)); out.push({ ...g, ids: live });
  }
  return out;
}
const hash16 = (t) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(16).padStart(8, "0"); };
const one = (v, n) => String(v ?? "").replace(/\s+/g, " ").replace(/#/g, "").trim().slice(0, n);
export const isMergeId = (id) => /^M[DS]\d+$/.test(String(id ?? ""));
// one card (+ its CREATOR-VOTE.md row) per open group; the card's fields are the bell's voteCards shape (data/vote-board.js)
export function groupCards(groups) {
  return (groups ?? []).map((g) => {
    const id = "M" + g.ids[0], title = one(`${g.ids.join(" + ")} same? YES merge · NO keep`, 70), crit = one([g.key, g.what].filter(Boolean).join(" · "), 160);
    const card = { id, file: BQ.file, title, hash: hash16(id + "|" + g.ids.join(",") + "|" + (g.key ?? "")), why: "critical", critWhy: crit, votes: { savi: null, claude: null } };
    const row = `- ${id} · ${title} · ${BQ.file}\n  critical: yes (${g.ids.join(" and ")} build the same thing${g.key ? " (" + g.key + ")" : ""}: MERGE into one build, or KEEP apart)\n  votes: creator: YES = merge | NO = keep (approved ideas stay on their boards either way)`;
    return { card, row, group: { ids: g.ids, key: g.key ?? "" } };
  });
}
// a sealed card back to its group: ids from the title (groupCards wrote them), key = critWhy's first "a@b" word
export function groupOf(card) {
  const ids = idsIn(String(card?.title ?? "").split(" same?")[0]);
  return ids.length >= 2 ? { ids, key: /[a-z0-9-]+@[a-z0-9-]+/.exec(card?.critWhy ?? "")?.[0] ?? "" } : null;
}
// the queue with every merge applied: merged-away rows read MERGED→<keep>, overlap/same-thing lines that are settled go, '## Merged' last.
// board-jev's rebuild calls withMerged(fresh, current) so a rebuild never forgets a seal.
export function withMerged(text, prevText = "", add = null) {
  const all = [...mergesOf(prevText), ...mergesOf(text), ...(add ? [add] : [])], seen = new Set(), merges = [];
  for (const m of all) { const k = m.keep + ">" + m.gone.join(","); if (!seen.has(k) && m.gone.length) { seen.add(k); merges.push(m); } }
  const base = String(text ?? "").split(/\n(?=## )/).filter((p) => !p.replace(/^\n+/, "").startsWith("## Merged")).join("\n").replace(/\s*$/, "\n");
  if (!merges.length) return base;
  const into = new Map(); for (const m of merges) for (const g of m.gone) into.set(g, m.keep);
  const lines = base.split("\n").map((l) => {
    const r = /^(\d+\. \[([DS]\d+)\] .* · )TODO( · .*)$/.exec(l); if (r && into.has(r[2])) return `${r[1]}MERGED→${into.get(r[2])}${r[3]}`;
    if (/^- /.test(l)) { const ids = idsIn(l); if (ids.length >= 2 && ids.filter((x) => !into.has(x)).length < 2) return null; }
    return l;
  }).filter((l) => l !== null);
  return lines.join("\n").replace(/\s*$/, "\n") + "\n" + MERGED_HEAD + "\n" + merges.map((m) => `- ${m.keep} ⇐ ${m.gone.join(", ")} · ${m.key || "-"}${m.at ? " · " + m.at : ""}`).join("\n") + "\n";
}
// MERGE sealed: the keep is the group's id highest in the queue (else its first)
export function applyMerge(queueText, group, stamp = "", gated = false) {
  if (MERGE.on && !gated) return String(queueText ?? ""); // MERGE-GATE-v2 M5: a MERGE seal routes through merge-gate.js mergeStep (board-jev), which relabels only after a PASS
  const order = [...String(queueText ?? "").matchAll(/^\d+\. \[([DS]\d+)\]/gm)].map((m) => m[1]);
  const keep = [...group.ids].sort((a, b) => ((order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9)))[0];
  return withMerged(queueText, "", { keep, gone: group.ids.filter((x) => x !== keep), key: group.key ?? "", at: stamp });
}
// KEEP sealed: one NOT-DUPE line per pair, appended to the inbox (idea-index.js reads them into IDEA-INDEX.md '## Not duplicates')
export function keepLines(group, stamp = "") {
  const out = []; for (let i = 0; i < group.ids.length; i++) for (let j = i + 1; j < group.ids.length; j++)
    out.push(`NOT-DUPE ${group.ids[i]} ${group.ids[j]} · creator KEEP on the rune board${group.key ? " · " + group.key : ""}${stamp ? " · " + stamp : ""}`);
  return out.join("\n");
}
