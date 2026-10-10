// A rideable horse (scripts/den-horse.js): state.kind 'trail' (the summit mare) or 'own' (called with Z).
// Oct 9 (camptons_world): "swap my horse mount with armored horse in our assetts": the Capital Armored Warhorse from the
// build library. Oct 10: rigged in art/den-horse/build.py (Idle, Walk, Trot, Gallop, Jump clips the gait plays by ground speed).
// Its mane/tail texture keyed the cut-out in magenta: the fixed copy clears those pixels and cuts them with alphaTest.
export const denHorse = {
  tags: ['den-horse', 'interactable'],
  children: [{
    id: 'body',
    model: {
      id: '/cdn/value.cfa551596fc303559f96ebf854928c639d3dc4a30e3acc326b4d9f8b650bfc3f.glb',
      materials: { Mat_PBR_00: { texture: '/cdn/value.6af27ec5898d84b177c2cc19d6e898436488f9dd6fa40bc7d2ed97c745c80791.png', alphaTest: 0.5, transparent: false, side: 'double' } },
    },
    scale: 0.87,
    castShadow: true,
    tags: ['den-horse-body'],
  }],
};
