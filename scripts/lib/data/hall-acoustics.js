// the longhouse as a listener hears it (Claude's measurements, design.md 08:40 UTC; world metres)
export const HALL = {
  inside: { x: [-2.6, 22.6], z: [-3.1, 6.1], y: [23.6, 36.0] },
  doors: [{ id: 'main', x: 3.4, z: -3.5 }, { id: 'back', x: 16.6, z: 6.5 }, { id: 'square', x: 8.0, z: 6.5 }],
  fade: 1.5,          // metres over which the doorway crossfades from inside to outside
  inCut: 3600, doorCut: 2500, wallCut: 900,   // lowpass Hz: in the hall, standing in a doorway, round the far wall
  inGain: 1, doorGain: 0.7, wallGain: 0.35,   // the dry voice
  inWet: 0.22, outWet: 0.3,                   // the hall's tail escapes the doors more than the plucks do
  pollMs: 250,
};
// A2 (2026-09-29): the same walls heard from the OTHER side: weather and yard beds live outdoors, so in the hall they
// come through thatch and timber (low cut, quieter), in a doorway half-open, outside untouched. Rain on the roof is
// the one weather sound that is loudest INSIDE: it rides the lyre's numbers (side 'in').
export const OUTSIDE = { inCut: 700, doorCut: 3200, outCut: 20000, inGain: 0.42, doorGain: 0.8, outGain: 1 };
// k: 1 = in the hall, 0 = outside round a wall, between = crossing a doorway (same shape the lyre has always used)
export function hallK(x, y, z, H = HALL) {
  if (x > H.inside.x[0] && x < H.inside.x[1] && z > H.inside.z[0] && z < H.inside.z[1] && y > H.inside.y[0] && y < H.inside.y[1]) return 1;
  let d = 1e9; for (const o of H.doors) d = Math.min(d, Math.hypot(x - o.x, z - o.z));
  return d < H.fade ? 0.5 * (1 - d / H.fade) : 0;
}
// the lowpass Hz and dry gain for a listener at k hearing a sound that lives on `side` ('out' outdoors, 'in' in the hall)
export function hallEar(k, side = 'out') {
  const lerp = (a, b, t) => a + (b - a) * t;
  if (side === 'in') return k >= 0.5
    ? { cut: lerp(HALL.doorCut, HALL.inCut, (k - 0.5) * 2), gain: lerp(HALL.doorGain, HALL.inGain, (k - 0.5) * 2) }
    : { cut: lerp(HALL.wallCut, HALL.doorCut, k * 2), gain: lerp(HALL.wallGain, HALL.doorGain, k * 2) };
  const O = OUTSIDE;
  return k >= 0.5
    ? { cut: lerp(O.doorCut, O.inCut, (k - 0.5) * 2), gain: lerp(O.doorGain, O.inGain, (k - 0.5) * 2) }
    : { cut: lerp(O.outCut, O.doorCut, k * 2), gain: lerp(O.outGain, O.doorGain, k * 2) };
}

// A2 switch: on = outdoor beds play through scripts/audio-hall-ear.js (the walls); off = plain clips, exactly as before A2
export const EAR = { on: true, script: 'scripts/audio-hall-ear.js' };
// the audio spec for a bed that lives on `side`; rest = gain/loop/spatial/maxDistance/bus as a clip row would carry
export function earAudio(clip, side, rest) {
  if (!EAR.on) return { clip, ...rest };
  const { loop, ...shared } = rest; // a program's loop rides its params; spatial defaults false for a program, so say it
  return { kind: 'program', script: EAR.script, params: { clip, side, loop: loop !== false }, spatial: false, ...shared };
}
export const earMatches = (audio) => !!audio && (audio.kind === 'program') === EAR.on;
