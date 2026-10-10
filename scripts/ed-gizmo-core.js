// EDITOR TRANSFORM GIZMO (creator spec, QoL pillar). On the selected piece (player.state.bld.sel) while the editor shelf
// is open: arrows = move along an axis, rings = rotate about it, cubes = scale on it (white centre cube = uniform).
// Left-drag a handle (builtin/physics getInputRay; picking is ray maths on the handle shapes). The drag shows live and
// lands as ONE commit + one History row on release. Snaps: te.snap (m) for move, te.rsnap (deg) for rotate, 0.05 scale.
// KEY RULE: W move · E rotate · R scale · Space world/local are gizmo keys only while te.open AND a piece is selected AND
// the cursor is free (the editor camera never locks the pointer; holding RMB to look counts as not free) AND Ctrl is up.
// The editor camera still flies on W/Space as before (a tap barely nudges it); E/R do nothing else in the editor.
// Everything drawn is audience: 'local' on the editor's own machine.
import { getInputRay } from 'builtin/physics';
import { push, tf, nameOf } from './ed-history-core.js';
const D2R = Math.PI / 180;
const COL = { x: 'oklch(0.66 0.22 28)', y: 'oklch(0.78 0.2 140)', z: 'oklch(0.66 0.18 255)', u: 'oklch(0.95 0.01 90)', hot: 'oklch(0.88 0.16 88)' };
const G = (ctx) => (ctx.session.gz ??= { mode: 'move', space: 'world', eye: null, key: '', drag: null, wHeld: false });
// ---- small vector helpers ----
const v = (x, y, z) => ({ x, y, z }), add = (a, b) => v(a.x + b.x, a.y + b.y, a.z + b.z), sub = (a, b) => v(a.x - b.x, a.y - b.y, a.z - b.z), mul = (a, s) => v(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z, cross = (a, b) => v(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x), len = (a) => Math.sqrt(dot(a, a)), nrm = (a) => mul(a, 1 / (len(a) || 1));
// quaternions (x,y,z,w); Euler yaw(Y) pitch(X) roll(Z), order YXZ, degrees
const qmul = (a, b) => ({ x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w, w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z });
const qax = (ax, deg) => { const h = deg * D2R / 2, s = Math.sin(h); return { x: ax.x * s, y: ax.y * s, z: ax.z * s, w: Math.cos(h) }; };
function toQ(r) {
  if (r == null) return { x: 0, y: 0, z: 0, w: 1 }; if (typeof r === 'number') return qax(v(0, 1, 0), r); if (r.w !== undefined) return { x: r.x, y: r.y, z: r.z, w: r.w };
  return qmul(qmul(qax(v(0, 1, 0), r.yaw ?? 0), qax(v(1, 0, 0), r.pitch ?? 0)), qax(v(0, 0, 1), r.roll ?? 0));
}
const qrot = (q, p) => { const u = v(q.x, q.y, q.z), t = mul(cross(u, p), 2); return add(add(p, mul(t, q.w)), cross(u, t)); };
const yawOf = (r) => { if (r == null) return 0; if (typeof r === 'number') return r; if (r.w === undefined) return r.yaw ?? 0; const f = qrot(r, v(0, 0, -1)); return Math.atan2(-f.x, -f.z) / D2R; };
// closest param t on line (o + d t) to the ray, and the gap between them
function lineRay(o, d, ro, rd) { const w = sub(o, ro), a = dot(d, d), b = dot(d, rd), c = dot(rd, rd), dd = dot(d, w), e = dot(rd, w), den = a * c - b * b; if (Math.abs(den) < 1e-9) return null;
  const t = (b * e - c * dd) / den, s = (a * e - b * dd) / den; if (s < 0) return null; return { t, gap: len(sub(add(o, mul(d, t)), add(ro, mul(rd, s)))) }; }
function planeHit(o, n, ro, rd) { const den = dot(n, rd); if (Math.abs(den) < 1e-6) return null; const s = dot(sub(o, ro), n) / den; return s > 0 ? add(ro, mul(rd, s)) : null; }

function axes(g, o) { // world axes, or the piece's own (its rotation applied)
  if (g.space === 'world' && g.mode !== 'scale') return { x: v(1, 0, 0), y: v(0, 1, 0), z: v(0, 0, 1) };
  const q = toQ(o.rotation); return { x: nrm(qrot(q, v(1, 0, 0))), y: nrm(qrot(q, v(0, 1, 0))), z: nrm(qrot(q, v(0, 0, 1))) };
}
const sizeAt = (g, c) => g.eye ? Math.max(0.5, Math.min(14, len(sub(g.eye, c)) * 0.13)) : 2;
function pick(g, o, ray) {
  const c = o.feetPosition, L = sizeAt(g, c), A = axes(g, o); let best = null;
  const take = (h, gap) => { if (!best || gap < best.gap) best = { ...h, gap }; };
  if (g.mode === 'rotate') { for (const k of ['x', 'y', 'z']) { const p = planeHit(c, A[k], ray.origin, ray.direction); if (!p) continue; const gap = Math.abs(len(sub(p, c)) - L); if (gap < L * 0.09) take({ k }, gap); } return best; }
  if (g.mode === 'scale') { const p = lineRay(c, v(0, 0, 0), ray.origin, ray.direction); void p; const w = sub(c, ray.origin), s = dot(w, ray.direction), gap0 = len(sub(add(ray.origin, mul(ray.direction, s)), c)); if (gap0 < L * 0.14) take({ k: 'u' }, gap0 * 0.5); }
  for (const k of ['x', 'y', 'z']) { const r = lineRay(c, A[k], ray.origin, ray.direction); if (r && r.t > L * 0.12 && r.t < L * 1.12 && r.gap < L * 0.09) take({ k }, r.gap); }
  return best;
}
function snapStep(x, s) { return s > 0 ? Math.round(x / s) * s : x; }
const r3 = (x) => Math.round(x * 1000) / 1000;

function apply(ctx, g, o, ray) { // live drag: writes the piece's transform from its press-frozen start
  const d = g.drag, te = ctx.self.state.te ?? {}, A = d.A[d.k];
  if (d.mode === 'move') { const r = lineRay(d.c, A, ray.origin, ray.direction); if (!r) return; const dt = snapStep(r.t - d.t0, +te.snap || 0);
    const p = add(d.c, mul(A, dt)); o.feetPosition = v(r3(p.x), r3(p.y), r3(p.z)); ctx.authoringReadout = dt; d.last = `${dt >= 0 ? '+' : ''}${dt.toFixed(2)} m`; return; }
  if (d.mode === 'rotate') { const p = planeHit(d.c, A, ray.origin, ray.direction); if (!p) return; const w = sub(p, d.c), ang = Math.atan2(dot(w, d.v), dot(w, d.u)) / D2R;
    let da = ang - d.a0; da = ((da + 540) % 360) - 180; da = snapStep(da, +te.rsnap || 0); d.last = `${Math.round(da)}°`;
    const r0 = d.r0; if (d.k === 'y' && (r0 == null || typeof r0 === 'number' || (r0.w === undefined && !r0.pitch && !r0.roll))) { o.rotation = { yaw: Math.round((yawOf(r0) + da) * 100) / 100 }; return; }
    const q = qmul(qax(A, da), toQ(r0)); o.rotation = { x: q.x, y: q.y, z: q.z, w: q.w }; return; }
  // scale
  const s0 = d.s0, S0 = typeof s0 === 'number' ? v(s0, s0, s0) : v(s0?.x ?? 1, s0?.y ?? 1, s0?.z ?? 1);
  let f;
  if (d.k === 'u') { const p = planeHit(d.c, d.n, ray.origin, ray.direction); if (!p) return; f = len(sub(p, d.c)) / (d.r0d || 1); }
  else { const r = lineRay(d.c, A, ray.origin, ray.direction); if (!r) return; f = r.t / (d.t0 || 1); }
  f = Math.max(0.05, f); d.last = `×${f.toFixed(2)}`;
  const sn = (x) => Math.max(0.02, Math.round(x * 20) / 20);
  if (d.k === 'u') o.scale = typeof s0 === 'number' || s0 == null ? sn((s0 ?? 1) * f) : v(sn(S0.x * f), sn(S0.y * f), sn(S0.z * f));
  else { const S = { ...S0 }; S[d.k] = sn(S0[d.k] * f); o.scale = S; }
}

function build(ctx, g, o, hot) { // the gizmo's look: one local root at the piece's feet, children in unit size, root scaled
  if (ctx.session.gzRoot) { try { ctx.destroy(ctx.session.gzRoot); } catch {} ctx.session.gzRoot = null; }
  const M = (k) => ({ color: hot === k ? COL.hot : COL[k], unlit: true, depthTest: false, depthWrite: false, transparent: true, opacity: hot && hot !== k ? 0.35 : 0.95 });
  const R = { x: { roll: -90 }, y: {}, z: { pitch: 90 } }, kids = [];
  for (const k of ['x', 'y', 'z']) {
    if (g.mode === 'rotate') { kids.push({ primitive: { kind: 'torus', radius: 1, tube: 0.022, radialSegments: 6, tubularSegments: 64 }, material: M(k), rotation: k === 'x' ? { yaw: 90 } : k === 'y' ? { pitch: 90 } : {}, castShadow: false, receiveShadow: false }); continue; }
    const tip = g.mode === 'move' ? { primitive: { kind: 'cone', radius: 0.075, height: 0.22, radialSegments: 12 }, material: M(k), feetPosition: { x: 0, y: 0.84, z: 0 }, castShadow: false }
      : { primitive: { kind: 'box', width: 0.13, height: 0.13, depth: 0.13 }, material: M(k), feetPosition: { x: 0, y: 0.82, z: 0 }, castShadow: false };
    kids.push({ primitive: { kind: 'cylinder', radiusTop: 0.018, radiusBottom: 0.018, height: 0.86, radialSegments: 6 }, material: M(k), feetPosition: { x: 0, y: 0.12, z: 0 }, rotation: R[k], castShadow: false, receiveShadow: false, children: [tip] });
  }
  if (g.mode === 'scale') kids.push({ primitive: { kind: 'box', width: 0.17, height: 0.17, depth: 0.17 }, material: M('u'), feetPosition: { x: 0, y: -0.085, z: 0 }, castShadow: false });
  if (g.mode !== 'rotate') kids.push({ primitive: { kind: 'sphere', radius: 0.05, widthSegments: 10, heightSegments: 8 }, material: M('u'), feetPosition: { x: 0, y: -0.05, z: 0 }, castShadow: false });
  ctx.session.gzRoot = ctx.spawn({ tags: ['ed-gizmo', 'temp-local'], audience: 'local', visibleTo: 'editors', feetPosition: { ...o.feetPosition }, children: kids, castShadow: false, interpolation: null });
  g.key = `${g.mode}|${g.space}|${hot ?? ''}|${o.id}`; g.L = 0; g.rk = '';
}
function kill(ctx, g) { if (ctx.session.gzRoot) { try { ctx.destroy(ctx.session.gzRoot); } catch {} } ctx.session.gzRoot = null; g.key = ''; g.drag = null; ctx.session.gzGrab = null; }

function sel(ctx) { const me = ctx.self, id = me.state.te?.open ? me.state.bld?.sel : null; const o = id && ctx.getObject(id); return o && !o.scatter && o.feetPosition ? o : null; }

export function onInput(ctx, input) {
  const me = ctx.self, g = G(ctx), P = input.pressed ?? {}, H = input.held ?? {}, o = sel(ctx);
  const ray = getInputRay(ctx, input); if (ray?.origin) g.eye = ray.origin;
  const free = !(H.camHoldR || H.tpDrag) && !me.state.bld?.carry;
  if (o && free && !H.leCtrl) { // the mode keys (rule in the header)
    const w = (input.axes?.moveZ ?? 0) > 0.5;
    let m = null; if (w && !g.wHeld) m = 'move'; if (P.interact) m = 'rotate'; if (P.runToggle) m = 'scale';
    g.wHeld = w;
    if (m && m !== g.mode && !g.drag) { g.mode = m; g.key = ''; }
    if (P.jump && !g.drag) { g.space = g.space === 'world' ? 'local' : 'world'; g.key = ''; me.state.te = { ...me.state.te, note: `gizmo axes: ${g.space}`, noteAt: ctx.now() }; }
  }
  if (!o || !ray) { if (g.drag && !H.use) { g.drag = null; ctx.session.gzGrab = null; } return; }
  if (P.use && free && !g.drag) {
    const h = pick(g, o, ray); if (!h) return;
    const A = axes(g, o), c = { ...o.feetPosition }, d = { k: h.k, mode: g.mode, A, c, start: tf(o), r0: o.rotation == null ? null : JSON.parse(JSON.stringify(o.rotation)), s0: o.scale == null ? 1 : JSON.parse(JSON.stringify(o.scale)), id: o.id };
    if (g.mode === 'move' || (g.mode === 'scale' && h.k !== 'u')) { const r = lineRay(c, A[h.k], ray.origin, ray.direction); d.t0 = r ? r.t : 1; }
    if (g.mode === 'rotate') { const ax = A[h.k], ref = Math.abs(ax.y) > 0.9 ? v(1, 0, 0) : v(0, 1, 0); d.u = nrm(cross(ref, ax)); d.v = cross(ax, d.u); const p = planeHit(c, ax, ray.origin, ray.direction) ?? add(c, d.u); const w = sub(p, c); d.a0 = Math.atan2(dot(w, d.v), dot(w, d.u)) / D2R; }
    if (g.mode === 'scale' && h.k === 'u') { d.n = nrm(sub(ray.origin, c)); const p = planeHit(c, d.n, ray.origin, ray.direction); d.r0d = p ? len(sub(p, c)) : 1; }
    g.drag = d; ctx.session.gzGrab = ctx.now(); build(ctx, g, o, h.k); return;
  }
  if (g.drag) {
    ctx.session.gzGrab = ctx.now();
    if (H.use && !input.released?.use) { apply(ctx, g, o, ray); return; }
    // release: one commit + one History row
    apply(ctx, g, o, ray); const d = g.drag, after = tf(o); g.drag = null;
    if (JSON.stringify(after) !== JSON.stringify(d.start)) {
      const verb = d.mode === 'move' ? 'Moved' : d.mode === 'rotate' ? 'Rotated' : 'Resized', label = `${verb} ${nameOf(o)}`;
      const fin = { feetPosition: o.feetPosition, rotation: o.rotation, scale: o.scale };
      o.feetPosition = { ...d.start.p }; if (d.start.r != null) o.rotation = d.start.r; o.scale = d.start.s; // back to the saved pose, so the commit carries the whole change
      ctx.commit(label, () => { o.feetPosition = fin.feetPosition; if (fin.rotation != null) o.rotation = fin.rotation; o.scale = fin.scale; });
      push(ctx, { label, n: 1, rows: [{ id: o.id, b: d.start, a: tf(o), sb: null, sa: null }] });
      me.state.te = { ...me.state.te, note: `${label} · ${d.last ?? ''}`, noteAt: ctx.now() };
    }
    g.key = '';
  }
}

export function update(ctx) {
  const g = G(ctx), o = sel(ctx);
  if (!o || ctx.self.state.bld?.carry) { if (ctx.session.gzRoot) kill(ctx, g); return; }
  if (!g.drag && ctx.session.gzGrab && ctx.now() - ctx.session.gzGrab > 300) ctx.session.gzGrab = null;
  const want = `${g.mode}|${g.space}|${g.drag?.k ?? ''}|${o.id}`;
  if (!ctx.session.gzRoot || g.key !== want || !ctx.getObject(ctx.session.gzRoot)) build(ctx, g, o, g.drag?.k);
  const r = ctx.getObject(ctx.session.gzRoot); if (!r) return;
  const c = o.feetPosition, L = Math.round(sizeAt(g, c) * 20) / 20;
  const fk = `${c.x.toFixed(3)},${c.y.toFixed(3)},${c.z.toFixed(3)}`; if (g.fk !== fk) { r.feetPosition = { x: c.x, y: c.y, z: c.z }; g.fk = fk; }
  if (g.L !== L) { r.scale = L; g.L = L; }
  const A = (g.space === 'local' || g.mode === 'scale') ? toQ(g.drag ? g.drag.r0 : o.rotation) : null, rk = A ? `${A.x.toFixed(3)},${A.y.toFixed(3)},${A.z.toFixed(3)},${A.w.toFixed(3)}` : 'w';
  if (g.rk !== rk) { r.rotation = A ? { x: A.x, y: A.y, z: A.z, w: A.w } : { yaw: 0 }; g.rk = rk; }
}
