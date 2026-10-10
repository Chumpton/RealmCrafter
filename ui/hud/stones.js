// HEARTHSTONE + PORTAL STONE HUD: the A1/A2 slots, the zone window, the channel bar. Clicks call page globals hudHearth / hudPortalWin / hudPortalGo (ui.js).
import { STONES, ZONES } from '../../scripts/lib/data/stones.js';
import { esc } from '../../scripts/lib/esc.js';
const num = (v) => (Number.isFinite(+v) ? +v : 0);
const CSS = `<style>
.st-slot img{position:absolute;inset:3px;width:calc(100% - 6px);height:calc(100% - 6px);object-fit:cover;border-radius:2px}
.st-win{position:fixed;left:50%;bottom:190px;transform:translateX(-50%);width:420px;padding:12px 12px 10px;z-index:20;pointer-events:auto;font-family:Georgia,serif;color:#f2e6cf;
 border:10px solid #8a6a32;border-image:var(--kit-ns,none) 32 / 10px stretch;background:linear-gradient(#2c3138,#1b1e23 60%,#15171b);box-shadow:0 8px 30px #000c;border-radius:4px}
.st-win h3{margin:0 0 8px;font:700 15px 'Cinzel',Georgia,serif;color:#ffd96a;text-shadow:1px 1px 0 #000;display:flex;align-items:center;gap:8px}
.st-win h3 img{width:28px;height:28px;border-radius:3px;border:1px solid #c9a24a}
.st-win h3 .x{margin-left:auto;cursor:pointer;color:#c9a24a;font:700 16px Arial}
.st-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.st-z{display:flex;align-items:center;gap:7px;padding:5px 7px;border-radius:3px;cursor:pointer;border:1px solid #4a361a;background:linear-gradient(160deg,#2b3138,#171a1f)}
.st-z:hover{border-color:#f0d58e;filter:brightness(1.2)}
.st-z i{width:12px;height:12px;border-radius:50%;flex:none;background:var(--zc);box-shadow:0 0 6px var(--zc)}
.st-z b{display:block;font-size:12.5px}.st-z small{display:block;font-size:9.5px;opacity:.7;line-height:1.15}
.st-z.here{opacity:.45;cursor:default}
.st-cast{position:fixed;left:50%;bottom:230px;transform:translateX(-50%);width:300px;height:22px;border:1px solid #c9a24a;border-radius:3px;background:#0d0a08;overflow:hidden;z-index:19;pointer-events:none;box-shadow:0 0 0 1px #000,0 4px 12px #000a}
.st-cast i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(#bfe0ff,#5d9be0 55%,#2b5a9a)}
.st-cast span{position:relative;display:block;text-align:center;line-height:22px;font:700 12px Georgia,serif;color:#fff;text-shadow:1px 1px 0 #000,-1px -1px 0 #000}
@keyframes stfill{from{width:0}to{width:100%}}
</style>`;
// the two A-row slots (classbar row 20 = A1, 21 = A2)
export function stoneSlot(i, player, now) {
  const s = player?.state ?? {};
  if (i === 20) {
    const left = num(s.hearthCd) - now;
    const cd = left > 0 ? `<i class="cd" style="animation:h4fbcd ${STONES.hearthCdMs}ms linear ${left - STONES.hearthCdMs}ms forwards"></i>` : '';
    return `<div class="cb-slot st-slot" id="st-hearth" title="Hearthstone ¶ Channel 3 s to return to the ${esc(STONES.hearth.name)}. 30 s cooldown." onclick="hudHearth()" style="--ec:#5d9be0"><img src="${STONES.icons.hearth}" alt="">${cd}<span class="k">A1</span></div>`;
  }
  if (i === 21) return `<div class="cb-slot st-slot" id="st-portal" title="Portal Stone ¶ Open the zone list and channel 3 s to any zone." onclick="hudPortalWin()" style="--ec:#a070e0"><img src="${STONES.icons.portal}" alt=""><span class="k">A2</span></div>`;
  return null;
}
export function stonesHud(player, open, now) {
  const s = player?.state ?? {}, place = player?.place ?? 'main';
  let h = CSS;
  const c = s.stoneCast;
  if (c && c.end > now) { const dur = c.end - c.start, el = Math.max(0, now - c.start); h += `<div class="st-cast" id="st-cast"><i style="animation:stfill ${dur}ms linear -${el}ms forwards"></i><span>${esc(c.name)}</span></div>`; }
  if (open) {
    h += `<div class="st-win h4-plate" id="st-win"><h3><img src="${STONES.icons.portal}" alt="">Portal Stone<span class="x" onclick="hudPortalWin()">✕</span></h3><div class="st-grid">` +
      ZONES.map((z) => { const here = (z.id === 'main' ? 'main' : 'zone-' + z.id) === place; return `<div class="st-z${here ? ' here' : ''}" id="st-z-${z.id}" style="--zc:${z.color}" ${here ? 'title="You are here"' : `onclick="hudPortalGo('${z.id}')"`}><i></i><div><b>${esc(z.name)}</b><small>${here ? 'you are here' : esc(z.line)}</small></div></div>`; }).join('') +
      `</div></div>`;
  }
  return h;
}
