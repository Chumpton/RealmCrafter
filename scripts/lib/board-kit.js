// BOARD-CLICK kit (docs/board/proposals/BOARD-CLICK.md D2): the ONE face maths every board shares, so what the painter
// (scripts/tex-board.js) draws is exactly what a click (scripts/board-input.js) hits. Pure except hit(): one raycast.
// Rects are face-local { u0, v0, u1, v1 }: u 0..1 left→right AS SEEN from the front, v 0..1 top→bottom (see data/boards.js).
import { raycast } from 'builtin/physics';
import { BOARDS, boardById } from './data/boards.js';

const rowOf = (b) => (typeof b === 'string' ? boardById(b) : b);
const inRect = (r, u, v) => u >= r.u0 && u <= r.u1 && v >= r.v0 && v <= r.v1;

// the part of the face the cards fill: the whole face, less the tab strip along its foot when the board has frame tabs
function areaOf(board) {
  const t = board.tabs?.length ? BOARDS.tabStrip : 0;
  return { u0: 0, v0: 0, u1: 1, v1: 1 - t };
}

// grid(slots, face[, board]) -> { cols, rows, cells: [{ n, col, row, cell, card }] }; n = 1..slots, left→right, top→bottom as seen.
// cols = round(sqrt(slots × w/h ÷ aspect)), rows = ceil(slots/cols): more slots, smaller cards, the same shape.
export function grid(slots, face, board = null) {
  const a = board ? areaOf(board) : { u0: 0, v0: 0, u1: 1, v1: 1 };
  const w = face.w * (a.u1 - a.u0), h = face.h * (a.v1 - a.v0);
  const cols = Math.max(1, Math.round(Math.sqrt((slots * w) / h / BOARDS.aspect))), rows = Math.ceil(slots / cols);
  const cw = (a.u1 - a.u0) / cols, ch = (a.v1 - a.v0) / rows, g = BOARDS.gutter, cells = [];
  for (let i = 0; i < slots; i++) {
    const col = i % cols, row = (i / cols) | 0;
    const cell = { u0: a.u0 + col * cw, v0: a.v0 + row * ch, u1: a.u0 + (col + 1) * cw, v1: a.v0 + (row + 1) * ch };
    const card = { u0: cell.u0 + cw * g, v0: cell.v0 + ch * g, u1: cell.u1 - cw * g, v1: cell.v1 - ch * g };
    cells.push({ n: i + 1, col, row, cell, card });
  }
  return { cols, rows, cells };
}

// cardLayout(card rect, buttons) -> { body, strip, buttons: [{ name, rect }] }: the buttons share a strip along the card's foot,
// equal widths, a small gap between; body = the card above the strip (a click anywhere on the card off a button is 'body').
export function cardLayout(card, buttons = []) {
  const cw = card.u1 - card.u0, chh = card.v1 - card.v0;
  if (!buttons.length) return { body: { ...card }, strip: null, buttons: [] };
  const sh = chh * BOARDS.strip, pad = cw * 0.04, padV = sh * 0.14;
  const strip = { u0: card.u0 + pad, v0: card.v1 - sh, u1: card.u1 - pad, v1: card.v1 - padV };
  const gap = cw * 0.03, bw = (strip.u1 - strip.u0 - gap * (buttons.length - 1)) / buttons.length;
  return {
    body: { u0: card.u0, v0: card.v0, u1: card.u1, v1: strip.v0 },
    strip,
    buttons: buttons.map((name, i) => ({ name, rect: { u0: strip.u0 + i * (bw + gap), v0: strip.v0 + padV, u1: strip.u0 + i * (bw + gap) + bw, v1: strip.v1 } })),
  };
}

// the frame tabs: one strip along the face's foot, split evenly (PREV left, NEXT right)
export function tabLayout(board) {
  const b = rowOf(board), t = b?.tabs ?? [];
  if (!t.length) return [];
  const v0 = 1 - BOARDS.tabStrip, w = 1 / t.length;
  return t.map((name, i) => ({ name, rect: { u0: i * w + 0.01, v0: v0 + 0.01, u1: (i + 1) * w - 0.01, v1: 0.99 } }));
}

// the whole face as one list, memoised per board: what the painter draws and hitLocal reads
const LAYOUT = new Map();
export function layoutOf(board) {
  const b = rowOf(board);
  if (!b) return null;
  let L = LAYOUT.get(b);
  if (!L) {
    const g = grid(b.slots, b.face, b);
    L = { cols: g.cols, rows: g.rows, cells: g.cells.map((c) => ({ ...c, ...cardLayout(c.card, b.buttons) })), tabs: tabLayout(b) };
    LAYOUT.set(b, L);
  }
  return L;
}

