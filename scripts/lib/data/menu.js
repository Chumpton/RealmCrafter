// The right-click menu (OSRS style): colours of the target word by what it is, and examine lines. One entry list per thing, built in menu-core.js.
export const COL = { npc: '#ffff00', obj: '#00ffff', item: '#ff9040', player: '#ffffff', foe: '#ffff00' };
export const MENU = { reach: 8, walkMax: 1000, maxRows: 24, headline: 'Choose Option' }; // walkMax: click-to-walk reach in m (creator 2026-10-06: infinite)
export const EXAMINE = {
  chicken: 'Yep, definitely a chicken.', cow: 'Converts grass to beef.', goblin: 'An ugly green creature.', bull: 'He has a look in his eye. A heavy, snorting look.',
  'general-merchant': 'He sells a bit of everything, and loves the rain.', gravestone: 'A marker for gear someone could not carry home.',
  'axe-bronze': 'A woodcutter\'s axe.', tinderbox: 'Useful for lighting fires.', 'small-net': 'Useful for catching small fish.', knife: 'A dangerous looking knife.', hammer: 'Good for hitting things.',
  bread: 'Nice crusty bread.', bones: 'Bones are for burying.', 'big-bones': 'Big bones, from something big.', cowhide: 'Fresh from a cow, and still smelling of it.', bullmace: 'A leg bone as heavy as a club.',
  'raw-chicken': 'I should cook this first.', 'raw-beef': 'I should cook this first.', 'chef-hat': 'A hat for a cook.', beer: 'A glass of frothy ale.',
};
export const TREE_EXAMINE = 'A tree, ready for an axe.';
// examine lines for things that are not monsters / items: the first prefix that matches the object id (or a parent id) wins; anything else gets a plain "It's a ..." line
export const EXAMINE_PREFIX = [
  ['general-shack', 'The General Merchant\'s shack. It smells of bread and rope.'], ['pen-fence', 'A wooden fence to keep the animals in.'], ['cow-gate', 'A sturdy gate. It opens with a creak.'],
  ['henyard', 'Everything a hen could want.'], ['grove-', 'A tree, ready for an axe.'], ['dock-', 'Part of the working dock.'], ['pen-prop-coop', 'A cosy hut for hens.'], ['pen-prop-hay', 'A bale of hay.'],
  ['pen-prop-stable', 'A stable for a horse that is not here.'], ['pen-prop-well', 'A well. The water is cold and clear.'], ['wild-trees', 'Trees, growing as trees do.'], ['wild-plants', 'Plants and grass.'],
  ['creek', 'Water from the hills, on its way to the lake.'], ['hall', 'The longhouse, where everyone starts.'],
];
export const GATE_EXAMINE = 'A sturdy gate. It opens with a creak.';
