// World 302 / Barrens chat crowd (docs/board/BARRENS-CHAT-PLAN-2026-10-06.md), lane 2: the pure brain. No ctx, no clock, no dice of its own:
// the runner (places/main/sim.js) hands in place.state.barrens, ctx.now(), place.state.chatLog, the human count and ctx.random.
//   nextBeat     -> WHEN to call the LLM (one call per beat, never one per bot)
//   buildMessage -> the user message for that call: roster off cooldown + the last chat lines + one instruction
//   parseReply   -> the model's text -> [{ sender, message }] (0-2 lines, known names only, off cooldown, trimmed)
import { BARRENS as CFG } from './data/barrens-bots.js';

const DEF = { beatMinMs: 8000, deadMs: 20000, humanReplyMs: [2000, 4000], pBase: 0.85, gamma: 0.45, threshold: 0.15, maxPerMin: 6, bufferLines: 15, botCooldownMs: 40000, maxLine: 80 };
export const B = { ...DEF, ...(CFG || {}) };
export const STALE_FLIGHT_MS = 20000; // a call in flight longer than this is treated as lost
export const STARTER_CHANCE = 0.35;   // per beat, once chat has been dead deadMs
const CHAT = new Set(['pub', 'bot', 'trade', 'savi']); // rows that count as chat (game/arrival lines do not keep chat alive)
const num = (v, d = 0) => (Number.isFinite(v) ? v : d);
const chatRows = (log) => (Array.isArray(log) ? log : []).filter((r) => r && CHAT.has(r.k) && typeof r.t === 'string');

// the newest human (k 'pub') line the crowd has not yet seen, or null; bot lines are ignored
export function pendingHuman(log, st) {
  const seen = num(st?.seenAt, 0), rows = Array.isArray(log) ? log : [];
  for (let i = rows.length - 1; i >= 0; i--) { const r = rows[i]; if ((r?.k === 'pub' || r?.k === 'trade') && num(r.at, -1) > seen) return r; }
  return null;
}
const lastChatAt = (log) => { const c = chatRows(log); return c.length ? num(c[c.length - 1].at, -Infinity) : -Infinity; };
const cooldownOf = (bot) => num(bot?.cooldownMs, B.botCooldownMs);
export const offCooldown = (bot, st, now) => { const at = st?.botLast?.[bot.name]; return !Number.isFinite(at) || now - at >= cooldownOf(bot); };

const NO = { speak: false, starter: false, human: null };
export function nextBeat(st, now, log, humansHere, rand) {
  st = st || {};
  const r = typeof rand === 'function' ? rand : () => 1;
  if (!(humansHere > 0)) return NO;
  if (st.inFlight) { // a timestamp (or true: then lastCallAt marks it); stale after 20 s
    const since = typeof st.inFlight === 'number' ? st.inFlight : num(st.lastCallAt, now);
    if (now - since < STALE_FLIGHT_MS) return NO;
  }
  if (now - num(st.lastCallAt, -Infinity) < B.beatMinMs) return NO;
  const minute = (Array.isArray(st.minute) ? st.minute : []).filter((t) => Number.isFinite(t) && now - t < 60000);
  const h = pendingHuman(log, st); // a reply to a real player skips the minute cap (creator 2026-10-07: half the chatter, never ignore a human)
  if (h) return now - num(h.at, now) >= B.humanReplyMs[0] ? { speak: true, starter: false, human: h.n || null } : NO;
  if (minute.length >= B.maxPerMin) return NO;
  const mo = urgentMoment(st, now, r); // v2: a level-up, a 99, a boss kill or a death fires its own crowd beat
  if (mo) return { speak: true, starter: false, human: null, moment: mo };
  if (now - lastChatAt(log) >= B.deadMs) return r() < STARTER_CHANCE ? { speak: true, starter: true, human: null } : NO;
  const P = B.pBase * Math.exp(-B.gamma * num(st.n, 0));
  return P >= B.threshold && r() < P ? { speak: true, starter: false, human: null } : NO;
}

