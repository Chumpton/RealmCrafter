// The bank on the player's own body. Called from scripts/skills-player.js (the one writer of inv). A click on a bank (tag "bank") or its NPC's press
// (ear bankOpen { x, z }) sets player.state.bankAt = { x, z }; the window's buttons send bankDeposit { i, n }, bankDepositAll, bankWithdraw { id, n }, bankClose.
// Items live in player.state.bank = { itemId: count } (lib/bank-core.js). The window shuts when you walk 8 m off (skills-player update).
import { ITEMS } from "./data/skills.js";
import { normInv } from "./skills-core.js";
import { deposit, depositAll, withdraw } from "./bank-core.js";
import { rayNear } from "./gather-core.js";

const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const name = (id) => (ITEMS[id]?.name ?? id).toLowerCase();
const REACH = 4;
let H = null; // { say, stopAct }
export function bind(h) { H = h; }
export function openAt(ctx, me, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return;
  if (me.state.act) H.stopAct(ctx, me, null);
  me.state.bankAt = { x, z };
}
export function onUse(ctx, me, input) {
  const a = input?.axes ?? {}; if (typeof a.pointerDirX !== "number" || typeof a.pointerOriginX !== "number") return false;
  const p = here(me), o = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }, d = { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 };
  if (Math.hypot(o.x - p.x, o.z - p.z) > 4) { o.x = p.x; o.y = p.y + 1.6; o.z = p.z; }
  let best = null, bp = 1.6;
  for (const row of ctx.query({ tags: ["bank"], center: p, radius: 16 })) { const f = row.feetPosition, n = rayNear(o, d, { x: f.x, y: f.y + 0.7, z: f.z }); if (n.along > 0 && n.along < 16 && n.perp < bp) { bp = n.perp; best = row; } }
  if (!best) return false;
  if (flat(best.feetPosition, p) > REACH) { H.say(ctx, me, "Get closer to the bank."); return true; }
  openAt(ctx, me, best.feetPosition.x, best.feetPosition.z); return true;
}
export function onPressed(ctx, me, pr, data) {
  const s = me.state;
  if (pr.bankClose) { s.bankAt = null; return; }
  if (!s.bankAt) return;
  const inv = normInv(s.inv);
  if (pr.bankDeposit) { const d = data?.bankDeposit ?? {}, r = deposit(inv, s.bank, d.i | 0, d.n | 0 || 1); done(ctx, me, r, "deposit"); }
  else if (pr.bankDepositAll) done(ctx, me, depositAll(inv, s.bank), "deposit");
  else if (pr.bankWithdraw) { const d = data?.bankWithdraw ?? {}, r = withdraw(inv, s.bank, String(d.id), d.n | 0 || 1); done(ctx, me, r, "withdraw"); }
}
function done(ctx, me, r, verb) {
  if (r.err) return H.say(ctx, me, r.err);
  me.state.inv = r.inv; me.state.bank = r.bank;
  H.say(ctx, me, r.id ? `You ${verb} ${r.n} ${name(r.id)}${r.n === 1 ? "" : "s"}.` : `You deposit everything (${r.n} items).`);
}
