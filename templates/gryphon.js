import { petPlate } from '../scripts/lib/pet-plate.js'
// Wynx (scripts/gryphon.js): spawned by her rider's body (scripts/lib/wynx-ride.js); state.owner is who she follows.
export const gryphon = {
  model: '/cdn/model-gryphon-golden-wings-66p7p8oh.glb', // creator's golden gryphon upload 2026-10-06 (previous: /cdn/value.474cd761dff5546a1712faef3655ae66c0cbc0338dd87f120eced175534b2528.glb, rigged in art/griffin/build.py)
  scale: 2.0, // 1.85 → 2.22 → 2.0: Campton 2026-10-06 "20% bigger", then "10% smaller"
  mixer: { body: { clip: 'Stand', loop: 'loop', weight: 1 } },
  behavior: 'scripts/gryphon.js',
  tags: ['wynx', 'gryphon', 'hover-pick'], // hover-pick: a click finds her by her drawn box (creator 2026-10-06: click her, click a spot)
  castShadow: true,
  children: [{ id: 'plate', feetPosition: { x: 0, y: 2.05, z: 0 }, vector: petPlate('Wynx', 1.4) }], // Campton 2026-10-09: her name back, Jeffery's style (local units x2 = ~4.1 m up, 2.8 m wide)
};
