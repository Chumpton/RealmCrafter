// Chess piece + hand motion (lane 6). The referee calls animateMove(ctx, move) → seconds until the mover is back at rest,
// thinkPose(ctx, who, on) on think start/end, restPose(ctx, who). Everything is scheduled at once as per-segment tweens
// (builtin/tween), so no timers ride the caller: the hand (rightArm IK target + weight), the lean (additive bones via
// rig-names), the fingers (FOLK grip as an additive layer) and the piece (feetPosition, scale) share one timeline.
// Targets come only from squareWorld(); numbers live in CHESS.motion (scripts/lib/data/chess.js).
import { CHESS, squareWorld } from './data/chess.js';
import { FOLK } from './data/folk-life.js';
import { animate } from 'builtin/tween';
import { rotate } from 'builtin/vec3';
import { boneName, poseAddresses } from './rig-names.js';

const r4 = (v) => Math.round(v * 10000) / 10000;
const MIN = 0.001;
class Track { // one scalar's segment list, all tracks start at t = 0
  constructor(v) { this.v = v; this.s = []; this.t = 0; }
  to(v, d, e = 'easeInOutSine') { d = Math.max(MIN, d); this.s.push({ value: r4(v), duration: d, easing: e }); this.v = v; this.t += d; return this; }
  hold(d) { return this.to(this.v, d, 'linear'); }
  at(t) { if (t > this.t + 1e-4) this.hold(t - this.t); return this; }
}
class V3 {
  constructor(p) { this.x = new Track(p.x); this.y = new Track(p.y); this.z = new Track(p.z); }
  get v() { return { x: this.x.v, y: this.y.v, z: this.z.v }; }
  get t() { return this.x.t; }
  to(p, d, e, ey) { this.x.to(p.x, d, e); this.z.to(p.z, d, e); this.y.to(p.y, d, ey ?? e); return this; }
  hold(d) { this.x.hold(d); this.y.hold(d); this.z.hold(d); return this; }
  at(t) { this.x.at(t); this.y.at(t); this.z.at(t); return this; }
  arc(p, d, peak, e = 'easeInOutSine') { // x/z eased, y rises to peak (absolute) then falls onto p.y
    this.x.to(p.x, d, e); this.z.to(p.z, d, e); this.y.to(peak, d / 2, 'easeOutSine').to(p.y, d / 2, 'easeInSine'); return this;
  }
}
const keys = (prefix, tr, T, out) => { tr.at(T); if (tr.s.length) out[prefix] = tr.s; };