// v2 moments (barrens-moments.js rows queued in st.moments): the one that fires a beat now, or null.
// big moments, level-ups and deaths always fire; a plain kill fires on MOMENT_KILL_CHANCE, else it rides along as a fact.
export const MOMENT_TTL_MS = 60000, MOMENT_KILL_CHANCE = 0.35;
export const liveMoments = (st, now) => (Array.isArray(st?.moments) ? st.moments : []).filter((m) => m && m.who && !(now - num(m.at, now) > MOMENT_TTL_MS));
export function urgentMoment(st, now, rand) {
  const live = liveMoments(st, now).filter((m) => !m.used);
  const hot = live.find((m) => m.big) || live.find((m) => m.kind === 'level') || live.find((m) => m.kind === 'death');
  if (hot) return hot;
  const k = live.find((m) => m.kind === 'kill');
  return k && (typeof rand === 'function' ? rand() : 1) < MOMENT_KILL_CHANCE ? k : null;
}
export function momentText(m) {
  if (!m) return '';
  if (m.kind === 'level') return `${m.who} just reached ${m.skill} level ${m.level}${m.big ? ' (a 99!)' : ''}`;
  if (m.kind === 'kill') return `${m.who} just killed ${m.target || 'something'}${m.big ? ' (a boss!)' : ''}`;
  if (m.kind === 'death') return `${m.who} just died`;
  return `${m.who} did something`;
}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
// the first three words of recent bot lines: openers the model must not reuse
export function openersOf(lines, n = 8) {
  const out = [];
  for (const t of (Array.isArray(lines) ? lines : []).slice().reverse()) {
    const w = clean(t).toLowerCase().split(' ').slice(0, 3).join(' ');
    if (w && !out.includes(w)) out.push(w);
    if (out.length >= n) break;
  }
  return out;
}
const factLine = (f) => {
  if (!f || typeof f !== 'object') return '';
  const o = [];
  if (Number.isFinite(f.combat)) o.push(`combat ${f.combat}`);
  if (Number.isFinite(f.total)) o.push(`total level ${f.total}`);
  if (f.top) o.push(`best skill ${f.top.skill} ${f.top.level}`);
  if (f.low) o.push(`worst skill ${f.low.skill} ${f.low.level}`);
  if (f.weapon) o.push(`wielding ${f.weapon}`);
  if (f.spot) o.push(`standing at ${f.spot}`);
  if (Number.isFinite(f.hour)) o.push(`${String(f.hour).padStart(2, '0')}:00`);
  if (f.weather) o.push(`weather ${f.weather}`);
  if (f.mounted) o.push('riding a mount');
  if (f.moment) o.push(f.moment);
  return o.join(', ');
};
// v2: the llm:chat message when code/JEV already picked the cast. o = { picks, human, line, facts, note:{lines,nick}, moment, topic, avoid }
// The model only writes the words: who speaks, in what order and with which move are ORDERS.
export function buildOrderMessage(log, BOTS, st, now, o = {}) {
  st = st || {};
  const byName = new Map((Array.isArray(BOTS) ? BOTS : []).filter((b) => b?.name).map((b) => [b.name, b]));
  const moveBy = new Map((Array.isArray(o.moves) ? o.moves : []).filter((m) => m?.id).map((m) => [m.id, m]));
  const pk = o.picks || {}, sp = (Array.isArray(pk.speakers) ? pk.speakers : []).filter((n) => byName.has(n)).slice(0, 3);
  const out = ['CAST THIS TURN (only these speak, in this order):'];
  for (const n of sp) {
    const b = byName.get(n), len = Array.isArray(b.len) ? b.len : null;
    out.push(`${n}: ${clean(b.persona)}${b.quirks ? ` | QUIRKS: ${clean(b.quirks)}` : ''}${Array.isArray(b.catch) && b.catch.length ? ` | CATCHPHRASES (sometimes): ${b.catch.map(clean).join(' / ')}` : ''}${len ? ` | LENGTH: ${len[0]}-${len[1]} words` : ''}`);
  }
  out.push('', 'CHAT (oldest first):');
  const rows = chatRows(log).slice(-B.bufferLines);
  if (!rows.length) out.push('(nothing yet)');
  for (const r of rows) out.push(r.k === 'pub' || r.k === 'trade' ? `HUMAN ${clean(r.n)}: ${clean(r.t)}` : `[${clean(r.n)}]: ${clean(r.t)}`);
  out.push('');
  const human = clean(o.human), who = o.moment?.who ? clean(o.moment.who) : human;
  const fl = factLine(o.facts);
  if (who && fl) out.push(`FACTS about HUMAN ${who} (true, from the game; a bot may use one, never invent others): ${fl}`);
  const nl = (o.note?.lines || []).map(clean).filter(Boolean).slice(-4);
  if (who && (nl.length || o.note?.nick)) out.push(`NOTEBOOK (what the crowd remembers about ${who}; a callback is welcome): ${nl.map((t) => `"${t}"`).join('; ')}${o.note?.nick ? `${nl.length ? '; ' : ''}their nickname: ${clean(o.note.nick)}` : ''}`);
  out.push('ORDERS:');
  const mv = (id) => { const m = moveBy.get(id); return m ? `${String(id).toUpperCase()}: ${clean(m.say)}` : 'any fresh angle'; };
  sp.forEach((n, i) => {
    const how = mv(pk.moves?.[i]);
    if (i === 0) {
      if (human) out.push(`${i + 1}. ${n} answers HUMAN ${human} with ${how}`);
      else if (o.moment) out.push(`${i + 1}. ${n} reacts to this: ${momentText(o.moment)}, with ${how}`);
      else if (o.topic) out.push(`${i + 1}. chat is dead: ${n} starts something about "${clean(o.topic)}" with ${how}`);
      else out.push(`${i + 1}. ${n} continues the thread with ${how}`);
    } else out.push(`${i + 1}. then ${n} chimes in${human ? ` (to ${human} or the bot before)` : ''} with ${how}`);
  });
  if (pk.feud) out.push('A feud flares: let a cast bot needle a rival bot (bots only, never the human).');
  out.push(`MOOD: ${['chill', 'banter', 'brawl'][pk.heat | 0] || 'chill'}${human ? '. Tease the human gently, never family, never real people.' : ''}`);
  const av = (Array.isArray(o.avoid) ? o.avoid : []).map(clean).filter(Boolean).slice(0, 8);
  if (av.length) out.push(`ALREADY SAID (do not open a line with these or repeat them): ${av.map((t) => `"${t}"`).join(', ')}`);
  out.push(`Reply ONLY with a JSON array of ${sp.length} item${sp.length === 1 ? '' : 's'}, in the order above: [{"sender":"<cast name>","message":"<max ${B.maxLine} chars>"}]`);
  return out.join('\n');
}
export function buildMessage(log, BOTS, st, now) {
  st = st || {};
  const free = (Array.isArray(BOTS) ? BOTS : []).filter((b) => b?.name && offCooldown(b, st, now));
  const out = ['ROSTER (only these may speak now):', ...free.map((b) => `${b.name}: ${clean(b.persona)}`), '', 'CHAT (oldest first):'];
  const rows = chatRows(log).slice(-B.bufferLines);
  if (!rows.length) out.push('(nothing yet)');
  for (const r of rows) out.push(r.k === 'pub' || r.k === 'trade' ? `HUMAN ${clean(r.n)}: ${clean(r.t)}` : `[${clean(r.n)}]: ${clean(r.t)}`);
  out.push('');
  const h = pendingHuman(log, st);
  if (h) out.push(`Answer HUMAN ${clean(h.n)}: one or two roster bots reply to them, gently clowning (fake advice, "noob", "gz"). Never insult family.`);
  else if (now - lastChatAt(log) >= B.deadMs) {
    const loud = free.filter((b) => num(b.volatility, 0) >= 0.6).map((b) => b.name);
    out.push(`Chat is dead, start something: a new topic or a roast of another bot or the game${loud.length ? ` (best starters: ${loud.slice(0, 5).join(', ')})` : ''}.`);
  } else out.push('Continue the thread with 1-2 lines from different roster bots, or return [] if it has run its course.');
  out.push(`Reply ONLY with a JSON array, 0-2 items: [{"sender":"<roster name>","message":"<max ${B.maxLine} chars>"}]`);
  return out.join('\n');
}

