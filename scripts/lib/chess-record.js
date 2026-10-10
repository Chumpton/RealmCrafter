// The forever chess score. SQL is the truth (one table every room reads); the rune board row mirrors it.
// recordResult(ctx, { white, black, result, winner, plies, pgn }, { table }) — one row of history at the end of a game, then the mirror refreshes.
// loadRecord(ctx, { table }) — totals + the last 30 results onto row chess-runeboard state { gunnar:{w,d,l}, sigrid:{w,d,l}, games, tally } — the panel's .k<g|s|d|e> classes carry the notch look.
// table: 'chess_record' (the real one, default) | 'chess_record_test' (proofs; the real record stays clean).
import { CHESS } from './data/chess.js';
const Q = { // identifiers never bind, so each table spells its own statements
  chess_record: {
    create: (ctx) => ctx.sql`CREATE TABLE IF NOT EXISTS chess_record (id INTEGER PRIMARY KEY AUTOINCREMENT, white TEXT NOT NULL, black TEXT NOT NULL, result TEXT NOT NULL, winner TEXT, loser TEXT, plies INTEGER, pgn TEXT, at INTEGER NOT NULL)`,
    insert: (ctx, r) => ctx.sql`INSERT INTO chess_record (white, black, result, winner, loser, plies, pgn, at) VALUES (${r.white}, ${r.black}, ${r.result}, ${r.winner}, ${r.loser}, ${r.plies}, ${r.pgn}, ${r.at})`,
    totals: (ctx) => ctx.sql`SELECT COALESCE(winner, 'd') AS who, COUNT(*) AS n FROM chess_record GROUP BY winner`,
    last: (ctx) => ctx.sql`SELECT winner FROM chess_record ORDER BY id DESC LIMIT 30`,
  },
  chess_record_test: {
    create: (ctx) => ctx.sql`CREATE TABLE IF NOT EXISTS chess_record_test (id INTEGER PRIMARY KEY AUTOINCREMENT, white TEXT NOT NULL, black TEXT NOT NULL, result TEXT NOT NULL, winner TEXT, loser TEXT, plies INTEGER, pgn TEXT, at INTEGER NOT NULL)`,
    insert: (ctx, r) => ctx.sql`INSERT INTO chess_record_test (white, black, result, winner, loser, plies, pgn, at) VALUES (${r.white}, ${r.black}, ${r.result}, ${r.winner}, ${r.loser}, ${r.plies}, ${r.pgn}, ${r.at})`,
    totals: (ctx) => ctx.sql`SELECT COALESCE(winner, 'd') AS who, COUNT(*) AS n FROM chess_record_test GROUP BY winner`,
    last: (ctx) => ctx.sql`SELECT winner FROM chess_record_test ORDER BY id DESC LIMIT 30`,
  },
};
const made = {};
const tableOf = (opt) => (opt && Q[opt.table] ? opt.table : 'chess_record');
async function ensure(ctx, t) {
  if (made[t]) return;
  try { await Q[t].create(ctx); made[t] = true; } catch (e) { ctx.log?.('chess-record: create ' + t, String(e?.message ?? e)); }
}
// 'Gunnar' | 'lore-tafl-bearded' | 'gunnar' → 'gunnar'; same for Sigrid; anything else → null
export function who(v) {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s.includes('gun') || s === CHESS.players.gunnar.id || s === 'low') return 'gunnar';
  if (s.includes('sig') || s === CHESS.players.sigrid.id || s === 'high') return 'sigrid';
  return null;
}
export async function recordResult(ctx, game = {}, opt) {
  const t = tableOf(opt);
  await ensure(ctx, t);
  const white = who(game.white) ?? 'gunnar', black = who(game.black) ?? (white === 'gunnar' ? 'sigrid' : 'gunnar');
  let result = String(game.result ?? '');
  let winner = who(game.winner);
  if (!winner && result === '1-0') winner = white;
  if (!winner && result === '0-1') winner = black;
  if (!result) result = winner ? (winner === white ? '1-0' : '0-1') : '1/2-1/2';
  const row = { white, black, result, winner, loser: winner ? (winner === 'gunnar' ? 'sigrid' : 'gunnar') : null, plies: Math.round(game.plies ?? 0), pgn: String(game.pgn ?? '').slice(0, 8000), at: ctx.now() };
  const r = await Q[t].insert(ctx, row);
  const record = await loadRecord(ctx, opt);
  return { id: r?.lastInsertRowid ?? null, row, record };
}
export async function loadRecord(ctx, opt) {
  const t = tableOf(opt);
  await ensure(ctx, t);
  const [tot, last] = [await Q[t].totals(ctx), await Q[t].last(ctx)];
  const n = { gunnar: 0, sigrid: 0, d: 0 };
  for (const r of tot?.rows ?? []) { const k = r.who === 'd' ? 'd' : who(r.who); if (k) n[k] += Number(r.n) || 0; }
  const tally = (last?.rows ?? []).map((r) => (who(r.winner) === 'gunnar' ? 'g' : who(r.winner) === 'sigrid' ? 's' : 'd')).reverse();
  const rec = {
    gunnar: { w: n.gunnar, d: n.d, l: n.sigrid },
    sigrid: { w: n.sigrid, d: n.d, l: n.gunnar },
    games: n.gunnar + n.sigrid + n.d,
    tally,
  };
  const row = ctx.getObject(CHESS.tracker.id);
  if (row) {
    const s = row.state;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (!same(s.gunnar, rec.gunnar)) s.gunnar = rec.gunnar;
    if (!same(s.sigrid, rec.sigrid)) s.sigrid = rec.sigrid;
    if (s.games !== rec.games) s.games = rec.games;
    if (!same(s.tally, rec.tally)) s.tally = rec.tally; // the panel draws each notch from tally[i] (g/s/d, uncut = e)
    if (s.nk) delete s.nk;
    if (s.source !== t) s.source = t;
  }
  return rec;
}
