// Chess rules — pure, no ctx (design.md "Chess at the north bench", lane: brain).
// Position: { b: number[64] (a1=0 … h8=63; 0 empty, P1 N2 B3 R4 Q5 K6, black +8), side 0|1, turn 'w'|'b',
//   castle bits (1 K, 2 Q, 4 k, 8 q), ep square index or -1, half, full, kings [w, b] }.
// Move object (legalMoves): { from:'e2', to:'e4', f, t, piece:'p', side:'w', captured:'n'|null, promo:'q'|null,
//   ep, castle:'K'|'Q'|null, uci, m (packed int) }. makeMove takes a move object, a uci or a SAN string.
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const KIND_NAMES = { k: 'jarl', q: 'seeress', b: 'shieldmaiden', n: 'horse', r: 'longship', p: 'spearman' };
const LETTERS = ' pnbrqk';
const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;

// ---------- tables ----------
const KN = [], KG = [], RAYS = [[], [], [], [], [], [], [], []];
const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
for (let s = 0; s < 64; s++) {
  const f = s & 7, r = s >> 3;
  KN[s] = []; KG[s] = [];
  for (const [df, dr] of [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]) {
    const ff = f + df, rr = r + dr; if (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) KN[s].push(rr * 8 + ff);
  }
  for (let d = 0; d < 8; d++) {
    const [df, dr] = DIRS[d];
    const ff = f + df, rr = r + dr; if (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) KG[s].push(rr * 8 + ff);
    const ray = []; let x = f + df, y = r + dr;
    while (x >= 0 && x < 8 && y >= 0 && y < 8) { ray.push(y * 8 + x); x += df; y += dr; }
    RAYS[d][s] = ray;
  }
}
const CR = new Array(64).fill(15); CR[0] = 13; CR[4] = 12; CR[7] = 14; CR[56] = 7; CR[60] = 3; CR[63] = 11;

export const sqName = (s) => String.fromCharCode(97 + (s & 7)) + ((s >> 3) + 1);
export const sqIndex = (n) => (n.charCodeAt(1) - 49) * 8 + (n.charCodeAt(0) - 97);

// ---------- FEN ----------
export function parseFen(fen) {
  const [place, side = 'w', cast = '-', ep = '-', half = '0', full = '1'] = String(fen || START_FEN).trim().split(/\s+/);
  const b = new Array(64).fill(0), kings = [-1, -1];
  const rows = place.split('/');
  for (let i = 0; i < 8; i++) {
    let f = 0; const r = 7 - i;
    for (const ch of rows[i] || '') {
      if (ch >= '1' && ch <= '8') { f += +ch; continue; }
      const t = LETTERS.indexOf(ch.toLowerCase()); if (t <= 0) continue;
      const p = t | (ch === ch.toLowerCase() ? 8 : 0), s = r * 8 + f;
      b[s] = p; if (t === K) kings[p >> 3] = s; f++;
    }
  }
  let castle = 0;
  if (cast.includes('K')) castle |= 1; if (cast.includes('Q')) castle |= 2;
  if (cast.includes('k')) castle |= 4; if (cast.includes('q')) castle |= 8;
  const s = side === 'b' ? 1 : 0;
  return { b, side: s, turn: s ? 'b' : 'w', castle, ep: ep === '-' ? -1 : sqIndex(ep), half: +half || 0, full: +full || 1, kings };
}
export function positionKey(pos) {
  let out = '';
  for (let r = 7; r >= 0; r--) {
    let e = 0;
    for (let f = 0; f < 8; f++) {
      const p = pos.b[r * 8 + f];
      if (!p) { e++; continue; }
      if (e) { out += e; e = 0; }
      const ch = LETTERS[p & 7]; out += p & 8 ? ch : ch.toUpperCase();
    }
    if (e) out += e; if (r) out += '/';
  }
  let c = ''; if (pos.castle & 1) c += 'K'; if (pos.castle & 2) c += 'Q'; if (pos.castle & 4) c += 'k'; if (pos.castle & 8) c += 'q';
  // ep only counts when a capture is actually possible (FIDE repetition rule)
  let ep = '-';
  if (pos.ep >= 0) {
    const pawn = pos.side ? 9 : 1, from = pos.side ? pos.ep + 8 : pos.ep - 8, f = pos.ep & 7;
    if ((f > 0 && pos.b[from - 1] === pawn) || (f < 7 && pos.b[from + 1] === pawn)) ep = sqName(pos.ep);
  }
  return out + ' ' + (pos.side ? 'b' : 'w') + ' ' + (c || '-') + ' ' + ep;
}
export function toFen(pos) {
  const [pl, sd, c] = positionKey(pos).split(' ');
  return `${pl} ${sd} ${c} ${pos.ep >= 0 ? sqName(pos.ep) : '-'} ${pos.half} ${pos.full}`;
}
export function clonePos(pos) {
  return { b: pos.b.slice(), side: pos.side, turn: pos.side ? 'b' : 'w', castle: pos.castle, ep: pos.ep, half: pos.half, full: pos.full, kings: pos.kings.slice() };
}

