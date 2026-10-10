// GOAL4-S1 (WATCHED 6/7 round 10 + creator GO 2026-10-02): the window registry and the player.state.ui contract.
// Constants only: nothing here writes. Readers: ui.js router, ui/hud/*.js, scripts/ui-binds.js (the row's sole writer).
import { SKILL_LIST } from './skills.js';

export const BUILD = 's1-1'; // build stamp: every plate carries data-v="${BUILD}" (pre-mortem: stale DOM check)

// UI4: the off switches. A saved edit flips one (a commit, undoable). false = today's HUD unchanged.
export const UI4 = Object.freeze({ windows: true, frames: true, keys: true });
// GOAL4-S1-FIX (WATCHED 5/7 round 9): the key fixes' off switches. false = that slice's old path.
// esc: Escape closes the open window (F1a) · holdBar: digits stay notes while an instrument is held (F1b)
// relay: K/B/F10 also arrive as world actions via scripts/ui-binds.js (F1d) · instruments: holdingKind values that keep the digits (unset = lyre)
export const FIX4 = Object.freeze({ esc: true, holdBar: true, relay: true, instruments: Object.freeze(['lyre', 'guitar']) });

// one entry per window: { id, title, key, slot, modal, coming? }. key is e.key as the page sees it (lowercase letters).
export const WINDOWS = Object.freeze({
  skills:   Object.freeze({ id: 'skills',   title: 'Skills',    key: 'k',   slot: 'left',   modal: true, rune: 'ᛋ' }),
  bags:     Object.freeze({ id: 'bags',     title: 'Backpack',  key: 'b',   slot: 'right',  modal: true, rune: 'ᛒ' }),
  // WOW-HUD: the paper doll. C is the guitar's chordD and flight's descend (ctrl+c), so the Character window is P
  character: Object.freeze({ id: 'character', title: 'Character', key: 'p', slot: 'left', modal: true, rune: 'ᚲ' }),
  spellbook: Object.freeze({ id: 'spellbook', title: 'Spellbook', key: 'n', slot: 'right', modal: true, rune: 'ᛗ' }),
  prayer:   Object.freeze({ id: 'prayer',   title: 'Prayer',   key: 'i',   slot: 'left',  modal: true, rune: 'ᚹ' }), // OSRS-PLAN P1 (I is the only free letter)
  gamemenu: Object.freeze({ id: 'gamemenu', title: 'Game Menu', key: 'F10', slot: 'centre', modal: true, rune: 'ᛗ' }),
});
// part 2, drawn greyed in the micro menu, never openable, never valid on a bar or in layout
export const COMING = Object.freeze([
  { id: 'quests', title: 'Task log (part 2)', rune: 'ᛏ' },
  { id: 'map', title: 'Map (part 2)', rune: 'ᚺ' },
]);

// WOW-HUD: two rows of ten. 0..9 = the bottom row (keys 1..0); 10..19 = the top row (Shift+1..Shift+0; 10 and 11 also keep their old - and = keys)
export const BAR_N = 20;
export const BAR_KEYS = Object.freeze(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⇧1', '⇧2', '⇧3', '⇧4', '⇧5', '⇧6', '⇧7', '⇧8', '⇧9', '⇧0']);
export const SLOTS = Object.freeze(['left', 'centre', 'right']);
export const MAX_BYTES = 1000; // twenty "sp:<spell>" slots fit
export const RATE = Object.freeze({ n: 4, ms: 1000 });
export const SOUNDS = Object.freeze({
  open: { clip: '/cdn/moodboard-lowpoly-cozy/sfx-ui-oak-book-open.mp3', volume: 0.35 },
  close: { clip: '/cdn/moodboard-lowpoly-cozy/sfx-ui-oak-book-close.mp3', volume: 0.3 },
  tick: { clip: '/cdn/moodboard-lowpoly-cozy/sfx-ui-brass-tick.mp3', volume: 0.3 },
});

const has = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
export const isWin = (id) => has(WINDOWS, id);
export const isBarValue = (v) => typeof v === 'string' && v.length <= 32 && (v === '' || v === 'attack' || v === 'campfire' || v === 'fireball' || isWin(v) || /^sp:[a-z0-9-]{2,28}$/.test(v));
export const isSkill = (id) => typeof id === 'string' && SKILL_LIST.some((k) => k.id === id);

const fresh = () => ({ v: 1, bar: Array(BAR_N).fill(''), track: '', layout: {} });

// UTF-8 byte length without Buffer or TextEncoder assumptions
export function bytes(str) {
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) n += 1; else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) { n += 4; i++; } else n += 3;
  }
  return n;
}

// norm: the one cleaner, used at read AND at write. Always returns a NEW plain row with explicit keys.
export function norm(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row) || row.v !== 1) return fresh();
  let json; try { json = JSON.stringify(row); } catch (e) { return fresh(); }
  if (typeof json !== 'string' || bytes(json) > MAX_BYTES) return fresh();
  const src = Array.isArray(row.bar) ? row.bar : [];
  const bar = [];
  for (let i = 0; i < BAR_N; i++) bar.push(isBarValue(src[i]) ? src[i] : '');
  const track = isSkill(row.track) ? row.track : '';
  const layout = {};
  const L = row.layout && typeof row.layout === 'object' && !Array.isArray(row.layout) ? row.layout : {};
  for (const id of Object.keys(WINDOWS)) if (has(L, id) && SLOTS.includes(L[id])) layout[id] = L[id];
  return { v: 1, bar, track, layout };
}
export const slotOf = (ui, id) => (ui?.layout && SLOTS.includes(ui.layout[id]) ? ui.layout[id] : WINDOWS[id]?.slot ?? 'centre');
