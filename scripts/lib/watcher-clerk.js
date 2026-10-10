// WATCHER · W5 JEV CLERK (docs/board/proposals/WATCHER.md J1, J2, V4, V5). Rides board-jev's update() on board-bell.
// watcherStep(ctx, s, now): scan proposals, preflight SUBMITTED plans, dispatch the two seats, time them out, merge.
// onWatchVerdict(ctx, r, p): the llm:generate callback (board-jev re-exports it). Every transition goes through nextState;
// s.watch[name] is written only when nextState returns a changed row (V5). Never writes design.md, CLAUDE.md or SAVI.md.
import { WATCH, pointsFor } from "./data/watcher.js";
import { spend, jobsLeft as planJobsLeft } from "./watcher-jobs.js"; // HEIMDALL-FIX-A G0: the one job meter
import { precheck, parseClaims, isArtOnly } from "./watcher-precheck.js";
import { onBusy, isBusy } from "./data/ai-budget.js"; // HEIMDALL H2
import { buildFeed, fedText, reviewerRequest, checkVerdict, isFastLane, isArtPlan, personaFor, breakerFor, combineSeats, crossRequest, applyCross } from "./watcher-core.js";
import { applyEdits, readStatus, setStatus, nextState, watchedDoc, logLine, parseArchive, archiveText, v2Doc } from "./watcher-merge.js";
import { qualityLine, appendQuality, parseQuality, qualitySummary, addChecklist, learnReady, calibrationDue, calibrationPlanText, listCalibration, calibrationCaught, appendCalibration, calibrationRate, plantedOf, falseFailOf, withBugs, trimLedger, archiveLedger, archivePathOf, roundCount, QUALITY_HEAD, QUALITY_COLS, CALIBRATION_HEAD, CALIBRATION_COLS } from "./watcher-quality.js";
import { isBuilt, wantsBuilt, builtPath, builtFeed, builtRequest, builtBugs, builtDoc } from "./watcher-built.js";
import { sha256 } from "./sha256.js";
import { dryRun } from "./watcher-dryrun.js";
import { lockApply, lockNext } from "./watcher-lock.js"; // HEIMDALL-CONVERGE
import { enqueue as wakeEnqueue } from "./wake-core.js";

const SEATS = ["mimir", "vor"];
const HEIM = () => WATCH.heimdall?.on === true; // WATCHERS-AAA L3: read at call time (AAA is the only gate since lane L6)
// W5/W8: the seats a plan gets. Fast lane -> ["solo"]; else mimir + vor, + saga on an art plan
export function seatsFor(planText) {
  if (HEIM()) return ["heimdall"]; // HEIMDALL: every plan, docs too; sitting 2 is added only to a would-pass
  if (isFastLane(planText)) return ["solo"];
  return isArtPlan(planText) ? [...SEATS, "saga"] : SEATS;
}
// the proposals scan: plans only. Never the template (Savi: the live gate once read it as a plan), a .watched.md, a .v2.md or a .built.md
export function isPlanPath(p) {
  if (typeof p !== "string" || !p.startsWith(WATCH.proposalsDir) || !p.endsWith(".md")) return false;
  if (p.slice(WATCH.proposalsDir.length).includes("/")) return false;
  if (p === WATCH.templateFile) return false;
  return ![WATCH.watchedSuffix, WATCH.v2Suffix ?? ".v2.md", WATCH.builtSuffix ?? ".built.md"].some((x) => p.endsWith(x));
}
const CLAIMS = "docs/board/CLAIMS.md";
export const MEMORY = ["docs/board/VOTED.md", "docs/board/DEN-APPROVED.md", "docs/board/SOLO-APPROVED.md", "docs/board/DEN-DROPPED.md", "docs/board/SOLO-DROPPED.md"]; // J2
const DUPE_CAP = 3000;
let _pollAt = -Infinity; // throttle lives on this machine, not in state (V5: no per-poll state write)
const _req = new Map();  // `${name}|${at}|${who}` -> reviewer request, for the one malformed retry (recomputed if lost)
const _built = new Map(); // W13: name -> the post-build feed the seat read (recomputed if lost)
const _cross = new Map(); // polish #3: `${name}|${at}` -> the seats' checked rows during a cross-exam (never in shared state; replayed from crossRows if lost)
const _feed = new Map(); // WATCHER-SPEED S5: `${name}|${round}|${hash}` -> feed, built once per round on this machine (no state write)
// WATCHER-SPEED S2: s.watchAsks = { [name]: { at, name, round, artOnly, fedChars, answers, tries, jobs } }, at most WATCH.maxParallel.
// s.watchAsking stays a small summary { at, name, n } for its readers (jev-busy.js V7, board-jev.js live()): live while any round is out.
// a refused seat's job goes again from watcherStep once its resend time comes (same request, same round stamp a.at)
function resendSeat(ctx, s, now, io, name, who) {
  const a = asks(s)[name]; if (!a) return;
  let req = _req.get(`${a.name}|${a.at}|${who}`);
  if (!req) {
    const text = planOf(io, a.name, a) ?? "";
    req = reviewerRequest(who, text, feedCached(a.name, text, io, a.round), a.round, s.watch?.[a.name]?.prior ?? [], { artOnly: a.artOnly, art: !!a.art, breaker: who === a.breaker, persona: personaFor(who, io), locked: Object.keys(s.watch?.[a.name]?.locked ?? {}) });
    _req.set(`${a.name}|${a.at}|${who}`, req);
  }
  if (!spend(s, st(ctx), now, 1, a.name, jlog(ctx))) return; // refused: resend and waitFrom untouched, the seat goes on a later step
  const { [who]: _done, ...rest } = a.resend ?? {};
  s.watchAsks = { ...asks(s), [a.name]: { ...a, resend: Object.keys(rest).length ? rest : undefined, waitFrom: now } };
  ctx.job("llm:generate", req, "onWatchVerdict", { at: a.at, name: a.name, who });
}
const asks = (s) => (s.watchAsks && typeof s.watchAsks === "object" ? s.watchAsks : {});
function syncAsking(s) {
  const list = Object.values(asks(s));
  s.watchAsking = list.length ? { at: Math.max(...list.map((x) => x.at)), name: list.map((x) => x.name).join(","), n: list.length } : null;
}
function migrate(s) { // one-time: a round that was out under the old single-object shape keeps going
  const old = s.watchAsking;
  if (old && typeof old === "object" && old.answers && old.name && !asks(s)[old.name]) { s.watchAsks = { ...asks(s), [old.name]: old }; syncAsking(s); }
}
function dropAsk(s, name) {
  const { [name]: gone, ...rest } = asks(s);
  s.watchAsks = Object.keys(rest).length ? rest : null;
  if (gone) for (const w of gone.seats ?? SEATS) _req.delete(`${name}|${gone.at}|${w}`);
  for (const k of [..._feed.keys()]) if (k.startsWith(name + "|")) _feed.delete(k);
  for (const k of [..._cross.keys()]) if (k.startsWith(name + "|")) _cross.delete(k);
  syncAsking(s);
}

