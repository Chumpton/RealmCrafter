// S2: carries place.state.snow (lane W1's, read only) into the outdoor look's params, rounded, written only when a value moves.
// Snow off and params already zero: one cheap read, then sleep. Never writes place.state.snow.
import { SNOW } from './lib/data/snow.js';
const K = SNOW.look;
export const updateSchedule = { every: { seconds: K.everyS } };
const r = (v, q) => Math.round(v / q) * q;
export function update(ctx) {
  const L = ctx.place.atmosphere.look, P = L?.params; if (!P) return ctx.sleep(K.idleS);
  const s = ctx.place.state.snow, on = s?.on === true;
  if (!on && !P.snDepth && !P.snMelt) return ctx.sleep(K.idleS); // the natural cycle: nothing to do
  let N = { snDepth: 0, snWet: 0, snPow: 0, snMelt: 0, snWx: 0, snWz: 0 };
  if (on) {
    const wet = Math.min(1, Math.max(0, s.wet ?? (s.kind === 'wet' || s.kind === 'sleet' ? 0.8 : 0.15)));
    const powder = s.kind === 'powder' || s.kind === 'blizzard' ? 1 - wet : (1 - wet) * 0.5;
    const t = s.temp ?? -3, melt = Math.min(1, Math.max(0, s.season === 'thaw' ? 0.5 + t / 8 : t / 4));
    const w = ctx.place.state.wind, a = ((w?.toward ?? 0) * Math.PI) / 180, k = Math.min(1, (w?.speed ?? 0) / 10);
    N = { snDepth: r(Math.max(0, s.depth ?? 0), K.round), snWet: r(wet, 0.05), snPow: r(powder, 0.05), snMelt: r(melt, 0.05),
          snWx: r(-Math.sin(a) * k, 0.05), snWz: r(-Math.cos(a) * k, 0.05) };
  }
  if (Object.keys(N).some((k) => (P[k] ?? 0) !== N[k])) L.params = { ...P, ...N };
}
