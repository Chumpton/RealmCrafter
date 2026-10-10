// EDITOR HISTORY + PLAYTEST door (QoL lane). The body is scripts/ed-history-core.js: fetched only on an editor's machine
// (lane 'soon'); players never download it. Listed BEFORE build-tool.js in templates/player.js so it sees each build
// press before the build core commits it (the "before" snapshot), and reads the "after" a few ticks later in update().
import { door, ready } from './lib/lazy-hooks.js';
const D = door(() => import('./ed-history-core.js'), 'soon', 'edhRetry');
export const edhRetry = D.retry;
export function onInput(ctx, input) {
  if (!ctx.self.isEditor) return;
  const p = input.pressed ?? {};
  const c = p.edh || p.edPlay ? D.get() : ready(ctx, 'soon') ? D.get(ctx) : null; // a press is a need: loads at once
  if (c) return c.onInput(ctx, input);
}
export function update(ctx, dt) {
  if (!ctx.self.isEditor || !ctx.self.isLocal) return;
  const c = ready(ctx, 'soon') ? D.get(ctx) : null;
  if (c) c.update(ctx, dt);
}
