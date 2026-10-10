// QUESTS on the player's own body (Oct 4). Owns: s.quests { <id>: 'active' | 'done' }, s.questWin { id, view }.
// The giver's press ears emit questTalk { npc } here; the frame's buttons send questAccept / questTurnIn / questClose.
// The ! / ? over each giver is this machine's own marker (audience local): yellow ! = offered, grey ? = underway, yellow ? = ready.
import { animate } from 'builtin/tween';
import { QUESTS, QUEST_OF_NPC, QUEST_MARK } from './lib/data/quests.js';
export const updateSchedule = { every: { seconds: 0.5 } };
const SND = (n) => `/cdn/moodboard-lowpoly-cozy/sfx-${n}.mp3`;
const count = (s, item) => (Array.isArray(s.inv) ? s.inv : []).filter((x) => x?.id === item).length;
const have = (s, q) => q.need.flag ? (s.qc?.[q.need.flag] | 0) : count(s, q.need.item); // a flag quest counts a deed, an item quest the pack
const ready = (s, q) => have(s, q) >= q.need.n;
function markOf(s, id) {
  const st = s.quests?.[id], q = QUESTS[id];
  if (st === 'done') return null;
  if (st === 'active') return ready(s, q) ? 'ready' : 'busy';
  return 'offer';
}
function svg(kind, w = 0.3) { // drawn as shapes (no font): WoW's chunky gold ! and ?
  const fill = kind === 'busy' ? '#b4b4b4' : '#ffd200', rim = kind === 'busy' ? '#3a3a3a' : '#5a3a00', glow = kind === 'busy' ? '#000000' : '#ffae00';
  const g = kind === 'offer'
    ? `<path d='M36 8 L64 8 L58 92 L42 92 Z'/><circle cx='50' cy='118' r='14'/>`
    : `<path d='M22 42 C22 14 78 6 80 40 C82 62 58 66 58 84 L58 94 L40 94 L40 80 C40 58 62 56 60 40 C58 26 40 26 40 42 Z'/><circle cx='49' cy='118' r='13'/>`;
  return `<svg viewBox='0 0 100 140' width='${w}m' billboard='yaw'><g fill='${rim}' stroke='${rim}' stroke-width='14' stroke-linejoin='round'>${g}</g><g fill='${fill}' filter='drop-shadow(0 0 8 ${glow})'>${g}</g></svg>`;
}
const marks = new Map(); // npc -> { id, kind } on this machine
export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false) return;
  const s = me.state;
  if (!marks.swept) { marks.swept = true; for (const r of ctx.query({ tags: ['quest-mark'], radius: 200 })) ctx.destroy(r.id); } // a reload's orphaned marks go first (perf 2026-10-07: 200 m, not 5 km: marks are local + session, so a far one cannot outlive a reload; the 5 km sweep held 9 far cells)
  for (const [npc, qid] of Object.entries(QUEST_OF_NPC)) {
    const kind = markOf(s, qid), cur = marks.get(npc), giver = ctx.getObject(npc);
    if (cur && (!ctx.getObject(cur.id) || !giver)) marks.delete(npc);
    const have = marks.get(npc);
    if (!giver) continue;
    if (!kind) { if (have) { ctx.destroy(have.id); marks.delete(npc); } continue; }
    const g = giver.feetPosition, y = g.y + (giver.state?.markY ?? QUESTS[qid]?.markY ?? QUEST_MARK.y), mw = QUESTS[qid]?.markW ?? 0.3;
    const spot = `${g.x.toFixed(1)},${y.toFixed(1)},${g.z.toFixed(1)},${mw}`; // the giver moved, grew or its mark height changed: the mark is laid again
    if (have && have.spot !== spot) { ctx.destroy(have.id); marks.delete(npc); }
    else if (have && have.kind === kind) { const mo = ctx.getObject(have.id), mp = me.feetPosition; if (mo && mp) { const far = Math.hypot(g.x - mp.x, g.z - mp.z) > 27; if (mo.visible !== far) mo.visible = far; } continue; } // inside 28 m the name plate carries the ! (plates-hud.js)
    else if (have) { const o = ctx.getObject(have.id); if (o) o.vector = svg(kind, mw); marks.set(npc, { ...have, kind }); continue; }
    const id = ctx.spawn({ audience: 'local', scope: 'session', castShadow: false, feetPosition: { x: g.x, y, z: g.z }, vector: svg(kind, mw), visibleRange: { max: mw > 0.5 ? 160 : 70 }, tags: ['quest-mark'] });
    animate(ctx, ctx.getObject(id), { 'feetPosition.y': [y, y + QUEST_MARK.bob * (mw / 0.3), y] }, { duration: 1.6, easing: 'easeInOutSine', loop: true });
    marks.set(npc, { id, kind, spot });
  }
  // the frame closes itself when you walk off
  const w = s.questWin; if (w) { const q = QUESTS[w.id], gv = q && ctx.getObject(q.npc), p = me.feetPosition; if (!gv || Math.hypot(gv.feetPosition.x - p.x, gv.feetPosition.z - p.z) > 7) s.questWin = null; }
}
export const ears = {
  questTalk: (ctx, { npc }) => {
    const me = ctx.self; if (me.isLocal === false) return;
    const id = QUEST_OF_NPC[npc], q = QUESTS[id]; if (!q) return;
    const st = me.state.quests?.[id]; if (st === 'done') return;
    me.state.questWin = { id, view: !st ? 'offer' : ready(me.state, q) ? 'complete' : 'progress' };
    ctx.emit('playSound', { clip: SND('quest-scroll-open-parchment'), position: me.feetPosition, volume: 0.6 }, { audience: { player: me.id } });
  },
};
export function onInput(ctx, input) {
  const me = ctx.self; if (me.isLocal === false) return;
  const pr = input?.pressed ?? {}, s = me.state, w = s.questWin; if (!w) return;
  const q = QUESTS[w.id]; if (!q) { s.questWin = null; return; }
  if (pr.questClose) { s.questWin = null; return; }
  if (pr.questAccept && w.view === 'offer') {
    s.quests = { ...(s.quests ?? {}), [w.id]: 'active' }; s.questWin = null; if (q.need.flag) s.qc = { ...(s.qc ?? {}), [q.need.flag]: 0 };
    ctx.emit('playSound', { clip: SND('quest-accepted-chime'), position: me.feetPosition, volume: 0.7 }, { audience: { player: me.id } });
    ctx.emit('skillMsg', { text: `Quest accepted: ${q.title}` }, { to: me.id });
    ctx.emit('uiEvent', { name: 'questBanner', payload: { text: `Quest accepted: ${q.title}` } }, { audience: { player: me.id } });
    return;
  }
  if (pr.questTurnIn && w.view === 'complete') {
    if (!ready(s, q)) { s.questWin = { ...w, view: 'progress' }; return; }
    if (!q.need.flag) { const inv = s.inv.slice(); let left = q.need.n; for (let i = 0; i < inv.length && left > 0; i++) if (inv[i]?.id === q.need.item) { inv[i] = null; left--; } s.inv = inv; } s.supplies = { ...(s.supplies ?? {}), coins: ((s.supplies?.coins) | 0) + q.reward.coins };
    s.quests = { ...(s.quests ?? {}), [w.id]: 'done' }; s.questWin = null;
    for (const [k, v] of Object.entries(q.reward.xp ?? {})) ctx.emit('skillXp', { quest: true, multi: { [k]: v * 10 } }, { to: me.id });
    const p = me.feetPosition;
    ctx.emit('playSound', { clip: SND('quest-complete-fanfare'), position: p, volume: 0.85 }, { audience: { player: me.id } });
    ctx.emit('fx', { position: { x: p.x, y: p.y + 1, z: p.z }, script: `fx
pop spark burst=50 life=.8..1.5 v=up(2.5..4.5)+sdir()*(1..2) size=.05..0.1 acc=grav()*.35+drag(1.1) col=hdr(3,2.5,.7)>hdr(1.6,1,.2) a=1>.7:1>0 sz=$size r=sprite(ember,add)
pop glow burst=1 life=.7 r=light(<1,.85,.4>,25*(1>0),7)` });
    ctx.emit('damageNumber', { position: { x: p.x, y: p.y + 2.5, z: p.z }, text: `+${q.reward.coins} coins`, color: '#ffd200', size: 1.1, lifetime: 1.8 }, { audience: { player: me.id } });
    ctx.emit('skillMsg', { text: `Quest complete: ${q.title}. You receive ${q.reward.coins} coins.` }, { to: me.id });
    ctx.emit('uiEvent', { name: 'questBanner', payload: { text: `${q.title} completed.` } }, { audience: { player: me.id } });
  }
}
