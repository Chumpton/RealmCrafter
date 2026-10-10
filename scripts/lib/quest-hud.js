// The WoW quest frame (parchment, gold title, objectives, rewards, Accept / Complete) and the objective tracker under the minimap.
// Drawn by ui.js from player.state.questWin and player.state.quests. Never throws.
import { QUESTS } from './data/quests.js';
import { esc } from './esc.js';
const escBr = (t) => esc(t).replace(/\n/g, '<br>'); // quest text keeps its line breaks
const H = "font-family:'Friz Quadrata','Beaufort',Georgia,serif";
const count0 = (s, item) => (Array.isArray(s?.inv) ? s.inv : []).filter((x) => x?.id === item).length;
const count = (s, item) => typeof item === 'object' ? (item.flag ? (s?.qc?.[item.flag] | 0) : count0(s, item.item)) : count0(s, item);
const btn = (act, label, on = true) => `<button onclick="sendAction('${act}')" style="cursor:pointer;${H};font-size:13px;padding:5px 16px;color:${on ? '#ffd200' : '#8a7a5a'};background:linear-gradient(#7a1c12,#4a0e08);border:1px solid #c9a15a;border-radius:3px;box-shadow:inset 0 1px 0 rgba(255,220,150,.35),0 2px 3px rgba(0,0,0,.6);text-shadow:0 1px 1px #000">${label}</button>`;
export function questHud(ctx, player) {
  try {
    const s = player?.state; if (!s) return '';
    return frame(s) + tracker(s);
  } catch { return ''; }
}
function frame(s) {
  const w = s.questWin, q = w && QUESTS[w.id]; if (!q) return '';
  const have = Math.min(q.need.n, count(s, q.need));
  const body = w.view === 'offer' ? q.text : w.view === 'complete' ? q.complete : q.progress;
  const obj = w.view === 'offer' ? `<div style="${H};color:#4a2a08;font-size:15px;margin:12px 0 4px">Quest Objectives</div><div>${escBr(q.objective)}</div>`
    : w.view === 'progress' ? `<div style="${H};color:#4a2a08;font-size:15px;margin:12px 0 4px">Required Items</div><div>${escBr(q.need.label)}: ${have}/${q.need.n}</div>` : '';
  const rew = w.view !== 'progress' ? `<div style="${H};color:#4a2a08;font-size:15px;margin:12px 0 4px">Rewards</div><div style="display:flex;gap:10px;align-items:center"><span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;background:rgba(80,50,10,.12);border:1px solid rgba(80,50,10,.35);border-radius:3px"><b style="color:#7a5200">${q.reward.coins}</b> coins</span>${Object.entries(q.reward.xp ?? {}).map(([k, v]) => `<span style="padding:3px 8px;background:rgba(90,40,140,.12);border:1px solid rgba(90,40,140,.35);border-radius:3px"><b style="color:#5a2a8a">${v}</b> ${k} XP</span>`).join('')}</div>` : '';
  const buttons = w.view === 'offer' ? btn('questAccept', 'Accept') + btn('questClose', 'Decline') : w.view === 'complete' ? btn('questTurnIn', 'Complete Quest') + btn('questClose', 'Cancel') : btn('questClose', 'Goodbye');
  return `<div id="quest-frame" data-modal style="position:fixed;left:24px;top:50%;transform:translateY(-50%);width:340px;box-sizing:border-box;pointer-events:auto;z-index:59;padding:6px;background:linear-gradient(#3a2614,#22160b);border:2px solid #c9a15a;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.65)">
    <div style="display:flex;align-items:center;gap:8px;padding:4px 6px 8px"><span style="width:28px;height:28px;border-radius:50%;background:radial-gradient(#ffe680,#c98a00);border:2px solid #6a4a10;display:flex;align-items:center;justify-content:center;${H};font-weight:bold;color:#2a1a04">${w.view === 'offer' ? '!' : '?'}</span><span style="${H};color:#ffd200;font-size:16px;text-shadow:0 1px 2px #000">${escBr(q.giver)}</span><span style="flex:1"></span><button onclick="sendAction('questClose')" style="cursor:pointer;background:#5a1a10;color:#ffd200;border:1px solid #c9a15a;border-radius:3px;width:22px;height:22px">✕</button></div>
    <div style="max-height:52vh;overflow-y:auto;padding:14px 16px;background:linear-gradient(#f3e3bd,#e2cc96);border-radius:3px;box-shadow:inset 0 0 18px rgba(90,60,20,.45);color:#2b1a08;font:13px/1.45 Georgia,serif">
      <div style="${H};color:#4a2a08;font-size:18px;margin-bottom:8px">${escBr(q.title)}</div>${escBr(body)}${obj}${rew}
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 4px 2px">${buttons}</div>
  </div>`;
}
function tracker(s) {
  const rows = Object.entries(s.quests ?? {}).filter(([, st]) => st === 'active').map(([id]) => QUESTS[id]).filter(Boolean);
  if (!rows.length) return '';
  return `<div id="quest-tracker" style="position:fixed;right:calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px);top:268px;width:220px;box-sizing:border-box;padding:6px 10px 7px;background:rgba(12,14,18,.62);border:1px solid rgba(186,137,80,.45);border-radius:4px;pointer-events:none;z-index:6;text-shadow:0 1px 2px #000,0 0 3px #000">${rows.map((q) => {
    const have = Math.min(q.need.n, count(s, q.need)), done = have >= q.need.n;
    return `<div style="${H};color:#ffd200;font-size:13px">${escBr(q.title)}</div><div style="font:12px Georgia,serif;color:${done ? '#7fff6a' : '#f2e6cf'};padding-left:8px">- ${escBr(q.need.label)}: ${have}/${q.need.n}${done ? ' (Complete)' : ''}</div>${done ? `<div style="font:11px Georgia,serif;color:#cfc0a0;padding-left:8px">Return to ${escBr(q.giver)}</div>` : ''}`;
  }).join('<div style="height:8px"></div>')}</div>`;
}
