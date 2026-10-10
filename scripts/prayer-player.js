// PRAYER (OSRS-PLAN P1): the player's side. Owns player.state.prayer = { pts, on, ctr, at } and nothing else.
// Rules: scripts/lib/prayer-core.js · data: scripts/lib/data/prayers.js. Others only READ s.prayer through prayer-core mods():
// combat-core (boosts), monster.js (Thick Skin etc. on the monster's roll), monster-player.js (Protect from Melee, Protect Item, respawn reset), combat-player.js (Rapid Heal).
// An altar (Savi's Hlautbolli bowl) refills the points by emitting `prayRefill` to the player.
import { PRAYER } from './lib/data/prayers.js';
import { normPrayer, freshPrayer, tick, toggle } from './lib/prayer-core.js';
import { levelOf } from './lib/skills-core.js';
const msg = (ctx, me, text) => ctx.emit('skillMsg', { text }, { to: me.id });
const lvl = (s) => levelOf(s.skills?.prayer | 0);

export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false) return;
  const s = me.state; if (!s.prayer?.on?.length) return; // the common case: nothing on, nothing to do
  const now = ctx.now(); let pr = normPrayer(s.prayer, lvl(s)), at = s.prayer.at ?? now;
  if (s.dead) { s.prayer = { ...pr, on: [], at: now }; return; }
  let n = 0;
  while (now - at >= PRAYER.tickSec * 1000 && n++ < 20) { pr = tick(pr); at += PRAYER.tickSec * 1000; if (pr.dry) { msg(ctx, me, 'You have run out of prayer points.'); break; } }
  s.prayer = { ...pr, at: pr.on.length ? at : now };
}
export function onInput(ctx, input) {
  const me = ctx.self; if (me.isLocal === false) return;
  if (!input?.pressed?.prayToggle) return;
  const s = me.state, id = input.actionData?.prayToggle?.id; if (typeof id !== 'string' || s.dead) return;
  const r = toggle(normPrayer(s.prayer, lvl(s)), id, lvl(s));
  if (r.why) return msg(ctx, me, r.why);
  s.prayer = { ...r.st, at: ctx.now() };
}
export const ears = {
  prayRefill: (ctx) => { // the altar: points back to the maximum, "You recharge your Prayer points."
    const me = ctx.self; if (me.isLocal === false) return;
    const s = me.state, pr = normPrayer(s.prayer, lvl(s)), full = freshPrayer(lvl(s)).pts;
    if (pr.pts >= full) return msg(ctx, me, 'You already have full Prayer points.');
    s.prayer = { ...pr, pts: full, at: ctx.now() }; msg(ctx, me, 'You recharge your Prayer points.');
  },
};
