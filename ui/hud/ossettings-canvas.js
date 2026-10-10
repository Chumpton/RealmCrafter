// The OSRS Settings window (creator 2026-10-06: the O menu "1:1" with the OSRS look), page side. One 512 x 335 <canvas> drawn from the wiki's own Settings window
// (bg1 = text lifted, bg2 = text and widgets lifted, both cut by docs/board/osui/ tools) and the OSRS pixel fonts as glyph sheets. Rows come from
// scripts/lib/data/settings-registry.js through ui/hud/ossettings.js (osSettingsFeed); the window only draws and hit-tests, every change leaves through the callbacks.
// Layout numbers are measured from `Settings interface.png` (see docs/board/osui/SETTINGS-PLAN.md). Fonts: bold = the plain face doubled by 1 px (advance +1), the
// widgets' text is the slightly different #fd961d orange of the sheet.
import { osK, UI_STEPS, osIsFullscreen } from './os-scale.js';
const SRC = { bg1: '/cdn/value.e76b29964e41e22be832509169aa40f5b39ed7b1efc9cd664a8d0ae2a5c7f3a3.png?data', bg2: '/cdn/value.8059ee66302120e4f134de90fc31c5442a385c7fd6a6bf6885a2e4bb202f08db.png?data',
  audio: '/cdn/value.b2b83ad734e2d0f8cc4f434f9259babe39ff40ebe044356d5de06a63c4358978.png?data', plain: '/cdn/value.f107bd4b9871595ce1fdfdcb7cbff80827e2504b81011c08f3cf998bc1e9ceea.png?data',
  bold: '/cdn/value.460c9a5524c3ee1b1e39b3aef88601f51340f3b2c4f25e81fbba1772e812e95f.png?data' };
const ADV = { plain: [3, 3, 5, 13, 8, 11, 11, 4, 4, 4, 9, 7, 4, 6, 3, 6, 8, 6, 8, 7, 7, 7, 8, 7, 8, 8, 3, 4, 6, 8, 6, 8, 13, 8, 7, 7, 7, 6, 6, 8, 7, 3, 7, 7, 6, 9, 8, 8, 7, 8, 7, 7, 5, 8, 7, 9, 7, 7, 7, 5, 6, 5, 8, 9, 4, 7, 7, 6, 7, 7, 6, 7, 7, 3, 6, 6, 3, 9, 7, 7, 7, 7, 5, 7, 5, 7, 7, 7, 7, 7, 7, 5, 3, 5, 11] };
ADV.bold = ADV.plain.map((v, i) => v + 1); ADV.bold[87 - 32] += 1; // 'w' is one wider in the sheet's bold
const ORANGE = '#ff981f', WORANGE = '#fd961d', WHITE = '#ffffff', BLACK = '#000000', GREY = '#bdb09a';
const S = { W: 512, H: 335, content: { x: 92, y: 73, w: 397, h: 253 }, checkbox: { x: 461, srcY: 182 }, number: { x: 352 }, dropdown: { x: 380 }, button: { x: 361, y: 103, w: 122, h: 38 },
  scroll: { x: 489, up: 71, down: 312, trackY: 87, thumbTop: 88 }, cats: { x: 8, w: 84, y0: 38, pitch: 26, h: 27 }, titleBtn: { x: 7, y: 7, w: 150, h: 19 }, close: { x: 484, y: 7, w: 21, h: 21 }, HEADSRC: [76, 154], LX: [23, 34, 37, 26, 29, 22, 20, 24, 30] };
