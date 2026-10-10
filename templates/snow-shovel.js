// The den's snow shovel (lane W5): the wall peg, the shovel that hangs on it (scripts/snow-shovel.js: E takes / sets back,
// hold left mouse to scoop, release to throw), and the heap that rides a held blade. Numbers: SNOW.shovel (scripts/lib/data/snow.js).
const GEN = 'scripts/gen/snow-shovel.js';
export const peg = {
  primitive: { kind: 'scripted', script: GEN, params: { part: 'peg' } }, material: { pbr: true },
  physics: 'none', castShadow: true, receiveShadow: true, tags: ['snow-shovel-peg'],
};
export const shovel = {
  primitive: { kind: 'scripted', script: GEN, params: { part: 'shovel' } }, material: { pbr: true },
  physics: 'none', castShadow: true, receiveShadow: true, behavior: 'scripts/snow-shovel.js',
  tags: ['interactable', 'snow-shovel'], state: { holder: null, heldId: null },
};
export const heap = {
  primitive: { kind: 'scripted', script: GEN, params: { part: 'heap' } }, material: { pbr: true },
  physics: 'none', castShadow: false, visibleInFirstPerson: true, tags: ['carried', 'snow-shovel-heap'],
};
