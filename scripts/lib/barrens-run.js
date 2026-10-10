// World 302 / Barrens chat crowd: the runner (docs/board/BARRENS-CHAT-PLAN-2026-10-06.md, v2: BARRENS-VARIETY-PLAN-2026-10-06.md).
// places/main/sim.js calls barrensTick(ctx) each tick while a player is in main. One beat = (JEV director call ->) one llm:chat call:
//   beat -> [jevCrowd on] jev:decide (buildJevAsk) -> onBarrensJev: samplePicks | [off / JEV failed] codeDraw
//        -> llm:chat with the picks written as ORDERS (buildOrderMessage) -> onBarrens: guard -> isStale -> shapeLines -> q -> drain (guard again) -> chat log.
// Owns place.state.barrens = { lastCallAt, inFlight, n, lastHumanAt, seenAt, minute[], botLast{}, q[],
//   online[], nextRotateAt, moments[], momentSnap, scanAt, recentLines[], recentSpeakers[], recentMoves[], heat, usedTopics[], notes{} }.
// inFlight stays set from the first call of a beat until its llm answer lands: never two calls at once.
import { BOTS, SYSTEM_PROMPT } from './data/barrens-bots.js';
import { MOVES, TOPICS } from './data/barrens-deck.js';
import { nextBeat, buildOrderMessage, parseReply, pendingHuman, liveMoments, openersOf } from './barrens-core.js';
import { guardLine } from './barrens-guard.js';
import { buildJevAsk, samplePicks, codeDraw } from './barrens-jev.js';
import { humanFacts, classifyLine } from './barrens-facts.js';
import { scanMoments } from './barrens-moments.js';
import { noteAdd, noteFor } from './barrens-notebook.js';
import { rotateOnline, shapeLines, isStale, pickTopic } from './barrens-shapes.js';
import { wallHour } from './real-clock.js';
import { logLine } from './chat-log.js';
import { overhead } from './overhead-chat.js';

export const RUN = { scanMs: 1000, recentLines: 40, recentSpeakers: 8, recentMoves: 12, momentsMax: 8, qMax: 12 };
const BODY = new Map(BOTS.filter((b) => b.body).map((b) => [b.name, b.body]));
const BY = new Map(BOTS.map((b) => [b.name, b]));
const MOVE_IDS = MOVES.map((m) => m.id);
const fresh = () => ({ lastCallAt: 0, inFlight: 0, n: 0, lastHumanAt: 0, seenAt: 0, minute: [], botLast: {}, q: [],
  online: [], nextRotateAt: 0, moments: [], momentSnap: null, scanAt: 0, recentLines: [], recentSpeakers: [], recentMoves: [], heat: 0, usedTopics: [], notes: {} });
const read = (ctx) => ({ ...fresh(), ...(ctx.place.state.barrens || {}) });
const tail = (a, n) => (Array.isArray(a) ? a : []).slice(-n);
const rnd = (ctx) => () => ctx.random();
const humanNames = (ctx) => ctx.place.players.map((pl) => pl.displayName).filter(Boolean);
const playerNamed = (ctx, n) => { const k = String(n ?? '').toLowerCase(); return k ? ctx.place.players.find((pl) => String(pl.displayName ?? '').toLowerCase() === k) || null : null; };
const jevOn = (ctx) => ctx.world.state.systems?.jevCrowd !== false; // missing = on, false = off (like barrens)
const onlineRows = (st) => { const r = (st.online || []).map((n) => BY.get(n)).filter(Boolean); return r.length ? r : BOTS; };
function feudsOf(st) {
  const on = new Set(st.online || []), out = [];
  for (const n of on) for (const e of BY.get(n)?.beefs || []) if (on.has(e)) out.push(n < e ? `${n} vs ${e}` : `${e} vs ${n}`);
  return [...new Set(out)];
}

function post(ctx, sender, text, cont) {
  logLine(ctx, 'bot', sender, text, cont ? { cont: true } : undefined);
  const body = BODY.get(sender);
  if (body && ctx.getObject(body)) { try { overhead(ctx, { scope: 'say', by: { id: body }, text }); } catch (e) {} }
}
// due queue rows post now; every shaped text passes guardLine again right before the log (shapes can make new text)
function drain(ctx, st, now) {
  if (!st.q.length) return false;
  const due = st.q.filter((x) => x.at <= now); if (!due.length) return false;
  st.q = st.q.filter((x) => x.at > now);
  const humans = humanNames(ctx);
  for (const x of due) { const t = guardLine(x.text, humans); if (t == null) { ctx.log('[barrens] guard dropped a shaped line', { sender: x.sender }); continue; } post(ctx, x.sender, t, x.cont); }
  return true;
}

