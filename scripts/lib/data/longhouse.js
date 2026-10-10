// The longhouse contract — every lane builds to these numbers. World coordinates, metres, Y up, lake to −Z.
// Long axis runs along X. Floor (packed earth + plank aisle) is y 24.0; prepared ground outside is 23.55.
import { HR } from './hall-real.js';
export const HALL = {
  floorY: 24.0,
  groundY: 23.55,
  center: { x: 10, z: 1.5 },
  outer: { x0: -3, x1: 23, z0: -3.5, z1: 6.5 },      // wall outer faces (long walls may bow out up to 0.4 m at mid-length)
  inner: { x0: -2.6, x1: 22.6, z0: -3.1, z1: 6.1 },  // wall inner faces
  eaveH: (HR.eaveTall ?? false) ? 4.0 : 2.6,         // wall top above floor (HALL-REAL-SHELL S-a: y 28.0 under HR.eaveTall, else y 26.6)
  ridgeH: HR.tall ? 11.5 : 8.0,                      // ridge above floor (y 35.5 when tall, y 32 when not; scripts/lib/data/hall-real.js)
  smokeHole: { x: 10, z: 1.5, w: 3.0, d: 1.2 },      // open slot in the roof ridge above the hearth
  posts: { zs: [-1.87, 4.87], xs: [0.4, 2.45, 6.8, 10, 13.2, 15.6, 19.6], r: 0.17 }, // two rows of roof posts; the 15.6 bay stands clear of the back door (was 16.4, in its path); the 2.45 bay clear of the main door (was 3.6, 0.2 m off its centre line 1.4 m in — round-7 walkway sweep; furn-shield-2 moved with it); FLOW 2026-10-04: zs -1.6/4.6 → -1.87/4.87, each post's hall face flush with its platform edge (-1.7 / 4.7), out of the aisles
  benches: {                                          // raised platforms (sleeping/sitting benches) along both long walls
    south: { x0: 1.4, x1: 18.8, z0: -3.1, z1: -1.7, h: 0.45 },
    north: { x0: 1.4, x1: 18.8, z0: 4.7, z1: 6.1, h: 0.45, gap: { x0: 7.2, x1: 8.8 } }, // gap = the square door's approach
  },
  seatEdge: { south: -1.75, north: 4.75, seatH: 0.45 },   // where a seated body's knees sit, facing the hearth
  tables: {                                               // trestle tables in front of the benches, top at y floor+0.78
    // FLOW 2026-10-04: every table flush against its platform edge; the north side is two 2-person tables (1.5 × 0.5) with the back door's approach open
    south: [{ x0: 4.5, x1: 8.4, z0: -1.7, z1: -1.0 }, { x0: 11.6, x1: 14.7, z0: -1.7, z1: -1.0 }],
    north: [{ x0: 11.55, x1: 13.05, z0: 4.2, z1: 4.7 }, { x0: 13.85, x1: 15.35, z0: 4.2, z1: 4.7 }],
    topH: 0.78,
  },
  // FLOW 2026-10-04: the long trench (x 5..15, 1.5 wide) is two oval fire pits 1.05 wide (−30 %) with a flagstone crossing between;
  // x0..x1/z0..z1 stay the bounding box (snow-sound warmth reads it); the row's origin stays at (cx, cz)
  hearth: { x0: 6.8, x1: 14.1, z0: 0.975, z1: 2.025, curbH: 0.25, cx: 10, cz: 1.5,
    pits: [{ x: 8, rx: 1.2 }, { x: 12.8, rx: 1.3 }], bridge: { x0: 9.35, x1: 11.35, z0: 0.45, z1: 2.55 } },
  spit: { x: 12.8, z: 1.5, h: 0.9 },                  // the roasting spit over the hearth's east fire (feast lane)
  dais: { x0: 19.4, x1: 22.6, z0: -1.4, z1: 4.4, h: 0.3 },       // raised east end
  highSeat: { x: 21.6, z: 1.5, faceYaw: 90 },         // jarl's chair, facing −X down the hall
  loft: { x0: -2.6, x1: 1.2, z0: -3.1, z1: 6.1, deckH: 2.3, ladder: { x: 1.4, z: 1.5 } }, // west-end sleeping loft
  doors: {
    main: { x: 3.4, z: -3.5, w: 1.3, h: 2.2, faces: '-z' },   // south long wall, toward the lake and the yard
    back: { x: 16.6, z: 6.5, w: 1.2, h: 2.1, faces: '+z' },   // north long wall, toward the uphill yard
    square: { x: 8.0, z: 6.5, w: 1.1, h: 2.3, faces: '+z' },  // the existing square-door tree moves here (keep its approach clear)
    portal: { x: -3, z: 1.5, w: 1.6, h: 2.2, faces: '-x' },   // west gable, toward the gateway path (HALL-REAL-SHELL S-c); hall-shell cuts it only under HR.shell
  },
  zones: {                                            // who owns which floor area inside
    loom: { x: 20.3, z: 5.4 }, chest: { x: 20.0, z: -2.5 }, weaponRack: { x: 22.3, z: -2.0 },
    brewing: { x: 18.6, z: 5.3 }, boards: { x: 22.1, zs: [-0.45, 3.45], yaw: 90 }, cask: { x: 18.4, z: -2.6 }, hnefatafl: { x: 4.5, z: 5.3 },
    skald: { x: 10, z: 3.4 }, hound: { x: 7.5, z: -0.2 },
  },
  spawn: { x: 3.9, z: -0.4, yaw: -90 },               // inside, just past the main door, looking down the hall toward the fire; x 3.9 (was 5.2) keeps the straight line to the main door clear of feast table s1's west end (x 4.5)
  outside: {
    yard: { x0: -3, x1: 23, z0: -12, z1: -4 },        // trampled yard between hall and ledge edge (lake view)
    smithy: { x: 28, z: -1 }, woodpile: { x: 12, z: 7.6 }, goatPen: { x: 21, z: 12, r: 3.5 },
    smokehouse: { x: -10, z: 10 }, runestone: { x: -4.6, z: 2.2 },  // runestone beside the gateway path
    gatewayPath: 'places/main/config.yaml terrain.marks.firstGatewayWalk (runs x≈-5.4 from z -4 up to the arch at (-3.8, 25.4, 35))',
  },
};
