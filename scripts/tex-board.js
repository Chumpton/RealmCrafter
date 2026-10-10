// ONE painter for every board face (BOARD-CLICK D4, lane W2). The JEV board's look (walnut backing, linen cards, number disc,
// title, body, chips, button row) from the card template in scripts/lib/data/board-style.js; slots laid out by the grid.
// params:  board=<id>                 which board (face size, slots, buttons from its style row)
//          d=<json>                   the cards, bake-once: [{ n, id, title, body, chips:[{k,text}], pic?, mine? }] or { c: [...] }
//                                     (omitted: the wearer's own state.cards: a LIVE run, 4 ms budget, fine for a few cards only)
//          off=<k>                    first card number shown minus one (paged boards: photo)
//          hover=<n>&hb=<BUTTON>      honey lift on card n, and its hovered button (the loupe uses it)
//          card=<n>&loupe=true        ONE card alone, full 1024 px, same drawing (the local loupe row wears this)
//          flip=false                 the plane's UVs read true unflipped (board planes run mirrored: default flip)
//          slots=<k>, w=<m>, h=<m>    override slot count / face metres;  demo=<k>  k fake cards (proof only)
// Pictures: card.pic (a /cdn/ or cdn/ url, or a scripts/tex- ref) draws through ctx.image() into the card's picture zone.
import { STYLE, col, mineVote, cardButtons, cardTemplate, gridOf } from './lib/data/board-style.js';
import { layoutOf } from './lib/board-kit.js';
import { boardById } from './lib/data/boards.js';
export const meta = { wrap: 'clamp', filter: 'linear' };
const S = STYLE, C = S.c;
function rr(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }
function wrap(g, text, maxW, lines) {
  if (lines <= 0) return [];
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' '), out = []; let cur = '', used = 0;
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); used += cur.split(' ').length; cur = w; if (out.length === lines) break; } }
  if (out.length < lines && cur) { out.push(cur); used += cur.split(' ').length; }
  if (used < words.length && out.length) { let l = out[out.length - 1]; while (l.length > 1 && g.measureText(l + '…').width > maxW) l = l.slice(0, -1); out[out.length - 1] = l + '…'; }
  return out;
}
const picOk = (u) => typeof u === 'string' && /^(\/cdn\/|cdn\/|scripts\/tex-)/.test(u);
function chip(g, x, y, h, px, c, right) {
  const st = S.chip[c.k] ?? S.chip.default, t = String(c.text ?? '');
  g.font = `700 ${px}px ${S.font}`;
  const w = g.measureText(t).width + h * 0.7, X = right ? x - w : x;
  g.fillStyle = col(st.bg); rr(g, X, y, w, h, h * 0.3); g.fill();
  if (st.dash) { g.setLineDash([h * 0.2, h * 0.16]); g.lineWidth = Math.max(1, h * 0.08); g.strokeStyle = C.dark; g.stroke(); g.setLineDash([]); }
  g.fillStyle = col(st.ink); g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(t, X + h * 0.35, y + h * 0.54);
  return right ? X - h * 0.25 : X + w + h * 0.25;
}
function button(g, x, y, w, h, f, name, hot) {
  const st = S.button[name] ?? S.button.OPEN, B = S.buttons, r = B.radius * f;
  g.fillStyle = C.dark; rr(g, x, y + B.drop * f, w, h, r); g.fill();
  g.fillStyle = col(st.bg); rr(g, x, y - (hot ? B.drop * f * 0.6 : 0), w, h, r); g.fill();
  g.lineWidth = Math.max(1, (hot ? 0.022 : 0.012) * f); g.strokeStyle = hot ? col(S.hover.color) : C.dark; g.stroke();
  if (hot) { g.globalAlpha = 0.18; g.fillStyle = '#fff'; g.fill(); g.globalAlpha = 1; }
  g.fillStyle = col(st.ink); g.font = `700 ${Math.max(6, Math.round(B.px * f))}px ${S.font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name, x + w / 2, y + h / 2 + 1 - (hot ? B.drop * f * 0.6 : 0)); g.textAlign = 'left';
}
// one card at L,T (px) sized w×h; c null = an empty slot. o = { buttons, hover, hb, ctx }
export function paintCard(g, c, L, T, w, h, o = {}) {
  const f = Math.min(h, w / 1.4), K = S.card, lift = o.hover ? S.hover.lift * f : 0;
  g.fillStyle = C.dark; rr(g, L, T + K.shadow * f, w, h, K.radius * f); g.fill();
  T -= lift;
  g.fillStyle = c ? col(K.fill) : col(K.emptyFill); rr(g, L, T, w, h, K.radius * f); g.fill();
  g.lineWidth = Math.max(1, K.stroke * f); g.strokeStyle = C.walnut; g.stroke();
  g.globalAlpha = c ? 0.09 : 0.06; g.fillStyle = c ? C.weave : C.dark;
  g.beginPath(); for (let k = 1; k <= K.weaveLines; k++) g.rect(L + 0.04 * w, T + (k / (K.weaveLines + 1)) * h, w * 0.92, Math.max(1, 0.006 * f)); g.fill(); // disjoint lines: one fill
  g.globalAlpha = 1; g.fillStyle = C.nail;
  const nn = 0.07 * f; for (const [ax, ay] of [[nn, nn], [w - nn, nn], [nn, h - nn], [w - nn, h - nn]]) { g.beginPath(); g.arc(L + ax, T + ay, Math.max(0.8, K.nail * f), 0, 6.283); g.fill(); }
  if (!c) return;
  const names = o.buttons ?? [], t = cardTemplate(w, h, names, { pic: picOk(c.pic), btns: o.btns }), X = (u) => L + u * w, Y = (v) => T + v * h;
  if (c.mine || o.hover) { g.lineWidth = Math.max(1.5, S.hover.width * f); g.strokeStyle = col(S.hover.color); const e = S.hover.width * f * 0.6; rr(g, L - e, T - e, w + 2 * e, h + 2 * e, K.radius * f + e); g.stroke(); }
  g.save(); rr(g, L, T, w, h, K.radius * f); g.clip();
  if (t.pic) { // the card's picture: cover-fit into its zone
    const px = X(t.pic.x), py = Y(t.pic.y), pw = t.pic.w * w, ph = t.pic.h * h;
    g.fillStyle = col(S.pic.bg); rr(g, px, py, pw, ph, 0.03 * f); g.fill();
    try { const im = o.ctx?.image?.(c.pic); if (im) { const iw = im.width || pw, ih = im.height || ph, k = Math.max(pw / iw, ph / ih), sw = pw / k, sh = ph / k;
      g.save(); rr(g, px, py, pw, ph, 0.03 * f); g.clip(); g.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, px, py, pw, ph); g.restore(); } } catch (e) { /* a missing picture keeps the slate */ }
  }
  // number disc
  const dx = X(t.disc.x), dy = Y(t.disc.y), dr = t.disc.r * h;
  g.fillStyle = 'rgba(40,24,12,.35)'; g.beginPath(); g.arc(dx, dy + dr * 0.12, dr, 0, 6.283); g.fill();
  g.fillStyle = col(S.disc.fill); g.beginPath(); g.arc(dx, dy, dr, 0, 6.283); g.fill();
  g.lineWidth = Math.max(1, 0.012 * f); g.strokeStyle = col(S.disc.rim); g.stroke();
  const ns = String(c.n ?? ''); g.fillStyle = col(S.disc.ink); g.font = `700 ${Math.max(6, Math.round(S.disc.px * f * (ns.length > 2 ? 0.75 : 1)))}px ${S.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ns, dx, dy + 1); g.textAlign = 'left';
  // header chips (id, kind, critical, tier, status), right-aligned
  const chips = Array.isArray(c.chips) ? c.chips : [], head = chips.filter((x) => S.head.kinds.includes(x.k)), row = chips.filter((x) => !S.head.kinds.includes(x.k));
  let hx = L + w - 0.045 * w; const hpx = Math.max(6, Math.round(S.head.px * f));
  for (const x of head) { if (hx < dx + dr * 1.6) break; hx = chip(g, hx, Y(t.head.y), t.head.h * h, hpx, x, true); }
  // title + body
  const tx = L + 0.045 * w, tw = w * 0.91, tpx = Math.max(6, Math.round(S.title.px * f));
  g.font = `700 ${tpx}px ${S.font}`; g.fillStyle = col(S.title.ink); g.textBaseline = 'top';
  wrap(g, c.title, tw, t.title.lines).forEach((line, k) => g.fillText(line, tx, Y(t.title.y) + k * tpx * S.title.lh));
  if (t.body.lines && c.body) { const bpx = Math.max(5, Math.round(S.body.px * f)); g.font = `${bpx}px ${S.font}`; g.fillStyle = col(S.body.ink);
    wrap(g, c.body, tw, t.body.lines).forEach((line, k) => g.fillText(line, tx, Y(t.body.y) + k * bpx * S.body.lh)); }
  // chip row
  let cx = L + 0.04 * w; const cpx = Math.max(5, Math.round(S.chips.px * f));
  for (const x of row) { if (cx > L + w * 0.9) break; cx = chip(g, cx, Y(t.chips.y), t.chips.h * h, cpx, x, false); }
  // wax stamp: the vote you cast, sealing
  const mv = mineVote(c);
  if (mv) { const st = S.stamp, sx = X(st.x), sy = Y(t.pic ? 0.3 : st.y), sr = st.r * f;
    g.save(); g.translate(sx, sy); g.rotate(st.rot * Math.PI / 180); g.globalAlpha = st.alpha;
    g.fillStyle = mv === 'YES' ? '#6f8a55' : C.rust; g.beginPath(); for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283, rr2 = sr * (k % 2 ? 0.92 : 1); g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); g.fill();
    g.lineWidth = Math.max(1, 0.01 * f); g.strokeStyle = C.cream; g.beginPath(); g.arc(0, 0, sr * 0.74, 0, 6.283); g.stroke();
    g.fillStyle = C.cream; g.font = `700 ${Math.max(6, Math.round(st.px * f))}px ${S.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(mv, 0, 1); g.restore(); g.textAlign = 'left'; }
  for (const b of t.buttons) button(g, X(b.x), Y(b.y), b.w * w, b.h * h, f, b.name, o.hover && o.hb === b.name);
  g.restore();
}
function demoCards(ctx, k, board) {
  const words = 'raven rune hearth loom birch shore mead knot oak lamp lake ember forge wool herring sail bench horn antler moss'.split(' ');
  const pick = () => words[(ctx.random() * words.length) | 0];
  return Array.from({ length: k }, (_, i) => ({ n: i + 1, id: 'D' + (100 + i), title: `${pick()} ${pick()} for the ${pick()} ${pick()}`,
    body: `A small ${pick()} by the ${pick()}, carved with a ${pick()} knot so visitors ${pick()} it twice and hear the ${pick()}.`,
    chips: board === 'huginn-board' ? [{ k: i % 7 ? 'tier' : 'tier1', text: 'T' + (1 + i % 3) }, { k: 'status', text: 'open' }, { k: 'id', text: 'x' + (i * 7 % 40) + ' z' + (i * 3 % 20) }]
      : [{ k: 'id', text: 'D' + (100 + i) }, { k: 'kind', text: pick() }, { k: i % 3 ? 'lean' : 'pass', text: `JEV ${7 + i % 5}/11 ${80 + i % 20}%` }, { k: 'yes', text: 'S ✓' }, { k: 'status', text: 'C ·' }],
    mine: i === 2 ? 'YES' : i === 8 ? 'NO' : undefined }));
}
export function texture(ctx) {
  const P = ctx.params ?? {}, row = S.boards[P.board] ?? {};
  const face = { w: +P.w || row.face?.w || 2, h: +P.h || row.face?.h || 1.5 }, slots = +P.slots || row.slots || 25, off = +P.off || 0;
  let cards = [];
  if (P.demo) cards = demoCards(ctx, +P.demo, P.board);
  else if (P.d) { try { const d = JSON.parse(P.d); cards = Array.isArray(d) ? d : d.c ?? []; } catch (e) { cards = []; } }
  else { try { cards = ctx.self?.state?.cards ?? []; } catch (e) { cards = []; } }
  const KB = boardById(P.board), L = KB && !P.slots && !P.w ? layoutOf(KB) : null; // the kit's layout = the click layout
  const rel = (cl) => { const cw = cl.card.u1 - cl.card.u0, ch = cl.card.v1 - cl.card.v0; return cl.buttons.map((b) => ({ name: b.name, x: (b.rect.u0 - cl.card.u0) / cw, y: (b.rect.v0 - cl.card.v0) / ch, w: (b.rect.u1 - b.rect.u0) / cw, h: (b.rect.v1 - b.rect.v0) / ch })); };
  const grid = gridOf(L ? KB.slots : slots, face), flip = P.flip !== false && S.flip, hover = +P.hover || 0;
  const btnsOf = (c) => cardButtons(c, row.buttons ?? []);
  if (P.loupe || P.card) { // ONE card, as large as the canvas allows, same drawing
    const n = +P.card || 1, c = cards.find((x) => +x.n === n) ?? null, a = L ? ((L.cells[0].card.u1 - L.cells[0].card.u0) * face.w) / ((L.cells[0].card.v1 - L.cells[0].card.v0) * face.h) : grid.card.w / grid.card.h;
    const W = a >= 1 ? S.canvasMax : Math.round(S.canvasMax * a), H = a >= 1 ? Math.round(S.canvasMax / a) : S.canvasMax, g = ctx.canvas(W, H);
    if (flip) { g.translate(W, 0); g.scale(-1, 1); }
    g.fillStyle = C.backing; g.fillRect(0, 0, W, H);
    const m = Math.round(Math.min(W, H) * 0.035);
    paintCard(g, c, m, m, W - 2 * m, H - 2 * m, { buttons: btnsOf(c), btns: L && c ? rel(L.cells[0]) : undefined, hover: hover === n, hb: P.hb, ctx });
    return;
  }
  const Wp = face.w >= face.h ? S.canvasMax : Math.round(S.canvasMax * face.w / face.h), Hp = face.w >= face.h ? Math.round(S.canvasMax * face.h / face.w) : S.canvasMax;
  const g = ctx.canvas(Wp, Hp), k = Wp / face.w;
  if (flip) { g.translate(Wp, 0); g.scale(-1, 1); }
  g.fillStyle = C.backing; g.fillRect(0, 0, Wp, Hp); // walnut backing with its grain
  g.globalAlpha = 0.05; for (const odd of [1, 0]) { g.beginPath(); for (let y = 0; y < Hp; y += 6) if (!!(y % 12) === !!odd) g.rect(0, y, Wp, 3); g.fillStyle = odd ? '#000' : C.grain; g.fill(); } g.globalAlpha = 1; // ponytail: disjoint rows, so two fills paint what ~170 did
  const byN = {}; for (const c of cards) byN[c.n] = c;
  for (let i = 0; i < (L ? L.cells.length : slots); i++) {
    const n = i + 1 + off, c = byN[n] ?? null, cl = L?.cells[i], r = cl ? { x: cl.card.u0 * face.w, y: cl.card.v0 * face.h, w: (cl.card.u1 - cl.card.u0) * face.w, h: (cl.card.v1 - cl.card.v0) * face.h } : grid.rect(i);
    paintCard(g, c, r.x * k, r.y * k, r.w * k, r.h * k, { buttons: btnsOf(c), btns: cl && c ? rel(cl) : undefined, hover: hover === n, hb: P.hb, ctx });
  }
  for (const t of L?.tabs ?? []) button(g, t.rect.u0 * Wp, t.rect.v0 * Hp, (t.rect.u1 - t.rect.u0) * Wp, (t.rect.v1 - t.rect.v0) * Hp, Hp * 0.09, t.name, P.hb === t.name); // frame tabs (photo: PREV / NEXT)
  if (!cards.length) { g.font = `italic ${Math.round(Hp * 0.045)}px ${S.font}`; g.fillStyle = '#f2d7a2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(row.empty ?? 'nothing waiting', Wp / 2, Hp / 2); g.textAlign = 'left'; }
}
