// QUESTS (creator 2026-10-04: "put a yellow quest exclamation point over docker like WoW and give him a quest to give").
// One row per quest. scripts/quest-player.js runs them on the player's own body; scripts/lib/quest-hud.js draws the frame and tracker.
// need: { item, n } counts inv slots holding that item id; reward.xp is whole XP per skill.
export const QUESTS = {
  'longship-rations': {
    npc: 'docker', giver: 'Docker', title: 'Rations for the Longships', level: 1,
    text: "The longships sail for Holmvik at first light and the hold's as empty as a draugr's belly. I've got coin, I've got rope, what I haven't got is food.\n\nTake your net to the shallows off the pier, there's shrimp thick as gravel under the surf. Bring me five, raw, and you'll be paid like a proper deckhand.",
    objective: 'Net 5 raw Shrimps in the shallows off the pier and bring them to Docker.',
    progress: "Five shrimp, friend. The crew won't row on sea air.",
    complete: "Ha! Now that's a catch. The cook will stop cursing for a whole morning. Here, take this, you've earned it, and come back when you're ready for real work.",
    need: { item: 'shrimp', n: 5, label: 'Raw Shrimps' },
    reward: { coins: 150, xp: { fishing: 250 } },
  },
  'eldertide': {
    npc: 'green-dragon', giver: 'Eldertide', title: 'The Old Tide Wakes', level: 1, markY: 9.6, markW: 1.6,
    text: "Small one. I have slept on this hill since before your longhouses had roofs, and the beasts of the wilds grow bold while I dream.\n\nBring me the bones of five of them. Not for hunger. For memory: I keep count of every creature that walks my valley.",
    objective: 'Bring 5 Bones to Eldertide, the green dragon by the Ravenholdt gate.',
    progress: "Five bones, small one. The count is not yet whole.",
    complete: "Hrrm. Five. The valley is quieter for it. Take this gold from my hoard, and know that Eldertide remembers your name.",
    need: { item: 'bones', n: 5, label: 'Bones' },
    reward: { coins: 250, xp: { prayer: 200 } },
  },
};
// need.flag: a counter on the player (s.qc[flag]) instead of items; it starts at 0 when the quest is accepted
QUESTS['straw-and-steel'] = {
  npc: 'camp-dwarf', giver: 'Bruni Emberbeard', title: 'Straw and Steel', level: 1, markY: 2.05,
  text: "Oi, you! Aye, you with the soft hands. Name's Bruni Emberbeard, and this is my camp, so you'll pull your weight in it.\n\nRoad past the hill's got teeth these days. Before I let you walk it, I want to see you swing. That straw fellow by the tent has stood up to better than you. Give him ten honest blows and we'll talk.",
  objective: 'Strike the training dummy at Bruni\'s camp 10 times.',
  progress: "Ten, I said. He's still smiling at you, lad. Hit him like he owes you coin.",
  complete: "Ha! Now that's an arm. Straw everywhere and the post still standing, just how I like it. Here, a little something from the camp purse. Keep that edge sharp.",
  need: { flag: 'dummyHits', n: 10, label: 'Strikes on the training dummy' },
  reward: { coins: 75, xp: { attack: 150, strength: 150 } },
};
QUESTS['teeth-in-the-hollow'] = {
  npc: 'sv-warden', giver: 'Warden Maelis', title: 'Teeth in the Hollow', level: 6, markY: 2.45,
  text: "Easy, traveller. You've come through at a good hour and a bad one. The vale's in bloom, the hives are heavy, and the gnolls of Dust Hollow have found the road.\n\nThey came up out of the dry wash in the south-east, behind those barricades, and they're bold now. Grakk leads them. Thin their numbers before they reach the farm. Eight of them will do. And if Grakk himself falls, so much the better.",
  objective: 'Defeat 8 Hollow gnolls at the Dust Hollow camp, south-east down the road, and return to Warden Maelis at the portal dais.',
  progress: "The hollow's still howling. Eight, traveller. The farm can't hold if they come in force.",
  complete: "Quieter already. I can hear the bees again. Here, take this from the warden's purse, and keep your blade near: the ridge bandits to the east are watching what you did.",
  need: { flag: 'gnollKills', n: 8, label: 'Hollow gnolls defeated' },
  reward: { coins: 200, xp: { attack: 300, strength: 300, defence: 200 } },
};
// a kill counts toward a quest: monster kind -> { id, flag }
QUESTS['scales-in-the-mere'] = {
  npc: 'mf-wenna', giver: 'Old Wenna', title: 'Scales in the Mere', level: 10, markY: 2.2,
  text: "Mind the boards, dearie, half of them are rotten and the other half are worse.\n\nThe mire murlocs have come up out of the Black Mere and they're nesting in the bog east of here, right where I cut my reeds. They take my nets, they take my eels, and last night one of them took my kettle.\n\nThin them out. Eight should teach the rest some manners. Bring me back the quiet.",
  objective: 'Defeat 8 Mire murlocs in the eastern bog of Murkfen and return to Old Wenna at Hag\'s Rest.',
  progress: "Still gurgling out there, dearie. I can hear them from the porch.",
  complete: "There. Listen to that. Just frogs. Here, a little something from the jar, and a word: the gnolls in the western hollow follow a brute called Gorrak. Don't go alone.",
  need: { flag: 'fenMurlocKills', n: 8, label: 'Mire murlocs defeated' },
  reward: { coins: 320, xp: { attack: 450, strength: 450, defence: 300 } },
};
QUESTS['rustfur-hunt'] = {
  npc: 'ew-corwen', giver: 'Huntsman Corwen', title: 'The Rustfur Hunt', level: 13, markY: 2.3,
  text: "Keep your voice down. Hear that? Nothing. No crows, no squirrels. That's the Rustfurs.\n\nGreymane's pack came down off the southern rise when the leaves turned, and they've been running the valley ever since. They took the Hollins' last goat, and now they've started on the woodcutters.\n\nThin the pack. Eight pelts. They hunt the open ground between the groves and den up on the rise past the Emberheart.",
  objective: 'Defeat 8 Rustfur timber wolves in Emberwood and return to Huntsman Corwen at the arrival terrace.',
  progress: "Still hear 'em howling at dusk. Eight, friend.",
  complete: "That's the sound I wanted. Crows again. Take this, you earned it. And if you're feeling brave, Greymane himself lairs on the rise. Bring me his mane and I'll buy you a drink in every town in the realm.",
  need: { flag: 'emberWolfKills', n: 8, label: 'Rustfur wolves defeated' },
  reward: { coins: 420, xp: { attack: 600, strength: 600, defence: 400 } },
};
QUESTS['frostmaw-cull'] = {
  npc: 'fp-brumli', giver: 'Thane Brumli Coldforge', title: 'Teeth in the Pass', level: 18, markY: 2.0,
  text: "Ach, another warm body! Good. We need every one.\n\nThe Frostmaw bears came down early this year, hungry and bold. Two of my lads got mauled hauling timber, and the gryphons won't land while the beasts prowl the lake.\n\nYou look like you can swing. Six Frostmaw bears. They range round Glimmermere and den in the cliff to the west. Bring the pass back to us.",
  objective: 'Defeat 6 Frostmaw bears in Frostpeak and return to Thane Brumli at the arrival terrace.',
  progress: "Still hear 'em, still smell 'em. Six, lad.",
  complete: "Ha! The gryphons are already circling lower. Here, take this, and drink one on me at the Ironhold. If you're mad enough, Old Frostmaw herself sleeps at the back of that den.",
  need: { flag: 'frostBearKills', n: 6, label: 'Frostmaw bears defeated' },
  reward: { coins: 600, xp: { attack: 900, strength: 900, defence: 600 } },
};
QUESTS['greyback-trouble'] = {
  npc: 'vg-aldric', giver: 'Brother Aldric', title: 'Greybacks in the Lambing Fields', level: 4, markY: 2.0,
  text: "Light keep you, traveller. You've come to Northvale at a gentle season, mostly.\n\nThe greyback pups have grown bold this spring. They come over the brook at dawn and worry the lambs in the south meadow, and Sister Maren will not let the flock out.\n\nWould you thin them for us? Eight young greybacks. Their dell lies past the meadow, beyond the old shepherd path.",
  objective: 'Defeat 8 young greyback wolves in Verdant Glade and return to Brother Aldric at the abbey.',
  progress: "The lambs still cry at night. Eight, friend, and the Light will thank you.",
  complete: "Sister Maren saw the flock graze the whole meadow this morning. Bless you. Take this, and if you find their mother, the big grey one, the dell will be quiet for good.",
  need: { flag: 'gladeWolfKills', n: 8, label: 'Young greybacks defeated' },
  reward: { coins: 120, xp: { attack: 200, strength: 200, defence: 120, prayer: 80 } },
};
QUESTS['squash-thieves'] = {
  npc: 'td-brack', giver: 'Constable Hollis Brack', title: 'Snouts in the Squash', level: 9, markY: 2.0,
  text: "Evening. Don't mind the pitchforks, we're all a bit jumpy in Thistledown this week.\n\nA pack of Snarlmane gnolls has dug in on the shelf past the squash fields. They raid the Brackwater rows every dusk, and old Tamsin swears she saw one carry off a pumpkin bigger than its head.\n\nTake eight of them down. Brutes count, and if you find Snarlmane himself, so much the better. Follow the south road over the mill bridge.",
  objective: 'Defeat 8 Snarlmane gnolls in Thistledown and return to Constable Brack at the village well.',
  progress: "Still hear them yipping at dusk. Eight, friend.",
  complete: "Tamsin counted every pumpkin twice this morning and didn't come up short once. Here, from the village purse. Supper at the Thistle & Ladle is on me tonight.",
  need: { flag: 'tdGnollKills', n: 8, label: 'Snarlmane gnolls defeated' },
  reward: { coins: 260, xp: { attack: 420, strength: 420, defence: 280 } },
};
QUESTS['road-toll'] = {
  npc: 'or-dane', giver: 'Sergeant Dane Holloway', title: 'Toll of the Old Road', level: 11, markY: 2.0,
  text: "Halt. Gate's open, traveller, but I'd not walk it alone.\n\nGerrick Blackhand's lot camp on the wooded shelf west of the crossroads. They tip wagons in the cut south of here and call it a toll. Three merchants this week, and the last one walked back to me in his smallclothes.\n\nThin them out. Eight of Blackhand's crew, and if you meet Gerrick himself, bring me his word he's done. Take the spur at the meeting stone and climb.",
  objective: 'Defeat 8 of Blackhand\'s bandits on the Old Road and return to Sergeant Holloway at the tower checkpoint.',
  progress: "Wagons are still turning back at the cut. Eight, I said.",
  complete: "First caravan in a week rolled through at noon, wheels and all. The crown pays its debts. Here, and drink something warm at the waystation.",
  need: { flag: 'orBanditKills', n: 8, label: 'Blackhand bandits defeated' },
  reward: { coins: 320, xp: { attack: 520, strength: 520, defence: 340 } },
};
export const KILL_QUESTS = { 'bw-boar': { id: 'beastwild-cull', flag: 'bwBeastKills' }, 'bw-gnoll': { id: 'beastwild-cull', flag: 'bwBeastKills' }, 'bw-hogger': { id: 'beastwild-cull', flag: 'bwBeastKills' }, 'bw-princess': { id: 'beastwild-cull', flag: 'bwBeastKills' }, 'or-bandit': { id: 'road-toll', flag: 'orBanditKills' }, 'or-cutter': { id: 'road-toll', flag: 'orBanditKills' }, 'or-boss': { id: 'road-toll', flag: 'orBanditKills' }, 'td-gnoll': { id: 'squash-thieves', flag: 'tdGnollKills' }, 'td-brute': { id: 'squash-thieves', flag: 'tdGnollKills' }, 'td-chief': { id: 'squash-thieves', flag: 'tdGnollKills' }, 'glade-wolf': { id: 'greyback-trouble', flag: 'gladeWolfKills' }, 'glade-mother': { id: 'greyback-trouble', flag: 'gladeWolfKills' }, 'frost-bear': { id: 'frostmaw-cull', flag: 'frostBearKills' }, 'frost-matron': { id: 'frostmaw-cull', flag: 'frostBearKills' }, 'ember-wolf': { id: 'rustfur-hunt', flag: 'emberWolfKills' }, 'ember-alpha': { id: 'rustfur-hunt', flag: 'emberWolfKills' }, 'fen-murloc': { id: 'scales-in-the-mere', flag: 'fenMurlocKills' }, 'fen-tidehunter': { id: 'scales-in-the-mere', flag: 'fenMurlocKills' }, gnoll: { id: 'teeth-in-the-hollow', flag: 'gnollKills' }, 'gnoll-chief': { id: 'teeth-in-the-hollow', flag: 'gnollKills' } };
export const QUEST_OF_NPC = { 'bw-kesh': 'beastwild-cull', docker: 'longship-rations', 'green-dragon': 'eldertide', 'camp-dwarf': 'straw-and-steel', 'sv-warden': 'teeth-in-the-hollow', 'mf-wenna': 'scales-in-the-mere', 'ew-corwen': 'rustfur-hunt', 'fp-brumli': 'frostmaw-cull', 'vg-aldric': 'greyback-trouble', 'td-brack': 'squash-thieves', 'or-dane': 'road-toll' };
export const QUEST_MARK = { y: 2.12, bob: 0.07 }; // m above the giver's feet (over his nameplate)

