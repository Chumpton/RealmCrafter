// Verdant Glade design pass (2026-10-10): groves that fill the thin quarters and dress the den path.
// One row per grove: [id, x, z, radius, trees]. Underbrush, flowers and ground litter follow from the palette below.
// Everything here is the zone's own mound sheet (zs-spring) + the Elwynn kit; LOD tiers copy Sunreach Vale.
const C = (h) => `/cdn/value.${h}.glb`;
export const PAL = {
  oak:    { model: C("a1be1f6963ed40e1e7a1e01a95ff02329fb7faa15f4dcb461849c5f4dbaff066"), s: [0.72, 0.95], phys: { body: "static", collider: "box" }, vr: 800 },
  tree83: { model: C("61ac3092a63f4ca1fd36d77d9c8326fdc41ba0209ecc3ccffc552f1caae420cc"), s: [0.8, 1.0], phys: { body: "static", collider: "capsule" }, vr: 800 },
  bush:   { model: C("1b3c7471e0743bc579e19ef593eff972e05d7835c8ee1062bc15288259815020"), s: [0.28, 0.4], vr: 170 },
  bush72: { model: C("f94ac788ff8f966be39a3049021e587b4f10af7b6b2a593c4b4b678f9b2f4eaf"), s: [0.7, 1.0], vr: 170 },
  dense:  { model: C("938f8761a479c2c9f6d263542c3494aa2df35310ef8465f940205327853779f4"), s: [0.7, 1.0], vr: 170 },
  low:    { model: C("9e3dd96a91f24c9456d2222731a121cf1068b43c2fb862ff5d3d3003f81d52c6"), s: [0.5, 0.7], vr: 150 },
  berry:  { model: C("27daa4080bd2f6a98ffaf269554b3c2ec2e1964acde1f7f0afe2871827173cdc"), s: [0.55, 0.75], vr: 150 },
  bell:   { model: C("02e4f49f8d04a68e98b756eb0c424ca172c0e639efa517c904a7625a1fa81ae5"), s: [0.1, 0.14], vr: 80 },
  rock:   { model: C("8a0ec2f551c63c864f3daa92721cc5471ccdc29e121639c0c73da6d05ed1624b"), s: [0.05, 0.09], phys: { body: "static", collider: "mesh" }, vr: 260 },
  log:    { model: C("097cb7d56a4e57e2799289e6df11c403c67372c87d1fbee4d0ed75ef0b3210c6"), s: [0.32, 0.36], phys: { body: "static", collider: "box" }, vr: 260 },
  stump:  { model: C("2d46aa9e2c2020846c9da8912baab3767590793830e476e71e85930cd72884cb"), s: [0.28, 0.32], phys: { body: "static", collider: "box" }, vr: 260 },
};
// A grove: trees ringed by underbrush, flowers in the light at its edge, one log or stump and a rock in its litter.
export const GROVE_MIX = { trees: ["oak", "oak", "tree83"], under: ["bush", "bush72", "dense", "low", "berry"], flowers: ["bell"], litter: ["log", "stump", "rock", "rock"] };
export const GROVES = [
  ["s1", 28, -234, 16, 5],
  ["s2", 80, -238, 13, 4],
  ["s3", -24, -238, 12, 3],
  ["e1", 146, -132, 15, 5],
  ["e2", 112, -118, 10, 3],
  ["e3", 152, -196, 12, 4],
];
// Hand-placed roadside details: [kind, x, z, yaw]; "milestone" is sv-props' road stone.
export const ROADSIDE = [
  ["milestone", -82.6, -163.5, 200], ["stump", -83.5, -170, 30], ["berry", -84.2, -172.5, 0], ["bell", -83, -174, 0], ["bell", -82.6, -175.2, 90],
  ["log", -73.2, -176, 75], ["rock", -72.8, -178.6, 10], ["low", -73.5, -181, 0], ["bell", -72.4, -173, 0], ["rock", -80.5, -184.5, 140],
  ["bush", -81.5, -180, 0], ["dense", -74, -168, 0], ["bell", -79.5, -186.5, 0], ["stump", -71.5, -184, 200],
  ["milestone", 4.5, -91, 180], ["bell", -3.5, -92, 0], ["bell", 4, -108.5, 0], ["low", -3.8, -108, 0], ["rock", 5.2, -109.5, 60], ["berry", -4.2, -90.5, 0],
];
