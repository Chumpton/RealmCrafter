// A zone gate: step into the glow, cross to state.link. Pairs: main's zgate-<k> <-> zone-<k>'s zgate-home.
export function onTriggerEnter(ctx, other) {
  const link = ctx.self.state?.to ?? ctx.self.state?.link; // state.to: a plain door, no far-place view on its pane
  if (!link || !other) return;
  if (other.controller == null && !other.tags?.includes?.("player") && !other.userId) return; // bodies only
  ctx.cross(other, link);
}
export function onCross(ctx, other) {
  ctx.emit("playSound", { clip: "/cdn/moodboard-painterly-fantasy/sfx-portal-whoosh-chime.mp3", position: ctx.self.worldFeetPosition, volume: 0.6 });
}
export function onRefuse(ctx, other, verdict) {
  ctx.log("zone gate refused", verdict);
}
