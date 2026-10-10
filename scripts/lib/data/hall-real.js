// HALL-REAL-ROOF flags (docs/board/proposals/HALL-REAL-ROOF.md). All off = the pre-plan hall, except tall (creator: "raise it to 38").
// roofModel: the Blender shake roof (hall-roof-model row) stands and hall-shell drops its turf for a shake-grey base.
// tall: ridgeH 11.5 (y 35.5) instead of 8.0 (y 32). model: the roof GLB's /cdn/ address. far: the model's visibleRange max (m). farModel/near: the far tier (art/hall-real/far_build.py) and the near/far switch (m).
export const HR = { roofModel: true, tall: true, shell: true, eaveTall: true, model: "/cdn/value.f55d3279dbc5ef67bfedbc2ca92209f82de7d6a337e4a8581223f4ae97eac659.glb", far: 90,
  farModel: "/cdn/value.42e26dc2239cd63e3041bc93e394aa7c1b1cc2bdb75e2f76d11eb8caa1b5efb4.glb", near: 45 }; // hall-roof-far row: 2,995 tris, 45..90 m; near row 0..45 m
