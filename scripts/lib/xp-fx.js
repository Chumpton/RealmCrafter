// OSRS XP tracker for the page: a TOTAL XP counter at the top, XP DROPS that fall from it for every gain (any skill, any source),
// and XP GLOBES, one per recently trained skill, each a ring showing the way to the next level. It listens to the room's uiEvent "xp"
// { skill, xpTenths (gained), tenths (the skill's new total), all (every skill's total), level, up } sent by skills-player.js grant().
// Gains under 1 XP (running, jumping) collect until they make a whole point. Never throws.
import { SKILL_LIST } from './data/skills.js';
import { progress } from './skills-core.js';
import { esc } from './esc.js';
const RAIL = 'calc(var(--spawn-chrome-reservation-right-inset, 50px) + 24px)';
const STYLE = `
#xp-layer{position:fixed;inset:0;pointer-events:none;z-index:8;font-family:Georgia,serif}
#xp-counter{position:absolute;left:50%;top:calc(var(--spawn-safe-area-top,0px) + 66px);transform:translateX(-50%);display:none;width:134px;height:36px;background:rgba(80,70,56,.88);border:1px solid #22201a;box-shadow:inset 0 0 0 1px rgba(120,102,73,.55);box-sizing:border-box}
#xp-counter.on{display:block}
#xp-counter i{position:absolute;left:5px;top:3px;width:24px;height:24px;font-style:normal;font-size:20px;line-height:24px;text-align:center;filter:drop-shadow(1px 1px 0 #000)}
#xp-counter canvas{position:absolute;right:3px;top:2px;width:102px;height:22px;image-rendering:pixelated}
#xp-counter em{position:absolute;left:3px;right:3px;bottom:3px;height:7px;background:#000;border:1px solid #22201a;box-sizing:border-box}
#xp-counter em u{position:absolute;left:0;top:0;bottom:0;width:0;background:#279600;border-right:1px solid #0e3700}
#xp-setup{position:absolute;left:50%;top:calc(var(--spawn-safe-area-top,0px) + 108px);transform:translateX(-50%);display:none;pointer-events:auto;width:228px;background:rgba(80,70,56,.96);border:2px solid #22201a;box-shadow:inset 0 0 0 1px #786649;padding:6px;font:12px 'Trebuchet MS',sans-serif;color:#ff981f;z-index:9}
#xp-setup.on{display:block}
#xp-setup h4{margin:0 0 5px;font:700 13px 'Trebuchet MS',sans-serif;text-align:center;color:#ff981f}
#xp-setup .g{display:grid;grid-template-columns:repeat(6,1fr);gap:3px}
#xp-setup button{height:30px;border:1px solid #22201a;background:#3a3329;color:#fff;font-size:17px;cursor:pointer;padding:0}
#xp-setup button:hover{background:#51473a}#xp-setup button.sel{background:#6b2a22;box-shadow:inset 0 0 0 1px #ff981f}
#xp-setup .row{display:flex;gap:4px;margin-top:5px}#xp-setup .row button{flex:1;font:12px 'Trebuchet MS',sans-serif;color:#ff981f}
#xp-drops{position:absolute;left:50%;top:calc(var(--spawn-safe-area-top,0px) + 96px);width:0;height:0}
.xd{position:absolute;left:0;top:0;display:flex;align-items:center;gap:5px;white-space:nowrap;font:800 var(--fs,19px) 'Courier New',monospace;color:#fff;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,0 0 6px rgba(0,0,0,.8);animation:xdFall var(--t,2.3s) forwards}
.xd i{font-style:normal;font-size:1.05em;filter:drop-shadow(0 1px 0 #000)}
.xd.big{color:#ffe08a;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,0 0 12px rgba(255,190,60,.95)}
.xd.lvl{color:#9dffb0;text-shadow:1px 1px 0 #000,-1px 1px 0 #000,0 0 14px rgba(80,255,140,.95)}
@keyframes xdFall{
 0%{opacity:0;transform:translate(calc(var(--x) - 50%),-8px) scale(.3) rotate(-6deg);animation-timing-function:cubic-bezier(.2,1.8,.4,1)}
 9%{opacity:1;transform:translate(calc(var(--x) - 50%),2px) scale(1.28) rotate(2deg);animation-timing-function:ease-out}
 17%{opacity:1;transform:translate(calc(var(--x) - 50%),6px) scale(1) rotate(0);animation-timing-function:cubic-bezier(.45,0,.95,.55)}
 80%{opacity:1;transform:translate(calc(var(--x) - 50% + var(--sway)),calc(var(--fall) * .8)) scale(.95)}
 100%{opacity:0;transform:translate(calc(var(--x) - 50% + var(--sway) * 1.4),var(--fall)) scale(.85)}}
#xp-globes{position:absolute;left:calc(50% + 150px);top:calc(var(--spawn-safe-area-top,0px) + 62px);display:flex;gap:8px;max-width:calc(50vw - 150px - ${RAIL});flex-wrap:wrap}
.xg{position:relative;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#4b3624,#1c1209);box-shadow:0 0 0 2px #120b06,0 0 0 4px #ba8950,0 4px 0 4px rgba(20,12,6,.55);animation:xgIn .5s cubic-bezier(.3,1.9,.5,1) both;transition:opacity .6s,transform .6s}
.xg.out{opacity:0;transform:translateY(-10px) scale(.7)}
.xg svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}
.xg circle{fill:none;stroke-width:4}
.xg .tr{stroke:#2a1d13}.xg .pr{stroke:#e8b64a;stroke-linecap:butt;transition:stroke-dashoffset .7s cubic-bezier(.3,1.2,.5,1);filter:drop-shadow(0 0 3px rgba(255,200,80,.7))}
.xg .ic{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;filter:drop-shadow(0 1px 0 #000)}
.xg .lv{position:absolute;right:-5px;bottom:-5px;min-width:19px;height:19px;border-radius:10px;background:#1c1209;border:1.5px solid #ba8950;color:#ffe9a8;font:700 11px/16px sans-serif;text-align:center}
.xg.pulse{animation:xgPulse .5s cubic-bezier(.3,1.9,.5,1)}
@keyframes xgIn{0%{opacity:0;transform:scale(.2) rotate(-90deg)}100%{opacity:1;transform:none}}
@keyframes xgPulse{0%{transform:scale(1)}30%{transform:scale(1.22);filter:brightness(1.5)}100%{transform:scale(1);filter:none}}
.xg.up{animation:xgUp .9s ease-out}
@keyframes xgUp{0%{transform:scale(1)}20%{transform:scale(1.4) rotate(12deg);filter:brightness(2) drop-shadow(0 0 12px #9dffb0)}60%{transform:scale(1.15) rotate(-6deg)}100%{transform:scale(1);filter:none}}
.xs{position:absolute;left:0;top:0;width:6px;height:6px;border-radius:50%;background:#ffd27a;box-shadow:0 0 8px #ffb25a;animation:xsFly .8s cubic-bezier(.2,.8,.4,1) forwards}
@keyframes xsFly{from{opacity:1;transform:translate(0,0)}to{opacity:0;transform:translate(var(--dx),var(--dy))}}
@media (prefers-reduced-motion:reduce){.xd{animation-duration:1.2s}.xg,.xg.pulse,.xg.up,#xp-counter.hot{animation:none}}`;
const ICON = (id) => SKILL_LIST.find((k) => k.id === id)?.icon ?? '✦';
const NAME = (id) => SKILL_LIST.find((k) => k.id === id)?.name ?? id;
let layer = null, off = null, total = 0, shown = 0, raf = 0, lane = 0, hotT = 0, lastTick = 0;
const pend = Object.create(null), globes = new Map(), R = 19, C = 2 * Math.PI * R;
const fmt = (n) => Math.floor(n).toLocaleString('en-US');
function blip(f, d = 0.07, type = 'square', v = 0.04) {
  try {
    if (typeof audio === 'undefined' || !audio?.context) return;
    const ac = audio.context, bus = audio.bus?.('UI') ?? ac.destination, o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.02);
  } catch (e) {}
}
// the OSRS XP counter: XP gained since the last reset (all skills, or the one skill picked in the setup grid), the skill's icon and its level bar
const PLAIN = '/cdn/value.f107bd4b9871595ce1fdfdcb7cbff80827e2504b81011c08f3cf998bc1e9ceea.png?data';
const ADV = { 0: 8, 1: 6, 2: 8, 3: 7, 4: 7, 5: 7, 6: 8, 7: 7, 8: 8, 9: 8, ',': 4 };
let atlas = null, on = false, track = '', lastSkill = '', sessXp = Object.create(null), skillsT = Object.create(null), white = null, black = null;
function loadAtlas() { if (atlas) return; atlas = new Image(); atlas.onload = () => draw(); atlas.src = PLAIN; }
function glyph(col) { const c = document.createElement('canvas'); c.width = 1330; c.height = 22; const g = c.getContext('2d'); g.drawImage(atlas, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 1330, 22); return c; }
function draw() {
  const root = layer?.querySelector('#xp-counter'); if (!root) return;
  root.classList.toggle('on', on);
  const sk = track || lastSkill, tenths = track ? (sessXp[track] | 0) : Object.values(sessXp).reduce((a, v) => a + (v | 0), 0);
  root.querySelector('i').textContent = sk ? ICON(sk) : '✦';
  const pr = sk && typeof skillsT[sk] === 'number' ? progress(skillsT[sk]) : null; root.querySelector('u').style.width = pr ? Math.round((pr.level >= 99 ? 1 : pr.pct) * 100) + '%' : '0%';
  const cv = root.querySelector('canvas'), cx = cv.getContext('2d'); cx.clearRect(0, 0, 102, 22);
  if (!atlas) { loadAtlas(); return; } if (!atlas.complete || !atlas.naturalWidth) return;
  white = white || glyph('#ffffff'); black = black || glyph('#000000');
  const str = fmt(tenths / 10); let w = 0; for (const ch of str) w += ADV[ch] ?? 7; let pen = 100 - w;
  for (const ch of str) { const i = ch.charCodeAt(0) - 32; cx.drawImage(black, i * 14, 0, 14, 22, pen + 1, 1, 14, 22); cx.drawImage(white, i * 14, 0, 14, 22, pen, 0, 14, 22); pen += ADV[ch] ?? 7; }
}
// called with the player's saved settings on every HUD paint: the counter's switch and the tracked skill
export function xpFeed(settings) {
  try {
    const nOn = !!settings?.xpCounter, i = settings?.xpTrack | 0, nT = i > 0 ? SKILL_LIST[i - 1]?.id ?? '' : '';
    if (nOn !== on || nT !== track || !atlas) { on = nOn; track = nT; draw(); }
    const g = layer?.querySelector('#xp-setup'); if (g?.classList.contains('on')) paintSetup(g);
  } catch (e) {}
}
function paintSetup(g) {
  g.innerHTML = `<h4>XP counter</h4><div class="g">${SKILL_LIST.map((k, i) => `<button class="${track === k.id ? 'sel' : ''}" title="${esc(k.name)}" data-i="${i + 1}">${esc(k.icon)}</button>`).join('')}</div><div class="row"><button class="${track ? '' : 'sel'}" data-i="0">All skills</button><button data-reset="1">Reset</button><button data-close="1">Close</button></div>`;
  g.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
    if (b.dataset.close) { g.classList.remove('on'); return; }
    if (b.dataset.reset) { sessXp = Object.create(null); draw(); return; }
    if (typeof sendAction === 'function') sendAction('setSetting', { id: 'xpTrack', v: +b.dataset.i }); };
}
export function xpSetup() { const g = layer?.querySelector('#xp-setup'); if (!g) return; g.classList.toggle('on'); if (g.classList.contains('on')) paintSetup(g); }
function drop(skill, tenths, kind) {
  const box = layer?.querySelector('#xp-drops'); if (!box) return;
  const xp = tenths / 10, big = xp >= 100, el = document.createElement('div');
  lane = (lane + 1) % 4; const x = [-62, -20, 22, 64][lane] + (Math.random() * 12 - 6);
  el.className = `xd${big ? ' big' : ''}${kind === 'lvl' ? ' lvl' : ''}`;
  el.style.cssText = `--x:${x}px;--sway:${(Math.random() * 30 - 15) | 0}px;--fall:${190 + (Math.random() * 40) | 0}px;--fs:${Math.min(30, 17 + Math.log10(Math.max(1, xp)) * 4.5) | 0}px;--t:${(2.1 + Math.random() * 0.4).toFixed(2)}s`;
  el.innerHTML = `<i>${esc(ICON(skill))}</i><span>${kind === 'lvl' ? 'LEVEL UP!' : '+' + (xp >= 10 ? fmt(xp) : xp.toFixed(xp % 1 ? 1 : 0))}</span>`;
  box.appendChild(el); setTimeout(() => el.remove(), 2700);
  while (box.children.length > 14) box.firstChild.remove();
}
function sparks(host, n) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 40, s = document.createElement('i'); s.className = 'xs'; s.style.cssText = `--dx:${Math.cos(a) * r | 0}px;--dy:${Math.sin(a) * r | 0}px;left:50%;top:50%`; host.appendChild(s); setTimeout(() => s.remove(), 900); }
}
function globe(skill, tenths, level, up) {
  const row = layer?.querySelector('#xp-globes'); if (!row) return;
  const pr = progress(tenths), dash = C * (1 - (pr.level >= 99 ? 1 : pr.pct));
  let g = globes.get(skill);
  if (!g) {
    const el = document.createElement('div'); el.className = 'xg'; el.title = `${NAME(skill)} ${pr.level}`;
    el.innerHTML = `<svg viewBox="0 0 46 46"><circle class="tr" cx="23" cy="23" r="${R}"/><circle class="pr" cx="23" cy="23" r="${R}" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${C.toFixed(2)}"/></svg><div class="ic">${esc(ICON(skill))}</div><div class="lv">${pr.level}</div>`;
    row.appendChild(el); g = { el, t: 0 }; globes.set(skill, g);
    requestAnimationFrame(() => requestAnimationFrame(() => { g.el.querySelector('.pr').style.strokeDashoffset = dash.toFixed(2); }));
    while (globes.size > 6) { const [k, v] = globes.entries().next().value; v.el.remove(); globes.delete(k); }
  } else {
    g.el.querySelector('.pr').style.strokeDashoffset = dash.toFixed(2); g.el.querySelector('.lv').textContent = pr.level; g.el.title = `${NAME(skill)} ${pr.level}`;
    g.el.classList.remove('pulse', 'up', 'out'); void g.el.offsetWidth; g.el.classList.add(up ? 'up' : 'pulse');
  }
  if (up) sparks(g.el, 14);
  clearTimeout(g.t); g.t = setTimeout(() => { g.el.classList.add('out'); setTimeout(() => { g.el.remove(); if (globes.get(skill) === g) globes.delete(skill); }, 650); }, 9000);
}
function onGain(p) {
  if (!layer || !p?.skill) return;
  const skill = p.skill, gained = p.xpTenths | 0, up = Array.isArray(p.up) && p.up.length > 0;
  if (gained > 0) {
    pend[skill] = (pend[skill] | 0) + gained;
    if (pend[skill] >= 10 || up) { drop(skill, pend[skill], 'xp'); pend[skill] = 0; const now = performance.now(); if (now - lastTick > 70) { lastTick = now; blip(560 + (skill.length * 37) % 260, 0.06); } }
  }
  if (typeof p.tenths === 'number') skillsT[skill] = p.tenths;
  if (gained > 0) { sessXp[skill] = (sessXp[skill] | 0) + gained; lastSkill = skill; draw(); }
  if (typeof p.tenths === 'number') globe(skill, p.tenths, p.level | 0, up);
  if (up) { setTimeout(() => drop(skill, 0, 'lvl'), 160); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'triangle', 0.06), i * 90)); sparks(layer.querySelector('#xp-counter'), 18); }
}
export function mountXp(container, player) {
  try {
    unmountXp();
    const doc = container?.ownerDocument ?? document;
    layer = doc.createElement('div'); layer.id = 'xp-layer';
    layer.innerHTML = `<style>${STYLE}</style><div id="xp-counter"><i>✦</i><canvas width="102" height="22"></canvas><em><u></u></em></div><div id="xp-setup"></div><div id="xp-globes"></div><div id="xp-drops"></div>`;
    (container ?? doc.body).appendChild(layer);
    const sk = player?.state?.skills; skillsT = Object.assign(Object.create(null), sk && typeof sk === 'object' ? sk : {}); sessXp = Object.create(null); lastSkill = ''; draw();
    off = window.spawn?.on?.('event', (name, p) => { if (name === 'xp' && p) { try { onGain(p); } catch (e) {} } });
  } catch (e) {}
}
export function unmountXp() { try { if (typeof off === 'function') off(); cancelAnimationFrame(raf); layer?.remove?.(); } catch (e) {} off = null; layer = null; globes.clear(); }
