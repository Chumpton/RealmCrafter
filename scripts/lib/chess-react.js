// Chess reactions — sound and small fx for the north bench. The match referee calls react(ctx, event, data) with the board row's ctx.
// Events: think {who} · move {who,to,words} · capture {who,to,words} · check {who} · mate {winner,loser} · draw {} · reset {}.
// Everything plays at the square / board / player's head, maxDistance 10, never a camera shake. Folk within 12 m toast on mate
// through their facade's exported ears.press (scripts/folk-life.js) — emitted, never imported.
import { CHESS, squareWorld } from './data/chess.js';

const S = CHESS.sounds, B = CHESS.board, R = 10;
const pr = (ctx) => 0.95 + ctx.random() * 0.1;
const pick = (ctx, a) => a[Math.floor(ctx.random() * a.length) % a.length];
const voice = (who, slug) => `/cdn/${S.voice[who]}-saying-${slug}.mp3`;
function key(w) { // 'gunnar' | 'sigrid' from a key, a name or a row id
  const t = String(w ?? '').toLowerCase();
  for (const [k, p] of Object.entries(CHESS.players)) if (t === k || t === p.name.toLowerCase() || t === p.id) return k;
  return null;
}
const boardTop = () => ({ x: B.center.x, y: B.topY + 0.05, z: B.center.z });
function square(ctx, sq) {
  if (typeof sq !== 'string' || !/^[a-h][1-8]$/.test(sq)) return boardTop();
  const ws = ctx.getObject(B.id)?.state?.chess?.whiteSeat ?? 'low';
  const p = squareWorld(sq, ws); return { x: p.x, y: p.y + 0.02, z: p.z };
}
function head(ctx, who) {
  const o = who && ctx.getObject(CHESS.players[who].id), f = o && (o.worldFeetPosition || o.feetPosition);
  return f ? { x: f.x, y: f.y + 0.75, z: f.z } : boardTop(); // seated feet sit at bench height; the head ~0.75 m over them
}
function play(ctx, clip, position, volume, extra) {
  if (clip) ctx.emit('playSound', { clip, position, volume, maxDistance: R, pitch: pr(ctx), ...extra });
}

const DUST = `fx
pop dust burst=5..8 on=disc(.02) life=.5..0.9 v=up(.15..0.35)+sdir()*(.08..0.18) size=.025..0.05 acc=buoy(.2)+drag(2.2) col=<.62,.52,.4> a=0>.12:.45>.6:.2>0 sz=$size*(.6>2.2) rot=spin(.2) r=sprite(smoke-puff,alpha)
pop grit burst=3..5 on=point() life=.25..0.45 v=up(.35..0.6)+sdir()*(.15..0.3) size=.006..0.012 acc=grav()+drag(.6) col=<.55,.44,.32> a=1>.7:1>0 sz=$size floor=die r=sprite(grain,alpha)`;
const WARM = `fx
pop motes burst=26..36 on=disc(.28) life=1.4..2.4 v=up(.25..0.6)+sdir()*(.05..0.15) size=.012..0.028 acc=curl(.6)*.4+buoy(.15)+drag(1.1) col=hdr(3.2,2,.7)>.6:hdr(2,.9,.25) a=(0>.15:1>.7:.8>0)*flick(5,.3) sz=$size r=sprite(mote,add)
pop glow burst=1 at=point().c(.2) life=1.6 g=1>.3:.8>0 r=light(<1,.72,.38>,$g*2.4,3)`;

const H = {
  think({ ctx, who }) {
    if (ctx.random() < 0.55) play(ctx, S.hmm, head(ctx, who), who === 'gunnar' ? 0.3 : 0.4, { mode: 'restart' });
  },
  move({ ctx, data }) { play(ctx, S.clack, square(ctx, data.to), 0.55); },
  capture({ ctx, data }) {
    const at = square(ctx, data.to);
    play(ctx, S.clack, at, 0.5);
    play(ctx, S.capture, at, 0.7, { delay: 0.04 });
    ctx.emit('fx', { position: at, script: DUST });
  },
  check({ ctx, who }) {
    play(ctx, S.check, boardTop(), 0.6, { delay: 0.25 });
    if (who) play(ctx, voice(who, pick(ctx, S.lines[who].check)), head(ctx, who), 0.7, { delay: 0.6, bus: 'Voice', mode: 'restart' });
  },
  mate({ ctx, data }) {
    const win = key(data.winner), lose = key(data.loser) ?? (win === 'gunnar' ? 'sigrid' : win === 'sigrid' ? 'gunnar' : null);
    const loserSpeaks = lose && ctx.random() < 0.5, who = loserSpeaks ? lose : win;
    if (who) play(ctx, voice(who, S.lines[who][loserSpeaks ? 'lose' : 'win'][0]), head(ctx, who), 0.8, { delay: 0.3, bus: 'Voice', mode: 'restart' });
    play(ctx, S.mate, boardTop(), 0.55, { delay: 1.4 });
    const top = boardTop();
    ctx.emit('fx', { position: top, script: WARM });
    if (win) ctx.emit('damageNumber', { position: { x: top.x, y: top.y + 0.55, z: top.z }, text: `${CHESS.players[win].name} wins`, color: '#f2c14e', size: 1.2, lifetime: 3.5 });
    toastFolk(ctx);
  },
  draw({ ctx }) {
    const top = boardTop();
    play(ctx, S.draw, top, 0.45);
    ctx.emit('damageNumber', { position: { x: top.x, y: top.y + 0.55, z: top.z }, text: 'Draw', color: '#e8dcc0', size: 1, lifetime: 3 });
  },
  reset({ ctx }) { play(ctx, S.reset, boardTop(), 0.55); },
};

function toastFolk(ctx) { // the facade exports ears.press → core toast; nearest few with a toast clip raise their mead
  const rows = ctx.query({ tags: ['folk'], center: boardTop(), radius: 12 })
    .filter((r) => r.state?.toast && !r.state?.toasting)
    .map((r) => ({ id: r.id, d: Math.hypot(r.feetPosition.x - B.center.x, r.feetPosition.z - B.center.z) }))
    .sort((a, b) => a.d - b.d).slice(0, 4);
  for (const r of rows) ctx.emit('press', { by: 'chess-mate', hold: 2.5 + ctx.random() * 1.5 }, { to: r.id });
  return rows.length;
}

export function react(ctx, event, data = {}) {
  const h = H[event];
  if (!h) { ctx.log('chess-react: unknown event', { event }); return false; }
  try { h({ ctx, data: data || {}, who: key(data?.who) }); return true; }
  catch (e) { ctx.log('chess-react error', { event, error: String(e?.message ?? e) }); return false; }
}
