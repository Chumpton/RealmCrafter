// creator 2026-10-09: the gold-and-iron kit on every game window and on the enemy nameplates, as the "3rd Person" interface style only.
// Side-effect module (ui.js imports it beside winmove.js). Every rule is scoped under body:has(#h4-root.kit): ui.js puts class "kit" on #h4-root
// when kitOn(player) (O → Options → Display → Interface style = 3rd Person). With the OSRS style nothing here matches and the HUD is untouched.
// Windows: a clean nine-slice composed at runtime from the newest sheet's menu art (UIK['ctx-menu']) worn as border-image, filigree corners from
// UIK['fil-corner-*'] as background layers (they stay put while the window scrolls; no ::before is taken), slate interior, gold-thumb sliders, iron buttons.
// Nameplates (lib/plates-hud.js .pl rows): np-empty-a frame, np-empty-b for elites (the skull ones), np-mini for minor critters (level <= 2),
// live fill-red HP inside the bar, level in the square, live %, and aggro-yellow / aggro-red round your selected target. Never throws.
import { UIK } from '../../scripts/lib/data/ui-kit.js';
const K = 'body:has(#h4-root.kit)';
const WINS = '[data-modal],#edp-win,#os-settings,#osp,#keybinds,#kp,#light-editor,#travel-panel,#wardrobe,#den-systems,#vote-ledger,#devbook-book,#chess-panel,#den-settings';
const W = `${K} :is(${WINS}):not(.cs)`; // .cs = the character sheet, drawn on its own art (2026-10-09)
const u = (n) => `url("${UIK[n]}")`;
const INK = '#0b0806', CREAM = '#f2e6cf', GOLD = '#d9ad5e';
const OUT = `1px 1px 0 ${INK},-1px 1px 0 ${INK},1px -1px 0 ${INK},-1px -1px 0 ${INK},0 2px 2px #000`;
// nameplate geometry at draw size (art px / 2): [frame w, h, fill left, top, width, height, square left, top, w, h]
const NP = { a: [190, 36.5, 38, 14, 138, 14.5, 4, 3, 27, 30], b: [190, 40, 38, 16, 138, 14, 7, 9, 23, 25], m: [136, 18.5, 8, 4.5, 117, 9.5] };
const BW = 44; // plates-hud's bar width: its fill <i> carries width in px of 44
const npCss = (k, art) => { const [w, h, fl, ft, fw, fh] = NP[k]; return `
${K} .pl:has(.kit-lv[data-k=${k}]) .bar{width:${w}px;height:${h}px;background:${u(art)} 0 0/100% 100% no-repeat}
${K} .pl:has(.kit-lv[data-k=${k}]) .bar::before{left:${fl}px;top:${ft}px;width:${fw}px;height:${fh}px}
${K} .pl:has(.kit-lv[data-k=${k}]) .bar>i{left:${fl}px;top:${ft}px;height:${fh}px;transform:scaleX(${(fw / BW).toFixed(4)})}
${K} .pl:has(.kit-lv[data-k=${k}]) .bar>.tl{left:${fl - 6}px;top:${ft - 5}px;transform:scale(${((fw + 12) / (BW + 12)).toFixed(3)},${((fh + 10) / 18).toFixed(3)})}
${K} .pl:has(.kit-lv[data-k=${k}]) .kit-pct{left:${fl}px;top:${ft}px;width:${fw}px;height:${fh}px;line-height:${fh}px}`; };
const sq = (k) => { const [, , , , , , l, t, w, h] = NP[k]; return `${K} .kit-lv[data-k=${k}]{left:${l}px;top:${t}px;width:${w}px;height:${h}px;line-height:${h}px}`; };
const CSS = `
${W}{border-style:solid!important;border-width:14px!important;border-color:#8a6a32!important;border-radius:0!important;
  border-image:var(--kit-ns) 32 / 14px / 0 stretch!important;
  background:var(--kit-fil-tl,none) top left/30px 30px no-repeat,var(--kit-fil-tr,none) top right/30px 30px no-repeat,var(--kit-fil-bl,none) bottom left/30px 28px no-repeat,var(--kit-fil-br,none) bottom right/30px 28px no-repeat,
    radial-gradient(120% 90% at 50% 0%,#2a3038 0%,#1a1e24 60%,#121519 100%)!important;
  background-clip:padding-box!important;background-origin:padding-box!important;box-shadow:0 10px 28px #000a!important;color:${CREAM};image-rendering:auto}
${W} :is(h1,h2,h3,h4,.title,[class*=title]){font-family:'Cinzel',Georgia,'Times New Roman',serif;color:${CREAM};text-shadow:${OUT}}
${W} button{font-family:'Cinzel',Georgia,'Times New Roman',serif;color:${CREAM};background:linear-gradient(#3b4048,#23272d 55%,#1a1d22);border:1px solid ${GOLD}!important;border-radius:3px;box-shadow:inset 0 1px 0 #ffffff1c,0 2px 0 #000a;text-shadow:0 1px 0 #000}
${W} button:hover{background:linear-gradient(#4a5059,#2c3138 55%,#202329);color:#fff4dc}
${W} button:active{transform:translateY(1px);box-shadow:inset 0 2px 3px #000a}
${W} input[type=range]{-webkit-appearance:none;appearance:none;height:14px;background:transparent;accent-color:${GOLD}}
${W} input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:linear-gradient(#08090b,#1d2025);border:1px solid #8a6a32;box-shadow:inset 0 1px 2px #000,0 0 0 1px #000}
${W} input[type=range]::-moz-range-track{height:8px;border-radius:4px;background:linear-gradient(#08090b,#1d2025);border:1px solid #8a6a32}
${W} input[type=range]::-moz-range-progress{height:8px;border-radius:4px;background:${u('fill-gold')} 0 0/100% 100%}
${W} input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-4px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff1c2,#e3b85f 45%,#8a5f22 100%);border:1px solid #2a1a08;box-shadow:0 1px 2px #000}
${W} input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff1c2,#e3b85f 45%,#8a5f22 100%);border:1px solid #2a1a08}
${W}>.wn-drag,${W}>.wn-grip{z-index:2147483000!important}
${K} .pl{font:700 14px/16px 'Cinzel',Georgia,'Times New Roman',serif}
${K} .pl .nm{color:${CREAM};text-shadow:${OUT}}
${K} .pl .lv{text-shadow:${OUT}}
${K} .pl:has(.bar):has(.kit-lv:not([data-k=m])) .lv{display:none}
${K} .pl .bar{position:relative;margin-top:1px;box-shadow:none;image-rendering:auto;background-color:transparent}
${K} .pl .bar::before{content:'';position:absolute;background:linear-gradient(#0b0d10,#1b1f25)}
${K} .pl .bar>i{position:absolute;display:block;transform-origin:0 0;background:${u('fill-red')} 0 0/100% 100%;box-shadow:inset 0 1px 0 #ffffff30}
${K} .pl .bar>.tl{transform-origin:0 0}
${K} .kit-lv{position:absolute;display:none;text-align:center;font:700 14px 'Cinzel',Georgia,serif;text-shadow:${OUT};pointer-events:none}
${K} .bar>.kit-lv:not([data-k=m]){display:block}
${K} .kit-pct{position:absolute;display:block;text-align:center;font:700 10px 'Cinzel',Georgia,serif;color:${CREAM};text-shadow:${OUT};pointer-events:none}
${K} .kit-ag{position:absolute;left:30px;right:-4px;top:5px;bottom:3px;pointer-events:none;background:${u('aggro-yellow')} 0 0/100% 100% no-repeat}
${K} .kit-ag[data-c=r]{background-image:${u('aggro-red')};animation:kitAg 1.1s ease-in-out infinite}
${K} .pl:has(.kit-lv[data-k=m]) .kit-ag{left:-4px;top:-3px;bottom:-3px}
@keyframes kitAg{50%{filter:brightness(1.35) drop-shadow(0 0 3px #ff3a1a)}}
body:not(:has(#h4-root.kit)) :is(.kit-lv,.kit-pct,.kit-ag){display:none}
${npCss('a', 'np-empty-a')}${npCss('b', 'np-empty-b')}${npCss('m', 'np-mini')}${sq('a')}${sq('b')}`;

