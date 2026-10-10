// Enemy nameplates + WoW selection circle (creator 2026-10-04: "give enemy npcs healthbars and nameplates, and selection circle like wow under them").
// Runs on each player's own machine only: every plate and the circle are audience "local" children of the enemy they label,
// so nothing here crosses the wire. Contract: rows tagged "enemy" with state.name, hp, maxHp, down; level from state.level or MONSTERS[kind].level.
// The circle follows s.fight.target, else s.lock, else s.hover (combat-player.js writes those).
import { animate } from 'builtin/tween';
import { raycast } from 'builtin/physics';
import { MONSTERS } from './lib/data/monsters.js';
import { cbLevelOf } from './lib/combat-hud.js';
import { levelColor } from './lib/menu-core.js';
import { STANCE, RING, stanceOf, isBig } from './lib/stance.js'; // target-selection spec: ring colour by stance
export const updateSchedule = { every: { seconds: 0.05 } };
const NPC = ['pet', 'wynx', 'gryphon', 'helper', 'player', 'npc', 'folk', 'villager', 'merchant', 'vendor', 'shopkeeper', 'questgiver', 'interactable', 'dock-folk', 'bc-town-folk', 'crk-folk', 'meadow-folk', 'isle-folk', 'bc-works-folk', 'fall-folk'];
let glowOn = null;
const soft = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const RANGE = 32, MAX = 24, SVG_PLATES = false; // the name plates are HUD plates now (lib/plates-hud.js); this file keeps the selection circle
const plates = new Map(); // enemy id -> { plate, pct, down }
let ringSc = 0; // the diameter the ring was drawn at
// the ring's diameter: the model's widest footprint (arms and base included) and a quarter more, never under 1.3 m; no bounds yet = 1.6 m and a redraw when they land
function ringSize(t) { const b = t.bounds; return b && b.size ? Math.max(1.5, Math.max(b.size.x, b.size.z) * 1.4) : 1.8; }
let ring = null, ringOn = null, ringKey = '', spin = null, swept = false;
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, '');
// OSRS health bar: a black-edged bar, green for what is left over red for what is gone, shown while the thing is hurt or in a fight.
// Its attack clock: a thin pale line grows clockwise around the bar's outer edge over the monster's swing and lands as it hits (state.dash).
const BAR = { x: 60, y: 27, w: 80, h: 8, pad: 2 }, EDGE = 2 * ((BAR.w + 2 * BAR.pad) + (BAR.h + 2 * BAR.pad));
function html(name, lvl, col) { // a camera-facing card: name + level over the bar; everything that moves rides state
  const n = esc(name);
  return `<svg viewBox='0 0 200 46' width='1m' billboard='full'>
<text x='100' y='19' text-anchor='middle' font-family='serif' font-size='17' font-weight='bold' fill='none' stroke='#000' stroke-width='4' stroke-linejoin='round'>${n}  ${lvl}</text>
<text x='100' y='19' text-anchor='middle' font-family='serif' font-size='17' font-weight='bold' fill='${col}'>${n}  <tspan fill='#ffd100' font-family='sans-serif'>${lvl}</tspan></text>
<g opacity='{{ state.barop }}' shape-rendering='crispEdges'>
<rect x='${BAR.x}' y='${BAR.y}' width='${BAR.w}' height='${BAR.h}' fill='#c01c1c'/>
<rect x='${BAR.x}' y='${BAR.y}' width='{{ state.fillw }}' height='${BAR.h}' fill='#1fa81f'/>
<rect x='${BAR.x - 0.8}' y='${BAR.y - 0.8}' width='${BAR.w + 1.6}' height='${BAR.h + 1.6}' fill='none' stroke='#000' stroke-width='1.6'/>
<rect x='${BAR.x - BAR.pad}' y='${BAR.y - BAR.pad}' width='${BAR.w + 2 * BAR.pad}' height='${BAR.h + 2 * BAR.pad}' rx='2' fill='none' stroke='{{ state.dashcol }}' stroke-width='{{ state.dashw }}' stroke-linecap='round' stroke-dasharray='{{ state.dash }}' opacity='{{ state.dashop }}'/>
</g>
</svg>`;
}
// the selection decal (target-selection spec, 2026-10-09): a rune-carved circle in the target's stance colour. Locked = bold with a glow and
// four inward arrows; hover = thin and translucent. A big target (boss / elite / wider than RING.big) wears an outward chevron at the
// top of the SVG, which the -90 pitch lays on the body's local -Z, so it points where the thing faces.
function rune(col, locked, big, w = 1) { // creator 2026-10-10: the fill reaches all the way to the rim: a soft wash from the centre out, deepening into a thin crisp edge
  const o = locked ? 0.42 : 0.28; // quieter: under bloom the old wash read as a glow on the feet
  const g = `<defs><radialGradient id='sg' cx='50' cy='50' r='49' gradientUnits='userSpaceOnUse'><stop offset='0' stop-color='${col}' stop-opacity='${(o * 0.08).toFixed(3)}'/><stop offset='.55' stop-color='${col}' stop-opacity='${(o * 0.2).toFixed(3)}'/><stop offset='.86' stop-color='${col}' stop-opacity='${(o * 0.62).toFixed(3)}'/><stop offset='1' stop-color='${col}' stop-opacity='${(o * 0.85).toFixed(3)}'/></radialGradient></defs><circle cx='50' cy='50' r='49' fill='url(#sg)'/><circle cx='50' cy='50' r='48.2' fill='none' stroke='${col}' stroke-opacity='${o}' stroke-width='1.4'/>`;
  const chev = big ? `<path d="M50 1.5 L57 8 L50 5.5 L43 8 Z" fill="${col}" opacity="${o}"/>` : '';
  return `<svg viewBox='0 0 100 100' width='${w.toFixed(2)}m'>${g}${chev}</svg>`; // the width IS the diameter: a vector's scale did not grow it
}
// the lock brackets: four arc ticks with a rune diamond each, just outside the ring; a yaw-spun parent turns them slowly
function brackets(col) {
  const R = 47, P = (deg) => { const t = (deg - 90) * Math.PI / 180; return `${(50 + R * Math.cos(t)).toFixed(2)} ${(50 + R * Math.sin(t)).toFixed(2)}`; };
  const one = (c) => `<path d="M${P(c - 14)} A${R} ${R} 0 0 1 ${P(c + 14)}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`
    + `<g transform="rotate(${c} 50 50)"><path d="M50 1 L52.4 3.6 L50 6.2 L47.6 3.6 Z" fill="#f6e7b8"/><path d="M${50 - 9} 3.2 L${50 - 9} 6.8 M${50 + 9} 3.2 L${50 + 9} 6.8" stroke="${col}" stroke-width="1.4"/></g>`;
  return `<svg viewBox='0 0 100 100' width='1m'><g filter='drop-shadow(0 0 2 ${col})'>${[45, 135, 225, 315].map(one).join('')}</g></svg>`;
}
// the ground under a unit: one ray down past its feet (terrain or floor), its point and normal; the ring rides 8 cm above it
function ground(ctx, t) { const f = t.feetPosition, h = raycast(ctx, { x: f.x, y: f.y + 1.5, z: f.z }, { x: 0, y: -1, z: 0 }, { distance: 4, ignoreEntities: [t.id, ctx.self.id], physicsOnly: true }); return h ?? { position: { x: f.x, y: ctx.place.terrain?.heightAt?.(f.x, f.z) ?? f.y, z: f.z }, normal: { x: 0, y: 1, z: 0 } }; }
function lift(ctx, t) { const g = ground(ctx, t), n = g.normal ?? { y: 1 }; return { x: t.feetPosition.x, y: g.position.y + 0.025 / Math.max(0.4, n.y ?? 1), z: t.feetPosition.z }; }
function tilt(ctx, t) { const n = ground(ctx, t).normal ?? { x: 0, y: 1, z: 0 }, ny = Math.min(1, Math.max(-1, n.y ?? 1)); const ax = n.z ?? 0, az = -(n.x ?? 0), al = Math.hypot(ax, az); if (al < 1e-4) return { x: 0, y: 0, z: 0, w: 1 }; const a = Math.acos(ny) / 2, k = Math.sin(a) / al; return { x: ax * k, y: 0, z: az * k, w: Math.cos(a) }; }
function height(o) { const b = o.bounds; return b ? Math.max(0.6, b.max.y - o.feetPosition.y) : 1.8; }
export function update(ctx) {
  const me = ctx.self; if (!me.isLocal) return;
  if (!swept) { swept = true; for (const r of ctx.query({ tags: ['eplate'], radius: 200 })) ctx.destroy(r.id); } // a reload's leftovers
  const s = me.state, my = cbLevelOf(s), seen = new Set();
  const rows = SVG_PLATES ? ctx.query({ tags: ['enemy'], radius: RANGE }).slice(0, MAX) : []; // perf 2026-10-07: plates moved to the HUD, so no 7-a-second enemy query while SVG_PLATES is off
  for (const r of (SVG_PLATES ? rows : [])) {
    const o = ctx.getObject(r.id); if (!o) continue;
    const st = o.state || {}, down = !!st.down || (st.hp ?? 1) <= 0;
    seen.add(r.id);
    let e = plates.get(r.id);
    if (!e) {
      for (const k of (o.children ?? [])) { const c = typeof k === 'string' ? ctx.getObject(k) : k; if (c && (c.ui || (c.tags || []).includes('eplate'))) ctx.destroy(c.id); } // an older plate left by a reload
      const lvl = st.level ?? MONSTERS[st.kind]?.level ?? 1;
      const id = ctx.spawn({ parent: r.id, audience: 'local', tags: ['eplate'], feetPosition: { x: 0, y: height(o) + 0.35, z: 0 }, vector: html(st.name ?? 'Enemy', lvl, levelColor(my, lvl)), state: { pct: 100, fillw: BAR.w, barop: 0, dash: `0 ${EDGE}`, dashop: 0, dashcol: '#f4efe2', dashw: 1.1 } });
      e = { plate: id, pct: -1, down: false }; plates.set(r.id, e);
    }
    const p = ctx.getObject(e.plate); if (!p) { plates.delete(r.id); continue; }
    const pct = Math.max(0, Math.min(100, Math.round(100 * (st.hp ?? 1) / Math.max(1, st.maxHp ?? 1))));
    if (pct !== e.pct) { p.state.pct = pct; p.state.fillw = Math.round(30 * pct / 100) * BAR.w / 30; e.pct = pct; }
    const now = ctx.now(), mineFight = s.fight?.target === r.id || s.lock === r.id, show = pct < 100 || mineFight || !!st.engaged ? 1 : 0; // the bar shows while it is hurt or in a fight
    if (show !== e.show) { p.state.barop = show; e.show = show; }
    const k = st.atkAt && st.engaged && st.atkMs ? Math.max(0, Math.min(1, (now - st.atkAt) / st.atkMs)) : 0, kq = Math.round(k * 40) / 40; // the swing clock, in 40 steps
    if (kq !== e.k) { e.k = kq; p.state.dash = `${(EDGE * kq).toFixed(1)} ${EDGE}`; p.state.dashop = kq > 0 ? 0.45 + 0.55 * kq : 0; p.state.dashw = Math.round((1.1 + 1.5 * kq * kq) * 10) / 10; p.state.dashcol = kq > 0.9 ? '#ff2a1a' : kq > 0.7 ? '#ff9a2a' : '#f4efe2'; } // it warms and thickens toward the strike
    if (down !== e.down) { p.visible = !down; e.down = down; }
  }
  for (const [id, e] of plates) if (!seen.has(id)) { ctx.destroy(e.plate); plates.delete(id); }
  // the selection circle under whatever you're fighting, locked on or pointing at (s.hover is context-menu.js's { id, verb } row)
  const lockId = s.fight?.target ?? s.lock ?? null, hovId = typeof s.hover === 'string' ? s.hover : s.hover?.id ?? null;
  const tgt = lockId; void hovId; // creator 2026-10-10: the circle is the selected unit's alone, never a hover's
  const t = tgt ? ctx.getObject(tgt) : null, tg = t?.tags || [];
  const pl = !!t && (ctx.place?.players ?? []).some((q) => q.id === tgt && q.id !== me.id);
  const live = t && !t.state?.down && (t.state?.hp ?? 1) > 0 && (tg.includes('enemy') || NPC.some((k) => tg.includes(k)) || pl) && !tg.includes('nameplate');
  const want = live ? tgt : null, locked = !!want && want === lockId;
  const stance = want ? (pl ? 'friendly' : stanceOf(t)) : '', big = want ? isBig(t) : false;
  const key = want ? `${want}|${stance}|${locked ? 1 : 0}|${big ? 1 : 0}` : '';
  if (key !== ringKey) { // fix 2026-10-10: a local child under a world NPC never read back, so the ring was destroyed and respawned every pass; it stands free now and follows below // create/destroy only when the target, its stance or the lock changes
    if (ring) ctx.destroy(ring); if (spin) ctx.destroy(spin); ring = null; spin = null;
    ringOn = want; ringKey = key;
    const aud = { audience: { player: me.id } }; // the slight glow: on the hovered or selected unit, this player's screen alone
    if (glowOn && glowOn !== want) ctx.emit('highlightClear', { target: glowOn }, aud);
    glowOn = want;
    if (want) ctx.emit('highlightSet', { target: want, color: soft(STANCE[stance].ring, locked ? 0.55 : 0.35), style: 'outline', duration: 3600000 }, aud); // creator 2026-10-10: a faded line, not the bright glow
    if (want) {
      const col = STANCE[stance].ring, sc = ringSize(t); ringSc = sc; // creator 2026-10-10: every circle stretches beyond the model's base
      ring = ctx.spawn({ audience: 'local', tags: ['eplate'], feetPosition: lift(ctx, t), rotation: tilt(ctx, t), children: [{ audience: 'local', tags: ['eplate'], rotation: { yaw: 0, pitch: -90, roll: 0 }, castShadow: false, vector: rune(col, locked, big, sc) }] }); // creator 2026-10-10: it lies on the ground's slope
      if (false) { // the pulsing ring and spinning lock brackets retired with the glow (creator 2026-10-10)
        animate(ctx, ring, { scale: [sc, sc * 1.08, sc] }, { duration: 1.1, loop: true, easing: 'easeInOutSine' });
        spin = ctx.spawn({ parent: want, audience: 'local', tags: ['eplate'], feetPosition: { x: 0, y: 0.08, z: 0 }, state: { col },
          children: [{ audience: 'local', tags: ['eplate'], rotation: { yaw: 0, pitch: -90, roll: 0 }, scale: sc * 1.12, castShadow: false, vector: brackets(col) }] });
        animate(ctx, spin, { 'rotation.yaw': [0, 360] }, { duration: RING.spinSec, loop: true, easing: 'linear' });
      }
    }
  }
  if (ring && t && Math.abs(ringSize(t) - ringSc) > ringSc * 0.12) ringKey = ''; // the model's bounds landed or changed: draw it again at the true size next pass
  if (ring && t) { const r = ctx.getObject(ring), f = t.feetPosition; if (r && (Math.abs(r.feetPosition.x - f.x) > 0.03 || Math.abs(r.feetPosition.z - f.z) > 0.03)) { r.feetPosition = lift(ctx, t); r.rotation = tilt(ctx, t); } }
}
export function onDestroy(ctx) { for (const [, e] of plates) ctx.destroy(e.plate); plates.clear(); if (ring) ctx.destroy(ring); if (spin) ctx.destroy(spin); ring = null; spin = null; ringKey = ''; glowOn = null; }
