// EDITOR TRANSFORM GIZMO door (QoL lane): the body is scripts/ed-gizmo-core.js, fetched only on an editor's machine.
// Listed before terrain-editor.js / build-tool.js in templates/player.js: a press on a handle sets ctx.session.gzGrab
// and those cores leave that click alone (no brush dab, no deselect).
import { door, ready } from './lib/lazy-hooks.js';
const D = door(() => import('./ed-gizmo-core.js'), 'soon', 'gzRetry');
export const gzRetry = D.retry;
export function onInput(ctx, input) {
  if (!ctx.self.isEditor || !ctx.self.state?.te?.open) { if (ctx.session.gzGrab) ctx.session.gzGrab = null; return; }
  const c = ready(ctx, 'soon') ? D.get(ctx) : null;
  if (c) return c.onInput(ctx, input);
}
export function update(ctx, dt) {
  if (!ctx.self.isEditor || !ctx.self.isLocal) return;
  if (!ctx.self.state?.te?.open && !ctx.session.gzRoot) return;
  const c = ready(ctx, 'soon') ? D.get(ctx) : null;
  if (c) c.update(ctx, dt);
}
