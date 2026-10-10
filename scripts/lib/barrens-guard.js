// Barrens chat guard (lane 6, pure, no ctx): every bot line passes through guardLine before it reaches the chat box.
// guardLine(text, humanNames) -> cleaned text (trimmed, whitespace collapsed, <= MAX chars) | null (drop the line).
// Drops: slurs + hate terms (whole-word and obfuscated: leet, separators, repeated letters), sexual words, links/domains,
// asks for passwords/pins/emails/real money/payment apps/gift cards, risky real people, self-harm pushes, and any
// family insult ("your mom ...") when the line also targets a real human (name or @name). Mild gaming crude passes.
export const MAX = 80;

const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '6': 'g', '€': 'e', '¡': 'i' };
const collapse = (s) => s.replace(/(.)\1+/g, '$1');

// Slurs that are safe to find inside any squashed run of letters (compared after repeat-collapse).
const SLUR_ANY = ['niger', 'niga', 'nigah', 'nigur', 'niglet', 'fagot', 'fagit', 'tranie', 'trany', 'kike', 'wetback', 'chingchong', 'raghead', 'towelhead', 'sandnig', 'beaner', 'spook', 'jigabo', 'golywog', 'pickaninny', 'darkie', 'shemale', 'retard'];
// Exceptions where a SLUR_ANY stem would hit an innocent squashed word.
const SLUR_ANY_OK = ['nigeria', 'niger', 'spooky', 'spooked', 'spooks', 'spook', 'retardant'];
// Whole-token slurs / hate words (collapsed form).
const SLUR_WORD = ['fag', 'fags', 'fagy', 'dyke', 'dykes', 'spic', 'spics', 'spick', 'chink', 'chinks', 'gok', 'goks', 'coon', 'cons', 'kikes', 'nazi', 'nazis', 'hitler', 'heil', 'kk', 'kkk', 'paki', 'pakis', 'gypo', 'gyp', 'tranys', 'homo', 'homos', 'lesbo', 'zipperhead', 'redskin', 'sambo', 'mongoloid', 'tard', 'tards', 'retards', 'nigs', 'nig', 'wog', 'wogs', 'injun', 'squaw', 'cracka', 'kys'];
// 'cons' is "coons" collapsed; harmless "cons" is rare in chat and the cost of a dropped line is nothing.
const HATE_PHRASE = [/\bwhite\s+power\b/, /\bgas\s+the\b/, /\bsieg\s+heil\b/, /\b14\s*88\b/, /\bkill\s+(yo)?ur\s*self\b/, /\bkill\s+yourself\b/, /\bkill\s+urself\b/, /\bgo\s+die\b/, /\bhang\s+yourself\b/, /\bneck\s+yourself\b/, /\bunalive\b/];

// Sexual words (whole-token, collapsed; 'cock' as a token only so cockatrice passes).
const SEX_WORD = ['sex', 'sexy', 'sexual', 'porn', 'porno', 'pornhub', 'nude', 'nudes', 'naked', 'horny', 'dick', 'dicks', 'cock', 'cocks', 'pusy', 'penis', 'vagina', 'bobs', 'bobies', 'tits', 'tities', 'cum', 'cuming', 'rape', 'raped', 'rapist', 'blowjob', 'handjob', 'onlyfans', 'hentai', 'milf', 'nsfw', 'xx', 'xxx', 'orgasm', 'erotic', 'fetish', 'boner', 'dildo', 'anal', 'thong', 'stripper', 'hooker', 'slut', 'sluts', 'whore', 'whores', 'thot', 'thots', 'masturbate', 'jerkof', 'wank', 'wanker', 'molest', 'pedo', 'pedophile'];
const SEX_PHRASE = [/\bsend\s+(pics|nudes|feet)\b/, /\bsuck\s+(my|ur|your)\b/, /\bfeet\s+pics\b/];

