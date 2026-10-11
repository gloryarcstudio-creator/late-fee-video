// Strings, social wording and money formatting.
(function () {
  const EN = {
    tape: 'TAPE', freeSpins: 'FREE SPINS', rewindMult: 'REWIND', catalog: 'VIDEO CATALOG', ante: 'LATE NIGHT RATE',
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
    mode_bonus: 'Night Shift', mode_double: 'Double Feature', mode_director: "Director's Cut", mode_ante: 'Late Night Rate', mode_base: 'Base game',
    desc_bonus: '10 free spins, rewind multiplier starts at ×2.',
    desc_double: '10 free spins, rewind multiplier starts at ×3, REW guaranteed on every 3rd spin.',
    desc_director: '13 free spins, rewind multiplier starts at ×5, REW guaranteed on every 2nd spin.',
    desc_ante: 'Doubles the KEY symbols on the reels: the feature triggers about 6 times more often. Wins are paid on the base bet.',
    anteOn: 'ON', anteOff: 'OFF', disabledAnte: 'Feature buys are not available while Late Night Rate is on.',
    replay: 'REPLAY', replayAgain: 'Replay again', mode: 'Mode', baseBet: 'Base bet', costMult: 'Cost multiplier',
    totalCost: 'Total cost', finalMult: 'Final multiplier', totalWin: 'Total win',
    roundRestored: 'Unfinished round restored.', autoLeft: 'AUTO {n}',
    rules: 'GAME RULES',
  };
  // Stake.US social wording: replaces every key that would read as gambling language.
  const SOCIAL = {
    bet: 'PLAY', totalBet: 'TOTAL PLAY', confirm: 'Play', buyFor: 'Play {name} for {price}?', price: 'Cost',
    autoStopWin: 'Stop if a single win exceeds (× play amount)', autoStopLoss: 'Stop if balance drops by (× play amount)',
    noFunds: 'Not enough coins', baseBet: 'Base play', disabledAnte: 'Features are not available while Late Night Rate is on.',
    desc_ante: 'Doubles the KEY symbols on the reels: the feature triggers about 6 times more often. Wins are based on the base play amount.',
    autoStopBonus: 'Stop when the feature starts',
  };
  const DICT = { en: EN };
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
    setLang(l) { lang = DICT[l] ? l : 'en'; locale = l || 'en'; try { new Intl.NumberFormat(locale); } catch (e) { locale = 'en'; } },
    setSocial(v) { social = !!v; }, isSocial: () => social,
    setCurrency(c) { currency = (c || 'USD').toUpperCase(); }, currency: () => currency,
    isSocialCurrency: (c) => !!SOCIAL_CUR[(c || '').toUpperCase()],
    apply(root) { (root || document).querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); }); },
  };
})();
