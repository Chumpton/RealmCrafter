import { watchOverhead } from '../../scripts/lib/overhead-chat.js'; // RuneScape chat over the speaker's head
import { isOn } from '../../scripts/lib/data/systems.js';
import { barrensTick, onBarrens, onBarrensJev } from '../../scripts/lib/barrens-run.js'; // World 302 chatter runner
// The meadow song's conductor (v2): always on while anyone is in the den. Two stems on two jukebox layers, started together.
// Rolf playing -> the lead layer fades out, the bed stays. The radio on -> both hush. Writes place.state.meadow { lead, bed }.
import { MEADOW as M } from '../../scripts/lib/data/meadow-song.js';
import { SONGS, TURN, CYCLE_SONGS, lapStep, layerOf } from '../../scripts/lib/data/turning-day.js';
// BOOT (perf 2026-10-06): HUGINN's body loads by import() the first time the relay needs it (drone idle > 4 s) or a JEV
// answer lands here; until then nothing of him is in the arrival set. Answers that land first wait in hugQ, replayed in order.
let HUG = null, hugLoading = null; const hugQ = [];
function hugLoad(ctx) { if (!HUG && !hugLoading) hugLoading = import('../../scripts/lib/huginn-core.js').then((m) => { HUG = m; }).catch((e) => { hugLoading = null; ctx?.log?.('[huginn] core load failed', { e: String(e?.message ?? e) }); }); return HUG; }
// FAR-RELAY: HUGINN's update() stops past the engine's reach in the outer ring; when his own behavior has not stamped
// state.alive for 4 s, this tick runs his update once a 0.5 s tick (his own step) with ctx.self = the drone. His JEV answers land here, below.
let farOn = false;
function hugCtx(ctx, me) { return new Proxy(ctx, { get: (t, k) => (k === 'self' ? me : k === '__far' ? true : typeof t[k] === 'function' ? t[k].bind(t) : t[k]) }); }
function hugRelay(ctx) {
  const me = ctx.getObject('huginn-drone'); if (!me) { farOn = false; return; }
  const s = me.state, idle = ctx.now() - (s.alive ?? 0) > 4000;
  if (!idle) { farOn = false; return; }
  if (!hugLoad(ctx)) return; // the first idle tick fetches the body; the relay starts on the tick it lands (0.5 s steps)
  const hc = hugCtx(ctx, me);
  if (!farOn || !s.far) { HUG.onSpawn(hc); s.far = true; farOn = true; ctx.log('[huginn] far-relay took over', { x: Math.round(me.feetPosition.x), z: Math.round(me.feetPosition.z) }); }
  try { HUG.update(hc); } catch (e) { ctx.log('[huginn] far-relay update threw', { e: String(e?.stack ?? e).slice(0, 400) }); }
}
const hugCb = (name) => (ctx, r, p) => { const me = ctx.getObject('huginn-drone'); if (!me) return; if (!hugLoad(ctx)) { hugQ.push([name, r, p]); return; } return HUG[name](hugCtx(ctx, me), r, p); };
function hugDrain(ctx) { if (!hugQ.length || !HUG) return; const me = ctx.getObject('huginn-drone'); for (const [name, r, p] of hugQ.splice(0)) if (me) { try { HUG[name](hugCtx(ctx, me), r, p); } catch (e) { ctx.log('[huginn] queued answer threw', { name, e: String(e?.stack ?? e).slice(0, 300) }); } } }
export const onFront = hugCb('onFront'), onRecap = hugCb('onRecap'), onLeg = hugCb('onLeg'), onMop = hugCb('onMop'), onTriage = hugCb('onTriage'), onRoute = hugCb('onRoute'), onDiff = hugCb('onDiff'), onStart = hugCb('onStart'), onPass = hugCb('onPass'), onDetective = hugCb('onDetective'), onStall = hugCb('onStall');
export { onBarrens, onBarrensJev }; // World 302 chatter: the llm:chat answer lands here
export const cadence = '500ms'; // FAR-RELAY: half-second ticks so HUGINN steps at his own 0.5 s pace (music guards are time-based)
export const scopes = { 'world.state.useTally.*': { merge: 'counter' } }; // RETICLE S4: every E/click press counts, many hands at once
const stopAt = {}; // layer -> when this sim last asked it to fade out: one fade, not a fresh one every second
function fadeOut(ctx, layer, fade) { const n = ctx.now(); if (n - (stopAt[layer] ?? -1e9) < (fade + 3) * 1000) return; stopAt[layer] = n; ctx.music.stop({ layer, fade }); }
import { logLine, lineOf, watchArrivals } from '../../scripts/lib/chat-log.js';
export function onSay(ctx, line) {
  const k = lineOf(ctx, line); if (!k) return; logLine(ctx, k[0], k[1], line.text);
  // 2026-10-09 campton: Savi is the one voice that answers in chat: a player's public line wakes her
  if (k[0] === 'pub') try { ctx.notifyDm(`${k[1] || 'a player'} said in the game chat: "${String(line.text ?? '').slice(0, 300)}". answer them there.`, { wake: true }); } catch (e) {}
} // the OSRS chat box hears say + trade
import { KNOBS as POST_KNOBS } from '../../scripts/lib/data/look-knobs.js';
function postApply(ctx, v) { const a = ctx.place.atmosphere, P = { ...(a.look?.params ?? {}) }, F = { ...(a.fog ?? {}) };
  for (const k of POST_KNOBS) { if (v[k.k] === undefined) continue; if (k.at === 'fog') F[k.k] = v[k.k]; else P[k.k] = v[k.k]; }
  for (const t of ['shR', 'shG', 'shB']) if (v[t] !== undefined) P[t] = v[t];
  a.look = { ...a.look, params: P }; a.fog = F; ctx.place.state.postAt = { n: v.__n ?? 0, at: ctx.now() }; }
