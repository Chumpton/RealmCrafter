// LAMP CLOCK (lane 3): the one answer to "should the lamps burn now?", pure, from rows every machine already shares:
// the real clock (world.state.clock via lib/real-clock.js: sky hour, today's sun), atmosphere.clouds.density,
// place.state.weather.rain/mist, the moon's clear sky, and JEV's place.state.lampClock row while systems.jevLamps === true.
//   lampClock(ctx) -> { on, level, crossingAt, order, source: 'sky'|'backstop'|'jev', sky, wall, rise, set }
// level = light at the lamp 0..1 (1 = full day). crossingAt = ROOM ms (ctx.now clock) of the last on/off edge when it lies
// within the stagger window, else null. Backstop (wall time, RC.backstop): always ON from sunset+75 to sunrise-40, always OFF
// from sunrise+60 to sunset-60; the sky rule and JEV only move the lamps between. A frozen-sky place (arena, yggdrasil) or an
// unanchored clock answers from its own timeOfDay with the same windows round 6/18.
import { LCK } from './data/lamp-clock.js';
import { RC } from './data/real-clock.js';
import { viewMs, skyAtMs, sunTimesAtMs, hourAtMs, dayKeyAtMs } from './real-clock.js';
import { moonClear, lampDelay } from './data/day-parts.js';
const cl = (v) => Math.max(0, Math.min(1, v));
export function sunK(sky) { const S = LCK.sun; return sky >= 12 ? cl((S.eveDark - sky) / (S.eveDark - S.eveFull)) : cl((sky - S.mornDark) / (S.mornFull - S.mornDark)); }
export function levelAt(sky, w) { const s = sunK(sky); return cl(s - LCK.cloudDim * w.cover - LCK.rainDim * w.rain + LCK.moonLift * w.moon * (1 - s)); }
// the rule at one moment: t = { wall, rise, set, sky, skyEve } (hours); w = weather; j = JEV row or null
export function decideAt(t, w, j) {
  const B = RC.backstop, lvl = levelAt(t.sky, w);
  if (t.wall >= t.set + B.onAfterSetMin / 60 || t.wall < t.rise - B.onBeforeRiseMin / 60) return { on: true, level: lvl, source: 'backstop' };
  if (t.wall >= t.rise + B.offAfterRiseMin / 60 && t.wall < t.set - B.offBeforeSetMin / 60) return { on: false, level: lvl, source: 'backstop' };
  if (t.wall < 12) {
    if (j && typeof j.keepUntil === 'number' && t.wall < Math.min(j.keepUntil, t.rise + 1)) return { on: true, level: lvl, source: 'jev' };
    return { on: lvl < LCK.dawnOff, level: lvl, source: 'sky' };
  }
  const shifted = j && j.lightAt && t.skyEve != null; // JEV's lightAt: the dusk read taken lightAt minutes later/earlier
  return { on: levelAt(shifted ? t.skyEve : t.sky, w) < LCK.duskOn, level: lvl, source: shifted ? 'jev' : 'sky' };
}
function weatherOf(ctx) {
  const W = ctx.place?.state?.weather ?? {}, cover = cl(ctx.place?.atmosphere?.clouds?.density ?? 0), rain = cl(W.rain ?? 0);
  return { cover, rain, moon: moonClear(cover, rain, W.mist ?? 0) };
}
function jevRow(ctx, ms) {
  if (ctx.world?.state?.systems?.jevLamps !== true) return null;
  const r = ctx.place?.state?.lampClock; if (!r || ms == null) return null;
  const today = dayKeyAtMs(ms); if (r.day === today) return r;
  return hourAtMs(ms) < 12 && r.day === dayKeyAtMs(ms - 864e5) ? r : null; // last night's dusk row carries into this morning
}
function timesAt(ms, j) {
  const st = sunTimesAtMs(ms), sky = skyAtMs(ms).sky;
  const skyEve = j && j.lightAt ? skyAtMs(ms - Math.max(-20, Math.min(20, j.lightAt)) * 60000).sky : null;
  return { wall: hourAtMs(ms), rise: st.rise, set: st.set, sky, skyEve };
}
function validOrder(o) { return Array.isArray(o) && o.length && o.every((a) => LCK.order.includes(a)) ? o : LCK.order; }
let memo = { key: null, val: null };
export function lampClock(ctx) {
  const now = ctx.now(), A = ctx.place?.atmosphere, frozen = A?.cycle?.frozen != null;
  const ms = frozen ? null : viewMs(ctx), w = weatherOf(ctx), j = jevRow(ctx, ms);
  const key = [ctx.place?.id, Math.floor(now / LCK.memoMs), ms == null ? 'h' + (A?.timeOfDay ?? 12) : Math.floor(ms / LCK.memoMs), w.cover, w.rain, w.moon, j?.at ?? 0, j?.lightAt ?? 0, j?.keepUntil ?? 0].join('|');
  if (memo.key === key) return memo.val;
  let val;
  if (ms == null) { // frozen sky or no clock yet: the sky's own hour, windows round 6/18
    const h = A?.timeOfDay ?? 12, d = decideAt({ wall: h, rise: RC.skyRise, set: RC.skySet, sky: h, skyEve: null }, w, null);
    val = { ...d, crossingAt: null, order: LCK.order, sky: h, wall: h, rise: RC.skyRise, set: RC.skySet };
  } else {
    const t = timesAt(ms, j), d = decideAt(t, w, j), win = LCK.stagger * 1000;
    let crossingAt = null;
    if (decideAt(timesAt(ms - win, j), w, j).on !== d.on) { // an edge in the last stagger window: find it (12 halvings ~ 22 ms)
      let a = ms - win, b = ms; for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if (decideAt(timesAt(m, j), w, j).on === d.on) b = m; else a = m; }
      crossingAt = now - (ms - b);
    }
    val = { ...d, crossingAt, order: validOrder(j?.order), sky: t.sky, wall: t.wall, rise: t.rise, set: t.set };
  }
  memo = { key, val }; return val;
}
// the lamplight pools' night factor: 1 = full night pool, 0 = day; the backstop pins it so a pool never sticks
export function poolNight(c) { if (c.source === 'backstop') return c.on ? 1 : 0; const P = LCK.pool; return cl((P.hi - c.level) / (P.hi - P.lo)); }
const AREA = new Map();
export function lampArea(id, tags) {
  if (AREA.has(id)) return AREA.get(id);
  const T = tags ?? [], leaf = id; let a = 'roads';
  for (const r of LCK.areas) if (r.tags.some((t) => T.includes(t)) || r.prefix.some((p) => leaf.startsWith(p))) { a = r.area; break; }
  if (AREA.size > 2000) AREA.clear(); AREA.set(id, a); return a;
}
// seconds after the crossing this lamp follows: its area's slot in the order (reversed at dawn), its own hash inside the slot
export function lampStagger(id, tags, order, on) {
  const o = validOrder(order), n = o.length, i0 = o.indexOf(lampArea(id, tags)), i = i0 < 0 ? n - 1 : i0, slot = LCK.stagger / n;
  return (on ? i : n - 1 - i) * slot + (lampDelay(id) / LCK.stagger) * slot;
}
