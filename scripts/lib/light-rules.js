// LIGHT EDITOR · the pure planner (no ctx): a survey of what stands in a tagged ring in, proposed lamps out.
// The behaviour (scripts/light-editor.js) does the reading (query, bounds, raycasts) and the writing; this only decides.
import { LE } from './data/light-rules.js';
import { RECIPES, BY, GAP, TREE_CLEAR } from './data/light-recipes.js';
export function classify(id, tags) {
  const s = (String(id ?? '') + ' ' + (tags ?? []).join(' ')).toLowerCase();
  for (const [c, re] of LE.classes) if (re.test(s)) return c;
  return null;
}
export function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const capOf = (rM, dens) => { const d = LE.density[dens] ?? LE.density.natural; return Math.max(1, Math.min(LE.maxPerArea, Math.round(d.base + rM / d.per))); };
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// survey: { c: {x,z}, r (m), things: [{ id, cls, x, z, hx, hz, wall? {x,y,z,nx,nz}, top? }], lamps: [{ kind, x, z }], open: [{x,z}] candidate open spots }
// opts: { seed, dens, kinds: {kind: bool}, area?: an area kind (data/light-recipes.js); none = the plain rules } → { picks: [{ kind, x, z, y?, nx?, nz?, why }], note }
// AUTOFILL v2 #13: torches along the worn paths in the ring: one every ~LE.path.gap m of path, jittered along it, alternating sides,
// standing just off the path's edge. survey.paths = [{ pts: [[x,z]...], w }] clipped near the ring.
function pathCands(survey, pick, R) {
  const { c, r } = survey, P0 = LE.path, out = []; if (r < P0.minR) return out;
  const P = { ...P0, gap: Math.max(P0.minGap ?? 7, Math.min(P0.gap, r * 2 / 3)) }; // a small ring still gets ~3 posts along its trail; never closer than a torch's own spacing
  for (const pa of survey.paths ?? []) {
    let carry = R() * P.gap, side = R() < .5 ? -1 : 1;
    for (let i = 0; i + 1 < pa.pts.length; i++) {
      const [ax, az] = pa.pts[i], [bx, bz] = pa.pts[i + 1], L = Math.hypot(bx - ax, bz - az); if (L < .01) continue;
      const ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let d = carry; d < L; d += P.gap) {
        const dj = Math.max(0, Math.min(L, d + (R() * 2 - 1) * P.jitter)), off = pa.w / 2 + P.side + R() * .5;
        const x = ax + ux * dj - uz * off * side, z = az + uz * dj + ux * off * side; side = -side;
        if (Math.hypot(x - c.x, z - c.z) > r) continue;
        const k = pick(['torch', 'hornLantern']); if (k) out.push({ cls: 'path', kind: k, x, z, why: k === 'torch' ? 'a torch post along the worn path' : 'a lantern post along the path' });
      }
      carry = L < carry ? carry - L : P.gap - ((L - carry) % P.gap); // the walk to the next post carries over the bend
    }
  }
  return out;
}
// AUTOFILL v2 #12: a lantern never sits on the grass: a free-standing horn lantern becomes a lantern on a hook post
const hang = (p) => { if (p.kind === 'hornLantern' && !p.onTop) { p.kind = 'lanternPost'; p.why = String(p.why).replace(/horn lantern|lantern/i, 'lantern post'); } return p; };
export function plan(survey, opts = {}) {
  const rec = opts.area ? RECIPES[opts.area] ?? null : null, w = (k) => rec ? (rec.kinds[k] ?? 0) : 1;
  const R = rng(opts.seed ?? 1), allow = (k) => !!LE.kinds[k] && (opts.kinds?.[k] ?? true) && w(k) > 0, pick = (list) => {
    const ok = list.filter(allow); if (!ok.length) return null; if (!rec) return ok[Math.floor(R() * ok.length)];
    let s = 0; for (const k of ok) s += w(k); let x = R() * s; for (const k of ok) { x -= w(k); if (x < 0) return k; } return ok[ok.length - 1];
  };
  const { c, r } = survey, things = (survey.things ?? []).filter((t) => t.cls && t.cls !== 'skip' && t.cls !== 'tree' && t.cls !== 'lamp' && (!rec?.only || rec.only.includes(t.cls)));
  const houses = things.filter((t) => t.cls === 'house');
  if (rec) return planArea(survey, opts, rec, R, allow, pick, things, houses);
  if (!things.length && !(survey.paths ?? []).length) return { picks: [], note: 'Nothing built here: wild ground stays dark. That dark is the design.' };
  const cand = [];
  const out = (t, by = 1.1) => { // a point just outside the thing's box, on the side facing the ring's centre
    const dx = c.x - t.x, dz = c.z - t.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    const reach = Math.abs(ux) * t.hx + Math.abs(uz) * t.hz; return { x: t.x + ux * (reach + by), z: t.z + uz * (reach + by), ux, uz };
  };
  for (const t of [...things].sort((a, b) => d2(a, c) - d2(b, c))) {
    if (t.cls === 'forge') { const k = pick(['brazier', 'forge']); if (k) { const p = out(t, 1.2); cand.push({ cls: t.cls, kind: k, x: p.x, z: p.z, why: `${k === 'forge' ? 'forge glow' : 'a brazier'} by the ${t.name ?? 'smithy'}` }); } }
    else if (t.cls === 'gate' || t.cls === 'bridge') {
      const k = pick(['torch', 'brazier']); if (!k) continue;
      const long = t.hx >= t.hz, w = (long ? t.hx : t.hz) + 0.6;
      if (k === 'torch') for (const sgn of [-1, 1]) cand.push({ cls: t.cls, kind: 'torch', x: t.x + (long ? sgn * w : 0.9), z: t.z + (long ? 0.9 : sgn * w), why: `torches flank the ${t.cls}` });
      else { const p = out(t, 1); cand.push({ cls: t.cls, kind: k, x: p.x, z: p.z, why: `a brazier at the ${t.cls}` }); }
    } else if (t.cls === 'house') {
      if (t.wall && allow('sconce')) cand.push({ cls: 'house', kind: 'sconce', x: t.wall.x, z: t.wall.z, y: t.wall.y, nx: t.wall.nx, nz: t.wall.nz, wall: true, why: `a rushlight on the ${t.name ?? 'house'} wall` });
      if (t.hx * t.hz * 4 > 60 && R() < 0.5 && allow('torch')) { const p = out(t, 1.6); cand.push({ cls: 'house', kind: 'torch', x: p.x - p.uz * 1.4, z: p.z + p.ux * 1.4, why: `a torch post by the ${t.name ?? 'hall'}` }); }
    } else if (t.cls === 'dock') { const k = pick(['torch', 'hornLantern']); if (k === 'torch') { const p = out(t, 0.4); cand.push({ cls: 'dock', kind: 'torch', x: p.x, z: p.z, why: 'a pole torch at the landing' }); } }
    else if (t.cls === 'well') { if (allow('torch')) { const p = out(t, 1.3); cand.push({ cls: 'well', kind: 'torch', x: p.x, z: p.z, why: 'a torch by the well' }); } }
    else if (t.cls === 'pen') { if (allow('torch')) { const p = out(t, 0.8); cand.push({ cls: 'pen', kind: 'torch', x: p.x, z: p.z, why: 'a torch at the pen' }); } }
    else if (t.cls === 'sacred') { const k = pick(['tallowLamp']); if (k) { const p = out(t, 0.5); cand.push({ cls: 'sacred', kind: k, x: p.x, z: p.z, why: `an oil lamp at the ${t.name ?? 'stone'}` }); } }
    else if (t.cls === 'table' && t.top != null) { const k = pick(['hornLantern', 'tallowLamp']); if (k) cand.push({ cls: 'table', kind: k, x: t.x, z: t.z, y: t.top, onTop: true, why: `a ${k === 'hornLantern' ? 'lantern' : 'lamp'} on the ${t.name ?? 'table'}` }); }
  }
  // the yard fire: where people gather (any building or yard thing in the ring), a fire in the open, clear of every wall
  if ((houses.length || things.some((t) => t.cls === 'yard' || t.cls === 'table')) && r >= 4) {
    const k = r > 14 && opts.dens === 'lively' && allow('bonfire') ? 'bonfire' : allow('campfire') ? 'campfire' : null;
    if (k) { const spots = [...(survey.open ?? [])].sort(() => R() - 0.5); const ok = spots.find((p) => things.every((t) => Math.max(Math.abs(p.x - t.x) - t.hx, Math.abs(p.z - t.z) - t.hz) > LE.fireClear)); if (ok) cand.push({ cls: 'yard', kind: k, x: ok.x, z: ok.z, why: `a ${k} in the open yard` }); }
  }
  cand.push(...pathCands(survey, pick, R)); cand.forEach(hang);
  // spacing against what already burns and against each other, the ring itself, then the cap by priority
  const taken = (survey.lamps ?? []).map((l) => ({ ...l })), picks = [], cap = capOf(r, opts.dens);
  const order = (x) => { const i = LE.priority.indexOf(x.cls); return i < 0 ? 99 : i; };
  for (const p of cand.sort((a, b) => order(a) - order(b) || d2(a, c) - d2(b, c))) {
    if (picks.length >= cap) break;
    if (d2(p, c) > r + 1.5) continue;
    const sp = LE.kinds[p.kind].spacing; if (taken.some((l) => d2(l, p) < Math.max(sp, LE.kinds[l.kind]?.spacing ?? 3) * (l.kind === p.kind ? 1 : 0.45))) continue;
    picks.push(p); taken.push(p);
  }
  const lit = (survey.lamps ?? []).filter((l) => d2(l, c) <= r).length;
  return { picks, note: picks.length ? '' : lit ? `Already lit: ${lit} light${lit > 1 ? 's' : ''} here cover it.` : 'Nothing here wants a fire.' };
}
// AUTOFILL: the same reading, steered by an area recipe (kinds weighted, slots per class, gaps, the lone fire, cap × densityMul)
function planArea(survey, opts, rec, R, allow, pick, things, houses) {
  const { c, r } = survey, cand = [];
  const out = (t, by, far) => { const s = far ? -1 : 1, dx = (c.x - t.x) * s, dz = (c.z - t.z) * s, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    const reach = Math.abs(ux) * t.hx + Math.abs(uz) * t.hz; return { x: t.x + ux * (reach + by), z: t.z + uz * (reach + by), ux, uz }; };
  const name = (t) => t.name ?? t.cls;
  for (const t of [...things].sort((a, b) => d2(a, c) - d2(b, c))) {
    const slots = rec.at?.[t.cls];
    if (slots) { for (const sl of slots) { const k = pick(sl.k); if (!k) continue;
      if (sl.at === 'wall') { if (t.wall) cand.push({ cls: t.cls, kind: k, x: t.wall.x, z: t.wall.z, y: t.wall.y, nx: t.wall.nx, nz: t.wall.nz, wall: true, why: `a ${LE.kinds[k].label.toLowerCase()} on the ${name(t)} wall` }); continue; }
      if (sl.at === 'top') { if (t.top != null) cand.push({ cls: t.cls, kind: k, x: t.x, z: t.z, y: t.top, onTop: true, why: `a ${LE.kinds[k].label.toLowerCase()} on the ${name(t)}` }); continue; }
      const p = out(t, BY[k] ?? 1, sl.at === 'far'); cand.push({ cls: t.cls, kind: k, x: p.x, z: p.z, why: `a ${LE.kinds[k].label.toLowerCase()} at the ${sl.at === 'far' ? name(t) + ' head' : name(t)}` }); } continue; }
    if (t.cls === 'gate' || t.cls === 'bridge') { const k = pick(['torch', 'brazier']); if (!k) continue; const long = t.hx >= t.hz, ww = (long ? t.hx : t.hz) + 0.6;
      if (k === 'torch') for (const sgn of [-1, 1]) cand.push({ cls: t.cls, kind: k, x: t.x + (long ? sgn * ww : 0.9), z: t.z + (long ? 0.9 : sgn * ww), why: `torches flank the ${t.cls}` });
      else { const p = out(t, BY[k]); cand.push({ cls: t.cls, kind: k, x: p.x, z: p.z, why: `a brazier at the ${t.cls}` }); } continue; }
    if (t.cls === 'house') { if (t.wall && allow('sconce')) cand.push({ cls: 'house', kind: 'sconce', x: t.wall.x, z: t.wall.z, y: t.wall.y, nx: t.wall.nx, nz: t.wall.nz, wall: true, why: `a rushlight on the ${name(t)} wall` }); continue; }
    if (t.cls === 'table') { if (t.top == null) continue; const k = pick(['hornLantern', 'tallowLamp']); if (k) cand.push({ cls: 'table', kind: k, x: t.x, z: t.z, y: t.top, onTop: true, why: `a ${LE.kinds[k].label.toLowerCase()} on the ${name(t)}` }); continue; }
    const pref = { forge: ['forge', 'brazier'], dock: ['hornLantern', 'torch'], well: ['torch', 'hornLantern'], pen: ['hornLantern', 'torch'], sacred: ['tallowLamp'], yard: ['torch', 'hornLantern'] }[t.cls];
    const k = pref && pick(pref); if (k) { const p = out(t, BY[k] ?? 1); cand.push({ cls: t.cls, kind: k, x: p.x, z: p.z, why: `a ${LE.kinds[k].label.toLowerCase()} by the ${name(t)}` }); }
  }
  if (rec.gaps && allow(rec.gaps)) for (let i = 0; i < houses.length; i++) for (let j = i + 1; j < houses.length; j++) {
    const a = houses[i], b = houses[j], gap = Math.max(Math.abs(a.x - b.x) - a.hx - b.hx, Math.abs(a.z - b.z) - a.hz - b.hz);
    if (gap >= GAP.min && gap <= GAP.max) cand.push({ cls: 'house', kind: rec.gaps, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, why: `a torch post between the houses` });
  }
  const built = houses.length || things.some((t) => t.cls === 'yard' || t.cls === 'table');
  if (r >= 4 && (rec.fire === 'any' || (rec.fire === 'built' && built))) {
    const k = r > 14 && opts.dens === 'lively' && allow('bonfire') ? 'bonfire' : allow('campfire') ? 'campfire' : allow('bonfire') && r > 14 ? 'bonfire' : null;
    if (k) { const trees = (survey.things ?? []).filter((t) => t.cls === 'tree'), spots = [...(survey.open ?? [])].sort(() => R() - 0.5);
      const ok = spots.find((p) => things.every((t) => Math.max(Math.abs(p.x - t.x) - t.hx, Math.abs(p.z - t.z) - t.hz) > LE.fireClear) && trees.every((t) => d2(p, t) > TREE_CLEAR));
      if (ok) cand.push({ cls: 'yard', kind: k, x: ok.x, z: ok.z, why: `a ${k} in the open` }); }
  }
  if (rec.paths === true || (rec.paths !== false && !rec.only)) cand.push(...pathCands(survey, pick, R));
  cand.forEach(hang);
  const taken = (survey.lamps ?? []).map((l) => ({ ...l })), picks = [], n = {}, cap = Math.max(rec.floor ?? 0, Math.round(capOf(r, opts.dens) * rec.densityMul * (opts.densityMul ?? 1)));
  const why = { outside: 0, spaced: 0, capped: 0, kindMax: 0 }; // AUTOFILL v2 #16: what stopped each candidate, for the empty-scan note
  const order = (x) => { const i = LE.priority.indexOf(x.cls); return i < 0 ? 99 : i; };
  for (const p of cand.sort((a, b) => order(a) - order(b) || d2(a, c) - d2(b, c))) {
    if (picks.length >= cap) { why.capped++; continue; }
    if (d2(p, c) > r + 1.5) { why.outside++; continue; }
    if ((n[p.kind] ?? 0) >= (rec.max?.[p.kind] ?? Infinity)) { why.kindMax++; continue; }
    const sp = LE.kinds[p.kind].spacing; if (taken.some((l) => d2(l, p) < Math.max(sp, LE.kinds[l.kind]?.spacing ?? 3) * (l.kind === p.kind ? 1 : 0.45))) { why.spaced++; continue; }
    picks.push(p); taken.push(p); n[p.kind] = (n[p.kind] ?? 0) + 1;
  }
  const lit = (survey.lamps ?? []).filter((l) => d2(l, c) <= r).length;
  const fired = picks.some((p) => p.kind === 'campfire' || p.kind === 'bonfire');
  const empty = lit && why.spaced ? `Already lit: ${lit} light${lit > 1 ? 's' : ''} here cover it; ${why.spaced} more would have crowded them.`
    : opts.area === 'wild' ? 'Wild ground stays dark. That dark is the design.'
    : !cand.length ? 'Nothing inside the ring a fire belongs to: no door, path, pen or post. Widen the ring or click nearer a building.'
    : why.outside === cand.length ? `The ${cand.length} spot${cand.length > 1 ? 's' : ''} it found sit just outside the ring. Widen it a little.`
    : `Found ${cand.length} spot${cand.length > 1 ? 's' : ''}; ${why.spaced} too close to other fire, ${why.outside} outside the ring, ${why.kindMax} over the area's limit.`;
  return { picks, why, note: picks.length ? (fired || !rec.noFire ? rec.notes : rec.noFire) : empty };
}
export const summary = (picks) => { const n = {}; for (const p of picks) n[p.kind] = (n[p.kind] ?? 0) + 1; return Object.entries(n).map(([k, v]) => `${v} ${LE.kinds[k].label.toLowerCase()}${v > 1 ? 's' : ''}`).join(', '); };
