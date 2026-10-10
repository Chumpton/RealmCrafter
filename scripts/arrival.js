// The world's doorway (world.config.yaml engine.behaviors): onArrive fires for every way a player
// lands here — first join, rejoin, a portal in (player.arrival.kind says which) — and onLeave for
// every way they go. Where a player stands is the engine's to keep: a body is one durable row in the
// room — a refresh reconnects the same body, a return an hour later lands where you stood, facing
// the way you faced — so nothing here saves or restores a spot. A world where every visit
// starts fresh (an arena, a race) moves the player here: ctx.enterPlace(player.id, { placeId: 'main' }).
export function onArrive(ctx, player) {}

export function onLeave(ctx, player) {}
