// MMO prompt 4/6: pure math for Fishing, Cooking, Firemaking. No ctx.
import { GA, FISH, MEAT, SPOT_KINDS, COOK, LOGS_FM, RANGES, cookP } from "./data/gather.js";
export const fishOf = (id) => FISH.find((f) => f.id === id) ?? MEAT.find((f) => f.id === id) ?? null;
export const cookOf = (id) => COOK.find((c) => c.id === id) ?? null;
export const logOf = (id) => LOGS_FM.find((l) => l.id === id || l.kind === id) ?? null;
export const catchChance = (level, fishLevel) => Math.max(0, Math.min(0.9, 0.3 + 0.012 * (level - fishLevel)));
export function burnChance(level, c, range) { const [lo, hi] = range ? c.hearth : c.fire; return 1 - cookP(level, lo, hi); } // OSRS low/high per heat source (range = the long hearth)
export const lightChance = (level, logLevel) => Math.max(0, Math.min(1, 0.4 + 0.02 * (level - logLevel)));
const owns = (inv, id) => (inv ?? []).some((x) => x?.id === id);
// which fish of this spot the player can try for, highest level first, and why the rest are out
export function spotOptions(kind, level, inv, supplies) {
  const k = SPOT_KINDS[kind]; if (!k) return { can: [], why: "none" };
  const fish = k.fish.map(fishOf).filter(Boolean).sort((a, b) => b.level - a.level);
  const can = fish.filter((f) => f.level <= level && owns(inv, f.tool) && (!f.supply || (supplies?.[f.supply] | 0) > 0));
  if (can.length) return { can, why: null };
  const lowest = fish[fish.length - 1];
  if (lowest.level > level) return { can, why: "level", need: lowest.level };
  const reach = fish.filter((f) => f.level <= level);
  const tool = reach.find((f) => !owns(inv, f.tool));
  if (tool && !reach.some((f) => owns(inv, f.tool))) return { can, why: "tool", tool: tool.tool };
  const sup = reach.find((f) => f.supply && owns(inv, f.tool));
  return { can, why: "supply", supply: sup?.supply ?? "bait" };
}
// roll the highest fish first, fall back to lower ones. rnd() -> 0..1
export function rollCatch(can, level, rnd) {
  for (const f of can) if (rnd() < catchChance(level, f.level)) return f;
  return null;
}
// the anglerfish overheal ceiling (OSRS boost)
export function overhealCap(max) { return max + Math.floor(max / 10) + (max < 25 ? 2 : max < 50 ? 4 : max < 75 ? 6 : max < 93 ? 8 : 13); }
export function gatherUnlocks(skill, level) {
  const out = [];
  if (skill === "fishing") for (const f of FISH) if (f.level === level) out.push(`You can now catch ${f.name.toLowerCase()}.`);
  if (skill === "cooking") for (const c of COOK) if (c.level === level && level > 1) out.push(`You can now cook ${fishOf(c.id).name.toLowerCase()}.`);
  if (skill === "cooking") for (const c of COOK) if (c.stopBurn === level) out.push(`You no longer burn ${fishOf(c.id).name.toLowerCase()} on a fire.`);
  if (skill === "firemaking") for (const l of LOGS_FM) if (l.level === level && level > 1) out.push(`You can now light ${l.kind} logs.`);
  return out;
}
// closest approach of a ray to a point: { along, perp }
export function rayNear(o, d, p) {
  const vx = p.x - o.x, vy = p.y - o.y, vz = p.z - o.z, t = vx * d.x + vy * d.y + vz * d.z;
  const cx = o.x + d.x * t - p.x, cy = o.y + d.y * t - p.y, cz = o.z + d.z * t - p.z;
  return { along: t, perp: Math.hypot(cx, cy, cz) };
}
export { RANGES };
