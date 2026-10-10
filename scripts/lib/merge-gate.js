// MERGE-GATE-v2 (docs/board/proposals/MERGE-GATE-v2.md): a MERGE seal no longer just relabels; it runs the strict 5-point gate.
// requestMerge(s, pair, who) -> state patch { mergeAsking } (records a sealed request) · mergeStep(ctx, s, now) -> { patch, result } | null
// onMergeJob(ctx, r, p) = the llm:generate callback (draft by JEV, then VÖR's moment map). Pure helpers below are exported for tests.
// Writes: MERGES.md (the ledger, sole writer) and, on PASS only, the two idea cards. Nothing else. mergeAsking lives on board-bell only
// while the two jobs are out (~40 chars), then goes. Data contract: scripts/lib/data/merge-gate.js (MERGE, GATE).
import { MERGE, GATE } from "./data/merge-gate.js";
import { sha256 } from "./sha256.js";
import { checkVerdict } from "./watcher-core.js";
import { POINTS } from "./data/watcher.js";
import { derivePlace, deriveKey, normKey, markOf } from "./idea-index.js";
import { meter } from "./jev-meter.js";
import { applyMerge, groupOf } from "./build-queue.js"; // M5: the relabel runs HERE, only after a PASS
import { BQ } from "./data/build-queue.js";
import { VB } from "./data/vote-board.js";

const PEND = new Map(); // id -> { pair, stage, at, a, b, moments, spec, results, result }; module memory: a restart mid-merge = FAIL, nothing changed
const P = MERGE.points;

// ---- cards ---------------------------------------------------------------------------------
export function findCard(text, id) {
  const t = String(text ?? ""), m = new RegExp(`(^|\\n)## ${id} · [^\\n]*`).exec(t);
  if (!m) return null;
  const start = m.index + m[1].length, nx = t.indexOf("\n## ", start + 3), end = nx < 0 ? t.length : nx + 1;
  return { start, end, block: t.slice(start, end) };
}
export function parseCard(block) {
  const h = /^## ([DS]\d+) · (.*?) · (.+)$/m.exec(block) ?? [];
  const f = (k) => (new RegExp(`^- ${k}: (.*)$`, "m").exec(block)?.[1] ?? "").trim();
  const ksw = /^- kind: (.*?) · size: (.*?) · where: (.*)$/m.exec(block) ?? [];
  return { id: h[1] ?? "", title: (h[2] ?? "").trim(), state: (h[3] ?? "").trim(), kind: (ksw[1] ?? "").trim(), size: (ksw[2] ?? "").trim(),
    where: (ksw[3] ?? "").trim(), what: f("what"), why: f("why it's Viking"), doneWhen: f("done when") };
}
export function cardsOf(io, ids) { // first board hit per id (approved boards before open ones)
  const out = {};
  for (const id of ids) for (const board of GATE.boards) {
    const c = findCard(io.read(board), id);
    if (c) { out[id] = { id, board, ...c, card: parseCard(c.block) }; break; }
  }
  return out;
}

