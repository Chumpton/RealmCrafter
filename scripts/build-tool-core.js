// The admin Build palette's hands (creator 2026-10-06). Editors only. The HUD sends bld { op, ... }; every placement and edit is a commit
// (one History row, one undo). player.state.bld = { sel, last[] } is what the HUD draws from.
import { PREFAB } from './lib/data/prefabs.js';
import { hasThumb } from './lib/prefab-thumb.js';
import { raycast, getInputRay } from 'builtin/physics';
import { selectTick, batch } from './build-multi.js';
import { zoneOf } from './lib/data/zones.js';
import { surfaceY } from './lib/ed-ground.js';
import { edLocked } from './lib/ed-locks.js';
import { AB, abList, maxRow, slotCenter, geo, LIM } from './lib/asset-browser.js'; // Terrain Editor Actors mode: box select + batch ops
const r2 = (v) => Math.round(v * 100) / 100;
function facing(ctx, me) {
  const cf = ctx.session?.camFacing; if (cf && typeof cf.yaw === 'number') return cf.yaw;
  const r = me.rotation; if (typeof r === 'number') return r; if (r && typeof r.yaw === 'number') return r.yaw;
  if (r && 'w' in r) return Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) * 180 / Math.PI; return 0;
}
const ground = (ctx, x, z, y0) => { const h = ctx.place.terrain?.heightAt?.(x, z); return typeof h === 'number' && isFinite(h) ? h : y0; };
// Grab-and-drag (creator 2026-10-06): with the Build tab open, a card dragged (or tapped, then the ground clicked) drops its piece under the
// cursor; a placed piece pressed and dragged rides the ground under the cursor, its own lift (▲▼) kept; one commit when it lands.
const live = (ctx, me) => me.isEditor && ((me.state.optionsOpen && me.state.optTab === 'build') || !!me.state.te?.open); // the Terrain Editor's asset tray carries cards too
function aimGround(ctx, input, ignore) {
  const r = getInputRay(ctx, input); if (!r || r.source !== 'pointer') return null;
  const h = raycast(ctx, r.origin, r.direction, { distance: 220, bodies: 'static', ignoreEntities: [ctx.self.id, ...ignore], excludeTags: ['bld-ghost'] });
  if (!h) return null;
  const t = ctx.place.terrain?.heightAt?.(h.position.x, h.position.z);
  const y = h.normal?.y > 0.6 ? h.position.y : (typeof t === 'number' && isFinite(t) ? t : h.position.y); // a floor or deck it lands on; a wall falls to the ground below
  return { x: r2(h.position.x), y: r2(y), z: r2(h.position.z) };
}
// ANY object is selectable (creator 2026-10-08): the first thing the cursor's ray meets, by collider or by drawn mesh, resolves to the
// shallowest ancestor that draws something (a scatter bed, a spline's owner, a house root); terrain, water, players and ghosts are never picked.
const DRAWS = (o) => !!(o && (o.primitive || o.model || o.scatter || o.spline || o.sprite || o.vector || o.wisp || o.light || o.fx || o.ui));
export function resolvePick(ctx, hid) {
  const raw = String(hid ?? ''); if (!raw || raw.startsWith('terrain/')) return null;
  if (edLocked(ctx, raw)) return null; // locked in the Outliner or by a locked layer (scripts/lib/ed-locks.js)
  const sc = raw.match(/^(.*?)\/scatter\/(\d+)/); if (sc && ctx.getObject(sc[1])?.scatter) return `${sc[1]}/scatter/${sc[2]}`; // one tree, rock or bush of a bed, never the whole bed
  const parts = raw.split('__')[0].split('/'), me = ctx.self.id;
  if (parts[0] === me || ctx.place.players.some((q) => q.id === parts[0])) return null;
  let first = null;
  for (let i = 1; i <= parts.length; i++) { const id = parts.slice(0, i).join('/'), o = ctx.getObject(id); if (!o) continue;
    if (o.tags?.includes?.('bld-ghost')) return null; first ??= id; if (DRAWS(o)) return id; }
  return first;
}
// A clicked scatter instance becomes its own object (creator 2026-10-08, "individualize"): a standalone copy stands exactly where it stood,
// same look, turn and size, and the bed drops that one instance (instanceOverrides[n].removed). One commit; it looks identical, now it edits alone.
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
function individualize(ctx, iid) {
  const S = (ctx.session.indiv ??= {}); if (S[iid] && ctx.getObject(S[iid])) return S[iid];
  const m = iid.match(/^(.*)\/scatter\/(\d+)$/); if (!m) return iid;
  const bed = ctx.getObject(m[1]), inst = ctx.getObject(iid); if (!bed?.scatter || !inst) return null;
  const T = bed.scatter.templates ?? [];
  const tpl = T.find((t) => (inst.model && same(t.model?.id ?? t.model, inst.model?.id ?? inst.model)) || (inst.primitive && same(t.primitive?.params, inst.primitive.params) && t.primitive?.script === inst.primitive.script)) ?? T.find((t) => t.primitive?.script && t.primitive.script === inst.primitive?.script) ?? T[0] ?? {};
  const { weight, ...look } = tpl, f = inst.worldFeetPosition ?? inst.feetPosition;
  const spec = { ...look, ...(inst.primitive ? { primitive: inst.primitive } : {}), feetPosition: { x: r2(f.x), y: r2(f.y), z: r2(f.z) }, rotation: inst.rotation ?? { yaw: 0 }, scale: inst.scale ?? 1,
    tags: [...new Set([...(look.tags ?? []), 'placed', 'individualized'])], state: { ...(look.state ?? {}), fromBed: m[1], fromIdx: +m[2] } };
  const nid = `ind-${m[1].replace(/[^\w-]/g, '-')}-${m[2]}`;
  ctx.commit('made one piece of a scatter bed its own', () => {
    if (!ctx.getObject(nid)) ctx.spawn(nid, spec);
    bed.scatter = { ...bed.scatter, instanceOverrides: { ...(bed.scatter.instanceOverrides ?? {}), [m[2]]: { removed: true } } };
  });
  S[iid] = nid; return nid;
}
function pickPlaced(ctx, input) {
  const r = getInputRay(ctx, input); if (!r || r.source !== 'pointer') return null;
  const hs = (raycast(ctx, r.origin, r.direction, { distance: 400, multiple: true, hits: 'both' }) ?? []).slice().sort((a, b) => a.distance - b.distance);
  let groundAt = null;
  for (const h of hs) {
    const hid = String(h.id ?? ''); if (hid.startsWith('terrain/')) { groundAt = h.distance; break; } // the ground came first
    const id = resolvePick(ctx, hid); if (id) return id.includes('/scatter/') ? individualize(ctx, id) : id;
  }
  const near = pickNear(ctx, r, groundAt ?? 200); // the ray slipped past: the nearest tree, bush or piece the click passed close by
  return near ? (near.includes('/scatter/') ? individualize(ctx, near) : near) : null;
}
// Forest picking (creator 2026-10-09: "allow all trees and bushes selectable"): many forest trees and bushes (scatter beds, scripted
// groves) give the pointer ray no mesh to hit, so a click that reaches the ground looks along its ray for the closest thing whose
// trunk column (feet to top) the ray passed within reach of. Runs on a click only.
function pickNear(ctx, r, upTo) {
  const o = r.origin, d = r.direction, me = ctx.self.id, seen = new Set(); let best = null, bt = Infinity;
  for (let t = 4; t <= Math.min(upTo + 3, 220); t += 8) {
    const c = { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t };
    for (const q of ctx.query({ center: c, radius: 9 })) {
      if (seen.has(q.id)) continue; seen.add(q.id);
      if (q.id === me || q.id.startsWith('player/') || q.id.startsWith(me) || ctx.place.players.some((p) => p.id === q.id)) continue;
      const g = ctx.getObject(q.id); if (!g || g.tags?.includes?.('bld-ghost') || g.scatter || !DRAWS(g)) continue;
      const b = g.bounds; if (!b?.size) continue; const H = b.size.y; if (!(H > 0.2) || H > 60 || Math.max(b.size.x, b.size.z) > 40) continue;
      const reach = Math.max(0.6, Math.min(2.5, Math.min(b.size.x, b.size.z) * 0.3)), cx = b.center.x, cz = b.center.z;
      for (let k = 0; k <= 6; k++) { // sample the column, find the nearest pass of the ray
        const y = b.min.y + H * k / 6, vx = cx - o.x, vy = y - o.y, vz = cz - o.z, tt = vx * d.x + vy * d.y + vz * d.z; if (tt < 0 || tt > upTo + 3) continue;
        const dx = vx - d.x * tt, dy = vy - d.y * tt, dz = vz - d.z * tt, dist = Math.hypot(dx, dy, dz);
        if (dist < reach && tt < bt) { bt = tt; best = resolvePick(ctx, q.id) ?? q.id; break; }
      }
    }
  }
  return best;
}
function pickPlayer(ctx, input) {
  const r = getInputRay(ctx, input); if (!r || r.source !== 'pointer') return null;
  const others = ctx.place.players.filter((q) => q.id !== ctx.self.id);
  for (const h of raycast(ctx, r.origin, r.direction, { distance: 220, multiple: true }) ?? []) {
    const hid = String(h.id ?? ''); const t = others.find((q) => hid === q.id || hid.startsWith(q.id + '/')); if (t) return t.id;
    if (hid.startsWith(ctx.self.id)) continue;
    if (h.normal?.y > 0.6) break;
  }
  for (const q of others) { const f = q.feetPosition; if (!f) continue; // a slim body the ray can miss: nearest within 0.9 m of the ray, chest high
    const c = { x: f.x - r.origin.x, y: f.y + 1 - r.origin.y, z: f.z - r.origin.z }, d = r.direction, t = c.x * d.x + c.y * d.y + c.z * d.z;
    if (t > 0 && Math.hypot(c.x - d.x * t, c.y - d.y * t, c.z - d.z * t) < 0.9) return q.id; }
  return null;
}
const lift = (o) => +(o?.state?.lift ?? 0) || 0;
function dragTick(ctx, input) {
  const me = ctx.self, S = (ctx.session.bldDrag ??= {});
  const kill = () => { if (S.ghost) ctx.destroy(S.ghost); S.ghost = null; S.carry = null; if (me.state.bld?.carry) me.state.bld = { ...me.state.bld, carry: null }; };
  if (!live(ctx, me)) { if (S.ghost || S.grab) { kill(); S.grab = null; } return; }
  const carry = me.state.bld?.carry;
  if (carry && input.pressed?.menuOpen) { kill(); return; } // right-click puts the card back
  if (carry) { // a card on the cursor: a see-through ghost rides the ground until it drops
    const P = PREFAB[carry]; if (!P) { kill(); return; }
    if (S.carry !== carry) { if (S.ghost) ctx.destroy(S.ghost); S.carry = carry; S.at = ctx.now();
      const { physics, behavior, ...look } = P.spec; S.ghost = ctx.spawn({ ...look, tags: ['bld-ghost'], audience: 'local', feetPosition: { x: 0, y: -200, z: 0 }, rotation: { yaw: Math.round(facing(ctx, me) + 180) } }); }
    const p = aimGround(ctx, input, []); const g = S.ghost && ctx.getObject(S.ghost);
    if (p && g) { g.feetPosition = p; S.spot = p; }
    const stamp = me.state.te?.open ? +me.state.te.stamp || 0 : 0; // stamp spacing (m): hold and drag paints copies, the card stays on the cursor
    if (stamp && input.held?.use && S.spot && ctx.now() - S.at > 120 && (!S.lastStamp || Math.hypot(S.spot.x - S.lastStamp.x, S.spot.z - S.lastStamp.z) >= stamp)) {
      S.lastStamp = { ...S.spot }; placeAt(ctx, me, P, S.spot, Math.round(facing(ctx, me) + 180)); me.state.bld = { ...me.state.bld, carry }; return; }
    if (stamp && !input.held?.use) S.lastStamp = null;
    if (stamp) return;
    if ((input.released?.use || input.pressed?.use) && S.spot && ctx.now() - S.at > 120) {
      const at = S.spot, yaw = Math.round(facing(ctx, me) + 180); kill();
      return placeAt(ctx, me, P, at, yaw);
    }
    return;
  }
  // Drag a player (creator 2026-10-06): press on another player, drag, let go. Their own travel.js holds them at
  // player.state.dragTo while it is fresh; the drop is one last row with done: true, and they stay until they move.
  if (input.pressed?.use && !S.grab) { const pid = pickPlayer(ctx, input); if (pid) { S.pgrab = pid; S.pAt = 0;
    ctx.emit('highlightSet', { target: pid, color: '#7fe3ff', style: 'glow', duration: 0.8 }); } }
  if (S.pgrab) { const t = ctx.place.players.find((q) => q.id === S.pgrab); if (!t) { S.pgrab = null; return; }
    const p = aimGround(ctx, input, [S.pgrab]); if (p) S.pSpot = { x: p.x, y: r2(p.y + 0.3), z: p.z };
    const up = input.released?.use || !input.held?.use, now = ctx.now();
    if (S.pSpot && (up || now - S.pAt > 90)) { S.pAt = now; t.state.dragTo = { ...S.pSpot, at: now, by: me.displayName, done: !!up }; const tb = ctx.getObject(t.id); if (tb) { tb.velocity = { x: 0, y: 0, z: 0 }; tb.feetPosition = { ...S.pSpot }; } }
    if (up) { if (S.pSpot) ctx.emit('playSound', { clip: 'cdn/moodboard-lowpoly-cozy/sfx-wood-thunk-place.mp3', position: S.pSpot, volume: 0.4 }); S.pgrab = null; S.pSpot = null; }
    return; }
  if (input.pressed?.use && !input.held?.runHold && me.state.bld?.sel && !pickPlaced(ctx, input) && aimGround(ctx, input, [])) { me.state.bld = { ...me.state.bld, sel: null }; return; } // empty ground: deselect
  if (input.pressed?.use) { const id = pickPlaced(ctx, input); if (id) { // click = select only (creator 2026-10-06); moving is the panel's buttons
    const s = { sel: null, last: [], ...(me.state.bld ?? {}) }; const o = ctx.getObject(id);
    me.state.bld = { ...s, sel: id, sc: typeof o?.scale === 'number' ? o.scale : o?.scale?.x ?? 1, wander: o?.state?.wander };
    } }
  S.grab = null;
}
// Editor placement options (creator 2026-10-07): player.state.te.rnd (random yaw + 0.85–1.15× size on nature/props/critters, default on),
// te.rsnap (0 free | 15 | 45 | 90° yaw steps), te.align (lean flush with the terrain slope). Only while the Terrain Editor is open.
const VARY = new Set(['foliage', 'prop', 'critters']);
function slopeRot(ctx, at, yaw) {
  const d = 1.2, h = (x, z) => ground(ctx, x, z, at.y), dx = (h(at.x + d, at.z) - h(at.x - d, at.z)) / (2 * d), dz = (h(at.x, at.z + d) - h(at.x, at.z - d)) / (2 * d);
  const a = yaw * Math.PI / 180, fx = -Math.sin(a), fz = -Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a); // forward (−Z) and right (+X) on the ground
  const k = 180 / Math.PI, cap = (v) => Math.max(-35, Math.min(35, v));
  return { yaw, pitch: Math.round(cap(Math.atan(dx * fx + dz * fz) * k)), roll: Math.round(cap(-Math.atan(dx * rx + dz * rz) * k)) };
}
function placeOpts(ctx, me, p, yaw) {
  const te = me.state.te; if (!te?.open) return { yaw, scale: undefined, rot: { yaw } };
  let y = yaw, scale;
  let tilt = null;
  if (te.rnd !== false && VARY.has(p.cat)) { const jy = te.jy ?? 180, js = (te.js ?? 15) / 100, jt = te.jt ?? 0; y = Math.round(yaw + (ctx.random() * 2 - 1) * jy); const b = typeof p.spec.scale === 'number' ? p.spec.scale : 1; scale = Math.round(b * (1 + (ctx.random() * 2 - 1) * js) * 100) / 100;
    if (jt > 0) tilt = { pitch: Math.round((ctx.random() * 2 - 1) * jt), roll: Math.round((ctx.random() * 2 - 1) * jt) }; }
  if (te.rsnap > 0) y = Math.round(y / te.rsnap) * te.rsnap;
  return { yaw: y, scale, align: !!te.align, tilt };
}
function placeAt(ctx, me, p, at, yaw0) {
  const s = { sel: null, last: [], ...(me.state.bld ?? {}) };
  const id = `pf-${p.id}-${Math.floor(ctx.now()).toString(36)}`;
  const po = placeOpts(ctx, me, p, yaw0), yaw = po.yaw, rot0 = po.align ? slopeRot(ctx, at, yaw) : { yaw }, rot = po.tilt ? { yaw, pitch: (rot0.pitch ?? 0) + po.tilt.pitch, roll: (rot0.roll ?? 0) + po.tilt.roll } : rot0;
  const spec = { ...p.spec, ...(po.scale ? { scale: po.scale } : {}), feetPosition: { ...at, y: r2(at.y + (p.spec.state?.lift ?? 0)) }, rotation: rot, tags: [...(p.spec.tags ?? []), 'placed', 'pf-' + p.cat],
    state: { ...(p.spec.state ?? {}), pf: p.id, ...(p.cat === 'npc' ? { home: { ...at } } : {}) } };
  ctx.commit(`placed a ${p.label}`, () => ctx.spawn(id, spec));
  s.sel = id; s.last.push(id); s.carry = null;
  ctx.emit('playSound', { clip: 'cdn/moodboard-lowpoly-cozy/sfx-wood-thunk-place.mp3', position: at, volume: 0.5 });
  ctx.emit('fx', { position: at, script: `fx\npop dust burst=14 life=.5..0.9 on=disc(.6) v=up(.6..1.2)+sdir()*.8 size=.25..0.45 acc=buoy(.2)+drag(1.6) col=<.62,.55,.45> a=0>.35:.3>.7:.15>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)` });
  me.state.bld = { cat: s.cat, sel: id, last: s.last.slice(-20), sc: po.scale ?? 1, wander: spec.state.wander, carry: null, trash: s.trash ?? [] };
}
export function onInput(ctx, input) {
  if (input.pressed?.ms && ctx.self.isEditor) batch(ctx, ctx.self, input.actionData?.ms ?? {});
  if (ctx.session.gzGrab && (input.pressed?.use || input.held?.use || input.released?.use)) { glowTick(ctx); return; } // a gizmo handle drag (ed-gizmo.js): no pick, no deselect
  if (!selectTick(ctx, input, aimGround, pickPlaced)) dragTick(ctx, input);
  previewTick(ctx); gridTick(ctx); glowTick(ctx);
  const hot = hotkey(ctx, input);
  if (!input.pressed?.bld && !hot) return;
  const me = ctx.self; if (!me.isEditor) return;
  const a = input.pressed?.bld ? input.actionData?.bld ?? {} : hot, s = { sel: null, last: [], ...(me.state.bld ?? {}) }, f = me.worldFeetPosition ?? me.feetPosition;
  if (a.op === 'ab') { const ab = { ...(me.state.ab ?? {}) }; for (const k of ['cat', 'q', 'sort']) if (typeof a[k] === 'string') ab[k] = a[k].slice(0, 40); if (typeof a.hue === 'number') ab.hue = a.hue; if (typeof a.cat === 'string' && typeof a.q !== 'string') ab.q = ''; // a new shelf starts unfiltered; the asset window (scripts/lib/asset-browser.js)
    if (typeof a.spin === 'boolean') ab.spin = a.spin; if (typeof a.nst === 'number') ab.nst = a.nst;
    if (typeof a.x === 'number' && typeof a.y === 'number') { ab.x = Math.round(Math.max(0, a.x)); ab.y = Math.round(Math.max(0, a.y)); } // dragged by its header
    if (typeof a.cols === 'number' && typeof a.rows === 'number') { ab.cols = Math.min(LIM.cols[1], Math.max(LIM.cols[0], Math.round(a.cols))); ab.rows = Math.min(LIM.rows[1], Math.max(LIM.rows[0], Math.round(a.rows))); } // stretched by its corner
    if (a.reset) { delete ab.x; delete ab.y; delete ab.cols; delete ab.rows; }
    const mr = maxRow(abList(ab).length, geo(ab)); ab.row = Math.min(mr, Math.max(0, typeof a.row === 'number' ? a.row : (+ab.row || 0) + (+a.d || 0))); me.state.ab = ab; return; }
  if (a.op === 'pv') { ctx.session.pvView = { W: +a.W || 1920, H: +a.H || 1080 }; me.state.abv = ctx.session.pvView; return; } // the editor's turntable window: the screen size it sits in, this machine only
  const yaw = facing(ctx, me), fx = -Math.sin(yaw * Math.PI / 180), fz = -Math.cos(yaw * Math.PI / 180);
  const o = s.sel ? ctx.getObject(s.sel) : null; if (s.sel && !o) s.sel = null;
  const save = () => { const so = s.sel ? ctx.getObject(s.sel) : null; me.state.bld = { cat: s.cat, sel: s.sel, last: s.last.slice(-20), sc: so ? getS(so) : 1, at: so ? { x: r2(so.feetPosition.x), y: r2(so.feetPosition.y), z: r2(so.feetPosition.z), yaw: Math.round(getYaw(so)) } : null, wander: so?.state?.wander, trash: (s.trash ?? []).slice(-10), swapFrom: s.swapFrom ?? null }; };
  if (a.op === 'place') {
    const p = PREFAB[a.id]; if (!p) return;
    const d = p.dist ?? 4, x = f.x + fx * d, z = f.z + fz * d, y = ground(ctx, x, z, f.y) + (p.spec.state?.lift ?? 0); // a model with a cellar under its floor sinks by its catalog lift
    const id = `pf-${p.id}-${Math.floor(ctx.now()).toString(36)}`;
    const spec = { ...p.spec, feetPosition: { x: r2(x), y: r2(y), z: r2(z) }, rotation: { yaw: Math.round(yaw + 180) },
      tags: [...(p.spec.tags ?? []), 'placed', 'pf-' + p.cat], state: { ...(p.spec.state ?? {}), pf: p.id, ...(p.cat === 'npc' ? { home: { x: r2(x), y: r2(y), z: r2(z) } } : {}) } };
    ctx.commit(`placed a ${p.label}`, () => ctx.spawn(id, spec));
    s.sel = id; s.last.push(id);
    ctx.emit('playSound', { clip: 'cdn/moodboard-lowpoly-cozy/sfx-wood-thunk-place.mp3', position: { x, y, z }, volume: 0.5 });
    return save();
  }
  if (a.op === 'swapCard') { if (PREFAB[a.id]) { me.state.ms = { ...(me.state.ms ?? {}), card: String(a.id) }; me.state.bld = { ...s, carry: null, swapOpen: false }; } return; } // the Swap-with picker: choose the card without picking it up
  if (a.op === 'swapOpen') { me.state.bld = { ...s, swapOpen: a.v ?? !s.swapOpen, swapQ: a.q ?? (a.v === false ? '' : s.swapQ ?? '') }; return; }
  if (a.op === 'carry') { if (PREFAB[a.id]) { me.state.bld = { ...s, carry: a.id === s.carry ? null : String(a.id) }; me.state.ms = { ...(me.state.ms ?? {}), card: String(a.id) }; } return; }
  if (a.op === 'cat') { me.state.bld = { ...s, cat: String(a.v), q: typeof a.q === 'string' ? a.q : (a.q === '' ? '' : (s.q ?? '')), page: typeof a.page === 'number' ? a.page : 1 }; return; }
  if (a.op === 'pick') { // nearest placed thing (or anything static nearby) becomes the selection
    // distance to each piece's drawn footprint, not its feet: you stand beside a dragon's flank, never on its feet. A second press steps to the next nearest
    const near = [];
    for (const q of ctx.query({ tags: ['placed'], center: f, radius: 40 })) {
      const b = ctx.getObject(q.id)?.bounds;
      const dd = b ? Math.hypot(Math.max(b.min.x - f.x, 0, f.x - b.max.x), Math.max(b.min.z - f.z, 0, f.z - b.max.z)) : Math.hypot(q.feetPosition.x - f.x, q.feetPosition.z - f.z);
      if (dd < 30) near.push([dd, q.id]);
    }
    near.sort((a, b) => a[0] - b[0]);
    const at = near.findIndex((n) => n[1] === s.sel), best = near.length ? near[at >= 0 && at < 3 ? (at + 1) % Math.min(near.length, 4) : 0][1] : null;
    s.sel = best; if (best) ctx.emit('highlightSet', { target: best, color: '#ffcf6a', style: 'outline', duration: 1.2 }); return save();
  }
  if (a.op === 'undo') { const id = s.last.pop(); if (id && ctx.getObject(id)) ctx.commit('removed the last placed piece', () => ctx.destroy(id)); if (s.sel === id) s.sel = null; return save(); }
  if (a.op === 'none') { s.sel = null; return save(); }
  if (a.op === 'uncarry') { me.state.bld = { ...s, carry: null }; return; }
  if (a.op === 'restore') { // the last deleted piece stands again where it stood, same id, size, turn and state
    const t = (s.trash ?? []).slice(), r = t.pop(); s.trash = t; const p = r && PREFAB[r.pf];
    if (p && !ctx.getObject(r.id)) { ctx.commit(`brought back the ${p.label}`, () => ctx.spawn(r.id, { ...p.spec, feetPosition: r.at, rotation: { yaw: r.yaw }, scale: r.scale, tags: r.tags, state: r.state })); s.sel = r.id; ctx.emit('highlightSet', { target: r.id, color: '#ffcf6a', style: 'outline', duration: 1.2 }); }
    return save();
  }
  if (a.op === 'swap' || a.op === 'replaceAll') { // Swap = the selected piece becomes the card; Replace all = every piece like it in this place does
    const toast = (t) => { me.state.ms = { ...(me.state.ms ?? {}), note: t, noteAt: ctx.now() }; ctx.emit('uiEvent', { name: 'msToast', payload: t }, { audience: { player: me.id } }); };
    const P = PREFAB[a.id ?? s.carry ?? me.state.ms?.card]; if (!P) { toast('pick a card in the drawer first, then press swap'); return save(); }
    if (!o) { toast('select something first'); return save(); }
    let targets = [o];
    const fromKey = kindKey(o);
    if (a.op === 'replaceAll') { let key = fromKey; if (!key) { toast('this piece has no kind to match'); return save(); }
      // the selection already IS the card (it was just swapped): Replace all means every piece like the one it was before the swap
      const same = key === 'pf:' + P.id; if (same) { if (s.swapFrom && s.swapFrom !== key) key = s.swapFrom; else { toast(`these are already ${P.label}: pick a different card`); return save(); } }
      targets = []; const seen = new Set(), of = o.worldFeetPosition ?? o.feetPosition, zone = zoneOf(of.x, of.z, ctx.world?.state?.mapZones); // only this zone (creator 2026-10-09: not the world, not the area)
      for (const q of ctx.query({ place: o.place })) { if (targets.length >= 600) break; const qf = q.feetPosition; if (!qf || zoneOf(qf.x, qf.z, ctx.world?.state?.mapZones) !== zone) continue; const g = ctx.getObject(q.id); if (!g || kindKey(g) !== key) continue;
        if ([...seen].some((id) => q.id.startsWith(id + '/'))) continue; seen.add(q.id); targets.push(g); }
      if (!same && !targets.some((t) => t.id === o.id)) targets.push(o);
      if (!targets.length) { toast(`nothing else like it in ${zone}`); return save(); } toast(`replacing ${targets.length} in ${zone}`); }
    // height: the new piece stands on whatever the old one stood on (terrain, a cliff, a deck), plus the card's own lift
    const lift = P.spec?.state?.lift ?? 0;
    // size: a new piece stands as tall as the one it replaces. The card's height per unit of scale is read off one already placed
    const unitH = (() => { for (const q of ctx.query({ place: o.place, tags: ['placed'] })) { if (q.state?.pf !== P.id) continue; const g = ctx.getObject(q.id), h = g?.bounds?.size?.y; if (h > 0.05) return h / getS(g); } return null; })();
    const hs = targets.map((t) => t.bounds?.size?.y ?? 0).filter((h) => h > 0.05).sort((x, y) => x - y), midH = hs.length ? hs[hs.length >> 1] : 0;
    const P0 = typeof P.spec.scale === 'number' ? P.spec.scale : 1;
    const sizeFor = (t) => { const h = t.bounds?.size?.y;
      if (h > 0.05 && unitH) return Math.min(P0 * 6, Math.max(P0 / 6, h / unitH)); // same height as the old piece
      if (t.state?.pf) { const base = PREFAB[t.state.pf]?.spec?.scale; return P0 * getS(t) / (typeof base === 'number' ? base : 1); } // a card keeps its relative size
      if (h > 0.05 && midH) return P0 * h / midH; // the old pieces' spread of sizes, around the card's own
      return P0; };
    const seat = (t, pos) => { const ign = [t.id]; const h = raycast(ctx, { x: pos.x, y: pos.y + 4, z: pos.z }, { x: 0, y: -1, z: 0 }, { distance: 12, ignoreEntities: ign, bodies: 'static', physicsOnly: true });
      const g = h && !(h.id && String(h.id).startsWith('pf-')) ? h.position.y : ground(ctx, pos.x, pos.z, pos.y);
      return Math.abs(g - pos.y) < 6 ? r2(g + lift) : pos.y; };
    const { behavior: _b, state: _s, tags: _t, physics: _p, ...look } = P.spec, made = []; let i = 0, beds = 0;
    ctx.commit(`${a.op === 'swap' ? 'swapped' : 'replaced'} ${targets.length} × ${PREFAB[o.state?.pf]?.label ?? 'piece'} with ${P.label}`, () => {
      for (const t of targets) {
        if (t.scatter) { t.scatter = { ...t.scatter, templates: [{ ...look, weight: 1 }] }; beds++; continue; } // a scatter bed keeps its layout and grows the card
        const pos = { ...(t.worldFeetPosition ?? t.feetPosition) }; pos.y = seat(t, pos); const sz = sizeFor(t);
        const id = `pf-${P.id}-${Math.floor(ctx.now()).toString(36)}${i ? (i).toString(36) : ''}`; i++;
        ctx.spawn(id, { ...P.spec, feetPosition: pos, rotation: { yaw: Math.round(getYaw(t)) }, scale: Math.round(sz * 1000) / 1000, tags: [...(P.spec.tags ?? []), 'placed', 'pf-' + P.cat], state: { ...(P.spec.state ?? {}), pf: P.id, ...(P.cat === 'npc' ? { home: pos } : {}) } });
        ctx.destroy(t.id); made.push(id);
      } });
    s.sel = o.scatter ? o.id : (made[targets.indexOf(o)] ?? (targets.includes(o) ? made[0] : o.id) ?? null); if (a.op === 'swap' && fromKey && fromKey !== 'pf:' + P.id) s.swapFrom = fromKey; s.carry = null; s.last.push(...made);
    ctx.emit('playSound', { clip: 'cdn/moodboard-lowpoly-cozy/sfx-wood-thunk-place.mp3', position: o.feetPosition, volume: 0.5 });
    toast(`${a.op === 'swap' ? 'Swapped' : 'Replaced'} ${made.length + beds} → ${P.label}${beds ? ` (${beds} scatter bed${beds > 1 ? 's' : ''})` : ''}`);
    save(); me.state.bld = { ...me.state.bld, carry: null }; return;
  }
  if (!o) return save();
  const pos = o.feetPosition, label = PREFAB[o.state?.pf]?.label ?? 'piece';
  const move = (p) => ctx.commit(`moved the ${label}`, () => { o.feetPosition = p; if (o.state?.home) o.state.home = { ...p }; });
  switch (a.op) {
    case 'rot': { const sn = me.state.te?.open ? +me.state.te.rsnap || 0 : 0, d = +a.d || 15, st = sn ? Math.sign(d) * Math.max(sn, Math.abs(d) >= 90 ? 90 : sn) : d;
      const ny = sn ? Math.round((getYaw(o) + st) / sn) * sn : Math.round(getYaw(o) + st);
      ctx.commit(`turned the ${label}`, () => { o.rotation = me.state.te?.open && me.state.te.align ? slopeRot(ctx, pos, ny) : { yaw: ny }; }); break; }
    case 'pos': { const p = { x: pos.x, y: pos.y, z: pos.z }; for (const k of ['x', 'y', 'z']) if (a[k] !== undefined && a[k] !== '' && isFinite(+a[k])) p[k] = r2(+a[k]); move(p); break; } // typed X | Y | Z in the editor inspector
    case 'yaw': { const ny = Math.round(((+a.v || 0) % 360 + 360) % 360); ctx.commit(`turned the ${label}`, () => { o.rotation = me.state.te?.open && me.state.te.align ? slopeRot(ctx, pos, ny) : { yaw: ny }; }); break; }
    case 'rndYaw': { const ny = Math.floor(ctx.random() * 360); ctx.commit(`spun the ${label}`, () => { o.rotation = me.state.te?.open && me.state.te.align ? slopeRot(ctx, pos, ny) : { yaw: ny }; }); break; }
    case 'align': ctx.commit(`leaned the ${label} to the slope`, () => { o.rotation = slopeRot(ctx, pos, Math.round(getYaw(o))); }); break;
    case 'upright': ctx.commit(`stood the ${label} upright`, () => { o.rotation = { yaw: Math.round(getYaw(o)) }; }); break;
    case 'mv': { const st = +a.st || 1, rx = -fz, rz = fx; // fwd/right on the camera's frame, snapped to the ground
      const x = pos.x + (fx * (+a.f || 0) + rx * (+a.r || 0)) * st, z = pos.z + (fz * (+a.f || 0) + rz * (+a.r || 0)) * st;
      move({ x: r2(x), y: r2(ground(ctx, x, z, pos.y) + ((pos.y - ground(ctx, pos.x, pos.z, pos.y)) || 0)), z: r2(z) }); break; }
    case 'up': { const d = +a.d || 0.25; ctx.commit(`lifted the ${label}`, () => { o.feetPosition = { x: pos.x, y: r2(pos.y + d), z: pos.z }; o.state.lift = r2(lift(o) + d); }); break; }
    case 'drop': ctx.commit(`set the ${label} on the ground`, () => { const base = PREFAB[o.state?.pf]?.spec?.state?.lift ?? 0, p = { x: pos.x, y: r2(surfaceY(ctx, o) + base), z: pos.z }; o.feetPosition = p; o.state.lift = base; if (o.state?.home) o.state.home = { ...p }; }); break;
    case 'here': { const x = f.x + fx * 3, z = f.z + fz * 3; move({ x: r2(x), y: r2(ground(ctx, x, z, f.y)), z: r2(z) }); break; }
    case 'scale': { const v = Math.max(0.02, +a.v || 1); ctx.commit(`resized the ${label}`, () => { o.scale = v; }); break; }
    case 'wander': ctx.commit(`set the ${label}'s wander`, () => { o.state.wander = Math.max(0, Math.min(30, +a.v || 0)); }); break;
    case 'dup': { const p = PREFAB[o.state?.pf]; if (!p) break; const id = `pf-${p.id}-${Math.floor(ctx.now()).toString(36)}`, np = { x: r2(pos.x + fx * -2 - fz * 2), y: pos.y, z: r2(pos.z + fz * -2 + fx * 2) };
      ctx.commit(`copied the ${label}`, () => ctx.spawn(id, { ...p.spec, feetPosition: np, rotation: { yaw: getYaw(o) }, scale: o.scale ?? 1, tags: [...(p.spec.tags ?? []), 'placed', 'pf-' + p.cat], state: { ...(p.spec.state ?? {}), pf: p.id, ...(p.cat === 'npc' ? { home: np } : {}) } }));
      s.sel = id; s.last.push(id); break; }
    case 'scaleBy': { const v = Math.max(0.02, Math.round(getS(o) * (+a.f || 1) * 1000) / 1000); ctx.commit(`resized the ${label}`, () => { o.scale = v; }); break; } // no ceiling: the wheel runs as far as you scroll
    case 'del': { const st = { ...(o.state ?? {}) }; delete st.__onSpawnRan; s.trash = [...(s.trash ?? []), { id: o.id, pf: o.state?.pf, at: { ...pos }, yaw: getYaw(o), scale: o.scale ?? 1, tags: [...(o.tags ?? [])], state: st }].slice(-10); }
      ctx.commit(`deleted the ${label}`, () => ctx.destroy(o.id)); s.last = s.last.filter((i) => i !== o.id); s.sel = null; break;
  }
  save();
}
function getYaw(o) { const r = o.rotation; if (typeof r === 'number') return r; if (r && typeof r.yaw === 'number') return r.yaw; if (r && 'w' in r) return Math.atan2(2 * (r.w * r.y + r.x * r.z), 1 - 2 * (r.y * r.y + r.x * r.x)) * 180 / Math.PI; return 0; }
function getS(o) { const sc = o?.scale; return typeof sc === 'number' ? sc : sc?.x ?? 1; }

