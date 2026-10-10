// OSRS chat box history pull (plan: docs/board/OSCHAT-SPAWN-WIRE-PLAN-2026-10-07.md, lane 6b).
// UI sends osHist { scope: 'party'|'guild' } when the Channel/Clan tab opens; Spawn's chat:history answers;
// the last 20 lines land in player.state.osHist[scope] as { k:'clan'|'chan', n, t, at } (k: guild→clan, party→chan).
const KIND = { guild: 'clan', party: 'chan' };
const KEEP = 20, GAP_MS = 1500; // one pull per scope per 1.5 s (a tab click storm costs one job)

export function onInput(ctx, input) {
  if (!input.pressed?.osHist) return;
  const scope = input.actionData?.osHist?.scope;
  if (!KIND[scope]) return;
  const s = ctx.session.osHistAt ?? (ctx.session.osHistAt = {});
  const now = ctx.now();
  if (now - (s[scope] ?? 0) < GAP_MS) return;
  s[scope] = now;
  ctx.job('chat:history', { scope }, 'onOsHist', { scope });
}

export function onOsHist(ctx, res, p) {
  const scope = p?.scope;
  if (!KIND[scope] || !res?.ok) return;
  const lines = Array.isArray(res.data?.lines) ? res.data.lines : [];
  const rows = lines.slice(-KEEP).map((l) => ({
    k: KIND[scope],
    n: l.by?.displayName ?? '',
    t: String(l.text ?? '').slice(0, 80),
    at: l.at ?? 0,
  }));
  const prev = ctx.self.state.osHist ?? {};
  ctx.self.state.osHist = { party: prev.party ?? [], guild: prev.guild ?? [], [scope]: rows };
}
