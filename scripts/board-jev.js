// BOOT (perf 2026-10-06): the JEV board's thin door. The body (scripts/lib/board-jev-core.js, 132 KB + its 40-module graph)
// loads by import() in the 'late' lane (9 s after this machine's player stands) or at once when a job answer lands;
// every export the row and its ctx.job callbacks name is here, forwarding to the same function in the body. Same behavior.
import { isOn, PAUSE_NAP_S } from './lib/data/systems.js';
import { JEVT } from './lib/data/board-jev.js';
import { door } from './lib/lazy-hooks.js';
const D = door(() => import('./lib/board-jev-core.js'), 'late', 'jevRetry');
export const updateSchedule = { every: { seconds: JEVT.inboxEverySec ?? 10 } }; // identical to the body's
const tick = D.tick('update');
export function update(ctx, dt) { if (!isOn(ctx, 'jev')) { ctx.sleep?.(PAUSE_NAP_S); return; } return tick(ctx, dt); } // the body's own first line, answered without loading it
export const jevRetry = D.retry;
export const onWatchVerdict = D.job('onWatchVerdict'), onMergeJob = D.job('onMergeJob'), onJevIdeas = D.job('onJevIdeas'), onDupeJudge = D.job('onDupeJudge'),
  onDenIdea = D.job('onDenIdea'), onVoteScribe = D.job('onVoteScribe'), onSoloIdeas = D.job('onSoloIdeas'), onShelfNeeds = D.job('onShelfNeeds'),
  onShelfReview = D.job('onShelfReview'), onSmartList = D.job('onSmartList'), onEli5 = D.job('onEli5'), onFeatureSheet = D.job('onFeatureSheet'),
  onJevDecides = D.job('onJevDecides'), onChatPoints = D.job('onChatPoints'), onInboxDigest = D.job('onInboxDigest'), onWakeBrief = D.job('onWakeBrief'),
  onJevSuggest = D.job('onJevSuggest');
// jevSuggestBrief / jevSuggestPicks (pure helpers, no importer anywhere) live on in the body: import them from ./lib/board-jev-core.js.
