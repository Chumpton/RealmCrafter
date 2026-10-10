import { petPlate } from './lib/pet-plate.js';
// Campton's wolf pup: summoned once per visit on his own machine; the pup lives for the session and follows him.
const CAMPTON = 'pa_d69d1b1f0d7352adedf69f2ee39457a4';
const WOLF = '/cdn/value.59b5bd23065a2c4034bea09bfd07fbe0aeafef8dcf3376666599a17602166594.glb'; // 2026-10-09 texture pass: 512 px fur, the pink key cut out (was value.49d254…)
export const updateSchedule = { every: { seconds: 2 } };
export function update(ctx) {
  const me = ctx.self;
  if (!me.isLocal || me.userId !== CAMPTON) return ctx.sleep(3600);
  const id = ctx.session.wolfPup, old = id ? ctx.getObject(id) : null;
  if (old && old.state?.name === 'Jeffery' && old.state?.plate === 2) return;
  if (old) ctx.destroy(id); // an older pup from before he was Jeffery
  const f = me.feetPosition;
  ctx.session.wolfPup = ctx.spawn({
    model: WOLF, scale: 0.68, /* Campton 2026-10-09: 2x */ castShadow: true, scope: 'session', audience: 'near',
    feetPosition: { x: f.x + 1.5, y: f.y + 0.5, z: f.z + 1.5 },
    physics: { body: 'character', collider: 'capsule' },
    mixer: { base: { clip: 'Idle', weight: 1, loop: 'loop' } },
    behavior: 'scripts/pet-wolf.js', tags: ['pet', 'campton-pet'],
    state: { owner: me.id, name: 'Jeffery', plate: 2 },
    children: [{ id: 'plate', feetPosition: { x: 0, y: 3.1, z: 0 }, // local units: x 0.68 = about 2.1 m over his paws
      vector: petPlate('Jeffery') }],
  });
}
