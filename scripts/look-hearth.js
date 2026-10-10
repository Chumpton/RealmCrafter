import { grade, vignette, grain } from 'builtin/postfx';
import { ART } from './lib/data/art-palette.js';
import { vec2, vec4, cameraProjectionMatrix, cameraViewMatrix, vec3, float, screenUV, cameraPosition, smoothstep, mix, mx_noise_float, If, dot, floor, fract, max, reflect, abs } from 'builtin/tsl';
import { sunDirection, sunRadiance, windTravel } from 'builtin/lighting';
import { SHADE } from './lib/data/cloud-shadow.js';
import { SNOW } from './lib/data/snow.js';
import { HALL } from './lib/data/longhouse.js';
// The den's outdoor grade (the painted-texel look): teal shadows with crushed blacks, cream highlights, rich colour.
// Inside the hall each player's screen swaps to look-hall.js (sky-local.js). Per-pixel ops only — phone-safe.
// The shader is built once from the palette: after changing art-palette.js, touch this file (and look-hall.js) so
// open screens rebuild it. (S2 snow cover: SNOW.look)
const G = ART.grade.outdoor;
// o.exposure: look-den.js hands in the night's own base exposure (forge's approved 1.12, 9598) since the shared
// 'exposure' param now carries the cel day's 1.05. Called bare, this is the 9598 look unchanged.
export function look(ctx, o = {}) {
  ctx.param('bloomStrength', ART.bloom.strength); ctx.param('bloomRadius', ART.bloom.radius); ctx.param('bloomThreshold', ART.bloom.threshold);
  // W22: cloud shadows. The ground point, slid up the sun's ray to the cloud height, reads a two-octave cloud field that
  // rolls with the grass's wind; cover sets how much of it is shade, csK how dark (0 at night and under a full lid).
  let lit = ctx.scene;
  { // every tier: the low tier reads one octave
    const P = ctx.worldPosition(screenUV), d = P.sub(cameraPosition).length();
    const sy = sunDirection.y.max(0.22), up = float(SHADE.height).sub(P.y).max(0);
    const q = P.xz.add(sunDirection.xz.div(sy).mul(up)).sub(windTravel).div(ctx.param('csScale', 300));
    const seed = ctx.param('csSeed', 0).mul(0.37);
    const n0 = mx_noise_float(vec3(q.x, q.y, seed));
    const n = ctx.quality === 'low' ? n0 : n0.mul(0.68).add(mx_noise_float(vec3(q.x.mul(2.3), q.y.mul(2.3), seed.add(5))).mul(0.32));
    const thr = mix(float(0.62), float(-0.62), ctx.param('csCover', 0)), soft = ctx.param('csSoft', 0.1);
    const shade = smoothstep(thr.sub(soft), thr.add(soft), n).mul(ctx.param('csK', 0)).mul(float(1).sub(smoothstep(1800, 3000, d)));
    lit = ctx.scene.mul(mix(vec3(1), vec3(0.8, 0.86, 0.98), shade.mul(1.6).min(1)).mul(float(1).sub(shade.mul(0.55))));
  }
  lit = snowCover(ctx, lit);
  lit = muteGreens(lit);
  lit = sunShafts(ctx, lit);
  // LIGHT V2 phase 2 (2026-10-05): the measured culprit for "autofill lights very dark": the day grade's red lift (-0.05) and 1.24
  // contrast took a firelit ground from luma 24 to 4 (81% black). After dark the lift fades to zero and contrast eases to 1.06:
  // black still maps to black (no lift), so the night stays dark between pools while the pools themselves keep their light.
  const nightG = ctx.param('nightK', 0), dayG = float(1).sub(nightG);
  const c = grade(lit, {
    // W21: the twilight mood (weather-core -> twilight-core) nudges exposure, saturation and warmth at dusk and dawn
    exposure: (o.exposure ?? ctx.param('exposure', 1.03)).add(ctx.param('twExp', 0)).mul(mix(float(1), float(2.0), nightG)), saturation: ctx.param('twSat', 0).add(G.saturation), contrast: mix(float(1.06), float(G.contrast), dayG), temperature: ctx.param('twTemp', 0).add(G.temperature),
    lift: vec3(...G.lift).mul(dayG), gamma: G.gamma, gain: G.gain
  });
  // phase 2 (Oct 5): the warm pool also takes x1.3, night exposure x2 (nightK from weather-core: sunDirection never went below 0 after dark, so the old night terms never fired) (firelit pixels only: moonlit and black ones untouched) and the vignette eases
  // to 55% at night, since the frame read 17 -> 3 on a lit village gate.
  // LIGHT V2 #6: after dark, a pixel whose light is warm is firelight: ease the teal off it so the pool reads orange.
  // Multiplicative, so black stays black; daytime (sun up) untouched.
  const night = nightG, Lw = dot(lit, vec3(0.2126, 0.7152, 0.0722));
  const warm = smoothstep(0.08, 0.45, lit.x.sub(lit.z).div(Lw.add(0.02))).mul(smoothstep(0.004, 0.05, Lw)).mul(night);
  // W8 (Oct 5, creator "yes fix them"): on the autumn leaf floor the x2 exposure x1.3 pool burned neon orange. Inside the pool,
  // pull 30% of the chroma back toward its own luminance before the warm tint: same brightness, firelight not paint.
  const cl = dot(c, vec3(0.2126, 0.7152, 0.0722)), cTame = mix(vec3(cl), c, 0.7);
  const cw = wetGlint(ctx, mix(c, cTame.mul(vec3(1.14, 1.0, 0.84)).mul(1.3), warm), smoothstep(0.012, 0.1, Lw).mul(night));
  return grain(vignette(cw, ctx.param('vignette', G.vignette).mul(mix(float(1), float(0.55), nightG)), { color: G.vignetteColor, feather: 0.5 }), G.grain);
}

