// Shared OSRS pixel-font text for the HUD canvases (one glyph sheet per font, white on transparent, 95 glyphs of 14 x 22 cells; ASCII 32..126, advance per glyph, no kerning).
// plain = the chat font, bold = the hover / menu font, small = digits and tab labels. Sheets live on the CDN (the repo refuses PNG bytes).
const SRC = { plain: '/cdn/value.f107bd4b9871595ce1fdfdcb7cbff80827e2504b81011c08f3cf998bc1e9ceea.png?data', bold: '/cdn/value.460c9a5524c3ee1b1e39b3aef88601f51340f3b2c4f25e81fbba1772e812e95f.png?data',
  small: '/cdn/value.0154288864590d803ab996383223b14578f8dd247896b17d0e2253a7c398e053.png?data' };
const ADV = { plain: [3, 3, 5, 13, 8, 11, 11, 4, 4, 4, 9, 7, 4, 6, 3, 6, 8, 6, 8, 7, 7, 7, 8, 7, 8, 8, 3, 4, 6, 8, 6, 8, 13, 8, 7, 7, 7, 6, 6, 8, 7, 3, 7, 7, 6, 9, 8, 8, 7, 8, 7, 7, 5, 8, 7, 9, 7, 7, 7, 5, 6, 5, 8, 9, 4, 7, 7, 6, 7, 7, 6, 7, 7, 3, 6, 6, 3, 9, 7, 7, 7, 7, 5, 7, 5, 7, 7, 7, 7, 7, 7, 5, 3, 5, 11], small: [3, 3, 5, 9, 7, 11, 7, 4, 3, 3, 7, 7, 4, 5, 3, 4, 7, 4, 7, 6, 5, 6, 7, 6, 7, 7, 3, 4, 6, 6, 6, 6, 10, 7, 7, 7, 7, 5, 5, 7, 7, 3, 6, 6, 5, 8, 7, 7, 7, 7, 7, 7, 5, 7, 7, 9, 7, 5, 7, 4, 4, 4, 7, 7, 4, 6, 6, 5, 6, 6, 5, 6, 6, 3, 5, 5, 3, 7, 6, 6, 6, 6, 5, 6, 4, 6, 7, 7, 7, 6, 6, 3, 3, 3, 8] };
ADV.bold = ADV.plain.map((v, i) => v + 1); ADV.bold[87 - 32] += 1; // bold is one wider per glyph, 'w' two
const imgs = {}, tint = {};
let loading = null;
export function osFontsLoad() {
  if (!loading) loading = Promise.all(Object.entries(SRC).map(([k, src]) => new Promise((r) => { const i = new Image(); i.onload = () => { imgs[k] = i; r(); }; i.onerror = () => r(); i.src = src; }))).then(() => { if (Object.keys(imgs).length < 3) loading = null; });
  return loading;
}
const gi = (ch) => { const i = ch.charCodeAt(0) - 32; return i >= 0 && i < 95 ? i : 31; };
function tinted(f, col) {
  const k = f + col; if (tint[k]) return tint[k];
  const c = document.createElement('canvas'); c.width = 1330; c.height = 22; const g = c.getContext('2d');
  g.drawImage(imgs[f], 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 1330, 22); return (tint[k] = c);
}
export const osTextW = (f, s) => { let w = 0; for (const ch of String(s)) w += ADV[f][gi(ch)]; return w; };
// draws s with its glyph cell's top-left at (x, y); returns the pen x after it. shadow = black copy one down-right (OSRS default)
export function osText(cx, f, s, x, y, col = '#ffffff', shadow = true) {
  if (!imgs[f]) return x;
  s = String(s); if (shadow) osText(cx, f, s, x + 1, y + 1, '#000000', false);
  const t = tinted(f, col); let pen = x;
  for (const ch of s) { const i = gi(ch); cx.drawImage(t, i * 14, 0, 14, 22, pen, y, 14, 22); pen += ADV[f][i]; }
  return pen;
}
export const osTextC = (cx, f, s, cxm, y, col, shadow) => osText(cx, f, s, Math.floor(cxm - osTextW(f, s) / 2), y, col, shadow); // centred on cxm
