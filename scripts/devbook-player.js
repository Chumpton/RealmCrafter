// DEV TEAM TRACKER · server lane (plan docs/board/DEV-TRACKER-PLAN-2026-10-06.md). On every player; does nothing unless
// devbookAccess says they may see the book (editors; visitors only when world.state.devbook.visitorsSee).
// sendAction('devbook', { op }) -> player.state.devbook (the page ui/hud/devbook.js draws). Day files via ctx.files.read
// (data/devlog/zezima-<day>.json + campton-<day>.md through scripts/lib/devlog-read.js), parsed once per text in a module Map.
// Reactions live in SQL devlog_react; JEV reads each entry once (kind, weight, pin, his own reaction, mood) into devlog_meta.
// A react/pin/JEV read bumps world.state.devbookRev so every open book on that day refreshes its counts.
import { loadDay } from './lib/devlog-read.js';
import * as C from './lib/devbook-core.js';
import { devbookAccess } from './lib/devbook-access.js';
import { allow, meter } from './lib/jev-meter.js';

export const updateSchedule = { every: { seconds: 1 } };
const POLL_MS = 15000, JEV_GAP_MS = 2500, JEV_LANE = 'devbook';
const dayCache = new Map();   // day -> { z, c, entries }
const social = new Map();     // day -> { rows, metas }
const mine = new Map();       // player id -> { poll, rev, expanded:Set, jevAt }
const asked = new Set();      // msg ids JEV was asked about on this machine
let jevBusyAt = 0, made = false; // one JEV ask in flight per machine; a lost answer frees it after 20 s

const me$ = (ctx) => { const id = ctx.self.id; if (!mine.has(id)) mine.set(id, { poll: 0, rev: null, expanded: new Set(), jevAt: 0 }); return mine.get(id); };
const log = (ctx, m, e) => ctx.log?.('devbook: ' + m, String(e?.message ?? e ?? ''));
const toast = (ctx, message) => ctx.emit('uiEvent', { name: 'toast', payload: { message } }, { audience: { player: ctx.self.id } });

async function ensure(ctx) {
  if (made) return;
  await ctx.sql`CREATE TABLE IF NOT EXISTS devlog_react (msg_id TEXT NOT NULL, user_id TEXT NOT NULL, name TEXT, emoji TEXT NOT NULL, at INTEGER, PRIMARY KEY (msg_id, user_id, emoji))`;
  await ctx.sql`CREATE TABLE IF NOT EXISTS devlog_meta (msg_id TEXT PRIMARY KEY, kind TEXT, weight REAL, pin INTEGER, jev_emoji TEXT, mood TEXT, at INTEGER, pinned INTEGER, pinned_by TEXT)`;
  made = true;
}

function dayList(ctx) {
  let ix = null; try { ix = ctx.files.read('data/devlog/index.json'); } catch {}
  return C.daysFrom(ix, ctx.world.files);
}

function readDay(ctx, day) {
  if (!C.isDay(day)) return [];
  const zp = `data/devlog/zezima-${day}.json`, cp = `data/devlog/campton-${day}.md`;
  let z = null, c = null; try { z = ctx.files.read(zp); c = ctx.files.read(cp); } catch (e) { log(ctx, 'read', e); }
  const hit = dayCache.get(day);
  if (hit && hit.z === z && hit.c === c) return hit.entries;
  let entries = [];
  try { entries = loadDay((p) => (p === zp ? z : p === cp ? c : null), day) ?? []; } catch (e) { log(ctx, 'parse ' + day, e); }
  entries = entries.filter((e) => e && e.id != null).map((e) => ({ ...e, id: String(e.id) }));
  dayCache.set(day, { z, c, entries });
  return entries;
}

async function loadSocial(ctx, day) {
  const ids = readDay(ctx, day).map((e) => e.id);
  if (!ids.length) { social.set(day, { rows: [], metas: {} }); return; }
  try {
    await ensure(ctx);
    const j = JSON.stringify(ids);
    const r = await ctx.sql`SELECT msg_id, user_id, name, emoji FROM devlog_react WHERE msg_id IN (SELECT value FROM json_each(${j}))`;
    const m = await ctx.sql`SELECT msg_id, kind, weight, pin, jev_emoji, mood, pinned FROM devlog_meta WHERE msg_id IN (SELECT value FROM json_each(${j}))`;
    social.set(day, { rows: r.rows ?? [], metas: Object.fromEntries((m.rows ?? []).map((x) => [x.msg_id, x])) });
  } catch (e) { log(ctx, 'social ' + day, e); if (!social.has(day)) social.set(day, { rows: [], metas: {} }); }
}

