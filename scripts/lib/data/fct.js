// FLOATING COMBAT TEXT (creator 2026-10-10, his classic-WoW FCT spec): every tuned number of the drift, the crit slam and the colours.
// The striker's script emits uiEvent 'fct' { t: target id, v: amount | text, s: school | 'heal' | 'miss' | 'phys' | 'auto', c: crit }
// to everyone near the hit; ui/hud/fct.js draws it as HUD text pinned to the target (data-world-anchor), so it stays crisp at any distance.
export const FCT = {
  pxPerUnit: 40,            // world units of his spec → screen px
  hit: { vx: 1.2, vy: 3.5, g: 4.0, life: [1.2, 1.6], holdFrac: 0.65, floor: 0.6 }, // floor: units above the birth point the arc never sinks under, so it never falls back onto the plate        // parabolic drift
  crit: { burst: [0.08, 2.0], settle: [0.2, 1.35], life: 1.25, rise: 0.6, holdFrac: 0.65 }, // the slam: 1→2.0× in .08s, elastic to 1.35×, hang, drift
  stackPx: 18,              // each new number on the same target pushes the older ones up
  fan: 22,                  // px: successive hits on one target step left/right
  sizePx: 40, critPx: 40,  // creator 2026-10-10: bigger
  clearPx: 46,              // birth point sits this far above the nameplate's anchor, clear of the plate's name, bar and debuffs   // base glyph size (crit scales from it)
  stroke: 3,                // px of solid black outline
  font: "'WowFriz','Cinzel',Georgia,serif",
  colors: {
    auto: '#FFFFFF', phys: '#FFFF00', physCrit: '#FFD100',
    fire: '#FF6022', frost: '#80C0FF', arcane: '#FF80FF', nature: '#4DFF4D', storm: '#4DFF4D', earth: '#4DFF4D',
    shadow: '#B070B0', /* his #805080, lifted a touch so it reads through the stroke */ holy: '#FFE680', steel: '#FFFF00',
    heal: '#00FF00', miss: '#A0A0A0',
  },
  radius: 45,               // metres: who sees a hit's number
};
