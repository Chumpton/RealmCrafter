// S13: E on something lying on the ground picks it up (monster-player.js lootTake does the taking and removes it).
export const ears = {
  press: (ctx, { by }) => { const s = ctx.self.state; ctx.emit('lootTake', { obj: ctx.self.id }, { to: by }); },
};