export function scaleMax(o) { const base = PREFAB[o?.state?.pf]?.spec?.scale; return Math.max(6, (typeof base === 'number' ? base : 1) * 2.5); } // a giant's slider runs to 2.5× its own size

// Terrain Editor turntable (creator 2026-10-08): the card in hand (or the selected piece) spins slowly in the window at the top of the
// right inspector, ui/hud/terrain-editor.js #te-pv. A local copy is measured once below the world, then a camera-riding copy with its own
// fov draws over the world inside that window's clear pane. Nothing here is saved; every row is audience local.
const PV = { right: 58, top: 56, w: 260, h: 176, depth: 8, fov: 30, fill: 0.78, spin: 22 }; // px of the pane (te-pv), m, deg, share of the pane, deg/s
const pvDrop = (ctx, S, k) => { if (S[k]) { try { ctx.destroy(S[k]); } catch {} } S[k] = null; };
function previewTick(ctx) {
  const me = ctx.self, S = (ctx.session.bldPv ??= {}), b = me.state.bld ?? {};
  const sid = b.sel ? String(b.sel).replace(/^pf-/, '').replace(/-[a-z0-9]+$/, '') : null;
  const id = me.isEditor && me.state.te?.open ? (b.carry || (PREFAB[sid] ? sid : null)) : null;
  if (id !== S.id) { pvDrop(ctx, S, 'pv'); pvDrop(ctx, S, 'pvM'); S.id = id; S.fit = null; S.at = ctx.now();
    if (id) { const { physics, behavior, scatter, ...look } = PREFAB[id].spec;
      S.look = look; S.pvM = ctx.spawn({ ...look, scale: 1, rotation: { yaw: 0 }, tags: ['bld-ghost'], audience: 'local', feetPosition: { x: 0, y: -400, z: 0 } }); } }
  if (!id) return;
  if (!S.fit) { // measure once the copy has drawn (a model can take a moment to arrive)
    const m = S.pvM && ctx.getObject(S.pvM), bd = m?.bounds;
    if (!bd || !(bd.size?.x > 0)) { if (ctx.now() - S.at < 8000) return; S.fit = { s: 1, cy: 1, cx: 0, cz: 0 }; }
    else { const sx = typeof S.look?.scale === 'number' ? S.look.scale : 1, big = Math.max(bd.size.x, bd.size.y, bd.size.z, 0.01);
      S.fit = { big, k: sx, cy: bd.center.y + 400, cx: bd.center.x, cz: bd.center.z }; }
    pvDrop(ctx, S, 'pvM');
  }
  const v = ctx.session.pvView ?? { W: 1920, H: 1080 }, half = PV.depth * Math.tan(PV.fov / 2 * Math.PI / 180);
  const cxPx = v.W - PV.right - PV.w / 2, cyPx = PV.top + PV.h / 2 + 6;
  const x = (2 * cxPx / v.W - 1) * half * (v.W / v.H), y = (1 - 2 * cyPx / v.H) * half;
  const want = 2 * half * (PV.h / v.H) * PV.fill, s = S.fit.big ? want / S.fit.big : 0.5; // world scale that fills the pane
  const yaw = ((ctx.now() - S.at) / 1000 * PV.spin) % 360, ofs = (S.fit.cy ?? 0) * s / (S.fit.k || 1);
  const pos = { attach: 'camera', x: Math.round(x * 1000) / 1000, y: Math.round((y - ofs) * 1000) / 1000, depth: PV.depth, fov: PV.fov };
  const o = S.pv && ctx.getObject(S.pv);
  if (!o) { S.pv = ctx.spawn({ ...S.look, scale: (S.look.scale ?? 1) * s / (S.fit.k || 1), rotation: { yaw }, tags: ['bld-ghost', 'bld-pv'], audience: 'local', castShadow: false, feetPosition: pos }); S.pos = JSON.stringify(pos); return; }
  o.rotation = { yaw };
  const ps = JSON.stringify(pos); if (ps !== S.pos) { o.feetPosition = pos; S.pos = ps; }
}

