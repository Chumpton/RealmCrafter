// BOARD STYLE (BOARD-CLICK D4, lane W2): the JEV board's card template as DATA, shared by every board face.
// One painter (scripts/tex-board.js) draws it; board-kit's hitLocal reads cardTemplate() so what you see is what you click;
// boardHtml() is the same template as an HTML ui face (fallback for any board that keeps a DOM face).
// Units: a card is laid out in its own px/metres; every zone below is a FRACTION: y and heights of the type unit f
// (f = min(cardH, cardW / 1.4): the JEV card's own shape), x of the card width. Palette: scripts/lib/data/aesthetic.yml.
export const STYLE = {
  font: 'Georgia, serif',
  canvasMax: 1024,                 // the engine caps a texture script at 1024 a side
  flip: true,                      // the board face planes' UVs run mirrored from the front (tex-jev-board): one flip, text reads true
  gutter: 0.03,                    // fallback grid: card = cell minus 3 % each side (board-kit grid() is the authority once it stands)
  c: {
    linen: '#f2e6cf', walnut: '#4f3828', honey: '#ba8950', sage: '#9baf84', teal: '#5dada9', slate: '#343c43',
    ink: '#2e1d10', dark: '#3b2413', backing: '#5a3a22', grain: '#e0b27a', oak: '#b8783c', cream: '#fbeed2',
    rust: '#9a3f25', muted: '#6b4a2e', weave: '#b89a70', nail: '#2a1a0e',
  },
  card: { radius: 0.05, stroke: 0.018, shadow: 0.025, nail: 0.012, weaveLines: 6, emptyFill: 'oak', fill: 'linen' },
  disc: { x: 0.13, y: 0.13, r: 0.1, px: 0.12, fill: 'walnut', ink: 'cream', rim: 'honey' },   // number disc, top-left
  head: { y: 0.055, h: 0.1, px: 0.062, kinds: ['id', 'kind', 'critical', 'tier', 'status'] }, // chips of these k ride the header, right-aligned
  title: { y: 0.27, px: 0.086, lh: 1.15, lines: 2, ink: 'ink' },
  body: { px: 0.06, lh: 1.2, lines: 3, ink: 'muted' },
  chips: { h: 0.105, px: 0.058, gap: 0.03, pad: 0.035 },
  buttons: { h: 0.16, bottom: 0.06, padX: 0.05, gapX: 0.04, px: 0.08, radius: 0.035, drop: 0.018 },
  pic: { top: 0.04, side: 0.035, bg: 'slate' },                     // a card with pic: the picture fills from the top, title (1 line) under it
  hover: { color: 'honey', lift: 0.02, width: 0.03 },               // hover lift: honey edge, card raised
  stamp: { r: 0.17, x: 0.8, y: 0.44, rot: -14, px: 0.075, alpha: 0.88 }, // wax stamp on a card you voted (mine)
  button: {                        // bg, ink (palette keys or colours)
    YES: { bg: 'sage', ink: 'slate' }, NO: { bg: 'rust', ink: 'cream' }, UNDO: { bg: 'slate', ink: 'cream' },
    ISSUE: { bg: 'teal', ink: 'slate' }, DISMISS: { bg: 'slate', ink: 'cream' }, OPEN: { bg: 'honey', ink: 'ink' },
  },
  chip: {                          // chip colours by k; text is the board's own words
    lean: { bg: '#d9b27a', ink: 'ink', dash: true }, pass: { bg: 'sage', ink: 'ink', dash: true },
    critical: { bg: '#9c2a1a', ink: 'cream' }, status: { bg: 'rgba(59,36,19,.16)', ink: 'muted' },
    score: { bg: 'slate', ink: '#f2d8a0' }, tier: { bg: 'teal', ink: 'slate' }, tier1: { bg: '#9c2a1a', ink: 'cream' },
    id: { bg: 'rgba(59,36,19,.12)', ink: 'muted' }, kind: { bg: 'rgba(59,36,19,.12)', ink: 'muted' },
    yes: { bg: '#3f6b27', ink: 'cream' }, no: { bg: '#8e2b1b', ink: 'cream' }, shelf: { bg: '#6b5a2e', ink: 'cream' },
    seal: { bg: '#d9a93a', ink: '#5a3c0c' }, count: { bg: '#4f3828', ink: '#f2e6cf' }, // HUGINN-V3 E5: CLUSTER count badge, walnut with linen ink, still
    default: { bg: 'rgba(59,36,19,.18)', ink: '#5a3a22' },
  },
  // per-board defaults until BOARDS (scripts/lib/data/boards.js) names them: face metres (the painted plane), slots, buttons, empty line
  boards: {
    'jev-board': { name: 'JEV', face: { w: 2.0, h: 1.5 }, slots: 25, buttons: ['YES', 'NO'], empty: 'JEV has nothing waiting' },
    'vote-board': { name: 'Critical', face: { w: 2.0, h: 1.1 }, slots: 10, buttons: ['YES', 'NO'], empty: 'nothing critical waits' },
    'judge-board': { name: 'Photo', face: { w: 2.16, h: 1.4 }, slots: 6, buttons: [], empty: 'nothing waiting on the judges' },
    'huginn-board': { name: 'HUGINN', face: { w: 2.16, h: 1.4 }, slots: 50, buttons: ['ISSUE', 'DISMISS'], empty: 'HUGINN has seen nothing amiss' },
  },
};
export const col = (k, S = STYLE) => (k && S.c[k]) || k;
// the vote a card carries for this viewer: mine = 'YES' | 'NO' | { vote } | true (true = highlight only)
export const mineVote = (c) => (typeof c?.mine === 'string' ? c.mine : c?.mine?.vote) || null;
// the buttons a card shows: a voted card shows UNDO alone (vote boards); a card may carry its own list
export function cardButtons(c, boardButtons = []) {
  if (Array.isArray(c?.buttons)) return c.buttons;
  if (mineVote(c) && boardButtons.includes('YES')) return ['UNDO'];
  return boardButtons;
}
// THE card template: zones as fractions of the card (x of w, y of h), for a card w × h (any unit) with these buttons.
// Pure; hitLocal and the painter both read it. { f, disc, head, title, body, pic, chips, buttons: [{ name, x, y, w, h }] }
export function cardTemplate(w, h, names = [], opts = {}, S = STYLE) {
  const f = Math.min(h, w / 1.4), fy = f / h, B = S.buttons, out = { f: fy };
  // opts.btns = the kit's button rects (board-kit cardLayout, card-relative 0..1): the painter draws exactly what a click hits
  const bh = B.h * fy, btop = opts.btns?.length ? Math.min(...opts.btns.map((b) => b.y)) : names.length ? 1 - B.bottom * fy - bh : 1 - B.bottom * fy * 0.5;
  const bw = names.length ? (1 - 2 * B.padX - B.gapX * (names.length - 1)) / names.length : 0;
  out.buttons = opts.btns?.length ? opts.btns : names.map((name, i) => ({ name, x: B.padX + i * (bw + B.gapX), y: btop, w: bw, h: bh }));
  const ch = S.chips.h * fy, ctop = btop - S.chips.gap * fy - ch;
  out.chips = { y: ctop, h: ch };
  out.disc = { x: S.disc.x * f / w, y: S.disc.y * fy, r: S.disc.r * fy };
  out.head = { y: S.head.y * fy, h: S.head.h * fy };
  if (opts.pic) {
    const top = S.pic.top * fy, tl = S.title.px * S.title.lh * fy;
    out.pic = { x: S.pic.side, y: top, w: 1 - 2 * S.pic.side, h: Math.max(0.1, ctop - top - tl - 0.03 * fy) };
    out.title = { y: out.pic.y + out.pic.h + 0.012 * fy, lines: 1 };
    out.body = { y: ctop, lines: 0 };
  } else {
    const ty = S.title.y * fy, tl = S.title.px * S.title.lh * fy, by = ty + S.title.lines * tl + 0.01 * fy;
    const bl = S.body.px * S.body.lh * fy, lines = Math.max(0, Math.min(S.body.lines + (names.length ? 0 : 2), Math.floor((ctop - 0.012 * fy - by) / bl)));
    out.title = { y: ty, lines: S.title.lines };
    out.body = { y: by, lines };
  }
  return out;
}
// fallback grid (the plan's D2 formula) until scripts/lib/board-kit.js grid() stands; face in metres. Cells tile the face.
export function gridOf(slots, face, S = STYLE) {
  const cols = Math.max(1, Math.round(Math.sqrt(slots * face.w / face.h / 1.4))), rows = Math.max(1, Math.ceil(slots / cols));
  const cw = face.w / cols, chh = face.h / rows, g = S.gutter;
  return { cols, rows, cell: { w: cw, h: chh }, card: { w: cw * (1 - 2 * g), h: chh * (1 - 2 * g) },
    rect: (i) => ({ x: (i % cols) * cw + cw * g, y: ((i / cols) | 0) * chh + chh * g, w: cw * (1 - 2 * g), h: chh * (1 - 2 * g) }) }; // top-left origin, as SEEN
}
