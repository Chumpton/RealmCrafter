// OSRS inventory drag (creator 2026-10-06): press and hold an item in the backpack, drag it onto any other slot and let go; the two slots swap (an empty slot just receives it).
// A click without a drag still uses the item (invUse). Page side, delegated once on the document: the HUD re-renders the cells every tick, so nothing is attached to them.
// Server side: the invMove action in scripts/skills-player.js.
let wired = false, d = null, swallow = false;
const slotOf = (el) => { const w = el?.closest?.('#osp-in [data-slot]'); return w ? +w.dataset.slot : -1; };
function css(i) { let st = document.getElementById('osdrag-css'); if (!st) { st = document.createElement('style'); st.id = 'osdrag-css'; document.head.appendChild(st); } st.textContent = i < 0 ? '' : `#osp-in [data-slot="${i}"]>*{opacity:.25}#osp-in [data-slot="${i}"]{outline:1px solid #ff981f}`; }
function end(cancel, e) {
  if (!d) return; const was = d; d = null; css(-1); was.ghost?.remove();
  document.removeEventListener('pointermove', move, true); document.removeEventListener('pointerup', up, true); document.removeEventListener('keydown', key, true);
  if (!was.on) return;
  swallow = true; setTimeout(() => { swallow = false; }, 0); // the click that follows the drop must not use the item
  if (cancel || !e) return;
  const to = slotOf(document.elementFromPoint(e.clientX, e.clientY));
  if (to >= 0 && to !== was.i && typeof sendAction === 'function') sendAction('invMove', { from: was.i, to });
}
function move(e) {
  if (!d) return;
  if (!d.on) {
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return;
    d.on = true; const g = d.src.cloneNode(true); g.removeAttribute('id'); g.removeAttribute('onclick'); g.removeAttribute('oncontextmenu');
    g.style.cssText += ';position:fixed;z-index:100000;pointer-events:none;opacity:.9;margin:0;transform:translate(-50%,-50%) scale(var(--ospk,1.2))'; document.body.appendChild(g); d.ghost = g; css(d.i);
  }
  d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px'; e.preventDefault();
}
const up = (e) => end(false, e);
const key = (e) => { if (e.key === 'Escape') end(true); };
export function installInvDrag() {
  if (wired || typeof document === 'undefined') return; wired = true;
  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const w = e.target?.closest?.('#osp-in [data-slot]'); if (!w) return;
    const src = w.querySelector('[id^="bag-"]'); if (!src || src.title === 'empty') return; // only an item can be picked up
    d = { i: +w.dataset.slot, x: e.clientX, y: e.clientY, src, on: false, ghost: null };
    document.addEventListener('pointermove', move, true); document.addEventListener('pointerup', up, true); document.addEventListener('keydown', key, true);
  }, true);
  document.addEventListener('click', (e) => { if (swallow) { e.stopPropagation(); e.preventDefault(); } }, true);
}
