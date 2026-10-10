// Sunreach Vale (zone-summer) layout: rooms, roads, clusters. Writes art/summer-zone.json; placed by run_script.
import fs from 'fs';
const M = (h) => `/cdn/value.${h}.glb`;
const A = { // full model hashes and fitted scales: the summer mound's own palette + the Elwynn kit
  tree03: ['5f4befc8ba0a32a2b4f8c81cff255b72133a584a290cbefbd23f11182e7265e0', 0.0914, 'mesh'],
  tree04: ['94bee95fe0d389ec70532f8e7f2dadcf7207d7a86783dfb8e5da023909418d4b', 0.3162, 'mesh'],
  tree01: ['5b60f39835bde50b74298a010faa267c062ff6f1c08b5e694cab76b8905f7222', 0.0608, 'mesh'],
  tree02: ['147c354e9a5923ea9516aaf42ac11a49b37b2a44ababf79bda34b709a553a381', 0.0879, 'mesh'],
  tree05: ['24d0b56b591d5f0d9004685c92ef21761b2e8151b5a21232f71db801a2c91b7d', 0.0546, 'mesh'],
  tree06: ['70beaa9e33ddd920170f884ad41516c5b6893e1d04dd66ce8bd3645eb3b95164', 0.2279, 'mesh'],
  tree07: ['984a9938c0b112d9a6ca036f143fa21b3155b7af9881bb05173995e781bf5045', 0.6446, 'mesh'],
  oak: ['a1be1f6963ed40e1e7a1e01a95ff02329fb7faa15f4dcb461849c5f4dbaff066', 0.6071, 'box'],
  palm2: ['e13f831b4a3449af6bafdf58a4aa71c12b2f014421dab510485f45ab00e5b863', 0.4249, 'mesh'],
  palm3: ['7bc5424cf4b5ce3e2a3e2eed9c2cac98b22723b633cc2720fe113fd744e99704', 0.4323, 'mesh'],
  berry: ['27daa4080bd2f6a98ffaf269554b3c2ec2e1964acde1f7f0afe2871827173cdc', 0.3458, null],
  dbush1: ['6e74ad3a99565347813a25849a3eaeeb4c576e2d9d6f0660a6856d800bd99dcc', 0.3117, null],
  dbush2: ['010556476c8ad1b3e2c5755f8dca5d97766488b911d5319cf6d5773d10aea125', 0.2051, null],
  dbush4: ['1123837c502724ebf4a233bb27d19acacee8f493a302422ded7ccbb2ee582318', 0.4032, null],
  rock: ['8a0ec2f551c63c864f3daa92721cc5471ccdc29e121639c0c73da6d05ed1624b', 0.0503, 'mesh'],
  stump: ['2d46aa9e2c2020846c9da8912baab3767590793830e476e71e85930cd72884cb', 0.2517, 'box'],
  haystack: ['8ba7d932ecaa413b2d934228db87a07281ef32995a8edcc8aca989dfcc23c4ca', 1.4657, 'box'],
  hay2: ['1cae19a993a52e5f060cd1389a36d8e560a70577b3a1c46330e46919b26df3ae', 1.3556, 'box'],
  pumpkins: ['847ecea039b852fad95c7a985b195642d905a3f6d2722112d377333213bc12b9', 0.4576, 'box'],
  wheelbarrow: ['3853fc76d7ed019b6635fe14c91469ef50531fb3a55da49c1cb26eb93b9184e3', 0.6696, 'box'],
  sack: ['52cb64a830dab33e6fc76687a54eb5b423d7fc213df02c363b2355fc853b5e1e', 1.8657, null],
  barrel: ['3830c24a07361ae1a8d99abd11a7f2f3b0314ca78886a00afc730c88cc4cc948', 1.3627, 'box'],
  crate: ['efbf4869d4ee43025a7cd80cfbd4f89843f9a24c5a2999a2fb709b859cace575', 0.9772, 'box'],
  table: ['09a7c3e0194ce0d0639cc567e1e2e725d36abacf48d97a0dca39ca1e5d900639', 0.9757, 'box'],
  brazier: ['0a283a621cc04387fef1218db91a1e668fd568bdc0e5c14aa61a90cacd816e20', 0.3497, 'mesh'],
  lantern: ['778464f2b10f7c33302fc4f18742baf8201059dc89297c62e5b7cb0cb29d3252', 0.4514, 'box'],
  pavilion: ['fa572be0bf6bee22c10804b381929d4117be7f4b7a41efb9a64ec74d8f25b72a', 0.5796, 'mesh'],
  cow: ['2c97f185ee70ca83dc95889e6d6f3011578a4e5bcd7938dd72b99c1703e79571', 0.8421, 'box'],
  pig: ['d630a0c5012ff347280fdfcdbc58c2c622b6610779aafa5ac971999eb8d4d3d6', 1.4913, 'box'],
  chicken: ['ef3a8af228ebdc451782eb6f64a674e76db59841205c865dfa1c702758813880', 4.8204, 'box'],
  pdog: ['4dc0fadd6a495a19aad8a139a44fa8a8f73d8d5d1bccb5765ed6982b7b9de792', 5.0864, 'box'],
};
// Elwynn kit straight from its catalog
const src = fs.readFileSync('scripts/lib/data/prefabs-elwynn.js', 'utf8');
for (const m of src.matchAll(/id: 'elw-([a-z]+)'.*?elw\('([0-9a-f]{64})', ([0-9.]+), '([a-z]+)'/g)) if (!A[m[1]]) A[m[1]] = [m[2], +m[3], m[4] === 'none' ? null : m[4]];
let seed = 20261010; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const R = (a, b) => a + rnd() * (b - a);
const out = []; let n = 0;
function put(k, x, z, yaw = R(0, 360), mul = 1, extra = {}) {
  const [h, s, col] = A[k]; if (!h) throw new Error(k);
  const row = { id: `sv-${k}-${n++}`, model: M(h), scale: +(s * mul).toFixed(4), castShadow: true, receiveShadow: true, feetPosition: { x: +x.toFixed(2), z: +z.toFixed(2), y: { terrain: extra.dy ?? 0 } }, rotation: { yaw: Math.round(yaw) }, tags: ['sunreach', `sv-${extra.room ?? 'wild'}`], visibleRange: { max: extra.range ?? 600 } };
  if (col) row.physics = { body: 'static', collider: col };
  if (extra.state) row.state = extra.state; if (extra.tags) row.tags.push(...extra.tags);
  out.push(row); return row;
}
// keep-outs: roads and rooms (trees never sit on them)
const ROADS = [[[0,-12],[0,-40],[8,-80],[6,-140],[0,-200],[-2,-250],[-16,-262],[14,-276],[-10,-290],[0,-300]],[[7,-78],[-30,-90],[-62,-104],[-82,-110]],[[2,-48],[28,-56],[48,-60]],[[70,-70],[95,-108],[112,-140],[126,-162]],[[-88,-132],[-96,-165],[-82,-200]],[[-46,-228],[-20,-224],[-1,-214]],[[3,-232],[50,-248],[90,-258]]];
const ROOMS = [[0,-2,24],[-90,-110,44],[60,-60,30],[130,-170,24],[110,-262,30],[0,-300,24],[-70,-230,34]];
const seg = (x,z,a,b) => { const dx=b[0]-a[0], dz=b[1]-a[1], t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))); return Math.hypot(x-a[0]-dx*t, z-a[1]-dz*t); };
const roadD = (x,z) => Math.min(...ROADS.flatMap(p => p.slice(1).map((b,i) => seg(x,z,p[i],b))));
const free = (x,z,pad=0) => roadD(x,z) > 7 + pad && ROOMS.every(([cx,cz,r]) => Math.hypot(x-cx,z-cz) > r + pad);
const placed = [];
function cluster(cx, cz, rad, count, kinds, mulR = [0.85, 1.25], minGap = 7) {
  let tries = 0, got = 0;
  while (got < count && tries++ < count * 30) {
    const a = R(0, 6.283), r = Math.sqrt(rnd()) * rad, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (!free(x, z) || placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < minGap)) continue;
    placed.push([x, z]); put(kinds[Math.floor(rnd() * kinds.length)], x, z, R(0,360), R(...mulR), { range: 900 }); got++;
  }
}
// ---- 1. arrival terrace: lanterns, braziers, the first sightline (road south to the mesa)
put('lantern', -4.5, -9, 0, 1, { room: 'gate' }); put('lantern', 4.5, -9, 0, 1, { room: 'gate' });
put('brazier', -7, 2, 0, 1, { room: 'gate' }); put('brazier', 7, 2, 0, 1, { room: 'gate' });
put('banner', -3, -14, 180, 1, { room: 'gate' }); put('banner', 3, -14, 180, 1, { room: 'gate' });
put('bench', -9, -5, 90, 1, { room: 'gate' }); put('crate', 9, -6, 20, 1, { room: 'gate' }); put('barrel', 10, -4.5, 0, 1, { room: 'gate' });
// ---- 2. Harvest farm (west, green): farmhouse, barn, silo, wheat + giant pumpkins, animals, fences
const F = { room: 'farm' };
put('farmhouse', -98, -92, 160, 1, F); put('barn', -118, -108, 100, 1, F); put('silo', -122, -88, 0, 1, F);
put('wagon', -82, -98, 210, 1, F); put('wheelbarrow', -74, -116, 40, 1, F); put('trellis', -108, -152, 90, 1, F); put('trellis', -96, -152, 90, 1, F);
for (let i = 0; i < 6; i++) put(i % 2 ? 'haystack' : 'hay2', R(-124, -90), R(-148, -124), R(0,360), R(1.6, 2.4), F);
for (let i = 0; i < 9; i++) put('pumpkins', -76 + (i % 3) * 7 + R(-1,1), -134 + Math.floor(i / 3) * 8 + R(-1,1), R(0,360), R(1.8, 2.6), F); // oversized patch (creator ruling)
for (let i = 0; i < 6; i++) put('sack', -86 + R(-3,3), -100 + R(-3,3), R(0,360), 1, F);
// paddock fence (rails along a rectangle)
const fence = (x0, z0, x1, z1) => { const L = Math.hypot(x1-x0, z1-z0), k = Math.ceil(L / 3.2), yaw = Math.atan2(-(x1-x0), -(z1-z0)) * 180 / Math.PI + 90; for (let i = 0; i < k; i++) { const t = (i + .5) / k; put('fence', x0 + (x1-x0)*t, z0 + (z1-z0)*t, yaw, 1, F); } };
fence(-128, -60, -100, -60); fence(-128, -60, -128, -80); fence(-100, -60, -100, -80); fence(-128, -80, -112, -80);
for (let i = 0; i < 3; i++) put('cow', R(-124, -104), R(-76, -64), R(0,360), 1, { room: 'farm', tags: ['zs-creature', 'npc'], state: { name: 'Farm Dairy Cow', stance: 'friendly' } });
for (let i = 0; i < 2; i++) put('pig', R(-124, -104), R(-76, -64), R(0,360), 1, { room: 'farm', tags: ['zs-creature', 'npc'], state: { name: 'Farm Pig', stance: 'friendly' } });
for (let i = 0; i < 5; i++) put('chicken', R(-92, -80), R(-90, -80), R(0,360), 1, { room: 'farm', tags: ['zs-creature', 'npc'], state: { name: 'Chicken', stance: 'friendly' } });
put('lantern', -84, -88, 0, 1, F); put('lantern', -66, -104, 0, 1, F);
// ---- 3. Sunfair meadow (east of the road): the pavilion, stalls, tables, braziers
const S = { room: 'fair' };
put('pavilion', 66, -64, 230, 1, S);
put('stall', 46, -70, 60, 1, S); put('stall', 52, -46, 110, 1, S); put('stall', 74, -44, 170, 1, S);
put('table', 56, -58, 15, 1, S); put('table', 62, -52, 70, 1, S); put('innbench', 54, -60, 15, 1, S); put('innbench', 58, -56, 15, 1, S);
for (const [x, z] of [[44,-56],[50,-78],[80,-56],[84,-74]]) put('brazier', x, z, 0, 1, S);
for (let i = 0; i < 7; i++) put(i % 3 ? 'barrel' : 'crate', R(40, 82), R(-82, -40), R(0,360), 1, S);
put('banner', 47, -60, 70, 1.2, S); put('banner', 70, -38, 180, 1.2, S); put('innsign', 30, -54, 80, 1, S);
put('campfire', 68, -80, 0, 1, S); put('firewood', 72, -82, 30, 1, S);
// ---- 4. Ridge outpost (east shelf, 14 m up): tower, tents, training yard
const O = { room: 'outpost' };
put('guardtower', 138, -178, 230, 1, O);
put('tent', 120, -182, 60, 1, O); put('tent', 124, -158, 120, 1, O); put('tent', 142, -160, 180, 1, O);
put('campfire', 130, -168, 0, 1, O); put('firewood', 134, -165, 50, 1, O); put('weaponrack', 126, -174, 90, 1, O);
put('dummy', 112, -168, 250, 1, O); put('dummy', 114, -174, 250, 1, O); put('archery', 108, -160, 250, 1, O);
put('banner', 128, -160, 230, 1.3, O); put('brazier', 118, -166, 0, 1, O); put('brazier', 132, -150, 0, 1, O);
for (let i = 0; i < 4; i++) put(i % 2 ? 'crate' : 'barrel', R(140, 148), R(-172, -164), R(0,360), 1, O);
// ---- 5. Dust Hollow (south-east): a prairie arena of boulders, stumps and dog towns
const H = { room: 'hollow' };
for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + R(-.2,.2); put('rock', 110 + Math.cos(a) * R(24, 30), -262 + Math.sin(a) * R(24, 30), R(0,360), R(0.7, 1.3), H); }
for (let i = 0; i < 6; i++) put('stump', R(92, 128), R(-280, -244), R(0,360), R(0.8, 1.2), H);
for (let i = 0; i < 4; i++) put('log', R(92, 128), R(-280, -244), R(0,360), 1, H);
for (let i = 0; i < 10; i++) put('pdog', R(94, 126), R(-278, -246), R(0,360), 1, { room: 'hollow', tags: ['zs-creature', 'npc'], state: { name: 'Meadow Prairie Dog', stance: 'friendly' } });
put('tombstone', 110, -262, 0, 1.2, H);
// ---- 6. Sunpond (south-west): footbridge, lilies, a fishing bench, reeds of bush
const P = { room: 'pond' };
put('footbridge', -50, -218, 60, 1, P); put('lilypad', -78, -222, 0, 1.4, P); put('lilypad', -62, -240, 90, 1.4, P); put('lilypad', -84, -236, 200, 1.4, P);
put('bench', -44, -236, 250, 1, P); put('log', -98, -230, 20, 1, P); put('basin', -56, -258, 0, 1, P);
for (let i = 0; i < 16; i++) { const a = R(0, 6.283); put(['berry','dbush1','dbush4'][i % 3], -70 + Math.cos(a) * R(30, 36), -230 + Math.sin(a) * R(30, 36), R(0,360), R(0.9, 1.4), P); }
put('lantern', -46, -230, 0, 1, P);
// ---- 7. Azora mesa: the landmark, seen from the gate
const Z = { room: 'mesa' };
put('azora', 0, -306, 0, 1, Z);
put('brazier', -8, -290, 0, 1, Z); put('brazier', 8, -290, 0, 1, Z); put('banner', -5, -286, 0, 1.3, Z); put('banner', 5, -286, 0, 1.3, Z);
// ---- 8. road scatter: signposts at forks, a broken wagon, lanterns every bend
for (const [x, z] of [[2, -60], [8, -120], [2, -180], [-1, -240]]) put('lantern', x + 4.2, z, 0, 1, { room: 'road' });
put('wagon', -9, -165, 70, 1, { room: 'road' }); put('crate', -11, -169, 10, 1, { room: 'road' }); put('sack', -7, -170, 0, 1, { room: 'road' });
put('campfire', 18, -205, 0, 1, { room: 'road' }); put('tent', 24, -210, 300, 1, { room: 'road' }); put('firewood', 15, -208, 0, 1, { room: 'road' });
// ---- 9. clustered woods: dense copses with open ground between (green west, palms and scrub east)
const W = ['tree04','tree06','tree07','oak','tree02'], E = ['palm2','palm3','tree07','tree04'];
for (const [x, z, r, c] of [[-150,-60,30,10],[-165,-150,34,12],[-55,-170,22,7],[-150,-240,32,10],[-40,-60,18,5],[-30,-130,14,4]]) cluster(x, z, r, c, W);
for (const [x, z, r, c] of [[100,-20,24,7],[175,-95,30,9],[60,-160,22,7],[165,-230,26,7],[60,-310,24,6],[-60,-300,26,7],[40,-110,14,4]]) cluster(x, z, r, c, E);
// rim giants: the big azr trees on the ridge line, silhouettes against the sky
for (const [x, z] of [[-190,-110],[-200,-200],[-120,-300],[190,-160],[150,-290],[-100,20],[90,15]]) put(['tree01','tree03','tree05'][Math.floor(rnd()*3)], x, z, R(0,360), R(0.8, 1), { range: 1400 });
// underbrush round each copse and along road edges
for (let i = 0; i < 60; i++) { const [x, z] = placed[Math.floor(rnd() * placed.length)]; const a = R(0, 6.283), r = R(3, 7); if (free(x + Math.cos(a) * r, z + Math.sin(a) * r, -3)) put(['berry','dbush1','dbush2','dbush4'][i % 4], x + Math.cos(a) * r, z + Math.sin(a) * r, R(0,360), R(0.8, 1.3), { range: 400 }); }
// boulders on the ridges
for (const [x, z] of [[-150,-160],[-55,-168],[58,-170],[172,-95],[105,-325],[-120,-35],[20,30],[-30,28],[160,-200],[-10,-330]]) put('rock', x + R(-6,6), z + R(-6,6), R(0,360), R(0.9, 1.6), { range: 900 });
fs.writeFileSync('art/summer-zone.json', JSON.stringify(out));
console.log(out.length, 'rows');
