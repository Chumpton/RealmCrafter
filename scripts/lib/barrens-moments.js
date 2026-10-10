// World 302 v2, lane 4: MOMENTS (docs/board/BARRENS-VARIETY-PLAN-2026-10-06.md, fix 6). Pure, no ctx, no clock, no dice.
// The runner calls this about once a second (never per tick) with the place's players (and, for kills, the 'enemy' rows):
//   const r = scanMoments(st.momentSnap ?? null, ctx.place.players, { foes: ctx.query({ tags: ['enemy'] }), now: ctx.now() });
//   st.momentSnap = r.snap; for (const m of r.moments) ...fire a crowd beat
// Real keys it reads (nothing here writes them):
//   player.state.skills = { skill: xpTenths }  (skills-player.js, the one writer) -> levels via skills-core levelOf
//   player.state.dead   = true for ~2.4 s after a fall (monster-player.js)        -> 'death'
//   player.state.fight.target / .lock = the foe id being fought (combat-player.js)  -> who gets a kill
//   foe.state.down / .kind / .engaged / .chase.pid / .boss (monster.js, arena-mobs.js) -> 'kill'
//   player.state.kills / .kc (a number), if a later lane ever counts them           -> 'kill' too
// The player has no kill counter of its own, so a kill is a foe going down between two scans, credited to the player
// it was engaged with / chasing in the previous scan, else the one whose fight/lock pointed at it, else the nearest within 30 m.
// A player first seen (or the first call, prev null) yields no moments: arriving with 99s is not a level-up.
import { levelOf } from './skills-core.js';
import { MONSTERS } from './data/monsters.js';

export const MOMENTS = { bigLevel: 99, bigFoeLevel: 28, nearM: 30, maxPer: 6 }; // bigFoeLevel: Raider chief (28) and up count as a boss
const nameOf = (p) => String(p?.displayName ?? p?.name ?? p?.id ?? 'someone');
const posOf = (o) => o?.worldFeetPosition ?? o?.feetPosition ?? null;

function snapPlayer(p) {
  const s = p?.state ?? {}, sk = s.skills && typeof s.skills === 'object' ? s.skills : {}, lv = {}; let t = 0;
  for (const k of Object.keys(sk)) { if (typeof sk[k] !== 'number') continue; const L = levelOf(sk[k]); lv[k] = L; t += L; }
  const kc = typeof s.kills === 'number' ? s.kills : typeof s.kc === 'number' ? s.kc : null;
  const f = s.fight?.target ?? s.lock ?? null, q = posOf(p);
  return { n: nameOf(p), t, s: lv, d: !!s.dead, k: kc, f: typeof f === 'string' ? f : null, x: q ? Math.round(q.x) : null, z: q ? Math.round(q.z) : null };
}
function snapFoe(o) {
  const s = o?.state ?? {}, by = s.engaged ?? s.chase?.pid ?? null, q = posOf(o), d = MONSTERS[s.kind];
  return { down: !!s.down, by: typeof by === 'string' ? by : null, kind: s.kind ?? null, name: d?.name ?? s.name ?? s.kind ?? 'something',
    big: !!s.boss || (d?.level | 0) >= MOMENTS.bigFoeLevel, x: q ? q.x : null, z: q ? q.z : null };
}

export function scanMoments(prevSnap, players, opts = {}) {
  const P = {}, F = {}, moments = [], prevP = prevSnap?.p ?? null, prevF = prevSnap?.f ?? null, now = opts.now;
  const add = (m) => { if (now != null) m.at = now; moments.push(m); };
  for (const p of players ?? []) { if (p?.id != null) P[p.id] = snapPlayer(p); }
  for (const o of opts.foes ?? []) { if (o?.id != null) F[o.id] = snapFoe(o); }
  if (prevP) for (const id of Object.keys(P)) {
    const a = prevP[id], b = P[id]; if (!a) continue;
    for (const sk of Object.keys(b.s)) { const was = a.s[sk] ?? 1; if (b.s[sk] > was) add({ who: b.n, kind: 'level', skill: sk, level: b.s[sk], big: b.s[sk] >= MOMENTS.bigLevel }); }
    if (b.d && !a.d) add({ who: b.n, kind: 'death', big: false });
    if (b.k != null && a.k != null && b.k > a.k) add({ who: b.n, kind: 'kill', big: false });
  }
  if (prevF) for (const id of Object.keys(F)) {
    const a = prevF[id], b = F[id]; if (!a || a.down || !b.down) continue;
    let by = a.by && P[a.by] ? a.by : null;
    if (!by) for (const pid of Object.keys(prevP ?? {})) if (prevP[pid].f === id && P[pid]) { by = pid; break; }
    if (!by && b.x != null) { let best = MOMENTS.nearM; for (const pid of Object.keys(P)) { const q = P[pid]; if (q.x == null) continue; const d = Math.hypot(q.x - b.x, q.z - b.z); if (d < best) { best = d; by = pid; } } }
    if (by) add({ who: P[by].n, kind: 'kill', target: b.name, big: b.big });
  }
  moments.sort((x, y) => (y.big ? 1 : 0) - (x.big ? 1 : 0)); // the 99s and bosses first, if the runner only takes one
  return { snap: { p: P, f: F }, moments: moments.slice(0, MOMENTS.maxPer) };
}
