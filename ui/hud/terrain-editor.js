import { edOutlinerTab } from './ed-outliner.js';
import { edLogicTab } from './ed-logic.js';
import { edAiTab } from './ed-ai.js';
import { edHistPanel } from '../../scripts/ed-history-ui.js';
// TERRAIN EDITOR dock (scripts/terrain-editor.js owns player.state.te). Editors only. Layout after UE5 Landscape mode:
// top bar (undo/redo, snap, curve, fly speed), left shelf (tool groups + tools), right inspector (brush, falloff curve, splat layers,
// scatter palette), bottom tray (asset browser + history). The middle stays the viewport; Spawn's right rail stays clear (right: 58px).
import { TE, TOOLS, GROUPS, LAYERS, FOLIAGE, LAYER_TEX, ALL_LAYERS } from '../../scripts/lib/data/terrain-editor.js';
const SW = (id, c) => LAYER_TEX[id] ? `<s style="background:${c} url('${LAYER_TEX[id]}') center/cover"></s>` : `<s style="background:${c}"></s>`;
import { edBrush } from './ed-brush.js';
import { PREFABS, PREFAB, CATS } from '../../scripts/lib/data/prefabs.js';
import { IMG } from '../../scripts/lib/data/prefab-img.js';
import { zoneOf } from '../../scripts/lib/data/zones.js';
import { AB, ABCATS, HUES, abList, maxRow, counts, geo } from '../../scripts/lib/asset-browser.js';
import { thumb } from '../../scripts/lib/prefab-thumb.js';
import { buildTools } from './build.js'; // the Keeper Build tab's selection tools, inside the editor
const q = (o) => JSON.stringify(o).replace(/"/g, "'");
const A = (o) => `sendAction('te',${q(o)})`;
const CSS = `<style>
#te{position:fixed;inset:0;pointer-events:none;z-index:64;font:12px system-ui,-apple-system,'Segoe UI',sans-serif;color:#e4e4e7}
#te-top,#te-left,#te-right,#te-bot,#te-hp,#te-help,#te-sw{position:fixed;pointer-events:auto;background:rgba(22,22,26,.78);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(217,173,94,.22);border-radius:8px;box-sizing:border-box;box-shadow:0 8px 24px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.05)}
#te select,#te input[type=text],#te input[type=number],#te input[type=search]{font:inherit;color:#e4e4e7;background:#0f0f12;border:1px solid #3f3f46;border-radius:4px;box-sizing:border-box;min-width:0}
#te select{height:26px;padding:0 4px;cursor:pointer}#te select:hover{border-color:#d9ad5e}
#te .h{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#a1a1aa;margin:10px 0 6px;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden}
#te .h:after{content:'';flex:1;height:1px;background:#27272a}
#te button{font:inherit;color:inherit;cursor:pointer;border-radius:4px;border:1px solid #3f3f46;background:#27272a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te button:hover{border-color:#d9ad5e;background:#303036}
#te button.on{background:#d9ad5e;color:#18181b;border-color:#f3d48a}
#te button:disabled{opacity:.35;pointer-events:none}
#te-top{left:8px;right:58px;top:8px;height:40px;display:flex;align-items:center;gap:8px;padding:0 8px;overflow:hidden}
#te-top .g{display:flex;align-items:center;gap:3px;flex:none}#te-top .sep{width:1px;height:22px;background:#3f3f46;flex:none}
#te-top button{height:26px;min-width:28px;padding:0 7px}
#te-top .ttl{color:#ffcf6e;letter-spacing:.14em;font-weight:600;flex:none}
#te-left{left:8px;top:56px;bottom:128px;width:48px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 0;overflow-y:auto;scrollbar-width:none}
#te-left button{width:36px;height:36px;font-size:17px;padding:0;flex:none;display:flex;align-items:center;justify-content:center}
#te-left .div{width:28px;height:1px;background:#3f3f46;margin:4px 0;flex:none}
#te-left .tl button{font-size:15px;margin-bottom:3px}
#te-right{right:58px;top:56px;bottom:128px;width:260px;display:flex;flex-direction:column;overflow:hidden}
#te-pv{position:fixed;right:58px;top:56px;width:260px;height:206px;pointer-events:none;box-sizing:border-box;border:1px solid #6e5a35;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.45),inset 0 0 0 2px rgba(214,178,104,.18);background:radial-gradient(ellipse at 50% 92%,rgba(217,173,94,.14),transparent 55%);overflow:hidden}
#te-pv .win{height:176px}
#te-pv .nm{position:absolute;left:0;right:0;bottom:0;height:30px;display:flex;align-items:center;gap:8px;padding:0 10px;background:#18181b;border-top:1px solid #4d4434}
#te-pv .nm b{flex:1;min-width:0;font-weight:600;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#e9c271;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te-pv .nm span{font-size:10px;color:#a1a1aa;flex:none}
#te-tabs{display:flex;gap:2px;padding:6px;border-bottom:1px solid #27272a;flex:none}
#te-tabs button{flex:1;height:26px;padding:0 4px;font-size:11px}
#te-ins{flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 10px 10px;scrollbar-width:thin}
#te-ins .tt{font-size:13px;color:#fafafa;margin:8px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te-ins .tip{font-size:11px;color:#a1a1aa;line-height:1.4}
#te .sl{display:flex;align-items:center;gap:6px;margin:5px 0}#te .sl b{width:58px;flex:none;font-weight:normal;color:#d4d4d8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te .sl input{flex:1;min-width:0;accent-color:#d9ad5e}#te .sl em{font-style:normal;width:44px;flex:none;text-align:right;color:#e9c271;white-space:nowrap;overflow:hidden}
#te .lay{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;max-height:300px;overflow-y:auto;scrollbar-width:thin}
#te .lay button{display:flex;flex-direction:column;align-items:stretch;gap:3px;padding:3px;font-size:9.5px;text-align:center}
#te .lay button.on{outline:2px solid #ffd77a;outline-offset:-1px}
#te .lay s{display:block;width:100%;aspect-ratio:1;border-radius:4px;border:1px solid rgba(0,0,0,.6);text-decoration:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
#te .lay i{font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te .fol{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
#te .fol button{position:relative;aspect-ratio:1;padding:0}
#te .fol img{width:100%;height:100%;object-fit:cover;display:block}
#te .fol span{position:absolute;left:0;right:0;bottom:0;font-size:9.5px;padding:8px 2px 2px;background:linear-gradient(transparent,rgba(0,0,0,.85));color:#f4f4f5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te .fol button.on{box-shadow:0 0 0 2px #ffd77a;background:#27272a;color:inherit}
#te .fol button:not(.on) img{filter:grayscale(.75) brightness(.7)}
#te .kv{display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:2px 0;color:#d4d4d8}#te .kv em{font-style:normal;color:#e9c271;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te-bld .bd-hint{display:none}
#te-bld .bd-pad{display:grid!important;grid-template-columns:repeat(3,28px)!important;gap:3px!important;justify-content:center}
#te-bld .bd-pad .bt,#te-bld .bd-row .bt{height:26px!important;min-width:26px!important;padding:0!important;font-size:13px!important}
#te-bld .bd-row{display:flex;gap:3px;flex-wrap:wrap}
#te-bld .ds-card{margin-bottom:6px!important}
#te-bot{left:8px;right:58px;bottom:8px;height:112px;display:flex;flex-direction:column;overflow:hidden}
#te .xf{display:flex;flex-direction:column;gap:6px;margin-top:6px}
#te .xyz{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
#te .xyz label{display:flex;align-items:center;height:26px;border:1px solid #3f3f46;border-radius:4px;background:#0f0f12;overflow:hidden}
#te .xyz label b{flex:none;width:16px;text-align:center;font-size:10px;font-weight:700;color:#18181b;align-self:stretch;display:flex;align-items:center;justify-content:center}
#te .xyz input{flex:1;width:100%;height:100%;border:0!important;background:transparent!important;padding:0 4px;font-size:11px;text-align:right}
#te .ic{display:flex;gap:3px;flex-wrap:wrap}#te .ic button{height:28px;min-width:30px;padding:0 6px;font-size:13px}
#te .pmr .pm{display:flex;gap:2px}#te .pmr .pm button{flex:1;height:18px;padding:0;font-size:12px;line-height:1}
#te .np{display:flex;gap:6px;align-items:center;margin-bottom:4px}#te .np .pad{display:grid;grid-template-columns:repeat(3,28px);gap:3px}#te .np button{height:26px;min-width:26px;padding:0;font-size:13px}
#te .np .ud{display:flex;flex-direction:column;gap:3px}#te .np .st{display:flex;flex-direction:column;gap:2px;margin-left:auto;align-items:stretch}#te .np .st button{height:18px;min-width:30px;font-size:10px}#te .np .st i{font-size:9px;color:#a1a1aa;text-align:center;font-style:normal}
#te .ic button.red:hover{border-color:#ef4444;background:#3a1d1d}
#te-cats .cnt{font-size:10.5px;color:#a1a1aa;flex:none;padding:0 6px}
#te-cats input[type=search]{height:24px;width:170px;padding:0 8px;font-size:11px}
#te-bot.min{height:34px}
#te-cats{display:flex;align-items:center;gap:3px;padding:4px 6px;flex:none;border-bottom:1px solid #27272a;overflow-x:auto;scrollbar-width:none}
#te-cats button{height:24px;padding:0 9px;font-size:11px;flex:none}
#te-cats .sp{flex:1}
#te-row{flex:1;display:flex;gap:5px;padding:4px 6px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin}
#te-row .card{flex:none;width:84px;height:66px;padding:0;position:relative;background:#27272a}
#te-row .card img{width:100%;height:100%;object-fit:cover;display:block}
#te-row .card span{position:absolute;left:0;right:0;bottom:0;font-size:10px;padding:6px 2px 1px;background:linear-gradient(transparent,rgba(0,0,0,.85));color:#f4f4f5;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te-row .card.on{box-shadow:0 0 0 2px #ffd77a}
#te-hp{right:58px;bottom:128px;width:260px;max-height:260px;display:flex;flex-direction:column;padding:6px}
#te-hp .list{overflow-y:auto;scrollbar-width:thin}
#te-hp .row{display:flex;gap:6px;width:100%;padding:3px 6px;margin-bottom:2px;text-align:left;border-color:transparent;background:#1f1f23}
#te-hp .row.cur{border-color:#d9ad5e}
#te-hp .row em{margin-left:auto;font-style:normal;opacity:.5;font-size:10px}
#te-stat{position:fixed;left:64px;bottom:128px;max-width:40vw;pointer-events:none;user-select:none;display:flex;gap:8px;align-items:center;padding:6px 12px;border-radius:6px;background:rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.1);font-size:11.5px;color:#e4e4e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te-stat b{color:#ffd77a;font-weight:normal}#te-stat i{font-style:normal;color:#fde4b0;overflow:hidden;text-overflow:ellipsis}
#te-bot.min~#te-stat,#te-bot.min~#te-hp{bottom:50px}
#te-ab{position:fixed;pointer-events:auto;left:64px;bottom:8px;width:484px;height:404px;box-sizing:border-box;border:1px solid rgba(217,173,94,.3);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
#te-ab .hd,#te-ab .sw,#te-ab .rail,#te-ab .sb{position:absolute;background:rgba(22,22,26,.86);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-sizing:border-box}
#te-ab .hd{left:0;right:0;top:0;height:34px;display:flex;align-items:center;gap:4px;padding:0 6px;border-radius:8px 8px 0 0;border-bottom:1px solid #27272a}
#te-ab .hd b{flex:1;min-width:0;font-weight:600;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#e9c271;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te-ab .hd input{height:24px;width:120px;padding:0 7px;font-size:11px}#te-ab .hd button{height:24px;padding:0 7px;font-size:11px;flex:none}
#te-ab .sw{left:0;right:0;top:34px;height:32px;display:flex;align-items:center;gap:4px;padding:0 8px 0 52px}
#te-ab .dot{width:16px;height:16px;padding:0;border-radius:50%;border:1px solid rgba(0,0,0,.5);flex:none}
#te-ab .dot.all{background:conic-gradient(#c4473a,#d9c04a,#5f9a48,#4a74c0,#7f58b8,#c4473a)}
#te-ab .dot.on{box-shadow:0 0 0 2px #ffd77a;background-color:inherit}#te-ab .dot:hover{transform:scale(1.15)}
#te-ab .cnt{margin-left:auto;font-size:10px;color:#a1a1aa;white-space:nowrap}
#te-ab .rail{left:0;top:34px;bottom:0;width:44px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 0;overflow-y:auto;scrollbar-width:none;border-radius:0 0 0 8px;border-right:1px solid #27272a;z-index:1}
#te-ab .rail button{width:32px;height:26px;padding:0;font-size:14px;flex:none;border-color:transparent;background:transparent}
#te-ab .rail button.on{background:#d9ad5e;border-color:#f3d48a}
#te-ab .grid{position:absolute;left:52px;top:74px;width:404px;height:322px;display:grid;grid-template-columns:repeat(5,76px);grid-auto-rows:76px;gap:6px}
#te-ab .slot{position:relative;width:76px;height:76px;padding:0;border-radius:6px;border:1px solid rgba(217,173,94,.18)!important;background:radial-gradient(ellipse at 50% 80%,rgba(217,173,94,.10),transparent 65%)!important}
#te-ab .slot:hover{border-color:#d9ad5e!important;box-shadow:inset 0 0 12px rgba(255,215,122,.18)}
#te-ab .slot.on{border-color:#ffd77a!important;box-shadow:0 0 0 2px #ffd77a}
#te-ab .slot .th{position:absolute;left:7px;top:2px;width:60px;height:60px;pointer-events:none}
#te-ab .slot.empty{border:1px dashed rgba(255,255,255,.05);border-radius:6px}
#te-ab .slot span{position:absolute;left:0;right:0;bottom:0;height:14px;line-height:14px;font-size:9.5px;color:#e4e4e7;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 3px;background:rgba(0,0,0,.55);border-radius:0 0 5px 5px}
#te-ab .grip{position:absolute;right:0;bottom:0;width:16px;height:16px;line-height:16px;text-align:center;font-size:11px;color:#d9ad5e;cursor:nwse-resize;z-index:2;user-select:none;touch-action:none}
#te-ab .hd{cursor:move;touch-action:none}
#te-ab .sb{right:0;top:74px;bottom:14px;width:20px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:0 0 8px;background:transparent;-webkit-backdrop-filter:none;backdrop-filter:none}
#te-ab .sb button{width:14px;height:14px;padding:0;font-size:8px;flex:none}
#te-ab .sb .tr{position:relative;flex:1;width:6px;border-radius:3px;background:rgba(255,255,255,.08)}#te-ab .sb .tr i{position:absolute;left:0;right:0;border-radius:3px;background:#d9ad5e}
#te-abo{position:fixed;pointer-events:auto;left:64px;bottom:8px;height:30px;padding:0 12px;background:rgba(22,22,26,.86)!important;border:1px solid rgba(217,173,94,.3)!important;border-radius:8px!important}
#te-ab~#te-stat{bottom:8px}#te-abo~#te-stat{left:184px;bottom:8px}
#te-ab~#te-hp,#te-abo~#te-hp{bottom:8px}
#te-left .sel{border-color:#9fe4ff}
#te-help{left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,80vw);padding:14px 16px;z-index:2}
#te-help table{width:100%;border-collapse:collapse;font-size:12px}#te-help td{padding:4px 0;border-bottom:1px solid #27272a}#te-help td:first-child{color:#ffd77a;width:42%;white-space:nowrap}
#te .sw{display:flex;gap:6px;align-items:stretch;margin-top:4px}
#te .sw .swc{flex:none;width:86px;height:70px;padding:0;position:relative;background:#18181b}
#te .sw .swc img{width:100%;height:100%;object-fit:cover;display:block}
#te .sw .swc i{display:flex;height:100%;align-items:center;justify-content:center;font-style:normal;font-size:22px;color:#71717a}
#te .sw .swc span{position:absolute;left:0;right:0;bottom:0;font-size:9.5px;padding:6px 2px 1px;background:linear-gradient(transparent,rgba(0,0,0,.9));color:#fde4b0;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te .sw .swb{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
#te .sw .swb button{flex:1;font-size:12px}
#te .sw .swb button.red{border-color:#7f3a3a}#te .sw .swb button.red:hover{border-color:#ef4444;background:#3a1d1d}
#te-sw{right:326px;top:56px;width:304px;max-height:calc(100vh - 200px);display:flex;flex-direction:column;padding:8px;z-index:3}
#te-sw input[type=search]{flex:1;height:26px;padding:0 8px}
#te-sw .g{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;overflow-y:auto;scrollbar-width:thin;margin-top:6px}
#te-sw .g button{position:relative;aspect-ratio:1.15;padding:0;background:#27272a}
#te-sw .g img{width:100%;height:100%;object-fit:cover;display:block}
#te-sw .g span{position:absolute;left:0;right:0;bottom:0;font-size:9.5px;padding:7px 2px 1px;background:linear-gradient(transparent,rgba(0,0,0,.88));color:#f4f4f5;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#te-sw .g button.on{box-shadow:0 0 0 2px #ffd77a}
</style>`;
const CURVE = { smooth: 'M0,4 C30,4 50,46 80,46', linear: 'M0,4 L80,46', cliff: 'M0,4 L62,4 L66,46 L80,46' };
let memo = '', memoKey = '';
export function terrainEditor(player, bld, hour, groups) {
  const t = player?.isEditor ? player.state?.te : null;
  if (!t?.open) { memo = ''; memoKey = ''; return ''; }
  const sp = player.state?.speed ?? 1, noteOn = t.note && (Date.now() - (t.noteAt ?? 0) < 6000 || true);
  const ms = player.state?.ms ?? {}, key = JSON.stringify([t, bld, sp, Math.round((hour ?? 12) * 4), ms, groups ? Object.keys(groups) : 0, player.state?.ab, player.state?.abv, t.histOpen ? [player.state?.edHist?.length, player.state?.edHist?.at?.(-1)?.id, player.state?.edRedo?.length] : 0]); /* ab: the asset window's page, filter and shape; left out, its slots kept the old page while the 3D copies moved on */ if (key === memoKey) return memo; memoKey = key;
  const tool = TOOLS.find((x) => x[0] === t.tool) ?? TOOLS[0], grp = t.grp ?? tool[3];
  const r = t.r ?? TE.radius.def, s = t.s ?? TE.strength.def, f = t.f ?? TE.falloff.def, curve = t.curve ?? 'smooth';
  const hist = t.hist ?? [], redo = t.redo ?? [];
  const tod = Math.round((typeof hour === 'number' && isFinite(hour) ? hour : 12) * 4) / 4;
  const sel = bld?.sel ?? null, tab = (sel && t.selSeen !== sel) || (grp === 'actors' && (t.tab ?? 'terrain') === 'terrain') ? 'transform' : (t.tab ?? 'terrain');
  const SA = (o) => A({ ...o, sel });
  // top bar: mode, history, snap, falloff curve, fly speed · controls, export, close
  const top = `<div id="te-top">
    <span class="ttl">⛰ LANDSCAPE</span><div class="sep"></div>
    <div class="g"><button title="Undo (Ctrl+Z)" onclick="${A({ op: 'undo' })}" ${hist.length ? '' : 'disabled'}>↶ Undo ${hist.length}</button><button title="Redo last undone action (Ctrl+Y)" onclick="${A({ op: 'redo' })}" ${redo.length ? '' : 'disabled'} style="${redo.length ? 'color:#ffd36b;border-color:#c9a24a' : ''}">↷ Redo ${redo.length}</button><button class="${t.histOpen ? 'on' : ''}" title="History" onclick="${A({ op: 'hist' })}">☰</button></div><div class="sep"></div>
    <div class="g" title="Height snap for Flatten, Terrace, Chisel"><select onchange="${A({ op: 'snap' }).replace("})", ",v:+this.value})")}">${TE.snap.map((v) => `<option value="${v}"${(t.snap ?? 0) === v ? ' selected' : ''}>⊞ Snap: ${v === 0 ? 'off' : v + 'm'}</option>`).join('')}</select></div><div class="sep"></div>
    <div class="g" title="Falloff curve">${TE.curves.map(([c, n]) => `<button class="${curve === c ? 'on' : ''}" title="${n}" onclick="${A({ op: 'curve', v: c })}"><svg width="24" height="12" viewBox="0 0 80 50"><path d="${CURVE[c]}" fill="none" stroke="currentColor" stroke-width="7"/></svg></button>`).join('')}</div><div class="sep"></div>
    <div class="g" title="Fly speed"><span style="color:#a1a1aa">✈</span><input type="range" min="1" max="5" step="1" value="${sp}" style="width:80px;accent-color:#d9ad5e" onchange="sendAction('setSpeed',{v:+this.value})"><em style="font-style:normal;color:#e9c271;width:22px">${sp}×</em></div>
<div class="sep"></div>
    <div class="g" title="Placement: random spin & size, slope align, rotation snap"><button class="${t.rnd !== false ? 'on' : ''}" title="Random spin 0–360° and size 0.85–1.15× on nature, props and wildlife" onclick="${A({ op: 'rnd' })}">🎲</button><button class="${t.align ? 'on' : ''}" title="Align to slope: pieces lean flush with the ground (off = upright)" onclick="${A({ op: 'align' })}">∠</button>${[[0, 'free'], [15, '15°'], [45, '45°'], [90, '90°']].map(([v, n]) => `<button class="${(t.rsnap ?? 0) === v ? 'on' : ''}" title="Rotation snap ${n}" onclick="${A({ op: 'rsnap', v })}">${v ? n : '⟳'}</button>`).join('')}</div><div class="sep"></div>
    <div class="g" title="Preview the hour (build room)"><span style="color:#a1a1aa">☀</span><input type="range" min="0" max="23.75" step="0.25" value="${tod}" style="width:90px;accent-color:#d9ad5e" oninput="this.nextElementSibling.textContent=String(Math.floor(this.value)).padStart(2,'0')+':'+String(Math.round(this.value%1*60)).padStart(2,'0')" onchange="sendAction('wxHour',{h:+this.value})"><em style="font-style:normal;color:#e9c271;width:36px">${String(Math.floor(tod)).padStart(2, '0')}:${String(Math.round(tod % 1 * 60)).padStart(2, '0')}</em><button title="Back to the real clock" onclick="sendAction('wxHour',{real:true})">↺</button></div>
    <div style="flex:1"></div>
    <button class="${t.help ? 'on' : ''}" title="Controls (?)" onclick="${A({ op: 'help' })}">?</button>
    <button title="Export heights (128 m around the brush), editor marks and foliage as JSON" onclick="${A({ op: 'export' })}">⇩ Export</button>
    <button title="Close the editor" onclick="${A({ op: 'close' })}">✕</button></div>`;
  // left toolbar, 48 px: tool groups, then the active group's tools
  const selMode = grp === 'actors' && !bld?.carry;
  const left = `<div id="te-left"><button class="${selMode ? 'on' : ''}" title="Select: click any placed piece (Shift adds, Ctrl+drag boxes)" onclick="sendAction('bld',{op:'uncarry'});${A({ op: 'select' })}"><svg width="16" height="18" viewBox="0 0 16 18"><path d="M2 1 L2 15 L5.6 11.6 L8.2 17 L10.4 16 L7.8 10.8 L13 10.6 Z" fill="currentColor" stroke="rgba(0,0,0,.6)" stroke-width="1"/></svg></button><div class="div"></div>${GROUPS.map(([id, ic, nm]) => `<button class="${grp === id ? 'on' : ''}" title="${nm}" onclick="${A({ op: 'grp', v: id })}">${ic}</button>`).join('')}<div class="div"></div><div class="tl">${grp === 'actors'
      ? `<button class="${tab === 'transform' ? 'on' : ''}" title="Transform the selected piece" onclick="${SA({ op: 'tab', v: 'transform' })}">✥</button><button class="${ms.area ? 'on' : ''}" title="Area select: drag a circle on the ground, everything inside is selected (Shift adds · Ctrl+A = everything within ${ms.areaR ?? 20} m of the cursor)" onclick="sendAction('bld',{op:'uncarry'});sendAction('ms',{op:'area'})"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2"/><circle cx="9" cy="9" r="1.6" fill="currentColor"/></svg></button>${[10, 25, 50, 100].map((r) => `<button style="font-size:10px" class="${(ms.areaR ?? 20) === r ? 'on' : ''}" title="Select everything within ${r} m of the cursor" onclick="sendAction('ms',{op:'areaR',v:${r}});sendAction('ms',{op:'allHere',r:${r}})">${r}</button>`).join('')}`
      : TOOLS.filter((x) => x[3] === grp).map(([id, ic, nm, , tip]) => `<button class="${t.tool === id ? 'on' : ''}" title="${nm}: ${tip}" onclick="${SA({ op: 'tool', v: id })}">${ic}</button>`).join('')}</div></div>`;
  // right inspector: [Terrain] | [Transform] | [Properties]
  const sl = (k, lab, L, v, u = 'm') => `<label class="sl" onwheel="event.preventDefault();sendAction('te',{op:'${k}',v:${v}+(event.deltaY<0?1:-1)*${L.step}})"><b>${lab}</b><input type="range" min="${L.min}" max="${L.max}" step="${L.step}" value="${v}" oninput="this.nextElementSibling.textContent=this.value+'${u}'" onchange="sendAction('te',{op:'${k}',v:+this.value})"><em>${v}${u}</em></label>`;
  const rng = (op, lab, min, max, st, v, u = '') => `<label class="sl"><b>${lab}</b><input type="range" min="${min}" max="${max}" step="${st}" value="${v}" oninput="this.nextElementSibling.textContent=this.value+'${u}'" onchange="sendAction('te',{op:'${op}',v:+this.value})"><em>${v}${u}</em></label>`;
  const two = ['ramp', 'chisel'].includes(t.tool), river = t.tool === 'river';
  const steps = two ? `<div class="tip" style="color:#bfe6ee;margin:6px 0">${(t.pend ?? []).length ? '● start set · click the end point' : 'click the start point'}</div>` : river ? `<div style="display:flex;gap:5px;margin:6px 0"><button style="flex:1;padding:5px" class="on" onclick="${A({ op: 'finish' })}">✓ Finish river (${(t.pend ?? []).length})</button><button style="padding:5px 9px" onclick="${A({ op: 'cancel' })}">✕</button></div>` : '';
  const flatH = t.tool === 'flatten' ? `<div class="sl"><b>Height</b><span style="flex:1;color:#e9c271">${t.h == null ? 'click height' : t.h + ' m'}</span><button style="padding:3px 7px" onclick="${A({ op: 'h', v: null })}" title="use the height under each click">auto</button></div>` : '';
  const strLab = { terrace: 'Step', ramp: 'Grade %', river: 'Depth', lake: 'Depth', chisel: 'Depth', erodeH: 'Cut' }[t.tool] ?? 'Strength';
  const paintish = ['paint', 'blend', 'ramp', 'pathpaint'].includes(t.tool);
  const layers = paintish ? `<div class="h">Splat layer</div><div class="lay">${ALL_LAYERS.map(([id, c]) => `<button class="${t.mat === id ? 'on' : ''}" title="${id}" onclick="${A({ op: 'mat', v: id })}">${SW(id, c)}<i>${id}</i></button>`).join('')}</div>
    ${t.tool !== 'ramp' ? `<div class="h">Edge layer</div><div class="lay"><button class="${!t.mat2 ? 'on' : ''}" onclick="${A({ op: 'mat2', v: null })}">same</button>${ALL_LAYERS.map(([id, c]) => `<button class="${t.mat2 === id ? 'on' : ''}" title="${id}" onclick="${A({ op: 'mat2', v: id })}">${SW(id, c)}<i>${id}</i></button>`).join('')}</div>` : ''}` : '';
  const biome = t.tool === 'biome' ? `<div class="h">Auto-biome rules</div><div class="tip">▲ cliff &gt; 42° → rock · ◢ steep &gt; 24° → mossRock · ▬ flat → grass · low → sand</div>${rng('snow', 'Snow line', 40, 600, 5, t.snow ?? 160, 'm')}` : '';
  const fol = ['foliage', 'reseed'].includes(t.tool) ? `<div class="h">Scatter palette</div><div class="fol">${FOLIAGE.filter((id) => PREFAB[id]).map((id) => `<button class="${t.fol?.[id] ? 'on' : ''}" title="${PREFAB[id].label}" onclick="${A({ op: 'fol', v: id })}"><img src="${IMG[id] ?? ''}" alt=""><span>${PREFAB[id].label}${t.fol?.[id] ? ' ×' + t.fol[id] : ''}</span></button>`).join('')}</div>
    ${rng('dens', 'Density', 0.1, 6, 0.1, t.dens ?? 1)}${rng('scmin', 'Scale min', 0.2, 3, 0.05, t.sc?.[0] ?? 0.8)}${rng('scmax', 'Scale max', 0.3, 5, 0.05, t.sc?.[1] ?? 1.25)}${edBrush(player, t, PREFAB, IMG)}<div class="tip">🖌 drag paints · Shift or Ctrl+drag erases · tilt/yaw jitter &amp; ∠ align from the top bar</div>` : '';
  const curveSvg = `<svg viewBox="0 0 240 70" width="100%" height="56" style="margin-top:4px;background:#0f0f12;border-radius:4px;border:1px solid #27272a"><path d="M0,66 ${curve === 'cliff' ? `L0,8 L${240 * r / (r + f) - 4},8 L${240 * r / (r + f)},66` : curve === 'linear' ? `L0,8 L${240 * r / (r + f)},8 L240,66` : `L0,8 L${240 * r / (r + f)},8 C${240 * r / (r + f) + 240 * f / (r + f) * 0.5},8 ${240 * r / (r + f) + 240 * f / (r + f) * 0.5},66 240,66`} Z" fill="rgba(217,173,94,.22)" stroke="#e9c271" stroke-width="2"/><line x1="${240 * r / (r + f)}" y1="0" x2="${240 * r / (r + f)}" y2="70" stroke="#9fe4ff" stroke-dasharray="3 3"/></svg>`;
  const pTerrain = `<div class="tt">${tool[1]} ${tool[2]}</div><div class="tip">${tool[4]}</div>${steps}
    <div class="h">Brush</div>${sl('r', 'Radius', TE.radius, r)}${sl('s', strLab, TE.strength, s, '')}${sl('f', 'Falloff', TE.falloff, f)}${curveSvg}${flatH}${layers}${biome}${fol}`;
  const sid = sel ? String(sel).replace(/^pf-/, '').replace(/-[a-z0-9]+$/, '') : null, P = sid ? PREFAB[sid] : null;
  const at = bld?.at, BA = (o) => `sendAction('bld',${q(o)})`, ibt = (ic, tip, o, cls = '') => `<button class="${cls}" title="${tip}" onclick="${BA(o)}">${ic}</button>`;
  const ax = (k, c, v) => `<label title="${k.toUpperCase()} (type and press Enter; wheel nudges)"><b style="background:${c}">${k.toUpperCase()}</b><input type="number" step="${k === 'y' ? 0.25 : 0.5}" value="${v ?? ''}" onwheel="event.preventDefault();this.value=(+this.value+(event.deltaY<0?1:-1)*${k === 'y' ? 0.25 : 0.5}).toFixed(2);sendAction('bld',{op:'pos',${k}:+this.value})" onchange="sendAction('bld',{op:'pos',${k}:+this.value})"></label>`;
  const esc = (x) => String(x ?? '').replace(/[<>"']/g, '');
  const cardId = bld?.carry || ms.card || null, CP = cardId ? PREFAB[cardId] : null;
  const swapBox = `<div class="h" style="margin:8px 0 0">Swap with</div><div class="sw"><button class="swc${bld?.swapOpen ? ' on' : ''}" title="Choose the card to swap in (or click one in the drawer below)" onclick="${BA({ op: 'swapOpen' })}">${CP ? `<img src="${IMG[cardId] ?? ''}" alt="">` : '<i>?</i>'}<span>${CP ? esc(CP.label) : 'pick a card'} ▾</span></button><div class="swb"><button class="on" ${CP ? '' : 'disabled'} title="This piece becomes ${CP ? esc(CP.label) : 'the card'}: same spot, turn and size (Ins)" onclick="${BA({ op: 'swap', id: cardId })}">⇄ Swap</button><button class="red" ${CP ? '' : 'disabled'} title="Every piece like this one in ${at ? zoneOf(at.x, at.z) : 'this zone'} becomes ${CP ? esc(CP.label) : 'the card'} (Shift+Ins)" onclick="${BA({ op: 'replaceAll', id: cardId })}">⇶ All in ${at ? esc(zoneOf(at.x, at.z)) : 'zone'}</button></div></div>`;
  const selCat = P?.cat ?? 'nature', swQ = String(bld?.swapQ ?? '').toLowerCase().trim();
  const swPool = sel && bld?.swapOpen ? PREFABS.filter((p) => swQ ? (String(p.label).toLowerCase().includes(swQ) || String(p.id).toLowerCase().includes(swQ)) : p.cat === selCat).slice(0, 72) : [];
  if (CP && sel && bld?.swapOpen && !swPool.some((p) => p.id === cardId)) swPool.unshift(CP);
  const swPop = sel && bld?.swapOpen ? `<div id="te-sw"><div style="display:flex;gap:4px;align-items:center"><input type="search" placeholder="🔍 search every card…" value="${esc(bld?.swapQ)}" onchange="sendAction('bld',{op:'swapOpen',v:true,q:this.value})"><button style="height:26px;width:26px;padding:0" title="Close" onclick="${BA({ op: 'swapOpen', v: false })}">✕</button></div><div class="tip" style="margin-top:4px">${swQ ? `${swPool.length} match "${esc(swQ)}"` : `${esc((CATS.find((c) => c[0] === selCat) ?? [0, 0, selCat])[2])} like the selected piece · search for anything`}. Click one, then Swap or Replace all.</div><div class="g">${swPool.map((p) => `<button class="${p.id === cardId ? 'on' : ''}" title="${esc(p.label)}" onclick="sendAction('bld',{op:'swapCard',id:'${p.id}'})"><img src="${IMG[p.id] ?? ''}" alt="" loading="lazy"><span>${esc(p.label)}</span></button>`).join('') || '<div class="tip">nothing found</div>'}</div></div>` : '';
  const nst = +(player.state.ab?.nst ?? 1), NST = [0.1, 0.5, 1, 5]; // the arrows' step, metres
  const nb = (ic, tip, o) => `<button title="${tip}" onclick="${BA(o)}">${ic}</button>`;
  const axb = (k) => at ? `<span class="pm">${nb('−', `${k.toUpperCase()} −${nst} m`, { op: 'pos', [k]: Math.round((at[k] - nst) * 100) / 100 })}${nb('+', `${k.toUpperCase()} +${nst} m`, { op: 'pos', [k]: Math.round((at[k] + nst) * 100) / 100 })}</span>` : '';
  const pad = `<div class="np"><div class="pad">${nb('⟲', 'Turn left 15° (,)', { op: 'rot', d: 15 })}${nb('▲', `Push away ${nst} m`, { op: 'mv', f: 1, st: nst })}${nb('⟳', 'Turn right 15° (.)', { op: 'rot', d: -15 })}${nb('◀', `Left ${nst} m`, { op: 'mv', r: -1, st: nst })}${nb('◎', 'Bring in front of me (Home)', { op: 'here' })}${nb('▶', `Right ${nst} m`, { op: 'mv', r: 1, st: nst })}${nb('⊟', 'Smaller', { op: 'scaleBy', f: 1 / 1.1 })}${nb('▼', `Pull closer ${nst} m`, { op: 'mv', f: -1, st: nst })}${nb('⊞', 'Bigger', { op: 'scaleBy', f: 1.1 })}</div>
    <div class="ud">${nb('⤒', `Lift ${nst} m (PgUp)`, { op: 'up', d: nst })}${nb('⤓', `Lower ${nst} m (PgDn)`, { op: 'up', d: -nst })}</div>
    <div class="st">${NST.map((v) => `<button class="${v === nst ? 'on' : ''}" title="Arrow step ${v} m" onclick="sendAction('bld',${q({ op: 'ab', nst: v })})">${v}</button>`).join('')}<i>m</i></div></div>`;
  const pTransform = sel ? `<div class="xf"><div class="h" style="margin:4px 0 0">Position</div><div class="xyz">${ax('x', '#f87171', at?.x)}${ax('y', '#86efac', at?.y)}${ax('z', '#93c5fd', at?.z)}</div><div class="xyz pmr">${axb('x')}${axb('y')}${axb('z')}</div>
    <div class="h" style="margin:6px 0 2px">Move · turn · size (from where you look)</div>${pad}
    <div class="h" style="margin:4px 0 0">Rotation · Scale</div><div class="xyz" style="grid-template-columns:1fr 1fr"><label title="Yaw in degrees"><b style="background:#fcd34d">⟳</b><input type="number" step="15" value="${at?.yaw ?? 0}" onwheel="event.preventDefault();this.value=+this.value+(event.deltaY<0?15:-15);sendAction('bld',{op:'yaw',v:+this.value})" onchange="sendAction('bld',{op:'yaw',v:+this.value})"></label><label title="Scale ×"><b style="background:#d9ad5e">⇲</b><input type="number" step="0.05" min="0.02" value="${(+(bld?.sc ?? 1)).toFixed(2)}" onwheel="event.preventDefault();sendAction('bld',{op:'scaleBy',f:event.deltaY<0?1.06:1/1.06})" onchange="sendAction('bld',{op:'scale',v:+this.value})"></label></div>
    <div class="ic">${ibt('∠', 'Align to slope', { op: 'align' })}${ibt('⊥', 'Upright', { op: 'upright' })}${ibt('⏚', 'Snap to ground (End)', { op: 'drop' })}<button title="⤓ Settle: let it fall and tumble for 2.5 s, then freeze it (skips buildings, >6 m, models bigger than a cart)" onclick="sendAction('edx',{op:'settle'})">⤓ Settle</button>${ibt('🎲', 'Random yaw', { op: 'rndYaw' })}${ibt('◎', 'Bring in front of me', { op: 'here' })}${ibt('⧉', 'Duplicate beside it', { op: 'dup' })}${ibt('⊘', 'Deselect', { op: 'none' })}${ibt('🗑', 'Delete (Del)', { op: 'del' }, 'red')}</div>
    ${swapBox}<div class="ic">${ibt('↶', 'Undo last placement', { op: 'undo' })}${ibt('♻', 'Bring back the last deleted piece', { op: 'restore' })}${ibt('⌖', 'Select the nearest piece', { op: 'pick' })}</div><div class="tip" style="margin-top:6px;line-height:1.5">Del delete · Ctrl+D copy · Ins swap · Shift+Ins replace all · , . turn · PgUp/PgDn lift · Home bring here · End ground · Ctrl+Shift+Z restore · click ground to deselect</div></div>` : `<div class="tip" style="margin-top:10px">↖ Click anything in the world to select it (it glows yellow), or pick a card in the drawer below and click the ground.</div><div class="ic" style="margin-top:6px">${ibt('⌖', 'Select the nearest piece', { op: 'pick' })}${ibt('↶', 'Undo last placement', { op: 'undo' })}${ibt('♻', 'Bring back the last deleted piece', { op: 'restore' })}</div>`;
  const pProps = `<div class="h">Selection</div>${sel ? `<div class="kv">Piece<em>${P?.label ?? sid}</em></div><div class="kv">Id<em>${String(sel).replace(/</g, '')}</em></div><div class="kv">Scale<em>${(+(bld?.sc ?? 1)).toFixed(2)}×</em></div><div class="kv">Category<em>${P?.cat ?? '—'}</em></div>` : '<div class="tip">none</div>'}
    <div class="h">Session</div><div class="kv">Strokes<em>${hist.length}</em></div><div class="kv">Redo<em>${redo.length}</em></div><div class="kv">Placed this visit<em>${bld?.last?.length ?? 0}</em></div><div class="kv">Snap<em>${t.snap ? t.snap + ' m' : 'off'}</em></div>
    <div style="display:flex;gap:4px;margin-top:8px"><button style="flex:1;height:26px" onclick="${A({ op: 'count' })}">Count marks</button><button style="flex:1;height:26px" onclick="${A({ op: 'export' })}">⇩ Export</button></div>`;
  const MS = (o) => `sendAction('ms',${q(o)})`, nSel = (ms.ids ?? []).length, L = ms.locks ?? {};
  const ib = (ic, tip, o, cls = '') => `<button class="${cls}" style="height:28px;min-width:30px;padding:0 6px" title="${tip}" onclick="${MS(o)}">${ic}</button>`;
  const rowB = (...b) => `<div style="display:flex;gap:3px;flex-wrap:wrap;margin:3px 0">${b.join('')}</div>`;
  const jr = (k, lab, max, v, u) => `<label class="sl"><b>${lab}</b><input type="range" min="0" max="${max}" step="1" value="${v}" oninput="this.nextElementSibling.textContent='±'+this.value+'${u}'" onchange="sendAction('te',{op:'jit',k:'${k}',v:+this.value})"><em>±${v}${u}</em></label>`;
  const gl = Object.keys(groups ?? {});
  const pMulti = `<div class="h">Selection · ${nSel}</div><div class="tip">Ctrl+drag box · ◎ drag circle · Ctrl+A area · Shift adds · Del deletes</div>
    ${rowB(ib('≈', 'Select similar within 80 m', { op: 'similar' }), ib('⇋', 'Invert (60 m)', { op: 'invert' }), ib('⊘', 'Clear selection', { op: 'clear' }), ib(ms.pivot === 'each' ? '⊙' : '◎', ms.pivot === 'each' ? 'Pivot: each origin (click for median)' : 'Pivot: median point (click for each origin)', { op: 'pivot' }))}
    ${rowB(ib('⟲', 'Turn 15°', { op: 'rot', d: 15 }), ib('⟳', 'Turn −15°', { op: 'rot', d: -15 }), ib('↻', 'Turn 90°', { op: 'rot', d: 90 }), ib('⇲', 'Grow 10%', { op: 'scale', k: 1.1 }), ib('⇱', 'Shrink 10%', { op: 'scale', k: 1 / 1.1 }), ib('⏚', 'Drop all to ground (End)', { op: 'drop' }))}
    ${rowB(ib('⧉', 'Duplicate 3 m ahead', { op: 'dup' }), ib('⎘', 'Copy', { op: 'copy' }), ib('✂', 'Cut', { op: 'cut' }), ib('📋', 'Paste at the cursor', { op: 'paste' }), ib('👁', 'Hide selection', { op: 'hide' }), ib('◉', 'Unhide all hidden', { op: 'unhide' }))}
    <div class="h">Delete</div>${rowB(ib('🗑 all', 'Delete selection', { op: 'del' }, ''), ...[['prop', '📦'], ['foliage', '🌲'], ['building', '🏠'], ['npc', '🧑']].map(([c, ic]) => ib('🗑' + ic, `Delete only ${c} in the selection`, { op: 'del', only: c })), ib('♻', 'Bring back the last batch', { op: 'restore' }))}
    <div class="h">Array</div><div style="display:flex;gap:4px;align-items:center"><span class="tip">×</span><input type="number" min="1" max="40" value="${ms.arrN ?? 5}" style="width:44px;background:#0f0f12;color:#e4e4e7;border:1px solid #3f3f46;border-radius:4px" onchange="sendAction('ms',{op:'arrN',v:+this.value})"><span class="tip">every</span><input type="number" min="0.5" max="40" step="0.5" value="${ms.arrD ?? 4}" style="width:48px;background:#0f0f12;color:#e4e4e7;border:1px solid #3f3f46;border-radius:4px" onchange="sendAction('ms',{op:'arrD',v:+this.value})"><span class="tip">m</span>${ib('→ Array', 'Copies in a line ahead of the camera', { op: 'array' })}</div>
    <div class="h">Card · ${ms.card ? (PREFAB[ms.card]?.label ?? ms.card) : 'pick one in the tray'}</div>${rowB(ib('⇄ Swap', 'Swap the selection to this card, same spot, turn and size', { op: 'swap' }), ib('▦ Fill box', 'Fill the last Ctrl+drag box with this card', { op: 'fill' }))}
    <label class="sl"><b>Fill gap</b><input type="range" min="1" max="20" step="1" value="${ms.fillD ?? 4}" oninput="this.nextElementSibling.textContent=this.value+'m'" onchange="sendAction('ms',{op:'fillD',v:+this.value})"><em>${ms.fillD ?? 4}m</em></label>
    <div class="h">Placement</div>${jr('jy', 'Yaw', 180, t.jy ?? 180, '°')}${jr('jt', 'Tilt', 15, t.jt ?? 0, '°')}${jr('js', 'Scale', 50, t.js ?? 15, '%')}
    <div class="sl"><b>Stamp</b>${[0, 1, 2, 3, 5, 8].map((v) => `<button style="height:24px;padding:0 6px" class="${(t.stamp ?? 0) === v ? 'on' : ''}" title="${v ? `hold and drag a card: one every ${v} m` : 'single drop'}" onclick="${A({ op: 'stamp', v })}">${v ? v + 'm' : 'off'}</button>`).join('')}</div>
    <div class="h">Lock layers</div>${rowB(...[['building', '🏠'], ['foliage', '🌲'], ['prop', '📦'], ['npc', '🧑'], ['critters', '🐇']].map(([c, ic]) => `<button class="${L[c] ? 'on' : ''}" style="height:28px;min-width:34px" title="${L[c] ? 'Unlock' : 'Lock'} ${c}: locked pieces can't be selected" onclick="${MS({ op: 'lock', v: c })}">${L[c] ? '🔒' : ''}${ic}</button>`))}
    <div class="h">Groups</div><div style="display:flex;gap:4px"><input id="te-gname" placeholder="name" maxlength="24" style="flex:1;min-width:0;background:#0f0f12;color:#e4e4e7;border:1px solid #3f3f46;border-radius:4px;padding:3px 6px"><button style="height:26px;padding:0 8px" title="Save the selection as a group" onclick="sendAction('ms',{op:'saveGroup',name:document.getElementById('te-gname').value})">💾 Save</button></div>
    ${gl.map((g) => `<div style="display:flex;gap:3px;margin-top:3px"><button style="flex:1;height:26px;text-align:left;padding:0 8px" title="Place at the cursor" onclick="${MS({ op: 'group', name: g })}">▣ ${g.replace(/</g, '')} <span style="opacity:.5">${groups[g]?.length ?? 0}</span></button><button style="height:26px;width:26px;padding:0" title="Remove group" onclick="${MS({ op: 'delGroup', name: g })}">✕</button></div>`).join('') || '<div class="tip">none yet</div>'}`;
  const TABS = [['terrain', '⛰ Terrain'], ['transform', '✥ Transform'], ['props', '☷ Properties'], ['outline', '☰ Outliner'], ['logic', '◈ Logic'], ['ai', '✦ AI']];
  const pvId = bld?.carry || (P ? sid : null), PV = pvId ? PREFAB[pvId] : null;
  const pv = PV ? `<div id="te-pv"><div class="win"></div><div class="nm"><b>${String(PV.label ?? pvId).replace(/</g, '&lt;')}</b><span>${bld?.carry === pvId ? 'in hand · click the ground' : 'selected'}</span></div><img alt="" style="display:none" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onload="sendAction('bld',{op:'pv',W:innerWidth,H:innerHeight})"></div>` : '';
  const idle = grp === 'actors' && !sel && !bld?.carry && !nSel && !['outline', 'logic', 'ai'].includes(t.tab);
  const right = idle ? '' : pv + `<div id="te-right"${PV ? ' style="top:268px"' : ''}><div id="te-tabs">${TABS.map(([id, nm]) => `<button class="${tab === id ? 'on' : ''}" onclick="${SA({ op: 'tab', v: id })}">${nm}</button>`).join('')}${(sel || nSel) && tab !== 'ai' ? `<button title="✦ Ask Savi about the selection" style="color:#f5c84b;border-color:#f5c84b88" onclick="${SA({ op: 'tab', v: 'ai' })}">✦ Ask Savi</button>` : ''}</div><div id="te-ins">${tab === 'transform' ? (grp === 'actors' || nSel > 1 ? (nSel === 1 && sel ? '<div class="h">Piece</div>' + pTransform + pMulti : (nSel ? pMulti : pTransform)) : pTransform) : tab === 'props' ? pProps : tab === 'outline' ? edOutlinerTab(player) : tab === 'logic' ? edLogicTab(player) : tab === 'ai' ? edAiTab(player) : pTerrain}</div></div>`;
  // ASSET BROWSER window (creator 2026-10-09): 5 columns of slots, wheel-scrolled by rows, each slot a tiny spinning 3D copy
  // (scripts/build-tool.js gridTick stands them in the clear slots). Category rail on the left, colour swatches up top. \ opens / closes.
  const ab = player.state.ab ?? {}, g = geo(ab), list = abList(ab), nAll = list.length, mr = maxRow(nAll, g), row = Math.min(Math.max(0, +ab.row || 0), mr);
  const per = g.cols * g.rows, shown = list.slice(row * g.cols, row * g.cols + per), cnt = counts();
  const AA = (o) => `sendAction('bld',${q({ op: 'ab', ...o })})`;
  const catNow = ABCATS.find((c) => c[0] === (ab.cat ?? 'all')) ?? ABCATS[0];
  const rail = ABCATS.map(([id, ic, nm]) => `<button class="${catNow[0] === id ? 'on' : ''}" title="${nm} · ${cnt[id] ?? 0}" onclick="${AA({ cat: id, row: 0 })}">${ic}</button>`).join('');
  const sw = `<button class="dot all${(ab.hue ?? -1) < 0 ? ' on' : ''}" title="every colour" onclick="${AA({ hue: -1, row: 0 })}"></button>` + HUES.map(([nm, c], i) => `<button class="dot${ab.hue === i ? ' on' : ''}" title="${nm}" style="background:${c}" onclick="${AA({ hue: ab.hue === i ? -1 : i, row: 0 })}"></button>`).join('');
  const slots = Array.from({ length: per }, (_, i) => { const p = shown[i]; if (!p) return `<div class="slot empty"></div>`;
    return `<button class="slot${bld?.carry === p.id ? ' on' : ''}" title="${String(p.label).replace(/"/g, '')}: click, then click the ground" draggable="false" ondragstart="return false" onpointerdown="sendAction('bld',{op:'carry',id:'${p.id}'})">${thumb(p.id, 60) ? `<i class="th" style="${thumb(p.id, 60)}"></i>` : ''}<span>${String(p.label).replace(/</g, '&lt;')}</span>${player.isEditor && t.tool === 'foliage' ? `<i title="Add to brush" style="position:absolute;right:2px;top:2px;width:18px;height:18px;line-height:17px;border-radius:4px;background:${t.fol?.[p.id] ? '#d9ad5e' : '#0f0f12'};color:${t.fol?.[p.id] ? '#18181b' : '#e9c271'};border:1px solid #3f3f46;font-style:normal;font-size:12px;text-align:center;z-index:3" onpointerdown="event.stopPropagation();sendAction('edx',{op:'brushAdd',id:'${p.id}'})">${t.fol?.[p.id] ? '×' + t.fol[p.id] : '＋'}</i>` : ''}</button>`; }).join('');
  const thumbH = Math.max(18, Math.round(g.gridH * Math.min(1, g.rows / Math.max(g.rows, Math.ceil(nAll / g.cols))))), thumbT = mr ? Math.round((g.gridH - thumbH) * row / mr) : 0;
  const wheel = `onwheel="event.preventDefault();var n=Date.now();if(n-(window.__abw||0)>70){window.__abw=n;sendAction('bld',{op:'ab',d:event.deltaY>0?1:-1})}"`;
  const bot = t.tray ? `<button id="te-abo" title="Open the asset window (\\)" onclick="${A({ op: 'tray' })}">📦 Assets</button>`
    : `<div id="te-ab" style="left:${g.left}px;bottom:${g.bottom}px;width:${g.w}px;height:${g.h}px" onpointerenter="if(window.__abW!==innerWidth+'x'+innerHeight){window.__abW=innerWidth+'x'+innerHeight;sendAction('bld',{op:'pv',W:innerWidth,H:innerHeight})}"><div class="hd" title="Drag to move · double-click to reset" onpointerdown="if(event.target.closest('button,input'))return;var w=document.getElementById('te-ab'),r=w.getBoundingClientRect();window.__abd={sx:event.clientX,sy:event.clientY,l:r.left,b:innerHeight-r.bottom,w:r.width,h:r.height};this.setPointerCapture(event.pointerId)" onpointermove="var d=window.__abd;if(!d)return;var w=document.getElementById('te-ab'),x=Math.min(innerWidth-d.w,Math.max(0,d.l+event.clientX-d.sx)),y=Math.min(innerHeight-d.h,Math.max(0,d.b-(event.clientY-d.sy)));w.style.left=x+'px';w.style.bottom=y+'px';d.x=x;d.y=y" onpointerup="var d=window.__abd;window.__abd=null;if(d&&d.x!=null)sendAction('bld',{op:'ab',x:d.x,y:d.y})" ondblclick="if(!event.target.closest('button,input'))sendAction('bld',{op:'ab',reset:true})"><b>${catNow[1]} ${catNow[2]}</b><input type="search" placeholder="🔍 search…" value="${String(ab.q ?? '').replace(/"/g, '')}" onchange="${AA({ q: '__Q__', row: 0 }).replace("'__Q__'", 'this.value')}"><button class="${(ab.sort ?? 'color') === 'color' ? 'on' : ''}" title="Arrange by colour" onclick="${AA({ sort: 'color', row: 0 })}">🎨</button><button class="${ab.sort === 'name' ? 'on' : ''}" title="Arrange A–Z" onclick="${AA({ sort: 'name', row: 0 })}">A–Z</button><button class="${ab.spin !== false ? 'on' : ''}" title="Spin the models (off = they stand still, lighter)" onclick="${AA({ spin: ab.spin === false })}">⟳</button><button title="Close (\\)" onclick="${A({ op: 'tray' })}">✕</button></div>
      <div class="sw">${sw}<span class="cnt">${nAll ? `${row * g.cols + 1}–${row * g.cols + shown.length} of ${nAll}` : '0 found'}</span></div>
      <div class="rail">${rail}</div><div class="grid" style="width:${g.gridW}px;height:${g.gridH}px;grid-template-columns:repeat(${g.cols},76px)" ${wheel}>${slots}</div>
      <div class="sb"><button ${row > 0 ? '' : 'disabled'} onclick="${AA({ d: -g.rows })}">▲</button><div class="tr" ${wheel}><i style="top:${thumbT}px;height:${thumbH}px"></i></div><button ${row < mr ? '' : 'disabled'} onclick="${AA({ d: g.rows })}">▼</button></div><div class="grip" title="Drag to resize · double-click the header to reset" onpointerdown="var w=document.getElementById('te-ab'),r=w.getBoundingClientRect();window.__abr={sx:event.clientX,sy:event.clientY,w:r.width,h:r.height,b:innerHeight-r.bottom};this.setPointerCapture(event.pointerId);event.stopPropagation()" onpointermove="var d=window.__abr;if(!d)return;var w=document.getElementById('te-ab'),c=Math.min(10,Math.max(3,Math.round((d.w+event.clientX-d.sx-74)/82))),rw=Math.min(8,Math.max(2,Math.round((d.h+event.clientY-d.sy-76)/82))),H=rw*82+76;w.style.width=(c*82+74)+'px';w.style.height=H+'px';w.style.bottom=Math.max(0,d.b-(H-d.h))+'px';d.c=c;d.r=rw;d.y=Math.max(0,d.b-(H-d.h))" onpointerup="var d=window.__abr;window.__abr=null;if(d&&d.c)sendAction('bld',{op:'ab',cols:d.c,rows:d.r,x:document.getElementById('te-ab').getBoundingClientRect().left,y:d.y})">◢</div><style>#te-ab~#te-stat{left:${g.bottom < 44 ? g.left + g.w + 8 : 64}px}</style>
      ${player.state.abv?.W ? '' : `<img alt="" data-k="abv" style="display:none" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onload="sendAction('bld',{op:'pv',W:innerWidth,H:innerHeight})" onerror="sendAction('bld',{op:'pv',W:innerWidth,H:innerHeight})">`}</div>`;
  const hrows = hist.slice().reverse().map((e, i) => `<button class="row${i === 0 ? ' cur' : ''}" title="undo back to before this" onclick="${A({ op: 'jump', v: e.id })}">${i === 0 ? '▸' : '·'} ${e.label}<em>${(e.keys?.length ?? 0) + (e.beds?.length ?? 0)}</em></button>`).join('') || `<div class="tip" style="padding:6px">no strokes yet</div>`;
  const histP = t.histOpen ? edHistPanel(player) : ''; void hrows; // unified list: terrain + build edits (scripts/ed-history-ui.js)
  // one status line, bottom centre: brush readout + the latest note
  const status = `<div id="te-stat">${tool[1]} <b>${tool[2]}</b> · r ${r} · ${strLab.toLowerCase()} ${s} · falloff ${f}${t.snap ? ` · snap ${t.snap}` : ''}${(ms.note && (ms.noteAt ?? 0) > (t.noteAt ?? 0) ? ms.note : t.note) ? ` · <i>${String(ms.note && (ms.noteAt ?? 0) > (t.noteAt ?? 0) ? ms.note : t.note).replace(/</g, '&lt;')}</i>` : ''}${nSel ? ` · <b>${nSel} selected</b>` : ''}</div>`;
  const help = t.help ? `<div id="te-help"><div class="h" style="margin-top:0">Controls</div><table>
    <tr><td>Right-drag</td><td>look</td></tr><tr><td>W A S D</td><td>fly</td></tr><tr><td>Space / C</td><td>up / down</td></tr><tr><td>Shift</td><td>fly fast</td></tr><tr><td>Wheel</td><td>dolly</td></tr>
    <tr><td>LMB</td><td>apply brush</td></tr><tr><td>Shift + LMB</td><td>invert (lower, erase)</td></tr><tr><td>Ctrl + LMB</td><td>sample height</td></tr>
    <tr><td>[ ]</td><td>radius</td></tr><tr><td>Shift + [ ]</td><td>falloff</td></tr><tr><td>Ctrl + [ ]</td><td>strength</td></tr>
    <tr><td>Ctrl + drag (Actors)</td><td>box select</td></tr><tr><td>◎ + drag (Actors)</td><td>select everything in a circle</td></tr><tr><td>Ctrl + A (Actors)</td><td>select everything around the cursor</td></tr><tr><td>Shift + click</td><td>add / remove</td></tr><tr><td>Delete</td><td>delete selection</td></tr><tr><td>Ctrl + Z / Ctrl + Y</td><td>undo / redo</td></tr><tr><td>End</td><td>drop selection to ground</td></tr><tr><td>\\</td><td>hide / show the asset drawer</td></tr><tr><td>↖ arrow tool</td><td>click to select pieces</td></tr></table>
    <button style="margin-top:10px;width:100%;height:28px" onclick="${A({ op: 'help' })}">Close</button></div>` : '';
  memo = CSS + `<div id="te" data-modal>${top}${left}${right}${swPop}${bot}${histP}${status}${help}</div>`;
  return memo;
}
