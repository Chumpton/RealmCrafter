// Boot order for the lazy behavior bodies (scripts/lib/lazy-hooks.js): a body in a later lane is not fetched until that many
// seconds after this machine's player stands (camera.js / home-player-feel mark the stand), so the arrival downloads only the
// world, the rows and what the first steps need. A press, a trigger or a direct need always loads at once.
export const BOOT = {
  noBodyMs: 8000, // a machine with no standing body of its own (Spawn's server, a builder) starts the lanes this long after its first tick
  noStandMs: 30000, // a player's machine whose body has not stood this long opens the lanes anyway (never stuck)
  retryMin: 0.3,  // a timer that lands before its body is re-armed after max(retryMin, the lane's wait left)
  lanes: {
    now: 0,     // the player's own feel and gait: walking and E work from the first step
    door: 1.5,  // doors and the square gate: a walk-up after the first second opens them
    soon: 3,    // sky-local, murmur, radio, portal glass, bites, cask, anvil, torch
    folk: 4,    // the hall's people: blinks, looks, toasts, work
    life: 6,    // hound, raven, goats, the skald
    late: 9     // the chess referee, the rune board, weather publisher, camera's chess lane
  }
};