export function barrensTick(ctx) {
  const sys = ctx.world.state.systems;
  if (sys?.barrens === undefined || sys?.jevCrowd === undefined) ctx.world.state.systems = { barrens: true, jevCrowd: true, ...(sys || {}) }; // seed ON once: the DEN SYSTEMS window shows them and toggles them
  if (ctx.world.state.systems?.barrens === false) { if (ctx.place.state.barrens?.q?.length) ctx.place.state.barrens = { ...read(ctx), q: [] }; return; }
  const now = ctx.now(), log = ctx.place.state.chatLog || [];
  let st = read(ctx), dirty = drain(ctx, st, now);
  if (!st.online.length || now >= (st.nextRotateAt || 0)) { // the online cast shifts on its own clock
    let hour = null; try { hour = wallHour(ctx); } catch (e) {}
    const r = rotateOnline(BOTS, st.online, Number.isFinite(hour) ? Math.floor(hour) % 24 : null, now, rnd(ctx));
    st.online = r.online; st.nextRotateAt = r.nextAt; dirty = true;
  }
  if (now - (st.scanAt || 0) >= RUN.scanMs) { // moments: levels, kills, deaths, once a second
    st.scanAt = now; dirty = true;
    try {
      const r = scanMoments(st.momentSnap, ctx.place.players, { foes: ctx.query({ tags: ['enemy'] }), now });
      st.momentSnap = r.snap;
      st.moments = tail([...liveMoments(st, now), ...(r.moments || [])], RUN.momentsMax);
    } catch (e) { ctx.log('[barrens] moment scan threw', { e: String(e).slice(0, 200) }); }
  }
  const beat = nextBeat(st, now, log, ctx.place.players.length, rnd(ctx));
  if (!beat.speak) { if (dirty) ctx.place.state.barrens = st; return; }
  const h = pendingHuman(log, st);
  const p = { at: now, human: beat.human || null, line: h ? String(h.t || '').slice(0, 160) : null, kind: h ? classifyLine(h.t) : null, moment: beat.moment || null, topic: null };
  if (h) { st.seenAt = h.at; st.lastHumanAt = h.at; st.n = 0; } // a new human line resets the thread decay
  if (beat.moment) { st.moments = st.moments.map((m) => (m === beat.moment || (m.who === beat.moment.who && m.at === beat.moment.at && m.kind === beat.moment.kind) ? { ...m, used: true } : m)); st.n = 0; }
  if (beat.starter) { const t = pickTopic(TOPICS, st.usedTopics, rnd(ctx)); st.usedTopics = tail(t.used, TOPICS.length); p.topic = t.topic; } // dead air: a fresh seed
  st.inFlight = now; st.lastCallAt = now;
  st.minute = [...st.minute.filter((t) => now - t < 60000), now];
  if (jevOn(ctx)) {
    const who = p.human || p.moment?.who || null;
    const facts = who ? humanFacts(ctx, playerNamed(ctx, who) || { displayName: who }) : {};
    ctx.place.state.barrens = st;
    ctx.job('jev:decide', buildJevAsk({ line: p.line || (p.moment ? `${p.moment.who} ${p.moment.kind}${p.moment.skill ? ' ' + p.moment.skill + ' ' + p.moment.level : ''}${p.moment.target ? ' ' + p.moment.target : ''}` : p.topic ? `quiet chat; topic seed: ${p.topic}` : ''),
      kind: p.kind || (p.moment ? 'moment' : 'idle'), human: p.human || '', facts, online: st.online, recentSpeakers: st.recentSpeakers, recentMoves: st.recentMoves,
      moveIds: MOVE_IDS, moves: MOVES, bots: onlineRows(st), heat: st.heat, feuds: feudsOf(st), notes: who ? noteFor(st.notes, who).lines : [] }), 'onBarrensJev', p);
    return;
  }
  ask(ctx, st, p, draw(ctx, st, p), now);
}

