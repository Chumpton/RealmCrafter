// GOAL4-S1 W3 (S1c): the player frame, top-left. Portrait, name, Combat + total level, HP, stamina, tracked skill.
// Pure: reads player.state (skills, hp), ctx.session.stamHud (player.js's row) and the norm()ed ui row. Never writes, never throws.
import { tpOn, tpLevelOf } from '../../scripts/lib/data/talents.js';
import { BUILD, UI4 } from '../../scripts/lib/data/windows.js';
import { SKILL_LIST } from '../../scripts/lib/data/skills.js';
import { ST } from '../../scripts/lib/data/stamina.js';
import { CB } from '../../scripts/lib/data/combat.js';
import { levelOf, progress } from '../../scripts/lib/skills-core.js';
import { cbLevelOf } from '../../scripts/lib/combat-hud.js';
import { prayerRow } from './prayer.js';
import { esc } from '../../scripts/lib/esc.js';
import { UIK } from '../../scripts/lib/data/ui-kit.js';
import { kitOn } from './skin.js'; // 3rd Person skin: the gold-and-iron kit; OSRS (default) keeps the markup below untouched

const C = { walnut: '#4f3828', honey: '#ba8950', linen: '#f2e6cf', moss: '#9baf84', hp: 'oklch(0.5 0.18 25)', ink: '#2a1d13', well: '#2e2017' };
const int = (n) => { n = +n; return Number.isFinite(n) ? Math.round(n) : 0; }; // NaN / Infinity -> 0
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const hpTenths = (s) => s.skills?.hitpoints ?? CB.hpStartTenths; // the same default cbLevels and stamina-hud use

let mk = null, mh = '';

