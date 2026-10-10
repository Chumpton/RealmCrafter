// SAVI-WATCH tuning (docs/board/proposals/SAVI-WATCH.md, GO 2026-09-30). Read by scripts/savi-wake.js; the HUD reads player.state.saviWatch.
export const SW = {
  windowMs: 10 * 60e3, // a dot never outlives 10 min
  doubleMs: 1000,      // G twice inside this = FULL sweep (G-b)
  quickCaptures: 5,    // quick: his frame + one 6-frame burst + perf + logs (G-f: <= 5)
  fullRadiusM: 25,     // full: every animated body this near gets its own burst
  burstFrames: 6,
};
