// 3rd Person (gold kit) skin for the HUD's right-click menu (scripts/lib/menu-hud.js kitMenu: #cm-root > .cm-frame > .cm-row DOM rows).
// Frame = the nine-slice kit-skin.js cuts from UIK['ctx-menu'] (--kit-ns); rows bold serif, 1px black stroke.
// Imported by ui/hud/osrs.js's kit CSS; every rule sits under body:has(#h4-root.kit), so the OSRS look is untouched.
import { UIK } from '../../scripts/lib/data/ui-kit.js';
const K = 'body:has(#h4-root.kit)';
export const ctxMenuCss = `<style>
${K} #cm-root .cm-pixel{border-radius:3px;outline:2px solid #e8c46a;outline-offset:2px;box-shadow:0 0 0 4px #1b1e22,0 0 0 6px #8a6a32,0 0 0 7px #000,0 10px 24px rgba(0,0,0,.6);filter:drop-shadow(0 0 1px #000)}
${K} #cm-root .cm-row{font:700 14px/24px 'Cinzel',Georgia,'Times New Roman',serif;color:#f2e6cf;-webkit-text-stroke:.35px #000;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000;padding:0 12px 0 30px;position:relative}
${K} #cm-root .cm-row::before{content:'';position:absolute;left:10px;top:7px;width:10px;height:10px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#5a5040,#1b1814 70%);box-shadow:0 0 0 1px #b8893c}
${K} #cm-root .cm-row:hover{background:linear-gradient(90deg,rgba(232,196,106,.55),rgba(186,137,80,.25) 70%,transparent)}
${K} #cm-root .cm-row:hover::before{background:radial-gradient(circle at 40% 35%,#fff3c4,#e8c46a 45%,#8a6a32)}
${K} #cm-root .cm-rule{height:12px;background:url('${UIK['fil-rule']}') center/90% 100% no-repeat}
${K} #cm-root .cm-frame{border:14px solid #8a6a32;border-image:var(--kit-ns) 32 / 14px stretch;background:radial-gradient(120% 90% at 50% 0%,#2a3038 0%,#1a1e24 60%,#121519 100%) padding-box}
</style>`;
