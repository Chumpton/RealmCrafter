// SKILLS-WC core: the OSRS XP engine, shared by every skill. Pure functions; no ctx.
import { fletchUnlocks } from './fletch-core.js';
import { gatherUnlocks } from './gather-core.js';
import { SK, AXES, ACTIONS, ITEMS } from "./data/skills.js";
import { ROCKS } from "./data/mining.js";
import { SMELT, FORGE } from "./data/smith.js";
import { CRAFT } from "./data/craft.js";
import { drainMul, jumpFeet } from "./data/stamina.js";
import { SPELLS } from "./data/combat.js";
import { BOWS as FBOWS } from "./data/fletch.js";

// XP(L) = floor(0.25 * sum_{l=1}^{L-1} floor(l + 300 * 2^(l/7))), in tenths
export const XP_TABLE = (() => {
  const t = [0, 0]; let acc = 0;
  for (let L = 2; L <= 99; L++) { const l = L - 1; acc += Math.floor(l + 300 * Math.pow(2, l / 7)); t[L] = Math.floor(acc / 4) * 10; }
  return t; // t[L] = tenths needed for level L
})();
export const xpFor = (L) => XP_TABLE[Math.max(1, Math.min(99, L))] / 10;
export function levelOf(tenths) {
  tenths = tenths | 0; let lo = 1, hi = 99;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (XP_TABLE[m] <= tenths) lo = m; else hi = m - 1; }
  return lo;
}
export const toTenths = (xp) => Math.round(xp * 10);
export function progress(tenths) {
  const lv = levelOf(tenths); if (lv >= 99) return { level: 99, into: 0, need: 0, pct: 1, toNext: 0 };
  const a = XP_TABLE[lv], b = XP_TABLE[lv + 1];
  return { level: lv, into: (tenths - a) / 10, need: (b - a) / 10, pct: (tenths - a) / (b - a), toNext: (b - tenths) / 10 };
}
// unlock text per skill and level
export function unlocksAt(skill, level) {
  const out = [];
  for (const a of ACTIONS) if (a.skill === skill && a.levelReq === level) out.push(`You can now cut ${a.kind === "normal" ? "normal trees" : a.name + " trees"}.`);
  if (skill === "running") out.push(`Running now drains ${Math.round(drainMul(level) * 100)}% stamina.`);
  if (skill === "jumping") out.push(`You can now jump ${jumpFeet(level).toFixed(1)} ft.`);
  if (skill === "magic") for (const sp of SPELLS) if (sp.level === level) out.push(`You can now cast ${sp.name}.`);
  out.push(...gatherUnlocks(skill, level));
  if (skill === "fletching") out.push(...fletchUnlocks(level));
  if (skill === "crafting" && level > 1) for (const r of CRAFT) if (r.level === level) out.push(`You can now craft ${r.name.toLowerCase()}.`);
  if (skill === "mining") for (const r of ROCKS) if (r.level === level && level > 1) out.push(`You can now mine ${r.name.toLowerCase()}s.`);
  if (skill === "smithing" && level > 1) { for (const r of SMELT) if (r.level === level) out.push(`You can now smelt ${r.name.toLowerCase()}s.`); const g = FORGE.filter((r) => r.level === level && ITEMS[Object.keys(r.make)[0]]).map((r) => r.name.toLowerCase()); if (g.length) out.push(`You can now smith ${g.join(", ")}.`); }
  if (skill === "ranged") for (const b of FBOWS) if (b.wield === level && level > 1) out.push(`You can now wield ${b.name.toLowerCase()}s.`);
  if (skill === "hitpoints") out.push(`Your max health is now ${level}.`);
  if (skill === "woodcutting") for (const x of AXES) if (x.levelReq === level && level > 1) out.push(`You can now use ${x.name}s.`);
  return out;
}
// addXP: returns the new tenths and every level crossed (several at once possible)
export function addXP(skills, skill, xpTenths) {
  const before = skills?.[skill] | 0, after = Math.min(SK.maxTenths, before + Math.max(0, Math.floor((xpTenths | 0) * (SK.xpMult ?? 1))));
  const from = levelOf(before), to = levelOf(after), up = [];
  for (let L = from + 1; L <= to; L++) up.push({ level: L, unlocks: unlocksAt(skill, L) });
  return { tenths: after, gained: after - before, from, to, up };
}
// OSRS gathering roll
export function chance(low, high, level) {
  const lv = Math.max(1, Math.min(99, level));
  return Math.min(1, (1 + Math.floor(low * (99 - lv) / 98 + high * (lv - 1) / 98 + 0.5)) / 256); // OSRS's exact form, one floor (plan S11)
}
export const actionOf = (kind) => ACTIONS.find((a) => a.kind === kind || a.id === kind) ?? null;
// the axe low/high scaled for this tree (floored, at least 1)
export function treeOdds(action, axe) {
  const lo = Math.max(1, Math.floor(axe.low * action.low)), hi = Math.max(1, Math.floor(axe.high * action.high));
  return { low: lo, high: hi };
}
// best axe the player owns and meets the level for
export function bestAxe(inv, level) {
  const owned = new Set((inv ?? []).filter(Boolean).map((s) => s.id));
  let best = null; for (const a of AXES) if (owned.has(a.id) && a.levelReq <= level) best = a;
  return best;
}
export const axeById = (id) => AXES.find((a) => a.id === id) ?? null;
// backpack drag (OSRS): the item in `from` goes to `to`, whatever was there goes back to `from` (an empty target just receives it). Returns the new slots, or null when nothing moves.
export function moveInv(inv, from, to, n = SK.invSlots) {
  from |= 0; to |= 0; if (from === to || from < 0 || to < 0 || from >= n || to >= n) return null;
  const a = Array.isArray(inv) ? inv.slice(0, n) : []; while (a.length < n) a.push(null);
  if (!a[from]) return null; const t = a[to] ?? null; a[to] = a[from]; a[from] = t; return a;
}
export function normInv(inv) { const a = Array.isArray(inv) ? inv.slice(0, SK.invSlots) : []; while (a.length < SK.invSlots) a.push(null); return a.map((s) => (s && typeof s.id === "string" ? { id: s.id } : null)); }
