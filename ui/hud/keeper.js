// CAMPTON'S KEEPER window (creator 2026-10-06): F7 / ADMIN → Keeper. Every original den keeper tool as an icon tile, plus ten more:
// gather everyone · per-player go/bring · hour dial · real clock · saved spots · den broadcast · fireworks show · moon gravity
// · photo mode · fps meter · den pulse. Drawn from player.state.keeper; memoized on the rows it reads, nothing when closed.
// THEME WHEEL beside the chat: page-local (localStorage 'den-theme'), every player's own: Classic, Dark, Big Text, Contrast, Night Ink, Clean.
import { KEEPER as K, KTABS, isKeeper } from '../../scripts/lib/data/keeper.js';
import { ITEMS as ADMIN_ITEMS } from './admin.js';
const e = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const DESK = [['general', '🧭', 'Player'], ['sound', 'ᛋ', 'Sound'], ['world', '☁', 'World'], ['build', '🏗', 'Build'], ['admin', '⚒', 'Admin'], ['watch', 'ᚹ', 'Watchers']];
const CSS = `<style>
#kp{position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 260px);top:70px;width:440px;max-height:calc(100vh - 140px);display:flex;flex-direction:column;z-index:64;pointer-events:auto;
 background:radial-gradient(120% 80% at 50% 0%,#33281c,#1d1711 75%);border:2px solid #9b7a45;border-radius:10px;box-shadow:inset 0 0 0 1px #120d08,inset 0 0 0 4px rgba(214,178,104,.16),0 12px 32px rgba(0,0,0,.65);color:#f3e6c8;font-family:Georgia,serif}
#kp .kh{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:2px solid #9b7a45;background:linear-gradient(#4a3424,#2e2117);border-radius:8px 8px 0 0}
#kp .kh b{flex:1;font-size:14px;letter-spacing:.22em;color:#ffcf6e;text-shadow:0 0 6px rgba(255,190,80,.5)}
#kp .kx{width:28px;height:24px;border-radius:4px;border:1px solid #6e5a35;background:#3a2c1e;color:#f3e6c8;cursor:pointer}#kp .kx:hover{background:#8e2a22}
#kp .kt{display:flex;gap:4px;padding:8px 10px 0}
#kp .kt button{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 0;border-radius:6px 6px 0 0;border:1px solid #6e5a35;border-bottom:0;background:#2a2119;color:#cdbb95;font:11px Georgia,serif;cursor:pointer}
#kp .kt button i{font-style:normal;font-size:17px}#kp .kt button.on{background:linear-gradient(#d9ad5e,#a87a36);color:#1d160c}
#kp .kb{flex:1;overflow-y:auto;padding:12px;border-top:1px solid #6e5a35;scrollbar-width:thin;scrollbar-color:#b8924f transparent}
#kp .kg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
#kp .tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;aspect-ratio:1;border-radius:8px;border:1px solid #7a6238;background:linear-gradient(#3b4248,#272d32);color:#efe6d2;font:11px Georgia,serif;cursor:pointer;text-align:center;padding:4px;line-height:1.1}
#kp .tile i{font-style:normal;font-size:24px;color:#ffcf6e}#kp .tile:hover{filter:brightness(1.2);border-color:#e9c271}#kp .tile.on{background:linear-gradient(#d9ad5e,#a87a36);color:#1d160c}#kp .tile.on i{color:#1d160c}
#kp .sec{font-size:11px;letter-spacing:.2em;color:#e9c271;margin:12px 0 7px;text-transform:uppercase}#kp .sec:first-child{margin-top:0}
#kp .row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.22);margin-bottom:5px}
#kp .row .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#kp .sb{padding:4px 10px;border-radius:5px;border:1px solid #7a6238;background:#3b4248;color:#f3e6c8;font:12px Georgia,serif;cursor:pointer}#kp .sb:hover{filter:brightness(1.25)}#kp .sb.go{background:linear-gradient(#d9ad5e,#a87a36);color:#1d160c}
#kp input[type=text]{flex:1;padding:6px 8px;border-radius:5px;border:1px solid #7a6238;background:#15110c;color:#f3e6c8;font:13px Georgia,serif}
#kp input[type=range]{width:100%;accent-color:#d9ad5e}
#kp .big{font-size:30px;color:#ffcf6e;text-align:center;margin:2px 0 6px}
#kp .stat{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}#kp .stat div{padding:10px 6px;border-radius:8px;background:rgba(0,0,0,.25);text-align:center;font-size:11px;opacity:.95}#kp .stat b{display:block;font-size:22px;color:#ffcf6e}
#kp.kp-in{position:static;width:auto;max-height:none;background:none;border:0;box-shadow:none;display:block;column-span:all}
#kp .hint{font-size:11px;opacity:.6;margin-top:6px}
</style>`;
let memo = { key: null, html: '' };
export const KEEPER_CSS = () => CSS;
export function keeperHud(ctx, player) {
  return ''; // creator 2026-10-06: his keeper IS the Den Keeper window now (ui.js adminWide hosts these tabs)
  if (!isKeeper(player)) return '';
  const s = player.state ?? {}, k = s.keeper;
  if (!k?.open) return '';
  const tab = k.tab ?? 'tools', bucket = tab === 'pulse' ? Math.floor((ctx.now?.() ?? 0) / K.pulseMs) : 0;
  const others = tab === 'room' || tab === 'pulse' ? (ctx.place?.players ?? []).filter((q) => q.id !== player.id) : [];
  const key = [tab, JSON.stringify(s.keeperMarks ?? []), others.map((q) => q.id + q.displayName).join(','), ctx.place?.state?.keeperMoon ? 1 : 0, s.optionsOpen ? 1 : 0, bucket, kpPhoto ? 1 : 0, kpFps ? 1 : 0].join('|');
  if (key === memo.key) return memo.html;
  const tabs = KTABS.map(([id, ic, lab]) => `<button class="${tab === id ? 'on' : ''}" onclick="sendAction('keeper',{op:'tab',v:'${id}'})"><i>${ic}</i>${lab}</button>`).join('');
  memo = { key, html: CSS + `<div id="kp" data-modal><div class="kh"><b>ᛟ CAMPTON'S KEEPER</b><button class="kx" title="Close (F7)" onclick="sendAction('keeper',{op:'close'},{relockPointer:true})">✕</button></div><div class="kt">${tabs}</div><div class="kb">${body(ctx, player, tab, others)}</div></div>` };
  return memo.html;
}
export function keeperBody(ctx, player, tab) { const others = (ctx.place?.players ?? []).filter((q) => q.id !== player.id); return `<div id="kp" class="kp-in">${body(ctx, player, tab, others)}</div>`; }
export const keeperKey = (ctx, player) => [JSON.stringify(player.state?.keeperMarks ?? []), (ctx.place?.players ?? []).map((q) => q.id).join(','), ctx.place?.state?.keeperMoon ? 1 : 0, Math.floor((ctx.now?.() ?? 0) / K.pulseMs), kpPhoto ? 1 : 0, kpFps ? 1 : 0].join('|');
function body(ctx, player, tab, others) {
  const s = player.state ?? {};
  if (tab === 'tools') {
    const desk = DESK.map(([id, ic, lab]) => `<button class="tile" onclick="kpDesk('${id}',${s.optionsOpen ? 1 : 0})"><i>${ic}</i>${lab}</button>`).join('');
    const tools = ADMIN_ITEMS.filter((r) => r[1] !== 'Keeper').map(([ic, lab, key, act]) => `<button class="tile" title="${e(lab)}${key ? ' · ' + key : ''}" onclick="${act}"><i>${ic}</i>${e(lab)}</button>`).join('');
    return `<div class="sec">The keeper's desk</div><div class="kg">${desk}</div><div class="sec">Den tools</div><div class="kg">${tools}</div>`;
  }
  if (tab === 'room') {
    const rows = others.map((q) => `<div class="row"><span class="nm">👤 ${e(q.displayName)}</span><button class="sb" onclick="sendAction('keeper',{op:'goto',id:'${e(q.id)}'})">Go to</button><button class="sb go" onclick="sendAction('keeper',{op:'gather',id:'${e(q.id)}'})">Bring</button></div>`).join('') || '<div class="hint">just you in the den right now</div>';
    return `<div class="kg" style="grid-template-columns:repeat(2,1fr)"><button class="tile" style="aspect-ratio:2.4" onclick="sendAction('keeper',{op:'gather'})"><i>🧲</i>Gather everyone</button><button class="tile" style="aspect-ratio:2.4" onclick="sendAction('keeper',{op:'home'})"><i>🏠</i>Back to the den door</button></div>
      <div class="sec">In the den · ${others.length + 1}</div>${rows}
      <div class="sec">Den broadcast</div><div class="row" style="background:none;padding:0"><input id="kp-say" type="text" maxlength="${K.sayMax}" placeholder="a horn call to everyone…" onkeydown="event.stopPropagation();if(event.key==='Enter'){sendAction('keeper',{op:'say',text:this.value});this.value=''}"><button class="sb go" onclick="const i=document.getElementById('kp-say');sendAction('keeper',{op:'say',text:i.value});i.value=''">📯</button></div>`;
  }
  if (tab === 'sky') {
    const hrs = [[6, '🌅', 'Dawn'], [12, '☀', 'Noon'], [18, '🌇', 'Dusk'], [22, '🌙', 'Night']].map(([h, ic, lab]) => `<button class="tile" onclick="sendAction('wxHour',{h:${h}})"><i>${ic}</i>${lab}</button>`).join('');
    return `<div class="sec">Hour dial · the whole room's sky</div><div class="big" id="kp-hr">12:00</div>
      <input type="range" min="0" max="23.75" step="0.25" value="12" oninput="document.getElementById('kp-hr').textContent=String(Math.floor(this.value)).padStart(2,'0')+':'+String(Math.round(this.value%1*60)).padStart(2,'0')" onchange="sendAction('wxHour',{h:+this.value})">
      <div class="kg" style="margin-top:10px">${hrs}</div>
      <div class="kg" style="grid-template-columns:repeat(2,1fr);margin-top:8px"><button class="tile" style="aspect-ratio:2.4" onclick="sendAction('wxHour',{real:true})"><i>🕰</i>Back to the real clock</button><button class="tile${ctx.place?.state?.keeperMoon ? ' on' : ''}" style="aspect-ratio:2.4" onclick="sendAction('keeper',{op:'moon'})"><i>🌕</i>Moon gravity ${ctx.place?.state?.keeperMoon ? 'ON' : 'off'}</button></div>`;
  }
  if (tab === 'marks') {
    const m = s.keeperMarks ?? [];
    const rows = m.map((r, i) => `<div class="row"><span class="nm">📍 ${e(r.n)} <span style="opacity:.5;font-size:11px">${Math.round(r.x)}, ${Math.round(r.z)}</span></span><button class="sb go" onclick="sendAction('keeper',{op:'markGo',i:${i}})">Go</button><button class="sb" onclick="sendAction('keeper',{op:'markDel',i:${i}})">✕</button></div>`).join('') || '<div class="hint">no spots yet. stand somewhere you love and mark it.</div>';
    return `<div class="sec">Mark where you stand</div><div class="row" style="background:none;padding:0"><input id="kp-mk" type="text" maxlength="18" placeholder="name this spot…" onkeydown="event.stopPropagation();if(event.key==='Enter'){sendAction('keeper',{op:'mark',n:this.value});this.value=''}"><button class="sb go" onclick="const i=document.getElementById('kp-mk');sendAction('keeper',{op:'mark',n:i.value});i.value=''">📍 Mark</button></div>
      <div class="sec">Saved spots · ${m.length}/${K.marks}</div>${rows}`;
  }
  if (tab === 'fun') {
    return `<div class="kg" style="grid-template-columns:repeat(2,1fr)">
      <button class="tile" style="aspect-ratio:2" onclick="sendAction('keeper',{op:'show'})"><i>🎆</i>Fireworks show</button>
      <button class="tile${kpPhoto ? ' on' : ''}" style="aspect-ratio:2" onclick="kpPhotoToggle()"><i>📷</i>Photo mode<br><span style="opacity:.6">F7 to come back</span></button>
      <button class="tile${kpFps ? ' on' : ''}" style="aspect-ratio:2" onclick="kpFpsToggle()"><i>⏱</i>FPS meter</button>
      <button class="tile" style="aspect-ratio:2" onclick="sendAction('emote',{id:'levitate'})"><i>🧘</i>Levitate</button></div>`;
  }
  // pulse
  const me = player.feetPosition ?? { x: 0, z: 0 }, hr = ctx.place?.atmosphere?.timeOfDay;
  // perf: bounded to the keeper's own surroundings (was a whole-place tag sweep every pulse)
  const wild = (() => { try { return ctx.query?.({ tags: ['wildlife'], center: { x: me.x, y: me.y ?? 0, z: me.z }, radius: 200, select: 'ids' })?.length ?? 0; } catch { return 0; } })();
  return `<div class="stat"><div><b>${others.length + 1}</b>in the den</div><div><b>${wild}</b>wild animals near</div><div><b>${typeof hr === 'number' ? String(Math.floor(hr)).padStart(2, '0') + ':' + String(Math.floor(hr % 1 * 60)).padStart(2, '0') : '—'}</b>sky hour</div>
    <div><b>${Math.round(me.x)}</b>x</div><div><b>${Math.round(me.z)}</b>z</div><div><b>${ctx.place?.state?.keeperMoon ? '🌕' : '🌍'}</b>gravity</div></div><div class="hint">refreshes every ${K.pulseMs / 1000}s while open</div>`;
}
// ---- page-local: photo mode + fps meter (no server round trip)
let kpPhoto = false, kpFps = false, fpsRaf = 0;
export function kpPhotoSet(v) {
  kpPhoto = v; memo.key = null;
  document.body.classList.toggle('kp-photo', v);
  let st = document.getElementById('kp-photo-css');
  if (!st) { st = document.createElement('style'); st.id = 'kp-photo-css'; st.textContent = 'body.kp-photo *{visibility:hidden!important}body.kp-photo #kp-photo-tag,body.kp-photo #kp-photo-tag *{visibility:visible!important}'; document.head.appendChild(st); }
  let tag = document.getElementById('kp-photo-tag');
  if (v && !tag) { tag = document.createElement('div'); tag.id = 'kp-photo-tag'; tag.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);padding:4px 12px;border-radius:999px;background:rgba(0,0,0,.35);color:#f3e6c8;font:12px Georgia,serif;z-index:99;pointer-events:none;opacity:.7'; tag.textContent = 'photo mode · F7 to come back'; document.body.appendChild(tag); }
  if (!v && tag) tag.remove();
}
export const kpPhotoOn = () => kpPhoto;
export function kpFpsSet(v) {
  kpFps = v; memo.key = null; cancelAnimationFrame(fpsRaf);
  let el = document.getElementById('kp-fps');
  if (!v) { el?.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'kp-fps'; el.style.cssText = 'position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset,50px) + 16px);top:12px;padding:3px 9px;border-radius:6px;background:rgba(20,14,9,.75);border:1px solid #9b7a45;color:#ffcf6e;font:bold 12px Georgia,serif;z-index:99;pointer-events:none'; document.body.appendChild(el); }
  let n = 0, t0 = performance.now(), worst = 0, last = t0;
  const step = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 >= 500) { el.textContent = `${Math.round(n * 1000 / (t - t0))} fps · worst ${Math.round(worst)}ms`; n = 0; t0 = t; worst = 0; } fpsRaf = requestAnimationFrame(step); };
  fpsRaf = requestAnimationFrame(step);
}
export const kpFpsOn = () => kpFps;

