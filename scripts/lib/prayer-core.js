// PRAYER (OSRS-PLAN P1, research s26): pure rules. No ctx. State shape: st = { pts, on: [ids], ctr }.
// pts = prayer points (integer, never refill by themselves, an altar fills them), ctr = the drain counter.
import { PRAYER, prayerById, clashes } from './data/prayers.js';
export const prayerMax = (level) => Math.max(1, level | 0);
export const freshPrayer = (level) => ({ pts: prayerMax(level), on: [], ctr: 0 });
// a saved state, repaired: a missing one starts full; points never exceed the level's maximum
export function normPrayer(st, level) {
  if (!st || typeof st.pts !== 'number') return freshPrayer(level);
  const on = Array.isArray(st.on) ? st.on.filter((id) => prayerById(id)) : [];
  return { pts: Math.max(0, Math.min(prayerMax(level), st.pts | 0)), on, ctr: Math.max(0, +st.ctr || 0) };
}
export const resistance = (bonus = 0) => PRAYER.resistance + PRAYER.resBonusPer * bonus;
export const totalDrain = (on) => on.reduce((a, id) => a + (prayerById(id)?.drain ?? 0), 0);
// one 0.6 s tick: each active prayer adds its drain effect to the counter; past the resistance it costs a point
export function tick(st, bonus = 0) {
  if (!st.on.length) return st;
  let { pts, ctr } = st; const on = st.on.slice(), res = resistance(bonus);
  ctr += totalDrain(on);
  while (ctr > res && pts > 0) { pts -= 1; ctr -= res; }
  if (pts <= 0) return { pts: 0, on: [], ctr: 0, dry: true }; // out of points: every prayer goes off
  return { pts, on, ctr };
}
// switch a prayer on or off. { st, why } : why is the player-facing refusal, if any
export function toggle(st, id, level) {
  const p = prayerById(id); if (!p) return { st, why: null };
  if (st.on.includes(id)) return { st: { ...st, on: st.on.filter((x) => x !== id) }, why: null };
  if (level < p.level) return { st, why: `You need a Prayer level of ${p.level} to use ${p.name}.` };
  if (st.pts <= 0) return { st, why: 'You have run out of prayer points. Pray at an altar to refill them.' };
  return { st: { ...st, on: [...st.on.filter((x) => !clashes(p, prayerById(x))), id] }, why: null };
}
// what the active prayers do: stat multipliers (applied before the stance bonus), spell damage, protection, and the three utility flags
export function mods(st) {
  const m = { atk: 1, str: 1, def: 1, rng: 1, mag: 1, magDmg: 0, protect: null, heal: false, keep: false, restore: false };
  for (const id of st?.on ?? []) {
    const p = prayerById(id); if (!p) continue;
    for (const k of ['atk', 'str', 'def', 'rng', 'mag']) if (p.boost?.[k]) m[k] = Math.max(m[k], p.boost[k]);
    m.magDmg += p.boost?.magDmg ?? 0;
    if (p.protect) m.protect = p.protect;
    if (p.fx === 'heal') m.heal = true; if (p.fx === 'keep') m.keep = true; if (p.fx === 'restore') m.restore = true;
  }
  return m;
}
// how many seconds the current prayers last on the points left (for the window)
export const secondsLeft = (st, bonus = 0) => { const d = totalDrain(st.on); return d > 0 ? st.pts * resistance(bonus) * PRAYER.tickSec / d : Infinity; };
