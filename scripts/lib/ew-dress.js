// Emberwood design pass: lays the rows of scripts/lib/data/emberwood-dress.json. Run from a run_script (place zone-autumn).
import D from "./data/emberwood-dress.json";
const SMOKE = `fx
pop smoke rate=flick(.3,.3)*5 on=disc(.25).c(.8) life=3..5 v=up(.5..0.9) size=.35..0.6 acc=buoy(.3)+curl(.3)*.4+drag(.6)+wind()*.15 sz=$size*(.6>3) col=<.42,.38,.36>><.3,.29,.3> a=0>.2:.28>.7:.18>0 rot=spin(.08) r=sprite(smoke-puff,alpha)
pop ember rate=1.5 on=disc(.2).c(.85) life=.8..1.4 v=up(1..1.6)+cone(30)*.3 size=.02..0.035 acc=curl(.6) col=hdr(4,1.8,.4) a=(1>0)*flick(9,.4) sz=$size r=sprite(ember,add)`;
const TREES = ["kalidar-tree01", "kalidar-tree02", "kalidar-tree03", "kalidar-tree04", "kalidar-tree05", "kalidar-tree03"];
const BUSH = ["kalidar-bush01", "kalidar-bush02", "kalidar-bush03", "kalidar-bush04", "bush-mushroom01", "bush-mushroom02"];
function proto(ctx, key) {
  const row = ctx.query({}).find((o) => o.id.replace(/^ew-(r-)?/, "").replace(/[-_]?\d+$/, "") === key);
  const g = row && ctx.getObject(row.id);
  if (!g) return null;
  return { model: g.model, scale: g.scale, physics: g.physics, visibleRange: g.visibleRange, layout: g.layout, castShadow: g.castShadow, primitive: g.model ? undefined : g.primitive, material: g.model ? undefined : g.material, sink: row.feetPosition.y - ctx.place.terrain.heightAt(row.feetPosition.x, row.feetPosition.z) };
}
function roadDist(ctx, x, z) {
  let best = 1e9;
  for (const m of Object.values(ctx.place.terrain.marks || {})) {
    if (m.kind !== "path" && m.kind !== "road") continue;
    const p = m.points || [];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz) - m.width / 2);
    }
  }
  return best;
}
function put(ctx, id, p, x, z, yaw, extra = {}) {
  const sink = Math.min(0, Math.max(-0.6, p.sink ?? 0));
  const spec = { ...p, ...extra, tags: ["ew-dress"], feetPosition: { x, z, y: { terrain: sink } }, rotation: { yaw } };
  delete spec.sink;
  for (const k of Object.keys(spec)) if (spec[k] === undefined || spec[k] === null) delete spec[k];
  return ctx.spawn(id, spec);
}
export function dressGroves(ctx, from, to) {
  const P = {}; const got = (k) => (P[k] ??= proto(ctx, k));
  let n = 0;
  D.groves.slice(from, to).forEach((g, gi) => {
    const gid = from + gi;
    for (let i = 0; i < g.trees; i++) {
      const a = (i / g.trees) * 6.283 + ctx.random(), r = g.r * (0.3 + ctx.random() * 0.7);
      const x = g.c[0] + Math.cos(a) * r, z = g.c[1] + Math.sin(a) * r;
      if (roadDist(ctx, x, z) < 5) continue;
      const t = got(TREES[(i + gid) % TREES.length]); if (t) { put(ctx, `ewd-g${gid}-t${i}`, t, x, z, ctx.random() * 360); n++; }
      const b = got(BUSH[(i * 3 + gid) % BUSH.length]);
      if (b) { put(ctx, `ewd-g${gid}-b${i}`, b, x + 1.8 * Math.cos(a + 1), z + 1.8 * Math.sin(a + 1), ctx.random() * 360); n++; }
    }
    const s = got(gid % 2 ? "elw-stump" : "kalidar-tree-stump01");
    if (s) { put(ctx, `ewd-g${gid}-s`, s, g.c[0] + 2, g.c[1] - 1, ctx.random() * 360); n++; }
    if (gid % 2 === 0) { ctx.spawn(`ewd-g${gid}-log`, { tags: ["ew-dress"], physics: "static", visibleRange: { max: 250 }, feetPosition: { x: g.c[0] - 3, z: g.c[1] + 2, y: { terrain: -0.08 } }, rotation: { yaw: gid * 37 }, primitive: { kind: "scripted", script: "scripts/gen/ew-props.js", params: { kind: "fungilog", len: 3.2 }, seed: gid } }); n++; }
  });
  return n;
}
export function dressProps(ctx) {
  const P = {}; const got = (k) => (P[k] ??= proto(ctx, k));
  let n = 0;
  D.props.forEach(([how, k, x, z, yaw], i) => {
    if (how === "ew") {
      ctx.spawn(`ewd-p${i}`, { tags: ["ew-dress"], physics: "static", visibleRange: { max: k === "leafpile" ? 220 : 250 }, feetPosition: { x, z, y: { terrain: k === "fungilog" ? -0.08 : -0.05 } }, rotation: { yaw }, primitive: { kind: "scripted", script: "scripts/gen/ew-props.js", params: { kind: k }, seed: i }, ...(k === "leafpile" ? { fx: { script: SMOKE } } : {}) });
      n++;
    } else { const p = got(k); if (p) { put(ctx, `ewd-p${i}`, p, x, z, yaw); n++; } }
  });
  return n;
}
