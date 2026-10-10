// 2007scape-style STRICT chat filter (creator 2026-10-06: "you can barely really even say much"), toggled per player in O → Player.
// Paints each viewer's own copy: the log keeps what was said; player.state.chatFilter === false shows it raw. Default ON.
// Two lists (creator 2026-10-06: "good" got starred, so did "tonight"): STRONG roots are caught anywhere, inside words, stretched (fuuuck), leetspeak and spaced
// out (f u c k, f.u.c.k); WORD roots are caught only as a whole word (+ s/ed/ing/er...), so good, tonight, skill, both, click and speed stay readable.
const STRONG = ['fuck','fuk','fck','fkn','fkin','fking','fcking','phuck','phuk','fucc','shit','sht','bitch','btch','cunt','pussy','asshole','bastard','slut','whore','nigg','nigga','negro','fagg','retard','twat','wank','bollock','porn','penis','vagina','jizz','horny','milf','suicide','hitler','nazi','kkk','stfu','gtfo','wtf','omfg','lmfao'];
const WORD = ['dick','dik','cock','cok','puss','ass','arse','damn','dam','hell','crap','piss','hoe','fag','gay','homo','nig','tard','spaz','bugger','bloody','sex','nude','naked','tit','boob','anal','anus','rape','kill','die','kys','pms','noob','nub','scam','hack','bot','drug','weed','beer','drunk','idiot','stupid','dumb','moron','loser','suck','sux','screw','pee','poo','poop','bum','jerk','prick','douche','thot','simp','kinky','lick','blow','bang','hump','strip','balls','nut','nuts','cum','spunk','satan','god','jesus','christ','lord'];
const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '(': 'c', 'q': 'k', 'z': 's', 'x': 'ks' };
const norm = (c) => { c = c.toLowerCase(); return LEET[c] ?? c; };
const nw = (w) => w.split('').map(norm).join('');
const esc = (c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byLen = (a) => a.map(nw).sort((x, y) => y.length - x.length);
const STRONG_RE = new RegExp(byLen(STRONG).map((r) => r.split('').map((c) => esc(c) + '+').join('')).join('|'), 'g'); // stretched letters allowed
const WORD_RE = new RegExp('^(?:' + byLen(WORD).map((r) => r.split('').map(esc).join('') + '+').join('|') + ')(?:s|es|ed|ing|in|er|ers|y|ie|ies|z)?$'); // whole word, only the last letter may stretch (so "good" is not "god")
// URLs and anything that looks like contact info go too (2007 starred links)
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b\S+\.(?:com|net|org|gg|io|co|tv|xyz)\b/gi;
// a short pardon list for the inside-word catch
const SAFE = /\b(scunthorpe|shiitake|snigger\w*|swank\w*|cockatrice|peacock|bastardsword)\b/gi;
export function starChat(text) {
  const raw = String(text ?? '');
  if (!raw) return raw;
  const keep = []; const t = raw.replace(SAFE, (w) => { keep.push(w); return '\u0001'.repeat(w.length); });
  const hit = new Uint8Array(t.length);
  // tokens: whitespace-separated words; inside one, punctuation is skipped (f.u.c.k) and leet is read as letters
  const toks = []; const re = /\S+/g; let m;
  const read = (w, at) => { const idx = [], ch = []; for (let i = 0; i < w.length; i++) { const n = norm(w[i]); if (/[a-z]/.test(n)) for (const c of n) { ch.push(c); idx.push(at + i); } } return ch.length ? { s: ch.join(''), idx } : null; };
  const extra = []; // the same word with its edge punctuation dropped: "cum!" must be read as cum, not cumi (! doubles as a leet i)
  while ((m = re.exec(t))) { const a = read(m[0], m.index); if (a) toks.push(a); const e = /^[^a-z0-9]*(.*?)[^a-z0-9]*$/i.exec(m[0]); if (e[1] && e[1].length !== m[0].length) { const b = read(e[1], m.index + m[0].indexOf(e[1])); if (b && (!a || b.s !== a.s)) { extra.push(b); if (a) a.bare = b; } } }
  // runs of single letters ("f u c k") are read as one word too
  const groups = toks.slice(), one = (x) => x.bare ?? x; for (let i = 0; i < toks.length;) { if (one(toks[i]).s.length !== 1) { i++; continue; } let j = i; while (j < toks.length && one(toks[j]).s.length === 1) j++; if (j - i >= 3) groups.push({ s: toks.slice(i, j).map((x) => one(x).s).join(''), idx: toks.slice(i, j).flatMap((x) => one(x).idx) }); i = j; }
  groups.push(...extra);
  for (const g of groups) {
    if (WORD_RE.test(g.s)) { for (const i of g.idx) hit[i] = 1; continue; }
    STRONG_RE.lastIndex = 0; let k;
    while ((k = STRONG_RE.exec(g.s))) { for (let q = k.index; q < k.index + k[0].length; q++) hit[g.idx[q]] = 1; if (!k[0].length) STRONG_RE.lastIndex++; }
  }
  let out = ''; for (let i = 0; i < t.length; i++) out += hit[i] ? '*' : t[i];
  out = out.replace(LINK, (w) => '*'.repeat(w.length));
  let n = 0; return out.replace(/\u0001+/g, () => keep[n++] ?? '');
}
