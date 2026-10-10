// IDEA GATE (creator go 2026-09-28 12:46): den + solo ideas are Savi's and Claude's to vote. The creator votes only on CRITICAL ideas
// and on splits. Pure: board-jev.js (sortLane) and any dry run call the same verdict.
//   critical = the idea deletes/replaces/moves what's built, touches the den's four rules (shared room, walk on arrival, first person,
//   square door), publishes, touches a goal, is a big wisp round, or changes the vote rules. JEV marks it at pitch; unsure = critical.
// FORGED-VOTE FIX (rune vote board, 2026-09-28): the creator's vote counts ONLY from a seal the vote board's own script wrote
// (getObject("vote-board").state.seals[id] = { vote, hash, at, userId }): hash === cardHash(block), userId === VB.creatorUserId, and
// not already used (board-bell.state.sealsUsed[id] === hash). A typed "creator YES|NO" on a votes line is ignored (board-jev flags it).
import { VB } from "./data/vote-board.js";
export const CRIT_WORDS = /\b(delet\w*|remov\w*|replac\w*|revert\w*|tear down|demolish\w*|publish\w*|goal \d|seats? move|square door|door to the square|singleplayer|multiplayer|networking|third.person|loading screen|title screen|vote rules?|referee|wipe|reset)\b/i;
export const CRIT_KINDS = ["yes", "no", "unsure"];
export function critLine(x, text) { // the "- critical:" line JEV writes under a new pitch
  const said = String(x?.critical ?? "unsure").toLowerCase(), hit = CRIT_WORDS.exec(text ?? "");
  const yes = said !== "no" || !!hit, why = String(x?.criticalWhy ?? "").replace(/\s+/g, " ").replace(/#/g, "").trim().slice(0, 160);
  return `- critical: ${yes ? "yes" : "no"}${yes ? " (" + (said === "yes" ? why || "JEV" : said === "unsure" ? "JEV unsure, so critical" : "matched: " + hit[0]) + ")" : ""}`;
}
export function isCritical(block) { const m = /^- critical:\s*(yes|no)/im.exec(block); return !!m && m[1].toLowerCase() === "yes"; }
export function votesOf(block) {
  const v = /^- votes:(.*)$/m.exec(block)?.[1] ?? "", one = (who) => new RegExp(who + "\\s+(YES|NO|SHELF)\\b", "i").exec(v)?.[1]?.toUpperCase() ?? null;
  return { creator: one("creator"), savi: one("Savi"), claude: one("Claude") };
}
export function ideaId(block) { return /^## ([DS]\d+) · /m.exec(block ?? "")?.[1] ?? null; }
// the idea's text as the creator saw it: votes line out, whitespace collapsed (votes and file spacing never stale a card). FNV-1a x2 -> 16 hex
export function cardHash(block) {
  const t = String(block ?? "").split("\n").filter((l) => !/^\s*- votes:/.test(l)).join(" ").replace(/\s+/g, " ").trim();
  let a = 0x811c9dc5, b = 0x01000193 ^ t.length;
  for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x5bd1e995) ^ (b >>> 13); }
  return (a >>> 0).toString(16).padStart(8, "0") + (b >>> 0).toString(16).padStart(8, "0");
}
// the one seal that counts for this block, or null
export function sealOf(block, seals, used) {
  const id = ideaId(block), s = id && seals ? seals[id] : null;
  if (!s || (s.vote !== "YES" && s.vote !== "NO")) return null;
  const h = cardHash(block);
  if (s.hash !== h || s.userId !== VB.creatorUserId || (used && used[id] === h)) return null;
  return s;
}
// a typed creator YES/NO with no seal behind it: board-jev flags it once, the gate ignores it
export function forgedCreator(block, seals, used) { const c = votesOf(block).creator; return (c === "YES" || c === "NO") && !sealOf(block, seals, used) ? c : null; }
// -> "shelf" | "pass" | "drop" | "wait" (a builder vote missing) | "creator" (critical, or Savi and Claude split: his seal decides)
export function gate(block, seals = {}, used = {}) {
  const { savi, claude } = votesOf(block);
  if (savi === "SHELF" || claude === "SHELF") return "shelf";            // SHELF counts only from Savi or Claude
  const seal = sealOf(block, seals, used);
  if (seal) return seal.vote === "YES" ? "pass" : "drop";                 // his sealed word, from the rune board, always wins
  if (isCritical(block)) return "creator";
  if (!savi || !claude) return "wait";
  if (savi === claude) return savi === "YES" ? "pass" : "drop";
  return "creator";
}
