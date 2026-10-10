// The folk lane's tuning: head turns, blinks and the finger layer for every folk- row (scripts/folk-life.js).
export const FOLK = {
  // a toast's table sound (folk-life-core toast(), one playSound beside the voice line): wooden mug clunk + a small cheer from the bench
  toastCheer: { clip: '/cdn/moodboard-lowpoly-cozy/sfx-wooden-mug-clunk-on-table-small-hall-cheer.mp3', volume: 0.55, maxDistance: 12, lift: 0.9, delay: 0.35, pitch: [0.94, 1.06] },
  debug: false,           // ctx.log each blink/jaw/look step (measurement only)
  // Pose layer (round 8, calm pass): the body clip on channel "pose". The creator read the old set as janky/disturbing:
  // 1.1 s cuts popped, clapping/laughing clips folded the men over the food, neighbours breathed in step.
  pose: {
    weight: 5,
    blend: 2.2,             // s an idle swap eases over (was 1.1 — the pop)
    toastBlend: 0.9,        // s into/out of the toast clip (a toast should read, not drift)
    swapEvery: [30, 60],    // s between idle swaps (was 22–48: too restless)
    firstSwap: [6, 14],     // s after the body lands, the boot sit clip → the talking clip
    speed: [0.86, 1.08],    // playback rate range for rows with no by.<name>.speed
    avoid: ['laughing'],    // a clip containing one of these is never played (doubles the body over)
    neighbourRadius: 4.5,   // m: a swap never picks the clip a folk this near is already playing
    minSpeedGap: 0.05,      // neighbours' playback rates differ by at least this, so no two loops run in step
    // per folk (row name, lowercase): idle overrides the row's own list (full clip addresses); speed pins the rate.
    by: {
      bjorn:   { idle: ['cdn/clip-sitting-talking-loop.glb', 'cdn/clip-sit-loop.glb'], speed: 0.9 },   // clapping folded him over the dishes
      hakon:   { idle: ['cdn/clip-sit-loop.glb', 'cdn/clip-sitting-talking-loop.glb'], speed: 0.97 },
      ulf:     { idle: ['cdn/clip-sitting-talking-loop.glb', 'cdn/clip-sit-loop.glb'], speed: 1.04 },
      astrid:  { idle: ['cdn/clip-sit-female-loop.glb', 'cdn/clip-sitting-talking-female-loop.glb'], speed: 1.02 },
      freydis: { idle: ['cdn/clip-sitting-talking-female-loop.glb', 'cdn/clip-sit-female-loop.glb'], speed: 0.93 },
      ingrid:  { speed: 0.88 },
      sven:    { speed: 1.0 },
      orm:     { speed: 0.82 },
    },
  },
  look: {
    every: [4, 9],          // s between look picks (ctx.after chain, no update())
    ease: 1.3,              // s a head turn eases over (at least; long turns stretch by maxRate)
    maxRate: 55,            // deg/s: no head turn is faster than this — the old 0.8 s / 60° snap read as a twitch
    easing: 'easeInOutSine',
    playerRadius: 5,        // m: the nearest player inside this is looked at first
    folkRadius: 7,          // m: else the nearest neighbour folk who is talking
    maxYaw: 55, maxPitch: 15, // degrees, relative to the body's facing
    split: { neck: 0.4, Head: 0.6 }, // logical bones (lib/rig-names.js resolves per rig); share of the turn each bone carries
    pitchSign: -1,          // Mixamo heads face +Z locally: a positive pitch tips the face down, so up = negative
    forwardJitter: 8,       // degrees of idle drift when there is nothing to look at
    playerEye: 1.55,        // m above a player's feet
    talking: ['talking', 'talk-'], // an idle clip containing one of these marks its row state.talking
    still: ['sleep'],       // an idle clip containing one of these never turns (Orm)
    headY: [['sit-floor', 0.8], ['sit', 1.15], ['', 1.6]], // m above feet by clip name, first match; state.headY overrides
  },
  // Notice (round 7): the nearest folk turns to a player who walks within walkRadius, holds, turns back; a player who newly
  // sits within sitRadius gets a nod and, greetChance of the time, a spoken line in the folk's own voice identity
  // (parsed from row state.voice[0]: /cdn/voice-<identity>-saying-…). One ctx.after chain per folk, no update().
  notice: {
    every: 0.5, idle: 1.5, farRadius: 12, // s between player checks; idle when nobody is within farRadius m
    walkRadius: 4, sitRadius: 2.5,        // m
    ease: 0.9, easing: 'easeInOutSine', maxYaw: 50, // the turn toward the player (capped by look.maxRate too)
    hold: [2, 4], back: 1.4,              // s held on them, s easing back to ahead
    cooldown: 20,                         // s per folk between notices (and between nods)
    rosterEvery: 30,                      // s the per-folk neighbour list (who is nearest the player) is re-read
    seatedEye: 0.75,                      // m above a seated player's feet (the seat point)
    workGrace: 3,                         // s after a feed reach starts that a worker won't turn
    nod: { deg: 11, dur: 0.7, delay: 0.45 }, // Head dips deg (down), after the turn lands
    greetChance: 1 / 3,
    greetings: { // identity → line slugs; /cdn/voice-<identity>-saying-<line>.mp3
      'viking-man-gruff': ['heill-friend', 'sit-warm-yourself'],
      'shield-maiden-warm': ['heill-friend-be-welcome', 'sit-warm-yourself-by-the-fire'],
      'viking-elder-raspy': ['sit-friend-warm-your-bones', 'heill-friend'],
    },
  },
  // Blink contract (2a rigs): bones LeftEyelid/RightEyelid (pitch closes) or a shape key matching /blink/i (weight 1).
  // Measured 23:15 UTC on Rolf's GLB: +pitch (lid-bone local X) swings the rim down, the right axis; but his 46 lid-weighted verts
  // sit 1.6 cm from the pivot, inside the separate eyeball mesh (front 1.8 cm), so pitch/yaw/roll ±30..90 leave the eyes open.
  // Art fix pending (design.md, eyelid blink check): a /blink/i shape key is picked up here with no code change.
  blink: { every: [4, 9], hold: 0.18, bones: ['LeftEyelid', 'RightEyelid'], closePitch: 35, morph: /blink/i },
  // Jaw (2a rigs: Jaw under Head, negative pitch opens). Talking clips chew a slow irregular open/close;
  // a toast opens it with the voice line for toastFor s. ctx.after chain, eased by tween; merged into bones.
  jaw: {
    bone: 'Jaw',
    open: [-4, -12],        // degrees while talking
    rest: [0, -2],          // degrees between syllables
    step: [0.22, 0.42],     // s a talking open/close eases over
    pause: [0, 0.3],        // s held between steps; now and then a longer breath:
    breath: { chance: 0.18, span: [0.5, 1.1] },
    toastOpen: [-8, -14], toastStep: [0.16, 0.3], toastFor: 1.4,
  },
  // Orm (still rows) sleeps with lids shut: set once when his rig reads, retried while the model pins.
  sleepLids: { retry: 2, tries: 40 },
  // Finger-layer contract: row state.handPose → clip address, played on channel "hands" masked to the hand subtrees.
  // Applied only when the rig has finger bones (e.g. RightHandIndex1). null = not authored yet (claude 2a).
  hands: {
    channel: 'hands', weight: 7, blendIn: 0.5,
    fingerProbe: /(Left|Right)Hand(Index|Middle|Ring|Pinky|Thumb)\d/,
    poses: { fist: 'anim/hands-fist.yml#fist', relaxed: 'anim/hands-relaxed.yml#relaxed', cup: 'anim/hands-grip.yml#grip', grip: 'anim/hands-grip.yml#grip', point: 'anim/hands-point.yml#point' },
  },
  // Mead in hand: a toast spawns a vessel riding the right hand bone (a runtime child, gone at endToast; lifetime backs it up).
  // by: row name (lowercase) → item; offsets are in the hand bone's frame (m / degrees), tuned by eye on the painted Mixamo bodies.
  vessel: {
    bone: 'RightHand', fallbackBone: 'mixamorig:RightHand', // fallback when the rig can't be read yet (every folk body is Mixamo)
    grip: 'grip', lifetime: 0.8, default: 'mug', // lifetime: s past the toast's hold before the vessel self-clears
    // The lift: rightArm IK carries the hand to chin height for the hold (the cheer clips alone leave it at the lap).
    // m in the body's frame, scaled by the row: chin = below headY (clip-based head height), forward of the feet, to the body's right.
    lift: { hold: 3.2, maxHold: 12, chin: -0.2, /* round 10: the wrist rides here and the mug stands ~0.15 above it, so -0.03 held the mug over the forehead */ forward: 0.3, side: 0.08, /* round 11: side .18 held the mug beside the shoulder, not at the mouth */ weight: 1, blendIn: 0.45, blendOut: 0.6 },
    by: { bjorn: 'horn', hakon: 'horn', ulf: 'horn' },
    items: {
      mug:  { params: { item: 'mug' },  feet: { x: 0.02, y: 0.09, z: 0.05 }, rotation: { yaw: 0, pitch: 0, roll: 90 }, scale: 1.1 },
      horn: { params: { item: 'horn', stand: false }, feet: { x: 0.0, y: 0.0, z: 0.05 }, rotation: { yaw: 0, pitch: 0, roll: 90 }, scale: 1.0 },
    },
  },
  // Work (row state.work = kind; scripts/folk-life.js). crank: right-arm IK follows the spit crank handle (axis = the rod end,
  // world m; radius = the crank arm) read off the roast's live roll every step; breaks to talk. feed: lean + reach + sparks.
  work: {
    crank: {
      roast: 'feast-spit/feast-roast', axis: { x: 12.8, y: 24.9, z: 2.58 }, radius: 0.16,
      step: 0.7, weight: 1, blendIn: 0.6, lean: 12, clip: 'cdn/clip-idle-loop.glb',
      breakClip: 'cdn/clip-talk-loop.glb', firstBreak: [14, 22], breakEvery: [28, 50], breakFor: [4.5, 6.5], glance: 40,
    },
    feed: {
      first: [5, 10], every: [20, 40], reach: { x: 8.62, y: 24.3, z: 0.58 }, lean: 24, leanIn: 0.9, reachIn: 0.7,
      sparkAt: 1.25, holdFor: 2.1, release: 0.8, fire: { x: 8.05, y: 24.18, z: 1.45 },
      sound: '/cdn/moodboard-lowpoly-cozy/sfx-stick-dropped-into-hearth-fire-crackle-pop.mp3',
      fx: `fx
pop sparks burst=16..26 life=.5..1.2 v=up(1.8..3)+cone(38)*(.6..1.4) size=.018..0.04 acc=curl(.8)+grav()*.5+drag(.6) sz=$size*(1>.6:.8>.3) col=hdr(5,2.6,.7)>.6:hdr(2.2,.7,.15)>hdr(.9,.2,.04) a=(1>.7:.9>0)*flick(12,.3) r=sprite(ember,add,velocity,.02)
pop puff burst=2..3 on=disc(.12) life=.9..1.4 v=up(.5..0.9) size=.16..0.26 acc=buoy(.6)+drag(1.2) sz=$size*(.6>2.2) col=<.34,.3,.28> a=0>.2:.25>.7:.15>0 rot=spin(.2) r=sprite(smoke-puff,alpha)
pop flare burst=1 life=.7 fl=1>0 r=light(<1,.55,.24>,$fl*5,5)`,
    },
  },
  // Round 8 boot trim: the talking clips (clip-sitting-talking-loop 1.8 MB, female 440 KB) never sit in the room's
  // state when someone arrives — a fresh visitor's catch-up names only the light sit clips, so the first picture skips them.
  chat: {
    boot: ['clip-sit-loop', 'clip-sit-female-loop'], // the light clips rows boot on (62 KB / 124 KB)
    first: [20, 34],        // s after the body lands before the first talking window (after a visitor stands)
    hold: [9, 16],          // s one talking window lasts, then back to the light sit clip
    rest: [24, 46],         // s on a quiet clip between windows
    quiet: 30,              // s after any player arrives: nobody starts talking, talkers drop to the sit clip
    maxTalkers: 2,          // folk talking at once across the hall
  },
  snow: { // lane W4: what the folk say about snow (scripts/snow-drifts.js). Lines float over the speaker the rain way (rainReact ear).
    shoveller: 'lore-tafl-bearded', shovellerName: 'Gunnar', // the work tuning's pick for the dawn door path
    who: { 'folk-hakon': 'Hakon: the elder, weather-wise, his knees ache', 'folk-bjorn': 'Bjorn: big, loud, laughs at everything',
      'folk-astrid': 'Astrid: sharp-tongued, practical, keeps the house', 'folk-ulf': 'Ulf: the goatherd, grumbles, worries about his goats',
      'folk-freydis': 'Freydis: dry humour, a weaver, unimpressed', 'lore-tafl-bearded': 'Gunnar: steady, strong, first up with a shovel' },
    react: { 'folk-hakon': 'glance', 'folk-bjorn': 'laugh', 'folk-astrid': 'grumble', 'folk-ulf': 'grumble', 'folk-freydis': 'shrug' },
    lines: {
      first: { skadi: 'Skadi walks the valley tonight.', knees: 'My knees said snow. They were right.', goats: 'Get the goats in. Snow is here.', wood: 'Bring in more wood. Winter came early.', white: 'White on the lake already. Look at it.' },
      buried: { door: 'The door is half buried out there!', wade: "You'll wade to the waist if you go out that way.", drift: 'Wind stacked it right against the wall.', shovel: 'Someone fetch the shovel before it seals us in.', mead: 'Snowed in with the mead. I can live with that.' },
      dig: { thanks: 'Good digging, friend. Warm your hands.', back: "Strong back on that one. Sit, drink.", pile: "Where'd you throw it all? Not by the well, I hope.", again: 'It will fill in again by dark, you know.' },
      pile: { fort: 'Look, a snow fort! Who are we fighting?', wall: 'Fine wall. The wind will thank you.', child: 'Building like a child. Good. Keep at it.', thor: "Thor himself couldn't knock that heap down." },
      shovel: { dug: "Door path's dug. Mind the ice by the step.", back: 'Cleared it before the fire was lit. My back knows.', again: 'Snow all night. Shovel all morning. Winter.', morning: "There. You can walk out now. Don't thank me." },
    },
    fallback: { first: { who: 'folk-hakon', line: 'knees' }, buried: { who: 'folk-bjorn', line: 'mead' }, dig: { who: 'folk-astrid', line: 'thanks' }, pile: { who: 'folk-bjorn', line: 'fort' }, shovel: { who: 'lore-tafl-bearded', line: 'dug' } },
  },
};