// io over the world's own tree; one read per path per call
export function worldIo(ctx) {
  const cache = new Map(), all = ctx.world.files ?? [], set = new Set(all);
  return {
    read: (p) => { if (!cache.has(p)) cache.set(p, set.has(p) || p === WATCH.archiveFile ? ctx.files.read(p) : null); return cache.get(p); },
    write: (p, t) => { ctx.files.write(p, t); cache.set(p, t); },
    exists: (p) => set.has(p),
    list: () => all,
  };
}
const nameOf = (path) => path.slice(WATCH.proposalsDir.length).replace(/\.md$/, "");
const pathOf = (name) => `${WATCH.proposalsDir}${name}.md`;
const bodyHash = (text) => sha256(String(text ?? "").split("\n").filter((l, i) => !(i < 12 && new RegExp(WATCH.statusRe).test(l))).join("\n"));
const writerOf = (to) => (to === "Savi" ? "Claude" : to === "Claude" ? "Savi" : null);
const hourOf = (now) => Math.floor(now / 3600000);
const st = (ctx) => ctx?.place?.state; // place.state: watchPlanJobs lives here, beside watchBudget
const jobsLeft = (s, now) => planJobsLeft(s, undefined, now); // den-wide left (readers' view)
const jlog = (ctx) => (m, d) => ctx.log(m, d);
const refuse = (s, name, row) => putRow(s, name, { ...row, budgetWait: true, dispatchedAt: null }); // queued, never the wall (merge:186)
const putRow = (s, name, row) => { if (row && row !== s.watch?.[name]) s.watch = { ...(s.watch ?? {}), [name]: row }; };

