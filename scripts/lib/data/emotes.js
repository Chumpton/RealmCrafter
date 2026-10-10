// The emotes window (creator 2026-10-06): L opens the Emotes tab; a tile plays the clip on your body and its sound for everyone near.
// once = plays through and lets go; loop = holds until you move. Sounds: the creator's fart upload, the rest conjured lowpoly-cozy.
const S = (n) => `/cdn/moodboard-lowpoly-cozy/sfx-emote-${n}.mp3`;
export const EMOTES = [
  { id: 'wave',    icon: '👋', name: 'Wave',    clip: 'cdn/clip-wave-loop.glb',   loop: 'loop', ms: 2600, sfx: S('friendly-hey-whistle') },
  { id: 'bow',     icon: '🙇', name: 'Bow',     clip: 'cdn/clip-bow.glb',         loop: 'once', ms: 2200, sfx: S('cloth-rustle-bow') },
  { id: 'cheer',   icon: '🙌', name: 'Cheer',   clip: 'cdn/clip-cheer-loop.glb',  loop: 'loop', ms: 3000, sfx: S('cheer-hooray') },
  { id: 'clap',    icon: '👏', name: 'Clap',    clip: 'cdn/clip-clap-loop.glb',   loop: 'loop', ms: 2600, sfx: S('hand-clapping') },
  { id: 'laugh',   icon: '😂', name: 'Laugh',   clip: 'cdn/clip-laugh-loop.glb',  loop: 'loop', ms: 2800, sfx: '/cdn/sfx-mangaletp-funny-laughing-agh17uzc.mp3' },
  { id: 'cry',     icon: '😢', name: 'Cry',     clip: 'cdn/clip-cry-loop.glb',    loop: 'loop', ms: 3000, sfx: S('sad-sobbing-man') },
  { id: 'dance',   icon: '💃', name: 'Dance',   clip: 'cdn/clip-dance-loop.glb',  loop: 'loop', ms: 0,    sfx: S('lute-jig-sting') },
  { id: 'jig',     icon: '🐔', name: 'Chicken', clip: 'cdn/clip-chicken-dance-loop.glb', loop: 'loop', ms: 0, sfx: S('chicken-clucks') },
  { id: 'salute',  icon: '🫡', name: 'Salute',  clip: 'cdn/clip-salute.glb',      loop: 'once', ms: 1800, sfx: S('heel-click-salute') },
  { id: 'point',   icon: '👉', name: 'Point',   clip: 'cdn/clip-point.glb',       loop: 'once', ms: 1600, sfx: S('hey-over-there') },
  { id: 'yes',     icon: '👍', name: 'Yes',     clip: 'cdn/clip-nod-yes.glb',     loop: 'once', ms: 1600, sfx: S('mm-hm-yes') },
  { id: 'no',      icon: '👎', name: 'No',      clip: 'cdn/clip-shake-no.glb',    loop: 'once', ms: 1600, sfx: S('nuh-uh-no') },
  { id: 'shrug',   icon: '🤷', name: 'Shrug',   clip: 'cdn/clip-shrug.glb',       loop: 'once', ms: 1600, sfx: S('dunno-hmm') },
  { id: 'sit',     icon: '🪑', name: 'Sit',     clip: 'cdn/clip-sit-floor-loop.glb', loop: 'loop', ms: 0, sfx: S('settle-down-sigh') },
  { id: 'metal',   icon: '🎸', name: 'Metal',   clip: 'cdn/clip-step-hip-hop-dance-loop.glb', loop: 'loop', ms: 15000, music: '/cdn/jonasblakewood-heavy-metal-music-combat-7zjibilp.mp3', prop: 'guitar' },
  // hand props (creator 2026-10-06): held, not played over the body: the arm lifts for a drag / a sip, drops to your side, lifts again. Smoke + Pint pair up, standing or seated
  { id: 'smoke',   icon: '🚬', name: 'Smoke',   hand: 'cig',  sfx: S('lighter-flick-and-first-drag') },
  { id: 'pint',    icon: '🍺', name: 'Pint',    hand: 'pint', sfx: S('glass-clink-and-sip') },
  // tricks (creator 2026-10-06): a clip plus a show scripts/emotes.js stages (TRICKS there)
  { id: 'firebreath', icon: '🔥', name: 'Fire Breath', clip: 'cdn/clip-fire-breathing-lean-forward-roar.glb', loop: 'once', ms: 2600, sfx: S('fire-breath-roaring-whoosh'), trick: 'firebreath' },
  { id: 'firework',   icon: '🎆', name: 'Firework',    clip: 'cdn/clip-point.glb',  loop: 'once', ms: 3200, sfx: S('firework-rocket-launch-whistle'), trick: 'firework' },
  { id: 'popper',     icon: '🎉', name: 'Party Popper', clip: 'cdn/clip-cheer-loop.glb', loop: 'loop', ms: 1800, sfx: S('party-popper-pop-and-toot'), trick: 'popper' },
  { id: 'pie',        icon: '🥧', name: 'Pie',         clip: 'cdn/clip-throw-overhand.glb', loop: 'once', ms: 1500, sfx: S('cartoon-throw-whoosh'), trick: 'pie' },
  { id: 'levitate',   icon: '🧘', name: 'Levitate',    clip: 'cdn/clip-meditate-floating-cross-legged-loop.glb', loop: 'loop', ms: 0, sfx: S('mystic-hum-rising-chime'), trick: 'levitate' },
  { id: 'fart',    icon: '💨', name: 'Fart',    clip: 'cdn/clip-shrug.glb',       loop: 'once', ms: 1600, sfx: '/cdn/fart-sound-effect-funny-f78bnukl.mp3', puff: true },
];
// one row per hand prop: which arm lifts (the clip's own hand: the smoking clip smokes left-handed), how long the lift lasts, how long it rests at your side
export const HANDS = {
  cig:  { clip: 'cdn/clip-smoking-cigarette-loop.glb', mask: 'LeftShoulder', bone: 'lefthand', liftMs: 2600, rest: [4500, 7500], firstMs: 900, exhale: true },
  pint: { clip: 'cdn/clip-drinking-from-mug-right-hand-loop.glb', mask: 'RightShoulder', bone: 'righthand', liftMs: 2200, rest: [7000, 12000], firstMs: 2500 },
};
export const EMOTE_BY = Object.fromEntries(EMOTES.map((e) => [e.id, e]));
