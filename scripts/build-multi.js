// MULTI-SELECT for the Terrain Editor's Actors mode (creator 2026-10-07). Editors only, only while the editor is open.
// player.state.ms = { ids[], locks{cat:true}, clip[], pivot:'median'|'each', fill, arr, n } is what ui/hud/terrain-editor.js draws.
// Ctrl+drag on the ground = box select · ◎ Area tool drag = circle select (everything) · Ctrl+A = everything within the area radius of the cursor · Shift+click or Ctrl+click = add/remove · Delete = delete selection. Every batch is one commit (one undo).
// Saved groups (prefabs of several pieces) live in world.state.bldGroups[name] = [{ pf, dx, dy, dz, yaw, scale }].
import { PREFAB } from './lib/data/prefabs.js';
import { surfaceY } from './lib/ed-ground.js';
const r2 = (v) => Math.round(v * 100) / 100;
const yawOf = (o) => { const r = o?.rotation; if (typeof r === 'number') return r; if (r && typeof r.yaw === 'number') return r.yaw; if (r && 'w' in r) return Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) * 180 / Math.PI; return 0; };
const scOf = (o) => { const s = o?.scale; return typeof s === 'number' ? s : s?.x ?? 1; };
const catOf = (o) => PREFAB[o?.state?.pf]?.cat ?? 'other';
const gnd = (ctx, x, z, y0) => { const h = ctx.place.terrain?.heightAt?.(x, z); return typeof h === 'number' && isFinite(h) ? h : y0; };
const MAX = 400;
export const isActors = (me) => me.isEditor && me.state.te?.open && (me.state.te.grp === 'actors');
function M(me) { return { ids: [], locks: {}, pivot: 'median', ...(me.state.ms ?? {}) }; }
function put(me, m) { me.state.ms = { ...m, ids: m.ids.slice(0, MAX) }; }
function mark(ctx, me, ids, on) { for (const id of ids) ctx.emit(on ? 'highlightSet' : 'highlightClear', on ? { target: id, color: '#ffe48a', style: 'glow', duration: 3600 } : { target: id }, { audience: { player: me.id } }); }
function setSel(ctx, me, m, ids, note) {
  const old = new Set(m.ids), nu = new Set(ids);
  mark(ctx, me, m.ids.filter((i) => !nu.has(i)), false); mark(ctx, me, ids.filter((i) => !old.has(i)), true);
  m.ids = [...nu].slice(0, MAX); m.note = note ?? `${m.ids.length} selected`; m.noteAt = ctx.now();
  if (m.ids.length === 1) me.state.bld = { ...(me.state.bld ?? {}), sel: m.ids[0] }; // one piece: the Transform tab's single tools work on it
  put(me, m);
}
const live = (ctx, ids) => ids.map((id) => ctx.getObject(id)).filter(Boolean);
function centroid(objs) { let x = 0, y = 0, z = 0; for (const o of objs) { x += o.feetPosition.x; y += o.feetPosition.y; z += o.feetPosition.z; } const n = objs.length || 1; return { x: x / n, y: y / n, z: z / n }; }
function specFor(o, at, yaw, scale) { const P = PREFAB[o.state?.pf]; if (!P) return null; const st = { ...(o.state ?? {}) }; delete st.__onSpawnRan;
  return { ...P.spec, feetPosition: at, rotation: { yaw }, scale, tags: o.tags ?? [...(P.spec.tags ?? []), 'placed', 'pf-' + P.cat], state: { ...st, ...(st.home ? { home: { ...at } } : {}) } }; }
const nid = (ctx, pf, i) => `pf-${pf}-${Math.floor(ctx.now()).toString(36)}${i ? i.toString(36) : ''}`;
function inRect(ctx, a, b, m) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z), c = { x: (x0 + x1) / 2, y: (a.y + b.y) / 2, z: (z0 + z1) / 2 };
  const R = Math.hypot(x1 - x0, z1 - z0) / 2 + 2;
  return ctx.query({ tags: ['placed'], center: c, radius: R }).filter((q) => { const f = q.feetPosition; const o = ctx.getObject(q.id); return f.x >= x0 && f.x <= x1 && f.z >= z0 && f.z <= z1 && !m.locks[catOf(o)] && !String(q.id).includes('/'); }).map((q) => q.id);
}
// Area select (creator 2026-10-09): EVERY object whose feet stand in the circle, not only build pieces. Players, terrain, the
// selection's own markers, fx and pieces of a parent (a scatter instance, a child part) stay out; a locked category stays out.
function inCircle(ctx, c, r, m) {
  const pl = new Set(ctx.place.players.map((p) => p.id));
  return ctx.query({ center: c, radius: Math.min(150, r) + 1 }).filter((q) => { const id = String(q.id), f = q.feetPosition; if (!f || pl.has(id) || id.includes('/') || id.startsWith('terrain')) return false;
    if ((q.tags ?? []).some((t) => t === 'fx' || t === 'player' || t === 'te-marker')) return false; if (Math.hypot(f.x - c.x, f.z - c.z) > r) return false;
    return !m.locks[catOf(ctx.getObject(id))]; }).map((q) => q.id); }
