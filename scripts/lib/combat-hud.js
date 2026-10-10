// COMBAT (MMO prompt 3/6): the Combat tab inside the Skills panel. Weapon, attack style, autocast spell,
// and the live readouts: max hit and hit chance vs the targeted (or nearest) enemy. Pure: returns HTML.
import { WEAPONS, SPELLS, STYLES } from './data/combat.js';
import { gearOf } from './equip-core.js';
import { weaponOf, styleOf, stylesFor, spellOf, swingStats, attackTicks, rangeOf, combatLevel, playerMagicDefLevel } from './combat-core.js';
import { mods as prayMods } from './prayer-core.js';
import { runeText, maxHitFor } from './data/spells.js';
import { levelOf } from './skills-core.js';
import { quiverArrow } from './fletch-core.js';
import { esc } from './esc.js';
const C = { slate: '#343c43', walnut: '#4f3828', parch: '#f2e6cf', gold: '#ba8950', ink: '#2a1d13', red: '#b8382a', blue: '#3b6fc2' };
const IDS = ['attack', 'strength', 'defence', 'hitpoints', 'ranged', 'magic', 'prayer'];
export const cbLevels = (s) => Object.fromEntries(IDS.map((k) => [k, levelOf(k === 'hitpoints' ? (s.skills?.hitpoints ?? 11540) : (s.skills?.[k] | 0))]));
export const cbLevelOf = (s) => combatLevel(cbLevels(s));
export function cbTarget(ctx, player) {
  try {
    const s = player?.state ?? {};
    if (s.fight?.target) { const o = ctx.getObject?.(s.fight.target); if (o) return { id: o.id, state: o.state, fighting: true }; }
    const p = player?.worldFeetPosition ?? player?.feetPosition; if (!p) return null;
    const rows = ctx.query?.({ tags: ['enemy'], center: p, radius: 15 }) ?? [];
    let best = null, bd = 1e9; for (const r of rows) { const d = Math.hypot(r.feetPosition.x - p.x, r.feetPosition.z - p.z); if (d < bd) { bd = d; best = r; } }
    return best ? { id: best.id, state: best.state, fighting: false } : null;
  } catch (e) { return null; }
}
export function combatTab(s, tgt) {
  const L = cbLevels(s), w = weaponOf(s.cbWeapon), st = styleOf(w, s.cbStyle), sp = spellOf(s.cbSpell);
  const btn = (on) => `font-family:Georgia,serif;font-size:11px;cursor:pointer;border:1px solid ${C.walnut};border-radius:4px;padding:5px 4px;background:${on ? C.gold : '#5a3b22'};color:${on ? C.ink : C.parch};${on ? 'font-weight:bold' : ''}`;
  const weapons = `<div style="grid-column:1/3;padding:6px 8px;background:${C.parch};color:${C.ink};border:1px solid ${C.walnut};border-radius:4px;font-size:12px">Wielding <b>${esc(w.name)}</b> · ${w.speed} ticks${w.bonus ? ` · ${w.kind === 'magic' ? 'magic +' + (w.bonus.magic | 0) : w.kind === 'ranged' ? 'ranged +' + (w.bonus.ranged | 0) : 'stab ' + (w.bonus.stab | 0) + ' · slash ' + (w.bonus.slash | 0) + ' · crush ' + (w.bonus.crush | 0)} · str ${w.str | 0}` : ''}<br><span style="font-size:10px;opacity:.7">change it in your pack (click a weapon) or the Character window</span></div>`;
  const styles = stylesFor(w).map((x) => {
    const xp = w.kind === 'magic' ? 'base + 2/dmg Magic' : Object.entries(x.xp).map(([k, v]) => `${+v.toFixed(2)} ${k[0].toUpperCase() + k.slice(1, 3)}`).join(' · ');
    const boost = Object.entries(x.boost ?? {}).map(([k, v]) => `+${v} ${k.slice(0, 3)}`).join(' ') + (x.speed ? ' · 1 tick faster' : '') + (x.range ? ' · +range' : '');
    return `<button style="${btn(x.id === st.id)};text-align:left" onclick="sendAction('cbStyle',{id:'${x.id}'})"><b>${esc(x.name)}</b>${x.type ? ` <i style="font-size:9px;opacity:.85">(${x.type}, ${x.stance})</i>` : ''} <span style="font-size:9px;opacity:.8">${esc(boost)}</span><br><span style="font-size:9px;opacity:.75">${esc(xp)} · +1.33 HP</span></button>`;
  }).join('');
  const spells = w.kind !== 'magic' ? '' : `<div style="font-size:11px;letter-spacing:.14em;color:${C.gold};margin:8px 0 4px">✨ AUTOCAST · runes from your pack</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px">${SPELLS.map((x) => { const ok = x.level <= L.magic; return `<button title="${esc(x.name)} · lvl ${x.level} · max ${maxHitFor(x, L.magic)} · ${x.xp} xp · ${runeText(x)}" ${ok ? '' : 'disabled'} style="${btn(x.id === sp.id)};padding:3px 1px;font-size:9px;${ok ? '' : 'opacity:.35;cursor:default'}" onclick="sendAction('cbSpell',{id:'${x.id}'})"><span style="color:${x.id === sp.id ? C.ink : x.color}">●</span> ${esc(x.name.replace(' ', '<br>'))}</button>`; }).join('')}</div>`;
  let read = `<div style="opacity:.7">no enemy within 15 m</div>`;
  if (tgt) {
    const e = tgt.state ?? {}, S = swingStats(L, w, st, { defence: e.defence ?? 1, magic: e.magic ?? 1, defBonus: e.defBonus ?? 0, rangedDefBonus: e.rangedDefBonus ?? 0, magicDefBonus: e.magicDefBonus ?? 0 }, s.cbSpell, quiverArrow(s.supplies, s.equip?.ammo)?.str, gearOf(s.equip, w.id), prayMods(s.prayer));
    read = `<div>${tgt.fighting ? 'fighting' : 'nearest'}: <b style="color:${C.gold}">${esc(e.name ?? tgt.id)}</b> · hp ${Math.max(0, e.hp ?? 0)}/${e.maxHp ?? '?'}</div>
      <div style="display:flex;gap:12px;margin-top:3px"><span>max hit <b style="color:${C.red};font-size:15px">${S.maxHit}</b></span><span>hit chance <b style="color:${C.gold};font-size:15px">${(S.chance * 100).toFixed(1)}%</b></span></div>
      <div style="font-size:10px;opacity:.7">atk roll ${S.A.toLocaleString()} vs def roll ${S.D.toLocaleString()} · every ${attackTicks(w, st)} ticks (${(attackTicks(w, st) * 0.6).toFixed(1)} s) · reach ${rangeOf(w, st)} m${w.kind === 'ranged' ? ` · ${quiverArrow(s.supplies, s.equip?.ammo) ? `${quiverArrow(s.supplies, s.equip?.ammo).name} arrows ×${s.supplies[quiverArrow(s.supplies, s.equip?.ammo).arrows]} (str ${quiverArrow(s.supplies, s.equip?.ammo).str})` : 'no arrows'}` : ''}</div>`;
  }
  return `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span style="font-size:12px;letter-spacing:.14em;color:${C.gold}">⚔ COMBAT</span><span style="font-size:13px">Combat lvl <b style="color:${C.gold};font-size:16px">${combatLevel(L)}</b></span></div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px">${weapons}</div>
    <div style="font-size:11px;letter-spacing:.14em;color:${C.gold};margin:8px 0 4px">STYLE</div>
    <div style="display:grid;grid-template-columns:1fr;gap:3px">${styles}</div>
    <button style="${btn(s.autoRet !== false)};margin-top:5px;width:100%;display:flex;justify-content:space-between;align-items:center" onclick="sendAction('cbAutoRet')"><b>⚔ Auto Retaliate</b><span style="font-size:11px;letter-spacing:.1em">${s.autoRet !== false ? '(On)' : '(Off)'}</span></button>${spells}
    <div style="margin-top:8px;padding:6px 7px;background:${C.parch};color:${C.ink};border:1px solid ${C.walnut};border-radius:3px;font-size:12px">${read}</div>
    <div style="font-size:10px;opacity:.6;margin-top:6px;text-align:center">click a dummy to fight · click food in your pack to eat · def vs magic ${playerMagicDefLevel(L.magic, L.defence)}</div>`;
}
