// STAMINA + Running/Jumping (MMO prompt 2/6, 2026-10-01). Every tuned number lives here.
export const ST = {
  on: true,
  max: 100,
  runSpeed: 6.8,          // m/s (walk is 3.8, player.yml)
  runDrain: 3.33,         // per second × drainMul(Running)
  jumpCost: 10,           // per jump × drainMul(Jumping)
  regenStill: 5, regenWalk: 3, regenDelayMs: 1500,
  forcedUntil: 15,        // at 0, walk until back to this
  lowFlash: 15,
  heightM: 1.8,           // the player's height = 6 ft
  runXpFrac: 0.8,         // of run speed, measured from real movement
  runXp: [2, 0.25],       // XP/s = a + b·L
  jumpXp: [3, 0.3],       // XP/jump = a + b·L
  jumpMinDist: 1, jumpMinRise: 0.5, jumpXpGapMs: 800,
};
export const curveT = (L) => Math.pow((Math.max(1, Math.min(99, L)) - 1) / 98, 1.4);
export const drainMul = (L) => 1 - 0.75 * curveT(L);
export const jumpFeet = (L) => 1.5 + 8.5 * curveT(L);
export const feetToM = (ft) => ft * ST.heightM / 6;