// Deepdelve (zone-caves): Foreman Durgan at the mine mouth wants the kobolds out of the warren.
QUESTS['candles-in-the-dark'] = {
  npc: 'ca-durgan', giver: 'Foreman Durgan', title: 'Candles in the Dark', level: 8, markY: 1.9,
  text: "Keep your candle lit and your hand on your purse, lad.\n\nThe kobolds came up out of the west warren a week back. They pinch our candles, they pinch our picks, and last shift they pinched the cart with my lunch in it. \"You no take candle,\" they squeak. It's MY candle!\n\nFollow the lamps west past the cart yard. Thin them out. Eight should do. And if you meet the fat one with the gold tooth, he's the one wearing my helmet.",
  objective: 'Defeat 8 Kobold vermin in the west warren of Deepdelve and return to Foreman Durgan at the mine mouth.',
  progress: "Still hear 'em squeaking down there. Eight, lad.",
  complete: "Quiet as a tomb. Lovely. Here's your pay, and mind the gallery to the south-east: the spiders down there don't squeak, they just bite.",
  need: { flag: 'ddKoboldKills', n: 8, label: 'Kobold vermin defeated' },
  reward: { coins: 260, xp: { attack: 380, strength: 380, defence: 260 } },
};
Object.assign(KILL_QUESTS, { 'dd-kobold': { id: 'candles-in-the-dark', flag: 'ddKoboldKills' }, 'dd-goldtooth': { id: 'candles-in-the-dark', flag: 'ddKoboldKills' } });
Object.assign(QUEST_OF_NPC, { 'ca-durgan': 'candles-in-the-dark' });

