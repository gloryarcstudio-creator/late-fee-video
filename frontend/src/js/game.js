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
    balance: 0, bets: [], betIdx: 0, ante: false, busy: false, turbo: false, muted: AUDIO.isMuted(),
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
      const key = e => { if (e.code === 'Space') { e.preventDefault(); if (!S.jur.disabledSpacebar) fin(); } };
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
  // Del: pose state machine in del.js; block events ride along with the pose requests
  const DEL_EVENT = { spin: 'spin', idle: 'stop', lean: 'antic', cheer: 'win', wow: 'bigwin', bored: 'stop' };
  function del(state) { DEL.set(state); if (DEL_EVENT[state]) DEL.event(DEL_EVENT[state]); }

  // win particles (tickets, popcorn, tape curls, sparkles)
  const FX = ['ticket', 'popcorn', 'tape', 'sparkle'].flatMap(k => [1, 2, 3, 4].map(i => `assets/fx/${k}_${i}.webp`));
  function particles(n = 28) {
    if (fast()) return;
    const box = $('bigWin').classList.contains('hide') ? $('fx') : $('bigFx'); const W = $('stage').offsetWidth;
    box.style.setProperty('--fall', $('stage').offsetHeight + 160 + 'px');
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div'); p.className = 'p';
      p.style.backgroundImage = `url(${FX[Math.floor(Math.random() * FX.length)]})`;
      p.style.left = Math.random() * W + 'px'; p.style.setProperty('--d', (1.6 + Math.random() * 1.4) + 's');
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.animationDelay = (Math.random() * 0.8) + 's';
      p.addEventListener('animationend', () => p.remove()); box.appendChild(p);
    }
  }
  // H.264 everywhere Stake runs; the VP9 copy covers builds without it (open-source Chromium)
  function vidSrc(base) { const v = document.createElement('video'); return base + (v.canPlayType('video/mp4; codecs="avc1.42E01E"') ? '.mp4' : '.webm'); }
  function playVideo(v) { try { v.muted = true; v.currentTime = 0; const r = v.play(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  function tapeCounter(amount100) {
    $('tapeVal').textContent = amount100 > 0 ? fmt(winMoney(amount100)) : '0000';
  }

  // ---------- sound (AUDIO.js: one gate, scene music, stingers; legacy cue names kept for the event player) ----------
  const CUE = { stop: 'reel_stop', win: 'win_s', big: 'bw_tier', scatter: 'win_m', rew: 'rewind', rec: 'rec_beep', click: 'ui_click' };
  function sfx(name) { AUDIO.sfx(CUE[name] || name); }
  const SCENE_MUSIC = () => S.inBonus ? 'mus_bonus' : 'mus_base';
  function stopReel(board, strip) {
    return r => { const col = (board[r] || []).map(x => (typeof x === 'string' ? x : x.name)); AUDIO.sfx(col[1] === 'S' || col[2] === 'S' || col[3] === 'S' ? 'reel_stop_s' : 'reel_stop'); };
  }
  const AUDIO_CORE = ['ui_click', 'ui_toggle', 'ui_open', 'splash_play', 'spin_start', 'reel_loop', 'reel_stop', 'reel_stop_s', 'win_s', 'win_m', 'line_tick', 'nofunds', 'mus_base'];

  // ---------- layout ----------
  function layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const port = vh > vw * 1.05;
    // the long side of the design canvas stretches from 1280 up to 1560 to follow the screen; the rest is letterbox filled by #bg
    const long = Math.round(Math.min(1560, Math.max(1280, port ? 720 * vh / vw : 720 * vw / vh))), e = long - 1280;
    const W = port ? 720 : long, H = port ? long : 720;
    const sc = Math.min(vw / W, vh / H);
    const st = $('stage');
    st.classList.toggle('port', port); st.classList.toggle('land', !port); st.classList.toggle('lite', Math.max(vw, vh) <= 960);
    st.style.width = W + 'px'; st.style.height = H + 'px';
    const ox = (vw - W * sc) / 2, oy = (vh - H * sc) / 2;
    st.style.transform = `translate(${ox}px,${oy}px) scale(${sc})`;
    st.style.setProperty('--e', e + 'px'); st.style.setProperty('--lx', Math.ceil(ox / sc) + 1 + 'px'); st.style.setProperty('--ly', Math.ceil(oy / sc) + 1 + 'px');
    // CRT frame geometry: screen hole fractions measured on assets/scene/tv_frame.webp (1432×1158)
    const HX0 = 0.0915, HW = 0.8156, HY0 = 0.0984, HH = 0.7029, AR = 1158 / 1432, gap = 6;
    const cell = port ? 112 : 120, pad = port ? 14.5 : 30;
    const reelsW = cell * 5 + gap * 4, reelsH = cell * 3, holeW = reelsW + 2 * pad;
    const tvW = holeW / HW, tvH = tvW * AR, holeH = tvH * HH, holeTop = (holeH - reelsH) / 2;
    const tvLeft = port ? -16 : 221 + e / 2, tvTop = port ? 265 + e * 0.6 : 24;
    const tv = $('tv');
    tv.style.left = (tvLeft + HX0 * tvW + pad) + 'px'; tv.style.top = (tvTop + HY0 * tvH + holeTop) + 'px';
    const v = { '--cell': cell + 'px', '--gap': gap + 'px', '--pad': pad + 'px', '--holeTop': holeTop + 'px', '--tvw': tvW + 'px', '--tvh': tvH + 'px',
      '--fx': -(pad + HX0 * tvW) + 'px', '--fy': -(holeTop + HY0 * tvH) + 'px' };
    for (const k in v) st.style.setProperty(k, v[k]);
    if (layout.cell !== cell) { layout.cell = cell; Reels.setCell(cell, gap); }
  }

  // ---------- UI state ----------
  const cost = mode => S.bet * MD[mode].cost;
  function baseMode() { return S.ante ? 'ante' : 'base'; }
  function updateUI() {
    $('balVal').textContent = S.ready ? fmt(S.balance) : '—';
    $('betVal').textContent = S.ready ? fmt(cost(baseMode())) + (S.ante ? ' (×3)' : '') : '—';
    $('anteState').textContent = t(S.ante ? 'anteOn' : 'anteOff');
    $('anteBtn').classList.toggle('on', S.ante); $('anteTag').classList.toggle('hide', !S.ante);
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
    const aria = { betMinus: t('a_betMinus'), betPlus: t('a_betPlus'), menuBtn: t('rules'), soundBtn: t('a_sound'), turboBtn: t('a_turbo'), autoBtn: t('autoplay'), spinBtn: t('a_spin') };
    for (const k in aria) $(k).setAttribute('aria-label', I18N.socialize(aria[k]));
    document.querySelectorAll('[data-close]').forEach(b => b.setAttribute('aria-label', t('a_close')));
  }

  // ---------- event player ----------
  const H = {
    async reveal(e) {
      Reels.clear(); Reels.unfreeze(); popup(''); osd('');
      const strip = e.gameType === 'freegame' ? 'FR0' : (S.mode === 'ante' ? 'ANTE' : 'BR0');
      const antic = (e.anticipation || []).some(a => a > 0);
      del(antic ? 'lean' : 'spin');
      if (antic) $('tracking').classList.remove('hide');
      updateUI(); AUDIO.loop('reel_loop');
      const stopR = stopReel(e.board), anticAt = (e.anticipation || []).findIndex(a => a > 0);
      await Reels.spin(e.board, { anticipation: e.anticipation, turbo: S.turbo, fast: fast(), strip, onStop: r => { stopR(r); if (anticAt > 0 && r === anticAt - 1) { AUDIO.stop('reel_loop'); AUDIO.loop('antic_loop'); } } });
      AUDIO.stop('reel_loop'); AUDIO.stop('antic_loop', 0.3);
      $('tracking').classList.add('hide');
      updateUI(); del('idle');
    },
    async winInfo(e) { S.lastWins = e.wins; await showWins(e.wins); },
    async setWin(e) { popup(fmt(winMoney(e.amount))); del('cheer'); AUDIO.sfx(e.amount >= 500 ? 'win_m' : 'win_s'); await wait(250); },
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
      AUDIO.setMusic(null); AUDIO.stinger('stg_bonus_intro');
      await banner(t('nightShift'), t('spinsAwarded', { n: e.totalFs }), 3000, { video: vidSrc('assets/overlay/ov_bonus_intro') });
      AUDIO.setMusic('mus_bonus'); DEL.event('bonus');
    },
    async updateFreeSpin(e) { S.fsTotal = e.total; $('fsVal').textContent = `${Math.min(e.amount + 1, e.total)}/${e.total}`; },
    async freeSpinRetrigger(e) {
      const n = e.totalFs - S.fsTotal; S.fsTotal = e.totalFs;
      Reels.highlight(e.positions, 'hit-s'); sfx('retrigger');
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
      AUDIO.loop('reel_loop');
      await Reels.spin(e.board, { spin, turbo: S.turbo, fast: fast(), strip: S.inBonus ? 'FR0' : 'BR0', onStop: stopReel(e.board) });
      AUDIO.stop('reel_loop');
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
      popup(`${fmt(winMoney(e.win / e.mult))} ×${e.mult} = ${fmt(winMoney(e.win))}`); sfx('win_m');
      await wait(1400);
    },
    async secondTake(e) {
      Reels.clear(); osd(t('secondTake')); sfx('second_take'); Reels.freeze(e.frozenReels);
      await wait(500);
      const spin = [0, 1, 2, 3, 4].filter(r => !e.frozenReels.includes(r));
      AUDIO.loop('reel_loop');
      await Reels.spin(e.board, { spin, turbo: S.turbo, fast: fast(), strip: 'FR0', onStop: stopReel(e.board) });
      AUDIO.stop('reel_loop');
      if (e.wins && e.wins.length) await showWins(e.wins, true);
      popup(e.win > 0 ? `+${fmt(winMoney(e.win))} (×${e.mult})` : '');
      if (e.win > 0) sfx('win');
      await wait(e.win > 0 ? 1100 : 500);
      Reels.unfreeze(); osd('');
    },
    async rewindMult(e) {
      if (e.mult !== S.mult) { S.mult = e.mult; osd(t('multUp', { n: e.mult }), 1200); sfx('rew_mult'); }
      $('multVal').textContent = '×' + e.mult;
      const b = $('multBox'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
      await wait(500);
    },
    async freeSpinEnd(e) {
      Reels.unfreeze(); osd('');
      const total = S.roundWin || e.amount;
      const tier = tierOf(winMoney(total) / tierBase());
      AUDIO.setMusic(null); AUDIO.stinger('stg_shift_over');
      await banner(tier ? t(tier) : t('shiftOver'), fmt(winMoney(total)), 3500);
      S.inBonus = false; AUDIO.setMusic('mus_base'); DEL.event('base');
      ['fsBox', 'multBox', 'tapeLog'].forEach(id => $(id).classList.add('hide'));
      tapeCounter(0); updateUI();
    },
    async wincap(e) {
      S.capped = true; Reels.unfreeze(); osd(''); AUDIO.setMusic(null); AUDIO.stinger('stg_maxwin');
      particles(40); await banner(t('maxWin'), `${(e.amount / 100).toLocaleString('en').replace(/,/g, ' ')}× · ${fmt(winMoney(e.amount))}`, 4000, { img: 'assets/overlay/ov_maxwin.webp' });
      AUDIO.setMusic(SCENE_MUSIC());
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
      Reels.clear(); Reels.dim(true); Reels.highlight(w.positions); Reels.lines([w]); sfx('line_tick');
      popup(`${Reels.LABEL[w.symbol] || w.symbol} ×${w.kind}  ${fmt(winMoney(w.win))}`);
      await wait(420);
    }
    Reels.clear(); Reels.dim(true); wins.forEach(w => Reels.highlight(w.positions)); Reels.lines(wins);
  }

  function banner(title, sub, ms, media) {
    $('bannerTitle').textContent = title; $('bannerSub').textContent = sub;
    const el = $('banner'), v = $('bannerVideo'), im = $('bannerImg');
    v.classList.toggle('hide', !(media && media.video)); im.classList.toggle('hide', !(media && media.img));
    if (media && media.video) { if (v.getAttribute('src') !== media.video) v.src = media.video; playVideo(v); }
    if (media && media.img) im.src = media.img;
    el.classList.remove('hide');
    return waitTap(el, ms).then(() => { el.classList.add('hide'); try { v.pause(); } catch (e) {} });
  }

  function bigWin(amount) {
    const el = $('bigWin'); el.classList.remove('hide'); AUDIO.stinger('bw_tier'); AUDIO.setMusic('mus_bigwin'); del('wow'); playVideo($('bigVideo')); particles();
    $('bigBadge').className = tierOf(amount / tierBase()) || 'bigWin';
    const dec = I18N.decimalsFor(amount, I18N.currency());
    const base = tierBase();
    if (fast()) { $('bigTitle').textContent = t(tierOf(amount / base)); $('bigAmt').textContent = money(amount, dec); el.classList.add('hide'); AUDIO.setMusic(SCENE_MUSIC()); return Promise.resolve(); }
    AUDIO.loop('count_loop'); let lastTier = null;
    return new Promise(res => {
      const dur = Math.min(6000, 1500 + Math.log10(amount / base) * 1500) * (S.turbo ? 0.5 : 1);
      const t0 = performance.now(); let skipped = false, ended = false;
      const end = () => { if (ended) return; ended = true; el.removeEventListener('pointerdown', onTap); document.removeEventListener('keydown', onKey); el.classList.add('hide'); try { $('bigVideo').pause(); } catch (e) {} AUDIO.setMusic(SCENE_MUSIC()); DEL.event('calm'); res(); };
      const onTap = () => { if (!skipped) { skipped = true; } else end(); };
      const onKey = e => { if (e.code === 'Space') { e.preventDefault(); if (!S.jur.disabledSpacebar) onTap(); } };
      el.addEventListener('pointerdown', onTap); document.addEventListener('keydown', onKey);
      (function frame(now) {
        const k = skipped ? 1 : Math.min(1, (now - t0) / dur);
        const v = amount * (1 - Math.pow(1 - k, 2));
        const tier = tierOf(v / base) || 'bigWin';
        if (lastTier && tier !== lastTier) AUDIO.sfx('bw_tier');
        lastTier = tier;
        $('bigTitle').textContent = t(tier); $('bigBadge').className = tier;
        $('bigAmt').textContent = money(v, dec);
        if (k < 1) requestAnimationFrame(frame);
        else { AUDIO.stop('count_loop'); AUDIO.sfx('bw_end'); setTimeout(end, S.auto ? 900 : 2200); }
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
    if (S.balance + 1e-9 < c) { toast(t('noFunds')); sfx('nofunds'); stopAuto(); return; }
    S.busy = true; S.skip = false; Reels.clear(); popup(''); sfx('spin_start');
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
    toast(code === 'ERR_IPB' ? t('noFunds') : `${t('netError')} (${code})`, 3500); sfx(code === 'ERR_IPB' ? 'nofunds' : 'error'); AUDIO.stopLoops();
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
      const cover = { bonus: 'buy_night', double: 'buy_double', director: 'buy_director' }[m];
      b.innerHTML = `<img src="assets/ui/${cover}.webp" alt=""><div><b>${t('mode_' + m)}</b><span>${I18N.socialize(t('desc_' + m))}</span><em>${t('price')}: ${fmt(cost(m))} (${MD[m].cost}×)</em></div>`;
      b.addEventListener('click', () => {
        if (S.balance + 1e-9 < cost(m)) { toast(t('noFunds')); sfx('nofunds'); return; }
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
    const T = k => I18N.socialize(t(k)), J = S.jur || {}, x = v => v.toLocaleString(I18N.lang() === 'ar' ? 'ar-u-nu-latn' : I18N.lang()) + '×';
    const modes = ['base', 'ante', ...(J.disabledBuyFeature ? [] : BUY_MODES)];
    const rows = modes.map(m => `<tr><td>${t('mode_' + m)}</td><td>${x(MD[m].cost)}</td><td>${MD[m].rtp.toFixed(2)}%</td><td>${x(MD[m].maxWin)}</td></tr>`).join('');
    const pays = Object.entries(LINE_PAYS).map(([s, p]) => `<tr><td><span class="mini s-${s}">${Reels.LABEL[s]}</span></td>${p.map(v => `<td>${+(v / 20).toFixed(2)}×</td>`).join('')}</tr>`).join('');
    const lines = Reels.PAYLINES.slice(1).map((pl, i) => `<div class="pl-mini"><b>${i + 1}</b>${[0, 1, 2].map(row => `<div>${pl.map(r => `<i class="${r === row ? 'on' : ''}"></i>`).join('')}</div>`).join('')}</div>`).join('');
    const btn = [['▶', 'b_spin'], ['−&nbsp;/&nbsp;+', 'b_bet'], [t('ante'), 'b_ante'], J.disabledBuyFeature ? null : [t('catalog'), 'b_catalog'],
      J.disabledAutoplay ? null : ['⟳', 'b_auto'], J.disabledTurbo ? null : ['»', 'b_turbo'], ['♪', 'b_sound'], ['☰', 'b_menu'], ['✕', 'b_close']]
      .filter(Boolean).map(([k, v]) => `<li><b>${k}</b> ${T(v).replace('{n}', MD.ante.cost)}</li>`).join('');
    const disc = I18N.lang() !== 'en' && t('r_disc') !== 'r_disc' ? `<p>${t('r_disc')}</p>` : '';
    const html = `
      <h2>${t('rules')}</h2>
      <p>${T('r_intro')}</p>
      <h3>${T('r_rtpH')}</h3>
      <table class="t"><tr><th>${t('th_mode')}</th><th>${T('th_cost')}</th><th>${t('th_rtp')}</th><th>${t('th_max')}</th></tr>${rows}</table>
      <p>${T('r_rtpNote')} ${T('r_maxNote').replace('{max}', MD.base.maxWin.toLocaleString('en'))}</p>
      <h3>${t('r_modesH')}</h3>
      <table class="t"><tr><th>${t('th_mode')}</th><th>${T('th_cost')}</th><th>${t('th_what')}</th></tr>
        <tr><td>${t('mode_ante')}</td><td>${x(MD.ante.cost)}</td><td>${T('desc_ante')}</td></tr>
        ${(J.disabledBuyFeature ? [] : BUY_MODES).map(m => `<tr><td>${t('mode_' + m)}</td><td>${x(MD[m].cost)}</td><td>${T('r_buyPrefix')} ${T('desc_' + m)}</td></tr>`).join('')}
      </table>
      <h3>${T('r_payH')}</h3>
      <table class="t pay"><tr><th></th><th>3</th><th>4</th><th>5</th></tr>${pays}</table>
      <p>${T('r_payNote')}</p>
      <p><span class="mini s-W">★</span> ${T('r_wild')}</p>
      <p><span class="mini s-S">KEY</span> ${T('r_key')}</p>
      <p><span class="mini s-R">◀◀ REW</span> ${T('r_rew')}</p>
      <h3>${t('r_linesH')}</h3><div class="pl-grid">${lines}</div>
      <h3>${t('r_featH')}</h3>
      <p><b>PAUSE.</b> ${T('r_pause')}</p>
      <p><b>TAPE.</b> ${T('r_tape')}</p>
      <p><b>REWIND / SECOND TAKE.</b> ${T('r_rewind')}</p>
      <h3>${t('r_btnH')}</h3>
      <ul>${btn}</ul>
      <p>${J.disabledSpacebar ? '' : T('b_space') + ' '}${T('b_skip')}</p>
      <h3>${t('r_discH')}</h3>
      ${disc}<p class="disc" lang="en" dir="ltr">${I18N.DISCLAIMER}</p>`;
    const body = $('rulesBody'); body.innerHTML = html;
    body.setAttribute('lang', I18N.lang()); body.setAttribute('dir', I18N.lang() === 'ar' ? 'rtl' : 'ltr');
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
      card.innerHTML = `<div class="osd-big">${t('errTitle')}</div><p>${t('errReplay')}</p>`;
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
    $('splashBtn').onclick = () => { $('splash').classList.add('hide'); lateArt(); AUDIO.unlock(); AUDIO.sfx('splash_play'); show(false); };
  }

  // ---------- boot ----------
  const PORT0 = window.innerHeight > window.innerWidth * 1.05;
  // phone strips (288×566 frames) on phones and wherever Del renders at 460 device px or less; 384×754 frames otherwise
  const SC0 = PORT0 ? Math.min(innerWidth / 720, innerHeight / 1280) : Math.min(innerWidth / 1280, innerHeight / 720);
  const DEL_M = Math.max(innerWidth, innerHeight) <= 960 || (PORT0 ? 430 : 520) * SC0 * (devicePixelRatio || 1) <= 460;
  const ART = ['L1', 'L2', 'L3', 'L4', 'M1', 'M2', 'M3', 'H1', 'H2', 'H3', 'P', 'W', 'S', 'R'].map(k => `assets/symbols/sym_${k}.webp`)
    .concat(['assets/scene/tv_frame.webp', PORT0 || Math.max(innerWidth, innerHeight) <= 960 ? 'assets/bg/bg_land_m.webp' : 'assets/bg/bg_land.webp', `assets/del/${DEL_M ? 'm/' : ''}del_idle_strip.webp`, 'assets/promo/logo_emblem.webp'],
      ['ui_spin', 'ui_round', 'ui_field', 'ui_wide', 'ui_panel', 'ui_counter', 'ui_side', 'ui_tag'].map(k => `assets/ui/${k}.webp`));
  // bonus background and Del's other strips (~8 MB desktop, ~5.7 MB phone) load after the game is shown, not behind the splash
  function lateArt() { setTimeout(() => { $('stage').classList.add('late-art'); DEL.preloadAll(); symIdle(); }, 600); }
  // symbol idle loops (batch 05): optional; nothing happens without assets/symbols/idle/idle.json
  async function symIdle() {
    try {
      const dir = `assets/symbols/idle/${DEL_M ? 'm/' : ''}`;
      const r = await fetch('assets/symbols/idle/idle.json'); if (!r.ok) return;
      const clips = await r.json(); if (!Object.keys(clips).length) return;
      await Promise.all(Object.keys(clips).map(k => new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = `${dir}sym_${k}_strip.webp`; })));
      if (!fast()) Reels.idle({ dir, clips });
    } catch (e) { /* no idle loops */ }
  }
  function preload(ms = 12000) {
    const one = u => new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = u; });
    return Promise.race([Promise.all(ART.map(one)), new Promise(r => setTimeout(r, ms))]);
  }

  async function boot() {
    I18N.setLang(P.lang); I18N.setCurrency(P.currency || 'USD');
    I18N.setSocial(P.social || I18N.isSocialCurrency(P.currency));
    I18N.apply(); buildAuto(); document.documentElement.lang = I18N.lang();
    ['buyDlg', 'autoDlg', 'rulesDlg'].forEach(id => $(id).setAttribute('dir', I18N.lang() === 'ar' ? 'rtl' : 'ltr'));
    Reels.init($('reels'), $('lines'));
    DEL.init({ mobile: DEL_M });
    layout(); window.addEventListener('resize', layout);
    $('splashBtn').textContent = RGS_MODE ? t('connecting') : t('loading');
    // splash counter as a tape counter
    let n = 0; const ctr = setInterval(() => { n = Math.min(9999, n + 137); $('loadCounter').textContent = String(n).padStart(4, '0'); }, 40);
    const audioReady = AUDIO.init().then(() => AUDIO.preload(AUDIO_CORE));
    if (S.replay) { await preload(); clearInterval(ctr); return startReplay(); }
    let auth;
    try { auth = await api.authenticate(); }
    catch (e) { clearInterval(ctr); return fatal(`${t('errAuth')} (${e.code || 'ERR_GEN'})`); }
    await preload(); await Promise.race([audioReady, new Promise(r => setTimeout(r, 4000))]); clearInterval(ctr); $('loadCounter').textContent = '0000';
    const cfg = auth.config || {};
    S.jur = cfg.jurisdiction || {};
    if (S.jur.socialCasino) I18N.setSocial(true);
    I18N.setCurrency(auth.balance.currency || P.currency || 'USD');
    I18N.apply(); document.documentElement.lang = I18N.lang();
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
      $('splash').classList.add('hide'); lateArt();
      AUDIO.unlock(); AUDIO.sfx('splash_play'); AUDIO.setMusic('mus_base'); AUDIO.preload();
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
  // the audio context may only start inside a gesture; any first tap or key does it
  ['pointerdown', 'keydown', 'touchend'].forEach(ev => document.addEventListener(ev, () => AUDIO.unlock(), { passive: true }));
  function click(id, fn) {
    $(id).addEventListener('click', ev => { if (ev.detail > 0) $(id).blur(); fn(ev); });
  }
  click('spinBtn', () => { if (S.auto > 0 && !S.busy) return stopAuto(); spin(); });
  click('betMinus', () => { if (S.betIdx > 0) { S.betIdx--; S.bet = S.bets[S.betIdx]; sfx('click'); updateUI(); buildRules(); } });
  click('betPlus', () => { if (S.betIdx < S.bets.length - 1) { S.betIdx++; S.bet = S.bets[S.betIdx]; sfx('click'); updateUI(); buildRules(); } });
  click('anteBtn', () => { S.ante = !S.ante; sfx('ui_toggle'); updateUI(); });
  click('turboBtn', () => { S.turbo = !S.turbo; sfx('ui_toggle'); updateUI(); });
  click('soundBtn', () => { S.muted = !S.muted; AUDIO.setMuted(S.muted); sfx('ui_toggle'); updateUI(); });
  click('menuBtn', () => { buildRules(); dlg('rulesDlg', true); sfx('ui_open'); });
  click('buyBtn', () => { if (S.busy) return; buildBuy(); dlg('buyDlg', true); sfx('ui_open'); });
  click('autoBtn', () => { if (S.auto > 0) return stopAuto(); if (!S.busy) { dlg('autoDlg', true); sfx('ui_open'); } });
  click('buyYes', () => { const m = $('buyConfirm').dataset.mode; dlg('buyDlg', false); sfx('ui_click'); spin(m); });
  click('buyNo', () => $('buyConfirm').classList.add('hide'));
  click('autoStart', () => {
    const on = $('autoCounts').querySelector('.chip.on');
    S.autoCfg = { stopBonus: $('autoStopBonus').checked, stopWin: +$('autoStopWin').value, stopLoss: +$('autoStopLoss').value };
    S.auto = on ? +on.dataset.n : 10; S.autoStart = S.balance; S.autoStopAfter = false;
    dlg('autoDlg', false); spin();
  });
  click('errBtn', () => location.reload());
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', ev => { if (ev.detail > 0) b.blur(); dlg(openDlg, false); sfx('ui_click'); }));
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
