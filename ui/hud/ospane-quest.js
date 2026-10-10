// The OSRS Quest List tab (wiki window, 1:1 look): the dark list box with its scroll bar is the sheet; quest names are drawn in the plain font in OSRS colours
// (red = not started, yellow = in progress, green = done) under orange letter headings, "Completed: x/N" below. The den has no quest points, so that line is not drawn.
// model: { quests: [{ id, title, st: 'none' | 'active' | 'done', tip }], done, total }
import { osText, osTextC, osTextW } from './ostext.js';
const SHEET = '/cdn/value.46e693e5e9d2ce3d3ab81c239653616919b4888431454a630ba96f2abab3772b.png?data';
const COL = { none: '#ff0000', active: '#ffff00', done: '#0dc10d' }, ORANGE = '#ff981f', X = 10, Y0 = 46, ROW = 16, MAXW = 152, BOX = { y: 47, h: 172 };
function wrap(s) { // greedy word wrap to the list width
  const out = []; let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (osTextW('plain', t) > MAXW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function layout(m) { // [{ y, text, col, q? }]
  const rows = []; let y = Y0, last = '';
  [...m.quests].sort((a, b) => a.title.localeCompare(b.title)).forEach((q) => {
    const L = q.title[0].toUpperCase();
    if (L !== last) { last = L; rows.push({ y, text: L, col: ORANGE, head: true }); y += ROW; }
    const ls = wrap(q.title); ls.forEach((t, i) => { rows.push({ y, text: t, col: COL[q.st] ?? COL.none, q: i === 0 ? q : null, h: ls.length }); y += ROW; });
  });
  return rows;
}
export default {
  sheet: SHEET,
  draw(cx, img, m) {
    cx.drawImage(img, 0, 0, 192, 262, 0, 0, 192, 262);
    osTextC(cx, 'bold', 'Quest List', 96, 20, ORANGE);
    cx.save(); cx.beginPath(); cx.rect(6, BOX.y, 158, BOX.h); cx.clip();
    for (const r of layout(m)) osText(cx, r.head ? 'bold' : 'plain', r.text, X, r.y, r.col);
    cx.restore();
    osText(cx, 'plain', `Completed: ${m.done}/${m.total}`, 8, 230, ORANGE);
  },
  hits: (m) => layout(m).filter((r) => r.q).map((r) => ({ x: 6, y: r.y + 3, w: 158, h: ROW * r.h, title: r.q.tip, js: '' })).filter((h) => h.y < BOX.y + BOX.h),
};
