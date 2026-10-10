// Names over heads, OSRS style, as HUD plates pinned to the thing (data-world-anchor): crisp text at one screen size whatever the distance, a hard black
// outline instead of a soft glow, yellow names (NPCs and creatures), the level in the green-to-red colour of how it compares to you, and the OSRS health bar
// (black edge, green over red, 30 chunky pixels) while it is hurt or in a fight, with its attack clock running round the bar's edge in step with its swing.
// Reads the enemy rows (state: kind, hp, maxHp, down, engaged, atkAt, atkMs) and the known NPCs. Never throws.
import { MONSTERS } from './data/monsters.js';
import { TALK } from './data/dock-folk.js';
import { cbLevelOf } from './combat-hud.js';
import { levelColor } from './menu-core.js';
import { ensureStyle } from './ui-style.js';
import { esc } from './esc.js';
import { cellStyle } from './data/class-spells.js'; // debuff icons: the spell's own cell on its class sheet
import { settingOf } from './settings-core.js';
import { QUESTS, QUEST_OF_NPC } from './data/quests.js'; // creator 2026-10-10: the quest ! rides the name plate, WoW style
import { STANCE, stanceOf } from './stance.js'; // target-selection spec: name colour by stance
const OUT = '1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000,0 2px 0 #000';
const HEIGHT = { cow: 1.5, bull: 2.0, goblin: 1.8, chicken: 0.8 }; // when a body has no bounds yet
const BW = 44, BH = 8, P = 2 * ((BW + 9) + (BH + 7)); // the bar, and the attack line's length: a (BW+9) x (BH+7) rounded rect round it
const STYLE = `<style>
.pl{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none;white-space:nowrap;font:700 15px/16px 'Trebuchet MS',Verdana,sans-serif;letter-spacing:.02em;opacity:calc(1 - (var(--anchor-depth,0) - 52) / 10)}
.pl .nm{color:#ff0;text-shadow:${OUT}}
.pl .lv{text-shadow:${OUT}}
.pl .bar{position:relative;width:${BW}px;height:${BH}px;margin-top:4px;background:#d01616;box-shadow:0 0 0 1px #000;image-rendering:pixelated}
.pl .bar i{display:block;height:100%;background:#12c012;transition:width .18s steps(5,end)}
.pl .tl{position:absolute;left:-6px;top:-5px;width:${BW + 12}px;height:${BH + 10}px;overflow:visible}
.pl .tl rect{fill:none;stroke:#f4efe2;stroke-width:1.3;stroke-dasharray:${P} ${P};stroke-dashoffset:${P};animation:plTele var(--ms) linear forwards;animation-delay:calc(var(--el) * -1ms)}
@keyframes plTele{0%{stroke-dashoffset:${P};stroke:#f4efe2;stroke-width:1.2}70%{stroke:#f4efe2;stroke-width:1.3}71%{stroke:#ff9a2a;stroke-width:1.8}90%{stroke:#ff9a2a;stroke-width:2}91%{stroke:#ff2a1a;stroke-width:2.4}100%{stroke-dashoffset:0;stroke:#ff2a1a;stroke-width:2.6}}
.pl.dn{opacity:.5}
.pl{transition:transform .14s ease-out,opacity .14s}
.pl.sel{transform:translate(-50%,-100%) scale(1.2);z-index:2}
.pl.dim{transform:translate(-50%,-100%) scale(.92);opacity:calc(.55 - (var(--anchor-depth,0) - 16) / 30)}
.pl .bar{border-radius:1px}
.pl.agg .bar{box-shadow:0 0 0 1px #000,0 0 0 2px #ff5a1a;animation:plAgg 1s ease-in-out infinite}
@keyframes plAgg{0%,100%{box-shadow:0 0 0 1px #000,0 0 4px 2px rgba(255,60,20,.55)}50%{box-shadow:0 0 0 1px #000,0 0 10px 4px rgba(255,140,30,.95)}}
.pl .br{position:absolute;inset:-5px -6px;pointer-events:none}
.pl .br b{position:absolute;width:6px;height:5px;border:2px solid #fff3c4;filter:drop-shadow(0 0 2px #f0c040)}
.pl .br b:nth-child(1){left:0;top:0;border-right:0;border-bottom:0}.pl .br b:nth-child(2){right:0;top:0;border-left:0;border-bottom:0}
.pl .br b:nth-child(3){left:0;bottom:0;border-right:0;border-top:0}.pl .br b:nth-child(4){right:0;bottom:0;border-left:0;border-top:0}
.pl .cb{position:relative;width:${BW + 12}px;height:7px;margin-top:3px;background:#1a1410;box-shadow:0 0 0 1px #000}
.pl .cb i{display:block;height:100%;background:linear-gradient(#ffc04a,#e8761a);animation:plCast var(--ms) linear forwards;animation-delay:calc(var(--el) * -1ms);width:0}
.pl .cb.sh i{background:linear-gradient(#b8b8b8,#6c6c6c)}
.pl .cb span{display:block;font:700 10px/11px 'Trebuchet MS',Verdana,sans-serif;color:#fff;text-shadow:${OUT};margin-top:1px;text-align:center}
.pl .cb.sh span::before{content:'\u{1F6E1} ';color:#ccc}
@keyframes plCast{from{width:0}to{width:100%}}
</style>`;

