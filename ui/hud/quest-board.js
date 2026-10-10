// The quest board's parchment (player.state.boardRead, scripts/quest-board.js): your quests pinned on top, today's postings below.
import { postingsOf } from '../../scripts/lib/data/quest-board.js';
import { QUESTS } from '../../scripts/lib/data/quests.js';
import { esc } from '../../scripts/lib/esc.js';
export function questBoardHud(ctx, player) {
  const r = player?.state?.boardRead; if (!r) return '';
  const qs = player.state.quests ?? {};
  const pinned = Object.entries(QUESTS).map(([id, q]) => {
    const st = qs[id], tag = st === 'done' ? '✔ done' : st === 'active' ? 'underway' : 'new';
    const col = st === 'done' ? '#5d7a3a' : st === 'active' ? '#8a6a20' : '#b03a1a';
    return `<div style="display:flex;gap:10px;align-items:baseline;margin:4px 0"><span style="color:${col};font-weight:bold;min-width:74px;font-size:12px;text-transform:uppercase">${tag}</span><span><b>${esc(q.title)}</b> · ${esc(q.giver)}<br><span style="font-size:13px;opacity:.85">${esc(q.objective)}</span></span></div>`;
  }).join('');
  const notes = postingsOf(r.day).map((n, i) => `<div style="background:#f6ecd4;border:1px solid #c9ab7a;padding:8px 10px;box-shadow:2px 3px 0 rgba(60,40,20,.25);transform:rotate(${[-1.5, 1.2, -0.6, 1.8][i % 4]}deg)">
<div style="font-weight:bold;color:#4f3828">${esc(n.title)}</div><div style="font-size:13px;line-height:1.35;margin:4px 0">${esc(n.text)}</div><div style="font-size:11px;color:#7a5530;text-align:right">— ${esc(n.by)}</div></div>`).join('');
  return `<div style="position:fixed;left:50%;top:46%;transform:translate(-50%,-50%);width:min(560px,90vw);pointer-events:none;font-family:Georgia,serif;color:#3a2a1e;animation:qbIn .45s ease-out">
<style>@keyframes qbIn{from{transform:translate(-50%,-46%);opacity:0}to{transform:translate(-50%,-50%);opacity:1}}</style>
<div style="background:linear-gradient(#6b4a30,#4f3828);padding:12px;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.5)">
<div style="background:#b98a5a;padding:14px 16px;border-radius:3px;box-shadow:inset 0 0 18px rgba(60,35,15,.5)">
<div style="text-align:center;font-size:14px;letter-spacing:.24em;text-transform:uppercase;color:#f2e6cf;text-shadow:0 1px 2px #3a2614">Ravenholdt Quest Board</div>
<div style="background:#f2e6cf;margin:10px 0;padding:8px 12px;border:1px solid #c9ab7a">${pinned}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${notes}</div>
<div style="text-align:center;font-size:11px;color:#f2e6cf;margin-top:10px;opacity:.85">new postings every day · E to roll up</div>
</div></div></div>`;
}
