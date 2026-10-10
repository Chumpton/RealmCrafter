// The admin window's Build tab: picture cards to place NPCs, buildings, nature and props in front of you,
// with refined category tabs, quick search, page controls, and icon preview cards.
// Talks to scripts/build-tool.js via bld.
import { PREFABS, PREFAB, CATS } from '../../scripts/lib/data/prefabs.js';
import { IMG } from '../../scripts/lib/data/prefab-img.js';
import { thumb } from '../../scripts/lib/prefab-thumb.js';

const OGRE = '/cdn/value.088a5984e11d4ec042cd95841b397dd6e430351fc58c537ed09bdbc811caa75f.png';
const go = (o) => `sendAction('bld',${JSON.stringify(o).replace(/"/g, "'")})`;
const B = (icon, tip, o, cls = '') => `<button class="bt ${cls}" title="${tip}" onclick="${go(o)}">${icon}</button>`;

export const BUILD_CSS = `<style>
#den-settings .bd{column-span:all;display:flex;gap:12px;min-height:100%}
#den-settings .bd-l{flex:1.6;min-width:0;display:flex;flex-direction:column;gap:8px}
#den-settings .bd-cats{display:grid;grid-template-columns:repeat(6, 1fr);gap:4px}
#den-settings .bd-cat{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:5px 2px 4px;font:10px Georgia,serif;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
#den-settings .bd-cat i{font-style:normal;font-size:16px;line-height:1}
#den-settings .bd-cat span{font-size:9.5px;letter-spacing:.04em;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#den-settings .bd-topbar{display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(20,24,28,.65);border:1px solid #5a4b2e;border-radius:5px;padding:4px 8px}
#den-settings .bd-search-box{flex:1;display:flex;align-items:center;gap:6px}
#den-settings .bd-search-input{flex:1;background:rgba(10,12,15,.75);border:1px solid #7d6335;border-radius:4px;color:#f3e6c8;font:11px Georgia,serif;padding:3px 8px;outline:none}
#den-settings .bd-search-input:focus{border-color:#ffd77a}
#den-settings .bd-meta{font:11px Georgia,serif;color:#d9b46a;letter-spacing:.06em;white-space:nowrap}
#den-settings .bd-pages{display:flex;align-items:center;gap:4px}
#den-settings .bd-pbt{height:24px;min-width:24px;padding:0 6px;border-radius:3px;font:11px Georgia,serif;cursor:pointer;background:#2d353b;border:1px solid #7d6335;color:#f3e6c8}
#den-settings .bd-pbt:hover:not(:disabled){border-color:#ffd77a;background:#3a454d}
#den-settings .bd-pbt:disabled{opacity:.35;cursor:default}
#den-settings .bd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:7px;overflow-y:auto;max-height:calc(100vh - 495px);min-height:260px;padding:2px;scrollbar-width:thin;scrollbar-color:#b8924f transparent}
#den-settings .bd-card{position:relative;aspect-ratio:1;border-radius:6px;padding:0;overflow:hidden;cursor:pointer;background:#232a30;border:1px solid #6e5a35;box-shadow:inset 0 0 0 2px #1b2125,inset 0 0 0 3px rgba(214,178,104,.28)}
#den-settings .bd-card img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .15s}
#den-settings .bd-card:hover img{transform:scale(1.07)}
#den-settings .bd-card.on{border-color:#ffd77a;box-shadow:0 0 12px rgba(255,215,122,.7)}
#den-settings .bd-card:hover{border-color:#e9c271;box-shadow:0 0 10px rgba(233,194,113,.45)}
#den-settings .bd-card span{position:absolute;left:0;right:0;bottom:0;padding:10px 2px 3px;font:9.5px Georgia,serif;letter-spacing:.06em;color:#f3e6c8;text-align:center;line-height:1.15;background:linear-gradient(transparent,rgba(10,12,14,.92));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#den-settings .bd-card b{position:absolute;top:3px;right:4px;font:700 13px Georgia;color:#e9c271;opacity:0;text-shadow:0 1px 2px #000}
#den-settings .bd-card:hover b{opacity:1}
#den-settings .bd-r{flex:1;min-width:190px;display:flex;flex-direction:column;gap:8px}
#den-settings .bd-sel{display:flex;align-items:center;gap:8px;min-height:52px}
#den-settings .bd-sel img{width:48px;height:48px;border-radius:5px;border:1px solid #b8924f;object-fit:cover}
#den-settings .bd-sel .nm{font-size:13px;letter-spacing:.12em;color:#e9c271;text-transform:uppercase}
#den-settings .bd-sel .sub{font-size:10px;opacity:.65;letter-spacing:.06em}
#den-settings .bd-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
#den-settings .bd-row{display:flex;gap:5px}#den-settings .bd-row .bt{flex:1}
#den-settings .bt{height:36px;min-width:36px;border-radius:5px;font:17px Georgia,serif;color:#f3e6c8;cursor:pointer;background:linear-gradient(#4a545c,#353d44);border:1px solid #8a7444;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 0 2px #262d33,inset 0 0 0 3px rgba(214,178,104,.35)}
#den-settings .bt:hover{border-color:#e9c271}
#den-settings .bt.gold{background:linear-gradient(#d9ad5e,#a87a36);color:#1d160c;border-color:#f3d48a}
#den-settings .bt.red{background:linear-gradient(#7c3428,#55221a);border-color:#c27a5a}
#den-settings .bt.blank{visibility:hidden}
#den-settings .bd-sl{display:flex;align-items:center;gap:8px;font-size:15px}
#den-settings .bd-sl input{flex:1;accent-color:#d9ad5e}
#den-settings .bd-sl em{font:11px Georgia;font-style:normal;min-width:34px;text-align:right;color:#e9c271}
#den-settings .bd-hint{font-size:10px;letter-spacing:.06em;opacity:.6;line-height:1.5}
</style>`;