const crop = (img, parts, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); for (const [sx, sy, sw, sh, dx, dy, dw, dh] of parts) g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh); return `url("${c.toDataURL('image/png')}")`; };
const load = (src, cb) => { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => { try { cb(img); } catch (e) {} }; img.src = src; };
function compose() { // design pass 2026-10-09: the newest sheet only. A clean 96x96 nine-slice cut from the right-click menu art (UIK['ctx-menu']:
  // beveled dark-slate rim, thin gold line, filigree corners); its edge strips are taken where no row text sits. Corners: UIK['fil-corner-*'].
  const root = document.documentElement.style;
  load(UIK['ctx-menu'], (im) => {
    const S = 96, C = 32, M = S - 2 * C;
    root.setProperty('--kit-ns', crop(im, [
      [0, 0, C, C, 0, 0, C, C], [286 - C, 0, C, C, S - C, 0, C, C], [0, 372 - C, C, C, 0, S - C, C, C], [286 - C, 372 - C, C, C, S - C, S - C, C, C],
      [140, 0, 90, C, C, 0, M, C], [180, 372 - C, 80, C, C, S - C, M, C], [0, 50, C, 45, 0, C, C, M], [286 - C, 190, C, 40, S - C, C, C, M],
      [140, 190, 60, 30, C, C, M, M]], S, S));
  });
  for (const k of ['tl', 'tr', 'bl', 'br']) root.setProperty(`--kit-fil-${k}`, `url("${UIK['fil-corner-' + k]}")`);
}
// the plates: plates-hud draws them each render; this dresses each one (level square, live %, aggro ring) right after, before paint
function dress() {
  const on = !!document.querySelector('#h4-root.kit');
  const plates = document.querySelectorAll('.pl[id^="pl-"]');
  if (!on) { for (const el of document.querySelectorAll('.kit-lv,.kit-pct,.kit-ag')) el.remove(); return; }
  const wtf = document.querySelector('.wtf[id^="wtf-"]'), tid = wtf?.id.slice(4) ?? '', foe = !!wtf?.classList.contains('foe');
  for (const pl of plates) {
    const lvEl = pl.querySelector('.lv'), m = /(\d+)/.exec(lvEl?.textContent ?? ''), lvl = m ? +m[1] : 0;
    const k = pl.innerHTML.includes('\u2620') || lvl >= 28 ? 'b' : lvl && lvl <= 2 ? 'm' : 'a';
    const bar = pl.querySelector(':scope>.bar');
    if (!bar) { for (const x of pl.querySelectorAll(':scope>.kit-lv,:scope>.kit-pct,:scope>.kit-ag')) x.remove(); continue; } // a name-only plate (Bruni) wears nothing: re-adding a square here each pass looped the observer forever
    for (const x of pl.querySelectorAll(':scope>.kit-lv')) x.remove(); // the level square lives in the bar's frame
    let lv = bar.querySelector(':scope>.kit-lv');
    if (!lv) { lv = document.createElement('b'); lv.className = 'kit-lv'; (bar ?? pl).appendChild(lv); }
    if (lv.dataset.k !== k) lv.dataset.k = k;
    const t = lvl ? String(lvl) : ''; if (lv.textContent !== t) lv.textContent = t;
    const col = lvEl?.style.color || '#ffd100'; if (lv.dataset.col !== col) { lv.dataset.col = col; lv.style.color = col; } // compare what we wrote, never the browser's normalized readback
    if (!bar) continue;
    const fill = parseFloat(bar.querySelector(':scope>i')?.style.width ?? '0') || 0, pct = `${Math.round(100 * fill / BW)}%`;
    let pc = bar.querySelector(':scope>.kit-pct');
    if (k !== 'm') { if (!pc) { pc = document.createElement('b'); pc.className = 'kit-pct'; bar.appendChild(pc); } if (pc.textContent !== pct) pc.textContent = pct; } else if (pc) pc.remove();
    const mine = tid && (tid === pl.id.slice(3) || tid.startsWith(pl.id.slice(3) + '-h'));
    let ag = bar.querySelector(':scope>.kit-ag');
    if (mine) { if (!ag) { ag = document.createElement('i'); ag.className = 'kit-ag'; bar.appendChild(ag); } const c = foe || bar.querySelector('.tl') ? 'r' : 'y'; if (ag.dataset.c !== c) ag.dataset.c = c; }
    else if (ag) ag.remove();
  }
}
function install() {
  if (typeof document === 'undefined' || document.getElementById('kit-skin')) return;
  const st = document.createElement('style'); st.id = 'kit-skin'; st.textContent = CSS; document.head.appendChild(st);
  compose();
  // dress() writes into the plates, so the observer is off while it runs: its own writes never wake it again (2026-10-10 fix: the HUD frame froze in a mutation loop)
  const OPTS = { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] };
  let mo = null, queued = false;
  const run = () => { mo.disconnect(); try { dress(); } catch (e) {} mo.takeRecords(); mo.observe(document.body, OPTS); };
  const kick = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; run(); }); };
  mo = new MutationObserver(kick); mo.observe(document.body, OPTS);
  run();
}
try { if (typeof document !== 'undefined') { if (document.body) install(); else document.addEventListener('DOMContentLoaded', install, { once: true }); } } catch (e) {}
export const kitSkinReady = true;

