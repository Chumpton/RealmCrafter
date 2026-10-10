// JEV BODY tuning (docs/board/proposals/JEV-BODY.md, B3). Every number the mind (lib/jev-busy.js) and the body (jev-body.js) use.
// Lane timeouts are NOT here: jev-busy.js imports them from the data modules board-jev.js / jev-board.js already use.
export const JEVB = {
  // the hall, world metres (floor draws at y 24.02)
  floorY: 24.02,
  seatTop: 0.58,                         // Hugsæti's seat top over its feet (JEV's feet go here)
  home: { x: 20.59, z: 4.05 },           // fallback only: the body reads jev-stool live (the creator placed it 2026-09-29)
  lectern: { x: 19.85, z: 3.14 },        // fallback only: the body reads jev-ledger live
  aside: { x: 21.3, z: 4.6 },            // fallback only: derived live, 0.9 m past the stool away from the lectern
  board: { x: 16.3, y: 24.95, z: 0 },    // JEV board feet (east wall, faces -X)
  cardAt: { x: 16.25, y: 25.9, z: 0 },   // where a pitched card lands on the board face
  door: { x: 3.4, z: -3.5 },             // HALL.doors.main: the weave aims here when a build has no hall spot
  readRadius: 1.6, walkSpeed: 1.1, arriveM: 0.08,
  // the mind (D8)
  priority: ["BUILD", "REACT", "PITCH", "READ", "THINK", "IDLE", "WANDER"], // WANDER: JEV-WANDER C3, the lowest level
  events: ["REACT", "PITCH"],            // one-shots: they queue behind a dwell; the rest are levels re-read every step
  dwellMs: 6000, pitchDwellMs: 3000, idleAfterMs: 90e3, queueMaxAgeMs: 30e3,
  noAtFreshMs: 120e3,                    // a flag with no .at counts fresh this long from first sight (Savi's D1 add)
  buildStaleMs: 2 * 3600e3, buildMax: 3, // D4 · JEV-LOAD K3, was 6 * 3600e3
  gaugeShowsWork: true,                  // JEV-LOAD L1: the ring shows workPct (backlog on the throne tally); false = the old max-of-six gauge
  seenMax: 400,
  // clips: the folk map (FOLK.pose boot sit, folk-work idle/walk, RR.shrugClip) + library once-clips
  clips: {
    sit: "cdn/clip-sit-loop.glb", stand: "cdn/clip-idle-loop.glb", walk: "cdn/clip-walk-loop.glb",
    weave: "cdn/clip-magic-spell-casting-loop.glb", pitch: "cdn/clip-cast.glb",
    nod: "cdn/clip-nod-yes.glb", shrug: "cdn/clip-shrug.glb",
  },
  poseWeight: 1, gestureWeight: 8, blend: 0.6,
  // fx placement (body frame, m)
  cloudLift: 1.85,                       // seated head (~1.35) + 0.5
  hands: { up: 1.2, fwd: 0.35 },
  arc: { from: 1.15, T: 0.6, g: 4.9 },   // lectern top → board; g = grav()*.5 in the program
};
