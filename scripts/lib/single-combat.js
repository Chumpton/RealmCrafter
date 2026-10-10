// SINGLE COMBAT (creator 2026-10-05): 1v1 only, OSRS-style. A player fighting one enemy can't be attacked by a second,
// and can't start on a second while one is still on them. Multi-combat areas (free for all) are not defined yet.
export const HOLD_MS = 6000; // how long after its last fighting tick an enemy still counts as "on" a player
const here = (o) => o.worldFeetPosition ?? o.feetPosition;
// the id of a live enemy (other than exceptId) that is fighting player p right now, else null
export function foeOn(ctx, p, exceptId) {
  const f = p && here(p); if (!f) return null;
  const now = ctx.now();
  for (const r of ctx.query({ tags: ['enemy'], center: f, radius: 45 })) {
    const s = r.state; if (r.id === exceptId || !s || s.down || s.engaged !== p.id) continue;
    if (now - (s.hitAt ?? 0) < HOLD_MS) return r.id;
  }
  return null;
}
// true when p is already in a fight with someone other than enemy o
export function busyElsewhere(ctx, p, oId) {
  const t = p?.state?.fight?.target;
  if (t && t !== oId) { const e = ctx.getObject(t); if (e && !e.state?.down) return true; }
  return !!foeOn(ctx, p, oId);
}
