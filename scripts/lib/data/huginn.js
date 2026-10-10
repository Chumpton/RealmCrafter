// HUGINN-DRONE (docs/board/proposals/HUGINN-DRONE.md, WATCHED 5/5 2026-09-30): every tuned number of the scout raven and his board.
export const HUG = {
  center: { x: 10, z: 1.5 },        // longhouse.js HALL.center
  radius: 402,                      // 0.25 mile
  cell: 50,                         // grid cell edge, m
  scanR: 38,                        // query radius per cell (the 50 m cell's corners + a 2 m lip; HUGINN-V3 S1, was 36)
  speed: 12, alt: 30, stepS: 0.5,   // m/s, m above terrain, seconds per move
  rowsPerStep: 90,                  // rows examined per 0.5 s step (the hall cell holds ~500)
  dense: { objects: 150, fx: 12, lights: 6, beds: 4 },
  float: 0.4, fatState: 4000, fatP1: 20000,
  hallNear: 40, farCosmetic: 150,   // P2 inside this of the hall, P4 past that
  runaway: 0.25,                    // count up 25 % pass over pass = a leak
  maxLines: 50, reportsPerHour: 1, maxPins: 3,
  file: 'docs/board/drone/HUGINN.md',
  reportPrefix: 'docs/board/proposals/HUGINN-R',
  lane: 'huginn',
};
// what HUGINN proposes for each kind before JEV rewrites it in plain words
export const FIX = {
  DENSE: 'measure the cell with spawn perf; merge static props into one scripted mesh, give far things visibleRange, cut lights that overlap',
  FATSTATE: 'move history or logs out of state into a docs file; keep only what clients must draw',
  FLOAT: 'drop it to the surface under it (raycast), or give it the post or shelf it should rest on',
  SUNK: 'raise it to heightAt or remove it: nobody can see it but it still draws',
  HIDDEN: 'a drawn thing kept hidden still costs its mesh; destroy it or strip the primitive',
  LOUD: 'make the bed spatial with a maxDistance, or drop its gain',
  STRAY: 'something fell out of the world: find its spawner and clamp or destroy it',
  RUNAWAY: 'something spawns without cleaning up: find the spawner, add lifetime or a cap',
  DOUBLE: 'two copies of one thing in the same spot: delete the second (it doubles the cost and flickers)',
  DRIFT: 'a loose physics thing slid or rolled away: anchor it (static), or give it a home it returns to',
  SHADOWS: 'too many shadow-casting lamps in one place: keep the brightest one casting shadows, turn the rest off',
  FARDRAW: 'far things drawn at any distance: give them visibleRange so they stop drawing when nobody is near',
  STRANGER: 'something appeared that no scene file places: find the script that spawned it and give it a lifetime or a cap',
  BLOCKED: 'a doorway or path a player cannot walk: move what stands in it, or the path',
};
export const SEE = { DENSE: 'spawn perf', FATSTATE: 'state read', FLOAT: 'look', SUNK: 'look', HIDDEN: 'identify_object', LOUD: 'listen', STRAY: 'state read', RUNAWAY: 'spawn perf', DOUBLE: 'identify_object', DRIFT: 'state read', SHADOWS: 'spawn perf', FARDRAW: 'spawn perf', STRANGER: 'state read', BLOCKED: 'look' };
// HUGINN-FLIGHT F1-F10 (2026-09-30, Savi GO after round 3): JEV legs, wind push, fog of war, heatmap hunt.
export const FLY = {
  legMs: 600000,          // a JEV leg lasts ~10 min (≤ 6 asks/h on Maximum); off the desk's share, a random heading
  reach: 2.6,             // next cell is picked within this many cells of the current one
  windPush: 0.35,         // the drift is wind m/s × this × JEV's ride (0.2..1)
  huntSpeed: 2,           // × HUG.speed while hunting a hot zone (max flying speed)
  huntHeat: 60,           // a cell at ≥ 60 % of the hottest cell's heat, with weight ≥ 3, draws a hunt
  huntQuietMs: 10000,     // no NEW finding in 10 s of hunting: move on (the creator's auto reset)
  huntMaxMs: 60000, huntCoolMs: 600000, // a hunt ends after 60 s regardless; a hunted cell rests 10 min
  fogN: 81, fogTile: 10,  // fog of war: 81 × 81 tiles of 10 m over the 0.25 mile circle
  fogReveal: 5,           // m revealed round him as he flies (one 10 m tile wide: hours to fill)
  fogSaveMs: 15000,       // fog + heat written to state every 15 s at most
  passCover: 0.95,        // a pass ends when 95 % of cells were scanned this pass (or 2 × the cell count scanned)
  sweep: true,            // HUGINN-SWEEP on/off: false = today's flight exactly (tier pinned 0, fogReveal 5, reach 2.6, no dots)
};
// HUGINN-SWEEP S1 (docs/board/proposals/HUGINN-SWEEP.md): tiers at fill %, +10 % speed a tier, wider reveal, more checks, less wind;
// colours by finding tier: P1 ember red, P2 lamplight yellow, P3 palette green, P4 palette teal. Read by huginn-sweep.js, huginn.js, ui.js.
export const SWEEP = { tiers: [50,60,70,80,90,100], speedStep: 0.10, reveal: [14,18,21,25,28,32], checks: [6,7,8,9,10,10], windDrop: 0.18, frontierAt: 50, redPullAt: 50, redRing: 2, dotsMax: 60, secondMaxMs: 150000, colors: {1:'#d9573a',2:'#e7b457',3:'#9baf84',4:'#5dada9'} };
// HUGINN-OUTER S1 (docs/board/proposals/HUGINN-OUTER.md, WATCHED 7/7 2026-10-01): when the home circle is 100 %, he flies out and fills
// the ring 402 → 804 m (0.25 → 0.5 mile) on its own fog of 81 × 81 tiles of 20 m, kept across days; both full = roost on the ridge,
// a red second pass every roostEveryMs. near: the engine's updateSchedule near radius, so he keeps flying past 500 m from the hall.
// on: false = today's behaviour exactly.
// HUGINN-MOPUP (docs/board/proposals/HUGINN-MOPUP.md, CONTESTED 6/7 → GO 2026-10-01): past `at` % he flies one planned route through every dark speck
export const MOP = { on: true, at: 90, stallMs: 90000, max: 200, jevWaitMs: 20000, wind: 0, rescanMs: 600000 };
export const OUTER = { on: true, rMin: 402, rMax: 804, fogN: 81, fogTile: 20, near: 900, roostEveryMs: 600000, perch: { x: 10, z: 1.5, up: 13 } };
// HUGINN-V3 (docs/board/proposals/HUGINN-V3.md, creator go 2026-10-01): sharper eyes, a second look, least-recently-checked, clusters, a scored JEV.
// on: false = v2 exactly (no new kinds, no second look, the old rotation, the three separate asks).
export const V3 = { on: true, revealCap: 4, pendingMax: 200, pendingPasses: 3, pendingDots: 60, secondGapMs: 60000, lastChkMax: 2000, busyRows: 150, busyExtra: 4,
  doubleM: 0.02, driftM: 30, driftMax: 2000, shadowsMax: 2, farDraw: 150, farMin: 5, clusterMin: 3, dropMax: 5,
  blockedSteps: 8, doorOut: 6, strangerSkipTags: ['fx', 'folk', 'npc', 'creature', 'player', 'huginn'], strangerMax: 8, baseFile: 'docs/board/drone/STRANGER-BASE.md',
  scoreMs: 180000, scoreRows: 50, scoreMin: 3, loseDays: 3, scoreFile: 'docs/board/drone/JEV-SCORE.md', stallAskMs: 45000, stallApproachM: 20 };
