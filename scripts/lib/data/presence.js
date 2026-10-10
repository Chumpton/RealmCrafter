// IDLE WATCH (creator 2026-09-28 13:35, v2 + Claude #17/#18, Savi's final go 20:48): the numbers. Rules: scripts/lib/presence-core.js.
export const PRES = {
  file: "docs/board/PRESENCE.md",   // written ONLY by the bell, and only when a state changes (Claude #3)
  refreshMs: 5 * 60e3,             // JEV-CHURN P6: note / next / waiting-only changes save at most every 5 min; state flips save at once
  quietMs: 10 * 60e3,              // a line (outbox or CLAIMS) in the last 10 min = working, claim or not (Claude #1)
  staleMs: 20 * 60e3,              // open claim, nothing for 20 min = stale: one INFO ping per claim (Claude #6)
  awayMs: 60 * 60e3,               // Claude silent 60 min = away (or his own AWAY line); Savi is never away (she is woken)
  idleChecks: 2,                   // idle only after 2 checks in a row, so DONE → next CLAIM isn't flagged
  pushGapMs: 10 * 60e3,            // max 1 push per agent per 10 min
  pushesPerDay: 20,                // idle wakes have their own budget, apart from the ASK wake cap (30/day)
  relayMs: 15 * 60e3,              // Claude online, pushed, no claim/answer in 15 min: Savi relays it as an ASK (Claude #2)
  critical: /\b(critical|major|breaks? play|data loss)\b/i,
  // lane fixes where the smart list's owner is wrong (Claude #4: owner table). id → the lane that owns its files
  lane: { "TASK 13": "Savi", "B3": "Savi", "C13": "Claude" },
  claudeOnly: ["C13"],             // Claude's art lane (painted texels): a critical one waits for him, flagged
  smallSources: /BACKLOG|APPROVED/i, // "a small task or backlog task": these first, then the rest of the lane
};