// Crown District (zone-city): Captain Elric Haverd at the arrival dais wants the canal cutpurses gone.
QUESTS['light-fingers'] = {
  npc: 'ci-haverd', giver: 'Captain Elric Haverd', title: 'Light Fingers', level: 11, markY: 2.2,
  text: "Welcome to the Crown District, friend. Keep a hand on your coin purse.\n\nThe cathedral bells ring on the hour and the pickpockets work between them. They lurk in the canal alleys west of the market, behind the tavern yard and down by the barracks wall, and my guards can't be everywhere at once.\n\nTeach eight of them some manners. If you meet the one with the silk gloves, Silkfinger Vane, bring him down too.",
  objective: 'Defeat 8 cutpurses or canal thugs in the Crown District alleys and return to Captain Haverd at the arrival dais.',
  progress: "My men still count purses gone missing. Eight, friend.",
  complete: "The market's coin stays in the market tonight. The Crown thanks you. This is from the guard's own purse.",
  need: { flag: 'ciCutpurseKills', n: 8, label: 'Cutpurses defeated' },
  reward: { coins: 320, xp: { attack: 450, strength: 450, defence: 300 } },
};
Object.assign(KILL_QUESTS, { 'ci-cutpurse': { id: 'light-fingers', flag: 'ciCutpurseKills' }, 'ci-thug': { id: 'light-fingers', flag: 'ciCutpurseKills' }, 'ci-boss': { id: 'light-fingers', flag: 'ciCutpurseKills' } });
Object.assign(QUEST_OF_NPC, { 'ci-haverd': 'light-fingers' });

