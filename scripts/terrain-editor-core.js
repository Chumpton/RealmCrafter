// TERRAIN EDITOR (creator 2026-10-07: "match or exceed UE5 Landscape / Unity Terrain / Blender Sculpt"). Editors only, on the editor's machine.
// Admin → Terrain Editor (or O → Terrain) opens the dock. The pointer ray drives a ground reticle (radius dome + falloff ring + normal);
// LMB applies the tool, Shift inverts, Ctrl samples height; [ ] radius, Shift+[ ] falloff, Ctrl+[ ] strength; Ctrl+Z / Ctrl+Y undo/redo.
// Each stroke is ONE commit (one History row) of terrain marks or scatter beds, so it streams, collides and saves like authored ground.
// Owns: player.state.te (the dock's view + this editor's undo/redo stacks). Mark keys: te-<tool>-<stamp>-<n>. Beds: te-fol-<stamp>-<n>.
import { raycast, getInputRay } from 'builtin/physics';
import { TE, TOOLS, WET, BIOME, POND, ALL_LAYERS as LAYERS } from './lib/data/terrain-editor.js';
import { PREFAB } from './lib/data/prefabs.js';
const r2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TOOL = Object.fromEntries(TOOLS.map((t) => [t[0], t]));
const HELD = new Set(['raise', 'smooth', 'flatten', 'terrace', 'erodeT', 'noise', 'pinch', 'paint', 'blend', 'wet', 'foliage', 'reseed']);
const TWO = new Set(['ramp', 'chisel']);
const sess = new Map();
const S = (ctx) => { let v = sess.get(ctx.self.id); if (!v) sess.set(ctx.self.id, v = { ret: null, stroke: null, n: 0, aim: null }); return v; };
const H = (ctx, x, z) => { const h = ctx.place.terrain?.heightAt?.(x, z); return typeof h === 'number' && isFinite(h) ? h : null; };
const snapH = (te, h) => { const s = +te.snap || 0; return s ? Math.round(h / s) * s : h; };
const def = (te) => ({ open: false, tool: 'raise', r: TE.radius.def, s: TE.strength.def, f: TE.falloff.def, curve: 'smooth', mat: 'grass', mat2: null, snap: 0, h: null, dens: 1, fol: { oak: 1, shrub: 2, fern: 2, rock: 1 }, sc: [0.8, 1.25], hist: [], redo: [], pend: [], snow: BIOME.snowLine, ...te });
function view(ctx, patch) { const me = ctx.self; me.state.te = { ...def(me.state.te ?? {}), ...patch }; }
function toast(ctx, msg) { view(ctx, { note: msg, noteAt: ctx.now() }); }
// ── the reticle: a unit dome (radius), a unit falloff ring and a normal stick, local to this machine, scaled per frame
function reticle(ctx, at, te, n) {
  const v = S(ctx);
  if (!v.ret || !ctx.getObject(v.ret)) {
    v.ret = ctx.spawn({ audience: 'local', scope: 'session', tags: ['te-ret'], feetPosition: at, castShadow: false, receiveShadow: false,
      primitive: { kind: 'sphere', radius: 1, widthSegments: 40, heightSegments: 14, thetaLength: Math.PI / 2 },
      material: { color: '#9fe4ff', emissive: '#5fc8ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.16, side: 'double', depthWrite: false },
      children: [
        { id: 'edge', feetPosition: { x: 0, y: 0.03, z: 0 }, rotation: { pitch: -90 }, pivot: 'center', castShadow: false, primitive: { kind: 'ring', innerRadius: 0.965, outerRadius: 1, thetaSegments: 72 }, material: { color: '#d8f6ff', emissive: '#bdefff', emissiveIntensity: 2.2, transparent: true, opacity: 0.95, depthWrite: false, side: 'double' } },
        { id: 'stick', feetPosition: { x: 0, y: 0, z: 0 }, castShadow: false, primitive: { kind: 'cylinder', radiusTop: 0.012, radiusBottom: 0.012, height: 0.5 }, material: { color: '#ffd77a', emissive: '#ffcf6a', emissiveIntensity: 2 } },
      ] });
    v.fall = ctx.spawn({ audience: 'local', scope: 'session', tags: ['te-ret'], feetPosition: at, rotation: { pitch: -90 }, pivot: 'center', castShadow: false, receiveShadow: false,
      primitive: { kind: 'ring', innerRadius: 0.985, outerRadius: 1, thetaSegments: 72 }, material: { color: '#ffcf6a', emissive: '#ffb45a', emissiveIntensity: 1.6, transparent: true, opacity: 0.7, depthWrite: false, side: 'double' } });
  }
  const o = ctx.getObject(v.ret), fo = ctx.getObject(v.fall), r = te.r, inv = te.inv;
  const flat = !HELD.has(te.tool) && !['hole', 'lake', 'erodeH'].includes(te.tool);
  if (o) { o.feetPosition = { x: at.x, y: at.y + 0.02, z: at.z }; o.scale = { x: r, y: flat ? 0.05 : Math.min(r, 6) * 0.6, z: r };
    o.material = { color: inv ? '#ffb0a0' : '#9fe4ff', emissive: inv ? '#ff7a5a' : '#5fc8ff', emissiveIntensity: 0.9, transparent: true, opacity: 0.16, side: 'double', depthWrite: false };
    const st = ctx.getObject(v.ret + '/stick'); if (st) { st.scale = { x: 1 / r, y: 3 / Math.max(0.05, o.scale.y), z: 1 / r }; st.rotation = n ? { lookAt: { x: at.x + n.x * 10, y: at.y + n.y * 10, z: at.z + n.z * 10 }, include: ['yaw', 'pitch'] } : 0; } }
  if (fo) { const R = r + te.f; fo.feetPosition = { x: at.x, y: at.y + 0.04, z: at.z }; fo.scale = { x: R, y: R, z: 1 }; fo.visible = te.f > 0.2; }
}
function hideReticle(ctx) { const v = S(ctx); for (const id of [v.ret, v.fall]) if (id && ctx.getObject(id)) ctx.destroy(id); v.ret = v.fall = null;
  for (const id of ctx.query({ tags: ['te-ret'], select: 'ids' }) ?? []) if (ctx.getObject(id)) ctx.destroy(id); } // orphans too: a script reload forgets the old reticle's id, so the ring and dome used to stay on the ground
function aim(ctx, input) {
  const r = getInputRay(ctx, input); if (!r) return null;
  const h = raycast(ctx, r.origin, r.direction, { distance: 600, bodies: 'static', ignoreEntities: [ctx.self.id], excludeTags: ['te-ret', 'player', 'bld-ghost'] });
  if (!h) return null; const t = H(ctx, h.position.x, h.position.z);
  return { x: r2(h.position.x), y: r2(t ?? h.position.y), z: r2(h.position.z), n: h.normal ?? { x: 0, y: 1, z: 0 } };
}
// ── sampling
const mean = (ctx, p, r) => { let s = 0, n = 0; for (let i = 0; i < 9; i++) { const a = i * 0.698, d = i ? r * 0.7 : 0, h = H(ctx, p.x + Math.cos(a) * d, p.z + Math.sin(a) * d); if (h != null) { s += h; n++; } } return n ? s / n : p.y; };
const slope = (ctx, x, z, e = 1.5) => { const a = H(ctx, x + e, z), b = H(ctx, x - e, z), c = H(ctx, x, z + e), d = H(ctx, x, z - e); if ([a, b, c, d].some((v) => v == null)) return 0; return Math.hypot((a - b) / (2 * e), (c - d) / (2 * e)); };
const circ = (p, r, k = 10) => Array.from({ length: k }, (_, i) => [r2(p.x + Math.cos(i / k * 6.2832) * r), r2(p.z + Math.sin(i / k * 6.2832) * r)]);
const disc = (p, r) => [[r2(p.x - 0.02), r2(p.z)], [r2(p.x + 0.02), r2(p.z)]]; // a paint strip one dab long: a soft disc of width 2r
// ── one dab → { marks: {key: mark}, beds: [spec], kill: [ids] }
function dab(ctx, te, p, extra = {}) {
  const v = S(ctx), key = (t) => `te-${t}-${Math.floor(ctx.now()).toString(36)}-${v.n++}`, out = { marks: {}, beds: [], kill: [] };
  const r = te.r, f = te.f, s = te.s, curve = te.curve, inv = !!te.inv, flat = (h, rr = r, ff = f, c = curve, mat) => ({ kind: 'flatten', center: { x: p.x, z: p.z }, height: r2(h), shape: { kind: 'circle', radius: r2(rr) }, falloff: r2(Math.max(0.5, ff)), falloffCurve: c, ...(mat ? { material: mat } : {}) });
  const h0 = H(ctx, p.x, p.z) ?? p.y;
  switch (te.tool) {
    case 'raise': out.marks[key('raise')] = flat(snapH(te, h0 + (inv ? -s : s)), r * 0.55, r * 0.45 + f); break;
    case 'smooth': out.marks[key('smooth')] = flat(mean(ctx, p, r), r * 0.5, r * 0.5 + f, 'smooth'); break;
    case 'flatten': out.marks[key('flatten')] = flat(snapH(te, te.h ?? h0)); break;
    case 'terrace': { const st = Math.max(0.25, s); out.marks[key('terrace')] = flat((inv ? Math.ceil : Math.floor)(mean(ctx, p, r * 0.5) / st) * st, r, Math.max(0.6, f * 0.4), 'cliff'); break; }
    case 'erodeT': { const sl = slope(ctx, p.x, p.z, Math.max(1, r * 0.3)); if (sl < TE.thermalRepose) { out.skip = 'slope already settled'; break; }
      out.marks[key('slump')] = flat(mean(ctx, p, r) - (sl - TE.thermalRepose) * r * 0.15, r * 0.6, r * 0.6 + f, 'linear', 'mossRock'); break; }
    case 'noise': for (let i = 0; i < 5; i++) { const a = ctx.random() * 6.283, d = ctx.random() * r, q = { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d }, hq = H(ctx, q.x, q.z) ?? h0, rr = r * (0.18 + ctx.random() * 0.22);
      out.marks[key('noise')] = { kind: 'flatten', center: { x: r2(q.x), z: r2(q.z) }, height: r2(hq + (ctx.random() * 2 - 1) * s * 0.6), shape: { kind: 'circle', radius: r2(rr * 0.4) }, falloff: r2(rr), falloffCurve: 'smooth' }; } break;
    case 'pinch': out.marks[key(inv ? 'expand' : 'pinch')] = inv ? flat(h0, r, f, 'smooth') : flat(h0 + s, r * 0.18, r * 0.82 + f, 'linear'); break;
    case 'hole': out.marks[key('hole')] = { kind: 'hole', points: circ(p, r, 12) }; break;
    case 'erodeH': { const pts = [[r2(p.x), r2(p.z)]]; let q = { x: p.x, z: p.z }; // steepest descent
      for (let i = 0; i < TE.gullySteps; i++) { let best = null, bh = H(ctx, q.x, q.z) ?? 0; for (let k = 0; k < 8; k++) { const a = k * 0.785, nx = q.x + Math.cos(a) * TE.gullyStep, nz = q.z + Math.sin(a) * TE.gullyStep, hh = H(ctx, nx, nz); if (hh != null && hh < bh - 0.05) { bh = hh; best = { x: nx, z: nz }; } } if (!best) break; q = best; pts.push([r2(q.x), r2(q.z)]); }
      if (pts.length < 3) { out.skip = 'no downhill here for water to run'; break; }
      pts.forEach(([x, z], i) => { if (i % 2) return; const hh = H(ctx, x, z); if (hh == null) return; const t = i / pts.length, w = Math.max(1, r * 0.35 * (0.5 + t));
        out.marks[key('gully')] = { kind: 'flatten', center: { x, z }, height: r2(hh - s * (0.4 + t * 0.6)), shape: { kind: 'circle', radius: r2(w * 0.35) }, falloff: r2(w), falloffCurve: 'smooth', material: 'wowDirtRut', edgeMaterial: 'shoreline' }; }); break; }
    case 'paint': case 'blend': out.marks[key(te.tool)] = { kind: 'path', grade: false, points: disc(p, r), width: r2(r * 2), material: te.mat, edgeMaterial: te.mat2 ?? te.mat, noise: te.tool === 'blend' ? 0.7 : 0.25, falloff: r2(te.tool === 'blend' ? Math.max(f, r) : f) }; break;
    case 'wet': { const m = ctx.place.terrain?.materialAt?.(p.x, p.z); const id = typeof m === 'string' ? m : (m && typeof m === 'object' ? Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] : null);
      out.marks[key('wet')] = { kind: 'path', grade: false, points: disc(p, r), width: r2(r * 2), material: WET[id] ?? WET._, noise: 0.55, falloff: r2(Math.max(1, f)) }; break; }
    case 'biome': { const g = Math.max(TE.biomeGrid, r / 4); let n = 0;
      for (let x = -r; x <= r && n < TE.biomeMax; x += g) for (let z = -r; z <= r && n < TE.biomeMax; z += g) { if (x * x + z * z > r * r) continue; const qx = p.x + x, qz = p.z + z, hh = H(ctx, qx, qz); if (hh == null) continue;
        const sl = slope(ctx, qx, qz), m = hh > te.snow && sl < BIOME.cliffAt ? BIOME.high : sl >= BIOME.cliffAt ? BIOME.cliff : sl >= BIOME.steepAt ? BIOME.steep : hh < BIOME.sandLine ? BIOME.low : BIOME.flat;
        out.marks[key('biome')] = { kind: 'path', grade: false, points: disc({ x: qx, z: qz }, g), width: r2(g * 1.3), material: m, noise: 0.5, falloff: r2(g * 0.6) }; n++; } break; }
    case 'foliage': {
      if (inv) { out.marks[key('clear')] = { kind: 'clear-scatter', center: { x: p.x, z: p.z }, shape: { kind: 'circle', radius: r2(r) } };
        for (const q of ctx.query({ tags: ['te-fol'], center: { x: p.x, y: p.y, z: p.z }, radius: r })) out.kill.push(q.id); break; }
      const ws = Object.entries(te.fol ?? {}).filter(([id, w]) => (PREFAB[id] || te.folX?.[id]) && w > 0); if (!ws.length) { out.skip = 'pick a plant or ＋ any card into the brush'; break; }
      const count = clamp(Math.round(te.dens * TE.folPer100 * Math.PI * r * r / 100), 1, TE.folMax);
      const templates = ws.map(([id, w]) => { const { physics, behavior, tags, state: _s, label: _l, ...look } = PREFAB[id]?.spec ?? te.folX[id]; return { weight: w, ...look, ...(physics && /oak|birch|sapling|rock|log/.test(id) ? { physics } : {}) }; });
      const jy = te.jy ?? 180, jt = +te.jt || 0, nn = p.n ?? { x: 0, y: 1, z: 0 }, ap = te.align ? Math.atan2(nn.z, nn.y) * 57.3 : 0, ar = te.align ? Math.atan2(-nn.x, nn.y) * 57.3 : 0, rnd = (a) => (ctx.random() * 2 - 1) * a;
      const tilt = jt > 0 || te.align ? Object.fromEntries(Array.from({ length: count }, (_, i) => [String(i), { rotation: { yaw: r2(rnd(jy)), pitch: r2(ap + rnd(jt)), roll: r2(ar + rnd(jt)) } }])) : null;
      out.beds.push({ id: `te-fol-${Math.floor(ctx.now()).toString(36)}-${v.n++}`, tags: ['te-fol', 'placed-scatter'], feetPosition: { x: p.x, y: r2(h0), z: p.z }, state: { r, count, seed: Math.floor(ctx.random() * 1e6) },
        scatter: { bounds: { shape: 'circle', radius: r2(r) }, count, seed: Math.floor(ctx.random() * 1e6), templates, variation: { scale: te.sc ?? [0.8, 1.25], yaw: [-jy, jy] }, ...(tilt ? { instanceOverrides: tilt } : {}) } }); break; }
    case 'reseed': for (const q of ctx.query({ tags: ['te-fol'], center: { x: p.x, y: p.y, z: p.z }, radius: r + 30 })) { const o = ctx.getObject(q.id); if (!o?.scatter) continue; out.reseed = (out.reseed ?? []).concat(q.id); } if (!out.reseed) out.skip = 'no painted foliage here'; break;
    case 'lake': out.marks[key('lake')] = { kind: 'lake', at: { x: p.x, z: p.z }, radius: r2(r), depth: r2(Math.max(0.5, s)), bedMaterial: 'shoreline' }; break;
    default: break;
  }
  return out;
}
// two-click and multi-click tools
function line(ctx, te, a, b) {
  const v = S(ctx), k = (t) => `te-${t}-${Math.floor(ctx.now()).toString(36)}-${v.n++}`, out = { marks: {}, beds: [], kill: [] };
  if (te.tool === 'ramp') out.marks[k('ramp')] = { kind: 'path', grade: true, maxGrade: r2(clamp(te.s / 10, 0.05, 0.5)), clearScatter: true, points: [[a.x, a.z], [b.x, b.z]], width: r2(te.r * 2), falloff: r2(Math.max(1, te.f)), noise: 0.2, material: te.mat === 'grass' ? 'wowDirt' : te.mat, edgeMaterial: 'grass' };
  if (te.tool === 'chisel') { const h = Math.min(H(ctx, a.x, a.z) ?? a.y, H(ctx, b.x, b.z) ?? b.y) - te.s; out.marks[k('chisel')] = { kind: 'flatten', height: r2(snapH(te, h)), shape: { kind: 'path', points: [[a.x, a.z], [b.x, b.z]], width: r2(Math.max(1, te.r * 0.6)) }, center: { x: r2((a.x + b.x) / 2), z: r2((a.z + b.z) / 2) }, falloff: r2(Math.max(0.8, te.f * 0.3)), falloffCurve: 'cliff', maxGrade: 1, material: 'rock', edgeMaterial: 'mossRock' }; }
  if (te.tool === 'river') out.marks[k('river')] = { kind: 'river', points: te.pend.map((q) => [q.x, q.z]), width: r2(te.r), depth: r2(Math.max(0.6, te.s * 0.6)), bedMaterial: 'shoreline' };
  return out;
}
function apply(ctx, te, out, label) {
  const keys = Object.keys(out.marks), beds = out.beds ?? [], kill = out.kill ?? [], re = out.reseed ?? [];
  if (!keys.length && !beds.length && !kill.length && !re.length) return null;
  const gone = kill.map((id) => { const o = ctx.getObject(id); return o ? { id, spec: { tags: ['te-fol', 'placed-scatter'], feetPosition: o.feetPosition, state: o.state, scatter: o.scatter } } : null; }).filter(Boolean);
  ctx.commit(`terrain editor: ${label}`, () => {
    const M = ctx.place.terrain.marks; for (const k of keys) M[k] = out.marks[k];
    for (const b of beds) ctx.spawn(b.id, b); for (const id of kill) if (ctx.getObject(id)) ctx.destroy(id);
    for (const id of re) { const o = ctx.getObject(id); if (o?.scatter) { const b = o.feetPosition, h = H(ctx, b.x, b.z); if (h != null) o.feetPosition = { x: b.x, y: r2(h), z: b.z }; o.scatter = { ...o.scatter }; } }
  });
  return { keys, beds: beds.map((b) => b.id), gone };
}
function pushHist(ctx, te, label, res) {
  if (!res) return; const M = ctx.place.terrain.marks;
  const e = { id: Math.floor(ctx.now()).toString(36), label, at: ctx.now(), keys: res.keys, beds: res.beds, gone: res.gone, marks: Object.fromEntries(res.keys.map((k) => [k, M[k]])) };
  te.hist = [...(te.hist ?? []), e].slice(-40); te.redo = [];
}
function undo(ctx, te) {
  const e = (te.hist ?? []).pop(); if (!e) return toast(ctx, 'nothing to undo');
  ctx.commit(`terrain editor: undo ${e.label}`, () => { const M = ctx.place.terrain.marks; for (const k of e.keys) delete M[k]; for (const id of e.beds ?? []) if (ctx.getObject(id)) ctx.destroy(id); for (const g of e.gone ?? []) ctx.spawn(g.id, g.spec); });
  te.redo = [...(te.redo ?? []), e].slice(-40); view(ctx, { hist: te.hist, redo: te.redo, note: `undid ${e.label}`, noteAt: ctx.now() });
}
function redo(ctx, te) {
  const e = (te.redo ?? []).pop(); if (!e) return toast(ctx, 'nothing to redo');
  ctx.commit(`terrain editor: redo ${e.label}`, () => { const M = ctx.place.terrain.marks; for (const k of e.keys) M[k] = e.marks[k]; for (const g of e.gone ?? []) if (ctx.getObject(g.id)) ctx.destroy(g.id); });
  te.hist = [...(te.hist ?? []), { ...e, beds: [] }].slice(-40); view(ctx, { hist: te.hist, redo: te.redo, note: `redid ${e.label}`, noteAt: ctx.now() });
}
const LABEL = (te, inv) => (te.tool === 'raise' && inv ? 'Lower' : te.tool === 'pinch' && inv ? 'Expand' : te.tool === 'foliage' && inv ? 'Foliage erase' : (TOOL[te.tool]?.[2] ?? te.tool).replace(/ \/.*$/, ''));
const me0 = (ctx) => ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
function ops(ctx, te, a) {
  const n = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  switch (a.op) {
    case 'open': if (te.open) hideReticle(ctx); return view(ctx, { open: !te.open, pend: [] });
    case 'close': hideReticle(ctx); return view(ctx, { open: false, pend: [] });
    case 'tool': return view(ctx, { tool: TOOL[a.v] ? a.v : 'raise', pend: [], grp: TOOL[a.v]?.[3] ?? te.grp, tab: 'terrain', selSeen: a.sel ?? te.selSeen ?? null });
    case 'grp': return view(ctx, { grp: String(a.v) });
    case 'tab': return view(ctx, { tab: ['terrain', 'transform', 'props', 'outline', 'logic', 'ai'].includes(a.v) ? a.v : 'terrain', selSeen: a.sel ?? null }); // right inspector tab (ui/hud/terrain-editor.js)
    case 'tray': return view(ctx, { tray: !te.tray }); // bottom asset tray collapsed
    case 'select': return view(ctx, { grp: 'actors', tab: 'transform' }); // the arrow: a plain click picks a placed piece (build-tool.js)
    case 'hist': return view(ctx, { histOpen: !te.histOpen });
    case 'help': return view(ctx, { help: !te.help });
    case 'rnd': return view(ctx, { rnd: te.rnd === false }); // placement: random spin + size (scripts/build-tool.js placeOpts)
    case 'rsnap': return view(ctx, { rsnap: [0, 15, 45, 90].includes(+a.v) ? +a.v : 0 });
    case 'align': return view(ctx, { align: !te.align });
    case 'jit': { const k = { jy: [0, 180], jt: [0, 15], js: [0, 50] }[a.k]; if (!k) return; return view(ctx, { [a.k]: clamp(n(+a.v, 0), k[0], k[1]) }); }
    case 'stamp': return view(ctx, { stamp: [0, 1, 2, 3, 5, 8].includes(+a.v) ? +a.v : 0 });
    case 'r': return view(ctx, { r: clamp(n(+a.v, te.r), TE.radius.min, TE.radius.max) });
    case 's': return view(ctx, { s: clamp(n(+a.v, te.s), TE.strength.min, TE.strength.max) });
    case 'f': return view(ctx, { f: clamp(n(+a.v, te.f), TE.falloff.min, TE.falloff.max) });
    case 'curve': return view(ctx, { curve: ['smooth', 'linear', 'cliff'].includes(a.v) ? a.v : 'smooth' });
    case 'mat': return view(ctx, { mat: LAYERS.some((l) => l[0] === a.v) ? a.v : te.mat });
    case 'mat2': return view(ctx, { mat2: a.v && LAYERS.some((l) => l[0] === a.v) ? a.v : null });
    case 'snap': return view(ctx, { snap: TE.snap.includes(+a.v) ? +a.v : 0 });
    case 'h': return view(ctx, { h: a.v == null || a.v === '' ? null : r2(+a.v) });
    case 'dens': return view(ctx, { dens: clamp(n(+a.v, 1), 0.1, 6) });
    case 'snow': return view(ctx, { snow: clamp(n(+a.v, BIOME.snowLine), 0, 700) });
    case 'scmin': return view(ctx, { sc: [clamp(n(+a.v, 0.8), 0.2, 4), Math.max(te.sc?.[1] ?? 1.25, +a.v)] });
    case 'scmax': return view(ctx, { sc: [Math.min(te.sc?.[0] ?? 0.8, +a.v), clamp(n(+a.v, 1.25), 0.2, 6)] });
    case 'fol': { const f = { ...(te.fol ?? {}) }; if (f[a.v] > 0) delete f[a.v]; else f[a.v] = 1; return view(ctx, { fol: f }); }
    case 'folw': { const f = { ...(te.fol ?? {}) }; if (f[a.id] != null) f[a.id] = clamp(+a.v || 1, 1, 5); return view(ctx, { fol: f }); }
    case 'undo': return undo(ctx, te);
    case 'redo': return redo(ctx, te);
    case 'jump': { const i = (te.hist ?? []).findIndex((e) => e.id === a.v); if (i < 0) return; while ((te.hist ?? []).length > i) undo(ctx, ctx.self.state.te); return; }
    case 'finish': { if (te.tool !== 'river' || (te.pend ?? []).length < 2) return toast(ctx, 'click at least two points downhill');
      const res = apply(ctx, te, line(ctx, te, null, null), 'River'); pushHist(ctx, te, 'River', res); return view(ctx, { pend: [], hist: te.hist, redo: te.redo }); }
    case 'cancel': return view(ctx, { pend: [] });
    case 'export': { const c = S(ctx).aim ?? me0(ctx), R = 64, g = 2, rows = [];
      for (let z = -R; z <= R; z += g) { const row = []; for (let x = -R; x <= R; x += g) row.push(r2(H(ctx, c.x + x, c.z + z) ?? 0)); rows.push(row); }
      const M = ctx.place.terrain.marks ?? {}, marks = Object.fromEntries(Object.entries(M).filter(([k]) => k.startsWith('te-')));
      const beds = ctx.query({ tags: ['te-fol'] }).map((q) => ({ id: q.id, at: q.feetPosition, scatter: ctx.getObject(q.id)?.scatter }));
      const path = `docs/terrain-editor/export-${Math.floor(ctx.now()).toString(36)}.json`;
      ctx.files.write(path, JSON.stringify({ kind: 'mellowbrook-terrain-export', place: 'main', origin: { x: r2(c.x - R), z: r2(c.z - R) }, cell: g, size: rows.length, heights: rows, marks, foliage: beds }, null, 0));
      return toast(ctx, `exported ${rows.length}×${rows.length} heights, ${Object.keys(marks).length} marks, ${beds.length} beds → ${path}`); }
    case 'count': { const k = Object.keys(ctx.place.terrain.marks ?? {}).filter((x) => x.startsWith('te-')).length; return toast(ctx, `${k} editor marks stand in this place`); }
    default: return;
  }
}
export function onInput(ctx, input) {
  const me = ctx.self; if (!me.isEditor) return;
  if (input.pressed?.te) { const a = input.actionData?.te ?? {}; ops(ctx, def(me.state.te ?? {}), a); }
  if (input.pressed?.teKey) ops(ctx, def(me.state.te ?? {}), { op: 'open' });
  const te = me.state.te; if (!te?.open) { const v = S(ctx); if (v.ret || !v.swept) { v.swept = true; hideReticle(ctx); } return; }
  const T = def(te), v = S(ctx), ctrl = !!input.held?.leCtrl, shift = !!input.held?.runHold;
  // hotkeys
  const step = (k, d) => { const lim = { r: TE.radius, s: TE.strength, f: TE.falloff }[k]; return clamp(r2(T[k] * (d > 0 ? 1.18 : 1 / 1.18) + d * lim.step), lim.min, lim.max); };
  for (const [act, d] of [['teBigger', 1], ['teSmaller', -1]]) if (input.pressed?.[act]) { const k = ctrl ? 's' : shift ? 'f' : 'r'; return view(ctx, { [k]: step(k, d) }); }
  if (input.pressed?.teTray) return view(ctx, { tray: !T.tray }); // \ hides the asset drawer for a full view
  if (ctrl && (input.pressed?.leUndo || input.pressed?.leArm) && ctx.session.edhTook && ctx.now() - ctx.session.edhTook < 200) return; // ed-history.js took this key (a build edit was newer)
  if (ctx.session.gzGrab && (input.pressed?.use || input.held?.use)) { hideReticle(ctx); return; } // the gizmo (ed-gizmo.js) owns this drag
  if (input.pressed?.leUndo && ctrl) return undo(ctx, T);
  if (input.pressed?.leArm && ctrl) return redo(ctx, T);
  // End (edDrop) drops the selection onto whatever is beneath it: scripts/ed-scatter-core.js, open shelf or not
  if (me.state.bld?.carry || T.grp === 'actors') { hideReticle(ctx); return; } // Actors mode: the click is build-tool.js's (select, box select, place) // an asset card rides the cursor: build-tool.js places it
  const p = aim(ctx, input); T.inv = shift || (ctrl && T.tool === 'foliage'); /* Ctrl-drag erases the brush's beds */ if (p) reticle(ctx, p, T, p.n); v.aim = p;
  if (!p) return;
  if (input.pressed?.use && ctrl && T.tool !== 'foliage') return view(ctx, { h: r2(p.y), tool: T.tool === 'raise' ? 'flatten' : T.tool, note: `sampled ${r2(p.y)} m`, noteAt: ctx.now() });
  if (TWO.has(T.tool) || T.tool === 'river') {
    if (!input.pressed?.use) return;
    const pend = [...(T.pend ?? []), { x: p.x, y: p.y, z: p.z }];
    if (T.tool === 'river') return view(ctx, { pend: pend.slice(-24), note: `${pend.length} river point${pend.length > 1 ? 's' : ''} · Finish lays it`, noteAt: ctx.now() });
    if (pend.length < 2) return view(ctx, { pend, note: 'start set · click the end', noteAt: ctx.now() });
    const res = apply(ctx, T, line(ctx, T, pend[0], pend[1]), LABEL(T)); pushHist(ctx, T, LABEL(T), res);
    ctx.emit('playSound', { clip: 'cdn/moodboard-lowpoly-cozy/sfx-shovel-dirt-scrape.mp3', position: p, volume: 0.45 }, { audience: { player: me.id } });
    return view(ctx, { pend: [], hist: T.hist, redo: T.redo });
  }
  // PATH PAINT (Campton 2026-10-10: "a pathways ability … paint on the ground with proper splatter and joinage"): one stroke = one path mark
  // that grows along the drag, plus splatter dabs flicked off its edges; the edge layer feathers it into whatever ground is there.
  if (T.tool === 'pathpaint') return pathStroke(ctx, me, T, v, p, input);
  if (T.tool === 'pondpaint') return pondStroke(ctx, me, T, v, p, input);
  // brush strokes: press starts, held lays dabs on a spacing/time budget, release closes the History row
  if (input.pressed?.use) v.stroke = { label: LABEL(T, shift), keys: [], beds: [], gone: [], marks: {}, last: null, at: 0, n: 0 };
  const st = v.stroke;
  if (st && (input.held?.use || input.pressed?.use)) {
    const moved = !st.last || Math.hypot(p.x - st.last.x, p.z - st.last.z) >= T.r * TE.dabEvery, waited = ctx.now() - st.at >= TE.dabMs;
    if ((st.n === 0 || (HELD.has(T.tool) && (moved || waited))) && st.n < TE.maxDabs) {
      const out = dab(ctx, T, p); st.last = p; st.at = ctx.now(); st.n++;
      if (out.skip) { if (st.n === 1) toast(ctx, out.skip); }
      else { const res = apply(ctx, T, out, st.label); if (res) { st.keys.push(...res.keys); st.beds.push(...res.beds); st.gone.push(...res.gone); const M = ctx.place.terrain.marks; for (const k of res.keys) st.marks[k] = M[k];
        if (st.n === 1) ctx.emit('playSound', { clip: TOOL[T.tool]?.[3] === 'paint' ? 'cdn/moodboard-lowpoly-cozy/sfx-brush-stroke-soft.mp3' : 'cdn/moodboard-lowpoly-cozy/sfx-shovel-dirt-scrape.mp3', position: p, volume: 0.35 }, { audience: { player: me.id } });
        ctx.emit('fx', { position: p, script: `fx\npop dust burst=8 life=.4..0.7 on=disc(${Math.min(T.r, 6)}) v=up(.4..0.9) size=.3..0.5 acc=buoy(.2)+drag(1.6) col=<.62,.55,.45> a=0>.3:.3>.7:.1>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)` }, { audience: { player: me.id } }); } }
    }
  }
  if (st && (input.released?.use || !input.held?.use) && !input.pressed?.use) {
    if (st.keys.length || st.beds.length || st.gone.length) { const e = { id: Math.floor(ctx.now()).toString(36), label: `${st.label}${st.n > 1 ? ` ×${st.n}` : ''}`, at: ctx.now(), keys: st.keys, beds: st.beds, gone: st.gone, marks: st.marks };
      view(ctx, { hist: [...(T.hist ?? []), e].slice(-40), redo: [] }); }
    v.stroke = null;
  }
}

