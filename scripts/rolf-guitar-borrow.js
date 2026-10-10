// Rolf's guitar, lent out: a thin door. The body is scripts/lib/rolf-guitar-borrow-core.js, loaded by import() in the
// 'life' boot lane (scripts/lib/data/boot-order.js) or at once on E (a press loads whatever the lane), so it is not in the arrival set.
import { door } from './lib/lazy-hooks.js';
import { NPC_GUITAR } from './lib/data/npc-guitar.js';
const D = door(() => import('./lib/rolf-guitar-borrow-core.js'), 'life');
export const lazyRetry = D.retry;
export const updateSchedule = { every: { seconds: NPC_GUITAR.fast } }; // fast only while Orm plays; the body sleeps otherwise
export const ears = { press: D.ear('press'), npcGuitar: D.ear('npcGuitar') };
export const npcGuitarEnd = D.hook('npcGuitarEnd');
export const update = D.tick();
