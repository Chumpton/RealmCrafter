// Chess at the north bench — the ONE shared contract every chess file reads (design.md "Chess at the north bench").
// Board row: lore-hnefatafl (id kept). Players: Gunnar = lore-tafl-bearded (x 3.7, faces +X), Sigrid = lore-tafl-maiden (x 5.3, faces -X).
// Squares: "a1".."h8". Ranks run along world X, files along world Z. The side whose player sits at LOW x (Gunnar's seat)
// has rank 1 at low x and the a-file at low z; flipped 180° when the high-x player (Sigrid) has white.
import { CHESS_SEAT } from './chess-seat.js';
export const CHESS = {
  board: CHESS_SEAT.board,       // the board and players live in ./chess-seat.js (the HUD reads them at arrival without this whole file)
  players: CHESS_SEAT.players,
  // engine (jobs/chess.js): searched per mover; the job answers the top `candidates` moves with centipawn scores
  engine: {
    candidates: 5,
    gunnar: { depth: 4, quiescence: true },
    sigrid: { depth: 2, quiescence: false },
  },
  // minds (jev:decide over the engine's candidates)
  mind: {
    gunnar: { style: 'patient, positional, punishes every loose piece, converts endgames cleanly; plays the opening fast from memory', window: 50, blunder: 0 },
    sigrid: { style: 'aggressive club player, loves checks, captures and attacking the king, often misses quiet threats and back-rank ideas, sometimes hangs a piece', window: 100, blunder: 0.03 },  // round 10 calibration: 8/8 Gunnar either way; 0.08/400 ended games at ~40 plies, 0.03/100 at ~62
    clearSkip: true,   // JEV-LOAD L3: one candidate inside the mover's window = play it, no jev:decide ask ('clear'); false = always ask
    // CHESS-TENTH (creator 2026-09-30: "chess needs 90% less calls ... still looks and feels natural"): JEV is asked only on a big moment
    // (in check, the opponent just captured, or the window holds a capture/check beside a quiet move), and at most perHour asks per hour;
    // every other move is the player's own style pick (Gunnar the best line, Sigrid a softmax), on the same think clock and motion.
    jevBudget: { perHour: 18, bigOnly: true },  // hour 95 asked 193 times; 18 is under a tenth
    nearM: 15,         // JEV-LOAD K2: no player within this many metres (horizontal) of CHESS.board.center = the no-mind fallback pick ('nobody-near'); 0 = always ask
    // window: centipawns from the best candidate a pick may fall · blunder: chance a move is drawn from ALL legal moves weighted toward flashy ones
  },
  tempo: {
    think: { gunnar: [5.6, 12], sigrid: [7, 17.6] },  // seconds from the opponent's clack to this mover's reach, scaled up by tension; + ~2.4 s reach/carry/settle = 8–20 s clack to clack (round 12 soak: 4/20 gave 6.4–22.4)
    openingFast: 8,        // Gunnar's first N moves use the low end
    reach: 0.9,            // lean + reach
    carry: 0.7,            // lift, carry, set down
    settle: 0.8,
    matePause: 20,         // seconds after mate before the reset
    mindWait: 20,          // seconds a jev ask may take before the fallback pick plays
    maxPlies: 300,         // hard stop: draw
  },
  pieceIds: 'chess-p-',     // piece rows: chess-p-0 … chess-p-31, children of nobody (world rows), state { kind, side, sq, captured }
  kinds: ['k', 'q', 'b', 'n', 'r', 'p'],  // jarl, seeress, shieldmaiden, horse, longship, spearman
  sides: { w: 'bone', b: 'walnut' },
  // live game on the board row's state: board.state.chess = { fen, whiteSeat: 'low'|'high', ply, moveNo, turn: 'w'|'b',
  //   phase: 'think'|'move'|'mate'|'reset', last: { by, san, from, to, words }, history: [san…], check, result, thinkingSince }
  // forever record: SQL table chess_record; mirrored onto tracker row 'chess-runeboard' state { gunnar: { w, d, l }, sigrid: { w, d, l }, games, tally: [ 'g'|'s'|'d' … last 30 ] }
  tracker: { id: 'chess-runeboard' },
  sounds: {
    clack: '/cdn/moodboard-lowpoly-cozy/sfx-chess-piece-wood-clack.mp3',
    capture: '/cdn/moodboard-lowpoly-cozy/sfx-chess-capture-clatter.mp3',
    check: '/cdn/moodboard-lowpoly-cozy/sfx-knuckle-tap-table.mp3',
    mate: '/cdn/moodboard-lowpoly-cozy/sfx-viking-table-cheer-mugs.mp3',
    hmm: '/cdn/moodboard-lowpoly-cozy/sfx-thoughtful-hum-viking.mp3',
    reset: '/cdn/moodboard-lowpoly-cozy/sfx-chess-pieces-sweep-box.mp3',
    zoomIn: '/cdn/moodboard-lowpoly-cozy/sfx-soft-wood-creak-lean-in.mp3',
    // react lane (scripts/lib/chess-react.js) — appended
    draw: '/cdn/moodboard-lowpoly-cozy/sfx-two-vikings-shrug-grunt-draw.mp3',
    dust: '/cdn/moodboard-lowpoly-cozy/sfx-small-wooden-piece-drops-on-oak-bench-rail.mp3',
    voice: { // throat identities: /cdn/voice-<identity>-saying-<slug>.mp3 — one per player, every line derives from it
      gunnar: 'voice-gunnar-deep-calm-gravel-voiced-old-viking-man',
      sigrid: 'voice-sigrid-bright-bold-young-viking-woman',
    },
    lines: {
      gunnar: { check: ['check', 'your-jarl-is-naked', 'mind-your-king-girl', 'and-there-he-stands-alone'], win: ['heh-heh-a-good-game-sigrid'], lose: ['ohh-well-played-well-played'] },
      sigrid: { check: ['ha-check', 'watch-your-king-old-man', 'check-old-bear', 'run-little-jarl'], win: ['ha-ha-i-beat-you-gunnar'], lose: ['ugh-again-not-again'] },
    },
  },
  view: { // E on the board: the presser's own camera eases in over it
    duration: 1.8, easing: 'easeInOutCubic', height: 0.72, back: 0.45, fov: 52, glowAfter: 0.92, // 0.85 m from the centre: the rim (±0.32) sits inside a square frame's 26° half-angle
    out: 1.2, arc: 0.22, drift: 0.015, lookLimit: 25, glowIntensity: 1.2, glowFade: 0.6, glowColor: 'oklch(0.85 0.1 70)', glowRange: 2.6,
    material: CHESS_SEAT.material, // the panel's eval bar fallback (./chess-seat.js)
  },
};
export function squareWorld(sq, whiteSeat) {
  const B = CHESS.board, f = sq.charCodeAt(0) - 97, r = +sq[1] - 1, s = whiteSeat === 'high' ? -1 : 1;
  return { x: B.center.x + (r - 3.5) * B.square * s, y: B.topY, z: B.center.z + (f - 3.5) * B.square * s };
}
// ── motion (lane 6, scripts/lib/chess-motion.js) ─ metres / seconds / degrees. Body points {fwd, side, up} are in the seated
// row's own frame from its feet (side + = its right), scaled by the row's scale. Hand targets drive the rightArm/leftArm IK chains.
CHESS.motion = {
  hand: { back: 0.035, grip: 0.075, hover: 0.13 },  // wrist target vs a piece's feet: toward the mover, above it (hover = over the square before the grip)
  reachSplit: 0.72,            // share of a reach spent travelling to the hover point; the rest descends onto the piece
  lift: 0.04, arc: 0.025, arcPerM: 0.12, knightArc: 0.035,   // carry: lift, then an arc over the board (horses hop higher)
  split: { lift: 0.2, travel: 0.65, set: 0.15 },             // shares of CHESS.tempo.carry
  gripT: 0.12, releaseT: 0.16, between: 0.55,                // fingers close / open · hand from one piece to the next
  squash: { y: 0.88, xz: 1.05, down: 0.05, up: 0.16 },      // the landing
  flick: { lift: 0.03, liftT: 0.08, time: 0.45, arc: 0.07, hop: 0.012, hopT: 0.12, hand: 0.07, handT: 0.14 },
  promo: { lift: 0.05, up: 0.2, pulse: 1.3, pulseT: 0.35, down: 0.15 },
  // capturer's right-hand rail, from its own end inward. The tray (lore-props chess-bench, Claude's) is 0.054 m deep inside,
  // x ±0.262, felt top at bench feet + 0.4975 = 24.9475 → dy −0.0225 under topY. Row 0 fills the tray (start 0.235 keeps a
  // 0.026 m jarl base off the end wall); row 1 (9th+ capture) stands on the bench top just outside the tray's outer wall
  // (z ±0.423, wall ends ±0.395, top 24.94 → rowDy −0.03).
  rail: { dz: 0.36, row: 0.063, start: 0.235, step: 0.065, perRow: 8, dy: -0.0225, rowDy: -0.03 },
  // standing piece heights (m, measured bounds) — a carried or flicked piece lifts over the tallest one near its path by `clear`
  heights: { p: 0.04, r: 0.048, n: 0.0523, b: 0.0581, q: 0.0679, k: 0.075 }, clear: 0.01, pathR: 0.05,
  lean: { base: 18, perM: 30, near: 0.5, max: 34, lowerShare: 0.4, head: 14 },  // Spine1 pitch (+ Spine share) by reach distance
  // the FOLK.hands grip pose as an additive layer over the relaxed channel: grip − relaxed (anim/hands-grip.yml − hands-relaxed.yml), roll°
  fingers: { Index1: 33, Index2: 37, Index3: 25, Middle1: 34, Middle2: 33, Middle3: 23, Ring1: 35, Ring2: 31, Ring3: 21,
             Pinky1: 36, Pinky2: 29, Pinky3: 19, Thumb1: 10, Thumb2: 20, Thumb3: 17, thumbPitch: -28 },
  people: {
    gunnar: {  // leans back with his mead (left hand) between moves; strokes his beard leaning in while he thinks
      rest: { bones: { Spine1: { pitch: -6 }, Spine: { pitch: 0 }, Head: { pitch: 6 } }, rightArm: null,
              leftArm: { at: { fwd: 0.3, side: -0.14, up: 0.82 }, weight: 1 }, mead: true },
      think: { bones: { Spine1: { pitch: 14 }, Spine: { pitch: 4 }, Head: { pitch: 16 } },
               rightArm: { at: { fwd: 0.2, side: 0.03, up: 0.97 }, weight: 1 }, leftArm: { at: { fwd: 0.34, side: -0.14, up: 0.74 }, weight: 1 } },
    },
    sigrid: {  // elbows on the table between moves; chin in her left hand while she thinks
      rest: { bones: { Spine1: { pitch: 16 }, Spine: { pitch: 2 }, Head: { pitch: 8 } },
              rightArm: { at: { fwd: 0.42, side: 0.07, up: 0.58 }, weight: 0.9 }, leftArm: { at: { fwd: 0.42, side: -0.07, up: 0.58 }, weight: 0.9 } },
      think: { bones: { Spine1: { pitch: 22 }, Spine: { pitch: 6 }, Head: { pitch: 6, roll: -6 } },
               rightArm: { at: { fwd: 0.42, side: 0.1, up: 0.58 }, weight: 0.9 }, leftArm: { at: { fwd: 0.2, side: -0.02, up: 0.9 }, weight: 1 } },
    },
  },
  mead: { id: 'chess-mead', bone: 'LeftHand', params: { item: 'mug' }, feet: { x: -0.02, y: 0.09, z: 0.05 }, rotation: { yaw: 0, pitch: 0, roll: -90 }, scale: 1.1 },
  restIn: 0.9, thinkIn: 1.1,
};
