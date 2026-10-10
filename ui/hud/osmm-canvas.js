// The OSRS minimap frame (creator 2026-10-06: the plain stone ring, resizable mode, 1:1), page side. One 211 x 171 <canvas> drawn over the live map circle from ONE sheet
// (/cdn mm-sheet.png, cut by ~/spawn/art/osrs-ui/minimap/build_*.py from the creator's clean 1x shots): the frame with the map hole open, drain overlays for the four orbs,
// the compass dial, the run-OFF orb and the grey special orb. Numbers are the OSRS small font (the chat box's glyph sheet); colour = green to red by fraction.
// model: { hp, hpMax, pray, prayMax, run (0..100), runOn, spec (0..100), yaw (degrees) }. Pure draw; clicks are plain buttons in osrs.js.
const SHEET = '/cdn/value.ee5e5c0ba4614979f8c2098258f4277dac63befb6de4975f2cfbe1f91b239d0e.png?data';
const SMALL = '/cdn/value.0154288864590d803ab996383223b14578f8dd247896b17d0e2253a7c398e053.png?data';
export const MM = { W: 211, H: 171, hole: { cx: 128.05, cy: 84.24, r: 76 }, compass: { cx: 51.5, cy: 21.5 } };
// orb top-left in the frame, its drain overlay in the sheet, text centre x / glyph-box y; rows 4..30 of an orb hold the fillable background
const ORBS = { hp: { x: 23, y: 46, ov: [0, 171], tx: 15, ty: 62 }, pray: { x: 23, y: 80, ov: [34, 171], tx: 15, ty: 96 }, run: { x: 33, y: 112, ov: [68, 171], tx: 27, ty: 128 }, spec: { x: 55, y: 137, ov: [102, 171], tx: 49, ty: 153 } };
const RUN_OFF = { src: [179, 171], ov: [0, 205] }, SPEC_GREY = { src: [179, 205], ov: [34, 205] };
const TOP = 4, ROWS = 27;
let sheet = null, small = null, loading = null, model = null, gen = 0, wired = false;
const tint = {};
function load() {
  if (loading) return loading;
  const get = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  loading = Promise.all([get(SHEET), get(SMALL)]).then(([a, b]) => { sheet = a; small = b; if (!a || !b) loading = null; });
  return loading;
}
function glyphs(color) {
  if (tint[color]) return tint[color];
  const c = document.createElement('canvas'); c.width = 1330; c.height = 22; const g = c.getContext('2d');
  g.drawImage(small, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, 1330, 22); return (tint[color] = c);
}
// the orb numbers: centred on the plate, 7 px per digit, black shadow one down-right (measured: the 99 / 100 plates of the shots)
function digits(cx, s, centre, y, color) {
  const x0 = Math.floor(centre - (s.length * 7) / 2);
  for (const [dx, col] of [[1, '#000000'], [0, color]]) {
    const t = glyphs(col); let pen = x0 + dx;
    for (const ch of s) { cx.drawImage(t, (ch.charCodeAt(0) - 32) * 14, 0, 14, 22, pen, y + dx, 14, 22); pen += 7; }
  }
}
// OSRS number colour: green at full through yellow (half) to red at empty
export function mmColor(f) { f = Math.max(0, Math.min(1, f)); const r = Math.min(255, Math.round(510 * (1 - f))), g = Math.min(255, Math.round(510 * f)); return '#' + [r, g, 0].map((v) => v.toString(16).padStart(2, '0')).join(''); }
export const mmFill = (v, max) => Math.max(0, Math.min(1, max > 0 ? v / max : 0));
function cv() { return document.getElementById('osmmc'); }
function orb(cx, o, frac, over) {
  if (over) cx.drawImage(sheet, over.src[0], over.src[1], 34, 34, o.x, o.y, 34, 34); // a state that replaces the frame's orb (run off, grey special)
  const rows = Math.round((1 - Math.max(0, Math.min(1, frac))) * ROWS); // rows of the orb background that are empty, from the top
  if (rows > 0) { const [ox, oy] = over ? over.ov : o.ov, h = TOP + rows; cx.drawImage(sheet, ox, oy, 34, h, o.x, o.y, 34, h); }
}
function render() {
  const c = cv(); if (!c || !model || !sheet || !small) return;
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; c._d = gen;
  const m = model; cx.clearRect(0, 0, MM.W, MM.H);
  cx.drawImage(sheet, 0, 0, MM.W, MM.H, 0, 0, MM.W, MM.H);
  const fh = mmFill(m.hp, m.hpMax), fp = mmFill(m.pray, m.prayMax), fr = Math.max(0, Math.min(1, m.run / 100)), fs = Math.max(0, Math.min(1, m.spec / 100));
  orb(cx, ORBS.hp, fh); orb(cx, ORBS.pray, fp); orb(cx, ORBS.run, fr, m.runOn ? null : RUN_OFF); orb(cx, ORBS.spec, fs, SPEC_GREY);
  digits(cx, String(Math.max(0, Math.round(m.hp))), ORBS.hp.tx, ORBS.hp.ty, mmColor(fh));
  digits(cx, String(Math.max(0, Math.round(m.pray))), ORBS.pray.tx, ORBS.pray.ty, mmColor(fp));
  digits(cx, String(Math.round(m.run)), ORBS.run.tx, ORBS.run.ty, mmColor(fr));
  digits(cx, String(Math.round(m.spec)), ORBS.spec.tx, ORBS.spec.ty, mmColor(fs));
  // the compass: the dial turns with the camera inside the fixed bezel
  cx.save(); cx.beginPath(); cx.arc(MM.compass.cx, MM.compass.cy, 16, 0, Math.PI * 2); cx.clip();
  cx.translate(MM.compass.cx, MM.compass.cy); cx.rotate(-(m.yaw || 0) * Math.PI / 180); cx.drawImage(sheet, 136, 171, 43, 43, -21.5, -21.5, 43, 43); cx.restore();
}
export function osMmFeed(m) {
  model = m; gen++;
  if (!wired) { wired = true; setInterval(() => { const c = cv(); if (c && c._d !== gen) render(); }, 250); } // the HUD patches in a fresh canvas on every repaint
  load().then(() => requestAnimationFrame(render));
}

