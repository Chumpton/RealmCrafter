// HEARTHSTONE + PORTAL STONE: the player's own channel. Sole writer of player.state.stoneCast and player.state.hearthCd.
import { STONES, zoneById } from './lib/data/stones.js';
const SWIRL = `fx
pop ring n=1 life=3 size=1.6 sz=$size*(.6>1:1) col=hdr(.6,1.2,2.2) a=.5 rot=$age*2 r=sprite(soft-disc,add)
pop motes rate=40 on=disc(.8) life=.6..1 v=up(1.2..2) size=.04..0.08 acc=drag(1) col=hdr(.8,1.4,2.4)>hdr(.3,.6,1.4) a=1>0 r=sprite(soft-disc,add)`;
const BURST = `fx
pop sparks burst=50 on=disc(.6) life=.6..1.1 v=up(2..4)+sdir()*.5 size=.05..0.1 acc=drag(1.2) col=hdr(1.2,1.8,2.6)>hdr(.4,.8,1.6) a=1>0 sz=$size r=sprite(soft-disc,add)
pop flash burst=1 life=.4 size=1.2 sz=$size*(.4>3) col=hdr(1,1.6,2.4) a=.8>0 r=sprite(soft-disc,add)`;
const toast = (ctx, text) => ctx.emit('uiEvent', { name: 'toast', payload: { text } }, { audience: { player: ctx.self.id } });
let swirlId = null;
function stop(ctx, why) {
  delete ctx.self.state.stoneCast;
  if (swirlId && ctx.place.objects[swirlId]) delete ctx.place.objects[swirlId];
  swirlId = null;
  if (why) toast(ctx, why);
}
function begin(ctx, kind, zone) {
  const s = ctx.self.state, now = ctx.now();
  if (s.stoneCast) return;
  if (ctx.self.controlling) return toast(ctx, 'Not while riding');
  if (kind === 'hearth' && (s.hearthCd ?? 0) > now) return toast(ctx, `Hearthstone ready in ${Math.ceil((s.hearthCd - now) / 1000)}s`);
  const f = ctx.self.feetPosition;
  s.stoneCast = { kind, zone: zone ?? null, start: now, end: now + STONES.castMs, at: { x: f.x, z: f.z }, name: kind === 'hearth' ? 'Hearthstone' : `Portal: ${zoneById(zone)?.name ?? zone}` };
  swirlId = ctx.spawn({ feetPosition: { x: f.x, y: f.y + 0.05, z: f.z }, fx: { script: SWIRL }, lifetime: STONES.castMs / 1000 + 0.5, tags: ['fx'] });
  ctx.emit('playSound', { clip: STONES.sound, position: f, volume: 0.35, pitch: 0.7 });
}
function finish(ctx) {
  const c = ctx.self.state.stoneCast; stop(ctx);
  const from = ctx.self.feetPosition;
  ctx.emit('fx', { position: from, script: BURST });
  ctx.emit('playSound', { clip: STONES.sound, position: from, volume: 0.7 });
  ctx.emit('screenFlash', { color: '#bfd8ff', duration: 0.35, intensity: 0.35 }, { audience: { player: ctx.self.id } });
  if (c.kind === 'hearth') {
    ctx.self.state.hearthCd = ctx.now() + STONES.hearthCdMs;
    if (ctx.self.place === STONES.hearth.place) { ctx.self.velocity = { x: 0, y: 0, z: 0 }; ctx.self.feetPosition = STONES.hearth.to; ctx.emit('fx', { position: STONES.hearth.to, script: BURST }); }
    else ctx.cross(ctx.self, `+${STONES.hearth.place}#${STONES.hearth.anchor}`);
    return;
  }
  const z = zoneById(c.zone); if (!z) return;
  if (z.id === 'main' && ctx.self.place === 'main') { ctx.self.feetPosition = STONES.hearth.to; return; }
  const r = ctx.cross(ctx.self, z.to);
  if (r && r.crossed === false) toast(ctx, `${z.name} is closed: ${r.verdict?.message ?? 'refused'}`);
}
export function onInput(ctx, input) {
  if (input.pressed?.hearth) begin(ctx, 'hearth');
  if (input.pressed?.stonePortal) { const z = input.actionData?.stonePortal?.zone; if (zoneById(z)) begin(ctx, 'portal', z); }
  if (input.pressed?.stoneCancel && ctx.self.state.stoneCast) stop(ctx, 'Cancelled');
}
export function update(ctx) {
  const c = ctx.self.state.stoneCast;
  if (!c) { ctx.sleep(); return; }
  const f = ctx.self.feetPosition;
  if (Math.hypot(f.x - c.at.x, f.z - c.at.z) > STONES.moveCancel) return stop(ctx, 'Interrupted: you moved');
  if (ctx.now() >= c.end) finish(ctx);
}
