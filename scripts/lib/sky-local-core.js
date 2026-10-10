// sky-local's body — scripts/sky-local.js (the row's behavior) loads this by import() on first need, so it stays out of the arrival set.
// This screen's sky and grade: one local-only aurora, drawn while this player stands outside the hall and hidden under
// its roof, and the hall's warmer grade (look-hall.js) pushed on this player's screen while they are inside.
// The strength comes from the weather controller (place.state.aurora, 0..1). Checks twice a second; writes only on a change.
import { HALL_BOX } from './data/sky-local.js';
export const updateSchedule = { every: { seconds: 0.5 } };
const inside = (p) => p && p.x > HALL_BOX.x0 && p.x < HALL_BOX.x1 && p.z > HALL_BOX.z0 && p.z < HALL_BOX.z1 && p.y > HALL_BOX.y0 && p.y < HALL_BOX.y1;
export function update(ctx) {
  const me = ctx.self;
  if (!me.isLocal) { ctx.sleep(); return; }
  const amount = ctx.place.state.aurora ?? 0, p = me.worldFeetPosition || me.feetPosition;
  const sky = ctx.place.state.auroraSky ?? {}, prm = { amount: Math.round(amount * (0.35 + 0.65 * (sky.glow ?? 1)) * 100) / 100, act: sky.act ?? 0.5, speed: sky.speed ?? 1, crown: sky.crown ?? 1, flare: sky.flare ?? 0, pulse: sky.pulse ?? 0, north: sky.north ?? 180, drift: sky.drift ?? 0.6, bearing: sky.bearing ?? 0, arcs: sky.arcs ?? 0, seed: sky.seed ?? 0, veil: Math.round(Math.min(1, Math.max(0, (ctx.getObject('den-clouds')?.fx?.params?.cover ?? 0.3) - 0.35) / 0.6) * 10) / 10 };
  const key = JSON.stringify(prm);
  const under = inside(p);
  // this screen's grade: the warmer hall look under the roof, the place's outdoor look outside
  if (ctx.session.hallLook !== under) {
    if (under) me.look.push({ look: 'scripts/look-hall.js', fade: 1.2, priority: 1 });
    else me.look = [];
    ctx.session.hallLook = under;
  }
  const want = amount > 0; // W19b: the dome sits at sky distance, so the hall roof hides it by depth; doorways and the smoke hole still show it
  // one fixed id for this screen's aurora: a re-spawn replaces it and a destroy always finds it, whatever the handle read says
  const ID = 'sky-aurora-dome', on = ctx.session.domeOn === true;
  if (ctx.session.auroraOld !== true) { if (ctx.getObject('sky-aurora-local')) ctx.destroy('sky-aurora-local'); ctx.session.auroraOld = true; } // the old particle curtains retire
  if (want && !on) {
    ctx.spawn(ID, { audience: 'local', scope: 'session', feetPosition: { x: 0, y: -876, z: 0 }, tags: ['weather'], castShadow: false, receiveShadow: false, primitive: { kind: 'sphere', radius: 900, widthSegments: 32, heightSegments: 16 }, material: { kind: 'scripted', script: 'scripts/material-aurora-sky.js', params: prm } });
    ctx.session.domeOn = true; ctx.session.domeKey = key;
  } else if (!want && (on || ctx.session.domeOn === undefined)) {
    if (ctx.getObject(ID)) ctx.destroy(ID); ctx.session.domeOn = false;
  } else if (want && ctx.session.domeKey !== key) {
    const o = ctx.getObject(ID); if (o?.material) o.material.params = prm; ctx.session.domeKey = key;
  }
  // W1 watch fix: the drizzle haze is this screen's own, drawn only outdoors and only in light rain (the rain row's strength)
  const rp = ctx.getObject('home-weather-rain')?.fx?.params, rs = rp?.strength ?? 0, MID = 'rain-mist-local';
  const mistWant = !under && rs > 0 && rs < 0.33;
  const mprm = mistWant ? { strength: rs, dx: rp.dx ?? 0, dz: rp.dz ?? 0, speed: rp.speed ?? 0 } : null, mkey = mprm ? JSON.stringify(mprm) : '';
  if (mistWant && ctx.session.mistKey === undefined || mistWant && !ctx.session.mistKey) {
    ctx.spawn(MID, { audience: 'local', scope: 'session', feetPosition: { x: 0, y: 24, z: 0 }, tags: ['weather'], fx: { script: 'scripts/effects-den-mist.fx.js', params: mprm } });
    ctx.session.mistKey = mkey;
  } else if (!mistWant && ctx.session.mistKey !== '') {
    if (ctx.getObject(MID)) ctx.destroy(MID); ctx.session.mistKey = '';
  } else if (mistWant && ctx.session.mistKey !== mkey) {
    const o = ctx.getObject(MID); if (o?.fx) o.fx.params = mprm; ctx.session.mistKey = mkey;
  }
}