// Links and domains.
const TLD = 'com|net|org|gg|io|co|ru|xyz|tv|me|ly|uk|de|info|biz|app|link|site|shop|online|club|live|store|cc|to|us';
const URL_RE = [/https?\s*:\s*\/\//, /\bwww\s*\./, /\bwww\b/, new RegExp(`[a-z0-9-]\\s*(\\.|\\(dot\\)|\\[dot\\]|\\sdot\\s)\\s*(${TLD})\\b`), /\bdiscord\s*(\.|dot)?\s*gg\b/, /\bbit\s*\.\s*ly\b/];

// Asks for real things.
const ASK_RE = [/\bpass\s*words?\b/, /\bpasswd\b/, /\bpw\b/, /\bpin\s*(number|code|#)?\b/, /\bbank\s*pin\b/, /\be\s*-?\s*mails?\b/, /\bgmail\b/, /\bhotmail\b/, /\boutlook\b/, /\breal\s+(money|cash|life\s+money|dollars)\b/, /\birl\s+(money|cash)\b/, /\brwt\b/, /\bpay\s*pal\b/, /\bcash\s*app\b/, /\bvenmo\b/, /\bzelle\b/, /\bgift\s*cards?\b/, /\bsteam\s*cards?\b/, /\bcredit\s*cards?\b/, /\bcard\s+(number|details|info)\b/, /\bbitcoin\b/, /\bbtc\b/, /\bcrypto\b/, /\bsocial\s+security\b/, /\b(acc(ount)?|login)\s+(details|info|deets)\b/, /\blog\s*in\s+(details|info)\b/, /\bphone\s+number\b/, /\bhome\s+address\b/, /\bwhere\s+do\s+(you|u)\s+live\b/, /\$\s*\d/, /\b\d+\s*(usd|dollars|bucks|quid|euros?)\b/, /\b(2fa|authenticator)\s+code\b/, /\bverification\s+code\b/];

// Real people judged risky (politics, crime, hate figures, living celebrities).
const PEOPLE_RE = [/\btrump\b/, /\bbiden\b/, /\bobama\b/, /\bputin\b/, /\bzelensky[iy]?\b/, /\bnetanyahu\b/, /\bxi\s+jinping\b/, /\bkim\s+jong/, /\belon\b/, /\bmusk\b/, /\bkanye\b/, /\bepstein\b/, /\bdiddy\b/, /\bandrew\s+tate\b/, /\btate\b/, /\bharris\b/, /\bclinton\b/, /\bstalin\b/, /\bmussolini\b/, /\bbin\s+laden\b/, /\bosama\b/, /\btaylor\s+swift\b/, /\bmr\s*beast\b/, /\bpope\b/, /\bking\s+charles\b/, /\bmodi\b/, /\bpelosi\b/, /\bdesantis\b/, /\bvance\b/, /\bzuckerberg\b/, /\bbezos\b/];

// Family insults (only a drop when a human is also named in the line).
const FAMILY_RE = /\b(your|ur|yo|yer|ya|youre|you're|ure)\s+(mom|moms|mum|mums|mommy|momma|mama|mother|dad|dads|daddy|father|sister|sis|brother|wife|gf|girlfriend|grandma|granny|gran|nan|nana|family|fam|kids|son|daughter|aunt|auntie|uncle|parents)\b|\b(mom|mum|mama|mother|dad|father|sister|wife)\s+(is|was|so)\b/;

function normalize(text) {
  let s = String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  s = s.replace(/[\u200b-\u200f\u2060\ufeff]/g, '');
  return s;
}
function deLeet(s) { let o = ''; for (const ch of s) o += LEET[ch] ?? ch; return o; }

// Tokens: leet-mapped, split on non-letters; runs of single letters ("n i g g e r", "n.i.g") are joined into one token.
function tokens(lower) {
  const raw = deLeet(lower).split(/[^a-z]+/).filter(Boolean);
  const out = [];
  let run = '';
  for (const t of raw) {
    if (t.length === 1) { run += t; continue; }
    if (run) { out.push(run); run = ''; }
    out.push(t);
  }
  if (run) out.push(run);
  return out;
}

function hasSlur(lower) {
  const toks = tokens(lower);
  const col = toks.map(collapse);
  const wordSet = new Set(SLUR_WORD.map(collapse));
  for (const t of col) if (wordSet.has(t)) return true;
  // squashed scan per token and across the whole line (catches "n-i-g-g-e-r" split oddly)
  const okSet = new Set(SLUR_ANY_OK);
  const scan = (s, raw = s) => SLUR_ANY.some((stem) => {
    let i = s.indexOf(stem);
    while (i >= 0) {
      // an innocent word around the hit? (niger/nigeria only as a whole token)
      if (!(stem === 'niger' && /^niger(ia|ian|ians)?$/.test(raw)) && !(stem === 'spook' && /^spook(y|ed|s)?$/.test(s)) && !(stem === 'retard' && /^retardant/.test(s.slice(i)))) return true;
      i = s.indexOf(stem, i + 1);
    }
    return false;
  });
  for (let k = 0; k < col.length; k++) if (!okSet.has(toks[k]) && scan(col[k], toks[k])) return true;
  const squashed = collapse(toks.join(''));
  const benign = toks.filter((t) => okSet.has(t) || /^niger(ia|ian|ians)?$/.test(t)).length;
  if (!benign && scan(squashed, toks.join(''))) {
    // the whole-line squash only counts when single letters were joined (obfuscation), not ordinary word seams
    const singles = deLeet(lower).split(/[^a-z]+/).filter((t) => t.length <= 2).length;
    if (singles >= 3) return true;
  }
  const flat = deLeet(lower).replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ');
  return HATE_PHRASE.some((re) => re.test(flat) || re.test(lower));
}

function hasSex(lower) {
  const set = new Set(SEX_WORD.map(collapse));
  for (const t of tokens(lower)) if (set.has(collapse(t))) return true;
  return SEX_PHRASE.some((re) => re.test(lower));
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function targetsHuman(lower, humanNames) {
  for (const n of humanNames || []) {
    const name = String(n || '').trim().toLowerCase();
    if (name.length < 2) continue;
    if (lower.includes('@' + name)) return true;
    if (new RegExp(`(^|[^a-z0-9_])${esc(name)}($|[^a-z0-9_])`).test(lower)) return true;
  }
  return false;
}

export function guardLine(text, humanNames = []) {
  if (typeof text !== 'string') return null;
  // strip control chars, collapse whitespace
  let clean = text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const lower = normalize(clean);
  const spaced = lower.replace(/\s+/g, ' ');
  if (URL_RE.some((re) => re.test(spaced))) return null;
  if (ASK_RE.some((re) => re.test(spaced))) return null;
  if (PEOPLE_RE.some((re) => re.test(spaced))) return null;
  if (hasSlur(spaced)) return null;
  if (hasSex(spaced)) return null;
  const famText = deLeet(spaced).replace(/[^a-z'\s]+/g, ' ').replace(/\s+/g, ' ');
  if ((FAMILY_RE.test(spaced) || FAMILY_RE.test(famText)) && targetsHuman(spaced, humanNames)) return null;
  if (clean.length > MAX) { // cut at the last word break inside MAX (never mid-word); one unbroken run falls back to a hard cut
    const sp = clean.lastIndexOf(' ', MAX);
    clean = (sp >= MAX / 2 ? clean.slice(0, sp) : clean.slice(0, MAX)).replace(/[\s,;:\-]+$/, '').trimEnd();
  }
  return clean;
}
