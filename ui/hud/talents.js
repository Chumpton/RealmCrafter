// 3rd person talent tree (creator 2026-10-10: "3rd person is based on talents"). Pure: reads player.state.tp; a press sends 'talent'.
// Look (creator 2026-10-10, "clean this up for talent window"): a riveted dark-iron board, gold-rimmed slots with rank badges,
// glowing gold connectors down each branch, grey locked slots, a red confirm-style close.
import { classOf, cellStyle } from '../../scripts/lib/data/class-spells.js';
import { talentsOf, TIER_AT, tpLevelOf, tpPoints, spentOf, rank, canLearn } from '../../scripts/lib/data/talents.js';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const BOARD = '/cdn/value.86e1e16d60a316b7c3d9191c94f27896bab4322f7fb7fc65f281f6f059366c41.png';
const W = 470, H = 560, COLX = [95, 235, 375], ROW0 = 150, ROWH = 92, SLOT = 52;
const CSS = `<style>
#tp-win{position:fixed;left:50%;top:50%;transform:translate(-50%,-52%);width:${W}px;height:${H}px;z-index:25;pointer-events:auto;
 background:url(${BOARD}) center/100% 100% no-repeat;filter:drop-shadow(0 12px 28px #000c);color:#f2e6cf;font-family:'Cinzel',Georgia,serif}
#tp-win .tp-title{position:absolute;left:0;right:0;top:${H * 0.045}px;text-align:center;font:700 19px/1 'Cinzel',Georgia,serif;letter-spacing:.12em;color:#f6d878;text-shadow:0 2px 2px #000,0 0 8px #f6d87844}
#tp-win .tp-head{position:absolute;left:44px;right:44px;top:74px;display:flex;justify-content:space-between;align-items:center;font:600 13px 'Oswald','PT Sans Narrow',sans-serif;color:#e8dcc0}
#tp-win .tp-head b{color:#f6d878;font-weight:600}
#tp-win .tp-xp{position:absolute;left:44px;right:44px;top:98px;height:7px;border-radius:4px;background:#0a0807;box-shadow:inset 0 1px 2px #000;border:1px solid #4a3a28;overflow:hidden}
#tp-win .tp-xp i{display:block;height:100%;background:linear-gradient(90deg,#7a4fd8,#c39bff)}
#tp-win button.tp-btn{font:600 11px 'Oswald',sans-serif;letter-spacing:.06em;color:#f2e6cf;cursor:pointer;border-radius:4px;padding:4px 12px;
 background:linear-gradient(#3a3532,#1c1917);border:1px solid #8a7656;box-shadow:inset 0 1px 0 #ffffff1a,0 1px 2px #000}
#tp-win button.tp-btn:hover{border-color:#f6d878;color:#fff}
#tp-win svg.tp-lines{position:absolute;left:0;top:0;pointer-events:none}
#tp-win .tp-gate{position:absolute;left:30px;font:600 10px 'Oswald',sans-serif;color:#7d7262;transform:translateY(-50%)}
#tp-win .tp-gate.open{color:#b89a5e}
#tp-win button.tp{position:absolute;width:${SLOT}px;height:${SLOT}px;padding:0;border-radius:6px;cursor:pointer;transform:translate(-50%,-50%);
 background:radial-gradient(circle at 50% 38%,#2c2a29,#0e0d0c);border:2px solid #4b4844;box-shadow:inset 0 0 0 2px #000,inset 0 0 10px #000,0 2px 4px #000a}
#tp-win button.tp .ic{font-size:24px;line-height:${SLOT - 4}px;display:block;filter:grayscale(1) brightness(.55)}
#tp-win button.tp .nm{position:absolute;left:50%;top:${SLOT + 2}px;transform:translateX(-50%);white-space:nowrap;font:600 10.5px/1.1 'Cinzel',Georgia,serif;color:#8f877b;text-shadow:0 1px 2px #000}
#tp-win button.tp em{position:absolute;right:-7px;bottom:-7px;min-width:22px;font:700 10px/16px 'Oswald',sans-serif;font-style:normal;text-align:center;color:#a39b8e;
 background:#0d0c0b;border:1px solid #4b4844;border-radius:4px}
#tp-win button.tp.lit,#tp-win button.tp.can{border-color:#d9b25e;box-shadow:inset 0 0 0 2px #000,inset 0 0 8px #000,0 0 0 1px #6a4f1f,0 0 10px #f6c86655}
#tp-win button.tp.lit .ic,#tp-win button.tp.can .ic{filter:none}
#tp-win button.tp.lit .nm,#tp-win button.tp.can .nm{color:#f2e6cf}
#tp-win button.tp.lit em{color:#f6d878;border-color:#b8913f}
#tp-win button.tp.can{animation:tpPulse 1.6s ease-in-out infinite}
#tp-win button.tp.max{border-color:#ffe08a;box-shadow:inset 0 0 0 2px #000,0 0 0 1px #8a6a2a,0 0 14px #ffd36a88}
#tp-win button.tp.max em{color:#1a1206;background:linear-gradient(#ffe08a,#c99a3a);border-color:#ffe9a8}
@keyframes tpPulse{50%{box-shadow:inset 0 0 0 2px #000,0 0 0 1px #6a4f1f,0 0 16px #f6c866aa}}
#tp-win button.tp:disabled{cursor:default}
#tp-win button.tp:hover .tip{display:block}
#tp-win .tip{display:none;position:absolute;left:50%;bottom:${SLOT + 6}px;transform:translateX(-50%);width:190px;padding:7px 9px;border-radius:5px;background:#0b0a09f2;border:1px solid #8a7656;
 font:500 11.5px/1.35 Georgia,serif;color:#f2e6cf;text-align:left;z-index:3;box-shadow:0 4px 12px #000}
#tp-win .tip b{font-family:'Cinzel',Georgia,serif;color:#f6d878}
#tp-win .tp-foot{position:absolute;left:44px;right:44px;bottom:38px;display:flex;justify-content:space-between;align-items:center}
#tp-win button.tp-close{font:700 13px 'Cinzel',Georgia,serif;letter-spacing:.1em;color:#ffe9c8;cursor:pointer;padding:7px 22px;border-radius:5px;
 background:linear-gradient(#b8262a,#6e0f12);border:2px solid #d9b25e;box-shadow:inset 0 1px 0 #ff9a8a66,inset 0 -2px 4px #0006,0 2px 6px #000;text-shadow:0 1px 2px #000}
#tp-win button.tp-close:hover{background:linear-gradient(#d0353a,#821418)}
</style>`;
export function talentWindow(player) {
  const s = player?.state ?? {}, TALENTS = talentsOf(s.combatMode), cls = classOf(s.combatMode), L = tpLevelOf(s.tp?.xp ?? 0), pts = tpPoints(s), spent = spentOf(s), free = pts - spent;
  const yOf = (tier) => ROW0 + tier * ROWH;
  let nodes = '', lines = '', gates = '';
  for (let tier = 0; tier < TIER_AT.length; tier++) {
    const open = spent >= TIER_AT[tier];
    if (tier) gates += `<span class="tp-gate${open ? ' open' : ''}" style="top:${yOf(tier)}px">${TIER_AT[tier]}</span>`;
    for (let col = 0; col < 3; col++) {
      const t = TALENTS.find((x) => x.tier === tier && x.col === col);
      if (!t) continue;
      const r = rank(s, t.id), can = canLearn(s, t.id), mx = r >= t.max;
      // the branch: a line up to the talent above in this column; gold once that one carries a rank and this tier is open
      const up = TALENTS.find((x) => x.tier === tier - 1 && x.col === col);
      if (up) { const lit = rank(s, up.id) > 0 && open; lines += `<line x1="${COLX[col]}" y1="${yOf(tier - 1) + SLOT / 2 + 16}" x2="${COLX[col]}" y2="${yOf(tier) - SLOT / 2 - 2}" stroke="${lit ? '#f0b84a' : '#3e3b37'}" stroke-width="${lit ? 4 : 3}" stroke-linecap="round"${lit ? ' filter="url(#tpGlow)"' : ''}/>`; }
      const tip = `<b>${esc(t.name)}</b> ${r}/${t.max}<br>${esc(t.desc(Math.max(1, r)))}${!mx && r > 0 ? `<br><span style="color:#9baf84">Next: ${esc(t.desc(r + 1))}</span>` : ''}${!open ? `<br><span style="color:#e07a6a">Spend ${TIER_AT[tier]} points to open.</span>` : ''}`;
      nodes += `<button class="tp${r > 0 ? ' lit' : ''}${can ? ' can' : ''}${mx ? ' max' : ''}" style="left:${COLX[col]}px;top:${yOf(tier)}px" ${can ? '' : 'disabled'} onclick="sendAction('talent',{id:'${t.id}'})"><span class="ic"${t.cell != null ? ` style="${cellStyle(s.combatMode, t.cell)};font-size:0;position:absolute;inset:3px;border-radius:4px"` : ''}>${t.icon}</span><em>${r}/${t.max}</em><span class="nm">${esc(t.name)}</span><span class="tip">${tip}</span></button>`;
    }
  }
  const pct = L.need ? Math.round(L.into / L.need * 100) : 100;
  return `${CSS}<div id="tp-win" data-modal="1"><div class="tp-title">${cls ? esc(cls.name).toUpperCase() + ' ' : ''}TALENTS</div>`
    + `<div class="tp-head"><span>Points Left: <b>${free}</b></span><span>Level ${L.lv} · ${L.need ? `${L.into} / ${L.need} xp` : 'max'}</span><button class="tp-btn" onclick="sendAction('talent',{reset:true})">Reset Talents</button></div>`
    + `<div class="tp-xp"><i style="width:${pct}%"></i></div>`
    + `<svg class="tp-lines" width="${W}" height="${H}"><defs><filter id="tpGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${lines}</svg>`
    + gates + nodes
    + `<div class="tp-foot"><span style="font:600 12px 'Oswald',sans-serif;color:${free > 0 ? '#9baf84' : '#8f877b'}">${free > 0 ? `${free} point${free === 1 ? '' : 's'} to spend` : 'Earn points by leveling'}</span><button class="tp-close" onclick="hudTalents()">CLOSE (N)</button></div></div>`;
}
