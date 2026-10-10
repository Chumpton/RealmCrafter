// AI-BUDGET · HEIMDALL H2 (creator's go 2026-10-01: "HEIMDALL is a go from me"). One den-wide governor over JEV's lanes.
// When Spawn answers an llm job busy/refused, the den asks less; when it stays quiet, it climbs back.
// world.state.aiBudget = { scale 0.1-1 (unitless), busyAt ms, quietAt ms } (ctx.now() clock). Sole writer: this file.
// Readers: scripts/lib/jev-meter.js allow(), scripts/lib/chess-match-core.js (chess cap). Undo: AI_BUDGET.on = false (the row is left inert).
export const AI_BUDGET = {
  on: true,
  floor: 0.1,          // never below 10% of a lane's slider
  halve: 0.5,          // each busy burst halves the scale
  burstMs: 60e3,       // busy answers inside 60 s of the last one are the same burst: halve once
  climbEveryMs: 5 * 60e3, // every 5 quiet minutes ...
  climbBy: 0.1,        // ... the scale climbs 0.1 back toward 1
  exempt: ["watcher", "huginn"], // these lanes keep their whole slider
};
export const BUSY_RE = /busy|rate|overload|capacity|unavailable|429|503/i; // a cut-off (timeout) is a review too long, not Spawn busy: it never throttles the den
export const isBusy = (r) => !!r && !r.ok && BUSY_RE.test(String(r?.error?.code ?? r?.error?.message ?? r?.error ?? ""));
const r2 = (x) => Math.round(x * 100) / 100;
// the scale in force now (climb applied lazily on read; written only when the rounded value moves)
export function scaleNow(ctx) {
  if (!AI_BUDGET.on) return 1;
  const w = ctx?.world?.state; const b = w?.aiBudget;
  if (!b || !(b.scale < 1)) return 1;
  const now = ctx.now(), from = Math.max(b.busyAt ?? 0, b.quietAt ?? 0);
  const steps = Math.floor((now - from) / AI_BUDGET.climbEveryMs);
  if (steps <= 0) return b.scale;
  const scale = r2(Math.min(1, b.scale + steps * AI_BUDGET.climbBy));
  w.aiBudget = { scale, busyAt: b.busyAt, quietAt: from + steps * AI_BUDGET.climbEveryMs };
  return scale;
}
export function scaleFor(ctx, lane) {
  if (!AI_BUDGET.on || AI_BUDGET.exempt.includes(lane)) return 1;
  return scaleNow(ctx);
}
// a busy answer anywhere in the den
export function onBusy(ctx) {
  if (!AI_BUDGET.on) return;
  try {
    const w = ctx.world.state, now = ctx.now(), b = w.aiBudget;
    if (b && now - (b.busyAt ?? -Infinity) < AI_BUDGET.burstMs) return; // same burst
    const cur = scaleNow(ctx);
    w.aiBudget = { scale: r2(Math.max(AI_BUDGET.floor, cur * AI_BUDGET.halve)), busyAt: now, quietAt: now };
  } catch (e) { /* the budget never breaks a system */ }
}
