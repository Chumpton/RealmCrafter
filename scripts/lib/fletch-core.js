// MMO prompt 5/6: pure Fletching math. No ctx: numbers and rows in, numbers out.
import { FL, RECIPES, BOWS, ARROWS } from "./data/fletch.js";
export const recipeOf = (id) => RECIPES.find((r) => r.id === id) ?? null;
export const bowOf = (id) => BOWS.find((b) => b.id === id) ?? null;
const slots = (inv, id) => (inv ?? []).filter((x) => x?.id === id).length;
// how many actions of r the pack can feed right now (each action = one unit; a batch action counts once)
export function canMake(r, inv, sup) {
  sup = sup ?? {};
  if (r.use.inv && !r.use.sup) return slots(inv, r.use.inv);
  if (r.use.inv) return Math.min(slots(inv, r.use.inv), ...r.use.sup.map((k) => sup[k] | 0));
  const n = Math.min(...r.use.sup.map((k) => sup[k] | 0));
  return Math.ceil(n / FL.batch);
}
// the items one action eats and makes: { take: { inv?, sup: {k:n} }, give: { inv?, sup: {k:n} }, n, xpTenths }
export function plan(r, inv, sup) {
  sup = sup ?? {};
  if (canMake(r, inv, sup) <= 0) return null;
  const take = { sup: {} }, give = { sup: {} };
  let n = 1;
  if (r.per === "each") { n = Math.min(FL.batch, ...r.use.sup.map((k) => sup[k] | 0)); for (const k of r.use.sup) take.sup[k] = n; give.sup[r.make.sup] = n; }
  else {
    if (r.use.inv) take.inv = r.use.inv;
    for (const k of r.use.sup ?? []) take.sup[k] = 1;
    if (r.make.inv) give.inv = r.make.inv; else give.sup[r.make.sup] = r.make.n ?? 1;
  }
  return { take, give, n, xpTenths: Math.round(r.xp * (r.per === "each" ? n : 1) * 10) };
}
// the best arrows you carry: the highest tier with any left
// the arrows you shoot: the tier picked in the Ammo slot (equip.ammo = a supplies key) while any are left, else the best you carry
export const quiverArrow = (sup, pick) => ARROWS.find((a) => a.arrows === pick && (sup?.[a.arrows] | 0) > 0) ?? bestArrow(sup);
export const bestArrow = (sup) => [...ARROWS].reverse().find((a) => (sup?.[a.arrows] | 0) > 0) ?? null;
export function fletchUnlocks(level) {
  const out = [];
  for (const r of RECIPES) if (r.level === level && level > 1 && !r.id.startsWith("string-")) out.push(`You can now fletch ${r.name.replace(" (u)", "s").replace(/ss$/, "s").toLowerCase()}.`);
  return out;
}
