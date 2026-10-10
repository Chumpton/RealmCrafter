// OSRS hitsplat as pixel art: a 13x13 jagged burst (red for a hit, blue for a miss) with the damage in a 3x5 pixel font, all drawn as 1-unit squares
// with crisp edges so it reads pixelated at any size. Pure: returns SVG text.
const BURST = [
  '....#...#....',
  '.#..##.##..#.',
  '..#########..',
  '..#########..',
  '.###########.',
  '#############',
  '.###########.',
  '#############',
  '.###########.',
  '..#########..',
  '..##.###.##..',
  '.#..#...#..#.',
  '.....#.#.....',
];
const FONT = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111' };
const PAL = { hit: { fill: '#d92a1a', light: '#ff7a66', edge: '#3a0a06' }, miss: { fill: '#2f6fd6', light: '#8fb4ff', edge: '#0a1a44' } };
const W = 13, H = 13;
export function splatPixels(dmg) { // -> { w, h, rects: [{x, y, c}] } in draw order
  const kind = dmg > 0 ? 'hit' : 'miss', P = PAL[kind], on = new Set(), out = [];
  BURST.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') on.add(`${x},${y}`); }));
  const edge = new Set();
  for (const k of on) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = `${x + dx},${y + dy}`; if (!on.has(n)) edge.add(n); } }
  for (const k of edge) { const [x, y] = k.split(',').map(Number); out.push({ x, y, c: P.edge }); }
  for (const k of on) { const [x, y] = k.split(',').map(Number); out.push({ x, y, c: y <= 2 || (x <= 2 && y <= 5) ? P.light : P.fill }); }
  const s = String(Math.max(0, Math.min(999, dmg | 0))), tw = s.length * 4 - 1, x0 = Math.floor((W - tw) / 2), y0 = 4;
  [...s].forEach((d, i) => { const g = FONT[d]; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') { out.push({ x: x0 + i * 4 + c + 1, y: y0 + r + 1, c: '#000' }); } }); // shadow
  [...s].forEach((d, i) => { const g = FONT[d]; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') { out.push({ x: x0 + i * 4 + c, y: y0 + r, c: '#fff' }); } });
  return { w: W + 2, h: H + 2, rects: out, kind };
}
// attrs go on the <svg>; the pixels are shifted 1 unit so the edge ring fits. World use: width in metres + billboard; HUD use: width in px.
export function splatSvg(dmg, attrs) {
  const { w, h, rects } = splatPixels(dmg), byColor = new Map();
  for (const r of rects) { const k = r.c; (byColor.get(k) ?? byColor.set(k, []).get(k)).push(`M${r.x + 1} ${r.y + 1}h1v1h-1z`); }
  const paths = [...byColor].map(([c, d]) => `<path d='${d.join('')}' fill='${c}'/>`).join('');
  return `<svg viewBox='0 0 ${w} ${h}' ${attrs} shape-rendering='crispEdges' style='image-rendering:pixelated'>${paths}</svg>`;
}