// ── appended 2026-10-09 (windows lane): kit close button, kit font on every window, the docked Shader Editor in the gold kit ──
import { UIK as UIK2 } from '../../scripts/lib/data/ui-kit.js';
(() => { try {
  if (typeof document === 'undefined') return;
  const K = 'body:has(#h4-root.kit)', u = (k) => (UIK2[k] ? `url(${UIK2[k]})` : 'none');
  const STROKE = '-webkit-text-stroke:.35px #000;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000';
  const W = ['[data-modal]', '#edp-win', '#os-settings', '#osp', '#keybinds', '#kp', '#light-editor', '#travel-panel', '#wardrobe', '#den-systems', '#vote-ledger', '#devbook-book', '#chess-panel', '#hud-player', '#jev-desk', '#huginn-map', '#cbk'];
  const sel = (suf) => W.map((w) => `${K} ${w}${suf}`).join(',');
  const css = `${sel('')}{font-family:'Cinzel',Georgia,'Times New Roman',serif!important;color:#f2e6cf}
${sel(' :is(div,span,label,p,li,td,th,button,a,b,i,small)')}{font-family:'Cinzel',Georgia,'Times New Roman',serif!important;${STROKE}}
${sel(' :is(h1,h2,h3,h4,.h,.title,.ttl)')}{color:#e8c46a!important}
${K} .wn-x{display:block!important;position:absolute;top:-4px;right:8px;width:22px;height:26px;padding:0;border:0;background:${u('btn-x-red')} center/contain no-repeat!important;cursor:pointer;z-index:2147483001;-webkit-text-stroke:0;text-shadow:none}
${K} .wn-x:hover{filter:brightness(1.25)}${K} .wn-ownx{visibility:hidden!important}
${K} .wn-drag{height:18px!important;line-height:18px!important;background:linear-gradient(#3a2f1f,#1d170f)!important;color:#e8c46a!important;font:13px/18px 'Cinzel',Georgia,serif!important;border-bottom:1px solid #8a6a32!important;${STROKE}}
${K} #osch{max-width:500px!important;box-sizing:border-box!important}${K} #osch *{max-width:100%;box-sizing:border-box}${K} #osch .ktabs{display:flex!important;flex-wrap:nowrap!important;overflow:hidden!important;max-width:100%}${K} #osch .ktabs>*{flex:1 1 0!important;min-width:0!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${K} #edp-win{background:#17140fef!important;border:14px solid #8a6a32!important;border-image:var(--kit-ns) 32 fill / 14px stretch!important;border-radius:0!important;padding:6px 8px!important;box-shadow:0 8px 30px #000a!important}
${K} #edp-win .edp-tb span{color:#e8c46a!important;font-size:15px!important;letter-spacing:.04em}
${K} #edp-win .edp-tb{padding-right:26px}
${K} #edp .f,${K} #edp .note{font-size:13px!important;color:#f2e6cf!important}${K} #edp .h{font-size:13px!important;color:#e8c46a!important}
${K} #edp .f .v{color:#f2e6cf!important}
${K} #edp :is(.pre,.bar) button{background:#2a2218!important;border:1px solid #8a6a32!important;color:#f2e6cf!important;font-size:13px!important}
${K} #edp :is(.pre,.bar) button:is(.on,.gold){border-color:#e8c46a!important;color:#e8c46a!important}
${K} #edp input[type=range]{-webkit-appearance:none;appearance:none;height:16px;background:${u('sl-track-a')} center/100% 14px no-repeat;accent-color:auto}
${K} #edp input[type=range]::-webkit-slider-runnable-track{background:transparent;height:16px}
${K} #edp input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-3px;border:0;background:${u('sl-knob')} center/contain no-repeat}
${K} #edp input[type=range]::-moz-range-track{background:transparent}
${K} #edp input[type=range]::-moz-range-thumb{width:22px;height:22px;border:0;background:${u('sl-knob')} center/contain no-repeat}`;
  const put = () => { let st = document.getElementById('kit-win2'); if (!st) { st = document.createElement('style'); st.id = 'kit-win2'; (document.head || document.documentElement).appendChild(st); } st.textContent = css; };
  put();
} catch (e) {} })();

