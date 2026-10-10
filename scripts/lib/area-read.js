// LIGHT EDITOR · AUTOFILL · the area reader (pure, no ctx): a survey in, "what kind of place is this" out.
// survey: { c:{x,z}, r, things:[{id,cls,name,x,z,hx,hz}], lamps:[{kind,x,z}], open:[], hall?:{x,z}, ground?:{water,slope} }
// readArea -> { kind, label, confidence, counts, why } (le.read minus jev). summarizeForJev -> the small typed ask for JEV.
import { AREA } from './data/area-kinds.js';
import { LE } from './data/light-rules.js';
const KEYS = ['house', 'pen', 'dock', 'forge', 'gate', 'table', 'sacred', 'tree', 'well', 'yard', 'bridge', 'lamp'];
const STRUCT = ['house', 'pen', 'dock', 'forge', 'gate', 'table', 'sacred', 'well', 'yard', 'bridge'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const txt = (t) => (String(t.id ?? '') + ' ' + String(t.name ?? '')).toLowerCase();
const wOf = (t) => clamp(((t.hx ?? 0.5) * (t.hz ?? 0.5) * 4) / AREA.area.ref, AREA.area.min, AREA.area.max);
const hallOf = (s) => s.hall ?? LE.hall;

function tally(survey) {
  const counts = {}, w = {}, sub = { hall: 0, barn: 0, hay: 0, field: 0, boat: 0, anvil: 0 };
  for (const k of KEYS) { counts[k] = 0; w[k] = 0; }
  const W = AREA.words, hall = hallOf(survey);
  let hallNear = false;
  for (const t of survey.things ?? []) {
    const c = t.cls; if (!c || c === 'skip' || !(c in counts)) continue;
    counts[c]++; w[c] += wOf(t);
    const s = txt(t);
    if (c === 'house' && W.hall.test(s)) { sub.hall++; if (Math.hypot(t.x - hall.x, t.z - hall.z) <= AREA.hall.near + Math.max(t.hx, t.hz)) hallNear = true; }
    if (c === 'house' && W.barn.test(s)) sub.barn++;
    if (W.hay.test(s)) sub.hay++;
    if (W.field.test(s)) sub.field++;
    if (W.boat.test(s)) sub.boat++;
    if (W.anvil.test(s)) sub.anvil++;
  }
  counts.lamp += (survey.lamps ?? []).length;
  return { counts, w, sub, hallNear };
}

export function readArea(survey = {}) {
  const { counts, w, sub, hallNear } = tally(survey);
  const c = survey.c ?? { x: 0, z: 0 }, hall = hallOf(survey), A = AREA;
  const hallM = Math.hypot(c.x - hall.x, c.z - hall.z);
  const water = clamp(survey.ground?.water ?? 0, 0, 1);
  const structures = STRUCT.reduce((n, k) => n + counts[k], 0);
  const homes = Math.max(0, counts.house - sub.barn);
  const sc = { wild: A.wild.floor };
  // longhouse: the hall by name in the ring, or the ring centred near the hall with a roof around
  sc.longhouse = (hallNear ? A.hall.nameW : 0) + (hallM <= A.hall.near && counts.house ? A.hall.nearW * (1 - hallM / A.hall.near) + A.hall.nearW * 0.5 : 0);
  sc.harbour = counts.dock || sub.boat ? w.dock * A.harbour.dockW + sub.boat * A.harbour.boatW + water * A.harbour.waterW : 0;
  sc.shore = water >= A.shore.waterMin && !counts.dock && !sub.boat ? water * A.shore.waterW : 0;
  sc.farmstead = w.pen * A.farm.penW + sub.barn * A.farm.barnW + sub.hay * A.farm.hayW + sub.field * A.farm.fieldW;
  sc.village = homes >= A.village.minHouses ? homes * A.village.houseW : 0;
  sc.forge = counts.forge ? w.forge * A.forge.forgeW + sub.anvil * A.forge.anvilW : 0;
  sc.grove = counts.tree >= A.grove.minTrees && structures <= A.grove.maxStructures ? counts.tree * A.grove.treeW : 0;
  const cross = counts.gate + counts.bridge;
  // AUTOFILL v2: a worn trail through the ring with little built beside it is a Road too (metres of trail inside the ring)
  let pathM = 0; for (const pa of survey.paths ?? []) for (let i = 0; i + 1 < pa.pts.length; i++) { const [ax, az] = pa.pts[i], [bx, bz] = pa.pts[i + 1];
    if (Math.hypot((ax + bx) / 2 - c.x, (az + bz) / 2 - c.z) <= (survey.r ?? 0)) pathM += Math.hypot(bx - ax, bz - az); }
  sc.road = structures - cross <= A.road.maxOther ? cross * A.road.crossW + Math.min(pathM / (A.road.trailPer ?? 10), A.road.trailMax ?? 4) : 0;
  let kind = 'wild', top = sc.wild, second = 0;
  for (const k in sc) { const v = sc[k]; if (v > top) { second = top; top = v; kind = k; } else if (k !== kind && v > second) second = v; }
  const confidence = Math.round(clamp((top / (top + second || 1)) * clamp(top / A.conf.full, 0.35, 1) * 1.4, 0, 1) * 100) / 100;
  const parts = [];
  for (const [key, one, many] of A.show[kind]) {
    const n = key in sub ? sub[key] : key === 'house' && kind !== 'longhouse' ? (kind === 'village' ? homes : counts.house) : counts[key];
    if (n > 0 && parts.length < A.labelParts) parts.push(`${n} ${n === 1 ? one : many}`);
  }
  const name = A.kinds[kind].label;
  const label = parts.length ? `${name} · ${parts.join(', ')}` : name;
  const why = kind === 'longhouse' ? (hallNear ? 'the hall stands in the ring' : `${Math.round(hallM)} m from the hall, roofs around`)
    : kind === 'harbour' ? `${counts.dock} landing${counts.dock === 1 ? '' : 's'}${sub.boat ? `, ${sub.boat} boat${sub.boat === 1 ? '' : 's'}` : ''} at the water`
    : kind === 'shore' ? `${Math.round(water * 100)}% of the ground is water, no landing`
    : kind === 'farmstead' ? 'pens, barns or fields outweigh the rest'
    : kind === 'village' ? `${homes} houses close together`
    : kind === 'forge' ? 'a forge stands here'
    : kind === 'grove' ? `${counts.tree} trees and no roofs`
    : kind === 'road' ? (cross ? `a ${counts.gate ? 'gate' : 'bridge'} with little else around` : `${Math.round(pathM)} m of worn trail, little built`)
    : structures ? 'too little here to name' : 'nothing built here';
  return { kind, label, confidence, counts, why, pathM: Math.round(pathM) };
}

export function summarizeForJev(survey = {}, read = readArea(survey)) {
  const c = survey.c ?? { x: 0, z: 0 }, hall = hallOf(survey);
  const near = (survey.things ?? []).filter((t) => t.cls && t.cls !== 'skip' && t.cls !== 'tree' && t.cls !== 'lamp')
    .map((t) => ({ name: String(t.name ?? t.id ?? t.cls), cls: t.cls, m: Math.round(Math.hypot(t.x - c.x, t.z - c.z) * 10) / 10 }))
    .sort((a, b) => a.m - b.m).slice(0, AREA.nearMax);
  return {
    r: Math.round((survey.r ?? 0) * 10) / 10,
    rule: read.kind, ruleConf: read.confidence,
    counts: { ...read.counts },
    near,
    hallM: Math.round(Math.hypot(c.x - hall.x, c.z - hall.z)),
    water: Math.round(clamp(survey.ground?.water ?? 0, 0, 1) * 100) / 100,
    trailM: read.pathM ?? 0, // metres of worn path/road through the ring: a track people walk
    lamps: (survey.lamps ?? []).length,
    kinds: Object.keys(AREA.kinds),
  };
}
