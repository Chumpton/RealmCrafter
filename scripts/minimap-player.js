// The minimap's server half (ui/hud/osmm-canvas.js sends these on the declared setSetting action, so no new binding is needed):
//   { id: 'mmZoom', v: 0..3 }        -> player.state.settings.mmZoom, the minimap's zoom, kept per player
//   { id: 'mmWalk', v: { x, z } }    -> player.state.walkTo, the same click-to-walk scripts/player.js already strolls (manual keys cancel it)
// settings-core's applySetting ignores both ids (not registry rows), so nothing else reacts to them.
const ZMAX = 3, REACH = 260; // 4 zoom levels; a minimap click never sends a walk farther than the widest view shows
export function onInput(ctx, input) {
  const me = ctx.self; if (me.isLocal === false || !input.pressed?.setSetting) return;
  const ss = input.actionData?.setSetting; if (!ss || typeof ss.id !== 'string') return;
  const s = me.state;
  if (ss.id === 'mmZoom') {
    const n = Math.round(+ss.v); if (!Number.isFinite(n) || n < 0 || n > ZMAX) return;
    const cur = s.settings && typeof s.settings === 'object' ? s.settings : {};
    if (cur.mmZoom !== n) s.settings = { ...cur, mmZoom: n };
  } else if (ss.id === 'mmWalk') {
    const x = +ss.v?.x, z = +ss.v?.z, f = me.feetPosition; if (!Number.isFinite(x) || !Number.isFinite(z) || !f) return;
    const d = Math.hypot(x - f.x, z - f.z); if (d < 0.6 || d > REACH) return;
    s.pendingInteract = null;
    s.walkTo = { x, z, until: ctx.now() + Math.max(15000, d / 2.2 * 1000 + 8000) }; // context-menu.js walkUntil's pace
  }
}
