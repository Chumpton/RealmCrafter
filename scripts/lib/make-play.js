// Smelting and smithing on the player's own body (the generic make flow; Crafting joins it next). Called from scripts/skills-player.js.
// A click on a furnace or anvil (tags "furnace" / "anvil") opens player.state.smenu = { st }; a pick starts act = { k: "smith", r, left, ph, from }.
// Rows, levels and chances come from data/smith.js through make-core.js; this file only walks them.
import { SM } from "./data/smith.js";
import { CR } from "./data/craft.js";
import { ITEMS } from "./data/skills.js";
import { levelOf, normInv, toTenths } from "./skills-core.js";
import { recipeById, canMake, make, holds } from "./make-core.js";
import { rayNear } from "./gather-core.js";

const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const STATIONS = { furnace: "furnace", anvil: "anvil", tanner: "tanner" }; // objects you click; "craft" is the pack itself
const SOUND = { craft: "/cdn/moodboard-lowpoly-cozy/sfx-leather-sewing-needle-pull.mp3", tanner: "/cdn/moodboard-lowpoly-cozy/sfx-leather-hide-scraping.mp3", furnace: "/cdn/moodboard-lowpoly-cozy/sfx-furnace-roar-fire.mp3", anvil: "/cdn/moodboard-lowpoly-cozy/sfx-anvil-hammer-clang.mp3" };
let H = null; // { grant, say, stopChop, stopAct }
export function bind(h) { H = h; }
const here1 = (ctx, p, st, r, at) => st === "craft" || near(ctx, p, st, r).length > 0 || (!!at && flat(p, at) <= 8); // at = where an NPC opened the window
const near = (ctx, p, st, r) => ctx.query({ tags: [st], center: p, radius: r }).filter((o) => flat(o.feetPosition, p) <= r);

