// JEV-MASTER L3 (docs/board/proposals/JEV-MASTER.md): the FOCUS BRIEF. buildBrief is pure over what it reads; writeBrief is
// the one writer of docs/board/JEV-FOCUS.md. It never schedules itself: board-jev.js owns when (L2).
import { FOCUS } from './data/jev-master.js';
import { HALL } from './data/longhouse.js';
const LIVE = /^Status:\s*(GO|BUILDING|BUILT|WATCHED|SUBMITTED|REVIEW|CONTESTED|RETURNED)\b/i;
export function activePlans(ctx) {
  const out = [];
  for (const f of (ctx.world?.files ?? []).filter((p) => /^docs\/board\/proposals\/[^/]+\.md$/.test(p) && !p.endsWith('.watched.md'))) {
    const t = ctx.files.read(f) ?? '', st = t.split('\n').slice(0, 4).find((l) => LIVE.test(l));
    if (!st || /^Status:\s*BUILT/i.test(st) && !/2026-09-3/.test(st)) continue;
    out.push({ name: f.split('/').pop().slice(0, -3), status: st.replace(/^Status:\s*/, '').slice(0, 70) });
  }
  return out;
}
export function themeOf(ctx) { const m = /^THEME: (?!AUTO:)(.*)$/m.exec(ctx.files.read(FOCUS.file) ?? ''); return m ? m[1].trim() : null; }
// typed = the full theme text on a SET (world.state keeps only its first 40 chars); later refreshes read it back from the file
export function buildBrief(ctx, jm, typed) {
  const theme = jm?.auto === false ? (typed != null ? String(typed).slice(0, FOCUS.themeMax) : themeOf(ctx) ?? jm?.theme ?? null) : null;
  const plans = activePlans(ctx);
  const q = (ctx.files.read('docs/board/BUILD-QUEUE.md') ?? '').split('\n').filter((l) => /^\d+\. \[/.test(l)).slice(0, FOCUS.queueTop).map((l) => '- ' + l.replace(/^\d+\.\s*/, '').slice(0, 110));
  const pins = (ctx.files.read('docs/board/PRIORITY.md') ?? '').split('## JEV')[0].split('\n').filter((l) => /^- [DS]\d+/.test(l)).slice(0, FOCUS.pinsTop).map((l) => l.slice(2).trim());
  const w = HALL.outer.x1 - HALL.outer.x0, d = HALL.outer.z1 - HALL.outer.z0;
  const lines = [
    '# JEV FOCUS · written by scripts/lib/jev-focus.js (JEV-MASTER). Do not edit by hand: set the theme in O → JEV MASTER.',
    `THEME: ${theme ?? 'AUTO: steer toward the creator\'s pins and the plans being built'}`,
    `LONGHOUSE: ${w} × ${d} m outside, floor y ${HALL.floorY}, eave ${HALL.eaveH} m, ridge ${HALL.ridgeH} m (${Math.round(HALL.ridgeH * 3.28)} ft), ${HALL.posts.xs.length} post bays at x ${HALL.posts.xs.join(', ')}`,
    'ACTIVE PLANS:', ...plans.slice(0, 8).map((p) => `- ${p.name}: ${p.status}`),
    `CREATOR PINS: ${pins.join(', ') || 'none'}`,
    'BUILD QUEUE TOP:', ...q,
    'Steer toward this focus; still dedupe against IDEA-INDEX.',
  ];
  return lines.join('\n').slice(0, FOCUS.briefMax);
}
export function writeBrief(ctx, text) { if ((ctx.files.read(FOCUS.file) ?? '') !== text) ctx.files.write(FOCUS.file, text); }