// Sunscorch (zone-desert): Elder Tahna at the nomad camp wants the canyon road clear of vipers.
QUESTS['fangs-on-the-trade-road'] = {
  npc: 'de-tahna', giver: 'Elder Tahna Dustwalker', title: 'Fangs on the Trade Road', level: 12, markY: 2.2,
  text: "Sit, drink, the water is sweet from the oasis.\n\nOur caravans take the dry canyon to the boar ravine and the east. This season the Sandscale vipers nest in every crack of it. Two of our pack-runners came back with swollen legs and one did not come back.\n\nEight vipers, traveller. Walk the canyon road and make it safe to walk again.",
  objective: 'Defeat 8 Sandscale vipers in the dry canyon of Sunscorch and return to Elder Tahna at the nomad camp.',
  progress: "The canyon still hisses at night. Eight, traveller.",
  complete: "The runners will sing your name tonight by the braziers. Take this, and if you go further, keep clear of the webs under the west mesas.",
  need: { flag: 'deViperKills', n: 8, label: 'Sandscale vipers defeated' },
  reward: { coins: 380, xp: { attack: 520, strength: 520, defence: 340 } },
};
Object.assign(KILL_QUESTS, { 'de-viper': { id: 'fangs-on-the-trade-road', flag: 'deViperKills' } });
Object.assign(QUEST_OF_NPC, { 'de-tahna': 'fangs-on-the-trade-road' });

