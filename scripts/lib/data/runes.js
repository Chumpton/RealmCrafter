// THE 14 OSRS RUNES (OSRS-PLAN P0, research s31). One table: the shop, the spell costs, drops and the Pack all read it.
// Stackables ride player.state.supplies as counts (like coins and feathers). The three ids that already exist (water, body, earth) keep their ids.
// value = OSRS item value; high/low = alchemy payout (floor(0.6 / 0.4 x value)).
export const RUNES = {
  air:    { id: 'air-rune',    name: 'Air rune',    value: 4,   high: 2,   low: 1,  color: '#d8e4ee' },
  water:  { id: 'water-rune',  name: 'Water rune',  value: 4,   high: 2,   low: 1,  color: '#4a8fd8' },
  earth:  { id: 'earth-rune',  name: 'Earth rune',  value: 4,   high: 2,   low: 1,  color: '#8a6a3c' },
  fire:   { id: 'fire-rune',   name: 'Fire rune',   value: 4,   high: 2,   low: 1,  color: '#e0602a' },
  mind:   { id: 'mind-rune',   name: 'Mind rune',   value: 3,   high: 1,   low: 1,  color: '#d9a0c8' },
  body:   { id: 'body-rune',   name: 'Body rune',   value: 3,   high: 1,   low: 1,  color: '#7a5aa8' },
  cosmic: { id: 'cosmic-rune', name: 'Cosmic rune', value: 50,  high: 30,  low: 20, color: '#e8d870' },
  chaos:  { id: 'chaos-rune',  name: 'Chaos rune',  value: 90,  high: 54,  low: 36, color: '#c8b0a0' },
  nature: { id: 'nature-rune', name: 'Nature rune', value: 180, high: 108, low: 72, color: '#58a848' },
  law:    { id: 'law-rune',    name: 'Law rune',    value: 240, high: 144, low: 96, color: '#4868c8' },
  death:  { id: 'death-rune',  name: 'Death rune',  value: 180, high: 108, low: 72, color: '#303038' },
  blood:  { id: 'blood-rune',  name: 'Blood rune',  value: 400, high: 240, low: 160, color: '#b02028' },
  soul:   { id: 'soul-rune',   name: 'Soul rune',   value: 300, high: 180, low: 120, color: '#c8c8e8' },
  wrath:  { id: 'wrath-rune',  name: 'Wrath rune',  value: 500, high: 300, low: 200, color: '#e08038' },
};
export const RUNE_KEYS = Object.keys(RUNES);
// supply id -> label, for MON_SUPPLIES and the Pack (every rune)
export const RUNE_SUPPLIES = Object.fromEntries(RUNE_KEYS.map((k) => [RUNES[k].id, RUNES[k].name.toLowerCase() + 's']));
// den sources (s31): shop stock @ value (Aubury's six basic runes), tutor, staffs
export const RUNE_SHOP = { air: 5000, water: 5000, earth: 5000, fire: 5000, mind: 5000, body: 5000 };
export const TUTOR = { runes: { air: 30, mind: 30 }, everySec: 1800, onlyIfNone: true };
// an elemental staff counts as unlimited runes of its element (s37); only the staff of air exists today
export const STAFF_RUNES = { 'staff-air': ['air'] };
export const RUNE_BY_ID = Object.fromEntries(RUNE_KEYS.map((k) => [RUNES[k].id, { ...RUNES[k], key: k }]));
