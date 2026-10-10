// DEN SYSTEMS switchboard (creator, 2026-10-04): "put the board on pause indefinitely, the watchers on pause, any system we created
// ... all their toggleables in a O menu separate UI window ... bare bones, zero filtering system again".
// world.state.systems[id] === true turns a system ON; absent or false = paused. Every system defaults to PAUSED.
export const SYSTEMS = [
  { id: 'board',    label: 'Vote & task boards', note: 'rune vote board, task cards, board clicks, bell' },
  { id: 'watchers', label: 'Watchers · HEIMDALL', note: 'plan gate, lectern, the watcher kin' },
  // JEV himself is ALWAYS ON (creator 2026-10-04: "JEV himself, is always active"): his body, his mind (jev:decide) never pause.
  // What we built FOR him is switchable here:
  { id: 'jev',      label: 'JEV · idea board', note: 'his idea brain on the board: suggestions, dedupe, task cards' },
  { id: 'jevScan',  label: 'JEV · area scan', note: 'Light Editor Autofill: JEV reads what kind of place the ring covers' },
  { id: 'jevLamps', label: 'JEV · lamplighter', note: 'JEV picks when and in what order the torches light' },
  { id: 'lookJudge', label: 'JEV · look judge', note: 'judges night/day captures against targets' },
  { id: 'judges',   label: 'Photo judges', note: 'judge board and its review queue' },
  { id: 'huginn',   label: 'HUGINN', note: 'the raven drone sweeps and its board' },
  { id: 'ledger',   label: 'Build ledger', note: 'the ledger book and build queue' },
  { id: 'wake',     label: 'Savi wake + G watch', note: 'board bell wakes, F8 wake, G watch captures' },
  { id: 'barrens',  label: 'World 302 chatter', note: 'AI regulars talking in the chatbox (on unless switched off)' }, // runner reads systems.barrens === false as OFF, absent as ON
  { id: 'jevCrowd', label: 'JEV · World 302 director', note: 'JEV picks who answers you and how' }, // barrens-run reads systems.jevCrowd === false as OFF (code draw), absent as ON
];
export const ALWAYS_ON = ['jevBody']; // never listed, never paused
export const isOn = (ctx, id) => ctx?.world?.state?.systems?.[id] === true;
// a paused loop naps; the switch is read again when it wakes
export const PAUSE_NAP_S = 5;
