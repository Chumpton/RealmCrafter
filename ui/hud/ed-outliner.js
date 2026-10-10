// creator 2026-10-09 editor brief: the Outliner tab of the editor shelf (ui/hud/terrain-editor.js). Draws player.state.ol, written by
// scripts/ed-outliner-core.js (Scene Outliner · Layers · Solo). Editors only.
const q = (o) => JSON.stringify(o).replace(/"/g, "'");
const A = (o) => `sendAction('ol',${q(o)})`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const G = [['props', '📦', 'Props'], ['buildings', '🏰', 'Buildings'], ['veg', '🌲', 'Vegetation'], ['lights', '💡', 'Lights'], ['beds', '🌾', 'Terrain beds'], ['vols', '▣', 'Triggers & Volumes'], ['spawns', '⚑', 'Spawns'], ['npcs', '🧍', 'NPCs'], ['other', '❔', 'Other']];
const CSS = `<style>
#ol .bar{display:flex;gap:4px;align-items:center;margin:6px 0}#ol .bar select{height:24px;flex:none;width:70px}#ol .bar input{flex:1;height:24px;padding:0 7px;font-size:11px}
#ol .bar button{height:24px;min-width:26px;padding:0 6px;flex:none}
#ol .gh{display:flex;align-items:center;gap:6px;width:100%;height:26px;padding:0 6px;margin-top:3px;text-align:left;background:#1f1f23;color:#e4e4e7}
#ol .gh i{font-style:normal;width:10px;color:#a1a1aa}#ol .gh b{flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis}#ol .gh em{font-style:normal;font-size:10px;color:#e9c271;background:#0f0f12;border:1px solid #3f3f46;border-radius:9px;padding:0 6px}
#ol .gh.z{opacity:.45}
#ol .rw{display:flex;align-items:center;gap:2px;margin:1px 0 1px 10px}
#ol .rw .n{flex:1;min-width:0;height:22px;padding:0 6px;font-size:11px;text-align:left;border-color:transparent;background:transparent;color:#d4d4d8}
#ol .rw .n.cur{border-color:#d9ad5e;background:rgba(217,173,94,.14);color:#ffe7b0}
#ol .rw .n.hid{opacity:.45;text-decoration:line-through}
#ol .rw .k{width:22px;height:22px;padding:0;font-size:11px;flex:none;border-color:transparent;background:transparent;opacity:.55;color:#d4d4d8}
#ol .rw .k:hover{opacity:1}#ol .rw .k.on{opacity:1;color:#e9c271}
#ol .pgr{display:flex;align-items:center;justify-content:center;gap:6px;margin:2px 0 4px 10px;font-size:10px;color:#a1a1aa}#ol .pgr button{height:18px;width:24px;padding:0;font-size:11px}
#ol .solo{width:100%;height:30px;margin:6px 0 2px;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px}
#ol .lr{display:flex;align-items:center;gap:2px;margin:2px 0;background:#1f1f23;border:1px solid #27272a;border-radius:4px;padding:2px}
#ol .lr .n{flex:1;min-width:0;height:22px;padding:0 6px;text-align:left;font-size:11px;border-color:transparent;background:transparent}
#ol .lr .k{width:22px;height:22px;padding:0;font-size:11px;flex:none}
#ol .lr .k.on{background:#d9ad5e;color:#18181b;border-color:#f3d48a}
#ol .note{font-size:10.5px;color:#e9c271;margin:4px 0;min-height:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
</style>`;
export function edOutlinerTab(player) {
  if (!player?.isEditor) return '';
  const ol = player.state?.ol ?? {}, cnt = ol.cnt ?? {}, rows = ol.rows ?? {}, sel = player.state?.bld?.sel ?? null, ms = new Set(player.state?.ms?.ids ?? []);
  const nsel = ms.size || (sel ? 1 : 0), r = ol.r ?? 150, total = Object.values(cnt).reduce((a, b) => a + b, 0);
  const scope = `<select title="Scope around you" onchange="sendAction('ol',{op:'r',v:+this.value})">${[[50, '◎ 50 m'], [150, '◎ 150 m'], [400, '◎ 400 m'], [0, '◉ All']].map(([v, t]) => `<option value="${v}"${v === r ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  const search = `<input id="ol-q" type="search" placeholder="🔍 name or id" value="${esc(ol.q ?? '')}" onchange="sendAction('ol',{op:'q',v:this.value})">`;
  const tree = G.map(([g, ic, nm]) => {
    const n = cnt[g] ?? 0, open = !!ol.open?.[g], pg = ol.pg?.[g] ?? 0, pages = Math.max(1, Math.ceil(n / 50));
    const head = `<button class="gh${n ? '' : ' z'}" onclick="${A({ op: 'open', g })}"><i>${open ? '▾' : '▸'}</i>${ic}<b>${nm}</b><em>${n}</em></button>`;
    if (!open) return head;
    const list = (rows[g] ?? []).map(([id, lb, hid, lk], i) => `<div class="rw"><button class="n${id === sel || ms.has(id) ? ' cur' : ''}${hid ? ' hid' : ''}" title="${esc(id)} · Shift-click adds" onclick="sendAction('ol',{op:'sel',g:'${g}',i:${i},add:!!(event.shiftKey||event.ctrlKey)})">${esc(lb)}</button>`
      + `<button class="k" title="Fly to" onclick="${A({ op: 'fly', g, i })}">⌖</button><button class="k${hid ? ' on' : ''}" title="${hid ? 'Show' : 'Hide'}" onclick="${A({ op: 'eye', g, i })}">${hid ? '◌' : '👁'}</button><button class="k${lk ? ' on' : ''}" title="${lk ? 'Unlock' : 'Lock: the mouse passes over it'}" onclick="${A({ op: 'lock', g, i })}">${lk ? '🔒' : '🔓'}</button></div>`).join('');
    const pager = pages > 1 ? `<div class="pgr"><button ${pg <= 0 ? 'disabled' : ''} onclick="${A({ op: 'pg', g, d: -1 })}">‹</button>${pg + 1} / ${pages}<button ${pg >= pages - 1 ? 'disabled' : ''} onclick="${A({ op: 'pg', g, d: 1 })}">›</button></div>` : '';
    return head + list + pager;
  }).join('');
  const lays = (ol.layers ?? []).map(([name, n, hid, lk], l) => `<div class="lr"><button class="n" style="color:#e4e4e7" title="Select all ${n}" onclick="${A({ op: 'lSel', l })}">▤ ${esc(name)} <span style="opacity:.5">${n}</span></button>`
    + `<button class="k" title="Add selection" ${nsel ? '' : 'disabled'} onclick="${A({ op: 'lAdd', l })}">＋</button><button class="k" title="Remove selection" ${nsel ? '' : 'disabled'} onclick="${A({ op: 'lRem', l })}">−</button>`
    + `<button class="k${hid ? ' on' : ''}" title="${hid ? 'Show layer' : 'Hide layer'}" onclick="${A({ op: 'lHide', l })}">${hid ? '◌' : '👁'}</button><button class="k${lk ? ' on' : ''}" title="${lk ? 'Unlock layer' : 'Lock layer'}" onclick="${A({ op: 'lLock', l })}">${lk ? '🔒' : '🔓'}</button>`
    + `<button class="k" title="Delete layer (pieces stay)" onclick="${A({ op: 'lDel', l })}">✕</button></div>`).join('');
  const newLay = `<div class="bar"><input id="ol-ln" type="text" maxlength="24" placeholder="new layer name"><button title="New layer from selection (${nsel})" ${nsel ? '' : 'disabled'} onclick="sendAction('ol',{op:'lNew',name:document.getElementById('ol-ln').value})">＋ ▤</button></div>`;
  const note = ol.note && Date.now() - (ol.noteAt ?? 0) < 600000 ? ol.note : (ol.busy ? 'indexing…' : `${total} objects · ${nsel} selected`);
  return `${CSS}<div id="ol"><button class="solo${ol.solo ? ' on' : ''}" title="Shift+H" onclick="${A({ op: 'solo' })}">${ol.solo ? '◉ Solo on · show all' : '◎ Solo selection'} <span style="opacity:.6;font-size:10px">⇧H</span></button>
<div class="bar">${scope}${search}<button title="Refresh" onclick="${A({ op: 'refresh' })}">⟳</button></div><div class="note">${esc(note)}</div>
${tree}<div class="h">Layers</div>${lays || '<div class="tip">Select pieces, name a layer, press ＋ ▤.</div>'}${newLay}</div>`;
}
