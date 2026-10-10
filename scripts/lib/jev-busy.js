// JEV's mind (B3, D1 + D8): pure functions, no ctx. The body, the future tracker text and JEV STATUS all read these,
// so all three always agree. Lane timeouts are the askers' own, imported (never copied).
import { JEVT, DENI, SOLO, SHELF, SMART, FEAT, DECIDE, CHAT, CARDS } from "./data/board-jev.js";
import { JB } from "./data/jev-board.js";
import { JEVB } from "./data/jev-body.js";
import { WATCH } from "./data/watcher.js";

// board-bell.state flag → the timeout its asker in board-jev.js gives up on
export const LANES = {
  jevAsking: JEVT.timeoutMs, denAsking: DENI.timeoutMs, soloAsking: SOLO.timeoutMs, featAsking: FEAT.timeoutMs,
  decideAsking: DECIDE.timeoutMs, chatAsking: CHAT.timeoutMs, scribeAsking: CARDS.scribeTimeoutMs,
  shelfAsking: SHELF.timeoutMs, smartAsking: SMART.timeoutMs,
  watchAsking: WATCH.timeoutMs, // WATCHER V7: MÍMIR/VÖR jobs out → JEV reads the ledger (THINK)
};
export const LEAN_LANE = { leanAsk: JB.leanTimeoutMs }; // jev-board.state.leanAsk (READ)

// firstSeen: a Map the caller keeps (flag key → ms first seen without .at); this function prunes/sets its entries.
function fresh(key, v, ms, now, firstSeen) {
  if (!v) { firstSeen?.delete(key); return false; }
  const at = typeof v === "object" && Number.isFinite(v.at) ? v.at : null;
  if (at != null) { firstSeen?.delete(key); return now - at < ms; }
  if (!firstSeen) return false;
  if (!firstSeen.has(key)) firstSeen.set(key, now);
  return now - firstSeen.get(key) < Math.min(ms, JEVB.noAtFreshMs);
}
// → { n, lanes, think, reading }: n counts every fresh flag; think = fresh board-bell lanes; reading = leanAsk fresh
export function jevBusy(bellState, jevBoardState, now, firstSeen = null) {
  const lanes = [], b = bellState ?? {}, j = jevBoardState ?? {};
  for (const [k, ms] of Object.entries(LANES)) if (fresh(k, b[k], ms, now, firstSeen)) lanes.push(k);
  const think = lanes.length;
  for (const [k, ms] of Object.entries(LEAN_LANE)) if (fresh(k, j[k], ms, now, firstSeen)) lanes.push(k);
  return { n: lanes.length, lanes, think, reading: lanes.length > think };
}
// board-bell.state.building → the live entries (≤ buildMax, none older than buildStaleMs; no .at counts live)
export function liveBuilds(list, now) {
  return (Array.isArray(list) ? list : []).filter((e) => e && e.id && !(Number.isFinite(e.at) && now - e.at >= JEVB.buildStaleMs)).slice(0, JEVB.buildMax);
}

const rankOf = (m) => { const i = JEVB.priority.indexOf(m); return i < 0 ? JEVB.priority.length : i; };
const EVENTS = new Set(JEVB.events);
// prev: the last answer (or null). signals: { build, read, think: bool; pitch, react: truthy payload on the step it happens }.
// → { mode, since, queue: [{ mode, at, info }], lastAt, entered, info }
// Priority BUILD > REACT > PITCH > READ > THINK > IDLE; a mode holds dwellMs (PITCH pitchDwellMs) and one-shot events that
// arrive mid-dwell queue behind it. Quiet < idleAfterMs lingers as READ (he studies the board); 90 s of nothing = IDLE.
export function jevMode(prev, signals, now, T = JEVB) {
  const p = prev ?? { mode: "IDLE", since: -Infinity, queue: [], lastAt: -Infinity };
  const sig = signals ?? {};
  let queue = (p.queue ?? []).filter((q) => now - q.at < T.queueMaxAgeMs);
  const push = (mode, info) => { if (!queue.some((q) => q.mode === mode)) queue.push({ mode, at: now, info }); };
  if (sig.react) push("REACT", sig.react);
  if (sig.pitch) push("PITCH", sig.pitch);
  const active = !!(sig.build || sig.read || sig.think || queue.length);
  const lastAt = active ? now : (p.lastAt ?? -Infinity);
  const level = sig.build ? "BUILD" : sig.read ? "READ" : sig.think ? "THINK" : now - lastAt >= T.idleAfterMs ? (sig.wander ? "WANDER" : "IDLE") : "READ"; // JEV-WANDER C3: a level under IDLE, only while state.brk is live
  const hold = p.mode === "PITCH" ? T.pitchDwellMs : T.dwellMs;
  if (p.mode !== "WANDER" && now - p.since < hold) return { mode: p.mode, since: p.since, queue, lastAt, entered: false, info: p.info ?? null };
  let best = level, bestQ = null;
  for (const q of queue) if (EVENTS.has(q.mode) && rankOf(q.mode) < rankOf(best)) { best = q.mode; bestQ = q; }
  if (bestQ) return { mode: best, since: now, queue: queue.filter((q) => q !== bestQ), lastAt, entered: true, info: bestQ.info };
  if (best === p.mode) return { mode: p.mode, since: p.since, queue, lastAt, entered: false, info: p.info ?? null };
  return { mode: best, since: now, queue, lastAt, entered: true, info: null };
}

