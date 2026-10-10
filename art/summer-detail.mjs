// Sunreach Vale detail pass (2026-10-10): plaza edge, road-bend dressing, tree groves, Dust Hollow mob camp,
// farmstead paddock + yard, creek crossing and pond shore. Writes art/summer-detail.json (ids svd-*); placed by run_script.
import fs from 'fs';
const M = (h) => `/cdn/value.${h}.glb`;
const K = {
  brazierKit: null,
  rock: ['8a0ec2f551c63c864f3daa92721cc5471ccdc29e121639c0c73da6d05ed1624b', 0.0503, 'mesh'],
  fence: ['6418c2b5f982ae8649db9512f50f2d8159ab9fa00a10683d4621c47b090ccb23', 0.57, 'box'],
  weaponrack: ['bd2685d27abb83cb726dbeeee0c4dfc92a5089b962e413588d46b437710ff921', 0.62, 'box'],
  dbush1: ['6e74ad3a99565347813a25849a3eaeeb4c576e2d9d6f0660a6856d800bd99dcc', 0.3117, null],
  dbush2: ['010556476c8ad1b3e2c5755f8dca5d97766488b911d5319cf6d5773d10aea125', 0.2051, null],
  bush: ['1b3c7471e0743bc579e19ef593eff972e05d7835c8ee1062bc15288259815020', 0.3, null],
  berry: ['27daa4080bd2f6a98ffaf269554b3c2ec2e1964acde1f7f0afe2871827173cdc', 0.3458, null],
  gnolltent: ['01d82fd2096eda3fee570767816d0893ed7673dfbb59f558f2946a7f38e41393', 1, 'mesh'],
  campfire: ['585bfbade7e48212f57b69c837deb9f24b41c88bdb24d189007805520eab254f', 1, 'box'],
  crate: ['efbf4869d4ee43025a7cd80cfbd4f89843f9a24c5a2999a2fb709b859cace575', 0.9772, 'box'],
  barrel: ['3830c24a07361ae1a8d99abd11a7f2f3b0314ca78886a00afc730c88cc4cc948', 1.3627, 'box'],
  sack: ['52cb64a830dab33e6fc76687a54eb5b423d7fc213df02c363b2355fc853b5e1e', 1.8657, null],
  cauldron: ['45988ec5668e79f7f9e7cb272afefee0c2ece806d3c489ab1b5554a387c33519', 0.75, 'box'],
  firewood: ['3bbc56aa3372caf1cae47fa7375f8af979fa1d9a503007e0a615210ddcc7e7b0', 2, 'box'],
  scarecrow: ['8a37c1bc7e90d4b9790a14bbba416bde54b8e9392c053051ef746c898a6dbe2e', 0.6, 'box'],
  haywagon: ['cd4083ad148c8e04325396f7128a6e2dc1826a8d973f5df7edd82a846d1e3e0a', 0.45, 'box'],
  haystack: ['8ba7d932ecaa413b2d934228db87a07281ef32995a8edcc8aca989dfcc23c4ca', 1.4657, 'box'],
  hay2: ['1cae19a993a52e5f060cd1389a36d8e560a70577b3a1c46330e46919b26df3ae', 1.3556, 'box'],
  lakebridge: ['22aabd77c04339c8c29c88afc656b75b72df0860792fb57a1a2c3725bea82481', 0.25, 'mesh'],
  lantern: ['778464f2b10f7c33302fc4f18742baf8201059dc89297c62e5b7cb0cb29d3252', 0.4514, 'box'],
  signpost: ['61b939e9a16a230f4d20df2ccd6d075aa3b59b0942f6a07faf69cbf200220bba', 0.6, 'box'],
};
let seed = 1010; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const R = (a, b) => a + rnd() * (b - a);
const out = []; let n = 0;
const PROPS = 'scripts/gen/sv-props.js';
const tagsFor = (area) => ['sunreach', 'sv-detail', `sv-${area}`];
function kit(k, area, x, z, yaw = R(0, 360), mul = 1, extra = {}) {
  const [h, s, col] = K[k];
  const row = { id: `svd-${k}-${n++}`, model: M(h), scale: +(s * mul).toFixed(4), castShadow: extra.shadow ?? true, receiveShadow: true,
    feetPosition: { x: +x.toFixed(2), z: +z.toFixed(2), y: { terrain: extra.dy ?? 0 } }, rotation: { yaw: Math.round(yaw) }, tags: tagsFor(area), visibleRange: { max: extra.range ?? 260 } };
  if (col && !extra.nophys) row.physics = { body: 'static', collider: col };
  if (extra.children) row.children = extra.children;
  out.push(row); return row;
}
function drawn(kind, area, x, z, yaw = R(0, 360), params = {}, extra = {}) {
  const row = { id: `svd-${kind}-${n++}`, primitive: { kind: 'scripted', script: PROPS, params: { kind, ...params }, seed: extra.seed ?? Math.floor(R(0, 4)) },
    castShadow: extra.shadow ?? true, receiveShadow: true, feetPosition: extra.abs ? { x: +x.toFixed(2), y: extra.abs, z: +z.toFixed(2) } : { x: +x.toFixed(2), z: +z.toFixed(2), y: { terrain: extra.dy ?? 0 } },
    rotation: { yaw: Math.round(yaw) }, tags: tagsFor(area), visibleRange: { max: extra.range ?? 200 } };
  if (!['cobbles', 'weeds', 'reeds'].includes(kind)) row.physics = { body: 'static', collider: 'auto' };
  if (extra.children) row.children = extra.children;
  out.push(row); return row;
}
const FIRE = (w = 0.22, glow = 18) => `fx
pop coals n=8 on=disc(${(w * 0.9).toFixed(2)}) size=.06..0.13 tint=<2.6,1,.28>..<1.2,.35,.09> sz=$size*flick(.5,.12) col=$tint*flick(.8,.3) a=.9 r=sprite(soft-disc,add)
pop flame rate=flick(.45,.2)*55 on=disc(${w}) life=.45..0.85 v=up(1.5)+cone(22)*(.3..0.8) size=${(w * 0.9).toFixed(2)}..${(w * 1.7).toFixed(2)} acc=curl(.5)*1.2+buoy(2.2)+drag(1.5)
  sz=$size*(.5>.25:1>.7:.7>.14) col=hdr(4.6,3.4,1.4)>.3:hdr(3.2,1.4,.3)>.65:hdr(1.8,.5,.1)>hdr(.6,.12,.03) a=0>.12:1>.75:.85>0 rot=spin(.2) r=sprite(flame-wisp,add)
pop embers rate=4 on=disc(${w}) life=.7..1.4 v=up(2.2)+cone(30)*(.4..1.2) size=.02..0.045 acc=curl(.8)+grav()*.45+drag(.5) sz=$size*(1>.7:.8>.3) col=hdr(5,2.8,.8)>.6:hdr(2.4,.8,.15)>hdr(1,.22,.04) a=(0>.08:1>.65:.9>0)*flick(11,.35) r=sprite(ember,add,velocity,.02)
pop smoke on=@flame?.2 inh=p;v:$v*.4 life=1.6..2.8 size=.16..0.26 acc=buoy(.9)+curl(.35)*.5+drag(.8) sz=$size*(.7>3.2) col=<.3,.28,.26>><.15,.15,.16> a=0>.22:.28>.7:.18>0 rot=spin(.15) r=sprite(smoke-puff,alpha)
pop glow n=1 at=disc(${w}).c(.45) glo=fire()*(#flame/40)~ r=light(<1,.55,.24>,$glo*${glow},10)`;
const fireChild = (y, w, glow) => [{ id: 'flame', feetPosition: { x: 0, y, z: 0 }, fx: { script: FIRE(w, glow) } }];

