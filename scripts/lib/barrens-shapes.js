// World 302 v2, lane 6 (docs/board/BARRENS-VARIETY-PLAN-2026-10-06.md, fixes 8-11): SHAPES + ROTATION + FRESHNESS.
// Pure ES module: no ctx, no clock, no dice of its own. The runner hands in ctx.now() and ctx.random as `rand`.
//   rotateOnline(bots, prevOnline|null, hour, now, rand) -> { online: string[], nextAt }   10-14 online, hours respected
//   shapeLines(lines [{sender,message}], now, rand, bots) -> [{ at, sender, text }]       bursts, stragglers, *fix, CAPS trade
//   isStale(text, recent: string[]) -> boolean                                          Jaccard >= 0.6 or same first 3 words
//   pickTopic(topics, used: string[], rand) -> { topic, used }                           no repeat until the deck cycles
// shapeLines only splits, uppercases or swaps two letters of guarded text; the runner still passes every post through
// guardLine (scripts/lib/barrens-guard.js) right before logLine, so a typo can never smuggle anything past it.

export const SHAPES = {
  onlineMin: 10,
  onlineMax: 14,
  rotateMinMs: 20 * 60000,
  rotateMaxMs: 40 * 60000,
  shiftMin: 2,
  shiftMax: 4,
  gapMs: [1500, 3000],     // normal spacing between posts
  burstGapMs: [500, 1100], // spam burst: three quick lines from one bot
  stragglerMs: [6000, 10000],
  burstChance: 0.25, burstMinWords: 8,
  stragglerChance: 0.2,
  typoChance: 0.15,
  capsChance: 0.55,
  staleJaccard: 0.6,
  staleWindow: 40,
};

const FORBIDDEN = /zezima/i; // the creator is the only Zezima: no bot of that name ever goes online
const MERCHANT = /merch|trad|sell|selling|buying|flip|margin|scam|trim|shop|bond|price|gp\b/i;
const between = (rand, [a, b]) => a + rand() * (b - a);
const pickIndex = (rand, n) => Math.min(n - 1, Math.floor(rand() * n));

export function inHours(bot, hour) {
  const h = bot && bot.hours;
  if (!Array.isArray(h) || h.length < 2 || hour == null) return true;
  const [from, to] = h;
  if (from === to) return true;
  return from < to ? hour >= from && hour < to : hour >= from || hour < to;
}

