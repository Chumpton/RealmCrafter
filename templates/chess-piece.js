// One Norse chess piece — the match lane spawns chess-p-0..31 from this with params { kind: k|q|b|n|r|p, side: w|b } (scripts/lib/data/chess.js).
export const piece = {
  primitive: { kind: 'scripted', script: 'scripts/gen/chess-piece.js', params: { kind: 'p', side: 'w' } },
  physics: 'none',
  castShadow: false,
  visibleRange: { max: 20 },
  tags: ['chess-piece'],
};