function player(ctx, who) {
  const P = CHESS.players[who], o = P && ctx.getObject(P.id);
  if (!o) return null;
  const f = o.worldFeetPosition || o.feetPosition, w = rotate(o.rotation, { x: 0, y: 0, z: -1 }), n = Math.hypot(w.x, w.z) || 1;
  const fw = { x: w.x / n, z: w.z / n }, sc = typeof o.scale === 'number' ? o.scale : (o.scale?.y ?? 1);
  const at = (b) => ({ x: r4(f.x + (fw.x * b.fwd - fw.z * b.side) * sc), y: r4(f.y + b.up * sc), z: r4(f.z + (fw.z * b.fwd + fw.x * b.side) * sc) });
  return { o, id: P.id, who, f, fw, sc, at, right: { x: -fw.z, z: fw.x } };
}
// logical bones → real names; missing entries get a zero so a tween has a value to start from
function ensureBones(ctx, p, logical) {
  const cur = p.o.bones || {}, add = {};
  for (const l of logical) { const b = boneName(ctx, p.id, l); if (!cur[b]) add[b] = { pitch: 0, yaw: 0, roll: 0 }; }
  if (Object.keys(add).length) p.o.bones = { ...cur, ...add };
}
function relaxedHands(ctx, p) {
  const H = FOLK.hands, clip = H.poses.relaxed;
  if (p.o.anim?.[H.channel]?.clip === clip) return;
  let names = []; try { names = ctx.getObjectBoneNames(p.id) || []; } catch (e) {}
  const mask = names.filter((n) => /(Left|Right)Hand/.test(n));
  if (mask.length) p.o.anim[H.channel] = { clip, weight: H.weight, loop: 'loop', blendIn: 0.25, mask: { bones: mask } };
}
function fingerPose(side, k) { // the grip layer at strength k (0 open … 1 gripped)
  const F = CHESS.motion.fingers, pose = {};
  for (const [f, d] of Object.entries(F)) if (f !== 'thumbPitch') pose[`${side}Hand${f}`] = { roll: d * k };
  pose[`${side}HandThumb1`].pitch = F.thumbPitch * k;
  return pose;
}
function armSpec(p, spec) { return spec ? { target: p.at(spec.at), weight: spec.weight } : null; }
function ensureArm(p, chain, target) {
  const ik = p.o.ik || {};
  if (!ik[chain]) p.o.ik = { ...ik, [chain]: { target, weight: 0, blendIn: MIN, blendOut: MIN } };
}
// tween a pose { bones, rightArm, leftArm } in `d` seconds
function tweenPose(ctx, p, pose, d) {
  const kf = {};
  if (pose.bones) { ensureBones(ctx, p, Object.keys(pose.bones)); Object.assign(kf, poseAddresses(ctx, p.id, pose.bones)); }
  for (const chain of ['rightArm', 'leftArm']) {
    const a = armSpec(p, pose[chain]), cur = p.o.ik?.[chain];
    if (a) {
      ensureArm(p, chain, cur?.target?.x != null ? cur.target : a.target);
      Object.assign(kf, { [`ik.${chain}.target.x`]: a.target.x, [`ik.${chain}.target.y`]: a.target.y, [`ik.${chain}.target.z`]: a.target.z, [`ik.${chain}.weight`]: a.weight });
    } else if (cur) kf[`ik.${chain}.weight`] = 0;
  }
  if (Object.keys(kf).length) animate(ctx, p.o, kf, { duration: d, easing: 'easeInOutSine' });
}
function mead(ctx, p, on) {
  const K = CHESS.motion.mead, id = `${p.id}/${K.id}`, have = !!ctx.getObject(id);
  if (on && !have) {
    ctx.spawn(K.id, { template: 'templates/feast-food.js#food', parent: p.id, tags: ['chess-mead'], physics: 'none', castShadow: false,
      attachment: { bone: boneName(ctx, p.id, K.bone) }, feetPosition: K.feet, rotation: K.rotation, scale: K.scale,
      primitive: { kind: 'scripted', script: 'scripts/gen/feast-food.js', params: K.params }, state: { kind: 'mug' } });
  } else if (!on && have) ctx.destroy(id);
}
function poseOf(who, name) { return CHESS.motion.people[who]?.[name] ?? {}; }

export function restPose(ctx, who) {
  const p = player(ctx, who); if (!p) return 0;
  const R = poseOf(who, 'rest'), M = CHESS.motion;
  relaxedHands(ctx, p);
  mead(ctx, p, !!R.mead);
  tweenPose(ctx, p, { ...R, bones: { ...R.bones, ...fingerPose('Right', 0), ...(R.mead ? fingerPose('Left', 1) : {}) } }, M.restIn);
  return M.restIn;
}

export function animateMove(ctx, move) { return plan(ctx, move, true).total; }

