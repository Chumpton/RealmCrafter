// A dish on the feast tables: E takes a bite — a crunch or a juicy munch, crumbs off the plate, "+1 fed" over it and one more
// counted on the presser (player.state.fed). The dish shrinks a step per bite and fills back up over ~60 s, so the table never empties.
// Also the skål: a player sitting down at a table cues the nearest seated folk to raise their mug (their own press → toast).
// A thin door: the bite body is scripts/lib/feast-bite-core.js, loaded by import() on first need (scripts/lib/lazy-hooks.js).
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/feast-bite-core.js'), 'soon');
export const lazyRetry = D.retry;
export const updateSchedule = { every: { seconds: 0.5 } };
export const onSpawn = D.hook('onSpawn');
export const bite = D.hook('bite');
export const update = D.tick();
const T = { skalReach: 3.6, skalCooldownMs: 20000 };
// the nearest seated folk (idle clips that sit) to a seat point: raise the mug on their skål line, once per sit, cooled per folk
export function skalNear(ctx, p) {
  let best = null, bd = T.skalReach;
  for (const o of ctx.query({ tags: ['folk'], radius: T.skalReach + 0.5, center: p })) {
    const st = o.state || {};
    if (!st.toast || !(st.idle || []).some((c) => /sit/.test(c))) continue;
    const q = o.feetPosition, d = Math.hypot(q.x - p.x, q.z - p.z);
    if (d < bd) { bd = d; best = o; }
  }
  if (!best) return null;
  const h = ctx.getObject(best.id), st = h.state, now = ctx.now();
  if (st.toasting || now < (st.skalAt ?? 0)) return null;
  st.skalAt = now + T.skalCooldownMs;
  const v = st.voice || [], i = v.findIndex((u) => /skal|skol/i.test(u));
  if (i >= 0) st.line = (i - 1 + v.length) % v.length; // folk-life steps to the next line: land it on the skål one
  ctx.emit('press', { by: 'skal' }, { to: best.id });
  return best.id;
}
