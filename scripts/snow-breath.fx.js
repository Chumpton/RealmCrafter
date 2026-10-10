// W8: one breath of fog in the cold. A one-off at the mouth, emitted by scripts/snow-sound.js every ~3 s while snow is on,
// the air is below 0 C and the body is outdoors (fades by the hearth). params a = strength 0..1, dx/dz = facing.
import { fx, pop, range, curve, vec3, point, sprite, drag, attr } from 'builtin/fx';
export function effect(ctx) {
  const P = ctx.params || {}, a = Math.max(0, Math.min(1, +P.a || 0)), dx = +P.dx || 0, dz = +P.dz || 0;
  const low = ctx.quality === 'low';
  return fx({}, pop('breath', {
    spawn: { on: point({}), burst: { count: low ? [3, 4] : [5, 7] } }, lifetime: range(1.1, 1.8),
    init: { v: vec3(dx * 0.55, 0.06, dz * 0.55).add(vec3(range(-0.08, 0.08), range(0, 0.1), range(-0.08, 0.08))), size: range(0.05, 0.09) },
    accel: vec3(0, 0.12, 0).add(drag(1.6)),
    size: attr('size').mul(curve([0, 1], [1, 5.5])), color: vec3(0.93, 0.95, 0.98),
    alpha: curve([0, 0], [0.12, 0.34], [0.5, 0.2], [1, 0]).mul(a),
    render: sprite({ texture: 'textures/smoke-puff', blend: 'alpha', soft: 0.1, lit: true })
  }));
}