function hoursGap(bot, hour) { // how far (in hours) a bot is from its window; 0 inside
  if (inHours(bot, hour)) return 0;
  const [from] = bot.hours;
  return ((from - hour) % 24 + 24) % 24;
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = pickIndex(rand, i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function rotateOnline(bots, prevOnline, hour, now, rand) {
  const S = SHAPES;
  const roster = (bots || []).filter((b) => b && b.name && !FORBIDDEN.test(b.name));
  const names = new Set(roster.map((b) => b.name));
  const awake = roster.filter((b) => inHours(b, hour)).map((b) => b.name);
  // A thin hour still keeps the chat alive: top up from the bots nearest their window.
  const asleep = roster.filter((b) => !inHours(b, hour)).sort((a, b) => hoursGap(a, hour) - hoursGap(b, hour)).map((b) => b.name);
  const cap = Math.min(S.onlineMax, roster.length);
  const floor = Math.min(S.onlineMin, roster.length);
  let target;
  let online;
  if (!Array.isArray(prevOnline) || !prevOnline.length) {
    target = Math.min(cap, S.onlineMin + pickIndex(rand, S.onlineMax - S.onlineMin + 1));
    online = shuffle(awake, rand).slice(0, target);
  } else {
    target = Math.max(floor, Math.min(cap, prevOnline.length + pickIndex(rand, 3) - 1));
    online = prevOnline.filter((n) => names.has(n) && awake.includes(n));
    const shift = Math.min(online.length, S.shiftMin + pickIndex(rand, S.shiftMax - S.shiftMin + 1));
    const bench = shuffle(awake.filter((n) => !online.includes(n)), rand);
    if (bench.length) for (let i = 0; i < shift && online.length; i++) online.splice(pickIndex(rand, online.length), 1);
    for (const n of bench) { if (online.length >= target) break; online.push(n); }
  }
  for (const n of shuffle(awake, rand)) { if (online.length >= target) break; if (!online.includes(n)) online.push(n); }
  for (const n of asleep) { if (online.length >= floor) break; if (!online.includes(n)) online.push(n); }
  if (online.length > target) online = online.slice(0, target);
  return { online, nextAt: now + Math.round(between(rand, [S.rotateMinMs, S.rotateMaxMs])) };
}

function isMerchant(bot) {
  if (!bot) return false;
  const hay = [bot.name, bot.persona, bot.quirks, ...(bot.topics || []), ...(bot.catch || [])].join(' ');
  return MERCHANT.test(hay);
}

function splitThree(words) {
  const n = words.length, a = Math.ceil(n / 3), b = Math.ceil((n - a) / 2);
  return [words.slice(0, a), words.slice(a, a + b), words.slice(a + b)].map((w) => w.join(' ')).filter(Boolean);
}

function typo(text, rand) { // swap two inner letters of one word >= 5 letters; returns { text, word } or null
  const words = text.split(' ');
  const idx = words.map((w, i) => (/^[a-z]{5,}$/i.test(w) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return null;
  const i = idx[pickIndex(rand, idx.length)], w = words[i];
  const k = 1 + pickIndex(rand, w.length - 3);
  const bad = w.slice(0, k) + w[k + 1] + w[k] + w.slice(k + 2);
  if (bad === w) return null;
  words[i] = bad;
  return { text: words.join(' '), word: w };
}

export function shapeLines(lines, now, rand, bots) {
  const S = SHAPES;
  const byName = new Map((bots || []).map((b) => [b && b.name, b]));
  const out = [];
  let t = now, burstUsed = false, typoUsed = false, stragglerUsed = false;
  (lines || []).forEach((line, i) => {
    const sender = line && line.sender;
    let text = String((line && line.message) || '').replace(/\s+/g, ' ').trim();
    if (!sender || !text) return;
    if (i > 0) t += between(rand, S.gapMs);
    // straggler: a later line lands 6-10 s after the one before it
    if (i > 0 && !stragglerUsed && rand() < S.stragglerChance) { stragglerUsed = true; t = (out.length ? out[out.length - 1].at : t) + between(rand, S.stragglerMs); }
    const bot = byName.get(sender);
    if (isMerchant(bot) && rand() < S.capsChance) text = text.toUpperCase();
    const words = text.split(' ');
    if (!burstUsed && words.length >= S.burstMinWords && rand() < S.burstChance) {
      burstUsed = true;
      splitThree(words).forEach((part, j) => { if (j) t += between(rand, S.burstGapMs); out.push({ at: Math.round(t), sender, text: part, ...(j ? { cont: true } : {}) }); }); // cont: a burst's later fragment keeps its lower-case start
      return;
    }
    if (!typoUsed && rand() < S.typoChance) {
      const ty = typo(text, rand);
      if (ty) {
        typoUsed = true;
        out.push({ at: Math.round(t), sender, text: ty.text });
        t += between(rand, S.burstGapMs);
        out.push({ at: Math.round(t), sender, text: '*' + ty.word });
        return;
      }
    }
    out.push({ at: Math.round(t), sender, text });
  });
  return out.sort((a, b) => a.at - b.at);
}

const tokens = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);

export function isStale(text, recent) {
  const a = tokens(text);
  if (!a.length) return true;
  const setA = new Set(a), head = a.length >= 3 ? a.slice(0, 3).join(' ') : null;
  for (const r of (recent || []).slice(-SHAPES.staleWindow)) {
    const b = tokens(r);
    if (!b.length) continue;
    if (head && b.length >= 3 && b.slice(0, 3).join(' ') === head) return true;
    const setB = new Set(b);
    let inter = 0;
    for (const w of setA) if (setB.has(w)) inter++;
    const union = setA.size + setB.size - inter;
    if (union && inter / union >= SHAPES.staleJaccard) return true;
  }
  return false;
}

export function pickTopic(topics, used, rand) {
  const deck = (topics || []).filter(Boolean);
  const prev = Array.isArray(used) ? used.filter((t) => deck.includes(t)) : [];
  if (!deck.length) return { topic: null, used: prev };
  let fresh = deck.filter((t) => !prev.includes(t));
  let base = prev;
  if (!fresh.length) { // deck cycled: start over, but never the same seed twice in a row
    const last = prev[prev.length - 1];
    fresh = deck.length > 1 ? deck.filter((t) => t !== last) : deck;
    base = [];
  }
  const topic = fresh[pickIndex(rand, fresh.length)];
  return { topic, used: [...base, topic] };
}
