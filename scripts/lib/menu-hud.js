// OSRS context menu: render with the same RuneLite glyph atlas as the chatbox.
// The root stays transparent because Spawn's data-modal treatment dims the room.
import { MENU } from './data/menu.js';
import { ensureStyle } from './ui-style.js';

const SRC = {
  bold: '/cdn/value.460c9a5524c3ee1b1e39b3aef88601f51340f3b2c4f25e81fbba1772e812e95f.png?data'
};
const PLAIN_ADV = [3,3,5,13,8,11,11,4,4,4,9,7,4,6,3,6,8,6,8,7,7,7,8,7,8,8,3,4,6,8,6,8,13,8,7,7,7,6,6,8,7,3,7,7,6,9,8,8,7,8,7,7,5,8,7,9,7,7,7,5,6,5,8,9,4,7,7,6,7,7,6,7,7,3,6,6,3,9,7,7,7,7,5,7,5,7,7,7,7,7,7,5,3,5,11];
const ADV = PLAIN_ADV.map((v, i) => v + (i === 87 - 32 ? 2 : 1));
const CW = 14, CH = 22, HEAD = 19, ROW = 15, PAD = 5, MIN_W = 126, MAX_W = 420, BORDER = 2;
const imgs = {}, tinted = {};
let loading = null, active = null, generation = 0, rightPointer = null, lastPointer = null, pointerTracking = false;
const STYLE = `<style>
.cm-root{position:fixed;inset:0;z-index:2147483000!important;pointer-events:auto;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important}
.cm-pixel{position:absolute;image-rendering:pixelated;pointer-events:auto;cursor:default}
</style>`;

