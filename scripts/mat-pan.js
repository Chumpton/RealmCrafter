// PANNING CYLINDER (creator 2026-10-10, how WoW builds spells: "ground circles (Consecration, Flamestrike) and projectile
// bodies are low-poly cylinders or cones whose texture coordinates are panned continuously along Y").
// Worn by an open cylinder. The "texture" is stretched noise read in the cylinder's own space (no seam around it), its V
// sliding with time, so tongues of colour climb (speed > 0) or fall. Fades in at the foot, out at the lip, and over its life:
// params t0 = shader-clock second it was born, life = seconds; r g b = colour (hdr ok), speed, twist, freq, glow.
import { vec3, float, time, positionLocal, uv, smoothstep, clamp, mx_noise_float, pow, mix, sin, atan2 } from 'builtin/tsl';
import { MeshBasicNodeMaterial, NormalBlending, DoubleSide } from 'builtin/three';
export function material(ctx) {
  const m = new MeshBasicNodeMaterial();
  m.transparent = true; m.depthWrite = false; m.blending = NormalBlending; m.side = DoubleSide;
  const col = vec3(ctx.param('r', 1), ctx.param('g', 0.5), ctx.param('b', 0.15));
  const speed = ctx.param('speed', 1.5), twist = ctx.param('twist', 0), freq = ctx.param('freq', 3), glow = ctx.param('glow', 1);
  const t0 = ctx.param('t0', 0), life = ctx.param('life', 1);
  const v = uv().y;
  const ang = atan2(positionLocal.z, positionLocal.x);
  const tt = time.mul(speed);
  // two layers of tall noise: the angle runs through sin/cos so it closes around, the height runs down the clock
  const p1 = vec3(sin(ang.add(tt.mul(twist))).mul(freq), positionLocal.y.mul(freq.mul(0.35)).sub(tt), float(0).add(ang.cos().mul(freq)));
  const p2 = vec3(sin(ang.mul(2).sub(tt.mul(twist))).mul(freq.mul(1.7)), positionLocal.y.mul(freq.mul(0.6)).sub(tt.mul(1.6)), ang.mul(2).cos().mul(freq.mul(1.7)));
  const n = clamp(mx_noise_float(p1).mul(0.6).add(mx_noise_float(p2).mul(0.4)).mul(1.4).add(0.5), 0, 1);
  const tongues = smoothstep(0.35, 0.8, n);                              // hard-ish toon bands, not mush
  const foot = smoothstep(0.0, 0.08, v), lip = float(1).sub(smoothstep(0.35, 1.0, v));
  const age = time.sub(t0).div(life);
  const env = smoothstep(0.0, 0.12, age).mul(float(1).sub(smoothstep(0.6, 1.0, age)));
  const a = tongues.mul(foot).mul(pow(lip, 1.4)).mul(env).mul(glow);
  const hot = mix(col, vec3(1, 1, 1).mul(col.length().mul(0.6)), smoothstep(0.75, 1, n).mul(0.5)); // hottest tongue tips lift toward white, never all white
  m.colorNode = hot; // creator 2026-10-10 "more matte and cartoony": flat colour, normal blend
  m.opacityNode = a;
  return m;
}
