// PRAYER window body + the points bar (OSRS-PLAN P1). Pure: returns HTML, never writes. Wiring (Savi's lane): see OSRS-PLAN P1 / inbox.
// Click = sendAction('prayToggle', { id }); prayer-player.js judges it. Reads s.prayer { pts, on } and the Prayer level.
import { PRAYERS, PRAYER } from '../../scripts/lib/data/prayers.js';
import { normPrayer, secondsLeft, prayerMax } from '../../scripts/lib/prayer-core.js';
import { levelOf } from '../../scripts/lib/skills-core.js';
import { esc } from '../../scripts/lib/esc.js';
const STAT = { atk: 'Attack', str: 'Strength', def: 'Defence', rng: 'Ranged', mag: 'Magic' };
const GLYPH = { def: '🛡', str: '⚔', atk: '✦', rng: '➶', mag: '✺', prot: '✚' };
function effectText(p) {
  const b = Object.entries(p.boost ?? {}).filter(([k]) => STAT[k]).map(([k, v]) => `${STAT[k]} +${Math.round((v - 1) * 100)}%`);
  if (p.boost?.magDmg) b.push(`spell damage +${Math.round(p.boost.magDmg * 100)}%`);
  if (p.protect) b.push(`blocks all ${p.protect} damage from monsters`);
  if (p.fx === 'heal') b.push('hitpoints regenerate twice as fast'); if (p.fx === 'keep') b.push('keep one more item on death'); if (p.fx === 'restore') b.push('lowered stats recover twice as fast');
  return b.join(', ');
}
export const prayerLevel = (s) => levelOf(s.skills?.prayer | 0);
export function prayerBody(s) {
  const lv = prayerLevel(s), st = normPrayer(s.prayer, lv), max = prayerMax(lv), left = secondsLeft(st);
  const cells = PRAYERS.map((p) => {
    const lock = p.level > lv, on = st.on.includes(p.id), sec = Math.round(PRAYER.tickSec * PRAYER.resistance / p.drain);
    const tip = `${p.name} · Prayer ${p.level} · ${effectText(p) || ''}${p.note ? ' (' + p.note + ')' : ''} · one point lasts ${sec} s${lock ? ' · locked' : ''}`;
    return `<button id="pr-${p.id}" class="h4-slot${on ? ' on' : ''}" title="${esc(tip)}" onclick="sendAction('prayToggle',{id:'${p.id}'})" style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:19px;color:#f2e6cf;text-shadow:1px 1px 0 #000;${on ? 'box-shadow:0 0 0 2px #e8d878,0 0 8px #e8d878;background:rgba(232,216,120,.22);' : ''}${lock ? 'filter:grayscale(1);opacity:.55;cursor:default;' : ''}">${GLYPH[(p.tags ?? [])[0]] ?? '☼'}<b style="position:absolute;right:2px;bottom:1px;font-size:11px;line-height:1;color:${lock ? '#d98a6a' : '#e8d878'};text-shadow:1px 1px 0 #000,-1px 0 0 #000">${p.level}</b></button>`;
  }).join('');
  const pct = Math.round(st.pts / max * 100), mins = Number.isFinite(left) ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} left` : 'no prayer on';
  return `<div style="display:grid;grid-template-columns:repeat(7,40px);gap:3px;justify-content:center">${cells}</div>`
    + `<div id="pr-points" style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(186,137,80,.35);font-size:13px;color:#f2e6cf"><div style="display:flex;justify-content:space-between;gap:8px"><span>✚ Prayer ${lv}</span><span>${st.pts} / ${max} · ${esc(mins)}</span></div>`
    + `<div style="height:9px;margin-top:4px;background:#1c130c;border:1px solid #ba8950"><div style="width:${pct}%;height:100%;background:linear-gradient(#e8d878,#a8903c)"></div></div></div>`
    + `<div style="font-size:12px;opacity:.85;margin-top:5px;text-align:center;color:#f2e6cf">click to switch on or off · hover for what it does · pray at an altar to refill</div>`;
}
// one frame row (same shape as frames.js bar()): label + numbers + a percentage, for the vitals frame
export function prayerRow(s) { const lv = prayerLevel(s), st = normPrayer(s.prayer, lv), max = prayerMax(lv); return { label: 'Prayer', now: st.pts, max, pct: Math.round(st.pts / max * 100), on: st.on.length > 0 }; }
