// A hall sound bed (hall-murmur-* rows): state.kind picks its voice in FEEL.hall; murmur beds duck by Rolf while he plays.
// A thin door: the body loads by import() on first need (scripts/lib/lazy-hooks.js); ticks wait for it.
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/hall-murmur-core.js'), 'soon');
export const updateSchedule = { every: { seconds: 0.5 } };
export const lazyRetry = D.retry;
export const onSpawn = D.hook('onSpawn');
export const update = D.tick();
