// W19b REAL AURORA: the northern lights painted into the sky as a shader, not particles.
// Worn by one local-only dome (sky-local-core.js). Every pixel reads its direction from the eye alone, so the curtains
// sit at true sky distance (no parallax when you walk) and move on their own clocks.
// Shape: each curtain is a thin folded sheet standing in a layer 100-300 km up. No per-pixel sampling (that was the grain):
// the view ray is split into a few height segments and the sheet's glow along each is integrated exactly (a gaussian sheet
// crossed by a straight line), so it is smooth at any quality. The fold is slow flowing noise read at each segment height.
// Rays are indexed by where the ray pierces the sheet, so they stand vertical in the sky and meet toward the zenith.
// Soft clumped rays over a haze, fading to haze where finer than a pixel; bright lower hem into tonight's crown colour.
// params (live uniforms, from place.state.auroraSky via sky-local-core): amount 0..1 · act 0..1 · speed · crown 0 green
// 1 violet 2 red · flare 0..1 substorm · pulse 0/1 breathing patches · north km the oval sits north of us · drift
// east-west slide · veil 0..1 overcast dimming (clouds in front still hide it by their own alpha).
import { vec3, float, time, positionWorld, cameraPosition, normalize, smoothstep, clamp, mix, exp, max, abs, fwidth, select, mx_noise_float, sin, cos, radians } from 'builtin/tsl';
import { MeshBasicNodeMaterial, AdditiveBlending, BackSide } from 'builtin/three';

