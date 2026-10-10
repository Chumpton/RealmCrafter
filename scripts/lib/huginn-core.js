// HUGINN-DRONE L3 (docs/board/proposals/HUGINN-DRONE.md, WATCHED 5/5 2026-09-30): the scout raven. No collider (no-clip),
// flies a 50 m grid over the 402 m circle round the hall, 30 m over the ground, one move per 0.5 s. At each cell it reads
// the rows in reach a slice per step, flags what a script can truly see, and keeps docs/board/drone/HUGINN.md (sole writer).
// A pass with new findings files docs/board/proposals/HUGINN-R<k>.md for the watchers' fast lane (<= 1 an hour).
// JEV (lane 'huginn', the desk's Drone row): route mind per pass, pass diff, triage + plain fix per report, start-here per verdict.
import { isOn, PAUSE_NAP_S } from './data/systems.js';
import { HUG, FIX, SEE, FLY, SWEEP, OUTER, MOP, V3, FAR } from './data/huginn.js';
import { SEA, SEA_CELLS } from './data/huginn-sea.js';
// HUGINN-V3 (docs/board/proposals/HUGINN-V3.md, creator go 2026-10-01): pure helpers, proven by scripts/lib/huginn-v3.test.mjs
import { makePending, pickChecks, doublesOf, groupsOf, fixIds, guardDrop, openCount, hashOf, dayVerdict, shouldGround, approachOf } from './huginn-v3.js';
import { HALL } from './data/longhouse.js';
import { traverseCheck } from 'builtin/physics';
// HUGINN-SWEEP S3-S6 (docs/board/proposals/HUGINN-SWEEP.md): tiered speed/reveal/checks/wind, day rollover, frontier, red second pass, JEV picks + dawn recap. FLY.sweep false = the flight below exactly as before.
import { tierOf as fillTier, speedOf, revealOf, checksOf, windOf, ringOf, dayOf, frontier, ringCells, specks, route, routeLen, steer, mopNext } from './huginn-sweep.js';
import { allow, meter } from './jev-meter.js';
import { raycast } from 'builtin/physics';
// HUGINN-OUTER S3: near widens the engine's ~500 m update reach so he keeps flying the outer ring (to 804 m) while anyone is at the hall
export const updateSchedule = { every: { seconds: HUG.stepS }, near: { radius: OUTER.near } };

// ── the route ──────────────────────────────────────────────────────────────
const HOME_CELLS = [];
{ const n = Math.ceil(HUG.radius / HUG.cell);
  for (let gz = -n; gz <= n; gz++) {
    const row = [];
    for (let gx = -n; gx <= n; gx++) if (Math.hypot(gx * HUG.cell, gz * HUG.cell) <= HUG.radius) row.push({ gx, gz, x: HUG.center.x + gx * HUG.cell, z: HUG.center.z + gz * HUG.cell, name: `x${gx}z${gz}` });
    if ((gz + n) % 2) row.reverse(); // lawnmower
    HOME_CELLS.push(...row);
  } }
let CELLS = HOME_CELLS; // HUGINN-OUTER: the active ring's cells (home circle, or the 402-804 m ring)
const NEAR = HOME_CELLS.map((c, i) => [i, Math.hypot(c.gx, c.gz)]).filter(([, d]) => d <= 1.5).sort((a, b) => a[1] - b[1]).map(([i]) => i); // hall + yard
let BY_NAME = new Map(CELLS.map((c, i) => [c.name, i]));
const cellOf = (x, z) => BY_NAME.get(`x${Math.round((x - HUG.center.x) / HUG.cell)}z${Math.round((z - HUG.center.z) / HUG.cell)}`);

// ── module memory (rebuilt from the file on wake) ─────────────────────────
let F = null;            // Map key → finding
let order = null, scan = null, prev = new Map(), cur = new Map(), lastText = null;

function tierOf(kind, f) {
  const dh = Math.hypot(f.x - HUG.center.x, f.z - HUG.center.z);
  if (kind === 'RUNAWAY') return 1;
  if (kind === 'FATSTATE') return f.size >= HUG.fatP1 ? 1 : 2;
  if (kind === 'DENSE') return 2;
  if (kind === 'FLOAT' || kind === 'SUNK') return dh <= HUG.hallNear ? 2 : dh <= HUG.farCosmetic ? 3 : 4;
  if (kind === 'HIDDEN' || kind === 'LOUD') return 3;
  if (kind === 'BLOCKED') return 1;                     // V3: a door nobody can walk breaks play
  if (kind === 'STRANGER') return 2;
  if (kind === 'DOUBLE' || kind === 'SHADOWS') return dh <= HUG.farCosmetic ? 2 : 3;
  if (kind === 'DRIFT') return dh <= HUG.hallNear ? 2 : 3;
  if (kind === 'FARDRAW') return 4;
  return 4;
}
// ── the file: one line per finding ────────────────────────────────────────
// H14 · P2 · FLOAT · yard-torch-3 · x2z-1 (110,-48) · gap 0.82 m · pass 7 · SEE look | status: found | fix: … | why: … | verdict: … | rep: R3 | note: …
import { parseLine, clusterLine, TAILS } from './huginn-lines.js';
export { parseLine };
const clean = (s) => String(s ?? '').replace(/\s*[|·]\s*/g, ', ').replace(/\n/g, ' ').slice(0, 260);
const headOf = (f) => `H${f.n} · P${f.tier} · ${f.kind} · ${f.id} · ${f.cell} (${Math.round(f.x)},${Math.round(f.z)}) · ${clean(f.ev)} · pass ${f.pass} · SEE ${f.see}`;
// the stable part of a line (no pass number, no live measurement): what a watcher report quotes, so the next pass never breaks it
const keyOf = (f) => `H${f.n} · P${f.tier} · ${f.kind} · ${f.id} · ${f.cell} (${Math.round(f.x)},${Math.round(f.z)})`;
const lineOf = (f) => [headOf(f), ...TAILS.filter((t) => f[t]).map((t) => `${t}: ${clean(f[t])}`)].join(' | ');
function load(ctx) {
  F = new Map();
  const text = ctx.files.read(HUG.file) ?? '';
  for (const l of text.split('\n')) { const f = parseLine(l); if (f) F.set(f.key, f); }
  lastText = text;
  if (V3.on) { const r = fixIds([...F.values()], ctx.self.state.seq ?? 0); if (r.seq !== (ctx.self.state.seq ?? 0)) ctx.self.state.seq = r.seq; } // S7: H numbers never repeat
}
const OPEN = new Set(['found', 'watched', 'fixing']);
function writeFile(ctx) {
  const s = ctx.self.state;
  // the file is the authority for what Savi or the watchers changed by hand (status, note, verdict), unless the drone moved it
  const text = ctx.files.read(HUG.file) ?? '';
  if (text !== lastText) for (const l of text.split('\n')) { const g = parseLine(l); const f = g && F.get(g.key); if (f && !f.dMoved) { f.status = g.status; f.note = g.note; f.verdict = g.verdict; } }
  const marks = ctx.getObject('huginn-board')?.state?.marks ?? {};
  for (const [k, mk] of Object.entries(marks)) { const f = F.get(k); if (!f) continue;
    if (mk.dismiss && f.status !== 'rejected') { f.status = 'rejected'; f.verdict = 'creator dismissed (false alarm)'; }
    if (mk.pin) { f.tier = 1; f.note = 'ISSUE: pinned #1 by the creator'; } }
  let all = [...F.values()];
  const rank = (f) => (OPEN.has(f.status) ? 0 : 10) + f.tier;
  all.sort((a, b) => rank(a) - rank(b) || b.n - a.n);
  while (all.length > HUG.maxLines) { // drop fixed/rejected oldest first, then the oldest P4; an open P1 never leaves
    let i = all.findLastIndex((f) => !OPEN.has(f.status)); if (i < 0) i = all.findLastIndex((f) => f.tier >= 4); if (i < 0) i = all.findLastIndex((f) => f.tier > 1); if (i < 0) break;
    F.delete(all[i].key); all.splice(i, 1);
  }
  const open = all.filter((f) => OPEN.has(f.status)).length, p1 = all.filter((f) => f.tier === 1 && OPEN.has(f.status)).length;
  const out = [`# HUGINN · the scout raven's report (scripts/huginn.js writes this; Savi edits status/note by hand: status found|watched|fixing|fixed|rejected)`,
    `> pass ${s.pass ?? 0} · ${all.length} findings · ${open} open · P1 ${p1} · a pass is ${CELLS.length} cells of ${HUG.cell} m inside ${HUG.radius} m of the hall`,
    s.recap ? `> ${clean(s.recap).slice(0, 160)}` : null,
    s.startHere ? `> START HERE (JEV): ${clean(s.startHere)}` : null,
    s.diff ? `> LAST PASS (JEV): ${clean(s.diff)}` : null,
    '', ...(s.clusters ?? []).map(clusterLine), ...all.map(lineOf), ''].filter((l) => l != null).join('\n');
  for (const f of all) f.dMoved = false;
  if (out === text) { lastText = text; return; }
  if (V3.on && !guardDrop(openCount(text, parseLine, OPEN), open, all.length, HUG.maxLines)) { ctx.log('HUGINN-V3 S7: refused a write that drops > ' + V3.dropMax + ' open lines', { before: openCount(text, parseLine, OPEN), after: open }); load(ctx); return; }
  ctx.files.write(HUG.file, out); lastText = out;
}
function find(ctx, kind, id, c, x, z, ev, extra = {}) {
  const key = kind + ':' + id, s = ctx.self.state; let f = F.get(key);
  const t = { x, z, size: extra.size ?? 0 };
  if (f) { f.ev = ev; f.x = x; f.z = z; f.pass = s.pass ?? 0; f.seen = s.pass;
    if (!f.note?.startsWith('ISSUE')) f.tier = Math.min(f.tier, tierOf(kind, t));
    if (f.status === 'fixed') { f.status = 'found'; f.verdict = 'came back after a fix'; f.rep = null; f.dMoved = true; }
    return; }
  if (V3.on && tierOf(kind, t) >= 3 && !extra.sure && !pend.see(key, s.pass ?? 0, ctx.now(), x, z, tierOf(kind, t))) return; // S3: P3/P4 need a second sighting
  s.seq = (s.seq ?? 0) + 1; newAt = ctx.now();
  F.set(key, { key, n: s.seq, tier: tierOf(kind, t), kind, id, cell: c.name, x, z, ev, pass: s.pass ?? 0, see: SEE[kind], status: 'found', fix: FIX[kind], seen: s.pass, dMoved: true });
}

