// VOTE-LEDGER parser (docs/board/proposals/VOTE-LEDGER.md, L1). Pure: no ctx except readTexts. No llm: every fact is already in the board files.
// readTexts(ctx) → texts · parseLedger(texts, { now, tab, filter, max }) → { rows, totals, disagree, issues, count, at }
// parsePriority(text) / renderPriority({ pins, unpinned, jev }) own docs/board/PRIORITY.md's format (round-trips byte for byte).
import { VL } from "./data/vote-ledger.js";

export function readTexts(ctx) {
  const out = {};
  for (const [k, path] of Object.entries(VL.files)) { let t = null; try { t = ctx.files.read(path); } catch (e) { t = null; } out[k] = typeof t === "string" ? t.replace(/\r\n/g, "\n") : ""; }
  return out;
}

const ID = /^(?:[DS]\d+|M[DS]\d+)$/;
const cut = (s) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > VL.titleMax ? s.slice(0, VL.titleMax - 1).trimEnd() + "…" : s; };
const cleanTitle = (id, t) => cut(String(t || "").replace(new RegExp("^" + id + "\\s+"), ""));
const kindOf = (id) => (/^M[DS]\d+$/.test(id) ? "merge" : "idea");
const creatorVote = (line) => { const m = /creator\s+(YES|NO|MERGE|KEEP)\b/.exec(line || ""); return m ? m[1] : null; };

