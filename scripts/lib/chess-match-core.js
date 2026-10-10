// The chess match at the north bench — body of scripts/lore-tafl.js on the board row (lore-hnefatafl).
// Every number is in ./data/chess.js (CHESS). Live game: board.state.chess (the contract shape); the referee's own
// bookkeeping: board.state.match. Loop: think (engine job → jev mind → sampled pick) → move (motion lane) → settle
// (check / mate / draw) → think … → mate pause → reset, colours swap. Holds while the place is empty.
import { scaleFor } from './data/ai-budget.js'; // HEIMDALL H2
import { meter } from './jev-meter.js';
import { chessCap } from './data/jev-master.js'; // JEV-MASTER-v3a L2
import { CHESS, squareWorld } from './data/chess.js';
import * as R from './chess-rules.js';

// ── rules: scripts/lib/chess-rules.js (the engine lane's pure rules) ─────────────────────────────────────
const START = R.START_FEN;
const VAL = [0, 100, 320, 330, 500, 900, 0];
function material(pos) { const m = { w: 0, b: 0 }; for (const x of pos.b) if (x) m[x & 8 ? 'b' : 'w'] += VAL[x & 7]; return m; }

// ── the table ───────────────────────────────────────────────────────────────────────────────────────────
const BACK = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], FILES = 'abcdefgh';
const pid = (i) => CHESS.pieceIds + i;
function initial(i) { // 0–7 white spearmen a2–h2, 8–15 white back rank a1–h1, 16–23 black spearmen, 24–31 black back rank
  const side = i < 16 ? 'w' : 'b', j = i % 16, pawn = j < 8, f = j % 8;
  return { side, kind: pawn ? 'p' : BACK[f], sq: FILES[f] + (side === 'w' ? (pawn ? 2 : 1) : (pawn ? 7 : 8)) };
}
const seatOf = (side, ws) => (side === 'w' ? ws : ws === 'low' ? 'high' : 'low');
const yawFor = (side, ws) => (seatOf(side, ws) === 'low' ? -90 : 90); // low seat faces +X, high faces -X
const who = (side, ws) => (seatOf(side, ws) === CHESS.players.gunnar.seat ? 'gunnar' : 'sigrid');
const primOf = (kind, side) => ({ kind: 'scripted', script: 'scripts/gen/chess-piece.js', params: { kind, side } });
function railSpot(side, n) { // captured pieces: white's on the north rail, black's on the south, lined up by capture order
  const B = CHESS.board, col = n % 8, row = Math.floor(n / 8), dz = side === 'w' ? 1 : -1;
  return { x: B.center.x + (col - 3.5) * B.square, y: B.topY, z: B.center.z + dz * (0.36 + row * 0.06) };
}
function placePieces(ctx, ws) {
  let made = 0;
  for (let i = 0; i < 32; i++) {
    const a = initial(i), id = pid(i), pos = squareWorld(a.sq, ws), o = ctx.getObject(id);
    const state = { kind: a.kind, side: a.side, sq: a.sq, captured: false };
    if (!o) {
      const spec = { id, primitive: primOf(a.kind, a.side), feetPosition: pos, rotation: { yaw: yawFor(a.side, ws) }, state, tags: ['chess-piece'] };
      try { ctx.spawn({ template: 'templates/chess-piece.js#piece', ...spec }); made++; }
      catch (e) { try { ctx.spawn(spec); made++; } catch (e2) { ctx.log('chess: piece spawn failed', { id, e: String(e2) }); } }
      continue;
    }
    if (o.state?.kind !== a.kind) o.primitive = primOf(a.kind, a.side); // a promoted spearman goes back to being one
    o.feetPosition = pos; o.rotation = { yaw: yawFor(a.side, ws) }; o.state = state;
  }
  return made;
}
function pieceAt(ctx, sq) {
  for (let i = 0; i < 32; i++) { const o = ctx.getObject(pid(i)); if (o && !o.state?.captured && o.state?.sq === sq) return o; }
  return null;
}
async function mod(ctx, path) { try { return await import(path); } catch (e) { return null; } }
function react(ctx, event, data) { import('./chess-react.js').then((m) => m.react?.(ctx, event, data)).catch(() => {}); }
function tempo(ctx) { const o = ctx.self.state.tempoOverride; return o ? { ...CHESS.tempo, ...o, think: { ...CHESS.tempo.think, ...(o.think || {}) } } : CHESS.tempo; }
const board = (ctx) => ctx.self.state;

