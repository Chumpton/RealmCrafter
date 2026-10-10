// S4: melt drips. A rider on snow-melt/ice-* (kind line: along an eave, from the icicle tips) and snow-melt/tip-* (kind disc:
// branch tips of a birch crown / the vane arrow), set by scripts/snow-melt.js only within SNOW.budget.fxRange of a player.
// params k 0..1 (melt), line: half, y0 | disc: r, h0, h1. Two populations, rate capped per viewer class.
import { fx, pop, attr, range, curve, vec3, sprite, when, up, sphereDir, gravity, drag } from 'builtin/fx';
import { SNOW } from './lib/data/snow.js';
const D = SNOW.dripIce.drip, g = 4.9;
export function effect(ctx) {
  const P = ctx.params || {}, k = Math.max(0, Math.min(1, +P.k || 0));
  const low = ctx.quality === 'low', mobile = !low && ctx.device && ctx.device !== 'desktop';
  const cap = low ? D.low : mobile ? D.mobile : D.desktop;
  const line = P.kind !== 'disc';
  const half = +P.half || 13, r = +P.r || 1, y0 = +P.y0 || 0, h0 = +P.h0 || 0, h1 = +P.h1 || 0.1;
  const fall = line ? 3.1 - y0 : Math.max(0.5, h1 + 0.3);
  const drops = pop('drops', {
    spawn: { rate: k * cap * (line ? half / 13.3 : 1) }, lifetime: range(Math.sqrt(fall / g), Math.sqrt(fall / g) * 1.05), space: 'local',
    init: line ? { ox: range(-half, half), oz: range(-0.06, 0.06), hy: range(y0 - 0.04, y0), size: range(0.012, 0.02) }
               : { ox: range(-r, r), oz: range(-r, r), hy: range(h0, h1), size: range(0.012, 0.02) },
    pos: vec3(1, 0, 0).mul(attr('ox')).add(vec3(0, 0, 1).mul(attr('oz'))).add(vec3(0, 1, 0).mul(attr('age').mul(attr('age')).mul(-g).add(attr('hy')))),
    vel: vec3(0, -2 * g, 0).mul(attr('age')), floor: 'die',
    size: attr('size'), color: vec3(0.78, 0.86, 0.92), alpha: curve([0, 0], [0.1, 0.8], [1, 0.8]),
    render: sprite({ texture: 'textures/droplet', blend: 'alpha', align: 'velocity', stretch: 0.02, lit: true })
  });
  const splash = pop('splash', {
    spawn: when(drops.dies, { count: 2, probability: low ? 0.3 : 0.6 }), lifetime: range(0.14, 0.26),
    init: { v: up(0.6).add(sphereDir().mul(0.35)), size: range(0.01, 0.016) }, accel: gravity().mul(0.45).add(drag(3)),
    size: attr('size'), color: vec3(0.8, 0.87, 0.92), alpha: curve([0, 0.45], [1, 0]),
    render: sprite({ texture: 'textures/soft-disc', blend: 'alpha', soft: 0.03, lit: true })
  });
  return fx({}, drops, splash);
}
