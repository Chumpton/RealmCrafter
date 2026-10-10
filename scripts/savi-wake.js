// WAKE QUEUE v2, the sender. The platform opens Savi's turn from a player's input, so the bell never sends: it arms
// board-bell.state.wakeQ.ready and the next input here (move, look, any key) carries it. O(1): one row read, one flag test.
// K (or the HUD button) is the creator's own wake, any time. Dev room only.
import { WAKE } from "./lib/data/wake.js";
import { isOn } from "./lib/data/systems.js";
import { msgOf, slimEv } from "./lib/wake-core.js";
import { SW } from "./lib/data/savi-watch.js";
const msgFor = (q) => q ? (q.msg ?? ((q.brief || q.raw) ? msgOf({ ...q, grade: q.grade ?? q.floor }) : null)) : null; // POLISH: msg is built here, not stored

export function onInput(ctx, input) {
  if (ctx.world.mode !== "dev") return;
  if (!isOn(ctx, 'wake')) return; // DEN SYSTEMS gate
  if (input.pressed?.saviWatch && ctx.self.userId === WAKE.owner) return watchPress(ctx);
  const manual = !!input.pressed?.wakeSavi && ctx.self.userId === WAKE.owner; // K is the creator's alone (CLAUDE #29)
  const bell = ctx.getObject(WAKE.bellId), q = bell?.state?.wakeQ;
  if (!manual && !q?.ready) return;
  const now = ctx.now();
  if (manual) {
    if (now - (bell?.state?.wakeManualAt ?? -Infinity) < WAKE.manualGapMs) return;
    if (bell) bell.state.wakeManualAt = now;
    if (bell) bell.state.wakeLog = [...(bell.state.wakeLog ?? []), slimEv({ id: q?.id ?? 0, ev: q ? "sent" : "K (queue empty)", path: "K", at: now })].slice(-WAKE.logMax); // CLAUDE #30: every K press is in the ledger
    if (bell && q) bell.state.wakeQ = { ...q, sentAt: now, sentBy: ctx.self.userId ?? null, path: "K", ready: false, escalate: false, tries: Math.min(q.tries ?? 0, WAKE.maxTries - 1) };
    ctx.notifyDm(`WAKE from ${ctx.self.displayName ?? "the creator"} (K): ${msgFor(q) ?? "check docs/board/inbox/CLAUDE.md, PRESENCE.md and the board"}`, { wake: true });
    return;
  }
  if (now - (q.sentAt ?? -Infinity) < WAKE.sendGapMs) return;
  // the creator's input first; another player carries it only when he isn't in the room
  if (ctx.self.userId !== WAKE.owner && ctx.place.players.some((p) => p.userId === WAKE.owner)) return;
  bell.state.wakeQ = { ...q, sentAt: now, sentBy: ctx.self.userId ?? null, path: "input", tries: (q.tries ?? 0) + 1, ready: false }; // claimed on the row before the send
  ctx.notifyDm(msgFor(q) ?? `WAKE #${q.id}: read docs/board/inbox/CLAUDE.md + PRESENCE.md`, { wake: true });
}

// SAVI-WATCH (creator + Claude GO with G-a..G-f, Savi GO 2026-09-30). G = quick watch; G again within SW.doubleMs = full sweep;
// G later while it's on = cancel. The dot has three honest states: called (grey) -> watching (red, only while Savi captures) -> filing (grey).
function watchPress(ctx) {
  const me = ctx.self, now = ctx.now(), sw = me.state.saviWatch;
  const live = sw && !sw.done && now < sw.until;
  if (live && sw.size === "quick" && now - sw.at < SW.doubleMs) { me.state.saviWatch = { ...sw, size: "full" }; return; }
  const bell = ctx.getObject(WAKE.bellId), log = (ev) => { if (bell) bell.state.wakeLog = [...(bell.state.wakeLog ?? []), slimEv({ id: sw?.n ?? 0, ev, path: "G", at: now })].slice(-WAKE.logMax); };
  if (live) { if (now - sw.at < SW.doubleMs) return; me.state.saviWatch = { ...sw, done: now, cancelled: true }; log(`WATCH #${sw.n} cancelled`); return; }
  if (sw && now - sw.at < WAKE.manualGapMs) return;
  const n = (me.state.saviWatchN ?? 0) + 1;
  me.state.saviWatchN = n;
  me.state.saviWatch = { n, at: now, until: now + SW.windowMs, size: "quick", phase: "called" };
  log(`WATCH #${n}`);
  ctx.notifyDm(`WATCH #${n} from ${me.displayName ?? "the creator"} (G): read his player.state.saviWatch (size quick|full; a double-tap makes it full), set phase "watching" before the first capture, follow docs/board/watch/README.md, file docs/board/watch/W${n}.md, then set phase "filing" and done.`, { wake: true });
}
