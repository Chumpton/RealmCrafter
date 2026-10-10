// The Ravenholdt quest board (creator 2026-10-06: "move the ever changing quest board in front of the gate, bigger and
// interactive"). E on the board unrolls today's postings: PER_DAY notices dealt from NOTICES by the room's day, so the
// board changes every day; the live quests (scripts/lib/data/quests.js) are always pinned on top with your standing.
export const BOARD = { perDay: 4, showSec: 30, reach: 8.5 };
export const NOTICES = [
  { title: 'Wolves on the high pasture', by: 'Sigrun, shepherd', text: 'Three ewes lost this week. A hide for every pelt brought to my gate.' },
  { title: 'Hands wanted at the mill', by: 'The miller', text: 'Grain to grind before the frost. Coin and bread for a strong back.' },
  { title: 'Lost: a silver arm-ring', by: 'Ragna of the long table', text: 'Dropped near the creek ford. Twisted silver, a raven on the clasp. Reward.' },
  { title: 'Draugr seen at the barrow', by: 'The watch', text: 'Lights in the Austr barrow after dusk. Go armed or do not go.' },
  { title: 'Feast at the longhouse', by: 'The jarl\'s hall', text: 'Mead at sundown. Bring a song, a story, or a fish.' },
  { title: 'Shrimp for the longships', by: 'Docker, harbormaster', text: 'The crew will not row on sea air. See me at the pier.' },
  { title: 'Logs for the smithy', by: 'The smith', text: 'Oak and ash, split and dry. The forge eats faster than I can chop.' },
  { title: 'Gryphon sighted over the peaks', by: 'Halvard, hunter', text: 'A great wing over the north ridge at dawn. Keep your sheep close.' },
  { title: 'Runes need reading', by: 'The seeress', text: 'A stone turned up in the turnip field. Who among you reads the old marks?' },
  { title: 'The catapult crew', by: 'Ravenholdt green', text: 'Step in the bucket. Land at the longhouse. We take no blame for hats.' },
  { title: 'Fishermen wanted', by: 'The dock', text: 'Nets mended, boats tarred. The shallows run thick this season.' },
  { title: 'Missing goat', by: 'Old Torvi', text: 'Brown, one horn, eats everything. Answers to nothing. Please.' },
];
// today's postings: a deterministic shuffle of NOTICES by day number
export function postingsOf(day) {
  const ix = NOTICES.map((_, i) => i); let s = (day * 2654435761) >>> 0;
  for (let i = ix.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [ix[i], ix[j]] = [ix[j], ix[i]]; }
  return ix.slice(0, BOARD.perDay).map((i) => NOTICES[i]);
}
