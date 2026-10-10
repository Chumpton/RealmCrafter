// Dev Team Tracker, lane 3: JEV reads every dev-book entry (docs/board/DEV-TRACKER-PLAN-2026-10-06.md).
// Pure: no ctx, no clock, no dice of its own; callers hand in rand = ctx.random and now = ctx.now().
// buildAsk(entry, day) -> { state, questions }        the jev:decide payload for ONE entry
// sampleTags(answers, rand) -> Tags | null              SAMPLES JEV's odds (never argmax); null = nothing usable
// Tags = { kind, weight, pin, emoji, mood, wscore }     wscore = expected weight index 0..3 (JEV's pick ranks by it)
// pickNext(entries, known, skip, now) -> entry | null   the next entry with no tag row (newest first), skipping failed ones until their retry time
// gate(sess, now, { editorOnline, open }) -> 'ok' | reason
// metaToJev(row) -> entry.jev | null; applyJev(entries, metaById) -> entries with .jev / .pinned / JEV's reaction merged
// floatPinned(entries) -> pinned first, order kept otherwise; jevPick(entries) -> id | null (the day's bookmark)
// decor(entry) -> { ribbon: 'gold'|null, seal, tint, kind, mood }
export const JEVB = {
  kinds: ['bug', 'feature', 'decision', 'idea', 'feedback', 'question', 'vibe'],
  weights: ['minor', 'normal', 'major', 'milestone'],
  moods: ['hyped', 'calm', 'frustrated', 'curious', 'playful'],
  reacts: ['heart', 'fire', 'thumbs', 'laugh', 'wow', 'sad', 'mad', 'axe'],
  gapMs: 3000, perOpen: 20, retryMs: 30000, textMax: 400, replyMax: 120,
  reactor: 'JEV',
  tint: { hyped: '#c8742a', excited: '#c8742a', calm: '#7d9a6a', focused: '#4f5f7a', frustrated: '#8e2f22', curious: '#3f7f86', playful: '#8a5a9a' },
  // the live runner (scripts/devbook-player.js via devbook-core jevAsk/jevMeta) writes these: weight 0..4 = trivial..landmark
  liveKinds: ['milestone', 'decision', 'bug', 'idea', 'polish', 'question', 'chatter'],
  liveWeights: ['trivial', 'minor', 'notable', 'major', 'landmark'],
};
// one weight scale for both vocabularies: 0..1 (1 = milestone / landmark)
export function weight01(j) {
  if (!j) return -1;
  if (Number.isFinite(Number(j.wscore)) && j.wscore !== null && j.wscore !== undefined) return Number(j.wscore) / 3;
  const w = j.weight;
  if (typeof w === 'number' || (typeof w === 'string' && w !== '' && Number.isFinite(Number(w)))) return Math.min(1, Math.max(0, Number(w) / 4));
  const a = JEVB.weights.indexOf(w); if (a >= 0) return a / 3;
  const b = JEVB.liveWeights.indexOf(w); return b >= 0 ? b / 4 : 0;
}
export const isMilestone = (j) => !!j && (j.kind === 'milestone' || j.weight === 'milestone' || weight01(j) >= 0.999);
const KIND_C = {
  bug: 'something is broken or misbehaving and needs a fix', feature: 'asks for a new system, mechanic, asset or UI to be built',
  decision: 'settles a direction, a rule or a choice the team will keep', idea: 'a loose idea or possibility, not yet a request',
  feedback: 'reacts to something already built: praise, critique, tuning', question: 'asks how something works or what to do',
  vibe: 'small talk, mood, a joke or a thank-you; no build content',
};
const REACT_C = {
  heart: 'love it, warm', fire: 'hot, exciting, big energy', thumbs: 'agreed, good call, solid', laugh: 'funny or playful',
  wow: 'surprising or impressive', sad: 'a loss, a setback, a pity', mad: 'annoying bug or frustration', axe: 'viking grit, chop it, ship it',
};
const MOOD_C = {
  hyped: 'excited, all-caps energy, big plans', calm: 'steady and matter-of-fact', frustrated: 'annoyed, something broke again',
  curious: 'wondering, exploring, asking', playful: 'joking, teasing, light',
};
const str = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const R = (rand) => { const v = typeof rand === 'function' ? Number(rand()) : NaN; return v >= 0 && v < 1 ? v : 0; };

