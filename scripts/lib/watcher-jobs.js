// HEIMDALL-FIX-A G0: the one job meter. Sole writer of board-bell.state.watchJobs { hour, n } (den, ≤ WATCH.jobsPerHour)
// and place.state.watchPlanJobs { hour, p: { [planKey]: n } } (per plan, ≤ WATCH.perPlanJobs while FIX.jobGate).
// Plain synchronous functions: the check and the write sit in one call. Every send is charged once, where it is sent.
import { WATCH, FIX } from "./data/watcher.js";

const hourOf = (now) => Math.floor(now / 3600000);
export const planKeyOf = (name) => String(name).replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 40);
const denUsed = (s, h) => (s?.watchJobs?.hour === h ? s.watchJobs.n ?? 0 : 0);
const planUsed = (st, h, k) => (st?.watchPlanJobs?.hour === h ? st.watchPlanJobs.p?.[k] ?? 0 : 0);
let loaded = false; // one load log only, no counts kept here

export function jobsLeft(s, st, now, planKey) {
  const h = hourOf(now), den = WATCH.jobsPerHour - denUsed(s, h);
  if (!FIX.jobGate || typeof planKey !== "string" || !planKey) return den;
  return Math.min(den, (WATCH.perPlanJobs ?? 8) - planUsed(st, h, planKeyOf(planKey)));
}

// true: charged n to the den and to the plan; false: nothing written, the caller waits.
export function spend(s, st, now, n, planKey, log) {
  if (!loaded) { loaded = true; log?.("watcher-jobs: loaded v1", { gate: !!FIX.jobGate }); }
  if (typeof planKey !== "string" || !planKey || !(n > 0)) { log?.("watcher-jobs: refused (no plan name)", { planKey: typeof planKey, n }); return false; }
  const h = hourOf(now), k = planKeyOf(planKey), d = denUsed(s, h), pl = planUsed(st, h, k);
  if (d + n > WATCH.jobsPerHour) return false;
  if (FIX.jobGate && pl + n > (WATCH.perPlanJobs ?? 8)) return false;
  s.watchJobs = { hour: h, n: d + n };
  if (st) { const p = st.watchPlanJobs?.hour === h ? st.watchPlanJobs.p ?? {} : {}; st.watchPlanJobs = { hour: h, p: { ...p, [k]: pl + n } }; }
  return true;
}
