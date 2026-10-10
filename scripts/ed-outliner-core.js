// SCENE OUTLINER · LAYERS · SOLO (creator 2026-10-09 editor brief). Editors only. ui/hud/ed-outliner.js draws player.state.ol.
// player.state.ol = { r, q, open{g:1}, pg{g:n}, cnt{g:n}, rows{g:[[id,label,hidden,locked]]}, layers:[[name,n,hidden,locked]], solo, busy, note }
// The index is built from ctx.query in slices (300 rows a tick) into ctx.session and paged 50 rows a group; nothing runs per frame once built.
// world.state.edLayers = { name: { ids[], hidden, locked, prev{} } } · world.state.edLocked = { id: true } (picking skips both: lib/ed-locks.js)
import { PREFAB } from './lib/data/prefabs.js';
export const GROUPS = ['props', 'buildings', 'veg', 'lights', 'beds', 'vols', 'spawns', 'npcs', 'other'];
const PAGE = 50, SLICE = 300, MAXSOLO = 8000;
const PF = { building: 'buildings', factions: 'buildings', dungeon: 'buildings', nature: 'veg', lighting: 'lights', npc: 'npcs' };
const VEG = /tree|birch|pine|spruce|oak|bush|shrub|flower|grass|flora|fern|reed|drift|hedge|mushroom|veg/i;
const BLD = /house|hall|wall|roof|tower|bridge|gate|stair|build|long|hut|barn|cabin|temple|keep|dock|pier|fence|arch|shell|cavern/i;
const SKIP = new Set(['fx', 'player', 'te-marker', 'bld-ghost', 'ms-box', 'ol-tmp']);
function classify(ctx, q) {
  const t = q.tags ?? [], pf = q.state?.pf, P = pf && PREFAB[pf];
  if (t.includes('ed-vol')) return 'vols'; if (t.includes('ed-node')) return 'spawns';
  if (P) return PF[P.cat] ?? 'props';
  const o = ctx.getObject(q.id); if (!o) return null;
  if (o.scatter) return 'beds'; if (o.light) return 'lights';
  if (t.includes('npc') || o.physics?.body === 'character' || o.wisp) return 'npcs';
  const key = `${o.template ?? ''} ${o.primitive?.script ?? ''} ${o.primitive?.params?.kind ?? ''} ${q.id}`;
  if (/lamp|torch|lantern|brazier|candle|sconce/i.test(key)) return 'lights';
  if (VEG.test(key)) return 'veg'; if (BLD.test(key)) return 'buildings';
  if (o.model || o.primitive || o.spline || o.sprite || o.vector) return 'props';
  return 'other';
}
const labelOf = (q) => { const P = PREFAB[q.state?.pf]; if (P) return P.label; const n = q.state?.name ?? q.state?.label; if (typeof n === 'string') return n.slice(0, 40);
  return String(q.id).replace(/^pf-/, '').replace(/-[a-z0-9]{6,}$/, '').slice(0, 40); };
const OL = (me) => ({ r: 150, q: '', open: {}, pg: {}, cnt: {}, rows: {}, layers: [], solo: 0, ...(me.state.ol ?? {}) });
const selIds = (me) => { const m = me.state.ms?.ids ?? []; return m.length ? m.slice() : (me.state.bld?.sel ? [me.state.bld.sel] : []); };
const nm = (v) => String(v ?? '').replace(/[^\w \-]/g, '').trim().slice(0, 24);
function say(ctx, ol, t) { ol.note = t; ol.noteAt = ctx.now(); }

