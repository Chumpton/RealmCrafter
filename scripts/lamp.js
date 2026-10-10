// LIGHTING lock-in · every lamp's behavior (W2). The flame and its ONE light are the row's fx, built from LAMPS[kind].
// state.lit mirrors the lamp clock (below); state.spent (Autofill's ~1 in 10) = burnt out: never lights, a fire kind keeps its smoulder; state.always (indoor hearths) keeps it lit. update() compares what the row wants
// with the fx it carries, writes only on a change, then sleeps until the manager's next state write wakes it. No per-tick cost.
import { LAMPS, WEATHER_K } from './lib/data/lamps.js';
// LAMP CLOCK (rev 2, lane 3): the lamp asks lampClock (lib/lamp-clock.js: real sky, cloud, rain, moon, JEV, backstop) itself, so a
// wake, join or reload is right at once. The one-by-one stagger (area order, then hash, <= 90 s) plays only while the clock's
// crossingAt is fresh. state.lit is the mirror for readers, written only when it differs; it is the fallback if the clock fails.
import { lampClock, lampStagger } from './lib/lamp-clock.js';
function clockLit(ctx) {
  try {
    const c = lampClock(ctx); if (!c || typeof c.on !== 'boolean') return null;
    if (c.crossingAt == null) return c.on;
    const wait = lampStagger(ctx.self.id, ctx.self.tags, c.order, c.on);
    return (ctx.now() - c.crossingAt) / 1000 >= wait ? c.on : !c.on;
  } catch { return null; }
}
const n = (v) => +(+v).toFixed(3);
const rgb = (h) => [1, 3, 5].map((i) => n(parseInt(h.slice(i, i + 2), 16) / 255)).join(',');
const CACHE = {};
export function lampFx(kind, lit, dark, wind = 1, wet = false, post = false) { // dark: flame without its light (a budget-capped spot); wind: curl scale; wet: an exposed flame in rain
  // post (state.post): a lantern hung on a pole outdoors keeps its own fixture and takes lanternPost's light (phase 2, Oct 5); hand lanterns untouched
  const B = LAMPS[kind]; if (!B) return null;
  const P0 = LAMPS.lanternPost, L0 = post && P0 ? { ...B, intensity: P0.intensity, distance: P0.distance, lightLift: P0.lightLift } : B;
  const R = WEATHER_K.rain, L = wet ? { ...L0, rate: Math.round(L0.rate * R.rate), flickerAmp: Math.min(.5, L0.flickerAmp * R.amp), intensity: L0.intensity * R.light, smoke: (L0.smoke ?? 0) + R.smoke } : L0;
  const [sx, sz] = L.spread ?? [.01, .01], Y = L.flameY, S = L.flameSize, H = L.flickerHz, A = L.flickerAmp;
  const bed = `box(${n(sx)},0,${n(sz)}).c(${n(Y)})`;
  if (!lit) {
    if (!L.smoulder) return null; // a torch, brazier or candle that is out is simply out
    return `fx
pop coals n=${L.smoulder} on=${bed} size=${n(S * .1)}..${n(S * .2)} col=<.9,.22,.05>*flick(.35,.45) a=.5 sz=$size r=sprite(soft-disc,add)
pop wisp rate=1 on=${bed} life=2..3.5 v=up(.2..0.4) size=${n(S * .25)}..${n(S * .4)} acc=buoy(.3)+curl(.3)*.3+drag(.8) sz=$size*(.6>2.4) col=<.32,.3,.28> a=0>.16:.15>.7:.08>0 rot=spin(.1) r=sprite(smoke-puff,alpha)`;
  }
  const up = n(Math.min(2.6, Math.max(.15, S * 4))), l0 = n(.3 + S * .35), l1 = n(.5 + S * .6);
  const P = [`pop flame rate=flick(${n(H * .5)},.25)*${L.rate} on=${bed} life=${l0}..${l1} v=up(${up})+cone(18)*(${n(S * .3)}..${n(S * .9)}) size=${n(S * .55)}..${n(S)} acc=curl(.5)*${n(Math.min(1.4, S * 3) * wind)}+buoy(${n(up * 1.3)})+drag(1.6)
  sz=$size*(.5>.25:1>.7:.7>.12) col=${L.lightLift ? 'hdr(.9,.5,.18)>.3:hdr(.6,.25,.07)>.65:hdr(.3,.09,.02)>hdr(.12,.03,.01)' : 'hdr(4.8,3.4,1.4)>.3:hdr(3.4,1.5,.35)>.65:hdr(1.9,.55,.12)>hdr(.7,.14,.03)'} a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)`, // LIGHT V2: a lantern's flame burns behind horn: no bloom bomb
  `pop core n=1 at=point().c(${n(Y + S * .3)}) size=${n(S * .6)} col=${L.lightLift ? 'hdr(.7,.35,.1)' : 'hdr(3,1.8,.6)'} a=${L.lightLift ? .12 : .45} sz=$size*flick(${H},${A}) r=sprite(soft-disc,add)`];
  if (L.coals) P.push(`pop coals n=${L.coals} on=${bed} size=${n(S * .12)}..${n(S * .26)} tint=<2.4,.9,.25>..<1.1,.3,.08> sz=$size*flick(.5,.12) col=$tint*flick(.8,.3) a=.9 r=sprite(soft-disc,add)`);
  if (L.embers) P.push(`pop embers rate=${L.embers} on=${bed} life=.7..1.5 v=up(${n(up * 1.3)})+cone(30)*(.4..1.2) size=.02..0.045 acc=curl(.8)*1.1+grav()*.45+drag(.5) sz=$size*(1>.7:.8>.3) col=hdr(5,2.8,.8)>.6:hdr(2.4,.8,.15)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)`);
  if (L.smoke) P.push(`pop smoke on=@flame?${L.smoke} inh=p;v:$v*.4 life=1.8..3.2 size=${n(S * .4)}..${n(S * .65)} acc=buoy(.9)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.4) col=<.3,.28,.26>><.15,.15,.16> a=0>.22:.3>.7:.18>0 rot=spin(.15) r=sprite(smoke-puff,alpha)`);
  // LIGHT V2: two-rate flicker (a slow breath under the crackle) so the pool itself moves; a shadow kind keeps 40% here, 60% steady on its child
  const fI = n(L.intensity * (L.shadow ? .4 : 1));
  if (!dark) P.push(`pop glow n=1 at=point().c(${n(Y + S * .5 + (L.lightLift ?? 0))}) gl=flick(${H},${A})*flick(${n(H * .21)},${n(A * .8)})${L.lightLift ? '' : ` acc=curl(.7)*${n(.5 * wind)}+attract(9)+drag(4)`} r=light(<${rgb(L.color)}>,$gl*${fI},${L.distance})`);
  return 'fx\n' + P.join('\n');
}
function apply(ctx) {
  const s = ctx.self.state ?? {}; if (!LAMPS[s.kind]) return;
  const c = clockLit(ctx);
  if (c !== null && !!s.lit !== c) ctx.self.state.lit = c; // the mirror, only on change
  const lit = !s.spent && !!((c ?? s.lit) || s.always), L0 = LAMPS[s.kind];
  // LIGHT V2 #3: the place's wind band scales the flame's curl and the pool's sway; rain sputters an open flame (sheltered rows opt out)
  const band = ctx.place.state.wind?.band ?? 'light', wind = WEATHER_K.wind[band] ?? 1;
  const wet = !!(L0.exposed && !s.sheltered && !s.always && (ctx.place.state.weather?.rain ?? 0) >= WEATHER_K.rain.at);
  const key = s.kind + (lit ? ':1' : ':0') + (s.noLight ? ':d' : '') + ':' + band + (wet ? ':w' : '') + (s.post ? ':p' : '');
  const want = CACHE[key] !== undefined ? CACHE[key] : (CACHE[key] = lampFx(s.kind, lit, !!s.noLight, wind, wet, !!s.post));
  const cur = ctx.self.fx?.script ?? null;
  if (cur !== want) ctx.self.fx = want ? { script: want } : null;
  const L = LAMPS[s.kind]; if (!L.shadow) return; // LIGHT V2: the steady shadow light rides the template's glow child
  const g = ctx.getObject(ctx.self.id + '/glow'); if (!g) return;
  const on = lit && !s.noLight, key2 = on ? s.kind + (wet ? ':w' : '') : 'off';
  if (g.state?.k === key2) return;
  // PERF2: state.sh is the shadow selector's word (home-lamplight.js syncShadows: the K nearest cast); unset (no selector in this place) = casts, as before
  g.light = on ? { kind: 'point', color: L.color, intensity: n(L.intensity * .6 * (wet ? WEATHER_K.rain.light : 1)), distance: L.distance, decay: 2, shadow: { enabled: g.state?.sh !== false } } : null;
  g.state = { ...(g.state ?? {}), k: key2 };
}
export function onSpawn(ctx) { apply(ctx); }
// sleep(2): a level check every 2 s (the manager's own cadence), so a lit flip lands within 2 s even where a state write
// from another machine does not wake a sleeping copy; apply() writes nothing unless the look must change.
export function update(ctx) { apply(ctx); ctx.sleep(2); }
