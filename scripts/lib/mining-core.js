// Pure Mining maths. No ctx: numbers in, numbers out.
import { ROCKS, PICKS } from './data/mining.js';
export const rockOf = (id) => ROCKS.find((r) => r.id === id) ?? null;
// OSRS skilling success: (1 + floor(low*(99-L)/98 + high*(L-1)/98 + 0.5)) / 256, clamped to 0..1
export const chance = (rock, level) => Math.max(0, Math.min(1, (1 + Math.floor(rock.low * (99 - level) / 98 + rock.high * (level - 1) / 98 + 0.5)) / 256));
// the fastest pickaxe in the pack the level lets you swing (fewest ticks; the cheaper one on a tie)
export function bestPick(inv, level) {
  let best = null;
  for (const x of inv ?? []) { const p = x && PICKS.find((q) => q.id === x.id); if (p && p.level <= level && (!best || p.ticks < best.ticks)) best = p; }
  return best;
}
