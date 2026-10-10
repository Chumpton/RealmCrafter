// S14 General Merchant (plan section 23): STOCK = what he sells and the price you pay (130% of value at the general store, 100% on the fishing shelf);
// VALUE = every item's OSRS value, which sets what he pays (40%, rounded down, so a 1-coin bone sells for 0) and which three items you keep on death.
export const SELL = 0.4;
export const STEP = 0.03, MIN_BUY = 0.1, REGEN_MS = 60000; // OSRS general-store rules: 3 % per item away from base stock; buy-back never under 10 %; one item a minute drifts back to base
export const BASE = { tinderbox: 2 }; // a row's normal stock (default 5); items he does not sell have base 0, so anything sold to him is a surplus that drains away
export const SHOP_RANGE = 8; // m from the merchant before the window shuts
export const STOCK = [ // Lumbridge General Store's shelf (pot to hammer), then the plan's tinderbox / knife and Gerrant's fishing shelf
  { id: 'pot', price: 1 }, { id: 'jug', price: 1 }, { id: 'shears', price: 1 }, { id: 'bucket', price: 2 }, { id: 'bowl', price: 5 }, { id: 'cake-tin', price: 16 },
  { id: 'tinderbox', price: 1 }, { id: 'chisel', price: 1 }, { id: 'hammer', price: 1 }, { id: 'knife', price: 7 },
  { id: 'needle', price: 1 }, { id: 'thread', price: 1 }, { id: 'small-net', price: 5 }, { id: 'fishing-rod', price: 5 }, { id: 'fly-rod', price: 5 }, { id: 'harpoon', price: 5 }, { id: 'lobster-pot', price: 20 },
];
// the pack needs a name and colour for the ones the den had no item for (merged into ITEMS in data/skills.js)
export const SHOP_ITEMS = {
  pot: { name: 'Pot', color: '#9a6b4a' }, jug: { name: 'Jug', color: '#c8b48a' }, shears: { name: 'Shears', color: '#9aa0a6' }, bucket: { name: 'Bucket', color: '#7a5a3a' },
  bowl: { name: 'Bowl', color: '#c9a77a' }, 'cake-tin': { name: 'Cake tin', color: '#8a8f96' }, chisel: { name: 'Chisel', color: '#a8adb2' },
};
export const VALUE = {
  pot: 1, jug: 1, shears: 1, bucket: 2, bowl: 4, 'cake-tin': 13, chisel: 1, tinderbox: 1, knife: 6, 'small-net': 5, 'fishing-rod': 5, 'fly-rod': 5, harpoon: 5, 'lobster-pot': 20,
  bones: 1, 'big-bones': 1, cowhide: 1, 'raw-chicken': 1, 'raw-beef': 1, hammer: 1, 'chef-hat': 2, beer: 2, 'goblin-mail': 40, 'bronze-spear': 26, 'bronze-sq-shield': 48,
  'brass-necklace': 30, 'air-talisman': 4, 'energy-1': 35, 'energy-2': 72, 'energy-3': 108, 'energy-4': 145,
  'bronze-sword': 26, 'iron-sword': 91, 'iron-longsword': 140, 'iron-battleaxe': 182, 'iron-2h-sword': 280, 'wooden-shield': 20, 'staff-air': 1500,
  // creator 2026-10-05: the general store takes food, fish, logs and bows too (OSRS store values; burnt food and odd bones are worth 1)
  'logs-normal': 4, 'logs-oak': 20, 'logs-willow': 32, 'logs-maple': 50, 'logs-yew': 160, 'logs-magic': 320, 'logs-redwood': 410,
  'raw-shrimp': 5, shrimp: 5, 'raw-sardine': 10, sardine: 10, 'raw-herring': 15, herring: 15, 'raw-anchovies': 15, anchovies: 15, 'raw-trout': 20, trout: 20,
  'raw-pike': 25, pike: 25, 'raw-salmon': 50, salmon: 50, 'raw-tuna': 100, tuna: 100, 'raw-lobster': 150, lobster: 150, 'raw-swordfish': 200, swordfish: 200,
  'raw-monkfish': 230, monkfish: 230, 'raw-shark': 300, shark: 300, 'raw-anglerfish': 600, anglerfish: 600, chicken: 4, beef: 4, bread: 12, banana: 2, peach: 8,
  'bow-normal-short': 50, 'u-bow-normal-short': 23, 'bow-normal-long': 80, 'u-bow-normal-long': 40, 'bow-oak-short': 100, 'u-bow-oak-short': 50, 'bow-oak-long': 160, 'u-bow-oak-long': 80,
  'bow-willow-short': 200, 'u-bow-willow-short': 100, 'bow-willow-long': 320, 'u-bow-willow-long': 160, 'bow-maple-short': 400, 'u-bow-maple-short': 200, 'bow-maple-long': 640, 'u-bow-maple-long': 320,
  'bow-yew-short': 800, 'u-bow-yew-short': 400, 'bow-yew-long': 1280, 'u-bow-yew-long': 640, 'bow-magic-short': 1600, 'u-bow-magic-short': 800, 'bow-magic-long': 2560, 'u-bow-magic-long': 1280,
  'pick-bronze': 1, 'pick-iron': 140, 'pick-steel': 500, 'pick-black': 960, 'pick-mithril': 1300, 'pick-adamant': 3200, 'pick-rune': 32000, 'pick-dragon': 60000,
  needle: 1, thread: 1, leather: 1, 'hard-leather': 3, 'leather-gloves': 6, 'leather-boots': 6, 'leather-cowl': 24, 'leather-vambraces': 24, 'leather-body': 21, 'leather-chaps': 27, 'hard-leather-body': 170, coif: 38,
  'axe-bronze': 16, 'axe-iron': 56, 'axe-steel': 200, 'axe-black': 576, 'axe-mithril': 1040, 'axe-adamant': 2560, 'axe-rune': 32000, 'axe-dragon': 60000, bullmace: 8000,
};
for (const [k, n] of Object.entries(VALUE_SKILL)) if (!(k in VALUE)) VALUE[k] = n; // hand-set values above win
// AUBURY'S RUNES (OSRS-PLAN P2): a second shop. Stackable runes ride supplies; price = OSRS value (100%), buy-back 60% (s31). Stock is unlimited for now (price moves wait for the income check).
import { RUNES, RUNE_SHOP } from './runes.js';
import { VALUE_SKILL } from './values-skill.js';
export const SHOPS = {
  general: { title: 'GENERAL MERCHANT' },
  // THE YARD SMITH (research s29, OSRS shop prices): weapons, a shield, the starter staff and axes; he buys back at the general 40%
  smith: { title: 'THE YARD SMITH', stock: [
    { id: 'bronze-sword', price: 26 }, { id: 'iron-sword', price: 91 }, { id: 'iron-longsword', price: 140 }, { id: 'iron-battleaxe', price: 182 }, { id: 'iron-2h-sword', price: 280 },
    { id: 'wooden-shield', price: 20 }, { id: 'staff-air', price: 1500 }, { id: 'axe-bronze', price: 16 }, { id: 'axe-iron', price: 56 }, { id: 'axe-steel', price: 200 },
    { id: 'pick-bronze', price: 1 }, { id: 'pick-iron', price: 140 }, { id: 'pick-steel', price: 500 }, { id: 'pick-mithril', price: 1300 }, { id: 'pick-adamant', price: 3200 },
  ] },
  runes: { title: "AUBURY'S RUNES", buyBack: 0.6, stock: Object.keys(RUNE_SHOP).map((k) => ({ id: RUNES[k].id, price: RUNES[k].value, sup: true })) },
};
export const stockOf = (shop) => SHOPS[shop]?.stock ?? STOCK;
export const valueOf = (id) => VALUE[id] ?? (/^burnt-|bones$/.test(id) ? 1 : 0);

export const sellable = (id) => id in VALUE || /^burnt-|bones$/.test(id); // the goblin book, food and the rest he does not want
// The shack (scripts/gen/shop-shack.js) stands at SHACK.x/z facing -Z. The merchant walks a chain of spots A..F, in shack-local metres:
// A behind the counter, B past its end, C on the rug, D the doorway, E under the porch, F out in the yard. Dry: A. Rain: F, arms up to the sky. Storm: E.
export const SHACK = { x: 24, z: 79, h: 0.06, pace: 1.1, rain: 0.12, dry: 0.04, storm: 0.4, wake: 140,
  spots: [[-1.3, 0.55], [0.9, 0.55], [1.2, -1.3], [1.2, -2.7], [1.2, -3.7], [1.6, -5.6]],
  idle: { 0: ['idle', 'mend', 'look', 'brush', 'idle'], 4: ['look', 'stand'], 5: ['hang', 'stand', 'look', 'hang', 'wave'] } };