// ── HUGINN-V3 module memory ────────────────────────────────────────────────
const pend = makePending();            // S3: key → first sighting (≤ 200, 3 passes)
const lastChk = new Map();             // S4: id → pass last checked (≤ 2000)
const driftHome = new Map();           // S2 DRIFT: dynamic id → where he first saw it (≤ 2000)
let SCENE_IDS = null, BASE = null;     // S2 STRANGER: ids the scene files place; per-cell count of unplaced roots (persisted in V3.baseFile)
function sceneIds(ctx) {
  if (SCENE_IDS) return SCENE_IDS; SCENE_IDS = new Set();
  for (const f of (ctx.world?.files ?? []).filter((x) => /^places\/main\/cells\/.+\.scene$/.test(x))) for (const l of (ctx.files.read(f) ?? '').split('\n')) { const m = /^([^\s#][^:]*):\s*$/.exec(l); if (m) SCENE_IDS.add(m[1].trim()); }
  return SCENE_IDS;
}
function baseLoad(ctx) { // R3a: the baseline survives a restart, so a mid-day restart never calls the whole den a stranger
  if (BASE) return BASE; BASE = new Map();
  if ((ctx.world?.files ?? []).includes(V3.baseFile)) for (const l of (ctx.files.read(V3.baseFile) ?? '').split('\n')) { const m = /^(\S+) (\d+)$/.exec(l); if (m) BASE.set(m[1], +m[2]); }
  return BASE;
}
let baseDirty = false;
function baseSave(ctx) { if (!baseDirty) return; baseDirty = false; ctx.files.write(V3.baseFile, ['# HUGINN-V3 stranger baseline: unplaced root rows first counted per cell (scripts/huginn.js writes; delete a line to re-baseline that cell)', ...[...BASE].map(([c, n]) => `${c} ${n}`), ''].join('\n')); }
const yawOf = (r) => { let q; try { q = r.rotation; } catch { return 0; } if (typeof q === 'number') return q; if (!q) return 0; if (q.yaw != null) return q.yaw; if (q.w != null) return Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.z * q.z)) * 180 / Math.PI; return 0; };
// S2 BLOCKED: once a pass when the hall cell finishes, walk each hall door from 1.5 m inside to doorOut m outside; door leaves never count
const DIR = { '-z': [0, -1], '+z': [0, 1], '-x': [-1, 0], '+x': [1, 0] };
function doorsCheck(ctx, c) {
  // watched E2: only a SHUT leaf is a door, not a wall; an open leaf that still blocks (jammed) posts BLOCKED
  const leaves = ctx.query({ tags: ['door-hinge'], center: { x: HALL.center?.x ?? 10, y: 24, z: HALL.center?.z ?? 1.5 }, radius: 40 }).filter((r) => !r.state?.open).flatMap((r) => [r.id, r.state?.leafId].filter(Boolean));
  for (const [name, d] of Object.entries(HALL.doors ?? {})) { const v = DIR[d.faces]; if (!v) continue;
    const a = { x: d.x - v[0] * 1.5, y: 24.05, z: d.z - v[1] * 1.5 }, b = { x: d.x + v[0] * V3.doorOut, y: groundAt(ctx, d.x + v[0] * V3.doorOut, d.z + v[1] * V3.doorOut) + 0.05, z: d.z + v[1] * V3.doorOut };
    let t; try { t = traverseCheck(ctx, a, b, { ignoreEntities: leaves }); } catch { continue; }
    if (!t || t.traversable !== false || /load/i.test(String(t.reason ?? ''))) continue;
    const by = String(t.blockedBy ?? t.detail?.id ?? ''); if (by && leaves.includes(by)) continue; // a closed leaf is a door, not a wall
    find(ctx, 'BLOCKED', 'door-' + name, c, d.x, d.z, `the ${name} door cannot be walked: ${clean(t.reason ?? 'blocked')}${by ? ' by ' + by : ''}`, { sure: true });
    scan && scan.hit.add('BLOCKED:door-' + name); doorHit.add('BLOCKED:door-' + name);
  }
}
let doorHit = new Set();

// ── flying and scanning ───────────────────────────────────────────────────
function groundAt(ctx, x, z) { return ctx.place.terrain?.heightAt?.(x, z) ?? 20; }
function passOrder(ctx) {
  const first = (ctx.self.state.first ?? []).filter((i) => i >= 0 && i < CELLS.length);
  const lead = [...new Set([...(RING === 'inner' ? NEAR : []), ...first])];
  const seen = new Set(lead);
  return [...lead, ...CELLS.map((_, i) => i).filter((i) => !seen.has(i))];
}
import { overlapPoint } from 'builtin/physics';
import { BEACON, HIDDEN, PILLAR, RUNE } from './data/huginn-beacon.js';
let seenAt = 0;
// F11: the beacon. Inside a collider (noclip through a roof or a hill) the rainbow and pillar go, a soft glow stays, and a LAST SEEN rune
// stands where he went in; out again, the rune fades and the rainbow is back. Checked once a second, written only on a change.
function beacon(ctx) {
  const me = ctx.self, s = me.state, now = ctx.now();
  if (!ctx.getObject('huginn-drone/pillar')) { ctx.spawn('pillar', { ...PILLAR, parent: me.id }); me.fx = { script: BEACON }; s.hidden = false; }
  if (now - seenAt < 1000) return; seenAt = now;
  const p = me.feetPosition, o = overlapPoint(ctx, { x: p.x, y: p.y + 0.5, z: p.z });
  const inside = !!(o?.terrain || (o?.objects ?? []).some((x) => !String(x.id ?? x).startsWith('huginn')));
  if (inside === !!s.hidden) return;
  s.hidden = inside; me.fx = { script: inside ? HIDDEN : BEACON };
  const pl = ctx.getObject('huginn-drone/pillar'); if (pl) pl.visible = !inside;
  if (inside) { s.lastSeen = { x: p.x, y: p.y, z: p.z }; if (ctx.getObject('huginn-lastseen')) ctx.destroy('huginn-lastseen'); ctx.spawn('huginn-lastseen', { ...RUNE(p), lifetime: 600 }); }
  else { const r = ctx.getObject('huginn-lastseen'); if (r) r.lifetime = 3; }
}

// ── HUGINN-FLIGHT: where next (F1 JEV legs, F2 wind, F5 fog, F9 heat, F10 hunt) ──
let fog = null, fogIn = 0, fogSeen = 0, fogSaved = 0, newAt = 0, passSeen = new Set(), lastCell = -1;
let tierNow = 0, frontAt = 0, pin = null; // HUGINN-SWEEP: the live tier (from fogSeen/fogIn), the last frontier refresh, JEV's pinned frontier
let FG = FLY.fogN, FT = FLY.fogTile, FOX = HUG.center.x - FG * FT / 2, FOZ = HUG.center.z - FG * FT / 2;
// HUGINN-OUTER S3: two rings, one active. inner = the home circle (s.fog, 10 m tiles, wiped daily); outer = 402-804 m (s.fogO, 20 m tiles, kept across days)
let RING = 'inner', RMIN = -1, RMAX = HUG.radius, FOGK = 'fog', PCTK = 'fogPct';
const RINGS = { inner: { cells: HOME_CELLS, FG: FLY.fogN, FT: FLY.fogTile, rMin: -1, rMax: HUG.radius, fogK: 'fog', pctK: 'fogPct', sea: FAR.on ? SEA.inner : '' } };
// HUGINN-FAR: deep-sea cells leave the outer/far flight lists (built once, so indices stay fixed for the ring's life); sea tiles leave the fog count
const landOnly = (cells, k) => { if (!FAR.on) return cells; const sea = new Set(SEA_CELLS[k] ?? []); return cells.filter((c) => !sea.has(c.name)); };
let SEAB = null;
function useRing(name) {
  if (name === 'outer' && !RINGS.outer) RINGS.outer = { cells: landOnly(ringCells(OUTER.rMin, OUTER.rMax, HUG.cell, HUG.center), 'outer'), FG: OUTER.fogN, FT: OUTER.fogTile, rMin: OUTER.rMin, rMax: OUTER.rMax, fogK: 'fogO', pctK: 'fogOPct', sea: FAR.on ? SEA.outer : '' };
  if (name === 'far' && !RINGS.far) RINGS.far = { cells: landOnly(ringCells(FAR.rMin, FAR.rMax, HUG.cell, HUG.center), 'far'), FG: FAR.fogN, FT: FAR.fogTile, rMin: FAR.rMin, rMax: FAR.rMax, fogK: 'fogF', pctK: 'fogFPct', sea: SEA.far };
  const r = RINGS[name]; RING = name; SEAB = r.sea ? dec(r.sea, Math.ceil(r.FG * r.FG / 8)) : null;
  CELLS = r.cells; BY_NAME = new Map(CELLS.map((c, i) => [c.name, i]));
  FG = r.FG; FT = r.FT; FOX = HUG.center.x - FG * FT / 2; FOZ = HUG.center.z - FG * FT / 2; RMIN = r.rMin; RMAX = r.rMax; FOGK = r.fogK; PCTK = r.pctK;
  fog = null; scan = null; order = null; prev = new Map(); cur = new Map(); passSeen = new Set(); lastCell = -1; pin = null; frontAt = 0;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function enc(b) { let o = ''; for (let i = 0; i < b.length; i += 3) { const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0); o += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63]; } return o; }
