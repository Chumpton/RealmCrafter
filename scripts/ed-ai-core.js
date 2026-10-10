// Editor AI copilot body (ui/hud/ed-ai.js draws it). Ops arrive as sendAction('ai', {op, ...}):
//  ask {text}            -> ctx.notifyDm to Savi with the selection's context (ids ≤ 40, labels, centroid, zone)
//  preset {id, preview}  -> 'scramble' runs here (yaw 0-360, scale ×0.85-1.25, one commit, or a ghost proposal in preview);
//                           the others go to Savi as asks
//  pal {theme} / palPick {i} / palDel {i} -> Prompt-to-Palette (llm:chat, 12 validated PREFAB ids, last 5 cached in state.aiPal)
//  accept / tweak / reject {id} -> world.state.edProposals[id] (format: docs/board/ED-PROPOSALS.md)
// player.state.ai = { toast:{m,at}, pend:[{id,label,by,n}], busy } is the HUD's mirror.
import { PREFABS, PREFAB } from './lib/data/prefabs.js';
import { zoneOf } from './lib/data/zones.js';

const PRESETS = {
  populate: 'Populate this courtyard with cozy rustic props',
  torch: 'Add warm torch lighting along this path',
  scramble: 'Scramble rotation and random heights for selected trees',
};
const r2 = (v) => Math.round(v * 100) / 100;
const selIds = (me) => { const m = me.state.ms?.ids ?? []; return m.length ? [...m] : me.state.bld?.sel ? [me.state.bld.sel] : []; };
const ghostId = (pid, i) => `edg-${pid}-${i}`;
function setAi(me, patch) { me.state.ai = { ...(me.state.ai ?? {}), ...patch }; }
function toast(ctx, me, m) { setAi(me, { toast: { m, at: ctx.now() } }); }

export function onInput(ctx, input) {
  const me = ctx.self; if (!me.isEditor) return;
  sync(ctx, me);
  if (input.pressed?.ai) { try { op(ctx, me, input.actionData?.ai ?? {}); } catch (e) { ctx.log('ed-ai op failed', { e: String(e) }); toast(ctx, me, '⚠ ' + String(e).slice(0, 60)); } }
}

function op(ctx, me, a) {
  switch (a.op) {
    case 'ask': { const t = String(a.text ?? '').trim().slice(0, 400); if (t) ask(ctx, me, t); return; }
    case 'preset': {
      if (a.id === 'scramble') return scramble(ctx, me, !!a.preview);
      if (PRESETS[a.id]) ask(ctx, me, PRESETS[a.id]); return;
    }
    case 'pal': return palette(ctx, me, String(a.theme ?? '').trim().slice(0, 80));
    case 'palPick': { const p = me.state.aiPal ?? {}; if (p.themes?.[a.i]) me.state.aiPal = { ...p, cur: +a.i }; return; }
    case 'palDel': { const p = me.state.aiPal ?? {}; const th = (p.themes ?? []).filter((_, i) => i !== +a.i); me.state.aiPal = { ...p, themes: th, cur: 0 }; return; }
    case 'accept': return accept(ctx, me, a.id);
    case 'reject': return reject(ctx, me, a.id);
    case 'tweak': return tweak(ctx, me, a.id);
    case 'prevT': setAi(me, { prev: !me.state.ai?.prev }); return;
    case 'clearToast': setAi(me, { toast: null }); return;
  }
}

