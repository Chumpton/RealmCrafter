// DEV TEAM TRACKER book (lane 4, plan docs/board/DEV-TRACKER-PLAN-2026-10-06.md): every rule of the tab and the book.
// OSRS frame: parchment cream, red-brown ink, the chatbox's stone border (#3e3529 / #1e1a14 / #75674f). Animation is transform + opacity only.
export const DEVBOOK_CSS = `<style>
:root{--db-paper:#d8c8a0;--db-paper2:#cdb98a;--db-edge:#a8915f;--db-ink:#5a1f10;--db-ink2:#7f0000;--db-soft:#6e5a3e;--db-stone:#3e3529;--db-stone2:#1e1a14;--db-hi:#75674f;--db-gold:#d6ab4a;--db-gold2:#8a6420;--db-leather:#5b3a21}
#devbook-tab{position:fixed;z-index:61;left:var(--dbt-left,calc(8px + 150px * var(--ospk,1)));top:var(--dbt-top,auto);bottom:var(--dbt-bottom,calc(var(--spawn-safe-area-bottom,0px) + 8px + 180px * var(--ospk,1)));width:calc(36px * var(--ospk,1));height:calc(30px * var(--ospk,1));padding:0;border:0;background:none;cursor:pointer;pointer-events:auto;transform-origin:50% 100%;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}
#devbook-tab svg{display:block;width:100%;height:100%;filter:drop-shadow(0 2px 0 rgba(0,0,0,.55))}
#devbook-tab:hover{transform:translateY(-3px) scale(1.1)}
#devbook-tab:active{transform:translateY(0) scale(.94)}
#devbook-tab .db-glow{position:absolute;inset:-25%;border-radius:50%;background:radial-gradient(circle,rgba(255,214,110,.75),rgba(255,190,60,0) 65%);opacity:0;pointer-events:none}
#devbook-tab.db-new .db-glow{animation:db-pulse 1.5s ease-out 4}
#devbook-tab .db-badge{position:absolute;right:-6px;top:-7px;min-width:15px;height:15px;padding:0 3px;box-sizing:border-box;border-radius:8px;background:radial-gradient(circle at 35% 30%,#ff4a3a,#b00e04 60%,#6d0500);box-shadow:0 0 0 1px #2a0806,0 1px 0 #000;color:#ffff00;font:bold 11px/15px 'RuneScape Small','RuneScape UF',Tahoma,Verdana,sans-serif;text-shadow:1px 1px 0 #000;text-align:center;animation:db-pop .35s cubic-bezier(.34,1.8,.64,1) both}
#devbook-tab .db-tip{position:absolute;left:50%;bottom:110%;transform:translateX(-50%);white-space:nowrap;background:#ffffa0;color:#000;border:1px solid #000;font:11px/13px 'RuneScape Small',Tahoma,sans-serif;padding:1px 4px;opacity:0;transition:opacity .15s;pointer-events:none}
#devbook-tab:hover .db-tip{opacity:1}
@keyframes db-pulse{0%{transform:scale(.6);opacity:.85}100%{transform:scale(1.5);opacity:0}}
@keyframes db-pop{0%{transform:scale(0)}60%{transform:scale(1.35)}100%{transform:scale(1)}}
@media (pointer:coarse),(hover:none){#devbook-tab{display:none}}

#db-back{position:fixed;inset:0;z-index:62;pointer-events:auto;background:rgba(10,8,4,.28);animation:db-fade .25s ease-out both}
#devbook-book{position:fixed;z-index:63;left:var(--dbx,calc(50vw - 380px));top:var(--dby,60px);width:calc(760px * var(--dbk,1));height:calc(520px * var(--dbk,1));pointer-events:auto}
html.db-narrow #devbook-book{width:calc(400px * var(--dbk,1))}
#db-pos{position:absolute;left:0;top:0;width:760px;height:520px;transform-origin:0 0;transform:scale(var(--dbk,1))}
html.db-narrow #db-pos{width:400px}
#db-book{position:absolute;inset:0;perspective:2200px;transform-origin:50% 100%;animation:db-rise .26s cubic-bezier(.2,.9,.3,1.15) both;font:15px/1.38 'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;color:var(--db-ink);text-shadow:none}
#devbook-book.db-shut #db-book{animation:db-fall .34s cubic-bezier(.55,0,.8,.4) .12s both}
#db-back.db-shut{animation:db-fade-out .4s both}
.db-frame{position:absolute;inset:0;border-radius:6px;background:var(--db-stone);box-shadow:inset 0 0 0 1px var(--db-stone2),inset 2px 2px 0 var(--db-hi),inset -2px -2px 0 #2a241b,0 10px 0 -2px rgba(0,0,0,.35),0 18px 40px rgba(0,0,0,.55)}
.db-spread{position:absolute;inset:7px;display:flex;transform-style:preserve-3d;animation:db-settle .42s cubic-bezier(.3,1.6,.5,1) .8s both}
.db-page{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;background:var(--db-paper) radial-gradient(ellipse at 30% 25%,rgba(255,250,230,.45),transparent 60%);overflow:hidden}
.db-page::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 85% 80%,rgba(140,110,60,.28),transparent 55%),repeating-linear-gradient(0deg,rgba(90,60,20,.035) 0 1px,transparent 1px 4px)}
.db-l{border-radius:3px 0 0 3px;box-shadow:inset -18px 0 22px -14px rgba(70,45,15,.55),inset 0 0 0 1px var(--db-edge);animation:db-fade .2s ease-out .46s both}
.db-r{border-radius:0 3px 3px 0;box-shadow:inset 18px 0 22px -14px rgba(70,45,15,.55),inset 0 0 0 1px var(--db-edge)}
.db-spine{position:absolute;left:50%;top:-2px;bottom:-2px;width:4px;margin-left:-2px;background:linear-gradient(90deg,#6b5530,#2a1d0e 50%,#6b5530);pointer-events:none;z-index:3}
html.db-narrow .db-spine{display:none}
html.db-narrow .db-r{display:none}html.db-narrow .db-has-sel .db-l{display:none}html.db-narrow .db-has-sel .db-r{display:flex;border-radius:3px}
.db-hd{position:relative;z-index:1;padding:10px 14px 6px;border-bottom:1px solid rgba(90,31,16,.28)}
.db-ch{display:flex;align-items:center;gap:6px}
.db-ch h2{flex:1;margin:0;text-align:center;font:600 19px/1.15 'Palatino Linotype','Book Antiqua',Georgia,serif;color:var(--db-ink2);letter-spacing:.02em;font-variant:small-caps;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.db-ch h2 small{display:block;font:italic 12px/1.2 Georgia,serif;color:var(--db-soft);font-variant:normal;letter-spacing:0}
.db-arr{flex:0 0 24px;height:24px;border:0;border-radius:3px;cursor:pointer;color:#ffb83f;background:linear-gradient(#5a5040,#423a2e 55%,#382f24);box-shadow:inset 0 0 0 1px #17130e,inset 1px 1px 0 #75674f;font:12px/24px Verdana,sans-serif;text-shadow:1px 1px 0 #000;transition:transform .12s}
.db-arr:hover:not([disabled]){transform:scale(1.12)}.db-arr:active:not([disabled]){transform:scale(.9)}.db-arr[disabled]{opacity:.35;cursor:default}
.db-fl{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;justify-content:center}
.db-chipf{border:1px solid rgba(90,31,16,.45);background:rgba(255,248,225,.35);color:var(--db-ink);border-radius:10px;padding:1px 8px;font:12px/16px Georgia,serif;cursor:pointer;transition:transform .12s}
.db-chipf:hover{transform:translateY(-1px)}.db-chipf.on{background:var(--db-ink2);color:#ffe9b8;border-color:#3d0000}
.db-list{position:relative;z-index:1;flex:1;overflow-y:auto;padding:6px 10px 4px;scrollbar-width:thin;scrollbar-color:#8f7a50 transparent}
.db-in{animation:db-fade .25s ease-out .18s both}
.db-e{position:relative;display:flex;gap:8px;padding:6px 6px 5px;margin-bottom:3px;border-radius:3px;cursor:pointer;border-bottom:1px dashed rgba(90,31,16,.22);transition:transform .15s,background-color .15s}
.db-e:hover{transform:translateX(3px);background-color:rgba(255,250,232,.32)}
.db-e.on{background-color:rgba(127,0,0,.09);box-shadow:inset 3px 0 0 var(--db-ink2)}
.db-crest{flex:0 0 26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 15px/1 Georgia,serif;font-style:normal;box-shadow:inset 0 0 0 2px rgba(0,0,0,.35),0 1px 0 rgba(0,0,0,.4)}
.db-crest.z{background:radial-gradient(circle at 35% 30%,#ffe9a0,#d6ab4a 55%,#8a6420);color:#4a2c00}
.db-crest.c{background:radial-gradient(circle at 35% 30%,#b8f0a0,#4f9a3a 55%,#245216);color:#0e2a06}
.db-crest.big{flex-basis:38px;height:38px;font-size:21px}
.db-eb{flex:1;min-width:0}
.db-eh{display:flex;align-items:baseline;gap:6px;font-size:13px}
.db-eh b{color:var(--db-ink2);font-weight:700}.db-eh time{color:var(--db-soft);font:11px/1 'RuneScape Small',Tahoma,sans-serif}
.db-pv{font-size:13.5px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.db-react-slot{display:flex;flex-wrap:wrap;gap:3px;min-height:2px;margin-top:2px}
.db-chip{display:inline-flex;align-items:center;gap:2px;padding:0 5px 0 3px;border-radius:9px;background:rgba(255,250,232,.6);box-shadow:inset 0 0 0 1px rgba(90,31,16,.3);font:11px/17px Tahoma,sans-serif;color:var(--db-ink);cursor:pointer;transition:transform .12s}
.db-chip:hover{transform:scale(1.12)}.db-chip.mine{background:rgba(214,171,74,.55);box-shadow:inset 0 0 0 1px var(--db-gold2)}
.db-chip b{font-weight:700}
.db-rib{position:absolute;right:-1px;top:4px;padding:1px 6px 1px 9px;font:bold 9px/13px 'RuneScape Small',Tahoma,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#fff3c8;text-shadow:1px 1px 0 rgba(0,0,0,.6);background:linear-gradient(#b8292a,#7f0000);clip-path:polygon(0 0,100% 0,100% 100%,0 100%,6px 50%);pointer-events:none}
.db-rib.milestone{background:linear-gradient(#e2b84f,#8a6420);color:#2a1700;text-shadow:none}.db-rib.idea{background:linear-gradient(#5aa34a,#2a5a1c)}.db-rib.bug{background:linear-gradient(#7a7266,#463f36)}.db-rib.fix{background:linear-gradient(#3e7fa8,#1d4560)}
.db-seal{position:absolute;right:4px;bottom:3px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;background:radial-gradient(circle at 35% 30%,#d8403a,#8e0d07 60%,#5a0400);box-shadow:0 0 0 2px rgba(142,13,7,.35),0 1px 1px rgba(0,0,0,.5);color:#ffd9a8;transform:rotate(-12deg);pointer-events:none}
.db-seal.jev{right:28px;background:radial-gradient(circle at 35% 30%,#f2d88a,#b38a2e 60%,#6e4f10);color:#3a2400;box-shadow:0 0 0 2px rgba(179,138,46,.35),0 1px 1px rgba(0,0,0,.5)}
.db-empty{padding:28px 18px;text-align:center;font-style:italic;color:var(--db-soft)}
.db-empty .db-quill{display:block;font-size:30px;margin-bottom:6px;opacity:.7;font-style:normal}
.db-pg{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:10px;padding:4px 0 7px;font:italic 12px/1 Georgia,serif;color:var(--db-soft)}
.db-srch{display:flex;gap:6px;align-items:center}
.db-srch input{flex:1;min-width:0;height:22px;box-sizing:border-box;border:1px solid #625849;box-shadow:inset 1px 1px 0 rgba(0,0,0,.25);background:#e6d9b6;color:var(--db-ink);font:13px Georgia,serif;padding:0 6px;outline:none}
.db-srch input:focus{border-color:var(--db-ink2);background:#efe4c4}
.db-det{position:relative;z-index:1;flex:1;overflow-y:auto;padding:10px 16px 8px;scrollbar-width:thin;scrollbar-color:#8f7a50 transparent}
.db-dh{display:flex;gap:10px;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(90,31,16,.25)}
.db-dh b{display:block;font:700 16px/1.1 Georgia,serif;color:var(--db-ink2)}.db-dh small{font:italic 12px Georgia,serif;color:var(--db-soft)}
.db-txt{font-size:15px;line-height:1.42;word-break:break-word;white-space:pre-wrap}
.db-txt::first-letter{font-size:1.9em;line-height:1;color:var(--db-ink2);font-weight:700}
.db-more{border:0;background:none;color:var(--db-ink2);font:italic 13px Georgia,serif;text-decoration:underline;cursor:pointer;padding:2px 0}
.db-pics{display:flex;flex-wrap:wrap;gap:10px;margin:12px 2px 6px}
.db-pol{width:96px;padding:5px 5px 16px;background:#fbf6e8;box-shadow:0 2px 4px rgba(0,0,0,.35);cursor:zoom-in;border:0;transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
.db-pol img{display:block;width:86px;height:70px;object-fit:cover;background:#bbb}
.db-pol:hover{transform:rotate(0deg) scale(1.12)!important;z-index:2}
.db-reply{margin:10px 0 4px;padding:6px 10px;border-left:3px solid #8b8478;color:#5d5850;font-style:italic;font-size:14px;background:rgba(255,255,255,.12)}
.db-reply i{font-style:normal;font-weight:700;color:#4b4740}
.db-tools{display:flex;gap:8px;align-items:center;margin-top:8px}
.db-pin{border:0;cursor:pointer;display:inline-flex;align-items:center;gap:5px;background:none;color:var(--db-ink2);font:12px Georgia,serif;padding:0;transition:transform .15s}
.db-pin:hover{transform:scale(1.06)}
.db-pin i{width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d8403a,#8e0d07 60%,#5a0400);box-shadow:0 1px 1px rgba(0,0,0,.5);opacity:.45}.db-pin.on i{opacity:1}
.db-backbtn{display:none;border:0;background:none;color:var(--db-ink2);font:13px Georgia,serif;cursor:pointer;padding:0 0 6px}
html.db-narrow .db-backbtn{display:block}
.db-cover{position:absolute;left:50%;top:0;width:50%;height:100%;transform-origin:0 50%;transform-style:preserve-3d;z-index:5;pointer-events:none;animation:db-swing .62s cubic-bezier(.34,1.42,.6,1) .22s both,db-fade-out .14s linear .86s both}
html.db-narrow .db-cover{left:0;width:100%}
.db-cover>div{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:2px 6px 6px 2px}
.db-cv-f{background:var(--db-leather) radial-gradient(ellipse at 40% 35%,rgba(255,220,170,.18),transparent 60%);box-shadow:inset 0 0 0 3px #3a240f,inset 0 0 0 6px rgba(214,171,74,.55),inset 0 0 0 8px #3a240f,inset 10px 0 18px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--db-gold);font:700 26px/1.2 Georgia,serif;text-shadow:0 1px 0 #2a1708,0 -1px 0 rgba(255,230,160,.35);letter-spacing:.06em;font-variant:small-caps}
.db-cv-f small{font:italic 14px Georgia,serif;letter-spacing:.02em;font-variant:normal;opacity:.85;margin-top:6px}
.db-cv-f em{font-style:normal;font-size:40px;margin-bottom:8px}
.db-cv-b{transform:rotateY(180deg);background:#6a4a2a linear-gradient(90deg,#b39a6a,#d8c8a0 30%);box-shadow:inset 0 0 0 1px var(--db-edge)}
#devbook-book.db-shut .db-cover{animation:db-unswing .3s cubic-bezier(.5,0,.75,0) both}
.db-leaf{position:absolute;top:7px;bottom:7px;width:calc(50% - 7px);z-index:4;pointer-events:none;background:var(--db-paper) linear-gradient(90deg,rgba(80,55,20,.25),transparent 40%);transform-style:preserve-3d;backface-visibility:visible}
.db-leaf.fwd{left:50%;transform-origin:0 50%;animation:db-flipf .45s cubic-bezier(.45,.05,.3,1) both}
.db-leaf.back{left:7px;transform-origin:100% 50%;animation:db-flipb .45s cubic-bezier(.45,.05,.3,1) both}
html.db-narrow .db-leaf{left:7px;width:calc(100% - 14px)}
.db-clasp{position:absolute;right:-16px;top:50%;width:30px;height:46px;margin-top:-23px;border:0;padding:0;cursor:pointer;z-index:6;background:none;transition:transform .15s cubic-bezier(.34,1.56,.64,1)}
.db-clasp:hover{transform:scale(1.12) rotate(-4deg)}.db-clasp svg{width:100%;height:100%;filter:drop-shadow(1px 2px 0 rgba(0,0,0,.5))}
.db-x{position:absolute;right:6px;top:-30px;border:0;cursor:pointer;background:linear-gradient(#5a5040,#382f24);box-shadow:inset 0 0 0 1px #17130e,inset 1px 1px 0 #75674f;color:#ff981f;font:bold 13px/22px 'RuneScape UF',Tahoma,sans-serif;text-shadow:1px 1px 0 #000;padding:0 10px;border-radius:3px}
#db-lb{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);cursor:zoom-out;animation:db-fade .2s both}
#db-lb img{max-width:88vw;max-height:84vh;padding:10px 10px 34px;background:#fbf6e8;box-shadow:0 10px 40px rgba(0,0,0,.6);animation:db-lbin .35s cubic-bezier(.34,1.5,.64,1) both}
@keyframes db-fade{from{opacity:0}to{opacity:1}}
@keyframes db-fade-out{from{opacity:1}to{opacity:0}}
@keyframes db-rise{from{transform:translateY(38%) scale(.22);opacity:0}55%{opacity:1}to{transform:none;opacity:1}}
@keyframes db-fall{from{transform:none;opacity:1}to{transform:translateY(34%) scale(.25);opacity:0}}
@keyframes db-swing{from{transform:rotateY(0)}to{transform:rotateY(-180deg)}}
@keyframes db-unswing{from{transform:rotateY(-180deg);opacity:1}to{transform:rotateY(0);opacity:1}}
@keyframes db-settle{0%{transform:none}35%{transform:translateY(4px) scaleY(.985)}65%{transform:translateY(-2px) scaleY(1.006)}100%{transform:none}}
@keyframes db-flipf{0%{transform:rotateY(0);opacity:1}85%{opacity:1}100%{transform:rotateY(-180deg);opacity:0}}
@keyframes db-flipb{0%{transform:rotateY(0);opacity:1}85%{opacity:1}100%{transform:rotateY(180deg);opacity:0}}
@keyframes db-lbin{from{transform:scale(.4) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){#db-book,.db-spread,.db-l,.db-cover,.db-leaf,.db-in,#devbook-tab .db-glow{animation-duration:.01s!important;animation-delay:0s!important}}
</style>`;
