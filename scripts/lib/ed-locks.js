// Editor locks (Outliner lane, creator 2026-10-09): a piece locked by its Outliner row (world.state.edLocked[id]) or by a locked
// layer (world.state.edLayers[name].locked) is passed over by the mouse pick. Read by scripts/build-tool-core.js resolvePick.
export function edLocked(ctx, hid) {
  const W = ctx.world?.state ?? {}, L = W.edLocked, Ls = W.edLayers; if (!L && !Ls) return false;
  const parts = String(hid ?? '').split('__')[0].split('/'), lay = Ls ? Object.values(Ls).filter((l) => l?.locked && l.ids?.length) : [];
  for (let i = 1; i <= parts.length; i++) { const id = parts.slice(0, i).join('/'); if (L?.[id]) return true; if (lay.some((l) => l.ids.includes(id))) return true; }
  return false;
}
