/**
 * BOOK OF CURSES — Math & Rules Configuration
 * All tunable parameters live here. Engine and UI read from this file.
 */
(function (global) {
  const SYM = {
    TEN: 0, JACK: 1, QUEEN: 2, KING: 3, ACE: 4,
    SCARAB: 5, IDOL: 6, MASK: 7, GEM: 8, PRIEST: 9, BOOK: 10
  };

  const SYMBOL_META = [
    { id: 0, key: "ten", name: "10", tier: "low" },
    { id: 1, key: "jack", name: "J", tier: "low" },
    { id: 2, key: "queen", name: "Q", tier: "low" },
    { id: 3, key: "king", name: "K", tier: "low" },
    { id: 4, key: "ace", name: "A", tier: "low" },
    { id: 5, key: "scarab", name: "Golden Scarab", tier: "premium" },
    { id: 6, key: "idol", name: "Cursed Idol", tier: "premium" },
    { id: 7, key: "mask", name: "Ancient Mask", tier: "premium" },
    { id: 8, key: "gem", name: "Obsidian Gem", tier: "premium" },
    { id: 9, key: "priest", name: "High Priest", tier: "premium" },
    { id: 10, key: "book", name: "Book of Curses", tier: "special" }
  ];

  const PAYTABLE = {
    0: [9, 22, 62],
    1: [9, 22, 62],
    2: [11, 27, 83],
    3: [13, 32, 104],
    4: [16, 43, 124],
    5: [21, 64, 187],
    6: [26, 86, 260],
    7: [31, 107, 364],
    8: [42, 161, 519],
    9: [52, 214, 779],
    10: [21, 214, 2076]
  };

  const PAYLINES = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2],
    [0, 1, 2, 1, 0],
    [2, 1, 0, 1, 2],
    [0, 0, 1, 2, 2],
    [2, 2, 1, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 2, 2, 2, 1],
    [0, 1, 1, 1, 2]
  ];

  const BASE_REELS = [
    [0,0,0,5,1,1,1,6,2,2,2,10,3,3,3,7,4,4,0,0,8,1,1,2,2,9,3,3,4,4,5,0,1,6,2,3,7,4],
    [1,1,1,5,2,2,2,6,0,0,0,3,3,10,4,4,4,7,1,1,8,2,2,0,0,9,3,3,5,4,4,6,1,2,7,0,3,4],
    [2,2,2,5,0,0,0,6,1,1,1,10,4,4,3,3,3,7,2,2,8,0,0,1,1,9,4,4,5,3,3,6,2,0,7,1,4,3],
    [3,3,3,5,1,1,1,6,2,2,0,0,0,10,4,4,4,7,3,3,8,1,1,2,2,9,0,0,5,4,4,6,3,1,7,2,0,4],
    [4,4,4,5,0,0,0,6,1,1,1,2,2,2,10,3,3,7,4,4,8,0,0,1,1,9,2,2,5,3,3,6,4,0,7,1,2,3]
  ];

  const BONUS_REELS = [
    [0,0,0,5,5,1,1,1,6,2,2,2,10,3,3,7,4,4,8,0,0,9,1,1,5,2,2,6,3,3,7,4,4,8,1,0,2,3],
    [1,1,1,5,2,2,2,6,6,0,0,10,3,3,7,4,4,8,1,1,9,2,2,5,0,0,6,3,3,7,4,4,8,1,2,0,3,5],
    [2,2,2,5,0,0,6,1,1,1,10,4,4,7,3,3,8,2,2,9,0,0,5,1,1,6,4,4,7,3,3,8,2,0,1,9,4,10],
    [3,3,1,1,1,5,2,2,6,0,0,10,4,4,7,3,3,8,1,1,9,2,2,5,0,0,6,4,4,7,3,3,8,1,2,0,5,9],
    [4,4,0,0,0,5,1,1,6,2,2,10,3,3,7,4,4,8,0,0,9,1,1,5,2,2,6,3,3,7,4,4,8,0,1,2,5,3]
  ];

  const CONFIG = {
    name: "Book of Curses",
    version: "0.9.3",
    rows: 3,
    reels: 5,
    paylineCount: PAYLINES.length,
    symbols: SYM,
    symbolMeta: SYMBOL_META,
    paytable: PAYTABLE,
    paylines: PAYLINES,
    baseReels: BASE_REELS,
    bonusReels: BONUS_REELS,
    wildId: SYM.BOOK,
    scatterId: SYM.BOOK,
    scattersToTrigger: 3,
    baseFreeSpins: 10,
    retriggerSpins: 5,
    retriggerEnergy: 1,
    bets: [1, 2, 5, 10, 20, 50, 100],
    defaultBet: 10,
    startBalance: 10000,
    maxWinX: 10000,
    targetRtp: 0.96,
    curse: {
      thresholds: [0, 3, 6, 9],
      names: ["CURSE I — AWAKENED", "CURSE II — CORRUPTED", "CURSE III — POSSESSED", "FULL CURSE"],
      shortNames: ["AWAKENED", "CORRUPTED", "POSSESSED", "FULL CURSE"],
      multipliers: [1, 2, 2, 2],
      energyForExpand: { 3: 1, 4: 2, 5: 3 },
      fullCurseInfectChance: 0.45,
      fullCurseWaves: 1,
      maxEnergyDisplay: 12,
      bonusExtraCopies: 2
    },
    theoreticalRtpNote: "Target 96% HV. 1M-spin empirical ~95–96% after v0.9.2 paytable."
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { CONFIG, SYM, SYMBOL_META, PAYTABLE, PAYLINES };
  }
  global.BOC = global.BOC || {};
  global.BOC.CONFIG = CONFIG;
  global.BOC.SYM = SYM;
})(typeof window !== "undefined" ? window : global);
