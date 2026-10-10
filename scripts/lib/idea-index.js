// JEV-LEDGER L1 (docs/board/proposals/JEV-LEDGER.md): the idea index. Pure: text in, rows/text out. No ctx, no state.
// A card is '## D64 · Title · STATE'. Its key is "<thing>@<place>", 1-3 lowercase hyphenated words each:
// the card's own '- key:' line when present, else derived from the title/what (thing) and the where line (place).
export const MARKS = { open: "•", approved: "✓", built: "✔", dropped: "✗", shelved: "⏸", banned: "⛔" };

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[ðÐ]/g, "d").replace(/[þÞ]/g, "th")
  .replace(/[æÆ]/g, "ae").replace(/[øØǫǪ]/g, "o").toLowerCase().replace(/['’]s\b/g, "").replace(/[^a-z0-9&—:,.\s-]/g, " ").replace(/\s+/g, " ").trim();
const sing = (w) => w.length > 4 && /[^s]s$/.test(w) ? w.replace(/(?:es(?=$)(?<=(?:ch|sh|x)es))|s$/, "") : w;
const hy = (t) => fold(t).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// things that come back under new names: one canonical thing each (first match in the title wins, else in what)
export const CANON = [
  ["hearth-slabs", /hearth ?stones?|saga[- ]tiles?|floor tiles?|flag ?stones?|mosaic/],
  ["tide-stone", /tide[- ]?(?:stone|shelf|mark|marker|ledge|post|notch)/],
  ["antler-comb", /antler[- a-z]{0,12}comb|\bcombs?\b/],
  ["frozen-shore", /frozen shore|ice[- ]reading/],
  ["tallow-candles", /tallow|candle[- ]making|dip candles?/],
  ["hide-frame", /pelt|hide[- ]scraping|tanning frame/],
  ["eel-trap", /eel (?:trap|basket)/],
  ["storm-tree", /storm[- ](?:felled|split) tree/],
  ["fire-striker", /flint[- ]and[- ]steel|tinder[- ]horn|spark box/],
  ["wind-chime", /wind[- ]chime/],
  ["offering-shelf", /offering (?:shelf|bowl|ledge)|votive (?:shelf|hook)|blot[- ]bowl/],
  ["loom", /\bloom\b/],
];
const HEADS = new Set(("stone rack post loom well bench bowl shelf trap frame table pit tree gate arch oven trough vat bell chime horn drum staff stand seat altar shrine board wall panel map " +
  "cellar shed basket net stool press bucket pot candle torch lamp comb dice chain anvil tub mould mold hive skep spool float oar creel cutter splitter flail quern whetstone tally plank " +
  "lashing tripod baler soap rope fire flock ox tent awning dome buoy perch clock gnomon pillar cloth mitt hook caulker fletching weight skimmer smokehouse woodshed patch walk ledge " +
  "croft orchard marker cup mosaic tile vane runes distaff whorl pail cask barrel keg sled skis boat coracle kiln forge").split(" "));
const SOFT = new Set("the a an of and with for to in on at by carved hanging rune runed little small old great twin single".split(" "));

export const PLACES = { // tier 1 = a spot, tier 2 = an area; the earliest spot wins, else the earliest area, else "den"
  1: [["jetty", /jetty|pier|\bdock/], ["longship", /longship|boat ?house/], ["hall-floor", /(?:hall|longhouse) floor|floor of the (?:long)?(?:hall|house)|plank floor/],
    ["craft-bench", /work-?bench|work-?board|\bbench\b|\bstool\b/], ["loft", /\bloft\b|rafters?/], ["smithy", /smithy|\bforge\b|anvil/]],
  2: [["high-seat", /high seat|\bdais\b/], ["door", /\bdoor|threshold/], ["hearth", /hearth/], ["hall", /\bhall\b|longhouse|interior|inside/], ["shore", /shore|beach|lake|\bbank\b|shallows|water.s edge|shingle/],
    ["yard", /\byard|garden|\bgate\b|outside/], ["valley", /valley|\bhill|meadow|slope|ridge|\bwoods?\b|forest|tree ?line/]],
};

function earliest(t, list) { let best = null, at = Infinity; for (const [name, re] of list) { const m = re.exec(t); if (m && m.index < at) { at = m.index; best = name; } } return best; }
export function derivePlace(where) {
  const t = fold(where).split(/\bvisible\b|\bseen from\b/)[0];
  return earliest(t, PLACES[1]) ?? earliest(t, PLACES[2]) ?? "den";
}
export function deriveThing(title, what) {
  const tt = fold(title), c = earliest(tt, CANON); if (c) return c;
  for (const seg of tt.split(/\s*(?:—|:| - )\s*/)) { // title segments in order; the first with a head noun names it
    const w = seg.split(/\s*(?:&|,| and )\s*/)[0].split(/\s+/).map((x) => x.replace(/[^a-z0-9-]/g, "")).filter(Boolean);
    for (let i = w.length - 1; i >= 0; i--) { const parts = w[i].split("-"), head = sing(parts[parts.length - 1]); if (!HEADS.has(head)) continue;
      const prev = parts.length > 1 ? parts[parts.length - 2] : (i > 0 && !SOFT.has(w[i - 1]) ? w[i - 1].split("-").pop() : null);
      return hy([prev, head].filter(Boolean).join(" ")); }
  }
  const cw = earliest(fold(what), CANON); if (cw) return cw;
  const w = fold(tt.split(/—|:/).pop()).split(/\s+/).filter((x) => !SOFT.has(x));
  return hy(w.slice(-2).join(" ")) || "thing";
}
export function normKey(k) { // "<thing>@<place>" -> clean, capped at 3 words each, or "" when not a key
  const m = /^\s*([^@\s][^@]*)@([^@]+?)\s*$/.exec(String(k ?? "")); if (!m) return "";
  const part = (p) => hy(p).split("-").filter(Boolean).slice(0, 3).join("-");
  const th = part(m[1]), pl = part(m[2]); return th && pl ? `${th}@${pl}` : "";
}
export function deriveKey({ title, what, where, place } = {}) { return normKey(`${deriveThing(title, what)}@${place ?? derivePlace(where)}`); }
// JEV's own key with its thing folded to the canonical one (wolf-pelt-frame@yard -> hide-frame@yard), so a new name for an old thing still collides
export function canonKey(k) { const n = normKey(k); if (!n) return ""; const [th, pl] = n.split("@"), c = earliest(th.replace(/-/g, " "), CANON); return c ? `${c}@${pl}` : n; }

export function markOf(state) {
  const s = String(state ?? "").trim().toUpperCase();
  if (/^OPEN/.test(s)) return "open"; if (/^DONE/.test(s)) return "built"; if (/^DROP/.test(s)) return "dropped";
  if (/^SHELV/.test(s)) return "shelved"; if (/^BANN/.test(s)) return "banned"; return "approved";
}
const RANK = { banned: 0, built: 1, approved: 2, shelved: 3, dropped: 4, open: 5 }; // one id on two boards: the settled word wins
const SYM = Object.fromEntries(Object.entries(MARKS).map(([k, v]) => [v, k]));
const idNum = (id) => +(/\d+/.exec(id)?.[0] ?? 0);

// boardTexts: { path: text } (or an array of texts). Cards from every board; '## Banned' / '## Tasks' lines of IDEA-INDEX.md as rows too.
export function ledgerLines(boardTexts) {
  const texts = Array.isArray(boardTexts) ? boardTexts : Object.values(boardTexts ?? {}), byId = new Map(), extra = [];
  for (const text of texts) {
    const t = String(text ?? "");
    for (const b of t.split(/\n(?=## )/)) {
      const h = /^## ([A-Z][\w-]*) · (.*?) · (.+)$/m.exec(b);
      if (h && b.startsWith("## ")) {
        const id = h[1], title = h[2].replace(new RegExp("^" + id + "\\s+"), ""), mark = markOf(h[3]);
        const own = /^- key:\s*([^\s·]+)/m.exec(b)?.[1], where = /where:\s*([^\n]*)/.exec(b)?.[1] ?? "", what = /^- what:\s*(.*)$/m.exec(b)?.[1] ?? "";
        const d = deriveKey({ title, what, where }), key = canonKey(own) || d, old = byId.get(id); // alt: the derived key, matched too when the card's own key differs
        if (!old || RANK[mark] < RANK[old.mark]) byId.set(id, { id, key, mark, title, ...(d && d !== key ? { alt: d } : {}) });
        continue;
      }
      if (/^## (?:Banned|Tasks)\b/.test(b)) for (const m of b.matchAll(/^- (\S+) (\S+@\S+) (\S)(?: (\S+))?/gm)) extra.push({ id: m[1], key: normKey(m[2]), mark: SYM[m[3]] ?? "open", ...(m[4] ? { of: m[4] } : {}) });
    }
  }
  return [...byId.values(), ...extra].filter((r) => r.key);
}

const split = (k) => { const [th, pl] = String(k).split("@"); return { th, pl, words: new Set((th ?? "").split("-").map(sing).filter((w) => w.length >= 3)) }; };
const same = (a, b) => a.split("-").map(sing).join("-") === b.split("-").map(sing).join("-");
// -> { id, nearMiss }: id = the card whose thing@place is this key exactly (a banned line answers with the card it repeated), else null
// key may be one key or several (a pitch's own key + its derived key); a row matches on its key or its alt
export function keyMatch(key, rows) {
  const ks = [].concat(key ?? []).map((x) => split(normKey(x) || x)).filter((k) => k.th && k.pl); let id = null, banned = null; const near = [];
  if (!ks.length) return { id: null, nearMiss: [] };
  for (const r of rows ?? []) {
    const os = [r.key, r.alt].filter(Boolean).map(split);
    if (ks.some((k) => os.some((o) => same(o.th, k.th) && same(o.pl, k.pl)))) { if (r.mark === "banned") banned ??= r.of ?? r.id; else id ??= r.id; continue; }
    if (ks.some((k) => os.some((o) => same(o.th, k.th) || (same(o.pl, k.pl) && [...k.words].some((w) => o.words.has(w)))))) near.push(r.of ?? r.id);
  }
  return { id: id ?? banned, nearMiss: [...new Set(near)].slice(0, 5) };
}

const line = (r, max) => { const m = MARKS[r.mark] ?? "•"; let s = `${r.id} ${r.key} ${m}`; if (s.length > max) { const [th, pl] = r.key.split("@"); s = `${r.id} ${th.slice(0, Math.max(3, max - pl.length - r.id.length - 5))}@${pl} ${m}`; } return s.slice(0, max); };
const byPlace = (rows) => { const g = new Map(); for (const r of rows) { const p = r.key.split("@")[1]; if (!g.has(p)) g.set(p, []); g.get(p).push(r); } return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0])); };
const idSort = (a, b) => a.id[0].localeCompare(b.id[0]) || idNum(a.id) - idNum(b.id);

export function renderLedger(rows, { maxLineChars = 40 } = {}) {
  const cards = (rows ?? []).filter((r) => r.mark !== "banned" && !/^[BJ]\d/.test(r.id) || /^J\d/.test(r.id));
  const out = ["## Ledger", `<!-- one line per idea: <id> <thing>@<place> <mark> · ${Object.entries(MARKS).map(([k, v]) => `${v} ${k}`).join(" ")} · rebuilt by board-jev when a board changes -->`];
  for (const [p, list] of byPlace(cards)) { out.push(`### ${p}`); for (const r of list.sort(idSort)) out.push(line(r, maxLineChars)); }
  return out.join("\n") + "\n";
}
// the prompt's list: open first, then newest; capped; grouped by place so the model reads places whole
export function promptLines(rows, { maxPromptLines = 120, maxLineChars = 40 } = {}) {
  const pick = [...(rows ?? [])].sort((a, b) => (b.mark === "open") - (a.mark === "open") || idNum(b.id) - idNum(a.id)).slice(0, maxPromptLines);
  return byPlace(pick).flatMap(([, list]) => list.sort(idSort).map((r) => line(r, maxLineChars)));
}
// IDEA-INDEX.md whole: the Ledger section replaced in place, every other section (Banned, Tasks, DEDUPE-v2's) kept
export const INDEX_HEAD = "# IDEA INDEX · every idea as <thing>@<place> (JEV-LEDGER)\n<!-- ## Ledger is rebuilt from the boards; ## Banned and ## Tasks are appended by board-jev: '- <id> <key> <mark> <of>' -->\n";
export function writeIndex(cur, rows, opts) {
  const text = String(cur ?? "").trim() ? String(cur) : INDEX_HEAD, led = renderLedger(rows, opts);
  const parts = text.split(/\n(?=## )/), i = parts.findIndex((p) => p.startsWith("## Ledger"));
  if (i >= 0) parts[i] = led.replace(/\n$/, ""); else parts.splice(1, 0, led.replace(/\n$/, ""));
  return parts.join("\n").replace(/\s*$/, "\n");
}
// append '- <id> <key> <mark> [of]' under a section (## Banned or ## Tasks), made if missing
export function appendIndex(cur, section, lines) {
  if (!lines?.length) return cur; const text = String(cur ?? "").trim() ? String(cur) : INDEX_HEAD, parts = text.split(/\n(?=## )/);
  let i = parts.findIndex((p) => p.startsWith("## " + section)); if (i < 0) { parts.push(`## ${section}`); i = parts.length - 1; }
  parts[i] = parts[i].replace(/\s*$/, "") + "\n" + lines.join("\n");
  return parts.join("\n").replace(/\s*$/, "\n");
}
export function nextId(text, prefix) { let n = 0; for (const m of String(text ?? "").matchAll(new RegExp("^- " + prefix + "(\\d+) ", "gm"))) n = Math.max(n, +m[1]); return prefix + (n + 1); }
// ids sharing one exact key (build-queue overlap sight): [[key, [ids]]] with 2+ ids
export function keyGroups(ids, rows) {
  const want = new Set(ids), g = new Map();
  for (const r of rows ?? []) if (want.has(r.id)) { const k = r.key.split("@").map((p) => p.split("-").map(sing).join("-")).join("@"); if (!g.has(k)) g.set(k, new Set()); g.get(k).add(r.id); }
  return [...g.entries()].filter(([, s]) => s.size >= 2).map(([k, s]) => [k, [...s]]);
}

// ---- DEDUPE-v2 D1/D2 (docs/board/proposals/DEDUPE-v2.md): THING/PLACE rows and the plain-code check. Pure, like the ledger above.
// THING = canonical things (CANON + DEDUPE.thingWords) found in the title, plus "<modifier>-<head>" pairs of its head nouns (HEADS);
// PLACE = every spot/area of PLACES (+ DEDUPE.placeWords) named in the where line. A candidate duplicate shares a THING and a PLACE,
// or shares a canonical THING anywhere (a named thing repeated in another spot is still worth one JEV question), or fires the
// old title rule (same title, same first segment, >= 60 % shared 4+-letter title words). The title rule blocks; the rest are near misses.
export const titleNorm = (t) => fold(String(t ?? "").replace(/^\s*[DS]\d+\s*[·:.-]?\s*/i, "")).replace(/[^a-z0-9—:\s-]/g, " ").replace(/\s+/g, " ").trim();
const tName = (n) => n.split(/\s[—:-]\s|—|:/)[0].trim();
const tWords = (n) => new Set(n.split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
// the old dupeOf rule, unchanged: known [{ id, title }] -> the id whose title this repeats, or null
export function titleRepeat(title, known) {
  const n = titleNorm(title), nm = tName(n), w = tWords(n); if (!n) return null;
  for (const k of known ?? []) {
    const kn = titleNorm(k.title), km = tName(kn); if (!kn) continue;
    if (kn === n || (nm.length >= 4 && nm === km)) return k.id;
    const kw = tWords(kn); let both = 0; for (const x of w) if (kw.has(x)) both++;
    const u = w.size + kw.size - both; if (u && both / u >= 0.6) return k.id;
  }
  return null;
}
const allOf = (t, list) => list.map(([n, re]) => [n, t.search(new RegExp(re.source, re.flags.replace("g", "")))]).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]).map(([n]) => n); // earliest in the text first
const canonList = (o) => [...(o?.thingWords ?? []), ...CANON];
export function thingsOf(title, opts) { // -> ["tide-stone", "smoke-rack", ...]: canonical names first, then modifier-head pairs
  const tt = fold(String(title ?? "").replace(/^\s*[DS]\d+\s*[·:.-]?\s*/i, "")), out = new Set(allOf(tt, canonList(opts)));
  for (const seg of tt.split(/\s*(?:—|:| - |&|,| and | with )\s*/)) {
    const w = seg.split(/\s+/).map((x) => x.replace(/[^a-z0-9-]/g, "")).filter(Boolean);
    for (let i = 0; i < w.length; i++) { const parts = w[i].split("-"), head = sing(parts[parts.length - 1]); if (!HEADS.has(head)) continue;
      const prev = parts.length > 1 ? parts[parts.length - 2] : (i > 0 && !SOFT.has(w[i - 1]) ? w[i - 1].split("-").pop() : null);
      if (prev && prev.length >= 3) out.add(`${sing(prev)}-${head}`); }
  }
  return [...out];
}
export function placesOf(where, opts) { // -> ["jetty", "shore", ...]
  const t = fold(where).split(/\bvisible\b|\bseen from\b/)[0];
  return [...new Set(allOf(t, [...(opts?.placeWords ?? []), ...PLACES[1], ...PLACES[2]]))];
}
// board texts -> one row per D/S card: { id, mark, title, where, what, things, places } (the settled mark wins, as in ledgerLines)
export function ideaRows(boardTexts, opts) {
  const texts = Array.isArray(boardTexts) ? boardTexts : Object.values(boardTexts ?? {}), byId = new Map();
  for (const text of texts) for (const b of String(text ?? "").split(/\n(?=## )/)) {
    const h = /^## ([DS]\d+) · (.*?) · (.+)$/m.exec(b); if (!h || !b.startsWith("## ")) continue;
    const id = h[1], mark = markOf(h[3]), old = byId.get(id); if (old && RANK[mark] >= RANK[old.mark]) continue;
    const title = h[2].replace(new RegExp("^" + id + "\\s+"), ""), where = (/where:\s*([^\n]*)/.exec(b)?.[1] ?? "").slice(0, 300), what = (/^- what:\s*(.*)$/m.exec(b)?.[1] ?? "").slice(0, 200);
    byId.set(id, { id, mark, title, where, what, things: thingsOf(title, opts), places: placesOf(where, opts) });
  }
  return [...byId.values()];
}
// NOT-DUPE memory: '## Not duplicates' lines 'NOT-DUPE <id> <id>' in IDEA-INDEX.md (and appeal lines anywhere in a posted text)
const pairKey = (a, b) => [a, b].sort().join("|");
export function notDupes(text) { return new Set([...String(text ?? "").matchAll(/NOT-DUPE ([DSJ]\d+) ([DSJ]\d+)/g)].map((m) => pairKey(m[1], m[2]))); }
export function isNotDupe(set, a, b) { return !!set?.has(pairKey(a, b)); }
export function addNotDupes(cur, pairs) { // pairs [[a, b]] -> IDEA-INDEX.md text with the new lines under ## Not duplicates (each pair once)
  const have = notDupes(cur), add = []; for (const [a, b] of pairs ?? []) { const k = pairKey(a, b); if (a && b && a !== b && !have.has(k)) { have.add(k); add.push(`- NOT-DUPE ${k.replace("|", " ")}`); } }
  return add.length ? appendIndex(cur, "Not duplicates", add) : cur;
}
const shared = (a, b) => (a ?? []).filter((x) => (b ?? []).includes(x));
// one pair: { why: "title" | "thing+place" | "thing" | null, thing, place }
export function pairCheck(a, b, opts) {
  if (titleRepeat(a.title, [{ id: "x", title: b.title }])) return { why: "title", thing: shared(a.things, b.things)[0] ?? tName(titleNorm(a.title)).split(" ").slice(-2).join("-"), place: shared(a.places, b.places)[0] ?? null };
  const th = shared(a.things, b.things); if (!th.length) return { why: null };
  const pl = shared(a.places, b.places), canon = new Set(canonList(opts).map(([n]) => n)), strong = th.find((t) => canon.has(t));
  if (pl.length) return { why: "thing+place", thing: strong ?? th[0], place: pl[0] };
  // no shared place: only when the same canonical thing leads both titles (a tide-stone with a shelf is not an offering shelf)
  const lead = a.things[0]; return lead && lead === b.things[0] && canon.has(lead) ? { why: "thing", thing: lead, place: null } : { why: null };
}
// the gate's check: cand { id?, title, where, what? } against rows -> { of: id the title repeats (block) | null, near: [{ id, why, thing, place }] }
export function dupeCheck(cand, rows, opts = {}) {
  const c = { ...cand, things: cand.things ?? thingsOf(cand.title, opts), places: cand.places ?? placesOf(cand.where, opts) }, near = [];
  let of = null;
  for (const r of rows ?? []) {
    if (!r?.id || r.id === c.id || (c.id && isNotDupe(opts.notDupe, c.id, r.id))) continue;
    const r2 = r.things ? r : { ...r, things: thingsOf(r.title, opts), places: placesOf(r.where, opts) }, p = pairCheck(c, r2, opts);
    if (p.why === "title") { of ??= r.id; continue; }
    if (p.why) near.push({ id: r.id, why: p.why, thing: p.thing, place: p.place });
  }
  near.sort((x, y) => (y.why === "thing+place") - (x.why === "thing+place"));
  return { of, near: near.slice(0, opts.maxNear ?? 5) };
}
// the card lane: rows -> [{ ids: [...], key: "<thing>@<place>" }], every candidate pair joined (not-dupe pairs skipped), 2+ ids each
export function groups(rows, opts = {}) {
  const list = rows ?? [], up = new Map(list.map((r) => [r.id, r.id])), keyOf = new Map();
  const find = (x) => { while (up.get(x) !== x) { up.set(x, up.get(up.get(x))); x = up.get(x); } return x; };
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (isNotDupe(opts.notDupe, a.id, b.id)) continue;
    const p = pairCheck(a, b, opts); if (!p.why) continue;
    const ra = find(a.id), rb = find(b.id); if (ra !== rb) up.set(rb, ra);
    const k = `${p.thing}@${p.place ?? derivePlace(a.where)}`; keyOf.set(a.id, keyOf.get(a.id) ?? k); keyOf.set(b.id, keyOf.get(b.id) ?? k);
  }
  const g = new Map(); for (const r of list) { const root = find(r.id); if (!g.has(root)) g.set(root, []); g.get(root).push(r.id); }
  return [...g.values()].filter((ids) => ids.length >= 2).map((ids) => ({ ids: ids.sort((x, y) => x[0].localeCompare(y[0]) || idNum(x) - idNum(y)), key: normKey(keyOf.get(ids[0])) || keyOf.get(ids[0]) }));
}
// DEDUPE-v2 D6: '## Groups' in IDEA-INDEX.md from groups(): '- <key>: <id>, <id>' lines (build-queue parseGroups reads them). Pure.
export const GROUPS_NOTE = "<!-- DEDUPE-v2: approved ideas the code check joins (THING+PLACE); the MERGE/KEEP cards read this; a NOT-DUPE line splits a pair -->";
export function renderGroups(list) { return `## Groups\n${GROUPS_NOTE}\n${(list ?? []).filter((g) => g?.ids?.length >= 2).map((g) => `- ${g.key}: ${g.ids.join(", ")}`).join("\n")}\n`; }
export function writeGroups(cur, list) { // IDEA-INDEX.md text with '## Groups' replaced in place (or added), every other section kept
  const text = String(cur ?? "").trim() ? String(cur) : INDEX_HEAD, parts = text.split(/\n(?=## )/), i = parts.findIndex((p) => p.startsWith("## Groups")), sec = renderGroups(list);
  if (i >= 0) parts[i] = sec; else parts.push(sec);
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
}
