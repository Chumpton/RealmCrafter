// Equipment (plan sections 24 and 29): SOLE writer of player.state.equip. The 11 slots live here; wearing and taking off move items between the pack
// and a slot, and the wielded weapon id is mirrored into state.cbWeapon (combat-player.js reads that) with a style that suits it.
// First visit: the start kit (bronze sword + wooden shield + staff of air); players who were here before also receive their old iron weapons once.
import { levelOf, normInv } from './lib/skills-core.js';
import { wear, takeOff, startKit, defOf } from './lib/equip-core.js';
import { weaponOf, styleOf } from './lib/combat-core.js';
import { ARROWS } from './lib/data/fletch.js';
const say = (ctx, me, text) => ctx.emit('skillMsg', { text }, { to: me.id });
function mirror(s) { // the weapon in your hands decides the fight: keep cbWeapon and a valid style in step
  const id = s.equip?.weapon ?? 'unarmed', w = weaponOf(id);
  s.cbWeapon = w.id; s.cbStyle = styleOf(w, s.cbStyle).id;
}
function ensure(me) {
  const s = me.state; if (s.equipInit) return;
  const old = Object.entries(s.skills ?? {}).some(([k, v]) => v > (k === 'hitpoints' ? 11540 : 0)), k = startKit(normInv(s.inv), s.equip, old);
  s.inv = k.inv; s.equip = k.equip; s.equipInit = 1; mirror(s);
}
export function onSpawn(ctx) { if (ctx.self.isLocal !== false) ensure(ctx.self); }
function doWear(ctx, me, i) {
  ensure(me); const s = me.state, r = wear(normInv(s.inv), s.equip, i | 0, levelOf(s.skills?.ranged | 0), (k) => levelOf(s.skills?.[k] | 0));
  if (r.err) return say(ctx, me, r.err);
  s.inv = r.inv; s.equip = r.equip; mirror(s); say(ctx, me, r.msg);
  ctx.emit('playSound', { clip: '/cdn/moodboard-lowpoly-cozy/sfx-sword-swing-whoosh.mp3', position: me.worldFeetPosition ?? me.feetPosition, volume: 0.35, pitch: 1.3 });
}
export function onInput(ctx, input) {
  const me = ctx.self; if (me.isLocal === false) return;
  const pr = input.pressed ?? {}, d = input.actionData ?? {};
  if (pr.equip) doWear(ctx, me, d.equip?.i);
  if (pr.ammoCycle) { // click the Ammo slot: next arrow tier you carry
    const s = me.state, sup = s.supplies ?? {}, have = ARROWS.filter((a) => (sup[a.arrows] | 0) > 0);
    if (!have.length) return say(ctx, me, 'You have no arrows.');
    const i = have.findIndex((a) => a.arrows === s.equip?.ammo), a = have[(i + 1) % have.length];
    s.equip = { ...(s.equip ?? {}), ammo: a.arrows }; say(ctx, me, `You ready your ${a.name.toLowerCase()} arrows.`);
  }
  if (pr.unequip) {
    ensure(me); const s = me.state, r = takeOff(normInv(s.inv), s.equip, String(d.unequip?.slot));
    if (r.err) return say(ctx, me, r.err);
    s.inv = r.inv; s.equip = r.equip; mirror(s); say(ctx, me, r.msg);
  }
}
export const ears = { equipItem: (ctx, p) => { if (ctx.self.isLocal !== false && Number.isFinite(p?.i)) doWear(ctx, ctx.self, p.i); } };