// 1. PORTAL HUB PLAZA: dais r 9 at (0,-2); banners at (±8.5,-12)
for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283 + R(-0.15, 0.15), r = R(8.4, 10.6); if (Math.sin(a) < -0.92) continue; // keep the road mouth clean
  drawn('cobbles', 'gate', Math.cos(a) * r, -2 + Math.sin(a) * r, R(0, 360), { n: 5 + Math.floor(R(0, 5)), r: R(0.9, 1.8) }, { seed: i, shadow: false, dy: 0 }); }
for (let i = 0; i < 16; i++) { const a = R(0, 6.283), r = R(8.8, 12); if (Math.abs(Math.cos(a)) < 0.25 && Math.sin(a) < 0) continue;
  drawn('weeds', 'gate', Math.cos(a) * r, -2 + Math.sin(a) * r, R(0, 360), { n: 3 + Math.floor(R(0, 4)), r: R(0.4, 0.9) }, { seed: i % 4, shadow: false }); }
for (const sx of [-1, 1]) {
  drawn('brazier', 'gate', sx * 11, -11.5, 0, {}, { seed: 0, children: fireChild(1.2, 0.2, 14) });
  kit('weaponrack', 'gate', sx * 6.4, -13.2, sx > 0 ? 270 : 90);
  kit('crate', 'gate', sx * 11.8, -13.6, R(0, 90), 0.8);
}

