// Warships you sail (creator ask 2026-10-04: "more warships we can sail around"; 2026-10-04 later: "add ability to use all boats,
// 3rd person wide out view, add wheels, crews to all boats"). Every tuned number for scripts/warship.js, the wheel
// (scripts/gen/warship-helm.js), the crew (scripts/gen/ship-crew.js) and the sailing camera (scripts/camera.js).
// Lengths are hull-local metres at scale 1; warship.js multiplies by the hull's scale (the great drakkars are 2.1).
export const WS = {
  max: 7.5,        // m/s full sail ahead (~15 kn) at scale 1
  maxPerScale: 0.12, // a bigger hull is a bit faster: max × (1 + this × (scale − 1))
  rev: 1.6,        // m/s backing with the oars
  accel: 0.9,      // m/s² gaining way
  decel: 0.6,      // m/s² losing way (sail eased or nobody at the helm)
  turn: 16,        // °/s at full rudder once she has way on (÷ √scale)
  turnFull: 3,     // m/s where the rudder bites fully
  turnMin: 0.3,    // share of the rudder at a standstill (she still swings, slowly)
  half: 8.4,       // m bow/stern tip from midship (× scale)
  draft: 0.9,      // m: ground shallower than this under the bow stops her (× scale)
  bob: 0.05, pitch: 0.8, lean: 0.45, maxLean: 5,
  helm: { x: 0, y: 0.55, z: 4.7 },        // the wheel's pedestal, hull-local (stern, on the centreline)
  stand: { x: 0, y: 0.56, back: 0.62 },   // helmsman's feet: behind the wheel by `back` WORLD metres, facing the bow
  stepOff: { x: 0.2, y: 0.6, z: 4.0 },    // where letting go of the helm puts you, hull-local
  wheel: 140,      // ° the wheel turns at full rudder; eased at wheelRate /s, written when it moves > 2°
  wheelRate: 3,
  hud: 4,          // Hz the HUD rows update
  homeAfter: 180,  // s unmanned before she's back at her berth
  cam: { dist: 22, up: 9, lookUp: 3, ease: 4, minPitch: -50, maxPitch: -3, pilot: 3.2, zoomMin: 0.4, zoomMax: 12 }, // pilot: × dist at the wheel (Oct 4: "zoom way way out to see entire boat"); wheel zooms zoomMin..zoomMax // the wide stern view (dist, lookUp × scale; up × scale^0.6)
  crewEvery: 6,    // ticks between writes of the hull's stroke phase (state.stroke)
  sounds: {
    rush: '/cdn/moodboard-lowpoly-cozy/sfx-longship-hull-water-rush-and-timber-creak-loop.mp3',
    unfurl: '/cdn/moodboard-lowpoly-cozy/sfx-canvas-sail-unfurl-flap.mp3',
    furl: '/cdn/moodboard-lowpoly-cozy/sfx-canvas-sail-lowered-rustle.mp3',
    bump: '/cdn/moodboard-lowpoly-cozy/sfx-wooden-hull-bump-thud.mp3',
    helm: '/cdn/moodboard-lowpoly-cozy/sfx-wooden-tiller-creak-grab.mp3',
  },
};

