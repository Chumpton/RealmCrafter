// JEV BOARD (creator 2026-09-28 16:32: "a physical board ... for tasks and ideas created by JEV ... 25 numbered ... who voted, approve or
// denied ... removed when decided ... I can vote ... see the confidence"). The rune vote board's big sibling across the hearth's east end.
// Same shape as VB (scripts/lib/data/vote-board.js) so camera-vote.js and the stand generator read either one.
// Cards: every OPEN idea on DEN-IDEAS.md + SOLO-IDEAS.md (JEV's pitches), oldest first, up to 25. Decided ideas leave those files
// (the bell sorts them), so they leave the board by themselves. The creator's vote goes through the rune board's ONE write path
// (emit 'vote' to vote-board with board: 'jev-board'), so it is a seal like any rune-board vote and always wins the gate.
// Confidence: each voter token on a votes line may carry a percent: "Savi YES 92% (why)" or "Claude NO (conf 80%, why)".
import { VB } from './vote-board.js';
export const JB = {
  id: 'jev-board', judgeId: 'vote-board', creatorUserId: VB.creatorUserId, tex: 'scripts/tex-board.js', // BOARD-CLICK D4: the one painter
  files: { D: 'docs/board/DEN-IDEAS.md', S: 'docs/board/SOLO-IDEAS.md' },
  // mirror of the rune board across the hearth line (z 1.5): east end, south of the fire, turned toward the main door
  feet: { x: 16.3, y: 24.95, z: 0.0 }, yaw: 105, mount: 'stand', noCarve: true,
  size: { w: 2.0, h: 1.5, depth: 0.08 }, boardY0: 0.2,          // board y 0.2..1.7 over the feet
  plaque: { y: 0.0, h: 0.16, w: 1.2 },
  faceZ: -0.045,
  card: { w: 0.35, h: 0.25, perRow: 5, cols: [-0.76, -0.38, 0, 0.38, 0.76], rows: [1.475, 1.21, 0.945, 0.68, 0.415] }, // 25 slots, n left-to-right, top-down, as SEEN
  button: { y: -0.088, x: 0.07, w: 0.12, h: 0.052 },           // card-local: YES at -x, NO at +x (as seen)
  candle: { x: 1.12, y: 0.9 },
  maxCards: 25,
  slimCards: true, // HUGINN-R7 (creator GO 2026-10-01): the saved row holds only the drawn card; the parse base lives in jev-board.js memory. false = the old full row
  slimCap: 12000,   // HUGINN-R7 guard: a slim row over this clips bodies to 60, and if still over, the write is skipped
  undoMs: VB.undoMs, armMs: VB.armMs,
  view: { back: 1.75, cardBack: 0.42, lookLimit: 40, lookUp: 80, easeMs: 700 }, // lookUp: creator 2026-09-29 14:45 "still preventing me from fully moving the camera up": the 40° cap above the board centre was the wall; up now reaches 80° (yaw/down stay 40, never lower) // 40: the top row, candle and plaque all in reach (was 28)
  readEverySec: 5,
  sounds: VB.sounds,
  // JEV's lean: the board's 11-point rubric (design.md 2026-09-29: confidence = pass share of 11). Each is one boolean JEV answers;
  // a point passes at p >= .5; the chip shows passes/11 and turns YES at >= 10 (the 90% bar). Advice only: the gate never reads it.
  leanEveryMs: 20000, leanTimeoutMs: 90000, leanPass: 10, leanPoint: 0.7, // a point passes at p >= .7; the chip is green at >= 10/11 AND >= 90% mean confidence (the gate's bar)
  criteria: {
    fit: 'fits a cozy Norse longhouse den above a lake, in its handmade lamplit style',
    new: 'adds something the den does not already have (no near-duplicate of a built or approved idea)',
    fun: 'a visitor would enjoy doing or seeing it more than once',
    small: 'small enough to build in one focused round with existing systems',
    safe: 'cannot break or destabilise what already works (Rolf, chess, weather, boards)',
    blocked: 'any new system it needs is named and realistic',
    reads: 'its verb is clear: a player knows what to press and sees it answer',
    place: 'has a sensible spot to stand in the hall, yard or shore',
    alive: 'makes the den feel more lived-in, with sound or motion',
    queue: 'is worth adding while 20+ approved ideas already wait to be built',
    clear: 'the pitch is specific enough to build without guessing',
  },
};
