// LIGHTING lock-in S1 (2026-10-04): what each hour of the den's day LOOKS like. home-day.js paces the clock; this says the light.
// The rows are the old dark nights the creator called "almost perfect" (#0B132B @ 0.08, moon 3.5), keyed by hour, the witching
// hour a notch darker. weather-core reads ambientAt/fogAt every 2 s when DP.on; off = the pre-lock-in behaviour (no ambient driver).
// The moon: see MOONLIGHT at the foot (creator approved 2026-10-04, weather-aware).
// Lamps: one definition of "lamps should be lit" for every driver (lamp manager, lamplight sites, yard torches): lampsWanted(night),
// read from the same daylight curve weather-core already computes, so sunset, dusk and lamps never disagree.
export const DP = {
  on: true,
  lampsOnAbove: 0.45,   // night (1 - daylight) at which the lamps light at dusk...
  lampsOffBelow: 0.35,  // ...and the level they are doused under at dawn (a band, so a held hour at the edge never flutters)
  stagger: 90,          // seconds: each lamp lights hash(id) % stagger after dusk, so the village lights one by one
  ambientStep: 0.02,    // ambient intensity is written rounded to 2% of its own value (0.002 under 0.1): no banding in the dark
};
// [hour, colour, ambient intensity, fog multiplier]: lerped between neighbours, wrapping at 24.
export const KEYS = [
  [0,     '#0b132b', 0.025, 0.32], // midnight
  [2,     '#070c1c', 0.015, 0.28], // witching hour, the darkest
  [3.5,   '#0b132b', 0.02,  0.30], // small hours
  [5,     '#2d4059', 0.18,  0.40], // dawn
  [6,     '#ffc99a', 0.55,  0.60], // sunrise
  [6.75,  '#fff4d1', 1.0,   1.00], // morning
  [12,    '#fff4d1', 1.2,   1.00], // noon
  [16.5,  '#fff4d1', 1.2,   1.00], // afternoon
  [17.25, '#ffd3a1', 0.85,  0.70], // golden hour: warm gold, not red (the sun already reddens it)
  [18.5,  '#d9a184', 0.38,  0.45], // sunset / dusk: rose dusk
  [19.4,  '#1b2a4a', 0.14,  0.35], // blue hour
  [20.4,  '#0b132b', 0.03,  0.32], // evening
];
export const PARTS = [ // the 17 names the creator gave, for the HUD clock
  [0, 'Midnight'], [1, 'Witching hour'], [3, 'Small hours'], [5, 'Dawn'], [5.75, 'First light'], [6, 'Sunrise'], [6.5, 'Morning'],
  [9, 'Forenoon'], [11.5, 'Noon'], [12.5, 'Afternoon'], [15, 'Late afternoon'], [16.5, 'Golden hour'], [18, 'Sunset'], [18.5, 'Dusk'],
  [19, 'Blue hour'], [19.75, 'Evening'], [21, 'Night'],
];
const mod = (n, d) => ((n % d) + d) % d;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function span(hour) {
  const h = mod(hour, 24);
  let i = KEYS.length - 1; for (let k = 0; k < KEYS.length; k++) if (KEYS[k][0] <= h) i = k;
  const a = KEYS[i], b = KEYS[(i + 1) % KEYS.length], len = mod(b[0] - a[0], 24) || 24, t = mod(h - a[0], 24) / len;
  const u = t * t * (3 - 2 * t); // smoothstep: no kink at a key
  return { a, b, u };
}
export function ambientAt(hour) {
  const { a, b, u } = span(hour), ca = rgb(a[1]), cb = rgb(b[1]);
  const raw = a[2] + (b[2] - a[2]) * u;
  const q = raw < 0.1 ? Math.round(raw / 0.002) * 0.002 : Math.round(raw * 1000) / 1000;
  const step = raw < 0.1 ? q : Math.exp(Math.round(Math.log(raw) / Math.log1p(DP.ambientStep)) * Math.log1p(DP.ambientStep));
  return { color: hex(ca.map((v, k) => v + (cb[k] - v) * u)), intensity: Math.round(step * 10000) / 10000 };
}
export function fogAt(hour) { const { a, b, u } = span(hour); return Math.round((a[3] + (b[3] - a[3]) * u) * 100) / 100; }
export function partAt(hour) { const h = mod(hour, 24); let n = PARTS[0][1]; for (const [from, name] of PARTS) if (from <= h) n = name; return n; }
// level, with a band: was = the lamps' last state
export function lampsWanted(night, was) { return was ? night > DP.lampsOffBelow : night >= DP.lampsOnAbove; }
export function lampDelay(id) { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % (DP.stagger * 10)) / 10; }

// MOONLIGHT (creator 2026-10-04: "as long as the cool blue moonlight realistically adapts to the clouds and weather system").
// clear = how much sky the moon shines through: cloud cover, rain and mist each take their share. night = 0 by day, 1 after the blue hour.
// weather-core blends the night ambient toward MOON.tint by MOON.lift*clear and sets the moon's own intensity between dim and bright.
// creator 2026-10-04: "reduce the moonlight blue glow by at least 50%": lift .13->.055, dim .8->.35, bright 7->3, blue blend .85->.45 (was the old values)
export const MOON = { tint: '#46628f', lift: 0.011, dim: 0.07, bright: 0.6, /* Oct 5 forge: moon wash 'at 20% impact not 100%' = 20% of lift .055 dim .35 bright 3 */ // Oct 5: the halving (1.5) was reverted the same night: forge: "you had it perfect"
  blend: 0.45, cloudCut: 0.85, rainCut: 0.75, mistCut: 0.5 };
export function moonClear(cloud, rain, mist) {
  const c = Math.max(0, Math.min(1, cloud ?? 0)), r = Math.max(0, Math.min(1, rain ?? 0)), m = Math.max(0, Math.min(1, mist ?? 0));
  return (1 - MOON.cloudCut * c * c * (3 - 2 * c)) * (1 - MOON.rainCut * r) * (1 - MOON.mistCut * m);
}
export function nightAt(hour) { // 0 by day, eases to 1 through the blue hour, back to 0 through dawn
  const h = mod(hour, 24), ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return h >= 12 ? ss(18.6, 20.2, h) : 1 - ss(4.2, 5.6, h);
}
export function moonlit(am, hour, clear) { // the hour's ambient, lifted toward cool moonlight by how clear the night sky is
  const k = nightAt(hour) * clear; if (k <= 0) return am;
  const a = rgb(am.color), b = rgb(MOON.tint), w = Math.min(1, k * MOON.blend);
  const i = am.intensity + MOON.lift * k;
  return { color: hex(a.map((v, j) => v + (b[j] - v) * w)), intensity: Math.round(i * 1000) / 1000 };
}
export function moonIntensity(hour, clear) { return Math.round((MOON.dim + (MOON.bright - MOON.dim) * clear) * (0.4 + 0.6 * nightAt(hour)) * 10) / 10; }

// STARS (creator 2026-10-04 "yes"): the milky way and star brightness ride the same clear sky as the moon; gone by day and under cloud.
export const STARS = { milkyWay: 0.85, bright: 1.35, dim: 0.2, density: 0.6 };
export function starsAt(hour, clear) { const k = nightAt(hour) * clear * clear;
  return { milkyWay: Math.round(STARS.milkyWay * k * 20) / 20, brightness: Math.round((STARS.dim + (STARS.bright - STARS.dim) * k) * 20) / 20 }; }