function dec(str, len) { const b = new Uint8Array(len); let j = 0; for (let i = 0; i + 3 < str.length + 1 && j < len; i += 4) { const n = (B64.indexOf(str[i]) << 18) | (B64.indexOf(str[i + 1]) << 12) | (B64.indexOf(str[i + 2]) << 6) | B64.indexOf(str[i + 3]); b[j++] = n >> 16 & 255; if (j < len) b[j++] = n >> 8 & 255; if (j < len) b[j++] = n & 255; } return b; }
const inCircle = (i, j) => { const d = Math.hypot(FOX + (i + 0.5) * FT - HUG.center.x, FOZ + (j + 0.5) * FT - HUG.center.z); if (!(d > RMIN && d <= RMAX)) return false; if (SEAB) { const k = j * FG + i; if (SEAB[k >> 3] >> (k & 7) & 1) return false; } return true; };
function fogLoad(ctx) {
  fog = dec(ctx.self.state[FOGK] ?? '', Math.ceil(FG * FG / 8)); fogIn = 0; fogSeen = 0;
  for (let j = 0; j < FG; j++) for (let i = 0; i < FG; i++) if (inCircle(i, j)) { fogIn++; const k = j * FG + i; if (fog[k >> 3] >> (k & 7) & 1) fogSeen++; }
}
function stamp(x, z) {
  const R = FAR.on ? (RING === 'far' ? FAR.reveal : Math.max(FAR.trail, revealOf(tierNow))) : revealOf(tierNow), r = Math.min(V3.on ? V3.revealCap : 3, Math.ceil(R / FT)), ci = Math.floor((x - FOX) / FT), cj = Math.floor((z - FOZ) / FT); // hard cap r <= 3: 7×7 = 49 checks max
  for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) {
    if (i < 0 || j < 0 || i >= FG || j >= FG || !inCircle(i, j)) continue;
    if (Math.hypot(FOX + (i + 0.5) * FT - x, FOZ + (j + 0.5) * FT - z) > R) continue;
    const k = j * FG + i; if (!(fog[k >> 3] >> (k & 7) & 1)) { fog[k >> 3] |= 1 << (k & 7); fogSeen++; }
  }
}
// heat: open findings weigh 5 - tier each (P1 = 4); a cell's heat is its share of the hottest, 0..100
function heatOf() {
  const w = new Map(); for (const f of F.values()) if (OPEN.has(f.status)) w.set(f.cell, (w.get(f.cell) ?? 0) + (5 - f.tier));
  const mx = Math.max(1, ...w.values()), out = {};
  for (const [c, v] of w) out[c] = { pct: Math.round(v / mx * 100), w: v };
  return out;
}
function saveMap(ctx, force) {
  const s = ctx.self.state, now = ctx.now();
  if (!force && now - fogSaved < FLY.fogSaveMs) return; fogSaved = now;
  const pct = Math.round(fogSeen / fogIn * 1000) / 10, fs = enc(fog);
  if (s[FOGK] !== fs) s[FOGK] = fs;
  if (s[PCTK] !== pct) s[PCTK] = pct;
  const h = heatOf(), hs = Object.fromEntries(Object.entries(h).map(([c, v]) => [c, v.pct]));
  if (JSON.stringify(hs) !== JSON.stringify(s.heat ?? {})) s.heat = hs;
  if (V3.on) { const pd = pend.dots(); if (JSON.stringify(pd) !== JSON.stringify(s.pend ?? [])) s.pend = pd; scoreTick(ctx); }
  if (FLY.sweep) { const d = dotsOf(openNow(ctx)); if (JSON.stringify(d) !== JSON.stringify(s.dots ?? null)) s.dots = d; } // SAGA: a fresh read every save, no ghost dots
}
// ── HUGINN-SWEEP: the open findings, read FRESH from the board file at this moment (never a cached copy) ──
function openNow(ctx) {
  const text = ctx.files.read(HUG.file) ?? '', out = [];
  for (const l of text.split('\n')) { const g = parseLine(l); if (!g || !OPEN.has(g.status)) continue;
    const f = F?.get(g.key); if (f?.dMoved && !OPEN.has(f.status)) continue; // he saw it fixed this tick, not written yet
    out.push(g); }
  return out.sort((a, b) => a.tier - b.tier || b.n - a.n);
}
const dotsOf = (open) => open.slice(0, SWEEP.dotsMax).map((f) => [Math.round(f.x), Math.round(f.z), Math.max(1, Math.min(4, f.tier | 0))]);
const darkAt = (x, z) => { const i = Math.floor((x - FOX) / FT), j = Math.floor((z - FOZ) / FT); if (i < 0 || j < 0 || i >= FG || j >= FG) return false; const k = j * FG + i; return !(fog[k >> 3] >> (k & 7) & 1); };
const FALL = 'frontier: biggest dark, nearest';
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
// S3: the day and the tier, once a tick. s.day absent = ADOPT (keep fog, pct, dots); present and different = roll in this one tick
function sweepStep(ctx) {
  if (!FLY.sweep) { tierNow = 0; return; }
  const s = ctx.self.state, now = ctx.now(), today = dayOf(now);
  if (s.day == null) s.day = today;
  else if (s.day !== today) rollDay(ctx, today);
  const pctNow = fogSeen / Math.max(1, fogIn) * 100;
  if (OUTER.on && RING === 'inner' && s.ring !== 'roost' && pctNow >= 100) { enterOuter(ctx); return; } // HUGINN-OUTER: home full → out
  if (OUTER.on && RING === 'outer' && pctNow >= 100) { if (FAR.on) enterFar(ctx); else enterRoost(ctx); return; }
  if (FAR.on && RING === 'far' && pctNow >= 100) { enterRoost(ctx); return; }                          // HUGINN-FAR: all three full → roost                        // ring full → roost
  const t = fillTier(pctNow); tierNow = t;
  if (s.tier !== t) { const cross = s.tier != null && t > s.tier; s.tier = t; s.tierAt = now;
    if (t >= 1) refreshFront(ctx, cross); else { pin = null; if (s.front) s.front = null; } return; }
  if (t >= 1 && now - frontAt > 20000) refreshFront(ctx, false);
}
// HUGINN-OUTER S3: the ring swaps. Each saves the ring it leaves (forced), loads the one it enters, and resets the flight's per-ring memory
function enterOuter(ctx) {
  const s = ctx.self.state, now = ctx.now();
  { const min = Math.max(1, Math.round((now - (s.day ?? dayOf(now)) * 86400000) / 60000)), best = s.homeDone?.best; // HOME 100%: today's time, the record
    s.homeDone = { min, at: now, day: s.day, best: best == null ? min : Math.min(best, min), rec: best == null || min < best, prev: best ?? null }; }
  saveMap(ctx, true); useRing('outer', ctx); fogLoad(ctx);
  s.ring = 'outer'; s.ringAt = now; s.to = null; s.front = null; s.second = null; s.hunt = null; s.mop = null;
  tierNow = fillTier(fogSeen / Math.max(1, fogIn) * 100); s.tier = tierNow; s.tierAt = now; saveMap(ctx, true);
  if (tierNow >= 1) refreshFront(ctx, false);
}
// HUGINN-FAR: outer full → the far ring (804-2012 m), same swap as enterOuter
function enterFar(ctx) {
  const s = ctx.self.state, now = ctx.now();
  saveMap(ctx, true); useRing('far', ctx); fogLoad(ctx);
  s.ring = 'far'; s.ringAt = now; s.to = null; s.front = null; s.second = null; s.hunt = null; s.mop = null;
  tierNow = fillTier(fogSeen / Math.max(1, fogIn) * 100); s.tier = tierNow; s.tierAt = now; saveMap(ctx, true);
  if (tierNow >= 1) refreshFront(ctx, false);
}
function enterRoost(ctx) {
  const s = ctx.self.state, now = ctx.now();
  if (FAR.on) { const min = Math.max(1, Math.round((now - (s.day ?? dayOf(now)) * 86400000) / 60000)), best = s.allDone?.best; // all 100 % today
    s.allDone = { min, at: now, day: s.day, best: best == null ? min : Math.min(best, min) }; }
  saveMap(ctx, true); s.outerLaps = (s.outerLaps ?? 0) + 1; s.fogO = ''; s.fogOPct = 0; if (FAR.on) { s.fogF = ''; s.fogFPct = 0; } // a finished lap: tomorrow's outer starts a fresh one
  useRing('inner', ctx); fogLoad(ctx);
  s.ring = 'roost'; s.ringAt = now; s.roostNext = now; s.to = null; s.front = null; s.second = null; s.hunt = null; s.mop = null;
  tierNow = fillTier(fogSeen / Math.max(1, fogIn) * 100); s.tier = tierNow; s.tierAt = now;
}
// roost: on the ridge; every roostEveryMs one red second pass round the nearest open P1 (a hunt still wins). null = stay perched
function roostPick(ctx) {
  const s = ctx.self.state, now = ctx.now();
  if (s.hunt || s.second) return pickNext(ctx);
  if (now < (s.roostNext ?? 0)) return null;
  s.roostNext = now + OUTER.roostEveryMs;
  return secondPick(ctx, s.cool ?? {}, now) ?? null;
}
function perch(ctx) {
  const me = ctx.self, tgt = { x: OUTER.perch.x, y: groundAt(ctx, OUTER.perch.x, OUTER.perch.z) + OUTER.perch.up, z: OUTER.perch.z };
  if (fly(ctx, tgt)) { const p = me.feetPosition; if (Math.abs(p.x - tgt.x) + Math.abs(p.y - tgt.y) + Math.abs(p.z - tgt.z) > 0.01) me.feetPosition = tgt; if (me.state.spd !== 0) me.state.spd = 0; }
}
function rollDay(ctx, today) {
  const s = ctx.self.state, now = ctx.now(), yday = s.day;
  const away = RING !== 'inner' || s.ring === 'roost'; // he finished home yesterday: inner was 100 %
  if (RING !== 'inner') { saveMap(ctx, true); useRing('inner', ctx); fogLoad(ctx); } // the outer fog is saved and kept
  if (FAR.on) { s.fogO = ''; s.fogOPct = 0; s.fogF = ''; s.fogFPct = 0; } // HUGINN-FAR: a new day is a fresh 100 % sweep of all three rings
  if (s.ring !== 'inner') { s.ring = 'inner'; s.ringAt = now; s.to = null; s.hunt = null; }
  const fillPct = away ? 100 : Math.round(fogSeen / Math.max(1, fogIn) * 1000) / 10, tierMax = s.tier ?? 0; // captured BEFORE the wipe
  const fillMin = s.tier === 6 && s.tierAt ? Math.max(0, Math.round((s.tierAt - yday * 86400000) / 60000)) : null;
  if (V3.on) scoreDay(ctx, yday);
  const open = openNow(ctx);              // 1. prune: fresh read of the board, only open findings keep a dot
  s.dots = dotsOf(open);
  fog.fill(0); fogSeen = 0;               // 2. wipe, same tick
  s.fog = ''; s.fogPct = 0; s.tier = 0; s.tierAt = now; tierNow = 0; s.day = today; s.front = null; s.second = null; s.mop = null; pin = null; frontAt = 0;
  saveMap(ctx, true);                     // 3. forced save: no empty fog beside an old percent
  if (s.recapDay !== yday) { s.recapDay = yday; askRecap(ctx, { fillPct, fillMin, tierMax, open, outerPct: s.fogOPct ?? 0, laps: s.outerLaps ?? 0 }, yday); }
}
// S4: the frontier. Pure score always stands (JEV never stalls him); JEV's pick holds until its tile is lit
function refreshFront(ctx, askIt) {
  const s = ctx.self.state, p = ctx.self.feetPosition; frontAt = ctx.now();
  if (!pin && s.front && s.front.why !== FALL && darkAt(s.front.x, s.front.z)) pin = s.front; // a restart keeps JEV's pick
  if (!askIt && pin && darkAt(pin.x, pin.z)) return;
  pin = null;
  const fr = frontier(fog, FG, FT, { x: FOX, z: FOZ }, p, RING !== 'inner' || SEAB ? inCircle : undefined);
  if (!fr) { if (s.front) s.front = null; return; }
  const f0 = { x: Math.round(fr.x), z: Math.round(fr.z), why: FALL };
  if (JSON.stringify(s.front) !== JSON.stringify(f0)) s.front = f0;
  if (askIt && fr.top.length >= 2) askFront(ctx, fr);
}
function askFront(ctx, fr) {
  if (V3.on && (ctx.self.state.grounded ?? -1) >= dayOf(ctx.now())) return; // S6: three lost days running, the code flies alone today
  const s = ctx.self.state, p = ctx.self.feetPosition, w = ctx.place.state.wind ?? {}, tw = (w.toward ?? 0) * Math.PI / 180;
  const wvx = -Math.sin(tw) * (w.speed ?? 0), wvz = -Math.cos(tw) * (w.speed ?? 0), reds = (s.dots ?? []).filter((d) => d[2] === 1);
  const options = fr.top.map((o, i) => { const dx = o.x - p.x, dz = o.z - p.z, dl = Math.hypot(dx, dz) || 1, deg = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
    return { i, size: o.size, dist: Math.round(o.dist), wind: Math.round((wvx * dx + wvz * dz) / dl * windOf(tierNow) * 10) / 10,
      reds: reds.filter((d) => Math.hypot(d[0] - o.x, d[1] - o.z) <= 60).length, bearing: COMPASS[Math.round(deg / 45) % 8] }; });
  ask(ctx, 'onFront', { tier: s.tier, day: s.day, opts: fr.top.map((o) => ({ x: Math.round(o.x), z: Math.round(o.z) })) },
    { task: 'Pick which unexplored patch the scout raven HUGINN flies to next. He fills a fog map of a 402 m circle round the hall once a day; he has just reached a new fill tier. Each option is a dark (unscanned) cluster: size in 12 m fog tiles, distance from him in metres, the wind along his path in m/s (positive = tailwind, negative = headwind), and how many open red (P1) findings sit within 60 m of it. Prefer big and close; a red near a cluster is a reason to go (he rechecks around reds); headwind matters less at higher tiers. Answer JSON only: pick = 0, 1 or 2 (the option\'s index), why = one line, at most 80 characters, in his terse raven voice.',
      tier: s.tier, fillPct: Math.round(fogSeen / Math.max(1, fogIn) * 1000) / 10, here: CELLS[cellOf(p.x, p.z) ?? 0]?.name, options },
    { type: 'object', properties: { pick: { type: 'integer', enum: [0, 1, 2] }, why: { type: 'string', maxLength: 80 } }, required: ['pick', 'why'] });
}
export function onFront(ctx, r, p) {
  const s = ctx.self.state, d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!p || p.tier !== s.tier || p.day !== s.day) return; // a stale answer from an older tier or day
  const i = d && Number.isInteger(d.pick) && d.pick >= 0 && d.pick < (p.opts?.length ?? 0) ? d.pick : -1;
  if (i < 0) { meter(ctx, HUG.lane, 'fail'); return; } // option 0 (the pure score) already flies
  const o = p.opts[i]; if (fog && !darkAt(o.x, o.z)) return;
  pin = { x: o.x, z: o.z, why: String(d.why ?? '').replace(/\s+/g, ' ').slice(0, 80) || 'frontier' };
  s.front = pin; frontAt = ctx.now();
}
// S6b: the dawn recap, one card line; the code line stands first, JEV's replaces it if he answers
function askRecap(ctx, inp, yday) {
  const s = ctx.self.state, c = [0, 0, 0, 0, 0];
  for (const f of inp.open) c[Math.max(1, Math.min(4, f.tier | 0))]++;
  const worst = inp.open.slice(0, 3).map((f) => ({ h: 'H' + f.n, tier: 'P' + f.tier, kind: f.kind, id: f.id, cell: f.cell })), w0 = worst[0];
  s.recap = clean(`DAWN: ${inp.fillPct}% swept${inp.fillMin != null ? `, full in ${inp.fillMin} min` : ''}. Outer ${inp.outerPct}%${inp.laps ? `, ${inp.laps} lap${inp.laps > 1 ? 's' : ''}` : ''}. Open: R${c[1]} Y${c[2]} G${c[3]} B${c[4]}. Worst: ${w0 ? `${w0.h} ${w0.kind} ${w0.id}` : 'none'}.`).slice(0, 160);
  writeFile(ctx);
  ask(ctx, 'onRecap', { day: yday }, { task: "Write HUGINN's dawn recap: one card line for the bug board, at most 160 characters, in his voice: a terse raven, short clipped sentences, plain words, no emoji, no hashtags, no exclamation marks. Say how far yesterday's sweep got (fill percent, and the minutes to full if he reached it), the count of open findings by colour (red P1, yellow P2, green P3, blue P4), and name the single worst one by its H number and what it is. If no reds, say so. Do not invent findings, numbers or dates; use only what is given. Answer JSON only: line.",
    fillPct: inp.fillPct, fillMin: inp.fillMin, tierMax: inp.tierMax, outerRingPct: inp.outerPct, outerLapsDone: inp.laps, open: { red: c[1], yellow: c[2], green: c[3], blue: c[4] }, worst },
    { type: 'object', properties: { line: { type: 'string', maxLength: 160 } }, required: ['line'] });
}
export function onRecap(ctx, r, p) {
  const s = ctx.self.state, d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!d?.line) { meter(ctx, HUG.lane, 'fail'); return; }
  if (p?.day !== s.recapDay) return;
  s.recap = ('DAWN (JEV): ' + clean(d.line)).slice(0, 160);
  if (!F) load(ctx); writeFile(ctx);
}
// S5: the red second pass: a 5×5 ring of cells round the nearest open P1, never while a hunt runs
function secondPick(ctx, cool, now) {
  const s = ctx.self.state;
  if (s.second) { const q = s.second;
    if (q.k >= q.ring.length || now - q.at > SWEEP.secondMaxMs) { // its own cap: one ring-2 pass measures 112.5 s
      s.cool = { ...Object.fromEntries(Object.entries(s.cool ?? {}).filter(([, t]) => t > now)), [q.cell]: now + FLY.huntCoolMs }; s.second = null; return null; }
    let k = q.k; while (k < q.ring.length) { const i = BY_NAME.get(q.ring[k++]); if (i != null) { s.second = { ...q, k }; return i; } }
    s.second = { ...q, k }; return null;
  }
  if (fogSeen / Math.max(1, fogIn) * 100 < SWEEP.redPullAt) return null;
  if (s.ring === 'roost' && now > (s.roostNext ?? 0) - OUTER.roostEveryMs + 1000) return null; // roost: only the pass roostPick just opened
  const p = ctx.self.feetPosition; let best = null, bd = 1e9;
  for (const d of s.dots ?? []) { if (d[2] !== 1) continue; const i = cellOf(d[0], d[1]); if (i == null || (cool[CELLS[i].name] ?? 0) > now) continue;
    const dd = Math.hypot(d[0] - p.x, d[1] - p.z); if (dd < bd) { bd = dd; best = CELLS[i]; } }
  if (!best) return null;
  const ring = ringOf(best.gx, best.gz, SWEEP.redRing);
  s.second = { cell: best.name, at: now, ring, k: 0 };
  return secondPick(ctx, cool, now);
}
function pickNext(ctx) {
  const s = ctx.self.state, now = ctx.now(), p = ctx.self.feetPosition, here = cellOf(p.x, p.z) ?? 0, hc = CELLS[here];
  const heat = heatOf(), cool = s.cool ?? {};
  if (s.hunt && s.second) s.second = null; // a hunt always wins; the two never run at once
  // F10: the hunt. A hot zone draws him in at max speed; 10 s with no new finding and he moves on
  if (s.hunt) {
    const quiet = now - Math.max(s.hunt.at, newAt), long = now - s.hunt.at;
    if (quiet > FLY.huntQuietMs || long > FLY.huntMaxMs) { s.cool = { ...Object.fromEntries(Object.entries(cool).filter(([, t]) => t > now)), [s.hunt.cell]: now + FLY.huntCoolMs }; s.hunt = null; }
    else { const c0 = CELLS[BY_NAME.get(s.hunt.cell)], ring = [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
      for (let k = 0; k < 9; k++) { const [a, b] = ring[(s.hunt.k = ((s.hunt.k ?? 0) + 1) % 9)]; const i = BY_NAME.get(`x${c0.gx + a}z${c0.gz + b}`); if (i != null && i !== lastCell) return i; } }
  }
  if (!s.hunt && !s.mop) { // MOP-UP: no heat hunts while mopping (a P1 cuts in from mopFly)
    const hot = Object.entries(heat).filter(([c, v]) => v.pct >= FLY.huntHeat && v.w >= 3 && !((cool[c] ?? 0) > now) && BY_NAME.has(c)).sort((a, b) => b[1].w - a[1].w)[0];
    if (hot) { if (s.second) s.second = null; s.hunt = { cell: hot[0], at: now, k: 0 }; return BY_NAME.get(hot[0]); }
  }
  if (FLY.sweep && !s.hunt && !s.mop) { const i2 = secondPick(ctx, cool, now); if (i2 != null) return i2; }
  // F1: the JEV leg's heading, scored against fog, heat, this pass and a little chance
  if (!s.leg || now > s.leg.until) newLeg(ctx);
  let hd = (s.leg.h ?? 0) * Math.PI / 180, fx = -Math.sin(hd), fz = -Math.cos(hd); const first = new Set(s.first ?? []);
  const fr = FLY.sweep && tierNow >= 1 ? s.front : null; // S4: at tier >= 1 the frontier's bearing replaces the leg's heading
  if (fr) { const ex = fr.x - hc.x, ez = fr.z - hc.z, el = Math.hypot(ex, ez); if (el > 1) { fx = ex / el; fz = ez / el; } }
  let best = here, bs = -1e9;
  for (let i = 0; i < CELLS.length; i++) {
    const c = CELLS[i], dg = Math.hypot(c.gx - hc.gx, c.gz - hc.gz); if (i === here || i === lastCell || dg > FLY.reach) continue;
    const dx = c.x - hc.x, dz = c.z - hc.z, dl = Math.hypot(dx, dz) || 1;
    const fu = fogUnseen(c), on = (dx * fx + dz * fz) / dl;
    const sc = (passSeen.has(i) ? 0 : 3) + 2 * on + (heat[c.name]?.pct ?? 0) / 40 + (first.has(i) ? 1.5 : 0) + fu * 2 + ctx.random() * 0.9 - dg * 0.3 + (fr ? on * 2 - (fu === 0 && on < 0.9 ? 5 : 0) : 0);
    if (sc > bs) { bs = sc; best = i; }
  }
  if (fr) { // S4: no neighbour gets closer to the frontier target: fly straight at it (its cell), no zigzag
    const dT = (c) => Math.hypot(c.x - fr.x, c.z - fr.z), ti = cellOf(fr.x, fr.z);
    if (dT(CELLS[best]) >= dT(hc) && ti != null && ti !== here) return ti;
  }
  if (bs < 1) { // boxed in by scanned cells: head for the nearest unscanned one this pass
    let nd = 1e9; for (let i = 0; i < CELLS.length; i++) if (!passSeen.has(i)) { const d = Math.hypot(CELLS[i].gx - hc.gx, CELLS[i].gz - hc.gz); if (d < nd && i !== here) { nd = d; best = i; } }
  }
  return best;
}
function fogUnseen(c) { // share of a cell's fog tiles still dark
  let n = 0, d = 0; const i0 = Math.floor((c.x - HUG.cell / 2 - FOX) / FT), j0 = Math.floor((c.z - HUG.cell / 2 - FOZ) / FT), m = HUG.cell / FT;
  for (let j = j0; j < j0 + m; j += 2) for (let i = i0; i < i0 + m; i += 2) { if (i < 0 || j < 0 || i >= FG || j >= FG) continue; const k = j * FG + i; n++; if (!(fog[k >> 3] >> (k & 7) & 1)) d++; }
  return n ? d / n : 0;
}
function newLeg(ctx) {
  const s = ctx.self.state, now = ctx.now();
  s.leg = { h: Math.round(ctx.random() * 360), ride: 0.6, why: 'wandering (JEV resting)', until: now + FLY.legMs, jev: false };
  if (FLY.sweep && tierNow >= 1) return; // S6c: past 50 % the frontier drives, no leg ask
  const w = ctx.place.state.wind ?? {}, sect = [0, 0, 0, 0, 0, 0, 0, 0], tot = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let j = 0; j < FG; j += 3) for (let i = 0; i < FG; i += 3) { if (!inCircle(i, j)) continue; const x = FOX + i * FT - HUG.center.x, z = FOZ + j * FT - HUG.center.z;
    const yaw = (Math.atan2(-x, -z) * 180 / Math.PI + 360) % 360, b = Math.floor(((yaw + 22.5) % 360) / 45); tot[b]++; const k = j * FG + i; if (fog[k >> 3] >> (k & 7) & 1) sect[b]++; }
  const heat = Object.entries(heatOf()).sort((a, b) => b[1].w - a[1].w).slice(0, 6).map(([c, v]) => ({ cell: c, heat: v.pct }));
  ask(ctx, 'onLeg', {}, { task: 'Choose the scout drone\'s next 10-minute flight leg. Heading is a yaw in degrees (0 = north/-Z, 90 = west/-X, counter-clockwise). Favour sectors with little explored, lean toward hot bug cells, and decide how much to let the wind carry him (ride 0.2 = fight it, 1 = ride it fully; a storm pushing toward the unexplored is a gift). One short line of why, in his voice.',
    windTowardYaw: w.toward ?? 0, windSpeed: w.speed ?? 0, windBand: w.band ?? 'calm', exploredBySector: sect.map((n, b) => ({ yaw: b * 45, pct: Math.round(n / Math.max(1, tot[b]) * 100) })), hotCells: heat, here: CELLS[cellOf(ctx.self.feetPosition.x, ctx.self.feetPosition.z) ?? 0]?.name },
    { type: 'object', properties: { heading: { type: 'number' }, ride: { type: 'number' }, why: { type: 'string' } }, required: ['heading', 'ride', 'why'] });
}
export function onLeg(ctx, r) {
  const d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!d || !Number.isFinite(+d.heading)) { meter(ctx, HUG.lane, 'fail'); return; }
  ctx.self.state.leg = { h: ((Math.round(+d.heading) % 360) + 360) % 360, ride: Math.max(0.2, Math.min(1, +d.ride || 0.6)), why: String(d.why ?? '').slice(0, 120), until: ctx.now() + FLY.legMs, jev: true };
}
// F2: one move: toward the cell at his speed, plus the wind's drift scaled by JEV's ride; the speed he actually makes is published
function fly(ctx, tgt) {
  const me = ctx.self, s = me.state, p = me.feetPosition, w = ctx.place.state.wind ?? {};
  const sp = FAR.on ? FAR.speed : speedOf(tierNow) * (s.hunt ? FLY.huntSpeed : 1), st = sp * HUG.stepS;
  const t = (w.toward ?? 0) * Math.PI / 180, ws = (w.speed ?? 0) * FLY.windPush * windOf(tierNow) * (s.leg?.ride ?? 0.6) * (s.mop ? MOP.wind : 1); // MOP-UP: no wind drift on the route
  const wx = -Math.sin(t) * ws * HUG.stepS, wz = -Math.cos(t) * ws * HUG.stepS;
  const dx = tgt.x - p.x, dz = tgt.z - p.z, d = Math.hypot(dx, dz);
  if (d <= st + Math.hypot(wx, wz)) return true;
  let nx = p.x + dx / d * st + wx, nz = p.z + dz / d * st + wz;
  const rc = Math.hypot(nx - HUG.center.x, nz - HUG.center.z); if (rc > RMAX) { nx = HUG.center.x + (nx - HUG.center.x) * RMAX / rc; nz = HUG.center.z + (nz - HUG.center.z) * RMAX / rc; }
  const cl = FAR.on ? Math.max(3, st * FAR.climb) : 3; let y = p.y + Math.max(-cl, Math.min(cl, tgt.y - p.y));
  if (FAR.on) y = Math.max(y, groundAt(ctx, nx, nz) + FAR.floorUp); // never through a ridge at speed
  me.feetPosition = { x: nx, y, z: nz };
  me.rotation = { lookAt: { x: nx + (nx - p.x), y, z: nz + (nz - p.z) } };
  const made = Math.round(Math.hypot(nx - p.x, nz - p.z) / HUG.stepS);
  if (s.spd !== made) s.spd = made;
  stamp(nx, nz);
  return false;
}
// ── HUGINN-MOPUP (docs/board/proposals/HUGINN-MOPUP.md): one route through every dark speck left ──
let mopOff = 0, mopSeen = -1, mopGain = 0, mopScanned = new Set();
function startMop(ctx) {
  const s = ctx.self.state, now = ctx.now(), p = ctx.self.feetPosition;
  let sp = specks(fog, FG, FT, { x: FOX, z: FOZ }, inCircle);
  if (!sp.length) { mopOff = now + 30000; return; }
  if (sp.length > MOP.max) sp = sp.sort((a, b) => b.size - a.size).slice(0, MOP.max); // the biggest first; the rest on the next build
  const r = route(sp, p), p1 = [...(F?.values() ?? [])].filter((f) => f.tier === 1 && OPEN.has(f.status)).map((f) => f.n).slice(-50);
  s.hunt = null; s.second = null; s.front = null; pin = null;
  s.mop = { pts: r.map((q) => [Math.round(q.x * 10) / 10, Math.round(q.z * 10) / 10]), k: 0, at: now, ring: RING, n0: r.length, len: Math.round(routeLen(r, p)), why: 'nearest-first route', skipped: [], p1 };
  mopSeen = fogSeen; mopGain = now; mopScanned = new Set();
  askMop(ctx, r);
}
function mopFly(ctx) {
  const me = ctx.self, s = me.state, m = s.mop, now = ctx.now();
  if (F) for (const f of F.values()) if (f.tier === 1 && OPEN.has(f.status) && !m.p1.includes(f.n) && BY_NAME.has(f.cell)) { // a new P1: one circle round it, then back on the route
    s.mop.p1 = [...m.p1, f.n].slice(-50); s.hunt = { cell: f.cell, at: now, k: 0 }; s.to = null; return; }
  if (fogSeen > mopSeen) { mopSeen = fogSeen; mopGain = now; }
  const nx = mopNext(m, darkAt);
  if (!nx) { s.mop = null; mopOff = 0; return; } // route flown: the next step rebuilds from what is still dark, or the ring is full
  if (nx.k !== m.k) s.mop.k = nx.k;
  if (V3.on && now - mopGain > V3.stallAskMs && !m.doc?.asked?.includes(nx.k)) { stallAsk(ctx, nx); mopGain = now; } // S8: the stall doctor gets one look before a skip
  if (now - mopGain > MOP.stallMs) { s.mop.skipped = [...(m.skipped ?? []), nx.pt].slice(-20); s.mop.k = nx.k + 1; s.mop.doc = null; mopGain = now; return; }
  if (V3.on && m.doc?.k === nx.k && m.doc.via && !m.doc.done) { const [ax, az] = m.doc.via, pp = me.feetPosition; // fly round to JEV's side first
    if (fly(ctx, { x: ax, y: Math.max(groundAt(ctx, ax, az), groundAt(ctx, pp.x, pp.z)) + HUG.alt, z: az })) s.mop.doc = { ...m.doc, done: true }; return; }
  const [tx, tz] = nx.pt, p = me.feetPosition, gy = Math.max(groundAt(ctx, tx, tz), groundAt(ctx, p.x, p.z));
  if (!fly(ctx, { x: tx, y: gy + HUG.alt, z: tz })) return;
  stamp(tx, tz);
  const i = cellOf(tx, tz), c = i != null ? CELLS[i] : null; // the cell under the speck, when one exists, gets its scan once a mop (findings keep coming)
  if (c && !mopScanned.has(c.name)) { mopScanned.add(c.name);
    const players = new Set(ctx.place.players.map((q) => q.id)), g = groundAt(ctx, c.x, c.z);
    const rows = ctx.query({ center: { x: c.x, y: g, z: c.z }, radius: HUG.scanR }).filter((r) => !players.has(r.id) && !String(r.id).startsWith('player') && !String(r.id).startsWith('huginn'));
    scan = { c, idx: i, gy: g, rows, i: 0, n: { objects: 0, fx: 0, lights: 0, beds: 0 }, cand: [], hit: new Set() }; }
}
const SECT = (x, z) => COMPASS[Math.round(((Math.atan2(x - HUG.center.x, -(z - HUG.center.z)) * 180 / Math.PI + 360) % 360) / 45) % 8];
function askMop(ctx, r) {
  const s = ctx.self.state, p = ctx.self.feetPosition, w = ctx.place.state.wind ?? {}, counts = Object.fromEntries(COMPASS.map((c) => [c, 0]));
  for (const q of r) counts[SECT(q.x, q.z)] += q.size ?? 1;
  ask(ctx, 'onMop', { day: s.day, ring: RING, at: s.mop.at },
    { task: `HUGINN, the scout raven, is past ${MOP.at}% of his fog map and is about to fly one route through every dark speck left. Pick the compass side of the ${RING === 'outer' ? 'outer ring' : 'home circle'} he starts on and the way round he flies (cw or ccw, seen from above), so he wastes the least flying: start near him, take the biggest bunches early, and let the wind help rather than fight. One short reason, plain words.`,
      here: SECT(p.x, p.z), distFromHall: Math.round(Math.hypot(p.x - HUG.center.x, p.z - HUG.center.z)), darkTilesBySide: counts, windToward: COMPASS[Math.round(((w.toward ?? 0) % 360 + 360) % 360 / 45) % 8], windSpeed: w.speed ?? 0, codeRouteMetres: s.mop.len },
    { type: 'object', properties: { side: { type: 'string', enum: COMPASS }, dir: { type: 'string', enum: ['cw', 'ccw'] }, why: { type: 'string', maxLength: 80 } }, required: ['side', 'dir', 'why'] });
}
export function onMop(ctx, r, p) {
  const s = ctx.self.state, d = r?.ok ? (r.data?.object ?? r.data) : null, m = s.mop;
  if (!m || !p || p.at !== m.at || p.ring !== m.ring || p.day !== s.day || ctx.now() - p.at > MOP.jevWaitMs) return; // stale: the code route keeps flying
  const left = m.pts.slice(m.k).map(([x, z]) => ({ x, z })), st = d ? steer(left, d.side, d.dir) : null;
  if (!st) { meter(ctx, HUG.lane, 'fail'); return; }
  s.mop = { ...m, pts: [...m.pts.slice(0, m.k), ...st.map((q) => [q.x, q.z])], why: ('JEV: ' + String(d.why ?? '').replace(/\s+/g, ' ')).slice(0, 80) };
}
export function onSpawn(ctx) { F = null; order = null; scan = null; fog = null; pin = null; frontAt = 0; }
export function update(ctx) { if (!isOn(ctx, 'huginn')) { ctx.sleep?.(PAUSE_NAP_S); return; } // DEN SYSTEMS: paused unless switched on (O → Den Systems)
  const me = ctx.self, s = me.state;
  // FAR-RELAY: past the engine's update reach (he froze ~740 m out despite near 900) places/main/sim.js carries this update.
  // His own behavior stamps s.alive every few s; on taking back from the sim (s.far) the caches reload from state.
  if (!ctx.__far) { const n = ctx.now(); if (s.far) { delete s.far; onSpawn(ctx); } if (n - (s.alive ?? 0) > 3000) s.alive = n; }
  if (!F) load(ctx);
  if (!order) order = passOrder(ctx);
  beacon(ctx);
  if (s.fogWipe) { s.fog = ''; s.fogPct = 0; delete s.fogWipe; fog = null; }
  if (s.ring == null) s.ring = 'inner'; // HUGINN-OUTER: first deploy adopts the home circle, fog kept
  const want = OUTER.on && s.ring === 'outer' ? 'outer' : FAR.on && s.ring === 'far' ? 'far' : 'inner';
  if (FAR.on && RING === 'inner' && !SEAB && RINGS.inner.sea) { SEAB = dec(RINGS.inner.sea, Math.ceil(FG * FG / 8)); fog = null; }
  if (RING !== want) useRing(want, ctx); // a restart mid-outer reloads the outer ring
  if (!fog) fogLoad(ctx);
  sweepStep(ctx);
  saveMap(ctx);
  if (scan) { step(ctx); return; }
  if (MOP.on && s.ring !== 'roost') { // HUGINN-MOPUP S3: past MOP.at % the route flies, not the cells (pickNext and its hunt never run)
    const pct = fogSeen / Math.max(1, fogIn) * 100;
    if (s.mop && (s.mop.ring !== RING || pct < MOP.at - 5)) s.mop = null;
    if (!s.mop && pct >= MOP.at && pct < 100 && ctx.now() > mopOff) startMop(ctx);
    if (s.mop && !s.hunt) { mopFly(ctx); return; }
  }
  if (OUTER.on && s.ring === 'roost' && (s.to == null || !CELLS[s.to])) { const i = roostPick(ctx); if (i == null) { perch(ctx); return; } s.to = i; }
  if (s.to == null || !CELLS[s.to]) s.to = pickNext(ctx);
  const c = CELLS[s.to];
  const p = me.feetPosition, gy = Math.max(groundAt(ctx, c.x, c.z), groundAt(ctx, p.x, p.z));
  const tgt = { x: c.x, y: gy + HUG.alt, z: c.z };
  if (!fly(ctx, tgt)) return;
  me.feetPosition = tgt;
  const players = new Set(ctx.place.players.map((q) => q.id));
  const rows = ctx.query({ center: { x: c.x, y: gy, z: c.z }, radius: HUG.scanR }).filter((r) => !players.has(r.id) && !String(r.id).startsWith('player') && !String(r.id).startsWith('huginn'));
  scan = { c, idx: s.to, gy, rows, i: 0, n: { objects: 0, fx: 0, lights: 0, beds: 0 }, cand: [], hit: new Set() };
  step(ctx);
}
function step(ctx) {
  const sc = scan, end = Math.min(sc.rows.length, sc.i + HUG.rowsPerStep), hx = HUG.center.x, hz = HUG.center.z;
  for (; sc.i < end; sc.i++) {
    const r = sc.rows[sc.i]; let fp;
    try { fp = r.feetPosition; } catch { continue; }
    if (!fp || r.parent) continue; // roots only: a child's feetPosition is local to its parent
    // a row inside this cell's square only (the 36 m reach overlaps the neighbours)
    if (Math.abs(fp.x - sc.c.x) > HUG.cell / 2 || Math.abs(fp.z - sc.c.z) > HUG.cell / 2) continue;
    sc.n.objects++;
    if (r.fx) sc.n.fx++;
    if (r.light) sc.n.lights++;
    const au = r.audio;
    if (au?.loop) { sc.n.beds++; if (au.spatial === false && Math.hypot(fp.x - hx, fp.z - hz) > 30) { find(ctx, 'LOUD', r.id, sc.c, fp.x, fp.z, `a looping bed heard place-wide, gain ${au.gain ?? 1}`); sc.hit.add('LOUD:' + r.id); } }
    const stt = r.state;
    if (stt && typeof stt === 'object') { const len = JSON.stringify(stt).length;
      if (len > HUG.fatState) { find(ctx, 'FATSTATE', r.id, sc.c, fp.x, fp.z, `state ${len} chars`, { size: len }); sc.hit.add('FATSTATE:' + r.id); } }
    if (r.visible === false && (r.primitive || r.model) && (r.behavior?.length ?? 0) > 0) { find(ctx, 'HIDDEN', r.id, sc.c, fp.x, fp.z, `hidden, still drawn-able and running ${r.behavior.length} script(s)`); sc.hit.add('HIDDEN:' + r.id); }
    const g = groundAt(ctx, fp.x, fp.z);
    if (fp.y < g - 20) { find(ctx, 'STRAY', r.id, sc.c, fp.x, fp.z, `${Math.round(g - fp.y)} m under the ground`); sc.hit.add('STRAY:' + r.id); }
    if ((r.primitive || r.model) && ['static', 'dynamic'].includes(r.physics?.body) && sc.cand.length < 400) sc.cand.push(r);
    if (V3.on) { const v = sc.v3 ??= { drawn: [], shadows: 0, far: 0, farId: null, strange: 0, strangeId: null };
      const drawn = !!(r.primitive || r.model), dh = Math.hypot(fp.x - hx, fp.z - hz);
      if (drawn && v.drawn.length < 400) v.drawn.push({ id: r.id, model: r.model, primitive: r.primitive, anchor: spawnFlatCentre(r.primitive), pivot: spawnFlatCentre(r.primitive), fp: { x: fp.x, y: fp.y, z: fp.z }, yaw: yawOf(r) });
      if (r.light?.shadow?.enabled) v.shadows++;
      if (drawn && dh > V3.farDraw && !r.visibleRange) { v.far++; v.farId ??= r.id; }
      if (r.physics?.body === 'dynamic') { const h0 = driftHome.get(r.id);
        if (!h0) { driftHome.set(r.id, { x: fp.x, z: fp.z }); if (driftHome.size > V3.driftMax) driftHome.delete(driftHome.keys().next().value); }
        else { const m = Math.hypot(fp.x - h0.x, fp.z - h0.z); if (m > V3.driftM) { find(ctx, 'DRIFT', r.id, sc.c, fp.x, fp.z, `slid ${Math.round(m)} m from where he first saw it`); sc.hit.add('DRIFT:' + r.id); } } }
      let tg = []; try { tg = r.tags ?? []; } catch {}
      if (!sceneIds(ctx).has(String(r.id)) && !(r.lifetime > 0) && !tg.some((t) => V3.strangerSkipTags.includes(t))) { v.strange++; v.strangeId ??= r.id; } }
  }
  if (sc.i < sc.rows.length) return;
  finish(ctx);
}
function finish(ctx) {
  const sc = scan, s = ctx.self.state, n = sc.n, D = HUG.dense; scan = null;
  if (n.objects > D.objects || n.fx > D.fx || n.lights > D.lights || n.beds > D.beds) { find(ctx, 'DENSE', 'cell-' + sc.c.name, sc.c, sc.c.x, sc.c.z, `${n.objects} objects, ${n.fx} fx, ${n.lights} lights, ${n.beds} sound beds`); sc.hit.add('DENSE:cell-' + sc.c.name); }
  const was = prev.get(sc.idx);
  if (was != null && n.objects >= was * (1 + HUG.runaway) && n.objects - was >= 20) { find(ctx, 'RUNAWAY', 'cell-' + sc.c.name, sc.c, sc.c.x, sc.c.z, `objects ${was} to ${n.objects} in one pass`); sc.hit.add('RUNAWAY:cell-' + sc.c.name); }
  cur.set(sc.idx, n.objects);
  // up to 6 resting things a cell: floating over nothing, or buried whole (a different six each pass)
  const k = sc.cand.length, checked = new Set();
  const m = (FLY.sweep ? checksOf(tierNow) : 6) + (V3.on && n.objects > V3.busyRows ? V3.busyExtra : 0); // S3: 6 → 10 checks a cell across tiers; V3 S1: +4 in a busy cell
  const picks = V3.on ? pickChecks(sc.cand, m, s.pass ?? 0, lastChk) : Array.from({ length: Math.min(m, k) }, (_, j) => sc.cand[((s.pass ?? 0) * m + j) % k]); // V3 S4: least-recently-checked first
  for (const r of picks) {
    let b; try { b = r.bounds; } catch { b = null; }
    if (!b || b.size.y > 3) continue;
    checked.add(r.id);
    const g = groundAt(ctx, b.center.x, b.center.z);
    if (b.max.y < g - 0.05) { find(ctx, 'SUNK', r.id, sc.c, b.center.x, b.center.z, `top ${(g - b.max.y).toFixed(2)} m under the ground`); sc.hit.add('SUNK:' + r.id); continue; }
    const gap = b.min.y - g;
    if (gap > HUG.float && gap < 3) {
      const hit = raycast(ctx, { x: b.center.x, y: b.min.y + 0.02, z: b.center.z }, { x: 0, y: -1, z: 0 }, { distance: HUG.float + 0.02, ignoreEntities: [r.id] });
      if (!hit) { find(ctx, 'FLOAT', r.id, sc.c, b.center.x, b.center.z, `gap ${gap.toFixed(2)} m, nothing under it`); sc.hit.add('FLOAT:' + r.id); }
    }
  }
  if (V3.on && sc.v3) { const v = sc.v3, c = sc.c; // V3 S2: the cell-wide kinds
    for (const [a, b] of doublesOf(v.drawn)) { find(ctx, 'DOUBLE', b.id, c, b.fp.x, b.fp.z, `same thing as ${a.id} within 2 cm, same turn`); sc.hit.add('DOUBLE:' + b.id); }
    if (v.shadows > V3.shadowsMax) { find(ctx, 'SHADOWS', 'cell-' + c.name, c, c.x, c.z, `${v.shadows} shadow-casting lights in one cell`); sc.hit.add('SHADOWS:cell-' + c.name); }
    if (v.far >= V3.farMin) { find(ctx, 'FARDRAW', 'cell-' + c.name, c, c.x, c.z, `${v.far} things with no visibleRange, e.g. ${v.farId}`); sc.hit.add('FARDRAW:cell-' + c.name); }
    const base = baseLoad(ctx), b0 = base.get(c.name);
    if (b0 == null) { base.set(c.name, v.strange); baseDirty = true; }
    else if (v.strange - b0 >= V3.strangerMax) { find(ctx, 'STRANGER', 'cell-' + c.name, c, c.x, c.z, `${v.strange - b0} unplaced things appeared since the baseline (${b0}), e.g. ${v.strangeId}`, { sure: true, sample: v.strangeId }); sc.hit.add('STRANGER:cell-' + c.name); }
    if (c.name === 'x0z0' && RING === 'inner') { doorHit = new Set(); doorsCheck(ctx, c); for (const h of doorHit) sc.hit.add(h); }
  }
  // what HUGINN looked for here and no longer sees: gone, so fixed (FLOAT/SUNK only when that row was checked this pass)
  for (const f of F.values()) {
    if (f.cell !== sc.c.name || !OPEN.has(f.status) || sc.hit.has(f.key)) continue;
    if ((f.kind === 'FLOAT' || f.kind === 'SUNK') && !checked.has(f.id)) continue;
    if (f.kind === 'RUNAWAY') continue;
    if (f.kind === 'DRIFT' && !driftHome.has(f.id)) continue; // a restart forgot its home: no verdict either way
    f.status = 'fixed'; f.note = `HUGINN saw it gone on pass ${s.pass ?? 0}`; f.dMoved = true;
  }
  s.cell = (s.cell ?? 0) + 1; passSeen.add(sc.idx); lastCell = sc.idx; s.to = null;
  if (s.cell === NEAR.length) writeFile(ctx); // the hall and yard read first, on the board within a minute
  if (passSeen.size >= CELLS.length * FLY.passCover || s.cell >= CELLS.length * 2) { passSeen = new Set(); saveMap(ctx, true); endPass(ctx); }
}

