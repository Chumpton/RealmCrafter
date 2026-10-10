// DEV TEAM TRACKER book (lane 4, plan docs/board/DEV-TRACKER-PLAN-2026-10-06.md): the leather tab on the chatbox's top edge and the book above it.
// Reads only player.state.devbook (the shared contract); every click is sendAction('devbook', { op, ... }). Closed = the tab alone, nothing animates.
// Outer windows are #devbook-tab and #devbook-book (position:fixed, outside #osch) so Move Anything can drag them; access from devbook-access.js.
import { esc, escJs } from '../../scripts/lib/esc.js';
import { DEVBOOK_CSS } from './devbook-style.js';
import { devbookAccess } from '../../scripts/lib/devbook-access.js';
import { reactRow, REACT_CSS, SFX, playSfx } from './devbook-react.js';
import { JEV_CSS, jevRibbon, jevMargin, jevPick, jevPickRibbon } from './devbook-jev.js';

export const AUTHORS = { zezima: { ch: 'Z', name: 'Zezima', cls: 'z' }, camptons_world: { ch: 'C', name: 'Campton', cls: 'c' } };
export const FILTERS = [['all', 'All'], ['zezima', 'Zezima'], ['camptons_world', 'Campton'], ['pinned', 'Pinned'], ['reacted', 'Has reactions']];
export const JEV_GLYPH = { heart: '❤', fire: '🔥', thumbs: '👍', laugh: '😂', wow: '😮', sad: '😢', mad: '😡', axe: '🪓' };
const pad2 = (n) => String(n).padStart(2, '0');
export const hhmm = (at) => { const d = new Date(+at || 0); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
export function preview(t, n = 150) {
  const s = String(t ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n), sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:!?-]+$/, '') + '…';
}
export function roman(n) {
  n = Math.max(1, Math.min(3999, n | 0)); let o = '';
  for (const [v, r] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { o += r; n -= v; }
  return o;
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function dayTitle(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day ?? ''));
  if (!m) return String(day ?? '');
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${WDAYS[d.getUTCDay()]}, ${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}
// days in any order → the chapter number (1 = the oldest day) and the neighbouring days
export function dayNav(days, day) {
  const list = [...new Set((Array.isArray(days) ? days : []).filter(Boolean).map(String))].sort();
  const i = list.indexOf(String(day ?? ''));
  return { chapter: i < 0 ? list.length + 1 : i + 1, prev: i > 0 ? list[i - 1] : null, next: i >= 0 && i < list.length - 1 ? list[i + 1] : null };
}
// which way the leaf turns when the view moves: forward on a later page or day, back on an earlier one, null when nothing turned
export function turnOf(prev, cur) {
  if (!prev || !cur) return null;
  if (prev.day !== cur.day) return String(cur.day) > String(prev.day) ? 'fwd' : 'back';
  if ((prev.page | 0) !== (cur.page | 0)) return (cur.page | 0) > (prev.page | 0) ? 'fwd' : 'back';
  return null;
}
export const tilt = (id, i) => { let h = 0; for (const c of String(id) + i) h = (h * 31 + c.charCodeAt(0)) | 0; return (Math.abs(h) % 11) - 5; };

const act = (op, extra = '') => `sendAction('devbook',{op:'${op}'${extra}})`;
const STOP = 'onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()"';
const BOOK_SVG = `<svg viewBox="0 0 36 30" aria-hidden="true"><path d="M5 4h24a2 2 0 0 1 2 2v19a2 2 0 0 1-2 2H5z" fill="#efe2bd"/><path d="M5 6h24v19H5z" fill="#d8c8a0"/><path d="M6 25.5h23M6 24h23" stroke="#a8915f" stroke-width=".7"/><path d="M3 3.5a2 2 0 0 1 2-2h22a2 2 0 0 1 2 2V23a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#6b4426" stroke="#2e1a0b" stroke-width="1"/><path d="M3 3.5a2 2 0 0 1 2-2h2v23.5H5a2 2 0 0 1-2-2z" fill="#4a2c15"/><rect x="10" y="5" width="15" height="16" rx="1" fill="none" stroke="#d6ab4a" stroke-width=".8" opacity=".75"/><path d="M17.5 8.5l3 4.5-3 4.5-3-4.5z" fill="#d6ab4a" stroke="#8a6420" stroke-width=".5"/><path d="M26 10h7.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H26z" fill="#4a2c15" stroke="#2e1a0b" stroke-width=".8"/><rect x="29" y="9" width="5" height="8" rx="1" fill="#e3b955" stroke="#7a5414" stroke-width=".8"/><circle cx="31.5" cy="13" r="1.1" fill="#7a5414"/></svg>`;
const CLASP_SVG = `<svg viewBox="0 0 30 46" aria-hidden="true"><path d="M0 13h18a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4H0z" fill="#4a2c15" stroke="#22130a"/><rect x="12" y="8" width="16" height="30" rx="3" fill="#e3b955" stroke="#7a5414" stroke-width="1.4"/><rect x="15" y="11" width="10" height="24" rx="2" fill="none" stroke="#fff0b8" stroke-width=".8" opacity=".6"/><circle cx="20" cy="23" r="3" fill="#7a5414"/><circle cx="19.3" cy="22.3" r="1" fill="#ffe9a0"/></svg>`;

// page side: book position/scale, Esc, wheel, close fold, lightbox. Wired once; nothing runs while the book is shut except two cheap ears.
let wired = false, lastView = null, flipSeq = 0, flipDir = null, wasOpen = false, lastWheel = 0, shutting = false;
function fit() {
  if (typeof document === 'undefined') return;
  try {
    const W = innerWidth, H = innerHeight, root = document.documentElement, cs = getComputedStyle(root);
    const ospk = parseFloat(cs.getPropertyValue('--ospk')) || 1;
    const narrow = W < 720; root.classList.toggle('db-narrow', narrow);
    const bw = narrow ? 400 : 760, bh = 520, rail = 74;
    const ch = document.getElementById('osch')?.getBoundingClientRect();
    const chatTop = ch && ch.height ? ch.top : H - 8 - 165 * ospk;
    const chatMid = ch && ch.width ? ch.left + ch.width / 2 : 8 + 259 * ospk;
    let room = chatTop - 22;
    let k = Math.min(ospk, (W - 24 - rail) / bw, room / bh);
    if (k < 0.7) { room = H - 24; k = Math.min(ospk, (W - 24 - (narrow ? 0 : rail)) / bw, room / bh); }
    k = Math.max(0.5, Math.min(3, k));
    const x = Math.max(12, Math.min(W - rail - bw * k, chatMid - (bw * k) / 2 - 480)); // creator 2026-10-06: ~5 in further left
    const y = Math.max(12 + 34 * k, Math.min(chatTop - 12, H - 12) - bh * k - 960); // creator 2026-10-06: ~10 in higher; clamps at the top edge
    { const tab = document.getElementById('devbook-tab'); // creator 2026-10-06: the tab rides above the chatbox's real top edge, wherever Move Anything or the scale put it
      if (tab && ch && ch.height) { const th = tab.getBoundingClientRect().height || 30 * ospk; root.style.setProperty('--dbt-top', Math.max(4, Math.round(ch.top - th - 6)) + 'px'); root.style.setProperty('--dbt-bottom', 'auto'); root.style.setProperty('--dbt-left', Math.round(ch.left + 150 * (ch.width / 519)) + 'px'); /* 2026-10-09: root vars, so the HUD repaint never resets the tab (it jumped) */ } }
    root.style.setProperty('--dbk', k.toFixed(3)); root.style.setProperty('--dbx', Math.round(x) + 'px'); root.style.setProperty('--dby', Math.round(y) + 'px');
  } catch (e) {}
}
function shut() {
  if (shutting || typeof document === 'undefined') return; shutting = true;
  document.getElementById('devbook-book')?.classList.add('db-shut'); document.getElementById('db-back')?.classList.add('db-shut');
  try { playSfx(SFX.open, 1.15, 0.4); } catch (e) {}
  setTimeout(() => { shutting = false; try { sendAction('devbook', { op: 'close' }); } catch (e) {} }, 430);
}
function wire() {
  if (wired || typeof window === 'undefined' || typeof document === 'undefined') return; wired = true;
  addEventListener('resize', () => fit()); addEventListener('osk', () => fit());
  const esc = (e) => { if (e.key === 'Escape' && wasOpen) { document.getElementById('db-lb')?.remove(); shut(); } };
  document.addEventListener('keydown', esc, true);
  try { if (window.parent && window.parent !== window) window.parent.document.addEventListener('keydown', esc, true); } catch (e) {}
  window.dbShut = shut;
  window.dbWheel = (e, page, pages) => {
    const sc = e.target?.closest?.('.db-det,.db-list');
    if (sc && sc.scrollHeight > sc.clientHeight + 2) { const atTop = sc.scrollTop <= 0, atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2; if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atEnd)) return; }
    const now = performance.now(); if (now - lastWheel < 480 || Math.abs(e.deltaY) < 4) return;
    const n = page + (e.deltaY > 0 ? 1 : -1); if (n < 0 || n >= pages) return;
    lastWheel = now; e.preventDefault?.(); sendAction('devbook', { op: 'page', n });
  };
  window.dbPic = (url) => {
    document.getElementById('db-lb')?.remove();
    const d = document.createElement('div'); d.id = 'db-lb'; d.setAttribute('data-modal', ''); d.onclick = () => d.remove();
    const im = document.createElement('img'); im.src = url; im.alt = ''; d.appendChild(im);
    (document.getElementById('tome-game-mount') ?? document.body).appendChild(d); d.style.pointerEvents = 'auto';
  };
}

