// BOOT (perf 2026-10-06): HUGINN's thin door. The body (scripts/lib/huginn-core.js, 70 KB + huginn-v3/sweep/lines/beacon)
// loads by import() in the 'life' lane (6 s after this machine's player stands) or at once when a job answer lands.
// places/main/sim.js's far-relay imports the same body module itself, so both share one module state as before.
import { isOn, PAUSE_NAP_S } from './lib/data/systems.js';
import { HUG, OUTER } from './lib/data/huginn.js';
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/huginn-core.js'), 'life', 'hugRetry');
export const updateSchedule = { every: { seconds: HUG.stepS }, near: { radius: OUTER.near } }; // identical to the body's
const tick = D.tick('update');
export const onSpawn = D.hook('onSpawn');
export function update(ctx, dt) { if (!isOn(ctx, 'huginn')) { ctx.sleep?.(PAUSE_NAP_S); return; } return tick(ctx, dt); } // the body's own first line
export const hugRetry = D.retry;
export const onFront = D.job('onFront'), onRecap = D.job('onRecap'), onLeg = D.job('onLeg'), onMop = D.job('onMop'), onTriage = D.job('onTriage'),
  onRoute = D.job('onRoute'), onDiff = D.job('onDiff'), onStart = D.job('onStart'), onPass = D.job('onPass'), onDetective = D.job('onDetective'), onStall = D.job('onStall');
// parseLine (re-exported by the old file, no importer) lives in ./lib/huginn-lines.js.
