// The den's real clock (LAMP-CLOCK-PLAN rev 2). One SQL anchor in world.state.clock = { wallMs, roomMs, at } (written by the
// weather controller on spawn and hourly via anchorClock); every machine derives wall time = wallMs + (ctx.now() - roomMs).
// No Date, no Math.random: pure arithmetic on the anchor. The dev room may run a preview (place.state.dayPreview, written only
// by the weather controller while ctx.world.mode === 'dev'): every HOUR read honours it; wallMs() is always the real instant.
// skyHour = the season-remapped hour every sky curve already keys on: real sunrise -> 6, real sunset -> 18, linear between.
import { RC } from './data/real-clock.js';
import { partAt } from './data/day-parts.js';
const DAYMS = 864e5, HMS = 36e5, R = Math.PI / 180;
const mod = (n, d) => ((n % d) + d) % d;
// ---- calendar (Hinnant's civil algorithms, days since 1970-01-01)
export function civil(z) { z += 719468; const era = Math.floor(z / 146097), doe = z - era * 146097, yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365), doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153), d = doy - Math.floor((153 * mp + 2) / 5) + 1, m = mp < 10 ? mp + 3 : mp - 9; return { y: yoe + era * 400 + (m <= 2 ? 1 : 0), m, d }; }
export function daysOf(y, m, d) { y -= m <= 2 ? 1 : 0; const era = Math.floor(y / 400), yoe = y - era * 400, doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1, doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; return era * 146097 + doe - 719468; }
const wday = (days) => mod(days + 4, 7); // 0 = Sunday
function nthSunday(y, m, n) { const d1 = daysOf(y, m, 1); return d1 + mod(7 - wday(d1), 7) + 7 * (n - 1); }
// ---- time zone: hours from UTC at a real instant
const dstCache = {};
function dstSpan(y) { if (dstCache[y]) return dstCache[y]; const T = RC.tz, s = T.dstStart, e = T.dstEnd;
  return dstCache[y] = [nthSunday(y, s.month, s.nth) * DAYMS + (s.hour - T.std) * HMS, nthSunday(y, e.month, e.nth) * DAYMS + (e.hour - T.dst) * HMS]; }
export function offsetH(ms) { const y = civil(Math.floor(ms / DAYMS)).y, [a, b] = dstSpan(y); return ms >= a && ms < b ? RC.tz.dst : RC.tz.std; }
export function tzLabel(ms) { return offsetH(ms) === RC.tz.dst ? RC.tz.dstLabel : RC.tz.stdLabel; }
const localMs = (ms) => ms + offsetH(ms) * HMS;
// ---- the sun (NOAA general solar position), absolute ms of sunrise/sunset for a local calendar day
const sunCache = new Map();
export function sunMs(ld) {
  const hit = sunCache.get(ld); if (hit) return hit;
  const { y } = civil(ld), doy = ld - daysOf(y, 1, 1), len = daysOf(y + 1, 1, 1) - daysOf(y, 1, 1);
  const g = 2 * Math.PI / len * (doy + (12 - RC.lon / 15 - 12) / 24);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const c = Math.cos(RC.zenith * R) / (Math.cos(RC.lat * R) * Math.cos(dec)) - Math.tan(RC.lat * R) * Math.tan(dec);
  const ha = Math.acos(Math.max(-1, Math.min(1, c))) / R;
  // UTC minutes from the UTC midnight of the same calendar date; the local date's sun sits on that UTC date's clock at 122°W
  const base = ld * DAYMS, r = { rise: base + (720 - 4 * (RC.lon + ha) - eq) * 60000, set: base + (720 - 4 * (RC.lon - ha) - eq) * 60000 };
  if (sunCache.size > 16) sunCache.clear(); sunCache.set(ld, r); return r;
}
// ---- pure reads at an instant
export function hourAtMs(ms) { return mod(localMs(ms), DAYMS) / HMS; }
export function dayKeyAtMs(ms) { const c = civil(Math.floor(localMs(ms) / DAYMS)); return c.y + '-' + String(c.m).padStart(2, '0') + '-' + String(c.d).padStart(2, '0'); }
export function sunTimesAtMs(ms) { const ld = Math.floor(localMs(ms) / DAYMS), s = sunMs(ld); return { rise: hourAtMs(s.rise), set: hourAtMs(s.set), riseMs: s.rise, setMs: s.set }; }
// the remap, in real ms (continuous across midnight and DST): { sky, slope (sky h per real h), nextMs (the next sunrise/sunset), seg }
export function skyAtMs(ms) {
  const ld = Math.floor(localMs(ms) / DAYMS), t = sunMs(ld);
  let a, b, h0, seg;
  if (ms < t.rise) { a = sunMs(ld - 1).set; b = t.rise; h0 = RC.skySet; seg = 'night'; }
  else if (ms >= t.set) { a = t.set; b = sunMs(ld + 1).rise; h0 = RC.skySet; seg = 'night'; }
  else { a = t.rise; b = t.set; h0 = RC.skyRise; seg = 'day'; }
  const span = seg === 'day' ? RC.skySet - RC.skyRise : 24 - (RC.skySet - RC.skyRise);
  return { sky: mod(h0 + span * (ms - a) / (b - a), 24), slope: span * HMS / (b - a), nextMs: b, seg };
}
// the real instant today (the view's local day) whose sky hour is h; night hours < 6 are this morning's, >= 18 tonight's
export function msForSky(ms, h) {
  h = mod(h, 24); const ld = Math.floor(localMs(ms) / DAYMS), t = sunMs(ld);
  if (h >= RC.skyRise && h < RC.skySet) return t.rise + (h - RC.skyRise) / (RC.skySet - RC.skyRise) * (t.set - t.rise);
  if (h >= RC.skySet) { const b = sunMs(ld + 1).rise; return t.set + (h - RC.skySet) / 12 * (b - t.set); }
  const a = sunMs(ld - 1).set; return a + (h + 24 - RC.skySet) / 12 * (t.rise - a);
}
// ---- the anchor and the view
export function anchored(ctx) { const c = ctx.world.state.clock; return !!c && typeof c.wallMs === 'number' && typeof c.roomMs === 'number'; }
export function wallMs(ctx) { const c = ctx.world.state.clock; return anchored(ctx) ? c.wallMs + (ctx.now() - c.roomMs) : null; } // the REAL instant, never previewed
export function preview(ctx) { const p = ctx.place?.state?.dayPreview; // creator 2026-10-07: the keeper's preview stands in live too
  return p && typeof p.atMs === 'number' ? p : null; }
