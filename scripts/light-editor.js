// LIGHT EDITOR (creator 2026-10-04; docs/board/LIGHT-EDITOR-PLAN.md with Savi's [S] review). Editors only, on the editor's own machine.
// O → LIGHTS opens the panel. Tag: a glowing ring follows your aim; J (or the panel's Drop) sets it. Scan reads what stands in the ring,
// light-rules.js decides, and ghost lamps (local, nobody else sees them, never tagged `lamp`) preview it. Click Re-roll for another seed,
// Accept writes the SAME lamp rows the hand-lit cells use (templates/lamp.js, tag lamp + le-<area>) in one commit = one History row,
// one undo; the lamp manager lights them at dusk like every other lamp. Undo area removes that area's lamps in one more commit.
// Owns: player.state.le (the panel's view), world.state.lightAreas (the accepted areas: { x, z, r, seed, n, at }).
import { raycast } from 'builtin/physics';
import { LE } from './lib/data/light-rules.js';
import { plan, classify, summary, rng } from './lib/light-rules.js';
import { lampFx } from './lamp.js';
import { lampClock } from './lib/lamp-clock.js';
import { animate } from 'builtin/tween';
import { readArea, summarizeForJev } from './lib/area-read.js';
import { jevOn, askAreaJev, mergeJev, JEV_TIMEOUT_MS } from './lib/area-jev.js';
import { ringBreath, sweepSpec, sweepTween, blipSpec, doneSpec } from './lib/scan-pulse.js';
import { LE_SOUNDS } from './lib/data/le-sounds.js';
const MAX_BLIPS = 28, SWEEP = { base: 0.9, perM: 12, min: 1, max: 3 }; // sweep seconds = clamp(base + r_m / perM, min, max) (the brief)
const sweepSecs = (rM) => Math.max(SWEEP.min, Math.min(SWEEP.max, SWEEP.base + rM / SWEEP.perM));
const sfx = (ctx, k, at, pitch) => { const d = LE_SOUNDS[k]; if (!d) return; ctx.emit('playSound', { clip: d.clip, position: at ? { x: at.x, y: (at.y ?? 0) + 1, z: at.z } : undefined, volume: d.volume, pitch: (pitch ?? 1) + (ctx.random() * 2 - 1) * d.pitchJitter }, { audience: { player: ctx.self.id } }); };
const RING = 'le-ring', flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const session = new Map(); // player id -> { picks, ghosts: [], ring, aim, at }
const S = (ctx) => { let v = session.get(ctx.self.id); if (!v) session.set(ctx.self.id, v = { picks: [], ghosts: [], ring: null, aim: null, aimAt: 0 }); return v; };
const ftToM = (ft) => ft / LE.ftPerM;
const groundY = (ctx, x, z, near) => {
  const r = raycast(ctx, { x, y: near + 12, z }, { x: 0, y: -1, z: 0 }, { distance: 30, physicsOnly: true, excludeTags: ['le-ghost', 'le-ring', 'player'] });
  return r?.position?.y ?? ctx.place.terrain?.heightAt?.(x, z) ?? near;
};
function view(ctx, patch) { const me = ctx.self; me.state.le = { ...(me.state.le ?? {}), ...patch, at: ctx.now() }; }
function clearGhosts(ctx) { const v = S(ctx); for (const id of v.ghosts) if (ctx.getObject(id)) ctx.destroy(id); v.ghosts = []; }
function clearRing(ctx) { const v = S(ctx); if (v.ring && ctx.getObject(v.ring)) ctx.destroy(v.ring); v.ring = null; }
function drawRing(ctx, at, rM, set, breath) {
  const v = S(ctx), y = groundY(ctx, at.x, at.z, at.y ?? 0);
  const col = set ? '#ffb45a' : '#9fd0ff';
  if (v.ring && ctx.getObject(v.ring) && v.ringR === rM && v.ringSet === set && v.ringBreath === !!breath) { const o = ctx.getObject(v.ring); o.feetPosition = { x: at.x, y: y + 0.05, z: at.z }; return; }
  clearRing(ctx); v.ringR = rM; v.ringSet = set; v.ringBreath = !!breath;
  v.ring = ctx.spawn({ audience: 'local', scope: 'session', tags: ['le-ring'], feetPosition: { x: at.x, y: y + 0.05, z: at.z }, castShadow: false, receiveShadow: false, ...(breath ? { fx: { script: ringBreath(rM) } } : {}),
    primitive: { kind: 'cylinder', radiusTop: rM, radiusBottom: rM, height: set ? 0.9 : 0.5, radialSegments: 64, openEnded: true },
    material: { color: col, emissive: col, emissiveIntensity: 1.6, transparent: true, opacity: set ? 0.22 : 0.14, side: 'double', depthWrite: false },
    children: [{ feetPosition: { x: 0, y: 0.02, z: 0 }, rotation: { pitch: -90 }, primitive: { kind: 'ring', innerRadius: Math.max(0.05, rM - 0.12), outerRadius: rM, thetaSegments: 64 }, anchor: 'center', pivot: 'center', material: { color: col, emissive: col, emissiveIntensity: 2.4, transparent: true, opacity: 0.85, depthWrite: false }, castShadow: false }] });
}
// what stands in the ring, as the planner reads it
function survey(ctx, c, rM) {
  const rows = ctx.query({ center: { x: c.x, y: c.y ?? 0, z: c.z }, radius: Math.max(rM + LE.scanPad, LE.context ?? 0), excludeTags: ['le-ghost', 'le-ring', 'player'] }) ?? []; // AUTOFILL v2 #9: the place is named from 30 m round; lamps still only inside the ring
  const things = [], lamps = [];
  for (const row of rows.slice(0, 400)) {
    const cls = classify(row.id, row.tags);
    if (cls === 'lamp') { const f = row.feetPosition; lamps.push({ kind: row.state?.kind ?? 'torch', x: f.x, z: f.z }); continue; }
    if (!cls || cls === 'skip') continue;
    const o = ctx.getObject(row.id), b = o?.bounds; if (!b) continue;
    const hx = b.size.x / 2, hz = b.size.z / 2; if (hx > 40 || hz > 40) continue; // a whole cell's ground mesh is not a house
    if (cls === 'house' && hx * hz * 4 < LE.minHouseArea) continue;
    const t = { id: row.id, cls, name: String(row.id).split('/').pop().replace(/[-_]\d+$/, '').replace(/[-_]/g, ' '), x: b.center.x, z: b.center.z, hx, hz, top: cls === 'table' ? b.max.y : null, base: b.min.y };
    if (cls === 'house') { // the real wall: a ray from outside toward its centre at rushlight height
      const dx = b.center.x - c.x, dz = b.center.z - c.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, y = b.min.y + LE.wallY, far = Math.abs(ux) * hx + Math.abs(uz) * hz + 4;
      const h = raycast(ctx, { x: b.center.x - ux * far, y, z: b.center.z - uz * far }, { x: ux, y: 0, z: uz }, { distance: far + 2, physicsOnly: false, hits: 'both', excludeTags: ['le-ghost', 'le-ring', 'player', 'lamp'] });
      if (h?.normal && Math.abs(h.normal.y) < 0.4) t.wall = { x: h.position.x + h.normal.x * 0.25, y: h.position.y, z: h.position.z + h.normal.z * 0.25, nx: h.normal.x, nz: h.normal.z };
    }
    things.push(t);
  }
  const open = []; // open-ground candidates for a yard fire, a loose grid over the ring
  const step = Math.max(1.5, rM / 5);
  for (let x = -rM; x <= rM; x += step) for (let z = -rM; z <= rM; z += step) if (Math.hypot(x, z) <= rM * 0.85) open.push({ x: c.x + x, z: c.z + z });
  const lvl = LE.waterLevel ?? 0; let wet = 0, dry = 0; // the lake: ground under the water line
  for (const o of open) { const h = ctx.place.terrain?.heightAt?.(o.x, o.z); if (h == null) continue; if (h < lvl - 0.1) wet++; else dry++; }
  return { c: { x: c.x, z: c.z }, r: rM, things, lamps, paths: pathsNear(ctx, c, rM), open: open.filter((o) => !((ctx.place.terrain?.heightAt?.(o.x, o.z) ?? 1) < lvl - 0.1)), ground: { water: wet + dry ? wet / (wet + dry) : 0 } };
}
// AUTOFILL v2 #13: the place's worn paths and roads (terrain marks) that pass near the ring, for the planner's path torches
function pathsNear(ctx, c, rM) {
  const marks = ctx.place.terrain?.marks ?? {}, out = [], reach = rM + (LE.path?.gap ?? 12);
  for (const [key, m] of Object.entries(marks)) {
    if (/rut|wear|mud|pave|yard|forecourt|shingle|sand/i.test(key)) continue; // ruts and foot-wear sit on top of a real path
    if (!m || (m.kind !== 'path' && m.kind !== 'road') || !Array.isArray(m.points) || m.points.length < 2 || /sand|shingle|shore/i.test(String(m.material ?? ''))) continue;
    const pts = m.points.map((q) => [q[0], q[q.length - 1]]);
    if (/speck/i.test(key) || pts.reduce((L, q, i) => i ? L + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0, 0) < (LE.path?.minLen ?? 10)) continue; // a worn speck by a gate is not a path to walk
    if (pts.some(([x, z]) => Math.hypot(x - c.x, z - c.z) < reach) || pts.some((q, i) => i && segNear(pts[i - 1], q, c) < reach)) out.push({ pts, w: m.width ?? 2.4 });
  }
  return out;
}
function segNear(a, b, c) { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((c.x - a[0]) * dx + (c.z - a[1]) * dz) / l2)); return Math.hypot(a[0] + dx * t - c.x, a[1] + dz * t - c.z); }
function roofed(ctx, p, y) { const h = raycast(ctx, { x: p.x, y: y + 0.6, z: p.z }, { x: 0, y: 1, z: 0 }, { distance: 9, hits: 'both', excludeTags: ['le-ghost', 'le-ring', 'player', 'tree'] }); return !!h && !/tree|pine|birch|oak|spruce/i.test(String(h.id ?? '')); }
function propose(ctx) {
  const me = ctx.self, L = me.state.le ?? {}, a = L.area; if (!a) return;
  clearGhosts(ctx);
  const sv = survey(ctx, a, a.r), out = plan(sv, { seed: a.seed, dens: L.dens ?? 'natural', kinds: L.kinds ?? {} });
  const picks = place(ctx, a, out.picks);
  const v = S(ctx); v.picks = picks; showGhosts(ctx, picks);
  view(ctx, { phase: 'preview', picks: picks.map((p) => ({ kind: p.kind, why: p.why })), sum: summary(picks), note: out.note, budget: budget(ctx, a, picks.length) });
}
function place(ctx, a, raw) {
  const picks = [];
  for (const p of raw) {
    const y = p.onTop ? p.y : p.wall ? p.y - LE.wallY + LE.wallY - 0.3 : groundY(ctx, p.x, p.z, a.y ?? 0);
    if (LE.kinds[p.kind].fire && !p.onTop && roofed(ctx, p, y)) continue; // fire never under a roof
    const yaw = p.wall ? Math.atan2(-p.nx, -p.nz) * 180 / Math.PI : Math.round((ctx.random() * 360));
    picks.push({ kind: p.kind, x: +p.x.toFixed(2), y: +y.toFixed(2), z: +p.z.toFixed(2), yaw: +yaw.toFixed(1), why: p.why });
  }
  return picks;
}
function showGhosts(ctx, picks) {
  const v = S(ctx);
  for (const [i, p] of picks.entries()) {
    v.ghosts.push(ctx.spawn({ audience: 'local', scope: 'session', tags: ['le-ghost'], state: { i }, feetPosition: { x: p.x, y: p.y, z: p.z }, rotation: { yaw: p.yaw },
      primitive: { kind: 'scripted', script: 'scripts/gen/lamp.js', params: { kind: p.kind } }, material: { transparent: true, opacity: 0.55 }, castShadow: false,
      fx: { script: lampFx(p.kind, true, true) } }));
  }
}
function budget(ctx, a, adding) {
  const dHall = flat(a, LE.hall), inZone = dHall < LE.hall.zone;
  const zone = inZone ? (ctx.query({ tags: ['lamp'], center: { x: LE.hall.x, y: 30, z: LE.hall.z }, radius: LE.hall.zone, select: 'ids' }) ?? []).length : null;
  return { inZone, zone, cap: LE.hall.cap, adding, over: inZone && zone + adding > LE.hall.cap, dHall: Math.round(dHall), outside: dHall > LE.valley };
}
function accept(ctx, force) {
  const me = ctx.self, L = me.state.le ?? {}, a = L.area, v = S(ctx); if (!a || !v.picks.length) return;
  const b = budget(ctx, a, v.picks.length);
  if (b.outside) return view(ctx, { note: `This ring is ${b.dHall} m from the hall, past the 0.25 mile valley.` });
  if (b.over && !force) return view(ctx, { phase: 'preview', confirm: true, budget: b, note: `The hall zone already has ${b.zone} lamps (cap ${b.cap}). Press Accept again to place anyway.` });
  const areas = ctx.world.state.lightAreas ?? {}, id = 'a' + Math.round(a.x) + '_' + Math.round(a.z) + '_' + (a.seed % 1000);
  if (areas[id]) return view(ctx, { note: 'This exact area is already lit. Undo it first, or re-roll.' });
  const picks = v.picks.slice(0, LE.maxPerArea);
  commitPicks(ctx, a, id, picks, areas);
  clearGhosts(ctx); v.picks = [];
  sfx(ctx, 'ignite', a);
  view(ctx, { phase: 'done', last: id, picks: [], sum: '', confirm: false, note: `Lit: ${summary(picks)}. They burn at dusk with every other lamp.` });
}
function lampOnNow(ctx) {
  try { const on = lampClock(ctx)?.on; if (typeof on === 'boolean') return on; } catch {}
  return !!ctx.getObject('home-weather-controller')?.state?.lampsOn;
}
function commitPicks(ctx, a, id, picks, areas) {
  const lit = lampOnNow(ctx); // LAMP CLOCK (rev 2): the shared sky answer (lampClock.on), the controller's lampsOn as fallback
  const taken = (p) => (ctx.query({ tags: ['lamp'], center: { x: p.x, y: p.y, z: p.z }, radius: 1.2, select: 'ids' }) ?? []).length > 0; // LIGHT V2: never stack on a lamp
  if (areas[id] || picks.every(taken)) return; // a second machine settling the same scan finds its lamps already standing
  const row = { x: +a.x.toFixed(1), z: +a.z.toFixed(1), r: +a.r.toFixed(1), seed: a.seed, n: picks.length, at: ctx.now() };
  ctx.world.state.lightAreas = { ...areas, [id]: row }; // the room's record, written outside the commit too so Ctrl+Z and Undo find it this session
  ctx.commit(`Light Editor: ${summary(picks)} lit around (${Math.round(a.x)}, ${Math.round(a.z)})`, () => {
    const R = rng((a.seed ^ 0x5eed) >>> 0), S2 = LE.spent ?? { rate: 0, minPicks: 99 }; // AUTOFILL v2 #14: ~1 in 10 burnt out, never the first
    let spentN = 0, spentMax = Math.max(0, Math.floor(picks.length / 8)) || (picks.length >= S2.minPicks ? 1 : 0); // never more than ~1 in 8 burnt out
    for (const [i, p] of picks.entries()) if (!taken(p)) { const spent = i > 0 && spentN < spentMax && R() < S2.rate * 2 && ++spentN > 0;
      ctx.spawn(`le-${id}-${i}`, { template: `templates/lamp.js#${p.kind}`, feetPosition: { x: p.x, y: p.y, z: p.z }, rotation: { yaw: p.yaw }, tags: ['lamp', 'le-lamp', 'le-' + id], state: { kind: p.kind, lit, ...(spent ? { spent: true } : {}) } }); }
    ctx.world.state.lightAreas = { ...areas, [id]: row };
  });
  ctx.after(0.05, 'leFlare', { id, picks }); // the flare rides the next tick: the commit alone fills this one
}
// AUTOFILL v2 #18: every new lamp flares on the editor's screen for a few seconds (its flame, no light) with a warm outline, so a noon
// placement reads; then it waits for dusk like every other lamp. Local and session-scoped: nobody else sees it, nothing is saved.
function flare(ctx, id, picks) {
  const secs = LE.glowSecs ?? 4;
  for (const p of picks) ctx.spawn({ audience: 'local', scope: 'session', lifetime: secs, tags: ['le-ghost'], feetPosition: { x: p.x, y: p.y, z: p.z }, rotation: { yaw: p.yaw }, fx: { script: lampFx(p.kind, true, true) } });
  for (const [i] of picks.entries()) ctx.emit('highlightSet', { target: `le-${id}-${i}`, color: '#ffb45a', style: 'glow', duration: secs }, { audience: { player: ctx.self.id } });
}
function undoArea(ctx, id) {
  const areas = { ...(ctx.world.state.lightAreas ?? {}) }; id = id ?? S(ctx).lastId;
  const ids = id ? ctx.query({ tags: ['le-' + id], radius: 5000, select: 'ids' }) ?? [] : [], at = areas[id] ?? ctx.getObject(ids[0] ?? '')?.feetPosition; // AUTOFILL v2: the lamps' own tag finds them even when the area row lagged
  if (!id || (!areas[id] && !ids.length)) return view(ctx, { note: 'Nothing to undo there.' });
  delete areas[id]; ctx.world.state.lightAreas = areas; // the room's record goes outside the commit too (a stale row blocked re-lighting the same spot)
  ctx.commit(`Light Editor: removed the lamps of area ${id}`, () => { for (const x of ids) ctx.destroy(x); ctx.world.state.lightAreas = areas; });
  sfx(ctx, 'undo', at);
  view(ctx, { phase: 'idle', last: null, read: null, note: `Removed ${ids.length} lamp${ids.length === 1 ? '' : 's'}.` });
}
function aimPoint(ctx, input) {
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== 'number') return null;
  const me = ctx.self.worldFeetPosition ?? ctx.self.feetPosition;
  let eye = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }; if (Math.hypot(eye.x - me.x, eye.z - me.z) > 30) eye = { x: me.x, y: me.y + 1.6, z: me.z };
  const r = raycast(ctx, eye, { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 }, { distance: 160, ignoreEntities: [ctx.self.id], excludeTags: ['le-ghost', 'le-ring'] });
  return r?.position ?? null;
}
export function onInput(ctx, input) {
  const me = ctx.self; if (me.isLocal === false || !me.isEditor) return;
  const L = me.state.le ?? {}, v = S(ctx), d = input.actionData?.le;
  // AUTOFILL v2 #17: with the panel open, Y arms / disarms Autofill and Ctrl+Z takes back the last lit area
  if (L.open && input.pressed?.leArm) { if (L.phase === 'autofill') { clearRing(ctx); v.scan = null; return view(ctx, { phase: 'idle', note: 'Autofill put away (Y arms it again).' }); } return onInput(ctx, { actionData: { le: { op: 'autofill' } } }); }
  if (L.open && input.pressed?.leUndo && input.held?.leCtrl) { const ids = Object.keys(ctx.world.state.lightAreas ?? {}), last = L.last ?? S(ctx).lastId ?? ids.sort((x, y) => (ctx.world.state.lightAreas[y].at ?? 0) - (ctx.world.state.lightAreas[x].at ?? 0))[0]; return undoArea(ctx, last); }
  if (L.phase === 'tag') { // the ring follows your aim; J or Drop sets it
    const now = ctx.now();
    if (now - v.aimAt > 90) { v.aimAt = now; const p = aimPoint(ctx, input); if (p) { v.aim = p; drawRing(ctx, p, ftToM(L.rFt ?? LE.radiusFt.def), false); } }
    if (input.pressed?.leDrop && v.aim) return drop(ctx);
  }
  if (L.phase === 'autofill') { // the breathing ring follows your aim; left-click or J scans and lights it
    const now = ctx.now();
    if (now - v.aimAt > 90) { v.aimAt = now; const p = aimPoint(ctx, input); if (p) { v.aim = p; drawRing(ctx, p, ftToM(L.rFt ?? LE.radiusFt.def), false, true); } }
    if (input.pressed?.leDrop || input.pressed?.use) { const p = aimPoint(ctx, input); if (p) v.aim = p; if (v.aim) return scan(ctx); } // the click's own ray, never the last ring spot
  }
  if (!d || typeof d !== 'object') return;
  const op = d.op;
  if (op === 'open' && L.open) { v.scan = null; }
  if (op === 'open') { view(ctx, { open: !L.open, phase: L.open ? 'idle' : (L.phase ?? 'idle'), rFt: L.rFt ?? LE.radiusFt.def, dens: L.dens ?? 'natural' }); if (L.open) { clearGhosts(ctx); clearRing(ctx); } return; }
  if (op === 'close') { v.scan = null; clearGhosts(ctx); clearRing(ctx); v.picks = []; return view(ctx, { open: false, phase: 'idle', area: null, picks: [], sum: '', confirm: false }); }
  if (op === 'radius') { const ft = Math.max(LE.radiusFt.min, Math.min(LE.radiusFt.max, Math.round(+d.v || LE.radiusFt.def))); view(ctx, { rFt: ft }); if (L.area && (L.phase === 'scan' || L.phase === 'preview')) { const r = ftToM(ft); view(ctx, { area: { ...L.area, r } }); drawRing(ctx, L.area, r, true); propose(ctx); } return; }
  if (op === 'dens' && LE.density[d.v]) { view(ctx, { dens: d.v }); if (L.area && (L.phase === 'scan' || L.phase === 'preview')) propose(ctx); return; }
  if (op === 'kind' && LE.kinds[d.v]) { const k = { ...(L.kinds ?? {}) }; k[d.v] = k[d.v] === false; view(ctx, { kinds: k }); if (L.area && (L.phase === 'scan' || L.phase === 'preview')) propose(ctx); return; }
  if (op === 'autofill') { clearGhosts(ctx); clearRing(ctx); v.picks = []; v.scan = null; v.aim = null; v.aimAt = 0; sfx(ctx, 'arm'); return view(ctx, { phase: 'autofill', area: null, picks: [], sum: '', read: null, confirm: false, note: 'Left-click the ground (or J): the ring scans what stands in it and lights it. Y puts it away, Ctrl+Z undoes the last area.' }); }
  if (op === 'tag') { v.scan = null; clearGhosts(ctx); v.picks = []; return view(ctx, { phase: 'tag', area: null, picks: [], sum: '', confirm: false, note: 'Aim at the ground and press J to set the ring.' }); }
  if (op === 'drop' && v.aim) return drop(ctx);
  if (op === 'reroll' && L.area) { view(ctx, { area: { ...L.area, seed: (L.area.seed * 1103515245 + 12345) >>> 0 }, confirm: false }); return propose(ctx); }
  if (op === 'remove' && Number.isInteger(d.i) && v.picks[d.i]) { v.picks.splice(d.i, 1); const g = v.ghosts.splice(d.i, 1)[0]; if (g && ctx.getObject(g)) ctx.destroy(g); return view(ctx, { picks: v.picks.map((p) => ({ kind: p.kind, why: p.why })), sum: summary(v.picks), budget: budget(ctx, L.area, v.picks.length) }); }
  if (op === 'accept') return accept(ctx, !!L.confirm);
  if (op === 'undo') return undoArea(ctx, typeof d.id === 'string' ? d.id : L.last);
}
function drop(ctx) {
  const me = ctx.self, L = me.state.le ?? {}, v = S(ctx), p = v.aim, r = ftToM(L.rFt ?? LE.radiusFt.def);
  const seed = (Math.floor(ctx.random() * 2 ** 31)) >>> 0;
  view(ctx, { phase: 'scan', area: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), r, seed } });
  drawRing(ctx, p, r, true); propose(ctx);
}
// AUTOFILL: one click. The sweep runs out from the click, each thing it reads blips as the wave reaches it, the rule read names
// the place, JEV (DEN SYSTEMS 'JEV · area scan') gets JEV_TIMEOUT_MS to read it too, then the area recipe lights it in one commit.
function scan(ctx) {
  const me = ctx.self, L = me.state.le ?? {}, v = S(ctx), p = v.aim, r = ftToM(L.rFt ?? LE.radiusFt.def);
  const seed = (Math.floor(ctx.random() * 2 ** 31)) >>> 0, y = groundY(ctx, p.x, p.z, p.y);
  const a = { x: +p.x.toFixed(2), y: +y.toFixed(2), z: +p.z.toFixed(2), r, seed };
  const b = budget(ctx, a, 0);
  if (b.outside) return view(ctx, { note: `That spot is ${b.dHall} m from the hall, past the 0.25 mile valley.` });
  clearRing(ctx); drawRing(ctx, a, r, true);
  const sv = survey(ctx, a, r), read = readArea(sv), token = seed, SWEEP_S = sweepSecs(r);
  const jevOff = !jevOn(ctx);
  v.scan = { id: 'a' + Math.round(a.x) + '_' + Math.round(a.z) + '_' + (seed % 1000), token, a, sv, read, jevOff, jev: null, asked: !jevOff, sweepDone: false, settled: false };
  view(ctx, { phase: 'scanning', area: a, read: null, picks: [], sum: '', note: '', sweepEnd: ctx.now() + Math.round(SWEEP_S * 1000) });
  // the pulse
  const sw = ctx.spawn(sweepSpec(a, r, SWEEP_S)); if (sw) animate(ctx, sw, ...sweepTween(SWEEP_S));
  sfx(ctx, 'sweep', a);
  const things = [...sv.things].filter((t) => Math.hypot(t.x - a.x, t.z - a.z) <= r + 2).sort((m, n) => Math.hypot(m.x - a.x, m.z - a.z) - Math.hypot(n.x - a.x, n.z - a.z)).slice(0, MAX_BLIPS);
  things.forEach((t, i) => { const f = Math.min(1, Math.hypot(t.x - a.x, t.z - a.z) / r), at = (1 - Math.cbrt(1 - f)) * SWEEP_S; // easeOutCubic arrival
    ctx.after(Math.max(0.05, at), 'leBlip', { token, x: t.x, y: t.base ?? a.y, z: t.z, cls: t.cls, i }); });
  ctx.after(SWEEP_S, 'leSweepEnd', { token });
  if (!jevOff) { askAreaJev(ctx, summarizeForJev(sv, read), 'leJev', { token }); ctx.after(JEV_TIMEOUT_MS / 1000, 'leJevLate', { token }); }
}
const live = (ctx, token) => { const sc = S(ctx).scan; return sc && sc.token === token && !sc.settled ? sc : null; };
export function leBlip(ctx, q) {
  if (!live(ctx, q?.token)) return;
  ctx.spawn(blipSpec({ x: q.x, y: q.y, z: q.z }, q.cls));
  const B = LE_SOUNDS.blip; sfx(ctx, 'blip', q, Math.min(B.blipMax, 1 + q.i * B.blipStep));
}
export function leSweepEnd(ctx, q) { const sc = live(ctx, q?.token); if (!sc) return; sc.sweepDone = true; if (!sc.asked || sc.jev) settle(ctx); }
export function leJev(ctx, r, q) { const sc = live(ctx, q?.token); if (!sc) return; sc.jev = r ?? { ok: false }; if (sc.sweepDone) settle(ctx); }
export function leJevLate(ctx, q) { const sc = live(ctx, q?.token); if (!sc) return; sc.asked = false; if (sc.sweepDone) settle(ctx); }
function settle(ctx) {
  const v = S(ctx), sc = v.scan, me = ctx.self, L = me.state.le ?? {}; if (!sc || sc.settled) return; sc.settled = true;
  const a = sc.a, read = sc.jev ? mergeJev(sc.read, sc.jev, ((a.seed % 9973) / 9973)) : { ...sc.read, jev: null };
  const out = plan(sc.sv, { seed: a.seed, dens: L.dens ?? 'natural', kinds: L.kinds ?? {}, area: read.kind, densityMul: read.densityMul ?? 1 });
  let picks = place(ctx, a, out.picks).slice(0, LE.maxPerArea);
  const b = budget(ctx, a, picks.length); let note = out.note;
  if (b.inZone && b.over) { const room = Math.max(0, b.cap - b.zone); if (room < picks.length) { picks = picks.slice(0, room); note = room ? `The hall zone is near its ${b.cap}-lamp cap, so only ${picks.length} went in.` : `The hall zone is full (${b.zone}/${b.cap} lamps). Undo an area nearby to make room.`; } }
  ctx.spawn(doneSpec(a, a.r)); sfx(ctx, 'done', a);
  const shown = { kind: read.kind, label: read.label, confidence: read.confidence, counts: read.counts, why: read.why, jev: read.jev ?? null, jevOff: sc.jevOff };
  if (!picks.length) { clearRing(ctx); note = read.kind === 'wild' ? 'Wild ground - left dark on purpose.' : `Read it as ${read.label}. ${note}`; return view(ctx, { phase: 'done', last: null, read: shown, sum: '', note, budget: budget(ctx, a, 0) }); }
  const areas = ctx.world.state.lightAreas ?? {}, id = sc.id; // one id per scan, minted at the click: the panel, the lamps' tag and the area row all say the same name
  v.lastId = id; ctx.after(0.05, 'leCommit', { a, id, picks }); // PERF: the commit (~20-25 ms) runs on its own tick, not inside the sweep's end (measured 46 ms together)
  ctx.after(0.4, 'leIgnite', { x: a.x, y: a.y, z: a.z });
  clearRing(ctx);
  view(ctx, { phase: 'done', last: id, read: shown, sum: summary(picks), note, budget: budget(ctx, a, 0) });
}
export function leCommit(ctx, q) { if (q?.id && q.picks?.length) commitPicks(ctx, q.a, q.id, q.picks, ctx.world.state.lightAreas ?? {}); }
export function leFlare(ctx, q) { if (q?.id && q.picks?.length) flare(ctx, q.id, q.picks); }
export function leIgnite(ctx, q) { sfx(ctx, 'ignite', q); }
export function onSpawn(ctx) { if (ctx.self.isLocal !== false && ctx.self.state.le?.open) ctx.self.state.le = { ...ctx.self.state.le, open: false, phase: 'idle', area: null, picks: [] }; }