export function framePlate(ctx, player, ui) {
  try {
    if (!UI4.frames) return '';
    const s = player?.state ?? {}, V = `data-v="${esc(BUILD)}"`;
    const name = String(player?.displayName ?? '').slice(0, 32) || 'Wanderer';
    const url = typeof player?.portraitUrl === 'string' ? player.portraitUrl : '';
    const combat = int(cbLevelOf(s));
    let total = 0;
    for (const k of SKILL_LIST) total += levelOf(k.id === 'hitpoints' ? hpTenths(s) : (s.skills?.[k.id] | 0));
    total = int(total);
    // HP exactly as stamina-hud line 21, with a non-finite hp drawn as 0 (never NaN)
    const hpMax = int(levelOf(hpTenths(s))), hpRaw = +(s.hp ?? hpMax);
    const hp = Number.isFinite(hpRaw) ? int(clamp(hpRaw, 0, hpMax)) : 0;
    // NORSE-HUD: the one vitals frame; HP / Prayer / Walk-Run with their numbers (the old bottom-left stamina plate's, folded in)
    const h = ctx?.session?.stamHud ?? { v: ST.max, run: !!s.runOn, forced: false, running: false };
    const sv = +(h.v ?? ST.max), sraw = clamp(Number.isFinite(sv) ? sv : 0, 0, ST.max);
    const stam = int(sraw / ST.max * 100), sNow = Math.floor(sraw), on = !!s.runOn, forced = !!h.forced, low = sraw < ST.lowFlash;
    const tk = SKILL_LIST.find((k) => k.id === ui?.track) ?? null;
    let tl = 0, tp = 0, tn = 0;
    if (tk) {
      const p = progress(tk.id === 'hitpoints' ? hpTenths(s) | 0 : (s.skills?.[tk.id] | 0));
      tl = int(p.level); tp = int(clamp(+p.pct || 0, 0, 1) * 100); tn = int(Math.ceil(+p.toNext || 0));
    }
    const pr = prayerRow(s);
    const key = `${name}|${url}|${combat}|${total}|${hp}|${hpMax}|${stam}|${sNow}|${on}|${forced}|${low}|${pr.now}|${pr.max}|${pr.on}|${tk ? tk.id : ''}|${tl}|${tp}|${tn}|${BUILD}|${kitOn(player) ? 1 : 0}|${s.combatMode}|${s.tp?.xp ?? 0}`;
    if (key === mk) return mh;
    const hpPct = hpMax > 0 ? int(hp / hpMax * 100) : 0;
    if (kitOn(player)) { const tpl = tpOn(s) ? tpLevelOf(s.tp?.xp ?? 0) : null; mh = kitPlayer({ tpl,  V, name, url, combat, total, hp, hpMax, hpPct, stam, sNow, on, forced, low, pr }); mk = key; return mh; }
    const titleName = (n) => String(n).replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
    const letter = esc(Array.from(name)[0]?.toUpperCase() ?? '?');
    const bar = (id, fid, pct, col, hgt, lbl, num, extra) => `<div ${V} id="${id}" class="nh-bar h4-bar-track" style="position:relative;height:${hgt}px;overflow:hidden;margin-top:3px${extra ?? ''}">`
      + `<div ${V}${fid ? ` id="${fid}"` : ''} class="h4-bar-fill" style="height:100%;width:${pct}%;background:${col};transition:width .2s linear"></div>`
      + (lbl || num ? `<div ${V} style="position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-end;padding:0 6px;font-size:10px;line-height:1;color:#fff;text-shadow:1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000,1px 1px 1px #000">`
        + `<span ${V} style="position:absolute;left:6px;font-family:'Cinzel',Georgia,serif;letter-spacing:.06em;opacity:.95">${lbl}</span><span ${V} class="nh-num" style="font-size:${hgt >= 12 ? 11 : 9}px">${num}</span></div>` : '') + `</div>`;
    const portrait = `<div ${V} style="position:relative;flex:0 0 64px;width:64px;height:64px">`
      + `<i ${V} class="wp-metal"></i><svg ${V} class="wp-crest" viewBox="0 0 40 14" width="40" height="14"><path d="M20 1 L24 7 L33 3 L29 10 L38 9 L30 13 H10 L2 9 L11 10 L7 3 L16 7 Z" fill="url(#wpg)" stroke="#2a1a08" stroke-width=".8"/><defs><linearGradient id="wpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#d4a63c"/><stop offset="1" stop-color="#7a5414"/></linearGradient></defs></svg>`
      + `<div ${V} class="wp-ring" style="position:absolute;inset:0;border-radius:50%;border:2px solid #ba8950;box-shadow:inset 0 0 0 2px #140c07,inset 0 2px 8px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.5);background:radial-gradient(circle at 50% 35%,#4b3624,#1c130c);overflow:hidden">`
      + `<div ${V} style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:bold 30px/1 'Cinzel',Georgia,serif;color:#e2b673;text-shadow:0 -1px 0 #000,0 1px 0 rgba(242,230,207,.25)">${letter}</div>`
      + (url ? `<img ${V} src="${esc(url)}" alt="" onerror="this.style.display='none'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%">` : '') + `</div>`
      + `<div ${V} class="nh-num wp-lv" title="Combat level" style="position:absolute;left:-5px;bottom:-4px;min-width:22px;height:22px;box-sizing:border-box;padding:0 4px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#1e140c;background:linear-gradient(#f0cf8a,#ba8950);border:1px solid #140c07;box-shadow:0 1px 3px rgba(0,0,0,.6)">${combat}</div></div>`;
    const track = tk ? `<div ${V} id="hud-track" style="margin-top:7px;padding-top:5px;border-top:1px solid rgba(186,137,80,.35);font-size:12px">`
      + `<div ${V} style="display:flex;justify-content:space-between;align-items:baseline"><span ${V}>${esc(tk.icon)} ${esc(tk.name)}</span><span ${V} class="nh-num">Lvl <b ${V} style="color:#e2b673">${tl}</b>${tl < 99 ? ` <span ${V} style="opacity:.7;font-size:10px">${tn.toLocaleString('en-US')} xp to ${tl + 1}</span>` : ''}</span></div>`
      + bar('hud-track-xp', '', tl >= 99 ? 100 : tp, '#ba8950', 4, '', '') + `</div>` : '';
    const scol = forced ? '#c0452e' : low ? '#d9893a' : 'linear-gradient(90deg,#7f9a5c,#c9b25a)';
    const boot = `<svg width="16" height="16" viewBox="0 0 20 20" style="display:block"><path d="M6 2h5v8l6 3v4H4l1-6z" fill="${on ? '#1e140c' : '#f2e6cf'}" stroke="#1e140c" stroke-width="1"/><path d="M2 8h3M1 11h4M3 14h2" stroke="${on ? '#1e140c' : '#9baf84'}" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    const runBtn = `<button ${V} id="st-run" class="nh-btn${on ? ' on' : ''}" onclick="sendAction('runToggle',{},{relockPointer:true})" title="Run (R, or hold Shift)" style="flex:0 0 22px;width:22px;height:18px;margin-top:3px;padding:0;display:flex;align-items:center;justify-content:center">${boot}</button>`;
    mh = `<div ${V} id="hud-player" class="nh-panel h4-plate" style="position:fixed;left:16px;top:calc(var(--spawn-safe-area-top,0px) + 14px);pointer-events:none;width:298px;box-sizing:border-box;padding:12px 18px 11px 14px;z-index:60;font-size:14px;color:${C.linen}">`
      + `<div ${V} style="display:flex;gap:11px;align-items:center">${portrait}`
      + `<div ${V} id="st-plate" style="flex:1;min-width:0">`
      + `<div ${V} class="nh-title" style="font-family:'Cinzel','Marcellus SC','Palatino Linotype',Georgia,serif!important;text-transform:none!important;letter-spacing:.02em!important;font-size:16px;font-weight:700;color:#ffd100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:0!important;box-shadow:none!important;text-shadow:1px 1px 0 #000,0 0 3px #000">${esc(titleName(name))}</div>`
      + `<div ${V} id="hud-levels" class="nh-num" style="font-size:11px;font-weight:500;opacity:.85;margin:1px 0 2px">Combat ${combat} · Total ${total}</div>`
      + bar('hud-hp', 'st-hp', hpPct, 'linear-gradient(#d0503a,#8e2a1c)', 14, 'Health', `${hp} / ${hpMax}`)
      + bar('hud-prayer', 'st-prayer', pr.pct, 'linear-gradient(#efe08a,#a8903c)', 10, 'Prayer', `${pr.now} / ${pr.max}`, pr.on ? ';box-shadow:0 0 6px #efe08a' : '')
      + `<div ${V} style="display:flex;gap:4px;align-items:flex-start;pointer-events:auto">${runBtn}<div ${V} style="flex:1;min-width:0">`
      + bar('hud-stam', 'st-bar', stam, scol, 9, forced ? 'Winded' : on ? 'Run' : 'Walk', `${sNow} / ${ST.max}`, low ? ';animation:nhLow .6s steps(1) infinite' : '')
      + `</div></div></div></div>`
      + `</div>`; void track; // WOW-HUD: tracked skill -> the bar's XP strip
    mk = key;
    return mh;
  } catch (e) { return ''; }
}

// ---- 3rd Person skin (creator 2026-10-09): the painted frame-player art, live fills clipped into its own bar wells.
// Geometry is the art's native px (542x227, Campton's plate 2026-10-09, cut out), drawn at K; every box below was measured off the cut PNG.
const PLATE = '/cdn/value.15dc5ac48702fad21641ffd8168a2a22c57cd47513dcc889e81d53d513be0b51.png'; // Oct 10 (c): smoothed 2x, clean anti-aliased rim (creator: "they have rough pixelly edges"); (b): the same art with the five buff/debuff slots erased (creator: "remove the debuff containers, but remember where they go")
// AURA_SLOTS: where the five buff/debuff containers sat on the original plate (/cdn/value.53e0c6ee…png), plate px at 542×227, x0 y0 x1 y1: bring them back here
export const AURA_SLOTS = [[234,155,282,204],[291,155,339,204],[348,155,396,204],[406,155,454,204],[463,155,512,204]];
const PLATE_WITH_SLOTS = '/cdn/value.53e0c6ee37858db5743ef0022d40882bfbea8c1c225a18d72a5be9f54e63c56f.png'; void PLATE_WITH_SLOTS; // Oct 10: the creator's own frame art (screenshot-2026-10-09-165011), hollowed: portrait, level ring, bars and slots cut through
const K = 0.7, P = (n) => `${(n * K).toFixed(1)}px`;
const BOX = (x1, y1, x2, y2) => `left:${P(x1)};top:${P(y1)};width:${P(x2 - x1)};height:${P(y2 - y1)}`;
const KF = (n) => `url('${UIK[n]}') 0 0/100% 100% no-repeat`;
const INK = '1px 0 0 #0b0703,-1px 0 0 #0b0703,0 1px 0 #0b0703,0 -1px 0 #0b0703,1px 1px 2px #000';
const KPF_CSS = `<style>@font-face{font-family:'WowFriz';src:url(/cdn/value.2f6fa616f76102d81c4a935c3a8cd547a8db9de679ad9fda9cfd42f16e7f0743.ttf) format('truetype');font-display:swap}@font-face{font-family:'WowNarrow';font-weight:700 900;src:url(/cdn/value.ae9051970e75e3e260f15d103bb7642271bdb6b36b78e7604d588582cea7948e.ttf) format('truetype');font-display:swap}
#hud-player.kpf{display:block!important;position:fixed;left:16px;top:calc(var(--spawn-safe-area-top,0px) + 10px);width:${P(542)};height:${P(227)};padding:0!important;box-sizing:border-box;transform:none!important;background:url('${PLATE}') 0 0/${P(542)} ${P(227)} no-repeat!important;border:0!important;border-radius:0!important;box-shadow:none!important;filter:drop-shadow(0 3px 5px rgba(0,0,0,.55));image-rendering:auto;font-family:Georgia,serif!important;color:#f2e6cf;text-shadow:${INK}}
#hud-player.kpf .kpf-por{position:absolute;${BOX(43, 33, 183, 173)};clip-path:circle(50%);border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 35%,#3a414a,#101215);box-shadow:inset 0 0 ${P(14)} rgba(0,0,0,.9)}
#hud-player.kpf .kpf-por img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#hud-player.kpf .kpf-por b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 ${P(54)}/1 Georgia,serif;color:#e2b673}
#hud-player.kpf .kpf-por::after{content:'';position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 ${P(10)} ${P(2)} rgba(0,0,0,.75)}
#hud-player.kpf .kpf-lv{position:absolute;${BOX(163, 152, 200, 189)};border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 45% 35%,#2a2f35,#0b0c0e);font:700 ${P(17)}/1 'WowNarrow','Oswald',sans-serif!important;color:#ffd76a}
#hud-player.kpf .kpf-name{position:absolute;${BOX(216, 55, 490, 78)};background:linear-gradient(#55595f,#2f3236);box-shadow:inset 0 1px 3px #000;border-radius:${P(3)};display:flex;align-items:center;gap:${P(6)};padding:0 ${P(6)};box-sizing:border-box;white-space:nowrap}
#hud-player.kpf .kpf-name>b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font:700 ${P(19)}/1 'WowFriz','Cinzel',Georgia,serif;letter-spacing:.03em;color:#f1d79a;text-shadow:${INK}}
#hud-player.kpf #hud-levels{display:none!important;font:700 ${P(14)}/1 'WowNarrow','Oswald',sans-serif!important;color:#e2c48a;opacity:1;margin:0}
#hud-player.kpf .kbar{position:absolute!important;margin:0!important;overflow:hidden;border:0!important;border-radius:${P(4)}!important;background:linear-gradient(#060708,#15171a)!important;box-shadow:inset 0 1px 3px #000!important;animation:none}
#hud-player.kpf #hud-hp{${BOX(219, 95, 491, 113)}}
#hud-player.kpf #hud-prayer{${BOX(218, 122, 491, 140)}}
#hud-player.kpf #hud-stam{${BOX(218, 75, 488, 78)};height:${P(3)}!important;border-radius:0!important}#hud-player.kpf #hud-stam>span{display:none}
#hud-player.kpf .kbar::after,#hud-target .kbar::after{content:'';position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:inset 0 ${P(3)} ${P(2)} rgba(255,240,210,.22),inset 0 -${P(5)} ${P(6)} rgba(0,0,0,.55),inset 0 0 0 1px rgba(0,0,0,.6);z-index:1}#hud-player.kpf .kbar>span,#hud-target .kbar>span{z-index:2}
#hud-player.kpf #hud-prayer.on{box-shadow:inset 0 1px 3px #000,0 0 ${P(9)} #8fb3ff!important}
#hud-player.kpf #hud-stam.low{animation:nhLow .6s steps(1) infinite}
#hud-player.kpf #st-hp,#hud-player.kpf #st-prayer,#hud-player.kpf #st-bar{position:absolute;left:0;top:0;bottom:0;height:auto;background:var(--kf)!important;box-shadow:none!important;transition:width .2s linear}
#hud-player.kpf .kbar>span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 ${P(7)};font:700 ${P(14)}/1 'WowNarrow','Oswald',sans-serif;color:#f2e6cf;text-shadow:${INK};white-space:nowrap}
#hud-player.kpf .kbar>span>i{display:none}#hud-player.kpf .kbar>span>em{font-style:normal;font-weight:700}
#hud-player.kpf #hud-stam>span{font-size:${P(12)};padding:0 ${P(5)}}
#hud-player.kpf .nh-num{font-family:'WowNarrow','Oswald',sans-serif!important;letter-spacing:0}
#hud-player.kpf #st-run{position:absolute;${BOX(228, 150, 260, 182)};border-radius:50%!important;outline:${P(2)} solid #9a7a45;padding:0;margin:0;display:flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer;background:radial-gradient(circle at 45% 35%,#2a2f35,#0b0c0e)!important;border:0!important;box-shadow:inset 0 0 ${P(6)} #000!important}
#hud-player.kpf #st-run.on{background:radial-gradient(circle at 45% 35%,#f3d78a,#9a6c26)!important}
#hud-player.kpf #st-run:hover{box-shadow:inset 0 0 ${P(6)} #000,0 0 ${P(8)} #f3d78a!important}
@media (max-width:600px){#hud-player.kpf{transform:scale(.8)!important;transform-origin:top left}}
</style>`;
function kitPlayer(d) {
  const { tpl, V, name, url, combat, total, hp, hpMax, hpPct, stam, sNow, on, forced, low, pr } = d;
  const tn = String(name).replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
  const bar = (id, fid, pct, fill, lbl, num, cls) => `<div ${V} id="${id}" class="nh-bar h4-bar-track kbar${cls ? ' ' + cls : ''}">`
    + `<div ${V} id="${fid}" class="h4-bar-fill" style="width:${pct}%;--kf:${KF(fill)}"></div><span ${V}><i ${V}>${lbl}</i><em ${V} class="nh-num">${num}</em></span></div>`;
  const boot = `<svg width="${P(30)}" height="${P(30)}" viewBox="0 0 20 20" style="display:block"><path d="M6 2h5v8l6 3v4H4l1-6z" fill="${on ? '#1e140c' : '#f2e6cf'}" stroke="#1e140c" stroke-width="1"/><path d="M2 8h3M1 11h4M3 14h2" stroke="${on ? '#1e140c' : '#e2c48a'}" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  return `<div ${V} id="hud-player" class="nh-panel h4-plate kpf" style="pointer-events:none;z-index:60">${KPF_CSS}`
    + `<div ${V} class="kpf-por"><b ${V}>${esc(Array.from(name)[0]?.toUpperCase() ?? '?')}</b>${url ? `<img ${V} src="${esc(url)}" alt="" onerror="this.style.display='none'">` : ''}</div>`
    + `<div ${V} class="nh-num kpf-lv">${tpl ? tpl.lv : combat}</div>`
    + `<div ${V} id="st-plate">`
    + `<div ${V} class="kpf-name" title="${tpl ? (tpl.need ? Math.round(tpl.into / tpl.need * 100) + '% to level ' + (tpl.lv + 1) : 'Max level') : 'Combat ' + combat + ' · Total ' + total}"><b ${V} style="text-align:center">${esc(tn)}</b>${tpl ? `<span ${V} id="hud-levels" class="nh-num" title="Character xp · N for talents">${tpl.need ? Math.round(tpl.into / tpl.need * 100) + '% to ' + (tpl.lv + 1) : 'Max'}</span>` : `<span ${V} id="hud-levels" class="nh-num" title="Combat · Total level">Cb ${combat} · ${total}</span>`}</div>`
    + bar('hud-hp', 'st-hp', hpPct, hpPct < 30 ? 'fill-red' : 'fill-green', 'Health', `${hp} / ${hpMax}`)
    + bar('hud-prayer', 'st-prayer', pr.pct, 'fill-blue', 'Mana', `${pr.now} / ${pr.max}`, pr.on ? 'on' : '')
    + bar('hud-stam', 'st-bar', stam, forced ? 'fill-crimson' : 'fill-gold', forced ? 'Winded' : on ? 'Run' : 'Walk', `${sNow} / ${ST.max}`, low ? 'low' : '')
    + `<button ${V} id="st-run" class="nh-btn${on ? ' on' : ''}" onclick="sendAction('runToggle',{},{relockPointer:true})" title="Run (R, or hold Shift)">${boot}</button>`
    + `</div></div>`;
}

// ---- target frame (creator 2026-10-10: "use the same player frame but for enemies, and reverse the side of the head and level area"):
// the player plate mirrored; every box is the player's box reflected about the 542 px plate width (x' = 542 - x).
const MX = (x1, y1, x2, y2) => BOX(542 - x2, y1, 542 - x1, y2);
// Oct 10 (c): the target's own plate, the player art with the two lower slots cut out: one bar slot (217..501 x 55..77); a secondary bar rides under it only while there is one
const PLATE_T = '/cdn/value.1869fab13ec330dc55103969b79680caf93cc5692888e5b45d37fc0ea2757048.png';
const FOE_FILL = 'linear-gradient(180deg,#ffd27a 0%,#e8742c 14%,#c8261a 45%,#8e1210 80%,#5a0a08 100%)';
const KTF_CSS = `<style>
#hud-target.kpf{position:fixed;left:${16 + 542 * K + 14}px;top:calc(var(--spawn-safe-area-top,0px) + 10px);width:${P(542)};height:${P(227)};pointer-events:none;z-index:60;filter:drop-shadow(0 3px 5px rgba(0,0,0,.55));font-family:Georgia,serif;color:#f2e6cf}
#hud-target.kpf>.bg{position:absolute;inset:0;background:url('${PLATE_T}') 0 0/${P(542)} ${P(227)} no-repeat;transform:scaleX(-1)}
#hud-target.kpf.dn{filter:grayscale(1) brightness(.75)}#hud-target.kpf.hit{animation:wtfhit .2s ease-out}
#hud-target .kpf-por{position:absolute;${MX(43, 33, 183, 173)};clip-path:circle(50%);border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 35%,#3a414a,#101215);box-shadow:inset 0 0 ${P(14)} rgba(0,0,0,.9)}
#hud-target .kpf-por img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
#hud-target .kpf-por b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 ${P(54)}/1 Georgia,serif;color:#e2b673}
#hud-target .kpf-lv{position:absolute;${MX(163, 152, 200, 189)};border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 45% 35%,#2a2f35,#0b0c0e);font:700 ${P(17)}/1 'WowNarrow','Oswald',sans-serif}
#hud-target .kpf-name{position:absolute;${MX(217, 6, 501, 38)};display:flex;align-items:center;justify-content:center;white-space:nowrap}
#hud-target .kpf-name>b{min-width:0;overflow:hidden;text-overflow:ellipsis;font:700 ${P(22)}/1.2 'WowFriz','Cinzel',Georgia,serif;letter-spacing:.03em;color:#F6D878;text-shadow:2px 2px 0 #000,1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000}
#hud-target .kbar{position:absolute;overflow:hidden;border-radius:${P(4)};background:linear-gradient(#060708,#15171a);box-shadow:inset 0 1px 3px #000}
#hud-target .kbar>i{position:absolute;right:0;top:0;bottom:0;background-size:100% 100%;background-repeat:no-repeat;transition:width .2s linear}
#hud-target .kbar>i.tr{background:rgba(255,236,190,.5);transition:width .7s .25s ease-out}
#hud-target .kbar>span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 ${P(7)};font:700 ${P(16)}/1 'WowNarrow','Oswald',sans-serif;text-shadow:${INK};white-space:nowrap}
#hud-target .kbar>span>em{font-style:normal;font-weight:700}
#hud-target .kpf-mk{display:none;position:absolute;${MX(228, 150, 260, 182)};border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 45% 35%,#2a2f35,#0b0c0e);font:700 ${P(18)}/1 Georgia,serif}
@media (max-width:900px){#hud-target.kpf{left:16px;top:calc(var(--spawn-safe-area-top,0px) + ${Math.round(227 * K) + 14}px)}}
</style>`;
export function kitTargetPlate(d) {
  const { id, V = '', name, lvlHtml, hp, max, pct, fill, sec, nameCol, pic, down, hit, foe } = d;
  void nameCol;
  const img = foe ? `background:${FOE_FILL}` : `background-image:url('${fill}')`;
  return `<div ${V} id="hud-target" data-t="${esc(id)}${hit ? '-h' + hp : ''}" class="kpf${down ? ' dn' : ''}${hit ? ' hit' : ''}">${KTF_CSS}<div ${V} class="bg"></div>`
    + `<div ${V} class="kpf-por">${pic ? `<img ${V} src="${esc(pic)}" alt="">` : `<b ${V}>${esc(Array.from(name)[0]?.toUpperCase() ?? '?')}</b>`}</div>`
    + `<div ${V} class="kpf-lv">${lvlHtml}</div>`
    + `<div ${V} class="kpf-name"><b ${V}>${esc(name)}</b></div>`
    + `<div ${V} class="kbar" style="${MX(217, 55, 501, 77)}"><i ${V} class="tr" style="width:${pct}%"></i><i ${V} style="width:${pct}%;${img}"></i><span ${V}><em ${V} class="nh-num">${hp} / ${max}</em></span></div>`
    + (sec ? `<div ${V} class="kbar" style="${MX(226, 82, 492, 90)}"><i ${V} style="width:${sec.pct}%;${sec.img}"></i></div>` : '')
    + `</div>`;
}
