// Host for the OSRS side-panel bodies (creator 2026-10-06: 1:1 with the wiki's window images). One 192 x 262 <canvas> per pane, drawn from the pane's own sheet
// (the wiki window's inner body, dynamic text removed) plus live numbers in the shared pixel fonts (ostext.js); clicks are plain buttons over the canvas.
// A pane = { sheet: cdn url, load(img), draw(cx, img, model), hits(model) -> [{ x, y, w, h, title, js }] }.
import { osFontsLoad } from './ostext.js';
export const PANE = { W: 192, H: 262 };
const sheets = {};
let cur = null, gen = 0, wired = false;
const getSheet = (url) => (sheets[url] ??= new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => { delete sheets[url]; r(null); }; i.src = url; }));
function render() {
  const c = document.getElementById('ospn'); if (!c || !cur) return;
  const { p, model, img } = cur; if (!img) return;
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; c._d = gen;
  cx.clearRect(0, 0, PANE.W, PANE.H); p.draw(cx, img, model);
}
// returns the pane's HTML (canvas + hit buttons) and starts the draw
export function osPane(p, model) {
  const g = ++gen; cur = { p, model, img: null };
  if (typeof document !== 'undefined') {
    if (!wired) { wired = true; setInterval(() => { const c = document.getElementById('ospn'); if (c && c._d !== gen) render(); }, 250); } // the HUD patches in a fresh canvas on every repaint
    Promise.all([osFontsLoad(), getSheet(p.sheet)]).then(([, img]) => { if (g === gen) { cur.img = img; requestAnimationFrame(render); } });
  }
  const b = p.hits(model).map((h) => `<button class="ohit" title="${String(h.title).replace(/"/g, '&quot;')}" onclick="${h.js}"${h.ctx ? ` oncontextmenu="${h.ctx};return false"` : ''} style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px"></button>`).join('');
  return `<canvas id="ospn" width="${PANE.W}" height="${PANE.H}"></canvas>${b}`;
}
