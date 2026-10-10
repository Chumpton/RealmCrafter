// BUG TAGS HUD (creator 2026-10-05): the tag-mode banner, the new-issue card, the journal list and one issue's page. scripts/bug-tags.js owns the state.
import { esc } from '../../scripts/lib/esc.js';
const PER = 9;
const BOX = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);box-sizing:border-box;padding:14px 18px 16px;border-radius:12px;background:rgba(40,26,16,.95);border:1px solid rgba(201,164,106,.6);color:#f4e3c3;font-family:Georgia,serif;z-index:80;box-shadow:0 10px 40px rgba(0,0,0,.5)";
const BTN = (bg, fg) => `padding:6px 12px;border-radius:8px;border:1px solid rgba(201,164,106,.6);background:${bg};color:${fg};font-family:inherit;font-size:13px;cursor:pointer`;
const GOLD = BTN("rgba(186,137,80,.85)", "#1e140c"), DARK = BTN("rgba(90,60,35,.6)", "#f4e3c3"), RED = BTN("rgba(160,50,40,.8)", "#fff"), TEAL = BTN("rgba(93,173,169,.75)", "#0d1a1a");
const FIELD = "width:100%;box-sizing:border-box;margin:4px 0 10px;padding:7px 9px;border-radius:7px;border:1px solid rgba(201,164,106,.5);background:rgba(20,13,8,.85);color:#f4e3c3;font-family:inherit;font-size:14px";
const STAT = { open: ["open", "#ff7a66"], sent: ["sent to savi", "#e7b457"], fixed: ["fixed", "#8fd17a"] };
const READ = "{title:document.getElementById('bug-title').value,note:document.getElementById('bug-note').value}";
let key = null, html = "";
export function bugHud(ctx, player) {
  const s = player?.state; if (!s || !player.isEditor) return "";
  const k = `${!!s.bugTag}|${JSON.stringify(s.bugDraft ?? null)}|${s.bugOpen ?? ""}|${s.bugPage | 0}|${JSON.stringify(s.bugs ?? null)}`;
  if (k === key) return html; key = k;
  return (html = s.bugTag ? banner() : s.bugDraft ? draft(s.bugDraft) : s.bugOpen === true ? journal(s) : s.bugOpen != null ? page(s) : "");
}
const banner = () => `<div id="bug-banner" style="position:fixed;left:50%;top:112px;transform:translateX(-50%);padding:8px 18px;border-radius:999px;background:rgba(160,50,40,.88);color:#fff;font:15px Georgia,serif;letter-spacing:.08em;pointer-events:none;z-index:80">🏷 TAG MODE · aim and left-click anything · O → TAG again to cancel</div>`;
function draft(d) {
  return `<div id="bug-draft" data-modal style="${BOX};width:380px">
    <div style="font-size:15px;letter-spacing:.14em;color:#e7b457;margin-bottom:4px">🏷 NEW ISSUE</div>
    <div style="font-size:12px;opacity:.7;margin-bottom:10px">on <b>${esc(d.name)}</b> · ${d.at.x}, ${d.at.y}, ${d.at.z}</div>
    <label style="font-size:12px;opacity:.8">title</label><input id="bug-title" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()" maxlength="80" placeholder="what's wrong" style="${FIELD}">
    <label style="font-size:12px;opacity:.8">note</label><textarea id="bug-note" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()" rows="5" maxlength="2000" placeholder="more context" style="${FIELD};resize:vertical"></textarea>
    <div style="display:flex;gap:8px"><button id="bug-save" onclick="sendAction('bugSave',${READ},{relockPointer:true})" style="flex:1;${GOLD}">save</button><button id="bug-cancel" onclick="sendAction('bugCancel',{},{relockPointer:true})" style="flex:1;${DARK}">cancel</button></div></div>`;
}
function journal(s) {
  const list = Array.isArray(s.bugs) ? s.bugs : [], pg = s.bugPage | 0, pages = Math.max(1, Math.ceil(list.length / PER)), rows = list.slice(pg * PER, pg * PER + PER);
  const items = rows.map((b, i) => { const [lab, col] = STAT[b.status] ?? STAT.open; return `<button id="bug-row-${b.n}" onclick="sendAction('bugOpen',{n:${b.n}})" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left;margin:0 0 5px;padding:7px 9px;border-radius:8px;border:1px solid rgba(201,164,106,.35);background:rgba(20,13,8,.6);color:#f4e3c3;font-family:inherit;cursor:pointer">
      <span style="flex:none;width:22px;height:22px;border-radius:5px;background:rgba(186,137,80,.85);color:#1e140c;font-weight:bold;display:flex;align-items:center;justify-content:center">${i + 1}</span>
      <span style="flex:1;min-width:0"><span style="display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">#${b.n} ${esc(b.title)}</span><span style="font-size:11px;opacity:.65">${esc(b.name)}</span></span>
      <span style="flex:none;font-size:11px;color:${col}">${lab}</span></button>`; }).join("");
  const open = list.filter((b) => b.status !== "fixed").length;
  return `<div id="bug-journal" data-modal style="${BOX};width:440px;max-height:80vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px"><span style="font-size:15px;letter-spacing:.14em;color:#e7b457">📖 ISSUE JOURNAL</span><span style="font-size:11px;opacity:.65">${list.length} total · ${open} not fixed</span></div>
    ${items || `<div style="opacity:.6;font-size:13px;padding:14px 0;text-align:center">no issues yet. O → TAG to mark one.</div>`}
    <div style="font-size:11px;opacity:.55;margin:4px 0 8px;text-align:center">press 1–9 or click an issue to open it</div>
    <div style="display:flex;gap:8px;align-items:center"><button onclick="sendAction('bugPage',{dir:-1})" ${pg > 0 ? "" : "disabled"} style="${DARK};${pg > 0 ? "" : "opacity:.4"}">◀</button><span style="flex:1;text-align:center;font-size:12px;opacity:.7">page ${pg + 1} / ${pages}</span><button onclick="sendAction('bugPage',{dir:1})" ${pg < pages - 1 ? "" : "disabled"} style="${DARK};${pg < pages - 1 ? "" : "opacity:.4"}">▶</button>
    <button id="bug-close" onclick="sendAction('bugJournal',{},{relockPointer:true})" style="${GOLD}">close</button></div></div>`;
}
function page(s) {
  const b = (s.bugs ?? []).find((x) => x.n === s.bugOpen); if (!b) return journal({ ...s, bugOpen: true });
  const [lab, col] = STAT[b.status] ?? STAT.open;
  return `<div id="bug-page" data-modal style="${BOX};width:440px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px"><span style="font-size:15px;letter-spacing:.14em;color:#e7b457">ISSUE #${b.n}</span><span style="font-size:12px;color:${col}">${lab}</span></div>
    <div style="font-size:12px;opacity:.7;margin-bottom:10px">on <b>${esc(b.name)}</b> · ${b.at.x}, ${b.at.y}, ${b.at.z}</div>
    <label style="font-size:12px;opacity:.8">title</label><input id="bug-title" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()" maxlength="80" value="${esc(b.title)}" style="${FIELD}">
    <label style="font-size:12px;opacity:.8">note</label><textarea id="bug-note" onkeydown="event.stopPropagation()" onkeyup="event.stopPropagation()" onkeypress="event.stopPropagation()" rows="6" maxlength="2000" style="${FIELD};resize:vertical">${esc(b.note)}</textarea>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button id="bug-edit" onclick="sendAction('bugEdit',Object.assign({n:${b.n}},${READ}))" style="flex:1;${GOLD}">save edits</button>
      <button id="bug-send" onclick="sendAction('bugSend',Object.assign({n:${b.n}},${READ}))" style="flex:1;${TEAL}">send to savi</button>
      <button id="bug-fixed" onclick="sendAction('bugStatus',{n:${b.n}})" style="flex:1;${DARK}">${b.status === "fixed" ? "reopen" : "mark fixed"}</button>
      <button id="bug-delete" onclick="if(confirm('Delete issue #${b.n}?'))sendAction('bugDelete',{n:${b.n}})" style="flex:1;${RED}">delete</button></div>
    <button id="bug-back" onclick="sendAction('bugOpen',{n:null})" style="width:100%;margin-top:8px;${DARK}">◀ back to journal</button></div>`;
}
