// S15: your gravestone. E by its owner gives back what the owner lost on death (monster-player.js graveLoot); it fades after DEATH.graveSec.
export const ears = {
  press: (ctx, { by }) => {
    const s = ctx.self.state;
    if (s.owner !== by) return ctx.emit('toast', { message: `Here lies ${s.name}'s gear. It is not yours to take.`, duration: 3 }, { audience: { player: by } });
    ctx.emit('graveLoot', { grave: ctx.self.id, items: s.items ?? [], coins: s.coins | 0 }, { to: by });
    s.coins = 0; // handed over; graveLeft puts back whatever did not fit
  },
  graveLeft: (ctx, p) => {
    const s = ctx.self.state; s.items = Array.isArray(p?.items) ? p.items : [];
    if (!s.items.length) ctx.destroy(ctx.self.id);
  },
};
