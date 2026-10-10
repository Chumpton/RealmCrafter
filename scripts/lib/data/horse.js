// Horses (creator asks 2026-10-04): "a horse at the beginning of the trail … E … third person … riding very quickly to the
// mountaintop" and "hitting Z to ride own horse in 3rd person mode". Every tuned number for scripts/den-horse.js + camera.
export const HORSE = {
  trail: { mark: 'summit-trail', speed: 18, turn: 240, dismount: { x: 503, z: 307 }, homeAfter: 4 }, // m/s up the trail; s riderless at the top before she trots home (short: far from players she sleeps, so the rider must still be near)
  own: { walk: 5, gallop: 16, back: 3, accel: 10, decel: 14, turn: 110, jump: 6.5, grav: 22 }, // m/s, m/s², °/s
  ride: { walk: 9, gallop: 16, ease: 7, lift: 12, turn: 540, jump: 7 }, // Z mount (rider-owned, Oct 4 rebuild): m/s on WASD, Shift gallops; the rider's own body carries her
  seat: { x: 0, y: 1.17, z: 0.08 },     // rider's feet, horse-local: the sit pose puts the hips on the saddle (1.62)
  stepOff: { x: 1.1, z: 0.2 },          // where getting off puts you, horse-local
  probe: { y: 1.1, reach: 1.6 },        // chest-height feeler ahead: a wall stops her
  stride: 2.6,                          // m per gallop cycle
  cam: { dist: 11, up: 2.6, lookUp: 1.6, ease: 7 },  // Oct 4 creator: "zoom out to see character on top of horse riding" (was dist 7.5)  // third person: behind and over the rider
  sounds: {
    gallop: '/cdn/moodboard-lowpoly-cozy/sfx-horse-gallop-hooves-on-dirt-loop.mp3',
    neigh: '/cdn/moodboard-lowpoly-cozy/sfx-horse-whinny-neigh.mp3',
    snort: '/cdn/moodboard-lowpoly-cozy/sfx-horse-snort-mount.mp3',
  },
};
