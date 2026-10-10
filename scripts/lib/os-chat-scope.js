// OSRS chat box → Spawn chat scope (plan: docs/board/OSCHAT-SPAWN-WIRE-PLAN-2026-10-07.md, lane 1 contract).
// Pure: resolveScope(tab, text, lastPm) → { scope: 'say'|'trade'|'guild'|'party'|'@name'|null, text, to }.
// Tab sets the default; OSRS prefixes override: '//' party (channel), '/' guild (clan), '@name ' private.
// A Spawn slash word (/w /r /me …) passes through untouched as say text. scope null = nowhere to send (Private tab, nobody to reply to).
export const SAY_MAX = 80;
// the box's 7 tabs by index, as ui/hud/oschat-canvas.js OS_CANVAS_TABS names them (osChatPick receives these ids)
export const TAB_IDS = ['all', 'game', 'pub', 'priv', 'chan', 'clan', 'trade'];
const TAB_SCOPE = { all: 'say', game: 'say', pub: 'say', trade: 'trade', clan: 'guild', chan: 'party', channel: 'party' };
// Spawn's own slash words: never read as our '/' clan prefix
export const SPAWN_SLASH = ['w', 'whisper', 'r', 'reply', 'me', 'msg', 'm', 'tell', 'dm', 'p', 'party', 'g', 'guild', 'say', 's', 'trade', 't', 'help', 'mute', 'unmute', 'block', 'unblock', 'report', 'emote', 'e', 'shrug', 'roll'];
const cut = (t) => String(t ?? '').trim().slice(0, SAY_MAX).trim();
const cleanName = (n) => String(n ?? '').trim().replace(/^@+/, '');
export function resolveScope(tab, text, lastPm) {
  const raw = String(text ?? '').trim();
  const t = typeof tab === 'number' ? TAB_IDS[tab] : String(tab ?? 'all');
  if (raw.startsWith('//')) return { scope: 'party', text: cut(raw.slice(2)), to: null };
  if (raw.startsWith('/')) {
    const word = (raw.slice(1).match(/^([A-Za-z]+)(?=\s|$)/) || [])[1];
    if (word && SPAWN_SLASH.includes(word.toLowerCase())) return { scope: 'say', text: cut(raw), to: null };
    return { scope: 'guild', text: cut(raw.slice(1)), to: null };
  }
  const pm = raw.match(/^@([^\s@]+)\s+([\s\S]*)$/);
  if (pm) return { scope: '@' + pm[1], text: cut(pm[2]), to: pm[1] };
  if (t === 'priv') { const n = cleanName(lastPm); return n ? { scope: '@' + n, text: cut(raw), to: n } : { scope: null, text: cut(raw), to: null }; }
  return { scope: TAB_SCOPE[t] || 'say', text: cut(raw), to: null };
}
