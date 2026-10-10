// LIGHT EDITOR · AUTOFILL · JEV's read of an area: every tuned number and every word JEV is asked.
// The caller places with the rule read when JEV's answer is not back inside JEV_TIMEOUT_MS.
export const JEV_TIMEOUT_MS = 1800;
export const AREA_JEV = {
  system: 'jevScan',          // DEN SYSTEMS 'JEV · area scan' switch (on by default); off = rule read only
  lane: 'lightArea',          // jev-meter lane name
  keepConf: 0.8,              // a rule read this sure keeps its kind ...
  overrideP: 0.6,             // ... unless JEV gives another kind at least this
  moodSalt: 7.31,             // the mood draw rides the same seed, shifted
  densityMul: { dark: 0.3, few: 0.6, homely: 1, busy: 1.3 },
  kindAsk: 'What kind of place is this, in a 6th-century Norse settlement by a lake? Pick what a traveller would call it.',
  kinds: {
    longhouse: 'the yard and doors of a great hall or longhouse, people living close by',
    farmstead: 'a farm: byre, pens, fields, a house or two among them',
    village: 'several houses close together around a green, well or lanes',
    harbour: 'boat landings, jetties, nausts and fish racks where boats come in',
    shore: 'the open lake edge: stones, reeds, water, no landing worked here',
    forge: 'a smithy or working yard: anvil, forge fire, charcoal and tools',
    grove: 'a sacred grove or great tree: hallowed ground, offerings, standing stones',
    wild: 'untouched land: woods, rock, moor, nobody lives here',
    road: 'a track, ford, bridge or gate between places, people pass through',
  },
  moodAsk: 'How lit should it be at night?',
  moods: { dark: 'left dark, wild', few: 'one or two lights', homely: 'lived-in, lit doors', busy: 'working place, many lights' },
};