const imgs = {}, tint = {}, SP = {};
let gen = 0, loading = null, wired = false, model = null, cat = 0, search = '', scrollY = 0, info = false, editNum = null, drag = null, openDD = null, hits = [], thumb = null, local = {}, lastSend = 0, vis = [];
function load() { if (loading && SP.catSel) return loading; if (loading && !SP.catSel) { loading = null; for (const k of Object.keys(SP)) delete SP[k]; } loading = Promise.all(Object.entries(SRC).map(([k, src]) => new Promise((r) => { const i = new Image(); i.onload = () => { imgs[k] = i; r(); }; i.onerror = () => r(); i.src = src; }))).then(sprites); return loading; }
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const crop = (src, x, y, w, h) => { const c = cvs(w, h); c.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h); return c; };
function tinted(f, col) { const k = f + col; if (tint[k]) return tint[k]; const c = cvs(1330, 22), g = c.getContext('2d'); g.drawImage(imgs[f], 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 1330, 22); return (tint[k] = c); }
const gi = (ch) => { const i = ch.charCodeAt(0) - 32; return i >= 0 && i < 95 ? i : 31; };
const bw = (f, s) => { let w = 0; for (const ch of s) w += ADV[f][gi(ch)]; return w; };
function text(cx, f, s, x, y, col, shadow = true) { if (shadow) text(cx, f, s, x + 1, y + 1, BLACK, false); const t = tinted(f, col); let pen = x; for (const ch of s) { const i = gi(ch); cx.drawImage(t, i * 14, 0, 14, 22, pen, y, 14, 22); pen += ADV[f][i]; } return pen; }
function sprites() {
  if (!imgs.bg1 || !imgs.bg2 || !imgs.plain || !imgs.bold || !imgs.audio) return;
  const b1 = imgs.bg1, b2 = imgs.bg2;
  SP.cbOn = crop(b1, S.checkbox.x, S.checkbox.srcY, 18, 18);
  const off = cvs(18, 18), og = off.getContext('2d'); og.drawImage(SP.cbOn, 0, 0);
  // the desktop app serves the sheets cross-origin, so a pixel read-back throws there (creator 2026-10-06: the window drew empty): read when allowed, else paint the box's inside dark
  try { const id = og.getImageData(0, 0, 18, 18), d = id.data; for (let i = 0; i < d.length; i += 4) if ((d[i + 1] > d[i] + 50 && d[i + 1] > d[i + 2] + 30) || (d[i] === 0x36 && d[i + 1] === 0xaa)) d[i] = d[i + 1] = d[i + 2] = 26; og.putImageData(id, 0, 0); }
  catch (e) { og.fillStyle = '#1a1a1a'; og.fillRect(3, 3, 12, 12); }
  SP.cbOff = off;
  const num = cvs(127, 20), ng = num.getContext('2d'); ng.drawImage(b1, 352, 233, 7, 20, 0, 0, 7, 20); ng.drawImage(b1, 473, 233, 6, 20, 121, 0, 6, 20); for (let x = 7; x < 121; x++) ng.drawImage(b1, 362, 233, 1, 20, x, 0, 1, 20); SP.num = num;
  const dd = cvs(99, 20), dg = dd.getContext('2d'); dg.drawImage(b1, 380, 311, 7, 15, 0, 0, 7, 15); dg.drawImage(b1, 461, 311, 18, 15, 81, 0, 18, 15); for (let x = 7; x < 81; x++) dg.drawImage(b1, 384, 311, 1, 15, x, 0, 1, 15); for (let j = 0; j < 5; j++) dg.drawImage(dd, 0, j, 99, 1, 0, 19 - j, 99, 1); SP.dd = dd;
  SP.btn = crop(b1, S.button.x, S.button.y, S.button.w, S.button.h);
  SP.up = crop(b2, S.scroll.x, S.scroll.up, 16, 16); SP.down = crop(b2, S.scroll.x, S.scroll.down, 16, 16); SP.track = crop(b2, S.scroll.x, S.scroll.trackY + 1, 16, 224);
  SP.thTop = crop(b1, S.scroll.x, 88, 16, 4); SP.thBody = crop(b1, S.scroll.x, 92, 16, 199); SP.thBot = crop(b1, S.scroll.x, 291, 16, 4);
  const A = imgs.audio, tr = cvs(130, 17), tg = tr.getContext('2d'); tg.drawImage(A, 51, 72, 130, 17, 0, 0, 130, 17); for (let x = 105; x < 118; x++) tg.drawImage(tr, x - 24, 0, 1, 17, x, 0, 1, 17); SP.track2 = tr; SP.gem = crop(A, 156, 72, 13, 17);
  SP.catSel = crop(b2, S.cats.x, S.cats.y0, S.cats.w, S.cats.h); SP.catOff = crop(b2, S.cats.x, S.cats.y0 + S.cats.pitch, S.cats.w, S.cats.h);
}
const cv = () => document.getElementById('osw');
const valOf = (r) => r.page && r.id === 'fullscreen' ? osIsFullscreen() : (local[r.id] !== undefined && Date.now() < local[r.id].until ? local[r.id].v : r.value);
function layout() {
  const q = search.trim().toLowerCase(), items = []; let y = 3, hc = 0;
  const rows = model.rows.filter((r) => (q ? r.label.toLowerCase().includes(q) : r.cat === vis[cat]));
  const secs = []; for (const r of rows) { let s = secs.find((x) => x.t === r.section); if (!s) secs.push((s = { t: r.section, rows: [] })); s.rows.push(r); }
  for (const sec of secs) {
    items.push({ k: 'head', t: sec.t, y, h: 24, hs: S.HEADSRC[hc++ % 2] }); y += 24; let n = 0;
    for (const r of sec.rows) { const ex = info && r.info ? 13 : 0; if (r.type === 'button') { items.push({ k: 'row', r, y, h: 54 + ex, plain: true }); y += 54 + ex; } else { items.push({ k: 'row', r, y, h: 26 + ex, src: 178 + 26 * (n % 6) }); y += 26 + ex; n++; } }
  }
  return { items, total: y };
}
const maxScroll = (L) => Math.max(0, L.total - S.content.h);
function render() {
  const c = cv(); if (!c || !model || !SP.catSel) return; const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; c._wDrawn = gen;
  const L = layout(); scrollY = Math.max(0, Math.min(scrollY, maxScroll(L))); hits = [];
  cx.clearRect(0, 0, S.W, S.H); cx.drawImage(imgs.bg2, 0, 0);
  let pen = 18; const words = [['Show', ORANGE], [info ? 'less' : 'more', WHITE], ['information', ORANGE]]; for (const [w, col] of words) { text(cx, 'plain', w, pen, 9, col); pen += bw('plain', w + ' '); }
  hits.push({ ...S.titleBtn, fn: () => { info = !info; render(); } });
  text(cx, 'bold', 'Settings', 228, 10, ORANGE); hits.push({ ...S.close, fn: () => model.onClose?.() });
  const LXMAP = { Activities: 23, Audio: 34, Chat: 37, Controls: 26, Display: 29, Gameplay: 22, Interfaces: 20, Warnings: 24, Popout: 30 };
  for (let i = vis.length; i < 9; i++) cx.drawImage(imgs.bg2, S.cats.x, 276, S.cats.w, S.cats.h + 1, S.cats.x, S.cats.y0 + S.cats.pitch * i, S.cats.w, S.cats.h + 1); // slots with no category: bare panel
  vis.forEach((n, i) => {
    const y = S.cats.y0 + S.cats.pitch * i, sel = i === cat && !search;
    if (sel && i > 0) cx.drawImage(SP.catSel, S.cats.x, y); else if (!sel && i === 0) cx.drawImage(SP.catOff, S.cats.x, y);
    text(cx, 'plain', n, LXMAP[n] ?? Math.floor(S.cats.x + (S.cats.w - 3) / 2 - bw('plain', n) / 2), y + 7, ORANGE);
    hits.push({ x: S.cats.x, y, w: S.cats.w, h: S.cats.pitch, fn: () => { cat = i; search = ''; scrollY = 0; openDD = null; editNum = null; render(); } });
  });
  text(cx, 'plain', 'Search:', 100, 45, ORANGE); const sx = text(cx, 'plain', search, 156, 45, ORANGE); text(cx, 'plain', '*', sx, 45, ORANGE);
  hits.push({ x: 150, y: 41, w: 337, h: 25, fn: () => focusIn('search') });
  cx.save(); cx.beginPath(); cx.rect(S.content.x, S.content.y, S.content.w, S.content.h); cx.clip();
  for (let yy = S.content.y; yy < S.content.y + S.content.h; yy += 54) cx.drawImage(imgs.bg2, S.content.x, 100, S.content.w, 54, S.content.x, yy, S.content.w, 54); // bare panel under and below the rows
  for (const it of L.items) {
    const y = S.content.y + it.y - scrollY; if (y > S.content.y + S.content.h || y + it.h < S.content.y) continue;
    if (it.k === 'head') { cx.drawImage(imgs.bg2, S.content.x, it.hs, S.content.w, 24, S.content.x, y, S.content.w, 24); text(cx, 'bold', it.t, Math.floor(S.content.x + S.content.w / 2 - bw('bold', it.t) / 2), y + 5, WHITE); continue; }
    const r = it.r; if (it.plain) { for (let o = 0; o < it.h; o += 54) cx.drawImage(imgs.bg2, S.content.x, 100, S.content.w, Math.min(54, it.h - o), S.content.x, y + o, S.content.w, Math.min(54, it.h - o)); } else { cx.drawImage(imgs.bg2, S.content.x, it.src, S.content.w, 26, S.content.x, y, S.content.w, 26); if (it.h > 26) cx.drawImage(imgs.bg2, S.content.x, it.src, S.content.w, it.h - 26, S.content.x, y + 26, S.content.w, it.h - 26); }
    const dim = !r.enabled; cx.globalAlpha = dim ? 0.45 : 1;
    if (r.type !== 'button') text(cx, 'bold', r.label, 102, y + 5, ORANGE);
    if (info && r.info) text(cx, 'plain', r.info, 102, y + (it.plain ? 39 : 26), GREY);
    widget(cx, r, y, it, dim); cx.globalAlpha = 1;
  }
  cx.restore();
  cx.drawImage(SP.up, S.scroll.x, S.scroll.up); cx.drawImage(SP.down, S.scroll.x, S.scroll.down); cx.drawImage(SP.track, S.scroll.x, S.scroll.trackY + 1);
  const tt = 224, ms = maxScroll(L), th = ms ? Math.max(20, Math.round(tt * S.content.h / L.total)) : 207, ty = S.scroll.thumbTop + (ms ? Math.round((tt - th - 1) * scrollY / ms) : 0);
  cx.drawImage(SP.thTop, S.scroll.x, ty); for (let r = 0; r < th - 8; r++) cx.drawImage(SP.thBody, 0, Math.min(198, Math.floor(r * 199 / Math.max(1, th - 8))), 16, 1, S.scroll.x, ty + 4 + r, 16, 1); cx.drawImage(SP.thBot, S.scroll.x, ty + th - 4);
  thumb = { y: ty, h: th, ms, tt, total: L.total };
  hits.push({ x: S.scroll.x, y: S.scroll.up, w: 16, h: 16, fn: () => { scrollY -= 26; render(); } }, { x: S.scroll.x, y: S.scroll.down, w: 16, h: 16, fn: () => { scrollY += 26; render(); } });
  if (openDD) ddList(cx);
  size(c);
}
function size(c) { const k = UI_STEPS[model.scale] || osK(); /* one shared size (ui/hud/os-scale.js): Auto fits the window, refits on resize */ c.style.width = S.W * k + 'px'; c.style.height = S.H * k + 'px'; c.style.imageRendering = model.linear ? 'auto' : 'pixelated'; }
function widget(cx, r, y, it, dim) {
  const clickable = r.enabled, v = valOf(r);
  if (r.type === 'check') { const yy = y + 4; cx.drawImage(v ? SP.cbOn : SP.cbOff, S.checkbox.x, yy); if (clickable) hits.push({ x: S.checkbox.x, y: yy, w: 18, h: 18, clip: true, fn: () => { set(r, !v); } }); }
  else if (r.type === 'number') { const yy = y + 3; cx.drawImage(SP.num, S.number.x, yy); const s = editNum === r.id ? String(v) + '*' : String(v); text(cx, 'plain', s, Math.round(S.number.x + 127 / 2 - bw('plain', s) / 2), yy + 2, WORANGE); if (clickable) hits.push({ x: S.number.x, y: yy, w: 127, h: 20, clip: true, fn: () => { editNum = r.id; focusIn('num'); } }); }
  else if (r.type === 'dropdown') { const yy = y + 3; cx.drawImage(SP.dd, S.dropdown.x, yy); text(cx, 'plain', r.opts[v] ?? '', S.dropdown.x + 9, yy + 2, WORANGE); if (clickable) hits.push({ x: S.dropdown.x, y: yy, w: 99, h: 20, clip: true, fn: () => { openDD = { r, y: yy }; render(); } }); }
  else if (r.type === 'button') { const yy = y + 3; cx.drawImage(SP.btn, S.button.x, yy); const [a, b] = r.two ?? [r.label, '']; text(cx, 'plain', a, Math.floor(S.button.x + 61 - bw('plain', a) / 2), yy + 4, WORANGE); if (b) text(cx, 'plain', b, Math.floor(S.button.x + 61 - bw('plain', b) / 2), yy + 18, WORANGE); if (clickable) hits.push({ x: S.button.x, y: yy, w: 122, h: 38, clip: true, fn: () => model.onPress?.(r.id) }); }
  else if (r.type === 'slider') { const yy = y + 5, sx = S.dropdown.x - 26, f = (v - r.min) / (r.max - r.min); cx.drawImage(SP.track2, sx, yy); cx.drawImage(SP.gem, Math.round(sx + 4 + f * (130 - 13 - 12)), yy); if (clickable) hits.push({ x: sx, y: yy, w: 130, h: 17, clip: true, slider: { r, sx }, fn: (mx) => slide(r, sx, mx) }); }
}
function set(r, v) { local[r.id] = { v, until: Date.now() + 900 }; model.onSet?.(r.id, v); render(); }
function slide(r, sx, mx) { const f = Math.max(0, Math.min(1, (mx - sx - 10) / (130 - 13 - 12))), st = r.step || 1, v = Math.max(r.min, Math.min(r.max, Math.round((r.min + f * (r.max - r.min)) / st) * st)); local[r.id] = { v, until: Date.now() + 900 }; const now = Date.now(); if (now - lastSend > 90 || v === r.min || v === r.max) { lastSend = now; model.onSet?.(r.id, v); } render(); }
function ddList(cx) { const { r, y } = openDD, x = S.dropdown.x, n = r.opts.length, h = n * 18 + 4, top = Math.min(y + 20, S.content.y + S.content.h - h); cx.fillStyle = '#1a1611'; cx.fillRect(x, top, 99, h); cx.strokeStyle = '#000'; cx.strokeRect(x + 0.5, top + 0.5, 98, h - 1);
  r.opts.forEach((o, i) => { const yy = top + 2 + i * 18; if (i === valOf(r)) { cx.fillStyle = '#3d352b'; cx.fillRect(x + 2, yy, 95, 18); } text(cx, 'plain', o, x + 6, yy + 1, WORANGE); hits.push({ x: x + 2, y: yy, w: 95, h: 18, top: true, fn: () => { openDD = null; set(r, i); } }); }); }