// ---------- 1. selection context -> Savi ----------
export function selContext(ctx, me) {
  const ids = selIds(me).filter((id) => ctx.getObject(id)).slice(0, 40);
  const labels = {}; let sx = 0, sy = 0, sz = 0, n = 0;
  for (const id of ids) {
    const o = ctx.getObject(id), pf = o.state?.pf, L = (pf && PREFAB[pf]?.label) || pf || id.replace(/-[a-z0-9]{6,}$/, '');
    labels[L] = (labels[L] ?? 0) + 1;
    const f = o.feetPosition; if (f) { sx += f.x; sy += f.y; sz += f.z; n++; }
  }
  const c = n ? { x: r2(sx / n), y: r2(sy / n), z: r2(sz / n) } : null;
  return { ids, labels, centroid: c, zone: c ? zoneOf(c.x, c.z) : null };
}
function ask(ctx, me, text) {
  const s = selContext(ctx, me);
  const lab = Object.entries(s.labels).map(([k, v]) => v > 1 ? `${k} ×${v}` : k).join(', ');
  const msg = `✦ Editor ask (${me.displayName}, place main): "${text}"` +
    (s.ids.length ? ` | selection ${s.ids.length}: ${lab} | centroid ${s.centroid ? `${s.centroid.x}, ${s.centroid.y}, ${s.centroid.z}` : '?'} | zone ${s.zone ?? '?'} | ids ${s.ids.join(' ')}` : ' | nothing selected')
    + ` | answer as a ghost proposal: world.state.edProposals (docs/board/ED-PROPOSALS.md)`;
  ctx.notifyDm(msg, { wake: true });
  const h = me.state.ai?.asks ?? [];
  setAi(me, { asks: [{ t: text, n: s.ids.length, at: ctx.now() }, ...h].slice(0, 5) });
  toast(ctx, me, '✦ sent to Savi');
}

// ---------- scramble (mechanical, local) ----------
function baseScale(o) {
  const ps = o.state?.pf && PREFAB[o.state.pf]?.spec?.scale;
  if (typeof ps === 'number') return ps;
  const s = o.state?.edBaseScale ?? o.scale; return typeof s === 'number' ? s : s?.y ?? 1;
}
function scramble(ctx, me, preview) {
  const ids = selIds(me).filter((id) => ctx.getObject(id) && !id.startsWith('edg-'));
  if (!ids.length) return toast(ctx, me, 'select something first');
  const rows = ids.map((id) => { const o = ctx.getObject(id); return { id, o, yaw: Math.round(ctx.random() * 360), s: r2(baseScale(o) * (0.85 + ctx.random() * 0.4)) }; });
  if (preview) {
    const pid = 'scr' + Math.floor(ctx.now()).toString(36);
    const items = rows.map(({ id, o, yaw, s }) => ({ target: id, pf: o.state?.pf ?? null, feetPosition: { ...o.feetPosition }, rotation: { yaw }, scale: s }));
    ctx.world.state.edProposals = { ...(ctx.world.state.edProposals ?? {}), [pid]: { by: me.displayName ?? 'editor', label: `Scramble ${ids.length} pieces`, items, at: ctx.now() } };
    return toast(ctx, me, `👻 preview: ${ids.length} ghosts`);
  }
  ctx.commit(`scrambled ${ids.length} pieces`, () => {
    for (const { o, yaw, s } of rows) { o.rotation = { yaw }; o.scale = s; }
  });
  toast(ctx, me, `🎲 scrambled ${ids.length}`);
}

