// A logic volume (templates/ed-logic.js#vol). The trigger counts who is inside; what a volume DOES to a player
// (sound, banner, zone, hazard) is that player's own scripts/ed-logic-player.js, so it works for every visitor.
export function onTriggerEnter(ctx, other) { if (other?.tags?.includes?.('player')) ctx.self.state.inside = (ctx.self.state.inside | 0) + 1; }
export function onTriggerExit(ctx, other) { if (other?.tags?.includes?.('player')) ctx.self.state.inside = Math.max(0, (ctx.self.state.inside | 0) - 1); }