// Beastwild (zone-creatures): Warden Kesh at the statue plaza keeps the preserve from spilling over.
QUESTS['beastwild-cull'] = {
  npc: 'bw-kesh', giver: 'Warden Kesh Talonbrook', title: 'Tusks and Teeth', level: 20, markY: 2.0,
  text: "Easy now. Move slow round here, everything in the preserve is bigger than it ought to be.\n\nThe tusked boars have been breeding like rabbits down the wallow, and Hogger's Riverpaws keep crossing the Roarwater to raid my aerie. The gryphons won't settle with them about.\n\nThin them. Ten beasts: boars from Princess's wallow south of the river, or gnolls from Hogger's camp to the west. Mind the big ones. They have names for a reason.",
  objective: "Defeat 10 tusked boars or Riverpaw gnolls in Beastwild and return to Warden Kesh at the statue plaza.",
  progress: "Still hear the boars rooting at night. Ten, friend.",
  complete: "The gryphons are landing again. You hear that? That's the sound of a quiet preserve. Take this. And if you've the nerve, the green wyrm sleeps on the crag to the south. Nobody's come back from there with more than a story.",
  need: { flag: 'bwBeastKills', n: 10, label: 'Beastwild beasts defeated' },
  reward: { coins: 700, xp: { attack: 1100, strength: 1100, defence: 750 } },
};
