// W22 S1/S2: cloud shadows over the land. cloud-sync writes the look params csK/csCover/csScale/csSoft/csSeed from these;
// look-hearth.js draws them (outdoors only: the hall's screen wears look-hall.js). Per JEV sky-story cloud kind:
// k = how dark a shadow gets at noon, scale = metres across a cloud's shadow, soft = edge width.
export const SHADE = {
  height: 320,                 // m above the ground the shadow is cast from: low sun stretches and slides it
  cover: { from: 0.08, k: 1.25 }, // cloud-sync's cover 0..1 -> how much of the ground lies in shade
  stories: {
    wisps: { k: 0.16, scale: 150, soft: 0.22 },
    heaps: { k: 0.4, scale: 300, soft: 0.09 },
    lid:   { k: 0.22, scale: 520, soft: 0.26 },
  },
  overcast: 0.85,              // above this cover the patches merge into one shade: k fades so the land doesn't blotch
  q: 50,                       // params step in 1/50 so the look recompiles never and rewrites rarely
};
