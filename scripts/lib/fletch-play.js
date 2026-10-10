// MMO prompt 5/6: Fletching on the player's own body. Called from scripts/skills-player.js (still the one writer of
// skills / inv / supplies / act). Knife on logs opens the make-X menu (player.state.fmenu); a pick starts
// player.state.act = { k: "fletch", r, left, ph, from } on the shared 0.6 s tick. Always succeeds, one action per FL.ticks.
import { FL, ARROWS, CHESTS, FSOUNDS, FLETCH_SUPPLY_NAMES } from "./data/fletch.js";
import { ITEMS } from "./data/skills.js";
import { levelOf, normInv } from "./skills-core.js";
import { recipeOf, canMake, plan } from "./fletch-core.js";
import { rayNear } from "./gather-core.js";

const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const lvl = (s) => levelOf(s.skills?.fletching | 0);
let H = null; // { grant, say, stopChop, stopAct }
export function bind(h) { H = h; }

export function ensureKit(s, inv) { // once per save: a knife, a plain shortbow and 30 bronze arrows
  if (s.fletchKit) return false;
  for (const id of ["knife", FL.starter.bow]) if (!inv.some((x) => x?.id === id)) { const i = inv.indexOf(null); if (i >= 0) inv[i] = { id }; }
  if (!["knife", FL.starter.bow].every((id) => inv.some((x) => x?.id === id))) return false; // CODE-REVIEW #128 (2): a full pack keeps the kit for the next start
  s.supplies = { ...(s.supplies ?? {}), "arrows-bronze": ((s.supplies?.["arrows-bronze"]) | 0) + FL.starter.arrows };
  s.fletchKit = 1;
  return true;
}

// a pack click: knife / logs-with-knife / unstrung bow opens the menu. true = ours
export function onInvUse(ctx, me, i) {
  if (!FL.on) return false;
  const s = me.state, inv = normInv(s.inv), it = inv[i], def = it && ITEMS[it.id]; if (!def) return false;
  if (it.id === "knife") return open(ctx, me, inv.find((x) => x?.id?.startsWith("logs-"))?.id ?? "arrows");
  if (def.unstrung) return open(ctx, me, "string");
  return false;
}
export function open(ctx, me, focus) {
  const s = me.state;
  if (!normInv(s.inv).some((x) => x?.id === "knife")) { H.say(ctx, me, "You need a knife to fletch."); return true; }
  s.fmenu = { focus: focus || "arrows" };
  return true;
}

// the menu's buttons: fletch { r, n } and fletchClose
export function onPressed(ctx, me, pr, data) {
  const s = me.state;
  if (pr.fletchClose) s.fmenu = null;
  if (pr.fletchMenu) open(ctx, me, data?.fletchMenu?.focus);
  if (!pr.fletch) return;
  const r = recipeOf(data?.fletch?.r), n = Math.max(1, Math.min(999, data?.fletch?.n | 0 || 1));
  s.fmenu = null;
  if (!r) return;
  start(ctx, me, r, n);
}
function start(ctx, me, r, n) {
  const s = me.state, p = here(me), inv = normInv(s.inv);
  if (!inv.some((x) => x?.id === "knife")) return H.say(ctx, me, "You need a knife to fletch.");
  if (r.level > lvl(s)) return H.say(ctx, me, `You need a Fletching level of ${r.level} to make ${r.name.toLowerCase()}.`);
  if (canMake(r, inv, s.supplies) <= 0) return H.say(ctx, me, missing(r));
  if (r.make.inv && r.use.inv == null && !inv.includes(null)) return H.say(ctx, me, "Your pack is too full.");
  H.stopChop(ctx, me);
  s.act = { k: "fletch", r: r.id, left: n, ph: FL.ticks - 2, from: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } };
}
function missing(r) {
  if (r.use.inv && !r.use.sup) return `You have no ${(ITEMS[r.use.inv]?.name ?? "logs").toLowerCase()}.`;
  const names = [...(r.use.inv ? [ITEMS[r.use.inv]?.name ?? r.use.inv] : []), ...(r.use.sup ?? []).map((k) => FLETCH_SUPPLY_NAMES[k] ?? (k === "feathers" ? "Feathers" : k))];
  return `You need ${names.join(" and ").toLowerCase()} to make that.`;
}
const SHAVE = `fx
pop curl burst=5..8 life=.5..0.9 v=sdir()*(.6..1.2)+up(.6) size=.025..0.05 spin=-9..9 acc=grav()*.8+drag(.6) col=<.86,.7,.46> a=1>.7:1>0 sz=$size rot=$age*$spin floor=stick r=sprite(stalk,alpha,velocity,.02)`;
export function tick(ctx, me, a) {
  const s = me.state, ph = ((a.ph | 0) + 1) % FL.ticks;
  s.act = { ...a, ph };
  if (ph !== 0) return;
  const r = recipeOf(a.r); if (!r) return H.stopAct(ctx, me, null);
  const inv = normInv(s.inv), sup = { ...(s.supplies ?? {}) };
  if (!inv.some((x) => x?.id === "knife")) return H.stopAct(ctx, me, "You need a knife to fletch.");
  const pl = plan(r, inv, sup); if (!pl) return H.stopAct(ctx, me, missing(r));
  if (pl.take.inv) { const i = inv.findIndex((x) => x?.id === pl.take.inv); inv[i] = null; }
  for (const [k, v] of Object.entries(pl.take.sup)) sup[k] = Math.max(0, (sup[k] | 0) - v);
  if (pl.give.inv) { const i = inv.indexOf(null); if (i < 0) return H.stopAct(ctx, me, "Your pack is too full."); inv[i] = { id: pl.give.inv }; }
  for (const [k, v] of Object.entries(pl.give.sup)) sup[k] = (sup[k] | 0) + v;
  s.inv = inv; s.supplies = sup;
  H.grant(ctx, me, "fletching", pl.xpTenths);
  const p = here(me), hand = { x: p.x, y: p.y + 1.1, z: p.z };
  me.anim.gather = null; me.anim.gather = { clip: "cdn/clip-attack.glb", loop: "once", mask: { from: "Spine" }, weight: 0.3, speed: 0.8 };
  const snd = r.id.startsWith("string-") ? FSOUNDS.string : r.group === "arrows" ? FSOUNDS.fletch : FSOUNDS.whittle;
  ctx.emit("playSound", { clip: snd, position: p, volume: 0.55, pitch: 0.92 + ctx.random() * 0.16 });
  if (!r.id.startsWith("string-") && r.group !== "arrows") ctx.emit("fx", { position: hand, script: SHAVE });
  H.say(ctx, me, r.id === "shafts" ? "You carefully cut the logs into 15 arrow shafts." : r.id === "headless" ? `You attach feathers to ${pl.n} arrow shafts.` : r.group === "arrows" ? `You attach arrowtips to ${pl.n} headless arrows.` : r.id.startsWith("string-") ? `You add a string to the bow.` : `You carefully cut the wood into ${/^[AEIOU]/.test(r.name) ? "an" : "a"} ${r.name.toLowerCase()}.`);
  const left = (a.left | 0) - 1;
  if (left <= 0 || !plan(r, inv, sup)) return H.stopAct(ctx, me, null);
  s.act = { ...a, ph: 0, left };
}

