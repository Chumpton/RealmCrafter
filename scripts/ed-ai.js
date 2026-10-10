// Editor AI copilot door (creator 2026-10-09 editor brief, pillar "AI"): the body is scripts/ed-ai-core.js
// (palette catalog + proposal ghosts). Loaded only on an editor's machine, when the shelf is open, a proposal waits
// or an 'ai' press lands; players never download it.
import { door, ready } from './lib/lazy-hooks.js';
const D = door(() => import('./ed-ai-core.js'), 'soon', 'lazyRetry');
export const lazyRetry = D.retry;
export function onInput(ctx, input) {
  if (!ctx.self.isEditor) return;
  const P = ctx.world.state.edProposals;
  const need = input.pressed?.ai || (ready(ctx, 'soon') && (ctx.self.state.te?.open || (P && Object.keys(P).length) || ctx.self.state.ai?.pend?.length));
  const c = need ? D.get() : null;
  if (c) return c.onInput(ctx, input);
}
// llm:chat answer for Prompt-to-Palette (named callback so it survives the round trip)
export function onAiPal(ctx, r, p) { const c = D.get(); if (c) c.onAiPal(ctx, r, p); }