// ---------- attacks ----------
export function attacked(b, sq, by) {
  const f = sq & 7;
  if (by === 0) {
    if (f < 7 && sq >= 7 && b[sq - 7] === 1) return true;
    if (f > 0 && sq >= 9 && b[sq - 9] === 1) return true;
  } else {
    if (f > 0 && sq + 7 < 64 && b[sq + 7] === 9) return true;
    if (f < 7 && sq + 9 < 64 && b[sq + 9] === 9) return true;
  }
  const c = by << 3, kn = N | c, kg = K | c, rk = R | c, bs = B | c, qn = Q | c;
  let a = KN[sq]; for (let i = 0; i < a.length; i++) if (b[a[i]] === kn) return true;
  a = KG[sq]; for (let i = 0; i < a.length; i++) if (b[a[i]] === kg) return true;
  for (let d = 0; d < 8; d++) {
    const ray = RAYS[d][sq], s1 = d < 4 ? rk : bs;
    for (let i = 0; i < ray.length; i++) {
      const p = b[ray[i]];
      if (p) { if (p === s1 || p === qn) return true; break; }
    }
  }
  return false;
}
export function inCheck(pos) { return attacked(pos.b, pos.kings[pos.side], pos.side ^ 1); }

// ---------- generation (packed: from | to<<6 | promo<<12 | flag<<15; flag 1 double, 2 ep, 3 castle) ----------
function addPawn(out, s, t, promoRank, capsOnly) {
  if ((t >> 3) === promoRank) { out.push(s | t << 6 | Q << 12); if (!capsOnly) { out.push(s | t << 6 | N << 12, s | t << 6 | R << 12, s | t << 6 | B << 12); } }
  else out.push(s | t << 6);
}
export function genPseudo(S, out, capsOnly) {
  const b = S.b, side = S.side, me = side << 3;
  for (let s = 0; s < 64; s++) {
    const p = b[s]; if (!p || (p & 8) !== me) continue;
    const t = p & 7;
    if (t === P) {
      const fwd = side ? -8 : 8, start = side ? 6 : 1, pr = side ? 0 : 7, f = s & 7, to = s + fwd;
      if (!b[to]) {
        if (!capsOnly || (to >> 3) === pr) addPawn(out, s, to, pr, capsOnly);
        if (!capsOnly && (s >> 3) === start && !b[to + fwd]) out.push(s | (to + fwd) << 6 | 1 << 15);
      }
      for (const df of [-1, 1]) {
        if ((df < 0 && f === 0) || (df > 0 && f === 7)) continue;
        const c = to + df, q = b[c];
        if (q && (q & 8) !== me) addPawn(out, s, c, pr, capsOnly);
        else if (c === S.ep) out.push(s | c << 6 | 2 << 15);
      }
    } else if (t === N || t === K) {
      const a = t === N ? KN[s] : KG[s];
      for (let i = 0; i < a.length; i++) {
        const q = b[a[i]];
        if (q ? (q & 8) !== me : !capsOnly) out.push(s | a[i] << 6);
      }
      if (t === K && !capsOnly) {
        const opp = side ^ 1;
        if (side === 0 && s === 4) {
          if (S.castle & 1 && !b[5] && !b[6] && b[7] === R && !attacked(b, 4, opp) && !attacked(b, 5, opp) && !attacked(b, 6, opp)) out.push(4 | 6 << 6 | 3 << 15);
          if (S.castle & 2 && !b[3] && !b[2] && !b[1] && b[0] === R && !attacked(b, 4, opp) && !attacked(b, 3, opp) && !attacked(b, 2, opp)) out.push(4 | 2 << 6 | 3 << 15);
        } else if (side === 1 && s === 60) {
          if (S.castle & 4 && !b[61] && !b[62] && b[63] === 12 && !attacked(b, 60, opp) && !attacked(b, 61, opp) && !attacked(b, 62, opp)) out.push(60 | 62 << 6 | 3 << 15);
          if (S.castle & 8 && !b[59] && !b[58] && !b[57] && b[56] === 12 && !attacked(b, 60, opp) && !attacked(b, 59, opp) && !attacked(b, 58, opp)) out.push(60 | 58 << 6 | 3 << 15);
        }
      }
    } else {
      const d0 = t === B ? 4 : 0, d1 = t === R ? 4 : 8;
      for (let d = d0; d < d1; d++) {
        const ray = RAYS[d][s];
        for (let i = 0; i < ray.length; i++) {
          const q = b[ray[i]];
          if (!q) { if (!capsOnly) out.push(s | ray[i] << 6); continue; }
          if ((q & 8) !== me) out.push(s | ray[i] << 6);
          break;
        }
      }
    }
  }
  return out;
}
// make/unmake in place; returns the undo record
export function make(S, m) {
  const b = S.b, from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 3, side = S.side;
  const p = b[from];
  let cap = b[to];
  const u = { cap, castle: S.castle, ep: S.ep, half: S.half };
  if (flag === 2) { const cs = to + (side ? 8 : -8); cap = u.cap = b[cs]; b[cs] = 0; }
  b[to] = promo ? promo | (side << 3) : p; b[from] = 0;
  if (flag === 3) {
    if (to === 6) { b[5] = b[7]; b[7] = 0; } else if (to === 2) { b[3] = b[0]; b[0] = 0; }
    else if (to === 62) { b[61] = b[63]; b[63] = 0; } else if (to === 58) { b[59] = b[56]; b[56] = 0; }
  }
  if ((p & 7) === K) S.kings[side] = to;
  S.castle &= CR[from] & CR[to];
  S.ep = flag === 1 ? (from + to) >> 1 : -1;
  S.half = ((p & 7) === P || cap) ? 0 : S.half + 1;
  if (side) S.full++;
  S.side = side ^ 1;
  return u;
}
export function unmake(S, m, u) {
  const b = S.b, from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 3;
  const side = S.side ^ 1; S.side = side;
  if (side) S.full--;
  const p = promo ? P | (side << 3) : b[to];
  b[from] = p;
  if (flag === 2) { b[to] = 0; b[to + (side ? 8 : -8)] = u.cap; } else b[to] = u.cap;
  if (flag === 3) {
    if (to === 6) { b[7] = b[5]; b[5] = 0; } else if (to === 2) { b[0] = b[3]; b[3] = 0; }
    else if (to === 62) { b[63] = b[61]; b[61] = 0; } else if (to === 58) { b[56] = b[59]; b[59] = 0; }
  }
  if ((p & 7) === K) S.kings[side] = from;
  S.castle = u.castle; S.ep = u.ep; S.half = u.half;
}
export function legalPacked(S) {
  const out = [], ps = genPseudo(S, [], false), me = S.side;
  for (const m of ps) { const u = make(S, m); if (!attacked(S.b, S.kings[me], S.side)) out.push(m); unmake(S, m, u); }
  return out;
}

