// A2 hall ear: a looping clip heard through the longhouse walls, per screen. One program voice per bed row:
// params { clip, side: 'out'|'in', loop } — the engine still owns gain, bus, spatial and distance; this adds the walls:
// a lowpass + dry trim that follow where THIS screen's ear stands (hall / doorway / outside), eased, polled 4x a second.
// Decoded buffers are shared per page (one decode per clip however many voices play it).
import { HALL, hallK, hallEar } from './lib/data/hall-acoustics.js';
function buffer(ac, url) {
  const C = ac.__hallEarBufs || (ac.__hallEarBufs = new Map());
  if (!C.has(url)) C.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error('hall-ear fetch ' + r.status + ' ' + url); return r.arrayBuffer(); }).then((b) => ac.decodeAudioData(b)).catch((e) => { C.delete(url); throw e; }));
  return C.get(url);
}
export function setup({ ctx: ac, out, params, paused }) {
  const wall = ac.createBiquadFilter(); wall.type = 'lowpass'; wall.Q.value = 0.4; wall.frequency.value = 20000;
  const trim = ac.createGain(); trim.gain.value = 1;
  wall.connect(trim); trim.connect(out);
  let side = params?.side || 'out', clip = null, src = null, gen = 0, dead = false, isPaused = !!paused, lastZone = -1;
  const L = ac.listener;
  function listen(force) {
    if (!L.positionX) return;
    const k = hallK(L.positionX.value, L.positionY.value, L.positionZ.value), zone = Math.round(k * 20);
    if (zone === lastZone && !force) return; lastZone = zone;
    const e = hallEar(k, side), t = ac.currentTime;
    wall.frequency.setTargetAtTime(e.cut, t, 0.15); trim.gain.setTargetAtTime(e.gain, t, 0.15);
  }
  function stop() { if (src) { try { src.stop(); } catch {} src.disconnect(); src = null; } }
  function start(p) {
    const my = ++gen; clip = p?.clip; stop();
    if (!clip || isPaused) return;
    buffer(ac, clip).then((buf) => {
      if (dead || my !== gen || isPaused) return;
      src = ac.createBufferSource(); src.buffer = buf; src.loop = p?.loop !== false;
      if (!ac.__hallEarSaid?.[clip]) { (ac.__hallEarSaid ||= {})[clip] = 1; console.info('hall-ear ok ' + clip.split('/').pop()); }
      src.connect(wall); src.start(ac.currentTime, src.loop ? Math.random() * buf.duration : 0); // loops start mid-clip so two beds never phase
    }).catch((e) => console.warn(String(e)));
  }
  listen(true); const poll = setInterval(() => listen(false), HALL.pollMs);
  start(params);
  return {
    update(p, pz) {
      const wasPaused = isPaused; isPaused = !!pz;
      if ((p?.side || 'out') !== side) { side = p?.side || 'out'; listen(true); }
      if (p?.clip !== clip || wasPaused !== isPaused) start(p);
    },
    dispose() { dead = true; gen++; clearInterval(poll); stop(); wall.disconnect(); trim.disconnect(); },
  };
}
