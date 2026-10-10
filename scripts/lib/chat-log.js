// The chat box's log (ui/hud/osrs.js osChat paints it): the last 60 public lines in place.state.chatLog.
// Only lines everyone may read are kept: say, trade, Savi and the den's own game lines. Party, guild and messages stay Spawn's.
import { wallMs, offsetH } from './real-clock.js';
const MAX = 60;
const wall = (ctx) => { try { const v = wallMs(ctx); return Number.isFinite(v) ? Math.round(v) : null; } catch { return null; } }; // null before the weather controller has anchored the clock
export const SAY_MAX = 80; // OSRS public chat takes 80 characters; Spawn's composer cannot be capped, so a longer line is cut when the box stores it
// OSRS: capitals typed in SHOUT show as a sentence. A run of ALL-CAPS words ("IF YOU TYPE IN ALL CAPS", or one word, "OSRS") becomes
// "If you type in all caps" / "Osrs": the first word of the run (or after . ! ?) gets a capital, the rest go lower-case. Words with any
// lower-case letter are left as typed. A lone I or A beside a shouted word belongs to the run (I stays I, A goes lower-case).
export function unShout(t) {
  const parts = String(t).split(/(\s+)/), idx = [];
  parts.forEach((p, i) => { if (i % 2 === 0 && p) idx.push(i); });
  const shout = (w) => /[A-Z].*[A-Z]/.test(w) && w === w.toUpperCase(), single = (w) => /^[A-Z][^A-Za-z]*$/.test(w);
  const kind = idx.map((i) => (shout(parts[i]) ? 2 : single(parts[i]) ? 1 : 0));
  for (let pass = 0; pass < 2; pass++) { // a lone capital joins a neighbouring shouted word (both directions, so "I AM" and "WHAT I DO" work)
    for (let k = 0; k < kind.length; k++) if (kind[k] === 1 && (kind[k - 1] === 2 || kind[k + 1] === 2)) kind[k] = 2;
    for (let k = kind.length - 1; k >= 0; k--) if (kind[k] === 1 && (kind[k - 1] === 2 || kind[k + 1] === 2)) kind[k] = 2;
  }
  let inRun = false, afterStop = false;
  idx.forEach((i, k) => {
    const w = parts[i];
    if (kind[k] === 2) {
      const low = w.toLowerCase().replace(/^([^a-z0-9]*)([a-z])/, (m, a, c) => a + c.toUpperCase()); // OSRS: every shouted word Title Cased
      parts[i] = low; inRun = true;
    } else { inRun = false; let sawLow = false; /* sawLow = a letter already seen */ parts[i] = w.replace(/[A-Za-z]/g, (c) => { const first = !sawLow; sawLow = true; return first ? c : c.toLowerCase(); }); } // OSRS (creator 2026-10-06): only a word's first letter may be a capital: MoP -> Mop, THen -> Then, YHen -> Yhen
    afterStop = /[.!?]["')\]]*$/.test(w);
  });
  // OSRS: a line's first letter is a capital, but only when the line starts with it: leading spaces (chat art, creator 2026-10-06) leave the letter as typed
  return parts.join('').replace(/^([^a-z0-9\s]*)([a-z])/i, (m, a, c) => a + c.toUpperCase());
}
// chat art (creator 2026-10-06): Spawn's composer trims leading spaces, so a line typed ".     w" loses its dot here and keeps the spaces
export function logLine(ctx, k, n, t, opts) { // opts.cont: a chat burst's later fragment (barrens-run), its lower-case first letter stays lower-case
  const say = k === 'pub' || k === 'trade' || k === 'bot', s = ctx.place.state, add = [];
  const prevAt = (() => { const L = Array.isArray(s.chatLog) ? s.chatLog : []; const a = L.length ? L[L.length - 1]?.at : null; return Number.isFinite(a) ? a : -Infinity; })();
  let stamp = Math.max(ctx.now(), prevAt); // OSRS order (creator 2026-10-07): a line is stamped when it lands, never earlier than the line before it
  const parts = say ? String(t ?? '').split(/\r?\n/) : [String(t ?? '')];
  for (const raw of parts) {
    let line = raw, art = false;
    if (say) {
      // chat art (creator 2026-10-06): Spawn's composer trims leading spaces, so leading dots stand in for them:
      // ".....w" = five spaces then w; ".     w" = the dot hides, the spaces stay. An art line sits flush under the line above (ui/hud/oschat-canvas.js)
      const dots = /^(\.{4,})(?=[^.\s])/.exec(line);
      if (dots) { line = ' '.repeat(dots[1].length) + line.slice(dots[1].length); art = true; }
      else if (/^\.\s/.test(line)) { line = line.slice(1); art = true; }
    }
    let text = say ? unShout(line.slice(0, SAY_MAX)) : line.slice(0, 200);
    if (opts?.cont && /^[^A-Za-z0-9\s]*[a-z]/.test(line)) text = text.replace(/^([^A-Za-z0-9\s]*)([A-Z])/, (m, a, c) => a + c.toLowerCase());
    if (art) text = text.replace(/^(\s*)([a-z])/, (m, a, c) => a + c.toUpperCase()); // OSRS capitalises the first letter even after spaces: the art's W is the capital (creator 2026-10-06)
    if (!text.trim()) continue;
    add.push({ k, n: String(n ?? '').slice(0, 32), t: text, at: (stamp = Math.max(stamp, prevAt) + (add.length ? 0.001 : 0)), ...(wall(ctx) != null ? { w: wall(ctx) } : {}), ...(art ? { art: true } : {}) });
  }
  if (!add.length) return;
  s.chatLog = [...(Array.isArray(s.chatLog) ? s.chatLog : []), ...add].slice(-MAX);
}
// a player handle has no .agent address (Tome throws on it): read it guarded, so a say is never lost
const isAgent = (by) => false; // never read by.agent: Tome logs a behavior error on the read even when caught; kind and name identify Savi
export function lineOf(ctx, line) {
  const sc = line?.scope ?? 'say', by = line?.by, name = by?.displayName ?? '';
  if (sc === 'trade') return ['trade', name];
  if (sc !== 'say') return null; // party, guild, messages: private, never kept
  const agent = /agent|savi|dm/i.test(String(line?.kind ?? '')) || isAgent(by) || /savi/i.test(name);
  return [agent ? 'savi' : 'pub', name];
}
// who is here lives in place.state.chatRoster { id: { n, at } }, so a world reload never re-announces anyone.
// A leave is said only after 15 s gone (a reload or a blip is not a leave); a return inside that window says nothing.
const GONE_MS = 15000;
export function watchArrivals(ctx) {
  const s = ctx.place.state, now = ctx.now(), first = !s.chatRoster;
  const roster = { ...(s.chatRoster || {}) }; let moved = false;
  for (const p of ctx.place.players) {
    const r = roster[p.id];
    if (!r) { if (!first) logLine(ctx, 'game', '', `${capWords(p.displayName ?? 'Someone')} has arrived in the den.`); roster[p.id] = { n: p.displayName ?? 'Someone', at: now }; moved = true; }
    else if (now - r.at > 5000) { roster[p.id] = { n: r.n, at: now }; moved = true; }
  }
  for (const [id, r] of Object.entries(roster)) if (now - r.at > GONE_MS && !ctx.place.players.some((p) => p.id === id)) { logLine(ctx, 'game', '', `${capWords(r.n)} has left the den.`); delete roster[id]; moved = true; }
  if (moved || first) s.chatRoster = roster;
}

// creator 2026-10-06: names show each word capitalised in the chat box (display only)
function capWords(n) { return String(n ?? '').replace(/(^|[\s_\-.])([a-z])/g, (m, a, c) => a + c.toUpperCase()); }

// O menu → Chat → Chat timestamps: the den's own clock (its time zone), as [hh:mm]
export function chatStamp(ms) { if (!Number.isFinite(ms)) return ''; const l = ms + offsetH(ms) * 36e5, m = Math.floor(((l % 864e5) + 864e5) % 864e5 / 6e4); return `[${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}] `; }
