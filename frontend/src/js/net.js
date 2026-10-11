// Transport: Stake RGS (when session params are present) or the local demo built from real books.
(function () {
  const q = new URLSearchParams(location.search);
  const P = {
    sessionID: q.get('sessionID'), rgs: q.get('rgs_url'), lang: q.get('lang') || 'en', currency: q.get('currency'),
    device: q.get('device'), social: q.get('social') === 'true', demo: q.get('demo') === 'true',
    replay: q.get('replay') === 'true', game: q.get('game'), version: q.get('version'), mode: q.get('mode'),
    event: q.get('event'), amount: q.get('amount'), dev: q.get('dev') === '1' || location.hash === '#dev',
  };
  if (P.rgs && !/^https?:\/\//i.test(P.rgs)) P.rgs = 'https://' + P.rgs;
  if (P.rgs) P.rgs = P.rgs.replace(/\/+$/, '');
  const RGS_MODE = !!(P.sessionID || P.rgs);
  const M = 1e6; // RGS money unit

  class RgsError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }

  async function post(path, body) {
    let r;
    try {
      r = await fetch(P.rgs + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) { throw new RgsError('ERR_NET', e.message); }
    let j = null;
    try { j = await r.json(); } catch (e) { throw new RgsError('ERR_GEN', 'non-JSON response'); }
    if (!r.ok || (j && j.error)) throw new RgsError((j && (j.error || j.code)) || 'ERR_GEN', j && j.message);
    return j;
  }

  const rgs = {
    async authenticate() {
      if (!P.sessionID || !P.rgs) throw new RgsError('ERR_VAL', 'missing session');
      const j = await post('/wallet/authenticate', { sessionID: P.sessionID, language: P.lang });
      if (!j || !j.balance || typeof j.balance.amount !== 'number') throw new RgsError('ERR_GEN', 'no balance');
      return j;
    },
    async play(amount, mode) {
      const j = await post('/wallet/play', { sessionID: P.sessionID, amount: Math.round(amount * M), mode });
      if (!j || !j.round) throw new RgsError('ERR_GEN', 'no round');
      return j;
    },
    async endRound() { return post('/wallet/end-round', { sessionID: P.sessionID }); },
    async replay() {
      let r;
      try { r = await fetch(`${P.rgs}/bet/replay/${P.game}/${P.version}/${P.mode}/${P.event}`); }
      catch (e) { throw new RgsError('ERR_NET', e.message); }
      if (!r.ok) throw new RgsError('ERR_VAL', 'replay ' + r.status);
      const j = await r.json();
      if (!j || !Array.isArray(j.state) || !j.state.length) throw new RgsError('ERR_VAL', 'empty replay');
      return j;
    },
  };

  // Local demo: weighted sample of real books (tools/sample_books.py). Development only.
  const cache = {};
  async function books(mode) {
    if (!cache[mode]) {
      const r = await fetch(`demo/books_${mode}.json`);
      cache[mode] = await r.json();
    }
    return cache[mode];
  }
  const local = {
    balance: 1000, force: null,
    async authenticate() {
      return {
        balance: { amount: this.balance * M, currency: P.currency || 'USD' },
        config: { betLevels: [0.1, 0.2, 0.4, 0.6, 0.8, 1, 2, 4, 6, 8, 10, 20, 50, 100].map(v => v * M), defaultBetLevel: 1 * M,
          jurisdiction: { socialCasino: false } },
      };
    },
    async play(amount, mode) {
      const cost = amount * window.MATHDATA[mode].cost;
      if (cost > this.balance + 1e-9) throw new RgsError('ERR_IPB');
      const rows = await books(mode);
      let pool = rows.filter(b => b.drawn);
      if (this.force != null) {
        const f = this.force; this.force = null;
        const tagged = typeof f === 'number' ? rows.filter(b => b.id === f) : rows.filter(b => b.tags.includes(f));
        if (tagged.length) pool = tagged;
      }
      const bk = pool[Math.floor(Math.random() * pool.length)];
      this.balance -= cost;
      const pm = bk.payoutMultiplier / 100;
      this.pending = pm * amount;
      return { balance: { amount: Math.round(this.balance * M), currency: P.currency || 'USD' },
        round: { amount: amount * M, mode, payoutMultiplier: pm, payout: pm * amount * M, active: pm > 0, state: bk.events, bookId: bk.id } };
    },
    async endRound() {
      this.balance += this.pending || 0; this.pending = 0;
      return { balance: { amount: Math.round(this.balance * M), currency: P.currency || 'USD' } };
    },
  };

  window.NET = { P, RGS_MODE, M, RgsError, api: RGS_MODE || P.replay ? rgs : local, local };
})();
