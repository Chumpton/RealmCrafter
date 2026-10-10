// MERGE-GATE-v2 contract (docs/board/proposals/MERGE-GATE-v2.md, M1). Read by scripts/lib/merge-gate.js only.
// MERGE carries the six contract keys; GATE carries the file paths, zones and timeouts the checks read.
// Changed only by a plan the creator approves.
export const MERGE = {
  on: true, // the gate itself; nothing calls it until M5 wires build-queue.js (that call site is the real switch)
  points: [ // all five must pass; a fail changes nothing and sends the card back with the point and the reason
    { n: 1, id: "IDENTITY", name: "SAME THING, SAME PLACE", how: "IDEA-INDEX keys match, or both places are one zone; different places = KEEP, not a merge" },
    { n: 2, id: "COMPLETE", name: "NOTHING LOST", how: "every E-action, sound, visual and done-when clause of both sources mapped by VÖR with a verbatim quote (checkVerdict's evidence rule)" },
    { n: 3, id: "CONFLICT", name: "NO CONFLICT", how: "one where, one size, one kind; no ruling, PROTECTED finding, NOT-DUPE or ban; no open claim or running build" },
    { n: 4, id: "UNDO", name: "FULLY REVERSIBLE", how: "both originals verbatim in MERGES.md with sha256; UNMERGE restores them and the hashes must match" },
    { n: 5, id: "AUDIT", name: "AUTHORISED AND AUDITED", how: "approved ideas: the creator's rune-board seal only; open ideas: Savi + Claude agree, then the creator's seal; one MERGES.md block per merge" },
  ],
  jobsPerMerge: 2, // one JEV draft + one VÖR mapping, Spawn llm:generate, on demand only, metered as lane "merge"
  moments: [ // what a player meets, in order of test; a done-when clause that matches none is still a moment ("clause")
    { kind: "e-action", re: /\b(?:press(?:es|ed|ing)?|hold(?:s|ing)?|tap(?:s|ping)?|use(?:s)?)\s+E\b|\bE\s+(?:to|on|at|near|within)\b|\bon E\b/ },
    { kind: "sound", re: /\b(?:sound|audio|bark|chime|voice|song|sings?|hum|creak|clink|splash|whisper|murmur\w*|horn|drum|bell|toll|crackl\w*|hears?)\b/i },
    { kind: "visual", re: /\b(?:particle|glow\w*|shimmer\w*|light|rune|arc|emitter|motes?|rainbow|carv\w*|paint\w*|mesh|flame|smoke|mist|steam|sparks?|notch\w*|crown\w*|cups?|legible|model+ed|props?)\b/i },
  ],
  draftModel: "smart",
  hashFn: "sha256", // scripts/lib/sha256.js, the referee's seal hash; never build-queue's 32-bit hash16
};

export const GATE = {
  mergesFile: "docs/board/MERGES.md",
  boards: ["docs/board/DEN-APPROVED.md", "docs/board/SOLO-APPROVED.md", "docs/board/DEN-IDEAS.md", "docs/board/SOLO-IDEAS.md"], // first hit wins: approved before open
  indexFile: "docs/board/IDEA-INDEX.md",
  rulingsFile: "docs/board/RULINGS.md",
  findingsFile: "docs/board/FINDINGS.md",
  claimsFile: "docs/board/CLAIMS.md",
  queueFile: "docs/board/BUILD-QUEUE.md",
  mapModel: "smart", // VÖR's mapping job
  zones: { // idea-index derivePlace spot/area -> zone (point 1); "den" has no zone: it never matches by zone
    jetty: "shore", longship: "shore", shore: "shore",
    "hall-floor": "hall", "craft-bench": "hall", loft: "hall", "high-seat": "hall", door: "hall", hearth: "hall", hall: "hall",
    smithy: "yard", yard: "yard", valley: "valley",
  },
  sizes: ["XS", "S", "M", "L", "XL"],
  kinds: ["asset", "animal", "landscape", "npc", "sound", "system", "texture", "task", "fx", "music", "place", "mini-game", "craft", "building", "decoration"], // + the kinds the idea boards use (Claude, MD24)
  unmergers: ["creator", "savi", "claude"],
  cutAt: 200, // a board field this long with no end stop was cut by the board (DEN-APPROVED cuts near 240 chars): its last word is dropped from the moment
  minWords: 3, // a moment shorter than this is noise
  timeoutMs: 10 * 60e3, // both jobs out longer than this = FAIL (nothing changed)
  maxMoments: 40,
};