// The crew: rowers sit on the sea chests (small ships) or stand at the rail (great ships), each with an oar; one lookout at the prow.
// Crew-frame metres (a crew row is scaled 1/hull so its body is life-size): the rower faces +Z (aft), outboard is +X × side.
export const CREW = {
  sit: { hip: 0.1, lock: [0.62, 0.12, 0.5], Lo: 2.4, Li: 0.85, water: -0.95 },   // seat = chest top (hull y .95)
  stand: { hip: 0.95, lock: [0.75, 1.0, 0.5], Lo: 4.0, Li: 0.7, water: -1.155 },  // feet on the deck (hull y .55 × 2.1)
  cycle: 2.4,      // s per stroke at speed 1
  small: { rowZ: [-2.4, 1.2], rowX: 1.5, rowY: 0.95, sit: true },
  great: { rowZ: [-3.0, -1.8, 1.8, 3.0], rowX: 1.7, rowY: 0.55, sit: false },
  look: { x: 0, y: 0.56, z: -5.5 },
  range: 120,      // m: past this the crew are not drawn
};
export function crewBones() {
  const s = CREW.sit, t = CREW.stand;
  return {
    root: { pivot: [0, 0, 0] },
    spine0: { parent: 'root', pivot: [0, s.hip, 0] }, spine1: { parent: 'root', pivot: [0, t.hip, 0] },
    arms0: { parent: 'spine0', pivot: [0, s.hip + 0.5, 0] }, arms1: { parent: 'spine1', pivot: [0, t.hip + 0.5, 0] },
    head: { parent: 'spine1', pivot: [0, t.hip + 0.6, 0] }, armR: { parent: 'spine1', pivot: [-0.19, t.hip + 0.5, 0] },
    oar0s: { parent: 'root', pivot: [s.lock[0], s.lock[1], s.lock[2]] }, oar0p: { parent: 'root', pivot: [-s.lock[0], s.lock[1], s.lock[2]] },
    oar1s: { parent: 'root', pivot: [t.lock[0], t.lock[1], t.lock[2]] }, oar1p: { parent: 'root', pivot: [-t.lock[0], t.lock[1], t.lock[2]] },
  };
}
// one stroke: catch (lean aft, blade forward) → drive (blade in, pull) → finish (lean back) → feather (blade up) → recovery
const K = (ts, vs) => ts.map((t, i) => [t * CREW.cycle, vs[i]]);
const T = [0, 0.21, 0.42, 0.5, 0.75, 1];
export function rowClip(side) {
  const sd = side >= 0 ? 1 : -1, k = sd > 0 ? 's' : 'p';
  const spine = K(T, [16, 2, -14, -14, 4, 16]), arms = K(T, [-11, -1, 10, 10, -3, -11]);
  const yaw = K(T, [26, 2, -22, -22, 8, 26].map((v) => v * sd)), roll = K(T, [0, -1.5, 0, 6, 6, 0].map((v) => v * sd));
  return { name: 'ship-row-' + k, duration: CREW.cycle, tracks: { spine0: { pitch: spine }, spine1: { pitch: spine.map(([t, v]) => [t, v * 0.7]) }, arms0: { pitch: arms }, arms1: { pitch: arms }, ['oar0' + k]: { yaw, roll }, ['oar1' + k]: { yaw, roll } } };
}
export const LOOK_CLIP = { name: 'ship-lookout', duration: 9, tracks: {
  head: { yaw: [[0, 0], [2, 38], [3.5, 38], [5, -32], [6.5, -32], [9, 0]] },
  armR: { pitch: [[0, 0], [5.2, 0], [5.8, -100], [7.4, -100], [8.1, 0], [9, 0]] },
  spine1: { pitch: [[0, 0], [5.4, 0], [5.9, -4], [7.4, -4], [8.1, 0], [9, 0]] } } };

// AUTO-VOYAGE (creator 2026-10-04: "make some of the warships active … some are leaving, some are going … make dock area more active").
// A voyager rests at her berth, rows straight out her lane (sliding `lane` off her pier so her beam clears the pier head),
// sails her route (sail set and bellied offshore, oars shipped), comes back to her lane, pivots on her oars and backs into the
// berth, rests `rest` s, again. `first` staggers them: one leaving, one out, one coming in. A player at her wheel pauses it;
// letting go resumes from the nearest waypoint. Ground is checked (heights < −4 along every leg, 2026-10-04). Points are world x, z.
export const VOYAGE = {
  harbor: 2.2,   // m/s rowing near the docks / in the lane
  sea: 0.85,     // × her top speed offshore, under sail
  back: 1.2,     // m/s backing into the berth
  slowR: 60,     // m from her lane point inside which she rows slow
  arrive: 22,    // m: a sea waypoint counts as reached
  turn: 10,      // °/s heading change at sea (÷ √scale); harbor pivot on the oars uses `pivot`
  pivot: 9,
  ships: {
    'war-pier-1-ship-2': { lane: [-114, -185], route: [[-150, -260], [-150, -380], [-90, -410], [-120, -320]], rest: 120, first: 5 },
    'war-pier-6-ship-1': { lane: [92, -185], route: [[130, -250], [140, -340], [90, -400], [40, -320], [40, -240]], rest: 100, first: 110 },
    // the Holmvik run: down the buoy channel to off the isle and home again
    'warship-storm-mare': { lane: [-15, -160], route: [[-10, -200], [-4, -265], [2, -330], [8, -400], [14, -470], [30, -515], [-2, -505], [-8, -420], [-14, -300], [-20, -210]], rest: 150, first: 215 },
  },
};
