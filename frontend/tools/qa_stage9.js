// Stage 9 pre-submission checks against the mock RGS with real books.
// usage: node tools/qa_stage9.js BASE_URL OUT_DIR SCAN_JSON
// BASE_URL serves the build and the mock wallet (tools/mock_rgs.py BUILD BOOKS PORT).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const fs = require('fs');
const [BASE, OUT, SCAN] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const scan = JSON.parse(fs.readFileSync(SCAN));
const HOST = BASE.replace(/^https?:\/\//, 'http://');
const Q = (o = {}) => '?' + new URLSearchParams(Object.assign({ sessionID: 'sess-ok', rgs_url: HOST, lang: 'en', currency: 'USD', device: 'desktop', social: 'false' }, o)).toString();
const ctl = q => fetch(`${BASE}/__ctl?${q}`).then(r => r.json());
const bodies = () => fetch(`${BASE}/__bodies`).then(r => r.json());
const R = []; // {id, name, verdict, evidence}
const rec = (id, name, verdict, evidence) => { R.push({ id, name, verdict, evidence }); console.log(`${verdict.padEnd(5)} [${id}] ${name} :: ${String(evidence).slice(0, 220)}`); };
const pass = (id, name, ok, ev) => rec(id, name, ok ? 'PASS' : 'FAIL', ev);
const consoleLog = []; const external = [];
const DEFAULT = 'balance=1000000000000&round=none&force=none&currency=USD&social=false&jur=&levels=100000,200000,400000,1000000,2000000,5000000,10000000&def=1000000&reset=1';
const SOCIAL_RE = /\b(bets?|betting|total bet|stake|buy|buys|purchase|bought|bonus buy|pay|pays|paid|payouts?|paytable|pay table|money|cash|credits?|funds?|currency|deposit|withdraw|gamble|wager|rebet)\b/gi;

let browser;
async function open(url, { vp = [1280, 592], mobile = false, ctx = null, expectErrors = false } = {}) {
  const c = ctx || await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, isMobile: mobile, hasTouch: mobile });
  const page = await c.newPage();
  page.logs = [];
  page.on('pageerror', e => page.logs.push('pageerror: ' + e));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') page.logs.push(m.type() + ': ' + m.text()); });
  page.on('requestfailed', r => { if (!/__ctl|__bodies/.test(r.url())) page.logs.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText); });
  page.on('request', r => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  page.on('close', () => { if (!expectErrors) page.logs.forEach(l => consoleLog.push(url.slice(0, 60) + ' → ' + l)); });
  await page.goto(BASE + '/index.html' + url);
  return page;
}
async function start(page) {
  await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 20000 });
  await page.click('#splashBtn');
  await page.waitForFunction(() => document.getElementById('splash').classList.contains('hide'));
}
const idle = page => page.waitForFunction(() => window.__game.S.ready && !window.__game.S.busy, null, { timeout: 120000 });
const fast = page => page.evaluate(() => { window.__fast = true; });
const plays = b => b.filter(x => x.path === '/wallet/play');
const ends = b => b.filter(x => x.path === '/wallet/end-round');
const txt = (page, sel) => page.$eval(sel, e => e.textContent.trim());

