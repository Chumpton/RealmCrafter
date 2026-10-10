// TARGET STANCE (creator 2026-10-09 target-selection spec): one word per unit (hostile / neutral / friendly) that the ground ring,
// the nameplate, the target frame and the select cue all read, so the four layers always agree. Pure; never throws.
// hostile: an enemy row that hunts (MONSTERS aggro) or is fighting anyone right now; neutral: an enemy row that only fights back
// (cow, chicken, the old bull; MONSTERS aggressive:false / passive) while it is calm; friendly: everything else you can point at
// (interactable, dock-folk, merchants, other players). A row may force it with state.stance.
import { MONSTERS } from './data/monsters.js';
import { TALK } from './data/dock-folk.js';
export const STANCE = {
  hostile:  { ring: '#e0352a', name: '#ff6a52', fill: 'fill-red',    cue: { clip: '/cdn/moodboard-painterly-fantasy/sfx-target-select-metal-blade-snap.mp3', volume: 0.55 } },
  neutral:  { ring: '#e0352a', name: '#ffd100', fill: 'fill-yellow', cue: { clip: '/cdn/moodboard-painterly-fantasy/sfx-target-select-metal-blade-snap.mp3', volume: 0.45 } },
  friendly: { ring: '#4fd36a', name: '#6dff8a', fill: 'fill-green',  cue: { clip: '/cdn/moodboard-painterly-fantasy/sfx-target-select-soft-leather-stone-tap.mp3', volume: 0.45 } },
};
export const RING = { big: 2.5, hoverOpacity: 0.72, spinSec: 9 }; // big = bounds width (m) that earns the facing chevron
export const BOSS_BUFF = /shield|enrage|immune|ward|frenzy/i; // a boss buff whose id reads like this wears the gold edge
export function stanceOf(o) {
  try {
    const st = o?.state ?? {}, tags = o?.tags ?? [];
    if (st.stance && STANCE[st.stance]) return st.stance;
    if (!tags.includes('enemy')) return 'friendly';
    const m = MONSTERS[st.kind];
    if (st.engaged || st.chase) return 'hostile';
    if (m && (m.aggressive === false || m.passive || !m.aggro)) return 'neutral';
    return 'hostile';
  } catch { return 'hostile'; }
}
// what the frame and plate call a thing
export function unitName(o) {
  const st = o?.state ?? {}, m = MONSTERS[st.kind];
  if (m) return m.name;
  if (o?.displayName) return o.displayName;
  if (o?.id === 'general-merchant') return 'General Merchant';
  if (o?.id === 'rune-merchant') return 'Aubury';
  if (st.talk && TALK[st.talk]) return TALK[st.talk].name;
  return st.name ?? ((o?.tags ?? []).includes('enemy') ? 'Training dummy' : 'Stranger');
}
export function isBig(o) {
  const st = o?.state ?? {}, m = MONSTERS[st.kind], b = o?.bounds;
  return !!(m?.boss || m?.elite || st.boss || st.elite || (b && Math.max(b.size.x, b.size.z) > RING.big));
}
// the select cue: once, to the selecting player only, when their lock moves to a new thing (callers pass the lock as it was)
export function selectCue(ctx, me, prev, target) {
  try {
    if (!target || prev === target.id) return;
    const c = STANCE[stanceOf(target)].cue;
    ctx.emit('playSound', { clip: c.clip, volume: c.volume }, { audience: { player: me.id } });
  } catch {}
}
// creator 2026-10-10: "green line edge for friendlies and red for enemies": the faded outline every selection/hover draws
export function lineColor(o, a = 0.45) { const t = o?.tags ?? []; return t.includes('enemy') && !o?.state?.stance?.startsWith?.('friend') ? `rgba(224,53,42,${a})` : `rgba(79,211,106,${a})`; }
