// Ravnholt folk on the OSRS body (art/osrs-folk/build.py): one rig, two cuts (man, woman), five tint slots.
// Each villager is a row: their cut, their scale, and the five colours that make them themselves.
export const OSRS_BODY = {
  man: '/cdn/value.2dbf442d6034bf771c43a4456bfbc43b8d34a98a5a59ff2dd8c7963a4200d835.glb',
  woman: '/cdn/value.988bc9956c8802dbe0a2aebf8cec0ab62f2a90ccd96cbd6438f807ad21ac98cd.glb',
};
const SKIN = ['oklch(0.78 0.07 60)', 'oklch(0.70 0.08 55)', 'oklch(0.62 0.09 50)', 'oklch(0.52 0.08 45)', 'oklch(0.82 0.05 65)'];
const HAIR = { black: 'oklch(0.18 0.01 60)', brown: 'oklch(0.35 0.06 55)', auburn: 'oklch(0.42 0.12 40)', blond: 'oklch(0.75 0.10 85)', grey: 'oklch(0.70 0.01 90)', red: 'oklch(0.50 0.15 35)' };
// cut, scale, skin index, hair, shirt, legs (trousers or skirt), boots: the role reads in the clothes
export const FOLK_LOOK = {
  'rv-folk-hrolf':    { cut: 'man',   scale: 1.02, skin: 1, hair: 'brown',  shirt: 'oklch(0.55 0.08 70)',  legs: 'oklch(0.38 0.04 60)',  boots: 'oklch(0.28 0.04 50)' },  // porter: sacking tan
  'rv-folk-geira':    { cut: 'woman', scale: 0.96, skin: 0, hair: 'blond',  shirt: 'oklch(0.70 0.06 230)', legs: 'oklch(0.45 0.07 240)', boots: 'oklch(0.30 0.03 50)' },  // water carrier: well blue
  'rv-folk-oddny':    { cut: 'woman', scale: 0.95, skin: 4, hair: 'grey',   shirt: 'oklch(0.55 0.10 340)', legs: 'oklch(0.32 0.05 300)', boots: 'oklch(0.25 0.02 50)' },  // gossip: plum shawl
  'rv-folk-thorkel':  { cut: 'man',   scale: 1.04, skin: 2, hair: 'grey',   shirt: 'oklch(0.48 0.10 145)', legs: 'oklch(0.36 0.05 70)',  boots: 'oklch(0.26 0.03 50)' },  // old gossip: moss tunic
  'rv-folk-sveina':   { cut: 'woman', scale: 0.97, skin: 1, hair: 'auburn', shirt: 'oklch(0.78 0.04 90)',  legs: 'oklch(0.50 0.08 30)',  boots: 'oklch(0.30 0.03 50)' },  // sweeper: linen & rust
  'rv-folk-eirik':    { cut: 'man',   scale: 0.68, skin: 0, hair: 'blond',  shirt: 'oklch(0.60 0.15 25)',  legs: 'oklch(0.45 0.05 240)', boots: 'oklch(0.30 0.03 50)' },  // kid: red shirt
  'rv-folk-yrsa':     { cut: 'woman', scale: 0.64, skin: 3, hair: 'black',  shirt: 'oklch(0.75 0.12 95)',  legs: 'oklch(0.55 0.10 150)', boots: 'oklch(0.30 0.03 50)' },  // kid: buttercup
  'rv-folk-halvar':   { cut: 'man',   scale: 1.08, skin: 1, hair: 'black',  shirt: 'oklch(0.42 0.07 250)', legs: 'oklch(0.30 0.02 250)', boots: 'oklch(0.20 0.01 250)' }, // watch: steel blue
  'rv-folk-gunnhild': { cut: 'woman', scale: 1.00, skin: 2, hair: 'brown',  shirt: 'oklch(0.62 0.13 160)', legs: 'oklch(0.40 0.06 60)',  boots: 'oklch(0.28 0.03 50)' },  // shopper: teal
  'rv-folk-ketil':    { cut: 'man',   scale: 1.10, skin: 3, hair: 'red',    shirt: 'oklch(0.30 0.03 50)',  legs: 'oklch(0.33 0.03 60)',  boots: 'oklch(0.18 0.01 50)' },  // smith: leather & soot
  'rv-folk-ragna':    { cut: 'woman', scale: 0.97, skin: 0, hair: 'red',    shirt: 'oklch(0.85 0.02 90)',  legs: 'oklch(0.55 0.08 200)', boots: 'oklch(0.30 0.03 50)' },  // laundress: white blouse
  'rv-folk-arni':     { cut: 'man',   scale: 1.00, skin: 4, hair: 'auburn', shirt: 'oklch(0.50 0.09 40)',  legs: 'oklch(0.40 0.03 90)',  boots: 'oklch(0.35 0.05 55)' },  // traveller: road cloak
  'rv-folk-bodil':    { cut: 'woman', scale: 0.98, skin: 1, hair: 'brown',  shirt: 'oklch(0.68 0.12 60)',  legs: 'oklch(0.42 0.06 30)',  boots: 'oklch(0.28 0.03 50)' },  // helper: apricot
  'rv-folk-steinn':   { cut: 'man',   scale: 1.05, skin: 2, hair: 'brown',  shirt: 'oklch(0.58 0.05 110)', legs: 'oklch(0.35 0.04 80)',  boots: 'oklch(0.25 0.02 50)' },  // farmhand: sage
  'xr-folk-vigdis':   { cut: 'woman', scale: 0.99, skin: 2, hair: 'black',  shirt: 'oklch(0.55 0.14 300)', legs: 'oklch(0.35 0.06 280)', boots: 'oklch(0.26 0.02 50)' },  // violet
  'xr-folk-bjorn':    { cut: 'man',   scale: 1.12, skin: 1, hair: 'red',    shirt: 'oklch(0.45 0.10 25)',  legs: 'oklch(0.32 0.03 60)',  boots: 'oklch(0.22 0.02 50)' },  // big bjorn: oxblood
  'xr-folk-asa':      { cut: 'woman', scale: 0.94, skin: 4, hair: 'blond',  shirt: 'oklch(0.80 0.08 140)', legs: 'oklch(0.50 0.06 100)', boots: 'oklch(0.30 0.03 50)' },  // mint
  'xr-folk-leif':     { cut: 'man',   scale: 0.98, skin: 0, hair: 'blond',  shirt: 'oklch(0.66 0.09 210)', legs: 'oklch(0.38 0.04 230)', boots: 'oklch(0.28 0.03 50)' },  // sky blue
};
export function folkModel(id) {
  const L = FOLK_LOOK[id]; if (!L) return null;
  return { id: OSRS_BODY[L.cut], materials: { skin: { color: SKIN[L.skin] }, hair: { color: HAIR[L.hair] }, shirt: { color: L.shirt }, legs: { color: L.legs }, boots: { color: L.boots } } };
}

