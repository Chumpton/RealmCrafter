// SCAN PULSE (Light Editor Autofill, creator 2026-10-04): every tuned number of the Death Stranding style scan visuals.
// Read by scripts/lib/scan-pulse.js only. Quiet by law: alpha stays low, colours pale, nothing lights the scene.
export const SP = {
  pale: 'oklch(0.9 0.05 210)',      // the scan's own colour: pale cyan-white
  paleHex: '#cfeaf2',               // the same, for material slots
  breath: {                         // the aiming ring's breathing shimmer
    periodS: 1.4, alphaMax: 0.22, alphaFloor: 0.35,   // alpha = alphaMax * (floor + (1-floor) * breathe)
    motePerM: 0.9, moteMin: 14, moteMax: 160,          // motes held per metre of circumference
    glowPerM: 0.45, glowMin: 10, glowMax: 90,          // ground-lying glow cards per metre of circumference
    glowSize: [0.5, 0.8], glowAlpha: 0.09, moteSize: [0.035, 0.07], rise: [0.04, 0.14], life: [1.2, 2.2],
  },
  sweep: {                          // the expanding wavefront
    band: 0.18, bandMin: 0.06,      // band thickness as a share of the radius at full scale (ring scales with the tween)
    bandMaxM: 1.2, bandMinM: 0.25,
    segments: 128, lift: 0.06, emissive: 2.2, opacity: 0.55, scaleFrom: 0.02, easing: 'easeOutCubic', tail: 0.5,
    moteSteps: [0.25, 0.45, 0.62, 0.78, 0.9, 0.98], // radius fractions where a burst of motes stands up behind the wavefront
    motePerM: 0.35, moteMin: 6, moteMax: 60, moteLife: [0.7, 1.2], moteSize: [0.03, 0.06], moteRise: [0.25, 0.6], moteAlpha: 0.3,
  },
  blip: {                           // one read thing, lit as the wavefront passes
    life: 0.6, height: 2.4, lift: 0.1, width: 0.16, alpha: 0.5, motes: [4, 7], moteAlpha: 0.45,
    colors: { house: 'oklch(0.86 0.10 70)', pen: 'oklch(0.86 0.12 140)', farm: 'oklch(0.86 0.12 140)', yard: 'oklch(0.86 0.12 140)',
      dock: 'oklch(0.85 0.09 195)', bridge: 'oklch(0.85 0.09 195)', forge: 'oklch(0.80 0.15 50)', tree: 'oklch(0.92 0.07 130)',
      other: 'oklch(0.95 0.02 210)' },
  },
  done: { life: 1.1, perM: 0.8, min: 16, max: 220, size: [0.7, 1.1], alpha: 0.16, moteAlpha: 0.32, rise: [0.3, 0.7] },
};
