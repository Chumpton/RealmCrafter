import { LANE_SYSTEM, pctOf } from './data/jev-master.js';
import { ELI5, ELI5_GEN } from './data/jev-eli5.js'; // JEV-HOVER-ELI5-v2 L2
import { scaleFor, onBusy, isBusy } from './data/ai-budget.js'; // HEIMDALL H2: the den backs off when Spawn says busy
// JEV METER (2026-09-29, creator's go on the JEV optimization pass): how often each system asks JEV and how often it misses.
// meter(ctx, lane, 'ask' | 'fail') steps a tiny row in world.state.jevMeter { h, now: { lane: { a, f } }, last }.
// Writes land only when a system asks (rare), never per tick. On the hour's rollover the finished hour is appended to
// docs/board/JEV-METER.md (at most one commit an hour, and only in hours JEV was asked).
const FILE = 'docs/board/JEV-METER.md', KEEP = 48;
// JEV-MASTER-v2 L2: the gate. pct/100 credit per ask; the ask runs when a whole credit is there, else it is skipped (counted as s).
// Deterministic: exactly pct % of a lane's asks over time. Module memory, no state write beyond the meter row.
const credit = new Map();
const _top = new Map(); let _topM = -1; // L2: lane -> calls this minute, on this machine
export function allow(ctx, lane) {
  const sys = LANE_SYSTEM[lane]; if (!sys) return true;
  const pct = pctOf(ctx.world.state.jevMaster, sys) * scaleFor(ctx, lane);
  if (pct >= 100) return true;
  const c = (credit.get(lane) ?? 1 - 1e-9) + pct / 100; // the first ask after a (re)load runs
  if (c >= 1) { credit.set(lane, c - 1); return true; }
  credit.set(lane, c); meter(ctx, lane, 'skip'); return false;
}
export function meter(ctx, lane, kind = 'ask', r = null) {
  if (kind === 'fail' && isBusy(r)) onBusy(ctx); // H2: only a refused job, never a bad answer
  try {
    const now = ctx.now(), h = Math.floor(now / 3600e3), w = ctx.world.state;
    let m = w.jevMeter;
    if (!m || m.h !== h) {
      if (m && m.now && Object.keys(m.now).length) writeHour(ctx, m);
      m = { h, now: {}, last: m?.h === h - 1 ? m.now : null };
    }
    const r = { a: 0, f: 0, ...(m.now[lane] ?? {}) };
    if (kind === 'fail') r.f++; else if (kind === 'skip') r.s = (r.s ?? 0) + 1; else r.a++;
    m.now = { ...m.now, [lane]: r };
    w.jevMeter = m;
    // JEV-MASTER-LIVE L2 (WATCHED 5/5): world.state.jevLive { bins: [{ m, t, s }] ≤ 30 (one per minute), feed: [[at, lane, kind]] ≤ 10, newest first }
    const L = w.jevLive ?? {}, mi = Math.floor(now / 60e3);
    let bins = (L.bins ?? []).filter((b) => b && b.m > mi - 30);
    let b = bins.find((x) => x.m === mi);
    if (!b) { b = { m: mi, t: 0, s: 0 }; bins = [...bins, b]; }
    if (kind === 'skip') b.s++; else if (kind !== 'fail') b.t++;
    // JEV-HOVER-ELI5-v2 L2: the minute's busiest caller (b.top, b.tn), counted in this machine's memory beside the b.t / b.s step
    if (kind !== 'fail') { if (_topM !== mi) { _topM = mi; _top.clear(); } const n = (_top.get(lane) ?? 0) + 1; _top.set(lane, n); if (n >= (b.tn ?? 0)) { b.top = String(lane).slice(0, 22); b.tn = n; } }
    bins = bins.map((x) => (x.m === mi ? { ...b } : x));
    // L2 SEEN: a lane with no hand-written card and no row yet is queued once for JEV to explain (board-jev.js writes the card)
    if (!ELI5['lane:' + lane] && !w.jevEli5?.[lane] && Object.keys(w.jevEli5 ?? {}).length < ELI5_GEN.rowsMax) w.jevEli5 = { ...(w.jevEli5 ?? {}), [String(lane).slice(0, 22)]: { q: now } };
    const feed = [[now, String(lane).slice(0, 22), kind === 'fail' ? 'f' : kind === 'skip' ? 's' : 'a'], ...(L.feed ?? [])].slice(0, 10);
    w.jevLive = { bins, feed };
  } catch (e) { /* the meter never breaks a system */ }
}
function writeHour(ctx, m) {
  try {
    const stamp = ctx.now() > 1.6e12 ? new Date(m.h * 3600e3).toISOString().slice(0, 13) + 'h UTC' : `hour ${m.h}`;
    const tot = Object.values(m.now).reduce((t, r) => [t[0] + (r.a ?? 0), t[1] + (r.f ?? 0), t[2] + (r.s ?? 0)], [0, 0, 0]);
    const line = `- ${stamp} · ${tot[0]} asks, ${tot[1]} misses${tot[2] ? `, ${tot[2]} skipped by the desk` : ''} · ` + Object.entries(m.now).sort((a, b) => b[1].a - a[1].a).map(([k, r]) => `${k} ${r.a ?? 0}${r.f ? `/${r.f}✗` : ''}${r.s ? ` (−${r.s})` : ''}`).join(', ');
    const old = ctx.files.read(FILE) ?? '';
    const head = '# JEV METER · asks per system per hour (✗ = misses that fell back). Written by scripts/lib/jev-meter.js.\n';
    if (old.includes(`\n- ${stamp} · `)) return; // P6 JEV-CHURN: two scripts rolling the same hour over write it once
    const rows = old.split('\n').filter((l) => l.startsWith('- ')).slice(-(KEEP - 1));
    ctx.files.write(FILE, head + [...rows, line].join('\n') + '\n');
  } catch (e) { ctx.log('jev-meter write failed', { e: String(e) }); }
}