export function onUse(ctx, me, input) {
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== "number" || typeof a.pointerOriginX !== "number") return false;
  const p = here(me), o = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }, d = { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 };
  if (Math.hypot(o.x - p.x, o.z - p.z) > 4) { o.x = p.x; o.y = p.y + 1.6; o.z = p.z; }
  let best = null, bp = 1.6, bs = null;
  for (const st of Object.keys(STATIONS)) for (const row of ctx.query({ tags: [st], center: p, radius: 16 })) { const f = row.feetPosition, n = rayNear(o, d, { x: f.x, y: f.y + 0.6, z: f.z }); if (n.along > 0 && n.along < 16 && n.perp < bp) { bp = n.perp; best = row; bs = st; } }
  if (!best) return false;
  open(ctx, me, bs, best); return true;
}
function open(ctx, me, st, row) {
  if (flat(row.feetPosition, here(me)) > SM.reach) { H.say(ctx, me, `Get closer to the ${STATIONS[st]}.`); return; }
  const f = row.feetPosition; me.state.smenu = { st, x: f.x, z: f.z }; // the window shuts when you walk off (skills-player update)
}
// the tanner NPC's press: skills-player ear makeOpen { st, x, z }
export function openAt(me, st, x, z) { if (STATIONS[st] && Number.isFinite(x) && Number.isFinite(z)) me.state.smenu = { st, x, z }; }
// a pack click on a needle, thread or hide opens the sewing window
export function onInvUse(ctx, me, i) {
  const id = normInv(me.state.inv)[i]?.id; if (!CR.on || !["needle", "thread", "leather", "hard-leather"].includes(id)) return false;
  me.state.smenu = { st: "craft" }; return true;
}
// the window's buttons: smith { r, n } and smithClose
export function onPressed(ctx, me, pr, data) {
  const s = me.state;
  if (pr.smithClose) s.smenu = null;
  if (!pr.smith) return;
  const r = recipeById(data?.smith?.r), n = Math.max(1, Math.min(999, data?.smith?.n | 0 || 1)), m = s.smenu;
  s.smenu = null;
  if (r) start(ctx, me, r, n, m?.st === r.station && m.x != null ? { x: m.x, z: m.z } : null);
}
function why(r, inv) {
  const lack = [].concat(r.tool ?? []).find((t) => !inv.some((x) => x?.id === t));
  if (lack) return `You need a ${ITEMS[lack]?.name?.toLowerCase() ?? lack} to do that.`;
  const need = Object.entries(r.use).filter(([id, n]) => inv.filter((x) => x?.id === id).length < n).map(([id, n]) => `${n > 1 ? n + " " : ""}${ITEMS[id]?.name?.toLowerCase() ?? id}`);
  return `You need ${need.join(" and ") || "more materials"} to make that.`;
}
function start(ctx, me, r, n, at) {
  const s = me.state, p = here(me), inv = normInv(s.inv);
  if (!here1(ctx, p, r.station, SM.reach, at)) return H.say(ctx, me, `Get closer to the ${r.station}.`);
  if (r.skill && levelOf(s.skills?.[r.skill] | 0) < r.level) return H.say(ctx, me, `You need a ${r.skill[0].toUpperCase() + r.skill.slice(1)} level of ${r.level} to make ${r.name.toLowerCase()}.`);
  if (canMake(r, inv) <= 0) return H.say(ctx, me, why(r, inv));
  if ((s.supplies?.coins | 0) < (r.coins | 0)) return H.say(ctx, me, "You don't have enough coins.");
  H.stopChop(ctx, me);
  s.act = { k: "smith", r: r.id, left: n, ph: 0, at, from: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } };
}
export function tick(ctx, me) {
  const a = me.state.act; if (!a || a.k !== "smith") return false;
  const s = me.state, p = here(me), r = recipeById(a.r);
  if (!r || (a.from && flat(p, a.from) > 0.35)) { H.stopAct(ctx, me, null); return true; }
  if (!here1(ctx, p, r.station, SM.reach + 0.5, a.at)) { H.stopAct(ctx, me, null); return true; }
  const tk = r.station === "craft" ? CR.ticks : SM.ticks, ph = ((a.ph | 0) + 1) % tk;
  s.act = { ...a, ph };
  if (ph !== 0) return true;
  if ((s.supplies?.coins | 0) < (r.coins | 0)) { H.stopAct(ctx, me, "You don't have enough coins."); return true; }
  const inv = normInv(s.inv), held = holds(r, ctx.random()), m = make(r, inv, !held);
  if (m.err === "full") { H.stopAct(ctx, me, "Your inventory is too full."); return true; }
  if (m.err) { H.stopAct(ctx, me, why(r, inv)); return true; }
  s.inv = m.inv;
  if (r.coins) s.supplies = { ...(s.supplies ?? {}), coins: (s.supplies?.coins | 0) - r.coins };
  if (r.thread && held) { s.threadN = (s.threadN | 0) + 1; if (s.threadN >= CR.threadPer) { s.threadN = 0; const inv2 = normInv(s.inv), ti = inv2.findIndex((x) => x?.id === "thread"); if (ti >= 0) { inv2[ti] = null; s.inv = inv2; } } } // one thread per 5 items
  ctx.emit("playSound", { clip: SOUND[r.station], position: p, volume: 0.6, pitch: 0.92 + ctx.random() * 0.16, maxDistance: 25 });
  if (held) { if (r.skill && r.xp) H.grant(ctx, me, r.skill, toTenths(r.xp)); const nm = r.name.toLowerCase(), art = /^[aeiou]/i.test(r.name) ? "an" : "a"; H.say(ctx, me, r.station === "furnace" ? `You smelt a ${nm}.` : r.station === "tanner" ? `The tanner tans your hide into ${nm}.` : r.station === "craft" ? `You make ${art} ${nm}.` : `You hammer the bars and make ${art} ${nm}.`); }
  else H.say(ctx, me, "The ore is too impure and you fail to refine it.");
  const left = (a.left | 0) - 1;
  if (left <= 0 || canMake(r, m.inv) <= 0) { H.stopAct(ctx, me, null); return true; }
  s.act = { ...a, ph: 0, left };
  return true;
}