function pathStroke(ctx, me, T, v, p, input) {
  const mat = T.mat === 'grass' ? 'beatenDirt' : T.mat, edge = mat === 'beatenDirt' ? 'beatenDirtEdge' : T.mat2 ?? (mat === 'beatenDirt' ? 'beatenDirtEdge' : mat === 'wowDirt' ? 'wowDirtRut' : mat), w = r2(Math.max(0.6, T.r * 2));
  // Campton 2026-10-10: "make the pathway painting paint the beaten dirt like you've finished currently with our paths - perfectly melding with the grass":
  // the brush lays the pond-trail recipe: falloff 1.1, noise 0.3, the drag smoothed and resampled every ~2 m on release, no loose flecks
  const mark = (pts) => ({ kind: 'path', grade: false, points: pts, width: w, material: mat, edgeMaterial: edge, noise: 0.3, falloff: 1.1 });
  const finish = (raw) => { if (raw.length < 3) return raw; let a = raw;
    for (let it = 0; it < 2; it++) { const b = [a[0]]; for (let i = 0; i < a.length - 1; i++) { const [x0, z0] = a[i], [x1, z1] = a[i + 1]; b.push([x0 * .75 + x1 * .25, z0 * .75 + z1 * .25], [x0 * .25 + x1 * .75, z0 * .25 + z1 * .75]); } b.push(a[a.length - 1]); a = b; }
    const out = [a[0]]; let acc = 0; for (let i = 1; i < a.length; i++) { acc += Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]); if (acc >= 2 || i === a.length - 1) { out.push(a[i]); acc = 0; } }
    return out.map(([x, z]) => [r2(x), r2(z)]); };
  if (input.pressed?.use) { v.stroke = { label: 'Path Paint', key: `te-pathpaint-${Math.floor(ctx.now()).toString(36)}-${v.n++}`, pts: [[p.x, p.z]], keys: [], marks: {}, last: p, n: 0 };
    ctx.emit('playSound', { clip: 'cdn/moodboard-lowpoly-cozy/sfx-brush-stroke-soft.mp3', position: p, volume: 0.35 }, { audience: { player: me.id } }); }
  const st = v.stroke; if (!st || st.label !== 'Path Paint') return;
  if (input.held?.use || input.pressed?.use) {
    const d = Math.hypot(p.x - st.last.x, p.z - st.last.z), first = st.n === 0;
    if ((first || d >= Math.max(0.5, T.r * 0.7)) && st.pts.length < 120) {
      if (!first) st.pts.push([p.x, p.z]);
      const pts = st.pts.length > 1 ? st.pts.slice() : [[r2(p.x - 0.05), r2(p.z)], [r2(p.x + 0.05), r2(p.z)]];
      const sp = {}; // splatter: 2 small flecks off the edges of this step, scattered both sides
      if (!first && T.splat && mat !== 'beatenDirt') { const dx = (p.x - st.last.x) / d, dz = (p.z - st.last.z) / d;
        for (let i = 0; i < 2; i++) { const side = ctx.random() < 0.5 ? -1 : 1, off = T.r * (0.75 + ctx.random() * 0.6), along = -ctx.random() * d, rr = T.r * (0.18 + ctx.random() * 0.3);
          const c = { x: p.x + dx * along - dz * off * side, z: p.z + dz * along + dx * off * side };
          sp[`te-pathspl-${Math.floor(ctx.now()).toString(36)}-${v.n++}`] = { kind: 'path', grade: false, points: [[r2(c.x - 0.03), r2(c.z)], [r2(c.x + 0.03), r2(c.z)]], width: r2(rr * 2), material: ctx.random() < 0.6 ? mat : edge, edgeMaterial: edge, noise: 0.7, falloff: r2(rr * 0.8) }; } }
      ctx.commit('terrain editor: Path Paint', () => { const M = ctx.place.terrain.marks; M[st.key] = mark(pts); for (const k in sp) M[k] = sp[k]; });
      const M = ctx.place.terrain.marks; if (!st.keys.includes(st.key)) st.keys.push(st.key); st.marks[st.key] = M[st.key]; for (const k in sp) { st.keys.push(k); st.marks[k] = M[k]; }
      st.last = p; st.n++;
      ctx.emit('fx', { position: p, script: `fx\npop dust burst=6 life=.4..0.7 on=disc(${Math.min(T.r, 4)}) v=up(.3..0.7) size=.25..0.45 acc=buoy(.2)+drag(1.6) col=<.62,.55,.45> a=0>.3:.3>.7:.1>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)` }, { audience: { player: me.id } });
    }
  }
  if ((input.released?.use || !input.held?.use) && !input.pressed?.use) {
    if (st.pts.length > 2) { const fin = mark(finish(st.pts)); ctx.commit('terrain editor: Path Paint (finish)', () => { ctx.place.terrain.marks[st.key] = fin; }); st.marks[st.key] = ctx.place.terrain.marks[st.key]; }
    if (st.keys.length) { const e = { id: Math.floor(ctx.now()).toString(36), label: `Path Paint ×${st.pts.length}`, at: ctx.now(), keys: st.keys, beds: [], gone: [], marks: st.marks };
      view(ctx, { hist: [...(T.hist ?? []), e].slice(-40), redo: [] }); }
    v.stroke = null;
  }
}

