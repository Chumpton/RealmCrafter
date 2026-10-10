// Editor Outliner door (creator 2026-10-09 editor brief): Scene Outliner, Layers and Solo. The body is scripts/ed-outliner-core.js;
// it loads only on an editor's machine, the moment the Outliner tab opens, an 'ol' press or Shift+H. Players never download it.
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./ed-outliner-core.js'), 'soon');
export const lazyRetry = D.retry;
export function onInput(ctx, input) {
  const me = ctx.self; if (!me.isEditor) return;
  const te = me.state.te, need = input.pressed?.ol || (input.pressed?.edSolo && input.held?.runHold) || (te?.open && te.tab === 'outline') || ctx.session.olSolo;
  const c = need ? D.get() : null;
  if (c) return c.onInput(ctx, input);
}
