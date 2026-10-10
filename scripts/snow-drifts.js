// Lane W4 (S8a + S7 folk): wind drifts bank against the longhouse doors, the den guard keeps every door a wade (never sealed)
// and the square-door step ankle-deep, the folk tread the main path, and after a heavy night Gunnar digs it out at dawn.
// Folk talk: one JEV pick per event (first snow, buried door, a player's dig, a player's pile, the dawn dig) with canned fallbacks.
// SNOW OFF (the natural cycle): one read and ctx.sleep(SNOW.drifts.offSleep). Numbers: SNOW.drifts; lines: FOLK.snow.
// Other lanes: emit('snowPile', { x, z, h, by }) when a thrown heap stands (W5 shovel) and the folk may comment.
import { SNOW } from './lib/data/snow.js';
import { FOLK } from './lib/data/folk-life.js';
import { depthAt, packAt, dab, inZone, inHall } from './lib/snow-field.js';
import { meter } from './lib/jev-meter.js';
import { esc } from './lib/esc.js';
const D = SNOW.drifts, T = FOLK.snow;
export const updateSchedule = { every: { seconds: D.every } };
const SPRAY = `fx
pop clods burst=10..16 life=.5..0.9 v=<0,1,0>*(2..3.2)+sdir()*(.6..1.2) size=.05..0.12 acc=grav()*.9+drag(1.2) col=<.95,.97,1> a=1>.7:1>0 sz=$size r=sprite(soft-disc,alpha)
pop powder burst=3..5 life=.6..1.1 v=up(.4..0.8)+sdir()*.4 size=.25..0.4 acc=buoy(.1)+drag(1.6) col=<.92,.94,.98> a=0>.2:.35>.7:.15>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
const SCRAPE = '/cdn/moodboard-lowpoly-cozy/sfx-snow-shovel-scrape.mp3';
const near = (ctx, x, z, r) => ctx.place.players.some((p) => { const f = p.feetPosition; return f && (f.x - x) ** 2 + (f.z - z) ** 2 < r * r; });
function worstDoor(arc, wind) {
  const b = arc?.buryDoors, keys = Object.keys(D.doors).filter((k) => k !== 'square');
  if (typeof b === 'string' && D.doors[b]) return { door: b, bury: true };
  if (Array.isArray(b) && D.doors[b[0]]) return { door: b[0], bury: true };
  if (b && typeof b === 'object') { const k = Object.entries(b).filter(([k]) => D.doors[k]).sort((a, c) => (+c[1] || 0) - (+a[1] || 0))[0]; if (k) return { door: k[0], bury: true }; }
  let best = keys[0], bl = -9; for (const k of keys) { const l = lee(k, wind); if (l > bl) { bl = l; best = k; } }
  return { door: best, bury: !!b };
}
function lee(k, wind) { // wind toward yaw t blows along (-sin t, -cos t); a door whose outward normal runs with it sits in the lee
  const t = ((wind?.toward ?? 0) * Math.PI) / 180, n = D.doors[k].n;
  return Math.max(0, -Math.sin(t) * n[0] - Math.cos(t) * n[1]);
}
export function update(ctx) {
  const s = ctx.place.state.snow, st = ctx.self.state;
  if (!s?.on) { if (st.live) { st.live = false; st.shovel = null; st.talk = null; st.prints = null; } ctx.sleep(D.offSleep); return; }
  const now = ctx.now(), dt = st.live && st.lastAt ? Math.min(30, (now - st.lastAt) / 1000) : 0;
  st.live = true; st.lastAt = now;
  const wind = ctx.place.state.wind ?? {}, fall = s.fall ?? 0;
  if (!st.storm && fall > 0) st.storm = { at: now, said: {} };
  if (st.storm && fall <= 0 && s.depth <= 0.01) st.storm = null;
  const w = worstDoor(s.arc, wind); st.worst = w.door;
  // 1. drifts: the wind stalls against the shell and banks the lee doors
  if (fall > 0 && dt > 0) {
    const gameH = (dt * 1000) / SNOW.GH_MS, /* real-time sky: drift pace pinned to SNOW.GH_MS, not the sky's period */ rate = SNOW.rate[s.kind] ?? SNOW.rate.powder;
    const sp = wind.speed ?? 3, stall = sp >= D.stall[0] && sp <= D.stall[1] ? 1 : D.outOfStall;
    const acc = st.acc ?? {};
    for (const k of Object.keys(D.doors)) {
      if (k === 'square') continue; // the square door is held trodden, never drifted
      acc[k] = (acc[k] ?? 0) + fall * rate * gameH * D.mul * stall * (D.leeFloor + lee(k, wind)) * (k === w.door ? D.worstMul : 1) * (w.bury ? 1 : D.softMul);
      if (acc[k] >= D.minDab) {
        const p = D.doors[k], cur = depthAt(ctx, p.x, p.z), add = Math.min(acc[k], SNOW.doorCap - cur);
        if (add > 0.001) dab(ctx, p.x, p.z, add, D.radius);
        acc[k] = 0;
      }
    }
    st.acc = acc;
  }
  // 2. den guard: every door a wade, the square-door step ankle-deep
  const dd = {};
  for (const [k, p] of Object.entries(D.doors)) {
    const cur = depthAt(ctx, p.x, p.z), cap = k === 'square' ? SNOW.squarePathCap : SNOW.doorCap; dd[k] = +cur.toFixed(3);
    if (cur > cap + D.capSlack) dab(ctx, p.x, p.z, cap - cur, D.radius, { pack: 0.5 });
  }
  const sq = D.squareStep[Math.floor(now / 2000) % D.squareStep.length], sqd = depthAt(ctx, sq[0], sq[1]);
  if (sqd > SNOW.squarePathCap + D.capSlack) dab(ctx, sq[0], sq[1], SNOW.squarePathCap - sqd, 0.7, { pack: 0.8 });
  // 3. folk footsteps pack the main path, one cell at a time
  if (!st.shovel && now - (st.treadAt ?? 0) > D.tread.every * 1000) {
    st.treadAt = now; st.tread = ((st.tread ?? -1) + 1) % D.mainPath.length;
    const [x, z] = D.mainPath[st.tread], d = depthAt(ctx, x, z);
    if (d > 0.03) dab(ctx, x, z, -d * (1 - packAt(ctx, x, z)) * SNOW.foot.sink * D.tread.share, SNOW.foot.radius * 2, { pack: SNOW.foot.pack });
  }
  // 3b. folk prints: every outdoor walker (D.tread.tags) that moved a stride since its last print dabs under its feet, once per tread.every s
  treadFolk(ctx, st, now);
  // 4. talk moments
  if (st.storm && s.firstSnowAt && st.firstFor !== s.firstSnowAt && talk(ctx, 'first')) st.firstFor = s.firstSnowAt;
  const md = dd.main ?? 0, prev = st.doorD?.main ?? md;
  if (st.storm && !st.storm.said.buried && Math.max(dd.main ?? 0, dd.back ?? 0) >= D.buriedM) { if (talk(ctx, 'buried')) st.storm.said.buried = true; }
  if (!st.shovel && prev - md >= D.digDropM) st.digAt = now; // a player dug at the main door
  if (st.digAt && now - st.digAt > D.digQuietS * 1000 && talk(ctx, 'dig')) st.digAt = null;
  st.doorD = dd;
  // 5. dawn: after a heavy night, Gunnar digs the main door path unless a player already did
  const h = ctx.place.atmosphere?.timeOfDay ?? 12, ph = st.hour ?? h, night = h >= D.dawn.duskHour || h < D.dawn.hour;
  if (night) st.nightPeak = Math.max(st.nightPeak ?? 0, md);
  if (ph < D.dawn.hour && h >= D.dawn.hour && h < D.dawn.hour + 3) {
    if ((st.nightPeak ?? 0) >= D.dawn.heavyM && md >= D.dawn.clearedM) st.shovel = { i: 0, at: now };
    st.nightPeak = 0;
  }
  st.hour = h;
  if (st.shovel) shovelStep(ctx, st);
  const q = st.talk; if (q && !q.sent && now - q.at > D.talk.askTimeoutMs) say(ctx, q.ev, T.fallback[q.ev].who, T.fallback[q.ev].line, 'fallback');
}
function treadFolk(ctx, st, now) {
  const R = D.tread, gap = R.every * 1000, stride = SNOW.w8.stride, marks = st.prints ?? {}, next = {};
  let changed = false;
  for (const q of ctx.query({ anyTags: R.tags })) {
    const o = ctx.getObject(q.id), f = o?.worldFeetPosition || q.feetPosition; if (!f) continue;
    const m = marks[q.id];
    if (!m) { next[q.id] = [+f.x.toFixed(2), +f.z.toFixed(2), now]; changed = true; continue; } // first sight: the baseline, no print
    next[q.id] = m;
    if (now - m[2] < gap || Math.hypot(f.x - m[0], f.z - m[1]) < stride) continue;
    if (!inZone(f.x, f.z) || inHall(f.x, f.z)) continue; // indoors: no print, the mark waits where they stepped in
    const d = depthAt(ctx, f.x, f.z); if (d < R.minDepth) continue;
    dab(ctx, f.x, f.z, -d * (1 - packAt(ctx, f.x, f.z)) * SNOW.foot.sink * R.share, SNOW.foot.radius, { pack: SNOW.foot.pack * R.share });
    next[q.id] = [+f.x.toFixed(2), +f.z.toFixed(2), now]; changed = true;
  }
  for (const [id, m] of Object.entries(marks)) if (!next[id] && now - m[2] < R.forget * 1000) next[id] = m; else if (!next[id]) changed = true;
  if (changed) st.prints = next;
}
function shovelStep(ctx, st) {
  const i = st.shovel.i, pt = D.mainPath[i];
  if (!pt) { if (talk(ctx, 'shovel')) st.shovel = null; return; }
  const [x, z] = pt, d = depthAt(ctx, x, z), take = d - D.dawn.leaveM;
  if (take > 0.005) {
    dab(ctx, x, z, -take, D.dawn.radius, { pack: D.dawn.pack });
    const side = i % 2 ? 1 : -1; // thrown left and right of the path: a real bank, not deleted snow
    dab(ctx, x + side * D.dawn.throwSide, z, take * D.dawn.throwShare, 0.6);
    if (near(ctx, x, z, SNOW.budget.fxRange)) {
      const at = { x, y: (ctx.place.terrain?.heightAt?.(x, z) ?? 23.55) + d, z };
      ctx.emit('fx', { position: { x: at.x + side * 0.6, y: at.y, z: at.z }, script: SPRAY }, { audience: { nearby: at, radius: SNOW.budget.fxRange } });
      ctx.emit('playSound', { clip: SCRAPE, position: at, volume: 0.5, maxDistance: 22 });
    }
  }
  st.shovel = { ...st.shovel, i: i + 1 };
}
export const ears = { snowPile(ctx, p) {
  const st = ctx.self.state; if (!ctx.place.state.snow?.on || !p) return;
  if (ctx.now() - (st.pileAt ?? 0) < D.pileGapMs) return; if (talk(ctx, 'pile')) st.pileAt = ctx.now();
} };
function talk(ctx, ev) {
  const st = ctx.self.state, now = ctx.now(), lines = T.lines[ev];
  if (!lines || (st.talk && !st.talk.sent) || (now - (st.talkAt ?? 0) < D.talk.gapMs && ev !== 'shovel')) return false;
  if (ctx.place.state.wxForce?.folk === 0) return true; // folk off: they carry on, the moment is spent
  const seed = Math.floor(ctx.random() * 1e9); st.talk = { ev, at: now, seed, sent: false }; st.talkAt = now;
  const where = { first: 'The first snow of winter has just begun falling on the longhouse.', buried: 'Wind has drifted snow knee-deep against a longhouse door.',
    dig: 'A guest has just dug the snow away from the longhouse door with a shovel.', pile: 'A guest is heaping thrown snow into a pile or a fort in the yard.',
    shovel: `${T.shovellerName} has just shovelled the snow off the door path at dawn and come back in.` }[ev];
  const questions = { line: { type: 'choice', instructions: `${where} Which line gets said, in the voice of Norse folk by the hearth?`, criteria: lines } };
  if (ev !== 'shovel') questions.who = { type: 'choice', instructions: `${where} Who in the hall speaks up?`, criteria: T.who };
  meter(ctx, 'snow-folk');
  ctx.job('jev:decide', { state: { where: 'a Norse longhouse above a great lake, winter', event: ev, depth: Math.round((ctx.place.state.snow?.depth ?? 0) * 100) / 100, hour: Math.round((ctx.place.atmosphere?.timeOfDay ?? 12) * 10) / 10 }, questions }, 'onSnowTalk', { seed });
  return true;
}
const top = (probs, ok) => Object.entries(probs || {}).filter(([k]) => k in ok).sort((a, b) => b[1] - a[1])[0]?.[0];
export function onSnowTalk(ctx, res, p) {
  const st = ctx.self.state, q = st.talk; if (!q || q.sent || !p || q.seed !== p.seed) return;
  const a = res?.ok ? res.data?.answers : null, fb = T.fallback[q.ev];
  if (!a) { meter(ctx, 'snow-folk', 'fail'); say(ctx, q.ev, fb.who, fb.line, 'fallback'); return; }
  say(ctx, q.ev, q.ev === 'shovel' ? T.shoveller : top(a.who?.probabilities, T.who) ?? fb.who, top(a.line?.probabilities, T.lines[q.ev]) ?? fb.line, 'jev');
}
function say(ctx, ev, who, key, by) {
  const st = ctx.self.state; st.talk = { ...(st.talk ?? {}), sent: true, by, who, key };
  const line = T.lines[ev]?.[key]; ctx.log('snow-talk', { ev, who, key, by }); if (!line || !ctx.getObject(who)) return;
  if (who.startsWith('folk-')) { ctx.emit('rainReact', { react: T.react[who] ?? 'glance', line, delay: 0.6 }, { to: who }); return; } // the folk's own gesture + floating line
  const o = ctx.getObject(who), f = o.worldFeetPosition || o.feetPosition, wd = Math.max(1.1, Math.min(2.6, line.length * 0.052));
  ctx.spawn({ audience: 'near', lifetime: 5, tags: ['rain-line'], feetPosition: { x: f.x, y: +(f.y + 1.95).toFixed(2), z: f.z },
    vector: `<svg viewBox='0 0 ${Math.round(wd * 100)} 24' width='${wd.toFixed(2)}m' billboard='yaw'><text x='${Math.round(wd * 50)}' y='17' text-anchor='middle' font-family='serif' font-size='14' font-style='italic' fill='#f2e6cf' filter='drop-shadow(0 0 2 #1a120c)'>${esc(line)}</text></svg>` });
}
