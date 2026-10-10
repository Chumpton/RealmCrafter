// CLASSIC WOW SKIN (creator 2026-10-04): slate panels with gold filigree, a target frame mirrored beside the player frame,
// stone gryphons clutching the action bar, brass slots with corner hotkeys, and a brass-ringed minimap top-right.
// Pure render helpers: read player.state, ctx.getObject, ctx.query, ctx.session; never write, never throw.
import { MONSTERS } from '../../scripts/lib/data/monsters.js';
import { STANCE, BOSS_BUFF, stanceOf, unitName } from '../../scripts/lib/stance.js'; import { kitTargetPlate } from './frames.js'; // target-selection spec
import { TRAVEL } from '../../scripts/lib/data/travel.js';
import { cbLevelOf } from '../../scripts/lib/combat-hud.js';
import { levelColor } from '../../scripts/lib/menu-core.js';
import { wallHour, partName } from '../../scripts/lib/real-clock.js'; // LAMP-CLOCK rev 2: the minimap shows the real Pacific hour
import { esc } from '../../scripts/lib/esc.js';
import { UIK } from '../../scripts/lib/data/ui-kit.js';
import { kitOn } from './skin.js'; // 3rd Person skin; OSRS (default) keeps the markup below untouched

export const WOW = {
  gryphon: '/cdn/value.91ef06e69aa85a9c445cc5c138de2399f1c2159c0c24e70ee59ff22e6c705d9d.png',
  // the minimap picture: one top-down render of the home valley, north (-Z) up. A pixel is MAP.mpp metres; (x0, z0) sits at (ox, oy)
  map: { img: '/cdn/value.71182b2bc29bb8d57f0ba3f92d29e6cae9a971dd66ae225d643e9b29b1197059.jpeg', w: 768, h: 397, x0: 20, z0: 40, ox: 384, oy: 198.5, mpp: 1.578 },
  mm: { size: 156, zoom: 1, radius: 118 }, // the ring's inner diameter in px, px per map pixel, how far (m) dots reach
  portraits: { // kind -> painted portrait
    goblin: '/cdn/value.a07047e98f4482878268c66002f66bdd71a6499f78ff9466c636ddc0eeeb0a0b.png',
    cow: '/cdn/value.f62f4d9f42d113d17c2270c55ab54d5d48650b4a7e7c1bcd6c5c05fe8cb04910.png',
    chicken: '/cdn/value.758f0690144e906005541449248f1e86918a4ce1bf9e41ba414918e851702fe3.png',
    bull: '/cdn/value.d292accf5fb6ea59bd56d1fce3f15d68b42bce03956a487eaae5838aea610132.png',
    dummy: '/cdn/value.508cdfa204f1912070f43c04c8aab158c88da8660f5aa3176d8d61030f210f08.png',
  },
  // places with names: a travel spot names everything within its r; the pens and camps are their own
  zones: [
    { name: "Campton's Pasture", x: -46, z: 78, r: 34 }, { name: 'Chicken Run', x: 70, z: 84, r: 24 }, { name: 'Goblin Camp', x: 205, z: 55, r: 45 },
    { name: 'The Hideaway', x: -166, z: -20, r: 40 }, { name: 'Merchant Shack', x: 24, z: 79, r: 14 },
  ],
};
const R = { hall: 30, green: 34, ring: 22, farm: 48, harbor: 60, ravn: 70, isle: 120, summit: 60 };
export function zoneAt(x, z) {
  let best = null, bd = 1e9;
  for (const q of WOW.zones) { const d = Math.hypot(x - q.x, z - q.z); if (d < q.r && d < bd) { bd = d; best = q.name; } }
  if (best) return best;
  for (const s of TRAVEL.spots) { const d = Math.hypot(x - s.x, z - s.z); if (d < (R[s.id] ?? 40) && d < bd) { bd = d; best = s.name; } }
  return best ?? 'Mellowbrook';
}
const FONT = "@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Marcellus+SC&display=swap');";
const HEAD = "'Marcellus SC','Cinzel','Friz Quadrata TT',Georgia,serif", NUM = "'Segoe UI','Inter',system-ui,Arial,sans-serif";
const GOLD = 'linear-gradient(180deg,#f3d78a,#b8893a 45%,#7a5520)';
const FIL = 'radial-gradient(circle at 0 0,rgba(226,190,110,.55) 0 3px,transparent 3.5px 7px,rgba(226,190,110,.35) 7px 8px,transparent 8.5px) left top/18px 18px no-repeat,'
  + 'radial-gradient(circle at 100% 0,rgba(226,190,110,.55) 0 3px,transparent 3.5px 7px,rgba(226,190,110,.35) 7px 8px,transparent 8.5px) right top/18px 18px no-repeat,'
  + 'radial-gradient(circle at 0 100%,rgba(226,190,110,.55) 0 3px,transparent 3.5px 7px,rgba(226,190,110,.35) 7px 8px,transparent 8.5px) left bottom/18px 18px no-repeat,'
  + 'radial-gradient(circle at 100% 100%,rgba(226,190,110,.55) 0 3px,transparent 3.5px 7px,rgba(226,190,110,.35) 7px 8px,transparent 8.5px) right bottom/18px 18px no-repeat';
