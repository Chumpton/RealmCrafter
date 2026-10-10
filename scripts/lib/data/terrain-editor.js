// TERRAIN EDITOR tables (creator 2026-10-07, the UE5/Unity-grade landscape tool spec). Every tuned number of the editor lives here.
// A stroke is terrain marks (flatten / path / river / lake / hole / clear-scatter) or a scatter bed: the engine's own ground primitives,
// so every edit streams, collides and saves like the hand-authored ground. scripts/terrain-editor.js reads this; ui/hud/terrain-editor.js draws it.
export const TE = {
  radius: { min: 1, max: 60, def: 6, step: 0.5 },      // m
  strength: { min: 0.1, max: 12, def: 1.5, step: 0.1 }, // m per dab (raise/lower/terrace step/noise/water depth)
  falloff: { min: 0, max: 40, def: 4, step: 0.5 },     // m of blend past the radius
  snap: [0, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16],         // m: height snap for flatten / terrace / ramp ends
  dabEvery: 0.6,      // a held brush lays a new dab after moving this many radii…
  dabMs: 380,         // …or after this many ms in place
  maxDabs: 40,        // per stroke, so one held click can never flood the ground with marks
  biomeGrid: 5, biomeMax: 64, // auto-biome samples (m spacing, cap per click)
  gullySteps: 24, gullyStep: 3, // hydraulic erode: steepest-descent trace
  thermalRepose: 0.7, // rise/run above which thermal erode slumps the slope (≈35°)
  folPer100: 4,       // foliage density 1 = this many plants per 100 m²
  folMax: 160,
  curves: [['smooth', 'Smooth · Hermite'], ['linear', 'Linear · Tip'], ['cliff', 'Flat · Box']],
};
// The left shelf: [id, icon, label, group, hint]
export const TOOLS = [
  ['raise', '⛰', 'Raise / Lower', 'sculpt', 'Click or drag. Shift lowers.'],
  ['smooth', '〰', 'Smooth', 'sculpt', 'Levels bumps to the local average.'],
  ['flatten', '▭', 'Flatten', 'sculpt', 'Levels to the sampled height. Ctrl+click samples.'],
  ['ramp', '⟋', 'Ramp', 'sculpt', 'Click start, click end. Graded, with banks.'],
  ['terrace', '☰', 'Terrace', 'sculpt', 'Steps the ground to plateaus, strength = step.'],
  ['erodeH', '💧', 'Hydraulic Erode', 'sculpt', 'Click: water cuts a gully downhill.'],
  ['erodeT', '⛬', 'Thermal Erode', 'sculpt', 'Slumps slopes steeper than the repose angle.'],
  ['noise', '≋', 'Noise', 'sculpt', 'Breaks flat ground into soft hummocks.'],
  ['pinch', '◇', 'Pinch / Expand', 'sculpt', 'Pinch sharpens a peak. Shift widens a plateau.'],
  ['chisel', '⟍', 'Chisel / Crevice', 'sculpt', 'Click start, click end: a cut with hard walls.'],
  ['hole', '◯', 'Hole', 'sculpt', 'Cuts a walk-through hole: cave mouth, shaft.'],
  ['paint', '🖌', 'Splat Paint', 'paint', 'Paints the chosen layer.'],
  ['pathpaint', '🥾', 'Path Paint', 'paint', 'Drag to paint a path in the chosen layer: ragged splatter edges, blends into what is there. Layer 2 = the edge.'],
  ['biome', '🏔', 'Auto-Biome', 'paint', 'Rock on cliffs, grass on flats, sand low, snow high.'],
  ['blend', '◐', 'Splat Blend', 'paint', 'Feathers the layer into what is there.'],
  ['wet', '☂', 'Wetness', 'paint', 'Darkens and wets the ground under the brush.'],
  ['foliage', '🌲', 'Foliage', 'foliage', 'Paints plants. Shift erases.'],
  ['reseed', '↻', 'Reseed', 'foliage', 'Re-drops beds onto the edited ground.'],
  ['river', '〜', 'River', 'water', 'Click points downhill, then Finish.'],
  ['lake', '◍', 'Lake', 'water', 'Click: a lake fills the basin.'],
  ['pondpaint', '🪷', 'Pond Paint', 'water', 'Drag to paint a pond\'s shape: digs a smooth bowl and fills it with still teal water. Radius = brush width, strength = depth.'],
];
export const GROUPS = [['sculpt', '⛰', 'Terrain & Sculpting'], ['paint', '🖌', 'Biome & Splatmap'], ['foliage', '🌲', 'Procedural Foliage'], ['water', '💧', 'Water & Atmosphere'], ['actors', '📦', 'Actors & Props']];
// Splat layers the brush offers: the place's own materials (places/main/config.yaml), with a swatch colour for the slot.
export const LAYERS = [
  ['grass', '#7f9a52'], ['beatenDirt', '#c49a5c'], ['beatenDirtEdge', '#a9844f'], ['fallGrass', '#b39a55'], ['forest', '#5f7a5a'], ['fallFloor', '#b46a3a'], ['wowDirt', '#a07a52'], ['wowDirtRut', '#7a5838'],
  ['soil', '#6e4a30'], ['wowGravel', '#a8a08a'], ['wowCobble', '#9a9284'], ['wowCobbleMoss', '#7d8a68'], ['wowFlagWorn', '#c8bfa6'],
  ['rock', '#8a8a80'], ['mossRock', '#5d7048'], ['mountain', '#8aa0b0'], ['sand', '#d8c08a'], ['shoreline', '#8a7a5c'], ['snow', '#eef2f6'], ['wheat', '#d8b860'],
];
// POND PAINT (Campton 2026-10-10: "make the relevant brush make the pond like you have but able to draw it in"): the home pond's recipe
export const POND = { bowlBelow: 1.65, minDepth: 1.65, waterBelow: 0.35, falloffMin: 3, falloffMax: 8, bed: 'shoreline',
  liquid: { kind: 'water', color: 'oklch(0.48 0.07 205)', clarity: 0.35, turbulence: 0.1, waves: 0.04, shoreFoam: 0.05, crestFoam: 0, caustics: 0.4, refraction: 0.3 } };
