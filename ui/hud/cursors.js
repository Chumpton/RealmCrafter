// creator 2026-10-10 "isolate assetts and use them as the cursors" (/cdn/image-u594h5hj8.webp): the painted cursors, cut from his sheet, 40 px; creator 2026-10-10: baked 1 px black stroke + soft drop shadow, 4 px pad (hotspots +4).
// The kind follows what the mouse is over (player.state.hover, written by scripts/context-menu.js) and the class cast in flight.
import { QUESTS, QUEST_OF_NPC } from '../../scripts/lib/data/quests.js';
const C = {
  default: ['/cdn/value.9e127b1640f2efd6bd619c010c7676a451db48f2ee7dc4e1fbc8f36d5605819e.png', 7, 6],
  talk: ['/cdn/value.bcce730e92bb41a26b16ac22e7ae67d3e09ad31dc760c1c4e83a04493b9b94ff.png', 24, 18],
  inspect: ['/cdn/value.2b7f150a745eb7f3166784d6f5ebc2eed0cc0a2f9f30ca00dfdfe0319c055de2.png', 21, 19],
  attack: ['/cdn/value.efb1fbf3d11dcec289ae800014d2cf0464ee6dc82dfb61933a4fd889b3c7dd94.png', 9, 6],
  cast: ['/cdn/value.4c9b1f27164aacb09bdfc7f7c8617f92b1699b20baeaed894afa2f087c1884b8.png', 20, 7],
  quest: ['/cdn/value.f67e67bc5f12d2edce627ea1935092b92e5e1b7bc803ed9c89651d58bb13abbe.png', 20, 42], // creator 2026-10-10: a gold ! over a quest offered
  turnin: ['/cdn/value.137e31e6746bdbf586073a04cdf079edcca9e60f674e9af5ad3d40821cf120c4.png', 20, 42], // a gold ? when it can be handed in
  grab: ['/cdn/value.d4bbd1ad584852afe75feb4ad182797baa8ebaa928335fe164f56409df1b2bf2.png', 24, 20],
};
const url = (k) => `url('${C[k][0]}') ${C[k][1]} ${C[k][2]}`;
// a quest giver under the mouse: ! while it has a quest for you, ? once yours is ready to hand in; underway or done: plain
function questCursor(s, id) { const qid = id && QUEST_OF_NPC[id], q = qid && QUESTS[qid]; if (!q) return null; const st = s.quests?.[qid];
  if (!st) return 'quest'; if (st !== 'active') return null;
  const n = q.need.flag ? (s.qc?.[q.need.flag] | 0) : (Array.isArray(s.inv) ? s.inv : []).filter((x) => x?.id === q.need.item).length; return n >= q.need.n ? 'turnin' : null; }
export function cursorKind(s) {
  if (s?.ccast) return 'cast';
  const h = s?.hover; if (!h) return 'default';
  const v = String(h.verb ?? '');
  if (v === 'Attack') return 'attack';
  if (/^(Take|Loot|Bury|Examine)$/.test(v)) return 'inspect';
  const q = questCursor(s, h.id); if (q) return q;
  if (/^(Talk|Talk-to|Trade|Speak)/i.test(v) || h.col === '#ffff00' || h.col === '#ff0') return 'default'; // creator 2026-10-10: no talk cursor on people
  if (/^(Open|Close|Chop|Cook|Net|Bait|Lure|Harpoon|Cage|Fish|Mine|Pick|Use|Climb|Enter|Mount|Ride|Sit|Push|Pull)/i.test(v)) return 'grab';
  return h.lvl ? 'attack' : 'default'; // a level means a fighter; people keep the plain pointer
}
export function cursorsHud(player) {
  const k = cursorKind(player?.state);
  return `<style>html,body,body *{cursor:${url(k)},auto!important}button,a,[onclick],input[type=range]{cursor:${url(k === 'default' ? 'grab' : k)},pointer!important}input[type=text],textarea{cursor:text!important}</style>`;
}