// ---- moments (point 2's list, plain code) ---------------------------------------------------
const kindOf = (t) => MERGE.moments.find((k) => k.re.test(t))?.kind ?? "clause";
const words = (t) => String(t).split(/\s+/).filter(Boolean);
function clauses(field) {
  let t = String(field ?? "").trim();
  if (t.length >= GATE.cutAt && !/[.!?)"”']$/.test(t)) t = t.replace(/\s*\S+$/, ""); // the board cut it mid-word
  return t.split(/;\s+|(?<=[a-z0-9)”"])\.\s+(?=[A-Z"“(])|\s+—\s+(?=(?:a|an|the)\s)/).map((c) => c.trim().replace(/[.;,:]+$/, "")).filter((c) => words(c).length >= GATE.minWords);
}
export function listMoments(card) {
  const out = [], push = (kind, text, src) => { if (!out.some((m) => m.text === text)) out.push({ id: card.id, kind, text, src }); };
  for (const c of clauses(card.doneWhen)) push(kindOf(c), c, "done when");
  for (const c of clauses(card.what)) { const k = kindOf(c); if (k !== "clause") push(k, c, "what"); }
  return out;
}

// ---- the spec -------------------------------------------------------------------------------
const FIELDS = ["title", "kind", "size", "where", "what", "why", "doneWhen"];
export const SPEC_SCHEMA = { type: "object", properties: {
  title: { type: "string", maxLength: 120 }, kind: { type: "string", maxLength: 20 }, size: { type: "string", maxLength: 4 },
  where: { type: "string", maxLength: 500 }, what: { type: "string", maxLength: 1600 }, why: { type: "string", maxLength: 600 },
  doneWhen: { type: "string", maxLength: 1600 }, moments: { type: "array", maxItems: GATE.maxMoments, items: { type: "string", maxLength: 300 } } },
  required: [...FIELDS, "moments"] };
export function coerceSpec(d) {
  if (!d || typeof d !== "object") return null;
  const s = Object.fromEntries(FIELDS.map((k) => [k, String(d[k] ?? d[k === "doneWhen" ? "done_when" : k] ?? "").trim()]));
  s.moments = Array.isArray(d.moments) ? d.moments.map(String) : [];
  return s;
}
export const missingFields = (s) => (s ? FIELDS.filter((k) => !s[k]) : FIELDS);
export const specText = (s) => `${s.title}\nkind: ${s.kind} · size: ${s.size} · where: ${s.where}\nwhat: ${s.what}\nwhy it's Viking: ${s.why}\ndone when: ${s.doneWhen}`;
const numbered = (ms) => ms.map((m, i) => `${i + 1}. [${m.id} ${m.kind}] ${m.text}`).join("\n");

export function draftRequest(a, b, moments) { // M2: JEV's one job
  const system = [
    "You are JEV, the den's planner for Mellowbrook (a Norse lakeside longhouse). Two approved ideas are the same thing in the same place; write ONE merged spec.",
    "Rule: add, never drop. Every player moment of BOTH ideas stays: each E-action, each sound, each visual, each done-when clause. Keep their own words where you can; weave, do not summarise away.",
    "One place: a single where (the shared spot). One size (one of XS S M L XL). One kind (one word, e.g. asset). No alternatives with 'or'.",
    "The merged done-when lists every done-when clause of both ideas, joined with semicolons. moments[] repeats each numbered moment as the merged spec now words it.",
    "Answer only with JSON matching the schema.",
  ].join("\n");
  const message = `=== IDEA ${a.id} ===\n${a.block.trim()}\n\n=== IDEA ${b.id} ===\n${b.block.trim()}\n\n=== MOMENTS THAT MUST SURVIVE (${moments.length}) ===\n${numbered(moments)}`;
  return { model: MERGE.draftModel, system, message, schema: SPEC_SCHEMA };
}
export const MAP_SCHEMA = { type: "object", properties: { maps: { type: "array", maxItems: GATE.maxMoments, items: { type: "object", properties: {
  n: { type: "integer" }, found: { type: "boolean" }, quote: { type: "string", maxLength: 300 } }, required: ["n", "found", "quote"] } } }, required: ["maps"] };
export function mapRequest(spec, moments) { // M3: VÖR's one job
  const system = [
    "You are VÖR, the watcher who misses nothing, checking a merge of two den ideas. For each numbered moment, find where the MERGED SPEC keeps it.",
    "quote = text copied character for character from the MERGED SPEC (never from the moment), at least 4 words, that shows the moment is kept. Plain code checks every quote verbatim.",
    "If the merged spec does not keep the moment (its action, sound or visual is gone or changed), found: false and quote \"\". Never guess.",
    "Answer only with JSON matching the schema: one entry per moment, n = its number.",
  ].join("\n");
  return { model: GATE.mapModel, system, message: `=== MERGED SPEC ===\n${specText(spec)}\n\n=== MOMENTS (${moments.length}) ===\n${numbered(moments)}`, schema: MAP_SCHEMA };
}

// ---- the five checks (M3) ---------------------------------------------------------------------
const res = (n, pass, why) => ({ n, id: P[n - 1].id, pass, why });
const zoneOf = (where) => GATE.zones[derivePlace(where)] ?? null;
export function keyOf(card, indexText) {
  const m = new RegExp(`^${card.id} (\\S+@\\S+)`, "m").exec(String(indexText ?? ""));
  return m ? normKey(m[1]) : deriveKey(card);
}
export function checkIdentity(a, b, indexText) { // point 1
  const ka = keyOf(a, indexText), kb = keyOf(b, indexText), za = zoneOf(a.where), zb = zoneOf(b.where);
  if (ka && ka === kb) return res(1, true, `keys match: ${ka}`);
  if (za && za === zb) return res(1, true, `one zone: ${za} (${ka} · ${kb})`);
  return res(1, false, `different places: ${a.id} ${ka} (${za ?? "no zone"}) vs ${b.id} ${kb} (${zb ?? "no zone"}): not a merge, offer KEEP`);
}
const EVIDENCE_IDS = POINTS.map((p) => p.id);
export function quoteHolds(quote, hay) { // the WATCHER's evidence rule, reused whole: checkVerdict on a one-quote verdict
  const v = { points: EVIDENCE_IDS.map((id) => ({ id, pass: true, evidence: String(quote ?? ""), why: "moment" })) };
  const r = checkVerdict(v, hay).points[0];
  return !!(r?.ok && r?.pass);
}
export function checkMoments(spec, moments, answer) { // point 2
  const hay = specText(spec), maps = Array.isArray(answer?.maps) ? answer.maps : null;
  if (!maps) return res(2, false, "VÖR's map was malformed or missing: nothing mapped");
  const lost = moments.filter((m, i) => { const a = maps.find((x) => +x?.n === i + 1); return !(a?.found === true && quoteHolds(a.quote, hay)); });
  return lost.length ? res(2, false, `${lost.length} of ${moments.length} moments lost: ${lost.slice(0, 3).map((m) => `${m.id} ${m.kind} "${m.text.slice(0, 60)}"`).join("; ")}`)
    : res(2, true, `${moments.length} of ${moments.length} moments kept (${[...new Set(moments.map((m) => m.kind))].join(", ")})`);
}
const idRe = (id) => new RegExp(`(^|[^A-Za-z0-9])${id}(?![0-9])`);
export function checkConflict(spec, a, b, io) { // point 3 (the kind rule allows hyphenated board kinds: "mini-game" failed MD24 live, Claude)
  const bad = [];
  const za = zoneOf(a.where), zb = zoneOf(b.where), zs = zoneOf(spec.where);
  if (!spec.where) bad.push("no where");
  else if (za && za === zb && zs !== za) bad.push(`merged where (${zs ?? derivePlace(spec.where)}) leaves the sources' zone ${za}`);
  if (!GATE.sizes.includes(spec.size)) bad.push(`size "${spec.size}" is not one size`);
  if (!/^[a-z]+(?:-[a-z]+)*$/i.test(spec.kind) || (!GATE.kinds.includes(spec.kind.toLowerCase()) && ![a.kind, b.kind].includes(spec.kind))) bad.push(`kind "${spec.kind}" is not one kind`);
  const index = io.read(GATE.indexFile) ?? "", ka = keyOf(a, index), kb = keyOf(b, index);
  for (const l of index.split("\n")) {
    if (/^- NOT-DUPE /.test(l) && idRe(a.id).test(l) && idRe(b.id).test(l)) bad.push(`ruled not duplicates: ${l.slice(2)}`);
    if (/^- B\d+ /.test(l) && [ka, kb].some((k) => k && l.includes(` ${k} `))) bad.push(`banned: ${l.slice(2, 60)}`);
  }
  const ruled = [...(io.read(GATE.rulingsFile) ?? "").split("\n"), ...(io.read(GATE.findingsFile) ?? "").split("\n").filter((l) => l.includes("PROTECTED"))];
  for (const l of ruled) if (idRe(a.id).test(l) || idRe(b.id).test(l)) bad.push(`ruling names it: ${l.trim().slice(0, 80)}`);
  const claims = (io.read(GATE.claimsFile) ?? "").split("\n"), tag = (l) => /^- ([^·]+?) · /.exec(l)?.[1]?.trim();
  for (const l of claims) if (/\bCLAIMED\b/.test(l) && (idRe(a.id).test(l) || idRe(b.id).test(l))) {
    const t = tag(l); if (!claims.some((d) => /\bDONE\b/.test(d) && tag(d) === t)) bad.push(`open claim: ${l.slice(2, 70)}`);
  }
  for (const l of (io.read(GATE.queueFile) ?? "").split("\n")) if (/\bBUILDING\b|IN PROGRESS/.test(l) && (l.includes(`[${a.id}]`) || l.includes(`[${b.id}]`))) bad.push(`running build: ${l.trim().slice(0, 70)}`);
  return bad.length ? res(3, false, bad.slice(0, 3).join("; ")) : res(3, true, `one where (${zs ?? derivePlace(spec.where)}), size ${spec.size}, kind ${spec.kind}; no ruling, claim or running build`);
}
export function checkAuth(pair, a, b) { // point 5 (the audit half is the MERGES.md block commitMerge writes)
  const approved = [a, b].some((c) => markOf(c.state) !== "open");
  if (pair?.who !== "creator" || pair?.sealed !== true) return res(5, false, `${approved ? "approved ideas" : "a merge"}: only the creator's rune-board seal starts it (got ${pair?.who ?? "nobody"}${pair?.sealed ? ", sealed" : ", unsealed"})`);
  if (!approved && !(["savi", "claude"].every((w) => pair.agreed?.includes(w)))) return res(5, false, "open ideas: Savi and Claude must both agree before the creator's card");
  return res(5, true, `creator seal${approved ? " (approved ideas)" : " + Savi + Claude"}; audited in MERGES.md`);
}
export function resultsLine(rs) {
  return P.map((p) => { const r = rs.find((x) => x?.n === p.n); return `${p.n} ${p.id} ${r ? (r.pass ? "PASS" : "FAIL") : "–"}`; }).join(" · ");
}

// ---- ledger + undo (M4) -------------------------------------------------------------------------
const tailOf = (block) => /\n*$/.exec(block)[0];
export function renderMerged(spec, a, b, n) {
  const keepTail = a.block.split("\n").filter((l) => /^- (?:critical|votes|approved):/.test(l));
  return [`## ${a.id} · ${spec.title} · ${a.card.state.split(" · ")[0] || "TODO"} · merged ${b.id} + ${a.id}, not yet built`,
    `- kind: ${spec.kind} · size: ${spec.size} · where: ${spec.where}`, `- what: ${spec.what}`, `- why it's Viking: ${spec.why}`, `- done when: ${spec.doneWhen}`,
    `- merged: ${b.id} + ${a.id} · ${GATE.mergesFile} M${n} keeps both originals verbatim with sha256 · UNMERGE ${a.id} restores them`, ...keepTail].join("\n") + (tailOf(a.block) || "\n");
}
export function renderGone(b, keepId, n) {
  return `## ${b.id} · ${b.card.title} · MERGED→${keepId}\n- merged into ${keepId} (${GATE.mergesFile} M${n}); its original text is kept there verbatim with its sha256 · UNMERGE ${keepId} restores it` + (tailOf(b.block) || "\n");
}
function replaceCards(io, edits) { // edits: [{ board, id, text }]: re-find each card in its board's CURRENT text, splice, one write per board
  const byBoard = new Map();
  for (const e of edits) { if (!byBoard.has(e.board)) byBoard.set(e.board, io.read(e.board) ?? ""); }
  for (const e of edits) { const t = byBoard.get(e.board), c = findCard(t, e.id); if (!c) return `card ${e.id} not found on ${e.board}`; byBoard.set(e.board, t.slice(0, c.start) + e.text + t.slice(c.end)); }
  for (const [board, t] of byBoard) io.write(board, t);
  return null;
}
export function parseMerges(text) {
  const t = String(text ?? ""), out = [];
  const heads = [...t.matchAll(/^## M(\d+) · ([DS]\d+) ⇐ ([DS]\d+) · [^\n]*$/gm)];
  heads.forEach((h, i) => {
    const from = h.index, next = /^## (?:M\d+|GATE) · /m.exec(t.slice(from + 1)), to = next ? from + 1 + next.index : t.length, seg = t.slice(from, to); // M5: a '## GATE' audit block ends a merge block too
    const b = { n: +h[1], keep: h[2], gone: h[3], from, to, orig: {}, hash: {}, board: {}, unmerged: /^- UNMERGED /m.test(seg) };
    for (const m of seg.matchAll(/^- (?:keep|gone) ([DS]\d+) sha256 ([0-9a-f]{64}) · (\S+)$/gm)) { b.hash[m[1]] = m[2]; b.board[m[1]] = m[3]; }
    for (const m of seg.matchAll(/^~~~~ original ([DS]\d+) sha256:([0-9a-f]{64}) chars:(\d+)\n/gm)) { const s = m.index + m[0].length; b.orig[m[1]] = seg.slice(s, s + +m[3]); }
    out.push(b);
  });
  return out;
}
export function commitMerge(io, { a, b, spec, results, moments, who, when }) {
  const failed = (results ?? []).filter((r) => r.n !== 4 && !r.pass);
  if (failed.length || (results ?? []).filter((r) => r.n !== 4).length < 4) return { ok: false, results: results ?? [], line: `refused: point ${failed.map((r) => r.n).join(",") || "?"} not passed; nothing changed` };
  const led = io.read(GATE.mergesFile) ?? "", n = parseMerges(led).reduce((m, x) => Math.max(m, x.n), 0) + 1;
  const ha = sha256(a.block), hb = sha256(b.block), keepText = renderMerged(spec, a, b, n), goneText = renderGone(b, a.id, n);
  const r4 = res(4, true, `originals kept with sha256 in MERGES.md M${n}`), all = [...results.filter((r) => r.n !== 4), r4].sort((x, y) => x.n - y.n);
  const block = [`## M${n} · ${a.id} ⇐ ${b.id} · ${when} · by ${who}`, `- results: ${resultsLine(all)}`,
    `- keep ${a.id} sha256 ${ha} · ${a.board}`, `- gone ${b.id} sha256 ${hb} · ${b.board}`,
    `- wrote ${a.id} sha256 ${sha256(keepText)} · ${b.id} sha256 ${sha256(goneText)}`, `- moments: ${moments.length} kept of ${moments.length}`,
    `~~~~ original ${a.id} sha256:${ha} chars:${a.block.length}`, a.block, `~~~~ end ${a.id}`,
    `~~~~ original ${b.id} sha256:${hb} chars:${b.block.length}`, b.block, `~~~~ end ${b.id}`, ""].join("\n");
  io.write(GATE.mergesFile, led.replace(/\n*$/, "\n\n") + block); // the originals are safe BEFORE any card changes
  const back = parseMerges(io.read(GATE.mergesFile)).find((x) => x.n === n);
  if (!back || sha256(back.orig[a.id] ?? "") !== ha || sha256(back.orig[b.id] ?? "") !== hb) { io.write(GATE.mergesFile, led); return { ok: false, results: [...all.filter((r) => r.n !== 4), res(4, false, "ledger copy did not re-hash: nothing changed")] }; }
  const err = replaceCards(io, [{ board: a.board, id: a.id, text: keepText }, { board: b.board, id: b.id, text: goneText }]);
  if (err) { io.write(GATE.mergesFile, led); return { ok: false, results: [...all.filter((r) => r.n !== 4), res(4, false, `${err}: nothing changed`)] }; }
  return { ok: true, n, hashes: { [a.id]: ha, [b.id]: hb }, results: all };
}
export function unmerge(io, id, who, when) {
  if (!GATE.unmergers.includes(who)) return { ok: false, line: `UNMERGE ${id} refused: only the creator, Savi or Claude may undo a merge` };
  const led = io.read(GATE.mergesFile) ?? "", b = parseMerges(led).filter((x) => !x.unmerged && (x.keep === id || x.gone === id)).pop();
  if (!b) return { ok: false, line: `UNMERGE ${id}: no open merge names it` };
  for (const k of [b.keep, b.gone]) if (sha256(b.orig[k] ?? "") !== b.hash[k]) return { ok: false, line: `UNMERGE ${id} refused: the ledger copy of ${k} no longer matches its sha256; nothing changed` };
  for (const k of [b.keep, b.gone]) { const c = findCard(io.read(b.board[k]), k); if (!c) return { ok: false, line: `UNMERGE ${id} refused: ${k} is gone from ${b.board[k]}; nothing changed` };
    if (!c.block.includes(`MERGES.md M${b.n}`)) return { ok: false, line: `UNMERGE ${id} refused: ${k}'s card no longer carries M${b.n}; nothing changed` }; }
  const before = Object.fromEntries([...new Set([b.board[b.keep], b.board[b.gone]])].map((f) => [f, io.read(f)]));
  const err = replaceCards(io, [b.keep, b.gone].map((k) => ({ board: b.board[k], id: k, text: b.orig[k] })));
  const got = [b.keep, b.gone].map((k) => sha256(findCard(io.read(b.board[k]), k)?.block ?? ""));
  if (err || got[0] !== b.hash[b.keep] || got[1] !== b.hash[b.gone]) { for (const [f, t] of Object.entries(before)) io.write(f, t); return { ok: false, line: `UNMERGE ${id} refused: restored text did not re-hash (${err ?? "hash mismatch"}); boards put back` }; }
  const line = `- UNMERGED ${when} by ${who} · ${b.keep} sha256 match · ${b.gone} sha256 match`;
  const seg = led.slice(b.from, b.to).replace(/\n*$/, ""), rest = led.slice(b.to);
  io.write(GATE.mergesFile, led.slice(0, b.from) + seg + "\n" + line + "\n" + (rest ? "\n" + rest.replace(/^\n+/, "") : ""));
  return { ok: true, n: b.n, line: `UNMERGE ${b.keep} + ${b.gone}: both cards restored byte for byte (sha256 match)`, hashes: { [b.keep]: got[0], [b.gone]: got[1] } };
}

// ---- the flow: request -> draft job -> checks 1/3/5 -> VÖR job -> check 2 -> ledger (4) -> PASS ----------------------
export function fileIo(ctx) { return { read: (p) => (ctx.world.files ?? []).includes(p) ? ctx.files.read(p) : null, write: (p, t) => ctx.files.write(p, t) }; }
const whenOf = (now) => (now > 1.6e12 ? new Date(now).toISOString().slice(0, 16).replace("T", " ") + " UTC" : `room t+${Math.round(now / 60e3)} min`);
export function prepare(io, pair) {
  const got = cardsOf(io, [pair.keep, pair.gone]), a = got[pair.keep], b = got[pair.gone];
  if (!a || !b) return { error: `card ${!a ? pair.keep : pair.gone} not found on any idea board` };
  const moments = [...listMoments(a.card), ...listMoments(b.card)].slice(0, GATE.maxMoments);
  return { a: { ...a, ...a.card, card: a.card }, b: { ...b, ...b.card, card: b.card }, moments };
}
export function preChecks(io, pair, a, b, spec) { return [checkIdentity(a, b, io.read(GATE.indexFile)), checkConflict(spec, a, b, io), checkAuth(pair, a, b)]; }
export function requestMerge(s, pair, who) {
  if (!MERGE.on || !pair?.keep || !pair?.gone || pair.keep === pair.gone) return null;
  if (s?.mergeAsking) return { busy: s.mergeAsking.id };
  const id = pair.id ?? `M${pair.gone}`;
  PEND.set(id, { pair: { ...pair, id, who: who ?? pair.who }, stage: "new", at: pair.at ?? 0, results: [] });
  return { mergeAsking: { id, at: pair.at ?? 0 } };
}
function finish(q, pass, line) { q.stage = "done"; q.result = { id: q.pair.id, keep: q.pair.keep, gone: q.pair.gone, pass, results: q.results, line: `MERGE ${q.pair.keep} ⇐ ${q.pair.gone}: ${pass ? "PASS" : "FAIL"} · ${resultsLine(q.results)}${line ? ` · ${line}` : ""}` }; }
const failLine = (rs) => { const f = rs.find((r) => !r.pass); return f ? `point ${f.n} ${P[f.n - 1].name}: ${f.why}` : ""; };
function flight(ctx, s, now) {
  const a = s?.mergeAsking; if (!a) return null;
  const q = PEND.get(a.id);
  const close = (pass, results, line) => ({ patch: { mergeAsking: null }, result: { id: a.id, pass, results, line } });
  if (!q) return now - (a.at ?? 0) > GATE.timeoutMs || !a.at ? close(false, [], `MERGE ${a.id}: FAIL · the gate restarted mid-merge; nothing changed, seal again`) : null;
  if (q.stage === "done") { PEND.delete(a.id); return { patch: { mergeAsking: null }, result: q.result }; }
  if (q.stage === "new") {
    const io = fileIo(ctx), got = prepare(io, q.pair);
    if (got.error) { finish(q, false, got.error); return null; }
    Object.assign(q, got, { stage: "drafting", at: now });
    ctx.log("merge-gate: request", { id: a.id, keep: q.pair.keep, gone: q.pair.gone, moments: q.moments.length });
    meter(ctx, "merge"); ctx.job("llm:generate", draftRequest(q.a, q.b, q.moments), "onMergeJob", { id: a.id, kind: "draft", at: now });
    return { patch: { mergeAsking: { id: a.id, at: now } } };
  }
  if (now - q.at > GATE.timeoutMs) { finish(q, false, `the ${q.stage === "mapping" ? "VÖR map" : "draft"} job timed out; nothing changed`); PEND.delete(a.id); return { patch: { mergeAsking: null }, result: q.result }; }
  return null;
}
export function onMergeJob(ctx, r, p) {
  const q = PEND.get(p?.id); if (!q || q.at !== p?.at || q.stage === "done") return; // a late answer
  const data = r?.ok ? (r.data?.object ?? r.data) : null;
  if (!data) meter(ctx, "merge", "fail");
  if (p.kind === "draft" && q.stage === "drafting") {
    const spec = coerceSpec(data), miss = missingFields(spec);
    ctx.log("merge-gate: draft", { id: p.id, chars: spec ? specText(spec).length : 0, missing: miss, moments: spec?.moments?.length ?? 0 });
    if (miss.length) { q.results = [res(2, false, `JEV's draft is missing ${miss.join(", ")}`)]; return finish(q, false, failLine(q.results)); }
    q.spec = spec; q.results = preChecks(fileIo(ctx), q.pair, q.a, q.b, spec);
    if (q.results.some((x) => !x.pass)) return finish(q, false, failLine(q.results));
    q.stage = "mapping"; meter(ctx, "merge"); ctx.job("llm:generate", mapRequest(spec, q.moments), "onMergeJob", { id: p.id, kind: "map", at: q.at });
    return;
  }
  if (p.kind === "map" && q.stage === "mapping") {
    q.results = [...q.results, checkMoments(q.spec, q.moments, data)].sort((x, y) => x.n - y.n);
    if (q.results.some((x) => !x.pass)) return finish(q, false, failLine(q.results));
    const c = commitMerge(fileIo(ctx), { a: q.a, b: q.b, spec: q.spec, results: q.results, moments: q.moments, who: q.pair.seal ? `${q.pair.who} · ${q.pair.seal}` : q.pair.who, when: whenOf(ctx.now()) });
    q.results = c.results; ctx.log("merge-gate: " + (c.ok ? "merged" : "ledger refused"), { id: p.id, n: c.n, hashes: c.hashes });
    return finish(q, c.ok, c.ok ? `MERGES.md M${c.n}` : failLine(q.results));
  }
}
// ---- M5 WIRING: a YES seal on a MERGE card (build-queue.js applyMerge no longer relabels while MERGE.on) is picked up here, on
// board-jev's knock, and runs the gate; PASS relabels BUILD-QUEUE.md (applyMerge, gated), FAIL writes a '## GATE' audit block.
// Either way the card's line reads PASS or the failing point, and the seal's key lands in MERGES.md so it is judged exactly once.
const SEEN = new Set();
export const sealKey = (sl) => `seal ${sl?.hash ?? "?"}@${Math.round(sl?.at ?? 0)}`;
export function sealedRequests(ctx) { // YES seals on MERGE cards the gate has not judged yet (0 file reads when none)
  const seals = ctx.getObject?.(VB.id)?.state?.seals; if (!seals) return [];
  const open = Object.entries(seals).filter(([id, v]) => /^M[DS]\d+$/.test(id) && v?.vote === "YES" && !SEEN.has(id + "|" + sealKey(v)));
  if (!open.length) return [];
  const led = fileIo(ctx).read(GATE.mergesFile) ?? "", out = [];
  for (const [id, v] of open) { const k = sealKey(v); if (led.includes(k)) SEEN.add(id + "|" + k); else out.push({ id, seal: v, key: k }); }
  return out;
}
export function pairOf(ctx, s, req, now) {
  const card = (s?.voteCards ?? []).find((c) => c.id === req.id && c.hash === req.seal.hash) ?? (s?.voteCards ?? []).find((c) => c.id === req.id);
  const g = card ? groupOf(card) : null;
  if (!g) return { error: `the sealed card ${req.id} is gone from the board; nothing changed` };
  if (g.ids.length !== 2) return { error: `the gate merges two cards at a time; ${g.ids.join(" + ")} is ${g.ids.length}` };
  const order = [...String(fileIo(ctx).read(BQ.file) ?? "").matchAll(/^\d+\. \[([DS]\d+)\]/gm)].map((m) => m[1]);
  const keep = [...g.ids].sort((a, b) => ((order.indexOf(a) + 1 || 1e9) - (order.indexOf(b) + 1 || 1e9)))[0]; // applyMerge's own keep rule
  return { id: req.id, keep, gone: g.ids.find((x) => x !== keep), key: g.key, who: req.seal.userId === VB.creatorUserId ? "creator" : "unknown", sealed: true, seal: req.key, at: now };
}
function record(ctx, s, result, pair) {
  const io = fileIo(ctx), when = whenOf(ctx.now()), seal = pair?.seal ?? sealKey(ctx.getObject?.(VB.id)?.state?.seals?.[result.id]);
  if (result.pass) { const qt = io.read(BQ.file); if (qt != null) io.write(BQ.file, applyMerge(qt, { ids: [result.keep, result.gone], key: pair?.key ?? "" }, when, true)); }
  else { const led = io.read(GATE.mergesFile) ?? ""; io.write(GATE.mergesFile, led.replace(/\n*$/, "\n\n") + `## GATE · ${result.id} FAIL · ${when} · ${seal}\n- ${result.line}\n`); }
  SEEN.add(result.id + "|" + seal);
  ctx.log("merge-gate: " + (result.pass ? "PASS" : "FAIL"), { id: result.id, line: result.line });
  ctx.notifyDm?.(result.line);
  const cards = s?.voteCards; if (!Array.isArray(cards) || !cards.some((c) => c.id === result.id)) return {};
  return { voteCards: cards.map((c) => (c.id === result.id ? { ...c, line: String(result.line).slice(0, 160) } : c)) };
}
export function mergeStep(ctx, s, now) { // board-jev's one call site: stores out.patch on board-bell (mergeAsking, voteCards)
  if (!s?.mergeAsking) {
    if (!MERGE.on) return null;
    const req = sealedRequests(ctx)[0]; if (!req) return null;
    const pair = pairOf(ctx, s, req, now);
    if (pair.error) { const result = { id: req.id, pass: false, results: [], line: `MERGE ${req.id}: FAIL · ${pair.error}` }; return { patch: record(ctx, s, result, { seal: req.key }), result }; }
    return { patch: requestMerge(s, pair, pair.who) ?? {} };
  }
  const pair = PEND.get(s.mergeAsking.id)?.pair, out = flight(ctx, s, now);
  if (out?.result) out.patch = { ...out.patch, ...record(ctx, s, out.result, pair) };
  return out;
}
export const _pending = PEND; // tests only
