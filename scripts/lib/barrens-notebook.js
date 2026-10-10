// World 302 v2 / Barrens chat crowd, lane 5: the human notebook (docs/board/BARRENS-VARIETY-PLAN-2026-10-06.md fix 7).
// Pure, no ctx, no clock, no dice: the runner keeps the object in place.state.barrens.notes and hands in ctx.now().
// Shape (plain JSON): notes = { "<lowercase display name>": { lines: [{ t, at }], nick?, at } }
// Caps: NB.perHuman notes each (oldest dropped), NB.humans humans (least recently touched dropped), NB.noteMax chars a note.
// Every call returns a NEW object; the input is never mutated (safe on state proxies).

export const NB = { perHuman: 6, humans: 12, noteMax: 80, nickMax: 24 };

const keyOf = (name) => String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();

function copy(notes) {
  const out = {};
  if (notes && typeof notes === 'object') {
    for (const k of Object.keys(notes)) {
      const e = notes[k];
      if (!e || typeof e !== 'object') continue;
      const lines = Array.isArray(e.lines) ? e.lines.filter((l) => l && typeof l.t === 'string').map((l) => ({ t: l.t, at: Number(l.at) || 0 })) : [];
      const row = { lines, at: Number(e.at) || 0 };
      if (typeof e.nick === 'string' && e.nick) row.nick = e.nick;
      out[k] = row;
    }
  }
  return out;
}

function capHumans(out, keep) {
  const keys = Object.keys(out);
  if (keys.length <= NB.humans) return out;
  keys.sort((a, b) => (a === keep) - (b === keep) || out[a].at - out[b].at); // oldest first, the touched one last
  for (const k of keys.slice(0, keys.length - NB.humans)) delete out[k];
  return out;
}

// noteAdd(notes, name, text, now) -> notes: one remembered thing about this human (a repeat of the newest note only refreshes it).
export function noteAdd(notes, name, text, now) {
  const out = copy(notes);
  const k = keyOf(name);
  const t = clean(text, NB.noteMax);
  if (!k || !t) return out;
  const at = Number(now) || 0;
  const row = out[k] ?? { lines: [], at };
  const lines = row.lines.filter((l) => l.t.toLowerCase() !== t.toLowerCase());
  lines.push({ t, at });
  row.lines = lines.slice(-NB.perHuman);
  row.at = at;
  out[k] = row;
  return capHumans(out, k);
}

// noteFor(notes, name) -> { lines: string[] (oldest first), nick? }
export function noteFor(notes, name) {
  const e = notes && typeof notes === 'object' ? notes[keyOf(name)] : null;
  const lines = e && Array.isArray(e.lines) ? e.lines.filter((l) => l && typeof l.t === 'string').map((l) => l.t) : [];
  const res = { lines };
  if (e && typeof e.nick === 'string' && e.nick) res.nick = e.nick;
  return res;
}

// noteNick(notes, name, nick) -> notes: the nickname a bot gave this human. Empty nick clears it.
// "Zezima" is the creator's alone: a nick naming it is refused unless the human is the creator's own name.
export function noteNick(notes, name, nick) {
  const out = copy(notes);
  const k = keyOf(name);
  if (!k) return out;
  const n = clean(nick, NB.nickMax);
  const row = out[k] ?? { lines: [], at: 0 };
  if (!n) { delete row.nick; if (out[k] || row.lines.length) out[k] = row; return out; }
  if (/zezima/i.test(n) && k !== 'zezima') return out;
  row.nick = n;
  out[k] = row;
  return capHumans(out, k);
}
