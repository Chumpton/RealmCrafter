// GOAL4-S1 W6 art lane: the carved-oak HUD look, one string injected once by ui.js. Classes only; positions/sizes ride inline in each plate.
// Palette (scripts/lib/data/aesthetic.yml): walnut #4f3828, honey #ba8950, linen #f2e6cf, moss #9baf84. One new colour: HP oklch(0.5 0.18 25) (a health bar must read as alarm; the palette has no red).
// Darks are walnut/shadow alphas (rgba(20,12,6,a) = the house hard-shadow tone), lights are linen alphas. Flat fill, 1 px carved bevel, 92 % solid, no gloss.
const V = '--walnut:#4f3828;--honey:#ba8950;--linen:#f2e6cf;--moss:#9baf84;--hp:oklch(0.5 0.18 25);--plate:rgba(79,56,40,.92);--ink:rgba(20,12,6,.6);--bevel:inset 0 1px 0 rgba(242,230,207,.22),inset 0 -1px 0 rgba(20,12,6,.55)';
const ALL = '.h4,.h4-plate,.h4-win,.h4-slot,.h4-rune,.h4-bar-track,.h4-bar-fill,.h4-title,.h4-x,.h4-key,.h4-sweep';
export const HUD_CSS = `<style>
${ALL}{${V};box-sizing:border-box}
.h4{font-family:Georgia,serif;color:var(--linen)}
.h4-plate,.h4-win{background:var(--plate);border:2px solid var(--honey);border-radius:6px;box-shadow:var(--bevel),4px 4px 0 var(--ink);color:var(--linen);font-family:Georgia,serif;font-size:14px;line-height:1.35;pointer-events:auto}
.h4-win{width:340px;max-width:calc(100vw - 2*(var(--spawn-chrome-reservation-right-inset,50px) + 24px));max-height:70vh;overflow-y:auto;overflow-x:hidden;padding:0 12px 12px;animation:h4in 120ms ease-out both;scrollbar-width:thin;scrollbar-color:var(--honey) rgba(20,12,6,.35)}
@keyframes h4in{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
.h4-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 -12px 10px;padding:7px 8px 6px 12px;color:var(--honey);letter-spacing:.14em;text-transform:uppercase;font-size:13px;font-weight:bold;border-bottom:1px solid rgba(20,12,6,.7);box-shadow:0 1px 0 rgba(242,230,207,.16)}
.h4-x{width:22px;height:22px;flex:none;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid rgba(186,137,80,.7);border-radius:4px;background:rgba(20,12,6,.35);box-shadow:inset 0 1px 0 rgba(20,12,6,.5),inset 0 -1px 0 rgba(242,230,207,.12);color:var(--linen);font:bold 13px/1 Georgia,serif;cursor:pointer}
.h4-x:hover{color:var(--honey);border-color:var(--honey)}
.h4-slot{position:relative;overflow:hidden;cursor:pointer;width:44px;height:44px;flex:none;padding:0;border:2px solid var(--honey);border-radius:5px;background:var(--walnut);box-shadow:inset 0 2px 4px rgba(20,12,6,.6),inset 0 -1px 0 rgba(242,230,207,.14),2px 2px 0 var(--ink);color:var(--linen);font:18px/1 Georgia,serif;display:inline-flex;align-items:center;justify-content:center;pointer-events:auto;transition:box-shadow .08s,transform .08s}
.h4-slot:hover{transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(242,230,207,.3),inset 0 -1px 0 rgba(20,12,6,.55),3px 3px 0 var(--ink)}
.h4-slot:active{transform:translateY(1px);box-shadow:inset 0 3px 5px rgba(20,12,6,.7),1px 1px 0 var(--ink)}
.h4-key{position:absolute;top:2px;left:3px;font:9px/1 Georgia,serif;color:rgba(242,230,207,.7);letter-spacing:.04em;pointer-events:none;text-shadow:1px 1px 0 rgba(20,12,6,.8)}
.h4-sweep{position:absolute;inset:0;pointer-events:none}
.h4-rune{width:34px;height:34px;flex:none;display:inline-flex;align-items:center;justify-content:center;padding:0;border:2px solid var(--honey);border-radius:5px;background:var(--walnut);box-shadow:var(--bevel),2px 2px 0 var(--ink);color:var(--linen);font:18px/1 Georgia,serif;cursor:pointer;pointer-events:auto;text-shadow:1px 1px 0 rgba(20,12,6,.7)}
.h4-rune:hover{box-shadow:inset 0 1px 0 rgba(242,230,207,.32),inset 0 -1px 0 rgba(20,12,6,.55),2px 2px 0 var(--ink)}
.h4-rune.on{color:var(--honey);box-shadow:inset 0 2px 3px rgba(20,12,6,.6),1px 1px 0 var(--ink)}
.h4-rune:disabled,.h4-rune[disabled]{opacity:.35;filter:grayscale(1);cursor:default;box-shadow:var(--bevel)}
.h4-bar-track{position:relative;height:8px;overflow:hidden;border-radius:2px;background:rgba(20,12,6,.55);border:1px solid rgba(20,12,6,.7);box-shadow:inset 0 1px 2px rgba(20,12,6,.6),0 1px 0 rgba(242,230,207,.12)}
.h4-bar-fill{display:block;height:100%;width:0;background:var(--moss);box-shadow:inset 0 1px 0 rgba(242,230,207,.25);transition:width .2s}
/* layout guards (review 2026-10-02): the frame, bar and menu own their bands; windows stay clear of them */
#hud-player{background:rgba(79,56,40,.97)}
#hud-player,#hud-bar,#hud-micro{z-index:60}
[id^=win-][data-modal]{z-index:58}

@media (pointer:coarse),(hover:none){#hud-bar,#hud-micro,#bar-picker{display:none!important}}
@media (max-width:600px){#hud-player{transform:scale(.8);transform-origin:top left}#hud-micro{display:none!important}}
</style>`;

