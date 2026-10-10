// DEV TEAM TRACKER lane 5: reactions juice (docs/board/DEV-TRACKER-PLAN-2026-10-06.md).
// reactRow(entry, player) draws the hover pill + the chips row inside lane 4's .db-react-slot.
// The first reactRow on the page installs (once) the style, a pointerdown ear and the uiEvent ear
// for 'devbook:react': the chip spring, the icon burst and the per-emoji pop all play here, in the HUD.
import { JEV_FACE } from './devbook-jev.js';
export const REACT_ICONS = {
  heart: '/cdn/value.71a539a163659ac8126ad36c469e6ec54759674426f8bd24652c304938ef2ea0.png',
  fire: '/cdn/value.4f02351467dc7d69c8c9c99fe5682fb6e000873ec90239fb654da184e992c7d5.png',
  thumbs: '/cdn/value.a6674800120080b1055987caa9a8404565ec1fc8338234dd07c69f4b01829cfe.png',
  laugh: '/cdn/value.bbcf5668931f4f562ced69d624a4bc0d07fb43febb0cc01bd19e8116e5d15ef1.png',
  wow: '/cdn/value.6583e117feba2dc6076b931285716c03edf41d029705fda3c19274e9a6814709.png',
  sad: '/cdn/value.0af4562b18bbf5e085f8adbad651d3ef30beab8262c0b079a0192f75d9739bbf.png',
  mad: '/cdn/value.89ff1380d0c167a3586108a551d7adc03163fded820d980a0636c906e0aa3c4f.png',
  axe: '/cdn/value.57290b0d5977d5d57170306c74d217ee7d18a1724a3aa0f0ad92b87fa4c03608.png',
};
export const REACT_IDS = ['heart', 'fire', 'thumbs', 'laugh', 'wow', 'sad', 'mad', 'axe'];
export const REACT_NAMES = { heart: 'Love', fire: 'Fire', thumbs: 'Nice', laugh: 'Haha', wow: 'Wow', sad: 'Sad', mad: 'Grr', axe: 'Chop!' };
// pitch per emoji rides on top of each one's own conjured pop
const POP_RATE = { heart: 1.0, fire: 0.92, thumbs: 1.06, laugh: 1.14, wow: 1.22, sad: 0.84, mad: 0.78, axe: 0.9 };
export const SFX = {
  open: '/cdn/moodboard-painterly-fantasy/sfx-book-open-creak.mp3',
  page: '/cdn/moodboard-painterly-fantasy/sfx-page-turn.mp3',
  pop: Object.fromEntries(REACT_IDS.map((e) => [e, `/cdn/moodboard-toon-vibrant/sfx-react-pop-${e}.mp3`])),
};
const BURST_MS = 860; // every burst element is gone by then (≤ 900 ms)