const RING = (r) => ({ kind: 'cylinder', radiusTop: r, radiusBottom: r, height: 0.2, radialSegments: 48 });
// per-tick: box select and shift-click; returns true when it used the click
export function selectTick(ctx, input, aimGround, pickPlaced) {
  const me = ctx.self; if (!isActors(me)) { const S = ctx.session.ms; if (S?.box) { ctx.destroy(S.box); S.box = null; } if (S?.ring) { ctx.destroy(S.ring); S.ring = null; S.c = null; } return false; }
  const S = (ctx.session.ms ??= {}), ctrl = !!input.held?.leCtrl, shift = !!input.held?.runHold;
  const p = aimGround(ctx, input, []); if (p) S.aim = p;
  if (input.pressed?.teDel && (me.state.ms?.ids?.length ?? 0) > 0) { batch(ctx, me, { op: 'del' }); return true; } // one piece: build-tool's hotkey deletes it
  if (input.pressed?.teAll && ctrl && (p || S.aim)) { const c = p ?? S.aim, m = M(me), r = Math.max(4, +m.areaR || 20), ids = inCircle(ctx, c, r, m); m.rect = null;
    setSel(ctx, me, m, shift ? [...m.ids, ...ids] : ids, `area: ${Math.min(ids.length, MAX)} selected within ${r} m${ids.length > MAX ? ` (first ${MAX})` : ''}`); return true; }
  const area = !!me.state.ms?.area;
  if (area && input.pressed?.use && !ctrl && p && !me.state.bld?.carry) { S.c = p; S.cr = 0.5; S.ring = ctx.spawn({ audience: 'local', physics: 'none', castShadow: false, tags: ['te-marker'], feetPosition: p, primitive: RING(0.5), material: { color: 'oklch(0.86 0.15 90 / 0.3)', transparent: true, opacity: 0.3, depthWrite: false } }); return true; }
  if (S.c) {
    if (p) S.cr = Math.max(0.5, Math.min(150, Math.hypot(p.x - S.c.x, p.z - S.c.z))); const g = S.ring && ctx.getObject(S.ring); if (g) g.primitive = RING(S.cr);
    if (input.released?.use || !input.held?.use) { const m = M(me), r = r2(S.cr), ids = inCircle(ctx, S.c, r, m); if (r >= 2) m.areaR = Math.round(r);
      setSel(ctx, me, m, shift ? [...m.ids, ...ids] : ids, `area: ${Math.min(ids.length, MAX)} selected in ${Math.round(r)} m${ids.length > MAX ? ` (first ${MAX})` : ''}`);
      if (S.ring) ctx.destroy(S.ring); S.ring = null; S.c = null; }
    return true;
  }
  if (input.pressed?.use && ctrl && !me.state.bld?.carry) { const id = pickPlaced(ctx, input); // creator 2026-10-09: Ctrl+click a piece adds it (again drops it); Ctrl on open ground still drags a box
    if (id) { const m = M(me); if (m.locks[catOf(ctx.getObject(id))]) { m.note = `${catOf(ctx.getObject(id))} is locked`; m.noteAt = ctx.now(); put(me, m); return true; }
      const cur = m.ids.length ? m.ids : (me.state.bld?.sel ? [me.state.bld.sel] : []);
      setSel(ctx, me, m, cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id]); return true; } }
  if (input.pressed?.use && ctrl && p) { S.a = p; S.b = p; S.box = ctx.spawn({ audience: 'local', physics: 'none', castShadow: false, feetPosition: p, primitive: { kind: 'box', width: 0.1, height: 0.15, depth: 0.1 }, material: { color: 'oklch(0.8 0.12 220 / 0.35)', transparent: true, opacity: 0.35, depthWrite: false } }); return true; }
  if (S.a) {
    if (p) S.b = p; const g = S.box && ctx.getObject(S.box);
    if (g && S.b) { const w = Math.max(0.1, Math.abs(S.b.x - S.a.x)), d = Math.max(0.1, Math.abs(S.b.z - S.a.z)); g.feetPosition = { x: (S.a.x + S.b.x) / 2, y: Math.max(S.a.y, S.b.y) + 0.1, z: (S.a.z + S.b.z) / 2 }; g.primitive = { kind: 'box', width: w, height: 0.15, depth: d }; }
    if (input.released?.use || !input.held?.use) { const m = M(me), ids = inRect(ctx, S.a, S.b ?? S.a, m);
      m.rect = { a: { x: r2(S.a.x), y: r2(S.a.y), z: r2(S.a.z) }, b: { x: r2((S.b ?? S.a).x), y: r2((S.b ?? S.a).y), z: r2((S.b ?? S.a).z) } };
      setSel(ctx, me, m, shift ? [...m.ids, ...ids] : ids, `box: ${ids.length} selected`); if (S.box) ctx.destroy(S.box); S.box = null; S.a = S.b = null; }
    return true;
  }
  if (input.pressed?.use && !me.state.bld?.carry) { const id = pickPlaced(ctx, input), m = M(me);
    if (id && m.locks[catOf(ctx.getObject(id))]) { m.note = `${catOf(ctx.getObject(id))} is locked`; m.noteAt = ctx.now(); put(me, m); return true; }
    if (shift) { if (id) setSel(ctx, me, m, m.ids.includes(id) ? m.ids.filter((i) => i !== id) : [...m.ids, id]); return true; }
    if (id) setSel(ctx, me, m, [id]); else if (m.ids.length) setSel(ctx, me, m, [], 'selection cleared');
    return false; // build-tool's own single select runs too
  }
  return false;
}
// batch ops from sendAction('ms', { op, ... })
export function batch(ctx, me, a) {
  if (!isActors(me) && a.op !== 'lock') return;
  const m = M(me), objs = live(ctx, m.ids), S = (ctx.session.ms ??= {}), F = (o) => o.feetPosition;
  const yawMe = ctx.session?.camFacing?.yaw ?? 0, fx = -Math.sin(yawMe * Math.PI / 180), fz = -Math.cos(yawMe * Math.PI / 180);
  const say = (t) => { m.note = t; m.noteAt = ctx.now(); put(me, m); ctx.emit('uiEvent', { name: 'msToast', payload: t }, { audience: { player: me.id } }); };
  switch (a.op) {
    case 'clear': return setSel(ctx, me, m, [], 'selection cleared');
    case 'area': m.area = a.v === undefined ? !m.area : !!a.v; return say(m.area ? 'Area select: drag a circle on the ground · Shift adds' : 'Area select off');
    case 'areaR': m.areaR = Math.max(4, Math.min(150, +a.v || 20)); return say(`area radius ${m.areaR} m (Ctrl+A)`);
    case 'allHere': { const c = S.aim ?? me.feetPosition, r = Math.max(4, +a.r || +m.areaR || 20), ids = inCircle(ctx, c, r, m); return setSel(ctx, me, m, ids, `area: ${Math.min(ids.length, MAX)} selected within ${r} m`); }
    case 'lock': { const L = { ...m.locks }; if (L[a.v]) delete L[a.v]; else L[a.v] = true; m.locks = L; m.ids = m.ids.filter((id) => !L[catOf(ctx.getObject(id))]); return say(L[a.v] ? `${a.v} locked` : `${a.v} unlocked`); }
    case 'pivot': m.pivot = m.pivot === 'each' ? 'median' : 'each'; return say(`pivot: ${m.pivot === 'each' ? 'each origin' : 'median point'}`);
    case 'similar': { const o = objs[0] ?? (me.state.bld?.sel && ctx.getObject(me.state.bld.sel)); if (!o) return say('select one piece first');
      const pf = o.state?.pf, R = +a.r || 80; const ids = ctx.query({ tags: ['placed'], center: F(o), radius: R }).filter((q) => q.state?.pf === pf && !String(q.id).includes('/')).map((q) => q.id);
      return setSel(ctx, me, m, [...new Set([...m.ids, ...ids])], `${ids.length} × ${PREFAB[pf]?.label ?? pf} within ${R} m`); }
    case 'invert': { const c = objs.length ? centroid(objs) : S.aim ?? me.feetPosition, R = +a.r || 60, had = new Set(m.ids);
      const ids = ctx.query({ tags: ['placed'], center: c, radius: R }).filter((q) => !had.has(q.id) && !String(q.id).includes('/') && !m.locks[catOf(ctx.getObject(q.id))]).map((q) => q.id);
      return setSel(ctx, me, m, ids, `inverted: ${ids.length} selected within ${R} m`); }
    case 'del': { const only = a.only && a.only !== 'all' ? a.only : null, kill = objs.filter((o) => !only || catOf(o) === only); if (!kill.length) return say('nothing to delete');
      const tr = kill.map((o) => ({ id: o.id, pf: o.state?.pf, at: { ...F(o) }, yaw: yawOf(o), scale: scOf(o) }));
      ctx.commit(`deleted ${kill.length} pieces`, () => { for (const o of kill) ctx.destroy(o.id); });
      m.trash = [...(m.trash ?? []), tr].slice(-8); m.ids = m.ids.filter((id) => !kill.some((o) => o.id === id)); return say(`Deleted ${kill.length} pieces${only ? ` (${only} only)` : ''}`); }
    case 'restore': { const tr = (m.trash ?? []).slice(), last = tr.pop(); if (!last) return say('nothing to bring back'); m.trash = tr;
      ctx.commit(`brought back ${last.length} pieces`, () => { for (const r of last) { const P = PREFAB[r.pf]; if (P && !ctx.getObject(r.id)) ctx.spawn(r.id, { ...P.spec, feetPosition: r.at, rotation: { yaw: r.yaw }, scale: r.scale, tags: [...(P.spec.tags ?? []), 'placed', 'pf-' + P.cat], state: { ...(P.spec.state ?? {}), pf: r.pf } }); } });
      return setSel(ctx, me, m, last.map((r) => r.id), `brought back ${last.length}`); }
    case 'hide': { if (!objs.length) return say('select something to hide'); ctx.commit(`hid ${objs.length} pieces`, () => { for (const o of objs) o.visible = false; }); m.hidden = [...new Set([...(m.hidden ?? []), ...m.ids])].slice(-MAX); return say(`hid ${objs.length}`); }
    case 'unhide': { const hs = live(ctx, m.hidden ?? []); ctx.commit(`showed ${hs.length} hidden pieces`, () => { for (const o of hs) o.visible = true; }); m.hidden = []; return say(`showed ${hs.length}`); }
    case 'move': { if (!objs.length) return; const dx = (+a.f || 0) * fx + (+a.r || 0) * -fz, dz = (+a.f || 0) * fz + (+a.r || 0) * fx, dy = +a.y || 0;
      ctx.commit(`moved ${objs.length} pieces`, () => { for (const o of objs) { const p = F(o), x = r2(p.x + dx), z = r2(p.z + dz), y = dy ? r2(p.y + dy) : r2(gnd(ctx, x, z, p.y) + (p.y - gnd(ctx, p.x, p.z, p.y))); o.feetPosition = { x, y, z }; if (o.state?.home) o.state.home = { x, y, z }; } });
      return say(`moved ${objs.length}`); }
    case 'drop': ctx.commit(`dropped ${objs.length} pieces to the ground`, () => { for (const o of objs) { const p = F(o); o.feetPosition = { x: p.x, y: r2(surfaceY(ctx, o, objs.map((q) => q.id)) + (+o.state?.lift || 0)), z: p.z }; } }); return say(`dropped ${objs.length}`);
    case 'rot': { if (!objs.length) return; const d = +a.d || 15, c = centroid(objs), rad = -d * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
      ctx.commit(`turned ${objs.length} pieces`, () => { for (const o of objs) { const p = F(o); if (m.pivot !== 'each') { const ox = p.x - c.x, oz = p.z - c.z, x = r2(c.x + ox * cs - oz * sn), z = r2(c.z + ox * sn + oz * cs); o.feetPosition = { x, y: r2(gnd(ctx, x, z, p.y) + (p.y - gnd(ctx, p.x, p.z, p.y))), z }; } o.rotation = { yaw: Math.round(yawOf(o) + d) }; } });
      return say(`turned ${objs.length} ${d > 0 ? '⟲' : '⟳'} ${Math.abs(d)}°`); }
    case 'scale': { // creator 2026-10-09: a group resize grows every piece where it stands; nothing moves (no spread from the median, no ground re-drop)
      const k = +a.k || 1, s3 = (v) => Math.max(0.02, Math.round(v * k * 1000) / 1000);
      ctx.commit(`resized ${objs.length} pieces`, () => { for (const o of objs) { const sc = o.scale; o.scale = typeof sc === 'object' && sc ? { x: s3(sc.x ?? 1), y: s3(sc.y ?? 1), z: s3(sc.z ?? 1) } : s3(sc ?? 1); } }); return say(`resized ${objs.length} in place`); }
    case 'dup': case 'array': { if (!objs.length) return say('select something first'); const n = a.op === 'dup' ? 1 : Math.max(1, Math.min(40, +a.n || +m.arrN || 5)), sp = a.op === 'dup' ? 3 : Math.max(0.5, +a.d || +m.arrD || 4);
      if (objs.length * n > MAX) return say(`too many: ${objs.length * n} copies`); const made = []; let i = 0;
      ctx.commit(a.op === 'dup' ? `copied ${objs.length} pieces` : `arrayed ${objs.length} × ${n}`, () => { for (let k = 1; k <= n; k++) for (const o of objs) { const p = F(o), x = r2(p.x + fx * sp * k), z = r2(p.z + fz * sp * k), at = { x, y: r2(gnd(ctx, x, z, p.y) + (p.y - gnd(ctx, p.x, p.z, p.y))), z }; const s = specFor(o, at, yawOf(o), scOf(o)); if (!s) continue; const id = nid(ctx, o.state.pf, ++i); ctx.spawn(id, s); made.push(id); } });
      return setSel(ctx, me, m, made, a.op === 'dup' ? `Duplicated ${made.length}` : `Array: ${made.length} copies every ${sp} m`); }
    case 'arrN': m.arrN = Math.max(1, Math.min(40, +a.v || 5)); return put(me, m);
    case 'arrD': m.arrD = Math.max(0.5, Math.min(40, +a.v || 4)); return put(me, m);
    case 'copy': case 'cut': { if (!objs.length) return say('select something first'); const c = centroid(objs);
      m.clip = objs.filter((o) => PREFAB[o.state?.pf]).map((o) => ({ pf: o.state.pf, dx: r2(F(o).x - c.x), dy: r2(F(o).y - c.y), dz: r2(F(o).z - c.z), yaw: Math.round(yawOf(o)), scale: scOf(o) }));
      if (a.op === 'cut') { ctx.commit(`cut ${objs.length} pieces`, () => { for (const o of objs) ctx.destroy(o.id); }); m.ids = []; }
      return say(`${a.op === 'cut' ? 'Cut' : 'Copied'} ${m.clip.length} · aim and Paste`); }
    case 'paste': case 'group': { const items = a.op === 'group' ? ctx.world.state.bldGroups?.[a.name] : m.clip, at = S.aim; if (!items?.length) return say(a.op === 'group' ? 'no such group' : 'clipboard is empty'); if (!at) return say('aim at the ground first');
      const made = []; let i = 0;
      ctx.commit(a.op === 'group' ? `placed group ${a.name}` : `pasted ${items.length} pieces`, () => { for (const it of items) { const P = PREFAB[it.pf]; if (!P) continue; const x = r2(at.x + it.dx), z = r2(at.z + it.dz), y = r2(gnd(ctx, x, z, at.y) + (it.dy > 0.3 ? it.dy : 0) + (P.spec.state?.lift ?? 0)); const id = nid(ctx, it.pf, ++i);
        ctx.spawn(id, { ...P.spec, feetPosition: { x, y, z }, rotation: { yaw: it.yaw }, scale: it.scale, tags: [...(P.spec.tags ?? []), 'placed', 'pf-' + P.cat], state: { ...(P.spec.state ?? {}), pf: it.pf, ...(P.cat === 'npc' ? { home: { x, y, z } } : {}) } }); made.push(id); } });
      ctx.emit('playSound', { clip: 'cdn/moodboard-lowpoly-cozy/sfx-wood-thunk-place.mp3', position: at, volume: 0.5 });
      return setSel(ctx, me, m, made, a.op === 'group' ? `Placed group: ${a.name}` : `Pasted ${made.length}`); }
    case 'saveGroup': { if (objs.length < 2) return say('select 2+ pieces to save a group'); const c = centroid(objs), name = String(a.name || `group ${Object.keys(ctx.world.state.bldGroups ?? {}).length + 1}`).replace(/[^\w \-']/g, '').slice(0, 24) || 'group';
      ctx.world.state.bldGroups = { ...(ctx.world.state.bldGroups ?? {}), [name]: objs.filter((o) => PREFAB[o.state?.pf]).map((o) => ({ pf: o.state.pf, dx: r2(F(o).x - c.x), dy: r2(F(o).y - c.y), dz: r2(F(o).z - c.z), yaw: Math.round(yawOf(o)), scale: scOf(o) })) };
      return say(`Saved group: ${name} (${objs.length})`); }
    case 'delGroup': { const G = { ...(ctx.world.state.bldGroups ?? {}) }; delete G[a.name]; ctx.world.state.bldGroups = G; return say(`removed group ${a.name}`); }
    case 'swap': { const P = PREFAB[a.id ?? m.card]; if (!P) return say('pick a card in the tray first'); if (!objs.length) return say('select something to swap');
      const made = []; let i = 0;
      ctx.commit(`swapped ${objs.length} pieces to ${P.label}`, () => { for (const o of objs) { const p = F(o), id = nid(ctx, P.id, ++i); const base = PREFAB[o.state?.pf]?.spec?.scale, k = scOf(o) / (typeof base === 'number' ? base : 1);
        ctx.spawn(id, { ...P.spec, feetPosition: { ...p }, rotation: o.rotation ?? { yaw: 0 }, scale: r2((typeof P.spec.scale === 'number' ? P.spec.scale : 1) * k), tags: [...(P.spec.tags ?? []), 'placed', 'pf-' + P.cat], state: { ...(P.spec.state ?? {}), pf: P.id, ...(P.cat === 'npc' ? { home: { ...p } } : {}) } }); ctx.destroy(o.id); made.push(id); } });
      return setSel(ctx, me, m, made, `Swapped ${made.length} → ${P.label}`); }
    case 'card': m.card = PREFAB[a.id] ? a.id : m.card; return put(me, m);
    case 'fill': { const P = PREFAB[a.id ?? m.card], R = m.rect; if (!P) return say('pick a card in the tray first'); if (!R) return say('Ctrl+drag a box on the ground first');
      const sp = Math.max(1, +a.d || +m.fillD || 4), x0 = Math.min(R.a.x, R.b.x), x1 = Math.max(R.a.x, R.b.x), z0 = Math.min(R.a.z, R.b.z), z1 = Math.max(R.a.z, R.b.z);
      const pts = []; for (let x = x0 + sp / 2; x < x1; x += sp) for (let z = z0 + sp / 2; z < z1; z += sp) pts.push({ x: r2(x + (ctx.random() - 0.5) * sp * 0.5), z: r2(z + (ctx.random() - 0.5) * sp * 0.5) });
      if (pts.length > 150) return say(`${pts.length} is too many: widen the spacing`); const made = []; let i = 0, b = typeof P.spec.scale === 'number' ? P.spec.scale : 1, vary = ['foliage', 'prop', 'critters'].includes(P.cat);
      ctx.commit(`filled ${pts.length} × ${P.label}`, () => { for (const q of pts) { const y = r2(gnd(ctx, q.x, q.z, R.a.y) + (P.spec.state?.lift ?? 0)), id = nid(ctx, P.id, ++i); ctx.spawn(id, { ...P.spec, feetPosition: { x: q.x, y, z: q.z }, rotation: { yaw: vary ? Math.round(ctx.random() * 360) : 0 }, scale: vary ? r2(b * (0.85 + ctx.random() * 0.3)) : b, tags: [...(P.spec.tags ?? []), 'placed', 'pf-' + P.cat], state: { ...(P.spec.state ?? {}), pf: P.id, ...(P.cat === 'npc' ? { home: { x: q.x, y, z: q.z } } : {}) } }); made.push(id); } });
      return setSel(ctx, me, m, made, `Filled ${made.length} × ${P.label} every ${sp} m`); }
    case 'fillD': m.fillD = Math.max(1, Math.min(30, +a.v || 4)); return put(me, m);
  }
}
