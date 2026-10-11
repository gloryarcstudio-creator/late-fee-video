// Late Fee Video — grey prototype. Plays Stake Math SDK book events exactly as the RGS returns them.
(function () {
  const { t, money } = I18N;
  const { P, RGS_MODE, M, api } = NET;
  const $ = id => document.getElementById(id);
  const MD = window.MATHDATA;
  const BUY_MODES = ['bonus', 'double', 'director'];
  const START_MULT = { base: 2, ante: 2, bonus: 2, double: 3, director: 5 };
  const LINE_PAYS = { P: [50, 250, 1000], H1: [40, 150, 500], H2: [30, 120, 400], H3: [24, 100, 300], M1: [20, 60, 200], M2: [14, 50, 150], M3: [14, 40, 120], L1: [10, 24, 100], L2: [10, 24, 100], L3: [10, 20, 70], L4: [10, 20, 70] };
  const TIERS = [[500, 'cultWin'], [100, 'epicWin'], [50, 'megaWin'], [20, 'bigWin']];

  const S = {
    balance: 0, bets: [], betIdx: 0, ante: false, busy: false, turbo: false, muted: false,
    auto: 0, autoCfg: null, autoStart: 0, jur: {}, inBonus: false, fsTotal: 0, mult: 2, capped: false,
    bet: 0, mode: 'base', roundHadBonus: false, skip: false, ready: false, replay: P.replay, pendingRound: null,
  };
  window.__game = { S };
  const fast = () => !!window.__fast;

  // ---------- helpers ----------
  function wait(ms) {
    if (fast()) return Promise.resolve();
    const k = S.skip ? 0.15 : S.turbo ? 0.5 : 1;
    return new Promise(r => setTimeout(r, ms * k));
  }
  function waitTap(el, ms) {
    if (fast()) return Promise.resolve();
    return new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; el.removeEventListener('pointerdown', fin); document.removeEventListener('keydown', key); res(); };
      const key = e => { if (e.code === 'Space') { e.preventDefault(); fin(); } };
      el.addEventListener('pointerdown', fin); document.addEventListener('keydown', key);
      setTimeout(fin, S.auto ? ms * 0.6 : ms);
    });
  }
  const fmt = v => money(v);
  const winMoney = amt100 => amt100 / 100 * S.bet; // book amounts are ×100 of the base bet
  function toast(msg, ms = 2200) {
    const el = $('toast'); el.textContent = msg; el.classList.remove('hide');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.add('hide'), ms);
  }
  function osd(text, ms) {
    const el = $('osd'); el.textContent = text || ''; el.classList.toggle('show', !!text);
    clearTimeout(osd._t); if (text && ms) osd._t = setTimeout(() => el.classList.remove('show'), ms * (S.turbo ? 0.5 : 1));
  }
  function popup(text) { const el = $('spinWin'); el.textContent = text; el.classList.toggle('hide', !text); }
  function del(state) { const el = $('del'); el.className = 'ph ' + state; el.querySelector('small').textContent = state; }
  function tapeCounter(amount100) {
    $('tapeVal').textContent = amount100 > 0 ? fmt(winMoney(amount100)) : '0000';
  }

  // ---------- sound (single gate; placeholder blips until AUDIO.md assets exist) ----------
  let actx = null;
  const TONES = { stop: [180, 0.05], win: [660, 0.12], big: [880, 0.4], scatter: [990, 0.2], pause: [300, 0.15], rew: [240, 0.35], rec: [1200, 0.05], click: [500, 0.03], trigger: [520, 0.5] };
  function sfx(name) {
    if (S.muted || fast() || !TONES[name]) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const [f, d] = TONES[name], o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.value = 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
      o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
    } catch (e) {}
  }

  // ---------- layout ----------
  function layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const port = vh > vw * 1.05;
    const W = port ? 720 : 1280, H = port ? 1280 : 720;
    const sc = Math.min(vw / W, vh / H);
    const st = $('stage');
    st.classList.toggle('port', port); st.classList.toggle('land', !port);
    st.style.width = W + 'px'; st.style.height = H + 'px';
    st.style.transform = `translate(${(vw - W * sc) / 2}px,${(vh - H * sc) / 2}px) scale(${sc})`;
    const cell = port ? 128 : 136;
    if (layout.cell !== cell) { layout.cell = cell; Reels.setCell(cell, 6); }
  }

  // ---------- UI state ----------
  const cost = mode => S.bet * MD[mode].cost;
  function baseMode() { return S.ante ? 'ante' : 'base'; }
  function updateUI() {
    $('balVal').textContent = S.ready ? fmt(S.balance) : '—';
    $('betVal').textContent = S.ready ? fmt(cost(baseMode())) + (S.ante ? ' (×3)' : '') : '—';
    $('anteState').textContent = t(S.ante ? 'anteOn' : 'anteOff');
    $('anteBtn').classList.toggle('on', S.ante);
    const lock = S.busy || S.auto > 0;
    ['betMinus', 'betPlus', 'buyBtn', 'anteBtn'].forEach(id => { $(id).disabled = lock || !S.ready; });
    $('betMinus').disabled ||= S.betIdx <= 0;
    $('betPlus').disabled ||= S.betIdx >= S.bets.length - 1;
    $('spinBtn').textContent = S.busy ? (Reels.spinning() && !S.jur.disabledSlamstop ? '■' : '…') : '▶';
    $('spinBtn').disabled = !S.ready || (S.busy && S.jur.disabledSlamstop);
    $('autoBtn').textContent = S.auto > 0 ? t('autoLeft', { n: S.auto === Infinity ? '∞' : S.auto }) : '⟳';
    $('autoBtn').classList.toggle('on', S.auto > 0);
    $('turboBtn').classList.toggle('on', S.turbo);
    $('soundBtn').classList.toggle('off', S.muted);
    $('soundBtn').textContent = S.muted ? '♪̸' : '♪';
    $('autoBtn').hidden = !!S.jur.disabledAutoplay;
    $('turboBtn').hidden = !!S.jur.disabledTurbo;
    $('buyBtn').hidden = !!S.jur.disabledBuyFeature;
    const st = $('stage'); st.classList.toggle('busy', S.busy); st.classList.toggle('bonus', S.inBonus);
    const aria = { betMinus: 'Decrease ' + t('bet').toLowerCase(), betPlus: 'Increase ' + t('bet').toLowerCase(), menuBtn: t('rules'), soundBtn: 'Sound', turboBtn: 'Turbo', autoBtn: t('autoplay'), spinBtn: 'Spin' };
    for (const k in aria) $(k).setAttribute('aria-label', I18N.socialize(aria[k]));
    document.querySelectorAll('[data-close]').forEach(b => b.setAttribute('aria-label', 'Close'));
  }

  // ---------- event player ----------
  const H = {
    async reveal(e) {
      Reels.clear(); Reels.unfreeze(); popup(''); osd('');
      const strip = e.gameType === 'freegame' ? 'FR0' : (S.mode === 'ante' ? 'ANTE' : 'BR0');
      const antic = (e.anticipation || []).some(a => a > 0);
      del(antic ? 'lean' : 'spin');
      if (antic) $('tracking').classList.remove('hide');
      updateUI();
      await Reels.spin(e.board, { anticipation: e.anticipation, turbo: S.turbo, fast: fast(), strip, onStop: () => sfx('stop') });
      $('tracking').classList.add('hide');
      updateUI(); del('idle');
    },
    async winInfo(e) { S.lastWins = e.wins; await showWins(e.wins); },
    async setWin(e) { popup(fmt(winMoney(e.amount))); del('cheer'); sfx('win'); await wait(250); },
    async setTotalWin(e) {
      S.roundWin = e.amount;
      $('winVal').textContent = e.amount > 0 ? fmt(winMoney(e.amount)) : '—';
      if (S.inBonus) tapeCounter(e.amount);
    },
    async scatterWin(e) {
      Reels.highlight(e.positions, 'hit-s'); Reels.dim(true); sfx('scatter');
      popup(`KEY ×${e.count}  ${fmt(winMoney(e.win))}`);
      await wait(900);
    },
    async freeSpinTrigger(e) {
      Reels.highlight(e.positions, 'hit-s'); sfx('trigger'); del('wow');
      await wait(700);
      S.inBonus = true; S.roundHadBonus = true; S.fsTotal = e.totalFs; S.mult = START_MULT[S.mode] || 2;
      $('multVal').textContent = '×' + S.mult; $('tapeLog').textContent = ''; $('fsVal').textContent = `1/${e.totalFs}`;
      ['fsBox', 'multBox', 'tapeLog'].forEach(id => $(id).classList.remove('hide'));
      tapeCounter(S.roundWin || 0);
      updateUI();
      if (S.auto && S.autoCfg && S.autoCfg.stopBonus) S.autoStopAfter = true;
      await banner(t('nightShift'), t('spinsAwarded', { n: e.totalFs }), 2600);
    },
    async updateFreeSpin(e) { S.fsTotal = e.total; $('fsVal').textContent = `${Math.min(e.amount + 1, e.total)}/${e.total}`; },
    async freeSpinRetrigger(e) {
      const n = e.totalFs - S.fsTotal; S.fsTotal = e.totalFs;
      Reels.highlight(e.positions, 'hit-s'); sfx('scatter');
      const cur = $('fsVal').textContent.split('/')[0]; $('fsVal').textContent = `${cur}/${e.totalFs}`;
      osd(t('moreSpins', { n }), 1400); await wait(1200);
    },
    async pauseStart(e) {
      osd(t('pause')); sfx('pause'); Reels.freeze(e.frozenReels); del('pause');
      await wait(650);
    },
    async pauseRespin(e) {
      Reels.clear(); Reels.freeze(e.frozenReels); osd(t('pause'));
      const spin = [0, 1, 2, 3, 4].filter(r => !e.frozenReels.includes(r));
      await Reels.spin(e.board, { spin, turbo: S.turbo, fast: fast(), strip: S.inBonus ? 'FR0' : 'BR0', onStop: () => sfx('stop') });
      if (e.wins && e.wins.length) await showWins(e.wins, true);
      if (e.win > 0) { popup('+' + fmt(winMoney(e.win))); sfx('win'); await wait(500); }
      else { osd(''); Reels.unfreeze(); await wait(200); }
    },
    async tapeRecord(e) {
      $('rec').classList.remove('hide'); sfx('rec');
      const d = document.createElement('div'); d.className = 'rec'; d.dataset.i = e.recordIndex;
      d.textContent = `#${e.recordIndex + 1}  ${fmt(winMoney(e.win))}`; $('tapeLog').appendChild(d);
      $('tapeLog').scrollTop = 1e6;
      await wait(450); $('rec').classList.add('hide');
    },
    async rewind(e) {
      Reels.clear(); Reels.unfreeze(); popup('');
      osd(t('rew')); $('tracking').classList.remove('hide'); sfx('rew'); del('rewind');
      document.querySelectorAll('#tapeLog .rec').forEach(x => x.classList.toggle('sel', +x.dataset.i === e.recordIndex));
      await wait(400);
      await Reels.spin(e.board, { reverse: true, turbo: S.turbo, fast: fast(), strip: 'FR0' });
      $('tracking').classList.add('hide');
      await showWins(e.wins, true);
      popup(`${fmt(winMoney(e.win / e.mult))} ×${e.mult} = ${fmt(winMoney(e.win))}`); sfx('big');
      await wait(1400);
    },
    async secondTake(e) {
      Reels.clear(); osd(t('secondTake')); Reels.freeze(e.frozenReels);
      await wait(500);
      const spin = [0, 1, 2, 3, 4].filter(r => !e.frozenReels.includes(r));
      await Reels.spin(e.board, { spin, turbo: S.turbo, fast: fast(), strip: 'FR0', onStop: () => sfx('stop') });
      if (e.wins && e.wins.length) await showWins(e.wins, true);
      popup(e.win > 0 ? `+${fmt(winMoney(e.win))} (×${e.mult})` : '');
      if (e.win > 0) sfx('win');
      await wait(e.win > 0 ? 1100 : 500);
      Reels.unfreeze(); osd('');
    },
    async rewindMult(e) {
      if (e.mult !== S.mult) { S.mult = e.mult; osd(t('multUp', { n: e.mult }), 1200); }
      $('multVal').textContent = '×' + e.mult;
      const b = $('multBox'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
      await wait(500);
    },
    async freeSpinEnd(e) {
      Reels.unfreeze(); osd('');
      const total = S.roundWin || e.amount;
      const tier = tierOf(winMoney(total) / tierBase());
      await banner(tier ? t(tier) : t('shiftOver'), fmt(winMoney(total)), 3500);
      S.inBonus = false;
      ['fsBox', 'multBox', 'tapeLog'].forEach(id => $(id).classList.add('hide'));
      tapeCounter(0); updateUI();
    },
    async wincap(e) {
      S.capped = true; Reels.unfreeze(); osd('');
      await banner(t('maxWin'), `${(e.amount / 100).toLocaleString('en').replace(/,/g, ' ')}× · ${fmt(winMoney(e.amount))}`, 4000);
    },
    async finalWin(e) {
      S.roundWin = e.amount;
      $('winVal').textContent = e.amount > 0 ? fmt(winMoney(e.amount)) : '—';
      if (!S.roundHadBonus && !S.capped && e.amount > 0) {
        const tier = tierOf(winMoney(e.amount) / tierBase());
        if (tier) await bigWin(winMoney(e.amount));
      }
      del(e.amount > 0 ? 'cheer' : 'bored');
    },
  };
  // Big-win tiers are measured against what the player paid: base bet in base/ante, the buy price in buy modes.
  const tierBase = () => BUY_MODES.includes(S.mode) ? cost(S.mode) : S.bet;
  function tierOf(x) { for (const [th, k] of TIERS) if (x >= th) return k; return null; }

  async function showWins(wins, quick) {
    if (!wins || !wins.length) return;
    Reels.dim(true);
    wins.forEach(w => Reels.highlight(w.positions));
    Reels.lines(wins);
    if (quick || S.turbo || S.auto || fast()) { await wait(quick ? 500 : 700); return; }
    await wait(700);
    // one line at a time (max 6), then back to all
    for (const w of wins.slice(0, 6)) {
      if (S.skip) break;
      Reels.clear(); Reels.dim(true); Reels.highlight(w.positions); Reels.lines([w]);
      popup(`${Reels.LABEL[w.symbol] || w.symbol} ×${w.kind}  ${fmt(winMoney(w.win))}`);
      await wait(420);
    }
    Reels.clear(); Reels.dim(true); wins.forEach(w => Reels.highlight(w.positions)); Reels.lines(wins);
  }

  function banner(title, sub, ms) {
    $('bannerTitle').textContent = title; $('bannerSub').textContent = sub;
    const el = $('banner'); el.classList.remove('hide');
    return waitTap(el, ms).then(() => el.classList.add('hide'));
  }

  function bigWin(amount) {
    const el = $('bigWin'); el.classList.remove('hide'); sfx('big'); del('wow');
    const dec = I18N.decimalsFor(amount, I18N.currency());
    const base = tierBase();
    if (fast()) { $('bigTitle').textContent = t(tierOf(amount / base)); $('bigAmt').textContent = money(amount, dec); el.classList.add('hide'); return Promise.resolve(); }
    return new Promise(res => {
      const dur = Math.min(6000, 1500 + Math.log10(amount / base) * 1500) * (S.turbo ? 0.5 : 1);
      const t0 = performance.now(); let skipped = false, ended = false;
      const end = () => { if (ended) return; ended = true; el.removeEventListener('pointerdown', onTap); document.removeEventListener('keydown', onKey); el.classList.add('hide'); res(); };
      const onTap = () => { if (!skipped) { skipped = true; } else end(); };
      const onKey = e => { if (e.code === 'Space') { e.preventDefault(); onTap(); } };
      el.addEventListener('pointerdown', onTap); document.addEventListener('keydown', onKey);
      (function frame(now) {
        const k = skipped ? 1 : Math.min(1, (now - t0) / dur);
        const v = amount * (1 - Math.pow(1 - k, 2));
        $('bigTitle').textContent = t(tierOf(v / base) || 'bigWin');
        $('bigAmt').textContent = money(v, dec);
        if (k < 1) requestAnimationFrame(frame);
        else setTimeout(end, S.auto ? 900 : 2200);
      })(t0);
    });
  }

  async function playRound(round) {
    S.bet = round.amount / M; S.mode = round.mode || 'base';
    S.roundWin = 0; S.capped = false; S.roundHadBonus = false; S.lastWins = null;
    $('winVal').textContent = '—';
    for (const e of round.state || []) {
      const h = H[e.type];
      if (h) await h(e); else console.warn('unhandled event', e.type);
    }
    S.inBonus = false; S.skip = false;
  }

  // ---------- round flow ----------
  async function spin(mode) {
    if (!S.ready || S.replay) return;
    if (S.busy) { slam(); return; }
    mode = mode || baseMode();
    const c = cost(mode);
    if (S.balance + 1e-9 < c) { toast(t('noFunds')); stopAuto(); return; }
    S.busy = true; S.skip = false; Reels.clear(); popup(''); sfx('click');
    const t0 = performance.now();
    const before = S.balance; S.balance -= c; updateUI();
    let res;
    try { res = await api.play(S.bet, mode); }
    catch (e) { S.balance = before; S.busy = false; netError(e); updateUI(); return; }
    S.balance = res.balance.amount / M; updateUI();
    S.lastBookId = res.round.bookId;
    await playRound(Object.assign({ mode }, res.round));
    await settle(res.round);
    const mrd = S.jur.minimumRoundDuration ? (S.jur.minimumRoundDuration > 100 ? S.jur.minimumRoundDuration : S.jur.minimumRoundDuration * 1000) : 0;
    const left = mrd - (performance.now() - t0); if (left > 0 && !fast()) await new Promise(r => setTimeout(r, left));
    S.busy = false; updateUI();
    afterRound(res.round, c);
  }

  async function settle(round) {
    if (!(round.payoutMultiplier > 0)) return;
    try { const r = await api.endRound(); if (r && r.balance) S.balance = r.balance.amount / M; }
    catch (e) { netError(e); }
    updateUI();
  }

  function slam() {
    if (S.jur.disabledSlamstop) return;
    S.skip = true; Reels.slam();
  }

  function netError(e) {
    stopAuto();
    const code = (e && e.code) || 'ERR_GEN';
    toast(code === 'ERR_IPB' ? t('noFunds') : `${t('netError')} (${code})`, 3500);
    console.warn('rgs', code, e && e.message);
  }

  // ---------- autoplay ----------
  function stopAuto() { S.auto = 0; S.autoStopAfter = false; updateUI(); }
  function afterRound(round, c) {
    if (!S.auto) return;
    const winX = round.payoutMultiplier; // × base bet
    const cfg = S.autoCfg;
    if (S.autoStopAfter) return stopAuto();
    if (cfg.stopWin && winX >= cfg.stopWin) return stopAuto();
    if (cfg.stopLoss && S.autoStart - S.balance >= cfg.stopLoss * S.bet) return stopAuto();
    if (S.auto !== Infinity) S.auto--;
    updateUI();
    if (S.auto > 0) setTimeout(() => { if (S.auto > 0 && !S.busy) spin(); }, fast() ? 0 : 250);
  }

  // ---------- dialogs ----------
  let openDlg = null;
  function dlg(id, on) {
    if (openDlg && on) dlg(openDlg, false);
    $(id).classList.toggle('hide', !on); $('dlgBack').classList.toggle('hide', !on);
    openDlg = on ? id : null;
  }
  function buildBuy() {
    const list = $('buyList'); list.textContent = '';
    BUY_MODES.forEach(m => {
      const b = document.createElement('button'); b.className = 'btn buy-item'; b.dataset.mode = m;
      b.innerHTML = `<b>${t('mode_' + m)}</b><span>${I18N.socialize(t('desc_' + m))}</span><em>${t('price')}: ${fmt(cost(m))} (${MD[m].cost}×)</em>`;
      b.addEventListener('click', () => {
        if (S.balance + 1e-9 < cost(m)) { toast(t('noFunds')); return; }
        $('buyConfirmText').textContent = t('buyFor', { name: t('mode_' + m), price: fmt(cost(m)) });
        $('buyConfirm').classList.remove('hide'); $('buyConfirm').dataset.mode = m;
      });
      list.appendChild(b);
    });
    $('buyConfirm').classList.add('hide');
  }
  function buildAuto() {
    const box = $('autoCounts'); box.textContent = '';
    [10, 25, 50, 100, 500].forEach((n, i) => {
      const b = document.createElement('button'); b.className = 'btn chip' + (i === 0 ? ' on' : ''); b.textContent = n; b.dataset.n = n;
      b.addEventListener('click', () => { box.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
      box.appendChild(b);
    });
  }

  function buildRules() {
    const rows = ['base', 'ante', ...BUY_MODES].map(m => `<tr><td>${t('mode_' + m)}</td><td>${MD[m].cost}×</td><td>${MD[m].rtp.toFixed(2)}%</td><td>${MD[m].maxWin.toLocaleString('en')}×</td></tr>`).join('');
    const pays = Object.entries(LINE_PAYS).map(([s, p]) => `<tr><td><span class="mini s-${s}">${Reels.LABEL[s]}</span></td>${p.map(v => `<td>${+(v / 20).toFixed(2)}×</td>`).join('')}</tr>`).join('');
    const lines = Reels.PAYLINES.slice(1).map((pl, i) => `<div class="pl-mini"><b>${i + 1}</b>${[0, 1, 2].map(row => `<div>${pl.map(r => `<i class="${r === row ? 'on' : ''}"></i>`).join('')}</div>`).join('')}</div>`).join('');
    const html = `
      <h2>${t('rules')}</h2>
      <p>Late Fee Video is a 5-reel, 3-row video slot with 20 fixed paylines. Wins pay left to right from the leftmost reel, 3 to 5 symbols in a row. Only the highest win per line is paid; wins on different lines are added. Line wins are shown as multiples of the total bet.</p>
      <h3>Return to player and max win</h3>
      <table class="t"><tr><th>Mode</th><th>Cost</th><th>RTP</th><th>Max win</th></tr>${rows}</table>
      <p>The maximum win is ${MD.base.maxWin.toLocaleString('en')}× the base bet in every mode. When it is reached the round ends immediately and the max win is paid.</p>
      <h3>Modes</h3>
      <table class="t"><tr><th>Mode</th><th>Cost</th><th>What it does</th></tr>
        <tr><td>${t('mode_ante')}</td><td>${MD.ante.cost}× bet</td><td>${t('desc_ante')}</td></tr>
        ${BUY_MODES.map(m => `<tr><td>${t('mode_' + m)}</td><td>${MD[m].cost}× bet</td><td>Buys the Night Shift feature instantly. ${t('desc_' + m)}</td></tr>`).join('')}
      </table>
      <h3>Paytable (× total bet)</h3>
      <table class="t pay"><tr><th></th><th>3</th><th>4</th><th>5</th></tr>${pays}</table>
      <p><span class="mini s-W">★</span> WILD appears on reels 2, 3 and 4 and substitutes for all symbols except KEY and REW.</p>
      <p><span class="mini s-S">KEY</span> KEY (scatter) pays anywhere: 3 = 2×, 4 = 10×, 5 = 50× the total bet, and starts Night Shift with 10, 12 or 15 free spins. During free spins 2 KEY add 3 spins and 3 or more add 5 spins, up to 50 free spins per feature.</p>
      <p><span class="mini s-R">◀◀ REW</span> REW appears on reel 5 during free spins only.</p>
      <h3>Paylines</h3><div class="pl-grid">${lines}</div>
      <h3>Features</h3>
      <p><b>PAUSE.</b> After a winning spin, PAUSE may start: reels with winning symbols freeze and the others respin for free. Each respin that improves the win pays the difference and the chain continues; a respin without improvement ends it.</p>
      <p><b>Tape.</b> Every winning free spin is recorded on the tape with its board and line win.</p>
      <p><b>REWIND.</b> When REW lands, the reels rewind to the best recorded spin and its line win is paid again times the rewind multiplier. Then the SECOND TAKE starts: the winning reels of that spin stay paused, the other reels respin once, and any extra line win is also multiplied. After each rewind the multiplier steps up: ×2, ×3, ×5, ×10 (it stays at ×10). If nothing is recorded yet, REW only raises the multiplier.</p>
      <h3>Buttons</h3>
      <ul>
        <li><b>▶ Spin</b> starts a round. During a spin it shows ■ and stops the reels quickly. The space bar also spins.</li>
        <li><b>− / +</b> change the bet.</li>
        <li><b>${t('ante')}</b> switches the ${MD.ante.cost}× ante bet on or off.</li>
        <li><b>${t('catalog')}</b> opens the feature buy menu. Every buy asks for confirmation with its price.</li>
        <li><b>⟳ Autoplay</b> opens autoplay settings; press it again to stop.</li>
        <li><b>» Turbo</b> plays rounds faster.</li>
        <li><b>♪ Sound</b> turns all sound on or off.</li>
        <li><b>☰ Menu</b> opens these rules. <b>✕</b> closes any window.</li>
      </ul>
      <p class="disc">Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine.</p>`;
    $('rulesBody').innerHTML = I18N.socialize(html);
  }

  // ---------- error / replay ----------
  function fatal(msg) {
    $('errText').textContent = msg; $('errScreen').classList.remove('hide');
    $('splash').classList.add('hide');
  }

  async function startReplay() {
    $('stage').classList.add('replay');
    const card = $('replayCard');
    let j;
    try { j = await api.replay(); }
    catch (e) {
      card.innerHTML = `<div class="osd-big">TRACKING ERROR</div><p>${t('errReplay')}</p>`;
      card.classList.remove('hide'); $('splash').classList.add('hide'); return;
    }
    const raw = Number(P.amount || 1);
    S.bet = raw >= 1000 ? raw / M : raw; // amount may arrive in RGS micro-units
    S.ready = true; S.mode = P.mode || 'base';
    const show = again => {
      card.innerHTML = `<div class="osd-big">${t('replay')}</div><table class="t">
        <tr><td>${t('mode')}</td><td>${t('mode_' + S.mode) !== 'mode_' + S.mode ? t('mode_' + S.mode) : S.mode}</td></tr>
        <tr><td>${t('baseBet')}</td><td>${fmt(S.bet)}</td></tr>
        <tr><td>${t('costMult')}</td><td>${j.costMultiplier}×</td></tr>
        <tr><td>${t('totalCost')}</td><td>${fmt(S.bet * j.costMultiplier)}</td></tr>
        <tr><td>${t('finalMult')}</td><td>${j.payoutMultiplier}×</td></tr>
        <tr><td>${t('totalWin')}</td><td>${fmt(S.bet * j.payoutMultiplier)}</td></tr></table>
        <button class="btn" id="replayGo">${again ? t('replayAgain') : t('start')}</button>`;
      card.classList.remove('hide');
      $('replayGo').onclick = async () => {
        card.classList.add('hide'); S.busy = true;
        await playRound({ amount: S.bet * M, mode: S.mode, state: j.state });
        S.busy = false; show(true);
      };
    };
    $('splashBtn').disabled = false; $('splashBtn').textContent = t('play');
    $('splashBtn').onclick = () => { $('splash').classList.add('hide'); show(false); };
  }

  // ---------- boot ----------
  async function boot() {
    I18N.setLang(P.lang); I18N.setCurrency(P.currency || 'USD');
    I18N.setSocial(P.social || I18N.isSocialCurrency(P.currency));
    I18N.apply(); buildAuto();
    Reels.init($('reels'), $('lines'));
    layout(); window.addEventListener('resize', layout);
    $('splashBtn').textContent = RGS_MODE ? t('connecting') : t('loading');
    // splash counter as a tape counter
    let n = 0; const ctr = setInterval(() => { n = Math.min(9999, n + 137); $('loadCounter').textContent = String(n).padStart(4, '0'); }, 40);
    if (S.replay) { clearInterval(ctr); return startReplay(); }
    let auth;
    try { auth = await api.authenticate(); }
    catch (e) { clearInterval(ctr); return fatal(`${t('errAuth')} (${e.code || 'ERR_GEN'})`); }
    clearInterval(ctr); $('loadCounter').textContent = '0000';
    const cfg = auth.config || {};
    S.jur = cfg.jurisdiction || {};
    if (S.jur.socialCasino) I18N.setSocial(true);
    I18N.setCurrency(auth.balance.currency || P.currency || 'USD');
    I18N.apply();
    S.balance = auth.balance.amount / M;
    S.bets = (cfg.betLevels || []).map(v => v / M);
    if (!S.bets.length) return fatal(t('errAuth') + ' (betLevels)');
    S.betIdx = Math.max(0, S.bets.indexOf((cfg.defaultBetLevel || S.bets[0] * M) / M));
    if (auth.round && auth.round.active) {
      const amt = auth.round.amount / M;
      if (!S.bets.includes(amt)) { S.bets.push(amt); S.bets.sort((a, b) => a - b); }
      S.betIdx = S.bets.indexOf(amt);
      if (auth.round.mode === 'ante') S.ante = true;
      S.pendingRound = auth.round;
    }
    S.bet = S.bets[S.betIdx];
    S.ready = true; buildRules(); updateUI();
    if (P.dev && !RGS_MODE) devPanel();
    $('splashBtn').disabled = false; $('splashBtn').textContent = t('play');
    $('splashBtn').onclick = async () => {
      $('splash').classList.add('hide');
      if (S.pendingRound) {
        const r = S.pendingRound; S.pendingRound = null;
        S.busy = true; updateUI(); toast(t('roundRestored'));
        if (r.state && r.state.length) await playRound(r);
        try { const e = await api.endRound(); if (e && e.balance) S.balance = e.balance.amount / M; } catch (e) { netError(e); }
        S.busy = false; S.bet = S.bets[S.betIdx]; updateUI();
      }
    };
  }

  // ---------- input ----------
  function click(id, fn) {
    $(id).addEventListener('click', ev => { if (ev.detail > 0) $(id).blur(); fn(ev); });
  }
  click('spinBtn', () => { if (S.auto > 0 && !S.busy) return stopAuto(); spin(); });
  click('betMinus', () => { if (S.betIdx > 0) { S.betIdx--; S.bet = S.bets[S.betIdx]; sfx('click'); updateUI(); buildRules(); } });
  click('betPlus', () => { if (S.betIdx < S.bets.length - 1) { S.betIdx++; S.bet = S.bets[S.betIdx]; sfx('click'); updateUI(); buildRules(); } });
  click('anteBtn', () => { S.ante = !S.ante; sfx('click'); updateUI(); });
  click('turboBtn', () => { S.turbo = !S.turbo; updateUI(); });
  click('soundBtn', () => { S.muted = !S.muted; updateUI(); });
  click('menuBtn', () => { buildRules(); dlg('rulesDlg', true); });
  click('buyBtn', () => { if (S.busy) return; buildBuy(); dlg('buyDlg', true); });
  click('autoBtn', () => { if (S.auto > 0) return stopAuto(); if (!S.busy) dlg('autoDlg', true); });
  click('buyYes', () => { const m = $('buyConfirm').dataset.mode; dlg('buyDlg', false); spin(m); });
  click('buyNo', () => $('buyConfirm').classList.add('hide'));
  click('autoStart', () => {
    const on = $('autoCounts').querySelector('.chip.on');
    S.autoCfg = { stopBonus: $('autoStopBonus').checked, stopWin: +$('autoStopWin').value, stopLoss: +$('autoStopLoss').value };
    S.auto = on ? +on.dataset.n : 10; S.autoStart = S.balance; S.autoStopAfter = false;
    dlg('autoDlg', false); spin();
  });
  click('errBtn', () => location.reload());
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ev => { if (ev.detail > 0) b.blur(); dlg(openDlg, false); }));
  $('dlgBack').addEventListener('click', () => dlg(openDlg, false));
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (openDlg || S.jur.disabledSpacebar || S.replay) return;
    if (!$('splash').classList.contains('hide') || !$('errScreen').classList.contains('hide')) return;
    if (!$('bigWin').classList.contains('hide') || !$('banner').classList.contains('hide')) return; // overlays take Space themselves
    if (e.repeat && !S.busy) return;
    spin();
  });

  // ---------- dev panel (local demo with ?dev=1 only; never in RGS mode) ----------
  function devPanel() {
    const el = $('devPanel'); el.classList.remove('hide');
    const tags = ['bonus', 'pause', 'rewind', 'anticipation', 'big', 'epic', 'cap', 'zero'];
    el.innerHTML = '<b>DEV</b> ' + tags.map(tg => `<button data-tag="${tg}">${tg}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', ev => { if (ev.detail > 0) b.blur(); NET.local.force = b.dataset.tag; toast('next: ' + b.dataset.tag, 900); }));
  }
  Object.assign(window.__game, { spin, playRound, bigWin, banner, layout, force: tag => { NET.local.force = tag; }, H, updateUI, stopAuto });

  boot();
})();
