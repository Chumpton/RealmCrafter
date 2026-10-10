// A behavior's thin door (the home-weather pattern, shared): the body loads by import() on first need, so it is
// not in the arrival set. Timer and spawn hooks that land before the body are re-armed through `lazyRetry`, never
// dropped; ticks wait; an onSpawn still owed runs before the first tick the body sees.
// Round 11 boot order: door(load, lane) — a body is fetched only once its lane (scripts/lib/data/boot-order.js) has opened,
// counted from the moment this machine's player stands (stood(ctx)), so no body is downloaded before the first picture.
// A press (ear), a trigger (hookOther) or get() with no ctx loads at once whatever the lane.
import { BOOT } from './data/boot-order.js';
let firstAt = null, standAt = null, hasLocal = false;
export function stood(ctx) { if (standAt === null) standAt = ctx.now(); }
// seconds until `lane` opens on this machine (0 = open)
export function laneWait(ctx, lane = 'soon') {
  const wait = (BOOT.lanes[lane] ?? BOOT.lanes.soon) * 1000;
  if (!wait && standAt !== null) return 0;
  if (!wait && !hasLocal && !ctx.place?.players?.some?.((p) => p.isLocal)) return 0; // 'now' opens at once where no body is owed
  const now = ctx.now();
  if (firstAt === null) firstAt = now;
  // a player's machine (a local player row) waits for its own body to stand: a slow arrival no longer opens every lane
  // before the first picture; only a machine with no player of its own (Spawn's server) falls back to noBodyMs
  if (!hasLocal) hasLocal = !!ctx.place?.players?.some?.((p) => p.isLocal);
  const from = standAt ?? firstAt + (hasLocal ? BOOT.noStandMs : BOOT.noBodyMs);
  return Math.max(0, (from + wait - now) / 1000);
}
export const ready = (ctx, lane) => laneWait(ctx, lane) === 0;
// retryName: a row with TWO door behaviors (lore-skald + skald-legs) gives the second its own retry export, so a re-armed
// timer reaches only the door that armed it.
export function door(load, lane = 'soon', retryName = 'lazyRetry') {
  let core = null, loading = null;
  const pending = new Set();
  const fetch = () => { if (!core && !loading) loading = load().then((m) => { core = m; }).catch(() => { loading = null; }); return core; };
  // get(ctx) waits for the lane; get() (no ctx) is a need and loads now
  const get = (ctx) => (core || !ctx || ready(ctx, lane) ? fetch() : null);
  const later = (ctx) => Math.max(BOOT.retryMin, core ? 0 : laneWait(ctx, lane));
  const hook = (name) => (ctx, payload) => {
    const c = get(ctx);
    if (c) return c[name]?.(ctx, payload);
    if (name === 'onSpawn') pending.add(ctx.self.id);
    ctx.after(later(ctx), retryName, { hook: name, payload });
  };
  // a trigger/refuse hook (ctx, other, extra): replayed by the other's id — a handle does not ride a timer
  const hookOther = (name) => (ctx, other, extra) => {
    const c = fetch();
    if (c) return c[name]?.(ctx, other, extra);
    ctx.after(BOOT.retryMin, retryName, { hook: name, other: other?.id ?? null, payload: extra ?? null });
  };
  // an ear declared on the facade (export const ears = { press: D.ear('press') }): the core's ears.<name> answers it.
  // An ear armed with ctx.on inside a lazy onSpawn is lost when the facade is swapped into a room whose onSpawn already ran.
  const ear = (name) => (ctx, payload) => {
    const c = fetch();
    if (c) return c.ears?.[name]?.(ctx, payload);
    ctx.after(BOOT.retryMin, retryName, { ear: name, payload });
  };
  // a job answer (ctx, r, p) for a named callback (ctx.job(id, args, "onX", p)): an answer is a need, it loads at once;
  // one that lands before the body is re-armed with its r and p, never dropped
  const job = (name) => (ctx, r, p) => {
    const c = fetch();
    if (c) return c[name]?.(ctx, r, p);
    ctx.after(BOOT.retryMin, retryName, { job: name, r: r ?? null, p: p ?? null });
  };
  const retry = (ctx, args = {}) => {
    const { hook: name, payload } = args;
    const c = args.ear || args.job || 'other' in args ? fetch() : get(ctx);
    if (!c) { ctx.after(later(ctx), retryName, { ...args }); return; }
    if (args.job) { c[args.job]?.(ctx, args.r ?? undefined, args.p ?? undefined); return; }
    if (args.ear) { c.ears?.[args.ear]?.(ctx, payload); return; }
    if (name === 'onSpawn') { if (pending.delete(ctx.self.id)) c.onSpawn?.(ctx); return; }
    if ('other' in args) {
      const id = args.other, o = id && (ctx.getObject(id) ?? ctx.place.players.find((p) => p.id === id));
      if (o) c[name]?.(ctx, o, payload ?? undefined);
      return;
    }
    c[name]?.(ctx, payload);
  };
  const tick = (name = 'update') => (ctx, dt) => {
    const c = get(ctx);
    if (!c) return;
    if (pending.delete(ctx.self.id)) { c.onSpawn?.(ctx); return; }
    return c[name]?.(ctx, dt);
  };
  return { get, hook, hookOther, ear, job, retry, tick };
}
