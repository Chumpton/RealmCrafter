// VOTE-LEDGER data (docs/board/proposals/VOTE-LEDGER.md, L2). The files the MY VOTES window reads, its caps, its status table and colours.
// Pure data: scripts/lib/vote-ledger.js parses; view-settings.js (actions), ui.js (window), board-jev.js (prune + JEV suggest) read it.
export const VL = {
  files: {
    voted: "docs/board/VOTED.md",
    denApproved: "docs/board/DEN-APPROVED.md",
    soloApproved: "docs/board/SOLO-APPROVED.md",
    denDropped: "docs/board/DEN-DROPPED.md",
    soloDropped: "docs/board/SOLO-DROPPED.md",
    merges: "docs/board/MERGES.md",
    creatorVote: "docs/board/CREATOR-VOTE.md",
    queue: "docs/board/BUILD-QUEUE.md",
    priority: "docs/board/PRIORITY.md",
    index: "docs/board/IDEA-INDEX.md",
  },
  pinCap: 10,     // a wall of stars is no priority
  rowsMax: 120,   // rows per uiEvent payload (after tab/filter), titles cut to titleMax
  titleMax: 48,
  statuses: ["PENDING", "BUILDING", "BUILT", "DENIED", "MERGED", "KEPT", "REVOTE"],
  colors: { PENDING: "#ba8950", BUILDING: "#5dada9", BUILT: "#9baf84", DENIED: "#8a5a4a", MERGED: "#7a86a8", KEPT: "#a89a7a", REVOTE: "#d9a441" },
  jev: { picks: 5, model: "fast" },
  // STATUS TRUTH (one table, from files): a board header word → the ledger status; stage = which file wins when two disagree (higher = later).
  header: [
    { re: /^(DONE|BUILT)\b/, status: "BUILT", stage: 4 },
    { re: /^MERGED\s*→\s*([A-Z]+\d+)/, status: "MERGED", stage: 4 },
    { re: /^(DROPPED)\b/, status: "DENIED", stage: 3 },
    { re: /^(SHELVED)\b/, status: "DENIED", stage: 3, note: "shelved: waits on a system (SHELF.md)" },
    { re: /^(BUILDING|IN PROGRESS)\b/, status: "BUILDING", stage: 2 },
    { re: /^(TODO)\b/, status: "PENDING", stage: 1 },
    { re: /^(OPEN)\b/, status: "PENDING", stage: 0 },
  ],
  // the window's list order: what needs him first, then the queue, then the record
  order: ["REVOTE", "PENDING", "BUILDING", "BUILT", "MERGED", "KEPT", "DENIED"],
  tabs: { ideas: ["idea"], merges: ["merge"], critical: ["critical"], all: null },
  priorityHead: "# PRIORITY · the creator's pinned builds, top first",
};
