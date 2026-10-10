// The OSRS Combat Options tab (wiki "Attack style" window, 1:1 sprites): weapon name and Combat Lvl on top, up to four 71 x 47 style buttons (stone, red when selected) with the
// style's own icon, the Auto Retaliate button (red when on) and the weapon category. Sheet: ~/spawn/art/osrs-ui/panel/build_combat.py. The den has no special-attack weapons,
// so the Special Attack bar is not drawn. model: { name, lvl, styles: [{ id, name, icon, on }], autoRet, category, spell }
import { osText, osTextC } from './ostext.js';
const SHEET = '/cdn/value.452673468fd7cf7504342faef20d18163d8498f43302ecec5b2fb1f7f58d867f.png?data';
const S = {"plateU": [0, 262], "plateS": [72, 262], "arU": [0, 313], "arS": [0, 361]};
// icon: [sx, sy, w, h, ox, oy] in the sheet strip (ox, oy = the icon's place on its button)
const ICON = {"smash": [0, 409, 49, 23, 13, 6], "chop": [51, 409, 49, 19, 13, 8], "slash": [102, 409, 49, 23, 13, 6], "block": [153, 409, 49, 23, 13, 5], "lunge": [204, 409, 49, 20, 13, 7], "accurate": [255, 409, 49, 24, 13, 5], "rapid": [306, 409, 49, 24, 13, 5], "longrange": [357, 409, 49, 24, 13, 5]};
// the den's style ids -> the icon the wiki shows for the nearest OSRS style
const ART = { chop: 'chop', hack: 'chop', slash: 'slash', swipe: 'slash', kick: 'slash', smash: 'smash', pummel: 'smash', pound: 'smash', bash: 'smash', punch: 'smash', block: 'block', focus: 'block',
  lunge: 'lunge', stab: 'lunge', spike: 'lunge', accurate: 'accurate', rapid: 'rapid', longrange: 'longrange' };
const ORANGE = '#ff981f', BTN = [[21, 46], [100, 46], [21, 100], [100, 100]], AR = { x: 20, y: 154, w: 151, h: 44 };
export default {
  sheet: SHEET,
  draw(cx, img, m) {
    cx.drawImage(img, 0, 0, 192, 262, 0, 0, 192, 262);
    osTextC(cx, 'bold', m.name, 105, 5, ORANGE); osTextC(cx, 'plain', `Combat Lvl: ${m.lvl}`, 104, 23, ORANGE);
    m.styles.slice(0, 4).forEach((st, i) => {
      const [x, y] = BTN[i], p = st.on ? S.plateS : S.plateU, ic = ICON[ART[st.id]];
      cx.drawImage(img, p[0], p[1], 71, 47, x, y, 71, 47);
      if (ic) cx.drawImage(img, ic[0], ic[1], ic[2], ic[3], x + ic[4], y + ic[5], ic[2], ic[3]);
      osTextC(cx, 'plain', st.name, x + 35, y + (ic ? 27 : 14), ORANGE);
    });
    const a = m.autoRet ? S.arS : S.arU;
    cx.drawImage(img, a[0], a[1], AR.w, AR.h, AR.x, AR.y, AR.w, AR.h);
    osTextC(cx, 'plain', 'Auto Retaliate', 112, 160, ORANGE); osTextC(cx, 'plain', m.autoRet ? '(On)' : '(Off)', 112, 174, ORANGE);
    if (m.spell) osTextC(cx, 'plain', `Spell: ${m.spell}`, 96, 208, ORANGE);
    osTextC(cx, 'plain', `Category: ${m.category}`, 95, 236, ORANGE);
  },
  hits: (m) => [...m.styles.slice(0, 4).map((st, i) => ({ x: BTN[i][0], y: BTN[i][1], w: 71, h: 47, title: st.name, js: `sendAction('cbStyle',{id:'${st.id}'})` })),
    { x: AR.x, y: AR.y, w: AR.w, h: AR.h, title: 'Auto Retaliate', js: "sendAction('cbAutoRet')" }],
};