// ── kit design pass 2026-10-09: no gryphon endcaps in kit mode; one bold serif with a 1px black stroke on every kit HUD text; text never wider than its box ──
(() => { try {
  if (typeof document === 'undefined') return;
  const K = 'body:has(#h4-root.kit)', F = "'Cinzel',Georgia,'Times New Roman',serif";
  const SK = 'text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000';
  const HUD = ['#nh-dock', '#hud-micro', '#osch', '#cm-root', '#hud-player', '.wtk', '.pl'];
  const all = (suf) => HUD.map((h) => `${K} ${h}${suf}`).join(',');
  const css = `${K} #nh-dock .osg,${K} #nh-dock::before,${K} #nh-dock::after{display:none!important}
${all('')},${all(' *')}{font-family:${F}!important;font-weight:700!important}
${all(' :is(span,b,i,small,label,div):not(:has(*))')}{${SK}}
${K} :is(#nh-dock,#hud-micro,#hud-player,.wtk,#cm-root) :is(span,b,label,small):not(:has(*)){max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
${K} #cm-root .cm-row{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px}`;
  const go = () => { if (document.getElementById('kit-design')) return; const st = document.createElement('style'); st.id = 'kit-design'; st.textContent = css; document.head.appendChild(st); };
  if (document.head) go(); else document.addEventListener('DOMContentLoaded', go, { once: true });
} catch (e) {} })();

