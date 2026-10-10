// The den's light (copied from @camptons_world/the-first-den, 2026-10-05): soft 3-band cel steps under one warm amber
// sun and a cool periwinkle bounce, so every faceted face reads in two colours, lit and shade. Plants (green-dominant
// albedo) let the sun bleed through from behind, and inside the canopy's shadow small puddles of sun break through (dappling).
// Forge's physically-based model lives in this file's history (version 10124).
// Oct 5 (forge: "very dark outside but the light sources still doing their job"): the cel look is the SKY's alone.
//  - the sky light (the one arriving along sunDirection: sun by day, moon by night) takes the bands; amber, dapples and
//    leaf glow only while it is a warm sun (dayK);
//  - every placed light (torch, lantern, hearth, forge) keeps the smooth physical pool it had: Lambert x its own fire
//    colour x its own shadow, no bands, no amber, no dapples leaking through its shadow;
//  - after dark the periwinkle lift on the ambient fades out, so the ground between pools stays black.
import { dot, max, mix, normalize, pow, clamp, float, vec3, oneMinus, floor, fract, smoothstep, mx_noise_float, PI } from "builtin/tsl";
import { sunDirection, sunRadiance } from "builtin/lighting";

const SUN_TINT = vec3(1.08, 0.98, 0.82);   // pale amber key
const SHADE_TINT = vec3(0.70, 0.83, 1.26); // Oct 6 (campton, punch brief): deeper slate-blue fill (was 0.78, 0.86, 1.18)
const TERM = vec3(1.0, 0.55, 0.22);        // amber bounce on the terminator, where light meets shadow
const BANDS = 3;
const RIM = vec3(1.0, 0.72, 0.38);         // golden rim

// Oct 6 (campton, punch brief "two-tone cel/ramp"): lit or shadow, a hard step at N.L 0.4-0.45, plus a small top band so a
// face square to the sun still reads hotter. Was three feathered bands (cel3 below, kept).
function cel(x) { return smoothstep(0.4, 0.45, x).mul(0.84).add(smoothstep(0.78, 0.82, x).mul(0.16)); }
function cel3(x) { const s = x.mul(BANDS); return floor(s).add(smoothstep(0.2, 0.8, fract(s))).div(BANDS); }

// Oct 5 (forge: "not even close to where it was"): the night is the exact model he approved (seq 9598, Cook-Torrance GGX +
// Lambert, slate shade). By day the cel look; through dusk the two blend on dayK (the sky light's warmth).
// One pass over the lights carries both and mixes per light: the same picture as mixing two sums (it is linear), at
// half the loop cost (forge's frame sat at budget).
const SLATE = vec3(0.86, 0.95, 1.12);
function ggx(N, V, L, H, albedo, roughness, metalness, f0) { // forge's night model, line for line
  const NdotL = max(dot(N, L), 0);
  const NdotV = max(dot(N, V), 1e-4);
  const NdotH = max(dot(N, H), 0);
  const a = roughness.mul(roughness);
  const a2 = a.mul(a);
  const d = NdotH.mul(NdotH).mul(a2.sub(1)).add(1);
  const D = a2.div(max(PI.mul(d).mul(d), 1e-6));
  const r = roughness.add(1);
  const k = r.mul(r).div(8);
  const G = NdotV.div(NdotV.mul(oneMinus(k)).add(k)).mul(NdotL.div(NdotL.mul(oneMinus(k)).add(k)));
  const F = f0.add(oneMinus(f0).mul(pow(clamp(oneMinus(max(dot(H, V), 0)), 0, 1), 5)));
  const specular = D.mul(G).mul(F).div(max(float(4).mul(NdotV).mul(NdotL), 1e-4));
  const diffuse = oneMinus(F).mul(oneMinus(metalness)).mul(albedo).div(PI);
  return diffuse.add(specular).mul(NdotL);
}