async function t181_274() {
  await ctl(DEFAULT);
  const page = await open(Q());
  await page.waitForSelector('#splashBtn:not([disabled])', { timeout: 20000 });
  const b = await bodies();
  const a = b[0] || {};
  pass('181', 'authenticate on launch, host from rgs_url', a.path === '/wallet/authenticate' && a.body.sessionID === 'sess-ok' && external.length === 0, `first call ${a.path} body=${JSON.stringify(a.body)}; external=${external.length}`);
  const noScheme = await (await open(Q({ rgs_url: '127.0.0.1:1' }), { expectErrors: true })).evaluate(() => NET.P.rgs);
  pass('181', 'rgs_url without scheme gets https://', noScheme === 'https://127.0.0.1:1', noScheme);
  await page.close();
  const cases = [['bad host', Q({ rgs_url: 'http://127.0.0.1:9' })], ['bad sessionID (400)', Q({ sessionID: 'nope' })], ['sessionID without rgs_url', '?sessionID=sess-ok&lang=en'], ['non-wallet host (404)', Q({ rgs_url: HOST + '/css' })]];
  const ev = [];
  for (const [name, u] of cases) {
    const p = await open(u, { expectErrors: true });
    await p.waitForSelector('#errScreen:not(.hide)', { timeout: 15000 }).catch(() => {});
    const st = await p.evaluate(() => ({ err: !document.getElementById('errScreen').classList.contains('hide'), txt: document.getElementById('errText').textContent, startLocked: document.getElementById('splashBtn').disabled || document.getElementById('splash').classList.contains('hide'), ready: window.__game.S.ready }));
    ev.push(`${name}: ${st.err ? 'error screen' : 'NO error screen'} "${st.txt}"${st.ready ? ' READY!' : ''}`);
    st.ok = st.err && !st.ready; if (!st.ok) ev.push('  ^ FAIL'); await p.close(); if (!st.ok) cases.failed = true;
  }
  pass('274', 'bad rgs_url / session shows blocking error, no local fallback', !cases.failed, ev.join('; '));
}

async function t242() {
  await ctl(DEFAULT + '&levels=100000,250000,500000,1000000,5000000&def=500000');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 592 } });
  let p = await open(Q(), { ctx }); await start(p);
  const first = await txt(p, '#betVal');
  for (let i = 0; i < 6; i++) await p.click('#betPlus', { force: true });
  const top = await txt(p, '#betVal'), plusOff = await p.$eval('#betPlus', e => e.disabled);
  for (let i = 0; i < 8; i++) await p.click('#betMinus', { force: true });
  const bottom = await txt(p, '#betVal'), minusOff = await p.$eval('#betMinus', e => e.disabled);
  await p.click('#betPlus'); await p.click('#betPlus'); await p.click('#betPlus'); // leave a non-default bet selected
  await p.close();
  p = await open(Q(), { ctx }); await start(p); const second = await txt(p, '#betVal'); await p.close();
  await ctl('def=250000'); p = await open(Q(), { ctx }); await start(p); const third = await txt(p, '#betVal'); await p.close();
  await ctx.close();
  const ok = first === '$0.50' && top === '$5.00' && plusOff && bottom === '$0.10' && minusOff && second === '$0.50' && third === '$0.25';
  pass('242', 'bet list = betLevels, opens on defaultBetLevel (also on relaunch)', ok, `first ${first}; max ${top} (+ disabled ${plusOff}); min ${bottom} (− disabled ${minusOff}); relaunch after picking $1.00 → ${second}; def=0.25 → ${third}`);
}

async function t187() {
  const ev = []; let ok = true;
  for (const ante of [false, true]) {
    await ctl(DEFAULT);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 592 } });
    let p = await open(Q(), { ctx, expectErrors: true }); await start(p); await fast(p);
    await p.click('#betPlus'); // $2 (not the default)
    if (ante) await p.click('#anteBtn');
    await p.route('**/wallet/end-round', r => r.abort());
    await ctl('force=win'); await p.click('#spinBtn'); await idle(p);
    const mid = await (await fetch(`${BASE}/wallet/authenticate`, { method: 'POST', body: JSON.stringify({ sessionID: 'sess-ok' }) })).json();
    await p.close(); await ctl('reset=1');
    p = await open(Q(), { ctx }); await fast(p); await start(p); await idle(p);
    const st = await p.evaluate(() => ({ bet: window.__game.S.bet, ante: window.__game.S.ante, betVal: document.getElementById('betVal').textContent, toast: document.getElementById('toast').textContent }));
    let b = await bodies();
    const endSent = ends(b).length === 1;
    await ctl('force=zero'); await p.keyboard.press('Space'); await idle(p);
    b = await bodies(); const next = plays(b)[0] || { body: {} };
    const good = mid.round && mid.round.active && st.bet === 2 && st.ante === ante && endSent && next.body.amount === 2000000 && next.body.mode === (ante ? 'ante' : 'base');
    ok = ok && good;
    ev.push(`${ante ? 'ante' : 'base'}: open round ${mid.round ? mid.round.mode + ' ' + mid.round.amount : 'none'} → restored bet ${st.betVal}, ante ${st.ante}, "${st.toast}", end-round sent ${endSent}, next play ${JSON.stringify(next.body)}`);
    await p.close(); await ctx.close();
  }
  pass('187', 'active round restored with its bet and ante, end-round sent', ok, ev.join(' | '));
}

