// JEV-TASKS: JEV pitches task ideas; Savi + Claude vote them on the fixed 10 criteria (CHEATSHEET).
import { isOn, PAUSE_NAP_S } from './data/systems.js';
import { gate, critLine, CRIT_KINDS, cardHash, forgedCreator, isCritical, votesOf, ideaId, sealOf } from './idea-gate.js';
import { VB } from './data/vote-board.js';
// Dev room only, only while someone is in the den. Triggers: board-bell.state.jevAsk = true (set by Savi when the
// creator says "JEV ASK"), or automatically when the BACKLOG has < 3 doable {OPEN} items (max once per 2 h).
// JEV's answer is untrusted data: every field is checked mechanically; survivors go to state.jevIdeas (a dev row,
// never a git write); the next of us to check the board transcribes them as "← JEV IDEA J<n>".
import { PACE, TIDE, JEVT, DENI, SOLO, SHELF, SMART, FEAT, DECIDE, CHAT, VOTE, CARDS, LLMCAP, LEDGER, DEDUPE } from "./data/board-jev.js";
import { ledgerLines, keyMatch, promptLines, writeIndex, appendIndex, nextId, normKey, canonKey, deriveKey, keyGroups, MARKS, ideaRows, dupeCheck, groups as dupeGroups, notDupes, addNotDupes, titleRepeat } from "./idea-index.js"; // JEV-LEDGER L1 + DEDUPE-v2
import { meter } from "./jev-meter.js";
import { ELI5, ELI5_GEN } from "./data/jev-eli5.js"; // JEV-HOVER-ELI5-v2 L3
import { scaleMs, scaleCap, factor, FOCUS } from "./data/jev-master.js"; // JEV-MASTER L2: the O-menu desk
import { buildBrief, writeBrief } from "./jev-focus.js";
// eff(ctx, id, base): today's number scaled by world.state.jevMaster (75 % = today, 0 % = resting). Intervals divide, caps multiply.
const jm = (ctx) => ctx.world.state?.jevMaster ?? null;
const eff = (ctx, id, baseMs) => scaleMs(jm(ctx), id, baseMs);
const effCap = (ctx, id, base) => scaleCap(jm(ctx), id, base);
let _focus = null; // the brief's text in module memory; JEV-FOCUS.md is its home
const focusText = (ctx) => (_focus ??= rd(ctx, FOCUS.file) ?? "");
function focusStep(ctx, s, now) { // refresh on a desk change, a plan Status change, or 30 min
  const j = jm(ctx), st = (ctx.world.files ?? []).filter((f) => /^docs\/board\/proposals\/[^/]+\.md$/.test(f) && !f.endsWith(".watched.md")).map((f) => (rd(ctx, f) ?? "").split("\n", 3).find((l) => l.startsWith("Status:")) ?? "").join("|");
  const sh = strHash(st), at = j?.at ?? 0;
  if (at === s.focusAt && sh === s.focusSt && now - (s.focusLast ?? 0) < FOCUS.refreshMs) return;
  s.focusAt = at; s.focusSt = sh; s.focusLast = now;
  const t = buildBrief(ctx, j); writeBrief(ctx, t); _focus = t;
}
import { parseSmartList } from "./smart-list-parse.js"; // L6 (K5): the smart list lives in module memory, rebuilt from SMART-LIST.md
import { parseBoard, judgeIdea, evidenceSheet, sheetText, forgedStatus, statusHash, refLine, jLines } from "./vote-referee.js";
import { sha256 } from "./sha256.js";
import { INBOX } from "./data/inbox.js";
import { parseInbox, planWake, filterDigest, dayKey } from "./inbox-core.js";
import { plan as presencePlan, render as presenceRender } from "./presence-core.js";
import { PRES } from "./data/presence.js";
import { enqueue as wakeEnqueue, tick as wakeTick, onBrief as wakeOnBrief, ledger as wakeLedger } from "./wake-core.js";
import { WAKE } from "./data/wake.js";
import { parseApproved, rank as queueRank, render as queueRender, parseGroups, openGroups, groupCards, notDupePairs, withMerged, KEEP_FILE, prunePins } from "./build-queue.js";
import { parsePriority, renderPriority } from "./vote-ledger.js"; // VOTE-LEDGER L9a: the creator's ★ pins + JEV's daily top 5
import { VL } from "./data/vote-ledger.js";
import { jevLoad } from "./jev-busy.js";
import { BQ } from "./data/build-queue.js";
import { watcherStep, onWatchVerdict as watchVerdict } from "./watcher-clerk.js"; // WATCHER W5: Heimdall's gate clerk
export function onWatchVerdict(ctx, r, p) { return watchVerdict(ctx, r, p); } // the two seats' llm:generate answers
import { mergeStep, onMergeJob as mergeJob } from "./merge-gate.js"; // MERGE-GATE-v2 M5: the gate's call site
export function onMergeJob(ctx, r, p) { return mergeJob(ctx, r, p); } // the gate's two llm:generate answers
// ---- JEV-LOAD L4 (meter + cap): every board ask is metered (jev-meter.js, world.state.jevMeter.now) and at most LLMCAP.maxInFlight
// asks are out at once. Out = the *Asking flags still inside their timeout (they survive a reload) or this module's own open asks
// (lanes with no flag: shelf-needs, wake-brief), whichever is more. A capped step returns BEFORE it touches its clock/queue, so the
// next update simply tries again: nothing is dropped. askNeeds and the wake brief bypass the cap (one-shot / time-bound) but count.
const _open = new Map(); // lane -> at
function llmOut(ctx, s, now) {
  for (const [k, at] of _open) if (now - at > LLMCAP.staleMs) _open.delete(k);
  const live = (a, ms) => !!a && now - (a.at ?? 0) < ms;
  const flags = [live(s.jevAsking, JEVT.timeoutMs), live(s.denAsking, DENI.timeoutMs), live(s.soloAsking, SOLO.timeoutMs), live(s.scribeAsking, CARDS.scribeTimeoutMs),
    live(s.shelfAsking, SHELF.timeoutMs), live(s.smartAsking, SMART.timeoutMs), live(s.featAsking, FEAT.timeoutMs), live(s.decideAsking, DECIDE.timeoutMs),
    live(s.chatAsking, CHAT.timeoutMs), live(s.inbox?.digesting, INBOX.digestTimeoutMs), live(s.watchAsking, LLMCAP.staleMs), live(s.jevSugAsking, LLMCAP.staleMs),
    s.wakeQ?.jev === "asking" && now - (s.wakeQ.jevAt ?? 0) < LLMCAP.staleMs].filter(Boolean).length;
  return Math.max(flags, _open.size);
}
function llmFree(ctx, s, now) { return llmOut(ctx, s, now) < LLMCAP.maxInFlight; }
function llmAsk(ctx, lane) { meter(ctx, lane); _open.set(lane, ctx.now()); }
// ---- JEV-LOAD L5 (digest cache): a digest rebuild that asks the LLM keeps the hash of the input it last got an answer for (module
// memory + the row's own key, so a reload keeps it); the same input again = no ask. SMART and SHELF already key on smartHash/shelfHash.
// L6 STATE DIET: the SMART LIST doc is module memory, not board-bell.state; a reload rebuilds it from SMART.file (the file renderSmart wrote from it)
let _smart = null;
function smartDoc(ctx, s) { if (s.smartDoc) { _smart = s.smartDoc; delete s.smartDoc; } if (!_smart) _smart = parseSmartList(rd(ctx, SMART.file)); return _smart; }
// jevIdeas stays in state (Savi reads it to transcribe): a "new" idea keeps every field; a posted one is already on the board (its title is there), so it keeps id/status (POLISH: -450 chars)
const slimIdeas = (list) => list.slice(-20).map((x) => x.status === "new" ? x : { id: x.id, status: x.status });
const _digestH = {}; // lane -> input hash of its last answered ask
function strHash(t) { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ":" + t.length; }
function digestSame(lane, h, stateH) { return h === (stateH ?? _digestH[lane]); }
function llmDone(ctx, lane, r) { _open.delete(lane); if (!r?.ok) meter(ctx, lane, "fail", r); }
export const updateSchedule = { every: { seconds: JEVT.inboxEverySec ?? 10 } }; // FAST KNOCK (creator 2026-09-28 13:08): the inbox bell every 10 s, every other lane on its own checkEverySec clock
// one read per file per moment: design.md is ~576 KB and every lane used to read it again on the same check (speed pass 2026-09-28)
const _files = new Map(); let _filesAt = -1;
function rd(ctx, f) { const t = ctx.now(); if (t !== _filesAt) { _files.clear(); _filesAt = t; } if (!_files.has(f)) _files.set(f, ctx.files.read(f)); return _files.get(f); }
function wr(ctx, f, v) { ctx.files.write(f, v); rd(ctx, f); _files.set(f, v); _files.delete(":board+bell"); } // P2: a write drops the joined design.md + BELL-LOG view
let smartHay = null; // { at, msg }: the digest the last SMART ask sent, keyed to that ask; its answer's ids are checked against it

