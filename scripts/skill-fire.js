// MMO prompt 4/6: a lit fire. Burns 60-120 s (state.burnSec), you can cook on it, then leaves ashes for a minute and goes.
import { GA } from "./lib/data/gather.js";
export function onSpawn(ctx) {
  const s = ctx.self.state;
  if (s.ash) { ctx.after(GA.ashSec, "gone"); return; }
  ctx.after(Math.max(5, s.burnSec ?? 90), "burnOut");
}
export function burnOut(ctx) {
  const me = ctx.self; me.state.ash = true;
  me.fx = { script: `fx\npop smoke rate=3 on=disc(.15) life=2..3 v=up(.4..0.7) size=.15..0.25 acc=buoy(.3)+curl(.3)*.3+drag(.6) col=<.4,.38,.36> a=0>.18:.25>.6:.08>0 sz=$size*(.6>2.6) r=sprite(smoke-puff,alpha)` };
  me.audio = null;
  me.primitive = { kind: "scripted", script: "scripts/gen/gather-props.js", params: { kind: "ash" } };
  ctx.after(GA.ashSec, "gone");
}
export function gone(ctx) { ctx.destroy(ctx.self.id); }
