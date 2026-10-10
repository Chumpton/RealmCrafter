// Terrain editor door (perf, Oct 9): the body is scripts/terrain-editor-core.js; builders only, fetched after they stand.
import { door, ready } from './lib/lazy-hooks.js';
const D = door(() => import('./terrain-editor-core.js'), 'soon');
export const lazyRetry = D.retry;
export function onInput(ctx, input) {
  if (!ctx.self.isEditor) return;
  const c = ready(ctx, 'soon') || input.pressed?.te ? D.get() : null;
  if (c) return c.onInput(ctx, input);
}