let inEl = null;
function focusIn(mode) { try { if (!inEl || !inEl.isConnected) { inEl = document.getElementById('osw-in'); wireInput(); } if (inEl) { inEl.dataset.mode = mode; inEl.value = mode === 'search' ? search : ''; inEl.focus({ preventScroll: true }); } } catch (e) {} }
function wireInput() { if (!inEl || inEl._w) return; inEl._w = true; const stop = (e) => e.stopPropagation(); inEl.addEventListener('keydown', (e) => { stop(e); if (e.key === 'Enter' || e.key === 'Escape') { editNum = null; inEl.blur(); render(); } }); inEl.addEventListener('keyup', stop); inEl.addEventListener('keypress', stop);
  inEl.addEventListener('input', () => { if (inEl.dataset.mode === 'num' && editNum) { const r = model.rows.find((x) => x.id === editNum); const d = inEl.value.replace(/\D/g, '').slice(0, 9); if (r) { local[r.id] = { v: +d || 0, until: Date.now() + 900 }; model.onSet?.(r.id, +d || 0); } } else { search = inEl.value.slice(0, 40); scrollY = 0; } render(); }); }
const pos = (e) => { const r = cv().getBoundingClientRect(); return { x: (e.clientX - r.left) * S.W / r.width, y: (e.clientY - r.top) * S.H / r.height }; };
function wire() {
  if (wired) return; wired = true;
  addEventListener('osk', () => { const c = cv(); if (c && model) size(c); }); document.addEventListener('fullscreenchange', () => { if (cv() && model) render(); }); try { parent.document.addEventListener('fullscreenchange', () => { if (cv() && model) render(); }); } catch (e) {}
  setInterval(() => { const c = cv(); if (c && c._wDrawn !== gen) render(); }, 250); // the HUD may patch in a fresh canvas
  document.addEventListener('wheel', (e) => { if (e.target?.id !== 'osw') return; e.preventDefault(); e.stopPropagation(); scrollY += e.deltaY > 0 ? 26 : -26; render(); }, { passive: false, capture: true });
  document.addEventListener('mousedown', (e) => {
    if (e.target?.id !== 'osw' || !model) return; e.stopPropagation(); const p = pos(e); editNum = editNum && inEl && document.activeElement === inEl ? editNum : null;
    if (p.x >= S.scroll.x && p.x < S.scroll.x + 16 && thumb && thumb.ms && p.y >= thumb.y && p.y < thumb.y + thumb.h) { drag = { y: p.y, s: scrollY }; return; }
    if (p.x >= S.scroll.x && p.x < S.scroll.x + 16 && thumb && thumb.ms && p.y >= S.scroll.trackY && p.y < S.scroll.down && !(p.y >= thumb.y && p.y < thumb.y + thumb.h)) { scrollY += p.y < thumb.y ? -S.content.h : S.content.h; render(); return; }
    const inC = p.x >= S.content.x && p.x < S.content.x + S.content.w && p.y >= S.content.y && p.y < S.content.y + S.content.h;
    for (const h of hits.slice().reverse()) { if (p.x >= h.x && p.x < h.x + h.w && p.y >= h.y && p.y < h.y + h.h) { if (h.clip && !inC) continue; if (openDD && !h.top) { openDD = null; render(); return; } h.fn(p.x); if (h.slider) drag = { slider: h.slider }; return; } }
    if (openDD) { openDD = null; render(); } }, true);
  document.addEventListener('mousemove', (e) => { if (!drag || !model) return; const p = pos(e); if (drag.slider) { slide(drag.slider.r, drag.slider.sx, p.x); return; } if (!thumb || !thumb.ms) return; scrollY = drag.s + (p.y - drag.y) * (thumb.total - S.content.h) / (thumb.tt - thumb.h); render(); });
  document.addEventListener('mouseup', () => { if (drag?.slider) { const r = drag.slider.r, l = local[r.id]; if (l) model.onSet?.(r.id, l.v); } drag = null; });
}
// model: { rows:[{id,cat,section,label,type,info,opts,min,max,step,value,enabled,two}], cats:[names shown], scale, linear, onSet(id,v), onPress(id), onClose() }
export function osSettingsFeed(m) {
  gen++; const keep = vis[cat]; model = m; vis = m.cats.slice(); cat = Math.max(0, vis.indexOf(keep)); if (cat < 0) cat = 0;
  wire(); load().then(() => requestAnimationFrame(render));
}
export function osSettingsReset() { cat = 0; search = ''; scrollY = 0; info = false; editNum = null; openDD = null; local = {}; }
