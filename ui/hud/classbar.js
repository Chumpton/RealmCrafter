// CLASS COMBAT HUD (Campton, 2026-10-06): the mode crest left of the action bar, its picker, and the class kit bar that replaces
// the OSRS bar while a class is chosen. Read only: clicks call page globals hudMode(id) / hudModePick() / hudClassCast(slot) (ui.js).
// Mode 'osrs' (or unset) draws nothing but the crest: Zezima's actionbar.js draws his bar exactly as before.
import { DESC } from '../../scripts/lib/data/spell-desc.js'; // creator 2026-10-10: every class's tooltip carries the spell's own line
import { MODES, KINDS, isClassMode, classOf, kitBar, spellOfClass, tipOf, barOf, FREE_SLOTS, moddedOf, modMaxHit, gemOf, iconStyle } from '../../scripts/lib/data/class-spells.js';
const CAST_FRAME = '/cdn/value.dc21e1638e9dabf8e78674fe235c9352c94db006cf0e1c3f4655b48dc9040fa8.png'; // the creator's cast bar, hollowed
import { levelOf } from '../../scripts/lib/skills-core.js';
import { esc } from '../../scripts/lib/esc.js';
import { UIK } from '../../scripts/lib/data/ui-kit.js';
import { kitOn } from './skin.js';
import { stoneSlot } from './stones.js'; // A1 hearthstone, A2 portal stone (Campton 2026-10-10)
// 3rd Person skin (Options → Interface style): kit slot frames, kit spell art by school, kit cast fill; the OSRS path is untouched.
const KIT_ICON = { fire: (k) => (k === 'aoe' || k === 'cooldown' ? 'spell-axe-fire' : 'spell-flame-sword'), frost: () => 'spell-frost-lance',
  arcane: (k) => (k === 'aoe' || k === 'cooldown' ? 'spell-arcane-crystal' : 'spell-arcane-bolt'), storm: () => 'spell-void-ring', shadow: () => 'spell-void-ring',
  steel: (k) => (k === 'aoe' || k === 'cooldown' ? 'spell-jade-blade' : 'spell-blue-sword'), earth: () => 'spell-jade-blade', nature: () => 'spell-jade-blade',
  holy: () => 'spell-holy-strike', light: () => 'spell-holy-strike', ranged: () => 'spell-crossbow' };
const kitIcon = (sp) => { if (sp.kind === 'interrupt' && UIK['spell-blue-sword']) return UIK['spell-blue-sword']; if (sp.kind === 'defensive' && UIK['spell-holy-strike']) return UIK['spell-holy-strike']; const f = KIT_ICON[sp.school] ?? KIT_ICON[String(sp.el ?? '').toLowerCase()]; const n = f && f(sp.kind); return n && UIK[n] ? UIK[n] : null; };
const KIT_CSS = `<style>
#cb-crest.cb-crest{background:radial-gradient(circle at 50% 40%,color-mix(in oklab,var(--mc) 55%,transparent) 0,transparent 65%),linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box;border:1px solid transparent;border-radius:4px;image-rendering:auto}
#cb-crest.cb-crest span{font-family:Georgia,serif}
:is(#hud-bar,#hud-bar3) .cb-row{border:10px solid #8a6a32;border-image:var(--kit-ns) 32 / 10px stretch;background:linear-gradient(#2c3138,#1b1e23 60%,#15171b) padding-box;box-shadow:inset 0 1px 0 #ffffff14,0 4px 14px #000b;padding:3px 4px;image-rendering:auto}
:is(#hud-bar,#hud-bar3) .cb-slot{border:1px solid transparent;border-radius:3px;background:linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box;box-shadow:none;image-rendering:auto}
:is(#hud-bar,#hud-bar3) .cb-slot.gap{background:linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box;opacity:.8;border:1px solid transparent}
:is(#hud-bar,#hud-bar3) .cb-slot .g img{position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);object-fit:cover;border-radius:2px;box-shadow:inset 0 0 0 1px var(--ec)}
:is(#hud-bar,#hud-bar3) .cb-slot .k{left:3px;top:2px;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;z-index:1}
:is(#hud-bar,#hud-bar3) .cb-slot .t{z-index:1}
:is(#hud-bar,#hud-bar3) .cb-slot .cd{z-index:1}
:is(#hud-bar,#hud-bar3) .cb-strip{height:16px;border:1px solid #c9a24a;border-radius:3px;background:#0d0a08;box-shadow:inset 0 0 0 1px #000,0 0 0 1px #140c07}
:is(#hud-bar,#hud-bar3) .cb-strip i{background:linear-gradient(90deg,color-mix(in oklab,var(--cc) 45%,transparent),color-mix(in oklab,var(--cc) 30%,transparent)),url(${UIK['fill-cast']}) 0 0/100% 100%}
:is(#hud-bar,#hud-bar3) .cb-strip span{line-height:16px;color:#f2e6cf;text-shadow:1px 1px 0 #000,-1px -1px 0 #000}
</style>`;

