// MMO prompt 4/6: Fishing, Cooking, Firemaking on the player's own body. Called from scripts/skills-player.js
// (still the one writer of skills/inv). The act rides player.state.act = { k: fish|cook|fire, ph, from, … } on the 0.6 s tick.
import { GA, TOOLS, SUPPLY_NAMES, GSOUNDS, RANGES } from "./data/gather.js";
import { ITEMS } from "./data/skills.js";
import { levelOf, toTenths, normInv } from "./skills-core.js";
import * as F from "./fletch-play.js";
import { fishOf, cookOf, logOf, spotOptions, rollCatch, burnChance, lightChance, rayNear } from "./gather-core.js";

const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lvl = (s, k) => levelOf(s.skills?.[k] | 0);
const toolName = (id) => TOOLS.find((t) => t.id === id)?.name?.toLowerCase() ?? id;
let H = null; // { grant, say, stopChop }
export function bind(h) { H = h; }

export function ensureKit(s) {
  if (s.gatherKit) return null;
  const inv = normInv(s.inv);
  for (const id of ["tinderbox", "small-net"]) { if (!inv.some((x) => x?.id === id)) { const i = inv.indexOf(null); if (i >= 0) inv[i] = { id }; } }
  s.gatherKit = 1;
  if (!s.supplies) s.supplies = { bait: 0, feathers: 0, sbait: 0 };
  return inv;
}
export function stopAct(ctx, me, why) { if (me.state.act) me.state.act = null; if (me.anim?.gather) me.anim.gather = null; if (why) H.say(ctx, me, why); }

// ---------- picking along the pointer ray ----------
export function pickRay(input, me) { const r = ray(input); if (!r) return null; const p = here(me); if (Math.hypot(r.o.x - p.x, r.o.z - p.z) > 1.5) r.o = { x: p.x, y: p.y + 1.6, z: p.z }; return r; }
function ray(input) {
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== "number" || typeof a.pointerOriginX !== "number") return null;
  return { o: { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }, d: { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 } };
}
function nearest(r, rows, perpMax, lift = 0) {
  let best = null, bp = perpMax;
  for (const row of rows) { const p = row.feetPosition; const n = rayNear(r.o, r.d, { x: p.x, y: p.y + lift, z: p.z }); if (n.along > 0 && n.along < GA.pickDist && n.perp < bp) { bp = n.perp; best = row; } }
  return best;
}
const cookSources = (ctx, p, radius = 8) => {
  const out = ctx.query({ tags: ["cook-fire"], center: p, radius }).filter((r) => !r.state?.ash).map((r) => ({ ...r, range: false, reach: GA.cookReach }));
  for (const [id, R] of Object.entries(RANGES)) { const o = ctx.getObject(id); if (o) { const f = here(o); if (flat(f, p) < radius + R.reach) out.push({ id, feetPosition: f, range: true, reach: R.reach, name: R.name }); } }
  return out;
};
const reachOf = (src, p) => flat(src.feetPosition, p) <= src.reach;

// returns true when the click was ours
export function onUse(ctx, me, input) {
  if (!GA.on) return false;
  const r = ray(input); if (!r) return false;
  const p = here(me), s = me.state;
  if (Math.hypot(r.o.x - p.x, r.o.z - p.z) > 4) r.o = { x: p.x, y: p.y + 1.6, z: p.z }; // a camera not yet caught up to the body (just teleported): aim from the eye
  const crate = nearest(r, ctx.query({ tags: ["tackle-crate"], center: p, radius: 12 }), GA.pickPerp.crate, 0.4);
  if (crate) { takeTackle(ctx, me, crate); return true; }
  const spot = nearest(r, ctx.query({ tags: ["fishing-spot"], center: p, radius: 20 }), GA.pickPerp.spot, 0.1);
  if (spot) { startFish(ctx, me, spot); return true; }
  const src = nearest(r, cookSources(ctx, p, 10), GA.pickPerp.fire, 0.3);
  if (src) {
    const inv = normInv(s.inv), raw = inv.find((x) => x && ITEMS[x.id]?.raw);
    if (!raw) { H.say(ctx, me, "You have nothing raw to cook."); return true; }
    startCook(ctx, me, raw.id, src); return true;
  }
  return false;
}

