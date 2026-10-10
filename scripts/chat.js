// The den's chat channels (creator 2026-10-06, the OSRS chat box). say, party, guild and messages are Spawn's; Trade is ours.
export const scopes = {
  trade: { in: (ctx, p) => true, post: (ctx, p) => true, slow: 5, waits: true },
};
