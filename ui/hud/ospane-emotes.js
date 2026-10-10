// The OSRS Emotes tab (wiki window, 1:1 look): the emotes as little full-body figures, 4 per row (column pitch 44, row pitch 49), the window's own scroll bar on the right.
// Figures are the wiki's emote icons for the OSRS emote nearest each of the den's own (Chicken = Flap, Metal = Headbang, Pint = Jig ...); the tooltip names the real one.
// model: { emotes: [{ id, name }] }
const SHEET = '/cdn/value.d30eed54e33b3582d1b41ae81c087687d26094cde7d70b78ef982f83b7c1734b.png?data';
const POS = {"wave": [0, 262, 31, 46], "bow": [32, 262, 28, 39], "cheer": [61, 262, 34, 46], "clap": [96, 262, 27, 46], "laugh": [124, 262, 24, 46], "cry": [149, 262, 30, 45], "dance": [180, 262, 30, 46], "jig": [211, 262, 40, 44], "salute": [252, 262, 26, 46], "point": [279, 262, 27, 46], "yes": [307, 262, 24, 46], "no": [332, 262, 24, 46], "shrug": [357, 262, 30, 46], "sit": [388, 262, 28, 46], "metal": [417, 262, 37, 46], "smoke": [455, 262, 27, 46], "pint": [483, 262, 29, 46], "fart": [513, 262, 34, 46]};   // emote id -> [sx, sy, w, h]
const X0 = 25, Y0 = 8, PX = 44, PY = 49;
const at = (i) => [X0 + PX * (i % 4), Y0 + PY * Math.floor(i / 4)];
export default {
  sheet: SHEET,
  draw(cx, img, m) {
    cx.drawImage(img, 0, 0, 192, 262, 0, 0, 192, 262);
    m.emotes.forEach((e, i) => { const s = POS[e.id]; if (!s) return; const [x, y] = at(i); cx.drawImage(img, s[0], s[1], s[2], s[3], x - (s[2] >> 1), y + 46 - s[3], s[2], s[3]); });
  },
  hits: (m) => m.emotes.map((e, i) => { const [x, y] = at(i); return { x: x - 21, y: y - 2, w: 42, h: 48, title: e.name, js: `sendAction('emote',{id:'${e.id}'})` }; }),
};