function unreadOf(ctx, days) {
  const entries = days[0] ? readDay(ctx, days[0]) : [];
  return { unread: C.unreadCount(entries, ctx.self.state.devbookSeen ?? 0), newest: C.newestAt(entries) };
}

// the one write: the whole page row, from the caches
function render(ctx, patch = {}) {
  const me = ctx.self, L = me$(ctx), prev = me.state.devbook ?? {};
  const st = { open: false, day: null, days: [], page: 0, pages: 1, filter: 'all', q: '', sel: null, unread: 0, entries: [], selEntry: null, ...prev, ...patch };
  const days = dayList(ctx);
  st.days = days.slice(0, 90);
  if (!st.day || !days.includes(st.day)) st.day = days[0] ?? null;
  const entries = st.day ? readDay(ctx, st.day) : [];
  const soc = social.get(st.day) ?? { rows: [], metas: {} };
  const reacts = C.foldReacts(soc.rows, me.userId, soc.metas);
  const list = C.selectEntries(entries, { filter: st.filter, q: st.q, reacts, metas: soc.metas });
  const pg = C.paginate(list, st.page);
  st.page = pg.page; st.pages = pg.pages;
  st.entries = pg.slice.map((e) => C.shapeEntry(e, { reacts: reacts[e.id], meta: soc.metas[e.id], full: L.expanded.has(e.id) }));
  const se = st.sel ? entries.find((e) => e.id === st.sel) : null;
  st.sel = se ? se.id : null;
  st.selEntry = se ? C.shapeEntry(se, { reacts: reacts[se.id], meta: soc.metas[se.id], full: true }) : null;
  st.unread = st.open ? 0 : unreadOf(ctx, days).unread;
  me.state.devbook = st;
  return st;
}

function bump(ctx, day, id) {
  ctx.world.state.devbookRev = { n: `${ctx.now()}:${Math.floor(ctx.random() * 1e9)}`, day, id };
  me$(ctx).rev = ctx.world.state.devbookRev.n; // our own book is already fresh
}

export function onSpawn(ctx) {
  const st = ctx.self.state.devbook;
  if (st?.open) ctx.self.state.devbook = { ...st, open: false }; // a fresh visit starts with the book shut
}

export function onInput(ctx, input) {
  if (!input.pressed?.devbook) return;
  handle(ctx, input.actionData?.devbook ?? {}).catch((e) => log(ctx, 'op', e));
}

async function handle(ctx, p) {
  const me = ctx.self, acc = devbookAccess(ctx.world.state, me), L = me$(ctx);
  if (!acc.see) return;
  const st = me.state.devbook ?? {}, day = st.day;
  switch (p.op) {
    case 'open': {
      const days = dayList(ctx), d = st.day && days.includes(st.day) ? st.day : days[0];
      me.state.devbookSeen = Math.max(me.state.devbookSeen ?? 0, unreadOf(ctx, days).newest);
      render(ctx, { open: true, day: d ?? null });
      if (d) { await loadSocial(ctx, d); render(ctx); }
      return;
    }
    case 'close': render(ctx, { open: false, sel: null }); return;
    case 'day': {
      if (!C.isDay(p.day)) return;
      render(ctx, { day: p.day, page: 0, sel: null });
      if (!social.has(p.day)) { await loadSocial(ctx, p.day); render(ctx); }
      return;
    }
    case 'page': render(ctx, { page: Math.floor(+p.n || 0) }); return;
    case 'filter': render(ctx, { filter: C.cleanFilter(p.f), page: 0 }); return;
    case 'search': render(ctx, { q: C.cleanQ(p.q), page: 0 }); return;
    case 'select': render(ctx, { sel: p.id == null ? null : String(p.id) }); return;
    case 'expand': if (p.id != null) { L.expanded.add(String(p.id)); if (L.expanded.size > 40) L.expanded.delete(L.expanded.values().next().value); } render(ctx); return;
    case 'react': case 'unreact': {
      const id = String(p.id ?? ''), emoji = p.emoji, on = p.op === 'react';
      if (!acc.react) { toast(ctx, 'Only the den\'s builders can react in the Dev Tracker.'); return; }
      if (!id || !C.isReact(emoji) || !day || !readDay(ctx, day).some((e) => e.id === id)) return;
      const uid = me.userId || me.id, name = me.displayName || 'someone';
      const soc = social.get(day) ?? { rows: [], metas: {} };
      soc.rows = soc.rows.filter((r) => !(r.msg_id === id && r.user_id === uid && r.emoji === emoji));
      if (on) soc.rows.push({ msg_id: id, user_id: uid, name, emoji });
      social.set(day, soc);
      render(ctx); // optimistic: the chip springs now, SQL catches up
      ctx.emit('uiEvent', { name: 'devbook:react', payload: { id, emoji, on } }, { audience: { player: me.id } });
      try {
        await ensure(ctx);
        if (on) await ctx.sql`INSERT INTO devlog_react (msg_id, user_id, name, emoji, at) VALUES (${id}, @caller, ${name}, ${emoji}, ${ctx.now()}) ON CONFLICT (msg_id, user_id, emoji) DO NOTHING`;
        else await ctx.sql`DELETE FROM devlog_react WHERE msg_id = ${id} AND user_id = @caller AND emoji = ${emoji}`;
      } catch (e) { log(ctx, 'react', e); }
      await loadSocial(ctx, day); render(ctx); bump(ctx, day, id);
      return;
    }
    case 'pin': {
      const id = String(p.id ?? ''), on = !!p.on;
      if (!me.isEditor || !id || !day) return;
      const soc = social.get(day) ?? { rows: [], metas: {} };
      soc.metas[id] = { ...(soc.metas[id] ?? { msg_id: id }), pinned: on ? 1 : 0 };
      social.set(day, soc); render(ctx);
      try {
        await ensure(ctx);
        await ctx.sql`INSERT INTO devlog_meta (msg_id, pinned, pinned_by, at) VALUES (${id}, ${on ? 1 : 0}, ${me.displayName || 'editor'}, ${ctx.now()}) ON CONFLICT (msg_id) DO UPDATE SET pinned = excluded.pinned, pinned_by = excluded.pinned_by`;
      } catch (e) { log(ctx, 'pin', e); }
      await loadSocial(ctx, day); render(ctx); bump(ctx, day, id);
      return;
    }
  }
}

