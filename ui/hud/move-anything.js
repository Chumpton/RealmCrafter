// MOVE ANYTHING (creator 2026-10-04: "give us the ability to move anything, just like the World of Warcraft add-on").
// F6 or O → MOVE ANYTHING toggles unlock mode (player.state.maOn). In it every top-level HUD element (an id'd, fixed-position
// root) wears a gold handle: drag moves it, wheel scales it, right-click resets it. Offsets ride player.state.moveAny
// ({ id: [dx, dy, scale] }, written only by scripts/view-settings.js 'maSet'), applied on this page as one <style> tag.
// the aura: a soft gold glow that breathes, brighter under the cursor and while held; the name tag shows on hover
const AURA_CSS = `
.ma-aura{position:fixed;box-sizing:border-box;border-radius:8px;cursor:default;pointer-events:auto;border:1px solid rgba(231,180,87,.35);
  background:radial-gradient(ellipse at center,rgba(231,180,87,.06),rgba(231,180,87,.02) 70%,transparent);
  box-shadow:0 0 10px 2px rgba(231,180,87,.28),inset 0 0 8px rgba(231,180,87,.12);animation:ma-breathe 2.4s ease-in-out infinite;transition:box-shadow .15s,border-color .15s}
.ma-aura.ma-armed{cursor:grab}
.ma-aura:hover{border-color:rgba(255,214,130,.8);box-shadow:0 0 16px 4px rgba(255,200,110,.5),inset 0 0 10px rgba(255,214,130,.2);animation:none}
.ma-aura:active{cursor:grabbing;border-color:rgba(255,226,160,.95);box-shadow:0 0 22px 6px rgba(255,200,110,.6),inset 0 0 12px rgba(255,226,160,.25)}
.ma-tag{position:absolute;left:50%;top:-18px;transform:translateX(-50%);padding:1px 7px;font:11px Georgia,serif;letter-spacing:.06em;color:#1e140c;background:rgba(231,180,87,.92);border-radius:4px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s}
.ma-aura:hover .ma-tag,.ma-aura:active .ma-tag{opacity:1}

.ma-ring{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;pointer-events:none;opacity:0;transition:opacity .12s}
.ma-ring circle.f{stroke-dasharray:88;stroke-dashoffset:88}
.ma-aura.ma-hov .ma-ring{opacity:1}
.ma-aura.ma-hov .ma-ring circle.f{animation:ma-fill .5s linear forwards}
.ma-aura.ma-armed .ma-ring circle.f{stroke:#ffe7a8}
.ma-key{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font:bold 10px Georgia,serif;color:#ffe7a8;text-shadow:0 0 3px #000;opacity:0;transition:opacity .1s}
.ma-aura.ma-armed .ma-key{opacity:1}
.ma-aura.ma-ghost{border-style:dashed;border-color:rgba(231,180,87,.5)}
@keyframes ma-fill{to{stroke-dashoffset:0}}
@keyframes ma-breathe{0%,100%{box-shadow:0 0 8px 1px rgba(231,180,87,.22),inset 0 0 6px rgba(231,180,87,.08)}50%{box-shadow:0 0 14px 3px rgba(231,180,87,.38),inset 0 0 10px rgba(231,180,87,.16)}}`;
let lookEl = null, hidden = {}, hiddenJson = '', hov = null, hovTimer = null;
const NO_HIDE = /^(ma-|move-anything)|options/i;
let root = null, styleEl = null, layer = null, timer = null, offKey = null, saved = {}, live = {}, savedJson = '', on = false, drag = null;
const ID_OK = /^[a-z][a-z0-9_-]{0,39}$/i;
const SKIP = new Set(['ma-layer', 'ma-bar']);
// named pieces: the tag a registered HUD piece wears (any other id'd fixed root still moves, tagged by its id)
export const MA_NAMES = { 'devbook-tab': 'Dev Tracker tab', 'devbook-book': 'Dev Tracker book' };
function css() {
  let out = '';
  const all = { ...saved, ...live };
  for (const id in all) { const [x, y, s] = all[id]; if (!ID_OK.test(id)) continue; out += `#${id}{translate:${x | 0}px ${y | 0}px !important;${s && s !== 1 ? `scale:${s} !important;transform-origin:center;` : ''}}\n`; }
  for (const id in hidden) { if (!ID_OK.test(id) || NO_HIDE.test(id)) continue; out += on ? `#${id}{opacity:.15 !important;transition:opacity .3s}\n` : `#${id}{opacity:0 !important;pointer-events:none !important;transition:opacity .3s}\n`; }
  if (styleEl) styleEl.textContent = out;
}
// a container is a pass-through wrapper: a full-screen layer (sk-layer) or a zero-height root (h4-root, nh-topwrap).
// it never wears an aura and never hides what it holds; the pieces inside it are the movable things.
function isContainer(el, r) {
  r = r ?? el.getBoundingClientRect();
  if (r.width < 6 || r.height < 6) return true;
  return r.width * r.height >= innerWidth * innerHeight * 0.6;
}
function positioned(cs) { return cs.position === 'fixed' || cs.position === 'absolute'; }
function candidates() {
  const scan = document.body; if (!scan) return [];
  const out = [];
  for (const el of scan.querySelectorAll('[id]')) {
    if (layer && layer.contains(el)) continue;
    const id = el.id; if (!ID_OK.test(id) || SKIP.has(id)) continue;
    if (el.closest('#den-settings')) continue; // creator 2026-10-06: the admin window moves by its title bar alone
    let cs; try { cs = getComputedStyle(el); } catch (e) { continue; }
    if (!positioned(cs) || cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (isContainer(el, r)) continue;
    // nested inside another movable piece? that piece moves it already
    let p = el.parentElement, nested = false;
    while (p && p !== scan) {
      if (p.id && !SKIP.has(p.id)) { const pc = getComputedStyle(p); if (positioned(pc) && !isContainer(p)) { nested = true; break; } }
      else if (!p.id) { const pc = getComputedStyle(p); if (pc.position === 'fixed' && !isContainer(p)) { nested = true; break; } }
      p = p.parentElement;
    }
    if (nested) continue;
    out.push({ id, r });
  }
  // smaller pieces sit above bigger ones so a window never swallows the frame beside it
  out.sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
  return out;
}
function paint() {
  if (!layer) return;
  if (!layer.isConnected) document.body.appendChild(layer); // a re-render can replace the container's children
  if (!on) { layer.innerHTML = ''; layer.style.display = 'none'; return; }
  layer.style.display = 'block';
  const seen = new Set();
  let list = [];
  try { list = candidates(); layer.dataset.n = String(list.length); layer.dataset.err = ''; } catch (e) { layer.dataset.err = String(e && e.message || e).slice(0, 120); }
  for (const { id, r } of list) {
    seen.add(id);
    let h = layer.querySelector(`[data-ma="${id}"]`);
    if (!h) {
      h = document.createElement('div'); h.dataset.ma = id;
      h.className = 'ma-aura';
      const tag = document.createElement('div'); tag.textContent = MA_NAMES[id] ?? id.replace(/^(nh|h4|hud|den)-/, '');
      tag.className = 'ma-tag';
      h.appendChild(tag);
      const ring = document.createElement('div'); ring.className = 'ma-ring';
      ring.innerHTML = '<svg viewBox="0 0 34 34" width="34" height="34"><circle cx="17" cy="17" r="14" fill="rgba(30,20,12,.55)" stroke="rgba(231,180,87,.3)" stroke-width="3"/><circle class="f" cx="17" cy="17" r="14" fill="none" stroke="#e7b457" stroke-width="3" stroke-linecap="round" transform="rotate(-90 17 17)"/></svg><div class="ma-key">X</div>';
      h.appendChild(ring);
      h.addEventListener('pointerenter', () => { hov = { id, armed: false }; h.classList.add('ma-hov'); clearTimeout(hovTimer); hovTimer = setTimeout(() => { if (hov && hov.id === id) { hov.armed = true; h.classList.add('ma-armed'); if (typeof sendAction === 'function') sendAction('maHover', { id }); } }, 500); });
      h.addEventListener('pointerleave', () => { if (drag && drag.id === id) return; if (hov && hov.id === id) { if (hov.armed && typeof sendAction === 'function') sendAction('maHover', { id: '' }); hov = null; } clearTimeout(hovTimer); h.classList.remove('ma-hov', 'ma-armed'); });
      const armed = () => hov && hov.id === id && hov.armed;
      h.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); e.stopPropagation(); if (!armed()) return; const cur = live[id] ?? saved[id] ?? [0, 0, 1]; drag = { id, sx: e.clientX, sy: e.clientY, x0: cur[0], y0: cur[1], s: cur[2] ?? 1 }; try { h.setPointerCapture(e.pointerId); } catch (_) {} });
      h.addEventListener('pointermove', (e) => { if (!drag || drag.id !== id) return; live[id] = [drag.x0 + e.clientX - drag.sx, drag.y0 + e.clientY - drag.sy, drag.s]; css(); place(h, id); });
      h.addEventListener('pointerup', () => { if (!drag || drag.id !== id) return; drag = null; commit(id); });
      h.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); if (!armed()) return; const cur = live[id] ?? saved[id] ?? [0, 0, 1]; const s = Math.max(0.5, Math.min(2, Math.round(((cur[2] ?? 1) * (e.deltaY < 0 ? 1.05 : 1 / 1.05)) * 100) / 100)); live[id] = [cur[0], cur[1], s]; css(); clearTimeout(h._t); h._t = setTimeout(() => commit(id), 350); }, { passive: false });
      h.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); if (!armed()) return; live[id] = [0, 0, 1]; css(); commit(id); });
      layer.appendChild(h);
    }
    h.classList.toggle('ma-ghost', !!hidden[id]); if (hov && hov.id === id) { h.classList.add('ma-hov'); if (hov.armed) h.classList.add('ma-armed'); } h.querySelector('.ma-key').textContent = hidden[id] ? 'X show' : 'X hide';
    h.style.left = r.left + 'px'; h.style.top = r.top + 'px'; h.style.width = r.width + 'px'; h.style.height = r.height + 'px';
  }
  for (const h of [...layer.children]) if (!seen.has(h.dataset.ma)) h.remove();
}
function place(h, id) { const el = document.getElementById(id); if (!el) return; const r = el.getBoundingClientRect(); h.style.left = r.left + 'px'; h.style.top = r.top + 'px'; h.style.width = r.width + 'px'; h.style.height = r.height + 'px'; }
function commit(id) { const v = live[id]; if (!v || typeof sendAction !== 'function') return; sendAction('maSet', { id, x: Math.round(v[0]), y: Math.round(v[1]), s: v[2] ?? 1 }); }
export function mountMoveAnything(container) {
  root = container;
  try {
    styleEl = document.createElement('style'); styleEl.id = 'ma-style'; document.head.appendChild(styleEl);
    const look = document.createElement('style'); look.id = 'ma-look'; look.textContent = AURA_CSS; document.head.appendChild(look); lookEl = look;
    layer = document.createElement('div'); layer.id = 'ma-layer'; layer.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;display:none'; document.body.appendChild(layer);
    const k = (e) => {
    };
    document.addEventListener('keydown', k); offKey = () => document.removeEventListener('keydown', k);
    const grip = (e) => { const g = e.target?.closest?.('[data-ma-grip]'); if (!g || e.button !== 0) return; e.preventDefault(); const cur = live['ma-bar'] ?? saved['ma-bar'] ?? [0, 0, 1]; drag = { id: 'ma-bar', sx: e.clientX, sy: e.clientY, x0: cur[0], y0: cur[1], s: 1 };
      const mv = (ev) => { live['ma-bar'] = [drag.x0 + ev.clientX - drag.sx, drag.y0 + ev.clientY - drag.sy, 1]; css(); };
      const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); drag = null; commit('ma-bar'); };
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); };
    document.addEventListener('pointerdown', grip, true); const offK = offKey; offKey = () => { offK?.(); document.removeEventListener('pointerdown', grip, true); };
    timer = setInterval(() => { if (on && !drag) paint(); }, 300);
  } catch (e) {}
}
export function unmountMoveAnything() { try { clearInterval(timer); offKey?.(); styleEl?.remove(); lookEl?.remove(); layer?.remove(); } catch (e) {} root = styleEl = layer = null; }
// called from ui.js's render: cheap (a JSON compare); returns the unlock banner (data-modal frees the mouse) while unlocked
export function moveAnything(player) {
  const m = player?.state?.moveAny ?? {}, j = JSON.stringify(m);
  if (j !== savedJson) { savedJson = j; saved = m; for (const id in live) if (!drag || drag.id !== id) delete live[id]; css(); }
  const hm = player?.state?.maHidden ?? {}, hj = JSON.stringify(hm);
  const was = on; on = !!player?.state?.maOn;
  if (hj !== hiddenJson || was !== on) { hiddenJson = hj; hidden = { ...hm }; css(); }
  if (was !== on) setTimeout(paint, 0);
  const nh = Object.keys(hidden).length;
  if (!on) return '';
  return `<div id="ma-bar" data-modal style="position:fixed;left:50%;top:72px;transform:translateX(-50%);z-index:10000;display:flex;gap:8px;align-items:center;padding:6px 12px;border-radius:10px;background:rgba(40,26,16,.92);border:1px solid rgba(231,180,87,.8);color:#f4e3c3;font:13px Georgia,serif;pointer-events:auto">
    <span data-ma-grip title="drag to move this bar" style="letter-spacing:.12em;color:#e7b457;cursor:grab;user-select:none">⠿ MOVE ANYTHING</span><span style="opacity:.7;font-size:11px">drag · wheel to size · right-click resets · hover + X hides · \` to finish</span>${nh ? `<button onclick="sendAction('maShowAll',{})" style="padding:3px 10px;border-radius:7px;border:1px solid rgba(201,164,106,.6);background:rgba(90,60,35,.7);color:#f4e3c3;font-family:inherit;cursor:pointer">show all (${nh} hidden)</button>` : ''}
    <button onclick="sendAction('maReset',{})" style="padding:3px 10px;border-radius:7px;border:1px solid rgba(201,164,106,.6);background:rgba(90,60,35,.7);color:#f4e3c3;font-family:inherit;cursor:pointer">reset all</button>
    <button onclick="sendAction('maToggle',{},{relockPointer:true})" style="padding:3px 10px;border-radius:7px;border:1px solid rgba(201,164,106,.6);background:rgba(186,137,80,.85);color:#1e140c;font-family:inherit;cursor:pointer">done (\`)</button></div>`;
}
