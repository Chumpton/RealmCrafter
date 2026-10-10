// Mining on the player's own body. Called from scripts/skills-player.js (still the one writer of skills / inv / act).
// A click on a rock (tags ["mining-rock"], state.rock = ROCKS id) starts player.state.act = { k: "mine", rock, ph, from }; the swing runs on the shared
// 0.6 s tick at the pickaxe's speed, the roll is OSRS's skilling chance (mining-core.js), and the rock empties itself and regrows (scripts/mining-rock.js).
import { MN } from "./data/mining.js";
import { ITEMS } from "./data/skills.js";
import { levelOf, normInv, toTenths } from "./skills-core.js";
import { rockOf, chance, bestPick } from "./mining-core.js";
import { rayNear } from "./gather-core.js";

const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const SOUND = "/cdn/moodboard-lowpoly-cozy/sfx-pickaxe-striking-stone.mp3";
let H = null; // { grant, say, stopChop, stopAct }
export function bind(h) { H = h; }

// returns true when the click was ours (a rock under the pointer)
export function onUse(ctx, me, input) {
  if (!MN.on) return false;
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== "number" || typeof a.pointerOriginX !== "number") return false;
  const p = here(me), o = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }, d = { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 };
  if (Math.hypot(o.x - p.x, o.z - p.z) > 4) { o.x = p.x; o.y = p.y + 1.6; o.z = p.z; } // a camera not yet caught up to the body: aim from the eye
  let best = null, bp = MN.pickPerp;
  for (const row of ctx.query({ tags: ["mining-rock"], center: p, radius: 16 })) { const f = row.feetPosition, n = rayNear(o, d, { x: f.x, y: f.y + 0.6, z: f.z }); if (n.along > 0 && n.along < 16 && n.perp < bp) { bp = n.perp; best = row; } }
  if (!best) return false;
  start(ctx, me, best); return true;
}
// "Mine" in the right-click menu
export function mineAt(ctx, me, id) { const row = ctx.getObject(id); if (row?.tags?.includes?.("mining-rock")) start(ctx, me, row); }

function start(ctx, me, row) {
  const s = me.state, p = here(me), rock = rockOf(row.state?.rock), L = levelOf(s.skills?.mining | 0);
  if (!rock) return;
  if (flat(row.feetPosition, p) > MN.reach) return H.say(ctx, me, "Get closer to the rock.");
  if (row.state?.empty) return H.say(ctx, me, "There is no ore currently available in this rock.");
  if (L < rock.level) return H.say(ctx, me, `You need a Mining level of ${rock.level} to mine this rock.`);
  const inv = normInv(s.inv);
  if (!bestPick(inv, L)) return H.say(ctx, me, "You need a pickaxe to mine this rock. The yard smith sells them.");
  if (!inv.includes(null)) return H.say(ctx, me, "Your inventory is too full to hold any more ore.");
  H.stopChop(ctx, me);
  s.act = { k: "mine", rock: row.id, ph: 0, from: { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } };
  H.say(ctx, me, "You swing your pickaxe at the rock.");
}

// one shared-tick step; true = this act is ours and handled
export function tick(ctx, me) {
  const a = me.state.act; if (!a || a.k !== "mine") return false;
  const s = me.state, p = here(me);
  if (a.from && flat(p, a.from) > 0.35) { H.stopAct(ctx, me, null); return true; }
  const row = ctx.getObject(a.rock), rock = rockOf(row?.state?.rock);
  if (!rock || row.state.empty) { H.stopAct(ctx, me, null); return true; }
  const L = levelOf(s.skills?.mining | 0), pick = bestPick(s.inv, L);
  if (!pick) { H.stopAct(ctx, me, "You need a pickaxe to mine this rock."); return true; }
  const ph = ((a.ph | 0) + 1) % pick.ticks;
  s.act = { ...a, ph };
  if (ph === 1) { me.anim.gather = null; me.anim.gather = { clip: "cdn/clip-attack.glb", loop: "once", mask: { from: "Spine" }, weight: 1, speed: 0.9 }; ctx.emit("playSound", { clip: SOUND, position: row.feetPosition, volume: 0.6, pitch: 0.9 + ctx.random() * 0.2, maxDistance: 25 }); }
  if (ph !== 0) return true;
  if (ctx.random() >= chance(rock, L)) return true;
  const inv = normInv(s.inv), i = inv.indexOf(null); if (i < 0) { H.stopAct(ctx, me, "Your inventory is too full to hold any more ore."); return true; }
  inv[i] = { id: rock.ore }; s.inv = inv;
  H.grant(ctx, me, "mining", toTenths(rock.xp));
  row.state.empty = true; ctx.emit("rockMined", {}, { to: row.id }); // flag now so a second miner in this tick finds it empty; the rock then dulls and regrows itself
  H.stopAct(ctx, me, `You manage to mine some ${ITEMS[rock.ore].name.toLowerCase().replace(" ore", "")}.`);
  return true;
}