// Asset window slots (creator 2026-10-09): each visible card spins as a tiny 3D copy inside its slot of the asset window, over one dark
// camera-riding backing panel. Same craft as the turntable above: measured once below the world (fit cached per card), then a local
// camera-attached copy. Nothing saved; everything audience local; all of it goes when the window or the editor closes.
const GV = { depth: 9, fov: 30, fill: 0.8, spin: 30, spinEvery: 66, backDepth: 11 }; // spinEvery: ms between turn steps (15 Hz; interpolation smooths it)
function gridTick(ctx) {
  const me = ctx.self, S = (ctx.session.abGrid ??= { slots: [], fits: {}, meas: {} }), te = me.state.te;
  if (!ctx.session.pvView && me.state.abv?.W) ctx.session.pvView = me.state.abv; // the screen size this player's window last reported
  const on = me.isEditor && te?.open && !te.tray && ctx.session.pvView;
  if (!on) { if (S.on) { for (const sl of S.slots) if (sl?.o) pvDrop(ctx, sl, 'o'); S.slots = []; pvDrop(ctx, S, 'back'); S.on = false; } return; }
  S.on = true; const v = ctx.session.pvView, ab = me.state.ab ?? {}, g = geo(ab), L = abList(ab), row = Math.min(maxRow(L.length, g), Math.max(0, +ab.row || 0)), N = g.cols * g.rows;
  const ids = L.slice(row * g.cols, row * g.cols + N).map((p) => p.id), now = ctx.now(), toX = (px, d) => (2 * px / v.W - 1) * d * Math.tan(GV.fov / 2 * Math.PI / 180) * (v.W / v.H), toY = (py, d) => (1 - 2 * py / v.H) * d * Math.tan(GV.fov / 2 * Math.PI / 180);
  const spin = ab.spin !== false, tickSpin = spin && now - (S.spunAt ?? 0) >= GV.spinEvery; if (tickSpin) S.spunAt = now; // the turn is stepped at a few Hz, not every frame
  const bk = `${v.W}x${v.H}|${g.left},${g.bottom},${g.cols},${g.rows}`; if (S.backKey !== bk) { pvDrop(ctx, S, 'back'); S.backKey = bk; // the dark panel behind the grid, so the world never shows through a slot
    const a = slotCenter(0, v.W, v.H, g), half = AB.slot / 2, x0 = a.x - half - 4, y0 = a.y - (AB.slot - AB.label) / 2 - 4, x1 = x0 + g.gridW + 8, y1 = y0 + g.gridH + 8, d = GV.backDepth;
    const w = toX(x1, d) - toX(x0, d), h = toY(y0, d) - toY(y1, d);
    S.back = ctx.spawn({ audience: 'local', tags: ['bld-ghost'], castShadow: false, receiveShadow: false, physics: 'none', primitive: { kind: 'box', width: w, height: h, depth: 0.02 }, material: { color: '#000000', emissive: '#17161a', emissiveIntensity: 1, roughness: 1 }, feetPosition: { attach: 'camera', x: (toX(x0, d) + toX(x1, d)) / 2, y: toY(y1, d), depth: d, fov: GV.fov } }); }
  for (let i = N; i < S.slots.length; i++) if (S.slots[i]?.o) pvDrop(ctx, S.slots[i], 'o'); S.slots.length = Math.min(S.slots.length, N); // shrunk: the extra slots go
  const want = 2 * GV.depth * Math.tan(GV.fov / 2 * Math.PI / 180) * ((AB.slot - AB.label) / v.H) * GV.fill;
  for (let i = 0; i < N; i++) {
    const id = ids[i] && !hasThumb(ids[i]) ? ids[i] : null, sl = (S.slots[i] ??= {}); // a card with its picture needs no live copy
    if (sl.id !== id) { pvDrop(ctx, sl, 'o'); sl.id = id; sl.pos = null; sl.at = now; sl.sc = null; }
    if (!id) continue;
    const P = PREFAB[id]; if (!P) continue;
    const c = slotCenter(i, v.W, v.H, g), yaw = spin ? ((now / 1000) * GV.spin + i * 23) % 360 : 30, fit = S.fits[id];
    const sc = fit ? (fit.big ? want / fit.big : 0.3) : 0.0005; // unmeasured: a speck in its slot until its size reads (copies far below the world get reaped)
    const pos = { attach: 'camera', x: Math.round(toX(c.x, GV.depth) * 1000) / 1000, y: Math.round((toY(c.y, GV.depth) - (fit ? fit.cy * sc : 0)) * 1000) / 1000, depth: GV.depth, fov: GV.fov };
    let o = sl.o && ctx.getObject(sl.o);
    if (!o) { const { physics, behavior, scatter, scale, ...look } = P.spec; sl.o = ctx.spawn({ ...look, scale: sc, rotation: { yaw }, tags: ['bld-ghost', 'bld-pv'], audience: 'local', castShadow: false, receiveShadow: false, feetPosition: pos }); sl.pos = JSON.stringify(pos); sl.sc = sc; continue; }
    if (!fit) { const bd = o.bounds; // the speck has drawn: its box over its scale is the model's own size
      if (bd && bd.size?.x > 0) { const big = Math.max(bd.size.x, bd.size.y, bd.size.z) / sl.sc; S.fits[id] = { big, cy: (bd.size.y / sl.sc) / 2 }; }
      else if (now - sl.at > 10000) S.fits[id] = { big: 0, cy: 0 };
      continue; }
    if (tickSpin || sl.yaw !== yaw && !spin) { o.rotation = { yaw }; sl.yaw = yaw; } if (sl.sc !== sc) { o.scale = sc; sl.sc = sc; }
    const ps = JSON.stringify(pos); if (ps !== sl.pos) { o.feetPosition = pos; sl.pos = ps; }
  }
}