// ======== the live map (creator 2026-10-09, minimap lane): a player-centred, camera-rotated view of the painted map with icons.
// osrs.js samples the world ≤ 4 Hz and hands this file a plain view; this file draws it into <canvas id="osmmv"> (both skins), answers
// the wheel and the +/- buttons ([data-mmz]), shows a hover name (#osmm-tip) and turns a click into a world point. Pure page side:
// every listener is delegated on the document once, so the HUD's repaints (a fresh canvas each time) need nothing re-wired.
// view: { f:{x,z}, yaw (camera, deg), face (body yaw deg | null), rows:[[x,z,kind,name]], M (WOW.map), main (bool), r (px radius), kit, pid, zi, walk }
export const MMZ = [0.5, 1, 2, 4]; // px per painted-map px: 245 m, 120 m, 60 m, 30 m across the radius at the classic size
const KIND = { // the icon set: one look per kind, both skins share it (kit only warms the colours)
  pl: { c: '#ffffff', k: '#f2e6cf', n: 'Player' }, npc: { c: '#ffff00', k: '#e8c46a', n: 'NPC' }, foe: { c: '#ff3a2a', k: '#ff6a4a', n: 'Enemy' },
  shop: { c: '#ffd34a', k: '#e8c46a', n: 'Shop' }, quest: { c: '#3aa0ff', k: '#7fc4ff', n: 'Quest' }, bank: { c: '#ffd34a', k: '#e8c46a', n: 'Bank' },
  zone: { c: '#ffffff', k: '#f2e6cf', n: 'Place' }, flag: { c: '#ff2020', k: '#ff4a3a', n: 'Destination' },
};
let mv = null, mvGen = 0, mvImg = null, mvSrc = '', mvWired = false, mvHits = [], mvRaf = 0, mvFlag = null;
const zKey = (pid) => 'osmmZ:' + (pid || 'me');
export function mmZoomIndex(pid, server) { // the server row (settings.mmZoom) wins; else this machine's memory; else 1 (the old scale)
  if (Number.isInteger(server) && server >= 0 && server < MMZ.length) return server;
  try { const v = +localStorage.getItem(zKey(pid)); if (Number.isInteger(v) && v >= 0 && v < MMZ.length) return v; } catch (e) {}
  return 1;
}
let zLocal = null; // a press shows at once, before the server row comes back
function send(name, payload, opt) { try { const f = globalThis.sendAction ?? (typeof sendAction === 'function' ? sendAction : null); if (f) f(name, payload ?? {}, opt); } catch (e) {} }
function zoomBy(d) {
  if (!mv) return; const cur = zLocal ?? mv.zi, n = Math.max(0, Math.min(MMZ.length - 1, cur + d)); if (n === cur) return;
  zLocal = n; try { localStorage.setItem(zKey(mv.pid), String(n)); } catch (e) {}
  send('setSetting', { id: 'mmZoom', v: n }); // scripts/minimap-player.js keeps it on player.state.settings.mmZoom
  mvGen++; kick();
}
function tipEl() {
  let t = document.getElementById('osmm-tip'); if (t) return t;
  t = document.createElement('div'); t.id = 'osmm-tip'; t.style.cssText = 'position:fixed;z-index:99;pointer-events:none;display:none;white-space:nowrap;padding:2px 6px'; document.body.appendChild(t); return t;
}
function tipShow(on, x, y, text) {
  const t = tipEl(); if (!on) { t.style.display = 'none'; return; }
  t.style.cssText = 'position:fixed;z-index:99;pointer-events:none;white-space:nowrap;' + (mv?.kit
    ? "padding:3px 8px;font:13px Georgia,serif;color:#e8c46a;background:#15181b;border:1px solid #b8893c;box-shadow:0 0 0 1px #000,0 3px 6px rgba(0,0,0,.6);text-shadow:1px 1px 0 #000"
    : "padding:1px 4px;font:bold 12px 'Trebuchet MS',Verdana,sans-serif;color:#ffff00;background:#5a5245;border:1px solid #000;text-shadow:1px 1px 0 #000");
  t.textContent = text; t.style.left = (x + 12) + 'px'; t.style.top = (y + 14) + 'px'; t.style.display = 'block';
}
// screen px (from the map centre) <-> world metres; the map turns so the camera's forward is up
function geo() { const k = MMZ[zLocal ?? mv.zi] ?? 1, s = k / mv.M.mpp, th = (mv.yaw || 0) * Math.PI / 180; return { k, s, cos: Math.cos(th), sin: Math.sin(th) }; }
function toScreen(g, x, z) { const dx = (x - mv.f.x) * g.s, dz = (z - mv.f.z) * g.s; return [dx * g.cos - dz * g.sin, dx * g.sin + dz * g.cos]; }
function toWorld(g, sx, sy) { const x = sx * g.cos + sy * g.sin, y = -sx * g.sin + sy * g.cos; return { x: mv.f.x + x / g.s, z: mv.f.z + y / g.s }; }
function local(e, c) { const b = c.getBoundingClientRect(), r = mv.r; return [(e.clientX - b.left) / b.width * 2 * r - r, (e.clientY - b.top) / b.height * 2 * r - r]; }
function icon(cx, kind, x, y, kit) {
  const K = KIND[kind] ?? KIND.npc, col = kit ? K.k : K.c; cx.lineWidth = 1.5; cx.strokeStyle = '#000';
  if (kind === 'pl' || kind === 'npc' || kind === 'foe') { cx.fillStyle = col; cx.beginPath(); cx.arc(x, y, kind === 'pl' ? 3 : 2.6, 0, 6.283); cx.fill(); cx.stroke(); return; }
  if (kind === 'zone') { cx.fillStyle = kit ? 'rgba(232,196,106,.9)' : 'rgba(255,255,255,.85)'; cx.beginPath(); cx.moveTo(x, y - 4); cx.lineTo(x + 4, y); cx.lineTo(x, y + 4); cx.lineTo(x - 4, y); cx.closePath(); cx.fill(); cx.stroke(); return; }
  if (kind === 'flag') { cx.fillStyle = col; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, y - 11); cx.lineTo(x + 7, y - 8); cx.lineTo(x, y - 5); cx.stroke(); cx.fill(); cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x, y - 11); cx.strokeStyle = '#2a1a0a'; cx.lineWidth = 1.5; cx.stroke(); return; }
  // shop / bank / quest: a round badge with a glyph (OSRS map-icon reading: gold coin, gold $, blue !)
  cx.fillStyle = kind === 'quest' ? (kit ? '#1d4f86' : '#1550a8') : (kit ? '#5a3f12' : '#6a4a10'); cx.beginPath(); cx.arc(x, y, 5.2, 0, 6.283); cx.fill();
  cx.strokeStyle = kit ? '#e8c46a' : '#000'; cx.lineWidth = 1.2; cx.stroke();
  cx.fillStyle = col; cx.font = 'bold 8px Verdana,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(kind === 'quest' ? '!' : kind === 'bank' ? '$' : '¤', x, y + 0.5);
}
function drawMap() {
  mvRaf = 0; const c = document.getElementById('osmmv'); if (!c || !mv) return;
  const r = mv.r, P = 2, W = r * 2 * P; if (c.width !== W) { c.width = W; c.height = W; }
  const cx = c.getContext('2d'); c._d = mvGen; cx.setTransform(P, 0, 0, P, 0, 0); cx.clearRect(0, 0, r * 2, r * 2);
  cx.save(); cx.beginPath(); cx.arc(r, r, r, 0, 6.283); cx.clip();
  cx.fillStyle = mv.kit ? '#1d2a22' : '#2e4a2a'; cx.fillRect(0, 0, r * 2, r * 2);
  const g = geo(), M = mv.M;
  if (mv.main && mvImg && mvImg.complete && mvImg.naturalWidth) { // the painted map under the player, turned with the camera
    const px = M.ox + (mv.f.x - M.x0) / M.mpp, py = M.oy + (mv.f.z - M.z0) / M.mpp;
    cx.save(); cx.translate(r, r); cx.rotate((mv.yaw || 0) * Math.PI / 180); cx.scale(g.k, g.k); cx.imageSmoothingEnabled = g.k < 2;
    cx.drawImage(mvImg, 0, 0, mvImg.naturalWidth, mvImg.naturalHeight, -px, -py, M.w, M.h); cx.restore();
  }
  mvHits = []; const lim = (r - 4) ** 2;
  const rows = mv.flag ? mv.rows.concat([[mv.flag.x, mv.flag.z, 'flag', 'Destination']]) : mv.rows;
  // draw order: places under, then townsfolk, foes, badges, players, the flag on top
  const ORD = { zone: 0, npc: 1, foe: 2, shop: 3, bank: 3, quest: 4, pl: 5, flag: 6 };
  const list = rows.map((q) => { const [sx, sy] = toScreen(g, q[0], q[1]); return [sx, sy, q[2], q[3]]; }).filter((q) => q[0] * q[0] + q[1] * q[1] < lim).sort((a, b) => (ORD[a[2]] ?? 1) - (ORD[b[2]] ?? 1));
  for (const [sx, sy, kind, name] of list) { icon(cx, kind, r + sx, r + sy, mv.kit); if (name) mvHits.push([sx, sy, name, kind]); }
  cx.restore();
  // the player arrow at the centre: up = the camera's forward; turned by the body's facing when the body reports one
  const a = mv.face == null ? 0 : ((mv.yaw || 0) - mv.face) * Math.PI / 180;
  cx.save(); cx.translate(r, r); cx.rotate(a); cx.beginPath(); cx.moveTo(0, -6); cx.lineTo(4, 5); cx.lineTo(0, 3); cx.lineTo(-4, 5); cx.closePath();
  cx.fillStyle = mv.kit ? '#f2e6cf' : '#ffffff'; cx.fill(); cx.lineWidth = 1.2; cx.strokeStyle = '#000'; cx.stroke(); cx.restore();
}
function kick() { if (!mvRaf) mvRaf = requestAnimationFrame(drawMap); }
function wire() {
  mvWired = true;
  setInterval(() => { const c = document.getElementById('osmmv'); if (c && c._d !== mvGen) kick(); }, 250); // a repaint brought a blank canvas: draw it
  document.addEventListener('wheel', (e) => { const c = e.target?.closest?.('#osmmv'); if (!c || !mv) return; e.preventDefault(); e.stopPropagation(); zoomBy(e.deltaY < 0 ? 1 : -1); }, { passive: false, capture: true });
  document.addEventListener('click', (e) => {
    const z = e.target?.closest?.('[data-mmz]'); if (z) { e.preventDefault(); e.stopPropagation(); zoomBy(+z.dataset.mmz || 0); return; }
    const c = e.target?.closest?.('#osmmv'); if (!c || !mv) return; e.preventDefault(); e.stopPropagation();
    const [sx, sy] = local(e, c); if (sx * sx + sy * sy > mv.r * mv.r) return;
    const p = toWorld(geo(), sx, sy);
    if (mv.walk) { mvFlag = { x: p.x, z: p.z, at: Date.now() }; send('setSetting', { id: 'mmWalk', v: { x: +p.x.toFixed(1), z: +p.z.toFixed(1) } }); mvGen++; kick(); }
    else send('huginnMap', {}); // a place with no painted map: the click opens the M map
  }, { capture: true });
  document.addEventListener('mousemove', (e) => {
    const c = e.target?.closest?.('#osmmv'); if (!c || !mv) { if (document.getElementById('osmm-tip')?.style.display === 'block') tipShow(false); return; }
    const [sx, sy] = local(e, c); let best = null, bd = 49;
    for (const h of mvHits) { const d = (h[0] - sx) ** 2 + (h[1] - sy) ** 2; if (d < bd) { bd = d; best = h; } }
    tipShow(!!best, e.clientX, e.clientY, best ? best[2] : '');
  }, { capture: true });
}
export function osMmView(v) {
  if (zLocal != null && v.zi === zLocal) zLocal = null; // the server row caught up
  if (mvFlag && (Date.now() - mvFlag.at > 60000 || Math.hypot(mvFlag.x - v.f.x, mvFlag.z - v.f.z) < 1.5)) mvFlag = null; // reached or stale
  v.flag = v.walkTo ?? mvFlag;
  mv = v; mvGen++;
  if (v.M?.img && v.M.img !== mvSrc) { mvSrc = v.M.img; mvImg = new Image(); mvImg.onload = () => { mvGen++; kick(); }; mvImg.src = v.M.img; }
  if (!mvWired) wire();
  kick();
}
