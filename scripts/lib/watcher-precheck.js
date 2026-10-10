// WATCHER H0 PRE-FLIGHT (docs/board/proposals/WATCHER.md, lane W2). Plain code, no LLM, pure:
// precheck(text, io, { claims, self }) -> { ok, faults: [{ kind, detail }] }
// io = { read(path) -> text|null, exists(path) -> bool, list() -> string[] } (world: ctx.files.read / ctx.world.files; node: fs).
// claims: optional, string paths or { path, by } rows (parseClaims(CLAIMS.md text) builds them); self: the plan's own path.
import { WATCH } from "./data/watcher.js";

const ROOTS = "scripts|docs|places|templates|jobs";
const PATH_RE = new RegExp("(^|[^\\w./-])((?:" + ROOTS + ")/[\\w./<>*{}-]*[\\w/>*}])", "g");
const FILE_TOKEN_RE = /(^|[^\w./-])((?:[\w-]+\/)*[\w-][\w.-]*\.(?:js|mjs|md|ya?ml|json|scene|glb|gltf|png|jpe?g|webp|ktx2|mp3|wav|ogg|blend|fbx|obj))\b/g;
const ART_EXT = /\.(glb|gltf|png|jpe?g|webp|ktx2|mp3|wav|ogg|blend|fbx|obj)$/i;
const LOGIC_EXT = /\.(js|mjs|scene|ya?ml|json)$/i;
const LANE_RE = /^\s*[-*]\s*\**([A-Z]{1,2}\d{1,2})\**\s+([A-Z][A-Z0-9 &/_-]*[A-Z0-9])\**\s*:\s*(.*)$/;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text, word) => new RegExp("(^|[^\\w])" + esc(word) + "(?![\\w])", "i").test(text);
const placeholder = (p) => /[<>*{}]/.test(p);
const base = (p) => p.split("/").pop();

function listOf(io) { try { return io.list ? io.list() || [] : []; } catch { return []; } }
function exists(io, p, all) {
  try { if (io.exists && io.exists(p)) return true; } catch {}
  return all.includes(p);
}
function dirExists(io, dir, all) {
  const d = dir.replace(/\/+$/, "");
  if (!d) return true;
  try { if (io.exists && io.exists(d)) return true; } catch {}
  return all.some((f) => f.startsWith(d + "/"));
}

// every rooted path the text names, with whether "(new)" follows it on its line
export function namedPaths(text) {
  const out = [];
  for (const line of text.split("\n")) {
    PATH_RE.lastIndex = 0;
    let m;
    while ((m = PATH_RE.exec(line))) {
      const p = m[2].replace(/[.\-]+$/, "");
      const after = line.slice(m.index + m[0].length, m.index + m[0].length + 12);
      out.push({ path: p, isNew: /^`?\s*\(new\)/i.test(after), line });
    }
  }
  return out;
}

function checkPaths(text, io, all, faults) {
  const seen = new Set();
  for (const { path, isNew } of namedPaths(text)) {
    if (placeholder(path) || seen.has(path + isNew)) continue;
    seen.add(path + isNew);
    if (path.endsWith("/")) { if (!dirExists(io, path, all)) faults.push({ kind: "path", detail: `folder ${path} does not exist` }); continue; }
    if (exists(io, path, all) || dirExists(io, path, all) && !/\.\w+$/.test(path)) continue;
    const dir = path.slice(0, path.lastIndexOf("/"));
    if (isNew) { if (!dirExists(io, dir, all)) faults.push({ kind: "path", detail: `${path} (new): folder ${dir}/ does not exist` }); }
    else faults.push({ kind: "path", detail: `${path} does not exist${dirExists(io, dir, all) ? " (mark it (new) if the plan creates it)" : ` and neither does ${dir}/`}` });
  }
}

// keys quoted next to a scripts/lib/data/*.js file: "data/x.js KEY.sub", "x.js `KEY`", or a `KEY:` token on the same line
function checkKeys(text, io, all, faults) {
  const seen = new Set();
  const fileRe = /(?:scripts\/lib\/)?data\/([\w-]+)\.js/g;
  for (const line of text.split("\n")) {
    fileRe.lastIndex = 0;
    let m;
    while ((m = fileRe.exec(line))) {
      const path = `scripts/lib/data/${m[1]}.js`;
      const keys = [];
      const rest = line.slice(m.index + m[0].length);
      const next = rest.match(/^`?\s+`?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(`?)/);
      if (next) {
        const k = next[1];
        if (next[2] === "`" || k.includes(".") || /^[A-Z][A-Z0-9_]+$/.test(k)) keys.push(k);
      }
      for (const q of line.matchAll(/`([A-Za-z_$][\w$]*(?:\.[\w$]+)*):`/g)) keys.push(q[1]);
      for (const q of line.matchAll(/"([A-Za-z_$][\w$]*):"/g)) keys.push(q[1]);
      if (!keys.length) continue;
      const src = io.read ? io.read(path) : null;
      if (src == null) continue; // a missing file is the path check's fault
      for (const k of keys) {
        if (seen.has(path + k)) continue;
        seen.add(path + k);
        const miss = k.split(".").filter((seg) => !new RegExp("(^|[^\\w$])" + esc(seg) + "(?![\\w$])").test(src));
        if (miss.length) faults.push({ kind: "key", detail: `${path} has no key ${k} (missing: ${miss.join(", ")})` });
      }
    }
  }
}