export function viewMs(ctx) { const w = wallMs(ctx); if (w == null) return null; const p = preview(ctx); return p ? (p.held ? p.atMs : p.atMs + (ctx.now() - p.room)) : w; }
const fallbackHour = (ctx) => ctx.place?.atmosphere?.timeOfDay ?? 12; // unanchored: the sky's own hour, so nothing ever reads NaN
export function wallHour(ctx) { const v = viewMs(ctx); return v == null ? fallbackHour(ctx) : hourAtMs(v); }
export function skyHour(ctx) { const v = viewMs(ctx); return v == null ? fallbackHour(ctx) : skyAtMs(v).sky; }
export function sunTimes(ctx) { const v = viewMs(ctx); return v == null ? { rise: RC.skyRise, set: RC.skySet, riseMs: null, setMs: null } : sunTimesAtMs(v); }
export function dayKey(ctx) { const v = viewMs(ctx); return v == null ? null : dayKeyAtMs(v); }
export function partName(h) { return partAt(h); }
export function clockLabel(ctx) { const v = viewMs(ctx), h = wallHour(ctx), hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + (v == null ? '' : ' ' + tzLabel(v)) + ' · ' + partAt(h); }
// ---- the anchor writer: the weather controller calls this from its 2 s clock(); one SQL read on spawn (module load) and hourly
let busy = false, loaded = false, lastTry = -1e15;
export function anchorClock(ctx) {
  const c = ctx.world.state.clock, now = ctx.now();
  if (busy || now - lastTry < RC.retryMs) return;
  if (loaded && anchored(ctx) && now - (c.at ?? c.roomMs) < RC.anchorMs) return;
  busy = true; lastTry = now; const t0 = ctx.now();
  Promise.resolve(ctx.sql`SELECT strftime('%s','now') AS t, CAST((julianday('now') - 2440587.5) * 86400000.0 AS INTEGER) AS ms`).then((r) => {
    const row = r?.rows?.[0] ?? {}, s = Number(row.t), m = Number(row.ms);
    if (!isFinite(s) || s < 1.7e9) throw new Error('bad wall clock ' + row.t);
    const wall = isFinite(m) && Math.abs(m - s * 1000) < 2000 ? m : s * 1000 + 500, room = Math.round((t0 + ctx.now()) / 2);
    const prev = ctx.world.state.clock, drift = prev && typeof prev.wallMs === 'number' ? Math.round(prev.wallMs + (room - prev.roomMs) - wall) : null;
    ctx.world.state.clock = { wallMs: wall, roomMs: room, at: room, drift, by: 'sql' };
    loaded = true;
  }).catch((e) => { ctx.log?.('real-clock: anchor failed', String(e?.message ?? e)); }).finally(() => { busy = false; });
}