async function t221_222_31_104_228_107() {
  await ctl(DEFAULT);
  let p = await open(Q()); await start(p); await fast(p);
  await ctl('reset=1&force=zero'); await p.click('#spinBtn'); await idle(p);
  let b = await bodies(); const e0 = ends(b).length;
  await ctl('reset=1&force=win'); await p.click('#spinBtn'); await idle(p);
  b = await bodies(); const e1 = ends(b).length;
  pass('221', 'end-round only after a win', e0 === 0 && e1 === 1, `0× round: ${e0} end-round; win round: ${e1} end-round`);

  // modes sent exactly as index.json names
  const sent = new Set();
  for (const m of ['base', 'ante', 'bonus', 'double', 'director']) { await ctl('reset=1'); await p.evaluate(m => window.__game.spin(m), m); await idle(p); plays(await bodies()).forEach(x => sent.add(x.body.mode)); }
  const names = Object.keys(scan);
  pass('mode', 'play.mode strings match index.json exactly', [...sent].every(m => names.includes(m)) && sent.size === 5, `sent ${[...sent].join(',')}; index.json ${names.join(',')}`);

  // [31] buy confirmation with price
  await ctl('reset=1&force=zero');
  await p.click('#buyBtn'); await p.click('.buy-item[data-mode="director"]');
  const conf = await txt(p, '#buyConfirmText'); await p.click('#buyNo'); await p.click('#buyDlg [data-close]');
  const noPlay = plays(await bodies()).length === 0;
  await p.click('#buyBtn'); await p.click('.buy-item[data-mode="bonus"]'); await p.click('#buyYes'); await idle(p);
  const bp = plays(await bodies());
  pass('31', 'feature buys > 2× confirmed with the price', /\$600\.00/.test(conf) && noPlay && bp.length === 1 && bp[0].body.mode === 'bonus', `"${conf}"; cancel → ${noPlay ? 'no play' : 'PLAY SENT'}; confirm → ${bp.map(x => x.body.mode)}`);

  // [104] autoplay opens settings first
  await ctl('reset=1&force=zero');
  await p.click('#autoBtn'); const dlgOpen = await p.$eval('#autoDlg', e => !e.classList.contains('hide'));
  const before = plays(await bodies()).length;
  await p.click('#autoCounts .chip[data-n="10"]'); await p.click('#autoStart');
  await p.waitForFunction(() => window.__game.S.auto === 0 || window.__game.S.auto < 9, null, { timeout: 60000 });
  await p.click('#spinBtn'); await idle(p); await p.waitForTimeout(400);
  const after = plays(await bodies()).length;
  pass('104', 'autoplay asks for settings before starting, stops on request', dlgOpen && before === 0 && after >= 1, `dialog ${dlgOpen}; plays before start ${before}; after start ${after}; stopped auto=${await p.evaluate(() => window.__game.S.auto)}`);

  // [228] Space spins after clicking other buttons
  await ctl('reset=1&force=zero');
  await p.click('#turboBtn'); const turbo1 = await p.evaluate(() => window.__game.S.turbo);
  await p.keyboard.press('Space'); await idle(p);
  const turbo2 = await p.evaluate(() => window.__game.S.turbo);
  await p.click('#betPlus'); const bet1 = await p.evaluate(() => window.__game.S.bet);
  await p.keyboard.press('Space'); await idle(p);
  const bet2 = await p.evaluate(() => window.__game.S.bet);
  const sp = plays(await bodies()).length;
  await p.click('#turboBtn');
  pass('228', 'Space spins even after clicking another button', sp === 2 && turbo1 === turbo2 && bet1 === bet2, `plays ${sp}; turbo stays ${turbo2}; bet stays ${bet2}`);

  // [107] mute
  await p.click('#soundBtn');
  const mute = await p.evaluate(() => ({ m: AUDIO.isMuted(), vids: [...document.querySelectorAll('video')].every(v => v.muted) }));
  await p.click('#soundBtn');
  pass('107', 'one sound switch mutes everything; videos muted', mute.m && mute.vids, JSON.stringify(mute));
  await p.close();

  // [222] balance check before play (spin, Space, autoplay, buys)
  await ctl(DEFAULT + '&balance=500000');
  p = await open(Q()); await start(p); await fast(p);
  await ctl('reset=1');
  await p.click('#spinBtn'); const toast1 = await txt(p, '#toast');
  await p.keyboard.press('Space');
  await p.click('#autoBtn'); await p.click('#autoStart'); await p.waitForTimeout(300);
  const lowPlays = plays(await bodies()).length;
  await p.close();
  await ctl(DEFAULT + '&balance=50000000');
  p = await open(Q()); await start(p); await fast(p); await ctl('reset=1');
  await p.click('#buyBtn'); await p.click('.buy-item[data-mode="bonus"]');
  const toast2 = await txt(p, '#toast'), confShown = await p.$eval('#buyConfirm', e => !e.classList.contains('hide'));
  const buyPlays = plays(await bodies()).length;
  await p.close();
  pass('222', 'no play request when balance < price', lowPlays === 0 && buyPlays === 0 && !confShown && /Insufficient/.test(toast1) && /Insufficient/.test(toast2), `$0.50 balance, $1 bet: spin/Space/autoplay → ${lowPlays} play, toast "${toast1}"; $50 balance, $100 buy → ${buyPlays} play, confirm shown ${confShown}, toast "${toast2}"`);
}

