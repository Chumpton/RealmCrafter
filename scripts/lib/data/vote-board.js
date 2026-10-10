// VOTE BOARD (the creator's "rune vote board", creator + Claude GO 2026-09-28 13:11; plan docs/board/proposals/RUNE-BOARD.md).
// Named vote-board in code: "chess-runeboard" is the chess record, a different row. Every lane reads this one contract.
export const VB = {
  creatorUserId: "pa_28744a7fc0a3ce8b63c72a3c4cc2fcd9", // the ONLY account whose vote counts; checked in the board's script, never the client
  id: "vote-board", bellId: "board-bell", tex: 'scripts/tex-board.js', // BOARD-CLICK D4: the one painter
  // placement: east end wall, inner face x 22.6, floor 24.0, south of the high seat (z 1.5) and its chairs (z 0.35); faces -X (yaw 90)
  // MOVED 2026-09-28 13:20 (creator: "near the hearth, in front of it, more visible"; Claude #12/#13 agreed, off the centre line): hearth east end, north of the fire line,
  // turned toward the main door so the door still sees the high seat down the fire and Rolf's stage stays clear. Freestanding on a carved stand.
  feet: { x: 16.3, y: 24.95, z: 3.0 }, yaw: 75, mount: "stand",
  reserved: { D1loom: "east wall NORTH of the high seat, z 2.9..5.0 (Claude #11): approved D1 loom builds there; the vote board keeps the south side" },
  // board-LOCAL frame (metres): origin = feet (bottom centre of the plaque), +Y up, front = local -Z (faces the hall), right (from the front) = local -X
  size: { w: 2.0, h: 1.1, depth: 0.08 }, boardY0: 0.2,         // backboard spans y 0.2..1.3, centre y 0.75 (eye height 1.7 over the floor)
  plaque: { y: 0.0, h: 0.16, w: 1.2 },                        // tally plank under the board, y 0..0.16
  faceZ: -0.045,                                              // the front surface the cards and ui sit on
  card: { w: 0.35, h: 0.42, perRow: 5, cols: [-0.76, -0.38, 0, 0.38, 0.76], rows: [0.99, 0.51] }, // 10 SLOTS (creator 2026-09-28 13:56): card n = 1..10: row (n-1)/perRow|0, col (n-1)%perRow, numbered left-to-right as SEEN from the front
  button: { y: -0.15, x: 0.08, w: 0.14, h: 0.08 },            // card-local: YES at x -0.11, NO at +0.11 (as seen), y -0.15 from the card centre
  candle: { x: 1.12, y: 0.62 },                               // candle sconce beside the board (as seen: right), board-local
  maxCards: 10,                                               // keys 1..9, and 0 = card 10
  undoMs: 2000, armMs: 500, pressSlackMs: 3000,              // creator 2026-09-29 02:52 "make it 2 seconds": a vote seals 2 s after the KEY PRESS (not its arrival) even if he walks away; keys ignored 0.5 s after a card opens; a press time older than pressSlackMs is not trusted
  view: { back: 1.5, cardBack: 0.62, lookLimit: 14, easeMs: 700 }, // camera: whole-board vantage 1.25 m in front, card vantage 0.62 m
  sounds: {
    chime: "/cdn/moodboard-lowpoly-cozy/sfx-vote-board-new-card-chime.mp3",
    flip: "/cdn/moodboard-lowpoly-cozy/sfx-oak-plank-card-flip.mp3",
    seal: "/cdn/moodboard-lowpoly-cozy/sfx-rune-carved-seal-thunk.mp3",
    undo: "/cdn/moodboard-lowpoly-cozy/sfx-soft-wood-tap-undo.mp3",
    zoom: "/cdn/moodboard-lowpoly-cozy/sfx-lean-in-floorboard-creak.mp3",
  },
};
// ---- DATA CONTRACT (the bell writes cards/tally on board-bell.state; seals live on the vote-board row itself, the bell only reads them: Claude #11) ----
// voteCards: [{ n, id: "D12"|"S4", file, title, hash, why: "critical"|"split", critWhy, votes: { savi, claude }, line, sides, lean, risk }]
//   line/sides/lean/risk = JEV's scribe text ("" until written; the card shows title + votes without it). hash = cardHash(block) (idea-gate.js)
// voteMore: count beyond VB.maxCards (10) · voteRev: +1 whenever voteCards changes
// getObject("vote-board").state.seals: { "<id>": { vote: "YES"|"NO", hash, at, userId } }  (the vote board's OWN row, written by its script only, after the 5 s undo; the bell reads it and, once it sorts an idea, marks it used in board-bell.state.sealsUsed[id] = hash; it never writes the board's row)
// voteTally: { day: "YYYY-MM-DD", passed: [ids], dropped: [ids], building: [ids] } (plain code, no LLM)
// player.state.voteView = { on, at, card: 0 | 1..10, cardAt? }  (0 = the whole board; cardAt = when the rig last changed card, so the board's press ear skips that E)
// pending vote (during the 5 s undo) lives on the vote-board row: state.pending = { id, hash, vote, at, by }
