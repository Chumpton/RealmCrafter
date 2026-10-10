// The any-asset scatter brush's list (editors only, inside the shelf's foliage panel): each asset with its picture, weight slider, ✕;
// '▣ Brush from selection', '＋ card in hand'. Ops go sendAction('edx',…) → scripts/ed-scatter-core.js; painting stays the foliage tool.
const E = (o) => `sendAction('edx',${JSON.stringify(o).replace(/"/g, '&quot;')})`;
const esc = (s) => String(s ?? '').replace(/[<>"&]/g, '');
export function edBrush(player, t, PREFAB, IMG) {
  if (!player?.isEditor) return '';
  const fol = t.fol ?? {}, X = t.folX ?? {}, ids = Object.keys(fol).filter((id) => PREFAB[id] || X[id]);
  const carry = player.state.bld?.carry, sum = ids.reduce((s, id) => s + (+fol[id] || 0), 0) || 1;
  const row = (id) => { const p = PREFAB[id], lab = esc(p?.label ?? X[id]?.label ?? id), w = +fol[id] || 1, img = p ? IMG?.[id] : null;
    return `<div style="display:flex;align-items:center;gap:6px;margin:3px 0"><div style="width:30px;height:30px;flex:none;border-radius:4px;border:1px solid #3f3f46;background:#0f0f12 ${img ? `url('${img}') center/cover` : ''};display:flex;align-items:center;justify-content:center;font-size:14px;color:#71717a">${img ? '' : p ? '▦' : '▣'}</div>
      <div style="flex:1;min-width:0"><div style="font-size:10.5px;color:#e4e4e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lab} <span style="color:#a1a1aa">${Math.round(100 * w / sum)}%</span></div>
      <input type="range" min="1" max="5" step="1" value="${w}" style="width:100%;accent-color:#d9ad5e;height:12px" title="Weight ${w}" onchange="sendAction('edx',{op:'brushW',id:'${id}',v:+this.value})"></div>
      <button style="height:22px;width:22px;padding:0;flex:none" title="Remove from brush" onclick="${E({ op: 'brushDel', id })}">✕</button></div>`; };
  return `<div class="h">🖌 Brush assets <span style="color:#71717a">${ids.length}</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px"><button style="height:26px" title="Every selected piece joins the brush (its card, or its own look)" onclick="${E({ op: 'brushSel' })}">▣ From selection</button><button style="height:26px" ${carry ? '' : 'disabled'} title="Add the card in your hand (or press ＋ on any card in the drawer)" onclick="${E({ op: 'brushAdd' })}">＋ Card in hand</button></div>
    ${ids.map(row).join('') || '<div class="tip">Press ＋ on any card in the drawer, or select pieces and ▣.</div>'}
    ${ids.length ? `<button style="height:22px;width:100%;margin-top:3px;font-size:10px" onclick="${E({ op: 'brushClear' })}">⌫ Clear brush</button>` : ''}`;
}
