// UNIFIED EDITOR HISTORY (creator spec, QoL pillar). player.state.edHist = newest-last list of build / multi-select / gizmo
// edits: { id, at, label, n, rows: [{ id, b, a, sb, sa }], no } — b/a = the row's transform before/after (null = did not
// exist), sb/sa = its compact spec when it was created or removed (≤ ~2 KB each). no = too big: counted, not undoable here.
// player.state.edRedo = what Ctrl+Y brings back. Terrain strokes keep their own te.hist (terrain-editor-core.js); the panel
// merges both by time and Ctrl+Z walks whichever is newest. Also owns F9 instant playtest (player.state.edPlay).
import { PREFAB } from './lib/data/prefabs.js';
import { raycast } from 'builtin/physics';
const CAP = 60, MAXN = 40, MAXSPEC = 2048, MAXENTRY = 12000;
const BLD = { pos: 'Moved', mv: 'Moved', here: 'Moved', rot: 'Rotated', yaw: 'Turned', rndYaw: 'Spun', align: 'Leaned', upright: 'Stood up', scale: 'Resized', scaleBy: 'Resized', up: 'Lifted', drop: 'Dropped', dup: 'Duplicated', del: 'Deleted', swap: 'Swapped', replaceAll: 'Replaced all like', restore: 'Restored' };
const MS = { move: 'Moved', rot: 'Rotated', scale: 'Resized', drop: 'Dropped', dup: 'Duplicated', array: 'Arrayed', del: 'Deleted', paste: 'Pasted', group: 'Stamped group', cut: 'Cut', swap: 'Swapped', hide: 'Hid', unhide: 'Showed', restore: 'Restored' };
const SPEC_KEYS = ['tags', 'model', 'primitive', 'material', 'physics', 'light', 'audio', 'fx', 'visibleRange', 'castShadow', 'receiveShadow', 'behavior', 'audience', 'visibleTo'];
const J = (v) => { try { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); } catch { return undefined; } };