// ---------- public moves ----------
function describe(S, m) {
  const from = m & 63, to = (m >> 6) & 63, promo = (m >> 12) & 7, flag = (m >> 15) & 3, p = S.b[from];
  const capP = flag === 2 ? S.b[to + (S.side ? 8 : -8)] : S.b[to];
  return {
    from: sqName(from), to: sqName(to), f: from, t: to, piece: LETTERS[p & 7], side: p & 8 ? 'b' : 'w',
    captured: capP ? LETTERS[capP & 7] : null, promo: promo ? LETTERS[promo] : null, ep: flag === 2,
    castle: flag === 3 ? (to & 7) === 6 ? 'K' : 'Q' : null,
    uci: sqName(from) + sqName(to) + (promo ? LETTERS[promo] : ''), m,
  };
}
export function legalMoves(pos) { const S = clonePos(pos); return legalPacked(S).map((m) => describe(S, m)); }
export function moveFromUci(pos, uci) {
  const u = String(uci).toLowerCase();
  return legalMoves(pos).find((mv) => mv.uci === u || (u.length === 4 && mv.uci === u + 'q')) || null;
}
export function moveFromSan(pos, san) {
  const clean = (x) => String(x).replace(/[+#!?]/g, '').replace(/0/g, 'O');
  const want = clean(san);
  for (const mv of legalMoves(pos)) if (clean(toSan(pos, mv)) === want) return mv;
  return null;
}
function resolve(pos, move) {
  if (move && typeof move === 'object' && typeof move.m === 'number') return move;
  if (move && typeof move === 'object' && move.from && move.to) return moveFromUci(pos, move.from + move.to + (move.promo || ''));
  if (typeof move === 'string') return /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(move) ? moveFromUci(pos, move) : moveFromSan(pos, move);
  return null;
}
export function makeMove(pos, move) {
  const mv = resolve(pos, move); if (!mv) return null;
  const S = clonePos(pos); make(S, mv.m); S.turn = S.side ? 'b' : 'w'; return S;
}
export function toSan(pos, move) {
  const mv = resolve(pos, move); if (!mv) return '';
  let san;
  if (mv.castle) san = mv.castle === 'K' ? 'O-O' : 'O-O-O';
  else {
    const L = mv.piece.toUpperCase();
    if (mv.piece === 'p') san = (mv.captured ? mv.from[0] + 'x' : '') + mv.to + (mv.promo ? '=' + mv.promo.toUpperCase() : '');
    else {
      const rivals = legalMoves(pos).filter((o) => o.piece === mv.piece && o.to === mv.to && o.from !== mv.from);
      let dis = '';
      if (rivals.length) {
        if (!rivals.some((o) => o.from[0] === mv.from[0])) dis = mv.from[0];
        else if (!rivals.some((o) => o.from[1] === mv.from[1])) dis = mv.from[1];
        else dis = mv.from;
      }
      san = L + dis + (mv.captured ? 'x' : '') + mv.to;
    }
  }
  const after = makeMove(pos, mv);
  if (inCheck(after)) san += legalPacked(clonePos(after)).length ? '+' : '#';
  return san;
}
export function words(move, pos) {
  const mv = resolve(pos, move); if (!mv) return '';
  let w;
  if (mv.castle) w = mv.castle === 'K' ? 'castles' : 'castles long';
  else {
    const who = KIND_NAMES[mv.piece];
    if (mv.ep) w = `${who} takes the spearman in passing on ${mv.to}`;
    else if (mv.captured) w = `${who} takes the ${KIND_NAMES[mv.captured]} on ${mv.to}`;
    else w = `${who} to ${mv.to}`;
    if (mv.promo) w += `, crowned ${KIND_NAMES[mv.promo]}`;
  }
  const after = makeMove(pos, mv);
  if (inCheck(after)) w += legalPacked(clonePos(after)).length ? ', check' : ', and that is mate';
  return w;
}
// ---------- board reads for other lanes ----------
export function pieceAt(pos, sq) { const p = pos.b[typeof sq === 'string' ? sqIndex(sq) : sq]; return p ? { kind: LETTERS[p & 7], side: p & 8 ? 'b' : 'w' } : null; }
export function pieces(pos) { const out = []; for (let s = 0; s < 64; s++) if (pos.b[s]) out.push({ sq: sqName(s), kind: LETTERS[pos.b[s] & 7], side: pos.b[s] & 8 ? 'b' : 'w' }); return out; }

// ---------- status ----------
export function insufficient(pos) {
  const minors = [];
  for (let s = 0; s < 64; s++) {
    const t = pos.b[s] & 7; if (!t || t === K) continue;
    if (t === P || t === R || t === Q) return false;
    minors.push({ t, c: ((s & 7) + (s >> 3)) & 1 });
  }
  if (minors.length <= 1) return true;
  return minors.every((m) => m.t === B) && minors.every((m) => m.c === minors[0].c);
}
// history: FENs, or moves (SAN or uci) played from START_FEN (or from opts.startFen). The current position counts once.
export function historyKeys(history, startFen) {
  const keys = [];
  if (!Array.isArray(history) || !history.length) return keys;
  if (String(history[0]).includes('/')) { for (const f of history) keys.push(positionKey(parseFen(f))); return keys; }
  let p = parseFen(startFen || START_FEN); keys.push(positionKey(p));
  for (const mv of history) { const n = makeMove(p, mv); if (!n) break; p = n; keys.push(positionKey(p)); }
  return keys;
}
export function status(pos, history, startFen) {
  const S = clonePos(pos);
  if (!legalPacked(S).length) return inCheck(pos) ? 'mate' : 'stalemate';
  if (insufficient(pos)) return 'insufficient';
  if (pos.half >= 100) return 'fifty';
  const key = positionKey(pos), keys = historyKeys(history, startFen);
  let n = 0; for (const k of keys) if (k === key) n++;
  if (keys[keys.length - 1] !== key) n++; // current position not already the history's last entry
  if (n >= 3) return 'threefold';
  return 'play';
}