// the supply chests in the combat yard: a pick along the pointer ray
export function onUse(ctx, me, r) {
  if (!FL.on || !r) return false;
  const p = here(me);
  let best = null, bp = 1.1;
  const hl = Math.hypot(r.d.x, r.d.z) || 1, fd = { x: r.d.x / hl, y: 0, z: r.d.z / hl }; // a chest is picked by where you face, not how far down you look
  for (const row of ctx.query({ tags: ["supply-chest"], center: p, radius: 14 })) { const f = row.feetPosition, n = rayNear({ ...r.o, y: 0 }, fd, { x: f.x, y: 0, z: f.z }); if (n.along > 0 && n.along < 6 && n.perp < Math.min(bp, 0.4 + n.along * 0.15)) { bp = n.perp; best = row; } }
  if (!best) return false;
  openChest(ctx, me, best); return true;
}
function openChest(ctx, me, row) {
  const s = me.state, p = here(me), c = CHESTS.find((x) => x.id === row.id) ?? { give: row.state?.give, name: "chest" };
  if (flat(row.feetPosition, p) > 3) return H.say(ctx, me, `Get closer to the ${c.name.toLowerCase()}.`);
  const until = (s.chestAt?.[c.give] ?? 0) + FL.chestSec * 1000, now = ctx.now();
  if (now < until) return H.say(ctx, me, `The ${c.name.toLowerCase()} is empty. It fills again in ${Math.ceil((until - now) / 1000)}s.`);
  const sup = { ...(s.supplies ?? {}) }, n = FL.chestGive[c.give] ?? 10;
  let what;
  if (c.give === "tips") { const t = [...ARROWS].reverse().find((a) => a.level <= lvl(s)) ?? ARROWS[0]; sup[t.tips] = (sup[t.tips] | 0) + n; what = `${n} ${t.name.toLowerCase()} arrowtips`; }
  else { sup[c.give] = (sup[c.give] | 0) + n; what = `${n} ${c.give === "strings" ? "bow strings" : "feathers"}`; }
  s.supplies = sup; s.chestAt = { ...(s.chestAt ?? {}), [c.give]: now };
  ctx.emit("playSound", { clip: FSOUNDS.chest, position: row.feetPosition, volume: 0.7, maxDistance: 15 });
  ctx.emit("squash", { target: row.id, axis: "y", intensity: 0.08, duration: 0.25 });
  H.say(ctx, me, `You open the ${c.name.toLowerCase()} and take ${what}.`);
}