const SLATE = `${FIL},linear-gradient(180deg,rgba(44,50,58,.93),rgba(22,25,30,.93))`;
const EDGE = 'inset 0 0 0 1px #07080a,inset 0 0 0 3px rgba(201,162,74,.22),0 4px 14px rgba(0,0,0,.55)';
export const WOW_CSS = `<style>${FONT}
.nh-panel,.h4-plate,.h4-win,.skp,.stp,#den-settings,[data-modal]{background:${SLATE}!important;border:2px solid #c9a24a!important;border-radius:6px!important;box-shadow:${EDGE}!important}
.nh-panel,.h4-plate,.h4-win,#den-settings,[data-modal],.nh-title,.h4-title{font-family:${HEAD}!important}
.nh-title,.h4-title{color:#ffd100!important;text-shadow:0 1px 2px #000!important;border-bottom:1px solid rgba(201,162,74,.4)!important}
.nh-num{font-family:${NUM}!important;font-weight:700}
#hud-player{background:${SLATE}!important}
#hud-player #hud-hp{height:18px!important}#hud-player #hud-mana{height:13px!important}
#hud-player #st-hp{background:linear-gradient(180deg,#8dff6a 0,#2fc12a 40%,#138a12 60%,#0b5c0b 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -2px 3px rgba(0,0,0,.35)}
#hud-player #st-mana{background:linear-gradient(180deg,#8fb3ff 0,#2f5dff 40%,#1435b8 60%,#0b1f7a 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -2px 3px rgba(0,0,0,.35)}
#hud-player .nh-bar .nh-num{font-size:12px!important;font-weight:800}#hud-player #hud-stam .nh-num{font-size:9px!important}#hud-player #hud-stam span{font-size:8px}
#hud-player .wp-metal{position:absolute;inset:-6px;border-radius:50%;background:conic-gradient(from 20deg,#f4f6f8,#7c848c,#d9dee2,#4a5058,#eef1f3,#8a9198,#cfd5da,#565c64,#f4f6f8);box-shadow:0 0 0 1px #111,inset 0 0 0 1px rgba(0,0,0,.6),0 3px 8px rgba(0,0,0,.6)}
#hud-player .wp-metal::after{content:'';position:absolute;inset:3px;border-radius:50%;border:1px dashed rgba(40,44,50,.55)}
#hud-player .wp-crest{position:absolute;left:12px;top:-15px;z-index:3;filter:drop-shadow(0 1px 1px #000)}
#hud-player .wp-ring{border:1px solid #111!important;box-shadow:inset 0 2px 8px rgba(0,0,0,.8)!important}
#hud-player .wp-lv{z-index:3;left:-9px!important;bottom:-8px!important;width:24px!important;min-width:24px!important;height:27px!important;padding:0 0 3px!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:#ffd100!important;font:800 12px/1 Arial,sans-serif!important;text-shadow:1px 1px 0 #000;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 27'%3E%3Cpath d='M12 1 L23 4 V13 C23 20 17 24 12 26 C7 24 1 20 1 13 V4 Z' fill='%23d4a63c' stroke='%23000' stroke-width='1'/%3E%3Cpath d='M12 3.5 L20.5 5.8 V13 C20.5 18.6 16 21.8 12 23.4 C8 21.8 3.5 18.6 3.5 13 V5.8 Z' fill='%23181b20'/%3E%3C/svg%3E") center/100% 100% no-repeat!important}
#hud-player #hud-hp{background:linear-gradient(#1c0605,#3a0d0a)!important}
#hud-player #hud-mana{background:linear-gradient(#05091c,#0d1838)!important}
#hud-player #hud-stam{background:linear-gradient(#0c0a05,#201a0d)!important}
#hud-player .nh-bar{box-shadow:inset 1px 1px 2px rgba(0,0,0,.95),0 0 0 1px #6e6a62,0 1px 0 rgba(255,255,255,.15)!important}
/* the action bar: slate under brass slots, gryphons clutching both ends */
#nh-dock{background:linear-gradient(180deg,#2c3238,#15181c)!important;border:2px solid #c9a24a!important;border-radius:3px!important;box-shadow:inset 0 0 0 1px #000,0 3px 12px rgba(0,0,0,.6)!important;overflow:visible!important}
#nh-dock::before,#nh-dock::after{content:'';position:absolute;bottom:-8px;width:104px;height:104px;background:url('${WOW.gryphon}') center bottom/contain no-repeat;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.6))}
#nh-dock::before{left:-92px}
#nh-dock::after{right:-92px;transform:scaleX(-1)}
#nh-dock .h4-slot,.h4-slot{border-radius:2px!important;border:2px solid transparent!important;background:linear-gradient(#0b0c0e,#0b0c0e) padding-box,${GOLD} border-box!important;box-shadow:inset 0 0 0 1px #000,inset 0 3px 7px rgba(0,0,0,.9),0 1px 2px rgba(0,0,0,.7)!important}
#nh-dock .h4-slot:hover,.h4-slot:hover{background:linear-gradient(#14161a,#14161a) padding-box,linear-gradient(#fff3c0,#e0b050) border-box!important;box-shadow:inset 0 0 0 1px #000,inset 0 0 10px rgba(255,220,120,.25)!important}
#nh-dock .h4-key,.h4-slot .h4-key{left:auto!important;right:2px!important;top:1px!important;background:none!important;font:700 10px/1 ${NUM}!important;color:#f4f4f4!important;text-shadow:0 0 2px #000,1px 1px 0 #000!important}
.h4-slot .wow-oor{position:absolute;inset:0;background:rgba(200,20,20,.42);mix-blend-mode:multiply;pointer-events:none}
.h4-rune{border-radius:3px!important;border:1px solid #c9a24a!important;background:linear-gradient(180deg,#3a4048,#1a1d22)!important}
.h4-rune.on{background:linear-gradient(180deg,#c9a24a,#7a5520)!important}
/* micro menu docked above the bag slots, bottom-right */
#hud-micro{flex-direction:column!important;align-items:flex-end!important;gap:4px!important}
#hud-micro .nh-tray{background:${SLATE}!important;border:1px solid #c9a24a!important}
/* the target frame: the player frame's mirror, beside it */
.wtf{position:fixed;left:254px;top:calc(var(--spawn-safe-area-top,0px) + 14px);width:226px;height:76px;box-sizing:border-box;padding:9px 72px 8px 10px;pointer-events:none;z-index:60;background:${SLATE};border:2px solid #c9a24a;border-radius:6px;box-shadow:${EDGE};color:#fff;animation:wtfin .18s ease-out both}
@keyframes wtfin{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.wtf.wtf-hit{animation:wtfhit .2s ease-out}
@keyframes wtfhit{0%{transform:translateX(-3px)}50%{transform:translateX(3px)}100%{transform:none}}
.wtf-name{font:15px/1.1 ${HEAD};color:#ffd100;text-shadow:0 1px 2px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;margin-bottom:5px}
.wtf.foe .wtf-name{color:#ff5a45}
.wbar{position:relative;height:16px;border-radius:3px;overflow:hidden;background:linear-gradient(#0a0b0d,#1a1c20);border:1px solid #000;box-shadow:0 0 0 1px rgba(201,162,74,.45)}
.wbar>i{position:absolute;left:0;top:0;bottom:0;transition:width .2s}
.wbar>i.tr{background:rgba(255,240,200,.75);transition:width .6s ease-in .25s}
.wbar>i.hp{background:linear-gradient(180deg,#8dff6a 0,#2fc12a 40%,#138a12 60%,#0b5c0b 100%)}
.wbar>i.mp{background:linear-gradient(180deg,#8fb3ff 0,#2f5dff 40%,#1435b8 60%,#0b1f7a 100%)}
.wbar>i.hp,.wbar>i.mp{box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -2px 3px rgba(0,0,0,.35)}
.wbar>b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 11px/1 ${NUM};color:#fff;text-shadow:0 0 2px #000,1px 1px 0 #000}
.wpor{position:absolute;width:66px;height:66px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 35%,#3a414a,#121418);box-shadow:0 0 0 3px #b9c0c7,0 0 0 5px #4a5058,0 0 0 6px #e4e8ec,0 3px 8px 6px rgba(0,0,0,.55)}
.wpor img{width:100%;height:100%;object-fit:cover}
.wpor span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:30px/1 ${HEAD};color:#ffd100}
.wlv{position:absolute;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 11px/1 ${NUM};color:#ffd100;background:radial-gradient(circle at 40% 35%,#3b3f45,#0c0d10);box-shadow:0 0 0 2px #c9a24a,0 0 0 3px #000,0 2px 4px rgba(0,0,0,.7)}
.wtf.dn{filter:grayscale(1) brightness(.75)}
/* the minimap */
#wmm{position:fixed;right:18px;top:calc(var(--spawn-safe-area-top,0px) + 34px);width:${WOW.mm.size + 16}px;pointer-events:none;z-index:59}
#wmm .zone{margin:0 auto 4px;width:max-content;max-width:210px;padding:3px 14px;font:13px/1.15 ${HEAD};color:#ffd100;text-shadow:0 1px 2px #000;background:${SLATE};border:1px solid #c9a24a;border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,.5);white-space:nowrap}
#wmm .ring{position:relative;width:${WOW.mm.size + 16}px;height:${WOW.mm.size + 16}px;border-radius:50%;background:${GOLD};box-shadow:inset 0 0 0 2px #3a2610,0 0 0 2px #1a1208,0 4px 12px rgba(0,0,0,.6)}
#wmm .ring::after{content:'';position:absolute;inset:3px;border-radius:50%;border:1px dashed rgba(60,36,10,.7);pointer-events:none}
#wmm .map{position:absolute;inset:8px;border-radius:50%;overflow:hidden;background-color:#1d3a3d;background-repeat:no-repeat;box-shadow:inset 0 0 14px rgba(0,0,0,.85)}
#wmm .dot{position:absolute;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;box-shadow:0 0 0 1px #000}
#wmm .dot.foe{background:#ff3a2a}#wmm .dot.npc{background:#ffd100}#wmm .dot.pl{background:#4aa8ff;width:7px;height:7px;margin:-3.5px 0 0 -3.5px}
#wmm .me{position:absolute;left:50%;top:50%;width:0;height:0;margin:-7px 0 0 -5px;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:14px solid #fff;filter:drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000);transform-origin:5px 9px}
#wmm .card{position:absolute;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 10px/1 ${HEAD};color:#ffd100;background:#14161a;box-shadow:0 0 0 1px #c9a24a}
#wmm .card.n{color:#fff}
#wmm .clock{white-space:nowrap;position:absolute;right:-4px;bottom:-2px;padding:2px 5px;font:700 10px/1 ${NUM};color:#ffd100;background:#14161a;border:1px solid #c9a24a;border-radius:8px}
@media (pointer:coarse),(hover:none){#wmm{display:none}#nh-dock::before,#nh-dock::after{display:none}}
@media (max-width:820px){.wtf{left:16px;top:calc(var(--spawn-safe-area-top,0px) + 92px)}}
</style>`;

