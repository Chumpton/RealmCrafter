// Editor door: Drop to Ground (End), Physics Settle, brush-from-any-asset. Body: scripts/ed-scatter-core.js, editors only.
import { door, ready } from './lib/lazy-hooks.js';
const D = door(() => import('./ed-scatter-core.js'), 'soon');
export const lazyRetry = D.retry;
export function onInput(ctx, input) {
  if (!ctx.self.isEditor) return;
  const p = input.pressed; if (!p?.edDrop && !p?.edx) return;
  const c = D.get();
  if (c) return c.onInput(ctx, input);
  ctx.session.edPend = { drop: !!p.edDrop, a: p.edx ? input.actionData?.edx ?? {} : null }; // the body is on its way: replay on arrival
}
export function update(ctx) {
  if (!ctx.self.isEditor || !(ctx.session.edPend || ctx.session.edSettle)) return;
  const c = ready(ctx, 'soon') ? D.get() : null; if (c) c.tick(ctx);
}
