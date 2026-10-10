// This screen's sky and grade: one local-only aurora, drawn while this player stands outside the hall and hidden under
// A thin door: the body is scripts/lib/sky-local-core.js, loaded by import() on first need (scripts/lib/lazy-hooks.js).
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/sky-local-core.js'), 'soon');
export const lazyRetry = D.retry;
export const updateSchedule = { every: { seconds: 0.5 } };
export const update = D.tick();
