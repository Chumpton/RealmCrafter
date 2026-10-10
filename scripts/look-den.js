// The den's film stock (from @camptons_world/the-first-den, 2026-10-05): warm, a breath of horizon-blue haze on the far
// field, (high/ultra) soft contact shadows where a bush, a post or a foot meets the ground, and 2 px warm-brown ink.
// Kept from Forge's look-hearth.js so this den's weather still reads: cloud shadows, snow cover, and the night pass
// (weather-core's nightK: exposure x2, firelit pools warmed, wet-ground glint). Forge's grade: look-hearth.js.
// 2026-10-09 (campton: "way too saturated, return to the look before we started changing the shaders today"): back to
// seq 20326; the golden-film, comic and Ghibli passes of that afternoon live in this file's history (20329-20376).
import { grade, vignette } from 'builtin/postfx';
import { vec2, vec3, float, screenUV, screenSize, smoothstep, clamp, max, mix, dot, cameraPosition, mx_noise_float, If } from 'builtin/tsl';
import { sunDirection, windTravel } from 'builtin/lighting';
import { SHADE } from './lib/data/cloud-shadow.js';
import { snowCover, wetGlint, shaftLight, look as nightLook } from './look-hearth.js';
const TAPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
function contact(ctx) {
  const z = ctx.viewZ.negate(), r = ctx.param('aoR', 0.012).div(z.max(1).sqrt()); // radius shrinks with distance (Post tab: AO radius)
  let occ = float(0);
  TAPS.forEach(([x, y], i) => {
    const s = (i < 4 ? 1 : 0.55);
    const dz = z.sub(ctx.viewZAt(screenUV.add(vec2(x, y).mul(r).mul(s))).negate()); // >0: the neighbour is nearer
    occ = occ.add(smoothstep(0.05, 0.6, dz).mul(smoothstep(2.0, 0.6, dz)));
  });
  const fade = smoothstep(80, 30, z); // only near ground carries contact
  return float(1).sub(clamp(occ.div(TAPS.length).mul(1.3), 0, 1).mul(ctx.param('aoK', 0.72)).mul(fade)); // Oct 6 punch brief: deeper crevice at every contact (was x0.55)
}
// Ink: a soft dark line where depth steps (silhouettes) or the surface turns (creases), on everything at once, land
// included, in one pass. Thin, warm-dark not black, fading out with distance.
const INK = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function ink(ctx) {
  const px = vec2(1).div(screenSize), zc = ctx.viewZ.negate(), nc = ctx.normal(screenUV);
  let dz = float(0), dn = float(0);
  INK.forEach(([x, y]) => {
    const uv = screenUV.add(vec2(x, y).mul(px));
    dz = max(dz, ctx.viewZAt(screenUV.add(vec2(x, y).mul(px).mul(ctx.param('inkPx', 2)))).negate().sub(zc)); // silhouettes inkPx wide (Post tab)
    dn = max(dn, float(1).sub(ctx.normal(uv).dot(nc)));
  });
  // Oct 6 (campton, punch brief "inverted-hull inking with depth bias"): near structures get comic-book weight: a second
  // silhouette ring at 4 px that fades in under ~35 m, so the foreground inks thick and the distance stays thin and legible
  let dzN = float(0);
  INK.forEach(([x, y]) => { dzN = max(dzN, ctx.viewZAt(screenUV.add(vec2(x, y).mul(px).mul(ctx.param('inkPx', 2).mul(2)))).negate().sub(zc)); });
  const near = smoothstep(38, 10, zc);
  const edge = max(max(smoothstep(0.035, 0.08, dz.div(zc.max(1))), smoothstep(0.035, 0.08, dzN.div(zc.max(1))).mul(near)), smoothstep(ctx.param('creaseLo', 0.35), ctx.param('creaseLo', 0.35).add(0.35), dn).mul(mix(float(0.35), float(0.6), near)));
  return edge.mul(smoothstep(ctx.param('inkFar', 140), 25, zc)).mul(ctx.param('inkStrength', 0.95));
}
// night ink: a line only where there is light to see it by (a fire's pool), warm there; none in the black between pools
function inkAt(ctx, s, nightG) {
  const L = dot(s, vec3(0.2126, 0.7152, 0.0722));
  return ink(ctx).mul(mix(float(1), smoothstep(0.01, 0.08, L), nightG));
}
function cloudShade(ctx, s, moon = false) { // Forge's W22 cloud shadows (csK is 0 at night and under a full lid)
  const P = ctx.worldPosition(screenUV), d = P.sub(cameraPosition).length();
  const sy = sunDirection.y.max(0.22), up = float(SHADE.height).sub(P.y).max(0);
  const q = P.xz.add(sunDirection.xz.div(sy).mul(up)).sub(windTravel).div(ctx.param('csScale', 300));
  const seed = ctx.param('csSeed', 0).mul(0.37);
  const n0 = mx_noise_float(vec3(q.x, q.y, seed));
  const n = ctx.quality === 'low' ? n0 : n0.mul(0.68).add(mx_noise_float(vec3(q.x.mul(2.3), q.y.mul(2.3), seed.add(5))).mul(0.32));
  const thr = mix(float(0.62), float(-0.62), ctx.param('csCover', 0)), soft = ctx.param('csSoft', 0.1);
  const shade = smoothstep(thr.sub(soft), thr.add(soft), n).mul(ctx.param('csK', 0)).mul(float(1).sub(smoothstep(600, 900, d))); // Oct 5 forge: "smoky black pillars" in the sky: the old 1800-3000 m fade let the shade print on sky pixels (far plane), swimming with the camera; fog is solid by 700 m, so it ends at 900
  if (moon) { // Oct 5 forge: the moonwash comes and goes as clouds roll over; only the dim moonlit ground, never a fire's pool
    const L = dot(s, vec3(0.2126, 0.7152, 0.0722)), mk = smoothstep(thr.sub(soft), thr.add(soft), n).mul(ctx.param('csN', 0)).mul(float(1).sub(smoothstep(0.03, 0.1, L)));
    return s.mul(float(1).sub(mk.mul(0.8)));
  }
  return s.mul(mix(vec3(1), vec3(0.8, 0.86, 0.98), shade.mul(1.6).min(1)).mul(float(1).sub(shade.mul(0.55))));
}
function dayLook(ctx) {
  ctx.param('bloomStrength', 0.3); ctx.param('bloomRadius', 0.75); ctx.param('bloomThreshold', 0.85);
  let s = cloudShade(ctx, ctx.scene);
  s = snowCover(ctx, s);
  const nightG = ctx.param('nightK', 0);
  // god rays by day: look-hearth's one 'shafts' target, shared (never a second declare); gone with the day (x dayG)
  const rays = shaftLight(ctx);
  // Oct 6 (campton, sunset brief): crepuscular rays cut through the gaps, streaked by drifting dust/mist (rayK lifts them)
  if (rays) {
    const dust = mx_noise_float(vec3(screenUV.x.mul(7), screenUV.y.mul(3.5), windTravel.x.mul(0.03))).mul(0.45).add(0.8);
    s = s.add(rays.mul(dust).mul(ctx.param('rayK', 2.4)).mul(float(1).sub(nightG)));
  }
  // contact shadows are a daylight read: at night they only ate into the fire pools
  if (ctx.quality === 'high' || ctx.quality === 'ultra') s = s.mul(mix(contact(ctx), float(1), nightG));
  let c = grade(s, { exposure: ctx.param('exposure', 1.05).add(ctx.param('twExp', 0)),
    saturation: ctx.param('twSat', 0).add(ctx.param('daySat', 1.0)), contrast: ctx.param('contrast', 1.14), /* Oct 6 punch brief: was daySat .9, contrast 1.08 */ temperature: ctx.param('twTemp', 0).add(0.0),
    haze: ctx.param('gradeHaze', 0.15).mul(float(1).sub(nightG)), hazeColor: 'oklch(0.84 0.07 55)' });
  // Oct 5 (campton, WoW x Skyrim golden-hour brief): split tone by day: shadows lean purple-navy, highlights golden-orange
  const Ld = dot(c, vec3(0.2126, 0.7152, 0.0722)), dayG = float(1).sub(nightG).mul(ctx.param('splitK', 1));
  // Oct 6 punch brief: split toning pushed: highlights toward #FFB347 gold-amber, shadows toward #2C3E50 navy-indigo (was .92,.88,1.1 / 1.1,1.0,.84)
  const tone = mix(vec3(0.82, 0.9, 1.18), vec3(1.16, 1.0, 0.74), smoothstep(0.05, 0.6, Ld));
  c = mix(c, c.mul(tone), dayG);
  // late fall (campton): a green-dominant pixel loses some of its green toward olive/rust, so lawns and pines read autumn-worn
  const greenX = smoothstep(0.0, 0.25, c.y.sub(c.x.max(c.z)).div(Ld.add(0.02))).mul(dayG).mul(ctx.param('fallK', 0.55));
  c = mix(c, c.mul(vec3(1.1, 0.9, 0.8)), greenX);
  // Oct 5 (campton, inked comic spec): three cel bands by day: shadow (<.35) slate-teal, mid warm earth, highlight (>.7) golden amber.
  // Soft-stepped luminance so faces read as painted bands, not gradients; blended in by celK so the grade stays tunable.
  {
    const L2 = dot(c, vec3(0.2126, 0.7152, 0.0722)), e = 0.04;
    const band = smoothstep(0.18 - e, 0.18 + e, L2).mul(0.5).add(smoothstep(0.5 - e, 0.5 + e, L2).mul(0.5)); // 0, .5, 1
    const tgtL = mix(float(0.1), float(0.46), band), celled = c.mul(tgtL.div(L2.max(0.02)));
    const tint = mix(vec3(0.78, 0.95, 1.08), vec3(1.0, 0.98, 0.94), smoothstep(0.2, 0.5, band)).mul(mix(vec3(1), vec3(1.1, 1.0, 0.8), smoothstep(0.75, 1.0, band)));
    c = mix(c, celled.mul(tint), dayG.mul(ctx.param('celK', 0.3)));
    // warm amber mist pooled low: thicker the lower and farther a pixel stands
    const P = ctx.worldPosition(screenUV), dist = P.sub(cameraPosition).length();
    const mist = smoothstep(66, 44, P.y).mul(smoothstep(60, 400, dist)).mul(dayG).mul(ctx.param('mistK', 0.14));
    c = mix(c, vec3(0.9, 0.63, 0.35), mist);
    // Oct 7 (campton, classic-WoW look brief): aerial perspective: far ridges desaturate and drift toward a soft lavender-blue
    // sky haze so near, mid and far read as layers. The sky itself (far plane) is left alone.
    {
      const far = smoothstep(120, 650, dist).mul(float(1).sub(smoothstep(1800, 2400, dist))).mul(dayG).mul(ctx.param('aerialK', 0.42));
      const Lf = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(c, mix(vec3(Lf), vec3(0.62, 0.68, 0.86), 0.65), far);
    }
    // Oct 6 (campton, sunset brief): amber floods the lit faces, the unlit side drops into cool blue so the orange pops,
    // and the brightest sunlit tops (cobble crowns, roof ridges) glint. sunsetK 0 = the old grade.
    const sk = dayG.mul(ctx.param('sunsetK', 1)), L3 = dot(c, vec3(0.2126, 0.7152, 0.0722));
    const lit = smoothstep(0.16, 0.42, L3);
    c = mix(c, c.mul(vec3(ctx.param('shR', 0.74), ctx.param('shG', 0.86), ctx.param('shB', 1.16))).mul(0.88), float(1).sub(lit).mul(sk).mul(0.85)); // Post tab: shadow tint
    c = mix(c, c.mul(vec3(1.2, 0.98, 0.72)), lit.mul(sk).mul(0.8));
    const glint = smoothstep(0.5, 0.75, L3).mul(sk);
    c = c.add(vec3(1.0, 0.62, 0.26).mul(glint).mul(ctx.param('glintK', 0.35))); // Post tab: sun rim / glint
  }
  // Post tab (creator 2026-10-09): cel steps: luminance quantised into celSteps soft bands, blended by posterK (0 = off)
  {
    const Lq = dot(c, vec3(0.2126, 0.7152, 0.0722)).max(0.002), n = ctx.param('celSteps', 3), q = Lq.mul(n);
    const stepped = q.floor().add(smoothstep(0.42, 0.58, q.fract())).div(n).max(0.04);
    c = mix(c, c.mul(stepped.div(Lq)), dayG.mul(ctx.param('posterK', 0)));
  }
  // night: a warm pixel is firelight; warm it so the pool reads orange (multiplicative: black stays black)
  const Lw = dot(s, vec3(0.2126, 0.7152, 0.0722));
  const warm = smoothstep(0.08, 0.45, s.x.sub(s.z).div(Lw.add(0.02))).mul(smoothstep(0.004, 0.05, Lw)).mul(nightG);
  // Oct 5 (forge: midnight "super bright", torches weaker once black): the night x2 exposure lifted the moonlit/aurora
  // ground with the fires. Now only the firelit pool takes the gain (x2.6, what it had before the cel copy) and the
  // unlit night sits at x0.75, so the dark between pools goes darker and the pools stay strong.
  const nightDim = mix(float(1), float(0.75), nightG);
  const cw = wetGlint(ctx, mix(c.mul(nightDim), c.mul(vec3(1.14, 1.0, 0.84)).mul(2.6), warm), smoothstep(0.012, 0.1, Lw).mul(nightG));
  const inked = cw.mul(mix(vec3(1), mix(vec3(0.32, 0.28, 0.26), vec3(0.42, 0.24, 0.12), nightG), inkAt(ctx, s, nightG))); // multiply: always darker than its surface, never gray
  return vignette(inked, 0.10, { color: '#302e2a' });
}

// Oct 5 (forge: "not even close to where it was"): after dark the frame is look-hearth.js exactly, the night he approved;
// by day this file's cel grade; nightK (weather-core) blends them through dusk.
// Only the look on screen is drawn: each look is built once (a look's targets are unique), then the branch picks it:
// full day the cel grade alone, full night forge's alone, dusk and dawn the blend.
export function look(ctx) {
  // the night is built first so look-hearth's sunShafts declares the one 'shafts' target; dayLook reuses its term
  const k = ctx.param('nightK', 0), night0 = nightLook(ctx, { exposure: ctx.param('nightExposure', 1.12) }), day = dayLook(ctx), night = cloudShade(ctx, night0, true), out = vec3(0).toVar();
  If(k.lessThan(0.001), () => { out.assign(day); })
    .ElseIf(k.greaterThan(0.999), () => { out.assign(night); })
    .Else(() => { out.assign(mix(day, night, k)); });
  return out;
}
