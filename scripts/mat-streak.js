// STREAK RIBBON (creator 2026-10-10: "ribbon / trail meshes: dynamic quad strips connected to the projectile that fade in
// opacity over time to create streak trails"; Frostbolt: "less smoky and more like a streak like wow has it", "never too white").
// Worn by a bolt's rib(): a bright core line down the middle, its colour at the edge, thinning and fading toward the old end.
// params: core = how much the centre lifts toward pale (0..1), head = which end of uvAlong is the bolt (0 or 1).
import { float, vec3, smoothstep, abs, mix, pow } from 'builtin/tsl';
import { MeshBasicNodeMaterial, NormalBlending, DoubleSide } from 'builtin/three';
export function material(ctx) {
  const m = new MeshBasicNodeMaterial();
  m.transparent = true; m.depthWrite = false; m.blending = NormalBlending; m.side = DoubleSide;
  const f = ctx.fx, core = ctx.param('core', 0.35), head = ctx.param('head', 0);
  const along = mix(f.uvAlong, float(1).sub(f.uvAlong), head);           // 0 at the bolt, 1 at the tail's end
  const across = abs(f.uvAcross.sub(0.5)).mul(2);                         // 0 centre, 1 edge
  const width = mix(float(1), float(0.15), along);                        // taper: the strip narrows as it ages
  const body = float(1).sub(smoothstep(width.mul(0.5), width.mul(0.75), across)); // rounded toon edge
  const centre = float(1).sub(smoothstep(width.mul(0.22), width.mul(0.26), across)); // a hard toon core band
  const fade = pow(float(1).sub(along), 1.6);
  const c = mix(f.color, mix(f.color, vec3(0.85, 0.93, 1), core), centre);
  const a = body.mul(fade).mul(f.alpha);
  m.colorNode = c; // creator 2026-10-10 "more matte and cartoony": flat colour, normal blend
  m.opacityNode = a;
  return m;
}