// tolerant: code fences, prose around it, {"lines":[...]}, a single object, name/text keys, a "Name: " prefix echoed in the message
function extract(text) {
  const s = String(text ?? '').replace(/```(?:json)?/gi, '');
  const tries = [];
  const a = s.indexOf('['), b = s.lastIndexOf(']');
  if (a >= 0 && b > a) tries.push(s.slice(a, b + 1));
  const c = s.indexOf('{'), d = s.lastIndexOf('}');
  if (c >= 0 && d > c) { tries.push(s.slice(c, d + 1)); tries.push('[' + s.slice(c, d + 1) + ']'); }
  for (const t of tries) {
    try {
      const v = JSON.parse(t);
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.lines)) return v.lines;
      if (v && Array.isArray(v.messages)) return v.messages;
      if (v && typeof v === 'object') return [v];
    } catch { /* next try */ }
  }
  return [];
}
// opts (v2): { max: lines kept (default 2, up to 3), force: names ordered this turn (they skip the cooldown check) }
export function parseReply(text, BOTS, st, now, opts = {}) {
  st = st || {};
  const max = Math.max(1, Math.min(3, num(opts?.max, 2))), force = new Set(Array.isArray(opts?.force) ? opts.force : []);
  const byLow = new Map((Array.isArray(BOTS) ? BOTS : []).filter((b) => b?.name).map((b) => [b.name.toLowerCase(), b]));
  const out = [], used = new Set();
  for (const it of extract(text)) {
    if (out.length >= max) break;
    if (!it || typeof it !== 'object') continue;
    const bot = byLow.get(clean(it.sender ?? it.name ?? it.n).replace(/^\[|\]$/g, '').toLowerCase());
    if (!bot || used.has(bot.name) || (!force.has(bot.name) && !offCooldown(bot, st, now))) continue;
    let msg = clean(it.message ?? it.text ?? it.t);
    const pre = bot.name.toLowerCase() + ':';
    if (msg.toLowerCase().startsWith(pre)) msg = msg.slice(pre.length).trim();
    msg = msg.replace(/^["']|["']$/g, '').trim().slice(0, B.maxLine).trim();
    if (!msg) continue;
    used.add(bot.name); out.push({ sender: bot.name, message: msg });
  }
  return out;
}
