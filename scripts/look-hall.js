import { grade, vignette, grain } from 'builtin/postfx';
import { ART } from './lib/data/art-palette.js';
// The hall's grade: firelight stays warm, shadows still go teal. Pushed on a player's own screen while they stand
// under the roof (sky-local.js); outside, the place's look-hearth.js applies again.
const G = ART.grade.hall; // round 6: the red toe lifted a hair (-.018 → -.008) so faces in shadow keep their skin, no grey wash
export function look(ctx) {
  ctx.param('bloomStrength', ART.bloom.strength); ctx.param('bloomRadius', ART.bloom.radius); ctx.param('bloomThreshold', ART.bloom.threshold);
  const c = grade(ctx.scene, {
    exposure: ctx.param('exposure', 1.03), saturation: G.saturation, contrast: G.contrast, temperature: G.temperature,
    lift: [G.lift[0] + 0.01, G.lift[1] + 0.002, G.lift[2]], gamma: G.gamma, gain: G.gain
  });
  return grain(vignette(c, ctx.param('vignette', G.vignette), { color: G.vignetteColor, feather: 0.5 }), G.grain);
}
