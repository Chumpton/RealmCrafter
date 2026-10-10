// The OSRS Skills tab (wiki "Skills" window, 1:1): 3 columns of 60 x 29 stone cells (pitch 63 x 30), each with the skill's own icon, the current level top and the base level
// below, right-aligned in the small font (yellow, black shadow), and the "Total level" bar under the last row. Sheet: ~/spawn/art/osrs-ui/panel/build_skills.py.
// model: { cells: [{ id, name, lv, base, on }], total }  (up to 18 cells; a missing cell stays an empty stone plate)
import { osText, osTextC, osTextW } from './ostext.js';
const SHEET = '/cdn/value.c4cf9c56e770645f57cedc9a5d814494e0c9810690a5c090a13d8ef5cf4eea6f.png?data';
// icon: [sx, sy, w, h, ox, oy] in the sheet strip (ox, oy = the icon's place inside a cell); the den's ids -> wiki names
const ICON = { attack: [0, 262, 25, 25, 2, 3], hitpoints: [26, 262, 23, 20, 4, 6], mining: [50, 262, 23, 23, 5, 4], strength: [74, 262, 16, 20, 6, 5], smithing: [117, 262, 19, 19, 7, 6],
  defence: [137, 262, 17, 19, 6, 7], fishing: [181, 262, 24, 23, 4, 4], ranged: [206, 262, 23, 23, 3, 5], cooking: [256, 262, 19, 21, 8, 5], prayer: [276, 262, 23, 23, 4, 4],
  crafting: [300, 262, 24, 22, 4, 5], firemaking: [325, 262, 23, 23, 5, 4], magic: [349, 262, 25, 23, 3, 4], fletching: [375, 262, 25, 25, 4, 3], woodcutting: [401, 262, 18, 22, 8, 5],
  running: [420, 262, 16, 13, 6, 9], jumping: [437, 262, 14, 12, 7, 9] };
// OSRS reading order of the skills the den has; den-only skills follow
export const SKILL_ORDER = ['attack', 'hitpoints', 'mining', 'strength', 'smithing', 'defence', 'fishing', 'ranged', 'cooking', 'prayer', 'crafting', 'firemaking', 'magic', 'fletching', 'woodcutting', 'running', 'jumping'];
const CX = 3, CY = 3, PX = 63, PY = 30, CW = 60, CH = 29, YEL = '#ffff00', BAR = { x: 3, y: 187, w: 186, h: 20 };
const cellXY = (i) => [CX + PX * (i % 3), CY + PY * Math.floor(i / 3)];
export default {
  sheet: SHEET,
  draw(cx, img, m) {
    cx.drawImage(img, 0, 0, 192, 262, 0, 0, 192, 262);
    m.cells.forEach((c, i) => {
      const [x, y] = cellXY(i), ic = ICON[c.id];
      if (ic) cx.drawImage(img, ic[0], ic[1], ic[2], ic[3], x + ic[4], y + ic[5], ic[2], ic[3]);
      if (c.on) { cx.strokeStyle = '#ff981f'; cx.lineWidth = 1; cx.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1); } // the tracked skill (XP counter)
      const a = String(c.lv), b = String(c.base);
      osText(cx, 'small', a, x + 44 - sw(a), y + 3, YEL); osText(cx, 'small', b, x + 56 - sw(b), y + 15, YEL);
    });
    osTextC(cx, 'bold', `Total level: ${m.total}`, BAR.x + BAR.w / 2, BAR.y + 1, YEL);
  },
  hits: (m) => m.cells.map((c, i) => { const [x, y] = cellXY(i); return { x, y, w: CW, h: CH, title: `${c.on ? 'Unpin' : 'Track'} ${c.name}`, js: `hudTrack('${c.on ? '' : c.id}')` }; }),
};
const sw = (s) => osTextW('small', s);
