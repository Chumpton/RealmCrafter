// The player's home feel: E presses the aimed thing or sits on the aimed seat, footsteps by floor, out-of-bounds back to the door.
// A thin door: the body is scripts/lib/player-feel-core.js, loaded by import() on first need (scripts/lib/lazy-hooks.js).
import { HOME } from './lib/data/home.js';
import { door, stood } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/player-feel-core.js'), 'now');
export const lazyRetry = D.retry;
// a press that lands before the body is dropped (it wakes the load), never replayed stale a beat later
export function onInput(ctx, input) { const c = D.get(); if (c) return c.onInput(ctx, input); }
const tick = D.tick();
export function update(ctx, dt) { stood(ctx); return tick(ctx, dt); } // this body standing opens the boot lanes (data/boot-order.js)
export function onOutOfBounds(ctx) {
  const sp=ctx.place.defaultSpawnPoint,y=typeof sp?.y==='number'?sp.y:24.04;ctx.self.feetPosition=sp?{x:sp.x,y,z:sp.z}:{...HOME.spawn};ctx.self.velocity={x:0,y:0,z:0};return true;
}
