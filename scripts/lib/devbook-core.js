// DEV TEAM TRACKER · pure core (lane 2, plan docs/board/DEV-TRACKER-PLAN-2026-10-06.md). No ctx, no clock, no random:
// scripts/devbook-player.js feeds it rows and seeded draws. Reactions, JEV's read of each entry, filters, pages, the badge.
export const REACTS = ['heart', 'fire', 'thumbs', 'laugh', 'wow', 'sad', 'mad', 'axe'];
export const FILTERS = ['all', 'zezima', 'camptons_world', 'pinned', 'reacted'];
export const PER_PAGE = 10, TRIM = 600, Q_MAX = 60, PICS_MAX = 6;
export const JEV_NAME = 'JEV';
export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isDay = (d) => typeof d === 'string' && DAY_RE.test(d);
export const isReact = (e) => REACTS.includes(e);
export const cleanQ = (q) => String(q ?? '').replace(/\s+/g, ' ').trim().slice(0, Q_MAX);
export const cleanFilter = (f) => (FILTERS.includes(f) ? f : 'all');

// who may look / react / pin: editors always; visitors only when world.state.devbook says so
export function access(player, ws) {
  const ed = !!player?.isEditor, w = ws || {};
  const see = ed || w.visitorsSee === true;
  return { see, react: see && (ed || w.visitorsReact === true), pin: ed, jev: ed };
}

export function trimText(text, n = TRIM) {
  const t = String(text ?? '');
  if (t.length <= n) return { text: t, full: true };
  const cut = t.slice(0, n), sp = cut.lastIndexOf(' ');
  return { text: (sp > n * 0.7 ? cut.slice(0, sp) : cut).trimEnd() + '…', full: false };
}

// days from index.json text and/or the world's file list; newest first, unique
export function daysFrom(indexText, files) {
  const set = new Set();
  try { const ix = indexText ? JSON.parse(indexText) : null; for (const d of ix?.days ?? []) { const day = typeof d === 'string' ? d : d?.day; if (isDay(day)) set.add(day); } } catch {}
  for (const f of files ?? []) { const m = /^data\/devlog\/(?:zezima|campton)-(\d{4}-\d{2}-\d{2})\.(?:json|md)$/.exec(f); if (m) set.add(m[1]); }
  return [...set].sort().reverse();
}

// rows: [{ msg_id, user_id, name, emoji }] -> { msgId: { emoji: { n, mine, who[] } } }; JEV's pick from meta joins as reactor 'JEV'
export function foldReacts(rows, userId, metas) {
  const out = {};
  const add = (id, emoji, name, mine) => {
    if (!isReact(emoji)) return;
    const m = (out[id] ??= {}), r = (m[emoji] ??= { n: 0, mine: false, who: [] });
    r.n++; if (mine) r.mine = true; if (name && r.who.length < 12 && !r.who.includes(name)) r.who.push(name);
  };
  for (const r of rows ?? []) add(r.msg_id, r.emoji, r.name || 'someone', !!userId && r.user_id === userId);
  for (const [id, m] of Object.entries(metas ?? {})) if (m?.jev_emoji) add(id, m.jev_emoji, JEV_NAME, false);
  return out;
}

// optimistic local step of one reaction (before SQL answers); returns a new map for that msg
export function stepReact(map, emoji, on, name) {
  const m = { ...(map ?? {}) }, r = m[emoji] ? { ...m[emoji], who: [...m[emoji].who] } : { n: 0, mine: false, who: [] };
  if (on && !r.mine) { r.n++; r.mine = true; if (name && !r.who.includes(name)) r.who.push(name); }
  if (!on && r.mine) { r.n = Math.max(0, r.n - 1); r.mine = false; r.who = r.who.filter((w) => w !== name); }
  if (r.n > 0) m[emoji] = r; else delete m[emoji];
  return m;
}

export const humanReacts = (rm) => Object.values(rm ?? {}).some((r) => r.n - (r.who.includes(JEV_NAME) ? 1 : 0) > 0);

export function isPinned(meta) {
  if (!meta) return false;
  if (meta.pinned === 1 || meta.pinned === true) return true;
  if (meta.pinned === 0 || meta.pinned === false) return false;
  return meta.pin === 1 || meta.pin === true;
}

export function jevOf(meta) {
  if (!meta || !meta.kind) return null;
  return { kind: meta.kind, weight: +meta.weight || 0, pin: meta.pin === 1 || meta.pin === true, emoji: meta.jev_emoji ?? null, mood: meta.mood ?? null };
}

// one entry in the contract's page shape
export function shapeEntry(e, { reacts, meta, full = false } = {}) {
  const t = full ? { text: String(e.text ?? ''), full: true } : trimText(e.text);
  return {
    id: e.id, at: e.at, author: e.author, text: t.text, full: t.full,
    pics: (e.pics ?? []).slice(0, PICS_MAX), reply: e.reply ? trimText(e.reply, 300).text : null,
    reacts: reacts ?? {}, jev: jevOf(meta), pinned: isPinned(meta),
  };
}