function trackRightPointer() {
  if (pointerTracking || typeof document === 'undefined') return;
  pointerTracking = true;
  const remember = (ev) => {
    if (!Number.isFinite(ev.clientX) || !Number.isFinite(ev.clientY)) return;
    lastPointer = { x: ev.clientX, y: ev.clientY, at: Date.now() };
    if (ev.button === 2) rightPointer = lastPointer;
  };
  // Spawn routes world input through its own canvas; depending on the browser
  // surface, the HUD may see pointer movement without seeing the button event.
  // Keep the latest viewport pixel independently of the simulation's ray.
  for (const type of ['pointermove', 'mousemove', 'pointerdown', 'mousedown', 'contextmenu']) {
    window.addEventListener(type, remember, true);
  }
}
function load() {
  if (loading) return loading;
  loading = Promise.all(Object.entries(SRC).map(([key, src]) => new Promise((done) => {
    const img = new Image(); img.onload = () => { imgs[key] = img; done(); }; img.onerror = done; img.src = src;
  })));
  return loading;
}
const gi = (ch) => { const i = ch.charCodeAt(0) - 32; return i >= 0 && i < 95 ? i : 31; };
function textWidth(text) { let w = 0; for (const ch of text) w += ADV[gi(ch)]; return w; }
function ink(color) {
  const key = color;
  if (tinted[key]) return tinted[key];
  const c = document.createElement('canvas'); c.width = 1330; c.height = CH;
  const x = c.getContext('2d'); x.drawImage(imgs.bold, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return tinted[key] = c;
}
function draw(x, text, left, top, color, shadow = true) {
  if (shadow) draw(x, text, left + 1, top + 1, '#000000', false);
  const atlas = ink(color); let pen = left;
  for (const ch of text) { const i = gi(ch); x.drawImage(atlas, i * CW, 0, CW, CH, pen, top, CW, CH); pen += ADV[i]; }
}
function segmentWidths(e) {
  const out = [{ text: e.verb, color: '#ffffff' }];
  if (e.target) out.push({ text: ` ${e.target}`, color: e.lvl?.col ?? e.col ?? '#00ff00' });
  if (e.lvl) out.push({ text: ` (level-${e.lvl.n | 0})`, color: e.lvl.col ?? '#00ff00' });
  return out;
}
function rowWidth(row) { return row.reduce((n, s) => n + textWidth(s.text), 0); }
function drawRow(x, row, y) { let pen = PAD; for (const s of row) { draw(x, s.text, pen, y, s.color); pen += textWidth(s.text); } }
function render(id) {
  const state = active, canvas = document.getElementById(id);
  if (!state || !canvas || !imgs.bold) return;
  const { rows, entries, sc, width, height, m } = state, x = canvas.getContext('2d');
  x.imageSmoothingEnabled = false; x.clearRect(0, 0, width, height);
  // OSRS's menu is a square, black outlined panel with a black title strip.
  x.fillStyle = '#000000'; x.fillRect(0, 0, width, height);
  x.fillStyle = '#000000'; x.fillRect(1, 1, width - 2, HEAD);
  x.fillStyle = '#5c5347'; x.fillRect(1, HEAD + 1, width - 2, height - HEAD - 2);
  draw(x, MENU.headline || 'Choose Option', PAD - 1, -1, '#c8c4bc');
  rows.forEach((row, i) => drawRow(x, state.hover === i ? row.map((s) => ({ ...s, color: '#ffff00' })) : row, HEAD + 1 + i * ROW - 3));
  draw(x, 'Cancel', PAD, HEAD + 1 + entries.length * ROW - 3, state.hover === entries.length ? '#ffff00' : '#ffffff');
  canvas.onclick = (ev) => {
    const s = active; if (!s) return;
    const rect = canvas.getBoundingClientRect(), cy = (ev.clientY - rect.top) / s.sc;
    if (cy < HEAD) return;
    const i = Math.floor((cy - HEAD) / ROW);
    if (i >= s.entries.length) { sendAction('menuClose', {}, { relockPointer: true }); return; }
    const e = s.entries[i];
    if (e?.a) { sendAction(e.a, e.d ?? {}); sendAction('menuClose', {}, { relockPointer: true }); }
    else sendAction('menuPick', { i, n: s.m.n }, { relockPointer: true });
  };
  canvas.oncontextmenu = (ev) => { ev.preventDefault(); };
  canvas.onmousemove = (ev) => {
    const s = active; if (!s) return;
    const rect = canvas.getBoundingClientRect(), cy = (ev.clientY - rect.top) / s.sc;
    const i = cy < HEAD ? -1 : Math.floor((cy - HEAD) / ROW);
    const hover = i >= 0 && i <= s.entries.length ? i : -1;
    if (hover !== s.hover) { s.hover = hover; render(s.id); }
  };
}

import { kitOn } from '../../ui/hud/skin.js';
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const attr = (v) => esc(JSON.stringify(v ?? {}));
// 3rd Person: the same entries and the same actions, drawn as page rows so the gold kit (ui/hud/kit-ctxmenu.js) can style them.
function kitMenu(m, entries, ax, ay) {
  const vw = window.innerWidth, vh = window.innerHeight, w = 250, h = 58 + (entries.length + 1) * 24 + 12;
  let left = ax + 3, top = ay + 3;
  if (left + w > vw - 84) left = ax - w - 3;
  if (top + h > vh - 8) top = ay - h - 3;
  left = Math.max(4, Math.min(vw - 84 - w, left)); top = Math.max(4, Math.min(vh - h - 4, top));
  const close = `sendAction('menuClose',{},{relockPointer:true})`;
  const rows = entries.map((e, i) => {
    const pick = e?.a ? `sendAction('${esc(e.a)}',JSON.parse(this.dataset.d));${close}` : `sendAction('menuPick',{i:${i},n:${Number(m.n) || 0}},{relockPointer:true})`;
    const tgt = e.target ? ` <span style="color:${esc(e.lvl?.col ?? e.col ?? '#9be27a')}">${esc(e.target)}</span>` : '';
    const lvl = e.lvl ? ` <span style="color:${esc(e.lvl.col ?? '#9be27a')}">(level-${e.lvl.n | 0})</span>` : '';
    return `<div class="cm-row" data-d="${attr(e.d)}" onclick="event.stopPropagation();${pick}">${esc(e.verb)}${tgt}${lvl}</div>`;
  }).join('');
  return `<div id="cm-root" class="cm-root" onclick="if(event.target===this)${close}" oncontextmenu="event.preventDefault();if(event.target===this)${close}"><div class="cm-frame" style="position:absolute;left:${left | 0}px;top:${top | 0}px;width:${w}px;pointer-events:auto"><div class="cm-head" style="font:bold 15px Georgia,serif;color:#e8c46a;text-shadow:1px 1px 0 #000,-1px -1px 0 #000;padding:0 0 2px 10px">${esc(MENU.headline || 'Choose Option')}</div><div class="cm-rule"></div>${rows}<div class="cm-rule"></div><div class="cm-row" onclick="event.stopPropagation();${close}">Cancel</div></div></div>`;
}

export function menuHud(ctx, player) {
  try {
    trackRightPointer();
    const m = player?.state?.ctxMenu;
    if (!m || !Array.isArray(m.entries) || !m.entries.length) { active = null; return ''; }
    const entries = m.entries.slice(0, MENU.maxRows), rows = entries.map(segmentWidths);
    const vw = window.innerWidth, vh = window.innerHeight;
    const sc = Math.max(0.8, Math.min(1.5, vh / (ctx?.world?.engine?.ui?.referenceHeight || 1080)));
    const width = Math.min(MAX_W, Math.max(MIN_W, Math.max(textWidth(MENU.headline || 'Choose Option'), ...rows.map(rowWidth)) + PAD * 2 + BORDER * 2));
    const height = HEAD + (entries.length + 1) * ROW + BORDER * 2;
    const w = width * sc, h = height * sc, rail = 84;
    const hasWorldRay = Number.isFinite(m.tx) && Number.isFinite(m.ty);
    const atPtr = hasWorldRay;
    const th = Math.tan((m.fov ?? 72) * Math.PI / 360);
    const px = atPtr ? (m.tx / (th * vw / vh) + 1) * .5 * vw : vw * .5;
    const py = atPtr ? (1 - m.ty / th) * .5 * vh : vh * .5;
    // World input carries a camera ray, not DOM pixels. The page captured the
    // actual right-button location before that input crossed into the room.
    const now = Date.now();
    const recentRight = rightPointer && now - rightPointer.at < 10000 ? rightPointer : null;
    // Pointer position remains valid while the mouse is stationary; unlike a
    // click event, its last move may have happened well before the menu opens.
    const recentPointer = lastPointer;
    // A world menu includes tx/ty from the click ray. Its x/y may be default
    // zeroes from replicated state, so use the DOM's captured right-click point
    // first. Inventory/shop menus have x/y but no ray and keep their own anchor.
    const atCursor = Number.isFinite(m.x) && Number.isFinite(m.y);
    const isWorldMenu = m.worldMenu || hasWorldRay;
    const sameMenu = active?.m?.n === m.n;
    const worldCursor = isWorldMenu && (sameMenu && Number.isFinite(active.anchorX) && Number.isFinite(active.anchorY)
      ? { x: active.anchorX, y: active.anchorY }
      : recentRight ?? recentPointer);
    // Never use x/y for a world menu: absent DOM pointer events, these fields
    // can be replicated defaults at (0, 0). Snapshot the right-click location
    // once per menu so later pointer motion cannot drag an open menu around.
    const ax = isWorldMenu ? (worldCursor?.x ?? px) : atCursor ? m.x : px;
    const ay = isWorldMenu ? (worldCursor?.y ?? py) : atCursor ? m.y : py;
    let left = ax + 3, top = ay + 3;
    if (left + w > vw - rail) left = ax - w - 3;
    if (top + h > vh - 8) top = ay - h - 3;
    left = Math.max(4, Math.min(vw - rail - w, left)); top = Math.max(4, Math.min(vh - h - 4, top));
    // Keep one DOM canvas and one hover row for this menu nonce. The HUD is
    // rebuilt continuously; changing the id or resetting hover here detaches
    // the pointer from its row and makes the yellow highlight flicker.
    const id = `cm-canvas-${Number.isFinite(m.n) ? m.n : ++generation}`;
    if (kitOn(player)) { active = { id: 'kit', m, entries, rows, sc, width, height, hover: -1, anchorX: ax, anchorY: ay }; ensureStyle('cm-style', STYLE); return kitMenu(m, entries, ax, ay); }
    const hover = sameMenu ? active.hover : -1;
    active = { id, m, entries, rows, sc, width, height, hover, anchorX: ax, anchorY: ay };
    ensureStyle('cm-style', STYLE);
    const markup = `<div id="cm-root" class="cm-root" onclick="if(event.target===this)sendAction('menuClose',{},{relockPointer:true})" oncontextmenu="event.preventDefault();if(event.target===this)sendAction('menuClose',{},{relockPointer:true})"><canvas id="${id}" class="cm-pixel" width="${width}" height="${height}" style="left:${left | 0}px;top:${top | 0}px;width:${w}px;height:${h}px"></canvas></div>`;
    load().then(() => requestAnimationFrame(() => render(id)));
    return markup;
  } catch { return ''; }
}

// Kept for ui.js versions that still call the retired menu sound installer.
export function installMenuSound() {}
