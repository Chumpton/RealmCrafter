// creator 2026-10-09 editor brief: the "ai" tab of the editor shelf (ui/hud/terrain-editor.js). Copilot pillar.
// Ops: sendAction('ai', {op}) -> scripts/ed-ai.js (lazy door) -> scripts/ed-ai-core.js.
import { PREFAB } from '../../scripts/lib/data/prefabs.js';
import { IMG } from '../../scripts/lib/data/prefab-img.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const J = (o) => esc(JSON.stringify(o));
const AI = (o) => `sendAction('ai',${J(o)})`;
const CSS = `<style>
#eai{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#e4e4e7}
#eai .h{color:#f5c84b;font-size:11px;letter-spacing:.08em;margin-top:4px}
#eai .chip{display:flex;align-items:center;gap:6px;padding:5px 7px;border:1px solid #3f3f46;border-radius:6px;background:#0f0f12}
#eai .chip b{color:#f5c84b}
#eai .pre{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
#eai .pre button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px;height:auto;border:1px solid #3f3f46;border-radius:6px;background:#18181b;color:#e4e4e7;font-size:10px;line-height:1.15;cursor:pointer}
#eai .pre button i{font-style:normal;font-size:20px}
#eai .pre button:hover{border-color:#f5c84b}
#eai .row{display:flex;gap:4px;align-items:center}
#eai input[type=text]{flex:1;height:26px;padding:0 7px;color:#e4e4e7;background:#0f0f12;border:1px solid #3f3f46;border-radius:4px;min-width:0}
#eai .go{height:26px;min-width:30px;padding:0 8px;border:1px solid #f5c84b;border-radius:4px;background:#2a2410;color:#f5c84b;cursor:pointer}
#eai .tg{height:22px;padding:0 6px;border:1px solid #3f3f46;border-radius:4px;background:#18181b;color:#a1a1aa;font-size:10px;cursor:pointer}
#eai .tg.on{border-color:#f5c84b;color:#f5c84b}
#eai .prop{border:1px solid #f5c84b55;border-radius:6px;background:#15130c;padding:6px;display:flex;flex-direction:column;gap:5px}
#eai .prop .bar{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
#eai .prop .bar button{height:26px;border-radius:4px;border:1px solid #3f3f46;background:#18181b;color:#e4e4e7;cursor:pointer;font-size:11px}
#eai .prop .bar .ok{border-color:#4ade80;color:#4ade80}
#eai .prop .bar .no{border-color:#f87171;color:#f87171}
#eai .themes{display:flex;flex-wrap:wrap;gap:3px}
#eai .themes span{display:inline-flex;align-items:center;border:1px solid #3f3f46;border-radius:10px;background:#18181b;font-size:10px;overflow:hidden}
#eai .themes span.on{border-color:#f5c84b}
#eai .themes button{background:none;border:0;color:#d4d4d8;padding:2px 6px;cursor:pointer;font-size:10px}
#eai .pal{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
#eai .pal button{display:flex;flex-direction:column;align-items:center;padding:3px;height:auto;border:1px solid #3f3f46;border-radius:5px;background:#0f0f12;color:#d4d4d8;cursor:pointer;font-size:9px;line-height:1.1}
#eai .pal button:hover,#eai .pal button.on{border-color:#f5c84b}
#eai .pal img{width:44px;height:44px;object-fit:cover;border-radius:3px;background:#27272a}
#eai .pal span{max-width:56px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#eai .toast{position:sticky;bottom:0;padding:6px 8px;border-radius:5px;background:#f5c84b;color:#18181b;font-weight:600;text-align:center;animation:eaifade 3.5s forwards}
#eai .spin{display:inline-block;animation:eaispin 1s linear infinite}
@keyframes eaifade{0%,75%{opacity:1}100%{opacity:0}}@keyframes eaispin{to{transform:rotate(360deg)}}
</style>`;
export function edAiTab(player) {
  if (!player?.isEditor) return '';
  const st = player.state ?? {}, ai = st.ai ?? {}, ms = st.ms?.ids ?? [], sel = ms.length ? ms : st.bld?.sel ? [st.bld.sel] : [];
  const prev = !!ai.prev;
  // selection chip
  const lab = {}; for (const id of sel.slice(0, 40)) { const m = /^pf-(.+)-[a-z0-9]+$/.exec(id), L = (m && PREFAB[m[1]]?.label) || (id.startsWith('edg-') ? 'ghost' : id.split('-')[0]); lab[L] = (lab[L] ?? 0) + 1; }
  const labs = Object.entries(lab).slice(0, 3).map(([k, v]) => esc(v > 1 ? `${k} ×${v}` : k)).join(', ');
  const chip = sel.length ? `<div class="chip">🎯 <b>${sel.length}</b> <span style="color:#a1a1aa;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${labs}${Object.keys(lab).length > 3 ? '…' : ''}</span></div>`
    : `<div class="chip" style="color:#a1a1aa">🎯 nothing selected · click a piece, or ask about the spot you stand on</div>`;
  const pre = `<div class="pre">
    <button title="Populate this courtyard with cozy rustic props (Savi answers with a ghost proposal)" onclick="${AI({ op: 'preset', id: 'populate' })}"><i>🏡</i>Cozy props</button>
    <button title="Add warm torch lighting along this path (Savi answers with a ghost proposal)" onclick="${AI({ op: 'preset', id: 'torch' })}"><i>🔥</i>Torch path</button>
    <button title="Scramble rotation & random heights: yaw 0-360°, scale ×0.85-1.25, applied here at once (one undo)" onclick="${AI({ op: 'preset', id: 'scramble', preview: prev })}" ${sel.length ? '' : 'disabled style="opacity:.4"'}><i>🎲</i>Scramble</button>
  </div><div class="row" style="justify-content:flex-end"><button class="tg${prev ? ' on' : ''}" title="Scramble shows ghosts first, then Accept / Reject" onclick="sendAction('ai',{op:'prevT'})">👻 preview ${prev ? 'on' : 'off'}</button></div>`;
  const ask = `<div class="row"><input type="text" id="eai-q" maxlength="400" placeholder="✦ ask Savi about this…" onkeydown="if(event.key==='Enter'){sendAction('ai',{op:'ask',text:this.value});this.value='';}"><button class="go" title="Send to Savi" onclick="var q=document.getElementById('eai-q');sendAction('ai',{op:'ask',text:q.value});q.value=''">➤</button></div>`;
  // proposals
  const pend = ai.pend ?? [];
  const props = pend.length ? `<div class="h">👻 PROPOSALS</div>` + pend.map((p) => `<div class="prop"><div class="row"><b style="flex:1;color:#f5c84b">${esc(p.label)}</b><span style="color:#a1a1aa">${p.n} · ${esc(p.by)}</span></div>
    <div class="bar"><button class="ok" title="Make it real (one undo)" onclick="${AI({ op: 'accept', id: p.id })}">✓ Accept</button><button title="Select the ghosts to move/rotate/scale them first" onclick="${AI({ op: 'tweak', id: p.id })}">✥ Tweak</button><button class="no" title="Throw the ghosts away" onclick="${AI({ op: 'reject', id: p.id })}">✕ Reject</button></div></div>`).join('') : '';
  // prompt-to-palette
  const P = st.aiPal ?? {}, th = P.themes ?? [], cur = th[P.cur ?? 0] ?? th[0];
  const busy = ai.busy ? `<div class="chip"><span class="spin">✦</span> picking cards for “${esc(ai.busy)}”…</div>` : '';
  const pal = `<div class="h">🎨 THEME → PALETTE</div><div class="row"><input type="text" id="eai-th" maxlength="80" placeholder="abandoned mossy shrine" onkeydown="if(event.key==='Enter')sendAction('ai',{op:'pal',theme:this.value})"><button class="go" title="Pick 12 cards for this theme" onclick="sendAction('ai',{op:'pal',theme:document.getElementById('eai-th').value})">✦</button></div>${busy}
    ${th.length ? `<div class="themes">${th.map((x, i) => `<span class="${x === cur ? 'on' : ''}"><button onclick="${AI({ op: 'palPick', i })}">${x.ai ? '✦' : '🔎'} ${esc(x.t)}</button><button title="forget" style="color:#71717a;padding:2px 4px" onclick="${AI({ op: 'palDel', i })}">×</button></span>`).join('')}</div>` : ''}
    ${cur ? `<div class="pal">${cur.ids.filter((id) => PREFAB[id]).map((id) => `<button class="${st.bld?.carry === id ? 'on' : ''}" title="${esc(PREFAB[id].label)} · click to carry, then click the ground" onclick="${esc(`sendAction('bld',${JSON.stringify({ op: 'carry', id })})`)}"><img src="${IMG[id] ?? ''}" alt=""><span>${esc(PREFAB[id].label)}</span></button>`).join('')}</div>` : ''}`;
  const t = ai.toast, toast = t?.m ? `<div class="toast" id="eai-t${t.at}">${esc(t.m)}</div>` : '';
  return `${CSS}<div id="eai"><div class="h">✦ ASK SAVI</div>${chip}${pre}${ask}${props}${pal}${toast}</div>`;
}
