// Who just arrived — module memory shared by every core that imports it (folk-life, tafl). A new player id restarts
// the quiet; a heavy clip (the talking loops) stays out of the room's state while it runs, so a fresh visitor's
// catch-up names only light clips. Callers pass their own quiet seconds (FOLK.chat.quiet, TAFL.talk.quiet).
const a = { known: null, at: -1e12 };
export function watchArrivals(ctx) {
  const ids = ctx.place.players.map((p) => p.id);
  if (!a.known) { a.known = new Set(ids); a.at = ctx.now(); return; } // a core load counts as an arrival
  for (const id of ids) if (!a.known.has(id)) { a.known.add(id); a.at = ctx.now(); }
  if (a.known.size > ids.length * 2 + 8) a.known = new Set(ids);
}
export function hushed(ctx, quietSeconds) { watchArrivals(ctx); return ctx.now() - a.at < quietSeconds * 1000; }
