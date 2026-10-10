// The Buddha's birds: a few colourful songbirds fly in from the meadow, perch on its head,
// shoulders and lap for a while, look about and chirp, then fly off. One manager moves them all.
import { raycast } from "builtin/physics";
import { play, clips } from "builtin/anim";

const STATUE = "pf-buddha-statue-127n5";
// [x, z, facing yaw] in world; y is found on the statue's surface at spawn
const PERCHES = [
  [-18.5, 52.4, 0], [-18.9, 52.7, -25],        // crown
  [-20.9, 52.6, 20], [-15.8, 52.6, -20],       // shoulders
  [-19.3, 49.4, 10], [-17.7, 49.4, -10],       // hands in the lap
  [-22.6, 48.6, 30], [-14.4, 48.6, -30],       // knees
];
const CHIRP = "/cdn/moodboard-lowpoly-cozy/sfx-songbird-chirp-trill.mp3";
const FLAP = "/cdn/moodboard-lowpoly-cozy/sfx-small-bird-wing-flutter.mp3";

let birds = null, perchY = null, A = null;

function bez(a, c, b, t) { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y, z: u * u * a.z + 2 * u * t * c.z + t * t * b.z }; }
const ease = (t) => t * t * (3 - 2 * t);

function setup(ctx) {
  A = clips(ctx, "anim/songbird.yml");
  const ids = ctx.query({ tags: ["buddha-bird"], radius: 400, select: "ids" });
  perchY = PERCHES.map(([x, z]) => {
    const h = raycast(ctx, { x, y: 30, z }, { x: 0, y: -1, z: 0 }, { distance: 30, hits: "geometry", ignoreEntities: ids });
    return h && h.id === STATUE ? h.position.y : null;
  });
  const now = ctx.now();
  birds = ids.map((id, i) => ({ id, mode: "away", until: now + 3000 + i * 4000 + ctx.random() * 8000, perch: -1 }));
  for (const b of birds) { const o = ctx.getObject(b.id); if (o) o.visible = false; }
}

function farPoint(ctx, p) {
  const a = ctx.random() * Math.PI * 2, r = 45 + ctx.random() * 25;
  return { x: p.x + Math.cos(a) * r, y: p.y + 14 + ctx.random() * 10, z: p.z + Math.sin(a) * r };
}

export function update(ctx) {
  if (!birds) setup(ctx);
  const now = ctx.now();
  let next = now + 4000, moving = false;
  for (const b of birds) {
    const o = ctx.getObject(b.id); if (!o) continue;
    if (b.mode === "away" && now >= b.until) {
      const used = new Set(birds.filter((x) => x.mode !== "away").map((x) => x.perch));
      const free = PERCHES.map((_, i) => i).filter((i) => !used.has(i) && perchY[i] != null);
      if (!free.length) { b.until = now + 5000; }
      else {
        b.perch = free[Math.floor(ctx.random() * free.length)];
        const [x, z] = PERCHES[b.perch];
        b.to = { x, y: perchY[b.perch], z };
        b.from = farPoint(ctx, b.to);
        b.ctrl = { x: (b.from.x + b.to.x) / 2, y: b.to.y + 6, z: (b.from.z + b.to.z) / 2 };
        b.t0 = now; b.dur = 4200 + ctx.random() * 1800; b.mode = "in";
        o.feetPosition = b.from; o.visible = true;
        play(ctx, o, A.flap, { loop: true, speed: 0.9 + ctx.random() * 0.3 });
      }
    }
    if (b.mode === "in" || b.mode === "out") {
      moving = true;
      const t = Math.min(1, (now - b.t0) / b.dur), k = b.mode === "in" ? 1 - Math.pow(1 - t, 2.2) : t * t;
      const p = bez(b.from, b.ctrl, b.to, k), q = bez(b.from, b.ctrl, b.to, Math.min(1, k + 0.02));
      o.feetPosition = p;
      const dx = q.x - p.x, dz = q.z - p.z;
      if (dx * dx + dz * dz > 1e-6) o.rotation = { yaw: Math.atan2(-dx, -dz) * 180 / Math.PI, pitch: b.mode === "in" ? -8 : 12 };
      if (b.mode === "in" && t > 0.55 && !b.glided) { b.glided = true; play(ctx, o, A.glide, { loop: true, blendIn: 0.2 }); }
      if (b.mode === "in" && t > 0.88 && !b.braked) { b.braked = true; play(ctx, o, A.flap, { loop: true, speed: 1.4, blendIn: 0.1 }); ctx.emit("playSound", { clip: FLAP, position: b.to, volume: 0.35, maxDistance: 35 }); }
      if (t >= 1) {
        if (b.mode === "in") {
          b.mode = "perched"; b.glided = b.braked = false;
          o.feetPosition = b.to; o.rotation = { yaw: 180 + 4 + PERCHES[b.perch][2] + (ctx.random() - 0.5) * 30 };
          play(ctx, o, A.perch, { loop: true, speed: 0.8 + ctx.random() * 0.4, blendIn: 0.25 });
          ctx.emit("playSound", { clip: CHIRP, position: b.to, volume: 0.55, pitch: 0.9 + ctx.random() * 0.35, maxDistance: 45 });
          b.until = now + 12000 + ctx.random() * 20000; b.chirp = now + 3000 + ctx.random() * 5000;
        } else { b.mode = "away"; o.visible = false; b.until = now + 6000 + ctx.random() * 22000; b.perch = -1; }
      }
    }
    if (b.mode === "perched") {
      if (now >= b.chirp) {
        ctx.emit("playSound", { clip: CHIRP, position: b.to, volume: 0.45, pitch: 0.85 + ctx.random() * 0.45, maxDistance: 45 });
        if (ctx.random() < 0.5) o.rotation = { yaw: 180 + 4 + PERCHES[b.perch][2] + (ctx.random() - 0.5) * 70 };
        b.chirp = now + 4000 + ctx.random() * 7000;
      }
      if (now >= b.until) {
        b.mode = "out"; b.from = b.to; b.to = farPoint(ctx, b.from);
        b.ctrl = { x: b.from.x + (b.to.x - b.from.x) * 0.3, y: b.from.y + 3, z: b.from.z + (b.to.z - b.from.z) * 0.3 };
        b.t0 = now; b.dur = 3800 + ctx.random() * 1500;
        play(ctx, o, A.flap, { loop: true, speed: 1.2 });
        ctx.emit("playSound", { clip: FLAP, position: b.from, volume: 0.4, maxDistance: 35 });
      } else next = Math.min(next, b.until, b.chirp);
    }
    if (b.mode === "away") next = Math.min(next, b.until);
  }
  if (!moving) ctx.sleep(Math.max(0.1, (next - now) / 1000));
}
