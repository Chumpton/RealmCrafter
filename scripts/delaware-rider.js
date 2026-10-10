// Mount Delaware carriage rider (on every player): E within 6 m of a carriage takes a free seat (parent = carriage, seat-local feet);
// E again or jump steps off beside the cab. The seat list lives on the carriage's state.seats; who sits where is the rider's own state.
const CARRIAGES = ['delaware-carriage-1', 'delaware-carriage-2'];
function stepOff(ctx) {
  const me = ctx.self, c = me.parent ? ctx.getObject(me.parent.id) : null;
  const f = me.worldFeetPosition || me.feetPosition;
  me.parent = null;
  const yaw = ((c?.rotation?.yaw ?? 0) * Math.PI) / 180;
  const x = f.x + Math.cos(yaw) * 2.4, z = f.z - Math.sin(yaw) * 2.4; // out the side door
  const y = ctx.place.terrain.heightAt(x, z) ?? f.y;
  me.feetPosition = { x, y: y + 0.05, z };
  me.velocity = { x: 0, y: 0, z: 0 };
  delete me.state.dlwSeat;
}
export function onInput(ctx, input) {
  const me = ctx.self, riding = me.state.dlwSeat != null && me.parent && CARRIAGES.includes(me.parent.id);
  if (riding) { if (input.pressed?.interact || input.pressed?.jump) stepOff(ctx); else me.velocity = { x: 0, y: 0, z: 0 }; return; }
  if (!input.pressed?.interact) return;
  const f = me.feetPosition;
  for (const id of CARRIAGES) {
    const c = ctx.getObject(id); if (!c) continue;
    const cf = c.feetPosition; if (Math.hypot(cf.x - f.x, cf.z - f.z) > 6) continue;
    const seats = c.state?.seats || [{ x: 0, y: 1.1, z: 0.3 }];
    const taken = new Set(ctx.place.players.filter((p) => p.id !== me.id && ctx.getObject(p.id)?.parent?.id === id).map((p) => p.state?.dlwSeat));
    const i = seats.findIndex((_, k) => !taken.has(k)); if (i < 0) return;
    me.parent = id; me.feetPosition = { x: seats[i].x, y: seats[i].y, z: seats[i].z }; me.rotation = 0; me.velocity = { x: 0, y: 0, z: 0 };
    me.state.dlwSeat = i;
    ctx.emit('playSound', { clip: '/cdn/moodboard-painterly-fantasy/sfx-carriage-door-wood-creak.mp3', position: cf, volume: 0.5, maxDistance: 20 });
    return;
  }
}
export function update(ctx) {
  const me = ctx.self;
  if (me.state.dlwSeat != null && !(me.parent && CARRIAGES.includes(me.parent.id))) delete me.state.dlwSeat;
}
