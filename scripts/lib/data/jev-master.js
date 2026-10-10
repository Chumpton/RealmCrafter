// JEV-MASTER (docs/board/proposals/JEV-MASTER.md, WATCHED 5/5 2026-09-30): the O-menu desk's numbers. One file, L1.
// f = pct / DEFAULT_PCT: interval = base / f, cap = base × f. 75 % = today exactly; 0 % = that system rests.
// JEV-MASTER-v2 (WATCHED 5/5 2026-09-30): a % is a share of Maximum. The clocks keep their exact pace at every % (CLOCK_PCT);
// the lanes with no clock of their own (Rolf, card leans, board clerk) pass through allow() in jev-meter.js at that share.
export const DEFAULT_PCT = 100;
// JEV-MASTER-v3a (WATCHED 5/5 2026-09-30): ONE SCALE. interval = base × 100 / pct, so every mode is exactly its % of Maximum;
// Maximum = old High pace (base), old 1.33× Maximum retired. Chess joins the desk (chessCap).
export const CLOCK_PCT = 100;
export const SYSTEMS = [
  { id: 'denIdeas', label: 'Den ideas', base: 'TIDE gap (den lane)', kind: 'interval', note: 'big den pitches' },
  { id: 'solo', label: 'Solo tasks', base: 'TIDE gap (solo lane)', kind: 'interval', note: 'light solo pitches' },
  { id: 'smart', label: 'Smart list', base: 'SMART.everyMs', kind: 'interval', baseMs: 3 * 60e3 },
  { id: 'chat', label: 'Chat points', base: 'CHAT.everyMs', kind: 'interval', baseMs: 60e3 },
  { id: 'referee', label: 'Referee votes', base: 'VOTE.everyMs', kind: 'interval', baseMs: 60e3 },
  { id: 'tide', label: 'Pitch tide', base: 'TIDE.perHour / perDay', kind: 'cap', baseCap: 30 },
  { id: 'shelf', label: 'Shelf review', base: 'SHELF.reviewGapMs', kind: 'interval', baseMs: 5 * 60e3 },
  { id: 'chess', label: 'Chess', base: 'CHESS.mind.jevBudget.perHour', kind: 'chesscap', baseCap: 18 },
  { id: 'drone', label: 'Drone', base: 'share of HUGINN asks', kind: 'share', lanes: ['huginn'] },
  { id: 'hall', label: 'Hall life', base: 'share of Rolf + card asks', kind: 'share', lanes: ['rolf-legs', 'rolf-songs', 'card-lean'] },
];
export const PRESETS = [
  { id: 'saver', label: 'Power Saver', pct: 25 },
  { id: 'perf', label: 'Medium', pct: 50 },
  { id: 'high', label: 'High', pct: 75 },
  { id: 'max', label: 'Maximum', pct: 100 },
  { id: 'oc', label: 'Overclock', pct: 200 }, // JEV-MASTER-LIVE L1 (WATCHED 5/5): 2× Maximum, chess held at 100, fused after OC.minutes
];
export const FOCUS = { file: 'docs/board/JEV-FOCUS.md', themeMax: 240, themeRow: 40, briefMax: 2000, refreshMs: 30 * 60e3, queueTop: 5, pinsTop: 5 };
export const pctOf = (jm, id) => { const v = jm?.pct?.[id]; return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(200, v)) : DEFAULT_PCT; };
export const factor = (jm, id) => pctOf(jm, id) / CLOCK_PCT; // clocks: 0 = resting
// the gate's table: a metered lane → the desk system whose % it passes at (a lane not listed is never gated)
export const LANE_SYSTEM = { 'rolf-legs': 'hall', 'rolf-songs': 'hall', 'card-lean': 'hall', 'huginn': 'drone' };
export const scaleMs = (jm, id, baseMs) => { const f = factor(jm, id); return f <= 0 ? Infinity : baseMs / f; };
export const scaleCap = (jm, id, base) => Math.round(base * factor(jm, id));
export const chessCap = (jm) => Math.floor(18 * pctOf(jm, 'chess') / 100); // 4 / 9 / 13 / 18 JEV-thought moves per hour
// JEV-MASTER-LIVE L1: Overclock. Only the preset reaches 200; sliders stay 0-100. The fuse drops it back to Maximum.
export const OC = { pct: 200, minutes: 20 };
export function ocFuse(jm, now) {
  if (!jm || jm.preset !== 'oc' || typeof jm.ocUntil !== 'number' || now < jm.ocUntil) return jm;
  const pct = Object.fromEntries(SYSTEMS.map((x) => [x.id, 100]));
  const { ocUntil, ...rest } = jm;
  return { ...rest, pct, preset: 'max', ocUntil: undefined, hist: [...(jm.hist ?? []), [now, 'max']].slice(-8), at: now };
}
