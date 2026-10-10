// D8 · a raven on Odin's post. Its idle is a keyframed loop (anim/raven-post.yml) started once; no update(). E (the den's press,
// player-feel-core → emit('press', { by }, { to })) unrolls this bird's scroll for the presser: a per-player bag deals all four
// texts before any repeats, and the scroll rolls itself up after showSec.
import { play, clips } from 'builtin/anim';
import { RAVEN_POST as R } from './lib/data/raven-post.js';
import { raven as RIG, remapClip } from './lib/data/animal-rigs.js';
const cache = {};
const clipOf = (ctx, file, name) => cache[file + name] ??= remapClip(RIG, clips(ctx, file)[name]);
export function onSpawn(ctx) {
  const b = R.birds[ctx.self.state.bird]; if (!b) return;
  const c = clipOf(ctx, R.clipFile, b.idle); if (c) play(ctx, ctx.self, c, { channel: 'idle', loop: true });
}
export const ears = {
  press: (ctx, { by } = {}) => {
    const key = ctx.self.state.bird, b = R.birds[key], p = ctx.place.players.find((q) => q.id === by);
    if (!b || !p) return;
    const a = ctx.self.worldFeetPosition || ctx.self.feetPosition, f = p.worldFeetPosition || p.feetPosition;
    if (Math.hypot(a.x - f.x, a.z - f.z) > R.reach + 0.3) return;
    const bag = { ...(p.state.ravenBag || {}) }; let left = (bag[key] || []).filter((i) => i < b.texts.length);
    if (!left.length) { left = b.texts.map((_, i) => i); for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(ctx.random() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; } }
    const last = p.state.ravenScroll?.bird === key ? p.state.ravenScroll.i : -1;
    if (left.length > 1 && left[0] === last) left.push(left.shift());
    const i = left.shift(); bag[key] = left; p.state.ravenBag = bag;
    const at = ctx.now(); p.state.ravenScroll = { bird: key, i, at };
    ctx.self.state.told = (ctx.self.state.told ?? 0) + 1;
    const caw = clipOf(ctx, RIG.clipFile, RIG.clips.caw); if (caw) play(ctx, ctx.self, caw, { channel: 'act', loop: false });
    ctx.emit('playSound', { clip: R.caw, position: a, volume: 0.5, maxDistance: 20 }, { audience: { nearby: a, radius: 20 } });
    ctx.emit('playSound', { clip: R.unfurl, volume: 0.5 }, { audience: { player: by } });
    ctx.after(R.showSec, 'rollUp', { by, at });
  },
};
export function rollUp(ctx, { by, at } = {}) {
  const p = ctx.place.players.find((q) => q.id === by);
  if (p && p.state.ravenScroll?.at === at) delete p.state.ravenScroll;
}
