// creator 2026-10-09: Admin → "Hide / Show Props": hides EVERYTHING but the terrain for fast traversal
// ("i meant everything but terrain"): buildings, trees, scatter, folk, props. Players and what they ride stay.
// A visible write lands on the world's rows, so the hide reaches the room. The hidden list is saved to
// data/props-hidden.json (a file, so a reload or a new room can never strand the props again); the next press,
// from any session, reads it and brings back exactly what it hid. (Oct 9: a session-only list stranded 6,700 props.)
const FILE = 'data/props-hidden.json';
const BATCH = 300;    // objects flipped per tick, so the toggle never hitches the frame

export function onInput(ctx, input) {
  if (!input.pressed?.propsHide) return;
  const p = ctx.self, s = ctx.session;
  if (!p.isEditor || s.propsJob) return;
  const saved = JSON.parse(ctx.files.read(FILE) || '[]');
  if (s.propsHidden?.length || saved.length) { if (!s.propsHidden?.length) s.propsHidden = saved; s.propsJob = { mode: 'show', i: 0 }; return; }
  const keep = new Set(ctx.place.players.map((q) => q.id));
  for (const q of ctx.place.players) if (q.controlling) keep.add(q.controlling.id);
  const ids = [];
  for (const r of ctx.query({ center: p.feetPosition, radius: 5000 })) {
    if (keep.has(r.id) || r.id.endsWith('__spline__collision')) continue;
    const o = ctx.getObject(r.id);
    if (!o || o.visible === false) continue;     // already hidden on purpose: not ours to bring back
    ids.push(r.id);
  }
  s.propsHidden = ids;
  ctx.files.write(FILE, JSON.stringify(ids));
  s.propsJob = { mode: 'hide', i: 0 };
}

export function update(ctx) {
  const s = ctx.session, job = s.propsJob;
  if (!job) { ctx.sleep(0.5); return; }
  const ids = s.propsHidden ?? [];
  const vis = job.mode === 'show', end = Math.min(ids.length, job.i + BATCH);
  for (let k = job.i; k < end; k++) { const o = ctx.getObject(ids[k]); if (o && o.visible !== vis) o.visible = vis; }
  if (end < ids.length) { job.i = end; return; }
  const n = ids.length;
  if (vis) { s.propsHidden = null; ctx.files.write(FILE, '[]'); }
  s.propsJob = null;
  ctx.emit('uiEvent', { name: 'toast', payload: { text: vis ? 'props back on' : `${n} props hidden (press again to bring them back)` } }, { audience: { player: ctx.self.id } });
}
