// The O menu as the OSRS Settings window: the model (rows read from the game's own state through scripts/lib/data/settings-registry.js), the window's HTML shell,
// and the one place that turns a change into the right action. Drawing is ui/hud/ossettings-canvas.js. Nothing here invents a setting: every row is in the registry.
import { SETTINGS, CATS, SONG_IDS, byId } from '../../scripts/lib/data/settings-registry.js';
import { settingOf } from '../../scripts/lib/settings-core.js';
import { VIEW } from '../../scripts/lib/data/view-settings.js';
import { osSettingsFeed } from './ossettings-canvas.js';
import { osFullscreen, osIsFullscreen } from './os-scale.js';
import { xpSetup } from '../../scripts/lib/xp-fx.js';
let deskOn = false, last = {}; // deskOn: the keeper asked for the old wide window (weather, build, admin, watchers) from the Den keeper category
export const osDesk = () => deskOn;
export function osDeskSet(v) { deskOn = !!v; }
// the value of one row from the live state: check -> boolean, slider/number -> number, dropdown -> index
function valueOf(r, ctx, player, rolf) {
  const s = player?.state ?? {}, P = ctx.place?.state ?? {}, [kind, k] = r.read ?? [];
  if (kind === 'set') return settingOf(s, k);
  if (kind === 'state') return k === 'fov' ? (typeof s.fov === 'number' ? s.fov : VIEW.fovDefault) : k === 'speed' ? (typeof s.speed === 'number' ? s.speed : 1) : k === 'emoteVol' ? (typeof s.emoteVol === 'number' ? s.emoteVol : 100) : k === 'chatFilter' ? s.chatFilter !== false : s[k];
  if (kind === 'gain') { const g = ctx.world?.audio?.gains?.[k]; return Math.round((typeof g === 'number' ? g : 1) * 100); }
  if (kind === 'rolf') return !!rolf;
  if (kind === 'page') return k === 'fullscreen' ? osIsFullscreen() : r.def; // this page alone: the window asks the browser live
  if (kind === 'world') { const [o, f] = String(k).split('.'); const v = ctx.world?.state?.[o]?.[f]; return r.type === 'check' ? v === true : typeof v === 'number' ? v : r.def; } // world.state rows (Dev Tracker keeper)
  if (kind === 'place') {
    if (k === 'song') { const i = SONG_IDS.indexOf(P.song ?? 'auto'); return i < 0 ? 0 : i; }
    if (k === 'oldSong.v') return typeof P.oldSong?.v === 'number' ? P.oldSong.v : 100;
    if (k === 'jevWander') return P.jevWander !== false;
    if (r.type === 'check') return !!P[k];
    return typeof P[k] === 'number' ? P[k] : 100;
  }
  return r.def;
}
// plain data for the HUD memo and the window (no functions)
export function osSettingsModel(ctx, player, rolf) {
  const ed = !!player?.isEditor, s = player?.state ?? {};
  const rows = SETTINGS.filter((r) => !r.hidden && (ed || (r.cat !== 'Den keeper' && !r.editorOnly))).map((r) => ({ id: r.id, cat: r.cat, section: r.section, label: r.label, type: r.type, info: r.info, opts: r.opts, min: r.min, max: r.max, step: r.step, two: r.two, value: r.type === 'button' ? 0 : valueOf(r, ctx, player, rolf), enabled: r.scope === 'player' || ed, page: !!r.page }));
  const cats = CATS.filter((c) => rows.some((r) => r.cat === c));
  return { rows, cats, scale: settingOf(s, 'uiScale') | 0, linear: settingOf(s, 'uiFilter') === 1 };
}
// one change -> the action that makes it (the table says which); toggles only fire when the wanted value differs from the live one
export function osSettingCall(id, v) {
  const r = byId(id); if (!r) return;
  if (r.page) { if (id === 'fullscreen') osFullscreen(!!v); return; } // acts on this page in the click itself (the browser wants the press)
  if (typeof sendAction !== 'function') return;
  if (r.act === 'setSetting') return sendAction('setSetting', { id, v });
  if (r.act === 'setGain') return sendAction('setGain', { k: r.key, v });
  if (r.act === 'setSong') return sendAction('setSong', { id: r.ids[v] ?? 'auto' });
  if (r.toggle) { if (!!v !== !!last[id]) sendAction(r.act); return; }
  return sendAction(r.act, { v });
}
export function osSettingPress(id) {
  const r = byId(id); if (r?.id === 'xpSetup') { try { xpSetup(); } catch (e) {} return; } // this page's own grid
  if (!r || r.type !== 'button') return; if (r.page === 'admin') { try { (globalThis.admToggle ?? window.admToggle)?.(); } catch (e) {} return; } if (typeof sendAction !== 'function') return;
  if (r.desk) { deskOn = true; try { sendAction('optTab', r.payload ?? { v: 'world' }); if (r.then) sendAction(r.then[0], r.then[1]); } catch (e) {} return; } // ui.js shows the old wide window while deskOn
  if (r.page === 'admin') { try { (globalThis.admToggle ?? window.admToggle)?.(); } catch (e) {} return; }
  if (r.act === 'maToggle') { sendAction('maToggle'); return; }
  sendAction(r.act, r.payload ?? {}, r.act === 'bugTag' ? { relockPointer: true } : undefined);
}
const CSS = '<style>#os-settings{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;pointer-events:auto;line-height:0}#os-settings canvas{display:block;cursor:default;max-width:96vw}#osw-in{position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;border:0;padding:0}@media (pointer:coarse),(hover:none){#os-settings{display:none}}</style>';
export function osSettingsWin(m, close) {
  try {
    last = Object.fromEntries(m.rows.map((r) => [r.id, r.value]));
    if (typeof document !== 'undefined') osSettingsFeed({ ...m, onSet: osSettingCall, onPress: osSettingPress, onClose: close });
    return CSS + '<div id="os-settings" data-modal><canvas id="osw" width="512" height="335"></canvas><input id="osw-in" type="text" autocomplete="off" spellcheck="false" aria-hidden="true" tabindex="-1"></div>';
  } catch (e) { return ''; }
}