// ---- THEME WHEEL: a little rune button on the chat's top-right corner; a ring of six looks and a text-size slider
export const THEMES = [
  { id: 'classic', ic: 'ᚠ', name: 'Classic', css: '' },
  { id: 'dark', ic: '🌑', name: 'Dark', css: '#osch .pa,#osch canvas,#osp,#osmm,#den-settings,#adm-menu,#kp,.hud-panel{filter:invert(.88) hue-rotate(180deg) saturate(.9)}#osch img,#osp img{filter:invert(1) hue-rotate(180deg)}' },
  { id: 'big', ic: '🔠', name: 'Big Text', css: '#osch,#osp,#hud-bar,#den-settings,#kp,#adm-menu{zoom:calc(var(--thm-z,1) * 1.25)}' },
  { id: 'contrast', ic: '◐', name: 'Contrast', css: '#osch,#osp,#osmm,#hud-bar,#kp,#den-settings{filter:contrast(1.45) saturate(1.2)}#osch .pa{background:#f4ecd4!important}' },
  { id: 'ink', ic: '🪶', name: 'Night Ink', css: '#osch .pa,#osch canvas,#osp,#osmm,#kp,#den-settings{filter:invert(.85) hue-rotate(180deg) sepia(.55) saturate(1.3) brightness(.95)}' },
  { id: 'clean', ic: '✒', name: 'Clean', css: '#osch,#osch *,#osp *,#kp *,#den-settings *{font-family:Verdana,Tahoma,sans-serif!important;-webkit-font-smoothing:antialiased!important;letter-spacing:.01em}' },
];
let thm = (() => { try { return { id: 'classic', size: 100, ...JSON.parse(localStorage.getItem('den-theme') || '{}') }; } catch { return { id: 'classic', size: 100 }; } })(), wheelOpen = false;
function thmApply() {
  let st = document.getElementById('den-theme-css');
  if (!st) { st = document.createElement('style'); st.id = 'den-theme-css'; document.head.appendChild(st); }
  const t = THEMES.find((x) => x.id === thm.id) ?? THEMES[0], z = (thm.size ?? 100) / 100;
  st.textContent = `:root{--thm-z:${z}}` + (z !== 1 && thm.id !== 'big' ? `#osch,#osp,#hud-bar,#den-settings,#kp,#adm-menu{zoom:${z}}` : '') + t.css;
  try { localStorage.setItem('den-theme', JSON.stringify(thm)); } catch {}
}
export function thmPick(id) { thm = { ...thm, id }; thmApply(); thmPaint(); }
export function thmSize(v) { thm = { ...thm, size: Math.max(80, Math.min(160, +v || 100)) }; thmApply(); const n = document.getElementById('thm-sz'); if (n) n.textContent = thm.size + '%'; }
export function thmToggle() { wheelOpen = !wheelOpen; thmPaint(); }
function wheelHtml() {
  const R = 74, ring = THEMES.map((t, i) => { const a = (i / THEMES.length) * Math.PI * 2 - Math.PI / 2, x = Math.cos(a) * R, y = Math.sin(a) * R;
    return `<button class="thm-seg${thm.id === t.id ? ' on' : ''}" style="left:calc(50% + ${x.toFixed(1)}px);top:calc(50% + ${y.toFixed(1)}px)" title="${t.name}" onclick="thmPick('${t.id}')"><i>${t.ic}</i><span>${t.name}</span></button>`; }).join('');
  return `<div id="thm-wheel"><div class="thm-ring">${ring}<div class="thm-hub">${(THEMES.find((x) => x.id === thm.id) ?? THEMES[0]).name}</div></div>
    <div class="thm-sl"><span>Aa</span><input type="range" min="80" max="160" step="5" value="${thm.size}" oninput="thmSize(this.value)"><span style="font-size:17px">Aa</span><b id="thm-sz">${thm.size}%</b></div></div>`;
}
const THM_CSS = `#thm-btn{position:fixed;z-index:62;width:30px;height:30px;border-radius:50%;border:2px solid #1a1712;background:radial-gradient(circle at 35% 30%,#6a5232,#2e2216);box-shadow:inset 0 0 0 1px #c9a35e,0 2px 6px rgba(0,0,0,.5);color:#ffcf6e;font:16px Georgia,serif;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;transition:transform .2s}
#thm-btn:hover{transform:rotate(45deg) scale(1.1)}#thm-btn.on{transform:rotate(90deg)}
#thm-wheel{position:fixed;z-index:62;width:220px;padding:10px 10px 12px;border-radius:14px;background:radial-gradient(circle,#33281c,#1b150f);border:2px solid #9b7a45;box-shadow:0 10px 26px rgba(0,0,0,.6);pointer-events:auto;color:#f3e6c8;font-family:Georgia,serif}
#thm-wheel .thm-ring{position:relative;height:200px;border-radius:50%;background:radial-gradient(circle,transparent 46px,rgba(155,122,69,.18) 47px,rgba(155,122,69,.18) 100px,transparent 101px)}
#thm-wheel .thm-seg{position:absolute;transform:translate(-50%,-50%);width:54px;height:54px;border-radius:50%;border:1px solid #7a6238;background:linear-gradient(#3b4248,#272d32);color:#efe6d2;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;font:9px Georgia,serif;transition:transform .15s}
#thm-wheel .thm-seg i{font-style:normal;font-size:18px;color:#ffcf6e}#thm-wheel .thm-seg:hover{transform:translate(-50%,-50%) scale(1.12);border-color:#e9c271}
#thm-wheel .thm-seg.on{background:linear-gradient(#d9ad5e,#a87a36);color:#1d160c;box-shadow:0 0 12px rgba(233,194,113,.6)}#thm-wheel .thm-seg.on i{color:#1d160c}
#thm-wheel .thm-hub{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:80px;text-align:center;font-size:12px;letter-spacing:.1em;color:#e9c271}
#thm-wheel .thm-sl{display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px}#thm-wheel .thm-sl input{flex:1;accent-color:#d9ad5e}#thm-wheel .thm-sl b{width:38px;text-align:right;color:#ffcf6e;font-weight:normal}`;
function thmPaint() { // page-local, outside the engine's render: one host div re-pinned to the chat's corner
  let host = document.getElementById('thm-host');
  if (!host) { host = document.createElement('div'); host.id = 'thm-host'; document.body.appendChild(host); const st = document.createElement('style'); st.textContent = THM_CSS; document.head.appendChild(st); }
  host.innerHTML = `<button id="thm-btn" class="${wheelOpen ? 'on' : ''}" title="Themes · readability" onclick="thmToggle()">⚙</button>` + (wheelOpen ? wheelHtml() : '');
  thmPin();
}
function thmPin() {
  const b = document.getElementById('thm-btn'); if (!b) return;
  const ch = document.getElementById('osch'), r = ch?.getBoundingClientRect?.();
  const ok = r && r.width > 40 && getComputedStyle(ch).display !== 'none';
  const x = ok ? r.right + 6 : 534, y = ok ? r.top : innerHeight - 180;
  b.style.left = x + 'px'; b.style.top = y + 'px';
  const w = document.getElementById('thm-wheel'); if (w) { w.style.left = Math.min(innerWidth - 230, x + 36) + 'px'; w.style.top = Math.max(8, y - 120) + 'px'; }
}
let pinT = 0;
const onKey = (ev) => { if (ev.key === 'F7' && kpPhoto) kpPhotoSet(false); if (ev.key === 'Escape' && wheelOpen) thmToggle(); };
export function mountThemes() { thmApply(); thmPaint(); clearInterval(pinT); pinT = setInterval(thmPin, 800); addEventListener('keydown', onKey, true); }
export function unmountThemes() { clearInterval(pinT); removeEventListener('keydown', onKey, true); document.getElementById('thm-host')?.remove(); }
