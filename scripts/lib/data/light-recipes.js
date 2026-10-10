// LIGHT EDITOR · AREA RECIPES (Autofill): what fire a 6th-century northern place of each kind would burn after dark.
// plan(survey, { area }) reads one row. kinds: weight 0..1 (0 = never placed here). densityMul scales the cap; floor = least cap kept.
// at: per thing-class, slots placed at each such thing ({ k: kinds to choose among by weight, at: 'door'|'far'|'wall'|'top'|'flank' }).
// only: classes this area lights at all. fire: 'built' = a yard fire where people live, 'any' = a lone fire on open ground, 'never'.
// max: per-kind count in one area. gaps: a kind posted between neighbouring houses. by: how far past a thing's edge each kind stands (m).
export const BY = { torch: 1.2, brazier: 1.3, hornLantern: 0.6, tallowLamp: 0.5, sconce: 0, forge: 1.2, campfire: 3, bonfire: 4 };
export const GAP = { min: 2, max: 12 };      // a house gap (m between walls) that earns a torch post
export const TREE_CLEAR = 2.5;               // a lone fire keeps this far from tree trunks
export const RECIPES = {
  longhouse: { kinds: { brazier: 1, sconce: 0.9, bonfire: 0.6, campfire: 0.4, torch: 0.5, hornLantern: 0.3, tallowLamp: 0.4, forge: 0 }, densityMul: 1, floor: 1,
    at: { house: [{ k: ['brazier'], at: 'door' }, { k: ['sconce'], at: 'wall' }] }, fire: 'built', max: { bonfire: 1, campfire: 1 },
    notes: 'Braziers at the hall doors, rushlights on the walls, one yard bonfire for the gathering.', noFire: 'Braziers at the hall doors, rushlights on the walls. No open yard clear enough for the bonfire; widen the ring for it.' },
  farmstead: { kinds: { hornLantern: 1, campfire: 0.6, torch: 0.3, tallowLamp: 0.3, sconce: 0.4, brazier: 0, bonfire: 0, forge: 0 }, densityMul: 0.7, floor: 1,
    at: { house: [{ k: ['hornLantern'], at: 'door' }], pen: [{ k: ['hornLantern'], at: 'door' }] }, fire: 'built', max: { campfire: 1 },
    notes: 'Lanterns hung on posts at barn doors and pen gates (straw near: no open iron fire), a single campfire.', noFire: 'Lanterns hung on posts at barn doors and pen gates. No clear ground for a campfire away from the straw.' },
  village: { kinds: { torch: 1, campfire: 0.8, sconce: 0.5, hornLantern: 0.4, tallowLamp: 0.3, brazier: 0.3, bonfire: 0, forge: 0 }, densityMul: 1, floor: 1,
    gaps: 'torch', fire: 'built', max: { campfire: 1 },
    notes: 'Torch posts in the gaps between houses, one campfire on the green.', noFire: 'Torch posts in the gaps between houses. No open green wide enough for a campfire; widen the ring for one.' },
  harbour: { kinds: { hornLantern: 1, brazier: 0.8, torch: 0.4, tallowLamp: 0.2, sconce: 0.3, campfire: 0.3, bonfire: 0, forge: 0 }, densityMul: 0.9, floor: 1,
    at: { dock: [{ k: ['hornLantern'], at: 'door' }, { k: ['brazier'], at: 'far' }] }, fire: 'built', max: { campfire: 1 },
    notes: 'Lanterns hung on posts at the docks, braziers at the pier heads; never a bonfire by the boats.' },
  shore: { kinds: { campfire: 1, hornLantern: 0.3, torch: 0.2, tallowLamp: 0.2, brazier: 0, bonfire: 0, sconce: 0, forge: 0 }, densityMul: 0.3, floor: 1,
    fire: 'any', max: { campfire: 1 },
    notes: 'One beach campfire at most; the rest of the strand stays dark.', noFire: 'No dry clear strand for a campfire here; the shore stays dark.' },
  forge: { kinds: { forge: 1, torch: 0.9, brazier: 0.3, sconce: 0.4, hornLantern: 0.2, tallowLamp: 0.2, campfire: 0, bonfire: 0 }, densityMul: 0.8, floor: 1,
    at: { forge: [{ k: ['forge'], at: 'door' }], house: [{ k: ['torch'], at: 'door' }], yard: [{ k: ['torch'], at: 'door' }] }, fire: 'never',
    notes: 'The forge glow itself, torches around the smithy; no open fire near the charcoal.' },
  grove: { kinds: { campfire: 1, tallowLamp: 0.6, torch: 0.2, hornLantern: 0.2, brazier: 0, bonfire: 0, sconce: 0, forge: 0 }, densityMul: 0.3, floor: 1,
    fire: 'any', max: { campfire: 1 },
    notes: 'At most one campfire in a clearing; the trees keep their dark.', noFire: 'No clearing wide enough for a campfire; the trees keep their dark.' },
  wild: { kinds: { tallowLamp: 1, torch: 0, brazier: 0, campfire: 0, bonfire: 0, sconce: 0, hornLantern: 0, forge: 0 }, densityMul: 0, floor: 1,
    only: ['sacred'], fire: 'never', max: { tallowLamp: 1 },
    notes: 'Wild ground stays dark, save one oil lamp left at a sacred stone.' },
  road: { kinds: { torch: 2, brazier: 0, campfire: 0, bonfire: 0, sconce: 0, hornLantern: 1, tallowLamp: 0, forge: 0 }, densityMul: .6, floor: 3,
    only: ['gate', 'bridge'], paths: true, fire: 'never',
    notes: 'Torches at the crossing and spaced along the trail, a lantern post now and then; the dark between them stays.' },
};
