// The OSRS chat box, pixel-exact (creator 2026-10-06: "1:1 identical copy"). Claude's kit (docs/board/chatbox/LAYOUT.md):
// bg = his screenshot with the text lifted out, the RuneLite pixel font as glyph sheets, exact pens. Page-side only: osChat
// hands rows here, this draws one <canvas>. Wheel, arrows, thumb drag, track paging, tabs. Lines come from place.state.chatLog.
const SRC = { bg: '/cdn/value.1d0116480b371fe4fd1a18b848658083bd0c52d33d106442c6373643959e3a2b.png?data', plain: '/cdn/value.f107bd4b9871595ce1fdfdcb7cbff80827e2504b81011c08f3cf998bc1e9ceea.png?data', small: '/cdn/value.0154288864590d803ab996383223b14578f8dd247896b17d0e2253a7c398e053.png?data' };
const ADV = {"small":[3,3,5,9,7,11,7,4,3,3,7,7,4,5,3,4,7,4,7,6,5,6,7,6,7,7,3,4,6,6,6,6,10,7,7,7,7,5,5,7,7,3,6,6,5,8,7,7,7,7,7,7,5,7,7,9,7,5,7,4,4,4,7,7,4,6,6,5,6,6,5,6,6,3,5,5,3,7,6,6,6,6,5,6,4,6,7,7,7,6,6,3,3,3,8],"plain":[3,3,5,13,8,11,11,4,4,4,9,7,4,6,3,6,8,6,8,7,7,7,8,7,8,8,3,4,6,8,6,8,13,8,7,7,7,6,6,8,7,3,7,7,6,9,8,8,7,8,7,7,5,8,7,9,7,7,7,5,6,5,8,9,4,7,7,6,7,7,6,7,7,3,6,6,3,9,7,7,7,7,5,7,5,7,7,7,7,7,7,5,3,5,11]};
const W = 519, H = 165, CW = 14, CH = 22, LINE = 16, BASE_Y = 104, TX0 = 10, CLIP = { x: 7, y: 7, w: 489, h: 113 }, WRAP = 482, VIS = 7;
const ART_LIFT = 2; // a q/p tail ends 16 px below its line's top, a capital W starts 2 px into its cell, lines 16 apart: lifting an art line 2 px makes the W's arms meet the tails (creator 2026-10-06)
const BLACK = '#000000', BLUE = '#0000ff', WHITE = '#ffffff', GREEN = '#00ff00';
export const OS_CANVAS_TABS = [['all', 'All', null], ['game', 'Game', 'On'], ['pub', 'Public', 'On'], ['priv', 'Private', 'On'], ['chan', 'Channel', 'On'], ['clan', 'Clan', 'On'], ['trade', 'Trade', 'On']];
const imgs = {}, tint = {};
let gen = 0, loading = null, msgs = [], tab = 0, label = 'Player name:', off = 0, drag = null, wired = false, lastG = { y: 23, h: 80 }, lastMax = 0, pickTab = null, report = null;
function load() {
  if (loading) return loading;
  loading = Promise.all(Object.entries(SRC).map(([k, src]) => new Promise((r) => { const i = new Image(); i.onload = () => { imgs[k] = i; r(); }; i.onerror = () => r(); i.src = src; })));
  return loading;
}
function tinted(font, color) {
  const key = font + color; if (tint[key]) return tint[key];
  const c = document.createElement('canvas'); c.width = 1330; c.height = 22; const g = c.getContext('2d');
  g.drawImage(imgs[font], 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 1330, 22);
  return (tint[key] = c);
}
const gi = (ch) => { const i = ch.charCodeAt(0) - 32; return i >= 0 && i < 95 ? i : 31; };
function width(font, s) { let w = 0; for (const ch of s) w += ADV[font][gi(ch)]; return w; }
function draw(cx, font, s, x, y, color, shadow) {
  if (shadow) draw(cx, font, s, x + 1, y + 1, BLACK, false);
  const t = tinted(font, color); let pen = x;
  for (const ch of s) { const i = gi(ch); cx.drawImage(t, i * CW, 0, CW, CH, pen, y, CW, CH); pen += ADV[font][i]; }
}
function lines() {
  const out = [];
  for (const m of msgs) {
    let cur = [], pen = 0; const first = out.length;
    for (const [seg, col] of m) for (const w of String(seg).split(/(?<= )/)) {
      const ww = width('plain', w);
      if (ww > WRAP) { // a word wider than a whole line starts where the name ends and breaks at the edge, then goes on below (as OSRS does)
        let chunk = '';
        for (const ch of w) { const a = ADV.plain[gi(ch)]; if (pen + a > WRAP) { if (chunk) cur.push([chunk, col]); out.push(cur); cur = []; pen = 0; chunk = ''; } chunk += ch; pen += a; }
        if (chunk) cur.push([chunk, col]); continue;
      }
      if (pen + ww > WRAP && cur.length) { out.push(cur); cur = []; pen = 0; }
      cur.push([w, col]); pen += ww;
    }
    out.push(cur);
    if (m.art && out[first]) out[first].art = true; // chat art: drawn ART_LIFT px up, flush under the line above
  }
  return out;
}
export const osLines = () => lines(); // the wrapped lines of the rows last fed (tests)
function cv() { return document.getElementById('oscv'); }
function render() {
  const c = cv(); if (!c || !imgs.bg || !imgs.plain || !imgs.small) return;
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; c._osDrawn = gen;
  const L = lines(), maxOff = Math.max(0, L.length - VIS); off = Math.min(Math.max(off, 0), maxOff); lastMax = maxOff;
  cx.clearRect(0, 0, W, H); cx.drawImage(imgs.bg, 0, 0);
  for (let i = 0; i < 7; i++) if ((i === 0) !== (i === tab)) cx.drawImage(imgs.bg, (i === tab ? 3 : 65) + 3, 142, 53, 23, 3 + 62 * i + 3, 142, 53, 23);
  OS_CANVAS_TABS.forEach(([, n, s], i) => {
    const m = i === 0 ? 30.5 : 93 + 62 * (i - 1), w = width('small', n);
    if (s) { draw(cx, 'small', n, Math.round(m - w / 2), 142, WHITE, true); draw(cx, 'small', s, Math.floor(m - width('small', s) / 2), 152, GREEN, true); }
    else draw(cx, 'small', n, Math.round(m - w / 2), 147, WHITE, true);
  });
  draw(cx, 'small', 'Report', 459, 147, WHITE, true);
  cx.save(); cx.beginPath(); cx.rect(CLIP.x, CLIP.y, CLIP.w, CLIP.h); cx.clip();
  const end = L.length - off;
  for (let k = 0; k < VIS + 1; k++) { const idx = end - 1 - k; if (idx < 0) break; let pen = TX0; for (const [t, col] of L[idx]) { draw(cx, 'plain', t, pen, BASE_Y - LINE * k - (L[idx].art ? ART_LIFT : 0), col, false); pen += width('plain', t); } }
  cx.restore();
  inputRow(cx);
  // the thumb: bg rows 23-24 top, 25-99 body resampled, 100-102 bottom
  cx.fillStyle = '#000001'; cx.fillRect(496, 21, 16, 84);
  const n = L.length, h = n <= VIS ? 80 : Math.max(14, Math.round(80 * VIS / n)), y = 23 + (maxOff ? Math.round((80 - h) * (1 - off / maxOff)) : 0);
  lastG = { y, h };
  cx.drawImage(imgs.bg, 497, 23, 14, 2, 497, y, 14, 2);
  const body = h - 5; for (let r = 0; r < body; r++) cx.drawImage(imgs.bg, 497, 25 + Math.min(74, Math.floor(r * 75 / body)), 14, 1, 497, y + 2 + r, 14, 1);
  cx.drawImage(imgs.bg, 497, 100, 14, 3, 497, y + h - 3, 14, 3);
}
// the input row (y 120 cell, rows 120-141 of the bg; nothing else paints there): idle "Name: Press Enter to Chat..." in blue,
// typing "Name: text*" with the * blinking at 600 ms; a long line drops its oldest chars so the * stays in the box
const ROW = { y: 120, h: 22, right: 506 }, IDLE = 'Press Enter to Chat...', BLINK_MS = 600;
let inText = '', inTyping = false, starOn = true, blink = null;
function inputRow(cx) {
  const x0 = TX0; // 2026-10-09 campton: no name before the chat line
  if (!inTyping && !inText) { draw(cx, 'plain', IDLE, x0, ROW.y, BLUE, false); return; }
  let t = inText; const room = ROW.right - x0 - width('plain', '*');
  while (t.length && width('plain', t) > room) t = t.slice(1);
  draw(cx, 'plain', t, x0, ROW.y, BLUE, false);
  if (!inTyping || starOn) draw(cx, 'plain', '*', x0 + width('plain', t), ROW.y, BLUE, false);
}
function paintRow() {
  const c = cv(); if (!c || !imgs.bg || !imgs.plain || c._osDrawn !== gen) return; // a fresh canvas wants the whole box: the 250 ms check draws it
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false;
  cx.drawImage(imgs.bg, 0, ROW.y, W, ROW.h, 0, ROW.y, W, ROW.h); inputRow(cx);
}
export function setOsChatInput(text, typing) {
  const t = String(text ?? ''), on = !!typing;
  if (t === inText && on === inTyping) return;
  inText = t; inTyping = on; starOn = true;
  try { const k = document.getElementById('osch-kin'); if (k) k.textContent = kitInputText(); } catch (e) {} // 3rd Person: the live DOM input row
  if (on && !blink) blink = setInterval(() => { starOn = !starOn; paintRow(); }, BLINK_MS);
  else if (!on && blink) { clearInterval(blink); blink = null; }
  paintRow();
}
function pos(e) { const c = cv(), r = c.getBoundingClientRect(); return { x: Math.floor((e.clientX - r.left) * W / r.width), y: Math.floor((e.clientY - r.top) * H / r.height) }; }
function wire() {
  if (wired) return; wired = true;
  // the HUD may patch in a fresh <canvas> between feeds: a cheap check redraws it (one property read, 4×/s)
  setInterval(() => { const c = cv(); if (c && c._osDrawn !== gen) render(); }, 250);
  document.addEventListener('wheel', (e) => { if (e.target?.id !== 'oscv') return; e.preventDefault(); e.stopPropagation(); off += e.deltaY < 0 ? 1 : -1; render(); }, { passive: false, capture: true });
  document.addEventListener('mousedown', (e) => {
    if (e.target?.id !== 'oscv') return; e.stopPropagation(); const p = pos(e);
    if (p.x >= 496 && p.x <= 511 && p.y >= 6 && p.y <= 119) {
      if (p.y <= 20) off++; else if (p.y >= 105) off--;
      else if (p.y >= lastG.y && p.y < lastG.y + lastG.h) drag = { y: p.y, off }; else off += p.y < lastG.y ? VIS : -VIS;
      render(); return;
    }
    if (p.y >= 142 && p.y <= 164) {
      if (p.x >= 437) { report?.(); return; }
      const i = Math.floor((p.x - 3) / 62); if (i >= 0 && i < 7 && i !== tab) { tab = i; off = 0; pickTab?.(OS_CANVAS_TABS[i][0]); render(); }
    }
  }, true);
  document.addEventListener('mousemove', (e) => { if (!drag) return; const p = pos(e), span = 80 - lastG.h; if (span <= 0 || !lastMax) return; off = Math.round(drag.off - (p.y - drag.y) * lastMax / span); render(); });
  document.addEventListener('mouseup', () => { drag = null; });
}
// rows: [[text, colour], …] per message, oldest first
export function osCanvasFeed(rows, tabId, who, onPick, onReport) {
  gen++; msgs = rows; label = (who || 'Player name') + ':'; pickTab = onPick; report = onReport;
  const t = OS_CANVAS_TABS.findIndex((r) => r[0] === tabId); tab = t < 0 ? 0 : t;
  wire(); load().then(() => requestAnimationFrame(render));
}
// trade-scope lines are the creator's own talk (Spawn chat, Trade tab): plain black text like OSRS game text, not the purple of a trade request (creator 2026-10-06)
export const OS_INK = { black: BLACK, blue: BLUE, trade: BLACK, savi: '#7f0000', bot: BLACK }; // bot: Barrens chatter names, black like players (creator 2026-10-06)
// 3rd Person (gold kit, ui/hud/osrs.js): the input row as text, from the same state the canvas row draws
export function kitInputText() { return !inTyping && !inText ? IDLE : inText + (inTyping ? '|' : ''); }
