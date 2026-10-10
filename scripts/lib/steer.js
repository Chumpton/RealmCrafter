// Obstacle steering for walking NPCs (creator 2026-10-10: "collision pathing detection for npcs including my wolf so they go
// around things or turn around if bumping"). Three feelers at knee height look ahead along the wanted velocity: a clear centre
// passes it through; a blocked centre bends it toward the clearer side; all three blocked (or no progress for ~1 s while
// trying to move) turns the walker around and sends it sideways for a moment. Static colliders only, so players and pets
// never count as walls. Rays are re-cast every few ticks and reused between. Pure helper: the caller keeps `mem`.
import { raycast } from 'builtin/physics';
const R = { knee: 0.55, look: 1.2, perSpeed: 0.45, side: 38, bend: 65, every: 3, stuckMs: 900, detourMs: 1300 };
const rot = (x, z, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - z * s, x * s + z * c]; };
export function avoid(ctx, me, vx, vz, mem, opts = {}) {
  const sp = Math.hypot(vx, vz), now = ctx.now(), p = me.feetPosition;
  if (mem.detour && now < mem.detour.until) { const [dx, dz] = rot(vx, vz, mem.detour.deg); return { vx: dx, vz: dz, blocked: true }; }
  if (sp < 0.3) { mem.prog = null; return { vx, vz, blocked: false }; }
  // no progress while trying: a bump the feelers missed (a low log, a thin post)
  if (!mem.prog || now - mem.prog.t > R.stuckMs) {
    if (mem.prog && Math.hypot(p.x - mem.prog.x, p.z - mem.prog.z) < 0.25 && mem.prog.want > 1) { mem.detour = { until: now + R.detourMs, deg: 180 + (ctx.random() < 0.5 ? -50 : 50) }; mem.prog = null; const [dx, dz] = rot(vx, vz, mem.detour.deg); return { vx: dx, vz: dz, blocked: true }; }
    mem.prog = { t: now, x: p.x, z: p.z, want: sp };
  }
  mem.n = (mem.n ?? 0) + 1;
  if (!mem.feel || mem.n % R.every === 0) {
    const ux = vx / sp, uz = vz / sp, len = (opts.look ?? R.look) + sp * R.perSpeed, o = { x: p.x, y: p.y + (opts.knee ?? R.knee), z: p.z };
    const ign = [me.id, ...(opts.ignore ?? [])];
    const cast = (deg) => { const [dx, dz] = rot(ux, uz, deg); const h = raycast(ctx, o, { x: dx, y: 0, z: dz }, { distance: len, ignoreEntities: ign, bodies: 'static', physicsOnly: true }); return h && !(h.normal && h.normal.y > 0.7) ? h.distance : len; }; // a floor-like hit (a gentle slope) is ground, not a wall
    mem.feel = { c: cast(0), l: cast(-R.side), r: cast(R.side), len };
  }
  const f = mem.feel, near = f.len * 0.999;
  if (f.c >= near && f.l >= near * 0.6 && f.r >= near * 0.6) return { vx, vz, blocked: false };
  if (f.c < near * 0.35 && f.l < near * 0.5 && f.r < near * 0.5) { // boxed in ahead: turn around
    mem.detour = { until: now + R.detourMs, deg: 180 + (f.l > f.r ? -40 : 40) }; const [dx, dz] = rot(vx, vz, mem.detour.deg); return { vx: dx, vz: dz, blocked: true };
  }
  const deg = (f.l > f.r ? -1 : 1) * R.bend * Math.min(1, (f.len - Math.min(f.c, f.l, f.r)) / f.len + 0.35);
  const [dx, dz] = rot(vx, vz, deg), k = f.c < near * 0.3 ? 0.6 : 1;
  return { vx: dx * k, vz: dz * k, blocked: true };
}
