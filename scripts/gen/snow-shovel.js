// The den's snow shovel (lane W5, S8b): a chunky lowpoly shovel — pale ash shaft, honey-oak blade shod with a dark iron lip
// and cheek straps, an iron ferrule and a leather-wrapped D-grip — plus the walnut wall peg it hangs from and the snow heap
// that rides its blade. params.part: 'shovel' | 'peg' | 'heap'. Origin at the feet: shovel = blade's bottom edge centre,
// shaft up +Y, the dished face toward -Z; peg = plank's bottom centre, back flat on the wall at z 0, dowel out to -Z;
// heap = its base centre, mound up +Y.
import { mesh, paint, bevel, lathe, beam, rod, solid } from './den-furniture-mesh.js';
function shovel(m, lod) {
  const n = lod > 2 ? 5 : 7;
  // the blade: an oak board with a raised dish — two cheek boards angled forward so it scoops
  paint(m, 'oak', '#e2b98a');
  bevel(m, 0, 0.03, 0, 0.23, 0.33, 0.024, 0.006);
  for (const s of [-1, 1]) {
    const x0 = s * 0.112, x1 = s * 0.152, y0 = 0.03, y1 = 0.35, zb = 0.012, zf = -0.045;
    const back = [[x0, y0, zb], [x1, y0, zf + 0.02], [x1, y1, zf + 0.02], [x0, y1, zb]], front = back.map(([x, y, z]) => [x, y, z - 0.024]);
    m.face(back, [s * 0.5, 0, 1]); m.face(front, [-s * 0.6, 0, -1]);
    m.face([back[1], back[2], front[2], front[1]], [s, 0, 0]);
    m.face([back[0], back[1], front[1], front[0]], [0, -1, 0]); m.face([back[3], back[2], front[2], front[3]], [0, 1, 0]);
  }
  // iron: the shod lip along the bottom edge, cheek straps, a band across the top, rivets
  paint(m, 'iron', '#585347');
  bevel(m, 0, 0, -0.004, 0.31, 0.042, 0.036, 0.006);
  for (const s of [-1, 1]) { beam(m, [s * 0.15, 0.03, -0.035], [s * 0.15, 0.33, -0.035], [[0, 0.011], [1, 0.009]], 4); }
  bevel(m, 0, 0.33, 0, 0.25, 0.028, 0.032, 0.005);
  if (lod <= 2) for (const [x, y] of [[-0.09, 0.022], [0, 0.022], [0.09, 0.022], [-0.07, 0.345], [0.07, 0.345], [-0.15, 0.12], [0.15, 0.12], [-0.15, 0.25], [0.15, 0.25]]) solid(m, x, y - 0.006, x === 0 && y < 0.1 ? -0.024 : (Math.abs(x) > 0.14 ? -0.048 : -0.019), 0.013, 0.013, 0.01);
  // the shoulder where the shaft seats: a tapered oak cheek block, then the iron ferrule
  paint(m, 'oak', '#d6ad7c');
  lathe(m, [[0.355, 0.1], [0.4, 0.07], [0.45, 0.03]], 8, 0, -0.002, { zScale: 0.3 });
  paint(m, 'iron', '#585347');
  lathe(m, [[0.44, 0.027], [0.455, 0.029], [0.52, 0.026], [0.53, 0.023]], n + 1);
  // the ash shaft, slightly swelled at the hands
  paint(m, 'oak', '#f3e0c0');
  lathe(m, [[0.52, 0.02], [0.8, 0.021], [1.05, 0.02], [1.2, 0.019]], n, 0, 0, { caps: false });
  // the D-grip: two splayed ash cheeks, a crossbar wrapped in leather, iron cap plates
  for (const s of [-1, 1]) beam(m, [s * 0.012, 1.18, 0], [s * 0.07, 1.385, 0], [[0, 0.015], [1, 0.013]], n);
  rod(m, [-0.08, 1.366, 0], [0.08, 1.366, 0], 0.014, n);
  paint(m, '#5b3b27'); m.ctx.roughness(0.85);
  beam(m, [-0.045, 1.366, 0], [0.045, 1.366, 0], [[0, 0.018], [0.5, 0.019], [1, 0.018]], n);
  paint(m, 'iron', '#585347');
  lathe(m, [[1.17, 0.023], [1.2, 0.024], [1.215, 0.02]], n);
}
function peg(m, lod) {
  paint(m, 'walnut', '#6a4a33');
  bevel(m, 0, 0, -0.016, 0.17, 0.11, 0.03, 0.006);
  beam(m, [0, 0.05, -0.03], [0, 0.066, -0.14], [[0, 0.017], [0.85, 0.015], [0.92, 0.022], [1, 0.012]], lod > 2 ? 6 : 8);
  paint(m, 'iron', '#585347');
  for (const x of [-0.06, 0.06]) solid(m, x, 0.047, -0.034, 0.012, 0.012, 0.008);
}
function heap(m, lod) {
  const c = m.ctx; c.albedo(null); c.color('#f3f6fa'); c.roughness(0.92); c.metalness(0);
  lathe(m, [[0, 0.12], [0.022, 0.108], [0.05, 0.075], [0.07, 0.035], [0.078, 0.0001]], lod > 2 ? 7 : 10, 0, 0, { zScale: 0.85 });
}
export function geometry(ctx) {
  const m = mesh(ctx), lod = ctx.lod || 1, part = ctx.params?.part || 'shovel';
  ctx.flat();
  if (part === 'peg') peg(m, lod); else if (part === 'heap') heap(m, lod); else shovel(m, lod);
  return m.finish();
}
