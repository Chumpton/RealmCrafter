// LAMP CLOCK (LAMP-CLOCK-PLAN rev 1 rule, rev 2 real day; lane 3, Oct 5 2026): when the sky lights the torches. One table;
// scripts/lib/lamp-clock.js does the math. The wall-time backstop windows live in RC.backstop (lib/data/real-clock.js).
export const LCK = {
  // sun at the lamp, from the SKY hour (real sunrise = 6, real sunset = 18): full day light from mornFull to eveFull, none
  // from eveDark round to mornDark, linear between
  sun: { mornDark: 4.5, mornFull: 7.5, eveFull: 16.5, eveDark: 20.0 },
  cloudDim: 0.2,   // light lost at full cloud cover (atmosphere.clouds.density)
  rainDim: 0.15,   // light lost at full rain (place.state.weather.rain)
  moonLift: 0.05,  // a clear moon's light on a dark sky (moonClear x this x (1 - sun))
  // ON at dusk when the level drops under duskOn; OFF at dawn when it rises over dawnOff (higher: no flutter at the edge).
  // Oct 5 at 47N: clear lit ~19:30 (sunset 18:43 + 47 min), out ~07:05; storm (cover .8, rain 1) lit ~18:20, out ~08:00.
  duskOn: 0.36, dawnOff: 0.45,
  stagger: 90,     // s: a watched dusk lights the lamps one by one over this, in JEV's area order; dawn douses them in reverse
  memoMs: 1000,    // one lampClock answer per second per machine, shared by every lamp
  pool: { lo: 0.05, hi: 0.5 }, // home-lamplight pools: night factor 1 at level <= lo, 0 at level >= hi
  order: ['hall', 'roads', 'farm', 'docks', 'editor'], // the plain order when JEV is off or silent
  // which area a lamp belongs to, first match wins (tags, then id prefix); everything else is 'roads'
  areas: [
    { area: 'editor', tags: ['le-lamp'], prefix: ['le-'] },
    { area: 'docks', tags: ['harbor', 'harbour-stair', 'cliff', 'isle', 'holmvik'], prefix: ['harbor', 'cliff', 'isle', 'lamp-harbor', 'lamp-cliff'] },
    { area: 'farm', tags: ['herd', 'farm'], prefix: ['farm', 'lamp-herd', 'lamp-hamlet'] },
    { area: 'hall', tags: ['hall'], prefix: ['lamp-hall', 'lamp-cellar', 'hall', 'lamp-vote-board', 'lamp-hh', 'lamp-treehouse', 'lamp-mother'] },
  ],
};
