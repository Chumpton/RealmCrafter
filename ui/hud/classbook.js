import { DESC } from '../../scripts/lib/data/spell-desc.js';
// CLASS SPELL CATALOG (Campton, 2026-10-06, from his WoW/PoE "Spells & Combat Functionality Catalog"): the class kit's book.
// Tabs per element + Supports; each spell row shows its kind, numbers, release animation, gem level bar and 3 support sockets.
// Read only: every write is sendAction('classGem', …) to scripts/class-cast-player.js. Page-local state (open, tab, picker) lives in ui.js.
// Never draws in OSRS mode: Zezima's book is his spellbook window, untouched.
import { tipOf, KINDS, isClassMode, classOf, spellOfClass, GEMS, gemFits, gemOf, socketsOf, moddedOf, modMaxHit, animOf, GEM_XP, GEM_MAX, FREE_SLOTS, barOf, tabSpells, iconStyle } from '../../scripts/lib/data/class-spells.js';
import { levelOf } from '../../scripts/lib/skills-core.js';
import { esc } from '../../scripts/lib/esc.js';
import { UIK } from '../../scripts/lib/data/ui-kit.js'; // creator 2026-10-10: the book wears the hotbar's slots and the tooltip's frame

const KIND_IDS = ['instant', 'cast', 'cooldown', 'aoe'];
const CSS = `<style>
#cbk{position:fixed;left:50%;top:50%;transform:translate(-50%,-52%);width:min(660px,94vw);height:min(560px,86vh);display:flex;flex-direction:column;z-index:61;color:#f2e6cf;font-family:'Cinzel','WowTitle',Georgia,serif;
  border:16px solid #8a6a32;border-image:var(--kit-ns) 32 / 16px stretch;
  background:url("${UIK['fil-corner-tl']}") top left/30px 30px no-repeat,url("${UIK['fil-corner-tr']}") top right/30px 30px no-repeat,url("${UIK['fil-corner-bl']}") bottom left/30px 28px no-repeat,url("${UIK['fil-corner-br']}") bottom right/30px 28px no-repeat,
  radial-gradient(120% 90% at 50% 40%,#2a2f36,#16191d 70%,#0e1013) padding-box;box-shadow:0 10px 40px #000c;padding:10px 12px 8px;image-rendering:auto}
#cbk .hd{position:relative;display:flex;align-items:center;justify-content:center;height:40px;margin:-4px 0 6px}
#cbk .plq{position:relative;min-width:260px;height:40px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 34px;background:url("${UIK['fil-plaque']}") center/100% 100% no-repeat}
#cbk .plq b{font-size:17px;color:#f6d878;letter-spacing:.04em;text-shadow:0 2px 0 #000,0 0 6px #000}
#cbk .plq span{font-size:20px;filter:drop-shadow(0 1px 0 #000)}
#cbk .x{position:absolute;right:-2px;top:6px;width:24px;height:24px;cursor:pointer;background:url("${UIK['btn-x-red'] ?? UIK['btn-x']}") center/contain no-repeat;font-size:0}
#cbk .body{flex:1;display:flex;gap:8px;min-height:0}
#cbk .pages{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:0;min-height:0;border:1px solid #4a361a;border-radius:3px;background:linear-gradient(90deg,#1b1e23,#22262c 48%,#0c0d10 50%,#22262c 52%,#1b1e23);box-shadow:inset 0 0 18px #000a}
#cbk .pg{display:flex;flex-direction:column;gap:6px;padding:10px 12px;overflow-y:auto;min-height:0}
#cbk .pg + .pg{border-left:1px solid #00000080}
#cbk .el{font-size:12px;color:var(--tc);letter-spacing:.12em;text-transform:uppercase;text-align:center;padding:2px 0 4px;background:url("${UIK['fil-rule']}") center bottom/80% 8px no-repeat;text-shadow:0 1px 0 #000}
#cbk .en{display:flex;align-items:center;gap:9px;padding:3px 4px;border-radius:3px;cursor:default}
#cbk .en:hover{background:#ffffff0c}
#cbk .sl{position:relative;flex:none;width:46px;height:46px;border:1px solid transparent;border-radius:4px;cursor:pointer;background:linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box;box-shadow:0 2px 4px #000a}
#cbk .sl .ic{position:absolute;inset:3px;border-radius:2px;box-shadow:inset 0 0 0 1px var(--ec),inset 0 0 8px #0008;display:flex;align-items:center;justify-content:center;font-size:20px;text-shadow:0 0 6px var(--ec)}
#cbk .sl:hover{filter:brightness(1.18)}
#cbk .sl.on::after{content:'';position:absolute;right:-3px;bottom:-3px;width:14px;height:14px;background:url("${UIK['btn-check']}") center/contain no-repeat;filter:drop-shadow(0 1px 1px #000)}
#cbk .tx{min-width:0;flex:1}
#cbk .nm{font-size:13.5px;font-weight:700;color:#f6d878;text-shadow:0 1px 0 #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cbk .sub{font:600 10.5px/1.2 'Oswald','PT Sans Narrow',sans-serif;color:#a89c88;letter-spacing:.03em}
#cbk .sub i{font-style:normal;color:var(--ec)}
#cbk .lk{display:flex;align-items:center;gap:2px;margin-top:3px}
#cbk .so{width:15px;height:15px;border-radius:50%;cursor:pointer;border:1px solid var(--sc,#5a4a30);background:radial-gradient(color-mix(in oklab,var(--sc,#111) 40%,#111114),#0b0b0d);font-size:8px;line-height:13px;text-align:center;color:#fff;box-shadow:inset 0 0 3px #000}
#cbk .so.pk{border-color:#ffd100;box-shadow:0 0 6px #ffd100aa}
#cbk .lk em{font-style:normal;color:#5a4628;font-size:8px}
#cbk .gl{margin-left:auto;font:700 10px 'Oswald',sans-serif;color:#7fb6ff}
#cbk .xp{height:3px;background:#000;border-radius:2px;overflow:hidden;margin-top:3px;box-shadow:0 0 0 1px #3a2c16}#cbk .xp i{display:block;height:100%;background:linear-gradient(90deg,#2080ff,#80c0ff)}
#cbk .tabs{flex:none;display:flex;flex-direction:column;gap:6px;padding-top:4px}
#cbk .tab{width:40px;height:40px;border-radius:4px;cursor:pointer;border:1px solid transparent;background:linear-gradient(160deg,#2b3138,#171a1f 55%,#0e1013) padding-box,linear-gradient(#8a6a32,#4a361a) border-box;display:flex;align-items:center;justify-content:center;font-size:19px;opacity:.7;box-shadow:0 2px 4px #000a}
#cbk .tab.on{opacity:1;background:radial-gradient(circle,color-mix(in oklab,var(--tc) 40%,#171a1f),#0e1013) padding-box,linear-gradient(#f0d58e,#8a6a32 55%,#4a361a) border-box;box-shadow:0 0 8px color-mix(in oklab,var(--tc) 60%,transparent)}
#cbk .tab:hover{opacity:1}
#cbk .gem{display:flex;gap:8px;align-items:flex-start;padding:4px}
#cbk .gem .sl{width:36px;height:36px;cursor:default}
#cbk .gem p{margin:2px 0 0;font:600 11px/1.3 'Oswald',sans-serif;color:#cfc6b4}
#cbk .ft{display:flex;justify-content:space-between;align-items:center;font:600 10.5px 'Oswald',sans-serif;color:#8c8270;padding:6px 4px 0}
#cbk .ft b{color:#f6d878}
#cbk-pick{position:absolute;left:calc(100% + 18px);top:40px;width:240px;max-height:420px;overflow-y:auto;padding:10px;z-index:62;border:12px solid #8a6a32;border-image:var(--kit-ns) 32 / 12px stretch;background:#16191d padding-box}
#cbk-pick .opt{cursor:pointer;border:1px solid color-mix(in oklab,var(--sc) 55%,transparent);border-radius:4px;padding:4px 6px;margin-bottom:4px;background:rgba(0,0,0,.4);font:600 11px 'Oswald',sans-serif}
#cbk-pick .opt b{color:var(--sc)}#cbk-pick .opt small{display:block;color:#bbb;font-size:10px;margin-top:1px;line-height:1.2}
#cbk-pick .opt.off{opacity:.35;cursor:default}
@media (max-width:760px){#cbk .pages{grid-template-columns:1fr}#cbk .pg + .pg{border-left:0}#cbk-pick{left:8px;right:8px;top:auto;bottom:8px;width:auto;max-height:45%}}
</style>`;