// ---- index: a scan in slices ----
function startScan(ctx, me, ol) {
  const f = me.worldFeetPosition ?? me.feetPosition, pl = new Set(ctx.place.players.map((p) => p.id));
  const rows = (ol.r > 0 ? ctx.query({ center: f, radius: ol.r }) : ctx.query({})).filter((q) => { const id = String(q.id);
    return !id.includes('/') && !pl.has(id) && !id.startsWith('terrain') && !(q.tags ?? []).some((t) => SKIP.has(t)); });
  ctx.session.olIx = { todo: rows, i: 0, out: [], r: ol.r };
  ol.busy = 1;
}
function scanTick(ctx, me) {
  const X = ctx.session.olIx; if (!X?.todo) return false;
  const end = Math.min(X.todo.length, X.i + SLICE);
  for (; X.i < end; X.i++) { const q = X.todo[X.i], g = classify(ctx, q); if (g) X.out.push([q.id, labelOf(q), g]); }
  if (X.i < X.todo.length) return false;
  X.todo = null; X.done = true; return true;
}
function rowFlags(ctx, id) { const o = ctx.getObject(id); return [o?.visible === false ? 1 : 0, ctx.world.state.edLocked?.[id] ? 1 : 0]; }
function paint(ctx, me, ol) { // counts + the open groups' current pages + the layer list: the only rows the HUD reads
  const X = ctx.session.olIx, q = (ol.q ?? '').toLowerCase(), cnt = {}, rows = {}, by = {};
  for (const r of X?.out ?? []) { if (q && !r[0].toLowerCase().includes(q) && !r[1].toLowerCase().includes(q)) continue; (by[r[2]] ??= []).push(r); }
  for (const g of GROUPS) { const L = by[g] ?? []; cnt[g] = L.length; if (!ol.open[g]) continue;
    const pages = Math.max(1, Math.ceil(L.length / PAGE)), p = Math.min(pages - 1, Math.max(0, ol.pg[g] ?? 0)); ol.pg = { ...ol.pg, [g]: p };
    rows[g] = L.slice(p * PAGE, p * PAGE + PAGE).filter((r) => ctx.getObject(r[0])).map((r) => [r[0], r[1], ...rowFlags(ctx, r[0])]); }
  ol.cnt = cnt; ol.rows = rows;
  const LS = ctx.world.state.edLayers ?? {}; ol.layers = Object.keys(LS).sort().map((k) => [k, LS[k].ids?.length ?? 0, LS[k].hidden ? 1 : 0, LS[k].locked ? 1 : 0]);
  ol.sel = me.state.bld?.sel ?? null; ol.nsel = selIds(me).length;
}

// ---- selection, the way build-tool-core's pick does it ----
function select(ctx, me, ids, add) {
  const ms = { ids: [], locks: {}, pivot: 'median', ...(me.state.ms ?? {}) }, old = ms.ids ?? [];
  let next = add ? [...new Set([...old, ...(old.length ? [] : me.state.bld?.sel ? [me.state.bld.sel] : []), ...ids])] : ids.slice();
  if (add && ids.length === 1 && old.includes(ids[0])) next = old.filter((i) => i !== ids[0]);
  next = next.filter((id) => ctx.getObject(id)).slice(0, 400);
  const nu = new Set(next), was = new Set(old);
  for (const id of old) if (!nu.has(id)) ctx.emit('highlightClear', { target: id }, { audience: { player: me.id } });
  if (next.length > 1) for (const id of next) if (!was.has(id)) ctx.emit('highlightSet', { target: id, color: '#ffe48a', style: 'glow', duration: 3600 }, { audience: { player: me.id } });
  me.state.ms = { ...ms, ids: next.length > 1 ? next : [], note: `${next.length} selected`, noteAt: ctx.now() };
  me.state.bld = { sel: null, last: [], ...(me.state.bld ?? {}), sel: next[0] ?? null };
  if (next.length > 1 && me.state.te && me.state.te.grp !== 'actors') me.state.te = { ...me.state.te, grp: 'actors' }; // multi tools act in Actors mode
}
function flyTo(ctx, me, id) {
  const o = ctx.getObject(id); if (!o) return false;
  const b = o.bounds, c = b?.center ?? o.worldFeetPosition ?? o.feetPosition, sz = b ? Math.max(b.size.x, b.size.y, b.size.z) : 2;
  const d = Math.max(4, Math.min(60, sz * 1.4)), f = me.worldFeetPosition ?? me.feetPosition;
  let dx = f.x - c.x, dz = f.z - c.z; const h = Math.hypot(dx, dz) || 1; dx /= h; dz /= h; if (h < 0.01) { dx = 0; dz = 1; }
  const eye = { x: c.x + dx * d, y: c.y + d * 0.55, z: c.z + dz * d }, gy = ctx.place.terrain?.heightAt?.(eye.x, eye.z);
  if (typeof gy === 'number' && eye.y < gy + 1.5) eye.y = gy + 1.5;
  const tx = c.x - eye.x, ty = c.y - eye.y, tz = c.z - eye.z;
  const yaw = Math.atan2(-tx, -tz), pitch = Math.atan2(ty, Math.hypot(tx, tz));
  me.state.ol = { ...OL(me), fly: { x: eye.x, y: eye.y, z: eye.z, yaw, pitch, at: ctx.now() } }; // the editor's fly eye jumps (scripts/camera-editor.js)
  const by = typeof gy === 'number' ? gy : eye.y;
  me.feetPosition = { x: eye.x, y: by + 0.1, z: eye.z }; me.velocity = { x: 0, y: 0, z: 0 }; // the parked body follows, so the radius scope centres here
  return true;
}