// LIGHT V2 #7: after rain, wet ground. Up-facing surfaces darken a little (wet soil), and inside a warm pool the puddles
// (a slow noise mask) mirror the fire: the pool's own colour lifted, strongest at grazing view. Skipped whole while dry.
export function wetGlint(ctx, c, warm) { // warm here = how firelit the pixel is (night luminance: the moon is too dim to count)
  const wet = ctx.param('wetG', 0), out = vec3(c).toVar();
  If(wet.greaterThan(0.05), () => {
    const P = ctx.worldPosition(screenUV), N = ctx.normal(screenUV), dist = P.sub(cameraPosition).length();
    const near = float(1).sub(smoothstep(60, 120, dist));
    const up = smoothstep(0.75, 0.95, N.y).mul(near);
    const pud = smoothstep(0.1, 0.35, mx_noise_float(P.xz.mul(0.35)).mul(0.7).add(mx_noise_float(P.xz.mul(1.6)).mul(0.3))).mul(wet);
    const V = cameraPosition.sub(P).normalize(), fres = float(1).sub(max(V.y, 0)).pow(3).mul(0.8).add(0.2);
    // WX-FILTER S3 (Oct 7): walls, posts and bodies (any steep face, screen-space so nothing is tagged) darken in streaks that
    // run downward: noise stretched tall along y. Rain soaks what it hits from the side, not only the tops.
    const vert = float(1).sub(smoothstep(0.3, 0.6, abs(N.y))).mul(near);
    const streak = smoothstep(0.25, 0.7, mx_noise_float(vec3(P.x.mul(2.2), P.y.mul(0.18), P.z.mul(2.2))).mul(0.5).add(0.5));
    const dimmed = c.mul(float(1).sub(up.mul(wet).mul(0.18))).mul(float(1).sub(vert.mul(wet).mul(streak.mul(0.16).add(0.07))));
    // by day (nightK 0): the wet tops mirror a pale cool sky, strongest at grazing view and in the puddles, and the sun
    // glints off them. Night keeps forge's firelit pool glint below, unchanged.
    const dayK = float(1).sub(ctx.param('nightK', 0));
    const Ld = dot(c, vec3(0.2126, 0.7152, 0.0722));
    const sky = vec3(0.7, 0.78, 0.88).mul(Ld.mul(0.6).add(0.25));
    const sheen = up.mul(fres).mul(pud.mul(0.75).add(wet.mul(0.25))).mul(dayK).mul(0.55);
    let lit = mix(dimmed, sky, sheen.min(0.6));
    if (ctx.quality !== 'low') {
      const sg = max(dot(reflect(V.negate(), N), sunDirection), 0).pow(60).mul(up).mul(pud).mul(dayK).mul(smoothstep(0.02, 0.2, sunDirection.y));
      lit = lit.add(sunRadiance.mul(vec3(1.0, 0.92, 0.8)).mul(sg).mul(0.6));
    }
    out.assign(lit.add(vec3(1.0, 0.62, 0.3).mul(dimmed.x.add(0.02)).mul(up.mul(pud).mul(warm).mul(fres).mul(2.2))));
  });
  return out;
}

