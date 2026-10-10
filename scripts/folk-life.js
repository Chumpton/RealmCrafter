// The people of the hall — one behaviour for every folk- row. No update(): the murmur of life is ctx.after timers.
// A thin door: the body is scripts/lib/folk-life-core.js, loaded by import() on first need (scripts/lib/lazy-hooks.js).
// Work (row state.work, tuning FOLK.work[kind]): 'crank' turns the spit — the right-arm IK rides the crank handle, read off
// the roast's live roll each step so hand and roast never part; now and then a break to talk. 'feed' — every 20–40 s a lean
// and a reach into the fire, sparks at the reach. Starts from the look chain (4–9 s) so no respawn is needed.
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/folk-life-core.js'), 'folk');
const W = door(() => import('./lib/folk-work.js'), 'folk'); // the work body: startWork + its timers
export const lazyRetry = D.retry;
const coreSpawn = D.hook('onSpawn'), coreLook = D.hook('look');
export const swap = D.hook('swap');
export const blink = D.hook('blink');
export const openLids = D.hook('openLids');
export const shutEyes = D.hook('shutEyes');
export const jaw = D.hook('jaw');
export const endToast = D.hook('endToast');
export const notice = D.hook('notice'); // round 7: folk notice a player walking up / sitting down (core FOLK.notice)
export const ears = { press: D.ear('press'), rainReact: D.ear('rainReact') }; // round 8: the toast press lives here, answered by the core's ears.press
export function update(ctx) { if (D.get(ctx)) ctx.sleep(); } // warms the core; sleeps once it is in
export function onSpawn(ctx) {
  const s = ctx.self.state;
  if (s.work) { s.workToken = (s.workToken ?? 0) + 1; s.workOn = false; s.workPause = false; }
  coreSpawn(ctx);
}
export function look(ctx, p) { coreLook(ctx, p); const w = W.get(ctx); if (w) w.startWork(ctx); }
// a work timer before the body is in re-arms itself by its own name, so it never lands on the core's door
const work = (name) => (ctx, p) => { const w = W.get(ctx); if (w) return w[name](ctx, p); ctx.after(0.3, name, p); };
export const crank = work('crank'), workBreak = work('workBreak'), workResume = work('workResume');
export const feed = work('feed'), feedSpark = work('feedSpark'), feedEnd = work('feedEnd');
export const rainAct = D.hook('rainAct'), rainAct2 = D.hook('rainAct2'), rainEnd = D.hook('rainEnd'); // W12 timers