export const WET = { rock: 'wetRock', mossRock: 'wetRock', wowCobble: 'wowCobbleWet', wowCobbleMoss: 'wowCobbleWet', sand: 'wetsand', _: 'shoreline' };
export const BIOME = { cliff: 'rock', steep: 'mossRock', flat: 'grass', low: 'sand', high: 'snow', snowLine: 160, sandLine: 37, steepAt: 0.45, cliffAt: 0.9 };
// Foliage palette: build-palette prefab ids (scripts/lib/data/prefabs.js, cat foliage) the brush scatters.
export const FOLIAGE = ['oak', 'birch', 'sapling', 'shrub', 'fern', 'reeds', 'flowers', 'rock', 'log'];

// TEXTURE SWATCHES (Campton 2026-10-10: "show the actual full textures not just a color"): each layer's albedo from places/main/config.yaml
export const LAYER_TEX = {
  beatenDirt: '/cdn/texture-terrain-hand-painted-warcraft-light-tan-dusty-hiking-trail-packed-earth-small-pebbles.png',
  beatenDirtEdge: '/cdn/texture-terrain-hand-painted-warcraft-light-tan-dusty-hiking-trail-packed-earth-small-pebbles.png',
  grass: '/cdn/10803e8e1cdd4bf4f20d4a49492bcc4f94355e937271d62cbef9f77b9a5f39ff-u0zoehkca.webp',
  gravel: '/cdn/value.1ad36c231a9134867589eb73ca8ac91efb65d573620355c0def8e4a2912e417b.png',
  rock: '/cdn/texture-terrain-wow-classic-hand-painted-grey-rock-strata-broad-brushstrokes-cool-purple-crevices-warm-sunlit-tops.png',
  wetRock: '/cdn/texture-terrain-wow-classic-hand-painted-grey-rock-strata-broad-brushstrokes-cool-purple-crevices-warm-sunlit-tops.png',
  mossRock: '/cdn/texture-terrain-wow-classic-hand-painted-mossy-rock-ledges-green-moss-in-cracks-broad-brushstrokes.png',
  fallFloor: '/cdn/texture-terrain-hand-painted-warcraft-redridge-golden-orange-fallen-leaves-scattered-on-yellow-green-grass.png',
  fallGrass: '/cdn/10803e8e1cdd4bf4f20d4a49492bcc4f94355e937271d62cbef9f77b9a5f39ff-u0zoehkca.webp',
  leafLitter: '/cdn/texture-terrain-hand-painted-warcraft-dark-moist-forest-soil-with-brown-leaf-litter.png',
  dryGrass: '/cdn/texture-terrain-hand-painted-warcraft-dry-pale-straw-grass-sunlit-hilltop.png',
  forest: '/cdn/texture-terrain-stylized-painted-forest-floor-big-soft-leaf-clumps-lowpoly.png',
  shoreline: '/cdn/texture-terrain-stylized-painted-riverbank-mud-soft-brush-lowpoly.png',
  upland: '/cdn/value.8901d1e2946b48bc74a44f88a37ec4471abc03543c7798d15ce1da9371e21acb.png',
  wetsand: '/cdn/texture-terrain-wet-sand-realistic-albedo.png',
  snow: '/cdn/texture-terrain-stylized-painted-snow-soft-drifts-lowpoly.png',
  wheat: '/cdn/texture-terrain-stylized-painted-golden-wheat-field-rows-lowpoly.png',
  soil: '/cdn/texture-terrain-stylized-painted-tilled-soil-furrows-lowpoly.png',
  crop: '/cdn/value.09783255b3813a5d12dac7bb72e9af749c6bc90559e9e80a9e30bb4b73037b5a.png',
  sand: '/cdn/texture-terrain-sand-realistic-albedo.png',
  cobble: '/cdn/texture-terrain-mossy-cobblestone-square.png',
  wowCobble: '/cdn/value.96e008930bbd4997348d53686c120c9ea25194233dbb361a89028dbd5b3655a9.png',
  wowCobbleWet: '/cdn/value.96e008930bbd4997348d53686c120c9ea25194233dbb361a89028dbd5b3655a9.png',
  wowGravel: '/cdn/value.2699b4f10dc3f0e6d763c009dd82a44113c01ebb47a381e2bb123607e5499787.png',
  wowDirt: '/cdn/value.fdf0c908325a3a6f496113e61fcbe13a8f0996c89e93980995681e86191eae01.png',
  wowDirtRut: '/cdn/value.fdf0c908325a3a6f496113e61fcbe13a8f0996c89e93980995681e86191eae01.png',
  wowFlagWorn: '/cdn/texture-terrain-wow-hand-painted-worn-limestone-flagstones.png',
  wowCobbleMoss: '/cdn/texture-terrain-wow-hand-painted-mossy-damp-cobblestones-green-moss-in-joints.png',
};
// every textured layer the place has, after the curated LAYERS, so the picker offers them all
export const ALL_LAYERS = [...LAYERS, ...Object.keys(LAYER_TEX).filter((id) => !LAYERS.some((l) => l[0] === id)).map((id) => [id, '#888'])];