// a click on a pack slot that isn't food
export function onInvUse(ctx, me, i) {
  const s = me.state, inv = normInv(s.inv), it = inv[i], def = it && ITEMS[it.id]; if (!def) return false;
  const p = here(me);
  if (def.raw) {
    const src = cookSources(ctx, p, 4).filter((x) => reachOf(x, p)).sort((a, b) => flat(a.feetPosition, p) - flat(b.feetPosition, p))[0];
    if (!src) { H.say(ctx, me, "You need to stand by a fire or the long hearth to cook that."); return true; }
    startCook(ctx, me, it.id, src); return true;
  }
  if (it.id.startsWith("logs-")) { startFire(ctx, me, it.id); return true; }
  if (it.id === "tinderbox") { const lg = inv.find((x) => x?.id?.startsWith("logs-")); if (!lg) H.say(ctx, me, "You have no logs to light."); else startFire(ctx, me, lg.id); return true; }
  if (def.tool === "fish") { H.say(ctx, me, `Click a fishing spot on the lake to use your ${toolName(it.id)}.`); return true; }
  if (def.burnt) { H.say(ctx, me, "It's burnt to a crisp. Right-click to drop it."); return true; }
  return false;
}

// ---------- the tackle crate ----------
function takeTackle(ctx, me, crate) {
  const s = me.state, p = here(me);
  if (flat(crate.feetPosition, p) > 3.5) return H.say(ctx, me, "Get closer to the tackle crate.");
  const inv = normInv(s.inv), got = [];
  for (const t of TOOLS) if (!inv.some((x) => x?.id === t.id)) { const i = inv.indexOf(null); if (i < 0) break; inv[i] = { id: t.id }; got.push(t.name.toLowerCase()); }
  s.inv = inv;
  const sup = { ...(s.supplies ?? {}) }; let topped = false;
  for (const [k, v] of Object.entries(GA.supplyTop)) if ((sup[k] | 0) < v) { sup[k] = v; topped = true; }
  s.supplies = sup;
  ctx.emit("playSound", { clip: GSOUNDS.crate, position: crate.feetPosition, volume: 0.7, maxDistance: 15 });
  H.say(ctx, me, got.length ? `You take a ${got.join(", ")}${topped ? " and top up your bait and feathers" : ""}.` : topped ? "You top up your bait and feathers." : inv.includes(null) ? "You already have everything the crate holds." : "Your pack is too full to take any tackle.");
}

