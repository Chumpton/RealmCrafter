// creator 2026-10-09 editor brief: the "logic" tab of the editor shelf (ui/hud/terrain-editor.js).
// Tiles arm a volume or node (the next click on the ground places it); the list shows every logic piece nearby
// (scripts/ed-logic-core.js listTick → player.state.edl.list); a row opens its settings inline.
import { VOLS, NODES, CLIPS, HAZ, MOBS, EDL } from '../../scripts/lib/data/ed-logic.js';
const CSS = `<style>
#edl .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
#edl .tile{background:#0f0f12;border:1px solid #3f3f46;border-radius:6px;padding:5px 0 3px;text-align:center;color:#e4e4e7;cursor:pointer;font-size:9px;line-height:1.1}
#edl .tile b{display:block;font-size:17px;margin-bottom:2px;font-weight:400}
#edl .tile.on{border-color:#f5c84b;box-shadow:0 0 0 1px #f5c84b inset;color:#f5c84b}
#edl .arm{margin:6px 0;padding:6px 8px;border:1px dashed #f5c84b;border-radius:6px;color:#f5c84b;font-size:11px;display:flex;gap:6px;align-items:center}
#edl .arm button,#edl .btn{background:#0f0f12;border:1px solid #3f3f46;border-radius:5px;color:#e4e4e7;font-size:11px;padding:3px 7px;cursor:pointer}
#edl .btn.gold{border-color:#f5c84b88;color:#f5c84b}#edl .btn.red{border-color:#ef444488;color:#fca5a5}
#edl .row{display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid #27272a;border-radius:6px;margin-bottom:3px;background:#0f0f12;cursor:pointer;font-size:11px;color:#e4e4e7}
#edl .row.on{border-color:#f5c84b}#edl .row .dot{width:9px;height:9px;border-radius:2px;flex:none}
#edl .row .nm{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#edl .row .m{color:#71717a;font-size:10px}
#edl .ed{border:1px solid #f5c84b55;border-top:none;border-radius:0 0 6px 6px;margin:-4px 0 6px;padding:6px 8px;background:#141418}
#edl .f{display:flex;align-items:center;gap:6px;margin:4px 0;font-size:11px;color:#a1a1aa}
#edl .f span:first-child{width:18px;text-align:center;font-size:13px}#edl .f input[type=range]{flex:1;accent-color:#f5c84b}
#edl .f .v{width:34px;text-align:right;color:#e4e4e7;font-variant-numeric:tabular-nums}
#edl select,#edl input[type=text]{flex:1;background:#0f0f12;border:1px solid #3f3f46;border-radius:5px;color:#e4e4e7;font-size:11px;padding:3px 5px;min-width:0}
#edl .chips{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}
#edl .chip{display:flex;align-items:center;gap:3px;background:#0f0f12;border:1px solid #3f3f46;border-radius:12px;padding:1px 4px;font-size:12px;color:#e4e4e7}
#edl .chip button{background:none;border:none;color:#f5c84b;cursor:pointer;font-size:12px;padding:0 3px}
</style>`;
const q = (o) => `sendAction('edl',${JSON.stringify(o).replace(/"/g, '&quot;')})`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const setJs = (id, key, num) => `sendAction('edl',{op:'set',id:'${id}',key:'${key}',v:${num ? '+this.value' : 'this.value'}})`;
const slider = (id, key, icon, v, min, max, step, unit = '') => `<div class="f" title="${key}"><span>${icon}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" oninput="this.nextElementSibling.textContent=this.value+'${unit}'" onchange="${setJs(id, key, true)}"><span class="v">${v}${unit}</span></div>`;
function editor(it, sel, wp) {
  const s = it.s, id = it.id, k = s.k; let h = '';
  if (VOLS[k]) h += slider(id, 'w', '↔', s.w, 0.5, EDL.sizeMax, 0.5, 'm') + slider(id, 'h', '↕', s.h, 0.5, EDL.sizeMax, 0.5, 'm') + slider(id, 'd', '⤢', s.d, 0.5, EDL.sizeMax, 0.5, 'm');
  if (k === 'audio') h += `<div class="f"><span>🎵</span><select onchange="${setJs(id, 'clip')}">${CLIPS.map((c) => `<option value="${c}"${c === s.clip ? ' selected' : ''}>${c}</option>`).join('')}</select></div>` + slider(id, 'vol', '🔉', s.vol ?? 0.4, 0, 1, 0.05);
  if (k === 'event') h += `<div class="f"><span>💬</span><input type="text" maxlength="160" value="${esc(s.text)}" placeholder="banner text" onchange="${setJs(id, 'text')}"></div><div class="f"><span>📷</span>${s.cam ? `<span style="flex:1;color:#e4e4e7">framed</span><button class="btn" onclick="${q({ op: 'cam', id })}">re-frame here</button><button class="btn" onclick="${q({ op: 'camClear', id })}">✕</button>` : `<button class="btn" style="flex:1" onclick="${q({ op: 'cam', id })}">frame camera from where I stand</button>`}</div>`;
  if (k === 'hazard') h += slider(id, 'dps', '❤', s.dps ?? 2, 1, 20, 1, '/s') + `<div class="chips">${Object.entries(HAZ).map(([hz, H]) => `<button class="btn${s.hz === hz ? ' gold' : ''}" onclick="${q({ op: 'set', id, key: 'hz', v: hz })}">${H.icon} ${hz}</button>`).join('')}</div>`;
  if (k === 'safe') h += '<div class="tip">🛡 Players inside take no damage (zone = safe).</div>';
  if (k === 'pvp') h += '<div class="tip">⚔ Players inside are flagged zone = pvp.</div>';
  if (k === 'spawn' || k === 'respawn') h += k === 'spawn' ? `<div class="f"><span>★</span>${s.primary ? '<span style="flex:1;color:#f5c84b">primary spawn point</span>' : `<button class="btn gold" style="flex:1" onclick="${q({ op: 'primary', id })}">make primary spawn</button>`}</div>` : '<div class="tip">✚ The fallen return here when it is nearer than the home spawn.</div>';
  if (k === 'patrol') h += `<div class="f"><span>📍</span><span style="flex:1;color:#e4e4e7">${s.pts ?? 0} waypoints</span><button class="btn${wp === id ? ' gold' : ''}" onclick="${q({ op: 'wp', id })}">${wp === id ? '✓ done' : '➕ add'}</button><button class="btn" title="remove last" onclick="${q({ op: 'wpUndo', id })}">↶</button><button class="btn" title="clear" onclick="${q({ op: 'wpClear', id })}">⟲</button></div>
    <div class="f"><span>🧍</span><span style="flex:1;color:#e4e4e7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.npc ? esc(s.npc) : 'no NPC'}</span>${sel && sel !== id ? `<button class="btn gold" onclick="${q({ op: 'assign', id })}">🎯 assign selected</button>` : '<span class="m" style="font-size:10px">click an NPC, then 🎯</span>'}${s.npc ? `<button class="btn" onclick="${q({ op: 'unassign', id })}">✕</button>` : ''}</div>`;
  if (k === 'camp') h += slider(id, 'tether', '⭕', s.tether ?? 12, 3, EDL.tetherMax, 1, 'm') + slider(id, 'respawn', '⏱', s.respawn ?? 30, 5, EDL.respawnMax, 5, 's') + `<div class="chips">${Object.entries(MOBS).map(([m, M]) => `<span class="chip"><button onclick="${q({ op: 'comp', id, mob: m, dv: -1 })}">−</button>${M.icon}<b style="min-width:10px;text-align:center">${s.comp?.[m] ?? 0}</b><button onclick="${q({ op: 'comp', id, mob: m, dv: 1 })}">+</button></span>`).join('')}</div>`;
  return `<div class="ed">${h}<div class="f" style="justify-content:flex-end"><button class="btn" onclick="${q({ op: 'sel', id })}">◎ select</button><button class="btn red" onclick="${q({ op: 'del', id })}">🗑</button></div></div>`;
}
export function edLogicTab(player) {
  if (!player?.isEditor) return '';
  const E = player.state.edl ?? {}, list = E.list ?? [], sel = player.state.bld?.sel, arm = E.arm, wp = E.wp;
  const tile = ([k, D]) => `<div class="tile${arm === k ? ' on' : ''}" title="${D.label}" onclick="${q({ op: 'arm', k })}"><b style="color:${D.col}">${D.icon}</b>${D.label.split(' ')[0]}</div>`;
  const armRow = arm ? `<div class="arm">${(VOLS[arm] ?? NODES[arm]).icon} Click the ground to place ${(VOLS[arm] ?? NODES[arm]).label}<span style="flex:1"></span><button onclick="${q({ op: 'cancel' })}">✕</button></div>`
    : wp ? `<div class="arm">📍 Click the ground to add waypoints<span style="flex:1"></span><button onclick="${q({ op: 'cancel' })}">✓ done</button></div>` : '';
  const rows = list.map((it) => { const D = VOLS[it.s.k] ?? NODES[it.s.k]; if (!D) return '';
    const open = E.focus === it.id || sel === it.id;
    const meta = it.s.k === 'audio' ? `🎵 ${it.s.clip}` : it.s.k === 'event' ? esc(String(it.s.text ?? '').slice(0, 18)) : it.s.k === 'hazard' ? `${HAZ[it.s.hz]?.icon ?? ''} ${it.s.dps}/s` : it.s.k === 'camp' ? Object.entries(it.s.comp ?? {}).map(([m, n]) => `${MOBS[m]?.icon ?? ''}${n}`).join(' ') : it.s.k === 'patrol' ? `📍${it.s.pts ?? 0}${it.s.npc ? ' 🧍' : ''}` : it.s.primary ? '★' : '';
    return `<div class="row${open ? ' on' : ''}" onclick="${q({ op: 'sel', id: it.id })}"><span class="dot" style="background:${D.col}"></span><span>${D.icon}</span><span class="nm">${D.label}</span><span class="m">${meta}</span><span class="m">${it.dist}m</span></div>${open ? editor(it, sel, wp) : ''}`; }).join('');
  return `${CSS}<div id="edl"><div class="h">▣ Volumes</div><div class="grid">${Object.entries(VOLS).map(tile).join('')}</div>
  <div class="h">◆ Nodes</div><div class="grid" style="grid-template-columns:repeat(4,1fr)">${Object.entries(NODES).map(tile).join('')}</div>${armRow}
  <div class="h">☰ Nearby <span style="color:#71717a">${list.length}</span></div>${rows || '<div class="tip">Nothing placed nearby yet: pick a tile above, then click the ground.</div>'}</div>`;
}