// J2: the board's memory. Lines in the voted/approved/dropped boards naming this plan's NAME or title head.
export function dupeHits(name, text, io) {
  const title = (String(text).split("\n").find((l) => /^#\s/.test(l)) ?? "").replace(/^#\s+/, "");
  const head = title.split(/\s+·\s+|:|\s\(/)[0].trim();
  const needles = [...new Set([name, head].filter((n) => n && n.length >= 5))];
  const hits = [];
  for (const f of MEMORY) for (const l of (io.read(f) ?? "").split("\n"))
    if (l.trim() && needles.some((n) => l.includes(n))) hits.push(`${f}: ${l.trim().slice(0, 240)}`);
  return hits.slice(0, 12);
}
// H0 + J2 in one pure-ish call (no writes): the readOnly check runs exactly this
export function preflight(name, text, io, round) {
  // HEIMDALL-FEED-FRESH (2026-10-02): a round starts here, so its feed is built from today's files; the cache keyed by plan text alone kept a feed from older files/code alive across rounds
  for (const k of [..._feed.keys()]) if (k.startsWith(name + "|")) _feed.delete(k);
  const claims = parseClaims(io.read(CLAIMS) ?? "");
  const pc = precheck(text, io, { claims, self: pathOf(name) });
  // WATCH-DRYRUN D2-D4 (WATCHED 5/5): quote / cut / home faults bounce the round here, 0 jobs; the feed is the one the seats get
  const dr = dryRun(name, text, io, { skipEntry: true, feed: round != null ? feedCached(name, text, io, round) : undefined });
  pc.faults = [...pc.faults, ...dr.faults]; pc.ok = pc.faults.length === 0;
  return { pass: pc.ok, faults: pc.faults, fails: pc.faults.map((f) => `${f.kind}: ${f.detail}`), artOnly: isArtOnly(text), dupes: pc.ok ? dupeHits(name, text, io) : [], feed: dr.feed }; // HEIMDALL-FIX-B B6a: the feed it checked, read by the runner
}
function feedFor(name, text, io, dupes, art = false) {
  const feed = art ? buildFeed(text, io, name, { art: true }) : buildFeed(text, io, name);
  if (!dupes?.length) return feed;
  const block = `### J2 board memory (lines naming ${name})\n${dupes.join("\n")}\n\n`.slice(0, DUPE_CAP);
  const body = feed.text.slice(0, Math.max(0, WATCH.feedCapChars - block.length));
  return { text: block + body, chars: block.length + body.length, parts: [{ src: "J2 board memory", chars: block.length }, ...feed.parts] };
}

// Savi #86: closed rows leave board-bell.state (the record stays in <name>.watched.md + LOG.md). A row goes when it is WATCHED/CONTESTED
// for pruneMs, or its plan's Status has left the gate (GO, BUILT, SUPERSEDED, REVIEWED...), or its plan file is gone. Live rounds never go.
const IN_GATE = ["SUBMITTED", "PREFLIGHT", "REVIEW", "RETURNED", "WATCHED", "CONTESTED"]; // WATCHED/CONTESTED wait on the reviewer's GO: only the 10-min timer prunes them
export function prune(s, now, io, force = false) {
  if (!WATCH.pruneOn && !force) return 0; // OFF (creator: never drop rows permanently); WATCH-ARCHIVE replaces the drop with a move
  const w = s.watch ?? {}, keep = {}, moved = {};
  let dropped = 0;
  for (const [name, row] of Object.entries(w)) {
    const live = ["SUBMITTED", "PREFLIGHT", "REVIEW"].includes(row?.state) || asks(s)[name];
    const text = live ? null : io.read(pathOf(name));
    const fileState = text == null ? null : readStatus(text)?.state ?? null;
    const gone = !live && (text == null || (fileState && !IN_GATE.includes(fileState)) || (["WATCHED", "CONTESTED"].includes(row?.state) && now - (row.at ?? now) > (WATCH.pruneMs ?? 600000)));
    if (gone) { dropped++; moved[name] = row; } else keep[name] = row;
  }
  if (dropped) {
    // WATCH-ARCHIVE A2: the rows move whole to the archive file FIRST; only a written archive lets them leave state (never a drop)
    if (!io.write) return 0;
    io.write(WATCH.archiveFile, archiveText(io.read(WATCH.archiveFile) ?? "", moved));
    s.watch = keep;
  }
  return dropped;
}
// WATCHER-KIN K7 (+ Claude K-e, Savi S-a): the lectern tallies read place.state.watchBudget; one shared pool, a seat is busy while a round
// of its is out. Written only when the value changes: a job starting or ending, and the hour rolling over (the pips refill).
export function budgetRow(s, now) {
  const h = hourOf(now), used = s.watchJobs?.hour === h ? s.watchJobs.n : 0, out = Object.values(asks(s));
  const seat = (w) => { const a = out.find((x) => (x.seats ?? SEATS).includes(w) || (x.seats ?? []).includes("solo")); return { busy: !!a, plan: a?.name ?? null }; };
  return { hour: h, used, cap: WATCH.jobsPerHour, seats: { ...(HEIM() ? { heimdall: seat("heimdall") } : {}), mimir: seat("mimir"), vor: seat("vor"), ...(WATCH.reviewers.saga ? { saga: seat("saga") } : {}) }, refillAt: (h + 1) * 3600000, capMs: WATCH.timeoutMs, maxMs: Math.max(0, ...(s.watchMs ?? []).map((x) => x.ms)), cut: (s.watchMs ?? []).filter((x) => !x.ok).length };
}
function writeBudget(ctx, s, now) {
  const st = ctx.place?.state; if (!st) return;
  const v = budgetRow(s, now);
  if (JSON.stringify(v) !== JSON.stringify(st.watchBudget ?? null)) st.watchBudget = v;
}
function feedCached(name, text, io, round) {
  const art = seatsFor(text).includes("saga");
  const k = `${name}|${round}|${bodyHash(text)}${art ? "|art" : ""}`;
  if (!_feed.has(k)) _feed.set(k, feedFor(name, text, io, dupeHits(name, text, io), art));
  return _feed.get(k);
}

// the text the seats read: the proposal, or a calibration plan with its Planted: line removed (W14: the key never reaches a seat)
function planOf(io, name, row) {
  if (row?.cal) { const t = io.read(row.cal); return t == null ? null : calibrationPlanText(t); }
  return io.read(pathOf(name));
}
function dispatch(ctx, s, name, row, now, io) {
  return dispatchAaa(ctx, s, name, row, now, io);
}

// aaa: row.seats per plan, the round's breaker, each seat's persona, the art feed (W5, W8, W12)
function dispatchAaa(ctx, s, name, row, now, io) {
  const text = planOf(io, name, row); if (text == null) return false;
  const seats = seatsFor(text), art = seats.includes("saga") || (seats[0] === "heimdall" && isArtPlan(text));
  const nowN = (WATCH.seatStaggerMs ?? 0) > 0 ? 1 : seats.length; // staggered seats are charged by resendSeat as each goes, never twice
  if (planJobsLeft(s, st(ctx), now, name) < seats.length || !spend(s, st(ctx), now, nowN, name, jlog(ctx))) { refuse(s, name, row); return false; }
  const artOnly = isArtOnly(text), feed = feedCached(name, text, io, row.round);
  const breaker = seats.length > 1 ? breakerFor(row.round ?? 1, seats) : null;
  putRow(s, name, { ...row, dispatchedAt: now, budgetWait: false, seats, art });
  s.watchAsks = { ...asks(s), [name]: { at: now, name, round: row.round, artOnly, fedChars: feed.chars, answers: {}, tries: {}, jobs: seats.length, seats, art, breaker, aaa: true, ...(row.cal ? { cal: row.cal } : {}) } };
  syncAsking(s);
  const gap = WATCH.seatStaggerMs ?? 0, later = {};
  seats.forEach((who, i) => {
    const req = reviewerRequest(who, text, feed, row.round, row.prior ?? [], { artOnly, art, breaker: who === breaker, persona: personaFor(who, io), locked: Object.keys(row.locked ?? {}) });
    _req.set(`${name}|${now}|${who}`, req);
    if (i > 0 && gap > 0) later[who] = now + i * gap; // LIGHT: the rest go from watcherStep's resend path, one by one (their clock waits)
    else ctx.job("llm:generate", req, "onWatchVerdict", { at: now, name, who });
  });
  if (Object.keys(later).length) s.watchAsks = { ...asks(s), [name]: { ...asks(s)[name], resend: later } };
  return true;
}

export function watcherStep(ctx, s, now) {
  if (!WATCH.on || now - _pollAt < WATCH.pollEverySec * 1000 - 500) return;
  _pollAt = now;
  migrate(s);
  const io = worldIo(ctx);
  // 1. the seats out: a seat that has not answered by timeoutMs (or the V4 wall) fails all five; each plan in review on its own clock
  for (const a of Object.values(asks(s))) {
    const row = s.watch?.[a.name];
    if (!row || row.state !== "REVIEW") { dropAsk(s, a.name); continue; }
    for (const [who, due] of Object.entries(a.resend ?? {})) if (now >= due) resendSeat(ctx, s, now, io, a.name, who);
    const live = asks(s)[a.name] ?? a;
    if (live.resend && Object.keys(live.resend).length) continue; // a seat is waiting out a refusal: its clock is not running
    if (now - Math.max(live.crossAt ?? live.at, live.waitFrom ?? 0) > WATCH.timeoutMs || now - (row.dispatchedAt ?? row.submittedAt ?? now) > WATCH.maxWallMs) finish(ctx, s, now, io, a.name, true);
  }
  // 2. submissions: a SUBMITTED plan that is new, a resubmit after RETURNED, or changed after a closed round
  const plans = io.list().filter(isPlanPath);
  let builtPick = null;
  for (const p of plans) {
    const text = io.read(p); if (text == null) continue;
    if (!builtPick && !s.watchBuilt && isBuilt(text) && wantsBuilt(text, io.exists(builtPath(nameOf(p))))) builtPick = { name: nameOf(p), text }; // W13: one per step
    if (readStatus(text)?.state !== "SUBMITTED") continue;
    const name = nameOf(p), hash = bodyHash(text);
    let old = s.watch?.[name];
    if (!old) { const arch = parseArchive(io.read(WATCH.archiveFile) ?? "")[name]; if (arch) old = { state: arch.state, hash: arch.hash ?? null, restored: true, ...(Number.isInteger(arch.round) ? { round: arch.round } : {}), ...(Number.isInteger(arch.pre) ? { pre: arch.pre } : {}), ...(arch.preOnly ? { preOnly: true } : {}), ...(Array.isArray(arch.fails) ? { fails: arch.fails.slice(0, 12) } : {}) }; } // A2 restore: state + hash + the round counters (Savi Oct 1: a state-only restore reset GOAL4-S1 round 4 to round 2)
    if (old && ["SUBMITTED", "PREFLIGHT", "REVIEW"].includes(old.state)) continue; // this round is already in the gate
    if (old && old.state !== "RETURNED" && old.hash === hash) continue;            // a closed round, same plan
    let row = nextState(old && old.state === "RETURNED" ? old : null, { type: "submit", hash }, now);
    row = { ...row, prior: old?.state === "RETURNED" ? old.fails ?? [] : [] };
    row = nextState(row, { type: "start" }, now);
    const pf = preflight(name, text, io, row.round);
    const next = nextState(row, { type: "preflight", pass: pf.pass, fails: pf.fails }, now);
    putRow(s, name, next);
    if (next.state !== "REVIEW") close(ctx, s, name, text, next, now, { faults: pf.faults, fedChars: 0, jobs: 0 });
  }
  // 3. the wall for rows waiting on the job budget, then dispatch up to WATCH.maxParallel plans (S2; 1 = the old gate)
  for (const [name, row] of Object.entries(s.watch ?? {})) {
    if (row.state !== "REVIEW" || asks(s)[name]) continue;
    const next = nextState(row, { type: "tick" }, now);
    if (next !== row) { putRow(s, name, next); if (row.cal) endCal(ctx, s, name, row, next, now, io); else close(ctx, s, name, io.read(pathOf(name)) ?? "", next, now, { fedChars: 0, jobs: 0 }); }
  }
  stepBuilt(ctx, s, now, io, builtPick); stepCal(s, now, io);
  prune(s, now, io);
  const room = Math.max(1, WATCH.maxParallel ?? 1) - Object.keys(asks(s)).length;
  if (room > 0) {
    const wait = Object.entries(s.watch ?? {}).filter(([n, r]) => r.state === "REVIEW" && !asks(s)[n]).sort((x, y) => (x[1].submittedAt ?? 0) - (y[1].submittedAt ?? 0));
    for (const [n, r] of wait.slice(0, room)) if (!dispatch(ctx, s, n, r, now, io)) break; // out of budget: the rest wait
  }
  writeBudget(ctx, s, now); // after any dispatch, so the tally shows the seats busy on this same step
}

export function onWatchVerdict(ctx, r, p) {
  const s = ctx.self.state, now = ctx.now(); migrate(s);
  if (p?.kind === "cross") return onCross(ctx, s, now, r, p);
  if (p?.kind === "built") return onBuilt(ctx, s, now, r, p);
  const a = asks(s)[p?.name];
  if (!a || a.at !== p?.at || !(a.seats ?? SEATS).includes(p?.who) || a.answers?.[p.who]) return; // a late answer
  const data = r?.ok ? (r.data?.object ?? r.data) : null; // llm:generate answers at r.data.object (as every board-jev callback reads it)
  const tries = a.tries?.[p.who] ?? 0;
  // WATCHER-LODGE r2 root cause (Savi, Oct 1): a job Spawn refused (llm_busy) is no answer at all. It was scored as a malformed
  // verdict, the one shape retry fired into the same busy wall, and the round closed 0/7 with nothing judged. A refused job now
  // waits and goes again (staggered per seat, backing off), never counting as a vote and never spending the shape retry.
  const errCode = r?.ok ? "" : String(r?.error?.code ?? r?.error?.message ?? r?.error ?? "");
  const busyN = a.busy?.[p.who] ?? 0;
  if (!r?.ok && busyN < (WATCH.busyRetries ?? 6)) {
    const ix = Math.max(0, (a.seats ?? SEATS).indexOf(p.who));
    const due = now + (WATCH.busyBackoffSec ?? 20) * 1000 * (busyN + 1) + ix * 8000;
    s.watchAsks = { ...asks(s), [a.name]: { ...a, busy: { ...a.busy, [p.who]: busyN + 1 }, resend: { ...a.resend, [p.who]: due }, waitFrom: now } };
    if (isBusy(r)) onBusy(ctx); // HEIMDALL H2: the den asks less while Spawn is busy
    ctx.log("watcher: seat job refused, resending", { name: a.name, who: p.who, error: errCode.slice(0, 40), n: busyN + 1, inS: Math.round((due - now) / 1000) });
    writeBudget(ctx, s, now);
    return;
  }
  { const ms = now - Math.max(a.at ?? now, a.waitFrom ?? 0); s.watchMs = [...(s.watchMs ?? []), { w: p.who, ms, ok: !!r?.ok }].slice(-10); } // REVIEW-CAPS: last 10 review times
  const vopts = { artOnly: a.artOnly, art: !!a.art };
  if (checkVerdict(data, "", vopts).malformed) ctx.log("watcher: malformed seat answer", { who: p.who, ok: !!r?.ok, error: r?.error?.code ?? r?.error ?? null, keys: data && typeof data === "object" ? Object.keys(data) : typeof data, points: Array.isArray(data?.points) ? data.points.map((q) => q?.id + ":" + typeof q?.pass) : null });
  const shape = checkVerdict(data, "", vopts);
  if (shape.malformed && tries < 1 && spend(s, st(ctx), now, 1, a.name, jlog(ctx))) { // one retry on malformed, told exactly what was wrong (S3)
    let req = _req.get(`${a.name}|${a.at}|${p.who}`);
    if (!req) { const io = worldIo(ctx), text = planOf(io, a.name, a) ?? ""; req = reviewerRequest(p.who, text, feedCached(a.name, text, io, a.round), a.round, s.watch?.[a.name]?.prior ?? [], { artOnly: a.artOnly, art: !!a.art, breaker: p.who === a.breaker, persona: personaFor(p.who, io), locked: Object.keys(s.watch?.[a.name]?.locked ?? {}) }); }
    const whyBad = (shape.points?.[0]?.why ?? "malformed verdict").slice(0, 120) + (r?.ok ? "" : ` (job error: ${String(r?.error?.code ?? r?.error ?? "none").slice(0, 60)})`);
    req = { ...req, message: `${req.message}\n\n=== YOUR LAST ANSWER COULD NOT BE USED: ${whyBad} ===\nAnswer again as JSON matching the schema: "points" is an ARRAY of exactly ${pointsFor({ art: !!a.art }).length} objects, one per id (${pointsFor({ art: !!a.art }).map((q) => q.id).join(", ")}), each { "id", "score" (0-4), "severity" ("blocker" or "note"), "evidence", "why" }; "edits" is an array (may be empty). Keep each text short.` };
    s.watchAsks = { ...asks(s), [a.name]: { ...a, tries: { ...a.tries, [p.who]: tries + 1 }, jobs: (a.jobs ?? 2) + 1 } };
    ctx.job("llm:generate", req, "onWatchVerdict", p);
    writeBudget(ctx, s, now);
    return;
  }
  const bad = shape.malformed;
  const diag = bad ? { ok: !!r?.ok, error: String(r?.error?.code ?? r?.error?.message ?? r?.error ?? "").slice(0, 120) || null, keys: data && typeof data === "object" ? Object.keys(data).slice(0, 8) : typeof data, len: (() => { try { return JSON.stringify(r?.data ?? null).length; } catch { return -1; } })() } : null;
  const answers = { ...a.answers, [p.who]: data ?? { malformed: true, error: r?.error?.code ?? "no answer" } };
  if (diag) s.watchDiag = { ...(s.watchDiag ?? {}), [a.name]: { ...(s.watchDiag?.[a.name] ?? {}), [p.who]: diag } }; // survives the log ring
  s.watchAsks = { ...asks(s), [a.name]: { ...a, answers } };
  if ((a.seats ?? SEATS).every((w) => answers[w])) finish(ctx, s, now, worldIo(ctx), a.name);
  writeBudget(ctx, s, now);
}

// both seats in (or timed out): check, combine, merge, write the .watched.md once, one LOG line, the Status line, the wake
function finish(ctx, s, now, io, name, force = false) {
  const a = asks(s)[name]; if (!a) return;
  return finishAaa(ctx, s, now, io, name, force);
}

// ---- WATCHERS-AAA (L3): the only path since lane L6 ----
const seatName = (w) => WATCH.reviewers[w]?.name ?? w;
function checkedOf(a, fed, feed) {
  const checked = {}, edits = [];
  for (const who of a.seats ?? SEATS) {
    const raw = a.answers?.[who] ?? null; // null = timed out: every point 0, blocker
    const c = checkVerdict(raw, fed, { artOnly: a.artOnly, art: !!a.art, feedOnly: feed.text });
    checked[who] = { points: c.points.map((q) => ({ id: q.id, pass: q.pass, score: q.score, severity: q.severity, evidence: q.evidence || (q.judged === false ? "not judged (art-only)" : ""), why: q.why, quoted: q.quoted, ...(q.judged === false ? { judged: false } : {}) })), walk: c.walk ?? "", breaker: c.breaker ?? "", toPass: c.toPass ?? "" };
    if (!c.malformed) for (const e of raw.edits ?? []) edits.push({ ...e, by: who });
  }
  if (checked.solo) { checked.mimir = checked.solo; checked.vor = checked.solo; delete checked.solo; } // fast lane: one seat speaks for both
  return { checked, edits };
}
// W9: after the blind vote, the seats that split across passAt each get ONE cross job; no split = zero jobs
function crossOut(ctx, s, now, io, a, text, feed, checked) {
  if (!WATCH.crossExam?.on || a.crossed || (a.seats ?? []).includes("solo") || (a.seats ?? []).includes("heimdall")) return false; // HEIMDALL: lowest of two sittings, no cross jobs
  const comb = combineSeats(checked, { art: !!a.art, artOnly: a.artOnly });
  if (!comb.splits.length) return false;
  const who = Object.keys(checked).filter((w) => comb.splits.some((id) => { const r = checked[w].points.find((q) => q.id === id); return r && r.judged !== false && typeof r.score === "number"; }));
  if (!who.length || !spend(s, st(ctx), now, who.length, a.name, jlog(ctx))) { ctx.log("watcher: cross-exam skipped (budget)", { name: a.name, splits: comb.splits }); return false; }
  _cross.set(`${a.name}|${a.at}`, checked);
  s.watchAsks = { ...asks(s), [a.name]: { ...a, crossed: true, crossAt: now, splits: comb.splits, crossing: who, crossAns: {}, crossRows: [], jobs: (a.jobs ?? 0) + who.length } };
  for (const w of who) ctx.job("llm:generate", crossRequest(w, text, feed, checked, comb.splits, { art: !!a.art, persona: personaFor(w, io) }), "onWatchVerdict", { kind: "cross", at: a.at, name: a.name, who: w });
  return true;
}
function onCross(ctx, s, now, r, p) {
  const a = asks(s)[p?.name];
  if (!a || a.at !== p.at || !a.crossing?.includes(p.who) || a.crossAns?.[p.who]) return; // late
  const data = r?.ok ? (r.data?.object ?? r.data) : null;
  const before = crossChecked(ctx, a), after = data ? applyCross(before, p.who, data) : before;
  const rows = (a.splits ?? []).map((id) => {
    const o = before?.[p.who]?.points.find((q) => q.id === id), n = after?.[p.who]?.points.find((q) => q.id === id);
    const ans = (Array.isArray(data?.points) ? data.points : []).find((q) => q?.id === id);
    const ask = ans && (ans.hold ?? ans.held) === false && typeof ans.score === "number" && Number.isFinite(ans.score) ? ans.score : undefined; // the flip asked for: replaying it rebuilds `after` exactly
    return o ? { seat: p.who, id, old: o.score, score: n?.score ?? o.score, hold: (n?.score ?? o.score) === o.score, why: String(ans?.why ?? (data ? "" : "no answer: held")).slice(0, 300), ...(ask != null ? { ask } : {}) } : null;
  }).filter(Boolean);
  _cross.set(`${a.name}|${a.at}`, after);
  const next = { ...a, crossAns: { ...a.crossAns, [p.who]: true }, crossRows: [...(a.crossRows ?? []), ...rows] };
  s.watchAsks = { ...asks(s), [a.name]: next };
  if (next.crossing.every((w) => next.crossAns[w])) finish(ctx, s, now, worldIo(ctx), a.name);
  writeBudget(ctx, s, now);
}
// the checked set mid cross-exam: this machine's copy, else the blind verdicts (recomputed from the answers) + the recorded flips replayed
function replayCross(blind, crossRows) {
  let c = blind;
  const bySeat = new Map();
  for (const r of crossRows ?? []) if (r?.ask != null) bySeat.set(r.seat, [...(bySeat.get(r.seat) ?? []), { id: r.id, hold: false, score: r.ask, why: r.why }]);
  for (const [w, points] of bySeat) c = applyCross(c, w, { points });
  return c;
}
function crossChecked(ctx, a, blind) {
  const k = `${a.name}|${a.at}`;
  if (_cross.has(k)) return _cross.get(k);
  if (a.checked) return a.checked; // a round sent before this change carried its copy in state
  if (!blind) { const io = worldIo(ctx), text = planOf(io, a.name, a) ?? "", feed = feedCached(a.name, text, io, a.round); blind = checkedOf(a, fedText(text, feed), feed).checked; }
  const c = replayCross(blind, a.crossRows);
  _cross.set(k, c);
  return c;
}
function finishAaa(ctx, s, now, io, name, force) {
  const a = asks(s)[name];
  const text = planOf(io, name, a) ?? "";
  const feed = feedCached(name, text, io, a.round), fed = fedText(text, feed);
  const row = s.watch?.[name];
  if (!row || row.state !== "REVIEW") { dropAsk(s, name); return; }
  // no seat judged anything (every answer a refused/failed job or nothing): a jam, not a round. Send it again, at most twice.
  const judgedAny = (a.seats ?? SEATS).some((w) => { const x = a.answers?.[w]; return x && typeof x === "object" && !x.malformed; });
  if (!judgedAny && (row.jams ?? 0) < (WATCH.maxJams ?? 4)) {
    dropAsk(s, name);
    putRow(s, name, { ...row, dispatchedAt: now, jams: (row.jams ?? 0) + 1 });
    ctx.log("watcher: round jammed (no seat answered), re-sending", { name, round: row.round, jams: (row.jams ?? 0) + 1 });
    return;
  }
  // HEIMDALL-CONFIRM-JAM (2026-10-02): a CONFIRM sitting whose job died (malformed after its retry, or no answer) is a jam, not a vote.
  // It goes again at most maxJams times; a dead job never scores the plan 0 (FIX-B r20 closed CONTESTED on one).
  if (!force && a.sitting2) { const x = a.answers?.heimdall2; const dead = !x || typeof x !== "object" || x.malformed || checkVerdict(x, "", { artOnly: a.artOnly, art: !!a.art }).malformed;
    if (dead && (row.jams ?? 0) < (WATCH.maxJams ?? 4)) { const { heimdall2: _x, ...ans } = a.answers ?? {}; const { heimdall2: _t, ...tr } = a.tries ?? {};
      s.watchAsks = { ...asks(s), [name]: { ...a, answers: ans, tries: tr, resend: { ...(a.resend ?? {}), heimdall2: now }, waitFrom: now } };
      putRow(s, name, { ...row, dispatchedAt: now, jams: (row.jams ?? 0) + 1 }); // the wall clock restarts with the resend
      ctx.log("watcher: CONFIRM sitting jammed (dead job), re-sending", { name, round: row.round, jams: (row.jams ?? 0) + 1 });
      return; } }
  const blind = checkedOf(a, fed, feed);
  if (WATCH.lockPasses !== false) blind.checked = lockApply(blind.checked, row.locked, text).checked; // HEIMDALL-CONVERGE: passed points hold while their quote stands
  // HEIMDALL: sitting 1 alone would pass -> sitting 2 (CONFIRM, fresh job, all points, the breaker); lowest per point closes it
  if (!force && (a.seats ?? []).length === 1 && a.seats[0] === "heimdall" && !a.sitting2) {
    const c1 = combineSeats(blind.checked, { art: !!a.art, artOnly: a.artOnly });
    if (c1.watched) {
      s.watchAsks = { ...asks(s), [name]: { ...a, seats: ["heimdall", "heimdall2"], sitting2: true, breaker: "heimdall2", jobs: (a.jobs ?? 1) + 1, resend: { heimdall2: now }, waitFrom: now } };
      putRow(s, name, { ...row, seats: ["heimdall", "heimdall2"] });
      ctx.log("watcher: HEIMDALL sitting 1 would pass, sitting 2 goes", { name, round: row.round, fours: c1.fours });
      return;
    }
  }
  if (!force && crossOut(ctx, s, now, io, a, text, feed, blind.checked)) return; // the round closes when the cross answers land
  const checked = a.crossed ? crossChecked(ctx, a, blind.checked) : blind.checked, crossRows = a.crossRows ?? [];
  dropAsk(s, name);
  const art = !!a.art, comb = combineSeats(checked, { art, artOnly: a.artOnly });
  const next = nextState(row, { type: "review", verdicts: checked, art }, now);
  if (row.cal) return endCal(ctx, s, name, row, next, now, io, comb);
  const merged = applyEdits(text, blind.edits, feed.text);
  putRow(s, name, { ...next, verdicts: {}, seats: a.seats, art, breaker: a.breaker ?? null, fours: comb.fours, jams: 0, locked: WATCH.lockPasses !== false ? lockNext(row.locked, checked, text, next.round) : null }); // jams count per round
  const of = next.of ?? comb.of;
  let doc = watchedDoc(name, text, merged.text, checked, merged.applied, merged.rejected, next.round, { art, cross: crossRows, breaker: a.breaker ?? undefined });
  const to = readStatus(text)?.to ?? null, docLine = doc.split("\n")[1];
  if (!docLine.startsWith(`Status: ${next.state}`)) {
    const ds = docLine.match(/^Status:\s*([A-Z]+)/)?.[1];
    doc = setStatus(doc, next.state, next.score ?? comb.score, to, of).replace(`## Verdict: ${ds} `, `## Verdict: ${next.state} `);
  }
  ctx.files.write(`${WATCH.proposalsDir}${name}${WATCH.watchedSuffix}`, doc);
  let v2 = null;
  if (next.state === "RETURNED" && merged.applied.length) { v2 = `${WATCH.proposalsDir}${name}${WATCH.v2Suffix}`; ctx.files.write(v2, v2Doc(name, merged.text, merged.applied, next.round)); } // W10
  const perSeat = Object.keys(checked).map((w) => `${seatName(w)[0]}: ${checked[w].points.map((q) => `${q.id[0]}${q.score ?? "-"}`).join("")}`).join(" · ");
  if (s.watchDiag?.[name]) { const { [name]: _d, ...rest } = s.watchDiag; s.watchDiag = Object.keys(rest).length ? rest : null; }
  close(ctx, s, name, text, { ...next, fours: comb.fours }, now, { fedChars: feed.chars, jobs: a.jobs ?? (a.seats ?? SEATS).length, applied: merged.applied.length, rejected: merged.rejected.length, comb, perSeat, breaker: a.breaker ?? null, cross: crossRows.length, v2, art });
}
// W14 calibration: a CAL-<n> plan runs as a normal round; its result goes ONLY to CALIBRATION.md (no bell, wake, status or QUALITY row)
function endCal(ctx, s, name, row, next, now, io, comb) {
  const caught = calibrationCaught(comb ? { ...comb, state: next.state } : next, row.planted ?? plantedOf(io.read(row.cal) ?? ""));
  const tr = trimLedger(appendCalibration(io.read(WATCH.calibrationFile) ?? "", name, caught, now), "plan"), t = tr.text;
  if (tr.moved.length) { const ap = archivePathOf(WATCH.calibrationFile); io.write(ap, archiveLedger(io.read(ap), CALIBRATION_HEAD, CALIBRATION_COLS, tr.moved)); }
  io.write(WATCH.calibrationFile, t);
  const { [name]: _gone, ...rest } = s.watch ?? {}; s.watch = rest;
  ctx.log("watcher: calibration", { name, caught, state: next.state, rate: calibrationRate(t) });
}
function stepCal(s, now, io) {
  if (Object.values(s.watch ?? {}).some((r) => r?.cal)) return;
  const count = roundCount(io.read(WATCH.qualityFile) ?? ""); // scored rounds ever (archived ones included; BUILT rows are not rounds)
  if (!calibrationDue(count) || s.watchCal?.at === count) return;
  const list = listCalibration(io); if (!list.length) return;
  const n = s.watchCal?.n ?? 0, c = list[n % list.length];
  s.watchCal = { at: count, n: n + 1 };
  putRow(s, c.name, { round: 1, state: "REVIEW", at: now, submittedAt: now, verdicts: {}, fails: [], prior: [], cal: c.path }); // polish: the answer key stays in the CAL file (endCal reads it), never in shared state
}
// W13 post-build: one BUILT plan per step, one job; the answer writes <NAME>.built.md and feeds CHECKLIST.md
function stepBuilt(ctx, s, now, io, pick) {
  if (s.watchBuilt && now - s.watchBuilt.at > WATCH.timeoutMs) { // polish #4: one retry, then the "no answer" doc closes it (no endless job drain)
    const b = s.watchBuilt; ctx.log("watcher: post-build timed out", b);
    if (s.watchBuiltMiss === b.name) { io.write(builtPath(b.name), builtDoc(b.name, null, now, _built.get(b.name)?.text)); _built.delete(b.name); s.watchBuiltMiss = null; if (pick?.name === b.name) pick = null; }
    else s.watchBuiltMiss = b.name;
    s.watchBuilt = null;
  }
  if (!pick || s.watchBuilt || !spend(s, st(ctx), now, 1, pick.name, jlog(ctx))) return;
  const feed = builtFeed(pick.text, io, pick.name), art = isArtPlan(pick.text);
  _built.set(pick.name, feed);
  s.watchBuilt = { name: pick.name, at: now };
  ctx.job("llm:generate", builtRequest(pick.name, pick.text, feed, { art }), "onWatchVerdict", { kind: "built", name: pick.name, at: now });
}
function onBuilt(ctx, s, now, r, p) {
  if (s.watchBuilt?.name !== p.name || s.watchBuilt?.at !== p.at) return;
  const io = worldIo(ctx), text = io.read(pathOf(p.name)) ?? "";
  const answer = r?.ok ? (r.data?.object ?? r.data) : null;
  const feed = _built.get(p.name) ?? builtFeed(text, io, p.name); _built.delete(p.name);
  io.write(builtPath(p.name), builtDoc(p.name, answer, now, feed.text));
  const bugs = builtBugs(answer);
  if (bugs.length) io.write(WATCH.checklistFile, addChecklist(io.read(WATCH.checklistFile) ?? "", bugs, p.name));
  // polish #1: the bug count lands on the plan's QUALITY row, so the graph's "bugs found after build" is the real number
  const qt = withBugs(io.read(WATCH.qualityFile) ?? "", p.name, bugs.length, now, { art: isArtPlan(text) });
  io.write(WATCH.qualityFile, qt);
  if (ctx.world?.state) ctx.world.state.watchQuality = qualitySummary(parseQuality(qt));
  s.watchBuilt = null; if (s.watchBuiltMiss === p.name) s.watchBuiltMiss = null;
  ctx.log("watcher: post-build", { name: p.name, bugs: bugs.length });
  writeBudget(ctx, s, now);
}
// a closed aaa round: Status "<n>/<N>", one LOG line (breaker, cross), the bell (+ .v2.md), the QUALITY row + world.state.watchQuality
function closeAaa(ctx, s, name, text, row, now, info) {
  const away = !!WATCH.claudeAway;
  const to = readStatus(text)?.to ?? null, writer = away ? "Savi" : writerOf(to);
  const art = info.art ?? (text ? seatsFor(text).includes("saga") : false);
  const of = row.of ?? pointsFor({ art }).length;
  const score = row.score ?? (row.state === "WATCHED" ? of : null);
  const holder = away ? "Savi" : row.state === "RETURNED" ? writer : to;
  if (text) ctx.files.write(pathOf(name), setStatus(text, row.state, score, holder, of));
  const log = ctx.files.read(WATCH.logFile) ?? "";
  const open = row.fails?.length ? ` · open: ${row.fails.map((f) => String(f).split(":")[0]).join(", ")}` : "";
  const notes = row.notes?.length ? ` · notes: ${row.notes.join(", ")}` : "";
  const stateWord = `${row.state}${score != null ? ` ${score}/${of}` : ""}${open}${notes}${info.applied != null ? ` · edits ${info.applied} applied / ${info.rejected} rejected` : ""}${row.why === "wall" ? " · V4 wall" : ""}${info.perSeat ? ` · ${info.perSeat}` : ""}`;
  ctx.files.write(WATCH.logFile, log.replace(/\n*$/, "\n") + logLine(name, row.round, stateWord, info.fedChars, info.jobs, now > 1.6e12 ? now : undefined, { breaker: info.breaker ? seatName(info.breaker) : undefined, cross: info.cross ?? undefined }) + "\n");
  const where = info.faults ? `pre-flight: ${info.faults.map((f) => f.kind).join(", ")}` : `docs/board/proposals/${name}${WATCH.watchedSuffix}`;
  const msg = `WATCHER: ${name} round ${row.round} ${row.state}${score != null ? ` ${score}/${of}` : ""} → ${holder ?? "board"} (${where}).${info.v2 ? ` The watchers' merged rewrite is ${info.v2}: review it and resubmit.` : ""}${row.state === "RETURNED" ? " Fix the open points (or add DISPUTE <point>: <quote>) and set Status: SUBMITTED again." : ""}`;
  ctx.notifyDm?.(msg, { wake: false });
  if (holder !== "Claude") wakeEnqueue(s, "task", msg, now);
  // W14 ledger: the clerk is the only writer of QUALITY.md and world.state.watchQuality
  if (info.faults) return; // polish #7: a pre-flight bounce spends no job and scores nothing: not a graphed round
  const falseFail = falseFailOf(text, row.prior ?? s.watch?.[name]?.prior ?? [], row.fails ?? [], row.round ?? 1); // polish #2: measured every round
  const tr = trimLedger(appendQuality(ctx.files.read(WATCH.qualityFile) ?? "", qualityLine(name, { ...row, score, of, fours: info.comb?.fours ?? row.fours ?? 0, notes: row.notes ?? [], cross: info.cross ?? 0, breaker: info.breaker ?? "" }, now, { art, falseFail })), "name");
  const qt = tr.text;
  if (tr.moved.length) { const ap = archivePathOf(WATCH.qualityFile); ctx.files.write(ap, archiveLedger(ctx.files.read(ap), QUALITY_HEAD, QUALITY_COLS, tr.moved)); } // polish #6
  ctx.files.write(WATCH.qualityFile, qt);
  const rows = parseQuality(qt);
  if (ctx.world?.state) ctx.world.state.watchQuality = qualitySummary(rows);
  if (!WATCH.learn && !s.watchLearnSaid && learnReady(rows)) { s.watchLearnSaid = true; ctx.log(`learn ready: ${WATCH.learnAfterClean} clean plans`, { name }); } // W14: logged only; the contract is Savi's to flip
}

// a closed round: the proposal's Status line, ONE LOG.md line, the wake to whoever holds it next
function close(ctx, s, name, text, row, now, info) {
  return closeAaa(ctx, s, name, text, row, now, info);
}