function plan(ctx, move, run) {
  const { mover, pieceId, from, to, captureId = null, castleRook = null, promotion = null, whiteSeat = 'low' } = move;
  const M = CHESS.motion, T = CHESS.tempo, p = player(ctx, mover), board = ctx.getObject(CHESS.board.id);
  const piece = ctx.getObject(pieceId);
  const times = { grips: [], lands: [], captureLand: null, total: 0 };
  const A = squareWorld(from, whiteSeat), B = squareWorld(to, whiteSeat);
  const handOf = (pt, up) => ({ x: pt.x - (p ? p.fw.x : 0) * M.hand.back, y: pt.y + up, z: pt.z - (p ? p.fw.z : 0) * M.hand.back });
  const dist = (pt) => p ? Math.hypot(pt.x - p.f.x, pt.z - p.f.z) : 0;
  const leanAt = (pt) => { const L = M.lean; return Math.min(L.max, Math.max(L.base, L.base + L.perM * (dist(pt) - L.near))); };
  const rest = poseOf(mover, 'rest');
  // tracks
  const restHand = p ? (armSpec(p, rest.rightArm)?.target ?? p.at({ fwd: 0.35, side: 0.15, up: CHESS.board.topY - p.f.y + 0.08 })) : A;
  const cur = p?.o.ik?.rightArm, startHand = cur?.target?.x != null ? cur.target : restHand;
  const H = new V3(startHand), W = new Track(cur?.weight ?? 0), G = new Track(0);
  const lean = new Track(0), low = new Track(0), head = new Track(0);
  const pieces = new Map(); // id → { tr: V3, sc: {x,y,z tracks}, base }
  const pc = (id, start) => {
    if (!pieces.has(id)) { const o = ctx.getObject(id), s = o?.scale, b = typeof s === 'number' ? { x: s, y: s, z: s } : { x: s?.x ?? 1, y: s?.y ?? 1, z: s?.z ?? 1 };
      pieces.set(id, { tr: new V3(start), sc: { x: new Track(b.x), y: new Track(b.y), z: new Track(b.z) }, base: b, o }); }
    return pieces.get(id);
  };
  // what stands on the board while this move plays: every uncaptured piece at its square (the referee has already moved
  // the mover's state to `to`, so it is put back at A until its carry), the taken piece left out (it goes first)
  const standing = [];
  for (let i = 0; i < 32; i++) {
    const id = CHESS.pieceIds + i; if (id === captureId) continue;
    const o = ctx.getObject(id), st = o?.state; if (!st || st.captured || !st.sq) continue;
    const at = id === pieceId ? A : squareWorld(st.sq, whiteSeat);
    standing.push({ id, x: at.x, z: at.z, h: M.heights?.[st.kind] ?? 0.075 });
  }
  const moved = (id, pt) => { const s = standing.find((q) => q.id === id); if (s) { s.x = pt.x; s.z = pt.z; } };
  const clearOver = (a, b, skip) => { // lift a piece needs to pass a→b over what stands near the path (0 = nothing in the way)
    const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1e-9; let h = 0;
    for (const s of standing) {
      if (s.id === skip) continue;
      const t = Math.max(0, Math.min(1, ((s.x - a.x) * dx + (s.z - a.z) * dz) / L2));
      if (Math.hypot(a.x + dx * t - s.x, a.z + dz * t - s.z) < M.pathR) h = Math.max(h, s.h);
    }
    return h ? h + M.clear : 0;
  };
  const sync = (t) => { for (const tr of [H, W, G, lean, low, head]) tr.at(t); for (const q of pieces.values()) { q.tr.at(t); q.sc.x.at(t); q.sc.y.at(t); q.sc.z.at(t); } };
  const setLean = (pt, d) => { const l = leanAt(pt); lean.to(l, d); low.to(l * M.lean.lowerShare, d); head.to(M.lean.head, d); };
  const reach = (pt, d) => { // hand over pt, then down onto it
    const t0 = H.t; setLean(pt, d * 0.85); W.to(1, d * 0.6);
    H.to(handOf(pt, M.hand.hover), d * M.reachSplit, 'easeInOutSine').to(handOf(pt, M.hand.grip), d * (1 - M.reachSplit), 'easeOutQuad');
    sync(t0 + d);
  };
  const grip = () => { const t0 = H.t; G.to(1, M.gripT, 'easeOutQuad'); sync(t0 + M.gripT); times.grips.push(r4(t0)); };
  const release = () => { const t0 = H.t; G.to(0, M.releaseT, 'easeOutQuad'); H.to(handOf(H.v, M.hand.hover - M.hand.grip), M.releaseT, 'easeOutQuad'); sync(t0 + M.releaseT); };
  const squash = (q, t) => { q.sc.x.at(t); q.sc.y.at(t); q.sc.z.at(t); const b = q.base, S = M.squash;
    q.sc.y.to(b.y * S.y, S.down, 'easeOutQuad').to(b.y, S.up, 'easeOutBack'); q.sc.x.to(b.x * S.xz, S.down, 'easeOutQuad').to(b.x, S.up, 'easeOutBack'); q.sc.z.to(b.z * S.xz, S.down, 'easeOutQuad').to(b.z, S.up, 'easeOutBack'); };
  const carry = (id, a, b, kind) => { // piece + hand together: lift, arc, set down, squash
    const q = pc(id, a), d = T.carry, S = M.split, t0 = H.t; q.tr.at(t0);
    const liftH = Math.max(M.lift, clearOver(a, b, id));
    const span = Math.hypot(b.x - a.x, b.z - a.z), peak = a.y + liftH + M.arc + M.arcPerM * span + (kind === 'n' ? M.knightArc : 0);
    const lifted = { x: a.x, y: a.y + liftH, z: a.z }, over = { x: b.x, y: b.y + M.lift, z: b.z };
    q.tr.to(lifted, d * S.lift, 'easeOutQuad').arc(over, d * S.travel, Math.max(peak, over.y)).to(b, d * S.set, 'easeInQuad');
    H.to(handOf(lifted, M.hand.grip), d * S.lift, 'easeOutQuad').arc(handOf(over, M.hand.grip), d * S.travel, Math.max(peak, over.y) + M.hand.grip).to(handOf(b, M.hand.grip), d * S.set, 'easeInQuad');
    setLean(b, d * 0.8); sync(t0 + d); times.lands.push(r4(H.t)); squash(q, H.t); moved(id, b);
  };
  // 1 · a capture: grip the taken piece, flick it to the capturer's rail
  if (captureId) {
    const cap = ctx.getObject(captureId), csq = cap?.state?.sq;
    const C = csq ? squareWorld(csq, whiteSeat) : (cap?.feetPosition ?? B);
    const moverWhite = CHESS.players[mover]?.seat === whiteSeat, side = cap?.state?.side ?? (moverWhite ? 'b' : 'w');
    const R = M.rail, sgn = p ? (p.right.z >= 0 ? 1 : -1) : 1, fx = p ? (p.fw.x >= 0 ? 1 : -1) : 1;
    let idx = 0;
    if (board) { const ch = board.state.chess || {}, rail = { w: 0, b: 0, ...(ch.rail || {}) }; idx = rail[side]; if (run) { rail[side] = idx + 1; if (board.state.chess) board.state.chess.rail = rail; else board.state.chess = { rail }; } }
    idx = Math.min(idx, R.perRow * 2 - 1);
    const col = idx % R.perRow, row = Math.floor(idx / R.perRow), cz = CHESS.board.center;
    const dst = { x: r4(cz.x + fx * (-R.start + col * R.step)), y: r4(CHESS.board.topY + (row ? R.rowDy ?? R.dy : R.dy)), z: r4(cz.z + sgn * (R.dz + row * R.row)) };
    reach(C, T.reach); grip();
    const q = pc(captureId, C), F = M.flick, t0 = H.t; q.tr.at(t0);
    const up = { x: C.x, y: C.y + Math.max(F.lift, clearOver(C, dst, captureId)), z: C.z };
    q.tr.to(up, F.liftT, 'easeOutQuad').arc(dst, F.time, Math.max(up.y, dst.y) + F.arc, 'easeOutQuad').to({ ...dst, y: dst.y + F.hop }, F.hopT / 2, 'easeOutQuad').to(dst, F.hopT / 2, 'easeInQuad');
    times.captureLand = r4(t0 + F.liftT + F.time);
    const dir = { x: dst.x - C.x, z: dst.z - C.z }, n = Math.hypot(dir.x, dir.z) || 1;
    H.to({ x: H.v.x + dir.x / n * F.hand, y: H.v.y + F.lift, z: H.v.z + dir.z / n * F.hand }, F.handT, 'easeOutQuad');
    G.to(0, F.handT, 'easeOutQuad'); sync(t0 + F.handT);
    reach(A, M.between);
  } else reach(A, T.reach);
  // 2 · the move itself
  grip(); carry(pieceId, A, B, piece?.state?.kind); release();
  // 3 · promotion: the pawn is raised and set down as its new piece (the referee swaps kind at times.lands[0])
  if (promotion) {
    const q = pc(pieceId, B), P = M.promo, t0 = H.t; q.tr.at(t0);
    q.tr.to({ ...B, y: B.y + P.lift }, P.up, 'easeOutQuad').hold(P.pulseT).to(B, P.down, 'easeInQuad');
    for (const ax of ['x', 'y', 'z']) { q.sc[ax].at(t0 + P.up); q.sc[ax].to(q.base[ax] * P.pulse, P.pulseT / 2, 'easeOutQuad').to(q.base[ax], P.pulseT / 2, 'easeOutBack'); }
    sync(t0 + P.up + P.pulseT + P.down); times.lands.push(r4(H.t));
  }
  // 4 · castling: the rook follows the king
  if (castleRook) {
    const RA = squareWorld(castleRook.from, whiteSeat), RB = squareWorld(castleRook.to, whiteSeat);
    reach(RA, M.between); grip(); carry(castleRook.pieceId, RA, RB, 'r'); release();
  }
  // 5 · settle back to the rest pose
  { const t0 = H.t, d = T.settle, ra = armSpec(p ?? { at: () => restHand }, rest.rightArm);
    H.to(ra?.target ?? restHand, d, 'easeInOutSine'); W.to(ra?.weight ?? 0, d * 0.9, 'easeInOutSine');
    const rb = rest.bones || {}; lean.to(rb.Spine1?.pitch ?? 0, d); low.to(rb.Spine?.pitch ?? 0, d); head.to(rb.Head?.pitch ?? 0, d);
    sync(t0 + d); }
  const total = r4(H.t); times.total = total;
  if (!run) return times;
  // ── run: one program per body
  for (const [id, q] of pieces) {
    if (!q.o) continue;
    const kf = {}; keys('feetPosition.x', q.tr.x, total, kf); keys('feetPosition.y', q.tr.y, total, kf); keys('feetPosition.z', q.tr.z, total, kf);
    keys('scale.x', q.sc.x, total, kf); keys('scale.y', q.sc.y, total, kf); keys('scale.z', q.sc.z, total, kf);
    animate(ctx, q.o, kf, { duration: total });
  }
  if (p) {
    relaxedHands(ctx, p);
    ensureBones(ctx, p, ['Spine1', 'Spine', 'Head', ...Object.keys(fingerPose('Right', 1))]);
    ensureArm(p, 'rightArm', startHand);
    const kf = {};
    keys('ik.rightArm.target.x', H.x, total, kf); keys('ik.rightArm.target.y', H.y, total, kf); keys('ik.rightArm.target.z', H.z, total, kf);
    keys('ik.rightArm.weight', W, total, kf);
    const bone = (l, ax) => `bones.${boneName(ctx, p.id, l)}.${ax}`;
    keys(bone('Spine1', 'pitch'), lean, total, kf); keys(bone('Spine', 'pitch'), low, total, kf); keys(bone('Head', 'pitch'), head, total, kf);
    for (const [l, axes] of Object.entries(fingerPose('Right', 1))) for (const [ax, full] of Object.entries(axes)) {
      const tr = new Track(0); for (const s of G.s) tr.to(s.value * full, s.duration, s.easing); keys(bone(l, ax), tr, total, kf);
    }
    animate(ctx, p.o, kf, { duration: total });
  }
  return times;
}