async function rulesCheck() {
  await ctl(DEFAULT);
  const p = await open(Q()); await start(p);
  await p.click('#menuBtn');
  const t = await p.$eval('#rulesBody', e => e.innerText);
  const ev = []; let ok = true;
  for (const [m, s] of Object.entries(scan)) {
    const rtp = s.rtp.toFixed(2) + '%', mx = s.max.toLocaleString('en') + '×';
    const has = t.includes(rtp) && t.includes(mx);
    if (!has) ok = false; ev.push(`${m}: RTP ${rtp} max ${mx} cost ${s.cost}× ${has ? 'shown' : 'MISSING'}`);
  }
  pass('24/25', 'RTP and max win per mode in rules (from lookup tables)', ok, ev.join('; '));
  const costs = Object.entries(scan).filter(([m]) => m !== 'base').every(([m, s]) => t.includes(s.cost.toLocaleString('en') + '×'));
  pass('26/27', 'every mode with its cost and description', costs && /Night Shift/.test(t) && /Double Feature/.test(t) && /Director's Cut/.test(t) && /Late Night Rate/.test(t), 'mode table: ' + (costs ? 'costs 3×, 100×, 300×, 600× present' : 'COST MISSING'));
  const pay = /Paytable/.test(t) && /WILD/.test(t) && /KEY \(scatter\)/.test(t) && (await p.$$eval('.pl-mini', e => e.length)) === 20;
  pass('29', 'paytable, wild/scatter, free spins, retrigger, paylines', pay && /up to 50 free spins/.test(t), `paylines drawn ${await p.$$eval('.pl-mini', e => e.length)}; retrigger text ${/2 KEY add 3/.test(t)}`);
  const DISC = 'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine.';
  pass('185', 'disclaimer verbatim', t.includes(DISC), t.includes(DISC) ? 'exact match' : 'not found');
  const btns = ['▶', '− / +', 'LATE NIGHT RATE', 'VIDEO CATALOG', '⟳', '»', '♪', '☰', '✕'].filter(b => !t.includes(b));
  pass('235', 'every on-screen button explained', btns.length === 0 && /space bar/.test(t), btns.length ? 'missing ' + btns.join(' ') : 'spin, bet −/+, ante, catalog, autoplay, turbo, sound, menu, close, space bar, tap-to-skip');
  await p.close();
  // jurisdiction flags
  await ctl(DEFAULT + '&jur=disabledTurbo,disabledAutoplay,disabledBuyFeature,disabledSpacebar');
  const q = await open(Q()); await start(q); await fast(q); await ctl('reset=1');
  const hid = await q.evaluate(() => ['turboBtn', 'autoBtn', 'buyBtn'].map(id => document.getElementById(id).hidden || getComputedStyle(document.getElementById(id)).display === 'none'));
  await q.keyboard.press('Space'); await q.waitForTimeout(300);
  const sp = plays(await bodies()).length;
  await q.click('#menuBtn'); const t2 = await q.$eval('#rulesBody', e => e.innerText);
  const leak = ['⟳', '»', 'VIDEO CATALOG', 'space bar', "Director's Cut"].filter(x => t2.includes(x));
  pass('jur', 'jurisdiction flags: turbo/autoplay/buy/space disabled and removed from rules', hid.every(Boolean) && sp === 0 && leak.length === 0, `hidden ${hid}; Space plays ${sp}; rules leftovers ${leak.join(',') || 'none'}`);
  await q.close();
}

async function langs() {
  await ctl(DEFAULT);
  const L = ['en', 'ar', 'de', 'es', 'fi', 'fr', 'hi', 'id', 'ja', 'ko', 'pl', 'pt', 'ru', 'tr', 'vi', 'zh'];
  const bad = [], fit = [], ev = [];
  for (const l of L.concat(['xx', 'pt-BR'])) {
    const p = await open(Q({ lang: l })); await start(p);
    await p.click('#menuBtn');
    const r = await p.evaluate(() => ({ html: document.documentElement.lang, t: document.body.innerText, h: document.querySelector('#rulesBody h2').textContent }));
    const keys = r.t.match(/\b(r|b|a|th|desc|mode)_[a-z]+\b/g);
    if (keys) bad.push(`${l}: raw keys ${keys.slice(0, 3)}`);
    await p.click('#rulesDlg [data-close]');
    const of = await p.evaluate(() => ['buyBtn', 'anteBtn', 'balField', 'betField', 'winField', 'tape'].filter(id => { const e = document.getElementById(id); return e.scrollWidth > e.clientWidth + 2; }));
    if (of.length) fit.push(`${l}: ${of}`);
    ev.push(`${l}→${r.html} "${r.h}"`);
    if (['de', 'ru', 'ar', 'ja', 'hi', 'fi'].includes(l)) await p.screenshot({ path: `${OUT}/lang_${l}.jpg`, type: 'jpeg', quality: 70 });
    await p.close();
  }
  pass('239', 'English complete; every Stake language renders, no raw keys', bad.length === 0, bad.join('; ') || ev.slice(0, 16).join('; '));
  pass('240', 'unknown lang falls back to English', ev.find(x => x.startsWith('xx→en "GAME RULES"')) && ev.find(x => x.startsWith('pt-BR→pt')), ev.slice(16).join('; '));
  rec('i18n-fit', 'translated labels fit their HUD fields', fit.length ? 'AT RISK' : 'PASS', fit.join('; ') || 'no overflow in buyBtn/anteBtn/fields/tape for 16 languages');
}

async function social() {
  const ev = []; let ok = true;
  for (const [name, q, c] of [['social=true&XSC', Q({ social: 'true', currency: 'XSC' }), 'currency=XSC'], ['XGC currency only', Q({ currency: 'XGC' }), 'currency=XGC'], ['jurisdiction.socialCasino', Q({ lang: 'de' }), 'social=true&currency=USD']]) {
    await ctl(DEFAULT + '&' + c);
    const p = await open(q); await start(p);
    const chunks = [];
    const grab = async () => chunks.push(await p.evaluate(() => document.body.innerText + ' ' + [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' ')));
    await grab();
    await p.click('#menuBtn'); await grab(); await p.click('#rulesDlg [data-close]');
    await p.click('#buyBtn'); await p.click('.buy-item[data-mode="bonus"]'); await grab(); await p.click('#buyNo'); await p.click('#buyDlg [data-close]');
    await p.click('#autoBtn'); await grab(); await p.click('#autoDlg [data-close]');
    const all = chunks.join(' \n ').replace(/Remote Game Server/g, '');
    const hits = [...new Set((all.match(SOCIAL_RE) || []).map(x => x.toLowerCase()))];
    const cur = await txt(p, '#balVal');
    const curOk = c.includes('USD') ? true : / (SC|GC)$/.test(cur) && !cur.includes('$');
    if (hits.length || !curOk) ok = false;
    ev.push(`${name}: words ${hits.join(',') || 'none'}; balance "${cur}"; lang ${await p.evaluate(() => document.documentElement.lang)}`);
    await p.screenshot({ path: `${OUT}/social_${c.replace(/\W/g, '')}.jpg`, type: 'jpeg', quality: 70 });
    await p.close();
  }
  pass('77/78/225', 'social wording everywhere incl. rules, dialogs and aria-labels; SC/GC', ok, ev.join(' | '));
}

async function replay() {
  await ctl(DEFAULT);
  const bb = JSON.parse(fs.readFileSync(require('path').join(require('path').dirname(SCAN), 'books_bonus.json')));
  const book = (bb.find(b => b.drawn && b.payoutMultiplier > 100 && b.payoutMultiplier < 5000) || bb[0]).id;
  const ev = []; let ok = true;
  const run = async (o, vp) => {
    await ctl('reset=1');
    const p = await open(Q(Object.assign({ replay: 'true', game: 'late_fee_video', version: '1', mode: 'bonus', event: String(book), amount: '1000000' }, o)), { vp, expectErrors: o.event === 'abc' });
    await p.waitForSelector('#splashBtn:not([disabled]), #replayCard:not(.hide)', { timeout: 20000 });
    if (await p.$eval('#splash', e => !e.classList.contains('hide'))) await p.click('#splashBtn');
    await p.waitForSelector('#replayCard:not(.hide)');
    return p;
  };
  let p = await run({}, [1280, 592]);
  const card = await p.$eval('#replayCard', e => e.innerText.replace(/\s+/g, ' '));
  const hud = await p.$eval('#hud', e => getComputedStyle(e).display);
  await fast(p); await p.click('#replayGo');
  await p.waitForFunction(() => /Replay again/.test(document.getElementById('replayCard').innerText) && !document.getElementById('replayCard').classList.contains('hide'), null, { timeout: 120000 });
  const b = await bodies();
  const wallet = b.filter(x => x.path.startsWith('/wallet')).length;
  const path = (await (await fetch(`${BASE}/__log`)).json()).find(x => x.startsWith('/bet/replay/'));
  ok = /Night Shift/.test(card) && /\$1\.00/.test(card) && /100×/.test(card) && /\$100\.00/.test(card) && hud === 'none' && wallet === 0 && path === `/bet/replay/late_fee_video/1/bonus/${book}`;
  ev.push(`card "${card.slice(0, 160)}"; HUD ${hud}; wallet calls ${wallet}; GET ${path}; Start → round → "Replay again"`);
  await p.close();
  pass('171/172', 'replay: card, Start, play, Replay again, no wallet calls, bet UI hidden', ok, ev.join(' '));
  p = await run({ event: 'abc' }, [1280, 592]);
  const err = await p.$eval('#replayCard', e => ({ t: e.innerText.replace(/\s+/g, ' '), btn: !!e.querySelector('button') }));
  pass('173', 'replay fetch failure → error card without Start', !err.btn && /could not be loaded/.test(err.t), JSON.stringify(err));
  await p.close();
  p = await run({ social: 'true', currency: 'XSC' }, [400, 225]);
  const s = await p.evaluate(() => { const c = document.getElementById('replayCard'); const r = c.getBoundingClientRect(); const go = document.getElementById('replayGo').getBoundingClientRect(); return { t: c.innerText.replace(/\s+/g, ' '), fit: go.bottom <= innerHeight && go.right <= innerWidth && c.scrollHeight <= c.clientHeight + 1 }; });
  const hits = s.t.match(SOCIAL_RE);
  await p.screenshot({ path: `${OUT}/replay_400x225_social.jpg`, type: 'jpeg', quality: 75 });
  pass('174/188', 'replay at 400×225 in social mode (SC, wording, fits)', s.fit && !hits && / SC/.test(s.t), `fit ${s.fit}; words ${hits || 'none'}; "${s.t.slice(0, 140)}"`);
  await p.close();
  p = await run({ currency: 'JPY', lang: 'ja', amount: '100000000' }, [1280, 592]);
  const j = await p.$eval('#replayCard', e => e.innerText.replace(/\s+/g, ' '));
  pass('replay-cur', 'replay applies currency, lang and amount', /￥100|¥100/.test(j) && /リプレイ/.test(j), j.slice(0, 160));
  await p.close();
}

async function currencies() {
  const ev = [], bad = [];
  const shots = [];
  for (const c of ['USD', 'EUR', 'CAD', 'MXN', 'JPY', 'XSC', 'XGC']) {
    const lv = c === 'JPY' ? '10000000,20000000,100000000,1000000000,15000000000' : '100000,1000000,10000000,100000000,1000000000';
    await ctl(DEFAULT + `&currency=${c}&balance=123456789120000&levels=${lv}&def=${lv.split(',')[1]}`);
    const p = await open(Q({ currency: c })); await start(p); await fast(p);
    for (let i = 0; i < 4; i++) await p.click('#betPlus');
    await p.click('#anteBtn');
    const r = await p.evaluate(() => ({ bal: document.getElementById('balVal').textContent, bet: document.getElementById('betVal').textContent,
      of: ['balField', 'betField', 'winField'].filter(id => { const e = document.getElementById(id); return e.scrollWidth > e.clientWidth + 2 || e.querySelector('b').getClientRects().length > 1 || e.querySelector('b').getBoundingClientRect().height > 60; }) }));
    await ctl('force=win'); await p.click('#anteBtn'); await p.click('#spinBtn'); await idle(p);
    r.win = await txt(p, '#winVal');
    await p.click('#buyBtn');
    r.buy = await p.$$eval('.buy-item em', es => es.map(e => e.textContent));
    r.buyOf = await p.$$eval('.buy-item em', es => es.some(e => e.scrollWidth > e.clientWidth + 2 || e.getClientRects().length > 1));
    await p.screenshot({ path: `${OUT}/cur_${c}_buy.jpg`, type: 'jpeg', quality: 60 });
    await p.click('#buyDlg [data-close]');
    await p.screenshot({ path: `${OUT}/cur_${c}.jpg`, type: 'jpeg', quality: 70 }); shots.push(`cur_${c}.jpg`);
    const decOk = c === 'JPY' ? !/[.,]\d{2}\b/.test(r.bal.replace(/,\d{3}/g, '')) : /[.,]\d{2}/.test(r.bal);
    const symOk = c === 'XSC' ? / SC$/.test(r.bal) : c === 'XGC' ? / GC$/.test(r.bal) : !/X[SG]C/.test(r.bal);
    if (!decOk || !symOk || r.of.length || r.buyOf) bad.push(`${c}: dec ${decOk} sym ${symOk} overflow ${r.of} buyWrap ${r.buyOf}`);
    ev.push(`${c}: bal ${r.bal}, bet ${r.bet}, win ${r.win}, buy ${r.buy[2]}`);
    await p.close();
  }
  pass('219', 'currencies USD/EUR/CAD/MXN/JPY/XSC/XGC: decimals, symbol, no wrap at large amounts', bad.length === 0, (bad.join('; ') || '') + ' || ' + ev.join(' | '));
}

async function events() {
  await ctl(DEFAULT);
  const p = await open(Q()); await start(p); await fast(p);
  const H = await p.evaluate(() => Object.keys(window.__game.H));
  const types = new Set(Object.values(scan).flatMap(s => Object.keys(s.types)));
  const missing = [...types].filter(t => !H.includes(t));
  pass('events', 'every event type in the published books has a front-end handler', missing.length === 0, `types ${[...types].join(',')}; unhandled ${missing.join(',') || 'none'}`);
  // play real books straight through the event player
  let n = 0;
  for (const m of Object.keys(scan)) {
    const books = JSON.parse(fs.readFileSync(require('path').join(require('path').dirname(SCAN), `books_${m}.json`)));
    const pick = books.filter(b => !b.drawn).concat(books.filter(b => b.drawn).slice(0, 80));
    for (let i = 0; i < pick.length; i += 20) {
      const chunk = pick.slice(i, i + 20).map(b => ({ amount: 1e6, mode: m, state: b.events }));
      await p.evaluate(async rs => { for (const r of rs) { window.__game.S.mode = r.mode; await window.__game.playRound(r); } }, chunk);
      n += chunk.length;
    }
  }
  const errs = p.logs.length;
  pass('events-play', 'real books play through the event player without errors', errs === 0, `${n} books (tagged + weighted sample) across 5 modes; console errors/warnings ${errs}${errs ? ': ' + p.logs.slice(0, 3).join(' | ') : ''}`);
  await p.close();
}

async function viewports() {
  await ctl(DEFAULT);
  const bad = [];
  for (const vp of [[1280, 592], [1024, 576], [800, 450], [400, 225], [390, 844, 1], [320, 568, 1], [430, 932, 1], [812, 375, 1], [425, 812, 1]]) {
    const p = await open(Q({ device: vp[2] ? 'mobile' : 'desktop' }), { vp, mobile: !!vp[2] }); await start(p);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, w: innerWidth, h: innerHeight, ta: getComputedStyle(document.body).touchAction, vpm: document.querySelector('meta[name=viewport]').content }));
    if (m.sw > m.w || m.sh > m.h) bad.push(`${vp[0]}×${vp[1]} scroll ${m.sw}×${m.sh}`);
    if (!/manipulation/.test(m.ta) || !/user-scalable=no/.test(m.vpm)) bad.push(`${vp[0]}×${vp[1]} zoom guard missing`);
    await p.close();
  }
  pass('227/223', 'no page scroll, no double-tap zoom (9 viewports)', bad.length === 0, bad.join('; ') || 'scroll size = viewport; touch-action: manipulation; user-scalable=no');
}

(async () => {
  browser = await chromium.launch();
  for (const f of [t181_274, t242, t187, t221_222_31_104_228_107, rulesCheck, langs, social, replay, currencies, events, viewports]) {
    try { await f(); } catch (e) { rec(f.name, 'test crashed', 'FAIL', String(e).slice(0, 300)); }
  }
  await ctl(DEFAULT);
  pass('ext', 'zero external requests', external.length === 0, external.length ? [...new Set(external)].slice(0, 5).join(' ') : 'all requests to the build host / rgs_url');
  pass('console', 'console clean (errors + warnings, no filter)', consoleLog.length === 0, consoleLog.length ? consoleLog.slice(0, 5).join(' || ') : '0 errors, 0 warnings over all non-negative test pages');
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 1));
  await browser.close();
})();