export function nameOf(o) { return PREFAB[o?.state?.pf]?.label ?? o?.state?.label ?? (o?.id ? String(o.id).replace(/^pf-/, '').replace(/-[a-z0-9]{6,}$/, '').replace(/[-_]/g, ' ') : 'piece'); }
export function tf(o) { if (!o) return null; const f = o.feetPosition ?? {}; return { p: { x: f.x, y: f.y, z: f.z }, r: J(o.rotation) ?? null, s: J(o.scale) ?? 1, v: o.visible !== false }; }
function spec(o) {
  const s = { id: o.id }; for (const k of SPEC_KEYS) { const v = J(o[k]); if (v !== undefined && v !== null) s[k] = v; }
  const st = J(o.state) ?? {}; delete st.__onSpawnRan; s.state = st; const par = o.parent?.id; if (par) s.parent = par;
  let txt = JSON.stringify(s);
  if (txt.length > MAXSPEC && st.pf && PREFAB[st.pf]) { txt = JSON.stringify({ id: o.id, pf: st.pf, state: st }); } // the palette rebuilds it
  return txt.length > MAXSPEC ? null : JSON.parse(txt);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---- recording -------------------------------------------------------------------------------------------------
function begin(ctx, kind, a) {
  const me = ctx.self, op = a.op; const verb = (kind === 'b' ? BLD : MS)[op]; if (!verb) return;
  const ids = kind === 'b' ? (me.state.bld?.sel ? [me.state.bld.sel] : []) : [...(me.state.ms?.ids ?? [])];
  if (kind === 'b' && !ids.length && op !== 'restore') return;
  const before = {}; let big = ids.length > MAXN || op === 'replaceAll';
  if (!big) for (const id of ids) { const o = ctx.getObject(id); if (o) before[id] = { t: tf(o), s: spec(o) }; }
  ctx.session.edhPend = { at: ctx.now(), kind, op, verb, ids, before, big, selB: me.state.bld?.sel ?? null, idsB: [...(me.state.ms?.ids ?? [])], lastB: (me.state.bld?.last ?? []).length };
}
function finish(ctx) {
  const me = ctx.self, P = ctx.session.edhPend; ctx.session.edhPend = null;
  const rows = []; let lab = null, tooBig = P.big;
  for (const id of P.ids) { const B = P.before[id], o = ctx.getObject(id); if (!B && !P.big) continue;
    const a = tf(o); if (!lab && (o || B)) lab = nameOf(o ?? ctx.getObject(id) ?? { id, state: B?.s?.state });
    if (B && same(B.t, a) && o && same(B.s, spec(o))) continue;
    rows.push({ id, b: B?.t ?? null, a, sb: !o || P.verb === 'Swapped' ? B?.s ?? null : null, sa: null });
    if (!o && !B?.s) tooBig = true; }
  // what the op made: a new selection (dup, swap) or new ids in the multi list (dup, array, paste)
  const made = new Set(); const sel = me.state.bld?.sel; if (sel && sel !== P.selB && !P.before[sel]) made.add(sel);
  for (const id of me.state.ms?.ids ?? []) if (!P.idsB.includes(id) && !P.before[id]) made.add(id);
  for (const id of (me.state.bld?.last ?? []).slice(P.lastB)) if (!P.before[id]) made.add(id);
  for (const id of made) { const o = ctx.getObject(id); if (!o) continue; if (!lab) lab = nameOf(o); const s = spec(o); if (!s) tooBig = true; rows.push({ id, b: null, a: tf(o), sb: null, sa: s }); }
  if (!rows.length && !P.big) return;
  const n = P.big ? (P.ids.length || made.size || 0) : rows.length;
  const label = `${P.verb} ${n > 1 ? n + ' pieces' : lab ?? 'piece'}`;
  push(ctx, { label, n, rows: tooBig ? [] : rows, no: tooBig || undefined });
}
export function push(ctx, e) {
  const me = ctx.self; let E = { id: Math.floor(ctx.now()).toString(36) + Math.floor(ctx.random() * 1296).toString(36), at: ctx.now(), ...e };
  if (JSON.stringify(E).length > MAXENTRY) E = { ...E, rows: [], no: true };
  me.state.edHist = [...(me.state.edHist ?? []), E].slice(-CAP); me.state.edRedo = []; me.state.edLast = 'b';
  return E;
}

// ---- undo / redo -----------------------------------------------------------------------------------------------
function put(o, t) { if (!t) return; o.feetPosition = { ...t.p }; if (t.r != null) o.rotation = t.r; o.scale = t.s ?? 1; if ((o.visible !== false) !== t.v) o.visible = t.v; }
function rebuild(ctx, s, t) {
  if (!s) return; const { id, pf, parent, ...rest } = s;
  const base = pf && PREFAB[pf] ? { ...PREFAB[pf].spec, state: { ...(PREFAB[pf].spec?.state ?? {}), ...(s.state ?? {}) } } : rest;
  ctx.spawn(id, { ...base, ...(parent ? { parent } : {}), ...(t ? { feetPosition: t.p, ...(t.r != null ? { rotation: t.r } : {}), scale: t.s ?? 1 } : {}) });
}
function swing(ctx, e, back) { // back = undo (to b), else redo (to a)
  ctx.commit(`${back ? 'undo' : 'redo'}: ${e.label}`, () => {
    for (const r of back ? [...e.rows].reverse() : e.rows) {
      const to = back ? r.b : r.a, sp = back ? r.sb : r.sa, o = ctx.getObject(r.id);
      if (!to) { if (o) ctx.destroy(r.id); continue; }
      if (!o) { rebuild(ctx, sp, to); continue; }
      put(o, to);
    }
  });
}
function say(ctx, msg) { const me = ctx.self; me.state.te = { ...(me.state.te ?? {}), note: msg, noteAt: ctx.now() }; }
function undoMine(ctx) {
  const me = ctx.self, H = [...(me.state.edHist ?? [])], e = H.pop(); if (!e) return false;
  if (e.no) { me.state.edHist = H; say(ctx, `“${e.label}” is too big to undo here (${e.n ?? '?'} pieces) · use Restore / History in the build tools`); return true; }
  swing(ctx, e, true); me.state.edHist = H; me.state.edRedo = [...(me.state.edRedo ?? []), e].slice(-CAP); me.state.edLast = 'b'; say(ctx, `undid ${e.label}`); return true;
}
function redoMine(ctx) {
  const me = ctx.self, R = [...(me.state.edRedo ?? [])], e = R.pop(); if (!e) return false;
  swing(ctx, e, false); me.state.edRedo = R; me.state.edHist = [...(me.state.edHist ?? []), e].slice(-CAP); say(ctx, `redid ${e.label}`); return true;
}
const newestT = (me) => { const h = me.state.te?.hist ?? []; return h.length ? h[h.length - 1].at ?? 0 : -1; };
const newestB = (me) => { const h = me.state.edHist ?? []; return h.length ? h[h.length - 1].at ?? 0 : -1; };
function op(ctx, a) {
  const me = ctx.self;
  if (a.op === 'undo') return undoMine(ctx);
  if (a.op === 'redo') return redoMine(ctx);
  if (a.op === 'jump') { const H = me.state.edHist ?? [], i = H.findIndex((e) => e.id === a.v); if (i < 0) return;
    for (let k = H.length - 1; k >= i; k--) { if (!undoMine(ctx)) break; } return; }
  if (a.op === 'clear') { me.state.edHist = []; me.state.edRedo = []; return say(ctx, 'history cleared (nothing in the world changed)'); }
}

// ---- F9 instant playtest ---------------------------------------------------------------------------------------
function play(ctx) {
  const me = ctx.self, ep = me.state.edPlay, te = me.state.te ?? {};
  if (ep?.on) { // back to the editor: the exact eye, the body where it was parked, the shelf open as it was
    me.state.edPlay = { ...ep, on: false, backAt: ctx.now() };
    me.velocity = { x: 0, y: 0, z: 0 }; if (ep.body) me.feetPosition = { ...ep.body };
    if (ep.cam) ctx.session.edCam = { ...ep.cam, mx: 0, mz: 0, my: 0, fast: false, dolly: 0 };
    me.state.te = { ...te, ...(ep.te ?? {}), open: true, note: 'back in the editor', noteAt: ctx.now() };
    return;
  }
  if (!te.open) return;
  const c = ctx.session.edCam, f = me.feetPosition;
  const cam = c ? { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch } : null;
  let at = null;
  if (cam) { const cp = Math.cos(cam.pitch), d = { x: -Math.sin(cam.yaw) * cp, y: Math.sin(cam.pitch), z: -Math.cos(cam.yaw) * cp };
    const h = raycast(ctx, { x: cam.x, y: cam.y, z: cam.z }, d, { distance: 400, bodies: 'static' });
    if (h && h.normal?.y > 0.5) at = h.position;
    else { const px = h ? h.position.x - d.x * 0.6 : cam.x + d.x * 15, pz = h ? h.position.z - d.z * 0.6 : cam.z + d.z * 15, g = ctx.place.terrain?.heightAt?.(px, pz); if (typeof g === 'number') at = { x: px, y: g, z: pz }; } }
  me.state.edPlay = { on: true, at: ctx.now(), cam, body: f ? { x: f.x, y: f.y, z: f.z } : null, te: { tab: te.tab, tool: te.tool, grp: te.grp } };
  me.state.te = { ...te, open: false };
  if (at) { me.velocity = { x: 0, y: 0, z: 0 }; me.feetPosition = { x: at.x, y: at.y + 0.15, z: at.z }; }
}

export function onInput(ctx, input) {
  const me = ctx.self, P = input.pressed ?? {};
  if (P.edPlay) return play(ctx);
  if (P.edh) return op(ctx, input.actionData?.edh ?? {});
  if (me.state.te?.open && input.held?.leCtrl && (P.leUndo || P.leArm)) {
    // Ctrl+Z walks the newest edit of either kind; the terrain core yields when this one took the key (session.edhTook)
    if (P.leUndo && newestB(me) > newestT(me)) { undoMine(ctx); ctx.session.edhTook = ctx.now(); return; }
    if (P.leUndo) { me.state.edLast = 't'; return; }
    if (P.leArm && (me.state.edRedo ?? []).length && (me.state.edLast === 'b' || !(me.state.te?.redo ?? []).length)) { redoMine(ctx); ctx.session.edhTook = ctx.now(); return; }
    return;
  }
  if (ctx.session.edhPend) finish(ctx); // a second press before the first settled: close the first now
  if (P.bld) begin(ctx, 'b', input.actionData?.bld ?? {});
  else if (P.ms) begin(ctx, 'm', input.actionData?.ms ?? {});
  else if (P.teEnd && me.state.te?.open) begin(ctx, 'b', { op: 'drop' });
}
export function update(ctx) { const P = ctx.session.edhPend; if (P && ctx.now() - P.at > 150) finish(ctx); }