export function update(ctx) {
  const me = ctx.self, acc = devbookAccess(ctx.world.state, me), L = me$(ctx), now = ctx.now();
  const st = me.state.devbook;
  if (!acc.see) { if (st?.open) me.state.devbook = { ...st, open: false }; return; }
  // the badge + new lines from the bridge: one poll every 15 s
  if (now - L.poll > POLL_MS) {
    L.poll = now;
    if (st?.open) render(ctx);
    else { const u = unreadOf(ctx, dayList(ctx)).unread; if (!st || st.unread !== u) me.state.devbook = { ...(st ?? { open: false, entries: [] }), unread: u }; }
  }
  if (!st?.open) return;
  // someone reacted / pinned / JEV read an entry on our day
  const rev = ctx.world.state.devbookRev;
  if (rev?.n && rev.n !== L.rev) {
    L.rev = rev.n;
    if (rev.day === st.day) loadSocial(ctx, st.day).then(() => render(ctx)).catch((e) => log(ctx, 'rev', e));
  }
  // JEV reads what is on the open page, one entry at a time, editors' books only
  if (!me.isEditor || now - jevBusyAt < 20000 || now < L.jevAt || !st.day) return;
  L.jevAt = now + JEV_GAP_MS;
  const metas = social.get(st.day)?.metas; if (!metas) return;
  const want = (st.selEntry && !metas[st.selEntry.id]?.kind && !asked.has(st.selEntry.id) ? [st.selEntry] : [])
    .concat(st.entries ?? []).find((e) => !metas[e.id]?.kind && !asked.has(e.id));
  if (!want) return;
  const entry = readDay(ctx, st.day).find((e) => e.id === want.id); if (!entry) return;
  asked.add(entry.id);
  if (!allow(ctx, JEV_LANE)) return;
  jevBusyAt = now; meter(ctx, JEV_LANE);
  ctx.job('jev:decide', C.jevAsk(entry), 'devbookJev', { id: entry.id, day: st.day });
}

export async function devbookJev(ctx, r, payload) {
  jevBusyAt = 0;
  const { id, day } = payload ?? {};
  if (!r?.ok) { meter(ctx, JEV_LANE, 'fail', r); asked.delete(id); return; }
  const m = C.jevMeta(r.data?.answers, [ctx.random(), ctx.random(), ctx.random(), ctx.random(), ctx.random()]);
  if (!m || !id) return;
  try {
    await ensure(ctx);
    await ctx.sql`INSERT INTO devlog_meta (msg_id, kind, weight, pin, jev_emoji, mood, at) VALUES (${id}, ${m.kind}, ${m.weight}, ${m.pin}, ${m.jev_emoji}, ${m.mood}, ${ctx.now()}) ON CONFLICT (msg_id) DO UPDATE SET kind = excluded.kind, weight = excluded.weight, pin = excluded.pin, jev_emoji = excluded.jev_emoji, mood = excluded.mood, at = excluded.at`;
  } catch (e) { log(ctx, 'jev save', e); return; }
  await loadSocial(ctx, day);
  if (ctx.self.state.devbook?.open && ctx.self.state.devbook.day === day) render(ctx);
  bump(ctx, day, id);
}
