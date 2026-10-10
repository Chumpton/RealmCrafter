// WATCHER · Heimdall's gate (docs/board/proposals/WATCHER.md, both GOs 2026-09-29, Claude's V1-V8 folded in).
// The contract every watcher file reads. Only the creator changes POINTS and the schema.
// HEIMDALL (creator's go 2026-10-01: "HEIMDALL is a go from me"): one watcher, all points, two sittings. Undo: HEIM_ON = false.
// REVIEW-CAPS (creator 2026-10-01: "each review needs a specified cap, and we need a maximum cap (that gives spawn a 25% overhead)").
// Spawn team, Oct 1: the long reviews were CUT OFF past the job's time, not refused; the fast tier answers in ~10-20 s with fewer edits.
// Per review: fast model, a 24k feed, <= 4 edits, short fields, a 45 s deadline. The gate as a whole: 75% of each ceiling, 25% left to Spawn.
export const FIX = { jobGate: true }; // HEIMDALL-FIX-A: per-plan cap on once the new meter is seen loaded (pre-mortem 1)
export const CAPS = {
  headroom: 0.25,          // the share of every ceiling the den never uses
  model: "fast",           // ~10-20 s a review (Spawn); "smart" is what got cut off
  reviewMs: 60000,         // one review's ceiling: Spawn's fast answers sit well inside it
  jobsCeiling: 48,         // review jobs an hour the den could send at most (24 two-sitting plans)
  feedChars: 24000,        // what one review reads
  edits: 4,                // what one review may write back
  field: 220,              // evidence / why, chars
  long: 360,               // walk / breaker / an edit's text, chars
};
const AT = 1 - CAPS.headroom; // 0.75
const HEIM_ON = true; // the one undo: false = MÍMIR + VÖR (+ SAGA) exactly as before
export const WATCH = {
  on: true,
  heimdall: { on: HEIM_ON }, // seatsFor -> ["heimdall"]; a would-pass sitting 1 earns sitting 2 (heimdall2, CONFIRM); lowest score per point wins                 // V6 watcher.on
  learn: false,             // J3, off until one clean week
  pitches: false,           // J4, off until one clean week
  proposalsDir: "docs/board/proposals/",
  logFile: "docs/board/watcher/LOG.md",   // JEV appends once per verdict (V5)
  rulingsFile: "docs/board/RULINGS.md",
  findingsFile: "docs/board/FINDINGS.md",
  watchedSuffix: ".watched.md",           // proposals/<NAME>.watched.md, one write per round
  statusRe: "^Status:\\s*([A-Z]+)(?:\\s*(\\d)\\/\\d)?(?:\\s*→\\s*(Savi|Claude))?", // WATCHERS-AAA L1: "/5", "/6" or "/7"; groups unchanged // header line, anywhere in the first 12 lines
  states: ["SUBMITTED", "PREFLIGHT", "REVIEW", "WATCHED", "RETURNED", "CONTESTED"], // writer sets SUBMITTED only
  maxRounds: 20,                           // creator 2026-10-01: "maybe 10 rounds, or 20, things need to be ironed out 100%"
  lockPasses: true,                        // HEIMDALL-CONVERGE, creator GO 2026-10-02 ("go"): a passed point holds while its quote stands (scripts/lib/watcher-lock.js); false = every round re-judges all
  maxPreflights: 6,                        // pre-flight bounces (0 seats) a plan may take before CONTESTED; they spend no round
  maxWallMs: 20 * 60 * 1000,              // V4: CONTESTED 20 min after the round is DISPATCHED to the seats (Claude #89: queue time on the
                                          // job budget no longer counts; Savi #78 caught DEDUPE-v2 walled before any seat was asked)
  maxQueueMs: 90 * 60 * 1000,             // a round waiting on the job budget is CONTESTED after 90 min queued (the board still never stalls)
  claudeAway: true,                       // creator 2026-09-30: Claude offline until Friday: every closed round (returned, watched, contested) goes to Savi; false = the normal Savi<->Claude hand-off
  feedCapChars: 24000,  // HEIMDALL keeps 24k: 14k cut named files at preflight (box test, Oct 1); the saving is one job at a time            // LIGHT 2026-10-01 (creator "lighter versions"): was 40000; Spawn's AI dropped every 40k seat job
                                                             // V2 order: PROTECTED findings, matching findings, RULINGS, named file ranges
  perFileCapChars: 5000,  // LIGHT: was 8000
  checklistCapChars: 3000, // LIGHT: was 6000               // the CHECKLIST's share of the feed (newest lines kept); it grew past 12 KB and cut named files
  namedCapChars: 15000,  // LIGHT: was 26000                   // Claude #79: named files come first, up to this much of the feed
  refDir: "docs/board/watcher/ref/",     // #73/#75: <NAME>.md = engine-reference lines for the plan's API words, source path per line
  refCapChars: 4000,   // LIGHT: was 8000
  timeoutMs: HEIM_ON ? Math.round(CAPS.reviewMs * AT) : 180000, // REVIEW-CAPS: 45 s a review, then the retry/close path runs                      // one reviewer job; also the watchAsking lane's timeout (V7)
  perPlanJobs: 8, // HEIMDALL-FIX-A G0: one plan may spend at most 8 of the den's jobs an hour (creator: "pick 8")
  jobsPerHour: HEIM_ON ? Math.floor(CAPS.jobsCeiling * AT) : 50, // REVIEW-CAPS: 36 an hour (75% of 48) // WATCHER-SPEED S1 (creator "Yes" 2026-09-30): Spawn's llm:generate only, never Claude's tokens; 25 two-seat rounds an hour
  maxParallel: 1, // LIGHT: was 2, one plan in review at a time
  maxEdits: HEIM_ON ? CAPS.edits : 8,          // LIGHT: was 24. MÍMIR/VÖR's long answers (up to 24 edits) never came back; SAGA's short ones did. Same 7 points and 0-4 scores
  seatStaggerMs: 45000, // LIGHT: seats of one round go 45 s apart, not all at once; 0 = together
  pruneOn: true,           // WATCH-ARCHIVE (creator "yes" 2026-09-30): closed rows MOVE to archiveFile (never dropped); false = keep all in state
  archiveFile: "docs/board/watcher/ARCHIVE.md", // one line per plan: "<NAME> <json of the row>"; sole writer watcher-clerk.js
  pruneMs: 10 * 60 * 1000, // Savi #86 (board-bell over K1's 12,000 chars): a closed row (WATCHED/CONTESTED, or its plan left the gate) leaves
                           // state 10 min after closing; <name>.watched.md and LOG.md keep the record. RETURNED rows stay (they carry the round).  // WATCHER-SPEED S2/S8: plans in review at once; 1 = the old one-at-a-time gate (the one-line undo)
  model: HEIM_ON ? CAPS.model : "smart",
  pollEverySec: 10,                       // rides board-jev's update clock, no new poller
  shadowPlans: 5, keepBar: 0.7,           // V6
  requiredSections: ["ask", "gate", "slices", "contract", "proof", "not verified"], // lower-case heading/label words H0 looks for
  reviewers: {
    mimir: { title: "Principal Engineer, Code Review", name: "MÍMIR", leads: ["GROUNDED", "CONTRACTED", "SOUND"] },
    vor: { title: "Principal Game Systems Designer", name: "VÖR", leads: ["FAITHFUL", "SOUND"] },
    saga: { title: "Art & Feel Director", name: "SAGA", leads: ["FEEL"], art: true }, // W7: sits only when WATCH.aaa and art.triggers match
    heimdall: { title: "Watcher of the Gate: engineer, systems designer and art director in one", name: "HEIMDALL", leads: ["GROUNDED", "FAITHFUL", "CONTRACTED", "PROVABLE", "SOUND", "HARDENED", "FEEL"] },
    heimdall2: { title: "Watcher of the Gate, second sitting: the breaker who confirms a pass", name: "HEIMDALL · CONFIRM", leads: ["GROUNDED", "FAITHFUL", "CONTRACTED", "PROVABLE", "SOUND", "HARDENED", "FEEL"] },
    solo: { title: "Plan Reviewer, both roles (docs-only fast lane)", name: "MÍMIR-and-VÖR", leads: ["GROUNDED", "FAITHFUL", "CONTRACTED", "PROVABLE", "SOUND"], solo: true },
  },
  // WATCHER-KIN W2 + Claude K-b: a plan whose "Files this plan changes" line names at most maxFiles paths, ALL under docs/, gets one seat
  // for all five points. Any scripts/ or data file (they change behaviour) keeps both seats.
  fastLane: { on: true, maxFiles: 2, prefix: "docs/" },
  // ---- WATCHERS-AAA (WATCHED 5/5 round 3, creator "its a go" + lock-in 2026-09-30). The only gate since lane L6 (D4b) cut the legacy path.
  preBuild: true, // HEIMDALL-PRE (creator GO 2026-10-01): judge a plan on evidence that can exist before it is built; false = the gate as before, byte for byte
  aaa: true, // constant since L6: the legacy path is gone; kept as a name because tests and docs read it
  feedQuotes: true,        // HEIMDALL-J2 (creator GO 2026-10-01): feed the lines a plan quotes; false = the old feed, byte for byte
  art: { // W7: SAGA sits only when the plan's "Files this plan changes" / "New files" lines name one of these
    triggers: ["(^|/)ui\\.js$", "\\.scene$", "^templates/", "\\.fx\\.js$", "^scripts/gen/", "^scripts/tex-", "\\.(mp3|glb|png|webp)$", "aesthetic\\.yml$", "(^|/)lighting\\.js$", "^places/[^/]+/config\\.yaml$"],
    feed: ["scripts/lib/data/aesthetic.yml", "docs/board/watcher/ART-RULES.md"], // fed to SAGA first; ART-RULES.md carries the creator's art rulings verbatim
  },
  personasFile: "docs/board/watcher/PERSONAS.md",   // W5: "## MÍMIR" / "## VÖR" / "## SAGA" blocks; each seat's block heads its system prompt
  templateFile: "docs/board/proposals/TEMPLATE.md", // W1
  qualityFile: "docs/board/watcher/QUALITY.md",     // W14: one row per closed round; sole writer watcher-clerk.js via watcher-quality.js
  checklistFile: "docs/board/watcher/CHECKLIST.md", // W14: post-build bugs, one "- " line each; fed under HARDENED
  calibrationFile: "docs/board/watcher/CALIBRATION.md", // W14: planted-bug plans + catch-rate rows
  v2Suffix: ".v2.md",       // W10: proposals/<NAME>.v2.md, the merged rewrite round 2 reviews
  builtSuffix: ".built.md", // W13: proposals/<NAME>.built.md, the post-build drift check
  quotePieceMin: 12,        // W3: each ellipsis-split piece of >= 12 chars must be found verbatim (whitespace collapsed); shorter pieces are glue
  scores: {                 // W6: per point 0-4; per point the plan's score is the LOWEST seat score that judged it
    passAt: 3,              // every point >= 3 ...
    needFours: 0,           // ... creator 2026-10-01 ("sure"): a 4 is a badge, not a gate; every point 3+ and no blocker is WATCHED (was 1: J2 sat 5/6 with no blocker, no 4)
    unquotedCap: 2,         // a score >= 3 whose evidence is not found (FEEL excepted) drops to 2, severity blocker
    levels: [
      "0 · missing or false: the point is not addressed, or what is said about it is untrue.",
      "1 · named but wrong: the point is touched, the claims are unquoted or contradict the fed files (anchor: DEDUPE round 1).",
      "2 · partly right: a builder following it would hit a gap, a guess or an unowned file.",
      "3 · right and buildable as written: quoted, owned, measurable; a careful builder ships it (anchor: HUGINN-R2).",
      "4 · studio grade: a builder could ship it blind; edge cases, feel and cost named, nothing left to add (anchor: TURNING-DAY).",
    ],
    anchors: { 1: "DEDUPE", 3: "HUGINN-R2", 4: "TURNING-DAY" }, // proposals/<NAME>.md; the feed carries a short head of each as calibration
  },
  crossExam: { on: true },  // W9: after the blind vote, only on points where seats split across passAt, each split seat reads the others' rows once
  breakerOrder: ["mimir", "vor", "saga", "heimdall2"], // W8: one seat per round also plays breaker (worst case only); round r -> breakerOrder[(r-1) % seats sitting]
  learnAfterClean: 10,      // W14: learn turns on after 10 closed plans with no false fail
  calibrateEvery: 10,       // W14: one planted-bug calibration plan per 10 real rounds
  qualityKeep: 30,          // W14: world.state.watchQuality keeps the last 30 rows for the O-menu graph
  honestLimit: "MÍMIR and VÖR are the same model family as JEV: separate prompts, separate jobs, no shared context.", // V8
  artOnlyPoints: ["GROUNDED", "PROVABLE"], // Q3: a GLB/texture plan with no script or scene logic
};
export const POINTS_BASE = [
  { id: "GROUNDED", text: "Every claim about the world is true today: files, functions, ids, positions, numbers and engine APIs are real and quoted from the fed text or engine-reference. No invented API, no 'should work'." },
  { id: "FAITHFUL", text: "Every clause of the creator's verbatim ask maps to a slice; every addition sits in an 'Added (not in the ask)' list with a reason (V3); every creator ruling, den invariant and PROTECTED finding it touches is honoured." },
  { id: "CONTRACTED", text: "One owner per file and per state row; a named data contract (keys, units, writer, readers); lanes with disjoint footprints and an order; no collision with CLAIMS.md or running work." },
  { id: "PROVABLE", text: "PROVABLE & REVERSIBLE: every slice has a measurable done-when and one readOnly check; a not-verified list; a flag or undo that takes it back; no player-data wipe without the creator's ask." },
  { id: "SOUND", text: "SOUND & BUDGETED: the numbers agree, the loop closes, feel is named; per-tick ms, draw cost, save churn and LLM job rate are named and inside PERF.md; the engine's own systems are used, not rebuilt." },
];
// WATCHERS-AAA W4: the pre-mortem, every item answered or marked n/a by the plan
export const PREMORTEM = [
  "old code already loaded on a live page (a window global, a cached module, a stale DOM node from the version before)",
  "a re-render or state write mid-animation",
  "two players at once (two editors, a visitor beside the creator)",
  "a fresh room vs a long-running room (hours of state, pruned rows, a restart)",
  "state size (bytes added to any state row, its cap and its prune)",
  "turned off or undone (the flag, the undo, what is left behind)",
  "desktop frame cost (mobile is off the table by the creator's ruling, 2026-09-28: \"we don't need to focus on mobile at all\"; phone input, width and frame cost are n/a and never a blocker)",
];
export const POINT_HARDENED = { id: "HARDENED", text: `HARDENED: the plan's pre-mortem answers each of these, or marks it n/a with a reason: ${PREMORTEM.map((x, i) => `(${i + 1}) ${x}`).join("; ")}. The post-build checklist (CHECKLIST.md) items that apply are answered too.` };
export const POINT_FEEL = { id: "FEEL", art: true, text: "FEEL: juice, polish and readability are named: what the player sees, hears and feels on each act; how it matches the den's look (aesthetic.yml, ART-RULES.md); and the gap to one named real-game moment it is measured against. A reason, not a quote, is evidence here." };
// the points a round judges: 6; 7 when SAGA sits (art plan)
export function pointsFor(opts = {}) {
  return opts.art ? [...POINTS_BASE, POINT_HARDENED, POINT_FEEL] : [...POINTS_BASE, POINT_HARDENED];
}
export const POINTS = pointsFor(); // the non-art set (6 points)
// Reviewer answer (llm:generate schema). A PASS without an evidence quote is a FAIL (plain code checks).
export function verdictSchema(opts = {}) {
  const pts = pointsFor(opts);
  const point = { id: { type: "string", enum: pts.map((p) => p.id) }, pass: { type: "boolean" },
    evidence: { type: "string", maxLength: (HEIM_ON ? CAPS.field : 300), description: "a quote copied character for character from the fed text" },
    why: { type: "string", maxLength: (HEIM_ON ? CAPS.field : 300) } };
  const req = ["id", "pass", "evidence", "why"];
  point.score = { type: "integer", minimum: 0, maximum: 4, description: "0-4 against the written levels; pass = score >= 3" };
  point.severity = { type: "string", enum: ["blocker", "note"], description: "for a score under 3: blocker holds the plan, note is folded into the build" };
  req.push("score", "severity");
  const edit = { section: { type: "string", maxLength: 80 }, replace: { type: "string", maxLength: (HEIM_ON ? CAPS.long : 600), description: "exact text from the plan" }, with: { type: "string", maxLength: (HEIM_ON ? CAPS.long : 600) },
    why: { type: "string", maxLength: (HEIM_ON ? CAPS.field : 300) }, evidence: { type: "string", maxLength: (HEIM_ON ? CAPS.field : 300), description: "exact quote from a fed file, never the plan" } };
  const ereq = ["section", "replace", "with", "why", "evidence"];
  edit.cost = { type: "string", maxLength: 120, description: "what the edit costs: ms per tick, JEV/LLM calls, files touched; 'none' when none" };
  edit.added = { type: "boolean", description: "true when the edit goes past the creator's ask (lands in 'Added (not in the ask)')" };
  ereq.push("cost", "added");
  const props = {
    points: { type: "array", minItems: pts.length, maxItems: pts.length, items: { type: "object", properties: point, required: req } },
    edits: { type: "array", maxItems: WATCH.maxEdits ?? 24, items: { type: "object", properties: edit, required: ereq } },
  };
  const top = ["points", "edits"];
  props.walk = { type: "string", maxLength: (HEIM_ON ? CAPS.long : 600), description: "written FIRST: the player's first 10 seconds after this ships, step by step, as the plan makes them" };
  props.breaker = { type: "string", maxLength: (HEIM_ON ? CAPS.long : 600), description: "only when you are this round's breaker: the single worst way this plan breaks in play; else empty" };
  props.toPass = { type: "string", maxLength: (HEIM_ON ? CAPS.field : 300), description: "one line: exactly what would make you pass every point" };
  top.push("walk", "breaker", "toPass");
  return { type: "object", properties: props, required: top };
}
export const VERDICT_SCHEMA = verdictSchema();
// W9 cross-exam answer: one row per split point
export const CROSS_SCHEMA = { type: "object", properties: { points: { type: "array", maxItems: 7, items: { type: "object", properties: {
  id: { type: "string" }, hold: { type: "boolean", description: "true = you keep your score; false = you flip" },
  score: { type: "integer", minimum: 0, maximum: 4 }, why: { type: "string", maxLength: 300 } }, required: ["id", "hold", "score", "why"] } } }, required: ["points"] };
