// World 302 v2, lane 2: JEV as the crowd's director (docs/board/BARRENS-VARIETY-PLAN-2026-10-06.md, "JEV as the crowd's director").
// Pure: no ctx, no clock, no dice of its own. The runner hands in rand = ctx.random.
// buildJevAsk(input) -> { state, questions }  : the jev:decide payload (who / move / count / heat / feud / remember)
// samplePicks(answers, rand, opts?) -> Picks  : SAMPLES JEV's odds (never argmax); missing answers fall back (opts = { online, moveIds, recentSpeakers, recentMoves, heat })
// codeDraw({ bots, line, recentSpeakers, recentMoves, moveIds, rand, kind?, heat? }) -> Picks : the no-JEV weighted draw
// Picks = { speakers: string[] 1-3, moves: string[] same length, heat: 0|1|2, feud: boolean, remember: boolean }
// No speaker is ever named like Zezima (the creator is the only Zezima): such names are dropped everywhere here.

export const JEV = {
  strMax: 120, onlineMax: 16, movesMax: 40, recentSpeakersMax: 6, recentMovesMax: 8, feudsMax: 6, notesMax: 4, factsMax: 12,
  counts: ['one', 'two', 'pileon'], heats: ['chill', 'banter', 'brawl'],
  recentBlock: 3,                       // codeDraw: never one of the last 3 speakers while others exist
  countOdds: [[0.58, 0.3, 0.12], [0.45, 0.37, 0.18], [0.3, 0.4, 0.3]], // by heat: one / two / pileon
  pileonMax: 3,
};

const isZez = (n) => /z\s*[e3]\s*z\s*[i1!]\s*m\s*[a4@]/i.test(String(n ?? ''));
const str = (s, n = JEV.strMax) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const names = (a, cap) => (Array.isArray(a) ? a : []).filter((x) => typeof x === 'string' && x.trim()).map((x) => str(x, 40)).slice(-cap);
const uniq = (a) => [...new Set(a)];
const clampHeat = (h) => { const n = Math.round(Number(h)); return n >= 2 ? 2 : n >= 1 ? 1 : 0; };
const R = (rand) => { const v = typeof rand === 'function' ? Number(rand()) : NaN; return v >= 0 && v < 1 ? v : 0; };

// weighted pick over [key, weight][]; null when nothing has weight
export function weighted(entries, rand) {
  const live = entries.filter(([, w]) => typeof w === 'number' && w > 0 && isFinite(w));
  const tot = live.reduce((t, [, w]) => t + w, 0);
  if (!(tot > 0)) return null;
  let r = R(rand) * tot;
  for (const [k, w] of live) if ((r -= w) < 0) return k;
  return live[live.length - 1][0];
}
// draw up to n distinct keys, each sampled from what remains
function drawDistinct(entries, n, rand) {
  const out = [], left = entries.slice();
  while (out.length < n) { const k = weighted(left, rand); if (k == null) break; out.push(k); left.splice(left.findIndex(([x]) => x === k), 1); }
  return out;
}
function smallFacts(f) {
  if (!f || typeof f !== 'object') return {};
  const o = {};
  for (const [k, v] of Object.entries(f).slice(0, JEV.factsMax)) {
    if (typeof v === 'number' && isFinite(v)) o[k] = Math.round(v * 10) / 10;
    else if (typeof v === 'boolean') o[k] = v;
    else if (typeof v === 'string') o[k] = str(v);
    else if (v && typeof v === 'object' && 'skill' in v) o[k] = { skill: str(v.skill, 24), level: Number(v.level) || 0 };
  }
  return o;
}

