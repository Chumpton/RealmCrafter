// The server half of the O-menu settings (creator 2026-10-06): the setSetting action. Only ids in the registry's setSetting rows are accepted, each coerced to its own
// type and range, written to player.state.settings. Everything else the window changes goes through its own existing action (setFov, setGain, setSong...).
import { byId, SET_IDS } from './data/settings-registry.js';
const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
// -> the validated value, or undefined when the id or the value is not acceptable
export function coerce(id, raw) {
  const r = byId(id); if (!r || r.act !== 'setSetting') return undefined;
  if (r.type === 'check') return typeof raw === 'boolean' ? raw : undefined;
  if (r.type === 'dropdown') { const i = Math.round(num(raw, NaN)); return i >= 0 && i < r.opts.length ? i : undefined; }
  if (r.type === 'slider' || r.type === 'number') { const v = num(raw, NaN); if (!Number.isFinite(v)) return undefined; const st = r.step ?? 1; return Math.max(r.min ?? 0, Math.min(r.max ?? 100, Math.round(v / st) * st)); }
  return undefined;
}
export function applySetting(state, id, raw) {
  const v = coerce(id, raw); if (v === undefined) return false;
  const cur = state.settings && typeof state.settings === 'object' ? state.settings : {};
  if (cur[id] === v) return true;
  state.settings = { ...cur, [id]: v };
  return true;
}
// the effective value of a player-saved row (unset = the registry default)
export function settingOf(state, id) { const r = byId(id); const v = state?.settings?.[id]; return v === undefined ? r?.def : v; }
export { SET_IDS };
