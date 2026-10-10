// JEV-TASKS (creator go 2026-09-28): the numbers for JEV's task ideas. One place to tune them.
export const JEVT = {
  inboxEverySec: 10,         // FAST KNOCK (creator 2026-09-28 13:08): how often the inbox bell reads CLAUDE.md/SAVI.md
  checkEverySec: 60,         // how often the bell looks at the trigger
  autoWhenOpenBelow: 3,      // automatic round only when the BACKLOG has fewer doable {OPEN} items than this
  autoMinGapMs: 2 * 3600e3,  // max 1 automatic round per 2 h
  perRound: 3,               // ideas per round
  maxOpen: 6,                // open J ideas at once (not yet voted closed)
  timeoutMs: 90e3,           // an ask older than this is given up on
  lineMax: 320,              // digest: each board line cut to this
  reports: 15,               // digest: the last N report lines
  owners: ["Savi", "Claude"],
  sizes: ["S", "M", "L"],
  doneWords: /\b(test|node|read|state|meter|trace|dbg|measure|count|median|mm|ms|%)/i, // a done-when must be a check
};
// DEN IDEAS (creator 2026-09-28): JEV pitches one Viking/Odin/knotwork idea for the den every 10 min while someone is in the
// dev den, into docs/board/DEN-IDEAS.md; at 10 OPEN it waits until a vote closes one. IDEA GATE (creator 2026-09-28 12:46, scripts/lib/idea-gate.js): Savi + Claude vote; both YES = DEN-APPROVED, both NO = DEN-DROPPED; a split or a critical idea waits for the creator (CREATOR-VOTE.md).
export const DENI = {
  file: "docs/board/DEN-IDEAS.md",        // board 1: waiting for all three votes
  approved: "docs/board/DEN-APPROVED.md", // board 2: passed, waiting to be built
  dropped: "docs/board/DEN-DROPPED.md",   // voted down: kept so JEV never pitches it again
  everyMs: 10 * 60e3,
  maxOpen: 15, // PITCH TIDE 2026-09-29: den 15 + solo 10 = the JEV board's 25
  timeoutMs: 120e3,
  kinds: ["system", "asset", "landscape", "texture", "npc", "animal", "sound", "other"],
  sizes: ["S", "M", "L"],
};

// SOLO IDEAS (creator 2026-09-28): Savi's own lane while Claude is away. JEV keeps up to 5 LIGHT ideas open (decor, buildings,
// simple survival mini-games with real-feeling controls), different from DEN IDEAS; Savi + Claude vote under the same IDEA GATE (was creator + Savi).
// IDEA PACE (creator GO 2026-09-28, CLAUDE #28): JEV pitches nothing while > pauseAbove approved ideas are unbuilt (not DONE), and at most once an hour otherwise
export const PACE = { pauseAbove: 15, everyMs: 60 * 60e3 }; // superseded by TIDE for pitching (kept: unbuilt() still reads pauseAbove as the brake's start)
// PITCH TIDE (creator GO 2026-09-29 02:32, docs/board/proposals/PITCH-TIDE.md): n = open den + solo cards (the JEV board's 25).
// wait after a card LANDS = gap(n) x brake: gap = stepS*n up to bendAt, then *bend^(n-bendAt); n >= cap: none. Brake: unbuilt > above -> x2, +1 per `per` more, <= max.
// One pitch in flight across both lanes (ids and dedupe stay race-free); budget rails per hour and day; a failed ask waits failS.
export const TIDE = { stepS: 10, bendAt: 15, bend: 1.25, cap: 25, brake: { above: 15, per: 10, max: 4 }, perHour: 30, perDay: 200, failS: 120, digestEvery: 10, digestMs: 30 * 60e3 };
export const SOLO = {
  file: "docs/board/SOLO-IDEAS.md", approved: "docs/board/SOLO-APPROVED.md", dropped: "docs/board/SOLO-DROPPED.md",
  maxOpen: 10, everyMs: 10 * 60e3, timeoutMs: 120e3,
  kinds: ["decoration", "building", "mini-game", "craft", "other"], sizes: ["S", "M"],
};
export const SHELF = { file: "docs/board/SHELF.md", max: 20, reviewGapMs: 5 * 60e3, timeoutMs: 120e3 }; // ideas waiting on a missing system (creator 2026-09-28)
// SMART LIST (creator 2026-09-28): JEV reads every task source and writes one ranked list to docs/board/SMART-LIST.md every 3 min,
// only when a source changed. It never rewrites Claude's NOW; it sits beside it until Savi + Claude + the creator say otherwise.
export const SMART = { file: "docs/board/SMART-LIST.md", claims: "docs/board/CLAIMS.md", creatorNow: "docs/board/CREATOR-NOW.md", minFree: 5, everyMs: 3 * 60e3, timeoutMs: 150e3, items: 24, digestMax: 26000 };
export const FEAT = { file: "docs/board/FEATURES.md", timeoutMs: 150e3, ideas: 5 };
// JEV DECIDES FOR SAVI (creator 2026-09-28): questions addressed to Savi on design.md and Savi's vote on JEV fill-in tasks (J ids).
// Reserved for the creator, never JEV's: publishing, deleting/reverting his work, right-side/seat moves, closing GOAL 1, unparking a goal.
export const DECIDE = { timeoutMs: 120e3, queueMax: 12, scanMaxChars: 60000, seenMax: 800 };
// CHAT POINTS (creator 2026-09-28, CHAT-MIRROR): the chat mirror lives in docs/board/chat/<date>.md ("[hh:mm:ss] who: text").
// JEV reads only entries after its bookmark (date + timestamp + index, never a character offset) and folds them into POINTS.md.
export const CHAT = { dir: "docs/board/chat/", points: "docs/board/chat/POINTS.md", everyMs: 60e3, timeoutMs: 150e3, chunkChars: 30000, pointsCtxChars: 12000, staleMs: 30 * 60e3,
  topics: ["Rolf guitar", "Rolf lyre", "Rolf body & animation", "songs & JEV music", "chess", "longhouse & den", "folk & animals", "board & workflow", "JEV systems", "Claude coordination", "wisps & rounds", "performance & loading", "UI & controls", "creator rules & preferences", "other"] };
