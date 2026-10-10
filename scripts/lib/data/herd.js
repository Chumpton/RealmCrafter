// The herd lane's one table. LAYOUT is local to herd-pens' feet (ORIGIN, x/z world metres; -Z = south, toward the grove and hall).
// PENS are the rectangles each species roams (world = ORIGIN + local), inset by the species' radius; avoid circles keep bodies off
// troughs, racks and shelter posts. scripts/gen/herd-pens.js draws from LAYOUT; scripts/herd-manager.js walks animals inside PENS.
export const ORIGIN = { x: 39.5, z: 46 };
const R3 = [0.3, 0.62, 0.94], R2 = [0.5, 1.02];
export const LAYOUT = {
  fences: [
    { a: [-6, -7.5], b: [6, -7.5], H: 1.1, rails: R3, gaps: [{ at: 3, w: 1.5, swing: [0, -1] }, { at: 9, w: 1.5, swing: [0, -1] }] }, // fold + sty front, a gate each
    { a: [-6, -7.5], b: [-6, 0], H: 1.1, rails: R3 },
    { a: [0, -7.5], b: [0, 0], H: 1.1, rails: R3 },
    { a: [6, -7.5], b: [6, 0], H: 1.1, rails: R3 },
    { a: [-6, 0], b: [6, 0], H: 1.1, rails: R3 },
    { a: [-6, 2.5], b: [6, 2.5], H: 1.3, rails: R2, gaps: [{ at: 6.6, w: 1.9, swing: [0, -1] }] }, // paddock front onto the lane
    { a: [-6, 2.5], b: [-6, 9], H: 1.3, rails: R2 },
    { a: [-6, 9], b: [6, 9], H: 1.3, rails: R2 },
    { a: [6, 2.5], b: [6, 9], H: 1.3, rails: R2 },
  ],
  wallow: { x: 2.6, z: -4.6, rx: 1.6, rz: 1.15 },
  shelter: { x0: 2.6, x1: 5.85, z0: -2.3, z1: -0.08, front: 1.38, back: 0.95 },
  pigTrough: { x: 0.55, z: -1.5, len: 1.1 },
  hay: { x: -4.8, z: -1.1 },
  waterTrough: { x: -4.2, z: 8.15, len: 2 },
  hayRack: { x: 4.1, z: 8.05, len: 2.2 },
  lamps: [{ id: 'lamp-south', x: 0, z: -7.95, arm: [0, -1] }, { id: 'lamp-lane', x: -6.45, z: 1.25, arm: [1, 0] }],
  bucket: { x: 1.7, z: 2.12 }, stool: { x: 2.35, z: 2.05 },
  grid: { gx0: -7, gz0: -9, gs: 1, gw: 15, gh: 20 }, // params.hg: ground offsets sampled on this grid at spawn
};
export const PENS = {
  fold: { x0: -6, x1: 0, z0: -7.5, z1: 0, avoid: [{ x: -4.8, z: -1.1, r: 1.0 }] },
  sty: { x0: 0, x1: 6, z0: -7.5, z1: 0, avoid: [{ x: 0.55, z: -1.5, r: 0.7 }, { x: 2.6, z: -2.3, r: 0.35 }, { x: 5.85, z: -2.3, r: 0.35 }], wallow: LAYOUT.wallow },
  paddock: { x0: -6, x1: 6, z0: 2.5, z1: 9, avoid: [{ x: -4.2, z: 8.15, r: 1.5 }, { x: 4.1, z: 8.05, r: 1.6 }] },
};
const S = '/cdn/moodboard-lowpoly-cozy/';
export const SPECIES = {
  sheep: { pen: 'fold', r: 0.65, speed: 0.45, walkClip: 1, step: [1, 3.2], restScale: 1, calls: [S + 'sfx-sheep-bleat.mp3'], callRate: 1, callY: 0.75,
    clips: {
      idle: { duration: 3.4, tracks: { neck: { pitch: [0, 6, 0, -4, 0], yaw: [0, 14, 14, -10, 0] }, tail: { yaw: [0, 18, -18, 18, 0] } } },
      graze: { duration: 1.8, tracks: { neck: { pitch: [-70, -76, -70, -75, -70], yaw: [0, 5, 0, -5, 0] }, root: { pitch: [-5, -5, -5, -5, -5] } } },
      walk: { duration: 0.9, tracks: { legFL: { pitch: [20, -20, 20] }, legBR: { pitch: [20, -20, 20] }, legFR: { pitch: [-20, 20, -20] }, legBL: { pitch: [-20, 20, -20] }, neck: { pitch: [-8, -4, -8] }, root: { y: [0, 0.015, 0, 0.015, 0] } } },
    } },
  pig: { pen: 'sty', r: 0.6, speed: 0.4, walkClip: 1.1, step: [0.8, 3], restScale: 1.3, wallowChance: 0.3, lieChance: 0.6, calls: [S + 'sfx-pig-oink.mp3'], callRate: 1.2, callY: 0.5,
    clips: {
      idle: { duration: 2.6, tracks: { neck: { pitch: [0, -6, 0, -4, 0], yaw: [0, 12, 0, -12, 0] }, tail: { yaw: [0, 30, -30, 30, 0] } } },
      graze: { duration: 1.1, tracks: { neck: { pitch: [-26, -34, -24, -34, -26], yaw: [0, 8, -4, -8, 0] }, root: { pitch: [-3, -3, -3, -3, -3] }, tail: { yaw: [10, -10, 10] } } },
      walk: { duration: 0.6, tracks: { legFL: { pitch: [24, -24, 24] }, legBR: { pitch: [24, -24, 24] }, legFR: { pitch: [-24, 24, -24] }, legBL: { pitch: [-24, 24, -24] }, neck: { pitch: [-6, -2, -6] }, tail: { yaw: [15, -15, 15] } } },
      lie: { duration: 4, tracks: { root: { y: [-0.21, -0.2, -0.21], roll: [24, 25, 24] }, legFL: { pitch: [70, 70, 70] }, legFR: { pitch: [70, 70, 70] }, legBL: { pitch: [-70, -70, -70] }, legBR: { pitch: [-70, -70, -70] }, neck: { pitch: [-8, -6, -8] } } },
    } },
  cow: { pen: 'paddock', r: 1.15, speed: 0.35, walkClip: 0.8, step: [1.2, 4], restScale: 1.6, calls: [S + 'sfx-cow-moo.mp3'], callRate: 0.6, callY: 1.2,
    clips: {
      idle: { duration: 4.2, tracks: { neck: { pitch: [0, 4, 0, -3, 0], yaw: [0, 10, 10, -8, 0] }, tail: { yaw: [0, 22, -22, 14, 0] } } },
      graze: { duration: 2.4, tracks: { neck: { pitch: [-62, -68, -62, -67, -62], yaw: [0, 6, 0, -6, 0] }, root: { pitch: [-6, -6, -6, -6, -6] }, tail: { yaw: [0, 25, -25, 0, 0] } } },
      walk: { duration: 1.2, tracks: { legFL: { pitch: [16, -16, 16] }, legBR: { pitch: [16, -16, 16] }, legFR: { pitch: [-16, 16, -16] }, legBL: { pitch: [-16, 16, -16] }, neck: { pitch: [-10, -6, -10], yaw: [-3, 3, -3] }, tail: { yaw: [8, -8, 8] } } },
    } },
};
export const HERD = {
  tick: 0.5, wakeRadius: 80, sleepSeconds: 10, // nobody within 80 m: the manager sleeps
  restChance: 0.6, grazeChance: 0.6, restMs: [5000, 14000], retryMs: 2500,
  callRadius: 22, callChance: 0.0035, callVolume: 0.55, callRange: 18, // per animal per second, only while a player is within callRadius of it
  bed: { clip: S + 'sfx-quiet-livestock-pen-ambience.mp3', gain: 0.12, maxDistance: 20 },
};
