// Campton's king's crown (creator 2026-10-06): a hammered gold band with a red velvet cap, eight points
// alternating tall fleur-tips and short pearl-tipped spikes, a ruby set in the front point, a gold cross-orb on top.
// Origin at the band's bottom centre; front is -Z. Sized for a head: band radius 0.105 m, 0.2 m tall to the cross.
import { mesh, paint, bevel, lathe, rod } from './den-furniture-mesh.js';
export function geometry(ctx) {
  const m = mesh(ctx), R = 0.105, BH = 0.045, N = 8, seg = 24;
  // velvet cap: a soft dome inside the band
  paint(m, '#7a1420');
  lathe(m, [[0.01, 0.0001], [0.01, R - 0.006], [0.06, R - 0.012], [0.095, R * 0.72], [0.12, R * 0.35], [0.128, 0.0001]], seg);
  // ermine-white rim under the band
  paint(m, '#efe8da');
  lathe(m, [[-0.012, 0.0001], [-0.012, R + 0.012], [0.004, R + 0.014], [0.012, R + 0.008], [0.012, 0.0001]], seg);
  // the gold band with raised lips top and bottom
  paint(m, 'brass', '#e0a83a');
  lathe(m, [[0.008, 0.0001], [0.008, R + 0.006], [0.014, R + 0.01], [BH - 0.006, R + 0.008], [BH, R + 0.012], [BH + 0.004, 0.0001]], seg);
  // points around the band
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2 + Math.PI / 2 * 0 , x = Math.sin(a) * (R + 0.006), z = -Math.cos(a) * (R + 0.006);
    const tall = i % 2 === 0, h = tall ? 0.07 : 0.045;
    paint(m, 'brass', '#e7b445');
    rod(m, [x, BH - 0.004, z], [x * 0.96, BH + h, z * 0.96], tall ? 0.012 : 0.008, 5);
    if (tall) { // fleur tip: a small diamond leaf
      bevel(m, x * 0.95, BH + h - 0.006, z * 0.95, 0.03, 0.022, 0.012, 0.004);
    } else { // pearl
      paint(m, '#f6f1e6'); lathe(m, [[BH + h - 0.008, 0.0001], [BH + h - 0.004, 0.009], [BH + h + 0.004, 0.009], [BH + h + 0.008, 0.0001]], 8, x * 0.96, z * 0.96);
    }
    // a gem on the band under every point: ruby at the front, sapphires and emeralds around
    const gem = i === 0 ? '#c8102e' : (i % 2 ? '#1f4fb8' : '#1d8a4a');
    paint(m, gem); bevel(m, x * 1.06, 0.02, z * 1.06, i === 0 ? 0.026 : 0.016, i === 0 ? 0.022 : 0.014, 0.01, 0.003);
  }
  // arches meeting at the top, then the orb and cross
  paint(m, 'brass', '#dca236');
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2, x = Math.sin(a) * R, z = -Math.cos(a) * R;
    rod(m, [x, BH, z], [x * 0.55, 0.115, z * 0.55], 0.006, 4); rod(m, [x * 0.55, 0.115, z * 0.55], [0, 0.135, 0], 0.006, 4);
  }
  lathe(m, [[0.132, 0.0001], [0.138, 0.016], [0.152, 0.018], [0.164, 0.012], [0.168, 0.0001]], 12);
  bevel(m, 0, 0.166, 0, 0.008, 0.04, 0.008, 0.001);
  bevel(m, 0, 0.188, 0, 0.026, 0.008, 0.008, 0.001);
  return m.finish();
}