// VOTE REFEREE (creator's go 2026-09-28 12:05 on VOTE-SYSTEM FINAL + HARDENING, with Claude's fixes 1-5). JEV runs the vote; Savi + Claude vote.
// mode: "shadow" = it only writes docs/board/referee/SHADOW.md (what it WOULD decide); "live" = it writes the STATUS lines. Live only after the
// 24 h shadow AND both Savi and Claude post "SHADOW OK" on design.md. The numbers here are the whole rule; the CHEATSHEET line mirrors them.
export const VOTE = {
  mode: "shadow", shadowMinMs: 24 * 3600e3, shadowMinChecks: 1440, // F7: 24 h on the room clock AND 1440 referee checks (one a minute while someone is in the dev den)
  voters: ["Savi", "Claude"], rules: 10, max: 20, bar: 18, legacyBar: 15, vetoes: [1, 2, 3, 4, 6], conf: 90,
  waitMs: 24 * 3600e3,          // a missing voter: the idea WAITS this long, then re-opens when they're back (never fails, never passes alone)
  repitch: 1,                    // a split gets one re-pitch round (J<n>.2); a second split: a JEV idea FAILS (JEV never breaks ties on its own ideas)
  dir: "docs/board/referee/", everyMs: 60e3, findingsMax: 4,
  // FROZEN 2026-09-28 (Claude's review must-fix 1): the only closed J verdicts that predate the referee. Never rebuilt from the board:
  // any other APPROVED/FAILED J line the referee didn't write is flagged, however long it has sat there.
  legacyIds: ["J1", "J2", "J3", "J4", "J5"],
  legacy: ["ba8b0e9b66372f2f", "910dffdf3c6f4654", "152ac535938c2684", "0e8bfd14be406aae", "3ab1d0478018a8ef"],
  stop: /^\s*JEV STOP\b/i, go: /^\s*JEV GO\b/i, goConfirm: /^- ← Savi CONFIRM JEV GO\b/m,
};
// RUNE VOTE BOARD (creator + Claude GO 2026-09-28; contract scripts/lib/data/vote-board.js): the bell's cards, JEV's scribe text, the plaque tally.
export const CARDS = {
  scribeEveryMs: 60e3, scribeTimeoutMs: 120e3, scribeTries: 2, // one scribe ask at a time, at most one a minute; a card JEV fails twice stays raw
  lineMax: 90, sidesMax: 160, leanMax: 120, riskMax: 120,
  buildingMax: 6,   // plaque: IN PROGRESS ids per approved board
  usedMax: 200,     // sealsUsed / forged-flag memory
};
// JEV-LOAD L4 (2026-09-29): at most this many board LLM asks out at once; a capped step retries on the next update. staleMs: an
// open ask with no timeout of its own (shelf-needs, wake-brief, watcher) stops counting after this long.
export const LLMCAP = { maxInFlight: 2, staleMs: 180e3 };
// JEV-LEDGER (creator go 2026-09-29, docs/board/proposals/JEV-LEDGER.md): every idea as "<thing>@<place>" in docs/board/IDEA-INDEX.md.
// The prompts read LEDGER lines, pitches carry a key, an exact key repeat is thrown away before dupeOf (always on; the off switch was cut 2026-10-03).
export const LEDGER = {
  maxLineChars: 40, maxPromptLines: 120,
  file: "docs/board/IDEA-INDEX.md",
  boards: ["docs/board/DEN-IDEAS.md", "docs/board/SOLO-IDEAS.md", "docs/board/DEN-APPROVED.md", "docs/board/SOLO-APPROVED.md", "docs/board/DEN-DROPPED.md", "docs/board/SOLO-DROPPED.md", "docs/board/SHELF.md"],
  marks: { open: "•", approved: "✓", built: "✔", dropped: "✗", shelved: "⏸", banned: "⛔" },
  keyDesc: "<thing>@<place>, plain lowercase hyphenated words, e.g. hearth-slabs@hall-floor",
};
// DEDUPE-v2 (GO: creator override + Claude + Savi, docs/board/proposals/DEDUPE-v2.md): one gate for every idea/task writer.
// THING+PLACE check (idea-index.js dupeCheck) + the old title rule; near misses asked of JEV (jev:decide SAME/EXTENDS/DIFFERENT),
// at most perHour asks (board-bell.state.dupeAsks = { n, hour }); over the cap or on a failed ask the card lands with a WARN line.
export const DEDUPE = {
  perHour: 6, timeoutMs: 120e3,
  groupCardsMax: 3, indexFile: "docs/board/IDEA-INDEX.md", // D5's merge-or-keep card lane (one card per group, at most 3) and where '## Groups' / NOT-DUPE live
  appealEveryMs: 60e3,          // how often NOT-DUPE appeal lines are read from the inboxes + design.md
  appealFiles: ["docs/board/inbox/CLAUDE.md", "docs/board/inbox/SAVI.md", "design.md"],
  // extra THING rows [name, regex] (idea-index CANON is the base list), earliest in the title leads
  thingWords: [["smoke-rack", /smok\w* rack|fish[- ]smoking|herring smoke/]],
  // extra PLACE rows [name, regex] (idea-index PLACES is the base list)
  placeWords: [],
};
