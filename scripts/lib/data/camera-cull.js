// OSRS CAMERA CULL (perf lane C1, plan v4/v5.2): numbers for scripts/lib/camera-cull.js. Zezima's orbit rig only (scripts/camera.js);
// first person and the classic shoulder cam (camera-classic.js, Campton's) keep the template's far plane and the place fog.
export const CULL = {
  every: 100,        // ms between ground probes (also re-probes the moment pitch moves > 1° or the pivot > 1 m, or zoom changes)
  rayMax: 600,       // m a probe ray reaches before it counts as "sky / horizon on screen"
  cols: [-1, -0.5, 0, 0.5, 1], // top-edge probe columns (screen x, -1..1) + two rays at row 0.5
  phases: 4,         // the cols (all but the last, x = 1) slide by 0.5/phases each probe, so 4 probes (≤ 400 ms) sweep the top edge every 1/8 screen;
                     // far comes from the deepest of the last `phases` probes. (Repair 2026-10-07: a ridge notch between two fixed cols at the den showed
                     // ground at 284 m while far sat at 70 m.)
  margin: 0.15,      // far = deepest ground hit × (1 + margin) + pad: tall trees and roofs standing just past the hit stay whole
  pad: 30,
  minFar: 60,        // never nearer than this
  step: 10,          // far is written in 10 m buckets; it grows at once and shrinks only below 80 % (no churn)
  // Horizon on screen (a probe missed): 0 = keep the template far (1800) and the place fog untouched (the look stays: Castle +
  // Cathedral skyline rule). A number = clip there and pull THIS player's fog (player.atmosphere, never the place's) in so the
  // edge melts into the fog colour; the creator's call (plan v4 item 3 "gated on the creator's eye").
  horizonFar: 0,
  fogNearK: 0.35,    // with horizonFar: fog near = horizonFar × this, fog far = horizonFar × fogFarK
  fogFarK: 0.96,
}
// Selective roofs: only rows tagged ROOF.tag (L6 tags the roof part of OUR buildings, from docs/board/perf/CAMPTON-REGISTRY.json);
// a row also tagged one of ROOF.never is skipped. state.roofOf groups several parts into one building.
export const ROOF = { tag: 'roof-part', never: ['campton', 'crk', 'ravenholdt', 'camp-original'], scan: 1000, radius: 60, alwaysRadius: 40, inset: 0.4, below: 9 }