// S2: snow cover. One term: cover = smoothstep on the surface's up-facing (leaned by the lee of place.state.wind) x depth
// x (1 - shelter). The whole branch is skipped while snDepth is 0 (snow off = today's picture, bit for bit).
// Wet snow greys and takes a sun glint; powder is brighter with a faint near sparkle; melt lifts the cover edge so
// steep faces and thin edges go first. Shelter = the hall's roof footprint below its turf (inside, the eaves' drip line).
const SL = SNOW.look, HO = HALL.outer, YE = HALL.floorY + HALL.eaveH, TURF = 0.42;
const RZ = (HO.z0 + HO.z1) / 2, HS = (HO.z1 - HO.z0) / 2, SLOPE = (HALL.floorY + HALL.ridgeH - TURF - YE) / HS;
export function snowCover(ctx, lit) {
  const snD = ctx.param('snDepth', 0), out = vec3(lit).toVar();
  If(snD.greaterThan(0.001), () => {
    const P = ctx.worldPosition(screenUV), N = ctx.normal(screenUV), dist = P.sub(cameraPosition).length();
    const wet = ctx.param('snWet', 0), pow_ = ctx.param('snPow', 0), melt = ctx.param('snMelt', 0);
    const thick = smoothstep(0, SL.fullM, snD).mul(float(1).sub(melt.mul(0.4)));
    // lee: faces turned downwind hold more, windward faces scour
    const ny = N.y.add(N.x.mul(ctx.param('snWx', 0)).add(N.z.mul(ctx.param('snWz', 0))).mul(SL.lee));
    const lo = float(SL.edge).add(melt.mul(SL.meltEdge)).sub(thick.mul(0.12));
    const face = smoothstep(lo, lo.add(SL.soft), ny);
    const n = mx_noise_float(P.mul(0.55)).mul(0.6).add(mx_noise_float(P.mul(2.3)).mul(0.4)).mul(0.5).add(0.5);
    const patch = smoothstep(float(1).sub(thick.mul(1.2)), float(1.15).sub(thick.mul(1.2)), n);
    // shelter: inside the roof's footprint and under the turf's top surface
    const d = abs(P.z.sub(RZ)), o = SL.shelter.over;
    const inX = smoothstep(HO.x0 - o - 0.3, HO.x0 - o, P.x).mul(float(1).sub(smoothstep(HO.x1 + o, HO.x1 + o + 0.3, P.x)));
    const inZ = float(1).sub(smoothstep(HS + o, HS + o + 0.3, d));
    const under = float(1).sub(step01(P.y.sub(float(YE).add(float(HS).sub(d).mul(SLOPE)).add(SL.shelter.lip))));
    const open = float(1).sub(inX.mul(inZ).mul(under));
    const keep = smoothstep(SL.water, SL.water + 0.3, P.y).mul(float(1).sub(smoothstep(SL.farM * 0.8, SL.farM, dist)));
    const amt = face.mul(patch).mul(open).mul(keep).mul(smoothstep(0.001, 0.03, snD));
    // the snow's own light: the frame's luminance at this pixel, lifted to a white albedo; shade goes blue
    const Lm = dot(lit, vec3(0.2126, 0.7152, 0.0722));
    const ill = Lm.mul(SL.lift).min(1.08);
    let col = mix(vec3(...SL.shade), vec3(...SL.lit), smoothstep(0.12, 0.7, Lm)).mul(ill);
    col = mix(col, col.mul(vec3(...SL.wetTint)).mul(SL.wetDim).div(0.8), wet);
    const V = cameraPosition.sub(P).normalize();
    const glint = max(dot(reflect(V.negate(), N), sunDirection), 0).pow(36).mul(wet).mul(SL.gloss).mul(smoothstep(0.25, 0.6, Lm));
    const cell = floor(P.mul(SL.sparkleCell)).add(floor(cameraPosition.mul(2)));
    const h = fract(dot(cell, vec3(12.9898, 78.233, 37.719)).sin().mul(43758.5453));
    const spark = smoothstep(0.985, 0.998, h).mul(pow_).mul(SL.sparkle).mul(smoothstep(0.35, 0.65, Lm))
      .mul(float(1).sub(smoothstep(SL.sparkleNear * 0.5, SL.sparkleNear, dist)));
    out.assign(mix(lit, col.add(glint).add(spark), amt));
  });
  return out;
}
const step01 = (x) => smoothstep(-0.02, 0.02, x);

