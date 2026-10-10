// Hiscores: world.state.hiscores = { playerName: { t: total level, x: total XP, at } }, written by the player's own script on a level-up and on arrival.
// Pure: skills in, a row out; a board and a name in, a new board out. No ctx.
import { SKILL_LIST } from './data/skills.js';
import { CB } from './data/combat.js';
import { levelOf, xpFor } from './skills-core.js';
export const HS_KEEP = 200; // rows kept (lowest dropped past this)
export const HS_SKIP = ['plipa']; // Claude's test body never appears on the board
const tenthsOf = (skills, id) => (id === 'hitpoints' ? skills?.hitpoints ?? CB.hpStartTenths : skills?.[id]) | 0;
export function rowOf(skills, now = 0) {
  let t = 0, x = 0;
  for (const k of SKILL_LIST) { const v = tenthsOf(skills, k.id); t += levelOf(v); x += v / 10; }
  return { t, x: Math.floor(x), at: now };
}
const better = (a, b) => b.t - a.t || b.x - a.x;
// the board with this player's row set (only when it changed); returns the same object when nothing changed
export function put(board, name, row) {
  const old = board?.[name]; if (old && old.t === row.t && old.x === row.x) return board ?? {};
  const next = { ...(board ?? {}), [name]: row }, names = Object.keys(next);
  if (names.length > HS_KEEP) { const drop = names.sort((a, b) => better(next[a], next[b])).slice(HS_KEEP); for (const n of drop) delete next[n]; }
  return next;
}
export const top = (board, n = 5) => Object.entries(board ?? {}).sort((a, b) => better(a[1], b[1])).slice(0, n).map(([name, r], i) => ({ rank: i + 1, name, t: r.t, x: r.x }));
export const maxTotal = SKILL_LIST.length * 99;
