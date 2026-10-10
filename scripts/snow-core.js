// SNOW W1 · the storm (docs/board/SNOW-PLAN.md S1). The ONLY writer of place.state.snow.
// Off unless the creator's THE SKY "Winter" test switch is on (place.state.wxForce.winter === 1): then one read every
// SNOW.core.idleSec and ctx.sleep, nothing else. On: 1 Hz climate step, all numbers in SNOW (scripts/lib/data/snow.js).
//   · season: one JEV ask per in-game week (fallback SNOW.core.seasonCycle)   · storm arc: one JEV ask per storm (code arc first)
//   · dusk: one JEV ask per night, freeze hard or mild (code fallback)       · depth += rate[kind]*fall*h, melt by temp/sun/rain
// place.state.snow is written only when a rounded field changes. Forced storm: wxForce.snow > 0 holds a fall at least that big.
import { SNOW } from './lib/data/snow.js';
import { meter } from './lib/jev-meter.js';
const C = SNOW.core, GH = SNOW.GH_MS, GD = GH * 24, KINDS = ['powder', 'wet', 'sleet', 'blizzard'], SEASONS = ['autumn', 'early', 'deep', 'thaw'];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), rd = (v, s) => Math.round(v * s) / s;
const WORD = { powder: 'SNOW FALLING', wet: 'WET SNOW', sleet: 'SLEET', blizzard: 'BLIZZARD' };
export const updateSchedule = { every: { seconds: 1 } };
const mem = {}; // hot climate per host; mirrored to self.state.w every C.saveSec so a restart resumes
function load(ctx) { const id = ctx.self.id; if (!mem[id]) mem[id] = ctx.self.state.w ? { ...ctx.self.state.w } : null; return mem[id]; }
function save(ctx, W) { mem[ctx.self.id] = W; ctx.self.state.w = { ...W }; W.savedAt = ctx.now(); }
function pick(ctx, weights) { const e = Object.entries(weights), t = e.reduce((a, [, w]) => a + w, 0); let r = ctx.random() * t; for (const [k, w] of e) if ((r -= w) <= 0) return k; return e[0][0]; }
const span = (ctx, [a, b]) => a + (b - a) * ctx.random();
const job = (ctx, cb, message, props, payload) => {
  meter(ctx, 'snow');
  ctx.job('llm:generate', { model: 'fast', system: C.jevSystem, message, schema: { type: 'object', properties: props, required: Object.keys(props) } }, cb, payload);
};
export function onSpawn(ctx) {}
export function update(ctx) {
  const P = ctx.place.state, F = P.wxForce ?? {};
  if (F.winter !== 1) { // natural cycle: snow stays off
    if (P.snow?.on) P.snow = { on: false, season: null, temp: null, kind: null, fall: 0, depth: 0, wet: 0, crust: 0, arc: null, forecast: '', firstSnowAt: null, at: ctx.now() };
    if (ctx.self.state.w) { ctx.self.state.w = null; mem[ctx.self.id] = null; }
    ctx.sleep(C.idleSec); return;
  }
  const now = ctx.now(); let W = load(ctx);
  if (!W) W = { since: now, last: now, depth: 0, wet: 0, crust: 0, temp: null, first: null, storm: null, lastArc: null, nextStormAt: now + C.firstStormH * GH, week: null, season: null, seasonBy: 'code', night: null, key: '' };
  const dtH = clamp((now - W.last) / GH, 0, 2); W.last = now;
  const atm = ctx.place.atmosphere ?? {}, hour = atm.timeOfDay ?? 12, cloud = atm.clouds?.density ?? 0.3, rain = P.weather?.rain ?? 0;
  // season: one JEV ask per in-game week
  const week = Math.floor(now / (GD * 7));
  if (W.week !== week) {
    W.week = week; W.season = C.seasonCycle[((week % C.seasonCycle.length) + C.seasonCycle.length) % C.seasonCycle.length]; W.seasonBy = 'code';
    job(ctx, 'onWeek', `A new week of winter begins (week ${week}). Last week was "${W.season}". Pick this week's season for the lake: autumn (cold rain, sleet), early (first snows), deep (hard cold, big storms), thaw (wet, melting).`, { season: { type: 'string', enum: SEASONS } }, { week });
  }
  // storm arc
  const forced = typeof F.snow === 'number' && F.snow > 0;
  if (!W.storm && (now >= W.nextStormAt || forced)) startStorm(ctx, W, now, P);
  let fall = 0, kind = W.storm?.kind ?? 'powder';
  if (W.storm) {
    const S = W.storm, u = (now - S.startAt) / Math.max(1, S.endAt - S.startAt);
    if (u >= 1 && !forced) { W.lastArc = S; W.storm = null; W.nextStormAt = now + span(ctx, C.gapH[W.season] ?? C.gapH.early) * GH; }
    else fall = S.peak * Math.pow(Math.sin(Math.PI * clamp(u)), 0.8);
  }
  if (forced) fall = Math.max(fall, F.snow);
  // air temperature: season mean + a sun swing a cloud blanket damps + the dusk call + the storm's own air
  const dusk = hour >= 17.5 && hour < 19, dayKey = Math.floor(now / GD), dark = hour >= 18 || hour < 6;
  if (dusk && W.night?.day !== dayKey) {
    const mode = W.season === 'deep' ? 'hard' : W.season === 'thaw' || W.season === 'autumn' ? 'mild' : cloud < 0.45 ? 'hard' : 'mild';
    W.night = { day: dayKey, mode, by: 'code', line: null };
    job(ctx, 'onNight', `Dusk at the lake. Season ${W.season}, air ${rd(W.temp ?? 0, 1)} C, cloud ${Math.round(cloud * 100)}%, snow on the ground ${Math.round(W.depth * 100)} cm. Tonight: freeze hard or stay mild? Give a short line for the forecast slate.`, { freeze: { type: 'string', enum: ['hard', 'mild'] }, line: { type: 'string' } }, { day: dayKey });
  }
  let target = (C.seasonTemp[W.season] ?? -1) + C.diurnal * (1 - 0.6 * cloud) * Math.cos((hour - 15) / 24 * 2 * Math.PI);
  if (dark && W.night) target += W.night.mode === 'hard' ? C.hardFrost : C.mildNight;
  if (fall > 0.05) target = target * 0.5 + (C.kindTemp[kind] ?? -2) * 0.5;
  W.temp = W.temp == null ? target : W.temp + (target - W.temp) * Math.min(1, dtH * 2);
  const temp = W.temp;
  if (fall > 0.02) { if (temp > 1.5 && kind !== 'sleet') kind = 'sleet'; else if (temp > 0.3 && (kind === 'powder' || kind === 'blizzard')) kind = 'wet'; }
  if (rain > 0 && temp < 0) { fall = Math.max(fall, rain); if (!W.storm) kind = temp > -2 ? 'wet' : 'powder'; } // the rain comes down white (weather-core shows it)
  // depth: fall in, melt out
  W.depth += (SNOW.rate[kind] ?? 0.05) * fall * dtH;
  const arc = W.storm ?? W.lastArc, meltMul = clamp(C.meltDaysRef / (arc?.meltDays ?? C.meltDaysRef), 0.5, 2);
  const sun = hour > 6 && hour < 18 ? Math.sin((hour - 6) / 12 * Math.PI) * (1 - cloud) : 0;
  let melt = 0;
  if (temp > 0) melt += SNOW.melt.perC * temp + SNOW.melt.rain * (rain > 0 ? rain : 0);
  if (temp > -3) melt += SNOW.melt.sun * sun;
  W.depth = clamp(W.depth - melt * meltMul * dtH, 0, SNOW.maxDepth);
  const wetT = temp > 0 ? clamp(temp / 3 + (rain > 0 ? rain : 0)) : fall > 0.05 && (kind === 'wet' || kind === 'sleet') ? 0.6 : 0;
  W.wet = clamp(W.wet + (wetT - W.wet) * Math.min(1, dtH * C.wetRate));
  if (W.wet > 0.2 && temp < -1) W.crust += dtH * C.crustRate * W.wet;          // melt-water refreezes into a crust
  W.crust = clamp(W.crust - fall * dtH * C.crustBury * 0.1, 0, Math.max(0.3, arc?.crust ?? 0.5)); // fresh snow buries it
  if (W.depth < 0.003) W.crust = 0;
  if (!W.first && W.depth >= 0.005) W.first = now;                             // firstSnowAt: once per winter
  // publish, rounded, only on change
  const pub = arc ? { kind: arc.kind, totalCm: arc.totalCm, hours: arc.hours, windBias: arc.windBias, gustiness: arc.gustiness, crust: arc.crust, meltDays: arc.meltDays, buryDoors: arc.buryDoors, lakeIce: arc.lakeIce, startAt: arc.startAt, endAt: arc.endAt, by: arc.by, active: !!W.storm } : null;
  const out = { on: true, season: W.season, temp: rd(temp, 2), kind: fall > 0.02 ? kind : null, fall: rd(fall, 20), depth: rd(W.depth, 100), wet: rd(W.wet, 20), crust: rd(W.crust, 20), arc: pub, forecast: forecast(W, fall, kind, temp, now, dark), firstSnowAt: W.first };
  const key = JSON.stringify(out);
  if (key !== W.key || P.snow?.on !== true || P.snow?.at !== W.at) { W.key = key; W.at = now; P.snow = { ...out, at: now }; }
  mem[ctx.self.id] = W;
  if (now - (W.savedAt ?? 0) > C.saveSec * 1000) save(ctx, W);
}
function startStorm(ctx, W, now, P) {
  const season = W.season ?? 'early', kind = pick(ctx, C.kinds[season] ?? C.kinds.early);
  const S = { id: now, by: 'code', kind, totalCm: Math.round(span(ctx, C.cm[season] ?? C.cm.early)), hours: rd(span(ctx, C.hours), 2),
    windBias: Math.round((((P.wind?.toward ?? 0) + 180) % 360 + 360) % 360), gustiness: rd(kind === 'blizzard' ? 0.8 : 0.2 + 0.4 * ctx.random(), 100),
    crust: rd(season === 'thaw' ? 0.6 : 0.3, 100), meltDays: season === 'deep' ? 6 : season === 'thaw' ? 1.5 : 3, buryDoors: false, lakeIce: season === 'deep' ? 0.8 : season === 'early' ? 0.3 : 0, line: null, startAt: now };
  S.buryDoors = S.totalCm >= 40; shapeStorm(S, now);
  W.storm = S;
  job(ctx, 'onArc', `A snow storm is starting over a Norse lakeside longhouse. Season ${season}, air ${rd(W.temp ?? 0, 1)} C, cloud ${Math.round((ctx.place.atmosphere?.clouds?.density ?? 0) * 100)}%, wind from ${S.windBias} degrees, ${Math.round(W.depth * 100)} cm already on the ground. Shape this storm: kind (${KINDS.join('/')}), totalCm 2-120, hours 1-24 (game hours), windBias (degrees the wind comes FROM), gustiness 0-1, crust 0-1 (icy crust after), meltDays 0.5-14, buryDoors (drifts heap at doors), lakeIce 0-1, and a short slate line.`,
    { kind: { type: 'string', enum: KINDS }, totalCm: { type: 'number' }, hours: { type: 'number' }, windBias: { type: 'number' }, gustiness: { type: 'number' }, crust: { type: 'number' }, meltDays: { type: 'number' }, buryDoors: { type: 'boolean' }, lakeIce: { type: 'number' }, line: { type: 'string' } }, { id: S.id });
}
function shapeStorm(S, now) {
  S.endAt = Math.max(now + GH * 0.5, S.startAt + S.hours * GH);
  S.peak = rd(clamp(S.totalCm / 100 / ((SNOW.rate[S.kind] ?? 0.06) * S.hours * C.shape), 0.15, 1), 100);
}
function forecast(W, fall, kind, temp, now, dark) {
  const S = W.storm, t = `${temp < 0 ? '−' : ''}${Math.abs(Math.round(temp))}°`;
  const l1 = fall > 0.05 ? WORD[kind] ?? 'SNOW' : W.depth >= 0.02 ? `${Math.round(W.depth * 100)} CM LIES` : temp < 0 ? 'CLEAR · COLD' : 'MILD · DRY';
  let l2;
  if (S && now < S.endAt) { const left = Math.max(0, Math.round(S.totalCm * (1 - clamp((now - S.startAt) / (S.endAt - S.startAt))))); l2 = left > 0 ? `~${left} CM MORE` : 'EASING OFF'; }
  else { const h = Math.max(1, Math.round((W.nextStormAt - now) / GH)); l2 = h <= 1 ? 'SNOW SOON' : h < 24 ? `SNOW IN ~${h} H` : `SNOW IN ~${Math.round(h / 24)} DAYS`; }
  const night = W.night && (dark || now - W.night.day * GD < GD) ? W.night : null;
  const l3 = S?.line && now < S.endAt ? S.line : night?.line ? night.line : night ? `${t} · ${night.mode === 'hard' ? 'HARD FROST' : 'MILD NIGHT'}` : t;
  return [l1, l2, String(l3).toUpperCase().slice(0, 34)].join('\n');
}
const cur = (ctx) => (ctx.place.state.wxForce?.winter === 1 ? load(ctx) : null);
const txt = (r, k) => String(r?.data?.object?.[k] ?? '').replace(/\s+/g, ' ').trim().slice(0, 34) || null;
export function onWeek(ctx, r, p) {
  const W = cur(ctx), s = r?.ok ? r.data?.object?.season : null;
  if (!W || W.week !== p?.week) return;
  if (!SEASONS.includes(s)) { meter(ctx, 'snow', 'fail'); return; }
  W.season = s; W.seasonBy = 'jev'; save(ctx, W);
}
export function onNight(ctx, r, p) {
  const W = cur(ctx), o = r?.ok ? r.data?.object : null;
  if (!W || W.night?.day !== p?.day) return;
  if (!o || !['hard', 'mild'].includes(o.freeze)) { meter(ctx, 'snow', 'fail'); return; }
  W.night = { ...W.night, mode: o.freeze, by: 'jev', line: txt(r, 'line') }; save(ctx, W);
}
export function onArc(ctx, r, p) {
  const W = cur(ctx), o = r?.ok ? r.data?.object : null, S = W?.storm;
  if (!S || S.id !== p?.id) return;
  if (!o) { meter(ctx, 'snow', 'fail'); ctx.log('snow arc fell back', { err: r?.error ?? null }); return; }
  const num = (k, a, b) => (typeof o[k] === 'number' && isFinite(o[k]) ? clamp(o[k], a, b) : S[k]); // fallback fills any gap
  if (KINDS.includes(o.kind)) S.kind = o.kind;
  S.totalCm = Math.round(num('totalCm', 2, 120)); S.hours = rd(num('hours', 1, 24), 100); S.windBias = Math.round(((num('windBias', -720, 720) % 360) + 360) % 360);
  S.gustiness = rd(num('gustiness', 0, 1), 100); S.crust = rd(num('crust', 0, 1), 100); S.meltDays = rd(num('meltDays', 0.5, 14), 10); S.lakeIce = rd(num('lakeIce', 0, 1), 100);
  if (typeof o.buryDoors === 'boolean') S.buryDoors = o.buryDoors; // W4 caps any door drift at SNOW.doorCap: never sealed
  S.line = txt(r, 'line'); S.by = 'jev'; shapeStorm(S, ctx.now()); save(ctx, W);
}
