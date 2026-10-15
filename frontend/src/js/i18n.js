// Strings, social wording and money formatting.
(function () {
  const EN = {
    tape: 'TAPE', freeSpins: 'FREE SPINS', rewindMult: 'REWIND', catalog: 'VIDEO CATALOG', ante: 'NIGHT RATE',
    balance: 'BALANCE', bet: 'BET', win: 'WIN', totalBet: 'TOTAL BET',
    tapToSkip: 'tap to skip', tapToContinue: 'tap to continue', confirm: 'Buy', cancel: 'Cancel', start: 'Start',
    autoplay: 'AUTOPLAY', autoSpins: 'Number of spins', autoStopBonus: 'Stop when the feature starts',
    autoStopWin: 'Stop if a single win exceeds (× bet)', autoStopLoss: 'Stop if balance drops by (× bet)',
    reload: 'Reload', retry: 'Retry', connecting: 'Connecting…', play: 'PLAY', loading: 'Loading…',
    noFunds: 'Insufficient balance', netError: 'Connection problem. Please try again.',
    errAuth: 'Could not connect to the game server.', errReplay: 'This replay could not be loaded.',
    bigWin: 'BIG WIN', megaWin: 'MEGA WIN', epicWin: 'EPIC WIN', cultWin: 'CULT CLASSIC',
    maxWin: 'MAX WIN', nightShift: 'NIGHT SHIFT', spinsAwarded: '{n} FREE SPINS', shiftOver: 'SHIFT OVER',
    moreSpins: '+{n} SPINS', pause: 'PAUSE ❚❚', rew: '◀◀ REW', secondTake: 'SECOND TAKE ▶', rec: '● REC',
    multUp: 'REWIND ×{n}', buyFor: 'Buy {name} for {price}?', price: 'Price',
    mode_bonus: 'Night Shift', mode_double: 'Double Feature', mode_director: "Director's Cut", mode_base: 'Base game',
    desc_bonus: '10 free spins, rewind multiplier starts at ×2.',
    desc_double: '10 free spins, rewind multiplier starts at ×3, REW guaranteed on every 3rd spin.',
    desc_director: '13 free spins, rewind multiplier starts at ×5, REW guaranteed on every 2nd spin.',
    anteOn: 'ON', anteOff: 'OFF',
    replay: 'REPLAY', replayAgain: 'Replay again', mode: 'Mode', baseBet: 'Base bet', costMult: 'Cost multiplier',
    totalCost: 'Total cost', finalMult: 'Final multiplier', totalWin: 'Total win',
    roundRestored: 'Unfinished round restored.', autoLeft: 'AUTO {n}',
    rules: 'GAME RULES', errTitle: 'TRACKING ERROR',
    // rules
    r_intro: 'Late Fee Video is a 5-reel, 3-row video slot with 20 fixed paylines. Wins pay left to right from the leftmost reel, 3 to 5 symbols in a row. Only the highest win per line is paid; wins on different lines are added.',
    r_rtpH: 'Return to player and max win', th_mode: 'Mode', th_cost: 'Cost', th_rtp: 'RTP', th_max: 'Max win', th_what: 'What it does',
    r_rtpNote: 'Cost and max win are multiples of the bet. RTP is the theoretical return over a very large number of rounds.',
    r_maxNote: 'The maximum win is {max}× the bet in every mode. When it is reached the round ends immediately and the max win is paid.',
    r_modesH: 'Modes', r_buyPrefix: 'Buys the free spins feature instantly.',
    r_payH: 'Paytable (× bet)', r_payNote: 'Line wins are multiples of the bet. With Evening Rate or Late Night Rate on, wins are paid on the base bet.',
    r_wild: 'WILD appears on reels 2, 3 and 4 and substitutes for all symbols except KEY and REW.',
    r_key: 'KEY (scatter) pays anywhere: 3 = 2×, 4 = 10×, 5 = 50× the bet, and starts Night Shift with 10, 12 or 15 free spins. During free spins 2 KEY add 3 spins and 3 or more add 5 spins, up to 50 free spins per feature.',
    r_rew: 'REW appears on reel 5 during free spins only.',
    r_linesH: 'Paylines', r_featH: 'Features',
    r_pause: 'After a winning spin, PAUSE may start: reels with winning symbols freeze and the others respin for free. Each respin that improves the win pays the difference and the chain continues; a respin without improvement ends it.',
    r_tape: 'Every winning free spin is recorded on the tape with its board and line win.',
    r_rewind: 'When REW lands, the reels rewind to the best recorded spin and its line win is paid again times the rewind multiplier. Then the SECOND TAKE starts: the winning reels of that spin stay paused, the other reels respin once, and any extra line win is also multiplied. After each rewind the multiplier steps up: ×2, ×3, ×5, ×10 (it stays at ×10). If nothing is recorded yet, REW only raises the multiplier.',
    r_btnH: 'Buttons',
    b_spin: 'starts a round. During a spin it shows ■ and stops the reels quickly.',
    b_space: 'The space bar also starts a round and speeds up win screens.',
    b_bet: 'change the bet.',
    b_ante: 'switches between off, the 2× Evening Rate and the 4× Late Night Rate. The bet field then shows the total price.',
    b_catalog: 'opens the feature buy menu. Every buy asks for confirmation with its price.',
    b_auto: 'opens autoplay settings; press it again to stop autoplay.',
    b_turbo: 'plays rounds faster.', b_sound: 'turns all sound on or off.', b_menu: 'opens these rules.', b_close: 'closes any window.',
    b_skip: 'Tap a win screen to speed it up, tap again to close it.',
    r_discH: 'Disclaimer',
    // accessibility labels
    a_betMinus: 'Decrease bet', a_betPlus: 'Increase bet', a_sound: 'Sound', a_turbo: 'Turbo', a_spin: 'Spin', a_close: 'Close',
    mode_ante2: 'Evening Rate',
    mode_ante4: 'Late Night Rate',
    desc_ante2: 'Adds KEY symbols to the reels: the feature triggers about 3.5 times more often. Wins are paid on the base bet.',
    desc_ante4: 'Adds even more KEY symbols to the reels: the feature triggers about 8 times more often. Wins are paid on the base bet.',
    mode_latefee: 'Late Fee',
    desc_latefee: '12 free spins with the LATE FEE meter: each spin without a line win adds a day overdue and raises the multiplier ×1, ×2, ×4, ×6, ×10, ×15, ×25; the next spin with a line win pays it times the multiplier, then the meter resets.',
    mode_tracking: 'Tracking Band',
    desc_tracking: '8 free spins: a WILD band covers one row on reels 2, 3 and 4 and moves down one row every spin. Line wins through the band are multiplied ×1 on the first pass, ×2 on the second and ×3 on the third. There are no other WILDs on the reels.',
    feeDays: '{n} DAYS LATE',
    feePaid: 'LATE FEE ×{n}',
    band: 'TRACKING ×{n}',
    lateFeeLbl: 'LATE FEE',
    bandLbl: 'TRACKING',
  };
  const DISCLAIMER = 'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine.';
  // Stake.US social wording: replaces every key that would read as gambling language (social mode is English only).
  const SOCIAL = {
    bet: 'PLAY', totalBet: 'TOTAL PLAY', confirm: 'Play', buyFor: 'Play {name} for {price}?', price: 'Cost',
    autoStopWin: 'Stop if a single win exceeds (× play amount)', autoStopLoss: 'Stop if balance drops by (× play amount)',
    noFunds: 'Not enough coins', baseBet: 'Base play amount',
    r_intro: 'Late Fee Video is a 5-reel, 3-row video slot with 20 fixed paylines. Wins are counted left to right from the leftmost reel, 3 to 5 symbols in a row. Only the highest win per line is awarded; wins on different lines are added.',
    r_rtpNote: 'Cost and max win are multiples of the play amount. RTP is the theoretical return over a very large number of rounds.',
    r_maxNote: 'The maximum win is {max}× the play amount in every mode. When it is reached the round ends immediately and the max win is awarded.',
    r_buyPrefix: 'Instantly triggers the free spins feature.',
    r_payH: 'Symbol wins (× play amount)', r_payNote: 'Line wins are multiples of the play amount. With Evening Rate or Late Night Rate on, wins are based on the base play amount.',
    r_key: 'KEY (scatter) wins anywhere: 3 = 2×, 4 = 10×, 5 = 50× the play amount, and starts Night Shift with 10, 12 or 15 free spins. During free spins 2 KEY add 3 spins and 3 or more add 5 spins, up to 50 free spins per feature.',
    r_pause: 'After a winning spin, PAUSE may start: reels with winning symbols freeze and the others respin for free. Each respin that improves the win awards the difference and the chain continues; a respin without improvement ends it.',
    r_rewind: 'When REW lands, the reels rewind to the best recorded spin and its line win is awarded again times the rewind multiplier. Then the SECOND TAKE starts: the winning reels of that spin stay paused, the other reels respin once, and any extra line win is also multiplied. After each rewind the multiplier steps up: ×2, ×3, ×5, ×10 (it stays at ×10). If nothing is recorded yet, REW only raises the multiplier.',
    b_bet: 'change the play amount.',
    b_catalog: 'opens the feature menu. Every feature asks for confirmation with its cost.',
    b_ante: 'switches between off, the 2× Evening Rate and the 4× Late Night Rate. The play field then shows the total cost.',
    a_betMinus: 'Decrease play amount', a_betPlus: 'Increase play amount',
    desc_ante2: 'Adds KEY symbols to the reels: the feature triggers about 3.5 times more often. Wins are based on the base play amount.',
    desc_ante4: 'Adds even more KEY symbols to the reels: the feature triggers about 8 times more often. Wins are based on the base play amount.',
    desc_latefee: '12 free spins with the LATE FEE meter: each spin without a line win adds a day overdue and raises the multiplier ×1, ×2, ×4, ×6, ×10, ×15, ×25; the next spin with a line win awards it times the multiplier, then the meter resets.',
  };
  const DICT = Object.assign({ en: EN }, window.LANGS || {});
  let lang = 'en', social = false;

  function t(key, vars) {
    let s = (social && SOCIAL[key]) || (DICT[lang] && DICT[lang][key]) || EN[key] || key;
    if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  // Money
  const SOCIAL_CUR = { XSC: 'SC', XGC: 'GC', XEC: 'EC' };
  const CRYPTO = { BTC: 8, ETH: 6, LTC: 6, DOGE: 4, USDT: 2, TRX: 4, BNB: 6, SOL: 6, XRP: 4, USDC: 2 };
  let currency = 'USD', locale = 'en';
  function baseDecimals(cur) {
    if (SOCIAL_CUR[cur]) return 2;
    if (CRYPTO[cur] != null) return Math.min(CRYPTO[cur], 6);
    try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur }).resolvedOptions().maximumFractionDigits; }
    catch (e) { return 2; }
  }
  // Wins can be sub-cent: add decimals only when the value needs them (max 4, crypto 6).
  function decimalsFor(v, cur) {
    let d = baseDecimals(cur); const cap = CRYPTO[cur] != null ? 6 : Math.max(d, 4);
    while (d < cap && Math.abs(Math.round(v * 10 ** d) - v * 10 ** d) > 1e-6) d++;
    return d;
  }
  function money(v, forceDec) {
    const cur = currency, d = forceDec != null ? forceDec : decimalsFor(v, cur);
    const num = new Intl.NumberFormat(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
    if (SOCIAL_CUR[cur]) return num + ' ' + SOCIAL_CUR[cur];
    if (CRYPTO[cur] != null) return num + ' ' + cur;
    try { return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d }).format(v); }
    catch (e) { return num + ' ' + cur; }
  }

  // Fallback for long texts (rules): word-level social replacements, case kept for the first letter.
  const SOCIAL_WORDS = [
    [/\btotal bet\b/gi, 'total play'], [/\bbonus buys?\b/gi, 'feature'], [/\bbets?\b|\bbetting\b/gi, 'play'],
    [/\bstake\b/gi, 'play amount'], [/\bbuy\b|\bpurchase\b/gi, 'play'], [/\bbought\b/gi, 'instantly triggered'],
    [/\bpaytable\b|\bpay table\b/gi, 'symbol wins'], [/\bpayouts?\b/gi, 'win'], [/\bpays\b/gi, 'wins'], [/\bpaid\b/gi, 'won'],
    [/\bpay\b/gi, 'win'], [/\bmoney\b|\bcash\b/gi, 'coins'], [/\bcredits?\b|\bfunds?\b/gi, 'balance'],
    [/\bcurrency\b/gi, 'token'], [/\bdeposit\b/gi, 'get coins'], [/\bwithdraw\b/gi, 'redeem'], [/\bgamble\b|\bwager\b/gi, 'play'],
    [/\brebet\b/gi, 'respin'],
  ];
  function socialize(str) {
    if (!social) return str;
    for (const [re, rep] of SOCIAL_WORDS) str = str.replace(re, m => m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? (m === m.toUpperCase() && m.length > 1 ? rep.toUpperCase() : rep[0].toUpperCase() + rep.slice(1)) : rep);
    return str;
  }

  window.I18N = {
    t, money, decimalsFor, socialize,
    setLang(l) {
      l = String(l || 'en').toLowerCase(); const base = l.split(/[-_]/)[0];
      lang = DICT[l] ? l : DICT[base] ? base : 'en';
      locale = lang === 'ar' ? 'ar-u-nu-latn' : lang; try { new Intl.NumberFormat(locale); } catch (e) { locale = 'en'; }
    },
    lang: () => (social ? 'en' : lang), langs: () => Object.keys(DICT), DISCLAIMER, EN,
    setSocial(v) { social = !!v; if (social) { lang = 'en'; locale = 'en'; } }, isSocial: () => social,
    setCurrency(c) { currency = (c || 'USD').toUpperCase(); }, currency: () => currency,
    isSocialCurrency: (c) => !!SOCIAL_CUR[(c || '').toUpperCase()],
    apply(root) { (root || document).querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); }); },
  };
})();
