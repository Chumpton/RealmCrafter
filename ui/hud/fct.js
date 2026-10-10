// FLOATING COMBAT TEXT, classic WoW (creator 2026-10-10): screen-space numbers pinned to the struck thing (data-world-anchor), drawn with
// the Web Animations API so every number keeps its own arc. Normal hits drift on a parabola and fade after 65% of their life; crits slam
// (1→2.0× in 80 ms, elastic to 1.35×), hang, then drift; a new number on the same target pushes the older ones up 18 px.
// installFct(container) listens for uiEvent 'fct'; numbers tuned in scripts/lib/data/fct.js. Never throws.
import { FCT } from '../../scripts/lib/data/fct.js';
let root = null, off = null, seq = 0;
const live = new Map(); // target id → [{ el, push }]
const STYLE = `<style id="fct-style">
#fct-root{position:fixed;inset:0;pointer-events:none;z-index:6;overflow:hidden}
.fct{position:absolute;left:0;top:0;width:0;height:0}
.fct .p{position:absolute;left:0;top:0;transition:transform .12s ease-out}
.fct .n{position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;font-family:${FCT.font};font-weight:700;line-height:1;
  -webkit-text-stroke:${FCT.stroke}px #000;paint-order:stroke fill;
  text-shadow:0 0 1px #000,1px 1px 0 #000,-1px 1px 0 #000,1px -1px 0 #000,-1px -1px 0 #000,2px 2px 1px #000,0 2px 2px rgba(0,0,0,.8)}
.fct.cr{z-index:3}
</style>`;
function colorOf(s, c) {
  const C = FCT.colors;
  if (s === 'phys' || s === 'steel' || s === 'melee') return c ? C.physCrit : C.phys;
  return C[s] ?? C.phys;
}
function spawnStatus(p) { // CC / effect words: small caps, the effect's colour, rising slow and straight above the numbers' lane
  const el = document.createElement('div'); el.className = 'fct st';
  el.setAttribute('data-world-anchor', p.t); el.setAttribute('data-anchor-offset', `0 ${(p.h ?? 2.1).toFixed(2)} 0`);
  const n = document.createElement('div'); n.className = 'n'; n.textContent = String(p.v ?? '');
  n.style.color = p.col || '#fff'; n.style.fontSize = Math.round(FCT.sizePx * 0.85) + 'px'; n.style.fontVariant = 'small-caps'; n.style.letterSpacing = '.04em';
  el.appendChild(n); root.appendChild(el);
  const prev = (live.get('st:' + p.t) ?? []).filter((e) => e.isConnected); const lane = prev.length * 22; prev.push(el); live.set('st:' + p.t, prev);
  const y0 = FCT.clearPx + 64 + lane, L = 1700;
  const T = (dy, sc, o, off) => ({ offset: off, opacity: o, transform: `translate(-50%, calc(-50% + ${-(y0 + dy)}px)) scale(${sc})` });
  n.animate([T(-6, 0.7, 0, 0), T(0, 1.12, 1, 0.08), T(2, 1, 1, 0.16), T(12, 1, 1, 0.7), T(30, 1, 0, 1)], { duration: L, easing: 'linear', fill: 'forwards' });
  setTimeout(() => { try { el.remove(); const l = live.get('st:' + p.t); if (l) { const k = l.indexOf(el); if (k >= 0) l.splice(k, 1); if (!l.length) live.delete('st:' + p.t); } } catch (e) {} }, L + 60);
}
function spawnNum(p) {
  if (!root || !p || !p.t) return;
  if (p.s === 'status') return spawnStatus(p);
  const crit = !!p.c, txt = typeof p.v === 'number' ? (p.s === 'heal' ? `+${p.v}` : String(p.v)) + (crit && p.s !== 'heal' && p.s !== 'miss' ? '!' : '') : String(p.v ?? '');
  const col = colorOf(p.s, crit);
  const list = (live.get(p.t) ?? []).filter((r) => r.el.isConnected);
  for (const r of list) { r.push += FCT.stackPx * (crit ? 1.6 : 1); r.p.style.transform = `translateY(${-r.push}px)`; }
  const el = document.createElement('div');
  el.className = 'fct' + (crit ? ' cr' : '');
  el.id = 'fct-' + (++seq);
  el.setAttribute('data-world-anchor', p.t);
  el.setAttribute('data-anchor-offset', `0 ${(p.h ?? 2.1).toFixed(2)} 0`);
  const pw = document.createElement('div'); pw.className = 'p';
  const n = document.createElement('div'); n.className = 'n'; n.textContent = txt;
  n.style.color = col; n.style.fontSize = (crit ? FCT.critPx : FCT.sizePx) * (p.s === 'miss' ? 0.8 : 1) + 'px';
  pw.appendChild(n); el.appendChild(pw); root.appendChild(el);
  const fan = ((list.length % 3) - 1) * FCT.fan, U = FCT.pxPerUnit;
  let life, frames;
  if (crit) {
    const K = FCT.crit; life = K.life * 1000;
    const tb = K.burst[0] / K.life, ts = K.settle[0] / K.life, rise = K.rise * U;
    const T = (dy, sc, o, off) => ({ offset: off, opacity: o, transform: `translate(calc(-50% + ${fan}px), calc(-50% + ${-(dy + FCT.clearPx * 1.3)}px)) scale(${sc})` });
    frames = [T(0, 1, 1, 0), T(4, K.burst[1], 1, tb), T(2, K.settle[1] * 0.92, 1, tb + (ts - tb) * 0.55), T(3, K.settle[1], 1, ts),
      T(6, K.settle[1], 1, 0.45), T(rise * 0.55, K.settle[1], 1, K.holdFrac), T(rise, K.settle[1] * 0.96, 0, 1)];
    n.animate(frames, { duration: life, easing: 'linear', fill: 'forwards' });
  } else {
    const K = FCT.hit; const L = K.life[0] + Math.random() * (K.life[1] - K.life[0]); life = L * 1000;
    const vx = (Math.random() * 2 - 1) * K.vx * U, vy = K.vy * U, g = K.g * U;
    frames = [];
    for (let i = 0; i <= 12; i++) {
      const f = i / 12, t = f * L, x = fan + vx * t, y = Math.max(f * K.floor * U * 2, vy * t - 0.5 * g * t * t) + FCT.clearPx;
      const o = f <= K.holdFrac ? 1 : 1 - (f - K.holdFrac) / (1 - K.holdFrac);
      frames.push({ offset: f, opacity: o, transform: `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${(-y).toFixed(1)}px))` });
    }
    n.animate(frames, { duration: life, easing: 'linear', fill: 'forwards' });
  }
  const rec = { el, p: pw, push: 0 }; list.push(rec); live.set(p.t, list);
  setTimeout(() => { try { el.remove(); const l = live.get(p.t); if (l) { const k = l.indexOf(rec); if (k >= 0) l.splice(k, 1); if (!l.length) live.delete(p.t); } } catch (e) {} }, life + 60);
}
export function installFct(container) {
  try {
    if (!document.getElementById('fct-style')) document.head.insertAdjacentHTML('beforeend', STYLE);
    root = document.getElementById('fct-root');
    if (!root) { root = document.createElement('div'); root.id = 'fct-root'; (container ?? document.body).appendChild(root); }
    off = window.spawn?.on?.('event', (name, payload) => { if (name === 'fct') try { spawnNum(payload); } catch (e) {} });
    window.__fctTest = spawnNum;
  } catch (e) {}
  return () => { try { off?.(); root?.remove(); root = null; } catch (e) {} };
}