// W13 post-build answer
export const BUILT_SCHEMA = { type: "object", properties: {
  slices: { type: "array", maxItems: 30, items: { type: "object", properties: { slice: { type: "string", maxLength: 40 }, held: { type: "boolean" }, evidence: { type: "string", maxLength: 300 }, why: { type: "string", maxLength: 300 } }, required: ["slice", "held", "evidence", "why"] } },
  drift: { type: "array", maxItems: 12, items: { type: "string", maxLength: 300 }, description: "changes outside the plan, or a slice built differently" },
  bugs: { type: "array", maxItems: 12, items: { type: "string", maxLength: 200 }, description: "one line each, fed to CHECKLIST.md" } }, required: ["slices", "drift", "bugs"] };
// board-bell.state.watch[name] = { round, state, at, submittedAt, verdicts: { mimir, vor }, fails: [], hash }
// board-bell.state.watchAsking = { at, name } while reviewer jobs are out (jev-busy lane, V7)

// HEIMDALL-PRE (creator GO 2026-10-01): "if heimdall is requesting live numbers from code that isnt built yet, we need to look into changing that"
export const EVIDENCE = {
  tiers: ["TODAY", "BENCH", "AFTER"],
  afterHead: "measured after build", // the plan's "## Measured after build" section: live numbers the build must take, each with its limit
  sliceRe: /^Slice of:\s*\S/m,           // a plan that declares itself one slice of a larger ask
  // a blocker whose only gap is one of these is not a gap a plan CAN close before it is built
  softRe: /\b(live|world[- ]build|in[- ]world|in the world|real bell|bell'?s own|runtime|production|in play)\b[^.]{0,80}\b(ms|millisecond|timing|measure|measurement|number|numbers|cost|bench|frame|p95|p50)|\b(not (yet )?built|before (it is |it's )?built|unbuilt|after (the )?build|after shipping|once built|prototype, not)|\b(prototype|box)[- ](only|bench)\b[^.]{0,60}\b(not|isn't|is not)\b|live (reload|module reload)|not verified list (admits|acknowledges)|acknowledges? (live|the live)/i,
  sliceSoftRe: /\b(broader ask|rest (of the|are) (ask|deferred|slices)|complete set of slices|other (slices|options|integrations)|why the rest|only one slice|single slice|does not map (that|the) broader)\b/i,
  // a reason naming any of these is a real TODAY fault: it stays a blocker
  hardRe: /\b(wrong|false|untrue|invented|does not exist|doesn't exist|not found|missing (file|function|key)|mismatch|contradict|incorrect|stale|no such|unquoted|race|crash|collision|unowned|wipe)\b/i,
};
