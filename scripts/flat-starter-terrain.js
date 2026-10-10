// Mellowbrook ground: flat meadow for the town and the zone ring, and the back range to the north
// (behind the Buddha). The range: a rolling foothill shelf, a gentler spur at x ≈ 5 that carries the
// switchback trail (path marks in config.yaml grade it), and big crags either side.
import WORLD from './lib/data/world.yml'
import RELIEF from './lib/data/town-relief.json'

const B = WORLD.terrain.baseHeight
const c01 = (v) => Math.min(1, Math.max(0, v))
const ss = (a, b, v) => { const t = c01((v - a) / (b - a)); return t * t * (3 - 2 * t) }

export const RANGE = { spurX: 5, spurW: 48, foot: 178, spurFoot: 186 }

// the trail spur: a smooth valley ramp between the crags, height by z alone, so switchbacks run level
// across it. 0.4 rise per metre, easing into a summit meadow near 87 m.
export function spurHeight(z) {
  const dz = z - RANGE.spurFoot
  if (dz < -2) return 0
  const lin = 0.4 * Math.max(0, dz - 25)
  const climb = lin < 60 ? lin : 60 + 18 * (1 - Math.exp(-(lin - 60) / 18))
  return 9 * ss(0, 38, dz) + climb
}

// distance past the foot line (wavy, so the range never reads as a wall)
function past(x, z) {
  return z - (RANGE.foot + 16 * Math.sin(x / 88) + 9 * Math.sin(x / 37 + 1.3))
}

export function rangeHeight(x, z, noise, seedOffset) {
  const d = past(x, z)
  if (d < -2) return 0
  const spur = Math.exp(-(((x - RANGE.spurX) / RANGE.spurW) ** 2))
  // foothill shelf: a soft first rise every slope starts from
  const foot = 9 * ss(0, 38, d)
  // the main mass: peaks swell and dip along the ridge
  const peaks = 0.55 + 0.75 * noise.ridged({ x, z: 0, frequency: 1 / 230, octaves: 2, seed: seedOffset(41) }) / 1.5
  const rise = Math.pow(c01((d - 24) / 170), 1.25)
  const mass = rise * 150 * peaks * (1 - 0.5 * spur)
  // crags: ridged detail that grows with height, softened on the trail spur
  const crag = noise.ridged({ x, z, frequency: 1 / 46, octaves: 4, seed: seedOffset(42) }) * 9 * ss(10, 80, d) * (1 - 0.7 * spur)
  const roll = noise.fbm2({ x, z, frequency: 1 / 70, octaves: 3, seed: seedOffset(43) }) * 3 * ss(0, 30, d)
  const full = foot + mass + crag + roll
  const w = ss(0, 1, (115 - Math.abs(x - RANGE.spurX)) / 80)
  if (w <= 0) return full
  const sp = spurHeight(z) + noise.fbm2({ x, z, frequency: 1 / 60, octaves: 2, seed: seedOffset(45) }) * 0.8 * ss(0, 30, d)
  return full * (1 - w) + sp * w
}

// Town relief (lock-in 2026-10-10): open ground rolls; anything built keeps its level. RELIEF is a 4 m mask
// (0 = within 4 m of a placement, the pond or the plaza; 9 = free), baked from the live placements.
function freeAt(x, z) {
  const rx = (x - RELIEF.x0) / RELIEF.step, rz = (z - RELIEF.z0) / RELIEF.step
  // past the grid the mask eases from its edge value to free over 16 m (was a hard jump to 1: a step at x = 180)
  const over = Math.max(-rx, rz - (RELIEF.nz - 1), rx - (RELIEF.nx - 1), -rz) * RELIEF.step
  if (over >= 16) return 1
  const fx = Math.min(RELIEF.nx - 1, Math.max(0, rx)), fz = Math.min(RELIEF.nz - 1, Math.max(0, rz))
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j
  const g = (a, b) => +(RELIEF.rows[Math.min(RELIEF.nz - 1, b)][Math.min(RELIEF.nx - 1, a)]) / 9
  const m = (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v
  return over > 0 ? m + (1 - m) * ss(0, 16, over) : m
}
export function townRelief(x, z, noise, seedOffset) {
  const m = freeAt(x, z)
  if (m <= 0) return 0
  const d = Math.hypot(x + 20, z + 10)
  const amp = 1.1 + 2.4 * ss(70, 260, d)
  const roll = noise.fbm2({ x, z, frequency: 1 / 120, octaves: 3, seed: seedOffset(51) })
  const knoll = noise.fbm2({ x, z, frequency: 1 / 38, octaves: 2, seed: seedOffset(52) }) * 0.45
  let h = (roll + knoll) * amp
  if (h < 0) h = -1.3 * (1 - Math.exp(h / 1.3)) // hollows stay shallow and soft-bottomed
  const rim = 9 * ss(190, 360, d) * (0.6 + 0.4 * noise.fbm2({ x, z, frequency: 1 / 160, octaves: 2, seed: seedOffset(53) }))
  // the rim eases down over 70 m before the range takes over at z = 150 (a 14 m fade left a trench along z ≈ 145)
  return (h * ss(150, 136, z) + rim * ss(150, 80, z)) * m
}

export function heightAt(ctx) {
  const { x, z } = ctx
  if (z < 150) return B + townRelief(x, z, ctx.noise, ctx.seedOffset)
  return B + rangeHeight(x, z, ctx.noise, ctx.seedOffset)
}

export function materialAt(ctx) {
  const { x, z, worldHeight, slope, noise, seedOffset } = ctx
  // home pond: a muddy rim at the waterline (level -0.35), soft into the grass
  const pd = Math.hypot(x + 100, z - 92)
  if (pd < 75 && worldHeight < -0.06) {
    const n = noise.fbm2({ x, z, frequency: 1 / 5, octaves: 2, seed: seedOffset(46) })
    const mud = ss(-0.06, -0.4, worldHeight + n * 0.05)
    return { leafLitter: mud, grass: 1 - mud }
  }
  if (z < 160 || worldHeight < 1.5) return { grass: 1 }
  const n = noise.fbm2({ x, z, frequency: 1 / 24, octaves: 3, seed: seedOffset(44) })
  const rock = c01((slope - 0.2 + n * 0.08) * 4.5)
  const high = ss(55, 85, worldHeight + n * 10)
  const snowy = ss(130, 150, worldHeight + n * 12) * (1 - rock * 0.7)
  const green = 1 - high
  const out = {
    grass: (1 - rock) * green * (1 - snowy) * 0.7,
    upland: (1 - rock) * (0.3 * green + high) * (1 - snowy),
    mossRock: rock * (0.7 * green + 0.3 * high) * (1 - snowy),
    basalt: rock * 0.45 * (1 - snowy),
    mountain: rock * 0.35 * high * (1 - snowy),
    snow: snowy,
  }
  return out
}
