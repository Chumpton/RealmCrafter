// The mead cask: E pours and counts a mead on the presser (player.state.mead). A thin door: the body is
// scripts/lib/feast-cask-core.js, loaded by import() on first need (scripts/lib/lazy-hooks.js).
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/feast-cask-core.js'), 'soon');
export const lazyRetry = D.retry;
export const onSpawn = D.hook('onSpawn');
export const ears = { press: D.ear('press') };
// wakes the body once so a press never waits on it, then sleeps until something writes this row
export function update(ctx) { const c = D.get(ctx); if (c) ctx.sleep(); }
