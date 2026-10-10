// The hall lyre on its post: a thin door. The body is scripts/lib/hall-lyre-core.js, loaded by import() in the 'life'
// boot lane (scripts/lib/data/boot-order.js) or at once on E (a press loads whatever the lane), so it is not in the arrival set.
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/hall-lyre-core.js'), 'life');
export const lazyRetry = D.retry;
export const updateSchedule = { every: { seconds: 0.1 } }; // fast only while a folk plays; the body sleeps 1 s otherwise
export const ears = { press: D.ear('press'), npcLyre: D.ear('npcLyre') };
export const npcStrum = D.hook('npcStrum');
export const npcEnd = D.hook('npcEnd');
export const update = D.tick();
