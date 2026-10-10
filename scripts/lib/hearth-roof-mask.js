// 1 inside the longhouse roof footprint (eaves overhang included) and below its ridge, else 0.
// Rain and snow multiply their alpha by (1 − mask) so no weather falls inside the hall.
import { vec3 } from 'builtin/fx';
import { HALL } from './data/longhouse.js';
export const ROOF = { margin: 0.8, top: HALL.floorY + HALL.ridgeH + 0.4 };
export function hallRoofMask(p) {
  const o = HALL.outer, m = ROOF.margin, px = p.dot(vec3(1, 0, 0)), pz = p.dot(vec3(0, 0, 1)), py = p.dot(vec3(0, 1, 0));
  return px.add(-(o.x0 - m)).step(0).mul(px.neg().add(o.x1 + m).step(0))
    .mul(pz.add(-(o.z0 - m)).step(0)).mul(pz.neg().add(o.z1 + m).step(0))
    .mul(py.neg().add(ROOF.top).step(0));
}