// ---------- fishing ----------
function startFish(ctx, me, spot, tool) { // tool: the verb picked in the right-click menu (Net, Bait, Lure, Cage, Harpoon); none = a left click, the best fish you can catch
  const s = me.state, p = here(me), L = lvl(s, "fishing");
  if (flat(spot.feetPosition, p) > GA.fishReach) return H.say(ctx, me, "Get closer to the fishing spot.");
  const o = spotOptions(spot.state?.kind, L, s.inv, s.supplies);
  if (tool && o.can.length) { o.can = o.can.filter((f) => f.tool === tool); if (!o.can.length) return H.say(ctx, me, `You can't catch anything here with your ${toolName(tool)} yet.`); }
  if (!o.can.length) {
    if (o.why === "level") return H.say(ctx, me, `You need a Fishing level of ${o.need} to fish here.`);
    if (o.why === "tool") return H.say(ctx, me, `You need a ${toolName(o.tool)} to fish here. The tackle crate by the jetty has one.`);
    return H.say(ctx, me, `You don't have any ${SUPPLY_NAMES[o.supply]?.toLowerCase() ?? "bait"}. The tackle crate by the jetty has some.`);
  }
  if (!normInv(s.inv).includes(null)) return H.say(ctx, me, "You can't carry any more fish.");
  H.stopChop(ctx, me);
  s.act = { k: "fish", spot: spot.id, tool, ph: 0, from: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } };
  ctx.emit("playSound", { clip: GSOUNDS.cast, position: spot.feetPosition, volume: 0.7, maxDistance: 25 });
  H.say(ctx, me, o.can[0].tool === "small-net" ? "You cast out your net..." : o.can[0].tool === "harpoon" ? "You start harpooning fish." : o.can[0].tool === "lobster-pot" ? "You attempt to catch a lobster." : "You cast out your line...");
}
const SPLASH = `fx
pop drop burst=8..12 on=disc(.4) life=.4..0.7 v=up(1.2..2.4)+sdir()*.6 size=.03..0.06 acc=grav() col=<.85,.95,1> a=.9>0 r=sprite(soft-disc,alpha)
pop foam burst=3 on=disc(.3) life=.6..1 v=sdir()*.4 size=.25..0.4 acc=drag(2) col=<.95,.97,1> a=0>.5:.2>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
function fishTick(ctx, me, a) {
  const s = me.state, spot = ctx.getObject(a.spot);
  if (!spot) return stopAct(ctx, me, null);
  const sp = here(spot), p = here(me);
  if (flat(sp, p) > GA.fishReach + 0.5) return stopAct(ctx, me, "The fishing spot has moved.");
  const ph = ((a.ph | 0) + 1) % GA.fishTicks;
  s.act = { ...a, ph };
  if (ph === 2) ctx.emit("fx", { position: { x: sp.x, y: 0.05, z: sp.z }, script: SPLASH });
  if (ph !== 0) return;
  const L = lvl(s, "fishing"), o = spotOptions(spot.state?.kind, L, s.inv, s.supplies);
  const can = a.tool ? o.can.filter((f) => f.tool === a.tool) : o.can;
  if (!can.length) return stopAct(ctx, me, o.why === "supply" ? "You have run out of bait." : null);
  const f = rollCatch(can, L, () => ctx.random());
  if (!f) return;
  const inv = normInv(s.inv), i = inv.indexOf(null); if (i < 0) return stopAct(ctx, me, "You can't carry any more fish.");
  inv[i] = { id: `raw-${f.id}` }; s.inv = inv;
  if (f.supply) s.supplies = { ...(s.supplies ?? {}), [f.supply]: Math.max(0, (s.supplies?.[f.supply] | 0) - 1) };
  H.grant(ctx, me, "fishing", toTenths(f.xp));
  ctx.emit("playSound", { clip: GSOUNDS.catch, position: p, volume: 0.6, pitch: 0.9 + ctx.random() * 0.2 });
  ctx.emit("fx", { position: { x: sp.x, y: 0.05, z: sp.z }, script: SPLASH });
  H.say(ctx, me, `You catch ${/s$/.test(f.name) ? "some" : "a"} ${f.name.toLowerCase()}.`);
  if (!inv.includes(null)) stopAct(ctx, me, "You can't carry any more fish.");
}

// the right-click menu (context-menu.js -> skills-player ears fishSpot / cookAt)
export function fishAt(ctx, me, spotId, tool) { const spot = ctx.getObject(spotId); if (spot?.tags?.includes?.("fishing-spot")) startFish(ctx, me, spot, tool); }
export function cookAt(ctx, me, srcId) {
  const src = cookSources(ctx, here(me), 10).find((x) => x.id === srcId); if (!src) return H.say(ctx, me, "Get closer to the fire.");
  const raw = normInv(me.state.inv).find((x) => x && ITEMS[x.id]?.raw);
  if (!raw) return H.say(ctx, me, "You have nothing raw to cook.");
  startCook(ctx, me, raw.id, src);
}
// ---------- cooking ----------
function startCook(ctx, me, rawId, src) {
  const s = me.state, p = here(me), c = cookOf(ITEMS[rawId]?.raw), L = lvl(s, "cooking");
  if (!c) return H.say(ctx, me, "You can't cook that.");
  if (!reachOf(src, p)) return H.say(ctx, me, src.range ? "Get closer to the hearth." : "Get closer to the fire.");
  if (c.level > L) return H.say(ctx, me, `You need a Cooking level of ${c.level} to cook ${fishOf(c.id).name.toLowerCase()}.`);
  H.stopChop(ctx, me);
  s.act = { k: "cook", item: rawId, src: src.id, range: !!src.range, ph: GA.cookTicks - 2, from: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } };
  H.say(ctx, me, `You start cooking the ${fishOf(c.id).name.toLowerCase()}${src.range ? " on the hearth" : " on the fire"}.`);
}
const STEAM = `fx
pop steam burst=5 on=disc(.15) life=.8..1.4 v=up(.6..1) size=.12..0.2 acc=buoy(.4)+drag(1) col=<.95,.95,.95> a=0>.35:.3>0 sz=$size*(.6>2) r=sprite(smoke-puff,alpha)`;
const SCORCH = `fx
pop soot burst=6 on=disc(.15) life=1..1.6 v=up(.5..0.9) size=.15..0.25 acc=buoy(.3)+drag(.8) col=<.15,.13,.12> a=0>.5:.3>0 sz=$size*(.6>2.2) r=sprite(smoke-puff,alpha)`;
function cookTick(ctx, me, a) {
  const s = me.state, src = ctx.getObject(a.src);
  if (!src || src.state?.ash) return stopAct(ctx, me, "The fire has gone out.");
  const ph = ((a.ph | 0) + 1) % GA.cookTicks;
  s.act = { ...a, ph };
  if (ph !== 0) return;
  const inv = normInv(s.inv), i = inv.findIndex((x) => x?.id === a.item);
  if (i < 0) return stopAct(ctx, me, null);
  const c = cookOf(ITEMS[a.item].raw), L = lvl(s, "cooking"), sp = here(src), at = { x: sp.x, y: sp.y + 0.4, z: sp.z };
  me.anim.gather = null; me.anim.gather = { clip: "cdn/clip-attack.glb", loop: "once", mask: { from: "Spine" }, weight: 0.5, speed: 0.6 };
  if (ctx.random() < burnChance(L, c, a.range)) {
    inv[i] = { id: `burnt-${c.id}` }; s.inv = inv;
    ctx.emit("playSound", { clip: GSOUNDS.burn, position: at, volume: 0.6 }); ctx.emit("fx", { position: at, script: SCORCH });
    H.say(ctx, me, `You accidentally burn the ${fishOf(c.id).name.toLowerCase()}.`);
  } else {
    inv[i] = { id: c.id }; s.inv = inv;
    H.grant(ctx, me, "cooking", toTenths(c.xp));
    ctx.emit("playSound", { clip: GSOUNDS.sizzle, position: at, volume: 0.6, pitch: 0.92 + ctx.random() * 0.16 }); ctx.emit("fx", { position: at, script: STEAM });
    H.say(ctx, me, `You successfully cook the ${fishOf(c.id).name.toLowerCase()}.`);
  }
  if (!inv.some((x) => x?.id === a.item)) stopAct(ctx, me, null);
}

// ---------- firemaking ----------
function groundOK(ctx, x, z, y) { const h = ctx.place.terrain.heightAt(x, z); return h != null && h > 0.15 && (y == null || Math.abs(y - h) < 0.3); }
function fireFree(ctx, x, z) { return !ctx.query({ tags: ["cook-fire"], center: { x, y: 0, z }, radius: 0.85 }).some((r) => Math.hypot(r.feetPosition.x - x, r.feetPosition.z - z) < 0.85); }
function startFire(ctx, me, logId) {
  const s = me.state, p = here(me), lg = logOf(logId), L = lvl(s, "firemaking");
  if (!lg) return H.say(ctx, me, "You can't light that.");
  if (!normInv(s.inv).some((x) => x?.id === "tinderbox")) return H.say(ctx, me, "You need a tinderbox to light a fire.");
  if (lg.level > L) return H.say(ctx, me, `You need a Firemaking level of ${lg.level} to burn ${lg.kind} logs.`);
  if (!groundOK(ctx, p.x, p.z, p.y)) return H.say(ctx, me, "You can't light a fire here.");
  if (!fireFree(ctx, p.x, p.z)) return H.say(ctx, me, "You can't light a fire here, there's one already.");
  H.stopChop(ctx, me);
  s.act = { k: "fire", log: logId, ph: GA.fireTicks - 2, from: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } };
  H.say(ctx, me, "You attempt to light the logs.");
}
const SPARK = `fx
pop spark burst=6..10 life=.2..0.45 v=sdir()*(1..2)+up(.5) size=.015..0.03 acc=grav()*.5 col=hdr(4,2.4,.6) a=1>0 r=sprite(ember,add,velocity,.02)`;
const flames = (log) => `fx
pop flame rate=flick(.45,.2)*40 on=disc(.16) life=.5..0.85 v=up(1.3)+cone(20)*(.3..0.7) size=.18..0.32 acc=curl(.5)*1.1+buoy(2)+drag(1.5) sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.2,1.3)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=3 on=disc(.16) life=.7..1.3 v=up(2)+cone(30)*(.4..1) size=.02..0.04 acc=curl(.8)+grav()*.45+drag(.5) col=hdr(5,2.8,.8)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.18 inh=p;v:$v*.4 life=1.6..2.6 size=.14..0.22 acc=buoy(.9)+curl(.35)*.5+drag(.8) sz=$size*(.7>3) col=<.3,.28,.26> a=0>.22:.3>.7:.15>0 rot=spin(.15) r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(.1).c(.4) glo=fire()*(#flame/30)~ r=light(<1,.55,.24>,$glo*14,9)`;
function fireTick(ctx, me, a) {
  const s = me.state, ph = ((a.ph | 0) + 1) % GA.fireTicks;
  s.act = { ...a, ph };
  if (ph !== 0) return;
  const inv = normInv(s.inv), i = inv.findIndex((x) => x?.id === a.log), lg = logOf(a.log), p = here(me);
  if (i < 0 || !inv.some((x) => x?.id === "tinderbox")) return stopAct(ctx, me, null);
  ctx.emit("playSound", { clip: GSOUNDS.strike, position: p, volume: 0.6, pitch: 0.9 + ctx.random() * 0.2 });
  ctx.emit("fx", { position: { x: p.x, y: p.y + 0.15, z: p.z }, script: SPARK });
  me.anim.gather = null; me.anim.gather = { clip: "cdn/clip-attack.glb", loop: "once", mask: { from: "Spine" }, weight: 0.4, speed: 0.7 };
  if (ctx.random() >= lightChance(lvl(s, "firemaking"), lg.level)) return;
  inv[i] = null; s.inv = inv;
  const burnSec = GA.fireSec[0] + ctx.random() * (GA.fireSec[1] - GA.fireSec[0]);
  const at = { x: +p.x.toFixed(2), y: ctx.place.terrain.heightAt(p.x, p.z) ?? p.y, z: +p.z.toFixed(2) };
  ctx.spawn({ tags: ["cook-fire", "player-fire"], feetPosition: at, lifetime: burnSec + GA.ashSec + 5,
    primitive: { kind: "scripted", script: "scripts/gen/gather-props.js", params: { kind: "fire", log: lg.kind } },
    fx: { script: flames(lg.kind) }, audio: { clip: GSOUNDS.crackle, gain: 0.22, loop: true, spatial: true, maxDistance: 14 },
    behavior: "scripts/skill-fire.js", state: { log: lg.kind, burnSec, by: me.userId ?? me.id } });
  ctx.emit("playSound", { clip: GSOUNDS.ignite, position: at, volume: 0.7 });
  H.grant(ctx, me, "firemaking", toTenths(lg.xp));
  H.say(ctx, me, "The fire catches and the logs begin to burn.");
  stopAct(ctx, me, null);
  // step one tile west, or the next free tile
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1], [0, -1]]) {
    const x = at.x + dx * GA.stepTile, z = at.z + dz * GA.stepTile;
    if (groundOK(ctx, x, z, at.y) && fireFree(ctx, x, z)) { me.feetPosition = { x, y: ctx.place.terrain.heightAt(x, z) + 0.02, z }; break; }
  }
}

// called every 0.6 s tick; true = an act is running
export function tick(ctx, me) {
  const a = me.state.act; if (!a) return false;
  const p = here(me);
  if (a.from && flat(p, a.from) > 0.35) { stopAct(ctx, me, null); return false; }
  if (a.k === "fish") fishTick(ctx, me, a); else if (a.k === "cook") cookTick(ctx, me, a); else if (a.k === "fire") fireTick(ctx, me, a); else if (a.k === "fletch") F.tick(ctx, me, a); else stopAct(ctx, me, null);
  return true;
}
