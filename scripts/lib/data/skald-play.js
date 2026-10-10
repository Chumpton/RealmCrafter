// How Rolf plays: his set rhythm, the hush over the hall music, the guitar's rest and his song-making. Tuned numbers only.
export const PLAY = {
  audio: { script: 'scripts/audio-skald-lyre.js', voice: 'lyre', gain: 1, maxDistance: 24, latency: 0.1 }, // latency: the sound waits this long so it lands with the hand (poses ride the wire ~0.1 s late)
  sagaSong: 'rimur',   // the long-winter chant, held back from the shuffle (the saga path is cut; the song stays in the book)
  hush: { id: 'den-music-norse', full: 0.16, rate: 1.2 }, // the hall's lyre-and-drum loop fades out while he plays, back after (full = its authored gain)
  wander: { radius: 40, every: [70, 200], first: [15, 45], retry: 20 }, // his own rhythm: a rest of 70-200 s between sets (the first set 15-45 s after he wakes), only with someone in the hall or yard
  set: { length: [60, 180], gap: [1.5, 4], fussChance: 0.3 }, // a set runs 1-3 minutes, song after song with a breath between; now and then he tunes between songs
  // he plays the guitar (creator 2026-09-27: "Rolf prefers his acoustic guitar"; the old lyre path cut 2026-10-03)
  guitar: {
    id: 'lore-skald-guitar', strings: 'lore-skald-guitar/lore-skald-guitar-strings', voice: 'nylon', gain: 0.25, // creator 2026-09-29: down 50%, then 50% more
    rest: { feet: { x: 10.48, y: 24.026, z: 3.32 }, rotation: { pitch: -14, roll: 0, yaw: 0 } }, // leaning at the stool's right, neck up. B5 (Savi 09-28): y 24 sank the drawn body 23 mm under the planks (hall-shell floor draws at 24.02); 24.026 = ~3 mm clear
  },
  // his own songs: one jev:decide per song, asked while the one before plays; favourites = the chance an old written tune comes instead
  compose: { favourites: 0.2, timeout: 12, recent: 3, weatherId: 'home-weather-controller',
    persona: 'You are Rolf, an old Norse skald with his lyre and his Spanish guitar in a longhouse by a lake. You make up your next song from what is around you tonight and what you just played; you rarely repeat yourself.' },
  hands: { blend: 0.35 },   // how fast his arms ease onto their rest targets after a song (the guitar's own hand data lives in skald-guitar-hands)
  lift: { sec: 1.5, downSec: 1.1, grip: 0.22, sag: 0.025, lean: 14, drag: 0.012, handsIn: 0.35 },
  // finger curls in degrees (additive over the rig's pose): curl axis and sign per the rig
  fingers: { axis: 'roll', sign: 1, rest: 18, pluck: 55, flick: 0.2, strum: 40, mute: 45, muteHold: 0.12 },
  jaw: { bone: 'Jaw', open: -12, rate: 13 },
  nod: { bone: 'Head', deg: 4 },
};