// 2. ROAD DRESSING: bends of road-main
const ROAD = [[0, -12], [0, -40], [8, -80], [6, -140], [0, -200], [-2, -250], [-16, -262], [14, -276], [-10, -290], [0, -300]];
const bends = [1, 2, 3, 4, 5, 6, 7];
const milestones = new Set([2, 4, 6]);
for (const i of bends) {
  const [px, pz] = ROAD[i - 1], [cx, cz] = ROAD[i], [nx, nz] = ROAD[i + 1];
  const d1 = [cx - px, cz - pz], d2 = [nx - cx, nz - cz]; const l1 = Math.hypot(...d1), l2 = Math.hypot(...d2);
  const u1 = [d1[0] / l1, d1[1] / l1], u2 = [d2[0] / l2, d2[1] / l2];
  const turn = u1[0] * u2[1] - u1[1] * u2[0]; // sign: which side is the outside
  const bis = [u1[0] + u2[0], u1[1] + u2[1]]; const bl = Math.hypot(...bis) || 1; const t = [bis[0] / bl, bis[1] / bl];
  let nrm = [-t[1], t[0]]; if (turn > 0) nrm = [t[1], -t[0]]; // outward normal of the bend
  // a run of four fence pieces along the outside of the curve, 5 m off the centreline
  for (let k = -2; k < 2; k++) { const off = (k + 0.5) * 2.35; const x = cx + nrm[0] * 5 + t[0] * off, z = cz + nrm[1] * 5 + t[1] * off;
    if (rnd() < 0.15) continue; // a gap where a post fell
    kit('fence', 'road', x, z, Math.atan2(t[0], t[1]) * 180 / Math.PI + R(-4, 4)); }
  // low boulders inside and outside
  for (let k = 0; k < 3; k++) { const sd = k === 0 ? -1 : 1; const x = cx + nrm[0] * sd * R(4.6, 6.5) + t[0] * R(-6, 6), z = cz + nrm[1] * sd * R(4.6, 6.5) + t[1] * R(-6, 6);
    kit('rock', 'road', x, z, R(0, 360), R(0.7, 1.4), { dy: -0.15 }); }
  drawn('weeds', 'road', cx + nrm[0] * 4.4, cz + nrm[1] * 4.4, R(0, 360), { n: 4, r: 0.8 }, { seed: i % 4, shadow: false });
  if (milestones.has(i)) drawn('milestone', 'road', cx - nrm[0] * 4.2, cz - nrm[1] * 4.2, Math.atan2(-nrm[0], -nrm[1]) * 180 / Math.PI + 180, {}, { seed: 0 });
}

// 2b. GROVES: every lonely tree gets kin, underbrush and a stone at its foot
const base = JSON.parse(fs.readFileSync('art/summer-zone.json', 'utf8'));
const trees = base.filter(r => /^sv-(tree0\d|oak|palm\d)-/.test(r.id));
const pts = trees.map(r => [r.feetPosition.x, r.feetPosition.z]);
const ROOMS = [[0, -2, 26], [-90, -110, 44], [60, -60, 30], [130, -170, 24], [110, -262, 30], [0, -300, 24], [-70, -230, 34]];
const seg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const roadD = (x, z) => Math.min(...ROAD.slice(1).map((b, i) => seg(x, z, ROAD[i], b)));
const okSpot = (x, z) => roadD(x, z) > 8 && ROOMS.every(([a, b, r]) => Math.hypot(x - a, z - b) > r) && Math.abs(x) < 210 && z < 20 && z > -330;
let groves = 0;
trees.forEach((r, i) => {
  const [x, z] = pts[i]; const kin = pts.filter(([a, b]) => Math.hypot(a - x, b - z) < 12).length - 1;
  const kind = r.id.split('-')[1];
  if (kin < 2) { // grow 1–2 of the same kind beside it
    for (let k = 0; k < 2 - kin; k++) { const a = R(0, 6.283), d = R(4.5, 7.5), tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
      if (!okSpot(tx, tz)) continue; const row = { ...r, id: `svd-${kind}-${n++}`, feetPosition: { x: +tx.toFixed(2), z: +tz.toFixed(2), y: { terrain: 0 } }, rotation: { yaw: Math.round(R(0, 360)) }, scale: +(r.scale * R(0.7, 0.95)).toFixed(4), tags: tagsFor('grove') };
      out.push(row); pts.push([tx, tz]); }
    groves++;
  }
  // underbrush ring and a stone base for every tree
  const nb = kin < 2 ? 2 : (rnd() < 0.4 ? 1 : 0);
  for (let k = 0; k < nb; k++) { const a = R(0, 6.283), d = R(1.6, 3.2); const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d; if (roadD(bx, bz) < 5) continue;
    kit(['dbush1', 'dbush2', 'bush', 'berry'][Math.floor(R(0, 4))], 'grove', bx, bz, R(0, 360), R(0.8, 1.2), { shadow: false, range: 180 }); }
  if (kin < 2 || rnd() < 0.4) { const a = R(0, 6.283), d = R(1.2, 2.2); kit('rock', 'grove', x + Math.cos(a) * d, z + Math.sin(a) * d, R(0, 360), R(0.6, 1.1), { dy: -0.2, range: 180 }); }
});

