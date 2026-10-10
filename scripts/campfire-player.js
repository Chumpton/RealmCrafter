// The hotbar campfire (creator 2026-10-06): the player's own body pitches it. A press of the 'campfire' action (its hotbar slot,
// or its key) lays a fire and a ring of log benches a few metres ahead; the benches are den furniture, so a click sits you down.
// scripts/campfire.js on the fire puts it all out when nobody has sat there for CAMPFIRE.idleMs.
import { raycast } from "builtin/physics";
import { CAMPFIRE, CAMPFIRE_FX } from "./lib/data/campfire.js";
const LOG = { kind: "cylinder", radiusTop: 0.09, radiusBottom: 0.1, height: 0.9, radialSegments: 7 };
const BARK = { color: "oklch(0.38 0.05 55)", roughness: 0.95 };
const STONE = { color: "oklch(0.62 0.01 80)", roughness: 0.9, flatShading: true };
function fireSpec(x, y, z, owner) {
  const kids = [];
  for (let i = 0; i < 4; i++) kids.push({ id: `log${i}`, feetPosition: { x: 0, y: 0.12, z: 0 }, pivot: "center", rotation: { yaw: i * 45, pitch: 0, roll: 72 }, primitive: LOG, material: BARK });
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; kids.push({ id: `stone${i}`, feetPosition: { x: Math.cos(a) * 0.62, y: 0, z: Math.sin(a) * 0.62 }, scale: { x: 1, y: 0.7, z: 1 }, primitive: { kind: "dodecahedron", radius: 0.16 }, material: STONE }); }
  kids.push({ id: "ash", feetPosition: { x: 0, y: 0.01, z: 0 }, primitive: { kind: "circle", radius: 0.55, segments: 12 }, anchor: "center", pivot: "center", rotation: { pitch: -90 }, material: { color: "oklch(0.25 0.01 60)", roughness: 1 } });
  return {
    feetPosition: { x, y, z }, tags: ["campfire"], scope: "world", audience: "near",
    fx: { script: CAMPFIRE_FX },
    audio: { clip: "cdn/moodboard-lowpoly-cozy/sfx-campfire-crackle-loop.mp3", gain: 0.3, loop: true, spatial: true, maxDistance: 18 },
    behavior: "scripts/campfire.js", children: kids,
    state: { owner, benches: [] },
  };
}
export function onInput(ctx, input) {
  if (!input.pressed?.campfire) return;
  const me = ctx.self, s = me.state, now = ctx.now();
  if (now < (s.campfireNext ?? 0)) return;
  s.campfireNext = now + CAMPFIRE.cooldownMs;
  if (s.campfireId && ctx.getObject(s.campfireId)) { ctx.emit("toast", { message: "your fire's still burning", duration: 1.6 }, { audience: { player: me.id } }); return; }
  if (s.seatedOn || me.controlling || me.parent) return; // seated or riding: no fire from the saddle
  const p = me.worldFeetPosition || me.feetPosition, yaw = typeof me.rotation === "number" ? me.rotation : (me.rotation?.yaw ?? 0);
  const r = yaw * Math.PI / 180, fx = -Math.sin(r), fz = -Math.cos(r);
  const cx = p.x + fx * CAMPFIRE.ahead, cz = p.z + fz * CAMPFIRE.ahead;
  const ground = (x, z) => { const h = raycast(ctx, { x, y: p.y + 3, z }, { x: 0, y: -1, z: 0 }, { distance: 8, physicsOnly: true, ignoreEntities: [me.id] }); return h ? h.position.y : (ctx.place.terrain?.heightAt?.(x, z) ?? p.y); };
  const cy = ground(cx, cz);
  if (Math.abs(cy - p.y) > 2) { ctx.emit("toast", { message: "no flat ground for a fire there", duration: 1.6 }, { audience: { player: me.id } }); return; }
  const id = ctx.spawn(fireSpec(cx, cy, cz, me.id));
  const benches = [];
  for (let i = 0; i < CAMPFIRE.benches; i++) {
    const a = yaw + 180 + i * 360 / CAMPFIRE.benches + 45, ar = a * Math.PI / 180;
    const bx = cx + Math.sin(ar) * CAMPFIRE.ring, bz = cz + Math.cos(ar) * CAMPFIRE.ring;
    benches.push(ctx.spawn({ feetPosition: { x: bx, y: ground(bx, bz), z: bz }, rotation: { yaw: a }, scope: "world", physics: "static", tags: ["den-furniture", "campfire-bench"], castShadow: true,
      primitive: { kind: "scripted", script: "scripts/gen/mother-tree.js", params: { item: "bench", seat: 0.47, width: 1.9 } }, visibleRange: { max: 120 } }));
  }
  const fire = ctx.getObject(id); if (fire) fire.state = { owner: me.id, benches, lastSat: now };
  s.campfireId = id;
  ctx.emit("playSound", { clip: "cdn/moodboard-lowpoly-cozy/sfx-campfire-whoosh-light.mp3", position: { x: cx, y: cy + 0.5, z: cz }, volume: 0.6 });
  ctx.emit("stat", { name: "campfires lit" });
}
// one-time: a fresh bar gets the campfire on its first empty bottom slot, so the ability is there to find
export function update(ctx) {
  const s = ctx.self.state; if (s.campfireSeeded) { ctx.sleep(); return; }
  const ui = s.ui; if (!ui || ui.v !== 1 || !Array.isArray(ui.bar)) { ctx.sleep(5); return; }
  s.campfireSeeded = true;
  if (ui.bar.includes("campfire")) return;
  const bar = ui.bar.slice(); let i = -1; for (let k = 0; k < 10; k++) if (!bar[k]) { i = k; break; }
  if (i < 0) return;
  bar[i] = "campfire"; s.ui = { ...ui, bar };
}