export function lighting(surface, lights) {
  const { albedo, normal: N, view: V, roughness, metalness, position: P } = surface;
  const leafy = clamp(albedo.y.sub(max(albedo.x, albedo.z)).mul(6), 0, 1); // how much this surface is plant
  // day: the sky light is warm (a sun, dusk's orange too); the moon and a sunless sky read 0
  const sl = dot(sunRadiance, vec3(0.2126, 0.7152, 0.0722));
  // Oct 5 NIGHTFIX: also gated on the sun's height, so a warm-ish moon or a lingering dusk radiance can never switch the
  // cel/amber look on below the horizon: sun down = dayK 0 = exactly forge's 9598 GGX + Lambert + slate, torches untouched.
  const dayK = smoothstep(0.02, 0.15, sunRadiance.x.sub(sunRadiance.z).div(sl.add(0.001))).mul(smoothstep(0.02, 0.2, sl))
    .mul(smoothstep(-0.02, 0.08, sunDirection.y));
  // dapples: sun puddles that survive inside shadow, a 1.6 m noise field, hard-edged like light through leaves
  const dap = smoothstep(0.35, 0.5, mx_noise_float(vec3(P.x.mul(0.6), P.y.mul(0.3), P.z.mul(0.6)))).mul(dayK);
  const diffAlb = albedo.mul(oneMinus(metalness)).div(Math.PI);
  const shine = oneMinus(roughness);
  const f0 = mix(vec3(0.04), albedo, metalness);

  const direct = lights.each((light) => {
    const L = light.direction;
    const H = normalize(V.add(L));
    const ndl = max(dot(N, L), 0);
    const nightC = ggx(N, V, L, H, albedo, roughness, metalness, f0).mul(light.radiance);
    const sky = smoothstep(0.9990, 0.9998, dot(L, sunDirection)); // 1 = the sun/moon, 0 = a placed light
    const spec = pow(max(dot(N, H), 0), float(8).add(shine.mul(56))).mul(shine.mul(0.25));
    // Oct 6 (punch brief): a hot, hard-edged glint where a stone lip or shingle catches the low sun (sky light only)
    const glint = smoothstep(0.86, 0.9, pow(max(dot(N, H), 0), float(18).add(shine.mul(40)))).mul(shine.mul(0.5).add(0.12)).mul(smoothstep(0.3, 0.6, ndl));
    // the terminator: a narrow amber band just inside the lit edge, and along the soft rim of a cast shadow
    const term = smoothstep(0.22, 0.4, ndl).mul(smoothstep(0.52, 0.42, ndl)).mul(light.shadow).add(light.shadow.mul(oneMinus(light.shadow)).mul(2.4).mul(smoothstep(0.42, 0.5, ndl))).mul(0.32);
    // the sky: cel bands, amber by day, dapples, leaf glow
    const lit = max(light.shadow, dap.mul(0.55).mul(smoothstep(0.2, 0.6, N.y)));
    const back = pow(max(dot(V, L.negate()), 0), 3).mul(leafy).mul(0.45).mul(light.shadow.mul(0.6).add(0.4)).mul(dayK);
    const through = albedo.mul(vec3(1.25, 1.15, 0.55)).mul(back).div(Math.PI);
    // Oct 6 (campton: "warm golden rim lighting along roof peaks and character edges"): a warm sun rim on grazing edges
    const rim = pow(oneMinus(max(dot(N, V), 0)), 4).mul(ndl.mul(0.7).add(0.12)).mul(light.shadow).mul(dayK).mul(0.42);
    const skyC = diffAlb.mul(cel(ndl)).add(diffAlb.mul(TERM).mul(term).mul(dayK)).add(spec).add(vec3(1.0, 0.8, 0.5).mul(glint).mul(dayK)).add(through).add(RIM.mul(rim)).mul(light.color).mul(mix(vec3(1), SUN_TINT, dayK)).mul(lit);
    // a fire: the smooth pool, its own colour, its own shadow
    const fireC = diffAlb.mul(ndl).add(spec.mul(ndl)).mul(light.radiance);
    return mix(nightC, mix(fireC, skyC, sky), dayK);
  });

  const shade = mix(SLATE, SHADE_TINT, dayK); // night: forge's slate; day: the periwinkle
  const base = albedo.mul(oneMinus(metalness)).add(f0).mul(lights.ambient).mul(1 / Math.PI);
  return direct.add(base.add(lights.environment).mul(shade).mul(surface.occlusion));
}
