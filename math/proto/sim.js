// Usage: node sim.js <mode> <rounds> [seed]  -> prints JSON stats
'use strict';
const C = require('./config');
const E = require('./engine');

const mode = process.argv[2] || 'base';
const N = +(process.argv[3] || 1e6);
const seed = +(process.argv[4] || 7);
const sets = E.buildReelSets();
const rnd = E.mulberry32(seed);
const cost = C.MODES[mode].cost;

let sum = 0, sum2 = 0, hits = 0, bonus = 0, bonusWin = 0, baseWin = 0, max = 0, capped = 0, rewinds = 0, pauses = 0;
const buckets = [0, 1, 2, 5, 10, 20, 50, 100, 500, 1000, 5000, 15000];
const hist = new Array(buckets.length).fill(0);
for (let i = 0; i < N; i++) {
  const r = E.playRound(mode, sets, rnd);
  const x = r.total / cost; // return per unit of mode cost
  sum += r.total; sum2 += x * x;
  if (r.total > 0) hits++;
  if (r.bonusTriggered) { bonus++; bonusWin += r.free; }
  baseWin += r.base;
  if (r.total > max) max = r.total;
  if (r.capped) capped++;
  rewinds += r.rewinds; pauses += r.pauses;
  let b = 0;
  while (b + 1 < buckets.length && r.total >= buckets[b + 1]) b++;
  if (r.total > 0) hist[b]++;
}
const rtp = sum / N / cost;
const sd = Math.sqrt(sum2 / N - (sum / N / cost) ** 2);
console.log(JSON.stringify({
  mode, cost, rounds: N, rtp: +rtp.toFixed(4),
  rtpBase: +(baseWin / N / cost).toFixed(4), rtpFree: +(bonusWin / N / cost).toFixed(4),
  hitRate: +(N / Math.max(hits, 1)).toFixed(2), bonusFreq: bonus ? +(N / bonus).toFixed(1) : null,
  avgBonusWin: bonus ? +(bonusWin / bonus).toFixed(2) : null,
  sd: +sd.toFixed(2), max, capped, pausesPerRound: +(pauses / N).toFixed(4), rewindsPerRound: +(rewinds / N).toFixed(3),
  hist: Object.fromEntries(buckets.map((b, i) => ['>=' + b, hist[i]])),
}));