// POND PAINT: one stroke = one bowl (a flatten along the drag, brush-wide, smooth banks) + one lake that fills it, both rewritten as the drag grows.
// The ground height where the press began sets the bank; the bowl sits strength below it, the water 0.35 m under the bank.
function pondStroke(ctx, me, T, v, p, input) {
  if (input.pressed?.use) { const stamp = Math.floor(ctx.now()).toString(36);
    // one pond = one water level: a stroke that starts inside an existing lake extends it (same surface), never stacks a second level
    const M0 = ctx.place.terrain.marks ?? {}; const host = Object.values(M0).find((m) => m?.kind === 'lake' && m.at && typeof m.level === 'number' && Math.hypot(p.x - m.at.x, p.z - m.at.z) < (m.radius ?? 0));
    v.stroke = { label: 'Pond Paint', bowl: `te-pondbowl-${stamp}-${v.n++}`, lake: host ? null : `te-pond-${stamp}-${v.n++}`, base: host ? host.level + POND.waterBelow : (H(ctx, p.x, p.z) ?? p.y), pts: [[r2(p.x), r2(p.z)]], keys: [], marks: {}, last: p, n: 0 };
    ctx.emit('playSound', { clip: 'cdn/moodboard-lowpoly-cozy/sfx-shovel-dirt-scrape.mp3', position: p, volume: 0.4 }, { audience: { player: me.id } }); }
  const st = v.stroke; if (!st || st.label !== 'Pond Paint') return;
  if (input.held?.use || input.pressed?.use) {
    const d = Math.hypot(p.x - st.last.x, p.z - st.last.z), first = st.n === 0;
    if ((first || d >= Math.max(0.8, T.r * 0.5)) && st.pts.length < 120) {
      if (!first) st.pts.push([r2(p.x), r2(p.z)]);
      const pts = st.pts.length > 1 ? st.pts.slice() : [[r2(p.x - 0.05), r2(p.z)], [r2(p.x + 0.05), r2(p.z)]];
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length, cz = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      const reach = Math.max(...pts.map((q) => Math.hypot(q[0] - cx, q[1] - cz)));
      const fall = r2(clamp(T.f, POND.falloffMin, POND.falloffMax)), depth = Math.max(POND.minDepth, T.s);
      const bowl = { kind: 'flatten', center: { x: r2(cx), z: r2(cz) }, height: r2(st.base - depth), shape: { kind: 'path', points: pts, width: r2(Math.max(2, T.r * 2)) }, falloff: fall, falloffCurve: 'smooth', material: POND.bed, edgeMaterial: POND.bed };
      const lake = { kind: 'lake', at: { x: st.pts[0][0], z: st.pts[0][1] }, radius: r2(Math.hypot(st.pts[0][0] - cx, st.pts[0][1] - cz) + reach + T.r + fall), level: r2(st.base - POND.waterBelow), depth: 0, bedMaterial: POND.bed, liquid: POND.liquid };
      ctx.commit('terrain editor: Pond Paint', () => { const M = ctx.place.terrain.marks; M[st.bowl] = bowl; if (st.lake) M[st.lake] = lake; });
      for (const k of [st.bowl, st.lake].filter(Boolean)) { if (!st.keys.includes(k)) st.keys.push(k); st.marks[k] = ctx.place.terrain.marks[k]; }
      st.last = p; st.n++;
      ctx.emit('fx', { position: p, script: `fx\npop splash burst=8 life=.4..0.7 on=disc(${Math.min(T.r, 4)}) v=up(.6..1.4) size=.15..0.3 acc=grav()*.8+drag(1.2) col=<.6,.8,.85> a=.7>0 r=sprite(soft-disc,alpha)` }, { audience: { player: me.id } });
    }
  }
  if ((input.released?.use || !input.held?.use) && !input.pressed?.use) {
    if (st.keys.length) { const e = { id: Math.floor(ctx.now()).toString(36), label: `Pond Paint ×${st.pts.length}`, at: ctx.now(), keys: st.keys, beds: [], gone: [], marks: st.marks };
      view(ctx, { hist: [...(T.hist ?? []), e].slice(-40), redo: [] }); }
    v.stroke = null;
  }
}
