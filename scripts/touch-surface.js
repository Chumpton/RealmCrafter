// Which touch layout a player sees. Seated on a bench or pillow, the thumb button stands you up;
// otherwise it is the plain USE (doors, dishes, seats, folk). Re-read at UI cadence from player.state.
// owner: the creator's own default layout in the build room carries a SAVI button = the K wake on PC (creator, Oct 1: "just like on PC").
import { WAKE } from "./lib/data/wake.js";
export default (ctx) => {
  const s = ctx.player?.state;
  if (s?.seatedOn) return 'seated';
  if (s?.holdingKind === 'guitar') return 'guitar'; // held guitar: G, give back, strings, C, D
  if (s?.holding) return 'lyre';                    // held lyre: strum, set down, strings 1-3 left of the stick and 4-6 right
  return ctx.player?.userId === WAKE.owner && ctx.world?.mode !== 'live' ? 'owner' : 'default';
};