// ── a pass ends: the file, the watchers, JEV ──────────────────────────────
function endPass(ctx) {
  const s = ctx.self.state;
  const diff = [];
  for (const [i, v] of cur) { const w = prev.get(i); if (w != null && Math.abs(v - w) >= 10) diff.push(`${CELLS[i].name} ${w}→${v}`); }
  prev = cur; cur = new Map();
  s.pass = (s.pass ?? 0) + 1; s.cell = 0; order = null;
  verdicts(ctx);
  writeFile(ctx);
  report(ctx);
  if (V3.on) { pend.prune(s.pass); baseSave(ctx); askPass(ctx, diff.slice(0, 12)); askDetective(ctx); return; }
  askRoute(ctx);
  if (diff.length) askDiff(ctx, diff.slice(0, 12));
}
function verdicts(ctx) {
  const reps = new Map();
  for (const f of F.values()) {
    if (!f.rep || f.status !== 'found') continue;
    if (!reps.has(f.rep)) { const t = ctx.files.read(`${HUG.reportPrefix}${f.rep.slice(1)}.md`) ?? ''; reps.set(f.rep, /^Status: *(\w+)/m.exec(t)?.[1] ?? null); }
    const st = reps.get(f.rep);
    if (st === 'WATCHED' || st === 'BUILT') { f.status = 'watched'; f.verdict = `watchers passed ${f.rep}`; f.dMoved = true; }
    else if (st === 'RETURNED' || st === 'CONTESTED') { f.verdict = `watchers ${st.toLowerCase()} ${f.rep}`; f.dMoved = true; }
  }
  const newlyWatched = [...F.values()].filter((f) => f.status === 'watched' && f.verdict?.startsWith('watchers passed') && !f.briefed);
  if (newlyWatched.length) { for (const f of newlyWatched) f.briefed = true; askStart(ctx, newlyWatched); }
}
function doneWhen(f) {
  const k = String(f.kind || '').toUpperCase();
  if (k === 'FATSTATE') return 'a state read of ' + f.id + ' gives JSON.stringify(state).length < 4000 (before/after in the note)';
  if (k === 'STRAY' || k === 'BURIED' || k === 'FLOAT') return 'getObject(' + JSON.stringify(f.id) + ') is null, or its feetPosition.y is within 0.5 m of terrain.heightAt under it';
  if (k === 'DENSE' || k === 'HEAVY') return 'spawn perf names the cell cost; after the fix it reads lower, both numbers in the note';
  return 'HUGINN\'s next pass over its cell does not find it again, and the line reads status: fixed with the commit';
}
function report(ctx) {
  const s = ctx.self.state, h = Math.floor(ctx.now() / 3600e3);
  if (s.lastReportH === h) return;
  const fresh = [...F.values()].filter((f) => f.status === 'found' && !f.rep).sort((a, b) => a.tier - b.tier || a.n - b.n).slice(0, 12);
  if (!fresh.length) return;
  const k = (s.rk ?? 0) + 1, R = 'R' + k;
  const text = ctx.files.read(HUG.file) ?? '';
  const quoted = fresh.filter((f) => text.includes(keyOf(f)));
  if (!quoted.length) return;
  for (const f of quoted) { f.rep = R; f.dMoved = true; }
  s.rk = k; s.lastReportH = h;
  const doc = [`# HUGINN-R${k} · the scout raven's findings, pass ${s.pass}, for the watchers to verify`, 'Status: SUBMITTED',
    'Priority: creator rule 2026-09-30: a verified HUGINN finding goes to the top of Savi\'s backlog', '',
    'Files this plan changes (read these first): docs/board/drone/HUGINN.md · docs/board/PERF.md lines 45-49', '',
    '## Ask', 'Creator rule 2026-09-30: HUGINN documents bugs and performance issues; the watchers verify the legitimacy of his reports, then Savi works them with the highest priority.', '',
    '## What stands (quoted, each a line of docs/board/drone/HUGINN.md)', ...quoted.map((f) => `- \`${keyOf(f)}\` ${clean(f.ev)}`), '',
    '## The plan', 'Savi confirms each finding with the tool its line names after SEE (spawn perf, look, a state read), writes the measured number into its line, and fixes it in tier order (P1 first). A finding she cannot reproduce she marks `status: rejected` with the reason.', '',
    '## Tiers (HUGINN-DRONE.md, PRIORITY)', 'P1: >= 2 ms frame, >= 1 ms tick or an error every tick, breaks play, state >= 20,000 chars, a runaway, stuck loud audio, a JEV lane over its cap for an hour, or an ISSUE pin. P2: 0.5-2 ms, state 4,000-20,000, a dense cell, a visible art bug within 40 m. P3: hidden-but-running, floating or buried 40-150 m out, a loud bed outside. P4: cosmetic past 150 m, strays.', '',
    '## Slices', 'One slice per quoted line: confirm it, then fix it or reject it. Each is its own commit. Done-when per line (readOnly):', ...quoted.map((f) => `- ${f.id}: ${doneWhen(f)}`), '',
    '## Budget', 'Against docs/board/PERF.md: "tick: on-budget of 33.3 ms, shedPct 0; typical 1.4 ms, up to 1.9 ms" and "save churn: board-bell.state serialises to 32,986 chars and rides every write of that row to every client." Confirming a line is a read; a fix may only lower tick ms, draws or state chars, never raise them; zero LLM calls. The fix commit records before -> after in PERF.md.', '',
    '## Gate', 'Each line passes when its id, kind and tier agree with the fed HUGINN.md line and the Tiers above.', '',
    '## Contract', 'docs/board/drone/HUGINN.md: scripts/huginn.js writes the lines; Savi edits only status and note by hand. huginn-board.state.marks: one writer, scripts/huginn-board.js ears.mark (scripts/board-input.js forwards the click); scripts/huginn.js and huginn-board.js read it.', '',
    '## For the watchers', 'Verify each quoted line is real: the id plausibly exists, the kind matches the evidence, the tier matches the rules above. HUGINN is a script: it cannot read GPU time, so a DENSE line is a pointer to measure, not a measurement.', '',
    '## Proof', 'Each fixed line reads `status: fixed` with the fixing commit in its note, or HUGINN marks it gone on his next pass over that cell.', '',
    '## Not verified', 'Frame and GPU cost: HUGINN reads rows, not frames. A DENSE or heavy line is confirmed only by spawn perf.', ''].join('\n');
  ctx.files.write(`${HUG.reportPrefix}${k}.md`, doc);
  writeFile(ctx);
  askTriage(ctx, quoted);
}