function draw(ctx, st, p) {
  return codeDraw({ bots: onlineRows(st), line: p.line || p.topic || '', recentSpeakers: st.recentSpeakers, recentMoves: st.recentMoves, moveIds: MOVE_IDS, heat: st.heat, rand: rnd(ctx) });
}
// the llm:chat call: picks as orders; human replies on 'smart', idle chatter on 'fast'
function ask(ctx, st, p, picks, now) {
  const log = ctx.place.state.chatLog || [];
  const who = p.human || p.moment?.who || null;
  const facts = who ? humanFacts(ctx, playerNamed(ctx, who) || { displayName: who }) : null;
  const message = buildOrderMessage(log, BOTS, st, now, { picks, moves: MOVES, human: p.human, facts, note: who ? noteFor(st.notes, who) : null, moment: p.moment, topic: p.topic, avoid: openersOf(st.recentLines) });
  st.inFlight = now; // a fresh flight stamp: the jev hop does not eat the llm call's stale window
  ctx.place.state.barrens = st;
  ctx.job('llm:chat', { conversationId: 'barrens:' + now, system: SYSTEM_PROMPT, message, model: p.human ? 'smart' : 'fast' }, 'onBarrens', { ...p, picks });
}

export function onBarrensJev(ctx, r, p) {
  const st = read(ctx), now = ctx.now();
  if (ctx.world.state.systems?.barrens === false) { st.inFlight = 0; ctx.place.state.barrens = st; return; }
  let picks = null;
  const a = r?.ok ? r.data?.answers : null;
  if (a) { try { picks = samplePicks(a, rnd(ctx), { online: st.online, moveIds: MOVE_IDS, recentSpeakers: st.recentSpeakers, recentMoves: st.recentMoves, heat: st.heat }); } catch (e) { picks = null; } }
  if (!picks?.speakers?.length) { if (!a) ctx.log('[barrens] jev failed, code draw', { error: String(r?.error ?? 'no answers').slice(0, 200) }); picks = draw(ctx, st, p || {}); }
  ask(ctx, st, p || { at: now }, picks, now);
}

export function onBarrens(ctx, r, p) {
  const st = read(ctx), now = ctx.now();
  st.inFlight = 0;
  if (!r?.ok) { ctx.place.state.barrens = st; ctx.log('[barrens] llm call failed', { error: String(r?.error ?? 'unknown').slice(0, 300), at: p?.at }); return; }
  if (ctx.world.state.systems?.barrens === false) { ctx.place.state.barrens = st; return; }
  const d = r.data, text = typeof d === 'string' ? d : d?.text ?? d?.content ?? d?.message ?? JSON.stringify(d ?? '');
  const picks = p?.picks || null, cast = Array.isArray(picks?.speakers) ? picks.speakers : [];
  const lines = parseReply(text, BOTS, st, now, cast.length ? { max: cast.length, force: cast } : {});
  const humans = humanNames(ctx), kept = [];
  for (const { sender, message } of lines) {
    const t = guardLine(message, humans);
    if (t == null) { ctx.log('[barrens] guard dropped a line', { sender }); continue; }
    if (isStale(t, st.recentLines)) { ctx.log('[barrens] stale line dropped', { sender }); continue; }
    kept.push({ sender, message: t });
    st.botLast = { ...st.botLast, [sender]: now }; st.n = (st.n || 0) + 1;
    st.recentLines = tail([...st.recentLines, t], RUN.recentLines);
    st.recentSpeakers = tail([...st.recentSpeakers, sender], RUN.recentSpeakers);
  }
  if (!lines.length) ctx.log('[barrens] no usable lines', { raw: String(text).slice(0, 200) });
  if (kept.length) {
    st.q = tail([...st.q, ...shapeLines(kept, now, rnd(ctx), BOTS)], RUN.qMax);
    if (picks) { st.recentMoves = tail([...st.recentMoves, ...(picks.moves || [])], RUN.recentMoves); st.heat = Math.max(0, Math.min(2, picks.heat | 0)); }
  }
  if (picks?.remember && p?.human && p?.line) st.notes = noteAdd(st.notes, p.human, p.line, now);
  drain(ctx, st, now); // the first shaped line lands now; the rest drain on later ticks
  ctx.place.state.barrens = st;
}