const SZ = 38, GAP = 2;
const C = { walnut: '#4f3828', honey: '#ba8950', linen: '#f2e6cf', ink: '#2a1d13' };
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const CSS = `<style>
.cb-crest{position:relative;width:40px;height:${SZ * 2 + GAP}px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;border:1px solid #ba8950;border-radius:5px;background:radial-gradient(circle at 50% 40%,var(--mc) 0,rgba(30,18,10,.9) 70%);box-shadow:inset 0 0 8px rgba(0,0,0,.7)}
.cb-crest:hover{filter:brightness(1.2)}
.cb-crest b{font-size:20px;line-height:1;filter:drop-shadow(1px 1px 0 #2a1d13)}
.cb-crest span{font:bold 9px Georgia,serif;letter-spacing:.5px;color:#f2e6cf;text-shadow:1px 1px 0 #000;text-transform:uppercase}
.cb-pick{position:absolute;left:0;bottom:${SZ * 2 + GAP + 14}px;min-width:230px;padding:5px;z-index:8;font-family:Georgia,serif;color:#f2e6cf}
.cb-opt{display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:4px;cursor:pointer}
.cb-opt:hover,.cb-opt.on{background:rgba(186,137,80,.28)}
.cb-opt i{font-style:normal;width:28px;height:28px;flex:none;display:flex;align-items:center;justify-content:center;font-size:17px;border-radius:50%;border:1px solid #ba8950;background:radial-gradient(circle,var(--mc) 0,rgba(30,18,10,.95) 75%)}
.cb-opt b{display:block;font-size:13px}.cb-opt small{display:block;font-size:10px;opacity:.75;line-height:1.2}
.cb-slot{position:relative;width:${SZ}px;height:${SZ}px;flex:none;box-sizing:border-box;cursor:pointer;overflow:hidden;border:1px solid rgba(186,137,80,.8);border-radius:4px;background:radial-gradient(circle at 50% 45%,var(--ec) 0,color-mix(in oklab,var(--ec) 35%,#120a05) 55%,#0d0805 100%);box-shadow:inset 0 0 6px rgba(0,0,0,.8)}
.cb-slot:hover{filter:brightness(1.25)}
.cb-slot .g{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:19px;line-height:1;text-shadow:0 0 6px var(--ec),1px 1px 0 #000;pointer-events:none}
.cb-slot .k{position:absolute;left:2px;top:1px;font:bold 9px Georgia,serif;color:#f2e6cf;text-shadow:1px 1px 0 #000;pointer-events:none}
.cb-slot .t{position:absolute;right:1px;bottom:1px;font:bold 7px sans-serif;padding:0 2px;border-radius:2px;background:rgba(10,6,3,.75);color:var(--ec);pointer-events:none}
.cb-slot .cd{position:absolute;left:0;right:0;bottom:0;height:100%;background:rgba(10,6,3,.74);pointer-events:none}
.cb-slot.gap{background:rgba(20,12,6,.35);border-style:dashed;border-color:rgba(186,137,80,.3);cursor:default}
.cb-strip{position:relative;height:13px;margin-bottom:3px;border:1px solid rgba(186,137,80,.6);border-radius:3px;background:rgba(15,9,5,.85);overflow:hidden;font:bold 10px Georgia,serif;color:#f2e6cf;text-shadow:1px 1px 0 #000}
.cb-strip i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,color-mix(in oklab,var(--cc) 50%,#000),var(--cc));box-shadow:0 0 8px var(--cc)}
.cb-strip span{position:relative;display:block;text-align:center;line-height:13px;white-space:nowrap}
@keyframes cbfill{from{width:0}to{width:100%}}
.cb-cast{position:relative;width:min(380px,100%);aspect-ratio:664/84;margin:0 auto 4px;pointer-events:none}
.cb-cast .fr{position:absolute;inset:0;width:100%;height:100%;z-index:3}
.cb-cast .w{position:absolute;left:4.1%;top:15.5%;width:8.6%;height:69%;background:#0d0a08;overflow:hidden;z-index:1;display:flex;align-items:center;justify-content:center}
.cb-cast .w img{width:100%;height:100%;object-fit:cover}.cb-cast .w b{font-size:16px}
.cb-cast .f{position:absolute;left:16.6%;right:4.4%;top:23.5%;bottom:24.5%;background:linear-gradient(#17120d,#0a0806);overflow:hidden;z-index:1}
.cb-cast .f i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(180deg,#ffe9a0 0%,#ffc23a 30%,#f29a12 62%,#b85f06 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}
.cb-cast .f i em{position:absolute;right:-14px;top:50%;width:28px;height:28px;margin-top:-14px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#ffe8a0 18%,rgba(255,170,40,.65) 40%,transparent 70%);filter:blur(.3px)}
.cb-cast .n,.cb-cast .t{position:absolute;top:23.5%;bottom:24.5%;display:flex;align-items:center;z-index:4;color:#fff6e0;text-shadow:0 0 2px #000,1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;white-space:nowrap}
.cb-cast .n{left:18.5%;font:700 15px 'Cinzel',Georgia,serif}
.cb-cast .t{right:6.5%;font:600 14px 'Oswald','PT Sans Narrow',sans-serif;color:#efe2c2}
</style>`;

