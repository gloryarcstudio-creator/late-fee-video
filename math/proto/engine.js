// Late Fee Video — prototype game engine. Produces SDK-style event lists per round.
'use strict';
const C = require('./config');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds a strip from counts. Paying symbols come in stacks of 1..maxStack;
// S and R stay >= 3 apart so at most one is visible per reel.
function buildStrip(counts, rnd, maxStack) {
  const special = ['S', 'R'];
  for (let attempt = 0; attempt < 10000; attempt++) {
    const blocks = [];
    for (const [sym, n] of Object.entries(counts)) {
      let left = n;
      while (left > 0) {
        const size = special.includes(sym) || sym === 'W' ? 1 : Math.min(left, 1 + Math.floor(rnd() * maxStack));
        blocks.push(new Array(size).fill(sym));
        left -= size;
      }
    }
    for (let i = blocks.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    }
    const strip = blocks.flat();
    const L = strip.length;
    let ok = true;
    for (let i = 0; i < L && ok; i++) {
      if (!special.includes(strip[i])) continue;
      for (let d = 1; d < 3; d++) if (special.includes(strip[(i + d) % L])) ok = false;
    }
    if (ok) return strip;
  }
  throw new Error('cannot build strip');
}

function buildReelSets(seed = 1989) {
  const rnd = mulberry32(seed);
  const sets = {};
  for (const [name, reels] of Object.entries(C.REELS)) sets[name] = reels.map((c) => buildStrip(c, rnd, C.MAX_STACK[name]));
  return sets;
}

const copyBoard = (b) => b.map((r) => r.slice());

function spinReel(strip, rnd) {
  const p = Math.floor(rnd() * strip.length);
  return [0, 1, 2].map((k) => strip[(p + k) % strip.length]);
}

function spinBoard(strips, rnd) {
  return strips.map((s) => spinReel(s, rnd));
}

function evalLines(board) {
  const wins = [];
  let total = 0;
  C.LINES.forEach((line, li) => {
    const first = board[0][line[0]];
    if (!C.PAYTABLE[first]) return;
    let kind = 1;
    while (kind < 5) {
      const s = board[kind][line[kind]];
      if (s === first || s === 'W') kind++;
      else break;
    }
    if (kind < 3) return;
    const pay = C.PAYTABLE[first][kind - 3];
    total += pay;
    wins.push({ line: li, sym: first, kind, pay, positions: line.slice(0, kind).map((row, reel) => [reel, row]) });
  });
  return { wins, total: round2(total) };
}

const round2 = (x) => Math.round(x * 100) / 100;
const countSym = (board, sym) => board.reduce((n, r) => n + r.filter((s) => s === sym).length, 0);
const winningReels = (wins) => {
  const set = new Set();
  wins.forEach((w) => w.positions.forEach(([reel]) => set.add(reel)));
  return set;
};

// PAUSE: winning reels freeze, others respin while the line win keeps growing. Pays increments.
function pauseChain(board, res, strips, rnd, events, mult = 1) {
  let cur = board, curRes = res, paid = 0;
  for (;;) {
    const frozen = winningReels(curRes.wins);
    if (frozen.size >= 5) break;
    const next = copyBoard(cur);
    for (let r = 0; r < 5; r++) if (!frozen.has(r)) next[r] = spinReel(strips[r], rnd);
    const nextRes = evalLines(next);
    const inc = round2(nextRes.total - curRes.total);
    events.push({ type: 'pauseRespin', frozenReels: [...frozen], board: next, wins: nextRes.wins, win: round2(Math.max(0, inc) * mult) });
    cur = next;
    if (inc <= 0) break;
    paid = round2(paid + inc * mult);
    curRes = nextRes;
  }
  return { board: cur, res: curRes, paid };
}

