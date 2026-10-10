// LANE 7 PHONE (plan: docs/board/OSCHAT-SPAWN-WIRE-PLAN-2026-10-07.md): on a touch screen, a tap on the OSRS chat box's
// input row ("Zezima: *", canvas y 110-130 of 165) focuses the hidden chat <input> (ui.js osChatFocus) so the native keyboard opens.
// Page-side only, no paint: Campton's box art is untouched. Desktop (fine pointer) is never touched: Enter stays its way in.
const ROW = { y0: 110, y1: 130, H: 165 };
let installed = false;
function coarse() { try { return !!window.matchMedia?.('(pointer: coarse)')?.matches; } catch (e) { return false; } }
function inRow(e) {
  const c = e.target; if (!c || c.id !== 'oscv') return false;
  const r = c.getBoundingClientRect(); if (!r.height) return false;
  const y = (e.clientY - r.top) * ROW.H / r.height;
  return y >= ROW.y0 && y <= ROW.y1;
}
function focus() { try { window.__osChatFocus?.(); } catch (e) {} }
export function installOsChatTouch() {
  if (installed || typeof document === 'undefined') return; installed = true;
  // capture on document: the HUD may swap in a fresh <canvas id="oscv"> between feeds
  document.addEventListener('pointerdown', (e) => {
    if (!coarse() || !inRow(e)) return;
    e.stopPropagation(); focus();
  }, { capture: true });
  // iOS opens the keyboard only for a focus inside a click/touchend gesture: retry there if pointerdown's focus did not take
  document.addEventListener('click', (e) => {
    if (!coarse() || !inRow(e)) return;
    const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return;
    focus();
  }, { capture: true });
}