// creator 2026-10-10 (reference: the "Rageclaw Raider" plate): in the 3rd Person skin an enemy wears a gold-and-iron plate:
// Cinzel name in warm gold with a dark outline, a skull badge for the dangerous ones, an iron-framed red bar with its number-free fill
// and a thin blue strip under it (energy / cast). OSRS skin keeps the classic yellow-text plate above.
const KIT = `<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Oswald:wght@600&display=swap');
@font-face{font-family:'WowFriz';src:url(/cdn/value.2f6fa616f76102d81c4a935c3a8cd547a8db9de679ad9fda9cfd42f16e7f0743.ttf) format('truetype');font-display:swap}
@font-face{font-family:'WowNarrow';font-weight:700 900;src:url(/cdn/value.ae9051970e75e3e260f15d103bb7642271bdb6b36b78e7604d588582cea7948e.ttf) format('truetype');font-display:swap}
.kp{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:none;white-space:nowrap;opacity:calc(1 - (var(--anchor-depth,0) - 52) / 10);transition:transform .14s ease-out}
.kp.sel{transform:translate(-50%,-100%) scale(.72);z-index:2}.kp.dim{transform:translate(-50%,-100%) scale(.9);opacity:calc(.75 - (var(--anchor-depth,0) - 52) / 12)}
.kp .kn{font:700 14px/16px 'WowFriz','Cinzel',Georgia,serif;letter-spacing:.03em;color:#f1d79a;text-shadow:0 0 2px #000,1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000;margin-bottom:2px}
.kp .kn.fr{color:#a8f0a0}.kp.nm-only .kn{color:#ff6a50}.kp.nm-only .kn.fr{color:#3cf03c;font-size:16px;line-height:18px}
.kp .qm{display:block;width:34px;height:48px;margin:0 auto 3px;filter:drop-shadow(0 0 5px rgba(255,190,0,.75)) drop-shadow(0 2px 2px rgba(0,0,0,.6));animation:qmb 1.6s ease-in-out infinite}@keyframes qmb{50%{transform:translateY(-4px)}}.kp.nm-only .kn.ne{color:#ffe07a}.kp .kn.ne{color:#ffe07a}
.kp .kf{position:relative;display:flex;align-items:center;gap:0}
.kp .sk{width:17px;height:17px;margin-right:-3px;z-index:1;border-radius:50%;background:radial-gradient(circle at 40% 35%,#5a4a36,#1c140d);border:1px solid #b8955a;box-shadow:0 0 0 1px #000;display:flex;align-items:center;justify-content:center;font:12px/1 serif;color:#e8dcc0}
.kp .kb{position:relative;width:92px;height:12px;padding:2px;background:linear-gradient(#5b5650,#2a2724);border:1px solid #0b0a09;border-radius:2px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 1px 2px rgba(0,0,0,.8)}
.kp .kb .tr{position:relative;height:5px;background:#1a0b0a;box-shadow:inset 0 1px 2px #000;overflow:hidden}
.kp .kb .tr i{display:block;height:100%;background:linear-gradient(#ff5a4a,#c01818 55%,#7e0c0c);box-shadow:inset 0 1px 0 rgba(255,220,200,.45);transition:width .2s}
.kp .kb .tr.fr i{background:linear-gradient(#7ef08a,#28a83c 55%,#126a20)}.kp .kb .tr.ne i{background:linear-gradient(#ffe27a,#d8a020 55%,#8a6008)}
.kp .kb .en{height:2px;margin-top:1px;background:#0c1420}.kp .kb .en i{display:block;height:100%;background:linear-gradient(90deg,#2f6fd8,#6fb0ff)}
.kp .kb::after{content:'';position:absolute;right:-5px;top:2px;width:5px;height:8px;background:linear-gradient(#5b5650,#2a2724);border:1px solid #0b0a09;border-left:0;border-radius:0 2px 2px 0}
.kp.agg .kb{box-shadow:0 0 6px 2px rgba(255,70,30,.75),inset 0 1px 0 rgba(255,255,255,.25)}
.kp.sel .kb{border-color:#e8c878;box-shadow:0 0 6px rgba(240,200,110,.8),inset 0 1px 0 rgba(255,255,255,.25)}
.kp .tp{position:relative;display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto auto;align-items:center;column-gap:0}
.kp .tp .lb{grid-row:1/3;grid-column:1;width:30px;height:30px;margin-right:-7px;z-index:2;border-radius:50%;box-sizing:border-box;border:2px solid #d9b25a;background:radial-gradient(circle at 45% 35%,#3a2c1a,#0e0905);box-shadow:0 0 0 1px #1a1206,inset 0 0 5px #000,0 2px 3px rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;font:700 13px/1 'WowNarrow','Oswald','PT Sans Narrow',sans-serif;color:#ffd76a;text-shadow:1px 1px 0 #000}
.kp .tp .lb.sk{color:#ff4a3a;font-size:14px}
.kp .tp .tn{grid-row:1;grid-column:2;padding-left:12px;font:700 14px/16px 'WowFriz','Cinzel',Georgia,serif;letter-spacing:.03em;color:#f1d79a;text-shadow:0 0 2px #000,1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000;text-align:left}
.kp .tp .gb{grid-row:2;grid-column:2;position:relative;width:118px;height:13px;box-sizing:border-box;padding:2px 2px 2px 8px;border:1px solid #f0d388;border-radius:2px 7px 7px 2px;background:linear-gradient(#b78a3a,#6e4e1c);box-shadow:0 0 0 1px #2a1c08,inset 0 1px 0 rgba(255,240,190,.6),0 2px 3px rgba(0,0,0,.75)}
.kp .tp .gb .tr{position:relative;height:100%;border-radius:1px 5px 5px 1px;background:#1a0f06;box-shadow:inset 0 1px 2px #000;overflow:hidden}
.kp .tp .gb .tr i{display:block;height:100%;background:linear-gradient(#ffe48a,#e8a82a 55%,#a86a10);box-shadow:inset 0 1px 0 rgba(255,250,220,.6);transition:width .2s}
.kp .tp .gb .tr.ho i{background:linear-gradient(#ff7a5a,#d02818 55%,#7e0c0c)}.kp .tp .gb .tr.fr i{background:linear-gradient(#9ef0a0,#34b048 55%,#146a22)}
.kp .tp .gb b{position:absolute;inset:0;padding-left:6px;display:flex;align-items:center;justify-content:center;font:700 9.5px/1 'WowNarrow','Oswald','PT Sans Narrow',sans-serif;letter-spacing:.03em;color:#fff6dc;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000}
.kp .tp .au{grid-row:3;grid-column:2;display:flex;gap:2px;padding:3px 0 0 12px}
.kp .tp .au i{width:12px;height:12px;border-radius:2px;background:#3a1010 center/cover no-repeat;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #c03a2a;font:700 8px/12px Georgia,serif;font-style:normal;text-align:center;color:#ffd0c0}
.kp.sel .tp .gb{border-color:#fff0b8;box-shadow:0 0 0 1px #2a1c08,0 0 7px rgba(255,215,110,.9),inset 0 1px 0 rgba(255,240,190,.6)}
.kp.agg .tp .gb{box-shadow:0 0 0 1px #2a1c08,0 0 7px 2px rgba(255,70,30,.8),inset 0 1px 0 rgba(255,240,190,.6)}
/* creator 2026-10-10: the exact Training Dummy plate png, hollowed (969x180 art shown at 200x37): badge well centre (21.2,21.05) r14.6, bar well 38.4..194.7 x 12.75..30 */
.kp .np{position:relative;width:200px;padding-top:18px}
.kp.fy{transform:translate(-50%,-100%) scale(.7)}.kp.fy.sel{transform:translate(-50%,-100%) scale(.82)}.kp.fy.dim{transform:translate(-50%,-100%) scale(.62)}
.kp .np .nt{position:absolute;left:47px;width:148px;top:-2px;text-align:center;font:700 16px/18px 'WowFriz','Cinzel',Georgia,serif;letter-spacing:.03em;color:#f1d79a;text-shadow:0 0 2px #000,1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000;white-space:nowrap}
.kp .np .pf{position:relative;width:200px;height:42.11px}
.kp .np .bw{position:absolute;left:6.2px;top:5.9px;width:30.3px;height:30.3px;border-radius:50%;background:radial-gradient(circle at 45% 35%,#2e2a26,#0c0a08)}
.kp .np .tk{position:absolute;left:37px;top:12.4px;width:158px;height:18px;background:#160d05;box-shadow:inset 0 2px 3px #000}
.kp .np .tk i{display:block;height:100%;background:linear-gradient(#fff1a8 0,#ffd23a 22%,#f2b111 60%,#c98606 100%);transition:width .2s}
.kp .np .tk.ho i{background:linear-gradient(#ffb09a 0,#ff4a2a 22%,#d2200e 60%,#8a0c06 100%)}.kp .np .tk.fr i{background:linear-gradient(#c8ffb8 0,#5ee05a 22%,#2fae34 60%,#16701e 100%)}
.kp .np img{position:absolute;left:0;top:0;width:200px;height:42.11px;pointer-events:none}
.kp .np .lv{position:absolute;left:6.2px;top:5.9px;width:30.3px;height:30.3px;display:flex;align-items:center;justify-content:center;font:700 16px/1 'WowNarrow','Oswald','PT Sans Narrow',sans-serif;color:#f6cf6a;text-shadow:1px 1px 0 #000}
.kp .np .lv.sk{color:#ff4a3a;font-size:18px}
.kp .np .hn{position:absolute;left:47.5px;top:12.8px;width:147px;height:17px;display:flex;align-items:center;justify-content:center;font:700 13px/1 'WowNarrow','Oswald','PT Sans Narrow',sans-serif;letter-spacing:.02em;color:#fff6dc;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000}
.kp .np .rs{position:relative;margin:-1px 0 0 44px;width:144px;height:4px;background:#0a0f18;border:1px solid #6a5a3a;border-radius:1px;box-shadow:0 0 0 1px #000,inset 0 1px 2px #000}
.kp .np .rs i{display:block;height:100%;background:linear-gradient(#9ad0ff,#3a86e8 55%,#1b4fa8);transition:width .2s}
.kp .np .au{display:flex;gap:4px;padding:3px 0 0 47px}
.kp .np .au i{width:14px;height:14px;border-radius:2px;background:#3a1010 center/cover no-repeat;box-shadow:0 0 0 1px #000,inset 0 0 0 1px #c03a2a;font:700 9px/14px 'WowNarrow','Oswald','PT Sans Narrow',sans-serif;font-style:normal;text-align:center;color:#ffd0c0}
.kp .np .au{gap:3px;padding:4px 0 0 47px}
.kp.nm-only .au{display:flex;justify-content:center;gap:3px;padding:3px 0 12px}
.kp.nm-only .au i{display:block;background-color:#3a1010;font:700 10px/20px 'WowNarrow',sans-serif;font-style:normal;text-align:center;color:#ffd0c0}
.kp .au i.db{position:relative;width:20px;height:20px;border-radius:3px;box-shadow:0 0 0 1px #000,inset 0 0 0 1px var(--c),0 0 0 2px #2a0806;overflow:visible}
.kp .au i.db s{position:absolute;left:0;top:0;right:0;background:rgba(0,0,0,.6);text-decoration:none;border-radius:3px 3px 0 0}
.kp .au i.db b{position:absolute;left:-3px;right:-3px;bottom:-11px;font:700 10px/10px 'WowNarrow','Oswald',sans-serif;color:#ffe9a8;text-align:center;-webkit-text-stroke:2px #000;paint-order:stroke fill;text-shadow:1px 1px 0 #000}
.kp .au i.db u{position:absolute;right:-2px;top:-3px;font:700 10px/10px 'WowNarrow','Oswald',sans-serif;color:#fff;text-decoration:none;-webkit-text-stroke:2px #000;paint-order:stroke fill}
.kp .au i.db.cc,.kp .au i.db.stun{box-shadow:0 0 0 1px #000,inset 0 0 0 1px #ffd84a,0 0 0 2px #3a2a00}
.kp.sel .np img{filter:drop-shadow(0 0 3px rgba(255,215,110,.9))}.kp.agg .np img{filter:drop-shadow(0 0 4px rgba(255,70,30,.9))}
</style>`;
function nameOf(r, mine) { // -> { name, lvl?, col? } for a creature or NPC worth a plate, else null
  const st = r.state ?? {};
  if ((r.tags ?? []).includes('enemy')) { const m = MONSTERS[st.kind], lvl = m?.level ?? 1; return { name: m?.name ?? st.name ?? 'Training dummy', lvl, col: levelColor(mine, lvl), mob: !!m }; }
  if (r.id === 'general-merchant') return { name: 'General Merchant' };
  if (r.id === 'rune-merchant') return { name: 'Aubury' };
  if ((r.tags ?? []).includes('dock-folk') && TALK[st.talk]) return { name: TALK[st.talk].name };
  if (st.name && !(r.tags ?? []).includes('nameplate')) return { name: st.name }; // any named NPC (creator 2026-10-10: every NPC selectable)
  return null;
}
// an idle animation breathes the model's bounds every frame; a plate that follows them jitters (creator 2026-10-10: "flashing"). Each NPC's plate height is held, rising only for a real growth.
// creator 2026-10-10: spell debuffs on enemy plates: the spell's own icon, a darkening sweep as it runs out, stacks, seconds left
function auOf(deb, now) { return deb.length ? `<div class="au">${deb.map((a) => { const cs = a.cls ? cellStyle(a.cls, a.cell) : '', left = Math.max(0, (a.until ?? now) - now), sec = left / 1000, frac = a.ms ? Math.min(1, left / a.ms) : 1;
            return `<i class="db ${esc(a.k ?? '')}" title="${esc(a.n ?? '')}" style="${cs ? esc(cs) + ';' : a.icon ? `background-image:url('${esc(a.icon)}');` : ''}--c:${esc(a.col ?? '#c03a2a')}">${cs || a.icon ? '' : esc((a.n ?? a.id ?? '?').slice(0, 1).toUpperCase())}<s style="height:${Math.round((1 - frac) * 100)}%"></s>${(a.x ?? 1) > 1 ? `<u>${a.x | 0}</u>` : ''}<b>${sec >= 10 ? Math.round(sec) : sec.toFixed(sec < 3 ? 1 : 0)}</b></i>`; }).join('')}</div>` : ''; }
