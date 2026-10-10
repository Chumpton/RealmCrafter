// (creator 2026-10-06: "add floating chat over head when message sent like runescape")
// A say line floats over the speaker in OSRS yellow with a black drop shadow for a few seconds; a new line replaces the old.
const LIFE = 5, MAX = 80, HEIGHT = 2.5
const live = new Map() // speaker id → bubble id (working memory; a lost one just times out on its lifetime)
const esc = (t) => String(t).replace(/[&<>"'{}]/g, (c) => `&#${c.charCodeAt(0)};`)
export function overhead(ctx, line) {
  const sc = line?.scope ?? 'say'
  if (sc !== 'say' && sc !== 'trade') return // public lines only: party, guild and messages stay private
  const by = line?.by ?? {}
  let who = by.id ? ctx.getObject(by.id) : null
  if (!who) who = ctx.place.players.find((p) => (by.userId && p.userId === by.userId) || (by.displayName && p.displayName === by.displayName)) ?? null
  const id = who?.id
  let text = String(line?.text ?? '').replace(/\s+/g, ' ').trim()
  if (!who || !text) return
  if (text.length > MAX) text = text.slice(0, MAX - 1) + '…'
  const old = live.get(id); if (old && ctx.getObject(old)) ctx.destroy(old)
  const b = ctx.spawn({
    parent: id, feetPosition: { x: 0, y: HEIGHT, z: 0 }, lifetime: LIFE, tags: ['overhead-chat'],
    ui: `<div facing="player" width="7m" style="text-align:center;font-family:'RuneScape',Verdana,sans-serif;font-weight:700;font-size:230px;line-height:1.1;color:#ffff00;text-shadow:16px 16px 0 #000">${esc(text)}</div>`,
  })
  live.set(id, b)
}

// The chat box's own log is the proven feed (place.state.chatLog, written by onSay): every new Public/Trade row floats over its speaker.
let seen = null
export function watchOverhead(ctx) {
  const log = ctx.place.state.chatLog
  if (!Array.isArray(log) || !log.length) return
  const top = log[log.length - 1].at ?? 0
  if (seen === null) { seen = top; return } // a fresh sim never replays old lines
  if (top <= seen) return
  for (const r of log) {
    if ((r.at ?? 0) <= seen || !(r.k === 'pub' || r.k === 'trade' || r.k === 'savi')) continue
    const who = ctx.place.players.find((p) => p.displayName === r.n)
    if (who) overhead(ctx, { scope: 'say', by: { id: who.id }, text: r.t })
  }
  seen = top
}
