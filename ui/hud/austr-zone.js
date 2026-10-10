// AUSTRLAND zone title (al-travel): a fading top-centre title when player.state.austrZone changes (scripts/lib/austr-travel.js).
import { AT } from '../../scripts/lib/data/austr-travel.js';
import { esc } from '../../scripts/lib/esc.js';
const CSS = `<style>@keyframes azIn{0%{opacity:0;transform:translateY(-8px) scale(.97)}12%{opacity:1;transform:none}78%{opacity:1}100%{opacity:0}}
.az{position:fixed;left:50%;top:max(72px,9vh);transform:translateX(-50%);pointer-events:none;text-align:center;z-index:5}
.az>div{animation:azIn ${AT.bannerMs}ms ease-out forwards;color:#f4e3c3;text-shadow:3px 3px 0 #1e140c,0 0 18px rgba(20,12,6,.8)}
.az .t{font-size:56px;line-height:1;letter-spacing:.06em}.az .r{height:3px;margin:8px auto;width:62%;background:linear-gradient(90deg,transparent,#e7b457,transparent)}
.az .s{font-size:20px;letter-spacing:.16em;color:#e7b457;text-transform:uppercase}</style>`;
export function austrZoneHud(ctx, player) {
  const z = player?.state?.austrZone;
  if (!z?.at || ctx.now() - z.at > AT.bannerMs) return '';
  return `${CSS}<div class="az"><div id="az-${z.at}"><div class="t">${esc(z.title)}</div><div class="r"></div><div class="s">${esc(z.sub)}</div></div></div>`;
}
