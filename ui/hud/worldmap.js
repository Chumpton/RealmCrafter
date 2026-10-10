// M: the painted storybook map of the whole island (creator 2026-10-09: "a complete overhead view of the map in a new
// style / cartoon painted, and the ability to select and rename zones"). The painting follows a straight-down sample of
// the terrain (docs/map/terrain-grid.json), so a world point maps onto it by FR. Zones are world.state.mapZones (ZONES
// until an editor touches one): every spot belongs to its nearest zone centre, the same split Replace All uses.
// Click a zone name to select it (its territory glows); editors rename, move, add or remove zones from the side card.
import { ZONES } from '../../scripts/lib/data/zones.js';
const IMG = '/cdn/value.735051b8fb389fdfc3796b4117bd808dfb56bacf9083487c0a6899a84bc7eefe.png';
const FR = { x0: -720, z0: -720, w: 2436, h: 1872 }; // metres the painting spans, north (-z) up
const u = (x) => (x - FR.x0) / FR.w, v = (z) => (z - FR.z0) / FR.h;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const GX = 64, GY = 49; // territory grid for the selected zone's glow
const CSS = `<style>
#wmap{position:fixed;left:50%;top:50%;transform:translate(-50%,-51%);width:min(1240px,calc(100vw - 120px),calc((100vh - 120px) * 1.3));aspect-ratio:1.3013/1;z-index:59;pointer-events:auto;
 padding:12px;border-radius:10px;background:linear-gradient(#6b4a2a,#3d2a17);box-shadow:inset 0 0 0 3px #c9a46a,inset 0 0 0 6px #4a3320,0 14px 50px rgba(0,0,0,.6)}
#wmap .pg{position:relative;width:100%;height:100%;background:url('${IMG}') center/100% 100% no-repeat;border-radius:5px;overflow:hidden;font-family:'Trebuchet MS','Comic Sans MS',sans-serif;cursor:default;container-type:size}
#wmap .pg.pick{cursor:crosshair}
#wmap .pg::after{content:'';position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 50px rgba(60,30,5,.35)}
#wmap .ban{position:absolute;left:50%;top:2.5%;transform:translateX(-50%);padding:5px 40px 7px;font:900 clamp(18px,2.2vw,30px) 'Trebuchet MS',sans-serif;letter-spacing:.06em;color:#fff7e0;
 background:linear-gradient(#c0452f,#8e2a1c);border:3px solid #3b1d10;border-radius:4px;box-shadow:0 3px 0 #3b1d10,0 6px 12px rgba(0,0,0,.35);text-shadow:0 2px 0 #3b1d10;clip-path:polygon(0 0,100% 0,95% 50%,100% 100%,0 100%,5% 50%);pointer-events:none}
#wmap .zl{position:absolute;transform:translate(-50%,-50%);padding:3px 10px 4px;padding:.27cqw .9cqw .36cqw;border-radius:999px;font:800 13px 'Trebuchet MS',sans-serif;font-size:1.173cqw;line-height:1.15;color:#3b2410;white-space:nowrap;cursor:pointer;z-index:2;
 background:rgba(255,246,222,.9);border:2px solid #5a3a1c;box-shadow:0 2px 0 #5a3a1c,0 3px 8px rgba(0,0,0,.25);transition:transform .12s}
#wmap .zl:hover{transform:translate(-50%,-50%) scale(1.08);background:#fff;z-index:4}
#wmap .zl.on{background:#ffd76a;border-color:#7a3d0a;color:#2a1504;transform:translate(-50%,-50%) scale(1.12);z-index:4}
#wmap .zd{position:absolute;width:7px;height:7px;margin:-3.5px 0 0 -3.5px;border-radius:50%;background:#5a3a1c;border:1.5px solid #fff3d6;z-index:2;pointer-events:none}
#wmap svg.ld{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
#wmap .go{position:absolute;transform:translate(-50%,0);display:flex;gap:6px;padding:6px;border-radius:10px;background:rgba(255,246,222,.97);border:2px solid #5a3a1c;box-shadow:0 3px 0 #5a3a1c,0 8px 18px rgba(0,0,0,.3);z-index:7}
#wmap .go.up{transform:translate(-50%,-100%)}
#wmap .go button{padding:6px 11px;border-radius:7px;border:2px solid #5a3a1c;background:#ffe9a8;color:#3b2410;font:800 12px 'Trebuchet MS',sans-serif;cursor:pointer;white-space:nowrap;box-shadow:0 2px 0 #5a3a1c}
#wmap .go button:hover{background:#ffd76a}
#wmap .go button.fl{background:#bfe0f2}
#wmap .go button.fl:hover{background:#8fcbec}
#wmap svg.ter{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen}
#wmap .me{position:absolute;width:0;height:0;z-index:4;pointer-events:none}
#wmap .me b{position:absolute;left:-10px;top:-10px;width:20px;height:20px;border-radius:50%;background:radial-gradient(circle,#fff 0 30%,#e8432b 32% 100%);border:2.5px solid #2a1504;box-shadow:0 0 0 4px rgba(255,255,255,.55);animation:wmP 1.6s ease-in-out infinite}
#wmap .me s{position:absolute;left:-1.5px;top:-32px;width:3px;height:22px;background:#2a1504;border-radius:2px;transform-origin:1.5px 32px}
#wmap .me em{position:absolute;left:15px;top:-11px;font:900 13px 'Trebuchet MS',sans-serif;color:#fff;text-shadow:0 0 3px #2a1504,0 0 3px #2a1504,0 2px 2px #2a1504;font-style:normal}
#wmap .pl{position:absolute;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;border-radius:50%;background:#4fb3ff;border:2px solid #10324d;z-index:3}
#wmap .x{position:absolute;right:-10px;top:-10px;width:34px;height:34px;border-radius:50%;border:3px solid #3b1d10;background:#ffd76a;color:#3b1d10;font:900 17px sans-serif;cursor:pointer;z-index:6;box-shadow:0 3px 0 #3b1d10}
#wmap .card{position:absolute;right:2%;top:12%;width:230px;padding:12px 12px 10px;border-radius:10px;background:rgba(255,246,222,.96);border:3px solid #5a3a1c;box-shadow:0 4px 0 #5a3a1c,0 8px 20px rgba(0,0,0,.3);color:#3b2410;font:700 12px 'Trebuchet MS',sans-serif;z-index:5}
#wmap .card h3{margin:0 0 2px;font:900 17px 'Trebuchet MS',sans-serif;color:#2a1504}
#wmap .card small{display:block;opacity:.7;margin-bottom:8px}
#wmap .card input{width:100%;box-sizing:border-box;padding:6px 8px;border-radius:6px;border:2px solid #5a3a1c;background:#fff;font:700 13px 'Trebuchet MS',sans-serif;color:#2a1504;margin-bottom:6px}
#wmap .card .row{display:flex;gap:5px;flex-wrap:wrap}
#wmap .card button{flex:1;padding:6px 6px;border-radius:6px;border:2px solid #5a3a1c;background:#ffe9a8;color:#3b2410;font:800 12px 'Trebuchet MS',sans-serif;cursor:pointer;box-shadow:0 2px 0 #5a3a1c}
#wmap .card button:hover{background:#ffd76a}
#wmap .card button.on{background:#7fd36a}
#wmap .card button.del{background:#f3b0a0}
#wmap .tools{position:absolute;left:2%;bottom:3%;display:flex;gap:6px;z-index:5}
#wmap .tools button{padding:6px 12px;border-radius:999px;border:2px solid #5a3a1c;background:rgba(255,246,222,.94);color:#3b2410;font:800 12px 'Trebuchet MS',sans-serif;cursor:pointer;box-shadow:0 2px 0 #5a3a1c}
#wmap .tools button.on{background:#7fd36a}
#wmap .hint{position:absolute;left:50%;bottom:3%;transform:translateX(-50%);padding:5px 14px;border-radius:999px;background:rgba(42,21,4,.82);color:#fff3d6;font:800 12px 'Trebuchet MS',sans-serif;z-index:5;pointer-events:none}
#wmap .rose{position:absolute;left:2.5%;top:3%;width:74px;height:74px;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))}
@keyframes wmP{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@media (max-width:1100px),(pointer:coarse){#wmap{width:96vw}#wmap .card{width:180px}#wmap .go button{padding:5px 8px;font-size:11px}}
</style>`;
const ROSE = `<svg class="rose" viewBox="-50 -50 100 100"><circle r="40" fill="#fff6de" stroke="#5a3a1c" stroke-width="4"/><path d="M0-44L9 0 0 6-9 0Z" fill="#c0452f" stroke="#3b1d10" stroke-width="2.5"/><path d="M0 44L9 0 0-6-9 0Z" fill="#fff6de" stroke="#3b1d10" stroke-width="2.5"/><text y="-22" text-anchor="middle" font-size="16" font-weight="900" font-family="Trebuchet MS,sans-serif" fill="#3b1d10">N</text></svg>`;
// Label layout (creator 2026-10-09: names overlapped): the page is laid out in a nominal box (the map at 1920x991) and the
// labels' font and padding scale with the page (cqw), so the same % layout holds at every size. Each label tries spots near
// its pin, nearest first, and takes the first that meets no placed label, pin, banner or rose; one moved far gets a leader line.
const NW = 1108, NH = 851, LH = 23, GAP = 3;
const cw = (ch) => (/[A-Z&]/.test(ch) ? 8.9 : ch === ' ' ? 3.9 : /[il.'I]/.test(ch) ? 4.2 : /[mw]/.test(ch) ? 11 : 7.3);
const textW = (t) => [...String(t ?? '')].reduce((a, ch) => a + cw(ch), 0) + 24;
const CAND = (() => { const c = [[0, -17], [0, 17]]; for (const r of [26, 38, 52, 68, 86, 106, 130, 160, 200]) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 - Math.PI / 2; c.push([Math.cos(a) * r * 1.5, Math.sin(a) * r]); } return c; })();
export function layoutLabels(Z) {
  const fixed = [{ x0: NW / 2 - 200, y0: 0, x1: NW / 2 + 200, y1: 62 }, { x0: 0, y0: 0, x1: 110, y1: 105 }];
  const pins = Z.map((q) => ({ x: u(q.x) * NW, y: v(q.z) * NH }));
  const hit = (a, b) => a.x0 < b.x1 + GAP && a.x1 + GAP > b.x0 && a.y0 < b.y1 + GAP && a.y1 + GAP > b.y0;
  const placed = [], out = [];
  // the crowded heart first (most neighbours within 90 px) so the open country takes the far spots, not the other way
  const order = Z.map((_, i) => i).filter((i) => pins[i].x > 0 && pins[i].x < NW && pins[i].y > 0 && pins[i].y < NH)
    .map((i) => [i, pins.filter((p) => Math.hypot(p.x - pins[i].x, p.y - pins[i].y) < 90).length]).sort((a, b) => a[1] - b[1] || a[0] - b[0]).map((a) => a[0]);
  for (const i of order) {
    const p = pins[i], w = textW(Z[i].name);
    let best = null;
    for (const [dx, dy] of CAND) {
      const cx = Math.max(w / 2 + 4, Math.min(NW - w / 2 - 4, p.x + dx)), cy = Math.max(LH / 2 + 4, Math.min(NH - LH / 2 - 4, p.y + dy));
      const b = { x0: cx - w / 2, y0: cy - LH / 2, x1: cx + w / 2, y1: cy + LH / 2 };
      if (fixed.some((f) => hit(b, f)) || placed.some((f) => hit(b, f))) continue;
      if (pins.some((q, j) => j !== i && q.x > b.x0 - 5 && q.x < b.x1 + 5 && q.y > b.y0 - 5 && q.y < b.y1 + 5)) continue;
      best = { ...b, cx, cy }; break;
    }
    if (!best) { const cx = p.x, cy = p.y - 17; best = { x0: cx - w / 2, y0: cy - LH / 2, x1: cx + w / 2, y1: cy + LH / 2, cx, cy }; }
    placed.push(best);
    out[i] = { ...best, w, px: p.x, py: p.y, far: Math.hypot(best.cx - p.x, best.cy - p.y) > 24 };
  }
  return out;
}
function zonesOf(ctx) { const z = ctx.world?.state?.mapZones; return Array.isArray(z) && z.length ? z : ZONES; }
function territory(Z, sel) {
  const q = Z[sel]; if (!q) return '';
  let r = '';
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const x = FR.x0 + (i + 0.5) * FR.w / GX, z = FR.z0 + (j + 0.5) * FR.h / GY;
    let b = 0, bd = Infinity; for (let k = 0; k < Z.length; k++) { const d = (x - Z[k].x) ** 2 + (z - Z[k].z) ** 2; if (d < bd) { bd = d; b = k; } }
    if (b === sel) r += `<rect x="${i}" y="${j}" width="1.04" height="1.04"/>`;
  }
  return `<svg class="ter" viewBox="0 0 ${GX} ${GY}" preserveAspectRatio="none"><g fill="rgba(255,214,90,.42)">${r}</g></svg>`;
}
export function worldMapHud(ctx, player, huginn = false) {
  if (!player?.state?.worldMap) return '';
  try {
    const Z = zonesOf(ctx), st = player.state.mapUi ?? {}, sel = Number.isInteger(st.sel) && Z[st.sel] ? st.sel : -1, mode = st.mode ?? null, ed = !!player.isEditor;
    const f = ctx.self?.feetPosition ?? player.feetPosition, yaw = ctx.session?.camFacing?.yaw ?? 0;
    const pc = (a) => Math.max(1, Math.min(99, a * 100)).toFixed(2);
    const inside = f && u(f.x) > 0 && u(f.x) < 1 && v(f.z) > 0 && v(f.z) < 1;
    const me = inside ? `<div class="me" style="left:${pc(u(f.x))}%;top:${pc(v(f.z))}%"><s style="transform:rotate(${(-yaw).toFixed(0)}deg)"></s><b></b><em>you</em></div>` : '';
    let others = '';
    for (const p of ctx.place?.players ?? []) { if (p.id === player.id || !p.feetPosition) continue; const a = u(p.feetPosition.x), b = v(p.feetPosition.z); if (a > 0 && a < 1 && b > 0 && b < 1) others += `<i class="pl" title="${esc(p.displayName)}" style="left:${pc(a)}%;top:${pc(b)}%"></i>`; }
    const L = layoutLabels(Z), P = (a, n) => (a / n * 100).toFixed(2);
    let labels = '', pinsH = '', lines = '';
    Z.forEach((q, i) => {
      const b = L[i]; if (!b) return;
      pinsH += `<i class="zd" style="left:${P(b.px, NW)}%;top:${P(b.py, NH)}%"></i>`;
      if (b.far) { const ex = Math.max(b.x0, Math.min(b.x1, b.px)), ey = Math.max(b.y0, Math.min(b.y1, b.py)); lines += `<line x1="${b.px.toFixed(1)}" y1="${b.py.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"/>`; }
      labels += `<div class="zl${i === sel ? ' on' : ''}" data-z="${i}" style="left:${P(b.cx, NW)}%;top:${P(b.cy, NH)}%" onclick="event.stopPropagation();sendAction('mapZone',{op:'sel',i:${i}})">${esc(q.name)}</div>`;
    });
    const leaders = lines ? `<svg class="ld" viewBox="0 0 ${NW} ${NH}" preserveAspectRatio="none"><g stroke="#3b2410" stroke-width="1.6" stroke-dasharray="3 2" opacity=".75" vector-effect="non-scaling-stroke">${lines}</g></svg>` : '';
    // the travel choice, under (or over) the picked name: Teleport is a blink, Gryphon flight is Wynx carrying you there
    let go = '';
    if (sel >= 0 && L[sel] && !mode) {
      const b = L[sel], up = b.y1 + 52 > NH, x = Math.max(130, Math.min(NW - 130, b.cx));
      go = `<div class="go${up ? ' up' : ''}" onclick="event.stopPropagation()" style="left:${P(x, NW)}%;top:${P(up ? b.y0 - 6 : b.y1 + 6, NH)}%"><button class="tp" onclick="sendAction('mapZone',{op:'tp',i:${sel}},{relockPointer:true})">✨ Teleport</button><button class="fl" onclick="sendAction('mapZone',{op:'fly',i:${sel}},{relockPointer:true})">🦅 Gryphon flight</button></div>`;
    }
    // a click on the painting itself: places the moved / new zone when a pick mode is on, else clears the selection
    const pick = `(function(e,el){var r=el.getBoundingClientRect();sendAction('mapZone',{op:'click',u:(e.clientX-r.left)/r.width,v:(e.clientY-r.top)/r.height})})(event,this)`;
    let card = '';
    if (sel >= 0 && ed) {
      const q = Z[sel];
      card = `<div class="card" onclick="event.stopPropagation()"><h3>${esc(q.name)}</h3><small>zone ${sel + 1} of ${Z.length} · centre ${Math.round(q.x)}, ${Math.round(q.z)}</small>`
        + `<input id="wmz-name" maxlength="32" value="${esc(q.name)}" placeholder="zone name" onkeydown="event.stopPropagation();if(event.key==='Enter')sendAction('mapZone',{op:'rename',i:${sel},name:this.value})" onkeyup="event.stopPropagation()">`
        + `<div class="row"><button onclick="sendAction('mapZone',{op:'rename',i:${sel},name:document.getElementById('wmz-name').value})">✎ Rename</button>`
        + `<button class="${mode === 'move' ? 'on' : ''}" onclick="sendAction('mapZone',{op:'mode',mode:'move'})">✥ Move</button></div>`
        + `<div class="row" style="margin-top:5px"><button class="del" onclick="sendAction('mapZone',{op:'del',i:${sel}})">✕ Remove</button></div>`
        + `</div>`;
    }
    const tools = ed ? `<div class="tools" onclick="event.stopPropagation()"><button class="${mode === 'add' ? 'on' : ''}" onclick="sendAction('mapZone',{op:'mode',mode:'add'})">＋ New zone</button>${huginn ? `<button onclick="sendAction('huginnMap',{huginn:true})">◉ HUGINN</button>` : ''}${ctx.world?.state?.mapZones ? `<button onclick="sendAction('mapZone',{op:'reset'})">↺ Original zones</button>` : ''}</div>` : '';
    const hint = mode === 'move' ? 'click the map where this zone\'s heart should be' : mode === 'add' ? 'click the map to plant a new zone' : (sel < 0 ? 'click a zone name to travel there' : '');
    return CSS + `<div id="wmap" data-modal><button class="x" title="Close (M)" onclick="sendAction('huginnMap')">✕</button><div class="pg${mode ? ' pick' : ''}" onclick="${pick}">`
      + (sel >= 0 ? territory(Z, sel) : '') + ROSE + `<div class="ban">MELLOWBROOK</div>` + leaders + pinsH + labels + others + me + go + card + tools
      + (hint ? `<div class="hint">${hint}</div>` : '') + `</div></div>`;
  } catch (e) { return ''; }
}
