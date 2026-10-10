// World 302 v2, lane 3: WORLD FACTS. What the bot crowd may know about a real human, read from the game, never invented.
// humanFacts(ctx, player) -> { name, combat?, total?, top?, low?, weapon?, spot?, hour?, weather?, mounted? }: every read guarded,
// every field optional, never throws. classifyLine(text) -> 'question'|'flex'|'greeting'|'insult'|'trade'|'gz'|'statement'.
// Pure: no ctx writes, no randomness. Spots are the main place's landmarks (positions read from the live scene 2026-10-06).
import { SKILL_LIST } from './data/skills.js';
import { levelOf } from './skills-core.js';
import { cbLevelOf } from './combat-hud.js';
import { weaponOf } from './combat-core.js';
import { wallHour } from './real-clock.js';

// name as the crowd says it, centre x/z, radius m. Nearest spot whose radius holds the player wins; then the region boxes.
export const SPOTS = [
  { name: 'the bank', x: 30.5, z: -4.6, r: 6 },            // yard-bank; the four barrens-body-* rows stand here
  { name: 'the furnace', x: 28, z: -0.7, r: 4 },           // yard-smith
  { name: 'the hall', x: 10, z: 1.5, r: 13 },              // hall-shell
  { name: 'the oak grove', x: 36, z: 26, r: 14 },          // grove
  { name: 'the creek bridge', x: 7.07, z: 60.02, r: 8 },   // creek-bridge
  { name: 'the portals', x: -11.3, z: 48, r: 8 },          // home-portal + portal-arena
  { name: 'the dock watchtower', x: 50, z: -10, r: 8 },    // mb-dock-watchtower
  { name: 'the docks', x: -15, z: -56, r: 32 },            // dock folk
  { name: 'ravnholt well', x: -42.4, z: 170, r: 16 },      // ravn-well
  { name: 'the watchtower', x: 16, z: 340, r: 15 },        // mb-watch
  { name: 'the wizard tower', x: -62, z: 378, r: 16 },     // mb-wizard
  { name: 'the smithy', x: 56, z: 404, r: 15 },            // mb-smithy
  { name: 'the tailor', x: -45, z: 407, r: 12 },           // mb-tailor
  { name: 'mellowbrook hall', x: 6, z: 455, r: 18 },       // mb-hall
  { name: 'the big oak', x: -46, z: 455, r: 12 },          // mb-oak
  { name: 'the market bridge', x: -60.45, z: 623.86, r: 12 }, // mkt-bridge-1
  { name: 'the isle hall', x: 10, z: -623, r: 28 },        // isle-hall
  { name: 'the church', x: 161.6, z: 860, r: 22 },         // mb-church
];
export const REGIONS = [ // broad fallbacks: { name, x0, x1, z0, z1 }
  { name: 'mellowbrook', x0: -140, x1: 140, z0: 300, z1: 560 },
  { name: 'the den yard', x0: -30, x1: 60, z0: -30, z1: 40 },
  { name: 'the lakeshore', x0: -120, x1: 120, z0: -120, z1: -30 },
];
export const PLACE_SPOTS = { arena: 'the proving void', yggdrasil: 'yggdrasil', austrland: 'austrland', 'austr-barrow': 'the barrow', 'austr-rimecave': 'the rimecave' };

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
const safe = (f) => { try { return f(); } catch (e) { return undefined; } };

export function spotAt(pos) {
  const x = num(pos?.x), z = num(pos?.z); if (x == null || z == null) return undefined;
  let best = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(x - s.x, z - s.z); if (d <= s.r && d < bd) { bd = d; best = s; } }
  if (best) return best.name;
  for (const r of REGIONS) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.name;
  return undefined;
}

export function skillFacts(skills) {
  if (!skills || typeof skills !== 'object') return {};
  const rows = [];
  for (const s of SKILL_LIST) {
    const raw = s.id === 'hitpoints' ? (skills.hitpoints ?? 11540) : (skills[s.id] | 0); // OSRS: Hitpoints starts at 10
    const level = safe(() => levelOf(raw)); if (num(level) == null) continue;
    rows.push({ skill: s.id, level });
  }
  if (!rows.length) return {};
  const out = { total: rows.reduce((a, r) => a + r.level, 0) };
  const top = rows.reduce((a, r) => (r.level > a.level ? r : a), rows[0]);
  if (top.level > 1 && top.skill !== 'hitpoints' || top.level > 10) out.top = { skill: top.skill, level: top.level };
  const low = rows.filter((r) => r.skill !== 'hitpoints').reduce((a, r) => (!a || r.level < a.level ? r : a), null);
  if (low && out.top && low.skill !== out.top.skill) out.low = { skill: low.skill, level: low.level };
  return out;
}