// Selection glow (creator 2026-10-08): the selected piece wears a soft yellow glow for as long as it stays selected, seen by its selector alone.
const GLOW = { color: '#ffe48a', style: 'glow' };
function glowTick(ctx) {
  const me = ctx.self, S = (ctx.session.selGlow ??= {}), sel = me.isEditor && live(ctx, me) ? me.state.bld?.sel ?? null : null;
  if (sel === S.id) return;
  if (S.id) ctx.emit('highlightClear', { target: S.id }, { audience: { player: me.id } });
  S.id = sel; if (sel && ctx.getObject(sel)) ctx.emit('highlightSet', { target: sel, ...GLOW, duration: 36000 }, { audience: { player: me.id } });
}
// what makes two things "the same piece" for Replace all: the build card, else the template, model or generator kind
export function kindKey(o) {
  if (!o) return null; if (o.state?.pf) return 'pf:' + o.state.pf;
  if (o.template) return 'tpl:' + o.template;
  const m = o.model; if (m) return 'model:' + (typeof m === 'string' ? m : m.id ?? m.url ?? JSON.stringify(m).slice(0, 80));
  const p = o.primitive; if (p?.kind === 'scripted') return 'scr:' + p.script + ':' + (p.params?.kind ?? '') + ':' + (p.params?.type ?? '');
  if (o.scatter) { const t = o.scatter.templates?.[0]; return 'scatter:' + (t?.state?.pf ?? (t?.model ? JSON.stringify(t.model).slice(0, 90) : t?.primitive ? (t.primitive.script ?? t.primitive.kind) + ':' + (t.primitive.params?.kind ?? '') : '?')); }
  if (p) return 'prim:' + p.kind + ':' + JSON.stringify(o.material?.color ?? '') ;
  return null;
}

