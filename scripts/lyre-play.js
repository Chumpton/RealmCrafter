// The player's hands on a held instrument: a thin door. The body is scripts/lib/lyre-play-core.js, fetched by import() only once
// this player holds something (player.state.holding), so the arrival set carries none of it. Walking never waits on it.
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/lyre-play-core.js'), 'now');
const busy = (ctx) => !!ctx.self.state?.holding || !!ctx.session.guitarPlay?.[ctx.self.id]?.on;
export function onInput(ctx, input) { if (!ctx.self.state?.holding) return; const c = D.get(); if (c) return c.onInput?.(ctx, input); }
export function update(ctx, dt) { if (!busy(ctx)) return; const c = D.get(); if (c) return c.update?.(ctx, dt); }
