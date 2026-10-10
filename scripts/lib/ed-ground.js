// Editor "drop to ground" (creator spec 2026-10-09): a ray straight down from the piece's pivot, ignoring the piece (and the
// rest of the selection), hitting meshes AND colliders AND terrain: a mug lands on the table, a crate on the deck, a rock on the hill.
// Shared by build-tool-core 'drop', build-multi 'drop' and the End key (scripts/ed-scatter-core.js).
import { raycast } from 'builtin/physics';
const r2 = (v) => Math.round(v * 100) / 100;
const terr = (ctx, x, z) => { const h = ctx.place.terrain?.heightAt?.(x, z); return typeof h === 'number' && isFinite(h) ? h : null; };
// the surface y under o's pivot; ignore = more ids to look through (the rest of a multi-selection)
export function surfaceY(ctx, o, ignore = []) {
  const p = o.worldFeetPosition ?? o.feetPosition, t = terr(ctx, p.x, p.z);
  let hit = null;
  try { hit = raycast(ctx, { x: p.x, y: p.y + 0.05, z: p.z }, { x: 0, y: -1, z: 0 }, { distance: 400, hits: 'both', ignoreEntities: [o.id, ...ignore, ctx.self.id], excludeTags: ['te-ret', 'player', 'bld-ghost'] }); } catch { hit = null; }
  const y = hit?.position?.y;
  if (typeof y === 'number' && isFinite(y)) return t != null && t > y ? t : y; // never below the ground
  return t ?? p.y; // sunk below the ground or nothing under it: the terrain
}
// lift above the surface a card asks for (lanterns hang, rugs float a hair)
export const baseLift = (o, PREFAB) => +(PREFAB?.[o.state?.pf]?.spec?.state?.lift ?? o.state?.lift ?? 0) || 0;
export const dropPos = (ctx, o, PREFAB, ignore) => { const p = o.feetPosition; return { x: p.x, y: r2(surfaceY(ctx, o, ignore) + baseLift(o, PREFAB)), z: p.z }; };