export function humanFacts(ctx, player) {
  const out = {};
  try {
    const st = safe(() => player?.state) ?? {};
    const name = safe(() => player?.displayName) ?? safe(() => player?.name);
    out.name = typeof name === 'string' && name ? name : 'someone';
    const sk = safe(() => skillFacts(st.skills)) ?? {};
    if (num(sk.total) != null) out.total = sk.total;
    if (sk.top) out.top = sk.top;
    if (sk.low) out.low = sk.low;
    if (st.skills && typeof st.skills === 'object') { const c = safe(() => cbLevelOf(st)); if (num(c) != null) out.combat = c; }
    const wid = safe(() => st.equip?.weapon) ?? safe(() => st.cbWeapon);
    if (wid && wid !== 'unarmed') { const w = safe(() => weaponOf(wid)); const n = w && w.id !== 'unarmed' && w.id !== 'fists' && typeof w.name === 'string' ? w.name : (typeof wid === 'string' ? wid.replace(/-/g, ' ') : null); if (n) out.weapon = n.toLowerCase(); }
    const placeId = safe(() => player?.place) ?? safe(() => ctx?.place?.id);
    const pid = typeof placeId === 'string' ? placeId : safe(() => placeId?.id);
    const spot = pid && PLACE_SPOTS[pid] ? PLACE_SPOTS[pid] : safe(() => spotAt(player?.feetPosition));
    if (spot) out.spot = spot;
    const h = safe(() => wallHour(ctx)); if (num(h) != null) out.hour = Math.floor(h) % 24;
    const wx = safe(() => ctx?.place?.state?.weather);
    if (wx && typeof wx === 'object') {
      let label = typeof wx.label === 'string' && wx.label ? wx.label : (typeof wx.kind === 'string' ? wx.kind : null);
      if ((num(wx.snow) ?? 0) > 0.2) label = 'snowing'; else if ((num(wx.storm) ?? 0) > 0.5) label = 'storming'; else if ((num(wx.rain) ?? 0) > 0.2) label = 'raining';
      if (label) out.weather = String(label).toLowerCase();
    }
    out.mounted = !!(safe(() => st.mount));
    if (!out.mounted) delete out.mounted;
  } catch (e) { /* facts are a nicety; never break the crowd */ }
  return out;
}

const W = (list) => new RegExp('(^|[^a-z0-9])(' + list.join('|') + ')(?=$|[^a-z0-9])', 'i');
const GZ = W(['gz', 'gratz', 'grats', 'gratss+', 'congrats', 'congratz', 'congratulations', 'gj', 'nice lvl', 'nice level', 'well done', 'gzz+']);
const TRADE = W(['wts', 'wtb', 'wtt', 'buying', 'selling', 'sell', 'buy', 'trade', 'trading', 'pc', 'price check', 'gp', 'coins', '\\d+k', '\\d+m', 'ea', 'offer']);
const GREET = W(['hi', 'hey', 'heya', 'hello', 'hiya', 'yo', 'sup', 'wassup', 'howdy', 'gm', 'good morning', 'morning', 'evening', 'wb', 'greetings', 'oi']);
const INSULT = W(['noob', 'nub', 'newb', 'n00b', 'trash', 'scrub', 'idiot', 'stupid', 'dumb', 'loser', 'bots?', 'shut up', 'stfu', 'cringe', 'clown', 'l2p', 'ez', 'ur bad', 'you suck', 'u suck', 'suck', 'lame', 'garbage', 'pathetic', 'go away']);
const FLEX = W(['99', 'maxed', 'max', 'just got', 'i got', 'got my', 'im lvl', "i'?m level", 'lvl \\d+', 'level \\d+', '\\d+ (wc|woodcutting|attack|atk|str|strength|def|defence|hp|magic|mage|range|ranged|fishing|cooking|mining|smithing|crafting|fletching|prayer|firemaking|fm)', 'rich', 'look at my', 'check my', 'first try', 'one shot', 'solo', 'killed', 'owned', 'pwned', 'flex']);
const ASK = /^(who|what|whats|what's|where|wheres|when|why|how|hows|is|are|can|could|does|do|did|any|anyone|anybody|should|which|wanna|will|would)\b/i;

export function classifyLine(text) {
  const t = typeof text === 'string' ? text.trim().toLowerCase() : '';
  if (!t) return 'statement';
  const words = t.split(/\s+/).length;
  if (GZ.test(t)) return 'gz';
  if (TRADE.test(t) && !/\?$/.test(t) || /^(wts|wtb|wtt|selling|buying)\b/.test(t)) return 'trade';
  if (INSULT.test(t)) return 'insult';
  if (GREET.test(t) && words <= 4 && !/\?/.test(t.replace(/^\S+\s*/, ''))) return 'greeting';
  if (t.includes('?') || ASK.test(t)) return TRADE.test(t) ? 'trade' : 'question';
  if (FLEX.test(t)) return 'flex';
  if (GREET.test(t.split(/\s+/)[0] ?? '')) return 'greeting';
  return 'statement';
}