// THE WARDROBE (O → Character): a player's own OSRS world form. Every colour is a swatch index into these rows.
export const WARDROBE = {
  skin: SKIN,
  hair: Object.values(HAIR).concat(['oklch(0.92 0.02 90)', 'oklch(0.45 0.12 300)']),
  cloth: ['oklch(0.30 0.02 60)', 'oklch(0.55 0.08 70)', 'oklch(0.78 0.04 90)', 'oklch(0.60 0.15 25)', 'oklch(0.45 0.10 25)', 'oklch(0.68 0.12 60)',
          'oklch(0.75 0.12 95)', 'oklch(0.48 0.10 145)', 'oklch(0.62 0.13 160)', 'oklch(0.66 0.09 210)', 'oklch(0.42 0.07 250)', 'oklch(0.55 0.14 300)',
          'oklch(0.55 0.10 340)', 'oklch(0.20 0.01 250)', 'oklch(0.88 0.01 90)', 'oklch(0.12 0.15 265)'],
  boots: ['oklch(0.18 0.01 50)', 'oklch(0.30 0.03 50)', 'oklch(0.40 0.06 55)', 'oklch(0.25 0.03 250)', 'oklch(0.55 0.04 70)', 'oklch(0.45 0.10 30)'],
  height: { min: 0.9, max: 1.1, step: 0.02 },
};
export const LOOK_DEFAULT = { form: 'original', cut: 'man', skin: 1, hair: 1, shirt: 0, legs: 13, boots: 0, height: 1 };
// the clips a body in the OSRS form walks by (its rig plays the library by address)
export const OSRS_CLIPS = { idle: 'cdn/clip-idle-loop.glb', walk: 'cdn/clip-walk-loop.glb', run: 'cdn/clip-run-loop.glb', sit: 'cdn/clip-sit-loop.glb' };
export function lookModel(L) {
  const W = WARDROBE, c = (a, i) => a[Math.max(0, Math.min(a.length - 1, i | 0))];
  return { id: OSRS_BODY[L.cut === 'woman' ? 'woman' : 'man'], materials: { skin: { color: c(W.skin, L.skin) }, hair: { color: c(W.hair, L.hair) }, shirt: { color: c(W.cloth, L.shirt) }, legs: { color: c(W.cloth, L.legs) }, boots: { color: c(W.boots, L.boots) } } };
}