function crest(a, big) { const A = AUTHORS[a] ?? { ch: '?', cls: 'z' }; return `<i class="db-crest ${A.cls}${big ? ' big' : ''}" title="${esc(A.name ?? a)}">${A.ch}</i>`; }
function marks(e) {
  let h = '';
  const j = e.jev;
  if (j && j.kind) h += `<span class="db-rib ${esc(String(j.kind).toLowerCase())}" style="opacity:${(0.6 + 0.4 * Math.max(0, Math.min(1, +j.weight || 0))).toFixed(2)}" title="JEV: ${esc(j.kind)}${j.mood ? ' · ' + esc(j.mood) : ''}">${esc(j.kind)}</span>`;
  if (j && j.emoji) h += `<span class="db-seal jev" title="JEV${j.mood ? ': ' + esc(j.mood) : ''}">${esc(JEV_GLYPH[j.emoji] ?? String(j.emoji).slice(0, 2))}</span>`;
  if (e.pinned || (j && j.pin)) h += `<span class="db-seal" title="${e.pinned ? 'pinned' : 'JEV would pin this'}">ᛉ</span>`;
  return h + jevRibbon(e);
}
function row(e, sel, player, acc) {
  const A = AUTHORS[e.author] ?? { name: e.author };
  return `<div class="db-e${sel ? ' on' : ''}" ${jevMargin(e)} onclick="if(!event.target.closest('.db-react-slot'))${act('select', `,id:'${escJs(e.id)}'`)}">${crest(e.author)}<div class="db-eb"><div class="db-eh"><b>${esc(A.name)}</b><time>${hhmm(e.at)}</time>${(e.pics?.length ?? 0) ? `<time>· ${e.pics.length} pic${e.pics.length > 1 ? 's' : ''}</time>` : ''}</div><div class="db-pv">${esc(preview(e.text))}</div><div class="db-react-slot" data-id="${esc(e.id)}">${reactRow(e, player, acc)}</div></div>${marks(e)}</div>`;
}
function detail(e, player, acc, editor) {
  if (!e) return `<div class="db-empty"><span class="db-quill">✒</span>Pick an entry on the left page to read it whole.</div>`;
  const A = AUTHORS[e.author] ?? { name: e.author };
  const pics = (e.pics ?? []).filter(Boolean).slice(0, 8).map((u, i) => `<button type="button" class="db-pol" style="transform:rotate(${tilt(e.id, i)}deg)" onclick="dbPic('${escJs(u)}')"><img src="${esc(u)}" alt="" loading="lazy" draggable="false"></button>`).join('');
  return `<button type="button" class="db-backbtn" onclick="${act('select', ',id:null')}">◀ back to the list</button>`
    + `<div class="db-dh">${crest(e.author, true)}<div style="flex:1;min-width:0"><b>${esc(A.name)}</b><small>${hhmm(e.at)} · ${esc(dayTitle(e.day))}</small></div>${e.jev?.kind ? `<span class="db-rib ${esc(String(e.jev.kind).toLowerCase())}" style="position:static;clip-path:none;border-radius:2px">${esc(e.jev.kind)}</span>` : ''}</div>`
    + `<div class="db-txt">${esc(e.text)}</div>`
    + (e.full === false ? `<button type="button" class="db-more" onclick="${act('expand', `,id:'${escJs(e.id)}'`)}">read more…</button>` : '')
    + (pics ? `<div class="db-pics">${pics}</div>` : '')
    + (e.reply ? `<div class="db-reply"><i>Savi:</i> ${esc(e.reply)}</div>` : '')
    + `<div class="db-react-slot" data-id="${esc(e.id)}">${reactRow(e, player, acc)}</div>`
    + (e.jev?.mood ? `<div style="margin-top:6px;font:italic 12px Georgia,serif;color:#6e5a3e">JEV reads it as <b>${esc(e.jev.mood)}</b>.</div>` : '')
    + (editor ? `<div class="db-tools"><button type="button" class="db-pin${e.pinned ? ' on' : ''}" onclick="${act('pin', `,id:'${escJs(e.id)}',on:${!e.pinned}`)}"><i></i>${e.pinned ? 'Pinned with the wax seal' : 'Pin with a wax seal'}</button></div>` : '');
}

