// WAKE QUEUE v2: one pending wake on the bell row (s.wakeQ). Sources enqueue; the bell's 10 s knock grades, arms (q.ready) and checks
// LANDED; a player's onInput (scripts/savi-wake.js) is the only sender, because the platform opens Savi's turn from a player's input.
// LANDED is plain code: SAVI.md's top number / READ TO or a Savi CLAIMS line moved since the queue opened. JEV's view is logged only.
import { WAKE as W } from "./data/wake.js";
const RANK = { batch: 0, soon: 1, now: 2 }, byRank = ["batch", "soon", "now"];
const one = (t, n) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, n);
// POLISH (JEV-LOAD K1 state <= 12k): a row keeps only its set fields, whole ms; the state holds the last W.logMax, the LEDGER FILE keeps the older rows
export const slimEv = (ev) => Object.fromEntries(Object.entries(ev).filter(([, v]) => v != null).map(([k, v]) => [k, k === "at" ? Math.round(v) : v]));
export function log(s, ev) { s.wakeLog = [...(s.wakeLog ?? []), slimEv(ev)].slice(-W.logMax); }

// a source's word: one queue, reasons pile up; the queue remembers Savi's mark at opening so any move of hers closes it
export function enqueue(s, kind, text, now) {
  const open = s.wakeQ && typeof s.wakeQ === "object";
  const q = open ? { ...s.wakeQ } : { id: (s.wakeSeq = (s.wakeSeq ?? 0) + 1), openedAt: now, reasons: [], tries: 0, mark: s.wakeMark ?? null };
  q.reasons = [...(q.reasons ?? []), { kind, text: one(text, 200), at: now }].slice(-W.reasonsMax);
  q.floor = byRank[Math.max(RANK[q.floor] ?? 0, RANK[W.kinds[kind] ?? "soon"])];
  q.dirty = true; q.ready = false;
  if (!open) log(s, { id: q.id, ev: "open", kind, at: now });
  s.wakeQ = q;
}

const rawBrief = (q) => q.reasons.map((r) => `[${r.kind}] ${one(r.text, 160)}`).join(" | ").slice(0, 600);
export const msgOf = (q) => `WAKE #${q.id} (${q.grade}, try ${(q.tries ?? 0) + 1}/${W.maxTries}): ${q.raw ? rawBrief(q) : q.brief} · Then read docs/board/inbox/CLAUDE.md + PRESENCE.md, answer in SAVI.md, move READ TO.`;

// the knock: mark = Savi's live sign ("top/readTo/claims"); askJev(q) starts one JEV call and returns true
export function tick(s, now, mark, askJev) {
  s.wakeMark = mark;
  const q0 = s.wakeQ; if (!q0) return;
  const q = { ...q0 };
  if (q.mark == null) q.mark = mark;
  if (q.mark !== mark) { // Savi moved: the wake did its job (or wasn't needed)
    log(s, { id: q.id, ev: q.sentAt != null ? "landed" : "handled", tries: q.tries ?? 0, path: q.path ?? null, delayS: q.sentAt != null ? Math.round((now - q.sentAt) / 1000) : null, at: now, jev: q.jev ?? null });
    s.wakeQ = null; return;
  }
  if (q.sentAt != null && q.lastLoggedSend !== q.sentAt) { q.lastLoggedSend = q.sentAt; log(s, { id: q.id, ev: "sent", path: q.path ?? "input", try: q.tries, at: now }); }
  // JEV: one call per queue before its first send (brief + grade); late or failed -> the code's grade and the raw list
  if (q.dirty && q.sentAt == null && !(q.jevAt != null && now - q.jevAt < W.jevTimeoutMs)) {
    if (q.jevAt != null && q.jev !== "ok") { q.jev = "fallback"; q.grade = q.floor; q.brief = null; q.raw = true; q.dirty = false; }
    else if (askJev(q)) { q.jevAt = now; q.jev = "asking"; q.jevN = q.reasons.length; }
    else { q.jev = "fallback"; q.grade = q.floor; q.brief = null; q.raw = true; q.dirty = false; }
  }
  if (q.dirty && q.sentAt != null) { q.brief = null; q.raw = true; q.grade = byRank[Math.max(RANK[q.grade] ?? 0, RANK[q.floor])]; q.dirty = false; } // reasons after a send ride raw
  const briefed = (!!q.brief || !!q.raw) && !q.dirty;
  const grade = q.grade ?? q.floor;
  const held = now - q.openedAt < (W.holdMs[grade] ?? W.holdMs.soon);
  const due = q.sentAt == null || now - q.sentAt >= W.landMs;
  if (due && (q.tries ?? 0) >= W.maxTries) {
    if (!q.escalate) { q.escalate = true; log(s, { id: q.id, ev: "escalated", tries: q.tries, at: now }); }
    q.banner = `Savi missed ${q.tries} wakes · ${one(q.top ?? q.reasons[0]?.text, 90)} · press F8`;
    q.ready = false;
  } else q.ready = briefed && !held && due;
  delete q.msg; // POLISH: the sender builds it with msgOf(q) at send time (was ~1 k chars of state repeating brief)
  if (JSON.stringify(q) !== JSON.stringify(q0)) s.wakeQ = q;
}

