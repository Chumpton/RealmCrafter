// Chess at the north bench — the board row's behaviour (lore-hnefatafl). A thin door: the match body is
// scripts/lib/chess-match-core.js, loaded by import() on first need (scripts/lib/lazy-hooks.js).
// The press ear forwards to the view lane's scripts/lib/chess-view.js (tolerated missing).
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/chess-match-core.js'), 'late');
export const lazyRetry = D.retry;
export const onSpawn = D.hook('onSpawn');
export const update = D.tick('update');
const engineHook = D.hook('onEngine'), mindHook = D.hook('onMind');
export const onEngine = (ctx, r, p) => engineHook(ctx, { r, p });   // job answers: (ctx, result, payload) → one payload for the door
export const onMind = (ctx, r, p) => mindHook(ctx, { r, p });
export const ears = {
  press: (ctx, payload) => {
    const dbg = !!ctx.self?.state?.debugPress; // dev probe, off unless the board row's state.debugPress is set
    if (dbg) ctx.log('chess press heard', { by: payload?.by ?? null });
    import('./lib/chess-view.js').then((m) => { m.press?.(ctx, payload); if (dbg) ctx.log('chess press done', { by: payload?.by ?? null }); }).catch((e) => { if (dbg) ctx.log('chess press failed', { e: String(e) }); });
  },
};
// the old hnefatafl timers may still be armed on a running row: they land here and end
export const move = () => {}, tap = () => {}, rest = () => {}, look = () => {}, endGesture = () => {}, wake = () => {};