// ---- solo: this editor's eye alone (engine <player>.hidden, the client-local hide) ----
function solo(ctx, me, ol) {
  if (ctx.session.olSolo) { me.hidden = []; ctx.session.olSolo = null; ol.solo = 0; return say(ctx, ol, 'Solo off · everything back'); }
  const keep = selIds(me); if (!keep.length) return say(ctx, ol, 'select something to solo');
  const anc = new Set(); for (const k of keep) { const p = String(k).split('/'); for (let i = 1; i <= p.length; i++) anc.add(p.slice(0, i).join('/')); }
  const pl = new Set(ctx.place.players.map((p) => p.id)), hide = [];
  for (const q of ctx.query({})) { const id = String(q.id); if (anc.has(id) || pl.has(id) || id.startsWith('terrain')) continue;
    if (keep.some((k) => id.startsWith(k + '/'))) continue; if ((q.tags ?? []).some((t) => t === 'player' || t === 'bld-ghost')) continue;
    hide.push(id); if (hide.length >= MAXSOLO) break; }
  me.hidden = hide; ctx.session.olSolo = { n: hide.length, keep }; ol.solo = keep.length;
  say(ctx, ol, `Solo: ${keep.length} shown · ${hide.length} hidden for you alone · Shift+H back`);
}

// ---- layers ----
function layerOp(ctx, me, ol, a) {
  const W = ctx.world.state, LS = W.edLayers ?? {}, name = a.l != null ? ol.layers[a.l]?.[0] : nm(a.name), L = name ? LS[name] : null, sel = selIds(me);
  const put = (label, next) => ctx.commit(label, () => { ctx.world.state.edLayers = next; });
  switch (a.op) {
    case 'lNew': { if (!name) return say(ctx, ol, 'name the layer first'); if (LS[name]) return say(ctx, ol, `${name} already exists`);
      put(`made layer ${name} (${sel.length})`, { ...LS, [name]: { ids: sel, hidden: false, locked: false } }); return say(ctx, ol, `layer ${name}: ${sel.length} pieces`); }
    case 'lAdd': case 'lRem': { if (!L) return; if (!sel.length) return say(ctx, ol, 'select something first');
      const ids = a.op === 'lAdd' ? [...new Set([...L.ids, ...sel])] : L.ids.filter((i) => !sel.includes(i));
      put(`${a.op === 'lAdd' ? 'added' : 'removed'} ${sel.length} ${a.op === 'lAdd' ? 'to' : 'from'} layer ${name}`, { ...LS, [name]: { ...L, ids } });
      if (L.hidden && a.op === 'lAdd') ctx.commit(`hid new members of ${name}`, () => { for (const id of sel) { const o = ctx.getObject(id); if (o && o.visible !== false) { o.visible = false; L.prev = { ...(L.prev ?? {}), [id]: 1 }; } } });
      return say(ctx, ol, `${name}: ${ids.length} pieces`); }
    case 'lSel': { if (!L) return; select(ctx, me, L.ids, false); return say(ctx, ol, `selected ${name} (${L.ids.length})`); }
    case 'lHide': { if (!L) return; const objs = L.ids.map((id) => ctx.getObject(id)).filter(Boolean);
      if (!L.hidden) { const prev = {}; ctx.commit(`hid layer ${name}`, () => { for (const o of objs) if (o.visible !== false) { prev[o.id] = 1; o.visible = false; } ctx.world.state.edLayers = { ...LS, [name]: { ...L, hidden: true, prev } }; }); }
      else { const prev = L.prev ?? {}; ctx.commit(`showed layer ${name}`, () => { for (const o of objs) if (prev[o.id]) o.visible = true; ctx.world.state.edLayers = { ...LS, [name]: { ...L, hidden: false, prev: {} } }; }); } // only what this layer hid comes back
      return say(ctx, ol, `${name} ${L.hidden ? 'shown' : 'hidden'}`); }
    case 'lLock': { if (!L) return; put(`${L.locked ? 'unlocked' : 'locked'} layer ${name}`, { ...LS, [name]: { ...L, locked: !L.locked } }); return say(ctx, ol, `${name} ${L.locked ? 'unlocked' : 'locked: the mouse passes over it'}`); }
    case 'lDel': { if (!L) return; if (L.hidden) return say(ctx, ol, `show ${name} before deleting it`); const next = { ...LS }; delete next[name];
      put(`deleted layer ${name} (pieces kept)`, next); return say(ctx, ol, `layer ${name} gone · its pieces stay`); }
  }
}

