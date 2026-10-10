// The OSRS side-panel frame (creator 2026-10-06: 1:1 with the reference): stone pillars, the body texture and both tab rows, drawn as ONE 246 x 336 <canvas> from ONE sheet
// (/cdn panel-sheet.png, cut from image A by ~/spawn/art/osrs-ui/panel/build_panel.py). Below the frame the sheet holds 14 bands of 246 x 37: the tab row with only
// tab i selected (red plate). Image A shows ONE selected tab (the backpack); the other 13 are that plate recoloured onto each tab's own icon (stone colour -> red
// r*.835, g*.31, b*.28, checked on 15 colours), middle tabs exact, the two end tabs' outer bulge approximated. Pure draw; clicks are buttons in osrs.js.
const SHEET = '/cdn/value.f738adb5046397513a6eb5c8253410b0c8d2aba303d0b0fd661341c7013f68de.png?data';
// frame geometry (frame px): body rect, tab rows (top y 1, bottom y 299, 37 tall), tab k x range (the end tabs carry an outer bulge)
export const PNL = { W: 246, H: 336, body: { x: 27, y: 37, w: 192, h: 262 }, topY: 1, botY: 299, rowH: 37, band0: 336 };
export const tabX = (k) => [k === 1 ? 0 : 6 + 33 * (k - 1), k === 7 ? 246 : 6 + 33 * k]; // k 1..7
let sheet = null, loading = null, model = { row: 'top', k: 4 }, gen = 0, wired = false;
function load() {
  if (loading) return loading;
  loading = new Promise((r) => { const i = new Image(); i.onload = () => { sheet = i; r(); }; i.onerror = () => { loading = null; r(); }; i.src = SHEET; });
  return loading;
}
function render() {
  const c = document.getElementById('ospc'); if (!c || !sheet) return;
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; c._d = gen;
  cx.clearRect(0, 0, PNL.W, PNL.H); cx.drawImage(sheet, 0, 0, PNL.W, PNL.H, 0, 0, PNL.W, PNL.H);
  if (!model.k) return;
  const [x0, x1] = tabX(model.k), band = (model.row === 'bot' ? 7 : 0) + model.k - 1, y = model.row === 'bot' ? PNL.botY : PNL.topY;
  cx.drawImage(sheet, x0, PNL.band0 + band * PNL.rowH, x1 - x0, PNL.rowH, x0, y, x1 - x0, PNL.rowH);
}
// m = { row: 'top'|'bot', k: 1..7 } = the selected tab, or { k: 0 } for none
export function osPanelFeed(m) {
  model = m; gen++;
  if (!wired) { wired = true; setInterval(() => { const c = document.getElementById('ospc'); if (c && c._d !== gen) render(); }, 250); } // the HUD patches in a fresh canvas on every repaint
  load().then(() => requestAnimationFrame(render));
}
