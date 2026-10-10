// W12 (2026-09-29): the hall folk react when a rain spell starts. JEV picks each person's reaction and line per spell;
// the per-tick nothing: one ask per spell, one ear per folk. Tuning here.
export const RR = {
  startAt: 0.08, dryAt: 0.02, minGapMs: 8 * 60000, askTimeoutMs: 25000,
  who: { // seated folk who react, and who they are (JEV reads this)
    'folk-astrid': 'Astrid: sharp-tongued, practical, keeps the house',
    'folk-bjorn': 'Bjorn: big, loud, laughs at everything',
    'folk-freydis': 'Freydis: dry humour, a weaver, unimpressed',
    'folk-hakon': 'Hakon: the elder, weather-wise, his knees ache',
    'folk-ulf': 'Ulf: the goatherd, grumbles, worries about his goats',
  },
  reacts: {
    laugh: 'throws his head back and laughs at the rain',
    cheer: 'raises a hand to the rain, glad of it',
    shrug: 'shrugs it off, the rain is nothing',
    glance: 'looks up at the roof, listening to it drum',
    grumble: 'shakes the head and grumbles under the breath',
  },
  lines: {
    thor: "Thor's watering the barley again.",
    mead: 'Let it pour. The mead is in here.',
    roof: 'Roof held last winter. It will hold.',
    knees: 'My knees told me this was coming.',
    door: 'Someone shut the back door!',
    well: 'Good. The well was low.',
    wash: 'And there goes the washing.',
    sleep: 'Rain on thatch. Best sleep there is.',
    njord: 'Njord is in a mood today.',
    goats: 'My goats will be soaked through.',
  },
  fallback: { // weighted pick per person when JEV is late or fails
    'folk-astrid': { react: { grumble: 2, shrug: 1, glance: 1 }, line: { wash: 3, door: 2, well: 1 } },
    'folk-bjorn': { react: { laugh: 3, cheer: 2 }, line: { mead: 3, thor: 2 } },
    'folk-freydis': { react: { shrug: 2, glance: 1 }, line: { sleep: 2, wash: 1, njord: 1 } },
    'folk-hakon': { react: { glance: 2, grumble: 1 }, line: { knees: 3, roof: 2, njord: 1 } },
    'folk-ulf': { react: { grumble: 3, glance: 1 }, line: { goats: 4, door: 1 } },
  },
  stagger: [0.6, 7],          // s: each person reacts at their own moment after the first drops
  hold: 3.2,                  // s the gesture holds
  bubbleFor: 5,               // s the spoken line floats over the head
  cheerClip: 'cdn/clip-sitting-cheering-loop.glb', shrugClip: 'cdn/clip-shrug.glb',
  glancePitch: -24, laughPitch: -16, shakeYaw: 14, // degrees on the head (negative pitch = looks up)
};
