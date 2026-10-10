// LIGHT EDITOR · AUTOFILL · JEV's read of the area, on top of the rule read (scripts/lib/data/area-jev.js holds every number).
// jevOn: the DEN SYSTEMS switch. askAreaJev: one jev:decide ask, only when the switch is on. mergeJev: pure, SAMPLES JEV's kind
// (never argmax) with the caller's seeded 0..1; a sure rule read (conf >= keepConf) stands unless JEV backs another kind >= overrideP.
import { AREA_JEV as J } from './data/area-jev.js';
import { AREA } from './data/area-kinds.js';
import { meter } from './jev-meter.js';
import { isOn } from './data/systems.js';
export { JEV_TIMEOUT_MS } from './data/area-jev.js';

export const jevOn = (ctx) => isOn(ctx, J.system);

export function askAreaJev(ctx, facts, exportName, payload) {
  if (!jevOn(ctx)) return null;
  meter(ctx, J.lane);
  return ctx.job('jev:decide', {
    state: facts,
    questions: {
      kind: { type: 'choice', instructions: J.kindAsk, criteria: J.kinds },
      mood: { type: 'choice', instructions: J.moodAsk, criteria: J.moods },
    },
  }, exportName, payload);
}

// sample a key from { key: p } restricted to `allowed`, by u in 0..1; null when nothing usable
function sample(probs, allowed, u) {
  if (!probs || typeof probs !== 'object') return null;
  let tot = 0;
  for (const k in allowed) { const p = +probs[k]; if (p > 0 && isFinite(p)) tot += p; }
  if (tot <= 0) return null;
  let t = Math.min(Math.max(+u || 0, 0), 0.999999) * tot, last = null;
  for (const k in allowed) { const p = +probs[k]; if (!(p > 0 && isFinite(p))) continue; last = k; if ((t -= p) < 0) return k; }
  return last;
}
const norm = (probs, k) => { let tot = 0; for (const x in J.kinds) { const p = +probs?.[x]; if (p > 0 && isFinite(p)) tot += p; } const p = +probs?.[k]; return tot > 0 && p > 0 ? p / tot : 0; };

export function mergeJev(read, r, seedRandom) {
  const A = r?.ok ? r.data?.answers : null;
  const kp = A?.kind?.probabilities;
  if (!A || !kp) return { ...read, jev: read?.jev ?? null };
  const u = +seedRandom || 0;
  let kind = sample(kp, J.kinds, u);
  if (!kind) return { ...read, jev: read?.jev ?? null };
  if ((read?.confidence ?? 0) >= J.keepConf && read?.kind) {
    // a sure rule read stands unless JEV's strongest other kind clears overrideP
    let best = null, bp = 0;
    for (const k in J.kinds) { if (k === read.kind) continue; const p = norm(kp, k); if (p > bp) { bp = p; best = k; } }
    kind = bp >= J.overrideP ? best : read.kind;
  }
  const mood = sample(A.mood?.probabilities, J.moods, (u * J.moodSalt) % 1) ?? 'homely';
  const p = norm(kp, kind);
  const label = AREA?.kinds?.[kind]?.label ?? kind;
  return { ...read, kind, label, jev: { kind, p, note: `JEV: ${label} (${Math.round(p * 100)}%), ${mood}` }, densityMul: J.densityMul[mood] ?? 1 };
}