const postSeen = {};
function postSync(ctx) { // creator 2026-10-09: the Shader Editor's knobs, published on the editor's own row, land on the place's look for everyone
  for (const pl of ctx.place.players) {
    const L = pl.state?.post?.live, id = pl.id; if (!L?.v || postSeen[id] === L.n) continue;
    const first = !(id in postSeen); postSeen[id] = L.n; if (first && Math.abs(ctx.now() - (L.at ?? 0)) > 20000) continue;
    if (!pl.isEditor) continue;
    postPending = L.v; // creator 2026-10-09 "live edits still broken": a runtime-only look write never reached the renderer (measured: exposure .6↔1.6 unchanged on screen until saved), so every change is saved, at most one save per 0.4 s
  }
  if (postPending && ctx.now() - postLastCommit >= 400) { const v = postPending; postPending = null; postLastCommit = ctx.now(); ctx.commit('Shader Editor: look updated', () => postApply(ctx, v)); }
}
let postPending = null, postLastCommit = 0;
export function tick(ctx) {
  try { ctx.place.state.postTick = (ctx.place.state.postTick ?? 0) % 1000 + 1 === 1 ? 1 : ctx.place.state.postTick; postSync(ctx); } catch (e) { ctx.place.state.postErr = String(e); }
  hugDrain(ctx);
  try { watchArrivals(ctx); } catch (e) {}
  try { watchOverhead(ctx); } catch (e) {} // RuneScape text over the speaker's head
  if (!ctx.place.players.length) return;
  // 2026-10-09 campton: "remove the chatbots too, make chat blank and just have you there to respond": the World 302 regulars no longer speak
  if (isOn(ctx, 'huginn')) hugRelay(ctx); // DEN SYSTEMS gate
  const s = ctx.place.state, on = ctx.music.now(), layers = on?.layers || (on ? { [on.layer || 'default']: on } : {});
  if (layers[M.oldLayer]) ctx.music.stop({ layer: M.oldLayer, fade: 2 });
  const rolf = !!ctx.getObject(M.rolf)?.state?.playing;
  const radio = ctx.query({ tags: ['home-device'] }).some((r) => r.state?.powered && r.state?.station !== undefined);
  const want = {
    bed: radio ? M.radioHush : rolf ? M.bedUnderRolf : M.volume,
    lead: radio ? Math.min(M.radioHush, rolf ? M.leadUnderRolf : 1) : rolf ? M.leadUnderRolf : M.volume,
  };
  // TURNING-DAY: place.state.song picks the den's one song (view-settings writes it); the Turning Day is the default and the day's clock
  const song = SONGS[s.song] ? s.song : 'auto'; // DUSKWOOD: unset reads as Auto-Cycle; never written here
  const cyc = song === 'auto' || CYCLE_SONGS.includes(song);
  const den = ctx.getObject('den-music-norse'); if (den?.audio) den.audio = null; // Hearthsong plays on the jukebox now, place-wide
  if (song !== 'meadow') for (const k of Object.keys(M.layers)) if (layers[M.layerPrefix + k]) fadeOut(ctx, M.layerPrefix + k, TURN.fadeS);
  if (!cyc) for (const L of [TURN.layer, TURN.layerB]) if (layers[L]) fadeOut(ctx, L, TURN.fadeS);
  const hv = (s.oldSong?.off ? 0 : (s.oldSong?.v ?? 100) / 100) * SONGS.hearth.volume;
  const single = song === 'hearth' || song === 'harmony' || song === 'forest'; // one clip looped on the hearth layer; the day keeps its own clock
  if (!single && layers[TURN.hearthLayer]) fadeOut(ctx, TURN.hearthLayer, TURN.fadeS);
  if (single) { const S = SONGS[song], base = song === 'hearth' ? hv : S.volume, h = layers[TURN.hearthLayer], v = Math.round((radio ? Math.min(base, TURN.radioHush) : base) /* Harmony holds one level: the Rolf duck made it swing quiet-loud (creator, 2026-10-06) */ * 100) / 100; if (h?.ref !== S.clip || s.hearthV !== v) { ctx.music.play(S.clip, { layer: TURN.hearthLayer, loop: true, fade: TURN.fadeS, volume: v }); s.hearthV = v; } }
  if (cyc) { // DUSKWOOD: Track 1 / Track 2 / Auto on two alternating layers; the day's t0 follows the playing layer
    let turn = s.turn || {};
    const v = radio ? TURN.radioHush : rolf ? TURN.underRolf : 0.55;
    const L = layerOf(turn.layer), O = layerOf(turn.layer === 'b' ? 'a' : 'b'), cur = layers[L];
    const playing = CYCLE_SONGS.find((k) => SONGS[k].clip === cur?.ref);
    const pick = song === 'auto' ? (CYCLE_SONGS.includes(turn.track) ? turn.track : playing ?? (ctx.random() < 0.5 ? 'turning' : 'duskwood')) : song;
    if (song === 'auto' && turn.track !== pick && playing === pick) turn = s.turn = { ...turn, track: pick, layer: turn.layer ?? 'a', n: turn.n ?? 0, rolls: turn.rolls ?? '', rolled: false }; // adopt what already plays
    const start = (tr, layer, fade) => { ctx.music.play(SONGS[tr].clip, { layer, loop: true, fade, volume: v }); };
    if (cur?.ref !== SONGS[pick].clip) {
      if (cur) { // a manual pick while a track plays: crossfade onto the other layer, the day restarts at dawn with it
        start(pick, O, TURN.fadeS); ctx.music.stop({ layer: L, fade: TURN.fadeS }); stopAt[L] = ctx.now();
        s.turn = { ...turn, t0: ctx.now(), v, track: pick, layer: turn.layer === 'b' ? 'a' : 'b', rolled: false, switched: false };
      } else { start(pick, L, TURN.fadeS); s.turn = { ...turn, t0: ctx.now(), v, track: pick, layer: turn.layer ?? 'a', rolled: false, switched: false, n: turn.n ?? 0, rolls: turn.rolls ?? '' }; }
    } else {
      if (layers[O] && ctx.now() - (stopAt[O] ?? -1e9) > (TURN.fadeS + 3) * 1000) fadeOut(ctx, O, TURN.fadeS); // a stray old layer
      if (turn.v !== v) { start(pick, L, M.volFadeS); turn = s.turn = { ...turn, v }; }
      if (Number.isFinite(cur.positionMs)) {
        if (song === 'auto') {
          const next = lapStep(turn, cur.positionMs, () => ctx.random());
          if (next !== turn) {
            if (next.switched && !turn.switched) { // the other track won the dawn roll: 2 s crossfade, the winner's first note is 06:00
              start(next.track, layerOf(next.layer), TURN.fadeS); ctx.music.stop({ layer: L, fade: TURN.fadeS }); stopAt[L] = ctx.now();
              s.turn = { ...next, t0: ctx.now() }; return finishMeadow(ctx, s, song);
            }
            turn = s.turn = next;
          }
        }
        const t0 = ctx.now() - cur.positionMs % (TURN.cycleS * 1000);
        if (!Number.isFinite(turn.t0) || Math.abs(((t0 - turn.t0) % (TURN.cycleS * 1000) + TURN.cycleS * 1500) % (TURN.cycleS * 1000) - TURN.cycleS * 500) > 1500) s.turn = { ...turn, t0 }; // keep the day on the song's own position
      }
    }
  }
  if (finishMeadow(ctx, s, song)) return;
  const lost = Object.keys(M.layers).some((k) => layers[M.layerPrefix + k]?.ref !== M.layers[k]);
  if (lost) { // a fresh room, a reset or a restart: (re)start both stems in one tick, so they share a clock
    for (const k of Object.keys(M.layers)) ctx.music.stop({ layer: M.layerPrefix + k });
    for (const k of Object.keys(M.layers)) ctx.music.play(M.layers[k], { layer: M.layerPrefix + k, loop: true, fade: M.fadeInS, volume: want[k] });
    s.meadow = { ...want, rolf, radio };
    return;
  }
  const m = s.meadow || {};
  for (const k of Object.keys(M.layers)) if (m[k] !== want[k]) ctx.music.play(M.layers[k], { layer: M.layerPrefix + k, loop: true, fade: M.volFadeS, volume: want[k] });
  if (m.bed !== want.bed || m.lead !== want.lead || m.rolf !== rolf || m.radio !== radio) s.meadow = { ...want, rolf, radio };
}
function finishMeadow(ctx, s, song) { if (song !== 'meadow') { if (s.meadow) delete s.meadow; return true; } return false; }