// JEV's answer: grade may only raise the floor; brief is the ordered note
export function onBrief(s, r, p) {
  const q = s.wakeQ; if (!q || q.id !== p.id) return;
  const d = r?.ok ? r.data : null;
  const n = { ...q };
  if (d && typeof d.brief === "string" && d.brief.trim()) {
    n.grade = byRank[Math.max(RANK[d.grade] ?? 0, RANK[q.floor])]; n.brief = one(d.brief, 600); n.raw = false; n.top = one(d.top, 120) || null; n.jev = "ok";
  } else { n.grade = q.floor; n.brief = null; n.raw = true; n.jev = "fallback"; }
  n.dirty = q.reasons.length !== p.n; // more reasons came while JEV thought: they ride raw after the send, or ask again before it
  if (n.dirty && n.sentAt == null && n.raw) n.dirty = false; // raw already carries every reason
  if (n.dirty && n.sentAt == null && !n.raw) { n.dirty = false; n.brief = n.brief + " | also: " + q.reasons.slice(p.n).map((x) => `[${x.kind}] ${one(x.text, 120)}`).join(" | "); }
  s.wakeQ = n;
}

export function ledger(s, fmt, prev) {
  const q = s.wakeQ;
  const head = `# WAKE LEDGER · written ONLY by the bell (scripts/lib/wake-core.js) · newest first\n<!-- one queue; sent = a player's input carried it (input) or the creator pressed K (K); landed = Savi's READ TO / SAVI.md / CLAIMS moved after; handled = she moved before it was sent -->\n`;
  const now = q ? `## pending: #${q.id} · ${q.grade ?? q.floor}${q.ready ? " · ARMED (next input sends)" : ""}${q.escalate ? " · ESCALATED" : ""} · tries ${q.tries ?? 0}/${W.maxTries} · jev ${q.jev ?? "-"}\n${q.reasons.map((r) => `- [${r.kind}] ${one(r.text, 200)}`).join("\n")}\n` : "## pending: none\n";
  const rows = [...(s.wakeLog ?? [])].reverse().map((e) => `- ${fmt(e.at)} · #${e.id} · ${e.ev}${e.path ? " · " + e.path : ""}${e.try != null ? " · try " + e.try : ""}${e.tries != null ? " · tries " + e.tries : ""}${e.delayS != null ? " · " + e.delayS + " s after send" : ""}${e.jev ? " · jev " + e.jev : ""}${e.kind ? " · " + e.kind : ""}`);
  // POLISH: older rows live in the file: keep every file row the state no longer holds (multiset, so a repeated row stays twice)
  const cnt = new Map(); for (const r of rows) cnt.set(r, (cnt.get(r) ?? 0) + 1);
  const old = [];
  for (const r of String(prev ?? "").split("## log\n")[1]?.split("\n") ?? []) { if (!r.startsWith("- ") || r === "- (empty)") continue; const c = cnt.get(r) ?? 0; if (c > 0) cnt.set(r, c - 1); else old.push(r); }
  const all = [...rows, ...old].slice(0, W.ledgerRows ?? 60);
  return head + "\n" + now + "\n## log\n" + (all.join("\n") || "- (empty)") + "\n";
}

// POLISH: a fallback brief is q.raw (built from q.reasons at send time), never a stored second copy of the reasons (state size)