let memoKey = '', memoHtml = '';
export function devbook(ctx, player) {
  try {
    const acc = devbookAccess(ctx?.world?.state, player);
    if (!acc.tab) { wasOpen = false; return ''; }
    const db = player?.state?.devbook ?? {};
    const open = !!db.open;
    const key = (open ? JSON.stringify(db) : `${db.unread | 0}`) + '|' + (acc.react ? 1 : 0) + (player?.isEditor ? 1 : 0);
    if (!open) { try { requestAnimationFrame(fit); } catch (e) {} } // keeps the tab above the chatbox while closed
    if (open !== wasOpen) { if (open) { wire(); fit(); flipDir = null; lastView = { day: db.day, page: db.page }; try { playSfx(SFX.open); } catch (e) {} } wasOpen = open; }
    if (key === memoKey) return memoHtml;
    memoKey = key;
    const unread = Math.max(0, db.unread | 0);
    const tab = `<button type="button" id="devbook-tab" class="${unread ? 'db-new' : ''}" aria-label="Dev Team Tracker" onclick="${act('open')}"><span id="db-glow-${unread}" class="db-glow"></span>${BOOK_SVG}${unread ? `<span id="db-badge-${unread}" class="db-badge">${unread > 99 ? '99+' : unread}</span>` : ''}<span class="db-tip">Dev Team Tracker${unread ? ` · ${unread} new` : ''}</span></button>`;
    if (!open) { memoHtml = DEVBOOK_CSS + tab; return memoHtml; }
    wire();
    const view = { day: db.day, page: db.page };
    const turn = turnOf(lastView, view); lastView = view;
    if (turn) { flipSeq++; flipDir = turn; try { playSfx(SFX.page, 0.9 + (flipSeq % 3) * 0.08); } catch (e) {} }
    const nav = dayNav(db.days, db.day), page = Math.max(0, db.page | 0), pages = Math.max(1, db.pages | 0), f = db.filter ?? 'all';
    const entries = Array.isArray(db.entries) ? db.entries : [], sel = db.sel ?? null;
    const selEntry = db.selEntry ?? (sel ? entries.find((e) => e.id === sel) : null) ?? null;
    const emptyLine = f === 'camptons_world' && !entries.length ? 'Waiting for Campton: his side of the book fills once he says yes.' : db.q ? `Nothing on these pages matches “${esc(db.q)}”.` : f !== 'all' ? 'No entries under this filter yet.' : 'The ink is still wet: no entries on this day yet.';
    const list = entries.length ? entries.map((e) => row(e, e.id === sel, player, acc)).join('') : `<div class="db-empty"><span class="db-quill">✒</span>${emptyLine}</div>`;
    const filters = FILTERS.map(([k, l]) => `<button type="button" class="db-chipf${f === k ? ' on' : ''}" onclick="${act('filter', `,f:'${k}'`)}">${l}</button>`).join('');
    const vk = `${esc(String(db.day ?? '')).replace(/[^0-9a-z-]/gi, '')}-${page}-${f}`;
    memoHtml = DEVBOOK_CSS + REACT_CSS + JEV_CSS + tab
      + `<div id="db-back" onclick="dbShut()"></div>`
      + `<div id="devbook-book" data-modal><div id="db-pos"><div id="db-book" onwheel="dbWheel(event,${page},${pages})"><div class="db-frame"></div>`
      + `<button type="button" class="db-x" onclick="dbShut()">Close ✕</button>`
      + `<div class="db-spread${selEntry ? ' db-has-sel' : ''}">`
      + `<div class="db-page db-l"><div class="db-hd"><div class="db-ch"><button type="button" class="db-arr" ${nav.prev ? `onclick="${act('day', `,day:'${escJs(nav.prev)}'`)}"` : 'disabled'} title="earlier day">◀</button><h2 style="position:relative">${jevPickRibbon(entries.find((x) => x.id === jevPick(entries)))}Chapter ${roman(nav.chapter)}<small>${esc(dayTitle(db.day))}</small></h2><button type="button" class="db-arr" ${nav.next ? `onclick="${act('day', `,day:'${escJs(nav.next)}'`)}"` : 'disabled'} title="later day">▶</button></div><div class="db-fl">${filters}</div></div>`
      + `<div class="db-list"><div id="db-in-${vk}" class="db-in">${list}</div></div>`
      + `<div class="db-pg"><button type="button" class="db-arr" ${page > 0 ? `onclick="${act('page', `,n:${page - 1}`)}"` : 'disabled'}>◀</button>page ${page + 1} of ${pages}<button type="button" class="db-arr" ${page < pages - 1 ? `onclick="${act('page', `,n:${page + 1}`)}"` : 'disabled'}>▶</button></div></div>`
      + `<div class="db-page db-r"><div class="db-hd"><div class="db-srch"><input id="db-q" type="search" placeholder="Search the book… (Enter)" value="${esc(db.q ?? '')}" maxlength="60" onkeydown="event.stopPropagation();if(event.key==='Enter')sendAction('devbook',{op:'search',q:this.value});if(event.key==='Escape')dbShut()" ${STOP}></div></div>`
      + `<div class="db-det"><div id="db-d-${esc(String(selEntry?.id ?? 'none')).replace(/[^0-9a-z_-]/gi, '_')}" class="db-in">${detail(selEntry, player, acc, !!player?.isEditor)}</div></div></div>`
      + `<div class="db-spine"></div></div>`
      + (flipDir ? `<div id="db-flip-${flipSeq}" class="db-leaf ${flipDir}"></div>` : '')
      + `<div class="db-cover"><div class="db-cv-f"><em>ᛟ</em>Dev Team<br>Tracker<small>the Den's build log</small></div><div class="db-cv-b"></div></div>`
      + `<button type="button" class="db-clasp" title="close the book" onclick="dbShut()">${CLASP_SVG}</button>`
      + `</div></div></div>`;
    return memoHtml;
  } catch (e) { return ''; }
}
