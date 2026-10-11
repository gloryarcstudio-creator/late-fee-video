// Late Fee Video — math config (prototype). Pays are multiples of TOTAL bet.
'use strict';

const SYMBOLS = ['P', 'H1', 'H2', 'H3', 'M1', 'M2', 'M3', 'L1', 'L2', 'L3', 'L4', 'W', 'S', 'R'];

// [3, 4, 5] of a kind on a line, in LINE-bet units (line bet = total bet / 20)
const LINE_PAYS = {
  P: [50, 250, 1000],
  H1: [40, 150, 500],
  H2: [30, 120, 400],
  H3: [25, 100, 300],
  M1: [20, 60, 200],
  M2: [15, 50, 150],
  M3: [15, 40, 125],
  L1: [10, 25, 100],
  L2: [10, 25, 100],
  L3: [10, 20, 75],
  L4: [10, 20, 75],
};
// Same table in multiples of TOTAL bet
const PAYTABLE = Object.fromEntries(Object.entries(LINE_PAYS).map(([k, v]) => [k, v.map((x) => x / 20)]));

const SCATTER_PAY = { 3: 2, 4: 10, 5: 50 };
const SCATTER_SPINS = { 3: 10, 4: 12, 5: 15 };
const RETRIGGER = { 2: 3, 3: 5 }; // 3+ scatters in bonus -> +5
const MAX_FREE_SPINS = 50;

const LINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1], [0, 1, 0, 1, 0], [2, 1, 2, 1, 2], [1, 1, 0, 1, 1], [1, 1, 2, 1, 1],
  [0, 1, 1, 1, 0], [2, 1, 1, 1, 2], [0, 2, 0, 2, 0], [2, 0, 2, 0, 2], [0, 2, 2, 2, 0],
];

const REWIND_MULTS = [2, 3, 5, 10];
const WINCAP = 15000;

// Symbol counts per reel strip. W only on reels 2-4, R only on bonus reel 5.
const REELS = {
  base: [
    { P: 3, H1: 4, H2: 5, H3: 5, M1: 6, M2: 7, M3: 7, L1: 9, L2: 9, L3: 10, L4: 10, S: 2 },
    { P: 3, H1: 4, H2: 5, H3: 5, M1: 6, M2: 7, M3: 7, L1: 9, L2: 9, L3: 10, L4: 10, W: 6, S: 2 },
    { P: 3, H1: 4, H2: 5, H3: 5, M1: 6, M2: 7, M3: 7, L1: 9, L2: 9, L3: 10, L4: 10, W: 6, S: 2 },
    { P: 3, H1: 4, H2: 5, H3: 5, M1: 6, M2: 7, M3: 7, L1: 9, L2: 9, L3: 10, L4: 10, W: 6, S: 2 },
    { P: 3, H1: 4, H2: 5, H3: 5, M1: 6, M2: 7, M3: 7, L1: 9, L2: 9, L3: 11, L4: 11, S: 2 },
  ],
  bonus: [
    { P: 4, H1: 5, H2: 6, H3: 6, M1: 7, M2: 7, M3: 7, L1: 7, L2: 7, L3: 7, L4: 7, S: 2 },
    { P: 4, H1: 5, H2: 6, H3: 6, M1: 7, M2: 7, M3: 7, L1: 7, L2: 7, L3: 7, L4: 7, W: 10, S: 2 },
    { P: 4, H1: 5, H2: 6, H3: 6, M1: 7, M2: 7, M3: 7, L1: 7, L2: 7, L3: 7, L4: 7, W: 10, S: 2 },
    { P: 4, H1: 5, H2: 6, H3: 6, M1: 7, M2: 7, M3: 7, L1: 7, L2: 7, L3: 7, L4: 7, W: 10, S: 2 },
    { P: 4, H1: 5, H2: 6, H3: 6, M1: 7, M2: 7, M3: 7, L1: 7, L2: 7, L3: 7, L4: 7, S: 2, R: 6 },
  ],
};
// Ante: same pays, more scatters.
REELS.ante = REELS.base.map((r, i) => ({ ...r, S: r.S * 2, L4: i === 4 ? r.L4 + 9 : r.L4 }));

const MAX_STACK = { base: 2, ante: 2, bonus: 1 };

const PAUSE_CHANCE = { base: 0.25, bonus: 0.2 };

const MODES = {
  base: { cost: 1, reels: 'base' },
  ante: { cost: 3, reels: 'ante' },
  bonus: { cost: 100, buy: true, spins: 10 },
  double: { cost: 260, buy: true, spins: 10, forceRewEvery: 3 },
  director: { cost: 570, buy: true, spins: 12, multStart: 2, forceRewEvery: 2 }, // multStart: index into REWIND_MULTS (x5)
};

module.exports = {
  SYMBOLS, LINE_PAYS, PAYTABLE, SCATTER_PAY, SCATTER_SPINS, RETRIGGER, MAX_FREE_SPINS, LINES,
  REWIND_MULTS, WINCAP, REELS, MAX_STACK, PAUSE_CHANCE, MODES,
};
