// WAKE QUEUE v2 (creator + Claude GO, 2026-09-28, SAVI #18 / CLAUDE #27). Every tuned number of the wake path.
// Delivery is plain code and rides a real player's input; JEV only grades and writes the brief (advisory, never gates).
export const WAKE = {
  bellId: "board-bell",                               // the row that holds s.wakeQ (board-bell.js + board-jev.js)
  owner: "pa_28744a7fc0a3ce8b63c72a3c4cc2fcd9",       // the creator's account: his input sends first; any dev-room player is tier 2. Never isEditor (CLAUDE #27)
  sendGapMs: 60e3,                                    // at most one input-sent wake a minute (claimed on the bell row before notifyDm)
  manualGapMs: 10e3,                                  // K / the HUD button: one a 10 s
  holdMs: { now: 0, soon: 45e3, batch: 30 * 60e3 },   // how long a grade waits after the queue opens, so a burst coalesces into one wake
  landMs: 120e3,                                      // no sign of Savi 2 min after a send -> resend
  maxTries: 3,                                        // then the creator's banner (escalate)
  jevTimeoutMs: 25e3,                                 // JEV's brief late -> the code's own grade + raw list, sent anyway
  reasonsMax: 12, logMax: 12, ledgerRows: 60, // POLISH: state keeps 12 log rows; WAKE-LEDGER.md keeps 60 (older rows carried from the file)
  kinds: { ask: "soon", idle: "soon", task: "soon", feature: "soon", pitch: "batch" }, // the code's floor per source; JEV may raise, never lower
  ledger: "docs/board/WAKE-LEDGER.md",
  ledgerGapMs: 60e3,   // JEV-CHURN P6: new ledger content saves at most once a minute
  refreshMs: 5 * 60e3, // JEV-CHURN P6: jev / ARMED / tries-only changes at most every 5 min
};
