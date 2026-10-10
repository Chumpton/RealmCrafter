// CHANNEL HARDENING v2: pure helpers, no ctx, no engine imports (node runs it for the dry run). Contract: scripts/lib/data/inbox.js.
// Red-teamed by docs/board/inbox/redteam.mjs. STRICT format: a lookalike (-> for →, fullwidth ＃/digits, leading space or tab,
// "#01" leading zero, lowercase label or addressee, a BOM or zero-width char before "#", "read to", an impossible stamp) is
// reported in `bad`, never silently dropped and never read as a message. A leading file BOM is stripped. Numbers: 1..15 digits.
import { INBOX } from "./data/inbox.js";
const MSG = /^#([1-9]\d{0,14}) ((\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)) → (Savi|Claude|all) ([A-Z]{2,8}):[ ]?(.*)$/s; // s: U+2028 in text stays text
const READ = /^READ TO #(0|[1-9]\d{0,14})[ \t]*$/;
const LEAD = /^[\s\uFEFF\u200B-\u200D\u2060]*/; // what a lookalike may hide behind
const LOOKS = /^(?:[#＃﹟][0-9０-９]|read\s*to\b)/i; // after LEAD: a line that tries to be a message or a read mark
const TOS = ["Savi", "Claude", "all"];
const PENDING_MAX = 200; // held asks kept in state; older ones stay in the file and the digest
const stampOk = (y, mo, d, h, mi) => +mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31 && +h <= 23 && +mi <= 59 && +y >= 2000;
// parseInbox(text, cfg) → { msgs, readTo, gaps, dupes, bad, maxN }
// msgs: [{ n, stamp, to, label, text }] in file order; continuation lines ("  ...") join the message above (an indented
// "#3 2026-…" or "READ TO #3" there is text). gaps: numbers missing between the lowest and highest n (first 50);
// dupes: numbers seen twice (the first one wins); bad: message- or read-mark-shaped lines that don't parse (first 200 chars).
export function parseInbox(text, cfg) {
  const labels = new Set(cfg?.labels ?? []), msgs = [], seen = new Set(), dupes = [], bad = []; let readTo = null, cur = null;
  for (const l of String(text ?? "").replace(/^\uFEFF/, "").split(/\r\n|\r|\n/)) {
    const m = MSG.exec(l);
    if (m) {
      const n = +m[1];
      if ((labels.size && !labels.has(m[9])) || !stampOk(m[3], m[4], m[5], m[6], m[7])) { bad.push(l.slice(0, 200)); cur = null; continue; }
      if (seen.has(n)) { dupes.push(n); cur = null; continue; }
      seen.add(n); cur = { n, stamp: m[2], to: m[8], label: m[9], text: m[10] }; msgs.push(cur); continue;
    }
    const r = READ.exec(l); if (r) { readTo = +r[1]; cur = null; continue; }
    if (cur && l.startsWith("  ")) { cur.text += "\n" + l.slice(2); continue; } // any two-space line continues (formatMessage indents blank and indented lines too)
    if (LOOKS.test(l.replace(LEAD, ""))) { bad.push(l.slice(0, 200)); cur = null; continue; }
    cur = null; // a header, a comment or a blank line ends a message
  }
  let maxN = 0; for (const x of msgs) if (x.n > maxN) maxN = x.n; // no spread: 50k+ messages would overflow Math.max(...)
  const ns = [...seen].sort((a, b) => a - b), gaps = []; // walk neighbours, never the whole range (#1 then #999999999999999)
  for (let i = 1; i < ns.length && gaps.length < 50; i++) for (let k = ns[i - 1] + 1; k < ns[i] && gaps.length < 50; k++) gaps.push(k);
  return { msgs, readTo, gaps, dupes, bad, maxN };
}
// the next number a writer uses: one past the highest in the file and its archives (pass archive maxes in `floor`)
export function nextNumber(text, floor = 0) { const f = Number(floor); return Math.max(parseInbox(text).maxN, Number.isFinite(f) ? f : 0) + 1; }
// formatMessage throws on a line parseInbox would reject, so a writer can never append a bad line by mistake
export function formatMessage(n, stamp, to, label, text) {
  const sm = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/.exec(String(stamp));
  if (!Number.isSafeInteger(n) || n < 1 || n > 999999999999999) throw new Error(`formatMessage: bad number ${n}`);
  if (!sm || !stampOk(...sm.slice(1))) throw new Error(`formatMessage: bad stamp ${stamp}`);
  if (!TOS.includes(to)) throw new Error(`formatMessage: bad addressee ${to}`);
  if (!/^[A-Z]{2,8}$/.test(String(label))) throw new Error(`formatMessage: bad label ${label}`);
  const [first, ...rest] = String(text).replace(/\r/g, "").split("\n");
  return [`#${n} ${stamp} → ${to} ${label}: ${first}`, ...rest.map((l) => "  " + l)].join("\n");
}
export function dayKey(now) { return now > 1.6e12 ? new Date(now).toISOString().slice(0, 10) : "t" + Math.floor(now / 864e5); }
// planWake(msgs, st, now, cfg) → { wake, reason, fresh, asks, next }
// st = { seen, lastWakeAt, day, wakes, pending }: seen = highest n already handled; pending = asks held back by the gap/cap.
// First call (st.seen == null): everything already in the file counts as seen, nothing wakes. A corrupt st field
// (NaN, string, negative) is repaired: a bad seen reads as a first read (backlog seen, no wake), bad wakes = 0,
// bad lastWakeAt = null (never woken), pending keeps only whole positive numbers, deduped, newest PENDING_MAX.
// RESET: top < seen with messages in the file = the file was reset or renumbered (a rotation error, C2 broken): seen = top,
// pending cleared, nothing wakes (never on old numbers), reason "reset" so the bell can flag it. An EMPTY file keeps seen
// (a failed read must not reset the bookmark and re-wake the whole file on the next good read).
// CLOCK BACK: now < lastWakeAt → lastWakeAt = now, so the next wake waits one gap instead of until the old clock returns.
// A non-finite now: no wake, reason "bad clock", state repaired only. cfg.minGapMs / dailyCap missing or NaN → INBOX's;
// 0 means 0 (no gap / no wakes). wake === false: asks are counted and digested, never held (pending cleared).
export function planWake(msgs, st, now, cfg) {
  const int = (v) => (Number.isSafeInteger(v) && v >= 0 ? v : null);
  const pend = [...new Set((Array.isArray(st?.pending) ? st.pending : []).filter((v) => Number.isSafeInteger(v) && v > 0))];
  const seen0 = int(st?.seen), corrupt = st?.seen != null && seen0 == null;
  const next = { seen: seen0, lastWakeAt: Number.isFinite(st?.lastWakeAt) ? st.lastWakeAt : null, // null = never woken (JSON-safe; no Infinity/NaN in next)
    day: typeof st?.day === "string" ? st.day : dayKey(now), wakes: int(st?.wakes) ?? 0, pending: pend.slice(-PENDING_MAX) };
  const gap = Number.isFinite(cfg?.minGapMs) ? Math.max(0, cfg.minGapMs) : INBOX.minGapMs;
  const cap = Number.isFinite(cfg?.dailyCap) ? Math.max(0, cfg.dailyCap) : INBOX.dailyCap;
  const list = (Array.isArray(msgs) ? msgs : []).filter((x) => Number.isSafeInteger(x?.n) && x.n > 0);
  const top = list.reduce((a, x) => Math.max(a, x.n), 0), none = { fresh: [], asks: [] };
  if (!Number.isFinite(now)) return { wake: false, reason: "bad clock", ...none, next };
  if (next.seen == null) { next.seen = top; next.pending = []; return { wake: false, reason: corrupt ? "bad state: backlog counts as seen" : "first read: backlog counts as seen", ...none, next }; }
  if (list.length && top < next.seen) { next.seen = top; next.pending = []; return { wake: false, reason: "reset", ...none, next }; }
  const fresh = list.filter((x) => x.n > next.seen);
  const asks = fresh.filter((x) => (cfg?.wakeLabels ?? []).includes(x.label) && (x.to === "Savi" || x.to === "all")).map((x) => x.n);
  next.seen = Math.max(next.seen, top); next.pending = [...new Set([...next.pending, ...asks])].slice(-PENDING_MAX);
  if (next.day !== dayKey(now)) { next.day = dayKey(now); next.wakes = 0; }
  const back = next.lastWakeAt != null && now < next.lastWakeAt; if (back) next.lastWakeAt = now;
  if (!next.pending.length) return { wake: false, reason: fresh.length ? "no ASK/NEED to Savi" : "nothing new", fresh, asks, next };
  if (cfg?.wake === false) { next.pending = []; return { wake: false, reason: "wakes off", fresh, asks, next }; }
  if (next.lastWakeAt != null && now - next.lastWakeAt < gap) return { wake: false, reason: back ? "held: 2-min gap (clock went back)" : "held: 2-min gap", fresh, asks, next };
  if (next.wakes >= cap) return { wake: false, reason: "held: daily cap", fresh, asks, next };
  const woke = next.pending; next.pending = []; next.lastWakeAt = now; next.wakes++;
  return { wake: true, reason: "ask", fresh, asks: woke, next };
}
// filterDigest(items, valid) → { kept, dropped }: items [{ text, cites: [n] }]; kept only if it cites ≥1 number and every cite exists.
// A digest line that names "#N" (or "＃N") in its text must also list N in cites. Strict: one non-integer cite drops the line.
// D3: a line restating "STATUS J9: APPROVED" is kept as a restatement; DIGEST.md prefixes every line "- [file #N] ", so none reads as a board line.
export function filterDigest(items, valid) {
  const V = valid instanceof Set ? valid : new Set(valid), kept = [], dropped = [];
  for (const it of Array.isArray(items) ? items : []) {
    const raw = Array.isArray(it?.cites) ? it.cites.map(Number) : [], cites = raw.filter(Number.isSafeInteger), t = String(it?.text ?? "");
    const named = [...t.matchAll(/[#＃]0*(\d{1,15})(?!\d)/g)].map((m) => +m[1]);
    const ok = cites.length > 0 && cites.length === raw.length && cites.every((n) => V.has(n)) && named.every((n) => cites.includes(n)) && t.trim();
    (ok ? kept : dropped).push({ text: t.replace(/\s+/g, " ").trim().slice(0, 400), cites });
  }
  return { kept, dropped };
}
