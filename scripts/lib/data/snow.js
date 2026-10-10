// SNOW CONTRACT (Savi, 2026-09-29, creator "Go" on docs/board/SNOW-PLAN.md). Every tuned snow number lives here.
// RULE: snow never runs in the natural cycle. place.state.snow.on is true ONLY while the creator's THE SKY "Winter" test
// switch is on (place.state.wxForce.winter === 1). Lifting that rule is the creator's word, not ours.
//
// place.state.snow  (written ONLY by scripts/snow-core.js, lane W1)
//   { on:bool, season:'autumn'|'early'|'deep'|'thaw', temp:C, kind:'powder'|'wet'|'sleet'|'blizzard'|null,
//     fall:0..1 (current snowfall rate), depth:m (open-ground mean), wet:0..1, crust:0..1, arc:{…JEV storm}|null,
//     forecast:string, firstSnowAt:ms|null, at:ms }
// Per-cell detail: scripts/lib/snow-field.js (lane W3 implements; signatures below are fixed, others import them):
//   depthAt(ctx,x,z) -> m   packAt(ctx,x,z) -> 0..1   dab(ctx,x,z,deltaM,radiusM,{pack}) (queued, budgeted)
//   inZone(x,z) -> bool
export const SNOW = {
  GH_MS: 75000, // REAL-TIME DAY (LAMP-CLOCK-PLAN rev 2): one SNOW game hour, pinned at the old 30-min day's pace (was DAY.cycleMs/24) so storms, melt, drifts and weeks keep today's speed while the sky runs real time
  zone: { cx: 9, cz: 3, half: 40, cell: 0.5 },   // the walk zone around the longhouse (hall spans x 0.4..19.6, z -1.6..6.1)
  hall: { x0: 0.4, x1: 19.6, z0: -2.2, z1: 6.6 }, // never any snow inside (also scripts/lib/hearth-roof-mask.js)
  floorY: 24.02,                                   // hall floor; raised snow must never reach it, Rolf's footstool or the guitar rest
  maxDepth: 1.4, doorCap: 1.0, squarePathCap: 0.12, // door drift caps at a wade (never sealed); square-door path ankle max
  rate: { powder: 0.06, wet: 0.035, sleet: 0.01, blizzard: 0.12 }, // m per in-game hour at fall = 1
  melt: { perC: 0.004, sun: 0.01, rain: 0.02 },    // m per in-game hour
  foot: { sink: 0.6, pack: 0.35, radius: 0.18 },   // sink = depth*(1-pack)*sink
  speed: [[0.1, 1], [0.25, 0.95], [0.5, 0.7], [0.9, 0.5]], // [depth m, walk multiplier]
  budget: { dabsPerSec: 20, fxRange: 30 },
  // lane S4 (melt drips + icicles + D20 shore ice): scripts/snow-melt.js, effects-snow-drip.fx.js, gen/snow-icicles.js, gen/snow-shore-ice.js
  dripIce: {
    tickS: 5, idleS: 20,                              // tick while snow is on; sleep while off
    eaveY: 26.62,                                     // eave line (RAIN.look.eave.y): hall floor 24.02 + 2.6
    eaves: [{ id: 'ice-s', x: 10, z: -3.95, half: 13.3, gaps: [[-7.4, -5.8]] },               // gap = main door x 3.4
            { id: 'ice-n', x: 10, z: 6.95, half: 13.3, gaps: [[-2.8, -1.2], [5.8, 7.4]] }],   // square door 8.0, back door 16.6
    tips: [{ id: 'tip-ne', x: 16, z: -10, h: 6.8, r: 2.5 }, { id: 'tip-path', x: -11, z: -5, h: 7.25, r: 2.65 },
           { id: 'tip-west', x: -8, z: 6, h: 6.7, r: 2.5 }, { id: 'tip-vane', x: 7, z: -7, h: 3.95, r: 0.35, vane: true }],
    ice: { freezeC: -0.5, thawC: 0.5, minDepth: 0.01, crustFrom: 0.3, grow: 0.25, melt: 0.08, maxLen: 0.95, step: 0.05, show: 0.06, dissolveS: 3 }, // m per in-game hour
    lake: { y: 0.025, land: 1.5, grow: 0.01, melt: 0.025, maxT: 0.14, maxW: 7, walkT: 0.08, stepW: 0.5, stepT: 0.02,
            shore: [[-24,-74],[-20,-73],[-16,-72],[-12,-71.5],[-8,-71],[-4,-71],[0,-71],[4,-72],[8,-72.5],[12,-73],[16,-74],[20,-75],[24,-76],[28,-76.5],[32,-77],[36,-77],[40,-77],[44,-76.5]] }, // measured waterline (terrain <= 0.02)
    drip: { desktop: 16, mobile: 8, low: 4, tip: 0.45, step: 0.25, minDepth: 0.005, warmC: 4 }, // drops/s per eave at full melt (capped per viewer class)
  },
  // lane W5 (the door shovel: scripts/snow-shovel.js, templates/snow-shovel.js, scripts/gen/snow-shovel.js)
  shovel: { scoop: 0.03, wetMul: 1.6, reach: 1.6,
    every: 0.3, bite: 1.0, radius: 0.35, maxScoops: 5, minTake: 0.004,   // s between scoops held; m ahead the blade bites; dab radius m; loads per blade
    pileRadius: 0.45, pilePack: 0.55, throwMin: 1.0, throwMax: 3.6, eye: 1.6, flight: 0.35, // a thrown load: a packed +dab where you aim
    sessionGapS: 20, punch: 0.1, pressGapMs: 400, home: 'snow-shovel',   // quiet s that closes a dig session ('snow:dug' once); camera weight
    held: { feet: { x: 0.26, y: 0.66, z: -0.7 }, rotation: { pitch: 50, yaw: 0, roll: 0 } },  // on the holder's body frame
    heapAt: { feet: { x: 0, y: 0.17, z: -0.03 }, rotation: { pitch: -90, yaw: 0, roll: 0 }, max: 1.15 },
    sounds: { volume: 0.55, maxDistance: 18,
      take: '/cdn/moodboard-lowpoly-cozy/sfx-wooden-shovel-lifted-off-wall-peg-clack.mp3',
      set: '/cdn/moodboard-lowpoly-cozy/sfx-wooden-shovel-hung-on-wall-peg-knock.mp3',
      scoop: '/cdn/moodboard-lowpoly-cozy/sfx-snow-shovel-scoop-crunch-scrape.mp3',
      scrape: '/cdn/moodboard-lowpoly-cozy/sfx-shovel-iron-edge-scrape-on-bare-earth.mp3',
      whump: '/cdn/moodboard-lowpoly-cozy/sfx-snow-shovel-load-thrown-soft-whump.mp3' },
    lines: { taken: 'Someone is already digging with the shovel.', hall: 'Not inside: the snow stays out of the hall.' } },
  jev: { maxCallsPerStorm: 1, maxCallsPerDawn: 1, maxCallsPerDig: 1 },
  gain: { crunch: 0.35, hush: 0.12, blizzard: 0.2 },
  // W1 snow-core (lane W1 only): climate, JEV winter weeks, storm arcs, the dusk freeze, melt math, the forecast slate
  core: {
    idleSec: 4, saveSec: 15,                        // off: one read every 4 s then sleep; on: self row saved every 15 s
    seasonCycle: ['early', 'deep', 'deep', 'thaw'],  // fallback season per in-game week (JEV picks when it answers)
    seasonTemp: { autumn: 4, early: -1.5, deep: -7, thaw: 1.5 }, // C at the day's mean
    diurnal: 3.5, hardFrost: -5, mildNight: 1.5,    // C swing (clear sky), night shifts by the dusk call
    kindTemp: { powder: -2, wet: 0.8, sleet: 1.5, blizzard: -6 }, // a storm pulls the air toward this
    kinds: { autumn: { sleet: 3, wet: 2 }, early: { wet: 3, powder: 4, sleet: 1 }, deep: { powder: 5, blizzard: 2, wet: 1 }, thaw: { wet: 4, sleet: 3 } },
    cm: { autumn: [2, 6], early: [4, 18], deep: [12, 45], thaw: [2, 10] }, hours: [3, 10], // storm total and length (game hours)
    gapH: { autumn: [30, 60], early: [10, 30], deep: [6, 20], thaw: [16, 40] }, firstStormH: 0.3, // game hours between storms
    shape: 0.6, meltDaysRef: 3, crustRate: 0.35, crustBury: 4, wetRate: 1.5,
    slate: { at: { x: 4.9, z: -4.7 }, face: { w: 0.56, h: 0.38 }, pollSec: 5 },
    jevSystem: 'You are JEV, keeper of the weather over a small Norse longhouse beside an immense cold lake. Choose plausible, varied winter weather. Keep any line under 34 characters, plain words, no emoji. Answer only the JSON.',
  },
  // lane W8 (sound + breath): scripts/snow-sound.js, scripts/snow-breath.fx.js
  w8: { stride: 0.72, minDepth: 0.03, hushDepth: 0.12, slushTemp: 0.5, slushWet: 0.6, packed: 0.5, stepRange: 14,
        breathEvery: 3, breathMin: 0.12, hearthWarm: 4, frostUp: 0.05, frostDown: 0.06, frostHearth: 0.35, stingWindowMs: 600000, stingVol: 0.3,
        clips: { powder: '/cdn/moodboard-lowpoly-cozy/sfx-snow-footstep-powder-squeak.mp3', packed: '/cdn/moodboard-lowpoly-cozy/sfx-snow-footstep-packed-crunch.mp3',
                 slush: '/cdn/moodboard-lowpoly-cozy/sfx-snow-footstep-slush-splat.mp3', blizzard: '/cdn/moodboard-lowpoly-cozy/sfx-snow-blizzard-wind-howl-loop.mp3',
                 hush: '/cdn/moodboard-lowpoly-cozy/sfx-snow-hush-soft-snowfall-stillness-loop.mp3', sting: '/cdn/moodboard-lowpoly-cozy/music-snow-first-snow-soft-swell-sting.mp3' } },
  // lane W4 (drifts + den guard + dawn shovel, scripts/snow-drifts.js). (the old top-level SNOW.doors table, loft ladder / wrong walls, was deleted 2026-09-29 per Claude C17)
  // verified doors (scripts/lib/data/longhouse.js HALL.doors): main x3.4 z-3.5 faces -z, back x16.6 z6.5 +z, square x8 z6.5 +z.
  drifts: {
    doors: { main: { x: 3.4, z: -4.3, n: [0, -1] }, back: { x: 16.6, z: 7.3, n: [0, 1] }, square: { x: 8.0, z: 7.3, n: [0, 1] } }, // drift centre 0.8 m outside each doorway; n = outward normal (x,z)
    squareStep: [[8.0, 7.3], [8.0, 8.3], [8.0, 9.3]],     // outside the square door: held at SNOW.squarePathCap (the folk keep it trodden)
    mainPath: [[3.4, -4.2], [3.4, -5.1], [3.4, -6.0], [3.5, -6.9], [3.6, -7.8], [3.7, -8.7]], // the main door path Gunnar digs at dawn (door outward)
    radius: 1.1, mul: 1.8, worstMul: 1.7, softMul: 0.6, leeFloor: 0.25, // drift m = fall*rate[kind]*gameH*mul*(leeFloor + lee)*(worst? worstMul)*(arc.buryDoors? 1 : softMul)
    stall: [1.5, 13], outOfStall: 0.45,                    // wind m/s band where drifts bank best; outside it the lee gets outOfStall of it
    minDab: 0.01, capSlack: 0.02, every: 2, offSleep: 10,  // m; m over cap before the guard trims; s per tick; s asleep while snow is off
    tread: { every: 20, share: 0.5, tags: ['folk'], minDepth: 0, forget: 120 }, // folk footsteps: main-path cell per 20 s, AND each outdoor walker tagged tags[] that moved >= w8.stride since its last print dabs under its feet at most once per `every` s (sink = depth*(1-pack)*foot.sink*share, pack = foot.pack*share); minDepth m below which no print; forget = s a vanished walker's mark is kept
    buriedM: 0.55, digDropM: 0.12, digQuietS: 24, pileGapMs: 6 * 60000, // knee-deep = 'buried' line; a player dig = door depth drop per tick; quiet before the comment
    dawn: { hour: 6.5, duskHour: 18.5, heavyM: 0.25, clearedM: 0.15, leaveM: 0.04, radius: 0.75, pack: 0.6, throwSide: 1.3, throwShare: 0.6 },
    talk: { askTimeoutMs: 20000, gapMs: 90000 },
  },
  // W7 falling snow (scripts/effects-hearth-snow.fx.js, scripts/effects-snow-clump.fx.js, scripts/snow-flakes.js)
  flakes: {
    counts: { low: 900, mobile: 900, high: 1800, ultra: 3400 }, // base flakes per viewer; x kind.count x (.35+.65*strength)
    kinds: { // fall m/s, jitter = random spread, curl = wander, windMul = x engine wind(), side = sideways m/s on top of wind speed*sideWind
      powder:   { fall: .7,  jitter: .25, curl: .55, windMul: .45, side: .3, sideWind: .25, size: [.028, .05], life: [9, 13], count: 1,    alpha: .9,  stretch: 0,   floor: 'stick' },
      wet:      { fall: 2.3, jitter: .1,  curl: .12, windMul: .25, side: .1, sideWind: .15, size: [.06, .11],  life: [4, 6],  count: .5,   alpha: .95, stretch: 0,   floor: 'stick' },
      sleet:    { fall: 6.2, jitter: .05, curl: 0,   windMul: .35, side: .2, sideWind: .3,  size: [.007, .012], life: [2.2, 3], count: .8,  alpha: .55, stretch: .035, floor: 'die' },
      blizzard: { fall: 1.3, jitter: .5,  curl: .9,  windMul: 1,   side: 5,  sideWind: .8,  size: [.025, .045], life: [3, 5],  count: 1.25, alpha: .85, stretch: .02, floor: 'die' },
    },
    first: { ms: 60000, steps: 3, fallMul: .45, countMul: .25, sizeMul: 1.25 }, // the season's first minute: slow and sparse
    windStep: 2,       // m/s quantum for the fx speed param (a param write re-runs the effect: only on real change)
    offSleep: 15,      // s asleep between looks while snow is off
    clump: { gustAt: .35, minDepth: .02, range: 30, perGust: 2, perMin: 8, treeCooldownMs: 7000, crown: [.55, .82], g: 9.8,
      clip: '/cdn/moodboard-lowpoly-cozy/sfx-snow-clump-thud.mp3', volume: .32, maxDistance: 24, trees: [] }, // trees: extra [x,z,height,spread] beside the garden-tree rows
  },
  // lane S2 (cover look): scripts/look-hearth.js reads these; scripts/snow-look-sync.js writes look params snDepth/snWet/snPow/snMelt/snWx/snWz
  look: { rowId: 'snow-look', everyS: 3, idleS: 20, round: 0.005, fullM: 0.12, edge: 0.5, soft: 0.22, meltEdge: 0.32, lee: 0.35,
          lift: 3.4, shade: [0.60, 0.69, 0.86], lit: [0.97, 0.975, 1.0], wetTint: [0.78, 0.81, 0.84], wetDim: 0.84, gloss: 0.45,
          sparkle: 0.9, sparkleCell: 26, sparkleNear: 22, water: 0.45, farM: 2600,
          shelter: { over: 0.6, lip: 0.2 } }, // shelter = the hall's roof footprint (eaves included) below its turf: never whiten inside
  // lane W3 (depth field + footprints): scripts/lib/snow-field.js, scripts/player.js. Fields snow:depth (m, OFFSET from the
  // place mean snow.depth) and snow:pack (0..1) on the engine grid (0.25 m cells, 64-cell chunks, int16 x 0.01).
  w3: { queueMax: 48, flushMs: 250, chunksPerFlush: 4, edge: 0.4, stride: 0.7, side: 0.11, minDepth: 0.02, speedEase: 0.25,
        print: { tex: '/cdn/value.cd12d1b2c20702018a9d9a54df601f856df9d6170eb6b960ac1542b43a2dfce7.png', size: [0.17, 0.34],
                 life: 90, fade: 20, range: 30, opacity: 0.55, deepOpacity: 0.85 } },
};