export function buildJevAsk(input = {}) {
  const online = uniq(names(input.online, 64).filter((n) => !isZez(n))).slice(0, JEV.onlineMax);
  const moveIds = uniq(names(input.moveIds, 200)).slice(0, JEV.movesMax);
  const sayOf = Object.fromEntries((Array.isArray(input.moves) ? input.moves : []).filter((m) => m && m.id).map((m) => [m.id, str(m.say, 90)]));
  const personaOf = Object.fromEntries((Array.isArray(input.bots) ? input.bots : []).filter((b) => b && b.name).map((b) => [b.name, str(b.persona, 90)]));
  const human = str(input.human, 40);
  const state = {
    where: 'World 302, an old-school MMO chat box; the crowd are chat regulars, the human is a real player',
    line: str(input.line), kind: str(input.kind, 24) || 'chat', human,
    facts: smallFacts(input.facts),
    online, recentSpeakers: names(input.recentSpeakers, JEV.recentSpeakersMax), recentMoves: names(input.recentMoves, JEV.recentMovesMax),
    heat: clampHeat(input.heat), feuds: names(input.feuds, JEV.feudsMax).map((s) => str(s, 80)),
    notes: (Array.isArray(input.notes) ? input.notes : []).filter((s) => typeof s === 'string').slice(-JEV.notesMax).map((s) => str(s)),
  };
  const who = human ? `${human} just said this in chat` : 'chat has gone quiet';
  const questions = {
    who: { type: 'choice', instructions: `${who}. Which regular answers first? Spread it around: a bot who spoke in recentSpeakers should rarely go again, a quiet one deserves a turn, and a bot whose pet topic the line touches should jump in.`,
      criteria: Object.fromEntries(online.map((n) => [n, personaOf[n] || n])) },
    move: { type: 'choice', instructions: 'How do they answer? Pick the move card that would be funniest and freshest here; avoid anything in recentMoves. Teasing stays gentle toward the human.',
      criteria: Object.fromEntries(moveIds.map((m) => [m, sayOf[m] || m])) },
    count: { type: 'score', instructions: 'How many regulars jump in on this?', criteria: JEV.counts.slice() },
    heat: { type: 'score', instructions: 'The crowd mood after this line (heat is where it stands now).', criteria: JEV.heats.slice() },
    feud: { type: 'boolean', instructions: 'Does one of the live feuds between bots flare up off this line?' },
    remember: { type: 'boolean', instructions: 'Is this line worth the crowd remembering about the human for a callback later (a goal, a brag, a funny mistake)?' },
  };
  if (!online.length) delete questions.who;
  if (!moveIds.length) delete questions.move;
  return { state, questions };
}

// a score answer -> index: probabilities keyed by label or index are sampled; else .score rounded
function sampleScore(a, labels, rand) {
  const p = a?.probabilities;
  if (p && typeof p === 'object') {
    const e = Object.entries(p).map(([k, v]) => [labels.includes(k) ? labels.indexOf(k) : (/^\d+$/.test(k) ? +k : -1), v]).filter(([i]) => i >= 0 && i < labels.length);
    const i = weighted(e, rand); if (i != null) return i;
  }
  const s = Number(a?.score);
  return isFinite(s) && a?.score != null ? Math.max(0, Math.min(labels.length - 1, Math.round(s))) : null;
}
const sampleBool = (a, rand, dflt) => { const p = Number(a?.probability); return a && isFinite(p) && a.probability != null ? R(rand) < Math.max(0, Math.min(1, p)) : (typeof a === 'boolean' ? a : dflt); };

export function samplePicks(answers, rand, opts = {}) {
  const A = answers && typeof answers === 'object' ? (answers.data?.answers ?? answers.answers ?? answers) : {};
  const online = uniq(names(opts.online, 64).filter((n) => !isZez(n)));
  const recent = names(opts.recentSpeakers, JEV.recentBlock);
  let heat = sampleScore(A.heat, JEV.heats, rand); heat = heat == null ? clampHeat(opts.heat) : heat;
  let ci = sampleScore(A.count, JEV.counts, rand);
  if (ci == null) ci = weighted(JEV.countOdds[heat].map((w, i) => [i, w]), rand) ?? 0;
  const n = ci + 1;
  // speakers: JEV's odds, distinct; fill short from the online cast (not recent) uniformly
  let whoE = Object.entries(A.who?.probabilities ?? {}).filter(([k, v]) => typeof v === 'number' && v > 0 && !isZez(k) && (!online.length || online.includes(k)));
  let speakers = drawDistinct(whoE, n, rand);
  if (speakers.length < n) {
    const pool = online.filter((x) => !speakers.includes(x));
    const fresh = pool.filter((x) => !recent.includes(x));
    speakers.push(...drawDistinct((fresh.length ? fresh : pool).map((x) => [x, 1]), n - speakers.length, rand));
  }
  speakers = speakers.slice(0, JEV.pileonMax);
  // moves: one per speaker, distinct while the odds allow
  const moveIds = uniq(names(opts.moveIds, 200)), recentM = names(opts.recentMoves, JEV.recentMovesMax);
  const mE = Object.entries(A.move?.probabilities ?? {}).filter(([k, v]) => typeof v === 'number' && v > 0 && (!moveIds.length || moveIds.includes(k)));
  const moves = drawDistinct(mE, speakers.length, rand);
  if (moves.length < speakers.length) moves.push(...drawMoves(moveIds, recentM.concat(moves), speakers.length - moves.length, rand, moves));
  while (moves.length < speakers.length) moves.push(moves[moves.length - 1] ?? 'free');
  return { speakers, moves, heat, feud: sampleBool(A.feud, rand, heat === 2), remember: sampleBool(A.remember, rand, false) };
}

