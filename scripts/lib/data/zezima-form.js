// THE ZEZIMA FORM (creator lock-in 2026-10-06): his own OSRS body, owner-only, animated the OSRS way:
// one clip live at a time, every switch a hard cut (blendIn 0), poses stepped inside the clips themselves.
// The model and the clip addresses live in the three yml rows beside this file; each crew lane owns one.
import M from './zezima-model.yml';
import G from './zezima-clips-gait.yml';
import A from './zezima-clips-air.yml';
export const ZEZIMA_OWNER = 'pa_28744a7fc0a3ce8b63c72a3c4cc2fcd9'; // the only body allowed this form
export const ZEZIMA_MODEL = M;
export const ZEZIMA_CLIPS = { ...G, ...A };
// the water a body swims in, per place (the main valley's sea stands at 0); feet this far under it = swimming
export const ZEZIMA_WATER = { main: 0 };
export const ZEZIMA_SWIM_DEPTH = 1.0;
// gait thresholds (m/s): walk is 3.8, run 6.8 (stamina.js), so the run cut sits between them
export const ZEZIMA_GAIT = { walkAt: 0.6, runAt: 5.3, airDelay: 0.15, fallVy: -1.5 };
