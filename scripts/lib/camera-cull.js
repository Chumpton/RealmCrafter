// OSRS CAMERA CULL (perf lane C1). Client-local, called by scripts/camera.js in third person only.
// 1. Far clip tied to what the eye can actually see: rays along the top edge of the view find where the ground cuts the picture;
//    everything past that is under the ground from this eye, so the far plane sits just beyond it and nothing visible changes.
// 2. Selective roofs: standing inside one of OUR buildings hides its roof parts on this screen (player.hidden, no fade) until you step out.
// Every write here is this machine's own layer (ctx.self.clip, player.atmosphere, player.hidden): no other player sees a change.
import { raycast } from 'builtin/physics'
import { CULL, ROOF } from './data/camera-cull.js'
import { settingOf } from './settings-core.js'

function sky(ctx) { const S = ctx.session; return S.cullFar !== undefined || S.cullFog }

export function cullRelease(ctx) {
  const S = ctx.session
  if (S.cullFar !== undefined) { ctx.self.clip = null; S.cullFar = undefined }
  if (S.cullFog && ctx.player) { delete ctx.player.atmosphere.fog; S.cullFog = false }
  setRoofs(ctx, [])
  S.cullAt = 0; S.cullHist = []
}

function probe(ctx, eye, yaw, pitch, ignore, phase) {
  const fovY = (ctx.self.fov ?? 40) * Math.PI / 180, aspect = ctx.world?.camera?.aspect || 16 / 9, ty = Math.tan(fovY / 2), tx = ty * aspect
  const cp = Math.cos(pitch), sp = Math.sin(pitch), sy = Math.sin(yaw), cy = Math.cos(yaw)
  const f = { x: -sy * cp, y: sp, z: -cy * cp }, u = { x: sy * sp, y: cp, z: cy * sp }, r = { x: cy, y: 0, z: -sy }
  let deepest = 0
  const ph = CULL.phases ?? 1, sh = (phase % ph) * 0.5 / ph // the cols slide across the gap between them, probe by probe: a notch between two cols is met within `phases` probes
  const rays = CULL.cols.map((c) => [c >= 1 ? c : Math.min(1, c + sh), 1]).concat([[-1, 0.5], [1, 0.5]])
  const terr = ctx.place?.terrain
  for (const [sx, syv] of rays) {
    let d = { x: f.x + u.x * ty * syv + r.x * tx * sx, y: f.y + u.y * ty * syv + r.y * tx * sx, z: f.z + u.z * ty * syv + r.z * tx * sx }
    const n = Math.hypot(d.x, d.y, d.z); d = { x: d.x / n, y: d.y / n, z: d.z / n }
    const cosA = d.x * f.x + d.y * f.y + d.z * f.z
    let o = eye, gone = 0, hit = null
    for (let k = 0; k < 4 && gone < CULL.rayMax; k++) { // a post, a trunk, a roof does not hide what is behind it: only the ground does
      const h = raycast(ctx, o, d, { distance: CULL.rayMax - gone, ignoreEntities: ignore, physicsOnly: true })
      if (!h) break
      const g = terr?.heightAt?.(h.position.x, h.position.z)
      if (g != null && h.position.y <= g + 1.5) { hit = gone + h.distance; break } // no ground under the hit: not ground, look on
      gone += h.distance + 0.5; o = { x: h.position.x + d.x * 0.5, y: h.position.y + d.y * 0.5, z: h.position.z + d.z * 0.5 }
    }
    if (hit == null) return null // sky on screen
    deepest = Math.max(deepest, hit * cosA)
  }
  return deepest
}