const QM_FILL = { offer: '#ffd200', ready: '#ffd200', busy: '#b4b4b4' }, QM_RIM = { offer: '#4a2c00', ready: '#4a2c00', busy: '#2a2a2a' };
function questMarkOf(s, npc) { const id = QUEST_OF_NPC[npc], q = id && QUESTS[id]; if (!q) return null; const st = s.quests?.[id];
  if (st === 'done') return null; if (st !== 'active') return 'offer';
  const n = q.need.flag ? (s.qc?.[q.need.flag] | 0) : (Array.isArray(s.inv) ? s.inv : []).filter((x) => x?.id === q.need.item).length; return n >= q.need.n ? 'ready' : 'busy'; }
function qmSvg(kind) { if (!kind) return ''; const g = kind === 'offer'
    ? `<path d='M36 8 L64 8 L58 92 L42 92 Z'/><circle cx='50' cy='118' r='14'/>`
    : `<path d='M22 42 C22 14 78 6 80 40 C82 62 58 66 58 84 L58 94 L40 94 L40 80 C40 58 62 56 60 40 C58 26 40 26 40 42 Z'/><circle cx='49' cy='118' r='13'/>`;
  return `<svg class="qm" viewBox="-8 -2 116 144"><g fill="${QM_RIM[kind]}" stroke="${QM_RIM[kind]}" stroke-width="16" stroke-linejoin="round">${g}</g><g fill="${QM_FILL[kind]}">${g}</g><g fill="rgba(255,255,230,.55)"><path d='M40 12 L50 12 L47 60 L43 60 Z'/></g></svg>`; }