// Editor hotkeys (creator 2026-10-08), while the Terrain Editor or Build tab is open with a piece selected:
// Del/Backspace delete · Ctrl+D duplicate · Insert swap to the card in hand · Shift+Insert replace all · , . turn 15° (Shift 90°)
// PageUp/PageDown lift ±0.25 m (Shift ±1 m) · Home bring in front of me · Ctrl+Shift+Z bring back the last deleted · a click on empty ground deselects
function hotkey(ctx, input) {
  const me = ctx.self; if (!me.isEditor || !live(ctx, me)) return null;
  const P = input.pressed ?? {}, H = input.held ?? {}, shift = !!H.runHold, ctrl = !!H.leCtrl, sel = me.state.bld?.sel;
  const multi = me.state.te?.grp === 'actors' && (me.state.ms?.ids?.length ?? 0) > 0; // a box selection's keys belong to build-multi
  if (P.teRestore && ctrl && shift) return { op: 'restore' };
  if (!sel || multi) return null;
  if (P.teDel) return { op: 'del' };
  if (P.teDup && ctrl) return { op: 'dup' };
  if (P.teSwap) return { op: shift ? 'replaceAll' : 'swap' };
  if (P.teRotL) return { op: 'rot', d: shift ? -90 : -15 };
  if (P.teRotR) return { op: 'rot', d: shift ? 90 : 15 };
  if (P.teLiftUp) return { op: 'up', d: shift ? 1 : 0.25 };
  if (P.teLiftDn) return { op: 'up', d: shift ? -1 : -0.25 };
  if (P.teHere) return { op: 'here' };
  return null;
}
