// creator 2026-10-09: "allow me to drag and move it, add a drag bar at top, corner expand bar for every window in the game".
// Page-local, every player's own: a scanner finds the game's windows, gives each a grab bar along its top and a grip in its
// bottom-right corner, and keeps where each was left in localStorage ('den-win-boxes'). Placement rides one <style> in the
// head with !important rules per id, so the HUD's own repaints never snap a window back. Double-click a bar to reset it.
// The keeper's desk (#den-settings) keeps its own bar and grip (ui.js admGrab).
const IDS = ['edp-win', 'os-settings', 'osp', 'osch', 'osmm', 'chess-panel', 'huginn-map', 'devbook-book', 'kp', 'keybinds',
  'hud-player', 'jev-desk', 'den-systems', 'light-editor', 'travel-panel', 'vote-ledger', 'wardrobe', 'ma-bar', 'cbk', 'adm-menu'];
const SKIP = new Set(['den-settings', 'te', 'wmap', 'reticle']);
export const WIN_IDS = IDS;
// creator 2026-10-09 "modal dialogs auto-center": a data-modal window opens centred unless it was dragged (a saved box) or it is a
// tool/menu/bar that owns its own place (below). Pure CSS, so a window never flashes at its old place first.
const NOCENTER = ['te', 'ma-bar', 'adm-menu', 'ph-adm', 'db-lb', 'den-settings', 'light-editor', 'kp', 'wmap', 'devbook-book', 'reticle'];
// the kit close (3rd Person): each window's own close path; a window not listed falls back to its own ✕ button
const CLOSE = {
  'edp-win': () => sendAction('post', { op: 'win', open: false }),
  'os-settings': () => sendAction('options', {}, { relockPointer: true }),
  kp: () => sendAction('keeper', { op: 'close' }, { relockPointer: true }),
  'light-editor': () => sendAction('le', { op: 'close' }),
  'den-systems': () => sendAction('sysWin'),
  osp: () => { try { ospClose(); } catch {} },
};
const ownX = (el) => { for (const b of el.querySelectorAll('button')) { if (b.closest('.wn-x') || b.classList.contains('wn-x')) continue; const t = (b.textContent || '').trim(); if (/^[✕×✖xX]$/.test(t) || /^close/i.test(b.title || '') || /close/i.test(b.getAttribute('aria-label') || '')) return b; } return null; };
const KEY = 'den-win-boxes';
let boxes = {}; try { boxes = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { boxes = {}; }
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(boxes)); } catch {} };
let sheet = null, auto = {};
const RAIL = () => { try { return (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--spawn-chrome-reservation-right-inset')) || 50) + 12; } catch { return 62; } };
const LABEL = { 'edp-win': 'Shader Editor', 'os-settings': 'Settings', osp: 'Side Panel', osch: 'Chat', osmm: 'Map', kp: "Keeper's Desk", keybinds: 'Keys', 'hud-player': 'Player', 'light-editor': 'Light Editor', 'travel-panel': 'Travel', wardrobe: 'Wardrobe', 'den-systems': 'Systems', 'vote-ledger': 'Votes', 'jev-desk': 'JEV', 'chess-panel': 'Chess', 'huginn-map': 'Huginn', 'devbook-book': 'Dev Book', cbk: 'Combat', 'adm-menu': 'Admin' };
// creator 2026-10-09 "fix too wide/off-screen": each window is kept inside the screen (minus Spawn's rail); #osp keeps 118px clear for #hud-micro;
// the docked Shader Editor stands between the minimap and the side panel. Runtime-only boxes (auto), never saved.
function fit() {
  const vw = innerWidth - RAIL(), vh = innerHeight, nxt = {};
  const R = (id) => { const e = document.getElementById(id); return e && e.offsetWidth ? e.getBoundingClientRect() : null; };
  for (const id of IDS) {
    if (boxes[id] || id === 'edp-win') continue; const el = document.getElementById(id); if (!el || !el.offsetWidth) continue;
    const r0 = el.getBoundingClientRect(), r = { top: r0.top, right: r0.right, left: r0.left, width: r0.width, height: Math.max(r0.height, el.scrollHeight || 0) }, a = auto[id], top0 = a ? (a.top0 ?? r.top) : r.top, floor = id === 'osp' ? vh - 118 : vh - 4;
    let y = top0, h = 0, x = null;
    if (y + r.height > floor) y = Math.max(18, floor - r.height);
    if (y + r.height > floor) h = floor - y;
    if (r.right > vw + 1 && r.left > 0) x = Math.max(0, vw - r.width);
    if (y !== top0 || h || x != null || a) nxt[id] = { y: Math.round(y), h: Math.round(h), x: x == null ? null : Math.round(x), top0 };
    if (!a && !nxt[id]) continue;
  }
  // creator spec 2026-10-09: Settings top = minimap bottom + 12; #osp anchored right, above the hotbar/micro menu
  const qt0 = R('quest-tracker'), mmA = R('osmm'), mm0 = mmA ? { bottom: Math.max(mmA.bottom, qt0 && qt0.left < mmA.right && qt0.right > mmA.left - 40 ? qt0.bottom : 0) } : null, dock0 = R('nh-dock'), mic0 = R('hud-micro'), hot = Math.min(dock0 ? dock0.top : vh, mic0 ? mic0.top : vh);
  const os = document.getElementById('os-settings');
  if (os && os.offsetWidth && !boxes['os-settings']) { const t = (mm0 ? mm0.bottom : 228) + 12; nxt['os-settings'] = { y: Math.round(t), h: Math.round(Math.max(120, hot - 12 - t)), x: null, tf: 'translateX(-50%)' }; }
  const sp0 = document.getElementById('osp');
  if (sp0 && sp0.offsetWidth && !boxes.osp && document.querySelector('#h4-root.kit')) { const r0 = sp0.getBoundingClientRect(), r = { top: r0.top, width: r0.width, height: Math.max(r0.height, sp0.scrollHeight || 0) }, bot = hot - 16, y = Math.max((mm0 ? mm0.bottom : 0) + 12, bot - r.height); nxt.osp = { y: Math.round(y), h: Math.round(Math.max(0, bot - y) < r.height ? bot - y : 0), x: Math.round(innerWidth - RAIL() - 4 - r.width - (document.querySelector('#edp-win[data-dock]') ? 312 : 0)), top0: r.top }; }
  { const um = document.getElementById('ui-mode'), oc = R('osch'); if (um && oc && document.querySelector('#h4-root.kit')) { const L = Math.round(oc.right + 10) + 'px', rs = document.documentElement.style; if (rs.getPropertyValue('--um-left') !== L) rs.setProperty('--um-left', L); /* 2026-10-09: a root var, so the HUD repaint never resets it (it flickered) */ } } // the WoW crest rides the chat's right edge
  const ed = document.querySelector('#edp-win[data-dock]'); if (!ed) edLock = null;
  if (ed) { const mm = mm0, sp = R('osp'), mi = R('hud-micro'); const top = Math.max(mm ? mm.bottom + 12 : 260, 70); const dk = R('nh-dock'); const lim = Math.min(sp && sp.right > innerWidth - RAIL() - 312 && sp.top > top + 260 ? sp.top : vh, mi ? mi.top : vh, dk && dk.right > innerWidth - 400 ? dk.top : vh, vh - 110);
    const ek = innerWidth + 'x' + vh + 'x' + Math.round(top); if (!edLock || edLock.k !== ek) edLock = { k: ek, top, bot: Math.max(110, vh - lim + 10) }; ed.style.setProperty('top', edLock.top + 'px', 'important'); ed.style.setProperty('bottom', edLock.bot + 'px', 'important'); ed.style.setProperty('width', '300px', 'important'); }
  // creator 2026-10-09 "everything is still jumping around constantly changing size": a window's auto spot is decided ONCE when it opens
  // (or the screen resizes) and then held; live content growing or other windows moving never re-place it.
  const vk = innerWidth + 'x' + innerHeight;
  if (vk !== lockVk) { lockVk = vk; lock = {}; }
  for (const id of Object.keys(lock)) { const e = document.getElementById(id); if (!e || !e.offsetWidth || boxes[id]) delete lock[id]; }
  for (const [id, b] of Object.entries(nxt)) { if (lock[id]) nxt[id] = lock[id]; else lock[id] = b; }
  for (const id of Object.keys(auto)) if (!nxt[id] && lock[id]) nxt[id] = lock[id];
  if (JSON.stringify(nxt) !== JSON.stringify(auto)) { auto = nxt; paint(); }
}
let lock = {}, lockVk = '', edLock = null;
function paint() {
  if (!sheet) { sheet = document.createElement('style'); sheet.id = 'wn-boxes'; document.head.appendChild(sheet); }
  let css = `.wn-drag{position:absolute;left:0;right:0;top:0;height:16px;z-index:2147483000;cursor:grab;background:#1d1a16e6;border-bottom:1px solid #d9ad5e66;border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0;opacity:.9;transition:opacity .15s;touch-action:none;pointer-events:auto;font:11px/16px Georgia,serif;color:#d9c8a8;padding-left:8px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;letter-spacing:.06em}.wn-drag.wn-out{top:-17px;border-bottom:0;border:1px solid #d9ad5e66;border-radius:5px 5px 0 0}
.wn-drag:hover{opacity:1}.wn-drag::after{content:'';position:absolute;right:30px;top:6px;width:34px;margin-left:-17px;height:3px;border-radius:2px;background:#d9ad5e}
.wn-grip{position:absolute;right:0;bottom:0;width:16px;height:16px;z-index:2147483000;cursor:nwse-resize;opacity:.6;touch-action:none;background:linear-gradient(135deg,transparent 0 55%,#d9ad5e 55% 62%,transparent 62% 72%,#d9ad5e 72% 79%,transparent 79%)}
.wn-grip:hover{opacity:1}body.wn-busy *{user-select:none!important}\n`;
  css += `body:has(#h4-root.kit) #osch>.wn-drag{top:-15px!important;height:13px!important;line-height:13px!important;font-size:10px!important;opacity:0;border:1px solid #8a6a3266;border-radius:4px 4px 0 0}body:has(#h4-root.kit) #osch:hover>.wn-drag{opacity:.85}\n`;
  css += `[data-dock]>.wn-drag,[data-dock]>.wn-grip{display:none!important}.wn-x{display:none}\n`;
  if (typeof matchMedia === 'undefined' || matchMedia('(pointer: fine)').matches) {
    const not = [...NOCENTER, ...Object.keys(boxes)].map((i) => `:not(#${i})`).join('');
    css += `[data-modal][id]${not}:not([id^=win-]):not([data-dock]){left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;margin:0!important;transform:translate(-50%,-50%)!important}\n`;
  }
  const vw = innerWidth - RAIL(), vh = innerHeight;
  for (const [id, b0] of Object.entries(auto)) if (!boxes[id]) css += `#${id}:not([data-dock]){top:${b0.y}px!important;bottom:auto!important;${b0.x != null ? `left:${b0.x}px!important;right:auto!important;transform:none!important;` : b0.tf ? `transform:${b0.tf}!important;` : ''}${b0.h ? `max-height:${b0.h}px!important;overflow:auto!important;` : ''}}\n`;
  for (const [id, b1] of Object.entries(boxes)) {
    const b = { ...b1, x: Math.max(0, Math.min(vw - Math.min(b1.w || 160, vw), b1.x)), y: Math.max(18, Math.min(vh - 60, b1.y)) };
    css += `#${id}:not([data-dock]){left:${b.x}px!important;top:${b.y}px!important;right:auto!important;bottom:auto!important;transform:none!important;margin:0!important;`
      + (b.w ? `width:${b.w}px!important;height:${b.h}px!important;max-width:none!important;max-height:none!important;min-height:0!important;overflow:auto!important;` : '') + `}\n`;
  }
  css += LAYERS + TYPE;
  sheet.textContent = css;
}
// creator 2026-10-09 layering: static HUD 10, game windows 20, popups/tooltips/menus 30. Each window keeps its own inner stacking.
const LAYERS = `#osmm,#osch,#nh-dock,#hud-player,#hud-bar,#hud-micro,#wow-target,#h4-target,#os-xp,#reticle{z-index:10!important}
#os-settings,#edp-win,#wmap,#osp,#kp,#keybinds,#den-systems,#light-editor,#travel-panel,#vote-ledger,#wardrobe,#jev-desk,#chess-panel,#huginn-map,#devbook-book,#cbk,[id^=win-],[data-modal]{z-index:20!important}
#adm-menu,#osmm-tip,.kctx,[id$=-tip],[role=tooltip],[role=menu],[role=listbox],select,.tooltip,.dropdown,#ma-bar{z-index:30!important}
#edp-win,#os-settings,#wmap,#kp,#den-systems,#travel-panel{max-width:calc(100vw - var(--spawn-chrome-reservation-right-inset,50px) - 24px)!important;max-height:calc(100vh - 24px)!important}\n`;
// creator 2026-10-09 typography: crisp antialiased text, a sharp bold serif for headers, a clean sans for labels and hotkeys,
// a dark shadow under every light label, letter-spacing so caps never run together, rows tall enough to centre their text.
const TYPE = `#edp-win,#os-settings,#wmap,#adm-menu,#kp,#den-systems,#keybinds,#travel-panel,#light-editor,[data-modal],.wn-drag{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
#adm-menu button,#edp-win button,#kp button,#den-systems button,#travel-panel button,#light-editor button{min-height:28px;align-items:center;letter-spacing:.04em;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#edp-win input[type=range],#light-editor input[type=range]{margin:0 6px;min-width:0}\n`;
function grab(e, el, mode) {
  if (e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  const r = el.getBoundingClientRect(), id = el.id, b0 = { x: Math.round(r.left), y: Math.round(r.top), ...(boxes[id] ?? {}) };
  if (mode === 'size' && !b0.w) { b0.w = Math.round(r.width); b0.h = Math.round(r.height); }
  b0.x = Math.round(r.left); b0.y = Math.round(r.top);
  const sx = e.clientX, sy = e.clientY; document.body.classList.add('wn-busy');
  const mv = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (mode === 'move') boxes[id] = { ...b0, x: Math.round(Math.min(innerWidth - 40, Math.max(-r.width + 60, b0.x + dx))), y: Math.round(Math.min(innerHeight - 20, Math.max(0, b0.y + dy))) };
    else boxes[id] = { ...b0, w: Math.round(Math.max(160, b0.w + dx)), h: Math.round(Math.max(90, b0.h + dy)) };
    paint();
  };
  const up = () => { delete auto[id]; document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.body.classList.remove('wn-busy'); keep(); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}
const OS_FIXED = new Set(['osmm', 'osch', 'osp']);
function dress(el) {
  if (!el.id || SKIP.has(el.id) || el.offsetWidth < 80 || el.offsetHeight < 40) return;
  // creator 2026-10-09 "default is osrs UI ... like it was before": the classic frame's fixed pieces wear no bars in the OSRS style
  if (OS_FIXED.has(el.id) && !document.querySelector('#h4-root.kit')) { for (const c of [...el.children]) if (c.classList?.contains('wn-drag') || c.classList?.contains('wn-grip') || c.classList?.contains('wn-x')) c.remove(); return; }
  if (getComputedStyle(el).position !== 'fixed') return;
  let bar = null, grip = null;
  for (const c of el.children) { if (c.classList?.contains('wn-drag')) bar = c; else if (c.classList?.contains('wn-grip')) grip = c; }
  if (!bar) {
    bar = document.createElement('div'); bar.className = 'wn-drag'; bar.title = 'Drag to move · double-click to put back';
    bar.textContent = LABEL[el.id] || (el.getAttribute('aria-label') || el.id.replace(/^win-/, '').replace(/[-_]/g, ' ')).slice(0, 28);
    if (getComputedStyle(el).overflow === 'visible' && el.getBoundingClientRect().top > 20) bar.classList.add('wn-out');
    bar.addEventListener('pointerdown', (e) => grab(e, el, 'move'));
    bar.addEventListener('dblclick', (e) => { e.stopPropagation(); delete boxes[el.id]; keep(); paint(); });
    for (const t of ['mousedown', 'click', 'wheel']) bar.addEventListener(t, (e) => e.stopPropagation());
    el.appendChild(bar);
  }
  if (!grip) {
    grip = document.createElement('div'); grip.className = 'wn-grip'; grip.title = 'Drag to resize';
    grip.addEventListener('pointerdown', (e) => grab(e, el, 'size'));
    for (const t of ['mousedown', 'click']) grip.addEventListener(t, (e) => e.stopPropagation());
    el.appendChild(grip);
  }
  let x = null; for (const c of el.children) if (c.classList?.contains('wn-x')) x = c;
  if (!x) {
    const own = CLOSE[el.id] ? null : ownX(el);
    if (CLOSE[el.id] || own) {
      if (own) own.classList.add('wn-ownx');
      x = document.createElement('button'); x.className = 'wn-x'; x.title = 'Close'; x.setAttribute('aria-label', 'close');
      x.addEventListener('pointerdown', (e) => e.stopPropagation());
      x.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); try { if (CLOSE[el.id]) CLOSE[el.id](); else (ownX(el) ?? own)?.click(); } catch {} });
      el.appendChild(x);
    }
  }
  if (x) x.style.top = el.scrollTop ? (el.scrollTop + 4) + 'px' : '';
  if (el.scrollTop) { bar.style.top = el.scrollTop + 'px'; grip.style.bottom = -el.scrollTop + 'px'; } else { bar.style.top = ''; grip.style.bottom = ''; }
}
function scan() {
  const seen = new Set();
  for (const el of document.querySelectorAll('[data-modal]')) { seen.add(el); try { dress(el); } catch {} }
  for (const id of IDS) { const el = document.getElementById(id); if (el && !seen.has(el)) try { dress(el); } catch {} }
  try { fit(); } catch {}
}
// a reloaded module replaces the old scanner (a stale one from an earlier version must not keep the flag and do nothing)
if (typeof document !== 'undefined' && globalThis.__wnMove !== scan) {
  try { clearInterval(globalThis.__wnTimer); if (globalThis.__wnScroll) document.removeEventListener('scroll', globalThis.__wnScroll, true); } catch {}
  globalThis.__wnMove = scan; globalThis.__wnScroll = scan;
  const start = () => { sheet = document.getElementById('wn-boxes'); paint(); globalThis.__wnTimer = setInterval(scan, 350); document.addEventListener('scroll', scan, true); };
  if (document.head) start(); else addEventListener('DOMContentLoaded', start);
}
// creator 2026-10-09 "close any conflicting background tool windows when opened": the one helper every modal opening goes through.
// ui.js's render hands it the player each paint; a modal's open flag going false→true (menu click, hotkey or button alike) sends each
// open tool window its OWN close action. The terrain editor is left alone while a mouse button is held (a stroke in progress).
let ptrDown = false, prevSnap = null;
if (typeof document !== 'undefined' && !globalThis.__wnPtr) {
  globalThis.__wnPtr = true;
  addEventListener('pointerdown', (e) => { if (e.button === 0) ptrDown = true; }, true);
  addEventListener('pointerup', () => { ptrDown = false; }, true);
  addEventListener('blur', () => { ptrDown = false; });
}
export function closeBehind(player, opened) {
  if (typeof sendAction !== 'function' || !player?.isEditor) return;
  const s = player.state ?? {};
  if (s.le?.open) sendAction('le', { op: 'close' });
  if (s.te?.open && !ptrDown) sendAction('te', { op: 'close' }); // outliner, logic and history live inside the editor and shut with it
  if (s.maOn && !(opened.length === 1 && opened[0] === 'opt')) sendAction('maOff'); // the O menu keeps Move Anything (creator 2026-10-06)
}
export function winStack(player, panes) {
  if (typeof document === 'undefined' || !player) return;
  const s = player.state ?? {};
  const snap = { opt: !!s.optionsOpen, sys: !!s.sysOpen, led: !!s.ledger?.open, jev: !!s.jevDesk?.open, bug: s.bugOpen != null || s.bugDraft != null, kp: !!s.keeper?.open, trv: !!s.travelOpen, panes: panes | 0 };
  const p = prevSnap; prevSnap = snap; if (!p) return;
  const opened = Object.keys(snap).filter((k) => (k === 'panes' ? snap.panes > p.panes : snap[k] && !p[k]));
  if (opened.length) queueMicrotask(() => closeBehind(player, opened));
}
export const winMoveReady = true;

// creator 2026-10-09 "only ONE large central panel open at a time": when Settings, the Shader Editor, the world map or the
// 3rd Person bag panel appears, every other one shuts by its own close. A close is sent once (1.5 s guard) since those are toggles.
const BIG = { 'os-settings': () => sendAction('options', {}, { relockPointer: true }), 'edp-win': () => sendAction('post', { op: 'win' }), wmap: () => sendAction('huginnMap'), osp: () => { try { ospClose(); } catch {} } };
let bigPrev = new Set(); const bigSent = {};
function bigOne() {
  const on = new Set(Object.keys(BIG).filter((id) => { const e = document.getElementById(id); return e && e.offsetWidth && (id !== 'osp' || document.querySelector('#h4-root.kit')); }));
  const fresh = [...on].filter((id) => !bigPrev.has(id)); bigPrev = on;
  if (fresh.length !== 1) return; const now = performance.now();
  for (const id of on) if (id !== fresh[0] && !(bigSent[id] > now - 1500)) { bigSent[id] = now; try { BIG[id](); } catch {} }
}
if (typeof document !== 'undefined') { try { clearInterval(globalThis.__wnBig); } catch {} globalThis.__wnBig = setInterval(bigOne, 200); }
