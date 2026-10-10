// A starter goblin (S12): a hunched green runt, big pointed ears, bare feet, a ragged brown tunic and a knobbly club. Faces -Z.
// params.skin: green | olive. Origin at the feet; about 1.1 m tall.
// Goblin-kin (Austrland, al-foe): params.tint (skin oklch), tunic, gear: spear | axe | cleaver | staff | sickle, hood, robe, cape (colours),
// horns, mask (bone skull face), spikes (bone pauldrons). Size is the row's scale. No params = the starter goblin, unchanged.
import { frame, cyl, lathe, beam, box } from './yard-kit.js';
import { loft, flap, eyes } from './herd-kit.js';
const SKIN = { green: 'oklch(0.62 0.12 135)', olive: 'oklch(0.55 0.09 110)' };
export function geometry(ctx) {
  frame(); const P = ctx.params || {}, L = ctx.lod, skin = P.tint || SKIN[P.skin] || SKIN.green, seg = L <= 1 ? 8 : L <= 3 ? 6 : 4;
  ctx.albedo(null); ctx.roughness(0.9); ctx.metalness(0); ctx.flat();
  ctx.color(skin);
  for (const s of [-1, 1]) { cyl(ctx, [s * 0.1, 0.5, 0.02], [s * 0.1, 0.12, -0.02], 0.065, 0.045, 5); cyl(ctx, [s * 0.1, 0.12, -0.02], [s * 0.1, 0.0, -0.1], 0.045, 0.05, 4); } // legs, bare feet
  ctx.color(P.tunic || 'oklch(0.42 0.06 60)');
  loft(ctx, [[0, 0.48, 0.02, 0.15, 0.12], [0, 0.66, 0, 0.19, 0.15], [0, 0.82, -0.06, 0.2, 0.15], [0, 0.94, -0.12, 0.14, 0.12]], seg); // tunic, hunched forward
  ctx.color(skin);
  for (const s of [-1, 1]) { cyl(ctx, [s * 0.2, 0.88, -0.1], [s * 0.26, 0.66, -0.2], 0.05, 0.04, 5); cyl(ctx, [s * 0.26, 0.66, -0.2], [s * 0.24, 0.52, -0.3], 0.04, 0.045, 4); } // arms
  lathe(ctx, [0, 0, -0.2], [[0, 0.92], [0.12, 0.96], [0.15, 1.04], [0.13, 1.14], [0.07, 1.2], [0, 1.22]], seg); // head
  ctx.color('oklch(0.58 0.12 135)');
  for (const s of [-1, 1]) flap(ctx, [s * 0.14, 1.08, -0.2], [s * 0.34, 1.16, -0.18], [s * 0.15, 1.0, -0.17], [s, 0.2, 0]); // ears
  ctx.color('oklch(0.4 0.08 40)'); flap(ctx, [-0.03, 1.04, -0.34], [0.03, 1.04, -0.34], [0, 0.98, -0.38], [0, 0, -1]); // nose
  if (L <= 3) { ctx.color('oklch(0.95 0.1 95)'); eyes(ctx, 0.07, 1.1, -0.33, 0.025); }
  if (!P.gear && L <= 4) { ctx.color('oklch(0.38 0.05 55)'); beam(ctx, [0.26, 0.5, -0.34], [0.34, 0.95, -0.4], 0.07, 0.07); } // club
  kin(ctx, P, L, seg);
}
// --- goblin-kin dress: every piece optional, each its own few faces
function kin(ctx, P, L, seg) {
  const BONE = 'oklch(0.9 0.035 85)', HAFT = 'oklch(0.4 0.05 55)', IRN = 'oklch(0.36 0.015 250)';
  if (P.robe) { ctx.color(P.robe); lathe(ctx, [0, 0, -0.04], [[0.26, 0.0], [0.22, 0.3], [0.19, 0.6], [0.2, 0.82], [0.14, 0.95], [0, 0.97]], seg); }
  if (P.cape) { ctx.color(P.cape); flap(ctx, [-0.18, 0.92, 0.04], [0.18, 0.92, 0.04], [0.26, 0.12, 0.22], [0, 0, 1]); flap(ctx, [-0.18, 0.92, 0.04], [0.26, 0.12, 0.22], [-0.26, 0.12, 0.22], [0, 0, 1]); }
  if (P.hood) { ctx.color(P.hood); lathe(ctx, [0, 0, -0.18], [[0.18, 0.94], [0.19, 1.04], [0.16, 1.16], [0.09, 1.27], [0.02, 1.36], [0, 1.37]], seg); }
  if (P.horns) { ctx.color(IRN); ctx.metalness(0.4); lathe(ctx, [0, 0, -0.2], [[0.155, 1.06], [0.15, 1.16], [0.1, 1.23], [0, 1.255]], seg); ctx.metalness(0);
    ctx.color(BONE); for (const s of [-1, 1]) { cyl(ctx, [s * 0.13, 1.17, -0.2], [s * 0.27, 1.27, -0.16], 0.04, 0.025, 5); cyl(ctx, [s * 0.27, 1.27, -0.16], [s * 0.3, 1.42, -0.2], 0.025, 0.004, 4); } }
  if (P.mask && L <= 3) { ctx.color(BONE); flap(ctx, [-0.1, 1.15, -0.33], [0.1, 1.15, -0.33], [0, 0.98, -0.37], [0, 0, -1]); ctx.emissive(2.6, 0.6, 0.15); eyes(ctx, 0.05, 1.1, -0.36, 0.022); ctx.emissive(null); }
  if (P.spikes) { ctx.color(BONE); for (const s of [-1, 1]) for (let i = 0; i < 3; i++) cyl(ctx, [s * (0.15 + i * 0.04), 0.9, -0.05 - i * 0.04], [s * (0.22 + i * 0.06), 1.1 - i * 0.02, -0.02 - i * 0.05], 0.03, 0.002, 4); }
  const g = P.gear; if (!g || L > 4) return;
  if (g === 'spear') { ctx.color(HAFT); cyl(ctx, [0.26, 0.15, -0.1], [0.3, 1.55, -0.55], 0.022, 0.02, 5); ctx.color(IRN); ctx.metalness(0.5); cyl(ctx, [0.3, 1.55, -0.55], [0.315, 1.78, -0.63], 0.045, 0.002, 4); ctx.metalness(0); ctx.color('oklch(0.5 0.19 27)'); flap(ctx, [0.3, 1.5, -0.53], [0.3, 1.44, -0.51], [0.42, 1.4, -0.46], [1, 0, 0]); }
  if (g === 'axe' || g === 'cleaver') { const k = g === 'cleaver' ? 1.6 : 1; ctx.color(HAFT); cyl(ctx, [0.25, 0.45, -0.3], [0.32, 0.45 + 0.6 * k, -0.42], 0.025, 0.022, 5); ctx.color(IRN); ctx.metalness(0.5);
    box(ctx, 0.36, 0.3 + 0.6 * k, -0.42, 0.04, 0.22 * k, 0.24 * k, 0); ctx.metalness(0); }
  if (g === 'sickle') { ctx.color(HAFT); cyl(ctx, [0.25, 0.5, -0.3], [0.27, 0.72, -0.34], 0.022, 0.02, 4); ctx.color(IRN); cyl(ctx, [0.27, 0.72, -0.34], [0.29, 0.86, -0.46], 0.02, 0.012, 4); cyl(ctx, [0.29, 0.86, -0.46], [0.27, 0.8, -0.6], 0.012, 0.002, 4); }
  if (g === 'staff') { ctx.color('oklch(0.24 0.02 30)'); cyl(ctx, [0.26, 0.0, -0.3], [0.3, 1.5, -0.36], 0.025, 0.02, 5); ctx.color(BONE); lathe(ctx, [0.3, 0, -0.36], [[0.04, 1.48], [0.08, 1.56], [0.06, 1.66], [0, 1.7]], 5);
    ctx.emissive(3.2, 0.9, 0.15); ctx.color('oklch(0.75 0.18 45)'); lathe(ctx, [0.3, 0, -0.36], [[0.03, 1.7], [0.05, 1.76], [0, 1.84]], 5); ctx.emissive(null); }
}
export function collider(ctx) { frame(); box(ctx, 0, 0, -0.1, 0.5, 1.2, 0.5, 0, { bottom: true }); frame(); }
