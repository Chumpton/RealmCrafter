// The editor shelf's Post tab (creator 2026-10-09): look profiles on top, then the sliders by group. Reads
// player.state.post (scripts/ed-post.js). A slider writes live on release of each step; Lock in saves it to the place.
import { KNOBS, PRESETS, readLook } from '../../scripts/lib/data/look-knobs.js';
const CSS = `<style>
#edp .pre{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin-bottom:8px}
#edp .pre button{background:#0f0f12;border:1px solid #3f3f46;border-radius:6px;color:#e4e4e7;font-size:11px;padding:6px 4px;cursor:pointer;white-space:normal;overflow-wrap:anywhere;line-height:1.2;min-width:0}
#edp .pre button.on{border-color:#f5c84b;color:#f5c84b}
#edp .h{margin:8px 0 3px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#f5c84b}
#edp .f{display:grid;grid-template-columns:minmax(130px,auto) 1fr 45px;align-items:center;gap:0;margin:3px 0;font-size:11px;color:#a1a1aa}
#edp .f label{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#edp .f input[type=range]{accent-color:#f5c84b;min-width:0;width:calc(100% - 16px);margin:0 8px;box-sizing:border-box}
#edp .f .v{width:45px;text-align:right;color:#e4e4e7;font-variant-numeric:tabular-nums}
#edp .f input[type=color]{width:38px;height:22px;border:1px solid #3f3f46;border-radius:4px;background:none;padding:0;cursor:pointer}
#edp .bar{display:flex;gap:5px;margin-top:10px}
#edp .bar button{flex:1;background:#0f0f12;border:1px solid #3f3f46;border-radius:6px;color:#e4e4e7;font-size:12px;padding:6px;cursor:pointer}
#edp .bar button.gold{border-color:#f5c84b;color:#f5c84b}#edp .bar button[disabled]{opacity:.4;cursor:default}
#edp .note{font-size:10px;color:#71717a;margin-top:6px;line-height:1.35}
</style>`;
const q = (o) => `sendAction('post',${JSON.stringify(o).replace(/"/g, '&quot;')})`;
const fmt = (x, s) => (s >= 1 ? Math.round(x) : s >= 0.1 ? (+x).toFixed(1) : s >= 0.01 ? (+x).toFixed(2) : (+x).toFixed(3));
function hex(r, g, b) { const m = Math.max(r, g, b, 0.001); return '#' + [r, g, b].map((x) => Math.round(Math.min(1, x / m) * 255).toString(16).padStart(2, '0')).join(''); }
export function shaderEditorHud(ctx, player) {
  if (!player?.isEditor || !player.state?.post?.win) return '';
  // creator 2026-10-09: docked to the right by default (full height, scrolls inside); the ⇱ pin floats it (winmove drags/sizes it then). Per browser.
  let dock = true; try { dock = localStorage.getItem('edp-dock') !== '0'; } catch {}
  const pin = `(function(b){var w=b.closest('#edp-win'),d=!w.hasAttribute('data-dock');try{localStorage.setItem('edp-dock',d?'1':'0')}catch(e){}if(d)w.setAttribute('data-dock','');else w.removeAttribute('data-dock');b.textContent=d?'⇱':'⇥';b.title=d?'Float it':'Dock right'})(this)`;
  return `<style>#edp-win[data-dock]{left:auto!important;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 12px)!important;top:70px!important;bottom:110px!important;width:340px!important;height:auto!important;max-height:none!important;transform:none!important;margin:0!important;overflow-y:auto!important}#edp-win[data-dock].shut{transform:translateX(calc(100% + 30px))!important}#edp-win .edp-tab{display:none}#edp-win[data-dock] .edp-tab{display:block;position:fixed;margin-left:-38px;margin-top:-10px;width:22px;height:64px;border:1px solid #f5c84b88;border-right:0;border-radius:8px 0 0 8px;background:#141418;color:#f5c84b;cursor:pointer;padding:0}#edp-win[data-dock]{transition:transform .2s}#edp-win .edp-pin{background:none;border:none;color:#a1a1aa;font-size:14px;cursor:pointer;margin-right:4px}</style><div id="edp-win"${dock ? ' data-dock' : ''} style="position:fixed;right:70px;top:170px;width:310px;max-height:calc(100vh - 240px);overflow-y:auto;background:#141418f2;border:1px solid #f5c84b55;border-radius:10px;padding:10px 12px;z-index:40;font-family:system-ui,sans-serif;box-shadow:0 8px 30px #0008;pointer-events:auto" onmousedown="event.stopPropagation()" onwheel="event.stopPropagation()"><button class="edp-tab" title="Collapse / expand" onclick="this.closest('#edp-win').classList.toggle('shut')">◂▸</button><div class="edp-tb" style="display:flex;align-items:center;margin-bottom:8px"><span style="color:#f5c84b;font-size:13px;letter-spacing:.06em;flex:1">◑ SHADER EDITOR</span><button class="edp-pin" title="${dock ? 'Float it' : 'Dock right'}" onclick="${pin}">${dock ? '⇱' : '⇥'}</button><button class="wn-ownx" style="background:none;border:none;color:#a1a1aa;font-size:15px;cursor:pointer" onclick="sendAction('post',{op:'win',open:false})">✕</button></div>${edPostTab(player, ctx)}</div>`;
}
export function edPostTab(player, ctx) {
  const st = player?.state?.post ?? {};
  const v = st.v ?? readLook(ctx?.place?.atmosphere);
  const tod = ctx?.place?.atmosphere?.timeOfDay ?? 12, held = typeof ctx?.place?.state?.wxForce?.hold === 'number';
  const hh = (x) => { const H = Math.floor(x), M = Math.round((x - H) * 60) % 60; return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`; };
  let h = `<div class="h" style="margin-top:0">Time of day ${held ? '· held' : '· real clock'}</div><div class="f"><label>Hour</label><input type="range" min="0" max="24" step="0.25" value="${tod}" oninput="this.nextElementSibling.textContent=(()=>{const x=+this.value,H=Math.floor(x),M=Math.round((x-H)*60)%60;return String(H).padStart(2,'0')+':'+String(M).padStart(2,'0')})()" onchange="sendAction('post',{op:'hour',v:+this.value})"><span class="v">${hh(tod)}</span></div><div class="bar" style="margin-top:2px"><button ${held ? '' : 'disabled'} onclick="${q({ op: 'clock' })}">▶ Let the day run</button></div>`;
  h += `<div class="h">Look profiles</div><div class="pre">${Object.entries(PRESETS).map(([id, p]) => `<button class="${st.preset === id ? 'on' : ''}" onclick="${q({ op: 'preset', id })}">${p.n}</button>`).join('')}</div>`;
  let g = null;
  for (const k of KNOBS) {
    if (k.g !== g) { g = k.g; h += `<div class="h">${g}</div>`; if (g === 'Ambient occlusion') h += ''; }
    const x = v[k.k] ?? k.def;
    h += `<div class="f" title="${k.n} (today's look: ${k.def}${k.u ?? ''})"><label>${k.n}</label><input type="range" min="${k.min}" max="${k.max}" step="${k.step}" value="${x}" oninput="clearTimeout(window.__edpT);const el=this;window.__edpT=setTimeout(()=>sendAction('post',{op:'set',k:'${k.k}',v:+el.value}),90);this.nextElementSibling.textContent=(+this.value).toFixed(${k.step >= 1 ? 0 : k.step >= 0.1 ? 1 : k.step >= 0.01 ? 2 : 3})" onchange="sendAction('post',{op:'set',k:'${k.k}',v:+this.value})"><span class="v">${fmt(x, k.step)}${k.u ?? ''}</span></div>`;
    if (k.k === 'glintK') h += `<div class="f" title="the colour unlit faces lean toward"><label>Shadow tint</label><input type="color" value="${hex(v.shR, v.shG, v.shB)}" onchange="sendAction('post',{op:'tint',v:this.value})"><span style="flex:1"></span></div>`;
  }
  h += `<div class="bar"><button class="gold" ${st.dirty ? '' : 'disabled'} onclick="${q({ op: 'save' })}">✔ Lock in</button><button ${st.dirty ? '' : 'disabled'} onclick="${q({ op: 'revert' })}">↺ Revert</button></div>`;
  h += `<div class="note">changes show live for everyone in the room. Lock in saves them to the world; Revert goes back to the last saved look. Den (this morning) is the look you have now.</div>`;
  return CSS + `<div id="edp">${h}</div>`;
}
