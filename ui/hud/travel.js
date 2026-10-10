// RAVEN ROADS: the builders' dev travel panel (O → Den Systems; players use the OSRS teleports). Drawn from player.state.travelOpen; a row press sends travelGo { id }.
import { TRAVEL } from '../../scripts/lib/data/travel.js';
import { esc, escJs } from '../../scripts/lib/esc.js';
// SUMMON: an editor's panel lists everyone else in this place; a press sends travelSummon { id } (or { all: true }).
// GO TO: everyone sees the list and can travel to a player; an editor also gets "bring" (summon) and "send back".
function summonRows(ctx, player, touch) {
  const ed = !!player?.isEditor;
  const others = (ctx?.place?.players ?? []).filter((p) => p.id !== player.id);
  const btn = 'border:1px solid rgba(186,137,80,.45);border-radius:6px;background:linear-gradient(#3b2a1d,#2c2016);color:#f2e6cf;font-family:inherit;cursor:pointer';
  const sent = ed && (player.state?.summoned?.length ?? 0) > 0;
  const head = `<div style="display:flex;align-items:center;gap:4px;margin:8px 2px 6px;border-top:1px solid rgba(186,137,80,.35);padding-top:8px"><b style="flex:1;color:#e0b066;font-size:12px;letter-spacing:.16em">👥 TRAVELLERS</b>${ed && others.length > 1 ? `<button onclick="sendAction('travelSummon',{all:true})" style="${btn};font-size:11px;padding:2px 8px">bring all</button>` : ''}${sent ? `<button onclick="sendAction('travelSendBack')" style="${btn};font-size:11px;padding:2px 8px">send back</button>` : ''}</div>`;
  if (!others.length) return head + `<div style="font-size:11px;opacity:.55;color:#f2e6cf;text-align:center;margin:0 0 6px">nobody else is here</div>`;
  const small = `${btn};font-size:10px;padding:2px 7px;flex:none`;
  return head + others.map((p) => `<div style="display:flex;align-items:center;gap:6px;width:100%;box-sizing:border-box;padding:${touch ? 6 : 3}px 6px;margin:0 0 4px;border:1px solid rgba(186,137,80,.3);border-radius:6px;background:rgba(44,32,22,.7);color:#f2e6cf">${p.portraitUrl ? `<img src="${esc(p.portraitUrl)}" style="width:22px;height:22px;border-radius:50%;object-fit:cover">` : `<span style="width:22px;height:22px;border-radius:50%;background:#5dada9;display:inline-block"></span>`}<span style="flex:1;min-width:0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.displayName ?? 'traveller')}</span><button onclick="sendAction('travelGoto',{id:'${escJs(p.id)}'},{relockPointer:true})" style="${small}">go to</button>${ed ? `<button onclick="sendAction('travelSummon',{id:'${escJs(p.id)}'})" style="${small}">bring</button>` : ''}</div>`).join('');
}
function backRow(player) {
  if (!player?.state?.tpBack) return '';
  return `<button onclick="sendAction('travelBack',null,{relockPointer:true})" style="display:flex;align-items:center;gap:10px;width:100%;padding:6px 10px;margin:0 0 8px;border:1px solid #e0b066;border-radius:6px;background:linear-gradient(#4a3420,#33251a);color:#f2e6cf;font-family:inherit;text-align:left;cursor:pointer"><span style="flex:none;width:26px;height:26px;border-radius:50%;background:#e0b066;color:#2c2016;display:flex;align-items:center;justify-content:center;font-size:15px">↩</span><span style="flex:1"><b style="display:block;font-size:13px;letter-spacing:.06em">Back</b><span style="font-size:11px;opacity:.65">to where you stood before</span></span></button>`;
}
// MAP FLIGHT: while Wynx carries you to a zone picked on the M map (scripts/travel-flight.js), a quiet ribbon says where
function flightRibbon(player) {
  const f = player?.state?.mapFly; if (!f?.to) return '';
  return `<div id="map-fly" style="position:fixed;left:50%;top:14px;transform:translateX(-50%);padding:6px 18px 7px;border:2px solid #ba8950;border-radius:999px;background:rgba(36,26,18,.86);color:#f2e6cf;font:700 13px Georgia,serif;letter-spacing:.04em;box-shadow:0 4px 14px rgba(0,0,0,.4);pointer-events:none;z-index:40;white-space:nowrap">🦅 Gryphon flight to <b style="color:#e0b066">${esc(f.to)}</b> <span style="opacity:.6;font-size:11px">· E to leap off</span></div>`;
}
export function travelHud(player, touch, ctx) {
  const fly = flightRibbon(player);
  if (!player?.state?.travelOpen || !player?.isEditor) return fly;
  // creator 2026-10-09 "fix raven roads tp menu": the panel ran off the screen (centered, taller than the view) and runes drew as boxes; now a two-column grid under the ADMIN button that scrolls, with icons every font draws
  const rows = TRAVEL.spots.map((s) => `<button onclick="sendAction('travelGo',{id:'${s.id}'},{relockPointer:true})" title="${esc(s.line)}" style="display:flex;align-items:center;gap:7px;width:100%;min-width:0;padding:${touch ? 9 : 5}px 7px;border:1px solid rgba(186,137,80,.45);border-radius:6px;background:linear-gradient(#3b2a1d,#2c2016);color:#f2e6cf;font-family:inherit;text-align:left;cursor:pointer" onmouseover="this.style.borderColor='#e0b066'" onmouseout="this.style.borderColor='rgba(186,137,80,.45)'"><span style="flex:none;width:24px;height:24px;border-radius:50%;background:#5dada9;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 6px rgba(93,173,169,.6)">${s.icon ?? '•'}</span><span style="flex:1;min-width:0"><b style="display:block;font-size:12px;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.name)}</b><span style="display:block;font-size:10px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.line)}</span></span></button>`).join('');
  return fly + `<div id="travel-panel" data-modal style="position:fixed;left:16px;top:58px;width:400px;max-width:calc(100vw - 32px);max-height:calc(100vh - 250px);overflow-y:auto;box-sizing:border-box;padding:10px 10px 6px;border:2px solid #ba8950;border-radius:10px;background:rgba(36,26,18,.94);box-shadow:0 6px 24px rgba(0,0,0,.5),inset 0 0 0 1px rgba(242,230,207,.08);font-family:Georgia,serif;pointer-events:auto;z-index:40">
  <div style="display:flex;align-items:center;margin:0 2px 8px"><b style="flex:1;color:#e0b066;font-size:14px;letter-spacing:.18em">🐦‍⬛ RAVEN ROADS</b><button onclick="sendAction('travelPanel')" style="border:none;background:none;color:#f2e6cf;font-size:18px;cursor:pointer;line-height:1">×</button></div>
  ${backRow(player)}<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">${rows}</div>
  ${summonRows(ctx, player, touch)}
  <div style="font-size:10px;opacity:.5;color:#f2e6cf;text-align:center;margin-top:2px">builders only · ADMIN → Raven Roads</div></div>`;
}
