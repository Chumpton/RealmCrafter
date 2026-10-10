// Editor zones (creator 2026-10-09: "replace all ... do all in zone, not world or area"). A piece belongs to the nearest zone centre
// (a Voronoi split of the main island), so every spot on the map is in exactly one zone. Add a row to split a zone; move x/z to reshape it.
export const ZONES = [
  { name: 'Longhouse', x: 4, z: 0 }, { name: 'Mother Tree', x: -33, z: 6 }, { name: 'Portal Ring', x: -9, z: 41 }, { name: 'Harbor', x: -2, z: -60 },
  { name: 'Farm & Mill', x: 62, z: 28 }, { name: 'Pasture', x: -46, z: 78 }, { name: 'Ravenholdt', x: -40, z: 170 }, { name: 'Long Road', x: 10, z: 300 },
  { name: 'West Woods', x: -200, z: 120 }, { name: 'West Farmlands', x: -330, z: 220 }, { name: 'Delaware', x: -515, z: 500 },
  { name: 'Crayke', x: -40, z: 540 }, { name: 'Highwatch', x: 40, z: 860 }, { name: 'Lake Basin', x: 212, z: 618 }, { name: 'Hjalmar Heights', x: 546, z: 957 },
  { name: 'East Gate Fields', x: 230, z: 120 }, { name: 'Summit', x: 503, z: 313 }, { name: 'Redridge', x: 780, z: 230 }, { name: 'Autumn Vale', x: 560, z: -80 },
  { name: 'Redhollow', x: 1141, z: 472 }, { name: 'North Vale', x: 1050, z: 1022 }, { name: 'Far Harbor', x: 1578, z: 641 }, { name: 'Holmvik Isle', x: 10, z: -605 },
];
// The painted map (M) can rename, move, add and remove zones: the live list is world.state.mapZones, ZONES until an editor touches it.
export const liveZones = (ws) => (Array.isArray(ws?.mapZones) && ws.mapZones.length ? ws.mapZones : ZONES);
export function zoneOf(x, z, list) { const L = Array.isArray(list) && list.length ? list : ZONES; let b = L[0], bd = Infinity; for (const q of L) { const d = (x - q.x) ** 2 + (z - q.z) ** 2; if (d < bd) { bd = d; b = q; } } return b.name; }
// Map travel (scripts/travel-flight.js): Teleport and Gryphon flight from a zone name on the M map. Every tuned number.
export const MAP_TRAVEL = {
  fade: 0.45,            // s, the teleport's black blink
  safeRings: 7, safeStep: 6, dryAbove: 0.6, maxStep: 1.6, // safe landing search: rings of 6 m, above the sea, level within 1.6 m over 2 m
  speed: 40, maxSeconds: 85, // m/s cruise; a long route speeds up so no flight passes ~85 s
  clear: 40, look: 60, step: 15, // m over the highest ground within 60 m along the route, sampled every 15 m
  bow: 0.12, bowMax: 140, // the route's gentle sideways bow, share of its length, capped in m
  climbK: 0.6, descK: 0.5, // take-off climb and landing glide, m up per m along
  leadS: 0.6,            // s of route the autopilot aims ahead
};
