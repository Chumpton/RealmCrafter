// Logic & spawning tools, the editor's body (door: scripts/ed-logic.js). player.state.edl = { arm, wp, focus, list }.
// Ops: sendAction('edl', { op }) — arm {k}, cancel, sel {id}, set {id,key,v}, comp {id,mob,dv}, cam {id}, camClear {id},
// wp {id} (toggle click-to-add waypoints), wpUndo {id}, wpClear {id}, assign {id}, unassign {id}, primary {id}, del {id}.
import { raycast, getInputRay } from 'builtin/physics';
import { VOLS, NODES, MOBS, CLIPS, HAZ, EDL } from './lib/data/ed-logic.js';
const r1 = (v) => Math.round(v * 100) / 100;
function aimGround(ctx, input) {
  const r = getInputRay(ctx, input); if (!r || r.source !== 'pointer') return null;
  return raycast(ctx, r.origin, r.direction, { distance: 220, bodies: 'static', ignoreEntities: [ctx.self.id], excludeTags: ['bld-ghost', 'ed-vol', 'ed-node'] });
}
const ed = (me) => ({ ...(me.state.edl ?? {}) });
function select(me, id) { me.state.bld = { ...(me.state.bld ?? {}), sel: id, carry: null }; me.state.edl = { ...ed(me), focus: id }; }
function lineOf(o, pts) { const f = o.feetPosition; return pts.length > 1 ? { kind: 'pipe', points: [...pts, pts[0]].map((p) => [r1(p[0] - f.x), r1(p[1] - f.y + 0.3), r1(p[2] - f.z)]), width: 0.12 } : null; }
function placeVol(ctx, k, p) {
  const V = VOLS[k], [w, h, d] = V.size;
  const base = { k, w, h, d, ...(k === 'audio' ? { clip: CLIPS[0], vol: 0.4 } : k === 'event' ? { text: 'You found something…' } : k === 'hazard' ? { dps: 2, hz: 'lava' } : {}) };
  return ctx.spawn({ template: 'templates/ed-logic.js#vol', feetPosition: { x: r1(p.x), y: r1(p.y), z: r1(p.z) },
    primitive: { kind: 'box', width: w, height: h, depth: d }, material: { color: V.col, opacity: 0.16, transparent: true, depthWrite: false, emissive: V.col, emissiveIntensity: 0.25 },
    children: [{ id: 'edge', visibleTo: 'editors', castShadow: false, primitive: { kind: 'box', width: w, height: h, depth: d }, material: { color: V.col, wireframe: true, emissive: V.col, emissiveIntensity: 0.8 } }],
    state: base });
}
function placeNode(ctx, k, p) {
  const N = NODES[k], f = { x: r1(p.x), y: r1(p.y), z: r1(p.z) };
  const st = { k, ...(k === 'camp' ? { tether: 12, respawn: 30, comp: { goblin: 3 } } : k === 'patrol' ? { pts: [[f.x, f.y, f.z]], i: 0 } : {}) };
  return ctx.spawn({ template: 'templates/ed-logic.js#node', feetPosition: f, behavior: k === 'camp' ? 'scripts/ed-camp.js' : k === 'patrol' ? 'scripts/ed-patrol.js' : undefined,
    primitive: { kind: 'cone', radius: 0.35, height: 1.1 }, material: { color: N.col, emissive: N.col, emissiveIntensity: 0.7 },
    children: [{ id: 'ring', visibleTo: 'editors', castShadow: false, feetPosition: { x: 0, y: 0.05, z: 0 }, rotation: { pitch: -90 }, primitive: { kind: 'ring', innerRadius: k === 'camp' ? 11.7 : 0.55, outerRadius: k === 'camp' ? 12 : 0.75 }, material: { color: N.col, emissive: N.col, emissiveIntensity: 0.8, side: 'double' } }],
    state: st });
}
function setKey(ctx, o, key, v) {
  const s = o.state, k = s.k;
  if (['w', 'h', 'd'].includes(key) && VOLS[k]) {
    s[key] = Math.max(0.5, Math.min(EDL.sizeMax, +v || 1));
    const prim = { kind: 'box', width: s.w, height: s.h, depth: s.d }; o.primitive = prim;
    const e = ctx.getObject(`${o.id}/edge`); if (e) e.primitive = prim; return;
  }
  if (key === 'clip' && CLIPS.includes(v)) s.clip = v;
  else if (key === 'vol') s.vol = Math.max(0, Math.min(1, +v || 0));
  else if (key === 'text') s.text = String(v ?? '').slice(0, 160);
  else if (key === 'dps') s.dps = Math.max(1, Math.min(20, Math.round(+v || 1)));
  else if (key === 'hz' && HAZ[v]) s.hz = v;
  else if (key === 'respawn') s.respawn = Math.max(5, Math.min(EDL.respawnMax, Math.round(+v || 30)));
  else if (key === 'tether') { s.tether = Math.max(3, Math.min(EDL.tetherMax, +v || 12)); const g = ctx.getObject(`${o.id}/ring`); if (g) g.primitive = { kind: 'ring', innerRadius: s.tether - 0.3, outerRadius: s.tether }; }
  else if (key === 'name') s.name = String(v ?? '').slice(0, 40);
}
export function listTick(ctx) {
  const me = ctx.self, f = me.worldFeetPosition ?? me.feetPosition; if (!f) return;
  const rows = [...ctx.query({ tags: ['ed-vol'], radius: EDL.listRadius, center: f }), ...ctx.query({ tags: ['ed-node'], radius: EDL.listRadius, center: f })]
    .map((r) => ({ id: r.id, dist: Math.round(Math.hypot(r.feetPosition.x - f.x, r.feetPosition.z - f.z)), s: r.state ?? {} }))
    .sort((a, b) => a.dist - b.dist).slice(0, EDL.listMax)
    .map(({ id, dist, s }) => ({ id, dist, s: { ...s, mobs: undefined, pts: s.pts ? s.pts.length : undefined, inside: undefined } }));
  const was = me.state.edl?.list;
  if (JSON.stringify(was) !== JSON.stringify(rows)) me.state.edl = { ...ed(me), list: rows };
}
export function onInput(ctx, input) {
  const me = ctx.self, E = ed(me);
  if ((E.arm || E.wp) && input.pressed?.menuOpen) { me.state.edl = { ...E, arm: null, wp: null }; return; }
  if (E.arm && input.pressed?.use) {
    const h = aimGround(ctx, input); if (!h) return;
    const isV = !!VOLS[E.arm], label = (isV ? VOLS : NODES)[E.arm].label;
    let id = null; ctx.commit(`Place ${label}`, () => { id = isV ? placeVol(ctx, E.arm, h.position) : placeNode(ctx, E.arm, h.position); });
    me.state.edl = { ...ed(me), arm: null, wp: E.arm === 'patrol' ? id : null };
    if (id) select(me, id); listTick(ctx); return;
  }
  if (E.wp && input.pressed?.use) {
    const o = ctx.getObject(E.wp), h = aimGround(ctx, input); if (!o || !h) return;
    const p = h.position, pts = [...(o.state.pts ?? []), [r1(p.x), r1(p.y), r1(p.z)]];
    ctx.commit('Add patrol waypoint', () => { o.state.pts = pts; setLine(ctx, o, pts); });
    listTick(ctx); return;
  }
  if (!input.pressed?.edl) return;
  const a = input.actionData?.edl ?? {}, o = a.id ? ctx.getObject(a.id) : null;
  switch (a.op) {
    case 'arm': me.state.edl = { ...E, arm: E.arm === a.k ? null : (VOLS[a.k] || NODES[a.k] ? a.k : null), wp: null }; return;
    case 'cancel': me.state.edl = { ...E, arm: null, wp: null }; return;
    case 'sel': if (o) select(me, a.id); return;
    case 'focus': me.state.edl = { ...E, focus: E.focus === a.id ? null : a.id }; return;
  }
  if (!o) return;
  const lbl = (VOLS[o.state.k] ?? NODES[o.state.k])?.label ?? 'logic piece';
  switch (a.op) {
    case 'set': ctx.commit(`Edit ${lbl}`, () => setKey(ctx, o, a.key, a.v)); break;
    case 'comp': ctx.commit(`Edit ${lbl} mobs`, () => { const c = { ...(o.state.comp ?? {}) }; if (MOBS[a.mob]) c[a.mob] = Math.max(0, Math.min(8, (c[a.mob] | 0) + (a.dv | 0))); if (!c[a.mob]) delete c[a.mob]; o.state.comp = c; }); break;
    case 'cam': { const f = me.worldFeetPosition ?? me.feetPosition; ctx.commit(`Frame ${lbl} camera`, () => { o.state.cam = { x: r1(f.x), y: r1(f.y + 2.2), z: r1(f.z) }; }); break; }
    case 'camClear': ctx.commit(`Clear ${lbl} camera`, () => { delete o.state.cam; }); break;
    case 'wp': me.state.edl = { ...E, wp: E.wp === a.id ? null : a.id, arm: null }; break;
    case 'wpUndo': ctx.commit('Remove patrol waypoint', () => { const pts = (o.state.pts ?? []).slice(0, -1); o.state.pts = pts; setLine(ctx, o, pts); }); break;
    case 'wpClear': ctx.commit('Clear patrol path', () => { const f = o.feetPosition, pts = [[r1(f.x), r1(f.y), r1(f.z)]]; o.state.pts = pts; o.state.i = 0; setLine(ctx, o, pts); }); break;
    case 'assign': { const n = me.state.bld?.sel; const g = n && ctx.getObject(n);
      if (!g || g.tags?.includes?.('ed-vol') || g.tags?.includes?.('ed-node') || g.tags?.includes?.('player')) { ctx.emit('skillMsg', { text: 'Select an NPC with the mouse first, then press Assign.' }, { to: me.id }); break; }
      ctx.commit('Assign patrol NPC', () => { o.state.npc = n; o.state.i = 0; }); break; }
    case 'unassign': ctx.commit('Unassign patrol NPC', () => { delete o.state.npc; }); break;
    case 'primary': ctx.commit('Set primary spawn', () => {
      for (const r of ctx.query({ tags: ['ed-node'], radius: 5000, center: o.feetPosition })) if (r.state?.primary && r.id !== o.id) { const g = ctx.getObject(r.id); if (g) g.state.primary = false; }
      o.state.primary = true; const f = o.feetPosition; ctx.place.defaultSpawnPoint = { x: r1(f.x), z: r1(f.z), y: { terrain: 0 } }; }); break;
    case 'del': ctx.commit(`Delete ${lbl}`, () => { for (const m of o.state.mobs ?? []) if (ctx.getObject(m.id)) ctx.destroy(m.id); ctx.destroy(o.id); });
      if (me.state.bld?.sel === a.id) me.state.bld = { ...me.state.bld, sel: null }; break;
  }
  listTick(ctx);
}
function setLine(ctx, o, pts) {
  const sp = lineOf(o, pts), id = `${o.id}/line`, g = ctx.getObject(id);
  if (g) { if (sp) g.spline = sp; else ctx.destroy(id); }
  else if (sp) ctx.spawn({ parent: o.id, id: 'line', visibleTo: 'editors', castShadow: false, spline: sp, material: { color: NODES.patrol.col, emissive: NODES.patrol.col, emissiveIntensity: 0.8 } });
}