export function material(ctx) {
  const m = new MeshBasicNodeMaterial();
  const amount = ctx.param('amount', 0.6), act = ctx.param('act', 0.5), speed = ctx.param('speed', 1);
  const crown = ctx.param('crown', 1), flare = ctx.param('flare', 0), pulse = ctx.param('pulse', 0);
  const north = ctx.param('north', 180), drift = ctx.param('drift', 0.6), veil = ctx.param('veil', 0);
  const bearing = ctx.param('bearing', 0), arcs = ctx.param('arcs', 0), nseed = ctx.param('seed', 0);   // W19e tonight's spot, shape, noise
  const H = ctx.quality === 'ultra' || ctx.quality === 'high' ? [100, 125, 160, 215, 300] : [100, 135, 200, 300];
  const d0 = normalize(positionWorld.sub(cameraPosition));
  const br = radians(bearing), sb = sin(br), cb = cos(br);                  // turn the sky so tonight's bearing is the curtain's north
  const dir = vec3(d0.x.mul(cb).add(d0.z.mul(sb)), d0.y, d0.z.mul(cb).sub(d0.x.mul(sb)));
  const up = max(dir.y, float(0.03));
  const horizon = smoothstep(0.0, 0.1, dir.y);
  const t = time.mul(speed);
  const green = vec3(0.14, 1.0, 0.45), teal = vec3(0.1, 0.8, 0.6);
  const crownCol = mix(mix(vec3(0.3, 0.85, 0.5), vec3(0.5, 0.25, 0.95), clamp(crown, 0, 1)), vec3(0.95, 0.16, 0.28), clamp(crown.sub(1), 0, 1));
  const hemCol = mix(vec3(0.4, 1.3, 0.7), vec3(1.2, 0.35, 0.8), flare.mul(0.7));
  const deep = act.mul(0.8).add(0.4);
  const slide = t.mul(drift).mul(6);
  const w = float(5).add(flare.mul(4));                                       // sheet half-thickness, km
  const colAt = (h) => {                                                      // the glow's colour and strength at height h
    const k = h.sub(100).div(200);
    const hem = smoothstep(100, 108, h).mul(exp(h.sub(110).div(-70)).min(1));
    return mix(mix(green, teal, 0.2), crownCol, smoothstep(0.2, 0.75, k)).mul(hem).add(hemCol.mul(float(1).sub(smoothstep(104, 125, h))).mul(0.6));
  };
  const sg = (x) => { const y = x.mul(1.128); return y.div(y.mul(y).add(1).sqrt()); };          // smooth erf stand-in
  const sgd = (x) => { const y = x.mul(1.128); return float(1.128).div(y.mul(y).add(1).pow(1.5)); };
  const rays = (x, seed) => {
    const xr = x.add(slide).mul(0.3);
    const fine = mx_noise_float(vec3(xr, t.mul(0.4), nseed.add(seed))).mul(0.5).add(0.5);   // W20: a fixed shimmer rate; act times the clock snapped the rays
    const clump = mx_noise_float(vec3(x.add(slide).mul(0.035), t.mul(0.06), nseed.add(seed + 3.1))).mul(0.5).add(0.5);
    const aa = float(1).sub(smoothstep(0.3, 1.0, fwidth(xr)));
    const streak = smoothstep(0.35, 0.85, fine).mul(aa).mul(act.mul(0.6).add(0.3));
    const travel = mx_noise_float(vec3(x.add(slide).mul(0.008).sub(t.mul(0.05)), nseed.add(seed + 5.7), t.mul(0.03))).mul(0.4).add(0.7);
    return clump.mul(clump).mul(1.2).add(0.3).mul(streak.add(0.5)).mul(travel);
  };
  const curtain = (z0, seed, oct2) => {
    const fold = (x) => { let f = mx_noise_float(vec3(x.add(slide).mul(0.0045), t.mul(0.018), nseed.add(seed))).mul(deep.mul(95));
      if (oct2) f = f.add(mx_noise_float(vec3(x.add(slide).mul(0.016), t.mul(0.045), nseed.add(seed + 7.3))).mul(deep.mul(28))); return f; };
    const d = H.map((h) => { const s = float(h).div(up); return dir.z.mul(s).sub(z0.add(fold(dir.x.mul(s)))).div(w); }); // signed distance in sheet widths
    let glow = vec3(0, 0, 0), wsum = float(0), xs = float(0);
    for (let i = 0; i < H.length - 1; i++) {
      const da = d[i], db = d[i + 1], D = db.sub(da), len = H[i + 1] - H[i];
      const ratio = select(abs(D).greaterThan(0.05), abs(sg(db).sub(sg(da))).div(abs(D)), sgd(da.add(db).mul(0.5)));
      const e = ratio.mul(len / 30);                                           // glow along this piece of the ray
      const tc = clamp(da.div(select(abs(D).greaterThan(0.001), D.negate(), float(-0.001))), 0, 1);
      const hc = mix(float(H[i]), float(H[i + 1]), tc);
      glow = glow.add(colAt(hc).mul(e)); wsum = wsum.add(e); xs = xs.add(dir.x.mul(hc.div(up)).mul(e));
    }
    const xm = xs.div(wsum.max(1e-4));
    const gap = smoothstep(-0.15, 0.25, mx_noise_float(vec3(xm.add(slide).mul(0.004), nseed.add(seed + 11.3), t.mul(0.01))));
    return glow.mul(rays(xm, seed)).mul(mix(float(1), gap, clamp(arcs.sub(1), 0, 1)));         // broken arc: dark gaps along it
  };
  const c = curtain(north.negate(), 0.0, true).add(curtain(north.negate().sub(80), 2.4, false).mul(mix(float(0.12), float(0.85), clamp(arcs, 0, 1)).mul(float(1).sub(clamp(arcs.sub(1), 0, 1).mul(0.6)))));
  const breathe = mix(float(1), clamp(mx_noise_float(vec3(dir.x.div(up).mul(1.5), dir.z.div(up).mul(1.5), t.mul(0.25))).mul(0.6).add(0.6), 0.15, 1), pulse);
  const lit = c.mul(amount.mul(flare.mul(1.1).add(1)).mul(float(1).sub(veil.mul(0.75))).mul(breathe).mul(1.4));
  m.colorNode = lit.div(lit.add(1)).mul(1.6).mul(horizon);                   // soft shoulder: edge-on folds glow, never clip
  m.transparent = true; m.blending = AdditiveBlending; m.depthWrite = false; m.fog = false; m.side = BackSide;
  return m;
}