// ---- target frame: name, health and (for things that cast) mana, portrait on the outer edge, level badge on the portrait
let tfLast = { id: null, hp: -1 };
export function targetFrame(ctx, player) {
  try {
    const s = player?.state; const id = s?.fight?.target ?? s?.lock; if (!id) return '';
    const o = ctx.getObject?.(id); if (!o?.state) return '';
    const st = o.state, m = MONSTERS[st.kind], name = m?.name ?? st.name ?? 'Training dummy', lvl = st.level ?? m?.level ?? 1;
    const max = Math.max(1, st.maxHp ?? m?.hp ?? 1), hp = Math.max(0, Math.round(st.hp ?? max)), pct = Math.round(Math.min(1, hp / max) * 100);
    const hit = tfLast.id === id && hp < tfLast.hp; tfLast = { id, hp };
    const pic = WOW.portraits[st.kind] ?? WOW.portraits[(o.tags || []).includes('dummy') || /dummy/.test(id) ? 'dummy' : ''] ?? '';
    const foe = !!s.fight?.target, col = levelColor(cbLevelOf(s), lvl);
    if (kitOn(player)) return kitTarget({ id, st, m, name: (o.tags || []).includes('enemy') ? name : unitName(o), lvl, max, hp, pct, hit, pic, foe, col, me: cbLevelOf(s), stance: stanceOf(o), pid: player.id, now: ctx.now?.() ?? Date.now(), npc: !(o.tags || []).includes('enemy') });
    return `<div id="wtf-${esc(id)}${hit ? '-h' + hp : ''}" class="wtf${foe ? ' foe' : ''}${st.down ? ' dn' : ''}${hit ? ' wtf-hit' : ''}">`
      + `<div class="wtf-name">${esc(name)}</div>`
      + `<div class="wbar"><i class="tr" style="width:${pct}%"></i><i class="hp" style="width:${pct}%"></i><b>${hp} / ${max}</b></div>`
      + `<div class="wbar" style="height:9px;margin-top:3px"><i class="mp" style="width:${st.mana != null ? Math.round(100 * st.mana / Math.max(1, st.maxMana ?? 1)) : 0}%;${st.mana != null ? '' : 'opacity:0'}"></i></div>`
      + `<div class="wpor" style="right:-6px;top:3px">${pic ? `<img src="${esc(pic)}" alt="">` : `<span>${esc(Array.from(name)[0] ?? '?')}</span>`}</div>`
      + `<div class="wlv" style="right:44px;top:50px;color:${col}">${lvl}</div></div>`;
  } catch (e) { return ''; }
}

