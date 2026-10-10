// IDLE WATCH rules, pure (docs/board/presence/dryrun.mjs tests them). Talk only: nothing here claims, votes or decides (inbox C1).
// Inputs are read by board-jev.js presence(); the room clock is not wall time, so "last seen" is the room time the bell FIRST
// saw an agent's new outbox message or CLAIMS line.
export const AGENTS = ["Savi", "Claude"];
export function openClaims(claims, who) { return [...claims.entries()].filter(([, c]) => c.st === "CLAIMED" && c.who === who).map(([id]) => id); }
export function laneOf(k, P) { return P.lane[String(k.id).toUpperCase()] ?? P.lane[k.id] ?? k.owner; }
// candidates for `who`: free, unblocked, not JEV-proposed-unvoted, in their lane; backlog/approved first (small), then the rest
export function candidates(list, claims, who, P) {
  const free = (k) => { const c = claims.get(String(k.id).toUpperCase()); return !c || (c.st !== "CLAIMED" && c.st !== "DONE"); };
  const mine = (list ?? []).filter((k) => free(k) && !k.blocked && k.source !== "JEV-PROPOSED" && laneOf(k, P) === who);
  return [...mine.filter((k) => P.smallSources.test(k.source ?? "")), ...mine.filter((k) => !P.smallSources.test(k.source ?? ""))];
}
export const isCrit = (k, P) => P.critical.test(`${k.title ?? ""} ${k.why ?? ""}`) || /CREATOR NOW/i.test(k.source ?? "");
// one agent's state now
export function stateOf({ who, claims, seenAt, awayFlag, now, prevIdleRuns = 0, P }) {
  const open = openClaims(claims, who), quiet = now - (seenAt ?? now);
  if (who === "Claude" && (awayFlag || quiet >= P.awayMs)) return { st: "AWAY", open, idleRuns: 0 };
  if (open.length) return { st: quiet >= P.staleMs ? "STALE" : "WORKING", open, idleRuns: 0 };
  if (quiet < P.quietMs) return { st: "WORKING", open, idleRuns: 0, note: "no claim, active (reviews, relays)" };
  const idleRuns = prevIdleRuns + 1;
  return { st: idleRuns >= P.idleChecks ? "IDLE" : "WORKING", open, idleRuns };
}
// the whole check → { rows, actions: [{ kind: "wakeSavi"|"pingSavi", text }], pushes (state), waiting }
export function plan({ prev = {}, claims, seen, claudeAway, list, creatorNow = [], now, day, P }) {
  const out = { rows: {}, actions: [], mem: { idleRuns: {}, pushes: { ...(prev.pushes ?? {}) }, staleSent: [...(prev.staleSent ?? [])], budget: prev.budget?.day === day ? { ...prev.budget } : { day, n: 0 } } };
  const canPush = (who) => now - (out.mem.pushes[who]?.at ?? -Infinity) >= P.pushGapMs && out.mem.budget.n < P.pushesPerDay;
  for (const who of AGENTS) {
    const r = stateOf({ who, claims, seenAt: seen[who], awayFlag: who === "Claude" && claudeAway, now, prevIdleRuns: prev.idleRuns?.[who] ?? 0, P });
    out.mem.idleRuns[who] = r.idleRuns; out.rows[who] = { st: r.st, open: r.open, note: r.note ?? "" };
    if (r.st === "STALE") for (const id of r.open) { const key = `${who}:${id}`; if (!out.mem.staleSent.includes(key)) { out.mem.staleSent.push(key); out.rows[who].stale = id; if (who === "Savi") out.actions.push({ kind: "pingSavi", text: `idle watch: your claim ${id} has had no line for ${Math.round(P.staleMs / 60e3)} min. Still on it? Post, DONE or RELEASE it in CLAIMS.md.` }); } }
  }
  out.mem.staleSent = out.mem.staleSent.filter((k) => { const [w, id] = k.split(":"); return openClaims(claims, w).includes(id); }).slice(-50);
  const cnow = creatorNow.length > 0;
  // Savi idle: wake her with her next task (the creator's task first)
  if (out.rows.Savi.st === "IDLE") {
    const k = candidates(list, claims, "Savi", P)[0];
    const next = cnow ? "THE CREATOR'S TASK (CREATOR NOW)" : k ? `[${k.id}] ${k.title}` : null;
    out.rows.Savi.next = next ?? "nothing small free";
    if (next && canPush("Savi")) { out.mem.pushes.Savi = { at: now, id: cnow ? "CREATOR NOW" : k.id }; out.mem.budget.n++; out.actions.push({ kind: "wakeSavi", text: `idle watch: you're idle and work is free. Take ${next}${k && !cnow ? ` (from ${k.source}; size: JEV's list order, a guess)` : ""}. CLAIM it in CLAIMS.md first, or RELEASE with a why.` }); }
  }
  // Claude: online idle → his NEXT line in PRESENCE.md (his watcher reads it); away → ordinary work waits, critical goes to Savi
  const ck = candidates(list, claims, "Claude", P);
  if (out.rows.Claude.st === "IDLE") {
    const k = ck[0]; out.rows.Claude.next = cnow ? "THE CREATOR'S TASK (CREATOR NOW)" : k ? `[${k.id}] ${k.title}` : "nothing small free";
    if ((cnow || k) && !out.mem.pushes.Claude?.open && canPush("Claude")) { out.mem.pushes.Claude = { at: now, id: cnow ? "CREATOR NOW" : k.id, open: true }; out.mem.budget.n++; }
    const p = out.mem.pushes.Claude;
    if (p?.open && !p.relayed && now - p.at >= P.relayMs) { p.relayed = true; out.actions.push({ kind: "wakeSavi", text: `idle watch: Claude is online but hasn't claimed or answered the push (${p.id}) in ${Math.round(P.relayMs / 60e3)} min. Relay it as an ASK in SAVI.md.` }); }
  } else if (out.mem.pushes.Claude?.open) out.mem.pushes.Claude = { ...out.mem.pushes.Claude, open: false }; // he picked something up
  if (out.rows.Claude.st === "AWAY") {
    out.waiting = ck.filter((k) => !isCrit(k, P)).slice(0, 5).map((k) => `[${k.id}] ${k.title}`);
    const crit = ck.filter((k) => isCrit(k, P));
    out.flagged = crit.filter((k) => P.claudeOnly.includes(k.id)).map((k) => `[${k.id}] ${k.title}`);
    const take = crit.find((k) => !P.claudeOnly.includes(k.id));
    if (take && !(prev.critTaken ?? []).includes(take.id) && out.mem.budget.n < P.pushesPerDay) {
      out.mem.critTaken = [...(prev.critTaken ?? []), take.id].slice(-30); out.mem.budget.n++;
      out.actions.push({ kind: "wakeSavi", text: `idle watch: Claude is AWAY and a critical task in his lane is free: [${take.id}] ${take.title}. Take it (creator's rule), CLAIM it, and post each commit + what changed in SAVI.md so Claude reviews it on return. The creator's reserved list never moves.` });
    }
  }
  if (!out.mem.critTaken) out.mem.critTaken = prev.critTaken ?? [];
  return out;
}
// PRESENCE.md body: states + the UTC-ish time each began (no counters: Claude #3). `since` = { who: label }
export function render({ rows, since, waiting = [], flagged = [], push }) {
  const line = (who) => { const r = rows[who]; return `- ${who}: ${r.st}${r.open.length ? ` · on ${r.open.join(", ")}` : ""}${r.note ? ` · ${r.note}` : ""} · since ${since[who] ?? "?"}${r.next ? ` · next: ${r.next}` : ""}${r.stale ? ` · INFO stale claim ${r.stale}` : ""}`; };
  return [`# PRESENCE · who's working, who's idle (IDLE WATCH) · written ONLY by the bell, only when a state changes`,
    `<!-- Rules: scripts/lib/presence-core.js · numbers: scripts/lib/data/presence.js · plan: docs/board/proposals/IDLE-WATCH.md. Talk only: a push is a suggestion; you still CLAIM it yourself. Claude: post AWAY / BACK as INFO in CLAUDE.md. -->`, "",
    line("Savi"), line("Claude"), "",
    ...(push ? [`→ Claude NEXT: ${push}`, ""] : []),
    ...(flagged.length ? ["## CRITICAL, waiting for Claude (his files only)", ...flagged.map((x) => `- ${x}`), ""] : []),
    ...(waiting.length ? ["## waiting for Claude (he's away; ordinary work waits)", ...waiting.map((x) => `- ${x}`), ""] : [])].join("\n");
}
