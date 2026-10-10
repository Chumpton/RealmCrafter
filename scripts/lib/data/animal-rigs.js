// The animal rig contract: every clip and bone name the animal behaviours play, one block per animal.
// A new rig (Phase 3a) swaps in by editing this table only: point clipFile at the new clip file, map each
// logical clip (left) to the clip's key in that file (right), and list the rig's bones by role.
// Behaviours never name a clip or bone themselves: lore-hound.js, lore-raven.js, yard-goats.js read from here.
export const ANIMAL_RIGS = {
  hound: {
    clipFile: 'anim/lore-hound.yml',
    clips: { sleep: 'breathe', wake: 'lift', earFlickL: 'flickL', earFlickR: 'flickR', tailThump: 'thump' },
    channels: { sleep: 'breathe', action: 'fidget', move: 'pad' },   // sleep loops under; fidgets and the wake play over it; pad rides its own channel
    // Clips the rig file lacks, authored inline in clip-bone names (they pass through bones like any file clip).
    // pad: she stands and trots (Claude's round-11 Grima). The model rests lying on her fleece; this clip lifts the body 0.35 m,
    // swings each leg from lying-forward to straight down (pitch −90, ±18 stride, diagonal pairs), lifts the head a little,
    // swings the tail and sinks the fleece (bed) under the floor while she walks; blending out lays her back down on it.
    // Written in clip-bone axes like the file clips (head 'roll' lifts through the bone map below).
    inline: { pad: { duration: 0.6, tracks: {
      body: { y: [0.35, 0.365, 0.35, 0.365, 0.35] }, head: { roll: [-16, -16, -16, -16, -16] }, tail: { yaw: [0, 14, 0, -14, 0] },
      bed: { y: [-0.15, -0.15, -0.15, -0.15, -0.15] },
      legFL: { pitch: [-72, -90, -108, -90, -72] }, legBR: { pitch: [-72, -90, -108, -90, -72] },
      legFR: { pitch: [-108, -90, -72, -90, -108] }, legBL: { pitch: [-108, -90, -72, -90, -108] } } } },
    // Life loop (hound-core.js): sleeps on a bed; a player stepping inside wakeRadius wakes her (head lifts), she pads to the
    // bed farthest from people and lies down; restFor seconds before the next wake. Beds are world feet + facing yaw.
    life: {
      beds: [{ x: 4.1, y: 24, z: 1.4, yaw: 180 }, { x: 4.3, y: 24, z: 3.35, yaw: 180 }],   // hearth's west head, both beds west of it (x ≤ 4.84): south one clear of table s1, its dishes and the spawn point (5.2, −0.4); ladder foot 2.1 m west
      wakeRadius: 3, alertFor: 2.0, walk: 0.8, restFor: 20, check: 0.5, farRadius: 25, farCheck: 3,
      // Padding (hound-core.js update, every tick while she moves): a kinematic body stepped along the bed line. A player whose
      // feet sit ahead of her (−behind..lookAhead m along the line) and within pathHalfWidth of it stops her until clear; she
      // eases over easeDist at each end (never below minSpeed of walk). Blocked longer than waitMax s she lies down where she is.
      body: 'kinematic', lookAhead: 1.15, behind: 0.35, pathHalfWidth: 0.8, easeDist: 0.35, minSpeed: 0.35, waitMax: 15,
    },
    // Clip bone (the key in anim/lore-hound.yml) → the model's bone: a name, or { name, axes, sign } — axes renames a channel
    // (axes: { yaw: 'roll' } plays the clip's yaw on the bone's roll), sign flips it (sign: { yaw: -1 }; keyed by the CLIP's axis).
    // Claude's round-11 Grima: faces −Z like the goats and ravens (hound-core turns with atan2(−dx, −dz)), so bed yaw 180 keeps
    // her old footprint. The file clips were authored for the old snout-toward-−X frame: their body/head 'roll' (about the side
    // axis there) is 'pitch' here with the sign flipped (pitch − lowers, as on the goats); ear 'pitch' (about her length) is 'roll'.
    // World-aligned zero-roll bones; legs and bed are new (pad only).
    bones: {
      root: 'root', bed: { name: 'bed' },
      body: { name: 'body', axes: { roll: 'pitch' }, sign: { roll: -1 } }, head: { name: 'head', axes: { roll: 'pitch' }, sign: { roll: -1 } },
      earL: { name: 'earL', axes: { pitch: 'roll' } }, earR: { name: 'earR', axes: { pitch: 'roll' } }, tail: { name: 'tail' },
      legFL: { name: 'legFL' }, legFR: { name: 'legFR' }, legBL: { name: 'legBL' }, legBR: { name: 'legBR' },
    },
    roles: { root: 'root', body: 'body', head: ['head'], ears: ['earL', 'earR'], tail: ['tail'], legs: ['legFL', 'legFR', 'legBL', 'legBR'], bed: ['bed'] },
  },
  goat: {
    clipFile: 'anim/yard-goat.yml',
    clips: { idle: 'idle', graze: 'graze', walk: 'walk' },
    channels: { body: 'body' },
    play: { rest: { blendIn: 0.4, speed: [0.85, 1.15] }, walk: { blendIn: 0.25, speed: 1.5 } },   // walk clip speed matched to life.walkSpeed
    // Life loop (goats-core.js): walkSpeed m/s; a player inside shyRadius makes a resting goat step to the pen spot farthest
    // from them; bleats are spatial, quiet (bleatVolume), heard to bleatRange m. Pen shape and rest timing stay in yard.js pen.
    life: { walkSpeed: 0.8, shyRadius: 1.8, shyCooldown: 3, bleatVolume: 0.3, bleatRange: 18 },
    // Clip bone → model bone, same shape as hound.bones. Painted goats (3a, round 2): face −Z, world-aligned zero-roll bones,
    // live bones read root, neck, tail, legFL/FR/BL/BR — identity; leg pitch swings fore-aft, neck pitch − lowers the head.
    bones: {
      root: { name: 'root' }, neck: { name: 'neck' }, tail: { name: 'tail' },
      legFL: { name: 'legFL' }, legFR: { name: 'legFR' }, legBL: { name: 'legBL' }, legBR: { name: 'legBR' },
    },
    roles: { root: 'root', neck: ['neck'], tail: ['tail'], legs: ['legFL', 'legFR', 'legBL', 'legBR'] },
  },
  raven: {
    clipFile: 'anim/lore-raven.yml',
    clips: { caw: 'caw', lookL: 'lookL', lookR: 'lookR', hop: 'hop', flap: 'flap' },
    channels: { idle: 'idle' },
    // Life loop (raven-core.js): hops along the ridge within ±span m of home; a player outside the hall running (speed > runSpeed)
    // within spookRun m horizontally, or anyone within spookClose, flushes it: up rise m and out m away, back after flight s.
    life: { span: 1.4, hopStep: 0.3, spookRun: 9, spookClose: 4, runSpeed: 2.6, rise: 4, out: 7, flyOut: 2.2, flight: [3, 6], flyBack: 2.6, restFor: 3, check: 0.5, farRadius: 45, farCheck: 4 },
    // Painted ravens (3a, round 2): face −Z, wingL on −X, zero-roll bones; live bones read root, head, wingL, wingR, tail — identity.
    bones: {
      root: { name: 'root' }, head: { name: 'head' }, tail: { name: 'tail' },
      wingL: { name: 'wingL' }, wingR: { name: 'wingR' },
    },
    roles: { root: 'root', head: ['head'], wings: ['wingL', 'wingR'], tail: ['tail'] },
  },
};
export const { hound, goat, raven } = ANIMAL_RIGS;
// A clip rewritten through rig.bones before play: renamed bones, remapped axes, signed values. A bone the table never
// names, a string entry, or an object with no axes/sign passes through as authored (identity). x/y/z (position) keep their axis
// unless axes names them too. Values may be numbers or [seconds, value] pairs.
const signed = (vals, s) => s === 1 ? vals : vals.map((v) => Array.isArray(v) ? [v[0], v[1] * s] : v * s);
export function remapClip(rig, clip) {
  const map = rig?.bones; if (!clip || !map) return clip;
  const tracks = {};
  for (const [bone, chans] of Object.entries(clip.tracks || {})) {
    const e = map[bone];
    const m = typeof e === 'object' && e && !Array.isArray(e) ? e : { name: typeof e === 'string' ? e : bone };
    const out = (tracks[m.name ?? bone] ??= {});
    for (const [ax, vals] of Object.entries(chans)) {
      const to = m.axes?.[ax] ?? ax, s = m.sign?.[ax] ?? 1;
      out[to] = Array.isArray(vals) ? signed(vals, s) : vals;
    }
  }
  return { ...clip, tracks };
}
export default ANIMAL_RIGS;