// filter + search + order (pinned first, then by time); entries sorted by at already
export function selectEntries(entries, { filter = 'all', q = '', reacts = {}, metas = {} } = {}) {
  const ql = cleanQ(q).toLowerCase();
  let list = entries.filter((e) => {
    if (filter === 'zezima' || filter === 'camptons_world') { if (e.author !== filter) return false; }
    else if (filter === 'pinned') { if (!isPinned(metas[e.id])) return false; }
    else if (filter === 'reacted') { if (!humanReacts(reacts[e.id])) return false; }
    if (ql && !(`${e.text ?? ''} ${e.reply ?? ''}`.toLowerCase().includes(ql))) return false;
    return true;
  });
  const pin = list.filter((e) => isPinned(metas[e.id]));
  return pin.length && filter !== 'pinned' ? [...pin, ...list.filter((e) => !isPinned(metas[e.id]))] : list;
}

export function paginate(list, page, per = PER_PAGE) {
  const pages = Math.max(1, Math.ceil(list.length / per));
  const p = Math.min(Math.max(0, Math.floor(+page || 0)), pages - 1);
  return { page: p, pages, slice: list.slice(p * per, p * per + per) };
}

export const newestAt = (entries) => entries.reduce((m, e) => Math.max(m, +e.at || 0), 0);
export const unreadCount = (entries, seenAt) => entries.filter((e) => (+e.at || 0) > (+seenAt || 0)).length;

// ── JEV: one typed ask per entry, sampled with the caller's seeded draws ──
export const JEV_KINDS = {
  milestone: 'something landed, shipped or now works', decision: 'a choice about how the game should be',
  bug: 'something broken or wrong being reported', idea: 'a new feature or thing to build',
  polish: 'tuning the look, feel or numbers of something that exists', question: 'asking how or whether',
  chatter: 'small talk, thanks, a quick ok',
};
export const JEV_MOODS = { excited: 'hyped, big energy', focused: 'heads-down, precise', frustrated: 'annoyed something is off', playful: 'joking, loose', curious: 'exploring, wondering', calm: 'plain and steady' };
export const JEV_WEIGHTS = ['trivial', 'minor', 'notable', 'major', 'landmark'];
export const JEV_EMOJI = { heart: 'warm, lovely', fire: 'hype, a big win', thumbs: 'solid, agreed', laugh: 'funny', wow: 'surprising, impressive', sad: 'a loss or setback', mad: 'a nasty bug or annoyance', axe: 'viking grind, chopping through work' };

export function jevAsk(e) {
  return {
    state: {
      game: 'The First Den, a Viking OSRS-style skilling world built by two creators and their AI builder Savi',
      author: e.author === 'camptons_world' ? 'Campton (co-creator)' : 'Zezima (creator)',
      message: String(e.text ?? '').slice(0, 500), saviReply: e.reply ? String(e.reply).slice(0, 200) : null,
    },
    questions: {
      kind: { type: 'choice', instructions: 'What kind of dev-log entry is this message?', criteria: JEV_KINDS },
      weight: { type: 'score', instructions: 'How much does this message matter to the story of the build?', criteria: JEV_WEIGHTS },
      pin: { type: 'boolean', instructions: 'Is this a key decision or milestone the team should keep pinned on the first page?' },
      emoji: { type: 'choice', instructions: 'As a teammate, which one reaction would you leave on it?', criteria: JEV_EMOJI },
      mood: { type: 'choice', instructions: 'What mood was the author in?', criteria: JEV_MOODS },
    },
  };
}

// sample { key: p } with u in 0..1, restricted to the allowed keys; null when nothing usable
export function sampleKey(probs, allowed, u) {
  if (!probs || typeof probs !== 'object') return null;
  const keys = Object.keys(allowed).filter((k) => +probs[k] > 0 && isFinite(+probs[k]));
  const tot = keys.reduce((s, k) => s + +probs[k], 0); if (tot <= 0) return null;
  let t = Math.min(Math.max(+u || 0, 0), 0.999999) * tot;
  for (const k of keys) { t -= +probs[k]; if (t < 0) return k; }
  return keys[keys.length - 1];
}

// answers -> meta row; u = 5 seeded draws. Pin samples JEV's probability but needs at least an even call.
export function jevMeta(answers, u = []) {
  const a = answers ?? {};
  const kind = sampleKey(a.kind?.probabilities, JEV_KINDS, u[0]) ?? (JEV_KINDS[a.kind?.choice] ? a.kind.choice : null);
  if (!kind) return null;
  const wIdx = Object.fromEntries(JEV_WEIGHTS.map((w, i) => [String(i), w]));
  const wp = a.weight?.probabilities ? Object.fromEntries(Object.entries(a.weight.probabilities).map(([k, p]) => [JEV_WEIGHTS.includes(k) ? String(JEV_WEIGHTS.indexOf(k)) : k, p])) : null;
  const ws = sampleKey(wp, wIdx, u[1]);
  const weight = ws != null ? +ws : Math.min(4, Math.max(0, Math.round(+a.weight?.score || 0)));
  const pp = +a.pin?.probability || 0;
  return {
    kind, weight, pin: pp >= 0.5 && (+u[2] || 0) < pp ? 1 : 0,
    jev_emoji: sampleKey(a.emoji?.probabilities, JEV_EMOJI, u[3]) ?? (isReact(a.emoji?.choice) ? a.emoji.choice : null),
    mood: sampleKey(a.mood?.probabilities, JEV_MOODS, u[4]) ?? (JEV_MOODS[a.mood?.choice] ? a.mood.choice : null),
  };
}
