import { KILL_QUESTS } from './lib/data/quests.js';
// STARTER MONSTERS (S12): the player's side. What monsters do TO a player: hits, death, loot into the pack.
// player.state.hp stays combat-player's field; this file only steps it down from a monsterHit event and refills it on death.
import { tpOn, tpMaxHp } from './lib/data/talents.js';
import { DEATH, LOOT } from './lib/data/monsters.js';
import { lootList, takeLoot } from './lib/loot-core.js';
import { yawOfRot, relBearing } from './lib/standoff.js';
import { levelOf, normInv } from './lib/skills-core.js';
import { GA } from './lib/data/gather.js';
import { CB } from './lib/data/combat.js';
import { splitDeath, openGrave } from './lib/death-core.js';
import { mods as prayMods } from './lib/prayer-core.js';
import { PRAYER } from './lib/data/prayers.js';
const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const say = (ctx, me, text) => ctx.emit('skillMsg', { text }, { to: me.id });
export function lootPublic(ctx, { ids, specs }) { // the owner's private window is over: what is left lies in the open
  ids.forEach((id, k) => { if (ctx.getObject(id)) { ctx.destroy(id); const s = specs[k]; ctx.spawn({ ...s.spec, audience: 'all', lifetime: s.life }); } });
}
export function respawnMe(ctx) { // 2.4 s after the fall: back at the spawn point with full health
  const me = ctx.self; if (me.isLocal === false || !me.state.dead) return;
  me.state.dead = false; me.state.hp = tpOn(me.state) ? tpMaxHp(me.state) : levelOf(me.state.skills?.hitpoints ?? CB.hpStartTenths);
  { const at = here(me), R = DEATH.respawn, dR = Math.hypot(R.x - at.x, R.z - at.z); // an editor Respawn node nearer than home wins
    const rn = ctx.query({ tags: ['ed-node'], center: at, radius: dR }).find((n) => n.state?.k === 'respawn');
    me.feetPosition = rn ? { x: rn.feetPosition.x, y: rn.feetPosition.y + 0.2, z: rn.feetPosition.z } : { x: R.x, y: R.y, z: R.z }; }
  ctx.emit('uiEvent', { name: 'respawn', payload: {} }, { audience: { player: me.id } });
}
export const ears = {
  monsterHit: (ctx, p) => {
    const me = ctx.self; if (me.isLocal === false || !CB.on) return;
    const s = me.state, prot = prayMods(me.state.prayer).protect === (p?.style ?? 'melee') && (p?.dmg | 0) > 0, dmg = prot ? 0 : Math.max(0, Math.min(5, p?.dmg | 0)), at = { ...here(me), y: here(me).y + 1.9 };
    if (s.dead) return;
    if (s.zone === 'safe' && p?.style !== 'hazard') return; // editor Safe zone volume (scripts/ed-logic-player.js)
    if (p?.mon && s.autoRet !== false && !s.fight && !s.dead) ctx.emit('cbEngage', { target: p.mon }, { to: me.id }); // auto-retaliate (creator Oct 5): a goblin that jumps you gets fought back
    s.hurtAt = ctx.now(); // any attack on you, even a dodged one, interrupts a Home Teleport cast
    ctx.emit('damageNumber', dmg > 0 ? { position: at, text: `-${dmg}`, color: '#ff3b2f', size: 1.15, lifetime: 1.1 } : { position: at, text: prot ? 'Protected' : 'Dodge', color: '#cfd6ff', size: 0.9, lifetime: 0.9 });
    if (!dmg || typeof s.hp !== 'number') return;
    const aud = { audience: { player: me.id } };
    const yw = yawOfRot(me.rotation), rel = p?.from && yw != null ? relBearing(here(me), p.from, yw) : null; // where it came from, in degrees off your view centre (+ = right)
    ctx.emit('uiEvent', { name: 'hurt', payload: { dmg, rel } }, aud);
    ctx.emit('screenShake', { intensity: 0.1 + dmg * 0.05, duration: 0.22 }, aud);
    ctx.emit('cameraPunch', { direction: { x: ctx.random() - 0.5, y: 0.6, z: ctx.random() - 0.5 }, intensity: 0.2 + dmg * 0.08 }, aud);
    ctx.emit('hitstop', { duration: 0.04 }, aud);
    const ward = (s.wardUntil ?? 0) > ctx.now() ? Math.max(0, Math.min(1, s.wardPct ?? 0.5)) : 0; // a class defensive (Ice Block, Shield Wall…) takes its share off
    s.hp = Math.max(0, s.hp - Math.max(ward ? 0 : 1, Math.round(dmg * (1 - ward))));
    if (s.hp > 0) return;
    // OSRS death: full health, back at the spawn point with your 3 dearest items; the rest and your coins wait in a gravestone where you fell
    const sp = splitDeath(normInv(s.inv), s.supplies?.coins | 0, prayMods(s.prayer).keep ? PRAYER.protectItemKeeps : DEATH.keep, s.equip), pos = here(me);
    s.fight = null; s.hp = tpOn(s) ? tpMaxHp(s) : levelOf(s.skills?.hitpoints ?? CB.hpStartTenths);
    if (sp.lost.length || sp.coins) {
      s.inv = sp.inv; s.equip = sp.equip; s.cbWeapon = s.equip.weapon ?? 'unarmed'; s.supplies = { ...(s.supplies ?? {}), coins: 0 };
      ctx.spawn({ tags: ['gravestone', 'interactable'], behavior: 'scripts/gravestone.js', physics: 'static', lifetime: DEATH.graveSec, castShadow: true,
        feetPosition: { x: pos.x, y: pos.y, z: pos.z }, rotation: { yaw: Math.round(ctx.random() * 360) },
        primitive: { kind: 'scripted', script: 'scripts/gen/gravestone.js', params: {} },
        state: { owner: me.id, name: me.name ?? 'someone', items: sp.lost, coins: sp.coins } });
    }
    s.dead = true; s.hp = 0; s.prayer = null; ctx.after(2.4, 'respawnMe', {}); // every prayer goes off, and the points come back full with the respawn
    const aud2 = { audience: { player: me.id } };
    ctx.emit('uiEvent', { name: 'dead', payload: {} }, aud2);
    ctx.emit('slowMo', { scale: 0.25, duration: 1.1, easing: true }, aud2);
    ctx.emit('screenFlash', { color: 'oklch(0.5 0.25 25)', duration: 0.6, intensity: 0.6 }, aud2);
    ctx.emit('screenShake', { intensity: 0.3, duration: 0.5 }, aud2);
    say(ctx, me, sp.lost.length || sp.coins ? `${DEATH.msg} Your gravestone marks where you fell.` : DEATH.msg);
  },
  graveLoot: (ctx, p) => { // E on your gravestone: what fits comes back, the rest stays in it
    const me = ctx.self; if (me.isLocal === false || !p?.grave || !Array.isArray(p.items)) return;
    const s = me.state, r = openGrave(normInv(s.inv), p.items.filter((id) => typeof id === 'string').slice(0, 28), Math.max(0, p.coins | 0));
    s.inv = r.inv; if (r.coins) s.supplies = { ...(s.supplies ?? {}), coins: (s.supplies?.coins | 0) + r.coins };
    ctx.emit('graveLeft', { items: r.items }, { to: p.grave });
    say(ctx, me, r.items.length ? 'Your pack is full: the rest stays in the gravestone.' : `You gather your things${r.coins ? ` and ${r.coins} coins` : ''} from the gravestone.`);
  },
  monsterLoot: (ctx, p) => {
    { const me = ctx.self, q = KILL_QUESTS[p.kind]; if (q && me.state.quests?.[q.id] === 'active') me.state.qc = { ...(me.state.qc ?? {}), [q.flag]: ((me.state.qc?.[q.flag]) | 0) + 1 }; } // a kill quest counts the fallen // loot lies where the monster died: only the one who killed it sees it for LOOT.ownerSec, then everyone, until it is gone
    const me = ctx.self; if (me.isLocal === false || !p) return;
    const list = lootList(p), at = p.at ?? here(me), ids = [], specs = [];
    list.forEach((e, k) => {
      const a = (k / Math.max(1, list.length)) * Math.PI * 2 + ctx.random(), r = list.length > 1 ? 0.45 + ctx.random() * 0.3 : 0, x = at.x + Math.cos(a) * r, z = at.z + Math.sin(a) * r;
      const spec = { tags: ['loot', 'interactable'], behavior: 'scripts/loot-drop.js', physics: 'static', feetPosition: { x, y: ctx.place.terrain.heightAt(x, z), z }, rotation: { yaw: Math.round(ctx.random() * 360) },
        primitive: { kind: 'scripted', script: 'scripts/gen/loot-drop.js', params: { kind: e.kind, color: e.color } }, state: { key: e.key, id: e.id, n: e.n, name: e.name } };
      ids.push(ctx.spawn({ ...spec, audience: 'local', lifetime: LOOT.ownerSec + 1 }));
      specs.push({ spec, life: e.life - LOOT.ownerSec });
    });
    if (specs.length) ctx.after(LOOT.ownerSec, 'lootPublic', { ids, specs });
    if (p.rare) say(ctx, me, 'A rare drop! The bull leaves a heavy leg bone, big as a club.');
    ctx.emit('uiEvent', { name: 'lootDropped', payload: { n: list.length } }, { audience: { player: me.id } });
  },
  lootTake: (ctx, p) => { // E / "Take" on a drop
    const me = ctx.self; if (me.isLocal === false || !p?.obj) return;
    const o = ctx.getObject(p.obj); if (!o?.tags?.includes?.('loot')) return;
    const pos = here(o), mine = here(me); if (Math.hypot(pos.x - mine.x, pos.z - mine.z) > (p.grab ? 10.6 : LOOT.reach)) return say(ctx, me, "You can't reach that from here.");
    const st = o.state, r = takeLoot(normInv(me.state.inv), me.state.supplies, { key: st.key, id: st.id, n: st.n | 0, name: String(st.name ?? '') });
    if (r.err) return say(ctx, me, r.err);
    me.state.inv = r.inv; me.state.supplies = r.supplies; ctx.destroy(p.obj); say(ctx, me, r.msg);
    ctx.emit('uiEvent', { name: 'lootTaken', payload: {} }, { audience: { player: me.id } });
  },
};
