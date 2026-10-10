// THE WARDROBE window (O → Character → Wardrobe): swatches and symbols, no forms. Every press is sendAction('look', { k, v });
// scripts/wardrobe-player.js writes player.state.look and dresses the body. Memoised on the look itself.
import { WARDROBE, LOOK_DEFAULT } from '../../scripts/lib/data/osrs-folk-looks.js';
let key = null, html = '';
const GOLD = '#e7b457', INK = '#f4e3c3';
function pill(on, label, onclick, touch, title) {
  return `<button title="${title ?? ''}" onclick="${onclick}" style="flex:1;${touch ? 'min-height:44px;' : ''}padding:7px 6px;border-radius:8px;border:1px solid ${on ? GOLD : 'rgba(201,164,106,.45)'};background:${on ? 'rgba(186,137,80,.9)' : 'rgba(20,12,6,.45)'};color:${on ? '#1e140c' : INK};font:14px Georgia,serif;cursor:pointer">${label}</button>`;
}
function swatches(k, list, sel, touch) {
  const d = touch ? 34 : 24;
  return `<div style="display:flex;flex-wrap:wrap;gap:5px">${list.map((c, i) => `<button title="${k} ${i + 1}" onclick="sendAction('look',{k:'${k}',v:${i}})" style="width:${d}px;height:${d}px;padding:0;border-radius:6px;background:${c};border:${i === sel ? `3px solid ${GOLD}` : '1px solid rgba(0,0,0,.6)'};box-shadow:${i === sel ? '0 0 6px rgba(231,180,87,.8)' : 'none'};cursor:pointer"></button>`).join('')}</div>`;
}
const row = (icon, body) => `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid rgba(201,164,106,.22)"><span style="flex:none;width:26px;text-align:center;font-size:18px">${icon}</span><div style="flex:1;min-width:0">${body}</div></div>`;
export function wardrobeWin(player, touch) {
  const s = player?.state;
  if (!s?.wardrobeOpen) { key = null; return ''; }
  const L = { ...LOOK_DEFAULT, ...(s.look ?? {}) }, k = JSON.stringify(L) + touch;
  if (k === key) return html;
  key = k;
  const osrs = L.form === 'osrs', H = WARDROBE.height;
  const dress = osrs ? [
    row('⚥', `<div style="display:flex;gap:6px">${pill(L.cut === 'man', '♂', "sendAction('look',{k:'cut',v:'man'})", touch, 'man')}${pill(L.cut === 'woman', '♀', "sendAction('look',{k:'cut',v:'woman'})", touch, 'woman')}</div>`),
    row('✋', swatches('skin', WARDROBE.skin, L.skin, touch)),
    row('💇', swatches('hair', WARDROBE.hair, L.hair, touch)),
    row('👕', swatches('shirt', WARDROBE.cloth, L.shirt, touch)),
    row('👖', swatches('legs', WARDROBE.cloth, L.legs, touch)),
    row('👢', swatches('boots', WARDROBE.boots, L.boots, touch)),
    row('↕', `<input type="range" min="${H.min}" max="${H.max}" step="${H.step}" value="${L.height}" onchange="sendAction('look',{k:'height',v:+this.value})" style="width:100%;${touch ? 'height:44px;' : ''}accent-color:${GOLD}">`),
  ].join('') : `<div style="padding:14px 4px;font-size:13px;opacity:.75;text-align:center">your own avatar. pick ⚔ to dress the world form.</div>`;
  html = `<div id="wardrobe" data-modal style="position:fixed;right:${touch ? '4vw' : '90px'};top:50%;transform:translateY(-50%);width:${touch ? '92vw' : '330px'};max-height:84vh;overflow-y:auto;box-sizing:border-box;padding:14px 16px 14px;border-radius:12px;background:rgba(40,26,16,.94);border:1px solid rgba(201,164,106,.6);box-shadow:4px 4px 0 rgba(20,12,6,.6);color:${INK};font-family:Georgia,serif;pointer-events:auto;z-index:80">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:15px;letter-spacing:.14em;color:${GOLD}">WARDROBE</span>
    <span style="display:flex;gap:6px"><button title="surprise me" onclick="sendAction('look',{k:'random'})" style="width:${touch ? 44 : 28}px;height:${touch ? 44 : 28}px;padding:0;border-radius:6px;border:1px solid rgba(201,164,106,.7);background:rgba(20,12,6,.45);color:${INK};font-size:15px;cursor:pointer">🎲</button>
    <button id="wardrobe-x" title="close" onclick="sendAction('wardrobe',{},{relockPointer:true})" style="width:${touch ? 44 : 28}px;height:${touch ? 44 : 28}px;padding:0;border-radius:6px;border:1px solid rgba(201,164,106,.7);background:rgba(20,12,6,.45);color:${INK};font:bold 13px Georgia,serif;cursor:pointer">✕</button></span></div>
  <div style="display:flex;gap:6px;margin-bottom:6px">${pill(!osrs, '☺ avatar', "sendAction('look',{k:'form',v:'original'})", touch, 'your own avatar')}${pill(osrs, '⚔ osrs form', "sendAction('look',{k:'form',v:'osrs'})", touch, 'the OSRS world form')}</div>
  ${dress}
</div>`;
  return html;
}
