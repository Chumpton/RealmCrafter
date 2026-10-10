// creator 2026-10-10: "give everything a bigger better tooltip using its icon, and our ui asset frames".
// Side-effect module (ui.js imports it). Every hover tip in the HUD (any title="…") becomes one framed card: the kit nine-slice
// (--kit-ns, cut by kit-skin.js from UIK['ctx-menu']) with the filigree corners, the hovered thing's own icon in a portrait frame,
// its name in gold Friz, the rest as rows. The native tip is held back (title moves to data-ktt). Talent tips wear the same frame.
import { UIK } from '../../scripts/lib/data/ui-kit.js';
const FRIZ = "'WowFriz','Marcellus','Cinzel',Georgia,serif", NARROW = "'WowNarrow','Archivo Narrow','Arial Narrow',Arial,sans-serif";
const FRAME = `border:16px solid #8a6a32;border-image:var(--kit-ns) 32 / 16px / 0 stretch;
  background:url("${UIK['fil-corner-tl']}") top left/26px 26px no-repeat,url("${UIK['fil-corner-tr']}") top right/26px 26px no-repeat,
  url("${UIK['fil-corner-bl']}") bottom left/26px 24px no-repeat,url("${UIK['fil-corner-br']}") bottom right/26px 24px no-repeat,
  radial-gradient(120% 90% at 50% 0%,#2c323b 0%,#1a1e24 60%,#111418 100%);background-clip:padding-box;box-shadow:0 12px 30px #000c`;
