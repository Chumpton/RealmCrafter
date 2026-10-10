// RAVEN ROADS: builders-only dev travel, opened from O → Den Systems (creator 2026-10-05). The sole writer of player.state.travelOpen.
import { TRAVEL, spotById } from './lib/data/travel.js';

let last = 0;
const RISE = `fx
pop sparks burst=40 on=disc(.6) life=.6..1.1 v=up(2..4)+sdir()*.4 size=.05..0.1 acc=drag(1.2) col=hdr(1.6,2.4,2.2)>hdr(.6,1.2,1.4) a=1>.6:1>0 sz=$size r=sprite(soft-disc,add)
pop ring burst=1 life=.5 size=1 sz=$size*(.4>2.6) col=hdr(.8,1.6,1.5) a=.8>0 r=sprite(soft-disc,add)`;

// SUMMON: an editor writes target.state.summon = { x, y, z, at, by }; the summoned body's own update() makes the jump.
function jump(ctx, to, keepBack) {
  const from = ctx.self.feetPosition;
  if (!keepBack) ctx.self.state.tpBack = { x: from.x, y: from.y, z: from.z }; // BACK: the last spot before any teleport
  ctx.emit('fx', { position: from, script: RISE });
  ctx.emit('playSound', { clip: TRAVEL.sound, position: from, volume: 0.7 });
  ctx.self.velocity = { x: 0, y: 0, z: 0 };
  ctx.self.feetPosition = to;
  ctx.emit('fx', { position: to, script: RISE });
  ctx.emit('playSound', { clip: TRAVEL.sound, position: to, volume: 0.7, pitch: 1.2 });
  ctx.emit('screenFlash', { color: '#bfe6dc', duration: 0.35, intensity: 0.35 }, { audience: { player: ctx.self.id } });
}
let seenSummon = 0, seenSendBack = 0, hold = null, seenDrag = 0, dragging = false; // hold: the summoned spot, pinned until this player moves or jumps
function toast(ctx, text) { ctx.emit('uiEvent', { name: 'toast', payload: { text } }, { audience: { player: ctx.self.id } }); }
function goBack(ctx) { // BACK: return to the spot before the last teleport, once
  const b = ctx.self.state.tpBack;
  if (!b || ctx.self.controlling) return false;
  hold = null; jump(ctx, { x: b.x, y: b.y, z: b.z }, true); delete ctx.self.state.tpBack; ctx.self.state.travelOpen = false;
  return true;
}
export function update(ctx) {
  const dg = ctx.self.state.dragTo; // an admin is dragging this body: ride their cursor, then stay where dropped
  if (dg && dg.at !== seenDrag && ctx.now() - dg.at < 1500 && !ctx.self.controlling) { seenDrag = dg.at; if (!dragging) { dragging = true; const f = ctx.self.feetPosition; ctx.self.state.tpBack = { x: f.x, y: f.y, z: f.z }; } hold = { x: dg.x, y: dg.y, z: dg.z };
    if (dg.done) { dragging = false; jump(ctx, hold, true); toast(ctx, `${dg.by ?? 'An admin'} moved you`); } }
  if (dragging && ctx.now() - seenDrag > 2500) dragging = false; // (Oct 9 rubber-banding) a drag whose 'done' never arrived used to pin the body forever
  if (hold) { ctx.self.velocity = { x: 0, y: 0, z: 0 }; ctx.self.feetPosition = hold; }
  const sb = ctx.self.state.sendBack; // the summoner sent this player home
  if (sb && sb.at !== seenSendBack) { seenSendBack = sb.at; if (ctx.now() - sb.at < 10000 && goBack(ctx)) toast(ctx, `${sb.by ?? 'Someone'} sent you back`); }
  const m = ctx.self.state.summon;
  if (!m || m.at === seenSummon) return;
  seenSummon = m.at;
  if (ctx.now() - m.at > 10000) return; // a stale summon from before a reload
  if (ctx.self.controlling) return;
  hold = { x: m.x, y: m.y, z: m.z };
  jump(ctx, hold);
  ctx.emit('uiEvent', { name: 'toast', payload: { text: `${m.by ?? 'Someone'} summoned you` } }, { audience: { player: ctx.self.id } });
}
function summon(ctx, data) {
  if (!ctx.self.isEditor) return;
  const me = ctx.self.feetPosition, yaw = (typeof ctx.self.rotation === 'number' ? ctx.self.rotation : ctx.self.rotation?.yaw) ?? 0;
  const others = ctx.place.players.filter((p) => p.id !== ctx.self.id && (data?.all || p.id === data?.id));
  others.forEach((p, i) => {
    const a = (yaw + 180 + (i - (others.length - 1) / 2) * 35) * Math.PI / 180; // a fan in front of the summoner
    const at = ctx.now() + i; // distinct per target
    p.state.summon = { x: me.x - Math.sin(a) * -2.2, y: me.y, z: me.z - Math.cos(a) * -2.2, at, by: ctx.self.displayName };
  });
  if (others.length) {
    ctx.self.state.summoned = others.map((p) => p.id).slice(0, 40);
    ctx.emit('fx', { position: me, script: RISE });
    ctx.emit('uiEvent', { name: 'toast', payload: { text: others.length === 1 ? `Summoning ${others[0].displayName}` : `Summoning ${others.length} travellers` } }, { audience: { player: ctx.self.id } });
  }
}