export function onInput(ctx, input) {
  const me = ctx.self; if (!me.isEditor) return;
  const ol = OL(me); let dirty = false;
  if (input.pressed?.edSolo && input.held?.runHold) { solo(ctx, me, ol); dirty = true; }
  if (ctx.session.olSolo && !me.state.te?.open) { solo(ctx, me, ol); dirty = true; } // leaving the editor ends Solo
  const a = input.pressed?.ol ? input.actionData?.ol ?? {} : null;
  const X = ctx.session.olIx, onTab = me.state.te?.open && me.state.te.tab === 'outline';
  if (a) { dirty = true;
    const row = (a.g && a.i != null) ? ol.rows[a.g]?.[a.i] : null, id = row?.[0];
    switch (a.op) {
      case 'r': ol.r = [50, 150, 400, 0].includes(+a.v) ? +a.v : 150; startScan(ctx, me, ol); break;
      case 'refresh': startScan(ctx, me, ol); break;
      case 'q': ol.q = String(a.v ?? '').slice(0, 40); ol.pg = {}; break;
      case 'open': ol.open = { ...ol.open, [a.g]: ol.open[a.g] ? 0 : 1 }; if (!ol.open[a.g]) delete ol.open[a.g]; break;
      case 'pg': ol.pg = { ...ol.pg, [a.g]: Math.max(0, (ol.pg[a.g] ?? 0) + (+a.d || 0)) }; break;
      case 'sel': if (id) select(ctx, me, [id], !!a.add); break;
      case 'fly': if (id) { select(ctx, me, [id], false); flyTo(ctx, me, id); Object.assign(ol, { fly: me.state.ol.fly }); } break;
      case 'eye': { const o = id && ctx.getObject(id); if (!o) break; const hid = o.visible === false; ctx.commit(`${hid ? 'showed' : 'hid'} ${row[1]}`, () => { o.visible = hid; }); break; }
      case 'lock': { if (!id) break; const L = { ...(ctx.world.state.edLocked ?? {}) }, on = !L[id]; if (on) L[id] = true; else delete L[id];
        ctx.commit(`${on ? 'locked' : 'unlocked'} ${row[1]}`, () => { ctx.world.state.edLocked = L; });
        if (on && me.state.bld?.sel === id) me.state.bld = { ...me.state.bld, sel: null }; break; }
      case 'solo': solo(ctx, me, ol); break;
      default: if (a.op?.[0] === 'l') layerOp(ctx, me, ol, a);
    }
  }
  if (onTab && !X) { startScan(ctx, me, ol); dirty = true; }
  if (ctx.session.olIx?.todo && scanTick(ctx, me)) { ol.busy = 0; dirty = true; }
  if (onTab && (ol.sel !== (me.state.bld?.sel ?? null) || ol.nsel !== selIds(me).length)) dirty = true;
  if (dirty) { paint(ctx, me, ol); me.state.ol = ol; }
}