function newGame(ctx) {
  const s = board(ctx), m = s.match ?? {}, games = m.games ?? 0;
  const ws = games % 2 === 0 ? 'low' : 'high'; // Gunnar (low seat) has white first, then colours alternate
  s.chess = { fen: START, whiteSeat: ws, ply: 0, moveNo: 1, turn: 'w', phase: 'think', last: null, history: [], check: false, result: null, thinkingSince: ctx.now() };
  s.match = { games, rail: { w: 0, b: 0 }, recent: { gunnar: [], sigrid: [] }, waiting: null, pick: null, retryAt: 0, moveAt: 0, moveEnd: 0, resetAt: 0 };
  const made = placePieces(ctx, ws);
  ctx.log('chess: new game', { games, whiteSeat: ws, made });
}
export function onSpawn(ctx) {
  const s = board(ctx);
  if (!s.chess?.fen || !s.match) newGame(ctx);
  else { s.match.waiting = null; for (let i = 0; i < 32; i++) if (!ctx.getObject(pid(i))) { placePieces(ctx, s.chess.whiteSeat); break; } }
}
// ── the loop ────────────────────────────────────────────────────────────────────────────────────────────
export function update(ctx) {
  if (!ctx.place.players.length) { ctx.sleep(5); return; }
  const s = board(ctx);
  if (!s.chess?.fen || !s.match) newGame(ctx);
  const c = s.chess, m = s.match, now = ctx.now();
  let wake = 1;
  if (c.phase === 'think') {
    if (m.pick) { if (now >= m.moveAt) { play(ctx); wake = 0.5; } else wake = (m.moveAt - now) / 1000; }
    else if (now < (m.retryAt ?? 0)) wake = (m.retryAt - now) / 1000;
    else if (m.waiting?.what === 'mind' && now - m.waiting.at > (tempo(ctx).mindWait ?? 20) * 1000) onMind(ctx, { r: null, p: { ply: c.ply, game: m.games } }); // a silent mind: the fallback plays
    else if (!m.waiting || now - m.waiting.at > 40000) askEngine(ctx);
    else wake = 2;
  } else if (c.phase === 'move') {
    if (now >= m.moveEnd) { settle(ctx); wake = 0.3; } else wake = (m.moveEnd - now) / 1000;
  } else if (c.phase === 'mate') {
    if (now >= m.resetAt) { m.games = (m.games ?? 0) + 1; react(ctx, 'reset', { games: m.games }); newGame(ctx); wake = 1; }
    else wake = (m.resetAt - now) / 1000;
  } else newGame(ctx);
  ctx.sleep(Math.max(0.1, Math.min(5, wake)));
}
function mover(ctx) { const c = board(ctx).chess; return who(c.turn, c.whiteSeat); }
function askEngine(ctx) {
  const s = board(ctx), c = s.chess, me = mover(ctx), E = CHESS.engine[me];
  s.match.waiting = { what: 'engine', ply: c.ply, at: ctx.now() };
  if (!s.match.thinkSaid) { s.match.thinkSaid = c.ply; react(ctx, 'think', { mover: me, ply: c.ply, fen: c.fen }); }
  ctx.job('chess', { fen: c.fen, depth: E.depth, quiescence: E.quiescence, candidates: CHESS.engine.candidates, history: c.history }, 'onEngine', { ply: c.ply, game: s.match.games });
}
const stale = (ctx, p, what) => { const s = board(ctx); return !p || p.ply !== s.chess.ply || p.game !== s.match.games || s.chess.phase !== 'think' || s.match.waiting?.what !== what; };
// match any engine answer shape to one of the legal moves
function matchMove(pos, moves, e) {
  const u = typeof e === 'string' ? e : e.uci ?? (e.from && e.to ? e.from + e.to + (e.promotion ?? e.promo ?? '') : null) ?? (typeof e.move === 'string' ? e.move : e.move?.uci);
  if (u && /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(u)) return moves.find((m) => m.uci === u.toLowerCase()) ?? null;
  const sn = e.san ?? u; return sn ? R.moveFromSan(pos, sn) : null;
}
function candidateRow(pos, m, score, i) {
  const s = R.toSan(pos, m);
  return { id: 'c' + i, uci: m.uci, san: s, words: R.words(m, pos), scoreFromMyView: Math.round(score), capture: !!m.captured, check: /[+#]$/.test(s) };
}
export function onEngine(ctx, { r, p } = {}) {
  if (stale(ctx, p, 'engine')) return;
  const s = board(ctx), c = s.chess, m = s.match, me = mover(ctx);
  if (!r?.ok) { m.waiting = null; m.retryAt = ctx.now() + 5000; ctx.log('chess: engine not ok', { e: r?.error }); return; }
  const pos = R.parseFen(c.fen), moves = R.legalMoves(pos);
  const raw = r.data?.candidates ?? r.data?.moves ?? r.data?.top ?? (Array.isArray(r.data) ? r.data : []);
  const cands = [];
  for (const e of raw) {
    const mv = matchMove(pos, moves, e); if (!mv || cands.some((x) => x.uci === mv.uci)) continue;
    cands.push(candidateRow(pos, mv, +(e.score ?? e.cp ?? e.eval ?? 0), cands.length));
    if (cands.length >= CHESS.engine.candidates) break;
  }
  if (!cands.length) { m.waiting = null; m.retryAt = ctx.now() + 5000; ctx.log('chess: engine gave no usable move', { raw: JSON.stringify(r.data).slice(0, 200) }); return; }
  cands.sort((a, b) => b.scoreFromMyView - a.scoreFromMyView);
  cands.forEach((x, i) => { x.id = 'c' + i; });
  if (moves.length === 1) { m.cands = cands; choose(ctx, cands[0], 'forced'); return; } // only one legal move: no JEV ask, the same move without the wait
  m.cands = cands;
  // Sigrid's blunder: sometimes she plays from her gut — any legal move, the flashy ones likelier
  const B = CHESS.mind[me].blunder ?? 0;
  if (B > 0 && ctx.random() < B) {
    const w = moves.map((mv) => 1 + (mv.captured ? 3 : 0) + (R.inCheck(R.makeMove(pos, mv)) ? 3 : 0));
    let roll = ctx.random() * w.reduce((a, b) => a + b, 0), k = 0;
    while ((roll -= w[k]) > 0 && k < w.length - 1) k++;
    choose(ctx, candidateRow(pos, moves[k], cands.find((x) => x.uci === moves[k].uci)?.scoreFromMyView ?? cands[cands.length - 1].scoreFromMyView - 100, 9), 'gut');
    return;
  }
  // JEV-LOAD L3: the mind may only pick inside its window; one candidate there = the move it would pick, no ask
  const ok = inWindow(cands, me);
  if (CHESS.mind.clearSkip && ok.length === 1) { choose(ctx, ok[0], 'clear'); return; }
  // JEV-LOAD K2: nobody near the bench to watch = the mind's own fallback pick, same clock and motion
  if (!anyoneNear(ctx)) { choose(ctx, fallbackPick(ctx, cands, me), 'nobody-near'); return; }
  // CHESS-TENTH: the mind is asked on a big moment only, inside an hourly budget; else the style pick plays on the same clock
  if (!mindTurn(ctx, m, c, ok, me)) { choose(ctx, fallbackPick(ctx, cands, me), 'style'); return; }
  const P = CHESS.players[me], opp = me === 'gunnar' ? 'sigrid' : 'gunnar', mat = material(pos), mine = c.turn, theirs = mine === 'w' ? 'b' : 'w';
  m.waiting = { what: 'mind', ply: c.ply, at: ctx.now() };
  const criteria = {}; for (const x of cands) criteria[x.id] = `${x.san}: ${x.words} (engine ${x.scoreFromMyView >= 0 ? '+' : ''}${(x.scoreFromMyView / 100).toFixed(2)})`;
  meter(ctx,'chess');ctx.job('jev:decide', {
    state: {
      me: P.name, elo: P.elo, style: CHESS.mind[me].style, opponent: CHESS.players[opp].name, moveNo: c.moveNo,
      material: { mine: mat[mine], theirs: mat[theirs] }, inCheck: !!c.check, lastOpponentMove: c.last?.by === opp ? c.last.san : null,
      recent: (m.recent?.[me] ?? []).slice(-4),
      candidates: cands.map(({ id, capture, check }) => ({ id, capture, check })), // san, words and score ride once, in the criteria
    },
    questions: { move: { type: 'choice', instructions: `You are ${P.name}, a ${P.elo} Elo Viking chess player: ${CHESS.mind[me].style}. Which candidate do you play?`, criteria } },
  }, 'onMind', { ply: c.ply, game: m.games });
}
export function onMind(ctx, { r, p } = {}) {
  if (stale(ctx, p, 'mind')) return;
  const s = board(ctx), m = s.match, me = mover(ctx), cands = m.cands ?? [];
  if (!cands.length) { m.waiting = null; return; }
  const ok = inWindow(cands, me);
  let pick = null, how = 'mind';
  const probs = r?.ok ? r.data?.answers?.move?.probabilities : null;
  if (probs) {
    const w = ok.map((x) => Math.max(0, +probs[x.id] || 0)), tot = w.reduce((a, b) => a + b, 0);
    if (tot > 0) { let roll = ctx.random() * tot; for (let i = 0; i < ok.length; i++) if ((roll -= w[i]) <= 0) { pick = ok[i]; break; } pick ??= ok[ok.length - 1]; }
  }
  if (!pick) { how = 'fallback'; pick = fallbackPick(ctx, cands, me); }
  choose(ctx, pick, how);
}
// CHESS-TENTH: a big moment (check, a capture just landed, a sharp/quiet choice in the window) and budget left this hour
function mindTurn(ctx, m, c, ok, me) {
  const J = CHESS.mind.jevBudget; if (!J) return true;
  const h = Math.floor(ctx.now() / 3600e3);
  if (m.jevHour?.h !== h) m.jevHour = { h, n: 0 };
  if (m.jevHour.n >= Math.min(J.perHour, Math.floor(chessCap(ctx.world.state.jevMaster) * scaleFor(ctx, 'chess')))) return false;
  const opp = me === 'gunnar' ? 'sigrid' : 'gunnar';
  const sharp = ok.some((x) => x.capture || x.check), quiet = ok.some((x) => !x.capture && !x.check);
  const big = !!c.check || (c.last?.by === opp && /x/.test(c.last?.san ?? '')) || (sharp && quiet);
  if (J.bigOnly && !big) return false;
  m.jevHour = { h, n: m.jevHour.n + 1 };
  return true;
}
// the mind's window: candidates within CHESS.mind[me].window cp of the best (cands sorted best first)
function inWindow(cands, me) { const best = cands[0].scoreFromMyView, win = CHESS.mind[me].window; return cands.filter((x) => x.scoreFromMyView >= best - win); }
// no mind: Gunnar plays the best line, Sigrid a softmax over the engine's scores (T = 150 cp)
function fallbackPick(ctx, cands, me) {
  if (me === 'gunnar') return cands[0];
  const best = cands[0].scoreFromMyView, w = cands.map((x) => Math.exp((x.scoreFromMyView - best) / 150));
  let roll = ctx.random() * w.reduce((a, b) => a + b, 0);
  return cands.find((x, i) => (roll -= w[i]) <= 0) ?? cands[0];
}
// a player within CHESS.mind.nearM (horizontal) of the board centre
function anyoneNear(ctx) {
  const B = CHESS.board.center, r = CHESS.mind.nearM ?? 15;
  if (!(r > 0)) return true;
  for (const p of ctx.place.players ?? []) { const f = p.feetPosition; if (f && Math.hypot(f.x - B.x, f.z - B.z) <= r) return true; }
  return false;
}
function choose(ctx, pick, how) {
  const s = board(ctx), c = s.chess, m = s.match, me = mover(ctx), T = tempo(ctx), [lo, hi] = T.think[me];
  const sc = (m.cands ?? []).map((x) => x.scoreFromMyView), spread = sc.length ? Math.max(...sc) - Math.min(...sc) : 0;
  const tension = Math.min(1, Math.abs(spread) / 300 + (c.check ? 0.35 : 0));
  const myMove = Math.floor(c.ply / 2) + 1;
  const secs = me === 'gunnar' && myMove <= T.openingFast ? lo + (hi - lo) * 0.12 * ctx.random()
    : lo + (hi - lo) * Math.min(1, 0.15 + 0.6 * tension + 0.25 * ctx.random());
  m.pick = { ...pick, how }; m.waiting = null; m.cands = null; // spent once picked: off row state (catch-up weight)
  m.moveAt = Math.max(ctx.now(), (c.thinkingSince ?? ctx.now()) + secs * 1000);
  ctx.log('chess: pick', { me, san: pick.san, how, secs: +secs.toFixed(1) });
}
// ── the move ────────────────────────────────────────────────────────────────────────────────────────────
function play(ctx) {
  const s = board(ctx), c = s.chess, m = s.match, pick = m.pick, me = mover(ctx);
  const pos = R.parseFen(c.fen), mv = R.moveFromUci(pos, pick.uci);
  m.pick = null;
  if (!mv) { ctx.log('chess: picked move not legal here', { uci: pick.uci, fen: c.fen }); return; }
  const from = mv.from, to = mv.to, piece = pieceAt(ctx, from);
  const capSq = mv.ep ? R.sqName(mv.t + (pos.turn === 'w' ? -8 : 8)) : mv.captured ? to : null, capP = capSq ? pieceAt(ctx, capSq) : null;
  const rank = pos.turn === 'w' ? '1' : '8';
  const castleRook = mv.castle ? { from: (mv.castle === 'K' ? 'h' : 'a') + rank, to: (mv.castle === 'K' ? 'f' : 'd') + rank } : null;
  const rookP = castleRook ? pieceAt(ctx, castleRook.from) : null;
  if (castleRook) castleRook.pieceId = rookP?.id ?? null;
  const n = R.makeMove(pos, mv), fen = R.toFen(n), capSide = capP?.state?.side ?? (pos.turn === 'w' ? 'b' : 'w');
  const railN = capSq ? (m.rail[capSide] ?? 0) : 0, captureTo = capSq ? railSpot(capSide, railN) : null;
  // the board's truth moves at once; the pieces follow the hands
  if (piece) { piece.state = { ...piece.state, sq: to, ...(mv.promo ? { kind: mv.promo } : {}) }; }
  if (capP) { capP.state = { ...capP.state, captured: true, sq: null, rail: railN }; m.rail[capSide] = railN + 1; }
  if (rookP) rookP.state = { ...rookP.state, sq: castleRook.to };
  c.fen = fen; c.ply += 1; c.turn = n.turn; c.moveNo = n.full; c.phase = 'move'; c.check = R.inCheck(n);
  c.history = [...c.history, pick.san];
  c.last = { by: me, san: pick.san, from, to, words: pick.words };
  m.recent[me] = [...(m.recent[me] ?? []), pick.san].slice(-4);
  m.pending = { pieceId: piece?.id ?? null, to, captureId: capP?.id ?? null, captureTo, rookId: rookP?.id ?? null, rookTo: castleRook?.to ?? null, promo: mv.promo ?? null, side: pos.turn };
  m.moveEnd = ctx.now() + (CHESS.tempo.reach + CHESS.tempo.carry + CHESS.tempo.settle) * 1000;
  m.thinkSaid = null;
  const args = { mover: me, pieceId: piece?.id ?? null, from, to, captureId: capP?.id ?? null, captureTo, castleRook, promotion: mv.promo ?? null, whiteSeat: c.whiteSeat };
  const game = m.games, ply = c.ply;
  mod(ctx, './chess-motion.js').then(async (M) => {
    let secs = null;
    if (M?.animateMove) { try { secs = await M.animateMove(ctx, args); } catch (e) { ctx.log('chess: animateMove threw', { e: String(e) }); } }
    const s2 = board(ctx);
    if (s2.match.games !== game || s2.chess.ply !== ply) return;
    if (typeof secs === 'number' && secs > 0) s2.match.moveEnd = ctx.now() + secs * 1000; // settle when the hand lets go
    else if (!M?.animateMove) snap(ctx);
  });
}
function snap(ctx) { // the pieces stand exactly where the board says (motion missing, or a hand that fell short)
  const s = board(ctx), c = s.chess, P = s.match.pending; if (!P) return;
  const near = (a, b) => a && b && Math.abs(a.x - b.x) + Math.abs(a.z - b.z) + Math.abs(a.y - b.y) < 0.01;
  const put = (id, pos) => { const o = id && ctx.getObject(id); if (o && !near(o.feetPosition, pos)) o.feetPosition = pos; };
  if (P.pieceId) put(P.pieceId, squareWorld(P.to, c.whiteSeat));
  if (P.rookId) put(P.rookId, squareWorld(P.rookTo, c.whiteSeat));
  if (P.captureId && P.captureTo) put(P.captureId, P.captureTo);
  if (P.promo && P.pieceId) { const o = ctx.getObject(P.pieceId); if (o && o.primitive?.params?.kind !== P.promo) o.primitive = primOf(P.promo, P.side); }
}
function settle(ctx) {
  snap(ctx);
  const s = board(ctx), c = s.chess, m = s.match, P = m.pending ?? {}, n = R.parseFen(c.fen), last = c.last;
  const data = { mover: last?.by, san: last?.san, from: last?.from, to: last?.to, pieceId: P.pieceId, captureId: P.captureId, whiteSeat: c.whiteSeat, ply: c.ply };
  m.pending = null;
  react(ctx, 'move', data);
  if (P.captureId) react(ctx, 'capture', data);
  const st = R.status(n, c.history, START);
  let result = null, why = null;
  if (st === 'mate') { result = n.turn === 'w' ? '0-1' : '1-0'; why = 'mate'; }
  else if (st !== 'play') { result = '1/2'; why = st; }
  else if (c.ply >= tempo(ctx).maxPlies) { result = '1/2'; why = 'long night'; }
  if (!result) {
    if (c.check) react(ctx, 'check', data);
    c.phase = 'think'; c.thinkingSince = ctx.now();
    return;
  }
  const white = who('w', c.whiteSeat), black = who('b', c.whiteSeat), winner = result === '1-0' ? white : result === '0-1' ? black : null;
  c.result = result; c.phase = 'mate'; c.why = why;
  m.resetAt = ctx.now() + tempo(ctx).matePause * 1000;
  react(ctx, winner ? 'mate' : 'draw', { ...data, result, winner, why });
  let pgn = ''; c.history.forEach((x, i) => { pgn += (i % 2 === 0 ? `${i / 2 + 1}. ` : '') + x + ' '; }); pgn += result === '1/2' ? '1/2-1/2' : result;
  mod(ctx, './chess-record.js').then((M) => { try { M?.recordResult?.(ctx, { white, black, result, winner, plies: c.ply, pgn }); } catch (e) { ctx.log('chess: record threw', { e: String(e) }); } });
  ctx.log('chess: game over', { result, why, plies: c.ply });
}
