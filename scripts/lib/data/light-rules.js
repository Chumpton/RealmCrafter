// LIGHT EDITOR (creator 2026-10-04, LIGHT-EDITOR-PLAN.md + Savi's [S] review): every tuned number of the scan and auto-populate.
// The palette is the lamp kit (templates/lamp.js, scripts/lib/data/lamps.js): 6th-century northern fire only, nothing else can be placed.
export const LE = {
  hall: { x: 10, z: 1.5, zone: 120, cap: 64 },           // the census law: inside 120 m of the hall the lamp count must fall toward 64
  valley: 402,                                             // 0.25 mile: nothing is placed past this from the hall
  ftPerM: 3.28084,
  radiusFt: { min: 3, max: 300, def: 20, presets: [6, 10, 20, 40, 100, 300] },
  scanPad: 6,                                              // the scan reads this far past the ring
  maxPerArea: 40,
  // AUTOFILL v2 (Phase 2): the context read names the place from this far round the click; lamps still land only inside the ring
  context: 30,
  path: { gap: 12, minGap: 7, jitter: 2.5, side: 0.9, minR: 5 },     // torches along worn paths: ~12 m apart, never a grid, just off the path's edge
  spent: { rate: 0.1, minPicks: 4 },                     // ~1 in 10 left burnt out (never the first, never in an area under 4 lamps)
  glowSecs: 4,                                           // a freshly placed lamp burns this long on the editor's screen, even at noon
  density: { sparse: { per: 9, base: 0 }, natural: { per: 6, base: 1 }, lively: { per: 4, base: 2 } }, // cap = base + radius_m / per
  // the period palette: label, what it is, how far apart two of a kind may stand (m), fire = never under a roof
  kinds: {
    torch:       { label: 'Pitch torch',   rune: 'ᛏ', spacing: 7,  fire: true },
    brazier:     { label: 'Iron brazier',  rune: 'ᛒ', spacing: 9,  fire: true },
    campfire:    { label: 'Campfire',      rune: 'ᚲ', spacing: 14, fire: true },
    bonfire:     { label: 'Bonfire',       rune: 'ᛒ', spacing: 24, fire: true },
    sconce:      { label: 'Wall rushlight', rune: 'ᛋ', spacing: 4,  fire: false },
    hornLantern: { label: 'Horn lantern',  rune: 'ᚺ', spacing: 5,  fire: false },
    tallowLamp:  { label: 'Oil lamp',      rune: 'ᛚ', spacing: 3,  fire: false },
    lanternPost: { label: 'Lantern post',  rune: 'ᚺ', spacing: 6,  fire: false },
    forge:       { label: 'Forge glow',    rune: 'ᚠ', spacing: 10, fire: true },
  },
  // what a thing IS, read off its id and tags (first match wins, order matters)
  classes: [
    ['skip',   /enemy|monster|player|folk|npc|gull|bird|horse|cow|chicken|goblin|bull|wisp|le-ghost|le-ring|sky|cloud|water|sea|terrain|grass|scatter|fx|sails/],
    ['lamp',   /(^|\s)lamp(\s|$)|nightglow|lamp-|torch|brazier|lantern|sconce|campfire|bonfire|candle/],
    ['forge',  /forge|anvil|smith|kiln|bloomery/],
    ['gate',   /gate|portal|arch/],
    ['bridge', /bridge/],
    ['dock',   /dock|pier|jetty|wharf|quay|boat|ship|longship|knarr/],
    ['well',   /well/],
    ['sacred', /grave|cairn|shrine|runestone|rune-stone|standing|altar|barrow|tomb|idol|totem|stone-ring|henge/],
    ['house',  /hall|longhouse|house|hut|cabin|shed|barn|stable|shack|lodge|cottage|workshop|store|byre|home|tent|merchant|granary|windmill/],
    ['pen',    /pen|fence|corral|fold|sty|coop|henyard|paddock/],
    ['table',  /table|bench|barrel|crate|chest|workbench|counter|stall/],
    ['yard',   /woodpile|log|cart|hay|bale|market|plaza|green|dais|firepit|well|stook|stack|scarecrow|plow|plough|crop|field/],
    ['tree',   /tree|pine|birch|oak|spruce|forest|bush|shrub/],
  ],
  minHouseArea: 6,                                         // m² of footprint before a box counts as a building
  wallY: 1.7,                                              // a rushlight hangs this high on a wall
  fireClear: 3.2,                                          // an open fire keeps this far from any building
  // order of who gets a light first when the cap bites
  priority: ['forge', 'gate', 'house', 'yard', 'path', 'dock', 'bridge', 'well', 'pen', 'sacred', 'table'],
};
