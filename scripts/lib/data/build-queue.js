// BUILD QUEUE tuning (docs/board/proposals/BUILD-QUEUE.md, creator go 2026-09-29). Every number the ranking uses lives here.
export const BQ = {
  file: "docs/board/BUILD-QUEUE.md",
  priority: "docs/board/PRIORITY.md",     // VOTE-LEDGER: the creator's pins, top first (sole writers: view-settings.js pins, board-jev.js prune)
  sources: ["docs/board/DEN-APPROVED.md", "docs/board/SOLO-APPROVED.md"],
  shelf: "docs/board/SHELF.md",
  score: { creatorYes: 40, size: { S: 20, M: 8, L: 0 }, perDay: 2, dayCap: 20, plugsIn: 15, cluster: 10, shelf: -100, pinned: 100 }, // pinned: VOTE-LEDGER L6, the creator's ★ (docs/board/PRIORITY.md), above every other part
  order: { size: ["S", "M", "L"] },      // JEV-LOAD L7: the sort key before creator YES, age and score (S drains the backlog first)
  urgency: { high: 70, mid: 45 },           // score ≥ high → HIGH, ≥ mid → MID, else LOW
  // JEV-LOAD L7: approved ideas that read as the same thing (title + where). The creator decides merge or keep (CREATOR-VOTE.md card);
  // nothing is merged or deleted here. render() lists a group while 2+ of its ids are still open. A new pair = one row.
  overlaps: [
    { ids: ["D56", "D36"], what: "a shore tide-mark stone at the jetty's water edge (Njörðr's Tide Shelf / Bifröst Tide-Stone)" },
    { ids: ["D44", "D46", "D50", "D48"], what: "a blót offering shelf or bowl (east wall by the high seat ×2, south door-post, yard altar)" },
    { ids: ["D29", "S12"], what: "tallow-dip candle making (yard post / hearthside mini-game)" },
    { ids: ["D24", "S31"], what: "a pelt stretching / hide-scraping frame in the yard" },
    { ids: ["D27", "S28"], what: "a fish smoking rack (shore trap + rack / smokehouse herring rack)" },
    { ids: ["S35", "S44"], what: "an eel trap sunk in the shallows" },
    { ids: ["D40", "D51"], what: "a storm-felled tree at the north-east yard treeline" },
    { ids: ["S2", "S47"], what: "striking the hearth fire: flint-and-steel / tinder-horn spark box" },
    { ids: ["D20", "D58"], what: "a frozen-shore omen on the strip west of the jetty" },
  ],
  // an idea that leans on something already standing in the den gets plugsIn
  standing: ["hearth", "smokehouse", "smithy", "anvil", "forge", "woodshed", "longship", "loom", "raven post", "root cellar", "bread oven", "gnomon", "quench", "high seat", "runestone"],
  // zone by the first matching word of the idea's "where:" (order matters)
  zones: [["SMITHY", ["smithy", "forge", "anvil", "quench"]], ["HALL", ["hall", "hearth", "interior", "inside the longhouse", "dais", "loft", "high seat", "inside"]],
          ["SHORE", ["shore", "beach", "shallows", "lake", "longship", "jetty", "pier", "boathouse", "weir"]], ["YARD N", ["north yard", "north edge", "yard north", "tree line", "north of the longhouse"]], ["YARD S", ["south yard"]],
          ["VALLEY", ["valley", "hillside", "meadow", "slope", "ridge"]], ["YARD", ["yard", "garden", "gate", "path", "outside"]]],
};
