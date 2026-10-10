// HUGINN-DRONE L4 + BOARD-CLICK W5: the raven board by the photo judges. Every 10 s one read of docs/board/drone/HUGINN.md; a
// changed text (or a creator mark) repaints. 50 slots on the one painter (scripts/tex-board.js, board=huginn-board, grid from
// scripts/lib/data/boards.js): pinned first, then open by tier, then fixed / rejected. state.cards is the one card shape
// { n: slot 1..50, id: finding key, title, body, chips: [tier, status, H#] } plus the report fields the HUD window reads
// (h = the finding's H number, key, tier, kind, cell, x, z, ev, fix, why, status, verdict, note, see, pass, pin).
// state.marks { key: { pin, dismiss, at } } has ONE writer: ears.mark below (the click lane calls it; huginn-board-input.js's
// 'huginn:mark' ping still repaints until it retires). scripts/huginn.js reads marks back.
import { isOn, PAUSE_NAP_S } from './lib/data/systems.js';
import { HUG } from './lib/data/huginn.js';
import { WAKE } from './lib/data/wake.js';
import { parseLine, parseCluster } from './lib/huginn-lines.js';
export const updateSchedule = { every: { seconds: 10 } };
let lastText = null, lastMarks = null;
const ST = { found: 'NEW', watched: 'VERIFIED', fixing: 'FIXING', fixed: 'FIXED', rejected: 'FALSE' };
const OPEN = new Set(['found', 'watched', 'fixing']);
const cut = (s, n) => String(s ?? '').slice(0, n);
const SEAL = 'cdn/moodboard-lowpoly-cozy/sfx-wax-seal-press.mp3';
export function order(list, marks) {
  const r = (f) => (marks[f.key]?.pin ? 0 : 1) * 100 + (OPEN.has(f.status) ? 0 : 50) + f.tier;
  return list.sort((a, b) => r(a) - r(b) || b.n - a.n).slice(0, 50);
}
const chipsOf = (f, pin) => [
  { k: f.tier === 1 ? 'tier1' : 'tier', text: `${pin ? '★ ' : ''}P${f.tier}` },
  { k: 'status', text: ST[f.status] ?? cut(f.status, 10) },
  { k: 'id', text: 'H' + f.n },
];
// the painter's bake: the one shape alone, trimmed so the url stays small (the HUD window reads the full row from state.cards)
const paintUrl = (cards) => 'scripts/tex-board.js?board=huginn-board&flip=false&d=' + encodeURIComponent(JSON.stringify({ c: cards.map((c) => ({ n: c.n, id: c.id, title: cut(c.title, 60), body: cut(c.body, 90), chips: c.chips })) }));
export function onSpawn() { lastText = null; lastMarks = null; }
export function update(ctx) { if (!isOn(ctx, 'huginn')) { ctx.sleep?.(PAUSE_NAP_S); return; } // DEN SYSTEMS: paused unless switched on (O → Den Systems)
  const self = ctx.self, text = ctx.files.read(HUG.file) ?? '', marks = self.state.marks ?? {}, mk = JSON.stringify(marks);
  if (text === lastText && mk === lastMarks) return;
  lastText = text; lastMarks = mk;
  const list = text.split('\n').map(parseLine).filter(Boolean);
  for (const f of list) { const m = marks[f.key]; if (m?.dismiss) f.status = 'rejected'; if (m?.pin) f.tier = 1; }
  // HUGINN-V3 S5: CLUSTER cards lead (one cause, fix once), then the findings fill the 50 slots
  const clusters = text.split('\n').map(parseCluster).filter(Boolean).slice(0, 8);
  const ccards = clusters.map((c, i) => ({ n: i + 1, id: c.key, title: `CLUSTER · ${c.count} ${c.kind} · ${cut(c.prefix, 40)}`, body: cut('cause: ' + c.cause, 120),
    chips: [{ k: 'count', text: '×' + c.count }, { k: 'status', text: 'ONE CAUSE' }, { k: 'id', text: 'C' + c.c }],
    cluster: true, h: 'C' + c.c, key: c.key, tier: 2, kind: 'CLUSTER', count: c.count, members: c.hs.join(' '), cell: '', x: 0, z: 0, ev: cut(`${c.count} ${c.kind} findings share one root: ${c.hs.join(' ')}`, 200),
    why: cut(c.cause, 220), fix: cut(c.fix, 300), status: 'found', see: 'fix once, then watch the members close', pass: '' }));
  const cards = [...ccards, ...order(list, marks).slice(0, 50 - ccards.length).map((f, i) => {
    const pin = !!marks[f.key]?.pin;
    return { n: ccards.length + i + 1, id: f.key, title: `${f.kind} · ${cut(f.id, 60)}`, body: cut(f.ev, 120), chips: chipsOf(f, pin),
      h: f.n, key: f.key, tier: f.tier, kind: f.kind, cell: f.cell, x: f.x, z: f.z, ev: cut(f.ev, 200), fix: cut(f.fix, 300), why: cut(f.why, 220),
      status: f.status, verdict: cut(f.verdict, 160), note: cut(f.note, 160), see: f.see, pass: f.pass, pin };
  })];
  const open = cards.filter((c) => OPEN.has(c.status)).length, p1 = cards.filter((c) => c.tier === 1 && OPEN.has(c.status)).length;
  const pass = /pass (\d+)/.exec(text)?.[1] ?? '0';
  self.state.cards = cards; self.state.rev = (self.state.rev ?? 0) + 1;
  self.state.head = `pass ${pass} · ${open} open · P1 ${p1}`;
  const panel = ctx.getObject('huginn-board/face');
  if (panel) {
    if (panel.ui != null) panel.ui = null;
    const url = paintUrl(cards);
    if ((panel.material?.texture ?? panel.material?.map) !== url) panel.material = { texture: url, color: '#e8dcc8', roughness: 0.92, metalness: 0 };
  }
}
// ISSUE / DISMISS: the creator's alone (WAKE.owner), ≤ HUG.maxPins pins; exactly huginn-board-input.js's rule and mark rows.
// payload { n, id, kind: 'pin' | 'dismiss', by } — by = the clicking player's id (or userId); id (the finding key) wins over n.
function mark(ctx, p = {}) {
  const b = ctx.self, pl = (ctx.world.players ?? []).find((x) => x.id === p.by || x.userId === p.by);
  if (!pl || pl.userId !== WAKE.owner) return;
  const cards = b.state.cards ?? [], c = (p.id != null && cards.find((x) => x.id === p.id)) || cards.find((x) => x.n === p.n);
  if (!c || c.cluster) return;
  const marks = { ...(b.state.marks ?? {}) }, m = { ...(marks[c.key] ?? {}) };
  if (p.kind === 'pin') {
    if (!m.pin && Object.values(marks).filter((x) => x.pin).length >= HUG.maxPins) { ctx.emit('uiEvent', { name: 'toast', payload: { text: `${HUG.maxPins} issues already pinned: unpin one first` } }, { audience: { player: pl.id } }); return; }
    m.pin = !m.pin; if (m.pin) m.dismiss = false;
  } else if (p.kind === 'dismiss') { m.dismiss = !m.dismiss; if (m.dismiss) m.pin = false; }
  else return;
  marks[c.key] = { ...m, at: ctx.now() }; b.state.marks = marks;
  ctx.emit('playSound', { clip: SEAL, position: b.feetPosition, volume: 0.6 });
  if (m.pin) ctx.notifyDm?.(`HUGINN ISSUE: the creator pinned H${c.h} (${c.kind} · ${c.id}) as #1. Read docs/board/drone/HUGINN.md and start on it.`, { wake: true });
  lastMarks = null; update(ctx);
}
export const ears = { mark, 'huginn:mark': (ctx) => { lastMarks = null; update(ctx); } };