// 3. DUST HOLLOW CAMP: basin floor around (110,-262)
const C = [108, -264];
kit('campfire', 'hollow', C[0], C[1], 0, 1, { children: fireChild(0.25, 0.32, 26) });
drawn('spit', 'hollow', C[0], C[1], 30, {}, { seed: 0 });
kit('gnolltent', 'hollow', C[0] - 8, C[1] - 4, 70);
kit('gnolltent', 'hollow', C[0] + 7, C[1] - 6, 300);
kit('cauldron', 'hollow', C[0] + 3, C[1] + 2.5, R(0, 360));
kit('firewood', 'hollow', C[0] - 3, C[1] + 2.5, 20);
for (const [dx, dz, k] of [[-5, 4, 'crate'], [-4.2, 5.1, 'crate'], [-4.6, 4.5, 'barrel'], [6, 3, 'crate'], [6.8, 2.2, 'sack'], [7.4, 3.6, 'sack'], [11, -1, 'crate'], [11.6, -0.2, 'barrel'], [-11, 0, 'crate'], [-10.2, 1, 'sack'], [2, -9, 'crate'], [3, -9.6, 'barrel']])
  kit(k, 'hollow', C[0] + dx, C[1] + dz, R(0, 360), R(0.8, 1.05));
for (let i = 0; i < 6; i++) { const a = R(0, 6.283), r = R(3, 12); drawn('weeds', 'hollow', C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, R(0, 360), { n: 3, r: 0.6 }, { seed: i % 4, shadow: false }); }

// 4. FARMSTEAD: a closed paddock x -128..-100, z -60..-80; the gate on the south side faces the farmhouse
const fenceRun = (x0, z0, x1, z1, count) => { const L = Math.hypot(x1 - x0, z1 - z0), sc = (L / count) / 2.45; const yaw = Math.atan2(x1 - x0, z1 - z0) * 180 / Math.PI;
  for (let k = 0; k < count; k++) { const f = (k + 0.5) / count; kit('fence', 'farm', x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, yaw, Math.max(1, sc * 1.04)); } };
fenceRun(-128, -60, -100, -60, 12);
fenceRun(-128, -60, -128, -80, 9);
fenceRun(-100, -60, -100, -80, 9);
fenceRun(-128, -80, -105.4, -80, 10);
fenceRun(-102.6, -80, -100, -80, 1);
drawn('farmgate', 'farm', -104, -80, 0, {}, { seed: 0 });
// a scarecrow in the pumpkin patch, hay against the barn's east wall, the hay wagon by the barn door
kit('scarecrow', 'farm', -68.8, -122.4, 200);
for (const [dz, y, k] of [[-113.5, 0, 'haystack'], [-111.3, 0, 'hay2'], [-115.6, 0, 'hay2'], [-112.4, 1.05, 'hay2']]) kit(k, 'farm', -110.3, dz, R(-10, 10) + 90, 1, { dy: y });
kit('haywagon', 'farm', -106, -106, 15);
kit('barrel', 'farm', -110.6, -101.4, R(0, 360));

// 5. CREEK CROSSING + POND SHORE
const CREEK = [[64, -146], [40, -158], [25, -165], [12, -170], [4, -172], [-6, -178], [-20, -190], [-35, -204], [-46, -213], [-54, -221]];
drawn('bridge', 'road', 4, -172, 0, { len: 15, w: 4, rise: 0.9 }, { abs: 2.95, seed: 2, range: 400 });
const creekD = (x, z) => Math.min(...CREEK.slice(1).map((b, i) => seg(x, z, CREEK[i], b)));
for (let i = 0; i < CREEK.length - 1; i++) { const [ax, az] = CREEK[i], [bx, bz] = CREEK[i + 1]; const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
  for (let s = 2; s < L; s += 5.5) for (const sd of [-1, 1]) { const off = R(3.2, 4.4) * sd; const x = ax + ux * s - uz * off, z = az + uz * s + ux * off;
    if (roadD(x, z) < 6) continue;
    if (rnd() < 0.6) drawn('reeds', 'creek', x, z, R(0, 360), { n: 3 + Math.floor(R(0, 3)), r: R(0.5, 1) }, { seed: Math.floor(R(0, 4)), shadow: false, range: 160 });
    else kit('rock', 'creek', x, z, R(0, 360), R(0.35, 0.7), { dy: -0.1, range: 160 }); } }