// HUGINN-FAR (creator 2026-10-07: "covers all 1.25 mi of the entire project", "100 % once a day, 80 % of max speed, ms friendly"):
// a third ring 804 → 2012 m (1.25 mi; the island's farthest shore measured 1,880 m ESE of the hall), its own fog of 101 × 101 tiles of 40 m.
// Order each room day: home → outer → far → roost; every ring is wiped at the day's roll, so each day is one full 100 % sweep.
// speed (was 45, now FAR.speed below): one steady speed everywhere (no tiers, no hunt boost) = 80 % of 56 m/s, where his 14 m reveal trail starts leaving gaps
//   at a 0.5 s step (step ≤ 2 × reveal). The scan per cell is unchanged: 90 rows a step, so his tick cost does not grow with speed.
// climb: ± this × the step's metres per step (old fixed ±3 m could not climb Highwatch at speed); floor: never under ground + floorUp.
// sea: deep-sea tiles and cells are skipped (scripts/lib/data/huginn-sea.js). reveal: the far ring's 40 m tiles need a 40 m reveal.
// on: false = the two-ring flight exactly as before.
// 2026-10-07 Zezima "200% max speed, or anything lower if 200% effects the results": speed 112 m/s = 56 m a step. Gap-free needs step < 2 × reveal,
//   so home/outer reveal is fixed at trail 34 m (strip ≥ 38 m wide between stamps; 9×9 tile checks a step, was 7×7). Per-cell scans run at the cell, unchanged.
export const FAR = { on: true, rMin: 804, rMax: 2012, fogN: 101, fogTile: 40, reveal: 40, trail: 34, speed: 112, climb: 0.8, floorUp: 8 };
