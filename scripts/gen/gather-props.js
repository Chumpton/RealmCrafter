// MMO prompt 4/6 props. params { kind: fire | ash | crate, log }. Origin at the feet, front -Z. Chunky low-poly, yard-kit woods.
import { TEX, IRON, frame, box, beam, cyl, lathe, poly, lodLevel } from "./yard-kit.js";
const LOGT = { normal: "oklch(0.88 0.04 70)", oak: "oklch(0.84 0.05 65)", willow: "oklch(0.86 0.05 100)", maple: "oklch(0.8 0.08 45)", yew: "oklch(0.7 0.05 55)", magic: "oklch(0.85 0.05 190)", redwood: "oklch(0.66 0.1 35)" };
const KIND = {
  fire(c) { // a little teepee of split logs in a ring of hearth stones, charred at the heart
    const t = LOGT[c.params.log] ?? LOGT.normal, n = lodLevel(c) >= 3 ? 5 : 8;
    c.albedo(TEX.granite); c.color("oklch(0.8 0.01 80)"); c.roughness(0.95);
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; box(c, Math.cos(a) * 0.42, -0.04, Math.sin(a) * 0.42, 0.17, 0.12, 0.13, -a * 57.3); }
    c.albedo(TEX.char); c.color("oklch(0.5 0.01 60)"); c.roughness(1);
    lathe(c, [0, 0, 0], [[0.32, 0], [0.26, 0.02], [0, 0.03]], 8);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.283 + 0.3, b = [Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3], tip = [Math.cos(a) * 0.04, 0.48, Math.sin(a) * 0.04];
      c.albedo(TEX.bark); c.color(t); c.roughness(0.95); cyl(c, b, [b[0] * 0.55 + tip[0] * 0.45, 0.2, b[2] * 0.55 + tip[2] * 0.45], 0.05, 0.045, 6);
      c.albedo(TEX.char); c.color("oklch(0.32 0.01 50)"); cyl(c, [b[0] * 0.55 + tip[0] * 0.45, 0.2, b[2] * 0.55 + tip[2] * 0.45], tip, 0.045, 0.025, 6);
    }
    c.albedo(null); c.color("oklch(0.75 0.15 50)"); c.emissive(2.2, 0.8, 0.2); lathe(c, [0, 0, 0], [[0.18, 0.035], [0.1, 0.06], [0, 0.065]], 7); c.emissive(null);
  },
  ash(c) { // a grey heap, a few black stubs, the ring of stones still warm
    const n = lodLevel(c) >= 3 ? 5 : 8;
    c.albedo(TEX.granite); c.color("oklch(0.72 0.01 80)"); c.roughness(0.95);
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; box(c, Math.cos(a) * 0.42, -0.04, Math.sin(a) * 0.42, 0.17, 0.11, 0.13, -a * 57.3); }
    c.albedo(TEX.char); c.color("oklch(0.62 0.005 80)"); c.roughness(1);
    lathe(c, [0, 0, 0], [[0.34, -0.01], [0.28, 0.04], [0.14, 0.08], [0, 0.09]], 9, { jitter: 0.1 });
    c.color("oklch(0.25 0.01 50)"); for (let i = 0; i < 3; i++) { const a = i * 2.1; cyl(c, [Math.cos(a) * 0.2, 0.04, Math.sin(a) * 0.2], [Math.cos(a) * 0.05, 0.09, Math.sin(a) * 0.05], 0.035, 0.03, 5); }
  },
  crate(c) { // the fishers' tackle crate: a lidded plank box, a coiled rope, a rod and a net hung on its side
    c.albedo(TEX.planks); c.color("oklch(0.86 0.04 70)"); c.roughness(0.9);
    box(c, 0, 0, 0, 1.0, 0.62, 0.66, 0, { bottom: true });
    c.albedo(TEX.wood); c.color("oklch(0.78 0.05 65)");
    for (const x of [-0.5, 0.5]) for (const z of [-0.33, 0.33]) box(c, x * 0.98, 0, z * 0.98, 0.07, 0.64, 0.07);
    box(c, 0, 0.62, 0.0, 1.06, 0.06, 0.72); // lid
    c.albedo(null); c.color(IRON); c.metalness(0.5); c.roughness(0.5);
    box(c, 0, 0.42, -0.335, 0.12, 0.14, 0.02); for (const x of [-0.3, 0.3]) box(c, x, 0.6, 0.37, 0.1, 0.06, 0.02); c.metalness(0);
    c.albedo(TEX.hay); c.color("oklch(0.7 0.05 75)"); c.roughness(1); // rope coil on the lid
    for (let k = 0; k < 3; k++) lathe(c, [0.22, 0.68 + k * 0.035, 0.05], [[0.16 - k * 0.02, 0], [0.17 - k * 0.02, 0.018], [0.16 - k * 0.02, 0.035], [0.1 - k * 0.02, 0.035], [0.09 - k * 0.02, 0.018], [0.1 - k * 0.02, 0]], 9);
    c.albedo(TEX.wood); c.color("oklch(0.7 0.06 60)"); cyl(c, [-0.55, 0.05, -0.36], [-0.3, 1.9, -0.4], 0.018, 0.009, 5); // the rod leaning on it
    c.albedo(null); c.color("oklch(0.85 0.03 85)"); c.roughness(1); // a hung net, front face
    const nx = 0.18, ny = 0.38, w = 0.34;
    for (let i = 0; i <= 4; i++) { beam(c, [nx - w / 2 + i * w / 4, ny - 0.22, -0.345], [nx - w / 2 + i * w / 4, ny + 0.12, -0.345], 0.008, 0.008); }
    for (let j = 0; j <= 3; j++) beam(c, [nx - w / 2, ny - 0.22 + j * 0.113, -0.345], [nx + w / 2, ny - 0.22 + j * 0.113, -0.345], 0.008, 0.008);
  },
  chest(c) { // a lidded iron-banded sea chest, domed lid, a hasp; params.give tints the cloth peeking out (feathers white, strings flax, tips iron)
    const peek = { feathers: "oklch(0.95 0.01 90)", strings: "oklch(0.82 0.05 85)", tips: "oklch(0.6 0.01 250)" }[c.params.give] ?? "oklch(0.8 0.03 80)";
    c.albedo(TEX.planks); c.color("oklch(0.8 0.05 60)"); c.roughness(0.9);
    box(c, 0, 0, 0, 0.9, 0.48, 0.56, 0, { bottom: true });
    c.albedo(TEX.wood); c.color("oklch(0.74 0.06 55)");
    for (let i = 0; i < 6; i++) { const a0 = (i / 6) * Math.PI, a1 = ((i + 1) / 6) * Math.PI; const y0 = 0.48 + Math.sin(a0) * 0.16, y1 = 0.48 + Math.sin(a1) * 0.16, z0 = -Math.cos(a0) * 0.29, z1 = -Math.cos(a1) * 0.29;
      beam(c, [-0.46, (y0 + y1) / 2, (z0 + z1) / 2], [0.46, (y0 + y1) / 2, (z0 + z1) / 2], Math.hypot(y1 - y0, z1 - z0) * 0.5 + 0.01, 0.03); }
    c.albedo(null); c.color(IRON); c.metalness(0.55); c.roughness(0.45);
    for (const x of [-0.32, 0.32]) { box(c, x, 0, -0.29, 0.07, 0.49, 0.015); box(c, x, 0, 0.29, 0.07, 0.49, 0.015);
      for (let i = 0; i < 6; i++) { const a0 = (i / 6) * Math.PI, a1 = ((i + 1) / 6) * Math.PI; beam(c, [x, 0.48 + Math.sin(a0) * 0.175, -Math.cos(a0) * 0.305], [x, 0.48 + Math.sin(a1) * 0.175, -Math.cos(a1) * 0.305], 0.04, 0.012); } }
    box(c, 0, 0.36, -0.29, 0.1, 0.16, 0.025); c.color("oklch(0.7 0.08 80)"); box(c, 0, 0.3, -0.305, 0.05, 0.05, 0.02); c.metalness(0);
    c.albedo(null); c.color(peek); c.roughness(1); box(c, 0.12, 0.47, -0.26, 0.34, 0.035, 0.05, 6);
  },
};
export function geometry(ctx) { frame(); ctx.flat(); (KIND[ctx.params.kind] || KIND.fire)(ctx); frame(); }
export function collider(ctx) { if (ctx.params.kind === "chest") { frame(); box(ctx, 0, 0, 0, 0.92, 0.64, 0.6, 0, { bottom: true }); frame(); return; } if (ctx.params.kind !== "crate") return null; frame(); box(ctx, 0, 0, 0, 1.06, 0.68, 0.72, 0, { bottom: true }); frame(); }
