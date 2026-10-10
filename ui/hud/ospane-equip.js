// The OSRS Worn Equipment tab (wiki window, 1:1): the empty silhouettes, connectors and the four buttons are the sheet (the window image itself); a worn item is drawn
// over its 32 x 32 slot, a stack count (ammo) in the small yellow font. Buttons (art order): Equipment Stats, supplies (the money bag), Character sheet (the skull), Call follower (the whistle).
// model: { slots: [{ slot, x, y, title, js, ctx, item?: { color, glyph }, count? }], buttons: [{ x, w, title, js }] }
import { osText, osTextC } from './ostext.js';
const SHEET = '/cdn/value.a85bb2673f284ff22f973bd13bca789559a6bed4bbd2ff2f8af6125fb6e2cb11.png?data';
// slot -> inner 32 x 32 plate (pane px), measured from the wiki window
export const EQ_AT = { head: [80, 7], cape: [39, 46], neck: [80, 46], ammo: [121, 46], weapon: [24, 85], body: [80, 85], shield: [136, 85], legs: [80, 125], hands: [24, 165], feet: [80, 165], ring: [136, 165] };
export const EQ_BUTTONS = [[6, 42], [53, 40], [94, 44], [143, 40]].map(([x, w]) => ({ x, w, y: 209, h: 44 }));
export default {
  sheet: SHEET,
  draw(cx, img, m) {
    cx.drawImage(img, 0, 0, 192, 262, 0, 0, 192, 262);
    for (const s of m.slots) {
      if (!s.item) continue;
      const x = s.x + 5, y = s.y + 8; // a 22 x 16 badge, centred on the plate (the den's items have no art yet)
      cx.fillStyle = '#000001'; cx.fillRect(x - 1, y - 1, 24, 18); cx.fillStyle = s.item.color || '#888888'; cx.fillRect(x, y, 22, 16);
      osTextC(cx, 'small', s.item.glyph, x + 11, y - 3, '#ffffff');
      if (s.count != null) osText(cx, 'small', String(s.count), s.x + 1, s.y - 1, '#ffff00');
    }
  },
  hits: (m) => [...m.slots.map((s) => ({ x: s.x - 2, y: s.y - 2, w: 36, h: 36, title: s.title, js: s.js, ctx: s.ctx })), ...m.buttons.map((b) => ({ x: b.x, y: 209, w: b.w, h: 44, title: b.title, js: b.js }))],
};
