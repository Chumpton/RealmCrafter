// LIGHT EDITOR panel (scripts/light-editor.js owns the state: player.state.le). Editors only. A carved plank, left side, clear of Spawn's rail.
import { LE } from '../../scripts/lib/data/light-rules.js';
import * as AK from '../../scripts/lib/data/area-kinds.js'; // AREA.kinds[id] = { label, rune } (namespace import: a missing field never breaks the panel)
import { esc } from '../../scripts/lib/esc.js';
const AREA_FALLBACK = { longhouse: { label: 'Longhouse', rune: 'ᛟ' }, farmstead: { label: 'Farmstead', rune: 'ᚠ' }, village: { label: 'Village', rune: 'ᚹ' }, harbour: { label: 'Harbour', rune: 'ᛚ' }, shore: { label: 'Shore', rune: 'ᛗ' }, forge: { label: 'Smithy', rune: 'ᛊ' }, grove: { label: 'Grove', rune: 'ᛒ' }, wild: { label: 'Wilds', rune: 'ᚢ' }, road: { label: 'Road', rune: 'ᚱ' } };
const areaOf = (k) => ({ ...(AREA_FALLBACK[k] ?? { label: 'Area', rune: 'ᛜ' }), ...(AK.AREA?.kinds?.[k] ?? {}) });
const CHIPS = ['house', 'pen', 'dock', 'forge', 'gate', 'table', 'sacred', 'tree', 'well', 'yard', 'bridge', 'lamp'];
const SCAN_CSS = `<style>@keyframes le-sweep{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}@keyframes le-breathe{0%,100%{opacity:.45}50%{opacity:1}}</style>`;
const W = (label, op, extra = '', style = '') => `<button onclick="sendAction('le',{op:'${op}'${extra}})" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid #f0c987;background:linear-gradient(#d9a45e,#ba8950);color:#1e140c;font:bold 14px Georgia,serif;letter-spacing:.06em;box-shadow:2px 2px 0 rgba(20,12,6,.7);cursor:pointer;${style}">${label}</button>`;
const B = (label, op, extra = '', on = false, style = '') => `<button onclick="sendAction('le',{op:'${op}'${extra}})" style="padding:5px 8px;border-radius:7px;border:1px solid rgba(201,164,106,.6);background:${on ? 'rgba(186,137,80,.9)' : 'rgba(90,60,35,.65)'};color:${on ? '#1e140c' : '#f4e3c3'};font:12px Georgia,serif;cursor:pointer;${style}">${label}</button>`;
let memo = '', memoKey = '';
export function lightEditor(player) {
  const L = player?.isEditor ? player.state?.le : null;
  if (!L?.open) { memo = ''; memoKey = ''; return ''; }
  const key = JSON.stringify(L); if (key === memoKey) return memo; memoKey = key;
  const ft = L.rFt ?? LE.radiusFt.def, m = (ft / LE.ftPerM).toFixed(1), dens = L.dens ?? 'natural', kinds = L.kinds ?? {}, b = L.budget;
  const phase = L.phase ?? 'idle';
  const presets = LE.radiusFt.presets.map((p) => B(`${p} ft`, 'radius', `,v:${p}`, p === ft, 'flex:1;padding:4px 0')).join('');
  const slider = `<input type="range" min="${LE.radiusFt.min}" max="${LE.radiusFt.max}" value="${ft}" oninput="this.nextElementSibling.textContent=this.value+' ft'" onchange="sendAction('le',{op:'radius',v:+this.value})" style="flex:1;accent-color:#ba8950"><span style="width:52px;text-align:right">${ft} ft</span>`;
  const kindRow = Object.entries(LE.kinds).map(([k, d]) => B(`${d.rune} ${d.label}`, 'kind', `,v:'${k}'`, kinds[k] !== false, 'font-size:11px;padding:3px 6px')).join('');
  const densRow = Object.keys(LE.density).map((d) => B(d, 'dens', `,v:'${d}'`, d === dens, 'flex:1')).join('');
  const picks = (L.picks ?? []).map((p, i) => `<div style="display:flex;align-items:center;gap:6px;font-size:12px;padding:2px 0"><span style="color:#e9c27a;width:16px">${esc(LE.kinds[p.kind]?.rune)}</span><span style="flex:1;opacity:.9">${esc(p.why)}</span><button onclick="sendAction('le',{op:'remove',i:${i}})" title="leave this one out" style="border:0;background:none;color:#d9a07a;cursor:pointer;font-size:14px">✕</button></div>`).join('');
  const meter = b ? `<div style="font-size:11px;margin-top:6px;color:${b.over ? '#ff8a6a' : '#b8c99a'}">${b.outside ? `past the valley (${b.dHall} m from the hall)` : b.inZone ? `hall zone: ${b.zone} lamps + ${b.adding} = ${b.zone + b.adding} / ${b.cap}${b.over ? ' · over budget' : ''}` : `valley: ${b.dHall} m from the hall · room to spare`}</div>` : '';
  const head = phase === 'tag' ? 'Aim at the ground · <b>J</b> sets the ring' : phase === 'preview' || phase === 'scan' ? (L.sum ? `Proposed: ${esc(L.sum)}` : 'Nothing proposed') : 'Tag an area to light it';
  const act = phase === 'preview' && (L.picks ?? []).length
    ? `<div style="display:flex;gap:6px;margin-top:8px">${B('↻ Re-roll', 'reroll', '', false, 'flex:1')}${B(L.confirm ? 'Accept anyway' : '✓ Accept', 'accept', '', true, 'flex:1')}</div>`
    : phase === 'preview' ? `<div style="display:flex;gap:6px;margin-top:8px">${B('↻ Re-roll', 'reroll', '', false, 'flex:1')}</div>` : '';
  const read = L.read, ar = read ? areaOf(read.kind) : null, conf = Math.max(0, Math.min(1, +read?.confidence || 0));
  const chips = read ? CHIPS.filter((c) => (+read.counts?.[c] || 0) > 0).map((c) => `<span style="padding:1px 6px;border-radius:9px;background:rgba(155,175,132,.18);border:1px solid rgba(155,175,132,.45);font-size:10.5px;color:#d6e2c2">${c} ${+read.counts[c]}</span>`).join('') : '';
  const auto = phase === 'autofill'
    ? `${W('✦ Click the ground…', 'autofill', '', 'animation:le-breathe 2.4s ease-in-out infinite')}<div style="font-size:11px;margin-top:5px;color:#bfe6ee">Left-click (or J) inside the ring to scan and light it</div>`
    : phase === 'scanning'
    ? `<div style="position:relative;height:3px;margin:4px 0 6px;border-radius:2px;background:rgba(191,230,238,.12);overflow:hidden"><div id="le-scanbar" style="position:absolute;inset:0;width:40%;background:linear-gradient(90deg,transparent,rgba(214,244,250,.95),transparent);animation:le-sweep 1.1s linear infinite"></div></div><div style="font-size:12px;letter-spacing:.08em;color:#cdeef4">Scanning · reading the area…</div>`
    : phase === 'done' && read
    ? `<div style="padding:9px 10px;border-radius:9px;background:rgba(20,30,32,.55);border:1px solid rgba(191,230,238,.35)">
    <div style="display:flex;align-items:center;gap:8px"><span style="font-size:26px;color:#e7b457;line-height:1">${esc(ar.rune)}</span><span style="font-size:18px;color:#f4e3c3;flex:1">${esc(read.label || ar.label)}</span></div>
    ${read.why ? `<div style="font-size:11px;opacity:.75;margin-top:3px">${esc(read.why)}</div>` : ''}
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:10px;opacity:.85"><span>sure</span><div style="flex:1;height:4px;border-radius:2px;background:rgba(191,230,238,.15)"><div style="width:${Math.round(conf * 100)}%;height:100%;border-radius:2px;background:#bfe6ee"></div></div><span>${Math.round(conf * 100)}%</span></div>
    ${chips ? `<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px">${chips}</div>` : ''}
    ${read.jev?.note ? `<div style="margin-top:6px;font-size:11.5px;font-style:italic;color:#e9c27a">${esc(read.jev.note)}</div>` : `<div style="margin-top:6px;font-size:10.5px;opacity:.5">${read.jevOff === false ? "JEV didn't answer in time · rule read" : 'JEV area scan off (O → Den Systems)'}</div>`}</div>
    <div style="margin-top:7px;font-size:12px;color:#e9c27a">${L.sum ? `Lit: ${esc(L.sum)}` : 'Nothing needed lighting'}</div>
    <div style="display:flex;gap:6px;margin-top:7px">${B('⟲ Undo area', 'undo', '', false, 'flex:1')}<div style="flex:1.3">${W('✦ Autofill again', 'autofill', '', 'padding:5px 8px;font-size:12px')}</div></div>`
    : `${W('✦ Autofill', 'autofill')}<div style="font-size:10.5px;margin-top:5px;opacity:.6;text-align:center"><b>Y</b> arm · <b>click</b> or <b>J</b> scan · <b>Ctrl+Z</b> undo area</div>`;
  const autoPh = phase === 'autofill' || phase === 'scanning' || phase === 'done';
  memo = `<div id="light-editor" data-modal style="position:fixed;left:18px;top:50%;transform:translateY(-50%);width:300px;max-height:calc(100vh - 140px);overflow-y:auto;box-sizing:border-box;padding:12px 14px;border-radius:12px;background:rgba(40,26,16,.92);border:1px solid rgba(201,164,106,.65);box-shadow:4px 4px 0 rgba(20,12,6,.6);color:#f4e3c3;font:13px Georgia,serif;pointer-events:auto;z-index:70">
  <div style="display:flex;align-items:center;margin-bottom:6px"><span style="font-size:14px;letter-spacing:.14em;color:#e7b457;flex:1">ᚲ LIGHT EDITOR</span>${B('✕', 'close', '', false, 'padding:2px 8px')}</div>
  <div style="font-size:11px;opacity:.65;margin-bottom:8px">6th-century fire only. Ghost lamps are yours alone until you accept.</div>
  <div style="font-size:11px;letter-spacing:.12em;opacity:.75">RADIUS · ${ft} ft (${m} m)</div>
  <div style="display:flex;gap:6px;align-items:center;margin:4px 0">${slider}</div><div style="display:flex;gap:3px;margin-bottom:8px">${presets}</div>
  <div style="font-size:11px;letter-spacing:.12em;opacity:.75">DENSITY</div><div style="display:flex;gap:4px;margin:4px 0 8px">${densRow}</div>
  <div style="font-size:11px;letter-spacing:.12em;opacity:.75">PALETTE</div><div style="display:flex;flex-wrap:wrap;gap:3px;margin:4px 0 10px">${kindRow}</div>
  ${SCAN_CSS}<div style="margin-bottom:10px">${auto}</div>
  <div style="font-size:11px;letter-spacing:.12em;opacity:.6;margin-bottom:4px">MANUAL: TAG + PREVIEW</div>
  <div style="display:flex;gap:6px">${B(phase === 'tag' ? '◎ Tagging…' : '◎ Tag area', 'tag', '', phase === 'tag', 'flex:1')}${phase === 'tag' ? B('Drop here', 'drop', '', false, 'flex:1') : ''}${L.last && phase !== 'done' ? B('⟲ Undo area', 'undo', '', false, 'flex:1') : ''}</div>
  ${autoPh ? '' : `<div style="margin-top:10px;font-size:12px;color:#e9c27a">${head}</div>`}${picks ? `<div style="margin-top:4px">${picks}</div>` : ''}${meter}${act}
  ${L.note ? `<div style="margin-top:8px;font-size:11px;opacity:.8;font-style:italic">${esc(L.note)}</div>` : ''}</div>`;
  return memo;
}
