// LIGHTING lock-in · THE lamp contract (W2). Every lamp in the den is one of these rows; no lane invents a lamp.
// The holder is scripts/gen/lamp.js (params.kind), the flame + its ONE light are the fx scripts/lamp.js sets from state.lit,
// tuning is scripts/lib/data/lamps.js. Only Savi's lamp manager writes state.lit; add always: true (state: { kind, lit: false, always: true })
// for an indoor hearth that burns day and night. Frames: origin at the feet, front -Z. sconce: the wall sits 0.25 m behind the origin (+Z),
// the flame stands over the origin; hornLantern / tallowLamp sit on a shelf, table or hook; hearth's long axis is X.
import { LAMPS, LAMP_RANGE } from '../scripts/lib/data/lamps.js';
const glow = (kind) => { const L = LAMPS[kind]; return L.shadow ? { children: [{ id: 'glow', feetPosition: { x: 0, y: +(L.flameY + L.flameSize * .6).toFixed(3), z: 0 } }] } : {}; };
const row = (kind, solid) => ({
  tags: ['lamp'], state: { kind, lit: false }, behavior: 'scripts/lamp.js',
  primitive: { kind: 'scripted', script: 'scripts/gen/lamp.js', params: { kind } },
  material: { pbr: true }, castShadow: true, receiveShadow: true,
  ...(LAMP_RANGE[kind] ? { visibleRange: { min: 0, max: LAMP_RANGE[kind] } } : {}), // PERF2: draw range per kind; a row's own visibleRange wins
  ...(solid ? { physics: 'static' } : { castShadow: false }),
  ...glow(kind),
});
export const torch = row('torch', true);
export const brazier = row('brazier', true);
export const campfire = row('campfire', true);
export const bonfire = row('bonfire', true);
export const sconce = row('sconce', false);
export const tallowLamp = row('tallowLamp', false);
export const hornLantern = row('hornLantern', false);
export const lanternPost = row('lanternPost', true);
export const forge = row('forge', true);
export const hearth = row('hearth', true);