export function buildTab(bld) {
  const b = bld ?? {}, cat = { 'g:env': 'nature', 'g:str': 'building', 'g:prop': 'props', 'g:ent': 'npc' }[b.cat] ?? b.cat ?? 'building'; // the editor drawer's group keys read as their first shelf here
  const query = typeof b.q === 'string' ? b.q.trim().toLowerCase() : '';
  const page = Math.max(1, typeof b.page === 'number' ? b.page : 1);
  const PAGE_SIZE = 80;

  // Filter items matching active category and optional search term
  const filtered = PREFABS.filter((p) => {
    if (p.cat !== cat) return false;
    if (query) {
      const matchLabel = (p.label || '').toLowerCase().includes(query);
      const matchId = (p.id || '').toLowerCase().includes(query);
      return matchLabel || matchId;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // Render Category Tabs (6x2 clean grid)
  const cats = CATS.map(([id, ic, nm]) => {
    const isSel = cat === id;
    return `<button class="bt bd-cat${isSel ? ' gold' : ''}" title="${nm}" onclick="${go({ op: 'cat', v: id, page: 1 })}"><i>${ic}</i><span>${nm}</span></button>`;
  }).join('');

  // Top Bar: Search + Pagination controls
  const prevPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(totalPages, currentPage + 1);
  const topBar = `<div class="bd-topbar">
    <div class="bd-search-box">
      <span style="font-size:13px;opacity:.7">🔍</span>
      <input class="bd-search-input" type="text" placeholder="Search ${filtered.length} items in ${cat}..." value="${query}" onkeydown="if(event.key==='Enter'){sendAction('bld',{op:'cat',v:'${cat}',q:this.value,page:1})}" onchange="sendAction('bld',{op:'cat',v:'${cat}',q:this.value,page:1})">
      ${query ? `<button class="bd-pbt" title="Clear filter" onclick="${go({ op: 'cat', v: cat, q: '', page: 1 })}">✕</button>` : ''}
    </div>
    <div class="bd-meta">${filtered.length} items</div>
    ${totalPages > 1 ? `<div class="bd-pages">
      <button class="bd-pbt" title="Previous page" ${currentPage <= 1 ? 'disabled' : ''} onclick="${go({ op: 'cat', v: cat, q: query, page: prevPage })}">◀</button>
      <span class="bd-meta">${currentPage}/${totalPages}</span>
      <button class="bd-pbt" title="Next page" ${currentPage >= totalPages ? 'disabled' : ''} onclick="${go({ op: 'cat', v: cat, q: query, page: nextPage })}">▶</button>
    </div>` : ''}
  </div>`;

  // Render cards for the current page
  const cards = pageItems.map((p) => {
    return `<button class="bd-card${b.carry === p.id ? ' on' : ''}" title="Drag ${p.label} onto the ground, or tap it then click the ground" draggable="false" ondragstart="return false" onpointerdown="${go({ op: 'carry', id: p.id })}">${thumb(p.id, 64) ? `<i style="display:block;width:64px;height:64px;margin:0 auto;${thumb(p.id, 64)}"></i>` : `<img src="${IMG[p.id] ?? OGRE}" alt="" draggable="false" loading="lazy">`}<b>＋</b><span>${p.label}</span></button>`;
  }).join('');

  return BUILD_CSS + `<div class="bd"><div class="bd-l"><div class="bd-cats">${cats}</div>${topBar}<div class="bd-grid">${cards}</div></div>` + rightCol(b) + `</div>`;
}

function rightCol(b) {
  const sid = b.sel ? String(b.sel).replace(/^pf-/, '').replace(/-[a-z0-9]+$/, '') : null, P = sid ? PREFAB[sid] : null;
  const sel = b.sel
    ? `<div class="bd-sel"><img src="${IMG[sid] ?? OGRE}" alt=""><div><div class="nm">${P?.label ?? 'piece'}</div><div class="sub">selected · ${b.last?.length ?? 0} placed this visit</div></div></div>`
    : `<div class="bd-sel"><div class="bd-hint">Drag a card onto the ground. Click and drag any placed piece to move it; it hugs the ground. Right-click cancels.</div></div>`;
  const off = b.sel ? '' : ' style="opacity:.35;pointer-events:none"';
  const sc = b.sc ?? 1;
  return `<div class="bd-r"><div class="ds-card" style="margin:0">${sel}<div class="bd-row">${B('⌖', 'Select nearest placed piece', { op: 'pick' })}${B('↶', 'Undo last placement', { op: 'undo' })}${B('♻', (b.trash?.length ? 'Bring back the last deleted piece' : 'Nothing deleted to bring back'), { op: 'restore' }, b.trash?.length ? '' : 'dim')}${B('⊘', 'Deselect', { op: 'none' })}</div></div>`
    + `<div class="ds-card" style="margin:0"${off}><div class="ds-h">MOVE</div><div class="bd-pad">`
    + B('⟲', 'Turn left 15°', { op: 'rot', d: 15 }) + B('▲', 'Push away 1 m', { op: 'mv', f: 1 }) + B('⟳', 'Turn right 15°', { op: 'rot', d: -15 })
    + B('◀', 'Left 1 m', { op: 'mv', r: -1 }) + B('◎', 'Bring in front of me', { op: 'here' }, 'gold') + B('▶', 'Right 1 m', { op: 'mv', r: 1 })
    + B('⤒', 'Lift 25 cm', { op: 'up', d: 0.25 }) + B('▼', 'Pull closer 1 m', { op: 'mv', f: -1 }) + B('⤓', 'Lower 25 cm', { op: 'up', d: -0.25 })
    + `</div><div class="bd-row" style="margin-top:5px">${B('↻', 'Turn 90°', { op: 'rot', d: 90 })}${B('⏚', 'Snap to ground', { op: 'drop' })}${B('⧉', 'Copy beside it', { op: 'dup' })}${B('⇄', 'Swap to the card in your hand', { op: 'swap' })}${B('⇶', 'Replace all like this with the card in your hand', { op: 'replaceAll' })}${B('🗑', 'Delete', { op: 'del' }, 'red')}</div></div>`
    + `<div class="ds-card" style="margin:0"${off}><div class="ds-h">SIZE${P?.cat === 'npc' ? ' · ROAM' : ''}</div>`
    + `<label class="bd-sl" title="Scroll the wheel here to grow or shrink, no limit" onwheel="event.preventDefault();sendAction('bld',{op:'scaleBy',f:event.deltaY<0?1.06:1/1.06})" style="cursor:ns-resize">⇲<button class="bt" onclick="sendAction('bld',{op:'scaleBy',f:1/1.15})">−</button><em style="flex:1;text-align:center;font-size:15px">${(+sc).toFixed(2)}×</em><button class="bt" onclick="sendAction('bld',{op:'scaleBy',f:1.15})">+</button></label>`
    + (P?.cat === 'npc' ? `<label class="bd-sl" title="How far they wander">🚶<input type="range" min="0" max="30" step="1" value="${b.wander ?? P.spec.state?.wander ?? 6}" onchange="sendAction('bld',{op:'wander',v:+this.value})" oninput="this.nextElementSibling.textContent=this.value+' m'"><em>${b.wander ?? P.spec.state?.wander ?? 6} m</em></label>` : '')
    + `</div><div class="bd-hint">Every placement and edit is its own undo in History.</div></div>`;
}

// TERRAIN EDITOR: the same tools, scoped to the editor dock
export function buildTools(bld) { return BUILD_CSS.replace(/#den-settings/g, '#te-bld') + `<style>#te-bld .ds-card{background:rgba(0,0,0,.22);border:1px solid #4d4434;border-radius:5px;padding:7px;margin:0}#te-bld .ds-h{font-size:10px;letter-spacing:.16em;color:#d9b46a;margin-bottom:6px}#te-bld .bd-r{min-width:0}#te-bld .bt.dim{opacity:.4}</style><div id="te-bld">` + rightCol(bld ?? {}) + `</div>`; }
