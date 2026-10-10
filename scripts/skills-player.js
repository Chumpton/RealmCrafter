// SKILLS-WC S2: the player's skills. Sole writer of player.state.skills / inv / chop / skillMsg. Never rolls: the grove judges.
import { raycast } from "builtin/physics";
import { SK, GROVE_TREES, SOUNDS, ITEMS } from "./lib/data/skills.js";
import { FOOD } from "./lib/data/combat.js";
import { BONES, BURY } from "./lib/data/bones.js";
import { ENERGY } from "./lib/data/monsters.js";
import { isEquippable } from "./lib/equip-core.js";
import * as G from "./lib/gather-play.js";
import * as FP from "./lib/fletch-play.js";
import * as MP from "./lib/mine-play.js";
import * as KP from "./lib/make-play.js";
import * as BP from "./lib/bank-play.js";
import { rowOf, put, HS_SKIP } from "./lib/hiscore-core.js";
import { buy as shopBuy, sell as shopSell, sellSupply, shelfMap, saveShelf } from "./lib/shop-core.js";
import { SHOP_RANGE, SHOPS } from "./lib/data/shop.js";
import { levelOf, addXP, bestAxe, actionOf, normInv, moveInv, axeById, toTenths, XP_TABLE } from "./lib/skills-core.js";