export function classBook(ctx, player, tab, pick) {
  try {
    const s = player?.state ?? {}, mode = s.combatMode;
    if (!isClassMode(mode)) return '';
    const c = classOf(mode), L = levelOf(s.skills?.[c.skill] | 0), bar = barOf(s, mode);
    const t = tab === 'gems' ? 'gems' : Math.max(0, Math.min(c.els.length - 1, tab | 0));
    const tabs = c.els.map((e, i) => { const sp0 = spellOfClass(tabSpells(mode, i)[0]), ic0 = sp0 && iconStyle(sp0); // the school's first spell is its tab's art
      return `<div class="tab${t === i ? ' on' : ''}" style="--tc:${e[3]}" title="${esc(e[0])}" onclick="hudClassTab(${i})">${ic0 ? `<i style="${ic0};display:block;width:32px;height:32px;border-radius:2px"></i>` : e[2]}</div>`; }).join('')
      + `<div class="tab${t === 'gems' ? ' on' : ''}" style="--tc:#30e060" title="Supports" onclick="hudClassTab('gems')">💎</div>`;
    let items = [], head = '';
    if (t === 'gems') {
      head = `<div class="el" style="--tc:#30e060">Support Gems</div>`;
      items = Object.entries(GEMS).map(([, g]) => `<div class="gem" style="--sc:${g.color}"><div class="sl"><div class="ic" style="--ec:${g.color}">${g.icon}</div></div><div class="tx"><div class="nm" style="color:${g.color}">${esc(g.name)}</div><div class="sub">${esc(g.short)}</div><p>${esc(g.desc)}</p></div></div>`);
    } else {
      const E = c.els[t]; head = `<div class="el" style="--tc:${E[3]}">${E[2]} ${esc(E[0])}</div>`;
      items = tabSpells(mode, t).map((id) => {
        const base = spellOfClass(id); if (!base) return ''; const k = base.kind;
        const m = moddedOf(base, s), g = gemOf(s, id), socks = socketsOf(s, id), onBar = bar.includes(id);
        const so = (i) => { const gid = socks[i], gm = gid && GEMS[gid], live = gm && gemFits(gid, base), pk = pick && pick.id === id && pick.i === i;
          return `<div class="so${pk ? ' pk' : ''}" style="${gm ? `--sc:${gm.color};` : ''}${gm && !live ? 'opacity:.4;' : ''}" title="${gm ? esc(gm.name) + ' — click to change' : 'Empty socket — click to link a support'}" onclick="hudClassPick('${id}',${i})">${gm ? gm.icon : ''}</div>`; };
        const pct = g.lv >= GEM_MAX ? 100 : Math.min(100, Math.round((g.xp / (GEM_XP * g.lv)) * 100));
        const kindLine = m.cast ? ` · ${(m.cast / 1000).toFixed(1)}s cast` : KINDS[k].label === 'Instant' ? '' : ' · Instant';
        const tip = tipOf(base, 1).replace(/ · max hit \d+$/, '') + ` · max hit ${modMaxHit(m, L)}` + (m.cd ? ` · ${(m.cd / 1000).toFixed(0)}s cooldown` : '') + (DESC[base.name] ? ' ¶ ' + DESC[base.name] : '') + (onBar ? ' ¶ On your bar.' : ' ¶ Click the icon to put it on your bar.');
        const ic = iconStyle(base);
        return `<div class="en" style="--ec:${base.color}" title="${esc(tip)}"><div class="sl${onBar ? ' on' : ''}" onclick="${onBar ? '' : `hudClassGem({act:'bar',id:'${id}'})`}"><div class="ic"${ic ? ` style="${ic};font-size:0"` : ''}>${base.glyph}</div></div>
<div class="tx"><div class="nm">${esc(base.name)}</div><div class="sub"><i>${esc(KINDS[k].label)}</i>${kindLine}${base.melee ? ' · melee' : m.range ? ` · ${m.range}m` : ''}</div>
<div class="lk">${so(0)}<em>—</em>${so(1)}<em>—</em>${so(2)}<span class="gl">Rank ${m.lv}</span></div><div class="xp"><i style="width:${pct}%"></i></div></div></div>`;
      });
    }
    items = items.filter(Boolean); const half = Math.ceil(items.length / 2);
    const list = `<div class="pages"><div class="pg">${head}${items.slice(0, half).join('')}</div><div class="pg">${t === 'gems' ? '' : `<div class="el" style="--tc:transparent">&nbsp;</div>`}${items.slice(half).join('')}</div></div>`;
    let picker = '';
    if (pick && t !== 'gems') {
      const sp = spellOfClass(pick.id);
      if (sp && sp.cls === mode) {
        const cur = socketsOf(s, sp.id);
        picker = `<div id="cbk-pick" class="h4-plate"><div style="display:flex;align-items:center;margin-bottom:6px"><b style="color:#ffd98a;font-size:12px">Link a support · ${esc(sp.name)}</b><div class="x" style="margin-left:auto;cursor:pointer" onclick="hudClassPick(null)">✕</div></div>`
          + `<div class="opt" style="--sc:#ff8080" onclick="hudClassGem({act:'socket',id:'${sp.id}',i:${pick.i},gem:null})"><b>✕ Empty the socket</b></div>`
          + Object.entries(GEMS).map(([gid, g]) => { const ok = gemFits(gid, sp) && (!cur.includes(gid) || cur[pick.i] === gid);
            return `<div class="opt${ok ? '' : ' off'}" style="--sc:${g.color}" ${ok ? `onclick="hudClassGem({act:'socket',id:'${sp.id}',i:${pick.i},gem:'${gid}'})"` : ''}><b>${g.icon} ${esc(g.name)}</b><small>${ok ? esc(g.desc) : cur.includes(gid) ? 'Already linked here.' : 'Does not fit this spell.'}</small></div>`; }).join('') + `</div>`;
      }
    }
    const used = bar.filter(Boolean).length;
    return `${CSS}<div id="cbk" data-modal><div class="hd"><div class="plq"><span>${c.crest}</span><b>${esc(c.name)} Spellbook</b></div><div class="x" title="Close" onclick="hudClassBook()">✕</div></div>
<div class="body">${list}<div class="tabs">${tabs}</div></div><div class="ft" style="padding-left:96px"><span>Level <b>${L}</b></span><span>Click an icon to put it on your bar · a socket links a support</span></div>${picker}</div>`;
  } catch (e) { return ''; }
}