export function buildAsk(entry = {}, day = '') {
  const pics = Array.isArray(entry.pics) ? entry.pics.length : 0;
  return {
    state: {
      where: 'The dev book of a Viking OSRS-style game built by two creators with their AI builder Savi; each entry is a creator message to Savi',
      text: str(entry.text, JEVB.textMax), author: entry.author === 'camptons_world' ? 'camptons_world' : 'zezima',
      day: str(entry.day || day, 10), hasPics: pics > 0, replyFirst120: str(entry.reply, JEVB.replyMax),
    },
    questions: {
      kind: { type: 'choice', instructions: 'What kind of dev message is this?', criteria: KIND_C },
      weight: { type: 'score', instructions: 'How much does this message move the game? A milestone is a whole system landing or a big turn.', criteria: JEVB.weights.slice() },
      pin: { type: 'boolean', instructions: 'Is this a decision worth a wax seal: one the team should keep on the first page of the book?' },
      jev_emoji: { type: 'choice', instructions: 'You are JEV, a small wisp on the team. Which one reaction do you leave on this message?', criteria: REACT_C },
      mood: { type: 'choice', instructions: 'What mood does the author write in?', criteria: MOOD_C },
    },
  };
}

// weighted draw over { key: p }; only keys in `allowed`; null when nothing has weight
export function sampleOf(probs, allowed, rand) {
  if (!probs || typeof probs !== 'object') return null;
  const live = allowed.map((k) => [k, Number(probs[k])]).filter(([, p]) => p > 0 && isFinite(p));
  const tot = live.reduce((t, [, p]) => t + p, 0);
  if (!(tot > 0)) return null;
  let r = R(rand) * tot;
  for (const [k, p] of live) if ((r -= p) < 0) return k;
  return live[live.length - 1][0];
}
function scoreProbs(a, n) { // score answers: probabilities keyed by step name or index
  const p = a?.probabilities, out = {};
  if (p && typeof p === 'object') JEVB.weights.slice(0, n).forEach((w, i) => { const v = Number(p[w] ?? p[i] ?? p[String(i)]); if (v > 0) out[w] = v; });
  if (!Object.keys(out).length && Number.isFinite(Number(a?.score))) { const i = Math.max(0, Math.min(n - 1, Math.round(Number(a.score)))); out[JEVB.weights[i]] = 1; }
  return out;
}
export function sampleTags(answers, rand) {
  if (!answers || typeof answers !== 'object') return null;
  const kind = sampleOf(answers.kind?.probabilities, JEVB.kinds, rand);
  const wp = scoreProbs(answers.weight, JEVB.weights.length);
  const weight = sampleOf(wp, JEVB.weights, rand);
  const pp = Number(answers.pin?.probability);
  const pin = Number.isFinite(pp) ? R(rand) < pp : false;
  const emoji = sampleOf(answers.jev_emoji?.probabilities, JEVB.reacts, rand);
  const mood = sampleOf(answers.mood?.probabilities, JEVB.moods, rand);
  if (!kind && !weight && !emoji && !mood) return null;
  const tot = Object.values(wp).reduce((t, v) => t + v, 0);
  const wscore = tot > 0 ? Math.round(JEVB.weights.reduce((t, w, i) => t + i * (wp[w] ?? 0), 0) / tot * 1000) / 1000 : (weight ? JEVB.weights.indexOf(weight) : 1);
  return { kind: kind ?? 'vibe', weight: weight ?? 'normal', pin, emoji: emoji ?? 'thumbs', mood: mood ?? 'calm', wscore };
}

