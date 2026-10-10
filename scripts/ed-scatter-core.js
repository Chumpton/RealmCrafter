// Editor pillar (camptons_world spec 2026-10-09): Drop to Ground (End / edDrop), Physics Settle (edx settle), and the
// any-asset scatter brush's palette ops (edx brushAdd / brushSel / brushW / brushDel / brushClear) writing player.state.te.fol (+ te.folX
// for selected pieces that have no card). The painting itself stays terrain-editor-core's 'foliage' tool: same beds, same undo.
import { PREFAB } from './lib/data/prefabs.js';
import { dropPos } from './lib/ed-ground.js';
const SETTLE_MS = 2500, MAX_H = 6, CART = 3.2;
const r2 = (v) => Math.round(v * 100) / 100;
const note = (ctx, t) => { const me = ctx.self; me.state.te = { ...(me.state.te ?? {}), note: t, noteAt: ctx.now() };
  ctx.emit('uiEvent', { name: 'msToast', payload: t }, { audience: { player: me.id } }); };
const selIds = (me) => { const m = me.state.ms?.ids ?? []; return m.length ? [...m] : me.state.bld?.sel ? [me.state.bld.sel] : []; };
const live = (ctx, ids) => ids.map((id) => ctx.getObject(id)).filter(Boolean);
export function onInput(ctx, input) {
  const me = ctx.self; if (!me.isEditor) return;
  if (input.pressed?.edDrop) drop(ctx);
  if (input.pressed?.edx) ops(ctx, input.actionData?.edx ?? {});
}
export function tick(ctx) {
  const P = ctx.session.edPend; if (P) { ctx.session.edPend = null; if (P.drop) drop(ctx); if (P.a) ops(ctx, P.a); }
  const S = ctx.session.edSettle; if (S && ctx.now() >= S.at) settleEnd(ctx, S);
}
function drop(ctx) {
  const objs = live(ctx, selIds(ctx.self)); if (!objs.length) return note(ctx, '⏚ select something first (click it)');
  const ids = objs.map((o) => o.id), to = objs.map((o) => dropPos(ctx, o, PREFAB, ids));
  ctx.commit(objs.length === 1 ? 'dropped a piece to the ground' : `dropped ${objs.length} pieces to the ground`, () => {
    objs.forEach((o, i) => { o.feetPosition = to[i]; if (o.state?.home) o.state.home = { ...to[i] }; }); });
  note(ctx, `⏚ dropped ${objs.length} to the surface`);
}
// why a piece will not tumble ('' = it may)
function why(o) {
  if (o.scatter) return 'bed'; const b = o.bounds, pf = PREFAB[o.state?.pf], cat = String(pf?.cat ?? '') + ' ' + (o.tags ?? []).join(' ');
  if (/build/i.test(cat) || /building|house|hall/i.test(String(o.state?.pf ?? ''))) return 'building';
  if (o.physics?.body === 'character' || (o.tags ?? []).includes('player')) return 'character';
  if (!b) return 'no shape'; if (b.size.y > MAX_H) return 'taller than 6 m';
  if (o.model && Math.max(b.size.x, b.size.z) > CART) return 'bigger than a cart';
  return '';
}
function settle(ctx) {
  if (ctx.session.edSettle) return note(ctx, '⤓ already settling…');
  const objs = live(ctx, selIds(ctx.self)); if (!objs.length) return note(ctx, '⤓ select props first');
  const go = [], skip = {};
  for (const o of objs) { const w = why(o); if (w) { skip[w] = (skip[w] ?? 0) + 1; continue; }
    const orig = o.physics ? JSON.parse(JSON.stringify(o.physics)) : null;
    go.push({ id: o.id, phys: orig, from: { ...o.feetPosition } });
    o.physics = { ...(orig ?? { collider: 'box' }), body: 'dynamic' }; // keeps its collider shape; runtime only until the commit
    o.velocity = { x: 0, y: -0.2, z: 0 }; }
  const sk = Object.entries(skip).map(([k, n]) => `${n} ${k}`).join(', ');
  if (!go.length) return note(ctx, `⤓ nothing to settle${sk ? ` · skipped ${sk}` : ''}`);
  ctx.session.edSettle = { at: ctx.now() + SETTLE_MS, go, sk };
  ctx.self.state.te = { ...(ctx.self.state.te ?? {}), settling: ctx.now() + SETTLE_MS };
  note(ctx, `⤓ settling ${go.length}…${sk ? ` skipped ${sk}` : ''}`);
}
function settleEnd(ctx, S) {
  ctx.session.edSettle = null; const done = S.go.map((g) => ({ g, o: ctx.getObject(g.id) })).filter((x) => x.o);
  const fin = done.map(({ o }) => ({ p: { ...o.feetPosition }, r: o.rotation }));
  ctx.commit(`settled ${done.length} props`, () => {
    done.forEach(({ g, o }, i) => { o.physics = g.phys ?? null; o.feetPosition = { x: r2(fin[i].p.x), y: r2(fin[i].p.y), z: r2(fin[i].p.z) }; o.rotation = fin[i].r; if (o.state?.home) o.state.home = { ...o.feetPosition }; });
  });
  ctx.self.state.edLast = { op: 'settle', n: done.length, at: ctx.now(), moved: done.map(({ g }, i) => ({ id: g.id, dy: r2(fin[i].p.y - g.from.y) })).slice(0, 12), skipped: S.sk };
  ctx.self.state.te = { ...(ctx.self.state.te ?? {}), settling: 0 };
  note(ctx, `⤓ settled ${done.length} props${S.sk ? ` · skipped ${S.sk}` : ''}`);
}
// ── the brush palette: any card, or the selection
const look = (o) => { const s = {}; for (const k of ['model', 'primitive', 'material', 'scale', 'sprite']) if (o[k] != null) s[k] = JSON.parse(JSON.stringify(o[k])); return s; };
function setFol(ctx, f, x, msg) { const te = ctx.self.state.te ?? {}; ctx.self.state.te = { ...te, fol: f, folX: x ?? te.folX ?? {}, ...(te.tool === 'foliage' ? {} : { tool: 'foliage' }), note: msg, noteAt: ctx.now() }; }
function ops(ctx, a) {
  const te = ctx.self.state.te ?? {}, f = { ...(te.fol ?? {}) }, x = { ...(te.folX ?? {}) };
  switch (a.op) {
    case 'settle': return settle(ctx);
    case 'drop': return drop(ctx);
    case 'brushAdd': { const id = a.id ?? ctx.self.state.bld?.carry; if (!PREFAB[id]) return note(ctx, '🖌 pick a card first');
      f[id] = f[id] > 0 ? Math.min(5, f[id] + 1) : 1; return setFol(ctx, f, x, `🖌 ${PREFAB[id].label} in the brush ×${f[id]}`); }
    case 'brushSel': { const objs = live(ctx, selIds(ctx.self)); if (!objs.length) return note(ctx, '🖌 select pieces first');
      let n = 0; for (const o of objs) { if (o.scatter) continue; const pf = o.state?.pf;
        if (PREFAB[pf]) { f[pf] = Math.min(5, (f[pf] ?? 0) + 1); n++; continue; }
        const L = look(o); if (!L.model && !L.primitive && !L.sprite) continue;
        const k = 'x' + (o.id.replace(/[^a-z0-9]/gi, '').slice(-14)); x[k] = { ...L, label: String(o.state?.label ?? o.id).slice(0, 24) }; f[k] = Math.min(5, (f[k] ?? 0) + 1); n++; }
      return setFol(ctx, f, x, `🖌 brush from ${n} selected piece${n === 1 ? '' : 's'}`); }
    case 'brushW': if (f[a.id] != null) f[a.id] = Math.max(1, Math.min(5, Math.round(+a.v || 1))); return setFol(ctx, f, x, '');
    case 'brushDel': delete f[a.id]; delete x[a.id]; return setFol(ctx, f, x, '');
    case 'brushClear': return setFol(ctx, {}, {}, '🖌 brush cleared');
    default: return;
  }
}
