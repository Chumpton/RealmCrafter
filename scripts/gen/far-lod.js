// Far detail for the hall's generator families (furn-viking, feast-food). A piece's full draw is captured once
// off-screen, then either replayed as-is (when it is already a few dozen faces) or rebuilt as a coarse block
// silhouette: a voxel grid over the piece's bounds, hollows filled, only the outside faces kept and merged,
// each block wearing the material that covered most of it — the piece's outline and base colour in a few dozen faces.
const SET = ['albedo', 'color', 'roughness', 'metalness', 'emissive'];
export function capture(draw) {
  const st = { albedo: [null], color: ['#ffffff'], roughness: [0.6], metalness: [0], emissive: [null], sm: false };
  const mats = [], keys = new Map(), tris = []; let cur = -1;
  const mat = () => { if (cur < 0) { const k = JSON.stringify(st); if (!keys.has(k)) { keys.set(k, mats.length); mats.push(JSON.parse(k)); } cur = keys.get(k); } return cur; };
  const base = { tri(...v) { tris.push([...v.slice(0, 9), mat()]); }, smooth() { st.sm = true; cur = -1; }, flat() { st.sm = false; cur = -1; } };
  for (const s of SET) base[s] = (...a) => { st[s] = a; cur = -1; };
  const fake = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => undefined) });
  const uvs = draw(fake) || [];
  return { tris, mats, uvs };
}
function wear(ctx, M, smooth) { for (const s of SET) ctx[s](...M[s]); if (smooth ?? M.sm) ctx.smooth(); else ctx.flat(); }
// the captured draw, exactly (its own uvs)
export function replay(ctx, m, cap) {
  let last = -1;
  cap.tris.forEach((t, i) => { if (t[9] !== last) { wear(ctx, cap.mats[t[9]]); last = t[9]; } ctx.tri(...t.slice(0, 9)); m.uvs.push(...cap.uvs.slice(i * 6, i * 6 + 6)); });
  ctx.emissive(null); ctx.flat();
}
// the block silhouette: about `cells` blocks along the piece's longest side squared
export function blocks(ctx, m, cap, span = 5) {
  const T = cap.tris; if (!T.length) return;
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const t of T) for (let v = 0; v < 3; v++) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], t[v * 3 + a]); hi[a] = Math.max(hi[a], t[v * 3 + a]); }
  const e = hi.map((h, a) => Math.max(h - lo[a], 1e-4)), s = Math.max(...e) / span;
  const N = e.map((x) => Math.max(1, Math.min(span + 1, Math.round(x / s)))), C = e.map((x, a) => x / N[a]);
  const idx = (i, j, k) => (i * N[1] + j) * N[2] + k, n = N[0] * N[1] * N[2];
  const area = Array.from({ length: n }, () => new Map());
  const cell = (p, a) => Math.min(N[a] - 1, Math.max(0, Math.floor((p - lo[a]) / C[a])));
  for (const t of T) {
    const A = [t[0], t[1], t[2]], B = [t[3], t[4], t[5]], D = [t[6], t[7], t[8]];
    const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], ad = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
    const ar = 0.5 * Math.hypot(ab[1] * ad[2] - ab[2] * ad[1], ab[2] * ad[0] - ab[0] * ad[2], ab[0] * ad[1] - ab[1] * ad[0]);
    const L = Math.max(Math.hypot(...ab), Math.hypot(...ad), Math.hypot(D[0] - B[0], D[1] - B[1], D[2] - B[2]));
    const k = Math.min(16, Math.max(1, Math.ceil(L / (Math.min(...C) * 0.5)))), w = ar / (((k + 1) * (k + 2)) / 2);
    for (let i = 0; i <= k; i++) for (let j = 0; j <= k - i; j++) {
      const u = i / k, v = j / k, p = [0, 1, 2].map((a) => A[a] + ab[a] * u + ad[a] * v);
      const c = area[idx(cell(p[0], 0), cell(p[1], 1), cell(p[2], 2))]; c.set(t[9], (c.get(t[9]) || 0) + w);
    }
  }
  // a cell is solid when surface enough passes through it; hollows the outside cannot reach are filled
  const minA = C[0] * C[1] * C[2] / Math.max(...C) * 0.08;
  const matOf = new Int32Array(n).fill(-1);
  area.forEach((mp, q) => { let best = -1, bw = 0, sum = 0; for (const [k2, w] of mp) { sum += w; if (w > bw) { bw = w; best = k2; } } if (sum >= minA) matOf[q] = best; });
  const out = new Uint8Array(n), stack = [];
  for (let i = 0; i < N[0]; i++) for (let j = 0; j < N[1]; j++) for (let k = 0; k < N[2]; k++)
    if ((i === 0 || j === 0 || k === 0 || i === N[0] - 1 || j === N[1] - 1 || k === N[2] - 1) && matOf[idx(i, j, k)] < 0) { out[idx(i, j, k)] = 1; stack.push([i, j, k]); }
  while (stack.length) { const [i, j, k] = stack.pop();
    for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const a = i + di, b = j + dj, c = k + dk;
      if (a < 0 || b < 0 || c < 0 || a >= N[0] || b >= N[1] || c >= N[2]) continue; const q = idx(a, b, c); if (!out[q] && matOf[q] < 0) { out[q] = 1; stack.push([a, b, c]); } } }
  const solid = (i, j, k) => i >= 0 && j >= 0 && k >= 0 && i < N[0] && j < N[1] && k < N[2] && !out[idx(i, j, k)];
  const mOf = (i, j, k) => { const v = matOf[idx(i, j, k)]; if (v >= 0) return v; // a filled hollow wears its neighbours' coat
    for (let r = 1; r < 8; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) { const I = i + a, J = j + b, K = k + c;
      if (I >= 0 && J >= 0 && K >= 0 && I < N[0] && J < N[1] && K < N[2] && matOf[idx(I, J, K)] >= 0) return matOf[idx(I, J, K)]; } return 0; };
  const quads = []; // greedy-merged outside faces
  for (let d = 0; d < 3; d++) for (const dir of [-1, 1]) {
    const u = (d + 1) % 3, v = (d + 2) % 3;
    for (let l = 0; l < N[d]; l++) {
      const mask = new Int32Array(N[u] * N[v]).fill(-1);
      for (let a = 0; a < N[u]; a++) for (let b = 0; b < N[v]; b++) { const p = [0, 0, 0]; p[d] = l; p[u] = a; p[v] = b;
        if (!solid(...p)) continue; const q2 = [...p]; q2[d] += dir; if (solid(...q2)) continue; mask[a * N[v] + b] = mOf(...p); }
      for (let a = 0; a < N[u]; a++) for (let b = 0; b < N[v]; b++) { const val = mask[a * N[v] + b]; if (val < 0) continue;
        let wb = 1; while (b + wb < N[v] && mask[a * N[v] + b + wb] === val) wb++;
        let ha = 1; grow: while (a + ha < N[u]) { for (let x = 0; x < wb; x++) if (mask[(a + ha) * N[v] + b + x] !== val) break grow; ha++; }
        for (let y = 0; y < ha; y++) for (let x = 0; x < wb; x++) mask[(a + y) * N[v] + b + x] = -1;
        const P = (aa, bb) => { const p = [0, 0, 0]; p[d] = lo[d] + (l + (dir > 0 ? 1 : 0)) * C[d]; p[u] = lo[u] + aa * C[u]; p[v] = lo[v] + bb * C[v]; return p; };
        const nrm = [0, 0, 0]; nrm[d] = dir; quads.push([val, [P(a, b), P(a + ha, b), P(a + ha, b + wb), P(a, b + wb)], nrm]); }
    }
  }
  quads.sort((x, y) => x[0] - y[0]); let last = -1;
  for (const [val, pts, nrm] of quads) { if (val !== last) { wear(ctx, cap.mats[val], false); last = val; } m.face(pts, nrm); }
  ctx.emissive(null); ctx.flat();
}
// lod 4–5: the piece's own coarsest draw when it is already a few dozen faces, else the block silhouette of `draw(fake)`
export function far(ctx, m, coarse, full, maxTris = 60, span = 5) {
  const c = coarse && capture(coarse);
  if (c && c.tris.length && c.tris.length <= maxTris) { replay(ctx, m, c); return; }
  const probe = { face(p) { probe.n += p.length - 2; }, n: 0 }, nul = new Proxy({}, { get: () => () => undefined });
  blocks(nul, probe, capture(full), span);
  if (c && c.tris.length && c.tris.length <= probe.n) replay(ctx, m, c); else blocks(ctx, m, capture(full), span);
}
// lod 2–3: the piece's own tier (2 → tier 3, 3 → tier 4); a piece whose tier keeps too much of the full draw
// (over 75% at lod 2, 40% at lod 3) takes a fine block silhouette instead, whichever is lighter
export function mid(ctx, m, drawAt, lod) {
  const t = capture(drawAt(lod === 2 ? 3 : 4)), full = capture(drawAt(1)).tris.length, cap = lod === 2 ? 0.75 : 0.4;
  if (t.tris.length <= full * cap) { replay(ctx, m, t); return; }
  const probe = { tri() { probe.n++; }, face(p) { probe.n += p.length - 2; }, n: 0, uvs: [] }, nul = new Proxy({}, { get: () => () => undefined });
  blocks(nul, probe, capture(drawAt(1)), lod === 2 ? 12 : 8);
  if (probe.n < t.tris.length) blocks(ctx, m, capture(drawAt(1)), lod === 2 ? 12 : 8); else replay(ctx, m, t);
}
