// Hillside flora: the shared scatter variants for the hillside-bed-* beds (a bed's scatter.templates holds
// { template: "templates/hillside-flora.js#<name>", weight } — the spec here is sent once, not once per bed).
// PERF (2026-09-28, frame-room lane): meadow/fern/rock cast no shadow and meadow/fern draw to 85 m (was 125); birches keep shadows. Revert = drop castShadow:false, max back to 125.
// No tags/state/behavior on purpose: birches and rocks keep their static colliders, plantings stay pure visuals.
const base = { material: { pbr: true, roughness: 0.91 }, castShadow: true, receiveShadow: true };
const birch = (height, spread, seed) => ({ ...base, physics: 'static', visibleRange: { max: 190 }, primitive: { kind: 'scripted', script: 'scripts/gen/home-garden-birch.js', params: { height, spread }, seed } });
export const birchYoung = birch(3.75, 1.45, 43);
export const birchLow = birch(5.65, 2.12, 43);
export const birchMid = birch(6.15, 2.28, 67);
export const birchTall = birch(6.7, 2.5, 11);
export const birchTallest = birch(7.25, 2.65, 29);
export const fern = { ...base, castShadow: false, physics: 'none', visibleRange: { max: 85 }, primitive: { kind: 'scripted', script: 'scripts/gen/home-garden-planting.js', params: { kind: 'fern' }, seed: 31 } };
