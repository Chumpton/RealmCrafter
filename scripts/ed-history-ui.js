// The editor's History panel (QoL lane): terrain strokes (te.hist) and build edits (edHist) in one list, newest first.
// Each row rolls back to before it; the gold ▸ is the newest. Rendered by ui/hud/terrain-editor.js in its #te-hp frame.
const q = (o) => JSON.stringify(o).replace(/"/g, "'");
const ICON = { Moved: '✥', Rotated: '⟳', Turned: '⟳', Spun: '⟳', Leaned: '⟋', 'Stood up': '⊥', Resized: '⤢', Lifted: '⇡', Dropped: '⇣', Duplicated: '⧉', Arrayed: '⋯', Deleted: '✕', Pasted: '⎘', 'Stamped group': '⎘', Cut: '✂', Swapped: '⇄', 'Replaced all like': '⇶', Hid: '◌', Showed: '◉', Restored: '↺' };
const ago = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 60 ? s + 's' : s < 3600 ? Math.round(s / 60) + 'm' : Math.round(s / 3600) + 'h'; };
export function edHistPanel(player, now) {
  const t = player.state?.te ?? {}, B = player.state?.edHist ?? [], T = t.hist ?? [], R = player.state?.edRedo ?? [];
  const rows = [...T.map((e) => ({ k: 't', e })), ...B.map((e) => ({ k: 'b', e }))].sort((a, b) => (b.e.at ?? 0) - (a.e.at ?? 0)).slice(0, 80);
  const tn = now ?? Date.now();
  const html = rows.map(({ k, e }, i) => {
    const verb = k === 't' ? '⛰' : ICON[Object.keys(ICON).find((v) => e.label.startsWith(v))] ?? '•';
    const act = k === 't' ? `sendAction('te',${q({ op: 'jump', v: e.id })})` : `sendAction('edh',${q({ op: 'jump', v: e.id })})`;
    const cnt = k === 't' ? (e.keys?.length ?? 0) + (e.beds?.length ?? 0) : e.n ?? e.rows?.length ?? 0;
    const lab = k === 't' ? (/^[A-Z]/.test(e.label) ? e.label : e.label) : e.label;
    return `<button class="row${i === 0 ? ' cur' : ''}${e.no ? ' no' : ''}" title="${e.no ? 'too big to undo here' : 'roll back to before this'}" onclick="${act}"><b style="width:14px;color:${k === 't' ? '#9baf84' : '#d9ad5e'}">${verb}</b><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lab}</span>${e.no ? '<i title="not undoable here" style="font-style:normal;color:#e07a5f">⊘</i>' : ''}<em>${cnt}·${ago(tn - (e.at ?? tn))}</em></button>`;
  }).join('') || `<div class="tip" style="padding:6px">nothing yet · edits land here</div>`;
  const hdr = `<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px"><div class="h" style="margin:0;flex:1">History</div><button title="Undo (Ctrl+Z)" onclick="sendAction('te',${q({ op: 'undo' })})" style="display:none"></button><button title="Undo last build edit" onclick="sendAction('edh',${q({ op: 'undo' })})" ${B.length ? '' : 'disabled'}>↶</button><button title="Redo build edit (Ctrl+Y)" onclick="sendAction('edh',${q({ op: 'redo' })})" ${R.length ? '' : 'disabled'}>↷</button><button title="Forget the list (changes nothing in the world)" onclick="sendAction('edh',${q({ op: 'clear' })})" ${B.length ? '' : 'disabled'}>⌫</button></div>`;
  return `<div id="te-hp">${hdr}<div class="list">${html}</div><div class="tip" style="padding:4px 2px 0;opacity:.55;font-size:10px">⛰ terrain · ✥⟳⤢ build · click = roll back · F9 playtest</div></div>`;
}