export const updateSchedule = { every: { seconds: 0.6 } };
const eatLock = new Map(); // player id -> ctx.now() ms before the next bite (3 ticks)
const applied = []; // rid memory, module only, capped
let ridN = 0;
const lvl = (s, k) => levelOf(s.skills?.[k] | 0);
const QUEST_SK = ["fishing", "cooking", "woodcutting", "firemaking", "fletching"]; // quest rewards (scripts/quest-player.js)
const COMBAT_SK = ["attack", "strength", "defence", "hitpoints", "ranged", "magic"];
const SET_SK = ["woodcutting", "running", "jumping", ...COMBAT_SK, "fishing", "cooking", "firemaking", "fletching", "prayer", "mining", "smithing", "crafting"];
function say(ctx, me, text) { me.state.skillMsg = { text, n: ((me.state.skillMsg?.n) | 0) + 1 }; }
const treeRow = (id) => `grove-${id}`;
function stop(ctx, me, why) {
  if (me.state.chop) me.state.chop = null;
  if (me.anim?.chop) me.anim.chop = null;
  showAxe(ctx, me, null);
  if (why) say(ctx, me, why);
}
function showAxe(ctx, me, axeId) {
  const kids = ctx.query({ tags: ["held-axe"], radius: 3 }).filter((r) => ctx.getObject(r.id)?.parent?.id === me.id);
  if (!axeId) { for (const k of kids) ctx.destroy(k.id); return; }
  if (kids.length && ctx.getObject(kids[0].id)?.state?.axe === axeId) return;
  for (const k of kids) ctx.destroy(k.id);
  const axe = axeById(axeId);
  ctx.spawn({ parent: me.id, tags: ["held-axe", "carried"], attachment: { bone: "RightHand" }, visibleInFirstPerson: true, scope: "session", audience: "near",
    feetPosition: { x: 0, y: 0.02, z: 0 }, rotation: { yaw: 0, pitch: 0, roll: 90 }, state: { axe: axeId },
    primitive: { kind: "scripted", script: "scripts/gen/skill-axe.js", params: { color: axe.color, metal: axeId } } });
}
function ensureStart(me) {
  const s = me.state;
  if (!s.skills || typeof s.skills !== "object") s.skills = { woodcutting: 0 };
  if (typeof s.skills.hitpoints !== "number") s.skills = { ...s.skills, hitpoints: 11540 }; // Hitpoints starts at 10
  const inv = normInv(s.inv);
  if (!inv.some((x) => x && ITEMS[x.id]?.tool === "axe")) { const i = inv.indexOf(null); if (i >= 0) inv[i] = { id: "axe-bronze" }; }
  if (!s.foodKit) { s.foodKit = 1; for (let k = 0; k < 3; k++) { const i = inv.indexOf(null); if (i >= 0) inv[i] = { id: "trout" }; } }
  const kit = G.ensureKit({ ...s, inv }); if (kit) { for (let i = 0; i < kit.length; i++) inv[i] = kit[i]; s.gatherKit = 1; if (!s.supplies) s.supplies = { bait: 0, feathers: 0, sbait: 0 }; }
  FP.ensureKit(s, inv);
  if (JSON.stringify(inv) !== JSON.stringify(s.inv ?? null)) s.inv = inv;
}
export function onSpawn(ctx) { if (!SK.on) return; if (ctx.self.isLocal === false) return; ensureStart(ctx.self); publish(ctx, ctx.self); if (ctx.self.state.chop) ctx.self.state.chop = null; if (ctx.self.state.act) ctx.self.state.act = null; }
FP.bind({ grant: (...a) => grant(...a), say: (...a) => say(...a), stopChop: (ctx, me) => { if (me.state.chop) stop(ctx, me, null); }, stopAct: (...a) => G.stopAct(...a) });
G.bind({ grant: (...a) => grant(...a), say: (...a) => say(...a), stopChop: (ctx, me) => { if (me.state.chop) stop(ctx, me, null); } });
BP.bind({ say: (...a) => say(...a), stopAct: (...a) => G.stopAct(...a) });
for (const M of [MP, KP]) M.bind({ grant: (...a) => grant(...a), say: (...a) => say(...a), stopChop: (ctx, me) => { if (me.state.chop) stop(ctx, me, null); }, stopAct: (...a) => G.stopAct(...a) });
function pickTree(ctx, input) {
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== "number" || typeof a.pointerOriginX !== "number") return null;
  const o = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }, d = { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 };
  const r = raycast(ctx, o, d, { distance: 14, ignoreEntities: [ctx.self.id] });
  if (!r?.id) return null;
  const row = ctx.getObject(r.id); let id = row?.state?.treeId ?? null;
  if (!id && row?.parent?.id) id = ctx.getObject(row.parent.id)?.state?.treeId ?? null;
  return id ? GROVE_TREES.find((t) => t.id === id) ?? null : null;
}
const here = (me) => me.worldFeetPosition ?? me.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function onInput(ctx, input) {
  if (!SK.on) return;
  const me = ctx.self, s = me.state, pr = input.pressed ?? {};
  if (s.shopAt && (pr.shopBuy || pr.shopSell || pr.shopClose)) { // restored 2026-10-05: this block was lost in 7702242025, so the merchant could not trade; now shop-aware (OSRS-PLAN P2)
    const shop = s.shopAt.shop ?? "general"; let inv = normInv(s.inv), sup = s.supplies, r = null; const now = ctx.now(), stk0 = shop === "runes" ? null : shelfMap(ctx.world.state, shop, now); let stk = stk0; // runes stay unlimited
    if (pr.shopBuy) {
      const d = input.actionData?.shopBuy ?? {}, id = String(d.id), n = Math.max(1, Math.min(shop === "runes" ? 100 : 10, d.n | 0 || 1));
      if (shop === "runes") r = shopBuy(inv, sup, id, shop, n);
      else { let got = 0; for (let k = 0; k < n; k++) { const b1 = shopBuy(inv, sup, id, shop, 1, stk); if (b1.err) { if (!got) r = b1; break; } inv = b1.inv; sup = b1.supplies; stk = b1.stk; got++; r = { inv, supplies: sup, msg: got > 1 ? `You buy ${got} for ${(s.supplies?.coins | 0) - (sup.coins | 0)} coins.` : b1.msg }; } }
    } else if (pr.shopSell) { const d = input.actionData?.shopSell ?? {}; r = shop === "runes" ? sellSupply(sup, String(d.id), d.n | 0 || 1) : shopSell(inv, sup, d.i | 0, shop, stk); if (r.supplies && !r.inv) r = { ...r, inv }; if (r.stk) stk = r.stk; } // a pack sale carries its own inv (the sold slot emptied); only a rune/supply sale keeps the pack as it was
    if (pr.shopClose) s.shopAt = null; else if (r?.err) say(ctx, me, r.err); else if (r) { s.inv = r.inv; s.supplies = r.supplies; if (stk0) saveShelf(ctx.world.state, shop, stk0, stk, now); say(ctx, me, r.msg); }
  }
  if (pr.skillDebug) { s.skillDebugOpen = !s.skillDebugOpen; }
  if (pr.skillsPanel) s.skillsOpen = !s.skillsOpen;
  if (pr.invDropLogs) { const inv = normInv(s.inv).map((x) => (x && x.id.startsWith("logs-") ? null : x)); s.inv = inv; say(ctx, me, "You drop your logs."); }
  if (pr.skillDebugSet && me.isEditor) { const d = input.actionData?.skillDebugSet ?? {}; const sk = SET_SK.includes(d.skill) ? d.skill : "woodcutting"; const L = Math.max(1, Math.min(99, d.level | 0)); s.skills = { ...(s.skills ?? {}), [sk]: XP_TABLE[L] }; say(ctx, me, `Debug: ${sk} set to level ${L}.`); }
  if (pr.skillDebugXp && me.isEditor) { const d = input.actionData?.skillDebugXp ?? {}; grant(ctx, me, SET_SK.includes(d.skill) ? d.skill : "woodcutting", toTenths(+d.xp || 0)); }
  if (pr.skillDebugAxe && me.isEditor) { const id = input.actionData?.skillDebugAxe?.axe; if (axeById(id)) { const inv = normInv(s.inv); const i = inv.indexOf(null); if (i >= 0) { inv[i] = { id }; s.inv = inv; say(ctx, me, `Debug: ${axeById(id).name} added.`); } } }
  if (pr.invBury || (pr.invUse && BONES[normInv(s.inv)[input.actionData?.invUse?.i | 0]?.id])) bury(ctx, me, (pr.invBury ? input.actionData?.invBury?.i : input.actionData?.invUse?.i) | 0);
  else if (pr.invUse) {
    const i = input.actionData?.invUse?.i | 0, inv = normInv(s.inv), it = inv[i], fd = it && FOOD[it.id], en = it && /^energy-[1-4]$/.test(it.id) ? +it.id.slice(7) : 0;
    if (fd) { // OSRS: one bite per 3 ticks (combat-player.js also pushes your next swing back 3 ticks)
      const now = ctx.now(); if (now < (eatLock.get(me.id) ?? 0)) return;
      eatLock.set(me.id, now + 1800); inv[i] = null; s.inv = inv; ctx.emit("heal", { amount: fd.heal, food: fd.name, over: !!fd.over }, { to: me.id });
    } else if (en) { // a dose is 15 stamina; the vial stays until the last dose
      inv[i] = en > 1 ? { id: `energy-${en - 1}` } : null; s.inv = inv; ctx.emit("energy", { amount: ENERGY.perDose }, { to: me.id }); say(ctx, me, en > 1 ? `You drink some of your energy potion. You have ${en - 1} dose${en > 2 ? "s" : ""} left.` : "You drink the last of your energy potion.");
    } else if (it && isEquippable(it.id)) { ctx.emit("equipItem", { i }, { to: me.id }); // wield / wear (equip-player.js)
    } else if (it) { ensureStart(me); if (!FP.onInvUse(ctx, me, i) && !KP.onInvUse(ctx, me, i)) G.onInvUse(ctx, me, i); }
  }
  if (pr.invMove) { // backpack drag (ui/hud/osinvdrag.js): the two slots swap, an empty target just receives the item
    const m = input.actionData?.invMove, mv = moveInv(s.inv, m?.from, m?.to);
    if (mv) s.inv = mv;
  }
  if (pr.invDrop) {
    const i = input.actionData?.invDrop?.i | 0, inv = normInv(s.inv), it = inv[i], def = it && ITEMS[it.id];
    if (it && def?.tool !== "axe") {
      inv[i] = null; s.inv = inv;
      const p = here(me), id = it.id, kind = id === 'bones' || id === 'big-bones' ? 'bone' : id === 'cowhide' ? 'hide' : /^energy-/.test(id) ? 'potion' : /^raw-(chicken|beef)$/.test(id) ? 'meat' : 'box';
      ctx.spawn({ tags: ['loot', 'interactable'], behavior: 'scripts/loot-drop.js', physics: 'static', audience: 'all', lifetime: 120,
        feetPosition: { x: p.x + 0.65, y: ctx.place.terrain.heightAt(p.x + 0.65, p.z), z: p.z },
        primitive: { kind: 'scripted', script: 'scripts/gen/loot-drop.js', params: { kind, color: def?.color ?? '#c8c0a8' } },
        state: { key: 'item', id, n: 1, name: def?.name ?? id } });
      say(ctx, me, `You drop the ${(def?.name ?? "item").toLowerCase()}.`);
    }
  }
  if (pr.skillDebugKit && me.isEditor) { const inv = normInv(s.inv); for (const id of ["small-net", "fishing-rod", "fly-rod", "harpoon", "lobster-pot", "tinderbox"]) if (!inv.some((x) => x?.id === id)) { const i = inv.indexOf(null); if (i >= 0) inv[i] = { id }; } s.inv = inv; s.supplies = { bait: 999, feathers: 999, sbait: 999 }; say(ctx, me, "Debug: every fishing tool, a tinderbox and 999 of each bait."); }
  if (pr.skillDebugItem && me.isEditor) { const id = input.actionData?.skillDebugItem?.id, n = Math.max(1, Math.min(28, input.actionData?.skillDebugItem?.n | 0 || 5)); if (ITEMS[id]) { const inv = normInv(s.inv); let k = 0; for (let i = 0; i < inv.length && k < n; i++) if (!inv[i]) { inv[i] = { id }; k++; } s.inv = inv; say(ctx, me, `Debug: ${k} × ${ITEMS[id].name}.`); } }
  if (pr.fletch || pr.fletchMenu || pr.fletchClose) { ensureStart(me); FP.onPressed(ctx, me, pr, input.actionData); }
  if (pr.smith || pr.smithClose) { ensureStart(me); KP.onPressed(ctx, me, pr, input.actionData); }
  if (pr.bankDeposit || pr.bankDepositAll || pr.bankWithdraw || pr.bankClose) { ensureStart(me); BP.onPressed(ctx, me, pr, input.actionData); }
  if (pr.skillDebugFletch && me.isEditor) { const inv = normInv(s.inv); for (const id of ["knife", "logs-normal", "logs-oak", "logs-willow", "logs-maple", "logs-yew", "logs-magic"]) { const i = inv.indexOf(null); if (i >= 0 && (id !== "knife" || !inv.some((x) => x?.id === "knife"))) inv[i] = { id }; } s.inv = inv; s.supplies = { ...(s.supplies ?? {}), feathers: 999, strings: 99, shafts: 300, headless: 150, "tips-bronze": 150, "tips-iron": 150, "tips-steel": 150, "tips-mithril": 150, "tips-adamant": 150, "tips-rune": 150 }; say(ctx, me, "Debug: a knife, one of every log, 999 feathers, 99 strings and 150 of every arrowtip."); }
  if (!pr.use) return;
  ensureStart(me);
  if (FP.onUse(ctx, me, G.pickRay(input, me))) return;
  if (BP.onUse(ctx, me, input) || MP.onUse(ctx, me, input) || KP.onUse(ctx, me, input)) return;
  if (G.onUse(ctx, me, input)) return;
  const t = pickTree(ctx, input); if (t) startChop(ctx, me, t);
}
// a left-click on a tree, or "Chop down" in the right-click menu (context-menu.js -> chopTree)
function startChop(ctx, me, t) {
  const s = me.state;
  ensureStart(me);
  const g = ctx.getObject(SK.grove)?.state?.trees?.[t.id];
  const act = actionOf(t.kind), L = lvl(s, "woodcutting");
  if (g && !g.up) return say(ctx, me, "This tree has been cut down.");
  if (act.levelReq > L) return say(ctx, me, `You need a Woodcutting level of ${act.levelReq} to chop down this tree.`);
  const axe = bestAxe(s.inv, L); if (!axe) return say(ctx, me, "You need an axe to chop down this tree.");
  if (!normInv(s.inv).includes(null)) return say(ctx, me, "Your inventory is too full to hold any more logs.");
  if (flat(here(me), t) > SK.reach) return say(ctx, me, "Get closer to the tree.");
  G.stopAct(ctx, me, null);
  s.chop = { v: SK.v, tree: t.id, ph: 0, axe: axe.id, from: { x: +here(me).x.toFixed(2), z: +here(me).z.toFixed(2) } };
  showAxe(ctx, me, axe.id);
  say(ctx, me, "You swing your axe at the tree.");
}
// OSRS bury: one bone per 2 ticks, flat Prayer XP per bone (scripts/lib/data/bones.js)
const buryLock = new Map();
function bury(ctx, me, i) {
  const s = me.state, inv = normInv(s.inv), it = inv[i], b = it && BONES[it.id]; if (!b) return;
  const now = ctx.now(); if (now < (buryLock.get(me.id) ?? 0)) return;
  buryLock.set(me.id, now + BURY.lockMs); inv[i] = null; s.inv = inv;
  buried(ctx, me, b);
}
// a bone lying on the ground, buried straight from the right-click menu (creator 2026-10-05): same lock, sound and XP as from the pack
function buryGround(ctx, me, objId) {
  const o = ctx.getObject(objId), b = o?.tags?.includes?.("loot") && BONES[o.state?.id]; if (!b) return;
  const now = ctx.now(); if (now < (buryLock.get(me.id) ?? 0)) return;
  buryLock.set(me.id, now + BURY.lockMs);
  const n = Math.max(1, o.state.n | 0); if (n > 1) o.state.n = n - 1; else ctx.destroy(objId);
  buried(ctx, me, b);
}
function buried(ctx, me, b) {
  const p = here(me);
  // OSRS bury: a hunch down to the ground, and the soil flies as the hands reach it (creator 2026-10-05)
  if (me.anim?.bury) me.anim.bury = null;
  me.anim.bury = { clip: "cdn/clip-pickup.glb", loop: "once", weight: 1, speed: 1.35 };
  me.state.buryAt = ctx.now(); // the first-person eye dips with it (scripts/camera.js)
  ctx.after(0.45, "buryDig", { x: p.x, y: p.y, z: p.z });
  ctx.after(1.15, "buryUp", {});
  say(ctx, me, "You dig a hole in the ground... You bury the " + b.name.toLowerCase() + ".");
  grant(ctx, me, "prayer", toTenths(b.xp));
}
const BURY_FX = `fx
pop soil burst=10..16 life=.5..0.9 v=up(1.2..2.2)+sdir()*(.6..1.2) size=.04..0.08 acc=grav()*.9+drag(1) col=<.32,.24,.16> a=1>.7:1>0 sz=$size floor=stick r=sprite(stalk,alpha,velocity,.02)
pop dust burst=4..6 life=.6..1 v=up(.3..0.6)+sdir()*.3 size=.25..0.4 acc=buoy(.3)+drag(1.4) col=<.55,.46,.36> a=0>.3:.3>.7:.15>0 sz=$size*(.6>1.8) r=sprite(smoke-puff,alpha)`;
function publish(ctx, me) { // the shared hiscores (world.state.hiscores): this player's row, written on arrival and on a level-up
  try { if (!me.name || HS_SKIP.includes(me.name)) return; const ws = ctx.world.state, b = put(ws.hiscores, me.name, rowOf(me.state.skills ?? {}, ctx.now())); if (b !== ws.hiscores) ws.hiscores = b; } catch (e) { /* never break XP for a scoreboard */ }
}
function grant(ctx, me, skill, tenths) {
  const r = addXP(me.state.skills ?? {}, skill, tenths);
  me.state.skills = { ...(me.state.skills ?? {}), [skill]: r.tenths }; if (me.state.lastXp !== skill) me.state.lastXp = skill;
  const p = here(me);
  ctx.emit("uiEvent", { name: "xp", payload: { skill, xpTenths: r.gained, tenths: r.tenths, all: Object.values(me.state.skills).reduce((a, v) => a + (v | 0), 0), level: r.to, up: r.up } }, { audience: { player: me.id } });
  if (r.gained >= 10 && !["running", "jumping"].includes(skill)) ctx.emit("damageNumber", { position: { x: p.x + (ctx.random() - 0.5) * 0.4, y: p.y + 2.25, z: p.z }, text: `+${Math.round(r.gained / 10)} XP`, color: "#c58cff", size: 1.05, lifetime: 1.6 }, { audience: { player: me.id } }); // WoW: xp rises off you
  if (r.up.length) {
    publish(ctx, me);
    ctx.emit("playSound", { clip: SOUNDS.level, position: p, volume: 0.9, maxDistance: 30 });
    ctx.emit("fx", { position: { x: p.x, y: p.y + 1, z: p.z }, script: LEVEL_FX });
  }
  return r;
}
const LEVEL_FX = `fx
pop spark burst=40 life=.8..1.4 v=up(2..4)+sdir()*(1..2) size=.05..0.1 acc=grav()*.3+drag(1.2) col=hdr(3,2.4,.8)>hdr(1.6,.9,.2) a=1>.7:1>0 sz=$size r=sprite(ember,add)
pop glow burst=1 life=.6 r=light(<1,.8,.4>,20*(1>0),6)`;
export function buryDig(ctx, p) {
  const at = { x: p.x, y: p.y + 0.05, z: p.z };
  ctx.emit("playSound", { clip: BURY.sound, position: at, volume: 0.7, maxDistance: 14 });
  ctx.emit("fx", { position: at, script: BURY_FX });
}
export function buryUp(ctx) { if (ctx.self.anim?.bury) ctx.self.anim.bury = null; }
export const ears = {
  fishSpot: (ctx, p) => { if (ctx.self.isLocal !== false && SK.on) G.fishAt(ctx, ctx.self, String(p?.spot), typeof p?.tool === "string" ? p.tool : undefined); },
  cookAt: (ctx, p) => { if (ctx.self.isLocal !== false && SK.on) G.cookAt(ctx, ctx.self, String(p?.src)); },
  chopTree: (ctx, p) => { const t = GROVE_TREES.find((x) => x.id === p?.tree); if (t && ctx.self.isLocal !== false && SK.on) startChop(ctx, ctx.self, t); },
  bankOpen: (ctx, p) => { if (ctx.self.isLocal !== false) BP.openAt(ctx, ctx.self, p?.x, p?.z); }, // a bank row (scripts/bank-booth.js)
  makeOpen: (ctx, p) => { if (ctx.self.isLocal !== false) KP.openAt(ctx.self, p?.st, p?.x, p?.z); }, // the tanner NPC (scripts/tanner.js)
  shopOpen: (ctx, p) => { if (ctx.self.isLocal !== false && Number.isFinite(p?.x) && Number.isFinite(p?.z)) ctx.self.state.shopAt = { x: p.x, z: p.z, shop: SHOPS[p.shop] ? p.shop : "general" }; },
  useArrow: (ctx, p) => { const me = ctx.self; if (me.isLocal === false) return; const k = `arrows-${p?.tier}`, sup = me.state.supplies ?? {}; if ((sup[k] | 0) > 0) me.state.supplies = { ...sup, [k]: (sup[k] | 0) - 1 }; },
  // Running/Jumping XP measured by player.js on this body; this file stays the one writer of skills
  skillXp: (ctx, p) => {
    if (!SK.on || !p || ctx.self.isLocal === false) return;
    if (p.multi && typeof p.multi === "object") { ensureStart(ctx.self); for (const [k, v] of Object.entries(p.multi)) if (COMBAT_SK.includes(k) || (p.quest && QUEST_SK.includes(k))) { const t = Math.max(0, Math.min(5000, v | 0)); if (t) grant(ctx, ctx.self, k, t); } return; }
    if (!["running", "jumping"].includes(p.skill)) return; const t = Math.max(0, Math.min(2000, p.tenths | 0)); if (t) grant(ctx, ctx.self, p.skill, t);
  },
  buryLoot: (ctx, p) => { if (ctx.self.isLocal !== false && SK.on && typeof p?.obj === "string") buryGround(ctx, ctx.self, p.obj); },
  skillMsg: (ctx, p) => { if (p?.text) say(ctx, ctx.self, String(p.text).slice(0, 120)); },
  reward: (ctx, p) => {
    const me = ctx.self, s = me.state;
    if (!p?.rid || applied.includes(p.rid)) return;
    applied.push(p.rid); if (applied.length > 64) applied.shift();
    ensureStart(me); // a first reward before onSpawn's start kit (a late body) still gets the bronze axe beside its logs
    if (p.ok) {
      const inv = normInv(s.inv), i = inv.indexOf(null);
      if (i < 0) { ctx.emit("playSound", { clip: SOUNDS.full, position: here(me), volume: 0.6 }); stop(ctx, me, "Your inventory is too full to hold any more logs."); return; } // CODE-REVIEW #128 (1): no slot, no log, no XP
      inv[i] = { id: p.item }; s.inv = inv; ctx.emit("playSound", { clip: SOUNDS.log, position: here(me), volume: 0.5 });
      grant(ctx, me, "woodcutting", p.xpTenths | 0);
      say(ctx, me, `You get some ${(ITEMS[p.item]?.name ?? "logs").toLowerCase()}.`);
      if (p.fell) stop(ctx, me, null);
      else if (!normInv(s.inv).includes(null)) { ctx.emit("playSound", { clip: SOUNDS.full, position: here(me), volume: 0.6 }); stop(ctx, me, "Your inventory is too full to hold any more logs."); }
    } else if (p.down) stop(ctx, me, null);
    else if (p.reason) stop(ctx, me, p.reason === "level" ? `You need a Woodcutting level of ${p.need} to chop down this tree.` : "You need a better axe.");
  },
};
export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false || !SK.on) return;
  const sh = me.state.shopAt; if (sh && flat(here(me), sh) > SHOP_RANGE) me.state.shopAt = null;
  const bk = me.state.bankAt; if (bk && flat(here(me), bk) > 8) me.state.bankAt = null;
  const mk = me.state.smenu; if (mk?.x != null && flat(here(me), mk) > 8) me.state.smenu = null; // walked off from the furnace / anvil / tanner
  if (MP.tick(ctx, me) || KP.tick(ctx, me)) return;
  if (G.tick(ctx, me)) return;
  const c = me.state.chop; if (!c) { ctx.sleep(30); return; }
  const t = GROVE_TREES.find((x) => x.id === c.tree);
  if (!t || (c.v ?? 1) > SK.v) return stop(ctx, me, null);
  const p = here(me);
  if (flat(p, c.from) > SK.moveStop) return stop(ctx, me, null);
  const g = ctx.getObject(SK.grove)?.state?.trees?.[t.id];
  if (g && !g.up) return stop(ctx, me, null);
  const ph = ((c.ph | 0) + 1) % 4;
  me.state.chop = { ...c, ph };
  // the swing shows every attempt-cycle
  if (ph === 3 && me.anim?.chop) me.anim.chop = null; // clear so the next swing replays the clip
  if (ph === 1) {
    me.anim.chop = { clip: "cdn/clip-attack.glb", loop: "once", mask: { from: "Spine" }, weight: 1 };
    const y = ctx.getObject(treeRow(t.id))?.feetPosition?.y ?? p.y;
    const hitAt = { x: t.x + (p.x - t.x) * 0.12, y: y + 1.0, z: t.z + (p.z - t.z) * 0.12 };
    ctx.after(0.35, "thunk", { at: hitAt });
  }
  if (ph === 0) {
    const L = lvl(me.state, "woodcutting"), axe = bestAxe(me.state.inv, L);
    if (!axe) return stop(ctx, me, "You need an axe to chop down this tree.");
    ridN++; ctx.emit("attempt", { tree: t.id, by: me.id, rid: `${me.id}:${ctx.now()}:${ridN}`, level: L, axe: axe.id }, { to: SK.grove });
  }
}
const CHIPS = `fx
pop chip burst=8..12 life=.5..0.9 v=sdir()*(1.5..3)+up(1..2) size=.03..0.07 spin=-8..8 acc=grav()*.9+drag(.8) col=<.62,.45,.28> a=1>.8:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(stalk,alpha,velocity,.02)
pop dust burst=3 life=.5..0.8 v=up(.3..0.6)+sdir()*.3 size=.12..0.2 acc=buoy(.3)+drag(1.4) col=<.6,.52,.42> a=0>.25:.3>.7:.12>0 sz=$size*(.6>1.6) r=sprite(smoke-puff,alpha)`;
export function thunk(ctx, { at }) {
  if (!ctx.self.state.chop) return;
  ctx.emit("playSound", { clip: SOUNDS.chop, position: at, volume: 0.7, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 30 });
  ctx.emit("fx", { position: at, script: CHIPS });
}
