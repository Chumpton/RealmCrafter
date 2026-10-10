// BOARD-CLICK (docs/board/proposals/BOARD-CLICK.md, creator GO 2026-09-30): every board in the den is aim + left click.
// One row per board; a future board is one more row here + a cards source (its own script writing <cardsRow>.state.cards).
// Readers: scripts/lib/board-kit.js (grid / hitLocal / hit), scripts/board-input.js, scripts/tex-board.js, ui.js. Hand-edited only.
//
// face = the board's front panel in its OWN local metres (origin = the row's feet, +Y up, front = local -Z, the viewer's
// right = local -X): w × h wide/tall, bottom edge y0 over the feet, front surface at local z. u runs 0..1 left→right AS SEEN
// from the front, v runs 0..1 top→bottom. Measured from the live rows (places/main/cells/x0z0.scene) and today's face maths:
//   jev    jev-board   feet (16.3, 24.95, 0)  yaw 105  board 2.0 × 1.5, y 0.2..1.7, faceZ -0.045   (data/jev-board.js size/boardY0/faceZ)
//   rune   vote-board  feet (16.3, 24.95, 3)  yaw 75   board 2.0 × 1.1, y 0.2..1.3, faceZ -0.045   (data/vote-board.js; cards live on board-bell)
//   judge  judge-board yard, lookAt           panel 2160 × 1400 px = local x ±1.08, y 1.0..2.4, box front z -0.01 (judge-board-input.js)
//   huginn huginn-board yard, lookAt          same panel as judge (huginn-board-input.js)
// slots: how many cards the face holds (judge: per page; tabs page it). buttons: the strip along each card's foot, left→right.
// tabs: frame tabs in a strip along the face's foot (the grid fills the face above it).
export const BOARDS = {
  reach: 6,                 // metres from the eye a click still counts (the raycast runs reach + 1)
  debounceMs: 250,          // one click per player per 250 ms
  loupe: { dwellMs: 350, scale: 2.2, out: 0.03 },
  aspect: 1.4,              // grid(): cols = round(sqrt(slots × w/h ÷ aspect)), rows = ceil(slots / cols)
  gutter: 0.03,             // each card = its cell minus 3 % on every side
  strip: 0.24,              // the button strip: this share of a card's height, along its foot
  tabStrip: 0.09,           // the frame tabs' strip: this share of the face's height, along its foot
  list: [
    { id: 'jev-board', name: 'JEV', source: 'jev', cardsRow: 'jev-board', slots: 25,
      face: { w: 2.0, h: 1.5, y0: 0.2, z: -0.045 }, buttons: ['YES', 'NO', 'UNDO'], tabs: [] },
    { id: 'vote-board', name: 'Critical', source: 'rune', cardsRow: 'board-bell', slots: 10, // the critical (rune) board: the face is vote-board, its cards ride board-bell's row
      face: { w: 2.0, h: 1.1, y0: 0.2, z: -0.045 }, buttons: ['YES', 'NO', 'UNDO'], tabs: [] },
    { id: 'judge-board', name: 'Photo', source: 'judge', cardsRow: 'judge-board', slots: 6, paged: true,
      face: { w: 2.16, h: 1.4, y0: 1.0, z: -0.01 }, buttons: [], tabs: ['PREV', 'NEXT'] },
    { id: 'huginn-board', name: 'HUGINN', source: 'huginn', cardsRow: 'huginn-board', slots: 50,
      face: { w: 2.16, h: 1.4, y0: 1.0, z: -0.01 }, buttons: ['ISSUE', 'DISMISS'], tabs: [] },
  ],
};
export function boardById(id) { return BOARDS.list.find((b) => b.id === id) ?? null; }
