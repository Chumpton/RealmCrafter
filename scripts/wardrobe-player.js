// THE WARDROBE (creator 2026-10-06): O → Character → Wardrobe. A player's body is their own avatar or the OSRS world form,
// dressed from swatches. player.state.look is the save (it rides every room); this body writes its own model from it.
import { LOOK_DEFAULT, WARDROBE, lookModel } from './lib/data/osrs-folk-looks.js';
import { ZEZIMA_OWNER, ZEZIMA_MODEL } from './lib/data/zezima-form.js';
import { CAMPTON_OWNER, CAMPTON_MODEL } from './lib/data/campton-form.js';
import { SAVI_BODY, SAVI_MODEL } from './lib/data/savi-form.js';
const KEYS = ['cut', 'skin', 'hair', 'shirt', 'legs', 'boots'];
function apply(ctx) {
  const me = ctx.self, L = { ...LOOK_DEFAULT, ...(me.state.look ?? {}) };
  if (L.form === 'zezima' && me.userId !== ZEZIMA_OWNER) L.form = 'osrs'; // his body is his alone
  if (L.form === 'zezima') { me.model = ZEZIMA_MODEL.model; me.scale = +ZEZIMA_MODEL.scale || 1; me.state.lookForm = 1; me.state.zezimaForm = 1; return; }
  me.state.zezimaForm = 0;
  if (L.form === 'osrs') { me.model = lookModel(L); me.scale = Math.max(WARDROBE.height.min, Math.min(WARDROBE.height.max, +L.height || 1)); }
  else if (me.userId === SAVI_BODY) { me.model = SAVI_MODEL.model; me.scale = SAVI_MODEL.scale; } // Savi's own body (creator 2026-10-10)
  else if (me.userId === CAMPTON_OWNER) { me.model = CAMPTON_MODEL.model; me.scale = CAMPTON_MODEL.scale; } // his own uploaded body is his avatar
  else if (me.avatarUrl) { me.model = me.avatarUrl + '?animations=Idle,Walk,Run'; me.scale = 1; }
  me.state.lookForm = L.form === 'osrs' ? 1 : 0; // the O menu's Body form row reads this
}
export function onSpawn(ctx) { const f = ctx.self.state.look?.form; if (f === 'osrs' || f === 'zezima' || ctx.self.userId === CAMPTON_OWNER || ctx.self.userId === SAVI_BODY) apply(ctx); }
export function update(ctx) { const me = ctx.self; if (me.userId !== SAVI_BODY) return ctx.sleep(3600); if (me.isLocal !== false && me.model?.id !== SAVI_MODEL.model.id && (me.state.look?.form ?? 'original') === 'original') apply(ctx); ctx.sleep(5); } // her body is re-dressed by the client on join: hold the kit body
export function onInput(ctx, input) {
  const s = ctx.self.state;
  if (input.pressed.wardrobe) s.wardrobeOpen = !s.wardrobeOpen;
  if (input.pressed.zezimaForm) { // owner-only: wear / take off his own body; taking it off goes back to the OSRS form
    if (ctx.self.userId !== ZEZIMA_OWNER) return;
    const on = s.look?.form === 'zezima';
    s.look = { ...LOOK_DEFAULT, ...(s.look ?? {}), form: on ? 'osrs' : 'zezima' }; apply(ctx); return;
  }
  if (input.pressed.lookForm) { s.look = { ...LOOK_DEFAULT, ...(s.look ?? {}), form: (input.actionData?.lookForm?.v | 0) === 1 ? 'osrs' : 'original' }; apply(ctx); }
  if (input.pressed.look) {
    const p = input.actionData?.look ?? {}, L = { ...LOOK_DEFAULT, ...(s.look ?? {}) };
    if (p.k === 'form') L.form = p.v === 'osrs' ? 'osrs' : 'original';
    else if (p.k === 'cut') L.cut = p.v === 'woman' ? 'woman' : 'man';
    else if (p.k === 'height') L.height = Math.round(Math.max(WARDROBE.height.min, Math.min(WARDROBE.height.max, +p.v || 1)) * 100) / 100;
    else if (KEYS.includes(p.k)) L[p.k] = p.v | 0;
    else if (p.k === 'random') {
      const r = (n) => Math.floor(ctx.random() * n);
      Object.assign(L, { form: 'osrs', cut: ctx.random() < 0.5 ? 'man' : 'woman', skin: r(WARDROBE.skin.length), hair: r(WARDROBE.hair.length), shirt: r(WARDROBE.cloth.length), legs: r(WARDROBE.cloth.length), boots: r(WARDROBE.boots.length), height: Math.round((0.94 + ctx.random() * 0.12) * 100) / 100 });
    }
    s.look = L; apply(ctx);
  }
}
