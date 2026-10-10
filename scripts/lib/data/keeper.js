// CAMPTON'S KEEPER (creator 2026-10-06): his own den keeper window, F7 or ADMIN → Keeper. One table of tuned numbers.
export const KEEPER = {
  owner: 'pa_d69d1b1f0d7352adedf69f2ee39457a4', // camptons_world: the only hand this window opens for
  marks: 8,              // saved spots
  sayMax: 120,           // broadcast characters
  sayMs: 6,              // broadcast toast seconds
  showBursts: 9,         // fireworks show volleys
  showGap: 0.55,         // seconds between volleys
  moon: 0.35,            // moon gravity, a share of the den's own
  homeY: 2,              // the den's door step lift
  pulseMs: 5000,         // the Den Pulse refresh grain
  horn: '/cdn/moodboard-lowpoly-cozy/sfx-keeper-norse-horn-call.mp3',
  boom: '/cdn/moodboard-lowpoly-cozy/sfx-emote-firework-burst-boom-crackle.mp3',
  launch: '/cdn/moodboard-lowpoly-cozy/sfx-emote-firework-rocket-launch-whistle.mp3',
};
export const KTABS = [['tools', 'ᛟ', 'Tools'], ['room', '👥', 'Room'], ['sky', '☀', 'Sky'], ['marks', '📍', 'Marks'], ['fun', '🎆', 'Fun'], ['pulse', '📈', 'Pulse']];
export const isKeeper = (p) => !!p?.isEditor && p?.userId === KEEPER.owner;
