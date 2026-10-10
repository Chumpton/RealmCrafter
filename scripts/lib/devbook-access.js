// DEV TRACKER access (plan docs/board/DEV-TRACKER-PLAN-2026-10-06.md, lane 6). Who sees the tab, who may react.
// Editors always; visitors only when the den keeper turns world.state.devbook.visitorsSee / visitorsReact on (both off by default).
// The tab also honours each editor's own O → Chat row devbookTab (default on).
import { settingOf } from './settings-core.js';
export const KEEPER_KEYS = ['visitorsSee', 'visitorsReact'];
export const KEEPER_DEFAULTS = { visitorsSee: false, visitorsReact: false };
export function keeperOf(worldState) { const k = worldState?.devbook; return { visitorsSee: k?.visitorsSee === true, visitorsReact: k?.visitorsReact === true }; }
export function devbookAccess(worldState, player) {
  const ed = !!player?.isEditor, k = keeperOf(worldState);
  const see = ed || k.visitorsSee;
  const react = see && (ed || k.visitorsReact);
  const tab = see && settingOf(player?.state, 'devbookTab') !== false;
  return { see, react, tab };
}
// the keeper's flip: returns the new world.state.devbook object, or null when refused (not an editor / unknown key). Keeps every other key of the row.
export function flipKeeper(worldState, key, isEditor) {
  if (!isEditor || !KEEPER_KEYS.includes(key)) return null;
  const cur = worldState?.devbook && typeof worldState.devbook === 'object' ? worldState.devbook : {};
  return { ...cur, [key]: cur[key] !== true };
}