// NORSE HUD SKIN (creator ask 2026-10-04): one aged-timber skin for every plate, bar, slot and button. Appended last so it wins the
// cascade; the h4-* classes alias to the nh-* ones, and the older panels (skills .skp, stamina .stp, options #den-settings, every
// data-modal window) wear the same recipe through !important (their inline looks are only paint, never layout or wiring).
const TITLE = "'Cinzel',Georgia,'Times New Roman',serif", SANS = "system-ui,'Inter','Segoe UI',Roboto,sans-serif";
const RIV = 'radial-gradient(circle,#f3d692 0 1.2px,#a8783c 1.9px,rgba(20,12,6,.75) 2.6px,transparent 3.2px)';
const RIVETS = `${RIV} left 1px top 1px/9px 9px no-repeat,${RIV} right 1px top 1px/9px 9px no-repeat,${RIV} left 1px bottom 1px/9px 9px no-repeat,${RIV} right 1px bottom 1px/9px 9px no-repeat`;
const TRIM = 'linear-gradient(90deg,transparent,rgba(186,137,80,.55) 14%,rgba(186,137,80,.55) 86%,transparent) center top 5px/calc(100% - 22px) 1px no-repeat,'
  + 'repeating-linear-gradient(90deg,rgba(186,137,80,.42) 0 7px,transparent 7px 9px,rgba(186,137,80,.42) 9px 10px,transparent 10px 12px,rgba(186,137,80,.42) 12px 13px,transparent 13px 17px) center bottom 5px/calc(100% - 22px) 1px no-repeat';
