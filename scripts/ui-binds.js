// GOAL4-S1 · S1d (WATCHED 6/7 round 10 + creator GO 2026-10-02): the SOLE writer of player.state.ui.
// ui.js sends sendAction("uiSet", { field, index, value }); this body behavior validates it in the room,
// in the Contract's order, dropping on the first miss with uiEvent "uiError" { why } to this player alone.
// Synchronous by design: it reads the row fresh and writes the whole row once, in the same call.
import { isOldSpell } from './lib/data/spellbook.js';
import { spellById } from './lib/data/spells.js';
import { UI4, FIX4, WINDOWS, BAR_N, SLOTS, RATE, MAX_BYTES, norm, bytes, isWin, isBarValue, isSkill } from './lib/data/windows.js';

const FIELDS = ['bar', 'track', 'layout'];
const recent = new Map(); // player id -> ctx.now() stamps of accepted writes inside the last RATE.ms

function refuse(ctx, why) {
  ctx.emit('uiEvent', { name: 'uiError', payload: { why } }, { audience: { player: ctx.self.id } });
}

// GOAL4-S1-FIX F1d: the window keys as world actions (world.config.yaml), relayed to this player's page; writes nothing.
const RELAY = { winSkills: 'skills', winBags: 'bags', winMenu: 'gamemenu', winChar: 'character', winSpell: 'spellbook', winPrayer: 'prayer' };

export function onInput(ctx, input) {
  if (input?.pressed?.keybinds) { ctx.self.state.kbShow = !ctx.self.state.kbShow; return; } // creator 2026-10-05: U shows/hides the key list (sole writer of state.kbHide)
  if (input?.pressed?.closeAll && input.held?.runHold && !input.actionData?.closeAll) ctx.emit('uiEvent', { name: 'h4closeAll', payload: {} }, { audience: { player: ctx.self.id } }); // Shift+Down: the page shuts its own windows
  if (FIX4.relay && UI4.windows && input?.pressed) {
    for (const a in RELAY) if (input.pressed[a] && WINDOWS[RELAY[a]]) {
      ctx.emit('uiEvent', { name: 'h4win', payload: { id: RELAY[a] } }, { audience: { player: ctx.self.id } });
      ctx.log('ui-binds: h4win', { id: RELAY[a] });
      return;
    }
  }
  if (!UI4.keys) return;
  if (!input?.pressed?.uiSet) return;
  const p = input.actionData?.uiSet;
  // (1) a plain object
  if (!p || typeof p !== 'object' || Array.isArray(p) || Object.getPrototypeOf(p) !== Object.prototype) return refuse(ctx, 'shape');
  // (2) field exactly bar | track | layout
  const field = p.field;
  if (typeof field !== 'string' || !FIELDS.includes(field)) return refuse(ctx, 'field');
  const index = p.index, value = p.value;
  // (3) bar: an integer slot 0..BAR_N-1 holding "" | "attack" | a WINDOWS id
  if (field === 'bar') {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= BAR_N) return refuse(ctx, 'index');
    if (!isBarValue(value)) return refuse(ctx, 'value');
  }
  // (4) track: "" or a SKILL_LIST id (index ignored); layout: a WINDOWS id placed in a known slot
  if (field === 'track' && !(value === '' || isSkill(value))) return refuse(ctx, 'value');
  if (field === 'layout') {
    if (!isWin(index)) return refuse(ctx, 'index');
    if (typeof value !== 'string' || !SLOTS.includes(value)) return refuse(ctx, 'value');
  }
  // (5) rate: at most RATE.n accepted writes in any RATE.ms window, per player
  const id = ctx.self.id, now = ctx.now();
  const stamps = (recent.get(id) ?? []).filter((t) => Number.isFinite(t) && now - t < RATE.ms);
  if (stamps.length >= RATE.n) { recent.set(id, stamps); return refuse(ctx, 'rate'); }
  // (6) the new row, rebuilt with explicit keys from the cleaned old row (never the payload spread), <= MAX_BYTES
  const old = norm(ctx.self.state?.ui);
  const bar = old.bar.slice();
  if (field === 'bar') bar[index] = value;
  const layout = {};
  for (const w of Object.keys(WINDOWS)) if (Object.prototype.hasOwnProperty.call(old.layout, w)) layout[w] = old.layout[w];
  if (field === 'layout') layout[index] = value;
  const raw = { v: 1, bar, track: field === 'track' ? value : old.track, layout };
  if (bytes(JSON.stringify(raw)) > MAX_BYTES) return refuse(ctx, 'size'); // checked before norm: norm would quietly reset an oversized row
  const next = norm(raw);
  if (bytes(JSON.stringify(next)) > MAX_BYTES) return refuse(ctx, 'size');
  stamps.push(now);
  recent.set(id, stamps);
  ctx.self.state.ui = next; // the one write
  ctx.log('ui-binds: write', { field });
}

// BARS ON SPAWN (creator 2026-10-05): the old powers come off every bar once (they are builders' tools now), and the bar learns the OSRS book once:
// old spell ids map onto the OSRS ids (data/spells.js ID_ALIAS), ids the OSRS book does not have drop off, and Wind Strike + Home Teleport land in empty slots (key 2 first).
export function onSpawn(ctx) {
  const me = ctx.self; if (me.isLocal === false) return;
  const st = me.state; if (!st) return;
  if (!st.oldArchived) { st.oldArchived = true; st.powSeeded = true; st.pillarSeeded = true; st.fbSeeded = true; }
  if (st.barMagicV >= 1) return;
  const o = norm(st.ui), bar = o.bar.map((v) => {
    if (v === 'fireball') return '';
    if (typeof v !== 'string' || !v.startsWith('sp:')) return v;
    if (isOldSpell(v.slice(3))) return '';
    const sp = spellById(v.slice(3)); return sp && sp.den === 'yes' ? 'sp:' + sp.id : '';
  });
  for (const id of ['wind-strike', 'lumbridge-home-teleport']) { const v = 'sp:' + id; if (bar.includes(v)) continue; const i = bar[1] === '' ? 1 : bar.indexOf(''); if (i < 0) break; bar[i] = v; }
  st.ui = norm({ ...o, bar }); st.barMagicV = 1;
}
