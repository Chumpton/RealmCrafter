// A flower on a stem: a plant file (heightmap-terrain skill, decorations). The `flower` layer in
// places/main/config.yaml scatters it on the grass beside the blades, sizes each one by the item's
// `scale`, turns it by `randomRotation`, bends it in the wind by the item's `wind`, and colours it by
// the item's `params` (petal, heart, stem). Feet at y = 0, +Y up: two crossed stem quads, five petal
// quads cupped in a ring at the top and a heart quad over them. Every number here is yours to move;
// delete the layer and the flowers are gone.
export function geometry(ctx) {
  const { petal = '#ffffff', heart = '#f2c14e', stem = 'oklch(0.52 0.12 140)' } = ctx.params;
  const h = 0.42;
  const w = 0.012;
  ctx.color(stem);
  for (let p = 0; p < 2; p++) {
    const v = (x, y, z) => (p === 0 ? [x, y, z] : [z, y, -x]);
    const a = v(-w, 0, 0);
    const b = v(w, 0, 0);
    const c = v(w * 0.6, h, 0);
    const d = v(-w * 0.6, h, 0);
    ctx.quad(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
  }
  // The head rides the stem's tip whole, so a gust never tears petals off the stalk.
  ctx.sway(1);
  ctx.color(petal);
  const r = 0.06;
  const inner = 0.012;
  for (let i = 0; i < 5; i++) {
    const t0 = (i / 5) * Math.PI * 2;
    const t1 = ((i + 1) / 5) * Math.PI * 2;
    ctx.quad(
      Math.cos(t0) * inner, h, Math.sin(t0) * inner,
      Math.cos(t1) * inner, h, Math.sin(t1) * inner,
      Math.cos(t1) * r, h + 0.015, Math.sin(t1) * r,
      Math.cos(t0) * r, h + 0.015, Math.sin(t0) * r,
    );
  }
  ctx.color(heart);
  ctx.quad(-inner, h + 0.004, -inner, -inner, h + 0.004, inner, inner, h + 0.004, inner, inner, h + 0.004, -inner);
}