// ── JEV: four small asks, every one through the desk's Drone row ─────────
const SYS = 'You are JEV, the planning mind of a small Viking-den game team. HUGINN, a scout drone, scans the den for bugs and performance problems. Be concrete and short.';
function ask(ctx, cb, payload, message, schema, fast = true) {
  if (!allow(ctx, HUG.lane)) return false;
  meter(ctx, HUG.lane);
  ctx.job('llm:generate', { model: fast ? 'fast' : 'smart', system: SYS, message: JSON.stringify(message).slice(0, 6000), schema }, cb, payload);
  return true;
}
function askTriage(ctx, list) {
  ask(ctx, 'onTriage', { keys: list.map((f) => f.key) }, { task: 'Rank these findings worst-for-players first. For each: why it matters to a player in one line, and the fix in plain words a non-programmer understands (one or two sentences). Also say doubt = true when the evidence reads like a false alarm (an intended prop, a decoration meant to hang, a pile meant to overlap), with the reason in why.', findings: list.map((f) => ({ h: 'H' + f.n, tier: 'P' + f.tier, kind: f.kind, id: f.id, where: f.cell, evidence: f.ev, drone_fix: f.fix })) },
    { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { h: { type: 'string' }, rank: { type: 'number' }, why: { type: 'string' }, fix: { type: 'string' }, doubt: { type: 'boolean' } }, required: ['h', 'rank', 'why', 'fix'] } } }, required: ['items'] });
}
export function onTriage(ctx, r, p) {
  const d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!d?.items) { meter(ctx, HUG.lane, 'fail'); return; }
  if (!F) load(ctx);
  const byH = new Map([...F.values()].map((f) => ['H' + f.n, f]));
  for (const it of d.items) { const f = byH.get(it.h); if (!f || !p?.keys?.includes(f.key)) continue; f.why = `#${it.rank} ${it.why}`; f.fix = it.fix; if (V3.on && it.doubt === true && f.tier >= 3) f.verdict = 'JEV doubts it (false alarm?): check before fixing'; }
  writeFile(ctx);
}
function askRoute(ctx) {
  const tally = ctx.world.state.useTally ?? {}, hot = new Map();
  for (const [id, n] of Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 20)) { const o = ctx.getObject(id); const fp = o?.feetPosition; const i = fp && cellOf(fp.x, fp.z); if (i != null) hot.set(CELLS[i].name, (hot.get(CELLS[i].name) ?? 0) + n); }
  const bugs = new Map(); for (const f of F.values()) if (OPEN.has(f.status)) bugs.set(f.cell, (bugs.get(f.cell) ?? 0) + (5 - f.tier));
  const cand = [...new Set([...hot.keys(), ...bugs.keys()])];
  if (cand.length < 2) return;
  ask(ctx, 'onRoute', {}, { task: 'Pick up to 12 cells for the drone to scan first next pass, most useful first: where players spend time and where open bugs cluster.', cells: cand.map((c) => ({ cell: c, playerUse: hot.get(c) ?? 0, bugWeight: bugs.get(c) ?? 0 })) },
    { type: 'object', properties: { cells: { type: 'array', maxItems: 12, items: { type: 'string' } } }, required: ['cells'] });
}
export function onRoute(ctx, r) {
  const d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!d?.cells) { meter(ctx, HUG.lane, 'fail'); return; }
  ctx.self.state.first = d.cells.map((c) => BY_NAME.get(c)).filter((i) => i != null).slice(0, 12);
}
function askDiff(ctx, diff) {
  ask(ctx, 'onDiff', {}, { task: 'The drone counted objects per 50 m cell this pass vs the last one. In one or two sentences: what got worse, and is anything growing like a leak?', changes: diff },
    { type: 'object', properties: { line: { type: 'string' } }, required: ['line'] });
}
export function onDiff(ctx, r) {
  const d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!d?.line) { meter(ctx, HUG.lane, 'fail'); return; }
  ctx.self.state.diff = String(d.line).slice(0, 240);
  if (!F) load(ctx); writeFile(ctx);
}
function askStart(ctx, list) {
  ask(ctx, 'onStart', {}, { task: 'The watchers verified these drone findings. Write Savi a three-line START HERE: which one first, which file or object, and the first check to run.', findings: list.slice(0, 12).map((f) => ({ h: 'H' + f.n, tier: 'P' + f.tier, kind: f.kind, id: f.id, evidence: f.ev, fix: f.fix })) },
    { type: 'object', properties: { note: { type: 'string' } }, required: ['note'] }, false);
}
export function onStart(ctx, r) {
  const d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!d?.note) { meter(ctx, HUG.lane, 'fail'); return; }
  ctx.self.state.startHere = String(d.note).slice(0, 400);
  if (!F) load(ctx); writeFile(ctx);
}

