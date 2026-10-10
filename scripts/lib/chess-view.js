// E on the chess board: the presser's own camera eases in over the board (design.md "Chess at the north bench").
// press() runs where the board's press ear rings — it only toggles the presser's player.state.chessView.
// Everything seen (the eased eye, the fov, the warm glow, the lean-in creak) is the presser's own rig: scripts/camera.js,
// through the helpers below, so no other screen moves.
import { CHESS } from './data/chess.js';

const REPRESS_MS = 450; // the rig closes the view on this same E press; the board's ear must not reopen it

export function press(ctx, { by } = {}) {
  const p = ctx.place.players.find((q) => q.id === by) ?? (by ? ctx.getObject(by) : null);
  if (!p) return;
  const cv = p.state.chessView, now = ctx.now();
  if (cv?.on) { p.state.chessView = { on: false, at: now }; return; }
  if (cv && now - (cv.at ?? 0) < REPRESS_MS) return;
  p.state.chessView = { on: true, at: now, board: CHESS.board.id };
}

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// the board's centre on its playing surface
export function boardCentre() {
  const B = CHESS.board;
  return { x: B.center.x, y: B.topY, z: B.center.z };
}

// the vantage over the presser's side: the board side nearest them (the wall side, north, reads as south),
// CHESS.view.back metres out from the centre toward them, CHESS.view.height over the playing surface
export function vantage(from) {
  const C = boardCentre(), dx = from.x - C.x, dz = from.z - C.z;
  let sx = 0, sz = 0;
  if (Math.abs(dx) > Math.abs(dz)) sx = Math.sign(dx) || 1; else sz = Math.sign(dz) || -1;
  if (sz > 0) sz = -1; // north is the hall wall
  return { x: C.x + sx * CHESS.view.back, y: C.y + CHESS.view.height, z: C.z + sz * CHESS.view.back, sx, sz };
}

// yaw/pitch (radians, the rig's convention: yaw 0 faces -Z, +pitch looks up) from a to b
export function lookAngles(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  return { yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

// the local warm glow over the board: this screen alone, gone with the session
export function spawnGlow(ctx) {
  const C = boardCentre(), V = CHESS.view;
  return ctx.spawn({
    audience: 'local', scope: 'session', tags: ['chess-glow'],
    feetPosition: { x: C.x, y: C.y + 1, z: C.z },
    light: { kind: 'point', color: V.glowColor, intensity: 0, distance: V.glowRange, castShadow: false },
  });
}
export function setGlow(ctx, id, intensity) {
  const g = id && ctx.getObject(id);
  if (!g) return false;
  const V = CHESS.view;
  g.light = { kind: 'point', color: V.glowColor, intensity, distance: V.glowRange };
  return true;
}
