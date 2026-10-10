// DEV TEAM TRACKER · day reader. Pure: no ctx, no imports, runs in the engine and under node (tools/devlog-append.mjs, tests).
// parseDay(text, 'json'|'md', { day, author }) -> Entry[]; loadDay(readFn, day) -> Entry[] sorted by at.
// Entry = { id, at, day, author: 'zezima'|'camptons_world', text, pics: string[], reply: string|null }
// md (Campton's Savi): '- **#id** text' or '- **HH:MM** text' rows, '  - savi: reply' under each; ids 'cw-<day>-<n>'.
// An md frontmatter line 'utc_offset: -07:00' (or 'tz: UTC-7') says its HH:MM are local; they are read back to UTC.
export const AUTHORS = ['zezima', 'camptons_world'];
export const TEXT_MAX = 4000;
export const dayStart = (day) => { const t = Date.parse(String(day) + 'T00:00:00Z'); return isFinite(t) ? t : 0; };
export const dayOf = (ms) => new Date(+ms).toISOString().slice(0, 10);
const PIC_RES = [
  /magicCdnPath="([^"]+)"/g,
  /\[picture:\s*([^\]\s]+)\s*\]/gi,
  /!\[[^\]]*\]\(([^)\s]+)\)/g,
  /((?:https?:\/\/[^\s"')]+)?\/cdn\/[^\s"')\]]+\.(?:png|jpe?g|webp|gif))/gi,
];
// every picture address in a text, once each, in order
export function extractPics(text) {
  const out = [];
  for (const re of PIC_RES) for (const m of String(text ?? '').matchAll(re)) { const u = m[1]; if (u && !out.some((o) => o === u || o.endsWith(u) || u.endsWith(o))) out.push(u); }
  return out;
}
// the words a reader sees: attachment tags and [picture: …] markers out, whitespace kept, capped
export function cleanText(text) {
  let t = String(text ?? '').replace(/<<Attachment-\d+[^>]*>>?/g, ' ').replace(/\[picture:\s*[^\]]*\]/gi, ' ');
  t = t.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  return t.length > TEXT_MAX ? t.slice(0, TEXT_MAX - 1) + '…' : t;
}
// a zezima row's id from its time: zz-<day>-<HHMMSS>
export const entryId = (author, at) => (author === 'camptons_world' ? 'cw' : 'zz') + '-' + new Date(+at).toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
// a fuzzy key: lowercase letters and digits of the first 40 meaningful characters
export const fuzzyKey = (text) => cleanText(text).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40);
export function sameMessage(a, b) {
  const ka = fuzzyKey(a), kb = fuzzyKey(b);
  if (!ka || !kb) return false;
  const n = Math.min(ka.length, kb.length);
  return n < 20 ? ka === kb : ka.slice(0, n) === kb.slice(0, n);
}
function toAt(v, day, i) {
  if (typeof v === 'number' && isFinite(v)) return v;
  const t = typeof v === 'string' ? Date.parse(v) : NaN;
  return isFinite(t) ? t : dayStart(day) + i * 1000;
}
function jsonEntry(o, day, author, i) {
  if (!o || typeof o !== 'object') return null;
  const raw = String(o.text ?? '');
  const pics = [...new Set([...(Array.isArray(o.pics) ? o.pics.filter((p) => typeof p === 'string' && p) : []), ...extractPics(raw)])];
  const text = cleanText(raw) || (pics.length ? '(picture)' : '');
  if (!text) return null;
  const at = toAt(o.at, day, i), au = AUTHORS.includes(o.author) ? o.author : (AUTHORS.includes(author) ? author : 'zezima');
  return { id: String(o.id || entryId(au, at)), at, day: o.day || day || dayOf(at), author: au, text, pics, reply: o.reply ? String(o.reply).slice(0, TEXT_MAX) : null };
}
function mdOffsetMin(text) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(String(text).replace(/\r/g, ''));
  if (!fm) return 0;
  const m = /^(?:utc_offset|tz):\s*(?:UTC)?\s*([+-])(\d{1,2})(?::?(\d{2}))?\s*$/im.exec(fm[1]);
  return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0)) : 0;
}
function parseMd(text, day, author) {
  const out = [], base = dayStart(day), off = mdOffsetMin(text);
  let cur = null, n = 0, inFm = false, lineNo = 0;
  for (const line of String(text).replace(/\r/g, '').split('\n')) {
    lineNo++;
    if (lineNo === 1 && line.trim() === '---') { inFm = true; continue; }
    if (inFm) { if (line.trim() === '---') inFm = false; continue; }
    const top = /^[-*] \*\*([^*]+)\*\*:?\s*(.*)$/.exec(line);
    if (top) {
      const tag = top[1].trim(), hm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(tag);
      const at = hm ? base + ((+hm[1] * 60 + +hm[2] - off) * 60 + +(hm[3] || 0)) * 1000 : null;
      cur = { id: `cw-${day}-${n}`, at, day, author: author || 'camptons_world', text: top[2], pics: [], reply: null, tag };
      out.push(cur); n++; continue;
    }
    const sub = /^\s+[-*] savi:\s*(.*)$/i.exec(line);
    if (sub && cur) { cur.reply = (cur.reply ? cur.reply + ' ' : '') + sub[1].trim(); continue; }
    if (cur && /^\s{2,}\S/.test(line) && !/^\s+[-*] /.test(line)) cur.text += '\n' + line.trim();
  }
  // untimed '#id' rows: a second after the timed row before them, else seconds ahead of the first timed row, else the day's start
  for (let i = 0; i < out.length; i++) {
    if (out[i].at != null) continue;
    let p = i - 1; while (p >= 0 && out[p].at == null) p--;
    let q = i + 1; while (q < out.length && out[q].at == null) q++;
    out[i].at = p >= 0 ? out[p].at + (i - p) * 1000 : q < out.length ? out[q].at - (q - i) * 1000 : base + i * 1000;
  }
  return out.map(({ tag, ...e }) => {
    e.pics = extractPics(e.text);
    e.text = cleanText(e.text) || (e.pics.length ? '(picture)' : '');
    if (e.reply) e.reply = e.reply.slice(0, TEXT_MAX);
    return e;
  }).filter((e) => e.text);
}
export function parseDay(text, kind, { day, author } = {}) {
  if (!text) return [];
  if (kind === 'json') {
    let arr; try { arr = JSON.parse(text); } catch { return []; }
    if (!Array.isArray(arr)) arr = Array.isArray(arr?.entries) ? arr.entries : [];
    return arr.map((o, i) => jsonEntry(o, day, author, i)).filter(Boolean);
  }
  return parseMd(text, day, author || 'camptons_world');
}
export function loadDay(readFn, day) {
  const rd = (p) => { try { return readFn(p); } catch { return null; } };
  const z = parseDay(rd(`data/devlog/zezima-${day}.json`), 'json', { day, author: 'zezima' });
  const c = parseDay(rd(`data/devlog/campton-${day}.md`), 'md', { day, author: 'camptons_world' });
  const cj = parseDay(rd(`data/devlog/camptons_world-${day}.json`), 'json', { day, author: 'camptons_world' }); // rows appended by tools/devlog-append.mjs
  return [...z, ...c, ...cj].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}
