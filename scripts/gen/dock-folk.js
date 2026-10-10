// Dock folk: one chunky low-poly painted Norse body for every worker on the harbour (scripts/dock-folk.js drives them).
// Origin between the feet, facing -Z, ~1.78 m (kids are the same body at scale ~0.62 with child: true).
// params: sex 'm'|'f', build (girth), tunic/trousers/hair/cloak hex, apron, head 'bare'|'hood'|'cap'|'helm'|'kerchief',
// beard, braids, rolled (sleeves), tool, load ('crate'|'sack'|'plank'), roll ('barrel'), rope (haul-rope length), child.
// Each part rides one bone of skeleton(); clips in anim/dock-folk.yml. LOD 5 is empty: nobody is drawn far off.
import { tube, ell, rod, lathe, box, q } from './lore-kit.js';
export function skeleton() {
  return {
    root: { pivot: [0, 0, 0] },
    hips: { parent: 'root', pivot: [0, 0.95, 0] },
    spine: { parent: 'hips', pivot: [0, 1.02, 0] },
    head: { parent: 'spine', pivot: [0, 1.5, 0] },
    armL: { parent: 'spine', pivot: [-0.22, 1.42, 0] },
    foreL: { parent: 'armL', pivot: [-0.24, 1.14, 0] },
    armR: { parent: 'spine', pivot: [0.22, 1.42, 0] },
    foreR: { parent: 'armR', pivot: [0.24, 1.14, 0] },
    tool: { parent: 'foreR', pivot: [0.25, 0.87, -0.02] },
    load: { parent: 'spine', pivot: [0.12, 1.62, 0.04] },
    legL: { parent: 'hips', pivot: [-0.1, 0.92, 0] },
    shinL: { parent: 'legL', pivot: [-0.1, 0.5, 0] },
    legR: { parent: 'hips', pivot: [0.1, 0.92, 0] },
    shinR: { parent: 'legR', pivot: [0.1, 0.5, 0] },
    roll: { parent: 'root', pivot: [0, 0.3, -0.72] },
  };
}
// '#rrggbb' -> oklch(), scaled in lightness by k
function ok(hex, k = 1) {
  const n = parseInt(String(hex).replace('#', ''), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * c[0] + 0.5363325363 * c[1] + 0.0514459929 * c[2]), m = Math.cbrt(0.2119034982 * c[0] + 0.6806995451 * c[1] + 0.1073969566 * c[2]), s = Math.cbrt(0.0883024619 * c[0] + 0.2817188376 * c[1] + 0.6299787005 * c[2]);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return `oklch(${Math.min(1, L * k).toFixed(3)} ${Math.hypot(a, b).toFixed(3)} ${((Math.atan2(b, a) * 180 / Math.PI + 360) % 360).toFixed(1)})`;
}
const paint = (ctx, col, rough = 0.92, metal = 0) => { ctx.albedo(null); ctx.color(col); ctx.roughness(rough); ctx.metalness(metal); };
function band(ctx, cx, cz, prof, seg, sx, sz) {
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i], [r1, y1] = prof[i + 1], ref = [cx, (y0 + y1) / 2, cz];
    for (let s = 0; s < seg; s++) {
      const a = s / seg * Math.PI * 2, b = (s + 1) / seg * Math.PI * 2;
      const P = (r, y, t) => [cx + Math.cos(t) * r * sx, y, cz + Math.sin(t) * r * sz];
      q(ctx, P(r0, y0, a), P(r0, y0, b), P(r1, y1, b), P(r1, y1, a), ref);
    }
  }
}
const SKIN = ['#e0b49a', '#d6a283', '#c58f6c', '#eac3a8'];
export function geometry(ctx) {
  const L = ctx.lod || 1;
  const p = ctx.params || {}, g = p.build ?? 1, fem = p.sex === 'f', kid = !!p.child;
  if (L >= 5) { ctx.flat(); ctx.bone('hips'); paint(ctx, ok(p.tunic ?? '#9baf84')); box(ctx, -0.2 * g, 0, -0.13 * g, 0.2 * g, 1.5, 0.13 * g); ctx.bone('head'); box(ctx, -0.1, 1.5, -0.1, 0.1, 1.75, 0.1); return; }
  const seg = L <= 1 ? 7 : L <= 2 ? 6 : L <= 3 ? 5 : 4, rg = L <= 2 ? 5 : L <= 3 ? 4 : 3, fine = L <= 2, mid = L <= 3;
  const tunic = ok(p.tunic ?? '#9baf84'), trou = ok(p.trousers ?? '#4f3828'), skin = ok(SKIN[(p.skin ?? 0) % SKIN.length]);
  const hairC = ok(p.hair ?? '#6b4a2e'), boot = ok('#3a2a20'), belt = ok('#2e2018'), wood = ok('#8a6440'), iron = ok('#6c7278');
  ctx.flat();
  if (L >= 4) { // a few boxes hold the outline
    for (const s of [-1, 1]) { ctx.bone(s < 0 ? 'legL' : 'legR'); paint(ctx, trou); box(ctx, s * 0.1 - 0.075, 0.5, -0.07, s * 0.1 + 0.075, 0.95, 0.07); ctx.bone(s < 0 ? 'shinL' : 'shinR'); paint(ctx, boot); box(ctx, s * 0.1 - 0.065, 0, -0.15, s * 0.1 + 0.065, 0.5, 0.07); }
    ctx.bone('hips'); paint(ctx, tunic); box(ctx, -0.2 * g, 0.6, -0.15 * g, 0.2 * g, 1.0, 0.15 * g);
    ctx.bone('spine'); box(ctx, -0.21 * g, 1.0, -0.13 * g, 0.21 * g, 1.46, 0.13 * g);
    for (const s of [-1, 1]) { ctx.bone(s < 0 ? 'armL' : 'armR'); box(ctx, s * 0.23 - 0.06, 1.12, -0.06, s * 0.23 + 0.06, 1.44, 0.06); ctx.bone(s < 0 ? 'foreL' : 'foreR'); paint(ctx, p.rolled ? skin : tunic); box(ctx, s * 0.245 - 0.05, 0.82, -0.05, s * 0.245 + 0.05, 1.14, 0.05); paint(ctx, tunic); }
    ctx.bone('head'); paint(ctx, p.head === 'hood' ? ok(p.cloak ?? '#4f3828') : skin); box(ctx, -0.1, 1.5, -0.11, 0.1, 1.76, 0.1);
    return;
  }
  // ---- legs: trousers, wrapped shins, turnshoe boots
  for (const s of [-1, 1]) {
    const N = s < 0 ? 'L' : 'R', x = s * 0.1;
    ctx.bone('leg' + N); paint(ctx, trou);
    tube(ctx, [{ p: [x, 0.97, 0], rx: 0.09 * g, ry: 0.09 * g }, { p: [x, 0.72, -0.005], rx: 0.08 * g, ry: 0.08 * g }, { p: [x, 0.5, 0], rx: 0.068, ry: 0.068 }], seg);
    ctx.bone('shin' + N);
    tube(ctx, [{ p: [x, 0.52, 0], rx: 0.066, ry: 0.066 }, { p: [x, 0.3, 0.005], rx: 0.058, ry: 0.06 }, { p: [x, 0.12, 0.01], rx: 0.05, ry: 0.05 }], seg);
    if (fine && !kid) { paint(ctx, ok(p.wraps ?? '#c9b79a')); for (let k = 0; k < 3; k++) lathe(ctx, x, 0.16 + k * 0.1, 0.006, [[0.054, 0], [0.064, 0.025], [0.054, 0.05]], seg); }
    paint(ctx, boot);
    ell(ctx, [x, 0.07, -0.04], [0.065, 0.075, 0.13], seg, rg);
  }
  // ---- tunic skirt + belt
  ctx.bone('hips'); paint(ctx, tunic);
  band(ctx, 0, 0, [[0.215 * g, 0.6], [0.2 * g, 0.78], [0.175 * g, 0.94]], seg + 2, 1, 0.78);
  paint(ctx, belt); band(ctx, 0, 0, [[0.18 * g, 0.92], [0.185 * g, 0.95], [0.18 * g, 0.98]], seg + 2, 1, 0.78);
  if (fine) { paint(ctx, ok('#b8a060'), 0.5, 0.6); box(ctx, -0.03, 0.925, -0.155 * g, 0.03, 0.975, -0.135 * g); }
  if (p.apron) { paint(ctx, ok(p.apron === true ? '#8a6a48' : p.apron)); box(ctx, -0.16 * g, 0.55, -0.185 * g, 0.16 * g, 0.97, -0.165 * g); }
  // ---- torso
  ctx.bone('spine'); paint(ctx, tunic);
  band(ctx, 0, 0, [[0.18 * g, 0.97], [0.2 * g, 1.18], [0.21 * g, 1.34], [0.17 * g, 1.45], [0.06, 1.49]], seg + 2, 1, 0.7);
  lathe(ctx, 0, 1.49, 0, [[0.06, 0], [0, 0.001]], seg);
  if (fem && !kid) { ell(ctx, [-0.075, 1.27, -0.1 * g], [0.07, 0.065, 0.06], seg, rg); ell(ctx, [0.075, 1.27, -0.1 * g], [0.07, 0.065, 0.06], seg, rg); }
  if (fine) { paint(ctx, ok(p.trim ?? '#ba8950')); band(ctx, 0, 0, [[0.165 * g, 1.42], [0.172 * g, 1.44], [0.12, 1.47]], seg + 2, 1, 0.7); }
  if (p.apron) { paint(ctx, ok(p.apron === true ? '#8a6a48' : p.apron)); box(ctx, -0.14 * g, 0.97, -0.175 * g, 0.14 * g, 1.3, -0.155 * g); }
  if (p.cloak) { paint(ctx, ok(p.cloak)); box(ctx, -0.25 * g, 0.62, 0.13 * g, 0.25 * g, 1.46, 0.17 * g); box(ctx, -0.24 * g, 1.38, -0.12, 0.24 * g, 1.47, 0.16 * g); if (fine) { paint(ctx, ok('#c9a24a'), 0.4, 0.7); ell(ctx, [0.16, 1.4, -0.13], [0.03, 0.03, 0.015], 6, 3); } }
  // ---- arms
  for (const s of [-1, 1]) {
    const N = s < 0 ? 'L' : 'R';
    ctx.bone('arm' + N); paint(ctx, tunic);
    if (p.rolled) {
      tube(ctx, [{ p: [s * 0.22, 1.45, 0], rx: 0.07 * g, ry: 0.07 * g }, { p: [s * 0.23, 1.28, 0], rx: 0.066 * g, ry: 0.066 * g }], seg);
      paint(ctx, skin); tube(ctx, [{ p: [s * 0.23, 1.29, 0], rx: 0.056 * g, ry: 0.056 * g }, { p: [s * 0.24, 1.14, 0], rx: 0.05, ry: 0.05 }], seg);
    } else tube(ctx, [{ p: [s * 0.22, 1.45, 0], rx: 0.068 * g, ry: 0.068 * g }, { p: [s * 0.24, 1.13, 0], rx: 0.057 * g, ry: 0.057 * g }], seg);
    ctx.bone('fore' + N); paint(ctx, p.rolled ? skin : tunic);
    tube(ctx, [{ p: [s * 0.24, 1.15, 0], rx: 0.054 * g, ry: 0.054 * g }, { p: [s * 0.25, 0.92, -0.01], rx: 0.044, ry: 0.044 }], seg);
    if (!p.rolled && fine) { paint(ctx, ok(p.trim ?? '#ba8950')); lathe(ctx, s * 0.25, 0.92, -0.01, [[0.046, 0], [0.05, 0.02], [0.046, 0.04]], seg); }
    paint(ctx, skin); ell(ctx, [s * 0.25, 0.85, -0.015], [0.042, 0.06, 0.04], seg, rg);
  }
  // ---- head
  ctx.bone('head');
  const hs = kid ? 1.22 : 1, hy = 1.62 + (kid ? 0.02 : 0);
  paint(ctx, skin);
  ell(ctx, [0, hy, 0], [0.1 * hs, 0.12 * hs, 0.11 * hs], seg + 1, rg + 1);
  if (mid) { box(ctx, -0.018, hy - 0.03, -0.125 * hs, 0.018, hy + 0.02, -0.1 * hs); paint(ctx, ok('#222222')); box(ctx, -0.052, hy + 0.025, -0.106 * hs, -0.026, hy + 0.045, -0.096 * hs); box(ctx, 0.026, hy + 0.025, -0.106 * hs, 0.052, hy + 0.045, -0.096 * hs); }
  paint(ctx, hairC);
  if (p.head !== 'hood' && p.head !== 'helm') ell(ctx, [0, hy + 0.035, 0.012], [0.108 * hs, 0.1 * hs, 0.112 * hs], seg + 1, rg);
  if (fem || p.braids) { // a long plait down the back, two side braids
    tube(ctx, [{ p: [0, hy - 0.02, 0.1], rx: 0.04, ry: 0.035 }, { p: [0, hy - 0.2, 0.13], rx: 0.035, ry: 0.03 }, { p: [0, hy - 0.42, 0.15], rx: 0.025, ry: 0.022 }], 5);
    if (p.braids) for (const s of [-1, 1]) tube(ctx, [{ p: [s * 0.1, hy, -0.02], rx: 0.025, ry: 0.025 }, { p: [s * 0.13, hy - 0.22, -0.05], rx: 0.02, ry: 0.02 }], 5);
  }
  if (p.beard && !kid) {
    ell(ctx, [0, hy - 0.075, -0.06], [0.09, 0.075, 0.07], seg, rg);
    tube(ctx, [{ p: [0, hy - 0.1, -0.09], rx: 0.07, ry: 0.04 }, { p: [0, hy - 0.2 - (p.beard === 'long' ? 0.08 : 0), -0.11], rx: 0.03, ry: 0.02 }], 5);
    if (fine) box(ctx, -0.05, hy - 0.025, -0.118, 0.05, hy - 0.005, -0.098);
  }
  if (p.head === 'hood') { paint(ctx, ok(p.cloak ?? p.hood ?? '#4f3828')); ell(ctx, [0, hy + 0.02, 0.045], [0.135 * hs, 0.15 * hs, 0.14 * hs], seg + 1, rg); lathe(ctx, 0, 1.42, 0.02, [[0.21 * g, 0], [0.13, 0.12], [0, 0.13]], seg + 1); }
  else if (p.head === 'cap') { paint(ctx, ok(p.capC ?? '#8a3a2a')); lathe(ctx, 0, hy + 0.04, 0, [[0.114 * hs, 0], [0.11 * hs, 0.05], [0.07, 0.1], [0, 0.11]], seg + 1); }
  else if (p.head === 'kerchief') { paint(ctx, ok(p.capC ?? '#f2e6cf')); ell(ctx, [0, hy + 0.04, 0.02], [0.118 * hs, 0.105 * hs, 0.12 * hs], seg + 1, rg); }
  else if (p.head === 'helm') {
    paint(ctx, iron, 0.45, 0.75); lathe(ctx, 0, hy + 0.02, 0, [[0.118, 0], [0.118, 0.05], [0.095, 0.11], [0.04, 0.15], [0, 0.155]], seg + 1);
    box(ctx, -0.014, hy - 0.06, -0.135, 0.014, hy + 0.06, -0.112);
    if (fine) { paint(ctx, ok('#4a4e54'), 0.5, 0.7); lathe(ctx, 0, hy + 0.015, 0, [[0.122, 0], [0.126, 0.02], [0.122, 0.04]], seg + 1); }
  }
  // ---- held tool
  ctx.bone('tool');
  const t = p.tool, hx = 0.25, hyy = 0.87, hz = -0.02;
  if (t === 'hammer' || t === 'mallet') {
    paint(ctx, wood); rod(ctx, [hx, hyy, hz + 0.08], [hx, hyy, hz - 0.3], 0.016, 5);
    if (t === 'hammer') { paint(ctx, iron, 0.45, 0.7); box(ctx, hx - 0.025, hyy - 0.07, hz - 0.36, hx + 0.025, hyy + 0.09, hz - 0.3); }
    else { paint(ctx, ok('#a07850')); box(ctx, hx - 0.055, hyy - 0.1, hz - 0.4, hx + 0.055, hyy + 0.1, hz - 0.28); }
  } else if (t === 'spear') {
    paint(ctx, wood); rod(ctx, [hx, 0.02, hz - 0.03], [hx, 2.08, hz - 0.03], 0.017, 5);
    paint(ctx, iron, 0.4, 0.8); lathe(ctx, hx, 2.06, hz - 0.03, [[0.02, 0], [0.04, 0.1], [0, 0.3]], 4);
  } else if (t === 'horn') {
    paint(ctx, ok('#e8d8b0'), 0.5);
    tube(ctx, [{ p: [hx, hyy, hz + 0.06], rx: 0.015, ry: 0.015 }, { p: [hx, hyy + 0.02, hz - 0.18], rx: 0.03, ry: 0.03 }, { p: [hx - 0.02, hyy + 0.14, hz - 0.36], rx: 0.05, ry: 0.05 }, { p: [hx - 0.04, hyy + 0.32, hz - 0.42], rx: 0.07, ry: 0.07 }], 6);
    if (fine) { paint(ctx, ok('#b8a060'), 0.4, 0.7); lathe(ctx, hx, hyy + 0.01, hz - 0.08, [[0.026, 0], [0.03, 0.02], [0.026, 0.04]], 6); }
  } else if (t === 'drinkhorn') {
    paint(ctx, ok('#d9c49a'), 0.5);
    tube(ctx, [{ p: [hx, hyy - 0.06, hz - 0.02], rx: 0.012, ry: 0.012 }, { p: [hx, hyy + 0.04, hz - 0.05], rx: 0.03, ry: 0.03 }, { p: [hx + 0.02, hyy + 0.16, hz - 0.02], rx: 0.045, ry: 0.045 }], 6);
  } else if (t === 'knife') {
    paint(ctx, wood); rod(ctx, [hx, hyy, hz + 0.05], [hx, hyy, hz - 0.06], 0.014, 4);
    paint(ctx, iron, 0.35, 0.85); box(ctx, hx - 0.004, hyy - 0.018, hz - 0.2, hx + 0.004, hyy + 0.012, hz - 0.06);
  } else if (t === 'brush') {
    paint(ctx, wood); rod(ctx, [hx, hyy, hz + 0.06], [hx, hyy, hz - 0.3], 0.013, 4);
    paint(ctx, ok('#1c1714'), 0.3); box(ctx, hx - 0.03, hyy - 0.03, hz - 0.4, hx + 0.03, hyy + 0.03, hz - 0.3);
  } else if (t === 'needle') {
    paint(ctx, wood); box(ctx, hx - 0.01, hyy - 0.02, hz - 0.2, hx + 0.01, hyy + 0.02, hz - 0.02);
    paint(ctx, ok('#d8c8a0')); rod(ctx, [hx, hyy, hz - 0.2], [hx - 0.15, hyy - 0.3, hz - 0.3], 0.006, 3);
  } else if (t === 'fish') {
    paint(ctx, ok('#9aa8a8'), 0.4, 0.3); ell(ctx, [hx, hyy - 0.17, hz - 0.03], [0.035, 0.16, 0.05], 6, 4);
    paint(ctx, ok('#7e8c8c'), 0.4, 0.3); box(ctx, hx - 0.005, hyy - 0.4, hz - 0.08, hx + 0.005, hyy - 0.3, hz + 0.02);
  } else if (t === 'coil') {
    paint(ctx, ok('#c2a878'));
    for (let k = 0; k < 3; k++) { const pts = [], r = 0.16 - k * 0.012; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI * 2; pts.push({ p: [hx + 0.04 * k, hyy - 0.16 + Math.sin(a) * r, hz - 0.08 + Math.cos(a) * r], rx: 0.016, ry: 0.016 }); } tube(ctx, pts, 4); }
  } else if (t === 'rope') {
    paint(ctx, ok('#c2a878')); const R = p.rope ?? 3;
    tube(ctx, [{ p: [hx - 0.06, hyy, hz + 0.3], rx: 0.02, ry: 0.02 }, { p: [hx - 0.06, hyy, hz], rx: 0.022, ry: 0.022 }, { p: [hx - 0.12, hyy + 0.08, hz - R * 0.5], rx: 0.024, ry: 0.024 }, { p: [hx - 0.25, hyy + 0.25, hz - R], rx: 0.024, ry: 0.024 }], 5);
  }
  // ---- what rides the shoulder
  if (p.load) {
    ctx.bone('load');
    if (p.load === 'crate') { paint(ctx, ok('#b08858')); box(ctx, -0.12, 1.58, -0.17, 0.4, 1.9, 0.25); if (fine) { paint(ctx, ok('#5a4030')); box(ctx, -0.125, 1.58, -0.02, 0.405, 1.905, 0.03); box(ctx, 0.11, 1.58, -0.175, 0.17, 1.905, 0.255); } }
    else if (p.load === 'sack') { paint(ctx, ok('#d8c8a0')); ell(ctx, [0.16, 1.7, 0.03], [0.26, 0.14, 0.18], seg + 1, rg); if (fine) ell(ctx, [-0.1, 1.7, 0.03], [0.05, 0.06, 0.06], 5, 3); }
    else if (p.load === 'plank') { paint(ctx, ok('#c49a64')); box(ctx, 0.04, 1.6, -1.2, 0.26, 1.66, 1.0); box(ctx, 0.05, 1.66, -1.1, 0.25, 1.72, 0.9); }
  }
  if (p.roll === 'barrel') {
    ctx.bone('roll');
    const pts = [[-0.27, 0.22], [-0.14, 0.27], [0, 0.29], [0.14, 0.27], [0.27, 0.22]].map(([x, r]) => ({ p: [x, 0.3, -0.72], rx: r, ry: r }));
    paint(ctx, ok('#9a7048')); tube(ctx, pts, seg + 3);
    if (mid) { paint(ctx, ok('#3e3a36'), 0.5, 0.6); for (const x of [-0.2, 0.2]) tube(ctx, [{ p: [x - 0.02, 0.3, -0.72], rx: 0.258, ry: 0.258 }, { p: [x + 0.02, 0.3, -0.72], rx: 0.258, ry: 0.258 }], seg + 3); }
  }
}
export function collider(ctx) { return { kind: 'box', width: 0.5, height: 1.75, depth: 0.4 }; }