// ── WoW type pass 2026-10-09 (creator: "dont outline text, use WoW's font, chat display, etc for all text in 3rd person option") ──
// Headers and buttons: Marcellus (open-licence flared serif, the nearest free cut to WoW's Friz Quadrata), gold #ffd100 headers, white body.
// Chat, numbers, hotkeys: Archivo Narrow (the free twin of WoW's Arial Narrow chat face). No outline or stroke anywhere: one soft 1px drop
// shadow like WoW's. Chat sits straight on the world like WoW's: no framed box, a faint dark wash, channel colours, small text tabs.
// Only under #h4-root.kit: the OSRS style is untouched.
(() => { try {
  if (typeof document === 'undefined') return;
  const K = 'html body:has(#h4-root.kit)', SH = 'text-shadow:1px 1px 1px rgba(0,0,0,.9)!important;-webkit-text-stroke:0!important';
  const FRIZ = "'WowFriz','Marcellus',Georgia,serif", NARROW = "'WowNarrow','Archivo Narrow','Arial Narrow',Arial,sans-serif";
  const ALL = '[data-modal],#edp-win,#os-settings,#osp,#keybinds,#kp,#light-editor,#travel-panel,#wardrobe,#den-systems,#vote-ledger,#devbook-book,#chess-panel,#hud-player,#jev-desk,#huginn-map,#cbk,#adm-menu,#adm-btn,#nh-dock,#hud-micro,#osch,#cm-root,#osmm,.wtk,.pl,.wn-drag,.kctx';
  const css = `@font-face{font-family:'WowFriz';src:url(/cdn/value.2f6fa616f76102d81c4a935c3a8cd547a8db9de679ad9fda9cfd42f16e7f0743.ttf) format('truetype');font-display:swap}
@font-face{font-family:'WowNarrow';font-weight:400 600;src:url(/cdn/value.6ed38c4fac0f1b7062f4798f3ce70a6d2b682dc37ddcee3d0e63bd668d26a39a.ttf) format('truetype');font-display:swap}
@font-face{font-family:'WowNarrow';font-weight:700 900;src:url(/cdn/value.ae9051970e75e3e260f15d103bb7642271bdb6b36b78e7604d588582cea7948e.ttf) format('truetype');font-display:swap}
${K} :is(${ALL}),${K} :is(${ALL}) *{font-family:${FRIZ}!important;font-weight:400!important;letter-spacing:.02em!important;${SH};-webkit-font-smoothing:antialiased!important;-moz-osx-font-smoothing:grayscale!important;text-rendering:optimizeLegibility!important}
${K} :is(${ALL}) :is(h1,h2,h3,h4,.h,.title,.ttl,.hd,.sec,.cat,legend,summary),${K} .wn-drag,${K} #edp-win .edp-tb span{color:#ffd100!important;letter-spacing:.05em!important}
${K} :is(${ALL}) :is(div,span,label,p,li,td,th,button,a,small):not(:has(*)){color:#ffffff}
${K} :is(${ALL}) button,${K} :is(${ALL}) button *{color:#ffd100!important}
${K} #adm-menu button,${K} #adm-menu button :not(i){color:#ffffff!important}${K} #adm-menu button i{color:#ffd100!important}
${K} :is(${ALL}) :is(input,textarea,select,.v,.num,[class*=val]),${K} .kit-pct,${K} .kit-lv,${K} .pl .lv{font-family:${NARROW}!important;font-weight:700!important;color:#ffffff!important}
${K} :is(kbd,.kbd,.key,.hk,.hotkey,[data-hk],#nh-dock .kb,#nh-dock small){font-family:${NARROW}!important;font-weight:700!important;font-size:12px!important;color:#ffffff!important;letter-spacing:0!important}
${K} :is(#edp-win,#os-settings,#adm-menu,#kp,#den-systems,#travel-panel,#light-editor,#keybinds) *{font-size:max(13px,1em)}
${K} #osch.kch,${K} #osch.kch *{font-family:${NARROW}!important;font-weight:600!important;letter-spacing:0!important}
${K} #osch.kch .kpa{background:url('${UIK['chat-frame']}') center/100% 100% no-repeat!important;top:26px!important;bottom:40px!important}
${K} #osch.kch .log{z-index:1;left:22px!important;top:16px!important;right:44px!important;bottom:16px!important}
${K} #osch.kch .log,${K} #osch.kch .kl{font-size:15px!important;line-height:19px!important;color:#e6e6e6!important;-webkit-text-stroke:0!important;text-shadow:1px 1px 2px rgba(0,0,0,.95),0 0 1px #000,0 -1px 0 rgba(255,255,255,.06)!important}
${K} #osch.kch .kl b{color:#e8b923!important;font-weight:700!important}
${K} #osch.kch .ktabs{left:10px!important;right:10px!important;top:0!important;height:26px!important;display:flex!important;gap:6px!important;align-items:flex-end!important;padding:0 8px!important;overflow:visible!important}
${K} #osch.kch .ktabs>*{flex:0 1 auto!important;min-width:0!important}
${K} #osch.kch .ktb{height:22px!important;padding:0 9px!important;background:linear-gradient(#2a2e34,#16191d)!important;border:1px solid #4a4436!important;border-bottom:0!important;border-radius:4px 4px 0 0!important;font-size:13px!important;line-height:21px!important;color:#9a9eaa!important;-webkit-text-stroke:0!important;text-shadow:1px 1px 2px #000!important;white-space:nowrap}
${K} #osch.kch .ktb.on{height:25px!important;background:linear-gradient(#3a3324,#1d1a14)!important;border-color:#d8b25a!important;color:#f5e2b3!important;box-shadow:inset 0 1px 0 rgba(255,230,160,.35),0 3px 6px -2px rgba(232,185,35,.55)!important}
${K} #osch.kch .ktb.krep{margin-left:auto!important;color:#e07060!important}
${K} #osch.kch .sc{z-index:1;top:16px!important;bottom:16px!important;right:16px!important;opacity:.8}${K} #osch.kch:hover .sc{opacity:1}
${K} #osch.kch .kin{left:6px!important;right:6px!important;bottom:2px!important;height:34px!important;margin-top:4px;background:linear-gradient(#3a3226,#241e16)!important;border:0!important;border-radius:4px!important;box-shadow:inset 0 0 0 1px #8a6a32,inset 0 0 0 2px #1a140c!important} /* 2026-10-09 campton: no lock icon */
${K} #osch.kch .kin span{left:5px!important;right:12px!important;top:6px!important;bottom:6px!important;padding:0 10px!important;background:rgba(8,10,12,.85)!important;border:1px solid #3a3224!important;border-radius:3px!important;box-shadow:inset 0 2px 4px rgba(0,0,0,.8)!important;font-size:15px!important;line-height:20px!important;color:#e6e6e6!important;-webkit-text-stroke:0!important;text-shadow:1px 1px 2px rgba(0,0,0,.95)!important}
${K} #osch.kch .kin span b{color:#e8b923!important}`;
  const put = () => { let st = document.getElementById('kit-wow'); if (!st) { st = document.createElement('style'); st.id = 'kit-wow'; } st.textContent = css; document.head.appendChild(st); };
  const go = () => { put(); setTimeout(put, 1500); setTimeout(put, 5000); }; // re-appended so it stays the last sheet after the other kit sheets mount
  if (document.head) go(); else document.addEventListener('DOMContentLoaded', go, { once: true });
} catch (e) {} })();

// creator 2026-10-09 "remove the brown box from background": the 3rd Person action bar stands on its own two framed rows, no plate behind
(() => { try { if (typeof document === 'undefined') return; const K = 'html body:has(#h4-root.kit)';
  const css = `${K} #nh-dock{background:none!important;border:0!important;box-shadow:none!important;border-image:none!important}${K} #nh-dock::before,${K} #nh-dock::after{display:none!important}`;
  const put = () => { let st = document.getElementById('kit-nobox'); if (!st) { st = document.createElement('style'); st.id = 'kit-nobox'; } st.textContent = css; document.head.appendChild(st); };
  if (document.head) { put(); setTimeout(put, 1500); } else document.addEventListener('DOMContentLoaded', put, { once: true });
} catch (e) {} })();