export function pickNext(entries, known, skip = {}, now = 0) {
  const has = known instanceof Set ? (id) => known.has(id) : (id) => !!(known && known[id]);
  let best = null;
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || !e.id || !str(e.text, 4) || e.jev || has(e.id)) continue;
    if ((skip[e.id] ?? 0) > now) continue;
    if (!best || (Number(e.at) || 0) > (Number(best.at) || 0)) best = e;
  }
  return best;
}
export function gate(sess = {}, now = 0, o = {}) {
  if (!o.editorOnline) return 'no-editor';
  if (o.off) return 'off';
  if (sess.busy && now - sess.busy < 20000) return 'busy';
  if ((sess.asks ?? 0) >= JEVB.perOpen) return 'cap';
  if (now - (sess.lastAt ?? -1e15) < JEVB.gapMs) return 'gap';
  return 'ok';
}

export function metaToJev(row) {
  if (!row || !row.kind) return null;
  const num = row.weight !== null && row.weight !== '' && Number.isFinite(Number(row.weight));
  const w = num ? Number(row.weight) : JEVB.weights.includes(row.weight) ? row.weight : 'normal';
  const kinds = [...JEVB.kinds, ...JEVB.liveKinds];
  return {
    kind: kinds.includes(row.kind) ? row.kind : 'vibe', weight: w, pin: !!Number(row.pin),
    emoji: JEVB.reacts.includes(row.jev_emoji) ? row.jev_emoji : null, mood: JEVB.tint[row.mood] ? row.mood : 'calm',
    ...(Number.isFinite(Number(row.wscore)) && row.wscore !== null && row.wscore !== undefined ? { wscore: Number(row.wscore) } : {}),
  };
}
// JEV's reaction in a contract reacts bag: counts as reactor 'JEV' exactly once
export function withJevReact(reacts, emoji) {
  const out = { ...(reacts || {}) };
  if (!JEVB.reacts.includes(emoji)) return out;
  const r = out[emoji] ? { ...out[emoji], who: [...(out[emoji].who || [])] } : { n: 0, mine: false, who: [] };
  if (!r.who.includes(JEVB.reactor)) { r.who.push(JEVB.reactor); r.n = (Number(r.n) || 0) + 1; }
  out[emoji] = r;
  return out;
}
export function applyJev(entries, metaById = {}) {
  return (Array.isArray(entries) ? entries : []).map((e) => {
    const jev = e?.jev ?? metaToJev(metaById[e?.id]);
    if (!jev) return e;
    return { ...e, jev, pinned: !!(e.pinned || jev.pin), reacts: jev.emoji ? withJevReact(e.reacts, jev.emoji) : e.reacts };
  });
}
export const isPinned = (e) => !!(e && (e.pinned || e.jev?.pin));
export function floatPinned(entries) {
  const a = Array.isArray(entries) ? entries : [];
  return [...a.filter(isPinned), ...a.filter((e) => !isPinned(e))];
}
// JEV's pick: the day's entry with the highest weight score (ties: the earlier one); null when JEV has read none
export function jevPick(entries) {
  let best = null, bs = -1;
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e?.jev) continue;
    const s = weight01(e.jev) + (isPinned(e) ? 0.001 : 0);
    if (s > bs || (s === bs && (Number(e.at) || 0) < (Number(best.at) || 0))) { best = e; bs = s; }
  }
  return best ? best.id : null;
}
export function decor(e) {
  const j = e?.jev;
  if (!j) return { ribbon: null, seal: isPinned(e), tint: null, kind: null, mood: null };
  return { ribbon: isMilestone(j) ? 'gold' : null, seal: isPinned(e), tint: JEVB.tint[j.mood] ?? null, kind: j.kind, mood: j.mood };
}