const P = [-70, -230];
for (let i = 0; i < 30; i++) { const a = (i / 30) * 6.283 + R(-0.08, 0.08), r = R(28, 31.5), x = P[0] + Math.cos(a) * r, z = P[1] + Math.sin(a) * r;
  if (Math.hypot(x + 74, z + 202) < 5) continue; // the pier's foot
  if (rnd() < 0.68) drawn('reeds', 'pond', x, z, R(0, 360), { n: 3 + Math.floor(R(0, 4)), r: R(0.6, 1.2) }, { seed: i % 4, shadow: false, range: 160 });
  else kit('rock', 'pond', x, z, R(0, 360), R(0.4, 0.8), { dy: -0.15, range: 160 }); }
// the fishing pier on the near (gate-side) shore, its lamp at the end
drawn('pier', 'pond', -74, -200, 0, { len: 10, w: 2.2, deck: 0.15, depth: 2.6 }, { abs: 1.35, seed: 1, range: 260 });
kit('lantern', 'pond', -74.85, -209.4, 0, 1, { dy: 0, nophys: true });
kit('barrel', 'pond', -73.3, -201.4, 30, 0.8);

const lantern = out.find(r => r.id.startsWith('svd-lantern')); lantern.feetPosition = { x: -74.85, y: 1.5, z: -209.4 };
lantern.children = [{ id: 'glow', feetPosition: { x: 0, y: 2.2, z: 0 }, light: { kind: 'point', color: 'oklch(0.85 0.12 70)', intensity: 2.5, distance: 9 } }];
fs.writeFileSync('art/summer-detail.json', JSON.stringify(out));
console.log(out.length, 'rows; lonely trees grown into groves:', groves);

// ---- pass 2 (2026-10-10): rune arch, road lanterns, Dust Hollow barricades → art/summer-detail-2.json
const first = out.length;
drawn('runearch', 'gate', 0, 3, 0, { ow: 3.7, oh: 4.2, d: 1.0 }, { abs: 6.0, seed: 3, range: 400 });
for (const i of bends) {
  const [px, pz] = ROAD[i - 1], [cx, cz] = ROAD[i], [nx, nz] = ROAD[i + 1];
  const u1 = [(cx - px), (cz - pz)], u2 = [(nx - cx), (nz - cz)]; const l1 = Math.hypot(...u1), l2 = Math.hypot(...u2);
  const t0 = [u1[0] / l1 + u2[0] / l2, u1[1] / l1 + u2[1] / l2]; const tl = Math.hypot(...t0); const t = [t0[0] / tl, t0[1] / tl];
  const turn = u1[0] * u2[1] - u1[1] * u2[0]; let nrm = [-t[1], t[0]]; if (turn > 0) nrm = [t[1], -t[0]];
  const x = cx - nrm[0] * 4.3 + t[0] * 3.5, z = cz - nrm[1] * 4.3 + t[1] * 3.5;
  const row = kit('lantern', 'road', x, z, Math.atan2(nrm[0], nrm[1]) * 180 / Math.PI, 1, { nophys: false, range: 300 });
  row.children = [{ id: 'glow', feetPosition: { x: 0, y: 2.2, z: 0 }, light: { kind: 'point', color: 'oklch(0.85 0.12 70)', intensity: 2, distance: 8 } }];
}
// a ring of barricades around the camp, gaps toward the road (west) and the far side
for (let k = 0; k < 9; k++) { const a = (k / 9) * 6.283 + 0.2; if (Math.cos(a) < -0.75) continue;
  const r = 15 + R(-1, 1), x = C[0] + Math.cos(a) * r, z = C[1] + Math.sin(a) * r;
  drawn('barricade', 'hollow', x, z, -a * 180 / Math.PI + R(-6, 6), { len: R(2.8, 3.6) }, { seed: k % 4 }); }
fs.writeFileSync('art/summer-detail-2.json', JSON.stringify(out.slice(first)));
console.log('pass 2:', out.length - first);
