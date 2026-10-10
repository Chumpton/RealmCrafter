# Mellowbrook zone bible
One page per portal room. Each mound on the ring around the Buddha is a door to its own world, built from that mound's assets.
Sunreach Vale (zone-summer) is the template every other zone copies. Its numbers are measured from the build. The other eleven pages are the brief for when each one gets built.
Compiled 2026-10-10 from Campton's passes (#15179 principles sheets, #15396, #15455, #15706, #15837, #16220, #16264, #16593, #16830, #17084, the Westfall farmstead pass) and the standing rulings.

---------------------------------------------------------------
## Part 1: the philosophy every zone follows

### 1. Shape before stuff
- A zone is a valley, about 450 m across, ringed by ridges. No flat field and no edge of the map you can see.
- You arrive on a raised terrace about 6 m up. The first frame looks down the main road at one tall landmark (Sunreach: the Tower of Azora on its 28 m mesa).
- Carve the land first: rises behind every centrepiece, hollows where water or grass gathers, slopes the body can walk.
- Every zone needs a sightline. You crest a ridge, the valley opens, and one thing contrasts with the rest.

### 2. Rooms, not scatter
- A zone holds 5 to 7 gameplay rooms, each 40 to 80 m across, with open ground between them.
- Each room is a cluster: a hero building or feature, its props, its NPC or enemies, its own ground.
- Room types (the #15179 sheet): **tactical camp** (enemies, tents, fire, barricades), **interactive village/farm** (a friendly NPC, a quest, animals), **fortified post** (tower, training yard), **ruin or landmark** (mesa, statue, giant tree), plus **water** (pond, creek, shore).
- Friendly rooms sit near the arrival point and hostile rooms farther out. The quest giver stands at the portal dais (Warden Maelis in Sunreach).

### 3. Road hierarchy
- One main road (6 m, gravel or flagstone) runs from the gate to the landmark. Beaten paths of 3 to 4 m branch off to each room. Tracks of 1 to 2 m run between props.
- Every road gets 4 or more details (ruling): wheel ruts (two dark grooves with a grass line between), fence posts on the bends, milestones, lanterns, low boulders, mud at forks.
- Roads braid where feet would wear them. A fork gets a mud patch and a post.

### 4. Clustering and canopy
- Trees grow in groves of 5 to 8 with overlapping crowns, never one or two alone on a ridge. Open meadow lies between groves.
- WoW-scale canopies: big crowns, thick trunks. A couple of hero giant trees per zone (Sunreach: sv-huge-pond, sv-huge-fair).
- Every tree cluster gets underbrush bushes and a stone or log at its foot.
- Crops are oversized and readable: giant pumpkins, big cabbages, tall wheat. No flat patterns.

### 5. Ground: restrained, feathered
- About 80% of the ground is the zone's base layer. Accents are used only where the story puts them: sand where water meets land, soil on tilled plots, gravel on roads, rock on slopes over 0.3, flowers on sunlit crests.
- Use textures the project already has (grass webp, cobblestone, beaten dirt). No new themed ground colours (ruling).
- Every edge feathers. Plot boundaries blend over about 3 m with noise (zone-summer-ground.js `sd` + sstep). Path marks carry `noise` 0.3 to 0.9 and `falloff` 1 to 1.2. Never a hard stair-step.

### 6. Dressing: every room tells who lives there
- Rule of three layers: hero piece → mid props (fences, wagons, racks, tents) → ground clutter (cobbles, weeds, vines, sacks, crates).
- Flank landmarks with light: braziers with fire fx, lanterns with a real point light (intensity 1.5 to 2, distance 9).
- Enclosures: continuous fences with one gate or a 3 m gap where the path meets them.
- Every NPC gets a post: a signpost and lantern, a fire ring, a weapon rack or grain sacks behind them, and a shade tree.
- Nothing bare sits on dirt. Pumpkins sit on vine mats, tents on scorched ground, boulders in families of 2 to 4.
- Doorways are walkable at player size. Use the proper fitting building, or draw one in the same style (ruling).

### 7. Life
- Ambient: a bird flock pivot per region (sv-flock.js), butterflies, bees at hives, pollen or seed air, a birdsong or wind bed (gain about 0.15).
- Friendly animals in farms and pastures. Hostile wildlife on routes between rooms. No large patch is left empty (#17084).
- Encounters: packs of 3 to 5 with pack aggro, rare solo roamers (1 or 2 per zone), one named rare (Old Honeypaw). Camps hold a crew that idles by the fire (rest 0.7, wander ×0.4, wake 600 m), plus a chief.
- Every enemy is rigged: Idle, Walk, Run, Attack, Death clips (`rig: true` rows in monsters.js). Routes are `state.route` waypoint pairs [x,z].

### 8. Light and air
- Each zone picks one hour and holds it (summer: frozen 13.5 h, sun at about 66°). Shadows are soft navy, never black.
- Distance fog matches the horizon colour so mountain bases blend.
- The look runs through scripts/look-den.js. Every frame stays readable and is worth a screenshot.

### 9. Level of detail: the visibleRange tiers
The tiers measured in Sunreach. Copy them.
| tier | max m | what |
|---|---|---|
| landmark | 1400–2000 | mesa tower, giant trees, ridge hero |
| canopy | 700–900 | trees, oaks, groves |
| light | 600 | lanterns, braziers, tents, racks, buildings |
| prop | 200–300 | fences, wagons, crates, scarecrows, farm props |
| clutter | 110–180 | rocks, bushes, sacks, wildflower drifts |
| micro | 50–90 | weeds, vines, cobbles, tufts |
- Scripted props (scripts/gen/sv-props.js) thin their own triangles with `ctx.lod` (wildflowers and vines divide their count by the lod).
- Instanced grass blades: density 14, maxDistance 40, budget 30k.
- Micro clutter has no collider. Props get a box collider. Walk-through drifts never block.

### 10. Assets
- Use only our build assets (ruling): the zone's mound palette (art/zone-sets.mjs), the Elwynn kit (elw-*), capital props (sm_prop_capital_*), and our own scripted props in sv-props.js (zigrail, vines, firering, lanternpost, brazier, spit, milestone, cobbles, weeds, reeds, pier, farmgate, bridge, runearch, barricade, hive, blanket, sunshade, wildflowers).
- Pipeline: art/<zone>-zone.mjs → json → placements in places/<zone>/cells/*.scene. Ids are prefixed per zone (Sunreach: sv- base, svd- detail, svw- wildflower and rock, svx- wildlife, svc- camps, svp- plot dressing).

### 11. The checklist before a zone ships
1. Walk it from the arrival terrace to the deepest room in the player view, not an aerial.
2. Each room has a hero piece, props, clutter, light, and life.
3. No empty quarter of 60 m or more without an animal, enemy, or point of interest.
4. Every camp shows idle enemies on arrival.
5. Every doorway can be walked into. Every fence has its gap.
6. The quest giver's ! and ? cursors read correctly.

---------------------------------------------------------------
## Part 2: the portal rooms
Mound ring: radius 115 around (-18.5, -63.6). Each gate crosses to `+zone-<k>#zhome-<k>` and back to `+main#zgate-<k>`. The mound palette is the zone's asset list.

### Sunreach Vale (summer) · BUILT
- **Identity:** a midsummer farming valley with golden-green grass, oversized harvest crops, and a mesa tower on the horizon.
- **Hour:** 13.5 frozen. Sky azure, soft cumulus.
- **Palette:** pavilion tent, elw-barn, azr giant trees, oaks, haystacks, pumpkins, wheelbarrow, sacks, barrels, crates, tables, capital braziers, lanterns, berry bushes.
- **Rooms:** portal terrace and dais (Warden Maelis) · harvest farm (-90,-110: fenced pumpkin plot, wheat, paddock, Hob Thistledown's post, scarecrow) · Sunfair meadow (60,-60: pavilion, stalls) · ridge outpost (130,-170: guard tower, training yard) · Sunpond (-70,-230: pier, willows, lilies, apiary, picnic) · Dust Hollow (110,-262: gnoll camp) · the mesa (0,-300).
- **Life:** cows, pigs, chickens, prairie dogs. Vale wolf packs and pups, trail boars, Old Honeypaw. 8 camps: gnolls, bandits, poachers.
- **Ground:** grass and gold grass about 80%, flowers on crests, soil plots, wheat field, sand at the pond and wash.
- 2026-10-10 design pass: walked every room at eye height; nav, camps (8, all manned), road details and light all held. Filled the three empty 60 m quarters with groves + underbrush (67 svq-* placements, tag sv-pass-1010): the knoll east of the creek (82,-205)/(106,-226) with a woodcutter's clearing (72,-230), a pine copse on the SW slope (-145,-318), palms and scrub behind Dust Hollow (148,-316); butterflies in each.

### Verdant Glade (spring)
- **Identity:** first green. Blossom trees around a chapel and abbey, wet meadows, deer in the mist. Gentle and starter-friendly.
- **Hour:** 9 (morning). Light fog in the hollows, dew sparkle.
- **Palette:** elw-chapel, elw-abbey · highland-lake trees, hyjal trees, elw-oak, forest_tree_083, emerald-dream fountain tree · highland shrubs, berry bushes, elw-bush · rock, log, stump, bench, lanterns, flowers.
- **Rooms:** abbey grounds (friendly hub, quest) · the fountain-tree grove (landmark) · a lambing meadow · a flooded brook with stepping stones · an overgrown shrine ruin · a kobold-free starter camp (bandits or wolves).
- **Life:** deer, rabbits, squirrels, cats. Young wolves. A swarm of butterflies at the fountain tree.
- **Ground:** spring grass base, flowers dense, mud only at the brook.

### Emberwood (autumn)
- **Identity:** Redridge-scale red and gold forest. Huge canopies, a lonely farmhouse, harvest gone feral. Keep the general feel (ruling).
- **Hour:** 16.5, long amber light. Leaves drift.
- **Palette:** elw-farmhouse · kalidar trees, darkshore trees, deadwind-pass trees · kalidar bushes · pumpkins, scarecrow, log, stump, rock, lanterns, mushrooms.
- **Rooms:** the abandoned farmstead (fenced, gone to seed) · a spider hollow under the darkest canopy · a boar wallow · a ridge copse village · a woodcutter's camp · micro-biomes of mushroom rings.
- **Life:** timber wolves, stonetusk boars, forest spiders.
- **Ground:** fallen-leaf grass base. Main roads and beaten paths each get 4+ details (Redridge ruling).

### Frostpeak (winter)
- **Identity:** dwarven high pass. Snow towers, pines, an aerie. Cold blue shadow and warm firelight.
- **Hour:** 11, low white sun. Snowfall fx, breath.
- **Palette:** dwarven snow tower, snow stable · elw-pine, forest pines (tall, small), aerie trees · aerie-peaks bushes, saplings · firewood, rock, log, campfire, capital braziers. Snow assets only (ruling).
- **Rooms:** dwarf outpost (hub, quest) · the gryphon aerie on a crag (landmark) · a frozen lake · a bear den cave mouth · a wolf ridge · a woodcutter's line of firewood stacks.
- **Life:** forest bears, mangy wolves, white gryphons overhead.
- **Ground:** snow drifts base, rock on slopes, packed snow on roads.

### Crown District (city)
- **Identity:** a capital quarter. Cathedral, statues, awnings, a fountain square. Stone, banners, crowds.
- **Hour:** 14. Clean, high light.
- **Palette:** capital cathedral · capital statues (archmage, paladin, ranger, warrior), vendor awning, gypsy wagon, fountain · park benches, grand planters, mailbox, ale kegs · capital streetlamps (regular and tall).
- **Rooms:** cathedral square (landmark) · market row · the statue promenade · a canal walk · a tavern yard · a guard barracks. Every doorway at player size; fitting buildings or drawn in the same style (Crayke ruling).
- **Life:** royal guards, nobles, shopkeepers, children. Pickpockets as the hostile layer.
- **Ground:** mossy cobblestone, limestone flags on the squares, planters for green.

### Thistledown (village)
- **Identity:** an Elwynn hamlet. An inn, a town hall, a smithy's ring of sound, washing lines. The friendliest zone.
- **Hour:** 12.
- **Palette:** elw-inn, elw-townhall · farmhouse, smithy, stables, silo, barn, oaks · fences, haystacks, scarecrow, stall, wheelbarrow · barrels, crates, firewood, lanterns.
- **Rooms:** village green and well (hub, quests) · inn yard · smithy and stables · farms on the edge · a mill by the stream · a defias hideout in the woods beyond.
- **Life:** peasants, milkmaids, sheep, horses.
- **Ground:** grass base, beaten dirt lanes, ruts at the gate.

### The Old Road (road)
- **Identity:** a travel route through wooded country. A guard tower, wagons, a meeting stone, bandits in the trees.
- **Hour:** 17.
- **Palette:** elw-guardtower · canopyless trees, highland-lake trees, wagon, haywagon · signpost, wheelbarrow, sack, meeting stone · crates, barrels, rocks, lanterns.
- **Rooms:** the tower checkpoint (hub) · a broken-wagon ambush · the meeting stone crossroads · a bandit camp off-road · a waystation · a bridge over a gorge.
- **Life:** pack mules, defias bandits, highway bandits.
- **Ground:** packed dirt road with heavy ruts and milestones every bend. The road is the whole zone's spine.

### Saltmere Harbor (harbor)
- **Identity:** a sunlit cove port. A transport ship at the pier, palms, rowboats, murlocs on the reef.
- **Hour:** 15. Sea glitter.
- **Palette:** transport ship · durotar palms, coral trees · canal rowboat, crates, barrels, canal lamps, sacks, darkshore bushes.
- **Rooms:** the docks (hub, quest) · the ship (landmark) · fish market · lighthouse point · murloc reef camp · a smugglers' cave.
- **Life:** murloc coastrunners, foragers, tidehunters. Gulls.
- **Ground:** sand at the shore, mossy cobblestone on the quay, a sea mark for swimming.

### Deepdelve (caves)
- **Identity:** mine country. Spore trees, crystals glowing in rock, minecarts, kobolds.
- **Hour:** 18. Dusk outside, warm braziers and crystal glow inside.
- **Palette:** elw-mine · maraudon spore and transition trees, stone trees · crystals, minecarts · rock, crate · capital braziers · mushrooms.
- **Rooms:** the mine entrance camp (hub) · crystal grotto (landmark glow) · cart tracks and spoil heaps · kobold warren · spider gallery · an underground lake.
- **Life:** kobold vermin, Goldtooth (named), mine spiders.
- **Ground:** packed dirt, rock strata, gravel spoil.

### Sunscorch (desert)
- **Identity:** centaur steppe and dunes. A command tent, cacti, bleached bones, heat haze.
- **Hour:** 13, harsh white sun. Haze fx.
- **Palette:** centaur command tent, elw-tent · cacti, durotar trees, centaur and nomad tents · durotar bushes · sack, rock, crate · capital braziers.
- **Rooms:** nomad camp (hub) · the command tent (landmark) · an oasis · a dry canyon · a giant spider nest · a boar ravine.
- **Life:** snakes, giant boars, giant cave spiders.
- **Ground:** sand base. Packed dirt on trails. Grass only at the oasis.

### Murkfen (swamp)
- **Identity:** a sorrowful marsh. Witch huts on stilts, cauldrons, tombstones, gnoll tents in the reeds.
- **Hour:** 19, green-grey. Thick low fog, fireflies.
- **Palette:** swamp hut, cauldron, elw-gnolltent · swamp-of-sorrows trees and canopy, darkshore trees (plagueland trees render magenta, so avoid them) · plagueland bushes, tombstones · log, stump · lanterns, mushrooms.
- **Rooms:** the witch's hut (hub, quest) · a drowned graveyard · a riverpaw gnoll camp · a frog bog · a boardwalk crossing · a sunken ruin.
- **Life:** frogs, riverpaw gnolls and shamans, rats.
- **Ground:** riverbank mud base, lake marks for standing water, reeds along every edge.

### Beastwild (creatures)
- **Identity:** the monster preserve. A gryphon-rider statue, named beasts in their lairs. A boss zone.
- **Hour:** 12.
- **Palette:** gryphon rider statue, Kurdran statue · hyjal trees, aerie trees · berry bushes, highland shrubs · rock, log, campfire, lanterns, flowers.
- **Rooms:** the statue plaza (hub) · Hogger's camp · Mother Fang's lair · the Harvest Golem field · an ogre mound · the dragon's crag (landmark).
- **Life:** Hogger, harvest golem, Mother Fang, Princess, gnoll chieftain, kobold leader, gryphons, ogre, green dragon, tusked boar. Each named beast has a room and a lair.
- **Ground:** forest-floor base, scorched ground at the dragon crag.

---------------------------------------------------------------
## Open questions
- Should each portal room keep its mound diorama in main as the door, with the zone the full world behind it? (Current: yes.)
- Hours: settled by Part 3. Each zone's sun elevation and colour come from Campton's bible and replace the hours proposed in Part 2.

---------------------------------------------------------------
## Part 3: Campton's master bible (2026-10-10). This wins.
Campton handed this whole on 2026-10-10. Where it disagrees with Part 2, Part 3 wins on mood, sky, sun, fog, ground layers, props and audio.
Part 2 still supplies each zone's rooms, mound palette and enemy roster. Props the bible names that we don't own yet get drawn as scripted props in our style (assets ruling).
Engine translation: FogExp2 density d becomes our fog with an equivalent far ≈ 3/d m (0.0022 → about 1360 m, 0.008 → about 375 m). Sun elevation becomes the frozen hour that gives that peak.

| Zone | Sky | Primary terrain | Light | Fog | Audio |
|---|---|---|---|---|---|
| Verdant Glade | Morning Azure | Emerald Clover | Warm Gold #FFF6D6 | 0.0022 | Songbirds & Brooks |
| Emberwood | Periwinkle | Fall Leaf Litter | Deep Amber #F2A842 | 0.0030 | Crunching Leaves & Crows |
| Frostpeak | Steel Blue | Crisp Powder Snow | Glacial White #EDF6FF | 0.0045 | Howling Ice Wind |
| Crown District | Royal Blue | Cut Cobblestone | Clean Sunlight #FFF9E8 | 0.0015 | Cathedral Bells & Steps |
| Thistledown | Sunset Peach | Churned Farm Dirt | Soft Peach #FFC588 | 0.0028 | Livestock & Lutes |
| The Old Road | Overcast Silver | Broken Paving | Pale Straw #E8DEBE | 0.0020 | Boot Crunch & Wind |
| Saltmere Harbor | Sea-Foam Grey | Wet Pier Planks | Diffused White #DCEBFA | 0.0040 | Waves, Gulls & Rigging |
| Deepdelve | Pitch Black | Chiseled Granite | Lantern Gold #FF9524 | 0.0080 | Dripping Water & Picks |
| Sunscorch | Bleached White | Rippled Sand Dune | Scorching Cream #FFF4D0 | 0.0016 | Sand Hiss & Cicadas |
| Murkfen | Olive Grey | Black Swamp Muck | Sickly Lime #D1DEAE | 0.0065 | Bullfrogs & Murk Bubbles |
| Beastwild | Tropical Teal | Emerald Turf & Clay | Equatorial #FFF6DE | 0.0032 | Megafauna Roars & Insects |

### 1. Verdant Glade (spring)
- Core: vibrant renewal, blooming meadows, rushing snowmelt, clear pastoral mornings. Elwynn meets springtime Mulgore.
- Sky: bright pale azure to clean morning-sun yellow at the horizon. Soft, fast white cumulus.
- Sun #FFF6D6 at 52°. Shadows warm navy #324058. Ambient #98BEE8. Fog #A6D1EC, 0.0022 (crisp silhouettes).
- Ground: 65% emerald clover and damp lawn · 25% pastel wildflower carpets (buttercup, baby's breath, pink clover) · 10% moist dark loam along streams and hollows.
- Foliage and props: flowering dogwood, young weeping birch, willows by water, mossy river boulders. Apiary boxes, painted footbridges over brooks, blackberry briars.
- Audio: songbird chorus (robins, meadowlarks), bubbling brook, light breeze through young leaves.

### 2. Emberwood (autumn)
- Core: crisp harvest air, decaying leaves, smoky woodstoves, low golden-hour light. Azshara meets autumn Tirisfal and Westfall.
- Sky: clear periwinkle to pumpkin-amber at the horizon.
- Sun #F2A842 at 32°, long cinematic shadows. Ambient cedar-smoke purple #4A2E35. Fog #D29A66, 0.003 (smoky haze).
- Ground: 55% dry golden fescue and rust needle thatch · 35% leaf litter (crimson maple, ochre oak, golden birch) · 10% damp red-brown ruts and shale shelves.
- Foliage and props: scarlet red oaks, glowing golden maples, twisted hollow chestnuts. Birch firewood ricks, cider presses, rotting logs with orange shelf fungi, smoking leaf-burn piles.
- Audio: crunching leaves, rustling canopies, creaking branches in gusts, distant crows.

### 3. Frostpeak (winter)
- Core: stark glacial beauty, deep powder drifts, stone halls carved into cliffs. Dun Morogh and Winterspring.
- Sky: steel blue, white cirrus streaks, an iridescent pale sun disc.
- Sun #EDF6FF at 65°, high ground bounce. Ambient glacial cyan #5A82A6. Fog #B0CCE4, 0.0045 (blizzard perspective).
- Ground: 70% packed powder snow with blue rim shading · 20% blue hard-pack ice with fissures · 10% dark slate crags and frozen mud paths.
- Foliage and props: snow-bowed blue firs, dead frosted pine spars, 2 m icicle clusters on rock eaves. Timber guard towers on stone footings, iron watch braziers burning red pine, frozen pack sleds.
- Audio: wind howling between cols, muffled snow-crunch steps, groaning pines, cracking ice.

### 4. Crown District (city)
- Core: monumental stone, imperial power, ordered plazas. Stormwind Cathedral District and Dalaran.
- Sky: midday royal blue, tall static silver cloud banks.
- Sun #FFF9E8 at 68°. Ambient granite grey #848D99. Fog #8EA4BA, 0.0015 (keeps monument silhouettes).
- Ground: 60% chiselled grey granite cobbles with mortar · 30% polished marble flags on raised walks · 10% drains, gutter silt, iron grates.
- Foliage and props: boxwood topiary, symmetrical potted laurels, stone planters. Fountain basins with bronze lion spouts, heraldic banners, wrought-iron gas lamps, marble statues on plinths.
- Audio: echoing steps on stone, cathedral bells, town crier, crowd murmur, portcullis clangs.

### 5. Thistledown (village)
- Core: rustic warmth, thatch cottages, pens, gardens, sleepy frontier life. Goldshire, Southshore, Bloodhoof.
- Sky: early-evening lavender with soft orange cloud undersides.
- Sun #FFC588 at 28°. Ambient wood-ash brown #5E453A. Fog #C4A482, 0.0028 (chimney-smoke haze).
- Ground: 50% worn clover-grass commons with weeds · 35% trampled dark farm dirt between doors and fences · 15% tilled garden soil and loose gravel paths.
- Foliage and props: shady oaks with rope swings, apple orchards, ivy on whitewashed walls. Thatched cottages, timber barns, split-rail pens, scarecrows, stone wells, handcarts of pumpkins.
- Audio: chickens, cows, blacksmith forge, chimney whoosh, tavern lute through windows.

### 6. The Old Road (road)
- Core: a forgotten trade route, weathered imperial milestones, ambush points, long journeys.
- Sky: overcast silver with shifting sun shafts (god rays).
- Sun #E8DEBE at 48°. Ambient slate #68707A. Fog #9BA4AD, 0.002 (depth down the road).
- Ground: 50% broken sunken paving split by weeds · 35% twin-track dirt ruts with a grass ridge · 15% gravel ditches, mud puddles, manure tracks.
- Foliage and props: gnarled hedgerows, leaning milestone obelisks, crooked fingerposts to distant towns. Overturned wagons, broken wheels, dropped crates, bandit lookouts in trees, wayside shrines.
- Audio: boots on gravel, creaking axles, ditch wind, a lone hawk.

### 7. Saltmere Harbor (harbor)
- Core: sea spray, creaking wharves, drying nets, weathered trade. Menethil and Booty Bay.
- Sky: marine overcast to pale sea-foam green at the horizon, low scudding storm cloud.
- Sun #DCEBFA at 50°, diffused. Ambient sea-salt cobalt #38546E. Fog #7B9BB3, 0.004 (sea mist).
- Ground: 50% wet barnacled pier planks · 35% coarse grey shell sand · 15% kelp-slick intertidal mud.
- Foliage and props: wind-bent coastal pines, sea oats on dunes, kelp beds round pilings. Moored frigates, rope coils on bollards, fish crates, tar barrels, hanging nets, iron crane derricks.
- Audio: gulls, waves on pilings, rigging creak, foghorn, spray on rocks.

### 8. Deepdelve (caves)
- Core: claustrophobic chambers, pickaxe echoes, glowing fungi, ore veins. Deadmines and Wailing Caverns.
- Sky: a pitch-black ceiling void. No sun; all light comes from emitters.
- Lights: oil lamps #FF9524 r12 m, bioluminescent mushrooms #24B0FF r6 m. Ambient soot #0A0A0E. Fog #14141E, 0.008 (hides chamber pop-in). The readability rule still holds: lamps and glow carry every frame.
- Ground: 60% rough-hewn dark granite · 25% gravel tailings, coal dust, slate · 15% calcite runoff and wet slicks.
- Foliage and props: pale shelf mushrooms, glowing blue spores, hanging root tangles. Timber shoring, rusted cart tracks, spilled ore carts, pickaxes in rubble, dynamite barrels.
- Audio: drips into pools, distant pick strikes, low wind groans, scurrying critters.

### 9. Sunscorch (desert)
- Core: heat mirage, wind-carved sandstone arches, bleached bones, shifting dunes. Tanaris and Silithus.
- Sky: bleached white-blue to blinding pale brass at the horizon.
- Sun #FFF4D0 at 82°. Ambient terracotta gold #C4833D. Fog #CCA068, 0.0016 (dust shimmer).
- Ground: 70% wind-rippled gold dune sand · 20% desert pavement, sandstone shale, arroyo gravel · 10% cracked salt flats and alkali crust.
- Foliage and props: saguaro, prickly pear, tumbleweeds in gullies, thorn acacias. Giant beast ribcages, sandstone arches, nomad shade awnings, half-buried water jugs.
- Audio: wind hiss over ridges, cicadas, whipping canvas, rattlesnake rattle.

### 10. Murkfen (swamp)
- Core: blackwater bayou, choking green mist, twisted roots, half-sunken ruins. Swamp of Sorrows and Dustwallow.
- Sky: heavy green-grey ceiling hiding the sun.
- Sun #D1DEAE at 70°, heavily diffused. Ambient muddy olive #2B381D. Fog #3A4B29, 0.0065 (sight about 60 m).
- Ground: 55% black muck and peat · 30% rotting mulch, bark, sunken roots · 15% chartreuse duckweed and oily scum on pools.
- Foliage and props: swollen cypress with buttress knees, Spanish moss curtains, spotted toadstools. Plank boardwalks, sunken rowboats, submerged iron cages, glowing marsh wisps over deep water.
- Audio: bullfrogs, mosquito swarms, marsh-gas bubbles, wet footsteps, willow creaks.

### 11. Beastwild (creatures)
- Core: untamed megafauna territory, giant bones, territorial markers, primeval forest. Un'Goro and Sholazar.
- Sky: tropical turquoise with white storm plumes.
- Sun #FFF6DE at 62°, sharp god rays through canopy. Ambient jungle green #27632F. Fog #45784C, 0.0032 (steamy humidity).
- Ground: 60% emerald jungle turf with torn leaves · 25% red laterite clay and track mud · 15% bone fragments, claw-scratched ledges, claw furrows.
- Foliage and props: ancient banyans with lianas, elephant-ear plants, carnivorous pitcher plants. Giant hollow skulls as dens, gnawed bone piles, claw-marked trunks, boiling sulfur mud pots.
- Audio: distant roars, shrieking raptors, giant insects, rushing rivers, thudding footfalls.

### Murkfen as built (2026-10-10, Campton #17494 "deep level of detail pass")
- Arrival hummock at origin: MURKFEN sign, two lantern posts, fingerpost. Paths fork to Hag's Rest (NW), drowned graves (SE), murloc bog (E), Mirefang hollow (far W via Hag's Rest).
- Hag's Rest (-40,-55): Old Wenna (mf-wenna) gives "Scales in the Mere" (8 mire murlocs/tidehunters, 320 coins). Hut, bubbling green cauldron, crates, beached rowboat, fairy ring of toadstools.
- Black Mere: two lantern-lit boardwalks (Hag's Rest → sunken chapel, graves → chapel), sunken rowboats, drowned iron cages, 10 marsh wisps, gas bubbles, mist banks.
- Camps (ed-camp): Mirefang hollow 4 gnolls + 2 mystics, Gorrak Bogjaw (L14 chief), Blackwater bog 5 murlocs + tidehunter, murloc nest SE, drowned graves 4 moss-back weavers; roaming spider solos, murloc and gnoll pairs on routes. Levels 9-14.
- Sound: bullfrog choruses, marsh gas bubbling, camp growls, creaking boughs, mosquito air bed.
- 2026-10-10 design pass: light set to the §10 row (Hosek green-grey overcast, clouds #5a6350 at .84, sun #D1DEAE 70° frozen 12.5, fog exp2 #3A4B29 .0065, hemisphere ground #2B381D) with fill and exposure 2.0 so eye-level frames read (luma 33→58-61). Three sorrow-tree groves with roots, reeds and logs (mf-dp2-*) fill the open east fen (96..162, -112..-182). 17 roadside props (mf-road2-*: milestones, green-lit lantern posts, logs, crates, firewood, sack) give every path ≥4 detail kinds.

### Emberwood as built (2026-10-10)
- Ground: scripts/zone-autumn-ground.js, a ridge-ringed valley ~430 m. You arrive on a 6 m terrace at the gate (origin). The main road runs south to the Emberheart, a 46 m red kalidar tree on a 9 m hill at (0,-207). The Emberrun creek crosses east-west with a plank bridge at (0,-120). Hour frozen at 16.5, amber exp2 fog.
- Rooms: Huntsman Corwen's camp at the terrace (quest: The Rustfur Hunt, 8 ember-wolf) · Thornby woodcutters (65,-45): mill, saw, firewood, two NPCs · Hollins farmstead (-70,-75): farmhouse with chimney smoke, fenced pumpkin plot with a gate on the road side, well, hay · boar wallow (100,-130) · Ashveil spider hollow (-105,-160): webs, egg sacks, violet glow, Mother Ashveil · Greymane's den (55,-185): rocks, bones, alpha.
- Life: ember-wolf/alpha/boar/spider/widow/bear (lv 12-17), 7 camps + 7 roamers incl. the rare Old Rustcoat. Leaf-fall fx over groves; crow, creek, axe, branch and fire beds.
- ~930 placements: 22 groves of 5-8 red/gold trees with bushes at their feet, rim spruces, six hero canopies, logs, stumps, rock families, mushroom rings.
- 2026-10-10 design pass: light set to the §2 row (Hosek periwinkle sky, amber sun #F2A842 frozen at 15.65 ≈ 32°, smoky violet ambient, fog exp2 #d29a66 0.003). Hollins farmhouse turned to face its road (chimney re-seated). 115 grove pieces (ewd-g*: 10 new tree stands with bush underbrush, stumps, fungus logs) fill the bare south and east quarters; 26 road props (ewd-p*) give every branch road ≥4 details: cider presses, smouldering leaf piles, fungus logs (new scripts/gen/ew-props.js), pumpkins, hay, lanterns, milestones. One floating log re-seated.

### Frostpeak as built (2026-10-10)
- Landform: scripts/zone-winter-ground.js. Pass ~420 m centred (0,-110), crag walls. Gate on a 6 m terrace (gate y 6.25). Road runs south to the aerie crag (70,-175, 22 m up).
- Rooms: Ironhold outpost (-15,-60): inn, smithy + forge, hovels, tower, stable, lamp posts, braziers. Woodcutters' line (40,-40). Glimmermere frozen lake (-95,-140, ice at -1.5) with an ice-fishing camp. Frostmaw den (-150,-210). Wolf ridge (110,-90). Buried elf ruin (-10,-232).
- Life: frost-wolf, frost-bear, Whitefang (frost-howler), Old Frostmaw (frost-matron) in camps fpc-* plus 5 roamers. White gryphons circle via sv-flock (now takes state.model/fit/scale).
- Quest: Thane Brumli (fp-brumli) at the terrace, "Teeth in the Pass": 6 Frostmaw bears, tracked by frostBearKills.
- Light: noon frozen at 11, exp2 fog #b0cce4 0.0045, cold grade (exposure 1.08, twTemp -0.07, blue shadow tint). Snowfall follows the camera.
- 2026-10-10 design pass: wolf ridge is reachable again (graded gravel ramp path-ridge-ramp from the east road up its 7 m step); every room now paths ok. ~176 pieces of roadside and grove dressing (cairns, sleds, frosted spars, pines, saplings, bushes, rocks) line the roads and fill the west/south shelves. Ground gains noise-feathered hard-pack ice on the flats. Light follows §3: sun #EDF6FF at 65°, steel-blue ambient #5a82a6 ×1.8.

### Verdant Glade as built (2026-10-10, Savi)
- Land: scripts/zone-spring-ground.js. Rolling meadow bowl ~400 m centred (0,-110), wooded hills on the rim. Brightrun brook east-west near z -100, timber bridge where the road crosses (0,-100), stepping-stone ford at (-60,-104).
- Rooms: arrival terrace (gate, sentries, lanterns) · Northvale Abbey rise (-15,-60): abbey, chapel, Brother Aldric (quest "Greybacks in the Lambing Fields", 8 young greybacks, 120 coins) · apiary orchard (40,-40), Mother Hilde, hives · lambing meadow (-85,-150), Sister Maren, fenced fold, stags and rabbits · shrine ruin knoll (85,-70) · greyback dell (-70,-205) with Mother Greyback · fountain-tree hollow (60,-168), butterflies and motes.
- Life: glade-wolf (lv3), glade-mother (lv6), glade-deer (lv2, passive) camps; two bird flocks. Air: pollen and petals on the camera, mist on the brook, songbirds and breeze beds, abbey bells, bees, brook, campfires.
- Light: frozen at 9:30, sun 52°, fog exp2 #a6d1ec 0.0022.
- 2026-10-10 design pass: the Brightrun bridge was raised onto its banks (bridge-north/-south flatten marks), so the shrine and hollow are reachable again (every room now paths ok). 134 vgp-* pieces were added: six oak groves with underbrush, bluebell edges and log/stump/rock litter fill the empty south (28,-234 · 80,-238 · -24,-238) and east (146,-132 · 112,-118 · 152,-196) quarters, plus milestones, stumps, berry bushes and flowers along the den path and the abbey road. Table: scripts/lib/data/vg-dress.js. The sun is now warm gold #FFF6D6 with a sky-blue/clover hemisphere bounce.

## Thistledown, as built (2026-10-10)
- Ground: scripts/zone-village-ground.js. Bowl centred (0,-110), ridge wall at r≈170-200. Rooms: arrival terrace (0,-2) y5, village green (0,-70) y2, Brackwater farm (88,-78), orchard shelf (-82,-74) y3.5, chapel knoll (-48,-158) y13 with a winding ramp, squash fields (48,-142), Snarlmane camp shelf (96,-196) y6, quarry hollow (-120,-170). Mill stream crosses z≈-118 (bridge on the south road at x 0, footbridge on the farm lane at x 63).
- Hour frozen 16.1, peach-gold, fog exp2 0.0028 #c4a482. Village asset sheet (elw- kit + sw- livestock/folk) plus mb-village well/smithy/oak.
- Enemies (lvl 7-12): td-gnoll, td-brute, td-chief (Snarlmane), td-boar. Camps tdc-*; patrols tdx-*.
- Quest: Constable Brack (td-brack) at the well → "Snouts in the Squash", 8 Snarlmane gnolls (tdGnollKills).
- 2026-10-10 design pass: 328 road/verge dressing pieces along all six lanes plus 170 rim-grove pieces (tdr-*: oak stands, bush underbrush, boulders) fill the nine bare 60 m rim quarters. The oak growing through the green-side cottage td-house2 now stands at its gable. Light follows §5: Hosek sky (turbidity 3.4), peach sun #ffc588, clouds #f2c9b4 at 0.4, lavender hemisphere, wood-ash ambient #7a5c4c ×3.4 (lifted so north-facing fronts read), fog unchanged. Chimney-wind and mill-stream loops added (td-snd-*).

## The Old Road, as built (2026-10-10)
- Ground: scripts/zone-road-ground.js. ROAD spine gate (0,-8) → tower checkpoint (0,-56) → meeting-stone crossroads (-46,-122) → wagon-ambush cut (26,-176) → gorge bridge (32,-212, elw-bridge deck at the banks) → waystation (62,-262) → sealed far gate (20,-322). Spurs: bandit shelf (-100,-206) y8, wolf dell (100,-110). The road melts shelf lips within 16 m.
- Hour frozen 13.8 under heavy cloud, fog exp2 0.002 #9ba4ad, ambient slate.
- Asset sheet: elw-guardtower, wagon/haywagon, meetingstone (crossroads + milestones at 0.42), signposts, lanterns with lights, tents, campfires, sv-props barricades, oaks/pines/bushes, sw-horse mules.
- Enemies (lvl 9-14): or-bandit, or-cutter, or-boss (Gerrick Blackhand), or-wolf (pack). Camps orc-*; patrols orx-*.
- Quest: Sergeant Dane Holloway (or-dane) at the tower → "Toll of the Old Road", 8 Blackhand bandits (orBanditKills).
- 2026-10-10 design pass: 158 grove pieces (orq-*: oak/pine stands with bush underbrush, ferns, rocks, logs; tag or-grove) fill the empty hollows west of the bandit spur, south of the cut, east of the ambush, the north meadow, the dell approach and the far flanks. Patrol bandit + prowler wolves wear their rigged models again; the dell's centre rock moved so the den is reachable. Light now the §6 row: sun #e8debe at ~48° (orbit 56.5, hour 13.8), ambient slate #68707a ×2.6, silver-tinted Hosek sky, cloud 0.72. Audio adds creaking axles at the wreck and boots on gravel at the checkpoint.
- F4 toggles the world editor (world.config teKey → terrain-editor-core.js 'open').

## Part 4: buildings, interiors and their grounds (Campton, 2026-10-10). Every zone, every palette.

"Include purposely placed friendly NPCs in the interior sets … create an interior prop design Bible … dressing outsides of buildings and their pathways … wildflowers, logs, big trees … giant rocks … allow people to walk upon those things … fun canyon-like environments."

### 4.1 The building rules (from design.md, 2026-10-10)
- **Door height** is the Lion's Pride inn's front door (elw-inn, scale 0.42, lift -2.78, about 3.4 m clear). Every building is scaled so that its doors clear that height.
- **Down chambers.** A cellar, crypt or mine gets a terrain `hole` mark under its stair, like `inn-cellar`, so the room below can be walked into. In a **two-story** building, both floors clear the door height.
- **Front, purpose, path.** Before placing a building, know its front door, what it is for and who walks to it. The door faces the path that serves it. No building faces a fence, a cliff or a back wall.
- **Palette groups.** The asset browser's purpose groups are homes, inns, trade & craft, farm & stable, faith & arcane, keeps & military, bridges & docks, ruins, and other. The groups are defined by the BLD regexes in scripts/lib/asset-browser.js.

### 4.2 Interior bible: every piece has a purpose and a place
- **Circulation first.** Before any prop goes in, mark the walk lines: door → bar/counter → hearth → stairs → cellar → back rooms. These lines stay at least 1.6 m clear, and nothing stands in a hallway, a stair mouth or a doorway. Furniture goes along the walls and in the room's pockets, and the open middle is the walk.
- **Use clusters.** A room is made of use clusters, never scattered singles.
  - **Dining:** a table, chairs facing it with about 0.6 m to pull out, a rug under the whole set, and on the table a candle, plates, a mug and a bottle.
  - **Hearth:** two chairs or a bench facing the fire, an area rug laid in front of the hearth stone (never on it), firewood stacked beside it, and a poker.
  - **Bar:** the counter, kegs and a bottle shelf behind it, mugs and a tap on top, and the barkeep behind it.
  - **Stores:** barrels in a pyramid of three with one on top, crates stacked offset, and sacks slumped against them. These go in corners and under stairs.
  - **Kitchen:** a worktable, a cauldron or pot by the fire, hanging herbs and a bread basket.
  - **Sleeping:** a bed with its head against a wall, a chest at the foot, a nightstand and a candle.
- **Light.** Chandeliers hang centred over a table or an aisle, from a beam, with their bottom at least 2.6 m above the floor. Each one has a warm point light (oklch 0.82 0.13 65) under it. Candles go on tables, and a lantern goes by each door. There are no light sources in odd places.
- **Rugs.** A rug goes under a dining set or in front of a hearth, and it lies flat on the floor surface. It never covers a step or a hearth stone, and it is never an animal-skin rug in a public room.
- **Scale.** Chairs and tables are sized to the 1.8 m body. A seat is about 0.48 m high and a table about 0.8 m.
- **Friendly folk, placed on purpose.** Every interior set has its people, standing where their job is: the barkeep behind the bar, a server at the bar end (not in the aisle), a patron seated at a table facing it, a cook at the kitchen fire, a guard by the door of a keep and a priest at the altar. They are friendly NPCs (stance friendly) from our character kit, and none of them stands in a walk line.
- **Proof (after 2026-10-10 kitchen block).** Sampled rays are not proof. After every dressing pass, flood-fill the floor from outside the front door on a 0.6 m grid with a 0.32 m player-radius sweep at knee and chest height. Every room, the bar's back, the kitchen and the stair mouths must come out reachable, with no prop within 1.2 m of a doorway. A blocked line means the prop moves, not the line. NPCs count as props.
- **Doorway rule.** Keep a 1.6 m square clear on both sides of every interior doorway. Worktables, counters and NPCs stand at least one body-width off a door's axis.

### 4.3 Outside the building: its grounds and its path
- Every door gets a path to the road or trail that serves it. Use the terrain Path Paint (beatenDirt / beatenDirtEdge), kept uniform and feathered into the grass.
- **At the door:** a lantern or lamppost, a sign for a public building, a bench, a barrel or a crate.
- **Along the walls:** firewood under the eaves, a rain barrel at a corner, flower boxes or a strip of wildflowers, a cart or wheelbarrow at the work side.
- **The work yard** sits on the building's side or back and matches its purpose: an anvil and quench barrel at a smithy, hay and a trough at a stable, sacks and a cart at a mill.
- **Edges:** fence runs use the whole composite fence (Wood Fence Whole). Gates sit where paths cross a fence line.
- **Ground:** the trampled area is right at the door, then the path, then wildflowers feathering out into the grass.

### 4.4 The nature kit: flowers, logs, big trees
- **Wildflower drifts:** long, uneven drifts of 8 to 20 along path edges and the bases of walls, never single dots.
- **Logs and stumps:** a fallen log goes beside its stump, with moss on the shaded side. Logs lie along slopes and work as seats by a camp.
- **Big trees:** each room or clearing gets one landmark tree (WoW-scale canopy, roughly 3 to 5 times a person's height across) that you navigate by, with smaller trees clustered around it.

### 4.5 Desert: giant rocks are the trees
- In a desert zone, giant rocks and mesas do the job that trees do elsewhere. They break sightlines, frame rooms, cast shade and serve as landmarks.
- **Walkable:** the big rocks have mesh colliders and walkable tops. A slope or ledge chain leads up onto them, with each ledge step at most 0.5 m. A walkable top always shows a reason to climb: a chest, a lookout, a nest, a view.
- **Canyons:** two rock walls frame a winding floor 6 to 14 m wide. Give the floor a dry riverbed path, side pockets (a camp, a cave mouth, a skeleton), a natural arch or fallen-rock bridge overhead, and a narrows that opens into a wide room.
- **Fun beats:** a high ledge route parallel to the canyon floor, a drop-down shortcut, a hidden pocket behind a boulder and a lookout rock with a view of the next landmark.

### 4.6 Mountain passes and forested slopes (Campton, 2026-10-10: "understory forest mountain pass, wildflowers logs rocks laterns fences wildlife varying trees, waterfall somwhere in this range" … "remember that in the bible")
Every mountain pass, switchback trail or forested slope, in every zone, is dressed in layers and never left as a single-species pine field:
- **Varying trees, overstory:** pine is one of at least three species: pines on the high crags, oak and birch clumped lower down and in the hollows. Use clumps and gaps, not an even grid, and mix the heights.
- **Understory:** ferns, bushes and berry bushes thick under the canopy and at the foot of the trees. Keep it about 2 m clear of the trail's edge so the walk stays open.
- **Wildflowers:** meadow drifts in the open sun, on the landings and where switchbacks bend. Never put them in the deep shade.
- **Logs, stumps and rocks:** fallen mossy logs lie across the slope, never on the trail. Boulder families sit half-buried, partly as the reason a switchback turns.
- **Fences:** post-and-rail runs on the downhill side of a switchback and at the landing edges. They are a guide rail, not a wall, and gaps are fine.
- **Lanterns:** at the trailhead and at every landing, and every ~40 m along a long run, so the trail reads at night.
- **Wildlife:** stags/deer and rabbits stand in the clearings just off the trail, where they can be seen from it.
- **Water:** each range gets at least one waterfall down a crag face, with a splash pool and reeds at its foot, placed where the trail can see it.
- The trail itself stays clear and walkable (design-zones walkability rules); the dressing frames it.