function gotoPlayer(ctx, id) { // GO TO: land 2 m in front of that player, facing them
  const t = ctx.place.players.find((p) => p.id === id && p.id !== ctx.self.id);
  if (!t) { toast(ctx, 'They are not here'); return; }
  if (ctx.self.controlling) { toast(ctx, 'Dismount first'); return; }
  const tp = ctx.getObject(t.id)?.feetPosition ?? t.feetPosition;
  if (!tp || !Number.isFinite(tp.x)) { toast(ctx, 'Could not find them'); return; }
  const r = t.rotation, yaw = typeof r === 'number' ? r : r?.yaw ?? (r && 'w' in r ? Math.atan2(2 * (r.w * r.y), 1 - 2 * r.y * r.y) * 180 / Math.PI : 0), a = yaw * Math.PI / 180;
  hold = null; jump(ctx, { x: tp.x - Math.sin(a) * 2.2, y: tp.y + 0.2, z: tp.z - Math.cos(a) * 2.2 });
  ctx.self.state.travelOpen = false;
  toast(ctx, `Travelled to ${t.displayName ?? 'them'}`);
}
function sendBack(ctx) { // the summoner returns everyone they brought to their own last spot
  if (!ctx.self.isEditor) return;
  const ids = ctx.self.state.summoned ?? [], at = ctx.now();
  let n = 0;
  ids.forEach((id, i) => { const p = ctx.place.players.find((q) => q.id === id); if (p) { p.state.sendBack = { at: at + i, by: ctx.self.displayName }; n++; } });
  delete ctx.self.state.summoned;
  toast(ctx, n ? `Sent ${n === 1 ? 'them' : n + ' travellers'} back` : 'Nobody to send back');
}
export function onInput(ctx, input) {
  const s = ctx.self.state;
  if (hold && !dragging && (Math.abs(input?.axes?.moveX ?? 0) > 0.2 || Math.abs(input?.axes?.moveZ ?? 0) > 0.2 || input?.pressed?.jump || input?.held?.jump)) hold = null; // they moved: let go
  // creator 2026-10-05: "u teleport go to dev section. OSRS teleports only": Raven Roads is a builder's tool (O → Den Systems); players travel by the spellbook
  if (!ctx.self.isEditor) { if (s.travelOpen) s.travelOpen = false; return; }
  if (input?.pressed?.travelGoto || input?.pressed?.travelBack) { const now = ctx.now(); if (now - last < TRAVEL.cooldownMs) return; last = now; if (input.pressed.travelBack) { if (!goBack(ctx)) toast(ctx, 'Nowhere to go back to'); } else gotoPlayer(ctx, input.actionData?.travelGoto?.id); return; }
  if (input?.pressed?.travelSendBack) { sendBack(ctx); return; }
  if (input?.pressed?.travelPanel) { s.travelOpen = !s.travelOpen; return; }
  if (input?.pressed?.travelSummon) { summon(ctx, input.actionData?.travelSummon); return; }
  if (!input?.pressed?.travelGo) return;
  const spot = spotById(input.actionData?.travelGo?.id);
  if (!spot) return;
  const now = ctx.now();
  if (now - last < TRAVEL.cooldownMs) return;
  last = now;
  const from = ctx.self.feetPosition;
  s.tpBack = { x: from.x, y: from.y, z: from.z }; hold = null;
  const gy = spot.fixedY ? spot.y : (ctx.place.terrain?.heightAt?.(spot.x, spot.z) ?? spot.y ?? 30) + TRAVEL.lift;
  const to = { x: spot.x, y: gy, z: spot.z };
  ctx.emit('fx', { position: from, script: RISE });
  ctx.emit('playSound', { clip: TRAVEL.sound, position: from, volume: 0.7 });
  const mount = ctx.self.controlling; // creator 2026-10-09: travel works mounted, the griffin or horse comes along
  if (mount) { mount.velocity = { x: 0, y: 0, z: 0 }; mount.feetPosition = { x: to.x, y: to.y + (mount.state?.flying ? 6 : 0), z: to.z }; }
  else { ctx.self.velocity = { x: 0, y: 0, z: 0 }; ctx.self.feetPosition = to; }
  s.travelOpen = false;
  ctx.emit('fx', { position: to, script: RISE });
  ctx.emit('playSound', { clip: TRAVEL.sound, position: to, volume: 0.7, pitch: 1.2 });
  ctx.emit('screenFlash', { color: '#bfe6dc', duration: 0.35, intensity: 0.35 }, { audience: { player: ctx.self.id } });
}