// ── HUGINN-V3 S5/S6/S8: one pass ask (route + diff + clusters), the spawner detective, the stall doctor, JEV's score ──
let lastPassHash = null, lastDetHash = null;
function askPass(ctx, diff) {
  const tally = ctx.world.state.useTally ?? {}, hot = new Map();
  for (const [id, n] of Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 20)) { const o = ctx.getObject(id); const fp = o?.feetPosition; const i = fp && cellOf(fp.x, fp.z); if (i != null) hot.set(CELLS[i].name, (hot.get(CELLS[i].name) ?? 0) + n); }
  const open = [...F.values()].filter((f) => OPEN.has(f.status)), bugs = new Map(); for (const f of open) bugs.set(f.cell, (bugs.get(f.cell) ?? 0) + (5 - f.tier));
  const cells = [...new Set([...hot.keys(), ...bugs.keys()])].map((c) => ({ cell: c, playerUse: hot.get(c) ?? 0, bugWeight: bugs.get(c) ?? 0 }));
  const groups = groupsOf(open).slice(0, 8), dark = darkSides();
  const input = { cells, diff, groups: groups.map((g) => ({ key: g.key, kind: g.kind, prefix: g.prefix, findings: g.hs })), darkBySide: dark };
  const h = hashOf(input); if (h === lastPassHash) { meter(ctx, HUG.lane, 'skip'); return; } // S6: nothing changed since the last pass: no ask
  if (cells.length < 2 && !diff.length && !groups.length) return;
  if (!ask(ctx, 'onPass', { keys: groups.map((g) => g.key) }, { task: 'You plan the scout raven HUGINN\'s next pass and read his last one. (1) first: up to 12 cells to scan first, most useful first: where players spend time, where open bugs cluster, and the darkest compass sides. (2) diff: one or two sentences on what got worse pass over pass and whether anything grows like a leak (empty string if no changes given). (3) causes: for each group of same-kind findings sharing a name, one root cause and one fix that would clear the whole group, in plain words a non-programmer understands. Use only what is given.', ...input },
    { type: 'object', properties: { first: { type: 'array', maxItems: 12, items: { type: 'string' } }, diff: { type: 'string' }, causes: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, cause: { type: 'string' }, fix: { type: 'string' } }, required: ['key', 'cause', 'fix'] } } }, required: ['first'] })) return;
  lastPassHash = h;
}
function darkSides() { const sect = Object.fromEntries(COMPASS.map((c) => [c, 0])); if (!fog) return sect;
  for (let j = 0; j < FG; j += 2) for (let i = 0; i < FG; i += 2) { if (!inCircle(i, j)) continue; const k = j * FG + i; if (!(fog[k >> 3] >> (k & 7) & 1)) sect[SECT(FOX + (i + 0.5) * FT, FOZ + (j + 0.5) * FT)]++; }
  return sect; }
