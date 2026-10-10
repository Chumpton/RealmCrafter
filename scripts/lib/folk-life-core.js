// folk-life's body — scripts/folk-life.js (the row's behavior) loads this by import() on first need, so it stays out of the arrival set.
// The people of the hall — one behaviour for every folk- row. No update(): the murmur of life is ctx.after timers.
// Row state: { idle: [clip…] (eased over FOLK.pose.blend, swapped every FOLK.pose.swapEvery s; FOLK.pose.by overrides per folk), toast: clip, toastMask?: bool (gesture over the pose), voice: [url…], weight?, handPose?, headY? }
// Head turns: every 4–9 s a folk looks at the nearest player within 5 m, else a talking neighbour, else ahead;
//   neck+Head yaw/pitch ease there over 0.8 s (tween on bones.*), clamped ±55° / ±15° to the body. Sleepers never turn.
// Notice (FOLK.notice): a 0.5 s chain per folk — walker within 4 m → the nearest folk turns (±60°, 0.4 s), holds 2–4 s, returns;
//   new sitter within 2.5 m → turn + nod, 1 in 3 a greeting. 20 s cooldown per folk. state.noticeTarget records the last one when FOLK.debug.
// Blink contract (2a rigs): LeftEyelid/RightEyelid bones or a /blink/i shape key → a 0.15 s blink every 3–7 s.
//   Rigs with neither: detected in onSpawn and skipped silently. Still (sleeping) rows get their lids shut once.
// Jaw: talking clip (state.talking) → slow irregular open/close on Jaw; a toast opens it with the voice for ~1.4 s.
// Every bone write merges per key into ctx.self.bones (look, blink and jaw share the bag).
// Finger contract: state.handPose → FOLK.hands.poses[name] on mixer channel "hands" (weight 7), masked to the
//   LeftHand/RightHand subtrees — only when the rig carries finger bones (RightHandIndex1…).
import { animate } from 'builtin/tween';
import { clips as readClips, toTracks } from 'builtin/anim';
import { rotate } from 'builtin/vec3';
import { shortestArc, clamp } from 'builtin/math';
import { FOLK } from './data/folk-life.js';
import { RR } from './data/rain-react.js';
import { boneName, axisSign, rig as rigOf } from './rig-names.js';
import { watchArrivals, hushed as quietFor } from './arrival-quiet.js';
import { esc } from './esc.js';
const seen = new Map(); // id → model key the rig was last read for (a body swap re-reads it)
const P = FOLK.pose, W = P.weight; // blend, rates and per-folk clip sets live in FOLK.pose (a hard cut read as a twitch)
const L = FOLK.look;
const has = (clip, marks) => !!clip && marks.some((m) => clip.includes(m));
function curClip(s) { return s.toasting && !s.toastMask ? s.toast : s.idle?.[s.at ?? 0] ?? s.idle?.[0]; }
function headY(s) { if (s.headY != null) return s.headY; const c = curClip(s) || ''; return L.headY.find(([m]) => c.includes(m))[1]; }
const nameOf = (ctx) => String(ctx.self.id).replace(/^folk-/, '').toLowerCase();
// The data's calm set: per-folk idle list and pinned rate (FOLK.pose.by), avoided clips dropped. Written only when it differs.
function calm(ctx) {
  const s = ctx.self.state, by = P.by[nameOf(ctx)] || {};
  const want = (by.idle || s.idle || []).filter((c) => !has(c, P.avoid));
  if (want.length && JSON.stringify(want) !== JSON.stringify(s.idle || [])) { s.idle = want; if ((s.at ?? 0) >= want.length) s.at = 0; }
  let sp = by.speed;
  if (sp == null) sp = s.speed ?? +(P.speed[0] + ctx.random() * (P.speed[1] - P.speed[0])).toFixed(2);
  if (by.speed == null) { // unpinned: step clear of any neighbour's rate
    for (const r of near(ctx)) { const o = ctx.getObject(r.id); const rs = o?.state?.speed; if (rs != null && Math.abs(rs - sp) < P.minSpeedGap) sp = +(rs + (sp >= rs ? 1 : -1) * P.minSpeedGap).toFixed(2); }
  }
  if (s.speed !== sp) s.speed = sp;
}
function near(ctx) { try { return ctx.query({ tags: ['folk'], radius: P.neighbourRadius }).filter((r) => r.id !== ctx.self.id); } catch (e) { return []; } }
function pose(ctx, clip, blend = P.blend) {
  const s = ctx.self.state;
  calm(ctx);
  if (has(clip, P.avoid)) clip = s.idle?.[s.at ?? 0] ?? s.idle?.[0];
  ctx.self.anim.pose = { clip, weight: s.weight ?? W, loop: 'loop', blendIn: blend, speed: s.speed };
  const talking = has(clip, L.talking);
  if (s.talking !== talking) s.talking = talking;
  if (talking && !s.toasting && s.jawMode !== 'talk') startJaw(ctx, 'talk', 0.4);
}
// Merge { bone: { axis: deg } } into the shared bag, key by key — never a whole-bag replace.
function setBones(ctx, patch) {
  for (const [bone, axes] of Object.entries(patch)) {
    const cur = ctx.self.bones[bone] || { yaw: 0, pitch: 0, roll: 0 };
    ctx.self.bones[bone] = { ...cur, ...axes };
  }
}
function ensureBone(ctx, bone) { if (!ctx.self.bones[bone]) setBones(ctx, { [bone]: { yaw: 0, pitch: 0, roll: 0 } }); }
function schedule(ctx, secs) {
  const s = ctx.self.state;
  if (!s.idle || s.idle.length < 2) return;
  s.token = (s.token ?? 0) + 1;
  ctx.after(secs ?? span(P.swapEvery, ctx), 'swap', { token: s.token });
}
// Talk windows (FOLK.chat): a talking clip plays hold s then hands back to the light clip, and never inside an arrival's quiet.
const C = FOLK.chat;
const hushed = (ctx) => quietFor(ctx, C.quiet); // a new player id restarts the quiet (scripts/lib/arrival-quiet.js)
const lightIdx = (s) => { const i = (s.idle ?? []).findIndex((c) => has(c, C.boot)); return i >= 0 ? i : Math.max(0, (s.idle ?? []).findIndex((c) => !has(c, L.talking))); };
function talkersElsewhere(ctx) { let n = 0; for (const q of ctx.query({ tags: ['folk'] })) if (q.id !== ctx.self.id && q.state?.talking) n++; return n; }
function hush(ctx) { const s = ctx.self.state; if (s.toasting || s.work || !has(curClip(s), L.talking)) return; s.at = lightIdx(s); pose(ctx, s.idle[s.at]); schedule(ctx, C.quiet + span(C.rest, ctx)); }
const span = ([a, b], ctx) => a + ctx.random() * (b - a);
// Quiet cadence (perf): with no player within QUIET.radius m nobody sees a head turn, a blink or a jaw — the chains keep
// ticking but skip the bone tweens (network + tween-evaluator work) and re-check every QUIET.every s.
const QUIET = { radius: 15, every: [6, 10], noticeIdle: 3 };
function alone(ctx) {
  const me = ctx.self.worldFeetPosition || ctx.self.feetPosition, r2 = QUIET.radius * QUIET.radius;
  for (const p of ctx.place.players) { const f = p.worldFeetPosition || p.feetPosition; if (f && (f.x - me.x) ** 2 + (f.z - me.z) ** 2 < r2) return false; }
  return true;
}
// Boot: rows boot on the light sit clip their mixer names (clip-sit-loop 62 KB / clip-sit-female-loop 124 KB, not the
// 380–440 KB talking clips); the first swap, 6–14 s after the body lands, moves them to their talking clip.
const BOOT = C.boot, FIRST = C.first; // round 8: the first talking window opens after a visitor stands (FOLK.chat)
export function onSpawn(ctx) {
  const s = ctx.self.state;
  s.toasting = false;
  dropVessel(ctx);
  if (ctx.self.ik) ctx.self.ik = null; // a lift from before a reload is stale
  s.jawMode = null; s.jawToken = (s.jawToken ?? 0) + 1; // a chain from before a reload is stale
  const boot = (s.idle ?? []).findIndex((c) => has(c, BOOT)), talk = (s.idle ?? []).findIndex((c) => has(c, L.talking));
  if (boot >= 0) s.at = boot;
  pose(ctx, s.idle?.[s.at ?? 0] ?? s.idle?.[0]);
  ctx.self.anim.gesture = null;
  watchArrivals(ctx);
  if (boot >= 0 && talk >= 0) { s.token = (s.token ?? 0) + 1; ctx.after(span(FIRST, ctx), 'swap', { token: s.token, to: talk }); }
  else schedule(ctx);
  rig(ctx);
  if (has(curClip(s), L.still)) ctx.after(1, 'shutEyes', { tries: 0 });
  if (!has(curClip(s), L.still)) { s.lookToken = (s.lookToken ?? 0) + 1; ctx.after(span([1, 3], ctx), 'look', { token: s.lookToken }); startNotice(ctx); }
}
// What the rig can do, read once: blink mode and finger bones. Unknown (server realm) or absent = skip, silently.
function rig(ctx) {
  const s = ctx.self.state, id = ctx.self.id;
  let names = [], morphs = [];
  try { names = ctx.getObjectBoneNames(id) || []; } catch (e) { names = []; }
  try { morphs = ctx.getObjectMorphTargetNames(id) || []; } catch (e) { morphs = []; }
  const B = FOLK.blink;
  const blinkKey = morphs.find((m) => B.morph.test(m));
  const lids = B.bones.every((b) => names.includes(boneName(ctx, id, b)));
  seen.set(id, rigOf(ctx, id).key);
  const blink = blinkKey ? { morph: blinkKey } : lids ? { bones: true } : null;
  if (JSON.stringify(s.blinkRig ?? null) !== JSON.stringify(blink)) s.blinkRig = blink;
  if (blink && !has(curClip(s), L.still)) { s.blinkToken = (s.blinkToken ?? 0) + 1; ctx.after(span(B.every, ctx), 'blink', { token: s.blinkToken }); }
  const H = FOLK.hands;
  const fingers = names.some((n) => H.fingerProbe.test(n));
  if (!!s.fingers !== fingers) s.fingers = fingers;
  applyHands(ctx, names, fingers);
}
// Hand clips go to the mixer as raw tracks, never as the bare 'anim/x.yml#clip' string: a string makes every machine
// resolve the file at channel time, and a timer that fires before that machine holds anim/ (a lazy core's first
// endToast on a fresh client) threw "updateChannel: … — no file". Read once here (clips() from the tree), lowered
// with toTracks, cached per address; an address that will not read yet answers null and the next look tick retries.
const handClips = new Map();
function handClip(ctx, addr) {
  if (!addr) return null;
  if (handClips.has(addr)) return handClips.get(addr);
  const [file, name] = addr.split('#');
  try {
    const c = readClips(ctx, file)?.[name];
    if (!c) return null;
    const raw = toTracks({ ...c, name: 'folk-hands-' + name }); // a name that is not a file address, so no machine goes looking for the file
    handClips.set(addr, raw);
    return raw;
  } catch (e) { return null; }
}
// The finger layer for state.handPose; re-run by the look chain whenever handPose moves (s.handsFor remembers).
function applyHands(ctx, names, fingers) {
  const s = ctx.self.state, H = FOLK.hands;
  const want = s.handPose ?? null;
  const clip = fingers && s.handPose ? handClip(ctx, H.poses[s.handPose]) : null;
  if (clip) {
    const mask = names.filter((n) => /(Left|Right)Hand/.test(n));
    ctx.self.anim[H.channel] = { clip, weight: H.weight, loop: 'loop', blendIn: H.blendIn, mask: { bones: mask } };
  } else if (fingers && want && H.poses[want]) return; // not readable yet: handsFor stays behind, the look tick retries
  else if (ctx.self.anim[H.channel]) ctx.self.anim[H.channel] = null;
  if (s.handsFor !== want) s.handsFor = want;
}
export function swap(ctx, { token, to } = {}) {
  const s = ctx.self.state;
  if (token !== s.token) return; // a stale chain from before a reload
  if (!s.toasting && !s.lyre) { // lyre: playing the hall lyre (scripts/lib/npc-lyre.js) holds its pose
    calm(ctx);
    let n = to ?? Math.floor(ctx.random() * s.idle.length);
    if (to == null) { // never the clip already playing, nor one a neighbour is playing (no two loops side by side)
      const taken = new Set(near(ctx).map((r) => ctx.getObject(r.id)?.anim?.pose?.clip).filter(Boolean));
      for (let i = 0; i < s.idle.length; i++) { const k = (n + i) % s.idle.length; if (k !== (s.at ?? 0) && !taken.has(s.idle[k])) { n = k; break; } if (i === s.idle.length - 1 && n === (s.at ?? 0)) n = (n + 1) % s.idle.length; }
    }
    let secs;
    if (has(s.idle[n], L.talking)) { // a talking clip: only a bounded window, never in an arrival's quiet or a busy hall
      watchArrivals(ctx);
      if (has(curClip(s), L.talking) || hushed(ctx) || talkersElsewhere(ctx) >= C.maxTalkers) n = lightIdx(s);
      else secs = span(C.hold, ctx);
    } else if (has(curClip(s), L.talking)) secs = span(C.rest, ctx);
    s.at = n;
    pose(ctx, s.idle[n]);
    schedule(ctx, secs);
    return;
  }
  schedule(ctx);
}
// The toast press rides the facade's ears (scripts/folk-life.js) — an ear armed in a lazy onSpawn is lost on a hot swap.
export const ears = { press(ctx, p) { toast(ctx, p); }, rainReact(ctx, p) { if (p?.react) ctx.after(p.delay ?? 1, 'rainAct', p); } };
// W12: a rain reaction, a short gesture over whatever pose the body holds, a mouthed line floating over the head
function rainHead(ctx, pitch, yaw, dur) {
  const id = ctx.self.id, kf = {};
  for (const [logical, share] of Object.entries(L.split)) { const b = boneName(ctx, id, logical); ensureBone(ctx, b);
    if (pitch != null) kf[`bones.${b}.pitch`] = +(pitch * share * axisSign(ctx, id, logical, 'pitch')).toFixed(1);
    if (yaw != null) kf[`bones.${b}.yaw`] = +(yaw * share * axisSign(ctx, id, logical, 'yaw')).toFixed(1); }
  animate(ctx, id, kf, { duration: dur, easing: 'easeInOutSine' });
}
export function rainAct(ctx, p = {}) {
  const s = ctx.self.state;
  if (s.toasting || s.lyre || s.rainActing || has(curClip(s) || '', ['sleep'])) return;
  s.rainActing = true;
  const k = p.react, spine = boneName(ctx, ctx.self.id, 'Spine');
  if (k === 'cheer') ctx.self.anim.gesture = { clip: RR.cheerClip, weight: 8, loop: 'loop', mask: { from: spine }, blendIn: 0.5, blendOut: 0.7, duration: RR.hold };
  else if (k === 'shrug') ctx.self.anim.gesture = { clip: RR.shrugClip, weight: 8, loop: 'once', mask: { from: spine }, blendIn: 0.35, blendOut: 0.6, duration: RR.hold * 0.7 };
  else if (k === 'glance') rainHead(ctx, RR.glancePitch, null, 1.1);
  else if (k === 'laugh') { rainHead(ctx, RR.laughPitch, null, 0.5); ctx.after(0.6, 'rainAct2', { step: 1 }); }
  else if (k === 'grumble') { rainHead(ctx, null, RR.shakeYaw, 0.45); ctx.after(0.5, 'rainAct2', { step: 2 }); }
  if (p.line) {
    startJaw(ctx, 'toast', 0.2);
    const f = ctx.self.worldFeetPosition || ctx.self.feetPosition, sc = typeof ctx.self.scale === 'number' ? ctx.self.scale : (ctx.self.scale?.y ?? 1);
    const w = Math.max(1.1, Math.min(2.6, p.line.length * 0.052));
    ctx.spawn({ audience: 'near', lifetime: RR.bubbleFor, tags: ['rain-line'], feetPosition: { x: f.x, y: +(f.y + (headY(s) + 0.5) * sc).toFixed(2), z: f.z },
      vector: `<svg viewBox='0 0 ${Math.round(w * 100)} 24' width='${w.toFixed(2)}m' billboard='yaw'><text x='${Math.round(w * 50)}' y='17' text-anchor='middle' font-family='serif' font-size='14' font-style='italic' fill='#f2e6cf' filter='drop-shadow(0 0 2 #1a120c)'>${esc(p.line)}</text></svg>` });
  }
  ctx.after(RR.hold, 'rainEnd');
}
export function rainAct2(ctx, { step } = {}) {
  if (!ctx.self.state.rainActing) return;
  if (step === 1) rainHead(ctx, RR.laughPitch * 0.5, null, 0.35);              // the laugh bobs
  else if (step === 2) rainHead(ctx, null, -RR.shakeYaw, 0.6);                   // the head shakes back
  if (step === 1) ctx.after(0.4, 'rainAct2', { step: 3 }); else if (step === 3) rainHead(ctx, RR.laughPitch, null, 0.35);
}
export function rainEnd(ctx) {
  const s = ctx.self.state; if (!s.rainActing) return;
  s.rainActing = false; rainHead(ctx, 0, 0, 1.0);
}
// One look pick: a target head point → neck+Head yaw/pitch relative to the body, eased by tween.
export function look(ctx, { token } = {}) {
  const s = ctx.self.state;
  if (token !== s.lookToken) return;
  if (has(curClip(s), L.still)) return; // asleep: the chain ends here
  startNotice(ctx); // rows alive before the notice chain existed pick it up here
  const n = nt.get(ctx.self.id), nowMs = ctx.now();
  if (n && n.until && nowMs < n.until) { ctx.after(span(L.every, ctx), 'look', { token }); return; } // a notice holds the head
  if (alone(ctx)) { ctx.after(span(QUIET.every, ctx), 'look', { token }); return; } // nobody near: no turn
  const me = ctx.self.worldFeetPosition || ctx.self.feetPosition;
  const eye = { x: me.x, y: me.y + headY(s), z: me.z };
  let tgt = null, best = L.playerRadius;
  for (const p of ctx.place.players) {
    const f = p.worldFeetPosition || p.feetPosition; if (!f) continue;
    if (n && n.ignore === p.id && nowMs < n.cool) continue; // just noticed and turned back: leave them be a while
    const d = Math.hypot(f.x - me.x, f.z - me.z);
    if (d < best) { best = d; tgt = { x: f.x, y: f.y + L.playerEye, z: f.z }; }
  }
  if (!tgt) {
    best = L.folkRadius;
    for (const r of ctx.query({ tags: ['folk'], radius: L.folkRadius })) {
      if (!r.state?.talking || r.id === ctx.self.id) continue;
      const f = r.feetPosition, d = Math.hypot(f.x - me.x, f.z - me.z);
      if (d < best) { best = d; tgt = { x: f.x, y: f.y + headY(r.state), z: f.z }; }
    }
  }
  let yaw = 0, pitch = 0;
  if (tgt) {
    const fw = rotate(ctx.self.rotation, { x: 0, y: 0, z: -1 });
    const body = Math.atan2(-fw.x, -fw.z) * 180 / Math.PI;
    const dx = tgt.x - eye.x, dz = tgt.z - eye.z;
    const head = Math.atan2(-dx, -dz) * 180 / Math.PI;
    yaw = clamp(shortestArc(body, head), -L.maxYaw, L.maxYaw);
    pitch = clamp(Math.atan2(tgt.y - eye.y, Math.hypot(dx, dz)) * 180 / Math.PI, -L.maxPitch, L.maxPitch) * L.pitchSign;
  } else yaw = (ctx.random() * 2 - 1) * L.forwardJitter;
  const id = ctx.self.id;
  if (seen.get(id) !== rigOf(ctx, id).key) { // a new body: drop keys the new rig lacks, re-read blink/fingers
    const names = rigOf(ctx, id).names;
    if (names) for (const k of Object.keys(ctx.self.bones || {})) if (!names.includes(k)) delete ctx.self.bones[k];
    rig(ctx);
  }
  if ((s.handPose ?? null) !== (s.handsFor ?? null)) applyHands(ctx, rigOf(ctx, id).names || [], !!s.fingers);
  if (FOLK.debug) ctx.log('look', { yaw, pitch });
  headTo(ctx, yaw, pitch, L.ease, L.easing);
  s.lookAt = tgt ? 'target' : 'ahead';
  ctx.after(span(L.every, ctx), 'look', { token });
}
export function blink(ctx, { token } = {}) {
  const s = ctx.self.state, b = s.blinkRig, B = FOLK.blink;
  if (token !== s.blinkToken || !b || has(curClip(s), L.still)) return;
  if (alone(ctx)) { ctx.after(span(QUIET.every, ctx), 'blink', { token }); return; } // nobody near: no blink
  setLids(ctx, b, true);
  if (FOLK.debug) ctx.log('blink', { at: ctx.now() });
  ctx.after(B.hold, 'openLids', {});
  ctx.after(span(B.every, ctx), 'blink', { token });
}
export function openLids(ctx) { if (ctx.self.state.blinkRig) setLids(ctx, ctx.self.state.blinkRig, false); }
function setLids(ctx, b, shut) {
  const B = FOLK.blink;
  if (b.morph) ctx.self.morph = { [b.morph]: shut ? 1 : 0 };
  else { const p = {}; for (const n of B.bones) p[boneName(ctx, ctx.self.id, n)] = { pitch: shut ? B.closePitch * axisSign(ctx, ctx.self.id, n, 'pitch') : 0 }; setBones(ctx, p); }
}
// A sleeper's lids: shut once, when the rig can be read (the model may still be pinning).
export function shutEyes(ctx, { tries = 0 } = {}) {
  const s = ctx.self.state, id = ctx.self.id, S = FOLK.sleepLids;
  if (!has(curClip(s), L.still)) return;
  let names = []; try { names = ctx.getObjectBoneNames(id) || []; } catch (e) { names = []; }
  let morphs = []; try { morphs = ctx.getObjectMorphTargetNames(id) || []; } catch (e) { morphs = []; }
  const key = morphs.find((m) => FOLK.blink.morph.test(m));
  const lids = names.length && FOLK.blink.bones.every((b) => names.includes(boneName(ctx, id, b)));
  if (key || lids) { setLids(ctx, key ? { morph: key } : { bones: true }, true); if (!s.lidsShut) s.lidsShut = true; return; }
  if (tries < S.tries) ctx.after(S.retry, 'shutEyes', { tries: tries + 1 });
}
// Jaw chain. mode 'talk' runs while state.talking; mode 'toast' runs toastFor s, then hands back to talk if due.
function jawBone(ctx) {
  const id = ctx.self.id, bone = boneName(ctx, id, FOLK.jaw.bone), names = rigOf(ctx, id).names;
  return names && names.includes(bone) ? bone : null;
}
function startJaw(ctx, mode, delay = 0.05) {
  const s = ctx.self.state;
  if (!jawBone(ctx)) { if (s.jawMode) s.jawMode = null; return; }
  s.jawToken = (s.jawToken ?? 0) + 1;
  s.jawMode = mode;
  const until = mode === 'toast' ? ctx.now() + FOLK.jaw.toastFor * 1000 : 0;
  ctx.after(delay, 'jaw', { token: s.jawToken, open: true, until });
}
function moveJaw(ctx, bone, deg, dur) {
  ensureBone(ctx, bone);
  const sign = axisSign(ctx, ctx.self.id, FOLK.jaw.bone, 'pitch');
  animate(ctx, ctx.self.id, { [`bones.${bone}.pitch`]: +(deg * sign).toFixed(1) }, { duration: dur, easing: 'easeInOutSine' });
}
export function jaw(ctx, { token, open, until = 0 } = {}) {
  const s = ctx.self.state, J = FOLK.jaw;
  if (token !== s.jawToken) return;
  const bone = jawBone(ctx);
  if (!bone) { s.jawMode = null; return; }
  const toast = until > 0;
  if (toast ? ctx.now() >= until : (!s.talking || s.toasting)) {
    moveJaw(ctx, bone, 0, 0.25);
    s.jawMode = null;
    if (toast && s.talking) startJaw(ctx, 'talk', 0.8);
    return;
  }
  if (!toast && alone(ctx)) { ctx.after(span(QUIET.every, ctx), 'jaw', { token, open, until }); return; } // talk jaw idles unseen
  const dur = span(toast ? J.toastStep : J.step, ctx);
  const deg = open ? span(toast ? J.toastOpen : J.open, ctx) : span(J.rest, ctx);
  moveJaw(ctx, bone, deg, dur);
  if (FOLK.debug) ctx.log('jaw', { deg: +deg.toFixed(1), toast });
  let wait = dur + span(J.pause, ctx);
  if (!open && !toast && ctx.random() < J.breath.chance) wait += span(J.breath.span, ctx);
  ctx.after(wait, 'jaw', { token, open: !open, until });
}
// Mead in hand: the toast's vessel rides the right hand bone; fingers switch to the grip for the toast.
function vesselFor(s) { const V = FOLK.vessel, k = V.by[String(s.name || '').toLowerCase()] ?? V.default; return [k, V.items[k] ?? V.items[V.default]]; }
function handBone(ctx) {
  const V = FOLK.vessel, id = ctx.self.id, names = rigOf(ctx, id).names || [], b = boneName(ctx, id, V.bone);
  return names.includes(b) ? b : names.length ? b : V.fallbackBone;
}
function raiseVessel(ctx) {
  const s = ctx.self.state, V = FOLK.vessel, [kind, it] = vesselFor(s);
  dropVessel(ctx);
  s.vessel = ctx.spawn({
    template: 'templates/feast-food.js#food', parent: ctx.self.id, tags: ['folk-vessel'], physics: 'none', castShadow: false, lifetime: (s.toastHold ?? V.lift.hold) + V.lifetime,
    attachment: { bone: handBone(ctx) }, feetPosition: it.feet, rotation: it.rotation, scale: it.scale,
    primitive: { kind: 'scripted', script: 'scripts/gen/feast-food.js', params: it.params }, state: { kind },
  });
  const H = FOLK.hands, clip = s.fingers ? handClip(ctx, H.poses[V.grip]) : null;
  if (clip) ctx.self.anim[H.channel] = { clip, weight: H.weight, loop: 'loop', blendIn: 0.25, mask: { bones: (rigOf(ctx, ctx.self.id).names || []).filter((n) => /(Left|Right)Hand/.test(n)) } };
}
// The lift: the cheer clips barely raise the arm, so the right-arm IK chain carries the hand to the chin for the toast.
// Target = a world point in the body's own frame (rows are static): forward, to its right, up from the feet by headY.
function liftArm(ctx) {
  const s = ctx.self.state, K = FOLK.vessel.lift, f = ctx.self.worldFeetPosition || ctx.self.feetPosition;
  const fw = rotate(ctx.self.rotation, { x: 0, y: 0, z: -1 }), sc = typeof ctx.self.scale === 'number' ? ctx.self.scale : (ctx.self.scale?.y ?? 1);
  const up = (headY(s) + K.chin) * sc, fwd = K.forward * sc, side = K.side * sc;
  const target = { x: +(f.x + fw.x * fwd - fw.z * side).toFixed(3), y: +(f.y + up).toFixed(3), z: +(f.z + fw.z * fwd + fw.x * side).toFixed(3) };
  ctx.self.ik = { ...(ctx.self.ik || {}), rightArm: { target, weight: K.weight, blendIn: K.blendIn } };
}
function lowerArm(ctx) {
  const ik = ctx.self.ik, K = FOLK.vessel.lift;
  if (ik?.rightArm) ctx.self.ik = { ...ik, rightArm: { target: ik.rightArm.target, weight: 0, blendOut: K.blendOut } };
}
function dropVessel(ctx) {
  const s = ctx.self.state;
  if (s.vessel) { try { if (ctx.getObject(s.vessel)) ctx.destroy(s.vessel); } catch (e) {} delete s.vessel; }
}
function toast(ctx, p = {}) {
  const s = ctx.self.state, K = FOLK.vessel.lift;
  if (s.toasting || !s.toast || s.lyre) return;
  s.toasting = true;
  s.toastHold = clamp(+p?.hold || K.hold, 1, K.maxHold); // a press may ask a longer hold (a filmed check); a player's press is the default
  if (s.toastMask) ctx.self.anim.gesture = { clip: s.toast, weight: 8, loop: 'loop', mask: { from: boneName(ctx, ctx.self.id, 'Spine') }, blendIn: 0.4, blendOut: 0.6, duration: s.toastHold };
  else pose(ctx, s.toast, P.toastBlend);
  const v = s.voice || [];
  if (v.length) {
    s.line = ((s.line ?? -1) + 1) % v.length;
    const f = ctx.self.worldFeetPosition || ctx.self.feetPosition;
    ctx.emit('playSound', { clip: v[s.line], position: { x: f.x, y: f.y + 1.3, z: f.z }, volume: 0.9, maxDistance: 14 });
  }
  { const C = FOLK.toastCheer, f = ctx.self.worldFeetPosition || ctx.self.feetPosition; if (C) ctx.emit('playSound', { clip: C.clip, position: { x: f.x, y: f.y + C.lift, z: f.z }, volume: C.volume, maxDistance: C.maxDistance, delay: C.delay, pitch: C.pitch[0] + ctx.random() * (C.pitch[1] - C.pitch[0]) }); }
  raiseVessel(ctx);
  liftArm(ctx);
  startJaw(ctx, 'toast', 0.05); // the mouth opens with the line
  ctx.after(s.toastHold, 'endToast');
}
export function endToast(ctx) {
  const s = ctx.self.state;
  s.toasting = false;
  dropVessel(ctx);
  lowerArm(ctx);
  applyHands(ctx, rigOf(ctx, ctx.self.id).names || [], !!s.fingers); // back to state.handPose
  pose(ctx, s.idle?.[s.at ?? 0] ?? s.idle?.[0], P.toastBlend);
  if (s.talking && s.jawMode !== 'talk' && s.jawMode !== 'toast') startJaw(ctx, 'talk', 0.4);
}