// Valheim pass: lush greens drained toward moss and olive (grass, leaves, needles), everything else untouched.
function muteGreens(c) {
  const L = dot(c, vec3(0.2126, 0.7152, 0.0722));
  const g = smoothstep(0.0, 0.07, c.y.sub(c.x.max(c.z)));
  return mix(c, mix(c, vec3(L), G.greenMute).mul(vec3(...G.greenShift)), g);
}
// Crepuscular rays: the open sky behind the pines, smeared toward the sun at quarter resolution (high and ultra).
// The 'shafts' target is declared once per look build (target names are unique per look): look-den.js's day grade and
// this night grade share the one ray term through shaftLight(ctx).
const RAYS = new WeakMap();
export function shaftLight(ctx) {
  if (ctx.quality !== 'high' && ctx.quality !== 'ultra') return null;
  if (RAYS.has(ctx)) return RAYS.get(ctx);
  const S = G.shafts, t = ctx.target('shafts', { scale: 0.25 });
  const s4 = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(sunDirection, 0)));
  const sunUv = s4.xy.div(s4.w.max(0.001)).mul(vec2(0.5, -0.5)).add(0.5);
  const rays = ctx.pass(t, (uv) => {
    const stepUv = sunUv.sub(uv).div(S.samples);
    let acc = float(0);
    for (let i = 0; i < S.samples; i++) {
      const p = uv.add(stepUv.mul(i));
      acc = acc.add(smoothstep(2500, 4500, ctx.viewZAt(p).negate()).mul(Math.pow(S.decay, i)));
    }
    const near = float(1).sub(smoothstep(0.05, 0.85, uv.sub(sunUv).length()));
    return vec4(vec3(acc.div(S.samples * 0.5).mul(near)), 1);
  });
  const front = smoothstep(0.0, 0.15, s4.w).mul(smoothstep(0.02, 0.2, sunDirection.y));
  const sky = smoothstep(2500, 4500, ctx.viewZ.negate());
  const r = rays.sample(screenUV).x.mul(front).mul(float(1).sub(sky.mul(0.6)));
  const light = sunRadiance.mul(vec3(1.0, 0.82, 0.55)).mul(r).mul(ctx.param('shafts', S.strength));
  RAYS.set(ctx, light);
  return light;
}
function sunShafts(ctx, c) {
  const l = shaftLight(ctx);
  return l ? c.add(l) : c;
}