// board ids: TASK n, D12, S40, J3, #67, found in docs/board/**/*.md (or defined by the plan at a line/label start)
export function boardIds(text) {
  const ids = new Set();
  for (const m of text.matchAll(/\bTASK\s+(\d+)\b/g)) ids.add(`TASK ${m[1]}`);
  for (const m of text.matchAll(/(^|[^\w#/.-])([DSJ]\d{1,3})(?![\w.])/g)) ids.add(m[2]);
  for (const m of text.matchAll(/(^|[^\w&])#(\d{1,4})(?![\w])/g)) ids.add(`#${m[2]}`);
  return [...ids];
}
function checkIds(text, io, all, faults, self) {
  const ids = boardIds(text);
  if (!ids.length) return;
  const docs = all.filter((f) => f.startsWith("docs/board/") && f.endsWith(".md") && f !== self);
  let corpus = "";
  for (const f of docs) { const t = io.read(f); if (t) corpus += "\n" + t; }
  const defined = (id) => new RegExp("^\\s*(?:[-*]\\s*)?\\**" + esc(id) + "\\b", "m").test(text);
  for (const id of ids) {
    const re = id.startsWith("TASK")
      ? new RegExp("\\bTASK\\s+" + id.slice(5) + "\\b")
      : id.startsWith("#") ? new RegExp("(^|[^\\w&])" + esc(id) + "(?![\\w])") : new RegExp("(^|[^\\w])" + id + "(?![\\w])");
    if (!re.test(corpus) && !defined(id)) faults.push({ kind: "id", detail: `${id} appears nowhere in docs/board/*.md` });
  }
}

// required sections: the word in a heading, a **bold** run, or a "Label:" line start
function checkSections(text, faults) {
  const labels = [];
  for (const line of text.split("\n")) {
    const h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (h) labels.push(h[1]);
    for (const b of line.matchAll(/\*\*([^*]+)\*\*/g)) labels.push(b[1]);
    const l = line.match(/^\s*(?:[-*]\s*)?([^:\n]{1,60}):/);
    if (l) labels.push(l[1]);
  }
  const joined = labels.join("\n");
  for (const word of WATCH.requiredSections) if (!has(joined, word)) faults.push({ kind: "section", detail: `no heading or label names "${word}"` });
}

// lane footprints: "- W3 NAME: files" lines, pairwise disjoint, and clear of claims
export function lanes(text) {
  const out = [];
  for (const line of text.split("\n")) {
    const m = line.match(LANE_RE);
    if (!m) continue;
    const files = new Set();
    for (const { path } of namedPaths(m[3])) files.add(path.replace(/\/$/, ""));
    FILE_TOKEN_RE.lastIndex = 0;
    let t;
    while ((t = FILE_TOKEN_RE.exec(m[3]))) if (!t[2].startsWith(".")) {
      const tok = t[2];
      if (![...files].some((f) => f === tok || f.endsWith("/" + tok))) files.add(tok);
    }
    out.push({ id: m[1], name: m[2].trim(), files: [...files] });
  }
  return out;
}
const same = (a, b) => (a.includes("/") && b.includes("/") && /^(?:scripts|docs|places|templates|jobs)\//.test(a) && /^(?:scripts|docs|places|templates|jobs)\//.test(b)) ? a === b : base(a) === base(b) || a.endsWith("/" + b) || b.endsWith("/" + a);
function checkLanes(text, faults, claims) {
  const ls = lanes(text);
  for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++)
    for (const a of ls[i].files) for (const b of ls[j].files)
      if (same(a, b)) faults.push({ kind: "lanes", detail: `${ls[i].id} and ${ls[j].id} both touch ${a === b ? a : a + " / " + b}` });
  const cl = (claims || []).map((c) => typeof c === "string" ? { path: c, by: "" } : { path: c.path || c.file, by: c.by || c.id || "" }).filter((c) => c.path);
  for (const l of ls) for (const f of l.files) for (const c of cl)
    if (same(f, c.path)) faults.push({ kind: "claim", detail: `${l.id} touches ${f}, claimed${c.by ? " by " + c.by : ""}` });
}
// CLAIMS.md -> [{ path, by }] for ids whose last line is CLAIMED
export function parseClaims(text) {
  const last = new Map();
  for (const line of (text || "").split("\n")) {
    const m = line.match(/^\s*-\s*([^·]+?)\s*·\s*([^·]+?)\s*·\s*(CLAIMED|DONE|RELEASED)\s*·(.*)$/);
    if (m) last.set(m[1], { by: `${m[1]} (${m[2]})`, state: m[3], note: m[4] });
  }
  const out = [];
  for (const r of last.values()) if (r.state === "CLAIMED") for (const { path } of namedPaths(r.note)) if (!placeholder(path)) out.push({ path, by: r.by });
  return out;
}

// FINDINGS PROTECTED lines: a plan naming that file must quote it back (the word PROTECTED, or the rule, beside the file)
function checkProtected(text, io, faults) {
  const f = io.read ? io.read(WATCH.findingsFile) : null;
  if (!f) return;
  const planLines = text.split("\n");
  for (const line of f.split("\n")) {
    if (!line.includes("PROTECTED")) continue;
    const files = new Set();
    FILE_TOKEN_RE.lastIndex = 0;
    let t;
    while ((t = FILE_TOKEN_RE.exec(line))) if (/\.(js|mjs|scene|ya?ml|json)$/.test(t[2])) files.add(base(t[2]));
    const rule = (line.split(/PROTECTED[^:]*:/)[1] || "").trim();
    const ruleBits = rule.split(/[,.;]/).map((s) => s.trim().toLowerCase()).filter((s) => s.length > 12);
    for (const file of files) {
      if (!has(text, file)) continue;
      const near = planLines.some((pl) => has(pl, file) && /PROTECTED/.test(pl));
      const quoted = ruleBits.some((r) => text.toLowerCase().includes(r));
      if (!near && !quoted) faults.push({ kind: "protected", detail: `names ${file} but does not quote its PROTECTED finding: "${rule.slice(0, 120)}"` });
    }
  }
}

export function precheck(text, io, opts = {}) {
  const faults = [];
  const src = String(text || "").replace(/\r\n?/g, "\n"); // CRLF copies (Windows checkouts) must not hide headings (Claude, JEV-LEDGER pre-flight)
  const all = listOf(io);
  checkPaths(src, io, all, faults);
  checkKeys(src, io, all, faults);
  checkIds(src, io, all, faults, opts.self);
  checkSections(src, faults);
  checkLanes(src, faults, opts.claims);
  checkProtected(src, io, faults);
  return { ok: faults.length === 0, faults };
}

// Q3: a plan that names art assets (GLB, texture, sound) and no script, scene or data logic
export function isArtOnly(text) {
  const src = String(text || "").replace(/\r\n?/g, "\n"); // CRLF copies (Windows checkouts) must not hide headings (Claude, JEV-LEDGER pre-flight)
  let art = 0, logic = 0;
  FILE_TOKEN_RE.lastIndex = 0;
  let t;
  while ((t = FILE_TOKEN_RE.exec(src))) { if (ART_EXT.test(t[2])) art++; else if (LOGIC_EXT.test(t[2])) logic++; }
  for (const { path } of namedPaths(src)) if (/^(scripts|templates|jobs|places)\//.test(path) && !ART_EXT.test(path)) logic++;
  return art > 0 && logic === 0;
}
