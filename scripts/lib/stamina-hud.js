// STAMINA HUD (MMO prompt 2/6): the bar and the run orb, bottom-left over the skills pip; editors' debug lines under it.
// Reads ctx.session.stamHud (player.js writes it when a shown number moves) and player.state. Never throws.
import { ST, drainMul, jumpFeet, feetToM } from './data/stamina.js';
import { levelOf } from './skills-core.js';
import { CB } from './data/combat.js';
const C = { slate: '#343c43', walnut: '#4f3828', parch: '#f2e6cf', gold: '#ba8950', moss: '#9baf84', teal: '#5dada9', ink: '#2a1d13', red: '#c0452e' };
const FONT = 'Georgia,serif';
const STYLE = `<style>@keyframes stFlash{50%{background:${C.red};box-shadow:0 0 10px ${C.red}}}
.stp{background:${C.slate};border:2px solid ${C.walnut};box-shadow:0 0 0 1px #1c1410,4px 4px 0 rgba(20,12,6,.6);border-radius:6px;color:${C.parch};font-family:${FONT}}
.stbtn{font-family:${FONT};font-size:11px;cursor:pointer;border:1px solid ${C.walnut};border-radius:4px;background:${C.gold};color:${C.ink};padding:2px 6px}</style>`;
const boot = (on) => `<svg width="20" height="20" viewBox="0 0 20 20" style="display:block"><path d="M6 2h5v8l6 3v4H4l1-6z" fill="${on ? C.ink : C.parch}" stroke="${C.ink}" stroke-width="1"/><path d="M2 8h3M1 11h4M3 14h2" stroke="${on ? C.ink : C.moss}" stroke-width="1.4" stroke-linecap="round"/></svg>`;
let mk = null, mh = '';
export function staminaHud(ctx, player, docked) { // NORSE-HUD: docked = the vitals frame draws HP/Mana/Run; only the editors' debug stays here
  try {
    if (!ST.on) return '';
    const s = player?.state ?? {}, h = ctx.session?.stamHud ?? { v: ST.max, run: !!s.runOn, forced: false, running: false };
    const ed = !!player?.isEditor && s.skillsOpen && s.skillDebugOpen;
    const rl = levelOf(s.skills?.running | 0), jl = levelOf(s.skills?.jumping | 0);
    const v = Math.max(0, Math.min(ST.max, +h.v || 0)), low = v < ST.lowFlash, on = !!s.runOn;
    const bottom = ((s.mead || s.fed) ? 94 : 50) + 50;
    const hpMax = levelOf(s.skills?.hitpoints ?? CB.hpStartTenths), hp = Math.max(0, Math.min(hpMax, s.hp ?? hpMax));
    const key = `${hp}/${hpMax}|${Math.round(v)}|${on}|${h.forced}|${h.running}|${bottom}|${ed}|${rl}|${jl}|${ed ? v.toFixed(1) : ''}|${!!docked}`;
    if (key === mk) return mh; mk = key;
    const col = h.forced ? C.red : low ? '#d9893a' : C.moss;
    mh = STYLE + (docked ? '' : `<div id="st-plate" class="stp" style="position:fixed;left:18px;bottom:${bottom}px;display:flex;align-items:center;gap:7px;padding:5px 9px 5px 6px;pointer-events:auto;z-index:5">
      <button id="st-run" onclick="sendAction('runToggle',{},{relockPointer:true})" title="Run (R, or hold Shift)" style="width:30px;height:30px;border-radius:50%;border:2px solid ${C.walnut};background:${on ? C.gold : '#5a3b22'};display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0">${boot(on)}</button>
      <div style="width:150px">
        <div style="display:flex;justify-content:space-between;font-size:10px;letter-spacing:.1em;opacity:.85"><span>❤ HP</span><span style="font-size:12px;font-weight:bold;color:${hp <= hpMax * 0.25 ? '#f0b07a' : C.parch}">${hp}/${hpMax}</span></div>
        <div id="st-hp" style="height:7px;margin:2px 0 3px;background:#3b1a14;border:1px solid #2a120c;overflow:hidden"><i style="display:block;height:100%;width:${hpMax ? hp / hpMax * 100 : 0}%;background:${C.red};transition:width .2s"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;letter-spacing:.1em;opacity:.85"><span>${h.forced ? 'WINDED' : on ? 'RUN' : 'WALK'}</span><span style="color:${low ? '#f0b07a' : C.parch};font-size:12px;font-weight:bold">${Math.floor(v)}</span></div>
        <div id="st-bar" style="height:7px;margin-top:3px;background:#5a3b22;border:1px solid #3b2716;overflow:hidden;${low ? 'animation:stFlash .6s steps(1) infinite' : ''}"><i style="display:block;height:100%;width:${v}%;background:${col};transition:width .2s linear"></i></div></div></div>`)
      + (ed ? `<div id="st-debug" class="stp" style="position:fixed;left:18px;bottom:${bottom + 104}px;padding:7px 9px;font-size:11px;line-height:1.5;pointer-events:auto;z-index:5;width:220px">
        <div style="letter-spacing:.14em;color:${C.gold};margin-bottom:3px">👟 STAMINA DEBUG</div>
        <div>stamina <b>${v.toFixed(1)}</b>/${ST.max}${h.forced ? ' · <span style="color:#f0b07a">forced walk</span>' : ''}${h.running ? ' · draining' : ''}</div>
        <div>run L${rl}: drain ×${drainMul(rl).toFixed(3)} · ${(ST.runDrain * drainMul(rl)).toFixed(2)}/s · bar ${Math.round(ST.max / (ST.runDrain * drainMul(rl)))} s</div>
        <div>jump L${jl}: ${jumpFeet(jl).toFixed(2)} ft (${feetToM(jumpFeet(jl)).toFixed(2)} m) · cost ${(ST.jumpCost * drainMul(jl)).toFixed(1)}</div>
        <div style="display:flex;gap:4px;align-items:center;margin-top:4px">Run <input id="st-rl" type="number" min="1" max="99" value="${rl}" style="width:40px;font-size:11px"><button class="stbtn" onclick="sendAction('skillDebugSet',{skill:'running',level:+document.getElementById('st-rl').value||1})">Set</button>
          Jump <input id="st-jl" type="number" min="1" max="99" value="${jl}" style="width:40px;font-size:11px"><button class="stbtn" onclick="sendAction('skillDebugSet',{skill:'jumping',level:+document.getElementById('st-jl').value||1})">Set</button></div></div>` : '');
    return mh;
  } catch (e) { return ''; }
}
