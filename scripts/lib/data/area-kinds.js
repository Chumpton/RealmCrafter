// LIGHT EDITOR · AUTOFILL area reader (creator 2026-10-04): every tuned number that turns a survey into "what kind of place is this".
// Read by scripts/lib/area-read.js (pure). The nine ids are fixed: every Autofill lane uses exactly these.
export const AREA = {
  kinds: {
    longhouse: { label: 'Longhouse', rune: 'ᛟ', hint: 'the hall and its yard: torches at the door, a fire in the yard, rushlights on the walls' },
    farmstead: { label: 'Farmstead', rune: 'ᚠ', hint: 'barns, pens and fields: a torch at each pen gate, one yard fire, the fields stay dark' },
    village:   { label: 'Village',   rune: 'ᚹ', hint: 'houses close together: a rushlight per door, a shared fire on the green' },
    harbour:   { label: 'Harbour',   rune: 'ᛚ', hint: 'docks and boats: pole torches at the landing, lanterns on the jetty' },
    shore:     { label: 'Shore',     rune: 'ᛗ', hint: 'open water, no landing: a lone beacon fire at most' },
    forge:     { label: 'Smithy',    rune: 'ᛊ', hint: 'forge and anvil: the forge glow, a brazier, nothing else competes' },
    grove:     { label: 'Grove',     rune: 'ᛒ', hint: 'trees and no roofs: dark by design, a campfire only where people sit' },
    wild:      { label: 'Wild ground', rune: 'ᛉ', hint: 'nothing built: the dark stays' },
    road:      { label: 'Road',      rune: 'ᚱ', hint: 'a gate, bridge or worn trail on its own: torches flank the crossing, posts walk the trail' },
  },
  // per-thing weight from its footprint: clamp(area_m2 / areaRef, min, max) — a great hall counts for more than a shed
  area: { ref: 24, min: 0.5, max: 2.5 },
  // sub-kinds read off a thing's id/name (not in the le.read counts contract; they steer the read and the label)
  words: {
    hall: /(^|[\s/_-])(hall|longhouse|mead)/,
    barn: /barn|byre|stable|granary|hayloft|windmill/,
    hay: /hay|bale|stook|rick/,
    field: /field|crop|furrow|plough|plow|pasture|barley|wheat|oat|rye|flax|garden/,
    boat: /boat|ship|longship|knarr|faering|skiff|canoe/,
    anvil: /anvil|smith|bloomery|forge/,
  },
  hall: { near: 25, nameW: 6, nearW: 8 },                  // within 25 m of the hall centre (or a hall-named house in the ring) => longhouse
  harbour: { dockW: 3, boatW: 2, waterW: 2 },
  shore: { waterMin: 0.25, waterW: 6 },                    // a quarter of open samples wet, no docks => shore
  farm: { penW: 2, barnW: 3, hayW: 1.2, fieldW: 1.5 },
  village: { minHouses: 3, houseW: 1.6 },                  // 3+ houses (barns not counted)
  forge: { forgeW: 5, anvilW: 1 },
  grove: { minTrees: 5, treeW: 0.5, maxStructures: 1 },    // many trees, at most one roof/pen/etc
  road: { crossW: 2.5, maxOther: 1, trailPer: 10, trailMax: 4 }, // + 1 per 10 m of worn trail in the ring, up to 4                      // a gate/bridge with at most one other structure
  wild: { floor: 1.2 },                                    // the score every other kind must beat
  conf: { full: 8 },                                       // a top score this high is full evidence
  nearMax: 8,                                              // names handed to a JEV ask
  labelParts: 3,                                           // "Farmstead · 2 barns, 1 pen, 3 haystacks"
  // what each label lists, in order: [key from counts or sub, singular, plural]
  show: {
    longhouse: [['hall', 'hall', 'halls'], ['house', 'house', 'houses'], ['table', 'table', 'tables'], ['yard', 'yard thing', 'yard things']],
    farmstead: [['barn', 'barn', 'barns'], ['pen', 'pen', 'pens'], ['hay', 'haystack', 'haystacks'], ['field', 'field', 'fields']],
    village:   [['house', 'house', 'houses'], ['well', 'well', 'wells'], ['yard', 'yard thing', 'yard things']],
    harbour:   [['dock', 'landing', 'landings'], ['boat', 'boat', 'boats'], ['house', 'house', 'houses']],
    shore:     [['tree', 'tree', 'trees'], ['sacred', 'stone', 'stones']],
    forge:     [['forge', 'forge', 'forges'], ['house', 'house', 'houses'], ['table', 'bench', 'benches']],
    grove:     [['tree', 'tree', 'trees'], ['sacred', 'stone', 'stones']],
    wild:      [['tree', 'tree', 'trees']],
    road:      [['gate', 'gate', 'gates'], ['bridge', 'bridge', 'bridges']],
  },
};