// JEV-THRONE ADDENDUM A + Claude's FIX A: the load gauge. How close JEV stands to his nearest wall (max, not a blend).
// → { pct 0..100 (= workPct under JEVB.gaugeShowsWork), wall, word: ""|"SLOWED"|"RESTING", band 0..3, crack, workPct, workBand, backlog: { unbuilt, brake, pct } }. Pure: the gauge, the brazier and JEV STATUS agree.
import { TIDE } from "./data/board-jev.js";
import { INBOX } from "./data/inbox.js";
export function jevLoad(bell, jb, now, meterRow, firstSeen = null) {
  const b = bell ?? {}, t = b.tide ?? {};
  const busy = jevBusy(b, jb, now, firstSeen), lanes = Object.keys(LANES).length + Object.keys(LEAN_LANE).length;
  const walls = {
    lanes: busy.n / lanes,
    hour: (t.hour ?? 0) / TIDE.perHour,
    day: (t.day ?? 0) / TIDE.perDay,
    backlog: Math.min(0.9, Math.max(0, ((t.brake ?? 1) - 1) / (TIDE.brake.max - 1))), // FIX A: the brake slows, never stops
    builds: liveBuilds(b.building, now).length / JEVB.buildMax,
    wakes: (b.inbox?.wakesToday ?? 0) / (INBOX.dailyCap || 30),
  };
  let wall = "lanes", r = 0;
  for (const [k, v] of Object.entries(walls)) if (v > r) { r = v; wall = k; }
  const hard = !!t.capped || (b.tidePauseUntil ?? 0) > now || busy.n >= lanes || (b.inbox?.wakesToday ?? 0) >= (INBOX.dailyCap || 30);
  if (hard) { r = 1; if (t.capped) wall = t.capped; else if ((b.tidePauseUntil ?? 0) > now) wall = "dupes"; }
  const pct = Math.round(Math.min(1, r) * 100);
  const word = hard ? "RESTING" : wall === "backlog" && pct >= 50 ? "SLOWED" : "";
  const band = hard ? 3 : pct >= 85 ? 2 : pct >= 60 ? 1 : 0;
  // WATCHER J5 (Claude's #70): workPct/workBand = the same walls minus backlog (hard still counts). The body's mood and
  // breaks read these; pct/band/word stay the gauge's (true backlog shows on the throne).
  let wr = 0; for (const [k, v] of Object.entries(walls)) if (k !== "backlog" && v > wr) wr = v;
  if (hard) wr = 1;
  const workPct = Math.round(Math.min(1, wr) * 100);
  const workBand = hard ? 3 : workPct >= 85 ? 2 : workPct >= 60 ? 1 : 0;
  // JEV-LOAD L1 (GAUGE TRUTH): the ring shows work; backlog leaves pct and shows on the throne tally. Flag false = the old gauge.
  const bpct = Math.round(walls.backlog * 100);
  const backlog = { unbuilt: Number.isFinite(t.unbuilt) ? t.unbuilt : (Number.isFinite(b.paceUnbuilt) ? b.paceUnbuilt : 0), brake: t.brake ?? 1, pct: bpct };
  let crack = false; // meter misses > 20 % over the hour: health, never folded into the %
  const m = meterRow?.now; if (m && typeof m === "object") { let a = 0, f = 0; for (const v of Object.values(m)) { a += v?.a ?? 0; f += v?.f ?? 0; } crack = a >= 5 && f / a > 0.2; }
  if (JEVB.gaugeShowsWork === false) return { pct, wall, word, band, crack, workPct, workBand, backlog };
  // SLOWED stays only when the brake is what binds (backlog out-pulls every work wall and is >= 50 %)
  let ww = "lanes", wv = 0; for (const [k, v] of Object.entries(walls)) if (k !== "backlog" && v > wv) { wv = v; ww = k; }
  const gWall = hard ? wall : ww, gWord = hard ? "RESTING" : wall === "backlog" && bpct >= 50 ? "SLOWED" : "";
  return { pct: workPct, wall: gWall, word: gWord, band: workBand, crack, workPct, workBand, backlog };
}