// "## D20 · Title — sub · TODO · extra …" → { id, title, word, target }
function header(line) {
  const segs = line.replace(/^##\s+/, "").split(" · ");
  const id = segs[0].trim();
  if (!/^[DS]\d+$/.test(id)) return null;
  let i = 2; for (; i < segs.length; i++) if (VL.header.some((h) => h.re.test(segs[i].trim()))) break;
  const word = i < segs.length ? segs[i].trim() : null;
  return { id, title: segs.slice(1, Math.min(i, segs.length)).join(" · "), word };
}
function statusOf(word) {
  if (!word) return null;
  for (const h of VL.header) { const m = h.re.exec(word); if (m) return { status: h.status, stage: h.stage, target: h.status === "MERGED" ? m[1] : null, note: h.note || null }; }
  return null;
}
// a board file → cards { id, title, word, body }
function cards(text) {
  const out = [];
  for (const block of String(text || "").split(/\n(?=## )/)) {
    const first = block.split("\n", 1)[0];
    if (!first.startsWith("## ")) continue;
    const h = header(first); if (!h) continue;
    const votes = /^- votes:(.*)$/m.exec(block);
    out.push({ ...h, votes: votes ? votes[1] : "", critical: /^- critical:\s*yes\b/mi.test(block) });
  }
  return out;
}

export function parseLedger(texts = {}, opts = {}) {
  const now = opts.now ?? null;
  const T = (k) => String(texts[k] || "").replace(/\r\n/g, "\n");
  const rows = new Map(); // id → row
  const seen = new Map(); // id → [{ src, status, stage }]
  const issues = [];
  const disagreeIds = new Set();
  const flag = (id, why) => { if (!disagreeIds.has(id)) disagreeIds.add(id); issues.push(`${id}: ${why}`); };
  const row = (id) => {
    if (!rows.has(id)) rows.set(id, { id, title: "", kind: kindOf(id), vote: null, status: null, stage: -1, rank: null, target: null, note: null, pinned: false });
    return rows.get(id);
  };
  const see = (id, src, st) => {
    const r = row(id); const list = seen.get(id) || []; list.push({ src, ...st }); seen.set(id, list);
    if (st.stage > r.stage) { r.status = st.status; r.stage = st.stage; r.target = st.target ?? r.target; r.note = st.note ?? null; }
  };

  // 1. the four boards: header status is the truth of the card
  for (const [key, src] of [["denApproved", "DEN-APPROVED"], ["soloApproved", "SOLO-APPROVED"], ["denDropped", "DEN-DROPPED"], ["soloDropped", "SOLO-DROPPED"]]) {
    for (const c of cards(T(key))) {
      const st = statusOf(c.word);
      if (!st) { issues.push(`${c.id}: ${src} header has no status word`); continue; }
      const r = row(c.id);
      if (!r.title) r.title = cleanTitle(c.id, c.title);
      const v = creatorVote(c.votes); if (v) r.vote = v;
      if (c.critical) r.kind = "critical";
      if (st.status === "MERGED") st.note = `merged into ${st.target}`;
      see(c.id, src, st);
    }
  }

  // 2. VOTED.md: the bell's verdict line per decided card "- ID · title · YES|NO|SHELVED"
  const verdict = new Map();
  for (const m of T("voted").matchAll(/^- ([A-Z]+\d+) · (.*) · ([A-Z]+)\s*$/gm)) {
    const [, id, title, v] = m; if (!ID.test(id)) continue;
    verdict.set(id, v);
    const r = row(id); if (!r.title) r.title = cleanTitle(id, title);
    if (/^M[DS]/.test(id)) { r.vote = /^(YES|MERGE)$/.test(v) ? "MERGE" : /^(NO|KEEP)$/.test(v) ? "KEEP" : r.vote; if (r.vote === "KEEP") see(id, "VOTED", { status: "KEPT", stage: 3, note: "kept apart: you voted keep" }); continue; }
    if (v === "NO") see(id, "VOTED", { status: "DENIED", stage: 3 });
    else if (v === "SHELVED" || v === "SHELF") see(id, "VOTED", { status: "DENIED", stage: 3, note: "shelved: waits on a system (SHELF.md)" });
    else if (v === "YES" && !seen.get(id)) see(id, "VOTED", { status: "PENDING", stage: 1 });
  }

  // 3. MERGES.md: PASS blocks (## M<n> · KEEP ⇐ GONE) and GATE blocks (## GATE · MD24 FAIL); the later block wins
  for (const block of T("merges").split(/\n(?=## )/)) {
    const first = block.split("\n", 1)[0];
    let m = /^## M\d+ · ([DS]\d+) ⇐ ([DS]\d+)/.exec(first);
    if (m) {
      const [, keep, gone] = m; const mid = "M" + keep; const r = row(mid);
      r.title = cut(`${keep} ⇐ ${gone}`); r.vote = "MERGE"; r.target = keep;
      if (/^- UNMERGE\b/m.test(block)) { r.status = "KEPT"; r.stage = 5; r.note = "unmerged: both cards restored"; }
      else { r.status = "MERGED"; r.stage = 5; r.note = `${gone} folded into ${keep}`; see(gone, "MERGES", { status: "MERGED", stage: 4, target: keep, note: `merged into ${keep}` }); }
      seen.set(mid, [{ src: "MERGES", status: r.status, stage: 5 }]);
      continue;
    }
    m = /^## GATE · (M[DS]\d+) (PASS|FAIL)\b/.exec(first);
    if (m) {
      const [, mid, res] = m; const r = row(mid); r.vote = "MERGE";
      if (r.status === "MERGED" && r.stage === 5) continue; // a PASS block already decided it
      if (res === "PASS") { r.status = "MERGED"; r.stage = 4; continue; }
      const line = (/^- MERGE .*$/m.exec(block) || [""])[0];
      const pm = /point (\d) [^:]*:\s*(.*)$/.exec(line);
      const n = pm ? pm[1] : "?"; const why = pm ? pm[2].split(/:\s/)[0].trim() : "the gate failed";
      if (/offer KEEP/i.test(line)) { r.status = "KEPT"; r.note = `kept apart: ${why} (point ${n})`; }
      else { r.status = "REVOTE"; r.note = `gate stopped it: ${why} (point ${n}) · vote again`; }
      r.stage = 4; seen.set(mid, [{ src: "MERGES", status: r.status, stage: 4 }]);
    }
  }

  // 4. CREATOR-VOTE.md: what waits on him now ("- ID · title · … · file", then "  critical:" / "  votes:")
  for (const block of T("creatorVote").split(/\n(?=- )/)) {
    const m = /^- ([A-Z]+\d+) · (.*)$/m.exec(block); if (!m || !ID.test(m[1])) continue;
    const id = m[1]; const r = row(id);
    const crit = /^\s+critical:\s*yes\b(.*)$/m.exec(block);
    const v = creatorVote((/^\s+votes:(.*)$/m.exec(block) || ["", ""])[1]); if (v) r.vote = v;
    if (/^M[DS]/.test(id)) {
      const pair = /^([DS]\d+) \+ ([DS]\d+)/.exec(m[2]); const thing = crit && /same thing \(([^)]+)\)/.exec(crit[1]);
      if (!r.title || /⇐/.test(r.title) === false) r.title = cut(pair ? `${pair[1]} + ${pair[2]}${thing ? " · " + thing[1] : ""}` : m[2]);
      if (r.status == null) { r.status = "PENDING"; r.stage = 0; r.note = "waiting on your merge or keep"; }
      continue;
    }
    if (crit) r.kind = "critical";
    const segs = m[2].split(" · "); if (!r.title) r.title = cleanTitle(id, segs[0]);
    const had = seen.get(id);
    if (had && had.some((s) => s.stage >= 1)) flag(id, `still OPEN on CREATOR-VOTE.md but already ${r.status} (${had.map((s) => s.src).join(", ")})`);
    see(id, "CREATOR-VOTE", { status: "PENDING", stage: 0 });
  }

  // 5. BUILD-QUEUE.md ranks ("N. [ID] title · … · TODO · …") and its own status word, checked against the header
  const queueStatus = new Map();
  for (const m of T("queue").matchAll(/^(\d+)\. \[([A-Z]+\d+)\] (.*)$/gm)) {
    const [, n, id, rest] = m;
    const word = rest.split(" · ").map((s) => s.trim()).find((s, i) => i > 0 && statusOf(s));
    queueStatus.set(id, { n: +n, st: statusOf(word) });
  }

  // 6. disagreements between files (listed, never hidden)
  for (const [id, list] of seen) {
    const kinds = new Set(list.filter((s) => s.stage >= 1 && s.src !== "MERGES").map((s) => s.status));
    if (kinds.size > 1) flag(id, `files disagree: ${list.map((s) => `${s.src} ${s.status}`).join(" vs ")} → took ${rows.get(id).status}`);
    const boards = list.filter((s) => /APPROVED|DROPPED/.test(s.src)).map((s) => s.src);
    if (boards.length > 1) flag(id, `card on ${boards.join(" and ")}`);
  }
  for (const [id, q] of queueStatus) {
    const r = rows.get(id);
    if (!r) { flag(id, "on BUILD-QUEUE.md but on no board"); continue; }
    if (q.st && q.st.status !== r.status) flag(id, `BUILD-QUEUE says ${q.st.status}, the board says ${r.status}`);
    if (r.status === "PENDING" || r.status === "BUILDING") r.rank = q.n;
  }
  for (const r of rows.values()) if (r.kind !== "merge" && r.status === "PENDING" && r.stage >= 1 && !queueStatus.has(r.id) && T("queue")) flag(r.id, "approved TODO but missing from BUILD-QUEUE.md");

  // 7. pins
  const pins = parsePriority(T("priority")).pins;
  for (const r of rows.values()) r.pinned = pins.includes(r.id);

  const all = [...rows.values()].filter((r) => r.status);
  const ord = (s) => VL.order.indexOf(s);
  const num = (id) => +(/\d+/.exec(id) || [0])[0];
  all.sort((a, b) => (b.pinned - a.pinned) || (ord(a.status) - ord(b.status)) || ((a.rank ?? 1e9) - (b.rank ?? 1e9)) || (a.id[0] === b.id[0] ? num(a.id) - num(b.id) : a.id.localeCompare(b.id)));
  const totals = { waiting: 0, building: 0, built: 0, denied: 0, merged: 0, pinned: 0, kept: 0, revote: 0, rows: all.length };
  for (const r of all) {
    if (r.status === "PENDING") totals.waiting++; else if (r.status === "BUILDING") totals.building++; else if (r.status === "BUILT") totals.built++;
    else if (r.status === "DENIED") totals.denied++; else if (r.status === "MERGED") totals.merged++; else if (r.status === "KEPT") totals.kept++; else if (r.status === "REVOTE") totals.revote++;
    if (r.pinned) totals.pinned++;
  }
  // tab / filter before the cap, so the DENIED chip still shows every denied row
  const kinds = opts.tab ? VL.tabs[opts.tab] ?? null : null;
  const filt = opts.filter ? [].concat(opts.filter) : null;
  const shown = all.filter((r) => (!kinds || kinds.includes(r.kind)) && (!filt || filt.includes(r.status)));
  const max = opts.max ?? VL.rowsMax;
  const out = shown.slice(0, max).map(({ stage, ...r }) => r);
  return { rows: out, totals, disagree: disagreeIds.size, issues, count: shown.length, truncated: Math.max(0, shown.length - out.length), at: now };
}

// ---- docs/board/PRIORITY.md ----
export function parsePriority(text) {
  const out = { pins: [], unpinned: [], jev: null };
  let sec = "pins";
  for (const raw of String(text || "").replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("<!--") || line.startsWith("# ")) continue;
    if (/^## Unpinned\b/i.test(line)) { sec = "unpinned"; continue; }
    const j = /^## JEV suggests · (\d{4}-\d{2}-\d{2}|t\d+)(?: · (\S+))?/i.exec(line); // a calendar day or board-jev's room-day key (t<n>)
    if (j) { sec = "jev"; const r = j[2] && /^r(\d+)$/.exec(j[2]); const at = r ? Number(r[1]) : j[2] ? Date.parse(j[2]) : NaN; out.jev = { at: Number.isFinite(at) ? at : null, day: j[1], picks: [] }; continue; }
    if (line.startsWith("## ")) { sec = "other"; continue; }
    const m = /^- ([A-Z]+\d+)(?: · (.*))?$/.exec(line); if (!m) continue;
    const [, id, why] = m;
    if (sec === "pins") { if (!out.pins.includes(id)) out.pins.push(id); }
    else if (sec === "unpinned") { if (!out.unpinned.some((u) => u.id === id)) out.unpinned.push({ id, why: (why || "not pending").trim() }); }
    else if (sec === "jev" && out.jev) { if (!out.jev.picks.some((p) => p.id === id)) out.jev.picks.push({ id, why: (why || "").trim() }); }
  }
  return out;
}

const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
export function renderPriority({ pins = [], unpinned = [], jev = null } = {}) {
  const lines = [VL.priorityHead];
  const ids = [...new Set(pins.filter((id) => ID.test(id)))].slice(0, VL.pinCap);
  for (const id of ids) lines.push(`- ${id}`);
  const un = []; for (const u of unpinned || []) if (u && ID.test(u.id) && !ids.includes(u.id) && !un.some((x) => x.id === u.id)) un.push(u);
  if (un.length) { lines.push("", "## Unpinned"); for (const u of un) lines.push(`- ${u.id} · ${oneLine(u.why) || "not pending"}`); }
  if (jev && jev.day) {
    const iso = !Number.isFinite(jev.at) ? null : jev.at < 1e12 ? `r${Math.round(jev.at)}` : new Date(jev.at).toISOString(); // room-clock ms stay raw (never a 1970 date)
    lines.push("", `## JEV suggests · ${jev.day}${iso ? " · " + iso : ""}`);
    const seenJ = new Set();
    for (const p of jev.picks || []) if (p && ID.test(p.id) && !seenJ.has(p.id)) { seenJ.add(p.id); lines.push(`- ${p.id}${oneLine(p.why) ? " · " + oneLine(p.why) : ""}`); }
  }
  return lines.join("\n") + "\n";
}