const norm = (t) => t.replace(/\s+/g, " ").trim();
const cut = (l) => (l.length > JEVT.lineMax ? l.slice(0, JEVT.lineMax) + "…" : l);
function section(text, head) {
  const i = text.indexOf(head); if (i < 0) return [];
  const rest = text.slice(i + head.length), j = rest.search(/\n## /);
  return (j < 0 ? rest : rest.slice(0, j)).split("\n").filter((l) => l.trim());
}
function digestOf(text) {
  const lines = text.split("\n");
  const goals = section(text, "## GOALS").filter((l) => /^- GOAL /.test(l));
  const now = section(text, "## NOW").filter((l) => /^\d+\.|^- \[B/.test(l));
  const status = new Map(); for (const l of lines) { const m = /^STATUS ([\w-]+):/.exec(l); if (m) status.set(m[1], l); }
  const reports = lines.filter((l) => /^- (←|→) /.test(l)).slice(-JEVT.reports);
  return { goals, now, status: [...status.values()], reports };
}
const openDoable = (text) => text.split("\n").filter((l) => /^- \[B[\w-]*\] \{OPEN\}/.test(l)).length;

export function update(ctx) { if (!isOn(ctx, 'jev')) { ctx.sleep?.(PAUSE_NAP_S); return; } // DEN SYSTEMS: paused unless switched on (O → Den Systems)
  if (ctx.world.mode !== "dev" || !ctx.place.players.length) return;
  const s = ctx.self.state, now = ctx.now();
  if (s.jevIdeas?.some((x) => x.status !== "new" && (x.evidence || x.title))) s.jevIdeas = slimIdeas(s.jevIdeas); if ((s.jevRounds?.length ?? 0) > 3) s.jevRounds = s.jevRounds.slice(-3); if (s.smartDoc) smartDoc(ctx, s); // L6: one-time shrink of the old rows
  if (killSwitch(ctx, s)) return; // H8: "JEV STOP" freezes every automatic step until the creator's "JEV GO" + Savi's confirm
  inboxBell(ctx, s, now); presence(ctx, s, now); watcherStep(ctx, s, now); { const mg = mergeStep(ctx, s, now); for (const [k, v] of Object.entries(mg?.patch ?? {})) { if (v == null) delete s[k]; else s[k] = v; } } wakeQueue(ctx, s, now); // IDLE WATCH + WAKE QUEUE v2 on the same knock
  // CHANNEL HARDENING v2: after the kill switch, so a STOP freezes wakes too; runs on every 10 s knock
  creatorVote(ctx); voteScribe(ctx, s, now); tide(ctx, s, now); eli5Step(ctx, s, now); // PITCH TIDE: pitches ride the 10 s knock // RUNE BOARD: cards on the fast knock (two cached reads), so a new card shows within ~10 s; the scribe keeps its own 60 s clock
  if (now - (s.fullAt ?? -Infinity) < JEVT.checkEverySec * 1000 - 500) return; // the rest keeps its 60 s rhythm (referee check counts unchanged)
  s.fullAt = now;
  referee(ctx, s, now); bellFlush(ctx, s, now); focusStep(ctx, s, now); // JEV-MASTER L2b // P2: queued BELL lines, at most one BELL-LOG save per 5 min
  sortLane(ctx, LANES.den()); sortLane(ctx, LANES.solo()); creatorVote(ctx); shelfReview(ctx, s, now); jevDecides(ctx, s, now); featureSheet(ctx, s, now); smartList(ctx, s, now); buildQueue(ctx, s, now); jevSuggest(ctx, s, now); ledgerSync(ctx); dedupeGroupsSync(ctx); chatPoints(ctx, s, now); // its own lane, its own clock
  if (s.jevAsking && now - s.jevAsking.at < JEVT.timeoutMs) return;
  const text = boardText(ctx); if (!text) return; // P2: design.md + BELL-LOG.md (STATUS J lines and reports moved there)
  const manual = !!s.jevAsk;
  const auto = openDoable(text) < JEVT.autoWhenOpenBelow && now - (s.jevLastAuto ?? 0) > JEVT.autoMinGapMs;
  if (!manual && !auto) return;
  const pending = (s.jevIdeas ?? []).filter((x) => x.status === "new").length;
  const openJ = [...text.matchAll(/^STATUS (J\d+): (PROPOSED|VOTING)/gm)].length + pending;
  if (openJ >= JEVT.maxOpen) { if (manual) { s.jevAsk = false; ctx.notifyDm(`JEV ASK skipped: ${openJ} JEV ideas are already open (max ${JEVT.maxOpen}). Vote those first.`); } return; }
  const room = Math.min(JEVT.perRound, JEVT.maxOpen - openJ);
  const d = digestOf(text);
  const approved = d.goals.map((g) => /^- GOAL (\w+) \[APPROVED/.exec(g)?.[1]).filter(Boolean);
  const cheats = section(text, "## CHEATSHEET").filter((l) => /criteri|VETO|veto/i.test(l)).slice(0, 12).map(cut);
  if (!llmFree(ctx, s, now)) return; // L4 cap: jevAsk / auto stay armed, the next update asks
  const msg = JSON.stringify({ brief: (rd(ctx, "docs/board/BRIEF.md") ?? "").slice(0, 6000), knownMistakes: (rd(ctx, "docs/board/FINDINGS.md") ?? "").slice(0, 5000), approvedGoals: approved, goals: d.goals.map(cut), now: d.now.map(cut), status: d.status.map(cut), recentReports: d.reports.map(cut), maxIdeas: room });
  const jh = strHash(msg);
  if (!manual && digestSame("jev", jh, s.jevHash)) { s.jevLastAuto = now; return; } // L5: the auto round's digest is the one JEV already answered: no ask (a creator JEV ASK always asks)
  s.jevAsk = false; if (!manual) s.jevLastAuto = now;
  s.jevAsking = { at: now, why: manual ? "JEV ASK" : "auto", approved, digestChars: msg.length, h: jh };
  llmAsk(ctx, "ideas-jev");
  ctx.job("llm:generate", {
    model: "smart",
    system: "You are JEV, the planning mind on a two-builder game team (Savi and Claude). You read the team's task board digest and propose the next most useful tasks. You never give orders; you propose. Every idea must pass these fixed rules, and an idea that fails a veto is wasted: " + cheats.join(" | ") + ". Only propose for an APPROVED goal. Quote your evidence EXACTLY, copied character for character from one digest line. Name in relatesTo every board id the idea continues, or [\"new\"]. Never propose anything already DONE, REVIEWED, DROPPED or IN PROGRESS. Files must be real paths named in the digest; a file that does not exist yet is written with (new) after it, inside a folder that exists.",
    message: msg,
    schema: { type: "object", properties: { ideas: { type: "array", maxItems: room, items: { type: "object", properties: {
      goal: { type: "string" }, title: { type: "string" }, whyNow: { type: "string" }, evidence: { type: "string" },
      files: { type: "array", items: { type: "string" } }, owner: { type: "string", enum: JEVT.owners },
      doneWhen: { type: "string" }, risk: { type: "string" }, size: { type: "string", enum: JEVT.sizes },
      relatesTo: { type: "array", items: { type: "string" }, description: 'board ids this idea continues (TASK 11, B-S4, C5, POSE-CHECK, J1 ...), or ["new"]' }, ...ledgerKeyProp() },
      required: ["goal", "title", "whyNow", "evidence", "files", "owner", "doneWhen", "risk", "size", "relatesTo", "key"] } } }, required: ["ideas"] },
  }, "onJevIdeas", { at: now });
}

export function onJevIdeas(ctx, r, p) {
  llmDone(ctx, "ideas-jev", r);
  const s = ctx.self.state;
  if (!s.jevAsking || s.jevAsking.at !== p?.at) return; // a late answer to an ask already given up on
  const asked = s.jevAsking, approved = asked.approved ?? []; s.jevAsking = null;
  const round = { at: asked.at, trigger: asked.why, digestChars: asked.digestChars, ok: !!r?.ok, returned: [], passed: [], dropped: [] };
  const logRound = () => { s.jevRounds = [...(s.jevRounds ?? []), round].slice(-3); };
  if (!r?.ok) { round.error = r?.error?.code ?? "no answer"; logRound(); ctx.notifyDm(`JEV ideas: the ask failed (${r?.error?.code ?? "no answer"}); nothing posted.`); return; }
  if (asked.h) { s.jevHash = asked.h; _digestH.jev = asked.h; } // L5: answered input
  const text = boardText(ctx) ?? "", all = ctx.world.files ?? [], files = new Set(all); // P2: + BELL-LOG.md
  const flat = norm(text + "\n" + (rd(ctx, "docs/board/BRIEF.md") ?? "") + "\n" + (rd(ctx, "docs/board/FINDINGS.md") ?? "")); // evidence may quote the board or Claude's brief (both are in the digest)
  const ledger = new Map(); for (const l of text.split("\n")) { const m = /^STATUS ([\w-]+(?: \d+)?):(.*)$/.exec(l); if (m) ledger.set(m[1], l); }
  const resolves = (f) => { // the board names files short (skald-core.js, data/x.js); a new file needs a real folder and "(new)"
    const raw = String(f), g = raw.replace(/\s*\(new\)\s*/i, "").replace(/^\.?\//, "").trim();
    if (files.has(g) || all.some((p) => p.endsWith("/" + g))) return true;
    const dir = g.includes("/") ? g.slice(0, g.lastIndexOf("/") + 1) : null;
    return /\(new\)/i.test(raw) && !!dir && all.some((p) => p.startsWith(dir) || p.includes("/" + dir));
  };
  const list = s.jevIdeas ?? [], dropped = [], taskKeys = [];
  let n = s.jevNext ?? 1;
  for (const x of (r.data?.object?.ideas ?? []).slice(0, JEVT.perRound)) {
    const why = [];
    const gid = /(?:GOAL\s*)?(\w+)/i.exec(String(x.goal).replace(/^\s*GOAL\s*/i, ""))?.[1];
    if (!approved.includes(gid)) why.push("goal not APPROVED");
    const ev = norm(String(x.evidence ?? "").replace(/…$/, ""));
    if (ev.length < 12 || !flat.includes(ev)) why.push("evidence not on the board");
    const bad = (x.files ?? []).filter((f) => !resolves(f));
    if (!x.files?.length || bad.length) why.push(`files not found: ${bad.join(", ") || "none"}`);
    if (!JEVT.owners.includes(x.owner)) why.push("owner");
    // rule 2 by machine: an idea on a closed item, or on the files of in-progress work it does not name, is a duplicate
    const rel = (x.relatesTo ?? []).map((r) => String(r).replace(/^TASK\s*/i, "TASK ").trim()).filter((r) => r && r !== "new");
    if (!x.relatesTo?.length) why.push("relates-to missing");
    for (const r of rel) { const st = ledger.get(r.replace(/^TASK /, "TASK ")) ?? ledger.get(r.replace(/^TASK /, ""));
      if (st && /\b(DONE|REVIEWED|DROPPED|CANCEL\w*|RULED OUT)\b/.test(st.split(":")[1] ?? "")) why.push(`${r} is closed`); }
    const base = (f) => String(f).replace(/\s*\(new\)\s*/i, "").split("/").pop();
    for (const [id, st] of ledger) if (/IN PROGRESS/.test(st) && !rel.includes(id)) {
      const line = text.split("\n").find((l) => l.includes(`[${id}]`) || l.includes(`${id} `) && /files|\|/.test(l)) ?? "";
      const hit = (x.files ?? []).map(base).find((b) => b && line.includes(b));
      if (hit) why.push(`${hit} is under ${id} (in progress), not named`); }
    if (!JEVT.doneWords.test(x.doneWhen ?? "")) why.push("done-when is not a check");
    if (!JEVT.sizes.includes(x.size)) why.push("size");
    let tkey = null; // JEV-LEDGER L4: a task's key is <thing>@goal-<n>; an exact repeat of an earlier J task is a duplicate
    { tkey = normKey(x.key) || deriveKey({ title: x.title, what: x.doneWhen, place: gid ? `goal-${String(gid).toLowerCase()}` : "board" });
      const hit = tkey && keyMatch(tkey, [...ledgerRows(ctx).filter((r) => /^J\d/.test(r.id)), ...taskKeys]).id; if (hit) why.push(`same thing@place as ${hit} (${tkey})`); }
    { const rep = titleRepeat(x.title, list.filter((q) => q.title).map((q) => ({ id: q.id, title: q.title }))); if (rep) why.push(`same task as ${rep} (DEDUPE)`); } // DEDUPE-v2 D4
    round.returned.push(String(x.title).slice(0, 60));
    if (why.length) { dropped.push(`${String(x.title).slice(0, 60)}: ${why.join("; ")}`); round.dropped.push({ i: round.returned.length - 1, why, ...(x.evidence ? { evidence: String(x.evidence).slice(0, 80) } : {}) }); /* POLISH: i = its title in round.returned */ continue; }
    round.passed.push(`J${n}`);
    if (tkey) taskKeys.push({ id: `J${n}`, key: tkey, mark: "open" });
    { const { key: _k, ...rest } = x; list.push({ id: `J${n++}`, status: "new", at: ctx.now(), ...rest }); } // the key lives in IDEA-INDEX.md ## Tasks, not the row
  }
  logRound();
  if (taskKeys.length) ledgerAppend(ctx, "Tasks", taskKeys.map((t) => `- ${t.id} ${t.key} ${MARKS.open}`));
  s.jevNext = n; s.jevIdeas = slimIdeas(list); s.jevDropped = dropped.slice(-10);
  const fresh = list.filter((x) => x.status === "new").map((x) => x.id);
  { const msg = `JEV ideas: ${fresh.length} passed the form check (${fresh.join(", ") || "none"}), ${dropped.length} dropped. Read board-bell.state.jevIdeas, transcribe each as "← JEV IDEA J<n>" + STATUS J<n>: PROPOSED, mark it status "posted", append the round from board-bell.state.jevRounds to docs/board/jev-report.md, then vote.`; ctx.notifyDm(msg, { wake: false }); wakeEnqueue(ctx.self.state, "task", msg, ctx.now()); }
}

// ---- DEN IDEAS lane (creator 2026-09-28): one Viking idea every 10 min, max 10 OPEN on the board, 2 of 3 votes pass ----
const DEN_HEAD = `# DEN IDEAS · board 1: JEV's pitches waiting for votes
<!-- JEV adds one idea every 10 min while someone is in the build-room den, up to 10 here. Savi and Claude write YES or NO (or SHELF)
     in place of their dash. Both YES -> DEN-APPROVED.md, both NO -> DEN-DROPPED.md. A split, or a "critical: yes" idea, waits for the
     creator's vote (listed on docs/board/CREATOR-VOTE.md); a creator YES/NO counts only as a seal from the rune vote board; typed ones are ignored (idea gate + rune board, 2026-09-28). -->
`;
const APPROVED_HEAD = `# DEN IDEAS · board 2: approved, waiting to be built
<!-- Passed by Savi + Claude (or the creator's vote on a critical/split idea). Status on the header: TODO → IN PROGRESS (who) → DONE. Built behind GOAL 1's open P1s. -->
`;
const DROPPED_HEAD = `# DEN IDEAS · dropped (voted down; JEV reads this so it never pitches them again)
`;const openDen = (t) => [...t.matchAll(/^## D\d+ .*· OPEN\s*$/gm)].length;
// IDEA PACE: the plain-code count of approved-but-unbuilt ideas (unique D/S ids whose header status isn't DONE); a pause/resume line to the board when it flips
function unbuilt(ctx) { const ids = new Set(); for (const f of [DENI.approved, SOLO.approved]) for (const m of (rd(ctx, f) ?? "").matchAll(/^## ([DS]\d+) · .*· ([A-Z][A-Z ()\w]*?)\s*$/gm)) if (!/^DONE/.test(m[2])) ids.add(m[1]); return ids.size; }
function pacePaused(ctx, s) { const n = unbuilt(ctx), paused = n > PACE.pauseAbove; if (paused !== !!s.pacePaused) { s.pacePaused = paused; boardLog(ctx, paused ? `JEV idea pitching PAUSED: ${n} approved ideas unbuilt (> ${PACE.pauseAbove}). Resumes, hourly, when it drops to ${PACE.pauseAbove}.` : `JEV idea pitching RESUMED (hourly): ${n} approved ideas unbuilt.`); } s.paceUnbuilt = n; return paused; }
// DUPE GUARD + VOTED LEDGER (creator 2026-09-29 02:42: "every task that i vote on… need to go into a file that JEV itself needs to check…
// before JEV ever creates a new task"). docs/board/VOTED.md is append-only: every D/S card that left the idea boards (approved, dropped,
// shelved) or carries a rune seal, both lanes. JEV's prompt gets its names; every landing is checked against it + the open cards in code.
const VOTED = "docs/board/VOTED.md";
const VOTED_HEAD = "# VOTED · every card already decided (JEV reads this before every pitch; a repeat is thrown away)\n<!-- Written by the bell, append-only. Line: - ID · title · verdict -->\n";
const dupeNorm = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[ðÐ]/g, "d").replace(/[þÞ]/g, "th").replace(/[æÆ]/g, "ae").replace(/[øØ]/g, "o")
  .toLowerCase().replace(/^\s*[ds]\d+\s*[·:.-]?\s*/, "").replace(/[^a-z0-9—:\s-]/g, " ").replace(/\s+/g, " ").trim();
const dupeName = (n) => n.split(/\s[—:-]\s|—|:/)[0].trim();
const dupeWords = (n) => new Set(n.split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
function dupeOf(title, known) { // known: [{ id, title }] -> the id it repeats, or null
  const n = dupeNorm(title), nm = dupeName(n), w = dupeWords(n); if (!n) return null;
  for (const k of known) {
    const kn = dupeNorm(k.title), km = dupeName(kn); if (!kn) continue;
    if (kn === n || (nm.length >= 4 && nm === km)) return k.id;
    const kw = dupeWords(kn); let both = 0; for (const x of w) if (kw.has(x)) both++;
    const u = w.size + kw.size - both; if (u && both / u >= 0.6) return k.id;
  }
  return null;
}
function votedRead(ctx) { return [...(rd(ctx, VOTED) ?? "").matchAll(/^- ([DS]\d+) · (.*?) · (\S+)\s*$/gm)].map((m) => ({ id: m[1], title: m[2], v: m[3] })); }
function votedSync(ctx, s, now) {
  const seals = sealsNow(ctx), sk = Object.keys(seals).sort().join(",");
  const skh = hashOf(sk); // POLISH: the seal set kept as its hash, not the joined ids (state size)
  if (skh === s.votedSealKey && now - (s.votedAt ?? 0) < 60e3) return; // on a new seal at once, else once a minute
  s.votedSealKey = skh; s.votedAt = now;
  const have = votedRead(ctx), ids = new Set(have.map((x) => x.id)), add = [];
  const scan = (file, tag) => { for (const m of (rd(ctx, file) ?? "").matchAll(/^## ([DS]\d+) · (.*?) · ([\w ]+?)\s*$/gm)) if (!ids.has(m[1])) { ids.add(m[1]); add.push(`- ${m[1]} · ${oneLine(m[2], 90)} · ${tag ?? m[3].trim().replace(/\s+/g, "-")}`); } };
  scan(DENI.approved, "YES"); scan(SOLO.approved, "YES"); scan(DENI.dropped, "NO"); scan(SOLO.dropped, "NO"); scan(SHELF.file, "SHELVED");
  for (const [id, x] of Object.entries(seals)) if (!ids.has(id)) { const b = blockOf(ctx, id), t = b && /^## [DS]\d+ · (.*?) · /m.exec(b)?.[1]; if (t) { ids.add(id); add.push(`- ${id} · ${oneLine(t, 90)} · ${x.vote ?? "SEALED"}`); } }
  if (!add.length) return;
  const cur = rd(ctx, VOTED) ?? VOTED_HEAD; wr(ctx, VOTED, cur.replace(/\s*$/, "\n") + add.join("\n") + "\n");
}
function dupeKnown(ctx) { // the ledger + every card still open on either board
  const open = [DENI.file, SOLO.file].flatMap((f) => [...(rd(ctx, f) ?? "").matchAll(/^## ([DS]\d+) · (.*?) · /gm)].map((m) => ({ id: m[1], title: m[2] })));
  return [...votedRead(ctx), ...open];
}
function dupeCaught(ctx, s, title, of) {
  s.tideRepeats = (s.tideRepeats ?? 0) + 1; s.dupeBanned = [...(s.dupeBanned ?? []), oneLine(title, 70)].slice(-6);
  boardLog(ctx, `DUPE GUARD: JEV pitched "${oneLine(title, 70)}", a repeat of ${of}. Thrown away before the board (VOTED.md).`);
  if (s.tideRepeats >= 3) { s.tidePauseUntil = ctx.now() + 10 * 60e3; s.tideRepeats = 0; boardLog(ctx, "DUPE GUARD: 3 repeats in a row, JEV's tide rests 10 min."); }
}

// ---- JEV-LEDGER (docs/board/proposals/JEV-LEDGER.md): every idea as <thing>@<place>; module memory only, no board-bell key ----
let _ledger = { h: null, rows: [] }; // the rows of the boards + IDEA-INDEX's Banned/Tasks, keyed by the hash of their joined text
function ledgerRows(ctx) {
  const texts = [...LEDGER.boards.map((f) => rd(ctx, f) ?? ""), rd(ctx, LEDGER.file) ?? ""], h = strHash(texts.join("\u0001"));
  if (h !== _ledger.h) _ledger = { h, rows: ledgerLines(texts) };
  return _ledger.rows;
}
let _ledgerSrc = null; // IDEA-INDEX.md ## Ledger is rewritten only when a board's text changed (hash of the seven boards)
function ledgerSync(ctx) {
  const h = strHash(LEDGER.boards.map((f) => rd(ctx, f) ?? "").join("\u0001")); if (h === _ledgerSrc) return; _ledgerSrc = h;
  const cur = rd(ctx, LEDGER.file) ?? "", next = writeIndex(cur, ledgerRows(ctx), { maxLineChars: LEDGER.maxLineChars });
  if (next !== cur) wr(ctx, LEDGER.file, next);
}
function ledgerAppend(ctx, section, lines) { const cur = rd(ctx, LEDGER.file) ?? ""; const next = appendIndex(cur, section, lines); if (next !== cur) wr(ctx, LEDGER.file, next); }
function ledgerBan(ctx, key, of) { const id = nextId(rd(ctx, LEDGER.file) ?? "", "B"); ledgerAppend(ctx, "Banned", [`- ${id} ${key} ${MARKS.banned} ${of}`]); }
// ---- DEDUPE-v2 D2-D4 (docs/board/proposals/DEDUPE-v2.md): ONE gate every idea/task writer calls. 
// The code check (idea-index dupeCheck: THING+PLACE rows, title rule) blocks a title repeat; a near miss lands with a "- maybe dupe:" line and,
// under DEDUPE.perHour (board-bell.state.dupeAsks = { n, hour }, the only new key), JEV judges it after landing: SAME -> the unvoted card is
// thrown away, EXTENDS -> "- extends <id>", DIFFERENT -> NOT-DUPE lines in IDEA-INDEX.md (never asked again). Over the cap or on a failed
// ask the card stays with its WARN line. The judge's answer is untrusted: only the ids the code named are read.
let _dd = { h: null, rows: [] }, _ddGroups = null;
function dedupeRows(ctx) {
  const texts = LEDGER.boards.map((f) => rd(ctx, f) ?? ""), h = strHash(texts.join("\u0001"));
  if (h !== _dd.h) _dd = { h, rows: ideaRows(texts, DEDUPE) };
  return _dd.rows;
}
function dedupeOpts(ctx) { return { ...DEDUPE, notDupe: notDupes([DEDUPE.indexFile ?? LEDGER.file, ...(DEDUPE.appealFiles ?? [])].map((f) => rd(ctx, f) ?? "").join("\n")) }; }
function dupeAsksNow(s, now) { const hour = Math.floor(now / 3600e3); return s.dupeAsks?.hour === hour ? s.dupeAsks : { n: 0, hour }; }
// cand { id, title, where, what }; extra: [{ id, title }] landed this round -> { of: id to throw it away as | null, line: card line or "", near: [ids] }
function dupeGate(ctx, s, cand, extra = []) {
  const of = dupeOf(cand.title, [...dupeKnown(ctx), ...extra]); if (of) return { of, line: "", near: [] };
  const c = dupeCheck(cand, [...dedupeRows(ctx), ...extra.map((e) => ({ ...e, where: e.where ?? "" }))], { ...dedupeOpts(ctx), maxNear: 3 });
  if (c.of) return { of: c.of, line: "", near: [] };
  if (!c.near.length) return { of: null, line: "", near: [] };
  const ids = c.near.map((n) => n.id), now = ctx.now(), a = dupeAsksNow(s, now), judge = a.n < (DEDUPE.perHour ?? 6) && llmFree(ctx, s, now);
  const why = c.near.map((n) => `${n.id} ${n.thing}@${n.place ?? "any"}`).join(", ");
  return { of: null, near: ids, judge, line: `- maybe dupe: ${why} (${judge ? "JEV judging" : "WARN: JEV judge over its " + (DEDUPE.perHour ?? 6) + "/h cap, landed unjudged"})\n` };
}
function dupeAsk(ctx, s, id, file, cand, ids) {
  const now = ctx.now(), a = dupeAsksNow(s, now); s.dupeAsks = { n: a.n + 1, hour: a.hour };
  const rows = dedupeRows(ctx), older = ids.map((x) => { const r = rows.find((q) => q.id === x); return { id: x, title: r?.title ?? "", where: r?.where ?? "", what: r?.what ?? "" }; });
  llmAsk(ctx, "dupe-judge:" + id);
  ctx.job("llm:generate", { model: "fast",
    system: "You are JEV, keeper of a Viking den's idea boards. A new idea just landed; plain code found older ideas that share its thing and place. For each older idea say whether the new idea is the SAME player moment (a duplicate: a player would see and do the same thing), EXTENDS it (builds on it with a real new moment), or is DIFFERENT (another moment that only shares words). Judge what the player sees and does, not the wording. One short reason each.",
    message: JSON.stringify({ newIdea: { id, title: oneLine(cand.title, 90), where: oneLine(cand.where, 200), what: oneLine(cand.what, 500) }, older }),
    schema: { type: "object", properties: { verdicts: { type: "array", maxItems: 5, items: { type: "object", properties: { id: { type: "string" }, verdict: { type: "string", enum: ["SAME", "EXTENDS", "DIFFERENT"] }, reason: { type: "string" } }, required: ["id", "verdict", "reason"] } } }, required: ["verdicts"] },
  }, "onDupeJudge", { id, file, ids, title: oneLine(cand.title, 70), at: now });
}
export function onDupeJudge(ctx, r, p) {
  llmDone(ctx, "dupe-judge:" + p?.id, r);
  if (!p?.id || !p?.file) return;
  const s = ctx.self.state, text = rd(ctx, p.file) ?? "", parts = text.split(/\n(?=## )/), i = parts.findIndex((b) => b.startsWith(`## ${p.id} · `));
  if (i < 0) return; // voted, moved or gone already: nothing to judge
  const b = parts[i], ln = /^- maybe dupe:.*\(JEV judging\)\s*$/m;
  if (!ln.test(b)) return;
  const vs = (r?.ok ? r.data?.object?.verdicts ?? [] : []).filter((v) => p.ids.includes(v.id)), one = (v) => oneLine(v.reason, 120);
  if (!vs.length) { parts[i] = b.replace(ln, (l) => l.replace("(JEV judging)", `(WARN: JEV judge ${r?.ok ? "answered nothing usable" : "failed"}, landed unjudged)`)); wr(ctx, p.file, parts.join("\n")); return; }
  const diff = vs.filter((v) => v.verdict === "DIFFERENT").map((v) => v.id), same = vs.find((v) => v.verdict === "SAME"), ext = vs.filter((v) => v.verdict === "EXTENDS");
  if (diff.length) { const f = DEDUPE.indexFile ?? LEDGER.file, cur = rd(ctx, f) ?? "", next = addNotDupes(cur, diff.map((d) => [p.id, d])); if (next !== cur) wr(ctx, f, next); }
  const unvoted = /^- votes: Savi – · Claude – · creator –\s*$/m.test(b) && /· OPEN\s*$/m.test(b.split("\n")[0]);
  if (same && unvoted) {
    parts.splice(i, 1); wr(ctx, p.file, parts.join("\n"));
    dupeCaught(ctx, s, p.title, same.id); boardLog(ctx, `DEDUPE: JEV judged ${p.id} "${p.title}" the SAME moment as ${same.id} (${one(same)}); taken off the board before any vote.`);
    return;
  }
  const line = same ? `- dupe: WARN, JEV judged it the SAME as ${same.id} (${one(same)}) after votes began` : ext.length ? `- extends ${ext.map((v) => v.id).join(", ")} (JEV: ${one(ext[0])})` : "";
  parts[i] = line ? b.replace(ln, line) : b.replace(/^- maybe dupe:.*\n?/m, ""); wr(ctx, p.file, parts.join("\n"));
}
// the card lane: IDEA-INDEX.md '## Groups' ('- <key>: <ids>', read by build-queue parseGroups) rewritten when an approved board changes
function dedupeGroupsSync(ctx) {
  const appr = [DENI.approved, SOLO.approved].map((f) => rd(ctx, f) ?? ""), f = DEDUPE.indexFile ?? LEDGER.file, cur = rd(ctx, f) ?? "";
  const o = dedupeOpts(ctx), h = strHash(appr.join("\u0001") + [...(o.notDupe ?? [])].sort().join()); if (h === _ddGroups) return; _ddGroups = h;
  const lines = dupeGroups(ideaRows(appr, DEDUPE), o).map((g) => `- ${g.key}: ${g.ids.join(", ")}`);
  const parts = cur.split(/\n(?=## )/), i = parts.findIndex((q) => q.startsWith("## Groups")), sec = `## Groups\n<!-- DEDUPE-v2: approved ideas the code check joins (THING+PLACE); the MERGE/KEEP cards read this; a NOT-DUPE line splits a pair -->\n${lines.join("\n")}\n`;
  if (i >= 0) parts[i] = sec; else parts.push(sec);
  const next = parts.join("\n").replace(/\n{3,}/g, "\n\n"); if (next !== cur) wr(ctx, f, next);
}
function pitchKey(x, title) { return canonKey(x?.key) || deriveKey({ title, what: x?.what, where: x?.where }); }
function pitchKeys(x, title) { return [...new Set([pitchKey(x, title), deriveKey({ title, what: x?.what, where: x?.where })].filter(Boolean))]; } // L5: JEV's key AND the derived one (D70 wolf-pelt-frame@yard slipped past D24 hide-frame@smithy)
function pitchGuard(ctx) { return { LEDGER: promptLines(ledgerRows(ctx), LEDGER) }; } // PONYTAIL 2026-10-03: LEDGER/DEDUPE off-paths cut (both always on)
const ledgerKeyProp = () => ({ key: { type: "string", description: LEDGER.keyDesc } });

// PITCH TIDE (creator GO 2026-09-29 02:32, docs/board/proposals/PITCH-TIDE.md): one clock for both lanes, read from the board's fill
function tideGap(n) { if (n >= TIDE.cap) return Infinity; return n <= TIDE.bendAt ? TIDE.stepS * n : TIDE.stepS * n * Math.pow(TIDE.bend, n - TIDE.bendAt); }
function tideBrake(u) { return u <= TIDE.brake.above ? 1 : Math.min(TIDE.brake.max, 2 + Math.floor((u - TIDE.brake.above - 1) / TIDE.brake.per)); }
function tide(ctx, s, now) {
  const dOpen = openDen(rd(ctx, DENI.file) ?? ""), sOpen = openSolo(rd(ctx, SOLO.file) ?? ""), n = dOpen + sOpen;
  const u = unbuilt(ctx), brake = tideBrake(u), laneF = Math.max(factor(jm(ctx), "denIdeas"), factor(jm(ctx), "solo")), gapS = laneF <= 0 ? Infinity : tideGap(n) * brake / laneF, nextAt = (s.tideLandAt ?? 0) + gapS * 1000; // JEV-MASTER: the faster lane's slider paces the tide
  const hr = Math.floor(now / 3600e3), dy = Math.floor(now / 86400e3);
  if (s.tideHour?.k !== hr) s.tideHour = { k: hr, c: 0 };
  if (s.tideDay?.k !== dy) s.tideDay = { k: dy, c: 0 };
  const capped = s.tideHour.c >= effCap(ctx, "tide", TIDE.perHour) ? "hour" : s.tideDay.c >= effCap(ctx, "tide", TIDE.perDay) ? "day" : null; // JEV-MASTER: the tide slider scales the caps
  const asking = !!((s.denAsking && now - s.denAsking.at < DENI.timeoutMs) || (s.soloAsking && now - s.soloAsking.at < SOLO.timeoutMs));
  const t = { n, den: dOpen, solo: sOpen, gapS: Number.isFinite(gapS) ? Math.round(gapS) : null, nextAt: Number.isFinite(nextAt) ? nextAt : null, brake, unbuilt: u, hour: s.tideHour.c, day: s.tideDay.c, capped, asking };
  if (JSON.stringify(t) !== JSON.stringify(s.tide ?? {})) s.tide = t; // written only when it moves
  tideDigest(ctx, s, now); votedSync(ctx, s, now);
  if ((s.tidePauseUntil ?? 0) > now) return; // DUPE GUARD rest
  if (capped || asking || !Number.isFinite(gapS) || now < nextAt || !llmFree(ctx, s, now)) return; // L4 cap: before the hour/day counters step // one pitch in flight across both lanes: ids + dedupe stay race-free
  const denRoom = DENI.maxOpen - dOpen, soloRoom = SOLO.maxOpen - sOpen;
  const dOn = factor(jm(ctx), "denIdeas") > 0, sOn = factor(jm(ctx), "solo") > 0; // JEV-MASTER: a lane at 0 % rests
  const den = dOn && denRoom > 0 && (!sOn || soloRoom <= 0 || dOpen / DENI.maxOpen <= sOpen / SOLO.maxOpen); // the lane furthest under its share
  if (!den && (!sOn || soloRoom <= 0)) return;
  s.tideHour = { ...s.tideHour, c: s.tideHour.c + 1 }; s.tideDay = { ...s.tideDay, c: s.tideDay.c + 1 };
  if (den) denIdeas(ctx, s, now); else soloIdeas(ctx, s, now);
}
function tideLanded(ctx, s, ok, line) {
  const now = ctx.now();
  if (!ok) { s.tideLandAt = now + TIDE.failS * 1000 - (s.tide?.gapS ?? 0) * 1000; return; } // a failed or repeat ask waits failS, then the tide resumes
  s.tideLandAt = now; // the gap counts from the card landing, not the ask
  const dg = s.tideDigestQ ?? { since: now, items: [] }; s.tideDigestQ = { since: dg.since, items: [...dg.items, line].slice(-TIDE.digestEvery) };
}
function tideDigest(ctx, s, now) { // one DM per 10 pitches or 30 min, never one per pitch (it buried the creator's chat)
  const q = s.tideDigestQ; if (!q?.items?.length) return;
  if (q.items.length < TIDE.digestEvery && now - q.since < TIDE.digestMs) return;
  ctx.notifyDm(`JEV pitched ${q.items.length}: ${q.items.join("; ")}. On the board for Savi + Claude.`, { wake: false });
  s.tideDigestQ = null;
}

// PONYTAIL 2026-10-03: one vetting path for a den (D) or solo (S) pitch: exact-key repeat -> ledger ban; title/near dupe -> caught; else the next id
function vetCard(ctx, s, k, x, title, whatN, addedKeys = [], near = []) {
  const key = pitchKey(x, title), next = k === "D" ? "denNext" : "soloNext"; // JEV-LEDGER L3: an exact thing@place repeat never reaches the board
  if (key) { const of = keyMatch(pitchKeys(x, title), [...ledgerRows(ctx), ...addedKeys]).id; if (of) { dupeCaught(ctx, s, title, of); ledgerBan(ctx, key, of); return null; } }
  const dg = dupeGate(ctx, s, { id: `${k}${s[next] ?? 1}`, title, where: oneLine(x.where, 160), what: oneLine(x.what, whatN) }, near); // DEDUPE-v2 D4: the one gate
  if (dg.of) { dupeCaught(ctx, s, title, dg.of); return null; } s.tideRepeats = 0; // DUPE GUARD: VOTED.md + both open boards
  const n = s[next] ?? 1; s[next] = n + 1; return { n, key, dg };
}
function denIdeas(ctx, s, now) {
  pacePaused(ctx, s); // logs the brake flip; no longer a wall (PITCH TIDE: tide() owns when)
  if (s.denAsking && now - s.denAsking.at < DENI.timeoutMs) return;
  const text = rd(ctx, DENI.file) ?? DEN_HEAD;
  if (openDen(text) >= DENI.maxOpen) return; // full: wait for a vote to free a slot
  s.denLast = now;
  const all3 = text + (rd(ctx, DENI.approved) ?? "") + (rd(ctx, DENI.dropped) ?? "") + (rd(ctx, SHELF.file) ?? "");
  const titles = [...all3.matchAll(/^## (D\d+) · (.*?) · ([\w ]+)/gm)].map((m) => `${m[1]} ${m[2]} (${m[3].trim()})`);
  const places = (ctx.world.files ?? []).filter((f) => /^places\/[^/]+\/config\.yaml$/.test(f)).map((f) => f.split("/")[1]);
  const design = rd(ctx, "design.md") ?? "", i = design.indexOf("## 2026-09-26 — the den becomes a Viking longhouse");
  const msg = JSON.stringify({
    focus: focusText(ctx), // JEV-MASTER L2c: steer toward the focus brief
    look: (rd(ctx, "scripts/lib/data/aesthetic.yml") ?? "").slice(0, 1200),
    theDen: i >= 0 ? design.slice(i, i + 2500) : "",
    brief: (rd(ctx, "docs/board/BRIEF.md") ?? "").slice(0, 2500),
    places, alreadyPitched: titles.slice(-40),
    whatVisitorsUseMost: Object.entries(ctx.world.state.useTally ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => `${id} x${n}`), // RETICLE S4: lean ideas toward what people actually touch
    ...pitchGuard(ctx), // JEV-LEDGER L2: LEDGER lines (<id> <thing>@<place> <mark>)
  });
  s.denAsking = { at: now };
  llmAsk(ctx, "pitch-den");
  ctx.job("llm:generate", {
    model: "smart",
    system: "You are JEV, the creative mind of a small team building forge_wizard_34's den: a cozy low-poly Norse lakeside longhouse and valley in the Spawn engine (Rolf the skald, folk, a chess bench, a longship shore). Pitch ONE new idea that would make the den a richer Viking home: a new system, asset, landscape, texture, NPC, animal, sound or other, drawn from Norse life, Odin and the old gods, runes, knotwork, sagas, seasons, crafts, the lake and forest. It must fit the look, be buildable by two builders in the engine (scripted geometry, painted textures, behaviours, particles, sound), be playable or visible to a visitor, and must not repeat anything in alreadyPitched or already in the den. Be concrete: where in the den it stands, what the visitor sees and does.",
    message: msg,
    schema: { type: "object", properties: {
      title: { type: "string", description: "under 60 chars" }, kind: { type: "string", enum: DENI.kinds },
      where: { type: "string" }, what: { type: "string", description: "what it is and what a visitor sees and does, 2-3 sentences" },
      whyViking: { type: "string" }, size: { type: "string", enum: DENI.sizes }, doneWhen: { type: "string" },
      critical: { type: "string", enum: CRIT_KINDS, description: "yes if it deletes/replaces/moves something built, changes the den's shared room, first-person walking, walk-on-arrival or square door, publishes, touches a goal, needs a big wisp round, or changes the voting rules; unsure if in doubt" }, criticalWhy: { type: "string" }, ...ledgerKeyProp() },
      required: ["title", "kind", "where", "what", "whyViking", "size", "doneWhen", "critical", "key"] },
  }, "onDenIdea", { at: now });
}
export function onDenIdea(ctx, r, p) {
  llmDone(ctx, "pitch-den", r);
  const s = ctx.self.state; if (!s.denAsking || s.denAsking.at !== p?.at) return; s.denAsking = null;
  const x = r?.ok ? r.data?.object : null;
  if (!x?.title || !x?.what) { tideLanded(ctx, s, false); s.denErrors = [...(s.denErrors ?? []), { at: ctx.now(), why: r?.error?.code ?? "empty" }].slice(-5); return; }
  const text = rd(ctx, DENI.file) ?? DEN_HEAD;
  if (openDen(text) >= DENI.maxOpen) { tideLanded(ctx, s, false); return; }
  const one = (v, n = 400) => oneLine(v, n);
  const title = one(x.title, 70).replace(/^[DS]\d+\s*[·:.-]?\s*/, ""), low = title.toLowerCase(); // never its own id in the title
  const v = vetCard(ctx, s, "D", x, title, 500); if (!v) { tideLanded(ctx, s, false); return; }
  const { n, key, dg } = v;
  const entry = `\n## D${n} · ${title} · OPEN\n- kind: ${one(x.kind, 20)} · size: ${one(x.size, 2)} · where: ${one(x.where, 160)}\n${key ? `- key: ${key}\n` : ""}${dg.line}- what: ${one(x.what, 500)}\n- why it's Viking: ${one(x.whyViking, 240)}\n- done when: ${one(x.doneWhen, 240)}\n${critLine(x, title + " " + x.what + " " + x.where)}\n- votes: Savi – · Claude – · creator –\n`;
  const [head, ...rest] = text.split(/\n(?=## D\d+ )/); // newest first, under the header
  wr(ctx, DENI.file, head.replace(/\s*$/, "\n") + entry + (rest.length ? "\n" + rest.join("\n") : ""));
  boardLog(ctx, `JEV pitched den idea D${n}: ${title} (docs/board/DEN-IDEAS.md), waiting on Savi + Claude votes (creator only if critical or split).`, isCritical(entry)); // C1: a "critical: yes" pitch stays on design.md
  if (dg.judge) dupeAsk(ctx, s, `D${n}`, DENI.file, { title, where: x.where, what: x.what }, dg.near);
  tideLanded(ctx, s, true, `D${n} ${title}`); wakeEnqueue(s, "pitch", `JEV pitched den idea D${n}: ${title}. Vote it on docs/board/DEN-IDEAS.md.`, ctx.now()); // PITCH TIDE: digest DM, not one per pitch
}

// all three votes in -> 2 of 3 YES to board 2 (approved), else to the dropped list; frees the slot on board 1
// CREATOR-VOTE.md: the only ideas that wait on the creator (critical, or Savi and Claude split); rewritten only when the list changes
function sealsNow(ctx) { const v = ctx.getObject?.(VB.id)?.state?.seals; return v ? JSON.parse(JSON.stringify(v)) : {}; } // the vote board's OWN row (Claude #11): read only, never written here
function usedNow(ctx) { return { ...(ctx.self.state.sealsUsed ?? {}) }; }
const oneLine = (v, n) => String(v ?? "").replace(/\s+/g, " ").replace(/#/g, "").trim().slice(0, n);
function blockOf(ctx, id) { const k = id?.[0], f = k === "D" ? DENI.file : k === "S" ? SOLO.file : null; if (!f) return null;
  return (rd(ctx, f) ?? "").split(new RegExp("\\n(?=## " + k + "\\d+ )")).slice(1).find((b) => ideaId(b) === id) ?? null; }
function creatorVote(ctx) {
  const s = ctx.self.state, now = ctx.now(), seals = sealsNow(ctx), used = usedNow(ctx);
  const rows = [], items = [];
  for (const [file, k] of [[DENI.file, "D"], [SOLO.file, "S"]]) for (const b of (rd(ctx, file) ?? "").split(new RegExp("\\n(?=## " + k + "\\d+ )")).slice(1)) {
    const id = ideaId(b); if (!id) continue;
    const forged = forgedCreator(b, seals, used), fh = cardHash(b);
    if (forged && (s.forgedSeen ?? {})[id] !== fh) { // ONE FINDING per id+text: a hand-typed creator vote is never obeyed
      s.forgedSeen = Object.fromEntries([...Object.entries(s.forgedSeen ?? {}), [id, fh]].slice(-CARDS.usedMax));
      boardLog(ctx, `FINDING: typed creator vote ignored on ${id}: votes only count from the rune board`);
      ctx.notifyDm(`FINDING: typed creator vote ignored on ${id}: votes only count from the rune board`);
    }
    if (gate(b, seals, used) !== "creator") continue;
    const h = /^## (.*)$/m.exec(b)?.[1] ?? "?", c = /^- critical:.*$/m.exec(b)?.[0] ?? "", v = /^- votes:.*$/m.exec(b)?.[0] ?? "";
    rows.push(`- ${h} · ${file}\n  ${c.slice(2) || "critical: no (Savi and Claude split)"}\n  ${v.slice(2, 300)}`);
    const crit = isCritical(b), vv = votesOf(b);
    items.push({ num: +id.slice(1), k, crit, card: { id, file, title: oneLine(/^## [DS]\d+ · (.*?) · [\w ()]+$/m.exec(b)?.[1] ?? h, 70), hash: fh, why: crit ? "critical" : "split",
      critWhy: crit ? oneLine(/^- critical:\s*yes\s*\((.*)\)\s*$/im.exec(b)?.[1] ?? "", 160) : "", votes: { savi: vv.savi, claude: vv.claude } } });
  }
  { const gc = mergeCards(ctx); rows.unshift(...gc.map((g) => g.row)); gc.forEach((g, i) => items.push({ num: i - gc.length, k: "M", crit: true, card: g.card })); } // D5: one card per duplicate group
  const body = `# CREATOR VOTE · the only ideas waiting on forge_wizard_34\n<!-- Written by the bell. Vote on the RUNE VOTE BOARD in the longhouse (on its stand at the hearth's east end): only its seals count; a typed "creator YES|NO" is ignored and flagged. Everything not here is Savi's and Claude's call. -->\n\n${rows.length ? rows.join("\n") : "(nothing waiting on you)"}\n`;
  if (rd(ctx, "docs/board/CREATOR-VOTE.md") !== body) wr(ctx, "docs/board/CREATOR-VOTE.md", body);
  // the board's cards: critical first, then oldest; n = 1..6 as seen; JEV's scribe text kept while id+hash hold
  items.sort((x, y) => (y.crit - x.crit) || (x.num - y.num) || (x.k < y.k ? -1 : 1));
  const old = new Map((s.voteCards ?? []).map((c) => [c.id + "|" + c.hash, c]));
  const cards = items.slice(0, VB.maxCards).map((x, i) => { const o = old.get(x.card.id + "|" + x.card.hash);
    return { n: i + 1, ...x.card, line: o?.line ?? "", sides: o?.sides ?? "", lean: o?.lean ?? "", risk: o?.risk ?? "" }; });
  const key = cards.map((c) => c.id + "|" + c.hash).join(",");
  if (key !== (s.voteKey ?? "")) { s.voteKey = key; s.voteRev = (s.voteRev ?? 0) + 1; }
  if (JSON.stringify(cards) !== JSON.stringify(s.voteCards ?? null)) s.voteCards = cards;
  const more = Math.max(0, items.length - VB.maxCards); if (s.voteMore !== more) s.voteMore = more;
  voteTally(ctx, s, now);
}
// DEDUPE-v2 D5: one MERGE/KEEP card per open duplicate group (IDEA-INDEX.md '## Groups' first, then BQ.overlaps), NOT-DUPE pairs skipped;
// a seal is judged in vote-board-core (mergeDecision): YES writes BUILD-QUEUE.md '## Merged', NO writes NOT-DUPE lines to the Savi inbox
function mergeCards(ctx) {
  const q = rd(ctx, BQ.file) ?? "", idx = rd(ctx, DEDUPE.indexFile ?? "docs/board/IDEA-INDEX.md") ?? "";
  const groups = [...parseGroups(idx), ...(BQ.overlaps ?? []).map((g) => ({ ids: g.ids, key: "", what: g.what }))];
  return groupCards(openGroups({ groups, queueText: q, notDupe: notDupePairs(idx + "\n" + (rd(ctx, KEEP_FILE) ?? "")) })).slice(0, DEDUPE.groupCardsMax ?? 3);
}
// the plaque: plain code, no LLM. passed/dropped = ids sorted today (sortTally), building = IN PROGRESS headers on the approved boards
function voteTally(ctx, s, now, add) {
  const day = dayKey(now), cur = s.voteTally?.day === day ? s.voteTally : { day, passed: [], dropped: [], building: [] };
  const passed = [...cur.passed], dropped = [...cur.dropped];
  for (const id of add?.pass ?? []) if (!passed.includes(id)) passed.push(id);
  for (const id of add?.drop ?? []) if (!dropped.includes(id)) dropped.push(id);
  const prog = (f) => [...(rd(ctx, f) ?? "").matchAll(/^## ([DS]\d+) · .*IN PROGRESS/gm)].map((m) => m[1]).slice(0, CARDS.buildingMax);
  const next = { day, passed, dropped, building: [...prog(DENI.approved), ...prog(SOLO.approved)] };
  if (JSON.stringify(next) !== JSON.stringify(s.voteTally ?? null)) s.voteTally = next;
}
// after a sort: seals that decided are marked used (the bell never writes the vote-board row), the herald speaks, the tally counts
function afterSort(ctx, pass, drop, seals, used, approvedFile, droppedFile) {
  const s = ctx.self.state, u = { ...(s.sealsUsed ?? {}) };
  for (const [list, file] of [[pass, approvedFile], [drop, droppedFile]]) for (const b of list) {
    const seal = sealOf(b, seals, used); if (!seal) continue;
    const id = ideaId(b); u[id] = cardHash(b);
    const line = `creator voted ${seal.vote} on ${id} via the rune board -> ${file}`;
    boardLog(ctx, line); ctx.notifyDm(line);
  }
  // HUGINN H1 (FATSTATE): a used mark only matters while its seal still stands on the vote board's row (idea-gate: seals[id] + sealsUsed[id] === hash),
  // so marks whose seal is gone leave the row; 116 marks (2.9 KB) -> the few seals still standing
  const keys = Object.keys(u).filter((k) => seals?.[k]); s.sealsUsed = Object.fromEntries(keys.slice(-CARDS.usedMax).map((k) => [k, u[k]]));
  voteTally(ctx, s, ctx.now(), { pass: pass.map(ideaId), drop: drop.map(ideaId) });
}
// the moved block records how he voted (the source-board line is never written by the board or JEV)
const sealMark = (b, seals, used) => { const seal = sealOf(b, seals, used); return seal ? b.replace(/^(- votes:.*?)creator\s+(?:–|-|YES|NO)\b/m, `$1creator ${seal.vote} (rune board seal)`) : b; };

// ---- JEV THE SCRIBE (never votes): one ask at a time, at most one a minute, for a card with no line yet ----
function voteScribe(ctx, s, now) {
  if (s.scribeAsking && now - s.scribeAsking.at < CARDS.scribeTimeoutMs) return;
  if (s.scribeAsking) s.scribeAsking = null;
  if (now - (s.scribeLast ?? -Infinity) < CARDS.scribeEveryMs) return;
  const tried = Object.fromEntries(Object.entries(s.scribeTried ?? {}).map(([k, v]) => [k, typeof v === "string" ? { hash: v.split(":")[0], n: +v.split(":")[1] || 0 } : v])); // POLISH: rows kept as "hash:n"
  const c = (s.voteCards ?? []).find((x) => !x.line && !(tried[x.id]?.hash === x.hash && tried[x.id].n >= CARDS.scribeTries)); if (!c) return;
  const b = blockOf(ctx, c.id); if (!b || cardHash(b) !== c.hash) return;
  if (!llmFree(ctx, s, now)) return; // L4 cap
  s.scribeLast = now; s.scribeAsking = { at: now, id: c.id, hash: c.hash };
  llmAsk(ctx, "vote-scribe");
  const t0 = tried[c.id]?.hash === c.hash ? tried[c.id].n : 0;
  s.scribeTried = Object.fromEntries([...Object.entries(tried).filter(([k]) => k !== c.id), [c.id, { hash: c.hash, n: t0 + 1 }]].slice(-20).map(([k, v]) => [k, `${v.hash}:${v.n}`]));
  ctx.job("llm:generate", { model: "smart",
    system: "You are JEV, scribe for forge_wizard_34's rune vote board in his Viking den. He alone votes YES or NO on this idea; you NEVER vote, you explain. Write: line = what it is and what it touches in the den, at most 90 characters; sides = only if Savi and Claude split, 'Savi: <her reason> / Claude: <his reason>' from their votes line, at most 160 characters, else empty; lean = 'JEV leans YES: <why>' or 'JEV leans NO: <why>', at most 120 characters, advice only; risk = only if the idea is critical, what breaks or is lost if he says yes, at most 120 characters, else empty. Plain words, no markdown.",
    message: JSON.stringify({ why: c.why, critWhy: c.critWhy, votes: c.votes, idea: b.slice(0, 2500) }),
    schema: { type: "object", properties: { line: { type: "string" }, sides: { type: "string" }, lean: { type: "string" }, risk: { type: "string" } }, required: ["line", "sides", "lean", "risk"] },
  }, "onVoteScribe", { at: now, id: c.id, hash: c.hash });
}
export function onVoteScribe(ctx, r, p) {
  llmDone(ctx, "vote-scribe", r);
  const s = ctx.self.state; if (s.scribeAsking?.at === p?.at) s.scribeAsking = null;
  const x = r?.ok ? r.data?.object : null; if (!x?.line) return; // failure: the card stays raw (title + votes)
  const cards = s.voteCards ?? [], i = cards.findIndex((c) => c.id === p?.id && c.hash === p?.hash); if (i < 0) return; // the card moved on: drop it
  const lean = oneLine(x.lean, CARDS.leanMax), split = cards[i].why === "split", crit = cards[i].why === "critical";
  const next = [...cards]; next[i] = { ...cards[i], line: oneLine(x.line, CARDS.lineMax), sides: split ? oneLine(x.sides, CARDS.sidesMax) : "",
    lean: /^JEV leans (YES|NO)\b/.test(lean) ? lean : "", risk: crit ? oneLine(x.risk, CARDS.riskMax) : "" };
  s.voteCards = next;
}
// one sorter for both idea lanes (Ponytail 2026-10-03: denSort + soloSort were near-copies)
function sortLane(ctx, L) {
  const text = rd(ctx, L.file), re = new RegExp(`^## ${L.k}\\d+ `, "m"); if (!text || !re.test(text)) return;
  const [head, ...blocks] = text.split(new RegExp(`\\n(?=## ${L.k}\\d+ )`)), keep = [], pass = [], drop = []; let moved = false;
  const seals = sealsNow(ctx), used = usedNow(ctx); // RUNE BOARD: his vote counts only as a seal on the vote board's own row
  for (const b of blocks) {
    const g = gate(b, seals, used);
    if (g === "shelf") { shelve(ctx, b); moved = true; continue; }
    if (g === "pass") pass.push(b); else if (g === "drop") drop.push(b); else keep.push(b);
  }
  if (!pass.length && !drop.length && !moved) return;
  const move = (file, hd, list, tag) => { if (!list.length) return; const cur = rd(ctx, file) ?? hd;
    // BUILD-QUEUE Q-A: an id already on the target board is never appended twice (S11–S14 were, 2026-09-29); Q-B: approvals carry their time
    const has = new Set([...cur.matchAll(/^## ([DS]\d+) /gm)].map((m) => m[1])), add = list.filter((b) => { const id = /^## ([DS]\d+) /.exec(b.trim())?.[1]; if (!id || has.has(id)) return false; has.add(id); return true; });
    if (!add.length) return;
    const stamp = tag === "TODO" ? `\n- approved: ${clockIso(ctx.now())}` : "";
    wr(ctx, file, cur.replace(/\s*$/, "\n") + add.map((b) => "\n" + b.trim().replace(/· OPEN\s*$/m, "· " + tag) + stamp + "\n").join("")); };
  const mark = (l) => l.map((b) => sealMark(b, seals, used));
  move(L.approved, L.approvedHead, mark(pass), "TODO"); move(L.dropped, L.droppedHead, mark(drop), "DROPPED");
  afterSort(ctx, pass, drop, seals, used, L.approved, L.dropped);
  wr(ctx, L.file, head.replace(/\s*$/, "\n") + keep.map((b) => "\n" + b.trim() + "\n").join(""));
  const ids = (l) => l.map((b) => new RegExp(`^## (${L.k}\\d+)`).exec(b)?.[1]).join(", ");
  boardLog(ctx, `${L.name} IDEAS sorted: ${pass.length ? "approved " + ids(pass) + " -> " + L.approvedName : ""} ${drop.length ? "dropped " + ids(drop) + " -> " + L.droppedName : ""}`.trim());
  ctx.notifyDm(`${L.name[0] + L.name.slice(1).toLowerCase()} ideas sorted: approved ${ids(pass) || "none"}, dropped ${ids(drop) || "none"}.`);
}
const LANES = {
  den: () => ({ k: "D", name: "DEN", file: DENI.file, approved: DENI.approved, dropped: DENI.dropped, approvedHead: APPROVED_HEAD, droppedHead: DROPPED_HEAD, approvedName: "DEN-APPROVED.md", droppedName: "DEN-DROPPED.md" }),
  solo: () => ({ k: "S", name: "SOLO", file: SOLO.file, approved: SOLO.approved, dropped: SOLO.dropped, approvedHead: "# SOLO IDEAS · approved, waiting to be built (Savi's lane)\n<!-- Status on the header: TODO -> IN PROGRESS -> DONE. -->\n", droppedHead: "# SOLO IDEAS · dropped (JEV reads this so it never pitches them again)\n", approvedName: "SOLO-APPROVED.md", droppedName: "SOLO-DROPPED.md" }),
};

// ---- SOLO IDEAS lane (creator 2026-09-28): 5 light survival ideas, the creator + Savi vote, both YES = approved ----
const SOLO_HEAD = `# SOLO IDEAS · JEV's light pitches for the creator and Savi
<!-- Savi's own lane while Claude is away. JEV keeps up to 5 here: decoration, buildings, simple Viking survival mini-games
     (woodcutting, fire making, fishing …) with real-feeling controls, never the same as DEN IDEAS. Savi and Claude vote: both YES ->
     SOLO-APPROVED.md, both NO -> SOLO-DROPPED.md; a split or a "critical: yes" idea waits for the creator (CREATOR-VOTE.md). -->
`;
const openSolo = (t) => [...t.matchAll(/^## S\d+ .*· OPEN\s*$/gm)].length;
function soloIdeas(ctx, s, now) {
  pacePaused(ctx, s);
  if (s.soloAsking && now - s.soloAsking.at < SOLO.timeoutMs) return;
  const text = rd(ctx, SOLO.file) ?? SOLO_HEAD, room = Math.min(1, SOLO.maxOpen - openSolo(text)); // PITCH TIDE: one card per ask
  if (room <= 0) return;
  s.soloLast = now;
  const read = (f) => rd(ctx, f) ?? "";
  const titlesOf = (t, k) => [...t.matchAll(new RegExp("^## " + k + "\\d+ · (.*?) · ", "gm"))].map((m) => m[1]);
  const mine = titlesOf(text + read(SOLO.approved) + read(SOLO.dropped) + read(SHELF.file), "S");
  const big = titlesOf(read(DENI.file) + read(DENI.approved) + read(DENI.dropped) + read(SHELF.file), "D");
  s.soloAsking = { at: now };
  llmAsk(ctx, "pitch-solo");
  ctx.job("llm:generate", {
    model: "smart",
    system: "You are JEV, pitching LIGHT ideas for forge_wizard_34's den: a cozy low-poly Norse lakeside longhouse and valley (a lake with a beach and longship, woods, a yard, a hall with a hearth, folk, Rolf the skald). Aim for a Viking survival game feel with strong, fun, realistic-feeling controls. Pitch small, quick-to-build things: decoration, small buildings (a smokehouse, a woodshed, a drying rack), and simple mini-games a visitor plays with their hands: woodcutting (swing timing, the axe biting the grain), fire making (strike the flint, feed tinder), fishing (cast, wait, set the hook, reel against the pull), and more like them. Each idea names its controls (on a phone: tap, hold, drag; on desktop: mouse, E, keys) and what makes the input feel real. Never repeat or closely echo anything in alreadyPitched or bigBoard; those belong to other lanes.",
    message: JSON.stringify({ focus: focusText(ctx), look: read("scripts/lib/data/aesthetic.yml").slice(0, 1000), alreadyPitched: mine.slice(-40), bigBoard: big.slice(-40), ...pitchGuard(ctx), count: room }),
    schema: { type: "object", properties: { ideas: { type: "array", maxItems: room, items: { type: "object", properties: {
      title: { type: "string", description: "under 60 chars" }, kind: { type: "string", enum: SOLO.kinds }, where: { type: "string" },
      what: { type: "string", description: "what it is and what the visitor does, 2 sentences" }, controls: { type: "string" },
      size: { type: "string", enum: SOLO.sizes }, critical: { type: "string", enum: CRIT_KINDS, description: "yes if it deletes/replaces/moves something built, changes the den's core rules, publishes or touches a goal; unsure if in doubt" }, criticalWhy: { type: "string" }, ...ledgerKeyProp() }, required: ["title", "kind", "where", "what", "controls", "size", "critical", "key"] } } }, required: ["ideas"] },
  }, "onSoloIdeas", { at: now });
}
export function onSoloIdeas(ctx, r, p) {
  llmDone(ctx, "pitch-solo", r);
  const s = ctx.self.state; if (!s.soloAsking || s.soloAsking.at !== p?.at) return; s.soloAsking = null;
  const list = r?.ok ? r.data?.object?.ideas ?? [] : [];
  if (!list.length) { tideLanded(ctx, s, false); s.soloErrors = [...(s.soloErrors ?? []), { at: ctx.now(), why: r?.error?.code ?? "empty" }].slice(-5); return; }
  let text = rd(ctx, SOLO.file) ?? SOLO_HEAD; const one = (v, n = 400) => oneLine(v, n);
  const seen = new Set([...(text + (rd(ctx, SOLO.approved) ?? "") + (rd(ctx, SOLO.dropped) ?? "")).matchAll(/^## S\d+ · (.*?) · /gm)].map((m) => m[1].toLowerCase()));
  const added = [], addedKeys = [], asks = [];
  for (const x of list) {
    if (openSolo(text) + added.length >= SOLO.maxOpen) break;
    const title = one(x.title, 70).replace(/^[DS]\d+\s*[·:.-]?\s*/, ""); if (!title || seen.has(title.toLowerCase())) continue; seen.add(title.toLowerCase());
    const v = vetCard(ctx, s, "S", x, title, 400, addedKeys, added.map((a) => ({ id: /## (S\d+) /.exec(a)?.[1] ?? "new", title: /· (.*?) · OPEN/.exec(a)?.[1], where: /where: (.*)$/m.exec(a)?.[1] ?? "" }))); if (!v) continue;
    const { n, key, dg } = v;
    if (dg.judge) asks.push([`S${n}`, { title, where: x.where, what: x.what }, dg.near]);
    if (key) addedKeys.push({ id: `S${n}`, key, mark: "open", alt: pitchKeys(x, title).find((k) => k !== key) });
    added.push(`\n## S${n} · ${title} · OPEN\n- kind: ${one(x.kind, 20)} · size: ${one(x.size, 2)} · where: ${one(x.where, 160)}\n${key ? `- key: ${key}\n` : ""}${dg.line}- what: ${one(x.what, 400)}\n- controls: ${one(x.controls, 300)}\n${critLine(x, title + " " + x.what + " " + x.where)}\n- votes: Savi – · Claude – · creator –\n`);
  }
  if (!added.length) { tideLanded(ctx, s, false); return; }
  wr(ctx, SOLO.file, text.replace(/\s*$/, "\n") + added.join(""));
  for (const [id, c, ids] of asks) { // DEDUPE-v2 D3: one ask per near-miss card while the hour's cap holds; the rest keep a WARN line
    if (dupeAsksNow(s, ctx.now()).n < (DEDUPE.perHour ?? 6) && llmFree(ctx, s, ctx.now())) { dupeAsk(ctx, s, id, SOLO.file, c, ids); continue; }
    const cur = rd(ctx, SOLO.file) ?? "", next = cur.replace(new RegExp(`(## ${id} · [^\\n]*\\n(?:(?!## )[^\\n]*\\n)*?- maybe dupe:[^\\n]*)\\(JEV judging\\)`), `$1(WARN: JEV judge over its ${DEDUPE.perHour ?? 6}/h cap, landed unjudged)`);
    if (next !== cur) wr(ctx, SOLO.file, next); }
  boardLog(ctx, `JEV pitched ${added.length} solo idea(s) on docs/board/SOLO-IDEAS.md (${added.map((a) => /## (S\\d+ · .*?) · /.exec(a)?.[1]).join("; ")}), waiting on Savi + Claude votes.`, added.some(isCritical)); // C1: critical: yes stays on design.md
  { const m = `JEV pitched ${added.length} solo idea(s) on docs/board/SOLO-IDEAS.md: vote them (Savi, Claude); the creator only sees critical ones and splits.`; tideLanded(ctx, s, true, added.map((a) => /## (S\d+ · .*?) · /.exec(a)?.[1]).join("; ")); wakeEnqueue(ctx.self.state, "pitch", m, ctx.now()); }
}

// every pitch and every sorted vote leaves a line on the main board (creator 2026-09-28: "any and all context is important")
// JEV-CHURN P2 (Claude C1): design.md keeps ONLY "← JEV REF FINDING" lines and "critical: yes" card alerts. Every other auto line
// (pitches, sorts, pace/tide flips, shelf reviews, rune-board votes, JEV's decisions in Savi's seat, referee STATUS lines) goes to
// docs/board/BELL-LOG.md: append-only, BELL lines batched to one save per BELL_EVERY_MS; past BELL_ROTATE the older half moves to
// docs/board/history/BELL-LOG-<date>.md (referee STATUS J lines are carried so the referee still sees them). Readers use boardText().
const BELL_LOG = "docs/board/BELL-LOG.md", BELL_ROTATE = 200e3, BELL_EVERY_MS = 5 * 60e3, BELL_QMAX = 60;
const BELL_HEAD = `# BELL-LOG · JEV's automatic board lines (append-only, newest at the bottom)\n<!-- Written by scripts/board-jev.js (JEV-CHURN P2, Claude C1). design.md keeps only "← JEV REF FINDING" lines and "critical: yes" alerts; every other BELL (auto) line, JEV's decisions in Savi's seat and the referee's STATUS lines land here. Past ~200 KB the older half moves to docs/board/history/BELL-LOG-<date>.md. JEV reads this file beside design.md (ideas digest, SMART LIST, referee). -->\n\n`;
function bellAppend(ctx, lines) {
  if (!lines?.length) return;
  let t = (rd(ctx, BELL_LOG) ?? BELL_HEAD).replace(/\s*$/, "\n") + lines.join("\n") + "\n";
  if (t.length > BELL_ROTATE) {
    const L = t.split("\n"), first = Math.max(0, L.findIndex((l) => /^(- |STATUS )/.test(l))), body = L.slice(first), half = Math.floor(body.length / 2), old = body.slice(0, half);
    const day = dayKey(ctx.now()), arch = `docs/board/history/BELL-LOG-${day}.md`;
    wr(ctx, arch, (rd(ctx, arch) ?? `# BELL-LOG archive · older lines moved from ${BELL_LOG} (${day})\n\n`).replace(/\s*$/, "\n") + old.join("\n").replace(/\s*$/, "\n"));
    t = L.slice(0, first).join("\n") + "\n" + [...old.filter((l) => /^STATUS J\d+: .*JEV REF/.test(l)), ...body.slice(half)].join("\n");
  }
  wr(ctx, BELL_LOG, t);
}
function boardLog(ctx, line, critical = false) {
  const l = `- ← BELL (auto): ${line}`;
  if (critical) { const t = rd(ctx, "design.md"); if (t) { wr(ctx, "design.md", t.replace(/\s*$/, "\n") + l + "\n"); return; } }
  const s = ctx.self.state; s.bellQ = [...(s.bellQ ?? []), l].slice(-BELL_QMAX); // batched: bellFlush writes them in one save
}
function bellFlush(ctx, s, now) {
  if (!s.bellQ?.length || (now - (s.bellAt ?? -Infinity) < BELL_EVERY_MS && s.bellQ.length < BELL_QMAX / 2)) return;
  const q = s.bellQ; s.bellQ = []; s.bellAt = now; bellAppend(ctx, q);
}
// the board as JEV's readers need it: design.md, then BELL-LOG.md under its own ## heading
function boardText(ctx) {
  const d = rd(ctx, "design.md"); if (d == null) return null;
  if (!_files.has(":board+bell")) { const b = rd(ctx, BELL_LOG); _files.set(":board+bell", b ? d.replace(/\s*$/, "\n") + "\n## BELL-LOG (auto: docs/board/BELL-LOG.md)\n" + b : d); }
  return _files.get(":board+bell");
}
// referee: only the STATUS J lines it wrote to BELL-LOG, appended after design.md so design.md's line numbers stay put
function bellRef(ctx) { const r = (rd(ctx, BELL_LOG) ?? "").split("\n").filter((l) => /^STATUS J\d+: .*JEV REF/.test(l)); return r.length ? "\n" + r.join("\n") : ""; }

// a SHELF vote parks the idea on docs/board/SHELF.md (max 20) with a needs: line Savi fills in; full shelf = it stays where it is
function shelve(ctx, b) {
  const t = rd(ctx, SHELF.file) ?? "# THE SHELF · ideas waiting on a system the den doesn't have yet (max 20)\n\n## SYSTEMS NEEDED\n";
  if ([...t.matchAll(/^## [DS]\d+ /gm)].length >= SHELF.max) return false;
  const e = b.trim().replace(/· OPEN\s*$/m, "· SHELVED") + (/^- needs:/m.test(b) ? "" : "\n- needs: (Savi names the systems it waits on)");
  wr(ctx, SHELF.file, t.replace(/\s*$/, "\n") + "\n" + e + "\n");
  shelfTally(ctx); if (!/^- needs:/m.test(b)) askNeeds(ctx, e);
  boardLog(ctx, `shelved ${/^## ([DS]\d+ · .*?) · /.exec(b)?.[1] ?? "an idea"} on docs/board/SHELF.md, waiting on a system.`);
  return true;
}

// the shelf's SYSTEMS NEEDED list, rebuilt from every entry's needs: line (SYSTEM NAME in caps, then its detail)
function shelfTally(ctx) {
  const t = rd(ctx, SHELF.file); if (!t) return;
  const tally = new Map();
  for (const b of t.split(/\n(?=## [DS]\d+ )/).slice(1)) {
    const id = /^## ([DS]\d+)/.exec(b)?.[1], need = /^- needs:(.*)$/m.exec(b)?.[1] ?? "";
    const names = [...need.matchAll(/\b([A-Z][A-Z0-9-]{2,}(?: [A-Z][A-Z0-9-]{2,})*)\b/g)].map((m) => m[1]);
    for (const n of names.length ? names : ["UNNAMED (Savi names it)"]) tally.set(n, [...(tally.get(n) ?? []), id]);
  }
  const list = [...tally].sort((a, b) => b[1].length - a[1].length).map(([n, ids]) => `- ${n}: ${ids.join(", ")}`).join("\n");
  const out = t.replace(/## SYSTEMS NEEDED\n[\s\S]*?(?=\n## [DS]\d+ |$)/, `## SYSTEMS NEEDED\n${list}\n`);
  if (out !== t) wr(ctx, SHELF.file, out);
}
// an idea shelved without a needs: line: JEV names the missing systems (Savi checks them)
function askNeeds(ctx, entry) {
  const id = /^## ([DS]\d+)/.exec(entry)?.[1]; if (!id) return;
  llmAsk(ctx, "shelf-needs"); // one-shot at shelving time: bypasses the cap, counts toward it
  ctx.job("llm:generate", { model: "fast",
    system: "You read one game idea for a cozy low-poly Viking den in the Spawn engine and name the NEW systems it needs that a simple den of walkable rooms, NPCs, interactable objects (press E) and particles does not already have: e.g. INVENTORY, CRAFTING, DAY-NIGHT NEEDS, HUNGER, WEATHER-DRIVEN STATE, NPC SCHEDULES, PHYSICS ROPE. Each system: a short CAPS name and one line of what it must do for this idea.",
    message: entry.slice(0, 1500),
    schema: { type: "object", properties: { systems: { type: "array", maxItems: 4, items: { type: "object", properties: { name: { type: "string" }, does: { type: "string" } }, required: ["name", "does"] } } }, required: ["systems"] },
  }, "onShelfNeeds", { id });
}
export function onShelfNeeds(ctx, r, p) {
  llmDone(ctx, "shelf-needs", r);
  const sys = r?.ok ? r.data?.object?.systems ?? [] : []; if (!sys.length) return;
  const t = rd(ctx, SHELF.file); if (!t) return;
  const line = "- needs: " + sys.map((x) => `${String(x.name).toUpperCase().replace(/[^A-Z0-9 -]/g, "").trim().slice(0, 30)} (${String(x.does).replace(/\s+/g, " ").slice(0, 160)})`).join("; ") + " [JEV named; Savi checks]";
  const re = new RegExp(`(## ${p.id} [^\\n]*\\n[\\s\\S]*?)- needs: \\(Savi names the systems it waits on\\)`);
  const out = t.replace(re, (m, a) => a + line); if (out === t) return;
  wr(ctx, SHELF.file, out); shelfTally(ctx);
  boardLog(ctx, `shelf ${p.id} needs: ${sys.map((x) => x.name).join(", ")} (JEV named, Savi checks).`);
}

// JEV reviews the shelf whenever its entries change (at most every 5 min): ranks the needed systems, names each one's smallest
// useful first build, flags ideas whose needs the den already meets, and spots duplicates. Written to "## JEV PRIORITY"; we decide.
const shelfBody = (t) => t.replace(/## JEV PRIORITY[\s\S]*?(?=\n## )/, "").replace(/## SYSTEMS NEEDED[\s\S]*?(?=\n## [DS]\d+ |$)/, "");
function hashOf(t) { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; }
function shelfReview(ctx, s, now) {
  if (s.shelfAsking && now - s.shelfAsking.at < SHELF.timeoutMs) return;
  if (now - (s.shelfLast ?? 0) < eff(ctx, "shelf", SHELF.reviewGapMs)) return;
  const t = rd(ctx, SHELF.file); if (!t || !/^## [DS]\d+ /m.test(t)) return;
  const body = shelfBody(t), h = hashOf(body); if (h === s.shelfHash) return;
  if (!llmFree(ctx, s, now)) return; // L4 cap
  s.shelfLast = now; s.shelfAsking = { at: now, h };
  llmAsk(ctx, "shelf-review");
  const scripts = (ctx.world.files ?? []).filter((f) => /^scripts\/[^/]+\.js$/.test(f)).map((f) => f.slice(8, -3));
  ctx.job("llm:generate", { model: "smart",
    system: "You are JEV reviewing THE SHELF of forge_wizard_34's cozy Viking den (Spawn engine): ideas parked because they need a system the den lacks. Rank the needed systems for building next: most ideas unlocked, cheapest to build, best fit for a cozy Viking survival home with strong, fun, realistic-feeling controls, playable on a phone. For each system name the SMALLEST first version that unlocks its ideas. Flag any idea whose needs the den's existing scripts already seem to cover (readyNow), and any ideas that duplicate each other. Be brief and concrete.",
    message: JSON.stringify({ shelf: body.slice(0, 9000), denScripts: scripts.slice(0, 200) }),
    schema: { type: "object", properties: {
      ranking: { type: "array", maxItems: 8, items: { type: "object", properties: { system: { type: "string" }, unlocks: { type: "array", items: { type: "string" } }, cost: { type: "string", enum: ["S", "M", "L"] }, why: { type: "string" }, firstBuild: { type: "string" } }, required: ["system", "unlocks", "cost", "why", "firstBuild"] } },
      readyNow: { type: "array", items: { type: "object", properties: { id: { type: "string" }, because: { type: "string" } }, required: ["id", "because"] } },
      duplicates: { type: "array", items: { type: "string" } },
      next: { type: "string", description: "one sentence: the system to build next and why" } },
      required: ["ranking", "readyNow", "duplicates", "next"] },
  }, "onShelfReview", { at: now });
}
export function onShelfReview(ctx, r, p) {
  llmDone(ctx, "shelf-review", r);
  const s = ctx.self.state; if (!s.shelfAsking || s.shelfAsking.at !== p?.at) return; const asked = s.shelfAsking; s.shelfAsking = null;
  const x = r?.ok ? r.data?.object : null; if (!x?.ranking) return;
  const t = rd(ctx, SHELF.file); if (!t) return;
  const one = (v, n = 200) => oneLine(v, n);
  const lines = ["## JEV PRIORITY (JEV's review of the shelf; a suggestion, the creator + Savi decide)",
    `- next: ${one(x.next, 260)}`,
    ...x.ranking.map((k, i) => `${i + 1}. ${one(k.system, 40).toUpperCase()} [${one(k.cost, 1)}] unlocks ${(k.unlocks ?? []).map((u) => /[DS]\d+/.exec(String(u))?.[0] ?? one(u, 12)).join(", ")}: ${one(k.why, 180)} · first build: ${one(k.firstBuild, 220)}`),
    ...(x.readyNow ?? []).map((k) => `- ready now? ${one(k.id, 8)}: ${one(k.because, 200)} (Savi checks, then it goes back to its board for a vote)`),
    ...(x.duplicates ?? []).map((d) => `- duplicate? ${one(d, 200)}`)];
  const block = lines.join("\n") + "\n";
  const out = /## JEV PRIORITY/.test(t) ? t.replace(/## JEV PRIORITY[\s\S]*?(?=\n## )/, block) : t.replace(/\n## SYSTEMS NEEDED/, "\n" + block + "\n## SYSTEMS NEEDED");
  s.shelfHash = asked.h;
  if (out !== t) wr(ctx, SHELF.file, out);
  boardLog(ctx, `JEV reviewed the shelf: ${one(x.next, 200)}`);
}

// ---- SMART LIST: one prioritized list over every source (creator 2026-09-28: "smartly scan any and all tasks ... every 3 minutes") ----
function smartDigest(ctx, s) {
  const read = (f) => rd(ctx, f) ?? "", text = boardText(ctx) ?? "", lines = text.split("\n"); // P2: + BELL-LOG.md
  const goals = section(text, "## GOALS").filter((l) => /^- GOAL /.test(l)).map((l) => l.slice(0, 500));
  const now = section(text, "## NOW").map((l) => l.slice(0, 400));
  const status = new Map(); for (const l of lines) { const m = /^STATUS ([\w-]+(?: \d+)?):/.exec(l); if (m) status.set(m[1], l.slice(0, 220)); }
  const reports = lines.filter((l) => /^- (←|→) /.test(l)).slice(-25).map((l) => l.slice(0, 300));
  const trim = (t, n) => t.replace(/<!--[\s\S]*?-->/g, "").slice(0, n);
  return { creatorNow: trim(read(SMART.creatorNow), 2500), claims: trim(read(SMART.claims), 2000), previousFillIns: (smartDoc(ctx, s)?.list ?? []).filter((k) => k.source === "JEV-PROPOSED").map((k) => `${k.id}: ${k.title}`), goals, now, status: [...status.values()], recentReports: reports,
    denIdeasWaitingVotes: trim(read(DENI.file), 3000), denApproved: trim(read(DENI.approved), 3000),
    soloIdeasWaitingVotes: trim(read(SOLO.file), 2500), soloApproved: trim(read(SOLO.approved), 3000), shelf: trim(read(SHELF.file), 3000) };
}
// CLAIMS.md: "- <id> · <who> · CLAIMED|DONE|RELEASED · note"; the last line per id wins
function readClaims(ctx) {
  const t = rd(ctx, SMART.claims) ?? "", m = new Map(); m.votes = {};
  for (const l of t.split("\n")) { const x = /^- ([^·]+?) · (Savi|Claude|creator|wisp[^·]*) · (CLAIMED|DONE|RELEASED)\b(.*)$/i.exec(l.trim()); if (x) { const k = x[1].trim().toUpperCase(); m.delete(k); m.set(k, { who: x[2].trim(), st: x[3].toUpperCase(), note: x[4].replace(/^\s*·\s*/, "").slice(0, 120) }); } // POLISH: re-inserted, so map order = each id's latest line
    const v = /^- ([^·]+?) · (Savi|Claude|creator) · (YES|NO)\b/i.exec(l.trim()); if (v) { const k = v[1].trim().toUpperCase(); m.votes[k] = { ...(m.votes[k] ?? {}), [v[2].toLowerCase()]: v[3].toUpperCase() }; } }
  return { text: t, map: m };
}
function smartList(ctx, s, now) {
  const cl = readClaims(ctx), ch = hashOf(cl.text);
  if (ch !== s.claimsHash) { s.claimsHash = ch; if (smartDoc(ctx, s)) renderSmart(ctx, s, cl.map);
    const was = new Map((s.building ?? []).map((b) => [b.id, b])), titles = new Map((smartDoc(ctx, s)?.list ?? []).map((k) => [String(k.id).toUpperCase(), k.title]));
    s.building = [...cl.map.entries()].filter(([, c]) => c.st === "CLAIMED").slice(-3).map(([id, c]) => was.get(id) ?? { id, title: String(titles.get(id) ?? c.note ?? id).slice(0, 80), at: ctx.now() }); } // JEV body (B3): claimed = building; DONE/RELEASED drops it
  const cn = hashOf(rd(ctx, SMART.creatorNow) ?? ""); if (cn !== s.creatorNowHash) { s.creatorNowHash = cn; s.smartLast = 0; } // the creator's new ask refreshes now // a claim shows within one check, no JEV call
  if (s.smartAsking && now - s.smartAsking.at < SMART.timeoutMs) return;
  if (now - (s.smartLast ?? 0) < eff(ctx, "smart", SMART.everyMs)) return;
  if (!llmFree(ctx, s, now)) return; // L4 cap
  s.smartLast = now;
  const d = { focus: focusText(ctx), ...smartDigest(ctx, s) }, msg = JSON.stringify(d).slice(0, SMART.digestMax), h = hashOf(msg.replace(/- ← BELL \(auto\):[^"]*/g, ""));
  if (h === s.smartHash) return; // nothing changed: no call
  smartHay = { at: now, msg };
  s.smartAsking = { at: now, h };
  llmAsk(ctx, "smart-list");
  ctx.job("llm:generate", { model: "smart",
    system: "You are JEV, the planning mind of forge_wizard_34's Viking den team: the creator, Savi (builder, here now) and Claude (builder, sometimes away). Read every task source (goals, Claude's NOW list, the STATUS ledger where the last line per id wins, recent reports, the den and solo idea boards, their approved boards, the shelf) and write ONE prioritized list of what to work on next. Rules: goals in their order, GOAL 1 (Rolf's guitar) first; a PARKED goal never appears; never list anything DONE, REVIEWED, DROPPED or already superseded; respect blockers (a task blocked by another goes after it, and say by what); approved idea-board items come after open GOAL 1 P1 work unless nothing in GOAL 1 is doable by that owner; ideas still waiting on votes are not tasks, list them only under waitingOnVotes with who still has to vote; a shelf system appears only if JEV PRIORITY ranks it. The creator's own ordering notes on the board override your ranking: new songs (B-S5 and any songwriting) go LAST, after the rest of the backlog ('write the songs after we work through the backlog'). CLAIMS lists who is already working on what: keep claimed items in the list at their rank, never list DONE claims. CREATOR NOW tasks (the creator's own new asks) rank first for BOTH builders, above everything, until marked DONE. Keep both columns full: Savi and Claude must each have at least 5 unblocked, unclaimed items; fill from the backlog, SAVI BACKLOG, DEN-APPROVED, SOLO-APPROVED and the shelf's JEV PRIORITY first; only if a column is still short, propose new concrete tasks under an approved (non-parked) goal with source JEV-PROPOSED and ids J1, J2, ... (reuse the id of a previousFillIns item for the same idea). Owner is Savi, Claude or creator; if Claude is away, say what Savi can do instead. Use the board's own ids (TASK 11, B5, B-S4, S4, D1 ...). Be concrete and brief.",
    message: msg,
    schema: { type: "object", properties: {
      headline: { type: "string", description: "one sentence: the state of the board" },
      list: { type: "array", maxItems: SMART.items, items: { type: "object", properties: {
        id: { type: "string" }, title: { type: "string" }, owner: { type: "string", enum: ["Savi", "Claude", "creator"] },
        source: { type: "string", description: "NOW, BACKLOG, SAVI BACKLOG, DEN-APPROVED, SOLO-APPROVED, SHELF, ..." },
        why: { type: "string" }, blockedBy: { type: "string" }, doneWhen: { type: "string" } },
        required: ["id", "title", "owner", "source", "why", "blockedBy", "doneWhen"] } },
      waitingOnVotes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, who: { type: "string" } }, required: ["id", "who"] } },
      creatorDecisions: { type: "array", items: { type: "string" }, description: "questions only the creator can settle" },
      staleOrConflicting: { type: "array", items: { type: "string" }, description: "board lines that disagree or look out of date" } },
      required: ["headline", "list", "waitingOnVotes", "creatorDecisions", "staleOrConflicting"] },
  }, "onSmartList", { at: now });
}
export function onSmartList(ctx, r, p) {
  llmDone(ctx, "smart-list", r);
  const s = ctx.self.state; if (!s.smartAsking || s.smartAsking.at !== p?.at) return; const asked = s.smartAsking; s.smartAsking = null;
  const x = r?.ok ? r.data?.object : null;
  if (!x?.list?.length) { s.smartErrors = [...(s.smartErrors ?? []), { at: ctx.now(), why: r?.error?.code ?? "empty" }].slice(-5); return; }
  const one = (v, n = 240) => oneLine(v, n);
  // an id JEV names must exist somewhere on the board; an invented one is dropped and counted
  const hay = smartHay?.at === asked.at ? smartHay.msg : JSON.stringify(smartDigest(ctx, s)).slice(0, SMART.digestMax); let invented = 0;
  const list = x.list.filter((k) => { const id = one(k.id, 30); const ok = id && (/^J\d+$/i.test(id) || hay.includes(id.replace(/^TASK\s*/i, ""))); if (!ok) invented++; return ok; });
  s.smartN = (s.smartN ?? 0) + 1; s.smartHash = asked.h;
  _smart = { n: s.smartN, invented, headline: one(x.headline, 300),
    list: list.map((k) => ({ id: one(k.id, 30), title: one(k.title, 120), owner: one(k.owner, 8), source: one(k.source, 30), why: one(k.why), blocked: /^(none|n\/a|-|)(\b|$)/i.test(one(k.blockedBy)) ? "" : one(k.blockedBy, 160), done: one(k.doneWhen, 200) })),
    votes: (x.waitingOnVotes ?? []).map((v) => `${one(v.id, 20)}: ${one(v.who, 80)}`),
    decisions: (x.creatorDecisions ?? []).map((q) => one(q, 260)), stale: (x.staleOrConflicting ?? []).map((q) => one(q, 260)) };
  renderSmart(ctx, s, readClaims(ctx).map);
  const top = _smart.list[0] ? `${_smart.list[0].id} (${_smart.list[0].owner})` : "none";
  if (top !== s.smartTop) { s.smartTop = top; boardLog(ctx, `SMART LIST top changed: ${top}. See docs/board/SMART-LIST.md.`); }
}
function renderSmart(ctx, s, claims) {
  const d = smartDoc(ctx, s); if (!d) return;
  const live = d.list.filter((k) => claims.get(k.id.toUpperCase())?.st !== "DONE");
  const tag = (k) => { const c = claims.get(k.id.toUpperCase()); return c?.st === "CLAIMED" ? ` · ▶ CLAIMED by ${c.who}${c.note ? ` (${c.note})` : ""}` : ""; };
  const vote = (k) => claims.votes?.[k.id.toUpperCase()] ?? {};
  const passed = (k) => { const v = vote(k); return v.creator === "YES" || (v.savi === "YES" && v.claude === "YES"); };
  const propTag = (k) => { if (k.source !== "JEV-PROPOSED") return ""; const v = vote(k); if (passed(k)) return " · JEV-proposed, approved"; if (v.creator === "NO" || (v.savi === "NO" && v.claude === "NO")) return " · JEV-proposed, voted down"; if (v.savi && v.claude && v.savi !== v.claude) return " · JEV-proposed, SPLIT: creator decides"; return ` · JEV-proposed: needs yes from Savi (${v.savi ?? "–"}) + Claude (${v.claude ?? "–"}); vote with "- ${k.id} · <you> · YES|NO" in CLAIMS.md`; };
  const free = (k) => claims.get(k.id.toUpperCase())?.st !== "CLAIMED" && !k.blocked && (k.source !== "JEV-PROPOSED" || passed(k));
  const cnow = (rd(ctx, SMART.creatorNow) ?? "").replace(/<!--[\s\S]*?-->/g, "").split("\n").filter((l) => /^- /.test(l) && !/·\s*DONE\b/i.test(l)).map((l) => l.slice(0, 300));
  const pick = (who) => live.find((k) => free(k) && k.owner === who);
  const busy = (who) => [...claims.entries()].filter(([, c]) => c.st === "CLAIMED" && c.who === who).map(([id]) => id);
  const nextLine = (who) => { const b = busy(who), k = pick(who); return `- ${who}: ${b.length ? `working on ${b.join(", ")}` : "idle"} · next free: ${cnow.length ? "THE CREATOR'S TASK FIRST (CREATOR NOW above)" : k ? `[${k.id}] ${k.title}` : "nothing unblocked in your column; take the first unblocked unclaimed item whose files are yours, or leave a note"}`; };
  const out = [`# SMART LIST · JEV's prioritized tasks across the whole board`,
    `<!-- Rebuilt by JEV every 3 min when any source changed (design.md goals/NOW/STATUS/reports, DEN + SOLO boards, their approved boards, THE SHELF, CLAIMS). A suggestion beside Claude's NOW, never over it. "board" = take your next free task: append "- <id> · <you> · CLAIMED · note" to docs/board/CLAIMS.md (and DONE or RELEASED when you stop), post the usual report, check STATUS first. -->`,
    `JEV refresh #${d.n} · ${live.length} items${d.invented ? ` · ${d.invented} dropped for ids not on the board` : ""}`, "",
    `**${d.headline}**`, "", ...(cnow.length ? ["## CREATOR NOW (the creator's new ask: both builders switch to this first)", ...cnow, ""] : []), "## PICK NEXT (say \"board\")", nextLine("Savi"), nextLine("Claude"), "", "## NEXT, IN ORDER",
    ...live.map((k, i) => `${i + 1}. [${k.id}] ${k.title} · ${k.owner} · from ${k.source}${tag(k)}${propTag(k)}\n   why: ${k.why}${k.blocked ? `\n   blocked by: ${k.blocked}` : ""}\n   done when: ${k.done}`),
    "", "## WAITING ON VOTES", ...d.votes.map((v) => `- ${v}`),
    "", "## ONLY THE CREATOR CAN DECIDE", ...d.decisions.map((q) => `- ${q}`),
    "", "## STALE OR CONFLICTING ON THE BOARD", ...d.stale.map((q) => `- ${q}`), ""].join("\n");
  const bodyOf = (t) => String(t ?? "").replace(/^JEV refresh #\d+ · /m, "JEV refresh · "); // P6 JEV-CHURN: the refresh counter alone is not content
  const prev = rd(ctx, SMART.file), stampDue = ctx.now() - (s.smartWroteAt ?? -Infinity) >= (SMART.stampEveryMs ?? 15 * 60e3);
  if (bodyOf(out) !== bodyOf(prev) || (out !== prev && stampDue)) { wr(ctx, SMART.file, out); s.smartWroteAt = ctx.now(); }
}

// ---- FEATURE SHEETS: the creator's new idea (CREATOR-NOW OPEN line) gets JEV's sheet at once; Savi + Claude add theirs under it ----
function featureSheet(ctx, s, now) {
  if (s.featAsking && now - s.featAsking.at < FEAT.timeoutMs) return;
  const open = (rd(ctx, SMART.creatorNow) ?? "").replace(/<!--[\s\S]*?-->/g, "").split("\n").map((l) => /^- ([^·]+?) · (.+?) · OPEN\b/i.exec(l.trim())).filter(Boolean);
  const have = rd(ctx, FEAT.file) ?? "";
  const next = open.find((m) => !have.includes(`## ${m[1].trim()} ·`) && !(s.featTried ?? []).includes(m[1].trim()));
  if (!next) return;
  if (!llmFree(ctx, s, now)) return; // L4 cap
  const id = next[1].trim(), ask = next[2].trim().slice(0, 600);
  s.featTried = [...(s.featTried ?? []), id].slice(-30); s.featAsking = { at: now, id, ask };
  llmAsk(ctx, "feature");
  const text = rd(ctx, "design.md") ?? "";
  ctx.job("llm:generate", { model: "smart",
    system: "You are JEV on forge_wizard_34's Viking den team (Spawn engine, phone and desktop). The creator just posted a new idea. Write its feature sheet: the core in one sentence, then exactly 5 concrete ideas that flesh it out and raise its quality (feel, sound, light, a small surprise, how it fits the den's cozy Viking lakeside home), a quality bar (how we know it's good, measurable where possible), risks, and a split of the work between Savi (world, scripts, placement) and Claude (art, deep systems). Respect the goals and never propose a known mistake from FINDINGS. Brief, specific, no fluff.",
    message: JSON.stringify({ focus: focusText(ctx), idea: ask, goals: section(text, "## GOALS").slice(0, 20), findings: (rd(ctx, "docs/board/FINDINGS.md") ?? "").slice(-5000) }),
    schema: { type: "object", properties: { title: { type: "string" }, core: { type: "string" },
      ideas: { type: "array", minItems: 3, maxItems: FEAT.ideas, items: { type: "string" } },
      qualityBar: { type: "array", items: { type: "string" } }, risks: { type: "array", items: { type: "string" } },
      savi: { type: "array", items: { type: "string" } }, claude: { type: "array", items: { type: "string" } } },
      required: ["title", "core", "ideas", "qualityBar", "risks", "savi", "claude"] },
  }, "onFeatureSheet", { at: now });
}
// ---- JEV-HOVER-ELI5-v2 L3: a brand-new lane's hover card, written once by JEV on the 10 s knock. meter() queues { q }; one ask at a time,
// ELI5_GEN.perHour asks an hour (the eli5 lane's own meter row), behind LLMCAP. Answer -> world.state.jevEli5[lane] + docs/board/JEV-ELI5.md.
let _eliAsk = null; // { lane, at }
function eliSource(ctx, lane) {
  const pat = [`'${lane}'`, `"${lane}"`];
  for (const f of ctx.world.files) {
    if (!/^scripts\/.*\.js$/.test(f) || /\.test\.|data\/jev-eli5\.js$/.test(f)) continue;
    const txt = rd(ctx, f); if (!txt || !pat.some((p) => txt.includes(p))) continue;
    const L = txt.split("\n"), i = L.findIndex((l) => pat.some((p) => l.includes(p)));
    return { file: f, lines: L.slice(Math.max(0, i - ELI5_GEN.near), i + ELI5_GEN.near).join("\n").slice(0, 2400) };
  }
  return null;
}
function eli5Step(ctx, s, now) {
  const w = ctx.world.state, rows = w.jevEli5; if (!rows) return;
  if (_eliAsk && now - _eliAsk.at < LLMCAP.staleMs) return;
  let lane = null;
  for (const [k, r] of Object.entries(rows)) {
    if (r?.q) { lane = k; break; }
    if (r?.fail === 1 && now - (r.at ?? 0) > ELI5_GEN.retryMs) { lane = k; break; } // one retry after 10 min
  }
  if (!lane) return;
  if ((w.jevMeter?.now?.eli5?.a ?? 0) >= ELI5_GEN.perHour) return; // the hour's 3 are spent: waits for the next hour
  if (!llmFree(ctx, s, now)) return;
  const src = eliSource(ctx, lane);
  const guide = ["lane:rolf-songs", "lane:huginn", "lane:pitch-solo"].map((k) => ({ id: k, ...ELI5[k] }));
  _eliAsk = { lane, at: now, fail: rows[lane]?.fail ?? 0 };
  llmAsk(ctx, "eli5");
  ctx.job("llm:generate", { model: "fast",
    system: "You are JEV, the thinking helper in forge_wizard_34's Viking den. Write the hover card for one of your own lanes (a system that calls you) on the JEV Master desk, in the exact style of the example cards: plain words a child understands, readable in under 5 seconds. name: 2-4 words. what: what it is, one short sentence. does: what it does for the den, one short sentence. knob: which desk slider changes it, or 'Not on the desk: <how often it runs>'. 30 words total at most across what, does and knob. No jargon, no file names.",
    message: JSON.stringify({ lane, examples: guide, code: src ?? "no source found; explain from the lane name alone" }),
    schema: { type: "object", properties: { name: { type: "string" }, what: { type: "string" }, does: { type: "string" }, knob: { type: "string" } }, required: ["name", "what", "does", "knob"] },
  }, "onEli5", { lane, at: now });
}
export function onEli5(ctx, r, p) {
  llmDone(ctx, "eli5", r);
  const tried = _eliAsk?.lane === p?.lane ? _eliAsk.fail ?? 0 : 0; if (_eliAsk?.lane === p?.lane) _eliAsk = null;
  const w = ctx.world.state, lane = p?.lane; if (!lane) return;
  const x = r?.ok ? r.data?.object : null, one = (v) => String(v ?? "").replace(/\s+/g, " ").replace(/[<>#`]/g, "").trim().slice(0, ELI5_GEN.fieldMax);
  if (!x?.what || !x?.does) { w.jevEli5 = { ...(w.jevEli5 ?? {}), [lane]: { fail: tried + 1, at: ctx.now() } }; return; }
  const card = { name: one(x.name) || lane, what: one(x.what), does: one(x.does), knob: one(x.knob), at: ctx.now(), by: "jev" };
  w.jevEli5 = { ...(w.jevEli5 ?? {}), [lane]: card };
  const old = rd(ctx, ELI5_GEN.file) ?? "# JEV-ELI5 · hover cards JEV wrote for new lanes (JEV-HOVER-ELI5-v2 L3). Savi checks each and promotes the good ones into scripts/lib/data/jev-eli5.js.\n";
  wr(ctx, ELI5_GEN.file, old + `- ${lane} · ${card.name} · what: ${card.what} · does: ${card.does} · knob: ${card.knob}\n`);
}
export function onFeatureSheet(ctx, r, p) {
  llmDone(ctx, "feature", r);
  const s = ctx.self.state; if (!s.featAsking || s.featAsking.at !== p?.at) return; const { id, ask } = s.featAsking; s.featAsking = null;
  const x = r?.ok ? r.data?.object : null; if (!x?.core) { s.featTried = (s.featTried ?? []).filter((t) => t !== id); return; } // retried next check
  const one = (v, n = 260) => oneLine(v, n);
  const list = (a, pre) => (a ?? []).map((v, i) => `${pre === "n" ? `${i + 1}.` : "-"} ${one(v)}`);
  let t = rd(ctx, FEAT.file) ?? "# FEATURES · JEV's sheet for each of the creator's new ideas\n<!-- JEV writes the sheet the moment an idea lands in CREATOR-NOW.md. Savi and Claude each add at least one idea of their own under their heading (\"- <idea>\"), then build. -->\n";
  t += ["", `## ${id} · ${one(x.title, 90)}`, `- the creator asked: ${one(ask, 500)}`, `- core: ${one(x.core, 300)}`,
    "### JEV's ideas to make it great", ...list(x.ideas, "n"), "### quality bar", ...list(x.qualityBar), "### risks", ...list(x.risks),
    "### work split", ...(x.savi ?? []).map((v) => `- Savi: ${one(v)}`), ...(x.claude ?? []).map((v) => `- Claude: ${one(v)}`),
    "### Savi adds", "- (pending)", "### Claude adds", "- (pending)", ""].join("\n");
  wr(ctx, FEAT.file, t);
  boardLog(ctx, `NEW CREATOR IDEA ${id}: JEV's feature sheet is on docs/board/FEATURES.md. Savi and Claude: add your ideas under it, then claim the work.`);
  { const m = `JEV wrote the feature sheet for the creator's idea ${id} on docs/board/FEATURES.md: add your ideas under it.`; ctx.notifyDm?.(m, { wake: false }); wakeEnqueue(ctx.self.state, "feature", m, ctx.now()); }
}

// ---- JEV DECIDES FOR SAVI: Claude posts a question to Savi, JEV answers it in Savi's seat on the board; Claude picks it up there ----
const RESERVED = "publishing or unpublishing; deleting or reverting the creator's work; moving Rolf's right side or his seat; closing GOAL 1; unparking a parked goal (GOAL P performance)";
function jevDecides(ctx, s, now) {
  const text = rd(ctx, "design.md") ?? "";
  // questions are remembered by their own line (a hash), never by a character offset: trimming or archiving design.md
  // can't make JEV skip a new question or re-answer an old one (board-history step 1, 2026-09-28)
  // FINDING 2026-09-28 (relay misfire): a trigger word must be a LABEL, not a mention. Only "- → Savi QUESTION:" / "- → Savi DECIDE:"
  // (optionally "- → Savi (Claude, <time>) QUESTION:") counts; relays of the creator's words and reports never do.
  const isQ = (l) => /^- → Savi(?: \([^)]{0,80}\))?:? (QUESTION|DECIDE)\b ?:/.test(l) && !/relaying|the CREATOR'?s words|^- ← /i.test(l.slice(0, 120));
  if (!s.decideSeen) { s.decideSeen = text.split("\n").filter(isQ).map((l) => hashOf(norm(l))).slice(-DECIDE.seenMax); delete s.decideAt; } // first run: everything already there counts as seen
  const seen = new Set(s.decideSeen); let added = false;
  for (const l of text.slice(-DECIDE.scanMaxChars).split("\n")) { if (!isQ(l)) continue; const h = hashOf(norm(l)); if (seen.has(h)) continue;
    seen.add(h); s.decideSeen.push(h); added = true; s.decideQ = [...(s.decideQ ?? []), { kind: "q", text: l.slice(0, 1500) }].slice(-DECIDE.queueMax); }
  if (added) s.decideSeen = s.decideSeen.slice(-DECIDE.seenMax);
  { const sd = smartDoc(ctx, s); if (sd) { const votes = readClaims(ctx).map.votes;
    for (const k of sd.list) if (k.source === "JEV-PROPOSED" && !votes[k.id.toUpperCase()]?.savi && !(s.decideVoted ?? []).includes(k.id) && !(s.decideQ ?? []).some((q) => q.id === k.id))
      s.decideQ = [...(s.decideQ ?? []), { kind: "j", id: k.id, text: `${k.id}: ${k.title} · owner ${k.owner} · why ${k.why} · done when ${k.done}` }].slice(-DECIDE.queueMax); } }
  if (s.decideAsking && now - s.decideAsking.at < DECIDE.timeoutMs) return;
  const q = (s.decideQ ?? [])[0]; if (!q) return;
  if (!llmFree(ctx, s, now)) return; // L4 cap: q stays at the head of the queue
  s.decideQ = s.decideQ.slice(1); s.decideAsking = { at: now, q };
  llmAsk(ctx, "decide");
  ctx.job("llm:generate", { model: "smart",
    system: `You are JEV deciding in Savi's seat on forge_wizard_34's Viking den team (the creator said: "JEV decides for Savi"). Savi is the builder in the world; Claude is the other builder. Decide like a sharp, practical game maker: goals in order (GOAL 1, Rolf plays guitar naturally, comes first; songs wait until the backlog is done; performance work is parked), never repeat a known mistake from FINDINGS, prefer the smallest change that proves itself with a measurement. RESERVED for the creator alone, never decide these: ${RESERVED}. If the question touches a reserved call, set reserved true and explain what the creator must choose. For a JEV-proposed task, vote YES only if it is concrete, under an approved goal, not a duplicate, and worth doing now.`,
    message: JSON.stringify({ item: q, goals: section(text, "## GOALS").slice(0, 20), now: section(text, "## NOW").slice(0, 14).map((l) => l.slice(0, 300)), findings: (rd(ctx, "docs/board/FINDINGS.md") ?? "").slice(-5000) }),
    schema: { type: "object", properties: { reserved: { type: "boolean" }, decision: { type: "string", enum: ["YES", "NO", "ANSWER"] }, answer: { type: "string" }, ref: { type: "string", description: "the task/question id it answers, e.g. C9, TASK 11, J3" } }, required: ["reserved", "decision", "answer", "ref"] },
  }, "onJevDecides", { at: now });
}
export function onJevDecides(ctx, r, p) {
  llmDone(ctx, "decide", r);
  const s = ctx.self.state; if (!s.decideAsking || s.decideAsking.at !== p?.at) return; const { q } = s.decideAsking; s.decideAsking = null;
  const x = r?.ok ? r.data?.object : null; if (!x?.answer) { s.decideQ = [q, ...(s.decideQ ?? [])].slice(0, DECIDE.queueMax); return; }
  const one = (v, n = 600) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  if (q.kind === "j") {
    s.decideVoted = [...(s.decideVoted ?? []), q.id].slice(-40);
    const vote = x.reserved ? null : x.decision === "NO" ? "NO" : "YES";
    if (vote) wr(ctx, SMART.claims, (rd(ctx, SMART.claims) ?? "") + `- ${q.id} · Savi · ${vote} · JEV for Savi: ${one(x.answer, 200)}\n`);
    boardLog(ctx, `JEV for Savi on ${q.id}: ${x.reserved ? "RESERVED for the creator" : vote}: ${one(x.answer, 240)}`);
  } else {
    // never let a decision name board ids the question didn't name (the invented TASK 11/12/13 scope of the misfire)
    const ids = (t) => new Set((String(t).match(/\b(TASK \d+|B-?[A-Z]{0,2}\d+(?:-\d+)?|C\d+|J\d+|GOAL [0-9]{1,2}|GOAL [A-Z]\b|V\d+|F\d+)\b/g) ?? []));
    const asked = ids(q.text), extra = [...ids(`${x.ref ?? ""} ${x.answer ?? ""}`)].filter((i) => !asked.has(i));
    if (extra.length) { boardLog(ctx, `JEV's answer in Savi's seat was DROPPED: it named ${extra.join(", ")}, which the question didn't. Question: ${one(q.text, 200)}`); return; }
    const line = x.reserved ? `- ← Savi (JEV in Savi's seat) ${one(x.ref, 30)}: RESERVED FOR THE CREATOR, not decided: ${one(x.answer)}` : `- ← Savi DECISION (JEV in Savi's seat) ${one(x.ref, 30)}: ${x.decision === "ANSWER" ? "" : x.decision + ": "}${one(x.answer)}`;
    bellAppend(ctx, [line]); // P2 (C1): JEV's decision in Savi's seat goes to BELL-LOG.md (unbatched: Claude's watcher picks it up there)
    if (x.reserved) wr(ctx, SMART.creatorNow, (rd(ctx, SMART.creatorNow) ?? "") + `- DECIDE-${one(x.ref, 20).replace(/\s+/g, "-")} · the creator decides: ${one(x.answer, 300)} · OPEN\n`);
  }
  ctx.notifyDm?.(`JEV decided in your seat (${one(x.ref, 30)}): ${x.reserved ? "reserved for the creator" : one(x.answer, 200)}`, { wake: false });
}

// ---- CHAT POINTS: fold new chat-mirror entries into docs/board/chat/POINTS.md (CHAT-MIRROR, creator 2026-09-28) ----
// bookmark = { date, ts, k }: the k-th entry stamped ts on that day was the last one read. Mirror files are append-only copies.
function chatEntries(text) { const out = []; for (const l of (text ?? "").split("\n")) { const m = /^\[(\d\d:\d\d:\d\d)\] (.*)$/.exec(l); if (m) out.push({ ts: m[1], t: m[2] }); else if (out.length && l.trim()) out[out.length - 1].t += "\n" + l; } return out; }
function chatPoints(ctx, s, now) {
  if (s.chatAsking && now - s.chatAsking.at < CHAT.timeoutMs) return;
  if (now - (s.chatLast ?? 0) < eff(ctx, "chat", CHAT.everyMs)) return;
  if (!llmFree(ctx, s, now)) return; // L4 cap: the bookmark and clock stay, the next check reads the same slice
  s.chatLast = now;
  const days = (ctx.world.files ?? []).filter((f) => f.startsWith(CHAT.dir) && /\/\d{4}-\d\d-\d\d\.md$/.test(f)).sort();
  if (!days.length) return;
  const mark = s.chatMark ?? null; let picked = [], day = null, size = 0, end = null;
  for (const f of days) {
    const date = f.slice(-13, -3); if (mark && date < mark.date) continue;
    const es = chatEntries(rd(ctx, f)); const fresh = [];
    // bookmark = entries already read on that day (the files are append-only), so a line stamped out of order is never skipped.
    // an older { ts, k } mark converts once: the position of its entry + 1.
    let skip = 0; if (mark && date === mark.date) { if (typeof mark.n === "number") skip = mark.n; else { const seen = {}; es.forEach((e, i) => { const k = seen[e.ts] = (seen[e.ts] ?? -1) + 1; if (e.ts === mark.ts && k === mark.k) skip = i + 1; }); } }
    es.forEach((e, i) => { if (i >= skip) fresh.push({ ...e, k: i }); });
    if (!fresh.length) continue;
    day = date; for (const e of fresh) { const line = `[${e.ts}] ${e.t}`; if (picked.length && size + line.length > CHAT.chunkChars) break; picked.push(line.slice(0, CHAT.chunkChars)); size += line.length; end = { date, ts: e.ts, k: e.k, n: e.k + 1 }; }
    break; // one day per call; the next check takes the rest
  }
  { // stale check: the mirror is Savi's per-turn copy; say so once an hour if the newest entry is >30 min old while someone is in the den
    const last = chatEntries(rd(ctx, days[days.length - 1])).pop(), date = days[days.length - 1].slice(-13, -3);
    const at = last ? Date.parse(`${date}T${last.ts}Z`) : 0, clock = ctx.now(); // the room clock; only trusted when it reads as a real date
    if (at && clock > 1.6e12 && clock - at > CHAT.staleMs) ctx.notifyDmOnce?.(`chat-stale-${new Date(ctx.now()).toISOString().slice(0, 13)}`, `chat mirror is ${Math.round((clock - at) / 60e3)} min behind: append the new creator/Savi lines to docs/board/chat/<date>.md.`);
  }
  if (!picked.length) return;
  const cur = rd(ctx, CHAT.points) ?? "";
  const chh = strHash(day + "\n" + picked.join("\n"));
  if (digestSame("chat", chh, s.chatHash)) { s.chatMark = end; return; } // L5: this slice was already pointed: move the bookmark, no ask
  s.chatAsking = { at: now, end, h: chh };
  llmAsk(ctx, "chat-points");
  ctx.job("llm:generate", { model: "fast",
    system: `You are JEV, the record keeper of forge_wizard_34's Viking den team (the creator, Savi the builder in the world, Claude the other builder). You read a slice of the creator↔Savi chat (${day}, UTC) and extract its points so anyone can get the full context without rereading the chat. MAJOR = a creator ask, decision, rule, approval/rejection, a thing built or found broken. minor = context worth keeping: preferences, small fixes, questions answered, numbers. Keep the creator's exact words in quotes for asks and rules. One point = one fact, one line. Stamp each with the [hh:mm:ss] of the chat line it comes from. Skip chatter. If a new point overturns an existing point in the current POINTS file, give that old point's stamp in supersedes (exactly as it appears, e.g. "2026-09-27 21:45:02").`,
    message: JSON.stringify({ day, slice: picked.join("\n"), currentPoints: cur.slice(-CHAT.pointsCtxChars) }),
    schema: { type: "object", properties: { points: { type: "array", maxItems: 60, items: { type: "object", properties: {
      ts: { type: "string", description: "hh:mm:ss from the chat line" }, weight: { type: "string", enum: ["MAJOR", "minor"] }, topic: { type: "string", enum: CHAT.topics },
      text: { type: "string" }, supersedes: { type: "string", description: "YYYY-MM-DD hh:mm:ss of an older point this overturns, or empty" } }, required: ["ts", "weight", "topic", "text", "supersedes"] } } }, required: ["points"] },
  }, "onChatPoints", { at: now });
}
export function onChatPoints(ctx, r, p) {
  llmDone(ctx, "chat-points", r);
  const s = ctx.self.state; if (!s.chatAsking || s.chatAsking.at !== p?.at) return; const { end, h: chh } = s.chatAsking; s.chatAsking = null;
  const x = r?.ok ? r.data?.object : null;
  if (!x || !Array.isArray(x.points)) { s.chatErrors = [...(s.chatErrors ?? []), { at: ctx.now(), why: r?.error?.code ?? "empty" }].slice(-5); return; } // bookmark stays: the slice is retried
  const one = (v, n = 400) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  let t = rd(ctx, CHAT.points) ?? `# CHAT POINTS · the creator↔Savi chat, major and minor points by topic\n<!-- Kept by JEV (board-jev.js chatPoints) from docs/board/chat/<date>.md. Each point: [date time] WEIGHT · fact. The day files are the exact words; search them by the stamp. A point marked SUPERSEDED was overturned later. Hand edits are fine; keep the stamp at the front. -->\n`;
  const secs = new Map(); let head = t; const parts = t.split(/\n(?=## )/); head = parts[0];
  for (const sec of parts.slice(1)) { const nl = sec.indexOf("\n"); secs.set(sec.slice(3, nl < 0 ? undefined : nl).trim(), nl < 0 ? "" : sec.slice(nl + 1).replace(/\s*$/, "")); }
  let added = 0;
  for (const q of x.points) {
    const ts = /^\d\d:\d\d:\d\d$/.test(q.ts) ? q.ts : end.ts, topic = CHAT.topics.includes(q.topic) ? q.topic : "other", txt = one(q.text); if (!txt) continue;
    const stamp = `${end.date} ${ts}`;
    const sup = one(q.supersedes, 19);
    if (/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(sup)) for (const [k, v] of secs) secs.set(k, v.replace(new RegExp(`^- \\[${sup}\\] (?!SUPERSEDED)`, "m"), `- [${sup}] SUPERSEDED by [${stamp}] · `));
    secs.set(topic, ((secs.get(topic) ?? "") + `\n- [${stamp}] ${q.weight === "MAJOR" ? "MAJOR" : "minor"} · ${txt}`).replace(/^\n/, "")); added++;
  }
  const order = [...CHAT.topics.filter((k) => secs.has(k)), ...[...secs.keys()].filter((k) => !CHAT.topics.includes(k))];
  head = head.replace(/\n<!-- bookmark:.*-->/, "").replace(/\s*$/, "") + `\n<!-- bookmark: ${end.date} entry ${end.n} (last read stamped ${end.ts}) -->`;
  wr(ctx, CHAT.points, head + "\n\n" + order.map((k) => `## ${k}\n${secs.get(k)}`).join("\n\n") + "\n");
  s.chatMark = end; s.chatN = (s.chatN ?? 0) + added; if (chh) { s.chatHash = chh; _digestH.chat = chh; } // L5
}

// ---- H8 KILL SWITCH (VOTE-SYSTEM, Claude's fix 3): STOP counts from any sign (it only freezes); GO needs the creator's own
// line in the chat mirror AND a new "← Savi CONFIRM JEV GO" line on design.md. Each STOP/GO/confirm counts once (hash-remembered).
function killSwitch(ctx, s) {
  const seen = new Set(s.killSeen ?? []), mark = (h) => { seen.add(h); s.killSeen = [...seen].slice(-200); };
  const days = (ctx.world.files ?? []).filter((f) => f.startsWith(CHAT.dir) && /\/\d{4}-\d\d-\d\d\.md$/.test(f)).sort().slice(-2);
  const ev = [];
  for (const f of days) chatEntries(rd(ctx, f)).forEach((e, i) => { const m = /^creator:\s*(.*)$/s.exec(e.t); if (m && (VOTE.stop.test(m[1]) || VOTE.go.test(m[1]))) ev.push({ h: sha256(`${f}#${i}`).slice(0, 12), stop: VOTE.stop.test(m[1]) }); });
  const board = rd(ctx, "design.md") ?? "";
  board.split("\n").forEach((l, i) => { if (/^(- ← \w+ )?JEV STOP\b/.test(l)) ev.push({ h: sha256(`board#${l}`).slice(0, 12), stop: true }); });
  const confirms = (board.match(new RegExp(VOTE.goConfirm.source, "gm")) ?? []).length;
  if (s.killSeen == null) { for (const e of ev) mark(e.h); s.killConfirms = confirms; return !!s.jevStopped; } // first run: history counts as read
  for (const e of ev) { if (seen.has(e.h)) continue; mark(e.h);
    if (e.stop) { if (!s.jevStopped) { s.jevStopped = true; ctx.notifyDm("JEV STOP heard: every automatic JEV step is frozen until the creator says JEV GO and Savi confirms on the board."); } }
    else if (s.jevStopped) s.jevGoAsked = true; }
  if (s.jevStopped && s.jevGoAsked && confirms > (s.killConfirms ?? 0)) { s.jevStopped = false; s.jevGoAsked = false; ctx.notifyDm("JEV GO confirmed: JEV's automation is running again."); }
  s.killConfirms = Math.max(s.killConfirms ?? 0, s.jevStopped ? (s.killConfirms ?? 0) : confirms);
  return !!s.jevStopped;
}

// ---- THE VOTE REFEREE (VOTE-SYSTEM, creator's go 2026-09-28 12:05): rules in scripts/lib/vote-referee.js, numbers in VOTE.
let _refJ = null; // P4: J-line key text of the last full pass (s.refKey carries its sha across a restart)
function referee(ctx, s, now) {
  if (now - (s.refLast ?? 0) < eff(ctx, "referee", VOTE.everyMs)) return; s.refLast = now; s.refChecks = (s.refChecks ?? 0) + 1;
  const text = rd(ctx, "design.md"); if (!text) return;
  if (s.refStart == null) { s.refStart = now; s.refLog = []; } // room clock: ms since the room began, it counts on across restarts
  const shadowOk = ["Savi", "Claude"].every((w) => new RegExp(`^- ← ${w} SHADOW OK\\b`, "m").test(text));
  const live = VOTE.mode === "live" || (now - s.refStart > VOTE.shadowMinMs && (s.refChecks ?? 0) >= VOTE.shadowMinChecks && shadowOk);
  // P4 (JEV-CHURN): parse J-lines only; skip verdict work while they (and live/shadowOk) are unchanged; the check above still counts. Full pass hourly anyway.
  const refText = bellRef(ctx), nDesign = text.split("\n").length, jl = jLines(text + refText), jt = `${live}|${shadowOk}|${jl}`, due = now >= (s.refDueAt ?? 0);
  if (!due && jt === _refJ) return;
  const jk = sha256(jt).slice(0, 16); _refJ = jt;
  if (!due && jk === s.refKey) return;
  s.refKey = jk; s.refDueAt = now + (VOTE.shadowRefreshMs ?? 3600e3);
  const P = parseBoard(jl);
  const closed = (x) => x.status.some((st) => /^(APPROVED|FAILED)$/.test(st.word));
  const legacyIds = new Set(VOTE.legacyIds), refLog = new Set(s.refLog), sealedAt = { ...(s.refSealedAt ?? {}) };
  const exists = (f) => { const all = ctx.world.files ?? []; return all.includes(f) ? f : all.find((p) => p.endsWith("/" + f)) ?? null; };
  const rows = [], writes = [];
  for (const x of P.ideas.values()) {
    if (legacyIds.has(x.id) || !x.text) continue;
    for (const se of x.seals) { const k = `${x.id}.${se.round}`; if (sealedAt[k] == null) sealedAt[k] = now; }
    const sheetPath = `${VOTE.dir}${x.id}.md`; let sheet = rd(ctx, sheetPath);
    if (!sheet && !x.seals.length) { sheet = sheetText(x, evidenceSheet(x, text + refText, exists, rd(ctx, "docs/board/FINDINGS.md"))); wr(ctx, sheetPath, sheet); } // frozen once anyone seals
    const sheetIds = new Set([...(sheet ?? "").matchAll(/^- (E\d+) /gm)].map((m) => m[1]));
    const res = judgeIdea(x, VOTE, { now, sheetIds, sealedAt });
    const line = refLine(res); if (!line) continue;
    rows.push(`- ${line}`);
    const last = x.status.filter((st) => /JEV REF/.test(st.raw)).pop()?.raw;
    if (live && !closed(x) && line !== last && (s.refWritten ?? {})[x.id] !== line) writes.push({ id: x.id, line });
  }
  s.refSealedAt = sealedAt;
  const forged = forgedStatus(P, refLog, new Set(VOTE.legacy)).filter((f) => f.line <= nDesign); // forgery judged on design.md lines only
  if (live && writes.length) {
    const log = [...refLog], done = { ...(s.refWritten ?? {}) };
    for (const w of writes) { log.push(statusHash(w.line)); done[w.id] = w.line; }
    bellAppend(ctx, writes.map((w) => w.line)); s.refLog = log.slice(-400); s.refWritten = done;
  }
  const newForged = forged.filter((f) => !(s.refFlagged ?? []).includes(f.hash));
  if (newForged.length) {
    s.refFlagged = [...(s.refFlagged ?? []), ...newForged.map((f) => f.hash)].slice(-200);
    if (live) { const t = rd(ctx, "design.md"); wr(ctx, "design.md", t.replace(/\s*$/, "\n") + newForged.slice(0, VOTE.findingsMax).map((f) => `- ← JEV REF FINDING: line ${f.line} "${f.raw.slice(0, 120)}" claims a verdict the referee never wrote; it is NOT obeyed (H1).`).join("\n") + "\n"); }
  }
  const body = `# REFEREE ${live ? "LIVE" : "SHADOW"} · what JEV's referee ${live ? "decided" : "WOULD decide"} (board-jev.js, rules: scripts/lib/vote-referee.js, numbers: VOTE)\n` +
    `<!-- shadow running ${((now - s.refStart) / 3600e3).toFixed(1)} h of 24 h (room clock), ${s.refChecks ?? 0} of ${VOTE.shadowMinChecks} checks; live needs 24 h + "← Savi SHADOW OK" + "← Claude SHADOW OK" on design.md (both there: ${shadowOk}) -->\n\n## Verdicts\n${rows.join("\n") || "- (no open JEV ideas since the referee started; J1-J5 closed before it)"}\n\n## Forged verdict lines (H1)\n${forged.map((f) => `- line ${f.line}: ${f.raw.slice(0, 160)}`).join("\n") || "- none"}\n`;
  const key = `${live}|${shadowOk}\n${rows.join("\n")}\n--forged--\n${forged.map((f) => `${f.line}:${f.raw.slice(0, 160)}`).join("\n")}`; // P1 JEV-CHURN: hash verdicts + forged + mode only, never the clock/check header
  const h = sha256(key).slice(0, 12); if (h !== s.refShadowHash || now - (s.refShadowAt ?? 0) >= (VOTE.shadowRefreshMs ?? 3600e3)) { wr(ctx, `${VOTE.dir}SHADOW.md`, body); s.refShadowHash = h; s.refShadowAt = now; }
}

// ---- THE INBOX BELL (CHANNEL HARDENING v2, creator GO 2026-09-28 12:29). Contract: scripts/lib/data/inbox.js; rules: scripts/lib/inbox-core.js.
// D1: reads CLAUDE.md + SAVI.md, never writes them; writes only DIGEST.md and s.inbox. D3: nothing here approves, votes, sets STATUS
// or asks JEV to decide; a wake is talk (a spoofed ASK can wake Savi: harmless, ≤1 / 2 min + daily cap, Claude's note a).
const clockIso = (t) => (t > 1.6e12 ? new Date(t).toISOString().slice(0, 16).replace("T", " ") + " UTC" : `room t+${Math.round(t / 60e3)} min`);
function inboxBell(ctx, s, now) {
  const b = { ...(s.inbox ?? {}) }; if (now - (b.readAt ?? -Infinity) < INBOX.everyMs) return; b.readAt = now;
  const F = { claude: parseInbox(rd(ctx, INBOX.files.claude) ?? "", INBOX), savi: parseInbox(rd(ctx, INBOX.files.savi) ?? "", INBOX) }; // missing file = empty
  const first = b.wake == null;
  // D2 wake: only Claude's ASK/NEED to Savi/all, gap + cap in planWake; the backlog at the first read counts as seen
  const pw = planWake(F[INBOX.wakeFrom].msgs, b.wake, now, INBOX); b.wake = pw.next;
  if (pw.wake) {
    const a = Math.min(...pw.asks), z = Math.max(...pw.asks), m1 = F.claude.msgs.find((x) => x.n === a), txt = String(m1?.text ?? "").replace(/\s+/g, " ").trim();
    { const m = `Claude's inbox: ${pw.asks.length} new ask(s) for you (#${a}${z !== a ? ".." + z : ""}): ${txt.length > 160 ? txt.slice(0, 160) + "…" : txt}. Read docs/board/inbox/CLAUDE.md, answer in SAVI.md, then write READ TO #${F.claude.maxN}.`; ctx.notifyDm(m, { wake: false }); wakeEnqueue(s, "ask", m, now); }
    b.lastWake = now; b.digestDue = true;
  }
  b.lastReason = pw.reason;
  // D4 health: gaps, dupes, bad lines, each flagged once (hash-remembered, last 50)
  // flagged keeps exactly the issues still present (live), never a last-N window: with > N live issues a window evicted and
  // re-flagged one every read (a note every 20 s forever); a fixed issue leaves the set and is flagged again if it comes back
  const flagged = new Set(b.flagged ?? []), live = new Set(), fresh = (k) => { const h = hashOf(k); live.add(h); if (flagged.has(h)) return false; flagged.add(h); return true; };
  if (pw.reason === "reset" && fresh(`reset:${pw.next.seen}`)) { b.digestSeen = { ...(b.digestSeen ?? {}), [INBOX.wakeFrom]: pw.next.seen }; ctx.notifyDm(`inbox health, ${INBOX.files[INBOX.wakeFrom].split("/").pop()}: its top number fell below the bell's bookmark (now #${pw.next.seen}): the file was reset or renumbered, and numbers never move (C2). Nothing woke; the bookmark follows the file.`, { wake: false }); }
  for (const [k, f] of Object.entries(F)) {
    const name = INBOX.files[k].split("/").pop(), say = [];
    const g = f.gaps.filter((n) => fresh(`${k}:gap:${n}`)); if (g.length) say.push(`number gap (missing #${g.join(", #")})`);
    const d = f.dupes.filter((n) => fresh(`${k}:dupe:${n}`)); if (d.length) say.push(`duplicate #${d.join(", #")} (the first one counts)`);
    const bad = f.bad.filter((l) => fresh(`${k}:bad:${l}`)); if (bad.length) say.push(`${bad.length} bad line(s): "${bad[0].slice(0, 100)}"`);
    if (say.length) ctx.notifyDm(`inbox health, ${name}: ${say.join("; ")}. Numbers never move (C2): the writer fixes it by a new line, never by renumbering.`, { wake: false });
  }
  // stale read: a Claude ASK/NEED to Savi above SAVI.md's READ TO for > staleMs (room clock since the bell first saw it), one reminder each
  const readTo = F.savi.readTo ?? 0, askAt = {};
  for (const x of F.claude.msgs) if (x.n > readTo && INBOX.wakeLabels.includes(x.label) && (x.to === "Savi" || x.to === "all")) askAt[x.n] = (b.askAt ?? {})[x.n] ?? now;
  const stale = Object.keys(askAt).map(Number).filter((n) => now - askAt[n] > (INBOX.staleMs ?? 30 * 60e3) && fresh(`stale:${n}`));
  if (stale.length) ctx.notifyDm(`inbox: Claude's ask${stale.length > 1 ? "s" : ""} #${stale.length > 6 ? stale.slice(0, 5).join(", #") + ` … #${stale.at(-1)} (${stale.length})` : stale.join(", #")} ${stale.length > 1 ? "are" : "is"} still above your READ TO #${readTo} in SAVI.md after ${Math.round((INBOX.staleMs ?? 30 * 60e3) / 60e3)} min. Answer in SAVI.md and move READ TO.`, { wake: false });
  b.askAt = askAt; b.flagged = [...flagged].filter((h) => live.has(h)).slice(-2000);
  // status for reads
  Object.assign(b, { claudeTop: F.claude.maxN, saviTop: F.savi.maxN, saviReadTo: F.savi.readTo, claudeReadTo: F.claude.readTo, wakesToday: b.wake.day === dayKey(now) ? b.wake.wakes : 0, held: b.wake.pending.length });
  // D5 digest: on a wake or ≥ digestMinNew new messages; one in flight; cites or dies (filterDigest in onInboxDigest)
  const top = { claude: F.claude.maxN, savi: F.savi.maxN };
  if (first || b.digestSeen == null) b.digestSeen = { ...top }; // the backlog counts as seen, like the wake
  const newMsgs = ["claude", "savi"].flatMap((k) => F[k].msgs.filter((x) => x.n > (b.digestSeen[k] ?? 0)).map((x) => ({ file: k, ...x })));
  // cost review: ≤ 1 digest ask per digestMinGapMs; a failing LLM backs off (timeout × 2^fails, ≤ ×8); a burst past digestMaxMsgs digests the OLDEST first and
  // advances only past what it sent, so the rest goes in the next digest (never skipped)
  const busy = b.digesting && now - b.digesting.at < INBOX.digestTimeoutMs, cooling = now - (b.digestFailAt ?? -Infinity) < INBOX.digestTimeoutMs * Math.min(8, 2 ** (b.digestFails ?? 0)), spaced = now - (b.digestAskAt ?? -Infinity) >= (INBOX.digestMinGapMs ?? 120e3);
  if (newMsgs.length && (newMsgs.length >= INBOX.digestMinNew || b.digestDue) && !busy && !cooling && spaced && llmFree(ctx, s, now)) { // L4 cap: digestSeen stays, the next read digests
    const sorted = newMsgs.sort((p, q) => (p.stamp < q.stamp ? -1 : p.stamp > q.stamp ? 1 : p.n - q.n)), sent = sorted.slice(0, INBOX.digestMaxMsgs), rest = sorted.slice(INBOX.digestMaxMsgs);
    for (const k of ["claude", "savi"]) { const left = rest.filter((x) => x.file === k).map((x) => x.n); if (left.length) top[k] = Math.max(b.digestSeen[k] ?? 0, Math.min(...left) - 1); }
    const pick = sent.filter((x) => x.n <= top[x.file]).map((x) => ({ file: x.file, n: x.n, label: x.label, to: x.to, text: String(x.text).slice(0, INBOX.maxMsgChars) }));
    const ih = strHash(JSON.stringify(pick));
    if (digestSame("inbox", ih, b.digestHash)) { b.digestSeen = { claude: Math.max(b.digestSeen.claude ?? 0, top.claude), savi: Math.max(b.digestSeen.savi ?? 0, top.savi) }; b.digestDue = false; s.inbox = b; return; } // L5: these exact messages are already digested
    b.digesting = { at: now, top, from: { ...b.digestSeen }, n: pick.length, h: ih }; b.digestAskAt = now;
    llmAsk(ctx, "inbox-digest");
    ctx.job("llm:generate", { model: "fast",
      system: "You are JEV, the record keeper of a two-builder game team (Savi builds in the world, Claude builds outside it). Summarize the NEW messages from their inbox files for whoever comes back, so they know what was said without rereading. Each message has file (claude = written by Claude in CLAUDE.md, savi = written by Savi in SAVI.md) and number n. Rules: one item = one point; every item names its file and lists in cites the n numbers (of THAT file only) it rests on; say nothing a cited message does not say; never answer, approve, decide, vote or give orders: you report what was said, nothing more. Keep asks marked as asks and say who they are for. Short, plain lines.",
      message: JSON.stringify({ messages: pick }),
      schema: { type: "object", properties: { items: { type: "array", maxItems: 40, items: { type: "object", properties: {
        file: { type: "string", enum: ["claude", "savi"] }, text: { type: "string" }, cites: { type: "array", items: { type: "integer" } } }, required: ["file", "text", "cites"] } } }, required: ["items"] },
    }, "onInboxDigest", { at: now, top });
  }
  s.inbox = b;
}
export function onInboxDigest(ctx, r, p) {
  llmDone(ctx, "inbox-digest", r);
  const s = ctx.self.state, b = { ...(s.inbox ?? {}) }; if (!b.digesting || b.digesting.at !== p?.at) return; // a late answer to an ask already given up on
  if (s.jevStopped) { b.digesting = null; s.inbox = b; return; } // H8: a STOP heard while the digest was out: nothing written, digestSeen stays (redone after GO)
  const { from, top, h: askedH } = b.digesting; b.digesting = null;
  const x = r?.ok ? r.data?.object : null;
  if (!x || !Array.isArray(x.items)) { b.digestFailAt = ctx.now(); b.digestFails = (b.digestFails ?? 0) + 1; b.digestErrors = [...(b.digestErrors ?? []), { at: ctx.now(), why: r?.error?.code ?? "empty" }].slice(-5); s.inbox = b; return; } // digestSeen stays: retried
  const valid = { claude: new Set(parseInbox(rd(ctx, INBOX.files.claude) ?? "", INBOX).msgs.map((m) => m.n)), savi: new Set(parseInbox(rd(ctx, INBOX.files.savi) ?? "", INBOX).msgs.map((m) => m.n)) };
  const kept = []; let dropped = 0;
  for (const k of ["claude", "savi"]) { const f = filterDigest(x.items.filter((it) => it?.file === k), valid[k]); dropped += f.dropped.length; for (const it of f.kept) kept.push({ k, ...it }); }
  dropped += x.items.filter((it) => it?.file !== "claude" && it?.file !== "savi").length;
  const head = `# INBOX DIGEST · "since you left", kept by JEV (board-jev.js inboxBell) · written ONLY by the bell\n<!-- D5: every line cites existing message numbers ([claude #N] = docs/board/inbox/CLAUDE.md, [savi #N] = SAVI.md); lines citing a missing number are dropped by code. A digest line is a pointer, never an answer or a decision (D3): read the cited messages. -->\n`;
  const sec = `## since #${(from.claude ?? 0) + 1} (claude) / #${(from.savi ?? 0) + 1} (savi) · ${clockIso(ctx.now())} · up to claude #${top.claude} / savi #${top.savi} · ${kept.length} kept, ${dropped} dropped\n` +
    (kept.map((it) => `- [${it.k} #${[...new Set(it.cites)].sort((a, c) => a - c).join(", #")}] ${it.text}`).join("\n") || "- (nothing citable)");
  const old = (rd(ctx, INBOX.digest) ?? "").split(/\n(?=## )/).slice(1).map((t) => t.replace(/\s*$/, ""));
  if (kept.length) wr(ctx, INBOX.digest, head + "\n" + [sec, ...old].slice(0, INBOX.digestKeep ?? 20).join("\n\n") + "\n"); // P6 JEV-CHURN: a section with nothing citable is only a range + clock
  b.digestSeen = { claude: Math.max(b.digestSeen?.claude ?? 0, top.claude), savi: Math.max(b.digestSeen?.savi ?? 0, top.savi) }; b.digestDue = false; b.digestFails = 0;
  if (askedH) { b.digestHash = askedH; _digestH.inbox = askedH; } // L5
  b.digests = (b.digests ?? 0) + 1; b.lastDigest = { at: ctx.now(), kept: kept.length, dropped }; s.inbox = b;
}

// ---- IDLE WATCH (creator 2026-09-28, plan docs/board/proposals/IDLE-WATCH.md). Reads CLAUDE.md, SAVI.md, CLAIMS.md, CREATOR-NOW.md and the smart
// list row; writes ONLY docs/board/PRESENCE.md (on a state change) and s.presence; wakes Savi within its own budget. Talk only (inbox C1).
function presence(ctx, s, now) {
  const m = { ...(s.presence ?? {}) }; if (now - (m.readAt ?? -Infinity) < INBOX.everyMs) return; m.readAt = now;
  const C = parseInbox(rd(ctx, INBOX.files.claude) ?? "", INBOX), S = parseInbox(rd(ctx, INBOX.files.savi) ?? "", INBOX), cl = readClaims(ctx);
  // last seen, room clock: when the bell first saw a new message / CLAIMS line from each (first read = now: assume working)
  const claimsBy = (w) => cl.text.split("\n").filter((l) => new RegExp(`^- [^·]+ · ${w} · `, "i").test(l.trim())).length;
  const mark = { Savi: `${S.maxN}/${claimsBy("Savi")}`, Claude: `${C.maxN}/${claimsBy("Claude")}` }, seen = { ...(m.seen ?? {}) }, marks = { ...(m.marks ?? {}) };
  for (const w of ["Savi", "Claude"]) if (marks[w] !== mark[w]) { marks[w] = mark[w]; seen[w] = now; }
  { const last = S.msgs[S.msgs.length - 1]; if (last && /^turn done\b/i.test(String(last.text).trim()) && seen.Savi != null) seen.Savi = Math.min(seen.Savi, now - PRES.quietMs); } // CLAUDE #30: Savi works in turns: her "turn done" INFO line makes her idle at once (the 10-min window stays Claude's)
  const lastAB = [...C.msgs].reverse().find((x) => /^(AWAY|BACK|USAGE MAXED)\b/i.test(String(x.text).trim()));
  const claudeAway = !!lastAB && /^(AWAY|USAGE MAXED)/i.test(String(lastAB.text).trim());
  const cnow = (rd(ctx, SMART.creatorNow) ?? "").replace(/<!--[\s\S]*?-->/g, "").split("\n").filter((l) => /^- /.test(l) && !/·\s*DONE\b/i.test(l));
  const out = presencePlan({ prev: m.mem ?? {}, claims: cl.map, seen, claudeAway, list: smartDoc(ctx, s)?.list ?? [], creatorNow: cnow, now, day: dayKey(now), P: PRES });
  for (const a of out.actions) { ctx.notifyDm(a.text, { wake: false }); if (a.kind === "wakeSavi") wakeEnqueue(s, "idle", a.text, now); ctx.log("idle watch", a); }
  // since = the room time a state began, shown as minutes on the room clock the reader can compare between two reads
  const since = { ...(m.since ?? {}) }, st = { ...(m.st ?? {}) };
  for (const w of ["Savi", "Claude"]) if (st[w] !== out.rows[w].st) { st[w] = out.rows[w].st; since[w] = clockIso(now); }
  const push = out.rows.Claude.st === "IDLE" && out.mem.pushes.Claude?.open ? out.rows.Claude.next : null;
  const body = presenceRender({ rows: out.rows, since, waiting: out.waiting, flagged: out.flagged, push });
  // JEV-CHURN P6: state flips write at once (Claude C5); note / next / waiting-only diffs at most every PRES.refreshMs
  const key = hashOf(JSON.stringify([...["Savi", "Claude"].map((w) => [out.rows[w].st, out.rows[w].open, out.rows[w].stale ?? null]), push, out.flagged ?? []]));
  const h = hashOf(body); if (h !== m.hash && (key !== m.key || now - (m.wroteAt ?? -Infinity) >= (PRES.refreshMs ?? 5 * 60e3))) { m.hash = h; m.key = key; m.wroteAt = now; wr(ctx, PRES.file, body); }
  Object.assign(m, { seen, marks, since, st, mem: out.mem });
  s.presence = m;
}

// ---- WAKE QUEUE v2 (creator + Claude GO 2026-09-28, SAVI #18 / CLAUDE #27): arm, grade, check LANDED; the sender is scripts/savi-wake.js
function wakeQueue(ctx, s, now) {
  const S = parseInbox(rd(ctx, INBOX.files.savi) ?? "", INBOX), cl = readClaims(ctx);
  const claims = cl.text.split("\n").filter((l) => /^- [^·]+ · Savi · /i.test(l.trim())).length;
  wakeTick(s, now, `${S.maxN}/${S.readTo ?? 0}/${claims}`, (q) => {
    llmAsk(ctx, "wake-brief"); // time-bound (the wake waits on it): bypasses the cap, counts toward it
    ctx.job("llm:generate", { model: "fast",
      system: "You are JEV, the dispatcher of a two-builder game team. Savi (builds in the world) is idle and about to be woken. Given the reasons queued for her wake, (1) grade: 'now' only if Claude is blocked on her or the item is critical/broken for the creator, 'soon' for a normal ask or task, 'batch' if every reason is a pitch/notice that can wait; (2) brief: ONE short note ordering what she does first, then next, citing message numbers (#N) or ids (D14, S20, TASK 11) that appear in the reasons, never inventing any; (3) top: the first item in under 12 words. Plain text, no markdown.",
      message: JSON.stringify({ reasons: q.reasons.map((r) => ({ kind: r.kind, text: r.text })) }),
      schema: { type: "object", properties: { grade: { type: "string", enum: ["now", "soon", "batch"] }, brief: { type: "string" }, top: { type: "string" } }, required: ["grade", "brief", "top"] },
    }, "onWakeBrief", { id: q.id, n: q.reasons.length });
    return true;
  });
  // JEV-CHURN P6: content = log rows + queue id/grade/escalate/reasons, spaced WAKE.ledgerGapMs; jev/ARMED/tries-only at most every WAKE.refreshMs
  const body = wakeLedger(s, clockIso, rd(ctx, WAKE.ledger)), h = hashOf(body), wq = s.wakeQ;
  const key = hashOf(JSON.stringify([s.wakeLog ?? [], wq ? [wq.id, wq.grade ?? wq.floor, !!wq.escalate, (wq.reasons ?? []).map((r) => r.text)] : null]));
  const gap = now - (s.wakeLedgerAt ?? -Infinity);
  if (h !== s.wakeLedgerHash && (key !== s.wakeLedgerKey ? gap >= (WAKE.ledgerGapMs ?? 60e3) : gap >= (WAKE.refreshMs ?? 5 * 60e3))) { s.wakeLedgerHash = h; s.wakeLedgerKey = key; s.wakeLedgerAt = now; wr(ctx, WAKE.ledger, body); }
}
export function onWakeBrief(ctx, r, p) { llmDone(ctx, "wake-brief", r); wakeOnBrief(ctx.self.state, r, p); }

// ---- BUILD QUEUE (creator go 2026-09-29, docs/board/proposals/BUILD-QUEUE.md Q-B): plain code, no JEV call. Rebuilt when a source file
// changes, and once an hour so the "approved N h ago" ages stay true. s.queueRev bumps on each rewrite (the build book reads it).
let queueSrc = null;
function buildQueue(ctx, s, now) {
  const prioText = rd(ctx, VL.files.priority) ?? ""; // VOTE-LEDGER L9a: PRIORITY.md (the creator's ★ pins) is a rebuild source too
  const src = BQ.sources.map((f) => rd(ctx, f) ?? "").join("\n") + "\n" + (rd(ctx, BQ.shelf) ?? "") + "\n" + prioText;
  const hour = Math.floor(now / 3600e3);
  if (src === queueSrc && s.queueHour === hour) return;
  queueSrc = src; s.queueHour = hour;
  const rows = BQ.sources.flatMap((f) => parseApproved(rd(ctx, f))), shelfText = rd(ctx, BQ.shelf) ?? "", cur = rd(ctx, BQ.file) ?? "";
  const prio = parsePriority(prioText), pins = prio.pins ?? [];
  let ranked = queueRank(rows, { shelfText, now, pins });
  if (pins.length) { // V-c: a pin that is no longer TODO/BUILDING leaves PRIORITY.md for '## Unpinned', written once, then the queue ranks the rest
    const { keep, gone } = prunePins(pins, ranked, rows, { queueText: cur });
    if (gone.length) {
      const ids = new Set(gone.map((g) => g.id));
      const unpinned = [...gone, ...(prio.unpinned ?? []).filter((u) => !ids.has(u.id))].slice(0, VL.pinCap * 2);
      const next = renderPriority({ ...prio, pins: keep, unpinned });
      if (next !== prioText) { wr(ctx, VL.files.priority, next); queueSrc = src.slice(0, src.length - prioText.length) + next; boardLog(ctx, `pins ${gone.map((g) => `${g.id} (${g.why})`).join(", ")} left PRIORITY.md.`); }
      ranked = queueRank(rows, { shelfText, now, pins: keep });
    }
  }
  let text = queueRender(ranked, now, `refreshed ${clockIso(now)}`);
  { // JEV-LEDGER L4: queue entries that build the same thing@place, named under the queue (MERGE card stays the creator's call)
    const todo = ranked.filter((r) => !/DONE/i.test(String(r.status ?? ""))).map((r) => r.id), g = keyGroups(todo, ledgerRows(ctx));
    if (g.length) text = text.replace(/\s*$/, "\n") + "\n## Same thing@place (JEV-LEDGER)\n" + g.map(([k, ids]) => `- ${k}: ${ids.join(", ")}`).join("\n") + "\n"; }
  text = withMerged(text, cur); // D5: a rebuild keeps every sealed MERGE (and its MERGED→ rows)
  if (cur.replace(/^refreshed .*$/m, "") === text.replace(/^refreshed .*$/m, "")) return; // same order and ages: no commit
  wr(ctx, BQ.file, text); s.queueRev = (s.queueRev ?? 0) + 1;
}

// ---- VOTE-LEDGER ADDENDUM J (L9a): JEV's daily top 5. Once per dayKey (s.jevSugDay), never while his gauge reads RESTING (that day is
// skipped, tomorrow tries again), metered like every ask. JEV only suggests: the block sits under '## JEV suggests' in PRIORITY.md,
// and a creator's ★ (view-settings) is the only thing that pins. A failed or empty answer keeps yesterday's block.
// Pending = open TODO rows of the current queue, less any MERGED→ row. Pure: (rankedRows, queueText, indexText, now) → [{ id, line }]
export function jevSuggestBrief(ranked, queueText = "", indexText = "", max = VL.rowsMax) {
  const merged = new Set([...String(queueText).matchAll(/^\d+\. \[([DS]\d+)\] .* · MERGED→/gm)].map((m) => m[1]));
  const keys = new Map([...String(indexText).matchAll(/^([DS]\d+) (\S+@\S+)/gm)].map((m) => [m[1], m[2]]));
  return (ranked ?? []).filter((r) => r.status === "TODO" && !merged.has(r.id)).slice(0, max).map((r) => ({ id: r.id,
    line: `${r.id} · ${keys.get(r.id) ?? "?"} · ${String(r.title ?? "").replace(/\s+/g, " ").slice(0, VL.titleMax)} · size ${r.size ?? "?"} · score ${r.score ?? 0} · ${r.days != null ? Math.round(r.days) + " d waiting" : "waiting since before 29 Sep"}${r.why ? " · " + r.why : ""}` }));
}
// Pure: JEV's picks, invented / not-pending / repeated ids dropped, why ≤ 90 chars, at most VL.jev.picks
export function jevSuggestPicks(answer, pendingIds) {
  const ok = new Set(pendingIds ?? []), seen = new Set(), out = [];
  for (const p of Array.isArray(answer?.picks) ? answer.picks : []) {
    const id = String(p?.id ?? "").trim().toUpperCase(); if (!ok.has(id) || seen.has(id)) continue; seen.add(id);
    const why = String(p?.why ?? "").replace(/\s+/g, " ").replace(/[\n\r·]/g, " ").trim().slice(0, 90); out.push({ id, why: why || "JEV's pick" });
    if (out.length >= VL.jev.picks) break;
  }
  return out;
}
function jevPending(ctx, now) {
  const ranked = queueRank(BQ.sources.flatMap((f) => parseApproved(rd(ctx, f))), { shelfText: rd(ctx, BQ.shelf) ?? "", now, pins: parsePriority(rd(ctx, VL.files.priority) ?? "").pins ?? [] });
  return jevSuggestBrief(ranked, rd(ctx, BQ.file) ?? "", rd(ctx, VL.files.index) ?? "");
}
function jevSuggest(ctx, s, now) {
  const day = dayKey(now);
  if (!day || s.jevSugDay === day) return;
  if (s.jevSugAsking && now - (s.jevSugAsking.at ?? 0) < LLMCAP.staleMs) return;
  const load = jevLoad(s, ctx.getObject("jev-board")?.state, now, ctx.world.state?.jevMeter, null);
  if (load?.word === "RESTING") { s.jevSugDay = day; boardLog(ctx, `JEV rests: no top 5 today (${day}); tomorrow he tries again.`); return; }
  const pending = jevPending(ctx, now);
  if (!pending.length) { s.jevSugDay = day; return; }
  if (!llmFree(ctx, s, now)) return; // capped: the next update tries again, the day is not spent
  s.jevSugDay = day; s.jevSugAsking = { at: now };
  llmAsk(ctx, "jev-suggest");
  ctx.job("llm:generate", { model: VL.jev.model,
    system: `You are JEV, the rune-keeper of a cozy low-poly Viking den. From the pending build list ONLY (each line: id · thing@place · title · size · score · days waiting · why), pick the ${VL.jev.picks} builds the den should get next, best first. Favour small builds that plug into what already stands, ideas that finish a place, and long waits. Each why: one plain line, at most 90 characters. Never invent an id.`,
    message: pending.map((p) => p.line).join("\n").slice(0, 12000),
    schema: { type: "object", properties: { picks: { type: "array", minItems: 1, maxItems: VL.jev.picks, items: { type: "object", properties: { id: { type: "string", enum: pending.map((p) => p.id) }, why: { type: "string", maxLength: 90 } }, required: ["id", "why"] } } }, required: ["picks"] },
  }, "onJevSuggest", { day, at: now });
}
export function onJevSuggest(ctx, r, p) {
  llmDone(ctx, "jev-suggest", r);
  const s = ctx.self.state; s.jevSugAsking = null;
  if (!r?.ok) return; // keep yesterday's block
  const now = ctx.now(), picks = jevSuggestPicks(r.data?.object, jevPending(ctx, now).map((x) => x.id));
  if (!picks.length) return;
  const old = rd(ctx, VL.files.priority) ?? "", prio = parsePriority(old);
  const next = renderPriority({ ...prio, jev: { at: p?.at ?? now, day: p?.day ?? dayKey(now), picks } }); // JEV never touches pins
  if (next !== old) { wr(ctx, VL.files.priority, next); boardLog(ctx, `JEV suggests ${picks.map((x) => x.id).join(", ")} (PRIORITY.md).`); }
}