const UIM_CSS = `<style>#ui-mode{position:fixed;bottom:calc(var(--spawn-safe-area-bottom,0px) + 10px);z-index:10;pointer-events:auto}#ui-mode .nh-sep{display:none}
#ui-mode .cb-pick{bottom:calc(100% + 8px)!important;left:0;z-index:30}#ui-mode .cb-more{position:absolute;right:1px;top:0;font:700 11px/14px Arial,sans-serif;font-style:normal;color:#ffd100;cursor:pointer;padding:0 2px}#ui-mode .cb-more:hover{color:#fff}</style>`;
export function modeSwitch(player, pickOpen) {
  try {
    const mode = player?.state?.combatMode ?? 'osrs', m = MODES.find((x) => x.id === mode) ?? MODES[0];
    let h = `${CSS}${UIM_CSS}${kitOn(player) ? KIT_CSS : ''}<div style="position:relative;flex:none"><div class="cb-crest" id="cb-crest" title="${kitOn(player) ? '3rd Person + ' + esc(m.name) + '. Click for OSRS.' : 'OSRS. Click for 3rd Person + WoW.'}" onclick="hudFlip()" style="--mc:${m.color}"><b>${m.crest}</b><span>${kitOn(player) ? esc(m.name) : 'OSRS'}</span><i class="cb-more" title="Pick a combat class" onclick="event.stopPropagation();hudModePick()">▾</i></div>`;
    if (pickOpen) {
      h += `<div class="cb-pick h4-plate" id="cb-pick">` + MODES.map((o) => `<div class="cb-opt${o.id === mode ? ' on' : ''}" onclick="hudMode('${o.id}')" style="--mc:${o.color}"><i>${o.crest}</i><div><b>${esc(o.name)}</b><small>${esc(o.line)}</small></div></div>`).join('') + `</div>`;
    }
    return h + `</div><div class="nh-sep"></div>`;
  } catch (e) { return ''; }
}