// move cards without repeat: never one in recent (nor already taken) while the deck allows; when it is spent, only the newest recent are barred
function drawMoves(moveIds, recent, n, rand, taken = []) {
  const ids = uniq(names(moveIds, 200)); if (!ids.length) return [];
  let pool = ids.filter((m) => !recent.includes(m) && !taken.includes(m));
  if (pool.length < n) pool = ids.filter((m) => !taken.includes(m) && !recent.slice(-2).includes(m));
  if (!pool.length) pool = ids.slice();
  const out = drawDistinct(pool.map((m) => [m, 1]), n, rand);
  while (out.length < n) out.push(ids[Math.floor(R(rand) * ids.length)]);
  return out;
}

const words = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
function topicHits(bot, line, lw) {
  let h = 0;
  for (const t of Array.isArray(bot.topics) ? bot.topics : []) {
    const k = String(t).toLowerCase().trim(); if (!k) continue;
    if (k.includes(' ') ? line.includes(k) : lw.has(k) || (k.length >= 4 && [...lw].some((w) => w.startsWith(k)))) h++;
  }
  return h;
}

export function codeDraw(c = {}) {
  const rand = c.rand;
  const bots = (Array.isArray(c.bots) ? c.bots : []).filter((b) => b && typeof b.name === 'string' && !isZez(b.name));
  const byName = Object.fromEntries(bots.map((b) => [b.name, b]));
  const recent = names(c.recentSpeakers, 64).slice(-JEV.recentBlock);
  const line = String(c.line ?? '').toLowerCase(), lw = new Set(words(line));
  const last = recent[recent.length - 1];
  const rel = (a, b, k) => !!(byName[a]?.[k]?.includes?.(b) || byName[b]?.[k]?.includes?.(a));
  const base = (b) => {
    const vol = Math.max(0, Math.min(1, Number(b.volatility) || 0.4));
    let w = (0.25 + vol) * (1 + 1.5 * topicHits(b, line, lw));
    if (last && (rel(b.name, last, 'beefs'))) w *= 1.8;   // an old beef answers the last speaker
    else if (last && rel(b.name, last, 'allies')) w *= 1.3;
    return w;
  };
  const fresh = bots.filter((b) => !recent.includes(b.name));
  const pool = fresh.length ? fresh : bots;
  const heat0 = clampHeat(c.heat);
  const n = Math.min(pool.length, (weighted(JEV.countOdds[heat0].map((w, i) => [i, w]), rand) ?? 0) + 1);
  const speakers = [];
  let feud = false;
  while (speakers.length < n) {
    const e = pool.filter((b) => !speakers.includes(b.name)).map((b) => {
      let w = base(b);
      for (const s of speakers) { if (rel(b.name, s, 'beefs')) w *= 3; else if (rel(b.name, s, 'allies')) w *= 2; }
      return [b.name, w];
    });
    const k = weighted(e, rand); if (k == null) break;
    if (speakers.some((s) => rel(k, s, 'beefs')) || (last && rel(k, last, 'beefs'))) feud = true;
    speakers.push(k);
  }
  const moves = drawMoves(c.moveIds, names(c.recentMoves, 64), speakers.length, rand);
  while (moves.length < speakers.length) moves.push('free');
  const heat = feud ? 2 : speakers.length >= 3 ? Math.max(heat0, 1) : Math.max(0, Math.min(2, heat0 + (R(rand) < 0.3 ? 1 : 0) - (R(rand) < 0.3 ? 1 : 0)));
  const remember = lw.size >= 5 && R(rand) < 0.25;
  return { speakers, moves, heat, feud, remember };
}
