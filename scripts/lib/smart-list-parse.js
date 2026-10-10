// JEV-LOAD L6 (K5): the SMART LIST doc lives in board-jev.js module memory, not in board-bell.state. On a reload it is rebuilt from
// docs/board/SMART-LIST.md, which renderSmart() writes from the same doc. parseSmartList(text) is the exact inverse of that render for
// the fields readers use: { n, invented, headline, list: [{ id, title, owner, source, why, blocked, done }], votes, decisions, stale }.
// (DONE items are not in the file: renderSmart hides them, so a rebuilt doc lists what the board shows.)
export function parseSmartList(text) {
  if (!text || !/^# SMART LIST/m.test(text)) return null;
  const lines = String(text).split("\n");
  const doc = { n: 0, invented: 0, headline: "", list: [], votes: [], decisions: [], stale: [] };
  const ref = /^JEV refresh #(\d+) · \d+ items(?: · (\d+) dropped)?/m.exec(text); if (ref) { doc.n = +ref[1]; doc.invented = +(ref[2] ?? 0); }
  const hl = /^\*\*(.*)\*\*$/m.exec(text); if (hl) doc.headline = hl[1];
  let sec = "", cur = null;
  for (const l of lines) {
    if (/^## /.test(l)) { sec = l.slice(3); cur = null; continue; }
    if (sec.startsWith("NEXT, IN ORDER")) {
      const m = /^\d+\. \[([^\]]+)\] (.*) · (\S+) · from (.+?)((?: · ).*)?$/.exec(l);
      if (m) { cur = { id: m[1], title: m[2], owner: m[3], source: m[4], why: "", blocked: "", done: "" }; doc.list.push(cur); continue; }
      if (!cur) continue;
      let k; if ((k = /^ {3}why: (.*)$/.exec(l))) cur.why = k[1]; else if ((k = /^ {3}blocked by: (.*)$/.exec(l))) cur.blocked = k[1]; else if ((k = /^ {3}done when: (.*)$/.exec(l))) cur.done = k[1];
      continue;
    }
    const item = /^- (.*)$/.exec(l)?.[1]; if (item == null) continue;
    if (sec === "WAITING ON VOTES") doc.votes.push(item); else if (sec === "ONLY THE CREATOR CAN DECIDE") doc.decisions.push(item); else if (sec.startsWith("STALE OR CONFLICTING")) doc.stale.push(item);
  }
  return doc;
}