import { ensureStyle } from '../../scripts/lib/ui-style.js';
const SAO_CSS = `.cb-slot.cb-proc{box-shadow:0 0 0 2px #ffd34a,0 0 12px 3px rgba(255,200,60,.85)!important;animation:cbProc .7s ease-in-out infinite alternate}
@keyframes cbProc{from{filter:brightness(1)}to{filter:brightness(1.45)}}
.cb-sao{position:fixed;left:50%;top:44%;width:340px;height:220px;transform:translate(-50%,-50%);pointer-events:none;z-index:5}
.cb-sao i{position:absolute;top:0;width:70px;height:220px;border:4px solid #ffcf4a;border-radius:50%;filter:drop-shadow(0 0 8px #ff9a1a) drop-shadow(0 0 3px #fff2b0);animation:cbSao .55s ease-in-out infinite alternate}
.cb-sao i.l{left:0;border-right-color:transparent;border-top-color:transparent;border-bottom-color:transparent}
.cb-sao i.r{right:0;border-left-color:transparent;border-top-color:transparent;border-bottom-color:transparent}
.cb-sao b{position:absolute;left:0;right:0;bottom:-26px;text-align:center;font:700 15px/1 'WowFriz','Cinzel',Georgia,serif;color:#ffd96a;text-shadow:0 0 6px #b25a00,1px 1px 0 #000;letter-spacing:.06em}
@keyframes cbSao{from{opacity:.55;transform:scale(.97)}to{opacity:1;transform:scale(1.03)}}`;
let mk = null, mh = '';
export function classBar(ctx, player) {
  try {
    const s = player?.state ?? {}, mode = s.combatMode;
    if (!isClassMode(mode)) return '';
    const c = classOf(mode), bar = barOf(s, mode), now = num(ctx?.now?.() ?? Date.now()), L = levelOf(s.skills?.[c.skill] | 0);
    const cast = s.ccast && spellOfClass(s.ccast.id) ? s.ccast : null;
    const ogcd = (id) => !!spellOfClass(id)?.ogcd, gcdEnd = (id) => (ogcd(id) ? 0 : num(s.cgcd)); // off-GCD tools never wear the global sweep
    const proc = num(s.cproc?.until) > now ? s.cproc : null;
    const cds = bar.map((id) => { const left = Math.max(num(s.ccd?.[id]) - now, gcdEnd(id) - now); return left > 0 ? Math.ceil(left / 100) : 0; });
    const kit = kitOn(player);
    const key = `${s.hearthCd ?? 0}|${kit ? 'K' : ''}${mode}|${L}|${bar.join(',')}|${JSON.stringify(s.cgem ?? {})}|${JSON.stringify(s.csock ?? {})}|${cast ? cast.id + cast.start : ''}|${JSON.stringify(s.ccd ?? {})}|${s.cgcd ?? 0}|${proc ? proc.until : 0}|${cds.map((v) => (v > 0 ? 1 : 0)).join('')}`;
    if (key === mk) return mh;
    const slot = (i) => {
      const stone = stoneSlot(i, player, now); if (stone) return stone;
      const sp = spellOfClass(bar[i]);
      const kl = i >= 20 ? 'A' + ((i - 19) % 10) : i >= 10 ? '⇧' + ((i - 9) % 10) : String((i + 1) % 10); // Shift+digit reaches the top row (ui.js h4key)
      const free = FREE_SLOTS.includes(i);
      if (!sp) return free ? `<div class="cb-slot gap" title="Free slot: open the spell catalog to fill it" onclick="hudClassBook()" style="cursor:pointer"><span class="g" style="font-size:13px;opacity:.5">＋</span><span class="k">${kl}</span></div>` : `<div class="cb-slot gap" title="${esc(c.name)}"><span class="k">${kl}</span></div>`;
      const m = moddedOf(sp, s), tip = tipOf(sp, L).replace(/max hit \d+$/, `max hit ${modMaxHit(m, L)}`) + ` · gem ${m.lv}` + (m.links.length ? ` · ${m.links.join(', ')}` : '') + (DESC[sp.name] ? ` ¶ ${DESC[sp.name]}` : '');
      const end = Math.max(num(s.ccd?.[sp.id]), gcdEnd(sp.id)), left = end - now, dur = left > 0 ? (num(s.ccd?.[sp.id]) > gcdEnd(sp.id) ? sp.cd : num(s.cgcdMs) || 1500) : 0;
      const shade = left > 0 ? `<i class="cd" style="animation:h4fbcd ${dur}ms linear ${left - dur}ms forwards"></i>` : '';
      return `<div class="cb-slot${proc && sp.kind === 'cast' ? ' cb-proc' : ''}" id="cb-${i}" title="${esc(tip)}" onclick="hudClassCast(${i})"${free ? ` oncontextmenu="event.preventDefault();hudClassGem({act:'unbar',mode:'${mode}',slot:${i}})"` : ''} style="--ec:${sp.color}">${iconStyle(sp) ? `<span class="g cb-ic" style="${iconStyle(sp)};position:absolute;inset:2px;border-radius:2px;font-size:0"></span>` : `<span class="g">${kit && kitIcon(sp) ? `<img src="${kitIcon(sp)}" alt="">` : sp.glyph}</span>`}${shade}<span class="k">${kl}</span><span class="t">${KINDS[sp.kind].badge}</span></div>`;
    };
    const row = (from) => { let r = `<div${kit ? ' class="cb-row"' : ''} style="display:flex;gap:${GAP}px">`; for (let i = from; i < from + 10; i++) { if (i % 10 === 4) r += `<div style="width:6px"></div>`; r += slot(i); } return r + `</div>`; };
    let strip;
    if (cast) { const sp = spellOfClass(cast.id), dur = cast.end - cast.start, el = Math.max(0, now - cast.start);
      const ic = kitIcon(sp); // creator 2026-10-10 "hollow out cast bar and use this style": his frame, cut hollow, the fill and spark slide through its window
      strip = `<div class="cb-cast" id="cb-castbar" style="--cc:${sp.color}"><div class="w">${iconStyle(sp) ? `<i style="${iconStyle(sp)};display:block;width:100%;height:100%;border-radius:50%"></i>` : ic ? `<img src="${ic}" alt="">` : `<b>${sp.glyph}</b>`}</div><div class="f"><i style="animation:cbfill ${dur}ms linear -${el}ms forwards"><em></em></i></div><span class="n">${esc(sp.name)}</span><span class="t">${(dur / 1000).toFixed(1)}s</span><img class="fr" src="${CAST_FRAME}" alt=""></div>`; }
    else strip = `<div class="cb-strip" style="--cc:${c.color};cursor:pointer;pointer-events:auto" title="Open the ${esc(c.name)} spell catalog" onclick="hudClassBook()"><i style="width:100%;opacity:.25"></i><span>📕 ${c.crest} ${esc(c.name)} · ${c.els.map((e) => e[2] + ' ' + e[0]).join('  ')}</span></div>`;
    mh = `<div id="hud-bar" style="position:relative;display:flex;flex-direction:column;gap:${GAP}px;pointer-events:auto">${strip}${row(10)}${row(0)}</div><div id="hud-bar3" style="position:absolute;left:calc(100% + 6px);bottom:0;display:flex;align-items:flex-end;pointer-events:auto">${row(20)}</div>`;
    if (proc) mh += `<div class="cb-sao"><i class="l"></i><i class="r"></i><b>${esc(proc.name)}</b></div>`; // the Spell Activation Overlay: gold wings either side of you while the proc waits
    ensureStyle('cb-sao-style', SAO_CSS);
    mk = key;
    return mh;
  } catch (e) { return ''; }
}
