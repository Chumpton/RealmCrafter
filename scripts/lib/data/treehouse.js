// The mother-tree treehouse (creator asks 2026-10-04: "a ladder up the mother tree and a tree house sticking out the top right";
// then "bigger, up higher, and sticking out of the top foliage not under it"). It crowns the tree now: the deck rings the trunk's
// leader at world y 51 (tree-local 28.04), the cabin and roof stand clear above the green dome, a crow's nest over the deck.
// Row frame: origin = the leader's axis at deck height, yaw 15 (local -Z = the cabin's reach, toward the lake side of the crown).
// Every number the generators (scripts/gen/mother-treehouse.js, scripts/gen/mother-tree.js) and the climb
// (scripts/lib/data/ladders.js) share lives here. origin must equal the mother-treehouse row's feetPosition in places/main/cells/x0z0.scene.
const R = Math.PI / 180;
// the tree's central leader (tree-local): a bark tube from the old trunk top up through the crown, leaning a breath
export const LEAD = { y0: 12.6, y1: 28.6, x0: 0.34, z0: -0.3, dx: -0.25, dz: 0.25, bow: 0.12, r0: 0.9, r1: 0.55 };
export function leaderAt(yt) {
  const s = (yt - LEAD.y0) / (LEAD.y1 - LEAD.y0);
  return { x: LEAD.x0 + LEAD.dx * s + LEAD.bow * Math.sin(Math.PI * s), z: LEAD.z0 + LEAD.dz * s, r: LEAD.r0 + (LEAD.r1 - LEAD.r0) * s };
}
// the trunk's axis and bark radius at tree-local height yt (the old trunk tube below 13, the leader above)
export function trunkAt(yt) {
  if (yt >= 13) return leaderAt(yt);
  const t = Math.max(0, Math.min(1, (yt + 0.4) / 13.5));
  return { x: 0.5 * Math.sin(t * 2.4), z: -0.3 * t * t, r: 1.55 - 0.55 * t + 1.3 * Math.pow(1 - t, 6) };
}
const DECK_T = 28.036;                       // deck height, tree-local y
const OFF = leaderAt(DECK_T);                // the leader's axis at the deck, tree-local (x 0.1121, z -0.0588)
export const TH = {
  id: 'mother-treehouse',
  origin: { x: -41.932, y: 51.0, z: 3.893 }, yaw: 15,   // = tree (-42, 22.964, 4) yaw 30 + OFF rotated; row ⇄ scene agree
  tree: { x: -42, y: 22.964, z: 4, yaw: 30 }, deckT: DECK_T, treeOff: { x: OFF.x, z: OFF.z },
  ground: -28.05,                            // terrain (22.95) under the first flight's foot, row-local y
  deck: { rin: 0.78, rout: 4.0, rail: 3.9, hatch: { ang: -27.5, half: 15, r0: 1.55, r1: 2.75 }, cabinFrom: 2, cabinTo: 7,
    B: [2.5, -12.5, -42.5, -57.5, -77.5, -97.5, -117.5, -137.5, -157.5, -177.5, -197.5, -217.5, -237.5, -257.5, -277.5, -297.5, -317.5, -337.5, -357.5] },
  // three flights ground → landing 1 → landing 2 → deck hatch, then the nest ladder off the deck. gap = metres off the bark.
  flights: [
    { id: 'mother-tree-1', ang: -112, y0: -28.05, y1: -19.036, g0: 0.68, g1: 1.4 },
    { id: 'mother-tree-2', ang: -75, y0: -19.036, y1: -9.036, g0: 1.05, g1: 1.4 },
    { id: 'mother-tree-3', ang: -27.5, y0: -9.036, y1: 0, g0: 1.05, g1: 1.19 },
    { id: 'mother-tree-nest', ang: 90, y0: 0, y1: 5.4, g0: 1.88, g1: 1.33, mast: true },
  ],
  landings: [{ y: -19.036, a0: -128, a1: -59, w: 1.4 }, { y: -9.036, a0: -91, a1: -11.5, w: 1.4 }],
  ladder: { half: 0.31, rung: 0.3 },
  nest: { y: 5.4, r: 1.5, mastTop: 6.7 },
  plat: { x: 3.35, z0: -2.0, z1: -10.75 },
  cabin: { xi: 3.0, xo: 3.14, zi0: -2.9, zo0: -2.76, zi1: -10.4, zo1: -10.54, h: 3.0, ridge: 6.0, eave: 3.75, eaveY: 2.417, rz0: -2.15, rz1: -11.15,
    door: [0.4, 1.5, 2.25], winHamlet: [-7.4, -6.2, 1.0, 1.9], winLake: [-0.5, 0.7, 1.0, 2.0], winFront: [-2.4, -1.4, 1.0, 1.9] },
  lampIn: [[-0.9, 2.3, -4.9], [0.9, 2.3, -8.4]], deckLamps: [2.5, -197.5, -297.5], flue: [-2.6, -6.5, 4.5], crane: 150, nestGap: 25,
};
// the trunk at row-local height y, in the row frame: axis {x, z} and bark radius r (above the deck: the nest mast)
export function trunkRow(y) {
  if (y > 0.05) return { x: 0, z: 0, r: 0.42 - 0.033 * y };
  const t = trunkAt(y + DECK_T), dx = t.x - OFF.x, dz = t.z - OFF.z, c = Math.cos(15 * R), s = Math.sin(15 * R);
  return { x: dx * c + dz * s, z: -dx * s + dz * c, r: t.r };
}
// a point gap metres off the bark at row height y along row azimuth ang (degrees)
export function offBark(y, ang, gap) {
  const t = trunkRow(y), c = Math.cos(ang * R), s = Math.sin(ang * R);
  return [t.x + c * (t.r + gap), y, t.z + s * (t.r + gap)];
}
// a flight's rung line in the row frame: foot, top, out (horizontal unit away from the trunk)
export function flightLine(f) {
  return { foot: offBark(f.y0, f.ang, f.g0), top: offBark(f.y1, f.ang, f.g1), out: [Math.cos(f.ang * R), 0, Math.sin(f.ang * R)] };
}
