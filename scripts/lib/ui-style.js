// Put a stylesheet in <head> once. HUD render functions run again and again; a <style> inside their returned string is re-inserted each time,
// which restarts every CSS animation under it (the weapon bar kept starting over). Call this from the render instead and return markup only.
export function ensureStyle(id, css) {
  try {
    if (typeof document === 'undefined') return;
    const txt = css.replace(/<\/?style>/g, ''), had = document.getElementById(id);
    if (had) { if (had.textContent !== txt) had.textContent = txt; return; } // a new version of the sheet replaces the old (it used to stick until reload)
    const el = document.createElement('style'); el.id = id; el.textContent = txt; document.head.appendChild(el);
  } catch (e) {}
}
