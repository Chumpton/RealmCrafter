// The den's meadow song (docs/board/proposals/MEADOW-SONG.md, v2): always on, two stems of one 6:00 render (108 bars at 72 BPM),
// started together so they stay locked. bed = drone, cello, tagelharpa, drum, pads; lead = flute, horn, viola melody, guitar.
// While Rolf plays only the lead steps back: he becomes the melody over the bed, and no second guitar fights his.
export const MEADOW = {
  layers: {
    bed: '/cdn/value.f9a4dbc7c0d6e0bd24ee3ecfd33e701be3c16370eac51a5779f65d466b72efb2.mp3',
    lead: '/cdn/value.8494098f5f21cbd541de36f68e6479fcfb8a7ae3b0d9fb36b6e848c3998f4fd9.mp3',
  },
  layerPrefix: 'meadow-',
  oldLayer: 'meadow',     // v1's single layer, retired on first tick
  passS: 360, bpm: 72, bars: 108, beatsPerBar: 4,
  volume: 0.55,           // both layers, normal
  leadUnderRolf: 0,       // lead while Rolf plays
  bedUnderRolf: 0.5,      // the bed keeps going, a touch lower so his strings sit on top
  radioHush: 0.14,        // both layers while the radio is on
  fadeInS: 3, volFadeS: 2.5,
  rolf: 'lore-skald',
};
// The chord under every bar (1-based index into the array = bar), for Rolf to play along. D Dorian, Bb borrowed in Rising.
const A = ['Dm', 'Dm', 'C', 'Am', 'Dm', 'C', 'Am', 'Dm'], B = ['F', 'C', 'Dm', 'C', 'Bb', 'C', 'Am', 'Dm'];
const SECTIONS = [['dawn', 1, 8], ['meadow', 9, 24], ['first', 25, 40], ['kin', 41, 56], ['breath', 57, 64], ['rising', 65, 80], ['hearth', 81, 92], ['dusk', 93, 100], ['night', 101, 108]];
export const MEADOW_CHART = SECTIONS.flatMap(([name, lo, hi]) => Array.from({ length: hi - lo + 1 }, (_, i) => (name === 'rising' ? B : A)[i % 8]));
// Where the song stands now: bar (1..108), beat within it, ms to the next downbeat, and the chord, from the shared clock.
export function meadowAt(ctx) {
  const on = ctx.music.now(), bed = on?.layers?.[MEADOW.layerPrefix + 'bed'];
  if (!bed || !Number.isFinite(bed.positionMs)) return null;
  const barMs = 60000 / MEADOW.bpm * MEADOW.beatsPerBar, pos = bed.positionMs % (MEADOW.passS * 1000);
  const bar = Math.floor(pos / barMs) + 1, into = pos - (bar - 1) * barMs;
  const section = SECTIONS.find(([, lo, hi]) => bar >= lo && bar <= hi)?.[0];
  return { bar, beat: into / (barMs / MEADOW.beatsPerBar), msToBar: barMs - into, barMs, chord: MEADOW_CHART[bar - 1], section };
}
