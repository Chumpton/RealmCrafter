// The mead cask: E beside it pours — a glug, a short golden stream from the tap, skál! over the cask, and one more mead
// counted on the presser (player.state.mead). A short debounce keeps a held E from emptying the barrel in a breath.
const POUR = `fx
pop stream burst=28 life=.28..0.46 v=<0,-1,0>*(.15..1.3)+sdir()*.04 size=.016..0.028 acc=grav()*.6 col=hdr(1.9,1.1,.28) a=1>.8:1>0 sz=$size r=sprite(ember,add,velocity,.03)
pop spray burst=6 life=.25..0.4 v=up(.3..0.6)+sdir()*.35 size=.008..0.014 acc=grav() col=hdr(1.5,.85,.2) a=1>0 r=sprite(ember,add,velocity,.02)`;
export const ears = { press: (ctx, p) => pour(ctx, p && p.by) };
export function onSpawn(ctx) {}
function pour(ctx, by) {
  const s = ctx.self, now = ctx.now();
  if (now < (s.state.readyAt ?? 0)) return;
  s.state.readyAt = now + 900; s.state.pours = (s.state.pours ?? 0) + 1;
  const pl = (ctx.place.players || []).find((q) => q.id === by);
  if (pl) pl.state.mead = (pl.state.mead ?? 0) + 1;
  const f = s.worldFeetPosition || s.feetPosition, tap = { x: f.x, y: f.y + 0.55, z: f.z + 0.6 };
  ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-mead-pour-glug.mp3', position: tap, volume: 0.7, maxDistance: 14 });
  ctx.emit('fx', { position: tap, script: POUR });
  ctx.emit('damageNumber', { position: { x: f.x, y: f.y + 1.5, z: f.z + 0.2 }, text: 'skál!', color: '#f2c14e', size: 1.1, lifetime: 1.4 });
}