// ---- minimap: north up, the picture slides under a fixed arrow that turns with your camera
let mmRows = [], mmAt = 0;
export function minimap(ctx, player) {
  try {
    const f = ctx.self?.feetPosition ?? player?.feetPosition; if (!f) return '';
    const M = WOW.map, S = WOW.mm.size, k = WOW.mm.zoom, half = S / 2;
    const px = M.ox + (f.x - M.x0) / M.mpp, py = M.oy + (f.z - M.z0) / M.mpp;
    const yaw = ctx.session?.camFacing?.yaw ?? 0; // 0 = facing -Z (up), 90 = facing -X (left)
    const now = Date.now();
    if (now - mmAt > 500) { // the dots refresh twice a second; the map and arrow every paint
      mmAt = now; mmRows = [];
      const scan = (tags, cls) => { for (const r of ctx.query?.({ anyTags: tags, center: f, radius: WOW.mm.radius }) ?? []) if (r.feetPosition && !r.state?.down) mmRows.push([r.feetPosition.x, r.feetPosition.z, cls]); };
      scan(['enemy'], 'foe'); scan(['npc'], 'npc');
      for (const p of ctx.place?.players ?? []) if (p.id !== player?.id && p.feetPosition) mmRows.push([p.feetPosition.x, p.feetPosition.z, 'pl']);
    }
    let dots = '';
    for (const [x, z, c] of mmRows) {
      const dx = (x - f.x) / M.mpp * k, dz = (z - f.z) / M.mpp * k; if (dx * dx + dz * dz > (half - 4) * (half - 4)) continue;
      dots += `<i class="dot ${c}" style="left:${(half + dx).toFixed(1)}px;top:${(half + dz).toFixed(1)}px"></i>`;
    }
    const card = (t, a) => { const rr = half + 8; return `<b class="card${t === 'N' ? ' n' : ''}" style="left:${(rr + Math.sin(a) * (rr - 2)).toFixed(1)}px;top:${(rr - Math.cos(a) * (rr - 2)).toFixed(1)}px">${t}</b>`; };
    const hr = wallHour(ctx); const clock = typeof hr === 'number' && isFinite(hr) ? `${String(Math.floor(hr)).padStart(2, '0')}:${String(Math.floor((hr % 1) * 60)).padStart(2, '0')} · ${esc(partName(hr) ?? '')}` : '';
    return `<div id="wmm"><div class="zone">${esc(zoneAt(f.x, f.z))}</div><div class="ring">`
      + `<div class="map" style="background-image:url('${M.img}');background-size:${M.w * k}px ${M.h * k}px;background-position:${(half - px * k).toFixed(1)}px ${(half - py * k).toFixed(1)}px">${dots}<i class="me" style="transform:rotate(${(-yaw).toFixed(1)}deg)"></i></div>`
      + card('N', 0) + card('E', Math.PI / 2) + card('S', Math.PI) + card('W', -Math.PI / 2) + (clock ? `<span class="clock">${clock}</span>` : '') + `</div></div>`;
  } catch (e) { return ''; }
}

