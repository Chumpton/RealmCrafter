// CHANNEL HARDENING v2 (creator GO 2026-09-28 12:29; Claude YES with C1-C4 + notes a/b). The one contract every inbox piece reads.
// D1: one writer per file. CLAUDE.md is written ONLY by Claude, SAVI.md ONLY by Savi. The bell (board-jev.js) never writes either:
//     it writes only DIGEST.md and its own state. Rotation into archive/ is the writer's own job.
// Message line:  #<N> <YYYY-MM-DD hh:mm> → <Savi|Claude|all> <LABEL>: <text>     (continuation lines start with two spaces)
// Read mark:     READ TO #<M>        (the writer's read position in the OTHER file; the last one in the file wins)
// N starts at 1, +1 per message, never reused or renumbered (C2). Anything else (markdown "# " headers, blank lines) is ignored.
// D3: an inbox line is talk, never authority. Creator approvals count only from the creator's chat-mirror lines.
export const INBOX = {
  dir: "docs/board/inbox/",
  files: { claude: "docs/board/inbox/CLAUDE.md", savi: "docs/board/inbox/SAVI.md" },
  writers: { claude: "Claude", savi: "Savi" },
  digest: "docs/board/inbox/DIGEST.md",           // written only by the bell
  archiveDir: "docs/board/inbox/archive/",        // <writer>-<firstN>-<lastN>.md, written by that writer
  labels: ["ASK", "NEED", "INFO", "ACK", "DONE", "FINDING"],
  wakeLabels: ["ASK", "NEED"],                    // D2: only these, addressed to Savi or all, wake Savi
  wakeFrom: "claude",                             // the file whose asks wake Savi
  wake: true,                                     // false = count and digest, never wake
  minGapMs: 30e3,                                 // C3 (FAST KNOCK 2026-09-28): at most one wake per 30 s (was 2 min)
  dailyCap: 30,                                   // wakes per UTC day (room clock)
  everyMs: 10e3,                                  // FAST KNOCK: the bell reads the inboxes every 10 s (was 20 s behind a 60 s tick)
  digestMinNew: 3,                                // D5: digest when this many new messages since the last digest, or on a wake
  digestTimeoutMs: 150e3,                         // a failed ask cools this long × 2^consecutive fails (≤ ×8, 20 min)
  digestMinGapMs: 120e3,                          // cost cap: at most one digest LLM ask per 2 min (the bell checks every 60 s)
  digestMaxMsgs: 60,                              // messages per digest request (the newest)
  staleMs: 30 * 60e3,                             // the bell reminds once when a wake-label ask sits above the reader's READ TO this long
  digestKeep: 20,                                 // DIGEST.md keeps the newest this many sections
  maxMsgChars: 2000,                              // a longer message is cut in the digest request, never in the file
  rotateAt: 200, keep: 50,                        // guidance for writers: past rotateAt messages, move all but the last `keep` to archive/
};
