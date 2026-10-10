// COMBAT FEEL: the screen side of a fight. combatFxHud(ctx, player) draws, from player.state, the target frame (name, level, HP bar with a lagging trail),
// the mouse-over line under the crosshair, the combat edge glow, the low-HP heartbeat and the death overlay.
// installCombatFx(container) listens to the room's uiEvents (combatStart, hitDealt, hurt, kill, combatOff, dead, respawn) for the one-shot juice:
// a lock-on burst, bouncing banners, flying sparks, and WebAudio hits / stings (no sound files). Never throws.
import { MONSTERS } from './data/monsters.js';
import { cbLevelOf } from './combat-hud.js';
import { levelColor } from './menu-core.js';
import { splatSvg } from './hitsplat.js';
import { ensureStyle } from './ui-style.js';
import { esc } from './esc.js';
const STYLE = `<style>
#cf-root{position:fixed;inset:0;pointer-events:none;z-index:5;font-family:Georgia,serif;color:#f2e6cf}
.cf-vig{position:absolute;inset:0;transition:opacity .5s ease-out;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 55%,rgba(214,120,30,.38) 100%)}
.cf-low{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 40%,rgba(200,20,20,.6) 100%);animation:cflow 1.05s ease-in-out infinite}
@keyframes cflow{0%,100%{opacity:.25}12%{opacity:.95}26%{opacity:.35}40%{opacity:.8}60%{opacity:.25}}
.cf-tf{position:absolute;left:50%;top:70px;width:300px;margin-left:-150px;padding:7px 12px 9px;background:#343c43;border:2px solid #4f3828;border-radius:7px;box-shadow:0 0 0 1px #1c1410,4px 5px 0 rgba(20,12,6,.55),0 0 18px rgba(214,90,40,.35);animation:cftf .32s cubic-bezier(.3,1.8,.5,1) both}
@keyframes cftf{0%{opacity:0;transform:translateY(-22px) scale(.6) rotate(-2deg)}100%{opacity:1;transform:none}}
.cf-tf.cf-hit{animation:cfhit .22s ease-out}
@keyframes cfhit{0%{transform:translate(0,0) scale(1.05)}25%{transform:translate(-5px,2px) scale(1.04) rotate(-.8deg)}50%{transform:translate(4px,-2px) rotate(.7deg)}100%{transform:none}}
.cf-name{display:flex;justify-content:space-between;align-items:baseline;font-size:15px;font-weight:bold;letter-spacing:.04em;margin-bottom:5px}
.cf-lv{font-size:12px;font-weight:bold;padding:0 6px;border-radius:9px;background:rgba(0,0,0,.35)}
.cf-bar{position:relative;height:13px;background:#241810;border:1px solid #120b06;border-radius:7px;overflow:hidden}
.cf-trail{position:absolute;left:0;top:0;bottom:0;background:#f2e6cf;opacity:.85;transition:width .7s ease-in .3s}
.cf-fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#e0553d,#a52a1c);transition:width .18s cubic-bezier(.3,1.5,.5,1);box-shadow:inset 0 2px 0 rgba(255,255,255,.28)}
.cf-hp{position:absolute;right:8px;top:-1px;font-size:10px;line-height:13px;color:#fff;text-shadow:0 1px 1px #000}
.cf-dn{opacity:.6;filter:grayscale(1)}
.cf-hv{position:absolute;left:50%;top:calc(50% + 42px);transform:translateX(-50%);padding:2px 10px;font-size:14px;background:rgba(20,14,8,.62);border-radius:10px;white-space:nowrap;text-shadow:0 1px 2px #000;transition:opacity .15s}
.cf-burst{position:fixed;left:50%;top:50%;width:20px;height:20px;margin:-10px 0 0 -10px;border:3px solid #ff6a3a;border-radius:50%;box-shadow:0 0 22px #ff6a3a,inset 0 0 14px #ff6a3a;pointer-events:none;animation:cfburst .5s ease-out both}
@keyframes cfburst{from{opacity:1;transform:scale(.3)}to{opacity:0;transform:scale(9)}}
.cf-slash{position:fixed;left:50%;top:50%;width:380px;height:5px;margin:-2px 0 0 -190px;background:linear-gradient(90deg,transparent,#fff,#ffb25a,transparent);pointer-events:none;animation:cfslash .38s ease-out both}
@keyframes cfslash{0%{opacity:0;transform:rotate(var(--r)) scaleX(.1)}30%{opacity:1;transform:rotate(var(--r)) scaleX(1.1)}100%{opacity:0;transform:rotate(var(--r)) scaleX(1.5)}}
.cf-hurt{position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(255,0,0,0) 25%,rgba(220,20,20,.75) 100%);animation:cfhurt .45s ease-out both}
@keyframes cfhurt{from{opacity:1}to{opacity:0}}
.cf-ban{position:fixed;left:50%;top:26%;transform:translateX(-50%);pointer-events:none;text-align:center;animation:cfban 1.9s cubic-bezier(.3,1.7,.5,1) both}
.cf-ban b{display:block;font-size:34px;letter-spacing:.14em;color:#ffd27a;text-shadow:0 3px 0 #4f3828,0 0 22px rgba(255,170,60,.8)}
.cf-ban i{display:block;font-style:normal;font-size:14px;letter-spacing:.2em;color:#f2e6cf;text-shadow:0 2px 2px #000}
@keyframes cfban{0%{opacity:0;transform:translateX(-50%) scale(.3) rotate(-6deg)}14%{opacity:1;transform:translateX(-50%) scale(1.18) rotate(1.5deg)}24%{transform:translateX(-50%) scale(1)}78%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-26px)}}
.cf-spark{position:fixed;left:50%;top:30%;width:8px;height:8px;border-radius:2px;background:#ffd27a;box-shadow:0 0 10px #ffb25a;pointer-events:none;animation:cfspark .9s cubic-bezier(.2,.8,.4,1) both}
@keyframes cfspark{from{opacity:1;transform:translate(0,0) rotate(0)}to{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--a))}}
.cf-dead{position:absolute;inset:0;backdrop-filter:grayscale(1) brightness(.55) contrast(1.1);-webkit-backdrop-filter:grayscale(1) brightness(.55) contrast(1.1);background:radial-gradient(ellipse at 50% 50%,rgba(60,0,0,.25),rgba(90,0,0,.7));animation:cfdead .6s ease-out both;display:flex;align-items:center;justify-content:center}
@keyframes cfdead{from{opacity:0}to{opacity:1}}
.cf-dead b{font-size:44px;letter-spacing:.12em;color:#ffdede;text-shadow:0 4px 0 #3a0a0a,0 0 30px rgba(255,40,40,.7);animation:cfdt 1.1s cubic-bezier(.2,1.6,.4,1) .15s both}
@keyframes cfdt{from{opacity:0;transform:scale(2.4) rotate(3deg)}to{opacity:1;transform:none}}
/* WEAPON TIMER (WoW swing bar): restarts at each swing and fills over the weapon's speed; one notch per tick */
.cf-sw{position:absolute;left:50%;bottom:118px;width:236px;margin-left:-118px;text-align:center;font-size:10px;letter-spacing:.12em;color:#f2e6cf;text-shadow:0 1px 2px #000;transition:opacity .25s}
.cf-sw.cf-far{opacity:.45}
.cf-swbar{position:relative;height:9px;margin-top:2px;background:#241810;border:1px solid #120b06;border-radius:5px;overflow:hidden;box-shadow:0 0 0 1px rgba(186,137,80,.55)}
.cf-swfill{position:absolute;inset:0;transform-origin:left center;transform:scaleX(0);background:linear-gradient(#f6d27a,#b8802a)}
.cf-swfill.run{animation-name:cfsw;animation-timing-function:linear;animation-fill-mode:forwards}
.cf-sw.off{opacity:0;pointer-events:none}
.cf-sw.cf-delay .cf-swfill{background:linear-gradient(#e08a6a,#9a3a22)}
@keyframes cfsw{0%{transform:scaleX(0);filter:none}94%{transform:scaleX(.94);filter:none}100%{transform:scaleX(1);filter:brightness(1.7) drop-shadow(0 0 4px #ffd27a)}}
.cf-swtk{position:absolute;inset:0}
/* WHERE IT HIT YOU: a red wedge at the screen edge toward the attacker; WIND-UP: the edge flares as a swing is about to land */
.cf-dir{position:fixed;left:50%;top:50%;width:0;height:0;pointer-events:none;animation:cfdir .9s ease-out both}
.cf-dir i{position:absolute;left:-90px;top:-330px;width:180px;height:70px;background:radial-gradient(ellipse at 50% 100%,rgba(255,40,30,.95),rgba(255,40,30,0) 70%);transform-origin:50% 330px}
@keyframes cfdir{0%{opacity:1}100%{opacity:0}}
.cf-wind{position:fixed;inset:0;pointer-events:none;box-shadow:inset 0 0 70px 6px rgba(255,120,30,.55);animation:cfwind .6s ease-in both}
@keyframes cfwind{0%{opacity:0}85%{opacity:1}100%{opacity:.2}}
/* OSRS hitsplat on you */
.cf-hs{position:fixed;left:104px;top:124px;width:46px;height:46px;pointer-events:none;image-rendering:pixelated;animation:cfhs 1.2s steps(14,end) both}
.cf-hs svg{width:100%;height:100%;display:block}
@keyframes cfhs{0%{opacity:0;transform:scale(.3) translateY(8px)}15%{opacity:1;transform:scale(1.25)}30%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-26px)}}
@media (prefers-reduced-motion:reduce){.cf-low{animation:none;opacity:.6}.cf-tf,.cf-burst,.cf-slash,.cf-ban,.cf-spark{animation:none}}
</style>`;
function tgtOf(ctx, s) {
  const id = s.fight?.target ?? s.lock; if (!id) return null;
  const o = ctx.getObject?.(id); if (!o?.state) return null;
  const m = MONSTERS[o.state.kind];
  return { id, name: m?.name ?? o.state.name ?? 'Training dummy', lvl: m?.level ?? 1, hp: Math.max(0, o.state.hp ?? 0), max: o.state.maxHp ?? 1, down: !!o.state.down };
}
export function combatFxHud(ctx, player) {
  try {
    const s = player?.state; if (!s) return '';
    const mine = cbLevelOf(s), t = tgtOf(ctx, s), inC = !!s.fight;
    let tf = '';
    if (t && false) { // CLASSIC WOW SKIN: ui/hud/wow.js draws the target frame beside the player frame now
      const pct = Math.round(Math.min(1, t.hp / t.max) * 100), col = levelColor(mine, t.lvl);
      tf = `<div id="cf-tf-${esc(t.id)}" class="cf-tf${t.down ? ' cf-dn' : ''}"><div class="cf-name"><span>⚔ ${esc(t.name)}</span><span class="cf-lv" style="color:${col}">Lv ${t.lvl}</span></div>
        <div class="cf-bar"><div class="cf-trail" style="width:${pct}%"></div><div class="cf-fill" style="width:${pct}%"></div><span class="cf-hp">${t.hp}/${t.max}</span></div></div>`;
    }
    const swing = ''; // the weapon timer bar lives in its own layer (installCombatFx), outside this re-rendered string
    const h = s.hover, hv = h ? `<div id="cf-hv" class="cf-hv"><span>${esc(h.verb)} </span>${h.target ? `<span style="color:${esc(h.col)}">${esc(h.target)}</span>` : ''}${h.lvl ? ` <span style="color:${esc(h.lcol)}">(level-${h.lvl | 0})</span>` : ''}${h.more > 0 ? ` <span style="color:#fff;opacity:.8"> / ${h.more} more option${h.more > 1 ? 's' : ''}</span>` : ''}</div>` : '';
    ensureStyle('cf-style', STYLE);
    return `<div id="cf-root"><div id="cf-vig" class="cf-vig" style="opacity:${inC ? 1 : 0}"></div>${s.lowHp ? '<div id="cf-low" class="cf-low"></div>' : ''}${tf}${swing}${hv}${s.dead ? '<div id="cf-dead" class="cf-dead"><b>Oh dear, you are dead!</b></div>' : ''}</div>`;
  } catch { return ''; }
}
// WebAudio voices: [type, f0, f1, seconds, gain, delay]
const VOICE = {
  combatStart: [['sine', 150, 45, .22, .3, 0], ['sawtooth', 196, 392, .28, .06, 0], ['square', 392, 588, .14, .035, .1]],
  hit: [['square', 190, 70, .09, .12, 0], ['sine', 95, 50, .13, .22, 0]],
  big: [['sawtooth', 320, 90, .18, .1, 0], ['square', 200, 60, .1, .14, 0], ['sine', 80, 40, .2, .26, 0]],
  miss: [['triangle', 520, 300, .09, .05, 0]],
  windup: [['sine', 220, 440, .5, .05, 0], ['triangle', 330, 660, .5, .035, 0.05]],
  hurt: [['sawtooth', 130, 40, .2, .16, 0], ['sine', 70, 35, .24, .24, 0]],
  combatOff: [['triangle', 440, 220, .32, .05, 0]],
  kill: [['triangle', 523, 523, .1, .1, 0], ['triangle', 659, 659, .1, .1, .09], ['triangle', 784, 1046, .3, .12, .18]],
  dead: [['sawtooth', 300, 60, 1, .14, 0], ['sine', 110, 40, 1.2, .2, 0]],
  respawn: [['triangle', 392, 784, .4, .08, 0]],
};
function voice(k) {
  try {
    if (typeof audio === 'undefined' || !audio?.context) return;
    const ac = audio.context, bus = audio.bus?.('SFX') ?? audio.bus?.('UI') ?? ac.destination, t0 = ac.currentTime;
    for (const [type, f0, f1, d, v, dl] of VOICE[k] ?? []) {
      const o = ac.createOscillator(), g = ac.createGain(), t = t0 + dl;
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + d); o.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.03);
    }
  } catch (e) {}
}
function put(container, html, ms) { const d = document.createElement('div'); d.innerHTML = html; const el = d.firstElementChild; container.appendChild(el); setTimeout(() => el.remove(), ms); return el; }
function banner(container, big, small) { put(container, `<div class="cf-ban"><b>${esc(big)}</b><i>${esc(small)}</i></div>`, 1950); }
function sparks(container, n) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 190; put(container, `<div class="cf-spark" style="--x:${Math.cos(a) * r | 0}px;--y:${(Math.sin(a) * r * 0.7 + 60) | 0}px;--a:${(Math.random() * 540 - 270) | 0}deg;animation-delay:${(Math.random() * 120) | 0}ms"></div>`, 1100); }
}
export function installCombatFx(container) {
  if (typeof window === 'undefined' || !window.spawn?.on) return null;
  ensureStyle('cf-style', STYLE);
  const bar = document.createElement('div'); bar.id = 'cf-sw'; bar.className = 'cf-sw off'; bar.style.zIndex = 5;
  bar.innerHTML = '<span class="cf-swl"></span><div class="cf-swbar"><div class="cf-swfill"></div><div class="cf-swtk"></div></div>'; container.appendChild(bar);
  const fill = bar.querySelector('.cf-swfill'), label = bar.querySelector('.cf-swl'), tk = bar.querySelector('.cf-swtk');
  const swing = (p) => { // a swing (or a reset): the bar starts again from empty and fills over one weapon period, then waits full for the next
    label.textContent = `${p.w ?? ''} · ${p.ticks | 0} ticks`; const n = Math.max(1, p.ticks | 0), k = (100 / n).toFixed(3);
    tk.style.background = `repeating-linear-gradient(90deg,transparent 0,transparent calc(${k}% - 1px),rgba(0,0,0,.6) calc(${k}% - 1px),rgba(0,0,0,.6) ${k}%)`;
    bar.classList.toggle('cf-delay', !!p.delayed); bar.classList.remove('off');
    fill.classList.remove('run'); void fill.offsetWidth; fill.style.animationDuration = `${p.ms | 0}ms`; fill.classList.add('run');
  };
  const off = window.spawn.on('event', (name, p) => {
    try {
      if (name === 'swing' && p) swing(p);
      else if (name === 'combatOff' || name === 'dead') bar.classList.add('off');
      if (name === 'combatStart') { voice('combatStart'); put(container, '<div class="cf-burst"></div>', 600); put(container, '<div class="cf-slash" style="--r:-28deg"></div>', 450); setTimeout(() => put(container, '<div class="cf-slash" style="--r:24deg"></div>', 450), 90); }
      else if (name === 'hitDealt') { voice(p?.big ? 'big' : p?.dmg > 0 ? 'hit' : 'miss'); const tf = document.querySelector('.cf-tf'); if (tf && p?.dmg > 0) { tf.classList.remove('cf-hit'); void tf.offsetWidth; tf.classList.add('cf-hit'); } }
      else if (name === 'windup') { voice('windup'); put(container, '<div class="cf-wind"></div>', 650); }
      else if (name === 'hurt') { voice('hurt'); if (typeof p?.rel === 'number') put(container, `<div class="cf-dir"><i style="transform:rotate(${p.rel}deg)"></i></div>`, 950); put(container, '<div class="cf-hurt"></div>', 500); put(container, `<div class="cf-hs">${splatSvg(p?.dmg | 0, "width='46' height='46'")}</div>`, 1250); }
      else if (name === 'combatOff') voice('combatOff');
      else if (name === 'kill') { voice('kill'); /* no defeated banner: the XP drops from the counter say it */ }
      else if (name === 'dead') voice('dead');
      else if (name === 'respawn') { voice('respawn'); put(container, '<div class="cf-hurt" style="background:rgba(255,255,255,.9);animation-duration:.9s"></div>', 1000); }
    } catch (e) {}
  });
  return () => { try { off?.(); bar.remove(); } catch (e) {} };
}
