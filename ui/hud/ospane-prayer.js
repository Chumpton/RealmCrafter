// The OSRS Prayer tab (wiki window, 1:1 layout): the prayers in a 5-column grid of 37 px cells, each its own icon (a golden disc behind it while on, dimmed while its level is
// not reached), and the prayer points ("current / max") with the star at the bottom. The OSRS Filters button is not drawn: the den has no prayer filter.
// model: { prayers: [{ id, name, on, lock, tip }], pts, max, left }
import { osText } from './ostext.js';
const SHEET = '/cdn/value.9c51e71b14320faca6056af080b9b938959ecec42874cf6d8fc8d48afccfdd1a.png?data';
const POS = {"glow": [0, 262, 34, 34], "star": [35, 262, 23, 23], "thick-skin": [59, 262, 28, 30], "burst-of-strength": [88, 262, 25, 27], "clarity-of-thought": [114, 262, 28, 22], "sharp-eye": [143, 262, 28, 24], "mystic-will": [172, 262, 28, 26], "rock-skin": [201, 262, 28, 30], "superhuman-strength": [230, 262, 25, 27], "improved-reflexes": [256, 262, 28, 22], "rapid-restore": [285, 262, 28, 25], "rapid-heal": [314, 262, 28, 25], "protect-item": [343, 262, 30, 29], "hawk-eye": [374, 262, 28, 24], "mystic-lore": [403, 262, 28, 26], "steel-skin": [432, 262, 28, 30], "ultimate-strength": [461, 262, 25, 27], "incredible-reflexes": [487, 262, 28, 22], "protect-from-magic": [516, 262, 27, 27], "protect-from-missiles": [544, 262, 24, 24], "protect-from-melee": [569, 262, 30, 30], "eagle-eye": [600, 262, 28, 24], "mystic-might": [629, 262, 28, 26]};   // sprite -> [sx, sy, w, h]
const CELL = 37, X0 = 22, Y0 = 27;
const at = (i) => [X0 + CELL * (i % 5), Y0 + CELL * Math.floor(i / 5)];
export default {
  sheet: SHEET,
  draw(cx, img, m) {
    cx.drawImage(img, 0, 0, 192, 262, 0, 0, 192, 262);
    m.prayers.forEach((p, i) => {
      const [x, y] = at(i), s = POS[p.id], g = POS.glow;
      if (p.on) cx.drawImage(img, g[0], g[1], g[2], g[3], x - 17, y - 17, 34, 34);
      if (!s) return;
      cx.globalAlpha = p.lock ? 0.35 : 1; cx.drawImage(img, s[0], s[1], s[2], s[3], x - (s[2] >> 1), y - (s[3] >> 1), s[2], s[3]); cx.globalAlpha = 1;
    });
    const st = POS.star; cx.drawImage(img, st[0], st[1], st[2], st[3], 14, 234, st[2], st[3]);
    osText(cx, 'plain', `${m.pts} / ${m.max}`, 42, 236, '#ffffff');
  },
  hits: (m) => [...m.prayers.map((p, i) => { const [x, y] = at(i); return { x: x - 18, y: y - 18, w: 36, h: 36, title: p.tip, js: `sendAction('prayToggle',{id:'${p.id}'})` }; }),
    { x: 8, y: 230, w: 120, h: 30, title: m.left, js: '' }],
};
