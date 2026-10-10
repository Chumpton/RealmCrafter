// Logic tool door (editor Logic tab): the body is scripts/ed-logic-core.js, fetched only on an editor's machine,
// when the Logic tab opens or an edl action arrives. Visitors never download it.
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./ed-logic-core.js'), 'soon', 'edlRetry');
export const edlRetry = D.retry;
export const updateSchedule = { every: { seconds: 1 } };
export function update(ctx) {
  const me = ctx.self; if (!me.isEditor || me.isLocal === false) { ctx.sleep(30); return; }
  const te = me.state.te; if (!te?.open || te.tab !== 'logic') return;
  const c = D.get(); if (c) c.listTick(ctx);
}
export function onInput(ctx, input) {
  const me = ctx.self; if (!me.isEditor) return;
  const armed = me.state.edl?.arm || me.state.edl?.wp;
  if (!input.pressed?.edl && !(armed && (input.pressed?.use || input.pressed?.menuOpen))) return;
  const c = D.get(); if (c) c.onInput(ctx, input);
}
