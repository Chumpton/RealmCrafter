// One size for every OSRS window (creator 2026-10-06: "Auto" adapts to the monitor and the window: full screen, half window, a small square; refits live).
// Page side: writes --osk (the shared scale) on this page's root and refits on every window resize; CSS reads it, the canvases read osK().
// Interface size (Display) picks a step; 0 = Auto. Move Anything's per-window scale rides on top (it writes the separate `scale` property).
export const UI_STEPS = [0, 1, 1.5, 2, 3];
export const PANEL_K = 0.8; // chat, side panel and minimap sit at 0.8 of the settings window's scale (≈ the old fixed 1.2 on a 1369 px tall screen)
// Auto: the OSRS window is designed for ~900 px of height and ~1500 px of width; whichever is tighter wins, in 0.05 steps, 0.6..3
export const osAutoK = (W, H) => Math.max(0.6, Math.min(3, Math.round(Math.min(H / 900, W / 1500) * 20) / 20));
let pick = 0, wired = false;
export function osK() { if (typeof innerHeight === 'undefined') return 1; return UI_STEPS[pick] || osAutoK(innerWidth, innerHeight); }
function apply() {
  const k = osK(), r = document.documentElement.style;
  r.setProperty('--osk', String(k)); r.setProperty('--ospk', String(+Math.max(0.75, k * PANEL_K).toFixed(3))); // the panels never shrink past readable
  try { window.dispatchEvent(new Event('osk')); } catch (e) {}
}
export function osScaleFeed(p) {
  if (typeof document === 'undefined') return;
  p = p | 0; const was = pick; pick = p >= 0 && p < UI_STEPS.length ? p : 0;
  if (!wired) { wired = true; addEventListener('resize', apply); document.addEventListener('fullscreenchange', apply); apply(); return; }
  if (was !== pick || !document.documentElement.style.getPropertyValue('--osk')) apply(); // the root may be fresh after a HUD reload
}
// Fullscreen of the whole game page (the HUD lives in a frame; the page it sits in is what fills the screen). On a page, fullscreen IS borderless.
const topDoc = () => { try { return window.parent?.document ?? document; } catch (e) { return document; } };
export const osIsFullscreen = () => { try { return !!(topDoc().fullscreenElement || document.fullscreenElement); } catch (e) { return false; } };
export function osFullscreen(on) {
  const d = topDoc();
  try {
    if (on && !osIsFullscreen()) { const el = d.documentElement; const p = el.requestFullscreen?.({ navigationUI: 'hide' }); p?.catch?.(() => document.documentElement.requestFullscreen?.().catch(() => {})); }
    else if (!on && osIsFullscreen()) { (d.fullscreenElement ? d : document).exitFullscreen?.().catch?.(() => {}); }
  } catch (e) {}
}