const CSS = `#ktt{position:fixed;z-index:2147483600;pointer-events:none;display:none;min-width:220px;max-width:360px;padding:8px 12px 10px;${FRAME};
  color:#f2e6cf;font:15px/1.3 ${FRIZ};text-shadow:1px 1px 1px #000;opacity:0;transform:translateY(4px) scale(.98);transition:opacity .12s,transform .12s}
#ktt.on{display:block}#ktt.in{opacity:1;transform:none}
#ktt .kh{display:flex;gap:11px;align-items:center}
#ktt .ki{flex:none;width:58px;height:58px;border-radius:6px;position:relative;overflow:hidden;background:#0b0c0e center/cover no-repeat;
  box-shadow:0 0 0 2px #1a140c,0 0 0 4px #c9a24e,0 0 0 5px #3b2a12,0 3px 8px #000;display:flex;align-items:center;justify-content:center;font-size:32px}
#ktt .ki>*{width:100%!important;height:100%!important;border-radius:0!important;margin:0!important;position:static!important}
#ktt .ki img{object-fit:cover}
#ktt .ki::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 8px #000c,inset 0 1px 0 #ffffff30;border-radius:6px}
#ktt .kn{font-size:19px;line-height:1.15;color:#ffd100;letter-spacing:.03em}
#ktt .ks{font:700 13px/1.2 ${NARROW};color:#9fc6ff;margin-top:3px;text-transform:capitalize}
#ktt .kr{border-top:1px solid #8a6a3266;margin-top:8px;padding-top:6px;display:grid;gap:3px}
#ktt .kr div{font:600 14px/1.25 ${NARROW};color:#fff}
#ktt .kr div.g{color:#7fe07a}#ktt .kr div.y{color:#ffd100}#ktt .kr div.m{color:#c8c2b5}
#ktt .kd{margin-top:7px;font:400 14px/1.35 ${FRIZ};color:#ffd76a}
#tp-win .tip{${FRAME};border-radius:0!important;width:260px!important;padding:6px 10px!important;font-size:14px!important;line-height:1.35!important}
#tp-win .tip b{font-size:17px!important;color:#ffd100!important}`;
let tip, cur = null, raf = 0;
const iconOf = (el) => { // the hovered thing's own picture: an <img>, a sprite-sheet cell, or its glyph
  const c = [el, ...el.querySelectorAll('*')];
  for (const n of c) {
    if (n.tagName === 'IMG' && n.src) return n.cloneNode(false);
    if (n.tagName === 'CANVAS') { try { const i = new Image(); i.src = n.toDataURL(); return i; } catch (e) {} }
    const s = n.style?.backgroundImage || (n !== el ? '' : '');
    if (s && s !== 'none' && n !== el) { const d = n.cloneNode(false); d.removeAttribute('id'); d.removeAttribute('class'); d.style.cssText = n.style.cssText; return d; }
  }
  for (const n of c) { const b = getComputedStyle(n).backgroundImage; if (b && b !== 'none' && !/gradient/.test(b) && n.getBoundingClientRect().width < 90) { const d = document.createElement('i'); d.style.cssText = `background:${b} ${getComputedStyle(n).backgroundPosition}/${getComputedStyle(n).backgroundSize} no-repeat`; return d; } }
  const t = (el.querySelector('.g,b,span')?.textContent || '').trim();
  if (t && [...t].length <= 2) { const d = document.createElement('b'); d.textContent = t; d.style.cssText = 'display:flex;align-items:center;justify-content:center'; return d; }
  return null;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function paint(el) {
  let text = el.dataset.ktt || '';
  let name = text, sub = '', rows = [], desc = '';
  let tail = ''; { const k = text.indexOf(' ¶ '); if (k >= 0) { tail = text.slice(k + 3); text = text.slice(0, k); name = text; } } // ' ¶ ' = the gold description line (spell-desc.js)
  if (text.includes(' · ')) { const p = text.split(' · '); name = p[0]; sub = p[1] ?? ''; rows = p.slice(2); }
  else if (/^[^:]{2,40}: /.test(text)) { const i = text.indexOf(': '); name = text.slice(0, i); desc = text.slice(i + 2); }
  if (tail) desc = desc ? desc + ' ' + tail : tail;
  const cls = (r) => /max hit|damage|heal/i.test(r) ? 'y' : /cast|instant|cooldown|GCD/i.test(r) ? 'm' : /gem|less|more|\+/i.test(r) ? 'g' : '';
  const ec = getComputedStyle(el).getPropertyValue('--ec').trim() || getComputedStyle(el).getPropertyValue('--cc').trim();
  tip.innerHTML = `<div class="kh"><div class="ki"></div><div><div class="kn">${esc(name)}</div>${sub ? `<div class="ks"${ec ? ` style="color:${esc(ec)}"` : ''}>${esc(sub)}</div>` : ''}</div></div>`
    + (rows.length ? `<div class="kr">${rows.map((r) => `<div class="${cls(r)}">${esc(r)}</div>`).join('')}</div>` : '') + (desc ? `<div class="kd">${esc(desc)}</div>` : '');
  const box = tip.querySelector('.ki'), ic = iconOf(el);
  if (ic) box.appendChild(ic); else box.remove();
}
function place(x, y) {
  const r = tip.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  let l = x + 18, t = y - r.height - 14;
  if (l + r.width > W - 8) l = x - r.width - 18;
  if (t < 8) t = y + 22;
  if (t + r.height > H - 8) t = H - r.height - 8;
  tip.style.left = `${Math.max(8, l)}px`; tip.style.top = `${Math.max(8, t)}px`;
}
function show(el, x, y) { cur = el; paint(el); tip.classList.add('on'); place(x, y); requestAnimationFrame(() => tip.classList.add('in')); watch(); }
function hide() { cur = null; tip.classList.remove('on', 'in'); cancelAnimationFrame(raf); }
function watch() { cancelAnimationFrame(raf); raf = requestAnimationFrame(function w() { if (!cur) return; if (!cur.isConnected) return hide(); if (cur.title) { cur.dataset.ktt = cur.title; cur.removeAttribute('title'); paint(cur); } raf = requestAnimationFrame(w); }); }
function install() {
  if (document.getElementById('ktt-css')) return;
  const st = document.createElement('style'); st.id = 'ktt-css'; st.textContent = CSS; document.head.appendChild(st);
  tip = document.createElement('div'); tip.id = 'ktt'; document.body.appendChild(tip);
  let lx = 0, ly = 0;
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest?.('[title],[data-ktt]');
    if (!el || el.closest('#ktt')) { if (cur && !cur.contains(e.target)) hide(); return; }
    if (el.title) { el.dataset.ktt = el.title; el.removeAttribute('title'); }
    if (!el.dataset.ktt) return;
    if (el !== cur) show(el, e.clientX, e.clientY);
  }, true);
  document.addEventListener('mousemove', (e) => { lx = e.clientX; ly = e.clientY; if (cur) { if (!cur.contains(e.target)) return hide(); place(lx, ly); } }, { passive: true, capture: true });
  document.addEventListener('mousedown', () => cur && hide(), true);
  document.addEventListener('mouseleave', hide);
}
try { if (typeof document !== 'undefined') { if (document.body) install(); else document.addEventListener('DOMContentLoaded', install, { once: true }); } } catch (e) {}
export const tooltipReady = true;
