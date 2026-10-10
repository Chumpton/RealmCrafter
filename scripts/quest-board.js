// The Ravenholdt quest board: E (the den's press) unrolls today's postings for the presser (player.state.boardRead,
// drawn by ui/hud/quest-board.js); a second E or showSec later rolls it up. Day = the room clock's day.
import { BOARD } from './lib/data/quest-board.js';
const PAPER = '/cdn/moodboard-lowpoly-cozy/sfx-parchment-paper-rustle-unpin.mp3';
export const ears = {
  press: (ctx, { by } = {}) => {
    const p = ctx.place.players.find((q) => q.id === by); if (!p) return;
    const a = ctx.self.worldFeetPosition || ctx.self.feetPosition, f = p.worldFeetPosition || p.feetPosition;
    if (Math.hypot(a.x - f.x, a.z - f.z) > BOARD.reach) return;
    if (p.state.boardRead) { delete p.state.boardRead; return; }
    const at = ctx.now(); p.state.boardRead = { at, day: Math.floor(at / 86400000) };
    ctx.self.state.read = (ctx.self.state.read ?? 0) + 1;
    ctx.emit('playSound', { clip: PAPER, volume: 0.6 }, { audience: { player: by } });
    ctx.emit('flash', { target: ctx.self.id, color: '#ffd27a', duration: 0.25 });
    ctx.after(BOARD.showSec, 'rollUp', { by, at });
  },
};
export function rollUp(ctx, { by, at } = {}) {
  const p = ctx.place.players.find((q) => q.id === by);
  if (p && p.state.boardRead?.at === at) delete p.state.boardRead;
}
