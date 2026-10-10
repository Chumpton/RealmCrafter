// Build tool door (perf, Oct 9 "takes forever to load"): the body is scripts/build-tool-core.js with the 1 MB prefab
// catalog behind it. It is fetched only on a builder's machine, a few seconds after they stand; visitors never download it.
import { door, ready } from './lib/lazy-hooks.js';
const D = door(() => import('./build-tool-core.js'), 'soon');
export const lazyRetry = D.retry;
export function onInput(ctx, input) {
  if (!ctx.self.isEditor) return;
  const c = ready(ctx, 'soon') || input.pressed?.bld || input.pressed?.ms ? D.get() : null; // a build press is a need: loads at once
  if (c) return c.onInput(ctx, input);
}
