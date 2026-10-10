// The part of the chess contract the HUD (ui.js) reads at arrival: the board row, its two players and the eval-bar fallback.
// scripts/lib/data/chess.js builds CHESS on these very objects (CHESS.board, CHESS.players, CHESS.view.material), so this is still the
// ONE place these numbers live; the rest of chess.js (engine, minds, tempo, view, motion) now loads only with the chess lane.
export const CHESS_SEAT = {
  board: {
    id: 'lore-hnefatafl',
    center: { x: 4.5, z: 5.35 },   // world centre of the 8×8 playing field
    topY: 24.97,                   // world y of the playing surface (the bench lane re-measures and updates this ONE number)
    square: 0.07,                  // metres per square → 0.56 m field
  },
  players: {
    gunnar: { id: 'lore-tafl-bearded', name: 'Gunnar', seat: 'low', elo: 2300 },
    sigrid: { id: 'lore-tafl-maiden', name: 'Sigrid', seat: 'high', elo: 1200 },
  },
  material: { p: 100, n: 300, b: 310, r: 500, q: 900 }, // centipawns by material off the FEN, when the last move carries no engine score
};
