// HUGINN-FLIGHT F11: the beacon. One fx program on huginn-drone, no lights: six rainbow ribbons riding him (~3 s of path each, ~36 m
// at 12 m/s), a few sparkle stars left behind, and a pillar mesh child (huginn-drone/pillar). scripts/huginn.js swaps BEACON ↔ HIDDEN
// when he is inside something (noclip), and stands the last-seen rune (huginn-drone/lastseen stays a root: huginn-lastseen).
const BANDS = [['red', '1.8,.12,.1'], ['orange', '1.8,.7,.06'], ['yellow', '1.5,1.35,.1'], ['green', '.18,1.5,.25'], ['blue', '.15,.55,1.8'], ['violet', '1,.18,1.6']];
// each band a stream of glowing cards born at his body and left hanging where he was: the trail IS his path, ~3 s long
const ribs = (len) => BANDS.map(([n, c], i) => `pop ${n} rate=?low:6|14 on=box(.15,.08,.15).c(${(1.25 - i * 0.5).toFixed(2)}) life=${len} size=.55 col=hdr(${c}) a=1>.7:.8>0 sz=$size*(1>.6) r=sprite(soft-disc,add)`).join('\n');
export const BEACON = `fx
${ribs(3)}
pop stars rate=?low:2|5 on=sphere(1.2) life=.8..1.4 v=sdir()*(.2..0.6) size=.25..0.5 acc=drag(1.5) col=hdr(3,3,2.4) a=(0>.1:1>.6:1>0)*flick(9,.4) sz=$size*(1>.5:1>0) rot=spin(.4) r=sprite(mote,add)`;
export const HIDDEN = `fx
pop glow n=1 at=point() size=1.2 col=hdr(.6,1.8,2) a=.35*flick(1.5,.5) sz=$size r=sprite(soft-disc,add)`;
export const PILLAR = { id: 'pillar', feetPosition: { x: 0, y: 0.6, z: 0 }, primitive: { kind: 'cylinder', radiusTop: 0.35, radiusBottom: 0.35, height: 70, radialSegments: 6, openEnded: true },
  material: { color: 'oklch(0.85 0.12 200 / 0.28)', emissive: 'oklch(0.85 0.14 200)', emissiveIntensity: 1.1, transparent: true, depthWrite: false },
  physics: 'none', castShadow: false, receiveShadow: false, visibleTo: 'editors', visibleRange: { max: 1200 } }; // creator 2026-10-04: the scout's beam is a builder's tool, players never see it
export const RUNE = (p) => ({ feetPosition: { x: p.x, y: p.y + 1, z: p.z }, physics: 'none', tags: ['huginn'],
  visibleTo: 'editors', vector: "<svg viewBox='0 0 100 100' width='3m' billboard='full'><circle cx='50' cy='50' r='44' fill='none' stroke='#7fe3ff' stroke-width='6' filter='drop-shadow(0 0 6 #7fe3ff)'/><path d='M36 22 L36 78 M64 22 L64 78 M36 44 L64 58' stroke='#f2e6cf' stroke-width='8' fill='none' stroke-linecap='round'/><text x='50' y='96' font-family='display' font-size='12' fill='#7fe3ff' text-anchor='middle'>LAST SEEN</text></svg>",
  visibleRange: { max: 1200 } });
