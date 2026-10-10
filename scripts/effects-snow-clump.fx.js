// A clump of snow shed off a branch (W7): a few lumps drop, powder sifts after them in the wind, a puff where each lands.
// params: amount 0..1 (clump size), dx,dz (wind toward). One-shot: every population bursts once, then it removes itself.
import { fx, pop, attr, range, curve, vec3, sphere, sphereDir, sprite, mesh, gravity, drag, curl, up, when } from 'builtin/fx';
export function effect(ctx) {
  const P = ctx.params || {}, num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const a = Math.max(.2, Math.min(1, num(P.amount, 1))), dx = num(P.dx, 0), dz = num(P.dz, 0);
  const small = ctx.quality === 'low' || ctx.device?.class === 'mobile';
  const lumps = pop('lumps', {
    spawn: { on: sphere({ radius: .35 }), burst: { count: [Math.round(3 + 3 * a), Math.round(5 + 4 * a)] } }, lifetime: range(2.5, 3.5),
    init: { v: vec3(dx * .5, -.4, dz * .5).add(sphereDir().mul(.5)), size: range(.07, .12 + .08 * a), spin: range(-4, 4) },
    accel: gravity().add(drag(.3)), floor: 'die', collide: 'die', size: attr('size'), rotation: attr('age').mul(attr('spin')),
    color: vec3(.93, .95, .98), render: mesh({ shape: 'sphere', dims: [1, .8, 1] })
  });
  const sift = pop('sift', {
    spawn: { on: sphere({ radius: .7 }), burst: { count: [Math.round((small ? 20 : 40) * a), Math.round((small ? 35 : 70) * a)] } }, lifetime: range(1.6, 2.8),
    init: { v: vec3(0, -.6, 0).add(sphereDir().mul(.35)), size: range(.02, .04) },
    accel: gravity().mul(.12).add(curl(.5).mul(.5)).add(vec3(dx * .8, 0, dz * .8)).add(drag(1.4)), floor: 'die', collide: 'die',
    size: attr('size'), color: vec3(.95, .97, 1), alpha: curve([0, 0], [.08, .9], [.7, .8], [1, 0]),
    render: sprite({ texture: 'textures/snowflake', blend: 'alpha', soft: .04, lit: true })
  });
  const puff = pop('puff', {
    spawn: when(lumps.dies, { count: 2, probability: 1 }), lifetime: range(.7, 1.2),
    init: { v: up(.35).add(sphereDir().mul(.35)), size: range(.25, .45) }, accel: drag(2.2).add(vec3(dx * .4, 0, dz * .4)),
    size: attr('size').mul(curve([0, .6], [1, 1.8])), color: vec3(.93, .95, .98), alpha: curve([0, .55], [1, 0]),
    render: sprite({ texture: 'textures/smoke-puff', blend: 'alpha', soft: small ? 0 : .3, lit: true })
  });
  return fx(lumps, sift, puff);
}