// ---- 3rd Person skin (creator 2026-10-09): frame-target art (659x156 native, drawn at .5), live fills in its own bar wells.
// An elite/boss (MONSTERS row boss/elite, or 10+ levels over you) wears frame-boss's dragon rings over both portraits.
const KT_INK = '1px 0 0 #0b0703,-1px 0 0 #0b0703,0 1px 0 #0b0703,0 -1px 0 #0b0703,1px 1px 2px #000';
const KT_CSS = `<style>
.wtk{position:fixed;left:274px;top:calc(var(--spawn-safe-area-top,0px) + 12px);width:330px;height:78px;pointer-events:none;z-index:60;font-family:Georgia,serif;color:#f2e6cf;text-shadow:${KT_INK};filter:drop-shadow(0 3px 5px rgba(0,0,0,.55))}
.wtk.wtf-hit{animation:wtfhit .2s ease-out}.wtk.dn{filter:grayscale(1) brightness(.75)}
.wtk>.in{position:absolute;left:0;top:0;width:659px;height:156px;transform:scale(.5);transform-origin:0 0;background:url('${UIK['frame-target']}') 0 0/659px 156px no-repeat;image-rendering:auto}
.wtk .rg{position:absolute;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 50% 35%,#333a42,#0d0f12);box-shadow:inset 0 0 18px rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center}
.wtk .rg img{width:100%;height:100%;object-fit:cover}.wtk .rg span{font:700 64px/1 Georgia,serif;color:#e2b673}
.wtk .lvb{font:700 46px/1 Georgia,serif}
.wtk .nm{position:absolute;left:180px;top:27px;width:300px;height:32px;display:flex;align-items:center;justify-content:center;font:700 25px/1 Georgia,serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#ffd76a}
.wtk.foe .nm{color:#ff8a6a}
.wtk .wl{position:absolute;left:180px;width:298px;border-radius:7px;overflow:hidden;background:linear-gradient(#050607,#141619);box-shadow:inset 0 1px 4px #000}
.wtk .wl i{position:absolute;left:0;top:0;bottom:0;background-size:100% 100%;background-repeat:no-repeat;transition:width .2s linear}
.wtk .wl i.tr{background:rgba(255,236,190,.55);transition:width .7s .25s ease-out}
.wtk .wl b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 17px/1 Georgia,serif;color:#f2e6cf}
.wtk .dr{position:absolute;top:-43px;height:214px;background:url('${UIK['frame-boss']}') no-repeat;background-size:475px 214px;image-rendering:auto}
@media (max-width:820px){.wtk{left:16px;top:calc(var(--spawn-safe-area-top,0px) + 140px)}}

.wtk.t-common>.in{filter:saturate(.35) brightness(.9) hue-rotate(185deg)}
.wtk.t-rare>.in{filter:grayscale(1) brightness(1.15) contrast(1.05)}
.wtk .rg.por img{transform:scaleX(-1)}
.wtk .lvb.sk{font-size:58px;color:#ff4a3a;text-shadow:0 0 10px #a00,${KT_INK}}
.wtk .wl b.pc{justify-content:flex-end;padding-right:12px;font-size:15px;color:#ffe9b0}
.wtk .wl b.hv{justify-content:center}
.wtk .au{position:absolute;left:92px;top:80px;display:flex;gap:3px;align-items:flex-start}
.wtk .au i{position:relative;width:22px;height:22px;border-radius:3px;background:#20242a center/cover no-repeat;box-shadow:0 0 0 1px #000,inset 0 0 0 1px rgba(255,255,255,.18);font:700 11px/22px Georgia,serif;text-align:center;font-style:normal;color:#f2e6cf;overflow:hidden}
.wtk .au i.db{box-shadow:0 0 0 1px #000,inset 0 0 0 1px #c03a2a}
.wtk .au i.mine{width:30px;height:30px;line-height:30px;font-size:13px;box-shadow:0 0 0 1px #000,inset 0 0 0 2px #ff6a4a}
.wtk .au i.bb{box-shadow:0 0 0 1px #000,0 0 6px 2px #ffcc40,inset 0 0 0 2px #ffd76a;animation:wtkBB 1.4s ease-in-out infinite}
.wtk .au i u{position:absolute;inset:0;background:conic-gradient(rgba(0,0,0,.68) var(--cd),transparent 0)}
@keyframes wtkBB{50%{box-shadow:0 0 0 1px #000,0 0 11px 4px #ffdd60,inset 0 0 0 2px #fff0b0}}
</style>`;
function ktDanger(me, lvl) { const d = (+lvl || 0) - (+me || 0); return d <= -10 ? '#9d9d9d' : d <= -3 ? '#40c040' : d <= 2 ? '#ffd100' : d <= 4 ? '#ff8c1a' : '#ff2a1a'; }
function ktAuras(st, pid, now, boss) {
  const de = (Array.isArray(st.debuffs) ? st.debuffs : []).map((a) => [a, 'db']), bu = (Array.isArray(st.buffs) ? st.buffs : []).map((a) => [a, 'bf']);
  const all = [...de.filter(([a]) => a?.by === pid), ...de.filter(([a]) => a?.by !== pid), ...bu].filter(([a]) => a && (!a.until || a.until > now)).slice(0, 8);
  if (!all.length) return '';
  return `<div class="au">${all.map(([a, k]) => {
    const mine = k === 'db' && a.by === pid, bb = k === 'bf' && boss && BOSS_BUFF.test(a.id ?? ''), left = a.until && a.dur ? Math.max(0, Math.min(1, (a.until - now) / a.dur)) : 0;
    return `<i class="${k}${mine ? ' mine' : ''}${bb ? ' bb' : ''}" title="${esc(a.id ?? '')}" style="${a.icon ? `background-image:url('${esc(a.icon)}')` : ''}">${a.icon ? '' : esc((a.id ?? '?').slice(0, 1).toUpperCase())}${mine && left > 0 ? `<u style="--cd:${((1 - left) * 360).toFixed(0)}deg"></u>` : ''}</i>`;
  }).join('')}</div>`;
}
function kitTarget(d) { // creator 2026-10-10: the player frame, mirrored (ui/hud/frames.js kitTargetPlate)
  const { id, st, m, name, lvl, max, hp, pct, hit, pic, foe, me, stance, pid, now, npc } = d;
  const boss = !!(m?.boss || m?.elite || st.boss || st.elite || (!npc && +lvl >= (+me || 0) + 10));
  const fill = UIK[STANCE[stance]?.fill] ?? UIK['fill-red'];
  const s2 = st.mana != null ? { lbl: 'Mana', v: st.mana, mx: st.maxMana, img: `background-image:url('${UIK['fill-blue']}')` } : st.stamina != null ? { lbl: 'Stamina', v: st.stamina, mx: st.maxStamina, img: 'background:linear-gradient(#ffc44a,#e07a14)' } : st.fury != null ? { lbl: 'Fury', v: st.fury, mx: st.maxFury ?? 100, img: `background-image:url('${UIK['fill-red']}')` } : null;
  const sec = s2 ? { ...s2, pct: Math.round(100 * Math.max(0, s2.v) / Math.max(1, s2.mx ?? 100)), num: `${Math.round(s2.v)} / ${Math.round(s2.mx ?? 100)}` } : null;
  const skull = !npc && (m?.boss || st.boss || (+lvl - (+me || 0)) >= 10);
  const lvlHtml = npc && !st.level ? `<span style="color:#4fd36a">&#10070;</span>` : skull ? `<span style="color:#ff4a3a">&#9760;</span>` : `<span style="color:${ktDanger(me, lvl)}">${lvl}</span>`;
  return kitTargetPlate({ id, name, lvlHtml, hp, max, pct, fill, sec, foe: !!foe || fill === UIK['fill-red'], mark: boss ? 'E' : foe ? '!' : '', markCol: boss ? '#ffd76a' : '#ff6a4a', nameCol: STANCE[stance]?.name ?? '#ffd76a', pic, down: !!st.down, hit }) + (st.debuffs?.length || st.buffs?.length ? `<div class="wtk" style="left:${16 + 379 + 14 + 22}px;top:calc(var(--spawn-safe-area-top,0px) + 92px);width:1px;height:1px;filter:none">${KT_CSS}${ktAuras(st, pid, now, boss)}</div>` : '');
}
