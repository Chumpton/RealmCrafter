// creator 2026-10-06: the top-left Admin quick menu, editors on desktop. Page-local open state lives in ui.js (admToggle, admSub).
// creator 2026-10-09: restructured from a flat 13-item list into sections: Session, Creation Suite, World & Travel, QA (Bug Tracker submenu);
// one monochrome gold glyph language, hotkeys as right-aligned pills, Close All pinned as the footer. Every action is the same sendAction as before.
export const SECTIONS = [
  ['Session', [
    ['ᛟ', 'Den Keeper', 'F7', "sendAction('keeper')", 'owner'],
    ['⚙', 'Options', 'O', "sendAction('options')"],
    ['ᛞ', 'Den Systems', '', "sendAction('sysWin')"],
  ]],
  ['Creation Suite', [
    ['⛰', 'World Editor', '', "sendAction('te',{op:'open'})"],
    ['✥', 'Move Anything', 'F6', "sendAction('maToggle')"],
    ['☼', 'Light Editor', '', "sendAction('le',{op:'open'})"],
    ['◑', 'Shader Editor', '', "sendAction('post',{op:'win'})"],
    ['◐', 'Hide / Show Props', '', "sendAction('propsHide')"],
  ]],
  ['World & Travel', [
    ['ᚱ', 'Raven Roads', 'U', "sendAction('travelPanel')"],
    ['⌖', 'World Map', 'M', "sendAction('huginnMap')"],
  ]],
  ['QA & Tracking', [
    ['⚑', 'Bug Tracker', '', null, 'sub:bugs', [
      ['⚑', 'Tag a Bug', '', "sendAction('bugTag',{},{relockPointer:true})"],
      ['❡', 'Bug Journal', '', "sendAction('bugJournal')"],
      ['✦', 'My Votes', '', "sendAction('voteLedger',{op:'open'})"],
    ]],
  ]],
];
export const FOOTER = ['✕', 'Close All Windows', 'Shift+↓', "sendAction('closeAll',{all:true})"];
export const ITEMS = [...SECTIONS.flatMap(([, rows]) => rows.flatMap((r) => r[5] ?? [r])), FOOTER]; // flat list, for anything that still reads it
const OWNER = 'pa_d69d1b1f0d7352adedf69f2ee39457a4';
const CSS = `<style>
#adm-btn{position:fixed;left:14px;top:12px;z-index:61;display:flex;align-items:center;gap:7px;padding:6px 12px;border-radius:5px;border:2px solid #1a1712;cursor:pointer;pointer-events:auto;
 background:linear-gradient(#4a3a26,#2e2216);box-shadow:inset 0 0 0 1px #8a6a3e,0 3px 8px rgba(0,0,0,.5);color:#ffcf6e;font:bold 13px Georgia,serif;letter-spacing:.14em;text-shadow:0 0 5px rgba(255,190,80,.7),1px 1px 0 #000}
#adm-btn:hover,#adm-btn.on{filter:brightness(1.18)}
#adm-menu{position:fixed;left:14px;top:46px;z-index:61;min-width:268px;padding:6px;border-radius:6px;border:2px solid #1a1712;pointer-events:auto;max-height:calc(100vh - 70px);overflow:auto;
 background:linear-gradient(rgba(36,28,18,.98),rgba(24,18,11,.98));box-shadow:inset 0 0 0 1px #6b5233,0 8px 22px rgba(0,0,0,.6);font-family:Georgia,serif}
#adm-menu .sec{padding:8px 10px 3px;font:bold 10px Georgia,serif;letter-spacing:.22em;text-transform:uppercase;color:#a8885a}
#adm-menu .sec:first-child{padding-top:3px}
#adm-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:6px 10px;border:0;border-radius:4px;background:none;color:#efe6d2;font:14px Georgia,serif;text-align:left;cursor:pointer}
#adm-menu button:hover{background:rgba(201,154,88,.25);color:#fff}
#adm-menu button i{width:20px;font-style:normal;text-align:center;color:#ffcf6e;font-family:Georgia,'Segoe UI Symbol',serif;font-variant-emoji:text;text-shadow:0 0 4px rgba(255,190,80,.35)}
#adm-menu button kbd{margin-left:auto;min-width:22px;padding:1px 6px;border-radius:9px;border:1px solid rgba(201,164,106,.45);background:rgba(0,0,0,.35);font:bold 10px Georgia,serif;color:#e0c48a;text-align:center;font-variant-numeric:tabular-nums}
html body #h4-root #adm-menu button,html body #adm-menu button,html body #adm-menu button *:not(i){color:#fff!important}html body #adm-menu button kbd{border-color:rgba(255,255,255,.4)!important}
#adm-menu button .car{margin-left:auto;color:#c9b07a;font-size:11px}
#adm-menu .subm{margin:0 0 2px 22px;padding-left:6px;border-left:1px solid rgba(201,164,106,.3)}
#adm-menu .subm button{font-size:13px;padding:5px 10px}
#adm-menu hr{border:0;height:1px;margin:5px 6px;background:linear-gradient(90deg,transparent,#8a7a5a,transparent)}
</style>`;
const row = ([ic, lab, key, act]) => `<button onclick="${act};admToggle()"><i>${ic}</i>${lab}${key ? `<kbd>${key}</kbd>` : ''}</button>`;
export function adminMenu(player, open, sub) {
  if (!player?.isEditor) return '';
  const body = SECTIONS.map(([title, rows], si) => {
    const items = rows.filter((r) => r[4] !== 'owner' || player.userId === OWNER).map((r) => {
      if (!r[5]) return row(r);
      const k = r[4].slice(4), on = sub === k;
      return `<button onclick="admSub('${k}')"><i>${r[0]}</i>${r[1]}<span class="car">${on ? '▾' : '▸'}</span></button>` + (on ? `<div class="subm">${r[5].map(row).join('')}</div>` : '');
    }).join('');
    return (si ? '<hr>' : '') + `<div class="sec">${title}</div>` + items;
  }).join('');
  return !open ? '' : CSS + (open ? `<div id="adm-menu" data-modal>${body}<hr>${row(FOOTER)}</div>` : '');
}
