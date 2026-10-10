// OSRS chat box sender (lane 4, docs/board/OSCHAT-SPAWN-WIRE-PLAN-2026-10-07.md).
// osSay { tab, text<=80 } → resolveScope → chat:send job (Spawn moderates it like its own composer).
// Public lines are NOT echoed here: they come back via onSay → places/main/sim.js → place.state.chatLog.
// Private sends land in player.state.osMine (cap 30); refusals in player.state.osSayErr.
import { resolveScope } from './lib/os-chat-scope.js';

const GAP_MS = 500;   // server-side guard: at most one send per 500 ms
const MINE_CAP = 30;

export function onInput(ctx, input) {
  if (input.pressed?.osChatOpen) ctx.emit('uiEvent', { name: 'osChatOpen' }, { audience: { player: ctx.self.id } }); // Enter from the game view: the page never forwards keys to the UI frame
  if (!input.pressed?.osSay) return;
  const st = ctx.self.state, now = ctx.now();
  if (now - (ctx.session.osSayAt ?? 0) < GAP_MS) return;
  ctx.session.osSayAt = now;
  const a = input.actionData?.osSay ?? {};
  const r = resolveScope(a.tab, a.text, st.osLastPm);
  if (!r.scope) { st.osSayErr = { t: 'Choose who to message: type @name first.', at: now }; return; }
  if (!r.text) return;
  ctx.job('chat:send', { text: r.text, scope: r.scope }, 'onOsSay', { scope: r.scope, to: r.to, text: r.text });
}

export function onOsSay(ctx, result, payload) {
  const st = ctx.self.state, now = ctx.now(), p = payload ?? {};
  if (!result?.ok) { st.osSayErr = { t: result?.error?.message || "You can't send that right now.", at: now }; return; }
  const name = p.to || (String(p.scope ?? '').startsWith('@') ? String(p.scope).slice(1) : null);
  if (!name) return; // public/party/guild: no local echo
  st.osLastPm = name;
  st.osMine = [...(Array.isArray(st.osMine) ? st.osMine : []), { k: 'pm', n: 'To ' + name, t: p.text, at: now }].slice(-MINE_CAP);
}