// ---------- 2. Prompt-to-Palette ----------
const words = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
function rank(theme) {
  const ws = words(theme);
  return PREFABS.map((p) => {
    const hay = `${p.id} ${p.label} ${p.cat}`.toLowerCase(); let sc = 0;
    for (const w of ws) { if (hay.includes(w)) sc += 3; else if (w.length > 4 && hay.includes(w.slice(0, 4))) sc += 1; }
    return [sc, p];
  }).sort((a, b) => b[0] - a[0]);
}
function palette(ctx, me, theme) {
  if (!theme) return;
  if (me.state.ai?.busy && ctx.now() - (me.state.ai.busyAt ?? 0) < 30000) return toast(ctx, me, '… still thinking');
  // chunk: 5k+ cards is too big for one ask: send the best keyword hits plus an even spread across every category
  const ranked = rank(theme), pick = new Map();
  for (const [sc, p] of ranked) { if (sc <= 0 || pick.size >= 220) break; pick.set(p.id, p); }
  const byCat = {}; for (const p of PREFABS) (byCat[p.cat] ??= []).push(p);
  const cats = Object.keys(byCat); let k = 0;
  while (pick.size < 420 && k < 60) { for (const c of cats) { const l = byCat[c], p = l[Math.floor((k * 7919 + c.length * 31) % l.length)]; if (p) pick.set(p.id, p); } k++; }
  const list = [...pick.values()].map((p) => `${p.id}|${p.label}|${p.cat}`).join('\n');
  setAi(me, { busy: theme, busyAt: ctx.now() });
  ctx.job('llm:chat', {
    conversationId: 'edai-pal:' + me.id + ':' + Math.floor(ctx.now()),
    model: 'fast', maxHistory: 0,
    system: 'You pick build-palette cards for a cozy lowpoly Norse island level editor. Answer ONLY with 12 card ids from the list, one per line, best match first. No prose.',
    message: `Theme: "${theme}"\nCards (id|label|category):\n${list}`,
  }, 'onAiPal', { theme });
}
export function onAiPal(ctx, r, p) {
  const me = ctx.self, theme = p?.theme ?? '?';
  const got = [];
  if (r?.ok) for (const tok of String(r.data?.text ?? '').split(/[\n,;]+/)) {
    const id = tok.replace(/^[\s\-*\d.)`"']+/, '').split('|')[0].replace(/[`"'*\s]+$/g, '').trim();
    if (PREFAB[id] && !got.includes(id)) got.push(id); if (got.length >= 12) break; }
  const ai = !!got.length;
  if (got.length < 12) for (const [sc, q] of rank(theme)) { if (got.length >= 12) break; if (!got.includes(q.id) && (sc > 0 || got.length < 12)) got.push(q.id); }
  const P = me.state.aiPal ?? {}, th = [{ t: theme, ids: got.slice(0, 12), ai, at: ctx.now() }, ...(P.themes ?? []).filter((x) => x.t !== theme)].slice(0, 5);
  me.state.aiPal = { themes: th, cur: 0 };
  setAi(me, { busy: null });
  toast(ctx, me, ai ? `🎨 ${theme}: 12 cards` : `🎨 ${theme}: keyword match (AI ${r?.ok ? 'gave no ids' : 'unavailable'})`);
}

// ---------- 3. ghost proposals ----------
const strip = (s) => { const { physics, behavior, children, ...look } = s ?? {}; return children ? { ...look, children: children.map(strip) } : look; };
function ghostSpec(it, pid, i) {
  const P = it.pf && PREFAB[it.pf];
  const look = P ? strip(P.spec) : { primitive: { kind: 'box', width: 1, height: 1, depth: 1 }, material: { color: 'oklch(0.8 0.12 85)' } };
  return { ...look, tags: ['ed-ghost'], visibleTo: 'editors', castShadow: false,
    material: { ...(look.material ?? {}), dissolve: 0.55, transparent: true, opacity: 0.6 },
    feetPosition: it.feetPosition, rotation: it.rotation ?? 0, ...(it.scale != null ? { scale: it.scale } : {}),
    state: { edProp: pid, i } };
}
function sync(ctx, me) {
  const S = (ctx.session.edAi ??= { t: 0, made: {}, sig: '' });
  const now = ctx.now(); if (now - S.t < 500) return; S.t = now;
  const P = ctx.world.state.edProposals ?? {};
  for (const [pid, pr] of Object.entries(P)) (pr?.items ?? []).forEach((it, i) => {
    const gid = ghostId(pid, i);
    if (!ctx.getObject(gid) && (S.made[gid] ?? 0) < 3 && it?.feetPosition) { S.made[gid] = (S.made[gid] ?? 0) + 1; try { ctx.spawn(gid, ghostSpec(it, pid, i)); } catch (e) { ctx.log('ed-ai ghost', { gid, e: String(e) }); } }
  });
  if (now - (S.swept ?? 0) > 2500) { S.swept = now; // ghosts whose proposal is gone
    for (const g of ctx.query({ tags: ['ed-ghost'] })) { const pid = g.state?.edProp; if (!pid || !P[pid]) ctx.destroy(g.id); }
  }
  const pend = Object.entries(P).map(([id, pr]) => ({ id, label: String(pr?.label ?? id).slice(0, 60), by: pr?.by ?? '?', n: pr?.items?.length ?? 0, sc: (pr?.items ?? []).some((x) => x.target) }));
  const sig = JSON.stringify(pend);
  if (sig !== S.sig) { S.sig = sig; setAi(me, { pend }); }
}
function poseOf(ctx, it, gid) {
  const g = ctx.getObject(gid);
  return g ? { feetPosition: { ...g.feetPosition }, rotation: g.rotation, scale: g.scale } : { feetPosition: it.feetPosition, rotation: it.rotation ?? 0, scale: it.scale };
}
function accept(ctx, me, pid) {
  const pr = ctx.world.state.edProposals?.[pid]; if (!pr) return;
  const made = [];
  ctx.commit(`accepted Savi's ${pr.label ?? 'proposal'}`, () => {
    (pr.items ?? []).forEach((it, i) => {
      const gid = ghostId(pid, i), pose = poseOf(ctx, it, gid);
      if (it.target) { const o = ctx.getObject(it.target); if (o) { o.feetPosition = pose.feetPosition; o.rotation = pose.rotation; if (pose.scale != null) o.scale = pose.scale; made.push(it.target); } }
      else { const p = PREFAB[it.pf]; if (p && pose.feetPosition) {
        const id = `pf-${p.id}-${Math.floor(ctx.now()).toString(36)}${i}`;
        ctx.spawn(id, { ...p.spec, feetPosition: pose.feetPosition, rotation: pose.rotation, ...(pose.scale != null ? { scale: pose.scale } : {}),
          tags: [...(p.spec.tags ?? []), 'placed', 'pf-' + p.cat], state: { ...(p.spec.state ?? {}), pf: p.id, ...(p.cat === 'npc' ? { home: { ...pose.feetPosition } } : {}) } });
        made.push(id); } }
      if (ctx.getObject(gid)) ctx.destroy(gid);
    });
    const P = { ...(ctx.world.state.edProposals ?? {}) }; delete P[pid]; ctx.world.state.edProposals = P;
  });
  me.state.ms = { ...(me.state.ms ?? {}), ids: made.slice(0, 200) };
  toast(ctx, me, `✓ accepted ${made.length}`);
}
function reject(ctx, me, pid) {
  const pr = ctx.world.state.edProposals?.[pid]; if (!pr) return;
  ctx.commit(`rejected Savi's ${pr.label ?? 'proposal'}`, () => {
    (pr.items ?? []).forEach((_, i) => { const g = ghostId(pid, i); if (ctx.getObject(g)) ctx.destroy(g); });
    const P = { ...(ctx.world.state.edProposals ?? {}) }; delete P[pid]; ctx.world.state.edProposals = P;
  });
  const ms = me.state.ms; if (ms?.ids?.some((x) => x.startsWith(`edg-${pid}-`))) me.state.ms = { ...ms, ids: ms.ids.filter((x) => !x.startsWith(`edg-${pid}-`)) };
  toast(ctx, me, '✕ rejected');
}
function tweak(ctx, me, pid) {
  const pr = ctx.world.state.edProposals?.[pid]; if (!pr) return;
  const ids = (pr.items ?? []).map((_, i) => ghostId(pid, i)).filter((g) => ctx.getObject(g));
  me.state.ms = { ...(me.state.ms ?? {}), ids };
  me.state.bld = { ...(me.state.bld ?? {}), sel: ids.length === 1 ? ids[0] : null };
  me.state.te = { ...(me.state.te ?? {}), tab: 'transform' };
  toast(ctx, me, `✥ ${ids.length} ghosts selected: move them, then ✓ Accept`);
}
