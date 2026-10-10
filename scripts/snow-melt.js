// S4 MELT + DRIPS + D20 SHORE ICE (lane S4, 2026-09-29). One behavior on the 'snow-melt' root steps its children:
// ice-s / ice-n (icicles per eave, scale.y = length), tip-* (branch/vane drip riders), shore-ice (lake-edge plate).
// Reads place.state.snow {on,temp,depth,crust,arc} (W1 owns it, never written here). Off = everything hidden, one sleep.
// Test: while wxForce.winter === 1, this row's state.probe {temp,depth,crust,lakeIce} stands in for snow (never otherwise).
import { SNOW } from './lib/data/snow.js';
import { animate } from 'builtin/tween';
const M = SNOW.dripIce, I = M.ice, L = M.lake, D = M.drip, RANGE = SNOW.budget.fxRange, HOUR = SNOW.GH_MS;
const FX = 'scripts/effects-snow-drip.fx.js', SHORE = 'scripts/gen/snow-shore-ice.js';
const c01 = (v) => Math.max(0, Math.min(1, v)), q = (v, s) => Math.round(v / s) * s;
export const updateSchedule = { every: { seconds: M.tickS } };
let lastAt = null, acc = null; // unquantized growth, this machine only; seeded from the row's quantized state

function live(ctx) {
  const s = ctx.place.state.snow, f = ctx.place.state.wxForce, p = ctx.self.state.probe;
  if (f?.winter === 1 && p) return { ...(s || {}), ...p, on: true };
  return s?.on ? s : null;
}
const row = (ctx, id) => ctx.getObject('snow-melt/' + id);

export function update(ctx) {
  const st = ctx.self.state, s = live(ctx);
  if (!s) { if (st.lit) off(ctx); lastAt = null; acc = null; ctx.sleep(M.idleS); return; }
  const now = ctx.now(), hrs = lastAt == null ? 0 : Math.min(0.5, (now - lastAt) / HOUR); lastAt = now;
  if (!acc) acc = { len: st.ice || 0, t: st.lake?.t || 0 };
  const temp = s.temp ?? 0, depth = s.depth ?? 0, crust = s.crust ?? 0;
  if (!st.lit) st.lit = true;
  if (temp > 0 && depth > I.minDepth && !st.thaw) st.thaw = true; // meltwater has run: the next freeze grows icicles
  // icicles: a freeze after a thaw (or a crusting night) grows them; warmth shortens them; gone = dissolve
  const feed = st.thaw ? Math.max(crust, 0.5) : crust;
  if (temp < I.freezeC && depth > I.minDepth && (st.thaw || crust > I.crustFrom))
    acc.len = Math.min(I.maxLen * (0.35 + 0.65 * feed), acc.len + I.grow * (0.3 + feed) * c01(0.3 - temp / 4) * hrs);
  else if (temp > I.thawC) acc.len = Math.max(0, acc.len - I.melt * temp * hrs);
  setIce(ctx, q(acc.len, I.step));
  // shore ice: grows below freezing up to the arc's lakeIce, thins above it; walkable once thick
  const li = c01(typeof s.arc?.lakeIce === 'number' ? s.arc.lakeIce : s.arc?.lakeIce === true ? 1 : -temp / 8);
  if (temp < 0) acc.t = Math.min(L.maxT * li, acc.t + L.grow * -temp * hrs);
  else acc.t = Math.max(0, acc.t - L.melt * (temp + 0.5) * hrs);
  setLake(ctx, q(L.maxW * li * c01(acc.t / (L.maxT * 0.5)), L.stepW), q(acc.t, L.stepT));
  // drips: roof/branch snow melting, or icicles melting; only anchors within fxRange of a player
  const k = temp > 0 ? q(c01(temp / D.warmC) * c01(depth / 0.05 + acc.len), D.step) : 0;
  const ps = ctx.place.players.map((p) => p.feetPosition);
  for (const e of M.eaves) {
    const near = ps.some((p) => Math.hypot(Math.max(0, Math.abs(p.x - e.x) - e.half), p.z - e.z) <= RANGE);
    const kk = near && (depth > D.minDepth || acc.len > I.show) ? k : 0;
    setFx(ctx, e.id, kk, { kind: 'line', half: e.half, y0: -Math.round(acc.len * 70) / 100 });
  }
  for (const t of M.tips) {
    const near = ps.some((p) => Math.hypot(p.x - t.x, p.z - t.z) <= RANGE);
    const kk = near && depth > D.minDepth ? q(k * D.tip, 0.05) : 0;
    setFx(ctx, t.id, kk, { kind: 'disc', r: t.r, h0: t.vane ? 0 : +(t.h * 0.45).toFixed(2), h1: t.vane ? 0.1 : +(t.h * 0.8).toFixed(2) });
  }
}

function setFx(ctx, id, k, params) {
  const r = row(ctx, id); if (!r) return;
  const key = k > 0 ? JSON.stringify({ k, ...params }) : '';
  if ((r.state?.fk ?? '') === key) return;
  r.state = { ...(r.state || {}), fk: key };
  r.fx = k > 0 ? { script: FX, params: { k, ...params } } : null;
}
function setIce(ctx, len) {
  const st = ctx.self.state, was = st.ice || 0; if (was === len) return; st.ice = len;
  for (const e of M.eaves) {
    const r = row(ctx, e.id); if (!r) continue;
    if (len >= I.show) { r.scale = { x: 1, y: len, z: 1 }; if (was < I.show) { r.material = { pbr: true, dissolve: 0 }; r.visible = true; } }
    else if (was >= I.show) animate(ctx, r, { 'material.dissolve': 1 }, { duration: I.dissolveS });
  }
  if (len < I.show && was >= I.show) ctx.after(I.dissolveS + 0.2, 'hideIce');
}
export function hideIce(ctx) {
  if ((ctx.self.state.ice || 0) >= I.show) return;
  for (const e of M.eaves) { const r = row(ctx, e.id); if (r) r.visible = false; }
}
function setLake(ctx, w, t) {
  const st = ctx.self.state, o = st.lake || { w: 0, t: 0 }; if (o.w === w && o.t === t) return;
  st.lake = { w, t };
  const r = row(ctx, 'shore-ice'); if (!r) return;
  const show = w >= L.stepW;
  if (show) r.primitive = { kind: 'scripted', script: SHORE, params: { pts: L.shore, w, t: Math.max(0.02, t), y: L.y, land: L.land } };
  r.visible = show;
  const walk = show && t >= L.walkT, was = !!(o.w >= L.stepW && o.t >= L.walkT);
  if (walk !== was) r.physics = walk ? 'static' : 'none';
}
function off(ctx) {
  const st = ctx.self.state;
  for (const e of M.eaves) setFx(ctx, e.id, 0);
  for (const t of M.tips) setFx(ctx, t.id, 0);
  setIce(ctx, 0); setLake(ctx, 0, 0);
  const r = row(ctx, 'shore-ice'); if (r) { r.visible = false; r.physics = 'none'; }
  st.lit = false; st.thaw = false;
}
