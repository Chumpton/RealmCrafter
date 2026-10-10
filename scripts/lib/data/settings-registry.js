// THE DEN'S SETTINGS, one table (creator 2026-10-06: the O menu becomes the OSRS Settings window; every row must be a real, working system).
// The window (ui/hud/ossettings-canvas.js, fed by lib/settings-model.js) and the server (lib/settings-core.js, the setSetting action) both read this file.
// Every row is a setting that CHANGES SOMETHING in the den today. Nothing here is decoration: tests/lib/settings-registry.test.mjs checks that every
// action is declared in world.config.yaml and every default is valid; docs/board/osui/SETTINGS-STATUS.md records the live test of each row.
//   cat      the OSRS category button it sits under
//   scope    'player' = anyone, saved on player.state.settings (page-local effect) · 'keeper' = the den keeper (editor) only, shared by the room
//   type     check | slider | dropdown | number | button
//   read     where the HUD reads the value: ['set', key] player.state.settings[key] · ['state', key] player.state[key] · ['gain', name] world audio gain
//            · ['place', path] place.state path · ['rolf'] Rolf's guitar row state.always
//   act      the action that writes it (declared in world.config.yaml): setSetting {id, v} for the new page-local rows, else the existing action
export const CATS = ['Activities', 'Audio', 'Chat', 'Controls', 'Display', 'Gameplay', 'Interfaces', 'Character', 'Den keeper']; // Warnings and Popout come back when they have real rows
export const SONG_IDS = ['auto', 'turning', 'duskwood', 'meadow', 'hearth', 'harmony', 'forest'];
import { SKILL_LIST } from './skills.js';
const R = (cat, section, id, label, type, o) => ({ id, cat, section, label, type, scope: 'player', ...o });
export const SETTINGS = [
  // ---- Activities: what the world shows about fights
  R('Activities', 'Combat', 'plates', 'Show enemy plates', 'check', { def: true, read: ['set', 'plates'], act: 'setSetting', info: 'The name, level and health bar over enemies and townsfolk.' }),
  R('Activities', 'Combat', 'plateName', 'Show enemy name on health overlay', 'check', { def: true, read: ['set', 'plateName'], act: 'setSetting', info: 'Turn off to keep only the level and the bar.' }),
  // ---- Audio: the den's mix is the keeper's; emote sounds are each player's own ear
  R('Audio', 'General', 'gainMaster', 'Master volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 200, step: 5, read: ['gain', 'Master'], act: 'setGain', key: 'Master', info: 'The den keeper sets the room mix for everyone.' }),
  R('Audio', 'General', 'gainSFX', 'Sound effect volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 200, step: 5, read: ['gain', 'SFX'], act: 'setGain', key: 'SFX' }),
  R('Audio', 'General', 'gainAmbience', 'Area sound volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 200, step: 5, read: ['gain', 'Ambience'], act: 'setGain', key: 'Ambience', info: 'Wind, water, birds: the den\'s Ambience bus.' }),
  R('Audio', 'General', 'gainMusic', 'Music volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 200, step: 5, read: ['gain', 'Music'], act: 'setGain', key: 'Music' }),
  R('Audio', 'General', 'gainVoice', 'Voice volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 200, step: 5, read: ['gain', 'Voice'], act: 'setGain', key: 'Voice' }),
  R('Audio', 'General', 'gainUI', 'Interface volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 200, step: 5, read: ['gain', 'UI'], act: 'setGain', key: 'UI' }),
  R('Audio', 'General', 'emoteVol', 'Emote sound volume', 'slider', { def: 100, min: 0, max: 200, step: 5, read: ['state', 'emoteVol'], act: 'setEmoteVol', info: 'How loud other players\' emote sounds are for you.' }),
  R('Audio', 'The den\'s songs', 'song', 'Song', 'dropdown', { scope: 'keeper', def: 0, opts: ['Auto-Cycle', 'Track 1', 'Track 2', 'Meadow Song', 'Hearthsong', 'Harmony'], ids: SONG_IDS, read: ['place', 'song'], act: 'setSong', info: 'The den\'s one song. Auto-Cycle rolls a track at every dawn.' }),
  R('Audio', 'The den\'s songs', 'hearthVol', 'Hearthsong volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 100, step: 5, read: ['place', 'oldSong.v'], act: 'setOldSong' }),
  R('Audio', 'The den\'s songs', 'rolfVol', 'Rolf\'s guitar volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 100, step: 5, read: ['place', 'rolfVol'], act: 'setRolfVol' }),
  R('Audio', 'The den\'s songs', 'ulfVol', 'Ulf\'s lyre volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 100, step: 5, read: ['place', 'ulfVol'], act: 'setUlfVol' }),
  R('Audio', 'The den\'s songs', 'ormVol', 'Orm\'s guitar volume', 'slider', { scope: 'keeper', def: 100, min: 0, max: 100, step: 5, read: ['place', 'ormVol'], act: 'setOrmVol' }),
  R('Audio', 'The den\'s songs', 'rolfAlways', 'Rolf plays in every rest', 'check', { scope: 'keeper', def: false, read: ['rolf'], act: 'rolfAlways', toggle: true }),
  R('Audio', 'The den\'s songs', 'ulfAlways', 'Ulf plays the hall lyre always', 'check', { scope: 'keeper', def: false, read: ['place', 'ulfAlways'], act: 'ulfAlways', toggle: true }),
  R('Audio', 'The den\'s songs', 'ormAlways', 'Orm plays Rolf\'s guitar in every rest', 'check', { scope: 'keeper', def: false, read: ['place', 'ormAlways'], act: 'ormAlways', toggle: true }),
  // ---- Chat
  R('Chat', 'Game chat', 'chatFilter', 'Enable profanity filter', 'check', { def: true, read: ['state', 'chatFilter'], act: 'chatFilter', toggle: true, info: 'Hides rude words for you. Each player\'s own choice.' }),
  R('Chat', 'Game chat', 'chatTime', 'Chat timestamps', 'dropdown', { def: 0, opts: ['Off', 'On'], read: ['set', 'chatTime'], act: 'setSetting', info: 'A [hh:mm] stamp before each line, in the den\'s own clock.' }),
  R('Chat', 'Game chat', 'barrensChat', 'World 302 chatter', 'check', { hidden: true, def: false, read: ['set', 'barrensChat'], act: 'setSetting', info: 'Shows the AI regulars\' chatter in your chatbox.' }),
  // Dev Tracker (plan DEV-TRACKER-PLAN-2026-10-06, lane 6): editorOnly rows are hidden from visitors (ui/hud/ossettings.js); keeper rows live in world.state.devbook
  R('Chat', 'Dev Tracker', 'devbookTab', 'Show the Dev Tracker tab', 'check', { editorOnly: true, def: true, read: ['set', 'devbookTab'], act: 'setSetting', info: 'The little book on the chatbox: Zezima and Campton\'s build notes.' }),
  R('Chat', 'Dev Tracker', 'devbookSee', 'Dev Tracker visible to visitors', 'check', { scope: 'keeper', editorOnly: true, def: false, read: ['world', 'devbook.visitorsSee'], act: 'devbookSee', toggle: true, info: 'Off: only the den\'s builders see the book.' }),
  R('Chat', 'Dev Tracker', 'devbookReact', 'Visitors may react in the Dev Tracker', 'check', { scope: 'keeper', editorOnly: true, def: false, read: ['world', 'devbook.visitorsReact'], act: 'devbookReact', toggle: true, info: 'Needs the book visible to visitors.' }),
  R('Chat', 'Chat colours', 'colPublic', 'Public chat colour', 'dropdown', { def: 0, opts: ['Blue', 'Black'], read: ['set', 'colPublic'], act: 'setSetting' }),
  R('Chat', 'Chat colours', 'colTrade', 'Trade chat colour', 'dropdown', { def: 0, opts: ['Black', 'Purple'], read: ['set', 'colTrade'], act: 'setSetting', info: 'What you type in Spawn\'s Trade chat shows in this colour.' }),
  // ---- Controls
  R('Controls', 'Control options', 'keysOpen', 'Key list', 'button', { label: 'Key list', two: ['Show / hide', 'key list'], act: 'keybinds', info: 'Every key in the den. U does the same.' }),
  R('Controls', 'Control options', 'keylist', 'Show the key list', 'check', { def: true, read: ['set', 'keylist'], act: 'setSetting', info: 'The list of keys at the top left of the screen.' }),
  R('Controls', 'Camera', 'camStyle', 'Camera style', 'dropdown', { def: 0, opts: ['Auto', 'Classic shoulder', 'OSRS orbit'], read: ['set', 'camStyle'], act: 'setSetting', info: 'Classic: first person, V for over the shoulder. OSRS orbit: middle-drag and arrows turn the view. Auto: the classic camera, starting over the shoulder (third person) for everyone.' }),
  R('Controls', 'Camera', 'camCull', 'View distance', 'dropdown', { def: 0, opts: ['OSRS (fast)', 'Full'], read: ['set', 'camCull'], act: 'setSetting', info: 'OSRS orbit only: the far view ends just past the ground you can see. Full draws to the horizon.' }),
  R('Controls', 'Camera', 'roofs', 'Roofs', 'dropdown', { def: 0, opts: ['Selectively', 'Always hide', 'Show'], read: ['set', 'roofs'], act: 'setSetting', info: 'OSRS orbit only: hide the roof of the building you stand in.' }),
  R('Controls', 'Control options', 'moveHud', 'Move HUD pieces', 'button', { label: 'Move HUD pieces', two: ['Move HUD', 'pieces'], act: 'maToggle', info: 'Drag and resize the HUD pieces; press ` to finish.' }),
  // ---- Display
  R('Display', 'Graphics', 'fov', 'Field of view', 'slider', { def: 72, min: 30, max: 130, step: 1, read: ['state', 'fov'], act: 'setFov', info: 'How wide the camera sees.' }),
  R('Display', 'Interface', 'hudSkin', 'Interface style', 'dropdown', { def: 1, opts: ['OSRS', '3rd Person'], read: ['set', 'hudSkin'], act: 'setSetting', info: 'OSRS keeps the classic interface. 3rd Person dresses the HUD in the gold-and-iron kit.' }),
  R('Display', 'Interface', 'uiScale', 'Interface size', 'dropdown', { def: 0, opts: ['Auto', '1x', '1.5x', '2x', '3x'], read: ['set', 'uiScale'], act: 'setSetting', info: 'Every OSRS window. Auto fits your screen and refits as the window changes.' }),
  R('Display', 'Interface', 'chatBg', 'Chat background', 'slider', { def: 72, min: 50, max: 100, step: 2, read: ['set', 'chatBg'], act: 'setSetting', info: '3rd Person chat: how dark the log sits behind the text (50 = lightest allowed).' }),
  R('Display', 'Interface', 'winMove', 'Move windows', 'check', { def: false, read: ['set', 'winMove'], act: 'setSetting', info: 'Shows the drag bar and corner grip on every window so you can move and size them. Off keeps the screen clean.' }),
  R('Display', 'Interface', 'adminOpen', 'Admin menu', 'button', { editorOnly: true, label: 'Admin menu', two: ['Admin', 'menu'], page: 'admin', info: 'Den Keeper, World Editor, Shader Editor, Raven Roads and the other admin tools.' }),
  R('Display', 'Interface', 'fullscreen', 'Fullscreen', 'check', { def: false, page: true, read: ['page', 'fullscreen'], info: 'Fill the whole screen, no borders. Esc leaves it.' }),
  R('Display', 'Interface', 'uiFilter', 'Interface scaling mode', 'dropdown', { def: 0, opts: ['Nearest-Neighbour', 'Linear'], read: ['set', 'uiFilter'], act: 'setSetting', info: 'Nearest-neighbour keeps the pixels sharp.' }),
  // ---- Gameplay
  R('Gameplay', 'Options', 'speed', 'Move speed', 'slider', { def: 1, min: 1, max: 5, step: 1, read: ['state', 'speed'], act: 'setSpeed', info: 'Your own walking and running pace: 1 = 100%, 5 = 500%.' }),
  // ---- Interfaces: the XP counter (the XP orb on the minimap toggles it; right-click the orb or the button opens the skill grid)
  R('Interfaces', 'XP drops', 'xpCounter', 'XP counter', 'check', { def: false, read: ['set', 'xpCounter'], act: 'setSetting', info: 'The XP bar at the top of the screen. The XP orb on the minimap turns it on and off.' }),
  R('Interfaces', 'XP drops', 'xpSetup', 'Choose what the XP counter tracks', 'button', { label: 'XP counter setup', two: ['XP counter', 'setup'], page: true, info: 'All skills together, or one skill with its level bar. Right-click the XP orb does the same.' }),
  R('Interfaces', 'XP drops', 'xpTrack', 'XP counter skill', 'dropdown', { hidden: true, def: 0, opts: ['All skills', ...SKILL_LIST.map((k) => k.name)], read: ['set', 'xpTrack'], act: 'setSetting' }),
  // ---- Den keeper (editors only): the keeper's tools, same window
  R('Character', 'Body', 'lookForm', 'Body form', 'dropdown', { def: 0, opts: ['Your avatar', 'OSRS form'], read: ['state', 'lookForm'], act: 'lookForm', info: 'Wear your own avatar or the OSRS world form.' }),
  R('Character', 'Body', 'zezimaForm', 'Wear the Zezima body', 'check', { scope: 'keeper', def: false, read: ['state', 'zezimaForm'], act: 'zezimaForm', toggle: true, info: 'Your own OSRS body with OSRS-stepped animation. Off goes back to the OSRS form.' }),
  R('Character', 'Body', 'wardrobe', 'Open the wardrobe', 'button', { label: 'Wardrobe', two: ['Wardrobe', 'dress up'], act: 'wardrobe', info: 'Cut, skin, hair, clothes and height for your OSRS form.' }),
  R('Den keeper', 'Tools', 'jevWander', 'JEV wanders from Hugsæti', 'check', { scope: 'keeper', def: true, read: ['place', 'jevWander'], act: 'jevWander', toggle: true }),
  R('Den keeper', 'Tools', 'sysWin', 'Open the Den Systems window', 'button', { scope: 'keeper', label: 'Den Systems', two: ['Den Systems', 'window'], act: 'sysWin' }),
  R('Den keeper', 'Tools', 'bugTag', 'Tag a bug', 'button', { scope: 'keeper', label: 'Tag a bug', two: ['Tag', 'a bug'], act: 'bugTag' }),
  R('Den keeper', 'Tools', 'bugJournal', 'Open the bug journal', 'button', { scope: 'keeper', label: 'Bug journal', two: ['Bug', 'journal'], act: 'bugJournal' }),
  R('Den keeper', 'Tools', 'lights', 'Open the light editor', 'button', { scope: 'keeper', label: 'Light editor', two: ['Light', 'editor'], act: 'le', payload: { op: 'open' } }),
  R('Den keeper', 'Tools', 'desk', 'Open the keeper\'s desk (weather, build, admin, watchers)', 'button', { scope: 'keeper', label: 'Keeper\'s desk', two: ['Keeper\'s', 'desk'], act: 'optTab', payload: { v: 'world' }, desk: true }),
  // creator 2026-10-06: every old tool lives in the O menu too (the admin quick menu and the keeper's desk tabs, one press each)
  R('Den keeper', 'Build & NPCs', 'deskBuild', 'Build window: place buildings, nature and props', 'button', { scope: 'keeper', label: 'Build', two: ['Build', 'window'], act: 'optTab', payload: { v: 'build' }, desk: true }),
  R('Den keeper', 'Build & NPCs', 'deskNpc', 'NPC window: place, move and size NPCs', 'button', { scope: 'keeper', label: 'NPCs', two: ['NPC', 'window'], act: 'optTab', payload: { v: 'build' }, then: ['bld', { op: 'cat', v: 'npc' }], desk: true }),
  R('Den keeper', 'Build & NPCs', 'moveAny', 'Move Anything (F6)', 'button', { scope: 'keeper', label: 'Move Anything', two: ['Move', 'Anything'], act: 'maToggle' }),
  R('Den keeper', 'Keeper\'s desk', 'deskWorld', 'World: weather, hour and sky', 'button', { scope: 'keeper', label: 'World', two: ['World', '& weather'], act: 'optTab', payload: { v: 'world' }, desk: true }),
  R('Den keeper', 'Keeper\'s desk', 'deskAdmin', 'Admin tab', 'button', { scope: 'keeper', label: 'Admin', two: ['Admin', 'tab'], act: 'optTab', payload: { v: 'admin' }, desk: true }),
  R('Den keeper', 'Keeper\'s desk', 'deskWatch', 'Watchers tab', 'button', { scope: 'keeper', label: 'Watchers', two: ['Watchers', 'tab'], act: 'optTab', payload: { v: 'watch' }, desk: true }),
  R('Den keeper', 'Keeper\'s desk', 'deskSound', 'Old sound tab', 'button', { scope: 'keeper', label: 'Sound', two: ['Sound', 'tab'], act: 'optTab', payload: { v: 'sound' }, desk: true }),
  R('Den keeper', 'Travel', 'ravenRoads', 'Raven Roads and summon players (U)', 'button', { scope: 'keeper', label: 'Raven Roads', two: ['Raven', 'Roads'], act: 'travelPanel' }),
  R('Den keeper', 'Travel', 'huginnMap', 'Huginn map (M)', 'button', { scope: 'keeper', label: 'Map', two: ['Huginn', 'map'], act: 'huginnMap' }),
  R('Den keeper', 'Debug', 'skillDebug', 'Skill debug panel', 'button', { scope: 'keeper', label: 'Skill debug', two: ['Skill', 'debug'], act: 'skillDebug' }),
  R('Den keeper', 'Debug', 'votes', 'My votes', 'button', { scope: 'keeper', label: 'My votes', two: ['My', 'votes'], act: 'voteLedger', payload: { op: 'open' } }),
  R('Den keeper', 'Debug', 'keybinds', 'Key list', 'button', { scope: 'keeper', label: 'Keys', two: ['Key', 'list'], act: 'keybinds' }),
  R('Den keeper', 'Debug', 'closeAll', 'Close all windows (Shift+Down)', 'button', { scope: 'keeper', label: 'Close all', two: ['Close all', 'windows'], act: 'closeAll', payload: { all: true } }),
];
export const byId = (id) => SETTINGS.find((s) => s.id === id) ?? null;
export const defaults = () => Object.fromEntries(SETTINGS.filter((s) => s.act === 'setSetting').map((s) => [s.id, s.def]));
// the player-saved rows (the setSetting action's whitelist)
export const SET_IDS = SETTINGS.filter((s) => s.act === 'setSetting').map((s) => s.id);
