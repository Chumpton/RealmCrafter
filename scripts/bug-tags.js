// BUG TAGS (creator 2026-10-05): O → TAG, click anything to pin a note on it; O → JOURNAL lists every issue.
// player.state.bugs = [{ n, id, name, at, title, note, status: open|sent|fixed, t }] (the tagger's own save), bugSeq, bugTag (aim mode),
// bugDraft (a card being written), bugOpen (journal open: null | true | the n being edited), bugPage. Pins: "bugpin-<userId>-<n>", builders only.
import { raycast } from "builtin/physics";
const PER = 9, MAX = 200;
const here = (o) => o.worldFeetPosition ?? o.feetPosition;
const clip = (v, n) => String(v ?? "").slice(0, n);
function nameOf(ctx, id) {
  if (!id || /terrain|chunk/i.test(id)) return { id: null, name: "ground" };
  let o = id ? ctx.getObject(id) : null, best = null;
  for (let i = 0; o && i < 4; i++) { const nm = o.state?.name ?? o.displayName; if (nm) return { id: o.id, name: String(nm) }; best = o; o = o.parent?.id ? ctx.getObject(o.parent.id) : null; }
  return best ? { id: best.id, name: best.id } : { id: id ?? null, name: id && /chunk|terrain/i.test(id) ? "ground" : id ?? "ground" };
}
function pinId(me, n) { return `bugpin-${(me.userId ?? me.id).replace(/[^a-z0-9]/gi, "")}-${n}`; }
function pin(ctx, me, b) {
  const id = pinId(me, b.n), col = b.status === "fixed" ? "oklch(0.75 0.17 145)" : b.status === "sent" ? "oklch(0.8 0.15 80)" : "oklch(0.62 0.23 27)";
  if (ctx.getObject(id)) ctx.destroy(id);
  ctx.spawn({ id, visibleTo: "editors", audience: "all", physics: "none", castShadow: false, feetPosition: { x: b.at.x, y: b.at.y + 0.6, z: b.at.z },
    primitive: { kind: "cone", radius: 0.16, height: 0.42 }, rotation: { yaw: 0, pitch: 180, roll: 0 }, pivot: "center",
    material: { color: col, emissive: col, emissiveIntensity: 1.4 },
    ui: `<div face="front" facing="player" emissive width="0.5m" at="0.5 -0.9" style="font:bold 70px Georgia;color:#fff;text-align:center;text-shadow:0 0 12px #000">#${b.n}</div>`,
    tags: ["bugpin"] });
}
const say = (ctx, me, text) => ctx.emit("skillMsg", { text }, { to: me.id });
export function onInput(ctx, input) {
  const me = ctx.self; if (me.isLocal === false || !me.isEditor) return;
  const s = me.state, pr = input.pressed ?? {}, d = input.actionData ?? {};
  if (pr.bugTag) { s.bugTag = !s.bugTag; s.bugDraft = null; s.bugOpen = null; s.optionsOpen = false; if (s.bugTag) say(ctx, me, "Tag mode: click anything to tag it."); }
  if (pr.bugJournal) { s.bugOpen = s.bugOpen == null ? true : null; s.bugTag = false; s.bugDraft = null; s.optionsOpen = false; s.bugPage = s.bugPage | 0; }
  if (s.bugTag && pr.use) { // the aim: the pointer's ray (the crosshair under pointer lock)
    const a = input.axes ?? {}; if (typeof a.pointerDirX !== "number") return;
    let eye = { x: a.pointerOriginX, y: a.pointerOriginY ?? 0, z: a.pointerOriginZ ?? 0 }; const p = here(me);
    if (typeof a.pointerOriginX !== "number" || Math.hypot(eye.x - p.x, eye.z - p.z) > 18) eye = { x: p.x, y: p.y + 1.6, z: p.z };
    const r = raycast(ctx, eye, { x: a.pointerDirX, y: a.pointerDirY ?? 0, z: a.pointerDirZ ?? 0 }, { distance: 120, ignoreEntities: [me.id] });
    if (!r) return say(ctx, me, "Nothing there to tag.");
    const who = nameOf(ctx, r.id);
    s.bugDraft = { id: who.id, name: who.name, at: { x: +r.position.x.toFixed(2), y: +r.position.y.toFixed(2), z: +r.position.z.toFixed(2) } };
    s.bugTag = false;
    if (who.id && !/chunk|terrain/i.test(who.id)) ctx.emit("highlightSet", { target: who.id, color: "oklch(0.62 0.23 27)", style: "outline", duration: 2500 }, { audience: { player: me.id } });
  }
  if (pr.bugCancel) { s.bugDraft = null; }
  if (pr.bugSave && s.bugDraft) {
    const bugs = Array.isArray(s.bugs) ? s.bugs : [], n = (s.bugSeq | 0) + 1;
    const b = { n, id: s.bugDraft.id, name: s.bugDraft.name, at: s.bugDraft.at, title: clip(d.bugSave?.title, 80) || `Issue on ${s.bugDraft.name}`, note: clip(d.bugSave?.note, 2000), status: "open", t: ctx.now() };
    s.bugSeq = n; s.bugs = [b, ...bugs].slice(0, MAX); s.bugDraft = null; pin(ctx, me, b);
    ctx.emit("playSound", { clip: "/cdn/moodboard-lowpoly-cozy/sfx-ui-target-select-tick.mp3", volume: 0.5 }, { audience: { player: me.id } });
    say(ctx, me, `Issue #${n} saved. O → JOURNAL to see it.`);
  }
  if (s.bugOpen != null) {
    const list = Array.isArray(s.bugs) ? s.bugs : [], pages = Math.max(1, Math.ceil(list.length / PER));
    if (pr.bugPage) s.bugPage = Math.max(0, Math.min(pages - 1, (s.bugPage | 0) + (d.bugPage?.dir | 0)));
    if (s.bugOpen === true) for (let k = 1; k <= 9; k++) if (pr["pluck" + k]) { const b = list[(s.bugPage | 0) * PER + k - 1]; if (b) s.bugOpen = b.n; break; }
    if (pr.bugOpen) s.bugOpen = d.bugOpen?.n ?? true;
    const at = list.findIndex((b) => b.n === (d.bugEdit?.n ?? d.bugDelete?.n ?? d.bugSend?.n ?? d.bugStatus?.n));
    if (pr.bugEdit && at >= 0) { const b = { ...list[at], title: clip(d.bugEdit.title, 80) || list[at].title, note: clip(d.bugEdit.note, 2000) }; s.bugs = list.map((x, i) => (i === at ? b : x)); say(ctx, me, `Issue #${b.n} updated.`); }
    if (pr.bugDelete && at >= 0) { const b = list[at]; s.bugs = list.filter((_, i) => i !== at); if (ctx.getObject(pinId(me, b.n))) ctx.destroy(pinId(me, b.n)); s.bugOpen = true; say(ctx, me, `Issue #${b.n} deleted.`); }
    if (pr.bugStatus && at >= 0) { const b = { ...list[at], status: list[at].status === "fixed" ? "open" : "fixed" }; s.bugs = list.map((x, i) => (i === at ? b : x)); pin(ctx, me, b); }
    if (pr.bugSend && at >= 0) {
      const b0 = list[at], b = { ...b0, title: clip(d.bugSend.title, 80) || b0.title, note: d.bugSend.note != null ? clip(d.bugSend.note, 2000) : b0.note, status: "sent" };
      s.bugs = list.map((x, i) => (i === at ? b : x)); pin(ctx, me, b);
      ctx.notifyDm(`BUG #${b.n} from ${me.displayName ?? "the creator"} (tag journal): "${b.title}" on ${b.name} [${b.id ?? "ground"}] at (${b.at.x}, ${b.at.y}, ${b.at.z}). Note: ${b.note || "(none)"}. When fixed, set his player.state.bugs entry n=${b.n} status "fixed".`, { wake: true });
      say(ctx, me, `Issue #${b.n} sent to Savi.`);
    }
  }
}