const escH = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const domId = (id) => String(id ?? '').replace(/[^A-Za-z0-9_-]/g, '_');
// a seeded draw for the burst: the HUD never touches Math.random
export function hashSeed(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// 8–12 particles: each an arc (x linear, y up then falling) with spin, size and a stagger
export function burstSpec(seed) {
  const r = rng(seed), n = 8 + Math.floor(r() * 5), out = [];
  for (let i = 0; i < n; i++) {
    const side = (i % 2 ? 1 : -1), spread = (i / n) * 0.8 + r() * 0.2;
    out.push({ dx: Math.round(side * (14 + spread * 78)), up: -Math.round(40 + r() * 60), fall: Math.round(50 + r() * 70), rot: Math.round((r() * 2 - 1) * 260), s: +(0.55 + r() * 0.6).toFixed(2), delay: Math.round(r() * 70) });
  }
  return out;
}
export function whoTitle(emoji, rx) {
  const who = (rx?.who ?? []).map((w) => (w === 'JEV' ? 'JEV ᛃ' : w));
  const n = rx?.n ?? who.length;
  return `${REACT_NAMES[emoji] ?? emoji} · ${n}${who.length ? ' — ' + who.join(', ') : ''}`;
}
// access = devbookAccess(ctx.world.state, player) from scripts/lib/devbook-access.js (lane 4 passes it); without it, editors only
export const canReact = (player, access) => (access && typeof access.react === 'boolean' ? access.react : !!(player?.isEditor || player?.state?.devbook?.canReact));
const act = (op, id, emoji) => escH(`event.stopPropagation();sendAction('devbook',${JSON.stringify({ op, id, emoji })})`);

export function reactRow(entry, player, access) {
  if (!entry || entry.id == null) return '';
  install();
  const id = entry.id, did = domId(id), rx = entry.reacts ?? {}, can = canReact(player, access), jevPick = entry.jev?.emoji;
  const chips = REACT_IDS.filter((e) => (rx[e]?.n ?? 0) > 0).map((e) => {
    const r = rx[e], mine = !!r.mine, jev = (r.who ?? []).includes('JEV');
    const click = can ? ` onclick="${act(mine ? 'unreact' : 'react', id, e)}" data-dbr="${escH(e)}" data-dbr-id="${escH(id)}"` : '';
    return `<button type="button" id="dbr-c-${did}-${e}" class="dbr-chip${mine ? ' mine' : ''}${jev ? ' jev' : ''}${can ? '' : ' ro'}" title="${escH(whoTitle(e, r))}"${click}><img src="${REACT_ICONS[e]}" alt="" draggable="false"><span class="dbr-nw"><span id="dbr-n-${did}-${e}-${r.n}" class="dbr-n">${r.n}</span></span>${jev ? `<i class="dbr-rune">${JEV_FACE}</i>` : ''}</button>`;
  }).join('');
  const pill = can ? `<div class="dbr-pill" role="toolbar">${REACT_IDS.map((e, i) => {
    const mine = !!rx[e]?.mine;
    return `<button type="button" class="dbr-pick${mine ? ' mine' : ''}${jevPick === e ? ' jevpick' : ''}" style="--i:${i}" title="${escH(REACT_NAMES[e] + (jevPick === e ? ' · JEV\'s pick' : ''))}" data-dbr="${e}" data-dbr-id="${escH(id)}" onclick="${act(mine ? 'unreact' : 'react', id, e)}"><img src="${REACT_ICONS[e]}" alt="${e}" draggable="false"></button>`;
  }).join('')}</div>` : '';
  const add = can ? `<button type="button" class="dbr-add" title="React" onclick="event.stopPropagation()"><img src="${REACT_ICONS.heart}" alt="" draggable="false"><b>+</b></button>` : '';
  return `<div class="dbr" id="dbr-${did}">${pill}${chips}${add}</div>`;
}

const STONE = '#3e3529', STONE_HI = '#6b5b45', STONE_LO = '#1f1a12', PARCH = '#d8c8a0', INK = '#5a2410', GOLD = '#ffcf3a';
export const REACT_CSS = `<style id="dbr-css">
.dbr{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:4px;min-height:22px;font-family:inherit}
.dbr-chip,.dbr-add{display:inline-flex;align-items:center;gap:3px;height:22px;padding:0 6px 0 3px;border-radius:11px;background:${PARCH};color:${INK};border:1px solid #8a6a3e;box-shadow:inset 0 1px 0 #f0e4c0,0 1px 0 rgba(0,0,0,.35);font:700 12px/1 inherit;cursor:pointer;transform-origin:50% 80%;transition:transform .12s cubic-bezier(.34,1.56,.64,1),box-shadow .12s;position:relative}
.dbr-chip.ro{cursor:default}
.dbr-chip:not(.ro):hover,.dbr-add:hover{transform:translateY(-1px) scale(1.08)}
.dbr-chip:not(.ro):active,.dbr-add:active{transform:scale(.92)}
.dbr-chip img{width:16px;height:16px;object-fit:contain;pointer-events:none}
.dbr-chip.mine{border-color:#b8860b;box-shadow:0 0 0 2px ${GOLD},inset 0 1px 0 #fff3c8,0 0 8px rgba(255,200,40,.55);background:#ecdcab}
.dbr-chip.jev{background-image:radial-gradient(circle at 85% 20%,rgba(120,190,255,.35),transparent 55%)}
.dbr-rune{font-style:normal;font-size:10px;color:#2a5f9e;text-shadow:0 0 4px rgba(120,190,255,.9);margin-left:1px}
.dbr-nw{display:inline-block;perspective:60px;min-width:8px;text-align:center}
.dbr-n{display:inline-block;animation:dbrFlip .42s cubic-bezier(.34,1.56,.64,1)}
@keyframes dbrFlip{0%{transform:rotateX(90deg);opacity:0}60%{transform:rotateX(-20deg);opacity:1}100%{transform:none}}
.dbr-add{padding:0 5px 0 3px;opacity:.55}
.dbr-add img{width:14px;height:14px;filter:grayscale(1) brightness(.8)}
.dbr-add b{font-size:12px;color:${INK}}
*:has(> .db-react-slot):hover .dbr-add,.dbr:hover .dbr-add,.dbr-add:focus{opacity:1}
.dbr-pill{position:absolute;left:-4px;bottom:calc(100% + 6px);z-index:30;display:flex;gap:2px;padding:4px 6px;border-radius:24px;background:${PARCH};border:2px solid ${STONE};box-shadow:0 0 0 1px ${STONE_HI},inset 0 0 0 1px ${STONE_LO},inset 0 2px 0 #efe2bd,0 6px 14px rgba(0,0,0,.45),3px 3px 0 rgba(0,0,0,.35);transform-origin:18px 100%;visibility:hidden;transform:scale(0);pointer-events:none}
*:has(> .db-react-slot):hover .dbr-pill,.dbr:hover .dbr-pill,.dbr:focus-within .dbr-pill{visibility:visible;pointer-events:auto;animation:dbrPill .34s cubic-bezier(.2,.9,.3,1) both}
@keyframes dbrPill{0%{transform:scale(0);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
.dbr-pick{position:relative;width:34px;height:34px;padding:0;border:0;background:none;cursor:pointer;display:grid;place-items:center}
*:has(> .db-react-slot):hover .dbr-pick,.dbr:hover .dbr-pick,.dbr:focus-within .dbr-pick{animation:dbrIcon .32s calc(var(--i) * 30ms) cubic-bezier(.34,1.7,.5,1) both}
@keyframes dbrIcon{0%{transform:translateY(14px) scale(0);opacity:0}70%{transform:translateY(-3px) scale(1.12);opacity:1}100%{transform:none}}
.dbr-pick img{width:30px;height:30px;object-fit:contain;pointer-events:none;transition:transform .16s cubic-bezier(.34,1.56,.64,1),filter .16s;transform-origin:50% 90%;filter:drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.dbr-pick:hover{z-index:2}
.dbr-pick:hover img{transform:scale(1.5) translateY(-7px);animation:dbrBob .5s .16s ease-in-out infinite alternate;filter:drop-shadow(0 5px 3px rgba(0,0,0,.35))}
@keyframes dbrBob{from{transform:scale(1.5) translateY(-7px)}to{transform:scale(1.5) translateY(-11px)}}
.dbr-pick:hover::after{content:attr(title);position:absolute;bottom:calc(100% + 14px);left:50%;transform:translateX(-50%);white-space:nowrap;padding:2px 6px;background:${STONE};color:${GOLD};border:1px solid ${STONE_HI};font:700 11px/1.2 inherit;text-shadow:1px 1px 0 #000;pointer-events:none}
.dbr-pick.mine::before{content:'';position:absolute;bottom:0;left:50%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:${GOLD};box-shadow:0 0 4px ${GOLD}}
.dbr-pick.jevpick img{filter:drop-shadow(0 0 4px rgba(120,190,255,.95)) drop-shadow(0 2px 0 rgba(0,0,0,.35))}
.dbr-spring{animation:dbrSpring .55s cubic-bezier(.3,1.6,.5,1) both!important}
@keyframes dbrSpring{0%{transform:scale(.2,.2)}30%{transform:scale(1.45,.7)}50%{transform:scale(.8,1.3)}70%{transform:scale(1.12,.92)}85%{transform:scale(.97,1.04)}100%{transform:scale(1)}}
.dbr-shrink{animation:dbrShrink .3s ease-in both!important}
@keyframes dbrShrink{40%{transform:scale(1.15,.85)}100%{transform:scale(.6);opacity:.5}}
.dbr-fx{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483000}
.dbr-px{position:absolute;left:0;top:0;animation:dbrPx var(--t,.8s) linear var(--d,0ms) both}
.dbr-py{animation:dbrPy var(--t,.8s) var(--d,0ms) both}
.dbr-py img{display:block;width:22px;height:22px;margin:-11px 0 0 -11px;transform:scale(var(--s,1)) rotate(0);animation:dbrPr var(--t,.8s) ease-out var(--d,0ms) both}
@keyframes dbrPx{from{transform:translateX(0)}to{transform:translateX(var(--dx))}}
@keyframes dbrPy{0%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.4,1)}38%{transform:translateY(var(--up));animation-timing-function:cubic-bezier(.5,0,.9,.5)}100%{transform:translateY(var(--fall))}}
@keyframes dbrPr{0%{transform:scale(.2) rotate(0);opacity:1}25%{transform:scale(var(--s)) rotate(calc(var(--r) * .3));opacity:1}70%{opacity:1}100%{transform:scale(calc(var(--s) * .7)) rotate(var(--r));opacity:0}}
.dbr-ghost{position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;animation:dbrGhost .42s ease-in both}
@keyframes dbrGhost{0%{transform:scale(1);opacity:1}35%{transform:scale(1.25,.8)}100%{transform:scale(0) rotate(-40deg);opacity:0}}
.dbr-puff{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:radial-gradient(circle,#f3ead2 0,#cbb994 55%,rgba(160,140,110,0) 72%);animation:dbrPuff .55s ease-out var(--d,0ms) both}
@keyframes dbrPuff{0%{transform:translate(0,0) scale(.3);opacity:.9}100%{transform:translate(var(--dx),var(--dy)) scale(1.8);opacity:0}}
.dbr-ring{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:3px solid ${GOLD};animation:dbrRing .45s ease-out both}
@keyframes dbrRing{0%{transform:scale(.3);opacity:1}100%{transform:scale(3.2);opacity:0;border-width:1px}}
@media (prefers-reduced-motion:reduce){.dbr-pick:hover img{animation:none}.dbr-fx{display:none}}
</style>`;

// ---------- page side (never runs under node) ----------
let installed = false, lastPick = null, burstN = 0;
function layer() {
  let el = document.getElementById('dbr-fx');
  if (!el) { el = document.createElement('div'); el.id = 'dbr-fx'; el.className = 'dbr-fx'; (document.getElementById('tome-game-mount') ?? document.body).appendChild(el); }
  return el;
}
export function playSfx(ref, rate = 1, vol = 0.6) {
  try {
    if (!ref || typeof audio === 'undefined' || !audio?.context) return;
    const ac = audio.context, bus = audio.bus?.('UI') ?? ac.destination;
    Promise.resolve(audio.buffer(ref)).then((buf) => { if (!buf) return; const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g); g.connect(bus); s.start(); }).catch(() => {});
  } catch (e) {}
}
function originOf(id, emoji) {
  const chip = document.getElementById(`dbr-c-${domId(id)}-${emoji}`);
  const r = chip?.getBoundingClientRect();
  if (r && r.width) return { x: r.left + 11, y: r.top + r.height / 2, chip };
  if (lastPick && lastPick.id === String(id) && lastPick.emoji === emoji) return { x: lastPick.x, y: lastPick.y, chip: null };
  return null;
}
function put(html, ms) { const d = document.createElement('div'); d.innerHTML = html; const el = d.firstElementChild; layer().appendChild(el); setTimeout(() => el.remove(), ms); return el; }
function burst(p, o) {
  const parts = burstSpec(hashSeed(`${p.id}|${p.emoji}|${++burstN}`)), src = REACT_ICONS[p.emoji];
  put(`<div style="position:absolute;left:${o.x}px;top:${o.y}px">${parts.map((q) => `<div class="dbr-px" style="--dx:${q.dx}px;--d:${q.delay}ms"><div class="dbr-py" style="--up:${q.up}px;--fall:${q.fall}px;--d:${q.delay}ms"><img src="${src}" alt="" style="--s:${q.s};--r:${q.rot}deg;--d:${q.delay}ms"></div></div>`).join('')}<div class="dbr-ring"></div></div>`, BURST_MS);
}
function puff(p, o) {
  const r = rng(hashSeed(`${p.id}|${p.emoji}|puff|${++burstN}`));
  const puffs = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * 6.283 + r() * 0.6, d = 14 + r() * 12; return `<div class="dbr-puff" style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d - 6)}px;--d:${Math.round(r() * 60)}ms"></div>`; }).join('');
  put(`<div style="position:absolute;left:${o.x}px;top:${o.y}px"><img class="dbr-ghost" src="${REACT_ICONS[p.emoji]}" alt="">${puffs}</div>`, 700);
}
function spring(el, cls) { if (!el) return; el.classList.remove('dbr-spring', 'dbr-shrink'); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }
function onReact(p) {
  if (!p || !REACT_ICONS[p.emoji]) return;
  playSfx(SFX.pop[p.emoji], p.on ? (POP_RATE[p.emoji] ?? 1) : (POP_RATE[p.emoji] ?? 1) * 0.8, p.on ? 0.65 : 0.4);
  if (!p.on) { const o = originOf(p.id, p.emoji); if (o) { spring(o.chip, 'dbr-shrink'); puff(p, o); } return; }
  // the chip may land a render after the event: look for it for up to ~0.4 s, then burst from the pick
  let tries = 0;
  const go = () => {
    const chip = document.getElementById(`dbr-c-${domId(p.id)}-${p.emoji}`);
    if (!chip && tries++ < 24) { requestAnimationFrame(go); return; }
    const o = originOf(p.id, p.emoji); if (!o) return;
    spring(chip, 'dbr-spring'); burst(p, o);
  };
  go();
}
export function mountReact() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return null;
  installed = true;
  try {
    if (!document.getElementById('dbr-css')) { const d = document.createElement('div'); d.innerHTML = REACT_CSS; document.head.appendChild(d.firstElementChild); }
    const down = (e) => { const b = e.target?.closest?.('[data-dbr]'); if (!b) return; const r = b.getBoundingClientRect(); lastPick = { id: b.getAttribute('data-dbr-id'), emoji: b.getAttribute('data-dbr'), x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    document.addEventListener('pointerdown', down, true);
    const off = window.spawn?.on?.('event', (name, payload) => { if (name === 'devbook:react') { try { onReact(payload); } catch (e) {} } });
    return () => { try { document.removeEventListener('pointerdown', down, true); off?.(); document.getElementById('dbr-fx')?.remove(); } catch (e) {} installed = false; };
  } catch (e) { return null; }
}
function install() { if (!installed && typeof window !== 'undefined') mountReact(); }
