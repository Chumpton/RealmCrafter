// The held sword was reversed (creator 2026-10-04: "remove the sword in my characters hands and everyone elses hands").
// Its file is gone, but a sword a machine already spawned stays on that body until the session ends: this takes it off
// on every machine, the hold pose with it, then sleeps. Safe to delete once nobody has carried one for a day.
export function update(ctx) {
  const me = ctx.self;
  for (const id of [me.id + "/held-sword"]) if (ctx.getObject(id)) ctx.destroy(id);
  for (const r of ctx.query({ tags: ["held-sword"], radius: 4 }) ?? []) if (ctx.getObject(r.id)?.parent?.id === me.id) ctx.destroy(r.id);
  if (me.anim?.hold?.clip?.includes?.("sword") || me.anim?.hold === "cdn/clip-sword-hold-ready-idle-loop.glb") me.anim.hold = null;
  ctx.sleep(5);
}
