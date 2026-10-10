// TURNING-DAY (docs/board/proposals/TURNING-DAY.md, WATCHED 5/5): the song is the clock.
// The conductor (places/main/sim.js) writes place.state.turn = { t0 } when The Turning Day (re)starts; the day reads it.
export const SONGS = {
  auto: { name: 'Auto-Cycle' },          // DUSKWOOD (WATCHED 5/5): a 50/50 roll between Track 1 and Track 2 at every dawn
  turning: { name: 'Track 1 · Elwynn to Black Forest', file: 'Track_1_Elwynn_BlackForest', tour: '/cdn/value.33769bc2ea113cd6411db942d130de72c87c3eb978e81bf45e29a9868a2b20f6.mp3', clip: '/cdn/value.185ed0e6b3d1cce4a77203bac48677d74875043d12c8a79505d869c6fb21b78f.mp3', volume: 0.55 },
  duskwood: { name: 'Track 2 · Meadows to Duskwood', file: 'Track_2_Meadows_Duskwood', clip: '/cdn/value.951b5a98a634c5b0df775e91c2039663be5dd35bf6ed1f4ef62b16e7d3722187.mp3', tour: '/cdn/value.68877e5591f614c61c7d37cf702d3093e007187ec34eb8175136c390e7cca7b8.mp3', volume: 0.55 },
  meadow: { name: 'Meadow Song' },       // the two meadow stems, meadow-song.js
  hearth: { name: 'Hearthsong', clip: '/cdn/moodboard-lowpoly-cozy/music-norse-longhouse-lyre-frame-drum-warm-loop.mp3', volume: 0.45 },
  forest: { name: 'Forest Music', clip: '/cdn/value.4bc3a5a61af29e3ecf23822551cfc4d634f42d5a13975bb32d891681a2e3d057.mp3', volume: 0.5 }, // creator's ForestMusic.zip, 2026-10-10: one hour, a single looped song
  harmony: { name: 'Harmony · Lumbridge', clip: '/cdn/value.057bf06db6e0ee759cba47ca376682c698b40695b8884d80c38362dcabb1cd79.mp3', volume: 0.5 }, // the Old School Lumbridge theme (3:40), a single looped song like Hearthsong
};
export const CYCLE_SONGS = ['turning', 'duskwood']; // the two 6:00 day/night scores; the sky follows either
export const TURN = {
  cycleS: 360, layer: 'song-turning', layerB: 'song-turning-b', prerollS: 357, hearthLayer: 'song-hearth', fadeS: 2, underRolf: 0.5, radioHush: 0.14,
  // the sun's hour across the loop: [fromS, toS, fromHour, toHour]; each piece is one straight atmosphere.cycle
  pieces: [[0, 150, 6, 17], [150, 210, 17, 19.5], [210, 345, 19.5, 28.5], [345, 360, 4.5, 6]],
  // ambient light [s, color, intensity], lerped; 4 s eased edges between the creator's bands
  ambient: [[0, '#FFF4D1', 1.2], [146, '#FFF4D1', 1.2], [154, '#FF8C42', 0.6], [206, '#FF8C42', 0.3], [214, '#0B132B', 0.08],
            [341, '#0B132B', 0.08], [349, '#2D4059', 0.2], [356, '#2D4059', 0.2], [360, '#FFF4D1', 1.2]],
  // fog distance multiplier, sqrt(0.01 / density): 0.01 day, 0.08 dusk, 0.12 night, 0.08 dawn (DUSKWOOD) (the asked densities as exp2 would blind the den)
  fog: [[0, 1], [146, 1], [154, 0.35], [206, 0.35], [214, 0.29], [341, 0.29], [345, 0.35], [358, 0.35], [360, 1]],
};
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerp = (a, b, k) => a + (b - a) * k;
function seg(rows, t) { for (let i = 1; i < rows.length; i++) if (t <= rows[i][0]) { const a = rows[i - 1], b = rows[i]; const u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]); return [a, b, u * u * (3 - 2 * u)]; } const r = rows[rows.length - 1]; return [r, r, 0]; }
export function turnT(now, t0) { const c = TURN.cycleS * 1000; return (((now - t0) % c) + c) % c / 1000; }
export function ambientAt(t) {
  const [a, b, k] = seg(TURN.ambient, t), A = hx(a[1]), B = hx(b[1]);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join('');
  return { color: '#' + c, intensity: Math.round(lerp(a[2], b[2], k) * 100) / 100 };
}
export function fogAt(t) { const [a, b, k] = seg(TURN.fog, t); return Math.round(lerp(a[1], b[1], k) * 100) / 100; }

// DUSKWOOD: one lap step. turn = place.state.turn; posMs = the playing layer's positionMs; rand = ctx.random.
// Past prerollS with no roll this lap: roll 50/50 for the next lap. A different winner flips the layer (the 2 s crossfade).
// Back near the lap's head: arm the next roll. Returns the same object when nothing changed.
export function lapStep(turn, posMs, rand) {
  const tr = turn || {}, t = (posMs % (TURN.cycleS * 1000)) / 1000;
  if (t >= TURN.prerollS && !tr.rolled) {
    const win = rand() < 0.5 ? 'turning' : 'duskwood', sw = win !== (tr.track ?? 'turning');
    return { ...tr, track: win, layer: sw ? (tr.layer === 'b' ? 'a' : 'b') : (tr.layer ?? 'a'), rolled: true, switched: sw, n: (tr.n ?? 0) + 1, rolls: ((tr.rolls ?? '') + (win === 'turning' ? '1' : '2')).slice(-10) };
  }
  if (t < TURN.prerollS - 30 && tr.rolled) return { ...tr, rolled: false, switched: false };
  return tr;
}
export const layerOf = (l) => (l === 'b' ? TURN.layerB : TURN.layer);