// ── Notice: folk see you arrive and sit. Module memory per folk (no state churn per check); state.noticeTarget on each notice.
const nt = new Map();      // id → { token, until, cool, greetCool, ignore, sat: Map(playerId → seatedOn) }
const rosters = new Map(); // id → { at, list: [{ id, x, z }] } — this folk and its awake neighbours
function startNotice(ctx) {
  const id = ctx.self.id;
  if (nt.has(id)) return;
  const n = { token: ctx.now() + ctx.random(), until: 0, cool: 0, greetCool: 0, ignore: null, sat: new Map() };
  nt.set(id, n);
  ctx.after(0.5 + ctx.random(), 'notice', { token: n.token });
}
function roster(ctx, me) {
  const N = FOLK.notice, id = ctx.self.id, r = rosters.get(id);
  if (r && ctx.now() - r.at < N.rosterEvery * 1000) return r.list;
  const list = [{ id, x: me.x, z: me.z }];
  for (const q of ctx.query({ tags: ['folk'] })) if (q.id !== id && q.state?.name && q.feetPosition && !has(curClip(q.state), L.still)) list.push({ id: q.id, x: q.feetPosition.x, z: q.feetPosition.z });
  rosters.set(id, { at: ctx.now(), list });
  return list;
}
function nearestFolkIsMe(ctx, me, f) {
  let best = Infinity, who = null;
  for (const r of roster(ctx, me)) { const d = Math.hypot(f.x - r.x, f.z - r.z); if (d < best) { best = d; who = r.id; } }
  return who === ctx.self.id;
}
// Target head point → { yaw, pitch } relative to the body, clamped.
function aim(ctx, tgt, maxYaw) {
  const s = ctx.self.state, me = ctx.self.worldFeetPosition || ctx.self.feetPosition;
  const eye = { x: me.x, y: me.y + headY(s), z: me.z };
  const fw = rotate(ctx.self.rotation, { x: 0, y: 0, z: -1 });
  const body = Math.atan2(-fw.x, -fw.z) * 180 / Math.PI;
  const dx = tgt.x - eye.x, dz = tgt.z - eye.z;
  const yaw = clamp(shortestArc(body, Math.atan2(-dx, -dz) * 180 / Math.PI), -maxYaw, maxYaw);
  const pitch = clamp(Math.atan2(tgt.y - eye.y, Math.hypot(dx, dz)) * 180 / Math.PI, -L.maxPitch, L.maxPitch) * L.pitchSign;
  return { yaw, pitch };
}
function headTo(ctx, yaw, pitch, dur, easing) {
  const id = ctx.self.id, to = {};
  // Rate cap: the turn's length (from where the Head bone sits now) stretches the ease so no turn beats L.maxRate deg/s.
  const hb = boneName(ctx, id, 'Head'), hk = L.split.Head || 1, cur = ctx.self.bones?.[hb];
  if (cur) {
    const y0 = (cur.yaw || 0) / (hk * axisSign(ctx, id, 'Head', 'yaw')), p0 = (cur.pitch || 0) / (hk * axisSign(ctx, id, 'Head', 'pitch'));
    dur = Math.max(dur, Math.hypot(yaw - y0, pitch - p0) / L.maxRate);
  }
  for (const [logical, k] of Object.entries(L.split)) {
    const bone = boneName(ctx, id, logical);
    ensureBone(ctx, bone);
    to[`bones.${bone}.yaw`] = +(yaw * k * axisSign(ctx, id, logical, 'yaw')).toFixed(1);
    to[`bones.${bone}.pitch`] = +(pitch * k * axisSign(ctx, id, logical, 'pitch')).toFixed(1);
  }
  animate(ctx, id, to, { duration: dur, easing });
  return to;
}
function greetingFor(ctx, s) {
  const G = FOLK.notice.greetings, m = /voice-(.+?)-saying-/.exec(String((s.voice || [])[0] || ''));
  const lines = m && G[m[1]];
  if (!lines || !lines.length) return null;
  return `/cdn/voice-${m[1]}-saying-${lines[Math.floor(ctx.random() * lines.length)]}.mp3`;
}
export function notice(ctx, { token } = {}) {
  const id = ctx.self.id, n = nt.get(id), N = FOLK.notice;
  if (!n || token !== n.token) return;
  const s = ctx.self.state, now = ctx.now();
  if (has(curClip(s), L.still)) { nt.delete(id); return; } // asleep: no notice chain
  watchArrivals(ctx); if (hushed(ctx)) hush(ctx); // someone is arriving: the talking clip leaves the room's state
  if (n.until && now >= n.until) { // the hold is over: back to ahead
    n.until = 0;
    headTo(ctx, 0, 0, N.back, 'easeInOutSine');
    if (s.noticing) s.noticing = false;
  }
  const me = ctx.self.worldFeetPosition || ctx.self.feetPosition;
  let near = Infinity, walker = null, sitter = null;
  for (const p of ctx.place.players) {
    const f = p.worldFeetPosition || p.feetPosition; if (!f) continue;
    const d = Math.hypot(f.x - me.x, f.z - me.z); if (d < near) near = d;
    const seat = p.state?.seatedOn ?? null, was = n.sat.get(p.id) ?? null;
    if (seat !== was) { if (seat) n.sat.set(p.id, seat); else n.sat.delete(p.id); }
    if (d > N.walkRadius || !nearestFolkIsMe(ctx, me, f)) continue;
    const t = { id: p.id, x: f.x, y: f.y + (seat ? N.seatedEye : L.playerEye), z: f.z, d };
    if (seat && seat !== was && d <= N.sitRadius) { if (!sitter || d < sitter.d) sitter = t; }
    else if (!walker || d < walker.d) walker = t;
  }
  const busy = s.toasting || s.lyre || s.workPause || now - (s.feedAt ?? -1e9) < N.workGrace * 1000;
  let kind = null, tgt = null;
  if (!busy && sitter && now >= n.greetCool) { kind = 'sit'; tgt = sitter; }
  else if (!busy && walker && !n.until && now >= n.cool) { kind = 'walk'; tgt = walker; }
  if (kind) {
    const { yaw, pitch } = aim(ctx, tgt, N.maxYaw);
    const to = headTo(ctx, yaw, pitch, N.ease, N.easing);
    n.until = now + span(N.hold, ctx) * 1000;
    n.cool = now + N.cooldown * 1000;
    n.ignore = tgt.id;
    let spoke = null;
    if (kind === 'sit') {
      n.greetCool = now + N.cooldown * 1000;
      const head = boneName(ctx, id, 'Head'), p0 = to[`bones.${head}.pitch`] ?? 0;
      const dip = +(p0 + (-N.nod.deg) * L.pitchSign * axisSign(ctx, id, 'Head', 'pitch')).toFixed(1);
      animate(ctx, id, { [`bones.${head}.pitch`]: [p0, dip, p0] }, { duration: N.nod.dur, easing: 'easeInOutSine', delay: N.nod.delay });
      if (ctx.random() < N.greetChance) spoke = greetingFor(ctx, s);
      if (spoke) {
        const f = me;
        ctx.emit('playSound', { clip: spoke, position: { x: f.x, y: f.y + headY(s), z: f.z }, volume: 0.9, maxDistance: 12, delay: N.nod.delay });
        startJaw(ctx, 'toast', N.nod.delay);
      }
    }
    s.noticing = true;
    if (FOLK.debug) { s.noticeTarget = { kind, player: tgt.id, x: +tgt.x.toFixed(2), y: +tgt.y.toFixed(2), z: +tgt.z.toFixed(2), yaw: +yaw.toFixed(1), pitch: +pitch.toFixed(1), at: now, ...(spoke ? { said: spoke } : {}) }; ctx.log('notice', s.noticeTarget); } // debug only: no reader, kept off row state (catch-up weight)
  }
  ctx.after(near > N.farRadius && !n.until ? (near > QUIET.radius ? QUIET.noticeIdle : N.idle) : N.every, 'notice', { token });
}
