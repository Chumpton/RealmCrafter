// Dev Team Tracker, lane 3: JEV's marks on the book's pages (OSRS parchment, red-brown ink).
// JEV_CSS                          style for everything below (add once beside DEVBOOK_CSS)
// JEV_FACE                         a tiny wisp face (inline svg, 12 px), for JEV's reaction chip
// jevChip(emoji, label)            a reaction chip face mark for when react.who includes 'JEV'; hasJev(react)
// jevMarks(entry)                  gold ribbon (milestone) + wax seal (pinned) + kind tag, absolutely placed in the entry box
// jevMargin(entry) -> 'style=...'  the mood tint on the entry's left margin ('' when untagged)
// jevPickRibbon(entry)             the bookmark ribbon for the day's chapter heading (entry = the jevPick winner, or null -> '')
// jevKind(entry)                   the small ink tag alone
import { JEVB, decor } from '../../scripts/lib/devbook-jev.js';
export { jevPick, floatPinned, isPinned } from '../../scripts/lib/devbook-jev.js';

export const JEV_FACE = `<svg class="jev-face" viewBox="0 0 12 14" width="12" height="14" aria-label="JEV"><defs><radialGradient id="jvg" cx="50%" cy="65%" r="60%"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffb347"/><stop offset="1" stop-color="#e2571e"/></radialGradient></defs><path d="M6 .6C7.4 3 10.8 5.2 10.8 8.9A4.8 4.8 0 0 1 1.2 8.9C1.2 6.6 2.7 5.6 3.6 4.1c.3 1.3 1 1.9 1.7 2C4.9 4.3 5.2 2.2 6 .6z" fill="url(#jvg)" stroke="#5a1e0c" stroke-width=".5"/><circle cx="4.5" cy="9.3" r=".85" fill="#2a1408"/><circle cx="7.5" cy="9.3" r=".85" fill="#2a1408"/><circle cx="4.75" cy="9.0" r=".28" fill="#fff"/><circle cx="7.75" cy="9.0" r=".28" fill="#fff"/></svg>`;
export const hasJev = (react) => Array.isArray(react?.who) && react.who.includes(JEVB.reactor);
export const jevChip = (emoji, label = 'JEV reacted') => `<span class="jev-chipmark" title="${label}${emoji ? ' ' + emoji : ''}">${JEV_FACE}</span>`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function jevKind(e) { const d = decor(e); return d.kind ? `<span class="jev-kind jev-k-${d.kind}" title="JEV read it as: ${esc(d.kind)} · ${esc(e.jev.weight)} · ${esc(d.mood)}">${esc(d.kind)}</span>` : ''; }
export function jevMarks(e) {
  const d = decor(e);
  return (d.ribbon ? `<span class="jev-ribbon" title="Milestone (JEV)"><b>&#9733;</b></span>` : '')
    + (d.seal ? `<span class="jev-seal" title="Sealed: a decision to keep">J</span>` : '')
    + jevKind(e);
}
export function jevRibbon(e) { return decor(e).ribbon ? `<span class="jev-ribbon" title="Milestone (JEV)"><b>&#9733;</b></span>` : ''; }
export function jevMargin(e) { const t = decor(e).tint; return t ? `style="--jev-tint:${t}" data-mood="${esc(e.jev.mood)}"` : ''; }
export function jevPickRibbon(e) { return e ? `<span class="jev-pick" title="JEV's pick of the day: ${esc(String(e.text ?? '').slice(0, 80))}"><i>JEV's pick</i>${JEV_FACE}</span>` : ''; }

export const JEV_CSS = `
.jev-face{display:inline-block;vertical-align:-2px;filter:drop-shadow(0 0 2px rgba(255,170,60,.7));animation:jevBob 1.8s ease-in-out infinite}
@keyframes jevBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
.jev-chipmark{display:inline-flex;margin-left:2px}
[data-mood]{position:relative;border-left:4px solid var(--jev-tint);box-shadow:inset 10px 0 12px -10px var(--jev-tint);background-image:linear-gradient(90deg,color-mix(in srgb,var(--jev-tint) 16%,transparent),transparent 22%)}
.jev-ribbon{position:absolute;top:-3px;right:10px;width:16px;height:26px;background:linear-gradient(90deg,#9a6b12,#f3d36b 45%,#b88a1e);clip-path:polygon(0 0,100% 0,100% 100%,50% 76%,0 100%);box-shadow:0 1px 0 #5a3a08;display:flex;justify-content:center;padding-top:3px;animation:jevDrop .5s cubic-bezier(.34,1.56,.64,1) both}
.jev-ribbon b{font-size:9px;color:#fff7c8;text-shadow:0 0 3px #7a4f00;line-height:1}
@keyframes jevDrop{from{transform:translateY(-14px) scaleY(.4);opacity:0}to{transform:none;opacity:1}}
.jev-seal{position:absolute;top:4px;right:30px;width:20px;height:20px;border-radius:50% 46% 52% 48%;background:radial-gradient(circle at 38% 34%,#e0584a,#a3241a 55%,#6a120c);box-shadow:0 1px 2px rgba(40,10,0,.6),inset 0 0 0 2px rgba(120,20,12,.6);color:#f4c9a8;font:700 11px/20px Georgia,serif;text-align:center;text-shadow:0 -1px 0 #5a0d07;transform:rotate(-12deg);animation:jevStamp .45s cubic-bezier(.34,1.56,.64,1) both}
@keyframes jevStamp{0%{transform:rotate(-12deg) scale(2);opacity:0}70%{transform:rotate(-12deg) scale(.9);opacity:1}100%{transform:rotate(-12deg) scale(1)}}
.jev-kind{display:inline-block;margin-left:6px;padding:0 4px;border:1px solid #7a3b1d;border-radius:2px;color:#7a3b1d;font:italic 10px/14px Georgia,serif;letter-spacing:.3px;text-transform:lowercase;background:rgba(122,59,29,.07)}
.jev-k-bug{color:#8e2f22;border-color:#8e2f22}.jev-k-decision{color:#4a2a10;border-color:#4a2a10;font-weight:700}.jev-k-feature{color:#5a4a12;border-color:#5a4a12}
.jev-pick{position:absolute;top:-4px;right:14px;display:flex;flex-direction:column;align-items:center;gap:1px;width:22px;padding:3px 0 10px;background:linear-gradient(90deg,#6e1a12,#a33a26 50%,#6e1a12);clip-path:polygon(0 0,100% 0,100% 100%,50% 84%,0 100%);box-shadow:0 2px 2px rgba(40,10,0,.4);animation:jevDrop .6s cubic-bezier(.34,1.56,.64,1) both}
.jev-pick i{writing-mode:vertical-rl;font:italic 8px Georgia,serif;color:#f1dfb4;letter-spacing:.5px}
`;