const GRAIN = 'repeating-linear-gradient(91deg,rgba(255,214,160,.028) 0 2px,rgba(0,0,0,.055) 2px 3px,transparent 3px 8px),repeating-linear-gradient(0deg,rgba(0,0,0,.05) 0 1px,transparent 1px 13px)';
const WOOD = `${RIVETS},${TRIM},${GRAIN},linear-gradient(180deg,#3b2a1e,#2a1d14)`;
const EDGE = 'inset 0 0 0 1px #140c07,inset 0 0 0 2px rgba(242,200,140,.08),0 6px 18px rgba(0,0,0,.42),0 1px 3px rgba(0,0,0,.5)';
const STONE = `${RIVETS},repeating-linear-gradient(0deg,rgba(0,0,0,.06) 0 1px,transparent 1px 5px),radial-gradient(120% 140% at 50% 0%,#4b3c30,#2a2019 70%)`;
export const NH_CSS = `<style>
.nh-panel,.h4-plate,.h4-win,.skp,.stp,#den-settings,[data-modal]{background:${WOOD}!important;border:2px solid #ba8950!important;border-radius:5px!important;box-shadow:${EDGE}!important;color:#f2e6cf}
.nh-panel,.h4-plate,.h4-win,#den-settings,[data-modal]{font-family:${TITLE}}
.nh-title,.h4-title{font-family:${TITLE}!important;font-variant:small-caps;text-transform:none!important;letter-spacing:.12em!important;color:#e2b673!important;border-bottom:1px solid rgba(186,137,80,.45)!important;box-shadow:0 1px 0 #140c07!important}
.nh-num{font-family:${SANS}!important;font-variant-numeric:tabular-nums;font-weight:600;letter-spacing:0}
.nh-bar,.h4-bar-track{background:linear-gradient(#140c07,#24180f)!important;border:1px solid #0e0905!important;border-radius:3px!important;box-shadow:inset 0 1px 3px rgba(0,0,0,.7),0 1px 0 rgba(186,137,80,.25)!important}
.nh-bar>i,.h4-bar-fill{box-shadow:inset 0 1px 0 rgba(255,240,210,.35),inset 0 -2px 3px rgba(0,0,0,.3)}
.nh-slot,.h4-slot{background:radial-gradient(90% 90% at 50% 40%,#3b2a1e,#1c130c)!important;border:1px solid #8a6436!important;border-radius:4px!important;box-shadow:inset 0 2px 6px rgba(0,0,0,.75),inset 0 0 0 1px rgba(0,0,0,.6),0 1px 0 rgba(186,137,80,.25)!important}
.nh-slot:hover,.h4-slot:hover{border-color:#e2b673!important;transform:none}
.nh-slot.on,.h4-slot.on{border-color:#e2b673!important;box-shadow:inset 0 2px 6px rgba(0,0,0,.75),0 0 8px rgba(226,182,115,.55)!important}
.nh-btn,.h4-rune{position:relative;background:linear-gradient(180deg,#46321f,#2a1d14)!important;border:1px solid #ba8950!important;border-radius:4px!important;box-shadow:inset 0 0 0 1px #140c07,inset 0 1px 0 rgba(242,200,140,.18),0 2px 4px rgba(0,0,0,.4)!important;color:#f2e6cf;cursor:pointer;pointer-events:auto}
.nh-btn:hover,.h4-rune:hover{border-color:#f0cf8a!important;color:#f0cf8a}
.nh-btn.on,.h4-rune.on{background:linear-gradient(180deg,#ba8950,#8a6234)!important;color:#1e140c!important}
.h4-rune:disabled,.h4-rune[disabled]{opacity:.4!important}
.h4-key,.nh-key{position:absolute;top:2px;left:2px;padding:1px 3px;border-radius:2px;background:rgba(14,9,5,.55);font:600 9px/1 ${SANS}!important;font-variant-numeric:tabular-nums;color:rgba(242,230,207,.85)!important;letter-spacing:0;text-shadow:none!important;pointer-events:none;z-index:1}
.h4-x{font-family:${SANS}!important}
#nh-dock{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 12px;z-index:60;pointer-events:auto;background:${STONE};border:2px solid #ba8950;border-radius:6px;box-shadow:${EDGE}}
#nh-dock #hud-bar,#nh-dock #hud-micro{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;align-items:center!important}
#nh-dock .nh-sep{flex:none;width:2px;height:40px;background:linear-gradient(transparent,rgba(186,137,80,.75),transparent);box-shadow:1px 0 0 #140c07}
#nh-dock .h4-rune{width:36px!important;height:36px!important}
#nh-dock #hud-bag{width:44px!important;height:44px!important;margin-left:0!important}
#nh-top{position:fixed;top:calc(var(--spawn-safe-area-top,0px) + 6px);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:4px 9px;z-index:61;opacity:.72;pointer-events:auto;background:${WOOD};border:1px solid #ba8950;border-radius:5px;box-shadow:${EDGE};font:600 12px/1 ${SANS};color:#f2e6cf;transition:opacity .15s}
#nh-top:hover,#nh-top.hot{opacity:1}
#nh-top .nh-btn{height:26px;min-width:26px;padding:0 8px;font:600 12px/24px ${SANS};display:inline-flex;align-items:center;gap:5px}
#nh-top .nh-sky{position:static!important;transform:none!important;display:flex;gap:4px}
#nh-top .nh-sky button{width:28px!important;height:26px!important;line-height:24px!important;font-size:15px!important;border-radius:4px!important}
#nh-top #savi-watch{position:static!important;left:auto!important;top:auto!important;padding:2px 6px!important;font-family:${SANS}!important}
#nh-top .nh-dot{width:8px;height:8px;border-radius:50%;background:#e7b457;box-shadow:0 0 6px #e7b457;animation:nhPulse 1.1s ease-in-out infinite}
@keyframes nhPulse{50%{opacity:.25}}
@keyframes h4fbcd{from{height:100%}to{height:0%}}
#nh-drawer{position:fixed;top:calc(var(--spawn-safe-area-top,0px) + 44px);left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 14px;max-width:min(600px,64vw);z-index:61;pointer-events:auto;font:13px/1.35 ${SANS};color:#f2e6cf}
#nh-drawer #wake-savi,#nh-drawer #wake-banner{position:static!important;transform:none!important;left:auto!important;top:auto!important;max-width:100%!important;box-shadow:none!important;font-family:${SANS}!important;background:rgba(14,9,5,.45)!important;border-radius:4px!important}
#nh-drawer .nh-hint{opacity:.65;font-size:11px}
/* WOW-HUD (condensed): a compact strip bottom-centre, micro + bags bottom-right, frame top-left ~230 px */
#hud-player{transform:scale(.78);transform-origin:top left}
#nh-dock{bottom:calc(var(--spawn-safe-area-bottom,0px) + 6px)!important;display:block!important;padding:9px 6px 5px!important;gap:0!important;width:auto!important;max-width:none!important;background:linear-gradient(180deg,#3b2a1e,#24180f)!important;border:1px solid #ba8950!important;border-radius:4px!important;box-shadow:inset 0 0 0 1px #140c07,0 3px 10px rgba(0,0,0,.45)!important}
#nh-dock #hud-xp{position:absolute;left:4px;right:4px;top:-17px;height:12px;margin:0;overflow:visible;pointer-events:auto;background:linear-gradient(#0d0816,#1d1230);border:1px solid #000;border-radius:3px;box-shadow:0 0 0 1px #c9a24a,inset 0 2px 3px rgba(0,0,0,.8)}
#nh-dock #hud-xp>i{display:block;height:100%;border-radius:2px;background:linear-gradient(180deg,#e2b6ff 0,#a35cf0 35%,#7a2fd0 60%,#4b168c 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 0 6px rgba(170,90,255,.6);transition:width .35s ease-out}
#nh-dock #hud-xp>b{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(5% - 1px),rgba(0,0,0,.55) calc(5% - 1px),rgba(0,0,0,.55) 5%)}
#nh-dock #hud-xp>span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;font:700 10px/1 Arial,sans-serif;color:#fff;text-shadow:0 0 2px #000,1px 1px 0 #000;pointer-events:none;background:none;padding:0}
#nh-dock .h4-slot{width:38px!important;height:38px!important}
#nh-dock .h4-key{font-size:9px!important;padding:0 2px!important;line-height:10px!important}
#hud-micro{position:fixed!important;right:12px;bottom:calc(var(--spawn-safe-area-bottom,0px) + 10px);display:flex!important;flex-direction:row;align-items:center;gap:8px;z-index:60;pointer-events:auto}
#hud-micro .nh-tray{display:flex;flex-direction:row;align-items:center;gap:2px;padding:3px;background:linear-gradient(180deg,#3b2a1e,#24180f);border:1px solid #ba8950;border-radius:4px;box-shadow:inset 0 0 0 1px #140c07,0 2px 6px rgba(0,0,0,.4)}
#hud-micro .h4-rune{width:26px!important;height:26px!important;font-size:13px!important}
#hud-micro .h4-rune svg{width:13px;height:13px}
#hud-micro .h4-key{font-size:7px!important;padding:0 1px!important;line-height:8px!important;top:1px!important;left:1px!important}
#hud-micro #hud-bagbar .h4-slot{width:26px!important;height:26px!important;cursor:default}
#hud-micro #hud-bag{width:32px!important;height:32px!important}
#hud-micro #hud-bag svg{width:20px;height:20px}
#win-bags{width:auto!important;max-height:none!important}
#win-character{width:400px!important}
.cw-eq{display:flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:15px;opacity:.9}
.cw-stat{display:flex;justify-content:space-between;padding:1px 0;border-bottom:1px dotted rgba(186,137,80,.25);font-size:12px}
.cw-stat b{color:#e2b673;font-variant-numeric:tabular-nums}
/* creator 2026-10-09 (items 4): gryphon endcaps stand OUTSIDE the bar frame, art's inner edge flush to the frame's outer edge (2px border), never over the first/last slot; both skins */
#h4-root #nh-dock .osg.l{left:auto!important;right:calc(100% + 2px)!important}
#h4-root #nh-dock .osg.r{right:auto!important;left:calc(100% + 2px)!important}
/* keybind labels: top-left inside each slot, 2px inset, click-through, small serif with a 1px black stroke (action bar + class bar, both skins) */
#h4-root #nh-dock #hud-bar .h4-key,#h4-root #nh-dock :is(#hud-bar,#hud-bar3) .cb-slot .k{position:absolute!important;top:2px!important;left:2px!important;right:auto!important;bottom:auto!important;margin:0!important;padding:0!important;background:none!important;border-radius:0!important;font:700 9px/9px Georgia,'Times New Roman',serif!important;color:#f2e6cf!important;letter-spacing:0!important;text-shadow:1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000,1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000!important;pointer-events:none!important;z-index:3!important;white-space:nowrap}
</style>`;
