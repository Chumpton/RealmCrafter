// Gondola rider (on every player): E beside a cabin at a station boards it (parented to the cabin, on its floor);
// it carries you up or down the rope and sets you on the far platform when it docks. E at a station steps off early.
import { GONDOLA as G } from './lib/data/gondolas.js';
import { pose, lineGeo, dropPoint } from './lib/gondola-path.js';
const GEO = {};
let near = 0; // local tick counter for the boarding hint
const geo = (k) => (GEO[k] ??= lineGeo(G.lines[k]));
function cabinPose(ctx, r) { const L = G.lines[r.line]; return pose(L, r.i, L.cabins.length, ctx.now(), geo(r.line)); }
function hint(ctx, h) { if ((ctx.self.state.gondolaHint ?? null) !== h) ctx.self.state.gondolaHint = h; }
// the nearest cabin standing at a station within reach of f, else null
function nearDocked(ctx, f) {
  for (const k in G.lines) {
    const L = G.lines[k], n = L.cabins.length;
    if (Math.hypot(L.a.x - f.x, L.a.z - f.z) > 40 && Math.hypot(L.a.x + L.to[0] - f.x, L.a.z + L.to[2] - f.z) > 40) continue;
    for (let i = 0; i < n; i++) {
      const p = pose(L, i, n, ctx.now(), geo(k));
      if (p.at && Math.hypot(p.x - f.x, p.z - f.z) <= G.board && Math.abs(p.y + G.floor - f.y) <= 2) return { k, i, p };
    }
  }
  return null;
}
function stepOff(ctx, r, p) {
  const me = ctx.self, L = G.lines[r.line];
  me.parent = null;
  me.feetPosition = dropPoint(L, p.at ?? r.from, p.side, geo(r.line));
  me.velocity = { x: 0, y: 0, z: 0 };
  delete me.state.gondola; me.state.gondolaHint = null;
  ctx.emit('playSound', { clip: G.boardSound, position: me.feetPosition, volume: 0.4, maxDistance: 20 });
}
export function onInput(ctx, input) {
  const me = ctx.self, r = me.state.gondola;
  if (r) {
    me.velocity = { x: 0, y: 0, z: 0 };
    if (input.pressed?.interact) { const p = cabinPose(ctx, r); if (p.at) stepOff(ctx, r, p); } // never mid-air
    return;
  }
  if (!input.pressed?.interact || me.parent) return;
  const f = me.worldFeetPosition || me.feetPosition; if (!f) return;
  const hit = nearDocked(ctx, f); if (!hit) return;
  const L = G.lines[hit.k];
  if (!ctx.getObject(L.cabins[hit.i])) return;
  me.parent = L.cabins[hit.i];
  me.feetPosition = { x: 0, y: G.floor + 0.05, z: 0.2 };
  me.rotation = 0; me.velocity = { x: 0, y: 0, z: 0 };
  me.state.gondola = { line: hit.k, i: hit.i, from: hit.p.at };
  me.state.gondolaHint = null;
  ctx.emit('playSound', { clip: G.boardSound, position: f, volume: 0.45, maxDistance: 20 });
}
export function update(ctx) {
  const me = ctx.self, r = me.state.gondola;
  if (!r) {
    if (!me.isLocal || ++near % 6) return; // a few times a second on the player's own machine
    const f = me.worldFeetPosition || me.feetPosition;
    hint(ctx, f && !me.parent && nearDocked(ctx, f) ? G.label : null);
    return;
  }
  const L = G.lines[r.line];
  if (!L || me.parent?.id !== L.cabins[r.i]) { delete me.state.gondola; hint(ctx, null); return; } // something else took the body off
  const p = cabinPose(ctx, r);
  hint(ctx, p.at ? 'E · step off' : null);
  if (p.at && p.at !== r.from && p.phase === 'dock') stepOff(ctx, r, p); // arrived: onto the far platform
}
