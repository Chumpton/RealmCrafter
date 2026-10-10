// Every player: what the editor's logic volumes do to you while you stand inside one. Audio beds play on this machine only.
import { VOLS, HAZ, clipUrl, inBox } from './lib/data/ed-logic.js';
export const updateSchedule = { every: { seconds: 0.3 } };
const yawOf = (r) => (typeof r === 'number' ? r : r?.yaw ?? 0);
const sc = (s, k) => (typeof s === 'number' ? s : s?.[k] ?? 1);
export function update(ctx) {
  const me = ctx.self; if (me.isLocal === false) return;
  const S = ctx.session.edl ?? (ctx.session.edl = { in: {}, snd: {}, hz: 0, cam: 0 });
  const f = me.worldFeetPosition ?? me.feetPosition; if (!f) return;
  const rows = ctx.query({ tags: ['ed-vol'], radius: 90, center: f });
  if (!rows.length && !Object.keys(S.in).length) { ctx.sleep(1.5); return; }
  const now = ctx.now(), inside = {}; let zone = null, haz = null;
  const p = { x: f.x, y: f.y + 0.9, z: f.z };
  for (const r of rows) {
    const s = r.state ?? {}; if (!VOLS[s.k]) continue;
    const o = ctx.getObject(r.id); if (!o) continue;
    if (!inBox({ feetPosition: r.feetPosition, yaw: yawOf(o.rotation), sx: sc(o.scale, 'x'), sy: sc(o.scale, 'y'), sz: sc(o.scale, 'z'), w: s.w ?? 4, h: s.h ?? 3, d: s.d ?? 4 }, p)) continue;
    inside[r.id] = 1;
    if (s.k === 'safe') zone = 'safe'; else if (s.k === 'pvp' && zone !== 'safe') zone = 'pvp';
    if (s.k === 'hazard') haz = s;
    if (S.in[r.id]) continue; // already inside: entering fires once per visit
    if (s.k === 'audio' && s.clip) S.snd[r.id] = ctx.spawn({ audience: 'local', scope: 'session', feetPosition: p, audio: { clip: clipUrl(s.clip), gain: Math.max(0, Math.min(1, s.vol ?? 0.4)), loop: true, spatial: false } });
    if (s.k === 'event' && s.text) {
      ctx.emit('skillMsg', { text: String(s.text).slice(0, 160) }, { to: me.id });
      ctx.emit('damageNumber', { position: { x: f.x, y: f.y + 2.4, z: f.z }, text: String(s.text).slice(0, 60), color: '#ffd76a', size: 1.3, lifetime: 3.5 }, { audience: { player: me.id } });
      if (s.cam) { ctx.view.camera = { eye: s.cam, aim: { x: f.x, y: f.y + 1.4, z: f.z } }; S.cam = now + 3200; }
    }
  }
  for (const id of Object.keys(S.in)) if (!inside[id] && S.snd[id]) { ctx.destroy(S.snd[id]); delete S.snd[id]; }
  S.in = inside;
  if (S.cam && now > S.cam) { ctx.view.camera = null; S.cam = 0; }
  if ((me.state.zone ?? null) !== zone) me.state.zone = zone;
  if (haz && now >= S.hz) { S.hz = now + 1000; const dmg = Math.max(1, Math.round(haz.dps ?? 1));
    ctx.emit('monsterHit', { dmg, style: 'hazard', hazard: haz.hz ?? 'lava' }, { to: me.id });
    ctx.emit('damageNumber', { position: { x: f.x, y: f.y + 2, z: f.z }, text: `${HAZ[haz.hz]?.icon ?? '☠'} -${dmg}`, color: HAZ[haz.hz]?.col ?? '#c084fc', lifetime: 0.9 }, { audience: { player: me.id } }); }
}
