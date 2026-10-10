// creator 2026-10-09: "when in 3rd person u.i change this to use the 3rd person assetts". The O Settings window drawn as DOM in the
// gold-and-iron kit (ui/hud/kit-skin.js frames every [data-modal]: nine-slice, filigree, iron buttons, gold sliders). Same model as the
// OSRS canvas (ui/hud/ossettings.js osSettingsModel), same exits (osSettingCall / osSettingPress / close). OSRS style keeps the canvas.
// Tab and search are this page's own: they flip classes in place, so a HUD repaint keeps them (module vars) and nothing round-trips.
import { osSettingCall, osSettingPress } from './ossettings.js';
import { SECTIONS, FOOTER } from './admin.js';
let cat = null, q = '', closeFn = null;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const G = globalThis;
G.ksCat = (c) => { cat = c; try { const w = document.getElementById('kit-settings'); w.querySelectorAll('[data-cat]').forEach((e) => e.classList.toggle('on', e.dataset.cat === c)); apply(w); } catch (e) {} };
G.ksFind = (v) => { q = String(v ?? '').toLowerCase(); try { apply(document.getElementById('kit-settings')); } catch (e) {} };
G.ksSet = (id, v) => { try { osSettingCall(id, v); } catch (e) {} };
G.ksPress = (id) => { try { osSettingPress(id); } catch (e) {} };
G.ksClose = () => { try { closeFn?.(); } catch (e) {} };
function apply(w) {
  if (!w) return;
  w.querySelectorAll('.ks-row').forEach((r) => { r.style.display = (q ? r.dataset.l.includes(q) : r.dataset.c === cat) ? '' : 'none'; });
  w.querySelectorAll('.ks-sec').forEach((s) => { s.style.display = (q ? [...s.querySelectorAll('.ks-row')].some((r) => r.style.display !== 'none') : s.dataset.c === cat) ? '' : 'none'; });
}
function ctl(r) {
  const id = esc(r.id), v = r.value;
  if (r.type === 'check') return `<label class="ks-ck"><input type="checkbox" ${v ? 'checked' : ''} onchange="ksSet('${id}',this.checked)"><i></i></label>`;
  if (r.type === 'slider') return `<input type="range" min="${r.min}" max="${r.max}" step="${r.step || 1}" value="${v}" oninput="this.nextElementSibling.textContent=this.value" onchange="ksSet('${id}',+this.value)"><b class="ks-v">${v}</b>`;
  if (r.type === 'dropdown') return `<select onchange="ksSet('${id}',+this.value)">${(r.opts ?? []).map((o, i) => `<option value="${i}" ${i === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  if (r.type === 'number') return `<input type="number" value="${v}" onkeydown="event.stopPropagation()" onchange="ksSet('${id}',+this.value)">`;
  if (r.type === 'button') return `<button onclick="ksPress('${id}')">${esc((r.two ?? [r.label]).filter(Boolean).join(' '))}</button>`;
  return '';
}
const CSS = `<style>
#kit-settings{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:70;width:min(600px,94vw);height:min(900px,90vh);display:flex;flex-direction:column;pointer-events:auto;font:600 14px/1.25 'Cinzel',Georgia,serif;color:#f2e6cf}
#kit-settings .ks-top{display:flex;align-items:center;gap:10px;padding:2px 4px 10px}
#kit-settings .ks-top h3{flex:1;margin:0;text-align:center;font-size:19px;letter-spacing:2px;color:#f5e2b3}
#kit-settings .ks-x{width:28px;height:28px;padding:0;font-size:15px;line-height:1}
#kit-settings .ks-find{width:200px;padding:5px 9px;background:rgba(8,10,12,.85);border:1px solid #3a3224;border-radius:3px;color:#f2e6cf;font:600 13px Georgia,serif}
#kit-settings .ks-body{flex:1;display:flex;gap:12px;min-height:0}
#kit-settings .ks-cats{display:flex;flex-direction:column;gap:5px;width:132px;flex:none;overflow:auto}
#kit-settings .ks-cats button{text-align:left;padding:7px 10px;font-size:13px;color:#9a9eaa}
#kit-settings .ks-cats button.on{color:#f5e2b3;border-color:#f0d58e!important;box-shadow:inset 0 1px 0 #ffffff26,0 0 8px #d9ad5e66}
#kit-settings .ks-pane{flex:1;overflow:auto;padding:4px 10px 8px;background:rgba(12,14,18,.72);border:1px solid #3a3224;border-radius:3px;box-shadow:inset 0 2px 6px #000c}
#kit-settings .ks-sec h4{margin:12px 0 6px;font-size:13px;letter-spacing:1.5px;color:#d9ad5e;border-bottom:1px solid #8a6a3255;padding-bottom:4px}
#kit-settings .ks-row{display:grid;grid-template-columns:minmax(150px,1fr) auto;align-items:center;gap:12px;min-height:34px;padding:2px 4px;border-radius:3px}
#kit-settings .ks-row:hover{background:#ffffff0a}
#kit-settings .ks-row>span{color:#fff;text-shadow:1px 1px 2px #000}
#kit-settings .ks-row small{display:block;color:#9a9eaa;font:500 11px Georgia,serif;text-shadow:none}
#kit-settings .ks-c{display:flex;align-items:center;gap:8px;justify-content:flex-end}
#kit-settings .ks-c input[type=range]{width:170px}
#kit-settings .ks-v{width:42px;text-align:right;color:#f5e2b3}
#kit-settings select,#kit-settings input[type=number]{min-width:150px;padding:4px 6px;background:linear-gradient(#23272d,#15171b);color:#f2e6cf;border:1px solid #d9ad5e;border-radius:3px;font:600 13px Georgia,serif}
#kit-settings .ks-c button{padding:5px 12px;font-size:12px;min-width:150px}
#kit-settings .ks-ic{display:inline-block;width:22px;color:#d9ad5e;font-style:normal}
#kit-settings kbd{margin-left:6px;padding:0 5px;border:1px solid #8a6a32;border-radius:3px;font:600 10px Georgia,serif;color:#d9ad5e}
#kit-settings .ks-cats button[data-cat='World Editor']{margin-top:8px}
#kit-settings .ks-ck input{display:none}
#kit-settings .ks-ck i{display:block;width:20px;height:20px;border:1px solid #d9ad5e;border-radius:3px;background:linear-gradient(#08090b,#1d2025);box-shadow:inset 0 1px 3px #000;cursor:pointer}
#kit-settings .ks-ck input:checked+i{background:radial-gradient(circle,#fff1c2 0 20%,#e3b85f 45%,#8a5f22 75%) center/12px 12px no-repeat,linear-gradient(#08090b,#1d2025)}
</style>`;
const TOOL_TABS = { // creator 2026-10-09: "add admin and world editor" as tabs of this window (editors only)
  'World Editor': SECTIONS.filter(([t]) => t === 'Creation Suite'),
  'Admin': [...SECTIONS.filter(([t]) => t !== 'Creation Suite'), ['Windows', [FOOTER]]],
};
const tool = ([ic, lab, key, act]) => act ? `<div class="ks-row ks-tool" data-c="__C__" data-l="${esc(String(lab).toLowerCase())}"><span><i class="ks-ic">${ic}</i>${esc(lab)}${key ? ` <kbd>${esc(key)}</kbd>` : ''}</span><div class="ks-c"><button onclick="${esc(act)}">Open</button></div></div>` : '';
function toolSecs(name) { return TOOL_TABS[name].map(([t, rows]) => ({ c: name, t, html: rows.flatMap((r) => r[5] ?? [r]).map(tool).join('').replaceAll('__C__', esc(name)) })); }
export function kitSettingsWin(m0, close) {
  const ed = m0.cats.includes('Den keeper'), m = ed ? { ...m0, cats: [...m0.cats, 'World Editor', 'Admin'] } : m0;
  try {
    closeFn = close;
    if (!cat || !m.cats.includes(cat)) cat = m.cats[0];
    const secs = [];
    for (const c of m.cats) for (const r of m.rows.filter((x) => x.cat === c)) { let s = secs.find((x) => x.c === c && x.t === r.section); if (!s) secs.push(s = { c, t: r.section, rows: [] }); s.rows.push(r); }
    const extra = ed ? [...toolSecs('World Editor'), ...toolSecs('Admin')] : [];
    const pane = extra.map((x) => `<div class="ks-sec" data-c="${esc(x.c)}" style="${x.c === cat && !q ? '' : 'display:none'}"><h4>${esc(x.t)}</h4>${x.html}</div>`).join('') + secs.map((s) => `<div class="ks-sec" data-c="${esc(s.c)}" style="${s.c === cat || q ? '' : 'display:none'}"><h4>${esc(s.t)}</h4>${s.rows.map((r) => {
      const l = String(r.label ?? '').toLowerCase(), show = q ? l.includes(q) : r.cat === cat;
      return `<div class="ks-row" data-c="${esc(r.cat)}" data-l="${esc(l)}" style="${show ? '' : 'display:none'}"><span>${esc(r.label)}${r.info ? `<small>${esc(r.info)}</small>` : ''}</span><div class="ks-c">${ctl(r)}</div></div>`;
    }).join('')}</div>`).join('');
    return CSS + `<div id="kit-settings" data-modal><div class="ks-top"><input class="ks-find" placeholder="Search settings" value="${esc(q)}" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" oninput="ksFind(this.value)"><h3>Settings</h3><button class="ks-x" onclick="ksClose()" title="Close">✕</button></div>`
      + `<div class="ks-body"><div class="ks-cats">${m.cats.map((c) => `<button data-cat="${esc(c)}" class="${c === cat ? 'on' : ''}" onclick="ksCat('${esc(c)}')">${esc(c)}</button>`).join('')}</div><div class="ks-pane">${pane}</div></div></div>`;
  } catch (e) { return ''; }
}
