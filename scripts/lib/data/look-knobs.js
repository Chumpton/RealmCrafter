// The editor's Post tab (creator 2026-10-09): every knob the den's look exposes, its range and where it lives.
// at: 'p' = places/<p>/config.yaml atmosphere.look.params (read by scripts/look-den.js), 'fog' = atmosphere.fog.
// def = the look as it stood on the morning of Oct 9 (the creator's chosen baseline): a knob at def changes nothing.
export const KNOBS = [
  { g: 'Ink outlines', k: 'inkPx', n: 'Outline thickness', min: 0, max: 4, step: 0.25, def: 2, u: 'px' },
  { g: 'Ink outlines', k: 'inkStrength', n: 'Ink darkness', min: 0, max: 1.5, step: 0.05, def: 0.95 },
  { g: 'Ink outlines', k: 'inkFar', n: 'Depth falloff (fades by)', min: 40, max: 600, step: 10, def: 140, u: 'm' },
  { g: 'Ink outlines', k: 'creaseLo', n: 'Crease threshold', min: 0.1, max: 0.9, step: 0.05, def: 0.35 },
  { g: 'Shading', k: 'posterK', n: 'Cel steps strength', min: 0, max: 1, step: 0.05, def: 0 },
  { g: 'Shading', k: 'celSteps', n: 'Cel steps / bands', min: 1, max: 6, step: 1, def: 3 },
  { g: 'Shading', k: 'celK', n: 'Painted bands', min: 0, max: 1, step: 0.05, def: 0.3 },
  { g: 'Shading', k: 'sunsetK', n: 'Warm key / cool shadow', min: 0, max: 1.5, step: 0.05, def: 1 },
  { g: 'Shading', k: 'glintK', n: 'Sun rim / glint', min: 0, max: 1, step: 0.05, def: 0.35 },
  { g: 'Ambient occlusion', k: 'aoK', n: 'Contact darkness', min: 0, max: 1, step: 0.05, def: 0.72 },
  { g: 'Ambient occlusion', k: 'aoR', n: 'Contact radius', min: 0.004, max: 0.04, step: 0.002, def: 0.012 },
  { g: 'Atmosphere', k: 'fogNearX', n: 'Fog start ×', min: 0.25, max: 5, step: 0.05, def: 1 },
  { g: 'Atmosphere', k: 'fogFarX', n: 'Fog end ×', min: 0.25, max: 5, step: 0.05, def: 1 },
  { g: 'Atmosphere', k: 'aerialK', n: 'Far haze (aerial)', min: 0, max: 1, step: 0.05, def: 0.42 },
  { g: 'Atmosphere', k: 'mistK', n: 'Low warm mist', min: 0, max: 0.5, step: 0.02, def: 0.14 },
  { g: 'Atmosphere', k: 'bloomUser', n: 'Bloom', min: 0, max: 1.5, step: 0.05, def: 0.22 },
  { g: 'Atmosphere', k: 'bloomThrUser', n: 'Bloom threshold', min: 0.5, max: 1.5, step: 0.05, def: 1 },
  { g: 'Tone', k: 'exposure', n: 'Exposure', min: 0.6, max: 1.6, step: 0.01, def: 1.05 },
  { g: 'Tone', k: 'daySat', n: 'Saturation', min: 0.4, max: 1.4, step: 0.01, def: 1 },
  { g: 'Tone', k: 'contrast', n: 'Contrast', min: 0.8, max: 1.5, step: 0.01, def: 1.14 },
];
export const TINT_DEF = [0.74, 0.86, 1.16]; // shR/shG/shB: the colour unlit faces lean toward
// one-click looks; every knob not named stays at def. Restrained on saturation (creator Oct 9: "wayyy too saturated")
export const PRESETS = {
  buddha: { n: 'Buddha (your ref)', v: { inkPx: 2.5, inkStrength: 1.15, inkFar: 260, creaseLo: 0.3, posterK: 0.15, celSteps: 3, celK: 0.3, sunsetK: 1.15, glintK: 0.45, aoK: 0.75, fogNearX: 2.6, fogFarX: 2.6, aerialK: 0.2, mistK: 0.03, bloomUser: 0.3, bloomThrUser: 0.9, exposure: 1.1, daySat: 0.96, contrast: 1.14 }, tint: [0.76, 0.84, 1.18] },
  bl: { n: 'Borderlands × WoW', v: { inkPx: 3, inkStrength: 1.25, inkFar: 520, creaseLo: 0.2, posterK: 0.85, celSteps: 3, celK: 0.6, sunsetK: 1.3, glintK: 1, aoK: 0.85, aoR: 0.008, fogNearX: 3.2, fogFarX: 3, aerialK: 0.15, mistK: 0.08, bloomUser: 0.35, exposure: 1.15, daySat: 1.2, contrast: 1.35 }, tint: [0.9, 0.72, 1.28] }, // creator 2026-10-09 griffin/Buddha reference
  den: { n: 'Den (this morning)', v: {}, tint: TINT_DEF },
  ghibli: { n: 'Studio Ghibli', v: { inkPx: 1.5, inkStrength: 0.7, inkFar: 220, posterK: 0.35, celSteps: 3, celK: 0.2, sunsetK: 0.7, glintK: 0.2, aoK: 0.5, fogNearX: 1.4, fogFarX: 1.2, aerialK: 0.5, mistK: 0.08, bloomUser: 0.4, exposure: 1.1, daySat: 0.98, contrast: 1.06 }, tint: [0.8, 0.88, 1.12] },
  comic: { n: 'Classic Comic', v: { inkPx: 3, inkStrength: 1.2, inkFar: 260, creaseLo: 0.25, posterK: 0.8, celSteps: 2, celK: 0.4, sunsetK: 0.5, glintK: 0.2, aoK: 0.8, aerialK: 0.25, bloomUser: 0.2, daySat: 0.95, contrast: 1.25 }, tint: [0.72, 0.8, 1.2] },
  golden: { n: 'Golden Hour Realism', v: { inkPx: 1, inkStrength: 0.35, posterK: 0, celK: 0, sunsetK: 1.2, glintK: 0.45, aoK: 0.9, aoR: 0.02, fogNearX: 0.8, fogFarX: 0.9, aerialK: 0.5, mistK: 0.2, bloomUser: 0.5, bloomThrUser: 0.85, daySat: 0.95, contrast: 1.1 }, tint: [0.78, 0.84, 1.1] },
};
// the knobs as the place holds them now (atmosphere = ctx.place.atmosphere)
export function readLook(a) {
  a = a ?? {}; const p = a.look?.params ?? {}, f = a.fog ?? {}, v = {};
  for (const k of KNOBS) v[k.k] = (k.at === 'fog' ? f[k.k] : p[k.k]) ?? k.def;
  v.shR = p.shR ?? TINT_DEF[0]; v.shG = p.shG ?? TINT_DEF[1]; v.shB = p.shB ?? TINT_DEF[2];
  return v;
}