export function cullTick(ctx, eye, pivot, yaw, pitch, radius, target) {
  const S = ctx.session, st = ctx.player?.state
  const on = (settingOf(st, 'camCull') ?? 0) === 0
  roofs(ctx, pivot, settingOf(st, 'roofs') ?? 0)
  if (!on) { if (sky(ctx)) { if (S.cullFar !== undefined) { ctx.self.clip = null; S.cullFar = undefined } if (S.cullFog && ctx.player) { delete ctx.player.atmosphere.fog; S.cullFog = false } } return }
  const now = ctx.now(), lp = S.cullP
  const moved = !lp || Math.abs(lp.pitch - pitch) > 0.0175 || lp.radius !== radius || Math.abs(lp.yaw - yaw) > 0.03 || Math.hypot(lp.x - pivot.x, lp.y - pivot.y, lp.z - pivot.z) > 1
  if (!moved && now < (S.cullAt ?? 0)) return
  S.cullAt = now + CULL.every; S.cullP = { pitch, yaw, radius, x: pivot.x, y: pivot.y, z: pivot.z }
  S.cullPh = ((S.cullPh ?? -1) + 1) % (CULL.phases ?? 1)
  const raw = probe(ctx, eye, yaw, pitch, [target.id], S.cullPh)
  const hist = raw == null ? (S.cullHist = []) : (S.cullHist = [raw].concat(S.cullHist ?? []).slice(0, CULL.phases ?? 1))
  const depth = raw == null ? null : Math.max(...hist) // the deepest of the last sweep, so a slid col's notch is kept until the sweep comes round again
  let far, fog = null
  if (depth == null) {
    if (!CULL.horizonFar) far = undefined
    else { far = CULL.horizonFar; const pf = ctx.place?.atmosphere?.fog; fog = { kind: 'linear', color: pf?.color ?? null, near: Math.min(pf?.near ?? 1e9, far * CULL.fogNearK), far: Math.min(pf?.far ?? 1e9, far * CULL.fogFarK) } }
  } else far = Math.max(CULL.minFar, Math.ceil((depth * (1 + CULL.margin) + CULL.pad) / CULL.step) * CULL.step)
  const cur = S.cullFar
  if (far === undefined) { if (cur !== undefined) { ctx.self.clip = null; S.cullFar = undefined } }
  else if (cur === undefined || far > cur || far < cur * 0.8) { ctx.self.clip = { far }; S.cullFar = far } // grows at once, shrinks with hysteresis
  if (ctx.player) {
    const key = fog ? `${fog.near}|${fog.far}|${fog.color}` : ''
    if (key !== (S.cullFogKey ?? '')) { S.cullFogKey = key; if (fog) { ctx.player.atmosphere.fog = fog; S.cullFog = true } else if (S.cullFog) { delete ctx.player.atmosphere.fog; S.cullFog = false } }
  }
}

// ---- selective roofs
function setRoofs(ctx, ids) {
  const S = ctx.session, key = ids.slice().sort().join(',')
  if (key === (S.roofKey ?? '') || !ctx.player) return
  const mine = new Set(S.roofIds ?? []), rest = [].concat(ctx.player.hidden ?? []).filter((id) => !mine.has(id))
  ctx.player.hidden = rest.concat(ids); S.roofIds = ids; S.roofKey = key
}
function roofs(ctx, pivot, mode) {
  const S = ctx.session
  if (mode === 2) return setRoofs(ctx, [])
  const now = ctx.now()
  if (now >= (S.roofScanAt ?? 0)) { // once a second: the nearby roof parts of our buildings and their boxes (the per-frame test below is pure math)
    S.roofScanAt = now + ROOF.scan
    const rows = ctx.query({ tags: [ROOF.tag], center: pivot, radius: ROOF.radius }) ?? []
    S.roofSet = rows.filter((r) => !(r.tags || []).some((t) => ROOF.never.some((n) => t === n || t.startsWith(n + '-')))).map((r) => {
      const b = ctx.getObject(r.id)?.bounds
      return b ? { id: r.id, b: r.state?.roofOf ?? r.id, x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z, y0: b.min.y, y1: b.max.y } : null
    }).filter(Boolean)
  }
  const set = S.roofSet ?? []
  if (!set.length) return setRoofs(ctx, [])
  let hide
  if (mode === 1) hide = set.filter((p) => Math.hypot((p.x0 + p.x1) / 2 - pivot.x, (p.z0 + p.z1) / 2 - pivot.z) < ROOF.alwaysRadius).map((p) => p.id)
  else {
    const i = ROOF.inset, inside = set.find((p) => pivot.x > p.x0 + i && pivot.x < p.x1 - i && pivot.z > p.z0 + i && pivot.z < p.z1 - i && pivot.y < p.y1 && pivot.y > p.y0 - ROOF.below)
    hide = inside ? set.filter((p) => p.b === inside.b).map((p) => p.id) : []
  }
  setRoofs(ctx, hide)
}