export function onPass(ctx, r, p) {
  const s = ctx.self.state, d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!d || !Array.isArray(d.first)) { meter(ctx, HUG.lane, 'fail'); lastPassHash = null; return; }
  s.first = d.first.map((c) => BY_NAME.get(c)).filter((i) => i != null).slice(0, 12);
  if (d.diff) s.diff = String(d.diff).slice(0, 240);
  if (!F) load(ctx);
  const groups = groupsOf([...F.values()].filter((f) => OPEN.has(f.status)));
  for (const c of d.causes ?? []) { if (!p?.keys?.includes(c.key)) continue; const g = groups.find((x) => x.key === c.key); if (!g) continue;
    for (const hn of g.hs) { const f = [...F.values()].find((x) => 'H' + x.n === hn); if (f) { f.why = clean(`ROOT CAUSE (JEV, ${g.hs.length} alike): ${c.cause}`).slice(0, 220); f.fix = clean(c.fix).slice(0, 260); f.dMoved = true; } } }
  // S5 CLUSTER lines: one per named cause, numbered C1.., kept while the group stays open (a group whose members closed leaves)
  const prev = (s.clusters ?? []).filter((x) => groups.some((g) => g.key === x.key)), seen = new Set(prev.map((x) => x.key));
  let cn = Math.max(0, ...prev.map((x) => x.c)) || 0;
  for (const c of d.causes ?? []) { if (!p?.keys?.includes(c.key)) continue; const g = groups.find((x) => x.key === c.key); if (!g) continue;
    const row = { key: g.key, kind: g.kind, prefix: g.prefix, count: g.hs.length, hs: g.hs.slice(0, 24), cause: clean(c.cause).slice(0, 160), fix: clean(c.fix).slice(0, 200) };
    const i = prev.findIndex((x) => x.key === g.key); if (i >= 0) prev[i] = { ...prev[i], ...row }; else if (!seen.has(g.key)) { prev.push({ c: ++cn, ...row }); seen.add(g.key); } }
  s.clusters = prev.slice(-8);
  writeFile(ctx);
}
// S8 the spawner detective: an open STRANGER or RUNAWAY gets one guess at the script behind it (from the world's script names)
function askDetective(ctx) {
  const list = [...F.values()].filter((f) => OPEN.has(f.status) && (f.kind === 'STRANGER' || f.kind === 'RUNAWAY') && !f.why?.startsWith('SPAWNER')).slice(0, 4);
  if (!list.length) return;
  if (!Array.isArray(ctx.world?.files)) { meter(ctx, HUG.lane, 'fail'); return; } // watched E3: no file list yet = no guess at all
  const scripts = ctx.world.files.filter((x) => /^scripts\/[^/]+\.js$/.test(x) && !/tex-|camera|ui/.test(x)).slice(0, 160).map((x) => x.slice(8, -3));
  const input = { findings: list.map((f) => ({ h: 'H' + f.n, kind: f.kind, cell: f.cell, evidence: f.ev })), scripts };
  const h = hashOf(input); if (h === lastDetHash) return;
  if (ask(ctx, 'onDetective', { hs: list.map((f) => 'H' + f.n) }, { task: 'Things keep appearing in a game world that no scene file placed. For each finding, guess the one script (from the list, by name) most likely spawning them, and the first check to run. If none fits, say "unknown". Use only the names given.', ...input },
    { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { h: { type: 'string' }, script: { type: 'string' }, check: { type: 'string' } }, required: ['h', 'script', 'check'] } } }, required: ['items'] })) lastDetHash = h;
}
export function onDetective(ctx, r, p) {
  const d = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!d?.items) { meter(ctx, HUG.lane, 'fail'); lastDetHash = null; return; }
  if (!F) load(ctx);
  for (const it of d.items) { if (!p?.hs?.includes(it.h)) continue; const f = [...F.values()].find((x) => 'H' + x.n === it.h); if (!f) continue;
    const known = it.script !== 'unknown' && Array.isArray(ctx.world?.files) && ctx.world.files.includes(`scripts/${it.script}.js`); // watched E3: absent list drops the name
    f.why = clean(`SPAWNER (JEV): ${known ? 'scripts/' + it.script + '.js' : 'not found'} · ${it.check}`).slice(0, 220); f.dMoved = true; }
  writeFile(ctx);
}
// S8 the stall doctor: a speck that will not light gets JEV's bearing to come at it from; he flies round there, then in
function stallAsk(ctx, nx) {
  const s = ctx.self.state, m = s.mop, p = ctx.self.feetPosition, [tx, tz] = nx.pt, w = ctx.place.state.wind ?? {};
  s.mop = { ...m, doc: { k: nx.k, asked: [...(m.doc?.asked ?? []), nx.k].slice(-20) } };
  const g = groundAt(ctx, tx, tz), around = COMPASS.map((c, i) => { const b = i * 45 * Math.PI / 180, x = tx + Math.sin(b) * 20, z = tz - Math.cos(b) * 20; return { side: c, rise: Math.round(groundAt(ctx, x, z) - g) }; });
  ask(ctx, 'onStall', { k: nx.k, at: m.at }, { task: 'HUGINN the scout raven has circled one dark map speck for 45 s and it will not light. He sees round him from 30 m over the ground. Pick the compass side to come at it from (the side where the ground is lowest and the wind helps), and one short reason.', speckFromHim: { dx: Math.round(tx - p.x), dz: Math.round(tz - p.z) }, groundRiseBySide: around, windToward: COMPASS[Math.round(((w.toward ?? 0) % 360 + 360) % 360 / 45) % 8], windSpeed: w.speed ?? 0 },
    { type: 'object', properties: { side: { type: 'string', enum: COMPASS }, why: { type: 'string', maxLength: 80 } }, required: ['side', 'why'] });
}
export function onStall(ctx, r, p) {
  const s = ctx.self.state, d = r?.ok ? (r.data?.object ?? r.data) : null, m = s.mop;
  if (!m || p?.at !== m.at || m.doc?.k !== p.k) return;
  const i = d ? COMPASS.indexOf(d.side) : -1; if (i < 0) { meter(ctx, HUG.lane, 'fail'); return; }
  const pt = m.pts[p.k]; if (!pt) return;
  s.mop = { ...m, doc: { ...m.doc, via: approachOf(pt, i * 45).map((v) => Math.round(v * 10) / 10), done: false }, why: ('JEV: ' + String(d.why ?? '').replace(/\s+/g, ' ')).slice(0, 80) };
}
// S6 JEV's score: 3 min windows of fog gain, steered by a JEV pick or by code; a day's verdict lands in V3.scoreFile
function scoreTick(ctx) {
  const s = ctx.self.state, now = ctx.now(), w = s.scoreWin;
  const jev = !!(s.front && s.front.why !== FALL) || !!(s.mop && String(s.mop.why ?? '').startsWith('JEV')) || !!s.leg?.jev;
  if (!w) { s.scoreWin = { at: now, seen: fogSeen, jev, ring: RING }; return; }
  if (now - w.at < V3.scoreMs) return;
  const ok = w.ring === RING && fogSeen >= w.seen;
  if (ok && fogSeen < fogIn) s.score = [...(s.score ?? []), { jev: w.jev, gain: Math.round((fogSeen - w.seen) / Math.max(1, fogIn) * 10000) / 100 }].slice(-V3.scoreRows);
  s.scoreWin = { at: now, seen: fogSeen, jev, ring: RING };
}
function scoreDay(ctx, yday) {
  const s = ctx.self.state, v = dayVerdict(s.score ?? []);
  s.score = []; s.scoreWin = null;
  const days = [...(s.scoreDays ?? []), v ? { d: yday, won: v.won } : null].filter(Boolean).slice(-7);
  s.scoreDays = days;
  if (shouldGround(days)) s.grounded = yday + 1; // today: frontier picks by code alone; tomorrow he gets another chance
  if (!v) return;
  const prevT = ctx.files.read(V3.scoreFile) ?? '# JEV\'s score as HUGINN\'s guide: mean fog % gained per 3 min, JEV-steered vs code-steered (scripts/huginn.js writes one line a day)\n';
  ctx.files.write(V3.scoreFile, prevT.trimEnd() + `\nday ${yday} · JEV ${v.jev} vs code ${v.code} · ${v.won ? 'JEV won' : 'code won'} · ${v.n} windows${shouldGround(days) ? ' · grounded tomorrow' : ''}\n`);
}


/** A plane, circle, ring or torus stands by its centre here: "center" for those four kinds, nothing for any other. */
function spawnFlatCentre(primitive) {
  const kind = typeof primitive === "string" ? primitive : primitive != null ? primitive.kind : undefined;
  return kind === "plane" || kind === "circle" || kind === "ring" || kind === "torus" ? "center" : undefined;
}

/** A part whose shape is decided as the line runs stands the same way: anchor and pivot "center" on a plane, circle, ring or torus that names neither. */
function spawnKeepFlatCentre(part) {
  if (part != null && spawnFlatCentre(part.primitive) !== undefined) {
    if (part.anchor == null) part.anchor = "center";
    if (part.pivot == null) part.pivot = "center";
  }
  return part;
}

/** Writes a part's primitive and keeps it standing the same way when the new shape is a plane, circle, ring or torus: the value written. */
function spawnSetPrimitive(part, primitive) {
  part.primitive = primitive;
  spawnKeepFlatCentre(part);
  return primitive;
}