// hitLocal(board, u, v, opts) -> { n, part } | { tab } | null. Pure. n = the SLOT on the face (1..slots; a paged board adds its
// own page offset). part = 'body' | a button name. opts.loupe = { n, rect } (a card drawn bigger over the face): inside its
// rect the loupe's card answers, its buttons laid out by the same cardLayout; outside it the face answers as usual.
export function hitLocal(board, u, v, opts = {}) {
  const b = rowOf(board);
  if (!b || !Number.isFinite(u) || !Number.isFinite(v)) return null;
  const lp = opts.loupe;
  if (lp?.rect && inRect(lp.rect, u, v)) {
    const L = cardLayout(lp.rect, b.buttons);
    for (const x of L.buttons) if (inRect(x.rect, u, v)) return { n: lp.n, part: x.name };
    return { n: lp.n, part: 'body' };
  }
  const L = layoutOf(b);
  for (const t of L.tabs) if (inRect(t.rect, u, v)) return { tab: t.name };
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  const c = L.cells.find((x) => inRect(x.cell, u, v));
  if (!c || !inRect(c.card, u, v)) return null; // the gutter between cards is nothing
  if (opts.count != null && c.n > opts.count) return null; // an empty slot
  for (const x of c.buttons) if (inRect(x.rect, u, v)) return { n: c.n, part: x.name };
  return { n: c.n, part: 'body' };
}

// ---- the board's frame: world <-> face-local
function yawDeg(r) {
  if (typeof r === 'number') return r;
  if (r && typeof r.yaw === 'number') return r.yaw;
  return 0;
}
// world vector -> the board's local frame (the inverse of the row's rotation: a quaternion as it reads back, else a yaw)
export function toLocal(r, v) {
  if (r && typeof r.w === 'number') { // q* v q
    const x = -r.x, y = -r.y, z = -r.z, w = r.w;
    const tx = 2 * (y * v.z - z * v.y), ty = 2 * (z * v.x - x * v.z), tz = 2 * (x * v.y - y * v.x);
    return { x: v.x + w * tx + (y * tz - z * ty), y: v.y + w * ty + (z * tx - x * tz), z: v.z + w * tz + (x * ty - y * tx) };
  }
  const a = (yawDeg(r) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return { x: v.x * c - v.z * s, y: v.y, z: v.x * s + v.z * c };
}
// a ray (world) onto the face plane -> { u, v, t } | null (only from the front)
export function rayToFace(board, feet, rot, origin, dir) {
  const b = rowOf(board), f = b.face;
  const o = toLocal(rot, { x: origin.x - feet.x, y: origin.y - feet.y, z: origin.z - feet.z }), d = toLocal(rot, dir);
  if (d.z <= 1e-4) return null; // the face looks down local -Z: a ray must travel +Z to meet its front
  const t = (f.z - o.z) / d.z;
  if (!(t > 0)) return null;
  const lx = o.x + d.x * t, ly = o.y + d.y * t;
  return { u: (f.w / 2 - lx) / f.w, v: (f.y0 + f.h - ly) / f.h, t }; // seen-right = local -X
}

// hit(ctx, board, input, opts) -> { board, n, part, u, v, dist } | { board, tab, … } | null. The reticle's ray (the engine's
// pointer ray, as home-interaction.js aimForward reads it), one raycast out to reach + 1: the first thing it meets must be this
// board or a child of it (so a wall, a person or the back of the board takes the click), then the face plane gives u,v.
// opts: { loupe, count } as hitLocal, ignore (entity ids the ray passes), raycast (a stand-in, for the node test only).
export function hit(ctx, board, input, opts = {}) {
  const b = rowOf(board), a = input?.axes ?? {};
  if (!b || typeof a.pointerDirX !== 'number' || typeof a.pointerOriginX !== 'number') return null;
  const dir = { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 }, len = Math.hypot(dir.x, dir.y, dir.z);
  if (len < 0.5) return null; // an empty ray (no pointer yet, a scripted body) is no ray
  dir.x /= len; dir.y /= len; dir.z /= len;
  const origin = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 };
  const o = ctx.getObject(b.id);
  if (!o) return null;
  const r = (opts.raycast ?? raycast)(ctx, origin, dir, { distance: BOARDS.reach + 1, hits: 'both', ignoreEntities: opts.ignore });
  const id = String(r?.id ?? '');
  if (!r || (id !== b.id && !id.startsWith(b.id + '/'))) return null;
  const feet = o.worldFeetPosition ?? o.feetPosition;
  const f = rayToFace(b, feet, o.rotation, origin, dir);
  if (!f || f.t > BOARDS.reach + 1 || f.t > r.distance + 0.15) return null; // the face lies behind what the ray met
  const h = hitLocal(b, f.u, f.v, opts);
  return h ? { board: b.id, ...h, u: f.u, v: f.v, dist: f.t } : null;
}