const PLATE_H = new Map();
function plateHeight(id, h) { const k = PLATE_H.get(id); if (k != null && Math.abs(h - k) < 0.6) return k; const v = Math.round(h * 4) / 4; PLATE_H.set(id, v); return v; }
export function platesHud(ctx, player) {
  try {
    const s = player?.state; if (!s || s.dead) return '';
    const kit = settingOf(s, 'hudSkin') !== 0, sel = s.fight?.target ?? s.lock ?? null, mine = cbLevelOf(s), now = ctx.now?.() ?? Date.now(), rows = [], showEnemy = settingOf(s, 'plates') !== false, showName = settingOf(s, 'plateName') !== false; // O menu → Activities
    for (const r of ctx.query?.({ anyTags: ['enemy', 'interactable', 'dock-folk', 'npc', 'folk', 'villager', 'merchant', 'vendor', 'questgiver'], radius: 28 }) /* creator 2026-10-10: plates read whole out to 28 m from the player (their target distance), none past it */ ?? []) { if (r.visible === false || r.state?.down) continue; const n = nameOf(r, mine); if (n && r.id !== sel) { if (showName) rows.push([r, n, true]); } /* creator 2026-10-10: every unit's name floats unselected; the plate itself only while selected */ else if (n && (n.mob ? showEnemy : true)) rows.push([r, n]); if (rows.length >= 28) break; }
    const out = rows.map(([r, n, only]) => {
      if (only) { const oh = plateHeight(r.id, Math.max(0.5, (() => { const o = ctx.getObject?.(r.id), bb = o?.bounds; return bb ? bb.max.y - bb.min.y : HEIGHT[r.state?.kind] ?? 1.9; })())), sc = stanceOf(r), stc0 = STANCE[sc] ?? STANCE.hostile;
        return kit ? `<div class="kp nm-only${sel ? ' dim' : ''}" data-world-anchor="${esc(r.id)}" data-anchor-offset="0 ${(oh + 0.45).toFixed(2)} 0" id="pl-${esc(r.id)}">${qmSvg(questMarkOf(s, r.id))}<div class="kn ${sc === 'friendly' ? 'fr' : sc === 'neutral' ? 'ne' : ''}">${esc(n.name)}</div>${auOf((Array.isArray(r.state?.debuffs) ? r.state.debuffs : []).filter((a) => a && a.until > now).slice(0, 6), now)}</div>`
          : `<div class="pl${sel ? ' dim' : ''}" data-world-anchor="${esc(r.id)}" data-anchor-offset="0 ${(oh + 0.4).toFixed(2)} 0" id="pl-${esc(r.id)}"><div><span class="nm" style="color:${stc0.name}">${esc(n.name)}</span>${n.lvl ? ` <span class="lv" style="color:${n.col}">(level-${n.lvl})</span>` : ''}</div></div>`; }
      const hgt = plateHeight(r.id, Math.max(0.5, (() => { const o = ctx.getObject?.(r.id), bb = o?.bounds; return bb ? bb.max.y - bb.min.y : HEIGHT[r.state?.kind] ?? 1.9; })())), st = r.state ?? {}, hp = Math.max(0, st.hp ?? 0), max = Math.max(1, st.maxHp ?? 1), hurt = n.mob && (hp < max || st.engaged || s.fight?.target === r.id || s.lock === r.id);
      const fill = Math.round(BW * Math.min(1, hp / max)), swing = hurt && st.atkAt && st.atkMs && st.engaged ? Math.min(st.atkMs, Math.max(0, now - st.atkAt)) : -1;
      const tele = swing >= 0 ? `<svg class="tl" viewBox="0 0 ${BW + 12} ${BH + 10}" id="pl-t-${esc(r.id)}-${st.atkAt | 0}"><rect x="1.5" y="1.5" width="${BW + 9}" height="${BH + 7}" rx="1.5" style="--ms:${st.atkMs | 0}ms;--el:${swing | 0}"/></svg>` : '';
      const isSel = sel === r.id, stc = STANCE[stanceOf(r)] ?? STANCE.hostile, agg = n.mob && st.engaged === player.id;
      if (kit) { const sc = stanceOf(r), cls = sc === 'friendly' ? 'fr' : sc === 'neutral' ? 'ne' : '', en = st.cast && st.cast.at && st.cast.ms ? Math.min(1, (now - st.cast.at) / st.cast.ms) : (st.mana ?? st.maxMana) ? (st.mana ?? 0) / Math.max(1, st.maxMana ?? 1) : 0;
        { // creator 2026-10-10: friendlies wear the same plate, filled green; every plate carries a thin resource bar under it
          const foe = (r.tags ?? []).includes('enemy'), fhp = foe ? hp : Math.max(0, st.hp ?? st.maxHp ?? 1), fmax = foe ? max : Math.max(1, st.maxHp ?? 1);
          const res = st.cast && st.cast.at && st.cast.ms ? en : (st.mana ?? st.maxMana ?? st.energy) != null ? Math.min(1, (st.mana ?? st.energy ?? 0) / Math.max(1, st.maxMana ?? st.maxEnergy ?? 100)) : 1; // creator 2026-10-10 reference (the Training Dummy plate): badge left, gold name over a gold-framed bar with numbers, debuffs below
          const skull = n.mob && n.lvl >= 20 || st.boss || st.elite, lvTxt = skull ? '&#9760;' : n.lvl ? String(n.lvl) : '??';
          const deb = (Array.isArray(st.debuffs) ? st.debuffs : []).filter((a) => a && (!a.until || a.until > now)).slice(0, 6);
          const au = auOf(deb, now);
          const tkc = cls || 'go'; // gold like the reference for the dummy and neutrals, red for hostile mobs, green for friends
          return `<div class="kp${foe ? '' : ' fy'}${isSel ? ' sel' : sel ? ' dim' : ''}${agg ? ' agg' : ''}" data-world-anchor="${esc(r.id)}" data-anchor-offset="0 ${(hgt + 0.5).toFixed(2)} 0" id="pl-${esc(r.id)}"><div class="np">${n.mob && !showName ? '' : `<div class="nt">${esc(n.name)}</div>`}<div class="pf"><div class="bw"></div><div class="tk ${!foe || cls === 'fr' ? 'fr' : n.mob && !cls ? 'ho' : tkc}"><i style="width:${Math.round(100 * Math.min(1, fhp / fmax))}%"></i></div><img src="/cdn/value.bc3750bf9c5a939abd0c6ac69310bdbc1f52a530e30be049e83825777577cec0.png" alt=""><div class="lv${skull ? ' sk' : ''}">${lvTxt}</div><div class="hn">${!foe && st.maxHp == null ? '' : Math.round(fhp).toLocaleString('en-US')}${!foe && st.maxHp == null ? '' : ' / ' + Math.round(fmax).toLocaleString('en-US')}</div></div><div class="rs"><i style="width:${Math.round(res * 100)}%"></i></div>${au}</div></div>`; }
        void en;
        return `<div class="kp${isSel ? ' sel' : sel ? ' dim' : ''}${agg ? ' agg' : ''}" data-world-anchor="${esc(r.id)}" data-anchor-offset="0 ${(hgt + 0.45).toFixed(2)} 0" id="pl-${esc(r.id)}"><div class="kn ${cls}">${esc(n.name)}</div></div>`; }
      const cs = st.cast, cel = cs && cs.at && cs.ms ? now - cs.at : -1, cast = cel >= 0 && cel < cs.ms ? `<div class="cb${cs.shielded ? ' sh' : ''}" id="pl-c-${esc(r.id)}-${cs.at | 0}" style="--ms:${cs.ms | 0}ms;--el:${cel | 0}"><i></i><span>${esc(cs.name ?? 'Casting')}</span></div>` : '';
      const brk = isSel ? '<div class="br"><b></b><b></b><b></b><b></b></div>' : '';
      const bar = hurt || isSel ? `<div class="bar"><i style="width:${fill}px"></i>${tele}${brk}</div>` : '';
      return `<div class="pl${isSel ? ' sel' : sel ? ' dim' : ''}${agg ? ' agg' : ''}" data-world-anchor="${esc(r.id)}" data-anchor-offset="0 ${(hgt + 0.4).toFixed(2)} 0" id="pl-${esc(r.id)}"><div>${n.mob && n.lvl >= 28 ? '<span style="color:#e3352b;text-shadow:0 0 1px #000,1px 1px 0 #000">&#9760;</span> ' : ''}${n.mob && !showName ? '' : `<span class="nm" style="color:${stc.name}">${esc(n.name)}</span>`}${n.lvl ? ` <span class="lv" style="color:${n.col}">(level-${n.lvl})</span>` : ''}</div>${bar}${cast}</div>`;
    }).join('');
    ensureStyle('pl-style', STYLE); ensureStyle('kp-style', KIT);
    return out ? `<div id="pl-root" style="position:fixed;inset:0;pointer-events:none;z-index:4">${out}</div>` : '';
  } catch { return ''; }
}