function playRound(mode, sets, rnd) {
  const M = C.MODES[mode];
  const events = [];
  const st = { total: 0, base: 0, free: 0, capped: false, bonusTriggered: false, rewinds: 0, pauses: 0 };
  const add = (amt, key) => {
    if (st.capped || amt <= 0) return;
    const room = C.WINCAP - st.total;
    const a = Math.min(amt, room);
    st.total = round2(st.total + a);
    st[key] = round2(st[key] + a);
    if (st.total >= C.WINCAP) { st.capped = true; events.push({ type: 'wincap', amount: C.WINCAP }); }
  };

  let spins = 0;
  if (M.buy) {
    spins = M.spins;
    st.bonusTriggered = true;
  } else {
    const strips = sets[M.reels];
    let board = spinBoard(strips, rnd);
    events.push({ type: 'reveal', gameType: 'base', board });
    let res = evalLines(board);
    if (res.total > 0) {
      events.push({ type: 'winInfo', wins: res.wins, win: res.total });
      add(res.total, 'base');
      if (rnd() < C.PAUSE_CHANCE.base) {
        st.pauses++;
        events.push({ type: 'pauseStart' });
        const pc = pauseChain(board, res, strips, rnd, events);
        board = pc.board;
        add(pc.paid, 'base');
      }
    }
    const sc = countSym(board, 'S');
    if (sc >= 3) {
      const n = Math.min(sc, 5);
      add(C.SCATTER_PAY[n], 'base');
      spins = C.SCATTER_SPINS[n];
      st.bonusTriggered = true;
      events.push({ type: 'scatterWin', count: sc, win: C.SCATTER_PAY[n] });
    }
  }

  if (spins > 0 && !st.capped) playBonus(M, sets.bonus, rnd, events, st, add, spins);
  events.push({ type: 'finalWin', amount: st.total });
  return { events, ...st };
}

function playBonus(M, strips, rnd, events, st, add, spins) {
  events.push({ type: 'fsTrigger', spins });
  let multIdx = M.multStart || 0;
  const tape = [];
  let total = spins;
  for (let i = 1; i <= total && !st.capped; i++) {
    let board = spinBoard(strips, rnd);
    if (M.forceRewEvery && i % M.forceRewEvery === 0 && !board[4].includes('R')) {
      board[4][Math.floor(rnd() * 3)] = 'R';
    }
    events.push({ type: 'fsUpdate', current: i, total });
    events.push({ type: 'reveal', gameType: 'free', board });
    let res = evalLines(board);
    let spinWin = 0;
    if (res.total > 0) {
      events.push({ type: 'winInfo', wins: res.wins, win: res.total });
      add(res.total, 'free');
      spinWin = res.total;
      if (rnd() < C.PAUSE_CHANCE.bonus) {
        st.pauses++;
        events.push({ type: 'pauseStart' });
        const pc = pauseChain(board, res, strips, rnd, events);
        board = pc.board; res = pc.res;
        add(pc.paid, 'free');
        spinWin = round2(spinWin + pc.paid);
      }
      tape.push({ board: copyBoard(board), res, win: res.total });
      events.push({ type: 'tapeRecord', index: tape.length - 1, win: res.total });
    }
    const sc = countSym(board, 'S');
    if (sc >= 2) {
      const extra = C.RETRIGGER[Math.min(sc, 3)];
      const newTotal = Math.min(total + extra, C.MAX_FREE_SPINS);
      if (newTotal > total) { events.push({ type: 'fsRetrigger', extra: newTotal - total }); total = newTotal; }
    }
    if (board[4].includes('R') && !st.capped) {
      const mult = C.REWIND_MULTS[multIdx];
      if (tape.length) {
        st.rewinds++;
        let best = 0;
        tape.forEach((t, k) => { if (t.win > tape[best].win) best = k; });
        const rec = tape[best];
        const replay = round2(rec.win * mult);
        events.push({ type: 'rewind', recordIndex: best, board: rec.board, wins: rec.res.wins, mult, win: replay });
        add(replay, 'free');
        // Second take: one respin of non-winning reels, pays the growth x mult.
        const frozen = winningReels(rec.res.wins);
        const next = copyBoard(rec.board);
        for (let r = 0; r < 5; r++) if (!frozen.has(r)) next[r] = spinReel(strips[r], rnd);
        const nr = evalLines(next);
        const take = round2(Math.max(0, nr.total - rec.win) * mult);
        events.push({ type: 'secondTake', frozenReels: [...frozen], board: next, wins: nr.wins, mult, win: take });
        add(take, 'free');
      }
      if (multIdx < C.REWIND_MULTS.length - 1) multIdx++;
      events.push({ type: 'rewindMult', mult: C.REWIND_MULTS[multIdx] });
    }
  }
  events.push({ type: 'fsEnd', win: st.free });
}

module.exports = { mulberry32, buildReelSets, playRound, evalLines };
