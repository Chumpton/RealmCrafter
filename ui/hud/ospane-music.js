// The OSRS Music Player tab (wiki window, 1:1 look): shuffle and next-track buttons, "Playing:" with the current song in cyan, the song list in the dark list box (green =
// you can pick it, red = only the den keeper can, cyan = playing). The den has one song for the whole place (the keeper's hand), so there is no locate, loop or filter button.
// model: { songs: [{ id, name, on }], cur, auto, keeper, next }
import { osText } from './ostext.js';
const SHEET = '/cdn/value.7dcfe8db010ba0b1754b859b27cc5c7f961a8407ac5c969563e2fa45c3c2b44f.png?data';
const ORANGE = '#ff981f', CYAN = '#3ce6e6', GREEN = '#0dc10d', RED = '#ff0000', X = 11, Y0 = 87, ROW = 16;
export default {
  sheet: SHEET,
  draw(cx, img, m) {
    cx.drawImage(img, 0, 0, 192, 262, 0, 0, 192, 262);
    if (m.auto) { cx.strokeStyle = '#ff981f'; cx.lineWidth = 1; cx.strokeRect(50.5, 6.5, 36, 25); }   // shuffle = Auto-Cycle is on
    osText(cx, 'plain', 'Playing:', 7, 36, ORANGE); osText(cx, 'plain', m.cur, 7, 56, CYAN);
    cx.save(); cx.beginPath(); cx.rect(9, 86, 156, 157); cx.clip();
    m.songs.forEach((s, i) => osText(cx, 'plain', s.name, X, Y0 + ROW * i, s.on ? CYAN : m.keeper ? GREEN : RED));
    cx.restore();
  },
  hits: (m) => [{ x: 50, y: 6, w: 37, h: 26, title: m.auto ? 'Auto-Cycle is on (a new track every dawn); click to pick a track' : 'Auto-Cycle: roll a new track every dawn', js: `sendAction('setSong',{id:'${m.auto ? 'turning' : 'auto'}'})` },
    { x: 148, y: 6, w: 37, h: 26, title: 'Next track', js: `sendAction('setSong',{id:'${m.next}'})` },
    ...m.songs.map((s, i) => ({ x: 9, y: Y0 + ROW * i + 3, w: 156, h: ROW, title: m.keeper ? `Play ${s.name}` : `${s.name}: only the den keeper picks the song`, js: `sendAction('setSong',{id:'${s.id}'})` }))],
};
